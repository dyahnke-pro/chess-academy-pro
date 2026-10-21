/**
 * PATTERN · CONNECTED ROOKS — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { CONNECT_ROOKS } from './connect-rooks';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: 'rnr3k1/4qpp1/p3b2p/1Bpp4/8/Q3PN2/PP3PPP/2R2RK1 b - - 1 16', side: 'w', before: 'rnr3k1/4qpp1/p3b2p/1Bpp4/8/Q3PN2/PP3PPP/2R1K2R w K - 0 16', uci: 'e1g1', from: 'model-games mg-fischer-spassky-g6 ply 31 (O-O)' },
  { fen: 'r3k2r/4bppp/p3bn2/3p4/N7/3BB3/PP3PPP/R3R1K1 b kq - 2 15', side: 'w', before: 'r3k2r/4bppp/p3bn2/3p4/N7/3B4/PP3PPP/R1B1R1K1 w kq - 1 15', uci: 'c1e3', from: 'model-games mg-fischer-petrosian ply 29 (Be3)' },
  { fen: 'r4rk1/2p2ppp/p2b4/1p6/3P2bq/1BP2Q1P/PP2RnP1/RNB3K1 w - - 2 17', side: 'b', before: 'r1b2rk1/2p2ppp/p2b4/1p6/3P3q/1BP2Q1P/PP2RnP1/RNB3K1 b - - 1 16', uci: 'c8g4', from: 'model-games mg-capablanca-marshall ply 32 (Bg4)' },
];

const TWINS: Twin[] = [
  { fen: 'rn3rk1/p1p1qpp1/1p2b2p/3p4/3P4/4PN2/PP3PPP/2RQKB1R w K - 2 12', side: 'b', before: 'rnb2rk1/p1p1qpp1/1p5p/3p4/3P4/4PN2/PP3PPP/2RQKB1R b K - 1 11', uci: 'c8e6', from: 'model-games mg-fischer-spassky-g6 ply 22 (Be6)', missing: 'one-piece-between' },
  { fen: 'r1bqk2r/4bppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 b kq - 3 12', side: 'w', before: 'r1bqk2r/4bppp/p4n2/3p4/8/2NB4/PP3PPP/R1BQ1RK1 w kq - 2 12', uci: 'd1a4', from: 'model-games mg-fischer-petrosian ply 23 (Qa4+)', missing: 'one-piece-between' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return CONNECT_ROOKS.presentAfter ? CONNECT_ROOKS.presentAfter(fen, last, f.side) : CONNECT_ROOKS.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return CONNECT_ROOKS.nearMissesAfter ? CONNECT_ROOKS.nearMissesAfter(fen, last, f.side) : CONNECT_ROOKS.nearMisses(fen, f.side);
};

describe('pattern · connect-rooks', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...CONNECT_ROOKS.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(CONNECT_ROOKS.failTwins.length).toBeGreaterThan(0);
    for (const fen of CONNECT_ROOKS.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(CONNECT_ROOKS.present(fen, 'w') || CONNECT_ROOKS.present(fen, 'b'), fen).toBe(false);
    }
  });
});
