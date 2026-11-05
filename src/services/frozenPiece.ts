// frozenPiece — A PIECE THAT CANNOT MOVE BECAUSE MATE STANDS BEHIND IT (David
// 2026-11-04, the Danya side-by-side: "the main reason you're worse is this
// battery — a permanent strain that doesn't let your knight move; and if that
// knight is eliminated, you face very serious threats along the diagonal").
//
// A pin is a piece that cannot leave its line without exposing what stands
// behind it (`pinGeometry`). Behind this one stands no piece worth more — it is
// a square their line piece takes with mate. The read: a queen, rook or bishop
// of theirs looks through one piece of yours at a piece of yours directly
// behind it, and most moves the front piece has let the capture of the one
// behind it mate on the board (chess.js plays it); the moves that do not are
// named with the claim. The push that would hit the frozen piece —
// their pawn one step from attacking it — is read with it, since a piece that
// cannot move is the easiest one to win. Pure: chess.js only.
import { Chess, type Color, type Square } from 'chess.js';
import { sideToMoveAs } from './threatOut';
import { unmarked } from '../utils/sanMark';
import { orList } from '../utils/andList';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const DIRS: Record<string, readonly (readonly [number, number])[]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
};

export interface FrozenPiece {
  /** Their line piece, and their second piece behind it on the same line (a battery), if any. */
  line: Square;
  battery: Square | null;
  /** Your piece that cannot move, and yours behind it. */
  frozen: Square;
  behind: Square;
  /** The capture that mates once the frozen piece moves (SAN). */
  mateSan: string;
  /** The squares it may still go to without allowing the mate — said with the
   *  claim, so "if it moves" is never stronger than the board. */
  escapes: string[];
  /** Their pawn push that would hit the frozen piece (SAN), when one is on. */
  lever: string | null;
  /** How the line is named ("the long diagonal", "the e-file"…). */
  lineName: string;
}

const sq = (f: number, r: number): string | null => (f >= 0 && f < 8 && r >= 1 && r <= 8 ? `${String.fromCharCode(97 + f)}${r}` : null);

function lineNameOf(a: string, df: number, dr: number): string {
  if (dr === 0) return `the ${a[1]}${['th', 'st', 'nd', 'rd'][Number(a[1])] ?? 'th'} rank`;
  if (df === 0) return `the ${a[0]}-file`;
  const f = a.charCodeAt(0) - 97;
  const r = Number(a[1]) - 1;
  if (df === dr && f === r) return 'the long diagonal';
  if (df === -dr && f + r === 7) return 'the long diagonal';
  return 'the diagonal';
}

/**
 * Every piece of `defender` frozen in front of a mate by a line piece of
 * `attacker`. Empty when none.
 */
export function findFrozenPieces(fen: string, attacker: Color): FrozenPiece[] {
  let b: Chess;
  try { b = new Chess(fen); } catch { return []; }
  const defender: Color = attacker === 'w' ? 'b' : 'w';
  const out: FrozenPiece[] = [];
  for (const row of b.board()) for (const c of row) {
    if (!c || c.color !== attacker || !DIRS[c.type]) continue;
    const f0 = c.square.charCodeAt(0) - 97;
    const r0 = Number(c.square[1]);
    for (const [df, dr] of DIRS[c.type]) {
      let f = f0 + df; let r = r0 + dr;
      let frozen: string | null = null;
      let behind: string | null = null;
      for (let s = sq(f, r); s; f += df, r += dr, s = sq(f, r)) {
        const p = b.get(s as Square);
        if (!p) continue;
        if (!frozen) {
          if (p.color !== defender || p.type === 'k') break;
          frozen = s;
          continue;
        }
        if (p.color === defender && p.type !== 'k') behind = s;
        break;
      }
      if (!frozen || !behind) continue;
      // HELD IN PLACE: read with the defender to move (the one null-move rule).
      // Not held at all when they can simply take the piece holding it (3...g6
      // against Qh5: the pawn takes the queen). Otherwise each move the front
      // piece has either lets the capture behind it mate, or escapes — and an
      // escape is named, never hidden (14.Bb2 in his Scotch Gambit: the knight
      // on f6 may still go to h5, where it guards g7). Held when its mating
      // moves outnumber its escapes.
      const asDefender = sideToMoveAs(fen, defender);
      if (!asDefender) continue;
      const defenderBoard = new Chess(asDefender);
      if (defenderBoard.moves({ verbose: true }).some((mv) => mv.to === c.square)) continue;
      const own = defenderBoard.moves({ square: frozen as Square, verbose: true });
      let mateSan: string | null = null;
      const escapes: string[] = [];
      let mating = 0;
      for (const mv of own) {
        const after = new Chess(asDefender);
        after.move(mv.san);
        let mates: string | null = null;
        try {
          const m = after.move({ from: c.square, to: behind as Square });
          if (after.isCheckmate()) mates = m.san;
        } catch { /* the capture is gone: no mate */ }
        if (mates) { mating += 1; mateSan ??= mates; } else escapes.push(mv.to);
      }
      if (!mateSan || mating <= escapes.length) continue;
      // The battery: their own piece right behind the line piece, on the line.
      let battery: Square | null = null;
      for (let bf = f0 - df, br = r0 - dr, s = sq(bf, br); s; bf -= df, br -= dr, s = sq(bf, br)) {
        const p = b.get(s as Square);
        if (!p) continue;
        if (p.color === attacker && (p.type === 'q' || (DIRS[p.type] ?? []).some(([x, y]) => x === df && y === dr))) battery = s as Square;
        break;
      }
      out.push({ line: c.square, battery, frozen: frozen as Square, behind: behind as Square, mateSan, escapes: [...new Set(escapes)].sort(), lever: leverOn(b, attacker, frozen), lineName: lineNameOf(c.square, df, dr) });
    }
  }
  return out;
}

/** Their pawn one quiet step from attacking `target`: the push (SAN). */
function leverOn(b: Chess, attacker: Color, target: string): string | null {
  const dir = attacker === 'w' ? 1 : -1;
  const tf = target.charCodeAt(0) - 97;
  const tr = Number(target[1]);
  for (const df of [-1, 1]) {
    // The pawn would stand on (tf+df, tr-dir) to attack the target, arriving from one rank behind.
    const land = sq(tf + df, tr - dir);
    const from = sq(tf + df, tr - 2 * dir);
    if (!land || !from) continue;
    const p = b.get(from as Square);
    if (!p || p.type !== 'p' || p.color !== attacker || b.get(land as Square)) continue;
    return land;
  }
  return null;
}

/** The frozen piece said from the student's seat. `holder` is whose line it is. */
export function frozenPieceWords(fp: FrozenPiece, b: Chess, holder: 'yours' | 'theirs'): string {
  const their = holder === 'theirs' ? 'their' : 'your';
  const your = holder === 'theirs' ? 'your' : 'their';
  const piece = (s: string): string => NAME[b.get(s as Square)?.type ?? 'p'] ?? 'piece';
  const who = fp.battery ? `${their} ${piece(fp.line)} and ${piece(fp.battery)}` : `${their} ${piece(fp.line)}`;
  const lever = fp.lever ? ` — and ${fp.lever} would hit it` : '';
  const where = fp.escapes.length ? `if it moves anywhere but ${orList(fp.escapes)}` : 'if it moves';
  return `${who} on ${fp.lineName} ${fp.battery ? 'hold' : 'holds'} ${your} ${piece(fp.frozen)} on ${fp.frozen} in place: ${where}, ${unmarked(fp.mateSan)} is mate${lever}`;
}
