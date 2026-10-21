/**
 * PATTERN · FREE PIECE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { FREE_PIECE, freeSquares, midExchange } from './free-piece';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'r1b1r1k1/1pp1qppn/pb1pN3/3P2PQ/2B5/2N5/PP4PP/R4R1K b - - 2 18', side: 'b', before: 'r1b1r1k1/1pp1qppn/pb1pN3/3P2P1/2B5/2N5/PP4PP/R2Q1R1K w - - 1 18', uci: 'd1h5', from: 'david chesscom-10690975 ply 35 (Qh5)' },
  { fen: '6r1/p3R3/1p6/2pB2p1/2Pb1k2/PK6/7p/8 w - - 0 45', side: 'w', before: '6r1/p3R3/1p6/2pB2p1/2Pb1k2/PK5p/8/8 b - - 1 44', uci: 'h3h2', from: 'david chesscom-10967345 ply 88 (h2)' },
  { fen: '8/8/7p/2p3bP/6P1/8/K2kB3/8 b - - 0 69', side: 'b', before: '8/8/7p/1Bp3bP/6P1/8/K2kp3/8 w - - 0 69', uci: 'b5e2', from: 'david chesscom-11164369 ply 137 (Bxe2)' },
];

const TWINS: Twin[] = [
  { fen: 'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2BNP3/2N5/PP3PPP/R2Q1RK1 b - - 2 11', side: 'b', before: 'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2B1P3/2N2N2/PP3PPP/R2Q1RK1 w - - 1 11', uci: 'f3d4', from: 'david chesscom-10690975 ply 21 (Nd4)', missing: 'guarded' },
  { fen: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3BB3/PPP2PPP/RN1Q1RK1 b kq - 3 7', side: 'b', before: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7', uci: 'c1e3', from: 'david chesscom-10697961 ply 13 (Be3)', missing: 'guarded' },
  { fen: 'r1b1r1k1/1pp1qpp1/pb1pNn2/3P2P1/2B5/2N5/PP4PP/R2Q1R1K b - - 0 17', side: 'b', before: 'r1b1r1k1/1pp1qpp1/pb1pNn2/3P2p1/2B2P2/2N5/PP4PP/R2Q1R1K w - - 0 17', uci: 'f4g5', from: 'david chesscom-10690975 ply 33 (fxg5)', missing: 'mid-exchange' },
  { fen: '8/6k1/4b1p1/1B1rR2p/1P6/P6P/6PK/8 w - - 1 40', side: 'w', before: '8/6k1/4b1p1/1B2R2p/1P6/P6P/6PK/3r4 b - - 0 39', uci: 'd1d5', from: 'david chesscom-10697961 ply 78 (Rd5)', missing: 'mid-exchange' },
  { fen: 'rn1qr1k1/ppp2ppp/1b1pbn2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 w - - 5 10', side: 'b', before: 'rnbqr1k1/ppp2ppp/1b1p1n2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 b - - 4 9', uci: 'c8e6', from: 'david chesscom-10690975 ply 18 (Be6)', missing: 'not-their-move' },
  { fen: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7', side: 'b', before: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 b kq - 1 6', uci: 'b8c6', from: 'david chesscom-10697961 ply 12 (Nc6)', missing: 'not-their-move' },
  { fen: 'r2qkbr1/pp2pp1p/3p1np1/8/3nP1b1/2NBB3/PPPQ1PPP/R4RK1 w q - 0 10', side: 'w', before: 'r2qkbr1/pp2pp1p/2np1np1/8/3NP1b1/2NBB3/PPPQ1PPP/R4RK1 b q - 7 9', uci: 'c6d4', from: 'david chesscom-10697961 ply 18 (Nxd4)', missing: 'recapture' },
  { fen: '1r4k1/pp3p1p/6p1/2pB4/2P2PR1/8/Pb3P2/4rK2 w - - 0 28', side: 'w', before: '1r4k1/pp2rp1p/6p1/2pB4/2P2PR1/8/Pb3P2/4RK2 b - - 1 27', uci: 'e7e1', from: 'david chesscom-10967345 ply 54 (Rxe1+)', missing: 'recapture' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return FREE_PIECE.presentAfter ? FREE_PIECE.presentAfter(fen, last, f.side) : FREE_PIECE.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return FREE_PIECE.nearMissesAfter ? FREE_PIECE.nearMissesAfter(fen, last, f.side) : FREE_PIECE.nearMisses(fen, f.side);
};

describe('pattern · free-piece', () => {
  it('every fixture is a legal board, reached by a legal move from the board before it', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      expect(isLegalBoard(f.before), f.from).toBe(true);
      expect(isLegalBoard(f.fen), f.from).toBe(true);
      expect(replay(f).fen, f.from).toBe(f.fen);
    }
  });

  it('is present on the real boards where it arose', () => {
    expect(POSITIVES.length).toBeGreaterThan(0);
    for (const f of POSITIVES) expect(read(f), f.from).toBe(true);
  });

  it('every fail twin reads false and names its one missing condition', () => {
    for (const t of TWINS) {
      expect(read(t), t.from).toBe(false);
      expect(misses(t), t.from).toContain(t.missing);
    }
  });

  it('has a fail twin for every near miss it can name', () => {
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...FREE_PIECE.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(FREE_PIECE.failTwins.length).toBeGreaterThan(0);
    for (const fen of FREE_PIECE.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(FREE_PIECE.present(fen, 'w') || FREE_PIECE.present(fen, 'b'), fen).toBe(false);
    }
  });

  it('a recapture twin is exactly the old defect: the SEE alone calls a piece free', () => {
    const recaptures = TWINS.filter((t) => t.missing === 'recapture');
    expect(recaptures.length).toBeGreaterThan(0);
    for (const t of recaptures) {
      const { fen, last } = replay(t);
      expect(last.captured, t.from).toBeDefined();
      expect(freeSquares(fen, t.side, null).length, t.from).toBeGreaterThan(0);
      expect(freeSquares(fen, t.side, last), t.from).toEqual([]);
    }
  });

  it('a mid-exchange twin nets the piece but leaves something of its own to be won', () => {
    const mids = TWINS.filter((t) => t.missing === 'mid-exchange');
    expect(mids.length).toBeGreaterThan(0);
    for (const t of mids) {
      const { fen, last } = replay(t);
      expect(freeSquares(fen, t.side, last).length, t.from).toBeGreaterThan(0);
      expect(midExchange(fen, t.side), t.from).toBe(true);
    }
  });

  it('from the board alone it is never looser than with the move', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      if (FREE_PIECE.present(f.fen, f.side)) expect(read(f), f.from).toBe(true);
    }
  });
});
