// Registro page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Página de registro cargada');
    
    // Password strength checker
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            
            // Remove all strength classes
            strengthFill.className = 'strength-fill';
            
            // Add appropriate strength class
            if (strength === 'weak') {
                strengthFill.classList.add('strength-weak');
                strengthText.textContent = 'Contraseña débil';
                strengthText.className = 'text-danger';
            } else if (strength === 'fair') {
                strengthFill.classList.add('strength-fair');
                strengthText.textContent = 'Contraseña regular';
                strengthText.className = 'text-warning';
            } else if (strength === 'good') {
                strengthFill.classList.add('strength-good');
                strengthText.textContent = 'Contraseña buena';
                strengthText.className = 'text-info';
            } else if (strength === 'strong') {
                strengthFill.classList.add('strength-strong');
                strengthText.textContent = 'Contraseña fuerte';
                strengthText.className = 'text-success';
            }
        });
    }
    
    // Form validation
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Las contraseñas no coinciden');
                return false;
            }
            
            if (password.length < 8) {
                e.preventDefault();
                alert('La contraseña debe tener al menos 8 caracteres');
                return false;
            }
        });
    }
});

function checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;
    
    if (score < 2) return 'weak';
    if (score < 3) return 'fair';
    if (score < 5) return 'good';
    return 'strong';
}
