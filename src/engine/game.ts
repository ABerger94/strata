// STRATA vertical slice — game engine.
// Canvas 2D, fixed-timestep 60Hz, zero game-engine dependencies.
// React owns overlays/HUD; this class owns the simulation.

import { ROOMS, INTRO_LINES, BOARD_BASE, BOARD_DRAINED, BOARD_PRESERVED, WELL_DRY, WELL_FLOWING, GRATE_TEXT, BOSS_INTRO, type RoomDef, type EntDef } from '../data/content';
import { newLedger, deriveTown, saveGame, loadGame, slotSummary, type Ledger, type PlayerSave } from '../data/ledger';
import { getSprite } from './sprites';
import { sfx, unlockAudio } from './audio';
import { Input } from './input';

export const TILE = 32;
const VIEW_W = 640;
const VIEW_H = 384;

export interface HudState {
  hearts: number; maxHearts: number;
  gold: number; bombs: number; bombCap: number;
  potions: number; keys: number; bossKey: boolean;
  heartPieces: number; roomName: string;
  toast: string; hint: string;
  innPrice: number; well: string;
}

export type Overlay =
  | 'title' | 'slots' | 'dialog' | 'shop' | 'hearth' | 'board'
  | 'choice' | 'shaft' | 'pause' | 'dead' | null;

export interface Snapshot {
  overlay: Overlay;
  who: string; text: string;
  hud: HudState;
  choiceKind: 'drain' | 'preserve' | null;
  choiceLabel: string;
  boardLines: string[];
  slots: (string | null)[];
  slotMode: 'new' | 'continue';
  innPrice: number;
  canRest: boolean;
}

interface Player {
  x: number; y: number; dir: 'up' | 'down' | 'left' | 'right';
  hearts: number; maxHearts: number;
  gold: number; bombs: number; bombCap: number;
  potions: number; potionCap: number;
  keys: number; bossKey: boolean; heartPieces: number; hasBombs: boolean;
  swingT: number; swingCd: number; swingId: number;
  rollT: number; rollCd: number; iframes: number;
  kx: number; ky: number; dead: boolean;
  lastChute: string;
}

interface Enemy {
  id: string; kind: 'crab' | 'hound' | 'boss';
  x: number; y: number; hp: number; maxHp: number;
  armored: boolean; ang: number;
  state: string; t: number; flash: number;
  kx: number; ky: number; lx: number; ly: number;
  staggered: number; slamCd: number; spawnCd: number;
  hitBy: number; announced: boolean;
}

interface REnt {
  def: EntDef; x: number; y: number;
  opened: boolean; trapT: number; trapState: number; pulled: boolean;
}

interface Bomb { x: number; y: number; fuse: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; }
interface Pickup { id: string; ptype: string; amount: number; x: number; y: number; t: number; }

const DIRS: Record<string, [number, number]> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

export class Game {
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private raf = 0;
  private last = 0;
  private acc = 0;
  private subs: ((s: Snapshot) => void)[] = [];

  private mode: 'title' | 'play' = 'title';
  private overlay: Overlay = 'title';
  private dlg: { who: string; text: string }[] = [];
  private dlgIdx = 0;
  private dlgDone: (() => void) | null = null;
  private choiceKind: 'drain' | 'preserve' | null = null;
  private slotMode: 'new' | 'continue' = 'new';
  private currentSlot = 1;

  private ledger: Ledger = newLedger();
  private p: Player = this.freshPlayer();
  private roomId = 'gallow';
  private room: RoomDef = ROOMS.gallow;
  private tiles: string[][] = [];
  private enemies: Enemy[] = [];
  private rents: REnt[] = [];
  private pickups: Pickup[] = [];
  private bombs: Bomb[] = [];
  private parts: Particle[] = [];
  private flags = new Set<string>();
  private staticLayer: HTMLCanvasElement | null = null;

