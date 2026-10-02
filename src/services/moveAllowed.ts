import { Chess } from 'chess.js';
import { describeMoveGeometry } from './groundedAnswer';
import { legalSeeGain } from './positionReadingService';

/**
 * WHAT YOUR MOVE ALLOWED — the one sentence a mistake card should lead with.
 *
 * Hand walk 2026-10-01 (erik, chess.com): about half the My Mistakes cards
 * opened on a fact unrelated to the mistake. Rc3 hangs the rook to bxc3, and
 * the card opened "Bishop on h8 pins pawn on b2 against rook on a1". Kh8 loses
 * to Ng6+, and the card opened "Queen on e3 pins knight on f4" — the very knight
 * that escapes with the fork. The intro read the board BEFORE the move and,
 * by design, skipped anything touching the solution, so what survived was
 * whatever was left over.
 *
 * The lesson of a mistake is what the move let the opponent do. That is not a
 * spoiler — it explains the wrong move, never the right one — and it is
 * already computed: the engine's reply after the played move (`pvAfterPlayed`)
 * on new cards, or the move the opponent actually answered with in the game.
 * `describeMoveGeometry`, read from the OPPONENT's seat on that reply, says
 * what it does with the same landing-safety checks the coach uses everywhere.
 *
 * Speaks only a concrete punishment — mate, a fork, a pin, material won. A
 * bare "attacks" or "gives check" is not proof the move was punished, so it
 * returns null and the card stays quiet on that point (empty > vague).
 */
export function describeWhatMoveAllowed(
  fen: string,
  playedSan: string,
  replySan: string | null,
): string | null {
  const p = punishmentOf(fen, playedSan, replySan);
  return p ? `${playedSan} lets them play ${p.replySan}, ${p.gerund}.` : null;
}

/** The concrete punishment a reply inflicts after `playedSan` — the shared
 *  core of the mistake card ("R2b3 lets them play Qxd6, winning your pawn")
 *  and the wrong-try refutation in a puzzle ("Qe3? Then Bxg5, winning your
 *  pawn on g5"). One computer, two phrasings. */
export function punishmentOf(
  fen: string,
  playedSan: string,
  replySan: string | null,
): { replySan: string; gerund: string } | null {
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
  const gerund = geometry === 'delivers checkmate' || geometry?.startsWith('forks ')
    ? punishmentGerund(geometry)
    : won ?? (geometry ? punishmentGerund(geometry) : null);
  if (!gerund) return null;
  return { replySan, gerund };
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** "winning your pawn on d6" when the reply captures and the exchange on that
 *  square nets material (pin-aware SEE from the opponent's seat); else null. */
function materialWon(afterPlayed: string, replySan: string): string | null {
  try {
    const c = new Chess(afterPlayed);
    const mv = c.move(replySan);
    if (!mv?.captured) return null;
    if (legalSeeGain(afterPlayed, mv.to) <= 0) return null;
    return `winning your ${PIECE_NAME[mv.captured]} on ${mv.to}`;
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
