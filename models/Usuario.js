const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  rol: {
    type: String,
    enum: ['estudiante', 'administrador'],
    default: 'estudiante'
  },
  legajo: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimoAcceso: {
    type: Date,
    default: Date.now
  },
  refreshToken: {
    type: String
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ rol: 1 });
usuarioSchema.index({ legajo: 1 });

// Método para hashear contraseña antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
usuarioSchema.methods.compararPassword = async function(passwordCandidata) {
  return await bcrypt.compare(passwordCandidata, this.password);
};

// Método para obtener nombre completo
usuarioSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Configurar virtuals para JSON
usuarioSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.refreshToken;
    return ret;
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);

