// nextPlans — the FORWARD-PLAN computer, as a LEAF (2026-09-19).
//
// `deriveNextPlans` (every plan the structure earns, each with its HOW) and
// the worst-placed-piece finder lived in reviewTeachingPoints, which imports
// from groundedAnswer — so the CHAT plan lane in groundedAnswer could not reach
// the one computer that already knew the method, and answered "what's my plan"
// with levers alone ("break with d4 or f4; put a rook on the e-file") while
// review, one import away, said "the plan from here is to win their weak pawn
// on d5. Here's how: …" (PLAN §C 17, #64). Capability parity: one computer,
// both surfaces. Nothing here imports a surface module; keep it that way.
import { reachWords } from '../utils/reachWords';
import { isUndevelopedInOpening } from '../utils/undeveloped';
import { Chess, type Color, type Square, type PieceSymbol } from 'chess.js';
import { describeStructure } from './boardStructure';
import { computePieceRoute, computeSliderRoute } from './forwardTeaching';
import { isOutpost } from './outpost';
import { routeVia } from '../utils/routeWords';
import { legalSeeGainFor, pieceScope } from './positionReadingService';
import { enemyKingStuckInCenter } from './reviewSacrifice';
import { openSentence } from '../utils/openSentence';
import { withMover } from '../utils/sideToMove';
import { detectPlanRace, planRaceClause, stepsToPromote } from './planRace';

export const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface Cell { type: string; color: Color; square: string; }

export function cells(chess: Chess): Cell[] {
  const out: Cell[] = [];
  for (const row of chess.board()) for (const c of row) if (c) out.push({ type: c.type, color: c.color, square: c.square });
  return out;
}

/**
 * Does EITHER side have a checkmate in one from this board? The side to move
 * is read off the real position; the other side off a null-move flip (which
 * can be illegal when that side is already in check — then only the real side
 * is judged). Board-true, chess.js only.
 */
function isLightSquare(sq: string): boolean {
  return (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2 === 0;
}

/** A minor or bigger that the other side wins at least two pawns' worth of
 *  by SEE. Only ATTACKED pieces reach the (costly) SEE — the full-board
 *  `findHangingBySee` sweep was ~15 ms a ply, a second across a review. */
function pieceEnPrise(chess: Chess, fen: string): boolean {
  for (const row of chess.board()) {
    for (const c of row) {
      if (!c || c.type === 'p' || c.type === 'k') continue;
      const enemy: Color = c.color === 'w' ? 'b' : 'w';
      if (!chess.isAttacked(c.square, enemy)) continue;
      if (legalSeeGainFor(fen, c.square, enemy) >= 2) return true;
    }
  }
  return false;
}

export function mateInOneExists(chess: Chess): boolean {
  const probes: Chess[] = [chess];
  try {
    const parts = chess.fen().split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    probes.push(new Chess(parts.join(' ')));
  } catch { /* the flipped board is illegal — judge the real one only */ }
  for (const p of probes) {
    try {
      for (const m of p.moves()) {
        const after = new Chess(p.fen());
        after.move(m);
        if (after.isCheckmate()) return true;
      }
    } catch { /* an unreadable probe proves nothing */ }
  }
  return false;
}

/**
 * THE ONE worst-placed-piece finder (David 2026-09-15). Two copies of this
 * selection loop existed — M12's facet and `deriveNextPlans`' rescue plan — and
 * only one carried the gates, so the review said "your knight sits on an
 * outpost on d4, make it the boss of the board" and "rescue your worst piece,
 * the knight on d4" in the SAME breath, and offered a slow reroute on the ply a
 * check-fork landed. One finder, one set of gates, no drift.
 */
export function findWorstPlacedPiece(
  chess: Chess,
  studentColorWB: Color,
): { sq: string; type: string; m: number } | null {
  // While a king is in check the plan IS the check; nothing gets repositioned.
  if (chess.isCheck()) return null;
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const mob = mobilityMap(chess, studentColorWB); // ONE moves() enumeration
  let worst: { sq: string; type: string; m: number } | null = null;
  for (const c of cells(chess)) {
    if (c.color !== studentColorWB) continue;
    if (c.type !== 'n' && c.type !== 'b' && c.type !== 'r') continue;
    // An UNDEVELOPED piece is not misplaced — its lesson is development, with
    // its own clause (walk 5: "rescue your worst piece, the bishop on c8" at
    // move 10 of a Najdorf, spoken on the OPPONENT's ply).
    if (isUndevelopedInOpening(chess.fen(), studentColorWB, c.type, c.square)) continue;
    // A ROOK ON ITS OWN BACK RANK is where rooks live until a file opens —
    // its low mobility is the closed centre, not a bad square, and its lesson
    // (take the open file) has its own clause. Walk 6 (R10): "rescue your worst
    // piece, the rook on f1" the move after castling.
    if (c.type === 'r' && c.square[1] === (studentColorWB === 'w' ? '1' : '8')) continue;
    // A piece UNDER ATTACK needs saving, not rerouting — and its mobility reads
    // low precisely because it is boxed in by the attack. Naming it "worst
    // placed, reroute it" buries the live threat under a positional plan.
    try { if (chess.attackers(c.square as Square, enemy).length > 0) continue; } catch { /* keep the candidate */ }
    // A minor on a real OUTPOST is doing a job — one board cannot call the same
    // knight an outpost and the worst piece.
    if ((c.type === 'n' || c.type === 'b') && isOutpost(chess, c.square, studentColorWB, true)) continue;
    // A PINNED piece is immobile because of the pin, not because it is badly
    // placed; the lesson there is the pin, not a reroute.
    if (mob.get(c.square) === 0 && isPinnedPiece(chess, c.square as Square, studentColorWB)) continue;
    const m = mob.get(c.square) ?? 0;
    if (!worst || m < worst.m) worst = { sq: c.square, type: c.type, m };
  }
  return worst && worst.m <= 1 ? worst : null;
}

/** THE WORST PIECE, as a note — the one answer to "which of your pieces is
 *  worst" (census 8, OS-11 duplicate map: `strongestWeakestPiece` had its own
 *  scope-only answer that named undeveloped pieces and back-rank rooks). */
/** THE WORST PIECE — one owner (census 8). The misplaced piece the reroute
 *  plan names (`findWorstPlacedPiece`, `misplaced: true`) when there is one;
 *  otherwise the least active piece by the squares it covers, so a student who
 *  ASKS always gets an answer (the scope-only reading it replaced answered on
 *  every board — "what is my worst piece?" at move 8 went silent without it).
 *  `scope` is always the squares covered, the number the answer says. */
export function worstPieceNote(fen: string, color: Color): { square: Square; piece: PieceSymbol; scope: number; misplaced: boolean } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const w = findWorstPlacedPiece(chess, color);
  if (w) return { square: w.sq as Square, piece: w.type as PieceSymbol, scope: pieceScope(chess, w.sq as Square), misplaced: true };
  let least: { square: Square; piece: PieceSymbol; scope: number; misplaced: boolean } | null = null;
  for (const c of cells(chess)) {
    if (c.color !== color || c.type === 'p' || c.type === 'k') continue;
    const scope = pieceScope(chess, c.square as Square);
    if (!least || scope < least.scope) least = { square: c.square as Square, piece: c.type as PieceSymbol, scope, misplaced: false };
  }
  return least;
}

