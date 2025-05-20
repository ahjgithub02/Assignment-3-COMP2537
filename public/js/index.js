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
let isPaused = false;
let gameActive = false;

$('#start-btn').on('click', () => {
  difficulty = $('#difficulty').val();
  startGame(difficulty);
});

$('#reset-btn').on('click', resetGame);
$('#power-up-btn').on('click', triggerPowerUp);

function showInitialInstructions() {
  $('#game-grid').html(`
    <div class="instruction text-center">
        <p class="fs-5">1. Select difficulty</p>
        <p class="fs-5">2. Click START to begin</p>
    </div>
`);
}

$(document).ready(function() {
  const savedTheme = localStorage.getItem('pokemonMemoryTheme') || 'light';
  $('body').removeClass('light-theme dark-theme').addClass(`${savedTheme}-theme`);
  $('#theme-select').val(savedTheme);

  $('#theme-select').on('change', function() {
      const selectedTheme = $(this).val();
      $('body').removeClass('light-theme dark-theme').addClass(`${selectedTheme}-theme`);
      localStorage.setItem('pokemonMemoryTheme', selectedTheme);
      
      updateButtonStyles(selectedTheme);
  });

  updateButtonStyles(savedTheme);
});

function updateButtonStyles(theme) {
  if (theme === 'dark') {
    $('#start-btn')
      .removeClass('btn-success')
      .addClass('btn-pokemon-green')
      .css({
        'background-color': '#66BB6A',
        'border-color': '#66BB6A',
        'color': 'white'
      });
    
    $('#power-up-btn')
      .removeClass('btn-warning')
      .addClass('btn-pokemon-yellow')
      .css({
        'background-color': '#FFD600',
        'border-color': '#FFD600',
        'color': '#212529'
      });
    
    $('#reset-btn')
      .removeClass('btn-secondary')
      .addClass('btn-outline-light');

  } else {
    $('#start-btn')
      .removeClass('btn-pokemon-green')
      .addClass('btn-success')
      .css('background-color', '').css('border-color', '').css('color', '');
    
    $('#power-up-btn')
      .removeClass('btn-pokemon-yellow')
      .addClass('btn-warning')
      .css('background-color', '').css('border-color', '').css('color', '');
    
    $('#reset-btn')
      .removeClass('btn-outline-light')
      .addClass('btn-secondary');
  }
}

$(document).ready(function () {
  $('#difficulty').val('');

  showInitialInstructions();

  clickCount = 0;
  matchCount = 0;
  timeLeft = 60;
  updateStats();

  const currentTheme = localStorage.getItem('pokemonMemoryTheme') || 'light';
  $('#power-up-btn').show().prop('disabled', true);
  $('#pause-btn').prop('disabled', true);
  $('#start-btn').prop('disabled', true);
  $('#reset-btn').prop('disabled', true);
  $('#back-btn').prop('disabled', true);

  $('#difficulty').on('change', function () {
    if ($(this).val()) {
      $('#start-btn').prop('disabled', false);
    } else {
      $('#start-btn').prop('disabled', true);
    }
  });
});

async function startGame(difficulty) {

  gameActive = true;
  clickCount = 0;
  matchCount = 0;
  powerUpsLeft = 3;
  totalPairs = difficultyMap[difficulty];

  updateStats();

  $('#reset-btn').prop('disabled', false);
  $('#pause-btn').text('⏸ Pause').prop('disabled', false);
  $('#power-up-btn').text(`Power-Up (${powerUpsLeft})`).prop('disabled', false);
  $('#back-btn').prop('disabled', false);
  updateStats();

  timeLeft = getTimeForDifficulty(difficulty);
  $('#game-grid').empty();

  try {
    const pokemonDetails = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1500')
      .then(res => res.json())
      .then(data => {
        return pickRandomUnique(data.results, totalPairs);
      });

    const cards = [];
    pokemonDetails.forEach(pokemon => {
      const id = pokemon.id;
      const imgUrl = pokemon.sprites?.other?.['official-artwork']?.front_default ||
        pokemon.sprites?.other?.home?.front_default ||
        pokemon.sprites?.front_default ||
        '/images/placeholder.png';

      cards.push(createCardElement(id, imgUrl));
      cards.push(createCardElement(id, imgUrl));
    });
    shuffle(cards).forEach(card => $('#game-grid').append(card));
    setup();
    startTimer();
  } catch (error) {
    console.error("Failed to fetch Pokémon details:", error);
    alert("Error loading Pokémon data. Please try again.");
  }
}

