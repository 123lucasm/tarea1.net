const mongoose = require('mongoose');
const Semestre = require('../models/Semestre');
const Materia = require('../models/Materia');
const Previa = require('../models/Previa');

// Configuración de conexión a MongoDB
require('dotenv').config();
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tarea1_net';

// Datos de los semestres según el diagrama
const semestresData = [
  {
    numero: 1,
    nombre: 'Primer Semestre',
    descripcion: 'Semestre inicial de la carrera',
    orden: 1,
    creditosRequeridos: 0
  },
  {
    numero: 2,
    nombre: 'Segundo Semestre',
    descripcion: 'Segundo semestre de la carrera',
    orden: 2,
    creditosRequeridos: 0
  },
  {
    numero: 3,
    nombre: 'Tercer Semestre',
    descripcion: 'Tercer semestre de la carrera',
    orden: 3,
    creditosRequeridos: 0
  },
  {
    numero: 4,
    nombre: 'Cuarto Semestre',
    descripcion: 'Cuarto semestre de la carrera',
    orden: 4,
    creditosRequeridos: 0
  },
  {
    numero: 5,
    nombre: 'Quinto Semestre',
    descripcion: 'Quinto semestre de la carrera',
    orden: 5,
    creditosRequeridos: 0
  },
  {
    numero: 6,
    nombre: 'Sexto Semestre',
    descripcion: 'Sexto semestre de la carrera',
    orden: 6,
    creditosRequeridos: 0
  }
];

// Datos de las materias según el diagrama
const materiasData = [
  // Semestre 1
  { codigo: 'ARQ001', nombre: 'Arquitectura', creditos: 3, semestre: 1 },
  { codigo: 'DL001', nombre: 'Discreta y Lógica 1', creditos: 4, semestre: 1 },
  { codigo: 'PP001', nombre: 'Principios de Programación', creditos: 4, semestre: 1 },
  { codigo: 'MAT001', nombre: 'Matemática', creditos: 4, semestre: 1 },
  { codigo: 'IT001', nombre: 'Inglés Técnico', creditos: 2, semestre: 1 },
  
  // Semestre 2
  { codigo: 'SO001', nombre: 'Sistemas Operativos', creditos: 4, semestre: 2 },
  { codigo: 'DL002', nombre: 'Discreta y Lógica 2', creditos: 4, semestre: 2 },
  { codigo: 'EDA001', nombre: 'Estructuras de Datos y Algoritmos', creditos: 4, semestre: 2 },
  { codigo: 'BD001', nombre: 'Bases de Datos 1', creditos: 4, semestre: 2 },
  { codigo: 'IT002', nombre: 'Inglés Técnico 2', creditos: 2, semestre: 2 },
  
  // Semestre 3
  { codigo: 'RC001', nombre: 'Redes de Computadoras', creditos: 4, semestre: 3 },
  { codigo: 'PA001', nombre: 'Programación Avanzada', creditos: 4, semestre: 3 },
  { codigo: 'BD002', nombre: 'Bases de Datos 2', creditos: 4, semestre: 3 },
  { codigo: 'COE001', nombre: 'Comunicación Oral y Escrita', creditos: 3, semestre: 3 },
  { codigo: 'CON001', nombre: 'Contabilidad', creditos: 3, semestre: 3 },
  
  // Semestre 4
  { codigo: 'AI001', nombre: 'Administración de Infraestructura', creditos: 4, semestre: 4 },
  { codigo: 'PE001', nombre: 'Probabilidad y Estadística', creditos: 4, semestre: 4 },
  { codigo: 'IS001', nombre: 'Ingeniería de Software', creditos: 4, semestre: 4 },
  { codigo: 'PAP001', nombre: 'Programación de Aplicaciones', creditos: 4, semestre: 4 },
  { codigo: 'RPL001', nombre: 'Relaciones Personales y Laborales', creditos: 3, semestre: 4 },
  
  // Semestre 5
  { codigo: 'TAI001', nombre: 'Taller de Aplicaciones de Internet Ricas', creditos: 4, semestre: 5 },
  { codigo: 'TSJ001', nombre: 'Taller de Sistemas de Información Java EE', creditos: 4, semestre: 5 },
  { codigo: 'AI002', nombre: 'Administración de Infraestructuras 2', creditos: 4, semestre: 5 },
  { codigo: 'PL001', nombre: 'Pasantía Laboral', creditos: 3, semestre: 5 },
  { codigo: 'TDP001', nombre: 'Taller de Desarrollo de Aplicaciones Web con PHP', creditos: 4, semestre: 5 },
  { codigo: 'TAD001', nombre: 'Taller de Aplicaciones Para Dispositivos Móviles', creditos: 4, semestre: 5 },
  
  // Semestre 6
  { codigo: 'SGC001', nombre: 'Sistemas de Gestión de Contenidos', creditos: 4, semestre: 6 },
  { codigo: 'TSN001', nombre: 'Taller de Sistemas de Información .NET', creditos: 4, semestre: 6 },
  { codigo: 'ISC001', nombre: 'Introducción a los Sistemas de Control', creditos: 4, semestre: 6 },
  { codigo: 'PRO001', nombre: 'Proyecto', creditos: 6, semestre: 6 },
  { codigo: 'TGI001', nombre: 'Taller de Gestión de la Innovación en Tecnologías', creditos: 3, semestre: 6 },
  { codigo: 'IDJ001', nombre: 'Introducción al Desarrollo de Juegos', creditos: 4, semestre: 6 }
];