export function isPinnedPiece(chess: Chess, sq: Square, color: Color): boolean {
  try {
    const king = cells(chess).find((c) => c.type === 'k' && c.color === color);
    if (!king) return false;
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const f = (s: string): number => s.charCodeAt(0) - 97;
    const r = (s: string): number => Number(s[1]) - 1;
    const df = Math.sign(f(sq) - f(king.square));
    const dr = Math.sign(r(sq) - r(king.square));
    if (df === 0 && dr === 0) return false;
    // ON A KING LINE AT ALL (computers batch 3): a piece not on the king's file,
    // rank or diagonal is never pinned to it. Without this the walk from the
    // king ran off the board without meeting the piece and then read whatever
    // slider sat beyond it — a rook on d6 "pinned" to a king on g1.
    const ddf = Math.abs(f(sq) - f(king.square)); const ddr = Math.abs(r(sq) - r(king.square));
    if (ddf !== 0 && ddr !== 0 && ddf !== ddr) return false;
    // Must be on a king ray with nothing between, and a slider behind it.
    let cf = f(king.square) + df;
    let cr = r(king.square) + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const at = `${String.fromCharCode(97 + cf)}${cr + 1}`;
      if (at === sq) break;
      if (chess.get(at as Square)) return false; // blocked before the piece
      cf += df; cr += dr;
    }
    cf = f(sq) + df; cr = r(sq) + dr;
    while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
      const at = `${String.fromCharCode(97 + cf)}${cr + 1}`;
      const pc = chess.get(at as Square);
      if (pc) {
        if (pc.color !== enemy) return false;
        const diag = df !== 0 && dr !== 0;
        return pc.type === 'q' || (diag ? pc.type === 'b' : pc.type === 'r');
      }
      cf += df; cr += dr;
    }
    return false;
  } catch { return false; }
}

/**
 * "THE PLANS FROM HERE" — the FORWARD plans the student should pursue, each with
 * the concrete HOW (David 2026-07-20: "add in more future plans … and exactly HOW
 * to do those plans"). A great review doesn't only describe the board and name a
 * plan — it spells out the method: which squares, which pieces, which breaks.
 * Board-derived (G0), in Danya priority order; returns EVERY plan that genuinely
 * applies (not just the top one), so the student hears the full agenda. Empty when
 * nothing concrete stands out.
 */
interface NextPlanOpts {
  studentPovCp?: number | null;
  /** REQUIRED: may a plan name the student's next move — the first square of
   *  a route? Learn's live board holds it (LEARN NAMES NO MOVE UNASKED; Black
   *  walk 2026-10-19: "walk it to c3, by way of d2"); Review and chat name it. */
  namesStudentMoves: boolean;
}

export function deriveNextPlans(
  fen: string,
  studentColorWB: Color,
  opts: NextPlanOpts,
): string[] {
  return deriveNextPlanFacts(fen, studentColorWB, opts).map((p) => p.text);
}

/** The plan kinds `deriveNextPlanFacts` emits — one per numbered branch. */
export type PlanKind = 'king-attack' | 'passer' | 'weak-pawn' | 'open-file' | 'outpost' | 'worst-piece' | 'convert' | 'bishop-pair';

/** A plan with the board objects it is about, so a later move can be checked
 *  against them (`planStopped`) — never read back out of the sentence. */
export interface PlanFact {
  kind: PlanKind;
  text: string;
  /** The squares the plan is built on: the king it hunts, the pawn it pushes,
   *  the pawn it besieges and its blockade square, the outpost, the piece. */
  squares: string[];
  /** The file, for the file plans (the open file, the king-attack file). */
  file: string | null;
  /** One stable id per plan on this board: kind + anchor. */
  id: string;
  /** The goal alone, to follow "the plan is to …" ("seize the open c-file"). */
  goal: string;
  /** The same goal as a gerund, to follow "before …" ("seizing the open c-file"). */
  goalIng: string;
}

