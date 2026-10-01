/**
 * rewardService — the ONE door every reward goes through: sound + vibration +
 * the light (via `rewardEvents`). David 2026-10-01: "bright colors and sound
 * with vibrations … trigger the dopamine response", arcade not casino.
 *
 * THE RULE: only skill earns a reward. Callers decide WHEN (a correct puzzle
 * move, a real decision found); this service decides HOW it feels, from one
 * exhaustive table — a new `RewardKind` fails to compile until it is given a
 * sound, a vibration and a size.
 *
 * Respects the student's switches: `soundEnabled` gates the sound,
 * `hapticsEnabled` (default on) gates the vibration, and the overlay honours
 * `prefers-reduced-motion`. The coach's VOICE never praises (Narration Voice
 * Rule 5) — the machine celebrates, the coach stays dry.
 */
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { getSharedAudioContext } from './audioContextManager';
import { emitRewardEvent, type RewardEvent, type RewardKind } from './rewardEvents';
import { useAppStore } from '../stores/appStore';

type Wave = OscillatorType;
interface Note { f: number; at: number; dur: number; v: number; wave: Wave }

/** C-major pentatonic from C5 — a pip climbs one step per correct move, so a
 *  six-move line is a rising run the ear can count (David: "a 6-mover climbs
 *  a scale"). Pentatonic so any two adjacent pips sound good together. */
const PIP_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32];

export function pipFrequency(step: number): number {
  const i = Math.max(0, Math.min(PIP_SCALE.length - 1, Math.floor(step)));
  return PIP_SCALE[i];
}

const chord = (root: number, at: number, dur: number, v: number, wave: Wave = 'triangle'): Note[] =>
  [1, 1.25, 1.5, 2].map((m, i) => ({ f: root * m, at: at + i * 0.04, dur, v: v * (i === 0 ? 1 : 0.7), wave }));

type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'none';

export interface RewardSpec {
  /** Notes for this moment; `step` is the pip index where it matters. */
  notes: (step: number) => Note[];
  /** Vibrations in order, each `[style, delayMs]`. */
  haptics: [Haptic, number][];
  /** Light size, 0 = none … 4 = full-screen. The overlay reads this. */
  size: 0 | 1 | 2 | 3 | 4;
}

