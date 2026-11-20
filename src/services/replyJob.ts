// replyJob — WHAT THE REPLY DOES AGAINST A TRY (Danya's "…Qd7 guards b5",
// "…Rf7 covers the seventh", "…h4 kicks the knight", "…Kf7-e6 and the king
// holds the pawn").
//
// The weighing names the reply that meets a tempting try; until now it never
// said the reply's job, so "Qc5 runs into …Qd7" left the student to work out
// why …Qd7 is the answer. This reads the job off the board after the try and
// after the reply, with chess.js and the computers that already read threats
// (`detectNewThreat` — the try's threat and the reply's counter-threat;
// `threatStoppedBy` — whether the reply ends the try's threat; `captureRead`
// — whether a capture still wins). One job, the first that holds, in this
// order: it takes back; it takes the attacked piece out of the attack; it
// guards the target; it blocks the line; it traps or kicks the trying piece;
// it contests the line the trying piece took; it hits something of the
// mover's; it heads for a square where it hits something.
//
// PURE: chess.js and the threat readers. No engine. Phrasing rotated on the
// board (`rotateStem`), never rolled.
import { trappedAt } from './trappedPiece';
import { sideToMoveAs } from './threatOut';
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { detectNewThreat } from './groundedAnswer';
import { threatStoppedBy } from './opponentMovePurpose';
import { captureRead } from './positionReadingService';
import { pieceRef } from './pieceRef';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { andList } from '../utils/andList';

export type ReplyJobKind = 'recaptures' | 'steps-away' | 'guards' | 'blocks' | 'traps' | 'kicks' | 'contests' | 'counter' | 'heads-for';

export interface ReplyJob {
  kind: ReplyJobKind;
  /** One sentence, the reply named first ("…Qd7 guards your pawn on b5."). */
  text: string;
  /** The same job for a sentence that follows one naming the reply: the
   *  piece, not the move ("The queen guards your pawn on b5."). */
  follow: string;
  /** The squares the job is about (the target, the line, the square headed for). */
  squares: string[];
}

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const value = (t: string): number => MATERIAL_VALUE[t as keyof typeof MATERIAL_VALUE] ?? 0;

