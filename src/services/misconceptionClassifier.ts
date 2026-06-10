// Misconception classifier — CODE-FIRST (thinking-error buckets, 2026-06-10).
//
// The board decides the bucket, not the LLM. `diagnoseMisconception` computes
// ranked candidates + confidence from move-type × eval × cause:
//   - top ≥ AUTO_TAG_CONFIDENCE and clear → AUTO-TAG silently (no LLM call).
//   - else, if the student gave a free-text reason → a BOUNDED LLM matches that
//     reason to the CODE-COMPUTED candidate set (it may only return a tag in the
//     set — never an invented diagnosis; the gate enforces it).
//   - else → return `needsPicker` + the ranked candidates so the surface pops
//     the picker (most-probable first). `random` is never produced here.
//
// This inverts the last LLM decision in the misconception path: the model no
// longer PICKS the chess error; it only maps the student's words onto code's
// computed options and (elsewhere) voices the board-grounded note. Shared by
// Discussion Practice (live), Game Review, and import-time auto-analysis.

import { getCoachChatResponse } from './coachApi';
import { logAppAudit } from './appAuditor';
import { getMisconceptionTag, isMisconceptionTagId } from '../data/misconceptionTags';
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

/** A BOUNDED language-match: given the student's reason + the CODE-computed
 *  candidate set, the LLM returns the ONE candidate that best matches the
 *  student's wording — or 'none'. The gate (caller-side too) is that the result
 *  must be a member of `candidates`; the LLM cannot invent a diagnosis. It does
 *  language work, never chess. Returns null on any miss. */
async function matchReasonToCandidates(
  reason: string,
  candidates: MisconceptionCandidate[],
): Promise<string | null> {
  if (candidates.length === 0) return null;
  const menu = candidates
    .map((c) => `${c.tag}: ${getMisconceptionTag(c.tag)?.blurb ?? c.tag}`)
    .join('\n');
  const system =
    'You map a chess student\'s stated reason for a move onto ONE option from a ' +
    'fixed list. Reply with ONLY the option id (left of the colon), or the word ' +
    'none. Do not explain. Do not invent an id that is not in the list.';
  const user = `Options:\n${menu}\n\nStudent said: "${reason}"\n\nWhich option id best matches their reasoning?`;
  let raw: string;
  try {
    raw = await getCoachChatResponse(
      [{ role: 'user', content: user }],
      system,
      undefined,
      'bad_habit_report',
      20,
      undefined,
      undefined,
      true, // skipPersonality — clean id only
    );
  } catch {
    return null;
  }
  const picked = (raw.match(/[a-z][a-z-]+/i)?.[0] ?? '').toLowerCase();
  // GATE: the returned tag MUST be one the code computed. No LLM-invented tag.
  if (candidates.some((c) => c.tag === picked)) return picked;
  return null;
}

/** Code-grounded teaching note for a tag — the bucket's plain-English blurb. */
function noteFor(tag: string): string {
  return getMisconceptionTag(tag)?.blurb ?? '';
}

/**
 * Classify a slip CODE-FIRST. Never throws. Returns `needsPicker: true` (with
 * the ranked candidates) when the surface should ask rather than auto-tag.
 */
export async function classifyMisconception(
  input: ClassifyMisconceptionInput,
): Promise<MisconceptionClassification | null> {
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

  // ── BOUNDED LLM MATCH: the student gave a reason — map it to the candidates. ──
  if (input.userReason && input.userReason.trim() && candidates.length > 0) {
    const matched = await matchReasonToCandidates(input.userReason, candidates);
    if (matched && isMisconceptionTagId(matched)) {
      return { tag: matched, coachNote: noteFor(matched), source: 'reason', needsPicker: false, candidates };
    }
  }

  // ── Otherwise: defer to the detector's verdict. `needsPicker` is true for a
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
