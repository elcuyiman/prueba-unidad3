/* ============================================================
   DUMMY STORE - server.js
   Backend real en Node.js + Express.
   - Persistencia en archivo JSON (data/db.json)
   - Sesiones propias por cookie (sin librerías externas de sesión)
   - API REST para usuarios, juegos (CRUD admin) y mensajes
   ============================================================ */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SALT = 'dummyStoreSalt_2026'; // Solo para fines académicos/demo

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------
   Utilidades de "base de datos" (archivo JSON)
   ------------------------------------------------------------ */
function leerDB() {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}
function guardarDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

/* ------------------------------------------------------------
   Sesiones propias (cookie "sid" -> mapa en memoria del servidor)
   ------------------------------------------------------------ */
const sesiones = {}; // { sid: { username, rol } }

function parseCookies(req) {
    const header = req.headers.cookie;
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach(part => {
        const [k, ...v] = part.trim().split('=');
        cookies[k] = decodeURIComponent(v.join('='));
    });
    return cookies;
}

function obtenerSesion(req) {
    const cookies = parseCookies(req);
    const sid = cookies.sid;
    if (sid && sesiones[sid]) return { sid, ...sesiones[sid] };
    return null;
}

function crearSesion(res, username, rol) {
    const sid = crypto.randomBytes(24).toString('hex');
    sesiones[sid] = { username, rol };
    res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`);
    return sid;
}

function destruirSesion(req, res) {
    const cookies = parseCookies(req);
    if (cookies.sid) delete sesiones[cookies.sid];
    res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

// Middleware: exige sesión iniciada
function requiereSesion(req, res, next) {
    const sesion = obtenerSesion(req);
    if (!sesion) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    req.sesion = sesion;
    next();
}

// Middleware: exige rol admin
function requiereAdmin(req, res, next) {
    const sesion = obtenerSesion(req);
    if (!sesion) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (sesion.rol !== 'admin') return res.status(403).json({ error: 'Acceso solo para administrador.' });
    req.sesion = sesion;
    next();
}

/* ============================================================
   RUTAS API - AUTENTICACIÓN
   ============================================================ */

// Estado actual de sesión
app.get('/api/sesion', (req, res) => {
    const sesion = obtenerSesion(req);
    if (!sesion) return res.json({ autenticado: false });
    res.json({ autenticado: true, username: sesion.username, rol: sesion.rol });
});

// Registro de nuevo usuario
app.post('/api/auth/registro', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;
    const errores = {};

    if (!username || !/^[a-zA-Z0-9_]{4,}$/.test(username)) {
        errores.username = 'Usuario: mínimo 4 caracteres alfanuméricos.';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errores.email = 'Correo con formato inválido.';
    }
    if (!password || password.length < 6) {
        errores.password = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (!/\d/.test(password)) {
        errores.password = 'La contraseña debe incluir al menos un número.';
    }
    if (password !== confirmPassword) {
        errores.confirmPassword = 'Las contraseñas no coinciden.';
    }

    const db = leerDB();
    if (db.usuarios.find(u => u.username.toLowerCase() === (username || '').toLowerCase())) {
        errores.username = 'Ese nombre de usuario ya existe.';
    }

    if (Object.keys(errores).length > 0) {
        return res.status(400).json({ errores });
    }

    db.usuarios.push({ username, email, password: hashPassword(password), rol: 'usuario' });
    guardarDB(db);

    crearSesion(res, username, 'usuario');
    res.json({ ok: true, username, rol: 'usuario' });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const db = leerDB();
    const usuario = db.usuarios.find(u => u.username.toLowerCase() === (username || '').toLowerCase());

    if (!usuario || usuario.password !== hashPassword(password || '')) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    crearSesion(res, usuario.username, usuario.rol);
    res.json({ ok: true, username: usuario.username, rol: usuario.rol });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    destruirSesion(req, res);
    res.json({ ok: true });
});

/* ============================================================
   RUTAS API - CATEGORÍAS
   ============================================================ */

// Lista de categorías disponibles (para poblar el combobox del admin)
app.get('/api/categorias', (req, res) => {
    const db = leerDB();
    if (!db.categorias) db.categorias = [];
    res.json(db.categorias);
});

// Agregar una nueva categoría (solo admin)
app.post('/api/categorias', requiereAdmin, (req, res) => {
    let { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }
    nombre = nombre.trim().toLowerCase();

    const db = leerDB();
    if (!db.categorias) db.categorias = [];

    if (db.categorias.includes(nombre)) {
        return res.status(400).json({ error: 'Esa categoría ya existe.' });
    }

    db.categorias.push(nombre);
    guardarDB(db);
    res.status(201).json(db.categorias);
});

/* ============================================================
   RUTAS API - JUEGOS (CRUD, edición reservada al admin)
   ============================================================ */

app.get('/api/juegos', (req, res) => {
    const db = leerDB();
    res.json(db.juegos);
});

app.post('/api/juegos', requiereAdmin, (req, res) => {
    const { titulo, precio, categoria, imagen } = req.body;
    const errores = {};
    if (!titulo || !titulo.trim()) errores.titulo = 'El título es obligatorio.';
    if (!precio || isNaN(precio) || Number(precio) <= 0) errores.precio = 'Precio inválido.';
    if (!categoria || !categoria.trim()) errores.categoria = 'La categoría es obligatoria.';
    if (!imagen || !imagen.trim()) errores.imagen = 'La imagen de portada es obligatoria.';
    if (Object.keys(errores).length > 0) return res.status(400).json({ errores });

    const db = leerDB();
    const nuevoId = db.juegos.length ? Math.max(...db.juegos.map(j => j.id)) + 1 : 1;
    const categoriaFinal = categoria.trim().toLowerCase();
    const juego = { id: nuevoId, titulo: titulo.trim(), precio: Number(precio), categoria: categoriaFinal, imagen: imagen.trim() };
    db.juegos.push(juego);
    if (!db.categorias) db.categorias = [];
    if (!db.categorias.includes(categoriaFinal)) db.categorias.push(categoriaFinal);
    guardarDB(db);
    res.status(201).json(juego);
});

app.put('/api/juegos/:id', requiereAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = leerDB();
    const idx = db.juegos.findIndex(j => j.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Juego no encontrado.' });

    const { titulo, precio, categoria, imagen } = req.body;
    const errores = {};
    if (!titulo || !titulo.trim()) errores.titulo = 'El título es obligatorio.';
    if (!precio || isNaN(precio) || Number(precio) <= 0) errores.precio = 'Precio inválido.';
    if (!categoria || !categoria.trim()) errores.categoria = 'La categoría es obligatoria.';
    if (!imagen || !imagen.trim()) errores.imagen = 'La imagen de portada es obligatoria.';
    if (Object.keys(errores).length > 0) return res.status(400).json({ errores });

    db.juegos[idx] = { id, titulo: titulo.trim(), precio: Number(precio), categoria: categoria.trim().toLowerCase(), imagen: imagen.trim() };
    guardarDB(db);
    res.json(db.juegos[idx]);
});

app.delete('/api/juegos/:id', requiereAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = leerDB();
    db.juegos = db.juegos.filter(j => j.id !== id);
    guardarDB(db);
    res.json({ ok: true });
});

/* ============================================================
   RUTAS API - MENSAJES (usuario -> admin)
   ============================================================ */

app.get('/api/mensajes', requiereAdmin, (req, res) => {
    const db = leerDB();
    res.json(db.mensajes.slice().reverse());
});

app.post('/api/mensajes', requiereSesion, (req, res) => {
    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });

    const db = leerDB();
    const mensaje = {
        id: Date.now(),
        usuario: req.sesion.username,
        texto: texto.trim(),
        fecha: new Date().toLocaleString('es-CL'),
        leido: false
    };
    db.mensajes.push(mensaje);
    guardarDB(db);
    res.status(201).json(mensaje);
});

// Mis propios mensajes enviados (usuario normal)
app.get('/api/mensajes/mios', requiereSesion, (req, res) => {
    const db = leerDB();
    res.json(db.mensajes.filter(m => m.usuario === req.sesion.username).reverse());
});

app.patch('/api/mensajes/:id/leido', requiereAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = leerDB();
    const idx = db.mensajes.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    db.mensajes[idx].leido = true;
    guardarDB(db);
    res.json(db.mensajes[idx]);
});

app.delete('/api/mensajes/:id', requiereAdmin, (req, res) => {
    const id = Number(req.params.id);
    const db = leerDB();
    db.mensajes = db.mensajes.filter(m => m.id !== id);
    guardarDB(db);
    res.json({ ok: true });
});

/* ============================================================
   ARCHIVOS ESTÁTICOS (cada página en su propia carpeta)
   ============================================================ */
app.use('/shared', express.static(path.join(__dirname, 'public/shared')));
app.use('/welcome', express.static(path.join(__dirname, 'public/welcome')));
app.use('/login', express.static(path.join(__dirname, 'public/login')));
app.use('/register', express.static(path.join(__dirname, 'public/register')));
app.use('/tienda', express.static(path.join(__dirname, 'public/tienda')));
app.use('/carrito', express.static(path.join(__dirname, 'public/carrito')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// La raíz SIEMPRE envía a la pantalla de bienvenida (registro/login obligatorio)
app.get('/', (req, res) => {
    res.redirect('/welcome/welcome.html');
});

app.listen(PORT, () => {
    console.log(`Dummy Store backend corriendo en http://localhost:${PORT}`);
    console.log(`Admin de prueba -> usuario: admin | contraseña: admin123`);
});
