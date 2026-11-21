// The game's rules and state, with no drawing and no browser in it: Wren the
// cat burglar, the patrolling guards and their vision cones, detection,
// noise, pebbles, relic pickups and the exit. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound.
import {
  FIELD, GUARD, NERVES, PEBBLE, PLAYER, STEP, TILE,
  TILE_BUSH, TILE_CASE, TILE_SHELF, TILE_WALL,
} from './config.js';
import { LEVELS } from './levels.js';

export const EVENT_PICKUP = 1;
export const EVENT_ALERT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL_DONE = 8;
export const EVENT_PEBBLE = 16;
export const EVENT_SUSPICIOUS = 32;
export const EVENT_GAME_OVER = 64;

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';

const SOLID = new Set([TILE_WALL, TILE_CASE, TILE_SHELF]);
const SIGHT_BLOCK = new Set([TILE_WALL, TILE_CASE]);
const WALKABLE = new Set(['.', TILE_BUSH, 'S', 'E', 'R']);

function tileAt(rows, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= FIELD.cols || ty >= FIELD.rows) return TILE_WALL;
  return rows[ty][tx];
}

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Straight-line sight between two points: blocked by walls and display cases. */
function hasLineOfSight(rows, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((ax + dx * t) / TILE);
    const ty = Math.floor((ay + dy * t) / TILE);
    if (SIGHT_BLOCK.has(tileAt(rows, tx, ty))) return false;
  }
  return true;
}

