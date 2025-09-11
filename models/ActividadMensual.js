const mongoose = require('mongoose');

const actividadMensualSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  año: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  actividades: {
    logins: {
      type: Number,
      default: 0
    },
    logouts: {
      type: Number,
      default: 0
    },
    materiasConsultadas: {
      type: Number,
      default: 0
    },
    previasConsultadas: {
      type: Number,
      default: 0
    },
    semestresConsultados: {
      type: Number,
      default: 0
    },
    perfilActualizado: {
      type: Number,
      default: 0
    },
    tiempoTotalSesion: {
      type: Number, // en minutos
      default: 0
    }
  },
  ultimaActividad: {
    type: Date,
    default: Date.now
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
actividadMensualSchema.index({ usuario: 1, mes: 1, año: 1 });
actividadMensualSchema.index({ mes: 1, año: 1 });
actividadMensualSchema.index({ ultimaActividad: -1 });

// Método para obtener o crear actividad mensual
actividadMensualSchema.statics.obtenerOCrear = async function(usuarioId, mes, año) {
  let actividad = await this.findOne({ 
    usuario: usuarioId, 
    mes: mes, 
    año: año 
  });
  
  if (!actividad) {
    actividad = new this({
      usuario: usuarioId,
      mes: mes,
      año: año,
      actividades: {}
    });
    await actividad.save();
  }
  
  return actividad;
};

// Método para registrar una actividad
actividadMensualSchema.methods.registrarActividad = function(tipoActividad, incremento = 1) {
  if (this.actividades[tipoActividad] !== undefined) {
    this.actividades[tipoActividad] += incremento;
  } else {
    this.actividades[tipoActividad] = incremento;
  }
  
  this.ultimaActividad = new Date();
  return this.save();
};

// Método para obtener estadísticas del mes
actividadMensualSchema.methods.obtenerEstadisticas = function() {
  const totalActividades = Object.values(this.actividades).reduce((sum, val) => sum + (val || 0), 0);
  
  return {
    mes: this.mes,
    año: this.año,
    totalActividades,
    actividades: this.actividades,
    ultimaActividad: this.ultimaActividad,
    tiempoPromedioSesion: this.actividades.tiempoTotalSesion / Math.max(this.actividades.logins, 1)
  };
};

// Método estático para obtener estadísticas globales del mes
actividadMensualSchema.statics.obtenerEstadisticasGlobales = async function(mes, año) {
  const actividades = await this.find({ 
    mes: mes, 
    año: año, 
    activo: true 
  }).populate('usuario', 'nombre apellido email rol');
  
  const estadisticas = {
    mes: mes,
    año: año,
    totalUsuariosActivos: actividades.length,
    totalActividades: 0,
    actividadesPorTipo: {},
    usuariosMasActivos: [],
    tiempoTotalSesion: 0
  };
  
  // Calcular totales
  actividades.forEach(actividad => {
    const stats = actividad.obtenerEstadisticas();
    estadisticas.totalActividades += stats.totalActividades;
    estadisticas.tiempoTotalSesion += actividad.actividades.tiempoTotalSesion || 0;
    
    // Acumular por tipo
    Object.keys(actividad.actividades).forEach(tipo => {
      if (!estadisticas.actividadesPorTipo[tipo]) {
        estadisticas.actividadesPorTipo[tipo] = 0;
      }
      estadisticas.actividadesPorTipo[tipo] += actividad.actividades[tipo] || 0;
    });
    
    // Agregar a usuarios más activos
    estadisticas.usuariosMasActivos.push({
      usuario: actividad.usuario,
      totalActividades: stats.totalActividades,
      ultimaActividad: actividad.ultimaActividad
    });
  });
  
  // Ordenar usuarios más activos
  estadisticas.usuariosMasActivos.sort((a, b) => b.totalActividades - a.totalActividades);
  estadisticas.usuariosMasActivos = estadisticas.usuariosMasActivos.slice(0, 10);
  
  return estadisticas;
};

// Pre-save middleware para validar datos
actividadMensualSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('mes') || this.isModified('año')) {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const añoActual = fechaActual.getFullYear();
    
    // Validar que el mes y año no sean futuros
    if (this.año > añoActual || (this.año === añoActual && this.mes > mesActual)) {
      return next(new Error('No se puede registrar actividad para fechas futuras'));
    }
  }
  
  next();
});

module.exports = mongoose.model('ActividadMensual', actividadMensualSchema);
