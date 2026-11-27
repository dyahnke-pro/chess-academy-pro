import { describe, expect, it } from 'vitest';
import { lineWins } from './lineCalc';
import { withOneSearch } from '../test/oneSearchScores';

describe('lineWins — the line that makes the found move work (pass-2 walk 2026-09-30)', () => {
  // King's Indian, after 9.d5: 9…Nxd5 10.cxd5 Bxc3+ 11.Bxc3 Qxc3+ wins a pawn.
  const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 9';
  it('says the line to the last capture, with what it wins', () => {
    const w = lineWins(fen, ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'], 'b', 'Nxd5', null, [['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2']]);
    expect(w?.what).toBe('a pawn');
    expect(w?.sans).toEqual(['…Nxd5', 'cxd5', '…Bxc3+', 'Bxc3', '…Qxc3+']);
    expect(w?.plies).toHaveLength(5);
  });
  it('a line that ends behind says nothing', () => {
    // …Nxd5 cxd5 and the line stops: a knight for a pawn.
    expect(lineWins(fen, ['f6d5', 'c4d5', 'h7h6'], 'b', 'Nxd5', null, [])).toBeNull();
  });
  it('a line cut one move short of a forced recapture is played out (WO-OUTCOME-01)', () => {
    // The engine line stops at Bxc3; …Qxc3+ takes the bishop back and is forced
    // material, so the claim is the pawn — shown to the move that wins it.
    const w = lineWins(fen, ['f6d5', 'c4d5', 'g7c3', 'b2c3'], 'b', 'Nxd5', null, [['f6d5', 'c4d5', 'g7c3', 'b2c3']]);
    expect(w?.what).toBe('a pawn');
    expect(w?.sans).toEqual(['…Nxd5', 'cxd5', '…Bxc3+', 'Bxc3', '…Qxc3+']);
  });
  it('a different first move says nothing', () => {
    expect(lineWins(fen, ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'], 'b', 'Nb4', null, [])).toBeNull();
  });
});

describe('studentMoveTeaching — a winning move says its line (David 2026-09-30)', () => {
  it('the engine move that wins a pawn plays the line out, drawn', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 9';
    const hints = studentMoveTeaching({ unpricedCredit: 'refused', linesAfter: [], namesStudentMoves: true, theory: true,
      fenBefore: fen, san: 'Nxd5', history: ['Nxd5'], cpLoss: 0, bothCp: true, bestSan: 'Nxd5',
      // The engine's free second read (the same search two depths shallower)
      // agrees, so the three-move line is named (`lineTrust`).
      bestLine: { rank: 1, evaluation: -270, mate: null, moves: ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'], earlier: { depth: 12, moves: ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'] } },
      reply: null, cpAfter: null,
    });
    const line = hints.find((h) => h.lane === 'movePoint' && /wins a pawn/.test(h.text));
    expect(line?.text).toBe('That wins a pawn: you play Nxd5 and, two moves later, you play Qxc3+.');
    expect(line?.arrows).toHaveLength(5);
  });
  // Every move of the winner is a capture or a check and every reply loses no
  // less, so the board proves the line on one read (`boardProvesLine`, d4d4095).
  it('on one read a line the board proves is named (the naming rule)', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 9';
    const hints = studentMoveTeaching({ unpricedCredit: 'refused', linesAfter: [], namesStudentMoves: true, theory: true,
      fenBefore: fen, san: 'Nxd5', history: ['Nxd5'], cpLoss: 0, bothCp: true, bestSan: 'Nxd5',
      bestLine: { rank: 1, evaluation: -270, mate: null, moves: ['f6d5', 'c4d5', 'g7c3', 'b2c3', 'a5c3', 'e1e2'] },
      reply: null, cpAfter: null,
    });
    expect(hints.some((h) => /two moves later/.test(h.text))).toBe(true);
  });
});

describe('the mate, played out — found and missed (David 2026-09-30: "take the escape square first")', () => {
  // Black king h8 boxed by its own h-pawn; Re8+ fails to …Kg7 until the bishop covers g7.
  const fen = '7k/p6p/8/8/8/8/8/2B1R1K1 w - - 0 1';
  const line = { rank: 1, evaluation: 0, mate: 2, moves: ['c1h6', 'a7a6', 'e1e8'] };
  it('the quiet first move found is said with the escape square it takes', async () => {
    const { studentMoveTeaching } = await import('./learnBoardTeaching');
    const hints = studentMoveTeaching({ unpricedCredit: 'refused', linesAfter: [], namesStudentMoves: true, theory: true, fenBefore: fen, san: 'Bh6', history: ['Bh6'], cpLoss: 0, bothCp: false, bestSan: 'Bh6', bestLine: line, reply: null, cpAfter: null });
    const h = hints.find((x) => x.lane === 'movePoint');
    expect(h?.text).toBe('No check yet — the quiet Bh6 comes first: it takes g7 from their king, and Re8 is mate. You play Bh6, they answer a6 and you play Re8#.');
    expect(h?.arrows).toHaveLength(3);
  });
  it('the quiet mate missed is played out in the verdict', async () => {
    const { callInaccuracyDetailed } = await import('./inaccuracyCall');
    const r = callInaccuracyDetailed(withOneSearch({ errorBarCp: 100, namesBetterMove: true, priorMove: null, fenBefore: fen, playedSan: 'Kf2', bestSan: 'Bh6', cpLoss: 900, side: 'student', moverColor: 'white', bestLineUci: line.moves, replyLineUci: [], replySan: null, missedMate: 2 }));
    expect(r.call?.said).toMatch(/let a forced mate slip\. No check yet — the quiet Bh6 comes first: it takes g7 from their king, and Re8 is mate\./);
    expect(r.call?.line?.uci).toEqual(['c1h6', 'a7a6', 'e1e8']);
  });
});
