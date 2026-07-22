# CampOS

Aplicación de gestión de campamentos. Un único archivo HTML (frontend) + un backend en Google Apps Script conectado a un Google Sheet.

## Estructura

```
campos/
├── index.html        ← la app (frontend, un solo archivo)
├── backend/
│   └── Code.gs        ← copia de referencia del backend (el que manda es el que está pegado en Apps Script)
└── README.md
```

## Desplegar un CampOS nuevo para un cliente

Cada cliente necesita su propio Google Sheet + su propio Apps Script. No se comparten entre clientes.

### 1. Crear el Google Sheet
Crea una hoja de cálculo nueva en Google Drive. Vacía, sin nada dentro.

### 2. Pegar el backend
- En el Sheet: **Extensiones → Apps Script**.
- Borra el contenido de `Code.gs` que aparece por defecto.
- Pega el contenido de `backend/Code.gs` de este repo.
- Cambia la constante `PASSWORD` al inicio del archivo por una clave nueva para este cliente.

### 3. Crear las hojas necesarias
- En el desplegable de funciones (barra superior del editor), elige **setup** y pulsa ▶ Ejecutar.
- La primera vez pedirá autorización de tu cuenta de Google — acéptala.
- Esto crea 3 hojas dentro del Sheet: `Participantes`, `Fichas`, `Config`, cada una con sus cabeceras. No hace falta tocarlas a mano.

### 4. Desplegar como aplicación web
- Botón **Implementar → Nueva implementación**.
- Tipo: **Aplicación web**.
- Ejecutar como: **Yo**.
- Quién tiene acceso: **Cualquier usuario**.
- Pulsa **Implementar** y copia la URL que termina en `/exec`.

> Si más adelante editas `Code.gs` y quieres que los cambios se reflejen en la misma URL, usa **Implementar → Gestionar implementaciones → editar (lápiz) → Nueva versión**. Si creas una implementación nueva desde cero, la URL cambia y hay que actualizarla en el HTML.

### 5. Configurar el frontend
Abre `index.html` y edita estas dos líneas (busca `SCRIPT_URL` y `PASSWORD`):

```js
const SCRIPT_URL = 'PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT_DESPLEGADO';
const PASSWORD   = 'campos2026';
```

- `SCRIPT_URL` → la URL del paso 4.
- `PASSWORD` → la misma clave exacta que pusiste en `Code.gs` en el paso 2.

También puedes cambiar `APP_PASSWORD` (la contraseña de login de la app, puede ser distinta a `PASSWORD`) y `MONITOR_ID` (nombre por defecto que aparece como "modificado por" en las fichas).

### 6. Probar la conexión
Pega esto en el navegador, cambiando por tu URL y tu contraseña:

```
TU_SCRIPT_URL?action=getAll&pwd=TU_PASSWORD
```

Debe devolver `{"ok":true,"data":{}}`. Si sale eso, backend y frontend están conectados.

### 7. Renombrar y personalizar (opcional)
Dentro de `index.html`:
- `heroBadge`, `heroTitle`, `heroSubP` → nombre y datos del campamento que se ven en la pantalla principal.
- `footerLinea1`, `footerLinea2` → texto del pie de página.
- Pestañas **Recomendaciones** y **Evaluación** → llevan una plantilla vacía; rellénalas cada temporada con el contenido real (buscar `tab-recomendaciones` y `tab-evaluacion` en el HTML, y sus equivalentes móviles `mob-recomendaciones` / `mob-evaluacion`).

## Notas técnicas

- **Arquitectura del Sheet**: `Participantes` y `Fichas` son tablas normales (una fila = un alumno). `Config` es clave/valor: cada fila tiene una clave (`monitores`, `grupos`, `obs`, `prog`, `obsAlumnos`, `asistencia`, `proyectos`) y su valor es un JSON en texto, porque son estructuras anidadas que no caben bien en columnas.
- **Contraseñas**: hay dos, no confundir. `PASSWORD` (en `Code.gs` y en `index.html`) protege las llamadas al backend. `APP_PASSWORD` (solo en `index.html`) es la contraseña de login que teclea la persona que usa la app — puede ser distinta.
- Si la app no sincroniza y solo guarda en local, revisa primero `SCRIPT_URL` — es la causa más común.
