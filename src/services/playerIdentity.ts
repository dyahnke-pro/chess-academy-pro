/**
 * playerIdentity — ONE resolver for "which side of this game is the student".
 *
 * Three private copies of this logic used to live in CoachReviewSessionPage,
 * gameContextService and analyticsService, each with a different fallback —
 * the review page defaulted to White, the analytics one returned null, the
 * context one matched a single handle. The game card then had NO resolver at
 * all and printed the raw `1-0` / `0-1`, whose meaning flips with the colour
 * the student played (David 2026-09-05: "replace with green win or red loss").
 *
 * Rules, in order:
 *  1. Coach games: the side named as the engine/coach is the opponent.
 *  2. Exact handle match — chess.com handle, lichess handle, then the app
 *     profile name (imports carry the PLATFORM handle, not the app name).
 *  3. Loose substring match for decorated names ("user (1200)").
 *  4. Otherwise null: the identity genuinely cannot be resolved. Callers that
 *     must pick a colour (the board orientation) default to White themselves;
 *     callers that would LIE with a guess (a WIN/LOSS badge) show `?`.
 */
import type { GameRecord } from '../types';

export interface PlayerIdentity {
  profileName?: string | null;
  chessComUsername?: string | null;
  lichessUsername?: string | null;
}

export type PlayerColor = 'white' | 'black';
export type GameOutcome = 'win' | 'loss' | 'draw';

const ENGINE_NAME_RE = /\b(coach|bot|stockfish|engine|computer)\b/i;

export function isEngineName(name: string): boolean {
  return ENGINE_NAME_RE.test(name);
}

export function resolvePlayerColor(game: GameRecord, identity: PlayerIdentity): PlayerColor | null {
  const white = game.white.trim();
  const black = game.black.trim();
  if (game.source === 'coach') {
    if (isEngineName(black)) return 'white';
    if (isEngineName(white)) return 'black';
  }
  const candidates: string[] = [];
  for (const c of [identity.chessComUsername, identity.lichessUsername, identity.profileName]) {
    const v = (c ?? '').trim().toLowerCase();
    if (v.length > 0) candidates.push(v);
  }
  const w = white.toLowerCase();
  const b = black.toLowerCase();
  for (const c of candidates) {
    if (w === c) return 'white';
    if (b === c) return 'black';
  }
  for (const c of candidates) {
    if (w.includes(c)) return 'white';
    if (b.includes(c)) return 'black';
  }
  // One side is an engine on a non-coach record (a bot game imported from
  // a platform): the human side is the student.
  if (isEngineName(black) && !isEngineName(white)) return 'white';
  if (isEngineName(white) && !isEngineName(black)) return 'black';
  return null;
}

/** The student's outcome, or null when the game is unfinished. */
export function resolveGameOutcome(game: GameRecord, color: PlayerColor): GameOutcome | null {
  if (game.result === '1/2-1/2') return 'draw';
  if (game.result === '1-0') return color === 'white' ? 'win' : 'loss';
  if (game.result === '0-1') return color === 'black' ? 'win' : 'loss';
  return null;
}

export function opponentName(game: GameRecord, color: PlayerColor): string {
  const name = color === 'white' ? game.black : game.white;
  return name && name.trim().length > 0 ? name : 'Unknown';
}
