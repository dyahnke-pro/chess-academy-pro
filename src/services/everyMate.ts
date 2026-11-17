// everyMate — WHEN ONE MOVE MATES, LOOK FOR THE OTHER (Danya speedrun
// aEKSPFwvFoY, 19…Bh3#: "after Kf1 there are two mates in one, …Qf2# and
// …Bh3#; look for both").
//
// The board fact: the move played mates, and another move on the same board
// mates too. Counted by chess.js over every legal move (a promotion to two
// pieces on the same square is one move). Both seats. PURE: chess.js.
import { Chess } from 'chess.js';
import { andList } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface EveryMate {
  /** The mate played. */
  played: string;
  /** The other moves that mate on the same board. */
  others: string[];
}

/** The other mates beside the mate `san` from `fenBefore`, or null. */
export function everyMate(fenBefore: string, san: string): EveryMate | null {
  let c: Chess;
  let mv;
  try {
    c = new Chess(fenBefore);
    mv = new Chess(fenBefore).move(san);
  } catch { return null; }
  const seen = new Set<string>([`${mv.from}${mv.to}`]);
  const probe = new Chess(fenBefore);
  probe.move(san);
  if (!probe.isCheckmate()) return null;
  const others: string[] = [];
  for (const m of c.moves({ verbose: true })) {
    const k = `${m.from}${m.to}`;
    if (seen.has(k)) continue;
    c.move(m);
    const mate = c.isCheckmate();
    c.undo();
    if (mate) { seen.add(k); others.push(m.san.replace(/#$/, '')); }
  }
  return others.length > 0 ? { played: mv.san.replace(/#$/, ''), others } : null;
}

/** Said in the human voice, phrasings rotated on the board. */
export function everyMateLine(e: EveryMate, own: 'your' | 'their', fen: string): string {
  const n = e.others.length + 1;
  const all = andList([e.played, ...e.others]);
  const key = stemKeyOf(`${fen}|everyMate`);
  const who = own === 'your' ? 'you' : 'they';
  const count = n === 2 ? 'two' : n === 3 ? 'three' : String(n);
  return rotateStem([
    `${cap(count)} moves mate here: ${all}. Once you see one, look for the others.`,
    `${e.played} is mate, and so ${e.others.length === 1 ? 'is' : 'are'} ${andList(e.others)}. When one mate is there, check for another.`,
    `${cap(who)} have ${count} ways to mate here: ${all}. Found one? Keep looking for the rest.`,
  ], key);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
