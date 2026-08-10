// The board draws what the coach just said. Nothing else.
//
// David 2026-08-10, after reading a 251-finding prod log in which the coach
// spoke "d6 is the square this position turns on", "they bring their pieces
// toward c6 and d7" and "they want to land a pin, open the d-file" while the
// board stayed completely bare: "I want square highlights and arrows drawn
// about future moves, plans, and key squares."
//
// The standing rule already said so — "ARROWS + HIGHLIGHTS LEAD THE EYE ON
// EVERY NARRATED MOVE… naming a square in the narration without an
// arrow/highlight on it is a DEFECT" — and the computed lanes were shipping
// without it. The student heard four squares and had to hunt for all four.
//
// THE COUPLING IS THE WHOLE DESIGN. A mark is drawn only for a square the
// SPOKEN sentence actually names, and only from the same look-ahead line that
// sentence was read off. That is what makes these marks unable to lie in a way
// the words did not already: if the package refused a claim, its square is not
// in the text, so nothing is drawn for it. The alternative — computing marks
// from the plan independently of what survived into speech — is how an arrow
// ends up pointing at a claim the grader threw out, which is the same lie
// drawn instead of said.
//
// It also means no arrow ever hands over a move. The plan lane is SAN-free by
// construction; it names DESTINATIONS ("plant a piece on d5"), never moves. An
// arrow to a destination the coach has already said out loud adds no
// information — it only saves the student the hunt, which is its entire job.
import { Chess } from 'chess.js';
import type { BoardArrow, BoardHighlight } from '../types';
import type { LookaheadPlan, PlanStep } from './lookaheadPlan';

/** Lead-the-eye colours, per the locked colour language: YELLOW = a key square
 *  the narration names, GREEN = the student's own intentions, RED = what is
 *  coming AT them. Red is reserved for the opponent's half so the board reads
 *  the way the sentence does — "they want…" is a warning, "you want…" is not. */
const KEY = '#eab308';
const MINE = '#22c55e';
const THEIRS = '#ef4444';

/** How many marks this lane may add.
 *
 *  Four arrows already crowd the board (David 2026-08-07: five arrows on screen
 *  at once, "the arrows are hallucinating"), and the turn's other producers —
 *  the threat arrow, the note's lead-the-eye pass — draw into the same budget.
 *  Two arrows is the plan showing where the play goes; a third is a diagram. */
const MAX_ARROWS = 2;
const MAX_HIGHLIGHTS = 3;

export interface PlanMarks {
  arrows: BoardArrow[];
  highlights: BoardHighlight[];
}

/** Squares the utterance actually names, in the order it names them.
 *
 *  Order matters: the sentence is ranked most-important-first by `describePlan`,
 *  so reading squares left to right and taking the first few gives the marks the
 *  same priority the words have, for free. */
export function squaresNamedIn(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  // Bounded so "d-file" and "e4-pawn" are read correctly (`d` alone is not a
  // square; `e4` inside a hyphenated compound is) and a stray "1.e4" cannot
  // contribute a square that was never spoken as one.
  for (const m of text.matchAll(/\b([a-h][1-8])\b/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); }
  }
  return out;
}

/**
 * Where the piece that ends up on `square` is standing RIGHT NOW.
 *
 * The line may move the same piece twice — a knight going f3→d4→b5 is one plan
 * and three squares — so the arrow has to start where the student can actually
 * see the piece, not at the halfway house. Walks the chain backwards through
 * the line, then checks the board: a `from` square with nothing on it is a mark
 * pointing at empty air, and is dropped rather than drawn.
 */
function originOf(path: readonly PlanStep[], index: number, board: Chess): string | null {
  let from = path[index].from;
  const color = path[index].color;
  for (let i = index - 1; i >= 0; i -= 1) {
    const step = path[i];
    if (step.color === color && step.to === from) from = step.from;
  }
  let piece: { color?: string } | undefined;
  try { piece = board.get(from as never) as { color?: string } | undefined; } catch { return null; }
  if (!piece) return null;
  // The piece standing there now must be the one the line moves, or the arrow
  // describes somebody else's journey.
  return piece.color === (color === 'white' ? 'w' : 'b') ? from : null;
}

/**
 * IS THIS ARROW A MOVE SOMEBODY COULD ACTUALLY PLAY, RIGHT NOW?
 *
 * David 2026-08-10, from a live screenshot: "bad arrows, not deterministically
 * made." The board showed `f6-b6` and `f6-c4` — a knight on f6 reaching neither
 * square in one move, drawn as two straight lines out of the same piece.
 *
 * The cause was this file's own cleverness. `originOf` walks the chain back so a
 * knight going f3→d4→b5 is drawn from where the student can SEE it, which reads
 * well in prose and draws a line through squares the piece never travels. Three
 * moves compressed into one arrow is indistinguishable from a hallucination, and
 * the student is right not to trust it.
 *
 * So the arrow now has to survive chess.js: legal, from this position, this
 * move. Journeys keep their destination HIGHLIGHT — the eye is still led, and
 * nothing on the board claims a move that isn't there.
 */
