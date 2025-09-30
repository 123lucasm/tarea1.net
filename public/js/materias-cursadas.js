let materias = [];
let materiasCursadas = new Set();
let materiasElegibles = [];
let materiasNoElegibles = [];
let semestresAbiertos = new Set();
let estadosMaterias = new Map(); // Para almacenar el estado de cada materia
let materiasElegibilidad = new Map(); // Para almacenar la elegibilidad de cada materia
let debounceTimer = null; // Para evitar múltiples actualizaciones rápidas

// Función para verificar previas de una materia
async function verificarPreviasMateria(materiaId) {
    try {
        const response = await fetch('/materias-cursadas/elegibilidad/verificar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiaId: materiaId,
                materiasCursadas: Array.from(materiasCursadas)
            })
        });

        if (!response.ok) {
            throw new Error('Error al verificar previas');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error verificando previas:', error);
        return { elegible: false, causa: 'Error al verificar previas' };
    }
}

// Función para pre-cargar la elegibilidad de todas las materias
async function precargarElegibilidadMaterias() {
    console.log('🔄 Pre-cargando elegibilidad de materias...');
    
    // Mostrar indicador de carga inicial
    mostrarIndicadorCarga('Cargando materias y verificando elegibilidad...');
    
    try {
        const response = await fetch('/materias-cursadas/elegibilidad/materias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiasCursadas: Array.from(materiasCursadas)
            })
        });

        if (!response.ok) {
            throw new Error('Error al pre-cargar elegibilidad');
        }

        const data = await response.json();
        
        // Almacenar elegibilidad de materias elegibles
        if (data.materiasElegibles) {
            data.materiasElegibles.forEach(materia => {
                materiasElegibilidad.set(materia._id, {
                    elegible: true,
                    materia: materia
                });
            });
        }
        
        // Almacenar elegibilidad de materias no elegibles
        if (data.materiasNoElegibles) {
            data.materiasNoElegibles.forEach(materia => {
                materiasElegibilidad.set(materia._id, {
                    elegible: false,
                    materia: materia,
                    elegibilidad: materia.elegibilidad
                });
            });
        }
        
        console.log('✅ Elegibilidad pre-cargada para', materiasElegibilidad.size, 'materias');
        
        // Re-renderizar para mostrar el estado visual
        renderizarMateriasCursadas();
        
    } catch (error) {
        console.error('Error pre-cargando elegibilidad:', error);
        // Mostrar error en la interfaz
        const container = document.getElementById('semestresContainer');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                        </div>
                        <p class="text-red-600 font-medium">Error al cargar elegibilidad</p>
                        <p class="text-gray-500 text-sm">Intenta recargar la página</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Recargar Página
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Función para mostrar indicador de carga
function mostrarIndicadorCarga(mensaje = 'Verificando elegibilidad...') {
    const container = document.getElementById('semestresContainer');
    if (container) {
        container.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-spinner fa-spin text-blue-600 text-2xl"></i>
                    </div>
                    <p class="text-gray-600 font-medium">${mensaje}</p>
                </div>
            </div>
        `;
    }
}

// Función de debounce para optimizar actualizaciones
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

// Función optimizada para actualizar elegibilidad con debounce
const actualizarElegibilidadDebounced = debounce(async function() {
    await actualizarElegibilidadMaterias();
    renderizarMateriasCursadas();
    actualizarEstadisticas();
}, 500); // 500ms de delay

// Función para actualizar la elegibilidad de todas las materias
async function actualizarElegibilidadMaterias() {
    console.log('🔄 Actualizando elegibilidad de materias...');
    
    // Mostrar indicador de carga
    mostrarIndicadorCarga('Verificando elegibilidad de materias...');
    
    try {
        const response = await fetch('/materias-cursadas/elegibilidad/materias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiasCursadas: Array.from(materiasCursadas)
            })
        });

        if (!response.ok) {
            throw new Error('Error al actualizar elegibilidad');
        }

        const data = await response.json();
        
        // Limpiar caché anterior
        materiasElegibilidad.clear();
        
        // Almacenar elegibilidad de materias elegibles
        if (data.materiasElegibles) {
            data.materiasElegibles.forEach(materia => {
                materiasElegibilidad.set(materia._id, {
                    elegible: true,
                    materia: materia
                });
            });
        }
        
        // Almacenar elegibilidad de materias no elegibles
        if (data.materiasNoElegibles) {
            data.materiasNoElegibles.forEach(materia => {
                materiasElegibilidad.set(materia._id, {
                    elegible: false,
                    materia: materia,
                    elegibilidad: materia.elegibilidad
                });
            });
        }
        
        console.log('✅ Elegibilidad actualizada para', materiasElegibilidad.size, 'materias');
        
    } catch (error) {
        console.error('Error actualizando elegibilidad:', error);
        // Mostrar error en la interfaz
        const container = document.getElementById('semestresContainer');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                        </div>
                        <p class="text-red-600 font-medium">Error al verificar elegibilidad</p>
                        <p class="text-gray-500 text-sm">Intenta recargar la página</p>
                    </div>
                </div>
            `;
        }
    }
}

