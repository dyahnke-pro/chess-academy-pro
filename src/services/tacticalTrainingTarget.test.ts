import { describe, it, expect } from 'vitest';
import { pickTrainingTarget, trainingTargetLabel, WEAK_MIN_ATTEMPTS, type ThemeCategoryStats } from './tacticalTrainingTarget';

const cat = (name: string, accuracy: number, attempts: number): ThemeCategoryStats => ({ name, accuracy, attempts, themes: [name.toLowerCase()] });

describe('pickTrainingTarget — "weakest" only on evidence', () => {
  it('every motif at 100% is NOT a weakest motif — it says so and names the least practised (walk 2026-10-03)', () => {
    const t = pickTrainingTarget([cat('Forks', 1, 12), cat('Pins & Skewers', 1, 8), cat('Opening Traps', 1, 2)]);
    expect(t.kind).toBe('least-practised');
    const label = trainingTargetLabel(t);
    expect(label.title).toBe('No weak motif yet');
    expect(label.detail).toBe('least practised: Opening Traps');
    expect(label.title).not.toMatch(/weakest/i);
  });

  it('a genuinely weak motif with enough attempts is the weakest', () => {
    const t = pickTrainingTarget([cat('Forks', 0.9, 20), cat('Pins & Skewers', 0.4, 10), cat('Opening Traps', 0.6, 8)]);
    expect(t).toMatchObject({ kind: 'weak', category: { name: 'Pins & Skewers' } });
    expect(trainingTargetLabel(t)).toEqual({ title: 'Train Your Weakest', detail: 'Pins & Skewers' });
  });

  it('a low accuracy over too few attempts is noise, not a weakness', () => {
    const t = pickTrainingTarget([cat('Forks', 1, 20), cat('Opening Traps', 0, WEAK_MIN_ATTEMPTS - 1)]);
    expect(t.kind).toBe('least-practised');
  });

  it('a never-tried motif leads the least-practised pick (grey means teach it)', () => {
    const t = pickTrainingTarget([cat('Forks', 1, 20), cat('Zugzwang', -1, 0), cat('Opening Traps', 1, 2)]);
    expect(t).toMatchObject({ kind: 'least-practised', category: { name: 'Zugzwang' } });
  });

  it('no categories at all is honest too', () => {
    expect(pickTrainingTarget([])).toEqual({ kind: 'none' });
  });
});
