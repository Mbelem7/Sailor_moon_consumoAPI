/* ==========================================
   Sailor Scouts - Consumo de API
   API pública: AniList (GraphQL)
   https://docs.anilist.co/
   ========================================== */

const API_URL = 'https://graphql.anilist.co';
const SAILOR_MOON_ID = 530; // ID de "Bishoujo Senshi Sailor Moon" (1992)

let personajes = [];      // lista completa que devuelve la API
let rolActivo = 'todos';  // filtro seleccionado

// Atajo para seleccionar elementos
const $ = (selector) => document.querySelector(selector);

// Evita que el texto de la API se interprete como HTML
function escapar(texto = '') {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Limpia las descripciones de AniList: quita spoilers, etiquetas HTML y formato Markdown
function limpiarTexto(texto = '') {
    return String(texto || '')
        .replace(/~!.*?!~/gs, '')               // spoilers
        .replace(/<br\s*\/?>/gi, '\n')           // saltos de línea
        .replace(/<[^>]+>/g, '')                 // otras etiquetas HTML
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // enlaces [texto](url)
        .replace(/__|\*\*/g, '')                 // negritas
        .replace(/\[Written by MAL Rewrite\]|\(Source:[^)]*\)/gi, '') // créditos de la fuente
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// AniList trabaja con consultas GraphQL: siempre se envían por POST
function opcionesPeticion(consulta, variables) {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ query: consulta, variables })
    };
}


/* ==========================================
   CONSULTAS GRAPHQL (qué datos le pedimos a la API)
   ========================================== */
const CONSULTA_ANIME = `
query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    title { romaji english native }
    description(asHtml: false)
    averageScore
    episodes
    seasonYear
    studios(isMain: true) { nodes { name } }
    coverImage { extraLarge large }
  }
}`;

const CONSULTA_PERSONAJES = `
query ($id: Int) {
  Media(idMal: $id, type: ANIME) {
    characters(page: 1, perPage: 50, sort: [ROLE, FAVOURITES_DESC]) {
      edges {
        role
        node {
          id
          name { full native }
          image { large }
          favourites
        }
      }
    }
  }
}`;

const CONSULTA_DETALLE = `
query ($id: Int) {
  Character(id: $id) {
    name { full native alternative }
    image { large }
    description(asHtml: false)
    favourites
    siteUrl
    media(type: ANIME, sort: POPULARITY_DESC, perPage: 1) {
      edges { voiceActors(language: JAPANESE) { name { full } } }
    }
  }
}`;


/* ==========================================
   LABORATORIO: muestra los datos de cada petición
   ========================================== */
function actualizarLaboratorio({ respuesta, milisegundos, datos, consulta }) {
    const estado = $('#lab-estado');
    estado.textContent = `${respuesta.status} ${respuesta.ok ? 'OK' : respuesta.statusText}`;
    estado.className = respuesta.ok ? 'ok' : 'mal';

    $('#lab-tiempo').textContent = `${milisegundos} ms`;
    $('#lab-tipo').textContent = (respuesta.headers.get('content-type') || '—').split(';')[0];
    $('#lab-metodo').textContent = 'POST';
    $('#lab-url').textContent = `${API_URL}  ·  consulta: ${consulta}`;
    $('#lab-json').textContent = JSON.stringify(datos, null, 2);
}


/* ==========================================
   1) DATOS DEL ANIME — con async / await
   ========================================== */
async function cargarAnime() {
    try {
        const inicio = performance.now();

        // 1. Iniciar la petición HTTP (POST con la consulta GraphQL)
        const respuesta = await fetch(API_URL, opcionesPeticion(CONSULTA_ANIME, { id: SAILOR_MOON_ID }));

        // 2. Convertir el cuerpo de la respuesta a JSON
        const json = await respuesta.json();
        const milisegundos = Math.round(performance.now() - inicio);
        actualizarLaboratorio({ respuesta, milisegundos, datos: json, consulta: 'Media (anime)' });

        // 3. Verificar el estado de la respuesta
        if (!respuesta.ok || json.errors) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        mostrarAnime(json.data.Media);
    } catch (error) {
        console.error('Error al cargar el anime:', error.message);
        $('#anime-sinopsis').textContent = '😿 No se pudo cargar la información del anime. Intenta recargar la página.';
    }
}