// Función para mostrar mensaje de error de previas
async function mostrarErrorPrevias(elegibilidad) {
    if (typeof Swal !== 'undefined') {
        let htmlContent = '';
        
        if (elegibilidad.requisitosFaltantes && elegibilidad.requisitosFaltantes.length > 0) {
            htmlContent = `
                <div class="text-left">
                    <p class="mb-4 text-gray-700">No puedes seleccionar esta materia porque faltan las siguientes previas:</p>
                    <div class="space-y-2">
                        ${elegibilidad.requisitosFaltantes.map(req => `
                            <div class="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-exclamation-triangle text-red-600 text-sm"></i>
                                </div>
                                <div>
                                    <div class="font-medium text-red-900">${req.materia}</div>
                                    <div class="text-sm text-red-700">${req.codigo} - ${req.tipoDescripcion}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            htmlContent = `
                <div class="text-center">
                    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-times text-red-600 text-2xl"></i>
                    </div>
                    <p class="text-gray-700">${elegibilidad.causa || 'No cumple con los requisitos previos'}</p>
                </div>
            `;
        }
        
        await Swal.fire({
            title: 'No puedes seleccionar esta materia',
            html: htmlContent,
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ef4444',
            customClass: {
                popup: 'swal2-popup-modern',
                title: 'swal2-title-modern',
                content: 'swal2-content-modern'
            }
        });
    } else {
        // Fallback a alert nativo
        let mensaje = `No puedes seleccionar esta materia porque:\n\n`;
        
        if (elegibilidad.requisitosFaltantes && elegibilidad.requisitosFaltantes.length > 0) {
            mensaje += `Faltan las siguientes previas:\n`;
            elegibilidad.requisitosFaltantes.forEach(req => {
                mensaje += `• ${req.materia} (${req.codigo}) - ${req.tipoDescripcion}\n`;
            });
        } else {
            mensaje += elegibilidad.causa || 'No cumple con los requisitos previos';
        }
        
        alert(mensaje);
    }
}

// Función para toggle de materia cursada (optimizada)
async function toggleMateriaCursada(materiaId) {
    console.log('Toggle materia:', materiaId);
    console.log('Estado actual:', materiasCursadas.has(materiaId));
    
    if (materiasCursadas.has(materiaId)) {
        // Si ya está cursada, simplemente la removemos
        materiasCursadas.delete(materiaId);
        console.log('Materia removida de cursadas');
        
        // Actualizar elegibilidad después de remover (con debounce)
        actualizarElegibilidadDebounced();
    } else {
        // Verificar si la materia es elegible usando el caché
        const elegibilidadCache = materiasElegibilidad.get(materiaId);
        
        if (elegibilidadCache && !elegibilidadCache.elegible) {
            // Mostrar mensaje de error usando la información en caché (instantáneo)
            await mostrarErrorPrevias(elegibilidadCache.elegibilidad);
            return; // No agregar la materia
        }
        
        // Si no está en caché, mostrar mensaje de que se está verificando
        if (!elegibilidadCache) {
            console.log('Verificando previas para materia:', materiaId);
            
            // Mostrar indicador de carga para esta materia específica
            const materiaElement = document.querySelector(`[data-materia-id="${materiaId}"]`);
            if (materiaElement) {
                const originalContent = materiaElement.innerHTML;
                materiaElement.innerHTML = `
                    <div class="flex items-center space-x-4 p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
                        <div class="w-6 h-6 rounded-lg border-2 border-blue-300 flex items-center justify-center">
                            <i class="fas fa-spinner fa-spin text-blue-600 text-sm"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                                <span class="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">Verificando...</span>
                            </div>
                            <h4 class="font-medium text-gray-900 mb-1">Verificando elegibilidad...</h4>
                        </div>
                    </div>
                `;
                
                // Restaurar contenido original después de un tiempo
                setTimeout(() => {
                    materiaElement.innerHTML = originalContent;
                }, 2000);
            }
            
            const elegibilidad = await verificarPreviasMateria(materiaId);
            
            if (!elegibilidad.elegible) {
                await mostrarErrorPrevias(elegibilidad);
                return; // No agregar la materia
            }
        }
        
        // Si es elegible, agregarla
        materiasCursadas.add(materiaId);
        console.log('Materia agregada a cursadas');
        
        // Actualizar elegibilidad después de agregar (con debounce)
        actualizarElegibilidadDebounced();
    }
}

// Función para cambiar el tipo de aprobación de una materia
function cambiarTipoAprobacion(materiaId, tipo) {
    console.log('Cambiando tipo de aprobacion:', materiaId, tipo);
    
    const nuevoEstado = tipo === 'curso' ? 'aprobado' : 'cursado';
    const notaCurso = tipo === 'curso' ? 4 : undefined;
    const notaExamen = tipo === 'examen' ? 3 : undefined;
    
    // Actualizar el estado en el Map de estados
    if (estadosMaterias.has(materiaId)) {
        const estado = estadosMaterias.get(materiaId);
        estado.estado = nuevoEstado;
        estado.notaCurso = notaCurso;
        estado.notaExamen = notaExamen;
        estadosMaterias.set(materiaId, estado);
    } else {
        // Crear nuevo estado si no existe
        estadosMaterias.set(materiaId, {
            materia: materiaId,
            estado: nuevoEstado,
            notaCurso: notaCurso,
            notaExamen: notaExamen,
            notaFinal: 4,
            semestre: 1,
            anio: new Date().getFullYear(),
            fechaAprobacion: new Date(),
            creditosObtenidos: 0
        });
    }
    
    console.log('Tipo de aprobacion actualizado en memoria:', tipo);
    
    // Re-renderizar para mostrar el cambio
    renderizarMateriasCursadas();
    
    // NO guardar automáticamente - solo actualizar la UI
    console.log('Tipo de aprobacion actualizado en memoria:', tipo);
}

