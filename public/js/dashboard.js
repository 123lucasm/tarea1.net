// Inicializar dropdowns manualmente (SIN Bootstrap JS)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando dropdowns manuales en dashboard...');
    
    // Remover atributos de Bootstrap que interfieren
    document.querySelectorAll('.dropdown-toggle').forEach(function(toggle) {
        toggle.removeAttribute('data-bs-toggle');
        toggle.removeAttribute('aria-expanded');
    });
    
    document.querySelectorAll('.dropdown-menu').forEach(function(menu) {
        menu.removeAttribute('data-bs-popper');
    });
    
    // Dropdown completamente manual
    document.querySelectorAll('.dropdown-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🖱️ Click en dropdown toggle del dashboard');
            
            const dropdownMenu = this.nextElementSibling;
            console.log('🔍 Dropdown menu encontrado en dashboard:', dropdownMenu);
            
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                // Cerrar todos los otros dropdowns
                document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                    if (menu !== dropdownMenu) {
                        menu.classList.remove('show');
                    }
                });
                
                // Toggle del dropdown actual
                const isVisible = dropdownMenu.classList.contains('show');
                dropdownMenu.classList.toggle('show');
                
                console.log('🔄 Dropdown manual activado en dashboard:', !isVisible);
                console.log('📋 Estado del menú en dashboard:', dropdownMenu.classList.contains('show'));
                
                // Debug: verificar estilos aplicados
                const computedStyle = window.getComputedStyle(dropdownMenu);
                console.log('🎨 Estilos del dropdown:');
                console.log('  - Display:', computedStyle.display);
                console.log('  - Position:', computedStyle.position);
                console.log('  - Z-index:', computedStyle.zIndex);
                console.log('  - Top:', computedStyle.top);
                console.log('  - Right:', computedStyle.right);
            } else {
                console.error('❌ No se encontró el dropdown menu en dashboard');
            }
        });
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                menu.classList.remove('show');
                console.log('🔒 Dropdown cerrado por clic fuera en dashboard');
            });
        }
    });
    
    // Cerrar dropdown al hacer clic en un item del menú
    document.querySelectorAll('.dropdown-item').forEach(function(item) {
        item.addEventListener('click', function() {
            const dropdownMenu = this.closest('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
                console.log('🔒 Dropdown cerrado por selección');
            }
        });
    });
    
    console.log('✅ Dropdowns manuales inicializados en dashboard (Bootstrap deshabilitado)');
});

// Sistema de Notificaciones
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    if (!notification || !messageElement) {
        console.error('❌ Elementos de notificación no encontrados');
        return;
    }
    
    // Actualizar mensaje
    messageElement.textContent = message;
    
    // Cambiar color según tipo
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, var(--utec-success) 0%, #059669 100%)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, var(--utec-danger) 0%, #dc2626 100%)';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(135deg, var(--utec-warning) 0%, #d97706 100%)';
    }
    
    // Mostrar notificación
    notification.classList.remove('hide');
    notification.classList.add('show');
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        hideNotification();
    }, 4000);
}

// Función para ocultar notificación
function hideNotification() {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('❌ Elemento de notificación no encontrado');
        return;
    }
    
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // Remover del DOM después de la animación
    setTimeout(() => {
        notification.classList.remove('hide');
    }, 400);
}

// Función para verificar y mostrar notificación de login exitoso
function checkLoginSuccess() {
    // Verificar si hay parámetros de URL que indiquen login exitoso
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('loginSuccess');
    const userName = urlParams.get('userName');
    
    if (loginSuccess === 'true' && userName) {
        showNotification(`¡Bienvenido, ${decodeURIComponent(userName)}! Inicio de sesión exitoso.`, 'success');
        
        // Limpiar la URL removiendo los parámetros
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

// Inicializar verificación de login exitoso cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    checkLoginSuccess();
});
