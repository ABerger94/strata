// Programmatic 16x16 sprite atlas — Wellwright palette (teal/ochre/brass).
// Everything original; readability over beauty.

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

type Painter = (g: CanvasRenderingContext2D) => void;

function spr(p: Painter): HTMLCanvasElement {
  const [c, g] = cv(16, 16);
  p(g);
  return c;
}

function spr32(p: Painter): HTMLCanvasElement {
  const [c, g] = cv(32, 32);
  p(g);
  return c;
}

function r(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  g.fillStyle = col;
  g.fillRect(x, y, w, h);
}

// ---- tiles ----
const floor = spr((g) => {
  r(g, 0, 0, 16, 16, '#233038');
  r(g, 0, 0, 16, 1, '#2b3a44');
  r(g, 2, 5, 2, 2, '#1d262c');
  r(g, 10, 11, 2, 2, '#1d262c');
  r(g, 7, 2, 1, 1, '#8a6f3c');
  r(g, 14, 7, 1, 1, '#31424c');
});

const wall = spr((g) => {
  r(g, 0, 0, 16, 16, '#4a4234');
  r(g, 0, 0, 16, 3, '#8a6f3c');
  r(g, 0, 13, 16, 3, '#2e2820');
  r(g, 0, 3, 16, 1, '#2e2820');
  r(g, 7, 3, 1, 10, '#2e2820');
  r(g, 2, 8, 5, 1, '#5d5342');
  r(g, 10, 6, 4, 1, '#5d5342');
  r(g, 12, 11, 2, 1, '#8a6f3c');
});

const crackedWall = spr((g) => {
  g.drawImage(wall, 0, 0);
  g.strokeStyle = '#14100b';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(3, 1); g.lineTo(7, 7); g.lineTo(5, 12); g.lineTo(9, 15);
  g.moveTo(11, 2); g.lineTo(9, 9); g.lineTo(13, 14);
  g.stroke();
  r(g, 6, 6, 2, 2, '#14100b');
});

const water = spr((g) => {
  r(g, 0, 0, 16, 16, '#123a4a');
  r(g, 0, 3, 16, 1, '#1e5a70');
  r(g, 0, 9, 16, 1, '#1e5a70');
  r(g, 3, 6, 4, 1, '#2a7a95');
  r(g, 9, 12, 4, 1, '#2a7a95');
});

const doorSmall = spr((g) => {
  r(g, 0, 0, 16, 16, '#2e2820');
  r(g, 2, 0, 12, 16, '#8a6f3c');
  r(g, 4, 0, 8, 16, '#6e562e');
  r(g, 7, 7, 2, 3, '#14100b');
  r(g, 2, 0, 12, 1, '#d8b25c');
});

const doorBoss = spr((g) => {
  r(g, 0, 0, 16, 16, '#241f18');
  r(g, 1, 0, 14, 16, '#5d4a26');
  r(g, 3, 0, 10, 16, '#46391d');
  r(g, 0, 0, 16, 2, '#d8b25c');
  r(g, 7, 6, 2, 4, '#d8b25c');
  r(g, 2, 2, 2, 2, '#8a6f3c');
  r(g, 12, 2, 2, 2, '#8a6f3c');
  r(g, 2, 12, 2, 2, '#8a6f3c');
  r(g, 12, 12, 2, 2, '#8a6f3c');
});

const gate = spr((g) => {
  r(g, 0, 0, 16, 16, '#1a1a20');
  for (let x = 1; x < 16; x += 3) r(g, x, 0, 1, 16, '#8a8f9a');
  r(g, 0, 7, 16, 2, '#5d616b');
});

const rubble = spr((g) => {
  r(g, 0, 0, 16, 16, '#233038');
  r(g, 2, 10, 5, 4, '#4a4234');
  r(g, 8, 8, 6, 5, '#3a342a');
  r(g, 4, 6, 4, 4, '#5d5342');
  r(g, 11, 11, 3, 3, '#2e2820');
});

const exitDoor = spr((g) => {
  r(g, 0, 0, 16, 16, '#233038');
  r(g, 0, 0, 2, 16, '#8a6f3c');
  r(g, 14, 0, 2, 16, '#8a6f3c');
  r(g, 0, 0, 16, 2, '#8a6f3c');
});