export function deriveNextPlanFacts(
  fen: string,
  studentColorWB: Color,
  // The engine's student-POV eval at this position, when the caller has one.
  // The material plan reads the COUNT; the count lies while the material is
  // on its way back (walk 2026-09-23: after Bxf7+ Kxf7 the review said "convert
  // your extra material" at +0.5 for the other side — Ng5+ was about to win the
  // bishop back). With an eval in hand, "extra" must also be an edge.
  opts: NextPlanOpts,
): PlanFact[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  // A MATE ON THE BOARD OUTRANKS EVERY PLAN (WO-STANDARD-01 D-15, prod tape
  // 2026-09-22: with Qxf7# available the coach said "win their weak pawn on
  // h7 — plant your knight on h6"). Rank: mate threat > material > plan. When
  // either side has a mate in one from this position, there IS no plan to
  // state — the mate is the whole story, and the tactic facets already name
  // it. Computed here, in the plan computer, so no surface can rank around it.
  if (mateInOneExists(chess)) return [];
  // …and the same ranking one rung down: while a whole piece is en prise the
  // material IS the story. Walk 5 (R7): after fxe5 attacked the student's
  // knight on f6 the review prescribed a blockade plan instead of the knight.
  // SEE nets in pawns; a lone pawn (gain 1) stays out — a gambit pawn is not a verdict.
  // Not while in check: SEE there is read with every recapture illegal until
  // the check is answered, so a defended piece reads as lost (Opera Game after
  // Bxb5+ scored the guarded f6 knight at 3).
  if (!chess.inCheck() && pieceEnPrise(chess, fen)) return [];
  const struct = describeStructure(fen);
  if (!struct) return [];
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const all = cells(chess);
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  const plans: PlanFact[] = [];
  // The goal and the how are coupled at emission, never read back from the
  // sentence (planChoice says why one goal comes before another).
  // A PAWN'S PLAN IS KEYED BY ITS FILE, NOT ITS SQUARE (v6 re-run 2026-10-29,
  // chesscom-143368469378: their c-pawn walked c4 → c7 and each step was "the
  // plan changes here — now it's to win their weak pawn on c5 … c6 … c7").
  // A pawn changes file only by taking — then it is another pawn, and another
  // plan. The plan arc keys its passers the same way (`passer:d`).
  const PAWN_PLAN: ReadonlySet<PlanKind> = new Set<PlanKind>(['weak-pawn', 'passer']);
  const add = (kind: PlanKind, goal: string, goalIng: string, how: string, squares: string[], file: string | null = null): void => {
    const anchor = PAWN_PLAN.has(kind) && squares[0] ? squares[0][0] : squares[0] ?? file ?? '';
    plans.push({ kind, text: `the plan from here is to ${goal}. Here's how: ${how}`, squares, file, id: `${kind}:${anchor}`, goal, goalIng });
  };

  // 1. Enemy king exposed in the centre → open lines and attack it, HOW spelled out.
  const enemyKing = all.find((c) => c.type === 'k' && c.color === enemy);
  const openCentralFile = struct.pawns.openFiles.find((f) => f === 'd' || f === 'e') ?? null;
  // …and only with queens on: a central king is the ENDGAME's right square, and
  // "attack their king stuck on f2" in a rook ending (review tape 2026-09-25)
  // is the middlegame worry the king reads already drop without queens.
  const queensOn = all.some((c) => c.type === 'q');
  // ONE stuck-king reader (`enemyKingStuckInCenter`), shared with the sacrifice
  // compensation — this used to be a second copy of the same test.
  if (enemyKing && queensOn && openCentralFile && enemyKingStuckInCenter(fen, studentColorWB)) {
    // The soft squares in front of a stuck king — where a sac usually lands.
    const softSquares = enemy === 'w' ? 'd2 or f2' : 'd7 or f7';
    // Rook clause scales to the rooks the student actually HAS (prescription
    // gate, David 2026-07-22 — never prescribe a piece that isn't there).
    const rookCount = all.filter((c) => c.type === 'r' && c.color === studentColorWB).length;
    // The same four steps in fewer words (Learn audit on prod, 2026-10-13: this
    // plan alone was ~80 words of a 117-word turn, against the 35–50 bar). A
    // rewording, never a cut — every step still speaks.
    const fileClause = rookCount >= 2
      ? `double your rooks on the open ${openCentralFile}-file, `
      : rookCount === 1
        ? `put your rook on the open ${openCentralFile}-file, `
        : '';
    add('king-attack', `attack their king on ${enemyKing.square} before it gets out`, `attacking their king on ${enemyKing.square}`, `tuck your own king away, ${fileClause}bring pieces in with tempo, and look for a sacrifice on ${softSquares} to strip its cover`, [enemyKing.square], openCentralFile);
  }

  // 2. Your passed pawn → push it, HOW spelled out. The king joins the escort
  // ONLY once the queens are off — telling a student to march the king up a
  // middlegame board is phase-blind advice (template-logic sweep, David
  // 2026-07-22: read every authored line as a chess player).
  // A passer with THEIR piece planted in front of it is blockaded: "push it"
  // is not the plan while that piece sits there (planStopped says why).
  // TWO PASSERS: THE PLAN RUNS THE BETTER ONE (prod Review 2026-10-29: "your
  // passed pawn on h2", then four plies later "the plan changes — your passed
  // pawn on f2" with nothing changed for h2: the plan took the first passer in
  // the list). Better = fewer pushes to queen, then farther from their king's
  // reach of the queening square — and never the one their king stands in
  // front of; the list order only breaks a full tie.
  const enemyKingSq = all.find((c) => c.type === 'k' && c.color === enemy)?.square ?? null;
  const pushesLeft = (sq: string): number => (studentColorWB === 'w' ? 8 - Number(sq[1]) : Number(sq[1]) - 1);
  const kingReach = (sq: string): number => {
    if (!enemyKingSq) return 8;
    const queenRank = studentColorWB === 'w' ? 8 : 1;
    return Math.max(Math.abs(enemyKingSq.charCodeAt(0) - sq.charCodeAt(0)), Math.abs(Number(enemyKingSq[1]) - queenRank));
  };
  const kingInFront = (sq: string): boolean => !!enemyKingSq && enemyKingSq[0] === sq[0]
    && (studentColorWB === 'w' ? Number(enemyKingSq[1]) > Number(sq[1]) : Number(enemyKingSq[1]) < Number(sq[1]));
  const passer = struct.pawns.passedPawns[studentColorWB]
    .filter((sq) => {
      const front = `${sq[0]}${Number(sq[1]) + (studentColorWB === 'w' ? 1 : -1)}` as Square;
      const blocker = chess.get(front);
      return !(blocker && blocker.color === enemy);
    })
    .map((sq, i) => ({ sq, i }))
    .sort((a, b) => pushesLeft(a.sq) - pushesLeft(b.sq) || Number(kingInFront(a.sq)) - Number(kingInFront(b.sq)) || kingReach(b.sq) - kingReach(a.sq) || a.i - b.i)[0]?.sq;
  if (passer) {
    const queensOn = all.some((c) => c.type === 'q');
    const escort = queensOn
      ? 'escort it with your pieces — the king joins once the queens come off'
      : 'escort it with your king and pieces';
    add('passer', `get your passed pawn on ${passer} promoting`, `pushing your passed pawn on ${passer}`, `${passerHow(chess, passer, studentColorWB)}${escort}, and push it one safe square at a time — every push brings it closer to promotion`, [passer]);
  }

  // 3. An enemy weak (isolated) pawn on the c–f files → besiege it, HOW spelled
  // out. Only prescribe pieces the student actually HAS — "plant a knight"
  // with no knight on the board is nonsense advice (template-logic sweep).
  const weak = struct.pawns.isolatedPawns[enemy].find((sq) => 'cdef'.includes(sq[0])) ?? struct.pawns.isolatedPawns[enemy][0];
  if (weak) {
    const block = `${weak[0]}${enemy === 'w' ? Number(weak[1]) + 1 : Number(weak[1]) - 1}`;
    // The blockader is an ACTUAL board object — its noun is interpolated from
    // the piece found, so prescribing an absent piece is unwritable (root-
    // cause doctrine, David 2026-07-22). Knight preferred (the classic
    // blockader), any minor otherwise, square-control phrasing when no minor
    // exists at all.
    // What already stands on the block square decides the clause (walk 5,
    // R7: "plant your knight on e6" with the student's own pawn on e6). A
    // student pawn there has already done the blockading; an enemy piece
    // there means the square is not ours to plant on; a student minor there
    // is the blockader already. A bishop is only offered when it can ever
    // stand on that square's colour.
    const occupant = chess.get(block as Square);
    const sqLight = isLightSquare(block);
    const blockader = all.find((c) => c.type === 'n' && c.color === studentColorWB)
      ?? all.find((c) => c.type === 'b' && c.color === studentColorWB && isLightSquare(c.square) === sqLight)
      ?? null;
    const blockBit = occupant && occupant.color === studentColorWB && occupant.type === 'p'
      ? `your pawn on ${block} already stops it from advancing`
      : occupant && occupant.color === studentColorWB && (occupant.type === 'n' || occupant.type === 'b')
        ? `keep your ${occupant.type === 'n' ? 'knight' : 'bishop'} on ${block}, in front of it, so it can never advance`
        : occupant
          ? null
          : blockader
            ? `plant your ${blockader.type === 'n' ? 'knight' : 'bishop'} on ${block}, in front of it, so it can never advance`
            : `control ${block}, the square in front of it, so it can never advance`;
    // The pieces that win it are the ones on the board (replay 2026-10-19,
    // 42.Nb5: "stack your heavy pieces on its file" in a knight ending).
    // NAME WHAT IS THERE (Black walk 2026-10-19, move 24: "stack your heavy
    // pieces" with ONE rook and no queens): one heavy piece goes to the file,
    // two or more stack on it.
    const heavies = chess.board().flat().filter((p) => p && p.color === studentColorWB && (p.type === 'r' || p.type === 'q'));
    const rooks = heavies.filter((p) => p?.type === 'r').length;
    const heavyNoun = heavies.length === 1
      ? `put your ${rooks === 1 ? 'rook' : 'queen'} on its file`
      : rooks === heavies.length
        ? 'stack your rooks on its file'
        : rooks === 0 ? 'bring your queens to its file' : `stack your ${rooks === 1 ? 'rook' : 'rooks'} and queen on its file`;
    const pile = heavies.length > 0
      ? `${heavyNoun} and trade off its defenders — each one is a piece of theirs tied to it`
      : 'bring your king and pieces to it and trade off its defenders — each one is a piece of theirs tied to it';
    add('weak-pawn', `win their weak pawn on ${weak}`, `winning their weak pawn on ${weak}`, `${blockBit ? `${blockBit}; then ` : ''}${pile}${countBit(chess, weak as Square, studentColorWB)}`, [weak, block]);
  }

  // 4. An open file you don't yet own with a heavy piece → seize it, HOW
  // spelled out — only when the student still HAS a rook to put there.
  const myRooks = all.filter((c) => c.type === 'r' && c.color === studentColorWB);
  const myHeavyFiles = new Set(all.filter((c) => (c.type === 'r' || c.type === 'q') && c.color === studentColorWB).map((c) => c.square[0]));
  // "Before they contest it" — a file their rook or queen already stands on
  // is contested, not free to seize.
  const theirHeavyFiles = new Set(all.filter((c) => (c.type === 'r' || c.type === 'q') && c.color === enemy).map((c) => c.square[0]));
  const freeOpenFile = struct.pawns.openFiles.find((f) => !myHeavyFiles.has(f) && !theirHeavyFiles.has(f));
  if (freeOpenFile && myRooks.length > 0) {
    const doubleBit = myRooks.length >= 2 ? 'double the second rook behind the first so nothing can challenge you, and ' : '';
    add('open-file', `seize the open ${freeOpenFile}-file`, `seizing the open ${freeOpenFile}-file`, `${rookReachBit(chess, myRooks, freeOpenFile)}${doubleBit}aim for the seventh rank, where a rook attacks pawns from behind`, [], freeOpenFile);
  }

  // 5. You already hold an outpost → dominate from it, HOW spelled out.
  const myOutpost = struct.outposts.find((o) => o.color === studentColorWB);
  if (myOutpost) {
    add('outpost', `make that ${myOutpost.piece === 'n' ? 'knight' : 'bishop'} on ${myOutpost.square} the boss of the board`, `building around your ${myOutpost.piece === 'n' ? 'knight' : 'bishop'} on ${myOutpost.square}`, `${guardPawnBit(chess, myOutpost.square as Square, studentColorWB)} and refuse trades that give it up — from there it presses on everything around it`, [myOutpost.square]);
  }

  // 6. Your worst-placed piece (stuck) → reroute it, HOW spelled out.
  if (fullmove >= 10) {
    const worst = findWorstPlacedPiece(chess, studentColorWB);
    if (worst) {
      add('worst-piece', `rescue your worst piece, the ${PIECE_NOUN[worst.type]} on ${worst.sq}, which ${reachWords(worst.m)}`, `rescuing your ${PIECE_NOUN[worst.type]} on ${worst.sq}`, `${routeBit(fen, worst.sq as Square, opts.namesStudentMoves)}before you attack — a piece doing nothing leaves you a piece down in the fight`, [worst.sq]);
    }
  }

  // 7. Up a clear amount of material → simplify and convert, HOW spelled out.
  // The surplus NOUN is COMPOSED from the actual material breakdown — "the
  // extra piece" was hand-typed while bal >= 2 can be two pawns or the
  // exchange (root-cause doctrine, David 2026-07-22: advice text is composed
  // from board objects, never written ahead of the board).
  const bal = struct.material.balance * (studentColorWB === 'w' ? 1 : -1);
  const evalAgrees = opts.studentPovCp === undefined || opts.studentPovCp === null || opts.studentPovCp >= 50;
  if (bal >= 2 && evalAgrees) {
    const pts: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
    const nonPawn = (color: Color): number => all.filter((c) => c.color === color && c.type !== 'p' && c.type !== 'k')
      .reduce((s, c) => s + (pts[c.type] ?? 0), 0);
    const pawnDiff = all.filter((c) => c.color === studentColorWB && c.type === 'p').length
      - all.filter((c) => c.color === enemy && c.type === 'p').length;
    const nonPawnDiff = nonPawn(studentColorWB) - nonPawn(enemy);
    // Named by WHICH pieces are extra, never by a point threshold (an extra
    // rook is 5 points and is not "the extra piece").
    const diff = (t: string): number => all.filter((c) => c.color === studentColorWB && c.type === t).length
      - all.filter((c) => c.color === enemy && c.type === t).length;
    const minors = diff('n') + diff('b');
    const rooks = diff('r');
    const queens = diff('q');
    const surplus = queens === 0 && rooks === 0 && minors === 1 ? 'the extra piece'
      : queens === 0 && rooks === 0 && minors > 1 ? 'the extra pieces'
      : queens === 0 && rooks === 1 && minors === -1 ? 'the exchange'
      : queens === 0 && rooks >= 1 && minors === 0 ? `the extra rook${rooks > 1 ? 's' : ''}`
      : nonPawnDiff > 0 ? 'your extra material'
      : pawnDiff >= 1 ? `your extra pawn${pawnDiff > 1 ? 's' : ''}`
      : 'your material edge';
    add('convert', `convert your extra material`, `converting your extra material`, `trade pieces, keep the pawns, and keep it simple — every trade makes ${surplus} count for more`, []);
  }

  // 8. Bishop pair → open the position for the two bishops, HOW spelled out.
  const myB = all.filter((c) => c.type === 'b' && c.color === studentColorWB).length;
  const enemyB = all.filter((c) => c.type === 'b' && c.color === enemy).length;
  if (myB >= 2 && enemyB <= 1) {
    // "MAKE THE PAIR COUNT", never "cash in" — cashing-in reads as selling the
    // asset, which contradicts the very next clause about guarding both from a
    // swap (David 2026-07-22). The pair converts by DOMINATING an open board
    // while both bishops live; the trade comes last, at full price.
    // The "outgun" comparison names what the enemy ACTUALLY has (prescription
    // gate — never reference a piece that isn't on the board, even in an idiom).
    const enemyN = all.some((c) => c.type === 'n' && c.color === enemy);
    const rival = enemyN && enemyB === 1 ? 'their knight and bishop'
      : enemyN ? 'their knights'
      : enemyB === 1 ? 'their lone bishop'
      : 'anything they have left';
    add('bishop-pair', `make your bishop pair count`, `opening the board for your bishops`, `trade pawns to open the board and keep both bishops — on an open board two bishops outgun ${rival}`, all.filter((c) => c.type === 'b' && c.color === studentColorWB).map((c) => c.square));
  }

  return plans;
}

