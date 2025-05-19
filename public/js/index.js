const difficultyMap = {
  easy: 4,
  medium: 6,
  hard: 8
};

let difficulty = 'medium';

$('#start-btn').on('click', () => {
  difficulty = $('#difficulty').val();
  startGame(difficulty);
});

function startGame(difficulty) {
  const numPairs = difficultyMap[difficulty];
  $('#game-grid').empty(); // Clear old cards

  fetch('https://pokeapi.co/api/v2/pokemon?limit=1500')
    .then(res => res.json())
    .then(data => {
      const allPokemon = data.results;
      const selected = pickRandomUnique(allPokemon, numPairs);
      return Promise.all(selected.map(p => fetch(p.url).then(res => res.json())));
    })
    .then(pokemonDetails => {
      const cards = [];

      pokemonDetails.forEach(pokemon => {
        const imgUrl = pokemon.sprites.other['official-artwork'].front_default;
        const id = pokemon.id;

        // Create 2 cards per Pokémon
        cards.push(createCardElement(id, imgUrl));
        cards.push(createCardElement(id, imgUrl));
      });

      shuffle(cards).forEach(card => $('#game-grid').append(card));
      setup(); // Set up click handling for the new cards
    });
}

function createCardElement(id, frontImg) {
  const card = $(`
    <div class="card" data-id="${id}">
      <img class="front_face" src="${frontImg}" />
      <img class="back_face" src="/images/back.webp" />
    </div>
  `);
  return card;
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

// Matching & Flip Logic
function setup () {
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;

  $(".card").on("click", function () {
    if (lockBoard || $(this).hasClass("flip")) return;

    $(this).addClass("flip");

    if (!firstCard) {
      firstCard = $(this);
      return;
    }

    secondCard = $(this);
    lockBoard = true;

    const id1 = firstCard.data("id");
    const id2 = secondCard.data("id");

    if (id1 === id2) {
      firstCard.off("click");
      secondCard.off("click");
      resetBoard();
    } else {
      setTimeout(() => {
        firstCard.removeClass("flip");
        secondCard.removeClass("flip");
        resetBoard();
      }, 1000);
    }
  });

  function resetBoard() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
  }
}