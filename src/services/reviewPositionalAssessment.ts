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
import { andList } from '../utils/andList';
import { Chess, type Color } from 'chess.js';
import { describeStructure } from './boardStructure';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { developmentScore } from './development';

export interface PositionalAssessment {
  /** Student-perspective verdict word from the eval, or null when unclear. */
  verdict: 'clearly better' | 'a bit better' | 'balanced' | 'a bit worse' | 'in trouble' | null;
  /** Ordered, board-true asset clauses (student's perspective), most-telling
   *  first; empty when nothing concrete can be named. */
  reasons: string[];
  /** For each reason, the say-once key Learn's positional read files the SAME
   *  fact under (`positionalRead` keys), or null — so a balance sheet that
   *  names "their pawn on a3 is isolated" silences the read's own copy next
   *  move (Learn walk, fresh Nimzo game, 2026-09-26: said on three moves
   *  running through two lanes). Same order as `reasons`. */
  reasonKeys: Array<string | null>;
}

interface Located { type: string; color: Color; square: string; }

function pieces(chess: Chess): Located[] {
  const out: Located[] = [];
  for (const row of chess.board()) for (const cell of row) if (cell) out.push({ type: cell.type, color: cell.color, square: cell.square });
  return out;
}

/** Minors off their starting squares + a castled/walked king (the one reading). */
function developedCount(all: Located[], color: Color): number {
  return developmentScore(all, color);
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
  const empty: PositionalAssessment = { verdict: null, reasons: [], reasonKeys: [] };
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return empty; }
  const struct = describeStructure(fen);
  if (!struct) return empty;
  const all = pieces(chess);
  const me = studentColorWB;
  const enemy: Color = me === 'w' ? 'b' : 'w';

  // ── Verdict word from the eval (the future, encoded) ──
  const verdict: PositionalAssessment['verdict'] = verdictBand(studentPovEvalCp);

  // 🔒 THE REASONS EXPLAIN THE VERDICT, SO THEY COME FROM THE SIDE THE VERDICT
  // FAVOURS (WO-STANDARD-01 D-16, prod tape 2026-09-22). A student heard
  // "You're in trouble: you're two pieces further developed" — a negative
  // verdict followed by the student's own ASSETS, because the reason list was
  // always computed from the student's seat. An asset list cannot explain
  // "worse". When the eval says the OPPONENT stands better, the itemised
  // reasons are THEIR assets, phrased from the student's seat ("they have the
  // bishop pair"). Balanced / unknown keeps the student's own reading.
  const worse = verdict === 'a bit worse' || verdict === 'in trouble';
  const assets = worse
    ? assetsFor(chess, struct, all, enemy, me, 'theirs')
    : assetsFor(chess, struct, all, me, enemy, 'yours');

  return { verdict, reasons: assets.map((a) => a.text), reasonKeys: assets.map((a) => a.key) };
}

/**
 * The itemised, board-true asset list of `side`, phrased from the STUDENT's
 * seat: `who === 'yours'` when `side` is the student, `'theirs'` when it is the
 * opponent. One computer, two renderings — the mirror is a parameter, never a
 * second copy of the detectors.
 */
