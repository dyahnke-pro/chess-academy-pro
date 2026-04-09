// Post-game coach review — runs Stockfish analysis first, then sends the PGN
// and engine-backed move classifications to the coach API for commentary.

import { db } from '../db/schema';
import { getCoachCommentary } from './coachApi';
import { analyzeSingleGame } from './gameAnalysisService';
import type { CoachContext, MoveAnnotation } from '../types';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Request a coach review for a stored game.
 * 1. Runs Stockfish analysis (or uses cached results).
 * 2. Passes PGN + engine annotations to the LLM for informed commentary.
 * 3. Stores both annotations and coach text back to the game record.
 */
export async function requestGameReview(
  gameId: string,
  onStream?: (chunk: string) => void,
  onProgress?: (phase: string) => void,
): Promise<string> {
  const game = await db.games.get(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);

  // Step 1: Ensure Stockfish analysis exists
  onProgress?.('Running engine analysis…');
  const annotations = await analyzeSingleGame(gameId, onProgress);

  // Step 2: Build context with engine data
  onProgress?.('Generating coach commentary…');
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
    additionalContext: buildReviewPrompt(game.white, game.black, game.result, game.pgn, annotations),
  };

  const analysis = await getCoachCommentary('game_post_review', context, onStream);

  // Store both engine annotations and coach text
  await db.games.update(gameId, {
    coachAnalysis: analysis,
    ...(annotations ? { annotations } : {}),
  });

  return analysis;
}

function buildReviewPrompt(
  white: string,
  black: string,
  result: string,
  pgn: string,
  annotations: MoveAnnotation[] | null,
): string {
  const moveCount = estimateMoveCount(pgn);
  const lines: string[] = [
    `Game: ${white} (White) vs ${black} (Black), Result: ${result}`,
    `Approximately ${moveCount} moves.`,
  ];

  const blunders = annotations ? annotations.filter(a => a.classification === 'blunder') : [];
  const mistakes = annotations ? annotations.filter(a => a.classification === 'mistake') : [];
  const inaccuracies = annotations ? annotations.filter(a => a.classification === 'inaccuracy') : [];

  if (annotations && annotations.length > 0) {
    lines.push('');
    lines.push('Engine analysis (Stockfish depth 12-18):');

    lines.push(`Blunders: ${blunders.length}, Mistakes: ${mistakes.length}, Inaccuracies: ${inaccuracies.length}`);
    lines.push('');

    // List critical moves for Claude to comment on
    const critical = annotations.filter(
      a => a.classification === 'blunder' || a.classification === 'mistake' || a.classification === 'brilliant',
    );
    for (const move of critical) {
      const evalStr = move.evaluation !== null ? `eval ${move.evaluation > 0 ? '+' : ''}${move.evaluation.toFixed(1)}` : '';
      const bestStr = move.bestMove ? `best was ${move.bestMove}` : '';
      lines.push(
        `  Move ${move.moveNumber}${move.color === 'black' ? '...' : '.'} ${move.san} — ${move.classification.toUpperCase()} ${evalStr} ${bestStr}`.trim(),
      );
    }

    lines.push('');
  }

  const totalErrors = blunders.length + mistakes.length + inaccuracies.length;
  lines.push(`Total errors: ${totalErrors} (${blunders.length} blunders, ${mistakes.length} mistakes, ${inaccuracies.length} inaccuracies)`);
  lines.push('');

  lines.push(
    'Please provide a comprehensive game review covering:',
    '1. Opening assessment — how well were the opening principles followed?',
    '2. Key turning point(s) — refer to the engine-flagged blunders/mistakes above.',
    '3. For each blunder/mistake, explain WHY it was bad and what the better move achieves.',
    '4. Endgame assessment (if applicable).',
    '5. Top 2-3 lessons to take away from this game.',
    '',
    'IMPORTANT: Be honest and specific. If there were blunders, call them out directly.',
    'Do NOT say the game was "excellent" or "well-played" if there were multiple mistakes.',
    `This game had ${blunders.length} blunder(s) and ${mistakes.length} mistake(s) — calibrate your assessment accordingly.`,
    'A game with 0 blunders and 0-1 mistakes is good. 2+ blunders means significant issues to address.',
    'Be specific and refer to moves by number. Keep it under 400 words.',
  );

  return lines.join('\n');
}

function estimateMoveCount(pgn: string): number {
  const moveText = pgn
    .replace(/\[.*?\]/g, '')
    .replace(/\{.*?\}/g, '')
    .trim();
  const tokens = moveText.split(/\s+/).filter((t) => !t.match(/^\d+\.+$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));
  return Math.ceil(tokens.length / 2);
}
