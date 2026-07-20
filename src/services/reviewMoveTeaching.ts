/**
 * reviewMoveTeaching — grounded per-move "why" for the post-game review WALK.
 *
 * The review walk used to say NOTHING on the student's good/book moves — only
 * a "Good" badge (David 2026-07-19 audit: "there is no coach narration"). This
 * fills that gap for the student's opening/early moves with a CONCRETE,
 * board-true note: what the move CONTROLS or the plan it serves — never a
 * restatement of the move ("develops the knight to f3" is banned; the student
 * saw the move — narration rules #2/#3/#6). Every claim is computed from
 * chess.js + boardStructure (G0/G3); nothing is LLM-invented, nothing is
 * overstated (David 2026-07-19: "don't state non-applicable reasons"). Returns
 * null when the position deserves silence (a quiet move with no nameable idea).
 *
 * REVIEW register (retrospective, the student's own game) — NOT the present-
 * tense Watch/Learn teaching voice. It states the idea the move served.
 */
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { describeStructure } from './boardStructure';

const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);
const BROAD_CENTER = new Set(['c4', 'c5', 'd4', 'd5', 'e4', 'e5', 'f4', 'f5']);
const FIANCHETTO = new Set(['b2', 'g2', 'b7', 'g7']);

type Sq = Parameters<Chess['get']>[0];
/** A central square the piece genuinely CONTROLS = empty or enemy-occupied.
 *  A square held by the mover's OWN pawn is defense, not "bearing down on" —
 *  excluding it avoids overstating (David 2026-07-19: no non-applicable
 *  reasons — don't say a blocked bishop "rakes toward" its own pawn). */
function controlsCentral(chess: Chess, s: string, mover: 'w' | 'b'): boolean {
  if (!CENTER.has(s)) return false;
  const occ = chess.get(s as Sq);
  return !occ || occ.color !== mover;
}

/** Central squares a knight on `sq` attacks (geometry) and genuinely controls
 *  (empty or enemy — not a square held by its own pawn). Board-true. */
function knightCentralTargets(chess: Chess, sq: string, mover: 'w' | 'b'): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]) - 1;
  const deltas = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const out: string[] = [];
  for (const [df, dr] of deltas) {
    const nf = f + df;
    const nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const s = `${String.fromCharCode(97 + nf)}${nr + 1}`;
    if (controlsCentral(chess, s, mover)) out.push(s);
  }
  return out.sort();
}

/** Central squares a bishop on `sq` bears on, walking each diagonal until a
 *  piece blocks — only squares it genuinely controls (empty/enemy), and the
 *  ray stops at the first piece of either color. */
function bishopCentralTargets(chess: Chess, sq: string, mover: 'w' | 'b'): string[] {
  const f0 = sq.charCodeAt(0) - 97;
  const r0 = Number(sq[1]) - 1;
  const out: string[] = [];
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    let f = f0 + df;
    let r = r0 + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const s = `${String.fromCharCode(97 + f)}${r + 1}`;
      if (controlsCentral(chess, s, mover)) out.push(s);
      if (chess.get(s as Sq)) break; // blocked — the ray stops at the first piece
      f += df;
      r += dr;
    }
  }
  return out.sort();
}

function list(sqs: string[]): string {
  if (sqs.length === 1) return sqs[0];
  if (sqs.length === 2) return `${sqs[0]} and ${sqs[1]}`;
  return `${sqs.slice(0, -1).join(', ')}, and ${sqs[sqs.length - 1]}`;
}

type Struct = NonNullable<ReturnType<typeof describeStructure>>;

/**
 * §1 TARGET clause — a named OPPONENT weakness the move CREATED, computed from
 * the before→after structure delta (G0; only weaknesses the detector actually
 * finds, never guessed). Returns the "because" tail (no leading punctuation),
 * or null. The mover is always the student here (buildReviewSegments only calls
 * this on student moves), so the enemy is always the opponent.
 */
