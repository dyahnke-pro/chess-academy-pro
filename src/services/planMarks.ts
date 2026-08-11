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
// NO CAPS (David 2026-08-10). `MAX_ARROWS = 2` and `MAX_HIGHLIGHTS = 3` lived
// here and quietly discarded whatever ranked lowest, so a move the coach had
// stated could go unarrowed and a square it named unmarked.

export interface PlanMarks {
  arrows: BoardArrow[];
  highlights: BoardHighlight[];
}

// `squaresNamedIn` LIVED HERE and is gone (2026-08-10). It swept an utterance
// for anything square-shaped so the marks could be recovered from the prose,
// which is a validator — it cannot tell a square the sentence NAMED from one
// that merely appears in it, and it loses a mark whenever the grader trims a
// clause by a word. David: "It needs to be deterministic, handed in the
// package." The producer hands its squares over now; nothing parses them back
// out.


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
    const piece = board.get(from as never) as { color?: 'w' | 'b' } | undefined;
    if (!piece?.color) return false;
    // FROM THE MOVER'S SIDE OF THE BOARD, NOT WHOEVER HAPPENS TO BE ON MOVE.
    //
    // This asked `board.moves()`, which only ever returns moves for the side to
    // move — so every arrow about the OPPONENT's plan was impossible by
    // construction. David's game log, 2026-08-11: "They want to walk the bishop
    // round to b2, by way of f6" with ZERO arrows, four times in one game, and
    // the same silence on his own plans whenever it was the opponent's turn. He
    // read it as the feature not working, and he was right — it could not.
    //
    // A plan is about what happens NEXT, so the question is whether the piece
    // could make that move when it is its turn. A null move answers it: same
    // position, other side to play. `narrationArrows` has flipped turn for this
    // exact reason since it was written; the marks never learned to.
    if (piece.color === board.turn()) {
      return board.moves({ verbose: true }).some((m) => m.from === from && m.to === to);
    }
    const parts = board.fen().split(' ');
    if (parts.length < 4) return false;
    parts[1] = piece.color;
    parts[3] = '-'; // an en-passant square belongs to the side that just moved
    return new Chess(parts.join(' ')).moves({ verbose: true })
      .some((m) => m.from === from && m.to === to);
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
  /** THE PARTS OF THE UTTERANCE THAT SURVIVED, each still carrying its own
   *  squares — handed in, never recovered from the prose.
   *
   *  David 2026-08-10: "It needs to be deterministic, handed in the package."
   *
   *  This used to be a single `spoken: string`, and the marks were recovered
   *  from it two ways: a regex sweep for anything square-shaped, and a substring
   *  test of each clause's text against the joined utterance. Both are
   *  validators on prose. A regex cannot tell a square the sentence NAMED from
   *  one that merely appears in it, and a clause the grader trimmed by a word
   *  stops matching and silently loses its mark. The caller grades part by part
   *  now, so what survived is known exactly — it says so rather than leaving it
   *  to be inferred. */
  saidParts: ReadonlyArray<{ squares: readonly string[]; side: 'key' | 'mine' | 'theirs' }>;
  /** The live board. Every mark is checked against it. */
  fen: string;
  studentColor: 'white' | 'black';
}): PlanMarks {
  const { plan, saidParts, fen, studentColor } = args;
  let board: Chess;
  try { board = new Chess(fen); } catch { return { arrows: [], highlights: [] }; }

  const wanted: Array<{ square: string; side: 'key' | 'mine' | 'theirs' }> = [];
  const push = (square: string, side: 'key' | 'mine' | 'theirs'): void => {
    if (!/^[a-h][1-8]$/.test(square)) return;
    if (!wanted.some((w) => w.square === square)) wanted.push({ square, side });
  };
  // Spoken order, exactly as handed over. Which comes first is the caller's
  // decision — it says the key square before the plans, and theirs before mine,
  // what is coming at you before what you are doing about it — and none of that
  // is re-decided here.
  for (const part of saidParts) for (const sq of part.squares) push(sq, part.side);

  const myColor = studentColor === 'white' ? 'white' : 'black';
  const arrows: BoardArrow[] = [];
  const highlights: BoardHighlight[] = [];
  const addArrow = (startSquare: string, endSquare: string, color: string): void => {
    if (startSquare === endSquare) return;
    if (arrows.some((a) => a.startSquare === startSquare && a.endSquare === endSquare)) return;
    arrows.push({ startSquare, endSquare, color });
  };

  // ── THE PIECE WALKS, DRAWN HOP BY HOP ────────────────────────────────────
  // David 2026-08-10: "Any move the coach states as a future or possible
  // move/plan needs to be arrowed and key squares mentioned need to be
  // highlighted… Including piece walks."
  //
  // This is also what resolves his earlier complaint about "bad arrows, not
  // deterministically made" — f6-b6 and f6-c4 drawn out of one knight. A route
  // is wrong as ONE straight line from where the piece starts to where it ends
  // up: that line is not a move, and it skips the square the whole idea turns
  // on. It is right as a CHAIN — f3 to d2, then d2 to c4 — where every arrow is
  // a real ply of the engine's line and the student can see the order.
  //
  // Only the FIRST hop is checked for legality on this board, because it is the
  // only one that claims to be playable now. The later hops start from squares
  // the piece has not reached yet; that is what a plan IS, and the chain says so
  // by drawing them in sequence rather than pretending they are available.
  const spokeFor = new Set(saidParts.map((p) => p.side));
  const walks: Array<{ path: string[]; color: string }> = [];
  if (spokeFor.has('theirs') && plan.theirs.maneuver) {
    walks.push({ path: plan.theirs.maneuver.path, color: THEIRS });
  }
  if (spokeFor.has('mine') && plan.mine.maneuver) {
    walks.push({ path: plan.mine.maneuver.path, color: MINE });
  }
  for (const walk of walks) {
    const raw = walk.path.filter((sq) => /^[a-h][1-8]$/.test(sq));
    // STOP AT THE FIRST SQUARE THE PIECE COMES BACK TO. A route that revisits
    // c3 draws c3→a4 and later c3→e8, and two arrows out of one square read as
    // the piece going to both places at once — the very thing the one-arrow-per-
    // piece rule exists to prevent. `lookaheadPlan` already refuses a journey
    // that ENDS where it began ("a piece that comes home has not been
    // rerouted"); this is the same judgement applied mid-route.
    const path: string[] = [];
    for (const sq of raw) {
      if (path.includes(sq)) break;
      path.push(sq);
    }
    if (path.length < 3) continue; // two squares is a move, not a walk
    // The piece has to actually be standing where the walk begins, or the plan
    // was computed for a board that has since moved on.
    if (!board.get(path[0] as never)) continue;
    for (let i = 0; i + 1 < path.length; i += 1) {
      if (i === 0 && !isLegalNow(board, path[0], path[1])) break;
      addArrow(path[i], path[i + 1], walk.color);
      // Every square the walk passes through is a square the coach just named.
      push(path[i + 1], walk.color === MINE ? 'mine' : 'theirs');
    }
  }

  // ── EVERY SQUARE NAMED GETS ITS HIGHLIGHT. NO CAP ────────────────────────
  // There were caps here — two arrows, three highlights — and they silently
  // dropped whatever ranked lowest, so a stated move could go unarrowed and a
  // named square unmarked. That is the same defect as marking something never
  // said, pointing the other way: the student hears a square and finds nothing
  // on the board to look at. David: "No caps."
  for (const { square, side } of wanted) {
    if (highlights.some((h) => h.square === square)) continue;
    highlights.push({ square, color: side === 'key' ? KEY : side === 'mine' ? MINE : THEIRS });

    // THE FUTURE MOVE. The first time the line lands a piece on this square is
    // the move the sentence is describing; anything later is a different idea.
    const index = plan.path.findIndex((s) => s.to === square);
    if (index < 0) continue;
    // NEVER DRAW THE STUDENT'S OWN NEXT MOVE. An arrow is a from AND a to,
    // which is a move — and the one move that must stay theirs to find is the
    // one they are about to play. Everything deeper in the line is a plan
    // rather than an answer, and the square still gets its highlight here, so
    // the eye is led without the move being handed over. Consistent with the
    // rule above, too: the coach never STATES that move, so nothing goes
    // unarrowed that was spoken.
    if (index === 0 && plan.path[0].color === myColor) continue;
    const origin = originOf(plan.path, index, board);
    if (!origin || origin === square) continue;
    // Already drawn as part of a walk — the chain owns that piece's route.
    if (arrows.some((a) => a.endSquare === square)) continue;
    // Legal, from THIS board, in ONE move — or no arrow at all. See `isLegalNow`.
    if (!isLegalNow(board, origin, square)) continue;
    // ONE ARROW PER PIECE, outside a walk. The same knight heading for two
    // squares at two different moments drew two lines out of one square — even
    // when both were legal, that reads as the piece going to both places at
    // once. A walk is the honest way to say that, and it is drawn above.
    if (arrows.some((a) => a.startSquare === origin)) continue;
    addArrow(
      origin,
      square,
      // The arrow's colour follows whose MOVE it is, not whose square it is: a
      // piece of theirs arriving on a contested square is still a thing coming
      // at the student, and drawing that in "key square yellow" reads neutral.
      plan.path[index].color === myColor ? MINE : THEIRS,
    );
  }

  return { arrows, highlights };
}
