import { Chess } from 'chess.js';
import { db } from '../db/schema';
import type { OpeningRecord, GameRecord } from '../types';
import {
  getRepertoireOpenings,
  getWeakestOpenings,
  getWoodpeckerDue,
  getFavoriteOpenings,
} from './openingService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChallengeMode =
  | 'due_review'
  | 'random'
  | 'favorites'
  | 'weakest'
  | 'previously_drilled'
  | 'traps'
  | 'warnings';

export interface GuessPosition {
  fen: string;
  actualMove: string;
  actualEval: number | null;
  gameId: string;
  moveNumber: number;
  color: 'white' | 'black';
  white: string;
  black: string;
}

export interface SpeedrunResult {
  openingId: string;
  openingName: string;
  timeSeconds: number;
  mistakes: number;
}

// ─── Opening Challenge Modes ─────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getOpeningsByMode(
  mode: ChallengeMode,
  limit: number = 15,
): Promise<OpeningRecord[]> {
  switch (mode) {
    case 'due_review':
      return (await getWoodpeckerDue(7)).slice(0, limit);

    case 'random':
      return shuffle(await getRepertoireOpenings()).slice(0, limit);

    case 'favorites':
      return (await getFavoriteOpenings()).slice(0, limit);

    case 'weakest':
      return getWeakestOpenings(limit);

    case 'previously_drilled': {
      const all = await getRepertoireOpenings();
      return all.filter((o) => o.lastStudied !== null).slice(0, limit);
    }

    case 'traps': {
      const all = await getRepertoireOpenings();
      return all
        .filter((o) => o.traps && o.traps.length > 0)
        .slice(0, limit);
    }

    case 'warnings': {
      const all = await getRepertoireOpenings();
      return all
        .filter((o) => o.warnings && o.warnings.length > 0)
        .slice(0, limit);
    }

    default:
      return [];
  }
}

export async function getDueCount(): Promise<number> {
  return (await getWoodpeckerDue(7)).length;
}

// ─── Guess the Move ──────────────────────────────────────────────────────────

/**
 * Extracts playable positions from analyzed coach games.
 * Each position has a known actual move + evaluation for scoring.
 */
export async function getGuessPositions(
  limit: number = 20,
): Promise<GuessPosition[]> {
  const games = await db.games
    .filter((g) => g.source === 'coach' && g.annotations !== null && g.annotations.length > 4)
    .toArray();

  if (games.length === 0) {
    // Fallback: generate positions from repertoire openings
    return getRepertoirePositions(limit);
  }

  const positions: GuessPosition[] = [];

  for (const game of shuffle(games)) {
    if (positions.length >= limit) break;
    if (!game.annotations) continue;

    const validMoves = game.annotations.filter(
      (a) => a.evaluation !== null && a.san && a.moveNumber > 3,
    );

    for (const move of shuffle(validMoves)) {
      if (positions.length >= limit) break;
      const fen = reconstructFenAtMove(game, move.moveNumber, move.color);
      if (!fen) continue;

      positions.push({
        fen,
        actualMove: move.san,
        actualEval: move.evaluation,
        gameId: game.id,
        moveNumber: move.moveNumber,
        color: move.color,
        white: game.white,
        black: game.black,
      });
    }
  }

  return positions;
}

/**
 * Fallback: create guess positions from repertoire opening variations.
 */
async function getRepertoirePositions(limit: number): Promise<GuessPosition[]> {
  const openings = await getRepertoireOpenings();
  const positions: GuessPosition[] = [];

  for (const opening of shuffle(openings)) {
    if (positions.length >= limit) break;
    const tokens = opening.pgn.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 6) continue;

    const chess = new Chess();
    // Pick a random position midway through the line
    const targetIdx = Math.min(
      Math.floor(Math.random() * (tokens.length - 2)) + 2,
      tokens.length - 1,
    );

    for (let i = 0; i < targetIdx; i++) {
      try {
        chess.move(tokens[i]);
      } catch {
        break;
      }
    }

    const nextMove = tokens[targetIdx];
    try {
      // Validate the move is legal
      const testChess = new Chess(chess.fen());
      testChess.move(nextMove);
    } catch {
      continue;
    }

    const turn = chess.turn();
    positions.push({
      fen: chess.fen(),
      actualMove: nextMove,
      actualEval: null,
      gameId: opening.id,
      moveNumber: Math.floor(targetIdx / 2) + 1,
      color: turn === 'w' ? 'white' : 'black',
      white: 'Repertoire',
      black: opening.name,
    });
  }

  return positions;
}

