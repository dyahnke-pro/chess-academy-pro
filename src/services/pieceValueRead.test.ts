import { describe, it, expect } from 'vitest';
import { parseEvalTable, pieceQualityLines, parseEvalSplit, evalSplitLine } from './pieceValueRead';

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

describe('where the edge comes from', () => {
  const bucket = (mat: string, pos: string): string => `
 NNUE network contributions (White to move)
+------------+------------+------------+------------+
|   Bucket   |  Material  | Positional |   Total    |
+------------+------------+------------+------------+
|  7         |  ${mat}   |  ${pos}   |  -  0.12   | <-- this bucket is used
+------------+------------+------------+------------+
`;

  it('reads the marked bucket, with the detached sign closed up', () => {
    // Stockfish prints "-  2.83" — sign, spaces, digits. Parsed naively every
    // negative reads as positive and the advice inverts.
    expect(parseEvalSplit(bucket('-  2.83', '-  1.30'))).toEqual({ material: -2.83, positional: -1.3 });
  });

  it('tells a material edge to simplify — the side that HAS it', () => {
    const s = parseEvalSplit(bucket('-  2.83', '-  1.30'))!;
    // White-POV negative = Black is up. Black hears it; White does not.
    expect(evalSplitLine(s, 'black', new Set())).toContain('simplifying is the plan');
    expect(evalSplitLine(s, 'white', new Set())).toBeNull();
  });

  it('tells a positional edge to KEEP pieces on', () => {
    const s = parseEvalSplit(bucket('+  0.05', '+  1.40'))!;
    expect(evalSplitLine(s, 'white', new Set())).toContain('Keep them on the board');
  });

  it('🔒 fires when the terms move TOGETHER, which is how NNUE behaves', () => {
    // THE REGRESSION. The first cut required one term near zero
    // (`material <= 0.1`). On a position a full rook up the real read is
    // material 2.83 / positional 1.30 — and it said NOTHING, because 1.30 is
    // not <= 0.1. A threshold that cannot be met is a dead lane wearing a
    // condition. It is a ratio now: twice the other, either way.
    const s = parseEvalSplit(bucket('-  2.83', '-  1.30'))!;
    expect(evalSplitLine(s, 'black', new Set())).not.toBeNull();
  });

  it('stays silent on a level board and on a mixed edge', () => {
    expect(evalSplitLine(parseEvalSplit(bucket('-  0.06', '-  0.06'))!, 'white', new Set())).toBeNull();
    // Both terms pulling equally is not a story worth a sentence.
    expect(evalSplitLine(parseEvalSplit(bucket('+  1.00', '+  1.00'))!, 'white', new Set())).toBeNull();
  });

  it('says it once per game', () => {
    const said = new Set<string>();
    const s = parseEvalSplit(bucket('+  0.05', '+  1.40'))!;
    expect(evalSplitLine(s, 'white', said)).not.toBeNull();
    expect(evalSplitLine(s, 'white', said)).toBeNull();
  });

  it('returns null when no bucket is marked', () => {
    expect(parseEvalSplit('no bucket table here')).toBeNull();
  });
});

describe('pieceQualityLines — never reroute the queen (David 2026-08-23, DNA run)', () => {
  it('does NOT name the queen "your worst piece" even when its value is the most below its kind', () => {
    const values = [
      { square: 'd1', piece: 'Q', color: 'w' as const, value: 2 },   // student queen, low
      { square: 'd8', piece: 'q', color: 'b' as const, value: 6 },   // enemy queen, high → white Q delta ≈ -2
      { square: 'a1', piece: 'R', color: 'w' as const, value: 3.4 }, // student rook, mildly idle
      { square: 'a8', piece: 'r', color: 'b' as const, value: 4.6 }, // enemy rook → white R delta ≈ -0.6
    ];
    const lines = pieceQualityLines(values, 'white');
    const worst = lines.find((l) => l.kind === 'your-worst-piece');
    expect(worst?.text ?? '').not.toMatch(/queen on d1/);
    // it should reach for the idle rook instead
    if (worst) expect(worst.text).toContain('rook on a1');
  });
});

describe('pieceQualityLines — worst piece only in the middlegame (David 2026-08-23)', () => {
  const REAL_TABLE = [
    { square: 'd1', piece: 'Q', color: 'w' as const, value: 5 },
    { square: 'd8', piece: 'q', color: 'b' as const, value: 5 },
    { square: 'a1', piece: 'R', color: 'w' as const, value: 3.4 },
    { square: 'a8', piece: 'r', color: 'b' as const, value: 4.6 },
  ];
  it('suppresses the your-worst-piece line when NOT in the middlegame', () => {
    const lines = pieceQualityLines(REAL_TABLE, 'white', undefined, { isMiddlegame: false });
    expect(lines.find((l) => l.kind === 'your-worst-piece')).toBeUndefined();
  });
  it('fires it once the middlegame is reached', () => {
    const lines = pieceQualityLines(REAL_TABLE, 'white', undefined, { isMiddlegame: true });
    expect(lines.find((l) => l.kind === 'your-worst-piece')?.text).toContain('rook on a1');
  });
});
