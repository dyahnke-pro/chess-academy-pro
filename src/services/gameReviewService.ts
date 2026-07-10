// Post-game coach review — runs Stockfish analysis, then GROUNDS the review in
// the computed engine annotations (David 2026-07-09: one LLM command). The
// review is ASSEMBLED from the engine's per-move classifications + evals +
// preferred moves and VOICED through the one chokepoint (voiceFacts). The LLM
// never reasons about the game, so there is nothing to validate after — the old
// free getCoachCommentary + groundCoachReply bandaid is gone.

import { db } from '../db/schema';
import { voiceFacts } from './coachApi';
import { assembleGameReviewAnswer } from './groundedAnswer';
import { analyzeSingleGame } from './gameAnalysisService';

/**
 * Request a coach review for a stored game.
 * 1. Runs Stockfish analysis (or uses cached results) — the computed truth.
 * 2. Assembles the review facts from those annotations + voices them (grounded).
 * 3. Stores both annotations and coach text back to the game record.
 */
export async function requestGameReview(
  gameId: string,
  onStream?: (chunk: string) => void,
  onProgress?: (phase: string) => void,
): Promise<string> {
  const game = await db.games.get(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);

  // Step 1: Ensure Stockfish analysis exists — the computed grounding.
  onProgress?.('Running engine analysis…');
  const annotations = await analyzeSingleGame(gameId, onProgress);

  // Step 2: Assemble the review FACTS from the engine annotations and voice
  // them. Nothing is free-composed — the counts, evals, and preferred moves are
  // all the engine's; the LLM only phrases them (warmly).
  onProgress?.('Writing the review…');
  const grounded = assembleGameReviewAnswer({
    white: game.white,
    black: game.black,
    result: game.result,
    moveCount: estimateMoveCount(game.pgn),
    annotations,
    // The PGN roots each critical moment in the engine-reasoning walk (names
    // the preferred move + WHY, not a raw UCI) — David 2026-07-10.
    pgn: game.pgn,
  });

  const analysis = grounded
    ? (await voiceFacts(grounded.facts, { intent: 'game-review', warm: true })) ?? grounded.facts
    : 'No engine analysis was available for this game, so there is nothing to review yet.';

  if (onStream) onStream(analysis);

  // Store both engine annotations and coach text
  await db.games.update(gameId, {
    coachAnalysis: analysis,
    ...(annotations ? { annotations } : {}),
  });

  return analysis;
}

function estimateMoveCount(pgn: string): number {
  const moveText = pgn
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .trim();
  const tokens = moveText.split(/\s+/).filter((t) => !t.match(/^\d+\.+$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));
  return Math.ceil(tokens.length / 2);
}
