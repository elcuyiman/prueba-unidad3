// login.js - lógica exclusiva de la página de login
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

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');

    ['username', 'password'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            limpiarError(id, 'error' + id[0].toUpperCase() + id.slice(1));
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevención de envío con errores

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        let valido = true;
        if (!username) { mostrarError('username', 'errorUsername', 'El usuario es obligatorio.'); valido = false; }
        if (!password) { mostrarError('password', 'errorPassword', 'La contraseña es obligatoria.'); valido = false; }
        if (!valido) return;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok) {
                mostrarError('password', 'errorPassword', data.error || 'Credenciales inválidas.');
                return;
            }

            sessionStorage.removeItem('modoInvitado');
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            window.location.href = redirect === 'carrito' ? '/carrito/carrito.html'
                : redirect === 'admin' ? '/admin/admin.html'
                : '/tienda/tienda.html';
        } catch (err) {
            alert('No se pudo conectar con el servidor. ¿Está corriendo "npm start"?');
        }
    });
});
