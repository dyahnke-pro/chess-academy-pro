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
import { activityEdge, activityEdgeLine, activityEdgeClause, type ActivityEdge } from './pieceActivity';
import { openSentence } from '../utils/openSentence';
import { initiativeRead, initiativeLine, type Initiative, type InitiativeLine } from './initiativeRead';
import { settledBalance, quietBalance, type LastMove } from './material';
import { kingCover, countKingAttack } from './kingSafety';
import {
  bishopPair, ownsMoreSpace, findBlockades, findPassedPawns, findWeakPawns, pressureCount,
} from './positionReadingService';
import { lockedPawnPairs } from './boardStructure';
import { minorMatchupOn } from './minorMatchup';
import { boardEdgeWords } from '../utils/countWords';
import { andList } from '../utils/andList';
import { stemKeyOf } from '../utils/rotateStem';
import { evalBand } from './evalBand';
import { trappedAt, lineTakesPiece } from './trappedPiece';
import { MATERIAL_VALUE } from './pieceValues';

export type ReasonKind =
  | 'material' | 'king-shelter' | 'king-centre' | 'king-attack' | 'activity' | 'initiative'
  | 'passer' | 'bishop-pair' | 'space' | 'minor' | 'weak-pawn' | 'guarded-pawn'
  | 'tempo' | 'clamp' | 'trapped' | 'mating-net' | 'unstoppable' | 'even';

/** A SOFT reason is a quiet plus the engine weighs in tenths of a pawn; a
 *  concrete one (material, a passer, the kings, a pawn falling, the
 *  initiative) can carry an edge of any size. */
const SOFT_REASON: Record<ReasonKind, boolean> = {
  material: false, 'king-shelter': false, 'king-centre': false, 'king-attack': false, initiative: false,
  passer: false, 'weak-pawn': false,
  activity: true, 'bishop-pair': true, space: true, minor: true, 'guarded-pawn': true,
  trapped: false, 'mating-net': false, unstoppable: false,
  tempo: true, clamp: true, even: true,
};

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
  /** THE LINE THAT PROVES IT (uci, from the board the reason is read on):
   *  the engine's own moves where they carry the reason out — the trapped
   *  piece taken, the passer queening, the queen hit — drawn move by move.
   *  Absent when the evidence is the squares and the count alone. */
  line?: string[];
}

export interface VerdictWithReasons {
  /** The side the engine's verdict favours, or null for level. */
  favoured: Color | null;
  /** The reasons said, best first: one or two. */
  reasons: VerdictReason[];
  /** The reasons as sentences, from the student's seat. */
  text: string;
  squares: Square[];
  /** The proving lines' moves as arrows (from, to), in order. */
  arrows: Array<[Square, Square]>;
  /** The proving lines in SAN from the board read (`SpokenLine`'s shape), so
   *  a surface plays them out move by move with its arrows. */
  proofLines: Array<{ fen: string; sans: string[] }>;
}