// Datos de las previas según el diagrama
const previasData = [
  // Semestre 2 - Sistemas Operativos requiere Arquitectura (curso aprobado)
  { materia: 'SO001', materiaRequerida: 'ARQ001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 2 - Discreta y Lógica 2 requiere Discreta y Lógica 1 (curso aprobado)
  { materia: 'DL002', materiaRequerida: 'DL001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 2 - Estructuras de Datos requiere Principios de Programación Y Discreta y Lógica 1 (curso aprobado)
  { materia: 'EDA001', materiaRequerida: 'PP001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'EDA001', materiaRequerida: 'DL001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 2 - Bases de Datos 1 requiere Matemática (curso aprobado)
  { materia: 'BD001', materiaRequerida: 'MAT001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 2 - Inglés Técnico 2 requiere Inglés Técnico (curso aprobado)
  { materia: 'IT002', materiaRequerida: 'IT001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 3 - Redes requiere Sistemas Operativos (curso aprobado) Y Arquitectura (examen aprobado)
  { materia: 'RC001', materiaRequerida: 'SO001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'RC001', materiaRequerida: 'ARQ001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 3 - Programación Avanzada requiere Estructuras de Datos (curso aprobado) Y Principios de Programación (examen aprobado)
  { materia: 'PA001', materiaRequerida: 'EDA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PA001', materiaRequerida: 'PP001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 3 - Bases de Datos 2 requiere Bases de Datos 1 (curso aprobado) Y Estructuras de Datos (examen aprobado)
  { materia: 'BD002', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'BD002', materiaRequerida: 'EDA001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 4 - Administración de Infraestructura requiere Redes (curso aprobado) Y Sistemas Operativos (examen aprobado)
  { materia: 'AI001', materiaRequerida: 'RC001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'AI001', materiaRequerida: 'SO001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 4 - Probabilidad y Estadística requiere Discreta y Lógica 2 (examen aprobado) Y Matemática (examen aprobado)
  { materia: 'PE001', materiaRequerida: 'DL002', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PE001', materiaRequerida: 'MAT001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 4 - Ingeniería de Software requiere Programación Avanzada (curso aprobado) Y Estructuras de Datos (examen aprobado)
  { materia: 'IS001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'IS001', materiaRequerida: 'EDA001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 4 - Programación de Aplicaciones requiere Bases de Datos 2 (curso aprobado) Y Programación Avanzada (examen aprobado) Y Ingeniería de Software (curso aprobado)
  { materia: 'PAP001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PAP001', materiaRequerida: 'PA001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PAP001', materiaRequerida: 'IS001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 4 - Relaciones Personales y Laborales requiere Comunicación Oral y Escrita (examen aprobado) Y Inglés Técnico 2 (examen aprobado)
  { materia: 'RPL001', materiaRequerida: 'COE001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'RPL001', materiaRequerida: 'IT002', tipo: 'examen_aprobado', notaMinima: 3 },
  
  // Semestre 5 - Previas reales según especificación
  { materia: 'TAI001', materiaRequerida: 'PAP001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'TSJ001', materiaRequerida: 'PAP001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TSJ001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TSJ001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'AI002', materiaRequerida: 'ARQ001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'AI002', materiaRequerida: 'SO001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'AI002', materiaRequerida: 'RC001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'AI002', materiaRequerida: 'AI001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'PL001', materiaRequerida: 'PP001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'EDA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'ARQ001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'SO001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'RC001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'PL001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'TDP001', materiaRequerida: 'PAP001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TDP001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TDP001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'TAD001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TAD001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Semestre 6 - Previas reales según especificación
  { materia: 'SGC001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'SGC001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'TSN001', materiaRequerida: 'PAP001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TSN001', materiaRequerida: 'BD001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TSN001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'ISC001', materiaRequerida: 'ARQ001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'ISC001', materiaRequerida: 'SO001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'ISC001', materiaRequerida: 'RC001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'ISC001', materiaRequerida: 'AI001', tipo: 'curso_aprobado', notaMinima: 3 },
  
  // Proyecto requiere todas las materias de semestres 1-4 aprobadas (curso y examen)
  { materia: 'PRO001', materiaRequerida: 'ARQ001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'DL001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'PP001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'MAT001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'IT001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'SO001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'DL002', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'EDA001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'BD001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'IT002', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'RC001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'PA001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'BD002', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'COE001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'CON001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'AI001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'PE001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'IS001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'PAP001', tipo: 'examen_aprobado', notaMinima: 3 },
  { materia: 'PRO001', materiaRequerida: 'RPL001', tipo: 'examen_aprobado', notaMinima: 3 },
  
  { materia: 'TGI001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TGI001', materiaRequerida: 'DL002', tipo: 'curso_aprobado', notaMinima: 3 },
  { materia: 'TGI001', materiaRequerida: 'BD002', tipo: 'curso_aprobado', notaMinima: 3 },
  
  { materia: 'IDJ001', materiaRequerida: 'PA001', tipo: 'curso_aprobado', notaMinima: 3 }
];

async function seedSemestres() {
  try {
    console.log('🌱 Iniciando seed de semestres...');
    
    // Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout más corto
      socketTimeoutMS: 45000,
    });
    console.log('✅ Conectado a MongoDB exitosamente');
    
    // Limpiar colecciones existentes
    console.log('🧹 Limpiando colecciones existentes...');
    await Semestre.deleteMany({});
    await Materia.deleteMany({});
    await Previa.deleteMany({});
    console.log('✅ Colecciones limpiadas');
    
    // Crear semestres primero
    console.log('📚 Creando semestres...');
    const semestres = await Semestre.insertMany(semestresData);
    console.log(`✅ ${semestres.length} semestres creados`);
    
    // Crear un mapeo de número de semestre a ObjectId
    const semestreMap = {};
    semestres.forEach(semestre => {
      semestreMap[semestre.numero] = semestre._id;
    });
    
    // Preparar datos de materias con referencias correctas a semestres
    const materiasConReferencias = materiasData.map(materia => ({
      ...materia,
      semestre: semestreMap[materia.semestre] // Convertir número a ObjectId
    }));
    
    // Crear materias
    console.log('📖 Creando materias...');
    const materias = await Materia.insertMany(materiasConReferencias);
    console.log(`✅ ${materias.length} materias creadas`);
    
    // Actualizar semestres con las materias correspondientes
    console.log('🔗 Vinculando materias con semestres...');
    for (let i = 0; i < semestres.length; i++) {
      const semestre = semestres[i];
      const materiasDelSemestre = materias.filter(m => 
        m.semestre.toString() === semestre._id.toString()
      );
      
      for (const materia of materiasDelSemestre) {
        await semestre.agregarMateria(materia._id);
      }
      
      await semestre.save();
    }
    
    console.log('✅ Semestres actualizados con sus materias');
    
    // Crear previas
    console.log('🔗 Creando previas...');
    const previas = [];
    for (const previaData of previasData) {
      const materia = materias.find(m => m.codigo === previaData.materia);
      const materiaRequerida = materias.find(m => m.codigo === previaData.materiaRequerida);
      
      if (materia && materiaRequerida) {
        previas.push({
          materia: materia._id,
          materiaRequerida: materiaRequerida._id,
          tipo: previaData.tipo,
          notaMinima: previaData.notaMinima,
          creadoPor: '000000000000000000000000' // ID dummy para el admin
        });
      }
    }
    
    await Previa.insertMany(previas);
    console.log(`✅ ${previas.length} previas creadas`);
    
    console.log('🎉 Seed de semestres completado exitosamente!');
    
    // Mostrar resumen
    console.log('\n📊 RESUMEN DE LA BASE DE DATOS:');
    console.log(`   • Semestres: ${semestres.length}`);
    console.log(`   • Materias: ${materias.length}`);
    console.log(`   • Previas: ${previas.length}`);
    
    // Mostrar semestres creados
    console.log('\n📚 SEMESTRES CREADOS:');
    semestres.forEach(semestre => {
      const materiasDelSemestre = materias.filter(m => 
        m.semestre.toString() === semestre._id.toString()
      );
      console.log(`   • ${semestre.nombre}: ${materiasDelSemestre.length} materias`);
    });
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cerrar conexión
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
    process.exit(0);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedSemestres();
}

module.exports = seedSemestres;
