// THE BACKWARD LOOK — one model, two callers.
//
// Everything the coach says about a move ALREADY PLAYED comes out of here: what
// it structurally gave up, what should have been played instead, and failing
// both, what it let the opponent do. Three lanes, one priority order, one
// place.
//
// 🔒 WHY IT IS ITS OWN MODULE (David 2026-08-10: "Chop down into one model to
// maintain consistency plz", and the same day: "make sure that every thing we
// have added is wired and working 100%").
//
// This logic used to live inline inside `useDiscussionPractice`, which is
// bookkeeping — it feeds My Mistakes, the drill queue and the weakness spine —
// and on the Learn surface that hook is invoked behind a DELIBERATE
// `setTimeout(…, 6000)`, so the engine worker stays free for narration. That is
// correct for bookkeeping and fatal for speech: the voice read the hook's state
// two seconds after the student moved, so it was reading the result of the
// PREVIOUS move. A stale drawback does not go quiet, it MISATTRIBUTES — the
// coach says "that took your last defender off e5" about a move from two plies
// ago, and it is fluent, confident and wrong. Exactly the class of lie David
// has said there is no room for.
//
// So the computation moved here, where a caller that needs it NOW can run it
// synchronously off analyses it already has, and the hook keeps calling the
// same function for its own records. Two callers, one answer, by construction —
// they cannot drift, because there is only one implementation to drift from.
//
// G0 throughout: every branch is arithmetic or chess.js geometry over an engine
// line. Nothing here asks a model anything.
import { findConcession, findStudentDrawback, whatItAllowed } from './concessionBeat';
import { callInaccuracy } from './inaccuracyCall';
import { whyItFailed } from './whyItFailed';
import { INACCURACY_CP } from './engineConstants';

export interface BackwardLook {
  /** The spoken line. Past tense — the move has happened. */
  line: string;
  /** The square to mark, '' when there is nothing to point at. */
  square: string;
  /** Which package lane it rides. `mistake` is the student's callout and leads
   *  the computed lanes; `drawback` is the concession a rung below it; and
   *  everything the COACH says about its own move rides `coachMistake`, which
   *  David placed "number two on the list, right behind the mistake call out".
   *  One lane for the coach because it is one voice — owning a blunder and
   *  owning a positional concession are the same act at different scales. */
  kind: 'mistake' | 'drawback' | 'coachMistake';
}

/**
 * What to say about the move the student just played, or null for silence.
 *
 * Silence is the common case and the correct one: an ordinary move has no
 * backward look, and inventing one for it teaches the student to tune the coach
 * out. Each lane below refuses on its own terms rather than reaching for
 * something to say.
 */