// Cargar materias al inicializar la página
document.addEventListener('DOMContentLoaded', async function() {
    await cargarMaterias();
    await cargarMateriasCursadas();
    await cargarEstadosMaterias();
    await precargarElegibilidadMaterias();
    asignarEventosBotones();
});

// Función para asignar eventos a los botones
function asignarEventosBotones() {
    // Botón calcular elegibilidad
    const btnCalcular = document.getElementById('btnCalcularElegibilidad');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', calcularElegibilidad);
    }

    // Botón limpiar selección
    const btnLimpiar = document.getElementById('btnLimpiarSeleccion');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarSeleccion);
    }

    // Botón guardar cambios
    const btnGuardar = document.getElementById('btnGuardarCambios');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarMateriasCursadas);
    }

    // Asignar eventos a los inputs de nota
    asignarEventosNotas();

    // Botón probar checkbox
    const btnTest = document.getElementById('btnTestCheckbox');
    if (btnTest) {
        btnTest.addEventListener('click', testCheckbox);
    }

    console.log('Eventos de botones asignados');
}

// Función para asignar eventos a los inputs de nota
function asignarEventosNotas() {
    // Asignar eventos a todos los inputs de nota existentes
    const notaInputs = document.querySelectorAll('input[id^="nota-"]');
    notaInputs.forEach(input => {
        input.addEventListener('input', manejarCambioNota);
        input.addEventListener('blur', validarNota);
        input.addEventListener('click', prevenirPropagacion);
        input.addEventListener('mousedown', prevenirPropagacion);
    });
    
    console.log(`Eventos de notas asignados a ${notaInputs.length} inputs`);
}

// Función para prevenir la propagación del evento de clic
function prevenirPropagacion(event) {
    event.stopPropagation();
}

// Función para manejar cambios en las notas
function manejarCambioNota(event) {
    const input = event.target;
    const materiaId = input.id.replace('nota-', '');
    const nota = parseFloat(input.value);
    
    console.log(`Cambio de nota para materia ${materiaId}: ${nota}`);
    
    // Solo actualizar si la nota es válida
    if (isNaN(nota) || nota < 1 || nota > 5) {
        console.log('Nota inválida, no actualizando estado');
        return;
    }
    
    // Actualizar el estado de la materia
    if (estadosMaterias.has(materiaId)) {
        const estado = estadosMaterias.get(materiaId);
        estado.notaFinal = nota;
        estadosMaterias.set(materiaId, estado);
    } else {
        // Crear nuevo estado si no existe
        estadosMaterias.set(materiaId, {
            materia: materiaId,
            estado: 'aprobado',
            notaFinal: nota,
            semestre: 1,
            anio: new Date().getFullYear(),
            fechaAprobacion: new Date(),
            creditosObtenidos: 0
        });
    }
    
    console.log('Estado actualizado:', estadosMaterias.get(materiaId));
}

// Función para validar la nota
function validarNota(event) {
    const input = event.target;
    const nota = parseFloat(input.value);
    
    if (isNaN(nota) || nota < 1 || nota > 5) {
        input.classList.add('border-red-500', 'bg-red-50');
        input.classList.remove('border-gray-300');
        
        // Mostrar mensaje de error temporal
        const errorMsg = document.createElement('div');
        errorMsg.className = 'text-red-500 text-xs mt-1';
        errorMsg.textContent = 'La nota debe estar entre 1.0 y 5.0';
        errorMsg.id = `error-${input.id}`;
        
        // Remover mensaje anterior si existe
        const existingError = document.getElementById(`error-${input.id}`);
        if (existingError) {
            existingError.remove();
        }
        
        input.parentNode.appendChild(errorMsg);
        
        // Remover mensaje después de 3 segundos
        setTimeout(() => {
            if (errorMsg.parentNode) {
                errorMsg.remove();
            }
        }, 3000);
    } else {
        input.classList.remove('border-red-500', 'bg-red-50');
        input.classList.add('border-gray-300');
        
        // Remover mensaje de error si existe
        const existingError = document.getElementById(`error-${input.id}`);
        if (existingError) {
            existingError.remove();
        }
    }
}

// Función para cargar materias cursadas guardadas
async function cargarMateriasCursadas() {
    try {
        console.log('Cargando materias cursadas guardadas...');
        const response = await fetch('/materias-cursadas/api/materias-cursadas');
        
        if (!response.ok) {
            console.log('⚠️ No hay materias cursadas guardadas o error al cargarlas');
            return;
        }
        
        const materiasCursadasIds = await response.json();
        console.log('📚 Materias cursadas cargadas:', materiasCursadasIds);
        
        // Actualizar el Set de materias cursadas
        materiasCursadas.clear();
        materiasCursadasIds.forEach(id => materiasCursadas.add(id));
        
        console.log(`✅ ${materiasCursadas.size} materias cursadas cargadas desde la BD`);
        
        // Re-renderizar la interfaz para mostrar las materias seleccionadas
        if (materias.length > 0) {
            renderizarMateriasCursadas();
            actualizarEstadisticas();
        }
        
    } catch (error) {
        console.error('❌ Error cargando materias cursadas:', error);
    }
}

