// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Toggle mobile menu function
function toggleMenu() {
    const mobileMenu = document.getElementById('navbarNav');
    if (mobileMenu.classList.contains('show')) {
        mobileMenu.classList.remove('show');
    } else {
        mobileMenu.classList.add('show');
    }
}

// Toggle dropdown function
function toggleDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropdown = event.target.closest('.dropdown');
    const dropdownMenu = dropdown.querySelector('.dropdown-menu');
    
    // Cerrar todos los otros dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
        if (menu !== dropdownMenu) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle del dropdown actual
    dropdownMenu.classList.toggle('show');
}

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
            menu.classList.remove('show');
        });
    }
});

// Función para alternar visibilidad de contraseña
function togglePassword(inputId) {
    console.log('👁️ togglePassword llamado para:', inputId);
    const input = document.getElementById(inputId);
    
    console.log('👁️ Input encontrado:', input);
    
    if (input.type === 'password') {
        console.log('👁️ Cambiando a texto visible');
        input.type = 'text';
    } else {
        console.log('👁️ Cambiando a contraseña oculta');
        input.type = 'password';
    }
}

// Event listeners para botones de toggle password
document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password-btn');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            togglePassword(targetId);
        });
    });
});

// Función para validar contraseña
function validatePassword(password) {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };

    // Actualizar indicadores visuales
    const elements = [
        { id: 'length-check', check: checks.length },
        { id: 'uppercase-check', check: checks.uppercase },
        { id: 'lowercase-check', check: checks.lowercase },
        { id: 'number-check', check: checks.number }
    ];

    elements.forEach(element => {
        const elementEl = document.getElementById(element.id);
        if (elementEl) {
            elementEl.className = element.check ? 'password-check text-emerald-500' : 'password-check text-destructive';
        }
    });

    return Object.values(checks).every(check => check);
}

// Función para cambiar sección
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.profile-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Actualizar estado del menú
    document.querySelectorAll('.profile-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}
