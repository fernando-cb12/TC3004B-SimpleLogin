const PokemonBattle = (() => {
  const DEFAULT_MAX_TURNS_PER_POKEMON = 5;

  const extractStats = (pokemon) => {
    const rawStats = pokemon.stats || {};
    return {
      hp: rawStats.hp || 50,
      attack: rawStats.attack || rawStats["special-attack"] || 50,
      defense: rawStats.defense || rawStats["special-defense"] || 50,
      speed: rawStats.speed || 50,
    };
  };

  const createCombatant = (pokemon) => {
    const stats = extractStats(pokemon);

    return {
      name: pokemon.name,
      id: pokemon.id,
      currentHp: stats.hp * 2,
      maxHp: stats.hp * 2,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
    };
  };

  const calculateDamage = (attacker, defender) => {
    const base = attacker.attack - defender.defense / 2;
    const randomness = Math.random() * 10;
    const raw = base / 10 + randomness;
    return Math.max(1, Math.floor(raw));
  };

  const describeHp = (combatant) => {
    return `${combatant.currentHp}/${combatant.maxHp} HP`;
  };

  const simulateBattle = (pokemonA, pokemonB, options = {}) => {
    const maxTurnsPerPokemon =
      typeof options.maxTurnsPerPokemon === "number" &&
      options.maxTurnsPerPokemon > 0
        ? options.maxTurnsPerPokemon
        : DEFAULT_MAX_TURNS_PER_POKEMON;

    const log = [];

    const a = createCombatant(pokemonA);
    const b = createCombatant(pokemonB);

    log.push(
      `Battle starts between ${a.name.toUpperCase()} and ${b.name.toUpperCase()}!`,
    );
    log.push(
      `${a.name.toUpperCase()}: ${describeHp(a)} | ${b.name.toUpperCase()}: ${describeHp(
        b,
      )}`,
    );

    let turnsA = 0;
    let turnsB = 0;

    const pickAttackerFirst = () => {
      if (a.speed > b.speed) return "A";
      if (b.speed > a.speed) return "B";
      return Math.random() < 0.5 ? "A" : "B";
    };

    let next = pickAttackerFirst();

    while (turnsA < maxTurnsPerPokemon || turnsB < maxTurnsPerPokemon) {
      if (a.currentHp <= 0 || b.currentHp <= 0) break;

      const attacker = next === "A" ? a : b;
      const defender = next === "A" ? b : a;

      if (next === "A" && turnsA >= maxTurnsPerPokemon) {
        next = "B";
        continue;
      }
      if (next === "B" && turnsB >= maxTurnsPerPokemon) {
        next = "A";
        continue;
      }

      const damage = calculateDamage(attacker, defender);
      defender.currentHp = Math.max(0, defender.currentHp - damage);

      if (next === "A") {
        turnsA += 1;
      } else {
        turnsB += 1;
      }

      log.push(
        `${attacker.name.toUpperCase()} hits ${defender.name.toUpperCase()} for ${damage} damage! (${describeHp(
          defender,
        )})`,
      );

      if (defender.currentHp <= 0) {
        log.push(`${defender.name.toUpperCase()} faints!`);
        break;
      }

      next = next === "A" ? "B" : "A";
    }

    let winner = null;
    if (a.currentHp > 0 && b.currentHp <= 0) {
      winner = a;
    } else if (b.currentHp > 0 && a.currentHp <= 0) {
      winner = b;
    } else if (a.currentHp > b.currentHp) {
      winner = a;
    } else if (b.currentHp > a.currentHp) {
      winner = b;
    }

    if (winner) {
      log.push(
        `Winner: ${winner.name.toUpperCase()} (${describeHp(
          winner,
        )}) after ${turnsA + turnsB} total turns.`,
      );
    } else {
      log.push("The battle ends in a draw.");
    }

    return {
      winner,
      log,
      turnsA,
      turnsB,
      combatants: { a, b },
    };
  };

  return {
    simulateBattle,
  };
})();

const PokemonSearch = (() => {
  const API_BASE = "https://pokeapi.co/api/v2/pokemon/";
  //  const OFFSET = 0;
  const MAX_POKEMON = -1;

  let allPokemon = [];
  let selectedForBattle = [];
  let battleUI = {
    battleButton: null,
    battleLogEl: null,
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
    const { battleSelectionEl } = battleUI;
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
    const battleLogEl = config.battleLogId
      ? document.getElementById(config.battleLogId)
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
      battleLogEl,
      battleSelectionEl,
    };

    const updateView = () => {
      const filtered = filterPokemon(input.value || "");
      renderPokemonList(filtered, { cardsContainer, summaryEl });
    };

    const handleBattleStart = () => {
      const { battleLogEl: logEl } = battleUI;
      if (!logEl) return;

      if (selectedForBattle.length !== 2) {
        logEl.textContent = "Please select exactly 2 Pokémon to battle.";
        return;
      }

      const [p1, p2] = selectedForBattle;
      const result = PokemonBattle.simulateBattle(p1, p2, {
        maxTurnsPerPokemon: 5,
      });

      logEl.innerHTML = result.log.join("<br>");
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

    if (battleUI.battleButton && battleUI.battleLogEl) {
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
