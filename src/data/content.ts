// Slice content: Gallow (1 screen) + Layer 1 The Cistern. All names locked per spec.

export type EntKind =
  | 'npc' | 'note' | 'chest' | 'crab' | 'hound' | 'boss'
  | 'pickup' | 'trap' | 'lever' | 'spike';

export interface EntDef {
  kind: EntKind;
  id: string;
  x: number; // tile coords
  y: number;
  name?: string;
  lines?: string[];
  altLines?: string[];
  altCond?: 'drained' | 'preserved' | 'cleared';
  text?: string[];
  who?: string;
  item?: 'bombs' | 'gold';
  amount?: number;
  ptype?: 'heart' | 'gold' | 'bomb' | 'key' | 'bosskey' | 'heartpiece' | 'container';
}

export interface ExitDef {
  x: number; y: number; w: number; h: number;
  to: string; tx: number; ty: number; // target tile coords
  // 'res_open' | 'bossdead' | 'flag:<flagName>'
  cond?: string;
}

export interface RoomDef {
  id: string;
  name: string;
  tiles: string[];
  exits: ExitDef[];
  ents: EntDef[];
}

const W = '####################';

export const ROOMS: Record<string, RoomDef> = {
  gallow: {
    id: 'gallow',
    name: 'GALLOW',
    tiles: [
      W,
      '#..................#',
      '#..N.....W.....H...#',
      '#..................#',
      '#.......F..........#',
      '#..................#',
      '#..................#',
      '#..S..........=....#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [],
    ents: [
      {
        kind: 'npc', id: 'tilda', x: 5, y: 6, name: 'TILDA',
        lines: [
          "Mara says the well's got a month left. I say she's being generous.",
          'You going down the shaft, Joss? Bring back water, or don\'t come back. (Kidding. Mostly.)',
        ],
        altCond: 'drained',
        altLines: [
          "The fountain's FLOWING, Joss! First time in my life I've seen it run.",
          'Whatever you did down there — the town drinks tonight.',
        ],
      },
      {
        kind: 'npc', id: 'fen', x: 14, y: 5, name: 'FEN',
        lines: [
          'My granddad was a Wellwright. He said the Cistern below was built to outlive us all.',
          'He was right about that, at least.',
        ],
      },
      {
        kind: 'npc', id: 'mara', x: 10, y: 3, name: 'MARA',
        lines: [
          'The council rations water, child. It is not cruelty. It is arithmetic.',
          'If there is water below, the town drinks. Whatever it costs.',
        ],
        altCond: 'cleared',
        altLines: [
          'You went down and came back. Few do.',
          'The town drinks. Do not ask me what it cost — ask the Pit.',
        ],
      },
    ],
  },

  cistern_entry: {
    id: 'cistern_entry',
    name: 'THE CISTERN — SHAFT LANDING',
    tiles: [
      W,
      '#..................#',
      '#..=...............#',
      '#..............,,..#',
      '#..............,,..#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [{ x: 19, y: 5, w: 1, h: 2, to: 'cistern_cross', tx: 1, ty: 5 }],
    ents: [
      {
        kind: 'note', id: 'n1', x: 4, y: 4, who: "BRAM'S NOTE",
        text: [
          'Joss —',
          'The Wellwrights marked weak stone with crack-lines. Their bombs still work. Trust the cracks.',
          '— B.',
        ],
      },
      { kind: 'crab', id: 'c1', x: 9, y: 6 },
      { kind: 'crab', id: 'c2', x: 13, y: 7 },
      { kind: 'pickup', id: 'cache_bombs', x: 16, y: 3, ptype: 'bomb', amount: 3 },
    ],
  },

  cistern_cross: {
    id: 'cistern_cross',
    name: 'THE CISTERN — FLOODED HALLS',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#.....~~~..........#',
      '#.....~~~..........#',
      '#..................#',
      '#..................#',
      '#..........~~~.....#',
      '#..........~~~.....#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_entry', tx: 18, ty: 5 },
      { x: 19, y: 5, w: 1, h: 2, to: 'cistern_slam', tx: 1, ty: 5 },
    ],
    ents: [
      { kind: 'crab', id: 'c3', x: 5, y: 7 },
      { kind: 'crab', id: 'c4', x: 14, y: 3 },
      { kind: 'crab', id: 'c5', x: 10, y: 9 },
      { kind: 'pickup', id: 'gold1', x: 16, y: 2, ptype: 'gold', amount: 8 },
    ],
  },

  cistern_slam: {
    id: 'cistern_slam',
    name: 'THE CISTERN — SLUICE WORKS',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_cross', tx: 18, ty: 5 },
      { x: 8, y: 0, w: 2, h: 1, to: 'cistern_door', tx: 8, ty: 10 },
    ],
    ents: [
      { kind: 'trap', id: 't1', x: 9, y: 4 },
      { kind: 'trap', id: 't2', x: 10, y: 4 },
      { kind: 'trap', id: 't3', x: 9, y: 7 },
      { kind: 'trap', id: 't4', x: 10, y: 7 },
      { kind: 'pickup', id: 'smallkey1', x: 16, y: 5, ptype: 'key' },
      {
        kind: 'note', id: 'n0', x: 3, y: 9, who: "BRAM'S NOTE",
        text: [
          'The old sluice-hammers still fire. They telegraph — watch the flash, then MOVE.',
          'Your roll will carry you through. Trust your legs.',
          '— B.',
        ],
      },
    ],
  },

  cistern_door: {
    id: 'cistern_door',
    name: 'THE CISTERN — SEALED DOOR',
    tiles: [
      W,
      '#....,,,,..........#',
      '#....,,,,..........#',
      '#....,,,,..........#',
      '#....,,,,..........#',
      '#..................#',
      '#..................#',
      '#.........D........#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 8, y: 11, w: 2, h: 1, to: 'cistern_slam', tx: 8, ty: 1 },
      { x: 9, y: 6, w: 1, h: 1, to: 'cistern_d1', tx: 9, ty: 10, cond: 'flag:door:cistern_door:9,7' },
    ],
    ents: [
      { kind: 'crab', id: 'c6', x: 14, y: 3 },
      { kind: 'pickup', id: 'heart_cache', x: 5, y: 2, ptype: 'heart' },
    ],
  },

  cistern_d1: {
    id: 'cistern_d1',
    name: 'CISTERN DEPTHS — ENTRY',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........D........#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 9, y: 11, w: 1, h: 1, to: 'cistern_door', tx: 9, ty: 8 },
      { x: 19, y: 5, w: 1, h: 2, to: 'cistern_d2', tx: 1, ty: 5 },
      { x: 9, y: 6, w: 1, h: 1, to: 'cistern_d2', tx: 9, ty: 10, cond: 'flag:door:cistern_d1:9,7' },
    ],
    ents: [
      {
        kind: 'note', id: 'n2', x: 5, y: 4, who: "BRAM'S NOTE",
        text: [
          'The shaft crew left a tool cache ahead, past the small door. Take the bombs.',
          'The sluice-beast below wears old armor — crack it FIRST, then cut.',
          '— B.',
        ],
      },
      { kind: 'pickup', id: 'smallkey2', x: 14, y: 8, ptype: 'key' },
    ],
  },

  cistern_d2: {
    id: 'cistern_d2',
    name: 'CISTERN DEPTHS — TOOL CACHE',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_d1', tx: 18, ty: 5 },
      { x: 19, y: 5, w: 1, h: 2, to: 'cistern_d3', tx: 1, ty: 5 },
    ],
    ents: [
      { kind: 'chest', id: 'chest_bombs', x: 9, y: 2, item: 'bombs' },
      { kind: 'crab', id: 'c7', x: 3, y: 5 },
      { kind: 'crab', id: 'c8', x: 16, y: 5 },
    ],
  },

  cistern_d3: {
    id: 'cistern_d3',
    name: 'CISTERN DEPTHS — CRACKED VAULT',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#....,,,,,,,,......#',
      '#....,......,......#',
      '#....,......,......#',
      '#....,......,......#',
      '#....,,,,,,,,......#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_d2', tx: 18, ty: 5 },
      { x: 19, y: 5, w: 1, h: 2, to: 'cistern_d4', tx: 1, ty: 5 },
    ],
    ents: [
      { kind: 'pickup', id: 'vault_gold', x: 8, y: 5, ptype: 'gold', amount: 25 },
    ],
  },

  cistern_d4: {
    id: 'cistern_d4',
    name: 'CISTERN DEPTHS — LOW GALLERY',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#......,,,,........#',
      '#......,,,,........#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_d3', tx: 18, ty: 5 },
      { x: 19, y: 5, w: 1, h: 2, to: 'cistern_d5', tx: 1, ty: 5 },
      { x: 4, y: 9, w: 1, h: 1, to: 'cistern_res', tx: 10, ty: 10, cond: 'res_open' },
    ],
    ents: [
      { kind: 'pickup', id: 'floor_piece', x: 8, y: 3, ptype: 'heartpiece' },
    ],
  },

  cistern_d5: {
    id: 'cistern_d5',
    name: "CISTERN DEPTHS — HOUND'S DEN",
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 0, y: 5, w: 1, h: 2, to: 'cistern_d4', tx: 18, ty: 5 },
      { x: 9, y: 0, w: 2, h: 1, to: 'cistern_d6', tx: 9, ty: 10 },
    ],
    ents: [{ kind: 'hound', id: 'hound1', x: 10, y: 5 }],
  },

  cistern_d6: {
    id: 'cistern_d6',
    name: 'CISTERN DEPTHS — BOSS GATE',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........B........#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 9, y: 11, w: 1, h: 1, to: 'cistern_d5', tx: 9, ty: 1 },
      { x: 9, y: 3, w: 1, h: 1, to: 'cistern_boss', tx: 9, ty: 10, cond: 'flag:door:cistern_d6:9,4' },
    ],
    ents: [
      {
        kind: 'note', id: 'n3', x: 4, y: 8, who: "BRAM'S NOTE",
        text: [
          'It guards the deep door. It cannot be CUT until it is CRACKED.',
          'You know what to do.',
          '— B.',
        ],
      },
    ],
  },

  cistern_boss: {
    id: 'cistern_boss',
    name: "THE SLUICEKEEPER'S LAIR",
    tiles: [
      W,
      '#..................#',
      '#....,,......,,....#',
      '#....,,......,,....#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [
      { x: 9, y: 0, w: 2, h: 1, to: 'cistern_choice', tx: 9, ty: 10, cond: 'bossdead' },
      { x: 9, y: 11, w: 1, h: 1, to: 'cistern_d6', tx: 9, ty: 5 },
    ],
    ents: [{ kind: 'boss', id: 'sluicekeeper', x: 10, y: 6 }],
  },

  cistern_choice: {
    id: 'cistern_choice',
    name: 'THE OLD SLUICE',
    tiles: [
      W,
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#.........G........#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..............=...#',
      '#..................#',
      W,
    ],
    exits: [],
    ents: [
      { kind: 'lever', id: 'sluice_lever', x: 7, y: 2 },
      { kind: 'spike', id: 'sluice_spike', x: 12, y: 2 },
    ],
  },

  cistern_res: {
    id: 'cistern_res',
    name: 'LOWER RESERVOIR',
    tiles: [
      W,
      '#..................#',
      '#..~~~~~~..........#',
      '#..~~~~~~..........#',
      '#..~~~~~~..........#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      W,
    ],
    exits: [{ x: 10, y: 11, w: 1, h: 1, to: 'cistern_d4', tx: 4, ty: 8 }],
    ents: [
      { kind: 'pickup', id: 'res_piece1', x: 7, y: 6, ptype: 'heartpiece' },
      { kind: 'pickup', id: 'res_piece2', x: 9, y: 8, ptype: 'heartpiece' },
    ],
  },
};