/**
 * Reconstructs FEN at a given move number from a game's PGN.
 */
function reconstructFenAtMove(
  game: GameRecord,
  moveNumber: number,
  color: 'white' | 'black',
): string | null {
  try {
    const chess = new Chess();

    // Parse PGN tokens (strip move numbers and result)
    const cleanPgn = game.pgn
      .replace(/\d+\.\s*/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
      .trim();
    const tokens = cleanPgn.split(/\s+/).filter(Boolean);

    // Target index: (moveNumber - 1) * 2 for white, + 1 for black
    const targetIdx = (moveNumber - 1) * 2 + (color === 'black' ? 1 : 0);

    // Play up to (not including) the target move
    for (let i = 0; i < targetIdx && i < tokens.length; i++) {
      try {
        chess.move(tokens[i]);
      } catch {
        return null;
      }
    }

    return chess.fen();
  } catch {
    return null;
  }
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export type GuessGrade = 'brilliant' | 'great' | 'good' | 'miss';

export function gradeGuess(evalDelta: number): GuessGrade {
  const absDelta = Math.abs(evalDelta);
  if (absDelta < 10) return 'brilliant';
  if (absDelta < 30) return 'great';
  if (absDelta < 60) return 'good';
  return 'miss';
}

export function getStars(mistakes: number, hintsUsed: number): number {
  const total = mistakes + hintsUsed;
  if (total === 0) return 3;
  if (total <= 2) return 2;
  return 1;
}

// ─── Encouraging Messages ────────────────────────────────────────────────────

const WRONG_MOVE_MESSAGES = [
  'Almost! Think about controlling the center here.',
  'Good instinct, but there\'s a move that fits the plan better.',
  'Not quite — try thinking about piece development.',
  'Close! What piece needs to come out next?',
  'The idea is right, but the move order matters here.',
  'Think about what square your piece wants to reach.',
  'You\'re on the right track — try a different piece.',
  'Remember the opening\'s key ideas here.',
];

const CORRECT_MOVE_MESSAGES = [
  'That\'s the one!',
  'Nice move!',
  'Exactly right!',
  'You\'ve got it!',
  'Well played!',
  'Spot on!',
  'Perfect!',
  'Great!',
];

const WELCOME_TEMPLATES = [
  'Let\'s play through the {name}! Play the correct moves for {color}.',
  'Time to practice the {name}! You\'re playing {color}.',
  'Let\'s see how well you know the {name}. You\'ve got {color}.',
];

export function getWrongMoveMessage(opening: OpeningRecord, moveIndex: number): string {
  const base = WRONG_MOVE_MESSAGES[moveIndex % WRONG_MOVE_MESSAGES.length];
  if (opening.keyIdeas && opening.keyIdeas.length > 0) {
    const idea = opening.keyIdeas[Math.floor(Math.random() * opening.keyIdeas.length)];
    // Every third wrong move, reference a key idea
    if (moveIndex % 3 === 2) {
      return `Remember: ${idea}. Try again!`;
    }
  }
  return base;
}

export function getCorrectMoveMessage(): string {
  return CORRECT_MOVE_MESSAGES[Math.floor(Math.random() * CORRECT_MOVE_MESSAGES.length)];
}

export function getWelcomeMessage(opening: OpeningRecord): string {
  const template = WELCOME_TEMPLATES[Math.floor(Math.random() * WELCOME_TEMPLATES.length)];
  return template
    .replace('{name}', opening.name)
    .replace('{color}', opening.color === 'white' ? 'White' : 'Black');
}
