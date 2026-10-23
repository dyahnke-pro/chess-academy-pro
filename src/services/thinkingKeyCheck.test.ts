import { describe, it, expect } from 'vitest';
import { MARGIN_CP, answerDangerCheck, capturesCheck, dangerCheck, landingCheck, otherSideToMove, type KeyScorer } from './thinkingKeyCheck';

/** An engine stand-in: the best move and its score, and a score per move
 *  (the best of several moves is the highest of theirs). */
function scorer(best: { cp: number; uci: string }, perMove: Record<string, number>, fallback = -1000): KeyScorer & { asked: string[][] } {
  const asked: string[][] = [];
  return {
    asked,
    best: async () => best,
    bestOf: async (_fen, ucis) => { asked.push([...ucis]); return Math.max(...ucis.map((u) => perMove[u] ?? fallback)); },
  };
}

// White to move: the black knight on c6 is loose and the c1 rook takes it.
const TAKE_KNIGHT = '4k3/8/2n5/8/8/8/8/2R1K3 w - - 0 1';

describe('capturesCheck — what you can win now', () => {
  it('passes when taking each keyed piece is within the margin of the best move', async () => {
    expect(await capturesCheck(TAKE_KNIGHT, ['c6'], scorer({ cp: 320, uci: 'c1c6' }, { c1c6: 320 }))).toBe(true);
  });

  it('drops the board when taking is a mistake, or a bigger shot is on (the measured failure)', async () => {
    expect(await capturesCheck(TAKE_KNIGHT, ['c6'], scorer({ cp: 320 + MARGIN_CP + 1, uci: 'c1c8' }, { c1c6: 320 }))).toBe(false);
  });

  it('drops the board when the best move takes a piece the key leaves out', async () => {
    const fen = '4k3/8/2n5/8/8/8/8/R1R1K3 w - - 0 1'.replace('4k3/8', '4k3/n7');   // a7 knight the a1 rook can take
    expect(await capturesCheck(fen, ['c6'], scorer({ cp: 320, uci: 'a1a7' }, { c1c6: 320, a1a7: 320 }))).toBe(false);
  });

  it('a keyed piece nothing can take now is not winnable now', async () => {
    expect(await capturesCheck('4k3/8/2n5/8/8/8/8/4K2R w - - 0 1', ['c6'], scorer({ cp: 0, uci: 'h1h2' }, {}))).toBe(false);
  });

  it('an engine that cannot read the board drops it (never asked on a guess)', async () => {
    const blind: KeyScorer = { best: async () => null, bestOf: async () => null };
    expect(await capturesCheck(TAKE_KNIGHT, ['c6'], blind)).toBe(false);
  });
});

describe('dangerCheck — what they can win now', () => {
  // White to move; the white knight on c6 is attacked by the b7 pawn.
  const HUNG = '4k3/1p6/2N5/8/8/8/8/4K3 w - - 0 1';

  it('asks the engine from THEIR side of the board', async () => {
    const s = scorer({ cp: 300, uci: 'b7c6' }, { b7c6: 300 });
    expect(await dangerCheck(HUNG, ['c6'], s)).toBe(true);
    expect(s.asked).toEqual([['b7c6']]);
  });

  it('a false alarm (taking would cost them) is dropped', async () => {
    expect(await dangerCheck(HUNG, ['c6'], scorer({ cp: 300, uci: 'e8d8' }, { b7c6: 300 - MARGIN_CP - 1 }))).toBe(false);
  });

  it('a side to move in check is never flipped', () => {
    expect(otherSideToMove('4k3/8/8/8/8/8/8/4K2r w - - 0 1')).toBeNull();
    expect(otherSideToMove('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBe('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
  });
});

describe('landingCheck — a fork or a pile-on that really works', () => {
  it('scores only the moves the kit names, landing on each key square', async () => {
    const s = scorer({ cp: 200, uci: 'c1c6' }, { c1c6: 200 });
    expect(await landingCheck((m) => m.piece === 'r')(TAKE_KNIGHT, ['c6'], s)).toBe(true);
    expect(s.asked).toEqual([['c1c6']]);
    expect(await landingCheck((m) => m.piece === 'k')(TAKE_KNIGHT, ['c6'], s)).toBe(false);
  });
});

describe('answerDangerCheck — the safe squares are the good answers', () => {
  // White to move: the knight on c3 is attacked by the d4 pawn.
  const FEN = '4k3/8/8/8/3p4/2N5/8/4K3 w - - 0 1';
  const piece = (): 'c3' => 'c3';

  it('passes when every keyed square is good and every other square is clearly worse', async () => {
    const per: Record<string, number> = { c3b5: 0, c3e4: 0, c3a4: -300, c3b1: -300, c3d1: -300, c3e2: -300, c3a2: -300, c3d5: -300, d4c3: 300 };
    const s: KeyScorer = {
      best: async (fen) => (fen.includes(' b ') ? { cp: 300, uci: 'd4c3' } : { cp: 0, uci: 'c3b5' }),
      bestOf: async (_f, ucis) => Math.max(...ucis.map((u) => per[u] ?? -1000)),
    };
    expect(await answerDangerCheck(piece)(FEN, ['b5', 'e4'], s)).toBe(true);
    // A square the key leaves out that is just as good would be graded wrong unfairly: drop.
    expect(await answerDangerCheck(piece)(FEN, ['b5'], s)).toBe(false);
  });
});
