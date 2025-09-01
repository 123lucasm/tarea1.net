const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /auth/login - Mostrar página de login
router.get('/login', (req, res) => {
  const success = req.query.success;
  const error = req.query.error;
  
  res.render('auth/login', { 
    title: 'Iniciar Sesión',
    success: success,
    error: error
  });
});

// GET /auth/registro - Mostrar página de registro
router.get('/registro', (req, res) => {
  res.render('auth/registro', { title: 'Registro de Usuario' });
});

// Validaciones para registro
const validacionesRegistro = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('apellido')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El apellido debe tener al menos 2 caracteres'),
  body('rol')
    .optional()
    .isIn(['estudiante', 'administrador'])
    .withMessage('Rol inválido'),
  body('cedula')
    .trim()
    .isLength({ min: 7 })
    .withMessage('La cédula debe tener al menos 7 caracteres')
];

// Validaciones para login
const validacionesLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Validaciones para cambio de contraseña
const validacionesCambioPassword = [
  body('passwordActual')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('passwordNueva')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

// Middleware para manejar errores de validación (JSON)
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

// Middleware para manejar errores de validación (render)
const manejarErroresValidacionRender = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.render('auth/login', { 
      title: 'Iniciar Sesión',
      error: 'Datos de entrada inválidos: ' + errores.array()[0].msg
    });
  }
  next();
};

// POST /auth/registro - Registrar nuevo usuario
router.post('/registro', 
  validacionesRegistro, 
  manejarErroresValidacion,
  async (req, res) => {
    try {
      const resultado = await AuthService.registrarUsuario(req.body);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        console.log('Emitiendo evento usuario_registrado:', resultado.usuario);
        req.io.emit('usuario_registrado', {
          mensaje: 'Nuevo usuario registrado',
          usuario: resultado.usuario
        });
        
        // También emitir evento genérico para compatibilidad
        req.io.emit('nuevo-usuario', {
          nombre: resultado.usuario.nombre,
          apellido: resultado.usuario.apellido,
          rol: resultado.usuario.rol
        });
      }

      // Redirigir al login con mensaje de éxito
      res.redirect('/auth/login?success=Usuario registrado exitosamente. Ya puedes iniciar sesión.');
    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.message.includes('ya está registrado')) {
        return res.redirect('/auth/login?error=El email ya está registrado. Intenta con otro email o inicia sesión.');
      }
      
      // Redirigir al login con mensaje de error genérico
      res.redirect('/auth/login?error=Error en el registro. Intenta nuevamente.');
    }
  }
);

// POST /auth/login - Iniciar sesión (con validación)
router.post('/login', 
  validacionesLogin, 
  manejarErroresValidacionRender,
  async (req, res) => {
    try {
      console.log('🔐 Iniciando proceso de login...');
      const { email, password } = req.body;
      console.log('📧 Email recibido:', email);
      
      const resultado = await AuthService.iniciarSesion(email, password, false); // Sin tokens, solo sesión
      console.log('✅ Login exitoso, resultado:', resultado);
      console.log('🔍 Verificando que req.session existe:', !!req.session);
      console.log('🔍 Tipo de req.session:', typeof req.session);
      
      // Crear sesión del usuario
      req.session.userId = resultado.usuario.id;
      req.session.userEmail = resultado.usuario.email;
      req.session.userName = `${resultado.usuario.nombre} ${resultado.usuario.apellido}`;
      req.session.userRole = resultado.usuario.rol;
      
      console.log('📝 Datos de sesión configurados:', {
        userId: req.session.userId,
        userEmail: req.session.userEmail,
        userName: req.session.userName,
        userRole: req.session.userRole
      });
      
      // Guardar la sesión explícitamente
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error al guardar sesión:', err);
          return res.render('auth/login', { 
            title: 'Iniciar Sesión',
            error: 'Error al crear sesión'
          });
        }
        
        console.log('💾 Sesión guardada exitosamente:', req.session);
        
        // Notificar por WebSocket si está disponible
        if (req.io) {
          req.io.emit('usuario_conectado', {
            mensaje: 'Usuario conectado',
            usuario: resultado.usuario
          });
        }

        console.log('🔄 Redirigiendo según rol del usuario...');
        // Redirigir según el rol del usuario con mensaje de éxito
        res.redirect('/dashboard?login=success');
      });
    } catch (error) {
      console.error('❌ Error en login:', error);
      
      let errorMessage = 'Error interno del servidor';
      
      if (error.message.includes('Credenciales inválidas')) {
        errorMessage = 'Credenciales inválidas';
      } else if (error.message.includes('Usuario inactivo')) {
        errorMessage = 'Usuario inactivo';
      }
      
      // Renderizar la página de login con el error
      res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: errorMessage
      });
    }
  }
);

