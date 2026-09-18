// Consequence ledger — Section 9 of the design spec, implemented verbatim.
// One object, localStorage, versioned. Town state is DERIVED — never stored.

export type LayerId = 'cistern' | 'gloaming' | 'tidevault' | 'brittle' | 'sunless';

export interface LayerRecord {
  cleared: boolean;
  choice: string | null;
  broke: string[];
  saved: string[];
  water: Record<string, 0 | 1 | 2>;
}

export interface Ledger {
  version: 1;
  layers: Record<LayerId, LayerRecord>;
}

export interface TownState {
  well: 'dry' | 'flowing' | 'strange';
  innPrice: number;
  oilPrice: number;
  shopTier: 1 | 2;
  forge: 'choked' | 'clean';
  temperedBlade: boolean;
  westShaftsOpen: boolean;
  sunkenStacksOpen: boolean;
  docksOpen: boolean;
  gardensOpen: boolean;
  glazierFlooded: boolean;
  ending: null | 'warden' | 'open';
}

const blankLayer = (): LayerRecord => ({
  cleared: false,
  choice: null,
  broke: [],
  saved: [],
  water: {},
});

export function newLedger(): Ledger {
  return {
    version: 1,
    layers: {
      cistern: blankLayer(),
      gloaming: blankLayer(),
      tidevault: blankLayer(),
      brittle: blankLayer(),
      sunless: blankLayer(),
    },
  };
}

/** PURE FUNCTION of the ledger. Never stored. */
export function deriveTown(l: Ledger): TownState {
  const c = (id: LayerId): string | null => l.layers[id].choice;
  const drained = c('cistern') === 'drained';
  return {
    // Slice note: the spec's well rule keys off the Tidevault; the slice's
    // Section-14 checklist says a drained Cistern makes the fountain flow,
    // so the well reads 'flowing' on drain too. Full game keeps both.
    well:
      c('sunless') === 'shattered'
        ? 'strange'
        : c('tidevault') === 'broken' || drained
          ? 'flowing'
          : 'dry',
    innPrice: drained ? 0 : 20,
    oilPrice: c('gloaming') === 'relit' ? 5 : 10,
    shopTier: c('tidevault') === 'broken' ? 2 : 1,
    forge: c('brittle') === 'collapsed' ? 'clean' : 'choked',
    temperedBlade: false, // forge clean AND 200g paid — checked at purchase in the full game
    westShaftsOpen: c('gloaming') === 'relit',
    sunkenStacksOpen: c('tidevault') === 'broken',
    docksOpen: c('brittle') === 'collapsed',
    gardensOpen: c('brittle') === 'standing',
    glazierFlooded: c('tidevault') === 'repaired',
    ending:
      c('sunless') === 'worn'
        ? 'warden'
        : c('sunless') === 'shattered'
          ? 'open'
          : null,
  };
}

export interface PlayerSave {
  hearts: number; // half-heart units
  maxHearts: number; // half-heart units
  gold: number;
  bombs: number;
  bombCap: number;
  potions: number;
  potionCap: number;
  keys: number;
  bossKey: boolean;
  heartPieces: number;
  room: string;
  x: number;
  y: number;
  flags: string[];
  hasBombs: boolean;
}

export interface SaveFile {
  ledger: Ledger;
  player: PlayerSave;
}

export function defaultPlayer(): PlayerSave {
  return {
    hearts: 6,
    maxHearts: 6,
    gold: 30,
    bombs: 0,
    bombCap: 10,
    potions: 0,
    potionCap: 2,
    keys: 0,
    bossKey: false,
    heartPieces: 0,
    room: 'gallow',
    x: 10 * 32,
    y: 8 * 32,
    flags: [],
    hasBombs: false,
  };
}

const key = (slot: number) => `strata_save_${slot}`;

export function saveGame(slot: number, data: SaveFile): void {
  try {
    localStorage.setItem(key(slot), JSON.stringify(data));
  } catch {
    /* storage full or unavailable — the game continues unsaved */
  }
}

export function loadGame(slot: number): SaveFile | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveFile;
    if (!data.ledger || data.ledger.version !== 1 || !data.player) return null;
    return data;
  } catch {
    return null;
  }
}

/** One-line summary for the slot picker, or null when empty. */
export function slotSummary(slot: number): string | null {
  const s = loadGame(slot);
  if (!s) return null;
  const town = deriveTown(s.ledger);
  const bits: string[] = [];
  if (s.ledger.layers.cistern.cleared) bits.push(s.ledger.layers.cistern.choice === 'drained' ? 'Cistern drained' : 'Cistern preserved');
  bits.push(`${s.player.gold}g`);
  bits.push(town.innPrice === 0 ? 'inn free' : 'inn 20g');
  return bits.join(' · ');
}
