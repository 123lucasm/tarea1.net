// Materias JavaScript
// Inicializar Socket.IO
const socket = io();

// Variables globales para filtros
let todasLasMaterias = [];
let materiasFiltradas = [];

// Variables globales para paginación
let currentPage = 1;
let totalPages = 1;
let totalMaterias = 0;
let currentFilters = {
    search: '',
    status: '',
    semester: ''
};

document.addEventListener('DOMContentLoaded', function() {
    // Cargar materias
    cargarMaterias();
    
    // Cargar semestres para filtros
    cargarSemestres();
    
    // Configurar eventos de Socket.IO
    configurarSocketEvents();
    
    // Configurar filtros
    configurarFiltros();
    
    // Configurar formulario
    configurarFormulario();
});

function configurarSocketEvents() {
    // Escuchar nuevas materias
    socket.on('nueva-materia', function(materia) {
        console.log('Nueva materia creada:', materia);
        mostrarNotificacion('Nueva materia creada', `${materia.nombre} (${materia.codigo}) fue agregada`);
        cargarMaterias();
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
}

function actualizarEstadoConexion(estado, texto) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator && statusText) {
        indicator.className = `status-indicator ${estado}`;
        statusText.textContent = texto;
    }
}

function mostrarNotificacion(titulo, mensaje) {
    console.log('Mostrando notificación:', titulo, mensaje);
    
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
                <button class="btn-cerrar-notificacion text-slate-400 hover:text-slate-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    // Agregar event listener para el botón de cerrar
    const cerrarBtn = notificacion.querySelector('.btn-cerrar-notificacion');
    cerrarBtn.addEventListener('click', () => {
        notificacion.remove();
    });
    
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

async function cargarMaterias(page = 1) {
    try {
        // Construir URL con parámetros de paginación y filtros
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        const url = `/admin/api/materias?${params}`;
        console.log('Cargando materias desde:', url);
        
        const response = await fetch(url, {
            credentials: 'same-origin'
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error del servidor:', errorText);
            throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Datos cargados:', data);
        
        // Verificar si la respuesta tiene la estructura esperada
        if (!data.pagination) {
            console.error('Respuesta de API no tiene paginación:', data);
            
            // Fallback: si es un array directo (API antigua)
            if (Array.isArray(data)) {
                console.log('Usando fallback para array directo con', data.length, 'materias');
                
                // Almacenar todas las materias
                todasLasMaterias = data;
                materiasFiltradas = [...data];
                
                currentPage = 1;
                totalPages = 1;
                totalMaterias = data.length;
                
                actualizarEstadisticas(data);
                mostrarMaterias(data);
                actualizarPaginacion();
                return;
            }
            
            throw new Error('Formato de respuesta inválido');
        }
        
        // Almacenar todas las materias para filtros
        todasLasMaterias = data.materias;
        materiasFiltradas = [...data.materias];
        
        // Actualizar variables globales
        currentPage = data.pagination.currentPage;
        totalPages = data.pagination.totalPages;
        totalMaterias = data.pagination.totalMaterias;
        
        // Actualizar estadísticas
        actualizarEstadisticas(data.materias);
        
        // Mostrar materias en la tabla
        mostrarMaterias(data.materias);
        
        // Actualizar controles de paginación
        actualizarPaginacion();
        
    } catch (error) {
        console.error('Error cargando materias:', error);
        
        // Mostrar error más detallado
        const errorMessage = error.message || 'Error desconocido';
        mostrarError('Error cargando materias', errorMessage);
        
        // Resetear variables de paginación en caso de error
        currentPage = 1;
        totalPages = 1;
        totalMaterias = 0;
        actualizarPaginacion();
    }
}

function actualizarEstadisticas(materias) {
    const materiasActivas = materias.filter(m => m.activa).length;
    const totalCreditos = materias.reduce((sum, m) => sum + (m.creditos || 0), 0);
    const semestresUnicos = new Set(materias.map(m => m.semestre?.nombre).filter(Boolean)).size;
    
    // Usar el total de materias de la paginación
    const totalMateriasCountElement = document.getElementById('total-materias-count');
    const materiasActivasCountElement = document.getElementById('materias-activas-count');
    const totalCreditosCountElement = document.getElementById('total-creditos-count');
    const semestresCountElement = document.getElementById('semestres-count');
    const totalMateriasElement = document.getElementById('total-materias');
    
    if (totalMateriasCountElement) totalMateriasCountElement.textContent = totalMaterias;
    if (materiasActivasCountElement) materiasActivasCountElement.textContent = materiasActivas;
    if (totalCreditosCountElement) totalCreditosCountElement.textContent = totalCreditos;
    if (semestresCountElement) semestresCountElement.textContent = semestresUnicos;
    if (totalMateriasElement) totalMateriasElement.textContent = `${totalMaterias} materias`;
}

function mostrarMaterias(materias) {
    const tbody = document.getElementById('materias-table-body');
    const loadingRow = document.getElementById('loading-row');
    
    if (!tbody) return;
    
    if (loadingRow) {
        loadingRow.remove();
    }
    
    if (materias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-book text-4xl text-slate-400 mb-4"></i>
                        <p class="text-slate-500">No hay materias registradas</p>
                        <button id="btn-crear-primera-materia" class="btn-success mt-4">
                            <i class="fas fa-plus"></i>
                            Crear Primera Materia
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = materias.map(materia => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div>
                    <div class="text-sm font-semibold text-slate-900">${materia.nombre}</div>
                    <div class="text-xs text-slate-500">${materia.descripcion || 'Sin descripción'}</div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    ${materia.codigo}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                ${materia.creditos || 0}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                ${materia.semestre?.nombre || 'Sin semestre'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                <div class="space-y-1">
                    ${materia.horarios && materia.horarios.length > 0 
                        ? materia.horarios.map(horario => `
                            <div class="flex items-center space-x-2 text-xs">
                                <span class="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                                    ${horario.dia.charAt(0).toUpperCase() + horario.dia.slice(1)}
                                </span>
                                <span class="text-slate-600">${horario.horaInicio} - ${horario.horaFin}</span>
                            </div>
                        `).join('')
                        : '<span class="text-slate-400 italic">Sin horarios</span>'
                    }
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                <div class="flex items-center">
                    <span class="text-slate-600">${materia.cupoDisponible || 0}/${materia.cupoMaximo || 50}</span>
                    <div class="ml-2 w-16 bg-slate-200 rounded-full h-2">
                        <div class="bg-emerald-500 h-2 rounded-full" style="width: ${((materia.cupoDisponible || 0) / (materia.cupoMaximo || 50)) * 100}%"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${materia.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    <i class="fas fa-${materia.activa ? 'check' : 'times'} mr-1"></i>
                    ${materia.activa ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                    <button class="btn-editar-materia text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors" data-materia-id="${materia._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar-materia text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors" data-materia-id="${materia._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Agregar event listeners a los botones
    tbody.querySelectorAll('.btn-editar-materia').forEach(btn => {
        btn.addEventListener('click', () => {
            const materiaId = btn.getAttribute('data-materia-id');
            editarMateria(materiaId);
        });
    });
    
    tbody.querySelectorAll('.btn-eliminar-materia').forEach(btn => {
        btn.addEventListener('click', () => {
            const materiaId = btn.getAttribute('data-materia-id');
            eliminarMateria(materiaId);
        });
    });
}

async function cargarSemestres() {
    try {
        const response = await fetch('/admin/api/semestres', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const semestres = await response.json();
        console.log('Semestres cargados:', semestres);
        
        const semesterFilter = document.getElementById('semester-filter');
        const materiaSemestre = document.getElementById('materia-semestre');
        
        // Llenar filtro de semestres
        if (semesterFilter) {
            semesterFilter.innerHTML = '<option value="">Todos los semestres</option>' +
                semestres.map(s => `<option value="${s._id}">${s.nombre}</option>`).join('');
        }
        
        // Llenar select del formulario
        if (materiaSemestre) {
            materiaSemestre.innerHTML = '<option value="">Seleccionar semestre</option>' +
                semestres.map(s => `<option value="${s._id}">${s.nombre}</option>`).join('');
        }
            
    } catch (error) {
        console.error('Error cargando semestres:', error);
        // Fallback a semestres hardcodeados si falla la API
        const semestres = [
            { _id: '1', nombre: 'Primer Semestre' },
            { _id: '2', nombre: 'Segundo Semestre' },
            { _id: '3', nombre: 'Tercer Semestre' },
            { _id: '4', nombre: 'Cuarto Semestre' },
            { _id: '5', nombre: 'Quinto Semestre' },
            { _id: '6', nombre: 'Sexto Semestre' },
            { _id: '7', nombre: 'Séptimo Semestre' },
            { _id: '8', nombre: 'Octavo Semestre' }
        ];
        
        const semesterFilter = document.getElementById('semester-filter');
        const materiaSemestre = document.getElementById('materia-semestre');
        
        if (semesterFilter) {
            semesterFilter.innerHTML = '<option value="">Todos los semestres</option>' +
                semestres.map(s => `<option value="${s._id}">${s.nombre}</option>`).join('');
        }
        
        if (materiaSemestre) {
            materiaSemestre.innerHTML = '<option value="">Seleccionar semestre</option>' +
                semestres.map(s => `<option value="${s._id}">${s.nombre}</option>`).join('');
        }
    }
}

function configurarFiltros() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const semesterFilter = document.getElementById('semester-filter');
    
    // Para búsqueda, usar debounce para evitar muchas peticiones
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                aplicarFiltros();
            }, 500); // Esperar 500ms después del último input
        });
    }
    
    // Para los selects, aplicar filtros inmediatamente
    [statusFilter, semesterFilter].forEach(element => {
        if (element) {
            element.addEventListener('change', aplicarFiltros);
        }
    });
    
    // Event listeners para los botones de acción
    const btnActualizar = document.getElementById('btn-actualizar-materias');
    const btnNuevaMateria = document.getElementById('btn-nueva-materia');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', () => {
            cargarMaterias();
        });
    }
    
    if (btnNuevaMateria) {
        btnNuevaMateria.addEventListener('click', () => {
            mostrarFormularioCrear();
        });
    }
    
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            cerrarModal();
        });
    }
    
    // Delegación de eventos para botones dinámicos
    document.addEventListener('click', function(e) {
        if (e.target.closest('#btn-limpiar-filtros')) {
            limpiarFiltros();
        }
        if (e.target.closest('#btn-crear-primera-materia')) {
            mostrarFormularioCrear();
        }
    });
}

