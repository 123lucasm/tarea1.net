const Actividad = require('../models/Actividad');

class ActividadService {
    // Registrar actividad de actualización de materia
    static async registrarActualizacionMateria(materiaId, usuarioId, cambios, req = null) {
        try {
            const actividad = new Actividad({
                usuario: usuarioId,
                tipo: 'materia_actualizada',
                titulo: 'Materia Actualizada',
                descripcion: `Materia modificada: ${cambios.nombre || 'Sin nombre'}`,
                metadata: {
                    materiaId,
                    cambios,
                    fechaActualizacion: new Date()
                },
                fecha: new Date()
            });

            await actividad.save();

            // Emitir evento Socket.IO si está disponible
            if (req && req.io) {
                req.io.emit('actividadActualizada', {
                    tipo: 'materia_actualizada',
                    titulo: 'Materia Actualizada',
                    descripcion: `Materia modificada: ${cambios.nombre || 'Sin nombre'}`,
                    fecha: actividad.fecha
                });
            }

            console.log('✅ Actividad de actualización de materia registrada');
            return actividad;
        } catch (error) {
            console.error('❌ Error registrando actividad de materia:', error);
            throw error;
        }
    }

    // Registrar actividad de actualización de perfil
    static async registrarActualizacionPerfil(usuarioId, cambios, req = null) {
        try {
            const actividad = new Actividad({
                usuario: usuarioId,
                tipo: 'perfil_actualizado',
                titulo: 'Perfil Actualizado',
                descripcion: 'Información personal modificada',
                metadata: {
                    cambios,
                    fechaActualizacion: new Date()
                },
                fecha: new Date()
            });

            await actividad.save();

            // Emitir evento Socket.IO si está disponible
            if (req && req.io) {
                req.io.emit('actividadActualizada', {
                    tipo: 'perfil_actualizado',
                    titulo: 'Perfil Actualizado',
                    descripcion: 'Información personal modificada',
                    fecha: actividad.fecha
                });
            }

            console.log('✅ Actividad de actualización de perfil registrada');
            return actividad;
        } catch (error) {
            console.error('❌ Error registrando actividad de perfil:', error);
            throw error;
        }
    }

    // Registrar actividad de materia aprobada
    static async registrarMateriaAprobada(usuarioId, materiaId, nota, req = null) {
        try {
            const Materia = require('../models/Materia');
            const materia = await Materia.findById(materiaId);

            const actividad = new Actividad({
                usuario: usuarioId,
                tipo: 'materia_aprobada',
                titulo: 'Materia Aprobada',
                descripcion: `${materia?.codigo || 'Materia'} - Calificación: ${nota}`,
                metadata: {
                    materiaId,
                    nota,
                    fechaAprobacion: new Date()
                },
                fecha: new Date()
            });

            await actividad.save();

            // Emitir evento Socket.IO si está disponible
            if (req && req.io) {
                req.io.emit('actividadActualizada', {
                    tipo: 'materia_aprobada',
                    titulo: 'Materia Aprobada',
                    descripcion: `${materia?.codigo || 'Materia'} - Calificación: ${nota}`,
                    fecha: actividad.fecha
                });
            }

            console.log('✅ Actividad de materia aprobada registrada');
            return actividad;
        } catch (error) {
            console.error('❌ Error registrando actividad de materia aprobada:', error);
            throw error;
        }
    }

    // Registrar actividad de materia registrada
    static async registrarMateriaRegistrada(usuarioId, materiaId, req = null) {
        try {
            const Materia = require('../models/Materia');
            const materia = await Materia.findById(materiaId);

            const actividad = new Actividad({
                usuario: usuarioId,
                tipo: 'materia_registrada',
                titulo: 'Nueva Materia Registrada',
                descripcion: `${materia?.codigo || 'Materia'} - ${materia?.nombre || 'Sin nombre'}`,
                metadata: {
                    materiaId,
                    fechaRegistro: new Date()
                },
                fecha: new Date()
            });

            await actividad.save();

            // Emitir evento Socket.IO si está disponible
            if (req && req.io) {
                req.io.emit('actividadActualizada', {
                    tipo: 'materia_registrada',
                    titulo: 'Nueva Materia Registrada',
                    descripcion: `${materia?.codigo || 'Materia'} - ${materia?.nombre || 'Sin nombre'}`,
                    fecha: actividad.fecha
                });
            }

            console.log('✅ Actividad de materia registrada registrada');
            return actividad;
        } catch (error) {
            console.error('❌ Error registrando actividad de materia registrada:', error);
            throw error;
        }
    }

    // Obtener actividades recientes de un usuario
    static async obtenerActividadesRecientes(usuarioId, limite = 5) {
        try {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 7);

            const actividades = await Actividad.find({
                usuario: usuarioId,
                fecha: { $gte: fechaLimite }
            })
            .sort({ fecha: -1 })
            .limit(limite)
            .populate('materia', 'codigo nombre')
            .lean();

            return actividades;
        } catch (error) {
            console.error('❌ Error obteniendo actividades recientes:', error);
            throw error;
        }
    }
}

module.exports = ActividadService;
