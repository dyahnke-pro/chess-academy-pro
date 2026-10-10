import { describe, expect, it } from 'vitest';
import { allowedReply, callInaccuracyDetailed, causedByTheMove } from './inaccuracyCall';
import { replyPunishment } from './moveAllowed';

// Learn walk on prod, 2026-10-10 (Scandinavian, Black): the error call said
// "knight takes e4 was imprecise — it let them play bishop takes a5, which
// wins the queen on a5". Bxa5 is answered by Nxa5: they net a queen for a
// knight and a bishop, never "the queen".
const B = '2kr1b1r/ppp2ppp/2n1pn2/q7/3PN1P1/5N2/PPPB1PP1/R2QKB1R b KQ - 1 9';

describe('what a move allowed is what they NET', () => {
  it('a queen they pay a bishop for is said as that trade', () => {
    expect(replyPunishment(B, 'Nxe4', 'Bxa5')?.gerund).toBe('winning your queen on a5 for their bishop');
  });
  it('the line reader never says "wins the queen" off a line that gives material back', () => {
    expect(allowedReply(B, 'Nxe4', ['d2a5', 'c6a5', 'f1d3'], 'black')).toBeNull();
  });
  it('a threat that was there before the move and survives the better move is not the move\'s doing', () => {
    // Nxe4 left the queen hanging, and Qb6 would have saved it: caused.
    expect(causedByTheMove(B, 'Nxe4', 'Qb6', 'd2a5', 'black')).toBe(true);
    // Measured against a "better" move that leaves it hanging too: not caused.
    expect(causedByTheMove(B, 'Nxe4', 'Nxe4', 'd2a5', 'black')).toBe(false);
  });
});

describe('a grade with nothing beside it is held (the walk heard "Bd6 was imprecise.")', () => {
  it('no why, no cost that fits → no call', () => {
    const v = callInaccuracyDetailed({ namesBetterMove: false, priorMove: null, replyLineUci: [], replySan: null,
      side: 'student', moverColor: 'black', cpLoss: 210, moverEvalAfterCp: -800,
      fenBefore: '3r4/2R4p/p1rP2p1/2Pk1p2/NP6/7P/P5P1/6K1 b - - 2 36', playedSan: 'Rc8', bestSan: 'Rcxd6' });
    expect(v.call).toBeNull();
    expect(v.declined).toBe('no-why');
  });
});
