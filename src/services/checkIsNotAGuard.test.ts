import { describe, it, expect } from 'vitest';
import { threatAnswerWhy } from './deliberation';

// Clean-pass walk 13, game SI5q0VJz after 30…Ke7: "The move is Rc7+ — it
// guards the knight on f3, which they were about to win." A rook on c7 does
// not guard f3. The check made …exf3 illegal for one move, nothing more — the
// knight hangs again the move after.
const FEN = '2Rnk2r/6pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 b - - 1 30';
const AFTER_KE7 = '2Rn3r/4k1pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 w - - 2 31';

describe('a check is not a guard', () => {
  it('Rc7+ does not "guard the knight on f3"', () => {
    expect(FEN).toBeTruthy();
    expect(threatAnswerWhy(AFTER_KE7, 'Rc7+', 'w') ?? '').not.toMatch(/guards the knight on f3/);
  });

  it('a real guard is still named (Qxe4+ removes the attacker)', () => {
    expect(threatAnswerWhy(AFTER_KE7, 'Qxe4+', 'w') ?? '').toMatch(/takes the pawn that was hitting the knight on f3/);
  });
});

describe('seeReadsStanding', () => {
  it('in check, a non-checker\'s safety is not a standing read; the checker\'s is', async () => {
    const { seeReadsStanding } = await import('./positionReadingService');
    const afterRc7 = '3n3r/2R1k1pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 b - - 3 31';
    expect(seeReadsStanding(afterRc7, 'f3', 'b')).toBe(false);
    expect(seeReadsStanding(afterRc7, 'c7', 'b')).toBe(true);
    expect(seeReadsStanding(AFTER_KE7, 'f3', 'b')).toBe(true);
  });
});

// THE SAFETY DOOR: a check is never read as "safe". After Nc5+ (discovered by
// the rook on e1), …Qxc5 is illegal for one move only — c5 is not a safe square.
const AFTER_DISCOVERED = '2q1k3/8/8/2N5/8/8/8/4R1K1 b - - 1 1';

describe('captureRead — the one safety door', () => {
  it('a check gives null, never a zero', async () => {
    const { captureRead, legalSeeGainFor } = await import('./positionReadingService');
    expect(legalSeeGainFor(AFTER_DISCOVERED, 'c5', 'b')).toBe(0); // the silent "safe"
    expect(captureRead(AFTER_DISCOVERED, 'c5', 'b')).toBeNull();
    expect(captureRead('3n3r/2R1k1pp/5q2/3B4/Q3p3/P4N2/5PPP/6K1 b - - 3 31', 'f3', 'b')).toBeNull();
    expect(captureRead(AFTER_KE7, 'f3', 'b')).toBeGreaterThan(0);
  });

  it('landingIsSafe does not call a discovered-check landing safe', async () => {
    const { landingIsSafe } = await import('./positionReadingService');
    expect(landingIsSafe(AFTER_DISCOVERED, 'c5')).toBe(false);
    expect(landingIsSafe('2q1k3/8/8/2N5/8/8/8/6K1 b - - 1 1', 'c5')).toBe(false); // honest hang
    expect(landingIsSafe('4k3/8/8/2N5/8/8/8/6K1 b - - 1 1', 'c5')).toBe(true);
  });

  it('chat: "is my knight safe" with a check on the board does not say it holds', async () => {
    const { assemblePieceSafetyAnswer } = await import('./groundedAnswer');
    const a = assemblePieceSafetyAnswer(AFTER_DISCOVERED, 'is my knight on c5 safe?', 'white');
    expect(a?.facts ?? '').toMatch(/knight on c5/);
    expect(a?.facts ?? '').not.toMatch(/holds|defended enough|is safe/);
  }, 30000);
});
