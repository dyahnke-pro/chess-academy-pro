/**
 * PATTERN · FREE PIECE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoardForTest, VALUE, type LastMove } from './board';
import type { Square } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { FREE_PIECE, LEAD_BAR, freeSquares, midExchange, takingHolds } from './free-piece';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'r1b1r1k1/1pp1qppn/pb1pN3/3P2PQ/2B5/2N5/PP4PP/R4R1K b - - 2 18', side: 'b', before: 'r1b1r1k1/1pp1qppn/pb1pN3/3P2P1/2B5/2N5/PP4PP/R2Q1R1K w - - 1 18', uci: 'd1h5', from: 'david chesscom-10690975 ply 35 (Qh5)' },
  { fen: '8/p7/1p6/2p1b3/P1P5/1K6/5kBp/8 b - - 0 53', side: 'b', before: '8/p7/1pB5/2p1b3/P1P5/1K6/5kpp/8 w - - 0 53', uci: 'c6g2', from: 'david chesscom-10967345 ply 105 (Bxg2)' },
  { fen: '8/8/7p/2p3bP/6P1/8/K2kB3/8 b - - 0 69', side: 'b', before: '8/8/7p/1Bp3bP/6P1/8/K2kp3/8 w - - 0 69', uci: 'b5e2', from: 'david chesscom-11164369 ply 137 (Bxe2)' },
];

const TWINS: Twin[] = [
  { fen: 'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2BNP3/2N5/PP3PPP/R2Q1RK1 b - - 2 11', side: 'b', before: 'rnbqr1k1/ppp2ppp/1b1p1n2/3P2B1/2B1P3/2N2N2/PP3PPP/R2Q1RK1 w - - 1 11', uci: 'f3d4', from: 'david chesscom-10690975 ply 21 (Nd4)', missing: 'guarded' },
  { fen: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3BB3/PPP2PPP/RN1Q1RK1 b kq - 3 7', side: 'b', before: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7', uci: 'c1e3', from: 'david chesscom-10697961 ply 13 (Be3)', missing: 'guarded' },
  { fen: 'r2k3r/1pp2Q2/pb1pbRB1/8/8/2N5/PP4PP/7K w - - 0 27', side: 'w', before: 'r1bk3r/1pp2Q2/pb1pPRB1/8/8/2N5/PP4PP/7K b - - 0 26', uci: 'c8e6', from: 'david chesscom-10690975 ply 52 (Bxe6)', missing: 'mid-exchange' },
  { fen: 'Q7/8/1k6/3b4/8/5B2/6PK/8 w - - 0 53', side: 'w', before: 'Q7/8/1Pk5/3b4/8/5B2/6PK/8 b - - 0 52', uci: 'c6b6', from: 'david chesscom-10697961 ply 104 (Kxb6)', missing: 'mid-exchange' },
  { fen: 'rn1qr1k1/ppp2ppp/1b1pbn2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 w - - 5 10', side: 'b', before: 'rnbqr1k1/ppp2ppp/1b1p1n2/6B1/2BPP3/2N2N2/PP3PPP/R2Q1RK1 b - - 4 9', uci: 'c8e6', from: 'david chesscom-10690975 ply 18 (Be6)', missing: 'not-their-move' },
  { fen: 'r1bqkb1r/pp2pp1p/2np1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 w kq - 2 7', side: 'b', before: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/3B4/PPP2PPP/RNBQ1RK1 b kq - 1 6', uci: 'b8c6', from: 'david chesscom-10697961 ply 12 (Nc6)', missing: 'not-their-move' },
  { fen: '6r1/p3R3/1p6/2pB2p1/2Pb1k2/PK6/7p/8 w - - 0 45', side: 'w', before: '6r1/p3R3/1p6/2pB2p1/2Pb1k2/PK5p/8/8 b - - 1 44', uci: 'h3h2', from: 'david chesscom-10967345 ply 88 (h2)', missing: 'poisoned' },
  { fen: 'rn1q1rk1/ppp1bppp/8/4p2b/2B1N3/2NP1P2/PPn3QP/R1B1K1R1 w Q - 0 13', side: 'w', before: 'rn1q1rk1/ppp1bppp/8/4p2b/2BnN3/2NP1P2/PPP3QP/R1B1K1R1 b Q - 9 12', uci: 'd4c2', from: 'david chesscom-134198344361 ply 24 (Nxc2+)', missing: 'poisoned' },
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
      expect(isLegalBoardForTest(f.before), f.from).toBe(true);
      expect(isLegalBoardForTest(f.fen), f.from).toBe(true);
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

  it('a poisoned twin nets the piece, but taking it does not hold', () => {
    const poisoned = TWINS.filter((t) => t.missing === 'poisoned');
    expect(poisoned.length).toBeGreaterThan(0);
    for (const t of poisoned) {
      const { fen, last } = replay(t);
      const took = last.captured ? VALUE[last.captured] : 0;
      expect(midExchange(fen, t.side), t.from).toBe(false);
      expect(freeSquares(fen, t.side, last), t.from).toEqual([]);
      // Some enemy piece the SEE nets 3 on, paid for — yet taking it fails clause 5.
      const board = new Chess(fen);
      const poison = board.board().flat().filter((c) => !!c && c.color !== t.side && ['n', 'b', 'r'].includes(c.type))
        .map((c) => c?.square as Square)
        .filter((sq) => legalSeeGainFor(fen, sq, t.side) >= 3 && legalSeeGainFor(fen, sq, t.side) - took >= LEAD_BAR);
      expect(poison.length, t.from).toBeGreaterThan(0);
      for (const sq of poison) expect(takingHolds(fen, t.side, sq, legalSeeGainFor(fen, sq, t.side) - took), `${t.from} ${sq}`).toBe(false);
    }
  });

  it('from the board alone it is never looser than with the move', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      if (FREE_PIECE.present(f.fen, f.side)) expect(read(f), f.from).toBe(true);
    }
  });
});
