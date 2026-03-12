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

const PokemonBattlePage = (() => {
  const BATTLE_STORAGE_KEY = "pokemon-battle-selection";

  const readSelection = () => {
    try {
      const raw = window.localStorage.getItem(BATTLE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== 2) return null;
      return parsed;
    } catch (error) {
      console.error("Failed to read battle selection:", error);
      return null;
    }
  };

  const clearSelection = () => {
    try {
      window.localStorage.removeItem(BATTLE_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear battle selection:", error);
    }
  };

  const renderSide = (container, combatant, originalPokemon) => {
    if (!container || !combatant || !originalPokemon) return;

    const sprite = originalPokemon.sprite || "";
    const name = combatant.name.toUpperCase();
    const hpText = `${combatant.currentHp}/${combatant.maxHp} HP`;

    container.innerHTML = `
      <img
        src="${sprite}"
        alt="${name}"
        class="pokemon-battle-sprite"
      />
      <div class="pokemon-battle-name">${name}</div>
      <div class="pokemon-battle-hp">${hpText}</div>
    `;
  };

  const init = () => {
    const root = document.getElementById("pokemon-battle-root");
    const errorEl = document.getElementById("pokemon-battle-error");
    const leftEl = document.getElementById("pokemon-battle-left");
    const rightEl = document.getElementById("pokemon-battle-right");
    const logEl = document.getElementById("pokemon-battle-log");

    if (!root || !errorEl || !leftEl || !rightEl || !logEl) {
      console.warn("PokemonBattlePage: Missing required DOM elements.");
      return;
    }

    const selection = readSelection();
    if (!selection) {
      errorEl.textContent =
        "No battle selection found. Go back to the directory and choose two Pokémon.";
      root.classList.add("hidden");
      return;
    }

    const [first, second] = selection;
    const result = PokemonBattle.simulateBattle(first, second, {
      maxTurnsPerPokemon: 5,
    });

    renderSide(leftEl, result.combatants.a, first);
    renderSide(rightEl, result.combatants.b, second);

    logEl.innerHTML = result.log.join("<br>");

    clearSelection();
  };

  return {
    init,
  };
})();

