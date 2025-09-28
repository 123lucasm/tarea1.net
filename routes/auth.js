const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// Función auxiliar para actualizar último acceso
async function actualizarUltimoAcceso(usuarioId, email, req = null) {
  try {
    console.log('🔄 Actualizando último acceso para:', email);
    
    const Usuario = require('../models/Usuario');
    const fechaActual = new Date();
    
    const resultado = await Usuario.findByIdAndUpdate(
      usuarioId, 
      { ultimoAcceso: fechaActual }, 
      { new: true, runValidators: true }
    );
    
    if (resultado) {
      console.log('✅ Último acceso actualizado:', resultado.ultimoAcceso);
      
      // Emitir evento de Socket.IO si está disponible
      if (req && req.io) {
        req.io.emit('ultimo-acceso-actualizado', {
          usuario: {
            id: resultado._id,
            nombre: resultado.nombre,
            apellido: resultado.apellido,
            email: resultado.email,
            rol: resultado.rol
          },
          ultimoAcceso: resultado.ultimoAcceso
        });
      }
    } else {
      console.log('⚠️ Usuario no encontrado para actualizar');
    }
  } catch (error) {
    console.error('❌ Error actualizando último acceso:', error.message);
  }
}

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

      // Verificar si el usuario necesita verificación
      if (resultado.verificationRequired) {
        res.redirect(`/auth/verificar-email?email=${resultado.usuario.email}&message=Ingresa el código de verificación que enviamos a tu correo`);
      } else {
        res.redirect('/auth/login?success=Usuario registrado exitosamente. Ya puedes iniciar sesión.');
      }
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

// GET /auth/verificar-email - Página de verificación de email
router.get('/verificar-email', (req, res) => {
  const { email, message } = req.query;
  res.render('auth/verificar-email', { 
    title: 'Verificar Email',
    email: email || '',
    message: message || ''
  });
});

// POST /auth/verificar-email - Verificar código de email
router.post('/verificar-email', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    
    if (!email || !codigo) {
      return res.render('auth/verificar-email', {
        title: 'Verificar Email',
        email: email || '',
        error: 'Email y código son requeridos'
      });
    }

    const resultado = await AuthService.verificarCodigoEmail(email, codigo);
    
    if (resultado.success) {
      res.redirect('/auth/login?success=Email verificado exitosamente. Ya puedes iniciar sesión.');
    } else {
      res.render('auth/verificar-email', {
        title: 'Verificar Email',
        email,
        error: resultado.message
      });
    }
  } catch (error) {
    console.error('Error verificando código:', error);
    res.render('auth/verificar-email', {
      title: 'Verificar Email',
      email: req.body.email || '',
      error: error.message
    });
  }
});

