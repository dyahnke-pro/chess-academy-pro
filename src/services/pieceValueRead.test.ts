import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import { parseEvalTable, pieceQualityLines, parseEvalSplit, evalSplitLine, type PieceValue } from './pieceValueRead';

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

  it('names only a passive MINOR as the worst piece — never a rook or queen', () => {
    const values = [
      { square: 'c1', piece: 'B', color: 'w' as const, value: 2 },   // idle bishop
      { square: 'c8', piece: 'b', color: 'b' as const, value: 4 },   // enemy bishop → white B delta ≈ -1
      { square: 'a1', piece: 'R', color: 'w' as const, value: 3.4 }, // idle rook — must NOT be chosen
      { square: 'a8', piece: 'r', color: 'b' as const, value: 4.6 },
    ];
    const worst = pieceQualityLines(values, 'white').find((l) => l.kind === 'your-worst-piece');
    expect(worst?.text ?? '').toContain('bishop on c1');
    expect(worst?.text ?? '').not.toMatch(/rook|queen/);
  });

  it('stays silent rather than inventing a standout in a balanced position', () => {
    // Nothing clears the threshold for Black here, and a coach that names a
    // "best piece" every move on an equal board is filler.
    expect(pieceQualityLines(parseEvalTable(REAL), 'black')).toHaveLength(0);
  });

  it('never calls a minor that is PINNING or attacking a piece "doing the least"', () => {
    // Naroditsky's game after 14.Bf4 Bd6 (hand walk 2026-09-24): the f4-bishop
    // pins the d6-bishop to the queen on c7. The table scored it lowest.
    const fen = '2kr3r/p1qn1ppp/1p1bpn2/PPp4b/5B2/2NP2PP/2P1NPB1/R2Q1RK1 w - - 2 15';
    const values = [
      { square: 'f4', piece: 'B', color: 'w' as const, value: 1 },
      { square: 'g2', piece: 'B', color: 'w' as const, value: 4 },
      { square: 'd6', piece: 'b', color: 'b' as const, value: -4 },
    ];
    const lines = pieceQualityLines(values, 'white', undefined, { isMiddlegame: true, fen });
    expect(lines.some((l) => /bishop on f4/.test(l.text))).toBe(false);
    // NEGATIVE CONTROL: without the board, the table alone still names it.
    expect(pieceQualityLines(values, 'white', undefined, { isMiddlegame: true })
      .some((l) => /bishop on f4/.test(l.text))).toBe(true);
  });

  it('never crowns a knight on the rim their best piece (walk 900, 9…a6: Na3)', () => {
    const values = [
      { square: 'a3', piece: 'N', color: 'w' as const, value: 4 },
      { square: 'f6', piece: 'n', color: 'b' as const, value: 1 },
      { square: 'b3', piece: 'B', color: 'w' as const, value: 3 },
      { square: 'c4', piece: 'B', color: 'w' as const, value: 3 },
    ];
    const c = new Chess();
    for (const m of 'e4 c5 Nf3 d6 c3 Nf6 e5 dxe5 Nxe5 Nbd7 Nxd7 Bxd7 Bc4 Bc6 O-O e6 Na3 a6 Bb3'.split(' ')) c.move(m);
    const lines = pieceQualityLines(values, 'black', undefined, { isMiddlegame: true, fen: c.fen() });
    expect(lines.some((l) => /knight on a3/.test(l.text))).toBe(false);
    // NEGATIVE CONTROL: without the board the table alone would crown it.
    expect(pieceQualityLines(values, 'black', undefined, { isMiddlegame: true }).some((l) => /knight on a3/.test(l.text))).toBe(true);
  });

  const BAD_MINOR = [
    { square: 'c1', piece: 'B', color: 'w' as const, value: 2 },   // idle bishop → worst
    { square: 'c8', piece: 'b', color: 'b' as const, value: 4 },
  ];
  it('says each piece once per game', () => {
    const said = new Set<string>();
    expect(pieceQualityLines(BAD_MINOR, 'white', said).length).toBeGreaterThan(0);
    expect(pieceQualityLines(BAD_MINOR, 'white', said)).toHaveLength(0);
  });

  it('carries the square it is about, for the board to mark', () => {
    const l = pieceQualityLines(BAD_MINOR, 'white').find((x) => x.kind === 'your-worst-piece')!;
    expect(l.squares).toEqual(['c1']);
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
      { square: 'c1', piece: 'B', color: 'w' as const, value: 2 },   // idle bishop
      { square: 'c8', piece: 'b', color: 'b' as const, value: 4 },   // enemy bishop → white B delta ≈ -1
    ];
    const lines = pieceQualityLines(values, 'white');
    const worst = lines.find((l) => l.kind === 'your-worst-piece');
    expect(worst?.text ?? '').not.toMatch(/queen on d1/);
    // it should reach for the idle MINOR instead, never the queen or a rook
    if (worst) expect(worst.text).toContain('bishop on c1');
  });
});

