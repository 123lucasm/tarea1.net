const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Usuario = require('../models/Usuario');
const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');
const Previa = require('../models/Previa');
const ElegibilidadService = require('../services/elegibilidadService');

// Función para probar el sistema de materias cursadas
async function testMateriasCursadas() {
    try {
        console.log('🧪 Iniciando prueba del sistema de materias cursadas...');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_elegibilidad');
        console.log('✅ Conectado a MongoDB');
        
        // Buscar un estudiante de prueba
        const estudiante = await Usuario.findOne({ rol: 'estudiante' });
        if (!estudiante) {
            console.log('❌ No se encontró ningún estudiante de prueba');
            return;
        }
        
        console.log(`👨‍🎓 Estudiante de prueba: ${estudiante.nombre} ${estudiante.apellido}`);
        
        // Obtener algunas materias del semestre 1 (que no requieren previas)
        const materiasSemestre1 = await Materia.find({ 
            activa: true,
            'semestre.numero': 1 
        }).limit(3);
        
        if (materiasSemestre1.length === 0) {
            console.log('❌ No se encontraron materias del semestre 1');
            return;
        }
        
        console.log(`📚 Materias del semestre 1 encontradas: ${materiasSemestre1.length}`);
        
        // Simular que el estudiante cursó algunas materias del semestre 1
        const materiasCursadas = materiasSemestre1.map(m => m._id.toString());
        console.log(`✅ Simulando que el estudiante cursó: ${materiasCursadas.length} materias`);
        
        // Crear historial académico para estas materias
        for (const materia of materiasSemestre1) {
            const historial = new HistorialAcademico({
                estudiante: estudiante._id,
                materia: materia._id,
                estado: 'aprobado',
                notaCurso: 4,
                notaExamen: 4,
                notaFinal: 4,
                semestre: 1,
                anio: 2024,
                fechaAprobacion: new Date(),
                creditosObtenidos: materia.creditos
            });
            
            await historial.save();
            console.log(`📝 Historial creado: ${materia.codigo} - ${materia.nombre}`);
        }
        
        // Probar el servicio de elegibilidad
        console.log('\n🔍 Probando servicio de elegibilidad...');
        const elegibilidad = await ElegibilidadService.obtenerMateriasElegiblesPorCursadas(materiasCursadas);
        
        console.log('\n📊 Resultados:');
        console.log(`   ✅ Materias elegibles: ${elegibilidad.totalElegibles}`);
        console.log(`   ❌ Materias no elegibles: ${elegibilidad.totalNoElegibles}`);
        console.log(`   📖 Materias cursadas: ${elegibilidad.totalCursadas}`);
        
        // Mostrar algunas materias elegibles
        if (elegibilidad.materiasElegibles.length > 0) {
            console.log('\n🎯 Materias que puede cursar:');
            elegibilidad.materiasElegibles.slice(0, 3).forEach(materia => {
                console.log(`   • ${materia.codigo} - ${materia.nombre} (${materia.creditos} créditos)`);
            });
        }
        
        // Mostrar algunas materias no elegibles
        if (elegibilidad.materiasNoElegibles.length > 0) {
            console.log('\n🚫 Materias que no puede cursar:');
            elegibilidad.materiasNoElegibles.slice(0, 3).forEach(materia => {
                console.log(`   • ${materia.codigo} - ${materia.nombre} (${materia.elegibilidad.causa})`);
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
    testMateriasCursadas();
}

module.exports = testMateriasCursadas;

