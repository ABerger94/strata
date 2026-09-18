# STRATA — vertical slice (playable)

Top-down action-adventure slice: the town of **Gallow** and the **Cistern** (Layer 1),
ending in a physical drain/preserve choice that permanently changes the town.

## Run it

```bash
cd ~/workspace/strata/game
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
npm run preview  # serve the production build
```

## Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| J or Z | Sword |
| L, C, X, or K | Place bomb (once found) |
| Space or Shift | Dodge roll (brief invulnerability) |
| E or Enter | Interact / advance dialogue |
| Esc | Pause |

## The critical path

1. **Gallow** — talk to Tilda, Fen, Mara; read the notice board; buy bombs/potions
   at the general store; rest at the Hearth (20g).
2. Down the well chute into the **Cistern**. Find the **small key** in the
   spike-trap hall; unlock the dungeon door; open the **bomb chest**.
3. Bomb cracked walls, dodge slam traps, beat the armored **Sluice Hound**
   (bomb first to crack its armor, then sword) for the **boss key**.
4. Bomb the cracked **sluice-gates** in the arena to expose the **Sluicekeeper's**
   core, then punish it with the sword.
5. Make **the choice**: pull the sluice lever (DRAIN) or drive the spike
   (PRESERVE) — confirmed in a modal, irreversible.
6. Check the **notice board** back in Gallow: draining makes the Hearth **free**
   and the fountain flow; preserving keeps the Hearth at 20g and opens the
   lower reservoir (two heart pieces).

## Systems in the slice

- Consequence ledger (`src/data/ledger.ts`): versioned, per-layer choice records;
  `deriveTown()` maps the Cistern choice to town state. Save slots in localStorage.
- Death drops 50% of gold into a recoverable cache where you died.
- Shaft-map fast travel between visited chutes.
- Procedural pixel sprites and WebAudio SFX — no external assets.
