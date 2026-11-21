// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, level done, game over and win.
//
// ?shot=cover|alert|vault|win stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { LEVELS } from './levels.js';
import {
  createWorld,
  EVENT_ALERT,
  EVENT_CAUGHT,
  EVENT_GAME_OVER,
  EVENT_LEVEL_DONE,
  EVENT_PEBBLE,
  EVENT_PICKUP,
  EVENT_SUSPICIOUS,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer,
  SCREEN_LEVEL_DONE,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

// ?shot=cover|alert|vault|win stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The game object the screenshot stager drives (see shots.js). */
const game = {
  world,
  screen: SCREEN_TITLE,
  best: readBest(),
  totalAlerts: 0,
  levelSummary: null,
  winSummary: null,
  startLevel(index) {
    world.loadLevel(index);
    game.screen = SCREEN_PLAY;
    game.levelSummary = null;
  },
};

function runShot(name) {
  const scene = stageShot(name, game);
  if (!scene) {
    game.screen = SCREEN_TITLE;
    renderer.draw(world, SCREEN_TITLE, game.best, null);
    window.__shotReady = true;
    return;
  }
  game.screen = scene.screen;
  game.best = scene.best;
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, scene.extras ?? null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let levelSummary = null;
  let winSummary = null;
  let totalAlerts = 0;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startRun() {
    audio.unlock();
    world.resetRun();
    totalAlerts = 0;
    levelSummary = null;
    winSummary = null;
    screen = SCREEN_PLAY;
    announce('Playing. Pocket all three relics, then reach the exit unseen.');
  }

  function nextLevel() {
    const next = world.state.levelIndex + 1;
    if (next >= LEVELS.length) {
      screen = SCREEN_WIN;
      winSummary = {
        total: world.state.score,
        time: formatTime(world.state.elapsed),
        caught: world.state.caughtCount,
        ghostRun: totalAlerts === 0 && world.state.caughtCount === 0,
      };
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      audio.win();
      announce(`You did it. Final score ${world.state.score}.`);
      return;
    }
    world.loadLevel(next);
    levelSummary = null;
    screen = SCREEN_PLAY;
    announce(`${world.state.levelName}. ${world.state.levelSubtitle}`);
  }

  function levelDoneSummary() {
    const s = world.state;
    const par = LEVELS[s.levelIndex].parSeconds;
    return {
      relics: s.relicsGot,
      timeBonus: Math.max(0, Math.round((par - s.levelElapsed) * 5)),
      ghost: s.ghost,
      pebbles: s.pebbles,
      levelScore: s.levelScore,
      total: s.score,
    };
  }

  function handleEvents(events) {
    if (events & EVENT_PICKUP) {
      audio.pickup();
      announce(`Relic pocketed. ${world.state.relicsGot} of ${world.state.relicsTotal}.`);
    }
    if (events & EVENT_SUSPICIOUS) {
      audio.suspicious();
      announce('A guard is suspicious.');
    }
    if (events & EVENT_ALERT) {
      totalAlerts += 1;
      audio.alert();
      announce('Spotted! Run for cover!');
    }
    if (events & EVENT_PEBBLE) {
      audio.pebble();
    }
    if (events & EVENT_LEVEL_DONE) {
      levelSummary = levelDoneSummary();
      audio.levelDone();
      screen = SCREEN_LEVEL_DONE;
      announce(`${world.state.levelName} cleared. Score ${world.state.score}.`);
    }
    if (events & EVENT_CAUGHT) {
      audio.caught();
      if (events & EVENT_GAME_OVER) {
        screen = SCREEN_OVER;
        if (world.state.score > best) {
          best = world.state.score;
          saveBest(best);
        }
        announce(`Caught for the last time. Game over. Score ${world.state.score}.`);
      } else {
        // Caught, but nerves remain: the level restarts from its start.
        world.loadLevel(world.state.levelIndex);
        announce(`Caught! ${world.state.nerves} ${world.state.nerves === 1 ? 'nerve' : 'nerves'} left. The level restarts.`);
      }
    }
  }

  function step() {
    const dir = input.direction();
    const click = input.takeClick();
    let throwAt = null;
    if (click && screen === SCREEN_PLAY) {
      throwAt = renderer.clientToField(click.clientX, click.clientY);
    }
    const events = world.step(STEP, {
      dx: dir.dx,
      dy: dir.dy,
      sneak: input.sneak(),
      pickup: input.pickup(),
      throwAt,
    });
    handleEvents(events);
  }

  function handleActions() {
    const actions = input.takeActions();
    // Clicks during play are pebble throws, handled in step(); on every other
    // screen a click is a confirm. Never take the click here while playing.
    const click = screen === SCREEN_PLAY ? null : input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    const confirm = (actions & ACTION_CONFIRM) !== 0 || click !== null;
    if (screen === SCREEN_TITLE && confirm) {
      startRun();
    } else if (screen === SCREEN_OVER && confirm) {
      startRun();
    } else if (screen === SCREEN_LEVEL_DONE && confirm) {
      nextLevel();
    } else if (screen === SCREEN_WIN && confirm) {
      startRun();
    } else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE) !== 0) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && ((actions & ACTION_PAUSE) !== 0 || confirm)) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_TITLE) {
      // The title screen is a living diorama: guards patrol behind the panel,
      // but nothing can be caught or scored there.
      while (accumulator >= STEP) {
        world.step(STEP, { dx: 0, dy: 0, sneak: false, pickup: false, throwAt: null });
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // The renderer reads the mouse in field coordinates for the pebble hint ring.
    const mouse = input.mouse();
    const mouseField = renderer.clientToField(mouse.x, mouse.y);
    renderer.draw(world, screen, best, { mouseField, levelSummary, winSummary });
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A handle for the play-test driver: read the live state, never the code's word for it.
  window.__game = {
    state: world.state,
    world,
    screen: () => screen,
    best: () => best,
  };

  announce('The Quiet Gallery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
