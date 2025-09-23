const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Usuario = require('../models/Usuario');
const Materia = require('../models/Materia');
const Semestre = require('../models/Semestre');

// Función para probar la API
async function testAPI() {
    try {
        console.log('🧪 Iniciando prueba de API...');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_elegibilidad');
        console.log('✅ Conectado a MongoDB');
        
        // Verificar si hay usuarios
        const usuarios = await Usuario.find({});
        console.log(`👥 Usuarios encontrados: ${usuarios.length}`);
        
        // Verificar si hay semestres
        const semestres = await Semestre.find({});
        console.log(`📅 Semestres encontrados: ${semestres.length}`);
        
        // Verificar si hay materias
        const materias = await Materia.find({});
        console.log(`📚 Materias encontradas: ${materias.length}`);
        
        // Si no hay semestres, crear algunos
        if (semestres.length === 0) {
            console.log('⚠️ No hay semestres, creando...');
            
            const semestre1 = new Semestre({
                numero: 1,
                nombre: 'Primer Semestre',
                orden: 1,
                activo: true
            });
            await semestre1.save();
            console.log('✅ Semestre 1 creado');
            
            const semestre2 = new Semestre({
                numero: 2,
                nombre: 'Segundo Semestre',
                orden: 2,
                activo: true
            });
            await semestre2.save();
            console.log('✅ Semestre 2 creado');
        }
        
        // Si no hay materias, crear algunas
        if (materias.length === 0) {
            console.log('⚠️ No hay materias, creando...');
            
            const semestre1 = await Semestre.findOne({ numero: 1 });
            const semestre2 = await Semestre.findOne({ numero: 2 });
            
            const materiasPrueba = [
                {
                    codigo: 'PROG101',
                    nombre: 'Programación I',
                    descripcion: 'Introducción a la programación',
                    creditos: 6,
                    semestre: semestre1._id,
                    activa: true,
                    cupoMaximo: 50,
                    cupoDisponible: 45
                },
                {
                    codigo: 'MAT101',
                    nombre: 'Matemática I',
                    descripcion: 'Matemática básica',
                    creditos: 6,
                    semestre: semestre1._id,
                    activa: true,
                    cupoMaximo: 50,
                    cupoDisponible: 40
                },
                {
                    codigo: 'PROG201',
                    nombre: 'Programación II',
                    descripcion: 'Programación avanzada',
                    creditos: 6,
                    semestre: semestre2._id,
                    activa: true,
                    cupoMaximo: 40,
                    cupoDisponible: 35
                }
            ];
            
            for (const materiaData of materiasPrueba) {
                const materia = new Materia(materiaData);
                await materia.save();
                console.log(`✅ Materia creada: ${materia.codigo}`);
            }
        }
        
        // Verificar que todo esté bien
        const materiasFinales = await Materia.find({ activa: true })
            .populate('semestre', 'nombre numero orden');
            
        console.log('\n📊 Estado final:');
        console.log(`   📚 Materias activas: ${materiasFinales.length}`);
        console.log(`   👥 Usuarios: ${usuarios.length}`);
        console.log(`   📅 Semestres: ${semestres.length}`);
        
        if (materiasFinales.length > 0) {
            console.log('\n📋 Materias disponibles:');
            materiasFinales.forEach(materia => {
                console.log(`   • ${materia.codigo} - ${materia.nombre} (Semestre ${materia.semestre?.numero || 'N/A'})`);
            });
        }
        
        console.log('\n🎉 ¡Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testAPI();
}

module.exports = testAPI;


