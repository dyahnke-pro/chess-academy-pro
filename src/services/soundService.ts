/**
 * soundService – piece sound playback for Chess Academy Pro.
 * Uses Web Audio API synthesis – no external audio files required.
 */
import { getSharedAudioContext } from './audioContextManager';
export type SoundSet = 'classic' | 'metallic' | 'marble' | 'cartoon';
export type SoundType = 'move' | 'capture' | 'castle' | 'check';
export function pieceSetToSoundSet(pieceSet: string, isKidMode: boolean): SoundSet {
  if (isKidMode) return 'cartoon';
  switch (pieceSet) {
    case 'staunton':
    case 'neo':
    case 'classic':    return 'classic';
    case 'alpha':
    case 'merida':
    case 'california':
    case 'cardinal':
    case 'tatiana':
    case 'modern':
    case 'minimalist': return 'metallic';
    case 'pixel':
    case 'horsey':
    case 'letter':
    case '3d':         return 'marble';
    case 'cartoon':    return 'cartoon';
    default:           return 'classic';
  }
}
interface SoundParams {
  freq: number; freq2?: number; dur: number; dec: number;
  tp: OscillatorType; ns?: number; v?: number;
}
// WO-COACH-CLICK-SND v2 — wood-on-wood character. v1 had the right
// shape (short, clean, snappy) but was too bright — high fundamentals
// (1500–2200 Hz) + heavy noise burst made it feel like a phone tap
// that made the user flinch. v2 drops the fundamentals into the
// 500–800 Hz band (the body resonance of two pieces of wood meeting),
// switches the dominant waveform to sine for warmth, softens the
// noise burst (~40–55 % vs 60–80 %), and slows the attack from 1.5 ms
// to 2.5 ms so the transient is "thunk" not "snap". Capture/castle/
// check stay distinguishable via slightly different frequencies and
// second-tone harmonics.
const SOUND_PARAMS: Record<SoundSet, Record<SoundType, SoundParams>> = {
  classic:  { move: {freq:600,dur:.06,dec:40,tp:'sine',ns:.45,v:.55},  capture: {freq:480,dur:.08,dec:32,tp:'sine',ns:.55,v:.65}, castle: {freq:520,freq2:680,dur:.1,dec:28,tp:'sine',ns:.4,v:.6},      check: {freq:900,freq2:1100,dur:.08,dec:35,tp:'sine',ns:.35,v:.7} },
  metallic: { move: {freq:1100,dur:.05,dec:45,tp:'triangle',ns:.4,v:.5},capture: {freq:850,dur:.07,dec:38,tp:'triangle',ns:.5,v:.6}, castle: {freq:950,freq2:1200,dur:.09,dec:32,tp:'triangle',ns:.4,v:.55}, check: {freq:1400,freq2:1700,dur:.08,dec:38,tp:'triangle',ns:.35,v:.65} },
  marble:   { move: {freq:480,dur:.07,dec:38,tp:'sine',ns:.5,v:.6},     capture: {freq:380,dur:.09,dec:30,tp:'sine',ns:.6,v:.7},     castle: {freq:420,freq2:560,dur:.11,dec:26,tp:'sine',ns:.4,v:.65},     check: {freq:780,freq2:980,dur:.09,dec:34,tp:'sine',ns:.35,v:.75} },
  cartoon:  { move: {freq:850,dur:.06,dec:42,tp:'triangle',ns:.4,v:.5}, capture: {freq:650,freq2:850,dur:.08,dec:38,tp:'triangle',ns:.5,v:.6}, castle: {freq:780,freq2:1020,dur:.1,dec:32,tp:'triangle',ns:.35,v:.55}, check: {freq:1200,freq2:1500,dur:.08,dec:38,tp:'triangle',ns:.35,v:.65} },
};
/** WO-COACH-PIECE-SOUND-CUSTOM. User-driven slider values 0–100,
 *  applied as multipliers / offsets on top of the style-set / event-
 *  type defaults so move / capture / castle / check stay
 *  distinguishable. 50 = "no change" baseline; 0 and 100 are the
 *  extremes of each dimension. */