const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const cap = openSentence;
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
      // A king still in the middle is the next read's: the d- and e-pawns it
      // stands behind are the ones an opening pushes (1.e4 c6 2.d4 is no king
      // "without its pawn cover").
      if (cy && cx && backRanks(cy.kingSquare, y) && !'de'.includes(cy.kingSquare[0]) && cx.present - cy.present >= 2) {
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
  // THE ONE RULE for "more space" (`ownsMoreSpace`): this read kept its own
  // margin of four squares while the chat, the questions and the
  // deliberation said "more space" at two, so a board the coach calls
  // White's space never gave it as the reason White stands better (Danya,
  // knights on the rim #2: "White has a massive space advantage", a
  // territory of 6 to 3, and the verdict said "slightly better" bare).
  const spaceSide: Color | null = ownsMoreSpace(fen, 'w') ? 'w' : ownsMoreSpace(fen, 'b') ? 'b' : null;
  if (spaceSide && board.board().flat().filter((p) => p && p.type !== 'p' && p.type !== 'k').length >= 6) {
    const x: Color = spaceSide;
    const pawns = board.findPiece({ type: 'p', color: x })
      .filter((sq) => 'cdef'.includes(sq[0]) && (x === 'w' ? Number(sq[1]) >= 4 : Number(sq[1]) <= 5))
      .sort();
    if (pawns.length > 0) {
      const own = OWN(x, student);
      const them = WHO(x, student) === 'you' ? 'you' : 'them';
      // A square or two is named; more are "your centre pawns", the board
      // lights which.
      const clause = pawns.length === 1
        ? `${own} pawn on ${pawns[0]} gives ${them} more space`
        : pawns.length === 2 ? `${own} pawns on ${andList(pawns)} give ${them} more space` : `${own} centre pawns give ${them} more space`;
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
      // What the matchup computer read, never "an open board" (Danya
      // narration test 2026-11-19, Magnus Carlsen's best endgame wins #2:
      // centre pawns on d5 and e5, said to be "an open board").
      : `${own} bishop on ${mm.bishop.square} is better than ${OWN(mm.knight.color, student)} knight, with pawns on both wings and none locked`;
    out.push({ kind: 'minor', side: x, weight: 70, clause, sentence: `${cap(clause)}.`, squares: [mm.knight.square, mm.bishop.square] });
  }

  // ── WHOSE PIECES ARE IN PLAY ──
  const act: ActivityEdge | null = activityEdge(fen);
  if (act) {
    const sentence = activityLine(act, student);
    out.push({ kind: 'activity', side: act.side, weight: 80 + 25 * act.idle.length, clause: sentence.clause, sentence: sentence.text, squares: act.squares });
  }

  // ── WHO IS MAKING THE THREATS ──
  // Not in a bare ending (Danya narration test 2026-11-19, the two rook
  // endings you must know #0: "Roughly balanced — they have the initiative",
  // a rook checking a king in a drawn rook-and-pawn ending): with two pieces
  // or fewer besides the kings and pawns, a check is the defender's
  // technique, never a lead in the play.
  const ini: Initiative | null = lines && officers >= 3 ? initiativeRead(fen, lines) : null;
  if (ini) {
    out.push({ kind: 'initiative', side: ini.side, weight: 130, clause: `${WHO(ini.side, student)} have the initiative`,
      sentence: initiativeLine(ini, student, stemKeyOf(fen)), squares: ini.squares });
  }

  const evidence = evidenceReasons(board, fen, student, lines, officers);
  // A mating net says the king attack's count with more: one claim, said once.
  const nets = new Set(evidence.filter((r) => r.kind === 'mating-net').map((r) => r.side));
  return [...out.filter((r) => !(r.kind === 'king-attack' && nets.has(r.side))), ...evidence];
}

const PIECE_WORD: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const squareOf = (f: number, r: number): Square => `${String.fromCharCode(97 + f)}${r}` as Square;
const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);
const chebyshev = (a: string, b: string): number => Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

/** The squares a king could step to: on the board, not its own piece, not
 *  attacked by the other side (its own square emptied, so a slider along the
 *  line it stands on still covers the square behind it). */
export function kingFlights(board: Chess, side: Color): Square[] {
  const k = board.findPiece({ type: 'k', color: side })[0];
  if (!k) return [];
  const foe = other(side);
  const probe = new Chess(board.fen());
  probe.remove(k);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const f = fileOf(k) + df; const r = rankOf(k) + dr;
    if (f < 0 || f > 7 || r < 1 || r > 8) continue;
    const sq = squareOf(f, r);
    const p = board.get(sq);
    if (p && p.color === side) continue;
    if (probe.attackers(sq, foe).length === 0) out.push(sq);
  }
  return out;
}

/** The engine's top line played from `fen`, ply by ply (stops at the first
 *  move that does not play). */
function playLine(fen: string, line: readonly string[]): Array<{ uci: string; color: Color; from: string; to: string; piece: string; captured?: string; promotion?: string; check: boolean; fenAfter: string }> {
  const out: ReturnType<typeof playLine> = [];
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  for (const u of line) {
    let m;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    if (!m) break;
    out.push({ uci: u, color: m.color, from: m.from, to: m.to, piece: m.piece, captured: m.captured, promotion: m.promotion, check: c.inCheck(), fenAfter: c.fen() });
  }
  return out;
}

