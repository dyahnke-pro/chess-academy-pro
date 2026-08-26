// THE READ LEADS WITH THE CORPUS (David 2026-08-13: "narrations follow the
// corpus, hand written, computed note format"). "Read this position" was the
// last owed surface on the every-surface-gets-the-corpus contract — it built
// its read from computed facts alone. A WIRE THAT DOES NOT FIRE IS NOT A
// WIRE: this proves a REAL note comes out of the retrieval for a REAL taught
// position and lands in the hook's prompt block, not that an import exists.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from '../services/danyaTeachingService';
import { __setFarmedCorporaCache } from '../services/farmedCorpusData';
import { warmSecondaryPositionIndexSync } from '../services/secondaryCorpora';
import { Chess } from 'chess.js';

const VOICED = JSON.parse(
  readFileSync('public/data/voiced-teachings.json', 'utf8'),
) as { notes: { lineSan: string[] }[] };

describe('position read corpus wiring', () => {
  // Exercise the real runtime path: inject voiced (the sole exact-position
  // corpus) into the secondary index the hook's `teachingSourceForBoard` reads.
  beforeEach(() => {
    __setFarmedCorporaCache([{ key: 'voiced', data: VOICED as never }]);
    warmSecondaryPositionIndexSync();
  });
  afterEach(() => { __setFarmedCorporaCache(undefined); });

  it('a real VOICED position yields a real spoken note through the exact call chain the hook uses', async () => {
    // Voiced is the sole exact-position corpus on the coach tab now (David
    // 2026-08-26): the read leads with a voiced note at a position the voiced
    // corpus actually teaches. Drive REAL voiced lines so this can never go
    // vacuous — if a voiced note fails to come out of `teachingSourceForBoard`
    // as origin=position, the read-position wire is broken.
    const lines = VOICED.notes.filter((n) => n.lineSan.length >= 4).slice(0, 12);
    expect(lines.length, 'no anchored voiced notes to test').toBeGreaterThan(2);
    let spoken: string | null = null;
    for (const n of lines) {
      const c = new Chess();
      for (const s of n.lineSan) c.move(s);
      const src = teachingSourceForBoard(n.lineSan, c.fen(), null);
      if (!src || src.origin !== 'position') continue;
      const line = generalizedTeaching(src.origin, spokenBeatText(src.note));
      if (line.trim().length > 0) { spoken = line; break; }
    }
    expect(spoken, 'no voiced position produced a speakable note — the read has no corpus to lead with').toBeTruthy();
  });

  it('the hook injects the note as a REQUIRED verbatim lead (source pin)', () => {
    const src = readFileSync('src/hooks/usePositionNarration.ts', 'utf8');
    expect(src).toContain('teachingSourceForBoard(historySans, args.fen');
    expect(src).toContain('LEAD WITH THIS VERIFIED TEACHING NOTE');
    // …and it rides the SAME additionalContext the model actually receives.
    expect(src).toMatch(/\$\{requiredNote\}\$\{requiredLookahead\}/);
  });
});
