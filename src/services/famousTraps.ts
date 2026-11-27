// famousTraps — THE FAMOUS TRAPS, BY NAME (David 2026-11-26: "the Theory button
// finds every famous trap in any opening").
//
// `famous-traps.json` is computed offline by scripts/theory/build-famous-traps.mts
// from the repo's own named lines (the opening index's "… Trap" / "… Mate"
// entries, the named-trap lessons, the courses' named trap lines and
// famous-trap-lines.json): the engine finds the slip, chess.js plays every
// move, and the engine reads what the punishment wins at the quiet end of the
// forced line (depth 22). Here a board is matched against it — the slip on
// this board, or one move away — and the trap is named.
//
// A famous trap is ALWAYS named; what the sentence says it wins is what the
// engine and the line's own material say (F04's +3/mate bar still decides
// whether an UNNAMED slip is a trap — `classifySlip`). It never claims a piece
// the line does not win. The student's own slip is "Watch out: …".
//
// PURE: reads one bundled data file.
import { Chess } from 'chess.js';
import data from '../data/famous-traps.json';
import { computeExchangeLedger, netPieceWords } from './exchangeLedger';
import { andList } from '../utils/andList';
import { trapLine } from './trapLine';
import { unmarked } from '../utils/sanMark';
import type { FactSeat } from './coachFact';

export interface FamousTrap {
  order: number;
  name: string;
  source: string;
  /** The moves that reach the slip's board (one move order of it). */
  line: string;
  /** The board the slip is played from: its first four FEN fields. */
  board: string;
  slip: string;
  by: 'w' | 'b';
  /** The punisher's line, starting with the blow. */
  punish: string[];
  /** The punisher's read at the quiet end of the forced line (0 when mate). */
  endCp: number;
  mate: boolean;
}

const TRAPS = (data as { traps: FamousTrap[] }).traps;
const BY_BOARD = new Map<string, FamousTrap[]>();
for (const t of TRAPS) {
  const list = BY_BOARD.get(t.board) ?? [];
  list.push(t);
  BY_BOARD.set(t.board, list);
}

const boardKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const bare = (san: string): string => san.replace(/[+#?!]+$/, '').replace(/^…/, '');

/** Every famous trap whose slip is played from this board. */
export function famousTrapsAt(fen: string): readonly FamousTrap[] {
  return BY_BOARD.get(boardKey(fen)) ?? [];
}

/** "the Noah's Ark Trap", "Scholar's Mate", "the Fried Liver Attack". */
export function famousTrapName(name: string): string {
  // A mate named for a person is said bare ("Scholar's Mate"); every other
  // name takes "the" ("the Noah's Ark Trap").
  return /^[A-Z][a-zé]+['’]s mate$/i.test(name) ? name : `the ${name}`;
}

const said = (san: string, color: 'w' | 'b'): string => `${color === 'b' ? '…' : ''}${bare(san)}`;

/** What the punishment wins, from the punisher's seat, by the line's own
 *  material and the engine: a mate is mate; settled material is named only
 *  when the engine's read holds it (never a piece the line gives back); else
 *  the engine's standing. */
export function famousOutcome(t: FamousTrap, punisher: 'you' | 'they'): { verb: string; words: string } {
  const sansAll = [t.slip, ...t.punish];
  const last = sansAll[sansAll.length - 1] ?? '';
  if (t.mate || /#$/.test(last)) return { verb: 'mate', words: 'mate' };
  const slipper = t.by;
  const fen = `${t.board} 0 1`;
  const ledger = computeExchangeLedger(fen, sansAll, slipper);
  if (ledger) {
    // The ledger is read from the slipper's seat: the punisher's gain is the
    // slipper's loss.
    const took = ledger.opponentWon; const gave = ledger.studentWon;
    const net = -ledger.netPawns;
    const words = net >= 1 ? netPieceWords(took, gave) : null;
    if (words && (t.mate || t.endCp >= Math.max(50, net * 100 - 150))) return { verb: 'win', words };
  }
  if (t.endCp >= 300) return { verb: 'stand', words: punisher === 'you' ? 'you are winning' : 'they are winning' };
  if (t.endCp >= 100) return { verb: 'stand', words: punisher === 'you' ? 'you have the better game' : 'they have the better game' };
  if (t.endCp >= 50) return { verb: 'stand', words: punisher === 'you' ? 'you are a little better' : 'they are a little better' };
  // The trap the name promises does not work against the engine's defence:
  // it is named, and said as what the engine finds.
  return { verb: 'stand', words: 'the engine finds a defence and it stays level' };
}

/** The punisher's key moves, said: the blow and, when the line runs on, the
 *  punisher's next move ("…c5 and …c4"). */
function keyMoves(t: FamousTrap): string[] {
  const punisher: 'w' | 'b' = t.by === 'w' ? 'b' : 'w';
  // The blow, and the punisher's next move when it is forcing (a capture, a
  // check, a mate) or the blow itself was quiet (Noah's Ark: …c5 sets it,
  // …c4 springs it): a quiet move after a capture is not the trap's point.
  const forcing = (s: string): boolean => /x|[+#]$/.test(s);
  const mine = t.punish.filter((_, k) => k % 2 === 0).slice(0, 2).filter((s, k, all) => k === 0 || forcing(s) || !forcing(all[0]));
  return mine.map((s) => said(s, punisher));
}

/** The sentence naming the trap, from the seat of whoever slips.
 *  - slipBy 'opponent': "This is the Noah's Ark Trap: if they play Qxd4, …c5
 *    and …c4 win a bishop for two pawns." (before: the move the slip follows)
 *  - slipBy 'student': "Watch out: this is the X. Qxd4 allows …c5 and …c4,
 *    and they win …". */
export function famousTrapLine(i: { trap: FamousTrap; slipBy: FactSeat; before?: { san: string; color: 'w' | 'b' } | null; played?: boolean }): { text: string; squares: string[] } | null {
  const t = i.trap;
  let c: Chess;
  try { c = new Chess(`${t.board} 0 1`); } catch { return null; }
  let slip;
  try { slip = c.move(t.slip); } catch { return null; }
  const squares = [slip.to];
  try {
    const blow = c.move(t.punish[0] ?? '');
    if (blow) squares.push(blow.from, blow.to);
  } catch { /* a mate on the slip itself */ }
  const name = famousTrapName(t.name);
  // The blow and the pattern behind it, read off the board (`trapLine`).
  // A mate's blow is already said ("leads to mate"): only its pattern follows.
  const tl = t.punish.length ? trapLine({ fen: `${t.board} 0 1`, slip: t.slip, punish: t.punish, slipBy: i.slipBy }) : null;
  const mates = t.mate || /#$/.test(t.punish[t.punish.length - 1] ?? '');
  const tail = tl ? [mates ? null : tl.blow, tl.pattern].filter(Boolean).join(' ') : '';
  const withTail = (x: { text: string; squares: string[] } | null): { text: string; squares: string[] } | null => (x && tail ? { ...x, text: `${x.text} ${tail}` } : x);
  const slipSaid = said(t.slip, t.by);
  const punisher: 'you' | 'they' = i.slipBy === 'opponent' ? 'you' : 'they';
  const o = famousOutcome(t, punisher);
  const moves = keyMoves(t);
  if (/#$/.test(t.slip)) {
    return { text: i.slipBy === 'opponent' ? `This is ${name}: ${slipSaid} mates.` : `Watch out: this is ${name}. ${unmarked(slipSaid)} is mate.`, squares };
  }
  const blowList = andList(moves);
  const result = o.verb === 'mate'
    ? `${blowList} ${moves.length > 1 ? 'lead' : 'leads'} to mate`
    : o.verb === 'win'
      ? `${blowList} ${moves.length > 1 ? 'win' : 'wins'} ${o.words}`
      : `after ${blowList}, ${o.words}`;
  if (i.slipBy === 'opponent') {
    if (i.played) return withTail({ text: `That is ${name}: ${result}.`, squares });
    const pre = i.before ? `after ${said(i.before.san, i.before.color)}, ` : '';
    const cond = `${pre}if they play ${slipSaid}, ${result}`;
    return withTail({ text: `This is ${name}: ${cond}.`, squares });
  }
  if (i.played) return withTail({ text: `That walks into ${name}: ${result}.`, squares });
  const pre = i.before ? `After ${said(i.before.san, i.before.color)}, ` : '';
  return withTail({ text: `Watch out: this is ${name}. ${pre}${unmarked(slipSaid)} allows ${blowList}, and ${o.verb === 'mate' ? 'it is mate' : o.verb === 'win' ? `they win ${o.words}` : o.words}.`, squares });
}

/** THE FAMOUS TRAP AT A MOVE of the taught line, both seats:
 *  1. the move played IS a famous slip (said as walked into / sprung);
 *  2. the board after the move holds a famous slip for the side to move;
 *  3. a famous slip is one move away: after a legal reply (the masters'
 *     roads first), the board holds one for the side then to move.
 *  `student` is the student's seat. Null when no famous trap is near. */
export function famousTrapRead(i: { fenBefore: string; san: string; mover: 'w' | 'b'; student: 'w' | 'b'; roads?: readonly string[] }): { text: string; squares: string[]; slipPlayed: boolean } | null {
  const seat = (slipper: 'w' | 'b'): FactSeat => (slipper === i.student ? 'student' : 'opponent');
  let after: Chess;
  let move;
  try { after = new Chess(i.fenBefore); move = after.move(i.san); } catch { return null; }
  // 1. The slip itself.
  for (const t of famousTrapsAt(i.fenBefore)) {
    const s = new Chess(i.fenBefore);
    let m;
    try { m = s.move(t.slip); } catch { continue; }
    if (m.from !== move.from || m.to !== move.to) continue;
    const r = famousTrapLine({ trap: t, slipBy: seat(t.by), played: true });
    if (r) return { ...r, slipPlayed: true };
  }
  // 2. On offer on this board.
  for (const t of famousTrapsAt(after.fen())) {
    const r = famousTrapLine({ trap: t, slipBy: seat(t.by) });
    if (r) return { ...r, slipPlayed: false };
  }
  // 3. One move away: the masters' roads first, then every legal move.
  const legal = after.moves();
  const order = [...(i.roads ?? []).filter((s) => legal.includes(s)), ...legal.filter((s) => !(i.roads ?? []).includes(s))];
  for (const s of order) {
    const b = new Chess(after.fen());
    let m;
    try { m = b.move(s); } catch { continue; }
    for (const t of famousTrapsAt(b.fen())) {
      const r = famousTrapLine({ trap: t, slipBy: seat(t.by), before: { san: m.san, color: m.color } });
      if (r) return { ...r, slipPlayed: false };
    }
  }
  return null;
}
