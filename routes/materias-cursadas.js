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
        const { materiasCursadas, notas, materiasConTipos } = req.body;
        const estudianteId = req.usuario._id;

        if (!Array.isArray(materiasCursadas)) {
            return res.status(400).json({ error: 'materiasCursadas debe ser un array' });
        }

        console.log('💾 Guardando materias cursadas:', materiasCursadas.length);
        console.log('📊 Con tipos de aprobación:', materiasConTipos?.length || 0);

        // Obtener el historial actual del estudiante
        const historialActual = await HistorialAcademico.find({ estudiante: estudianteId });
        const materiasActuales = new Set(historialActual.map(h => h.materia.toString()));

        // Materias a agregar (nuevas)
        const materiasAAgregar = materiasCursadas.filter(id => !materiasActuales.has(id));
        
        // Materias a eliminar (ya no están seleccionadas)
        const materiasAEliminar = Array.from(materiasActuales).filter(id => !materiasCursadas.includes(id));

        console.log('➕ Materias a agregar:', materiasAAgregar.length);
        console.log('➖ Materias a eliminar:', materiasAEliminar.length);

        // Eliminar materias que ya no están seleccionadas
        if (materiasAEliminar.length > 0) {
            await HistorialAcademico.deleteMany({ 
                estudiante: estudianteId, 
                materia: { $in: materiasAEliminar } 
            });
            console.log('✅ Materias eliminadas del historial');
        }

        // Crear un mapa de tipos de aprobación para acceso rápido
        const tiposMap = new Map();
        if (materiasConTipos) {
            materiasConTipos.forEach(item => {
                tiposMap.set(item.materiaId, item);
            });
        }

        // Agregar nuevas materias al historial
        const historialesCreados = [];
        for (const materiaId of materiasAAgregar) {
            // Obtener información de la materia para calcular créditos
            const materia = await Materia.findById(materiaId);
            const tipoInfo = tiposMap.get(materiaId);
            
            // Determinar el estado basado en el tipo de aprobación
            let estado = 'aprobado';
            let notaCurso = 4;
            let notaExamen = null;
            
            if (tipoInfo) {
                estado = tipoInfo.tipo === 'aprobado' ? 'aprobado' : 'cursado';
                notaCurso = tipoInfo.notaCurso || (tipoInfo.tipo === 'aprobado' ? 4 : undefined);
                notaExamen = tipoInfo.notaExamen || (tipoInfo.tipo === 'cursado' ? 3 : undefined);
            }
            
            const nota = notas && notas[materiaId] ? notas[materiaId] : (estado === 'aprobado' ? 4 : 3);
            
            const historial = new HistorialAcademico({
                estudiante: estudianteId,
                materia: materiaId,
                estado: estado,
                notaCurso: notaCurso,
                notaExamen: notaExamen,
                notaFinal: nota,
                semestre: materia?.semestre?.numero || 1,
                anio: new Date().getFullYear(),
                fechaAprobacion: new Date(),
                creditosObtenidos: materia?.creditos || 0
            });

            await historial.save();
            historialesCreados.push(historial);
        }

        // Actualizar materias existentes con nuevos tipos si es necesario
        if (materiasConTipos) {
            console.log('Actualizando materias existentes con tipos:', materiasConTipos.length);
            try {
                for (const tipoInfo of materiasConTipos) {
                    console.log('Procesando materia:', tipoInfo.materiaId, 'tipo:', tipoInfo.tipo);
                    
                    const historialExistente = await HistorialAcademico.findOne({
                        estudiante: estudianteId,
                        materia: tipoInfo.materiaId
                    });
                    
                    if (historialExistente) {
                        const estadoAnterior = historialExistente.estado;
                        
                    // Mapear correctamente el tipo
                    let nuevoEstado;
                    if (tipoInfo.tipo === 'aprobado') {
                        nuevoEstado = 'aprobado';
                    } else if (tipoInfo.tipo === 'cursado') {
                        nuevoEstado = 'cursado';
                    } else {
                        nuevoEstado = 'aprobado'; // Por defecto
                    }
                        
                        historialExistente.estado = nuevoEstado;
                        
                        // Solo actualizar notas si no son null
                        if (tipoInfo.notaCurso !== undefined && tipoInfo.notaCurso !== null) {
                            historialExistente.notaCurso = tipoInfo.notaCurso;
                        }
                        if (tipoInfo.notaExamen !== undefined && tipoInfo.notaExamen !== null) {
                            historialExistente.notaExamen = tipoInfo.notaExamen;
                        }
                        
                        await historialExistente.save();
                        console.log(`Materia ${tipoInfo.materiaId} actualizada: ${estadoAnterior} -> ${historialExistente.estado}`);
                    } else {
                        console.log(`No se encontró historial para materia ${tipoInfo.materiaId}`);
                    }
                }
            } catch (updateError) {
                console.error('Error actualizando materias existentes:', updateError);
                throw updateError;
            }
        }

        console.log('✅ Historial académico actualizado exitosamente');

        res.json({
            mensaje: 'Materias cursadas guardadas exitosamente',
            historialesCreados: historialesCreados.length,
            materiasAgregadas: materiasAAgregar.length,
            materiasEliminadas: materiasAEliminar.length
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
            estado: { $in: ['aprobado', 'cursado', 'en_curso'] }
        }).populate('materia', 'codigo nombre creditos semestre');

        // Devolver solo los IDs de las materias para compatibilidad con el frontend
        res.json(historial.map(h => h.materia._id));

    } catch (error) {
        console.error('Error obteniendo materias cursadas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/estados-materias - Obtener estados detallados de todas las materias del estudiante
router.get('/api/estados-materias', requireAuth, async (req, res) => {
    try {
        const estudianteId = req.usuario._id;

        const historial = await HistorialAcademico.find({ 
            estudiante: estudianteId
        }).populate('materia', 'codigo nombre creditos semestre');

        // Devolver información detallada del historial
        const estados = historial.map(h => ({
            materia: h.materia._id,
            estado: h.estado,
            notaCurso: h.notaCurso,
            notaExamen: h.notaExamen,
            notaFinal: h.notaFinal,
            semestre: h.semestre,
            anio: h.anio,
            fechaAprobacion: h.fechaAprobacion,
            creditosObtenidos: h.creditosObtenidos
        }));

        res.json(estados);

    } catch (error) {
        console.error('Error obteniendo estados de materias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/estado-materia - Actualizar estado de una materia específica
router.put('/api/estado-materia', requireAuth, async (req, res) => {
    try {
        const { materiaId, estado, notaCurso, notaExamen } = req.body;
        const estudianteId = req.usuario._id;

        if (!materiaId || !estado) {
            return res.status(400).json({ error: 'materiaId y estado son requeridos' });
        }

        console.log('🔄 Actualizando estado de materia:', materiaId, estado);

        // Buscar o crear el historial académico
        let historial = await HistorialAcademico.findOne({
            estudiante: estudianteId,
            materia: materiaId
        });

        if (historial) {
            // Actualizar existente
            historial.estado = estado;
            if (notaCurso !== undefined) historial.notaCurso = notaCurso;
            if (notaExamen !== undefined) historial.notaExamen = notaExamen;
            await historial.save();
            console.log('✅ Historial actualizado');
        } else {
            // Crear nuevo historial
            const materia = await Materia.findById(materiaId);
            historial = new HistorialAcademico({
                estudiante: estudianteId,
                materia: materiaId,
                estado: estado,
                notaCurso: notaCurso || (estado === 'aprobado' ? 4 : null),
                notaExamen: notaExamen || (estado === 'cursado' ? 4 : null),
                notaFinal: 4,
                semestre: materia?.semestre?.numero || 1,
                anio: new Date().getFullYear(),
                fechaAprobacion: new Date(),
                creditosObtenidos: materia?.creditos || 0
            });
            await historial.save();
            console.log('✅ Nuevo historial creado');
        }

        res.json({
            mensaje: 'Estado de materia actualizado exitosamente',
            historial: historial
        });

    } catch (error) {
        console.error('Error actualizando estado de materia:', error);
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

        // Verificar cada previa considerando el tipo
        const requisitosFaltantes = [];
        let cumple = true;

        for (const previa of previas) {
            const materiaRequerida = await Materia.findById(previa.materiaRequerida);
            
            if (previa.tipo === 'curso_aprobado') {
                // Para curso aprobado: DEBE estar cursada y aprobada
                if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
                    cumple = false;
                    requisitosFaltantes.push({
                        materia: materiaRequerida?.nombre || 'Materia no encontrada',
                        codigo: materiaRequerida?.codigo || 'N/A',
                        tipo: 'curso_aprobado',
                        tipoDescripcion: 'Curso Aprobado (obligatorio)',
                        notaMinima: previa.notaMinima,
                        causa: 'Debe estar cursada y aprobada'
                    });
                }
            } else if (previa.tipo === 'examen_aprobado') {
                // Para examen aprobado: DEBE estar aprobada (ya sea por curso o por examen)
                // En el contexto de elegibilidad, si no está cursada, no puede estar aprobada
                if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
                    cumple = false;
                    requisitosFaltantes.push({
                        materia: materiaRequerida?.nombre || 'Materia no encontrada',
                        codigo: materiaRequerida?.codigo || 'N/A',
                        tipo: 'examen_aprobado',
                        tipoDescripcion: 'Examen Aprobado (obligatorio)',
                        notaMinima: previa.notaMinima,
                        causa: 'Debe estar aprobada (por curso o examen)'
                    });
                } else {
                    // Si está cursada, asumimos que está aprobada (esto se maneja en el historial académico)
                    console.log(`✅ Materia ${materiaRequerida?.codigo} ya está cursada y aprobada`);
                }
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

// GET /elegibilidad/materias - Obtener todas las materias con su elegibilidad (desde historial)
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

// POST /elegibilidad/materias - Calcular elegibilidad con materias específicas seleccionadas
router.post('/elegibilidad/materias', requireAuth, async (req, res) => {
    try {
        const { materiasCursadas } = req.body;

        if (!Array.isArray(materiasCursadas)) {
            return res.status(400).json({ error: 'materiasCursadas debe ser un array' });
        }

        console.log('📋 Calculando elegibilidad para materias cursadas:', materiasCursadas.length);

        // Usar el servicio de elegibilidad mejorado
        const ElegibilidadService = require('../services/elegibilidadService');
        const resultado = await ElegibilidadService.obtenerMateriasElegiblesPorCursadas(materiasCursadas);

        console.log('✅ Resultado elegibilidad:', {
            elegibles: resultado.materiasElegibles.length,
            noElegibles: resultado.materiasNoElegibles.length,
            cursadas: resultado.materiasCursadas.length
        });

        res.json(resultado);

    } catch (error) {
        console.error('Error calculando elegibilidad:', error);
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

    // Verificar cada previa considerando el tipo
    const requisitosFaltantes = [];
    let cumple = true;

    for (const previa of previas) {
        const materiaRequerida = await Materia.findById(previa.materiaRequerida);
        
        if (previa.tipo === 'curso_aprobado') {
            // Para curso aprobado: DEBE estar cursada y aprobada
            if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
                cumple = false;
                requisitosFaltantes.push({
                    materia: materiaRequerida?.nombre || 'Materia no encontrada',
                    codigo: materiaRequerida?.codigo || 'N/A',
                    tipo: 'curso_aprobado',
                    tipoDescripcion: 'Curso Aprobado (obligatorio)',
                    notaMinima: previa.notaMinima,
                    causa: 'Debe estar cursada y aprobada'
                });
            }
        } else if (previa.tipo === 'examen_aprobado') {
            // Para examen aprobado: DEBE estar aprobada (ya sea por curso o por examen)
            // En el contexto de elegibilidad, si no está cursada, no puede estar aprobada
            if (!materiasCursadas.includes(previa.materiaRequerida.toString())) {
                cumple = false;
                requisitosFaltantes.push({
                    materia: materiaRequerida?.nombre || 'Materia no encontrada',
                    codigo: materiaRequerida?.codigo || 'N/A',
                    tipo: 'examen_aprobado',
                    tipoDescripcion: 'Examen Aprobado (obligatorio)',
                    notaMinima: previa.notaMinima,
                    causa: 'Debe estar aprobada (por curso o examen)'
                });
            } else {
                // Si está cursada, asumimos que está aprobada (esto se maneja en el historial académico)
                console.log(`✅ Materia ${materiaRequerida?.codigo} ya está cursada y aprobada`);
            }
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
