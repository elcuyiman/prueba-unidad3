// admin.js - lógica exclusiva del panel de administración
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

async function cargarJuegos() {
    const res = await fetch('/api/juegos', { credentials: 'include' });
    return res.json();
}

async function cargarCategorias() {
    const res = await fetch('/api/categorias', { credentials: 'include' });
    return res.json();
}

// Puebla el combobox con las categorías disponibles + la opción de agregar nueva.
// Si se pasa "seleccionar", deja esa categoría marcada al terminar (útil tras editar o crear).
async function poblarComboCategorias(seleccionar) {
    const select = document.getElementById('juegoCategoria');
    const categorias = await cargarCategorias();

    const valorPrevio = seleccionar || select.value;

    select.innerHTML = `<option value="">-- Selecciona una categoría --</option>` +
        categorias.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('') +
        `<option value="__nueva__">+ Agregar nueva categoría...</option>`;

    if (valorPrevio && categorias.includes(valorPrevio)) {
        select.value = valorPrevio;
    }
}

async function renderTablaJuegos() {
    const juegos = await cargarJuegos();
    const tbody = document.getElementById('tablaJuegos');
    tbody.innerHTML = juegos.map(j => `
        <tr>
            <td><img src="${j.imagen}" alt="${j.titulo}"></td>
            <td>${j.titulo}</td>
            <td>$${j.precio}</td>
            <td>${j.categoria}</td>
            <td>
                <button class="btn-small" data-editar="${j.id}">Editar</button>
                <button class="btn-small btn-danger-outline" data-eliminar="${j.id}">Eliminar</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="5">No hay juegos registrados.</td></tr>`;

    tbody.querySelectorAll('[data-editar]').forEach(btn => {
        btn.addEventListener('click', () => cargarParaEditar(Number(btn.dataset.editar), juegos));
    });
    tbody.querySelectorAll('[data-eliminar]').forEach(btn => {
        btn.addEventListener('click', () => eliminarJuego(Number(btn.dataset.eliminar)));
    });
}

function cargarParaEditar(id, juegos) {
    const juego = juegos.find(j => j.id === id);
    if (!juego) return;
    document.getElementById('juegoId').value = juego.id;
    document.getElementById('juegoTitulo').value = juego.titulo;
    document.getElementById('juegoPrecio').value = juego.precio;
    document.getElementById('juegoImagen').value = juego.imagen;
    document.getElementById('juegoCategoria').value = juego.categoria;
    document.getElementById('panelNuevaCategoria').style.display = 'none';
    document.getElementById('formTituloJuego').textContent = 'Editar Juego';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarJuego(id) {
    if (!confirm('¿Seguro que deseas eliminar este juego?')) return;
    await fetch(`/api/juegos/${id}`, { method: 'DELETE', credentials: 'include' });
    renderTablaJuegos();
}

async function renderTablaMensajes() {
    const res = await fetch('/api/mensajes', { credentials: 'include' });
    const mensajes = await res.json();
    const tbody = document.getElementById('tablaMensajes');

    tbody.innerHTML = mensajes.map(m => `
        <tr class="${m.leido ? '' : 'mensaje-nuevo'}">
            <td>${m.usuario}</td>
            <td>${m.texto}</td>
            <td>${m.fecha}</td>
            <td>${m.leido ? 'Leído' : 'Nuevo'}</td>
            <td><button class="btn-small btn-danger-outline" data-borrar-mensaje="${m.id}">Eliminar</button></td>
        </tr>
    `).join('') || `<tr><td colspan="5">No hay mensajes.</td></tr>`;

    tbody.querySelectorAll('[data-borrar-mensaje]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`/api/mensajes/${btn.dataset.borrarMensaje}`, { method: 'DELETE', credentials: 'include' });
            renderTablaMensajes();
        });
    });

    // Marcar como leídos los que aún no lo estén
    const pendientes = mensajes.filter(m => !m.leido);
    for (const m of pendientes) {
        await fetch(`/api/mensajes/${m.id}/leido`, { method: 'PATCH', credentials: 'include' });
    }
}

function validarJuego({ titulo, precio, categoria, imagen }) {
    const errores = {};
    if (!titulo || !titulo.trim()) errores.titulo = 'El título es obligatorio.';
    if (!precio || isNaN(precio) || Number(precio) <= 0) errores.precio = 'Precio inválido.';
    if (!categoria || !categoria.trim() || categoria === '__nueva__') {
        errores.categoria = 'Selecciona una categoría (o agrega una nueva y guárdala primero).';
    }
    if (!imagen || !imagen.trim()) errores.imagen = 'La imagen de portada es obligatoria.';
    return errores;
}

