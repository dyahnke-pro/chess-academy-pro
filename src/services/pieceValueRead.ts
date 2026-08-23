// WHAT EVERY PIECE IS WORTH WHERE IT STANDS — Stockfish's own answer.
//
// David 2026-08-15, asked whether a second engine would help: the biggest
// untapped source is not another engine, it is the `eval` command in the one we
// already ship. It returns a per-square contribution table — what each piece is
// worth ON THE SQUARE IT IS ON:
//
//   |   R   |   N   |   B   |   Q   |   K   |       |       |   R   |
//   | +3.88 | +3.48 | +3.99 | +5.81 |       |       |       | +4.05 |
//                       N
//                     +3.80
//
// A knight on f3 at +3.80 against one still on b1 at +3.48 is the engine
// saying, per piece, which are working and which are asleep.
//
// 🔒 WHY THIS MATTERS MORE THAN IT LOOKS. `playCommentary.opponentsBestPiece`
// currently decides "their best piece" with a HAND-WRITTEN heuristic — and that
// is the exact function whose outpost test had its direction backwards and
// shipped "the knight on e4 sits on an outpost no pawn can challenge" with a
// white pawn on f2 one move from challenging it. Board-truth grading cannot
// catch a wrong positional JUDGEMENT; the knight really was on e4. So the cure
// is not another gate (G0 says so outright) — it is to stop guessing at a
// number the engine will hand over.
//
// This lane REMOVES judgement rather than adding it.
import type { Square } from 'chess.js';

export interface PieceValue {
  square: string;
  /** Piece letter as Stockfish prints it: uppercase white, lowercase black. */
  piece: string;
  color: 'w' | 'b';
  /** Pawns, signed as printed (white positive). */
  value: number;
}

const FILES = 'abcdefgh';

/**
 * Parse the board table out of `eval` output.
 *
 * The table is eight rank rows, rank 8 first, each row two lines: the piece
 * letters, then the values. Cells are pipe-delimited and fixed width; an empty
 * square is blank in both lines. Anything outside the table is ignored, so the
 * NNUE bucket table and the final-evaluation lines below it cost nothing.
 *
 * Returns [] on anything unexpected rather than guessing — a half-read board is
 * worse than no board, because every consumer would treat it as complete.
 */
export function parseEvalTable(raw: string): PieceValue[] {
  const lines = raw.split('\n');
  // A rank row is a piece line whose cells hold a single letter or nothing.
  // Matching on SHAPE rather than on a header keeps this working across
  // Stockfish versions that reword the surrounding prose.
  const isCellLine = (l: string): boolean => l.trimStart().startsWith('|') && l.includes('|');
  const cellsOf = (l: string): string[] => {
    const parts = l.split('|');
    // Leading/trailing fragments outside the outer pipes are not cells.
    return parts.slice(1, -1).map((c) => c.trim());
  };

  const out: PieceValue[] = [];
  let rank = 8;
  for (let i = 0; i < lines.length - 1 && rank >= 1; i += 1) {
    const pieceLine = lines[i];
    const valueLine = lines[i + 1];
    if (!isCellLine(pieceLine) || !isCellLine(valueLine)) continue;
    const pieces = cellsOf(pieceLine);
    const values = cellsOf(valueLine);
    if (pieces.length !== 8 || values.length !== 8) continue;
    // A piece row's non-empty cells are single letters; a value row's are
    // signed numbers. If that does not hold this is some other table (the NNUE
    // bucket table has the same pipes) and must be skipped, not misread.
    if (!pieces.every((c) => c === '' || /^[pnbrqkPNBRQK]$/.test(c))) continue;
    if (!values.every((c) => c === '' || /^[+-]?\d+(\.\d+)?$/.test(c.replace(/\s+/g, '')))) continue;

    for (let f = 0; f < 8; f += 1) {
      const piece = pieces[f];
      if (!piece) continue;
      const rawValue = values[f].replace(/\s+/g, '');
      if (!rawValue) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      out.push({
        square: `${FILES[f]}${rank}`,
        piece,
        color: piece === piece.toUpperCase() ? 'w' : 'b',
        value,
      });
    }
    rank -= 1;
    i += 1; // consume the value line
  }
  return out;
}

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** 🔒 THE BASELINE COMES FROM THE TABLE, NOT FROM CLASSICAL PIECE VALUES.
 *
 *  The first cut of this compared each piece against the textbook 3/3/5/9 and
 *  produced confident nonsense on the very first real position: Black's
 *  UNDEVELOPED c8 bishop was "the piece doing the most work for them", and the
 *  d1 queen on move 4 was "doing the least of anything you own".
 *
 *  Stockfish's table is not on the classical scale — measured on a live board,
 *  bishops print around 4.2 and queens around 5.8. So every queen scores
 *  ~3 "under" and every bishop ~1.2 "over", on every position, and the lane
 *  would have reported the same two pieces forever while sounding specific.
 *
 *  That is precisely the failure this file was written to remove — a plausible
 *  positional JUDGEMENT that board-truth grading cannot catch, because the
 *  bishop really is on c8. Swapping one hand-written scale for another would
 *  have reproduced the outpost bug in a new lane.
 *
 *  So the baseline is derived from THIS board: a piece is compared against the
 *  mean of its own type across the position. Scale-free, no constants to be
 *  wrong about, and it answers the question actually being asked — is this
 *  piece doing more or less than a piece of its kind is doing here. */
