const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo
const Usuario = require('../models/Usuario');

async function actualizarUsuarios() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'tarea1_net'
    });
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar usuarios sin cédula
    const usuariosSinCedula = await Usuario.find({ 
      $or: [
        { cedula: { $exists: false } },
        { cedula: null },
        { cedula: '' }
      ]
    });

    console.log(`📊 Encontrados ${usuariosSinCedula.length} usuarios sin cédula`);

    if (usuariosSinCedula.length === 0) {
      console.log('✅ Todos los usuarios ya tienen cédula asignada');
      return;
    }

    // Actualizar usuarios existentes
    for (let i = 0; i < usuariosSinCedula.length; i++) {
      const usuario = usuariosSinCedula[i];
      
      // Generar cédula temporal basada en el ID
      const cedulaTemporal = `TEMP${usuario._id.toString().slice(-8)}`;
      
      await Usuario.findByIdAndUpdate(usuario._id, {
        cedula: cedulaTemporal
      });

      console.log(`✅ Usuario ${usuario.nombre} ${usuario.apellido} actualizado con cédula: ${cedulaTemporal}`);
    }

    console.log('\n🎉 ¡Actualización completada!');
    console.log('📋 Resumen:');
    console.log(`   👥 Usuarios actualizados: ${usuariosSinCedula.length}`);
    console.log('\n💡 Nota: Los usuarios tienen cédulas temporales. Deben actualizar sus cédulas reales.');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarUsuarios();
}

module.exports = actualizarUsuarios;
