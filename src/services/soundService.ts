/**
 * soundService – piece sound playback for Chess Academy Pro.
 * Uses Web Audio API synthesis – no external audio files required.
 */
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
const SOUND_PARAMS: Record<SoundSet, Record<SoundType, SoundParams>> = {
  classic:  { move: {freq:250,dur:.08,dec:40,tp:'sine',ns:.5,v:.8}, capture: {freq:180,dur:.12,dec:35,tp:'sine',ns:.6,v:.9}, castle: {freq:220,freq2:280,dur:.15,dec:35,tp:'sine',ns:.45,v:.85}, check: {freq:350,freq2:450,dur:.1,dec:38,tp:'sine',ns:.35,v:.95} },
  metallic: { move: {freq:800,dur:.2,dec:25,tp:'triangle',v:.6},   capture: {freq:600,dur:.3,dec:20,tp:'triangle',v:.7},       castle: {freq:700,freq2:900,dur:.4,dec:18,tp:'triangle',v:.65},   check: {freq:900,freq2:1100,dur:.25,dec:22,tp:'sawtooth',v:.75} },
  marble:   { move: {freq:200,dur:.3,dec:16,tp:'sine',ns:.2,v:.8}, capture: {freq:160,dur:.4,dec:12,tp:'sine',ns:.3,v:.85},    castle: {freq:180,freq2:240,dur:.5,dec:10,tp:'sine',ns:.2,v:.8},  check: {freq:400,freq2:500,dur:.3,dec:14,tp:'sine',v:.9} },
  cartoon:  { move: {freq:500,dur:.18,dec:30,tp:'square',v:.5},    capture: {freq:350,freq2:500,dur:.25,dec:25,tp:'square',v:.6}, castle: {freq:450,freq2:600,dur:.35,dec:20,tp:'square',v:.55}, check: {freq:650,freq2:900,dur:.3,dec:28,tp:'square',v:.65} },
};
export class SoundService {
  private enabled = true;
  private volume = 0.7;
  private currentSet: SoundSet = 'classic';
  private ctx: AudioContext | null = null;
  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed')
      this.ctx = new AudioContext();
    return this.ctx;
  }
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
  private synth(p: SoundParams): void {
    try {
      const c = this.getCtx();
      if (c.state === 'suspended') void c.resume();
      const mv = (p.v ?? 0.7) * this.volume, n = c.currentTime;

      // Low-pass filter to soften harsh overtones and reduce graininess
      const lpf = c.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(Math.min(p.freq * 4, 6000), n);
      lpf.Q.setValueAtTime(0.7, n);
      lpf.connect(c.destination);

      const play = (freq: number, gain: number): void => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = p.tp; o.frequency.setValueAtTime(freq, n);
        g.gain.setValueAtTime(0, n);
        g.gain.linearRampToValueAtTime(gain, n + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, n + p.dur);
        o.connect(g); g.connect(lpf); o.start(n); o.stop(n + p.dur);
      };
      play(p.freq, mv);
      if (p.freq2) play(p.freq2, mv * 0.6);
      if (p.ns && p.ns > 0) {
        const bs = Math.floor(c.sampleRate * p.dur * 0.4), nb = c.createBuffer(1, bs, c.sampleRate);
        const d = nb.getChannelData(0); for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource(), ng = c.createGain();
        ns.buffer = nb; ng.gain.setValueAtTime(0, n);
        ng.gain.linearRampToValueAtTime(mv * p.ns * 0.6, n + 0.005);
        ng.gain.exponentialRampToValueAtTime(0.001, n + p.dur * 0.3);
        ns.connect(ng); ng.connect(lpf); ns.start(n); ns.stop(n + p.dur);
      }
    } catch { /* swallow – AudioContext unavailable or suspended */ }
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
