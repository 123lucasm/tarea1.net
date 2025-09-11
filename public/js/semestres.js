// Semestres JavaScript
let semestres = [];
let paginaActual = 1;
let semestresPorPagina = 10;
let semestresFiltrados = [];

// Inicializar Socket.IO
const socket = io();

document.addEventListener('DOMContentLoaded', function() {
    cargarSemestres();
    configurarSocketEvents();
    configurarEventosModales();
    configurarEventosBotones();
});

function configurarSocketEvents() {
    // Unirse a la sala de administradores
    socket.emit('join-room', 'admin');
    
    socket.on('nuevo-semestre', function(data) {
        mostrarNotificacion('Nuevo semestre creado', `${data.semestre.nombre} ha sido agregado`);
        cargarSemestres();
    });
    
    // Escuchar actualizaciones de semestres
    socket.on('semestre-actualizado', function(data) {
        mostrarNotificacion('Semestre actualizado', `${data.semestre.nombre} ha sido modificado`);
        cargarSemestres();
    });
    
    // Escuchar eliminación de semestres
    socket.on('semestre-eliminado', function(data) {
        mostrarNotificacion('Semestre eliminado', `${data.semestre.nombre} ha sido eliminado`);
        cargarSemestres();
    });
    
    // Escuchar cambios de estado de semestres
    socket.on('semestre-toggle', function(data) {
        const estado = data.activo ? 'activado' : 'desactivado';
        mostrarNotificacion('Estado cambiado', `${data.semestre.nombre} ha sido ${estado}`);
        cargarSemestres();
    });
    
    // Escuchar login de usuarios
    socket.on('user-logged-in', function(data) {
        console.log('Usuario inició sesión:', data);
        mostrarNotificacion('Usuario conectado', `${data.usuario.nombre} ${data.usuario.apellido} inició sesión`);
    });
    
    // Escuchar logout de usuarios
    socket.on('user-logged-out', function(data) {
        console.log('Usuario cerró sesión:', data);
        mostrarNotificacion('Usuario desconectado', `${data.usuario.nombre} ${data.usuario.apellido} cerró sesión`);
    });
    
    // Escuchar actualización de último acceso
    socket.on('ultimo-acceso-actualizado', function(data) {
        console.log('Último acceso actualizado:', data);
        // No necesitamos actualizar nada específico en semestres
    });
    
    socket.on('connect', function() {
        actualizarEstadoConexion('connected', 'Conectado');
    });
    
    socket.on('disconnect', function() {
        actualizarEstadoConexion('disconnected', 'Desconectado');
    });
}

function configurarEventosModales() {
    // Cerrar modal de semestre al hacer clic fuera
    const modalSemestre = document.getElementById('modal-semestre');
    if (modalSemestre) {
        modalSemestre.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalSemestre();
            }
        });
    }
}

function configurarEventosBotones() {
    // Delegación de eventos para los botones de la tabla
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // Botón Editar semestre
        if (target.closest('.btn-editar-semestre')) {
            const button = target.closest('.btn-editar-semestre');
            const semestreId = button.getAttribute('data-semestre-id');
            editarSemestre(semestreId);
        }
        
        // Botón Toggle semestre
        if (target.closest('.btn-toggle-semestre')) {
            const button = target.closest('.btn-toggle-semestre');
            const semestreId = button.getAttribute('data-semestre-id');
            const estadoActual = button.getAttribute('data-estado') === 'true';
            toggleSemestre(semestreId, estadoActual);
        }
        
        // Botón Eliminar semestre
        if (target.closest('.btn-eliminar-semestre')) {
            const button = target.closest('.btn-eliminar-semestre');
            const semestreId = button.getAttribute('data-semestre-id');
            eliminarSemestre(semestreId);
        }
        
        // Botón Nuevo Semestre
        if (target.closest('.btn-nuevo-semestre')) {
            abrirModalSemestre();
        }
        
        // Botones de cerrar modal de semestre
        if (target.closest('.btn-cerrar-modal-semestre')) {
            cerrarModalSemestre();
        }
    });
    
    // Event listeners para filtros
    const searchSemestres = document.getElementById('search-semestres');
    const filterEstado = document.getElementById('filter-estado');
    const limpiarFiltros = document.getElementById('limpiar-filtros');
    
    if (searchSemestres) searchSemestres.addEventListener('input', filtrarSemestres);
    if (filterEstado) filterEstado.addEventListener('change', filtrarSemestres);
    if (limpiarFiltros) limpiarFiltros.addEventListener('click', limpiarFiltros);
    
    // Event listeners para paginación
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    
    if (prevPage) prevPage.addEventListener('click', () => cambiarPagina(-1));
    if (nextPage) nextPage.addEventListener('click', () => cambiarPagina(1));
    
    // Event listener para el formulario de semestres
    const formSemestre = document.getElementById('form-semestre');
    if (formSemestre) {
        formSemestre.addEventListener('submit', manejarSubmitSemestre);
    }
    
    // Delegación de eventos para números de página
    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-pagina-numero')) {
            const pagina = parseInt(e.target.getAttribute('data-pagina'));
            irAPagina(pagina);
        }
    });
}