/** Can the side's piece standing on `sq` be taken for profit by the other
 *  side, on `board` (the other side to move)? The cheap rule: attacked by
 *  something cheaper, or attacked and not guarded. */
function loose(board: Chess, sq: Square, side: Color): boolean {
  const p = board.get(sq);
  if (!p) return false;
  const atk = board.attackers(sq, other(side));
  if (atk.length === 0) return false;
  const val = MATERIAL_VALUE[p.type] ?? 0;
  if (atk.some((a) => (MATERIAL_VALUE[board.get(a)?.type ?? 'k'] ?? 99) < val)) return true;
  return board.attackers(sq, side).length === 0;
}

/**
 * THE REASONS THE BOARD SHOWS AND THE COUNT MISSED (2026-11-26, the standing
 * with its evidence): on Danya's boards the standing went bare on 84% of
 * level boards and 29% of slight or clear edges — a queen hit with tempo, a
 * kingside clamped by pawns, a piece with no square, a king with no square
 * and pieces at it, a pawn nobody can catch. Each one is said with what
 * proves it: the squares, a count, or the engine's line that carries it out.
 */
function evidenceReasons(board: Chess, fen: string, student: Color, lines: readonly InitiativeLine[] | null, officers: number): VerdictReason[] {
  const out: VerdictReason[] = [];
  const top = lines?.[0]?.moves ?? null;
  const played = top ? playLine(fen, top) : [];
  const toMove = board.turn();

  for (const x of ['w', 'b'] as const) {
    const y = other(x);
    const own = OWN(x, student); const foe = OWN(y, student);

    // ── A TRAPPED PIECE ── (theirs: attacked, every square it has loses it,
    // and nothing saves it — `trappedAt`; the line that takes it, when the
    // engine's line does)
    for (const cell of board.board().flat()) {
      if (!cell || cell.color !== y || cell.type === 'p' || cell.type === 'k') continue;
      const t = trappedAt(fen, cell.square);
      if (!t) continue;
      const word = PIECE_WORD[cell.type];
      const taken = top ? lineTakesPiece(fen, cell.square, top) : false;
      const clause = `${foe} ${word} on ${cell.square} is trapped: every square it has loses it`;
      const cut = taken ? played.findIndex((m) => m.color === x && m.captured) : -1;
      out.push({ kind: 'trapped', side: x, weight: (MATERIAL_VALUE[cell.type] ?? 3) * 80 * (taken ? 1.25 : 1), clause, sentence: `${cap(clause)}.`,
        squares: [cell.square, t.attackerSquare as Square], ...(taken && cut >= 0 ? { line: top!.slice(0, cut + 1) } : {}) });
      break;
    }

    // ── A MATING NET ── (their king has no square to step to, at least two
    // of x's pieces bear on it, and x has the checks: the engine's line gives
    // one, or x is to move with one on the board)
    if (hasQueen(board, x) && officers >= 3) {
      const k = board.findPiece({ type: 'k', color: y })[0];
      const flights = k ? kingFlights(board, y) : ['-'];
      const attack = countKingAttack(board, x);
      const atk = attack ? [...attack.attackers].filter((sq) => board.get(sq as Square)?.type !== 'p') as Square[] : [];
      const lineChecks = played.slice(0, 6).filter((m) => m.color === x && m.check);
      const hasCheck = lineChecks.length > 0 || (toMove === x && board.moves().some((m) => /[+#]/.test(m)));
      if (k && flights.length === 0 && atk.length >= 2 && hasCheck && (lineChecks.length > 0 || atk.length >= 3)) {
        const clause = `${foe} king on ${k} has no square to step to, and ${count(atk.length)} of ${own} pieces bear on it`;
        const last = lineChecks.length ? played.indexOf(lineChecks[lineChecks.length - 1]) : -1;
        out.push({ kind: 'mating-net', side: x, weight: 170 + 40 * atk.length + 30 * lineChecks.length, clause, sentence: `${cap(clause)}.`,
          squares: [k, ...atk], ...(last >= 0 ? { line: top!.slice(0, last + 1) } : {}) });
      }
    }

    // ── A PAWN NOBODY CAN CATCH ── (a passer outside the other king's
    // square with no piece of theirs left to stop it; or one the engine's line
    // queens)
    const passers = findPassedPawns(fen, x);
    const theirPieces = board.board().flat().some((p) => p && p.color === y && p.type !== 'p' && p.type !== 'k');
    const ky = board.findPiece({ type: 'k', color: y })[0];
    let caught = false;
    if (!theirPieces && ky && findPassedPawns(fen, y).length === 0) {
      for (const sq of passers) {
        const goal = squareOf(fileOf(sq), x === 'w' ? 8 : 1);
        const startRank = x === 'w' ? 2 : 7;
        const steps = Math.abs(rankOf(goal) - rankOf(sq)) - (rankOf(sq) === startRank ? 1 : 0);
        const path = Array.from({ length: Math.abs(rankOf(goal) - rankOf(sq)) }, (_, i) => squareOf(fileOf(sq), rankOf(sq) + (x === 'w' ? i + 1 : -(i + 1))));
        if (path.some((p) => board.get(p))) continue;
        const reach = chebyshev(ky, goal);
        // The square rule: the defender to move catches it inside `steps`, the
        // runner to move gains one.
        const outside = toMove === x ? reach > steps - 1 : reach > steps;
        if (!outside) continue;
        const clause = `${own} pawn on ${sq} cannot be caught: ${foe} king on ${ky} is outside its square`;
        out.push({ kind: 'unstoppable', side: x, weight: 600, clause, sentence: `${cap(clause)}.`, squares: [sq, goal, ky] });
        caught = true;
        break;
      }
    }
    if (!caught && played.length) {
      const q = played.findIndex((m) => m.color === x && m.promotion && m.piece === 'p');
      const origin = q >= 0 ? (() => {
        // Follow the promoting pawn back to the square it stands on now.
        let sq = played[q].from;
        for (let i = q - 1; i >= 0; i--) if (played[i].color === x && played[i].to === sq && played[i].piece === 'p') sq = played[i].from;
        return sq;
      })() : null;
      if (origin && passers.includes(origin as Square)) {
        const clause = `${own} passed pawn on ${origin} goes through: the best line queens it`;
        out.push({ kind: 'unstoppable', side: x, weight: 320, clause, sentence: `${cap(clause)}.`, squares: [origin as Square, played[q].to as Square], line: top!.slice(0, q + 1) });
      }
    }

    // ── A QUEEN HIT WITH TEMPO ── (x to move: a piece or pawn of x steps to a
    // square where it hits their queen and cannot be taken for profit there;
    // the engine's first move, when it is that hit, is the proof)
    if (toMove === x && officers >= 4) {
      const q = board.findPiece({ type: 'q', color: y })[0];
      if (q && !board.inCheck()) {
        const hits = board.moves({ verbose: true }).filter((m) => !m.captured && m.piece !== 'q' && m.piece !== 'k').filter((m) => {
          const c = new Chess(fen);
          c.move(m);
          if (c.isCheckmate()) return false;
          return c.attackers(q, x).includes(m.to) && !loose(c, m.to as Square, x);
        });
        const lineHit = top ? hits.find((m) => `${m.from}${m.to}` === top[0].slice(0, 4)) : undefined;
        if (hits.length) {
          const h = lineHit ?? hits[0];
          const clause = `${foe} queen on ${q} can be hit with tempo`;
          out.push({ kind: 'tempo', side: x, weight: lineHit ? 95 : 60, clause, sentence: `${cap(clause)}: it has to move again.`,
            squares: [q, h.to as Square], ...(lineHit ? { line: [top![0]] } : {}) });
        }
      }
    }

    // ── A CLAMP ── (two pawns or more of x on its fifth rank or beyond, on
    // the wing their king lives on, that no pawn of theirs can ever hit)
    if (officers >= 6 && ky && board.findPiece({ type: 'k', color: y }).length) {
      const wing = fileOf(ky) >= 4 ? [4, 5, 6, 7] : [0, 1, 2, 3];
      const deep = (sq: string): boolean => (x === 'w' ? rankOf(sq) >= 5 : rankOf(sq) <= 4);
      const theirPawns = board.findPiece({ type: 'p', color: y });
      const safe = (sq: string): boolean => !theirPawns.some((p) => Math.abs(fileOf(p) - fileOf(sq)) === 1 && (x === 'w' ? rankOf(p) > rankOf(sq) : rankOf(p) < rankOf(sq)));
      const clampers = board.findPiece({ type: 'p', color: x }).filter((sq) => wing.includes(fileOf(sq)) && deep(sq) && safe(sq)).sort();
      if (clampers.length >= 2) {
        const side = wing[0] === 4 ? 'kingside' : 'queenside';
        const clause = `${own} pawns on ${andList(clampers)} clamp ${foe} ${side}: no pawn of ${OWN(y, student) === 'your' ? 'yours' : 'theirs'} can ever hit them`;
        out.push({ kind: 'clamp', side: x, weight: 55 + 15 * clampers.length, clause, sentence: `${cap(clause)}.`, squares: clampers });
      }
    }
  }
  return out;
}

/**
 * WHAT THE ENGINE'S LINE SHOWS, read against each reason: a reason the line
 * carries out (the trapped piece taken, the passer pushed, the checks given,
 * the weak pawn won, the material still up at its end) weighs more; one the
 * line undoes (a material lead given back) weighs less. The reason that
 * carries the eval comes first.
 */
function lineWeight(r: VerdictReason, fen: string, played: ReturnType<typeof playLine>): VerdictReason {
  if (!played.length) return r;
  const of = (side: Color) => played.filter((m) => m.color === side);
  const mine = of(r.side);
  let k = 1;
  let line: string[] | undefined = r.line;
  const upTo = (i: number): string[] => played.slice(0, i + 1).map((m) => m.uci);
  switch (r.kind) {
    case 'material': {
      const end = materialBalanceOf(played[played.length - 1].fenAfter);
      const lead = r.side === 'w' ? end : -end;
      const start = r.side === 'w' ? materialBalanceOf(fen) : -materialBalanceOf(fen);
      k = lead >= 1 ? 1.3 : lead <= 0 && start > 0 ? 0.4 : 1;
      break;
    }
    case 'passer': case 'unstoppable': {
      const sq = r.squares[0];
      const i = played.findIndex((m) => m.color === r.side && m.from === sq && m.piece === 'p');
      if (i >= 0) { k = played.some((m) => m.color === r.side && m.promotion) ? 2 : 1.4; line = line ?? upTo(i); }
      break;
    }
    case 'weak-pawn': {
      const sq = r.squares[0];
      const i = played.findIndex((m) => m.color === r.side && m.to === sq && m.captured === 'p');
      if (i >= 0) { k = 1.5; line = line ?? upTo(i); }
      break;
    }
    case 'king-attack': case 'king-shelter': case 'king-centre': case 'mating-net': {
      const i = played.findIndex((m) => m.color === r.side && m.check);
      if (i >= 0) { k = 1.3; line = line ?? upTo(i); }
      break;
    }
    case 'trapped': {
      const i = played.findIndex((m) => m.color === r.side && m.to === r.squares[0] && m.captured);
      if (i >= 0) { k = 1.5; line = line ?? upTo(i); }
      break;
    }
    case 'tempo':
      if (r.line) k = 1.2;
      break;
    default:
      if (mine.length === 0) k = 1;
  }
  return { ...r, weight: r.weight * k, ...(line ? { line } : {}) };
}

function materialBalanceOf(fen: string): number {
  let w = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = MATERIAL_VALUE[ch.toLowerCase()];
    if (!v || ch.toLowerCase() === 'k') continue;
    w += ch === ch.toUpperCase() ? v : -v;
  }
  return w;
}

/** Why a level board is level, said with a count: the material the same, N
 *  pawns each, and — in a middlegame — neither king open. Null when the board
 *  shows no such evidence (an even count beside an open king is no balance). */
function evenReason(board: Chess, student: Color): VerdictReason | null {
  const pieces = (c: Color): number => board.board().flat().filter((p) => p && p.color === c && p.type !== 'k' && p.type !== 'p')
    .reduce((t, p) => t + (MATERIAL_VALUE[p!.type] ?? 0), 0);
  const pawns = (c: Color): number => board.findPiece({ type: 'p', color: c }).length;
  if (pieces('w') !== pieces('b') || pawns('w') !== pawns('b')) return null;
  const officers = board.board().flat().filter((p) => p && p.type !== 'p' && p.type !== 'k').length;
  const n = pawns('w');
  const pawnWords = n === 0 ? 'no pawns left' : `${count(n)} pawn${n === 1 ? '' : 's'} each`;
  if (officers >= 6) {
    const cw = kingCover(board, 'w'); const cb = kingCover(board, 'b');
    if (!cw || !cb || cw.present < 2 || cb.present < 2) return null;
    const clause = `material is level, ${pawnWords}, and both kings keep their pawn cover`;
    return { kind: 'even', side: student, weight: 20, clause, sentence: `${cap(clause)}.`, squares: [cw.kingSquare as Square, cb.kingSquare as Square] };
  }
  const clause = `material is level, with ${pawnWords} and the same pieces`;
  return { kind: 'even', side: student, weight: 20, clause, sentence: `${cap(clause)}.`, squares: [] };
}

function times(n: number): string {
  return n === 1 ? 'once' : n === 2 ? 'twice' : `${count(n)} times`;
}

/** The activity edge as a clause and a sentence (`pieceActivity`'s own words). */
function activityLine(e: ActivityEdge, student: Color): { clause: string; text: string } {
  return { clause: activityEdgeClause(e, student), text: activityEdgeLine(e, student) };
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
  const lines = inCheck ? null : input.lines;
  const played = lines?.[0]?.moves ? playLine(input.fen, lines[0].moves) : [];
  const all = boardReasons(input.fen, input.student, lines, input.lastMove).map((r) => lineWeight(r, input.fen, played));
  const board = new Chess(input.fen);
  // The one ladder (`evalBand`): under half a pawn is level.
  const favoured: Color | null = evalBand(input.evalCp) === 'level' ? null : input.evalCp > 0 ? 'w' : 'b';
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
    // A CLEAR EDGE NEEDS A REASON ITS SIZE (Danya narration test 2026-11-19:
    // "You're clearly worse — your knight on b8 hasn't moved" at −2.4, a
    // kingside bind with the h-file coming; "clearly better — you have the
    // bishop pair" a pawn down). A soft plus — a quiet edge the engine weighs
    // in tenths — said alone for a clear verdict claims to explain what it
    // cannot. Under half the edge, the verdict goes out without a reason.
    const band = evalBand(input.evalCp);
    if ((band === 'clearly' || band === 'decisive') && picked.every((r) => SOFT_REASON[r.kind])
      && picked.reduce((t, r) => t + r.weight, 0) * 2 < Math.abs(input.evalCp)) return null;
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
    // WHY A LEVEL BOARD IS LEVEL, said with its count (the standing is never
    // bare): the same material, so many pawns each, both kings covered.
    if (picked.length === 0 && !input.said.has('even')) {
      const even = evenReason(board, input.student);
      if (even) picked = [even];
    }
  }
  if (picked.length === 0) return null;
  const squares = [...new Set(picked.flatMap((r) => [...r.squares, ...(r.line ?? []).flatMap((u) => [u.slice(0, 2), u.slice(2, 4)] as Square[])]))];
  const arrows = picked.flatMap((r) => (r.line ?? []).map((u): [Square, Square] => [u.slice(0, 2) as Square, u.slice(2, 4) as Square]));
  const proofLines = picked.flatMap((r) => {
    if (!r.line?.length) return [];
    const c = new Chess(input.fen);
    const sans: string[] = [];
    for (const u of r.line) { try { sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
    return sans.length ? [{ fen: input.fen, sans }] : [];
  });
  return { favoured, reasons: picked, text: picked.map((r) => r.sentence).join(' '), squares, arrows, proofLines };
}

/** The reasons as clauses after a verdict ("— you're a piece up, their king is
 *  still in the middle"), for a surface that says the verdict in one line. */
export function reasonClauses(v: VerdictWithReasons): string[] {
  return v.reasons.map((r) => r.clause);
}
