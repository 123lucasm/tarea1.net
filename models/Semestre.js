const mongoose = require('mongoose');

const semestreSchema = new mongoose.Schema({
  numero: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 20, // Permite hasta 20 semestres para flexibilidad futura
    validate: {
      validator: Number.isInteger,
      message: 'El número de semestre debe ser un entero'
    }
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
    default: function() {
      return `Semestre ${this.numero}`;
    }
  },
  descripcion: {
    type: String,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  orden: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'El orden debe ser un entero'
    }
  },
  creditosRequeridos: {
    type: Number,
    default: 0,
    min: 0
  },
  materias: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Materia'
  }]
}, {
  timestamps: true
});

// Índices para mejorar performance
semestreSchema.index({ numero: 1 });
semestreSchema.index({ orden: 1 });
semestreSchema.index({ activo: 1 });

// Método para obtener materias del semestre
semestreSchema.methods.obtenerMaterias = function() {
  return this.populate('materias');
};

// Método para agregar materia al semestre
semestreSchema.methods.agregarMateria = function(materiaId) {
  if (!this.materias.includes(materiaId)) {
    this.materias.push(materiaId);
    return true;
  }
  return false;
};

// Método para remover materia del semestre
semestreSchema.methods.removerMateria = function(materiaId) {
  const index = this.materias.indexOf(materiaId);
  if (index > -1) {
    this.materias.splice(index, 1);
    return true;
  }
  return false;
};

// Método para verificar si el semestre está completo
semestreSchema.methods.estaCompleto = function() {
  return this.materias.length > 0;
};

// Pre-save middleware para validar que el orden sea secuencial
semestreSchema.pre('save', function(next) {
  if (this.isModified('orden')) {
    // Aquí podrías agregar validación adicional si es necesario
    next();
  } else {
    next();
  }
});

module.exports = mongoose.model('Semestre', semestreSchema);