  private shakeT = 0;
  private fadeT = 0;
  private fadeDir = 0;
  private fadeCb: (() => void) | null = null;
  private toast = '';
  private toastT = 0;
  private hint = '';
  private roomCardT = 0;
  private dripT = 0;
  private deadT = 0;
  private lastHudJson = '';

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx.imageSmoothingEnabled = false;
    this.input.attach();
    this.loadRoom('gallow', 10, 8);
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      const step = 1 / 60;
      while (this.acc >= step) {
        this.acc -= step;
        this.tick(step);
      }
      this.render();
      this.input.endTick();
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.input.detach();
  }

  subscribe(fn: (s: Snapshot) => void) {
    this.subs.push(fn);
    fn(this.snapshot());
  }

  // ---------- setup ----------

  private freshPlayer(): Player {
    return {
      x: 10 * TILE + 16, y: 8 * TILE + 16, dir: 'down',
      hearts: 6, maxHearts: 6, gold: 30,
      bombs: 0, bombCap: 10, potions: 0, potionCap: 2,
      keys: 0, bossKey: false, heartPieces: 0, hasBombs: false,
      swingT: 0, swingCd: 0, swingId: 0,
      rollT: 0, rollCd: 0, iframes: 0,
      kx: 0, ky: 0, dead: false, lastChute: 'gallow',
    };
  }

  private hasFlag(f: string) { return this.flags.has(f); }
  private setFlag(f: string) { this.flags.add(f); }

  private tileAt(tx: number, ty: number): string {
    if (ty < 0 || ty >= this.tiles.length || tx < 0 || tx >= this.tiles[0].length) return '#';
    return this.tiles[ty][tx];
  }

  private inExit(tx: number, ty: number): { to: string; tx: number; ty: number } | null {
    for (const e of this.room.exits) {
      if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) {
        if (e.cond === 'res_open' && this.ledger.layers.cistern.choice === 'drained') return null;
        if (e.cond === 'bossdead' && !this.hasFlag('bossdead')) return null;
        if (e.cond && e.cond.startsWith('flag:') && !this.hasFlag(e.cond.slice(5))) return null;
        return e;
      }
    }
    return null;
  }

  private solidTile(tx: number, ty: number): boolean {
    const t = this.tileAt(tx, ty);
    const ex = this.inExit(tx, ty);
    if (ex) return false;
    // sealed reservoir exit draws rubble and blocks
    if (t === '.' && this.room.id === 'cistern_d4' && tx === 4 && ty === 9 &&
      this.ledger.layers.cistern.choice === 'drained') return true;
    return t === '#' || t === ',' || t === 'D' || t === 'B' || t === 'G' || t === '~' ||
      t === 'N' || t === 'W' || t === 'H' || t === 'S' || t === 'F';
  }

  private solidAt(px: number, py: number): boolean {
    const r = 10;
    const pts = [[px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r]];
    for (const [x, y] of pts) {
      if (this.solidTile(Math.floor(x / TILE), Math.floor(y / TILE))) return true;
    }
    return false;
  }

  private loadRoom(id: string, tx: number, ty: number) {
    this.roomId = id;
    this.room = ROOMS[id];
    this.tiles = this.room.tiles.map((row) => row.split(''));
    // restore broken cracked walls + opened doors
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const t = this.tiles[y][x];
        if (t === ',' && this.hasFlag(`wall:${id}:${x},${y}`)) this.tiles[y][x] = '.';
        if ((t === 'D' || t === 'B') && this.hasFlag(`door:${id}:${x},${y}`)) this.tiles[y][x] = '.';
      }
    }
    this.p.x = tx * TILE + 16;
    this.p.y = ty * TILE + 16;
    this.p.kx = 0; this.p.ky = 0;
    this.enemies = [];
    this.rents = [];
    this.pickups = [];
    this.bombs = [];
    for (const d of this.room.ents) {
      const x = d.x * TILE + 16, y = d.y * TILE + 16;
      if (d.kind === 'crab') {
        this.enemies.push({ id: d.id, kind: 'crab', x, y, hp: 2, maxHp: 2, armored: false, ang: 0, state: 'wander', t: Math.random(), flash: 0, kx: 0, ky: 0, lx: 0, ly: 0, staggered: 0, slamCd: 0, spawnCd: 0, hitBy: -1, announced: false });
      } else if (d.kind === 'hound') {
        if (this.hasFlag('hounddead')) continue;
        this.enemies.push({ id: d.id, kind: 'hound', x, y, hp: 3, maxHp: 3, armored: true, ang: 0, state: 'wander', t: 0, flash: 0, kx: 0, ky: 0, lx: 0, ly: 0, staggered: 0, slamCd: 0, spawnCd: 0, hitBy: -1, announced: false });
      } else if (d.kind === 'boss') {
        if (this.hasFlag('bossdead')) continue;
        this.enemies.push({ id: d.id, kind: 'boss', x, y, hp: 6, maxHp: 6, armored: true, ang: 0, state: 'chase', t: 0, flash: 0, kx: 0, ky: 0, lx: 0, ly: 0, staggered: 0, slamCd: 4, spawnCd: 6, hitBy: -1, announced: false });
      } else if (d.kind === 'pickup') {
        if (this.hasFlag(`pickup:${d.id}`)) continue;
        this.pickups.push({ id: d.id, ptype: d.ptype!, amount: d.amount ?? 1, x, y, t: Math.random() * 6 });
      } else if (d.kind === 'chest') {
        this.rents.push({ def: d, x, y, opened: this.hasFlag(`chest:${d.id}`), trapT: 0, trapState: 0, pulled: false });
      } else {
        this.rents.push({ def: d, x, y, opened: false, trapT: Math.random() * 2, trapState: 0, pulled: this.hasFlag('choice_made') });
      }
    }
    // lever/spike show pulled state after the choice
    for (const r of this.rents) {
      if ((r.def.kind === 'lever' || r.def.kind === 'spike') && this.hasFlag('choice_made')) r.pulled = true;
    }
    this.buildStatic();
    this.roomCardT = 2.2;
    this.emit();
  }

  // ---------- static layer ----------

  private buildStatic() {
    const c = document.createElement('canvas');
    c.width = VIEW_W; c.height = VIEW_H;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const tileSpr: Record<string, string> = {
      '#': 'wall', '.': 'floor', ',': 'cracked_wall', '~': 'water',
      N: 'board', W: 'well', H: 'hearth', S: 'shop', F: 'fountain_dry', '=': 'chute', G: 'gate',
    };
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const t = this.tiles[y][x];
        const inExit = this.inExit(x, y) !== null;
        if (inExit) {
          g.drawImage(getSprite('exit_door'), x * TILE, y * TILE, TILE, TILE);
          continue;
        }
        if (t === 'D' || t === 'B') {
          g.drawImage(getSprite('floor'), x * TILE, y * TILE, TILE, TILE);
          continue; // doors drawn dynamically
        }
        const s = tileSpr[t] ?? 'floor';
        g.drawImage(getSprite(s), x * TILE, y * TILE, TILE, TILE);
      }
    }
    this.staticLayer = c;
  }

  // ---------- UI bridge ----------

  private snapshot(): Snapshot {
    const town = deriveTown(this.ledger);
    const c = this.ledger.layers.cistern;
    const boardLines: string[] = [];
    if (c.choice === 'drained') boardLines.push(BOARD_DRAINED);
    else if (c.choice === 'preserved') boardLines.push(BOARD_PRESERVED);
    else boardLines.push(BOARD_BASE);
    if (c.cleared && !c.choice) boardLines.push('THE SLUICEKEEPER IS DEAD — the old sluice waits for a decision.');
    return {
      overlay: this.overlay,
      who: this.dlg[this.dlgIdx]?.who ?? '',
      text: this.dlg[this.dlgIdx]?.text ?? '',
      hud: {
        hearts: this.p.hearts, maxHearts: this.p.maxHearts,
        gold: this.p.gold, bombs: this.p.bombs, bombCap: this.p.bombCap,
        potions: this.p.potions, keys: this.p.keys, bossKey: this.p.bossKey,
        heartPieces: this.p.heartPieces, roomName: this.room.name,
        toast: this.toastT > 0 ? this.toast : '', hint: this.hint,
        innPrice: town.innPrice, well: town.well,
      },
      choiceKind: this.choiceKind,
      choiceLabel: this.choiceKind === 'drain'
        ? 'Pull the sluice lever? The Cistern drains and the town drinks.'
        : 'Drive the spike? The Cistern holds and the reservoir below stays.',
      boardLines,
      slots: this.slotsCache,
      slotMode: this.slotMode,
      innPrice: town.innPrice,
      canRest: this.p.gold >= town.innPrice || town.innPrice === 0,
    };
  }

  private emit() {
    const s = this.snapshot();
    const j = JSON.stringify([s.overlay, s.who, s.text, s.hud, s.choiceKind, s.slots]);
    if (j === this.lastHudJson) return;
    this.lastHudJson = j;
    for (const fn of this.subs) fn(s);
  }

  private slotsCache: (string | null)[] = [null, null, null];

  private setOverlay(o: Overlay) {
    this.overlay = o;
    if (o === 'slots') this.slotsCache = [1, 2, 3].map((n) => slotSummary(n));
    this.emit();
  }

  private showDialog(lines: { who: string; text: string }[] | string[], done?: () => void, who = '') {
    this.dlg = (lines as (string | { who: string; text: string })[]).map((l) =>
      typeof l === 'string' ? { who, text: l } : l,
    );
    this.dlgIdx = 0;
    this.dlgDone = done ?? null;
    this.setOverlay('dialog');
  }

  // React-called actions
  uiUnlockAudio() { unlockAudio(); }
  uiAdvanceDialog() {
    sfx('step');
    this.dlgIdx++;
    if (this.dlgIdx >= this.dlg.length) {
      this.setOverlay(null);
      const cb = this.dlgDone;
      this.dlgDone = null;
      if (cb) cb();
    } else this.emit();
  }
  uiNewGame(slot: number) {
    this.currentSlot = slot;
    this.ledger = newLedger();
    this.p = this.freshPlayer();
    this.flags = new Set();
    this.mode = 'play';
    this.loadRoom('gallow', 10, 8);
    this.showDialog(INTRO_LINES);
    this.autosave();
  }
  uiContinue(slot: number) {
    const s = loadGame(slot);
    if (!s) return;
    this.currentSlot = slot;
    this.ledger = s.ledger;
    this.flags = new Set(s.player.flags);
    const pl = s.player;
    this.p = { ...this.freshPlayer(), ...pl, swingT: 0, swingCd: 0, rollT: 0, rollCd: 0, iframes: 0, kx: 0, ky: 0, dead: false };
    this.mode = 'play';
    this.loadRoom(pl.room, Math.floor(pl.x / TILE), Math.floor(pl.y / TILE));
    this.setOverlay(null);
  }
  uiPickSlot(mode: 'new' | 'continue') {
    this.slotMode = mode;
    this.setOverlay('slots');
  }
  uiBackToTitle() { this.setOverlay('title'); }
  uiRest() {
    const town = deriveTown(this.ledger);
    if (town.innPrice > 0) {
      if (this.p.gold < town.innPrice) { sfx('locked'); return; }
      this.p.gold -= town.innPrice;
    }
    this.p.hearts = this.p.maxHearts;
    sfx('heal');
    this.autosave();
    this.showDialog([{ who: 'THE HEARTH', text: town.innPrice === 0 ? 'You rest by the fire. The town drinks tonight — no charge.' : 'You rest by the fire. (-' + town.innPrice + 'g) Saved.' }]);
  }
  uiBuyBomb() {
    if (this.p.gold < 5 || this.p.bombs >= this.p.bombCap) { sfx('locked'); return; }
    this.p.gold -= 5;
    this.p.hasBombs = true;
    this.p.bombs++;
    sfx('coin');
    this.emit();
  }
  uiBuyPotion() {
    if (this.p.gold < 30 || this.p.potions >= this.p.potionCap) { sfx('locked'); return; }
    this.p.gold -= 30;
    this.p.potions++;
    sfx('coin');
    this.emit();
  }
  uiDrinkPotion() {
    if (this.p.potions <= 0 || this.p.hearts >= this.p.maxHearts) { sfx('locked'); return; }
    this.p.potions--;
    this.p.hearts = Math.min(this.p.maxHearts, this.p.hearts + 8);
    sfx('heal');
    this.setToast('Drank red potion (+4 hearts)');
    this.emit();
  }
  uiConfirmChoice() {
    if (!this.choiceKind) return;
    const kind = this.choiceKind;
    const rec = this.ledger.layers.cistern;
    rec.choice = kind === 'drain' ? 'drained' : 'preserved';
    if (kind === 'drain') { rec.broke.push('sluice_gates'); } else { rec.saved.push('lower_reservoir'); }
    this.setFlag('choice_made');
    for (const r of this.rents) {
      if (r.def.kind === 'lever' || r.def.kind === 'spike') r.pulled = true;
    }
    sfx('choice');
    this.buildStatic();
    this.choiceKind = null;
    if (kind === 'drain') {
      this.showDialog([
        { who: '', text: 'You pull the sluice lever. Somewhere below, four generations of still water begin to move.' },
        { who: '', text: 'THE CISTERN WAS DRAINED — the fountain flows. The Hearth rests free, tonight and always.' },
      ]);
    } else {
      this.showDialog([
        { who: '', text: 'You drive the spike home. The old sluice holds — the reservoir below stays drowned and waiting.' },
        { who: '', text: 'THE CISTERN WAS PRESERVED — the lower reservoir remains explorable. The inn still charges 20g.' },
      ]);
    }
    this.autosave();
  }
  uiCancelChoice() {
    this.choiceKind = null;
    this.setOverlay(null);
  }
  uiTravel(to: string) {
    this.setOverlay(null);
    sfx('sting');
    if (to === 'gallow') {
      this.fadeTo(() => { this.p.lastChute = 'gallow'; this.loadRoom('gallow', 13, 6); this.autosave(); });
    } else {
      this.fadeTo(() => { this.p.lastChute = 'cistern_entry'; this.loadRoom('cistern_entry', 3, 3); this.autosave(); });
    }
  }
  uiResume() { this.setOverlay(null); }
  uiSaveQuit() {
    this.autosave();
    this.mode = 'title';
    this.setOverlay('title');
  }
  uiRespawn() {
    this.p.dead = false;
    this.p.hearts = this.p.maxHearts;
    this.setOverlay(null);
    const r = this.p.lastChute;
    this.loadRoom(r, r === 'gallow' ? 13 : 3, r === 'gallow' ? 6 : 3);
    this.showDialog([{ who: '', text: 'You wake at the last chute, lighter by half your gold. Your cache glints where you fell — go back for it.' }]);
  }

  private autosave() {
    const pl: PlayerSave = {
      hearts: this.p.hearts, maxHearts: this.p.maxHearts, gold: this.p.gold,
      bombs: this.p.bombs, bombCap: this.p.bombCap, potions: this.p.potions,
      potionCap: this.p.potionCap, keys: this.p.keys, bossKey: this.p.bossKey,
      heartPieces: this.p.heartPieces, room: this.roomId, x: this.p.x, y: this.p.y,
      flags: [...this.flags], hasBombs: this.p.hasBombs,
    };
    saveGame(this.currentSlot, { ledger: this.ledger, player: pl });
  }

  private setToast(t: string) {
    this.toast = t;
    this.toastT = 2.5;
  }

  private fadeTo(cb: () => void) {
    this.fadeT = 0;
    this.fadeDir = 1;
    this.fadeCb = cb;
  }

  // ---------- combat ----------

  private hurtPlayer(dmg: number, sx: number, sy: number) {
    const p = this.p;
    if (p.iframes > 0 || p.rollT > 0 || p.dead || this.mode !== 'play') return;
    p.hearts -= dmg;
    p.iframes = 0.8;
    const dx = p.x - sx, dy = p.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    p.kx = (dx / d) * 220;
    p.ky = (dy / d) * 220;
    sfx('hurt');
    this.shakeT = 0.25;
    this.burst(p.x, p.y, '#d83c3c', 8);
    if (p.hearts <= 0) this.die();
    this.emit();
  }

  private die() {
    const p = this.p;
    p.dead = true;
    p.hearts = 0;
    const drop = Math.floor(p.gold / 2);
    p.gold -= drop;
    this.deadT = 1.0;
    this.burst(p.x, p.y, '#e8e2d0', 16);
    sfx('kill');
    if (drop > 0) {
      this.pickups.push({ id: `cache_${Date.now()}`, ptype: 'cache', amount: drop, x: p.x, y: p.y, t: 0 });
    }
  }

  private damageEnemy(e: Enemy, dmg: number, sx: number, sy: number) {
    if (e.hp <= 0) return;
    if (e.kind === 'boss') {
      if (e.staggered <= 0) { this.setToast('Armored — bomb a sluice-gate!'); return; }
    } else if (e.armored) {
      return; // sword does nothing to armor; bombs handled separately
    }
    e.hp -= dmg;
    e.flash = 0.12;
    const dx = e.x - sx, dy = e.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    const kb = e.kind === 'boss' ? 40 : 160;
    e.kx = (dx / d) * kb;
    e.ky = (dy / d) * kb;
    sfx('hit');
    this.burst(e.x, e.y, '#ffffff', 5);
    if (e.hp <= 0) this.killEnemy(e);
    this.emit();
  }

  private bombDamageEnemy(e: Enemy, sx: number, sy: number) {
    if (e.hp <= 0) return;
    if (e.kind === 'boss') return; // the boss is only hurt via the stagger punish
    if (e.armored) {
      e.armored = false;
      this.setToast('Armor cracked!');
      sfx('hit');
    }
    e.hp -= 2;
    e.flash = 0.15;
    const dx = e.x - sx, dy = e.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    e.kx = (dx / d) * 200;
    e.ky = (dy / d) * 200;
    this.burst(e.x, e.y, '#f0a83c', 8);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    sfx('kill');
    this.burst(e.x, e.y, '#8a6f3c', 12);
    if (e.kind === 'crab') {
      this.pickups.push({ id: `d_${e.id}_${Date.now()}`, ptype: 'gold', amount: 3, x: e.x, y: e.y, t: 0 });
      if (Math.random() < 0.3) this.pickups.push({ id: `h_${e.id}_${Date.now()}`, ptype: 'heart', amount: 1, x: e.x + 12, y: e.y, t: 0 });
    } else if (e.kind === 'hound') {
      this.setFlag('hounddead');
      this.pickups.push({ id: 'hound_key', ptype: 'bosskey', amount: 1, x: e.x, y: e.y - 10, t: 0 });
      this.pickups.push({ id: 'hound_gold', ptype: 'gold', amount: 15, x: e.x, y: e.y + 12, t: 0 });
      this.showDialog([{ who: '', text: 'The Sluice Hound falls. It was guarding a heavy brass key.' }]);
    } else if (e.kind === 'boss') {
      this.setFlag('bossdead');
      this.ledger.layers.cistern.cleared = true;
      this.pickups.push({ id: 'boss_container', ptype: 'container', amount: 1, x: e.x, y: e.y, t: 0 });
      this.pickups.push({ id: 'boss_gold', ptype: 'gold', amount: 40, x: e.x + 20, y: e.y, t: 0 });
      sfx('choice');
      this.showDialog([
        { who: '', text: 'THE SLUICEKEEPER collapses. The old sluice stands open behind it — lever and spike, waiting.' },
        { who: '', text: 'One pull decides who drinks. DRAIN the Cistern, or PRESERVE it. The town will feel it either way.' },
      ]);
      this.autosave();
    }
    this.emit();
  }

  private burst(x: number, y: number, col: string, n: number) {
    for (let i = 0; i < n && this.parts.length < 64; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, max: 0.7, col, size: 2 + Math.random() * 3 });
    }
  }

  private explode(x: number, y: number) {
    sfx('explode');
    this.shakeT = 0.3;
    this.burst(x, y, '#f0a83c', 16);
    this.burst(x, y, '#5d5342', 10);
    const R = 64;
    for (const e of this.enemies) {
      if (Math.hypot(e.x - x, e.y - y) < R + 14) this.bombDamageEnemy(e, x, y);
    }
    if (Math.hypot(this.p.x - x, this.p.y - y) < R) this.hurtPlayer(1, x, y);
    // cracked walls -> floor (sluice-gates included)
    let brokeGate = false;
    const tx0 = Math.floor((x - R) / TILE), tx1 = Math.floor((x + R) / TILE);
    const ty0 = Math.floor((y - R) / TILE), ty1 = Math.floor((y + R) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.tileAt(tx, ty) !== ',') continue;
        const cx = tx * TILE + 16, cy = ty * TILE + 16;
        if (Math.hypot(cx - x, cy - y) > R + 16) continue;
        this.tiles[ty][tx] = '.';
        this.setFlag(`wall:${this.roomId}:${tx},${ty}`);
        this.burst(cx, cy, '#4a4234', 6);
        if (this.roomId === 'cistern_boss') brokeGate = true;
      }
    }
    if (brokeGate) {
      const boss = this.enemies.find((e) => e.kind === 'boss' && e.hp > 0);
      if (boss && boss.staggered <= 0) {
        boss.staggered = 4;
        boss.state = 'staggered';
        sfx('splash');
        this.burst(boss.x, boss.y, '#3aa0c0', 20);
        this.showDialog([{ who: '', text: 'The gate bursts! Water drops on the Sluicekeeper — the core is EXPOSED. Cut it!' }]);
      }
    }
    this.buildStatic();
  }

  // ---------- actions ----------

  private doSword() {
    const p = this.p;
    if (p.swingCd > 0 || p.rollT > 0 || p.dead) return;
    p.swingT = 0.2;
    p.swingCd = 0.35;
    p.swingId++;
    const [dx, dy] = DIRS[p.dir];
    p.x += dx * 6; p.y += dy * 6;
    sfx('sword');
  }

  private doBomb() {
    const p = this.p;
    if (!p.hasBombs || p.bombs <= 0 || p.dead) {
      if (!p.hasBombs) this.setToast('No bombs yet');
      else if (p.bombs <= 0) this.setToast('Out of bombs — buy more in Gallow');
      return;
    }
    p.bombs--;
    this.bombs.push({ x: p.x, y: p.y, fuse: 2 });
    sfx('bomb_place');
    this.emit();
  }

  private doRoll() {
    const p = this.p;
    if (p.rollCd > 0 || p.dead) return;
    let dx = 0, dy = 0;
    if (this.input.held.has('up')) dy -= 1;
    if (this.input.held.has('down')) dy += 1;
    if (this.input.held.has('left')) dx -= 1;
    if (this.input.held.has('right')) dx += 1;
    if (dx === 0 && dy === 0) { const d = DIRS[p.dir]; dx = d[0]; dy = d[1]; }
    const m = Math.hypot(dx, dy);
    p.kx = (dx / m) * 300;
    p.ky = (dy / m) * 300;
    p.rollT = 0.25;
    p.rollCd = 0.55;
    sfx('roll');
    this.burst(p.x, p.y + 10, '#8a917c', 4);
  }

  private useDoor(tx: number, ty: number) {
    const t = this.tileAt(tx, ty);
    if (t === 'D') {
      if (this.p.keys > 0) {
        this.p.keys--;
        this.tiles[ty][tx] = '.';
        this.setFlag(`door:${this.roomId}:${tx},${ty}`);
        sfx('door');
        this.buildStatic();
        this.emit();
      } else {
        sfx('locked');
        this.setToast('Locked — needs a small key');
      }
    } else if (t === 'B') {
      if (this.p.bossKey) {
        this.tiles[ty][tx] = '.';
        this.setFlag(`door:${this.roomId}:${tx},${ty}`);
        sfx('door');
        this.buildStatic();
        this.emit();
      } else {
        sfx('locked');
        this.setToast('Sealed — the boss key would open this');
      }
    }
  }

  private nearestInteract(): { label: string; act: () => void } | null {
    const p = this.p;
    const [dx, dy] = DIRS[p.dir];
    const fx = Math.floor((p.x + dx * 24) / TILE);
    const fy = Math.floor((p.y + dy * 24) / TILE);
    const cx = Math.floor(p.x / TILE), cy = Math.floor(p.y / TILE);
    const tFront = this.tileAt(fx, fy);
    const tHere = this.tileAt(cx, cy);

    // tile props
    const prop = (t: string, tx: number, ty: number) => {
      if (t === 'N') return { label: 'Read the notice board', act: () => this.setOverlay('board') };
      if (t === 'W') return {
        label: 'Peer into the well',
        act: () => {
          const w = deriveTown(this.ledger).well;
          this.showDialog(w === 'dry' ? WELL_DRY : WELL_FLOWING, undefined, w === 'dry' ? 'THE WELL' : 'THE WELL');
        },
      };
      if (t === 'H') return { label: 'Enter the Hearth', act: () => this.setOverlay('hearth') };
      if (t === 'S') return { label: 'Enter the general store', act: () => this.setOverlay('shop') };
      if (t === '=') return { label: this.roomId === 'gallow' ? 'Descend the drop-chute' : 'Take the chute up', act: () => this.useChute() };
      if (t === 'G') return { label: 'Peer through the grate', act: () => this.showDialog(GRATE_TEXT) };
      if (t === 'D' || t === 'B') return { label: t === 'D' ? 'Unlock the door' : 'Open the boss door', act: () => this.useDoor(tx, ty) };
      return null;
    };
    const hit = prop(tFront, fx, fy) ?? prop(tHere, cx, cy);
    if (hit) return hit;

    // entities
    let best: REnt | null = null;
    let bestD = 44;
    for (const r of this.rents) {
      const k = r.def.kind;
      if (k !== 'npc' && k !== 'note' && k !== 'chest' && k !== 'lever' && k !== 'spike') continue;
      const d = Math.hypot(r.x - p.x, r.y - p.y);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best) return null;
    const b = best;
    if (b.def.kind === 'npc') {
      const choice = this.ledger.layers.cistern.choice;
      const cleared = this.ledger.layers.cistern.cleared;
      const useAlt = b.def.altCond === 'drained' ? choice === 'drained'
        : b.def.altCond === 'preserved' ? choice === 'preserved'
        : b.def.altCond === 'cleared' ? cleared : false;
      const lines = useAlt && b.def.altLines ? b.def.altLines : b.def.lines!;
      return { label: `Talk to ${b.def.name}`, act: () => this.showDialog(lines, undefined, b.def.name) };
    }
    if (b.def.kind === 'note') {
      return { label: 'Read the note', act: () => this.showDialog(b.def.text!, undefined, b.def.who ?? 'NOTE') };
    }
    if (b.def.kind === 'chest') {
      if (b.opened) return { label: 'Empty chest', act: () => this.setToast('Empty.') };
      return {
        label: 'Open the chest',
        act: () => {
          b.opened = true;
          this.setFlag(`chest:${b.def.id}`);
          sfx('chest');
          if (b.def.item === 'bombs') {
            this.p.hasBombs = true;
            this.p.bombs = Math.min(this.p.bombCap, this.p.bombs + 3);
            this.showDialog([
              { who: '', text: 'You found the BOMBS! Wellwright powder, still good after a century.' },
              { who: '', text: 'Press L or C to set a bomb. Bombs crack weak stone — and armor.' },
            ]);
          } else if (b.def.item === 'gold') {
            this.p.gold += b.def.amount ?? 20;
            this.showDialog([{ who: '', text: `Found ${b.def.amount ?? 20} gold!` }]);
          }
          this.emit();
        },
      };
    }
    if (b.def.kind === 'lever') {
      if (this.hasFlag('choice_made')) return { label: 'The sluice lever', act: () => this.setToast('Already decided.') };
      return { label: 'Pull the sluice lever (DRAIN)', act: () => { this.choiceKind = 'drain'; this.setOverlay('choice'); } };
    }
    if (b.def.kind === 'spike') {
      if (this.hasFlag('choice_made')) return { label: 'The spike', act: () => this.setToast('Already decided.') };
      return { label: 'Drive the spike (PRESERVE)', act: () => { this.choiceKind = 'preserve'; this.setOverlay('choice'); } };
    }
    return null;
  }

  private useChute() {
    const p = this.p;
    if (this.roomId === 'gallow') {
      if (!this.ledger.layers.cistern.cleared) {
        this.showDialog(
          [{ who: '', text: 'The drop-chute falls into dark water-smell and old stone. Bram\'s rope dangles below.' }],
          () => {
            sfx('sting');
            this.fadeTo(() => {
              p.lastChute = 'cistern_entry';
              this.loadRoom('cistern_entry', 3, 3);
              this.autosave();
            });
          },
        );
      } else {
        this.setOverlay('shaft');
      }
    } else {
      this.setOverlay('shaft');
    }
  }

  // ---------- tick ----------

  private tick(dt: number) {
    if (this.mode !== 'play') return;
    if (this.overlay) {
      // paused sim, but keep rendering + drip quiet
      return;
    }
    const p = this.p;
    if (p.dead) {
      this.deadT -= dt;
      if (this.deadT <= 0 && this.overlay !== 'dead') this.setOverlay('dead');
      this.updateParts(dt);
      return;
    }

    // timers
    if (p.swingT > 0) p.swingT -= dt;
    if (p.swingCd > 0) p.swingCd -= dt;
    if (p.rollT > 0) p.rollT -= dt;
    if (p.rollCd > 0) p.rollCd -= dt;
    if (p.iframes > 0) p.iframes -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.emit(); }
    if (this.roomCardT > 0) this.roomCardT -= dt;
    if (this.fadeDir !== 0) {
      this.fadeT += this.fadeDir * dt * 2.4;
      if (this.fadeDir === 1 && this.fadeT >= 1) {
        this.fadeDir = -1;
        const cb = this.fadeCb; this.fadeCb = null;
        if (cb) cb();
      } else if (this.fadeDir === -1 && this.fadeT <= 0) {
        this.fadeT = 0; this.fadeDir = 0;
      }
    }

    // input
    const inp = this.input;
    if (inp.pressed.has('pause')) { this.setOverlay('pause'); return; }
    if (inp.pressed.has('sword')) this.doSword();
    if (inp.pressed.has('bomb')) this.doBomb();
    if (inp.pressed.has('roll')) this.doRoll();
    if (inp.pressed.has('interact')) {
      const it = this.nearestInteract();
      if (it) it.act();
    }

    // movement
    let mx = 0, my = 0;
    if (inp.held.has('up')) my -= 1;
    if (inp.held.has('down')) my += 1;
    if (inp.held.has('left')) mx -= 1;
    if (inp.held.has('right')) mx += 1;
    if (mx !== 0 || my !== 0) {
      const m = Math.hypot(mx, my);
      mx /= m; my /= m;
      if (mx < -0.3) p.dir = 'left'; else if (mx > 0.3) p.dir = 'right';
      else if (my < -0.3) p.dir = 'up'; else if (my > 0.3) p.dir = 'down';
    }
    const rolling = p.rollT > 0;
    const swinging = p.swingT > 0.08;
    const speed = rolling ? 0 : swinging ? 40 : 128; // 4 tiles/sec
    let vx = mx * speed + p.kx;
    let vy = my * speed + p.ky;
    if (rolling) { vx = p.kx; vy = p.ky; }
    p.kx *= Math.pow(0.001, dt); p.ky *= Math.pow(0.001, dt);
    if (Math.abs(p.kx) < 5) p.kx = 0;
    if (Math.abs(p.ky) < 5) p.ky = 0;

    const nx = p.x + vx * dt;
    if (!this.solidAt(nx, p.y)) p.x = nx;
    const ny = p.y + vy * dt;
    if (!this.solidAt(p.x, ny)) p.y = ny;
    p.x = Math.max(16, Math.min(VIEW_W - 16, p.x));
    p.y = Math.max(16, Math.min(VIEW_H - 16, p.y));

    // sword hit
    if (p.swingT > 0) {
      const [dx, dy] = DIRS[p.dir];
      const fx = Math.atan2(dy, dx);
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.hitBy === p.swingId) continue;
        const ddx = e.x - p.x, ddy = e.y - p.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist > 52) continue;
        let da = Math.atan2(ddy, ddx) - fx;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 1.1) {
          e.hitBy = p.swingId;
          this.damageEnemy(e, 1, p.x, p.y);
        }
      }
    }

    // exits
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    const ex = this.inExit(tx, ty);
    if (ex) {
      const guardian = this.enemies.some((e) => (e.kind === 'hound' || e.kind === 'boss') && e.hp > 0);
      if (guardian) {
        sfx('locked');
        this.setToast('The guardian bars the way!');
        // push back out of the exit
        p.x -= mx * 40 * dt * 60 * 0.016;
      } else {
        const fromChute = this.roomId === 'gallow';
        this.fadeTo(() => {
          this.loadRoom(ex.to, ex.tx, ex.ty);
          if (fromChute) sfx('sting');
          this.autosave();
        });
        return;
      }
    }

    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.t += dt;
      if (Math.hypot(k.x - p.x, k.y - p.y) < 20) {
        this.pickups.splice(i, 1);
        this.takePickup(k);
      }
    }

    // bombs
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.fuse -= dt;
      if (b.fuse <= 0) {
        this.bombs.splice(i, 1);
        this.explode(b.x, b.y);
      }
    }

    this.updateEnemies(dt);
    this.updateTraps(dt);
    this.updateParts(dt);

    // hint
    const it = this.nearestInteract();
    const h = it ? `E — ${it.label}` : '';
    if (h !== this.hint) { this.hint = h; this.emit(); }

    // well drip teaser
    if (this.roomId === 'gallow' && deriveTown(this.ledger).well === 'dry') {
      const wtx = 8, wty = 2;
      if (Math.hypot(p.x - (wtx * TILE + 16), p.y - (wty * TILE + 16)) < 96) {
        this.dripT -= dt;
        if (this.dripT <= 0) {
          sfx('drip');
          this.dripT = 2.5 + Math.random() * 2; // slowing drip
        }
      }
    }
    this.emit();
  }

  private takePickup(k: Pickup) {
    const p = this.p;
    switch (k.ptype) {
      case 'heart':
        p.hearts = Math.min(p.maxHearts, p.hearts + 2);
        sfx('pickup');
        break;
      case 'gold':
        p.gold += k.amount;
        sfx('coin');
        break;
      case 'bomb':
        if (p.hasBombs) { p.bombs = Math.min(p.bombCap, p.bombs + k.amount); sfx('pickup'); }
        else { this.setToast('You need the bomb tool first'); }
        break;
      case 'key':
        p.keys++;
        sfx('key');
        this.setToast('Small key!');
        break;
      case 'bosskey':
        p.bossKey = true;
        sfx('key');
        this.setToast('Boss key!');
        break;
      case 'heartpiece':
        p.heartPieces++;
        this.setFlag(`pickup:${k.id}`);
        sfx('chest');
        if (p.heartPieces >= 4) {
          p.heartPieces -= 4;
          p.maxHearts += 2;
          p.hearts = p.maxHearts;
          this.showDialog([{ who: '', text: 'Heart Container! Maximum health increased.' }]);
        } else {
          this.setToast(`Heart piece (${p.heartPieces}/4)`);
        }
        break;
      case 'container':
        p.maxHearts += 2;
        p.hearts = p.maxHearts;
        this.setFlag(`pickup:${k.id}`);
        sfx('chest');
        this.showDialog([{ who: '', text: 'Heart Container! Maximum health increased.' }]);
        break;
      case 'cache':
        p.gold += k.amount;
        sfx('coin');
        this.setToast(`Recovered ${k.amount}g`);
        break;
    }
    if (k.ptype !== 'heartpiece' && k.ptype !== 'container' && !k.id.startsWith('d_') && !k.id.startsWith('h_') && !k.id.startsWith('cache_')) {
      this.setFlag(`pickup:${k.id}`);
    }
    this.emit();
  }

  private updateEnemies(dt: number) {
    const p = this.p;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.flash > 0) e.flash -= dt;
      e.t += dt;
      if (e.staggered > 0) e.staggered -= dt;
      e.x += e.kx * dt; e.y += e.ky * dt;
      e.kx *= Math.pow(0.001, dt); e.ky *= Math.pow(0.001, dt);

      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;

      const moveToward = (sp: number) => {
        const ox = e.x, oy = e.y;
        e.x += nx * sp * dt;
        if (this.solidAt(e.x, e.y)) e.x = ox;
        e.y += ny * sp * dt;
        if (this.solidAt(e.x, e.y)) e.y = oy;
      };

      if (e.kind === 'boss') {
        this.updateBoss(e, dt, dist, moveToward);
      } else {
        const spd = e.kind === 'hound' ? 95 : 70;
        if (e.state === 'wander') {
          if (e.t > 1.5) { e.t = 0; e.ang = Math.random() * Math.PI * 2; }
          const ox = e.x, oy = e.y;
          e.x += Math.cos(e.ang) * 40 * dt;
          e.y += Math.sin(e.ang) * 40 * dt;
          if (this.solidAt(e.x, e.y)) { e.x = ox; e.y = oy; e.ang += Math.PI / 2; }
          if (dist < 170) { e.state = 'chase'; }
        } else if (e.state === 'chase') {
          moveToward(spd);
          if (dist > 220) e.state = 'wander';
          else if (dist < 52) { e.state = 'windup'; e.t = 0; sfx('warn'); }
        } else if (e.state === 'windup') {
          if (e.t > (e.kind === 'hound' ? 0.5 : 0.4)) {
            e.state = 'lunge'; e.t = 0;
            e.lx = nx; e.ly = ny;
          }
        } else if (e.state === 'lunge') {
          const ls = e.kind === 'hound' ? 260 : 210;
          const ox = e.x, oy = e.y;
          e.x += e.lx * ls * dt;
          e.y += e.ly * ls * dt;
          if (this.solidAt(e.x, e.y)) { e.x = ox; e.y = oy; }
          if (e.t > 0.35) { e.state = 'wander'; e.t = 0; }
        }
      }

      // contact damage
      const touchR = e.kind === 'boss' ? 30 : 20;
      if (dist < touchR) this.hurtPlayer(e.kind === 'boss' ? 2 : 1, e.x, e.y);
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  private updateBoss(e: Enemy, dt: number, dist: number, moveToward: (sp: number) => void) {
    const p = this.p;
    if (e.staggered > 0) {
      e.state = 'staggered';
      return;
    }
    if (!e.announced) {
      e.announced = true;
      this.showDialog(BOSS_INTRO);
    }
    e.slamCd -= dt;
    const phase2 = e.hp <= 3;
    if (e.state === 'chase') {
      moveToward(phase2 ? 60 : 45);
      if (e.slamCd <= 0) {
        e.state = 'windup';
        e.t = 0;
        sfx('warn');
      }
    } else if (e.state === 'windup') {
      if (e.t > 0.6) {
        e.state = 'slam';
        e.t = 0;
        sfx('slam');
        this.shakeT = 0.35;
        this.burst(e.x, e.y, '#5d5342', 14);
        if (dist < 95 && p.rollT <= 0) this.hurtPlayer(2, e.x, e.y);
        e.slamCd = phase2 ? 3.5 : 5;
      }
    } else if (e.state === 'slam') {
      if (e.t > 0.5) { e.state = 'chase'; e.t = 0; }
    }
    // phase 2 adds
    if (phase2) {
      e.spawnCd -= dt;
      const crabs = this.enemies.filter((c) => c.kind === 'crab' && c.hp > 0).length;
      if (e.spawnCd <= 0 && crabs < 2) {
        e.spawnCd = 8;
        const a = Math.random() * Math.PI * 2;
        this.enemies.push({
          id: `badd_${Date.now()}`, kind: 'crab',
          x: e.x + Math.cos(a) * 60, y: e.y + Math.sin(a) * 60,
          hp: 2, maxHp: 2, armored: false, ang: 0, state: 'chase', t: 0,
          flash: 0, kx: 0, ky: 0, lx: 0, ly: 0, staggered: 0, slamCd: 0, spawnCd: 0, hitBy: -1, announced: true,
        });
        this.setToast('The Sluicekeeper calls its brood!');
      }
    }
  }

  private updateTraps(dt: number) {
    for (const r of this.rents) {
      if (r.def.kind !== 'trap') continue;
      r.trapT += dt;
      const T = r.trapT % 2.4;
      const prev = r.trapState;
      r.trapState = T < 1.5 ? 0 : T < 1.9 ? 1 : T < 2.15 ? 2 : 0;
      if (r.trapState === 1 && prev === 0) sfx('warn');
      if (r.trapState === 2) {
        const p = this.p;
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        if (tx === r.def.x && ty === r.def.y && p.rollT <= 0) {
          this.hurtPlayer(2, r.x, r.y);
        }
      }
    }
  }

  private updateParts(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life -= dt;
      if (q.life <= 0) { this.parts.splice(i, 1); continue; }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.98; q.vy *= 0.98;
    }
  }

  // ---------- render ----------

  private render() {
    const g = this.ctx;
    g.save();
    if (this.shakeT > 0) {
      g.translate((Math.random() - 0.5) * 6 * this.shakeT * 4, (Math.random() - 0.5) * 6 * this.shakeT * 4);
    }
    if (this.staticLayer) g.drawImage(this.staticLayer, 0, 0);

    const town = deriveTown(this.ledger);

    // dynamic tiles: doors, fountain, sealed reservoir rubble
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const t = this.tiles[y][x];
        if (t === 'D') g.drawImage(getSprite('door_small'), x * TILE, y * TILE, TILE, TILE);
        else if (t === 'B') g.drawImage(getSprite('door_boss'), x * TILE, y * TILE, TILE, TILE);
        else if (t === 'F') g.drawImage(getSprite(town.well === 'dry' ? 'fountain_dry' : 'fountain_flowing'), x * TILE, y * TILE, TILE, TILE);
      }
    }
    if (this.roomId === 'cistern_d4' && this.ledger.layers.cistern.choice === 'drained') {
      g.drawImage(getSprite('rubble'), 4 * TILE, 9 * TILE, TILE, TILE);
    }

    // entities sorted by y
    interface D { y: number; draw: () => void }
    const draws: D[] = [];
    const p = this.p;

    for (const k of this.pickups) {
      draws.push({
        y: k.y,
        draw: () => {
          const bob = Math.sin(k.t * 4) * 3;
          const spr = k.ptype === 'heart' ? 'heart' : k.ptype === 'gold' ? 'gold' : k.ptype === 'bomb' ? 'bomb_item'
            : k.ptype === 'key' ? 'key' : k.ptype === 'bosskey' ? 'bosskey'
            : k.ptype === 'heartpiece' ? 'heart_piece' : k.ptype === 'container' ? 'container' : 'cache';
          g.drawImage(getSprite(spr), k.x - 16, k.y - 16 + bob, TILE, TILE);
        },
      });
    }

    for (const r of this.rents) {
      const d = r.def;
      draws.push({
        y: r.y,
        draw: () => {
          if (d.kind === 'npc') {
            const spr = d.id === 'tilda' ? 'npc_tilda' : d.id === 'fen' ? 'npc_fen' : 'npc_mara';
            g.drawImage(getSprite(spr), r.x - 16, r.y - 20, TILE, TILE);
          } else if (d.kind === 'note') {
            g.drawImage(getSprite('note'), r.x - 16, r.y - 16, TILE, TILE);
          } else if (d.kind === 'chest') {
            g.drawImage(getSprite(r.opened ? 'chest_open' : 'chest_closed'), r.x - 16, r.y - 16, TILE, TILE);
          } else if (d.kind === 'lever') {
            g.drawImage(getSprite(r.pulled ? 'lever_pulled' : 'lever'), r.x - 16, r.y - 16, TILE, TILE);
          } else if (d.kind === 'spike') {
            g.drawImage(getSprite('spike'), r.x - 16, r.y - 16, TILE, TILE);
            if (r.pulled) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(r.x - 16, r.y - 16, TILE, TILE); }
          } else if (d.kind === 'trap') {
            const spr = r.trapState === 2 ? 'trap_slam' : r.trapState === 1 ? 'trap_warn' : 'trap_idle';
            g.drawImage(getSprite(spr), r.x - 16, r.y - 16, TILE, TILE);
          }
        },
      });
    }

    for (const e of this.enemies) {
      draws.push({
        y: e.y,
        draw: () => {
          if (e.kind === 'boss') {
            g.drawImage(getSprite('boss'), e.x - 32, e.y - 44, 64, 64);
            if (e.staggered > 0) {
              const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 90);
              g.globalAlpha = pulse;
              g.drawImage(getSprite('boss_core'), e.x - 16, e.y - 28, TILE, TILE);
              g.globalAlpha = 1;
            }
            if (e.state === 'windup') {
              g.strokeStyle = '#e05a3c';
              g.lineWidth = 3;
              g.beginPath();
              g.arc(e.x, e.y, 95 * Math.min(1, e.t / 0.6), 0, Math.PI * 2);
              g.stroke();
            }
            // boss HP pips
            g.fillStyle = '#000';
            g.fillRect(e.x - 30, e.y - 56, 60, 6);
            g.fillStyle = '#a03c3c';
            g.fillRect(e.x - 29, e.y - 55, 58 * (e.hp / e.maxHp), 4);
          } else {
            const spr = e.kind === 'crab' ? 'crab' : 'hound';
            const flip = e.lx < 0 || (e.state === 'chase' && this.p.x < e.x);
            if (e.flash > 0) {
              g.save();
              g.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() / 20);
              g.drawImage(getSprite(spr), e.x - 16, e.y - 16, TILE, TILE);
              g.restore();
            } else if (flip) {
              g.save();
              g.translate(e.x, 0);
              g.scale(-1, 1);
              g.drawImage(getSprite(spr), -16, e.y - 16, TILE, TILE);
              g.restore();
            } else {
              g.drawImage(getSprite(spr), e.x - 16, e.y - 16, TILE, TILE);
            }
            if (e.state === 'windup') {
              g.fillStyle = '#e05a3c';
              g.font = 'bold 14px monospace';
              g.fillText('!', e.x - 4, e.y - 22);
            }
            if (e.armored) {
              g.strokeStyle = '#d8b25c';
              g.lineWidth = 2;
              g.strokeRect(e.x - 14, e.y - 14, 28, 28);
            }
          }
        },
      });
    }

    // bombs
    for (const b of this.bombs) {
      draws.push({
        y: b.y,
        draw: () => {
          const blink = b.fuse < 0.6 ? Math.sin(performance.now() / 40) > 0 : true;
          if (blink) g.drawImage(getSprite('bomb_item'), b.x - 16, b.y - 16, TILE, TILE);
        },
      });
    }

    // player
    if (!p.dead) {
      draws.push({
        y: p.y,
        draw: () => {
          const blink = p.iframes > 0 && Math.sin(performance.now() / 50) > 0;
          const spr = p.dir === 'up' ? 'joss_up' : p.dir === 'down' ? 'joss_down' : 'joss_side';
          const flip = p.dir === 'left';
          g.globalAlpha = blink ? 0.4 : 1;
          if (flip) {
            g.save();
            g.translate(p.x, 0);
            g.scale(-1, 1);
            g.drawImage(getSprite(spr), -16, p.y - 20, TILE, TILE);
            g.restore();
          } else {
            g.drawImage(getSprite(spr), p.x - 16, p.y - 20, TILE, TILE);
          }
          g.globalAlpha = 1;
          if (p.rollT > 0) {
            g.strokeStyle = '#e8e2d0';
            g.lineWidth = 2;
            g.beginPath();
            g.arc(p.x, p.y - 4, 14, 0, Math.PI * 2);
            g.stroke();
          }
          if (p.swingT > 0) {
            const [dx, dy] = DIRS[p.dir];
            const a = Math.atan2(dy, dx);
            g.strokeStyle = '#f7d47c';
            g.lineWidth = 5;
            g.beginPath();
            g.arc(p.x + dx * 20, p.y + dy * 20, 22, a - 1.0, a + 1.0);
            g.stroke();
          }
        },
      });
    }

    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) d.draw();

    // particles
    for (const q of this.parts) {
      g.globalAlpha = Math.max(0, q.life / q.max);
      g.fillStyle = q.col;
      g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    g.globalAlpha = 1;
    g.restore();

    // room card
    if (this.roomCardT > 0 && this.mode === 'play') {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      const a = Math.min(1, this.roomCardT);
      g.globalAlpha = Math.min(1, a * 2);
      g.font = 'bold 15px "Courier New", monospace';
      g.textAlign = 'center';
      const w = g.measureText(this.room.name).width + 36;
      g.fillRect(VIEW_W / 2 - w / 2, 34, w, 30);
      g.fillStyle = '#d8b25c';
      g.fillText(this.room.name, VIEW_W / 2, 55);
      g.globalAlpha = 1;
      g.textAlign = 'left';
    }

    // fade
    if (this.fadeT > 0) {
      g.fillStyle = `rgba(0,0,0,${Math.min(1, this.fadeT)})`;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
