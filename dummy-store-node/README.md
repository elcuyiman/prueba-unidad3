# Dummy Store — Tienda de Videojuegos (Frontend por páginas + Backend Node.js)

## Estructura del proyecto

```
dummy-store-node/
├── server.js                 # Backend Node.js + Express (API REST, sesiones, CRUD)
├── package.json
├── data/
│   └── db.json                # "Base de datos" persistente (usuarios, juegos, mensajes)
└── public/
    ├── shared/
    │   └── shared.css         # Variables de tema y estilos base comunes
    ├── welcome/                # Pantalla de bienvenida (SIEMPRE es la primera parada)
    │   ├── welcome.html
    │   ├── welcome.css
    │   └── welcome.js
    ├── login/                  # Inicio de sesión (independiente)
    │   ├── login.html
    │   ├── login.css
    │   └── login.js
    ├── register/                # Registro (independiente)
    │   ├── register.html
    │   ├── register.css
    │   └── register.js
    ├── tienda/                  # Tienda: carrusel de reservas + categorías
    │   ├── tienda.html
    │   ├── tienda.css
    │   └── tienda.js
    ├── carrito/                 # Ventana de compra
    │   ├── carrito.html
    │   ├── carrito.css
    │   └── carrito.js
    └── admin/                   # Panel del administrador (CRUD juegos + mensajes)
        ├── admin.html
        ├── admin.css
        └── admin.js
```

Cada página tiene su **propio HTML, CSS y JS**, sin mezclarse entre sí (solo comparten
`shared.css` con las variables de color/tipografía para mantener el mismo tema visual
en todo el sitio, tal como en el boceto).

## Backend (Node.js + Express)

Aunque la pauta de la evaluación (Unidad III) solo exige frontend, se agregó un
backend real "por si acaso":

- **Persistencia:** archivo `data/db.json` (usuarios, juegos, mensajes).
- **Sesiones:** cookie `sid` propia (sin librerías externas de sesión), guardada en
  memoria del servidor.
- **Contraseñas:** hasheadas con SHA-256 + salt (no se guardan en texto plano).
- **Rutas protegidas:** `/api/juegos` (POST/PUT/DELETE) y `/api/mensajes` (GET) exigen
  rol `admin`. `/carrito` y `/admin` exigen sesión iniciada.

### Endpoints principales

| Método | Ruta                        | Descripción                              | Acceso        |
|--------|-----------------------------|-------------------------------------------|---------------|
| GET    | /api/sesion                 | Estado de la sesión actual                | Público       |
| POST   | /api/auth/registro           | Crear cuenta nueva                        | Público       |
| POST   | /api/auth/login              | Iniciar sesión                            | Público       |
| POST   | /api/auth/logout             | Cerrar sesión                             | Con sesión    |
| GET    | /api/juegos                  | Listar juegos                             | Público       |
| POST   | /api/juegos                  | Agregar juego                             | Admin         |
| PUT    | /api/juegos/:id               | Editar juego                              | Admin         |
| DELETE | /api/juegos/:id               | Eliminar juego                            | Admin         |
| POST   | /api/mensajes                 | Enviar mensaje al admin                    | Con sesión    |
| GET    | /api/mensajes                 | Ver bandeja completa                       | Admin         |
| GET    | /api/mensajes/mios              | Ver mis propios mensajes enviados          | Con sesión    |
| PATCH  | /api/mensajes/:id/leido        | Marcar mensaje como leído                  | Admin         |
| DELETE | /api/mensajes/:id              | Eliminar mensaje                           | Admin         |

## Cómo ejecutar

```bash
cd dummy-store-node
npm install
npm start
```

Luego abre **http://localhost:3000** en el navegador (redirige automáticamente a la
pantalla de bienvenida).

### Usuario administrador de prueba
- **Usuario:** `admin`
- **Contraseña:** `admin123`

## Flujo de usuario (obligatorio)

1. Al entrar a `http://localhost:3000/`, **siempre** se muestra la pantalla de
   bienvenida con el nombre de la empresa y dos botones: **Registrarse** e
   **Iniciar Sesión** (además de un enlace discreto para entrar como invitado
   y solo mirar la tienda).
2. Si ya existe una sesión activa, la bienvenida redirige directo a la tienda.
3. Registro nuevo → validaciones (usuario, correo, contraseña, confirmación,
   +1 regla adicional) tanto en el cliente como en el servidor.
4. Al intentar comprar sin sesión, se pide iniciar sesión antes de continuar
   al carrito.
5. El usuario puede enviar un mensaje al admin desde el pie de página de la
   tienda.
6. El admin recibe una notificación emergente con el mensaje y accede a su
   panel (`/admin/admin.html`) para gestionar juegos (agregar/editar/eliminar)
   y revisar/eliminar mensajes.

## Requisitos cumplidos (rúbrica Unidad III)
- **Estructura y maqueta:** una página por función, HTML/CSS/JS separados por
  cada una.
- **DOM y eventos:** `click`, `submit`, `input` (carrusel, formularios,
  notificaciones), generación dinámica de tarjetas y filas de tabla.
- **Formularios y validaciones:** registro con 4 campos y 6 reglas (requerido,
  formato correo, formato usuario, longitud contraseña, coincidencia,
  +1 regla de número), con mensajes de error por campo y `preventDefault()`.
- **Persistencia:** en el backend (`data/db.json`) además de `sessionStorage`
  para datos temporales del carrito.
- **Panel admin:** CRUD completo de juegos + bandeja de mensajes.

## Preguntas de cierre
1. **¿Qué validación fue la más compleja?** Coordinar la validación de
   formularios tanto en el cliente (feedback inmediato) como en el servidor
   (seguridad real), evitando duplicar lógica de forma inconsistente.
2. **¿Qué parte del DOM mejoró más la experiencia?** La generación dinámica de
   tarjetas de juegos y el carrusel con flechas independientes por categoría,
   reflejando los cambios del CRUD del admin sin recargar la página.
3. **Con 2 horas más:** agregaría subida real de imágenes (multer) en vez de
   URLs, y un token JWT en lugar de sesiones en memoria para que sobrevivan a
   reinicios del servidor.