// POST /auth/reenviar-codigo - Reenviar código de verificación
router.post('/reenviar-codigo', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.render('auth/verificar-email', {
        title: 'Verificar Email',
        email: '',
        error: 'Email requerido'
      });
    }

    const resultado = await AuthService.reenviarCodigoVerificacion(email);
    
    res.redirect(`/auth/verificar-email?email=${email}&success=Se ha enviado un nuevo código de verificación a tu correo`);
  } catch (error) {
    console.error('Error reenviando código:', error);
    res.redirect(`/auth/verificar-email?email=${req.body.email}&error=${error.message}`);
  }
});

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
      
      // Actualizar último acceso del usuario
      await actualizarUltimoAcceso(resultado.usuario.id, resultado.usuario.email, req);
      
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
      
      console.log('🔧 Configuración de sesión:', {
        sessionId: req.sessionID,
        cookie: req.session.cookie,
        secure: req.session.cookie.secure,
        sameSite: req.session.cookie.sameSite
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
          req.io.emit('user-login', {
            usuario: resultado.usuario
          });
        }

        console.log('🔄 Redirigiendo según rol del usuario...');
        // Redirigir según el rol del usuario con mensaje de éxito
        const userName = encodeURIComponent(resultado.usuario.nombre);
        res.redirect(`/dashboard?loginSuccess=true&userName=${userName}`);
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
    
    // Actualizar último acceso del usuario
    await actualizarUltimoAcceso(resultado.usuario.id, resultado.usuario.email);
    
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
    console.log('🔄 Llamando a actualizarUltimoAcceso...');
    
    // Actualizar último acceso del usuario
    await actualizarUltimoAcceso(usuario._id, usuario.email);
    console.log('✅ Función actualizarUltimoAcceso completada');
    
    // Crear sesión - convertir ObjectId a string
    req.session.userId = usuario._id.toString();
    req.session.userEmail = usuario.email;
    req.session.userName = `${usuario.nombre} ${usuario.apellido}`;
    req.session.userRole = usuario.rol;
    
    console.log('📝 Sesión creada:', req.session);
    console.log('📝 Tipo de userId en sesión:', typeof req.session.userId);
    console.log('📝 Valor de userId en sesión:', req.session.userId);
    
    // Guardar la sesión explícitamente antes de redirigir
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error al guardar sesión:', err);
        return res.render('auth/login', { 
          title: 'Iniciar Sesión',
          error: 'Error al crear sesión'
        });
      }
      
      console.log('💾 Sesión guardada exitosamente');
      console.log('💾 Sesión después de guardar:', JSON.stringify(req.session, null, 2));
      
      // Redirigir según el rol del usuario
      console.log('🔄 Redirigiendo según rol del usuario...');
      res.redirect('/dashboard');
    });
    
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
        req.io.emit('user-logout', {
          usuario: {
            id: req.session.userId,
            nombre: req.session.userName,
            email: req.session.userEmail,
            rol: req.session.userRole
          }
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
      // Verificar sesión
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          error: 'Debes iniciar sesión para actualizar tu perfil'
        });
      }

      const { cedula, nombre, apellido, biografia, notificacionesEmail, modoOscuro } = req.body;
      const userId = req.session.userId;
      const Usuario = require('../models/Usuario');

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
      if (cedula) {
        datosActualizacion.cedula = cedula;
        // Si la nueva cédula no empieza con 'G' (no es una cédula generada automáticamente),
        // marcar que ya no necesita actualizar cédula
        if (!cedula.startsWith('G')) {
          datosActualizacion.necesitaActualizarCedula = false;
        }
      }
      if (nombre) datosActualizacion.nombre = nombre;
      if (apellido) datosActualizacion.apellido = apellido;
      if (biografia !== undefined) datosActualizacion.biografia = biografia;
      if (notificacionesEmail !== undefined) datosActualizacion.notificacionesEmail = notificacionesEmail === 'on';
      if (modoOscuro !== undefined) datosActualizacion.modoOscuro = modoOscuro === 'on';

      const usuarioActualizado = await Usuario.findByIdAndUpdate(
        userId,
        datosActualizacion,
        { new: true }
      ).select('-password -refreshToken');

      // Actualizar datos de sesión
      req.session.userName = `${usuarioActualizado.nombre} ${usuarioActualizado.apellido}`;

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
  validacionesCambioPassword,
  manejarErroresValidacion,
  async (req, res) => {
    try {
      // Verificar sesión
      if (!req.session || !req.session.userId) {
        return res.status(401).json({
          error: 'Debes iniciar sesión para cambiar tu contraseña'
        });
      }

      const { passwordActual, passwordNueva } = req.body;
      
      await AuthService.cambiarPassword(
        req.session.userId,
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

// GET /auth/perfil - Mostrar página de perfil del usuario
router.get('/perfil', async (req, res) => {
  try {
    // Verificar si hay sesión activa
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login?error=Debes iniciar sesión para acceder a tu perfil');
    }

    // Obtener datos del usuario desde la sesión o base de datos
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.findById(req.session.userId).select('-password -refreshToken');
    
    if (!usuario) {
      return res.redirect('/auth/login?error=Usuario no encontrado');
    }

    // Verificar parámetros de URL para saber si es una actualización obligatoria
    const actualizacionObligatoria = req.query.actualizacion === 'obligatoria';
    const primeraVezGoogle = req.query.primera_vez === 'google';

    // Verificar también en el usuario si necesita actualización
    const usuarioActualizado = await Usuario.findById(req.session.userId);
    const necesitaActualizacion = usuarioActualizado.necesitaActualizarCedula || actualizacionObligatoria;

    res.render('auth/perfil', {
      title: 'Mi Perfil',
      usuario: usuario,
      isAuthenticated: true,
      actualizacionObligatoria: necesitaActualizacion,
      primeraVezGoogle: primeraVezGoogle
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.redirect('/auth/login?error=Error al cargar el perfil');
  }
});

// GET /auth/verificar - Verificar si el token es válido
router.get('/verificar', authenticateToken, (req, res) => {
  res.json({
    mensaje: 'Token válido',
    usuario: req.usuario
  });
});

// Rutas de Google OAuth
// Ruta para iniciar autenticación con Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Callback de Google OAuth
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/login?error=google_auth_failed' }),
  async (req, res) => {
    try {
      console.log('✅ Autenticación con Google exitosa');
      
      // Verificar si el usuario es nuevo creado con Google OAuth y necesita actualizar cédula
      const Usuario = require('../models/Usuario');
      const usuarioCompleto = await Usuario.findById(req.user._id);
      
      // Marcar usuario de Google para actualización de cédula si es necesario
      if (usuarioCompleto.googleId && usuarioCompleto.necesitaActualizarCedula) {
        console.log('🔔 Usuario de Google con marcado de actualización obligatoria');
      } else if (usuarioCompleto.googleId && usuarioCompleto.cedula && usuarioCompleto.cedula.startsWith('G')) {
        const hoy = new Date();
        const usuarioCreado = usuarioCompleto.createdAt;
        const diferenciaMs = hoy - usuarioCreado;
        const unaHora = 60 * 60 * 1000; // Una hora en milisegundos
        
        // Si fue creado hace menos de una hora (usuario nuevo de Google), necesita actualizar cédula
        if (diferenciaMs < unaHora) {
          await Usuario.findByIdAndUpdate(req.user._id, { necesitaActualizarCedula: true });
          console.log('🔔 Usuario de Google nuevo requiere actualización de cédula');
        }
      }
      
      // Actualizar último acceso
      await actualizarUltimoAcceso(req.user._id, req.user.email, req);
      
      // Crear sesión del usuario
      req.session.userId = req.user._id;
      req.session.userEmail = req.user.email;
      req.session.userName = `${req.user.nombre} ${req.user.apellido}`;
      req.session.userRole = req.user.rol;
      
      console.log('📝 Sesión creada para usuario de Google:', req.user.email);
      
      // Notificar por WebSocket si está disponible
      if (req.io) {
        req.io.emit('user-login', {
          usuario: {
            id: req.user._id,
            nombre: req.user.nombre,
            apellido: req.user.apellido,
            email: req.user.email,
            rol: req.user.rol
          }
        });
      }
      
      // Redirigir según si necesita actualizar cédula o según el rol
      const usuarioActualizado = await Usuario.findById(req.user._id);
      
      if (usuarioActualizado.necesitaActualizarCedula) {
        console.log('📋 Redirigiendo a perfil para actualización obligatoria de cédula');
        res.redirect('/auth/perfil?actualizacion=obligatoria&primera_vez=google');
        return;
      }
      
      // Redirigir según el rol del usuario
      if (req.user.rol === 'administrador') {
        res.redirect('/admin');
      } else {
        res.redirect('/dashboard');
      }
      
    } catch (error) {
      console.error('❌ Error en callback de Google:', error);
      res.redirect('/auth/login?error=google_callback_error');
    }
  }
);

module.exports = router;
