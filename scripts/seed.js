const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Usuario = require('../models/Usuario');
const Materia = require('../models/Materia');
const HistorialAcademico = require('../models/HistorialAcademico');
const Previa = require('../models/Previa');

// Datos de prueba
const usuariosPrueba = [
    {
        email: 'admin@universidad.edu',
        password: 'admin123',
        nombre: 'Administrador',
        apellido: 'Sistema',
        rol: 'administrador',
        cedula: '12345678'
    },
    {
        email: 'estudiante1@universidad.edu',
        password: 'estudiante123',
        nombre: 'Juan',
        apellido: 'Pérez',
        rol: 'estudiante',
        cedula: '87654321'
    },
    {
        email: 'estudiante2@universidad.edu',
        password: 'estudiante123',
        nombre: 'María',
        apellido: 'González',
        rol: 'estudiante',
        cedula: '11223344'
    }
];

const materiasPrueba = [
    // SEMESTRE 1 - Sin prerrequisitos
    {
        codigo: 'ARQ101',
        nombre: 'Arquitectura',
        descripcion: 'Fundamentos de arquitectura de computadoras',
        creditos: 4,
        semestre: 1,
        anio: 2024,
        horarios: [
            {
                dia: 'lunes',
                horaInicio: '08:00',
                horaFin: '10:00',
                tipo: 'teorico',
                aula: 'A101'
            },
            {
                dia: 'miércoles',
                horaInicio: '08:00',
                horaFin: '10:00',
                tipo: 'practico',
                aula: 'LAB101'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 40,
        cupoDisponible: 35,
        activa: true,
        profesor: {
            nombre: 'Dr. Carlos Rodríguez',
            email: 'crodriguez@universidad.edu'
        }
    },
    {
        codigo: 'DIS101',
        nombre: 'Discreta y Lógica 1',
        descripcion: 'Matemática discreta y lógica matemática',
        creditos: 6,
        semestre: 1,
        anio: 2024,
        horarios: [
            {
                dia: 'martes',
                horaInicio: '10:00',
                horaFin: '12:00',
                tipo: 'teorico',
                aula: 'A102'
            },
            {
                dia: 'jueves',
                horaInicio: '10:00',
                horaFin: '12:00',
                tipo: 'practico',
                aula: 'LAB201'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 45,
        cupoDisponible: 40,
        activa: true,
        profesor: {
            nombre: 'Dra. Ana Martínez',
            email: 'amartinez@universidad.edu'
        }
    },
    {
        codigo: 'PROG101',
        nombre: 'Principios de Programación',
        descripcion: 'Introducción a la programación básica',
        creditos: 6,
        semestre: 1,
        anio: 2024,
        horarios: [
            {
                dia: 'viernes',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'teorico',
                aula: 'A103'
            },
            {
                dia: 'sábado',
                horaInicio: '09:00',
                horaFin: '11:00',
                tipo: 'practico',
                aula: 'LAB301'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 50,
        cupoDisponible: 45,
        activa: true,
        profesor: {
            nombre: 'Ing. Luis Fernández',
            email: 'lfernandez@universidad.edu'
        }
    },
    {
        codigo: 'MAT101',
        nombre: 'Matemática',
        descripcion: 'Matemática básica para ingeniería',
        creditos: 6,
        semestre: 1,
        anio: 2024,
        horarios: [
            {
                dia: 'lunes',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'teorico',
                aula: 'A104'
            },
            {
                dia: 'miércoles',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'practico',
                aula: 'LAB102'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 55,
        cupoDisponible: 50,
        activa: true,
        profesor: {
            nombre: 'Dr. Roberto Silva',
            email: 'rsilva@universidad.edu'
        }
    },
    {
        codigo: 'ING101',
        nombre: 'Inglés Técnico',
        descripcion: 'Inglés técnico para ingeniería',
        creditos: 3,
        semestre: 1,
        anio: 2024,
        horarios: [
            {
                dia: 'martes',
                horaInicio: '16:00',
                horaFin: '18:00',
                tipo: 'teorico',
                aula: 'A105'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 60,
        cupoDisponible: 55,
        activa: true,
        profesor: {
            nombre: 'Prof. María González',
            email: 'mgonzalez@universidad.edu'
        }
    },

    // SEMESTRE 2 - Requiere materias del Semestre 1 (Curso Aprobado)
    {
        codigo: 'SO201',
        nombre: 'Sistemas Operativos',
        descripcion: 'Fundamentos de sistemas operativos',
        creditos: 6,
        semestre: 2,
        anio: 2024,
        horarios: [
            {
                dia: 'lunes',
                horaInicio: '08:00',
                horaFin: '10:00',
                tipo: 'teorico',
                aula: 'A201'
            },
            {
                dia: 'miércoles',
                horaInicio: '08:00',
                horaFin: '10:00',
                tipo: 'practico',
                aula: 'LAB201'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 40,
        cupoDisponible: 35,
        activa: true,
        profesor: {
            nombre: 'Dr. Carlos Rodríguez',
            email: 'crodriguez@universidad.edu'
        }
    },
    {
        codigo: 'DIS201',
        nombre: 'Discreta y Lógica 2',
        descripcion: 'Matemática discreta avanzada',
        creditos: 6,
        semestre: 2,
        anio: 2024,
        horarios: [
            {
                dia: 'martes',
                horaInicio: '10:00',
                horaFin: '12:00',
                tipo: 'teorico',
                aula: 'A202'
            },
            {
                dia: 'jueves',
                horaInicio: '10:00',
                horaFin: '12:00',
                tipo: 'practico',
                aula: 'LAB202'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 45,
        cupoDisponible: 40,
        activa: true,
        profesor: {
            nombre: 'Dra. Ana Martínez',
            email: 'amartinez@universidad.edu'
        }
    },
    {
        codigo: 'EDA201',
        nombre: 'Estructuras de Datos y Algoritmos',
        descripcion: 'Estructuras de datos y algoritmos básicos',
        creditos: 6,
        semestre: 2,
        anio: 2024,
        horarios: [
            {
                dia: 'viernes',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'teorico',
                aula: 'A203'
            },
            {
                dia: 'sábado',
                horaInicio: '09:00',
                horaFin: '11:00',
                tipo: 'practico',
                aula: 'LAB301'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 50,
        cupoDisponible: 45,
        activa: true,
        profesor: {
            nombre: 'Ing. Luis Fernández',
            email: 'lfernandez@universidad.edu'
        }
    },
    {
        codigo: 'BD201',
        nombre: 'Bases de Datos 1',
        descripcion: 'Fundamentos de bases de datos',
        creditos: 6,
        semestre: 2,
        anio: 2024,
        horarios: [
            {
                dia: 'lunes',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'teorico',
                aula: 'A204'
            },
            {
                dia: 'miércoles',
                horaInicio: '14:00',
                horaFin: '16:00',
                tipo: 'practico',
                aula: 'LAB202'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 45,
        cupoDisponible: 40,
        activa: true,
        profesor: {
            nombre: 'Dr. Roberto Silva',
            email: 'rsilva@universidad.edu'
        }
    },
    {
        codigo: 'ING201',
        nombre: 'Inglés Técnico 2',
        descripcion: 'Inglés técnico avanzado',
        creditos: 3,
        semestre: 2,
        anio: 2024,
        horarios: [
            {
                dia: 'martes',
                horaInicio: '16:00',
                horaFin: '18:00',
                tipo: 'teorico',
                aula: 'A205'
            }
        ],
        requisitosPrevios: [],
        cupoMaximo: 60,
        cupoDisponible: 55,
        activa: true,
        profesor: {
            nombre: 'Prof. María González',
            email: 'mgonzalez@universidad.edu'
        }
    }
];

const historialPrueba = [
    {
        estudiante: null, // Se asignará después
        materia: null, // Se asignará después
        estado: 'aprobado',
        notaCurso: 4,
        notaExamen: 4,
        notaFinal: 4,
        semestre: 1,
        anio: 2023,
        fechaAprobacion: new Date('2023-12-15'),
        creditosObtenidos: 6
    },
    {
        estudiante: null, // Se asignará después
        materia: null, // Se asignará después
        estado: 'aprobado',
        notaCurso: 5,
        notaExamen: 4,
        notaFinal: 4,
        semestre: 1,
        anio: 2023,
        fechaAprobacion: new Date('2023-12-20'),
        creditosObtenidos: 6
    },
    {
        estudiante: null, // Se asignará después
        materia: null, // Se asignará después
        estado: 'aprobado',
        notaCurso: 4,
        notaExamen: 5,
        notaFinal: 5,
        semestre: 1,
        anio: 2023,
        fechaAprobacion: new Date('2023-12-18'),
        creditosObtenidos: 4
    }
];

// Función principal de seed
async function seed() {
    try {
        console.log('🌱 Iniciando proceso de seed...');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sistema_elegibilidad');
        console.log('✅ Conectado a MongoDB');
        
        // Limpiar base de datos
        console.log('🧹 Limpiando base de datos...');
        await Usuario.deleteMany({});
        await Materia.deleteMany({});
        await HistorialAcademico.deleteMany({});
        console.log('✅ Base de datos limpiada');
        
        // Crear usuarios
        console.log('👥 Creando usuarios...');
        const usuariosCreados = [];
        for (const usuarioData of usuariosPrueba) {
            const usuario = new Usuario(usuarioData);
            await usuario.save();
            usuariosCreados.push(usuario);
            console.log(`✅ Usuario creado: ${usuario.email}`);
        }
        
        // Crear materias
        console.log('📚 Creando materias...');
        const materiasCreadas = [];
        for (const materiaData of materiasPrueba) {
            const materia = new Materia(materiaData);
            await materia.save();
            materiasCreadas.push(materia);
            console.log(`✅ Materia creada: ${materia.nombre}`);
        }
        
        // Crear previas según el plan de estudios
        console.log('🔗 Creando previas...');
        
        const admin = usuariosCreados.find(u => u.rol === 'administrador');
        
        // Previas del Semestre 2 (requieren materias del Semestre 1)
        const previasSemestre2 = [
            {
                materia: materiasCreadas.find(m => m.codigo === 'SO201')._id,
                materiaRequerida: materiasCreadas.find(m => m.codigo === 'ARQ101')._id,
                tipo: 'curso_aprobado',
                notaMinima: 3,
                creadoPor: admin._id
            },
            {
                materia: materiasCreadas.find(m => m.codigo === 'DIS201')._id,
                materiaRequerida: materiasCreadas.find(m => m.codigo === 'DIS101')._id,
                tipo: 'curso_aprobado',
                notaMinima: 3,
                creadoPor: admin._id
            },
            {
                materia: materiasCreadas.find(m => m.codigo === 'EDA201')._id,
                materiaRequerida: materiasCreadas.find(m => m.codigo === 'PROG101')._id,
                tipo: 'curso_aprobado',
                notaMinima: 3,
                creadoPor: admin._id
            },
            {
                materia: materiasCreadas.find(m => m.codigo === 'BD201')._id,
                materiaRequerida: materiasCreadas.find(m => m.codigo === 'MAT101')._id,
                tipo: 'curso_aprobado',
                notaMinima: 3,
                creadoPor: admin._id
            }
        ];
        
        for (const previaData of previasSemestre2) {
            const previa = new Previa(previaData);
            await previa.save();
            console.log(`✅ Previa creada: ${previaData.materia} requiere ${previaData.materiaRequerida} (${previaData.tipo})`);
        }
        
        // Crear historial académico
        console.log('📊 Creando historial académico...');
        const estudiante1 = usuariosCreados.find(u => u.cedula === '87654321');
        const arq101Hist = materiasCreadas.find(m => m.codigo === 'ARQ101');
        const dis101Hist = materiasCreadas.find(m => m.codigo === 'DIS101');
        const prog101Hist = materiasCreadas.find(m => m.codigo === 'PROG101');
        
        if (estudiante1 && arq101Hist) {
            const historial1 = new HistorialAcademico({
                ...historialPrueba[0],
                estudiante: estudiante1._id,
                materia: arq101Hist._id
            });
            await historial1.save();
            console.log('✅ Historial creado: 87654321 - ARQ101');
        }
        
        if (estudiante1 && dis101Hist) {
            const historial2 = new HistorialAcademico({
                ...historialPrueba[1],
                estudiante: estudiante1._id,
                materia: dis101Hist._id
            });
            await historial2.save();
            console.log('✅ Historial creado: 87654321 - DIS101');
        }
        
        if (estudiante1 && prog101Hist) {
            const historial3 = new HistorialAcademico({
                ...historialPrueba[2],
                estudiante: estudiante1._id,
                materia: prog101Hist._id
            });
            await historial3.save();
            console.log('✅ Historial creado: 87654321 - PROG101');
        }
        
        console.log('\n🎉 ¡Seed completado exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   👥 Usuarios creados: ${usuariosCreados.length}`);
        console.log(`   📚 Materias creadas: ${materiasCreadas.length}`);
        console.log(`   🔗 Previas creadas: ${previasSemestre2.length}`);
        console.log(`   📊 Historiales creados: 3`);
        
        console.log('\n🔑 Credenciales de prueba:');
        console.log('   👨‍💼 Admin: admin@universidad.edu / admin123');
        console.log('   👨‍🎓 Estudiante 1: estudiante1@universidad.edu / estudiante123 (Cédula: 87654321)');
        console.log('   👩‍🎓 Estudiante 2: estudiante2@universidad.edu / estudiante123 (Cédula: 11223344)');
        
        console.log('\n🚀 Puedes iniciar la aplicación con: npm run dev');
        
    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
    seed();
}

module.exports = seed;
