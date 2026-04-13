// Maisie's Ducky Pond — Game Engine (pure logic, no DOM)
(function () {
  'use strict';

  // --- Duck character catalog ---
  // Custom SVG rubber duck characters, inspired by real Jeep ducking rubber ducks
  // The Queen Duck is special — matching her will trigger a bonus (coming soon!)
  var QUEEN_DUCK = { svg: 'icons/ducks/queen.svg', name: 'Queen Duck', isQueen: true };

  var DUCK_CHARACTERS = [
    QUEEN_DUCK,
    { svg: 'icons/ducks/pirate.svg', name: 'Pirate Duck' },
    { svg: 'icons/ducks/chef.svg', name: 'Chef Duck' },
    { svg: 'icons/ducks/devil.svg', name: 'Devil Duck' },
    { svg: 'icons/ducks/wizard.svg', name: 'Wizard Duck' },
    { svg: 'icons/ducks/firefighter.svg', name: 'Firefighter Duck' },
    { svg: 'icons/ducks/cowboy.svg', name: 'Cowboy Duck' },
    { svg: 'icons/ducks/princess.svg', name: 'Princess Duck' },
    { svg: 'icons/ducks/superhero.svg', name: 'Superhero Duck' },
    { svg: 'icons/ducks/astronaut.svg', name: 'Astronaut Duck' },
    { svg: 'icons/ducks/rocker.svg', name: 'Rocker Duck' },
    { svg: 'icons/ducks/surfer.svg', name: 'Surfer Duck' },
    { svg: 'icons/ducks/ninja.svg', name: 'Ninja Duck' },
    { svg: 'icons/ducks/spooky.svg', name: 'Spooky Duck' },
    { svg: 'icons/ducks/doctor.svg', name: 'Doctor Duck' },
    { svg: 'icons/ducks/unicorn.svg', name: 'Unicorn Duck' },
    { svg: 'icons/ducks/dragon.svg', name: 'Dragon Duck' },
    { svg: 'icons/ducks/mermaid.svg', name: 'Mermaid Duck' },
    { svg: 'icons/ducks/robot.svg', name: 'Robot Duck' },
    { svg: 'icons/ducks/froggy.svg', name: 'Froggy Duck' },
  ];

  // --- Shapes catalog ---
  var SHAPES = [
    { key: 'circle',   name: 'Circle',   color: '#C62828' },
    { key: 'square',   name: 'Square',   color: '#1565C0' },
    { key: 'triangle', name: 'Triangle', color: '#2E7D32' },
    { key: 'moon',     name: 'Moon',     color: '#4A148C' },
    { key: 'diamond',  name: 'Diamond',  color: '#6A1B9A' },
    { key: 'star',     name: 'Star',     color: '#E65100' },
    { key: 'hexagon',  name: 'Hexagon',  color: '#00695C' },
    { key: 'egg',      name: 'Egg',      color: '#AD1457' },
  ];

  // --- Constants ---
  var MIN_PAIRS = 6;
  var MAX_PAIRS = 8;
  var DEFAULT_PAIRS = 8;

  // --- Helpers ---
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  // --- Game State Factory ---
  function createGame(options) {
    var numPairs = (options && options.numPairs) || DEFAULT_PAIRS;
    if (numPairs < MIN_PAIRS) numPairs = MIN_PAIRS;
    if (numPairs > MAX_PAIRS) numPairs = MAX_PAIRS;

    var playerNames = (options && options.playerNames) || ['Player 1'];
    var numPlayers = playerNames.length;
    var mode = (options && options.mode) || 'shapes';

    // Pick unique duck characters (one per duck, no duplicates)
    var totalDucks = numPairs * 2;
    var characters = shuffle(DUCK_CHARACTERS).slice(0, totalDucks);

    // Build match values: shapes or numbers
    var matchSymbols;
    if (mode === 'shapes') {
      matchSymbols = shuffle(SHAPES).slice(0, numPairs);
    } else {
      matchSymbols = [];
      for (var n = 1; n <= numPairs; n++) {
        matchSymbols.push(n);
      }
    }

    // Each symbol appears exactly twice
    var matchValues = [];
    for (var i = 0; i < numPairs; i++) {
      matchValues.push(matchSymbols[i]);
      matchValues.push(matchSymbols[i]);
    }
    matchValues = shuffle(matchValues);

    var ducks = [];
    for (var i = 0; i < totalDucks; i++) {
      var mv = matchValues[i];
      ducks.push({
        id: i,
        character: characters[i],
        matchValue: mode === 'shapes' ? mv.key : mv,
        matchDisplay: mv,
        picked: false,
        matched: false,
      });
    }
    ducks = shuffle(ducks);

    return {
      ducks: ducks,
      numPairs: numPairs,
      mode: mode,
      playerNames: playerNames,
      numPlayers: numPlayers,
      currentPlayer: 0,
      scores: playerNames.map(function () { return 0; }),
      matchesFound: 0,
      firstPick: null,    // duck id of first pick this turn
      secondPick: null,   // duck id of second pick this turn
      phase: 'picking',   // 'picking', 'revealing', 'done'
      turnCount: 0,
    };
  }

  // --- Find duck by id ---
  function getDuck(state, duckId) {
    for (var i = 0; i < state.ducks.length; i++) {
      if (state.ducks[i].id === duckId) return state.ducks[i];
    }
    return null;
  }

  // --- Pick a duck ---
  // Returns: { valid, state, event }
  // event: null, 'first-pick', 'match', 'no-match', 'game-over'
  function pickDuck(state, duckId) {
    if (state.phase !== 'picking') {
      return { valid: false, state: state, event: null };
    }

    var duck = getDuck(state, duckId);
    if (!duck || duck.matched || duck.picked) {
      return { valid: false, state: state, event: null };
    }

    // Don't allow picking the same duck twice in one turn
    if (state.firstPick !== null && state.firstPick === duckId) {
      return { valid: false, state: state, event: null };
    }

    // Clone state for immutability
    var newState = JSON.parse(JSON.stringify(state));
    var newDuck = getDuck(newState, duckId);
    newDuck.picked = true;

    if (newState.firstPick === null) {
      // First pick of the turn
      newState.firstPick = duckId;
      return { valid: true, state: newState, event: 'first-pick' };
    }

    // Second pick
    newState.secondPick = duckId;
    newState.phase = 'revealing';
    newState.turnCount++;

    var firstDuck = getDuck(newState, newState.firstPick);

    if (firstDuck.matchValue === newDuck.matchValue) {
      // Match!
      firstDuck.matched = true;
      newDuck.matched = true;
      var isQueenMatch = !!(firstDuck.character.isQueen);
      newState.scores[newState.currentPlayer] += isQueenMatch ? 1001 : 1;
      newState.matchesFound++;

      if (newState.matchesFound >= newState.numPairs) {
        newState.phase = 'done';
        return { valid: true, state: newState, event: 'game-over', isQueenMatch: isQueenMatch };
      }
      return { valid: true, state: newState, event: 'match', isQueenMatch: isQueenMatch };
    }

    // No match
    return { valid: true, state: newState, event: 'no-match' };
  }

  // --- Resolve turn (after reveal animation) ---
  // Resets picked state and advances turn if no match
  function resolveTurn(state) {
    var newState = JSON.parse(JSON.stringify(state));

    var firstDuck = getDuck(newState, newState.firstPick);
    var secondDuck = getDuck(newState, newState.secondPick);

    // If they didn't match, un-pick them
    if (!firstDuck.matched) {
      firstDuck.picked = false;
      secondDuck.picked = false;
      // Advance to next player
      newState.currentPlayer = (newState.currentPlayer + 1) % newState.numPlayers;
    }
    // If they matched, current player goes again (don't advance)

    newState.firstPick = null;
    newState.secondPick = null;
    newState.phase = 'picking';

    return newState;
  }

  // --- Get results ---
  function getResults(state) {
    var maxScore = 0;
    var winners = [];
    for (var i = 0; i < state.numPlayers; i++) {
      if (state.scores[i] > maxScore) {
        maxScore = state.scores[i];
        winners = [i];
      } else if (state.scores[i] === maxScore) {
        winners.push(i);
      }
    }
    return {
      scores: state.scores.slice(),
      playerNames: state.playerNames.slice(),
      winners: winners,
      isTie: winners.length > 1,
      totalTurns: state.turnCount,
    };
  }

  // --- Remaining ducks (not matched) ---
  function remainingDucks(state) {
    return state.ducks.filter(function (d) { return !d.matched; });
  }

  // --- Public API ---
  var DuckyEngine = {
    QUEEN_DUCK: QUEEN_DUCK,
    DUCK_CHARACTERS: DUCK_CHARACTERS,
    SHAPES: SHAPES,
    MIN_PAIRS: MIN_PAIRS,
    MAX_PAIRS: MAX_PAIRS,
    DEFAULT_PAIRS: DEFAULT_PAIRS,
    createGame: createGame,
    pickDuck: pickDuck,
    resolveTurn: resolveTurn,
    getResults: getResults,
    getDuck: getDuck,
    remainingDucks: remainingDucks,
    shuffle: shuffle,
  };

  // Export for browser and Node
  if (typeof window !== 'undefined') {
    window.DuckyEngine = DuckyEngine;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DuckyEngine;
  }
})();
