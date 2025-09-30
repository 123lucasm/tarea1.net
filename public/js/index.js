// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});

// Inicializar dropdowns manualmente (SIN Bootstrap JS)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando dropdowns manuales en index...');
    
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
            
            console.log('🖱️ Click en dropdown toggle del index');
            
            const dropdownMenu = this.nextElementSibling;
            console.log('🔍 Dropdown menu encontrado en index:', dropdownMenu);
            
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
                
                console.log('🔄 Dropdown manual activado en index:', !isVisible);
                console.log('📋 Estado del menú en index:', dropdownMenu.classList.contains('show'));
                
                // Debug: verificar estilos aplicados
                const computedStyle = window.getComputedStyle(dropdownMenu);
                console.log('🎨 Estilos del dropdown:');
                console.log('  - Display:', computedStyle.display);
                console.log('  - Position:', computedStyle.position);
                console.log('  - Z-index:', computedStyle.zIndex);
                console.log('  - Top:', computedStyle.top);
                console.log('  - Right:', computedStyle.right);
            } else {
                console.error('❌ No se encontró el dropdown menu en index');
            }
        });
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                menu.classList.remove('show');
                console.log('🔒 Dropdown cerrado por clic fuera en index');
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
    
    console.log('✅ Dropdowns manuales inicializados en index (Bootstrap deshabilitado)');
});

// Animated counters
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200;

    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-count');
            const count = +counter.innerText;
            const inc = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + inc);
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href && href !== '#') {
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Trigger counter animation when stats section is visible
document.addEventListener('DOMContentLoaded', function() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    });

    const statsSection = document.querySelector('section.bg-gradient-to-br');
    if (statsSection) {
        observer.observe(statsSection);
    }
});
