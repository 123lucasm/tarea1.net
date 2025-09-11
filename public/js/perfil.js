// Perfil JavaScript
let modoEdicion = false;
let modoCambioContraseña = false;

// Inicializar Socket.IO
const socket = io();

document.addEventListener('DOMContentLoaded', function() {
    configurarSocketEvents();
    configurarEventosPerfil();
    configurarValidaciones();
});

function configurarSocketEvents() {
    socket.on('connect', function() {
        actualizarEstadoConexion('connected', 'Conectado');
    });
    
    socket.on('disconnect', function() {
        actualizarEstadoConexion('disconnected', 'Desconectado');
    });
}

function configurarEventosPerfil() {
    // Botón editar perfil
    const btnEditarPerfil = document.getElementById('editar-perfil');
    if (btnEditarPerfil) {
        btnEditarPerfil.addEventListener('click', toggleModoEdicion);
    }
    
    // Botón cancelar edición
    const btnCancelarEdicion = document.getElementById('cancelar-edicion');
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', cancelarEdicion);
    }
    
    // Formulario de perfil
    const formPerfil = document.getElementById('form-perfil');
    if (formPerfil) {
        formPerfil.addEventListener('submit', manejarSubmitPerfil);
    }
    
    // Botón cambiar contraseña
    const btnCambiarContraseña = document.getElementById('cambiar-contraseña');
    if (btnCambiarContraseña) {
        btnCambiarContraseña.addEventListener('click', toggleModoCambioContraseña);
    }
    
    // Botón cancelar cambio de contraseña
    const btnCancelarContraseña = document.getElementById('cancelar-contraseña');
    if (btnCancelarContraseña) {
        btnCancelarContraseña.addEventListener('click', cancelarCambioContraseña);
    }
    
    // Formulario de contraseña
    const formContraseña = document.getElementById('form-contraseña');
    if (formContraseña) {
        formContraseña.addEventListener('submit', manejarSubmitContraseña);
    }
    
    // Botón cambiar avatar
    const btnCambiarAvatar = document.getElementById('cambiar-avatar');
    if (btnCambiarAvatar) {
        btnCambiarAvatar.addEventListener('click', cambiarAvatar);
    }
}

function configurarValidaciones() {
    // Validación de contraseña en tiempo real
    const nuevaContraseña = document.getElementById('nueva-contraseña');
    if (nuevaContraseña) {
        nuevaContraseña.addEventListener('input', validarContraseña);
    }
    
    // Validación de confirmación de contraseña
    const confirmarContraseña = document.getElementById('confirmar-contraseña');
    if (confirmarContraseña) {
        confirmarContraseña.addEventListener('input', validarConfirmacionContraseña);
    }
}

function actualizarEstadoConexion(estado, texto) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator && statusText) {
        indicator.className = `status-indicator ${estado}`;
        statusText.textContent = texto;
    }
}

function toggleModoEdicion() {
    modoEdicion = !modoEdicion;
    
    const inputs = document.querySelectorAll('#form-perfil input, #form-perfil textarea');
    const btnEditar = document.getElementById('editar-perfil');
    const btnCancelar = document.getElementById('cancelar-edicion');
    const btnGuardar = document.getElementById('guardar-perfil');
    
    inputs.forEach(input => {
        if (input.type !== 'checkbox') {
            input.readOnly = !modoEdicion;
            if (modoEdicion) {
                input.classList.remove('bg-slate-50', 'text-slate-600', 'cursor-not-allowed');
                input.classList.add('bg-white');
            } else {
                input.classList.add('bg-slate-50', 'text-slate-600', 'cursor-not-allowed');
                input.classList.remove('bg-white');
            }
        }
    });
    
    if (modoEdicion) {
        btnEditar.style.display = 'none';
        btnCancelar.style.display = 'inline-flex';
        btnGuardar.style.display = 'inline-flex';
    } else {
        btnEditar.style.display = 'inline-flex';
        btnCancelar.style.display = 'none';
        btnGuardar.style.display = 'none';
    }
}

function cancelarEdicion() {
    // Recargar la página para restaurar los valores originales
    location.reload();
}

function toggleModoCambioContraseña() {
    modoCambioContraseña = !modoCambioContraseña;
    
    const formContraseña = document.getElementById('form-contraseña');
    const btnCambiar = document.getElementById('cambiar-contraseña');
    
    if (modoCambioContraseña) {
        formContraseña.style.display = 'block';
        btnCambiar.style.display = 'none';
        formContraseña.classList.add('fade-in');
    } else {
        formContraseña.style.display = 'none';
        btnCambiar.style.display = 'inline-flex';
        formContraseña.classList.remove('fade-in');
    }
}

function cancelarCambioContraseña() {
    modoCambioContraseña = false;
    toggleModoCambioContraseña();
    
    // Limpiar formulario
    document.getElementById('form-contraseña').reset();
    limpiarValidacionesContraseña();
}

async function manejarSubmitPerfil(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const datosPerfil = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        biografia: formData.get('biografia'),
        notificacionesEmail: document.getElementById('notificaciones-email').checked,
        modoOscuro: document.getElementById('modo-oscuro').checked
    };
    
    console.log('📝 Actualizando perfil:', datosPerfil);
    
    try {
        const response = await fetch('/admin/api/perfil', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosPerfil)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Perfil actualizado:', data);
        
        mostrarNotificacion('Éxito', 'Perfil actualizado correctamente', 'success');
        
        // Salir del modo edición
        modoEdicion = false;
        toggleModoEdicion();
        
        // Actualizar la información en la página
        actualizarInformacionPerfil(data.usuario);
        
    } catch (error) {
        console.error('❌ Error actualizando perfil:', error);
        mostrarNotificacion('Error', 'Error al actualizar perfil: ' + error.message, 'error');
    }
}