export const INTRO_LINES: { who: string; text: string }[] = [
  { who: '', text: "Four generations ago, Gallow's founders walled over the Pit — and stopped talking about it." },
  { who: '', text: 'Now the well is failing. Mara rations the water. Old Bram took his rope down the maintenance shaft yesterday, and did not come back up.' },
  { who: 'JOSS MARLOWE', text: "Lamp-lighter's apprentice. She picks up his spare lantern. She doesn't get chosen. She descends." },
];

export const BOARD_BASE = 'THE CISTERN SEALED — the well is dry. Water ration: one bucket per household.';
export const BOARD_DRAINED = 'THE CISTERN WAS DRAINED — the fountain flows! The Hearth rests free tonight. — M.';
export const BOARD_PRESERVED = 'THE CISTERN WAS PRESERVED — the reservoir holds. The Hearth thanks you for your 20 gold.';

export const WELL_DRY = [
  'The bucket comes up dry.',
  'Somewhere far below, water is laughing at you.',
];
export const WELL_FLOWING = [
  'Cold water — more than Gallow has seen in years.',
  'It tastes faintly of brass.',
];

export const GRATE_TEXT = [
  "BRAM'S NOTE — wedged through the grate:",
  '"The shaft goes deeper than the Wellwrights ever dug. My rope ends here.',
  'Yours doesn\'t have to. — B."',
  '',
  '(The way down is sealed. The full game continues here.)',
];

export const BOSS_INTRO = [
  'THE SLUICEKEEPER',
  'The reservoir\'s old golem. Armor everywhere — but the cracked sluice-gates ring the arena.',
  'Bomb a gate. Drop the water. Then cut the core.',
];
