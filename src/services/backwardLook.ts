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
import { mateStakes, costStakes, type FactStakes } from './factStakes';
import { Chess } from 'chess.js';
import { findConcession, findStudentDrawback } from './concessionBeat';
import { inaccuracySpeaks } from './inaccuracyVoice';
import { callInaccuracy, callInaccuracyDetailed, errorWhyFor, type InaccuracyDecline, type PriorMove } from './inaccuracyCall';
import type { SameSearchScores } from './moveCost';
export { priorMoveLeadingTo } from './inaccuracyCall';
import { describeConcessions } from './reviewTeachingPoints';
import { INACCURACY_CP, BLUNDER_CP } from './engineConstants';
import { classifyMove } from './moveRating';
import { moverFault } from './accuracyService';
import { logAppAudit } from './appAuditor';

export interface BackwardLook {
  /** The spoken line. Past tense — the move has happened. */
  line: string;
  /** The square to mark, '' when there is nothing to point at. */
  square: string;
  /** Every square the line names, for the key-square highlights. */
  squares?: string[];
  /** Which package lane it rides. `mistake` is the student's callout and leads
   *  the computed lanes; `drawback` is the concession a rung below it; and
   *  everything the COACH says about its own move rides `coachMistake`, which
   *  David placed "number two on the list, right behind the mistake call out".
   *  One lane for the coach because it is one voice — owning a blunder and
   *  owning a positional concession are the same act at different scales. */
  kind: 'mistake' | 'drawback' | 'coachMistake';
  /** The tactic the better move would have landed (B3) — the caller teaches
   *  its rule once a game, from its own definition ledger. */
  pattern?: string;
  /** The punishing line the words play out, from `fen` (`InaccuracyCall.line`). */
  punishLine?: { fen: string; uci: string[] };
  /** What the verdict is worth to the door's order: a mate it allowed is a
   *  mate's stakes (hard-question walk 2026-10-11: "e6 … let them force mate
   *  in 6" was buried under a weak-pawn lecture), else the move's cost. */
  stakes?: FactStakes;
  /** The student piece the grade says was left to be taken (from
   *  `InaccuracyCall.lostSquare`). The live fundamental verdict names the same
   *  loss as "that left your rook on b2 hanging"; one of them speaks. */
  lostSquare?: string;
  /** The better move the line names (`InaccuracyCall.namesBetter`). */
  namesBetter?: string;
  /** The coach's slip left the student something to find (`InaccuracyCall.offersStudent`). */
  offersStudent?: true;
}

/**
 * What to say about the move the student just played, or null for silence.
 *
 * Silence is the common case and the correct one: an ordinary move has no
 * backward look, and inventing one for it teaches the student to tune the coach
 * out. Each lane below refuses on its own terms rather than reaching for
 * something to say.
 */
/**
 * WHY THE COACH'S OWN VERDICT LANE SAID NOTHING, from the last call.
 *
 * Read immediately after a `backwardLook({ side: 'coach' })` that returned
 * null, purely so the audit line names the guard that actually refused. A
 * module-level slot rather than a widened return type: `BackwardLook | null` is
 * the shape three surfaces already destructure, and the reason is diagnostic —
 * it must never become something a narration lane can branch on.
 */
let lastCoachDecline: InaccuracyDecline | 'threw' | 'no-concession-and-no-call' | null = null;

/** The reason the last coach-side `backwardLook` declined, or null. */
export function lastCoachVerdictDecline(): string | null {
  return lastCoachDecline;
}