// ── THE CONCRETE HOW (David 2026-10-15: "teach the user how to think for
// themselves") — each plan's method computed on THIS board: the count, the
// piece, the square, the distance. Clauses, never a move in SAN: the student
// still finds the move.

const TIMES = ['no times', 'once', 'twice', 'three times', 'four times'];
const times = (n: number): string => TIMES[n] ?? `${n} times`;


/** The passer's distance to queening, and the enemy piece covering its next square. */
function passerHow(chess: Chess, passer: string, color: Color): string {
  const rank = Number(passer[1]);
  const left = color === 'w' ? 8 - rank : rank - 1;
  const front = `${passer[0]}${rank + (color === 'w' ? 1 : -1)}` as Square;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  let cover = '';
  try {
    const by = chess.attackers(front, enemy).map((sq) => ({ sq, p: chess.get(sq) })).filter((x) => x.p && x.p.type !== 'k');
    if (by.length > 0) cover = `, and their ${PIECE_NOUN[by[0].p?.type ?? 'p']} on ${by[0].sq} covers ${front} — drive it off or cover ${front} yourself first`;
  } catch { cover = ''; }
  return `it is ${left} square${left === 1 ? '' : 's'} from queening${cover}; `;
}

/** The weak pawn counted: how often the student hits it against its guards. */
function countBit(chess: Chess, weak: Square, color: Color): string {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  let a = 0; let d = 0;
  try { a = chess.attackers(weak, color).length; d = chess.attackers(weak, enemy).length; } catch { return ''; }
  // "they guard it no times" (replay 2026-10-19, 17.hxg3): an unguarded pawn
  // is said as unguarded.
  const guards = d === 0 ? 'nothing of theirs guards it' : `they guard it ${times(d)}`;
  if (a === 0) return d === 0
    ? `. Count it: nothing of theirs guards it — the first attacker you bring wins it`
    : `. Count it: you don't hit it yet and ${guards} — bring attackers until yours outnumber the guards`;
  if (d === 0) return `. Count it: you hit it ${times(a)} and ${guards}`;
  return a > d
    ? `. Count it: you hit it ${times(a)} and they guard it ${times(d)} — more attackers than guards`
    : `. Count it: you hit it ${times(a)} and they guard it ${times(d)} — add attackers until yours outnumber the guards`;
}

