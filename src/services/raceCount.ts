// raceCount — COUNT THE PAWN RACE (WO-DANYA-READS-01 #5; Danya: "Black's king
// is too far away to stop White's advanced pawn"; "the pawns promote
// simultaneously, but, well, you know the rest!"; "54.c6 g2 55.c7 g1=Q 56.c8=Q+
// Kf3 — it is not at all clear that White can make any progress").
//
// Kings and pawns only. For each side, its fastest RUNNER: a passed pawn with
// nothing on its file ahead, which the other king cannot catch by the rule of
// the square — the king's moves to the queening square against the pawn's
// pushes (the double step counted), the side to move making the difference:
// the pawn's side to move, the king catches it with at most as many moves as
// the pawn has pushes; the king's side to move, with one more.
//
//   runner — one side has a runner the other king cannot catch, and the
//            other has none: count it, both numbers.
//   race   — both sides have one. The race is PLAYED on the board with
//            chess.js, pushes only, the side to move first: who queens
//            first, whether the new queen gives check (the other side must
//            answer it and loses the tempo), whether it covers the other
//            pawn's road, whether a promotion stalemates, and — when both
//            queen — whether the first queen takes the second at once or
//            with a check first (every reply, then the capture, and no
//            recapture). "If nobody interferes": kings stand still in the
//            count, the honest unit of a race (`planRace`, G4.5.3).
//
// PURE: chess.js.
import { Chess, type Color, type Square, type Move } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { countWord } from '../utils/andList';

export interface Runner {
  side: Color;
  square: Square;
  /** Pushes to promotion (the double step counted). */
  pushes: number;
  /** The other king's moves to the queening square. */
  kingMoves: number;
  promo: string;
}

export interface RaceCount {
  kind: 'runner' | 'race';
  /** The side to move. */
  toMove: Color;
  runners: Partial<Record<Color, Runner>>;
  /** Race: who queens first (null: the race stops before anyone does). */
  first: Color | null;
  /** The first promotion gives check. */
  check: boolean;
  /** The first new queen then stands on the slower pawn's road (or on it). */
  covers: boolean;
  /** A promotion that stalemates the other side (its SAN). */
  stalemate: string | null;
  /** Both queened: the first queen wins the second — the capture, or the
   *  check that wins it (SAN, from the board after both promote). */
  winsQueen: { check: string | null; capture: string } | null;
  /** The pushes played, SAN, from the board. */
  line: string[];
  key: string;
}

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }
const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);
function cheb(a: string, b: string): number { return Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b))); }

function kingOf(c: Chess, color: Color): Square | null {
  for (const cell of c.board().flat()) if (cell?.type === 'k' && cell.color === color) return cell.square;
  return null;
}

/** The fastest runner of `side`, or null. */
function runnerOf(c: Chess, side: Color): Runner | null {
  const enemy = other(side);
  const enemyKing = kingOf(c, enemy);
  if (!enemyKing) return null;
  const pawns = c.board().flat().filter((x) => x?.type === 'p');
  const d = side === 'w' ? 1 : -1;
  let best: Runner | null = null;
  for (const p of pawns) {
    if (!p || p.color !== side) continue;
    const f = fileOf(p.square); const r = rankOf(p.square);
    const passed = !pawns.some((e) => e && e.color === enemy && Math.abs(fileOf(e.square) - f) <= 1 && (d === 1 ? rankOf(e.square) > r : rankOf(e.square) < r));
    if (!passed) continue;
    const promoRank = side === 'w' ? 8 : 1;
    let clear = true;
    for (let rr = r + d; rr !== promoRank + d; rr += d) if (c.get(`${p.square[0]}${rr}` as Square)) { clear = false; break; }
    if (!clear) continue;
    const start = side === 'w' ? r === 2 : r === 7;
    const pushes = Math.abs(promoRank - r) - (start ? 1 : 0);
    const promo = `${p.square[0]}${promoRank}`;
    const kingMoves = cheb(enemyKing, promo);
    // The rule of the square, the side to move counted.
    const caught = c.turn() === side ? kingMoves <= pushes : kingMoves <= pushes + 1;
    if (caught) continue;
    if (!best || pushes < best.pushes) best = { side, square: p.square, pushes, kingMoves, promo };
  }
  return best;
}

