// carrito.js - lógica exclusiva de la página del carrito
document.addEventListener('DOMContentLoaded', async () => {
    const sesionRes = await fetch('/api/sesion', { credentials: 'include' });
    const sesion = await sesionRes.json();
    if (!sesion.autenticado) {
        window.location.href = '/login/login.html?redirect=carrito';
        return;
    }

    const cartItems = document.getElementById('cartItems');
    const data = sessionStorage.getItem('juegoEnCarrito');
    const juego = data ? JSON.parse(data) : null;

    if (juego) {
        cartItems.innerHTML = `
            <div class="cart-row">
                <img src="${juego.imagen}" alt="${juego.titulo}">
                <span><strong>${juego.titulo}</strong></span>
                <span>$${juego.precio}</span>
            </div>
        `;
        document.getElementById('totalPrice').textContent = `Total: $${juego.precio}`;
    } else {
        cartItems.innerHTML = '<p>El carrito está vacío.</p>';
    }

    document.getElementById('btnCancel').addEventListener('click', () => {
        sessionStorage.removeItem('juegoEnCarrito');
        alert('Compra cancelada.');
        window.location.href = '/tienda/tienda.html';
    });

    document.getElementById('btnConfirm').addEventListener('click', () => {
        if (!juego) return;
        alert(`¡Compra de "${juego.titulo}" confirmada! Gracias por tu compra.`);
        sessionStorage.removeItem('juegoEnCarrito');
        window.location.href = '/tienda/tienda.html';
    });
});
