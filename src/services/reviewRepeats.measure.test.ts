// REVIEW SAYS EACH IDEA ONCE A TURN (prod Review 2026-11-21: "C-pawn takes d5:
// it half-opens the c-file … You played c-pawn takes d5 — it half-opens the
// c-file"). Measured on the Review gate's games: turns that name one file
// opening twice, and turns that name the played move twice. Run with
// REVIEW_REPEATS=1; prints the counts and the turns.
import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, foldReviewRefrains, type ReviewMoveInput } from './coachFeatureService';
import { setOpeningIdentity } from './openingIdentity';
import { setOpeningPositions } from './openingPositions';
import { createStoryStore } from './gameStory';
import { knownSlipIndexFromDisk } from '../test/replayGame';

interface FixtureGame { id: string; side: 'white' | 'black'; pgn: string; ann: [string | null, number | null, number | null, string | null][] }
const run = process.env.REVIEW_REPEATS === '1' ? it : it.skip;

describe('Review repeats', () => {
  run('counts turns that say one idea twice', () => {
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    setOpeningPositions(JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8')) as Record<string, [string, number]>);
    const games = JSON.parse(readFileSync('src/services/__fixtures__/review-rev-games.json', 'utf8')) as FixtureGame[];
    const out: string[] = []; let turns = 0; let fileTwice = 0; let moveTwice = 0; const moveEx: string[] = [];
    for (const g of games) {
      const c = new Chess(); c.loadPgn(g.pgn);
      const d = new Chess();
      const inputs = c.history().map((san, i) => {
        d.move(san);
        const [classification, preMoveEval, evaluation, bestMove] = g.ann[i] ?? [null, null, null, null];
        return { ply: i + 1, san, fenAfter: d.fen(), isCoachMove: g.side === 'white' ? i % 2 === 1 : i % 2 === 0, classification: classification ?? 'good', preMoveEval: preMoveEval ?? 0, evaluation: evaluation ?? 0, bestMove } as unknown as ReviewMoveInput;
      });
      const story = createStoryStore(g.id);
      const segs = buildReviewSegmentsForTests(inputs, g.side, null, true, 1400, [], undefined, null, new Map(), new Map(), null, story, new Map(), knownSlipIndexFromDisk());
      // The app's finishing pass over the walk (`generateReviewNarration`).
      foldReviewRefrains(segs, story, null);
      for (const s of segs) {
        const t = s.narration ?? ''; if (!t) continue; turns++;
        const c2: Record<string, number> = {};
        for (const m of t.matchAll(/(?:half-)?opens? (?:up )?the ([a-h])-file|rips open the ([a-h])-file/g)) { const f = m[1] || m[2]; c2[f] = (c2[f] ?? 0) + 1; }
        if (Object.values(c2).some((v) => v > 1)) { fileTwice++; out.push(`${g.id} ${s.ply}: ${t}`); }
        const san = (inputs[s.ply - 1]?.san ?? '').replace(/[+#]$/, '');
        if (san.length >= 2) {
          const esc = san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const heads = [...t.matchAll(new RegExp(`(?:^|[.!?]\\s+)(?:You (?:played|play|went for|go)|They (?:played|play|went for|go)|Your|Their)?\\s*…?${esc}\\b`, 'g'))].length;
          if (heads >= 2) { moveTwice++; moveEx.push(`${g.id} ${s.ply}: ${t}`); }
        }
      }
    }
    setOpeningIdentity(null);
    writeFileSync('audit-reports/review-repeats.txt', [`turns ${turns}, one file twice ${fileTwice}, move led twice ${moveTwice}`, ...out, '--- move twice', ...moveEx].join('\n\n'));
    console.log(`turns ${turns}, one file twice ${fileTwice}, move led twice ${moveTwice}`);
  }, 600_000);
});
