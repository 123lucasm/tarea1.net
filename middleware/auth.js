const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Middleware para verificar sesión del usuario
const checkSession = async (req, res, next) => {
  try {
    console.log('🔍 Verificando sesión para:', req.path);
    console.log('📋 Sesión actual:', req.session);
    
    if (req.session && req.session.userId) {
      console.log('✅ Sesión encontrada, userId:', req.session.userId);
      
      // Buscar usuario en la base de datos
      const usuario = await Usuario.findById(req.session.userId).select('-password');
      
      if (usuario && usuario.activo) {
        console.log('✅ Usuario válido encontrado:', usuario.nombre, usuario.rol);
        req.usuario = usuario;
        req.isAuthenticated = true;
      } else {
        console.log('❌ Usuario no válido o inactivo, limpiando sesión');
        // Usuario no válido, limpiar sesión
        req.session.destroy();
        req.isAuthenticated = false;
      }
    } else {
      console.log('⚠️ No hay sesión activa');
      req.isAuthenticated = false;
    }
    
    console.log('🔐 Estado de autenticación:', req.isAuthenticated);
    next();
  } catch (error) {
    console.error('❌ Error en verificación de sesión:', error);
    req.isAuthenticated = false;
    next();
  }
};

// Middleware para verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated) {
    return res.redirect('/auth/login');
  }
  next();
};

// Middleware para verificar token JWT (mantener compatibilidad)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const usuario = await Usuario.findById(decoded.userId).select('-password');
    
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ 
        error: 'Usuario no válido o inactivo',
        code: 'USER_INVALID'
      });
    }

    // Agregar usuario al request
    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      });
    }
    
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para verificar rol específico
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Rol insuficiente',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: roles,
        userRole: req.usuario.rol
      });
    }

    next();
  };
};

// Middleware para verificar si es administrador
const requireAdmin = requireRole(['administrador']);

// Middleware para verificar si es estudiante
const requireEstudiante = requireRole(['estudiante']);

// Middleware para verificar si es estudiante o administrador
const requireEstudianteOrAdmin = requireRole(['estudiante', 'administrador']);

// Middleware para verificar propiedad del recurso (estudiante solo puede acceder a sus propios datos)
const requireOwnership = async (req, res, next) => {
  try {
    if (req.usuario.rol === 'administrador') {
      return next(); // Los administradores pueden acceder a todo
    }

    if (req.usuario.rol === 'estudiante') {
      // Verificar que el estudiante esté accediendo a sus propios datos
      const resourceId = req.params.id || req.params.estudianteId;
      
      if (resourceId && resourceId !== req.usuario._id.toString()) {
        return res.status(403).json({ 
          error: 'Solo puedes acceder a tus propios datos',
          code: 'ACCESS_DENIED'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en verificación de propiedad:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para generar nuevo token de acceso
const generateNewAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const usuario = await Usuario.findById(decoded.userId);
    
    if (!usuario || usuario.refreshToken !== refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token inválido',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Generar nuevo access token
    const newAccessToken = jwt.sign(
      { userId: usuario._id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    req.newAccessToken = newAccessToken;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    console.error('Error en generación de token:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  checkSession,
  requireAuth,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireEstudiante,
  requireEstudianteOrAdmin,
  requireOwnership,
  generateNewAccessToken
};

