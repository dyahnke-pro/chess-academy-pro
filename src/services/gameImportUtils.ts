import { Chess } from 'chess.js';
import { db } from '../db/schema';
import type { MoveAnnotation, MoveClassification } from '../types';
import { isBookLine } from './openingDetectionService';
import { INACCURACY_CP, MISTAKE_CP, BLUNDER_CP } from './engineConstants';

// ─── Opening Detection ──────────────────────────────────────────────────────

/**
 * Match a PGN's first moves against the openings table to find the best match.
 * Returns the openingId of the longest-matching opening, or null.
 */
export async function detectOpening(pgn: string): Promise<string | null> {
  const gameMoves = extractMovesFromPgn(pgn);
  if (gameMoves.length === 0) return null;

  // Build a move prefix string from the game (first 10 moves = up to 20 half-moves)
  const maxHalfMoves = 20;
  const prefix = gameMoves.slice(0, maxHalfMoves).join(' ');

  const allOpenings = await db.openings.toArray();

  let bestMatch: { id: string; length: number } | null = null;

  for (const opening of allOpenings) {
    const openingMoves = opening.pgn.split(/\s+/).filter((m) => m.length > 0);

    if (openingMoves.length === 0) continue;
    if (openingMoves.length > gameMoves.length) continue;

    // Check if game starts with this opening's moves
    const openingStr = openingMoves.join(' ');
    if (prefix.startsWith(openingStr) &&
        (prefix.length === openingStr.length || prefix[openingStr.length] === ' ')) {
      if (!bestMatch || openingMoves.length > bestMatch.length) {
        bestMatch = { id: opening.id, length: openingMoves.length };
      }
    }
  }

  return bestMatch?.id ?? null;
}

/**
 * Extract SAN moves from a PGN string, stripping move numbers and annotations.
 */
function extractMovesFromPgn(pgn: string): string[] {
  if (!pgn.trim()) return [];

  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.history();
  } catch {
    // Fallback: manual extraction if chess.js can't parse
    const moveSection = pgn.replace(/\[.*?\]\s*/g, '').trim();
    return moveSection
      .replace(/\{[^}]*\}/g, '')       // Remove comments
      .replace(/\([^)]*\)/g, '')       // Remove variations
      .replace(/\d+\.+/g, '')          // Remove move numbers
      .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '') // Remove result
      .split(/\s+/)
      .filter((m) => m.length > 0 && !m.startsWith('$'));
  }
}

// ─── Blunder Detection ──────────────────────────────────────────────────────

const BLUNDER_THRESHOLD_CP = 150;

/**
 * Parse eval annotations from PGN comments and detect blunders.
 * Looks for patterns like {[%eval 0.5]} or {[%eval #3]} in the PGN.
 * A blunder is a move where the eval drops by more than 150cp from the
 * player's perspective.
 */
export function detectBlunders(pgn: string): MoveAnnotation[] | null {
  const evals = parseEvalComments(pgn);
  if (evals.length < 2) return null;

  const moves = extractMovesFromPgn(pgn);
  const annotations: MoveAnnotation[] = [];

  for (let i = 1; i < evals.length; i++) {
    const prev = evals[i - 1];
    const curr = evals[i];
    if (prev.cp === null || curr.cp === null) continue;

    // Eval is from White's perspective. A White move (even index) is bad
    // when eval drops; a Black move (odd index) is bad when eval rises.
    const isWhiteMove = i % 2 === 0;
    const drop = isWhiteMove
      ? prev.cp - curr.cp  // White's move made eval drop (bad for White)
      : curr.cp - prev.cp; // Black's move made eval rise (bad for Black)

    if (drop > BLUNDER_THRESHOLD_CP) {
      const moveNumber = Math.floor(i / 2) + 1;
      const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
      const san = moves[i] ?? '?';

      const classification = classifyDrop(drop);

      annotations.push({
        moveNumber,
        color,
        san,
        // Eval stored in CENTIPAWNS (White POV) to match the contract
        // established by gameAnalysisService — the legacy `curr.cp / 100`
        // pawn-unit storage was retired when `bestMoveEval` was added.
        evaluation: curr.cp,
        bestMove: null,
        // `prev.cp` is the engine's read of the position BEFORE this
        // move — i.e., what the player could have achieved with best
        // play. Same cp/White-POV unit as `evaluation`.
        bestMoveEval: prev.cp,
        classification,
        comment: null,
      });
    }
  }

  return annotations.length > 0 ? annotations : null;
}

/** Depth stamped on a game whose eval curve came from the PGN's own
 *  `[%eval]` comments (lichess server analysis). Deliberately BELOW
 *  `ANALYSIS_DEPTH` so the review still deep-dives the key moments on open —
 *  the server gives us the curve but never the BEST MOVE, and the walk's
 *  "Show me" arrows need one. The dive fills it in (in the background, see
 *  CoachReviewSessionPage) while the curve itself stays server-grade. */
