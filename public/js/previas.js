// Previas JavaScript
let previas = [];
let materias = [];
let paginaActual = 1;
let previasPorPagina = 10;
let previasFiltradas = [];
let handleEscape = null; // Variable global para el evento de teclado

// Inicializar Socket.IO
const socket = io();

document.addEventListener('DOMContentLoaded', function() {
    cargarPrevias();
    cargarMaterias();
    configurarSocketEvents();
    configurarEventosModales();
    configurarEventosBotones();
});

function configurarSocketEvents() {
    socket.on('nueva-previa', function(data) {
        mostrarNotificacion('Nueva previa creada', `${data.materia.nombre} requiere ${data.previa.nombre}`);
        cargarPrevias();
    });
    
    socket.on('connect', function() {
        actualizarEstadoConexion('connected', 'Conectado');
    });
    
    socket.on('disconnect', function() {
        actualizarEstadoConexion('disconnected', 'Desconectado');
    });
}

function configurarEventosModales() {
    // Cerrar modal de previas detalladas al hacer clic fuera
    const modalDetalle = document.getElementById('modal-previas-detalle');
    if (modalDetalle) {
        modalDetalle.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalPreviasDetalle();
            }
        });
    }
    
    // Cerrar modal de previa al hacer clic fuera
    const modalPrevia = document.getElementById('modal-previa');
    if (modalPrevia) {
        modalPrevia.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModalPrevia();
            }
        });
    }
}

function configurarEventosBotones() {
    // Delegación de eventos para los botones de la tabla
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // Botón Ver previas detalladas
        if (target.closest('.btn-ver-previas')) {
            const button = target.closest('.btn-ver-previas');
            const materiaId = button.getAttribute('data-materia-id');
            verPreviasDetalle(materiaId);
        }
        
        // Botón Editar previa
        if (target.closest('.btn-editar-previa')) {
            const button = target.closest('.btn-editar-previa');
            const materiaId = button.getAttribute('data-materia-id');
            editarPrevia(materiaId);
        }
        
        // Botón Toggle previa
        if (target.closest('.btn-toggle-previa')) {
            const button = target.closest('.btn-toggle-previa');
            const materiaId = button.getAttribute('data-materia-id');
            const estadoActual = button.getAttribute('data-estado') === 'true';
            togglePrevia(materiaId, estadoActual);
        }
        
        // Botón Eliminar previa
        if (target.closest('.btn-eliminar-previa')) {
            const button = target.closest('.btn-eliminar-previa');
            const materiaId = button.getAttribute('data-materia-id');
            eliminarPrevia(materiaId);
        }
        
        // Botón Nueva Previa
        if (target.closest('.btn-nueva-previa')) {
            abrirModalPrevia();
        }
        
        // Botones de cerrar modal de previas detalladas
        if (target.closest('.btn-cerrar-modal-detalle')) {
            cerrarModalPreviasDetalle();
        }
        
        // Botones de cerrar modal de previa
        if (target.closest('.btn-cerrar-modal-previa')) {
            cerrarModalPrevia();
        }
    });
    
    // Event listeners para filtros
    const searchPrevias = document.getElementById('search-previas');
    const filterTipo = document.getElementById('filter-tipo');
    const filterEstado = document.getElementById('filter-estado');
    const limpiarFiltros = document.getElementById('limpiar-filtros');
    
    if (searchPrevias) searchPrevias.addEventListener('input', filtrarPrevias);
    if (filterTipo) filterTipo.addEventListener('change', filtrarPrevias);
    if (filterEstado) filterEstado.addEventListener('change', filtrarPrevias);
    if (limpiarFiltros) limpiarFiltros.addEventListener('click', limpiarFiltros);
    
    // Event listeners para paginación
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    
    if (prevPage) prevPage.addEventListener('click', () => cambiarPagina(-1));
    if (nextPage) nextPage.addEventListener('click', () => cambiarPagina(1));
    
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

