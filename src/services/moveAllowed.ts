import { Chess } from 'chess.js';
import { capturedSquare } from '../utils/capturedSquare';
import { describeMoveGeometry } from './groundedAnswer';
import { legalSeeGain } from './positionReadingService';
import { CAPTURE_VALUE } from './pieceValues';
import { afterCaptureSan } from '../utils/captureWords';
import { withArticle } from '../utils/andList';


/** The concrete punishment ONE reply inflicts after `playedSan`, read by the
 *  exchange count on its square — the single-reply half of the one error
 *  computer (`inaccuracyCall.errorWhy`), used when only their answer is known
 *  (a game's reply on a My Mistakes card, a one-move engine read). Called
 *  only from there (2026-10-10 unification). */
export function replyPunishment(
  fen: string,
  playedSan: string,
  replySan: string | null,
): { replySan: string; gerund: string; won: { piece: string; square: string } | null } | null {
  if (!replySan) return null;
  let afterPlayed: string;
  let opponent: 'white' | 'black';
  try {
    const c = new Chess(fen);
    if (!c.move(playedSan)) return null;
    afterPlayed = c.fen();
    opponent = c.turn() === 'w' ? 'white' : 'black';
  } catch {
    return null;
  }
  const geometry = describeMoveGeometry(afterPlayed, replySan, opponent);
  // Order is the lesson's order: mate, then a fork, then the material the
  // reply actually wins, then a pin. describeMoveGeometry ranks a pin the
  // capture CREATES above the material it TAKES ("Qxd6 pins your e-pawn to
  // your bishop") — true, and not the point of R2b3.
  const won = materialWon(afterPlayed, replySan);
  const byGeometry = geometry === 'delivers checkmate' || geometry?.startsWith('forks ');
  const gerund = byGeometry && geometry
    ? punishmentGerund(geometry)
    : won?.gerund ?? (geometry ? punishmentGerund(geometry) : null);
  if (!gerund) return null;
  // What the reply won, as DATA — a reader that needs the piece and its
  // square reads this, never the words back (they no longer carry them).
  return { replySan, gerund, won: !byGeometry && won ? { piece: won.piece, square: won.square } : null };
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** "winning a pawn" when the reply captures and the exchange on that square
 *  nets material (pin-aware SEE from the opponent's seat); else null. Said
 *  after the reply's SAN ("lets them play Qxd6, …"), which already says the
 *  capture, so it is the count — "winning your pawn on d6" was "queen takes
 *  d6, winning your pawn on d6" (David 2026-10-30; `captureWords`). */
function materialWon(afterPlayed: string, replySan: string): { gerund: string; piece: string; square: string } | null {
  try {
    const c = new Chess(afterPlayed);
    const mv = c.move(replySan);
    if (!mv?.captured) return null;
    const gain = legalSeeGain(afterPlayed, mv.to);
    if (gain <= 0) return null;
    // WHAT THEY NET, NOT WHAT THEY TOUCH (Learn walk 2026-10-10: Bxa5 Nxa5 is
    // a queen for a bishop, said as "winning your queen"). When the exchange
    // gives the capturer back, the trade is named.
    const nets = afterCaptureSan({ kind: 'nets', captured: mv.captured, free: false }, 'participle');
    const gerund = gain >= CAPTURE_VALUE[mv.captured]
      ? nets
      : `${nets} for ${withArticle(PIECE_NAME[mv.piece])}`;
    return { gerund, piece: PIECE_NAME[mv.captured], square: capturedSquare(mv) };
  } catch {
    return null;
  }
}

/** The opponent's geometry, turned into what it does TO the student. Every
 *  piece it names is the student's (the opponent's move targets them), so
 *  "the" becomes "your" — one perspective, never an owner-less piece. */
function punishmentGerund(geometry: string): string | null {
  const g = geometry.trim();
  if (g === 'delivers checkmate') return 'and that is checkmate';
  const yours = (s: string): string => s.replace(/\bthe (king|queen|rook|bishop|knight|pawn)\b/g, 'your $1');
  if (g.startsWith('forks ')) return `forking ${yours(g.slice('forks '.length))}`;
  if (g.startsWith('pins ')) return `pinning ${yours(g.slice('pins '.length))}`;
  if (g.startsWith('wins ')) return `winning ${yours(g.slice('wins '.length))}`;
  return null;
}

/** The move the opponent answered with in the real game, read from its PGN at
 *  the puzzle position. Null when the position cannot be found (or the game
 *  ended on the mistake). Used for cards built before `pvAfterPlayed` reached
 *  the puzzle builder. */
export function gameReplyAfter(pgn: string, fenBefore: string, playedSan: string): string | null {
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    const sans = game.history();
    const replay = new Chess();
    const target = fenBefore.split(' ').slice(0, 2).join(' ');
    for (let i = 0; i < sans.length - 1; i += 1) {
      if (replay.fen().split(' ').slice(0, 2).join(' ') === target) {
        return sans[i] === playedSan ? sans[i + 1] : null;
      }
      replay.move(sans[i]);
    }
  } catch {
    /* unreadable PGN — no reply */
  }
  return null;
}
