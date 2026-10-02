// Review says what Learn says (David 2026-09-30: "Focus on review and the
// missing teachings"): the line behind a winning move, and a verdict on their
// opening choice when it leaves the masters' book at a cost.
import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';
import { __setLocalDbForTests } from './masterPlayLookup';
import { masterPlayCache } from './masterPlayCache';

// 1.e4 e5 2.Nf3 f6? 3.Nxe5 — the Damiano. Masters answer 2.Nf3 with …Nc6.
const SANS = ['e4', 'e5', 'Nf3', 'f6', 'Nxe5'];
const EVALS: Array<[number, number]> = [[0, 30], [30, 30], [30, 30], [30, 120], [120, 150]];
const LINE = ['f3e5', 'f6e5', 'd1h5', 'g7g6', 'h5e5', 'd8e7', 'e5h8'];

function seedBook(): void {
  masterPlayCache.clear();
  const positions: Record<string, Array<{ san: string; games: number }>> = {};
  const b = new Chess();
  SANS.forEach((san, i) => {
    positions[b.fen().split(' ').slice(0, 4).join(' ')] = i === 3 ? [{ san: 'Nc6', games: 900 }, { san: 'd6', games: 200 }] : [{ san, games: 500 }];
    b.move(san);
  });
  __setLocalDbForTests({ positions } as unknown as Parameters<typeof __setLocalDbForTests>[0]);
}

function inputs(): ReviewMoveInput[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    return {
      ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1,
      classification: i === 4 ? 'great' : 'book',
      preMoveEval: EVALS[i][0], evaluation: EVALS[i][1],
      bestMove: i === 4 ? 'f3e5' : null,
      ...(i === 4 ? { pv: { afterPlayed: LINE.slice(1), afterBest: LINE.slice(1) } } : {}),
    } as ReviewMoveInput;
  });
}

describe('review carries the two Learn teachings', () => {
  afterEach(() => __setLocalDbForTests(null));

  it('their costly departure from book gets a verdict', () => {
    seedBook();
    const segs = buildReviewSegments(inputs(), 'white', "Damiano Defense", true, 1200, [], coldStudent(1200), 'g');
    expect(segs.find((s) => s.ply === 4)?.narration ?? '').toMatch(/dubious choice — the knight to c6 is the move here/);
  });

  it('the winning move plays its line out, drawn', () => {
    seedBook();
    const segs = buildReviewSegments(inputs(), 'white', "Damiano Defense", true, 1200, [], coldStudent(1200), 'g');
    const ply5 = segs.find((s) => s.ply === 5);
    expect(ply5?.narration ?? '').toMatch(/That wins [^:]+: Nxe5 …fxe5 Qh5\+ …g6 Qxe5\+ …Qe7 Qxh8\./);
  });
});

describe('review plays a mating line out as the mate', () => {
  it('Légal: 5.Nxe5 — "It is a forced mate: Nxe5 …Bxd1 Bxf7+ …Ke7 Nd5#."', () => {
    const sans = ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5'];
    const c = new Chess();
    const inp = sans.map((san, i) => {
      c.move(san);
      const last = i === sans.length - 1;
      return {
        ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: last ? 'great' : 'book',
        preMoveEval: 30, evaluation: 30, bestMove: last ? 'f3e5' : null,
        ...(last ? { pv: { afterPlayed: ['g4d1', 'c4f7', 'e8e7', 'c3d5'], afterBest: ['g4d1', 'c4f7', 'e8e7', 'c3d5'] } } : {}),
      } as ReviewMoveInput;
    });
    const segs = buildReviewSegments(inp, 'white', "Philidor Defense", true, 1200, [], coldStudent(1200), 'g');
    expect(segs.find((s) => s.ply === 9)?.narration ?? '').toContain('It is a forced mate: Nxe5 …Bxd1 Bxf7+ …Ke7 Nd5#.');
  });
});
