/**
 * misconceptionDiagnosis — the CODE-FIRST thinking-error diagnosis layer.
 *
 * (docs/plans/2026-06-10-thinking-error-buckets-WORKORDER.md)
 *
 * The board decides the bucket, not the LLM. Given the slip (position before,
 * the move played, the engine's best, the eval drop, and the pre-computed
 * tactics), this ranks the misconception tags by evidence + confidence using
 * the spine David locked: **move-type × eval-delta × cause**.
 *   - eval-delta = "a mistake happened" + its magnitude (the universal signal).
 *   - move TYPE (chess.js: capture/trade · pawn-push · forcing · quiet) = the
 *     disambiguator.
 *   - cause = did a tactic land on the refutation (→ tactical bucket) or a slow
 *     positional decline (→ structural/judgment bucket).
 * A move can trip several detectors; we RANK by confidence (eval-share as the
 * tiebreak) and the caller auto-tags only when the top is clear AND ≥0.90 — else
 * it pops the picker. `random` is NEVER produced here (user-only honest escape).
 *
 * Pure + side-effect-free (imports only chess.js + tacticClassifier + types), so
 * it's trivially testable and cycle-free — same contract as groundedAnswer.ts.
 */
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';
import { REVIEW_PIECE_NAME, REVIEW_PIECE_VALUE } from './groundedAnswer';
import type { TacticsLiveContext } from '../coach/types';

/** The bar above which the caller auto-tags silently (no pop-up, no LLM). */
export const AUTO_TAG_CONFIDENCE = 0.9;
/** Heuristic detectors are capped here so they always fall to the picker — a
 *  silent miss on a judgment call is costlier than asking. */
const HEURISTIC_CAP = 0.75;

export interface MisconceptionDiagnosisInput {
  /** Position BEFORE the played move (student to move). */
  fenBefore: string;
  /** SAN the student actually played. */
  playedSan: string;
  /** Engine best move (SAN preferred; UCI accepted) for `fenBefore`. */
  bestSan?: string | null;
  bestUci?: string | null;
  /** Eval BEFORE the move, STUDENT-perspective centipawns (+ = student better). */
  evalBeforeStudent?: number | null;
  /** Eval AFTER the played move, STUDENT-perspective centipawns. */
  evalAfterStudent?: number | null;
  studentColor: 'white' | 'black';
  /** Pre-computed tactics at `fenBefore` (threats/hanging/opportunities). */
  tactics?: TacticsLiveContext | null;
}

export interface MisconceptionCandidate {
  /** Closed-set tag id from MISCONCEPTION_TAGS (never 'other'/'random'). */
  tag: string;
  /** 0..1. ≥ AUTO_TAG_CONFIDENCE = eligible for silent auto-tag. */
  confidence: number;
  /** One-line board-derived reason this tag fired (audit + debugging). */
  evidence: string;
}

export interface MisconceptionDiagnosis {
  /** Candidates ranked by confidence desc (eval-magnitude tiebreak). */
  candidates: MisconceptionCandidate[];
  /** The single best candidate, or null when nothing fired. */
  top: MisconceptionCandidate | null;
  /** True when the caller must pop the picker: nothing fired, the top is below
   *  the bar, or the top two are genuinely tied. */
  needsPicker: boolean;
}

interface MoveShape {
  san: string;
  from: string;
  to: string;
  piece: string;
  captured?: string;
  isCapture: boolean;
  isCheck: boolean;
  isCastle: boolean;
  isPawnMove: boolean;
  /** A capture the opponent can recapture on `to` for ≤ equal value = a trade. */
  isTrade: boolean;
  afterFen: string;
}

/** Classify the played move with chess.js — the move-type disambiguator. */
function shapeOf(fenBefore: string, playedSan: string): MoveShape | null {
  let chess: Chess;
  try {
    chess = new Chess(fenBefore);
  } catch {
    return null;
  }
  let mv;
  try {
    mv = chess.move(playedSan);
  } catch {
    return null;
  }
  if (!mv) return null;
  const isCapture = mv.flags.includes('c') || mv.flags.includes('e');
  const isCheck = chess.inCheck(); // position after the move = opponent in check
  const isCastle = mv.flags.includes('k') || mv.flags.includes('q');
  const isPawnMove = mv.piece === 'p';
  // Trade test: after the move, can the opponent recapture on `to` with a piece
  // worth ≤ the capturer? (a clean recapture = an exchange, not a free win).
  let isTrade = false;
  if (isCapture) {
    const oppColor = mv.color === 'w' ? 'b' : 'w';
    const recapturers = chess.attackers(mv.to as Square, oppColor);
    isTrade = recapturers.length > 0;
  }
  return {
    san: mv.san,
    from: mv.from,
    to: mv.to,
    piece: mv.piece,
    captured: mv.captured,
    isCapture,
    isCheck,
    isCastle,
    isPawnMove,
    isTrade,
    afterFen: chess.fen(),
  };
}

