// Misconception classifier — 100% CODE, ZERO LLM (thinking-error buckets,
// 2026-06-10; LLM removed on David's order same day: "remove the llm").
//
// The board decides the bucket — the model is GONE from this path entirely.
// `diagnoseMisconception` computes ranked candidates + confidence from
// move-type × eval × cause:
//   - top ≥ AUTO_TAG_CONFIDENCE and clear → AUTO-TAG (the chosen bucket).
//   - else → return the top candidate as the best-guess bucket + `needsPicker`
//     so a correction surface (the Thinking-Errors tab / review) can offer the
//     ranked candidates for a one-tap re-tag. `random` is never produced here.
//
// There is NO language-matching LLM step anymore: the prior bounded
// reason→candidate match was deleted (it only ever fired on a typed free-text
// reason, which the silent-classify pivot removed). A wrong silent tag is
// corrected by TAP in the tab, never by the model. Shared by Discussion
// Practice (live), Game Review, and import-time auto-analysis.

import { logAppAudit } from './appAuditor';
import { getMisconceptionTag } from '../data/misconceptionTags';
import {
  diagnoseMisconception,
  AUTO_TAG_CONFIDENCE,
  type MisconceptionCandidate,
} from './misconceptionDiagnosis';
import type { TacticsLiveContext } from '../coach/types';

export interface ClassifyMisconceptionInput {
  /** Position BEFORE the played move (student to move). */
  fen: string;
  playedSan: string;
  /** Engine best and/or the masters' move, for the diagnosis + display. */
  bestSan?: string;
  bestUci?: string;
  mastersTopSan?: string;
  /** Plain-English eval summary (display only — diagnosis uses the numbers). */
  evalSummary?: string;
  /** STUDENT-perspective evals (centipawns). When both are known the detector
   *  uses the difference; otherwise it falls back to `cpLossStudent`. */
  evalBeforeStudent?: number | null;
  evalAfterStudent?: number | null;
  /** Centipawns lost vs best, student POV (the capture path supplies this). */
  cpLossStudent?: number | null;
  /** Which side the STUDENT played (the side to move at `fen`). Derived from the
   *  FEN turn when omitted. */
  studentColor?: 'white' | 'black';
  /** Pre-computed tactics at `fen` (threats/opportunities/hanging). */
  tactics?: TacticsLiveContext | null;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  /** What the student said when asked "why did you play that?" — voice or text. */
  userReason?: string;
}

export interface MisconceptionClassification {
  /** Closed-set tag id, the code-chosen best guess, or 'none' when no mistake. */
  tag: string;
  customLabel?: string;
  /** One-line board-grounded teaching note (the bucket's plain-English blurb —
   *  generic, no board-claim, so it can't hallucinate). */
  coachNote: string;
  /** How the tag was resolved: 'code' (auto / best guess), 'reason' (bounded LLM
   *  matched the student's words to a candidate), or 'none'. */
  source: 'code' | 'reason' | 'none';
  /** True when the surface should POP THE PICKER (confidence < bar or a tie).
   *  The caller shows `candidates` ranked, most-probable first. */
  needsPicker: boolean;
  /** The ranked candidate set (most-probable first) for the picker. */
  candidates: MisconceptionCandidate[];
}

/** Code-grounded teaching note for a tag — the bucket's plain-English blurb. */
function noteFor(tag: string): string {
  return getMisconceptionTag(tag)?.blurb ?? '';
}

/**
 * Classify a slip — 100% CODE, synchronous, never throws. Returns
 * `needsPicker: true` (with the ranked candidates) when a correction surface
 * should offer a re-tag rather than rely on the auto-tag. No LLM, no await.
 */
export function classifyMisconception(
  input: ClassifyMisconceptionInput,
): MisconceptionClassification | null {
  const studentColor =
    input.studentColor ?? (input.fen.split(' ')[1] === 'b' ? 'black' : 'white');

  let diag;
  try {
    diag = diagnoseMisconception({
      fenBefore: input.fen,
      playedSan: input.playedSan,
      bestSan: input.bestSan,
      bestUci: input.bestUci,
      evalBeforeStudent: input.evalBeforeStudent,
      evalAfterStudent: input.evalAfterStudent,
      cpLossStudent: input.cpLossStudent,
      studentColor,
      tactics: input.tactics,
    });
  } catch {
    return null;
  }

  const candidates = diag.candidates;

  // ── AUTO-TAG: code is confident + clear. No LLM. ──
  if (diag.top && !diag.needsPicker && diag.top.confidence >= AUTO_TAG_CONFIDENCE) {
    void logAppAudit({
      kind: 'claim-validator-trip', // reuse the subsystem audit channel
      category: 'subsystem',
      source: 'misconceptionClassifier.autoTag',
      summary: `auto-tag ${diag.top.tag} (conf=${diag.top.confidence.toFixed(2)}) — ${diag.top.evidence}`,
      fen: input.fen,
    });
    return { tag: diag.top.tag, coachNote: noteFor(diag.top.tag), source: 'code', needsPicker: false, candidates };
  }

  // ── NO LLM: the reason→candidate language-match was removed (David
  // 2026-06-10). Code's diagnosis is the whole story; an unsure slip is
  // corrected by a one-tap re-tag in the tab, never by the model. ──

  // ── Defer to the detector's verdict. `needsPicker` is true for a
  // real-but-unsure slip (the surface shows the ranked candidates, best guess
  // pre-suggested, + the judgment floor + Random) and FALSE for a sound move
  // (tag 'none' — don't bug the user). ──
  return {
    tag: diag.top?.tag ?? 'none',
    coachNote: diag.top ? noteFor(diag.top.tag) : '',
    source: 'code',
    needsPicker: diag.needsPicker,
    candidates,
  };
}
