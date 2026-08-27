import { describe, it, expect } from 'vitest';
import { detectTilt } from './tiltSignal';
import type { SessionRecord } from '../types';

function s(over: Partial<SessionRecord>): SessionRecord {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-08-27',
    profileId: 'p1',
    durationMinutes: 15,
    plan: { items: [] } as unknown as SessionRecord['plan'],
    completed: true,
    puzzlesSolved: 10,
    puzzleAccuracy: 0.8,
    xpEarned: 100,
    coachSummary: null,
    ...over,
  };
}

describe('detectTilt — cross-session behavioral read', () => {
  it('none when sessions are healthy', () => {
    expect(detectTilt([s({ puzzleAccuracy: 0.8 }), s({ puzzleAccuracy: 0.7 })]).level).toBe('none');
  });

  it('none with no sessions', () => {
    expect(detectTilt([]).level).toBe('none');
  });

  it('strong on an early bail (abandoned quickly)', () => {
    const v = detectTilt([s({ completed: false, durationMinutes: 1, puzzlesSolved: 1, puzzleAccuracy: 0 })]);
    expect(v.level).toBe('strong');
    expect(v.reason).toMatch(/bail/i);
  });

  it('strong when the last two real sessions both flop', () => {
    const v = detectTilt([
      s({ puzzleAccuracy: 0.2, puzzlesSolved: 8 }),
      s({ puzzleAccuracy: 0.3, puzzlesSolved: 6 }),
    ]);
    expect(v.level).toBe('strong');
  });

  it('mild on a single rough recent session', () => {
    const v = detectTilt([
      s({ puzzleAccuracy: 0.25, puzzlesSolved: 6 }),
      s({ puzzleAccuracy: 0.8, puzzlesSolved: 10 }),
    ]);
    expect(v.level).toBe('mild');
  });

  it('ignores a tiny-sample session (< 3 attempts) as noise, not a slump', () => {
    // A 1-puzzle 0% session is noise; the older healthy session governs.
    const v = detectTilt([
      s({ puzzleAccuracy: 0, puzzlesSolved: 1, completed: true, durationMinutes: 8 }),
      s({ puzzleAccuracy: 0.8, puzzlesSolved: 10 }),
    ]);
    expect(v.level).toBe('none');
  });
});
