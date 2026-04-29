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
// WO-COACH-CLICK-SND — phone-keyboard-click character: sharp transient,
// broadband noise burst at the start, very short total duration. The
// previous params (250 ms `move`, 300 Hz, sine wave, light noise) read
// as "boop" rather than "click". New defaults: ~50 ms total, mid-high
// fundamental, heavy noise component for the click attack, fast decay.
const SOUND_PARAMS: Record<SoundSet, Record<SoundType, SoundParams>> = {
  classic:  { move: {freq:1500,dur:.05,dec:60,tp:'triangle',ns:.7,v:.55}, capture: {freq:900,dur:.07,dec:45,tp:'triangle',ns:.8,v:.65}, castle: {freq:1100,freq2:1400,dur:.09,dec:35,tp:'triangle',ns:.5,v:.6}, check: {freq:1800,freq2:2200,dur:.08,dec:40,tp:'triangle',ns:.4,v:.7} },
  metallic: { move: {freq:2200,dur:.04,dec:65,tp:'triangle',ns:.6,v:.5},  capture: {freq:1600,dur:.06,dec:50,tp:'triangle',ns:.7,v:.6},  castle: {freq:1800,freq2:2400,dur:.08,dec:40,tp:'triangle',ns:.5,v:.55}, check: {freq:2400,freq2:3000,dur:.07,dec:45,tp:'sawtooth',ns:.4,v:.65} },
  marble:   { move: {freq:1200,dur:.06,dec:55,tp:'sine',ns:.6,v:.6},      capture: {freq:800,dur:.08,dec:42,tp:'sine',ns:.75,v:.7},      castle: {freq:900,freq2:1200,dur:.1,dec:32,tp:'sine',ns:.5,v:.65},        check: {freq:1500,freq2:1900,dur:.08,dec:42,tp:'sine',ns:.4,v:.75} },
  cartoon:  { move: {freq:1700,dur:.05,dec:60,tp:'square',ns:.5,v:.5},    capture: {freq:1100,freq2:1400,dur:.07,dec:48,tp:'square',ns:.6,v:.6}, castle: {freq:1300,freq2:1700,dur:.1,dec:35,tp:'square',ns:.4,v:.55},     check: {freq:2000,freq2:2500,dur:.08,dec:42,tp:'square',ns:.4,v:.65} },
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

      // WO-COACH-CLICK-SND: snappier envelope. Attack 1.5 ms (was 8 ms)
      // gives the transient "click" character; tone decays exponentially
      // over the full duration. Noise burst stays very short (5 % of
      // duration) so the broadband click hits cleanly without lingering.
      const play = (freq: number, gain: number): void => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = p.tp; o.frequency.setValueAtTime(freq, n);
        g.gain.setValueAtTime(0, n);
        g.gain.linearRampToValueAtTime(gain, n + 0.0015);
        g.gain.exponentialRampToValueAtTime(0.001, n + p.dur);
        o.connect(g); g.connect(lpf); o.start(n); o.stop(n + p.dur);
      };
      play(p.freq, mv);
      if (p.freq2) play(p.freq2, mv * 0.6);
      if (p.ns && p.ns > 0) {
        // Click-style noise: fill the first 8 % of the duration only,
        // hard-attack at 0.5 ms and fast exponential tail. Previously
        // the noise burst stretched 40 % of duration which read as a
        // "shaker" rather than a tap.
        const bs = Math.floor(c.sampleRate * p.dur * 0.08), nb = c.createBuffer(1, bs, c.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource(), ng = c.createGain();
        ns.buffer = nb; ng.gain.setValueAtTime(0, n);
        ng.gain.linearRampToValueAtTime(mv * p.ns * 0.9, n + 0.0005);
        ng.gain.exponentialRampToValueAtTime(0.001, n + p.dur * 0.12);
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
