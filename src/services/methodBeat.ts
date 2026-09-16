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
}

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

  // 1 — OPPONENT INTENT. They had something going and it was played past. This
  // is the single most common habit gap, and the most teachable.
  if (s.ignoredThreat) {
    return pick([
      'The habit that catches this: before your own idea, ask what THEY want — their threat comes first, every move.',
      'Make this the routine — their threat before your plan. Ask what they are trying to do before you ask what you want.',
      'One question would have caught it: what is their move doing? Answer that before choosing your own.',
    ], plyForVariety);
  }

  // 2 — THE FORCING SCAN. The move that was there was a check or a capture, so
  // the method that finds it is the forcing scan, named concretely.
  if (s.bestSan && /^[^O]*[x+#]/.test(s.bestSan) && s.cpLossCp !== null && s.cpLossCp >= 100) {
    return pick([
      'The move you wanted was a forcing one, so start there: list the checks and the captures before anything quiet.',
      'When something is available it is usually forcing — run the checks and captures first, then look at quiet moves.',
      'Habit for positions like this: every check, every capture, in order, before you consider a quiet move.',
    ], plyForVariety);
  }

  // 3 — SLOW DOWN. The position had real decision leverage: the right move
  // mattered here more than it does on an ordinary move. The app has always
  // KNOWN this (`criticalityScan` is rating-scaled) and never said it.
  if (s.tier === 'critical' || s.tier === 'only-move') {
    return pick([
      'This was the moment to slow down — positions where one move decides it are worth more time than the ten quiet moves around them.',
      'Spend your clock here, not on the easy moves — this is the kind of position that decides games.',
      'Worth noticing for next time: this position was a fork in the road, and those deserve real thinking time.',
    ], plyForVariety);
  }

  return null; // empty > generic
}
