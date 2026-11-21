# The Quiet Gallery — a stealth game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Nickhellyou123/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Nickhellyou123/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Wren, cat burglar, has one night in the Ashford Museum of Curiosities.
Pocket all three relics on each floor, then slip out the green door —
unseen.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts`, then
http://localhost:8080). No build step, no network requests, no assets
beyond the files in `game/`.

- **Move:** WASD / arrow keys
- **Sneak (quiet, slower):** hold Shift — running is loud and draws guards
- **Pocket a relic:** hold E while standing on its pedestal
- **Throw a pebble:** click — the clink pulls the nearest guard to look
- **Pause:** P or Esc · **Mute:** M

Guards patrol with vision cones. Stand in a cone and their eye fills:
half-full they get suspicious and come to look; full and they give chase.
Bushes hide you, lamp-light exposes you, shadow slows their eyes. Get
caught three times and the night is over. Clear a floor unseen for the
Ghost bonus (+250).

Three floors: The Marble Hall, The East Wing, The Vault.

## Files

- `game/` — the game, plain static files: `index.html` plus ES modules
  in `game/src/` (`config`, `levels`, `world`, `render`, `input`,
  `audio`, `shots`, `main`). No libraries, no network.
- `screenshots/` — four real renders of the game's own code, staged
  through `?shot=` scenes in `game/src/shots.js` (see `shots.json`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/`
  to `/output` and writes `/output/dossier.json`.
- `serve.ts` — a tiny static server for local play.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Entry

Built for the make.fun bounty
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759)
— $50 total, top 10 share, free entry. MIT licensed.
