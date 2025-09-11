const express = require('express');
const router = express.Router();
const { requireEstudianteOrAdmin, requireOwnership } = require('../middleware/auth');
const HistorialAcademico = require('../models/HistorialAcademico');
const Materia = require('../models/Materia');

// GET /estudiantes/dashboard - Dashboard del estudiante
router.get('/dashboard', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const estudianteId = req.user.rol === 'estudiante' ? req.user._id : req.query.estudianteId;
        
        if (!estudianteId) {
            return res.status(400).json({ error: 'ID de estudiante requerido' });
        }

        const historial = await HistorialAcademico.find({ estudiante: estudianteId })
            .populate('materia')
            .sort({ semestre: -1, anio: -1 });

        const creditosObtenidos = historial
            .filter(h => h.estado === 'aprobado')
            .reduce((total, h) => total + (h.creditosObtenidos || 0), 0);

        const materiasEnCurso = historial.filter(h => h.estado === 'en_curso');
        const materiasAprobadas = historial.filter(h => h.estado === 'aprobado');

        res.json({
            creditosObtenidos,
            materiasEnCurso,
            materiasAprobadas,
            historial
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener dashboard' });
    }
});

// GET /estudiantes/historial - Historial académico
router.get('/historial', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const estudianteId = req.user.rol === 'estudiante' ? req.user._id : req.query.estudianteId;
        
        if (!estudianteId) {
            return res.status(400).json({ error: 'ID de estudiante requerido' });
        }

        const historial = await HistorialAcademico.find({ estudiante: estudianteId })
            .populate('materia')
            .sort({ semestre: -1, anio: -1 });

        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// POST /estudiantes/historial - Agregar materia al historial
router.post('/historial', requireEstudianteOrAdmin, async (req, res) => {
    try {
        const { materiaId, estado, semestre, anio } = req.body;
        const estudianteId = req.user.rol === 'estudiante' ? req.user._id : req.body.estudianteId;

        if (!estudianteId || !materiaId) {
            return res.status(400).json({ error: 'Estudiante y materia son requeridos' });
        }

        // Verificar que no exista ya en el historial
        const existente = await HistorialAcademico.findOne({ 
            estudiante: estudianteId, 
            materia: materiaId 
        });

        if (existente) {
            return res.status(400).json({ error: 'La materia ya está en el historial' });
        }

        const historial = new HistorialAcademico({
            estudiante: estudianteId,
            materia: materiaId,
            estado: estado || 'pendiente',
            semestre: semestre || 1,
            anio: anio || new Date().getFullYear()
        });

        await historial.save();
        await historial.populate('materia');
        
        res.status(201).json(historial);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear historial' });
    }
});

// PUT /estudiantes/historial/:id - Actualizar estado de materia
router.put('/historial/:id', requireEstudianteOrAdmin, requireOwnership, async (req, res) => {
    try {
        const historial = await HistorialAcademico.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        ).populate('materia');

        if (!historial) {
            return res.status(404).json({ error: 'Historial no encontrado' });
        }

        res.json(historial);
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar historial' });
    }
});

module.exports = router;

