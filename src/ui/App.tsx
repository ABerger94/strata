import React, { useEffect, useRef, useState } from 'react';
import { Game, type Snapshot } from '../engine/game';

function Hearts({ hearts, maxHearts }: { hearts: number; maxHearts: number }) {
  const out: string[] = [];
  for (let i = 0; i < maxHearts / 2; i++) {
    if (hearts >= (i + 1) * 2) out.push('♥');
    else if (hearts === i * 2 + 1) out.push('◐');
    else out.push('♡');
  }
  return <span className="hearts" style={{ color: '#d83c3c' }}>{out.join('')}</span>;
}

function Panel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="overlay" onClick={onClick}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.subscribe(setSnap);
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const g = () => gameRef.current;
  if (!snap) return <div className="stage"><canvas ref={canvasRef} className="game" /></div>;
  const h = snap.hud;
  const ov = snap.overlay;

  return (
    <div className="stage" onClick={() => g()?.uiUnlockAudio()}>
      <canvas ref={canvasRef} className="game" />

      {ov !== 'title' && ov !== 'slots' && (
        <div className="hud">
          <div>
            <Hearts hearts={h.hearts} maxHearts={h.maxHearts} />
            <div className="room">{h.roomName}</div>
          </div>
          <div className="stats">
            <div>◉ {h.gold}g &nbsp; ✸ {h.bombs}/{h.bombCap} &nbsp; ⚷ {h.keys}{h.bossKey ? ' 👑' : ''}</div>
            <div>🧪 {h.potions} &nbsp; inn: {h.innPrice === 0 ? 'FREE' : h.innPrice + 'g'}</div>
            {h.toast && <div style={{ color: '#d8b25c' }}>{h.toast}</div>}
          </div>
        </div>
      )}
      {h.hint && !ov && <div className="hint">{h.hint}</div>}

      {ov === 'title' && (
        <Panel>
          <h1>STRATA</h1>
          <div className="title-sub">a vertical slice — the town of Gallow &amp; the Cistern below</div>
          <p className="dim">Zelda's map is wide. STRATA's is deep.</p>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiPickSlot('new')}>New game</button>
            <button className="ui" onClick={() => g()?.uiPickSlot('continue')}>Continue</button>
          </div>
          <p className="dim" style={{ marginTop: 12 }}>
            WASD/arrows move · J/Z sword · L/C bomb · Space dodge-roll · E interact · Esc pause
          </p>
        </Panel>
      )}

      {ov === 'slots' && (
        <Panel>
          <h2>{snap.slotMode === 'new' ? 'NEW GAME — CHOOSE A SLOT' : 'CONTINUE — CHOOSE A SLOT'}</h2>
          <div className="slotrow">
            {[0, 1, 2].map((i) => {
              const label = snap.slots[i];
              const ok = snap.slotMode === 'new' ? true : !!label;
              return (
                <button
                  key={i}
                  className="ui"
                  disabled={!ok}
                  onClick={() => (snap.slotMode === 'new' ? g()?.uiNewGame(i + 1) : g()?.uiContinue(i + 1))}
                >
                  Slot {i + 1}{label ? ` — ${label}` : snap.slotMode === 'new' ? ' — empty' : ''}
                </button>
              );
            })}
          </div>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiBackToTitle()}>Back</button>
          </div>
        </Panel>
      )}

      {ov === 'dialog' && (
        <div className="overlay dialog" onClick={() => g()?.uiAdvanceDialog()}>
          <div className="panel">
            {snap.who && <div className="who">{snap.who}</div>}
            <p>{snap.text}</p>
            <p className="dim">E / click ▸</p>
          </div>
        </div>
      )}

      {ov === 'shop' && (
        <Panel>
          <h2>GALLOW GENERAL</h2>
          <p className="dim">Gold: {h.gold}g</p>
          <div className="shoprow">
            <span>Bomb — cracks weak stone &amp; armor ({h.bombs}/{h.bombCap})</span>
            <button className="ui" disabled={h.gold < 5 || h.bombs >= h.bombCap} onClick={() => g()?.uiBuyBomb()}>5g</button>
          </div>
          <div className="shoprow">
            <span>Red potion — heals 4 hearts ({h.potions}/2)</span>
            <button className="ui" disabled={h.gold < 30 || h.potions >= 2} onClick={() => g()?.uiBuyPotion()}>30g</button>
          </div>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiResume()}>Leave</button>
          </div>
        </Panel>
      )}

      {ov === 'hearth' && (
        <Panel>
          <h2>THE HEARTH</h2>
          <p>Warm fire, clean beds. Rest restores all hearts — and saves.</p>
          <div className="btnrow">
            <button className="ui" disabled={!snap.canRest} onClick={() => g()?.uiRest()}>
              Rest — {snap.innPrice === 0 ? 'FREE' : `${snap.innPrice}g`}
            </button>
            <button className="ui" onClick={() => g()?.uiResume()}>Leave</button>
          </div>
          {!snap.canRest && <p className="warn">Not enough gold.</p>}
        </Panel>
      )}

      {ov === 'board' && (
        <Panel>
          <h2>NOTICE BOARD</h2>
          {snap.boardLines.map((l, i) => (
            <div key={i} className={`boardline${i === snap.boardLines.length - 1 ? ' fresh' : ''}`}>{l}</div>
          ))}
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiResume()}>Step back</button>
          </div>
        </Panel>
      )}

      {ov === 'choice' && (
        <Panel>
          <h2>{snap.choiceKind === 'drain' ? 'THE SLUICE LEVER' : 'THE SPIKE'}</h2>
          <p>{snap.choiceLabel}</p>
          <p className="warn">This can't be undone. {snap.choiceKind === 'drain' ? 'Pull it?' : 'Drive it?'}</p>
          <div className="btnrow">
            <button className="ui danger" onClick={() => g()?.uiConfirmChoice()}>Do it</button>
            <button className="ui" onClick={() => g()?.uiCancelChoice()}>Step back</button>
          </div>
        </Panel>
      )}

      {ov === 'shaft' && (
        <Panel>
          <h2>SHAFT MAP</h2>
          <p className="dim">Cleared bedrock is fast travel. Pick a depth.</p>
          <div className="shaftmap">
            <div className="shaftnode">
              <p>GALLOW</p>
              <p className="dim">surface</p>
              <button className="ui" onClick={() => g()?.uiTravel('gallow')}>Ascend</button>
            </div>
            <div className="shaftnode">
              <p>THE CISTERN</p>
              <p className="dim">Wellwright era</p>
              <button className="ui" onClick={() => g()?.uiTravel('cistern_entry')}>Descend</button>
            </div>
          </div>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiResume()}>Stay</button>
          </div>
        </Panel>
      )}

      {ov === 'pause' && (
        <Panel>
          <h2>PAUSED</h2>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiDrinkPotion()} disabled={h.potions <= 0 || h.hearts >= h.maxHearts}>
              Drink red potion ({h.potions})
            </button>
          </div>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiResume()}>Resume</button>
            <button className="ui" onClick={() => g()?.uiSaveQuit()}>Save &amp; quit to title</button>
          </div>
          <p className="dim" style={{ marginTop: 10 }}>
            WASD/arrows move · J/Z sword · L/C bomb · Space dodge-roll · E interact · Esc pause
          </p>
        </Panel>
      )}

      {ov === 'dead' && (
        <Panel>
          <h1 style={{ color: '#a03c3c' }}>YOU DIED</h1>
          <p>The Pit keeps what it catches — half your gold lies where you fell.</p>
          <div className="btnrow">
            <button className="ui" onClick={() => g()?.uiRespawn()}>Wake at the last chute</button>
          </div>
        </Panel>
      )}
    </div>
  );
}
