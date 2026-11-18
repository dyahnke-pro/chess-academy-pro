// theoreticalEnding — THE ENDINGS WITH A NAME, AND THEIR STEPS ON THIS BOARD
// (WO-DANYA-READS-01 #5; Danya: "the bridge-building maneuver", "pushing the
// king one more rank away from the pawn", "a draw is inevitable"). The
// geometry is `endgameTechnique`'s (Lucena, Philidor, the back-rank defence,
// the rook-pawn corner and the wrong bishop — material and squares, never a
// name in a string); this file says what to DO, with the squares of the board
// in front of the student:
//
//   lucena    — the bridge: the rook to the attacker's fourth rank (the square
//               on its own file when the file is clear), the king out, the
//               rook in front of the checks. A win.
//   philidor  — the third-rank defence: the rook on the defender's third rank
//               (the square on its own file when it can get there), and the
//               square it drops to, at the far end of its file, to check from
//               behind once the pawn reaches that rank. A draw.
//   back-rank — the king on the queening square of a rook or knight pawn, the
//               rook far off on the back rank. A draw.
//   rook-pawn — a rook pawn whose corner the defending king holds (alone, or
//               with the wrong bishop). A draw.
//
// When the surface hands in the engine's score, the ending's result must
// agree with it (a win for Lucena, level for the draws) — a board that only
// looks like the textbook is not named. No score, the theorem stands alone.
//
// PURE: chess.js and the geometry readers.
import { Chess, type Color, type Square } from 'chess.js';
import { detectLucena, detectPhilidor, detectBackRankDefence, detectRookPawnCorner, wrongBishopDrawText } from './endgameTechnique';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export type EndingName = 'lucena' | 'philidor' | 'back-rank' | 'rook-pawn' | 'wrong-bishop';

export interface TheoreticalEnding {
  name: EndingName;
  /** The side with the pawn. */
  attacker: Color;
  defender: Color;
  pawn: Square;
  outcome: 'win' | 'draw';
  /** Lucena: the rook's bridge square (null: the rank only). Philidor: the
   *  defender rook's third-rank square, and the square it checks from behind. */
  bridge: string | null;
  thirdRank: string | null;
  behind: string | null;
  /** Philidor: the defender's rook already holds the third rank. Lucena: the
   *  attacker's rook already stands on the bridge rank. */
  inPlace: boolean;
  /** The pieces the steps name. */
  squares: string[];
  /** The corner (rook-pawn, wrong-bishop). */
  corner: string | null;
  key: string;
}

function sideColor(s: 'white' | 'black'): Color { return s === 'white' ? 'w' : 'b'; }
function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

function pieceSquare(c: Chess, color: Color, type: 'r' | 'k'): Square | null {
  for (const cell of c.board().flat()) if (cell && cell.color === color && cell.type === type) return cell.square;
  return null;
}

/** The squares strictly between `from` and `to` on one file are empty, and
 *  `to` itself is empty. */
function fileClear(c: Chess, from: Square, to: string): boolean {
  if (from[0] !== to[0]) return false;
  const a = Number(from[1]); const b = Number(to[1]);
  const step = Math.sign(b - a);
  for (let r = a + step; r !== b + step; r += step) if (c.get(`${from[0]}${r}` as Square)) return false;
  return true;
}

/** Engine agreement: the attacker's score, White's view in. */
function agrees(outcome: 'win' | 'draw', attacker: Color, whiteCp: number | null): boolean {
  if (whiteCp === null) return true;
  const cp = attacker === 'w' ? whiteCp : -whiteCp;
  return outcome === 'win' ? cp >= 200 : Math.abs(cp) <= 100;
}

/** THE NAMED ENDING on `fen`, or null. `whiteCp`: the engine's score of the
 *  board (White's view) or null. */