async function cargarPrevias() {
    console.log('🔄 Cargando previas...');
    try {
        const response = await fetch('/admin/api/previas', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Datos recibidos de la API:', data);
        
        previas = data;
        previasFiltradas = [...previas];
        
        actualizarEstadisticas();
        mostrarPrevias();
        
    } catch (error) {
        console.error('❌ Error cargando previas:', error);
        mostrarError('Error cargando previas: ' + error.message);
    }
}

async function cargarMaterias() {
    try {
        console.log('🔄 Cargando materias...');
        const response = await fetch('/admin/api/materias?limit=1000', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Datos de materias recibidos:', data);
        
        materias = data.materias || data;
        console.log('📚 Materias procesadas:', materias);
        
        llenarSelectoresMaterias();
        
    } catch (error) {
        console.error('❌ Error cargando materias:', error);
    }
}

function llenarSelectoresMaterias() {
    console.log('🎨 Llenando selectores de materias...');
    const selectMateria = document.getElementById('materia');
    const materiasContainer = document.getElementById('materias-container');
    
    if (!selectMateria || !materiasContainer) {
        console.error('❌ No se encontraron los elementos del DOM');
        return;
    }
    
    selectMateria.innerHTML = '<option value="">Seleccionar materia</option>';
    materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Primero selecciona una materia para ver las previas disponibles:</p>';
    
    materias.forEach((materia, index) => {
        const option = document.createElement('option');
        option.value = materia._id;
        option.textContent = `${materia.codigo} - ${materia.nombre}`;
        selectMateria.appendChild(option);
    });
    
    selectMateria.addEventListener('change', function() {
        actualizarMateriasDisponibles(this.value);
    });
}

function actualizarMateriasDisponibles(materiaId) {
    console.log('🔄 Actualizando materias disponibles para:', materiaId);
    const materiasContainer = document.getElementById('materias-container');
    
    if (!materiaId) {
        materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Primero selecciona una materia para ver las previas disponibles:</p>';
        return;
    }
    
    const materiaSeleccionada = materias.find(m => m._id === materiaId);
    if (!materiaSeleccionada) {
        console.error('❌ Materia seleccionada no encontrada');
        return;
    }
    
    const materiasDisponibles = materias.filter(materia => {
        if (materia._id === materiaId) return false;
        if (!materia.semestre || !materiaSeleccionada.semestre) return false;
        
        const semestreMateria = materia.semestre.numero || materia.semestre.orden || 0;
        const semestreSeleccionada = materiaSeleccionada.semestre.numero || materiaSeleccionada.semestre.orden || 0;
        
        return semestreMateria < semestreSeleccionada;
    });
    
    materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Selecciona las materias y su tipo de requisito:</p>';
    
    if (materiasDisponibles.length === 0) {
        materiasContainer.innerHTML += '<p class="text-sm text-amber-600 mt-2">No hay materias de semestres anteriores disponibles como previas.</p>';
        return;
    }
    
    materiasDisponibles.forEach((materia, index) => {
        const materiaDiv = document.createElement('div');
        materiaDiv.className = 'materia-row flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors';
        materiaDiv.innerHTML = `
            <div class="flex items-center space-x-3">
                <input type="checkbox" 
                       id="materia-${materia._id}" 
                       class="materia-checkbox form-checkbox" 
                       data-materia-id="${materia._id}"
                       data-materia-codigo="${materia.codigo}"
                       data-materia-nombre="${materia.nombre}">
                <label for="materia-${materia._id}" class="text-sm font-medium text-gray-900 cursor-pointer">
                    ${materia.codigo} - ${materia.nombre}
                    <span class="text-xs text-gray-500 ml-2">(${materia.semestre?.nombre || 'Sin semestre'})</span>
                </label>
            </div>
            <select class="tipo-requisito form-select text-sm w-32" disabled>
                <option value="curso_aprobado">Curso</option>
                <option value="examen_aprobado">Examen</option>
            </select>
        `;
        
        materiasContainer.appendChild(materiaDiv);
    });
    
    agregarEventListenersMaterias();
}

function agregarEventListenersMaterias() {
    const checkboxes = document.querySelectorAll('.materia-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const selectTipo = this.parentElement.parentElement.querySelector('.tipo-requisito');
            if (this.checked) {
                selectTipo.disabled = false;
                selectTipo.classList.remove('opacity-50');
            } else {
                selectTipo.disabled = true;
                selectTipo.classList.add('opacity-50');
            }
        });
    });
}

