// verdictWithReasons — WHY THE ENGINE SAYS WHAT IT SAYS (WO-DANYA-READS-01 #2,
// 2026-11-18).
//
// Danya never leaves a verdict bare: "Black's king is stranded in the middle",
// "my pieces are beautifully coordinated, and White's own army is terribly
// passive", "Black is up two pawns, but White's compensation is not to be
// sneezed at". The board read had the engine's number and, for the reason, a
// count of material — so a level count read "material even, nothing decided"
// on boards the engine called clearly better, and Review's reason fell back to
// "your pieces are the more active" without ever counting a piece.
//
// This computer gathers every reason the board shows, for both sides — the
// material, the kings, whose pieces are in play (`pieceActivity`), who is
// making the threats (`initiativeRead`), passed pawns, the bishop pair, space,
// knight against bishop (`minorMatchup`), a weak pawn under fire and a "weak"
// pawn that is in fact well guarded — and picks the one or two that explain
// the engine's verdict. A reason is said only for the side the verdict
// favours; on a level board only the initiative, a material deficit's
// counterweight, or a plus for each side. No reason the board shows → no
// reason said: the number alone is not a why (G0).
//
// PURE: the board, chess.js, the board readers and the engine's numbers handed
// in. Dual use: the same reasons explain a position the student asks about and
// a standing a move changed (Review's briefing, the lesson's thought).
import { Chess, type Color, type Square } from 'chess.js';
import { activityEdge, activityEdgeLine, type ActivityEdge } from './pieceActivity';
import { initiativeRead, initiativeLine, type Initiative, type InitiativeLine } from './initiativeRead';
import { settledBalance, quietBalance, type LastMove } from './material';
import { kingCover, countKingAttack } from './kingSafety';
import {
  bishopPair, computeTerritory, findBlockades, findPassedPawns, findWeakPawns, pressureCount,
} from './positionReadingService';
import { lockedPawnPairs } from './boardStructure';
import { minorMatchupOn } from './minorMatchup';
import { boardEdgeWords } from '../utils/countWords';
import { andList } from '../utils/andList';
import { stemKeyOf } from '../utils/rotateStem';

export type ReasonKind =
  | 'material' | 'king-shelter' | 'king-centre' | 'king-attack' | 'activity' | 'initiative'
  | 'passer' | 'bishop-pair' | 'space' | 'minor' | 'weak-pawn' | 'guarded-pawn';

export interface VerdictReason {
  kind: ReasonKind;
  /** The side this reason favours. */
  side: Color;
  /** How much it explains, roughly centipawns — the order reasons are picked in. */
  weight: number;
  /** As a clause after a verdict ("you're up a piece", "their rook on a8
   *  hasn't moved"), from the student's seat, no full stop. */
  clause: string;
  /** As its own sentence, from the student's seat. */
  sentence: string;
  squares: Square[];
}

export interface VerdictWithReasons {
  /** The side the engine's verdict favours, or null for level. */
  favoured: Color | null;
  /** The reasons said, best first: one or two. */
  reasons: VerdictReason[];
  /** The reasons as sentences, from the student's seat. */
  text: string;
  squares: Square[];
}

/** The engine's margin that makes a side better (the one ladder, `evalBand`:
 *  under half a pawn is level). */
const LEVEL_CP = 50;

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const count = (n: number): string => NUM[n] ?? String(n);

/** The material lead on the board, White's view, settled: the board's count
 *  with the last capture's exchange played out — said only when the count once
 *  the side to move cashes its best capture leaves the same side ahead (the
 *  rule `compensation` reads, so the two never disagree). The count said is
 *  the board's own, so its words name the pieces (`boardEdgeWords`); the
 *  weight is the smaller of the two. */
function materialLead(fen: string, lastMove: LastMove | null): { lead: number; weight: number } {
  const settled = settledBalance(fen, lastMove);
  const quiet = quietBalance(fen);
  if (Math.sign(settled) !== Math.sign(quiet)) return { lead: 0, weight: 0 };
  return { lead: Math.round(settled), weight: Math.min(Math.abs(settled), Math.abs(quiet)) };
}

function hasQueen(board: Chess, c: Color): boolean {
  return board.findPiece({ type: 'q', color: c }).length > 0;
}

const OWN = (c: Color, student: Color): 'your' | 'their' => (c === student ? 'your' : 'their');
const WHO = (c: Color, student: Color): 'you' | 'they' => (c === student ? 'you' : 'they');

/** Every reason the board shows, both sides. `lines`: the engine's lines from
 *  `fen` (best first), for the initiative; null where there are none. */
