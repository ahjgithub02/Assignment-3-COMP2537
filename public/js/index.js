const difficultyMap = {
  easy: 4,
  medium: 6,
  hard: 8
};

let difficulty = 'medium';
let clickCount = 0;
let matchCount = 0;
let totalPairs = 0;
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let timerInterval;
let timeLeft = 60;
let powerUpsLeft = 3;

$('#start-btn').on('click', () => {
  difficulty = $('#difficulty').val();
  startGame(difficulty);
});

$('#reset-btn').on('click', resetGame);
$('#power-up-btn').on('click', triggerPowerUp);

$(document).ready(function () {
  $('#power-up-btn').hide().prop('disabled', true);
  $('#pause-btn').prop('disabled', true);
});

function startGame(difficulty) {

  let isPaused = false;
  clickCount = 0;
  matchCount = 0;
  powerUpsLeft = 3;

  $('#pause-btn').text('⏸ Pause').prop('disabled', false);
  $('#power-up-btn').text(`Power-Up (${powerUpsLeft})`).prop('disabled', false);
  updateStats();

  totalPairs = difficultyMap[difficulty];
  timeLeft = getTimeForDifficulty(difficulty);
  $('#game-grid').empty();

  fetch('https://pokeapi.co/api/v2/pokemon?limit=1500')
    .then(res => res.json())
    .then(data => {
      const allPokemon = data.results;
      const selected = pickRandomUnique(allPokemon, totalPairs);
      return Promise.all(selected.map(p => fetch(p.url).then(res => res.json())));
    })
    .then(pokemonDetails => {
      const cards = [];
      pokemonDetails.forEach(pokemon => {
        const id = pokemon.id;
        const imgUrl =
          pokemon.sprites?.other?.['official-artwork']?.front_default ||
          pokemon.sprites?.other?.home?.front_default ||
          pokemon.sprites?.front_default ||
          '/images/placeholder.png';

        cards.push(createCardElement(id, imgUrl));
        cards.push(createCardElement(id, imgUrl));
      });
      shuffle(cards).forEach(card => $('#game-grid').append(card));
      $('#power-up-btn').show();
      setup();
      startTimer();
    })
    .catch(error => {
      console.error("Failed to fetch Pokémon details:", error);
      alert("Error loading Pokémon data. Please try again.");
    });
}

function createCardElement(id, frontImg) {
  return $(`
    <div class="card" data-id="${id}">
      <img class="front_face" src="${frontImg}" />
      <img class="back_face" src="/images/back.webp" />
    </div>
  `);
}

function setup() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;

  $(".card").on("click", function () {
    if (lockBoard || $(this).hasClass("flip") || $(this).hasClass("matched")) return;

    $(this).addClass("flip");
    clickCount++;
    updateStats();

    if (!firstCard) {
      firstCard = $(this);
      return;
    }

    secondCard = $(this);
    lockBoard = true;

    const id1 = firstCard.data("id");
    const id2 = secondCard.data("id");

    if (id1 === id2) {
      matchCount++;
      updateStats();
      firstCard.addClass("matched").off("click");
      secondCard.addClass("matched").off("click");
      resetBoard();

      if (matchCount === totalPairs) {
        clearInterval(timerInterval);
        showWinMessage();
      }
    } else {
      setTimeout(() => {
        firstCard.removeClass("flip");
        secondCard.removeClass("flip");
        resetBoard();
      }, 1000);
    }
  });
}

function resetBoard() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function updateStats() {
  $('#click-count').text(`Clicks: ${clickCount}`);
  $('#match-count').text(`Matches: ${matchCount}`);
  $('#timer').text(`Time: ${timeLeft}s`);
}

function pickRandomUnique(allPokemon, totalPairs) {
  const result = [];
  const taken = new Set();

  const validPokemon = allPokemon.filter(p => {
    const id = parseInt(p.url.split('/').slice(-2, -1)[0]);
    return id <= 1025;
  });

  if (validPokemon.length < totalPairs) {
    console.error(`Only ${validPokemon.length} Pokémon have valid artwork. Reduce pairs or retry.`);
    return [];
  }

  while (result.length < totalPairs) {
    const randIndex = Math.floor(Math.random() * validPokemon.length);
    if (!taken.has(randIndex)) {
      result.push(validPokemon[randIndex]);
      taken.add(randIndex);
    }
  }
  return result;
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function startTimer() {
  clearInterval(timerInterval);
  updateStats();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showGameOver();
    }
  }, 1000);
}

function showWinMessage() {
  clearInterval(timerInterval);
  $('#game-message').html(`
    <h2>You Win! 🎉</h2>
    <p>Matches: ${matchCount}/${totalPairs}</p>
    <button id="restart-btn">Play Again</button>
  `).show();
  $('.card').off('click');
}


// Updated showGameOver()
function showGameOver() {
  clearInterval(timerInterval);
  $('#game-over-popup').html(`
    <h2>Time's Up! 😞</h2>
    <p>Matched ${matchCount}/${totalPairs} pairs</p>
    <button id="restart-btn">Try Again</button>
  `).show();
  $('.card').off('click');
}

$(document).on('click', '#restart-btn', resetGame);

function getTimeForDifficulty(level) {
  switch (level) {
    case 'easy': return 30;
    case 'medium': return 60;
    case 'hard': return 90;
    default: return 60;
  }
}

// 🔥 Power-Up Feature
function triggerPowerUp() {
  if (powerUpsLeft <= 0) return;

  powerUpsLeft--;
  $('#power-up-btn').text(`Power-Up (${powerUpsLeft})`);
  if (powerUpsLeft === 0) {
    $('#power-up-btn').prop('disabled', true);
  }

  $('.card').each(function () {
    if (!$(this).hasClass('matched')) {
      $(this).addClass('flip');
    }
  });

  setTimeout(() => {
    $('.card').each(function () {
      if (!$(this).hasClass('matched')) {
        $(this).removeClass('flip');
      }
    });
  }, 2000);
}

// Updated pause functionality
$('#pause-btn').on('click', function () {
  if ($('#game-grid').is(':empty')) return;

  isPaused = !isPaused;
  $(this).text(isPaused ? '▶ Resume' : '⏸ Pause');

  if (isPaused) {
    clearInterval(timerInterval);
    $('.card').off('click');
  } else {
    startTimer();
    setup();
  }
});

// Updated quit functionality
$('#back-btn').on('click', function () {
  if ($('#game-grid').is(':empty')) return;

  if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
    clearInterval(timerInterval);
    $('#game-grid').empty();
    $('#game-over-popup').hide();
    $('#game-message').hide();
    $('#power-up-btn').hide();
    $('#pause-btn').text('⏸ Pause').prop('disabled', true);

    // Reset stats display
    clickCount = 0;
    matchCount = 0;
    updateStats();
  }
});

function resetGame() {
  if (matchCount > 0 && !confirm('Reset current game?')) return;
  clearInterval(timerInterval);
  $('#game-grid').empty();
  $('#game-over-popup').hide();
  $('#game-message').hide();

  // Reset game state
  clickCount = 0;
  matchCount = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  isPaused = false;

  // Update UI
  updateStats();
  $('#pause-btn').text('⏸ Pause').prop('disabled', true);
  $('#power-up-btn').hide();

  // Restart with current difficulty
  startGame(difficulty);
}