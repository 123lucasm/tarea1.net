const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../models/Usuario');

// Configurar estrategia de Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔍 Perfil de Google recibido:', profile);
        
        // Buscar usuario existente por Google ID
        let usuario = await Usuario.findOne({ googleId: profile.id });
        
        if (usuario) {
            console.log('✅ Usuario existente encontrado:', usuario.email);
            return done(null, usuario);
        }
        
        // Buscar usuario existente por email
        usuario = await Usuario.findOne({ email: profile.emails[0].value });
        
        if (usuario) {
            // Vincular cuenta de Google a usuario existente
            usuario.googleId = profile.id;
            usuario.avatar = profile.photos[0].value;
            await usuario.save();
            console.log('✅ Cuenta de Google vinculada a usuario existente:', usuario.email);
            return done(null, usuario);
        }
        
        // Crear nuevo usuario
        // Generar cédula única para usuarios de Google
        const cedulaGoogle = `G${profile.id.slice(-8)}`;
        
        const nuevoUsuario = new Usuario({
            googleId: profile.id,
            email: profile.emails[0].value,
            nombre: profile.name.givenName,
            apellido: profile.name.familyName,
            cedula: cedulaGoogle, // Cédula única generada
            avatar: profile.photos[0].value,
            rol: 'estudiante', // Rol por defecto
            activo: true,
            ultimoAcceso: new Date()
        });
        
        await nuevoUsuario.save();
        console.log('✅ Nuevo usuario creado con Google:', nuevoUsuario.email);
        
        return done(null, nuevoUsuario);
        
    } catch (error) {
        console.error('❌ Error en autenticación con Google:', error);
        return done(error, null);
    }
}));

// Serializar usuario para la sesión
passport.serializeUser((usuario, done) => {
    done(null, usuario._id);
});

// Deserializar usuario de la sesión
passport.deserializeUser(async (id, done) => {
    try {
        const usuario = await Usuario.findById(id);
        done(null, usuario);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