export function boardReasons(fen: string, student: Color, lines: readonly InitiativeLine[] | null, lastMove: LastMove | null): VerdictReason[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  const out: VerdictReason[] = [];

  // ── MATERIAL ──
  const mat = materialLead(fen, lastMove);
  if (mat.lead !== 0 && mat.weight >= 1) {
    const up: Color = mat.lead > 0 ? 'w' : 'b';
    const words = boardEdgeWords(fen, up, Math.abs(mat.lead));
    // From the student's seat: "you're up a pawn" / "you're down a piece" — a
    // mix of pieces is named from the side that has more ("they're up
    // material: a rook for a knight"), which reads one way only.
    const clause = up === student ? `you're up ${words}` : words.startsWith('material:') ? `they're up ${words}` : `you're down ${words}`;
    out.push({ kind: 'material', side: up, weight: mat.weight * 100, clause, sentence: `${cap(clause)}.`, squares: [] });
  }
  // The kings are a middlegame's reasons: with few pieces left a king in the
  // middle is where it belongs (the endgame's own rule).
  const officers = board.board().flat().filter((p) => p && p.type !== 'p' && p.type !== 'k').length;
  const middlegame = officers >= 6;

  for (const x of ['w', 'b'] as const) {
    const y = other(x);
    const own = OWN(x, student); const foe = OWN(y, student);

    // ── THE KINGS ── (read only while x keeps a queen to go after one)
    if (middlegame && hasQueen(board, x)) {
      const cy = kingCover(board, y); const cx = kingCover(board, x);
      // A king at home (its first two ranks) that has lost the pawns in
      // front of it, against a covered one.
      const backRanks = (sq: string, c: Color): boolean => (c === 'w' ? Number(sq[1]) <= 2 : Number(sq[1]) >= 7);
      if (cy && cx && backRanks(cy.kingSquare, y) && cx.present - cy.present >= 2) {
        const clause = `${foe} king has lost its pawn cover`;
        const left = cy.present === 0 ? 'no pawn left in front of it' : `a pawn in front of it on only ${count(cy.present)} of ${count(cy.of)} files`;
        out.push({ kind: 'king-shelter', side: x, weight: 140, clause,
          sentence: `${cap(foe)} king on ${cy.kingSquare} has ${left}, while ${own === 'your' ? 'yours' : 'theirs'} is covered.`,
          squares: [cy.kingSquare as Square] });
      }
      const ky = cy?.kingSquare;
      const homeRank = y === 'w' ? '1' : '8';
      if (ky && 'de'.includes(ky[0]) && (ky[1] === homeRank || ky[1] === (y === 'w' ? '2' : '7')) && cx?.castled && hasQueen(board, y)) {
        const rights = board.getCastlingRights(y);
        const canCastle = rights.k || rights.q;
        const clause = `${foe} king is still in the middle`;
        out.push({ kind: 'king-centre', side: x, weight: canCastle ? 90 : 130, clause,
          sentence: `${cap(foe)} king on ${ky} is still in the middle${canCastle ? '' : ', and it can no longer castle'}.`, squares: [ky as Square] });
      }
      const attack = countKingAttack(board, x);
      // Pieces, not pawns: a pawn beside the king is its cover or its lever.
      const piecesOf = (set: Set<string>): Square[] => ([...set] as Square[]).filter((sq) => board.get(sq)?.type !== 'p');
      const atk = attack ? piecesOf(attack.attackers) : [];
      const def = attack ? piecesOf(attack.defenders) : [];
      if (attack && atk.length >= 3 && atk.length > def.length) {
        const a = atk.length; const d = def.length;
        const clause = `${count(a)} of ${own} pieces bear on ${foe} king against ${count(d)} defender${d === 1 ? '' : 's'}`;
        out.push({ kind: 'king-attack', side: x, weight: 100 + 30 * (a - d), clause,
          sentence: `${cap(clause)}.`, squares: [attack.king as Square, ...atk] });
      }
    }

    // ── PASSED PAWNS ── (the furthest one that is running: not blockaded)
    const blocked = new Set(findBlockades(fen, y).map((b) => b.pawn));
    const passers = findPassedPawns(fen, x).filter((sq) => !blocked.has(sq));
    let best: { sq: Square; rel: number } | null = null;
    for (const sq of passers) {
      const rel = x === 'w' ? Number(sq[1]) : 9 - Number(sq[1]);
      if (rel >= 5 && (!best || rel > best.rel)) best = { sq, rel };
    }
    if (best) {
      const toGo = 8 - best.rel;
      const guarded = board.attackers(best.sq, x).some((a) => board.get(a)?.type === 'p');
      const clause = `${own} passed pawn on ${best.sq} is ${toGo === 1 ? 'one step' : `${count(toGo)} steps`} from queening`;
      out.push({ kind: 'passer', side: x, weight: (best.rel === 7 ? 180 : best.rel === 6 ? 110 : 60) + (guarded ? 30 : 0), clause,
        sentence: `${cap(clause)}${guarded ? ', and a pawn guards it' : ''}.`, squares: [best.sq] });
    }

    // ── THE BISHOP PAIR ── (on a board that is not locked shut)
    if (bishopPair(fen, x) && lockedPawnPairs(board).length < 2) {
      const clause = `${WHO(x, student)} have the bishop pair`;
      out.push({ kind: 'bishop-pair', side: x, weight: 45, clause, sentence: `${cap(clause)}, on a board with room for both.`, squares: board.findPiece({ type: 'b', color: x }) });
    }

    // ── A WEAK PAWN UNDER FIRE ── (the legal exchange wins it)
    const weak = findWeakPawns(fen, y);
    const kinds: Array<[Square, string]> = [
      ...weak.isolated.map((s): [Square, string] => [s, 'isolated']),
      ...weak.backward.map((s): [Square, string] => [s, 'backward']),
    ];
    for (const [sq, kind] of kinds) {
      const pc = pressureCount(fen, sq);
      if (!pc || pc.attackers === 0) continue;
      if (pc.verdict === 'winnable' && pc.attackers > pc.defenders) {
        const clause = pc.defenders === 0
          ? `${foe} ${kind} pawn on ${sq} is attacked ${times(pc.attackers)} and nothing guards it`
          : `${foe} ${kind} pawn on ${sq} is attacked ${times(pc.attackers)} and guarded only ${times(pc.defenders)}`;
        out.push({ kind: 'weak-pawn', side: x, weight: 80, clause, sentence: `${cap(clause)}.`, squares: [sq, ...pc.attackerSquares] });
        break;
      }
    }
    // ── A "WEAK" PAWN THAT HOLDS ── (x's own, in the centre, under real
    // pressure — two attackers or more — and guarded at least as often: it
    // looks weak and costs nothing)
    const mine = findWeakPawns(fen, x);
    for (const sq of [...mine.isolated, ...mine.backward]) {
      if (!'cdef'.includes(sq[0])) continue;
      const pc = pressureCount(fen, sq);
      if (!pc || pc.attackers < 2 || pc.verdict === 'winnable' || pc.defenders < pc.attackers) continue;
      const kind = mine.isolated.includes(sq) ? 'isolated' : 'backward';
      const clause = `${own} ${kind} pawn on ${sq} is well guarded: attacked ${times(pc.attackers)}, guarded ${times(pc.defenders)}`;
      out.push({ kind: 'guarded-pawn', side: x, weight: 25, clause, sentence: `${cap(own)} ${kind} pawn on ${sq} looks weak, but it holds: it is attacked ${times(pc.attackers)} and guarded ${times(pc.defenders)}.`, squares: [sq] });
      break;
    }
  }

  // ── SPACE ── (territory behind the centre pawns, the engine's own term)
  const t = computeTerritory(fen);
  if (Math.abs(t.white - t.black) >= 4 && board.board().flat().filter((p) => p && p.type !== 'p' && p.type !== 'k').length >= 6) {
    const x: Color = t.white > t.black ? 'w' : 'b';
    const pawns = board.findPiece({ type: 'p', color: x })
      .filter((sq) => 'cdef'.includes(sq[0]) && (x === 'w' ? Number(sq[1]) >= 4 : Number(sq[1]) <= 5))
      .sort();
    if (pawns.length > 0) {
      const own = OWN(x, student);
      const clause = `${own} pawn${pawns.length === 1 ? '' : 's'} on ${andList(pawns)} give${pawns.length === 1 ? 's' : ''} ${WHO(x, student) === 'you' ? 'you' : 'them'} more space`;
      out.push({ kind: 'space', side: x, weight: 40, clause, sentence: `${cap(clause)}.`, squares: pawns });
    }
  }

  // ── KNIGHT AGAINST BISHOP ──
  const mm = (() => { try { return minorMatchupOn(fen); } catch { return null; } })();
  if (mm) {
    const x = mm.better === 'knight' ? mm.knight.color : mm.bishop.color;
    const own = OWN(x, student);
    const clause = mm.better === 'knight'
      ? `${own} knight on ${mm.knight.square} is better than ${OWN(mm.bishop.color, student)} ${mm.badBishop ? 'bad ' : ''}bishop on ${mm.bishop.square}`
      : `${own} bishop on ${mm.bishop.square} is better than ${OWN(mm.knight.color, student)} knight on an open board`;
    out.push({ kind: 'minor', side: x, weight: 70, clause, sentence: `${cap(clause)}.`, squares: [mm.knight.square, mm.bishop.square] });
  }

  // ── WHOSE PIECES ARE IN PLAY ──
  const act: ActivityEdge | null = activityEdge(fen);
  if (act) {
    const sentence = activityLine(act, student);
    out.push({ kind: 'activity', side: act.side, weight: 80 + 25 * act.idle.length, clause: sentence.clause, sentence: sentence.text, squares: act.squares });
  }

  // ── WHO IS MAKING THE THREATS ──
  const ini: Initiative | null = lines ? initiativeRead(fen, lines) : null;
  if (ini) {
    out.push({ kind: 'initiative', side: ini.side, weight: 130, clause: `${WHO(ini.side, student)} have the initiative`,
      sentence: initiativeLine(ini, student, stemKeyOf(fen)), squares: ini.squares });
  }
  return out;
}

