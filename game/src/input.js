// Keyboard and pointer input. Held keys give a movement direction; one-shot
// presses (start, pause, mute) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// A left click during play is a pebble throw toward that point on the floor.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const PICKUP = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let click = null;
  let mouse = { x: 0, y: 0 };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)
      || SNEAK.has(event.code) || PICKUP.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', (event) => {
    click = { clientX: event.clientX, clientY: event.clientY };
  });
  target.addEventListener('pointermove', (event) => {
    mouse = { x: event.clientX, y: event.clientY };
  });

  function hasAny(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Normalised movement direction, -1..1 on each axis. */
    direction() {
      const dx = (hasAny(RIGHT) ? 1 : 0) - (hasAny(LEFT) ? 1 : 0);
      const dy = (hasAny(DOWN) ? 1 : 0) - (hasAny(UP) ? 1 : 0);
      const len = Math.hypot(dx, dy);
      return len > 0 ? { dx: dx / len, dy: dy / len } : { dx: 0, dy: 0 };
    },
    sneak() {
      return hasAny(SNEAK);
    },
    pickup() {
      return hasAny(PICKUP);
    },
    mouse() {
      return mouse;
    },
    /** The click since the last call, as client coordinates, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