// ---- town props ----
const board = spr((g) => {
  r(g, 1, 1, 14, 12, '#5d4a2e');
  r(g, 0, 0, 16, 2, '#3a2f1d');
  r(g, 3, 4, 4, 5, '#d8cfb8');
  r(g, 9, 3, 4, 4, '#c8bfa8');
  r(g, 4, 5, 2, 1, '#3a2f1d');
  r(g, 10, 4, 2, 1, '#3a2f1d');
  r(g, 3, 13, 2, 3, '#3a2f1d');
  r(g, 11, 13, 2, 3, '#3a2f1d');
});

const well = spr((g) => {
  r(g, 2, 8, 12, 6, '#4a4234');
  r(g, 2, 8, 12, 2, '#5d5342');
  r(g, 4, 10, 8, 2, '#14100b');
  r(g, 3, 2, 2, 8, '#5d4a2e');
  r(g, 11, 2, 2, 8, '#5d4a2e');
  r(g, 2, 1, 12, 2, '#5d4a2e');
  r(g, 7, 3, 2, 5, '#8a7a5c');
});

const hearth = spr((g) => {
  r(g, 0, 4, 16, 12, '#4a3a2c');
  r(g, 0, 4, 16, 3, '#6e4f36');
  r(g, 5, 8, 6, 6, '#f0a83c');
  r(g, 6, 9, 4, 4, '#f7d47c');
  r(g, 2, 0, 12, 4, '#2e2820');
});

const shop = spr((g) => {
  r(g, 0, 4, 16, 12, '#3d4a52');
  r(g, 0, 4, 16, 4, '#a03c3c');
  r(g, 0, 4, 16, 1, '#d8b25c');
  r(g, 2, 3, 3, 2, '#f0e0b8');
  r(g, 7, 3, 3, 2, '#f0e0b8');
  r(g, 12, 3, 3, 2, '#f0e0b8');
  r(g, 6, 9, 4, 7, '#241f18');
});

const fountainDry = spr((g) => {
  r(g, 2, 9, 12, 5, '#4a5460');
  r(g, 3, 9, 10, 1, '#6a7684');
  r(g, 7, 3, 2, 7, '#4a5460');
  r(g, 5, 1, 6, 3, '#4a5460');
});

const fountainFlowing = spr((g) => {
  g.drawImage(fountainDry, 0, 0);
  r(g, 4, 10, 8, 2, '#2a7a95');
  r(g, 7, 4, 2, 6, '#3aa0c0');
  r(g, 6, 2, 4, 1, '#7ad0e8');
});

const chute = spr((g) => {
  r(g, 1, 1, 14, 14, '#8a6f3c');
  r(g, 3, 3, 10, 10, '#05060a');
  r(g, 7, 0, 2, 6, '#c8b98a');
  r(g, 7, 3, 2, 2, '#8a7a5c');
});

// ---- characters ----
function person(skin: string, top: string, accent: string): HTMLCanvasElement {
  return spr((g) => {
    r(g, 5, 1, 6, 3, '#2a2118'); // hair
    r(g, 5, 4, 6, 4, skin); // face
    r(g, 6, 5, 1, 1, '#14100b');
    r(g, 9, 5, 1, 1, '#14100b');
    r(g, 4, 8, 8, 2, accent); // scarf/collar
    r(g, 5, 10, 6, 4, top); // torso
    r(g, 5, 14, 2, 2, '#241f18');
    r(g, 9, 14, 2, 2, '#241f18');
  });
}

const jossDown = spr((g) => {
  g.drawImage(person('#e8b88a', '#3a5a8a', '#a03c3c'), 0, 0);
  r(g, 11, 9, 3, 4, '#6e562e'); // lamp-pack
  r(g, 12, 10, 1, 1, '#f7d47c');
});
const jossUp = spr((g) => {
  r(g, 5, 1, 6, 3, '#2a2118');
  r(g, 5, 4, 6, 4, '#2a2118');
  r(g, 4, 8, 8, 2, '#a03c3c');
  r(g, 5, 10, 6, 4, '#3a5a8a');
  r(g, 11, 9, 3, 4, '#6e562e');
  r(g, 5, 14, 2, 2, '#241f18');
  r(g, 9, 14, 2, 2, '#241f18');
});
const jossSide = spr((g) => {
  r(g, 5, 1, 6, 3, '#2a2118');
  r(g, 5, 4, 6, 4, '#e8b88a');
  r(g, 9, 5, 1, 1, '#14100b');
  r(g, 4, 8, 8, 2, '#a03c3c');
  r(g, 5, 10, 6, 4, '#3a5a8a');
  r(g, 3, 9, 3, 4, '#6e562e');
  r(g, 5, 14, 2, 2, '#241f18');
  r(g, 9, 14, 2, 2, '#241f18');
});