export function backwardLook(args: {
  /** Position before the student moved. */
  fenBefore: string;
  /** Position after the student moved — the opponent is on move. */
  fenAfter: string;
  playedSan: string;
  /** The move that produced `fenBefore` (their last move), or null at the
   *  start. REQUIRED: a better move that only takes back what that move
   *  captured is not "win a pawn" (David 2026-10-02). */
  priorMove: PriorMove;
  /** The engine's preferred move at `fenBefore`. Null → the first two lanes
   *  cannot run; the third still can. */
  bestSan: string | null;
  /** The engine's line from `fenBefore`, UCI — supplies the "why" for the
   *  callout. */
  bestPvUci?: readonly string[];
  /** The opponent's best line from `fenAfter`, UCI — what the move allowed. */
  replyPvUci?: readonly string[];
  /** The reply actually played, when it is on the board already. REQUIRED,
   *  `null` when not yet known: a piece they did not take is "they missed it",
   *  never "just takes it" (walk 900, 17…Bg1). */
  replySan: string | null;
  /** Their reply kept the punishment's value (see `callInaccuracyDetailed`). */
  replyKeptWin?: boolean | null;
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
  /** The best move's own forced mate for the mover (see `mateContext`). */
  bestMate?: number | null;
  allowedMate?: number | null;
  /** The mover's eval AFTER the move, mover's perspective, when it is a real
   *  centipawn read — lets the verdict say "still wins, but X was cleaner"
   *  instead of "was a mistake" when the student is still clearly winning. */
  moverEvalAfterCp?: number | null;
  /** The best and played moves' scores from the ONE search that priced the
   *  move (`MovePrice.scores`): every band here is graded from them. REQUIRED,
   *  null when unknown — never rebuilt from the cost and a separate read. */
  scores: SameSearchScores | null;
  /** WHOSE move is being looked back at. Defaults to the student.
   *
   *  The coach's own moves go through the SAME function deliberately. They ask
   *  the identical question — what did that move give up, and what should have
   *  been played — and the only differences are the pronoun and the fact that
   *  the coach may name its own move, because it is already on the board. Two
   *  implementations of one question is how "inaccuracy" comes to mean one
   *  thing on one surface and something else on another. */
  side?: 'student' | 'coach';
  /** The coach played it because the student dictated it: said of THEM
   *  (the concession lane speaks in the first person, so it stands down). */
  dictated?: boolean;
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
    lastCoachDecline = 'no-concession-and-no-call';
    // WHAT THE COACH'S SLIP GIVES THE STUDENT IS ITS STAKE — the same reading
    // as the student's own verdict, from the other seat (prod Learn 2026-10-16:
    // the coach's verdict carried none and was held as an aside 2 of 3 times).
    const coachStakes = (args.allowedMate ?? null) !== null
      ? mateStakes('you', Math.max(0, Math.abs(args.allowedMate as number) * 2 - 1), true)
      : costStakes(args.cpLoss) ?? undefined;
    if (args.bestSan && !gained && !args.dictated) {
      try {
        const c = findConcession({
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          coachColor: mover,
        });
        if (c) return { line: `${c.said} ${c.opening}`, square: c.square, kind: 'coachMistake', ...(coachStakes ? { stakes: coachStakes } : {}) };
      } catch { /* fall through */ }
    }
    try {
      const verdict = callInaccuracyDetailed({
        // THEIR BETTER MOVE IS NAMED (David 2026-10-18: "I know that goes against
        // never say the move. But that is meant for before the move is played").
        // The rule protects the STUDENT's next move; the opponent's stronger
        // move is a moment already past, and naming it is the lesson ("a
        // stronger opponent plays X — your Y was loose").
        namesBetterMove: true,
        fenBefore: args.fenBefore,
        playedSan: args.playedSan,
        bestSan: args.bestSan,
        bestLineUci: args.bestPvUci,
        cpLoss: args.cpLoss,
        missedMate: args.missedMate ?? null,
        bestMate: args.bestMate ?? null,
        allowedMate: args.allowedMate ?? null,
        // ONE GRADE ON EVERY SURFACE: the coach's move is graded on the same
        // win-chance bands as the student's (walk oct3a, 18.c5: "Their c5 is a
        // mistake" for +5.1 → +4.3 — the eval was dropped on this path, so the
        // raw centipawn ladder graded a decided position).
        moverEvalAfterCp: args.moverEvalAfterCp ?? null,
        scores: args.scores,
        side: 'coach',
        ...(args.dictated ? { dictated: true } : {}),
        moverColor: mover,
        replyLineUci: args.replyPvUci ?? [],
        replySan: args.replySan ?? null,
        replyKeptWin: args.replyKeptWin ?? null,
        priorMove: args.priorMove,
      });
      // THE REASON TRAVELS WITH THE REFUSAL. The caller logs why the coach said
      // nothing, and until now it printed "under the floor" for all five
      // reasons — see `InaccuracyVerdict`. Handing the computed reason back is
      // what makes that log a measurement instead of an assertion.
      if (verdict.call) return { line: verdict.call.said, square: verdict.call.square, kind: 'coachMistake', ...(coachStakes ? { stakes: coachStakes } : {}), ...(verdict.call.offersStudent ? { offersStudent: true as const } : {}) };
      lastCoachDecline = verdict.declined;
      return null;
    } catch { lastCoachDecline = 'threw'; return null; }
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
  // A DRAWBACK BELONGS TO A MOVE THE GRADE CALLS A FAULT (clean-pass walk
  // SI5q0VJz: 27.Rc8 and 39.Qb8 — mate in six — each heard "your piece went a
  // long way from your king" off a raw drop between two reads at +8). The one
  // grader decides, in expected points when the eval after is known.
  const quality = moverQuality(args);
  const fault = quality === 'inaccuracy' || quality === 'mistake' || quality === 'blunder';
  if (!gained && fault) {
    // WHY THE MOVE FAILED is the error call's — its mechanism (`whyItFailed`)
    // now lives inside the one error computer (`errorWhy`, 2026-10-10), so
    // this lane no longer runs it a second time.

    let cost: { kind: string; said: string; opening: string; square: string } | null = null;
    if (args.bestSan) {
      try {
        cost = findStudentDrawback({
          fen: args.fenBefore,
          playedSan: args.playedSan,
          bestSan: args.bestSan,
          studentColor: args.studentColor,
        });
      } catch { /* fall through */ }
      // A SQUARE LEFT UNGUARDED IS A COST ONLY IF THEY USE IT (re-walk 1380,
      // 2026-09-25). "That took your last defender off d4 / h4 / f5" spoke on
      // six flagged moves — 24.Bg5 hung a bishop and the coach named d4 — because
      // the detector asks only whether a piece COULD land there. The engine
      // says whether one WILL: the square must be where one of their next three
      // moves in the reply line lands. No reply line, no claim.
      if (cost && cost.kind === 'defender-left') {
        const theirLandings = (args.replyPvUci ?? []).filter((_, i) => i % 2 === 0).slice(0, 3).map((u) => u.slice(2, 4));
        if (!theirLandings.includes(cost.square)) cost = null;
        // …and not while still clearly winning (re-walk 1380, 29.Qe2 at +7):
        // there `callInaccuracy` says "still wins, but Bg5 was cleaner", the
        // square is not what the engine charged for, and the warning took the
        // cleaner move's place.
        else if (typeof args.moverEvalAfterCp === 'number' && args.moverEvalAfterCp >= BLUNDER_CP) cost = null;
      }
    }

    if (cost) {
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
      let insteadLost: string | undefined;
      let insteadBetter: string | undefined;
      if (args.bestSan) {
        try {
          const call = callInaccuracy({
        // LEARN FREE PLAY NEVER NAMES THE BETTER MOVE UNASKED (David
        // 2026-10-10): the why of the error, and the move only when asked.
        namesBetterMove: false,
            fenBefore: args.fenBefore,
            playedSan: args.playedSan,
            bestSan: args.bestSan,
            bestLineUci: args.bestPvUci,
            cpLoss: args.cpLoss,
            missedMate: args.missedMate ?? null,
        bestMate: args.bestMate ?? null,
            allowedMate: args.allowedMate ?? null,
            moverEvalAfterCp: args.moverEvalAfterCp ?? null,
            scores: args.scores,
            side: 'student',
            moverColor: args.studentColor,
            replyLineUci: args.replyPvUci ?? [],
            replySan: args.replySan ?? null,
            replyKeptWin: args.replyKeptWin ?? null,
            priorMove: args.priorMove,
          });
          instead = call?.said ?? null;
          insteadLost = call?.lostSquare;
          insteadBetter = call?.namesBetter;
        } catch { /* the alternative is a bonus; the read still stands */ }
      }
      // A FORCED MATE LEADS (prod Learn audit 2026-10-14: "That took your
      // last defender off d6. Worth seeing before it costs you something. Kb8
      // was a blunder — it let them force mate in 4."). The mate is the
      // verdict; the square it came through is its reason, said after it, and
      // the "worth seeing" opener has nothing left to promise.
      const allowsMate = (args.allowedMate ?? null) !== null && !!instead;
      const line = allowsMate
        ? [instead ?? '', cost.said].filter(Boolean).join(' ')
        : [cost.said, cost.opening, instead ?? ''].filter(Boolean).join(' ');
      return {
        ...(allowsMate ? { stakes: mateStakes('them', Math.max(0, Math.abs(args.allowedMate as number) * 2 - 1), true) } : {}),
        line, square: cost.square || '', kind: 'drawback',
        // The grade's lost square rides here too, so the fundamental that names
        // the same hung piece stays quiet (run B walk 2026-09-30, Ng3: "that
        // left your knight on g3 hanging…" then "it let them take your knight
        // on g3" in one breath).
        ...(insteadLost ? { lostSquare: insteadLost } : {}),
        ...(insteadBetter ? { namesBetter: insteadBetter } : {}),
      };
    }
  }

  // THEN what should have been played, and why. Severity comes from
  // `moveRating.classifyMove` — the same bands the review uses, so a word means
  // the same thing on both surfaces.
  if (args.bestSan) {
    try {
      const call = callInaccuracy({
        // LEARN FREE PLAY NEVER NAMES THE BETTER MOVE UNASKED (David
        // 2026-10-10): the why of the error, and the move only when asked.
        namesBetterMove: false,
        fenBefore: args.fenBefore,
        playedSan: args.playedSan,
        bestSan: args.bestSan,
        bestLineUci: args.bestPvUci,
        cpLoss: args.cpLoss,
        missedMate: args.missedMate ?? null,
        bestMate: args.bestMate ?? null,
        allowedMate: args.allowedMate ?? null,
        moverEvalAfterCp: args.moverEvalAfterCp ?? null,
        scores: args.scores,
        side: 'student',
        moverColor: args.studentColor,
        replyLineUci: args.replyPvUci ?? [],
        replySan: args.replySan ?? null,
        replyKeptWin: args.replyKeptWin ?? null,
        priorMove: args.priorMove,
      });
      const stakes = (args.allowedMate ?? null) !== null
        ? mateStakes('them', Math.max(0, Math.abs(args.allowedMate as number) * 2 - 1), true)
        : costStakes(args.cpLoss) ?? undefined;
      if (call) return { ...(stakes ? { stakes } : {}), line: call.said, square: call.square, kind: 'mistake', ...(call.pattern ? { pattern: call.pattern } : {}), ...(call.lostSquare ? { lostSquare: call.lostSquare } : {}), ...(call.namesBetter ? { namesBetter: call.namesBetter } : {}), ...(call.line ? { punishLine: call.line } : {}), ...(call.squares ? { squares: call.squares } : {}) };
    } catch { /* fall through */ }
  }

  // WITH NO BETTER MOVE IN HAND, the why still speaks — from the ONE error
  // computer (`errorWhy`, 2026-10-10), which replaced a fourth "what it
  // allowed" reader here (`whatItAllowed`). Only of a move the grade calls a
  // fault (clean-pass walk SI5q0VJz, 26.Rac1: +8.0 → +6.7 heard "That let them
  // win a piece, starting with h6").
  if (!fault) return null;
  try {
    const w = errorWhyFor({
      fenBefore: args.fenBefore, playedSan: args.playedSan, moverColor: args.studentColor,
      replyLineUci: args.replyPvUci ?? null, quality, replySan: args.replySan ?? null,
    });
    // A DIAGNOSTIC, NOT A SPOKEN LINE: the inputs that produced it, so a false
    // claim can be replayed offline in one call (David's prod game 2026-08-16).
    if (w) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'backwardLook.drawback',
        summary: `"${w.line}" · cpLoss=${args.cpLoss} · pv=${(args.replyPvUci ?? []).slice(0, 12).join(' ') || 'none'}`,
        fen: args.fenAfter,
      });
    }
    // THE MOVE IS THE SUBJECT (hard-question walk 2026-10-11: "It let them
    // play …e5" — with no grade before it, "it" pointed at nothing).
    const said = w ? w.line.replace(/^It /, `Your ${args.playedSan} `) : '';
    return w ? { line: said, square: w.squares[0] ?? '', kind: 'drawback', ...(w.squares.length ? { squares: w.squares } : {}), ...(w.proofLine ? { punishLine: w.proofLine } : {}) } : null;
  } catch { return null; }
}