export function theoreticalEndingOn(fen: string, whiteCp: number | null): TheoreticalEnding | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const key = (name: EndingName, pawn: string): string => `ending:${name}:${pawn}`;
  const lucena = detectLucena(fen);
  if (lucena) {
    const a = sideColor(lucena.side); const d = other(a);
    if (!agrees('win', a, whiteCp)) return null;
    const rook = pieceSquare(c, a, 'r');
    const rank = a === 'w' ? 4 : 5;
    const inPlace = !!rook && Number(rook[1]) === rank;
    const target = rook ? `${rook[0]}${rank}` : null;
    const bridge = rook && !inPlace && target && fileClear(c, rook, target) ? target : null;
    const king = pieceSquare(c, a, 'k'); const dk = pieceSquare(c, d, 'k');
    return { name: 'lucena', attacker: a, defender: d, pawn: lucena.pawn, outcome: 'win', bridge, thirdRank: null, behind: null, inPlace,
      squares: [lucena.pawn, ...(king ? [king] : []), ...(dk ? [dk] : []), ...(rook ? [rook] : []), ...(bridge ? [bridge] : [])], corner: null, key: key('lucena', lucena.pawn) };
  }
  const phil = detectPhilidor(fen);
  if (phil) {
    const d = sideColor(phil.side); const a = other(d);
    if (!agrees('draw', a, whiteCp)) return null;
    const rook = pieceSquare(c, d, 'r');
    const rank = d === 'w' ? 3 : 6;
    // The third-rank defence fences a king that has not yet reached that
    // rank; with the attacking king already on it, the fence came too late
    // and the textbook's first step is gone.
    const ak = pieceSquare(c, a, 'k');
    if (!ak || (d === 'w' ? Number(ak[1]) <= rank : Number(ak[1]) >= rank)) return null;
    const far = d === 'w' ? 8 : 1;
    const third = rook ? `${rook[0]}${rank}` : null;
    const reach = !!rook && !!third && (Number(rook[1]) === rank || fileClear(c, rook, third));
    const behind = rook ? `${rook[0]}${far}` : null;
    const dk = pieceSquare(c, d, 'k');
    return { name: 'philidor', attacker: a, defender: d, pawn: phil.pawn, outcome: 'draw', bridge: null,
      thirdRank: reach ? third : null, behind, inPlace: phil.thirdRankSet,
      squares: [phil.pawn, ...(dk ? [dk] : []), ...(rook ? [rook] : []), ...(reach && third && third !== rook ? [third] : [])], corner: null, key: key('philidor', phil.pawn) };
  }
  const brd = detectBackRankDefence(fen);
  if (brd) {
    const d = sideColor(brd.side); const a = other(d);
    if (!agrees('draw', a, whiteCp)) return null;
    const rook = pieceSquare(c, d, 'r'); const dk = pieceSquare(c, d, 'k');
    return { name: 'back-rank', attacker: a, defender: d, pawn: brd.pawn, outcome: 'draw', bridge: null, thirdRank: null, behind: null, inPlace: true,
      squares: [brd.pawn, ...(dk ? [dk] : []), ...(rook ? [rook] : [])], corner: null, key: key('back-rank', brd.pawn) };
  }
  const corner = detectRookPawnCorner(fen);
  if (corner) {
    const a = sideColor(corner.side); const d = other(a);
    if (!agrees('draw', a, whiteCp)) return null;
    const name: EndingName = corner.kind === 'wrong-bishop' ? 'wrong-bishop' : 'rook-pawn';
    return { name, attacker: a, defender: d, pawn: corner.pawn, outcome: 'draw', bridge: null, thirdRank: null, behind: null, inPlace: true,
      squares: [corner.pawn, corner.corner], corner: corner.corner, key: key(name, corner.pawn) };
  }
  return null;
}

/** THE ENDING IN WORDS, from the student's seat. `namesMoves`: the board is
 *  one the student asked to have read (the squares to go to may be named);
 *  false on a live board, where only the plan is said. */