function mostrarAnime(anime) {
    $('#anime-titulo').textContent = anime.title.english || anime.title.romaji;
    $('#anime-japones').textContent = anime.title.native || '';

    // La sinopsis viene en inglés; se recorta para que no sea muy larga
    const sinopsis = limpiarTexto(anime.description);
    $('#anime-sinopsis').textContent = sinopsis.length > 420 ? sinopsis.slice(0, 420) + '…' : sinopsis;

    const puntuacion = anime.averageScore ? `${anime.averageScore}%` : '—';
    const estudio = anime.studios.nodes.length ? anime.studios.nodes[0].name : '—';
    $('#anime-datos').innerHTML = `
        <li><span>⭐ Puntuación</span><strong>${escapar(puntuacion)}</strong></li>
        <li><span>📺 Episodios</span><strong>${escapar(anime.episodes ?? '—')}</strong></li>
        <li><span>📅 Año</span><strong>${escapar(anime.seasonYear ?? '—')}</strong></li>
        <li><span>🎬 Estudio</span><strong>${escapar(estudio)}</strong></li>
    `;

    const portada = $('#anime-portada');
    portada.src = anime.coverImage.extraLarge || anime.coverImage.large;
    portada.hidden = false;
}


/* ==========================================
   2) PERSONAJES — con Promesas (.then / .catch)
   ========================================== */
function cargarPersonajes() {
    const inicio = performance.now();
    let respuestaHttp;

    fetch(API_URL, opcionesPeticion(CONSULTA_PERSONAJES, { id: SAILOR_MOON_ID }))
        .then(respuesta => {
            respuestaHttp = respuesta;
            return respuesta.json();
        })
        .then(json => {
            const milisegundos = Math.round(performance.now() - inicio);
            actualizarLaboratorio({ respuesta: respuestaHttp, milisegundos, datos: json, consulta: 'Media → characters' });

            if (!respuestaHttp.ok || json.errors) {
                throw new Error(`Error HTTP: ${respuestaHttp.status}`);
            }

            // Se adapta cada personaje a un formato más simple
            personajes = json.data.Media.characters.edges.map(edge => ({
                id: edge.node.id,
                nombre: edge.node.name.full,
                imagen: edge.node.image.large,
                favoritos: edge.node.favourites,
                rol: edge.role === 'MAIN' ? 'Main' : 'Supporting'
            }));
            mostrarPersonajes();
        })
        .catch(error => {
            console.error('Error al cargar personajes:', error.message);
            const estado = $('#estado-personajes');
            estado.textContent = '😿 No se pudieron cargar los personajes. Intenta recargar la página.';
            estado.classList.add('error');
        });
}

function mostrarPersonajes() {
    const texto = $('#buscador').value.trim().toLowerCase();

    const filtrados = personajes.filter(p => {
        const coincideRol = rolActivo === 'todos' || p.rol === rolActivo;
        const coincideNombre = p.nombre.toLowerCase().includes(texto);
        return coincideRol && coincideNombre;
    });

    const estado = $('#estado-personajes');
    estado.classList.remove('error');
    estado.textContent = filtrados.length
        ? `✨ Mostrando ${filtrados.length} personaje(s)`
        : '🌙 No se encontró ningún personaje con ese nombre.';

    $('#lista-personajes').innerHTML = filtrados.map(p => `
        <li>
            <button type="button" class="tarjeta" data-id="${p.id}">
                <img src="${escapar(p.imagen)}" alt="${escapar(p.nombre)}" loading="lazy">
                <div class="info">
                    <h3>${escapar(p.nombre)}</h3>
                    <span class="rol ${p.rol}">${p.rol === 'Main' ? 'Principal' : 'Secundario'}</span>
                    <span class="favoritos">💖 ${p.favoritos.toLocaleString('es')} favoritos</span>
                </div>
            </button>
        </li>
    `).join('');
}


