/**
 * PATTERN · FREE PIECE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { FREE_PIECE, freeSquares } from './free-piece';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'rnr3k1/4qpp1/pp2b2p/1BPp4/8/Q3PN2/PP3PPP/2R1K2R b K - 0 15', side: 'b', before: 'rnr3k1/4qpp1/pp2b2p/1Bpp4/3P4/Q3PN2/PP3PPP/2R1K2R w K - 0 15', uci: 'd4c5', from: 'model-games mg-fischer-spassky-g6 ply 29 (dxc5)' },
  { fen: 'r1bq1rk1/2p2ppp/p2b4/1p6/6n1/1BP4P/PP1P1PP1/RNBQR1K1 w - - 1 14', side: 'w', before: 'r1bq1rk1/2p2ppp/p2b1n2/1p6/8/1BP4P/PP1P1PP1/RNBQR1K1 b - - 0 13', uci: 'f6g4', from: 'model-games mg-capablanca-marshall ply 26 (Ng4)' },
  { fen: '2r1r3/5pk1/6bp/8/Np1qnRP1/1P1n2P1/3Q2BP/1N1R3K w - - 5 34', side: 'w', before: '2r1r3/5pk1/5nbp/8/Np1q1RP1/1P1n2P1/3Q2BP/1N1R3K b - - 4 33', uci: 'f6e4', from: 'model-games mg-kasparov-karpov-wch85 ply 66 (Ne4)' },
];

const TWINS: Twin[] = [
  { fen: 'rnbq1rk1/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R w KQ - 5 6', side: 'w', before: 'rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N2N2/PP2PPPP/R2QKB1R b KQkq - 4 5', uci: 'e8g8', from: 'model-games mg-fischer-spassky-g6 ply 10 (O-O)', missing: 'guarded' },
  { fen: 'r1bqkbnr/1p1p1ppp/p1n1p3/8/3NP3/3B4/PPP2PPP/RNBQK2R w KQkq - 2 6', side: 'w', before: 'rnbqkbnr/1p1p1ppp/p3p3/8/3NP3/3B4/PPP2PPP/RNBQK2R b KQkq - 1 5', uci: 'b8c6', from: 'model-games mg-fischer-petrosian ply 10 (Nc6)', missing: 'guarded' },
  { fen: 'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9', side: 'b', before: 'rnbq1rk1/p1p1bpp1/1p2pn1p/3P4/3P3B/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 8', uci: 'f6d5', from: 'model-games mg-fischer-spassky-g6 ply 16 (Nxd5)', missing: 'not-their-move' },
  { fen: 'r1bqkbnr/1p1p1ppp/p1n1p3/8/3NP3/3B4/PPP2PPP/RNBQK2R w KQkq - 2 6', side: 'b', before: 'rnbqkbnr/1p1p1ppp/p3p3/8/3NP3/3B4/PPP2PPP/RNBQK2R b KQkq - 1 5', uci: 'b8c6', from: 'model-games mg-fischer-petrosian ply 10 (Nc6)', missing: 'not-their-move' },
  { fen: 'rnbq1rk1/p1p1Bpp1/1p2p2p/3n4/3P4/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 9', side: 'b', before: 'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9', uci: 'h4e7', from: 'model-games mg-fischer-spassky-g6 ply 17 (Bxe7)', missing: 'recapture' },
  { fen: 'r1bqkbnr/1p1p1ppp/p1N1p3/8/4P3/3B4/PPP2PPP/RNBQK2R b KQkq - 0 6', side: 'b', before: 'r1bqkbnr/1p1p1ppp/p1n1p3/8/3NP3/3B4/PPP2PPP/RNBQK2R w KQkq - 2 6', uci: 'd4c6', from: 'model-games mg-fischer-petrosian ply 11 (Nxc6)', missing: 'recapture' },
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

  it('a recapture twin is exactly the old defect: the SEE alone calls the piece free', () => {
    const recaptures = TWINS.filter((t) => t.missing === 'recapture');
    expect(recaptures.length).toBeGreaterThan(0);
    for (const t of recaptures) {
      const { fen, last } = replay(t);
      expect(freeSquares(fen, t.side, null)).toContain(last.to);
      expect(freeSquares(fen, t.side, last)).not.toContain(last.to);
    }
  });

  it('from the board alone it is never looser than with the move', () => {
    for (const f of [...POSITIVES, ...TWINS]) {
      if (FREE_PIECE.present(f.fen, f.side)) expect(read(f), f.from).toBe(true);
    }
  });
});