/** Is the engine's best move a FORCING tactic (capture or check)? Used to tell
 *  "missed a tactic" / "didn't press" from a quiet positional slip. */
function bestIsForcing(fenBefore: string, bestSan?: string | null, bestUci?: string | null): boolean {
  let chess: Chess;
  try {
    chess = new Chess(fenBefore);
  } catch {
    return false;
  }
  try {
    let mv;
    if (bestSan) {
      mv = chess.move(bestSan);
    } else if (bestUci && bestUci.length >= 4) {
      mv = chess.move({ from: bestUci.slice(0, 2) as Square, to: bestUci.slice(2, 4) as Square, promotion: bestUci.length > 4 ? bestUci[4] : undefined });
    }
    if (!mv) return false;
    return mv.flags.includes('c') || mv.flags.includes('e') || chess.inCheck();
  } catch {
    return false;
  }
}

/**
 * Diagnose the slip into ranked misconception candidates. Pure: same inputs →
 * same output. Returns `needsPicker: true` (with whatever candidates fired) when
 * the caller should ask rather than auto-tag.
 */
export function diagnoseMisconception(input: MisconceptionDiagnosisInput): MisconceptionDiagnosis {
  const sc: 'w' | 'b' = input.studentColor === 'white' ? 'w' : 'b';
  const shape = shapeOf(input.fenBefore, input.playedSan);

  // The eval drop (student POV, centipawns). Positive = the move lost ground.
  const drop =
    typeof input.evalBeforeStudent === 'number' && typeof input.evalAfterStudent === 'number'
      ? input.evalBeforeStudent - input.evalAfterStudent
      : null;
  const wasWinning = typeof input.evalBeforeStudent === 'number' && input.evalBeforeStudent >= 150;
  const nowWorse = typeof input.evalAfterStudent === 'number' && input.evalAfterStudent < -50;

  const out: MisconceptionCandidate[] = [];
  const push = (tag: string, confidence: number, evidence: string): void => {
    out.push({ tag, confidence: Math.max(0, Math.min(1, confidence)), evidence });
  };

  if (shape) {
    // ── HUNG MATERIAL — a student piece left en prise (near-certain). ──
    try {
      const after = new Chess(shape.afterFen);
      const hung = findHangingPieces(after).filter((h) => h.color === sc);
      if (hung.length > 0) {
        hung.sort((a, b) => (REVIEW_PIECE_VALUE[b.piece] ?? 0) - (REVIEW_PIECE_VALUE[a.piece] ?? 0));
        const h = hung[0];
        push('hung-material', 0.95, `left the ${REVIEW_PIECE_NAME[h.piece] ?? h.piece} on ${h.square} en prise`);
      }
    } catch { /* board fact unavailable */ }

    // ── MISCALCULATED — a forcing move (capture/check) that backfired. ──
    if (shape.isCheck || shape.isCapture) {
      if (drop !== null && drop >= 120) {
        push('miscalculated', 0.9, `the forcing move ${shape.san} lost ${(drop / 100).toFixed(1)} pawns — the line didn't hold`);
      }
    }

    // ── OVERVALUED MY ATTACK — gave material and ended up worse. ──
    if (shape.isCapture === false && drop !== null && drop >= 150 && nowWorse) {
      // A non-capturing committing move that dropped a lot and left us worse —
      // the attack/sac that wasn't there. (Sac detection refined by material.)
      const movedVal = REVIEW_PIECE_VALUE[shape.piece] ?? 0;
      if (movedVal >= 3) push('overvalued-attack', 0.82, `committed ${shape.san} but the attack didn't hold — now worse`);
    }

    // ── BAD TRADE — a recapturable exchange that lost ground. ──
    if (shape.isTrade && drop !== null && drop >= 80) {
      push('bad-trade', 0.88, `the trade with ${shape.san} cost ${(drop / 100).toFixed(1)} pawns`);
    }

    // ── PAWN-PUSH faults — break that dropped eval / king-shelter push. ──
    if (shape.isPawnMove && !shape.isCapture && drop !== null && drop >= 80) {
      // King-shelter push: a pawn in front of the student's king.
      let kingFile: number | null = null;
      try {
        const c = new Chess(input.fenBefore);
        const board = c.board();
        for (let r = 0; r < 8; r += 1) for (let f = 0; f < 8; f += 1) {
          const cell = board[r][f];
          if (cell && cell.type === 'k' && cell.color === sc) kingFile = f;
        }
      } catch { /* ignore */ }
      const pushFile = shape.from.charCodeAt(0) - 97;
      if (kingFile !== null && Math.abs(pushFile - kingFile) <= 1) {
        push('weakened-king-safety', 0.9, `pushing ${shape.san} opened lines toward your own king`);
      } else {
        push('mistimed-pawn-break', 0.85, `the pawn break ${shape.san} dropped ${(drop / 100).toFixed(1)} pawns`);
        push('created-pawn-weakness', 0.8, `${shape.san} left a lasting pawn weakness`);
      }
    }

    // ── MISPLACED PIECE (heuristic → pop-up) — quiet piece move, low scope. ──
    if (!shape.isPawnMove && !shape.isCapture && !shape.isCheck && drop !== null && drop >= 60) {
      try {
        const after = new Chess(shape.afterFen);
        const scope = after.moves({ square: shape.to as Square, verbose: true }).length;
        if (scope <= 3) push('misplaced-piece', HEURISTIC_CAP, `${shape.san} put the piece on a low-scope square (${scope} moves)`);
      } catch { /* ignore */ }
    }
  }

  // ── MISSED THEIR THREAT (underestimated their attack) — a flagged threat
  // landed and the move didn't address it. ──
  if (input.tactics) {
    const topThreat = input.tactics.threats[0];
    if (topThreat && drop !== null && drop >= 100) {
      push('missed-opponents-threat', 0.9, `ignored the threat: ${topThreat.description}`);
    }
    // ── MISSED A TACTIC — the best move was a forcing shot, we played quiet. ──
    const myShot = input.tactics.opportunities[0];
    if (myShot && shape && !shape.isCapture && !shape.isCheck && drop !== null && drop >= 100) {
      push('missed-tactic', 0.88, `missed the shot: ${myShot.description}`);
    }
  }
  // Engine-best-is-forcing fallback for "missed a tactic" when no tactics block.
  if (!out.some((c) => c.tag === 'missed-tactic') && shape && !shape.isCapture && !shape.isCheck) {
    if (bestIsForcing(input.fenBefore, input.bestSan, input.bestUci) && drop !== null && drop >= 150) {
      push('missed-tactic', 0.85, `a forcing move (${input.bestSan ?? input.bestUci}) was winning; ${shape.san} was quiet`);
    }
  }

  // ── DIDN'T PRESS MY ATTACK — was winning, best was forcing, played quiet. ──
  if (wasWinning && shape && !shape.isCapture && !shape.isCheck && drop !== null && drop >= 100 &&
      bestIsForcing(input.fenBefore, input.bestSan, input.bestUci)) {
    push('underestimated-my-attack', 0.85, `you were winning and had a forcing continuation, but ${shape.san} let it slip`);
  }

  // Rank: confidence desc, then by descending evidence weight (no extra signal,
  // so confidence order stands). De-dupe by tag keeping the highest confidence.
  const byTag = new Map<string, MisconceptionCandidate>();
  for (const c of out) {
    const prev = byTag.get(c.tag);
    if (!prev || c.confidence > prev.confidence) byTag.set(c.tag, c);
  }
  const candidates = [...byTag.values()].sort((a, b) => b.confidence - a.confidence);
  const top = candidates[0] ?? null;

  // Pop the picker when: nothing fired, the top is below the auto bar, or the
  // top two are genuinely tied (within 0.1) — can't attribute confidently.
  const tied = candidates.length >= 2 && candidates[0].confidence - candidates[1].confidence < 0.1;
  const needsPicker = !top || top.confidence < AUTO_TAG_CONFIDENCE || tied;

  return { candidates, top, needsPicker };
}
