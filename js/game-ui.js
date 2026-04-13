// Maisie's Ducky Pond — Game UI Controller
(function () {
  'use strict';

  var state = null;
  var isSwimming = false;
  var swimAngle = 0;
  var swimRAF = null;
  var duckElements = [];
  var revealTimeout = null;
  var animating = false;

  // --- DOM refs ---
  var pond = document.getElementById('pond');
  var turnIndicator = document.getElementById('turn-indicator');
  var scoreDisplay = document.getElementById('score-display');
  var btnToggleSwim = document.getElementById('btn-toggle-swim');
  var dockSlot1 = document.getElementById('dock-slot-1');
  var dockSlot2 = document.getElementById('dock-slot-2');
  var flipResult = document.getElementById('flip-result');

  // --- Audio context for quack sounds ---
  var audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playQuack(pitch) {
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch || 600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio not available
    }
  }

  function playMatchSound() {
    try {
      var ctx = getAudioCtx();
      [523, 659, 784].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch (e) { }
  }

  function playNoMatchSound() {
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) { }
  }

  // Background pond music (gentle water sounds)
  var musicOsc = null;
  var musicGain = null;
  var musicLFO = null;

  function startMusic() {
    try {
      var ctx = getAudioCtx();
      // Gentle ambient water-like sound
      musicOsc = ctx.createOscillator();
      musicGain = ctx.createGain();
      musicLFO = ctx.createOscillator();
      var lfoGain = ctx.createGain();

      musicOsc.type = 'sine';
      musicOsc.frequency.value = 220;
      musicGain.gain.value = 0.06;

      musicLFO.type = 'sine';
      musicLFO.frequency.value = 0.3;
      lfoGain.gain.value = 30;

      musicLFO.connect(lfoGain);
      lfoGain.connect(musicOsc.frequency);
      musicOsc.connect(musicGain);
      musicGain.connect(ctx.destination);

      musicOsc.start();
      musicLFO.start();
    } catch (e) { }
  }

  function stopMusic() {
    try {
      if (musicOsc) { musicOsc.stop(); musicOsc = null; }
      if (musicLFO) { musicLFO.stop(); musicLFO = null; }
      musicGain = null;
    } catch (e) { }
  }

  // --- Position ducks in a circle ---
  function getPondRadius() {
    var pondRect = pond.getBoundingClientRect();
    // Ducks orbit between island edge and pond edge
    // Island is 26% of pond, so radius ~37% of pond from center
    return pondRect.width * 0.34;
  }

  function positionDucks() {
    var activeDucks = DuckyEngine.remainingDucks(state);
    var total = activeDucks.length;
    if (total === 0) return;

    var pondRect = pond.getBoundingClientRect();
    var cx = pondRect.width / 2;
    var cy = pondRect.height / 2;
    var radius = getPondRadius();
    var duckSize = 56;

    duckElements.forEach(function (el) {
      var id = parseInt(el.getAttribute('data-id'), 10);
      var duck = DuckyEngine.getDuck(state, id);
      if (!duck || duck.matched) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';

      // Find this duck's index among active ducks
      var idx = -1;
      for (var i = 0; i < activeDucks.length; i++) {
        if (activeDucks[i].id === id) { idx = i; break; }
      }
      if (idx === -1) { el.style.display = 'none'; return; }

      var angle = (2 * Math.PI * idx / total) + swimAngle;
      var x = cx + radius * Math.cos(angle) - duckSize / 2;
      var y = cy + radius * Math.sin(angle) - duckSize / 2;

      el.style.left = x + 'px';
      el.style.top = y + 'px';

      // Slight wobble
      var wobble = Math.sin(swimAngle * 3 + idx) * 3;
      el.style.transform = 'translateY(' + wobble + 'px)';
    });
  }

  // --- Swimming animation loop ---
  function swimLoop(timestamp) {
    if (!isSwimming) return;
    swimAngle += 0.004; // slow rotation
    positionDucks();
    swimRAF = requestAnimationFrame(swimLoop);
  }

  function startSwimming() {
    isSwimming = true;
    btnToggleSwim.innerHTML = '&#x23F8; Pause';
    btnToggleSwim.classList.add('active');
    startMusic();
    duckElements.forEach(function (el) { el.classList.add('swimming'); });
    swimRAF = requestAnimationFrame(swimLoop);
  }

  function stopSwimming() {
    isSwimming = false;
    btnToggleSwim.innerHTML = '&#x25B6; Resume';
    btnToggleSwim.classList.remove('active');
    stopMusic();
    if (swimRAF) { cancelAnimationFrame(swimRAF); swimRAF = null; }
    duckElements.forEach(function (el) { el.classList.remove('swimming'); });
  }

  // --- Render ducks into pond ---
  function renderDucks() {
    // Remove old duck elements
    duckElements.forEach(function (el) { el.remove(); });
    duckElements = [];

    state.ducks.forEach(function (duck) {
      var el = document.createElement('div');
      el.className = 'duck';
      el.setAttribute('data-id', duck.id);

      var img = document.createElement('img');
      img.className = 'duck-img';
      img.src = duck.character.svg;
      img.alt = duck.character.name;
      img.draggable = false;
      el.appendChild(img);

      var ripple = document.createElement('span');
      ripple.className = 'duck-ripple';
      el.appendChild(ripple);

      el.addEventListener('click', function () {
        onDuckClick(duck.id);
      });

      pond.appendChild(el);
      duckElements.push(el);
    });

    positionDucks();
  }

  // --- Update HUD ---
  function updateHUD() {
    turnIndicator.textContent = state.playerNames[state.currentPlayer] + "'s turn";

    var html = '';
    for (var i = 0; i < state.numPlayers; i++) {
      var cls = i === state.currentPlayer ? 'score-badge active-player' : 'score-badge';
      html += '<div class="' + cls + '">';
      html += state.playerNames[i] + ': ' + state.scores[i];
      html += '</div>';
    }
    scoreDisplay.innerHTML = html;
  }

  // Track pond elements for flying back
  var pickedPondEl1 = null;
  var pickedPondEl2 = null;

  // --- Fly duck from pond to flip area ---
  function flyDuckToSlot(pondEl, flipEl, callback) {
    var pondRect = pondEl.getBoundingClientRect();
    var flipRect = flipEl.getBoundingClientRect();

    // Create a flying clone
    var flyer = document.createElement('div');
    flyer.className = 'duck-flying';
    var img = pondEl.querySelector('img');
    var flyImg = document.createElement('img');
    flyImg.src = img.src;
    flyImg.alt = img.alt;
    flyer.appendChild(flyImg);

    // Start at pond duck position
    flyer.style.left = pondRect.left + 'px';
    flyer.style.top = pondRect.top + 'px';
    document.body.appendChild(flyer);

    // Hide the pond duck
    pondEl.style.opacity = '0';

    // Fly to dock slot center, scale up to dock size
    requestAnimationFrame(function () {
      flyer.style.left = (flipRect.left + flipRect.width / 2 - 28) + 'px';
      flyer.style.top = (flipRect.top + flipRect.height / 2 - 28) + 'px';
      flyer.style.transform = 'scale(1.7)';
    });

    // When arrived, remove flyer and run callback
    setTimeout(function () {
      flyer.remove();
      if (callback) callback();
    }, 550);
  }

  // --- Duck click handler ---
  function onDuckClick(duckId) {
    if (state.phase !== 'picking' || animating) return;

    var result = DuckyEngine.pickDuck(state, duckId);
    if (!result.valid) return;

    state = result.state;
    playQuack(result.event === 'first-pick' ? 600 : 500);

    // Find the pond element
    var el = duckElements.filter(function (e) {
      return parseInt(e.getAttribute('data-id'), 10) === duckId;
    })[0];
    if (el) el.classList.add('selected');

    if (result.event === 'first-pick') {
      pickedPondEl1 = el;
      pickedPondEl2 = null;
      var firstDuck = DuckyEngine.getDuck(state, duckId);
      placeDuckOnDock(el, dockSlot1, firstDuck, REVEAL_DELAY_1);
      return;
    }

    // Second pick - lock input during reveal/match/no-match animations
    animating = true;
    pickedPondEl2 = el;
    var secondDuck = DuckyEngine.getDuck(state, duckId);
    var eventResult = result;
    placeDuckOnDock(el, dockSlot2, secondDuck, REVEAL_DELAY_2, function () {
      if (eventResult.event === 'match' || eventResult.event === 'game-over') {
        handleMatch(eventResult);
      } else {
        handleNoMatch(eventResult);
      }
    });
  }

  var REVEAL_DELAY_1 = 1000;  // first duck: 1s on dock before flip
  var REVEAL_DELAY_2 = 1500;  // second duck: 1.5s for suspense
  var NO_MATCH_LINGER = 1250; // show ducks 1.25s after flipping back

  // --- Shape SVG rendering ---
  function renderShapeSVG(shape) {
    var paths = {
      circle:   '<circle cx="25" cy="25" r="20" fill="' + shape.color + '"/>',
      square:   '<rect x="5" y="5" width="40" height="40" rx="3" fill="' + shape.color + '"/>',
      triangle: '<polygon points="25,3 47,44 3,44" fill="' + shape.color + '"/>',
      moon:     '<circle cx="23" cy="25" r="18" fill="' + shape.color + '"/><circle cx="33" cy="22" r="14" fill="#fff"/>',
      diamond:  '<polygon points="25,2 46,25 25,48 4,25" fill="' + shape.color + '"/>',
      star:     '<polygon points="25,2 31,18 48,18 34,28 39,45 25,35 11,45 16,28 2,18 19,18" fill="' + shape.color + '"/>',
      hexagon:  '<polygon points="25,3 44,14 44,36 25,47 6,36 6,14" fill="' + shape.color + '"/>',
      egg:      '<ellipse cx="25" cy="27" rx="17" ry="21" fill="' + shape.color + '"/>',
    };
    return '<svg viewBox="0 0 50 50" width="52" height="52" xmlns="http://www.w3.org/2000/svg">' + (paths[shape.key] || '') + '</svg>';
  }

  // --- Place a duck on the dock ---
  function buildDockDuck(duck, matchDisplay) {
    var wrapper = document.createElement('div');
    wrapper.className = 'dock-duck';

    var front = document.createElement('div');
    front.className = 'dock-duck-front';
    var img = document.createElement('img');
    img.src = duck.svg;
    img.alt = duck.name;
    img.draggable = false;
    front.appendChild(img);

    var back = document.createElement('div');
    back.className = 'dock-duck-back';
    if (matchDisplay && typeof matchDisplay === 'object' && matchDisplay.key) {
      // Shape mode
      back.innerHTML = renderShapeSVG(matchDisplay);
    } else if (matchDisplay !== undefined && matchDisplay !== null) {
      // Number mode
      back.textContent = matchDisplay;
    } else {
      // Fallback - should not happen
      back.textContent = '?';
    }

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    return wrapper;
  }

  function placeDuckOnDock(pondEl, slot, duck, revealDelay, afterFlipCallback) {
    // Clear the slot
    slot.innerHTML = '';
    flipResult.textContent = '';
    flipResult.className = 'flip-result';

    // Fly duck from pond to dock slot
    flyDuckToSlot(pondEl, slot, function () {
      // Build the dock duck in the slot
      var dockDuck = buildDockDuck(duck.character, duck.matchDisplay);
      slot.appendChild(dockDuck);

      if (revealDelay > 0) {
        // Show duck character, then flip to reveal shape/number
        setTimeout(function () {
          dockDuck.classList.add('flipped');
          if (afterFlipCallback) {
            setTimeout(afterFlipCallback, 650);
          }
        }, revealDelay);
      }
    });
  }

  function clearDock() {
    dockSlot1.innerHTML = '';
    dockSlot2.innerHTML = '';
    flipResult.textContent = '';
    flipResult.className = 'flip-result';
  }

  // --- Confetti burst ---
  function burstConfetti(x, y, count) {
    var colors = ['#E53935', '#FFD54F', '#43A047', '#1E88E5', '#FF8F00', '#8E24AA', '#00ACC1', '#F48FB1'];
    for (var i = 0; i < count; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = x + 'px';
      piece.style.top = y + 'px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      // Random spread direction
      var angle = (Math.random() * 360) * Math.PI / 180;
      var dist = 40 + Math.random() * 80;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist - 60; // bias upward
      piece.style.animation = 'none';
      document.body.appendChild(piece);
      // Trigger custom animation via inline style
      requestAnimationFrame(function (p, ddx, ddy) {
        return function () {
          p.style.transition = 'all 1s ease-out';
          p.style.left = (parseFloat(p.style.left) + ddx) + 'px';
          p.style.top = (parseFloat(p.style.top) + ddy) + 'px';
          p.style.transform = 'rotate(' + (Math.random() * 720 - 360) + 'deg) scale(0.2)';
          p.style.opacity = '0';
        };
      }(piece, dx, dy));
      setTimeout(function (p) { return function () { p.remove(); }; }(piece), 1100);
    }
  }

  // --- Fly duck from dock to scoreboard ---
  function flyDuckToScore(slot, callback) {
    var slotRect = slot.getBoundingClientRect();
    var activeBadge = scoreDisplay.querySelector('.score-badge.active-player');
    if (!activeBadge) activeBadge = scoreDisplay.querySelector('.score-badge');
    var targetRect = activeBadge ? activeBadge.getBoundingClientRect() : { left: window.innerWidth / 2, top: 0, width: 60, height: 30 };

    var frontImg = slot.querySelector('.dock-duck-front img');
    var flyer = document.createElement('div');
    flyer.className = 'duck-flying duck-flying-to-score';
    if (frontImg) {
      var flyImg = document.createElement('img');
      flyImg.src = frontImg.src;
      flyImg.alt = frontImg.alt;
      flyer.appendChild(flyImg);
    }

    slot.innerHTML = '';

    // Start at dock position, big
    flyer.style.left = (slotRect.left + slotRect.width / 2 - 28) + 'px';
    flyer.style.top = (slotRect.top + slotRect.height / 2 - 28) + 'px';
    flyer.style.transform = 'scale(1.7)';
    document.body.appendChild(flyer);

    // Fly up to score badge, shrinking along the way
    requestAnimationFrame(function () {
      flyer.style.left = (targetRect.left + targetRect.width / 2 - 28) + 'px';
      flyer.style.top = (targetRect.top + targetRect.height / 2 - 28) + 'px';
      flyer.style.transform = 'scale(0.4)';
      flyer.style.opacity = '0';
    });

    setTimeout(function () {
      flyer.remove();
      if (callback) callback();
    }, 900);
  }

  function handleMatch(result) {
    setTimeout(function () {
      playMatchSound();
      if (result.isQueenMatch) {
        flipResult.textContent = 'Queen Duck! +1,000 BONUS!';
        flipResult.className = 'flip-result match queen-match';
      } else {
        flipResult.textContent = 'Match! +1 point!';
        flipResult.className = 'flip-result match';
      }

      if (pickedPondEl1) pickedPondEl1.classList.add('matched');
      if (pickedPondEl2) pickedPondEl2.classList.add('matched');

      // After showing match message, fly ducks to scoreboard
      setTimeout(function () {
        // Flip ducks back to show characters before flying
        var dd1 = dockSlot1.querySelector('.dock-duck');
        var dd2 = dockSlot2.querySelector('.dock-duck');
        if (dd1) dd1.classList.remove('flipped');
        if (dd2) dd2.classList.remove('flipped');

        setTimeout(function () {
          var done = 0;
          function onBothLanded() {
            done++;
            if (done >= 2) {
              // Update state and score
              state = DuckyEngine.resolveTurn(state);
              updateHUD();
              positionDucks();

              // Bounce the score badge
              var activeBadge = scoreDisplay.querySelector('.score-badge.active-player') || scoreDisplay.querySelector('.score-badge');
              if (activeBadge) {
                activeBadge.classList.remove('score-pop');
                void activeBadge.offsetWidth; // force reflow
                activeBadge.classList.add('score-pop');
              }

              // Confetti burst from the score badge
              var badgeRect = activeBadge ? activeBadge.getBoundingClientRect() : { left: window.innerWidth / 2, top: 50 };
              burstConfetti(badgeRect.left + (badgeRect.width || 0) / 2, badgeRect.top + (badgeRect.height || 0) / 2, result.isQueenMatch ? 30 : 15);

              flipResult.textContent = '';
              pickedPondEl1 = null;
              pickedPondEl2 = null;
              animating = false;

              if (result.event === 'game-over') {
                setTimeout(function () {
                  stopSwimming();
                  window.duckNavigateTo('results');
                }, 800);
              }
            }
          }

          flyDuckToScore(dockSlot1, onBothLanded);
          flyDuckToScore(dockSlot2, onBothLanded);
        }, 500);
      }, 800);
    }, 600);
  }

  // --- Fly duck from dock back to pond ---
  function flyDuckBackToPond(slot, pondEl, callback) {
    var slotRect = slot.getBoundingClientRect();
    var pondRect = pondEl.getBoundingClientRect();

    var frontImg = slot.querySelector('.dock-duck-front img');
    var flyer = document.createElement('div');
    flyer.className = 'duck-flying duck-flying-return';
    if (frontImg) {
      var flyImg = document.createElement('img');
      flyImg.src = frontImg.src;
      flyImg.alt = frontImg.alt;
      flyer.appendChild(flyImg);
    }

    slot.innerHTML = '';

    // Start at dock position, scaled up (dock size)
    flyer.style.left = (slotRect.left + slotRect.width / 2 - 28) + 'px';
    flyer.style.top = (slotRect.top + slotRect.height / 2 - 28) + 'px';
    flyer.style.transform = 'scale(1.7)';
    document.body.appendChild(flyer);

    // Fly back to pond position, scale down to pond size
    requestAnimationFrame(function () {
      flyer.style.left = (pondRect.left + pondRect.width / 2 - 28) + 'px';
      flyer.style.top = (pondRect.top + pondRect.height / 2 - 28) + 'px';
      flyer.style.transform = 'scale(1)';
    });

    setTimeout(function () {
      flyer.remove();
      pondEl.style.opacity = '';
      pondEl.classList.remove('selected');

      // Splash effect
      var splash = document.createElement('div');
      splash.className = 'pond-splash';
      splash.style.left = (pondRect.width / 2 - 20) + 'px';
      splash.style.top = (pondRect.height / 2 - 20) + 'px';
      // Position relative to pond element's position within its parent
      var pondParentRect = pond.getBoundingClientRect();
      var relX = pondRect.left - pondParentRect.left + pondRect.width / 2;
      var relY = pondRect.top - pondParentRect.top + pondRect.height / 2;
      splash.style.left = (relX - 20) + 'px';
      splash.style.top = (relY - 20) + 'px';
      pond.appendChild(splash);
      setTimeout(function () { splash.remove(); }, 600);

      if (callback) callback();
    }, 600);
  }

  function handleNoMatch(result) {
    playNoMatchSound();
    flipResult.textContent = 'No match!';
    flipResult.className = 'flip-result no-match';

    // Show the number for a moment, then flip back to see the duck one more time
    setTimeout(function () {
      var dd1 = dockSlot1.querySelector('.dock-duck');
      var dd2 = dockSlot2.querySelector('.dock-duck');
      if (dd1) dd1.classList.remove('flipped');
      if (dd2) dd2.classList.remove('flipped');
      flipResult.textContent = '';

      // Show the duck characters for 750ms to burn in the memory
      setTimeout(function () {
        // Fly both ducks back to the pond
        var done = 0;
        function onBothBack() {
          done++;
          if (done >= 2) {
            state = DuckyEngine.resolveTurn(state);
            updateHUD();
            positionDucks();
            pickedPondEl1 = null;
            pickedPondEl2 = null;
            animating = false;
          }
        }

        if (pickedPondEl1) flyDuckBackToPond(dockSlot1, pickedPondEl1, onBothBack);
        else onBothBack();
        if (pickedPondEl2) flyDuckBackToPond(dockSlot2, pickedPondEl2, onBothBack);
        else onBothBack();
      }, NO_MATCH_LINGER);
    }, 1000);
  }

  // --- Show results ---
  function showResults() {
    var results = DuckyEngine.getResults(state);
    var scoresDiv = document.getElementById('results-scores');
    var winnerDiv = document.getElementById('results-winner');
    var titleEl = document.getElementById('results-title');

    var html = '';
    for (var i = 0; i < results.playerNames.length; i++) {
      var isW = results.winners.indexOf(i) !== -1;
      html += '<div class="result-row' + (isW ? ' winner' : '') + '">';
      html += '<span>' + results.playerNames[i] + '</span>';
      html += '<span>' + results.scores[i].toLocaleString() + ' pts</span>';
      html += '</div>';
    }
    scoresDiv.innerHTML = html;

    if (results.playerNames.length === 1) {
      titleEl.textContent = 'Great Job!';
      winnerDiv.textContent = 'You found all ' + state.numPairs + ' pairs in ' + results.totalTurns + ' turns!';
    } else if (results.isTie) {
      titleEl.textContent = "It's a Tie!";
      winnerDiv.textContent = 'What a close game!';
    } else {
      titleEl.textContent = results.playerNames[results.winners[0]] + ' Wins!';
      winnerDiv.textContent = 'Amazing duck finding skills!';
    }
  }

  // --- Swim toggle ---
  btnToggleSwim.addEventListener('click', function () {
    if (isSwimming) {
      stopSwimming();
    } else {
      startSwimming();
    }
  });

  // --- Public API ---
  var DuckyUI = {
    init: function (gameState) {
      state = gameState;
      isSwimming = false;
      swimAngle = 0;
      if (swimRAF) { cancelAnimationFrame(swimRAF); swimRAF = null; }
      if (revealTimeout) { clearTimeout(revealTimeout); revealTimeout = null; }

      renderDucks();
      updateHUD();
      clearDock();

      // Auto-start swimming
      setTimeout(function () { startSwimming(); }, 500);
    },

    showResults: showResults,

    cleanup: function () {
      stopSwimming();
      if (revealTimeout) { clearTimeout(revealTimeout); revealTimeout = null; }
    },
  };

  if (typeof window !== 'undefined') {
    window.DuckyUI = DuckyUI;
  }
})();
