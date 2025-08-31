const express = require('express');
const { body, validationResult } = require('express-validator');
const PreviaService = require('../services/previaService');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const previaService = new PreviaService();

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({
            error: 'Datos de entrada inválidos',
            detalles: errores.array()
        });
    }
    next();
};

// Validaciones para crear/actualizar previas
const validacionesPrevia = [
    body('materia')
        .isMongoId()
        .withMessage('ID de materia inválido'),
    body('materiaRequerida')
        .isMongoId()
        .withMessage('ID de materia requerida inválido'),
    body('tipo')
        .isIn(['curso_aprobado', 'examen_aprobado'])
        .withMessage('Tipo de previa inválido'),
    body('notaMinima')
        .isInt({ min: 1, max: 5 })
        .withMessage('La nota mínima debe estar entre 1 y 5')
];

// GET /previas - Obtener todas las previas (solo admin)
router.get('/', 
    authenticateToken, 
    requireRole('administrador'),
    async (req, res) => {
        try {
            const previas = await previaService.obtenerTodasPrevias();
            res.json({ previas });
        } catch (error) {
            console.error('Error al obtener previas:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// GET /previas/materia/:materiaId - Obtener previas de una materia específica
router.get('/materia/:materiaId', 
    authenticateToken,
    async (req, res) => {
        try {
            const { materiaId } = req.params;
            const previas = await previaService.obtenerPreviasMateria(materiaId);
            res.json({ previas });
        } catch (error) {
            console.error('Error al obtener previas de la materia:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// GET /previas/requiere/:materiaId - Obtener materias que requieren una materia específica
router.get('/requiere/:materiaId', 
    authenticateToken,
    async (req, res) => {
        try {
            const { materiaId } = req.params;
            const previas = await previaService.obtenerMateriasQueRequieren(materiaId);
            res.json({ previas });
        } catch (error) {
            console.error('Error al obtener materias que requieren:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// GET /previas/arbol/:materiaId - Obtener árbol de dependencias de una materia
router.get('/arbol/:materiaId', 
    authenticateToken,
    async (req, res) => {
        try {
            const { materiaId } = req.params;
            const { profundidad = 3 } = req.query;
            const arbol = await previaService.obtenerArbolDependencias(materiaId, parseInt(profundidad));
            res.json({ arbol });
        } catch (error) {
            console.error('Error al obtener árbol de dependencias:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// POST /previas - Crear nueva previa (solo admin)
router.post('/', 
    authenticateToken, 
    requireRole('administrador'),
    validacionesPrevia,
    manejarErroresValidacion,
    async (req, res) => {
        try {
            const datosPrevia = {
                ...req.body,
                creadoPor: req.usuario._id
            };
            
            const previa = await previaService.crearPrevia(datosPrevia);
            
            // Notificar por WebSocket si está disponible
            if (req.io) {
                req.io.emit('previa_creada', {
                    mensaje: 'Nueva previa creada',
                    previa
                });
            }
            
            res.status(201).json({
                mensaje: 'Previa creada exitosamente',
                previa
            });
        } catch (error) {
            console.error('Error al crear previa:', error);
            
            if (error.message.includes('ya existe')) {
                return res.status(409).json({
                    error: error.message
                });
            }
            
            if (error.message.includes('no existen')) {
                return res.status(400).json({
                    error: error.message
                });
            }
            
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// PUT /previas/:id - Actualizar previa (solo admin)
router.put('/:id', 
    authenticateToken, 
    requireRole('administrador'),
    validacionesPrevia,
    manejarErroresValidacion,
    async (req, res) => {
        try {
            const { id } = req.params;
            const previa = await previaService.actualizarPrevia(id, req.body);
            
            // Notificar por WebSocket si está disponible
            if (req.io) {
                req.io.emit('previa_actualizada', {
                    mensaje: 'Previa actualizada',
                    previa
                });
            }
            
            res.json({
                mensaje: 'Previa actualizada exitosamente',
                previa
            });
        } catch (error) {
            console.error('Error al actualizar previa:', error);
            
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({
                    error: error.message
                });
            }
            
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// DELETE /previas/:id - Desactivar previa (solo admin)
router.delete('/:id', 
    authenticateToken, 
    requireRole('administrador'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const previa = await previaService.desactivarPrevia(id);
            
            // Notificar por WebSocket si está disponible
            if (req.io) {
                req.io.emit('previa_desactivada', {
                    mensaje: 'Previa desactivada',
                    previa
                });
            }
            
            res.json({
                mensaje: 'Previa desactivada exitosamente',
                previa
            });
        } catch (error) {
            console.error('Error al desactivar previa:', error);
            
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({
                    error: error.message
                });
            }
            
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

// DELETE /previas/:id/permanente - Eliminar previa permanentemente (solo admin)
router.delete('/:id/permanente', 
    authenticateToken, 
    requireRole('administrador'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const previa = await previaService.eliminarPrevia(id);
            
            // Notificar por WebSocket si está disponible
            if (req.io) {
                req.io.emit('previa_eliminada', {
                    mensaje: 'Previa eliminada permanentemente',
                    previa
                });
            }
            
            res.json({
                mensaje: 'Previa eliminada permanentemente',
                previa
            });
        } catch (error) {
            console.error('Error al eliminar previa:', error);
            
            if (error.message.includes('no encontrada')) {
                return res.status(404).json({
                    error: error.message
                });
            }
            
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
);

module.exports = router;


