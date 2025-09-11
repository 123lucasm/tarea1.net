// Usuarios JavaScript
// Variables globales para filtros
let todosLosUsuarios = [];
let usuariosFiltrados = [];

document.addEventListener('DOMContentLoaded', function() {
    cargarUsuarios();
    
    // Event listeners
    document.getElementById('search-input').addEventListener('input', filtrarUsuarios);
    document.getElementById('rol-filter').addEventListener('change', filtrarUsuarios);
    document.getElementById('estado-filter').addEventListener('change', filtrarUsuarios);
    document.getElementById('clear-filters').addEventListener('click', limpiarFiltros);
    document.getElementById('close-modal').addEventListener('click', cerrarModal);
    
    // Event listeners para el modal de nuevo usuario
    document.getElementById('nuevo-usuario-btn').addEventListener('click', abrirNuevoUsuarioModal);
    document.getElementById('close-nuevo-modal').addEventListener('click', cerrarNuevoUsuarioModal);
    document.getElementById('cancelar-nuevo').addEventListener('click', cerrarNuevoUsuarioModal);
    document.getElementById('nuevo-usuario-form').addEventListener('submit', crearUsuario);
    
    // Event listeners para el modal de editar usuario
    document.getElementById('close-editar-modal').addEventListener('click', cerrarEditarUsuarioModal);
    document.getElementById('cancelar-editar').addEventListener('click', cerrarEditarUsuarioModal);
    document.getElementById('editar-usuario-form').addEventListener('submit', actualizarUsuario);
});

