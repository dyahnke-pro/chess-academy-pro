import { Chess } from 'chess.js';

/**
 * MATERIAL BY COUNT ALONE — what a point total may truthfully be called when
 * nothing says which pieces make it up. "A pawn" and "two pawns" are always
 * true of 1 and 2; a 3 can be a knight, a bishop, three pawns or the exchange
 * and a pawn, so it is said as points (clean-pass walk VRUh4Qgh: "a piece up"
 * for the exchange and a pawn). A named piece comes only from code that knows
 * the pieces — the exchange ledger, or `boardEdgeWords` reading the board.
 */
export function countWords(points: number, opts: { unit?: boolean } = {}): string {
  const n = Math.round(points);
  if (n === 1) return 'a pawn';
  if (n === 2) return 'two pawns';
  return opts.unit ? `${n} points of material` : `${n} points`;
}

const PAWN_WORDS = ['', 'a pawn', 'two pawns', 'three pawns', 'four pawns', 'five pawns', 'six pawns', 'seven pawns', 'eight pawns'];

/**
 * THE ONE BOARD NAMER — `side`'s lead of `edge` points, named by the pieces
 * the board actually shows. A piece is named only when the board's piece
 * difference IS that piece (plus extra pawns) AND is worth exactly `edge`;
 * a settled lead the board does not show yet (a recapture still to come), or
 * a mix (a queen for a rook and a minor), is said by count. Replaces the
 * point-threshold namers (`>= 3 → 'a piece'`) that called the exchange and a
 * pawn "a piece" and two minors "a rook".
 */
export function boardEdgeWords(fen: string, side: 'w' | 'b', edge: number): string {
  const n = Math.round(edge);
  let c: Chess;
  try { c = new Chess(fen); } catch { return countWords(n); }
  const them: 'w' | 'b' = side === 'w' ? 'b' : 'w';
  const count = (color: 'w' | 'b', t: string): number => {
    let k = 0;
    for (const row of c.board()) for (const x of row) if (x && x.color === color && x.type === t) k += 1;
    return k;
  };
  const diff = (t: string): number => count(side, t) - count(them, t);
  const q = diff('q');
  const r = diff('r');
  const minors = diff('n') + diff('b');
  const p = diff('p');
  if (q * 9 + r * 5 + minors * 3 + p !== n) return countWords(n);
  // Their extra pawns make it a mix (two pieces for a pawn), named below.
  if (p < 0) return materialMix({ q, r, m: minors, p }) ?? countWords(n);
  const tail = p === 0 ? '' : ` and ${PAWN_WORDS[p] ?? `${p} pawns`}`;
  if (q === 1 && r === 0 && minors === 0) return `a queen${tail}`;
  if (q === 0 && r === 1 && minors === 0) return `a rook${tail}`;
  if (q === 0 && r === 1 && minors === -1) return `the exchange${tail}`;
  if (q === 0 && r === 0 && minors === 1) return `a piece${tail}`;
  if (q === 0 && r === 0 && minors === 0 && p > 0) return PAWN_WORDS[p] ?? `${p} pawns`;
  // A MIX THE BOARD SHOWS is named piece by piece (Learn audit 2026-10-15:
  // "You're 5 points up" for a queen and a pawn against a rook and two
  // pieces — a statistic where the board had the reason).
  if (q * 9 + r * 5 + minors * 3 + p === n) {
    const mix = materialMix({ q, r, m: minors, p });
    if (mix) return mix;
  }
  return countWords(n);
}

const UNIT: Record<'q' | 'r' | 'm' | 'p', [string, string]> = { q: ['queen', 'queens'], r: ['rook', 'rooks'], m: ['piece', 'pieces'], p: ['pawn', 'pawns'] };
const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** "material: a queen and a pawn for a rook and two pieces" — what each side
 *  has that the other lacks. Reads after "up" ("you're up material: …"). */
function materialMix(d: Record<'q' | 'r' | 'm' | 'p', number>): string | null {
  const kinds = ['q', 'r', 'm', 'p'] as const;
  const say = (k: typeof kinds[number], v: number): string => (v === 1 ? `a ${UNIT[k][0]}` : `${NUM[v] ?? v} ${UNIT[k][1]}`);
  const join = (xs: string[]): string => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
  const mine = kinds.filter((k) => d[k] > 0).map((k) => say(k, d[k]));
  const theirs = kinds.filter((k) => d[k] < 0).map((k) => say(k, -d[k]));
  if (!mine.length) return null;
  return theirs.length ? `material: ${join(mine)} for ${join(theirs)}` : join(mine);
}
