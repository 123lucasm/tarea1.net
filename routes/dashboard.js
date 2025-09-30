const express = require('express');
const router = express.Router();
const { checkSession, requireAuth } = require('../middleware/auth');
const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');
const Actividad = require('../models/Actividad');

// GET /api/actividad-reciente - Obtener actividad reciente del usuario
router.get('/api/actividad-reciente', checkSession, requireAuth, async (req, res) => {
    try {
        const usuarioId = req.usuario._id;
        
        // Obtener actividades de los últimos 7 días
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 7);
        
        const actividades = await Actividad.find({
            usuario: usuarioId,
            fecha: { $gte: fechaLimite }
        })
        .sort({ fecha: -1 })
        .limit(5)
        .populate('materia', 'codigo nombre')
        .lean();
        
        // Formatear actividades para el frontend
        const actividadesFormateadas = actividades.map(actividad => {
            let titulo = '';
            let descripcion = '';
            let tipo = 'info';
            
            switch (actividad.tipo) {
                case 'materia_aprobada':
                    titulo = 'Materia Aprobada';
                    descripcion = `${actividad.materia?.codigo || 'Materia'} - Calificación: ${actividad.nota || 'N/A'}`;
                    tipo = 'materia_aprobada';
                    break;
                case 'materia_registrada':
                    titulo = 'Nueva Materia Registrada';
                    descripcion = `${actividad.materia?.codigo || 'Materia'} - ${actividad.materia?.nombre || 'Sin nombre'}`;
                    tipo = 'materia_registrada';
                    break;
                case 'perfil_actualizado':
                    titulo = 'Perfil Actualizado';
                    descripcion = 'Información personal modificada';
                    tipo = 'perfil_actualizado';
                    break;
                case 'login':
                    titulo = 'Inicio de Sesión';
                    descripcion = 'Sesión iniciada exitosamente';
                    tipo = 'login';
                    break;
                case 'logout':
                    titulo = 'Cierre de Sesión';
                    descripcion = 'Sesión cerrada';
                    tipo = 'logout';
                    break;
                default:
                    titulo = 'Actividad';
                    descripcion = actividad.descripcion || 'Sin descripción';
                    tipo = 'info';
            }
            
            return {
                id: actividad._id,
                tipo,
                titulo,
                descripcion,
                fecha: actividad.fecha,
                metadata: actividad.metadata || {}
            };
        });
        
        res.json(actividadesFormateadas);
    } catch (error) {
        console.error('Error obteniendo actividad reciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/estadisticas-dashboard - Obtener estadísticas del dashboard
router.get('/api/estadisticas-dashboard', checkSession, requireAuth, async (req, res) => {
    try {
        const usuarioId = req.usuario._id;
        console.log('📊 Obteniendo estadísticas para usuario:', usuarioId);
        
        // Obtener todas las materias del usuario
        const todasLasMaterias = await HistorialAcademico.find({
            estudiante: usuarioId
        }).populate('materia', 'codigo nombre creditos');
        
        console.log('🔍 Todas las materias del usuario:', todasLasMaterias.length);
        console.log('🔍 Estados encontrados:', [...new Set(todasLasMaterias.map(h => h.estado))]);
        console.log('🔍 Detalles de todas las materias:', todasLasMaterias.map(h => ({
            materia: h.materia?.codigo,
            estado: h.estado,
            nota: h.notaFinal,
            creditos: h.materia?.creditos
        })));
        
        // Filtrar materias aprobadas (usar diferentes estados posibles)
        const materiasCursadas = todasLasMaterias.filter(h => 
            h.estado === 'aprobada' || 
            h.estado === 'aprobado' || 
            h.estado === 'completada' ||
            h.estado === 'completado'
        );
        
        console.log('📚 Materias cursadas encontradas:', materiasCursadas.length);
        console.log('📚 Detalles materias cursadas:', materiasCursadas.map(h => ({
            materia: h.materia?.codigo,
            nota: h.notaFinal,
            creditos: h.materia?.creditos
        })));
        
        // Filtrar materias en curso
        const materiasEnCurso = todasLasMaterias.filter(h => 
            h.estado === 'en_curso' || 
            h.estado === 'cursando' ||
            h.estado === 'activa'
        );
        
        console.log('📖 Materias en curso encontradas:', materiasEnCurso.length);
        
        // Calcular estadísticas
        const totalMaterias = materiasCursadas.length;
        const totalCreditos = materiasCursadas.reduce((sum, h) => sum + (h.materia?.creditos || 0), 0);
        const promedio = materiasCursadas.length > 0 
            ? materiasCursadas.reduce((sum, h) => sum + (h.notaFinal || 0), 0) / materiasCursadas.length 
            : 0;
        
        // Calcular progreso académico (porcentaje de materias aprobadas vs total de materias disponibles)
        const totalMateriasDisponibles = await Materia.countDocuments({ activa: true });
        const progresoAcademico = totalMateriasDisponibles > 0 
            ? Math.round((totalMaterias / totalMateriasDisponibles) * 100) 
            : 0;
        
        console.log('📊 Cálculo de progreso académico:', {
            totalMaterias,
            totalMateriasDisponibles,
            progresoAcademico: `${progresoAcademico}%`
        });
        
        const estadisticas = {
            materiasActivas: materiasEnCurso.length,
            creditosAprobados: totalCreditos,
            promedioGeneral: Math.round(promedio * 10) / 10,
            progresoAcademico,
            totalMaterias,
            materiasEnCurso: materiasEnCurso.map(h => ({
                codigo: h.materia?.codigo,
                nombre: h.materia?.nombre
            }))
        };
        
        console.log('📊 Estadísticas calculadas:', estadisticas);
        
        res.json(estadisticas);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/registrar-actividad - Registrar nueva actividad (para testing)
router.post('/api/registrar-actividad', checkSession, requireAuth, async (req, res) => {
    try {
        const { tipo, titulo, descripcion, metadata } = req.body;
        const usuarioId = req.usuario._id;
        
        const nuevaActividad = new Actividad({
            usuario: usuarioId,
            tipo,
            titulo,
            descripcion,
            metadata: metadata || {},
            fecha: new Date()
        });
        
        await nuevaActividad.save();
        
        // Emitir evento Socket.IO
        if (req.io) {
            req.io.emit('actividadActualizada', {
                tipo,
                titulo,
                descripcion,
                fecha: nuevaActividad.fecha
            });
        }
        
        res.json({ success: true, actividad: nuevaActividad });
    } catch (error) {
        console.error('Error registrando actividad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


module.exports = router;