function meanByType(values: readonly PieceValue[]): Map<string, number> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const v of values) {
    const t = v.piece.toLowerCase();
    const cur = sums.get(t) ?? { total: 0, n: 0 };
    cur.total += Math.abs(v.value);
    cur.n += 1;
    sums.set(t, cur);
  }
  const out = new Map<string, number>();
  for (const [t, { total, n }] of sums) out.set(t, total / n);
  return out;
}

export interface PieceQualityLine {
  text: string;
  kind: 'their-best-piece' | 'your-worst-piece';
  squares: string[];
}

/**
 * The two sentences this table earns: their best-placed piece, and the
 * student's worst-placed one.
 *
 * Both are the Naroditsky staples the coach has been unable to say honestly —
 * "trade off their best piece" and "improve your worst piece" — and both are
 * now a MAXIMUM over engine numbers rather than a hand-written pattern.
 *
 * Kings are excluded: a king's contribution is dominated by safety terms and
 * "improve your worst piece — it's your king" is not advice.
 */
export function pieceQualityLines(
  values: readonly PieceValue[],
  studentColor: 'white' | 'black',
  said?: Set<string>,
  opts?: { isMiddlegame?: boolean },
): PieceQualityLine[] {
  const out: PieceQualityLine[] = [];
  if (values.length === 0) return out;
  const me: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';

  // Contribution is printed white-positive; each side's own good is the
  // magnitude in their direction.
  const own = (v: PieceValue): number => (v.color === 'w' ? v.value : -v.value);
  const playable = values.filter((v) => v.piece.toLowerCase() !== 'k');
  const mean = meanByType(values);
  /** How far this piece is above/below what its OWN KIND is managing here. */
  const delta = (v: PieceValue): number =>
    Math.abs(own(v)) - (mean.get(v.piece.toLowerCase()) ?? Math.abs(own(v)));

  const theirs = playable.filter((v) => v.color !== me);
  const mine = playable.filter((v) => v.color === me);

  // THEIR BEST — the piece outperforming its own kind by the most. Pawns are
  // excluded: a pawn's contribution swings on structure rather than on where
  // one pawn "is", and "trade off their best pawn" is not a plan.
  const best = theirs.filter((v) => v.piece.toLowerCase() !== 'p')
    .map((v) => ({ v, d: delta(v) }))
    .sort((a, b) => b.d - a.d)[0];
  if (best && best.d >= 0.3) {
    const key = `best-${best.v.square}`;
    if (!said?.has(key)) {
      said?.add(key);
      out.push({
        kind: 'their-best-piece',
        squares: [best.v.square],
        text: `Their ${NAME[best.v.piece.toLowerCase()]} on ${best.v.square} is the piece doing the most work for them — trading it off takes the sting out of the position.`,
      });
    }
  }

  // YOUR WORST — the piece underperforming its own kind by the most. ONLY a
  // MINOR (knight/bishop) qualifies: "reroute your bad knight" is the real
  // improve-your-worst-piece lesson. Pawns, the queen AND ROOKS are excluded —
  // a rook is activated by putting it on a file/rank, never "rerouted to a
  // better square", and the value-delta metric flagged an ACTIVE rook on d5 as
  // "your worst piece, find it a better square" in a live run (David 2026-08-23,
  // the same wrong-intent as the queen case). Danya reroutes minors, not rooks.
  // Also a MIDDLEGAME idea only — in the opening a minor is idle because it
  // isn't developed YET, not because it is misplaced (the caller passes phase).
  const worst = mine.filter((v) => v.piece.toLowerCase() === 'n' || v.piece.toLowerCase() === 'b')
    .map((v) => ({ v, d: delta(v) }))
    .sort((a, b) => a.d - b.d)[0];
  if (opts?.isMiddlegame !== false && worst && worst.d <= -0.3) {
    const key = `worst-${worst.v.square}`;
    if (!said?.has(key)) {
      said?.add(key);
      out.push({
        kind: 'your-worst-piece',
        squares: [worst.v.square],
        text: `Your ${NAME[worst.v.piece.toLowerCase()]} on ${worst.v.square} is doing the least of anything you own — finding it a better square is worth more than a new plan.`,
      });
    }
  }

  return out;
}

