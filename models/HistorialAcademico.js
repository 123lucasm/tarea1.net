const mongoose = require('mongoose');

const historialAcademicoSchema = new mongoose.Schema({
  estudiante: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  materia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Materia',
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'en_curso', 'cursado', 'aprobado'],
    default: 'pendiente'
  },
  notaCurso: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: function(v) {
        return v >= 1 && v <= 5;
      },
      message: 'La nota debe estar entre 1 y 5'
    }
  },
  notaExamen: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: function(v) {
        return v >= 1 && v <= 5;
      },
      message: 'La nota debe estar entre 1 y 5'
    }
  },
  notaFinal: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: function(v) {
        return v >= 1 && v <= 5;
      },
      message: 'La nota debe estar entre 1 y 5'
    }
  },
  semestre: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  anio: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  fechaInscripcion: {
    type: Date,
    default: Date.now
  },
  fechaAprobacion: {
    type: Date
  },
  observaciones: {
    type: String,
    trim: true
  },
  creditosObtenidos: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
historialAcademicoSchema.index({ estudiante: 1, materia: 1 }, { unique: true });
historialAcademicoSchema.index({ estudiante: 1, estado: 1 });
historialAcademicoSchema.index({ estudiante: 1, semestre: 1, anio: 1 });
historialAcademicoSchema.index({ materia: 1, estado: 1 });

// Método para calcular nota final
historialAcademicoSchema.methods.calcularNotaFinal = function() {
  if (this.notaCurso && this.notaExamen) {
    // Promedio ponderado: 70% examen, 30% curso
    this.notaFinal = Math.round((this.notaExamen * 0.7) + (this.notaCurso * 0.3));
    
    // Actualizar estado si la nota es aprobatoria
    if (this.notaFinal >= 3) {
      this.estado = 'aprobado';
      this.fechaAprobacion = new Date();
      this.creditosObtenidos = this.materia ? this.materia.creditos : 0;
    }
  }
  return this.notaFinal;
};

// Método para verificar si está aprobada
historialAcademicoSchema.methods.estaAprobada = function() {
  return this.estado === 'aprobado' && this.notaFinal >= 3;
};

// Método para verificar si solo falta examen
historialAcademicoSchema.methods.soloFaltaExamen = function() {
  return this.estado === 'cursado' && this.notaCurso >= 3 && !this.notaExamen;
};

// Método para verificar si solo falta curso
historialAcademicoSchema.methods.soloFaltaCurso = function() {
  return this.estado === 'pendiente' && this.notaExamen >= 3 && !this.notaCurso;
};

// Middleware para actualizar nota final automáticamente
historialAcademicoSchema.pre('save', function(next) {
  if (this.isModified('notaCurso') || this.isModified('notaExamen')) {
    this.calcularNotaFinal();
  }
  next();
});

// Virtual para estado descriptivo
historialAcademicoSchema.virtual('estadoDescriptivo').get(function() {
  switch (this.estado) {
    case 'pendiente': return 'Pendiente de cursar';
    case 'en_curso': return 'Cursando actualmente';
    case 'cursado': return 'Curso aprobado, examen pendiente';
    case 'aprobado': return 'Materia aprobada';
    default: return 'Estado desconocido';
  }
});

// Configurar virtuals para JSON
historialAcademicoSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('HistorialAcademico', historialAcademicoSchema);
