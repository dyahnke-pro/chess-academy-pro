/**
 * PATTERN · KING AND ROOK AGAINST KING — held to real boards from real games (each fixture
 * names its source, game, ply and move). Fixtures were picked by the miner's
 * own scan (`scripts/patterns/`), never written from memory: every board is
 * replayed here from the board before it by the game's own move.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { isLegalBoard, type LastMove } from './board';
import { KR_BOX_MATE } from './kr-box-mate';

interface Fixture { fen: string; side: 'w' | 'b'; before: string; uci: string; from: string }
interface Twin extends Fixture { missing: string }

const POSITIVES: Fixture[] = [
  { fen: '6K1/8/8/3k4/8/8/4R3/8 b - - 0 87', side: 'w', before: '6rK/8/8/3k4/8/8/4R3/8 w - - 0 87', uci: 'h8g8', from: 'model-games mg-lichess-BfvmTiCI ply 173 (Kxg8)' },
  { fen: '6K1/8/8/3k4/8/8/4R3/8 b - - 0 87', side: 'w', before: '6rK/8/8/3k4/8/8/4R3/8 w - - 0 87', uci: 'h8g8', from: 'model-games mg-vienna-nakamura ply 173 (Kxg8)' },
  { fen: '8/8/8/4k3/6R1/6K1/8/8 b - - 0 80', side: 'w', before: '8/8/8/4k3/6pR/6K1/8/8 w - - 28 80', uci: 'h4g4', from: 'model-games mg-pro-aman-open-sicilian-classical-nc6-2 ply 159 (Rxg4)' },
];

const TWINS: Twin[] = [
  { fen: '6rK/8/8/3k4/8/8/4R3/8 w - - 0 87', side: 'w', before: 'r5QK/8/8/3k4/8/8/4R3/8 b - - 0 86', uci: 'a8g8', from: 'model-games mg-lichess-BfvmTiCI ply 172 (Rxg8+)', missing: 'extra-material' },
  { fen: '8/5p2/2K5/4k3/8/7R/8/8 b - - 0 59', side: 'w', before: '8/5p2/2K5/4k3/8/2R4p/8/8 w - - 0 59', uci: 'c3h3', from: 'model-games mg-lichess-SivhQWtT ply 117 (Rxh3)', missing: 'extra-material' },
  { fen: '1r6/2K5/8/2k5/8/8/8/8 w - - 0 59', side: 'b', before: '1Q6/2K5/8/2k5/1r6/8/8/8 b - - 0 58', uci: 'b4b8', from: 'lichess vb3w3rmn ply 116 (Rxb8)', missing: 'rook-hangs' },
  { fen: '8/5K2/3k4/4R3/8/8/8/8 b - - 12 65', side: 'w', before: '8/8/3k1K2/4R3/8/8/8/8 w - - 11 65', uci: 'f6f7', from: 'lichess ob0zf03h ply 129 (Kf7)', missing: 'rook-hangs' },
  { fen: '7k/8/7K/6R1/8/8/8/8 b - - 44 89', side: 'w', before: '7k/8/8/6RK/8/8/8/8 w - - 43 89', uci: 'h5h6', from: 'lichess zozrprlr ply 177 (Kh6)', missing: 'stalemate' },
];

/** The board and the move that made it, replayed by chess.js. */
function replay(f: Fixture): { fen: string; last: LastMove } {
  const c = new Chess(f.before);
  const m = c.move({ from: f.uci.slice(0, 2), to: f.uci.slice(2, 4), promotion: f.uci[4] });
  return { fen: c.fen(), last: { to: m.to, ...(m.captured ? { captured: m.captured } : {}) } };
}

const read = (f: Fixture): boolean => {
  const { fen, last } = replay(f);
  return KR_BOX_MATE.presentAfter ? KR_BOX_MATE.presentAfter(fen, last, f.side) : KR_BOX_MATE.present(fen, f.side);
};
const misses = (f: Fixture): readonly string[] => {
  const { fen, last } = replay(f);
  return KR_BOX_MATE.nearMissesAfter ? KR_BOX_MATE.nearMissesAfter(fen, last, f.side) : KR_BOX_MATE.nearMisses(fen, f.side);
};

describe('pattern · kr-box-mate', () => {
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
    expect([...new Set(TWINS.map((t) => t.missing))].sort()).toEqual([...KR_BOX_MATE.nearMissCodes]);
  });

  it('the twins it ships are real boards that read false for both sides', () => {
    expect(KR_BOX_MATE.failTwins.length).toBeGreaterThan(0);
    for (const fen of KR_BOX_MATE.failTwins) {
      expect(TWINS.some((t) => t.fen === fen), fen).toBe(true);
      expect(KR_BOX_MATE.present(fen, 'w') || KR_BOX_MATE.present(fen, 'b'), fen).toBe(false);
    }
  });
});