function aplicarFiltros() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const semesterFilter = document.getElementById('semester-filter');
    
    if (!searchInput || !statusFilter || !semesterFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    const semesterValue = semesterFilter.value;
    
    // Filtrar materias
    materiasFiltradas = todasLasMaterias.filter(materia => {
        // Filtro de búsqueda (nombre, código, semestre)
        const matchesSearch = !searchTerm || 
            materia.nombre.toLowerCase().includes(searchTerm) ||
            materia.codigo.toLowerCase().includes(searchTerm) ||
            (materia.semestre?.nombre && materia.semestre.nombre.toLowerCase().includes(searchTerm));
        
        // Filtro de estado
        const matchesStatus = !statusValue || 
            (statusValue === 'activa' && materia.activa) ||
            (statusValue === 'inactiva' && !materia.activa);
        
        // Filtro de semestre
        const matchesSemester = !semesterValue || materia.semestre?._id === semesterValue;
        
        return matchesSearch && matchesStatus && matchesSemester;
    });
    
    // Mostrar materias filtradas
    mostrarMaterias(materiasFiltradas);
    actualizarEstadisticas(materiasFiltradas);
    
    // Mostrar mensaje si no hay resultados
    mostrarMensajeFiltros();
    
    // Actualizar indicador de filtros activos
    actualizarIndicadorFiltros();
}

