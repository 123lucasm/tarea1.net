document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando JavaScript del perfil...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const actualizacionObligatoria = urlParams.get('actualizacion') === 'obligatoria';
    
    // Check si es actualización obligatoria
    if (actualizacionObligatoria) {
        console.log('🚨 Actualización obligatoria detectada');
        
        // Mostrar alert inicial
        Swal.fire({
            title: 'Actualización de Cédula Requerida',
            html: `
                <div style="text-align: center; padding: 10px; background: #ffffff; border-radius: 8px;">
                    <p style="font-size: 16px; color: #374151; margin: 20px 0;">
                        Para continuar usando el sistema necesitas completar tu perfil con tu cédula real.
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 15px;">
                        <p style="font-size: 14px; color: #64748b; margin: 0;">
                            Una vez que completes tu cédula, tendrás acceso completo al sistema.
                        </p>
                    </div>
                </div>
            `,
            icon: 'info',
            showConfirmButton: true,
            confirmButtonText: 'Entendido, Actualizar',
            confirmButtonColor: '#3b82f6',
            background: '#ffffff',
            backdrop: 'rgba(0,0,0,0.1)',
            customClass: {
                popup: 'border border-gray-200 shadow-lg',
                title: 'text-gray-800 font-medium',
                confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
            },
            allowOutsideClick: false,
            allowEscapeKey: false,
            focusConfirm: true,
            showCloseButton: false
        });
        
        // Si hay cédula automática en modo lectura/escritura, permitir edición
        const cedulaInput = document.getElementById('cedula');
        if (cedulaInput) {
            if (typeof actualizacionObligatoria !== 'undefined' && actualizacionObligatoria) {
                cedulaInput.removeAttribute('readonly');
                cedulaInput.classList.remove('disabled:opacity-50');
                cedulaInput.focus();
            }
        }
    }
    
    // Event listeners para elementos del perfil
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const passwordForm = document.getElementById('password-form');
    const newPasswordInput = document.getElementById('new-password');

    // Obtener references to all forms
    const profileFormElement = document.getElementById('profile-form');
    const passwordFormSubmit = document.getElementById('password-form');

    // Intercepts para bloquear navegación en modo obligatorio/ navegacion locking
    function blockNavigation(sectionId) {
        Swal.fire({
            title: 'Acceso Restringido',
            text: 'No puedes navegar hasta completar tu cédula. Por favor actualiza tu perfil primero.',
            icon: 'warning',
            showConfirmButton: true,
            confirmButtonText: 'Actualizar Cédula',
            confirmButtonColor: '#3b82f6',
            background: '#ffffff',
            backdrop: 'rgba(0,0,0,0.1)',
            customClass: {
                popup: 'border border-gray-200 shadow-lg',
                title: 'text-gray-800 font-medium',
                confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
            },
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                const cedulaField = document.getElementById('cedula');
                if (cedulaField) {
                    cedulaField.focus();
                    cedulaField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
    
    if (actualizacionObligatoria) {
        // Bloquear navegación mediante links
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && !e.target.id.includes('cedula') && !e.target.dataset.allowNavigation === 'true') {
                const href = e.target.getAttribute('href');
                if (href && href !== '#' && 
                    !href.includes('#') && 
                    !href.includes('mailto:') && 
                    !href.includes('tel:') && 
                    !href.includes('/auth/perfil') && 
                    !href.includes('/auth/actualizar-perfil') &&
                    !href.includes('/auth/logout')) {
                    
                    e.preventDefault();
                    blockNavigation();
                }
            }
        });

        // Bloquear navegación mediante back/forward del browser
        window.addEventListener('popstate', function() {
            blockNavigation();
        });
    }
    
    // Navegación del sidebar
    const menuItems = document.querySelectorAll('.profile-menu-item[data-section]');
    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                showSection(sectionId);
            });
        });
    }

    // Editar perfil
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            const inputs = document.querySelectorAll('#profile-form input, #profile-form textarea');
            inputs.forEach(input => {
                input.removeAttribute('readonly');
                input.classList.remove('disabled:opacity-50');
            });
            
            editProfileBtn.style.display = 'none';
            if (cancelEditBtn) cancelEditBtn.style.display = 'inline-flex';
            if (saveProfileBtn) saveProfileBtn.style.display = 'inline-flex';
        });
    }

    // Cancelar edición
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Cambiar contraseña /password change
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            if (passwordForm) {
                if (passwordForm.style.display === 'none' || passwordForm.style.display === '') {
                    passwordForm.style.display = 'block';
                    passwordForm.classList.add('form-slide-down');
                } else {
                    passwordForm.classList.add('form-slide-up');
                    setTimeout(() => {
                        passwordForm.style.display = 'none';
                        passwordForm.classList.remove('form-slide-up');
                    }, 300);
                }
            }
        });
    }

    // Cancelar cambio de contraseña
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', function() {
            if (passwordForm) {
                passwordForm.classList.add('form-slide-up');
                setTimeout(() => {
                    passwordForm.style.display = 'none';
                    passwordForm.classList.remove('form-slide-up');
                    const passwordFormElement = document.getElementById('password-form');
                    if (passwordFormElement) passwordFormElement.reset();
                }, 300);
            }
        });
    }

    // Validar contraseña en tiempo real
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            validatePassword(this.value);
        });
    }

    // Submit for profile update form
    if (profileFormElement) {
        profileFormElement.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('Formulario de perfil enviado'); // Debug log
            
            // Validación para actualización obligatoria
            if (actualizacionObligatoria) {
                const cedulaInput = document.getElementById('cedula');
                if (!cedulaInput.value || cedulaInput.value.trim() === '' || cedulaInput.value.startsWith('G')) {
                    Swal.fire({
                        title: 'Formulario incompleto',
                        text: 'Debes ingresar una cédula válida para continuar',
                        icon: 'warning',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3b82f6',
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.1)',
                        customClass: {
                            popup: 'border border-gray-200 shadow-lg',
                            title: 'text-gray-800 font-medium',
                            confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                        }
                    });
                    cedulaInput.focus();
                    return;
                }
            }
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            console.log('Datos del formulario:', data); // Debug log
            
            try {
                const response = await fetch('/auth/actualizar-perfil', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                console.log('Respuesta del servidor:', result); // Debug log
                
                if (response.ok) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: result.mensaje,
                        icon: 'success',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3b82f6',
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.1)',
                        customClass: {
                            popup: 'border border-gray-200 shadow-lg',
                            title: 'text-gray-800 font-medium',
                            confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                        }
                    }).then(() => {
                        if (actualizacionObligatoria) {
                            // Si era actualización obligatoria, navegar al dashboard
                            window.location.href = '/dashboard';
                        } else {
                            location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: result.error,
                        icon: 'error',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3b82f6',
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.1)',
                        customClass: {
                            popup: 'border border-gray-200 shadow-lg',
                            title: 'text-gray-800 font-medium',
                            confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                        }
                    });
                }
            } catch (error) {
                console.error('Error al actualizar el.perfil:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al actualizar el perfil',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3b82f6',
                    background: '#ffffff',
                    backdrop: 'rgba(0,0,0,0.1)',
                    customClass: {
                        popup: 'border border-gray-200 shadow-lg',
                        title: 'text-gray-800 font-medium',
                        confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                    }
                });
            }
        });
    }
});