function createdEnemyWeakness(before: Struct, after: Struct, mover: 'w' | 'b'): string | null {
  const enemy: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  // A NEW isolated enemy pawn = a lasting, board-true target.
  const newIso = after.pawns.isolatedPawns[enemy].filter((s) => !before.pawns.isolatedPawns[enemy].includes(s));
  if (newIso.length) return `the opponent's ${newIso[0][0]}-pawn is isolated now — a target with no neighbor to defend it`;
  // NEW doubled enemy pawns on a file.
  const newDbl = after.pawns.doubledFiles[enemy].filter((f) => !before.pawns.doubledFiles[enemy].includes(f));
  if (newDbl.length) return `the opponent is left with doubled pawns on the ${newDbl[0]}-file`;
  return null;
}

/**
 * Build a grounded review note for ONE move. `fenBefore` is the position
 * before the move; `san` is the move played. Returns a concrete, board-true
 * sentence, or null for silence.
 */
export function buildReviewMoveTeaching(
  fenBefore: string,
  san: string,
): string | null {
  const chess = new Chess(fenBefore);
  let mv: Move;
  try {
    const applied = chess.move(san);
    if (!applied) return null;
    mv = applied;
  } catch {
    return null;
  }
  const toRank = Number(mv.to[1]);

  // Castling — the idea is king safety + rook activation, not "castles".
  if (mv.san.startsWith('O-O-O')) {
    return 'The king finds shelter on the queenside and the rook swings toward the open center.';
  }
  if (mv.san.startsWith('O-O')) {
    return 'The king is tucked safely away and the rook connects to the center.';
  }

  // Minor-piece development — carry what the picture doesn't: the squares it
  // now bears on. Never "develops the knight" (restates the move).
  if (mv.piece === 'n') {
    const targets = knightCentralTargets(chess, mv.to, mv.color);
    if (targets.length) return `The knight bears down on ${list(targets)}, fighting for the center.`;
    // no central target → fall through to the light developing tag
  }
  if (mv.piece === 'b') {
    if (FIANCHETTO.has(mv.to)) return 'The bishop takes aim along the long diagonal.';
    const targets = bishopCentralTargets(chess, mv.to, mv.color);
    if (targets.length) return `The bishop rakes toward ${list(targets)}.`;
    // no central target → fall through to the light developing tag
  }

  // Pawn moves — structural change (applies to pushes AND captures), then
  // center stake / space for quiet pushes.
  if (mv.piece === 'p') {
    // Structural change: did the move open a file for the mover, or create an
    // outpost? Compare the structure before vs after (board-true delta). This
    // catches captures like exd6 that leave a half-open file behind.
    const before = describeStructure(fenBefore);
    const after = describeStructure(chess.fen());
    if (before && after) {
      const moverKey = mv.color; // 'w' | 'b'
      // §1: a created enemy weakness is the strongest "because" — name it first.
      const target = createdEnemyWeakness(before, after, moverKey);
      const gainedHalfOpen = after.pawns.halfOpenFiles[moverKey].filter(
        (f) => !before.pawns.halfOpenFiles[moverKey].includes(f),
      );
      if (gainedHalfOpen.length) {
        return target
          ? `Opens the ${gainedHalfOpen[0]}-file for the rooks — and ${target}.`
          : `Opens the ${gainedHalfOpen[0]}-file for the rooks.`;
      }
      const newOutpost = after.outposts.find(
        (o) => o.color === moverKey && !before.outposts.some((b) => b.square === o.square && b.color === o.color),
      );
      if (newOutpost) {
        // The outpost's defining property IS the "because": no enemy pawn can
        // ever challenge it (that's what the detector guarantees).
        return `Secures an outpost on ${newOutpost.square} — no enemy pawn can ever challenge it.`;
      }
      if (target) {
        // A pawn move that created a weakness without opening a file / outpost
        // (e.g. a capture that isolates an enemy pawn) — the target IS the point.
        return `${mv.captured ? 'The capture means' : 'Now'} ${target}.`;
      }
    }
    // Quiet central push (not a capture) — stake the center / gain space.
    if (!mv.captured && CENTER.has(mv.to)) {
      return 'Stakes a claim in the center and opens lines for the pieces.';
    }
    if (!mv.captured && BROAD_CENTER.has(mv.to) && (toRank === 4 || toRank === 5)) {
      return 'Gains space and cramps the opponent.';
    }
    // LUFT — a pawn beside the CASTLED king making an escape square. Board-true:
    // the king sits on its castled back-rank square and this pawn just advanced
    // one rank on an adjacent file. That's back-rank insurance, a real teaching
    // point currently spoken as silence.
    if (!mv.captured) {
      const king = chess.board().flat().find((c) => c && c.type === 'k' && c.color === mv.color);
      const backRank = mv.color === 'w' ? '1' : '8';
      const luftRank = mv.color === 'w' ? '3' : '6';
      if (
        king
        && king.square[1] === backRank
        && (king.square[0] === 'g' || king.square[0] === 'b' || king.square[0] === 'c') // a castled king
        && Math.abs(mv.to.charCodeAt(0) - king.square.charCodeAt(0)) <= 1
        && mv.to[1] === luftRank
      ) {
        return 'Makes luft — a breathing hole for the king, so a back-rank check can never turn into mate.';
      }
    }
    return null;
  }

  // Any other DEVELOPING move in the opening (a minor with no central target, or
  // a queen/rook stepping into play) gets a light developing TAG — R2 (Danya):
  // even a "nothing" move carries a tag ("standard development"), and the tag is
  // information; ≥80% of opening moves should say SOMETHING. The house-voice pass
  // varies the phrasing so it never reads as filler. King shuffles and quiet pawn
  // moves (handled above) stay silent — those aren't development.
  const DEV_WORD: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
  if (DEV_WORD[mv.piece]) {
    return `The ${DEV_WORD[mv.piece]} comes into the game — quiet development, getting the pieces coordinated.`;
  }
  return null;
}

