// Screenshot scenes: deterministic staged frames for screenshots/.
// Each one drives the real game (loadLevel, debugPlace, world.step) to a
// fixed state, so every screenshot is a genuine render of the game's own
// code at a moment a player could reach. `?shot=cover|alert|vault|win`
// picks the scene; any other value plays normally from the title screen.
//
// The cover shows the first criterion at a glance: a level seen from above,
// guards with vision cones, cover to hide behind, a relic, and the exit.
import { STEP, TILE } from './config.js';
import { GUARD_ALERT, GUARD_SUSPICIOUS } from './world.js';
import { SCREEN_LEVEL_DONE, SCREEN_PLAY, SCREEN_WIN } from './render.js';

const IDLE = { dx: 0, dy: 0, sneak: false, pickup: false, throwAt: null };

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Step the world forward `seconds` with no input, so guards patrol for real. */
function idleFor(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, IDLE);
}

/** Stage one named shot on the live game object (see main.js). */
export function stageShot(name, game) {
  const world = game.world;
  const state = world.state;

  if (name === 'cover') {
    // Level 1 mid-play: Wren sneaking behind a display case, one relic
    // pocketed, both guards patrolling with their cones out.
    game.startLevel(0);
    const hideout = tileCentre(16, 10);
    world.debugPlace(hideout.x, hideout.y, [
      { ...tileCentre(20, 3), facing: 0, awareness: 0.3, state: GUARD_SUSPICIOUS },
      { ...tileCentre(24, 14), facing: Math.PI, awareness: 0 },
    ]);
    state.relics[0].taken = true;
    state.relicsGot = 1;
    state.score = 100;
    state.levelElapsed = 47;
    state.player.sneaking = true;
    idleFor(world, 1.2);
    state.player.sneaking = true;
    return { screen: SCREEN_PLAY, best: 0, extras: null };
  }

  if (name === 'alert') {
    // Level 2, the chase: a guard has spotted Wren in the open hall and is
    // closing in — the SPOTTED! banner and the red cone read at a glance.
    // All four are on open floor with clear sight between guard and Wren.
    game.startLevel(1);
    const playerAt = tileCentre(24, 14);
    const guardAt = tileCentre(20, 14);
    world.debugPlace(playerAt.x, playerAt.y, [
      { ...tileCentre(12, 7), facing: 0, awareness: 0 },
      { ...tileCentre(30, 19), facing: Math.PI / 2, awareness: 0 },
      { ...guardAt, facing: 0, awareness: 1, state: GUARD_ALERT },
    ]);
    state.relics[1].taken = true;
    state.relicsGot = 1;
    state.score = 100;
    state.levelElapsed = 83;
    idleFor(world, 0.5);
    return { screen: SCREEN_PLAY, best: 320, extras: null };
  }

  if (name === 'vault') {
    // Level 3: Wren hidden in a bush, two relics down, four guards sweeping
    // the tight halls with cones crossing the light pools.
    game.startLevel(2);
    const bush = tileCentre(10, 2);
    world.debugPlace(bush.x, bush.y, [
      { ...tileCentre(18, 2), facing: 0, awareness: 0.15 },
      { ...tileCentre(16, 20), facing: -Math.PI / 2, awareness: 0 },
      { ...tileCentre(33, 12), facing: Math.PI, awareness: 0.4, state: GUARD_SUSPICIOUS },
      { ...tileCentre(12, 8), facing: Math.PI / 2, awareness: 0 },
    ]);
    state.relics[0].taken = true;
    state.relics[1].taken = true;
    state.relicsGot = 2;
    state.score = 320;
    state.levelElapsed = 96;
    idleFor(world, 1.0);
    return { screen: SCREEN_PLAY, best: 640, extras: null };
  }

  if (name === 'win') {
    // The win screen over the Vault, every relic taken and Wren at the door.
    game.startLevel(2);
    for (const relic of state.relics) relic.taken = true;
    state.relicsGot = 3;
    state.exitOpen = true;
    state.score = 1450;
    state.levelElapsed = 132;
    const door = tileCentre(34, 19);
    world.debugPlace(door.x, door.y, [
      { ...tileCentre(18, 7), facing: 0, awareness: 0 },
      { ...tileCentre(16, 14), facing: Math.PI, awareness: 0 },
      { ...tileCentre(33, 8), facing: Math.PI / 2, awareness: 0 },
      { ...tileCentre(5, 14), facing: 0, awareness: 0 },
    ]);
    idleFor(world, 0.6);
    return {
      screen: SCREEN_WIN,
      best: 1450,
      extras: {
        winSummary: { total: 1450, time: '4:12', caught: 1, ghostRun: false },
      },
    };
  }

  if (name === 'level-done') {
    game.startLevel(0);
    for (const relic of state.relics) relic.taken = true;
    state.relicsGot = 3;
    state.exitOpen = true;
    state.score = 610;
    state.levelScore = 610;
    state.levelElapsed = 74;
    const door = tileCentre(35, 18);
    world.debugPlace(door.x, door.y, [
      { ...tileCentre(20, 3), facing: 0, awareness: 0 },
      { ...tileCentre(24, 14), facing: Math.PI, awareness: 0 },
    ]);
    return {
      screen: SCREEN_LEVEL_DONE,
      best: 610,
      extras: {
        levelSummary: { relics: 3, timeBonus: 230, ghost: true, pebbles: 2, levelScore: 610, total: 610 },
      },
    };
  }

  return null;
}

/** The shots the repo ships, in the order screenshots/ lists them. */
export const SHOT_LIST = [
  { name: '1-cover.jpg', query: '?shot=cover' },
  { name: '2-alert.jpg', query: '?shot=alert' },
  { name: '3-vault.jpg', query: '?shot=vault' },
  { name: '4-win.jpg', query: '?shot=win' },
];
