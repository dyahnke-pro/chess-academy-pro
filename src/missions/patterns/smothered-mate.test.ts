/**
 * PATTERN · SMOTHERED MATE — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { SMOTHERED_MATE } from './smothered-mate';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: '6rk/p5bp/3N4/5p2/2P3bP/1r1n1N2/6P1/B2R1R1K w - - 2 49', side: 'w', before: '6rk/pr4bp/3N4/5p2/2P3bP/3n1N2/6P1/B2R1R1K b - - 1 48', uci: 'b7b3', from: 'model-games mg-pro-hikaru-reti-vs-d5 ply 96 (Rb3)' },
  { fen: 'r5k1/pQp5/3p3p/8/6b1/2P3Pn/P5PP/6RK b - - 0 24', side: 'b', before: 'r5k1/pQp5/3p3p/8/6b1/2P3Pn/P5PP/5RqK w - - 5 24', uci: 'f1g1', from: 'model-games mg-pro-samayraina-open-e5-x5 ply 47 (Rxg1)' },
  { fen: '2B2r1k/Q6P/8/p3p1n1/8/np2P3/PP3PP1/KR5R b - - 0 31', side: 'b', before: '2B2r1k/Q6P/8/p3p1n1/8/np2P3/PP3PP1/Kq1R3R w - - 7 31', uci: 'd1b1', from: 'lichess r58rahyq ply 61 (Rxb1)' },
];

const TWINS: Twin[] = [
  { fen: 'Qq1r1b1r/p1kn2pp/B2p4/2p1p1PP/1p6/2B1N3/PPP2P2/R3K1R1 w Q - 4 21', side: 'w', before: 'Qqkr1b1r/p2n2pp/B2p4/2p1p1PP/1p6/2B1N3/PPP2P2/R3K1R1 b Q - 3 20', uci: 'c8c7', from: 'model-games mg-pro-gothamchess-trompowsky-0 ply 40 (Kc7)', missing: 'flight-covered' },
  { fen: '2b5/R5p1/pr1k1n1p/1p1PN2P/1P1K4/5BP1/1P6/8 w - - 13 61', side: 'w', before: '8/R2b2p1/pr1k1n1p/1p1PN2P/1P1K4/5BP1/1P6/8 b - - 12 60', uci: 'd7c8', from: 'model-games mg-pro-aman-ruy-lopez-berlin-1 ply 120 (Bc8)', missing: 'flight-covered' },
  { fen: '1k1r3r/pp3p2/2nN2p1/3p3n/8/2P2P1q/PPB3QP/R4RBK b - - 0 25', side: 'b', before: '1k1r3r/pp3p2/2nN2p1/3p3n/8/2P2P1q/PPBQ2pP/R4RBK w - - 0 25', uci: 'd2g2', from: 'model-games mg-pro-gothamchess-caro-kann-0 ply 49 (Qxg2)', missing: 'knight-taken' },
  { fen: 'r2qkb1r/1b1npp2/p2p1n1p/1pp2N1P/3PPB2/2N5/PPPQ2P1/R3KB1R w KQkq - 2 14', side: 'w', before: 'r2qk2r/1b1nppb1/p2p1n1p/1pp2N1P/3PPB2/2N5/PPPQ2P1/R3KB1R b KQkq - 1 13', uci: 'g7f8', from: 'model-games mg-pro-gothamchess-pirc-defense-0 ply 26 (Bf8)', missing: 'knight-taken' },
  { fen: 'r1bqkb1r/3pnppp/p1p1p3/4P3/4N3/8/PPP2PPP/R1BQKB1R b KQkq - 2 8', side: 'w', before: 'r1bqkb1r/3pnppp/p1p1p3/4P3/8/2N5/PPP2PPP/R1BQKB1R w KQkq - 1 8', uci: 'c3e4', from: 'model-games mg-pro-caruana-taimanov-otb-b ply 15 (Ne4)', missing: 'not-their-move' },
  { fen: '5Qnk/6pp/p2p4/1p2p1N1/4P2P/8/3P1PPK/2Bq4 b - - 5 26', side: 'w', before: '5Qnk/6pp/p2p4/1p2p1N1/4P2P/8/3P1PP1/2Bq2K1 w - - 4 26', uci: 'g1h2', from: 'david chesscom-914436623 ply 51 (Kh2)', missing: 'not-their-move' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return SMOTHERED_MATE.presentAfter ? SMOTHERED_MATE.presentAfter(fen, last, f.side) : SMOTHERED_MATE.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return SMOTHERED_MATE.nearMissesAfter ? SMOTHERED_MATE.nearMissesAfter(fen, last, f.side) : SMOTHERED_MATE.nearMisses(fen, f.side);
};

describe('pattern · smothered-mate', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...SMOTHERED_MATE.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(SMOTHERED_MATE.failTwins.length).toBeGreaterThan(0);
    for (const fen of SMOTHERED_MATE.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(SMOTHERED_MATE.present(fen, 'w') || SMOTHERED_MATE.present(fen, 'b'), fen).toBe(false);
    }
  });
});
