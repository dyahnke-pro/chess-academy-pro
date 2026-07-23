// The method of comparison aimed at a PIECE: a piece is "bad" only when
// IMPROVING it swings the engine eval toward its owner. Driven by a
// deterministic mock engine whose cp is a function of the bad piece's mobility,
// so the ablation is proven without a real Stockfish (G0).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainEvalByPieceQuality, __test } from './pieceQuality';
import type { Evaluate } from './moveComparison';

const { pieceMobility, worstPieces, relocateToBest } = __test;

function blackPieceSquare(fen: string, type: 'n' | 'b'): string | null {
  for (const row of new Chess(fen).board()) {
    for (const cell of row) if (cell && cell.color === 'b' && cell.type === type) return cell.square;
  }
  return null;
}

describe('pieceMobility', () => {
  it('a cornered knight is near-dead, a central knight is alive', () => {
    // Black knight a8 vs black knight e5, otherwise bare kings.
    const corner = pieceMobility('n3k3/8/8/8/8/8/8/4K3 b - - 0 1', 'a8' as never);
    const central = pieceMobility('4k3/8/8/4n3/8/8/8/4K3 b - - 0 1', 'e5' as never);
    expect(corner).toBe(2);       // a8 → b6, c7
    expect(central).toBe(8);
  });
});

describe('worstPieces', () => {
  it('collects only the low-mobility non-pawn, non-king pieces, worst first', () => {
    const fen = 'n3k2b/3pppp1/8/8/8/8/3PPP2/3RK3 w - - 0 1';
    const bad = worstPieces(fen, 'b', 3);
    expect(bad.map((p) => p.type)).toEqual(['b', 'n']); // bishop h8 (mob 0) before knight a8 (mob 2)
    expect(bad[0].sq).toBe('h8');
    expect(bad[1].sq).toBe('a8');
  });
});

describe('relocateToBest', () => {
  it('teleports the piece off its square to an active one, origin left empty', () => {
    const fen = 'n3k3/8/8/8/8/8/8/4K3 b - - 0 1';
    const out = relocateToBest(fen, ['a8' as never]);
    expect(out).toBeTruthy();
    const c = new Chess(out!);
    expect(c.get('a8' as never)).toBeFalsy();            // moved off the corner
    let found = false;
    for (const row of c.board()) for (const cell of row) if (cell?.type === 'n') found = true;
    expect(found).toBe(true);                             // still on the board somewhere
    expect(c.turn()).toBe('b');                           // side-to-move preserved
  });
});

describe('explainEvalByPieceQuality', () => {
  it('proves a single bad piece by ablation when improving it swings the eval', async () => {
    const fen = 'n2rk3/3ppp2/8/8/8/8/3PPP2/3RK3 w - - 0 1'; // black knight buried on a8
    // White is better the WORSE black's knight is placed → improving it swings
    // hard toward Black. Pure function of the knight's mobility.
    const evaluate: Evaluate = async (f) => {
      const sq = blackPieceSquare(f, 'n');
      const mob = sq ? pieceMobility(f, sq as never) : 4;
      return { cp: 150 - 40 * mob };
    };
    const res = await explainEvalByPieceQuality(fen, evaluate);
    expect(res).toBeTruthy();
    expect(res!.favored).toBe('w');                       // white better as-is
    expect(res!.delta).toBeTruthy();
    expect(res!.delta!.kind).toBe('bad-piece');
    expect(res!.delta!.color).toBe('b');
    expect(res!.delta!.squares).toEqual(['a8']);
    expect(res!.delta!.pieces).toEqual(['n']);
    expect(res!.delta!.ablation.swingCp).toBeGreaterThanOrEqual(120);
    expect(res!.delta!.text).toContain('a8');
  });

  it('names TWO pieces (the knight AND bishop) when the pair is the story', async () => {
    const fen = 'n3k2b/3pppp1/8/8/8/8/3PPP2/3RK3 w - - 0 1'; // knight a8 + bishop h8, both dead
    const evaluate: Evaluate = async (f) => {
      const nSq = blackPieceSquare(f, 'n');
      const bSq = blackPieceSquare(f, 'b');
      const nMob = nSq ? pieceMobility(f, nSq as never) : 4;
      const bMob = bSq ? pieceMobility(f, bSq as never) : 6;
      return { cp: 150 - 22 * (nMob + bMob) };
    };
    const res = await explainEvalByPieceQuality(fen, evaluate);
    expect(res!.delta).toBeTruthy();
    expect(res!.delta!.color).toBe('b');
    expect(res!.delta!.squares.sort()).toEqual(['a8', 'h8']);
    expect(res!.delta!.pieces.sort()).toEqual(['b', 'n']);
    expect(res!.delta!.ablation.swingCp).toBeGreaterThanOrEqual(180);
    expect(res!.delta!.text).toContain('a8');
    expect(res!.delta!.text).toContain('h8');
  });

  it('stays SILENT (delta null) when improving the piece barely moves the eval', async () => {
    const fen = 'n2rk3/3ppp2/8/8/8/8/3PPP2/3RK3 w - - 0 1';
    const evaluate: Evaluate = async () => ({ cp: 20 }); // flat regardless of placement
    const res = await explainEvalByPieceQuality(fen, evaluate);
    expect(res).toBeTruthy();
    expect(res!.delta).toBeNull();                        // nothing proven → say nothing
  });

  it('returns null on a terminal position and on a malformed FEN', async () => {
    const mate = 'k1R5/8/1K6/8/8/8/8/8 b - - 0 1';
    expect(new Chess(mate).isCheckmate()).toBe(true);
    expect(await explainEvalByPieceQuality(mate, async () => ({ cp: 0 }))).toBeNull();
    expect(await explainEvalByPieceQuality('not a fen', async () => ({ cp: 0 }))).toBeNull();
  });
});
