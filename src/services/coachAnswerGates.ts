/**
 * coachAnswerGates — the single, shared RUNTIME grounding gate applied to
 * every coach LLM answer, on every surface.
 *
 * Before this existed, the validators were scattered: board-claim on the
 * hint hook, arrow/tactic on CoachTeachPage, the player-stat strip inline
 * in the spine — so the surfaces that bypass the spine (masterclass chat,
 * middlegame practice, live-coach, position narration) shipped UNVALIDATED
 * prose, and the teach hallucination ("the knight on a3" on an empty a3,
 * "Over 1,700 of his games…") sailed through. This module is the one place
 * every gate lives, so wiring a surface = one call.
 *
 * Four gates, in order — each best-effort, never throws into the answer:
 *
 *   0. PLAYER-STAT (enforcing) — drops a sentence attributing a fabricated
 *      number / superlative to a pro when NO player-data tool grounded the
 *      turn ("<pro> plays e4 55%"). The NAME is kept (factual reference);
 *      only the unsupported stat is dropped.
 *   1. BOARD-CLAIM (enforcing) — drops a provably-false piece-on-square /
 *      pin claim against the board the prose describes. Marker-safe: the
 *      lie is removed from BOTH the spoken [VOICE:] block and the visible
 *      prose without breaking [BOARD:]/[[ACTION:]] tags.
 *   2. ARROW (enforcing) — synthesises the [BOARD: arrow:…] markers the
 *      brain forgot for SANs it named (G6 lead-the-eye).
 *   3. TACTIC (audit) — flags tactic vocabulary not in the bounded
 *      TacticsLiveContext.
 *
 * `source` namespaces the audit events to the caller (spine vs a specific
 * surface) so the audit log shows where a gate tripped.
 */
import { Chess } from 'chess.js';
import { logAppAudit } from './appAuditor';
import { groundCoachAnswerBoardClaims, validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';
import { stripUngroundedPlayerStats } from './claimValidator';
import { validateArrowClaims, synthesizeMissingArrows } from './arrowClaimValidator';
import { validateTacticClaims } from './tacticClaimValidator';
import { stripDisprovenEvalSentences } from './evalClaimValidator';
import type { TacticsLiveContext } from '../coach/types';

/** Per-sentence spoken gate for STREAMING-TTS surfaces. Those hand each
 *  sentence to Polly as it arrives — BEFORE any final-text gate can run —
 *  so the gate must run here, on the single sentence about to be spoken.
 *  Returns true if the sentence is safe to speak; false (with an audit) if
 *  it makes a provably-false board-fact claim against `fen`. Cheap: one
 *  `new Chess(fen)` + regexes on one sentence (~0.5–1ms). When `fen` is
 *  absent there's no board to check against, so it passes (speak it). */
export function isSpokenSentenceGrounded(sentence: string, fen: string | null | undefined, source: string): boolean {
  if (!fen) return true;
  try {
    const { violations } = validateBoardClaims(sentence, fen);
    if (violations.length > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.spokenSentenceGate`,
        summary: `dropped a board-false sentence before speaking: "${sentence.slice(0, 60)}"`,
        details: JSON.stringify({ source, sentence: sentence.slice(0, 200), reasons: violations.map((v) => v.reason) }),
        fen,
      });
      return false;
    }
  } catch { /* never block speech on a validator fault */ }
  return true;
}

/** THE shared narration gate for CONTENT GENERATORS (openingGenerator,
 *  walkthroughLlmNarrator, middlegamePlanner, …). A generator produces
 *  per-move / per-position prose offline; this validates ONE such string
 *  against the position it describes and drops only PROVABLY-false
 *  board-fact (piece-on-square / pin) sentences — and, when an engine eval
 *  for that position is known, eval-contradicting sentences too. Positional
 *  phrasing is left untouched (the idea-frontier). Every generator calls
 *  THIS, so there is one source of truth and no drift with the spine (which
 *  uses the same boardClaimValidator/evalClaimValidator primitives).
 *
 *  Returns the cleaned text (may be '' if the whole line was a board lie —
 *  silent beats false). `source` namespaces the audit. */
export function gradeNarrationText(
  text: string | undefined,
  fen: string | null | undefined,
  source: string,
  evalCp?: number | null,
): string | undefined {
  if (!text || !text.trim() || !fen) return text;
  try {
    let out = text;
    const board = stripDisprovenSentences(out, fen);
    let droppedCount = board.dropped.length;
    out = droppedCount > 0 ? board.clean : out;
    if (typeof evalCp === 'number') {
      const ev = stripDisprovenEvalSentences(out, evalCp);
      droppedCount += ev.dropped.length;
      out = ev.dropped.length > 0 ? ev.clean : out;
    }
    if (droppedCount > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.narrationGate`,
        summary: `dropped ${droppedCount} board/eval-false narration sentence(s)`,
        details: JSON.stringify({ source, fen, kept: out.slice(0, 120) }),
        fen,
      });
    }
    return out;
  } catch {
    return text; // never break generation on a validator fault
  }
}