async function manejarSubmitContraseña(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const datosContraseña = {
        contraseñaActual: formData.get('contraseñaActual'),
        nuevaContraseña: formData.get('nuevaContraseña'),
        confirmarContraseña: formData.get('confirmarContraseña')
    };
    
    // Validar contraseñas
    if (datosContraseña.nuevaContraseña !== datosContraseña.confirmarContraseña) {
        mostrarNotificacion('Error', 'Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!validarFortalezaContraseña(datosContraseña.nuevaContraseña)) {
        mostrarNotificacion('Error', 'La contraseña no cumple con los requisitos de seguridad', 'error');
        return;
    }
    
    console.log('🔐 Cambiando contraseña...');
    
    try {
        const response = await fetch('/admin/api/cambiar-contraseña', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contraseñaActual: datosContraseña.contraseñaActual,
                nuevaContraseña: datosContraseña.nuevaContraseña
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Contraseña cambiada:', data);
        
        mostrarNotificacion('Éxito', 'Contraseña cambiada correctamente', 'success');
        
        // Limpiar formulario y salir del modo cambio
        document.getElementById('form-contraseña').reset();
        limpiarValidacionesContraseña();
        cancelarCambioContraseña();
        
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        mostrarNotificacion('Error', 'Error al cambiar contraseña: ' + error.message, 'error');
    }
}

function validarContraseña() {
    const contraseña = document.getElementById('nueva-contraseña').value;
    const checks = {
        length: contraseña.length >= 8,
        uppercase: /[A-Z]/.test(contraseña),
        lowercase: /[a-z]/.test(contraseña),
        number: /\d/.test(contraseña)
    };
    
    // Actualizar indicadores visuales
    document.getElementById('length-check').className = checks.length ? 'text-emerald-600' : 'text-red-500';
    document.getElementById('uppercase-check').className = checks.uppercase ? 'text-emerald-600' : 'text-red-500';
    document.getElementById('lowercase-check').className = checks.lowercase ? 'text-emerald-600' : 'text-red-500';
    document.getElementById('number-check').className = checks.number ? 'text-emerald-600' : 'text-red-500';
    
    return Object.values(checks).every(check => check);
}

function validarConfirmacionContraseña() {
    const contraseña = document.getElementById('nueva-contraseña').value;
    const confirmacion = document.getElementById('confirmar-contraseña').value;
    
    const input = document.getElementById('confirmar-contraseña');
    
    if (confirmacion && contraseña !== confirmacion) {
        input.classList.add('input-invalid');
        input.classList.remove('input-valid');
    } else if (confirmacion && contraseña === confirmacion) {
        input.classList.add('input-valid');
        input.classList.remove('input-invalid');
    } else {
        input.classList.remove('input-valid', 'input-invalid');
    }
}

function validarFortalezaContraseña(contraseña) {
    return contraseña.length >= 8 && 
           /[A-Z]/.test(contraseña) && 
           /[a-z]/.test(contraseña) && 
           /\d/.test(contraseña);
}

function limpiarValidacionesContraseña() {
    const checks = ['length-check', 'uppercase-check', 'lowercase-check', 'number-check'];
    checks.forEach(id => {
        document.getElementById(id).className = 'text-red-500';
    });
    
    const inputs = ['nueva-contraseña', 'confirmar-contraseña'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove('input-valid', 'input-invalid');
    });
}

function actualizarInformacionPerfil(usuario) {
    // Actualizar nombre en la navegación
    const nombreNav = document.querySelector('.user-name');
    if (nombreNav) {
        nombreNav.textContent = `${usuario.nombre} ${usuario.apellido}`;
    }
    
    // Actualizar avatar
    const avatar = document.querySelector('.avatar');
    if (avatar) {
        avatar.textContent = `${usuario.nombre.charAt(0).toUpperCase()}${usuario.apellido.charAt(0).toUpperCase()}`;
    }
    
    // Actualizar información en el perfil
    const nombrePerfil = document.querySelector('h2');
    if (nombrePerfil) {
        nombrePerfil.textContent = `${usuario.nombre} ${usuario.apellido}`;
    }
}

function cambiarAvatar() {
    // Por ahora, solo mostrar un mensaje
    mostrarNotificacion('Info', 'Función de cambio de avatar próximamente', 'info');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
    console.log('🔔 Mostrando notificación:', { titulo, mensaje, tipo });
    
    // Usar SweetAlert2 si está disponible
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
    notification.className = `notification ${tipo} fade-in`;
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'times-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            </div>
            <div class="ml-3">
                <h3 class="text-sm font-medium">${titulo}</h3>
                <p class="text-sm mt-1">${mensaje}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto flex-shrink-0 text-current opacity-50 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Función de prueba para verificar notificaciones
function probarNotificaciones() {
    console.log('🧪 Probando notificaciones...');
    mostrarNotificacion('Prueba', 'Esta es una notificación de prueba', 'success');
    setTimeout(() => mostrarNotificacion('Prueba 2', 'Esta es otra notificación de prueba', 'error'), 1000);
    setTimeout(() => mostrarNotificacion('Prueba 3', 'Esta es una notificación de advertencia', 'warning'), 2000);
}

// Hacer la función disponible globalmente para pruebas
window.probarNotificaciones = probarNotificaciones;