function actualizarEstadisticas() {
    const total = previas.length;
    const activas = previas.filter(p => p.activa).length;
    const porCurso = previas.filter(p => p.tipo === 'curso_aprobado').length;
    const porExamen = previas.filter(p => p.tipo === 'examen_aprobado').length;
    
    const materiasUnicas = agruparPreviasPorMateria(previas);
    const materiasConPrevias = materiasUnicas.length;
    
    const totalPreviasCount = document.getElementById('total-previas-count');
    const previasActivasCount = document.getElementById('previas-activas-count');
    const previasCursoCount = document.getElementById('previas-curso-count');
    const previasExamenCount = document.getElementById('previas-examen-count');
    const totalPrevias = document.getElementById('total-previas');
    
    if (totalPreviasCount) totalPreviasCount.textContent = materiasConPrevias;
    if (previasActivasCount) previasActivasCount.textContent = materiasUnicas.filter(g => g.activa).length;
    if (previasCursoCount) previasCursoCount.textContent = porCurso;
    if (previasExamenCount) previasExamenCount.textContent = porExamen;
    if (totalPrevias) totalPrevias.textContent = `${materiasConPrevias} materias con previas`;
}

function filtrarPrevias() {
    const searchPrevias = document.getElementById('search-previas');
    const filterTipo = document.getElementById('filter-tipo');
    const filterEstado = document.getElementById('filter-estado');
    
    if (!searchPrevias || !filterTipo || !filterEstado) return;
    
    const searchTerm = searchPrevias.value.toLowerCase();
    const tipoFilter = filterTipo.value;
    const estadoFilter = filterEstado.value;
    
    previasFiltradas = previas.filter(previa => {
        const matchSearch = !searchTerm || 
            previa.materia?.nombre?.toLowerCase().includes(searchTerm) ||
            previa.materia?.codigo?.toLowerCase().includes(searchTerm) ||
            previa.materiaRequerida?.nombre?.toLowerCase().includes(searchTerm) ||
            previa.materiaRequerida?.codigo?.toLowerCase().includes(searchTerm);
        
        const matchTipo = !tipoFilter || previa.tipo === tipoFilter;
        const matchEstado = !estadoFilter || previa.activa.toString() === estadoFilter;
        
        return matchSearch && matchTipo && matchEstado;
    });
    
    paginaActual = 1;
    mostrarPrevias();
}

function limpiarFiltros() {
    const searchPrevias = document.getElementById('search-previas');
    const filterTipo = document.getElementById('filter-tipo');
    const filterEstado = document.getElementById('filter-estado');
    
    if (searchPrevias) searchPrevias.value = '';
    if (filterTipo) filterTipo.value = '';
    if (filterEstado) filterEstado.value = '';
    filtrarPrevias();
}

function aplicarFiltros() {
    filtrarPrevias();
}

