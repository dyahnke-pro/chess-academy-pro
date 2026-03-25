// Post-game coach review — sends a game PGN to the coach API and stores the
// analysis back into the game record.

import { db } from '../db/schema';
import { getCoachCommentary } from './coachApi';
import type { CoachContext } from '../types';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Request a coach review for a stored game.
 * Calls the LLM and writes the result back to the game record.
 * Returns the analysis text.
 */
export async function requestGameReview(
  gameId: string,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const game = await db.games.get(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);

  const context: CoachContext = {
    fen: DEFAULT_FEN,
    lastMoveSan: null,
    moveNumber: 0,
    pgn: game.pgn,
    openingName: game.eco,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: { rating: 1500, weaknesses: [] },
    additionalContext: buildReviewPrompt(game.white, game.black, game.result, game.pgn),
  };

  const analysis = await getCoachCommentary('game_post_review', context, onStream);

  // Store back in the game record
  await db.games.update(gameId, { coachAnalysis: analysis });

  return analysis;
}

function buildReviewPrompt(
  white: string,
  black: string,
  result: string,
  pgn: string,
): string {
  const moveCount = estimateMoveCount(pgn);
  return [
    `Game: ${white} (White) vs ${black} (Black), Result: ${result}`,
    `Approximately ${moveCount} moves.`,
    'Please provide a comprehensive game review covering:',
    '1. Opening assessment — how well were the opening principles followed?',
    '2. Key turning point(s) — the critical moment(s) that decided the game.',
    '3. Tactical opportunities — any missed tactics by either side.',
    '4. Endgame assessment (if applicable).',
    '5. Top 2-3 lessons to take away from this game.',
    'Be specific and refer to moves by number when possible. Keep it under 300 words.',
  ].join('\n');
}

function estimateMoveCount(pgn: string): number {
  const moveText = pgn
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .trim();
  const tokens = moveText.split(/\s+/).filter((t) => !t.match(/^\d+\.+$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));
  return Math.ceil(tokens.length / 2);
}
