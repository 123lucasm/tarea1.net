const express = require('express');
const router = express.Router();
const { checkAdmin, checkAdminAPI } = require('../middleware/adminAuth');

// Importar modelos en el orden correcto para evitar problemas de dependencias
const Semestre = require('../models/Semestre');
const Materia = require('../models/Materia');
const Usuario = require('../models/Usuario');
const Previa = require('../models/Previa');

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



// API: Obtener todos los semestres
router.get('/api/semestres', async (req, res) => {
  try {
    console.log('Cargando semestres...');
    const semestres = await Semestre.find({ activo: true })
      .sort({ orden: 1 });
    
    console.log(`Semestres encontrados: ${semestres.length}`);
    res.json(semestres);
  } catch (error) {
    console.error('Error cargando semestres:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// ===== GESTIÓN DE PREVIAS =====

// Lista de previas
router.get('/previas', async (req, res) => {
  try {
    console.log('🔄 Cargando vista de previas...');
    
    // Obtener previas con populate básico
    const previas = await Previa.find({})
      .populate('materia', 'nombre codigo semestre')
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ materia: 1 });
    
    console.log(`✅ Previas encontradas: ${previas.length}`);
    
    // Filtrar previas con referencias válidas y hacer populate del semestre
    const previasValidas = [];
    
    for (const previa of previas) {
      // Verificar que tanto la materia como la materia requerida existen
      if (!previa.materia || !previa.materiaRequerida) {
        console.log(`❌ Previa con referencia rota eliminada - ID: ${previa._id}`);
        // Eliminar la previa con referencia rota
        await Previa.findByIdAndDelete(previa._id);
        continue;
      }
      
      // Hacer populate del semestre si existe
      if (previa.materia.semestre) {
        try {
          const semestre = await Semestre.findById(previa.materia.semestre);
          if (semestre) {
            previa.materia.semestre = semestre;
            console.log(`✅ Semestre populado para ${previa.materia.nombre}:`, semestre.nombre);
          } else {
            console.log(`❌ Semestre no encontrado para ${previa.materia.nombre}, ID:`, previa.materia.semestre);
          }
        } catch (error) {
          console.error(`❌ Error populando semestre para ${previa.materia.nombre}:`, error);
        }
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
    
    // Obtener previas con populate básico
    const previas = await Previa.find({})
      .populate('materia', 'nombre codigo semestre')
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ materia: 1 });
    
    console.log(`✅ API: Previas encontradas: ${previas.length}`);
    
    // Filtrar previas con referencias válidas y hacer populate del semestre
    const previasValidas = [];
    
    for (const previa of previas) {
      // Verificar que tanto la materia como la materia requerida existen
      if (!previa.materia || !previa.materiaRequerida) {
        console.log(`❌ API: Previa con referencia rota eliminada - ID: ${previa._id}`);
        // Eliminar la previa con referencia rota
        await Previa.findByIdAndDelete(previa._id);
        continue;
      }
      
      // Hacer populate del semestre si existe
      if (previa.materia.semestre) {
        try {
          const semestre = await Semestre.findById(previa.materia.semestre);
          if (semestre) {
            previa.materia.semestre = semestre;
            console.log(`✅ API: Semestre populado para ${previa.materia.nombre}:`, semestre.nombre);
          } else {
            console.log(`❌ API: Semestre no encontrado para ${previa.materia.nombre}, ID:`, previa.materia.semestre);
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

// API: Eliminar previa
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

module.exports = router;