function mostrarPrevias() {
    const tbody = document.getElementById('previas-tbody');
    if (!tbody) return;
    
    if (previasFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-inbox text-4xl text-slate-400 mb-4"></i>
                        <p class="text-slate-500">No se encontraron previas</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const previasAgrupadas = agruparPreviasPorMateria(previasFiltradas);
    const inicio = (paginaActual - 1) * previasPorPagina;
    const fin = inicio + previasPorPagina;
    const previasPagina = previasAgrupadas.slice(inicio, fin);
    
    tbody.innerHTML = previasPagina.map(grupo => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">${grupo.materia?.nombre || 'N/A'}</div>
                        <div class="text-sm text-slate-500">${grupo.materia?.codigo || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-600">${grupo.totalPrevias} previa${grupo.totalPrevias !== 1 ? 's' : ''}</span>
                    <button class="btn-icon btn-icon-primary btn-ver-previas" 
                            data-materia-id="${grupo.materia._id}"
                            data-previas='${JSON.stringify(grupo.previas)}'
                            title="Ver previas detalladas">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="space-y-1">
                    ${Array.from(grupo.tipos).map(tipo => `
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tipo === 'curso_aprobado' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-violet-100 text-violet-800'
                        }">
                            <i class="fas fa-${tipo === 'curso_aprobado' ? 'graduation-cap' : 'file-alt'} mr-1"></i>
                            ${tipo === 'curso_aprobado' ? 'Curso' : 'Examen'}
                        </span>
                    `).join('')}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    grupo.activa 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                }">
                    <i class="fas fa-${grupo.activa ? 'check-circle' : 'times-circle'} mr-1"></i>
                    ${grupo.activa ? 'Activa' : 'Inactiva'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-600">${grupo.materia.semestre || 'N/A'}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                    <button class="btn-icon btn-icon-primary btn-editar-previa" 
                            data-materia-id="${grupo.materia._id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${grupo.activa ? 'btn-icon-warning' : 'btn-icon-success'} btn-toggle-previa" 
                            data-materia-id="${grupo.materia._id}"
                            data-estado="${grupo.activa}"
                            title="${grupo.activa ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${grupo.activa ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger btn-eliminar-previa" 
                            data-materia-id="${grupo.materia._id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    actualizarPaginacion();
}

function agruparPreviasPorMateria(previas) {
    console.log('🔍 Previas recibidas para agrupar:', previas);
    const grupos = {};
    
    previas.forEach(previa => {
        const materiaId = previa.materia._id || previa.materia;
        const materiaNombre = previa.materia.nombre || 'N/A';
        const materiaCodigo = previa.materia.codigo || 'N/A';
        const materiaSemestre = previa.materia.semestre?.nombre || 'N/A';
        
        if (!grupos[materiaId]) {
            grupos[materiaId] = {
                materia: {
                    _id: materiaId,
                    nombre: materiaNombre,
                    codigo: materiaCodigo,
                    semestre: materiaSemestre
                },
                previas: [],
                totalPrevias: 0,
                tipos: new Set(),
                creditosMinimos: 0,
                activa: true,
                semestreMinimo: null
            };
        }
        
        grupos[materiaId].previas.push({
            materiaRequerida: previa.materiaRequerida,
            tipo: previa.tipo,
            notaMinima: previa.notaMinima,
            semestreMinimo: previa.semestreMinimo,
            creditosMinimos: previa.creditosMinimos,
            activa: previa.activa
        });
        
        grupos[materiaId].totalPrevias++;
        grupos[materiaId].tipos.add(previa.tipo);
        grupos[materiaId].creditosMinimos = Math.max(grupos[materiaId].creditosMinimos, previa.creditosMinimos);
        grupos[materiaId].activa = grupos[materiaId].activa && previa.activa;
        grupos[materiaId].semestreMinimo = Math.max(grupos[materiaId].semestreMinimo, previa.semestreMinimo);
    });
    
    return Object.values(grupos).sort((a, b) => a.materia.codigo.localeCompare(b.materia.codigo));
}

function abrirModalPrevia() {
    const modalTitle = document.getElementById('modal-title');
    const formPrevia = document.getElementById('form-previa');
    const modalPrevia = document.getElementById('modal-previa');
    const materiasContainer = document.getElementById('materias-container');
    
    if (modalTitle) modalTitle.textContent = 'Nueva Previa';
    if (formPrevia) {
        formPrevia.reset();
        delete formPrevia.dataset.previaId;
    }
    if (materiasContainer) {
        materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Primero selecciona una materia para ver las previas disponibles:</p>';
    }
    if (modalPrevia) modalPrevia.classList.remove('hidden');
}

function cerrarModalPrevia() {
    const modalPrevia = document.getElementById('modal-previa');
    const formPrevia = document.getElementById('form-previa');
    const materiasContainer = document.getElementById('materias-container');
    
    if (modalPrevia) modalPrevia.classList.add('hidden');
    if (formPrevia) {
        formPrevia.reset();
        delete formPrevia.dataset.previaId;
    }
    if (materiasContainer) {
        materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Primero selecciona una materia para ver las previas disponibles:</p>';
    }
}

function actualizarPaginacion() {
    const grupos = agruparPreviasPorMateria(previasFiltradas);
    const totalPaginas = Math.ceil(grupos.length / previasPorPagina);
    const paginacionContainer = document.getElementById('pagination-container');
    
    console.log('🔢 Actualizando paginación:', {
        grupos: grupos.length,
        totalPaginas,
        paginaActual,
        previasPorPagina
    });
    
    if (!paginacionContainer) {
        console.log('❌ No se encontró el contenedor de paginación');
        return;
    }
    
    // Actualizar información de paginación
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const inicio = (paginaActual - 1) * previasPorPagina + 1;
        const fin = Math.min(paginaActual * previasPorPagina, grupos.length);
        paginationInfo.textContent = `Mostrando ${inicio}-${fin} de ${grupos.length} previas`;
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
    const totalPaginas = Math.ceil(agruparPreviasPorMateria(previasFiltradas).length / previasPorPagina);
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
        mostrarPrevias();
    } else {
        console.log('❌ No se puede cambiar a la página:', nuevaPagina);
    }
}

function irAPagina(pagina) {
    const totalPaginas = Math.ceil(agruparPreviasPorMateria(previasFiltradas).length / previasPorPagina);
    
    console.log('🎯 Yendo a página:', { 
        pagina, 
        paginaActual, 
        totalPaginas 
    });
    
    if (pagina >= 1 && pagina <= totalPaginas) {
        paginaActual = pagina;
        console.log('✅ Página cambiada a:', paginaActual);
        mostrarPrevias();
    } else {
        console.log('❌ Página inválida:', pagina);
    }
}

function verPreviasDetalle(materiaId) {
    const previasData = document.querySelector(`[data-materia-id="${materiaId}"]`)?.getAttribute('data-previas');
    if (!previasData) return;
    
    const previas = JSON.parse(previasData);
    const modalDetalle = document.getElementById('modal-previas-detalle');
    const detalleContent = document.getElementById('detalle-previas-content');
    
    if (!modalDetalle || !detalleContent) return;
    
    detalleContent.innerHTML = previas.map(previa => `
        <div class="bg-white border border-slate-200 rounded-lg p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h4 class="text-sm font-medium text-slate-900 mb-2">
                        ${previa.materiaRequerida?.nombre || 'N/A'}
                    </h4>
                    <div class="space-y-1 text-xs text-slate-600">
                        <p><strong>Código:</strong> ${previa.materiaRequerida?.codigo || 'N/A'}</p>
                        <p><strong>Tipo:</strong> ${previa.tipo === 'curso_aprobado' ? 'Curso' : 'Examen'}</p>
                        <p><strong>Nota mínima:</strong> ${previa.notaMinima || 'N/A'}</p>
                        <p><strong>Semestre mínimo:</strong> ${previa.semestreMinimo || 'N/A'}</p>
                        <p><strong>Créditos mínimos:</strong> ${previa.creditosMinimos || 'N/A'}</p>
                    </div>
                </div>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    previa.activa 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                }">
                    <i class="fas fa-${previa.activa ? 'check-circle' : 'times-circle'} mr-1"></i>
                    ${previa.activa ? 'Activa' : 'Inactiva'}
                </span>
            </div>
        </div>
    `).join('');
    
    modalDetalle.classList.remove('hidden');
}

function cerrarModalPreviasDetalle() {
    const modalDetalle = document.getElementById('modal-previas-detalle');
    if (modalDetalle) modalDetalle.classList.add('hidden');
}

function editarPrevia(materiaId) {
    const previasData = document.querySelector(`[data-materia-id="${materiaId}"]`)?.getAttribute('data-previas');
    if (!previasData) return;
    
    const previas = JSON.parse(previasData);
    const modalTitle = document.getElementById('modal-title');
    const formPrevia = document.getElementById('form-previa');
    const modalPrevia = document.getElementById('modal-previa');
    
    if (modalTitle) modalTitle.textContent = 'Editar Previa';
    if (formPrevia) formPrevia.dataset.previaId = materiaId;
    if (modalPrevia) modalPrevia.classList.remove('hidden');
}

async function togglePrevia(materiaId, estadoActual) {
    try {
        const response = await fetch(`/admin/api/previas/toggle/${materiaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activa: !estadoActual })
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        mostrarNotificacion('Éxito', data.message, 'success');
        cargarPrevias();
        
    } catch (error) {
        console.error('Error al cambiar estado de la previa:', error);
        mostrarError('Error al cambiar estado de la previa: ' + error.message);
    }
}

async function eliminarPrevia(materiaId) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción eliminará todas las previas de esta materia y no se puede deshacer.',
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
            const response = await fetch(`/admin/api/previas/${materiaId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            const data = await response.json();
            mostrarNotificacion('Éxito', data.message, 'success');
            cargarPrevias();
            
        } catch (error) {
            console.error('Error al eliminar previa:', error);
            mostrarError('Error al eliminar previa: ' + error.message);
        }
    }
}

function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    const iconos = {
        success: 'fas fa-check-circle text-emerald-500',
        error: 'fas fa-exclamation-circle text-red-500',
        warning: 'fas fa-exclamation-triangle text-amber-500',
        info: 'fas fa-info-circle text-blue-500'
    };
    
    const colores = {
        success: 'bg-emerald-50 border-emerald-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-amber-50 border-amber-200',
        info: 'bg-blue-50 border-blue-200'
    };
    
    notification.innerHTML = `
        <div class="flex items-start space-x-3">
            <i class="${iconos[tipo]} text-xl"></i>
            <div class="flex-1">
                <h4 class="text-sm font-medium text-slate-900">${titulo}</h4>
                <p class="text-sm text-slate-600 mt-1">${mensaje}</p>
            </div>
            <button class="text-slate-400 hover:text-slate-600" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notification.classList.add(colores[tipo], 'border');
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function mostrarError(mensaje) {
    mostrarNotificacion('Error', mensaje, 'error');
}
