/**
 * coachMoveCommentary
 * -------------------
 * Produces GROUNDED, eval-tied coaching commentary after a move is played.
 *
 * G0 (David 2026-07-09, "full G0 for in-game narration" + the 2026-07-06 voice
 * law): the LLM DECIDES NOTHING. Every chess fact the coach speaks — the eval,
 * the tactic, the move's real effect — is COMPUTED in code (Stockfish +
 * `detectTactics` + `explainBestMoveGrounded`) and only PHRASED through the ONE
 * `voiceFacts` chokepoint (via `groundedMoveFeedback`). The old free-compose
 * apparatus — PLAY_SYSTEM_PROMPT, the personality dials, the opening-teaching
 * prompt — is RETIRED: it let the LLM read the board and invent forks / captures
 * / "the main trap here is…", the exact hallucination surface this build rips
 * out. Opening-teaching DEPTH re-enters through the grounded F11 pedagogy /
 * opening-book assemblers, never as free LLM prose.
 *
 * Two grounded paths:
 *   1. The student's OWN move, when we know the engine's best move at the prior
 *      position → `explainBestMoveGrounded` (what the best move wins / whether
 *      the played move hung material, computed via chess.js `attackers()`).
 *   2. Every other in-game moment (the AI opponent's own move, opening play) →
 *      `groundedMoveFeedback` (eval + board-verified tactics, student-relative),
 *      warmly phrased, with the opening name as computed framing.
 *
 * If nothing is computable, we return an empty string and the caller simply does
 * not narrate that move — never a canned "Nice move." filler, never free prose.
 *
 * This service lives outside React so it can be reused by any play or review view.
 */
import { Chess } from 'chess.js';
import { groundedMoveFeedback, voiceFacts } from './coachApi';
import { explainBestMoveGrounded } from './groundedAnswer';
import { logAppAudit } from './appAuditor';
import type { TacticsLiveContext, CoachPersonality, IntensityLevel } from '../coach/types';
import type { ChatMessage, CoachVerbosity, MoveClassification } from '../types';

export type MoveVerdict = 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' | 'neutral';

export interface MoveCommentaryInput {
  /** Chess instance positioned AFTER the move was played. */
  gameAfter: Chess;
  /** Side that just moved. */
  mover: 'w' | 'b';
  /** Stockfish eval (centipawns, positive = White winning) BEFORE the move. Null when unknown. */
  evalBefore: number | null;
  /** Stockfish eval AFTER the move (White's perspective). Null when unknown. */
  evalAfter: number | null;
  /** First SAN move of Stockfish's best continuation from the position AFTER the
   *  move, if known. Retained for API compatibility; the grounded in-game read
   *  deliberately does NOT reveal the engine's best reply during a live game
   *  (that would be a best-move spoiler) — it speaks the eval + the tactical
   *  picture instead. */
  bestReplySan?: string;
  /** Stockfish's best move (UCI) at the position BEFORE this move — i.e. what
   *  the mover should ideally have played. Threading it lets the GROUNDED move
   *  commentary path (move + eval + explainBestMoveGrounded) compute the move's
   *  real tactical effect in code and only PHRASE it via voiceFacts. */
  bestMoveUci?: string;
  /** The board-verified tactics context at the position AFTER the move
   *  (`buildFedTacticsContext`). Handed in so the grounded read can name the
   *  REAL threats / hanging pieces the code found — never an invented tactic. */
  tactics?: TacticsLiveContext | null;
  /** Optional opening subject (e.g. "Sicilian Najdorf"), resolved by the caller
   *  from the DB / detector. Used ONLY as a computed framing line ("This is
   *  still the Sicilian Najdorf.") — no move-by-move theory is invented here. */
  subject?: string;
  /** Narration density from UserPreferences.coachVerbosity. 'none' short-
   *  circuits to '' as a safety net. */
  verbosity?: CoachVerbosity;
  /** Prebuilt grounded data blocks (retained for API compatibility; the grounded
   *  read computes its own facts and no longer injects free-prose notes). */
  groundedNotes?: string[];
  /** True when the context is a post-game review. */
  reviewTone?: boolean;
  /** When true, skip everything and return '' (no narration). */
  offline?: boolean;
  /** Recent chat history (retained for API compatibility; unused by the grounded
   *  path — the coach no longer free-composes over chat memory). */
  chatHistory?: readonly ChatMessage[];
  /** Recent move classifications (retained for API compatibility). */
  recentMoveClassifications?: (MoveClassification | null)[];
  /** Timestamp of the most recent user interaction (retained for API compat). */
  lastUserInteractionMs?: number;
  /** Personality dials — retained for API compatibility ONLY. The app voice is
   *  the single depersonalized house voice (2026-07-06 voice law); these are no
   *  longer applied to the grounded read. */
  personality?: CoachPersonality;
  profanity?: IntensityLevel;
  mockery?: IntensityLevel;
  flirt?: IntensityLevel;
  /** Color the STUDENT is playing as. The coach plays the opposite color. */
  studentColor?: 'w' | 'b';
  /** Brief mode (retained for API compatibility). */
  briefMode?: boolean;
  /** Polly engine type (retained for API compatibility; the grounded read is
   *  voice-engine-agnostic). */
  voiceEngine?: 'generative' | 'neural';
  /** Optional streaming callback. The grounded read resolves as one computed
   *  string, so it fires once with the whole (already-clean) text. */
  onStream?: (chunk: string) => void;
}

