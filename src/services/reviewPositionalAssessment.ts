/**
 * reviewPositionalAssessment — the ENUMERATED POSITIONAL VERDICT teaching message
 * (David 2026-07-20: "focus on his teaching messages"). Naroditsky never says
 * "White is better" and stops — he says "we can point to a couple of things: the
 * bishop pair, an uncontested dark-squared bishop, we have the d-file, and e4 is a
 * targetable pawn." The verdict is an ITEMIZED asset list, and every asset is a
 * concrete, board-true feature the student can look at.
 *
 * This module computes that asset list (G0 — pure board-truth via chess.js +
 * describeStructure; the LLM only phrases it). The VERDICT word comes from the
 * engine eval (which encodes the future); the REASONS come from feature detectors:
 * bishop pair, an outpost, control of an open file, an enemy weak/target pawn, a
 * passed pawn, a development lead, a bad enemy bishop. A reason is emitted ONLY
 * when it is true — never invented, never padded (David 2026-07-19: "don't
 * overstate the why, I don't want non-applicable reasons stated").
 */
import { Chess, type Color } from 'chess.js';
import { describeStructure } from './boardStructure';

export interface PositionalAssessment {
  /** Student-perspective verdict word from the eval, or null when unclear. */
  verdict: 'clearly better' | 'a bit better' | 'balanced' | 'a bit worse' | 'in trouble' | null;
  /** Ordered, board-true asset clauses (student's perspective), most-telling
   *  first; empty when nothing concrete can be named. */
  reasons: string[];
}

interface Located { type: string; color: Color; square: string; }

function pieces(chess: Chess): Located[] {
  const out: Located[] = [];
  for (const row of chess.board()) for (const cell of row) if (cell) out.push({ type: cell.type, color: cell.color, square: cell.square });
  return out;
}

/** Minor pieces developed off the back rank + a castled/walked king (board-true). */
function developedCount(all: Located[], color: Color): number {
  const backRank = color === 'w' ? '1' : '8';
  let n = 0;
  for (const p of all) {
    if (p.color !== color) continue;
    if ((p.type === 'n' || p.type === 'b') && p.square[1] !== backRank) n += 1;
  }
  const king = all.find((p) => p.type === 'k' && p.color === color);
  if (king && king.square[0] !== 'e') n += 1;
  return n;
}

/**
 * The enumerated positional assessment for the STUDENT. `studentPovEvalCp` is the
 * eval in centipawns from the student's perspective (positive = student better);
 * pass null to omit the verdict word (reasons still computed).
 */
/**
 * THE ONE cp → verdict-word ladder for the whole app (David 2026-09-16, after
 * the third copy of it turned up in a live prod bundle). Two ladders existed
 * over the same bands with DIFFERENT words — at +120 one said "clearly better"
 * and the other "a bit better" — so a single review could contradict itself.
 * Deleting the duplicate is not enough: the fix is that there is exactly one
 * place the mapping lives, and every caller reads it from here.
 */
export function verdictBand(studentPovEvalCp: number | null): PositionalAssessment['verdict'] {
  if (studentPovEvalCp === null) return null;
  if (studentPovEvalCp >= 150) return 'clearly better';
  if (studentPovEvalCp >= 50) return 'a bit better';
  if (studentPovEvalCp > -50) return 'balanced';
  if (studentPovEvalCp > -150) return 'a bit worse';
  return 'in trouble';
}

export function assessPositionalEdge(
  fen: string,
  studentColorWB: Color,
  studentPovEvalCp: number | null,
): PositionalAssessment {
  const empty: PositionalAssessment = { verdict: null, reasons: [] };
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return empty; }
  const struct = describeStructure(fen);
  if (!struct) return empty;
  const all = pieces(chess);
  const me = studentColorWB;
  const enemy: Color = me === 'w' ? 'b' : 'w';

  // ── Verdict word from the eval (the future, encoded) ──
  const verdict: PositionalAssessment['verdict'] = verdictBand(studentPovEvalCp);

  const reasons: string[] = [];

  // 1. Bishop pair — two bishops vs one-or-none, on a reasonably open board.
  const myB = all.filter((p) => p.type === 'b' && p.color === me).length;
  const enemyB = all.filter((p) => p.type === 'b' && p.color === enemy).length;
  if (myB >= 2 && enemyB <= 1) reasons.push('you have the bishop pair');

  // 2. An outpost — a knight/bishop on a square no enemy pawn can chase.
  const myOutpost = struct.outposts.find((o) => o.color === me);
  if (myOutpost) {
    const name = myOutpost.piece === 'n' ? 'knight' : 'bishop';
    reasons.push(`your ${name} sits on a protected outpost on ${myOutpost.square} where no enemy pawn attacks the square`);
  }

  // 3. Control of an open file — a rook or queen on a fully open file the
  // enemy does NOT contest with a heavy piece of their own. "You own the
  // e-file" with an enemy rook staring back down it is a false claim — a
  // contested file is a fight, not an asset (board-awareness sweep,
  // 2026-07-22), so it is skipped rather than overclaimed.
  const myHeavyOnOpen = all.find((p) => (p.type === 'r' || p.type === 'q') && p.color === me
    && struct.pawns.openFiles.includes(p.square[0])
    && !all.some((q) => (q.type === 'r' || q.type === 'q') && q.color === enemy && q.square[0] === p.square[0]));
  if (myHeavyOnOpen) {
    reasons.push(`you own the open ${myHeavyOnOpen.square[0]}-file`);
  }

  // 4. An enemy weak pawn to target. DURABILITY HONESTY (board-awareness
  // sweep, David 2026-07-22): "lasting" is a claim about the FUTURE this
  // per-position read cannot verify — run 1 called mid-recapture d4/d7 pawns
  // "a lasting weakness" one ply before the recapture undoubled them. A
  // doubled pawn that is currently CAPTURABLE is a tactical object, not a
  // structural read — skip it; and speak present tense, never "lasting".
  const enemyIso = struct.pawns.isolatedPawns[enemy][0];
  const enemyDoubledFile = struct.pawns.doubledFiles[enemy][0];
  if (enemyIso) reasons.push(`their pawn on ${enemyIso} is isolated — a target you can pile on`);
  else if (enemyDoubledFile) {
    const doubledStable = !all.some((p) => p.type === 'p' && p.color === enemy
      && p.square[0] === enemyDoubledFile
      && chess.attackers(p.square as Parameters<typeof chess.attackers>[0], me).length
        > chess.attackers(p.square as Parameters<typeof chess.attackers>[0], enemy).length);
    if (doubledStable) reasons.push(`their doubled pawns on the ${enemyDoubledFile}-file are a structural weakness to work against`);
  }

  // 5. A passed pawn of your own.
  const myPassed = struct.pawns.passedPawns[me][0];
  if (myPassed) reasons.push(`your passed pawn on ${myPassed} is a long-term trump`);

  // 6. A development lead (only meaningful in the opening/early middlegame).
  const lead = developedCount(all, me) - developedCount(all, enemy);
  if (lead >= 2) reasons.push(`you're ${lead === 2 ? 'two pieces' : `${lead} pieces`} further developed`);

  return { verdict, reasons };
}
