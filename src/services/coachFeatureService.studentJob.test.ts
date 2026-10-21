// THE WHY STANDARD IN REVIEW (lead 2026-10-20): every student move out of book
// is owed its own reason. On Carlsen–Grischuk (jMVMo1Ua, student White) the
// walk stayed silent on 37.Qe4 past the opening, though the board shows its job.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { setOpeningIdentity } from './openingIdentity';

interface G { id: string; side: 'white' | 'black'; pgn: string; ann: [string | null, number | null, number | null, string | null][] }

describe('review walk — the student\'s own move says its job past the opening', () => {
  it('37.Qe4 carries its reason (25.bxc4 is a plain recapture — the board says it)', () => {
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    const g = (JSON.parse(readFileSync('src/services/__fixtures__/review-rev-games.json', 'utf8')) as G[]).find((x) => x.id === 'jMVMo1Ua')!;
    const c = new Chess(); c.loadPgn(g.pgn); const d = new Chess();
    const segs = buildReviewSegmentsForTests(c.history().map((san, i) => {
      d.move(san);
      const [cls, pre, ev, best] = g.ann[i];
      return { ply: i + 1, san, fenAfter: d.fen(), isCoachMove: i % 2 === 1, classification: cls ?? 'good', preMoveEval: pre ?? 0, evaluation: ev ?? 0, bestMove: best } as unknown as ReviewMoveInput;
    }), 'white', null, true, 1400);
    setOpeningIdentity(null);
    const at = (ply: number): string => segs[ply - 1].narration ?? '';
    
    expect(at(73)).toMatch(/Stops their pawn coming to e4, where it would hit your queen on f3/);
  }, 120_000);
});