function assetsFor(
  chess: Chess,
  struct: NonNullable<ReturnType<typeof describeStructure>>,
  all: Located[],
  side: Color,
  other: Color,
  who: 'yours' | 'theirs',
): Array<{ text: string; key: string | null }> {
  const found: Array<{ text: string; key: string | null }> = [];
  const own = who === 'yours';
  // The seats as Learn's positional read names them: the side holding the
  // asset, and the side whose weakness it is.
  const holder = own ? 'student' : 'opponent';
  const loser = own ? 'opponent' : 'student';
  const reasons = { push: (text: string, key: string | null = null): void => { found.push({ text, key }); } };
  const you = own ? 'you' : 'they';
  const your = own ? 'your' : 'their';
  const their = own ? 'their' : 'your';
  const youre = own ? "you're" : "they're";

  // 0. MATERIAL — the first thing a strong player counts (WO-TEACH-02 S4:
  // "who's better and why" had no material in it at all). Only an edge the
  // side actually holds; a level count says nothing.
  const count = (c: Color): number => all.filter((p) => p.color === c).reduce((n, p) => n + (MATERIAL_VALUE[p.type] ?? 0), 0);
  const up = count(side) - count(other);
  if (up >= 1) reasons.push(`${youre} up ${up === 1 ? 'a pawn' : up === 3 ? 'a piece' : `${up} points of material`}`);

  // 0b. KING SAFETY — castled against a king still in the centre, with queens
  // on (without queens a central king is an endgame asset, not a target).
  const kingOf = (c: Color): string | undefined => all.find((p) => p.type === 'k' && p.color === c)?.square;
  const queensOn = all.some((p) => p.type === 'q');
  const castled = (sq: string | undefined, c: Color): boolean =>
    !!sq && sq[1] === (c === 'w' ? '1' : '8') && (sq[0] === 'g' || sq[0] === 'h' || sq[0] === 'b' || sq[0] === 'c');
  const central = (sq: string | undefined): boolean => !!sq && (sq[0] === 'd' || sq[0] === 'e');
  if (queensOn && castled(kingOf(side), side) && central(kingOf(other))) {
    reasons.push(`${your} king is tucked away and ${own ? 'theirs' : 'yours'} is still in the centre`, `${loser}-king-centre`);
  }

  // 1. Bishop pair — two bishops vs one-or-none, on a reasonably open board.
  const myB = all.filter((p) => p.type === 'b' && p.color === side).length;
  const enemyB = all.filter((p) => p.type === 'b' && p.color === other).length;
  if (myB >= 2 && enemyB <= 1) reasons.push(`${you} have the bishop pair`);

  // 2. An outpost — a knight/bishop on a square no enemy pawn can chase.
  const myOutpost = struct.outposts.find((o) => o.color === side);
  if (myOutpost) {
    const name = myOutpost.piece === 'n' ? 'knight' : 'bishop';
    reasons.push(own
      ? `your ${name} sits on a protected outpost on ${myOutpost.square} where no enemy pawn attacks the square`
      : `their ${name} sits on a protected outpost on ${myOutpost.square} where no pawn of yours attacks the square`, `${holder}-good-${myOutpost.square}`);
  }

  // 3. Control of an open file — a rook or queen on a fully open file the
  // enemy does NOT contest with a heavy piece of their own. "You own the
  // e-file" with an enemy rook staring back down it is a false claim — a
  // contested file is a fight, not an asset (board-awareness sweep,
  // 2026-07-22), so it is skipped rather than overclaimed.
  const myHeavyOnOpen = all.find((p) => (p.type === 'r' || p.type === 'q') && p.color === side
    && struct.pawns.openFiles.includes(p.square[0])
    && !all.some((q) => (q.type === 'r' || q.type === 'q') && q.color === other && q.square[0] === p.square[0]));
  if (myHeavyOnOpen) {
    reasons.push(`${you} own the open ${myHeavyOnOpen.square[0]}-file`, `${holder}-file-${myHeavyOnOpen.square[0]}`);
  }

  // 4. An enemy weak pawn to target. DURABILITY HONESTY (board-awareness
  // sweep, David 2026-07-22): "lasting" is a claim about the FUTURE this
  // per-position read cannot verify — run 1 called mid-recapture d4/d7 pawns
  // "a lasting weakness" one ply before the recapture undoubled them. A
  // doubled pawn that is currently CAPTURABLE is a tactical object, not a
  // structural read — skip it; and speak present tense, never "lasting".
  const enemyIso = struct.pawns.isolatedPawns[other][0];
  const enemyDoubledFile = struct.pawns.doubledFiles[other][0];
  if (enemyIso) reasons.push(`${their} pawn on ${enemyIso} is isolated — a target ${you} can pile on`, `${loser}-iso-${enemyIso}`);
  else if (enemyDoubledFile) {
    const doubledStable = !all.some((p) => p.type === 'p' && p.color === other
      && p.square[0] === enemyDoubledFile
      && chess.attackers(p.square as Parameters<typeof chess.attackers>[0], side).length
        > chess.attackers(p.square as Parameters<typeof chess.attackers>[0], other).length);
    if (doubledStable) reasons.push(`${their} doubled pawns on the ${enemyDoubledFile}-file are a structural weakness ${own ? 'to work against' : 'they can work against'}`, `${loser}-doubled-${enemyDoubledFile}`);
  }

  // 5. A passed pawn of your own.
  const myPassed = struct.pawns.passedPawns[side][0];
  if (myPassed) reasons.push(`${your} passed pawn on ${myPassed} is a long-term trump`, `${holder}-passer-${myPassed}`);

  // 6. A development lead (only meaningful in the opening/early middlegame).
  const lead = developedCount(all, side) - developedCount(all, other);
  if (lead >= 2) reasons.push(`${youre} ${lead === 2 ? 'two pieces' : `${lead} pieces`} further developed`);

  return found;
}

