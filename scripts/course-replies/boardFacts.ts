// BOARD FACTS a narration writer checks every claim against — one module, read
// by the subline fact sheet (`line-facts.ts`, WO-COURSE-01 E) and the Watch
// fact sheet (`lessonFacts.measure.test.ts`, WO-OPENINGS-REWRITE-01). The
// pilot's second reader (2026-10-27) found a pinned knight credited with an
// attack, "slightly better" on +0.23, a "…" on a White move: each is read off
// the board or the eval here, in fixed words.
import { Chess } from 'chess.js';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
type Sq = Parameters<Chess['get']>[0];
const SQS = [...'abcdefgh'].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}` as Sq));
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Every pin on the board, and the squares of the pinned pieces. A pin holds
 *  when the piece behind is the king, or worth more than both the pinned piece
 *  and the pinner (queen behind knight, with a queen pinning, is a trade). */
export function pinsOf(b: Chess, me: 'w' | 'b'): { text: string[]; pinned: Set<string> } {
  const side = (col: string): string => (col === me ? 'your' : 'their');
  const text: string[] = [];
  const pinned = new Set<string>();
  for (const sq of SQS) {
    const att = b.get(sq);
    if (!att || !'brq'.includes(att.type)) continue;
    for (const [df, dr] of DIRS) {
      const diag = df !== 0 && dr !== 0;
      if ((att.type === 'b' && !diag) || (att.type === 'r' && diag)) continue;
      let f = sq.charCodeAt(0) - 97 + df; let r = Number(sq[1]) + dr;
      let first: { sq: string; t: string } | null = null;
      while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
        const s2 = `${String.fromCharCode(97 + f)}${r}` as Sq;
        const q = b.get(s2);
        if (q) {
          if (q.color === att.color) break;
          if (!first) first = { sq: s2, t: q.type };
          else { if (VAL[q.type] > VAL[first.t] && (q.type === 'k' || VAL[q.type] > VAL[att.type])) { text.push(`${side(q.color)} ${NAME[first.t]} ${first.sq} pinned to the ${NAME[q.type]} ${s2} by the ${NAME[att.type]} ${sq}`); pinned.add(first.sq); } break; }
        }
        f += df; r += dr;
      }
    }
  }
  return { text, pinned };
}

/** Every piece attacked and unguarded (marked when only a pinned piece hits it). */
export function looseOf(b: Chess, me: 'w' | 'b', pinned: Set<string>): string[] {
  const side = (col: string): string => (col === me ? 'your' : 'their');
  const out: string[] = [];
  for (const sq of SQS) {
    const q = b.get(sq);
    if (!q || q.type === 'k') continue;
    const foe = q.color === 'w' ? 'b' : 'w';
    const by = b.attackers(sq, foe);
    if (!by.length || b.attackers(sq, q.color).length) continue;
    out.push(`${side(q.color)} ${NAME[q.type]} ${sq}${by.every((a) => pinned.has(a)) ? ' (but only a pinned piece attacks it)' : ''}`);
  }
  return out;
}

/** Material from the student's seat, in points. */
export function materialFor(b: Chess, me: 'w' | 'b'): number {
  let d = 0;
  for (const sq of SQS) { const q = b.get(sq); if (q && q.type !== 'k') d += (q.color === me ? 1 : -1) * VAL[q.type]; }
  return d;
}

/** What the piece that just moved (to `to`) attacks of the other side. */
export function hitsFrom(b: Chess, to: string, mover: 'w' | 'b'): string[] {
  return SQS.filter((sq) => { const q = b.get(sq); return q && q.color !== mover && b.attackers(sq, mover).includes(to as Sq); })
    .map((sq) => `${NAME[b.get(sq)!.type]} ${sq}`);
}

/** The words a narration may use for an eval from the student's seat. */
export function evalWords(cp: number): string {
  const a = Math.abs(cp);
  if (a < 35) return 'about level';
  const who = cp > 0 ? 'you' : 'they';
  if (a < 90) return `${who} are a little better`;
  if (a < 200) return `${who} are clearly better`;
  return `${who} are winning`;
}

export const PIECE_NAME = NAME;