/**
 * §7 ENDGAME PHASE — name the endgame when the position IS one and BOTH sides
 * share the same heaviest major piece (the clean "rook endgame" / "queen
 * endgame" Danya names). Mixed major material ("Q vs R") stays null — the phase
 * is muddier and naming it risks overstatement (empty > generic). Board-true
 * from chess.js + boardStructure. Returns a phrase (no leading "We've reached")
 * or null. Announced ONCE by the caller via a one-shot flag.
 */
export function nameEndgamePhase(fen: string): string | null {
  const s = describeStructure(fen);
  if (!s || s.material.endgameType === null) return null;
  let wq = 0, bq = 0, wr = 0, br = 0, wm = 0, bm = 0;
  try {
    for (const row of new Chess(fen).board()) {
      for (const cell of row) {
        if (!cell) continue;
        const w = cell.color === 'w';
        if (cell.type === 'q') { if (w) wq++; else bq++; }
        else if (cell.type === 'r') { if (w) wr++; else br++; }
        else if (cell.type === 'n' || cell.type === 'b') { if (w) wm++; else bm++; }
      }
    }
  } catch { return null; }
  if (wq > 0 && bq > 0) return 'a queen endgame — king safety and precision decide it';
  if (wq === 0 && bq === 0 && wr > 0 && br > 0) return 'a rook endgame — activity over material, rooks belong behind passed pawns';
  if (wq + bq + wr + br === 0) {
    return wm + bm > 0 ? 'a minor-piece endgame — the better piece and the outside pawn win it' : 'a king-and-pawn endgame — every tempo counts';
  }
  return null; // mixed major pieces → skip
}

/** Name a mate PATTERN when the move is checkmate and the geometry is
 *  unambiguous (back-rank / smothered). Returns null otherwise — the board
 *  shows the mate; we only add the NAME when we're certain (G0). */