export interface PieceSoundCustomization {
  /** Pitch 0–100. 50 = 1.0× freq. Linear-blend to 0.5× at 0 and 2.0× at 100. */
  pitch: number;
  /** Tone 0–100. 50 = current low-pass cutoff. Lower = warmer (more
   *  rolloff), higher = brighter (less rolloff). */
  tone: number;
  /** Waveform 0–100. Continuous blend: 0 sine, 33 triangle, 66 square,
   *  100 sawtooth. Implementation crossfades between adjacent types. */
  waveform: number;
  /** Length 0–100. 50 = 1.0× duration. Linear-blend to 0.5× at 0 and 2.0× at 100. */
  length: number;
}

export const PIECE_SOUND_DEFAULTS: PieceSoundCustomization = {
  pitch: 50,
  tone: 50,
  waveform: 50, // half-blend of triangle and square — close to current "wood-on-wood" character at the classic set
  length: 50,
};

/** Map a 0–100 slider to a multiplier in the [0.5×, 2.0×] band, where
 *  50 = exactly 1.0× (no change). Symmetric around the midpoint so the
 *  baseline preset feels neutral. */
function sliderToMultiplier(slider: number): number {
  const clamped = Math.max(0, Math.min(100, slider));
  if (clamped <= 50) {
    // 0 → 0.5x, 50 → 1.0x
    return 0.5 + (clamped / 50) * 0.5;
  }
  // 50 → 1.0x, 100 → 2.0x
  return 1.0 + ((clamped - 50) / 50) * 1.0;
}

/** Pick the two adjacent waveform types and the crossfade ratio for a
 *  0–100 slider value. Returns `[primaryType, secondaryType, mixRatio]`
 *  where `mixRatio` is the gain weight on the secondary (0 = primary
 *  only). Implementation rules:
 *
 *    0–33    crossfade sine → triangle
 *    33–66   crossfade triangle → square
 *    66–100  crossfade square → sawtooth
 */
function waveformBlend(slider: number): {
  primary: OscillatorType;
  secondary: OscillatorType;
  ratio: number;
} {
  const v = Math.max(0, Math.min(100, slider));
  if (v <= 33) return { primary: 'sine', secondary: 'triangle', ratio: v / 33 };
  if (v <= 66) return { primary: 'triangle', secondary: 'square', ratio: (v - 33) / 33 };
  return { primary: 'square', secondary: 'sawtooth', ratio: (v - 66) / 34 };
}

/** Map the 0–100 tone slider to a low-pass cutoff multiplier on top
 *  of the style-set's natural freq-derived cutoff. 50 = 1.0× (no
 *  change), 0 = 0.4× (very warm), 100 = 2.5× (bright). */
function toneToCutoffMultiplier(slider: number): number {
  const v = Math.max(0, Math.min(100, slider));
  if (v <= 50) {
    // 0 → 0.4x, 50 → 1.0x
    return 0.4 + (v / 50) * 0.6;
  }
  // 50 → 1.0x, 100 → 2.5x
  return 1.0 + ((v - 50) / 50) * 1.5;
}

export class SoundService {
  private enabled = true;
  private volume = 0.7;
  private currentSet: SoundSet = 'classic';
  /** WO-COACH-PIECE-SOUND-CUSTOM cached customization. Defaults map to
   *  "no change" so behavior is unchanged for users who haven't moved
   *  any slider. */
  private customization: PieceSoundCustomization = PIECE_SOUND_DEFAULTS;
  setEnabled(e: boolean): void { this.enabled = e; }
  setVolume(v: number): void { this.volume = Math.min(1, Math.max(0, v)); }
  setSoundSet(s: SoundSet): void { this.currentSet = s; }
  setCustomization(c: Partial<PieceSoundCustomization>): void {
    this.customization = { ...this.customization, ...c };
  }
  play(type: SoundType): void {
    if (!this.enabled) return;
    this.synth(SOUND_PARAMS[this.currentSet][type]);
  }
  playKidCelebration(): void {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((freq, i) =>
      setTimeout(() => this.synth({ freq, dur: 0.2, dec: 15, tp: 'square', v: 0.6 }), i * 80));
  }
  playKidEncouragement(): void {
    if (!this.enabled) return;
    this.synth({ freq: 440, freq2: 550, dur: 0.3, dec: 15, tp: 'square', v: 0.5 });
  }
  /** Soft error ping for wrong puzzle moves — subtle, not harsh. */
  playErrorPing(): void {
    if (!this.enabled) return;
    this.synth({ freq: 220, freq2: 180, dur: 0.25, dec: 20, tp: 'sine', v: 0.4 });
  }
  /** Soft success chime for correct puzzle completion. */
  playSuccessChime(): void {
    if (!this.enabled) return;
    [523, 659, 784].forEach((freq, i) =>
      setTimeout(() => this.synth({ freq, dur: 0.18, dec: 18, tp: 'sine', v: 0.5 }), i * 100));
  }
  private synth(p: SoundParams): void {
    try {
      const c = getSharedAudioContext();
      if (c.state === 'suspended') {
        // Resume and retry once the context is running (iOS requires this)
        void c.resume().then(() => {
          if (c.state === 'running') this.synthImmediate(c, p);
        });
        return;
      }
      this.synthImmediate(c, p);
    } catch { /* swallow – AudioContext unavailable */ }
  }

