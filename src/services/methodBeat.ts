// methodBeat — HOW TO THINK, computed (David 2026-09-16: "Calling out pins and
// forks isn't teaching. Future moves, how to think, threat identification, that
// is teaching").
//
// The coach was strong at DESCRIBING the board and DIAGNOSING the error, and
// close to silent on METHOD. The whole of the in-flow method teaching before
// this module was one line in `playCommentary` and a paragraph of static copy on
// one drill page (see docs/plans/2026-09-16-teaching-behaviour-audit.md).
//
// A method beat is not a new FACT — it is the procedure the student should have
// run, earned by a fact the app already computed. Every beat here is gated on a
// grounded signal, so it can never become generic advice bolted onto a quiet
// position (G0: the sentence is a template over a computed condition; empty >
// generic).
//
// It ranks LAST in a beat on purpose. The board fact comes first, the principle
// it broke second, and the method is the closing takeaway — "and here is the
// habit that finds it next time." Leading with the habit would preach before
// the student has seen the evidence.
import type { ImportanceTier } from './narrationImportance';

export interface MethodSignals {
  /** The moment's importance tier, from the one deciding computer. */
  tier: ImportanceTier;
  /** What the played move cost, mover-POV cp. null when not a graded move. */
  cpLossCp: number | null;
  /** The engine's move here, SAN — what the method would have found. */
  bestSan: string | null;
  /** Did the student ignore a threat that was already on the board? Comes from
   *  the fundamentals attributor, not from re-reading the position. */
  ignoredThreat: boolean;
  /** Was the student the mover? Method is taught to the person playing. */
  isStudentMove: boolean;
  /** THE HABITS THIS STUDENT'S OWN DATA SAYS THEY KEEP MISSING (David
   *  2026-09-16). Derived in `coachDecider` from the weakness spine — never
   *  re-derived here, and never inferred from the position.
   *
   *  WHY THIS EXISTS. The bars below (cpLoss >= 100, tier critical/only-move)
   *  were set high earlier the same night because the beat was firing on ten
   *  student plies in a row — a drumbeat. That over-corrected: a clean-ish real
   *  game (David's Alapin: 2 inaccuracies, 2 mistakes, nothing sharper) then
   *  heard ZERO method, which is "teachings left out" arriving from the other
   *  side. A flat cp threshold is the wrong instrument for "does this student
   *  need the habit" — their own recurrence is (N2). When their spine flags the
   *  habit, the bar drops to any graded slip. */
  habitNeed?: HabitNeed;
  /** Habits already spoken THIS GAME. Say-once is what stops the drumbeat now,
   *  which is the right place for it: a bar tuned to suppress repetition
   *  suppresses teaching too. Mutated by the caller across the walk. */
  saidHabits?: Set<MethodHabit>;
}

/** The habit classes the method layer teaches. Named so the say-once ledger and
 *  the need lookup share one vocabulary and cannot drift. */
export type MethodHabit = 'opponent-threat' | 'forcing-scan' | 'slow-down' | 'candidates';

/** WHERE THIS STUDENT STANDS ON A HABIT, from their own record (David
 *  2026-09-16: "If the user finds the correct move more often than not maybe it
 *  can stay quiet. But a more complicated position similar to where the user has
 *  misstepped before would warrant the warning").
 *
 *  A boolean could not say that. The weakness lifecycle already computes it:
 *    'closed'  — lifecycle `fixed`: they have stopped erring here. Stay quiet.
 *    'fading'  — `occasional` AND improving: they mostly find it now. Quiet.
 *    'open'    — `persistent` / `emerging` / occasional-not-improving. WARN,
 *                even on a position they would probably have got right, because
 *                this is the shape they have misstepped in before.
 *  ABSENT means UNKNOWN, not closed — a student with no record gets taught
 *  (the cold-start prior; absent data never mutes the coach). */
export type HabitStanding = 'open' | 'fading' | 'closed';

/** Where this student stands on each habit. Absent = unknown = teach. */
export type HabitNeed = Partial<Record<MethodHabit, HabitStanding>>;

/** The habit is owed unless their own record says they have it. */
export function habitIsOwed(need: HabitNeed, habit: MethodHabit): boolean {
  const standing = need[habit];
  return standing !== 'closed' && standing !== 'fading';
}

/** The cp bar for the forcing scan: normally a real cost, but ANY graded slip
 *  when the student's own data says they habitually miss forcing shots. */
