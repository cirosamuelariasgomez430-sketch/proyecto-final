// ===========================================
// POKÉDEX SPA
// API: https://pokeapi.co/api/v2/pokemon
// ===========================================

document.addEventListener("DOMContentLoaded", () => {
    // CONFIGURACIÓN
    const URL = "https://pokeapi.co/api/v2/pokemon";
    const limite = 20;
    let offset = 0;
    let solicitudActual = 0;
    let temporizadorError;

    // ELEMENTOS DEL DOM
    const pokemonContainer = document.getElementById("pokemonContainer");
    const detailContainer = document.getElementById("detailContainer");
    const previousBtn = document.getElementById("previousBtn");
    const nextBtn = document.getElementById("nextBtn");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");
    const pokemonCounter = document.getElementById("pokemonCounter");

    if ([pokemonContainer, detailContainer, previousBtn, nextBtn, searchInput,
         searchButton, loading, errorMessage, pokemonCounter].some(el => !el)) {
        console.error("Faltan elementos HTML requeridos por la Pokédex. Revisa sus ID.");
        return;
    }

    // UTILIDADES
    const capitalizar = texto => texto.charAt(0).toUpperCase() + texto.slice(1).replaceAll("-", " ");

    function obtenerImagen(pokemon) {
        return pokemon.sprites.other?.["official-artwork"]?.front_default
            || pokemon.sprites.front_default
            || "";
    }

    function mostrarLoading() {
        loading.classList.remove("hidden");
    }

    function ocultarLoading() {
        loading.classList.add("hidden");
    }

    function mostrarError(texto = "Pokémon no encontrado.") {
        clearTimeout(temporizadorError);
        errorMessage.textContent = texto;
        errorMessage.classList.remove("hidden");
        temporizadorError = setTimeout(() => {
            errorMessage.classList.add("hidden");
        }, 3000);
    }

    // TARJETAS
    function crearCard(pokemon) {
        const card = document.createElement("article");
        card.classList.add("card");

        const tipos = pokemon.types.map(({ type }) => `
            <span class="tipo ${type.name}">${capitalizar(type.name)}</span>
        `).join("");

        card.innerHTML = `
            <img src="${obtenerImagen(pokemon)}" alt="${pokemon.name}" loading="lazy">
            <div class="card-body">
                <p class="id">#${pokemon.id}</p>
                <h3>${capitalizar(pokemon.name)}</h3>
                <div>${tipos}</div>
                <button type="button">Ver información</button>
            </div>
        `;

        // El botón también activa este evento porque está dentro de la tarjeta.
        card.addEventListener("click", () => mostrarDetalle(pokemon));
        return card;
    }

    // FICHA TÉCNICA
    function mostrarDetalle(pokemon) {
        const tipos = pokemon.types.map(({ type }) => `
            <span class="tipo ${type.name}">${capitalizar(type.name)}</span>
        `).join("");

        const habilidades = pokemon.abilities.map(({ ability }) => `
            <li>${capitalizar(ability.name)}</li>
        `).join("");

        const estadisticas = pokemon.stats.map(({ stat, base_stat }) => `
            <div class="stat">
                <div class="stat-header">
                    <span>${capitalizar(stat.name)}</span>
                    <span>${base_stat}</span>
                </div>
                <div class="progress">
                    <span style="width: ${Math.min(base_stat, 100)}%"></span>
                </div>
            </div>
        `).join("");

        detailContainer.innerHTML = `
            <img src="${obtenerImagen(pokemon)}" alt="${pokemon.name}">
            <h2>${capitalizar(pokemon.name)}</h2>
            <h3>#${pokemon.id}</h3>
            <div>${tipos}</div>
            <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
            <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
            <h3>Habilidades</h3>
            <ul>${habilidades}</ul>
            <div class="stats">${estadisticas}</div>
        `;
    }

    // LISTADO CON PAGINACIÓN
    async function cargarPokemon() {
        const solicitud = ++solicitudActual;
        mostrarLoading();
        previousBtn.disabled = true;
        nextBtn.disabled = true;

        try {
            const respuesta = await fetch(`${URL}?offset=${offset}&limit=${limite}`);
            if (!respuesta.ok) throw new Error("No se pudo consultar la lista.");
            const datos = await respuesta.json();

            // Consultar los detalles en paralelo, respetando el orden original.
            const pokemones = await Promise.all(datos.results.map(async ({ url }) => {
                const respuestaPokemon = await fetch(url);
                if (!respuestaPokemon.ok) throw new Error("Error al consultar un Pokémon.");
                return respuestaPokemon.json();
            }));

            // Ignorar resultados de una solicitud antigua.
            if (solicitud !== solicitudActual) return;

            pokemonContainer.replaceChildren(...pokemones.map(crearCard));
            detailContainer.innerHTML = "";
            pokemonCounter.textContent = `Mostrando ${pokemones.length} de ${datos.count} Pokémon`;
            previousBtn.disabled = offset === 0;
            nextBtn.disabled = offset + limite >= datos.count;
        } catch (error) {
            if (solicitud !== solicitudActual) return;
            console.error(error);
            mostrarError("Error cargando la Pokédex. Intenta nuevamente.");
            previousBtn.disabled = offset === 0;
            nextBtn.disabled = true;
        } finally {
            if (solicitud === solicitudActual) ocultarLoading();
        }
    }

    // BUSCADOR
    async function buscarPokemon() {
        const nombre = searchInput.value.trim().toLowerCase();

        if (!nombre) {
            offset = 0;
            cargarPokemon();
            return;
        }

        const solicitud = ++solicitudActual;
        mostrarLoading();
        previousBtn.disabled = true;
        nextBtn.disabled = true;

        try {
            const respuesta = await fetch(`${URL}/${encodeURIComponent(nombre)}`);
            if (respuesta.status === 404) throw new Error("Pokémon no encontrado.");
            if (!respuesta.ok) throw new Error("Error consultando el Pokémon.");

            const pokemon = await respuesta.json();
            if (solicitud !== solicitudActual) return;

            pokemonContainer.replaceChildren(crearCard(pokemon));
            mostrarDetalle(pokemon);
            pokemonCounter.textContent = "1 Pokémon";
        } catch (error) {
            if (solicitud !== solicitudActual) return;
            console.error(error);
            pokemonContainer.replaceChildren();
            detailContainer.innerHTML = "";
            pokemonCounter.textContent = "0 Pokémon";
            mostrarError(error.message);
        } finally {
            if (solicitud === solicitudActual) ocultarLoading();
        }
    }

    // EVENTOS
    searchButton.addEventListener("click", buscarPokemon);
    searchInput.addEventListener("keydown", evento => {
        if (evento.key === "Enter") buscarPokemon();
    });

    nextBtn.addEventListener("click", () => {
        offset += limite;
        searchInput.value = "";
        cargarPokemon();
    });

    previousBtn.addEventListener("click", () => {
        if (offset === 0) return;
        offset = Math.max(0, offset - limite);
        searchInput.value = "";
        cargarPokemon();
    });

    // INICIO
    cargarPokemon();
});
