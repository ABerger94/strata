// WebAudio synth — all procedural, zero assets. Signature sounds only.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.5, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.5, cutoff = 1200, delay = 0) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export type SfxName =
  | 'sword' | 'hit' | 'kill' | 'hurt' | 'roll' | 'bomb_place' | 'explode'
  | 'pickup' | 'coin' | 'door' | 'locked' | 'chest' | 'lever' | 'spike'
  | 'drip' | 'sting' | 'choice' | 'key' | 'splash' | 'slam' | 'warn'
  | 'heal' | 'step';

export function sfx(name: SfxName) {
  switch (name) {
    case 'sword': tone(660, 0.07, 'square', 0.25, 220); break;
    case 'hit': tone(180, 0.08, 'square', 0.4, 90); noise(0.06, 0.25, 2000); break;
    case 'kill': tone(220, 0.15, 'square', 0.4, 55); noise(0.12, 0.3, 900); break;
    case 'hurt': tone(140, 0.2, 'sawtooth', 0.5, 60); break;
    case 'roll': noise(0.12, 0.2, 800); break;
    case 'bomb_place': tone(330, 0.08, 'square', 0.3, 165); break;
    case 'explode': noise(0.5, 0.8, 500); tone(90, 0.4, 'sine', 0.7, 30); break;
    case 'pickup': tone(880, 0.09, 'square', 0.3, 1320); break;
    case 'coin': tone(990, 0.06, 'square', 0.25); tone(1320, 0.08, 'square', 0.25, undefined, 0.05); break;
    case 'door': tone(110, 0.25, 'sawtooth', 0.35, 220); noise(0.15, 0.2, 600); break;
    case 'locked': tone(140, 0.1, 'square', 0.35); tone(110, 0.12, 'square', 0.35, undefined, 0.09); break;
    case 'chest': tone(523, 0.1, 'square', 0.3); tone(659, 0.1, 'square', 0.3, undefined, 0.09); tone(784, 0.16, 'square', 0.3, undefined, 0.18); break;
    case 'lever': tone(196, 0.3, 'sawtooth', 0.4, 98); noise(0.2, 0.3, 700, 0.1); break;
    case 'spike': tone(440, 0.08, 'square', 0.4, 220); noise(0.15, 0.4, 1500); break;
    case 'drip': tone(1200, 0.05, 'sine', 0.2, 600); break;
    case 'heal': tone(523, 0.12, 'sine', 0.35); tone(784, 0.16, 'sine', 0.35, undefined, 0.1); break;
    case 'key': tone(784, 0.08, 'square', 0.3); tone(1046, 0.12, 'square', 0.3, undefined, 0.07); break;
    case 'splash': noise(0.3, 0.4, 2500); break;
    case 'slam': tone(70, 0.25, 'sine', 0.7, 35); noise(0.2, 0.4, 400); break;
    case 'warn': tone(440, 0.08, 'square', 0.3); tone(440, 0.08, 'square', 0.3, undefined, 0.12); break;
    case 'step': noise(0.03, 0.08, 500); break;
    case 'sting': {
      // descend motif — the same song, deeper (A minor descent)
      const seq = [220, 196, 164.8, 146.8, 110];
      seq.forEach((f, i) => tone(f, 0.35, 'triangle', 0.5, undefined, i * 0.16));
      tone(55, 1.2, 'sine', 0.4, undefined, 0.8);
      break;
    }
    case 'choice': {
      const seq = [261.6, 329.6, 392, 523.2];
      seq.forEach((f, i) => tone(f, 0.3, 'triangle', 0.45, undefined, i * 0.12));
      break;
    }
  }
}

/** Call from the first user gesture so AudioContext is allowed. */
export function unlockAudio() {
  ac();
}