/** The whole reward grammar, smallest to biggest. Exhaustive on purpose. */
export const REWARD_SPECS: Record<RewardKind, RewardSpec> = {
  pip: {
    notes: (s) => [{ f: pipFrequency(s), at: 0, dur: 0.16, v: 0.45, wave: 'sine' }, { f: pipFrequency(s) * 2, at: 0, dur: 0.1, v: 0.12, wave: 'triangle' }],
    haptics: [['light', 0]],
    size: 1,
  },
  solved: {
    notes: (s) => chord(pipFrequency(s), 0, 0.5, 0.4),
    haptics: [['medium', 0], ['medium', 110]],
    size: 2,
  },
  levelUp: {
    notes: () => [0, 1, 2, 3, 4].map((i) => ({ f: PIP_SCALE[i + 2], at: i * 0.045, dur: 0.12, v: 0.3, wave: 'sine' as Wave })),
    haptics: [['light', 0]],
    size: 2,
  },
  rankUp: {
    notes: () => [...chord(523.25, 0, 0.25, 0.35, 'square'), ...chord(783.99, 0.22, 0.6, 0.4, 'square')],
    haptics: [['heavy', 0], ['heavy', 140], ['heavy', 280]],
    size: 3,
  },
  newBest: {
    notes: () => [
      ...chord(523.25, 0, 0.2, 0.35, 'square'),
      ...chord(659.25, 0.18, 0.2, 0.35, 'square'),
      ...chord(783.99, 0.36, 0.2, 0.35, 'square'),
      ...chord(1046.5, 0.54, 0.9, 0.45, 'square'),
    ],
    haptics: [['success', 0], ['heavy', 300], ['heavy', 450], ['heavy', 600]],
    size: 4,
  },
  // Soft and low — a punishing buzz teaches people to stop playing.
  miss: {
    notes: () => [{ f: 196, at: 0, dur: 0.22, v: 0.3, wave: 'sine' }],
    haptics: [['light', 0]],
    size: 0,
  },
  decision: {
    notes: () => [{ f: 1046.5, at: 0, dur: 0.18, v: 0.4, wave: 'sine' }, { f: 1567.98, at: 0.07, dur: 0.22, v: 0.3, wave: 'sine' }],
    haptics: [['light', 0]],
    size: 1,
  },
  saved: {
    notes: () => [{ f: 698.46, at: 0, dur: 0.12, v: 0.35, wave: 'triangle' }, { f: 1046.5, at: 0.08, dur: 0.25, v: 0.35, wave: 'triangle' }],
    haptics: [['medium', 0]],
    size: 1,
  },
  punished: {
    notes: () => chord(392.0, 0, 0.45, 0.45, 'sawtooth'),
    haptics: [['medium', 0], ['medium', 110]],
    size: 2,
  },
  gem: {
    notes: () => [...chord(659.25, 0, 0.2, 0.35, 'square'), ...chord(987.77, 0.2, 0.7, 0.4, 'square')],
    haptics: [['success', 0], ['heavy', 250]],
    size: 3,
  },
  onlyMove: {
    notes: () => [0, 2, 4, 5, 7].map((i, k) => ({ f: PIP_SCALE[i], at: k * 0.06, dur: 0.3, v: 0.35, wave: 'triangle' as Wave })),
    haptics: [['medium', 0], ['heavy', 160]],
    size: 2,
  },
  proven: {
    notes: () => [...chord(783.99, 0, 0.3, 0.35), ...chord(1046.5, 0.25, 0.6, 0.4)],
    haptics: [['success', 0]],
    size: 2,
  },
};

function prefs(): { sound: boolean; haptics: boolean } {
  try {
    const p = useAppStore.getState().activeProfile?.preferences;
    return { sound: p?.soundEnabled ?? true, haptics: p?.hapticsEnabled ?? true };
  } catch {
    // No store (a test double, an early boot) — the defaults are both on.
    return { sound: true, haptics: true };
  }
}

function playNotes(notes: Note[]): void {
  try {
    const c = getSharedAudioContext();
    const go = (): void => {
      const n0 = c.currentTime + 0.01;
      const master = c.createGain();
      master.gain.setValueAtTime(0.6, n0);
      master.connect(c.destination);
      for (const note of notes) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = note.wave;
        o.frequency.setValueAtTime(note.f, n0 + note.at);
        g.gain.setValueAtTime(0, n0 + note.at);
        g.gain.linearRampToValueAtTime(note.v, n0 + note.at + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, n0 + note.at + note.dur);
        o.connect(g);
        g.connect(master);
        o.start(n0 + note.at);
        o.stop(n0 + note.at + note.dur + 0.02);
      }
    };
    if (c.state === 'suspended') {
      void c.resume().then(() => { if (c.state === 'running') go(); }).catch(() => undefined);
      return;
    }
    go();
  } catch { /* no AudioContext — the light + vibration still fire */ }
}

function vibrate(style: Haptic): void {
  if (style === 'none') return;
  const p = style === 'success'
    ? Haptics.notification({ type: NotificationType.Success })
    : Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy });
  void p.catch(() => undefined);
}

/** Fire one reward moment: sound + vibration + light. Total, never throws. */
export function reward(e: RewardEvent): void {
  try { fire(e); } catch { /* a reward must never break the move it rewards */ }
}

function fire(e: RewardEvent): void {
  const spec = REWARD_SPECS[e.kind];
  const { sound, haptics } = prefs();
  if (sound) playNotes(spec.notes(e.step ?? 0));
  if (haptics) {
    for (const [style, delay] of spec.haptics) {
      if (delay === 0) vibrate(style);
      else setTimeout(() => vibrate(style), delay);
    }
  }
  emitRewardEvent(e);
}
