// Configuración global
const API_BASE_URL = window.location.origin;
const SOCKET_EVENTS = {
    USUARIO_REGISTRADO: 'usuario_registrado',
    USUARIO_CONECTADO: 'usuario_conectado',
    USUARIO_DESCONECTADO: 'usuario_desconectado',
    MATERIA_ACTUALIZADA: 'materia_actualizada',
    NOTIFICACION: 'notificacion'
};

// Clase principal de la aplicación
class SistemaElegibilidad {
    constructor() {
        this.socket = null;
        this.usuario = null;
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        
        this.init();
    }

    // Inicializar la aplicación
    init() {
        this.cargarUsuario();
        this.inicializarWebSockets();
        this.configurarEventListeners();
        this.verificarAutenticacion();
    }

    // Cargar información del usuario desde localStorage
    cargarUsuario() {
        const usuarioStr = localStorage.getItem('usuario');
        if (usuarioStr) {
            try {
                this.usuario = JSON.parse(usuarioStr);
            } catch (error) {
                console.error('Error al parsear usuario:', error);
                this.limpiarSesion();
            }
        }
    }

    // Inicializar conexión WebSocket
    inicializarWebSockets() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.configurarWebSocketEvents();
        }
    }

    // Configurar eventos de WebSocket
    configurarWebSocketEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('🔌 Conectado al servidor WebSocket');
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Desconectado del servidor WebSocket');
        });

        this.socket.on(SOCKET_EVENTS.NOTIFICACION, (data) => {
            this.mostrarNotificacion(data);
        });

        this.socket.on(SOCKET_EVENTS.MATERIA_ACTUALIZADA, (data) => {
            this.actualizarInterfazMateria(data);
        });
    }

    // Configurar event listeners globales
    configurarEventListeners() {
        // Interceptor para requests HTTP
        this.configurarInterceptorHTTP();
        
        // Event listeners para elementos comunes
        document.addEventListener('DOMContentLoaded', () => {
            this.configurarFormularios();
            this.configurarModales();
        });
    }

    // Configurar interceptor HTTP para manejo automático de tokens
    configurarInterceptorHTTP() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Agregar token de autorización si existe
            if (this.accessToken && !url.includes('/auth/')) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`
                };
            }

            try {
                const response = await originalFetch(url, options);
                
                // Si el token expiró, intentar renovarlo
                if (response.status === 401 && this.refreshToken) {
                    const nuevoToken = await this.renovarAccessToken();
                    if (nuevoToken) {
                        // Reintentar la request original
                        options.headers['Authorization'] = `Bearer ${nuevoToken}`;
                        return await originalFetch(url, options);
                    }
                }
                
                return response;
            } catch (error) {
                console.error('Error en fetch:', error);
                throw error;
            }
        };
    }

    // Renovar access token usando refresh token
    async renovarAccessToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.accessToken;
                localStorage.setItem('accessToken', this.accessToken);
                return this.accessToken;
            } else {
                // Refresh token expirado, limpiar sesión
                this.limpiarSesion();
                return null;
            }
        } catch (error) {
            console.error('Error al renovar token:', error);
            this.limpiarSesion();
            return null;
        }
    }

    // Verificar autenticación al cargar la página
    async verificarAutenticacion() {
        if (this.accessToken) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/verificar`);
                if (!response.ok) {
                    this.limpiarSesion();
                }
            } catch (error) {
                console.error('Error al verificar autenticación:', error);
                this.limpiarSesion();
            }
        }
    }

    // Limpiar sesión del usuario
    limpiarSesion() {
        this.usuario = null;
        this.accessToken = null;
        this.refreshToken = null;
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
        
        // Redirigir a la página principal si no estamos ahí
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    // Configurar formularios
    configurarFormularios() {
        // Formularios de autenticación
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.manejarLogin.bind(this));
        }

        const registroForm = document.getElementById('registroForm');
        if (registroForm) {
            registroForm.addEventListener('submit', this.manejarRegistro.bind(this));
        }

        // Formularios con validación
        this.configurarValidaciones();
    }

    // Manejar login
    async manejarLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.iniciarSesion(data);
            } else {
                const error = await response.json();
                this.mostrarError(error.error || 'Error al iniciar sesión');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.mostrarError('Error al conectar con el servidor');
        }
    }

    // Manejar registro
    async manejarRegistro(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const data = await response.json();
                this.iniciarSesion(data);
            } else {
                const error = await response.json();
                this.mostrarError(error.error || 'Error al registrarse');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.mostrarError('Error al conectar con el servidor');
        }
    }

    // Iniciar sesión con datos del usuario
    iniciarSesion(data) {
        this.usuario = data.usuario;
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        
        localStorage.setItem('accessToken', this.accessToken);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('usuario', JSON.stringify(this.usuario));
        
        // Mostrar mensaje de éxito
        this.mostrarExito('Sesión iniciada exitosamente');
        
        // Redirigir según el rol
        setTimeout(() => {
            if (this.usuario.rol === 'administrador') {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/estudiantes/dashboard';
            }
        }, 1000);
    }

    // Configurar validaciones de formularios
    configurarValidaciones() {
        // Validación en tiempo real para campos requeridos
        document.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validarCampo(input);
            });
        });
    }

    // Validar campo individual
    validarCampo(campo) {
        const valor = campo.value.trim();
        const esRequerido = campo.hasAttribute('required');
        
        if (esRequerido && !valor) {
            this.mostrarErrorCampo(campo, 'Este campo es requerido');
            return false;
        }
        
        // Validaciones específicas por tipo
        if (campo.type === 'email' && valor) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(valor)) {
                this.mostrarErrorCampo(campo, 'Email inválido');
                return false;
            }
        }
        
        if (campo.type === 'password' && valor && valor.length < 6) {
            this.mostrarErrorCampo(campo, 'La contraseña debe tener al menos 6 caracteres');
            return false;
        }
        
        this.limpiarErrorCampo(campo);
        return true;
    }

    // Mostrar error en campo específico
    mostrarErrorCampo(campo, mensaje) {
        this.limpiarErrorCampo(campo);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback d-block';
        errorDiv.textContent = mensaje;
        
        campo.classList.add('is-invalid');
        campo.parentNode.appendChild(errorDiv);
    }

    // Limpiar error de campo específico
    limpiarErrorCampo(campo) {
        campo.classList.remove('is-invalid');
        const errorDiv = campo.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Configurar modales
    configurarModales() {
        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            });
        });
    }

    // Mostrar notificación
    mostrarNotificacion(data) {
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-primary border-0';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-info-circle me-2"></i>
                    ${data.mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);
        
        const toastInstance = new bootstrap.Toast(toast);
        toastInstance.show();
        
        // Remover toast después de que se oculte
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Mostrar mensaje de éxito
    mostrarExito(mensaje) {
        this.mostrarAlerta(mensaje, 'success');
    }

    // Mostrar mensaje de error
    mostrarError(mensaje) {
        this.mostrarAlerta(mensaje, 'danger');
    }

    // Mostrar mensaje de advertencia
    mostrarAdvertencia(mensaje) {
        this.mostrarAlerta(mensaje, 'warning');
    }

    // Mostrar mensaje de información
    mostrarInfo(mensaje) {
        this.mostrarAlerta(mensaje, 'info');
    }

    // Mostrar alerta genérica
    mostrarAlerta(mensaje, tipo) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo} alert-dismissible fade show`;
        alert.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Actualizar interfaz cuando se actualiza una materia
    actualizarInterfazMateria(data) {
        // Buscar elementos que muestren información de la materia
        const materiaElements = document.querySelectorAll(`[data-materia-id="${data.materia._id}"]`);
        
        materiaElements.forEach(element => {
            // Actualizar información según el tipo de elemento
            if (element.classList.contains('materia-card')) {
                this.actualizarMateriaCard(element, data.materia);
            } else if (element.classList.contains('materia-info')) {
                this.actualizarMateriaInfo(element, data.materia);
            }
        });
    }

    // Actualizar tarjeta de materia
    actualizarMateriaCard(card, materia) {
        // Actualizar cupo disponible
        const cupoElement = card.querySelector('.cupo-disponible');
        if (cupoElement) {
            cupoElement.textContent = materia.cupoDisponible;
        }
        
        // Actualizar estado activo
        if (!materia.activa) {
            card.classList.add('inactiva');
        } else {
            card.classList.remove('inactiva');
        }
    }

    // Actualizar información de materia
    actualizarMateriaInfo(element, materia) {
        // Actualizar campos específicos
        const nombreElement = element.querySelector('.materia-nombre');
        if (nombreElement) {
            nombreElement.textContent = materia.nombre;
        }
        
        const creditosElement = element.querySelector('.materia-creditos');
        if (creditosElement) {
            creditosElement.textContent = materia.creditos;
        }
    }

    // Utilidades
    static formatDate(date) {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatTime(time) {
        return time;
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SistemaElegibilidad();
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SistemaElegibilidad;
}

