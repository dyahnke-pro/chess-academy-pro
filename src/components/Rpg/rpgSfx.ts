// Per-piece capture sounds for the RPG demo. Each captured piece type gets its
// own voice — human groans for the royals/peasants, a horse whinny for the
// knight (rider). Synthesized with the Web Audio API so there are no binary
// assets to ship; if a real recorded sample is dropped in (see
// CAPTURE_SAMPLES + public/rpg/sfx/), it plays that instead.

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

/** Optional real samples — drop files in public/rpg/sfx/ and map them here to
 *  override the synth (e.g. { n: '/rpg/sfx/whinny.mp3' }). Empty = all synth. */
const CAPTURE_SAMPLES: Partial<Record<PieceType, string>> = {};

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A pitched tone that glides f0→f1 with an attack/decay envelope. */
function tone(
  c: AudioContext,
  t0: number,
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  gain: number,
  vibrato?: { rate: number; depth: number },
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  if (vibrato) {
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = vibrato.rate;
    lfoG.gain.value = vibrato.depth;
    lfo.connect(lfoG).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** A short filtered-noise burst — a thud / impact body for heavier pieces. */
function thud(c: AudioContext, t0: number, dur: number, gain: number): void {
  const n = c.createBufferSource();
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  n.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  n.connect(lp).connect(g).connect(c.destination);
  n.start(t0);
  n.stop(t0 + dur);
}

const SYNTH: Record<PieceType, (c: AudioContext, t: number) => void> = {
  // Peasant — short, higher "oof".
  p: (c, t) => tone(c, t, 'triangle', 200, 120, 0.18, 0.25),
  // Guard — heavy grunt + a thud body.
  r: (c, t) => { tone(c, t, 'sawtooth', 130, 70, 0.3, 0.22); thud(c, t, 0.18, 0.3); },
  // Archer — a sharper cry.
  b: (c, t) => tone(c, t, 'sawtooth', 330, 190, 0.26, 0.2, { rate: 18, depth: 30 }),
  // Queen — fuller groan.
  q: (c, t) => tone(c, t, 'sine', 280, 160, 0.36, 0.26),
  // King — deepest, longest groan.
  k: (c, t) => { tone(c, t, 'sine', 150, 80, 0.46, 0.28); tone(c, t, 'triangle', 160, 90, 0.4, 0.12); },
  // Rider's horse — a whinny: bright warbling descents.
  n: (c, t) => {
    tone(c, t, 'sawtooth', 760, 430, 0.16, 0.2, { rate: 34, depth: 70 });
    tone(c, t + 0.14, 'sawtooth', 560, 300, 0.34, 0.22, { rate: 26, depth: 90 });
  },
};

/** Play the capture sound for a captured piece of the given type. Safe to call
 *  anywhere — no-ops if audio is unavailable (e.g. headless / autoplay-blocked). */
export function playCaptureSound(type: string): void {
  const t = (type as PieceType) in SYNTH ? (type as PieceType) : 'p';
  const sample = CAPTURE_SAMPLES[t];
  if (sample) {
    try {
      const el = new Audio(sample);
      el.volume = 0.8;
      void el.play().catch(() => undefined);
      return;
    } catch {
      /* fall through to synth */
    }
  }
  const c = audio();
  if (!c) return;
  try {
    SYNTH[t](c, c.currentTime);
  } catch {
    /* ignore */
  }
}