describe('pieceQualityLines — worst piece only in the middlegame (David 2026-08-23)', () => {
  const REAL_TABLE = [
    { square: 'c1', piece: 'B', color: 'w' as const, value: 2 },
    { square: 'c8', piece: 'b', color: 'b' as const, value: 4 },
    { square: 'a1', piece: 'R', color: 'w' as const, value: 3.4 },
    { square: 'a8', piece: 'r', color: 'b' as const, value: 4.6 },
  ];
  it('suppresses the your-worst-piece line when NOT in the middlegame', () => {
    const lines = pieceQualityLines(REAL_TABLE, 'white', undefined, { isMiddlegame: false });
    expect(lines.find((l) => l.kind === 'your-worst-piece')).toBeUndefined();
  });
  it('fires it once the middlegame is reached', () => {
    const lines = pieceQualityLines(REAL_TABLE, 'white', undefined, { isMiddlegame: true });
    expect(lines.find((l) => l.kind === 'your-worst-piece')?.text).toContain('bishop on c1');
  });

  // 🚨 THE MOVE-3 ROOK (found reading a real prod Learn game, 2026-09-18).
  // The coach said, three times in one game: "Their rook on a1 is the piece
  // doing the most work for them — trading it off takes the sting out of the
  // position." On move three of the Scandinavian that rook has never moved, has
  // no legal move, and cannot be traded. It won because the comparison is
  // RELATIVE to its own kind: with both rooks asleep, the one defending a2 edges
  // the other, and a relative ranking with no floor always names somebody.
  describe('a piece that has never moved is not doing the most work', () => {
    // Both white rooks home; a1 scores above h1, as it did on the real board.
    const openingValues: PieceValue[] = [
      { square: 'a1', piece: 'R', color: 'w', value: 0.9 },
      { square: 'h1', piece: 'R', color: 'w', value: 0.1 },
      { square: 'c3', piece: 'N', color: 'w', value: 0.5 },
      { square: 'd5', piece: 'q', color: 'b', value: -0.4 },
    ];

    it('does NOT crown a home-square rook in the opening', () => {
      const lines = pieceQualityLines(openingValues, 'black', undefined, { isMiddlegame: false });
      const best = lines.find((l) => l.kind === 'their-best-piece');
      expect(best?.text ?? '', 'a rook on its starting square cannot be traded off').not.toMatch(/rook on a1/);
    });

    it('STILL crowns a rook that has actually moved — this is not a rook ban', () => {
      const moved = openingValues.map((v) => (v.square === 'a1' ? { ...v, square: 'd1' } : v));
      // …on a file its own pawns have left: that is what "doing work" means
      // before the middlegame (castling alone is not).
      const fen = '4k3/8/8/3q4/8/2N5/PPP2PPP/3RK2R b K - 0 8';
      const lines = pieceQualityLines(moved, 'black', undefined, { isMiddlegame: false, fen });
      const best = lines.find((l) => l.kind === 'their-best-piece');
      expect(best?.text ?? '', 'an open-file rook IS real teaching — do not delete it').toMatch(/rook on d1/);
    });

    it('lifts the guard in a middlegame, where a home rook can own an open file', () => {
      const lines = pieceQualityLines(openingValues, 'black', undefined, { isMiddlegame: true });
      const best = lines.find((l) => l.kind === 'their-best-piece');
      expect(best?.text ?? '').toMatch(/rook on a1/);
    });
  });

});

