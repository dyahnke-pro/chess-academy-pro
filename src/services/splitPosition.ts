// SPLIT THE POSITION (WO-TEACH-GAPS P3 method beat). When the kings have
// castled on OPPOSITE wings with queens on, the board is two separate games: a
// pawn storm on each side, and the one that arrives first usually decides it.
// The habit is to split the board and judge each half — and to value SPEED
// over a pawn. Earned only by the board: kings on opposite wings (a/b/c vs
// g/h files, each on its home rank), queens still on. Once per game.
// Reads the ONE king-wing fact (`boardStructure.kings`) — never a second
// definition of "opposite wings"; adds only the castled (home-rank) gate.
import { Chess, type Color, type Square } from 'chess.js';
import { andList } from '../utils/andList';
import { describeStructure } from './boardStructure';
import { castleRoute } from './kingSafety';

interface SplitPosition { text: string; squares: string[] }

export function splitPosition(fen: string, student: Color): SplitPosition | null {
  const s = describeStructure(fen);
  if (!s || !s.material.queensOn || !s.kings.oppositeWings) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const home = (col: Color): boolean => s.kings.kingSquare[col][1] === (col === 'w' ? '1' : '8');
  if (!home(student) || !home(foe)) return null;
  const side = (col: Color): string => (s.kings.kingWing[col] === 'kingside' ? 'king' : 'queen');
  return {
    squares: [s.kings.kingSquare[student], s.kings.kingSquare[foe]],
    text: `The kings are on opposite wings, so split the board: your pawns go after their king on the ${side(foe)}side, theirs come at yours on the ${side(student)}side. It is a race — a tempo matters more than a pawn here.`,
  };
}

/**
 * THEIR KING COMMITTED, YOURS DID NOT (Alekhine walk 2026-10-19 — his beat at
 * move 11: "with Black castled queenside, giving up d5 is worth it: c5 clamps
 * down and starts your attack"). The moment their king castles while yours is
 * still in the centre, the plan changes: your pawns on that wing stop being
 * structure and become attackers. A STATE, not a move: true for as long as it
 * holds, so a turn the door spends elsewhere (a verdict) does not lose it —
 * the claim key says it once a game (prod walk 2026-10-19: held on the castling
 * turn behind Be2's verdict, never heard). Earned by the board only: their king
 * castled, your king central, queens on, and at least one of your pawns on that
 * wing with an enemy pawn ahead of it on its own or a neighbouring file — the
 * contact that a push turns into an open file. Names pawns, never a move.
 */
export function kingCommitted(fen: string, student: Color): SplitPosition | null {
  const s = describeStructure(fen);
  if (!s || !s.material.queensOn) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const wing = s.kings.kingWing[foe];
  if (wing === 'center' || s.kings.kingWing[student] !== 'center') return null;
  // WHERE YOUR KING GOES is castleRoute's answer, the one the castle advice
  // reads (OS-11 item 6 b): castling onto their king's wing puts it behind the
  // very pawns this would push, so the storm is not the plan then.
  const route = castleRoute(fen, student);
  if (route && (route.side === 'short' ? 'kingside' : 'queenside') === wing) return null;
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const onWing = (file: string): boolean => (wing === 'queenside' ? file <= 'c' : file >= 'f');
  const ahead = student === 'w' ? 1 : -1;
  const pawns: string[] = [];
  for (const row of board.board()) {
    for (const c of row) {
      if (!c || c.type !== 'p' || c.color !== student || !onWing(c.square[0])) continue;
      const f = c.square.charCodeAt(0);
      const r = Number(c.square[1]);
      const contact = [f - 1, f, f + 1].some((ff) => {
        if (ff < 97 || ff > 104) return false;
        for (let rr = r + ahead; rr >= 1 && rr <= 8; rr += ahead) {
          const p = board.get(`${String.fromCharCode(ff)}${rr}` as Square);
          if (p?.type === 'p' && p.color === foe) return true;
        }
        return false;
      });
      if (contact) pawns.push(c.square);
    }
  }
  if (pawns.length === 0) return null;
  pawns.sort();
  const side = wing === 'queenside' ? 'queenside' : 'kingside';
  const list = pawns.length === 1 ? `your pawn on ${pawns[0]} now faces it` : `your pawns on ${andList(pawns)} now face it`;
  return {
    squares: [s.kings.kingSquare[foe], ...pawns],
    text: `Their king went ${side}, and yours is still in the centre — so the plan changes: ${list}. Pushed, ${pawns.length === 1 ? 'it pries' : 'they pry'} open files toward their king.`,
  };
}
