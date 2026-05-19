const DIFFICULTY = {
  easy:   { pairs: 3,  time: 15  },
  medium: { pairs: 6,  time: 30  },
  hard:   { pairs: 12, time: 60  },
}

let clicks = 0;
let matchedPairs = 0;
let totalPairs = 0;
let time = 0;
let firstCard = undefined;
let secondCard = undefined;
let lockBoard = false;
let difficulty = "easy";
let powerUpUsed = false;
let timer = null;

function generateNumbers(pairs) {
  const randomNumbers = new Set();
  while (randomNumbers.size < pairs) {
    const randomValue = Math.floor(Math.random() * 1025) + 1;
    randomNumbers.add(randomValue);
  }
  return Array.from(randomNumbers);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function loadPokemon() {
  const { pairs } = DIFFICULTY[difficulty];
  const ids = generateNumbers(pairs);

  $("#game_grid").html('<p class="text-center text-warning p-3">Loading Pokémon...</p>');

  try {
    const pokemon = await Promise.all(
      ids.map(id =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} for ID ${id}`);
            return res.json();
          })
      )
    );

    const pokemonData = pokemon.map(p => ({
      id: p.id,
      name: p.name,
      image: p.sprites.other["official-artwork"].front_default || p.sprites.front_default,
    }));

    const cardData = shuffle([...pokemonData, ...pokemonData]);
    const cardWidths = { easy: "33.3%", medium: "25%", hard: "16.66%" };

    $("#game_grid").css("--card-width", cardWidths[difficulty]).empty();

    cardData.forEach((p, index) => {
      const card = `
        <div class="memory-card" data-pokemon-id="${p.id}" data-name="${p.name}">
          <img id="img${index + 1}" class="front_face" src="${p.image}" alt="${p.name}">
          <img class="back_face" src="back.webp" alt="">
        </div>
      `;
      $("#game_grid").append(card);
    });

  } catch (err) {
    $("#game_grid").html(`<p class="text-center text-danger p-3">Failed to load: ${err.message}</p>`);
    console.error("loadPokemon error:", err);
  }
}

function updateStats() {
  $("#stat_clicks").text(clicks);
  $("#stat_matches").text(matchedPairs);
  $("#stat_pairs").text(totalPairs - matchedPairs);
  $("#stat_total").text(totalPairs);
  $("#stat_timer").text(time);
}

function updateTimer() {
  $("#stat_timer").text(time);
  if (time <= 0) {
    endGame(false);
  } else {
    time--;
  }
}

async function startGame() {
  clicks = 0;
  matchedPairs = 0;
  firstCard = undefined;
  secondCard = undefined;
  lockBoard = false;
  powerUpUsed = false;

  $("#powerup-btn").prop("disabled", false).text("Peek");

  const { pairs, time: diffTime } = DIFFICULTY[difficulty];
  totalPairs = pairs;
  time = diffTime;

  updateStats();

  clearInterval(timer);
  timer = setInterval(updateTimer, 1000);

  await loadPokemon();
  flipCard();
}

function resetGame() {
  startGame();
}

function flipCard() {
  $("#game_grid").off("click", ".memory-card").on("click", ".memory-card", function () {
    const $card = $(this);

    if (lockBoard) return;
    if (firstCard && $card.is(firstCard)) return;
    if ($card.hasClass("matched")) return;

    $card.addClass("flip");
    clicks++;
    $("#stat_clicks").text(clicks);

    if (!firstCard) {
      firstCard = $card;
      return;
    }

    secondCard = $card;
    lockBoard = true;

    const isMatch = firstCard.data("name") === secondCard.data("name");

    if (isMatch) {
      handleMatch();
    } else {
      mismatch();
    }
  });
}

function handleMatch() {
  firstCard.addClass("matched");
  secondCard.addClass("matched");
  matchedPairs++;

  updateStats();
  resetTurn();

  if (matchedPairs === totalPairs) {
    clearInterval(timer);
    endGame(true);
  }
}

function mismatch() {
  const $first  = firstCard;
  const $second = secondCard;

  setTimeout(() => {
    $first.removeClass("flip");
    $second.removeClass("flip");
    resetTurn();
  }, 1000);
}

function resetTurn() {
  firstCard  = undefined;
  secondCard = undefined;
  lockBoard  = false;
}

function endGame(won) {
  clearInterval(timer);
  lockBoard = true;

  const msg = won
    ? `You won! All ${totalPairs} pairs found in ${clicks} clicks!`
    : `Time's up! You matched ${matchedPairs} out of ${totalPairs} pairs.`;

  $("#game-message").text(msg).removeClass("d-none");
}

function activatePowerUp() {
  if (powerUpUsed || lockBoard) return;
  powerUpUsed = true;

  $("#powerup-btn").prop("disabled", true).text("Used");

  $(".memory-card:not(.matched)").addClass("flip");

  setTimeout(() => {
    $(".memory-card:not(.matched)").removeClass("flip");
  }, 2000);
}

function toggleTheme() {
  const isDark = $("body").hasClass("theme-dark");
  if (isDark) {
    $("body").removeClass("theme-dark").addClass("theme-light");
    $("#theme-btn").text("Dark Mode");
  } else {
    $("body").removeClass("theme-light").addClass("theme-dark");
    $("#theme-btn").text("Light Mode");
  }
}

function setup() {
  $(".difficulty-btn").on("click", function () {
    $(".difficulty-btn").removeClass("active");
    $(this).addClass("active");
    difficulty = $(this).data("difficulty");
  });

  $("#start-btn").on("click", () => {
    $("#game-message").addClass("d-none");
    startGame();
  });

  $("#reset-btn").on("click", () => {
    $("#game-message").addClass("d-none");
    resetGame();
  });

  $("#powerup-btn").on("click", activatePowerUp);

  $("#theme-btn").on("click", toggleTheme);

  $("body").addClass("theme-dark");
}

$(document).ready(setup)