function createCardElement(id, frontImg) {
  return $(`
    <div class="card" data-id="${id}">
      <img class="front_face" src="${frontImg}" onerror="this.onerror=null;this.src='/images/placeholder.png'" />
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
        setTimeout(() => {
          clearInterval(timerInterval);
          showWinMessage();
        }, 500);
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
  const pairsLeft = totalPairs - matchCount;

  $('#click-count').text(clickCount);
  $('#match-count').text(matchCount);
  $('#total-pairs').text(totalPairs);
  $('#pairs-left').text(pairsLeft);
  $('#timer').text(timeLeft);
}

async function pickRandomUnique(allPokemon, totalPairs) {
  const result = [];
  const taken = new Set();

  while (result.length < totalPairs) {
    const randIndex = Math.floor(Math.random() * allPokemon.length);
    if (!taken.has(randIndex)) {
      try {
        const pokemon = await fetch(allPokemon[randIndex].url).then(res => res.json());
        if (pokemon.sprites?.front_default || 
          pokemon.sprites?.other?.['official-artwork']?.front_default) {
          result.push(pokemon);
          taken.add(randIndex);
        }
      } catch (error) {
        console.error("Skipping Pokémon (fetch failed):", error);
      }
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
  gameActive = false;
  clearInterval(timerInterval);

  $('#start-btn').prop('disabled', true);
  $('#back-btn').prop('disabled', true);
  $('#difficulty').prop('disabled', true);
  $('#power-up-btn').prop('disabled', true);
  $('#pause-btn').prop('disabled', true);
  $('#reset-btn').prop('disabled', true);
  
  $('#game-grid').hide();
  $('#game-popup').html(`
      <div class="popup-content">
          <h2 class="mb-3">🎉 You Win! 🎉</h2>
          <p class="mb-4">Matched ${matchCount}/${totalPairs} pairs!</p>
          <div class="popup-buttons d-flex gap-3 justify-content-center">
              <button id="try-again-btn" class="btn btn-primary">Try Again</button>
              <button id="new-game-btn" class="btn btn-secondary">New Game</button>
          </div>
      </div>
  `).show();
}

function showGameOver() {
  gameActive = false;
  clearInterval(timerInterval);

  $('#start-btn').prop('disabled', true);
  $('#back-btn').prop('disabled', true);
  $('#difficulty').prop('disabled', true);
  $('#power-up-btn').prop('disabled', true);
  $('#pause-btn').prop('disabled', true);
  $('#reset-btn').prop('disabled', true);

  $('#game-grid').hide();
  $('#game-popup').html(`
      <div class="popup-content">
          <h2 class="mb-3">😞 Game Over! 😞</h2>
          <p class="mb-4">Matched ${matchCount}/${totalPairs} pairs</p>
          <div class="popup-buttons d-flex gap-3 justify-content-center">
              <button id="try-again-btn" class="btn btn-primary">Try Again</button>
              <button id="new-game-btn" class="btn btn-secondary">New Game</button>
          </div>
      </div>
  `).show();
}

$(document).on('click', '#try-again-btn', function () {
  $('#game-popup').hide();

  $('#difficulty').prop('disabled', false);
  $('#start-btn').prop('disabled', false);
  $('#back-btn').prop('disabled', false);
  $('#power-up-btn').prop('disabled', false);
  $('#pause-btn').prop('disabled', false);
  $('#reset-btn').prop('disabled', false);

  $('#game-grid').show();
  startGame(difficulty);
});

$(document).on('click', '#new-game-btn', function () {
  $('#game-popup').hide();
  $('#game-grid').show();

  $('#difficulty').val('').prop('disabled', false).trigger('change');
  $('#game-grid').empty();
  showInitialInstructions();

  clearInterval(timerInterval);

  clickCount = 0;
  matchCount = 0;
  timeLeft = 60;
  gameActive = false;

  updateStats();
  $('#power-up-btn').prop('disabled', true);
  $('#pause-btn').prop('disabled', true);
  $('#reset-btn').prop('disabled', true);
  $('#start-btn').prop('disabled', true);
  $('#back-btn').prop('disabled', true);
});

$(document).on('click', '#restart-btn', resetGame);

function getTimeForDifficulty(level) {
  switch (level) {
    case 'easy': return 30;
    case 'medium': return 60;
    case 'hard': return 90;
    default: return 60;
  }
}

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

$('#back-btn').on('click', function () {
  if ($('#game-grid').is(':empty')) return;

  if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
    clearInterval(timerInterval);
    $('#game-popup').hide();
    $('#game-grid').html(`
      <div class="instruction text-center">
        <p>1. Select difficulty</p>
        <p>2. Click START to begin</p>
      </div>
    `).show();

    $('#difficulty').val('').prop('disabled', false).trigger('change');

    $('#power-up-btn').prop('disabled', true);
    $('#pause-btn').prop('disabled', true);
    $('#start-btn').prop('disabled', true);
    $('#reset-btn').prop('disabled', true);
    $('#back-btn').prop('disabled', true);

    clickCount = 0;
    matchCount = 0;
    timeLeft = 60;
    updateStats();
  }
});

function resetGame() {
  if (!gameActive) return;

  if (confirm('Reset current game?')) {
    clearInterval(timerInterval);
    clickCount = 0;
    matchCount = 0;
    timeLeft = getTimeForDifficulty(difficulty);
    updateStats();
    $('#power-up-btn').text(`Power-Up (${powerUpsLeft})`).prop('disabled', false);
    startGame(difficulty);
  }
}