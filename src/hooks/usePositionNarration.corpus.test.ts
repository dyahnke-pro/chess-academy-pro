// THE READ LEADS WITH THE CORPUS (David 2026-08-13: "narrations follow the
// corpus, hand written, computed note format"). "Read this position" was the
// last owed surface on the every-surface-gets-the-corpus contract — it built
// its read from computed facts alone. A WIRE THAT DOES NOT FIRE IS NOT A
// WIRE: this proves a REAL note comes out of the retrieval for a REAL taught
// position and lands in the hook's prompt block, not that an import exists.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import '../test/loadFullCorpus';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from '../services/danyaTeachingService';
import { Chess } from 'chess.js';

describe('position read corpus wiring', () => {
  it('a real taught position yields a real spoken note through the exact call chain the hook uses', async () => {
    // Walk taught mainlines until the corpus yields a note the hook would
    // speak — the Caro-Kann and e4 e5 families are densely farmed, so if
    // NONE of these produce one, the retrieval (or corpus load) is broken.
    const LINES: string[][] = [
      ['e4', 'c6', 'd4', 'd5'],
      ['e4', 'e5', 'Nf3', 'Nc6'],
      ['e4', 'c6', 'd4', 'd5', 'e5'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      ['d4', 'd5', 'c4'],
    ];
    let spoken: string | null = null;
    for (const sans of LINES) {
      const c = new Chess();
      for (const s of sans) c.move(s);
      const src = teachingSourceForBoard(sans, c.fen(), null);
      if (!src) continue;
      const line = generalizedTeaching(src.origin, spokenBeatText(src.note));
      if (line.trim().length > 0) { spoken = line; break; }
    }
    expect(spoken, 'no taught mainline produced a speakable note — the read has no corpus to lead with').toBeTruthy();
  });

  it('the hook injects the note as a REQUIRED verbatim lead (source pin)', () => {
    const src = readFileSync('src/hooks/usePositionNarration.ts', 'utf8');
    expect(src).toContain('teachingSourceForBoard(historySans, args.fen');
    expect(src).toContain('LEAD WITH THIS VERIFIED TEACHING NOTE');
    // …and it rides the SAME additionalContext the model actually receives.
    expect(src).toMatch(/\$\{requiredNote\}\$\{requiredLookahead\}/);
  });
});
