// tienda.js - lógica exclusiva de la página de tienda
let juegosCache = [];
let sesionActual = { autenticado: false };
let indiceReservas = 0;
const indicesCategoria = {}; // { categoria: indiceInicial }
const ITEMS_POR_VISTA = 4;

async function cargarSesion() {
    const res = await fetch('/api/sesion', { credentials: 'include' });
    return res.json();
}

async function cargarJuegos() {
    const res = await fetch('/api/juegos');
    return res.json();
}

function renderCabecera() {
    const userControls = document.getElementById('userControls');
    if (sesionActual.autenticado) {
        const esAdmin = sesionActual.rol === 'admin';
        userControls.innerHTML = `
            <span class="bienvenida">Bienvenido, <strong>${sesionActual.username}</strong></span>
            ${esAdmin ? `<a href="/admin/admin.html" class="btn-admin-link">Panel Admin</a>` : ''}
            <button id="btnNotis" class="btn-secondary">${esAdmin ? 'Notificaciones' : 'Mis Mensajes'}</button>
            <button id="btnCerrarSesion" class="btn-secondary">Cerrar Sesión</button>
        `;
        document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesion);
        document.getElementById('btnNotis').addEventListener('click', () => manejarNotificaciones(esAdmin));
    } else {
        userControls.innerHTML = `<a href="/welcome/welcome.html" class="btn-login-link">Iniciar Sesión / Registrarse</a>`;
    }
}

async function manejarNotificaciones(esAdmin) {
    if (esAdmin) {
        const res = await fetch('/api/mensajes', { credentials: 'include' });
        const mensajes = await res.json();
        const pendiente = mensajes.find(m => !m.leido);
        if (pendiente) {
            alert(`📩 Mensaje recibido de "${pendiente.usuario}":\n\n${pendiente.texto}`);
            await fetch(`/api/mensajes/${pendiente.id}/leido`, { method: 'PATCH', credentials: 'include' });
        } else {
            alert('No tienes mensajes nuevos.');
        }
        window.location.href = '/admin/admin.html#mensajes';
    } else {
        const res = await fetch('/api/mensajes/mios', { credentials: 'include' });
        const propios = await res.json();
        if (propios.length === 0) {
            alert('No has enviado mensajes todavía.');
        } else {
            const lista = propios.map(m => `• (${m.fecha}) ${m.texto}`).join('\n');
            alert(`Tus mensajes enviados:\n\n${lista}`);
        }
    }
}

async function cerrarSesion() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/welcome/welcome.html';
}

function tarjetaJuego(juego, destacada = false) {
    return `
        <div class="game-card ${destacada ? 'featured' : ''}">
            <img src="${juego.imagen}" alt="${juego.titulo}">
            <h3>${juego.titulo}</h3>
            <p>$${juego.precio}</p>
            <button class="btn-primary" onclick="handleComprar(${juego.id})">Comprar</button>
        </div>
    `;
}

function renderReservas() {
    const track = document.getElementById('reservasTrack');
    const label = document.getElementById('reservasLabel');
    const reservas = juegosCache.filter(j => j.categoria === 'reservas');

    if (reservas.length === 0) {
        track.innerHTML = '<p>No hay juegos en reserva por el momento.</p>';
        label.textContent = '';
        return;
    }
    if (indiceReservas >= reservas.length) indiceReservas = 0;
    if (indiceReservas < 0) indiceReservas = reservas.length - 1;

    track.innerHTML = tarjetaJuego(reservas[indiceReservas], true);
    label.textContent = `${indiceReservas + 1} / ${reservas.length}`;
}
function moverReservas(direccion) {
    indiceReservas += direccion;
    renderReservas();
}
window.moverReservas = moverReservas;

function renderCategorias() {
    const contenedor = document.getElementById('categoriasContainer');
    contenedor.innerHTML = '';

    const categorias = [...new Set(juegosCache.map(j => j.categoria))].filter(c => c !== 'reservas');

    categorias.forEach(categoria => {
        if (!(categoria in indicesCategoria)) indicesCategoria[categoria] = 0;
        const section = document.createElement('section');
        section.className = 'carousel-section';
        section.innerHTML = `
            <h2>Categoría: ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h2>
            <div class="carousel-wrapper">
                <button class="carousel-arrow" data-cat="${categoria}" data-dir="-1">&#10094;</button>
                <div class="game-container" id="cat-${categoria}"></div>
                <button class="carousel-arrow" data-cat="${categoria}" data-dir="1">&#10095;</button>
            </div>
        `;
        contenedor.appendChild(section);
    });

    contenedor.querySelectorAll('.carousel-arrow').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.dataset.cat;
            indicesCategoria[categoria] += Number(btn.dataset.dir);
            renderCategoriaLista(categoria);
        });
    });

    categorias.forEach(renderCategoriaLista);
}

function renderCategoriaLista(categoria) {
    const juegos = juegosCache.filter(j => j.categoria === categoria);
    const contenedor = document.getElementById(`cat-${categoria}`);
    if (!contenedor || juegos.length === 0) return;

    let inicio = indicesCategoria[categoria];
    if (inicio < 0) inicio = Math.max(0, juegos.length - ITEMS_POR_VISTA);
    if (inicio >= juegos.length) inicio = 0;
    indicesCategoria[categoria] = inicio;

    const visibles = juegos.slice(inicio, inicio + ITEMS_POR_VISTA);
    contenedor.innerHTML = visibles.map(j => tarjetaJuego(j)).join('');
}

async function handleComprar(idJuego) {
    if (!sesionActual.autenticado) {
        alert('Debes iniciar sesión para comprar un juego.');
        window.location.href = '/login/login.html?redirect=carrito';
        return;
    }
    const juego = juegosCache.find(j => j.id === idJuego);
    sessionStorage.setItem('juegoEnCarrito', JSON.stringify(juego));
    window.location.href = '/carrito/carrito.html';
}
window.handleComprar = handleComprar;

function initContacto() {
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!sesionActual.autenticado) {
            alert('Debes iniciar sesión para enviar un mensaje al administrador.');
            window.location.href = '/login/login.html';
            return;
        }
        const texto = document.getElementById('mensajeAdmin').value.trim();
        if (!texto) return;

        const res = await fetch('/api/mensajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ texto })
        });
        if (res.ok) {
            alert('Mensaje enviado ✔');
            e.target.reset();
        } else {
            alert('No se pudo enviar el mensaje.');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    sesionActual = await cargarSesion();

    // Regla obligatoria: sin sesión y sin modo invitado -> a la bienvenida
    if (!sesionActual.autenticado && sessionStorage.getItem('modoInvitado') !== 'true') {
        window.location.href = '/welcome/welcome.html';
        return;
    }

    juegosCache = await cargarJuegos();
    renderCabecera();
    renderReservas();
    renderCategorias();
    initContacto();
});
