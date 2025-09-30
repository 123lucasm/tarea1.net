const express = require('express');
const router = express.Router();
const { checkAdmin, checkAdminAPI } = require('../middleware/adminAuth');

// Importar modelos en el orden correcto para evitar problemas de dependencias
const Semestre = require('../models/Semestre');
const Materia = require('../models/Materia');
const Usuario = require('../models/Usuario');
const Previa = require('../models/Previa');
const ActividadMensual = require('../models/ActividadMensual');
const { 
  obtenerEstadisticasGlobales, 
  obtenerEstadisticasHistoricas,
  obtenerEstadisticasUsuario 
} = require('../middleware/actividadMensual');

// Aplicar middleware de administrador a las rutas de vistas
router.use((req, res, next) => {
  // Si es una ruta de API, usar checkAdminAPI
  if (req.path.startsWith('/api/')) {
    return checkAdminAPI(req, res, next);
  }
  // Si es una ruta de vista, usar checkAdmin
  return checkAdmin(req, res, next);
});

// Dashboard principal del administrador
router.get('/', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Panel de Administrador',
    usuario: req.usuario,
    loginSuccess: req.query.login === 'success'
  });
});

// ===== GESTIÓN DE USUARIOS =====

// Lista de usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find({})
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });
    
    res.render('admin/usuarios', {
      title: 'Gestión de Usuarios',
      usuario: req.usuario,
      usuarios: usuarios
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Lista de materias (vista)
router.get('/materias', async (req, res) => {
  try {
    const materias = await Materia.find({})
      .populate('semestre', 'nombre')
      .sort({ codigo: 1 });
    
    res.render('admin/materias', {
      title: 'Gestión de Materias',
      usuario: req.usuario,
      materias: materias
    });
  } catch (error) {
    console.error('Error cargando materias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener todos los usuarios
router.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find({})
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Crear nuevo usuario
router.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, apellido, email, cedula, password, rol, activo } = req.body;
    
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      cedula,
      password,
      rol: rol || 'estudiante',
      activo: activo !== undefined ? activo : true
    });
    
    await nuevoUsuario.save();
    
    // Emitir evento de Socket.IO
    if (req.io) {
      console.log('Emitiendo evento nuevo-usuario desde admin:', {
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        rol: nuevoUsuario.rol
      });
      req.io.emit('nuevo-usuario', {
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        rol: nuevoUsuario.rol
      });
    } else {
      console.log('req.io no está disponible');
    }
    
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener un usuario específico
router.get('/api/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .select('-password -refreshToken');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Error cargando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Eliminar usuario
router.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Actualizar usuario
router.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { nombre, apellido, email, cedula, password, rol, activo } = req.body;
    
    // Preparar datos de actualización
    const updateData = { nombre, apellido, email, cedula, rol, activo };
    
    // Solo incluir password si se proporciona
    if (password && password.trim() !== '') {
      updateData.password = password;
    }
    
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== GESTIÓN DE MATERIAS =====

// API: Obtener todas las materias con paginación
router.get('/api/materias', async (req, res) => {
  try {
    console.log('=== API /admin/api/materias llamada ===');
    console.log('URL completa:', req.originalUrl);
    console.log('Query params:', req.query);
    console.log('Usuario:', req.usuario ? req.usuario.nombre : 'No autenticado');
    console.log('Headers:', req.headers);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtros opcionales
    const search = req.query.search || '';
    const status = req.query.status || '';
    const semester = req.query.semester || '';
    
    console.log(`Cargando materias - Página: ${page}, Límite: ${limit}, Búsqueda: "${search}"`);
    
    // Construir filtros
    let filters = {};
    
    if (search) {
      filters.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { codigo: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filters.activa = status === 'activa';
    }
    
    if (semester) {
      filters.semestre = semester;
    }
    
    // Obtener materias con paginación
    const materias = await Materia.find(filters)
      .populate('semestre', 'nombre numero orden')
      .sort({ codigo: 1 })
      .skip(skip)
      .limit(limit);
    
    // Obtener total de materias para paginación
    const totalMaterias = await Materia.countDocuments(filters);
    const totalPages = Math.ceil(totalMaterias / limit);
    
    console.log(`Materias encontradas: ${materias.length} de ${totalMaterias} total`);
    
    const response = {
      materias,
      pagination: {
        currentPage: page,
        totalPages,
        totalMaterias,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    
    console.log('Respuesta que se enviará:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error cargando materias:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Crear nueva materia
router.post('/api/materias', async (req, res) => {
  try {
    const { nombre, codigo, creditos, semestre, descripcion, cupoMaximo, activa } = req.body;
    
    const nuevaMateria = new Materia({
      nombre,
      codigo,
      creditos,
      semestre,
      descripcion,
      cupoMaximo: cupoMaximo || 50,
      cupoDisponible: cupoMaximo || 50,
      activa: activa !== undefined ? activa : true
    });
    
    await nuevaMateria.save();
    
    // Emitir evento de Socket.IO
    if (req.io) {
      console.log('Emitiendo evento nueva-materia:', {
        nombre: nuevaMateria.nombre,
        codigo: nuevaMateria.codigo
      });
      req.io.emit('nueva-materia', {
        nombre: nuevaMateria.nombre,
        codigo: nuevaMateria.codigo
      });
    }
    
    res.status(201).json(nuevaMateria);
  } catch (error) {
    console.error('Error creando materia:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// API: Obtener materia por ID
router.get('/api/materias/:id', async (req, res) => {
  try {
    const materia = await Materia.findById(req.params.id)
      .populate('semestre', 'nombre numero orden');
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    res.json(materia);
  } catch (error) {
    console.error('Error obteniendo materia:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// API: Actualizar materia
router.put('/api/materias/:id', async (req, res) => {
  try {
    const { nombre, codigo, creditos, semestre, descripcion, cupoMaximo, activa } = req.body;
    
    // Obtener la materia original para comparar cambios
    const materiaOriginal = await Materia.findById(req.params.id);
    
    const materia = await Materia.findByIdAndUpdate(
      req.params.id,
      {
        nombre,
        codigo,
        creditos,
        semestre,
        descripcion,
        cupoMaximo,
        activa
      },
      { new: true, runValidators: true }
    ).populate('semestre', 'nombre numero orden');
    
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    // Registrar actividad para todos los usuarios (actualización global)
    const ActividadService = require('../services/actividadService');
    const Usuario = require('../models/Usuario');
    
    // Obtener todos los usuarios para registrar la actividad
    const usuarios = await Usuario.find({}, '_id');
    
    for (const usuario of usuarios) {
      try {
        await ActividadService.registrarActualizacionMateria(
          materia._id,
          usuario._id,
          {
            nombre: materia.nombre,
            codigo: materia.codigo,
            creditos: materia.creditos,
            cambios: {
              nombre: materiaOriginal?.nombre !== nombre ? { anterior: materiaOriginal?.nombre, nuevo: nombre } : null,
              codigo: materiaOriginal?.codigo !== codigo ? { anterior: materiaOriginal?.codigo, nuevo: codigo } : null,
              creditos: materiaOriginal?.creditos !== creditos ? { anterior: materiaOriginal?.creditos, nuevo: creditos } : null
            }
          },
          req
        );
      } catch (error) {
        console.error('Error registrando actividad para usuario:', usuario._id, error);
      }
    }
    
    res.json(materia);
  } catch (error) {
    console.error('Error actualizando materia:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// API: Eliminar materia
router.delete('/api/materias/:id', async (req, res) => {
  try {
    const materiaId = req.params.id;
    
    // Verificar que la materia existe
    const materia = await Materia.findById(materiaId);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    
    console.log(`🗑️ Eliminando materia: ${materia.nombre} (${materia.codigo})`);
    
    // Eliminar todas las previas asociadas a esta materia
    // 1. Previas donde esta materia es la materia principal
    const previasEliminadas1 = await Previa.deleteMany({ materia: materiaId });
    console.log(`🗑️ Previas eliminadas (como materia principal): ${previasEliminadas1.deletedCount}`);
    
    // 2. Previas donde esta materia es requerida por otras materias
    const previasEliminadas2 = await Previa.deleteMany({ materiaRequerida: materiaId });
    console.log(`🗑️ Previas eliminadas (como materia requerida): ${previasEliminadas2.deletedCount}`);
    
    // Eliminar la materia
    await Materia.findByIdAndDelete(materiaId);
    
    const totalPreviasEliminadas = previasEliminadas1.deletedCount + previasEliminadas2.deletedCount;
    console.log(`✅ Materia eliminada exitosamente. Total de previas eliminadas: ${totalPreviasEliminadas}`);
    
    res.json({ 
      message: 'Materia eliminada correctamente',
      previasEliminadas: totalPreviasEliminadas
    });
  } catch (error) {
    console.error('Error eliminando materia:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});



// ===== GESTIÓN DE SEMESTRES =====

// Lista de semestres (vista)
router.get('/semestres', async (req, res) => {
  try {
    console.log('🔄 Cargando vista de semestres...');
    
    const semestres = await Semestre.find({})
      .populate('materias', 'nombre codigo creditos')
      .sort({ orden: 1 });
    
    console.log(`✅ Semestres encontrados: ${semestres.length}`);
    
    res.render('admin/semestres', {
      title: 'Gestión de Semestres',
      usuario: req.usuario,
      semestres: semestres
    });
  } catch (error) {
    console.error('❌ Error cargando semestres:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener todos los semestres
router.get('/api/semestres', async (req, res) => {
  try {
    console.log('🔄 API: Cargando semestres...');
    const semestres = await Semestre.find({})
      .populate('materias', 'nombre codigo creditos')
      .sort({ orden: 1 });
    
    console.log(`✅ API: Semestres encontrados: ${semestres.length}`);
    res.json(semestres);
  } catch (error) {
    console.error('❌ API: Error cargando semestres:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Obtener semestre por ID
router.get('/api/semestres/:id', async (req, res) => {
  try {
    console.log('🔄 API: Obteniendo semestre:', req.params.id);
    
    const semestre = await Semestre.findById(req.params.id)
      .populate('materias', 'nombre codigo creditos');
    
    if (!semestre) {
      return res.status(404).json({ error: 'Semestre no encontrado' });
    }
    
    console.log('✅ API: Semestre encontrado:', semestre.nombre);
    res.json(semestre);
  } catch (error) {
    console.error('❌ API: Error obteniendo semestre:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Crear nuevo semestre
router.post('/api/semestres', async (req, res) => {
  try {
    const { numero, nombre, descripcion, orden, creditosRequeridos, activo } = req.body;
    
    console.log('📝 Datos recibidos para crear semestre:', {
      numero,
      nombre,
      descripcion,
      orden,
      creditosRequeridos,
      activo
    });
    
    // Validar que se envíen los datos necesarios
    if (!numero || !nombre || !orden) {
      return res.status(400).json({ error: 'Número, nombre y orden son requeridos' });
    }
    
    // Verificar que el número de semestre no exista
    const semestreExistente = await Semestre.findOne({ numero });
    if (semestreExistente) {
      return res.status(400).json({ error: 'Ya existe un semestre con ese número' });
    }
    
    // Verificar que el orden no exista
    const ordenExistente = await Semestre.findOne({ orden });
    if (ordenExistente) {
      return res.status(400).json({ error: 'Ya existe un semestre con ese orden' });
    }
    
    const nuevoSemestre = new Semestre({
      numero: parseInt(numero),
      nombre,
      descripcion: descripcion || '',
      orden: parseInt(orden),
      creditosRequeridos: parseInt(creditosRequeridos) || 0,
      activo: activo !== undefined ? activo : true,
      materias: []
    });
    
    await nuevoSemestre.save();
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('nuevo-semestre', {
        mensaje: 'Nuevo semestre creado',
        semestre: {
          nombre: nuevoSemestre.nombre,
          numero: nuevoSemestre.numero
        }
      });
    }
    
    console.log('🎉 Semestre creado exitosamente:', nuevoSemestre.nombre);
    res.status(201).json(nuevoSemestre);
  } catch (error) {
    console.error('❌ Error creando semestre:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Actualizar semestre
router.put('/api/semestres/:id', async (req, res) => {
  try {
    const { numero, nombre, descripcion, orden, creditosRequeridos, activo } = req.body;
    const semestreId = req.params.id;
    
    console.log('🔄 Actualizando semestre:', semestreId);
    console.log('📝 Datos recibidos:', { numero, nombre, descripcion, orden, creditosRequeridos, activo });
    
    // Verificar que el semestre existe
    const semestreExistente = await Semestre.findById(semestreId);
    if (!semestreExistente) {
      return res.status(404).json({ error: 'Semestre no encontrado' });
    }
    
    // Verificar que el número de semestre no exista en otro semestre
    if (numero && numero !== semestreExistente.numero) {
      const numeroExistente = await Semestre.findOne({ numero, _id: { $ne: semestreId } });
      if (numeroExistente) {
        return res.status(400).json({ error: 'Ya existe otro semestre con ese número' });
      }
    }
    
    // Verificar que el orden no exista en otro semestre
    if (orden && orden !== semestreExistente.orden) {
      const ordenExistente = await Semestre.findOne({ orden, _id: { $ne: semestreId } });
      if (ordenExistente) {
        return res.status(400).json({ error: 'Ya existe otro semestre con ese orden' });
      }
    }
    
    const semestre = await Semestre.findByIdAndUpdate(
      semestreId,
      {
        numero: numero ? parseInt(numero) : semestreExistente.numero,
        nombre: nombre || semestreExistente.nombre,
        descripcion: descripcion !== undefined ? descripcion : semestreExistente.descripcion,
        orden: orden ? parseInt(orden) : semestreExistente.orden,
        creditosRequeridos: creditosRequeridos !== undefined ? parseInt(creditosRequeridos) : semestreExistente.creditosRequeridos,
        activo: activo !== undefined ? activo : semestreExistente.activo
      },
      { new: true, runValidators: true }
    ).populate('materias', 'nombre codigo creditos');
    
    if (!semestre) {
      return res.status(404).json({ error: 'Semestre no encontrado' });
    }
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('semestre-actualizado', {
        mensaje: 'Semestre actualizado',
        semestre: {
          nombre: semestre.nombre,
          numero: semestre.numero
        }
      });
    }
    
    console.log('✅ Semestre actualizado exitosamente:', semestre.nombre);
    res.json(semestre);
  } catch (error) {
    console.error('❌ Error actualizando semestre:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Toggle estado de semestre
router.put('/api/semestres/toggle/:id', async (req, res) => {
  try {
    const { activa } = req.body;
    const semestreId = req.params.id;
    
    console.log('🔄 Cambiando estado de semestre:', semestreId, 'a:', activa);
    
    const semestre = await Semestre.findByIdAndUpdate(
      semestreId,
      { activo: activa },
      { new: true, runValidators: true }
    ).populate('materias', 'nombre codigo creditos');
    
    if (!semestre) {
      return res.status(404).json({ error: 'Semestre no encontrado' });
    }
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('semestre-toggle', {
        mensaje: `Semestre ${activa ? 'activado' : 'desactivado'}`,
        semestre: {
          nombre: semestre.nombre,
          numero: semestre.numero
        },
        activo: activa
      });
    }
    
    console.log(`✅ Semestre ${activa ? 'activado' : 'desactivado'}:`, semestre.nombre);
    
    res.json({ 
      message: `Semestre ${activa ? 'activado' : 'desactivado'} correctamente`,
      semestre
    });
  } catch (error) {
    console.error('❌ Error cambiando estado de semestre:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Eliminar semestre
router.delete('/api/semestres/:id', async (req, res) => {
  try {
    const semestreId = req.params.id;
    
    console.log('🗑️ Eliminando semestre:', semestreId);
    
    // Verificar que el semestre existe
    const semestre = await Semestre.findById(semestreId);
    if (!semestre) {
      return res.status(404).json({ error: 'Semestre no encontrado' });
    }
    
    // Verificar si tiene materias asignadas
    if (semestre.materias && semestre.materias.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un semestre que tiene materias asignadas',
        materias: semestre.materias.length
      });
    }
    
    await Semestre.findByIdAndDelete(semestreId);
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('semestre-eliminado', {
        mensaje: 'Semestre eliminado',
        semestre: {
          nombre: semestre.nombre,
          numero: semestre.numero
        }
      });
    }
    
    console.log('✅ Semestre eliminado exitosamente:', semestre.nombre);
    
    res.json({ 
      message: 'Semestre eliminado correctamente',
      semestre: {
        nombre: semestre.nombre,
        numero: semestre.numero
      }
    });
  } catch (error) {
    console.error('❌ Error eliminando semestre:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== GESTIÓN DE PREVIAS =====

// Lista de previas
router.get('/previas', async (req, res) => {
  try {
    console.log('🔄 Cargando vista de previas...');
    
    // Obtener previas con populate completo
    const previas = await Previa.find({})
      .populate({
        path: 'materia',
        select: 'nombre codigo semestre',
        populate: {
          path: 'semestre',
          select: 'nombre numero orden'
        }
      })
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ materia: 1 });
    
    console.log(`✅ Previas encontradas: ${previas.length}`);
    
    // Filtrar previas con referencias válidas
    const previasValidas = [];
    
    for (const previa of previas) {
      // Verificar que tanto la materia como la materia requerida existen
      if (!previa.materia || !previa.materiaRequerida) {
        console.log(`❌ Previa con referencia rota eliminada - ID: ${previa._id}`);
        // Eliminar la previa con referencia rota
        await Previa.findByIdAndDelete(previa._id);
        continue;
      }
      
      previasValidas.push(previa);
    }
    
    console.log(`✅ Previas válidas después del filtrado: ${previasValidas.length}`);
    console.log('🔍 Primera previa con semestre:', previasValidas[0]?.materia?.semestre);
    
    res.render('admin/previas', {
      title: 'Gestión de Previas',
      usuario: req.usuario,
      previas: previasValidas
    });
  } catch (error) {
    console.error('❌ Error cargando previas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener todas las previas
router.get('/api/previas', async (req, res) => {
  try {
    console.log('🔄 API: Intentando cargar previas...');
    
    // Obtener previas con populate completo
    const previas = await Previa.find({})
      .populate({
        path: 'materia',
        select: 'nombre codigo semestre',
        populate: {
          path: 'semestre',
          select: 'nombre numero orden'
        }
      })
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ materia: 1 });
    
    console.log(`✅ API: Previas encontradas: ${previas.length}`);
    
    // Filtrar previas con referencias válidas
    const previasValidas = [];
    const semestresCache = new Map(); // Cache para semestres
    
    for (const previa of previas) {
      // Verificar que tanto la materia como la materia requerida existen
      if (!previa.materia || !previa.materiaRequerida) {
        console.log(`❌ API: Previa con referencia rota eliminada - ID: ${previa._id}`);
        // Eliminar la previa con referencia rota
        await Previa.findByIdAndDelete(previa._id);
        continue;
      }
      
      // Hacer populate del semestre si existe (con cache)
      if (previa.materia.semestre) {
        try {
          let semestre;
          if (semestresCache.has(previa.materia.semestre)) {
            semestre = semestresCache.get(previa.materia.semestre);
          } else {
            semestre = await Semestre.findById(previa.materia.semestre);
            if (semestre) {
              semestresCache.set(previa.materia.semestre, semestre);
            }
          }
          
          if (semestre) {
            previa.materia.semestre = semestre;
          }
        } catch (error) {
          console.error(`❌ API: Error populando semestre para ${previa.materia.nombre}:`, error);
        }
      }
      
      previasValidas.push(previa);
    }
    
    console.log(`✅ API: Previas válidas después del filtrado: ${previasValidas.length}`);
    console.log('🔍 API: Primera previa con semestre:', previasValidas[0]?.materia?.semestre);
    
    res.json(previasValidas);
  } catch (error) {
    console.error('❌ API: Error cargando previas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Obtener previas por materia
router.get('/api/previas/materia/:id', async (req, res) => {
  try {
    console.log('🔄 API: Obteniendo previas para materia:', req.params.id);
    
    const previas = await Previa.find({ materia: req.params.id })
      .populate('materia', 'nombre codigo semestre')
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ createdAt: 1 });
    
    console.log(`✅ API: Previas encontradas para materia: ${previas.length}`);
    
    if (previas.length === 0) {
      return res.status(404).json({ error: 'No se encontraron previas para esta materia' });
    }
    
    // Hacer populate manual del semestre de cada materia
    const previasConSemestre = await Promise.all(
      previas.map(async (previa) => {
        if (previa.materia && previa.materia.semestre) {
          try {
            const semestre = await Semestre.findById(previa.materia.semestre);
            if (semestre) {
              previa.materia.semestre = semestre;
            }
          } catch (error) {
            console.error(`❌ Error populando semestre:`, error);
          }
        }
        return previa;
      })
    );
    
    // Retornar todas las previas (para edición)
    res.json(previasConSemestre);
  } catch (error) {
    console.error('❌ API: Error obteniendo previas por materia:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Crear nueva previa
router.post('/api/previas', async (req, res) => {
  try {
    const { materia, materiasRequeridas, activa } = req.body;
    
    console.log('📝 Datos recibidos para crear previa:', {
      materia,
      materiasRequeridas,
      activa
    });
    
    // Validar que se envíen los datos necesarios
    if (!materia) {
      return res.status(400).json({ error: 'La materia es requerida' });
    }
    
    if (!materiasRequeridas || !Array.isArray(materiasRequeridas) || materiasRequeridas.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos una materia requerida' });
    }
    
    // Crear una previa por cada materia requerida
    const previasCreadas = [];
    
    for (const materiaReq of materiasRequeridas) {
      console.log('🔄 Creando previa para:', materiaReq);
      
      const nuevaPrevia = new Previa({
        materia,
        materiaRequerida: materiaReq.materiaId,
        tipo: materiaReq.tipo || 'curso_aprobado',
        activa: activa !== undefined ? activa : true,
        creadoPor: req.usuario._id
      });
      
      await nuevaPrevia.save();
      
      // Populate para obtener los nombres
      await nuevaPrevia.populate('materia', 'nombre codigo');
      await nuevaPrevia.populate('materiaRequerida', 'nombre codigo');
      
      previasCreadas.push(nuevaPrevia);
      console.log('✅ Previa creada:', nuevaPrevia);
    }
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.emit('nueva-previa', {
        materia: {
          nombre: previasCreadas[0]?.materia?.nombre
        },
        previas: previasCreadas.map(p => ({
          nombre: p.materiaRequerida?.nombre,
          tipo: p.tipo
        }))
      });
    }
    
    console.log('🎉 Previas creadas exitosamente:', previasCreadas.length);
    res.status(201).json(previasCreadas);
  } catch (error) {
    console.error('❌ Error creando previa:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Actualizar previa
router.patch('/api/previas/:id', async (req, res) => {
  try {
    const { activa } = req.body;
    
    const previa = await Previa.findByIdAndUpdate(
      req.params.id,
      { activa },
      { new: true, runValidators: true }
    ).populate('materia', 'nombre codigo').populate('materiaRequerida', 'nombre codigo');
    
    if (!previa) {
      return res.status(404).json({ error: 'Previa no encontrada' });
    }
    
    res.json(previa);
  } catch (error) {
    console.error('Error actualizando previa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Actualizar todas las previas de una materia
router.put('/api/previas/materia/:id', async (req, res) => {
  try {
    const { materiasRequeridas, activa } = req.body;
    const materiaId = req.params.id;
    
    console.log('🔄 Actualizando previas para materia:', materiaId);
    console.log('📝 Datos recibidos:', { materiasRequeridas, activa });
    
    // Validar que se envíen los datos necesarios
    if (!materiasRequeridas || !Array.isArray(materiasRequeridas)) {
      return res.status(400).json({ error: 'Debe proporcionar las materias requeridas' });
    }
    
    // Eliminar todas las previas existentes de esta materia
    await Previa.deleteMany({ materia: materiaId });
    console.log('🗑️ Previas existentes eliminadas');
    
    // Crear nuevas previas
    const previasCreadas = [];
    
    for (const materiaReq of materiasRequeridas) {
      console.log('🔄 Creando previa para:', materiaReq);
      
      const nuevaPrevia = new Previa({
        materia: materiaId,
        materiaRequerida: materiaReq.materiaId,
        tipo: materiaReq.tipo || 'curso_aprobado',
        activa: activa !== undefined ? activa : true,
        creadoPor: req.usuario._id
      });
      
      await nuevaPrevia.save();
      
      // Populate para obtener los nombres
      await nuevaPrevia.populate('materia', 'nombre codigo');
      await nuevaPrevia.populate('materiaRequerida', 'nombre codigo');
      
      previasCreadas.push(nuevaPrevia);
      console.log('✅ Previa creada:', nuevaPrevia);
    }
    
    console.log('🎉 Previas actualizadas exitosamente:', previasCreadas.length);
    res.json(previasCreadas);
  } catch (error) {
    console.error('❌ Error actualizando previas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Eliminar previa individual
router.delete('/api/previas/:id', async (req, res) => {
  try {
    const previa = await Previa.findByIdAndDelete(req.params.id);
    
    if (!previa) {
      return res.status(404).json({ error: 'Previa no encontrada' });
    }
    
    res.json({ message: 'Previa eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando previa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Eliminar todas las previas de una materia
router.delete('/api/previas/materia/:materiaId', async (req, res) => {
  try {
    const { materiaId } = req.params;
    
    console.log('🗑️ Eliminando todas las previas de la materia:', materiaId);
    
    // Eliminar todas las previas de esta materia
    const resultado = await Previa.deleteMany({ materia: materiaId });
    
    console.log(`✅ Previas eliminadas: ${resultado.deletedCount}`);
    
    res.json({ 
      message: 'Previas eliminadas correctamente',
      previasEliminadas: resultado.deletedCount
    });
  } catch (error) {
    console.error('Error eliminando previas de la materia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Toggle estado de todas las previas de una materia
router.put('/api/previas/toggle/:materiaId', async (req, res) => {
  try {
    const { materiaId } = req.params;
    const { activa } = req.body;
    
    console.log('🔄 Cambiando estado de previas para materia:', materiaId, 'a:', activa);
    
    // Actualizar todas las previas de esta materia
    const resultado = await Previa.updateMany(
      { materia: materiaId },
      { activa: activa }
    );
    
    console.log(`✅ Previas actualizadas: ${resultado.modifiedCount}`);
    
    res.json({ 
      message: `Previas ${activa ? 'activadas' : 'desactivadas'} correctamente`,
      previasActualizadas: resultado.modifiedCount
    });
  } catch (error) {
    console.error('Error cambiando estado de previas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Limpiar previas huérfanas (previas con referencias rotas)
router.post('/api/previas/limpiar-huerfanas', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpieza de previas huérfanas...');
    
    // Obtener todas las previas
    const previas = await Previa.find({})
      .populate('materia', 'nombre codigo')
      .populate('materiaRequerida', 'nombre codigo');
    
    let previasEliminadas = 0;
    const previasEliminadasDetalle = [];
    
    for (const previa of previas) {
      // Verificar si alguna de las referencias está rota
      if (!previa.materia || !previa.materiaRequerida) {
        console.log(`🗑️ Eliminando previa huérfana - ID: ${previa._id}`);
        
        // Guardar información antes de eliminar
        previasEliminadasDetalle.push({
          id: previa._id,
          materia: previa.materia ? `${previa.materia.nombre} (${previa.materia.codigo})` : 'REFERENCIA ROTA',
          materiaRequerida: previa.materiaRequerida ? `${previa.materiaRequerida.nombre} (${previa.materiaRequerida.codigo})` : 'REFERENCIA ROTA'
        });
        
        await Previa.findByIdAndDelete(previa._id);
        previasEliminadas++;
      }
    }
    
    console.log(`✅ Limpieza completada. Previas eliminadas: ${previasEliminadas}`);
    
    res.json({
      message: 'Limpieza de previas huérfanas completada',
      previasEliminadas,
      detalle: previasEliminadasDetalle
    });
  } catch (error) {
    console.error('❌ Error limpiando previas huérfanas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// ===== ESTADÍSTICAS =====

// API: Obtener estadísticas del sistema
router.get('/api/estadisticas', async (req, res) => {
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const usuariosActivos = await Usuario.countDocuments({ activo: true });
    const totalMaterias = await Materia.countDocuments();
    const totalPrevias = await Previa.countDocuments();
    
    // Distribución de usuarios por rol
    const estudiantes = await Usuario.countDocuments({ rol: 'estudiante' });
    const administradores = await Usuario.countDocuments({ rol: 'administrador' });
    
    res.json({
      totalUsuarios,
      usuariosActivos,
      totalMaterias,
      totalPrevias,
      distribucionUsuarios: {
        estudiantes,
        administradores
      }
    });
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener actividad reciente
router.get('/api/actividad-reciente', async (req, res) => {
  try {
    console.log('Cargando actividad reciente...');
    const actividades = [];
    
    // Obtener usuarios recientes (últimos 5)
    const usuariosRecientes = await Usuario.find({})
      .select('nombre apellido rol createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('Usuarios encontrados:', usuariosRecientes.length);
    
    // Obtener materias recientes (últimas 3)
    let materiasRecientes = [];
    try {
      materiasRecientes = await Materia.find({})
        .select('nombre codigo createdAt')
        .sort({ createdAt: -1 })
        .limit(3);
      console.log('Materias encontradas:', materiasRecientes.length);
    } catch (error) {
      console.log('Error cargando materias (puede que no existan):', error.message);
    }
    
    // Obtener previas recientes (últimas 3)
    let previasRecientes = [];
    try {
      previasRecientes = await Previa.find({})
        .populate('materia', 'nombre codigo')
        .populate('materiaRequerida', 'nombre codigo')
        .select('materia materiaRequerida createdAt')
        .sort({ createdAt: -1 })
        .limit(3);
      console.log('Previas encontradas:', previasRecientes.length);
    } catch (error) {
      console.log('Error cargando previas (puede que no existan):', error.message);
    }
    
    // Agregar actividades de usuarios
    usuariosRecientes.forEach(usuario => {
      actividades.push({
        tipo: 'usuario',
        titulo: 'Nuevo usuario registrado',
        descripcion: `${usuario.nombre} ${usuario.apellido} se registró como ${usuario.rol}`,
        fecha: usuario.createdAt,
        icono: 'user-plus',
        color: 'indigo'
      });
    });
    
    // Agregar actividades de materias
    materiasRecientes.forEach(materia => {
      actividades.push({
        tipo: 'materia',
        titulo: 'Nueva materia creada',
        descripcion: `${materia.nombre} (${materia.codigo}) fue agregada`,
        fecha: materia.createdAt,
        icono: 'book',
        color: 'emerald'
      });
    });
    
    // Agregar actividades de previas
    previasRecientes.forEach(previa => {
      if (previa.materia && previa.materiaRequerida) {
        actividades.push({
          tipo: 'previa',
          titulo: 'Nueva previa configurada',
          descripcion: `${previa.materia.nombre} requiere ${previa.materiaRequerida.nombre}`,
          fecha: previa.createdAt,
          icono: 'link',
          color: 'amber'
        });
      }
    });
    
    // Ordenar por fecha (más reciente primero) y tomar solo 5
    actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const actividadReciente = actividades.slice(0, 5);
    
    console.log('Actividades totales:', actividadReciente.length);
    res.json(actividadReciente);
  } catch (error) {
    console.error('Error cargando actividad reciente:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// API: Obtener últimos accesos de usuarios
router.get('/api/ultimos-accesos', async (req, res) => {
  try {
    console.log('🔄 Cargando últimos accesos de usuarios...');
    
    // Obtener usuarios ordenados por último acceso (más reciente primero)
    const usuarios = await Usuario.find({ activo: true })
      .select('nombre apellido email rol ultimoAcceso')
      .sort({ ultimoAcceso: -1 })
      .limit(10);
    
    console.log(`✅ Usuarios encontrados: ${usuarios.length}`);
    
    // Formatear datos para el frontend
    const ultimosAccesos = usuarios.map(usuario => {
      const ahora = new Date();
      const ultimoAcceso = new Date(usuario.ultimoAcceso);
      const diferenciaMs = ahora - ultimoAcceso;
      const diferenciaMinutos = Math.floor(diferenciaMs / (1000 * 60));
      const diferenciaHoras = Math.floor(diferenciaMs / (1000 * 60 * 60));
      const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
      
      let tiempoTranscurrido;
      if (diferenciaMinutos < 60) {
        tiempoTranscurrido = diferenciaMinutos <= 1 ? 'Hace un momento' : `Hace ${diferenciaMinutos} minutos`;
      } else if (diferenciaHoras < 24) {
        tiempoTranscurrido = diferenciaHoras === 1 ? 'Hace 1 hora' : `Hace ${diferenciaHoras} horas`;
      } else {
        tiempoTranscurrido = diferenciaDias === 1 ? 'Hace 1 día' : `Hace ${diferenciaDias} días`;
      }
      
      return {
        id: usuario._id,
        nombre: `${usuario.nombre} ${usuario.apellido}`,
        email: usuario.email,
        rol: usuario.rol,
        ultimoAcceso: ultimoAcceso,
        tiempoTranscurrido: tiempoTranscurrido,
        esReciente: diferenciaMinutos < 30 // Marcar como reciente si fue hace menos de 30 minutos
      };
    });
    
    res.json(ultimosAccesos);
  } catch (error) {
    console.error('❌ Error cargando últimos accesos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== GESTIÓN DE ACTIVIDAD MENSUAL =====

// API: Obtener estadísticas del mes actual
router.get('/api/actividad-mensual', async (req, res) => {
  try {
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1;
    const año = fechaActual.getFullYear();
    
    console.log(`📊 Obteniendo estadísticas mensuales para ${mes}/${año}`);
    
    const estadisticas = await obtenerEstadisticasGlobales(mes, año);
    
    if (!estadisticas) {
      return res.json({
        mes: mes,
        año: año,
        totalUsuariosActivos: 0,
        totalActividades: 0,
        actividadesPorTipo: {},
        usuariosMasActivos: [],
        tiempoTotalSesion: 0
      });
    }
    
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas mensuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener estadísticas de un mes específico
router.get('/api/actividad-mensual/:mes/:año', async (req, res) => {
  try {
    const { mes, año } = req.params;
    const mesNum = parseInt(mes);
    const añoNum = parseInt(año);
    
    console.log(`📊 Obteniendo estadísticas para ${mesNum}/${añoNum}`);
    
    const estadisticas = await obtenerEstadisticasGlobales(mesNum, añoNum);
    
    if (!estadisticas) {
      return res.json({
        mes: mesNum,
        año: añoNum,
        totalUsuariosActivos: 0,
        totalActividades: 0,
        actividadesPorTipo: {},
        usuariosMasActivos: [],
        tiempoTotalSesion: 0
      });
    }
    
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas mensuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener estadísticas históricas (últimos N meses)
router.get('/api/actividad-historica', async (req, res) => {
  try {
    const meses = parseInt(req.query.meses) || 6;
    
    console.log(`📊 Obteniendo estadísticas históricas de los últimos ${meses} meses`);
    
    const estadisticas = await obtenerEstadisticasHistoricas(meses);
    
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas históricas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener estadísticas de un usuario específico
router.get('/api/actividad-usuario/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { mes, año } = req.query;
    
    const fechaActual = new Date();
    const mesNum = mes ? parseInt(mes) : fechaActual.getMonth() + 1;
    const añoNum = año ? parseInt(año) : fechaActual.getFullYear();
    
    console.log(`📊 Obteniendo estadísticas del usuario ${usuarioId} para ${mesNum}/${añoNum}`);
    
    const estadisticas = await obtenerEstadisticasUsuario(usuarioId, mesNum, añoNum);
    
    if (!estadisticas) {
      return res.status(404).json({ error: 'Estadísticas no encontradas' });
    }
    
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener resumen de actividad para el dashboard
router.get('/api/dashboard-actividad', async (req, res) => {
  try {
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const añoActual = fechaActual.getFullYear();
    
    console.log('📊 Obteniendo resumen de actividad para dashboard');
    
    // Obtener estadísticas del mes actual
    const estadisticasActuales = await obtenerEstadisticasGlobales(mesActual, añoActual);
    
    // Obtener estadísticas del mes anterior para comparación
    const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
    const añoAnterior = mesActual === 1 ? añoActual - 1 : añoActual;
    const estadisticasAnteriores = await obtenerEstadisticasGlobales(mesAnterior, añoAnterior);
    
    // Obtener estadísticas históricas de los últimos 6 meses
    const estadisticasHistoricas = await obtenerEstadisticasHistoricas(6);
    
    console.log('📊 Estadísticas actuales:', estadisticasActuales);
    console.log('📊 Estadísticas históricas:', estadisticasHistoricas);
    
    // Calcular tendencias
    const tendencias = {
      usuarios: {
        actual: estadisticasActuales?.totalUsuariosActivos || 0,
        anterior: estadisticasAnteriores?.totalUsuariosActivos || 0,
        cambio: 0
      },
      actividades: {
        actual: estadisticasActuales?.totalActividades || 0,
        anterior: estadisticasAnteriores?.totalActividades || 0,
        cambio: 0
      }
    };
    
    // Calcular porcentajes de cambio
    if (tendencias.usuarios.anterior > 0) {
      tendencias.usuarios.cambio = Math.round(((tendencias.usuarios.actual - tendencias.usuarios.anterior) / tendencias.usuarios.anterior) * 100);
    }
    
    if (tendencias.actividades.anterior > 0) {
      tendencias.actividades.cambio = Math.round(((tendencias.actividades.actual - tendencias.actividades.anterior) / tendencias.actividades.anterior) * 100);
    }
    
    // Si no hay datos históricos, generar datos de ejemplo
    let datosParaEnviar = {
      mesActual: {
        mes: mesActual,
        año: añoActual,
        estadisticas: estadisticasActuales || {
          totalUsuariosActivos: 0,
          totalActividades: 0,
          actividadesPorTipo: {},
          usuariosMasActivos: [],
          tiempoTotalSesion: 0
        }
      },
      tendencias,
      historico: estadisticasHistoricas
    };
    
    // Si no hay datos históricos, crear datos de ejemplo
    if (!estadisticasHistoricas || estadisticasHistoricas.length === 0) {
      console.log('📊 No hay datos históricos, generando datos de ejemplo...');
      datosParaEnviar.historico = generarDatosEjemploHistoricos();
    }
    
    console.log('📊 Datos finales para enviar:', datosParaEnviar);
    res.json(datosParaEnviar);
  } catch (error) {
    console.error('❌ Error obteniendo resumen de actividad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función para generar datos de ejemplo históricos
function generarDatosEjemploHistoricos() {
  const fechaActual = new Date();
  const datosEjemplo = [];
  
  for (let i = 5; i >= 0; i--) {
    const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear();
    
    // Generar datos aleatorios pero realistas
    const usuariosActivos = Math.floor(Math.random() * 10) + 1;
    const totalActividades = Math.floor(Math.random() * 50) + usuariosActivos;
    
    datosEjemplo.push({
      mes: mes,
      año: año,
      totalUsuariosActivos: usuariosActivos,
      totalActividades: totalActividades,
      actividadesPorTipo: {
        logins: Math.floor(Math.random() * 20) + 5,
        logouts: Math.floor(Math.random() * 18) + 3,
        materiasConsultadas: Math.floor(Math.random() * 15) + 2,
        previasConsultadas: Math.floor(Math.random() * 10) + 1,
        semestresConsultados: Math.floor(Math.random() * 8) + 1,
        perfilActualizado: Math.floor(Math.random() * 5),
        tiempoTotalSesion: Math.floor(Math.random() * 200) + 50
      },
      usuariosMasActivos: [],
      tiempoTotalSesion: Math.floor(Math.random() * 200) + 50
    });
  }
  
  console.log('📊 Datos de ejemplo generados:', datosEjemplo);
  return datosEjemplo;
}

// ===== GESTIÓN DE PERFIL DE ADMINISTRADOR =====

// Vista del perfil de administrador
router.get('/perfil', async (req, res) => {
  try {
    console.log('🔄 Cargando perfil de administrador...');
    
    // Obtener datos actualizados del usuario
    const usuario = await Usuario.findById(req.usuario._id)
      .select('-password -googleId -tokens');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('✅ Perfil cargado:', usuario.email);
    
    res.render('admin/perfil', {
      title: 'Mi Perfil',
      usuario: usuario
    });
  } catch (error) {
    console.error('❌ Error cargando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener perfil del administrador
router.get('/api/perfil', async (req, res) => {
  try {
    console.log('🔄 API: Obteniendo perfil de administrador...');
    
    const usuario = await Usuario.findById(req.usuario._id)
      .select('-password -googleId -tokens');
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('✅ API: Perfil obtenido:', usuario.email);
    res.json(usuario);
  } catch (error) {
    console.error('❌ API: Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Actualizar perfil del administrador
router.put('/api/perfil', async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, biografia, notificacionesEmail, modoOscuro } = req.body;
    const usuarioId = req.usuario._id;
    
    console.log('🔄 Actualizando perfil de administrador:', usuarioId);
    console.log('📝 Datos recibidos:', { nombre, apellido, email, telefono, biografia, notificacionesEmail, modoOscuro });
    
    // Validar datos requeridos
    if (!nombre || !apellido || !email) {
      return res.status(400).json({ error: 'Nombre, apellido y email son requeridos' });
    }
    
    // Verificar si el email ya existe en otro usuario
    if (email !== req.usuario.email) {
      const emailExistente = await Usuario.findOne({ 
        email: email, 
        _id: { $ne: usuarioId } 
      });
      
      if (emailExistente) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }
    
    // Actualizar usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      usuarioId,
      {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono ? telefono.trim() : undefined,
        biografia: biografia ? biografia.trim() : undefined,
        notificacionesEmail: notificacionesEmail || false,
        modoOscuro: modoOscuro || false
      },
      { new: true, runValidators: true }
    ).select('-password -googleId -tokens');
    
    if (!usuarioActualizado) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('perfil-actualizado', {
        mensaje: 'Perfil actualizado',
        usuario: {
          id: usuarioActualizado._id,
          nombre: usuarioActualizado.nombre,
          apellido: usuarioActualizado.apellido,
          email: usuarioActualizado.email
        }
      });
    }
    
    console.log('✅ Perfil actualizado exitosamente:', usuarioActualizado.email);
    res.json({ 
      message: 'Perfil actualizado correctamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Cambiar contraseña del administrador
router.post('/api/cambiar-contraseña', async (req, res) => {
  try {
    const { contraseñaActual, nuevaContraseña } = req.body;
    const usuarioId = req.usuario._id;
    
    console.log('🔄 Cambiando contraseña de administrador:', usuarioId);
    
    // Validar datos requeridos
    if (!contraseñaActual || !nuevaContraseña) {
      return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
    }
    
    // Validar fortaleza de la nueva contraseña
    if (nuevaContraseña.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    
    if (!/[A-Z]/.test(nuevaContraseña)) {
      return res.status(400).json({ error: 'La nueva contraseña debe contener al menos una letra mayúscula' });
    }
    
    if (!/[a-z]/.test(nuevaContraseña)) {
      return res.status(400).json({ error: 'La nueva contraseña debe contener al menos una letra minúscula' });
    }
    
    if (!/\d/.test(nuevaContraseña)) {
      return res.status(400).json({ error: 'La nueva contraseña debe contener al menos un número' });
    }
    
    // Obtener usuario con contraseña
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const contraseñaValida = await usuario.compararPassword(contraseñaActual);
    if (!contraseñaValida) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
    
    // Actualizar contraseña
    usuario.password = nuevaContraseña;
    await usuario.save();
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.to('admin').emit('contraseña-cambiada', {
        mensaje: 'Contraseña cambiada',
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email
        }
      });
    }
    
    console.log('✅ Contraseña cambiada exitosamente para:', usuario.email);
    res.json({ 
      message: 'Contraseña cambiada correctamente'
    });
  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// API: Obtener estadísticas de actividad del administrador
router.get('/api/perfil/actividad', async (req, res) => {
  try {
    const usuarioId = req.usuario._id;
    const { mes, año } = req.query;
    
    const fechaActual = new Date();
    const mesNum = mes ? parseInt(mes) : fechaActual.getMonth() + 1;
    const añoNum = año ? parseInt(año) : fechaActual.getFullYear();
    
    console.log(`📊 Obteniendo actividad del administrador ${usuarioId} para ${mesNum}/${añoNum}`);
    
    // Obtener estadísticas de actividad mensual
    const ActividadMensual = require('../models/ActividadMensual');
    const { obtenerEstadisticasUsuario } = require('../middleware/actividadMensual');
    
    const estadisticas = await obtenerEstadisticasUsuario(usuarioId, mesNum, añoNum);
    
    if (!estadisticas) {
      return res.json({
        mes: mesNum,
        año: añoNum,
        totalActividades: 0,
        actividades: {},
        ultimaActividad: null
      });
    }
    
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo actividad del administrador:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
