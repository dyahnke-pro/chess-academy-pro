// "Where you left the book" — the Game Review headline (David 2026-05-21).
// Replays a game's moves against the masters explorer and surfaces the
// FIRST move where the player left theory, plus what masters play there
// (plain English, never raw %). Amateur games are quietly lost by leaving
// theory and nobody shows you where. Masters coverage thins around move
// ~12-15; past that the explorer drops out (Stockfish + coach carry the
// rest — that's the review's other half, not this scan).

import { Chess } from 'chess.js';
import { lookupMasterPlay } from './masterPlayLookup';
import { translateMasterMove, type TranslatedMove } from './explorerTranslate';

export interface TheoryDeviation {
  /** Zero-based ply where the player left book. */
  ply: number;
  /** Full move number (1-based) for display. */
  moveNumber: number;
  /** The move the player actually played (SAN). */
  playedSan: string;
  /** Position the player faced (FEN before the move). */
  fen: string;
  /** What masters play here, translated to plain English. */
  mastersTop: TranslatedMove;
}

/** Tokenize a space-separated SAN pgn (the app's stored form). */
function tokenizePgn(pgn: string): string[] {
  return pgn
    // Strip move numbers: "1." AND black-continuation "1..." / "12...".
    // Order matters — kill the "..." form first so the lone "." regex
    // doesn't leave dangling dots ("1...e5" → "..e5" → illegal token).
    .replace(/\d+\.\.\./g, ' ')
    .replace(/\d+\./g, ' ')
    .replace(/[10]-[10]|1\/2-1\/2|\*/g, ' ') // strip result tokens
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Position signature (placement + side + castling + ep) — drops the
 *  move counters so two routes to the same position compare equal. */
function posKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

/** Is the played SAN one of the masters' moves? Compared by RESULTING
 *  POSITION, not by raw SAN string — disambiguation ("Ngf3" vs "Nf3"),
 *  capture spelling ("exd5" vs "ed5"), and check/mate glyphs all spell
 *  the same move differently, and a raw `===` would miss them and
 *  falsely flag an in-book move as a deviation (David 2026-06-27:
 *  "Left book after move 1 … I know it's not"). */
function playedMoveIsInBook(
  fenBefore: string,
  playedSan: string,
  masterSans: string[],
): boolean {
  // Fast path: exact SAN already matches.
  if (masterSans.includes(playedSan)) return true;

  // Resulting-position match — the bulletproof path.
  let playedKey: string | null = null;
  try {
    const c = new Chess(fenBefore);
    c.move(playedSan);
    playedKey = posKey(c.fen());
  } catch {
    return false; // can't even apply the played move; don't claim in-book
  }
  for (const ms of masterSans) {
    try {
      const c = new Chess(fenBefore);
      c.move(ms);
      if (posKey(c.fen()) === playedKey) return true;
    } catch {
      // Master SAN didn't apply to this position — skip it.
    }
  }
  return false;
}

/** Scan for the first point the player left masters theory. Returns null
 *  when the player stayed in book for as long as the masters DB covers
 *  the line (no deviation while data existed) — that's a GOOD result. */
export async function scanTheoryDeviation(
  pgn: string,
  playerColor: 'white' | 'black',
): Promise<TheoryDeviation | null> {
  const sans = tokenizePgn(pgn);
  const chess = new Chess();
  const playerParity = playerColor === 'white' ? 0 : 1;

  for (let ply = 0; ply < sans.length; ply++) {
    const san = sans[ply];
    const fenBefore = chess.fen();
    const isPlayerMove = ply % 2 === playerParity;

    if (isPlayerMove) {
      let masters;
      try {
        masters = await lookupMasterPlay(fenBefore, {
          triggeredBy: 'manual',
          surface: 'game-review-theory-scan',
          localOnly: true,
        });
      } catch {
        masters = null;
      }
      // No master data here → book coverage has run out. Stop; the player
      // was still "in book" as far as we can verify.
      if (!masters || masters.source === 'none' || masters.moves.length === 0) {
        return null;
      }
      const inBook = playedMoveIsInBook(fenBefore, san, masters.moves.map((m) => m.san));
      if (!inBook) {
        return {
          ply,
          moveNumber: Math.floor(ply / 2) + 1,
          playedSan: san,
          fen: fenBefore,
          mastersTop: translateMasterMove(masters.moves[0], masters.totalGames, playerColor),
        };
      }
    }

    try {
      chess.move(san);
    } catch {
      // Illegal/garbled token — stop the scan rather than guess.
      return null;
    }
  }
  return null;
}
