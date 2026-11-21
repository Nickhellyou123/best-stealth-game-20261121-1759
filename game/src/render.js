// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Vision cones are raycast polygons (a ray
// per few degrees, stopped by the first wall or display case), and the night
// is a darkness layer with holes punched at the lamps and at Wren.
import {
  FIELD, FONT, GUARD, NERVES, PALETTE, PEBBLE, PLAYER, TILE,
  TILE_BUSH, TILE_CASE, TILE_SHELF, TILE_WALL,
} from './config.js';
import { GUARD_ALERT, GUARD_SUSPICIOUS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_LEVEL_DONE = 'level-done';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const CONE_RAYS = 26;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const shadow = document.createElement('canvas');
  const shadowCtx = shadow.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const relicsLabel = cachedLabel('Relics ');
  const scoreLabel = cachedLabel('Score ');
  const timeLabel = cachedLabel('');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');
  const pebbleLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    shadow.width = width;
    shadow.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Client (CSS pixel) coordinates into playfield coordinates. */
  function clientToField(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function tileIs(rows, tx, ty, ch) {
    if (tx < 0 || ty < 0 || tx >= FIELD.cols || ty >= FIELD.rows) return ch === TILE_WALL;
    return rows[ty][tx] === ch;
  }

  function blocksSight(rows, x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return tileIs(rows, tx, ty, TILE_WALL) || tileIs(rows, tx, ty, TILE_CASE);
  }

  /** Distance from (x, y) along `angle` until sight is blocked, capped at range. */
  function rayDistance(world, x, y, angle, range) {
    const step = 8;
    for (let d = step; d <= range; d += step) {
      if (blocksSight(world.state.rows, x + Math.cos(angle) * d, y + Math.sin(angle) * d)) return d;
    }
    return range;
  }

  function drawCone(world, guard) {
    const alert = guard.state === GUARD_ALERT;
    context.fillStyle = alert ? PALETTE.coneAlert : PALETTE.cone;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    for (let i = 0; i <= CONE_RAYS; i += 1) {
      const angle = guard.facing - GUARD.viewHalfAngle + (2 * GUARD.viewHalfAngle * i) / CONE_RAYS;
      const dist = rayDistance(world, guard.x, guard.y, angle, GUARD.viewRange);
      context.lineTo(guard.x + Math.cos(angle) * dist, guard.y + Math.sin(angle) * dist);
    }
    context.closePath();
    context.fill();
  }

  function drawFloor(world) {
    const rows = world.state.rows;
    for (let ty = 0; ty < FIELD.rows; ty += 1) {
      for (let tx = 0; tx < FIELD.cols; tx += 1) {
        const ch = rows[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === TILE_WALL) {
          context.fillStyle = PALETTE.wall;
          context.fillRect(x, y, TILE, TILE);
          // A light top edge only where the wall is exposed (the tile above
          // is not a wall): without it a solid block reads as stripes.
          if (!tileIs(rows, tx, ty - 1, TILE_WALL)) {
            context.fillStyle = PALETTE.wallTop;
            context.fillRect(x, y, TILE, 5);
          }
        } else {
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
          context.fillRect(x, y, TILE, TILE);
          if (ch === TILE_BUSH) {
            context.fillStyle = PALETTE.bush;
            context.beginPath();
            context.arc(x + 10, y + 20, 11, 0, Math.PI * 2);
            context.arc(x + 22, y + 12, 12, 0, Math.PI * 2);
            context.arc(x + 24, y + 24, 10, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = PALETTE.bushLeaf;
            context.beginPath();
            context.arc(x + 12, y + 14, 6, 0, Math.PI * 2);
            context.arc(x + 22, y + 22, 5, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
    // Carpet runners down the main halls: wide bands, not thin lines.
    context.fillStyle = PALETTE.carpet;
    context.fillRect(0, 3 * TILE + 3, FIELD.width, 26);
    context.fillRect(0, 10 * TILE + 3, FIELD.width, 26);
    context.fillRect(0, 18 * TILE + 3, FIELD.width, 26);
    context.fillStyle = PALETTE.carpetTrim;
    context.fillRect(0, 3 * TILE + 3, FIELD.width, 2);
    context.fillRect(0, 3 * TILE + 27, FIELD.width, 2);
  }

  function drawCover(world) {
    const rows = world.state.rows;
    for (let ty = 0; ty < FIELD.rows; ty += 1) {
      for (let tx = 0; tx < FIELD.cols; tx += 1) {
        const ch = rows[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === TILE_CASE) {
          context.fillStyle = PALETTE.caseBase;
          context.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          context.fillStyle = PALETTE.caseGlass;
          context.globalAlpha = 0.75;
          context.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          context.globalAlpha = 1;
          context.fillStyle = 'rgba(255,255,255,0.35)';
          context.fillRect(x + 8, y + 8, 4, TILE - 16);
        } else if (ch === TILE_SHELF) {
          context.fillStyle = PALETTE.shelf;
          context.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          context.fillStyle = 'rgba(255,255,255,0.15)';
          context.fillRect(x + 2, y + 2, TILE - 4, 4);
        }
      }
    }
  }

  function drawLamps(world) {
    for (const lamp of world.state.lamps) {
      context.fillStyle = '#3a2f1a';
      context.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
      context.fillStyle = PALETTE.lampGlow;
      context.beginPath();
      context.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawRelics(world) {
    const time = performance.now() / 1000;
    for (const relic of world.state.relics) {
      context.fillStyle = '#6b5a2e';
      context.fillRect(relic.x - 11, relic.y - 8, 22, 16);
      if (relic.taken) continue;
      const pulse = 0.55 + Math.sin(time * 3 + relic.x) * 0.2;
      context.globalAlpha = pulse * 0.5;
      context.fillStyle = PALETTE.relic;
      context.beginPath();
      context.arc(relic.x, relic.y - 2, 13, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = pulse;
      context.fillStyle = PALETTE.relic;
      context.beginPath();
      context.moveTo(relic.x, relic.y - 15);
      context.lineTo(relic.x + 9, relic.y - 2);
      context.lineTo(relic.x, relic.y + 9);
      context.lineTo(relic.x - 9, relic.y - 2);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawExit(world) {
    const exit = world.state.exit;
    const open = world.state.exitOpen;
    const pulse = open ? 0.6 + Math.sin(performance.now() / 300) * 0.25 : 0;
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    context.globalAlpha = open ? 0.35 + pulse : 0.5;
    context.beginPath();
    context.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = '#10131c';
    context.fillRect(exit.x - 13, exit.y - 15, 26, 30);
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
    context.fillRect(exit.x - 13, exit.y - 15, 26, 4);
    text(open ? 'EXIT' : 'LOCKED', exit.x, exit.y + 30, 13, open ? PALETTE.exit : PALETTE.muted, 'center');
  }

  function drawPlayer(world) {
    const p = world.state.player;
    const inBush = world.isInBush(p.x, p.y);
    context.globalAlpha = inBush ? 0.55 : 1;
    const radius = p.sneaking ? 10 : PLAYER.radius;
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.moveTo(p.x + Math.cos(p.facing) * (radius + 6), p.y + Math.sin(p.facing) * (radius + 6));
    context.lineTo(p.x + Math.cos(p.facing + 2.4) * radius, p.y + Math.sin(p.facing + 2.4) * radius);
    context.lineTo(p.x + Math.cos(p.facing - 2.4) * radius, p.y + Math.sin(p.facing - 2.4) * radius);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(p.x, p.y, radius * 0.62, 0, Math.PI * 2);
    context.fill();
    // A bright rim so Wren reads at a glance, even in shadow.
    context.strokeStyle = '#ffe9a8';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(p.x, p.y, radius * 0.62, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    // Pickup progress ring.
    if (p.pickup > 0 && p.pickupTarget >= 0) {
      context.strokeStyle = PALETTE.relic;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + p.pickup * Math.PI * 2);
      context.stroke();
    }
  }

  function drawGuard(world, guard) {
    context.fillStyle = PALETTE.guardUniform;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius * 0.6, 0, Math.PI * 2);
    context.fill();
    // Facing tick.
    context.strokeStyle = PALETTE.guard;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 7), guard.y + Math.sin(guard.facing) * (GUARD.radius + 7));
    context.stroke();
    // Awareness arc over the head.
    if (guard.awareness > 0.03) {
      context.strokeStyle = guard.state === GUARD_ALERT ? PALETTE.danger : PALETTE.gold;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(guard.x, guard.y - GUARD.radius - 8, 9, -Math.PI / 2, -Math.PI / 2 + guard.awareness * Math.PI * 2);
      context.stroke();
    }
    if (guard.state === GUARD_SUSPICIOUS) {
      text('?', guard.x, guard.y - GUARD.radius - 16, 22, PALETTE.gold, 'center');
    } else if (guard.state === GUARD_ALERT) {
      text('!', guard.x, guard.y - GUARD.radius - 16, 24, PALETTE.danger, 'center');
    }
  }

  function drawPebblesAndRipples(world) {
    for (const pebble of world.state.pebblesThrown) {
      context.fillStyle = '#b9bec9';
      context.beginPath();
      context.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const ripple of world.state.ripples) {
      const t = ripple.age / ripple.maxAge;
      context.strokeStyle = `rgba(238, 241, 245, ${0.7 * (1 - t)})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(ripple.x, ripple.y, 8 + t * ripple.radius, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawLighting(world) {
    shadowCtx.setTransform(1, 0, 0, 1, 0, 0);
    shadowCtx.clearRect(0, 0, shadow.width, shadow.height);
    shadowCtx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    shadowCtx.fillStyle = PALETTE.shadow;
    shadowCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    shadowCtx.globalCompositeOperation = 'destination-out';
    for (const lamp of world.state.lamps) {
      const gradient = shadowCtx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 150);
      gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      shadowCtx.fillStyle = gradient;
      shadowCtx.beginPath();
      shadowCtx.arc(lamp.x, lamp.y, 150, 0, Math.PI * 2);
      shadowCtx.fill();
    }
    const p = world.state.player;
    const gradient = shadowCtx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 60);
    gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowCtx.fillStyle = gradient;
    shadowCtx.beginPath();
    shadowCtx.arc(p.x, p.y, 60, 0, Math.PI * 2);
    shadowCtx.fill();
    shadowCtx.globalCompositeOperation = 'source-over';
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(shadow, 0, 0);
  }

  function drawHud(world, best) {
    const state = world.state;
    context.textBaseline = 'top';
    text(state.levelName, 24, 16, 22, PALETTE.text, 'left');
    text(relicsLabel(`${state.relicsGot}/${state.relicsTotal}  ◆`), 24, 46, 18, PALETTE.relic, 'left');
    text(pebbleLabel(`Pebbles ${state.pebbles}  ●`), 200, 46, 18, PALETTE.muted, 'left');
    const minutes = Math.floor(state.levelElapsed / 60);
    const seconds = Math.floor(state.levelElapsed % 60);
    text(timeLabel(`${minutes}:${String(seconds).padStart(2, '0')}`), FIELD.width / 2, 16, 22, PALETTE.text, 'center');
    text(scoreLabel(state.score), FIELD.width - 24, 16, 22, PALETTE.text, 'right');
    // Nerves as hearts, top right under the score.
    for (let i = 0; i < NERVES; i += 1) {
      text(i < state.nerves ? '♥' : '♡', FIELD.width - 24 - i * 26, 46, 20, i < state.nerves ? PALETTE.danger : PALETTE.muted, 'right');
    }
    // The eye: the highest guard awareness, and a bar under it. Drawn with
    // canvas shapes (no emoji font needed in headless browsers).
    const eyeX = FIELD.width / 2;
    const eyeY = 62;
    context.fillStyle = PALETTE.text;
    context.beginPath();
    context.ellipse(eyeX - 30, eyeY, 12, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.arc(eyeX - 30, eyeY, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#232839';
    context.fillRect(eyeX - 16, eyeY - 4, 120, 10);
    context.fillStyle = state.maxAwareness >= 1 ? PALETTE.danger : state.maxAwareness >= 0.45 ? PALETTE.gold : PALETTE.exit;
    context.fillRect(eyeX - 16, eyeY - 4, 120 * state.maxAwareness, 10);
    if (state.alertNow) {
      const blink = Math.sin(performance.now() / 120) > 0;
      if (blink) text('SPOTTED!', FIELD.width / 2, 92, 30, PALETTE.danger, 'center');
    } else if (state.exitOpen) {
      text('EXIT OPEN — reach the green door', FIELD.width / 2, 92, 20, PALETTE.exit, 'center');
    }
    // "Press E" hint when standing on a relic.
    const p = state.player;
    for (const relic of state.relics) {
      if (!relic.taken && Math.hypot(relic.x - p.x, relic.y - p.y) < 34) {
        text('Hold E to pocket the relic', p.x, p.y - 34, 16, PALETTE.relic, 'center');
      }
    }
    // Throw hint at the mouse: a faint ring where a pebble would land.
    if (state.pebbles > 0) {
      const m = lastMouseField;
      if (m && Math.hypot(m.x - p.x, m.y - p.y) <= PEBBLE.throwRange) {
        context.strokeStyle = 'rgba(238,241,245,0.35)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(m.x, m.y, 10, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }

  let lastMouseField = null;

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 12, 20, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent ?? PALETTE.gold;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 44, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 34, 22, PALETTE.gold, 'center');
  }

  /** Paint one frame: the field, the actors, the night, then the HUD or a panel. */
  function draw(world, screen, best, extras) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (extras?.mouseField) lastMouseField = extras.mouseField;
    drawFloor(world);
    drawExit(world);
    drawRelics(world);
    drawLamps(world);
    drawCover(world);
    for (const guard of world.state.guards) drawGuard(world, guard);
    drawPlayer(world);
    drawPebblesAndRipples(world);
    drawLighting(world);
    // Cones after the night: they are light themselves, and the darkness
    // layer would dim them into invisibility.
    for (const guard of world.state.guards) drawCone(world, guard);
    if (screen === SCREEN_TITLE) {
      const lines = [
        'Wren, cat burglar, has one night in the Ashford Museum.',
        'Pocket all three relics, then slip out the green door — unseen.',
        '',
        'Move: WASD / arrows    Sneak (quiet): hold Shift',
        'Pocket a relic: hold E    Throw a pebble: click (distracts guards)',
        'Running is loud. Bushes hide you. Shadow slows their eyes.',
        '',
        `Best ${best}`,
      ];
      drawPanel('THE QUIET GALLERY', lines, 'Press Space or click to start', PALETTE.gold);
      return;
    }
    drawHud(world, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The guards will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Caught!', [`The night watch found Wren. Score ${world.state.score}.`, `Best ${best}`], 'Press Space to try again', PALETTE.danger);
    } else if (screen === SCREEN_LEVEL_DONE && extras?.levelSummary) {
      const s = extras.levelSummary;
      drawPanel(`${world.state.levelName} — cleared!`, [
        `Relics pocketed: ${s.relics}  (+${s.relics * 100})`,
        `Time bonus: +${s.timeBonus}`,
        s.ghost ? 'Ghost bonus — never spotted: +250' : 'Spotted this level — no Ghost bonus',
        `Pebbles left: ${s.pebbles}  (+${s.pebbles * 25})`,
        `Level score: ${s.levelScore}    Total: ${s.total}`,
      ], 'Press Space for the next level', PALETTE.exit);
    } else if (screen === SCREEN_WIN && extras?.winSummary) {
      const s = extras.winSummary;
      drawPanel('THE VAULT IS EMPTY', [
        `Wren slipped out with every relic. Final score ${s.total}.`,
        `Time ${s.time}    Caught ${s.caught} time${s.caught === 1 ? '' : 's'}    Best ${best}`,
        s.ghostRun ? 'A perfect Ghost run — never spotted once.' : '',
      ], 'Press Space to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, clientToField };
}
