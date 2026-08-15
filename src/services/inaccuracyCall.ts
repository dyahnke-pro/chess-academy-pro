// "That was inaccurate — here is what should have been played, and why."
//
// David 2026-08-10: "The coach needs to call out inaccurate play for both sides
// and explain what should have been played and why. Is that part of the PV?"
//
// NO, AND THE DISTINCTION MATTERS. A principal variation is the engine's best
// line FROM a position: it says what should happen. A mistake is by definition a
// move that is NOT in that line, so the line can never name one. What identifies
// a mistake is the COMPARISON — eval before the move against eval after — and
// the PV supplies only the second half: WHY the better move was better.
//
// 🔒 THE BANDS ARE NOT MINE. `classifyMove` in `moveRating` owns them and this
// file defers to it completely. The first draft invented its own thresholds at
// 50/100/200 — which would have made the same move a "mistake" here and an
// "inaccuracy" in review, teaching the student that the words mean nothing.
// David caught it: "We already have a delta built for review with coach."
//
// The bands themselves have since moved to `engineConstants` and are SHARED with
// the review's own classifier (50/100/300, the Stockfish convention), because
// `moveRating` and `classifyCpLoss` had been carrying different numbers all
// along — the same drift, one level up. See that file.
//
// It also costs NO extra search. The eval after the student's move is the eval
// BEFORE the coach's reply, and the eval after the coach's reply is already
// computed to build the plan. The delta sits between two numbers the app has.
//
// G0 throughout: severity is arithmetic, the better move comes from the engine,
// and the reason comes from replaying the engine's own line. Nothing here asks a
// model what it thinks.
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';
import { classifyMove, type MoveQuality } from './moveRating';
import { MISTAKE_CP } from './engineConstants';

export interface InaccuracyCall {
  /** Straight from `moveRating.classifyMove` — never re-derived here. */
  quality: MoveQuality;
  /** Who played it. */
  side: 'student' | 'coach';
  /** Centipawns handed over, always positive. */
  cost: number;
  /** The spoken line. Past tense — the move has happened. */
  said: string;
  /** The square to mark: where the better move was going. '' when unknown. */
  square: string;
}

/** Only the three that are worth stopping for. `good` and above stay silent —
 *  a coach that comments on every move teaches nothing. */
const WORTH_SAYING: ReadonlySet<MoveQuality> = new Set(['inaccuracy', 'mistake', 'blunder']);

/** What the better move was FOR, read off the engine's own line from it.
 *
 *  This is the PV doing the half it can do. Not "the engine likes it by 40
 *  centipawns" — a number a student can neither see nor use — but the plan the
 *  move actually produces: the piece it wins, the file it opens, the square it
 *  takes. Null when the line is too short to describe, in which case the call
 *  still names the move and simply stops there. */
function whyBetter(
  fenBefore: string,
  bestUci: readonly string[],
  moverColor: 'white' | 'black',
): { why: string; square: string } | null {
  if (bestUci.length < 4) return null;
  const plan = planFromUci(fenBefore, bestUci, moverColor);
  const text = plan?.mine.text?.trim();
  if (!text) return null;
  // "You want to win a pawn and open the d-file." → "win a pawn and open the
  // d-file". The clause is reused; the frame is not.
  //
  // FIRST SENTENCE ONLY (`[^.]+`, not `.+?` to the end of the string). The plan
  // may append a second, separate observation — "Worth noticing: your pieces on
  // a1, d1 and f1 sit this one out entirely" — and an end-anchored match
  // swallows it, so the callout becomes "Na5 was the move — it would win a pawn.
  // Worth noticing: your pieces on a1…". Grammatically it promotes a noticing
  // into a reason; that is the same defect that took the idle-piece clause out
  // of the want-list in the first place, arriving by a different door.
  // ── ONE REASON, THE BEST ONE — NOT THE WHOLE WANT-LIST ──────────────────
  //
  // Caught on prod 2026-08-11: "Nxe5 was the move — it would walk the bishop
  // round to b3, by way of f7, swing pieces toward their king, pull the pawns
  // away from their king and win a pawn." Five clauses in one breath. Every one
  // true and board-verified; the sentence is still unusable.
  //
  // The plan is UNCAPPED on purpose (David 2026-08-10: "I want to hear
  // everything the PV has to say. Do not limit it.") and that is right FOR THE
  // PLAN — it is the forward-looking read, and the student is listening to it
  // as such. The callout is a different register: it names one move and says
  // why that move, so it wants the single strongest reason.
  //
  // This is not a cap put back. `describePlan` already SORTS its clauses by
  // weight and `spokenClauses` preserves that order, so the leader is the plan's
  // own answer to "the most important thing this move does". Taking it is a
  // selection from ranked data, and it reads the STRUCTURE rather than
  // re-splitting the joined prose — which cannot be split safely anyway, since a
  // clause carries its own commas ("walk the bishop round to b3, by way of f7").
  const lead = plan?.mine.spokenClauses[0];
  if (lead?.text) return { why: lead.text, square: lead.squares[0] ?? '' };
  // No clause carried a square (the drift line, and anything square-less that
  // outranked it) — fall back to the sentence, which in that case IS one clause.
  const want = /^You want to ([^.]+)\./.exec(text);
  if (!want) return null;
  const square = plan?.mine.spokenClauses.flatMap((c) => c.squares)[0] ?? '';
  return { why: want[1], square };
}

/**
 * Call an inaccuracy, on either side.
 *
 * Silent when the move was good enough, silent when it WAS the best move, and
 * silent when the engine offered no alternative — "you should have played
 * something else" is not teaching.
 */