/** Whether a rook of the student's reaches the file in one move. */
function rookReachBit(chess: Chess, rooks: readonly Cell[], file: string): string {
  const me = rooks[0]?.color;
  const f = me ? withMover(chess.fen(), me) : null;
  const board = f ? new Chess(f) : null;
  const reach = board ? board.moves({ verbose: true }).some((m) => m.piece === 'r' && m.to[0] === file && m.from[0] !== file) : false;
  return reach
    ? 'put a rook on it right away — one of yours gets there in a single move, so do it before they contest it; '
    : 'clear a path for a rook before they contest it — none of yours reaches it in one move yet; ';
}

/** The pawn that guards the outpost, named. */
function guardPawnBit(chess: Chess, sq: Square, color: Color): string {
  const behind = Number(sq[1]) + (color === 'w' ? -1 : 1);
  for (const df of [-1, 1]) {
    const f = String.fromCharCode(sq.charCodeAt(0) + df);
    if (f < 'a' || f > 'h') continue;
    const at = `${f}${behind}` as Square;
    const p = chess.get(at);
    if (p && p.type === 'p' && p.color === color) return `keep your pawn on ${at} guarding it`;
  }
  return 'keep a pawn guarding it';
}

/** Where the worst piece wants to go, by its own route computer. */
function routeBit(fen: string, sq: Square, namesStudentMoves: boolean): string {
  const r = computePieceRoute(fen, sq) ?? computeSliderRoute(fen, sq);
  if (!r || r.route.length === 0) return 'walk it to a square where it bites ';
  // Held: the destination, never the step — a one-hop route IS the move.
  if (!namesStudentMoves) return r.route.length === 1 ? 'walk it to a square where it bites ' : `walk it toward ${r.target} `;
  const via = r.route.slice(0, -1);
  return `walk it to ${r.target}${routeVia(via)}${via.length ? ',' : ''} `;
}

