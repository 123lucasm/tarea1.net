const express = require('express');
const router = express.Router();
const { requireEstudianteOrAdmin } = require('../middleware/auth');
const ElegibilidadService = require('../services/elegibilidadService');
const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');

// GET /elegibilidad/materias - Materias elegibles para un estudiante
router.get('/materias', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const estudianteId = req.user.rol === 'estudiante' ? req.user._id : req.query.estudianteId;
        
        if (!estudianteId) {
            return res.status(400).json({ error: 'ID de estudiante requerido' });
        }

        const materiasElegibles = await ElegibilidadService.obtenerMateriasElegibles(estudianteId);
        res.json(materiasElegibles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener materias elegibles' });
    }
});

// POST /elegibilidad/verificar - Verificar elegibilidad para una materia específica
router.post('/verificar', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const { materiaId, estudianteId } = req.body;
        const idEstudiante = estudianteId || req.user._id;

        if (!materiaId) {
            return res.status(400).json({ error: 'ID de materia requerido' });
        }

        const materia = await Materia.findById(materiaId);
        if (!materia) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        const elegibilidad = await ElegibilidadService.verificarElegibilidad(idEstudiante, materiaId);
        res.json(elegibilidad);
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar elegibilidad' });
    }
});


// GET /elegibilidad/recomendaciones - Obtener recomendaciones
router.get('/recomendaciones', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const estudianteId = req.user.rol === 'estudiante' ? req.user._id : req.query.estudianteId;
        
        if (!estudianteId) {
            return res.status(400).json({ error: 'ID de estudiante requerido' });
        }

        const recomendaciones = await ElegibilidadService.obtenerRecomendaciones(estudianteId);
        res.json(recomendaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener recomendaciones' });
    }
});

module.exports = router;