export const EVAL_COMMENT_ANALYSIS_DEPTH = 12;

/** Clamp a comment eval so a mate score (±10000) can't blow up cpLoss. */
function clampCp(cp: number): number {
  return Math.max(-1000, Math.min(1000, cp));
}

/**
 * FULL per-ply annotations from a PGN's `[%eval]` comments — the whole eval
 * curve, not just the blunders (`detectBlunders`). Lichess writes one eval
 * after EVERY move when the user ran server analysis, at a depth deeper than
 * the phone will ever reach, so a game that carries them needs NO local
 * eval pass at all (David 2026-09-05: "prevent any need for preview
 * analysis"). Returns null when the comments do not cover every ply — a
 * partial curve would grade the uncovered plies as `good` and lie.
 *
 * Classification mirrors the review's thresholds (INACCURACY / MISTAKE /
 * BLUNDER) with the same book exemption: a theory move is never flagged for
 * opening noise, but a genuine blunder surfaces even in a named line.
 * `bestMove` is unknown here (the comments don't carry it) — the review's
 * deep dive supplies it for flagged plies.
 */
export function annotationsFromEvalComments(pgn: string): MoveAnnotation[] | null {
  const evals = parseEvalComments(pgn);
  const moves = extractMovesFromPgn(pgn);
  if (moves.length === 0 || evals.length < moves.length) return null;
  if (evals.some((e) => e.cp === null)) return null;

  const annotations: MoveAnnotation[] = [];
  let stillBook = true;
  for (let i = 0; i < moves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    // evals[i] is the eval AFTER move i; the start position has no comment.
    const evalBefore = i === 0 ? 0 : (evals[i - 1].cp as number);
    const evalAfter = evals[i].cp as number;
    const cpLoss = isWhiteMove
      ? clampCp(evalBefore) - clampCp(evalAfter)
      : clampCp(evalAfter) - clampCp(evalBefore);

    const moveIsBook = stillBook && isBookLine(moves.slice(0, i + 1));
    if (!moveIsBook) stillBook = false;

    let classification: MoveClassification = 'good';
    if (cpLoss >= BLUNDER_CP) classification = 'blunder';
    else if (cpLoss >= MISTAKE_CP) classification = 'mistake';
    else if (cpLoss >= INACCURACY_CP) classification = 'inaccuracy';
    if (moveIsBook && classification !== 'blunder') classification = 'book';

    annotations.push({
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san: moves[i],
      evaluation: evalAfter,
      bestMove: null,
      bestMoveEval: evalBefore,
      classification,
      comment: null,
    });
  }
  return annotations;
}

function classifyDrop(dropCp: number): MoveClassification {
  if (dropCp >= 300) return 'blunder';
  if (dropCp >= 150) return 'mistake';
  return 'inaccuracy';
}

interface EvalEntry {
  cp: number | null;
}

/**
 * Parse eval annotations from PGN comments.
 * Supports: {[%eval 1.23]}, {[%eval -0.5]}, {[%eval #3]}, {[%eval #-2]}
 */
/**
 * Per-ply remaining clock (ms) from `[%clk H:MM:SS(.f)]` move comments, in move
 * order — index i = remaining time for the side that played ply i, which is
 * exactly what `GameRecord.clockRemainingMs` (and the time-trouble detector)
 * expect. Returns [] for untimed games / PGNs without clock tags. Lichess and
 * Chess.com emit a `[%clk]` on every move of a timed game, so the document
 * order of the tags lines up with ply order.
 */
export function extractClockMs(pgn: string): number[] {
  const out: number[] = [];
  const re = /\[%clk\s+([0-9]+(?::[0-9]+){0,2}(?:\.[0-9]+)?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pgn)) !== null) {
    const parts = match[1].split(':').map(Number);
    let secs: number;
    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
    else secs = parts[0];
    if (Number.isFinite(secs)) out.push(Math.round(secs * 1000));
  }
  return out;
}

function parseEvalComments(pgn: string): EvalEntry[] {
  const evals: EvalEntry[] = [];
  const evalRegex = /\[%eval\s+([#\-\d.]+)\]/g;

  // Strip PGN headers (lines like [Event "..."], [Site "..."], etc.)
  // but preserve inline annotations like {[%eval 0.5]}
  const moveSection = pgn.replace(/^\[(\w+)\s+"[^"]*"\]\s*$/gm, '').trim();

  let match: RegExpExecArray | null;
  while ((match = evalRegex.exec(moveSection)) !== null) {
    const val = match[1];
    if (val.startsWith('#')) {
      // Mate eval: convert to large centipawn value
      const mateIn = parseInt(val.slice(1));
      evals.push({ cp: mateIn > 0 ? 10000 : -10000 });
    } else {
      const cp = Math.round(parseFloat(val) * 100);
      evals.push({ cp: isNaN(cp) ? null : cp });
    }
  }

  return evals;
}
