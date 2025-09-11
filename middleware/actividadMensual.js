const ActividadMensual = require('../models/ActividadMensual');

// Middleware para registrar actividad mensual
const registrarActividadMensual = async (req, res, next) => {
  try {
    // Solo registrar si hay un usuario autenticado
    if (!req.session || !req.session.userId) {
      return next();
    }

    const usuarioId = req.session.userId;
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1;
    const año = fechaActual.getFullYear();

    // Determinar el tipo de actividad basado en la ruta
    let tipoActividad = null;
    const ruta = req.path;
    const metodo = req.method;

    // Mapeo de rutas a tipos de actividad
    if (ruta.includes('/materias') && metodo === 'GET') {
      tipoActividad = 'materiasConsultadas';
    } else if (ruta.includes('/previas') && metodo === 'GET') {
      tipoActividad = 'previasConsultadas';
    } else if (ruta.includes('/semestres') && metodo === 'GET') {
      tipoActividad = 'semestresConsultados';
    } else if (ruta.includes('/perfil') && metodo === 'PUT') {
      tipoActividad = 'perfilActualizado';
    } else if (ruta === '/auth/login' && metodo === 'POST') {
      tipoActividad = 'logins';
    } else if (ruta === '/auth/logout' && metodo === 'GET') {
      tipoActividad = 'logouts';
    }

    // Solo registrar si es una actividad que queremos trackear
    if (tipoActividad) {
      console.log(`📊 Registrando actividad: ${tipoActividad} para usuario ${usuarioId}`);
      
      // Obtener o crear el registro de actividad mensual
      const actividadMensual = await ActividadMensual.obtenerOCrear(usuarioId, mes, año);
      
      // Registrar la actividad
      await actividadMensual.registrarActividad(tipoActividad);
      
      console.log(`✅ Actividad registrada: ${tipoActividad}`);
    }

    next();
  } catch (error) {
    console.error('❌ Error registrando actividad mensual:', error);
    // No interrumpir el flujo si hay error en el tracking
    next();
  }
};

// Middleware específico para registrar tiempo de sesión
const registrarTiempoSesion = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return next();
    }

    const usuarioId = req.session.userId;
    const fechaActual = new Date();
    const mes = fechaActual.getMonth() + 1;
    const año = fechaActual.getFullYear();

    // Calcular tiempo de sesión si hay un timestamp de login
    if (req.session.loginTime) {
      const tiempoSesion = Math.floor((fechaActual - new Date(req.session.loginTime)) / (1000 * 60)); // en minutos
      
      if (tiempoSesion > 0) {
        const actividadMensual = await ActividadMensual.obtenerOCrear(usuarioId, mes, año);
        await actividadMensual.registrarActividad('tiempoTotalSesion', tiempoSesion);
        
        console.log(`⏱️ Tiempo de sesión registrado: ${tiempoSesion} minutos`);
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error registrando tiempo de sesión:', error);
    next();
  }
};

// Middleware para establecer timestamp de login
const establecerTimestampLogin = (req, res, next) => {
  if (req.session && req.session.userId && !req.session.loginTime) {
    req.session.loginTime = new Date();
    console.log('🕐 Timestamp de login establecido');
  }
  next();
};

// Función para obtener estadísticas de un usuario específico
const obtenerEstadisticasUsuario = async (usuarioId, mes, año) => {
  try {
    const actividad = await ActividadMensual.findOne({
      usuario: usuarioId,
      mes: mes,
      año: año,
      activo: true
    });

    if (!actividad) {
      return {
        mes: mes,
        año: año,
        totalActividades: 0,
        actividades: {},
        ultimaActividad: null
      };
    }

    return actividad.obtenerEstadisticas();
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de usuario:', error);
    return null;
  }
};

// Función para obtener estadísticas globales del mes
const obtenerEstadisticasGlobales = async (mes, año) => {
  try {
    return await ActividadMensual.obtenerEstadisticasGlobales(mes, año);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas globales:', error);
    return null;
  }
};

// Función para obtener estadísticas de los últimos N meses
const obtenerEstadisticasHistoricas = async (meses = 6) => {
  try {
    const fechaActual = new Date();
    const estadisticas = [];

    for (let i = 0; i < meses; i++) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      const mes = fecha.getMonth() + 1;
      const año = fecha.getFullYear();

      const stats = await ActividadMensual.obtenerEstadisticasGlobales(mes, año);
      if (stats) {
        estadisticas.unshift(stats); // Agregar al inicio para mantener orden cronológico
      }
    }

    return estadisticas;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas históricas:', error);
    return [];
  }
};

module.exports = {
  registrarActividadMensual,
  registrarTiempoSesion,
  establecerTimestampLogin,
  obtenerEstadisticasUsuario,
  obtenerEstadisticasGlobales,
  obtenerEstadisticasHistoricas
};
