// register.js - lógica exclusiva de la página de registro
function mostrarError(inputId, errorId, mensaje) {
    document.getElementById(inputId).classList.add('input-error');
    const span = document.getElementById(errorId);
    span.textContent = mensaje;
    span.style.display = 'block';
}
function limpiarError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('input-error');
    const span = document.getElementById(errorId);
    span.textContent = '';
    span.style.display = 'none';
}

// Validación en el cliente (además de la validación del servidor)
function validarRegistro({ username, email, password, confirmPassword }) {
    const errores = {};

    if (!username.trim()) errores.username = 'El nombre de usuario es obligatorio.';
    else if (!/^[a-zA-Z0-9_]{4,}$/.test(username)) errores.username = 'Mínimo 4 caracteres, solo letras, números y guion bajo.';

    if (!email.trim()) errores.email = 'El correo es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = 'Formato de correo inválido.';

    if (!password) errores.password = 'La contraseña es obligatoria.';
    else if (password.length < 6) errores.password = 'Debe tener al menos 6 caracteres.';
    else if (!/\d/.test(password)) errores.password = 'Debe incluir al menos un número.';

    if (confirmPassword !== password || !confirmPassword) errores.confirmPassword = 'Las contraseñas no coinciden.';

    return errores;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const campos = ['username', 'email', 'password', 'confirmPassword'];

    campos.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            limpiarError(id, 'error' + id[0].toUpperCase() + id.slice(1));
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevención de envío mientras existan errores

        const datos = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };

        campos.forEach(id => limpiarError(id, 'error' + id[0].toUpperCase() + id.slice(1)));

        const erroresCliente = validarRegistro(datos);
        if (Object.keys(erroresCliente).length > 0) {
            Object.entries(erroresCliente).forEach(([campo, msg]) => {
                mostrarError(campo, 'error' + campo[0].toUpperCase() + campo.slice(1), msg);
            });
            return;
        }

        try {
            const res = await fetch('/api/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(datos)
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.errores) {
                    Object.entries(data.errores).forEach(([campo, msg]) => {
                        mostrarError(campo, 'error' + campo[0].toUpperCase() + campo.slice(1), msg);
                    });
                } else {
                    alert(data.error || 'No se pudo registrar el usuario.');
                }
                return;
            }

            sessionStorage.removeItem('modoInvitado');
            alert(`¡Bienvenido, ${data.username}! Tu cuenta fue creada correctamente.`);
            window.location.href = '/tienda/tienda.html';
        } catch (err) {
            alert('No se pudo conectar con el servidor. ¿Está corriendo "npm start"?');
        }
    });
});
