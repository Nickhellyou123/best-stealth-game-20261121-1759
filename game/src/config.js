// Every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area made of 32px tiles (40 x 22); the renderer scales it
// to the window, so no rule below depends on the screen size.

export const TILE = 32;
export const FIELD = { width: 1280, height: 720, cols: 40, rows: 22 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Tiles: '#' wall, '.' floor, 'C' display case (tall cover), 'T' low shelf, 'p' bush. */
export const TILE_WALL = '#';
export const TILE_FLOOR = '.';
export const TILE_CASE = 'C';
export const TILE_SHELF = 'T';
export const TILE_BUSH = 'p';

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 88,
  /** Seconds a relic pickup takes while standing still on its pedestal. */
  pickupTime: 0.7,
  /** How close a guard must get to catch you while alert. */
  catchRadius: 22,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  suspiciousSpeed: 92,
  chaseSpeed: 148,
  /** Vision cone: how far and how wide a guard sees. */
  viewRange: 185,
  viewHalfAngle: 0.62, // ~35 degrees each side
  /** Seconds standing in a cone at point-blank range fills the meter. */
  detectRate: 1.35,
  decayRate: 0.45,
  /** Meter at which the guard gets suspicious, and at which he gives chase. */
  suspiciousAt: 0.45,
  alertAt: 1,
  /** Seconds a suspicious guard stares at the spot before giving up. */
  stareTime: 2.2,
  /** Seconds an alert guard keeps chasing after losing sight. */
  loseSightTime: 3.5,
  /** A guard only notices a running player through noise inside this radius. */
  hearRadius: 130,
};

export const PEBBLE = {
  max: 3,
  throwRange: 340,
  /** How far the clink carries: guards inside come to look. */
  clinkRadius: 210,
};

export const NERVES = 3;

export const PALETTE = {
  backdrop: '#0a0c14',
  floorA: '#3a4054',
  floorB: '#343a4a',
  carpet: '#4a2b30',
  carpetTrim: '#8a6a3b',
  wall: '#262b3a',
  wallTop: '#4a5470',
  caseGlass: '#7fb3c8',
  caseBase: '#4a3626',
  shelf: '#5d4a2f',
  bush: '#2e4d2a',
  bushLeaf: '#3f6b35',
  lampGlow: '#ffd98a',
  shadow: 'rgba(4, 6, 14, 0.30)',
  player: '#e8b64c',
  playerCloak: '#4a5a94',
  guard: '#c94f4f',
  guardUniform: '#3d4a6b',
  cone: 'rgba(255, 214, 110, 0.20)',
  coneAlert: 'rgba(255, 80, 70, 0.26)',
  relic: '#ffd34d',
  exit: '#58d68d',
  exitLocked: '#7a7f8c',
  panel: '#171a26',
  text: '#eef1f5',
  muted: '#9aa1b5',
  danger: '#ff5a4e',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'quiet-gallery.best';