/**
 * WHO'S BETTER, AND WHY — spoken when the game changes phase (WO-TEACH-02 S4,
 * David 2026-09-24). The verdict word is the ONE band (`verdictBand`); the
 * reasons are the board's own asset list from the side the verdict favours.
 * Null when there is nothing to say: no eval, or a level position with no
 * asset on either side worth naming.
 */
export function phaseVerdictLine(
  fen: string,
  studentColorWB: Color,
  studentPovEvalCp: number | null,
  phase: 'middlegame' | 'endgame',
  /** Say-once keys already spoken this game. Required: a reason the student
   *  already heard ("their pawn on a3 is isolated") is not repeated here. */
  heard: ReadonlySet<string>,
): string | null {
  const a = freshAssessment(fen, studentColorWB, studentPovEvalCp, heard);
  // WHO'S BETTER *AND WHY*: a verdict with no reason is a description, not a
  // lesson (a prod review said "you were a bit worse" and nothing else).
  if (!a.verdict || a.reasons.length === 0) return null;
  const standing = a.verdict === 'balanced' ? "it's level" : `you're ${a.verdict}`;
  const why = a.reasons.length === 0 ? '' : ` — ${andList(a.reasons)}`;
  // Rotated on the board — the verdict and its reasons never vary.
  return rotateStem([
    `Taking stock as the ${phase} begins: ${standing}${why}.`,
    `The ${phase} starts here, so take stock: ${standing}${why}.`,
    `Before the ${phase} gets going, the balance sheet: ${standing}${why}.`,
  ], stemKeyOf(fen));
}

/** The say-once keys of the reasons `phaseVerdictLine` speaks for the same
 *  inputs — empty when it speaks nothing. One computation, two reads. */
export function phaseVerdictKeys(fen: string, studentColorWB: Color, studentPovEvalCp: number | null, heard: ReadonlySet<string>): string[] {
  const a = freshAssessment(fen, studentColorWB, studentPovEvalCp, heard);
  if (!a.verdict || a.reasons.length === 0) return [];
  return a.reasonKeys.filter((k): k is string => k !== null);
}

/** The assessment minus the reasons whose key was already heard. */
function freshAssessment(fen: string, studentColorWB: Color, studentPovEvalCp: number | null, heard: ReadonlySet<string>): PositionalAssessment {
  const a = assessPositionalEdge(fen, studentColorWB, studentPovEvalCp);
  const keep = a.reasonKeys.map((k) => k === null || !heard.has(k));
  return { verdict: a.verdict, reasons: a.reasons.filter((_, i) => keep[i]), reasonKeys: a.reasonKeys.filter((_, i) => keep[i]) };
}