export interface CoachAnswerGateOptions {
  /** The board FEN the prose describes (board + arrow gates need it). When
   *  absent, those two gates are skipped — a surface with no live board
   *  (e.g. opening Q&A) can't have its board-facts checked. */
  fen?: string | null;
  /** The bounded tactics context injected this turn, for the tactic gate. */
  tactics?: TacticsLiveContext | null;
  /** True when a player-data tool returned data this turn — when false the
   *  player-stat gate fires (any pro stat is then ungrounded). Defaults to
   *  false (the safe default for a surface that runs no player tools). */
  playerDataGrounded?: boolean;
  /** Ground-truth engine eval (White's-perspective centipawns) for the
   *  position the prose describes. When present, the eval gate drops a
   *  sentence whose who's-winning claim egregiously contradicts it. */
  evalCp?: number;
  /** Mate distance in plies (positive = White mates). Supersedes evalCp. */
  evalMateIn?: number;
  /** Audit-source namespace, e.g. "coachService" or "masterclassChat". */
  source: string;
}

/** Run every grounding gate on a coach answer. Returns the cleaned text
 *  (lying sentences dropped, missing arrows synthesised). Pure aside from
 *  fire-and-forget audit logging. */
export function groundCoachReply(text: string, opts: CoachAnswerGateOptions): string {
  let out = text;
  if (!out.trim()) return out;
  const { fen, tactics = null, playerDataGrounded = false, evalCp, evalMateIn, source } = opts;

  // (eval) Who's-winning gate — drop a sentence whose assessment
  // egregiously contradicts the ground-truth engine eval ("you're up a
  // pawn" after losing the queen). Conservative thresholds (multi-pawn);
  // a fuzzy judgment call is never touched. Runs only when an eval exists.
  if (typeof evalCp === 'number' || typeof evalMateIn === 'number') {
    try {
      const evalGate = stripDisprovenEvalSentences(out, evalCp, evalMateIn);
      if (evalGate.dropped.length > 0) {
        out = evalGate.clean;
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: `${source}.evalClaimGate`,
          summary: `dropped ${evalGate.dropped.length} eval-false sentence(s) (engine ${typeof evalMateIn === 'number' ? `mate ${evalMateIn}` : ((evalCp ?? 0) / 100).toFixed(1)})`,
          details: JSON.stringify({ source, evalCp, evalMateIn, dropped: evalGate.dropped }),
          fen: fen ?? undefined,
        });
      }
    } catch { /* never block */ }
  }

  // (0) Player-stat gate.
  try {
    const statGate = stripUngroundedPlayerStats(out, playerDataGrounded);
    if (statGate.dropped.length > 0) {
      out = statGate.text;
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.playerStatGate`,
        summary: `dropped ${statGate.dropped.length} ungrounded player-stat sentence(s)`,
        details: JSON.stringify({ source, dropped: statGate.dropped }),
      });
    }
  } catch { /* never block */ }

  // (1) Board-claim gate.
  if (fen) {
    try {
      const grounded = groundCoachAnswerBoardClaims(out, fen);
      if (grounded.violations.length > 0) {
        out = grounded.text;
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: `${source}.boardClaimGate`,
          summary: `dropped ${grounded.dropped.length} board-false sentence(s): ${grounded.violations.map((v) => v.reason).slice(0, 3).join('; ')}`,
          details: JSON.stringify({ source, fen, violations: grounded.violations, dropped: grounded.dropped }),
          fen,
        });
      }
    } catch { /* never block */ }
  }

  // (2) Arrow gate.
  if (fen) {
    try {
      const arrowV = validateArrowClaims(out);
      if (arrowV.violations.length > 0) {
        const synth = synthesizeMissingArrows(out, fen, arrowV.violations, Chess, 'green');
        out = synth.text;
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: `${source}.arrowClaimGate`,
          summary: `arrows: synthesized ${synth.synthesized.length}/${arrowV.violations.length}`,
          details: JSON.stringify({ source, synthesized: synth.synthesized, failed: synth.failed }),
          fen,
        });
      }
    } catch { /* never block */ }
  }

  // (3) Tactic gate (audit-only).
  try {
    const tacticV = validateTacticClaims(out, tactics);
    if (tacticV.violations.length > 0) {
      void logAppAudit({
        kind: 'claim-validator-trip',
        category: 'subsystem',
        source: `${source}.tacticClaimGate`,
        summary: `out-of-vocab tactics: ${tacticV.violations.map((v) => v.type).join(', ')}`,
        details: JSON.stringify({ source, violations: tacticV.violations }),
      });
    }
  } catch { /* never block */ }

  return out;
}