describe('their best piece is never a freshly developed minor in the opening (walk 5, L3a)', () => {
  it('a knight that moved once is not "doing the most work" at move two', () => {
    const values = [
      { piece: 'n', color: 'b', square: 'c6', value: -1.4 },
      { piece: 'n', color: 'b', square: 'g8', value: -0.3 },
      { piece: 'n', color: 'w', square: 'c3', value: 0.9 },
      { piece: 'n', color: 'w', square: 'g1', value: 0.3 },
    ] as never;
    const opening = pieceQualityLines(values, 'white', undefined, { isMiddlegame: false });
    expect(opening.find((l) => l.kind === 'their-best-piece')).toBeUndefined();
    const middlegame = pieceQualityLines(values, 'white', undefined, { isMiddlegame: true });
    expect(middlegame.find((l) => l.kind === 'their-best-piece')?.text ?? '').toMatch(/knight on c6/);
  });
});

describe('a rook that only castled is not "doing the most work" (hand walk 2026-09-24)', () => {
  // 6.Bc4 O-O in the Philidor: the f8-rook sits behind its own f7-pawn.
  const fen = 'rnbq1rk1/ppp1bppp/3p1n2/8/2BNP3/2N5/PPP2PPP/R1BQK2R w KQ - 4 7';
  const values: PieceValue[] = [
    { square: 'f8', piece: 'r', color: 'b', value: -5.6 },
    { square: 'a8', piece: 'r', color: 'b', value: -4.4 },
    { square: 'a1', piece: 'R', color: 'w', value: 4.5 },
    { square: 'h1', piece: 'R', color: 'w', value: 4.5 },
  ];
  it('stays silent before the middlegame when its file still holds its own pawn', () => {
    const lines = pieceQualityLines(values, 'white', new Set(), { isMiddlegame: false, fen });
    expect(lines.find((l) => l.kind === 'their-best-piece')).toBeUndefined();
  });
  it('NEGATIVE CONTROL: the same rook on a pawn-free file is named', () => {
    const open = 'rnbq1rk1/ppp1bp1p/3p1n2/8/2BNP3/2N5/PPP2PPP/R1BQK2R w KQ - 4 7'.replace('ppp1bp1p', 'ppp1b1pp');
    const lines = pieceQualityLines(values, 'white', new Set(), { isMiddlegame: false, fen: open });
    expect(lines.find((l) => l.kind === 'their-best-piece')?.text ?? '').toMatch(/rook on f8/);
  });
});

