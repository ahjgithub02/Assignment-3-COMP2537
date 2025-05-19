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

function startGame(difficulty) {
  $('#game-over-popup').hide();
  $('#game-message').hide();
  clickCount = 0;
  matchCount = 0;
  powerUpsLeft = 3;
  updateStats();

  totalPairs = difficultyMap[difficulty];
  timeLeft = getTimeForDifficulty(difficulty);
  $('#game-grid').empty();
  $('#power-up-btn').text(`Power-Up (${powerUpsLeft})`).prop('disabled', false);

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
        const imgUrl = pokemon.sprites.other['official-artwork'].front_default;
        const id = pokemon.id;
        if (!imgUrl) return; // skip broken image

        cards.push(createCardElement(id, imgUrl));
        cards.push(createCardElement(id, imgUrl));
      });
      shuffle(cards).forEach(card => $('#game-grid').append(card));
      setup(); // bind click logic
      startTimer();
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

function pickRandomUnique(arr, n) {
  const result = [];
  const taken = new Set();
  while (result.length < n) {
    const randIndex = Math.floor(Math.random() * arr.length);
    if (!taken.has(randIndex)) {
      result.push(arr[randIndex]);
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
  $('#game-message').removeClass('hidden');
  $('#message-text').text("You Win!");
}

function showGameOver() {
  $('.card').off('click');
  $('#game-over-popup').show();
}

function resetGame() {
  clearInterval(timerInterval);
  startGame(difficulty);
}

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