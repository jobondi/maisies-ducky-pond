var DuckyEngine = require('../js/game-engine.js');

describe('DuckyEngine', function () {

  describe('createGame', function () {
    test('creates game with default pairs', function () {
      var state = DuckyEngine.createGame({ playerNames: ['Maisie'] });
      expect(state.numPairs).toBe(DuckyEngine.DEFAULT_PAIRS);
      expect(state.ducks.length).toBe(DuckyEngine.DEFAULT_PAIRS * 2);
      expect(state.scores).toEqual([0]);
      expect(state.currentPlayer).toBe(0);
      expect(state.phase).toBe('picking');
      expect(state.matchesFound).toBe(0);
    });

    test('creates game with custom pair count', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      expect(state.numPairs).toBe(6);
      expect(state.ducks.length).toBe(12);
    });

    test('clamps pairs to min/max', function () {
      var low = DuckyEngine.createGame({ numPairs: 1, playerNames: ['A'] });
      expect(low.numPairs).toBe(DuckyEngine.MIN_PAIRS);

      var high = DuckyEngine.createGame({ numPairs: 100, playerNames: ['A'] });
      expect(high.numPairs).toBe(DuckyEngine.MAX_PAIRS);
    });

    test('creates multiple players', function () {
      var state = DuckyEngine.createGame({ playerNames: ['Maisie', 'Ada', 'Joe'] });
      expect(state.numPlayers).toBe(3);
      expect(state.scores).toEqual([0, 0, 0]);
      expect(state.playerNames).toEqual(['Maisie', 'Ada', 'Joe']);
    });

    test('defaults to Player 1 if no names given', function () {
      var state = DuckyEngine.createGame({});
      expect(state.playerNames).toEqual(['Player 1']);
    });

    test('each duck pair shares a matchValue', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      var valueCounts = {};
      state.ducks.forEach(function (d) {
        valueCounts[d.matchValue] = (valueCounts[d.matchValue] || 0) + 1;
      });
      Object.values(valueCounts).forEach(function (count) {
        expect(count).toBe(2);
      });
    });

    test('every duck has a unique character (no duplicate characters)', function () {
      var state = DuckyEngine.createGame({ numPairs: 8, playerNames: ['A'] });
      var names = state.ducks.map(function (d) { return d.character.name; });
      var unique = names.filter(function (n, i) { return names.indexOf(n) === i; });
      expect(unique.length).toBe(16);
    });

    test('all ducks start not picked and not matched', function () {
      var state = DuckyEngine.createGame({ playerNames: ['A'] });
      state.ducks.forEach(function (d) {
        expect(d.picked).toBe(false);
        expect(d.matched).toBe(false);
      });
    });
  });

  describe('pickDuck', function () {
    test('first pick returns first-pick event', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      var duckId = state.ducks[0].id;
      var result = DuckyEngine.pickDuck(state, duckId);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('first-pick');
      expect(result.state.firstPick).toBe(duckId);
    });

    test('cannot pick same duck twice', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      var duckId = state.ducks[0].id;
      var r1 = DuckyEngine.pickDuck(state, duckId);
      var r2 = DuckyEngine.pickDuck(r1.state, duckId);
      expect(r2.valid).toBe(false);
    });

    test('cannot pick already matched duck', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      // Manually mark a duck as matched
      state.ducks[0].matched = true;
      var result = DuckyEngine.pickDuck(state, state.ducks[0].id);
      expect(result.valid).toBe(false);
    });

    test('cannot pick when not in picking phase', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      state.phase = 'revealing';
      var result = DuckyEngine.pickDuck(state, state.ducks[0].id);
      expect(result.valid).toBe(false);
    });

    test('matching pair returns match event', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      // Find a matching pair
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue === first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      expect(r2.valid).toBe(true);
      expect(r2.event).toBe('match');
      expect(r2.state.scores[0]).toBe(1);
      expect(r2.state.matchesFound).toBe(1);
    });

    test('non-matching pair returns no-match event', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      // Find a non-matching pair
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue !== first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      expect(r2.valid).toBe(true);
      expect(r2.event).toBe('no-match');
      expect(r2.state.scores[0]).toBe(0);
    });

    test('picking is immutable (original state unchanged)', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      var original = JSON.parse(JSON.stringify(state));
      DuckyEngine.pickDuck(state, state.ducks[0].id);
      expect(state).toEqual(original);
    });
  });

  describe('resolveTurn', function () {
    test('advances player on no-match', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A', 'B'] });
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue !== first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      var resolved = DuckyEngine.resolveTurn(r2.state);
      expect(resolved.currentPlayer).toBe(1);
      expect(resolved.phase).toBe('picking');
      expect(resolved.firstPick).toBeNull();
      expect(resolved.secondPick).toBeNull();
    });

    test('same player goes again on match', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A', 'B'] });
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue === first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      var resolved = DuckyEngine.resolveTurn(r2.state);
      expect(resolved.currentPlayer).toBe(0);
    });

    test('un-picks ducks on no-match', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue !== first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      var resolved = DuckyEngine.resolveTurn(r2.state);
      var d1 = DuckyEngine.getDuck(resolved, first.id);
      var d2 = DuckyEngine.getDuck(resolved, second.id);
      expect(d1.picked).toBe(false);
      expect(d2.picked).toBe(false);
    });

    test('wraps player around', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A', 'B'] });
      state.currentPlayer = 1;
      var first = state.ducks[0];
      var second = null;
      for (var i = 1; i < state.ducks.length; i++) {
        if (state.ducks[i].matchValue !== first.matchValue) {
          second = state.ducks[i];
          break;
        }
      }
      var r1 = DuckyEngine.pickDuck(state, first.id);
      var r2 = DuckyEngine.pickDuck(r1.state, second.id);
      var resolved = DuckyEngine.resolveTurn(r2.state);
      expect(resolved.currentPlayer).toBe(0);
    });
  });

  describe('game-over detection', function () {
    test('last match triggers game-over', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      // Match all but one pair manually
      for (var i = 0; i < state.ducks.length; i++) {
        state.ducks[i].matched = true;
      }
      state.matchesFound = 5;
      // Un-match last pair
      state.ducks[state.ducks.length - 2].matched = false;
      state.ducks[state.ducks.length - 1].matched = false;

      // Make sure last two share a matchValue
      var lastVal = state.ducks[state.ducks.length - 2].matchValue;
      state.ducks[state.ducks.length - 1].matchValue = lastVal;

      var r1 = DuckyEngine.pickDuck(state, state.ducks[state.ducks.length - 2].id);
      var r2 = DuckyEngine.pickDuck(r1.state, state.ducks[state.ducks.length - 1].id);
      expect(r2.event).toBe('game-over');
      expect(r2.state.phase).toBe('done');
    });
  });

  describe('getResults', function () {
    test('single player results', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['Maisie'] });
      state.scores = [6];
      state.turnCount = 10;
      var results = DuckyEngine.getResults(state);
      expect(results.winners).toEqual([0]);
      expect(results.isTie).toBe(false);
      expect(results.totalTurns).toBe(10);
    });

    test('determines winner in multi-player', function () {
      var state = DuckyEngine.createGame({ numPairs: 8, playerNames: ['A', 'B'] });
      state.scores = [3, 5];
      var results = DuckyEngine.getResults(state);
      expect(results.winners).toEqual([1]);
      expect(results.isTie).toBe(false);
    });

    test('detects tie', function () {
      var state = DuckyEngine.createGame({ numPairs: 8, playerNames: ['A', 'B'] });
      state.scores = [4, 4];
      var results = DuckyEngine.getResults(state);
      expect(results.winners).toEqual([0, 1]);
      expect(results.isTie).toBe(true);
    });
  });

  describe('remainingDucks', function () {
    test('returns only unmatched ducks', function () {
      var state = DuckyEngine.createGame({ numPairs: 6, playerNames: ['A'] });
      state.ducks[0].matched = true;
      state.ducks[1].matched = true;
      var remaining = DuckyEngine.remainingDucks(state);
      expect(remaining.length).toBe(10);
    });
  });

  describe('shuffle', function () {
    test('returns array of same length', function () {
      var arr = [1, 2, 3, 4, 5];
      var shuffled = DuckyEngine.shuffle(arr);
      expect(shuffled.length).toBe(5);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    test('does not mutate original', function () {
      var arr = [1, 2, 3];
      DuckyEngine.shuffle(arr);
      expect(arr).toEqual([1, 2, 3]);
    });
  });
});