export function backwardLook(args: {
  /** Position before the student moved. */
  fenBefore: string;
  /** Position after the student moved — the opponent is on move. */
  fenAfter: string;
  playedSan: string;
  /** The engine's preferred move at `fenBefore`. Null → the first two lanes
   *  cannot run; the third still can. */
  bestSan: string | null;
  /** The engine's line from `fenBefore`, UCI — supplies the "why" for the
   *  callout. */
  bestPvUci?: readonly string[];
  /** The opponent's best line from `fenAfter`, UCI — what the move allowed. */
  replyPvUci?: readonly string[];
  /** Centipawns the move cost, from the MOVER's own perspective. */
  cpLoss: number;
  /** The MOVER's colour — the student's on the default path, the coach's when
   *  `side` is 'coach'. Named for the common case; read as "whose move this
   *  is about". */
  studentColor: 'white' | 'black';
  /** Mate the mover missed / walked into. `classifyMove` calls either a
   *  blunder whatever the centipawns say, and a mate score expressed as a
   *  six-figure centipawn swing would otherwise be reported as a "cost" of
   *  100,000. */
  missedMate?: number | null;
  allowedMate?: number | null;
  /** WHOSE move is being looked back at. Defaults to the student.
   *
   *  The coach's own moves go through the SAME function deliberately. They ask
   *  the identical question — what did that move give up, and what should have
   *  been played — and the only differences are the pronoun and the fact that
   *  the coach may name its own move, because it is already on the board. Two
   *  implementations of one question is how "inaccuracy" comes to mean one
   *  thing on one surface and something else on another. */
  side?: 'student' | 'coach';
}): BackwardLook | null {
  const side = args.side ?? 'student';
  const mover = args.studentColor;

  // ── A MOVE THAT GAINED IS NOT A CONCESSION ──────────────────────────────
  // The structural lane deliberately has no centipawn floor: its whole value is
  // catching the QUIET giveaway the eval does not punish, and a floor would
  // delete exactly that. But "no floor" was read as "any eval", and PostHog
  // caught the consequence in David's own game — `coach_inaccuracy_called` with
  // a cost of MINUS 819, the coach owning a mistake on a move that improved its
  // position by eight pawns.
  //
  // So the refusal is one-sided: nothing is required of a move that broke even,
  // and a move the engine says measurably IMPROVED things may not be described
  // as having given something up. Half a pawn is the boundary because that is
  // where Stockfish stops calling a difference noise (`INACCURACY_CP`), which
  // keeps a depth-to-depth wobble from silencing a real concession.
  const gained = args.cpLoss <= -INACCURACY_CP;

  // ── THE COACH'S OWN MOVE ────────────────────────────────────────────────
  // Same two lanes, same order: name the thing conceded if code can, otherwise
  // judge the move against the engine's. There is no third lane here — the
  // rear-facing "what it allowed" is the STUDENT'S opportunity, and
  // `callInaccuracy` already hands that over without naming the punishment.
  if (side === 'coach') {
    if (args.bestSan && !gained) {
      try {
        const c = findConcession({
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          coachColor: mover,
        });
        if (c) return { line: `${c.said} ${c.opening}`, square: c.square, kind: 'coachMistake' };
      } catch { /* fall through */ }
    }
    try {
      const call = callInaccuracy({
        fenBefore: args.fenBefore,
        playedSan: args.playedSan,
        bestSan: args.bestSan,
        bestLineUci: args.bestPvUci,
        cpLoss: args.cpLoss,
        missedMate: args.missedMate ?? null,
        allowedMate: args.allowedMate ?? null,
        side: 'coach',
        moverColor: mover,
      });
      return call ? { line: call.said, square: call.square, kind: 'coachMistake' } : null;
    } catch { return null; }
  }

  // FIRST the structural read — it NAMES the thing given up ("that took your
  // last defender off d5"), which is the most teachable form there is.
  //
  // ── AND WHAT THE MOVE WAS TRYING TO DO ──────────────────────────────────
  //
  // The concession says what the move COST. `whyItFailed` says why what it
  // ATTEMPTED does not work — the target was guarded by a piece the student
  // never looked at, or nothing guarded it and the reply comes with check on
  // the attacker. Different halves of one move, and the second is the half
  // that speaks to the student's own idea rather than to the eval.
  //
  // 🔒 THEY ARE STRONGEST TOGETHER, IN THIS ORDER. The concession doctrine's
  // own opening line is "so I remove one defender to attack over here" — which
  // is exactly the move where both lanes fire, and saying only one of them
  // tells half the story. Attempt first, then cost, reads as one thought:
  // *you went for the pawn on f7, but the king holds it — and it took your
  // last defender off d5.* Reversing that makes the cost sound arbitrary,
  // because the reason for paying it has not been said yet.
  //
  // Rank is unchanged — this rides `drawback`, below the mistake callout, so
  // the student still hears their own move judged first and then the
  // alternative. Nothing about the existing order moves.
  //
  // Gated on `!gained` with everything else: a move that measurably improved
  // the position is not a failed idea, whatever it happens to attack. Without
  // that, every developing move that eyes a guarded pawn would collect a
  // sentence explaining why it "fails".
  if (!gained) {
    let attempt: string | null = null;
    let attemptSquare = '';
    try {
      // Student side only. The prose is written in the second person ("your
      // knight"), so the coach cannot borrow it to describe its own move
      // without saying something false about whose piece it is.
      const f = whyItFailed({
        fenBefore: args.fenBefore,
        playedSan: args.playedSan,
        studentColor: args.studentColor,
      });
      if (f) { attempt = f.line; attemptSquare = f.squares[0] ?? ''; }
    } catch { /* a lane that throws must not silence the rest */ }

    let cost: { said: string; opening: string; square: string } | null = null;
    if (args.bestSan) {
      try {
        cost = findStudentDrawback({
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          studentColor: args.studentColor,
        });
      } catch { /* fall through */ }
    }

    if (attempt || cost) {
      // ── AND WHAT TO PLAY INSTEAD ─────────────────────────────────────────
      //
      // 🔒 THIS BRANCH USED TO RETURN HERE, so a move with a structural read
      // NEVER got its alternative named. David 2026-08-15: "Is the delta
      // working? Stating why a certain move is better than another?" — measured
      // on six real blunders, the better move was named on two. The other three
      // that spoke all took this early return, INCLUDING a mate-in-one: the
      // coach explained the tactic that was coming and never said "g6 was the
      // move". The highest-stakes moment in a game, and the half that tells the
      // student what to do was missing.
      //
      // The two halves answer different questions and a student wants both:
      // this one says what the move ATTEMPTED and what it COST, the callout says
      // what should have been played and what THAT would have done. Reading in
      // that order — attempt, cost, alternative — is one thought.
      //
      // Not a rank change: it stays `drawback`, so nothing about the locked lane
      // order moves. It is strictly more teaching in the same slot, which is the
      // right direction ("The longer narrations are good. Do not cap them.").
      let instead: string | null = null;
      if (args.bestSan) {
        try {
          const call = callInaccuracy({
            fenBefore: args.fenBefore,
            playedSan: args.playedSan,
            bestSan: args.bestSan,
            bestLineUci: args.bestPvUci,
            cpLoss: args.cpLoss,
            missedMate: args.missedMate ?? null,
            allowedMate: args.allowedMate ?? null,
            side: 'student',
            moverColor: args.studentColor,
          });
          instead = call?.said ?? null;
        } catch { /* the alternative is a bonus; the read still stands */ }
      }
      const line = [attempt, cost ? `${cost.said} ${cost.opening}` : '', instead ?? '']
        .filter(Boolean).join(' ');
      // The mark follows the same order: the square the ATTEMPT is about when
      // there is one, because that is what the sentence opens on.
      return { line, square: attemptSquare || cost?.square || '', kind: 'drawback' };
    }
  }

  // THEN what should have been played, and why. Severity comes from
  // `moveRating.classifyMove` — the same bands the review uses, so a word means
  // the same thing on both surfaces.
  if (args.bestSan) {
    try {
      const call = callInaccuracy({
        fenBefore: args.fenBefore,
        playedSan: args.playedSan,
        bestSan: args.bestSan,
        bestLineUci: args.bestPvUci,
        cpLoss: args.cpLoss,
        missedMate: args.missedMate ?? null,
        allowedMate: args.allowedMate ?? null,
        side: 'student',
        moverColor: args.studentColor,
      });
      if (call) return { line: call.said, square: call.square, kind: 'mistake' };
    } catch { /* fall through */ }
  }

  // THEN the rear-facing line. The structural read covers five nameable
  // concessions and stays silent on everything else — measured on a real game,
  // eight slips including a 648-centipawn blunder produced ZERO backward looks,
  // because dropping a piece concedes no outpost. The opponent's own best line
  // from here says what the move allowed, in moves they would really play.
  try {
    const allowed = whatItAllowed({
      fenAfter: args.fenAfter,
      opponentPv: args.replyPvUci ?? [],
      studentColor: args.studentColor,
      cpLoss: args.cpLoss,
    });
    return allowed ? { ...allowed, kind: 'drawback' } : null;
  } catch { return null; }
}