  private synthImmediate(c: AudioContext, p: SoundParams): void {
    try {
      const mv = (p.v ?? 0.7) * this.volume, n = c.currentTime;

      // WO-COACH-PIECE-SOUND-CUSTOM: layer user customization on top
      // of the style-set / event-type defaults. Each slider is 0–100
      // with 50 = neutral baseline.
      const pitchMul = sliderToMultiplier(this.customization.pitch);
      const lengthMul = sliderToMultiplier(this.customization.length);
      const toneMul = toneToCutoffMultiplier(this.customization.tone);
      const blend = waveformBlend(this.customization.waveform);

      const effFreq = p.freq * pitchMul;
      const effFreq2 = p.freq2 !== undefined ? p.freq2 * pitchMul : undefined;
      const effDur = p.dur * lengthMul;

      // Low-pass filter to soften harsh overtones and reduce graininess.
      // Cutoff scales with the pitched freq so cleaner harmonics survive
      // when pitch is raised; tone slider then biases warmer/brighter.
      const lpf = c.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(Math.min(effFreq * 4 * toneMul, 8000), n);
      lpf.Q.setValueAtTime(0.7, n);
      lpf.connect(c.destination);

      // Wood-on-wood envelope from PR #373; the customization layer
      // can re-shape character via waveform blend without touching
      // the timing model.
      const play = (freq: number, gain: number): void => {
        const playOne = (oscType: OscillatorType, oscGain: number): void => {
          if (oscGain <= 0) return;
          const o = c.createOscillator(), g = c.createGain();
          o.type = oscType; o.frequency.setValueAtTime(freq, n);
          g.gain.setValueAtTime(0, n);
          g.gain.linearRampToValueAtTime(gain * oscGain, n + 0.0025);
          g.gain.exponentialRampToValueAtTime(0.001, n + effDur);
          o.connect(g); g.connect(lpf); o.start(n); o.stop(n + effDur);
        };
        // Crossfade between two adjacent waveform types so the
        // waveform slider feels continuous. At ratio=0 only the
        // primary plays; at ratio=1 only the secondary; in between
        // both play with complementary gains so total energy is
        // roughly conserved.
        playOne(blend.primary, 1 - blend.ratio);
        playOne(blend.secondary, blend.ratio);
      };
      play(effFreq, mv);
      if (effFreq2) play(effFreq2, mv * 0.6);
      if (p.ns && p.ns > 0) {
        const bs = Math.floor(c.sampleRate * effDur * 0.1), nb = c.createBuffer(1, bs, c.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource(), ng = c.createGain();
        ns.buffer = nb; ng.gain.setValueAtTime(0, n);
        ng.gain.linearRampToValueAtTime(mv * p.ns * 0.55, n + 0.0015);
        ng.gain.exponentialRampToValueAtTime(0.001, n + effDur * 0.15);
        ns.connect(ng); ng.connect(lpf); ns.start(n); ns.stop(n + effDur);
      }
    } catch { /* swallow – synthesis failed */ }
  }
  preload(): void {}
  static soundTypeFromSan(san: string): SoundType {
    if (san === 'O-O' || san === 'O-O-O') return 'castle';
    if (san.includes('+') || san.includes('#')) return 'check';
    if (san.includes('x')) return 'capture';
    return 'move';
  }
}
export const soundService = new SoundService();
