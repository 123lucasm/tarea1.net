const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const emailService = require('./emailService');

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

  // Generar código de verificación
  static generarCodigoVerificacion() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Registrar nuevo usuario
  static async registrarUsuario(userData) {
    try {
      // Verificar si el email ya existe
      const usuarioExistente = await Usuario.findOne({ email: userData.email });
      if (usuarioExistente) {
        throw new Error('El email ya está registrado');
      }

      // Verificar si la cédula ya existe
      if (userData.cedula) {
        const cedulaExistente = await Usuario.findOne({ cedula: userData.cedula });
        if (cedulaExistente) {
          throw new Error('La cédula ya está registrada');
        }
      }

      // Generar código de verificación
      const codigoVerificacion = this.generarCodigoVerificacion();
      const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Crear usuario con datos de verificación en una tabla temporal
      // No guardarlo en la tabla de usuarios hasta verificar
      const datosVerificacion = {
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email,
        password: userData.password,
        cedula: userData.cedula,
        rol: userData.rol || 'estudiante',
        verificacionCode: codigoVerificacion,
        codeExpiry: codeExpiry,
        fechaCreacion: new Date()
      };

      // Guardar los datos de registro en una colección temporal
      const tempUserDb = mongoose.connection.db.collection('tempRegistrations');
      await tempUserDb.insertOne(datosVerificacion);
      
      // NO crear el usuario en la tabla normal aún
      console.log('🕐 Usuario temporal registrado, esperando verificación de email');

      // Enviar código de verificación por email
      try {
        console.log('📧 Intentando enviar email de verificación...');
        
        // Intentar envío real SIEMPRE si las variables están configuradas
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          console.log('📤 Enviando email real...');
          await emailService.sendVerificationCode(
            datosVerificacion.email, 
            codigoVerificacion, 
            datosVerificacion.nombre
          );
          console.log('✅ Email enviado correctamente al usuario');
        } else {
          console.log('⚠️ Variables de email no configuradas, usando modo desarrollo');
          await emailService.sendVerificationCodeDevelopment(
            datosVerificacion.email, 
            codigoVerificacion, 
            datosVerificacion.nombre
          );
        }
      } catch (emailError) {
        console.error('❌ Error enviando email:', emailError);
        console.log('🔄 Reintentando en modo desarrollo como backup...');
        
        // Fallback a modo desarrollo si falla el email real
        try {
          await emailService.sendVerificationCodeDevelopment(
            datosVerificacion.email, 
            codigoVerificacion, 
            datosVerificacion.nombre
          );
        } catch (fallbackError) {
          console.error('❌ Error también en modo desarrollo:', fallbackError);
        }
      }

      return {
        usuario: {
          id: 'temp-' + Date.now(), // ID temporal
          email: datosVerificacion.email,
          nombre: datosVerificacion.nombre,
          apellido: datosVerificacion.apellido,
          rol: datosVerificacion.rol,
          verified: false
        },
        verificationRequired: true,
        message: 'Usuario registrado. Se ha enviado un código de verificación a tu email.'
      };
    } catch (error) {
      throw error;
    }
  }

  // Iniciar sesión
  static async iniciarSesion(email, password, conTokens = true) {
    try {
      console.log('🔐 AuthService: Iniciando sesión para email:', email);
      
      // Buscar usuario por email
      const usuario = await Usuario.findOne({ email });
      if (!usuario) {
        console.log('❌ AuthService: Usuario no encontrado para email:', email);
        throw new Error('Credenciales inválidas');
      }

      console.log('✅ AuthService: Usuario encontrado:', {
        id: usuario._id,
        email: usuario.email,
        nombre: usuario.nombre,
        tienePassword: !!usuario.password,
        tieneGoogleId: !!usuario.googleId,
        activo: usuario.activo,
        verified: usuario.verified
      });

      // Verificar contraseña
      const passwordValida = await usuario.compararPassword(password);
      console.log('🔑 AuthService: Verificación de contraseña:', passwordValida);
      console.log('🔑 AuthService: Password proporcionado:', password.substring(0, 3) + '***');
      console.log('🔑 AuthService: Hash en BD:', usuario.password ? usuario.password.substring(0, 20) + '...' : 'NO HAY');
      
      if (!passwordValida) {
        console.log('❌ AuthService: Contraseña inválida para usuario:', usuario.email);
        throw new Error('Credenciales inválidas');
      }

      // Verificar si el usuario está activo
      if (!usuario.activo) {
        console.log('❌ AuthService: Usuario inactivo:', usuario.email);
        throw new Error('Usuario inactivo');
      }

      // Verificar si el email está verificado (solo para usuarios normales)
      if (!usuario.googleId && !usuario.verified) {
        console.log('❌ AuthService: Email no verificado:', usuario.email);
        throw new Error('El email no ha sido verificado. Revisa tu correo para verificar tu cuenta.');
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

  // Verificar código de email
  static async verificarCodigoEmail(email, codigo) {
    try {
      console.log('🔍 Verificando código para email:', email);
      
      // Buscar datos temporales de registro
      const tempUserDb = mongoose.connection.db.collection('tempRegistrations');
      const tempUser = await tempUserDb.findOne({ email: email });

      if (!tempUser) {
        throw new Error('Usuario no encontrado o ya verificado');
      }

      console.log('📋 Datos temporales encontrados:', {
        email: tempUser.email,
        nombre: tempUser.nombre,
        hasVerificationCode: !!tempUser.verificacionCode
      });

      if (tempUser.verificacionCode !== codigo) {
        throw new Error('Código de verificación incorrecto');
      }

      if (tempUser.codeExpiry < new Date()) {
        // Eliminar registro temporal expirado
        await tempUserDb.deleteOne({ _id: tempUser._id });
        throw new Error('El código de verificación ha expirado. Solicita uno nuevo.');
      }

      // Crear el usuario real en la base de datos (dejar que el pre-save hook maneje el hashing)
      const usuario = new Usuario({
        nombre: tempUser.nombre,
        apellido: tempUser.apellido,
        email: tempUser.email,
        password: tempUser.password, // Texto plano - será hasheado automáticamente por el pre-save hook
        cedula: tempUser.cedula,
        rol: tempUser.rol || 'estudiante',
        activo: true,
        verified: true,
        ultimoAcceso: new Date()
      });

      await usuario.save();

      // Eliminar el registro temporal
      await tempUserDb.deleteOne({ _id: tempUser._id });

      console.log('✅ Usuario creado correctamente en base de datos');
      return { 
        success: true, 
        message: 'Email verificado y cuenta creada exitosamente',
        usuario: {
          id: usuario._id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido
        }
      };
    } catch (error) {
      console.error('❌ Error verificando código:', error.message);
      throw error;
    }
  }

  // Reenviar código de verificación
  static async reenviarCodigoVerificacion(email) {
    try {
      console.log('🔄 Reenviando código para email:', email);
      
      // Buscar datos temporales de registro
      const tempUserDb = mongoose.connection.db.collection('tempRegistrations');
      const tempUser = await tempUserDb.findOne({ email: email });

      if (!tempUser) {
        throw new Error('Usuario no encontrado o ya verificado');
      }

      // Generar nuevo código
      const codigoVerificacion = this.generarCodigoVerificacion();
      const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Actualizar código en registro temporal
      await tempUserDb.updateOne(
        { _id: tempUser._id },
        { 
          $set: { 
            verificacionCode: codigoVerificacion,
            codeExpiry: codeExpiry 
          }
        }
      );

      // Enviar nuevo código por email
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await emailService.sendVerificationCode(
            tempUser.email, 
            codigoVerificacion, 
            tempUser.nombre
          );
        } else {
          await emailService.sendVerificationCodeDevelopment(
            tempUser.email, 
            codigoVerificacion, 
            tempUser.nombre
          );
        }
      } catch (EmailError) {
        console.error('❌ Error reenviando email:', EmailError);
        throw new Error('Error enviando email de verificación');
      }

      return { success: true, message: 'Código de verificación reenviado' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;

