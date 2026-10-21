/**
 * PATTERN · PIN — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { PIN } from './pin';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'rn3rk1/p3qpp1/1p2b2p/2pp4/3P4/Q3PN2/PP3PPP/2R1KB1R b K - 1 13', side: 'w', before: 'rn3rk1/p3qpp1/1p2b2p/2pp4/Q2P4/4PN2/PP3PPP/2R1KB1R w K - 0 13', uci: 'a4a3', from: 'model-games mg-fischer-spassky-g6 ply 25 (Qa3)' },
  { fen: 'r1b1k2r/3qbppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B1R1K1 b kq - 5 13', side: 'w', before: 'r1b1k2r/3qbppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 w kq - 4 13', uci: 'f1e1', from: 'model-games mg-fischer-petrosian ply 25 (Re1)' },
  { fen: 'r1bq1rk1/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w - - 2 8', side: 'w', before: 'r1bqk2r/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 b kq - 1 7', uci: 'e8g8', from: 'model-games mg-capablanca-marshall ply 14 (O-O)' },
];

const TWINS: Twin[] = [
  { fen: '1nr3k1/r3qpp1/p3b2p/1Bpp4/8/Q3PN2/PP3PPP/2R2RK1 w - - 2 17', side: 'w', before: 'rnr3k1/4qpp1/p3b2p/1Bpp4/8/Q3PN2/PP3PPP/2R2RK1 b - - 1 16', uci: 'a8a7', from: 'model-games mg-fischer-spassky-g6 ply 32 (Ra7)', missing: 'no-bites' },
  { fen: 'r1bqkb1r/5ppp/p1p1pn2/3P4/4P3/3B4/PP3PPP/RNBQ1RK1 b kq - 0 9', side: 'b', before: 'r1bqkb1r/5ppp/p1p1pn2/3p4/2P1P3/3B4/PP3PPP/RNBQ1RK1 w kq - 1 9', uci: 'c4d5', from: 'model-games mg-fischer-petrosian ply 17 (cxd5)', missing: 'no-bites' },
  { fen: 'rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/R2QKB1R w KQ - 0 11', side: 'b', before: 'rnb2rk1/p1p1qpp1/1p2p2p/3N4/3P4/4PN2/PP3PPP/R2QKB1R b KQ - 0 10', uci: 'e6d5', from: 'model-games mg-fischer-spassky-g6 ply 20 (exd5)', missing: 'no-can-leave' },
  { fen: 'r1bqk2r/4bppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 b kq - 3 12', side: 'w', before: 'r1bqk2r/4bppp/p4n2/3p4/8/2NB4/PP3PPP/R1BQ1RK1 w kq - 2 12', uci: 'd1a4', from: 'model-games mg-fischer-petrosian ply 23 (Qa4+)', missing: 'no-can-leave' },
  { fen: 'rnbq1rk1/p1p1bpp1/1p2p2p/3n4/3P3B/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 9', side: 'w', before: 'rnbq1rk1/p1p1bpp1/1p2pn1p/3P4/3P3B/2N1PN2/PP3PPP/R2QKB1R b KQ - 0 8', uci: 'f6d5', from: 'model-games mg-fischer-spassky-g6 ply 16 (Nxd5)', missing: 'no-cannot-take' },
  { fen: 'r1b1k2r/3qbppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 w kq - 4 13', side: 'w', before: 'r1bqk2r/4bppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 b kq - 3 12', uci: 'd8d7', from: 'model-games mg-fischer-petrosian ply 24 (Qd7)', missing: 'no-cannot-take' },
  { fen: 'r2qk2r/pp1b1ppp/2n5/1B1N4/3b4/4P3/PP3PPP/R2QK2R w KQkq - 0 12', side: 'b', before: 'r2qk2r/pp1b1ppp/2n2b2/1B1N4/3N4/4P3/PP3PPP/R2QK2R b KQkq - 0 11', uci: 'f6d4', from: 'model-games mg-rubinstein-four-knights-game ply 22 (Bxd4)', missing: 'no-not-hanging' },
  { fen: '4r1k1/3b1pB1/1b1p1Qn1/1p1P4/1p2P3/5NNP/2q2PP1/4R1K1 b - - 0 25', side: 'w', before: '4r1k1/3b1pB1/1b1p1nn1/1p1P4/1p2P3/5NNP/2q2PP1/Q3R1K1 w - - 0 25', uci: 'a1f6', from: 'model-games mg-lichess-8I2YuiTC ply 49 (Qxf6)', missing: 'no-not-hanging' },
  { fen: '3q3k/2r1r1pn/4P2p/p1p2R2/2Bp3P/1P4Q1/P5P1/5RK1 w - - 1 32', side: 'w', before: '3q3k/1r2r1pn/4P2p/p1p2R2/2Bp3P/1P4Q1/P5P1/5RK1 b - - 0 31', uci: 'b7c7', from: 'model-games mg-fischer-spassky-g6 ply 62 (Rbc7)', missing: 'no-worth-more' },
  { fen: 'r4rk1/4bppp/p3bn2/2Bp4/N7/3B4/PP3PPP/R3R1K1 b - - 4 16', side: 'w', before: 'r4rk1/4bppp/p3bn2/3p4/N7/3BB3/PP3PPP/R3R1K1 w - - 3 16', uci: 'e3c5', from: 'model-games mg-fischer-petrosian ply 31 (Bc5)', missing: 'no-worth-more' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return PIN.presentAfter ? PIN.presentAfter(fen, last, f.side) : PIN.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return PIN.nearMissesAfter ? PIN.nearMissesAfter(fen, last, f.side) : PIN.nearMisses(fen, f.side);
};

describe('pattern · pin', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...PIN.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(PIN.failTwins.length).toBeGreaterThan(0);
    for (const fen of PIN.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(PIN.present(fen, 'w') || PIN.present(fen, 'b'), fen).toBe(false);
    }
  });
});