/** The push of the runner on `from` (the double step when it can), or null. */
function pushOf(c: Chess, from: string): Move | null {
  const ms = c.moves({ verbose: true }).filter((m) => m.from === from && m.piece === 'p' && !m.captured && (!m.promotion || m.promotion === 'q'));
  if (ms.length === 0) return null;
  return ms.sort((a, b) => Math.abs(rankOf(b.to) - rankOf(b.from)) - Math.abs(rankOf(a.to) - rankOf(a.from)))[0];
}

/** Does the queen on `q` see `to` along an open line? */
function queenSees(c: Chess, q: string, to: string): boolean {
  const df = fileOf(to) - fileOf(q); const dr = rankOf(to) - rankOf(q);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) || (df === 0 && dr === 0)) return false;
  const sf = Math.sign(df); const sr = Math.sign(dr);
  for (let f = fileOf(q) + sf, r = rankOf(q) + sr; f !== fileOf(to) || r !== rankOf(to); f += sf, r += sr) {
    if (c.get(`${String.fromCharCode(97 + f)}${r}` as Square)) return false;
  }
  return true;
}

/** The queen on `q` (side to move) wins the other queen: a capture the other
 *  side cannot take back, or a check after which every reply allows one. */
function queenWinsQueen(c: Chess, q: string, theirs: string): { check: string | null; capture: string } | null {
  const fen = c.fen();
  const safeTake = (b: Chess, from: string, target: string): string | null => {
    const take = b.moves({ verbose: true }).find((m) => m.from === from && m.to === target);
    if (!take) return null;
    const t = new Chess(b.fen()); t.move(take);
    return t.moves({ verbose: true }).some((m) => m.to === target) ? null : take.san;
  };
  const direct = safeTake(c, q, theirs);
  if (direct) return { check: null, capture: direct };
  for (const ch of c.moves({ verbose: true }).filter((m) => m.from === q && m.san.includes('+'))) {
    const b = new Chess(fen); b.move(ch);
    const replies = b.moves({ verbose: true });
    if (replies.length === 0) continue;
    let every = true; let capture = '';
    for (const r of replies) {
      const x = new Chess(b.fen()); x.move(r);
      const qNow = ch.to;
      const theirsNow = x.board().flat().find((cell) => cell?.type === 'q' && cell.color !== c.turn())?.square;
      const took = theirsNow ? safeTake(x, qNow, theirsNow) : null;
      if (!took) { every = false; break; }
      capture = took;
    }
    if (every) return { check: ch.san, capture };
  }
  return null;
}

/** THE RACE on `fen`, kings and pawns only, or null. */
export function raceCountOn(fen: string): RaceCount | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.board().flat().some((x) => !!x && x.type !== 'k' && x.type !== 'p')) return null;
  if (c.inCheck() || c.isGameOver()) return null;
  const toMove = c.turn();
  const mine = runnerOf(c, 'w'); const theirs = runnerOf(c, 'b');
  const key = `race:${fen.split(' ').slice(0, 2).join(' ')}`;
  if (!mine && !theirs) return null;
  const runners: Partial<Record<Color, Runner>> = {};
  if (mine) runners.w = mine;
  if (theirs) runners.b = theirs;
  if (!mine || !theirs) {
    return { kind: 'runner', toMove, runners, first: null, check: false, covers: false, stalemate: null, winsQueen: null, line: [], key };
  }
  // PLAY THE RACE: pushes only, the side to move first.
  const b = new Chess(fen);
  const at: Record<Color, string> = { w: mine.square, b: theirs.square };
  const queened: Partial<Record<Color, string>> = {};
  const line: string[] = [];
  let first: Color | null = null;
  let check = false; let covers = false; let stalemate: string | null = null;
  let winsQueen: RaceCount['winsQueen'] = null;
  for (let ply = 0; ply < 20; ply += 1) {
    const s = b.turn();
    if (queened[s]) {
      // The first queen is to move again: the other pawn is still on its way.
      const q = queened[s];
      const o = other(s);
      if (queened[o]) {
        winsQueen = queenWinsQueen(b, q, queened[o]);
      } else {
        const road: string[] = [];
        const d = o === 'w' ? 1 : -1;
        for (let r = rankOf(at[o]); r !== (o === 'w' ? 9 : 0); r += d) road.push(`${at[o][0]}${r}`);
        covers = road.some((sq) => queenSees(b, q, sq));
      }
      break;
    }
    if (b.inCheck()) break;
    const m = pushOf(b, at[s]);
    if (!m) break;
    b.move(m);
    line.push(m.san);
    at[s] = m.to;
    if (m.promotion) {
      queened[s] = m.to;
      if (!first) { first = s; check = b.inCheck(); }
      if (b.isStalemate()) { stalemate = m.san; break; }
    }
  }
  return { kind: 'race', toMove, runners, first, check, covers, stalemate, winsQueen, line, key };
}