function isLegalNow(board: Chess, from: string, to: string): boolean {
  try {
    return board.moves({ verbose: true }).some((m) => m.from === from && m.to === to);
  } catch {
    return false;
  }
}

/**
 * The marks for one spoken utterance.
 *
 * `spoken` is the text the student HEARD — post-verification, post-grading. Pass
 * the package's own `spoken` string, never the pre-grade draft.
 */
export function planMarks(args: {
  plan: LookaheadPlan;
  spoken: string;
  /** The live board. Every mark is checked against it. */
  fen: string;
  studentColor: 'white' | 'black';
}): PlanMarks {
  const { plan, spoken, fen, studentColor } = args;
  let board: Chess;
  try { board = new Chess(fen); } catch { return { arrows: [], highlights: [] }; }

  // WHAT WAS ACTUALLY SAID, square by square, IN SPOKEN ORDER.
  //
  // Two sources, and both are gated on the same thing — presence in `spoken`:
  //
  //  · the KEY SQUARE, which names itself out loud ("d6 is the square this
  //    position turns on"), so a text scan settles it;
  //  · each PLAN CLAUSE, which often names nothing ("bring pieces at your
  //    king") and carries its own computed squares. A clause is only drawn when
  //    its exact text is in the utterance, which matters because the caller
  //    slices the plan's sentences by hint register — an unspoken half of the
  //    plan must not reach the board.
  const named = new Set(squaresNamedIn(spoken));
  const wanted: Array<{ square: string; side: 'key' | 'mine' | 'theirs' }> = [];
  const push = (square: string, side: 'key' | 'mine' | 'theirs'): void => {
    if (!/^[a-h][1-8]$/.test(square)) return;
    if (!wanted.some((w) => w.square === square)) wanted.push({ square, side });
  };

  // The key square first: it is the one fact about the position rather than
  // about a side, and it is what David quoted back.
  for (const k of plan.keySquares) if (named.has(k.square)) push(k.square, 'key');
  // Then THEIRS before MINE, matching the order the caller speaks them in —
  // what is coming at you before what you are doing about it.
  for (const clause of plan.theirs.spokenClauses) {
    if (!spoken.includes(clause.text)) continue;
    for (const sq of clause.squares) push(sq, 'theirs');
  }
  for (const clause of plan.mine.spokenClauses) {
    if (!spoken.includes(clause.text)) continue;
    for (const sq of clause.squares) push(sq, 'mine');
  }
  if (wanted.length === 0) return { arrows: [], highlights: [] };

  const myColor = studentColor === 'white' ? 'white' : 'black';
  const arrows: BoardArrow[] = [];
  const highlights: BoardHighlight[] = [];

  for (const { square, side } of wanted) {
    if (highlights.length < MAX_HIGHLIGHTS) {
      highlights.push({ square, color: side === 'key' ? KEY : side === 'mine' ? MINE : THEIRS });
    }

    // THE FUTURE MOVE. The first time the line lands a piece on this square is
    // the move the sentence is describing; anything later is a different idea.
    if (arrows.length >= MAX_ARROWS) continue;
    const index = plan.path.findIndex((s) => s.to === square);
    if (index < 0) continue;
    // NEVER DRAW THE STUDENT'S OWN NEXT MOVE. An arrow is a from AND a to,
    // which is a move — and the one move that must stay theirs to find is the
    // one they are about to play. Everything deeper in the line is a plan
    // rather than an answer, and the square still gets its highlight here, so
    // the eye is led without the move being handed over. This is the honesty
    // contract the plan lane keeps in words (it is SAN-free by construction);
    // the marks have to keep it too or the words were pointless.
    if (index === 0 && plan.path[0].color === myColor) continue;
    const origin = originOf(plan.path, index, board);
    if (!origin || origin === square) continue;
    // Legal, from THIS board, in ONE move — or no arrow at all. See `isLegalNow`.
    if (!isLegalNow(board, origin, square)) continue;
    if (arrows.some((a) => a.startSquare === origin && a.endSquare === square)) continue;
    // ONE ARROW PER PIECE. The same knight heading for two squares at two
    // different moments drew two lines out of one square — even when both were
    // legal, that reads as the piece going to both places at once.
    if (arrows.some((a) => a.startSquare === origin)) continue;
    arrows.push({
      startSquare: origin,
      endSquare: square,
      // The arrow's colour follows whose MOVE it is, not whose square it is: a
      // piece of theirs arriving on a contested square is still a thing coming
      // at the student, and drawing that in "key square yellow" reads neutral.
      color: plan.path[index].color === myColor ? MINE : THEIRS,
    });
  }

  return { arrows, highlights };
}
