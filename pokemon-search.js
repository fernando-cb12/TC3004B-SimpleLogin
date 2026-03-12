const PokemonSearch = (() => {
  const API_BASE = "https://pokeapi.co/api/v2/pokemon/";
  //  const OFFSET = 0;
  const MAX_POKEMON = -1;
  const BATTLE_STORAGE_KEY = "pokemon-battle-selection";

  let allPokemon = [];
  let selectedForBattle = [];
  let battleUI = {
    battleButton: null,
    battleSelectionEl: null,
  };

  const normalizePokemon = (data) => {
    const sprite =
      data.sprites?.other?.["official-artwork"]?.front_default ||
      data.sprites?.front_default ||
      "";

    const types = (data.types || []).map((t) => t.type?.name).filter(Boolean);

    const stats = {};
    (data.stats || []).forEach((s) => {
      const key = s.stat?.name;
      if (key) {
        stats[key] = s.base_stat;
      }
    });

    return {
      id: data.id,
      name: data.name,
      sprite,
      types,
      baseExperience: data.base_experience,
      height: data.height,
      weight: data.weight,
      stats,
    };
  };

  const showError = (message, elements) => {
    const { errorEl } = elements;
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  };

  const fetchAllPokemon = async () => {
    const listResponse = await fetch(`${API_BASE}?limit=${MAX_POKEMON}`);
    if (!listResponse.ok) {
      throw new Error("Failed to load Pokémon list.");
    }

    const listData = await listResponse.json();

    const detailPromises = listData.results.map((item) =>
      fetch(item.url).then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load Pokémon data.");
        }
        return response.json();
      }),
    );

    const settled = await Promise.allSettled(detailPromises);
    const successful = settled
      .filter((result) => result.status === "fulfilled")
      .map((result) => normalizePokemon(result.value));

    return successful.sort((a, b) => a.id - b.id);
  };

  const renderPokemonList = (pokemonList, elements) => {
    const { cardsContainer, summaryEl } = elements;

    if (!cardsContainer) return;

    cardsContainer.innerHTML = "";

    const total = allPokemon.length;
    const visible = pokemonList.length;

    if (summaryEl) {
      if (!total) {
        summaryEl.textContent = "";
      } else if (!visible) {
        summaryEl.textContent = `No Pokémon match your search out of ${total}.`;
      } else {
        summaryEl.textContent = `Showing ${visible} of ${total} Pokémon`;
      }
    }

    if (!visible) return;

    pokemonList.forEach((pokemon) => {
      const card = document.createElement("div");
      card.className = "pokemon-card";
      card.dataset.id = String(pokemon.id);

      const typesMarkup = pokemon.types
        .map(
          (type) =>
            `<span class="pokemon-card-type-badge">${type.toUpperCase()}</span>`,
        )
        .join("");

      card.innerHTML = `
         <img src="${pokemon.sprite}" alt="${pokemon.name}" />
         <div class="pokemon-card-name">${pokemon.name.toUpperCase()}</div>
         <div class="pokemon-card-id">#${String(pokemon.id).padStart(3, "0")}</div>
         <div class="pokemon-card-types">
           ${typesMarkup}
         </div>
         <div class="pokemon-card-stats">
           EXP: ${pokemon.baseExperience} · H: ${pokemon.height} · W: ${pokemon.weight}
         </div>
       `;

      if (selectedForBattle.some((p) => p.id === pokemon.id)) {
        card.classList.add("selected-for-battle");
      }

      card.addEventListener("click", () => {
        handleCardClick(pokemon, card);
      });

      cardsContainer.appendChild(card);
    });
  };

  const updateBattleSelectionText = () => {
    const { battleSelectionEl, battleButton } = battleUI;

    if (battleButton) {
      battleButton.classList.add("hidden");
    }

    if (!battleSelectionEl) return;

    if (!selectedForBattle.length) {
      battleSelectionEl.textContent = "Select up to 2 Pokémon to battle.";
      return;
    }

    const names = selectedForBattle.map((p) => p.name.toUpperCase());
    if (names.length === 1) {
      battleSelectionEl.textContent = `Selected: ${names[0]}`;
    } else {
      battleSelectionEl.textContent = `Selected: ${names[0]} vs ${names[1]}`;
      if (battleButton) {
        battleButton.classList.remove("hidden");
      }
    }
  };

  const handleCardClick = (pokemon, cardElement) => {
    const existingIndex = selectedForBattle.findIndex(
      (p) => p.id === pokemon.id,
    );

    if (existingIndex >= 0) {
      selectedForBattle.splice(existingIndex, 1);
      cardElement.classList.remove("selected-for-battle");
    } else {
      if (selectedForBattle.length >= 2) {
        const removed = selectedForBattle.shift();
        const previousCard = document.querySelector(
          `.pokemon-card[data-id="${removed.id}"]`,
        );
        if (previousCard) {
          previousCard.classList.remove("selected-for-battle");
        }
      }

      selectedForBattle.push(pokemon);
      cardElement.classList.add("selected-for-battle");
    }

    updateBattleSelectionText();
  };

  const filterPokemon = (query) => {
    const term = query.trim().toLowerCase();
    if (!term) return allPokemon;

    return allPokemon.filter((pokemon) => {
      const idMatch = String(pokemon.id) === term;
      const nameMatch = pokemon.name.toLowerCase().includes(term);
      const typeMatch = pokemon.types.some((type) =>
        type.toLowerCase().includes(term),
      );
      return idMatch || nameMatch || typeMatch;
    });
  };

  const init = (config) => {
    const form = document.getElementById(config.formId);
    const input = document.getElementById(config.inputId);
    const cardsContainer = document.getElementById(config.cardsId);
    const summaryEl = document.getElementById(config.summaryId);
    const errorEl = document.getElementById(config.errorId);

    const battleButton = config.battleButtonId
      ? document.getElementById(config.battleButtonId)
      : null;
    const battleSelectionEl = config.battleSelectionId
      ? document.getElementById(config.battleSelectionId)
      : null;

    if (!form || !input || !cardsContainer || !errorEl) {
      console.warn("PokemonSearch: Missing required DOM elements.");
      return;
    }

    battleUI = {
      battleButton,
      battleSelectionEl,
    };

    const updateView = () => {
      const filtered = filterPokemon(input.value || "");
      renderPokemonList(filtered, { cardsContainer, summaryEl });
    };

    const handleBattleStart = () => {
      if (selectedForBattle.length !== 2) {
        return;
      }

      const lightweightSelection = selectedForBattle.map((pokemon) => ({
        id: pokemon.id,
        name: pokemon.name,
        sprite: pokemon.sprite,
        stats: pokemon.stats || {},
      }));

      try {
        window.localStorage.setItem(
          BATTLE_STORAGE_KEY,
          JSON.stringify(lightweightSelection),
        );
      } catch (error) {
        console.error("Failed to store battle selection:", error);
      }

      window.location.href = "pokemon-battle.html";
    };

    const loadAll = async () => {
      showError("Loading Pokémon from PokéAPI...", { errorEl });
      try {
        allPokemon = await fetchAllPokemon();
        showError("", { errorEl });
        renderPokemonList(allPokemon, { cardsContainer, summaryEl });
      } catch (error) {
        console.error("Failed to load Pokémon list:", error);
        showError("Failed to load Pokémon list. Please refresh.", {
          errorEl,
        });
      }
    };

    if (battleUI.battleButton) {
      battleUI.battleButton.addEventListener("click", handleBattleStart);
      updateBattleSelectionText();
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateView();
    });

    input.addEventListener("input", () => {
      updateView();
    });

    loadAll();
  };

  return {
    init,
  };
})();
