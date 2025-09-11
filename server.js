const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware de seguridad y utilidades
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar rutas
const authRoutes = require('./routes/auth');
const materiaRoutes = require('./routes/materias');
const elegibilidadRoutes = require('./routes/elegibilidad');
const previasRoutes = require('./routes/previas');
const adminRoutes = require('./routes/admin');


// Importar middleware de autenticación
const { checkSession, requireAuth } = require('./middleware/auth');
const { 
  registrarActividadMensual, 
  registrarTiempoSesion, 
  establecerTimestampLogin 
} = require('./middleware/actividadMensual');

// Configuración de middleware con CSP personalizado
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'matriculatec-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Configuración de Passport
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate limiting
// Configuración mejorada para evitar problemas durante el uso normal
// - Rate limiter general: 1000 peticiones por 15 minutos (más permisivo)
// - Rate limiter para APIs: 300 peticiones por 15 minutos (más estricto)
// - No se cuentan las peticiones exitosas para evitar bloqueos innecesarios
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Aumentado a 1000 peticiones
  message: {
    error: 'Demasiadas peticiones, por favor intenta más tarde',
    retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutos en segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar peticiones exitosas
  skipFailedRequests: false
});

// Rate limiter más estricto solo para rutas de API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones por 15 minutos para APIs
  message: {
    error: 'Demasiadas peticiones a la API, por favor intenta más tarde',
    retryAfter: Math.ceil(15 * 60 / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter); // Rate limiter general más permisivo

// Middleware para manejar errores de rate limiting
app.use((err, req, res, next) => {
  if (err.status === 429) { // Too Many Requests
    return res.status(429).json({
      error: 'Demasiadas peticiones',
      message: 'Has excedido el límite de peticiones. Por favor, espera un momento antes de continuar.',
      retryAfter: err.headers?.['retry-after'] || 60,
      timestamp: new Date().toISOString()
    });
  }
  next(err);
});

// Conexión a MongoDB Atlas
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('❌ MONGO_URI no está definido en las variables de entorno');
  process.exit(1);
}
console.log('🔗 Conectando a MongoDB Atlas...');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'tarea1_net'  // Forzar el uso de la base de datos tarea1_net
})
.then(() => {
  console.log('✅ Conectado a MongoDB Atlas');
  console.log('✅ Usando base de datos: tarea1_net');
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  console.log('💡 Sugerencias:');
  console.log('   1. Verifica tu conexión a internet');
  console.log('   2. Asegúrate de que MongoDB Atlas esté funcionando');
  console.log('   3. Verifica que la URL en .env sea correcta');
  console.log('   4. Verifica que tu IP esté en la whitelist de Atlas');
});

// Configuración de WebSockets
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado:', socket.id);
  
  // Evento para registrar login de usuario
  socket.on('user-login', (data) => {
    console.log('👤 Usuario inició sesión:', data);
    
    // Emitir a todos los clientes conectados (excepto al que inició sesión)
    socket.broadcast.emit('user-logged-in', {
      usuario: data.usuario,
      timestamp: new Date(),
      tipo: 'login'
    });
    
    // Emitir también al cliente que inició sesión para confirmación
    socket.emit('login-confirmed', {
      mensaje: 'Sesión iniciada correctamente',
      timestamp: new Date()
    });
  });
  
  // Evento para registrar logout de usuario
  socket.on('user-logout', (data) => {
    console.log('👋 Usuario cerró sesión:', data);
    
    // Emitir a todos los clientes conectados
    socket.broadcast.emit('user-logged-out', {
      usuario: data.usuario,
      timestamp: new Date(),
      tipo: 'logout'
    });
  });
  
  // Evento para registrar actividad de usuario
  socket.on('user-activity', (data) => {
    console.log('📊 Actividad de usuario:', data);
    
    // Emitir a todos los clientes conectados
    socket.broadcast.emit('user-activity-update', {
      usuario: data.usuario,
      actividad: data.actividad,
      timestamp: new Date(),
      tipo: 'activity'
    });
  });
  
  // Evento para unirse a una sala específica (ej: admin)
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`🏠 Usuario ${socket.id} se unió a la sala: ${room}`);
  });
  
  // Evento para salir de una sala
  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`🚪 Usuario ${socket.id} salió de la sala: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Usuario desconectado:', socket.id);
  });
});

// Middleware para pasar io a las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas públicas (sin verificación de sesión)
app.use('/auth', establecerTimestampLogin, registrarActividadMensual, authRoutes);

// Middleware para verificar sesión solo en rutas protegidas
app.use('/materias', checkSession, requireAuth, registrarActividadMensual, materiaRoutes);
app.use('/elegibilidad', checkSession, requireAuth, registrarActividadMensual, elegibilidadRoutes);
app.use('/previas', checkSession, requireAuth, registrarActividadMensual, previasRoutes);

// Rutas de admin con rate limiter más estricto
app.use('/admin', checkSession, requireAuth, registrarActividadMensual, adminRoutes);
app.use('/admin/api', apiLimiter, checkSession, requireAuth, registrarActividadMensual, adminRoutes);

// Ruta principal con verificación de sesión
app.get('/', checkSession, (req, res) => {
  console.log('🏠 Accediendo a página principal...');
  console.log('Estado de autenticación:', req.isAuthenticated);
  console.log('Usuario en request:', req.usuario);
  

  
  res.render('index', { 
    title: 'Sistema de Elegibilidad de Materias',
    isAuthenticated: req.isAuthenticated,
    usuario: req.usuario
  });
});

// Ruta del dashboard con verificación de sesión
app.get('/dashboard', checkSession, (req, res) => {
  console.log('Accediendo a dashboard, isAuthenticated:', req.isAuthenticated);
  console.log('Usuario en request:', req.usuario);
  
  if (!req.isAuthenticated) {
    console.log('Usuario no autenticado, redirigiendo a login');
    return res.redirect('/auth/login');
  }
  
  // Si es administrador, redirigir al panel de administrador
  if (req.usuario && req.usuario.rol === 'administrador') {
    console.log('Usuario administrador, redirigiendo al panel de admin');
    return res.redirect('/admin');
  }
  
  console.log('Usuario autenticado, renderizando dashboard');
  res.render('dashboard', { 
    title: 'Dashboard - MATRICULATEC',
    usuario: req.usuario,
    isAuthenticated: true,
    loginSuccess: req.query.login === 'success'
  });
});

// Ruta de prueba de Tailwind CSS
app.get('/tailwind-test', (req, res) => {
  res.render('tailwind-test', { 
    title: 'Tailwind CSS Test'
  });
});

// Ruta de prueba simple de Tailwind CSS
app.get('/tailwind-simple', (req, res) => {
  res.render('tailwind-simple', { 
    title: 'Tailwind Simple Test'
  });
});

// Rutas del panel de administrador
app.use('/admin', adminRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Página no encontrada',
    message: 'La página que buscas no existe',
    error: { status: 404 }
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).render('error', {
    title: 'Error del servidor',
    message: 'Ha ocurrido un error inesperado',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📱 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});

module.exports = { app, server, io };