/**
 * Classify an eval swing into a rough verdict from the MOVER's perspective.
 * Centipawn thresholds mirror gameImportUtils so review + play agree.
 */
export function classifyEvalSwing(
  evalBefore: number | null,
  evalAfter: number | null,
  mover: 'w' | 'b',
): MoveVerdict {
  if (evalBefore === null || evalAfter === null) return 'neutral';
  const sign = mover === 'w' ? 1 : -1;
  const swing = (evalAfter - evalBefore) * sign;
  if (swing >= 80) return 'excellent';
  if (swing >= 20) return 'good';
  if (swing <= -300) return 'blunder';
  if (swing <= -150) return 'mistake';
  if (swing <= -60) return 'inaccuracy';
  return 'book';
}

/**
 * Produce GROUNDED coaching commentary. Returns an empty string when there is
 * nothing computable to say (offline, no move yet, or a quiet position with no
 * eval/tactic to ground on) — callers treat empty as "do not narrate."
 */
export async function generateMoveCommentary(input: MoveCommentaryInput): Promise<string> {
  const fen = input.gameAfter.fen();
  if (input.offline) {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=offline',
      fen,
    });
    return '';
  }
  if (input.verbosity === 'none') {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=verbosity-none',
      fen,
    });
    return '';
  }

  const history = input.gameAfter.history({ verbose: true });
  if (history.length === 0) {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: 'reason=empty-history (gameAfter has no move history — caller likely passed a FEN-only Chess instance)',
      fen,
    });
    return '';
  }

  try {
    const response = await getGroundedCommentary(input, history);
    if (!response) {
      void logAppAudit({
        kind: 'commentary-skipped',
        category: 'subsystem',
        source: 'coachMoveCommentary.generateMoveCommentary',
        summary: 'reason=nothing-computable',
        fen,
      });
      return '';
    }
    return response.trim();
  } catch (err: unknown) {
    void logAppAudit({
      kind: 'commentary-skipped',
      category: 'subsystem',
      source: 'coachMoveCommentary.generateMoveCommentary',
      summary: `reason=error ${err instanceof Error ? err.message : String(err)}`,
      fen,
    });
    return '';
  }
}

interface VerboseMove {
  san: string;
  from: string;
  to: string;
  piece: string;
  color: 'w' | 'b';
  flags: string;
}

async function getGroundedCommentary(
  input: MoveCommentaryInput,
  history: VerboseMove[],
): Promise<string> {
  const { gameAfter, mover, evalAfter, subject, studentColor, tactics, onStream } = input;
  const last = history[history.length - 1];

  // ── GROUNDED path 1 — the student's OWN move, when the engine's best move at
  //    the prior position is known. `explainBestMoveGrounded` computes the
  //    move's real tactical effect (what the best move wins; whether the played
  //    move hung material, via chess.js `attackers()`); voiceFacts only PHRASES
  //    it. The LLM never reads the board to DECIDE what the move did.
  if (!input.reviewTone && input.bestMoveUci && last && mover === studentColor) {
    let fenBefore: string | null = null;
    try {
      const cloneBefore = new Chess();
      cloneBefore.loadPgn(gameAfter.pgn());
      cloneBefore.undo();
      fenBefore = cloneBefore.fen();
    } catch {
      fenBefore = null;
    }
    if (fenBefore) {
      const moverColor: 'white' | 'black' = mover === 'w' ? 'white' : 'black';
      const facts = explainBestMoveGrounded(fenBefore, last.san, input.bestMoveUci, moverColor);
      if (facts) {
        const voiced = await voiceFacts(facts, { intent: 'move-commentary', warm: true });
        const out = voiced ?? facts;
        if (onStream && out) onStream(out);
        return out;
      }
      // A quiet move with no code-computable tactical fact: stay silent rather
      // than free-narrate — UNLESS there's an opening subject to teach, which
      // flows to the grounded position read below.
      if (!subject) return '';
    }
  }

  // ── GROUNDED path 2 — every other in-game moment (the AI opponent's own move,
  //    opening play). Compute the position read — eval + the board-verified
  //    tactics — and phrase it WARMLY through the ONE voiceFacts chokepoint via
  //    `groundedMoveFeedback`. We deliberately DON'T pass bestMoveUci here: this
  //    is a LIVE game, so revealing the engine's best reply would be a spoiler —
  //    the read speaks the eval + the tactical picture the student should weigh.
  //    The opening name is the only authored framing (the caller resolved it
  //    from the DB / detector); it names no moves.
  const fenAfter = gameAfter.fen();
  const studentColorFull: 'white' | 'black' | undefined =
    studentColor === 'w' ? 'white' : studentColor === 'b' ? 'black' : undefined;
  const framing = subject ? `This is still the ${subject}.` : undefined;
  const grounded = await groundedMoveFeedback({
    fen: fenAfter,
    evalCp: evalAfter,
    tactics: tactics ?? undefined,
    studentColor: studentColorFull,
    surface: input.reviewTone ? 'move-commentary-review' : 'move-commentary',
    extraFacts: framing,
    warm: true,
  });
  const out = grounded ?? '';
  if (onStream && out) onStream(out);
  return out;
}