// POST /auth/login-test - Ruta de prueba sin validación
router.post('/login-test', async (req, res) => {
  try {
    console.log('🧪 Ruta de prueba de login...');
    const { email, password } = req.body;
    console.log('📧 Email recibido:', email);
    
    const resultado = await AuthService.iniciarSesion(email, password, false); // Sin tokens, solo sesión
    console.log('✅ Login exitoso, resultado:', resultado);
    
    // Crear sesión del usuario
    req.session.userId = resultado.usuario.id;
    req.session.userEmail = resultado.usuario.email;
    req.session.userName = `${resultado.usuario.nombre} ${resultado.usuario.apellido}`;
    req.session.userRole = resultado.usuario.rol;
    
    console.log('📝 Datos de sesión configurados:', {
      userId: req.session.userId,
      userEmail: req.session.userEmail,
      userName: req.session.userName,
      userRole: req.session.userRole
    });
    
    // Guardar la sesión explícitamente
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error al guardar sesión:', err);
        return res.json({ error: 'Error al crear sesión' });
      }
      
      console.log('💾 Sesión guardada exitosamente:', req.session);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        req.io.emit('usuario_conectado', {
          mensaje: 'Usuario conectado',
          usuario: resultado.usuario
        });
      }

      console.log('🔄 Redirigiendo según rol del usuario...');
      // Redirigir según el rol del usuario
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('❌ Error en login de prueba:', error);
    res.json({ error: error.message });
  }
});

// POST /auth/login-simple - Ruta completamente simple
router.post('/login-simple', async (req, res) => {
  try {
    console.log('🚀 Login simple iniciando...');
    const { email, password } = req.body;
    
    // Buscar usuario directamente
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.findOne({ email });
    
    if (!usuario) {
      return res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: 'Credenciales inválidas'
      });
    }
    
    // Verificar contraseña
    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ Usuario autenticado:', usuario.nombre);
    
    // Crear sesión
    req.session.userId = usuario._id;
    req.session.userEmail = usuario.email;
    req.session.userName = `${usuario.nombre} ${usuario.apellido}`;
    req.session.userRole = usuario.rol;
    
    console.log('📝 Sesión creada:', req.session);
    
    // Redirigir según el rol del usuario
    console.log('🔄 Redirigiendo según rol del usuario...');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('❌ Error en login simple:', error);
    res.render('auth/login', { 
      title: 'Iniciar Sesión',
      error: 'Error interno del servidor'
    });
  }
});

// POST /auth/refresh - Renovar access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const resultado = await AuthService.renovarToken(refreshToken);
    
    res.json({
      mensaje: 'Token renovado exitosamente',
      ...resultado
    });
  } catch (error) {
    console.error('Error en renovación de token:', error);
    
    if (error.message.includes('Refresh token inválido')) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /auth/logout - Cerrar sesión
router.get('/logout', (req, res) => {
  try {
    console.log('🚪 Usuario intentando cerrar sesión...');
    
    if (req.session && req.session.userId) {
      console.log('👤 Usuario cerrando sesión:', req.session.userName);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        req.io.emit('usuario_desconectado', {
          mensaje: 'Usuario desconectado',
          usuario: req.session.userId
        });
      }

      // Destruir la sesión
      req.session.destroy((err) => {
        if (err) {
          console.error('❌ Error al cerrar sesión:', err);
        } else {
          console.log('✅ Sesión destruida exitosamente');
        }
        // Redirigir al inicio
        res.redirect('/?logout=success');
      });
    } else {
      console.log('⚠️ No hay sesión activa para cerrar');
      res.redirect('/');
    }
  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.redirect('/');
  }
});

