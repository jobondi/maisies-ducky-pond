// Maisie's Ducky Pond — App Controller (navigation, setup, PWA)
(function () {
  'use strict';

  var currentScreen = 'title';
  var playerCount = 1;
  var playerNames = [];
  var gameMode = 'shapes';

  // --- DOM refs ---
  var screens = {
    title: document.getElementById('screen-title'),
    setup: document.getElementById('screen-setup'),
    game: document.getElementById('screen-game'),
    results: document.getElementById('screen-results'),
  };

  var btnStart = document.getElementById('btn-start');
  var btnPlay = document.getElementById('btn-play');
  var btnBackSetup = document.getElementById('btn-back-setup');
  var btnBackGame = document.getElementById('btn-back-game');
  var btnPlayAgain = document.getElementById('btn-play-again');
  var btnBackHome = document.getElementById('btn-back-home');
  var countButtons = document.querySelectorAll('.btn-count');
  var playerNamesArea = document.getElementById('player-names-area');

  // --- Navigation ---
  function navigateTo(screenId) {
    if (!screens[screenId]) return;
    if (screens[currentScreen]) screens[currentScreen].classList.remove('active');
    screens[screenId].classList.add('active');
    currentScreen = screenId;

    if (screenId === 'results') {
      DuckyUI.showResults();
    }
  }

  window.duckNavigateTo = navigateTo;

  // --- Title screen ---
  btnStart.addEventListener('click', function () {
    navigateTo('setup');
  });

  // --- Setup screen ---
  btnBackSetup.addEventListener('click', function () {
    navigateTo('title');
  });

  // Player count buttons
  countButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      countButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      playerCount = parseInt(btn.getAttribute('data-count'), 10);
      rebuildNameInputs();
    });
  });

  // Mode buttons (shapes vs numbers)
  var modeButtons = document.querySelectorAll('.btn-mode');
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      gameMode = btn.getAttribute('data-mode');
    });
  });

  function rebuildNameInputs() {
    var html = '';
    for (var i = 0; i < playerCount; i++) {
      html += '<div class="name-input-wrap">';
      html += '<label>Player ' + (i + 1) + '</label>';
      html += '<input type="text" class="input-ducky player-name-input" placeholder="Name..." maxlength="15" autocomplete="off">';
      html += '</div>';
    }
    playerNamesArea.innerHTML = html;

    // Restore saved names if available
    var saved = JSON.parse(localStorage.getItem('ducky_player_names') || '[]');
    var inputs = playerNamesArea.querySelectorAll('.player-name-input');
    inputs.forEach(function (inp, i) {
      if (saved[i]) inp.value = saved[i];
      inp.addEventListener('input', checkPlayReady);
    });
    checkPlayReady();
  }

  function checkPlayReady() {
    var inputs = playerNamesArea.querySelectorAll('.player-name-input');
    var allFilled = true;
    inputs.forEach(function (inp) {
      if (!inp.value.trim()) allFilled = false;
    });
    btnPlay.disabled = !allFilled;
  }

  // Start game
  btnPlay.addEventListener('click', function () {
    var inputs = playerNamesArea.querySelectorAll('.player-name-input');
    playerNames = [];
    inputs.forEach(function (inp) {
      playerNames.push(inp.value.trim());
    });

    // Save names
    localStorage.setItem('ducky_player_names', JSON.stringify(playerNames));

    // Create game
    var gameState = DuckyEngine.createGame({
      numPairs: 8,
      playerNames: playerNames,
      mode: gameMode,
    });

    navigateTo('game');
    // Small delay so the screen transition finishes before we measure pond size
    setTimeout(function () {
      DuckyUI.init(gameState);
    }, 100);
  });

  // --- Game screen ---
  btnBackGame.addEventListener('click', function () {
    DuckyUI.cleanup();
    navigateTo('setup');
  });

  // --- Results screen ---
  btnPlayAgain.addEventListener('click', function () {
    var gameState = DuckyEngine.createGame({
      numPairs: 8,
      playerNames: playerNames,
      mode: gameMode,
    });
    navigateTo('game');
    setTimeout(function () {
      DuckyUI.init(gameState);
    }, 100);
  });

  btnBackHome.addEventListener('click', function () {
    navigateTo('title');
  });

  // --- PWA service worker ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {
      // Service worker registration failed — app still works
    });
  }

  // --- Lock orientation ---
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait').catch(function () { });
  }

  // --- Initialize setup screen inputs ---
  rebuildNameInputs();
})();
