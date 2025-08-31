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

// Importar middleware de autenticación
const { checkSession, requireAuth } = require('./middleware/auth');

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

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tarea1_net', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB - Base de datos: tarea1_net'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Configuración de WebSockets
io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado:', socket.id);
  
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
app.use('/auth', authRoutes);

// Middleware para verificar sesión solo en rutas protegidas
app.use('/materias', checkSession, requireAuth, materiaRoutes);
app.use('/elegibilidad', checkSession, requireAuth, elegibilidadRoutes);
app.use('/previas', checkSession, requireAuth, previasRoutes);

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
  
  console.log('Usuario autenticado, renderizando dashboard');
  res.render('dashboard', { 
    title: 'Dashboard - MATRICULATEC',
    usuario: req.usuario,
    isAuthenticated: true
  });
});

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
