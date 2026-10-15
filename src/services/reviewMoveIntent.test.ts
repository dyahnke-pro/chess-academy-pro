import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { intentsFromReads } from './reviewMoveIntent';
import type { CachedEval } from './positionEvalCache';

const game = (sans: string[]): { ply: number; san: string; fenAfter: string }[] => {
  const c = new Chess();
  return sans.map((san, i) => { const m = c.move(san); return { ply: i + 1, san: m.san, fenAfter: c.fen() }; });
};

describe('review asks the engine what a clean move was FOR (audits 2026-10-15)', () => {
  const moves = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
  const reads = new Map<number, CachedEval>([
    [4, { evaluation: 30, depth: 18, bestMove: 'f1c4', pv: ['f1c4', 'g8f6', 'e1g1'] }],
    [5, { evaluation: 30, depth: 18, bestMove: 'g8f6', pv: ['g8f6', 'e1g1', 'f8c5'] }],
  ]);
  it('Bc4 clears the way to castle — the follow-up the engine plays', () => {
    const out = intentsFromReads(moves, 'white', reads);
    expect(out.get(5)?.text).toMatch(/castle/);
  });
  it('never on the opponent\'s move, and never without a stored line', () => {
    const out = intentsFromReads(moves, 'black', reads);
    expect(out.size).toBe(0);
    expect(intentsFromReads(moves, 'white', new Map()).size).toBe(0);
  });
});

describe('the intent reaches the review narration', () => {
  it('a clean student move speaks what it is for', { timeout: 60_000 }, async () => {
    const { buildReviewSegments } = await import('./coachFeatureService');
    const moves = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    const inputs = moves.map((m) => ({
      ply: m.ply, san: m.san, isCoachMove: m.ply % 2 === 0, classification: 'good' as const,
      evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: m.fenAfter,
    }));
    const intent = new Map([[5, { text: 'Bc4 clears the way to castle.', squares: ['c4', 'e1', 'g1'] }]]);
    const segs = buildReviewSegments(inputs, 'white', null, true, 1500, [], undefined, null, new Map(), intent);
    const said = segs.find((s) => s.ply === 5)?.narration ?? '';
    expect(said).toContain('clears the way to castle');
    // The reason leads; the description that supports it follows.
    const desc = said.indexOf('joins the fight');
    expect(desc).toBeGreaterThan(said.indexOf('clears the way to castle'));
  });
});

describe('development is a job the follow-up can name (Review audit 2026-10-15)', () => {
  it('…e5 first, so that …Bd6 can bring the bishop into the game', () => {
    const moves = game(['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3', 'd6', 'exd6', 'Qxd6', 'Be2', 'Bg4', 'Nb5', 'Qd7', 'Bf4', 'Nd5', 'Ne5', 'Bxe2', 'Qxe2', 'Nxf4', 'Nxd7', 'Nxe2', 'Nc7+', 'Kxd7', 'Nxa8', 'Nexd4', 'Rd1', 'e5']);
    const reads = new Map<number, CachedEval>([
      [33, { evaluation: -300, depth: 18, bestMove: 'e7e5', pv: ['e7e5', 'e1g1', 'f8d6'] }],
      [34, { evaluation: -300, depth: 18, bestMove: 'e1g1', pv: ['e1g1', 'f8d6', 'f2f4'] }],
    ]);
    expect(intentsFromReads(moves, 'black', reads).get(34)?.text).toBe('You play …e5 first, so that …Bd6 can bring the bishop into the game.');
  });
});

describe('the pass reads give review "what the move stops" (2026-10-15)', () => {
  // Naroditsky's O-O in speedrun 1PI3xfMiUE4: castling defends f2 against
  // …Qxf2. Review stores ONE line per position, so only the top line of each
  // read is used — the same shape the read-ahead writes.
  it('O-O takes …Qxf2 away once the pass reads are stored, and not before', async () => {
    const { nullMoveFen } = await import('./movePurpose');
    const { reviewPassFens } = await import('./reviewMoveIntent');
    const fixture = (await import('./__fixtures__/moveIntent-1PI3xfMiUE4.json')).default as Record<string, { fenBefore: string; san: string; before: { cp: number | null; mate?: number | null; pv: string[] }[]; after: { cp: number | null; mate?: number | null; pv: string[] }[]; passBefore: { cp: number | null; mate?: number | null; pv: string[] }[]; passAfter: { cp: number | null; mate?: number | null; pv: string[] }[] }>;
    const m = fixture['13'];
    const c = new Chess(m.fenBefore);
    const mv = c.move(m.san);
    const fenAfter = c.fen();
    const moves = [{ ply: 12, san: 'e4', fenAfter: m.fenBefore }, { ply: 13, san: mv.san, fenAfter }];
    // Stored the way the read-ahead stores it: a mate as `mateEvalFor(n)`.
    const { mateEvalFor } = await import('./engineConstants');
    const top = (r: { cp: number | null; mate?: number | null; pv: string[] }[]): CachedEval => ({ evaluation: r[0].mate ? mateEvalFor(r[0].mate) : (r[0].cp ?? 0), depth: 18, bestMove: r[0].pv[0], pv: r[0].pv });
    const reads = new Map<number, CachedEval>([[1, top(m.before)], [2, top(m.after)]]);
    const passReads = new Map<string, CachedEval>([
      [nullMoveFen(m.fenBefore)!, top(m.passBefore)],
      [nullMoveFen(fenAfter)!, top(m.passAfter)],
    ]);
    const seat = m.fenBefore.split(' ')[1] === 'w' ? 'white' : 'black';
    const withPass = intentsFromReads(moves, seat, reads, passReads).get(13);
    expect(withPass?.text).toMatch(/f2/);
    expect(withPass?.squares).toContain('f2');
    // Negative control: the same reads without the pass never claim it.
    expect(intentsFromReads(moves, seat, reads).get(13)?.text ?? '').not.toMatch(/f2/);
    // The read-ahead asks for exactly these two pass positions.
    expect(reviewPassFens([m.fenBefore, fenAfter], seat)).toEqual([nullMoveFen(m.fenBefore), nullMoveFen(fenAfter)]);
    expect(reviewPassFens([m.fenBefore, fenAfter], seat === 'white' ? 'black' : 'white')).toEqual([]);
  });

  it('a stored mate is decoded back to a mate, never read as a plain number', async () => {
    const { mateEvalFor } = await import('./engineConstants');
    const { lineOf } = await import('./reviewMoveIntent');
    expect(lineOf({ evaluation: mateEvalFor(-1), depth: 18, bestMove: 'f6f2', pv: ['f6f2'] })[0].mate).toBe(-1);
    expect(lineOf({ evaluation: mateEvalFor(3), depth: 18, bestMove: 'a1a8', pv: ['a1a8'] })[0].mate).toBe(3);
    expect(lineOf({ evaluation: 120, depth: 18, bestMove: 'e2e4', pv: ['e2e4'] })[0]).toMatchObject({ mate: null, evaluation: 120 });
  });
});