function nameMatePattern(chessAfterMate: Chess, mv: Move): string | null {
  if (!chessAfterMate.isCheckmate()) return null;
  const mated: 'w' | 'b' = chessAfterMate.turn(); // side to move is the mated side
  // Locate the mated king.
  let kingSq: string | null = null;
  for (const row of chessAfterMate.board()) {
    for (const cell of row) if (cell && cell.type === 'k' && cell.color === mated) kingSq = cell.square;
  }
  if (!kingSq) return null;
  const kf = kingSq.charCodeAt(0) - 97;
  const kr = Number(kingSq[1]) - 1;

  // Smothered: a KNIGHT delivered it and every square around the king is
  // occupied by the mated side's OWN pieces (no empty flight, no enemy blocker).
  if (mv.piece === 'n') {
    let allOwn = true;
    let any = false;
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        const nf = kf + df;
        const nr = kr + dr;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        any = true;
        const occ = chessAfterMate.get(`${String.fromCharCode(97 + nf)}${nr + 1}` as Sq);
        if (!occ || occ.color !== mated) { allOwn = false; break; }
      }
      if (!allOwn) break;
    }
    if (any && allOwn) return "Smothered mate — the king boxed in by its own pieces.";
  }

  // Back-rank: the mated king sits on its own back rank, and its three forward
  // squares are all blocked by its OWN pawns (the classic "luft never made").
  const backRank = mated === 'w' ? 0 : 7;
  if (kr === backRank && (mv.piece === 'r' || mv.piece === 'q')) {
    const fwd = mated === 'w' ? 1 : -1;
    let blocked = 0;
    let flight = 0;
    for (let df = -1; df <= 1; df++) {
      const nf = kf + df;
      const nr = kr + fwd;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      flight++;
      const occ = chessAfterMate.get(`${String.fromCharCode(97 + nf)}${nr + 1}` as Sq);
      if (occ && occ.type === 'p' && occ.color === mated) blocked++;
    }
    if (flight > 0 && blocked === flight) return 'Back-rank mate — the king trapped behind its own pawns.';
  }
  return null;
}

/**
 * §7 CONVERSION teaching — the MATE PATTERN when a student move is a detectable
 * back-rank / smothered mate; else null. (Endgame-phase naming is a one-shot,
 * handled by the caller via `nameEndgamePhase` + a flag, so it fires exactly
 * once per game rather than on every endgame ply.) SILENCE otherwise — no
 * per-move filler in the middlegame. All computed (chess.js); nothing invented.
 */
export function buildReviewConversionTeaching(
  fenBefore: string,
  san: string,
): string | null {
  const chess = new Chess(fenBefore);
  let mv: Move;
  try {
    const applied = chess.move(san);
    if (!applied) return null;
    mv = applied;
  } catch {
    return null;
  }
  const mate = nameMatePattern(chess, mv);
  if (mate) return mate;

  // KING CENTRALIZATION — the king is a fighting piece in the endgame. When the
  // heavy pieces are off and the king steps toward the center, that's a real
  // technique worth naming (currently silent). Board-true: no queens, light
  // material, and the king's move reduces its distance to the center.
  if (mv.piece === 'k' && !mv.san.startsWith('O-O')) {
    let pieces = 0;
    let queen = false;
    for (const row of chess.board()) {
      for (const c of row) {
        if (!c || c.type === 'k') continue;
        pieces++;
        if (c.type === 'q') queen = true;
      }
    }
    const centerDist = (sq: string): number =>
      Math.max(Math.abs((sq.charCodeAt(0) - 97) - 3.5), Math.abs((Number(sq[1]) - 1) - 3.5));
    if (!queen && pieces <= 8 && centerDist(mv.to) < centerDist(mv.from)) {
      return "The king marches toward the center — in the endgame it's a fighting piece, and an active king often decides the game.";
    }
  }
  return null;
}
