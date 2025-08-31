const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  dia: {
    type: String,
    enum: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    required: true
  },
  horaInicio: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  horaFin: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  tipo: {
    type: String,
    enum: ['teorico', 'practico', 'laboratorio'],
    default: 'teorico'
  },
  aula: {
    type: String,
    trim: true
  }
});

const materiaSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  creditos: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  semestre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Semestre',
    required: true
  },

  horarios: [horarioSchema],
  // Los requisitos previos se manejan a través de la entidad Previa
  // para mejor normalización y flexibilidad
  cupoMaximo: {
    type: Number,
    default: 50
  },
  cupoDisponible: {
    type: Number,
    default: 50
  },
  activa: {
    type: Boolean,
    default: true
  },
  profesor: {
    nombre: String,
    email: String
  },
  programa: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
materiaSchema.index({ codigo: 1 });
materiaSchema.index({ semestre: 1 });
materiaSchema.index({ activa: 1 });
materiaSchema.index({ 'profesor.email': 1 });

// Método para verificar si hay cupo disponible
materiaSchema.methods.hayCupo = function() {
  return this.cupoDisponible > 0;
};

// Método para reducir cupo
materiaSchema.methods.reducirCupo = function() {
  if (this.cupoDisponible > 0) {
    this.cupoDisponible -= 1;
    return true;
  }
  return false;
};

// Método para aumentar cupo
materiaSchema.methods.aumentarCupo = function() {
  if (this.cupoDisponible < this.cupoMaximo) {
    this.cupoDisponible += 1;
    return true;
  }
  return false;
};

// Método para verificar conflictos de horario
materiaSchema.methods.tieneConflictoHorario = function(otraMateria) {
  for (const horario1 of this.horarios) {
    for (const horario2 of otraMateria.horarios) {
      if (horario1.dia === horario2.dia) {
        const inicio1 = new Date(`2000-01-01 ${horario1.horaInicio}`);
        const fin1 = new Date(`2000-01-01 ${horario1.horaFin}`);
        const inicio2 = new Date(`2000-01-01 ${horario2.horaInicio}`);
        const fin2 = new Date(`2000-01-01 ${horario2.horaFin}`);
        
        if (inicio1 < fin2 && inicio2 < fin1) {
          return true;
        }
      }
    }
  }
  return false;
};

// Método para obtener información del semestre
materiaSchema.methods.obtenerSemestre = function() {
  return this.populate('semestre');
};

// Método para verificar si un estudiante puede cursar esta materia
materiaSchema.methods.puedeCursar = async function(estudianteId) {
  const Previa = mongoose.model('Previa');
  const HistorialAcademico = mongoose.model('HistorialAcademico');
  
  // Obtener el historial académico del estudiante
  const historial = await HistorialAcademico.find({ 
    estudiante: estudianteId,
    estado: 'aprobada'
  });
  
  // Obtener las previas de esta materia
  const previas = await Previa.find({ 
    materia: this._id,
    activa: true
  });
  
  // Si no hay previas, puede cursar
  if (previas.length === 0) {
    return { puede: true, razon: 'No tiene previas' };
  }
  
  // Verificar cada previa
  for (const previa of previas) {
    const cumple = previa.cumplePrevia(historial);
    if (!cumple) {
      return { 
        puede: false, 
        razon: `No cumple con la previa: ${previa.materiaRequerida}` 
      };
    }
  }
  
  return { puede: true, razon: 'Cumple con todas las previas' };
};

module.exports = mongoose.model('Materia', materiaSchema);
