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
import { Chess, type Square } from 'chess.js';
import { CAPTURE_VALUE } from './pieceValues';

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

/** The colour's OUTPERFORMING piece — highest contribution vs its own KIND (the
 *  outpost knight, not the naturally-big queen). Exported for the perturbation
 *  why-probe, which asks what that piece leans on. Excludes king + pawns; null
 *  when the side has no such piece or the table is empty. Reuses the same
 *  scale-free delta as pieceQualityLines, so the two never disagree on "best". */
export function strongestByDelta(
  values: readonly PieceValue[],
  color: 'w' | 'b',
): { square: string; piece: string; contribution: number; delta: number } | null {
  if (values.length === 0) return null;
  const own = (v: PieceValue): number => (v.color === 'w' ? v.value : -v.value);
  const mean = meanByType(values);
  const cand = values.filter((v) => v.color === color && !'kp'.includes(v.piece.toLowerCase()));
  if (cand.length === 0) return null;
  const best = cand
    .map((v) => ({ v, d: Math.abs(own(v)) - (mean.get(v.piece.toLowerCase()) ?? Math.abs(own(v))) }))
    .sort((a, b) => b.d - a.d)[0];
  return { square: best.v.square, piece: best.v.piece, contribution: +Math.abs(own(best.v)).toFixed(2), delta: +best.d.toFixed(2) };
}

export interface PieceQualityLine {
  text: string;
  kind: 'their-best-piece' | 'your-worst-piece';
  squares: string[];
}

/**
 * 🚨 A PIECE THAT HAS NEVER MOVED IS NOT "DOING THE MOST WORK" (found reading a
 * real prod game, 2026-09-18).
 *
 * On move THREE of the Scandinavian the coach said, three times: "Their rook on
 * a1 is the piece doing the most work for them — trading it off takes the sting
 * out of the position." That rook is on its starting square, has no legal move,
 * and cannot be traded. It won the lane only because the comparison is RELATIVE
 * — a piece is measured against the mean of its own KIND on this board, so with
 * both rooks asleep the one that happens to defend a2 edges the other and gets
 * crowned. A relative ranking with no floor always names somebody.
 *
 * The `d >= 0.3` bar does not catch it: that measures how far the piece is above
 * its own kind, never whether its kind is doing anything at all.
 *
 * Note this is NOT a rook ban. "Their rook on the open d-file is doing the most
 * work — trade it off" is real teaching, so the guard lifts once the piece has
 * actually moved, or once the game reaches a middlegame where a home-square rook
 * can genuinely own an open file.
 */
const HOME_SQUARES: Record<'w' | 'b', Record<string, readonly string[]>> = {
  w: { r: ['a1', 'h1'], n: ['b1', 'g1'], b: ['c1', 'f1'], q: ['d1'], k: ['e1'], p: [] },
  b: { r: ['a8', 'h8'], n: ['b8', 'g8'], b: ['c8', 'f8'], q: ['d8'], k: ['e8'], p: [] },
};

/** No pawn of the rook's own colour stands on its file. Unknown board → false. */
function rookFileFree(fen: string | undefined, v: PieceValue): boolean {
  if (!fen) return false;
  const file = v.square.toLowerCase()[0];
  const pawn = v.color === 'w' ? 'P' : 'p';
  const rows = fen.split(' ')[0].split('/');
  const col = file.charCodeAt(0) - 97;
  for (const row of rows) {
    let c = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { c += Number(ch); continue; }
      if (c === col && ch === pawn) return false;
      c += 1;
    }
  }
  return true;
}

