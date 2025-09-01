const express = require('express');
const router = express.Router();
const { checkAdmin, checkAdminAPI } = require('../middleware/adminAuth');
const Usuario = require('../models/Usuario');
const Materia = require('../models/Materia');
const Previa = require('../models/Previa');
const Semestre = require('../models/Semestre');

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
    const { nombre, apellido, email, cedula, rol, activo } = req.body;
    
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      cedula,
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
    const { nombre, apellido, email, cedula, rol, activo } = req.body;
    
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { nombre, apellido, email, cedula, rol, activo },
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
      .populate('semestre', 'nombre')
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
    const previas = await Previa.find({})
      .populate('materia', 'nombre codigo')
      .populate('previa', 'nombre codigo')
      .sort({ materia: 1 });
    
    res.render('admin/previas', {
      title: 'Gestión de Previas',
      usuario: req.usuario,
      previas: previas
    });
  } catch (error) {
    console.error('Error cargando previas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// API: Obtener todas las previas
router.get('/api/previas', async (req, res) => {
  try {
    console.log('Intentando cargar previas...');
    const previas = await Previa.find({})
      .populate('materia', 'nombre codigo')
      .populate('materiaRequerida', 'nombre codigo')
      .sort({ materia: 1 });
    
    console.log(`Previas encontradas: ${previas.length}`);
    res.json(previas);
  } catch (error) {
    console.error('Error cargando previas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

// API: Crear nueva previa
router.post('/api/previas', async (req, res) => {
  try {
    const { materia, materiaRequerida, tipo, notaMinima, creadoPor } = req.body;
    
    const nuevaPrevia = new Previa({
      materia,
      materiaRequerida,
      tipo: tipo || 'curso_aprobado',
      notaMinima: notaMinima || 3,
      creadoPor: creadoPor || req.usuario._id
    });
    
    await nuevaPrevia.save();
    
    // Populate para obtener los nombres
    await nuevaPrevia.populate('materia', 'nombre codigo');
    await nuevaPrevia.populate('materiaRequerida', 'nombre codigo');
    
    // Emitir evento de Socket.IO
    if (req.io) {
      req.io.emit('nueva-previa', {
        materia: {
          nombre: nuevaPrevia.materia.nombre
        },
        previa: {
          nombre: nuevaPrevia.materiaRequerida.nombre
        }
      });
    }
    
    res.status(201).json(nuevaPrevia);
  } catch (error) {
    console.error('Error creando previa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