export function theoreticalEndingLine(e: TheoreticalEnding, student: Color, namesMoves: boolean): string {
  const k = stemKeyOf(e.key);
  const mineAttack = e.attacker === student;
  if (e.name === 'lucena') {
    const lead = rotateStem(['This is the Lucena position.', 'A position worth knowing: the Lucena.'], k);
    const where = e.inPlace ? 'the rook already stands on its fourth rank' : namesMoves && e.bridge ? `the rook goes up to its fourth rank, to ${e.bridge}` : `the rook goes up to its fourth rank`;
    return mineAttack
      ? `${lead} Your pawn on ${e.pawn} is one step from queening with your king in front of it, and their king is cut off. The win is to build a bridge: ${where}, your king steps out, and when the checks come, the rook blocks them on that rank.`
      : `${lead} It is a known win for them: their pawn on ${e.pawn} is one step from queening with their king in front of it, and yours is cut off. They build a bridge: ${where.replace('the rook', 'their rook')}, the king steps out, and the rook blocks your checks. Your rook can only check until that wall goes up.`;
  }
  if (e.name === 'philidor') {
    const lead = rotateStem(['This is the Philidor defence.', 'The drawing method here is the Philidor defence.'], k);
    const file = e.pawn[0];
    const pawnThird = `${file}${e.defender === 'w' ? 3 : 6}`;
    const hold = e.inPlace
      ? 'the rook already holds the third rank'
      : namesMoves && e.thirdRank ? `the rook goes to the third rank, ${e.thirdRank}` : 'the rook goes to the third rank';
    const drop = namesMoves && e.behind ? `drops to ${e.behind}` : 'drops to the far end of its file';
    return mineAttack
      ? `${lead} Their king sits in front of your ${file}-pawn${e.inPlace ? ' and their rook holds the third rank, so your king cannot come forward' : ', and once their rook takes the third rank, your king cannot come forward'}. It is a known draw: the moment your pawn steps to ${pawnThird}, their rook drops back and checks you from behind, and your king has nowhere to hide.`
      : `${lead} Your king sits in front of their ${file}-pawn, and ${hold}, so their king cannot come forward. Keep it there. The moment the pawn steps to ${pawnThird}, the rook ${drop} and checks from behind: their king has nowhere to hide from the checks.`;
  }
  if (e.name === 'back-rank') {
    return mineAttack
      ? `The back-rank defence holds for them: their king sits on the queening square of your ${e.pawn[0]}-pawn and their rook waits far off on the back rank. Against a rook or knight pawn there is no room to break that: it is a draw.`
      : `The back-rank defence: your king sits on the queening square of their ${e.pawn[0]}-pawn, with your rook far off on the back rank, ready to meet any check along it. Against a rook or knight pawn there is no room to break that: it holds.`;
  }
  if (e.name === 'wrong-bishop') return wrongBishopDrawText({ pawn: e.pawn, corner: e.corner as Square });
  return mineAttack
    ? `Your ${e.pawn} pawn is a rook pawn, and their king holds the ${e.corner} corner. Nothing can drive it out, and pushing the pawn only stalemates: it is a draw.`
    : `Their ${e.pawn} pawn is a rook pawn, and your king holds the ${e.corner} corner. Nothing can drive it out, and pushing the pawn only stalemates: it is a draw.`;
}

/** THE MOVE THAT MADE IT (either seat): after `san` a named ending holds that
 *  did not before — or, in a Lucena, the rook just went up to the bridge
 *  rank, or in a Philidor just took the third rank. The wrong bishop made by
 *  a trade is the minors' matchup's (`minorMatchup`). Null otherwise. */
export function theoreticalEndingMade(fenBefore: string, san: string, whiteCp: number | null): { ending: TheoreticalEnding; fenAfter: string; step: 'reached' | 'bridge' | 'third-rank' } | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = c.move(san); } catch { return null; }
  const fenAfter = c.fen();
  const after = theoreticalEndingOn(fenAfter, whiteCp);
  if (!after || after.name === 'wrong-bishop') return null;
  const before = theoreticalEndingOn(fenBefore, null);
  if (!before || before.name !== after.name) return { ending: after, fenAfter, step: 'reached' };
  if (after.name === 'lucena' && mv.piece === 'r' && mv.color === after.attacker && after.inPlace && !before.inPlace) return { ending: after, fenAfter, step: 'bridge' };
  if (after.name === 'philidor' && mv.piece === 'r' && mv.color === after.defender && after.inPlace && !before.inPlace) return { ending: after, fenAfter, step: 'third-rank' };
  return null;
}

/** The move's step in words, from the student's seat. */
export function theoreticalEndingMadeLine(m: { ending: TheoreticalEnding; step: 'reached' | 'bridge' | 'third-rank' }, student: Color): string {
  const e = m.ending;
  if (m.step === 'bridge') {
    return e.attacker === student
      ? 'That builds the bridge: with the rook on the fourth rank, your king can step out, and the rook will block the checks.'
      : 'Their rook goes up to build the bridge: their king steps out next, and the rook blocks your checks.';
  }
  if (m.step === 'third-rank') {
    return e.defender === student
      ? 'That is the Philidor defence: the rook on the third rank keeps their king back. Leave it there until the pawn steps up.'
      : 'Their rook takes the third rank: that is the Philidor defence, and your king cannot come forward past it.';
  }
  return theoreticalEndingLine(e, student, false);
}
