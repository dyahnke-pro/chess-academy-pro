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
export class SoundService {
  private enabled = true;
  private volume = 0.7;
  private currentSet: SoundSet = 'classic';
  setEnabled(e: boolean): void { this.enabled = e; }
  setVolume(v: number): void { this.volume = Math.min(1, Math.max(0, v)); }
  setSoundSet(s: SoundSet): void { this.currentSet = s; }
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

      // Low-pass filter to soften harsh overtones and reduce graininess
      const lpf = c.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(Math.min(p.freq * 4, 6000), n);
      lpf.Q.setValueAtTime(0.7, n);
      lpf.connect(c.destination);

      // WO-COACH-CLICK-SND v2: wood-on-wood envelope. Attack 2.5 ms
      // (was 1.5 ms in v1) gives a "thunk" rather than a "snap" —
      // wood pieces meeting have a tiny but perceptible compression
      // before the resonance kicks in. Tone decays exponentially over
      // the full duration. Noise burst is shorter (10 % of duration)
      // and quieter (peak gain mv * ns * 0.55 vs v1's 0.9), modeling
      // the brief friction-attack of wood-on-wood instead of a hard
      // plastic click.
      const play = (freq: number, gain: number): void => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = p.tp; o.frequency.setValueAtTime(freq, n);
        g.gain.setValueAtTime(0, n);
        g.gain.linearRampToValueAtTime(gain, n + 0.0025);
        g.gain.exponentialRampToValueAtTime(0.001, n + p.dur);
        o.connect(g); g.connect(lpf); o.start(n); o.stop(n + p.dur);
      };
      play(p.freq, mv);
      if (p.freq2) play(p.freq2, mv * 0.6);
      if (p.ns && p.ns > 0) {
        // Wood-attack noise: first 10 % of duration, peak attack at
        // 1.5 ms (was 0.5 ms — gives the transient slightly more body
        // and less ice-pick edge), peak gain dialed back to 55 % of
        // ns × volume so the burst supports the resonant tone instead
        // of dominating it.
        const bs = Math.floor(c.sampleRate * p.dur * 0.1), nb = c.createBuffer(1, bs, c.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource(), ng = c.createGain();
        ns.buffer = nb; ng.gain.setValueAtTime(0, n);
        ng.gain.linearRampToValueAtTime(mv * p.ns * 0.55, n + 0.0015);
        ng.gain.exponentialRampToValueAtTime(0.001, n + p.dur * 0.15);
        ns.connect(ng); ng.connect(lpf); ns.start(n); ns.stop(n + p.dur);
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