const npcTilda = person('#e8b88a', '#4a7a4a', '#d8b25c');
const npcFen = person('#c89878', '#6e5a3a', '#8a6f3c');
const npcMara = person('#d8a878', '#5a4a6a', '#3a3f4a');

const crab = spr((g) => {
  r(g, 3, 5, 10, 6, '#2a7a6a');
  r(g, 5, 3, 6, 3, '#3aa084');
  r(g, 6, 4, 2, 2, '#f0e0b8');
  r(g, 8, 4, 2, 2, '#f0e0b8');
  r(g, 6, 4, 1, 1, '#14100b');
  r(g, 8, 4, 1, 1, '#14100b');
  r(g, 0, 7, 3, 2, '#2a7a6a');
  r(g, 13, 7, 3, 2, '#2a7a6a');
  r(g, 2, 11, 3, 2, '#1e5a4e');
  r(g, 11, 11, 3, 2, '#1e5a4e');
});

const hound = spr((g) => {
  r(g, 2, 6, 12, 6, '#8a6f3c'); // brass armor body
  r(g, 4, 4, 8, 3, '#a8894a');
  r(g, 11, 5, 4, 4, '#6e562e'); // head
  r(g, 12, 6, 2, 2, '#e05a3c'); // eye
  r(g, 2, 12, 3, 2, '#5d5342');
  r(g, 11, 12, 3, 2, '#5d5342');
  r(g, 4, 7, 2, 4, '#d8b25c'); // armor bands
  r(g, 8, 7, 2, 4, '#d8b25c');
});

const bossGolem = spr32((g) => {
  r(g, 8, 2, 16, 10, '#4a5460'); // head
  r(g, 11, 5, 4, 3, '#7ad0e8'); // eyes
  r(g, 16, 5, 4, 3, '#7ad0e8');
  r(g, 4, 12, 24, 14, '#5d6a78'); // torso stone
  r(g, 0, 12, 6, 12, '#8a6f3c'); // sluice-gate shoulders
  r(g, 26, 12, 6, 12, '#8a6f3c');
  r(g, 2, 14, 2, 8, '#14100b');
  r(g, 28, 14, 2, 8, '#14100b');
  r(g, 12, 16, 8, 6, '#2a3138'); // core plate
  r(g, 6, 26, 8, 6, '#3a424c');
  r(g, 18, 26, 8, 6, '#3a424c');
});

const bossCore = spr((g) => {
  r(g, 4, 4, 8, 8, '#f0a83c');
  r(g, 6, 6, 4, 4, '#f7d47c');
});

// ---- items / interactables ----
const note = spr((g) => {
  r(g, 4, 2, 8, 12, '#d8cfb8');
  r(g, 5, 4, 6, 1, '#3a2f1d');
  r(g, 5, 6, 6, 1, '#3a2f1d');
  r(g, 5, 8, 4, 1, '#3a2f1d');
  r(g, 5, 11, 6, 1, '#8a6f3c');
});

const chestClosed = spr((g) => {
  r(g, 2, 6, 12, 8, '#6e4f36');
  r(g, 2, 6, 12, 3, '#8a6a48');
  r(g, 7, 6, 2, 8, '#d8b25c');
  r(g, 7, 9, 2, 2, '#3a2f1d');
});

const chestOpen = spr((g) => {
  r(g, 2, 9, 12, 5, '#6e4f36');
  r(g, 2, 3, 12, 3, '#8a6a48');
  r(g, 2, 3, 2, 6, '#8a6a48');
});

const lever = spr((g) => {
  r(g, 6, 10, 4, 6, '#4a4234');
  r(g, 7, 3, 2, 8, '#8a6f3c');
  r(g, 6, 1, 4, 3, '#a03c3c');
});

const leverPulled = spr((g) => {
  r(g, 6, 10, 4, 6, '#4a4234');
  r(g, 4, 8, 7, 2, '#8a6f3c');
  r(g, 2, 7, 4, 3, '#a03c3c');
});

const spike = spr((g) => {
  r(g, 5, 2, 6, 4, '#8a6f3c');
  r(g, 7, 6, 2, 8, '#d8b25c');
  r(g, 4, 12, 8, 2, '#4a4234');
});

