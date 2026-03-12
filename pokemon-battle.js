const PokemonBattle = (() => {
  const DEFAULT_MAX_TURNS_PER_POKEMON = 5;
  const MIN_TURNS_FOR_SPECIAL_ATTACK = 3;
  const MIN_TURNS_FOR_SPECIAL_DEFENSE = 2;
  const MISS_CHANCE_ATTACK = 0.2;
  const MISS_CHANCE_DEFENSE = 0.2;

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

      const attackerTurns = next === "A" ? turnsA : turnsB;

      const possibleActions = ["attack"];
      if (attackerTurns >= MIN_TURNS_FOR_SPECIAL_ATTACK) {
        possibleActions.push("specialAttack");
      }
      if (attackerTurns >= MIN_TURNS_FOR_SPECIAL_DEFENSE) {
        possibleActions.push("specialDefense");
      }

      const chosenAction =
        possibleActions[Math.floor(Math.random() * possibleActions.length)];

      const rollMiss =
        Math.random() <
        (chosenAction === "specialDefense"
          ? MISS_CHANCE_DEFENSE
          : MISS_CHANCE_ATTACK);

      if (chosenAction === "specialDefense") {
        if (rollMiss) {
          log.push(
            `${attacker.name.toUpperCase()} intenta DEFENSA ESPECIAL, pero falla.`,
          );
        } else {
          attacker.defense = Math.floor(attacker.defense * 1.3);
          log.push(
            `${attacker.name.toUpperCase()} usa DEFENSA ESPECIAL. DEF sube a ${attacker.defense}.`,
          );
        }
      } else {
        if (rollMiss) {
          log.push(
            `${attacker.name.toUpperCase()} falla su ${
              chosenAction === "specialAttack" ? "ATAQUE ESPECIAL" : "ataque"
            }.`,
          );
        } else {
          const baseDamage = calculateDamage(attacker, defender);
          const damage =
            chosenAction === "specialAttack"
              ? Math.floor(baseDamage * 1.5)
              : baseDamage;

          defender.currentHp = Math.max(0, defender.currentHp - damage);

          log.push(
            `${attacker.name.toUpperCase()} ${
              chosenAction === "specialAttack" ? "usa ATAQUE ESPECIAL y" : "golpea y"
            } hace ${damage} de daño a ${defender.name.toUpperCase()} (${describeHp(
              defender,
            )}).`,
          );

          if (defender.currentHp <= 0) {
            log.push(`${defender.name.toUpperCase()} se debilita.`);
          }
        }
      }

      if (next === "A") {
        turnsA += 1;
      } else {
        turnsB += 1;
      }

      if (defender.currentHp <= 0) {
        break;
      }

      next = next === "A" ? "B" : "A";
    }

    let winner = null;
    let winnerSide = null;
    if (a.currentHp > 0 && b.currentHp <= 0) {
      winner = a;
      winnerSide = "A";
    } else if (b.currentHp > 0 && a.currentHp <= 0) {
      winner = b;
      winnerSide = "B";
    } else if (a.currentHp > b.currentHp) {
      winner = a;
      winnerSide = "A";
    } else if (b.currentHp > a.currentHp) {
      winner = b;
      winnerSide = "B";
    }

    if (winner) {
      log.push(
        `GANADOR: ${winner.name.toUpperCase()} (${describeHp(
          winner,
        )}) después de ${turnsA + turnsB} turnos en total.`,
      );
    } else {
      log.push("La batalla termina en empate.");
    }

    return {
      winner,
      winnerSide,
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

  const playLogWithDelay = (logEl, lines, delayMs) => {
    if (!logEl || !Array.isArray(lines) || !lines.length) return;

    logEl.innerHTML = "";

    let index = 0;

    const step = () => {
      if (index >= lines.length) return;

      const line = document.createElement("div");
      line.textContent = lines[index];
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;

      index += 1;
      if (index < lines.length) {
        setTimeout(step, delayMs);
      }
    };

    step();
  };

  const init = () => {
    const root = document.getElementById("pokemon-battle-root");
    const errorEl = document.getElementById("pokemon-battle-error");
    const leftEl = document.getElementById("pokemon-battle-left");
    const rightEl = document.getElementById("pokemon-battle-right");
    const logEl = document.getElementById("pokemon-battle-log");
    const winnerEl = document.getElementById("pokemon-battle-winner");

    if (!root || !errorEl || !leftEl || !rightEl || !logEl || !winnerEl) {
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

    playLogWithDelay(logEl, result.log, 600);

    if (result.winner && result.winnerSide) {
      const original =
        result.winnerSide === "A" ? first : result.winnerSide === "B" ? second : null;
      if (original) {
        const sprite = original.sprite || "";
        const name = result.winner.name.toUpperCase();
        winnerEl.innerHTML = `
          <div class="pokemon-battle-winner-label">GANADOR</div>
          <img
            src="${sprite}"
            alt="${name}"
            class="pokemon-battle-winner-sprite"
          />
          <div class="pokemon-battle-winner-name">${name}</div>
        `;
      }
    }

    clearSelection();
  };

  return {
    init,
  };
})();

