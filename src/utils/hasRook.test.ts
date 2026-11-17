import { describe, it, expect } from 'vitest';
import { hasRook } from './hasRook';
import { moveAspects } from '../services/reviewMoveBriefing';
import { NO_FOLLOW } from '../services/exchangeLedger';
import { buildReviewMoveTeaching } from '../services/reviewMoveTeaching';
import { NO_PREV_CAPTURE } from '../services/captureRun';

// Danya kYbh2 33…exf4+: a pawn ending — no "half-opens the e-file for the rooks".
const PAWN_ENDING = '8/7p/p4pp1/P3p2k/5P1P/4P1K1/8/8 b - - 0 33';

describe('a file is a road only for a side with a rook', () => {
  it('reads the rooks', () => {
    expect(hasRook(PAWN_ENDING, 'b')).toBe(false);
    expect(hasRook('4k2r/8/8/8/8/8/8/4K3 b - - 0 1', 'b')).toBe(true);
  });
  it('the briefing never says a file opens in a pawn ending', () => {
    const a = moveAspects({ fenBefore: PAWN_ENDING, san: 'exf4+', prev: NO_PREV_CAPTURE, moverIsStudent: true, follow: NO_FOLLOW });
    expect(a).not.toBeNull();
    expect((a?.aspects ?? []).some((x) => x.kind === 'aspect-opens-file')).toBe(false);
  });
  it('the board teacher never says a file opens for rooks nobody has', () => {
    expect(buildReviewMoveTeaching(PAWN_ENDING, 'exf4+', true) ?? '').not.toMatch(/for the rooks/);
  });
});