async function cargarUsuarios() {
    try {
        const response = await fetch('/admin/api/usuarios');
        const usuarios = await response.json();
        
        // Almacenar todos los usuarios
        todosLosUsuarios = usuarios;
        usuariosFiltrados = [...usuarios];
        
        mostrarUsuarios(usuariosFiltrados);
        actualizarContador(usuariosFiltrados);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

function actualizarContador(usuarios) {
    const totalElement = document.getElementById('total-users');
    if (totalElement) {
        totalElement.textContent = usuarios.length;
    }
}

function mostrarUsuarios(usuarios) {
    const tbody = document.getElementById('usuarios-table');
    tbody.innerHTML = '';

    usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const estadoClass = usuario.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
        const rolClass = usuario.rol === 'administrador' ? 'bg-violet-100 text-violet-800' : 'bg-indigo-100 text-indigo-800';
        
        // Generar color basado en el nombre para consistencia
        const colors = [
            '#4f46e5', // indigo
            '#059669', // emerald
            '#d97706', // amber
            '#7c3aed', // violet
            '#0891b2', // cyan
            '#e11d48', // rose
            '#65a30d', // lime
            '#ea580c'  // orange
        ];
        const colorIndex = usuario.nombre.charCodeAt(0) % colors.length;
        const avatarColor = colors[colorIndex];
        const initial = usuario.nombre.charAt(0).toUpperCase();
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style="background-color: ${avatarColor}">
                        <span class="text-white text-lg font-bold">${initial}</span>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-semibold text-slate-900">${usuario.nombre} ${usuario.apellido}</div>
                        <div class="text-xs text-slate-500">ID: ${usuario._id.slice(-6)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${usuario.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${usuario.cedula || 'No asignada'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${rolClass}">
                    <i class="fas fa-${usuario.rol === 'administrador' ? 'user-shield' : 'user-graduate'} mr-1.5"></i>
                    ${usuario.rol}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${estadoClass}">
                    <i class="fas fa-${usuario.activo ? 'check-circle' : 'times-circle'} mr-1.5"></i>
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${new Date(usuario.ultimoAcceso).toLocaleDateString()}</div>
                <div class="text-xs text-slate-500">${new Date(usuario.ultimoAcceso).toLocaleTimeString()}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex items-center gap-2">
                    <button class="btn-ver-detalles p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors" data-usuario-id="${usuario._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-editar-usuario p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors" data-usuario-id="${usuario._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar-usuario p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" data-usuario-id="${usuario._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Agregar event listeners a los botones de esta fila
        const verBtn = row.querySelector('.btn-ver-detalles');
        const editarBtn = row.querySelector('.btn-editar-usuario');
        const eliminarBtn = row.querySelector('.btn-eliminar-usuario');
        
        verBtn.addEventListener('click', () => {
            const usuarioId = verBtn.getAttribute('data-usuario-id');
            verDetalles(usuarioId);
        });
        
        editarBtn.addEventListener('click', () => {
            const usuarioId = editarBtn.getAttribute('data-usuario-id');
            editarUsuario(usuarioId);
        });
        
        eliminarBtn.addEventListener('click', () => {
            const usuarioId = eliminarBtn.getAttribute('data-usuario-id');
            eliminarUsuario(usuarioId);
        });
    });
}

function filtrarUsuarios() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const rolFilter = document.getElementById('rol-filter').value;
    const estadoFilter = document.getElementById('estado-filter').value;
    
    // Filtrar usuarios
    usuariosFiltrados = todosLosUsuarios.filter(usuario => {
        // Filtro de búsqueda (nombre, apellido, email, cédula)
        const matchesSearch = !searchTerm || 
            usuario.nombre.toLowerCase().includes(searchTerm) ||
            usuario.apellido.toLowerCase().includes(searchTerm) ||
            usuario.email.toLowerCase().includes(searchTerm) ||
            (usuario.cedula && usuario.cedula.includes(searchTerm));
        
        // Filtro de rol
        const matchesRol = !rolFilter || usuario.rol === rolFilter;
        
        // Filtro de estado
        const matchesEstado = !estadoFilter || 
            (estadoFilter === 'activo' && usuario.activo) ||
            (estadoFilter === 'inactivo' && !usuario.activo);
        
        return matchesSearch && matchesRol && matchesEstado;
    });
    
    // Mostrar usuarios filtrados
    mostrarUsuarios(usuariosFiltrados);
    actualizarContador(usuariosFiltrados);
    
    // Mostrar mensaje si no hay resultados
    mostrarMensajeFiltros();
    
    // Actualizar indicador de filtros activos
    actualizarIndicadorFiltros();
}

function limpiarFiltros() {
    // Limpiar campos de filtro
    document.getElementById('search-input').value = '';
    document.getElementById('rol-filter').value = '';
    document.getElementById('estado-filter').value = '';
    
    // Restaurar todos los usuarios
    usuariosFiltrados = [...todosLosUsuarios];
    
    // Mostrar todos los usuarios
    mostrarUsuarios(usuariosFiltrados);
    actualizarContador(usuariosFiltrados);
    
    // Ocultar mensaje de filtros
    ocultarMensajeFiltros();
    
    // Actualizar indicador de filtros
    actualizarIndicadorFiltros();
}

function mostrarMensajeFiltros() {
    const tbody = document.getElementById('usuarios-table');
    
    if (usuariosFiltrados.length === 0) {
        // Mostrar mensaje de no resultados
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-search text-gray-400 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
                        <p class="text-gray-500 mb-4">No hay usuarios que coincidan con los filtros aplicados</p>
                        <button onclick="limpiarFiltros()" class="btn-secondary">
                            <i class="fas fa-times mr-2"></i>
                            Limpiar Filtros
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function ocultarMensajeFiltros() {
    // Esta función se puede usar para ocultar mensajes específicos si es necesario
    // Por ahora, la función mostrarUsuarios() maneja la visualización
}

function actualizarIndicadorFiltros() {
    const searchTerm = document.getElementById('search-input').value.trim();
    const rolFilter = document.getElementById('rol-filter').value;
    const estadoFilter = document.getElementById('estado-filter').value;
    
    let filtrosActivos = 0;
    if (searchTerm) filtrosActivos++;
    if (rolFilter) filtrosActivos++;
    if (estadoFilter) filtrosActivos++;
    
    // Actualizar el contador de usuarios para mostrar filtros activos
    const totalElement = document.getElementById('total-users');
    if (totalElement) {
        if (filtrosActivos > 0) {
            totalElement.innerHTML = `
                <span class="text-indigo-600">${usuariosFiltrados.length}</span>
                <span class="text-gray-400">/ ${todosLosUsuarios.length}</span>
                <span class="text-xs text-amber-600 ml-2">
                    <i class="fas fa-filter mr-1"></i>
                    ${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''} activo${filtrosActivos > 1 ? 's' : ''}
                </span>
            `;
        } else {
            totalElement.textContent = usuariosFiltrados.length;
        }
    }
}

async function verDetalles(usuarioId) {
    try {
        const response = await fetch(`/admin/api/usuarios/${usuarioId}`);
        const usuario = await response.json();
        
        const detailsDiv = document.getElementById('user-details');
        const estadoClass = usuario.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800';
        const rolClass = usuario.rol === 'administrador' ? 'bg-violet-100 text-violet-800' : 'bg-indigo-100 text-indigo-800';
        
        // Generar el mismo color para el avatar en el modal
        const colors = [
            '#4f46e5', // indigo
            '#059669', // emerald
            '#d97706', // amber
            '#7c3aed', // violet
            '#0891b2', // cyan
            '#e11d48', // rose
            '#65a30d', // lime
            '#ea580c'  // orange
        ];
        const colorIndex = usuario.nombre.charCodeAt(0) % colors.length;
        const avatarColor = colors[colorIndex];
        const initial = usuario.nombre.charAt(0).toUpperCase();
        
        detailsDiv.innerHTML = `
            <style>
                .user-detail-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                .user-detail-header {
                    background: #4f46e5;
                    color: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 16px;
                    text-align: center;
                }
                .user-avatar {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 12px;
                    border: 2px solid white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .user-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    margin: 0 4px;
                    background: rgba(255, 255, 255, 0.2);
                }
                .detail-section {
                    margin-bottom: 16px;
                }
                .detail-section h3 {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                }
                .detail-item {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                }
                .detail-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    color: white;
                }
                .detail-content {
                    flex: 1;
                }
                .detail-label {
                    font-size: 10px;
                    font-weight: 500;
                    text-transform: uppercase;
                    color: #64748b;
                    margin-bottom: 4px;
                }
                .detail-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                }
                .detail-subvalue {
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 2px;
                }
            </style>
            
            <!-- Header con avatar y nombre -->
            <div class="user-detail-header">
                <div class="user-avatar" style="background-color: ${avatarColor}">
                    <span style="color: white; font-size: 24px; font-weight: bold;">${initial}</span>
                </div>
                <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">${usuario.nombre} ${usuario.apellido}</h2>
                <div>
                    <span class="user-badge">
                        <i class="fas fa-${usuario.rol === 'administrador' ? 'user-shield' : 'user-graduate'}" style="margin-right: 4px;"></i>
                        ${usuario.rol}
                    </span>
                    <span class="user-badge" style="background: ${usuario.activo ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${usuario.activo ? '#dcfce7' : '#fecaca'};">
                        <i class="fas fa-${usuario.activo ? 'check-circle' : 'times-circle'}" style="margin-right: 4px;"></i>
                        ${usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>
            
            <!-- Información personal -->
            <div class="user-detail-card">
                <h3 style="color: #1e40af;">
                    <i class="fas fa-user-circle" style="margin-right: 8px; color: #2563eb;"></i>
                    Información Personal
                </h3>
                
                <div class="detail-item">
                    <div class="detail-icon" style="background: #3b82f6;">
                        <i class="fas fa-envelope"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label" style="color: #2563eb;">Email</div>
                        <div class="detail-value" style="color: #1e40af;">${usuario.email}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon" style="background: #10b981;">
                        <i class="fas fa-id-card"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label" style="color: #059669;">Cédula</div>
                        <div class="detail-value" style="color: #047857;">${usuario.cedula || 'No asignada'}</div>
                    </div>
                </div>
            </div>
            
            <!-- Información del sistema -->
            <div class="user-detail-card">
                <h3 style="color: #7c3aed;">
                    <i class="fas fa-cogs" style="margin-right: 8px; color: #8b5cf6;"></i>
                    Información del Sistema
                </h3>
                
                <div class="detail-item">
                    <div class="detail-icon" style="background: #f59e0b;">
                        <i class="fas fa-calendar-plus"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label" style="color: #d97706;">Fecha de Registro</div>
                        <div class="detail-value" style="color: #92400e;">${new Date(usuario.createdAt).toLocaleDateString()}</div>
                        <div class="detail-subvalue">${new Date(usuario.createdAt).toLocaleTimeString()}</div>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-icon" style="background: #06b6d4;">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label" style="color: #0891b2;">Último Acceso</div>
                        <div class="detail-value" style="color: #0e7490;">${new Date(usuario.ultimoAcceso).toLocaleDateString()}</div>
                        <div class="detail-subvalue">${new Date(usuario.ultimoAcceso).toLocaleTimeString()}</div>
                    </div>
                </div>
            </div>
            
            <!-- ID del usuario -->
            <div class="user-detail-card">
                <h3 style="color: #374151;">
                    <i class="fas fa-fingerprint" style="margin-right: 8px; color: #6b7280;"></i>
                    Identificador Único
                </h3>
                
                <div class="detail-item">
                    <div class="detail-icon" style="background: #6b7280;">
                        <i class="fas fa-hashtag"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-label" style="color: #6b7280;">ID de Usuario</div>
                        <div class="detail-value" style="color: #374151; font-family: monospace; font-size: 12px; word-break: break-all;">${usuario._id}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error cargando detalles del usuario:', error);
    }
}

function cerrarModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

async function editarUsuario(usuarioId) {
    console.log('🔧 Función editarUsuario llamada con ID:', usuarioId);
    try {
        console.log('📡 Haciendo fetch a:', `/admin/api/usuarios/${usuarioId}`);
        const response = await fetch(`/admin/api/usuarios/${usuarioId}`);
        console.log('📡 Respuesta recibida:', response.status, response.ok);
        
        const usuario = await response.json();
        console.log('👤 Datos del usuario:', usuario);
        
        if (response.ok) {
            console.log('✅ Abriendo modal de edición...');
            abrirEditarUsuarioModal(usuario);
        } else {
            console.error('❌ Error en la respuesta:', usuario);
            alert('Error al cargar los datos del usuario');
        }
    } catch (error) {
        console.error('❌ Error cargando usuario:', error);
        alert('Error al cargar los datos del usuario');
    }
}

async function eliminarUsuario(usuarioId) {
    try {
        // Obtener datos del usuario para mostrar en la confirmación
        const response = await fetch(`/admin/api/usuarios/${usuarioId}`);
        const usuario = await response.json();
        
        if (response.ok) {
            const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;
            
            // Mostrar alerta de confirmación con SweetAlert2
            const result = await Swal.fire({
                title: '¿Eliminar Usuario?',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff6b6b, #ee5a52); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);">
                            <i class="fas fa-trash" style="color: white; font-size: 32px;"></i>
                        </div>
                        <h3 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 15px 0; font-family: 'Inter', sans-serif;">
                            ¿Eliminar Usuario?
                        </h3>
                        <p style="color: #4a5568; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
                            Estás a punto de eliminar permanentemente a<br>
                            <strong style="color: #2d3748; font-size: 18px;">${nombreCompleto}</strong>
                        </p>
                        <div style="background: linear-gradient(135deg, #fed7d7, #feb2b2); border: 1px solid #fc8181; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: left;">
                            <div style="display: flex; align-items: center; color: #c53030;">
                                <i class="fas fa-exclamation-triangle" style="margin-right: 8px; font-size: 16px;"></i>
                                <span style="font-weight: 600; font-size: 14px;">Esta acción no se puede deshacer</span>
                            </div>
                            <p style="color: #742a2a; font-size: 13px; margin: 8px 0 0 0; line-height: 1.4;">
                                Todos los datos del usuario serán eliminados permanentemente del sistema.
                            </p>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#e53e3e',
                cancelButtonColor: '#718096',
                confirmButtonText: `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-trash"></i>
                        <span>Eliminar Usuario</span>
                    </div>
                `,
                cancelButtonText: `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-times"></i>
                        <span>Cancelar</span>
                    </div>
                `,
                reverseButtons: true,
                focusCancel: true,
                allowOutsideClick: false,
                allowEscapeKey: true,
                showCloseButton: false,
                customClass: {
                    popup: 'swal2-popup-modern',
                    title: 'swal2-title-modern',
                    htmlContainer: 'swal2-html-container-modern',
                    confirmButton: 'swal2-confirm-modern',
                    cancelButton: 'swal2-cancel-modern'
                },
                buttonsStyling: true,
                backdrop: 'rgba(0, 0, 0, 0.6)'
            });
            
            if (result.isConfirmed) {
                await confirmarEliminarUsuario(usuarioId);
            }
        } else {
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos del usuario',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error cargando usuario:', error);
        Swal.fire({
            title: 'Error',
            text: 'Error al cargar los datos del usuario',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

// Funciones para el modal de nuevo usuario
function abrirNuevoUsuarioModal() {
    document.getElementById('nuevo-usuario-modal').classList.remove('hidden');
    limpiarFormulario();
    ocultarMensajes();
}

function cerrarNuevoUsuarioModal() {
    document.getElementById('nuevo-usuario-modal').classList.add('hidden');
    limpiarFormulario();
    ocultarMensajes();
}

function limpiarFormulario() {
    document.getElementById('nuevo-usuario-form').reset();
}

function ocultarMensajes() {
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('success-message').classList.add('hidden');
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    errorText.textContent = mensaje;
    errorDiv.classList.remove('hidden');
    document.getElementById('success-message').classList.add('hidden');
}

function mostrarExito(mensaje) {
    const successDiv = document.getElementById('success-message');
    const successText = document.getElementById('success-text');
    successText.textContent = mensaje;
    successDiv.classList.remove('hidden');
    document.getElementById('error-message').classList.add('hidden');
}

function validarFormulario(formData) {
    const errores = [];

    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
        errores.push('Las contraseñas no coinciden');
    }

    if (formData.password.length < 6) {
        errores.push('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        errores.push('El email no tiene un formato válido');
    }

    // Validar cédula si se proporciona
    if (formData.cedula && !/^\d{7,8}$/.test(formData.cedula)) {
        errores.push('La cédula debe tener entre 7 y 8 dígitos');
    }

    return errores;
}

async function crearUsuario(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const usuarioData = {
        nombre: formData.get('nombre').trim(),
        apellido: formData.get('apellido').trim(),
        email: formData.get('email').trim(),
        cedula: formData.get('cedula').trim(),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        rol: formData.get('rol'),
        activo: formData.get('activo') === 'true'
    };

    // Validar formulario
    const errores = validarFormulario(usuarioData);
    if (errores.length > 0) {
        mostrarError(errores.join(', '));
        return;
    }

    // Preparar datos para envío (remover confirmPassword)
    const { confirmPassword, ...datosEnvio } = usuarioData;

    try {
        const crearBtn = document.getElementById('crear-usuario-btn');
        const textoOriginal = crearBtn.innerHTML;
        crearBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando...';
        crearBtn.disabled = true;

        const response = await fetch('/admin/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosEnvio)
        });

        const result = await response.json();

        if (response.ok) {
            mostrarExito('Usuario creado exitosamente');
            await cargarUsuarios(); // Recargar la lista de usuarios
            filtrarUsuarios(); // Aplicar filtros actuales
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                cerrarNuevoUsuarioModal();
            }, 2000);
        } else {
            mostrarError(result.message || 'Error al crear el usuario');
        }
    } catch (error) {
        console.error('Error creando usuario:', error);
        mostrarError('Error de conexión. Intenta nuevamente.');
    } finally {
        const crearBtn = document.getElementById('crear-usuario-btn');
        crearBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear Usuario';
        crearBtn.disabled = false;
    }
}

// Funciones para el modal de editar usuario
function abrirEditarUsuarioModal(usuario) {
    console.log('🎯 Función abrirEditarUsuarioModal llamada con usuario:', usuario);
    
    try {
        // Llenar el formulario con los datos del usuario
        document.getElementById('editar-usuario-id').value = usuario._id;
        document.getElementById('editar-nombre').value = usuario.nombre;
        document.getElementById('editar-apellido').value = usuario.apellido;
        document.getElementById('editar-email').value = usuario.email;
        document.getElementById('editar-cedula').value = usuario.cedula || '';
        document.getElementById('editar-rol').value = usuario.rol;
        document.getElementById('editar-activo').value = usuario.activo.toString();
        
        // Limpiar campos de contraseña
        document.getElementById('editar-password').value = '';
        document.getElementById('editar-confirmPassword').value = '';
        
        console.log('📝 Formulario llenado correctamente');
        
        // Ocultar mensajes
        ocultarMensajesEditar();
        
        // Mostrar modal
        const modal = document.getElementById('editar-usuario-modal');
        console.log('🔍 Modal encontrado:', modal);
        modal.classList.remove('hidden');
        console.log('✅ Modal mostrado');
    } catch (error) {
        console.error('❌ Error en abrirEditarUsuarioModal:', error);
    }
}

function cerrarEditarUsuarioModal() {
    document.getElementById('editar-usuario-modal').classList.add('hidden');
    limpiarFormularioEditar();
    ocultarMensajesEditar();
}

function limpiarFormularioEditar() {
    document.getElementById('editar-usuario-form').reset();
}

function ocultarMensajesEditar() {
    document.getElementById('editar-error-message').classList.add('hidden');
    document.getElementById('editar-success-message').classList.add('hidden');
}

function mostrarErrorEditar(mensaje) {
    const errorDiv = document.getElementById('editar-error-message');
    const errorText = document.getElementById('editar-error-text');
    errorText.textContent = mensaje;
    errorDiv.classList.remove('hidden');
    document.getElementById('editar-success-message').classList.add('hidden');
}

function mostrarExitoEditar(mensaje) {
    const successDiv = document.getElementById('editar-success-message');
    const successText = document.getElementById('editar-success-text');
    successText.textContent = mensaje;
    successDiv.classList.remove('hidden');
    document.getElementById('editar-error-message').classList.add('hidden');
}

function validarFormularioEditar(formData) {
    const errores = [];

    // Validar contraseñas solo si se proporcionan
    if (formData.password || formData.confirmPassword) {
        if (formData.password !== formData.confirmPassword) {
            errores.push('Las contraseñas no coinciden');
        }

        if (formData.password.length < 6) {
            errores.push('La contraseña debe tener al menos 6 caracteres');
        }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        errores.push('El email no tiene un formato válido');
    }

    // Validar cédula si se proporciona
    if (formData.cedula && !/^\d{7,8}$/.test(formData.cedula)) {
        errores.push('La cédula debe tener entre 7 y 8 dígitos');
    }

    return errores;
}

async function actualizarUsuario(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const usuarioId = formData.get('usuarioId');
    const usuarioData = {
        nombre: formData.get('nombre').trim(),
        apellido: formData.get('apellido').trim(),
        email: formData.get('email').trim(),
        cedula: formData.get('cedula').trim(),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        rol: formData.get('rol'),
        activo: formData.get('activo') === 'true'
    };

    // Validar formulario
    const errores = validarFormularioEditar(usuarioData);
    if (errores.length > 0) {
        mostrarErrorEditar(errores.join(', '));
        return;
    }

    // Preparar datos para envío
    const { confirmPassword, ...datosEnvio } = usuarioData;
    
    // Si no se proporciona contraseña, no incluirla en el envío
    if (!datosEnvio.password) {
        delete datosEnvio.password;
    }

    try {
        const actualizarBtn = document.getElementById('actualizar-usuario-btn');
        const textoOriginal = actualizarBtn.innerHTML;
        actualizarBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Actualizando...';
        actualizarBtn.disabled = true;

        const response = await fetch(`/admin/api/usuarios/${usuarioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosEnvio)
        });

        const result = await response.json();

        if (response.ok) {
            mostrarExitoEditar('Usuario actualizado exitosamente');
            await cargarUsuarios(); // Recargar la lista de usuarios
            filtrarUsuarios(); // Aplicar filtros actuales
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                cerrarEditarUsuarioModal();
            }, 2000);
        } else {
            mostrarErrorEditar(result.message || 'Error al actualizar el usuario');
        }
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        mostrarErrorEditar('Error de conexión. Intenta nuevamente.');
    } finally {
        const actualizarBtn = document.getElementById('actualizar-usuario-btn');
        actualizarBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar Usuario';
        actualizarBtn.disabled = false;
    }
}

async function confirmarEliminarUsuario(usuarioId) {
    try {
        // Mostrar loading
        Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espera mientras eliminamos el usuario',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(`/admin/api/usuarios/${usuarioId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Mostrar mensaje de éxito
            await Swal.fire({
                title: '¡Eliminado!',
                text: 'El usuario ha sido eliminado correctamente',
                icon: 'success',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true
            });
            
            // Recargar lista de usuarios
            await cargarUsuarios();
            filtrarUsuarios(); // Aplicar filtros actuales
        } else {
            const result = await response.json();
            await Swal.fire({
                title: 'Error',
                text: result.message || 'Error al eliminar el usuario',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        await Swal.fire({
            title: 'Error',
            text: 'Error de conexión. Intenta nuevamente.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}