const heart = spr((g) => {
  r(g, 4, 3, 3, 3, '#d83c3c');
  r(g, 9, 3, 3, 3, '#d83c3c');
  r(g, 3, 5, 10, 5, '#d83c3c');
  r(g, 5, 10, 6, 3, '#d83c3c');
  r(g, 7, 13, 2, 1, '#d83c3c');
  r(g, 5, 4, 2, 2, '#f08a8a');
});

const heartPiece = spr((g) => {
  g.drawImage(heart, 0, 0);
  r(g, 8, 0, 8, 16, '#00000000');
  g.clearRect(8, 0, 8, 16);
});

const gold = spr((g) => {
  r(g, 5, 4, 6, 8, '#d8b25c');
  r(g, 6, 5, 4, 6, '#f7d47c');
  r(g, 7, 2, 2, 2, '#d8b25c');
});

const cachePile = spr((g) => {
  r(g, 3, 9, 10, 5, '#d8b25c');
  r(g, 5, 6, 6, 4, '#f7d47c');
  r(g, 7, 3, 3, 4, '#d8b25c');
});

const bombItem = spr((g) => {
  r(g, 4, 6, 8, 8, '#1a1a20');
  r(g, 5, 7, 3, 3, '#3a3f4a');
  r(g, 8, 3, 4, 2, '#8a6f3c');
  r(g, 11, 1, 2, 2, '#f7d47c');
});

const smallKey = spr((g) => {
  r(g, 4, 4, 5, 5, '#d8b25c');
  r(g, 5, 5, 3, 3, '#233038');
  r(g, 8, 8, 2, 6, '#d8b25c');
  r(g, 8, 11, 4, 2, '#d8b25c');
});

const bossKey = spr((g) => {
  g.drawImage(smallKey, -2, -2);
  r(g, 10, 10, 5, 5, '#a03c3c');
  r(g, 11, 11, 3, 3, '#f7d47c');
});

const container = spr((g) => {
  g.drawImage(heart, 1, 1);
  r(g, 0, 0, 16, 1, '#d8b25c');
  r(g, 0, 15, 16, 1, '#d8b25c');
  r(g, 0, 0, 1, 16, '#d8b25c');
  r(g, 15, 0, 1, 16, '#d8b25c');
});

const trapIdle = spr((g) => {
  r(g, 2, 6, 12, 8, '#5d616b');
  r(g, 4, 8, 8, 4, '#3a3f4a');
  r(g, 6, 2, 4, 4, '#8a6f3c');
});

const trapWarn = spr((g) => {
  g.drawImage(trapIdle, 0, 0);
  r(g, 0, 0, 16, 2, '#e05a3c');
  r(g, 0, 14, 16, 2, '#e05a3c');
});

const trapSlam = spr((g) => {
  r(g, 0, 0, 16, 16, '#5d616b');
  r(g, 2, 2, 12, 12, '#3a3f4a');
  r(g, 6, 6, 4, 4, '#e05a3c');
});

const splash = spr((g) => {
  r(g, 3, 6, 10, 2, '#7ad0e8');
  r(g, 5, 3, 2, 4, '#7ad0e8');
  r(g, 9, 3, 2, 4, '#7ad0e8');
  r(g, 6, 9, 4, 2, '#3aa0c0');
});

export const SPRITES: Record<string, HTMLCanvasElement> = {
  floor, wall, cracked_wall: crackedWall, water, door_small: doorSmall,
  door_boss: doorBoss, gate, rubble, exit_door: exitDoor,
  board, well, hearth, shop, fountain_dry: fountainDry,
  fountain_flowing: fountainFlowing, chute,
  joss_down: jossDown, joss_up: jossUp, joss_side: jossSide,
  npc_tilda: npcTilda, npc_fen: npcFen, npc_mara: npcMara,
  crab, hound, boss: bossGolem, boss_core: bossCore,
  note, chest_closed: chestClosed, chest_open: chestOpen,
  lever, lever_pulled: leverPulled, spike,
  heart, heart_piece: heartPiece, gold, cache: cachePile,
  bomb_item: bombItem, key: smallKey, bosskey: bossKey,
  container, trap_idle: trapIdle, trap_warn: trapWarn,
  trap_slam: trapSlam, splash,
};

export function getSprite(name: string): HTMLCanvasElement {
  return SPRITES[name] ?? SPRITES.floor;
}
