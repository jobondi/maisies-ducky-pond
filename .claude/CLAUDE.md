# Maisie's Ducky Pond — Project Notes

## Key Files
- **Spec**: `docs/SPEC.md` (v1.0) — single source of truth for architecture and game design
- **Tests**: `tests/game-engine.test.js` — Jest tests for game engine
- **Engine**: `js/game-engine.js` — Pure-function IIFE, no DOM, testable with Jest
- **UI controller**: `js/game-ui.js` — DOM rendering, animations, input handling

## Architecture
- Vanilla HTML/CSS/JS PWA, no frameworks, no build step
- IIFE pattern with `var` declarations (ES5-compatible)
- Engine/UI separation: engine is pure logic, UI controller consumes engine
- `window.duckNavigateTo` exposed by app.js for cross-module navigation

## Conventions
- Keep spec version at v1.0 until user says otherwise
- Always update SPEC.md, tests, and code comments when functionality changes
- Run `npx jest` to verify all tests pass before committing