export function mobilityMap(chess: Chess, color: Color): Map<string, number> {
  const out = new Map<string, number>();
  const parts = chess.fen().split(' ');
  parts[1] = color; parts[3] = '-';
  try {
    for (const mv of new Chess(parts.join(' ')).moves({ verbose: true })) {
      out.set(mv.from, (out.get(mv.from) ?? 0) + 1);
    }
  } catch { /* leave empty */ }
  return out;
}

/** The plan's goal in the plan arc's own id form (`aimsOf`): a passer and a
 *  file by their file, an outpost by its square, the king attack as one. Null
 *  for a plan the arc has no aim for. */
export function planAimKey(kind: string, at: string | null): string | null {
  if (kind === 'king-attack') return 'plan-aim:king-attack';
  if (!at) return null;
  if (kind === 'passer') return `plan-aim:passer:${at[0]}`;
  if (kind === 'open-file') return `plan-aim:file:${at[0]}`;
  if (kind === 'outpost') return `plan-aim:outpost:${at}`;
  return null;
}

/** The trump clause itself, for a list of reasons ("Your passed pawn on d5 is a
 *  long-term trump"); `owner` is the seated possessive. */
export function passerTrumpClause(owner: string, square: string): string {
  return `${owner} passed pawn on ${square} is a long-term trump`;
}

/** A passer as the structure's long-term fact: yours a trump, theirs the danger. */
export function passerTrumpSentence(square: string, own: boolean): string {
  return own
    ? `${passerTrumpClause('Your', square)} — every trade that clears its path makes it stronger.`
    : `Their passed pawn on ${square} is the danger — get a piece in front of it and blockade before it runs.`;
}

// ── THE STRUCTURE'S PLAN (census 9, 2026-10-20) ─────────────────────────────
// One file owns every sentence that says what a pawn structure asks of you:
// the trump (a passer, its blockade, the race), the isolani and the named
// skeletons. They moved here from boardPlan.ts and positionReadingService.ts,
// which each had their own copy of the isolani.


const STRUCT_PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The square directly in front of a pawn (toward promotion), or null off-board. */
function frontSquare(square: string, color: Color): string | null {
  const file = square[0];
  const rank = Number.parseInt(square[1] ?? '0', 10);
  const nr = color === 'w' ? rank + 1 : rank - 1;
  if (nr < 1 || nr > 8) return null;
  return `${file}${nr}`;
}

/** What blocks a passer's advance: 'clear' (front empty, push it), 'enemy' (a
 *  blockader sits in front — the push is stopped), or 'friendly' (self-blocked).
 *  Board-true via chess.js so the plan never says "push it" on a pawn that can't
 *  move (B#4). Returns the blocker's piece letter when occupied. */
function passerBlock(fen: string, square: string, color: Color): { kind: 'clear' | 'enemy' | 'friendly'; piece?: string } {
  const front = frontSquare(square, color);
  if (!front) return { kind: 'clear' }; // already on the promotion rank — nothing ahead
  try {
    const occ = new Chess(fen).get(front as Square);
    if (!occ) return { kind: 'clear' };
    return { kind: occ.color === color ? 'friendly' : 'enemy', piece: occ.type };
  } catch { return { kind: 'clear' }; }
}

/** The most advanced pawn square in a list, for the given colour. */
function mostAdvanced(squares: string[], color: Color): string | null {
  if (squares.length === 0) return null;
  return [...squares].sort((a, b) => stepsToPromote(a, color) - stepsToPromote(b, color))[0];
}


/**
 * The plan the structure dictates for the STUDENT, or null when the structure
 * has no canonical single plan. Priority: a passed pawn (yours = push, theirs =
 * blockade) outranks an isolani read, because a passer is the more forcing
 * feature.
 */
/**
 * A plan's TEXT and its stable IDENTITY.
 *
 * `planMemory.stepPlan` decided "has the plan changed?" by comparing the
 * rendered SENTENCE, so every plan that names a square which MOVES re-announced
 * itself on each push — "your passed pawn on b5" became "on b6" and read as a
 * brand-new plan. Comparing rendered prose to establish identity is the same
 * anti-pattern as scraping squares back out of a sentence. The `id` names the
 * plan KIND (and the race VERDICT, because a flip genuinely is a new plan); it
 * deliberately omits the square, so advancing the pawn you were told to advance
 * is not a change of plan.
 */
export interface StructurePlanFact {
  text: string;
  id: string;
  /** The plan arc's aim key for the same goal (`planAimKey`), so the structure
   *  trump and the plan thread are one claim (census 9). */
  aim?: string;
  /** The positional read's key for the same idea (`positionalRead` passer
   *  key), so the two lanes that both read one passer are one claim to the
   *  say-once memory (fresh-game walk 2026-09-27: "their passed pawn on h2"
   *  spoken at move 18 by one, at move 21 by the other). */
  ideaKey?: string;
  /** The squares the plan is about (the passer), coupled at emission so the
   *  decider can see "push your d3 pawn" and "escort the d3 pawn" are one
   *  claim (one thread per move, probe 2026-10-17). */
  squares?: string[];
}