// Función para cargar estados detallados de las materias
async function cargarEstadosMaterias() {
    try {
        console.log('🔄 Cargando estados detallados de materias...');
        const response = await fetch('/materias-cursadas/api/estados-materias');
        
        if (!response.ok) {
            console.log('⚠️ No hay estados de materias guardados');
            return;
        }
        
        const estados = await response.json();
        console.log('📊 Estados de materias cargados:', estados);
        
        // Actualizar el Map de estados
        estadosMaterias.clear();
        estados.forEach(estado => {
            estadosMaterias.set(estado.materia, estado);
        });
        
        console.log(`✅ ${estadosMaterias.size} estados de materias cargados`);
        
        // Re-renderizar la interfaz para mostrar los estados
        if (materias.length > 0) {
            renderizarMateriasCursadas();
            actualizarEstadisticas();
        }
        
    } catch (error) {
        console.error('❌ Error cargando estados de materias:', error);
    }
}

// Función para cargar todas las materias
async function cargarMaterias() {
    try {
        console.log('🔄 Cargando materias...');
        const response = await fetch('/materias-cursadas/api/materias');
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error del servidor:', errorData);
            throw new Error(`Error ${response.status}: ${errorData.error || 'Error desconocido'}`);
        }
        
        const data = await response.json();
        console.log('📚 Datos recibidos:', data);
        
        materias = data.materias || data;
        console.log(`✅ Materias cargadas: ${materias.length}`);
        
        renderizarMateriasCursadas();
        actualizarEstadisticas();
    } catch (error) {
        console.error('❌ Error cargando materias:', error);
        document.getElementById('materiasCursadasContainer').innerHTML = 
            `<div class="alert alert-danger col-span-full">
                <h5>Error al cargar las materias</h5>
                <p><strong>Detalles:</strong> ${error.message}</p>
                <p>Por favor, intenta recargar la página o contacta al administrador.</p>
                <button class="btn btn-outline-danger btn-sm" onclick="cargarMaterias()">
                    <i class="fas fa-refresh me-1"></i>
                    Reintentar
                </button>
            </div>`;
    }
}

