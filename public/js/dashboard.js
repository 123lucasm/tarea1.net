// Variables globales
let socket;
let estadisticasUsuario = {};

// Inicializar Socket.IO
function inicializarSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('✅ Conectado al servidor Socket.IO');
    });
    
    socket.on('disconnect', function() {
        console.log('❌ Desconectado del servidor Socket.IO');
    });
    
    // Escuchar actualizaciones de materias cursadas
    socket.on('materiasCursadasActualizadas', function(data) {
        console.log('📚 Materias cursadas actualizadas:', data);
        cargarEstadisticas();
    });
}

// Cargar estadísticas del usuario desde la API
async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/estadisticas-dashboard');
        if (response.ok) {
            estadisticasUsuario = await response.json();
            console.log('✅ Estadísticas cargadas:', estadisticasUsuario);
            renderizarEstadisticas();
        } else {
            console.error('❌ Error cargando estadísticas:', response.status);
            mostrarEstadisticasVacias();
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
        mostrarEstadisticasVacias();
    }
}

// Renderizar estadísticas del usuario
function renderizarEstadisticas() {
    const container = document.getElementById('estadisticasUsuario');
    
    if (!estadisticasUsuario || Object.keys(estadisticasUsuario).length === 0) {
        mostrarEstadisticasVacias();
        return;
    }
    
    const estadisticasHTML = `
        <!-- Estadísticas principales -->
        <div class="grid grid-cols-2 gap-6 mb-6">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-blue-600">Materias Aprobadas</p>
                        <p class="text-3xl font-bold text-blue-900">${estadisticasUsuario.totalMaterias || 0}</p>
                    </div>
                    <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-graduation-cap text-white text-xl"></i>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-green-600">Créditos Obtenidos</p>
                        <p class="text-3xl font-bold text-green-900">${estadisticasUsuario.creditosAprobados || 0}</p>
                    </div>
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-certificate text-white text-xl"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Promedio y progreso académico -->
        <div class="grid grid-cols-2 gap-6 mb-6">
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-purple-600">Promedio General</p>
                        <p class="text-3xl font-bold text-purple-900">${estadisticasUsuario.promedioGeneral || 0}</p>
                    </div>
                    <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-star text-white text-xl"></i>
                    </div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-indigo-600">Progreso Académico</p>
                        <p class="text-3xl font-bold text-indigo-900">${estadisticasUsuario.progresoAcademico || 0}%</p>
                    </div>
                    <div class="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-chart-pie text-white text-xl"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Materias en curso -->
        ${estadisticasUsuario.materiasEnCurso && estadisticasUsuario.materiasEnCurso.length > 0 ? `
        <div class="bg-gray-50 rounded-2xl p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i class="fas fa-book-open mr-2 text-indigo-600"></i>
                Materias en Curso
            </h4>
            <div class="space-y-2">
                ${estadisticasUsuario.materiasEnCurso.map(materia => `
                    <div class="flex items-center justify-between bg-white rounded-xl p-3">
                        <div>
                            <p class="font-medium text-gray-900">${materia.codigo}</p>
                            <p class="text-sm text-gray-600">${materia.nombre}</p>
                        </div>
                        <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    container.innerHTML = estadisticasHTML;
}

// Mostrar estadísticas vacías
function mostrarEstadisticasVacias() {
    const container = document.getElementById('estadisticasUsuario');
    container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-chart-line text-4xl mb-4"></i>
            <p>No hay estadísticas disponibles</p>
            <p class="text-sm">Las estadísticas aparecerán cuando tengas materias cursadas</p>
        </div>
    `;
}

// Actualizar estadísticas
async function actualizarEstadisticas() {
    try {
        const response = await fetch('/api/estadisticas-dashboard');
        if (response.ok) {
            const stats = await response.json();
            estadisticasUsuario = stats;
            renderizarEstadisticas();
            console.log('📊 Estadísticas actualizadas:', stats);
        }
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando dashboard...');
    inicializarSocket();
    cargarEstadisticas();
});

// Hacer funciones disponibles globalmente
window.actualizarEstadisticas = actualizarEstadisticas;