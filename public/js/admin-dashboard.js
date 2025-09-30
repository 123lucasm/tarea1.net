// Admin Dashboard JavaScript
// Inicializar Socket.IO
const socket = io();

document.addEventListener('DOMContentLoaded', function() {
    // Cargar estadísticas
    cargarEstadisticas();
    
    // Cargar actividad reciente
    cargarActividadReciente();
    
    // Cargar últimos accesos
    cargarUltimosAccesos();
    
    
    // Actualizar fecha y hora
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Configurar eventos de Socket.IO
    configurarSocketEvents();
});

function configurarSocketEvents() {
    // Unirse a la sala de administradores
    socket.emit('join-room', 'admin');
    
    // Escuchar nuevos usuarios (desde registro público)
    socket.on('usuario_registrado', function(data) {
        console.log('Usuario registrado desde auth:', data);
        mostrarNotificacion('Nuevo usuario registrado', `${data.usuario.nombre} ${data.usuario.apellido} se registró como ${data.usuario.rol}`);
        cargarEstadisticas(); // Actualizar estadísticas
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar nuevos usuarios (desde panel admin)
    socket.on('nuevo-usuario', function(usuario) {
        console.log('Nuevo usuario creado desde admin:', usuario);
        mostrarNotificacion('Nuevo usuario creado', `${usuario.nombre} ${usuario.apellido} fue creado como ${usuario.rol}`);
        cargarEstadisticas(); // Actualizar estadísticas
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar nuevas materias
    socket.on('nueva-materia', function(materia) {
        console.log('Nueva materia creada:', materia);
        mostrarNotificacion('Nueva materia creada', `${materia.nombre} (${materia.codigo}) fue agregada`);
        cargarEstadisticas(); // Actualizar estadísticas
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar nuevos semestres
    socket.on('nuevo-semestre', function(data) {
        console.log('Nuevo semestre creado:', data);
        mostrarNotificacion('Nuevo semestre creado', `${data.semestre.nombre} fue agregado`);
        cargarEstadisticas(); // Actualizar estadísticas
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar login de usuarios
    socket.on('user-logged-in', function(data) {
        console.log('Usuario inició sesión:', data);
        mostrarNotificacion('Usuario conectado', `${data.usuario.nombre} ${data.usuario.apellido} inició sesión`);
        cargarUltimosAccesos(); // Actualizar últimos accesos
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar logout de usuarios
    socket.on('user-logged-out', function(data) {
        console.log('Usuario cerró sesión:', data);
        mostrarNotificacion('Usuario desconectado', `${data.usuario.nombre} ${data.usuario.apellido} cerró sesión`);
        cargarUltimosAccesos(); // Actualizar últimos accesos
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar actividad de usuarios
    socket.on('user-activity-update', function(data) {
        console.log('Actividad de usuario:', data);
        mostrarNotificacion('Actividad detectada', `${data.usuario.nombre} ${data.actividad}`);
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar confirmación de login
    socket.on('login-confirmed', function(data) {
        console.log('Login confirmado:', data);
        // No mostrar notificación para el propio usuario
    });
    
    // Escuchar actualización de último acceso
    socket.on('ultimo-acceso-actualizado', function(data) {
        console.log('Último acceso actualizado:', data);
        cargarUltimosAccesos(); // Actualizar últimos accesos
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar nuevas previas
    socket.on('nueva-previa', function(previa) {
        console.log('Nueva previa configurada:', previa);
        mostrarNotificacion('Nueva previa configurada', `${previa.materia.nombre} requiere ${previa.previa.nombre}`);
        cargarEstadisticas(); // Actualizar estadísticas
        cargarActividadReciente(); // Actualizar actividad
    });
    
    // Escuchar actualizaciones de actividad
    socket.on('actividad-actualizada', function() {
        console.log('Actividad actualizada');
        cargarActividadReciente();
    });
    
    // Verificar conexión
    socket.on('connect', function() {
        console.log('Conectado a Socket.IO');
        actualizarEstadoConexion('connected', 'Conectado');
    });
    
    socket.on('disconnect', function() {
        console.log('Desconectado de Socket.IO');
        actualizarEstadoConexion('disconnected', 'Desconectado');
    });
    
    socket.on('connect_error', function() {
        console.log('Error de conexión Socket.IO');
        actualizarEstadoConexion('error', 'Error');
    });
}

function actualizarEstadoConexion(estado, texto) {
    // Mapear estados a clases de Tailwind
    const estadoMap = {
        'connected': 'bg-green-500',
        'disconnected': 'bg-red-500',
        'error': 'bg-yellow-500'
    };
    
    const className = estadoMap[estado] || 'bg-gray-500';
    
    // Usar la función global si está disponible
    if (window.updateStatusIndicators) {
        window.updateStatusIndicators(className, texto);
    } else {
        // Fallback para compatibilidad
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (indicator && statusText) {
            indicator.className = `w-2 h-2 ${className} rounded-full animate-pulse`;
            statusText.textContent = texto;
        }
    }
}

function mostrarNotificacion(titulo, mensaje) {
    console.log('Mostrando notificación:', titulo, mensaje);
    
    // Crear notificación toast
    const notificacion = document.createElement('div');
    notificacion.className = 'fixed top-4 right-4 bg-white border-l-4 border-emerald-500 shadow-lg rounded-lg p-4 z-50 max-w-sm transform transition-all duration-300 ease-in-out';
    notificacion.style.transform = 'translateX(100%)';
    notificacion.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <i class="fas fa-bell text-emerald-500"></i>
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium text-slate-900">${titulo}</p>
                <p class="text-sm text-slate-500">${mensaje}</p>
            </div>
            <div class="ml-auto pl-3">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notificacion.parentElement) {
            notificacion.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notificacion.parentElement) {
                    notificacion.remove();
                }
            }, 300);
        }
    }, 5000);
}

function actualizarFechaHora() {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const hora = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const currentDateElement = document.getElementById('current-date');
    const currentTimeElement = document.getElementById('current-time');
    
    if (currentDateElement) currentDateElement.textContent = fecha;
    if (currentTimeElement) currentTimeElement.textContent = hora;
}

async function cargarEstadisticas() {
    try {
        // Cargar usuarios directamente
        const usuariosResponse = await fetch('/admin/api/usuarios', {
            credentials: 'same-origin'
        });
        
        if (!usuariosResponse.ok) {
            if (usuariosResponse.status === 401) {
                throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
            } else if (usuariosResponse.status === 403) {
                throw new Error('No tienes permisos de administrador.');
            } else {
                throw new Error(`Error del servidor: ${usuariosResponse.status}`);
            }
        }
        
        const usuarios = await usuariosResponse.json();
        
        console.log('Usuarios cargados:', usuarios);
        
        // Calcular estadísticas
        const totalUsuarios = usuarios.length;
        const usuariosActivos = usuarios.filter(u => u.activo).length;
        const estudiantes = usuarios.filter(u => u.rol === 'estudiante').length;
        const administradores = usuarios.filter(u => u.rol === 'administrador').length;
        
        // Actualizar las tarjetas
        const totalUsuariosElement = document.getElementById('total-usuarios');
        const usuariosActivosElement = document.getElementById('usuarios-activos');
        
        if (totalUsuariosElement) totalUsuariosElement.textContent = totalUsuarios;
        if (usuariosActivosElement) usuariosActivosElement.textContent = usuariosActivos;
        
        // Cargar materias y previas
        try {
            const materiasResponse = await fetch('/admin/api/materias', {
                credentials: 'same-origin'
            });
            if (materiasResponse.ok) {
                const data = await materiasResponse.json();
                // Manejar tanto la nueva estructura con paginación como la antigua
                const totalMaterias = data.pagination ? data.pagination.totalMaterias : data.length;
                const totalMateriasElement = document.getElementById('total-materias');
                if (totalMateriasElement) totalMateriasElement.innerHTML = `<span class="animate-pulse">${totalMaterias}</span>`;
            } else {
                const totalMateriasElement = document.getElementById('total-materias');
                if (totalMateriasElement) totalMateriasElement.innerHTML = '<span class="animate-pulse">0</span>';
            }
        } catch (e) {
            console.log('Error cargando materias:', e);
            const totalMateriasElement = document.getElementById('total-materias');
            if (totalMateriasElement) totalMateriasElement.innerHTML = '<span class="animate-pulse">0</span>';
        }
        
        try {
            const previasResponse = await fetch('/admin/api/previas', {
                credentials: 'same-origin'
            });
            if (previasResponse.ok) {
                const data = await previasResponse.json();
                // Manejar tanto la nueva estructura con paginación como la antigua
                const totalPrevias = data.pagination ? data.pagination.totalPrevias : data.length;
                const totalPreviasElement = document.getElementById('total-previas');
                if (totalPreviasElement) totalPreviasElement.innerHTML = `<span class="animate-pulse">${totalPrevias}</span>`;
            } else {
                const totalPreviasElement = document.getElementById('total-previas');
                if (totalPreviasElement) totalPreviasElement.innerHTML = '<span class="animate-pulse">0</span>';
            }
        } catch (e) {
            console.log('Error cargando previas:', e);
            const totalPreviasElement = document.getElementById('total-previas');
            if (totalPreviasElement) totalPreviasElement.innerHTML = '<span class="animate-pulse">0</span>';
        }
        
        // Actualizar gráfico de distribución
        actualizarGraficoUsuarios({
            estudiantes: estudiantes,
            administradores: administradores
        });
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Mostrar valores por defecto en caso de error
        const totalUsuariosElement = document.getElementById('total-usuarios');
        const totalMateriasElement = document.getElementById('total-materias');
        const totalPreviasElement = document.getElementById('total-previas');
        const usuariosActivosElement = document.getElementById('usuarios-activos');
        
        if (totalUsuariosElement) totalUsuariosElement.textContent = '0';
        if (totalMateriasElement) totalMateriasElement.innerHTML = '<span class="animate-pulse">0</span>';
        if (totalPreviasElement) totalPreviasElement.innerHTML = '<span class="animate-pulse">0</span>';
        if (usuariosActivosElement) usuariosActivosElement.textContent = '0';
        
        // Mostrar notificación de error
        mostrarNotificacion('Error', error.message);
    }
}

async function cargarActividadReciente() {
    try {
        const response = await fetch('/admin/api/actividad-reciente', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
            } else if (response.status === 403) {
                throw new Error('No tienes permisos de administrador.');
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }
        }
        
        const actividades = await response.json();
        
        console.log('Actividad reciente cargada:', actividades);
        
        const container = document.getElementById('actividad-reciente');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (actividades.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>No hay actividad reciente</p>
                </div>
            `;
            return;
        }
        
        actividades.forEach(actividad => {
            const tiempoTranscurrido = calcularTiempoTranscurrido(actividad.fecha);
            
            // Determinar colores basados en el tipo de actividad
            let bgColor, borderColor, iconBg, badgeColor, badgeText;
            
            switch(actividad.tipo) {
                case 'usuario':
                    bgColor = 'bg-gradient-to-r from-indigo-50 to-blue-50';
                    borderColor = 'border-indigo-200';
                    iconBg = 'bg-gradient-to-br from-indigo-500 to-blue-600';
                    badgeColor = 'bg-indigo-100 text-indigo-800';
                    break;
                case 'materia':
                    bgColor = 'bg-gradient-to-r from-emerald-50 to-teal-50';
                    borderColor = 'border-emerald-200';
                    iconBg = 'bg-gradient-to-br from-emerald-500 to-teal-600';
                    badgeColor = 'bg-emerald-100 text-emerald-800';
                    break;
                case 'previa':
                    bgColor = 'bg-gradient-to-r from-amber-50 to-orange-50';
                    borderColor = 'border-amber-200';
                    iconBg = 'bg-gradient-to-br from-amber-500 to-orange-600';
                    badgeColor = 'bg-amber-100 text-amber-800';
                    break;
                default:
                    bgColor = 'bg-gradient-to-r from-gray-50 to-slate-50';
                    borderColor = 'border-gray-200';
                    iconBg = 'bg-gradient-to-br from-gray-500 to-slate-600';
                    badgeColor = 'bg-gray-100 text-gray-800';
            }
            
            const actividadElement = document.createElement('div');
            actividadElement.className = `group relative overflow-hidden ${bgColor} rounded-2xl p-6 border ${borderColor} hover:shadow-lg transition-all duration-300`;
            actividadElement.innerHTML = `
                <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <i class="fas fa-${actividad.icono} text-white text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-lg font-bold text-gray-900">${actividad.titulo}</h4>
                            <span class="px-3 py-1 ${badgeColor} text-xs font-bold rounded-full">${actividad.tipo}</span>
                        </div>
                        <p class="text-gray-700 mb-2">${actividad.descripcion}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-clock mr-2"></i>
                            <span>${tiempoTranscurrido}</span>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(actividadElement);
        });
        
    } catch (error) {
        console.error('Error cargando actividad reciente:', error);
        const container = document.getElementById('actividad-reciente');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Error cargando actividad reciente</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    }
}

function calcularTiempoTranscurrido(fecha) {
    const ahora = new Date();
    const fechaActividad = new Date(fecha);
    const diferencia = ahora - fechaActividad;
    
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
    
    if (minutos < 1) {
        return 'Hace un momento';
    } else if (minutos < 60) {
        return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    } else if (horas < 24) {
        return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    } else if (dias < 7) {
        return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    } else {
        return fechaActividad.toLocaleDateString('es-ES');
    }
}

let usersChart = null;

function inicializarGraficos() {
    // Gráfico de usuarios por rol
    const usersCtxElement = document.getElementById('usersChart');
    if (!usersCtxElement) return;
    
    const usersCtx = usersCtxElement.getContext('2d');
    usersChart = new Chart(usersCtx, {
        type: 'doughnut',
        data: {
            labels: ['Estudiantes', 'Administradores'],
            datasets: [{
                data: [0, 0], // Se actualizará con datos reales
                backgroundColor: [
                    '#059669', // Verde esmeralda para estudiantes
                    '#dc2626'  // Rojo para administradores
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Gráfico de actividad mensual
    const activityCtxElement = document.getElementById('activityChart');
    if (!activityCtxElement) return;
    
    const activityCtx = activityCtxElement.getContext('2d');
    new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Usuarios Activos',
                data: [120, 135, 150, 145, 160, 175],
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#059669',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function actualizarGraficoUsuarios(distribucion) {
    console.log('Actualizando gráfico con datos:', distribucion);
    
    if (!usersChart) {
        console.log('El gráfico no está inicializado');
        return;
    }
    
    if (!distribucion) {
        console.log('No hay datos de distribución');
        return;
    }
    
    const estudiantes = distribucion.estudiantes || 0;
    const administradores = distribucion.administradores || 0;
    
    console.log(`Estudiantes: ${estudiantes}, Administradores: ${administradores}`);
    
    // Actualizar los datos del gráfico
    usersChart.data.datasets[0].data = [estudiantes, administradores];
    
    // Actualizar el gráfico
    usersChart.update('active');
    
    console.log('Gráfico actualizado correctamente');
}

// Función para cargar últimos accesos de usuarios
async function cargarUltimosAccesos() {
    try {
        console.log('🔄 Cargando últimos accesos...');
        
        const response = await fetch('/admin/api/ultimos-accesos', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const ultimosAccesos = await response.json();
        console.log('📦 Últimos accesos recibidos:', ultimosAccesos);
        
        mostrarUltimosAccesos(ultimosAccesos);
        
    } catch (error) {
        console.error('❌ Error cargando últimos accesos:', error);
        mostrarErrorUltimosAccesos('Error cargando últimos accesos: ' + error.message);
    }
}

// Función para mostrar últimos accesos en el DOM
function mostrarUltimosAccesos(ultimosAccesos) {
    const container = document.getElementById('ultimos-accesos');
    if (!container) return;
    
    if (ultimosAccesos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-user-times text-4xl text-slate-400 mb-4"></i>
                <p class="text-slate-500">No hay usuarios con accesos recientes</p>
            </div>
        `;
        return;
    }
    
    const html = ultimosAccesos.map(acceso => `
        <div class="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors ${acceso.esReciente ? 'bg-green-50 border-green-200' : ''}">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-indigo-600"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <p class="font-medium text-slate-900 truncate">${acceso.nombre}</p>
                    <p class="text-sm text-slate-500 truncate" title="${acceso.email}">${acceso.email}</p>
                    <p class="text-xs text-slate-400 capitalize">${acceso.rol}</p>
                </div>
            </div>
            <div class="text-right flex-shrink-0 ml-4">
                <p class="text-sm font-medium ${acceso.esReciente ? 'text-green-600' : 'text-slate-600'} whitespace-nowrap">${acceso.tiempoTranscurrido}</p>
                ${acceso.esReciente ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">En línea</span>' : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Función para mostrar error en últimos accesos
function mostrarErrorUltimosAccesos(mensaje) {
    const container = document.getElementById('ultimos-accesos');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
            <p class="text-red-500">${mensaje}</p>
            <button onclick="cargarUltimosAccesos()" class="mt-4 btn-secondary">
                <i class="fas fa-retry"></i>
                Reintentar
            </button>
        </div>
    `;
}