// Función para renderizar las materias organizadas por semestres
function renderizarMateriasCursadas() {
    const container = document.getElementById('semestresContainer');
    // Guardar estado de semestres abiertos antes del re-render
    const abiertosAntes = new Set(semestresAbiertos);
    
    if (materias.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">No hay materias disponibles.</div>';
        return;
    }

    console.log('Renderizando materias por semestres...', materias.length);

    // Agrupar materias por semestre
    const materiasPorSemestre = {};
    materias.forEach(materia => {
        const semestreNum = materia.semestre?.numero || 'Sin semestre';
        if (!materiasPorSemestre[semestreNum]) {
            materiasPorSemestre[semestreNum] = {
                semestre: materia.semestre,
                materias: []
            };
        }
        materiasPorSemestre[semestreNum].materias.push(materia);
    });

    // Crear HTML de semestres
    const semestresHTML = Object.keys(materiasPorSemestre)
        .sort((a, b) => {
            if (a === 'Sin semestre') return 1;
            if (b === 'Sin semestre') return -1;
            return parseInt(a) - parseInt(b);
        })
        .map(semestreNum => {
            const semestreData = materiasPorSemestre[semestreNum];
            const semestreId = `semestre-${semestreNum}`;
            const materiasCursadasEnSemestre = semestreData.materias.filter(m => materiasCursadas.has(m._id)).length;
            
            return `
                <div class="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
                    <div class="semestre-header bg-gradient-to-r from-blue-50 to-indigo-50 p-6 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-300" 
                         data-semestre-id="${semestreId}">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <span class="text-white font-bold text-lg">${semestreNum}</span>
                                </div>
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-900">${semestreData.semestre?.nombre || 'Sin semestre definido'}</h3>
                                    <p class="text-sm text-gray-600">
                                        ${materiasCursadasEnSemestre} de ${semestreData.materias.length} materias cursadas
                                    </p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-down text-gray-400 transition-transform duration-300 semestre-toggle"></i>
                        </div>
                    </div>
                    <div class="semestre-content hidden" id="${semestreId}">
                        <div class="p-6 space-y-3">
                            ${semestreData.materias.map(materia => {
                                const estado = estadosMaterias.get(materia._id);
                                const estadoTexto = estado ? getEstadoTexto(estado.estado) : 'No cursada';
                                const estadoColor = estado ? getEstadoColor(estado.estado) : '#6b7280';
                                const isChecked = materiasCursadas.has(materia._id);
                                
                                // Verificar elegibilidad
                                const elegibilidad = materiasElegibilidad.get(materia._id);
                                const esElegible = elegibilidad ? elegibilidad.elegible : true; // Por defecto elegible si no se ha verificado
                                const tienePreviasFaltantes = elegibilidad && !elegibilidad.elegible && elegibilidad.elegibilidad && elegibilidad.elegibilidad.requisitosFaltantes;
                                
                                // Clases CSS basadas en elegibilidad
                                let containerClasses = 'checkbox-container flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-300';
                                let cursorClass = 'cursor-pointer hover:shadow-md';
                                
                                if (isChecked) {
                                    containerClasses += ' border-green-300 bg-green-50';
                                } else if (!esElegible) {
                                    containerClasses += ' border-red-200 bg-red-50 opacity-60';
                                    cursorClass = 'cursor-not-allowed';
                                } else {
                                    containerClasses += ' border-gray-200 hover:border-blue-300';
                                }
                                
                                return `
                                <div class="${containerClasses} ${cursorClass}" 
                                     data-materia-id="${materia._id}"
                                     ${!esElegible ? 'title="No puedes seleccionar esta materia - faltan previas"' : ''}>
                                    <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'}">
                                        ${isChecked ? '<i class="fas fa-check text-white text-sm"></i>' : ''}
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2 mb-1">
                                            <span class="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">${materia.codigo}</span>
                                            <span class="text-sm text-gray-500">${materia.creditos} créditos</span>
                                        </div>
                                        <h4 class="font-medium text-gray-900 mb-1">${materia.nombre}</h4>
                                        <div class="flex items-center space-x-2 text-xs">
                                            <div class="w-2 h-2 rounded-full" style="background-color: ${estadoColor}"></div>
                                            <span style="color: ${estadoColor}">${estadoTexto}</span>
                                            ${!esElegible && tienePreviasFaltantes ? `
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <i class="fas fa-exclamation-triangle mr-1"></i>
                                                    Faltan ${tienePreviasFaltantes.length} previa${tienePreviasFaltantes.length > 1 ? 's' : ''}
                                                </span>
                                            ` : ''}
                                        </div>
                                        ${isChecked ? `
                                            <div class="mt-3 space-y-3">
                                                <div class="flex space-x-4">
                                                    <label class="flex items-center space-x-2 text-sm text-gray-600">
                                                        <input type="radio" name="tipo-${materia._id}" value="curso" class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500" 
                                                               ${estado && estado.estado === 'aprobado' ? 'checked' : ''}>
                                                        <span>Curso Aprobado</span>
                                                    </label>
                                                    <label class="flex items-center space-x-2 text-sm text-gray-600">
                                                        <input type="radio" name="tipo-${materia._id}" value="examen" class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                               ${estado && estado.estado === 'cursado' ? 'checked' : ''}>
                                                        <span>Examen</span>
                                                    </label>
                                                </div>
                                                <div class="flex items-center space-x-3">
                                                    <label class="text-sm font-medium text-gray-700">Nota:</label>
                                                    <input type="number" 
                                                           id="nota-${materia._id}" 
                                                           class="w-20 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                                           min="1" 
                                                           max="5" 
                                                           step="0.1" 
                                                           value="${estado && estado.notaFinal ? estado.notaFinal : ''}" 
                                                           placeholder="0.0">
                                                    <span class="text-xs text-gray-500">(1.0 - 5.0)</span>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = semestresHTML;
    
    // Asignar eventos después de renderizar
    asignarEventosSemestres();
    asignarEventosCheckboxes();
    asignarEventosTipoAprobacion();
    asignarEventosNotas();

    // Restaurar estado abierto de semestres
    abiertosAntes.forEach(id => {
        const content = document.getElementById(id);
        const toggle = content?.previousElementSibling?.querySelector('.semestre-toggle');
        if (content && content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            toggle && toggle.classList.add('rotate-180');
        }
        semestresAbiertos.add(id);
    });
}

// Función para asignar eventos a los semestres
function asignarEventosSemestres() {
    const semestreHeaders = document.querySelectorAll('.semestre-header');
    console.log('🔗 Asignando eventos a', semestreHeaders.length, 'semestres');
    
    semestreHeaders.forEach(header => {
        const semestreId = header.getAttribute('data-semestre-id');
        console.log('📌 Asignando evento a semestre:', semestreId);
        
        // Remover eventos anteriores para evitar duplicados
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Asignar nuevo event listener
        newHeader.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en semestre:', semestreId);
            toggleSemestre(semestreId);
        });
    });
}

// Función para toggle de semestre
function toggleSemestre(semestreId) {
    const content = document.getElementById(semestreId);
    const header = document.querySelector(`[data-semestre-id="${semestreId}"]`);
    const toggle = header?.querySelector('.semestre-toggle');
    
    if (!content || !header) {
        console.log('❌ No se encontró contenido o header para:', semestreId);
        return;
    }

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        toggle && toggle.classList.add('rotate-180');
        semestresAbiertos.add(semestreId);
        console.log('📥 Abriendo semestre:', semestreId);
    } else {
        content.classList.add('hidden');
        toggle && toggle.classList.remove('rotate-180');
        semestresAbiertos.delete(semestreId);
        console.log('📤 Cerrando semestre:', semestreId);
    }
}

// Función para asignar eventos a los checkboxes
function asignarEventosCheckboxes() {
    const checkboxes = document.querySelectorAll('.checkbox-container');
    console.log('🔗 Asignando eventos a', checkboxes.length, 'checkboxes');
    
    checkboxes.forEach(checkbox => {
        const materiaId = checkbox.getAttribute('data-materia-id');
        console.log('📌 Asignando evento a materia:', materiaId);
        
        // Remover eventos anteriores para evitar duplicados
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        
        // Asignar nuevo event listener
        newCheckbox.addEventListener('click', function(e) {
            // No procesar clicks en los radio buttons
            if (e.target.type === 'radio' || e.target.closest('.materia-tipo-aprobacion')) {
                return;
            }
            
            // Verificar si la materia es elegible antes de procesar el click
            const elegibilidad = materiasElegibilidad.get(materiaId);
            if (elegibilidad && !elegibilidad.elegible) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 Click bloqueado en materia no elegible:', materiaId);
                return;
            }
            
            e.preventDefault();
            e.stopPropagation(); // Evitar que se propague al semestre
            console.log('🖱️ Click en checkbox:', materiaId);
            toggleMateriaCursada(materiaId);
        });
    });
}

// Función para asignar eventos a los radio buttons de tipo de aprobación
function asignarEventosTipoAprobacion() {
    const radioButtons = document.querySelectorAll('input[name^="tipo-"]');
    console.log('🔗 Asignando eventos a', radioButtons.length, 'radio buttons');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function(e) {
            const materiaId = e.target.name.replace('tipo-', '');
            const tipo = e.target.value;
            console.log('🔄 Radio button cambiado:', materiaId, tipo);
            cambiarTipoAprobacion(materiaId, tipo);
        });
        radio.addEventListener('click', prevenirPropagacion);
        radio.addEventListener('mousedown', prevenirPropagacion);
    });
}

// Función para guardar materias cursadas
async function guardarMateriasCursadas() {
    try {
        console.log('💾 Guardando materias cursadas...', Array.from(materiasCursadas));

        // Preparar datos con tipos de aprobación - filtrar solo materias con notas válidas
        const materiasConTipos = Array.from(materiasCursadas)
            .map(materiaId => {
                const estado = estadosMaterias.get(materiaId);
                
                // Obtener la nota del input del DOM
                const notaInput = document.getElementById(`nota-${materiaId}`);
                const notaDelInput = notaInput ? parseFloat(notaInput.value) : null;
                
                // Determinar el tipo correcto basado en el estado
                let tipo;
                if (estado) {
                    if (estado.estado === 'aprobado') {
                        tipo = 'aprobado'; // Curso aprobado
                    } else if (estado.estado === 'cursado') {
                        tipo = 'cursado'; // A examen
                    } else {
                        tipo = 'aprobado'; // Por defecto
                    }
                } else {
                    tipo = 'aprobado'; // Por defecto
                }
                
                // Usar la nota del input si está disponible y es válida, sino usar la del estado
                let notaFinal;
                if (notaDelInput && !isNaN(notaDelInput) && notaDelInput >= 1 && notaDelInput <= 5) {
                    notaFinal = notaDelInput;
                } else if (estado && estado.notaFinal && !isNaN(estado.notaFinal)) {
                    notaFinal = estado.notaFinal;
                } else {
                    // No establecer nota por defecto - retornar null para filtrar después
                    console.log(`⚠️ Materia ${materiaId} no tiene nota válida, será filtrada...`);
                    return null;
                }
                
                console.log(`Materia ${materiaId}: estado=${estado?.estado}, tipo=${tipo}, notaInput=${notaDelInput}, notaFinal=${notaFinal}`);
                
                return {
                    materiaId: materiaId,
                    tipo: tipo,
                    notaCurso: estado ? estado.notaCurso : (tipo === 'aprobado' ? 4 : undefined),
                    notaExamen: estado ? estado.notaExamen : (tipo === 'cursado' ? 3 : undefined),
                    notaFinal: notaFinal
                };
            })
            .filter(item => item !== null); // Filtrar materias sin nota válida

        console.log('Materias con tipos a guardar:', materiasConTipos);
        console.log('Estados en memoria:', Array.from(estadosMaterias.entries()));

        // Verificar si hay materias válidas para guardar
        if (materiasConTipos.length === 0) {
            mostrarMensaje('No hay materias con notas válidas para guardar. Por favor, ingresa notas entre 1.0 y 5.0 para las materias cursadas.', 'warning');
            return;
        }

        // Solo enviar materias que tienen notas válidas
        const materiasCursadasValidas = materiasConTipos.map(item => item.materiaId);
        
        const response = await fetch('/materias-cursadas/api/materias-cursadas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiasCursadas: materiasCursadasValidas,
                materiasConTipos: materiasConTipos
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar materias cursadas');
        }

        const data = await response.json();
        console.log('✅ Materias cursadas guardadas:', data);
        
        // Mostrar mensaje de éxito
        mostrarMensaje('Materias cursadas guardadas exitosamente', 'success');

    } catch (error) {
        console.error('❌ Error guardando materias cursadas:', error);
        mostrarMensaje('Error al guardar materias cursadas: ' + error.message, 'error');
    }
}

// Función para mostrar mensajes
function mostrarMensaje(mensaje, tipo) {
    // Crear elemento de mensaje
    const mensajeDiv = document.createElement('div');
    const isSuccess = tipo === 'success';
    
    mensajeDiv.className = `fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ease-in-out translate-x-0`;
    mensajeDiv.style.animation = 'slideInRight 0.3s ease-out';
    
    mensajeDiv.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div class="p-4 flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 ${isSuccess ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center">
                        <i class="fas fa-${isSuccess ? 'check-circle' : 'exclamation-triangle'} ${isSuccess ? 'text-green-600' : 'text-red-600'} text-lg"></i>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold ${isSuccess ? 'text-green-800' : 'text-red-800'}">
                        ${isSuccess ? '¡Éxito!' : 'Error'}
                    </p>
                    <p class="text-sm ${isSuccess ? 'text-green-700' : 'text-red-700'} mt-1">
                        ${mensaje}
                    </p>
                </div>
                <button onclick="this.closest('.fixed').remove()" class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="h-1 bg-gray-200">
                <div class="h-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'} animate-progress"></div>
            </div>
        </div>
    `;
    
    // Agregar estilos CSS para las animaciones
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            .animate-progress {
                animation: progress 5s linear forwards;
            }
            @keyframes progress {
                from {
                    width: 100%;
                }
                to {
                    width: 0%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(mensajeDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (mensajeDiv.parentNode) {
            mensajeDiv.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (mensajeDiv.parentNode) {
                    mensajeDiv.parentNode.removeChild(mensajeDiv);
                }
            }, 300);
        }
    }, 5000);
}

// Función para calcular elegibilidad
async function calcularElegibilidad() {
    if (materiasCursadas.size === 0) {
        alert('Por favor selecciona al menos una materia que hayas cursado.');
        return;
    }

    try {
        console.log('🔄 Calculando elegibilidad para materias:', Array.from(materiasCursadas));

        // Mostrar loading
        document.getElementById('materiasElegiblesContainer').style.display = 'none';
        document.getElementById('materiasNoElegiblesContainer').style.display = 'none';

        // Enviar las materias cursadas seleccionadas al servidor
        const response = await fetch('/materias-cursadas/elegibilidad/materias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiasCursadas: Array.from(materiasCursadas)
            })
        });

        if (!response.ok) {
            throw new Error('Error al calcular elegibilidad');
        }

        const data = await response.json();
        console.log('📊 Resultado elegibilidad:', data);
        
        materiasElegibles = data.materiasElegibles || [];
        materiasNoElegibles = data.materiasNoElegibles || [];

        renderizarResultados();
        actualizarEstadisticas();
        
        // Guardar automáticamente las materias cursadas
        await guardarMateriasCursadas();

    } catch (error) {
        console.error('Error al calcular elegibilidad:', error);
        mostrarMensaje('Error al calcular elegibilidad: ' + error.message, 'error');
    }
}

