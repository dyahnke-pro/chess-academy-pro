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
import { Chess, type Color, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';
import { isKnightOutpost } from './forwardTeaching';

export const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface Cell { type: string; color: Color; square: string; }

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
    // A piece UNDER ATTACK needs saving, not rerouting — and its mobility reads
    // low precisely because it is boxed in by the attack. Naming it "worst
    // placed, reroute it" buries the live threat under a positional plan.
    try { if (chess.attackers(c.square as Square, enemy).length > 0) continue; } catch { /* keep the candidate */ }
    // A minor on a real OUTPOST is doing a job — one board cannot call the same
    // knight an outpost and the worst piece.
    if ((c.type === 'n' || c.type === 'b') && isKnightOutpost(chess, c.square as Square, studentColorWB)) continue;
    // A PINNED piece is immobile because of the pin, not because it is badly
    // placed; the lesson there is the pin, not a reroute.
    if (mob.get(c.square) === 0 && isPinnedPiece(chess, c.square as Square, studentColorWB)) continue;
    const m = mob.get(c.square) ?? 0;
    if (!worst || m < worst.m) worst = { sq: c.square, type: c.type, m };
  }
  return worst && worst.m <= 1 ? worst : null;
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
export function deriveNextPlans(
  fen: string,
  studentColorWB: Color,
  // The engine's student-POV eval at this position, when the caller has one.
  // The material plan reads the COUNT; the count lies while the material is
  // on its way back (walk 2026-09-23: after Bxf7+ Kxf7 the review said "convert
  // your extra material" at +0.5 for the other side — Ng5+ was about to win the
  // bishop back). With an eval in hand, "extra" must also be an edge.
  opts: { studentPovCp?: number | null } = {},
): string[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  // A MATE ON THE BOARD OUTRANKS EVERY PLAN (WO-STANDARD-01 D-15, prod tape
  // 2026-09-22: with Qxf7# available the coach said "win their weak pawn on
  // h7 — plant your knight on h6"). Rank: mate threat > material > plan. When
  // either side has a mate in one from this position, there IS no plan to
  // state — the mate is the whole story, and the tactic facets already name
  // it. Computed here, in the plan computer, so no surface can rank around it.
  if (mateInOneExists(chess)) return [];
  const struct = describeStructure(fen);
  if (!struct) return [];
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const all = cells(chess);
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  const plans: string[] = [];

  // 1. Enemy king exposed in the centre → open lines and attack it, HOW spelled out.
  const enemyKing = all.find((c) => c.type === 'k' && c.color === enemy);
  const openCentralFile = struct.pawns.openFiles.find((f) => f === 'd' || f === 'e') ?? null;
  if (enemyKing && fullmove >= 8 && 'cdef'.includes(enemyKing.square[0])
    && (enemy === 'w' ? '12'.includes(enemyKing.square[1]) : '78'.includes(enemyKing.square[1]))
    && openCentralFile) {
    // The soft squares in front of a stuck king — where a sac usually lands.
    // Rook clause scales to the rooks the student actually HAS (prescription
    // gate, David 2026-07-22 — never prescribe a piece that isn't there).
    const softSquares = enemy === 'w' ? 'd2 and f2' : 'd7 and f7';
    const rookCount = all.filter((c) => c.type === 'r' && c.color === studentColorWB).length;
    const fileClause = rookCount >= 2
      ? `then double both rooks onto the open ${openCentralFile}-file so they bear straight down on the king; `
      : rookCount === 1
        ? `then swing your rook onto the open ${openCentralFile}-file so it bears straight down on the king; `
        : '';
    plans.push(`the plan from here is to attack their king stuck on ${enemyKing.square} before it ever reaches safety. Here's exactly how: first make sure your OWN king is tucked away, ${fileClause}bring every piece into the attack with tempo — a move that develops AND threatens is worth two; and hunt for a sacrifice on the soft squares ${softSquares} that rips the cover off, because once the king is bare it's checks all the way to mate`);
  }

  // 2. Your passed pawn → push it, HOW spelled out. The king joins the escort
  // ONLY once the queens are off — telling a student to march the king up a
  // middlegame board is phase-blind advice (template-logic sweep, David
  // 2026-07-22: read every authored line as a chess player).
  const passer = struct.pawns.passedPawns[studentColorWB][0];
  if (passer) {
    const queensOn = all.some((c) => c.type === 'q');
    const escort = queensOn
      ? 'escort it with your pieces rather than pushing it alone into danger — the king joins the escort once the queens come off'
      : 'escort it up with your king and pieces rather than pushing it alone into danger';
    plans.push(`the plan from here is to get your passed pawn on ${passer} promoting. Here's how: clear the square in front of it so nothing blocks the road, ${escort}, and advance it one safe square at a time until they have to give up a piece to stop it — a passed pawn's whole job is to run`);
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
    const blockader = all.find((c) => c.type === 'n' && c.color === studentColorWB)
      ?? all.find((c) => c.type === 'b' && c.color === studentColorWB)
      ?? null;
    const blockBit = blockader
      ? `plant your ${blockader.type === 'n' ? 'knight' : 'bishop'} on the square right in front of it, ${block}, so it can never advance to free itself`
      : `control the square right in front of it, ${block}, so it can never advance to free itself`;
    plans.push(`the plan from here is to win their weak pawn on ${weak}. Here's how: ${blockBit}; then stack your heavy pieces on the file to gang up on it, trade off the pieces that defend it one by one, and either win it outright or tie their whole army to babysitting it`);
  }

  // 4. An open file you don't yet own with a heavy piece → seize it, HOW
  // spelled out — only when the student still HAS a rook to put there.
  const myRooks = all.filter((c) => c.type === 'r' && c.color === studentColorWB);
  const myHeavyFiles = new Set(all.filter((c) => (c.type === 'r' || c.type === 'q') && c.color === studentColorWB).map((c) => c.square[0]));
  const freeOpenFile = struct.pawns.openFiles.find((f) => !myHeavyFiles.has(f));
  if (freeOpenFile && myRooks.length > 0) {
    const doubleBit = myRooks.length >= 2 ? 'double the second rook behind the first so nothing can challenge you, and ' : '';
    plans.push(`the plan from here is to seize the open ${freeOpenFile}-file. Here's how: put a rook on it right away before they contest it, ${doubleBit}drive down to the seventh rank where a rook chews through pawns and pins the king back`);
  }

  // 5. You already hold an outpost → dominate from it, HOW spelled out.
  const myOutpost = struct.outposts.find((o) => o.color === studentColorWB);
  if (myOutpost) {
    plans.push(`the plan from here is to make that ${myOutpost.piece === 'n' ? 'knight' : 'bishop'} on ${myOutpost.square} the boss of the board. Here's how: keep a pawn defending it so it stays anchored, refuse any trade that gives it up cheaply, and use it as the anchor to pile your other pieces onto the weakness behind it`);
  }

  // 6. Your worst-placed piece (stuck) → reroute it, HOW spelled out.
  if (fullmove >= 10) {
    const worst = findWorstPlacedPiece(chess, studentColorWB);
    if (worst) {
      plans.push(`the plan from here is to rescue your worst piece, the ${PIECE_NOUN[worst.type]} on ${worst.sq}. Here's how: don't play a single attacking move until it's fixed — spend two or three tempi walking it to a square where it actually bites, because a piece doing nothing means you're effectively playing down a piece`);
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
    const surplus = nonPawnDiff >= 3 ? 'the extra piece'
      : nonPawnDiff >= 2 ? 'the exchange'
      : pawnDiff >= 1 ? `your extra pawn${pawnDiff > 1 ? 's' : ''}`
      : 'your material edge';
    plans.push(`the plan from here is to convert your extra material. Here's how: offer a trade of pieces at every chance but keep the pawns on, steer straight for an endgame where ${surplus} ${surplus.endsWith('s') ? 'are' : 'is'} decisive, and don't get greedy or complicate — simplicity is what wins a won game`);
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
    plans.push(`the plan from here is to make your bishop pair count. Here's how: trade pawns to rip the position open, guard both bishops from any swap, and point them at both wings at once — in an open board two bishops rake the whole thing and simply outgun ${rival}. The pair is only an advantage while both live; you trade one at the very end, when it wins something concrete`);
  }

  return plans;
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
