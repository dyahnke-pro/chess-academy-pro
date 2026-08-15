import { describe, it, expect } from 'vitest';
import { parseEvalTable, pieceQualityLines } from './pieceValueRead';

// Real `eval` output from the shipped WASM build, after 1.e4 e5 2.Nf3 Nc6
// 3.Bc4 Nf6 — trimmed to the board table plus the NNUE table that follows it,
// because skipping that second table without misreading it is the parser's
// whole job.
const REAL = `
 Contributing terms for the classical eval:
+-------+-------+-------+-------+-------+-------+-------+-------+
|   r   |       |   b   |   q   |   k   |   b   |       |   r   |
| -4.45 |       | -4.21 | -6.22 | -0.00 | -4.15 |       | -4.40 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   p   |   p   |   p   |   p   |       |   p   |   p   |   p   |
| -0.71 | -0.95 | -1.13 | -0.61 |       | -0.99 | -1.19 | -0.73 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |   n   |       |       |   n   |       |       |
|       |       | -3.55 |       |       | -3.72 |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |       |       |   p   |       |       |       |
|       |       |       |       | -1.05 |       |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |   B   |       |   P   |       |       |       |
|       |       | +3.99 |       | +1.11 |       |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|       |       |       |       |       |   N   |       |       |
|       |       |       |       |       | +3.80 |       |       |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   P   |   P   |   P   |   P   |       |   P   |   P   |   P   |
| +0.57 | +0.91 | +1.11 | +0.59 |       | +0.97 | +1.21 | +0.71 |
+-------+-------+-------+-------+-------+-------+-------+-------+
|   R   |   N   |   B   |   Q   |   K   |       |       |   R   |
| +3.88 | +3.48 | +3.99 | +5.81 | +0.00 |       |       | +4.05 |
+-------+-------+-------+-------+-------+-------+-------+-------+

 NNUE network contributions (White to move)
+------------+------------+------------+------------+
|   Bucket   |  Material  | Positional |   Total    |
+------------+------------+------------+------------+
|  0         |  +  0.08   |  -  2.57   |  -  2.48   |
+------------+------------+------------+------------+

NNUE evaluation        -0.12 (white side)
Final evaluation       -0.15 (white side)
`;

describe('the engine\'s per-piece table', () => {
  it('reads every piece onto its real square', () => {
    const v = parseEvalTable(REAL);
    const at = (sq: string) => v.find((x) => x.square === sq);
    expect(at('f3')).toMatchObject({ piece: 'N', color: 'w', value: 3.8 });
    expect(at('b1')).toMatchObject({ piece: 'N', color: 'w', value: 3.48 });
    expect(at('c4')).toMatchObject({ piece: 'B', color: 'w' });
    expect(at('f6')).toMatchObject({ piece: 'n', color: 'b' });
    // Ranks run 8 down to 1 — an off-by-one here mirrors the whole board.
    expect(at('a8')).toMatchObject({ piece: 'r', color: 'b' });
    expect(at('a1')).toMatchObject({ piece: 'R', color: 'w' });
  });

  it('does NOT misread the NNUE bucket table as a board', () => {
    // It has the same pipes and the same width. Only the cell CONTENT tells
    // them apart, which is why the parser matches on shape rather than on the
    // header above it.
    const v = parseEvalTable(REAL);
    expect(v).toHaveLength(32);
    expect(v.every((x) => /^[a-h][1-8]$/.test(x.square))).toBe(true);
  });

  it('returns nothing rather than half a board on junk', () => {
    expect(parseEvalTable('no table here')).toEqual([]);
    expect(parseEvalTable('')).toEqual([]);
  });

  it('judges a piece against its OWN KIND on THIS board, not the 3/9 scale', () => {
    // 🔒 THE REGRESSION. Against classical values every queen reads ~3 under
    // (they print ~5.8) and every bishop ~1.2 over (~4.2) — so the first cut
    // called Black's UNDEVELOPED c8 bishop "the piece doing the most work" and
    // the d1 queen on move 4 "doing the least of anything you own", on every
    // position, forever, while sounding specific.
    const lines = pieceQualityLines(parseEvalTable(REAL), 'white');
    expect(lines.some((l) => /queen on d1/.test(l.text))).toBe(false);
    expect(lines.some((l) => /bishop on c8/.test(l.text))).toBe(false);
  });

  it('names the genuinely idle piece', () => {
    // a1 at 3.88 against a board rook mean of ~4.2 — the least active rook on
    // the board, which on move 4 of an Italian is exactly right.
    const lines = pieceQualityLines(parseEvalTable(REAL), 'white');
    expect(lines.find((l) => l.kind === 'your-worst-piece')?.text).toContain('rook on a1');
  });

  it('stays silent rather than inventing a standout in a balanced position', () => {
    // Nothing clears the threshold for Black here, and a coach that names a
    // "best piece" every move on an equal board is filler.
    expect(pieceQualityLines(parseEvalTable(REAL), 'black')).toHaveLength(0);
  });

  it('says each piece once per game', () => {
    const said = new Set<string>();
    const v = parseEvalTable(REAL);
    expect(pieceQualityLines(v, 'white', said).length).toBeGreaterThan(0);
    expect(pieceQualityLines(v, 'white', said)).toHaveLength(0);
  });

  it('carries the square it is about, for the board to mark', () => {
    const l = pieceQualityLines(parseEvalTable(REAL), 'white')[0];
    expect(l.squares).toEqual(['a1']);
  });
});
