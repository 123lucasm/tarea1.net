const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

class AuthService {
  // Generar tokens JWT
  static generateTokens(userId, email, rol) {
    const accessToken = jwt.sign(
      { userId, email, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId, email, rol },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
  }

  // Registrar nuevo usuario
  static async registrarUsuario(userData) {
    try {
      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ email: userData.email });
      if (usuarioExistente) {
        throw new Error('El email ya está registrado');
      }

      // Verificar si el legajo ya existe (si se proporciona)
      if (userData.legajo) {
        const legajoExistente = await Usuario.findOne({ legajo: userData.legajo });
        if (legajoExistente) {
          throw new Error('El legajo ya está registrado');
        }
      }

      // Crear nuevo usuario
      const usuario = new Usuario(userData);
      await usuario.save();

      // Generar tokens
      const { accessToken, refreshToken } = this.generateTokens(
        usuario._id,
        usuario.email,
        usuario.rol
      );

      // Guardar refresh token en el usuario
      usuario.refreshToken = refreshToken;
      await usuario.save();

      return {
        usuario: {
          id: usuario._id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rol: usuario.rol,
          legajo: usuario.legajo
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      throw error;
    }
  }

  // Iniciar sesión
  static async iniciarSesion(email, password, conTokens = true) {
    try {
      // Buscar usuario por email
      const usuario = await Usuario.findOne({ email });
      if (!usuario) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const passwordValida = await usuario.compararPassword(password);
      if (!passwordValida) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar si el usuario está activo
      if (!usuario.activo) {
        throw new Error('Usuario inactivo');
      }

      // Si se requieren tokens (para API)
      if (conTokens) {
        // Generar tokens
        const { accessToken, refreshToken } = this.generateTokens(
          usuario._id,
          usuario.email,
          usuario.rol
        );

        // Actualizar refresh token y último acceso
        usuario.refreshToken = refreshToken;
        usuario.ultimoAcceso = new Date();
        await usuario.save();

        return {
          usuario: {
            id: usuario._id,
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol,
            legajo: usuario.legajo
          },
          accessToken,
          refreshToken
        };
      } else {
        // Solo para sesiones (sin tokens)
        usuario.ultimoAcceso = new Date();
        await usuario.save();

        return {
          usuario: {
            id: usuario._id,
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol,
            legajo: usuario.legajo
          }
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Renovar access token
  static async renovarToken(refreshToken) {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Buscar usuario
      const usuario = await Usuario.findById(decoded.userId);
      if (!usuario || usuario.refreshToken !== refreshToken) {
        throw new Error('Refresh token inválido');
      }

      // Generar nuevo access token
      const accessToken = jwt.sign(
        { userId: usuario._id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      return { accessToken };
    } catch (error) {
      throw error;
    }
  }

  // Cerrar sesión
  static async cerrarSesion(userId) {
    try {
      const usuario = await Usuario.findById(userId);
      if (usuario) {
        usuario.refreshToken = null;
        await usuario.save();
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Cambiar contraseña
  static async cambiarPassword(userId, passwordActual, passwordNueva) {
    try {
      const usuario = await Usuario.findById(userId);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const passwordValida = await usuario.compararPassword(passwordActual);
      if (!passwordValida) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Cambiar contraseña
      usuario.password = passwordNueva;
      await usuario.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verificar token
  static async verificarToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuario = await Usuario.findById(decoded.userId).select('-password');
      
      if (!usuario || !usuario.activo) {
        throw new Error('Usuario no válido');
      }

      return usuario;
    } catch (error) {
      throw error;
    }
  }

  // Obtener información del usuario
  static async obtenerUsuario(userId) {
    try {
      const usuario = await Usuario.findById(userId).select('-password -refreshToken');
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }
      return usuario;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;