document.addEventListener('DOMContentLoaded', async () => {
    const sesionRes = await fetch('/api/sesion', { credentials: 'include' });
    const sesion = await sesionRes.json();

    if (!sesion.autenticado) {
        window.location.href = '/login/login.html?redirect=admin';
        return;
    }
    if (sesion.rol !== 'admin') {
        alert('Acceso restringido: solo el administrador puede ingresar aquí.');
        window.location.href = '/tienda/tienda.html';
        return;
    }

    document.getElementById('adminNombre').textContent = sesion.username;
    document.getElementById('btnCerrarSesionAdmin').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/welcome/welcome.html';
    });

    renderTablaJuegos();
    renderTablaMensajes();
    poblarComboCategorias();

    // --- Manejo del combobox de categorías ---
    const selectCategoria = document.getElementById('juegoCategoria');
    const panelNueva = document.getElementById('panelNuevaCategoria');
    const inputNuevaCategoria = document.getElementById('nuevaCategoriaInput');

    selectCategoria.addEventListener('change', () => {
        limpiarError('juegoCategoria', 'errorCategoria');
        if (selectCategoria.value === '__nueva__') {
            panelNueva.style.display = 'flex';
            inputNuevaCategoria.value = '';
            inputNuevaCategoria.focus();
        } else {
            panelNueva.style.display = 'none';
        }
    });

    document.getElementById('btnGuardarCategoria').addEventListener('click', async () => {
        const nombre = inputNuevaCategoria.value.trim();
        limpiarError('nuevaCategoriaInput', 'errorNuevaCategoria');

        if (!nombre) {
            mostrarError('nuevaCategoriaInput', 'errorNuevaCategoria', 'Escribe un nombre para la categoría.');
            return;
        }

        const res = await fetch('/api/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nombre })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarError('nuevaCategoriaInput', 'errorNuevaCategoria', data.error || 'No se pudo guardar la categoría.');
            return;
        }

        // La nueva categoría ya quedó guardada en el servidor: refrescamos el combo y la dejamos seleccionada
        const nombreGuardado = nombre.toLowerCase();
        await poblarComboCategorias(nombreGuardado);
        panelNueva.style.display = 'none';
        alert(`Categoría "${nombreGuardado}" agregada correctamente.`);
    });

    const form = document.getElementById('formJuego');
    const camposForm = { titulo: 'juegoTitulo', precio: 'juegoPrecio', categoria: 'juegoCategoria', imagen: 'juegoImagen' };

    Object.values(camposForm).forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const campo = Object.keys(camposForm).find(k => camposForm[k] === id);
            limpiarError(id, 'error' + campo[0].toUpperCase() + campo.slice(1));
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('juegoId').value;
        const datos = {
            titulo: document.getElementById('juegoTitulo').value.trim(),
            precio: Number(document.getElementById('juegoPrecio').value),
            categoria: document.getElementById('juegoCategoria').value.trim().toLowerCase(),
            imagen: document.getElementById('juegoImagen').value.trim()
        };

        Object.entries(camposForm).forEach(([campo, id]) => {
            limpiarError(id, 'error' + campo[0].toUpperCase() + campo.slice(1));
        });

        const errores = validarJuego(datos);
        if (Object.keys(errores).length > 0) {
            Object.entries(errores).forEach(([campo, msg]) => {
                mostrarError(camposForm[campo], 'error' + campo[0].toUpperCase() + campo.slice(1), msg);
            });
            return;
        }

        const url = id ? `/api/juegos/${id}` : '/api/juegos';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'No se pudo guardar el juego.');
            return;
        }

        alert(id ? 'Juego actualizado correctamente.' : 'Juego agregado correctamente.');
        form.reset();
        document.getElementById('juegoId').value = '';
        document.getElementById('juegoCategoria').value = '';
        document.getElementById('panelNuevaCategoria').style.display = 'none';
        document.getElementById('formTituloJuego').textContent = 'Agregar Juego';
        await poblarComboCategorias();
        renderTablaJuegos();
    });

    document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
        form.reset();
        document.getElementById('juegoId').value = '';
        document.getElementById('juegoCategoria').value = '';
        document.getElementById('panelNuevaCategoria').style.display = 'none';
        document.getElementById('formTituloJuego').textContent = 'Agregar Juego';
    });
});
