// HOLD A RESOURCE UNTIL IT BITES (batch 1, "order and timing") — his "save the
// check on b4 until their knight is on c3; then the capture doubles their
// pawns". A pin or a check spent too early is parried for free; the same move
// after their natural developing move pins a piece and the capture wrecks
// their structure.
//
// Pure and exact: the whole "until" is played out with chess.js — their knight
// develops to the square, the bishop comes, takes on that square, and a pawn of
// theirs takes back onto a file it already stands on (doubled pawns). Every
// move of the line is legal from the board it starts on, or nothing is said.
import { Chess, type Square } from 'chess.js';
import { homeSquaresOf } from './development';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface HeldResource {
  text: string;
  /** Their knight's development and the bishop's pin, SAN, from `fen` (their
   *  turn). */
  sans: [string, string];
  /** The capture the pin then threatens and the pawn recapture that doubles
   *  their pawns, SAN, on the board after the pin with the student to move. */
  threat: [string, string];
  /** The board the line starts on. */
  fen: string;
  /** The bishop move being saved, SAN. */
  resource: string;
  /** Knight home, knight square, bishop square, recapturing pawn. */
  squares: string[];
  /** Whether the saved move gives check on the board it is saved on. */
  check: boolean;
}

function pawnsOnFile(c: Chess, file: string, color: 'w' | 'b'): number {
  let n = 0;
  for (let r = 1; r <= 8; r += 1) { const p = c.get(`${file}${r}` as Square); if (p && p.type === 'p' && p.color === color) n += 1; }
  return n;
}

/** `fen` with `color` to move, or null when that board cannot exist. */
function withTurn(fen: string, color: 'w' | 'b'): Chess | null {
  const parts = fen.split(' ');
  parts[1] = color;
  parts[3] = '-';
  try {
    const c = new Chess(parts.join(' '));
    // The side NOT to move must not be in check (its king would be capturable).
    const other: 'w' | 'b' = color === 'w' ? 'b' : 'w';
    const king = c.board().flat().find((x) => x && x.type === 'k' && x.color === other);
    if (king && c.attackers(king.square, color).length > 0) return null;
    return c;
  } catch { return null; }
}

/**
 * `fen` with THEM to move (the board right after the student's move). Find:
 * their knight on its home square develops to T; the student's bishop then
 * reaches B, pinning that knight to their king; and with the pin in place, the
 * bishop taking on T can only be met by pawn recaptures that leave them
 * doubled pawns. That threat is the bite. Every move is legal on its board.
 */
export function heldResourceLine(fen: string): Omit<HeldResource, 'text' | 'check'> | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  const them = board.turn();
  const me: 'w' | 'b' = them === 'w' ? 'b' : 'w';
  const devs = board.moves({ verbose: true }).filter((m) => m.piece === 'n' && !m.captured
    && homeSquaresOf('n', them).includes(m.from));
  for (const d of devs) {
    const b1 = new Chess(fen);
    b1.move(d.san);
    for (const bm of b1.moves({ verbose: true })) {
      if (bm.piece !== 'b' || bm.captured) continue;
      const b2 = new Chess(b1.fen());
      b2.move(bm.san);
      if (!b2.attackers(d.to, me).includes(bm.to)) continue;
      // A PIN: lift the knight and the bishop sees their king.
      const probe = new Chess(b2.fen());
      probe.remove(d.to);
      const king = probe.board().flat().find((c) => c && c.type === 'k' && c.color === them);
      if (!king || !probe.attackers(king.square, me).includes(bm.to)) continue;
      // The threat, with the student to move again (their move passed).
      const t = withTurn(b2.fen(), me);
      if (!t) continue;
      let cap;
      try { cap = t.move({ from: bm.to, to: d.to }); } catch { cap = null; }
      if (!cap) continue;
      const recaps = t.moves({ verbose: true }).filter((x) => x.to === d.to && x.captured);
      if (recaps.length === 0) continue;
      // EVERY way to take back must be a pawn landing on a file it doubles.
      const allDouble = recaps.every((x) => {
        if (x.piece !== 'p') return false;
        const b4 = new Chess(t.fen());
        b4.move(x.san);
        return pawnsOnFile(b4, d.to[0], them) >= 2;
      });
      if (!allDouble) continue;
      return { sans: [d.san, bm.san], threat: [cap.san, recaps[0].san], fen, resource: bm.san.replace(/[+#]$/, ''), squares: [d.from, d.to, bm.to, recaps[0].from] };
    }
  }
  return null;
}

/**
 * THE STUDENT KEPT THE RESOURCE (Learn / review): their move was the engine's
 * (< 30cp), the bishop move was already legal on the board they moved from,
 * and it was NOT the move they played — on the board after their move, the
 * same bishop move bites once their knight develops.
 */
export function heldResource(fenBefore: string, san: string, bestSan: string | null, cpLoss: number): HeldResource | null {
  if (cpLoss >= 30 || !bestSan) return null;
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  if (strip(bestSan) !== strip(san)) return null;
  // Cheap first: an opening lesson, with a knight of theirs still at home.
  if (Number(fenBefore.split(' ')[5] ?? 1) > 15) return null;
  let after: Chess;
  try { after = new Chess(fenBefore); after.move(san); } catch { return null; }
  const line = heldResourceLine(after.fen());
  if (!line) return null;
  // The resource was available a move ago and was not spent.
  const before = new Chess(fenBefore);
  const nowMove = before.moves({ verbose: true }).find((m) => m.piece === 'b' && m.to === line.squares[2]);
  if (!nowMove || strip(nowMove.san) === strip(san)) return null;
  const full = { ...line, check: nowMove.san.includes('+') };
  return { ...full, text: heldText(full, fenBefore, true) };
}

/** THE PROSPECTIVE HALF (a position read, the student to move): the bishop
 *  move is legal now, the engine's best is something else, and after any
 *  pass the knight's development lets it bite. Names the move to SAVE. */
export function holdIdea(fen: string, student: 'w' | 'b', bestSan: string | null): HeldResource | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || !bestSan) return null;
  const strip = (x: string): string => x.replace(/[+#]$/, '');
  // Give the move to them (a pass) to run the line from their turn.
  if (board.inCheck()) return null;
  const passed = withTurn(fen, student === 'w' ? 'b' : 'w');
  if (!passed) return null;
  const line = heldResourceLine(passed.fen());
  if (!line) return null;
  const nowMove = board.moves({ verbose: true }).find((m) => m.piece === 'b' && m.to === line.squares[2]);
  if (!nowMove || strip(nowMove.san) === strip(bestSan)) return null;
  const full = { ...line, check: nowMove.san.includes('+') };
  return { ...full, text: heldText(full, fen, false) };
}

function heldText(l: Omit<HeldResource, 'text'>, key: string, kept: boolean): string {
  const knightSq = l.squares[1];
  const res = l.resource;
  const cap = l.threat[0];
  if (kept) {
    return rotateStem([
      `Keeping ${l.check ? `the check ${res}` : res} back is right: once their knight comes to ${knightSq}, it pins the knight, and ${cap} would leave them doubled pawns.`,
      `${res} is still in hand — it bites once their knight is on ${knightSq}: the pin, then ${cap} doubling their pawns.`,
    ], stemKeyOf(key));
  }
  return rotateStem([
    `${l.check ? `Save the check ${res}` : `Save ${res}`} until their knight is on ${knightSq} — then it pins the knight, and ${cap} would leave them doubled pawns.`,
    `${res} can wait: once their knight comes to ${knightSq}, the bishop pins it there, and ${cap} would double their pawns.`,
  ], stemKeyOf(key));
}