export function callInaccuracy(args: {
  /** Position before the move in question. */
  fenBefore: string;
  /** What was actually played, SAN. */
  playedSan: string;
  /** The engine's preferred move for the same side, SAN. */
  bestSan: string | null;
  /** The engine's whole line from `fenBefore`, UCI — the "why". */
  bestLineUci?: readonly string[];
  /** Centipawns the played move cost its own side, mover's perspective. */
  cpLoss: number;
  /** Mate the mover missed / walked into — `classifyMove` treats either as a
   *  blunder regardless of the centipawns, and so must this. */
  missedMate?: number | null;
  allowedMate?: number | null;
  /** Whose move it was. */
  side: 'student' | 'coach';
  moverColor: 'white' | 'black';
}): InaccuracyCall | null {
  const bare = (s: string): string => s.replace(/[+#]$/, '');
  const wasBest = Boolean(args.bestSan) && bare(args.playedSan) === bare(args.bestSan ?? '');
  const quality = classifyMove({
    wasBest,
    cpLoss: Math.max(0, args.cpLoss),
    missedMate: args.missedMate ?? null,
    allowedMate: args.allowedMate ?? null,
  });
  if (!WORTH_SAYING.has(quality)) return null;
  // THE BANDS ARE STOCKFISH'S; THE FLOOR IS PEDAGOGY, AND THEY ARE NOT THE SAME
  // DECISION. Sharing `classifyMove`'s thresholds with the review (2026-08-10)
  // moved the start of 'inaccuracy' from 100 centipawns down to 50, which is
  // what the review has always called it — but a coach that stops to comment on
  // every half-pawn wobble teaches the student to stop listening. So the WORD
  // now means the same thing on both surfaces while the coach speaks from
  // exactly the same point it always did. Mate is exempt: walking into one is
  // worth saying whatever the centipawns read.
  const forcedMate = (args.missedMate ?? null) !== null || (args.allowedMate ?? null) !== null;
  if (!forcedMate && Math.max(0, args.cpLoss) < MISTAKE_CP) return null;
  if (!args.bestSan || wasBest) return null;

  // A "best move" that is not legal from this board means the caller handed in
  // a mismatched pair; say nothing rather than narrate a phantom.
  try {
    const board = new Chess(args.fenBefore);
    if (!board.moves().some((m) => bare(m) === bare(args.bestSan ?? ''))) return null;
  } catch {
    return null;
  }

  // ── WHEN THE MOVE WALKED INTO MATE, THAT IS THE WHY ─────────────────────
  //
  // David 2026-08-15: "Stating why a certain move is better than another?"
  // Measured on a Scholar's-mate blunder, the answer was "g6 was the move — it
  // would bring pieces to d6 and d7 over the next few moves." True, and a
  // ludicrous thing to say about the move that stops mate in one. `whyBetter`
  // reads the want-list of the line the better move produces, and a line that
  // simply survives has no want-list worth the name — so the weakest clause on
  // the board wins by default at the single highest-stakes moment in a game.
  //
  // COMPUTED, NOT ASSERTED (G0), and scoped to what can be settled without an
  // engine: replay the better move and ask chess.js whether the opponent still
  // has mate on the spot. Only claimed for `allowedMate === 1`, because that is
  // the depth a one-ply legal-move scan can actually prove — a deeper mate needs
  // a search this function is not given and would be a claim we have not earned.
  const stopsMate = ((): boolean => {
    if (args.allowedMate !== 1 || !args.bestSan) return false;
    try {
      const b = new Chess(args.fenBefore);
      if (!b.move(args.bestSan)) return false;
      return !b.moves().some((m) => {
        const probe = new Chess(b.fen());
        try { probe.move(m); } catch { return false; }
        return probe.isCheckmate();
      });
    } catch { return false; }
  })();

  const better = stopsMate
    ? { why: 'stop the mate', square: '' }
    : args.bestLineUci
      ? whyBetter(args.fenBefore, args.bestLineUci, args.moverColor)
      : null;
  const cost = Math.round(Math.max(0, args.cpLoss));

  // THE COACH OWNS ITS OWN MISTAKES, IN THE FIRST PERSON, AND HANDS THE STUDENT
  // THE PUNISHMENT. Naming the move here is correct and is NOT the honesty
  // contract being bent: that contract withholds the STUDENT's move so they
  // have something to find. A move the coach has already played is on the
  // board — hiding it would be coyness, not teaching.
  if (args.side === 'coach') {
    const head = quality === 'blunder'
      ? `That was a blunder from me — ${args.playedSan} gives away real material.`
      : quality === 'mistake'
        ? `That was a mistake from me. ${args.playedSan} is not what the position wanted.`
        : `A touch inaccurate from me — ${args.playedSan} is not quite right.`;
    const should = better ? ` ${args.bestSan} was the move, to ${better.why}.` : ` ${args.bestSan} was the move.`;
    // The punishment stays theirs to find — the same shape as every other
    // opportunity beat. An inaccuracy is too small to promise anything.
    const punish = quality === 'inaccuracy' ? '' : ' There is something here for you now — go and take it.';
    return { quality, side: 'coach', cost, said: `${head}${should}${punish}`, square: better?.square ?? '' };
  }

  // THE STUDENT'S OWN MOVE, in the retroactive register the backward look uses:
  // past tense, second person, no scolding. `whatItAllowed` already says what
  // the move LET THEM DO; this is the half that was missing — what should have
  // been played, and what it would have done.
  const head = quality === 'blunder'
    ? `${args.playedSan} was a blunder.`
    : quality === 'mistake'
      ? `${args.playedSan} was a mistake.`
      : `${args.playedSan} was a little loose.`;
  const should = better ? ` ${args.bestSan} was the move — it would ${better.why}.` : ` ${args.bestSan} was the move.`;
  return { quality, side: 'student', cost, said: `${head}${should}`, square: better?.square ?? '' };
}
