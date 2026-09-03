// The analytics summariser must extract numbers from Apple's real report shape.
//
// 🚨 WHY THIS TEST EXISTS. The weekly ASC analytics job ran green for months,
// downloaded 11 report files every Monday, and extracted ZERO metrics from all
// of them — printing "(no recognised metric columns)" and exiting 0. The cause
// was a hardcoded WANT list of 11 guessed column names matched by exact string
// equality; Apple's actual headers matched none of them, so the metric set was
// always empty. Nothing failed, so nobody looked.
//
// The reproduction below is the old algorithm, kept deliberately: it is the
// negative control. If the new summariser is ever "simplified" back into a
// name-matching guess, `the old approach found nothing` still passes while the
// real assertions fail — which is exactly the signal that was missing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, 'asc-analytics.mjs'), 'utf8');

// Load the ESM script's pure helpers without running main(): the file reads
// required env at import time, so evaluate just the functions under test.
async function loadSummariser(): Promise<(name: string, text: string) => any> {
  const start = SRC.indexOf('/** Headers that name a dimension');
  const end = SRC.indexOf('async function main()');
  expect(start, 'could not locate the summariser in asc-analytics.mjs').toBeGreaterThan(-1);
  const body = SRC.slice(start, end);
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(`${body}\nexport { summariseTsv };`).toString('base64')}`
  );
  return mod.summariseTsv;
}

// Apple's App Store Discovery and Engagement report: dimensions describing the
// row, then the counts. Column names here follow Apple's documented shape.
const DISCOVERY = [
  'Date\tApp Name\tApp Apple Identifier\tPlatform Version\tSource Type\tEngagement Type\tPage Type\tTerritory\tCounts',
  '2026-08-28\tChess Academy Pro\t6776418777\tiOS 18.5\tApp Store Search\tImpression\tProduct Page\tUnited States\t120',
  '2026-08-28\tChess Academy Pro\t6776418777\tiOS 18.5\tApp Store Browse\tImpression\tProduct Page\tUnited States\t30',
  '2026-08-29\tChess Academy Pro\t6776418777\tiOS 18.5\tApp Store Search\tImpression\tProduct Page\tUnited States\t80',
  '2026-08-29\tChess Academy Pro\t6776418777\tiOS 18.5\tApp Referrer\tImpression\tProduct Page\tUnited States\t10',
].join('\n');

describe('asc-analytics summariser', () => {
  it('extracts the metric column from a real-shaped report', async () => {
    const summarise = await loadSummariser();
    const s = summarise('App Store Discovery and Engagement Standard', DISCOVERY);
    expect(s.rows).toBe(4);
    expect(s.metricCount).toBeGreaterThan(0);
    expect(s.sums.Counts).toBe(240);
    expect(s.dateRange).toBe('2026-08-28 … 2026-08-29');
  });

  it('breaks the metric down by source — the answer to "did anyone find me by searching"', async () => {
    const summarise = await loadSummariser();
    const s = summarise('discovery', DISCOVERY);
    expect(s.breakdowns['Source Type']).toEqual({
      'App Store Search': 200,
      'App Store Browse': 30,
      'App Referrer': 10,
    });
  });

  it('does NOT sum an identifier or a version as if it were a measurement', async () => {
    const summarise = await loadSummariser();
    const s = summarise('discovery', DISCOVERY);
    // 6776418777 x4 would dwarf every real number in the report.
    expect(s.sums['App Apple Identifier']).toBeUndefined();
    expect(s.sums['Platform Version']).toBeUndefined();
  });

  it('reports metricCount 0 for a file it genuinely cannot read, and keeps the header', async () => {
    const summarise = await loadSummariser();
    const s = summarise('opaque', 'Date\tTerritory\n2026-08-28\tUnited States');
    expect(s.metricCount).toBe(0);
    expect(s.rows).toBe(1);
    // The header is what makes the failure fixable rather than mysterious.
    expect(s.header).toEqual(['Date', 'Territory']);
  });

  it('the OLD approach found nothing on this same input (negative control)', () => {
    const WANT = ['Impressions', 'Impressions Unique Device', 'Product Page Views',
      'Product Page Views Unique Device', 'Total Downloads', 'First Time Downloads',
      'Redownloads', 'Units', 'Installs', 'Proceeds', 'Sales'];
    const header = DISCOVERY.split('\n')[0].split('\t');
    const matched = WANT.filter((w) => header.some((h) => h.toLowerCase() === w.toLowerCase()));
    // This is the bug, reproduced: zero of eleven guessed names exist.
    expect(matched).toEqual([]);
  });

  it('the summariser no longer contains the hardcoded guess list', () => {
    // Strip comments: the header above DESCRIBES the old defect by name, and
    // documenting a bug is not committing it.
    const code = SRC.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).not.toContain("'Impressions Unique Device'");
    expect(code).not.toContain('no recognised metric columns');
  });
});
