// REVIEW_NARRATION_REV moves with the Review walk's words (the rev fingerprint
// gate — src/test/revFingerprint.ts). Three of David's games, the segment
// builder's narration and its say-once keys, ply by ply.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { REVIEW_NARRATION_REV } from './reviewNarrationCache';
import { setOpeningIdentity } from './openingIdentity';
import { setOpeningPositions } from './openingPositions';
import { checkRevFingerprint, fingerprint } from '../test/revFingerprint';

interface FixtureGame { id: string; side: 'white' | 'black'; pgn: string; ann: [string | null, number | null, number | null, string | null][] }

describe('REVIEW_NARRATION_REV moves with the narration', () => {
  it('the committed (rev, fingerprint) pair matches the builder', () => {
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    // The app reads the opening index too: without it the "this board is the
    // King's Indian Attack reversed" lines never reached the fingerprint, so a
    // change to them could not move the rev (2026-10-21).
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
    const games = JSON.parse(readFileSync('src/services/__fixtures__/review-rev-games.json', 'utf8')) as FixtureGame[];
    const parts: Record<string, string> = {};
    for (const g of games) {
      const c = new Chess(); c.loadPgn(g.pgn);
      const d = new Chess();
      const inputs = c.history().map((san, i) => {
        d.move(san);
        const [classification, preMoveEval, evaluation, bestMove] = g.ann[i] ?? [null, null, null, null];
        return { ply: i + 1, san, fenAfter: d.fen(), isCoachMove: g.side === 'white' ? i % 2 === 1 : i % 2 === 0, classification: classification ?? 'good', preMoveEval: preMoveEval ?? 0, evaluation: evaluation ?? 0, bestMove } as unknown as ReviewMoveInput;
      });
      const segs = buildReviewSegmentsForTests(inputs, g.side, null, true, 1400);
      parts[g.id] = fingerprint(segs.map((s) => [s.ply, s.narration ?? null, s.ledgerKeys ?? []]));
    }
    setOpeningIdentity(null);
    expect(checkRevFingerprint('review-narration', REVIEW_NARRATION_REV, parts, 'src/services/reviewNarrationRev.gate.test.ts')).toBeNull();
  }, 600_000);
});