/** A* over walkable tiles, 4-directional. Returns tile centres from start to goal. */
function findPath(rows, startTx, startTy, goalTx, goalTy) {
  const key = (x, y) => `${x},${y}`;
  const open = [{ x: startTx, y: startTy, g: 0, f: 0, parent: null }];
  const best = new Map([[key(startTx, startTy), 0]]);
  const closed = new Set();
  const heuristic = (x, y) => Math.abs(x - goalTx) + Math.abs(y - goalTy);
  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i].f < open[bi].f) bi = i;
    const node = open.splice(bi, 1)[0];
    if (node.x === goalTx && node.y === goalTy) {
      const path = [];
      let cursor = node;
      while (cursor) {
        path.unshift(tileCentre(cursor.x, cursor.y));
        cursor = cursor.parent;
      }
      return path;
    }
    closed.add(key(node.x, node.y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (!WALKABLE.has(tileAt(rows, nx, ny)) || closed.has(key(nx, ny))) continue;
      const g = node.g + 1;
      if (best.has(key(nx, ny)) && best.get(key(nx, ny)) <= g) continue;
      best.set(key(nx, ny), g);
      open.push({ x: nx, y: ny, g, f: g + heuristic(nx, ny), parent: node });
    }
  }
  return [];
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createWorld() {
  const state = {
    levelIndex: 0,
    levelName: '',
    levelSubtitle: '',
    rows: [],
    lamps: [],
    start: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    exitOpen: false,
    relics: [],
    relicsTotal: 0,
    relicsGot: 0,
    player: { x: 0, y: 0, facing: 0, sneaking: false, moving: false, pickup: 0, pickupTarget: -1 },
    guards: [],
    pebbles: PEBBLE.max,
    pebblesThrown: [],
    ripples: [],
    nerves: NERVES,
    score: 0,
    levelScore: 0,
    elapsed: 0,
    levelElapsed: 0,
    ghost: true,
    caughtCount: 0,
    /** The highest guard awareness right now, for the HUD eye. */
    maxAwareness: 0,
    alertNow: false,
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    state.levelIndex = index;
    state.levelName = def.name;
    state.levelSubtitle = def.subtitle;
    state.rows = def.rows;
    state.lamps = def.lamps.map(([x, y]) => tileCentre(x, y));
    state.relics = [];
    state.guards = [];
    state.pebbles = PEBBLE.max;
    state.pebblesThrown = [];
    state.ripples = [];
    state.exitOpen = false;
    state.relicsGot = 0;
    state.levelScore = 0;
    state.levelElapsed = 0;
    state.ghost = true;
    def.rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === 'S') state.start = tileCentre(x, y);
        else if (ch === 'E') state.exit = tileCentre(x, y);
        else if (ch === 'R') state.relics.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false });
      });
    });
    state.relicsTotal = state.relics.length;
    state.player.x = state.start.x;
    state.player.y = state.start.y;
    state.player.facing = 0;
    state.player.pickup = 0;
    state.player.pickupTarget = -1;
    for (const defGuard of def.guards) {
      const first = tileCentre(defGuard.waypoints[0][0], defGuard.waypoints[0][1]);
      const second = tileCentre(defGuard.waypoints[1][0], defGuard.waypoints[1][1]);
      state.guards.push({
        x: first.x,
        y: first.y,
        facing: Math.atan2(second.y - first.y, second.x - first.x),
        state: GUARD_PATROL,
        awareness: 0,
        waypointIndex: 1,
        pauseLeft: 0,
        pauseDuration: defGuard.pause,
        waypoints: defGuard.waypoints,
        path: [],
        pathIndex: 0,
        repathIn: 0,
        stareLeft: 0,
        lastSeen: null,
        investigate: null,
        loseSightLeft: 0,
        scanPhase: 0,
      });
    }
  }

  function resetRun() {
    state.score = 0;
    state.elapsed = 0;
    state.nerves = NERVES;
    state.caughtCount = 0;
    loadLevel(0);
  }

  function isLit(x, y) {
    for (const lamp of state.lamps) {
      const dx = x - lamp.x;
      const dy = y - lamp.y;
      if (dx * dx + dy * dy < 110 * 110 && hasLineOfSight(state.rows, lamp.x, lamp.y, x, y)) return true;
    }
    return false;
  }

  function isInBush(x, y) {
    return tileAt(state.rows, Math.floor(x / TILE), Math.floor(y / TILE)) === TILE_BUSH;
  }

  function moveCircle(entity, dx, dy, radius) {
    // Axis-separated so sliding along a wall still works.
    let nx = entity.x + dx;
    const top = Math.floor((entity.y - radius) / TILE);
    const bottom = Math.floor((entity.y + radius) / TILE);
    const left = Math.floor((nx - radius) / TILE);
    const right = Math.floor((nx + radius) / TILE);
    let blocked = false;
    for (let ty = top; ty <= bottom && !blocked; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (SOLID.has(tileAt(state.rows, tx, ty))) { blocked = true; break; }
      }
    }
    if (!blocked) entity.x = nx;
    let ny = entity.y + dy;
    const top2 = Math.floor((ny - radius) / TILE);
    const bottom2 = Math.floor((ny + radius) / TILE);
    const left2 = Math.floor((entity.x - radius) / TILE);
    const right2 = Math.floor((entity.x + radius) / TILE);
    blocked = false;
    for (let ty = top2; ty <= bottom2 && !blocked; ty += 1) {
      for (let tx = left2; tx <= right2; tx += 1) {
        if (SOLID.has(tileAt(state.rows, tx, ty))) { blocked = true; break; }
      }
    }
    if (!blocked) entity.y = ny;
  }

  function guardCanSee(guard) {
    const p = state.player;
    const dx = p.x - guard.x;
    const dy = p.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.viewRange) return 0;
    if (isInBush(p.x, p.y) && dist > 48) return 0;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angle, guard.facing)) > GUARD.viewHalfAngle) return 0;
    if (!hasLineOfSight(state.rows, guard.x, guard.y, p.x, p.y)) return 0;
    // Closer and brighter reads faster; sneaking and shadow slow it down.
    let visibility = 1 - (dist / GUARD.viewRange) * 0.6;
    if (p.sneaking) visibility *= 0.55;
    else if (p.moving) visibility *= 1.35;
    if (!isLit(p.x, p.y)) visibility *= 0.5;
    return Math.max(0.05, visibility);
  }

  function setPath(guard, tx, ty) {
    const fromTx = Math.floor(guard.x / TILE);
    const fromTy = Math.floor(guard.y / TILE);
    guard.path = findPath(state.rows, fromTx, fromTy, tx, ty);
    guard.pathIndex = guard.path.length > 1 ? 1 : 0;
  }

  function followPath(guard, speed, dt) {
    if (guard.pathIndex >= guard.path.length) return true;
    const target = guard.path[guard.pathIndex];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      guard.pathIndex += 1;
      return guard.pathIndex >= guard.path.length;
    }
    const stepLen = speed * dt;
    guard.x += (dx / dist) * Math.min(stepLen, dist);
    guard.y += (dy / dist) * Math.min(stepLen, dist);
    guard.facing = Math.atan2(dy, dx);
    return false;
  }

  function becomeSuspicious(guard, point, awareness) {
    if (guard.state === GUARD_ALERT) return false;
    const wasPatrol = guard.state === GUARD_PATROL;
    guard.state = GUARD_SUSPICIOUS;
    guard.investigate = { x: point.x, y: point.y };
    guard.awareness = Math.max(guard.awareness, awareness);
    setPath(guard, Math.floor(point.x / TILE), Math.floor(point.y / TILE));
    return wasPatrol;
  }

  function becomeAlert(guard) {
    if (guard.state === GUARD_ALERT) return false;
    guard.state = GUARD_ALERT;
    guard.loseSightLeft = GUARD.loseSightTime;
    guard.lastSeen = { x: state.player.x, y: state.player.y };
    state.ghost = false;
    return true;
  }

  function stepGuard(guard, dt, events) {
    const seen = guardCanSee(guard);
    if (seen > 0) {
      guard.awareness = Math.min(1, guard.awareness + GUARD.detectRate * seen * dt);
      guard.lastSeen = { x: state.player.x, y: state.player.y };
      if (guard.state === GUARD_ALERT) guard.loseSightLeft = GUARD.loseSightTime;
    } else {
      guard.awareness = Math.max(0, guard.awareness - GUARD.decayRate * dt);
      if (guard.state === GUARD_ALERT) {
        guard.loseSightLeft -= dt;
        if (guard.loseSightLeft <= 0) {
          guard.state = GUARD_SUSPICIOUS;
          guard.investigate = guard.lastSeen;
          guard.stareLeft = 0;
          if (guard.lastSeen) setPath(guard, Math.floor(guard.lastSeen.x / TILE), Math.floor(guard.lastSeen.y / TILE));
        }
      }
    }
    if (guard.awareness >= GUARD.alertAt && guard.state !== GUARD_ALERT) {
      if (becomeAlert(guard)) events.value |= EVENT_ALERT;
    } else if (guard.awareness >= GUARD.suspiciousAt && guard.state === GUARD_PATROL) {
      if (becomeSuspicious(guard, guard.lastSeen ?? { x: guard.x, y: guard.y }, guard.awareness)) events.value |= EVENT_SUSPICIOUS;
    }

    if (guard.state === GUARD_PATROL) {
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        // Scan the room while waiting at a waypoint.
        guard.scanPhase += dt;
        guard.facing += Math.sin(guard.scanPhase * 1.4) * 0.9 * dt;
        return;
      }
      if (guard.path.length === 0 || guard.pathIndex >= guard.path.length) {
        const wp = guard.waypoints[guard.waypointIndex];
        setPath(guard, wp[0], wp[1]);
        if (guard.path.length === 0) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.pauseLeft = guard.pauseDuration;
          return;
        }
      }
      if (followPath(guard, GUARD.patrolSpeed, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.pauseDuration;
        guard.path = [];
      }
    } else if (guard.state === GUARD_SUSPICIOUS) {
      if (guard.investigate && followPath(guard, GUARD.suspiciousSpeed, dt)) {
        // Arrived: stare around, then drift back to the patrol.
        guard.stareLeft += dt;
        guard.scanPhase += dt;
        guard.facing += Math.sin(guard.scanPhase * 1.8) * 1.4 * dt;
        if (guard.stareLeft > GUARD.stareTime) {
          guard.state = GUARD_PATROL;
          guard.awareness = 0.15;
          guard.investigate = null;
          guard.stareLeft = 0;
          const wp = guard.waypoints[guard.waypointIndex];
          setPath(guard, wp[0], wp[1]);
        }
      }
    } else {
      // Alert: chase the player, repathing often while he is visible.
      guard.repathIn -= dt;
      if ((seen > 0 && guard.repathIn <= 0) || guard.pathIndex >= guard.path.length) {
        setPath(guard, Math.floor(state.player.x / TILE), Math.floor(state.player.y / TILE));
        guard.repathIn = 0.4;
      }
      followPath(guard, GUARD.chaseSpeed, dt);
    }
  }

  function noiseAt(x, y, radius) {
    for (const guard of state.guards) {
      const dist = Math.hypot(guard.x - x, guard.y - y);
      if (dist < radius && guard.state !== GUARD_ALERT) {
        becomeSuspicious(guard, { x, y }, 0.3);
      }
    }
    state.ripples.push({ x, y, radius, age: 0, maxAge: 0.9 });
  }

  let noiseTimer = 0;

  function step(dt, input) {
    const events = { value: 0 };
    state.elapsed += dt;
    state.levelElapsed += dt;
    const p = state.player;

    // --- Player movement ---
    const len = Math.hypot(input.dx, input.dy);
    p.moving = len > 0.01;
    p.sneaking = input.sneak;
    if (p.moving) {
      const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      const nx = input.dx / (len || 1);
      const ny = input.dy / (len || 1);
      p.facing = Math.atan2(ny, nx);
      moveCircle(p, nx * speed * dt, ny * speed * dt, PLAYER.radius);
      p.pickup = 0;
      p.pickupTarget = -1;
      if (!p.sneaking) {
        noiseTimer -= dt;
        if (noiseTimer <= 0) {
          noiseTimer = 0.45;
          noiseAt(p.x, p.y, GUARD.hearRadius);
          state.ripples.push({ x: p.x, y: p.y, radius: 46, age: 0, maxAge: 0.5 });
        }
      }
    }

    // --- Pebble throw (one-shot from the caller) ---
    if (input.throwAt && state.pebbles > 0) {
      const dx = input.throwAt.x - p.x;
      const dy = input.throwAt.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= PEBBLE.throwRange && dist > 8) {
        state.pebbles -= 1;
        const landX = p.x + (dx / dist) * dist;
        const landY = p.y + (dy / dist) * dist;
        state.pebblesThrown.push({ x: landX, y: landY, age: 0 });
        noiseAt(landX, landY, PEBBLE.clinkRadius);
        events.value |= EVENT_PEBBLE;
      }
    }

    // --- Relic pickup: hold E, stand still on the pedestal ---
    let nearRelic = -1;
    for (let i = 0; i < state.relics.length; i += 1) {
      const relic = state.relics[i];
      if (!relic.taken && Math.hypot(relic.x - p.x, relic.y - p.y) < 34) { nearRelic = i; break; }
    }
    if (nearRelic >= 0 && input.pickup && !p.moving) {
      p.pickupTarget = nearRelic;
      p.pickup += dt / PLAYER.pickupTime;
      if (p.pickup >= 1) {
        state.relics[nearRelic].taken = true;
        state.relicsGot += 1;
        state.levelScore += 100;
        p.pickup = 0;
        p.pickupTarget = -1;
        events.value |= EVENT_PICKUP;
        if (state.relicsGot === state.relicsTotal) state.exitOpen = true;
      }
    } else {
      p.pickup = 0;
      p.pickupTarget = -1;
    }

    // --- Guards ---
    state.maxAwareness = 0;
    state.alertNow = false;
    for (const guard of state.guards) {
      stepGuard(guard, dt, events);
      state.maxAwareness = Math.max(state.maxAwareness, guard.awareness);
      if (guard.state === GUARD_ALERT) state.alertNow = true;
      // Caught: an alert guard (or one that walks straight into you) grabs Wren.
      const dist = Math.hypot(guard.x - p.x, guard.y - p.y);
      if (dist < PLAYER.catchRadius && !isInBush(p.x, p.y)) {
        state.nerves -= 1;
        state.caughtCount += 1;
        events.value |= EVENT_CAUGHT;
        if (state.nerves <= 0) events.value |= EVENT_GAME_OVER;
        return events.value;
      }
    }

    // --- Exit ---
    if (state.exitOpen && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 30) {
      const timeBonus = Math.max(0, Math.round((LEVELS[state.levelIndex].parSeconds - state.levelElapsed) * 5));
      const ghostBonus = state.ghost ? 250 : 0;
      const pebbleBonus = state.pebbles * 25;
      state.levelScore += timeBonus + ghostBonus + pebbleBonus;
      state.score += state.levelScore;
      events.value |= EVENT_LEVEL_DONE;
      return events.value;
    }

    // --- Ripples and thrown pebbles fade ---
    for (const ripple of state.ripples) ripple.age += dt;
    state.ripples = state.ripples.filter((r) => r.age < r.maxAge);
    for (const pebble of state.pebblesThrown) pebble.age += dt;
    state.pebblesThrown = state.pebblesThrown.filter((peb) => peb.age < 3);

    return events.value;
  }

  loadLevel(0);

  return {
    state,
    step,
    loadLevel,
    resetRun,
    hasLineOfSight: (ax, ay, bx, by) => hasLineOfSight(state.rows, ax, ay, bx, by),
    isLit,
    isInBush,
    /** For the screenshot stager: put Wren and the guards exactly where asked. */
    debugPlace(playerX, playerY, guardStates) {
      state.player.x = playerX;
      state.player.y = playerY;
      guardStates.forEach((g, i) => {
        const guard = state.guards[i];
        if (!guard) return;
        if (g.x !== undefined) guard.x = g.x;
        if (g.y !== undefined) guard.y = g.y;
        if (g.facing !== undefined) guard.facing = g.facing;
        if (g.awareness !== undefined) guard.awareness = g.awareness;
        if (g.state !== undefined) guard.state = g.state;
        if (g.path) { guard.path = g.path; guard.pathIndex = 0; }
      });
    },
  };
}
