// Conversion-failure detector (David 2026-05-27, "no data capture is dead").
//
// Per-move evals are already persisted on analyzed games
// (MoveAnnotation.evaluation, centipawns, White POV) but nothing ever scanned
// the trajectory for the classic improvement-killer: reaching a WINNING
// position and letting it slip to a draw or loss. This is a pure post-process
// over already-stored data — no schema change. The result feeds the unified
// weakness profile (weaknessSpine) so it DRIVES the plan, not a display tab.

import { Chess } from 'chess.js';
import type { GameRecord } from '../types';

/** Player-POV centipawns at which the player is clearly winning. */
export const WINNING_CP = 300;
/** Player-POV centipawns at which that winning edge has essentially gone. */
export const SLIP_CP = 75;

export interface ConversionFailure {
  gameId: string;
  /** Position at the winning peak — replay material ("you were winning here"). */
  fen: string;
  /** Player-POV centipawns at the peak. */
  peakCp: number;
  /** Player-POV centipawns at the final analyzed move (null if none). */
  finalCp: number | null;
  result: 'draw' | 'loss';
  playerColor: 'white' | 'black';
  openingName: string | null;
  date: string | null;
  /** Full-move number where the winning peak occurred. */
  peakMoveNumber: number;
}

export interface ConversionUsernames {
  lichessUsername?: string;
  chessComUsername?: string;
  /** Profile display username — last-resort match for generic imports. */
  username?: string;
}

/** Resolve which side the student played. Returns null when we can't be sure
 *  — we skip rather than guess a color (CLAUDE.md: "when unsure, skip"). */
export function resolvePlayerColor(game: GameRecord, names: ConversionUsernames): 'white' | 'black' | null {
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return null;
  }
  const candidates = [names.lichessUsername, names.chessComUsername, names.username]
    .filter((n): n is string => !!n)
    .map((n) => n.toLowerCase());
  const white = game.white.toLowerCase();
  const black = game.black.toLowerCase();
  if (candidates.includes(white)) return 'white';
  if (candidates.includes(black)) return 'black';
  return null;
}

/** Player-POV result. White-POV evals are negated for a Black player. */
function playerResult(game: GameRecord, color: 'white' | 'black'): 'win' | 'loss' | 'draw' | 'unknown' {
  if (game.result === '1/2-1/2') return 'draw';
  if (game.result === '1-0') return color === 'white' ? 'win' : 'loss';
  if (game.result === '0-1') return color === 'black' ? 'win' : 'loss';
  return 'unknown';
}

/**
 * Scan one analyzed game for a blown winning advantage. Returns the failure
 * (peak position + magnitude) or null. A game qualifies when:
 *   • it's fully analyzed with per-move evals,
 *   • the player's POV eval peaked at >= WINNING_CP,
 *   • a LATER move fell to <= SLIP_CP, and
 *   • the game did NOT end in a win for the player.
 */
export function detectConversionFailure(game: GameRecord, names: ConversionUsernames): ConversionFailure | null {
  if (!game.fullyAnalyzed || !game.annotations || game.annotations.length < 6) return null;

  const color = resolvePlayerColor(game, names);
  if (!color) return null;

  const result = playerResult(game, color);
  if (result !== 'draw' && result !== 'loss') return null;

  const sign = color === 'white' ? 1 : -1;
  let peakCp = -Infinity;
  let peakIdx = -1;
  let lastCp: number | null = null;

  for (let i = 0; i < game.annotations.length; i++) {
    const ev = game.annotations[i].evaluation;
    if (ev === null || ev === undefined) continue;
    const playerCp = sign * ev;
    lastCp = playerCp;
    if (playerCp > peakCp) {
      peakCp = playerCp;
      peakIdx = i;
    }
  }

  if (peakIdx < 0 || peakCp < WINNING_CP) return null;

  // Require an actual slip AFTER the peak (defends against a game that was
  // winning only on the very last analyzed move).
  const slipped = game.annotations
    .slice(peakIdx + 1)
    .some((a) => a.evaluation !== null && a.evaluation !== undefined && sign * a.evaluation <= SLIP_CP);
  if (!slipped) return null;

  let fen = '';
  try {
    const chess = new Chess();
    for (let i = 0; i <= peakIdx; i++) {
      const san = game.annotations[i].san;
      if (!san) break;
      chess.move(san);
    }
    fen = chess.fen();
  } catch {
    return null; // corrupt move list — skip rather than ship a bad FEN
  }
  if (!fen) return null;

  return {
    gameId: game.id,
    fen,
    peakCp: Math.round(peakCp),
    finalCp: lastCp === null ? null : Math.round(lastCp),
    result,
    playerColor: color,
    openingName: game.openingId ?? null,
    date: game.date ?? null,
    peakMoveNumber: game.annotations[peakIdx].moveNumber,
  };
}

/** Detect conversion failures across a set of games, newest first. */
export function detectConversionFailures(games: GameRecord[], names: ConversionUsernames): ConversionFailure[] {
  const out: ConversionFailure[] = [];
  for (const g of games) {
    const f = detectConversionFailure(g, names);
    if (f) out.push(f);
  }
  out.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return out;
}