/** The race in words, from the student's seat. */
export function raceCountLine(rc: RaceCount, student: Color): string {
  const k = stemKeyOf(rc.key);
  const moves = (n: number): string => `${countWord(n)} move${n === 1 ? '' : 's'}`;
  const yourMove = rc.toMove === student;
  if (rc.kind === 'runner') {
    const side = (rc.runners.w ? 'w' : 'b') as Color;
    const r = rc.runners[side] as Runner;
    const mine = side === student;
    const pawn = `${r.square[0]}-pawn`;
    return mine
      ? rotateStem([
        `Count it: your ${pawn} needs ${moves(r.pushes)} to queen, and their king needs ${moves(r.kingMoves)} to reach ${r.promo}. It cannot catch the pawn.`,
        `Your ${pawn} is a runner: ${moves(r.pushes)} to queen, while their king is ${moves(r.kingMoves)} from ${r.promo}. It is outside the square and cannot catch it.`,
      ], k)
      : rotateStem([
        `Count it: their ${pawn} needs ${moves(r.pushes)} to queen, and your king needs ${moves(r.kingMoves)} to reach ${r.promo}. It cannot catch the pawn.`,
        `Their ${pawn} is a runner: ${moves(r.pushes)} to queen, while your king is ${moves(r.kingMoves)} from ${r.promo}. Your king is outside the square and cannot catch it.`,
      ], k);
  }
  const you = rc.runners[student] as Runner; const them = rc.runners[other(student)] as Runner;
  const parts = [`Count the race: your ${you.square[0]}-pawn needs ${moves(you.pushes)} to queen, theirs needs ${moves(them.pushes)}, and it is ${yourMove ? 'your' : 'their'} move.`];
  if (!rc.first) return parts.join(' ');
  const youFirst = rc.first === student;
  parts.push(youFirst ? `You queen first${rc.check ? ', with check' : ''}.` : `They queen first${rc.check ? ', with check' : ''}.`);
  if (rc.stalemate) {
    parts.push(youFirst ? `But that promotion is stalemate: their king has no move left.` : `But that promotion stalemates you: a draw.`);
  } else if (rc.winsQueen) {
    parts.push(youFirst
      ? (rc.winsQueen.check ? `Both pawns queen, and then your queen checks with ${rc.winsQueen.check} and takes theirs.` : `Both pawns queen, and then your queen simply takes theirs.`)
      : (rc.winsQueen.check ? `Both pawns queen, and then their queen checks with ${rc.winsQueen.check} and takes yours.` : `Both pawns queen, and then their queen simply takes yours.`));
  } else if (rc.check) {
    parts.push(youFirst ? `The check costs them a tempo before their pawn can move again.` : `The check costs you a tempo before your pawn can move again.`);
  } else if (rc.covers) {
    parts.push(youFirst ? `And the new queen already stands on their pawn's road.` : `And their new queen already stands on your pawn's road.`);
  }
  return parts.join(' ');
}

/** The squares a read shows: the runners and their queening squares. */
export function raceCountSquares(rc: RaceCount): string[] {
  return (['w', 'b'] as Color[]).flatMap((s) => (rc.runners[s] ? [rc.runners[s].square, rc.runners[s].promo] : []));
}

/** THE MOVE THAT MADE THE RACE (either seat): after `san`, a race or a runner
 *  stands that did not before (a capture that clears a road, a king that
 *  stepped out of the square, a pawn that broke free). Null otherwise. */
export function raceCountMade(fenBefore: string, san: string): { read: RaceCount; fenAfter: string } | null {
  let c: Chess;
  try { c = new Chess(fenBefore); c.move(san); } catch { return null; }
  const fenAfter = c.fen();
  const after = raceCountOn(fenAfter);
  if (!after) return null;
  const before = raceCountOn(fenBefore);
  const sig = (r: RaceCount | null): string => (r ? `${r.kind}:${r.runners.w?.square[0] ?? '-'}${r.runners.b?.square[0] ?? '-'}` : 'none');
  if (before && sig(before) === sig(after)) return null;
  return { read: after, fenAfter };
}