/** Squares as chess.js types them, for the callers that mark the board. */
export const asSquare = (s: string): Square => s as Square;

/** Where an advantage actually COMES FROM.
 *
 *  `eval` prints an NNUE bucket table under the board — Material (PSQT) against
 *  Positional (Layers) — and marks the bucket in use. The parser above read the
 *  board and stepped straight over it.
 *
 *  It answers a question a student asks constantly and the coach could not:
 *  am I better because I HAVE more, or because my pieces are BETTER? Those call
 *  for opposite plans — trade down and convert, or keep pieces on and press —
 *  and telling them apart by eye is exactly the judgement that goes wrong.
 *
 *  Read off the marked bucket, not averaged across all eight: the others are
 *  scored for material counts this position does not have. */
export interface EvalSplit {
  /** Pawns, white-POV. */
  material: number;
  positional: number;
}

export function parseEvalSplit(raw: string): EvalSplit | null {
  // The row in use is flagged "<-- this bucket is used". Numbers are printed
  // with the sign detached ("-  2.57"), so the space has to be closed up before
  // parsing or every negative reads as positive.
  const line = raw.split('\n').find((l) => /this bucket is used/.test(l));
  if (!line) return null;
  const cells = line.split('|').slice(1, -1).map((c) => c.replace(/\s+/g, ''));
  if (cells.length < 4) return null;
  const material = Number(cells[1]);
  const positional = Number(cells[2]);
  if (!Number.isFinite(material) || !Number.isFinite(positional)) return null;
  return { material, positional };
}

/** The sentence that split earns, or null when it would be noise. */
export function evalSplitLine(
  split: EvalSplit,
  studentColor: 'white' | 'black',
  said?: Set<string>,
): string | null {
  const sign = studentColor === 'white' ? 1 : -1;
  const material = split.material * sign;
  const positional = split.positional * sign;
  const total = material + positional;
  // A level position has no story here, and "you are very slightly better on
  // structure" is filler.
  if (Math.abs(total) < 0.5) return null;
  // Only worth saying when the two DISAGREE about where the edge lives —
  // otherwise it is just restating the evaluation.
  // 🔒 A RATIO, NOT A NEAR-ZERO TEST. The first cut fired only when one term was
  // essentially absent (`material <= 0.1`), and NNUE does not work that way —
  // it distributes the evaluation across both, so they move TOGETHER. Probed on
  // a position a full rook up, it read material 2.83 / positional 1.3 and said
  // NOTHING, because 1.3 is not <= 0.1. A threshold that cannot be met is a
  // dead lane wearing a condition, which is the failure this whole session has
  // been about.
  //
  // What the student needs is which term DOMINATES, so that is what is asked:
  // twice the other, either way. The rook position then reads material-led
  // (2.83 vs 1.3) and correctly advises simplifying.
  const key = positional >= Math.abs(material) * 2 && positional > 0.4 ? 'edge-positional'
    : material >= Math.abs(positional) * 2 && material > 0.4 ? 'edge-material'
      : null;
  if (!key || said?.has(key)) return null;
  said?.add(key);
  return key === 'edge-positional'
    ? 'Your edge here is not material — it is where your pieces are. Keep them on the board; trading down would hand it back.'
    : 'Your edge here is material rather than position, so simplifying is the plan: every trade makes the extra count for more.';
}