/**
 * WHAT THE STUDENT'S FLAGGED MOVE GAVE UP FOR GOOD — king cover thinned, a
 * passer granted, a new isolani (capability parity with review, 2026-09-27).
 * The look owns the move's cost, so its lasting damage lives here too. Null on
 * a move that was not flagged, and never mid-exchange (`describeConcessions`).
 */
export function lookConcession(
  fenBefore: string, playedSan: string, cpLoss: number,
  /** The mover's eval after the move, their side — REQUIRED so the move is
   *  graded by the one grader (`moverFault`), never a raw drop. */
  moverEvalAfterCp: number | null,
): string | null {
  return moverFault(cpLoss, moverEvalAfterCp) ? describeConcessions(fenBefore, playedSan, true) : null;
}


/** Did their actual reply keep the punishment's value? True when the reply is
 *  one of the engine's own replies at `fenAfter` within a pawn of its best —
 *  another road to the same win, not a miss (walk oct3a, 28.h5 …Rxc3). Null
 *  when the reply or the engine lines are unknown. */
export function replyKeptWinOf(
  fenAfter: string, replySan: string | null,
  lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number }> | undefined,
): boolean | null {
  if (!replySan || !lines || lines.length === 0) return null;
  let uci: string;
  try {
    const m = new Chess(fenAfter).move(replySan);
    uci = `${m.from}${m.to}${m.promotion ?? ''}`;
  } catch { return null; }
  const best = lines[0].evaluation;
  const hit = lines.find((l) => l.moves[0] === uci);
  if (!hit) return null;
  return Math.abs(hit.evaluation - best) <= 100;
}

