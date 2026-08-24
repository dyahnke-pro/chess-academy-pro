import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { __setFarmedCorporaCache } from './farmedCorpusData';
import { secondaryNotesForFen, warmSecondaryPositionIndexSync } from './secondaryCorpora';

/**
 * A WIRE THAT DOES NOT FIRE IS NOT A WIRE (CLAUDE.md). This proves a voiced
 * teaching note actually comes OUT of the position-keyed corpus retrieval that
 * free-play / review / tactics use — not merely that the file exists.
 */
const bundle = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/voiced-teachings.json'), 'utf8'),
) as { notes: { id: string; lineSan: string[]; explains: string }[] };

function fenFor(lineSan: string[]): string {
  const g = new Chess();
  for (const s of lineSan) g.move(s);
  return g.fen();
}

describe('voiced corpus → position retrieval', () => {
  beforeEach(() => {
    __setFarmedCorporaCache([{ key: 'voiced', data: bundle as never }]);
    warmSecondaryPositionIndexSync();
  });
  afterEach(() => { __setFarmedCorporaCache(undefined); });

  it('has real position-keyed notes to deliver', () => {
    const positioned = bundle.notes.filter((n) => n.lineSan.length > 0);
    expect(positioned.length).toBeGreaterThan(100);
  });

  it('delivers a voiced note by EXACT position for several real notes', () => {
    // sample across the corpus so we do not lean on one video.
    const sample = bundle.notes.filter((n) => n.lineSan.length >= 4).filter((_, i) => i % 40 === 0).slice(0, 8);
    expect(sample.length).toBeGreaterThan(2);
    let hits = 0;
    for (const n of sample) {
      const fen = fenFor(n.lineSan);
      const got = secondaryNotesForFen(fen);
      if (got.some((g) => g.id.startsWith('vc-'))) hits += 1;
    }
    // every sampled position must return a voiced note (its own note, at least).
    expect(hits).toBe(sample.length);
  });

  it('delivers the KIA-vs-French note at its board', () => {
    const kf = bundle.notes.find((n) => n.explains.toLowerCase().includes('king') && n.explains.toLowerCase().includes('d2'));
    expect(kf, 'a KIA note about the d2 knight should exist').toBeTruthy();
    const got = secondaryNotesForFen(fenFor(kf!.lineSan));
    expect(got.some((g) => g.id === kf!.id)).toBe(true);
  });
});