function actualizarEstadoConexion(estado, texto) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator && statusText) {
        indicator.className = `status-indicator ${estado}`;
        statusText.textContent = texto;
    }
}

async function cargarSemestres() {
    console.log('🔄 Cargando semestres...');
    
    // Mostrar indicador de carga
    const tbody = document.getElementById('semestres-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                        <p class="text-slate-500">Cargando semestres...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    try {
        const startTime = performance.now();
        
        const response = await fetch('/admin/api/semestres', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const endTime = performance.now();
        
        console.log(`📦 Datos recibidos de la API en ${(endTime - startTime).toFixed(2)}ms:`, data);
        
        semestres = data;
        semestresFiltrados = [...semestres];
        
        actualizarEstadisticas();
        mostrarSemestres();
        
    } catch (error) {
        console.error('❌ Error cargando semestres:', error);
        mostrarError('Error cargando semestres: ' + error.message);
    }
}

function actualizarEstadisticas() {
    const total = semestres.length;
    const activos = semestres.filter(s => s.activo).length;
    const conMaterias = semestres.filter(s => s.materias && s.materias.length > 0).length;
    const creditosTotales = semestres.reduce((sum, s) => sum + (s.creditosRequeridos || 0), 0);
    
    const totalSemestresCount = document.getElementById('total-semestres-count');
    const semestresActivosCount = document.getElementById('semestres-activos-count');
    const semestresConMateriasCount = document.getElementById('semestres-con-materias-count');
    const creditosTotalesCount = document.getElementById('creditos-totales-count');
    const totalSemestres = document.getElementById('total-semestres');
    
    if (totalSemestresCount) totalSemestresCount.textContent = total;
    if (semestresActivosCount) semestresActivosCount.textContent = activos;
    if (semestresConMateriasCount) semestresConMateriasCount.textContent = conMaterias;
    if (creditosTotalesCount) creditosTotalesCount.textContent = creditosTotales;
    if (totalSemestres) totalSemestres.textContent = `${total} semestres configurados`;
}

function filtrarSemestres() {
    const searchSemestres = document.getElementById('search-semestres');
    const filterEstado = document.getElementById('filter-estado');
    
    if (!searchSemestres || !filterEstado) return;
    
    const searchTerm = searchSemestres.value.toLowerCase();
    const estadoFilter = filterEstado.value;
    
    semestresFiltrados = semestres.filter(semestre => {
        const matchSearch = !searchTerm || 
            semestre.nombre?.toLowerCase().includes(searchTerm) ||
            semestre.numero?.toString().includes(searchTerm) ||
            semestre.descripcion?.toLowerCase().includes(searchTerm);
        
        const matchEstado = !estadoFilter || semestre.activo.toString() === estadoFilter;
        
        return matchSearch && matchEstado;
    });
    
    paginaActual = 1;
    mostrarSemestres();
}

function limpiarFiltros() {
    const searchSemestres = document.getElementById('search-semestres');
    const filterEstado = document.getElementById('filter-estado');
    
    if (searchSemestres) searchSemestres.value = '';
    if (filterEstado) filterEstado.value = '';
    filtrarSemestres();
}

function mostrarSemestres() {
    const tbody = document.getElementById('semestres-tbody');
    if (!tbody) return;
    
    if (semestresFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-inbox text-4xl text-slate-400 mb-4"></i>
                        <p class="text-slate-500">No se encontraron semestres</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const inicio = (paginaActual - 1) * semestresPorPagina;
    const fin = inicio + semestresPorPagina;
    const semestresPagina = semestresFiltrados.slice(inicio, fin);
    
    tbody.innerHTML = semestresPagina.map(semestre => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
                    <div class="text-sm font-medium text-slate-900">${semestre.numero}</div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">${semestre.nombre}</div>
                <div class="text-sm text-slate-500">${semestre.descripcion || 'Sin descripción'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    ${semestre.orden}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${semestre.creditosRequeridos || 0}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="contador-materias">
                    <i class="fas fa-book mr-1"></i>
                    ${semestre.materias ? semestre.materias.length : 0}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="badge-estado ${semestre.activo ? 'badge-activo' : 'badge-inactivo'}">
                    <i class="fas fa-${semestre.activo ? 'check-circle' : 'times-circle'} mr-1"></i>
                    ${semestre.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                    <button class="btn-icon btn-icon-primary btn-editar-semestre" 
                            data-semestre-id="${semestre._id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${semestre.activo ? 'btn-icon-warning' : 'btn-icon-success'} btn-toggle-semestre" 
                            data-semestre-id="${semestre._id}"
                            data-estado="${semestre.activo}"
                            title="${semestre.activo ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${semestre.activo ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger btn-eliminar-semestre" 
                            data-semestre-id="${semestre._id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    actualizarPaginacion();
}

function actualizarPaginacion() {
    const totalPaginas = Math.ceil(semestresFiltrados.length / semestresPorPagina);
    const paginacionContainer = document.getElementById('pagination-container');
    
    console.log('🔢 Actualizando paginación:', {
        semestres: semestresFiltrados.length,
        totalPaginas,
        paginaActual,
        semestresPorPagina
    });
    
    if (!paginacionContainer) {
        console.log('❌ No se encontró el contenedor de paginación');
        return;
    }
    
    // Actualizar información de paginación
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const inicio = (paginaActual - 1) * semestresPorPagina + 1;
        const fin = Math.min(paginaActual * semestresPorPagina, semestresFiltrados.length);
        paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${semestresFiltrados.length} semestres`;
    }
    
    // Actualizar botones de navegación
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (prevButton) {
        prevButton.disabled = paginaActual === 1;
        prevButton.classList.toggle('disabled:opacity-50', paginaActual === 1);
        prevButton.classList.toggle('disabled:cursor-not-allowed', paginaActual === 1);
    }
    
    if (nextButton) {
        nextButton.disabled = paginaActual === totalPaginas;
        nextButton.classList.toggle('disabled:opacity-50', paginaActual === totalPaginas);
        nextButton.classList.toggle('disabled:cursor-not-allowed', paginaActual === totalPaginas);
    }
    
    // Generar números de página
    const pageNumbers = document.getElementById('page-numbers');
    if (pageNumbers) {
        if (totalPaginas <= 1) {
            console.log('🔢 Solo hay 1 página o menos, ocultando números');
            pageNumbers.innerHTML = '';
            return;
        }
        
        const numerosHTML = generarNumerosPagina(paginaActual, totalPaginas);
        console.log('🔢 Generando números de página:', numerosHTML);
        pageNumbers.innerHTML = numerosHTML;
    } else {
        console.log('❌ No se encontró el contenedor de números de página');
    }
}

function generarNumerosPagina(paginaActual, totalPaginas) {
    console.log('🔢 Generando números de página:', { paginaActual, totalPaginas });
    
    const numeros = [];
    const maxVisible = 5;
    
    let inicio = Math.max(1, paginaActual - Math.floor(maxVisible / 2));
    let fin = Math.min(totalPaginas, inicio + maxVisible - 1);
    
    if (fin - inicio + 1 < maxVisible) {
        inicio = Math.max(1, fin - maxVisible + 1);
    }
    
    console.log('🔢 Rango de páginas:', { inicio, fin, paginaActual });
    
    if (inicio > 1) {
        numeros.push(`<button class="btn-pagina-numero" data-pagina="1">1</button>`);
        if (inicio > 2) {
            numeros.push(`<span class="px-2 text-slate-400">...</span>`);
        }
    }
    
    for (let i = inicio; i <= fin; i++) {
        const activa = i === paginaActual ? 'activa' : '';
        const boton = `<button class="btn-pagina-numero ${activa}" data-pagina="${i}">${i}</button>`;
        console.log(`🔢 Botón página ${i}:`, { activa, boton });
        numeros.push(boton);
    }
    
    if (fin < totalPaginas) {
        if (fin < totalPaginas - 1) {
            numeros.push(`<span class="px-2 text-slate-400">...</span>`);
        }
        numeros.push(`<button class="btn-pagina-numero" data-pagina="${totalPaginas}">${totalPaginas}</button>`);
    }
    
    const resultado = numeros.join('');
    console.log('🔢 HTML generado:', resultado);
    return resultado;
}

function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(semestresFiltrados.length / semestresPorPagina);
    const nuevaPagina = paginaActual + direccion;
    
    console.log('🔄 Cambiando página:', { 
        direccion, 
        paginaActual, 
        nuevaPagina, 
        totalPaginas 
    });
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        console.log('✅ Página cambiada a:', paginaActual);
        mostrarSemestres();
    } else {
        console.log('❌ No se puede cambiar a la página:', nuevaPagina);
    }
}

function irAPagina(pagina) {
    const totalPaginas = Math.ceil(semestresFiltrados.length / semestresPorPagina);
    
    console.log('🎯 Yendo a página:', { 
        pagina, 
        paginaActual, 
        totalPaginas 
    });
    
    if (pagina >= 1 && pagina <= totalPaginas) {
        paginaActual = pagina;
        console.log('✅ Página cambiada a:', paginaActual);
        mostrarSemestres();
    } else {
        console.log('❌ Página inválida:', pagina);
    }
}

function abrirModalSemestre() {
    const modalTitle = document.getElementById('modal-title');
    const formSemestre = document.getElementById('form-semestre');
    const modalSemestre = document.getElementById('modal-semestre');
    
    if (modalTitle) modalTitle.textContent = 'Nuevo Semestre';
    if (formSemestre) {
        formSemestre.reset();
        delete formSemestre.dataset.semestreId;
    }
    if (modalSemestre) modalSemestre.classList.remove('hidden');
}

function cerrarModalSemestre() {
    console.log('🚪 Cerrando modal de semestres');
    const modalSemestre = document.getElementById('modal-semestre');
    const formSemestre = document.getElementById('form-semestre');
    
    if (modalSemestre) {
        modalSemestre.classList.add('hidden');
        console.log('✅ Modal ocultado');
    } else {
        console.error('❌ No se encontró el modal de semestres');
    }
    
    if (formSemestre) {
        formSemestre.reset();
        delete formSemestre.dataset.semestreId;
        console.log('✅ Formulario reseteado');
    }
}

async function editarSemestre(semestreId) {
    try {
        console.log('🔄 Editando semestre:', semestreId);
        
        const response = await fetch(`/admin/api/semestres/${semestreId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const semestre = await response.json();
        console.log('📦 Semestre obtenido para edición:', semestre);
        
        const modalTitle = document.getElementById('modal-title');
        const formSemestre = document.getElementById('form-semestre');
        const modalSemestre = document.getElementById('modal-semestre');
        
        if (modalTitle) modalTitle.textContent = 'Editar Semestre';
        if (formSemestre) formSemestre.dataset.semestreId = semestreId;
        if (modalSemestre) modalSemestre.classList.remove('hidden');
        
        // Llenar el formulario con los datos del semestre
        document.getElementById('numero').value = semestre.numero;
        document.getElementById('nombre').value = semestre.nombre;
        document.getElementById('descripcion').value = semestre.descripcion || '';
        document.getElementById('orden').value = semestre.orden;
        document.getElementById('creditosRequeridos').value = semestre.creditosRequeridos || 0;
        document.getElementById('activa').checked = semestre.activo;
        
    } catch (error) {
        console.error('❌ Error obteniendo semestre para edición:', error);
        mostrarError('Error cargando semestre para edición: ' + error.message);
    }
}

async function toggleSemestre(semestreId, estadoActual) {
    try {
        console.log('🔄 Cambiando estado de semestre:', semestreId, 'de', estadoActual, 'a', !estadoActual);
        
        const response = await fetch(`/admin/api/semestres/toggle/${semestreId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activo: !estadoActual })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Respuesta del servidor:', data);
        
        // Mostrar notificación de éxito
        console.log('🔔 Mostrando notificación de éxito para toggle');
        mostrarNotificacion('Éxito', data.message || 'Estado de semestre actualizado correctamente', 'success');
        
        // Recargar los semestres
        console.log('🔄 Recargando semestres...');
        await cargarSemestres();
        console.log('✅ Semestres recargados');
        
    } catch (error) {
        console.error('❌ Error al cambiar estado del semestre:', error);
        mostrarError('Error al cambiar estado del semestre: ' + error.message);
    }
}

async function eliminarSemestre(semestreId) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción eliminará el semestre y no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal2-popup-modern',
            confirmButton: 'swal2-confirm-modern',
            cancelButton: 'swal2-cancel-modern'
        }
    });
    
    if (result.isConfirmed) {
        try {
            console.log('🗑️ Eliminando semestre:', semestreId);
            
            const response = await fetch(`/admin/api/semestres/${semestreId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📡 Respuesta del servidor recibida:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error del servidor:', errorData);
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Datos de respuesta:', data);
            
            // Mostrar notificación de éxito
            console.log('🔔 Mostrando notificación de éxito para eliminación');
            mostrarNotificacion('Éxito', data.message || 'Semestre eliminado correctamente', 'success');
            
            // Recargar los semestres
            console.log('🔄 Recargando semestres...');
            await cargarSemestres();
            console.log('✅ Semestres recargados');
            
        } catch (error) {
            console.error('❌ Error al eliminar semestre:', error);
            mostrarError('Error al eliminar semestre: ' + error.message);
        }
    } else {
        console.log('❌ Eliminación cancelada por el usuario');
    }
}

async function manejarSubmitSemestre(e) {
    e.preventDefault();
    
    const formSemestre = document.getElementById('form-semestre');
    const semestreId = formSemestre.dataset.semestreId;
    const numero = document.getElementById('numero').value;
    const nombre = document.getElementById('nombre').value;
    const descripcion = document.getElementById('descripcion').value;
    const orden = document.getElementById('orden').value;
    const creditosRequeridos = document.getElementById('creditosRequeridos').value;
    const activa = document.getElementById('activa').checked;
    
    console.log('📝 Datos del formulario:', { 
        semestreId, 
        numero, 
        nombre, 
        descripcion, 
        orden, 
        creditosRequeridos, 
        activa 
    });
    
    try {
        let response;
        
        if (semestreId) {
            // Editar semestre existente
            console.log('🔄 Actualizando semestre:', semestreId);
            response = await fetch(`/admin/api/semestres/${semestreId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    numero: parseInt(numero),
                    nombre,
                    descripcion,
                    orden: parseInt(orden),
                    creditosRequeridos: parseInt(creditosRequeridos),
                    activo: activa
                })
            });
        } else {
            // Crear nuevo semestre
            console.log('🔄 Creando nuevo semestre');
            response = await fetch('/admin/api/semestres', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    numero: parseInt(numero),
                    nombre,
                    descripcion,
                    orden: parseInt(orden),
                    creditosRequeridos: parseInt(creditosRequeridos),
                    activo: activa
                })
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Respuesta del servidor:', data);
        
        // Mostrar notificación de éxito
        const mensajeExito = semestreId ? 'Semestre actualizado correctamente' : 'Semestre creado correctamente';
        console.log('🔔 Mostrando notificación de éxito:', mensajeExito);
        mostrarNotificacion('Éxito', mensajeExito, 'success');
        
        cerrarModalSemestre();
        
        // Recargar los semestres
        console.log('🔄 Recargando semestres...');
        await cargarSemestres();
        console.log('✅ Semestres recargados');
        
    } catch (error) {
        console.error('❌ Error procesando semestre:', error);
        mostrarError('Error procesando semestre: ' + error.message);
    }
}

function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    console.log('🔔 Mostrando notificación:', { titulo, mensaje, tipo });
    
    // Usar SweetAlert2 como alternativa si está disponible
    if (typeof Swal !== 'undefined') {
        const iconos = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        
        Swal.fire({
            title: titulo,
            text: mensaje,
            icon: iconos[tipo] || 'info',
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
        return;
    }
    
    // Fallback a notificación personalizada
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        background: ${tipo === 'success' ? '#f0fdf4' : tipo === 'error' ? '#fef2f2' : tipo === 'warning' ? '#fffbeb' : '#f0f9ff'};
        border: 1px solid ${tipo === 'success' ? '#bbf7d0' : tipo === 'error' ? '#fecaca' : tipo === 'warning' ? '#fed7aa' : '#bae6fd'};
        color: ${tipo === 'success' ? '#166534' : tipo === 'error' ? '#dc2626' : tipo === 'warning' ? '#d97706' : '#1e40af'};
    `;
    
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 20px;">${iconos[tipo] || 'ℹ️'}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${titulo}</div>
                <div style="font-size: 14px; opacity: 0.8;">${mensaje}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.6;
                padding: 0;
                margin-left: 8px;
            ">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 5000);
    
    console.log('✅ Notificación agregada al DOM');
}

function mostrarError(mensaje) {
    mostrarNotificacion('Error', mensaje, 'error');
}

// Función de prueba para verificar notificaciones (se puede llamar desde la consola)
function probarNotificaciones() {
    console.log('🧪 Probando notificaciones...');
    mostrarNotificacion('Prueba', 'Esta es una notificación de prueba', 'success');
    setTimeout(() => mostrarNotificacion('Prueba 2', 'Esta es otra notificación de prueba', 'error'), 1000);
    setTimeout(() => mostrarNotificacion('Prueba 3', 'Esta es una notificación de advertencia', 'warning'), 2000);
}

// Hacer la función disponible globalmente para pruebas
window.probarNotificaciones = probarNotificaciones;
