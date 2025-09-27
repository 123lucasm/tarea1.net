let materias = [];
let materiasCursadas = new Set();
let materiasElegibles = [];
let materiasNoElegibles = [];
let semestresAbiertos = new Set();

// Función para toggle de materia cursada
function toggleMateriaCursada(materiaId) {
    console.log('🖱️ Toggle materia:', materiaId);
    console.log('📋 Estado actual:', materiasCursadas.has(materiaId));
    
    if (materiasCursadas.has(materiaId)) {
        materiasCursadas.delete(materiaId);
        console.log('❌ Materia removida de cursadas');
    } else {
        materiasCursadas.add(materiaId);
        console.log('✅ Materia agregada a cursadas');
    }
    
    console.log('📊 Total materias cursadas:', materiasCursadas.size);
    
    renderizarMateriasCursadas();
    actualizarEstadisticas();
}

// Cargar materias al inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarMaterias();
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

    // Botón probar checkbox
    const btnTest = document.getElementById('btnTestCheckbox');
    if (btnTest) {
        btnTest.addEventListener('click', testCheckbox);
    }

    console.log('🔗 Eventos de botones asignados');
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

    console.log('🎨 Renderizando materias por semestres...', materias.length);

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
                <div class="semestre-container">
                    <div class="semestre-header" data-semestre-id="${semestreId}">
                        <div class="semestre-info">
                            <div class="semestre-numero">${semestreNum}</div>
                            <div class="semestre-details">
                                <div class="semestre-nombre">${semestreData.semestre?.nombre || 'Sin semestre definido'}</div>
                                <div class="semestre-stats">
                                    ${materiasCursadasEnSemestre} de ${semestreData.materias.length} materias cursadas
                                </div>
                            </div>
                        </div>
                        <i class="fas fa-chevron-down semestre-toggle"></i>
                    </div>
                    <div class="semestre-content" id="${semestreId}">
                        <div class="semestre-materias">
                            ${semestreData.materias.map(materia => `
                                <div class="checkbox-container ${materiasCursadas.has(materia._id) ? 'checked' : ''}" 
                                     data-materia-id="${materia._id}">
                                    <div class="custom-checkbox ${materiasCursadas.has(materia._id) ? 'checked' : ''}">
                                        ${materiasCursadas.has(materia._id) ? '<i class="fas fa-check"></i>' : ''}
                                    </div>
                                    <div class="checkbox-label">
                                        <span class="materia-codigo">${materia.codigo}</span>
                                        <span class="materia-nombre">${materia.nombre}</span>
                                        <span class="materia-creditos">${materia.creditos} créditos</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    container.innerHTML = semestresHTML;
    
    // Asignar eventos después de renderizar
    asignarEventosSemestres();
    asignarEventosCheckboxes();

    // Restaurar estado abierto de semestres
    abiertosAntes.forEach(id => {
        const content = document.getElementById(id);
        const toggle = content?.previousElementSibling?.querySelector('.semestre-toggle');
        if (content && !content.classList.contains('mostrar')) {
            content.classList.add('mostrar');
            toggle && toggle.classList.add('rotated');
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
    const toggle = content?.previousElementSibling?.querySelector('.semestre-toggle');
    
    if (!content) return;

    if (content.classList.contains('mostrar')) {
        content.classList.remove('mostrar');
        toggle && toggle.classList.remove('rotated');
        semestresAbiertos.delete(semestreId);
        console.log('📤 Cerrando semestre:', semestreId);
    } else {
        content.classList.add('mostrar');
        toggle && toggle.classList.add('rotated');
        semestresAbiertos.add(semestreId);
        console.log('📥 Abriendo semestre:', semestreId);
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
            e.preventDefault();
            e.stopPropagation(); // Evitar que se propague al semestre
            console.log('🖱️ Click en checkbox:', materiaId);
            toggleMateriaCursada(materiaId);
        });
    });
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

    } catch (error) {
        console.error('Error al calcular elegibilidad:', error);
        alert('Error al calcular elegibilidad. Intenta nuevamente.');
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
}

// Función para crear tarjeta de materia
function crearMateriaCard(materia, tipo) {
    const badgeIcon = tipo === 'elegible' ? 'fa-check-circle' : 'fa-times-circle';
    const badgeColor = tipo === 'elegible' ? 'var(--utec-success)' : 'var(--utec-danger)';
    const uniqueId = `materia-${materia._id}-${tipo}`;
    
    return `
        <div class="materia-expandible">
            <div class="checkbox-container ${tipo}" style="border-color: ${badgeColor}; background: ${tipo === 'elegible' ? '#f0fdf4' : '#fef2f2'};">
                <div class="custom-checkbox" style="background: ${badgeColor}; border-color: ${badgeColor};">
                    <i class="fas ${badgeIcon}" style="color: white; font-size: 12px;"></i>
                </div>
                <div class="checkbox-label">
                    <span class="materia-codigo">${materia.codigo}</span>
                    <span class="materia-nombre">${materia.nombre}</span>
                    <span class="materia-creditos">${materia.creditos} créditos</span>
                    ${materia.semestre?.numero ? `<br><small style="color: #6b7280; font-size: 0.7rem;">Semestre ${materia.semestre.numero}</small>` : ''}
                </div>
                <i class="fas fa-chevron-down expand-icon" data-materia-id="${uniqueId}"></i>
            </div>
            <div class="materia-detalles" id="${uniqueId}">
                <div class="materia-descripcion">${materia.descripcion || 'Sin descripción disponible'}</div>
                <div class="materia-info">
                    <div class="info-item">
                        <i class="fas fa-calendar info-icon"></i>
                        <span class="info-text">Semestre ${materia.semestre?.numero || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users info-icon"></i>
                        <span class="info-text">Cupo: ${materia.cupoDisponible || 0}/${materia.cupoMaximo || 0}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-chalkboard-teacher info-icon"></i>
                        <span class="info-text">${materia.profesor?.nombre || 'Sin asignar'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-book info-icon"></i>
                        <span class="info-text">${materia.creditos} créditos académicos</span>
                    </div>
                </div>
                ${materia.elegibilidad && !materia.elegibilidad.elegible && materia.elegibilidad.requisitosFaltantes ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <h6 style="color: var(--utec-danger); margin-bottom: 0.5rem;">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            Requisitos faltantes:
                        </h6>
                        ${materia.elegibilidad.requisitosFaltantes.map(req => `
                            <div style="background: #fef2f2; padding: 0.5rem; border-radius: 0.25rem; margin-bottom: 0.5rem; border-left: 3px solid var(--utec-danger);">
                                <strong>${req.codigo}</strong> - ${req.materia}
                                <br>
                                <small style="color: #6b7280;">
                                    ${req.tipoDescripcion || req.tipo} (Nota mínima: ${req.notaMinima})
                                </small>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
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
    console.log('🔗 Asignando eventos a', expandIcons.length, 'íconos de expansión');
    
    expandIcons.forEach(icon => {
        const materiaId = icon.getAttribute('data-materia-id');
        console.log('📌 Asignando evento a materia:', materiaId);
        
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
}

// Función para toggle de detalles de materia
function toggleMateriaDetalles(materiaId) {
    const detalles = document.getElementById(materiaId);
    const icon = detalles.previousElementSibling.querySelector('.expand-icon');
    
    if (detalles.classList.contains('mostrar')) {
        detalles.classList.remove('mostrar');
        icon.classList.remove('rotated');
        console.log('📤 Cerrando detalles de:', materiaId);
    } else {
        // Cerrar otros detalles abiertos
        document.querySelectorAll('.materia-detalles.mostrar').forEach(detalle => {
            detalle.classList.remove('mostrar');
            detalle.previousElementSibling.querySelector('.expand-icon').classList.remove('rotated');
        });
        
        detalles.classList.add('mostrar');
        icon.classList.add('rotated');
        console.log('📥 Abriendo detalles de:', materiaId);
    }
}

// Hacer las funciones disponibles globalmente
window.testCheckbox = testCheckbox;
window.toggleMateriaDetalles = toggleMateriaDetalles;
window.toggleSemestre = toggleSemestre;

