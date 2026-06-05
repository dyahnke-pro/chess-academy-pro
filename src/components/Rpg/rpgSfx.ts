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

/** A filtered noise burst with a frequency sweep — the building block for
 *  scrapes, rustles, footsteps and jingles. */
function noiseBurst(
  c: AudioContext,
  t: number,
  dur: number,
  gain: number,
  ftype: BiquadFilterType,
  f0: number,
  f1: number,
  q = 1,
): void {
  const n = c.createBufferSource();
  const buf = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  n.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = ftype;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(filt).connect(g).connect(c.destination);
  n.start(t);
  n.stop(t + dur + 0.01);
}

/** A single hoofbeat — low thud + a top click. */
function clop(c: AudioContext, t: number, gain = 0.16): void {
  noiseBurst(c, t, 0.06, gain, 'lowpass', 300, 110, 1);
  noiseBurst(c, t, 0.02, gain * 0.5, 'highpass', 2200, 2200, 1);
}

/** A metallic clank (armor plate). */
function clank(c: AudioContext, t: number, freq: number, gain: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.12);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.18);
}

const MOVE_SFX: Record<PieceType, (c: AudioContext, t: number) => void> = {
  // Rider — galloping hooves + a faint chainmail jingle.
  n: (c, t) => {
    [0, 0.1, 0.18, 0.3, 0.4, 0.5].forEach((b, i) => clop(c, t + b, i % 3 === 0 ? 0.18 : 0.13));
    noiseBurst(c, t, 0.52, 0.045, 'bandpass', 5200, 4200, 2);
  },
  // Guard — heavy plate armor scrape + clanks.
  r: (c, t) => {
    noiseBurst(c, t, 0.5, 0.08, 'bandpass', 3600, 2200, 1.6);
    clank(c, t + 0.04, 880, 0.1);
    clank(c, t + 0.34, 680, 0.08);
  },
  // King — same plated weight, a touch deeper.
  k: (c, t) => {
    noiseBurst(c, t, 0.52, 0.08, 'bandpass', 3000, 1900, 1.6);
    clank(c, t + 0.05, 720, 0.1);
    clank(c, t + 0.36, 560, 0.08);
  },
  // Queen — the soft rustle of a gown.
  q: (c, t) => {
    noiseBurst(c, t, 0.46, 0.06, 'lowpass', 1300, 480, 0.7);
    noiseBurst(c, t + 0.22, 0.24, 0.04, 'lowpass', 1100, 420, 0.7);
  },
  // Archer — light footsteps + a quiver rattle.
  b: (c, t) => {
    noiseBurst(c, t + 0.04, 0.05, 0.09, 'lowpass', 190, 120, 1);
    noiseBurst(c, t + 0.3, 0.05, 0.09, 'lowpass', 190, 120, 1);
    noiseBurst(c, t, 0.22, 0.04, 'bandpass', 4200, 3600, 3);
  },
  // Peasant — plain footfalls.
  p: (c, t) => {
    noiseBurst(c, t + 0.04, 0.05, 0.1, 'lowpass', 175, 110, 1);
    noiseBurst(c, t + 0.3, 0.05, 0.1, 'lowpass', 175, 110, 1);
  },
};

/** Play the movement sound for a moving piece (gallop / armor scrape / steps). */
export function playMoveSound(type: string): void {
  const t = (type as PieceType) in MOVE_SFX ? (type as PieceType) : 'p';
  const c = audio();
  if (!c) return;
  try {
    MOVE_SFX[t](c, c.currentTime);
  } catch {
    /* ignore */
  }
}

/** A bowstring release + arrow whoosh — played when the archer looses. */
export function playArrowSound(): void {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    // Thwip: a short noise burst through a band-pass that sweeps downward.
    const n = c.createBufferSource();
    const dur = 0.22;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    n.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp).connect(g).connect(c.destination);
    n.start(t);
    n.stop(t + dur);
    // A faint descending whoosh under it.
    tone(c, t, 'sine', 820, 260, 0.18, 0.07);
  } catch {
    /* ignore */
  }
}

/** A peasant war cry — a short two-formant "raaah" shout, pitch rising then
 *  falling. Played when a pawn charges in to capture. */
export function playWarCry(): void {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    const dur = 0.46;
    // Two slightly detuned saw "voices" through vowel formants → a shout.
    for (const detune of [0, 6]) {
      const formantGain = c.createGain();
      formantGain.gain.setValueAtTime(0.0001, t);
      formantGain.gain.exponentialRampToValueAtTime(0.13, t + 0.05);
      formantGain.gain.setValueAtTime(0.13, t + 0.26);
      formantGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      formantGain.connect(c.destination);

      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180 + detune, t);
      osc.frequency.exponentialRampToValueAtTime(300 + detune, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(150 + detune, t + dur);

      // "Ah" vowel: two formant band-passes in parallel.
      for (const fHz of [820, 1150]) {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 7;
        bp.frequency.value = fHz;
        osc.connect(bp).connect(formantGain);
      }
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  } catch {
    /* ignore */
  }
}

/** A regal four-syllable "ha ha ha ha" laugh — played when the queen captures. */
export function playQueenLaugh(): void {
  const c = audio();
  if (!c) return;
  try {
    const t = c.currentTime;
    [380, 350, 320, 290].forEach((p, i) => {
      const t0 = t + i * 0.13;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      g.connect(c.destination);
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(p, t0);
      o.frequency.exponentialRampToValueAtTime(p * 0.9, t0 + 0.1);
      for (const fHz of [900, 1400]) {
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 8;
        bp.frequency.value = fHz;
        o.connect(bp).connect(g);
      }
      o.start(t0);
      o.stop(t0 + 0.12);
    });
  } catch {
    /* ignore */
  }
}

const PAWN_TAUNTS = ['Get outta here!', 'Get out of here!', 'Off with ya!', 'And stay out!'];

/** A pawn trash-talks the piece it just kicked off the board — real spoken
 *  words via the Web Speech API (gruff, low pitch). No-ops where unavailable. */
export function playPawnTaunt(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(PAWN_TAUNTS[Math.floor(Math.random() * PAWN_TAUNTS.length)]);
    u.pitch = 0.6;
    u.rate = 1.08;
    u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

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
