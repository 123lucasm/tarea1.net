const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: [
      'materia_aprobada',
      'materia_registrada', 
      'materia_actualizada',
      'perfil_actualizado',
      'login',
      'logout',
      'horario_actualizado',
      'info'
    ]
  },
  titulo: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fecha: {
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
actividadSchema.index({ usuario: 1, fecha: -1 });
actividadSchema.index({ tipo: 1, fecha: -1 });
actividadSchema.index({ fecha: -1 });

// Método para obtener actividades recientes de un usuario
actividadSchema.statics.obtenerActividadesRecientes = async function(usuarioId, limite = 5) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 7);

  return await this.find({
    usuario: usuarioId,
    fecha: { $gte: fechaLimite },
    activo: true
  })
  .sort({ fecha: -1 })
  .limit(limite)
  .populate('materia', 'codigo nombre')
  .lean();
};

// Método para registrar una actividad
actividadSchema.statics.registrarActividad = async function(usuarioId, tipo, titulo, descripcion, metadata = {}) {
  const actividad = new this({
    usuario: usuarioId,
    tipo,
    titulo,
    descripcion,
    metadata
  });

  return await actividad.save();
};

module.exports = mongoose.model('Actividad', actividadSchema);
