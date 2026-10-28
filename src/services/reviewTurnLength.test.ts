import { describe, it, expect } from 'vitest';

describe('one punishing line per ply (review audit 2026-10-15)', () => {
  it('the advantage/punishment pass yields to a verdict that already played the line', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    // …and to a reply this ply already named (one claim once, 2026-10-28).
    expect(src).toMatch(/if \(s\.verdictPlayedLine \|\| alreadyNamed \|\| opensWithRecapture\) \{ markReason\('allowed'\); continue; \}/);
    expect(src).toMatch(/const frame = isStudentSlip\s*\? `Here's how it gets punished from here/);
    const facets = readFileSync('src/services/reviewFullData.ts', 'utf8');
    expect(facets).toMatch(/outVerdictReason\.playedLine = !!ew\?\.line;/);
  });
});

describe('the review line renderer says a long line as its shape (proof guard 2)', () => {
  it('past three moves: the first move and the result', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src).toMatch(/const moves = lineShape\(said, /);
  });
});

describe('no word cap on a review ply (David 2026-10-15)', () => {
  it('the ranked parts speak whole — nothing is evicted for length', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src).toMatch(/const uncappedParts = rankedParts;/);
    expect(src).not.toMatch(/fitReviewTurn/);
  });
});
