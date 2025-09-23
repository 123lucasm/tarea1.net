const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');
const Previa = require('../models/Previa');

// GET /materias-cursadas - Mostrar página de selección de materias cursadas
router.get('/', requireAuth, (req, res) => {
    res.render('materias-cursadas', {
        title: 'Mis Materias Cursadas',
        usuario: req.usuario
    });
});

// GET /api/materias - Obtener todas las materias para selección
router.get('/api/materias', requireAuth, async (req, res) => {
    try {
        console.log('🔄 Cargando materias para selección...');
        
        const materias = await Materia.find({ activa: true })
            .populate('semestre', 'nombre numero orden')
            .sort({ codigo: 1 });

        console.log(`✅ Materias encontradas: ${materias.length}`);
        
        // Si no hay materias, crear algunas de prueba
        if (materias.length === 0) {
            console.log('⚠️ No hay materias en la base de datos, creando materias de prueba...');
            
            // Crear semestres de prueba si no existen
            const Semestre = require('../models/Semestre');
            let semestre1 = await Semestre.findOne({ numero: 1 });
            if (!semestre1) {
                semestre1 = new Semestre({
                    numero: 1,
                    nombre: 'Primer Semestre',
                    orden: 1,
                    activo: true
                });
                await semestre1.save();
                console.log('✅ Semestre 1 creado');
            }
            
            let semestre2 = await Semestre.findOne({ numero: 2 });
            if (!semestre2) {
                semestre2 = new Semestre({
                    numero: 2,
                    nombre: 'Segundo Semestre',
                    orden: 2,
                    activo: true
                });
                await semestre2.save();
                console.log('✅ Semestre 2 creado');
            }
            
            // Crear materias de prueba
            const materiasPrueba = [
                {
                    codigo: 'PROG101',
                    nombre: 'Programación I',
                    descripcion: 'Introducción a la programación',
                    creditos: 6,
                    semestre: semestre1._id,
                    activa: true,
                    cupoMaximo: 50,
                    cupoDisponible: 45
                },
                {
                    codigo: 'MAT101',
                    nombre: 'Matemática I',
                    descripcion: 'Matemática básica',
                    creditos: 6,
                    semestre: semestre1._id,
                    activa: true,
                    cupoMaximo: 50,
                    cupoDisponible: 40
                },
                {
                    codigo: 'PROG201',
                    nombre: 'Programación II',
                    descripcion: 'Programación avanzada',
                    creditos: 6,
                    semestre: semestre2._id,
                    activa: true,
                    cupoMaximo: 40,
                    cupoDisponible: 35
                }
            ];
            
            for (const materiaData of materiasPrueba) {
                const materia = new Materia(materiaData);
                await materia.save();
                console.log(`✅ Materia creada: ${materia.codigo}`);
            }
            
            // Recargar las materias
            const materiasActualizadas = await Materia.find({ activa: true })
                .populate('semestre', 'nombre numero orden')
                .sort({ codigo: 1 });
                
            return res.json(materiasActualizadas);
        }

        res.json(materias);
    } catch (error) {
        console.error('❌ Error cargando materias:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// POST /api/materias-cursadas - Guardar materias cursadas del estudiante
router.post('/api/materias-cursadas', requireAuth, async (req, res) => {
    try {
        const { materiasCursadas, notas } = req.body;
        const estudianteId = req.usuario._id;

        if (!Array.isArray(materiasCursadas)) {
            return res.status(400).json({ error: 'materiasCursadas debe ser un array' });
        }

        // Eliminar historial académico existente del estudiante
        await HistorialAcademico.deleteMany({ estudiante: estudianteId });

        // Crear nuevo historial académico
        const historialesCreados = [];

        for (const materiaId of materiasCursadas) {
            const nota = notas && notas[materiaId] ? notas[materiaId] : 4; // Nota por defecto 4
            
            const historial = new HistorialAcademico({
                estudiante: estudianteId,
                materia: materiaId,
                estado: 'aprobado',
                notaCurso: nota,
                notaExamen: nota,
                notaFinal: nota,
                semestre: 1, // Se puede ajustar según necesidad
                anio: new Date().getFullYear(),
                fechaAprobacion: new Date(),
                creditosObtenidos: 0 // Se calculará automáticamente
            });

            await historial.save();
            historialesCreados.push(historial);
        }

        res.json({
            mensaje: 'Materias cursadas guardadas exitosamente',
            historialesCreados: historialesCreados.length
        });

    } catch (error) {
        console.error('Error guardando materias cursadas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/materias-cursadas - Obtener materias cursadas del estudiante
router.get('/api/materias-cursadas', requireAuth, async (req, res) => {
    try {
        const estudianteId = req.usuario._id;

        const historial = await HistorialAcademico.find({ 
            estudiante: estudianteId,
            estado: 'aprobado'
        }).populate('materia', 'codigo nombre creditos semestre');

        res.json(historial.map(h => h.materia._id));

    } catch (error) {
        console.error('Error obteniendo materias cursadas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /elegibilidad/verificar - Verificar elegibilidad con materias cursadas específicas
router.post('/elegibilidad/verificar', requireAuth, async (req, res) => {
    try {
        const { materiaId, materiasCursadas } = req.body;
        const estudianteId = req.usuario._id;

        if (!materiaId) {
            return res.status(400).json({ error: 'ID de materia requerido' });
        }

        const materia = await Materia.findById(materiaId);
        if (!materia) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        // Verificar si la materia está activa
        if (!materia.activa) {
            return res.json({
                elegible: false,
                causa: 'Materia inactiva',
                materia: materia.nombre
            });
        }

        // Verificar si hay cupo disponible
        if (!materia.hayCupo()) {
            return res.json({
                elegible: false,
                causa: 'Sin cupo disponible',
                materia: materia.nombre
            });
        }

        // Verificar requisitos previos
        const previas = await Previa.find({ 
            materia: materiaId, 
            activa: true 
        });

        if (previas.length === 0) {
            return res.json({
                elegible: true,
                materia: materia.nombre,
                creditos: materia.creditos,
                horarios: materia.horarios
            });
        }

        // Verificar cada previa
        const requisitosFaltantes = [];
        let cumple = true;

        for (const previa of previas) {
            if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
                cumple = false;
                const materiaRequerida = await Materia.findById(previa.materiaRequerida);
                requisitosFaltantes.push({
                    materia: materiaRequerida?.nombre || 'Materia no encontrada',
                    codigo: materiaRequerida?.codigo || 'N/A',
                    tipo: previa.tipo,
                    notaMinima: previa.notaMinima
                });
            }
        }

        if (!cumple) {
            return res.json({
                elegible: false,
                causa: 'No cumple requisitos previos',
                materia: materia.nombre,
                requisitosFaltantes
            });
        }

        return res.json({
            elegible: true,
            materia: materia.nombre,
            creditos: materia.creditos,
            horarios: materia.horarios
        });

    } catch (error) {
        console.error('Error verificando elegibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /elegibilidad/materias - Obtener todas las materias con su elegibilidad
router.get('/elegibilidad/materias', requireAuth, async (req, res) => {
    try {
        const estudianteId = req.usuario._id;

        // Obtener materias cursadas del estudiante
        const historial = await HistorialAcademico.find({ 
            estudiante: estudianteId,
            estado: 'aprobado'
        });

        const materiasCursadas = historial.map(h => h.materia.toString());

        // Usar el servicio de elegibilidad mejorado
        const ElegibilidadService = require('../services/elegibilidadService');
        const resultado = await ElegibilidadService.obtenerMateriasElegiblesPorCursadas(materiasCursadas);

        res.json(resultado);

    } catch (error) {
        console.error('Error obteniendo elegibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función auxiliar para verificar elegibilidad de una materia
async function verificarElegibilidadMateria(materia, materiasCursadas) {
    // Verificar si hay cupo disponible
    if (!materia.hayCupo()) {
        return {
            elegible: false,
            causa: 'Sin cupo disponible',
            materia: materia.nombre
        };
    }

    // Verificar requisitos previos
    const previas = await Previa.find({ 
        materia: materia._id, 
        activa: true 
    });

    if (previas.length === 0) {
        return {
            elegible: true,
            materia: materia.nombre,
            creditos: materia.creditos,
            horarios: materia.horarios
        };
    }

    // Verificar cada previa
    const requisitosFaltantes = [];
    let cumple = true;

    for (const previa of previas) {
        if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
            cumple = false;
            const materiaRequerida = await Materia.findById(previa.materiaRequerida);
            requisitosFaltantes.push({
                materia: materiaRequerida?.nombre || 'Materia no encontrada',
                codigo: materiaRequerida?.codigo || 'N/A',
                tipo: previa.tipo,
                notaMinima: previa.notaMinima
            });
        }
    }

    if (!cumple) {
        return {
            elegible: false,
            causa: 'No cumple requisitos previos',
            materia: materia.nombre,
            requisitosFaltantes
        };
    }

    return {
        elegible: true,
        materia: materia.nombre,
        creditos: materia.creditos,
        horarios: materia.horarios
    };
}

module.exports = router;
