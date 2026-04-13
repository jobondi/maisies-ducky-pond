# Maisie's Ducky Pond — Specification v1.0

---

## 1. Overview

**Name:** Maisie's Ducky Pond

**Concept:** A memory matching game for young children (8 and under) themed around rubber ducky characters inspired by the "Duck Duck Jeep" culture. Players pick ducks from a circular pond, flip them over on a dock to reveal hidden shapes or numbers, and try to find matching pairs.

**Target audience:** Kids 8 and under, playable solo or with 2-3 players.

---

## 2. Architecture & Deployment

**Type:** Progressive Web App (PWA)

**Tech stack:**
- Vanilla HTML / CSS / JavaScript, no frameworks, no build step
- IIFE pattern with `var` declarations (ES5-compatible)
- Single `index.html` with CSS screen-based navigation (opacity/visibility transitions)
- Service worker for offline asset caching

**Engine / UI separation pattern:**
- **Engine** (`js/game-engine.js`) — Pure functions IIFE, no DOM, testable with Jest
- **UI controller** (`js/game-ui.js`) — IIFE that consumes the engine, manages pond rendering, duck animations, dock interactions
- **App controller** (`js/app.js`) — Navigation, player setup, PWA registration
- Engines export to `window.*` and `module.exports` for Node.js testing

**File structure:**
```
index.html                  — All screens (title, setup, game, results)
css/style.css               — Yellow rubber ducky theme, all screens, animations
js/game-engine.js           — Pure game logic (duck creation, matching, scoring, turns)
js/game-ui.js               — UI controller (pond, dock, animations, sounds)
js/app.js                   — Navigation, player setup, PWA registration
sw.js                       — Service worker (network-first for app, cache-first for fonts)
manifest.json               — PWA manifest (standalone, portrait, yellow theme)
icons/favicon.svg           — App favicon (yellow circle with chick)
icons/ducks/*.svg           — 20 custom SVG rubber duck character illustrations
tests/game-engine.test.js   — 26 Jest tests for engine logic
docs/SPEC.md                — This file
.claude/CLAUDE.md           — Project conventions for AI assistant
.claude/launch.json         — Dev server configuration
```

**Dev server:** `npx serve -l 3001` (no build step needed)

**Testing:** `npx jest` (26 tests covering game creation, picking, matching, turn resolution, results)

---

## 3. Visual Theme