/* ==========================================
   3) DETALLE DE UN PERSONAJE — con async / await
   ========================================== */
async function verPersonaje(id) {
    const modal = $('#modal');
    const contenido = $('#modal-contenido');
    contenido.innerHTML = '<p class="estado">🌙 Cargando…</p>';
    modal.showModal();

    try {
        const inicio = performance.now();
        const respuesta = await fetch(API_URL, opcionesPeticion(CONSULTA_DETALLE, { id: Number(id) }));
        const json = await respuesta.json();
        const milisegundos = Math.round(performance.now() - inicio);
        actualizarLaboratorio({ respuesta, milisegundos, datos: json, consulta: 'Character (detalle)' });

        if (!respuesta.ok || json.errors) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        mostrarDetalle(json.data.Character);
    } catch (error) {
        console.error('Error al cargar el personaje:', error.message);
        contenido.innerHTML = `<p class="estado error">😿 No se pudo cargar el personaje (${escapar(error.message)}). Espera unos segundos e inténtalo de nuevo.</p>`;
    }
}

function mostrarDetalle(p) {
    let descripcion = limpiarTexto(p.description) || 'Sin descripción disponible.';
    if (descripcion.length > 700) descripcion = descripcion.slice(0, 700) + '…';

    const alternativos = (p.name.alternative || []).filter(Boolean);
    const apodos = alternativos.length
        ? `<h3>Otros nombres</h3><ul>${alternativos.map(a => `<li>${escapar(a)}</li>`).join('')}</ul>`
        : '';

    const actrices = (p.media?.edges?.[0]?.voiceActors || []).slice(0, 3);
    const voces = actrices.length
        ? `<h3>Voz en japonés</h3><ul>${actrices.map(v => `<li>${escapar(v.name.full)}</li>`).join('')}</ul>`
        : '';

    $('#modal-contenido').innerHTML = `
        <div class="detalle">
            <img src="${escapar(p.image.large)}" alt="${escapar(p.name.full)}">
            <div>
                <h2 id="modal-nombre">${escapar(p.name.full)}</h2>
                <p class="kanji">${escapar(p.name.native || '')}</p>
                <span class="rol">💖 ${p.favourites.toLocaleString('es')} favoritos</span>

                <h3>Descripción</h3>
                <p>${escapar(descripcion).replace(/\n+/g, '<br><br>')}</p>
                ${apodos}
                ${voces}
                <h3>Más información</h3>
                <p><a href="${escapar(p.siteUrl)}" target="_blank" rel="noopener">Ver en AniList ↗</a></p>
            </div>
        </div>
    `;
}


/* ==========================================
   EVENTOS
   ========================================== */
$('#buscador').addEventListener('input', mostrarPersonajes);

document.querySelectorAll('.filtro').forEach(boton => {
    boton.addEventListener('click', () => {
        document.querySelectorAll('.filtro').forEach(b => b.classList.remove('activo'));
        boton.classList.add('activo');
        rolActivo = boton.dataset.rol;
        mostrarPersonajes();
    });
});

// Un solo evento para todas las tarjetas (delegación de eventos)
$('#lista-personajes').addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('.tarjeta');
    if (tarjeta) verPersonaje(tarjeta.dataset.id);
});

$('#cerrar-modal').addEventListener('click', () => $('#modal').close());
$('#modal').addEventListener('click', (evento) => {
    if (evento.target.id === 'modal') $('#modal').close(); // clic fuera del contenido
});


/* ==========================================
   INICIO
   ========================================== */
cargarAnime();
cargarPersonajes();