/** The text alone — the shape four existing callers want. */
export function structurePlan(fen: string, studentColor: Color): string | null {
  return structurePlanFact(fen, studentColor)?.text ?? null;
}

export function structurePlanFact(fen: string, studentColor: Color): StructurePlanFact | null {
  const s = describeStructure(fen);
  if (!s) return null;
  const opp: Color = studentColor === 'w' ? 'b' : 'w';

  // Passed pawns — the most forcing structural feature. But "push it" is only
  // honest when the pawn can actually advance (B#4): a blockaded passer needs the
  // blockader challenged first, and a self-blocked one needs its path cleared.
  const mine = mostAdvanced(s.pawns.passedPawns[studentColor], studentColor);
  if (mine) {
    const block = passerBlock(fen, mine, studentColor);
    if (block.kind === 'enemy') {
      return { id: 'passer-blockaded-enemy', aim: `plan-aim:passer:${mine[0]}`, ideaKey: `student-passer-${mine[0]}`, squares: [mine], text: `Your passed pawn on ${mine} is a trump, but their ${STRUCT_PIECE_NOUN[block.piece ?? 'p']} blockades it — challenge or dislodge that blockader before it can run.` };
    }
    if (block.kind === 'friendly') {
      return { id: 'passer-blockaded-friendly', aim: `plan-aim:passer:${mine[0]}`, ideaKey: `student-passer-${mine[0]}`, squares: [mine], text: `Your passed pawn on ${mine} is a trump, but your own ${STRUCT_PIECE_NOUN[block.piece ?? 'p']} sits in its path — clear the way before it can advance.` };
    }
    // 🚨 THE ELSE-CHAIN DEFECT (found reading the code, 2026-09-17). Everything
    // below used to be unreachable whenever the student had a passer of their
    // own, so with runners on BOTH wings the coach said "push it and make them
    // deal with the promotion" and never once checked whether THEIRS queens
    // first. That is the coach telling you to run a race it has not looked at.
    // The race clause carries its own instruction (push, or stop theirs first),
    // so it REPLACES the bare push rather than sitting beside it.
    //
    // The register is pinned to 'live' by THIS function's own prose — every
    // sentence here is present tense ("is the trump here"), so the caller does
    // not get to choose it. Review gets the retrospective wording through the
    // `[plan-race]` facet instead.
    // ONLY a PASSER race may stand in for the passer plan. Reading real games
    // caught this: at Karpov–Kasparov move 14 White has a passed d-pawn, and an
    // unfiltered race handed back the FILE-collision clause — so the student was
    // told about the c-file and the passed pawn was never mentioned at all. A
    // race replaces this plan only when it is about the very thing this plan is
    // about; the file collision reaches review through its own `[plan-race]`
    // facet, where it sits BESIDE the plan instead of deleting it.
    const race = detectPlanRace(fen, studentColor);
    const raceText = race?.kind === 'passer-race' ? planRaceClause(fen, studentColor, 'live') : null;
    if (race?.kind === 'passer-race' && raceText) {
      return {
        id: `passer-race:${race.youQueenFirst ? 'you' : 'them'}`,
        text: `${openSentence(raceText)}.`,
      };
    }
    return { id: 'passer-mine', aim: `plan-aim:passer:${mine[0]}`, ideaKey: `student-passer-${mine[0]}`, squares: [mine], text: `Your passed pawn on ${mine} is the trump here — push it and make them deal with the promotion.` };
  }
  const theirs = mostAdvanced(s.pawns.passedPawns[opp], opp);
  if (theirs) {
    return { id: 'passer-theirs', ideaKey: `opponent-passer-${theirs[0]}`, squares: [theirs], text: passerTrumpSentence(theirs, false) };
  }

  // THE ISOLANI — one definition and one sentence, shared with the named
  // structure (census 9: this branch had its own "central isolated pawn"
  // reading, any rank, and its own plan text beside namedPawnStructure's).
  // The student's own isolated pawn first, the named isolani before the
  // broad one; then theirs the same way (the coverage measure caught an
  // opponent's isolani spoken over the student's own isolated e-pawn).
  const iso = isolaniStructure(fen, studentColor);
  const named = iso ? { id: iso.mine ? 'iqp-mine' : 'iqp-theirs', ideaKey: `structure:${iso.name}`, squares: [iso.square], text: `${openSentence(iso.name)} — ${iso.plan}.` } : null;
  if (named && iso?.mine) return named;
  // Any OTHER isolated d- or e-pawn (an enemy d-pawn still on the file, a pawn
  // on the 3rd/6th rank, an e-pawn): not the named isolani with its outposts,
  // but still a pawn no pawn can guard — keep pieces on, or trade toward it.
  const centralFile = (sq: string): boolean => sq[0] === 'd' || sq[0] === 'e';
  const myIso = s.pawns.isolatedPawns[studentColor].filter(centralFile)[0];
  if (myIso) {
    return { id: 'iqp-mine', squares: [myIso], text: `You're playing with the isolated pawn on ${myIso} — keep pieces on and use the open lines for activity; don't drift into the endgame where it's a target.` };
  }
  if (named) return named;
  const theirIso = s.pawns.isolatedPawns[opp].filter(centralFile)[0];
  if (theirIso) {
    return { id: 'iqp-theirs', squares: [theirIso], text: `They have the isolated pawn on ${theirIso} — trade pieces and pile onto it; the endgame is where it falls.` };
  }

  return null;
}

/** A NAMED PAWN STRUCTURE + its standing plan — Naroditsky's closing lesson
 *  ("catalogue the typical structures from your openings and their plans"). This
 *  is the deterministic proxy for his "we've move-ordered into a French" teaching:
 *  the pawn SKELETON, not the move order, names the family. Recognises the few
 *  clearest, highest-frequency skeletons; returns null otherwise (empty > vague).
 *  Pure pawn geometry (G3). */
