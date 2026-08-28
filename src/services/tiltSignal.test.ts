import { describe, it, expect } from 'vitest';
import { detectTilt, detectGameTilt } from './tiltSignal';
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

describe('detectGameTilt — game-level rage-quit', () => {
  const bail = { source: 'coach', termination: 'resigned', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6' }; // 6 plies
  const full = { source: 'coach', termination: 'checkmated', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7' };

  it('strong on two quick resignations', () => {
    expect(detectGameTilt([bail, bail, full]).level).toBe('strong');
  });

  it('none when games are played out', () => {
    expect(detectGameTilt([full, full, full]).level).toBe('none');
  });

  it('mild when the last game was abandoned short', () => {
    expect(detectGameTilt([{ source: 'coach', termination: 'abandoned', pgn: '1. e4 e5' }, full]).level).toBe('mild');
  });

  it('ignores non-coach games', () => {
    expect(detectGameTilt([{ source: 'chess.com', termination: 'resigned', pgn: '1. e4 e5' }]).level).toBe('none');
  });
});
