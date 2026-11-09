// A PROMOTION IS SAID ONCE (prod Review/Learn audit 2026-11-06): "f4 looks
// natural, but it doesn't work: they play a2, you answer king to h2 and they
// play a1, making a queen — they win a new queen." The line already says the
// new queen ("a1=Q" is spoken "a1, making a queen"); the result after it said
// it again. The words after a line are what it wins BEYOND the moves it says.
//
// The board is the audit game's (Carlsen–Caruana, 44.Rd7+): Black's a-pawn on
// a3, nothing of White's covering a1. The read for f4 is the line the audit
// heard (…a2 Kh2 …a1=Q), handed in as the engine's read.
import { describe, it, expect } from 'vitest';
import { temptingRefuted, type WeighRead } from './weighedMoves';
import { costReason, reasonWinWords } from './costReason';
import { lineWins } from './lineCalc';
import { lineShapePlies } from '../utils/andList';

const FEN = '8/5k2/3R4/r1p5/4R2P/p7/1r3PP1/6K1 w - - 5 44';
const READS: WeighRead[] = [
  { evaluation: 0, mate: null, moves: ['d6d7', 'f7f6', 'd7d6', 'f6f7'] },
  { evaluation: -850, mate: null, moves: ['f2f4', 'a3a2', 'g1h2', 'a2a1q', 'e4e1', 'a1e1'] },
  { evaluation: -280, mate: null, moves: ['f2f3', 'a5a7', 'e4f4', 'f7g7'] },
];
const AFTER_F4 = '8/5k2/3R4/r1p5/4RP1P/p7/1r4P1/6K1 b - - 0 44';

describe('the new queen is said once', () => {
  it('the tempting move\'s line ends on the promotion; nothing after it names the queen again', () => {
    const t = temptingRefuted({ fenBefore: FEN, san: 'Rd7+', student: 'w', rating: 1500, reads: READS, priorMove: null });
    expect(t?.text).toBe('f4 looks natural, but it doesn\'t work: they play a2, you answer Kh2 and they play a1=Q.');
    expect(t?.text ?? '').not.toMatch(/new queen/);
  });

  it('a promotion the line does not say is still named after it', () => {
    const r = costReason({
      fenBefore: FEN, playedSan: 'f4', mover: 'w', student: 'w', costCp: 850,
      after: { uci: ['a3a2', 'g1h2', 'a2a1q'], source: 'deep', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(r?.plies.map((p) => p.san)).toEqual(['a2', 'Kh2', 'a1=Q']);
    if (!r) return;
    // Nothing of the line said: the gain is the new queen.
    expect(reasonWinWords(r, [])).toBe('a new queen');
    // Only its first move said ("it runs into a2"): still the new queen.
    expect(reasonWinWords(r, [0])).toBe('a new queen');
    // The whole line said, to "a1, making a queen": nothing is left to say.
    expect(reasonWinWords(r, lineShapePlies(r.plies.map((p) => p.san), r.fen))).toBeNull();
  });

  it('a line won by the one ledger says the queen once too (lineWins)', () => {
    const w = lineWins(AFTER_F4, ['a3a2', 'g1h2', 'a2a1q'], 'b', undefined, { fenBefore: FEN, san: 'f4' }, [['a3a2', 'g1h2', 'a2a1q']]);
    expect(w?.what).toBe('a new queen');
    expect(w?.afterLine).toBeNull();
  });

  it('lineShape says every move up to three, otherwise the first and the last', () => {
    expect(lineShapePlies([], null)).toEqual([]);
    expect(lineShapePlies(['a', 'b', 'c'], null)).toEqual([0, 1, 2]);
    expect(lineShapePlies(['a', 'b', 'c', 'd', 'e', 'f'], null)).toEqual([0, 5]);
  });
});
