// THE TRAP SENTENCE (David 2026-11-25). One anchor, the blow, one pattern line:
//   "Before …d5, if they play …h6, Nxf7 wins. Your knight forks their queen on
//    d8 and the rook on h8, takes the rook. The pattern: f7 is guarded only by
//    their king. When your knight sits on g5, every slow move they make lets
//    you look at f7."
// The student's own slip reads "Watch out: …h6 allows Nxf7. Their knight …".
// Everything said is read off the board by chess.js; a winning move that hits,
// checks, mates or takes nothing has no blow to name, so nothing is said.
import { Chess, type Move, type Square } from 'chess.js';
import type { FactSeat } from './coachFact';
import { andList } from '../utils/andList';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface TrapLineInput {
  /** The board before the slip. */
  fen: string;
  slip: string;
  /** The punisher's line: its first move is the blow. */
  punish: readonly string[];
  /** Who plays the slip — REQUIRED. The student's slip is a "Watch out". */
  slipBy: FactSeat;
  /** The book move the slip is played before ("…d5"), when the line has one. */
  before?: string | null;
}

export interface TrapLine { text: string; squares: Square[] }

const dotted = (san: string, color: 'w' | 'b'): string => (color === 'b' ? `…${san.replace(/^…/, '')}` : san.replace(/^…/, ''));
const clean = (san: string): string => san.replace(/[+#]$/, '');

interface Blow {
  kind: 'mate' | 'fork' | 'pin' | 'check' | 'hit' | 'take';
  targets: Array<{ piece: string; square: Square }>;
  captured: string | null;
}

function attacked(c: Chess, from: Square, victim: 'w' | 'b'): Array<{ piece: string; square: Square }> {
  const out: Array<{ piece: string; square: Square }> = [];
  for (const row of c.board()) {
    for (const p of row) {
      if (!p || p.color !== victim || p.type === 'k') continue;
      if (!c.attackers(p.square, victim === 'w' ? 'b' : 'w').includes(from)) continue;
      out.push({ piece: p.type, square: p.square });
    }
  }
  return out;
}

const FILES = 'abcdefgh';
/** The piece behind an enemy piece along the ray from the mover, worth more. */
function pinned(c: Chess, mover: Move): { front: { piece: string; square: Square }; back: { piece: string; square: Square } } | null {
  if (!['b', 'r', 'q'].includes(mover.piece)) return null;
  const dirs = mover.piece === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
    : mover.piece === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
      : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const f0 = FILES.indexOf(mover.to[0]);
  const r0 = Number(mover.to[1]) - 1;
  const victim = mover.color === 'w' ? 'b' : 'w';
  for (const [df, dr] of dirs) {
    const seen: Array<{ piece: string; square: Square }> = [];
    for (let k = 1; k < 8; k += 1) {
      const f = f0 + df * k; const r = r0 + dr * k;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const sq = `${FILES[f]}${r + 1}` as Square;
      const p = c.get(sq);
      if (!p) continue;
      if (p.color !== victim) break;
      seen.push({ piece: p.type, square: sq });
      if (seen.length === 2) break;
    }
    if (seen.length === 2 && seen[0].piece !== 'k') {
      const [front, back] = seen;
      if (back.piece === 'k' || (VALUE[back.piece] ?? 0) > (VALUE[front.piece] ?? 0)) return { front, back };
    }
  }
  return null;
}

function readBlow(after: Chess, mover: Move): Blow | null {
  const victim = mover.color === 'w' ? 'b' : 'w';
  if (after.isCheckmate()) return { kind: 'mate', targets: [], captured: mover.captured ?? null };
  const targets = attacked(after, mover.to, victim).filter((t) => (VALUE[t.piece] ?? 0) > (VALUE[mover.piece] ?? 0) || after.attackers(t.square, victim).length === 0);
  const check = after.isCheck();
  if (targets.length + (check ? 1 : 0) >= 2) return { kind: 'fork', targets, captured: mover.captured ?? null };
  if (check) return { kind: 'check', targets, captured: mover.captured ?? null };
  const pin = pinned(after, mover);
  if (pin) return { kind: 'pin', targets: [pin.front, pin.back], captured: mover.captured ?? null };
  if (targets.length === 1) return { kind: 'hit', targets, captured: mover.captured ?? null };
  if (mover.captured) return { kind: 'take', targets: [], captured: mover.captured };
  return null;
}

/** The pattern behind the blow: the square it lands on is guarded only by the
 *  king, or by nothing — read on the board after the slip, before the blow. */
function readPattern(afterSlip: Chess, mover: Move, punisherIs: 'you' | 'they'): string | null {
  const T = mover.to;
  const defender = mover.color === 'w' ? 'b' : 'w';
  const target = afterSlip.get(T);
  const onlyKing = !!target && afterSlip.attackers(T, defender).length === 1 && afterSlip.get(afterSlip.attackers(T, defender)[0])?.type === 'k';
  const owner = punisherIs === 'you' ? 'your' : 'their';
  const slipperIs = punisherIs === 'you' ? 'they' : 'you';
  const who = punisherIs === 'you' ? 'you' : 'them';
  const king = punisherIs === 'you' ? 'their' : 'your';
  if (onlyKing && target) {
    return `The pattern: ${T} is guarded only by ${king} king. When ${owner} ${NAME[mover.piece]} sits on ${mover.from}, every slow move ${slipperIs} make lets ${punisherIs === 'you' ? 'you' : 'them'} look at ${T}.`;
  }
  if (target && target.color === defender && afterSlip.attackers(T, defender).length === 0) {
    return `The pattern: the ${NAME[target.type]} on ${T} has no guard. When ${owner} ${NAME[mover.piece]} sits on ${mover.from}, every slow move ${slipperIs} make lets ${who} look at it.`;
  }
  return null;
}

/** The sentence, or null when the blow hits, checks, mates and takes nothing. */
export function trapLine(i: TrapLineInput): TrapLine | null {
  let c: Chess;
  try { c = new Chess(i.fen); } catch { return null; }
  const slipperColor = c.turn();
  let slip: Move;
  try { slip = c.move(i.slip); } catch { return null; }
  if (!slip || i.punish.length === 0) return null;
  const afterSlip = new Chess(c.fen());
  let blow: Move;
  try { blow = c.move(i.punish[0]); } catch { return null; }
  if (!blow) return null;
  const read = readBlow(c, blow);
  if (!read) return null;

  const punisherIs: 'you' | 'they' = i.slipBy === 'opponent' ? 'you' : 'they';
  const P = punisherIs === 'you' ? 'Your' : 'Their';
  const V = punisherIs === 'you' ? 'their' : 'your';
  const slipSaid = dotted(clean(slip.san), slipperColor);
  const blowSaid = dotted(clean(blow.san), blow.color);
  const piece = NAME[blow.piece];
  const verb = read.kind === 'mate' ? 'is mate' : 'wins';
  const anchor = i.slipBy === 'opponent'
    ? `${i.before ? `Before ${dotted(clean(i.before), slipperColor)}, if they play ${slipSaid}` : `If they play ${slipSaid}`}, ${blowSaid} ${verb}.`
    : `Watch out: ${slipSaid} allows ${blowSaid}, and it ${read.kind === 'mate' ? 'is mate' : 'wins'}.`;

  const named = (t: { piece: string; square: Square }, first: boolean): string => `${first ? `${V} ` : 'the '}${NAME[t.piece]} on ${t.square}`;
  let blowText: string;
  const takes = read.captured ? `takes the ${NAME[read.captured]}` : '';
  switch (read.kind) {
    case 'mate': blowText = `${P} ${piece} mates on ${blow.to}.`; break;
    case 'fork': {
      const ts = read.targets.map((t, k) => named(t, k === 0));
      const list = andList(c.isCheck() ? [...ts, 'the king'] : ts);
      blowText = `${P} ${piece} forks ${list}${takes ? `, ${takes}` : ''}.`;
      break;
    }
    case 'check': blowText = `${P} ${piece} ${takes ? `${takes} with` : 'gives'} check.`; break;
    case 'pin': blowText = `${P} ${piece} pins ${V} ${NAME[read.targets[0].piece]} on ${read.targets[0].square} to the ${NAME[read.targets[1].piece]}${takes ? ` and ${takes}` : ''}.`; break;
    case 'hit': blowText = `${P} ${piece} attacks ${named(read.targets[0], true)}${takes ? ` and ${takes}` : ''}.`; break;
    default: blowText = `${P} ${piece} ${takes} on ${blow.to}.`;
  }
  const pattern = readPattern(afterSlip, blow, punisherIs);
  const squares = [slip.to, blow.from, blow.to, ...read.targets.map((t) => t.square)] as Square[];
  return { text: [anchor, blowText, pattern].filter(Boolean).join(' '), squares: [...new Set(squares)] };
}
