// Keyboard input: held set + per-tick edge set. No React in the input path.

export type GameKey =
  | 'up' | 'down' | 'left' | 'right'
  | 'sword' | 'bomb' | 'roll' | 'interact' | 'pause';

const MAP: Record<string, GameKey> = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'sword', KeyZ: 'sword',
  KeyL: 'bomb', KeyC: 'bomb', KeyX: 'bomb', KeyK: 'bomb',
  Space: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll',
  KeyE: 'interact', Enter: 'interact',
  Escape: 'pause',
};

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  held = new Set<GameKey>();
  pressed = new Set<GameKey>();
  private down = (e: KeyboardEvent) => {
    const k = MAP[e.code];
    if (!k) return;
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!this.held.has(k)) this.pressed.add(k);
    this.held.add(k);
  };
  private up = (e: KeyboardEvent) => {
    const k = MAP[e.code];
    if (!k) return;
    this.held.delete(k);
  };

  attach() {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
  }
  detach() {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
  }
  endTick() {
    this.pressed.clear();
  }
}