function mostrarMensajeFiltros() {
    const tbody = document.getElementById('materias-table-body');
    
    if (!tbody) return;
    
    if (materiasFiltradas.length === 0 && todasLasMaterias.length > 0) {
        // Mostrar mensaje de no resultados
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-search text-gray-400 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron materias</h3>
                        <p class="text-gray-500 mb-4">No hay materias que coincidan con los filtros aplicados</p>
                        <button id="btn-limpiar-filtros" class="btn-secondary">
                            <i class="fas fa-times mr-2"></i>
                            Limpiar Filtros
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

function limpiarFiltros() {
    // Limpiar campos de filtro
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const semesterFilter = document.getElementById('semester-filter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (semesterFilter) semesterFilter.value = '';
    
    // Restaurar todas las materias
    materiasFiltradas = [...todasLasMaterias];
    
    // Mostrar todas las materias
    mostrarMaterias(materiasFiltradas);
    actualizarEstadisticas(materiasFiltradas);
    
    // Actualizar indicador de filtros
    actualizarIndicadorFiltros();
}

function actualizarIndicadorFiltros() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const semesterFilter = document.getElementById('semester-filter');
    
    if (!searchInput || !statusFilter || !semesterFilter) return;
    
    const searchTerm = searchInput.value.trim();
    const statusValue = statusFilter.value;
    const semesterValue = semesterFilter.value;
    
    let filtrosActivos = 0;
    if (searchTerm) filtrosActivos++;
    if (statusValue) filtrosActivos++;
    if (semesterValue) filtrosActivos++;
    
    // Actualizar el contador de materias para mostrar filtros activos
    const totalElement = document.getElementById('total-materias-count');
    if (totalElement) {
        if (filtrosActivos > 0) {
            totalElement.innerHTML = `
                <span class="text-emerald-600">${materiasFiltradas.length}</span>
                <span class="text-gray-400">/ ${todasLasMaterias.length}</span>
                <span class="text-xs text-amber-600 ml-2">
                    <i class="fas fa-filter mr-1"></i>
                    ${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''} activo${filtrosActivos > 1 ? 's' : ''}
                </span>
            `;
        } else {
            totalElement.textContent = materiasFiltradas.length;
        }
    }
}

function cambiarPagina(direction) {
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        cargarMaterias(newPage);
    }
}

function irAPagina(page) {
    if (page >= 1 && page <= totalPages) {
        cargarMaterias(page);
    }
}

function actualizarPaginacion() {
    const paginationInfo = document.getElementById('pagination-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');
    
    if (!paginationInfo || !prevButton || !nextButton || !pageNumbers) return;
    
    // Actualizar información de paginación
    const startItem = (currentPage - 1) * 10 + 1;
    const endItem = Math.min(currentPage * 10, totalMaterias);
    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalMaterias} materias`;
    
    // Actualizar botones de navegación
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    
    // Generar números de página
    pageNumbers.innerHTML = '';
    
    // Mostrar máximo 5 páginas
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Botón "Primera página" si no está visible
    if (startPage > 1) {
        const firstButton = document.createElement('button');
        firstButton.textContent = '1';
        firstButton.className = 'px-3 py-1 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50';
        firstButton.onclick = () => irAPagina(1);
        pageNumbers.appendChild(firstButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2 py-1 text-sm text-slate-500';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Números de página
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = `px-3 py-1 text-sm border rounded-md ${
            i === currentPage 
                ? 'bg-emerald-500 text-white border-emerald-500' 
                : 'bg-white border-slate-300 hover:bg-slate-50'
        }`;
        pageButton.onclick = () => irAPagina(i);
        pageNumbers.appendChild(pageButton);
    }
    
    // Botón "Última página" si no está visible
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'px-2 py-1 text-sm text-slate-500';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastButton = document.createElement('button');
        lastButton.textContent = totalPages;
        lastButton.className = 'px-3 py-1 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50';
        lastButton.onclick = () => irAPagina(totalPages);
        pageNumbers.appendChild(lastButton);
    }
}

function configurarFormulario() {
    const form = document.getElementById('materia-form');
    if (!form) return;
    
    // Configurar botón de agregar horario
    const btnAgregarHorario = document.getElementById('btn-agregar-horario');
    if (btnAgregarHorario) {
        btnAgregarHorario.addEventListener('click', agregarHorario);
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const horarios = obtenerHorariosDelFormulario();
        
        const materiaData = {
            nombre: formData.get('nombre'),
            codigo: formData.get('codigo'),
            creditos: parseInt(formData.get('creditos')),
            semestre: formData.get('semestre'),
            descripcion: formData.get('descripcion'),
            cupoMaximo: parseInt(formData.get('cupoMaximo')),
            activa: formData.get('activa') === 'true',
            horarios: horarios
        };
        
        const materiaId = form.dataset.materiaId;
        const isEditing = !!materiaId;
        
        try {
            const url = isEditing ? `/admin/api/materias/${materiaId}` : '/admin/api/materias';
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(materiaData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }
            
            const materia = await response.json();
            console.log(isEditing ? 'Materia actualizada:' : 'Materia creada:', materia);
            
            // Mostrar mensaje de éxito con SweetAlert2
            await Swal.fire({
                title: isEditing ? '¡Actualizada!' : '¡Creada!',
                text: `${materia.nombre} (${materia.codigo}) fue ${isEditing ? 'actualizada' : 'creada'} exitosamente`,
                icon: 'success',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true
            });
            
            cerrarModal();
            await cargarMaterias();
            aplicarFiltros(); // Aplicar filtros actuales
            
        } catch (error) {
            console.error(`Error ${isEditing ? 'actualizando' : 'creando'} materia:`, error);
            
            await Swal.fire({
                title: 'Error',
                text: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la materia: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    });
}

function mostrarFormularioCrear() {
    const modalTitle = document.getElementById('modal-title');
    const materiaForm = document.getElementById('materia-form');
    const materiaModal = document.getElementById('materia-modal');
    
    if (modalTitle) modalTitle.textContent = 'Nueva Materia';
    if (materiaForm) {
        materiaForm.reset();
        delete materiaForm.dataset.materiaId; // Limpiar ID de edición
    }
    
    // Limpiar horarios
    cargarHorariosEnFormulario([]);
    
    if (materiaModal) materiaModal.classList.remove('hidden');
}

async function editarMateria(id) {
    try {
        // Obtener datos de la materia
        const response = await fetch(`/admin/api/materias/${id}`);
        const materia = await response.json();
        
        if (response.ok) {
            // Llenar el formulario con los datos de la materia
            const modalTitle = document.getElementById('modal-title');
            const materiaNombre = document.getElementById('materia-nombre');
            const materiaCodigo = document.getElementById('materia-codigo');
            const materiaCreditos = document.getElementById('materia-creditos');
            const materiaSemestre = document.getElementById('materia-semestre');
            const materiaDescripcion = document.getElementById('materia-descripcion');
            const materiaCupoMaximo = document.getElementById('materia-cupo-maximo');
            const materiaActiva = document.getElementById('materia-activa');
            const materiaModal = document.getElementById('materia-modal');
            const form = document.getElementById('materia-form');
            
            if (modalTitle) modalTitle.textContent = 'Editar Materia';
            if (materiaNombre) materiaNombre.value = materia.nombre;
            if (materiaCodigo) materiaCodigo.value = materia.codigo;
            if (materiaCreditos) materiaCreditos.value = materia.creditos;
            if (materiaSemestre) materiaSemestre.value = materia.semestre?._id || '';
            if (materiaDescripcion) materiaDescripcion.value = materia.descripcion || '';
            if (materiaCupoMaximo) materiaCupoMaximo.value = materia.cupoMaximo || 50;
            if (materiaActiva) materiaActiva.value = materia.activa.toString();
            
            // Cargar horarios existentes
            cargarHorariosEnFormulario(materia.horarios || []);
            
            // Mostrar modal
            if (materiaModal) materiaModal.classList.remove('hidden');
            
            // Cambiar el comportamiento del formulario para edición
            if (form) form.dataset.materiaId = id;
        } else {
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos de la materia',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error cargando materia:', error);
        Swal.fire({
            title: 'Error',
            text: 'Error al cargar los datos de la materia',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

async function eliminarMateria(id) {
    try {
        // Obtener datos de la materia para mostrar en la confirmación
        const response = await fetch(`/admin/api/materias/${id}`);
        const materia = await response.json();
        
        if (response.ok) {
            const nombreMateria = materia.nombre;
            
            // Mostrar alerta de confirmación con SweetAlert2
            const result = await Swal.fire({
                title: '¿Eliminar Materia?',
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff6b6b, #ee5a52); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);">
                            <i class="fas fa-trash" style="color: white; font-size: 32px;"></i>
                        </div>
                        <h3 style="color: #2d3748; font-size: 24px; font-weight: 600; margin: 0 0 15px 0; font-family: 'Inter', sans-serif;">
                            ¿Eliminar Materia?
                        </h3>
                        <p style="color: #4a5568; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
                            Estás a punto de eliminar permanentemente<br>
                            <strong style="color: #2d3748; font-size: 18px;">${nombreMateria}</strong>
                        </p>
                        <div style="background: linear-gradient(135deg, #fed7d7, #feb2b2); border: 1px solid #fc8181; border-radius: 12px; padding: 15px; margin: 20px 0; text-align: left;">
                            <div style="display: flex; align-items: center; color: #c53030;">
                                <i class="fas fa-exclamation-triangle" style="margin-right: 8px; font-size: 16px;"></i>
                                <span style="font-weight: 600; font-size: 14px;">Esta acción no se puede deshacer</span>
                            </div>
                            <p style="color: #742a2a; font-size: 13px; margin: 8px 0 0 0; line-height: 1.4;">
                                Todos los datos de la materia serán eliminados permanentemente del sistema.
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
                        <span>Eliminar Materia</span>
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
                await confirmarEliminarMateria(id);
            }
        } else {
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos de la materia',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error cargando materia:', error);
        Swal.fire({
            title: 'Error',
            text: 'Error al cargar los datos de la materia',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

async function confirmarEliminarMateria(materiaId) {
    try {
        // Mostrar loading
        Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espera mientras eliminamos la materia',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(`/admin/api/materias/${materiaId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Mostrar mensaje de éxito
            await Swal.fire({
                title: '¡Eliminado!',
                text: 'La materia ha sido eliminada correctamente',
                icon: 'success',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true
            });
            
            // Recargar materias
            await cargarMaterias();
            aplicarFiltros(); // Aplicar filtros actuales
        } else {
            const result = await response.json();
            await Swal.fire({
                title: 'Error',
                text: result.message || 'Error al eliminar la materia',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    } catch (error) {
        console.error('Error eliminando materia:', error);
        await Swal.fire({
            title: 'Error',
            text: 'Error de conexión. Intenta nuevamente.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

function cerrarModal() {
    const materiaModal = document.getElementById('materia-modal');
    const materiaForm = document.getElementById('materia-form');
    
    if (materiaModal) materiaModal.classList.add('hidden');
    if (materiaForm) delete materiaForm.dataset.materiaId; // Limpiar ID de edición
}

function mostrarError(titulo, mensaje) {
    const tbody = document.getElementById('materias-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-red-500">${titulo}</p>
                    <p class="text-sm text-slate-500 mt-2">${mensaje}</p>
                </div>
            </td>
        </tr>
    `;
}

// ===== FUNCIONES PARA MANEJAR HORARIOS =====

let contadorHorarios = 0;

function agregarHorario() {
    contadorHorarios++;
    
    const horariosContainer = document.getElementById('horarios-container');
    const sinHorarios = document.getElementById('sin-horarios');
    
    if (!horariosContainer) return;
    
    // Ocultar mensaje de sin horarios
    if (sinHorarios) {
        sinHorarios.classList.add('hidden');
    }
    
    const horarioElement = document.createElement('div');
    horarioElement.className = 'horario-item bg-gray-50 border border-gray-200 rounded-xl p-4';
    horarioElement.dataset.horarioId = contadorHorarios;
    
    horarioElement.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h5 class="text-sm font-semibold text-gray-700 flex items-center">
                <i class="fas fa-clock mr-2 text-emerald-500"></i>
                Horario ${contadorHorarios}
            </h5>
            <button type="button" class="btn-eliminar-horario text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors" data-horario-id="${contadorHorarios}">
                <i class="fas fa-trash text-sm"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Día *</label>
                <select name="horario-dia-${contadorHorarios}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm">
                    <option value="">Seleccionar día</option>
                    <option value="lunes">Lunes</option>
                    <option value="martes">Martes</option>
                    <option value="miércoles">Miércoles</option>
                    <option value="jueves">Jueves</option>
                    <option value="viernes">Viernes</option>
                    <option value="sábado">Sábado</option>
                </select>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Hora Inicio *</label>
                <input type="time" name="horario-hora-inicio-${contadorHorarios}" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm">
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Hora Fin *</label>
                <input type="time" name="horario-hora-fin-${contadorHorarios}" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm">
            </div>
        </div>
    `;
    
    horariosContainer.appendChild(horarioElement);
    
    // Agregar event listener para el botón de eliminar
    const btnEliminar = horarioElement.querySelector('.btn-eliminar-horario');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => {
            eliminarHorario(contadorHorarios);
        });
    }
}

function eliminarHorario(horarioId) {
    const horarioElement = document.querySelector(`[data-horario-id="${horarioId}"]`);
    if (horarioElement) {
        horarioElement.remove();
        
        // Mostrar mensaje de sin horarios si no quedan horarios
        const horariosContainer = document.getElementById('horarios-container');
        const sinHorarios = document.getElementById('sin-horarios');
        
        if (horariosContainer && horariosContainer.children.length === 0 && sinHorarios) {
            sinHorarios.classList.remove('hidden');
        }
    }
}

function obtenerHorariosDelFormulario() {
    const horarios = [];
    const horariosElements = document.querySelectorAll('.horario-item');
    
    horariosElements.forEach(element => {
        const horarioId = element.dataset.horarioId;
        
        const dia = element.querySelector(`[name="horario-dia-${horarioId}"]`)?.value;
        const horaInicio = element.querySelector(`[name="horario-hora-inicio-${horarioId}"]`)?.value;
        const horaFin = element.querySelector(`[name="horario-hora-fin-${horarioId}"]`)?.value;
        
        if (dia && horaInicio && horaFin) {
            horarios.push({
                dia: dia,
                horaInicio: horaInicio,
                horaFin: horaFin
            });
        }
    });
    
    return horarios;
}

function cargarHorariosEnFormulario(horarios) {
    const horariosContainer = document.getElementById('horarios-container');
    const sinHorarios = document.getElementById('sin-horarios');
    
    if (!horariosContainer) return;
    
    // Limpiar horarios existentes
    horariosContainer.innerHTML = '';
    
    if (horarios && horarios.length > 0) {
        // Ocultar mensaje de sin horarios
        if (sinHorarios) {
            sinHorarios.classList.add('hidden');
        }
        
        // Cargar cada horario
        horarios.forEach((horario, index) => {
            contadorHorarios = index + 1;
            agregarHorario();
            
            const horarioElement = document.querySelector(`[data-horario-id="${contadorHorarios}"]`);
            if (horarioElement) {
                horarioElement.querySelector(`[name="horario-dia-${contadorHorarios}"]`).value = horario.dia;
                horarioElement.querySelector(`[name="horario-hora-inicio-${contadorHorarios}"]`).value = horario.horaInicio;
                horarioElement.querySelector(`[name="horario-hora-fin-${contadorHorarios}"]`).value = horario.horaFin;
            }
        });
    } else {
        // Mostrar mensaje de sin horarios
        if (sinHorarios) {
            sinHorarios.classList.remove('hidden');
        }
    }
}
