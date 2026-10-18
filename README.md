# 🌙 Sailor Scouts: Portal web con consumo de API ✨

📚 **Curso:** Diseño de sistemas en Internet
📝 **Guía:** Frontend – Consumo de API
👩‍💻 **Estudiante:** María Belén Guevara Ochoa
🏫 **Universidad:** Universidad Nacional de Ingeniería (UNI)

---

## 🎯 Objetivo

Desarrollar un portal web que consuma una **API pública** usando la API nativa `fetch()` de JavaScript, aplicando **async/await** y **Promesas (.then / .catch)**, como se vio en la sesión con la demo de PokéAPI.

## 🔌 API utilizada

**[AniList API](https://docs.anilist.co/)**: API pública y gratuita de anime y manga. No necesita clave ni registro para consultar datos públicos.

| Consulta | ¿Para qué se usa? | Mecanismo |
|---|---|---|
| `Media` | Información del anime Sailor Moon (título, sinopsis, puntuación, episodios, portada) | ⏳ `async / await` |
| `Media → characters` | Lista de personajes con imagen, rol y favoritos | 🔗 `.then() / .catch()` |
| `Character` | Detalle de un personaje (descripción, otros nombres, voz) | ⏳ `async / await` |

📮 AniList usa **GraphQL**: todas las peticiones se envían con `POST` a `https://graphql.anilist.co`, y en el cuerpo de la petición se indica qué datos se quieren recibir.

## 💖 Características

1. 🌟 **Portada dinámica:** el título, la sinopsis, los datos y la portada se cargan desde la API.
2. 🃏 **Tarjetas de personajes:** se generan con JavaScript a partir del JSON, ordenadas por rol y popularidad.
3. 🔍 **Buscador y filtros:** búsqueda por nombre y filtro por personajes principales o secundarios.
4. 🪄 **Detalle en ventana modal:** al hacer clic en una tarjeta se hace una nueva petición y se muestra la información completa.
5. 🧪 **Laboratorio API:** muestra el estado HTTP (`200 OK`), el tiempo de respuesta en milisegundos, el tipo de contenido, el método, la consulta realizada y el JSON recibido.
6. 🛡️ **Manejo de errores:** se verifica `respuesta.ok` y los errores que devuelve la API; si algo falla, se muestra un mensaje amigable.
7. 🧹 **Limpieza de datos:** se quitan spoilers, etiquetas HTML y formato especial de las descripciones.

## 📖 ¿Cómo funciona `fetch()` en este proyecto?

### 📮 La consulta GraphQL

En lugar de usar una URL distinta para cada dato, se envía una consulta que describe exactamente qué información se necesita:

```javascript
const CONSULTA_ANIME = `
query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    title { romaji english native }
    description(asHtml: false)
    averageScore
    episodes
    seasonYear
    coverImage { extraLarge large }
  }
}`;

function opcionesPeticion(consulta, variables) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query: consulta, variables })
    };
}
```

### ⏳ Con `async / await`

```javascript
async function cargarAnime() {
    try {
        // 1. Petición POST con la consulta GraphQL
        const respuesta = await fetch(API_URL, opcionesPeticion(CONSULTA_ANIME, { id: 530 }));

        // 2. Convertir la respuesta a JSON
        const json = await respuesta.json();

        // 3. Verificar el estado
        if (!respuesta.ok || json.errors) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        // 4. Mostrar en la página
        mostrarAnime(json.data.Media);
    } catch (error) {
        console.error('Error al cargar el anime:', error.message);
    }
}
```

### 🔗 Con Promesas (`.then / .catch`)

```javascript
function cargarPersonajes() {
    let respuestaHttp;

    fetch(API_URL, opcionesPeticion(CONSULTA_PERSONAJES, { id: 530 }))
        .then(respuesta => {
            respuestaHttp = respuesta;
            return respuesta.json();
        })
        .then(json => {
            if (!respuestaHttp.ok || json.errors) {
                throw new Error(`Error HTTP: ${respuestaHttp.status}`);
            }
            personajes = json.data.Media.characters.edges;
            mostrarPersonajes();
        })
        .catch(error => {
            console.error('Error al cargar personajes:', error.message);
        });
}
```

## 📁 Estructura del proyecto

```
sailorapi/
├── 📄 README.md        → documentación del proyecto
├── 📂 template/
│   └── index.html      → estructura de la página
└── 📂 styles/
    ├── 📂 css/
    │   └── styles.css  → diseño pastel inspirado en Sailor Moon
    └── 📂 js/
        └── app.js      → consumo de la API, renderizado y eventos
```

## 🚀 Cómo verlo

1. 📥 Clonar el repositorio.
2. 🌐 Abrir `template/index.html` con la extensión **Live Server** de VS Code (o directamente en el navegador).
3. 📶 Tener conexión a internet, porque los datos vienen de la API en tiempo real.

## 📸 Captura

![Vista del portal](captura.png)

---

🌙 *Datos proporcionados por [AniList](https://anilist.co/), API pública de anime y manga. Proyecto con fines educativos.*

Hecho por **María Belén Guevara** ⭐🐙 · 2026