const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
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
const { authenticateToken } = require('./middleware/auth');

// Configuración de middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

// Rutas públicas
app.use('/auth', authRoutes);

// Rutas protegidas
app.use('/materias', authenticateToken, materiaRoutes);
app.use('/elegibilidad', authenticateToken, elegibilidadRoutes);
app.use('/previas', authenticateToken, previasRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.render('index', { title: 'Sistema de Elegibilidad de Materias' });
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
