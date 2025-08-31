const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /auth/login - Mostrar página de login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Iniciar Sesión' });
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
  body('legajo')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('El legajo debe tener al menos 3 caracteres')
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

// POST /auth/registro - Registrar nuevo usuario
router.post('/registro', 
  validacionesRegistro, 
  manejarErroresValidacion,
  async (req, res) => {
    try {
      const resultado = await AuthService.registrarUsuario(req.body);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        req.io.emit('usuario_registrado', {
          mensaje: 'Nuevo usuario registrado',
          usuario: resultado.usuario
        });
      }

      res.status(201).json({
        mensaje: 'Usuario registrado exitosamente',
        ...resultado
      });
    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.message.includes('ya está registrado')) {
        return res.status(409).json({
          error: error.message,
          code: 'USER_ALREADY_EXISTS'
        });
      }
      
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// POST /auth/login - Iniciar sesión
router.post('/login', 
  validacionesLogin, 
  manejarErroresValidacion,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const resultado = await AuthService.iniciarSesion(email, password);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        req.io.emit('usuario_conectado', {
          mensaje: 'Usuario conectado',
          usuario: resultado.usuario
        });
      }

      res.json({
        mensaje: 'Inicio de sesión exitoso',
        ...resultado
      });
    } catch (error) {
      console.error('Error en login:', error);
      
      if (error.message.includes('Credenciales inválidas')) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS'
        });
      }
      
      if (error.message.includes('Usuario inactivo')) {
        return res.status(403).json({
          error: 'Usuario inactivo',
          code: 'USER_INACTIVE'
        });
      }
      
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

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

// POST /auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await AuthService.cerrarSesion(req.usuario._id);
    
    // Notificar por WebSocket si está disponible
    if (req.io) {
      req.io.emit('usuario_desconectado', {
        mensaje: 'Usuario desconectado',
        usuario: req.usuario._id
      });
    }

    res.json({
      mensaje: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

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

module.exports = router;