function times(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${count(n)} times`;
}

/** The activity edge as a clause and a sentence (`pieceActivity`'s own words). */
function activityLine(e: ActivityEdge, student: Color): { clause: string; text: string } {
  const text = activityEdgeLine(e, student);
  const first = text.split('. ')[0].replace(/\.$/, '');
  return { clause: first.charAt(0).toLowerCase() + first.slice(1), text };
}

/**
 * The reasons that explain the engine's verdict on `fen`, from the student's
 * seat. `evalCp`: the engine's evaluation, WHITE's view, REQUIRED — the
 * reasons are chosen for it and never against it. Null when the board shows no
 * reason that fits (silence over a slogan).
 *
 *  - A side better (half a pawn or more): that side's reasons only, the
 *    weightiest first; a second one when it carries at least half the first's
 *    weight. A "weak" pawn that holds is said only beside a real reason.
 *  - Level: the initiative when one side has it; the counterweight when a side
 *    is down material and still level (what pays for it); a plus for each side
 *    when both have one. Anything else on a level board is not a reason.
 */
export function verdictWithReasons(input: {
  fen: string;
  evalCp: number;
  /** Mate on the board (White's view, + White mates): reasons are not read
   *  for a forced mate — the mate is the verdict. Null otherwise. */
  mate: number | null;
  /** The engine's lines from `fen`, best first; null where there are none. */
  lines: readonly InitiativeLine[] | null;
  student: Color;
  /** The move that produced the board (settles a capture in flight), or null. */
  lastMove: LastMove | null;
  /** REQUIRED — the kinds the surface already says beside the verdict (the
   *  position read says the material count itself): never picked again. They
   *  still count when a level verdict asks what pays for a deficit. */
  said: ReadonlySet<ReasonKind>;
}): VerdictWithReasons | null {
  if (input.mate != null) return null;
  let inCheck = false;
  try { inCheck = new Chess(input.fen).inCheck(); } catch { return null; }
  const all = boardReasons(input.fen, input.student, inCheck ? null : input.lines, input.lastMove);
  if (all.length === 0) return null;
  const favoured: Color | null = input.evalCp >= LEVEL_CP ? 'w' : input.evalCp <= -LEVEL_CP ? 'b' : null;
  const sayable = all.filter((r) => !input.said.has(r.kind));
  const byWeight = (a: VerdictReason, b: VerdictReason): number => b.weight - a.weight;
  let picked: VerdictReason[] = [];
  if (favoured) {
    const fit = sayable.filter((r) => r.side === favoured).sort(byWeight);
    const main = fit.filter((r) => r.kind !== 'guarded-pawn');
    if (main.length === 0) return null;
    picked = [main[0]];
    const second = fit.find((r) => r !== main[0] && (r.kind === 'guarded-pawn' || r.weight * 2 >= main[0].weight));
    if (second) picked.push(second);
  } else {
    const material = all.find((r) => r.kind === 'material');
    const ini = sayable.find((r) => r.kind === 'initiative');
    if (material) {
      // Down material and still level: what pays for it.
      const down = other(material.side);
      const pays = sayable.filter((r) => r.side === down && r.kind !== 'material' && r.kind !== 'guarded-pawn').sort(byWeight);
      if (pays.length) picked = [pays[0]];
    } else if (ini) {
      picked = [ini];
    } else {
      const plus = (c: Color): VerdictReason | undefined => sayable.filter((r) => r.side === c && r.kind !== 'guarded-pawn').sort(byWeight)[0];
      const a = plus(input.student); const b = plus(other(input.student));
      if (a && b) picked = [a, b];
    }
  }
  if (picked.length === 0) return null;
  const squares = [...new Set(picked.flatMap((r) => r.squares))];
  return { favoured, reasons: picked, text: picked.map((r) => r.sentence).join(' '), squares };
}

/** The reasons as clauses after a verdict ("— you're a piece up, their king is
 *  still in the middle"), for a surface that says the verdict in one line. */
export function reasonClauses(v: VerdictWithReasons): string[] {
  return v.reasons.map((r) => r.clause);
}