describe('an undeveloped minor gets the development rule, not a reroute (hand walk 2026-09-24)', () => {
  const values: PieceValue[] = [
    { square: 'c1', piece: 'B', color: 'w', value: 2.4 },
    { square: 'b3', piece: 'B', color: 'w', value: 4.6 },
    { square: 'e7', piece: 'b', color: 'b', value: -4.0 },
  ];
  it('the home-square bishop is told to develop', () => {
    const line = pieceQualityLines(values, 'white', new Set(), { isMiddlegame: true }).find((l) => l.kind === 'your-worst-piece');
    expect(line?.text).toMatch(/bishop on c1 hasn't moved yet — in general, finish your development/);
  });
  it('NEGATIVE CONTROL: a developed bishop doing little is still told to find a better square', () => {
    const moved = values.map((v) => (v.square === 'c1' ? { ...v, square: 'd2' } : v));
    const line = pieceQualityLines(moved, 'white', new Set(), { isMiddlegame: true }).find((l) => l.kind === 'your-worst-piece');
    expect(line?.text).toMatch(/finding it a better square/);
  });
});

describe('a bishop raking the king\'s squares is at work (hand walk 2026-09-24)', () => {
  it('after 23.Bxe6+ Kh8 the e6-bishop is never "doing the least"', () => {
    const values: PieceValue[] = [
      { square: 'e6', piece: 'B', color: 'w', value: 2.0 },
      { square: 'e3', piece: 'B', color: 'w', value: 4.8 },
      { square: 'b4', piece: 'b', color: 'b', value: -4.0 },
    ];
    const line = pieceQualityLines(values, 'white', new Set(), { isMiddlegame: true, fen: '3q1r1k/pp4pp/2p1B3/4Pp1P/1b6/2N1BR1P/PPP5/4Q1K1 w - - 1 24' }).find((l) => l.kind === 'your-worst-piece');
    expect(line?.text ?? '').not.toMatch(/e6/);
  });
});

describe('a piece the student can simply take is not "their best piece" (hand walk 2000)', () => {
  it('an undefended rook that just took on d8 is taken, not traded off', () => {
    // White rook on d8, Black to move, knight on c5 does not defend it; Black's
    // king on f7 cannot reach it — the black knight on b6 hits d7 not d8, so we
    // give Black a rook on f8 that takes it. Nothing white defends d8.
    const fen = '3R1r2/5k2/1n6/8/8/8/5K2/8 b - - 0 40';
    const values = [
      { square: 'd8', piece: 'R', color: 'w' as const, value: 5 },
      { square: 'f8', piece: 'r', color: 'b' as const, value: -2 },
      { square: 'b6', piece: 'n', color: 'b' as const, value: -2 },
    ];
    const withFen = pieceQualityLines(values, 'black', undefined, { isMiddlegame: true, fen });
    expect(withFen.find((l) => l.kind === 'their-best-piece')).toBeUndefined();
    // Same numbers, rook defended by its king on e7 → it IS the piece to trade.
    const defended = pieceQualityLines(values, 'black', undefined, { isMiddlegame: true, fen: '3R1r2/4Kk2/1n6/8/8/8/8/8 b - - 0 40' });
    expect(defended.find((l) => l.kind === 'their-best-piece')?.text).toMatch(/rook on d8/);
  });
});

describe('one idea, said once a phase — not once per square (re-walk 1380, 2026-09-25)', () => {
  // "their X is the piece doing the most work" spoke on six moves, a different
  // piece each time, because say-once was keyed on the square.
  const at = (theirBest: string, myIdle: string): PieceValue[] => [
    { square: theirBest, piece: 'n', color: 'b', value: -4.5 },
    { square: 'a8', piece: 'n', color: 'b', value: -1.0 },
    { square: myIdle, piece: 'B', color: 'w', value: 1.0 },
    { square: 'd4', piece: 'B', color: 'w', value: 4.5 },
  ];
  it('a new square on the same phase does not re-speak the advice', () => {
    const said = new Set<string>();
    const first = pieceQualityLines(at('e6', 'b2'), 'white', said, { isMiddlegame: true });
    expect(first.map((l) => l.kind).sort()).toEqual(['their-best-piece', 'your-worst-piece']);
    const next = pieceQualityLines(at('c5', 'a3'), 'white', said, { isMiddlegame: true });
    expect(next, 'a different piece is not a different idea').toHaveLength(0);
  });
  it('the piece the student just moved is never "doing the least"', () => {
    const lines = pieceQualityLines(at('e6', 'b2'), 'white', undefined, { isMiddlegame: true, justMovedTo: 'b2' });
    expect(lines.find((l) => l.kind === 'your-worst-piece')).toBeUndefined();
    // …and without that, the same board does name it (non-vacuous).
    expect(pieceQualityLines(at('e6', 'b2'), 'white', undefined, { isMiddlegame: true }).find((l) => l.kind === 'your-worst-piece')?.text).toMatch(/bishop on b2/);
  });
});
