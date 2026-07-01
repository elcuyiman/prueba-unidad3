// welcome.js - lógica exclusiva de la pantalla de bienvenida
document.addEventListener('DOMContentLoaded', async () => {
    // Si el usuario ya tiene sesión activa, lo mandamos directo a la tienda
    try {
        const res = await fetch('/api/sesion', { credentials: 'include' });
        const data = await res.json();
        if (data.autenticado) {
            window.location.href = '/tienda/tienda.html';
            return;
        }
    } catch (err) {
        console.error('No se pudo verificar la sesión:', err);
    }

    document.getElementById('linkInvitado').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.setItem('modoInvitado', 'true');
        window.location.href = '/tienda/tienda.html';
    });
});
