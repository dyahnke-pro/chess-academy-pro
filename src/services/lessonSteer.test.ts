import { describe, it, expect } from 'vitest';
import { candidatesFromLines, pickLessonMoment, steerWindowCp } from './lessonSteer';
import { safetyKey } from './thinkingSafetyStep';

// Black (the coach) to move. …Rc8 attacks White's loose bishop on c4 — a
// moment for "am I safe?" on White's next turn. …Kf8 does nothing.
const FEN = 'r3k3/8/8/8/2B5/8/8/4K3 b - - 0 1';

describe('lessonSteer', () => {
  it('prefers a cheap move that hands the student a moment for the step', () => {
    const pick = pickLessonMoment(FEN, [
      { san: 'Kf8', cpLoss: 0 },
      { san: 'Rc8', cpLoss: 20 },
    ], safetyKey, 80);
    expect(pick?.san).toBe('Rc8');
  });

  it('never steers outside the strength window', () => {
    expect(pickLessonMoment(FEN, [{ san: 'Kf8', cpLoss: 0 }, { san: 'Rc8', cpLoss: 200 }], safetyKey, 80)).toBeNull();
  });

  it('returns null when no move creates a moment (the coach plays normally)', () => {
    expect(pickLessonMoment(FEN, [{ san: 'Kf8', cpLoss: 0 }, { san: 'Kd8', cpLoss: 5 }], safetyKey, 80)).toBeNull();
  });

  it('skips illegal moves', () => {
    expect(pickLessonMoment(FEN, [{ san: 'Qh4', cpLoss: 0 }], safetyKey, 80)).toBeNull();
  });

  it('a stronger student gets a tighter window', () => {
    expect(steerWindowCp(800)).toBeGreaterThan(steerWindowCp(1800));
    expect(steerWindowCp(1800)).toBeGreaterThan(steerWindowCp(2200));
  });
});

describe('candidatesFromLines', () => {
  it('turns engine lines into moves with their cost for the side to move', () => {
    const c = candidatesFromLines(FEN, [
      { evaluation: -50, moves: ['e8f8'], mate: null },
      { evaluation: -30, moves: ['a8c8'], mate: null },
    ]);
    // Black to move: -50 is better for Black than -30.
    expect(c).toEqual([{ san: 'Kf8', cpLoss: 0 }, { san: 'Rc8', cpLoss: 20 }]);
  });
});