/** The ONE grade of the mover's move for the Learn lanes — the backward look
 *  and the caller deciding whether a slip is spoken read the same number. */
export function moverQuality(args: {
  cpLoss: number;
  missedMate?: number | null;
  allowedMate?: number | null;
  /** The two scores the cost came from (one search) — see `backwardLook`. */
  scores: SameSearchScores | null;
  studentColor: 'white' | 'black';
}): ReturnType<typeof classifyMove> {
  return classifyMove({
    wasBest: false,
    cpLoss: args.cpLoss,
    missedMate: args.missedMate ?? null,
    allowedMate: args.allowedMate ?? null,
    ...(args.scores
      ? { evalBefore: args.scores.bestWhiteCp, evalAfter: args.scores.playedWhiteCp, isWhiteMove: args.studentColor === 'white' }
      : {}),
  });
}

/** Whether the student's slip on this move is SPOKEN in Learn: a mistake or a
 *  blunder always is; an inaccuracy only where their own record earns it
 *  (`inaccuracyVoice` — this phase and this skill first). */
export function slipSpoken(args: Parameters<typeof moverQuality>[0] & {
  fenBefore: string; playedSan: string; bestSan: string | null; historySans: readonly string[];
}): boolean {
  if (moverQuality(args) !== 'inaccuracy') return true;
  return inaccuracySpeaks({ fenBefore: args.fenBefore, playedSan: args.playedSan, bestSan: args.bestSan, historySans: args.historySans, ply: args.historySans.length - 1 });
}
