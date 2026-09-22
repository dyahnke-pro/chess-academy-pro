// THE HONEST HEADER (WO-HOME-OPENING-01 A2). The Weaknesses title used to say
// "{totalGames} games analysed" — the size of the LIBRARY — over an Overview
// card saying "926 of 932 not analysed". Both must derive from the ONE pair of
// counts `getOverviewInsights` computes (`analyzedGameCount` /
// `gamesNeedingAnalysis`); a header that reads the library total is the bug.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8');

describe('the analysed-count header derives from the one count', () => {
  it('GameInsightsPage prints analyzedGameCount, never totalGames alone, as "analysed"', () => {
    const src = read('components/Insights/GameInsightsPage.tsx');
    const header = /data-testid="insights-analysed-count"[^\n]*\n\s*\{([^}]+)\} of \{([^}]+)\} game/.exec(src);
    expect(header, 'the header testid + "{n} of {m} games analysed" shape is gone').not.toBeNull();
    expect(header?.[1]).toBe('analysedGames');
    expect(src).toMatch(/const analysedGames = overview\?\.analyzedGameCount \?\? 0;/);
    // The old lie must not come back in any spelling.
    expect(src).not.toMatch(/\n\s*\{totalGames\} game\{totalGames !== 1 \? 's' : ''\} analysed/);
  });

  it('OverviewTab reads the same pair for its "not analysed" card', () => {
    const src = read('components/Insights/OverviewTab.tsx');
    expect(src).toMatch(/\$\{gamesNeedingAnalysis\} of \$\{analyzedGameCount \+ gamesNeedingAnalysis\} games not analyzed/);
  });
});