// Función para verificar elegibilidad de una materia específica
async function verificarElegibilidadMateria(materiaId) {
    try {
        const response = await fetch(`/materias-cursadas/elegibilidad/verificar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                materiaId: materiaId,
                materiasCursadas: Array.from(materiasCursadas)
            })
        });

        if (!response.ok) {
            throw new Error('Error al verificar elegibilidad');
        }

        const data = await response.json();
        return data.elegible;
    } catch (error) {
        console.error('Error verificando elegibilidad:', error);
        return false;
    }
}

// Función para renderizar resultados
function renderizarResultados() {
    // Renderizar materias elegibles
    if (materiasElegibles.length > 0) {
        const elegiblesHTML = materiasElegibles.map(materia => crearMateriaCard(materia, 'elegible')).join('');
        document.getElementById('materiasElegiblesList').innerHTML = elegiblesHTML;
        document.getElementById('materiasElegiblesContainer').style.display = 'block';
    }

    // Renderizar materias no elegibles
    if (materiasNoElegibles.length > 0) {
        const noElegiblesHTML = materiasNoElegibles.map(materia => crearMateriaCard(materia, 'no-elegible')).join('');
        document.getElementById('materiasNoElegiblesList').innerHTML = noElegiblesHTML;
        document.getElementById('materiasNoElegiblesContainer').style.display = 'block';
    }

    // Asignar eventos a las flechas de expansión
    asignarEventosExpandibles();
    
    // Asignar eventos a los semestres
    asignarEventosSemestres();
}

// Función para crear tarjeta de materia
function crearMateriaCard(materia, tipo) {
    const badgeIcon = tipo === 'elegible' ? 'fa-check-circle' : 'fa-times-circle';
    const badgeColor = tipo === 'elegible' ? 'text-green-500' : 'text-red-500';
    const bgColor = tipo === 'elegible' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const uniqueId = `materia-${materia._id}-${tipo}`;
    
    return `
        <div class="bg-white rounded-2xl border-2 ${bgColor} overflow-hidden hover:shadow-lg transition-all duration-300" data-materia-id="${uniqueId}">
            <div class="p-6 cursor-pointer hover:bg-opacity-80 transition-all duration-300 materia-header" data-materia-id="${uniqueId}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 ${tipo === 'elegible' ? 'bg-green-500' : 'bg-red-500'} rounded-xl flex items-center justify-center">
                            <i class="fas ${badgeIcon} text-white text-lg"></i>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="text-sm font-mono ${tipo === 'elegible' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} px-3 py-1 rounded-lg">${materia.codigo}</span>
                                <span class="text-sm text-gray-500">${materia.creditos} créditos</span>
                                ${materia.semestre?.numero ? `<span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Semestre ${materia.semestre.numero}</span>` : ''}
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-1">${materia.nombre}</h3>
                            <p class="text-sm text-gray-600">${materia.descripcion || 'Sin descripción disponible'}</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 transition-transform duration-300 expand-icon" data-materia-id="${uniqueId}"></i>
                </div>
            </div>
            <div class="materia-detalles hidden border-t border-gray-200" id="${uniqueId}">
                <div class="p-6 bg-gray-50">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-calendar text-blue-600"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Semestre</p>
                                <p class="text-sm text-gray-600">${materia.semestre?.numero || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-users text-purple-600"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Cupo</p>
                                <p class="text-sm text-gray-600">${materia.cupoDisponible || 0}/${materia.cupoMaximo || 0}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-chalkboard-teacher text-orange-600"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Profesor</p>
                                <p class="text-sm text-gray-600">${materia.profesor?.nombre || 'Sin asignar'}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-book text-green-600"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Créditos</p>
                                <p class="text-sm text-gray-600">${materia.creditos} académicos</p>
                            </div>
                        </div>
                    </div>
                    ${materia.elegibilidad && !materia.elegibilidad.elegible && materia.elegibilidad.requisitosFaltantes ? `
                        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <h6 class="text-red-800 font-semibold mb-3 flex items-center">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Requisitos faltantes:
                            </h6>
                            <div class="space-y-2">
                                ${materia.elegibilidad.requisitosFaltantes.map(req => `
                                    <div class="bg-white p-3 rounded-lg border-l-4 border-red-400">
                                        <div class="flex items-center space-x-2">
                                            <span class="font-mono text-sm font-semibold text-red-700">${req.codigo}</span>
                                            <span class="text-sm text-gray-700">${req.materia}</span>
                                        </div>
                                        <p class="text-xs text-gray-600 mt-1">
                                            ${req.tipoDescripcion || req.tipo}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Función para actualizar estadísticas
function actualizarEstadisticas() {
    document.getElementById('totalMaterias').textContent = materias.length;
    document.getElementById('materiasCursadas').textContent = materiasCursadas.size;
    document.getElementById('materiasElegibles').textContent = materiasElegibles.length;
    document.getElementById('materiasNoElegibles').textContent = materiasNoElegibles.length;
}

// Función para limpiar selección
function limpiarSeleccion() {
    materiasCursadas.clear();
    materiasElegibles = [];
    materiasNoElegibles = [];
    
    renderizarMateriasCursadas();
    document.getElementById('materiasElegiblesContainer').style.display = 'none';
    document.getElementById('materiasNoElegiblesContainer').style.display = 'none';
    actualizarEstadisticas();
}

// Función de prueba para verificar que los eventos funcionan
function testCheckbox() {
    console.log('🧪 Probando checkbox...');
    if (materias.length > 0) {
        const primeraMateria = materias[0];
        console.log('🔄 Toggleando primera materia:', primeraMateria.codigo);
        toggleMateriaCursada(primeraMateria._id);
    } else {
        console.log('❌ No hay materias para probar');
    }
}

// Función para asignar eventos a las flechas de expansión
function asignarEventosExpandibles() {
    const expandIcons = document.querySelectorAll('.expand-icon');
    const materiaHeaders = document.querySelectorAll('.materia-header');
    console.log('🔗 Asignando eventos a', expandIcons.length, 'íconos de expansión y', materiaHeaders.length, 'headers de materias');
    
    // Asignar eventos a los íconos
    expandIcons.forEach(icon => {
        const materiaId = icon.getAttribute('data-materia-id');
        
        if (!materiaId) {
            console.log('❌ No se encontró data-materia-id para el ícono');
            return;
        }
        
        console.log('📌 Asignando evento a ícono de materia:', materiaId);
        
        // Remover eventos anteriores para evitar duplicados
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        // Asignar nuevo event listener
        newIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en ícono de expansión:', materiaId);
            toggleMateriaDetalles(materiaId);
        });
    });
    
    // Asignar eventos a los headers de las materias
    materiaHeaders.forEach(header => {
        const materiaId = header.getAttribute('data-materia-id');
        
        if (!materiaId) {
            console.log('❌ No se encontró data-materia-id para el header');
            return;
        }
        
        console.log('📌 Asignando evento a header de materia:', materiaId);
        
        // Remover eventos anteriores para evitar duplicados
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
        
        // Asignar nuevo event listener
        newHeader.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en header de materia:', materiaId);
            toggleMateriaDetalles(materiaId);
        });
    });
}

// Función para toggle de detalles de materia
function toggleMateriaDetalles(materiaId) {
    const detalles = document.getElementById(materiaId);
    const icon = document.querySelector(`[data-materia-id="${materiaId}"] .expand-icon`);
    
    if (!detalles || !icon) {
        console.log('❌ No se encontró detalles o ícono para:', materiaId);
        return;
    }
    
    if (!detalles.classList.contains('hidden')) {
        detalles.classList.add('hidden');
        icon.classList.remove('rotate-180');
        console.log('📤 Cerrando detalles de:', materiaId);
    } else {
        // Cerrar otros detalles abiertos
        document.querySelectorAll('.materia-detalles:not(.hidden)').forEach(detalle => {
            detalle.classList.add('hidden');
            const detalleIcon = document.querySelector(`[data-materia-id="${detalle.id}"] .expand-icon`);
            if (detalleIcon) {
                detalleIcon.classList.remove('rotate-180');
            }
        });
        
        detalles.classList.remove('hidden');
        icon.classList.add('rotate-180');
        console.log('📥 Abriendo detalles de:', materiaId);
    }
}

// Función para obtener texto del estado
function getEstadoTexto(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'en_curso': 'Cursando',
        'cursado': 'A examen',
        'aprobado': 'Aprobada'
    };
    return estados[estado] || 'Desconocido';
}

// Función para obtener color del estado
function getEstadoColor(estado) {
    const colores = {
        'pendiente': '#f59e0b', // amarillo
        'en_curso': '#3b82f6',  // azul
        'cursado': '#8b5cf6',   // púrpura
        'aprobado': '#10b981'    // verde
    };
    return colores[estado] || '#6b7280';
}

// Hacer las funciones disponibles globalmente
window.testCheckbox = testCheckbox;
window.toggleMateriaDetalles = toggleMateriaDetalles;
window.toggleSemestre = toggleSemestre;

