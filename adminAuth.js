const { checkSession } = require('./auth');

// Middleware para verificar que el usuario es administrador
const checkAdmin = (req, res, next) => {
  // Primero verificar que esté autenticado
  checkSession(req, res, (err) => {
    if (err) {
      return res.redirect('/auth/login');
    }
    
    // Verificar que sea administrador
    if (req.usuario && req.usuario.rol === 'administrador') {
      return next();
    }
    
    // Si no es administrador, redirigir al dashboard normal
    return res.redirect('/dashboard');
  });
};

// Middleware para APIs de administrador (devuelve JSON en lugar de redireccionar)
const checkAdminAPI = (req, res, next) => {
  // Primero verificar que esté autenticado
  checkSession(req, res, (err) => {
    if (err) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Verificar que sea administrador
    if (req.usuario && req.usuario.rol === 'administrador') {
      return next();
    }
    
    // Si no es administrador, devolver error JSON
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  });
};

module.exports = { checkAdmin, checkAdminAPI };