**Color palette:**
- Background: Yellow gradient (#FFF9C4 to #FFD54F), rubber ducky inspired
- Pond: Blue radial gradient (#4FC3F7 to #01579B)
- Island: Green radial gradient (#A5D6A7 to #43A047)
- Action buttons: Green (#66BB6A to #43A047)
- Dock: Brown wood texture (#8D6E63) with plank lines
- Text: Dark brown (#5D4037) and orange (#E65100)

**Typography:** Nunito (Google Fonts), weights 400/700/900

**Mascot:** Baby chick emoji (front-facing baby chick) on title and setup screens

---

## 4. Screens

### 4.1 Title Screen
- Yellow gradient background with floating bubbles
- Bobbing chick mascot animation
- "Maisie's Ducky Pond" title in brown
- Green "Let's Play!" button
- Wave animations at bottom

### 4.2 Setup Screen
- Player count selection (1, 2, or 3 players)
- "Match by..." mode toggle: **Shapes** (default) or **Numbers**
- Name input for each player (saved to localStorage)
- Green "Start!" button (disabled until all names entered)

### 4.3 Game Screen
- **Header:** Back button, turn indicator, score badges (green for active player)
- **Pond:** Circular blue pond (92vw, max 480px) with green island and palm tree center, 16 unique rubber duck characters (56px) swimming in a circle
- **Dock:** Wooden dock (same width as pond) below the pond with plank board texture, holds 2 picked ducks (95px on dock). Shape/number revealed on white circle (88px) on the back.
- **Pause/Resume button:** At the bottom, toggles duck swimming animation and ambient music

### 4.4 Results Screen
- Party emoji mascot with bounce animation
- Score rows for each player showing points (winner highlighted in green)
- Winner announcement or tie message
- Solo mode shows total turns taken
- "Play Again!" and "Home" buttons

---

## 5. Duck Characters

20 custom SVG rubber duck illustrations. Each is a yellow rubber duck body with unique costume/accessories:

| Character | Key visual features |
|-----------|-------------------|
| Queen Duck | Gold crown with colored gems (special: +1,000 bonus on match) |
| Pirate Duck | Tricorn hat with skull & crossbones, eye patch |
| Chef Duck | Puffy white chef hat |
| Devil Duck | Red horns, pointy tail, mischievous eyebrows |
| Wizard Duck | Purple pointy hat with stars, flowing beard |
| Firefighter Duck | Red helmet with "FD" badge |
| Cowboy Duck | Brown cowboy hat with sheriff star |
| Princess Duck | Pink tiara with gems, eyelashes, pink bow |
| Superhero Duck | Blue mask, red cape, star chest emblem |
| Astronaut Duck | Glass helmet dome, antenna, suit controls |
| Rocker Duck | Red mohawk, dark sunglasses, guitar |
| Surfer Duck | Blue shades, flower lei, surfboard |
| Ninja Duck | Black mask with eye slit, red headband, throwing star |
| Spooky Duck | Purple witch hat with buckle, little bat |
| Doctor Duck | Head mirror, stethoscope, white coat collar |
| Unicorn Duck | Rainbow gradient horn, rainbow mane, sparkles |
| Dragon Duck | Green spines, bat wings, fire breath, spiked tail |
| Mermaid Duck | Purple flowing hair, shell crown, scale pattern, teal tail |
| Robot Duck | Metal visor with green LED eyes, antenna, control panel |
| Froggy Duck | Green frog hood with big bulging eyes |

Each game randomly selects 16 of the 20 characters (8 pairs).

---

## 6. Game Mechanics

### 6.1 Setup
- Choose 1-3 players and enter names
- Choose match mode: Shapes or Numbers
- 8 pairs = 16 ducks per game
- Each duck has a unique character (no duplicate characters on the pond)
- Each duck hides a shape or number (1-8), with each value appearing exactly twice

### 6.2 Shapes (default mode)
8 simple, single-color shapes on a white circle background:

| Shape | Color |
|-------|-------|
| Circle | Dark blue (#1565C0) |
| Square | Dark red (#C62828) |
| Triangle | Dark green (#2E7D32) |
| Crescent Moon | Deep purple (#4A148C) |
| Diamond | Dark purple (#6A1B9A) |
| Star | Burnt orange (#E65100) |
| Hexagon | Dark teal (#00695C) |
| Egg | Dark pink (#AD1457) |

### 6.3 Turn Flow
1. Ducks swim in a circle around the island (auto-starts on game begin)
2. Player taps a duck; it flies from the pond to the left dock slot
3. Duck character is visible on the dock for **1 second**, then flips upward (rotateX) to reveal the shape/number underneath
4. Player taps a second duck; it flies to the right dock slot
5. Duck character is visible for **1.5 seconds** (suspense), then flips to reveal
6. **Match celebration sequence:**
   - "Match! +1 point!" (or "Queen Duck! +1,000 BONUS!") message appears
   - After 0.8s, both ducks flip back to show their characters
   - After 0.5s, both ducks fly up to the active player's score badge, shrinking and fading as they travel
   - Score badge does a pop-bounce animation (scales up 1.5x then settles)
   - Confetti bursts from the score badge (15 pieces, or 30 for Queen Duck)
   - Score updates, same player goes again
7. **No match:** "No match!" message for 1 second, then both ducks flip back to show characters for **1.25 seconds** (one last look to memorize), then fly back to their positions in the pond. Turn passes to next player.
8. Input is locked during all animations to prevent race conditions

### 6.4 Queen Duck Bonus
When a player matches the Queen Duck pair, they receive **1,000 bonus points** on top of the normal 1 point. The message reads "Queen Duck! +1,000 BONUS!" in gold text.

### 6.5 Scoring
- Normal match: 1 point
- Queen match: 1,001 points (1 + 1,000 bonus)
- Game ends when all 8 pairs are found
- Winner is the player with the highest score
- Ties are announced as ties

### 6.6 Swimming Animation
- Ducks orbit the island in a slow circle (swimAngle += 0.004 per frame)
- Each duck has a slight vertical wobble for a floating effect
- Water ripple effect under each duck
- Pause/Resume button toggles animation and ambient music

---

## 7. Animations & Timing

| Animation | Duration | Details |
|-----------|----------|---------|
| Duck fly to dock | 500ms | Ease-in-out, no scale change, smooth glide |
| First duck reveal | 1,000ms | Time on dock before flip |
| Second duck reveal | 1,500ms | Longer pause for suspense |
| Flip animation | 600ms | RotateX (-180deg), flips upward like turning duck over |
| Match message | 800ms | Shown before ducks fly to score |
| Match: ducks flip back | 500ms | Show characters one more time before flying to score |
| Match: fly to score | 500ms | Ducks shrink and fade as they fly up to score badge |
| Score pop-bounce | 600ms | Badge scales to 1.5x then settles back |
| Confetti burst | 1,000ms | 15 pieces (30 for Queen), spread outward and fade |
| No-match linger | 1,250ms | Ducks flip back, show characters one more time |
| Duck fly back to pond | 500ms | Ease-in-out, reverse of fly-to-dock |
| Screen transitions | 350ms | Opacity fade |

**Easing:** All duck flight animations use `ease-in-out` for smooth acceleration and deceleration with no overshoot or bounce.

---

## 8. Audio

Generated via Web Audio API (no audio files):
- **Quack:** Sine wave frequency sweep (600Hz to 300Hz) on duck pick
- **Match chime:** Three ascending tones (C5, E5, G5) played in sequence
- **No-match buzz:** Triangle wave descending (300Hz to 200Hz)
- **Ambient music:** Gentle sine oscillator (220Hz) with slow LFO modulation, plays while ducks swim

---

## 9. PWA Configuration

- **Display:** Standalone (fullscreen app experience)
- **Orientation:** Portrait
- **Theme color:** #FFD54F (golden yellow)
- **Background color:** #FFF8E1 (light cream yellow)
- **Service worker:** Network-first for app files, cache-first for external resources (Google Fonts)
- **Cache version:** ducky-pond-v2
- **iOS support:** apple-mobile-web-app-capable, black-translucent status bar
- **Offline:** Full offline play after first load

---

## 10. Data Persistence

- **Player names:** localStorage key `ducky_player_names` (JSON array)
- **Game state:** In-memory only (not persisted between sessions)
- **No server component:** Fully client-side

---

## 11. Future Ideas

- Queen Duck special sparkle/crown animation on bonus
- Sound effects toggle in settings
- Difficulty levels (fewer/more pairs)
- Timed mode
- New duck characters
- Multiplayer score history