function playUci(b: Chess, u: string): Move | null {
  try { return b.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}

/** The squares strictly between two squares on one line, or null when they
 *  share no rank, file or diagonal. */
function between(a: string, z: string): string[] | null {
  const f0 = a.charCodeAt(0); const r0 = Number(a[1]);
  const f1 = z.charCodeAt(0); const r1 = Number(z[1]);
  const df = Math.sign(f1 - f0); const dr = Math.sign(r1 - r0);
  if (!(f0 === f1 || r0 === r1 || Math.abs(f1 - f0) === Math.abs(r1 - r0))) return null;
  const out: string[] = [];
  for (let f = f0 + df, r = r0 + dr; f !== f1 || r !== r1; f += df, r += dr) out.push(`${String.fromCharCode(f)}${r}`);
  return out;
}

/** Squares holding `enemy`'s pieces (no king) that the piece on `from`
 *  attacks on `fen`. */
function hitsFrom(fen: string, from: string, enemy: Color): string[] {
  let b: Chess;
  try { b = new Chess(fen); } catch { return []; }
  const out: string[] = [];
  for (const row of b.board()) for (const c of row) {
    if (!c || c.color !== enemy || c.type === 'k') continue;
    if (b.attackers(c.square, enemy === 'w' ? 'b' : 'w').includes(from as Square)) out.push(c.square);
  }
  return out;
}


/**
 * WHAT THE REPLY DOES AGAINST THE TRY. `tryLine` is the engine's line after
 * the try, UCI (the try first, the reply second, the try's side next).
 * `target` is the square the try was weighed for (the plan's target), or
 * null. `student` sets the seat words. Null when no job reads true.
 */
export function replyJob(fen: string, tryLine: readonly string[], target: string | null, student: Color): ReplyJob | null {
  if (tryLine.length < 2) return null;
  const walk = new Chess();
  try { walk.load(fen); } catch { return null; }
  const tm = playUci(walk, tryLine[0]);
  if (!tm) return null;
  const b1 = walk.fen();
  const rm = playUci(walk, tryLine[1]);
  if (!rm) return null;
  const b2 = walk.fen();
  const mover = tm.color;
  const replier = rm.color;
  const reply = `${replier === 'b' ? '…' : ''}${rm.san}`;
  const key = stemKeyOf(`${fen}|reply|${tryLine[0]}${tryLine[1]}`);
  const ref = (f: string, sq: string): string => pieceRef(f, sq, student)?.words ?? sq;
  const theRepliers = `The ${NAME[rm.piece]}`;
  const say = (kind: ReplyJobKind, clauses: string[], squares: string[]): ReplyJob => {
    const clause = rotateStem(clauses, key);
    return { kind, text: `${reply} ${clause}`, follow: `${theRepliers} ${clause}`, squares };
  };

  // 1. IT TAKES BACK: the try captured, and the reply recaptures on its square.
  if (tm.captured && rm.captured && rm.to === tm.to) {
    return say('recaptures', [`simply takes back.`, `just recaptures.`], [rm.to]);
  }

  // The try's own threat, and whether the reply ends it.
  const threat = /\+/.test(tm.san) ? null : detectNewThreat(fen, b1, mover);
  const stopped = threat ? threatStoppedBy(fen, b1, rm.san, mover) : null;
  const threatened = threat ? (threat.kind === 'fork' ? threat.targetSquares : threat.kind === 'capture' ? [threat.landing] : []) : [];

  // 2. IT STEPS OUT OF THE ATTACK: the piece the try hit moves away.
  if (stopped && threatened.includes(rm.from) && !rm.captured && captureRead(b2, rm.to as Square, mover) === 0) {
    return say('steps-away', [`steps out of the attack.`, `simply gets out of the way.`], [rm.from, rm.to]);
  }

  // 3. IT GUARDS THE TARGET: the reply newly covers the square the try was
  // after, and taking there no longer wins anything.
  const targets = [...new Set([...(target ? [target] : []), ...threatened])];
  for (const t of targets) {
    const p = new Chess(b2).get(t as Square);
    if (!p || p.color !== replier) continue;
    const covered = new Chess(b2).attackers(t as Square, replier).includes(rm.to);
    const was = new Chess(b1).attackers(t as Square, replier).includes(rm.from);
    if (!covered || was) continue;
    if (captureRead(b2, t as Square, mover) !== 0) continue;
    // The pawn or piece really was the try's to win before the reply.
    const flip = sideToMoveAs(b1, mover);
    const before = flip ? captureRead(flip, t as Square, mover) : null;
    if (before === null || before <= 0) continue;
    const what = ref(b2, t);
    if (rm.piece === 'k') return say('guards', [`holds ${what}.`, `defends ${what}.`], [t, rm.to]);
    return say('guards', [`guards ${what}.`, `covers ${what}.`], [t, rm.to]);
  }

  // 4. IT BLOCKS THE LINE: the reply lands between the trying piece and what
  // it hit, and the hit is gone.
  if (tm.piece === 'b' || tm.piece === 'r' || tm.piece === 'q') {
    const hitBefore = hitsFrom(b1, tm.to, replier);
    const hitAfter = new Set(hitsFrom(b2, tm.to, replier));
    for (const t of hitBefore) {
      if (hitAfter.has(t) || t === rm.from) continue;
      const line = between(tm.to, t);
      if (!line || !line.includes(rm.to)) continue;
      // Only a hit that was a threat: taking there won something.
      const flip = sideToMoveAs(b1, mover);
      const won = flip ? captureRead(flip, t as Square, mover) : null;
      if (won === null || won <= 0) continue;
      const own = mover === student ? 'your' : 'their';
      return say('blocks', [`blocks ${own} ${NAME[tm.piece]}'s line to ${ref(b2, t)}.`, `cuts ${own} ${NAME[tm.piece]} off from ${ref(b2, t)}.`], [rm.to, t]);
    }
  }

  // 5. IT HITS THE TRYING PIECE: traps it, or kicks it.
  if (!rm.captured && tm.piece !== 'k') {
    const b2b = new Chess(b2);
    const onIt = b2b.attackers(tm.to as Square, replier).includes(rm.to)
      && !new Chess(b1).attackers(tm.to as Square, replier).includes(rm.from);
    if (onIt && b2b.get(tm.to as Square)?.color === mover) {
      const piece = ref(b2, tm.to);
      if (trappedAt(b2, tm.to) !== null) {
        return say('traps', [`traps ${piece}: it has no safe square.`, `leaves ${piece} with nowhere to go.`], [tm.to, rm.to]);
      }
      const guarded = b2b.isAttacked(tm.to as Square, mover);
      // A KICK SENDS IT AWAY: the line moves the trying piece on, taking
      // nothing (a piece left to be taken, or one that trades itself off, was
      // not kicked). A pawn is not kicked, and a king kicks only a loose piece.
      const next = tryLine[2] ?? '';
      const leaves = next.slice(0, 2) === tm.to && !(() => { const w = new Chess(b2); return playUci(w, next)?.captured; })();
      const kicker = rm.piece === 'k' ? !guarded : value(rm.piece) < value(tm.piece) || !guarded;
      if (tm.piece !== 'p' && leaves && kicker) {
        return say('kicks', [`kicks ${piece} away.`, `hits ${piece} and sends it packing.`], [tm.to, rm.to]);
      }
      // 6. IT CONTESTS THE LINE: a rook or queen meets the rook or queen the
      // try brought in, on the same rank or file.
      if ((tm.piece === 'r' || tm.piece === 'q') && rm.piece === tm.piece) {
        if (rm.to[1] === tm.to[1]) {
          const rank = mover === 'w' ? Number(tm.to[1]) : 9 - Number(tm.to[1]);
          return say('contests', [`covers the ${ORDINAL[rank]} rank.`, `contests the ${ORDINAL[rank]} rank.`], [rm.to, tm.to]);
        }
        if (rm.to[0] === tm.to[0]) {
          return say('contests', [`covers the ${tm.to[0]}-file.`, `contests the ${tm.to[0]}-file.`], [rm.to, tm.to]);
        }
      }
    }
  }

  // 7. IT HITS BACK: a counter-threat the reply makes, read as a threat.
  // Only a threat the replying piece makes, from a board that was not a
  // check to answer (a reply to check has no "in return").
  const read = /\+/.test(rm.san) || /\+/.test(tm.san) ? null : detectNewThreat(b1, b2, replier);
  const counter = read && read.from === rm.to ? read : null;
  if (counter && counter.kind === 'capture') {
    const hit = ref(b2, counter.landing);
    // "In return" only answers a try that threatened something itself.
    return say('counter', threat ? [`hits ${hit} in return.`, `counters by attacking ${hit}.`] : [`attacks ${hit}.`, `goes after ${hit}.`], [rm.to, counter.landing]);
  }
  if (counter && counter.kind === 'mate') {
    return say('counter', threat ? [`threatens mate in return.`, `hits back with a mate threat.`] : [`threatens mate.`, `sets up a mate threat.`], [rm.to, counter.landing]);
  }

  // 8. IT HEADS FOR A SQUARE: the reply's piece moves on in the line, and
  // there it makes a threat ("…Qd7 heads for d2").
  if (tryLine.length >= 4) {
    const w2 = new Chess(b2);
    const mm = playUci(w2, tryLine[2]);
    if (mm) {
      const before = w2.fen();
      const nm = playUci(w2, tryLine[3]);
      if (nm && nm.from === rm.to && !nm.captured && !/\+/.test(nm.san)) {
        // What it hits there that it did not hit before and that taking would
        // win (a loose piece or pawn): his "…Qd2, hitting b2 and e3".
        const after = w2.fen();
        const flip = sideToMoveAs(after, replier);
        const wasHit = new Set(hitsFrom(before, rm.to, mover));
        const hits = hitsFrom(after, nm.to, mover)
          .filter((sq) => !wasHit.has(sq))
          .filter((sq) => { const r = flip ? captureRead(flip, sq as Square, replier) : null; return r !== null && r > 0; })
          .sort((x, y) => value(new Chess(after).get(y as Square)?.type ?? '') - value(new Chess(after).get(x as Square)?.type ?? ''));
        if (hits.length > 0) {
          const hit = andList(hits.map((sq) => ref(after, sq)));
          return say('heads-for', [`heads for ${nm.to}, where it hits ${hit}.`, `is on its way to ${nm.to}, to hit ${hit} from there.`], [rm.to, nm.to, ...hits]);
        }
      }
    }
  }
  return null;
}
