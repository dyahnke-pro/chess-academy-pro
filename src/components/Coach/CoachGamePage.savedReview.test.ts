import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// chesscom-1040709576 (2026-10-13): Play's inline post-game review graded the
// game from its depth-10 live reads, while the review page grades the same
// record at review depth — one game, two sets of grades. A SAVED game's
// postgame opens the review page; the inline review is only for a game under
// the persistence floor, which has no record to load.
describe('a saved Play game is reviewed on the one review path', () => {
  const src = readFileSync(join(__dirname, 'CoachGamePage.tsx'), 'utf8');
  it('postgame navigates a saved game to its review page', () => {
    expect(src).toMatch(/savedForReviewRef\.current = added\.then\(\(\) => gameRecord\.id/);
    expect(src).toMatch(/navigate\(`\/coach\/review\/\$\{id\}`, \{ replace: true \}\)/);
  });
  it('the inline review waits while the saved review opens', () => {
    expect(src).toMatch(/gameState\.status === 'postgame' && openingSavedReview/);
  });
});