// POST /auth/actualizar-perfil - Actualizar perfil de usuario
router.post('/actualizar-perfil', 
  authenticateToken,
  [
    body('cedula')
      .optional()
      .trim()
      .isLength({ min: 7 })
      .withMessage('La cédula debe tener al menos 7 caracteres'),
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('El nombre debe tener al menos 2 caracteres'),
    body('apellido')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('El apellido debe tener al menos 2 caracteres')
  ],
  manejarErroresValidacion,
  async (req, res) => {
    try {
      const { cedula, nombre, apellido } = req.body;
      const userId = req.user.userId;

      // Verificar si la cédula ya existe (si se proporciona)
      if (cedula) {
        const cedulaExistente = await Usuario.findOne({ 
          cedula: cedula,
          _id: { $ne: userId }
        });
        if (cedulaExistente) {
          return res.status(400).json({
            error: 'La cédula ya está registrada por otro usuario'
          });
        }
      }

      // Actualizar usuario
      const datosActualizacion = {};
      if (cedula) datosActualizacion.cedula = cedula;
      if (nombre) datosActualizacion.nombre = nombre;
      if (apellido) datosActualizacion.apellido = apellido;

      const usuarioActualizado = await Usuario.findByIdAndUpdate(
        userId,
        datosActualizacion,
        { new: true }
      ).select('-password -refreshToken');

      res.json({
        mensaje: 'Perfil actualizado exitosamente',
        usuario: usuarioActualizado
      });

    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
);

// POST /auth/cambiar-password - Cambiar contraseña
router.post('/cambiar-password', 
  authenticateToken,
  validacionesCambioPassword,
  manejarErroresValidacion,
  async (req, res) => {
    try {
      const { passwordActual, passwordNueva } = req.body;
      
      await AuthService.cambiarPassword(
        req.usuario._id,
        passwordActual,
        passwordNueva
      );
      
      res.json({
        mensaje: 'Contraseña cambiada exitosamente'
      });
    } catch (error) {
      console.error('Error en cambio de contraseña:', error);
      
      if (error.message.includes('Contraseña actual incorrecta')) {
        return res.status(400).json({
          error: 'Contraseña actual incorrecta',
          code: 'WRONG_CURRENT_PASSWORD'
        });
      }
      
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// GET /auth/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', authenticateToken, async (req, res) => {
  try {
    const usuario = await AuthService.obtenerUsuario(req.usuario._id);
    
    res.json({
      usuario
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /auth/verificar - Verificar si el token es válido
router.get('/verificar', authenticateToken, (req, res) => {
  res.json({
    mensaje: 'Token válido',
    usuario: req.usuario
  });
});

// POST /auth/login-simple - Ruta completamente simple
router.post('/login-simple', async (req, res) => {
  try {
    console.log('🚀 Login simple iniciando...');
    const { email, password } = req.body;
    
    // Buscar usuario directamente
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.findOne({ email });
    
    if (!usuario) {
      return res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: 'Credenciales inválidas'
      });
    }
    
    // Verificar contraseña
    const passwordValida = await usuario.compararPassword(password);
    if (!passwordValida) {
      return res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ Usuario autenticado:', usuario.nombre);
    
    // Crear sesión
    req.session.userId = usuario._id;
    req.session.userEmail = usuario.email;
    req.session.userName = `${usuario.nombre} ${usuario.apellido}`;
    req.session.userRole = usuario.rol;
    
    console.log('📝 Sesión creada:', req.session);
    
    // Redirigir según el rol del usuario
    console.log('🔄 Redirigiendo según rol del usuario...');
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('❌ Error en login simple:', error);
    res.render('auth/login', { 
      title: 'Iniciar Sesión',
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
