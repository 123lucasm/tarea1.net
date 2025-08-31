const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const Materia = require('../models/Materia');

// GET /materias - Listar todas las materias
router.get('/', async (req, res) => {
    try {
        const materias = await Materia.find({ activa: true }).populate('requisitosPrevios.materia');
        res.json(materias);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener materias' });
    }
});

// GET /materias/:id - Obtener materia específica
router.get('/:id', async (req, res) => {
    try {
        const materia = await Materia.findById(req.params.id).populate('requisitosPrevios.materia');
        if (!materia) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        res.json(materia);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener materia' });
    }
});

// POST /materias - Crear nueva materia (solo admin)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const materia = new Materia(req.body);
        await materia.save();
        res.status(201).json(materia);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear materia' });
    }
});

// PUT /materias/:id - Actualizar materia (solo admin)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const materia = await Materia.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!materia) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        res.json(materia);
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar materia' });
    }
});

// DELETE /materias/:id - Eliminar materia (solo admin)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const materia = await Materia.findByIdAndDelete(req.params.id);
        if (!materia) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        res.json({ message: 'Materia eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar materia' });
    }
});

module.exports = router;