const FORCING_CP = 100;
const FORCING_CP_WHEN_NEEDED = 1;
/** Below a KNOWN cost this small the student essentially found the move; there
 *  is nothing to correct, so the corrective beat stays quiet. Deliberately
 *  small — a "did they err at all" test, not a severity bar (the tier already
 *  carries severity, and stacking a bar on it would be the flat-threshold
 *  mistake all over again). */
const SLIP_CP = 30;

/** Stems rotate on the ply so a long game never repeats a sentence verbatim
 *  (the narration-voice rule: vary the stem, never the claim). */
function pick(variants: readonly string[], v: number): string {
  return variants[Math.abs(v) % variants.length];
}

/**
 * The method beat for this moment, or null when none is earned.
 *
 * Ordered by teaching value: the habit that would have found the move beats the
 * general "slow down here", because it is specific.
 */
export function methodBeatFor(s: MethodSignals, plyForVariety = 0): string | null {
  if (!s.isStudentMove) return null; // you teach the method to the player
  // SAY-ONCE per habit per game. A habit is a routine, not a running total —
  // hearing "ask what THEY want" on every slip is nagging, and nagging is how a
  // student learns to tune the coach out. Once it has been taught this game the
  // beat stays quiet and the board facts carry the ply.
  const said = s.saidHabits;
  const need = s.habitNeed ?? {};
  const claim = (h: MethodHabit, text: string): string | null => {
    if (said?.has(h)) return null;
    said?.add(h);
    return text;
  };

  // EVERY HABIT HONOURS THE STUDENT'S OWN STANDING (B11, 2026-09-22). A habit
  // the lifecycle marks `closed` (they stopped erring) or `fading` (they mostly
  // find it now) is not re-taught on this register: the record says they have
  // it, and a correction they have already earned their way out of is nagging.
  // UNKNOWN stays owed — a cold student never meets a mute coach. Until B11
  // only the slow-down beat read the standing, and only on a move played well;
  // the opponent-threat and forcing-scan beats fired on a closed habit exactly
  // as on an open one.
  // 1 — OPPONENT INTENT. They had something going and it was played past. This
  // is the single most common habit gap, and the most teachable.
  if (s.ignoredThreat && habitIsOwed(need, 'opponent-threat')) {
    return claim('opponent-threat', pick([
      'The habit that catches this: before your own idea, ask what THEY want — their threat comes first, every move.',
      'Make this the routine — their threat before your plan. Ask what they are trying to do before you ask what you want.',
      'One question would have caught it: what is their move doing? Answer that before choosing your own.',
    ], plyForVariety));
  }

  // 2 — THE FORCING SCAN. The move that was there was a check or a capture, so
  // the method that finds it is the forcing scan, named concretely.
  // An OPEN forcing-scan habit drops the bar to any graded slip; a closed or
  // fading one leaves the ordinary bar in place.
  const forcingBar = need['forcing-scan'] === 'open' ? FORCING_CP_WHEN_NEEDED : FORCING_CP;
  if (habitIsOwed(need, 'forcing-scan') && s.bestSan && /^[^O]*[x+#]/.test(s.bestSan) && s.cpLossCp !== null && s.cpLossCp >= forcingBar) {
    return claim('forcing-scan', pick([
      'The move you wanted was a forcing one, so start there: list the checks and the captures before anything quiet.',
      'When something is available it is usually forcing — run the checks and captures first, then look at quiet moves.',
      'Habit for positions like this: every check, every capture, in order, before you consider a quiet move.',
    ], plyForVariety));
  }

  // 3 — SLOW DOWN. The position had real decision leverage: the right move
  // mattered here more than it does on an ordinary move. The app has always
  // KNOWN this (`criticalityScan` computes it) and never said it.
  // A METHOD BEAT IS A CORRECTION, SO IT NEEDS SOMETHING TO CORRECT (David
  // 2026-09-16: "If they make the correct move this phrase shouldn't fire").
  // He said it of the opponent-threat beat, which is already safe — the
  // attributor returns nothing on an unflagged move, so `ignoredThreat` cannot
  // be true when the student played well. SLOW-DOWN had no such guard: it gated
  // purely on the MOMENT's tier, so finding the only move in a critical
  // position still earned "this was the moment to slow down" — a correction the
  // student earned the right not to hear, the same family as never telling them
  // to find a move they played. The moment being critical is what makes the
  // lesson worth teaching; the slip is what makes it theirs.
  // NULL IS "UNKNOWN", NOT "ZERO". Only a KNOWN small cost means they found it;
  // an ungraded ply must not silence the beat, because absent data never mutes
  // the coach (the same rule the cold-start prior follows).
  const foundIt = s.cpLossCp !== null && s.cpLossCp < SLIP_CP;
  // ONLY-MOVE FIRES EITHER WAY (David 2026-09-16: "The slow down beat can fire
  // at a critical moment. When there is only one move that holds equality").
  // Recognising a position where exactly one move holds IS the lesson, and it
  // is worth teaching to the student who found it as much as to the one who
  // did not — that is the skill, not the recovery. Every OTHER tier still needs
  // a real slip, because "you should have slowed down" on a move they played
  // well is a correction they did not earn.
  // THEIR RECORD CAN OVERRIDE "they found it". A position of the shape this
  // student keeps misstepping in is worth naming even when they got this one
  // right — that is the warning David asked for, and it is why found-it alone
  // must not decide.
  //
  // THE OVERRIDE READS `=== 'open'` STRICTLY, NOT `habitIsOwed`, AND THAT IS
  // DELIBERATE — do not "simplify" it to the helper. The two answer different
  // questions. `habitIsOwed` asks "should the coach teach this habit at all",
  // where UNKNOWN must read as yes (a cold student never meets a mute coach).
  // This asks "does this student's own record justify warning someone who
  // played the move WELL" — and that needs positive evidence. Through the
  // helper, a brand-new user with no weakness data at all would be told "this
  // was the moment to slow down" on the critical move they just found, which is
  // precisely the correction David said they had not earned.
  if (s.tier === 'only-move' && habitIsOwed(need, 'slow-down')) {
    // FOUND IT → name the moment, never scold. Telling someone who solved it
    // that they should have spent longer is the wrong sentence for the same
    // computed fact; what they need is to recognise the shape next time.
    return claim('slow-down', foundIt
      ? pick([
        'Worth marking this one: only one move held here, and you found it. That shape — one move holds, everything else slides — is what to slow down for next time.',
        'That was an only-move position and you solved it. Learn the feel of them: when just one move keeps the balance, it is worth every second you can give it.',
        'Exactly one move held the position and it was the one you played. Positions like this are the ones to spend your clock on — notice them early.',
      ], plyForVariety)
      : pick([
        'This was the moment to slow down — positions where one move decides it are worth more time than the ten quiet moves around them.',
        'Spend your clock here, not on the easy moves — this is the kind of position that decides games.',
        'Worth noticing for next time: this position was a fork in the road, and those deserve real thinking time.',
      ], plyForVariety));
  }
  const slowTier = habitIsOwed(need, 'slow-down') && (!foundIt || need['slow-down'] === 'open') && (s.tier === 'critical'
    || (need['slow-down'] === 'open' && (s.tier === 'blunder' || s.tier === 'swing')));
  if (slowTier) {
    return claim('slow-down', pick([
      'This was the moment to slow down — positions where one move decides it are worth more time than the ten quiet moves around them.',
      'Spend your clock here, not on the easy moves — this is the kind of position that decides games.',
      'Worth noticing for next time: this position was a fork in the road, and those deserve real thinking time.',
    ], plyForVariety));
  }

  return null; // empty > generic
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PRESENT-TENSE REGISTER — the same method, taught on a LIVE board.
//
// `methodBeatFor` above is RETROSPECTIVE: it grades a move that was played, so
// it says "the move you wanted was a forcing one". Speaking that on a live board
// is a register violation (CLAUDE.md: review is retrospective, in-game is
// present tense) AND a lie — nothing has been played yet.
//
// This is deliberately the SAME computer, not a second one (David 2026-09-16: "I
// want one unified deciding computer. Merge them if possible"). Same gating
// signals, same ordering, same empty>generic rule; only the tense and the
// direction of the signal change: retrospectively the habit is earned by a
// threat the student PLAYED PAST, prospectively by a threat that is STANDING.
//
// What is NOT here, on purpose: the "slow down, this is a fork in the road"
// beat. `positionFacts` already emits exactly that as its `key-moment` clause
// ("Only one move really holds here — this is the moment to slow down"), so a
// method beat for it would be two sentences making one claim — the pin-and-
// battery duplication the fact selector exists to collapse. When a beat's claim
// is already spoken by a fact, the method beat stays quiet.

export interface LiveMethodSignals {
  /** The engine's move here, SAN — what the method would find. */
  bestSan: string | null;
  /** Is a REAL threat standing against the student right now? From the
   *  must-defend probe, not from re-reading the prose. */
  threatStanding: boolean;
  /** Is the student the one to move? You teach the method to the player. */
  isStudentMove: boolean;
  /** Does this position hold a GENUINE choice — several moves worth weighing,
   *  not one obvious recapture? From `buildDeliberation`, which already ran. */
  realChoice?: boolean;
  /** The moment's importance tier. The candidate habit needs it: `realChoice`
   *  alone is TRUE on most middlegame plies, so gating on it made this beat
   *  fire on every single student move (read off a real game walk: ten
   *  consecutive plies, same habit). A habit repeated every move is not a
   *  habit, it is nagging. The choice is worth teaching where the choice
   *  actually decides something. */
  tier?: ImportanceTier;
}

/**
 * The habit to run in THIS position, or null when none is earned.
 *
 * Ordered by teaching value, same as the retrospective register: the opponent's
 * intent first (the most common gap and the most teachable), then the forcing
 * scan when the move that is there is forcing.
 */
/** The tiers where the choice decides something — one list for every live
 *  habit that must not fire on routine plies. */
function isDecidingTier(t: ImportanceTier | undefined): boolean {
  return t === 'critical' || t === 'only-move' || t === 'blunder' || t === 'swing';
}

/** The three live habits. Each is taught ONCE per game: the 2026-09-24 hand
 *  walk heard "their threat first, your idea second" three times in six moves —
 *  the stems rotate, so a text dedupe never matched. Keyed on the HABIT. */
export type LiveHabit = 'opponent-threat' | 'forcing-scan' | 'candidates';
export interface LiveMethodBeat { text: string; key: string }
/** The say-once key a caller carries forward in its `alreadySaid` set. */
export function liveHabitKey(habit: LiveHabit): string { return `method:${habit}`; }

export function liveMethodBeat(s: LiveMethodSignals, plyForVariety = 0, said?: ReadonlySet<string>): LiveMethodBeat | null {
  if (!s.isStudentMove) return null;
  const owed = (habit: LiveHabit): boolean => !said?.has(liveHabitKey(habit));

  // 1 — THREAT IDENTIFICATION AS A HABIT. The board already names the threat
  // elsewhere in the briefing; this names the ROUTINE that finds it unprompted
  // next time, which is the thing the app was not teaching at all.
  if (s.threatStanding && owed('opponent-threat')) {
    return beat('opponent-threat', [
      'Before you pick a move: what is their last move doing? Answer that first, every time — their idea comes before yours.',
      'Run the question now — what are they threatening? Deal with the answer before you look at your own plan.',
      'The habit here is order of operations: their threat first, your idea second. Never the other way round.',
    ], plyForVariety);
  }

  // 2 — THE FORCING SCAN, prospectively. The move that is there is a check or a
  // capture, so name the scan that finds it rather than the move itself.
  //
  // TIER-GATED (WO-TEACH-02 S7). A capture or check is the engine's best on a
  // large share of plies — every recapture — and the scan prompt fired on all
  // of them. It teaches only where the forcing move DECIDES the moment: a
  // critical or only-move position (or one the student can swing). Elsewhere
  // the recapture is obvious and the prompt is nagging.
  if (s.bestSan && /^[^O]*[x+#]/.test(s.bestSan) && isDecidingTier(s.tier) && owed('forcing-scan')) {
    return beat('forcing-scan', [
      'Start with the forcing moves here — every check, every capture, before you look at anything quiet.',
      'List the checks and the captures first. Something in this position is forcing, and quiet moves can wait.',
      'Scan forcing first: checks, then captures, then the quiet moves. That order is what finds shots like this.',
    ], plyForVariety);
  }

  // 3 — CANDIDATE-MOVE DISCIPLINE. A real choice AND a moment that turns on it.
  // The briefing's `deliberation` clause says WHICH moves are in the running;
  // this teaches the routine of finding them yourself, which is the half the
  // student has to own. It is last because it is the most general of the three,
  // and it is the narrowest-gated for the same reason — see `tier` above.
  if (s.realChoice && isDecidingTier(s.tier) && owed('candidates')) {
    return beat('candidates', [
      'Name your candidates before you calculate: two or three moves you would consider, then compare them. Picking first and checking after is how good moves get missed.',
      'Two or three candidate moves, written down in your head, before any calculation — then work out which one holds up.',
      'The discipline here is listing the options first. Decide what the candidates are, then spend your thinking on comparing them.',
    ], plyForVariety);
  }

  return null; // empty > generic
}

function beat(habit: LiveHabit, stems: string[], ply: number): LiveMethodBeat {
  return { text: pick(stems, ply), key: liveHabitKey(habit) };
}

/** Text-only form (no say-once) — kept for callers that do not carry a set. */
export function liveMethodBeatFor(s: LiveMethodSignals, plyForVariety = 0, said?: ReadonlySet<string>): string | null {
  return liveMethodBeat(s, plyForVariety, said)?.text ?? null;
}