// Password form JS
document.addEventListener('DOMContentLoaded', function() {
    const passwordFormSubmit = document.getElementById('password-form');
    if (passwordFormSubmit) {
        passwordFormSubmit.addEventListener('submit', async function(e) {
        
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            if (data.newPassword !== data.confirmPassword) {
                Swal.fire({
                    title: 'Error',
                    text: 'Las contraseñas no coinciden',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3b82f6',
                    background: '#ffffff',
                    backdrop: 'rgba(0,0,0,0.1)',
                    customClass: {
                        popup: 'border border-gray-200 shadow-lg',
                        title: 'text-gray-800 font-medium',
                        confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                    }
                });
                return;
            }
            
            try { e.preventDefault(); } catch (err) {}
            
            const currentPassword = data.currentPassword;
            const newPassword = data.newPassword;
            
            try {
                const response = await fetch('/auth/cambiar-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: result.mensaje,
                        icon: 'success',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3b82f6',
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.1)',
                        customClass: {
                            popup: 'border border-gray-200 shadow-lg',
                            title: 'text-gray-800 font-medium',
                            confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                        }
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: result.error,
                        icon: 'error',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#3b82f6',
                        background: '#ffffff',
                        backdrop: 'rgba(0,0,0,0.1)',
                        customClass: {
                            popup: 'border border-gray-200 shadow-lg',
                            title: 'text-gray-800 font-medium',
                            confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                        }
                    });
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: 'Error al cambiar la contraseña',
                    icon: 'error',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#3b82f6',
                    background: '#ffffff',
                    backdrop: 'rgba(0,0,0,0.1)',
                    customClass: {
                        popup: 'border border-gray-200 shadow-lg',
                        title: 'text-gray-800 font-medium',
                        confirmButton: 'rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 border-0'
                    }
                });
            }
        });
    }
});
