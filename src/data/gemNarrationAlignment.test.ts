// Gate: a gem narration line that opens with a move names the move played on
// that ply (2026-10-08). 33 lines had slid one or two plies, so the voice said
// "…e5 — the pawn rolls forward" over …Bc5. Zero mismatches, no baseline.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_GEMS, gemId } from './lessons/punishGems';
import { GEM_NARRATION } from './lessons/punishGemNarration';

const LEAD = /^(?:…|\.\.\.)?\s*((?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8]|O-O(?:-O)?)(?:=[QRBN])?)/;

export function leadingMove(text: string): string | null {
  const m = LEAD.exec(text.trim());
  return m ? m[1] : null;
}

describe('gem narration names the move on its own ply', () => {
  it('every watch/learn line that opens with a move names the played move', () => {
    const rows: string[] = [];
    for (const gem of ALL_GEMS) {
      const id = gemId(gem);
      if (!(id in GEM_NARRATION)) continue;
      const n = GEM_NARRATION[id];
      const c = new Chess();
      const sans = gem.playLine.trim().split(/\s+/).map((m) => c.move(m).san.replace(/[+#]/g, ''));
      for (const [reg, arr] of [['watch', n.watch], ['learn', n.learn]] as const) {
        arr.forEach((t, i) => {
          const said = leadingMove(t);
          if (said && said !== sans[i]) rows.push(`${id} ${reg}[${i}] says ${said}, played ${sans[i]}`);
        });
      }
    }
    expect(rows).toEqual([]);
  });

  it('reads the leading move (negative control)', () => {
    expect(leadingMove('…e5 — the pawn rolls forward')).toBe('e5');
    expect(leadingMove('Nxe5 — a clean pawn')).toBe('Nxe5');
    expect(leadingMove('The pawn rolls forward')).toBeNull();
  });
});