function onHomeSquare(v: PieceValue): boolean {
  const side = v.color === 'w' ? 'w' : 'b';
  return (HOME_SQUARES[side][v.piece.toLowerCase()] ?? []).includes(v.square.toLowerCase());
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
  opts?: {
    isMiddlegame?: boolean;
    fen?: string;
    /** The square the student's own last move landed on. That piece is never
     *  "doing the least" — telling them to move the piece they just placed
     *  contradicts their move (hand walk 1380, 10.Nf3: "your knight on f3 is
     *  doing the least — find it a better square"). */
    justMovedTo?: string;
  },
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
  // Home-square pieces are out until the middlegame — see `onHomeSquare`. The
  // sibling branch below already excludes rooks and gates on `isMiddlegame`;
  // this branch had neither guard, which is how a move-3 rook won the lane.
  // …and before the middlegame a MINOR is never "the best piece" (walk 5,
  // L3a). On move two a freshly developed Nc6 outscores its twin still on g8,
  // so the relative ranking crowned it and the coach told the student to trade
  // off a knight that had moved once. In the opening a developed minor is just
  // development — it measures which one left home first, the same rule as
  // undeveloped ≠ misplaced on the student's side. A rook or queen that is
  // already doing work this early IS the exception worth naming.
  const best = theirs.filter((v) => v.piece.toLowerCase() !== 'p')
    .filter((v) => opts?.isMiddlegame === true || !onHomeSquare(v))
    .filter((v) => opts?.isMiddlegame === true || !'nb'.includes(v.piece.toLowerCase()))
    // …and a pre-middlegame ROOK counts as "doing work" only on a file free of
    // its own pawns. Castling is not work: on move six of a Philidor (hand walk
    // 2026-09-24) the rook that had just castled to f8, behind its own f7-pawn,
    // was crowned "the piece doing the most work for them".
    .filter((v) => opts?.isMiddlegame === true || v.piece.toLowerCase() !== 'r' || rookFileFree(opts?.fen, v))
    // …and a piece the student can simply TAKE is not one to "trade off"
    // (hand walk 2000: Rxd8 just took, nothing defended it, and the coach said
    // "their rook on d8 is the piece doing the most work — trade it off").
    .filter((v) => !takeableFree(opts?.fen, v.square, me))
    // …and never a knight on the rim: the fundamentals call that knight
    // misplaced ("knight-to-the-rim"), and one vocabulary cannot crown it
    // their best piece in the next breath (walk 900, 9…a6: "their knight on
    // a3 is the piece doing the most work").
    .filter((v) => !(v.piece.toLowerCase() === 'n' && 'ah'.includes(v.square[0])))
    .map((v) => ({ v, d: delta(v) }))
    .sort((a, b) => b.d - a.d)[0];
  // SAY-ONCE ON THE KIND, PER PHASE — not per square (re-walk 1380,
  // 2026-09-25: keyed on the square, "their X is the piece doing the most
  // work" spoke on six moves, a different piece each time). The advice is
  // one idea — trade off their best piece — and a new square is not a new
  // idea. It returns once when the game changes phase.
  const phase = opts?.isMiddlegame === true ? 'middlegame' : 'opening';
  if (best && best.d >= 0.3) {
    const key = `best:${phase}`;
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
    .filter((v) => !atWork(opts?.fen, v.square, me))
    .filter((v) => v.square !== opts?.justMovedTo)
    .map((v) => ({ v, d: delta(v) }))
    .sort((a, b) => a.d - b.d)[0];
  if (opts?.isMiddlegame !== false && worst && worst.d <= -0.3) {
    const key = `worst:${phase}`;
    if (!said?.has(key)) {
      said?.add(key);
      out.push({
        kind: 'your-worst-piece',
        squares: [worst.v.square],
        // Still on its home square it is UNDEVELOPED, not misplaced — the
        // advice is the development rule, not a reroute (hand walk
        // 2026-09-24: the c1-bishop at move nine; his line a few moves later
        // was "never forget about development — you still have a whole side
        // to finish").
        text: onHomeSquare(worst.v)
          ? `Your ${NAME[worst.v.piece.toLowerCase()]} on ${worst.v.square} hasn't moved yet — in general, finish your development before starting anything new.`
          : `Your ${NAME[worst.v.piece.toLowerCase()]} on ${worst.v.square} is doing the least of anything you own — finding it a better square is worth more than a new plan.`,
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

/** A MINOR THAT IS ATTACKING OR PINNING AN ENEMY PIECE IS NOT "DOING THE
 *  LEAST" (hand walk 2026-09-24): the value table called the f4-bishop pinning
 *  a bishop to the queen, and the g2-bishop raking the long diagonal onto b7,
 *  "your worst piece". Attacking a non-pawn, or standing behind one that shields
 *  something bigger, is work the table cannot see. */
/** The student attacks `square` and nothing of theirs defends it. */
function takeableFree(fen: string | undefined, square: string, me: 'w' | 'b'): boolean {
  if (!fen) return false;
  try {
    const b = new Chess(fen);
    const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
    return b.attackers(square as Square, me).length > 0 && b.attackers(square as Square, them).length === 0;
  } catch { return false; }
}

function atWork(fen: string | undefined, square: string, me: 'w' | 'b'): boolean {
  if (!fen) return false;
  const VAL = CAPTURE_VALUE;
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return false; }
  const sq = square as Square;
  // PRESSURE ON THE KING'S SQUARES IS WORK (hand walk 2026-09-24: 23.Bxe6+ —
  // the bishop that had just checked, raking g8 beside the h8-king, was "doing
  // the least of anything you own").
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== them || cell.type !== 'k') continue;
      const kf = cell.square.charCodeAt(0);
      const kr = Number(cell.square[1]);
      for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
        if (df === 0 && dr === 0) continue;
        const f = kf + df; const r = kr + dr;
        if (f < 97 || f > 104 || r < 1 || r > 8) continue;
        if (board.attackers(`${String.fromCharCode(f)}${r}` as Square, me).includes(sq)) return true;
      }
    }
  }
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== them || cell.type === 'p') continue;
      if (board.attackers(cell.square, me).includes(sq)) return true;
      // X-RAY: lift the enemy piece — does this minor now hit something bigger?
      let lifted: Chess;
      try { lifted = new Chess(fen); lifted.remove(cell.square); } catch { continue; }
      for (const row2 of lifted.board()) {
        for (const c2 of row2) {
          if (!c2 || c2.color !== them || (VAL[c2.type] ?? 0) <= (VAL[cell.type] ?? 0)) continue;
          if (lifted.attackers(c2.square, me).includes(sq) && !board.attackers(c2.square, me).includes(sq)) return true;
        }
      }
    }
  }
  return false;
}