export function namedPawnStructure(
  fen: string,
  /** The student's seat — REQUIRED: "you hold the isolani" is seat-relative, and
   *  it used to be hardcoded to White (a Black student was told they held
   *  White's pawn). */
  studentColor: Color,
): { name: string; plan: string } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const wp = new Set<string>(); const bp = new Set<string>();
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p') (cell.color === 'w' ? wp : bp).add(cell.square);
  }
  const w = (s: string): boolean => wp.has(s);
  const b = (s: string): boolean => bp.has(s);
  const fileCount = (set: Set<string>, file: string): number => [...set].filter((s) => s[0] === file).length;
  // FRENCH / ADVANCE CHAIN — White d4+e5 vs Black d5+e6, the locked chain.
  if (w('d4') && w('e5') && b('d5') && b('e6')) {
    // SEATED (hand walk 1600, Caro-Kann as Black: "Black hits d4 with …c5").
    return studentColor === 'w'
      ? { name: 'French-type pawn chain', plan: 'the break comes at the base of the chain — they hit d4 with …c5 and …f6; you defend the head on e5 and play on the kingside' }
      : { name: 'French-type pawn chain', plan: 'the break comes at the base of the chain — you hit d4 with …c5 and …f6; they defend the head on e5 and play on the kingside' };
  }
  // CLOSED CENTRE — White d5+e4 vs Black d6+e5. Named by the STRUCTURE, never
  // by an opening: the same chain arises from the Damiano, the Philidor and the
  // Old Indian, and "King's-Indian" in a Damiano (1000 walk 2026-09-27, 4.d5)
  // named an opening the student was not playing. The plan is the chain's own.
  if (w('d5') && w('e4') && b('d6') && b('e5')) {
    // The queenside break is c5 only while c5 is free: with Black's own pawn
    // already on c5 (the Benoni/Czech chain) White breaks with b4 (manual claim
    // check 2026-09-30, item 160: "you break on the queenside with c5" there).
    const qBreak = b('c5') ? 'b4' : 'c5';
    return studentColor === 'w'
      ? { name: 'Closed centre', plan: `the wings decide: they storm the kingside with …f5-f4 and a pawn avalanche; you break on the queenside with ${qBreak}` }
      : { name: 'Closed centre', plan: `the wings decide: you storm the kingside with …f5-f4 and a pawn avalanche; they break on the queenside with ${qBreak}` };
  }
  const iso = isolaniStructure(fen, studentColor);
  if (iso) return { name: iso.name, plan: iso.plan };
  // HANGING PAWNS — c- and d-pawns abreast on the 4th/5th with no b/e neighbours.
  if (w('c4') && w('d4') && fileCount(wp, 'b') === 0 && fileCount(wp, 'e') === 0) {
    return studentColor === 'w'
      ? { name: 'You have the hanging pawns', plan: 'they grip the centre and can lunge with d5 or c5 — but if they’re fixed and blockaded they turn into two weaknesses' }
      : { name: 'They have the hanging pawns', plan: 'they grip the centre and threaten a d5 or c5 lunge — provoke and blockade them to make them targets' };
  }
  if (b('c5') && b('d5') && fileCount(bp, 'b') === 0 && fileCount(bp, 'e') === 0) {
    return studentColor === 'w'
      ? { name: 'They have the hanging pawns', plan: 'they grip the centre and threaten a …d4 or …c4 lunge — provoke and blockade them to make them targets' }
      : { name: 'You have the hanging pawns', plan: 'they grip the centre and can lunge with …d4 or …c4 — but if they’re fixed and blockaded they turn into two weaknesses' };
  }
  return null;
}

/** THE ISOLATED QUEEN'S PAWN — the one definition (a lone d-pawn on d4/d5 with
 *  no friendly c- or e-pawn and no enemy d-pawn), its seated name and plan. Read
 *  by the named structure AND the structure trump, so both say one sentence. */
export function isolaniStructure(fen: string, studentColor: Color): { name: string; plan: string; square: string; mine: boolean } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const wp = new Set<string>(); const bp = new Set<string>();
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p') (cell.color === 'w' ? wp : bp).add(cell.square);
  }
  const fileCount = (set: Set<string>, file: string): number => [...set].filter((s) => s[0] === file).length;
  // ISOLATED QUEEN’S PAWN — a d-pawn with no friendly c- or e-pawns.
  const holder = (white: boolean): string => ((white ? 'w' : 'b') === studentColor ? 'You hold' : 'They hold');
  for (const [set, white] of [[wp, true], [bp, false]] as const) {
    // An isolani is a d4/d5 pawn — its whole plan is the d4/d5 outpost and the
    // central files (Sicilian walk 2026-09-27: "the isolated queen's pawn … the
    // d5/d4 outpost" about a pawn on d3 in a rook ending).
    const dRank = [...set].find((s) => s === (white ? 'd4' : 'd5') || s === (white ? 'd5' : 'd4'));
    // A true isolani: no friendly c/e-pawn, and no enemy d-pawn on the file.
    const enemy = white ? bp : wp;
    // …and exactly ONE d-pawn, standing in the centre (4th or 5th rank): doubled
    // d-pawns on d6 and d4 are not the isolani this plan describes (hand walk
    // 2026-09-30, Ruy 15…exd4), and a pawn still on d6 is not its outpost story.
    const oneCentral = fileCount(set, 'd') === 1 && !!dRank && (dRank[1] === '4' || dRank[1] === '5');
    if (dRank && oneCentral && fileCount(set, 'c') === 0 && fileCount(set, 'e') === 0 && fileCount(enemy, 'd') === 0) {
      // SEATED, AND WHAT TO DO (walk 2026-09-30: "the owner attacks, the
      // blockader trades down" never said which one the student is).
      const front = `${dRank[0]}${Number(dRank[1]) + (white ? 1 : -1)}`;
      const mine = (white ? 'w' : 'b') === studentColor;
      return {
        name: `${holder(white)} the isolated queen’s pawn`, square: dRank, mine,
        plan: mine
          ? `play actively while pieces are on — the isolani gives you open files and the outposts beside it, but every trade makes it weaker, so avoid simplifying`
          : `blockade it on ${front}, ideally with a knight, and trade pieces — every trade makes the pawn weaker, and in the endgame it becomes a target`,
      };
    }
  }
  return null;
}
