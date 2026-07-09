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
import { logAppAudit } from './appAuditor';
import { validateBoardClaims, stripDisprovenSentences } from './boardClaimValidator';
import { injectCandidateArrows, injectCandidateHighlights, type RankedCandidate } from './arrowEngine';
import { stockfishEngine } from './stockfishEngine';
import { stripUngroundedTacticSentences } from './tacticClaimValidator';
import { stripDisprovenEvalSentences } from './evalClaimValidator';
import type { TacticsLiveContext } from '../coach/types';

/** Per-sentence spoken gate for STREAMING-TTS surfaces. Those hand each
 *  sentence to Polly as it arrives — BEFORE any final-text gate can run —
 *  so the gate must run here, on the single sentence about to be spoken.
 *  Returns true if the sentence is safe to speak; false (with an audit) if
 *  it makes a provably-false board-fact claim against `fen`. Cheap: one
 *  `new Chess(fen)` + regexes on one sentence (~0.5–1ms). When `fen` is
 *  absent there's no board to check against, so it passes (speak it). */
export function isSpokenSentenceGrounded(
  sentence: string,
  fen: string | null | undefined,
  source: string,
  tactics?: TacticsLiveContext | null,
): boolean {
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
    // TACTIC gate on the spoken sentence (David 2026-06-16): the voice
    // streams BEFORE the spine's final-text gate, so a hallucinated tactic
    // ("knight fork") not in the bounded context would otherwise be SPOKEN.
    // Drop the sentence when it asserts an out-of-vocabulary tactic (kept:
    // negation/avoidance phrasing — see stripUngroundedTacticSentences).
    if (tactics) {
      const t = stripUngroundedTacticSentences(sentence, tactics);
      if (t.dropped.length > 0) {
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: `${source}.spokenSentenceGate`,
          summary: `dropped an ungrounded-tactic sentence before speaking: "${sentence.slice(0, 60)}"`,
          details: JSON.stringify({ source, sentence: sentence.slice(0, 200), dropped: t.dropped.slice(0, 3) }),
          fen,
        });
        return false;
      }
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

// groundCoachReply — DELETED (David 2026-07-09: "finish ripping"). It was the
// runtime validate-after bandaid: run every strip gate (eval / player-stat /
// board-claim / move-sequence / tactic / opening-name) on a FREE-composed coach
// answer. The coach no longer free-composes chess — every turn is computed and
// voiced through voiceFacts — so there is nothing to strip. The board-truth
// guarantee is now structural (facts computed in code), not a downstream gate.
// `isSpokenSentenceGrounded` (VoiceChatMic's real-time spoken-sentence check)
// and `applyCandidateArrows` (the arrow-display pass) remain — neither is a
// free-compose gate.

/** Stockfish multipv adapter for the arrow engine: rank the top moves
 *  at `fen` so candidate arrows get engine-rank colors (no LLM, no
 *  per-move eval — one analysis ranks every mention). depth 12 is the
 *  fast-check depth; MultiPV 5 covers green/blue/yellow + a margin. */
async function rankCandidatesAtFen(fen: string): Promise<RankedCandidate[]> {
  const analysis = await stockfishEngine.analyzePosition(fen, 12, { MultiPV: 5 });
  return analysis.topLines
    .map((line) => {
      const uci = line.moves[0] ?? '';
      return { from: uci.slice(0, 2), to: uci.slice(2, 4), rank: line.rank };
    })
    .filter((r) => r.from.length === 2 && r.to.length === 2);
}

/** ASYNC arrow pass — the single arrow standard for chat surfaces.
 *  Strips any markers, finds every move the coach mentioned, resolves
 *  geometry in code, colors by Stockfish rank, and appends
 *  `[BOARD: arrow:from-to:color]` markers. The LLM never picks an
 *  arrow. Fen-bearing surfaces call this after `groundCoachReply`.
 *  Never throws — on any fault returns the text unchanged. */
export async function applyCandidateArrows(text: string, fen: string | null | undefined, source: string): Promise<string> {
  if (!text.trim() || !fen) return text;
  try {
    const { text: out, injected } = await injectCandidateArrows(text, fen, rankCandidatesAtFen);
    if (injected.length > 0) {
      void logAppAudit({
        kind: 'coach-narration-spoken',
        category: 'subsystem',
        source: `${source}.arrowEngine`,
        summary: `injected ${injected.length} code-arrow(s): ${injected.map((i) => `${i.san}:${i.color}`).join(', ')}`,
        details: JSON.stringify({ source, injected }),
        fen,
      });
    }
    return out;
  } catch {
    return text; // never block the reply on an arrow fault
  }
}

/** Code-derived HIGHLIGHT markers for a coach answer — the highlight twin
 *  of `applyCandidateArrows` (G0: highlights are derived from the squares
 *  the coach NAMED in prose, never drawn by the LLM). Returns just the
 *  marker strings to append; the caller parses them onto the board. Never
 *  throws. Synchronous — no engine needed (highlights are geometry-free). */
export function candidateHighlightMarkers(text: string, source: string): string[] {
  if (!text.trim()) return [];
  try {
    const { markers, squares } = injectCandidateHighlights(text);
    if (squares.length > 0) {
      void logAppAudit({
        kind: 'coach-narration-spoken',
        category: 'subsystem',
        source: `${source}.highlightEngine`,
        summary: `injected ${squares.length} code-highlight(s): ${squares.join(', ')}`,
        details: JSON.stringify({ source, squares }),
      });
    }
    return markers;
  } catch {
    return [];
  }
}
