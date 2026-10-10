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
import { evalBand, evalBandWords } from './evalBand';
import { settledLeadFor, type LastMove } from './material';
import { andList } from '../utils/andList';
import { goodPieceIdeaKey } from './positionReadingService';
import { Chess, type Color } from 'chess.js';
import { describeStructure } from './boardStructure';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { isMinorAtHome, developmentScore } from './development';
import { netPieceWords } from './exchangeLedger';

export interface PositionalAssessment {
  /** Student-perspective verdict word from the eval, or null when unclear. */
  verdict: 'winning' | 'clearly better' | 'slightly better' | 'balanced' | 'slightly worse' | 'clearly worse' | 'losing' | null;
  /** Ordered, board-true asset clauses (student's perspective), most-telling
   *  first; empty when nothing concrete can be named. */
  reasons: string[];
  /** For each reason, the say-once key Learn's positional read files the SAME
   *  fact under (`positionalRead` keys), or null — so a balance sheet that
   *  names "their pawn on a3 is isolated" silences the read's own copy next
   *  move (Learn walk, fresh Nimzo game, 2026-09-26: said on three moves
   *  running through two lanes). Same order as `reasons`. */
  reasonKeys: Array<string | null>;
  /** THE OTHER SIDE OF THE SCALE (overall verdict as ONE comparison, census
   *  P3): the assets of the side the verdict does NOT favour, phrased from the
   *  student's seat, with their say-once keys. Absent on older callers. */
  counter?: string[];
  counterKeys?: Array<string | null>;
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
  // The band is the one ladder's (evalBand, census 2026-10-10); this keeps
  // the review's own word for level ("balanced").
  const band = evalBand(studentPovEvalCp);
  if (band === 'level') return 'balanced';
  return evalBandWords(band, studentPovEvalCp > 0 ? 'better' : 'worse') as NonNullable<PositionalAssessment['verdict']>;
}

export function assessPositionalEdge(
  fen: string,
  studentColorWB: Color,
  studentPovEvalCp: number | null,
  /** The move that produced `fen`, when known — the material reason is read
   *  SETTLED, so a recapture still to come is not an edge (WO-MATERIAL-01). */
  lastMove?: LastMove | null,
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
  const worse = verdict === 'slightly worse' || verdict === 'clearly worse' || verdict === 'losing';
  const lm = lastMove ?? null;
  const assets = worse
    ? assetsFor(chess, struct, all, enemy, me, 'theirs', lm)
    : assetsFor(chess, struct, all, me, enemy, 'yours', lm);
  const counter = worse
    ? assetsFor(chess, struct, all, me, enemy, 'yours', lm)
    : assetsFor(chess, struct, all, enemy, me, 'theirs', lm);

  return {
    verdict, reasons: assets.map((a) => a.text), reasonKeys: assets.map((a) => a.key),
    counter: counter.map((a) => a.text), counterKeys: counter.map((a) => a.key),
  };
}

