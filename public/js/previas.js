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
            console.log('🎯 Event listener capturando clic en .btn-ver-previas');
            const button = target.closest('.btn-ver-previas');
            const materiaId = button.getAttribute('data-materia-id');
            console.log('📋 Materia ID del botón:', materiaId);
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
    
    // Event listener para el formulario de previas
    const formPrevia = document.getElementById('form-previa');
    if (formPrevia) {
        console.log('✅ Registrando event listener para formulario de previas');
        formPrevia.addEventListener('submit', manejarSubmitPrevia);
    } else {
        console.error('❌ No se encontró el formulario de previas');
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

async function cargarPrevias() {
    console.log('🔄 Cargando previas...');
    
    // Mostrar indicador de carga
    const tbody = document.getElementById('previas-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                        <p class="text-slate-500">Cargando previas...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    try {
        const startTime = performance.now();
        
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
        const endTime = performance.now();
        
        console.log(`📦 Datos recibidos de la API en ${(endTime - startTime).toFixed(2)}ms:`, data);
        
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
    const startTime = performance.now();
    console.log('🔍 Agrupando previas:', previas.length);
    
    const grupos = {};
    
    for (const previa of previas) {
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
        
        const grupo = grupos[materiaId];
        grupo.previas.push({
            materiaRequerida: previa.materiaRequerida,
            tipo: previa.tipo,
            notaMinima: previa.notaMinima,
            semestreMinimo: previa.semestreMinimo,
            creditosMinimos: previa.creditosMinimos,
            activa: previa.activa
        });
        
        grupo.totalPrevias++;
        grupo.tipos.add(previa.tipo);
        grupo.creditosMinimos = Math.max(grupo.creditosMinimos, previa.creditosMinimos);
        grupo.activa = grupo.activa && previa.activa;
        
        if (previa.semestreMinimo && (!grupo.semestreMinimo || previa.semestreMinimo < grupo.semestreMinimo)) {
            grupo.semestreMinimo = previa.semestreMinimo;
        }
    }
    
    const endTime = performance.now();
    const resultado = Object.values(grupos).sort((a, b) => a.materia.codigo.localeCompare(b.materia.codigo));
    console.log(`✅ Agrupación completada en ${(endTime - startTime).toFixed(2)}ms: ${resultado.length} grupos`);
    
    return resultado;
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
    console.log('🚪 Cerrando modal de previas');
    const modalPrevia = document.getElementById('modal-previa');
    const formPrevia = document.getElementById('form-previa');
    const materiasContainer = document.getElementById('materias-container');
    
    if (modalPrevia) {
        modalPrevia.classList.add('hidden');
        console.log('✅ Modal ocultado');
    } else {
        console.error('❌ No se encontró el modal de previas');
    }
    
    if (formPrevia) {
        formPrevia.reset();
        delete formPrevia.dataset.previaId;
        console.log('✅ Formulario reseteado');
    }
    
    if (materiasContainer) {
        materiasContainer.innerHTML = '<p class="text-sm text-gray-500">Primero selecciona una materia para ver las previas disponibles:</p>';
        console.log('✅ Contenedor de materias limpiado');
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
    console.log('🔍 Intentando mostrar previas para materia:', materiaId);
    
    const button = document.querySelector(`[data-materia-id="${materiaId}"].btn-ver-previas`);
    if (!button) {
        console.log('❌ No se encontró el botón con data-materia-id:', materiaId);
        return;
    }
    
    const previasData = button.getAttribute('data-previas');
    if (!previasData) {
        console.log('❌ No se encontraron datos de previas en el botón');
        return;
    }
    
    console.log('📦 Datos de previas encontrados:', previasData);
    
    try {
        const previas = JSON.parse(previasData);
        const modalDetalle = document.getElementById('modal-previas-detalle');
        const detalleContent = document.getElementById('previas-detalle-content');
        
        if (!modalDetalle) {
            console.log('❌ No se encontró el modal con ID: modal-previas-detalle');
            return;
        }
        if (!detalleContent) {
            console.log('❌ No se encontró el contenido con ID: previas-detalle-content');
            return;
        }
        
        console.log('✅ Elementos del modal encontrados, mostrando previas:', previas);
    
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
        console.log('🎉 Modal mostrado correctamente');
        
    } catch (error) {
        console.error('❌ Error al mostrar previas detalle:', error);
        alert('Error al cargar las previas detalladas');
    }
}

function cerrarModalPreviasDetalle() {
    const modalDetalle = document.getElementById('modal-previas-detalle');
    if (modalDetalle) modalDetalle.classList.add('hidden');
}

async function editarPrevia(materiaId) {
    try {
        console.log('🔄 Editando previas para materia:', materiaId);
        
        // Obtener las previas de esta materia desde el servidor
        const response = await fetch(`/admin/api/previas/materia/${materiaId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const previas = await response.json();
        console.log('📦 Previas obtenidas para edición:', previas);
        
        const modalTitle = document.getElementById('modal-title');
        const formPrevia = document.getElementById('form-previa');
        const modalPrevia = document.getElementById('modal-previa');
        const selectMateria = document.getElementById('materia');
        const materiasContainer = document.getElementById('materias-container');
        
        if (modalTitle) modalTitle.textContent = 'Editar Previas';
        if (formPrevia) formPrevia.dataset.previaId = materiaId;
        if (modalPrevia) modalPrevia.classList.remove('hidden');
        
        // Seleccionar la materia en el select
        if (selectMateria) {
            selectMateria.value = materiaId;
            // Disparar el evento change para cargar las materias disponibles
            selectMateria.dispatchEvent(new Event('change'));
        }
        
        // Esperar un poco para que se carguen las materias disponibles
        setTimeout(() => {
            if (materiasContainer) {
                // Marcar las materias que ya están como previas
                previas.forEach(previa => {
                    const checkbox = document.querySelector(`input[data-materia-id="${previa.materiaRequerida._id}"]`);
                    const selectTipo = document.querySelector(`input[data-materia-id="${previa.materiaRequerida._id}"]`)?.parentElement?.parentElement?.querySelector('.tipo-requisito');
                    
                    if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                    
                    if (selectTipo) {
                        selectTipo.value = previa.tipo;
                    }
                });
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error obteniendo previas para edición:', error);
        mostrarError('Error cargando previas para edición: ' + error.message);
    }
}

async function togglePrevia(materiaId, estadoActual) {
    try {
        console.log('🔄 Cambiando estado de previas para materia:', materiaId, 'de', estadoActual, 'a', !estadoActual);
        
        const response = await fetch(`/admin/api/previas/toggle/${materiaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ activa: !estadoActual })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Respuesta del servidor:', data);
        
        // Mostrar notificación de éxito
        console.log('🔔 Mostrando notificación de éxito para toggle');
        mostrarNotificacion('Éxito', data.message || 'Estado de previas actualizado correctamente', 'success');
        
        // Recargar las previas
        console.log('🔄 Recargando previas...');
        await cargarPrevias();
        console.log('✅ Previas recargadas');
        
    } catch (error) {
        console.error('❌ Error al cambiar estado de la previa:', error);
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
            console.log('🗑️ Eliminando todas las previas de la materia:', materiaId);
            
            const response = await fetch(`/admin/api/previas/materia/${materiaId}`, {
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
            mostrarNotificacion('Éxito', data.message || 'Previas eliminadas correctamente', 'success');
            
            // Recargar las previas
            console.log('🔄 Recargando previas...');
            await cargarPrevias();
            console.log('✅ Previas recargadas');
            
        } catch (error) {
            console.error('❌ Error al eliminar previa:', error);
            mostrarError('Error al eliminar previa: ' + error.message);
        }
    } else {
        console.log('❌ Eliminación cancelada por el usuario');
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

async function manejarSubmitPrevia(e) {
    console.log('🚀 Formulario de previas enviado');
    e.preventDefault();
    
    const formPrevia = document.getElementById('form-previa');
    const materiaId = formPrevia.dataset.previaId;
    const materia = document.getElementById('materia').value;
    const activa = document.getElementById('activa').checked;
    
    console.log('📝 Datos del formulario:', { materiaId, materia, activa });
    
    // Obtener las materias seleccionadas
    const checkboxes = document.querySelectorAll('.materia-checkbox:checked');
    console.log('📋 Checkboxes seleccionados:', checkboxes.length);
    
    const materiasRequeridas = Array.from(checkboxes).map(checkbox => {
        const selectTipo = checkbox.parentElement.parentElement.querySelector('.tipo-requisito');
        const materia = {
            materiaId: checkbox.dataset.materiaId,
            tipo: selectTipo.value
        };
        console.log('📚 Materia requerida:', materia);
        return materia;
    });
    
    console.log('📦 Materias requeridas totales:', materiasRequeridas);
    
    if (materiasRequeridas.length === 0) {
        console.log('❌ No hay materias seleccionadas');
        mostrarError('Debe seleccionar al menos una materia requerida');
        return;
    }
    
    try {
        let response;
        
        if (materiaId) {
            // Editar previas existentes
            console.log('🔄 Actualizando previas para materia:', materiaId);
            response = await fetch(`/admin/api/previas/materia/${materiaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    materiasRequeridas,
                    activa
                })
            });
        } else {
            // Crear nuevas previas
            console.log('🔄 Creando nuevas previas para materia:', materia);
            response = await fetch('/admin/api/previas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    materia,
                    materiasRequeridas,
                    activa
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
        const mensajeExito = materiaId ? 'Previas actualizadas correctamente' : 'Previas creadas correctamente';
        console.log('🔔 Mostrando notificación de éxito:', mensajeExito);
        mostrarNotificacion('Éxito', mensajeExito, 'success');
        
        cerrarModalPrevia();
        
        // Recargar las previas
        console.log('🔄 Recargando previas...');
        await cargarPrevias();
        console.log('✅ Previas recargadas');
        
    } catch (error) {
        console.error('❌ Error procesando previas:', error);
        mostrarError('Error procesando previas: ' + error.message);
    }
}
