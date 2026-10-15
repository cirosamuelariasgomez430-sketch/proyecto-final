
// ===========================================
// POKEDEX SPA
// API: https://pokeapi.co
// ===========================================

// ==============================
// URL BASE
// ==============================

const URL = "https://pokeapi.co/api/v2/pokemon";

// ==============================
// VARIABLES
// ==============================

let offset = 0;
const limite = 20;

// ==============================
// ELEMENTOS DEL DOM
// ==============================

const pokemonContainer = document.getElementById("pokemonContainer");
const detailContainer = document.getElementById("detailContainer");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");

const pokemonCounter = document.getElementById("pokemonCounter");

// ==============================
// LOADING
// ==============================

function mostrarLoading() {
    loading?.classList.remove("hidden");
}

function ocultarLoading() {
    loading?.classList.add("hidden");
}

// ==============================
// ERROR
// ==============================

function mostrarError(texto = "Pokémon no encontrado.") {
    errorMessage.textContent = texto;
    errorMessage.classList.remove("hidden");

    setTimeout(() => {
        errorMessage.classList.add("hidden");
    }, 3000);
}

// ==============================
// OBTENER LISTA DE POKÉMON
// ==============================

async function cargarPokemon() {
    mostrarLoading();
    pokemonContainer.innerHTML = "";

    try {
        const respuesta = await fetch(
            `${URL}?offset=${offset}&limit=${limite}`
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la lista de Pokémon");
        }

        const datos = await respuesta.json();

        pokemonCounter.textContent =
            `${datos.results.length} Pokémon`;

        // Consultar los detalles en paralelo
        const promesas = datos.results.map(async (pokemon) => {
            const respuestaPokemon = await fetch(pokemon.url);

            if (!respuestaPokemon.ok) {
                throw new Error(`Error cargando ${pokemon.name}`);
            }

            return respuestaPokemon.json();
        });

        const pokemones = await Promise.all(promesas);

        pokemones.forEach((pokemon) => {
            crearCard(pokemon);
        });

        // Actualizar botones de paginación
        if (previousBtn) {
            previousBtn.disabled = offset === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = !datos.next;
        }

        // Limpiar la ficha técnica al cargar otra página
        // detailContainer.innerHTML = "";

    } catch (error) {
        console.error("Error al cargar Pokémon:", error);
        mostrarError("Error cargando la Pokédex. Intenta nuevamente.");

    } finally {
        ocultarLoading();
    }
}

// ==============================
// CREAR TARJETAS
// ==============================

function crearCard(pokemon) {
    const card = document.createElement("article");
    card.classList.add("card");

    const imagen =
        pokemon.sprites.other["official-artwork"].front_default ||
        pokemon.sprites.front_default ||
        "";

    card.innerHTML = `
        <img
            src="${imagen}"
            alt="${capitalizar(pokemon.name)}"
            loading="lazy"
        >

        <div class="card-body">
            <p class="id">#${pokemon.id}</p>

            <h3>${capitalizar(pokemon.name)}</h3>

            <div class="tipos">
                ${pokemon.types.map(tipo => `
                    <span class="tipo ${tipo.type.name}">
                        ${capitalizar(tipo.type.name)}
                    </span>
                `).join("")}
            </div>

            <button type="button" class="detail-btn">
                Ver Información
            </button>
        </div>
    `;

    card.querySelector(".detail-btn").addEventListener("click", () => {
        mostrarDetalle(pokemon);
    });

    pokemonContainer.appendChild(card);
}

// ==============================
// MOSTRAR DETALLE
// ==============================

function mostrarDetalle(pokemon) {
    let estadisticas = "";

    pokemon.stats.forEach(stat => {
        estadisticas += `
            <div class="stat">
                <div class="stat-header">
                    <span>${capitalizar(stat.stat.name.replace("-", " "))}</span>
                    <span>${stat.base_stat}</span>
                </div>

                <div class="progress">
                    <span style="width:${Math.min(stat.base_stat, 100)}%"></span>
                </div>
            </div>
        `;
    });

    const tipos = pokemon.types.map(tipo => `
        <span class="tipo ${tipo.type.name}">
            ${capitalizar(tipo.type.name)}
        </span>
    `).join("");

    const habilidades = pokemon.abilities.map(habilidad => `
        <li>${capitalizar(habilidad.ability.name.replace("-", " "))}</li>
    `).join("");

    const imagen =
        pokemon.sprites.other["official-artwork"].front_default ||
        pokemon.sprites.front_default ||
        "";

    detailContainer.innerHTML = `
        <img
            src="${imagen}"
            alt="${capitalizar(pokemon.name)}"
        >

        <h2>${capitalizar(pokemon.name)}</h2>
        <h3>#${pokemon.id}</h3>

        <div class="tipos">${tipos}</div>

        <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
        <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>

        <h3>Habilidades</h3>
        <ul>${habilidades}</ul>

        <h3>Estadísticas</h3>
        <div class="stats">${estadisticas}</div>
    `;

    // Desplazarse hacia la ficha técnica
    detailContainer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ==============================
// BUSCAR POKÉMON
// ==============================

async function buscarPokemon() {
    const nombre = searchInput.value.trim().toLowerCase();

    if (nombre === "") {
        offset = 0;
        cargarPokemon();
        return;
    }

    mostrarLoading();
    pokemonContainer.innerHTML = "";
    detailContainer.innerHTML = "";

    try {
        const respuesta = await fetch(
            `${URL}/${encodeURIComponent(nombre)}`
        );

        if (!respuesta.ok) {
            throw new Error("Pokémon no encontrado");
        }

        const pokemon = await respuesta.json();

        crearCard(pokemon);
        mostrarDetalle(pokemon);

        pokemonCounter.textContent = "1 Pokémon";

        if (previousBtn) previousBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;

    } catch (error) {
        console.error("Error en la búsqueda:", error);

        pokemonContainer.innerHTML = "";
        detailContainer.innerHTML = "";

        pokemonCounter.textContent = "0 Pokémon";
        mostrarError("Pokémon no encontrado. Verifica el nombre.");

    } finally {
        ocultarLoading();
    }
}

// ==============================
// EVENTOS DE BÚSQUEDA
// ==============================

searchButton.addEventListener("click", buscarPokemon);

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        buscarPokemon();
    }
});

// ==============================
// PAGINACIÓN
// ==============================

nextBtn.addEventListener("click", () => {
    offset += limite;
    cargarPokemon();
});

previousBtn.addEventListener("click", () => {
    if (offset === 0) return;

    offset -= limite;
    cargarPokemon();
});

// ==============================
// UTILIDADES
// ==============================

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ==============================
// INICIO AUTOMÁTICO
// ==============================

document.addEventListener("DOMContentLoaded", () => {
    cargarPokemon();
});