const COUNT_WORD = ['', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** The material edge in pieces: "a pawn", "a bishop for two pawns", "a rook
 *  for a knight and a pawn". Pure count by type — the side's extras, then what
 *  the other side holds in return. */
export function materialEdgeWords(all: ReadonlyArray<{ type: string; color: Color }>, side: Color, other: Color): string {
  // One namer for "what is extra" (exchangeLedger.netPieceWords): the
  // pieces each side has more of, like for like cancelled.
  const surplus = (from: Color, to: Color): string[] => ['q', 'r', 'b', 'n', 'p'].flatMap((t) => {
    const d = all.filter((p) => p.color === from && p.type === t).length - all.filter((p) => p.color === to && p.type === t).length;
    return d > 0 ? Array<string>(d).fill(t) : [];
  });
  const mine = surplus(side, other);
  const theirs = surplus(other, side);
  // A lone extra minor is "a piece" — the idiom every strong player uses.
  if (theirs.length === 0 && mine.length === 1 && (mine[0] === 'b' || mine[0] === 'n')) return 'a piece';
  return netPieceWords(mine, theirs) ?? 'material';
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
  lastMove: LastMove | null,
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
  const raw = count(side) - count(other);
  // SETTLED (WO-MATERIAL-01): the exchange the last capture started is played
  // out, so a recapture still to come is not an edge.
  const up = settledLeadFor(chess.fen(), side, lastMove);
  // SAID AS WHAT IS ON THE BOARD, not as a point total (Bowdler walk
  // 2026-09-27, 9.Qxe7+ Bxe7: "you're up a pawn" with a bishop against two
  // pawns). The count decides whether there is an edge; the pieces say what it
  // is — and mid-exchange, where the pieces on the board are not the ones that
  // will be left, the points and where the trade lands.
  if (up >= 1) {
    reasons.push(up === raw
      ? `${youre} up ${materialEdgeWords(all, side, other)}`
      : `${youre} up ${up === 1 ? 'a pawn' : `${up} points`} once the trade on ${lastMove?.to ?? 'the board'} is done`);
  }

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
  // Keyed like the move point that wins it (`student-bishop-pair`) — one claim.
  if (myB >= 2 && enemyB <= 1) reasons.push(`${you} have the bishop pair`, `${holder}-bishop-pair`);

  // 2. An outpost — a knight/bishop on a square no enemy pawn can chase.
  const myOutpost = struct.outposts.find((o) => o.color === side);
  if (myOutpost) {
    const name = myOutpost.piece === 'n' ? 'knight' : 'bishop';
    reasons.push(own
      ? `your ${name} sits on a protected outpost on ${myOutpost.square} where no enemy pawn attacks the square`
      : `their ${name} sits on a protected outpost on ${myOutpost.square} where no pawn of yours attacks the square`, goodPieceIdeaKey(holder, myOutpost.piece, 'outpost', myOutpost.square));
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
    reasons.push(`${you} own the open ${myHeavyOnOpen.square[0]}-file`, `file-${myHeavyOnOpen.square[0]}`);
  }

  // 4. An enemy weak pawn to target. DURABILITY HONESTY (board-awareness
  // sweep, David 2026-07-22): "lasting" is a claim about the FUTURE this
  // per-position read cannot verify — run 1 called mid-recapture d4/d7 pawns
  // "a lasting weakness" one ply before the recapture undoubled them. A
  // doubled pawn that is currently CAPTURABLE is a tactical object, not a
  // structural read — skip it; and speak present tense, never "lasting".
  const enemyIso = struct.pawns.isolatedPawns[other][0];
  const enemyDoubledFile = struct.pawns.doubledFiles[other][0];
  if (enemyIso) reasons.push(`${their} pawn on ${enemyIso} is isolated — a target ${you} can pile on`, `${loser}-iso-${enemyIso[0]}`);
  else if (enemyDoubledFile) {
    const doubledStable = !all.some((p) => p.type === 'p' && p.color === other
      && p.square[0] === enemyDoubledFile
      && chess.attackers(p.square as Parameters<typeof chess.attackers>[0], side).length
        > chess.attackers(p.square as Parameters<typeof chess.attackers>[0], other).length);
    if (doubledStable) reasons.push(`${their} doubled pawns on the ${enemyDoubledFile}-file are a structural weakness ${own ? 'to work against' : 'they can work against'}`, `${loser}-doubled-${enemyDoubledFile}`);
  }

  // 5. A passed pawn of your own.
  const myPassed = struct.pawns.passedPawns[side][0];
  if (myPassed) reasons.push(`${your} passed pawn on ${myPassed} is a long-term trump`, `${holder}-passer-${myPassed[0]}`);

  // 6. A development lead (only meaningful in the opening/early middlegame).
  // The score counts a CASTLED king as a step of development, so the lead is
  // not always pieces (walk oct2a F7: "two pieces further developed" with two
  // bishops out and castled against one knight). Say what was counted.
  const lead = developedCount(all, side) - developedCount(all, other);
  if (lead >= 2) {
    const out = (c: Color): number => all.filter((p) => p.color === c && (p.type === 'n' || p.type === 'b') && !isMinorAtHome(p.type, c, p.square)).length;
    const castled = (c: Color): boolean => all.some((p) => p.color === c && p.type === 'k' && p.square[0] !== 'e');
    const pieceLead = out(side) - out(other);
    if (pieceLead === lead) {
      reasons.push(`${youre} ${lead === 2 ? 'two pieces' : `${lead} pieces`} further developed`);
    } else {
      const word = (n: number): string => n === 0 ? 'no pieces' : n === 1 ? 'one piece' : `${COUNT_WORD[n] ?? n} pieces`;
      const sideStr = (c: Color): string => `${word(out(c))} out${castled(c) ? ' and castled' : ''}`;
      reasons.push(`${youre} ahead in development: ${sideStr(side)}, against ${sideStr(other)}`);
    }
  }

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
  /** The move that produced `fen`, when known (settled material). */
  lastMove?: LastMove | null,
): string | null {
  const a = freshAssessment(fen, studentColorWB, studentPovEvalCp, heard, lastMove ?? null);
  // WHO'S BETTER *AND WHY*: a verdict with no reason is a description, not a
  // lesson (a prod review said "you were a bit worse" and nothing else).
  if (!a.verdict || a.reasons.length === 0) return null;
  const standing = a.verdict === 'balanced' ? "it's level" : `you're ${a.verdict}`;
  const why = a.reasons.length === 0 ? '' : ` — ${andList(a.reasons)}`;
  // ONE COMPARISON, not a list: the other side of the scale, and what it
  // weighs. Level → the two sides' trumps hold each other; slightly → theirs
  // keeps it close; clearly or decisive → it is not enough.
  const counter = a.counter ?? [];
  const inReturn = (() => {
    if (counter.length === 0) return '';
    const worse = a.verdict === 'slightly worse' || a.verdict === 'clearly worse' || a.verdict === 'losing';
    if (a.verdict === 'balanced') return `; on the other side, ${andList(counter)} — and the two hold each other`;
    const weight = a.verdict !== 'slightly better' && a.verdict !== 'slightly worse' ? "and it isn't enough" : 'and it keeps it close';
    return `; what ${worse ? 'you have' : 'they have'} in return: ${andList(counter)}, ${weight}`;
  })();
  // Rotated on the board — the verdict and its reasons never vary.
  return rotateStem([
    `Taking stock as the ${phase} begins: ${standing}${why}${inReturn}.`,
    `The ${phase} starts here, so take stock: ${standing}${why}${inReturn}.`,
    `Before the ${phase} gets going, the balance sheet: ${standing}${why}${inReturn}.`,
  ], stemKeyOf(fen));
}

/** The say-once keys of the reasons `phaseVerdictLine` speaks for the same
 *  inputs — empty when it speaks nothing. One computation, two reads. */
export function phaseVerdictKeys(fen: string, studentColorWB: Color, studentPovEvalCp: number | null, heard: ReadonlySet<string>, lastMove?: LastMove | null): string[] {
  const a = freshAssessment(fen, studentColorWB, studentPovEvalCp, heard, lastMove ?? null);
  if (!a.verdict || a.reasons.length === 0) return [];
  return [...a.reasonKeys, ...(a.counterKeys ?? [])].filter((k): k is string => k !== null);
}

/** The assessment minus the reasons whose key was already heard. */
function freshAssessment(fen: string, studentColorWB: Color, studentPovEvalCp: number | null, heard: ReadonlySet<string>, lastMove: LastMove | null): PositionalAssessment {
  const a = assessPositionalEdge(fen, studentColorWB, studentPovEvalCp, lastMove);
  const keep = a.reasonKeys.map((k) => k === null || !heard.has(k));
  const keepC = (a.counterKeys ?? []).map((k) => k === null || !heard.has(k));
  return {
    verdict: a.verdict, reasons: a.reasons.filter((_, i) => keep[i]), reasonKeys: a.reasonKeys.filter((_, i) => keep[i]),
    counter: (a.counter ?? []).filter((_, i) => keepC[i]), counterKeys: (a.counterKeys ?? []).filter((_, i) => keepC[i]),
  };
}
