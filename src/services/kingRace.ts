// kingRace — WHOSE KING REACHES THE ESCORT SQUARE FIRST (Danya have-check, 2026-11-19).
//
// Danya on the study: "everything hinges on whether White's king reaches g7
// (to escort the h-pawn) before Black's king can." In an ending with a passed
// pawn, the decisive count is often not the pawn's but the kings': a king that
// stands beside the promotion square walks the pawn home; one that arrives
// second is too late. `raceCount` counts pawn pushes; nothing counted the kings.
//
// The read, chess.js only, in an ending (no queens, at most two other pieces a
// side): for a side's most advanced passed pawn (its fifth rank or further),
// the ESCORT square is the square beside the pawn's path on the seventh rank
// (g7 for White's h-pawn; for a centre pawn the nearer of the two sides to the
// pawn's own king). Each king's distance is walked step by step, never through
// its own pieces nor onto a square the other king or an enemy pawn covers (a
// piece's control moves with the piece, so it does not fence a king for good). It fires when the
// two distances are within one move of each other — a race — and says who
// gets there first with the move.
import { Chess, type Color, type Square } from 'chess.js';

export interface KingRace { side: Color; pawn: Square; escort: Square; mine: number; theirs: number; first: Color; text: string; squares: Square[] }

const FILES = 'abcdefgh';
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function passed(c: Chess, sq: Square, col: Color): boolean {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  for (const df of [-1, 0, 1]) {
    const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = 1; rr <= 8; rr++) {
      if (col === 'w' ? rr <= r : rr >= r) continue;
      const p = c.get(`${FILES[ff]}${rr}` as Square);
      if (p && p.type === 'p' && p.color !== col) return false;
    }
  }
  return true;
}

function kingOf(c: Chess, col: Color): Square | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === col) return p.square;
  return null;
}

/** King steps from `from` to `to`, avoiding own pieces and squares the enemy king or pawns cover. */
export function kingSteps(c: Chess, from: Square, to: Square, col: Color): number | null {
  const enemy = other(col);
  // Only the enemy king and pawns fence a king out for good; a piece's control
  // moves as the piece does, and the race is counted over several moves.
  const fenced = (s: Square): boolean => c.attackers(s, enemy).some((a) => { const t = c.get(a)?.type; return t === 'p' || t === 'k'; });
  const ok = (s: Square): boolean => { const p = c.get(s); return (!p || p.color !== col) && !fenced(s); };
  if (from === to) return 0;
  const seen = new Set<string>([from]);
  let frontier: Square[] = [from];
  for (let d = 1; d <= 14 && frontier.length; d++) {
    const next: Square[] = [];
    for (const s of frontier) {
      const f = FILES.indexOf(s[0]); const r = Number(s[1]);
      for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        const ff = f + df; const rr = r + dr;
        if (ff < 0 || ff > 7 || rr < 1 || rr > 8) continue;
        const t = `${FILES[ff]}${rr}` as Square;
        if (seen.has(t)) continue;
        seen.add(t);
        if (t === to) return fenced(t) ? null : d;
        if (ok(t)) next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

/** The king race to a passed pawn's escort square, or null. */
export function kingRace(fen: string, student: Color): KingRace | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const pieces = c.board().flat().filter((p): p is NonNullable<typeof p> => !!p);
  if (pieces.some((p) => p.type === 'q')) return null;
  for (const col of ['w', 'b'] as Color[]) if (pieces.filter((p) => p.color === col && p.type !== 'p' && p.type !== 'k').length > 2) return null;
  const toMove = c.turn();
  for (const side of [toMove, other(toMove)]) {
    const pawns = pieces.filter((p) => p.type === 'p' && p.color === side && passed(c, p.square, side))
      .sort((a, b) => (side === 'w' ? Number(b.square[1]) - Number(a.square[1]) : Number(a.square[1]) - Number(b.square[1])));
    if (!pawns.length) continue;
    const pawn = pawns[0];
    const rel = side === 'w' ? Number(pawn.square[1]) : 9 - Number(pawn.square[1]);
    if (rel < 5 || rel > 6) continue;
    const myKing = kingOf(c, side); const theirKing = kingOf(c, other(side));
    if (!myKing || !theirKing) return null;
    const f = FILES.indexOf(pawn.square[0]);
    const r7 = side === 'w' ? '7' : '2';
    const sides = [f - 1, f + 1].filter((x) => x >= 0 && x <= 7).map((x) => `${FILES[x]}${r7}` as Square);
    const escort = sides.sort((a, b) => Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(myKing[0])) - Math.abs(FILES.indexOf(b[0]) - FILES.indexOf(myKing[0])))[0];
    if (c.get(escort)) continue;
    const mine = kingSteps(c, myKing, escort, side);
    const theirs = kingSteps(c, theirKing, escort, other(side));
    if (mine === null || theirs === null || mine < 2 || Math.abs(mine - theirs) > 1) continue;
    const first: Color = mine < theirs ? side : theirs < mine ? other(side) : toMove;
    const you = side === student;
    const firstWord = first === student ? 'you get' : 'they get';
    const text = `Everything hinges on a king race to ${escort}, the square that escorts ${you ? 'your' : 'their'} ${pawn.square[0]}-pawn home: ${you ? 'your' : 'their'} king needs ${mine} moves, ${you ? 'theirs' : 'yours'} ${theirs}${mine === theirs ? `, and with ${toMove === student ? 'you' : 'them'} to move ${firstWord} there first` : ` — ${firstWord} there first`} if nothing gets in the way.`;
    return { side, pawn: pawn.square, escort, mine, theirs, first, text, squares: [escort, pawn.square, myKing, theirKing] };
  }
  return null;
}
