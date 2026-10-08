// opponentMoveReads — READING THEIR MOVE, and testing what it prevents
// (computers batch 2, from the reference coach's catalogue: docs/plans/
// swarm-inputs/digests/teach-brief.md §D/§E).
//
// Every read here answers one question about the opponent's last move that no
// other computer answers, from the STUDENT's seat, and each is a board fact
// (chess.js) or an engine fact (the lines the surface already holds) — never a
// guess about what they were thinking:
//
//   quietDanger      — their checks were there; the QUIET move is the threat
//                      (it creates a mate in one that was not on the board).
//   ideaCondition    — their knight jump bites only if your rook / queen
//                      stands on one square, and the engine says don't.
//   obligationLifts  — the piece of yours that hung no longer does, because
//                      their move took the attacker away: no need to guard it.
//   bishopOffPlan    — their bishop came out against their own setup, or onto
//                      a diagonal one safe pawn of yours shuts.
//   wronglyExpected  — they took material the count calls free; the engine
//                      says it is not.
//   helpedYou        — their move makes the engine's move for you possible
//                      (it lost material before, or hits the piece they moved).
//   wedgedPawn       — their pawn wedged by your king: take it so that no pawn
//                      of theirs stands there afterwards.
//
// Each returns a `Read` with its PROOF coupled at emission (proof.ts) and its
// STAKES where material rides on it (factStakes.ts). A read that names a move
// for the student is marked `namesMove` so the caller can hold it where the
// move is not earned (the door's moveAdvice). Pure: chess.js + engine lines
// handed in. No Dexie, no LLM, no randomness — stems rotate on the FEN.
import { Chess, type Move, type Square } from 'chess.js';
import { asIfToMove, signedLegalSeeFor } from './positionReadingService';
import { computeMustDefend } from './threatOut';
import { materialBalance, MATERIAL_VALUE } from './pieceValues';
import { MATE_POINTS, forkPoints, type FactStakes } from './factStakes';
import { legalLineProof, squaresProof, type Proof } from './proof';
import { sayMoveClause, sayMoveNoun } from './spokenMove';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export type ReadKind =
  | 'quiet-danger' | 'idea-condition' | 'obligation-lifts' | 'bishop-off-plan'
  | 'wrongly-expected' | 'helped-you' | 'wedged-pawn';

export interface Read {
  kind: ReadKind;
  text: string;
  proof: Proof;
  squares: string[];
  stakes?: FactStakes;
  /** The read names a move for the student — hold it where the move is not
   *  earned (the door's moveAdvice decides, never this module). */
  namesMove: boolean;
  /** Say-once key: the same read on the same geometry is one claim a game. */
  claim: string;
}

/** An engine line as the surfaces hand it in (white-POV cp, UCI moves). */
export interface EngineLine { moves: readonly string[]; evaluation: number; mate: number | null }

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const MATE_CP = 100000;

function other(c: 'w' | 'b'): 'w' | 'b' { return c === 'w' ? 'b' : 'w'; }
function theirSan(m: Move): string { return m.color === 'b' ? `…${m.san}` : m.san; }

/** A line's value from `seat`'s side, in centipawns. */
export function seatCp(l: EngineLine, seat: 'w' | 'b'): number {
  const sign = seat === 'w' ? 1 : -1;
  return (l.mate != null ? (l.mate > 0 ? MATE_CP : -MATE_CP) : l.evaluation) * sign;
}

/** The first move of an engine line as SAN on `fen`, or null. */
export function uciToSan(fen: string, uci: string | undefined): string | null {
  if (!uci) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}

/** Every move that mates at once for the side to move. */
export function matesInOne(fen: string): Move[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  return c.moves({ verbose: true }).filter((m) => {
    try { const d = new Chess(fen); d.move(m.san); return d.isCheckmate(); } catch { return false; }
  });
}

function kingSquare(c: Chess, color: 'w' | 'b'): string | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

function around(sq: string): string[] {
  const f = sq.charCodeAt(0); const r = Number(sq[1]); const out: string[] = [];
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (!df && !dr) continue;
    const ff = f + df; const rr = r + dr;
    if (ff >= 97 && ff <= 104 && rr >= 1 && rr <= 8) out.push(`${String.fromCharCode(ff)}${rr}`);
  }
  return out;
}

/** The piece letters standing on `squares`. */
function piecesAt(c: Chess, squares: readonly string[]): string[] {
  return squares.flatMap((s) => { const p = c.get(s as Square); return p ? [p.type] : []; });
}

// ── 1. QUIET DANGER ─────────────────────────────────────────────────────────

/**
 * "Their checks only draw; the calm rook move bringing in the last attacker is
 * the threat." Their move was QUIET (no capture, no check) while checks were on
 * the board for them, and it creates a mate in one that did not exist before:
 * given the move again they would mate, and the piece they moved takes part.
 */
export function quietDanger(fenBefore: string, san: string, student: 'w' | 'b'): Read | null {
  let before: Chess; let after: Chess; let mv: Move;
  try {
    before = new Chess(fenBefore);
    if (before.turn() === student) return null;
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (mv.captured || after.inCheck()) return null;
  const them = mv.color;
  // The checks the student was watching.
  const checks = before.moves({ verbose: true }).filter((m) => /[+#]/.test(m.san));
  if (checks.length === 0) return null;
  // A mate already on the board before the move is a different story.
  if (matesInOne(fenBefore).length > 0) return null;
  const probe = asIfToMove(after.fen(), them);
  if (!probe) return null;
  const mates = matesInOne(probe);
  if (mates.length === 0) return null;
  const king = kingSquare(after, student);
  if (!king) return null;
  // The moved piece takes part: it gives the mate, or it covers the mating
  // square or a square round the king it did not cover from where it stood.
  const zone = [king, ...around(king)];
  const mate = mates.find((m) => {
    if (m.from === mv.to) return true;
    const d = new Chess(probe); d.move(m.san);
    const now = zone.filter((s) => d.attackers(s as Square, them).includes(mv.to));
    if (now.length === 0) return false;
    const was = new Chess(asIfToMove(fenBefore, them) ?? fenBefore);
    return now.some((s) => !was.attackers(s as Square, them).includes(mv.from));
  });
  if (!mate) return null;
  const quiet = sayMoveNoun(mv.san, fenBefore);
  const mating = sayMoveClause(mate.san, probe);
  const text = rotateStem([
    `Their checks were there, but the quiet move is the real danger: ${quiet} brings another piece in, and next ${mating} with mate.`,
    `Don't watch the checks — watch ${quiet}. It is quiet, and it threatens mate: ${mating}.`,
    `Not a check, but the most dangerous move on the board: after ${quiet}, ${mating} would be mate.`,
  ], stemKeyOf(after.fen()));
  const sq = [mv.to, mate.to, king];
  return {
    kind: 'quiet-danger',
    text,
    proof: { kind: 'line', exact: true, short: `If you ignore it, ${mate.san.replace(/[+#]/g, '')} is mate`, full: `If you ignore it, ${mate.san.replace(/[+#]/g, '')} is mate`, line: { fen: probe, sans: [mate.san] }, squares: sq },
    squares: sq,
    stakes: { points: MATE_POINTS, plies: 2 },
    namesMove: false,
    claim: `quiet-danger:${mv.to}:${mate.san}`,
  };
}

// ── 2. THEIR IDEA'S ONE CONDITION ───────────────────────────────────────────

/**
 * "The knight to c7 bites only if your rook is already on e8." Student to
 * move. A knight jump of theirs hits one big piece of yours today — no fork.
 * One move the engine considers for you puts a rook or queen on the second
 * square that jump would hit; after it the fork wins material and the knight
 * is safe. The engine rates that move clearly below its best, so the condition
 * is real, and the student hears it before they play into it.
 */
export function ideaCondition(fen: string, student: 'w' | 'b', topLines: readonly EngineLine[]): Read | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || board.inCheck() || topLines.length < 2) return null;
  const them = other(student);
  const bestCp = seatCp(topLines[0], student);
  const theirTurn = asIfToMove(fen, them);
  if (!theirTurn) return null;
  const jumps = new Chess(theirTurn).moves({ verbose: true }).filter((m) => m.piece === 'n');
  for (const line of topLines.slice(1)) {
    if (bestCp - seatCp(line, student) < 100) continue;
    const condSan = uciToSan(fen, line.moves[0]);
    if (!condSan) continue;
    const cond = new Chess(fen).move(condSan);
    if (cond.captured || (cond.piece !== 'r' && cond.piece !== 'q')) continue;
    const afterCond = new Chess(fen); afterCond.move(condSan);
    for (const j of jumps) {
      // The jump must be the same move on the real board after the condition.
      let fork: Move;
      const f = new Chess(afterCond.fen());
      try { fork = f.move({ from: j.from, to: j.to }); } catch { continue; }
      // Today, without the condition: does the jump already fork? Then the
      // idea needs no condition.
      const today = new Chess(theirTurn); today.move({ from: j.from, to: j.to });
      const now = knightTargets(today, j.to, student);
      const then = knightTargets(f, j.to, student);
      if (forkPoints(piecesAt(today, now)) >= 3) continue;
      if (!then.includes(cond.to)) continue;
      const win = forkPoints(piecesAt(f, then));
      if (win < 3) continue;
      // The knight must be safe where it lands.
      if (signedLegalSeeFor(f.fen(), j.to, student) > 0) continue;
      const knight = `their knight to ${j.to}`;
      const piece = PIECE[cond.piece];
      const text = rotateStem([
        `Watch ${knight}: today it hits only one piece, but it becomes a fork the moment your ${piece} goes to ${cond.to} — so keep it off ${cond.to}.`,
        `${cap(knight)} needs one thing to work: your ${piece} on ${cond.to}. Don't hand it that.`,
        `Their idea is ${knight}, and it has one condition: your ${piece} on ${cond.to}. Without it, the jump forks nothing.`,
      ], stemKeyOf(fen));
      const proof = legalLineProof(fen, [condSan, fork.san], true);
      if (!proof) continue;
      const squares = [j.to, cond.to, ...then.filter((s) => s !== cond.to)];
      return {
        kind: 'idea-condition',
        text,
        proof: { ...proof, squares },
        squares,
        stakes: { points: win, plies: 2 },
        namesMove: false,
        claim: `idea-condition:${j.to}:${cond.to}`,
      };
    }
  }
  return null;
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/** The student pieces worth a fork (rook, queen, king) a knight on `sq` hits. */
function knightTargets(c: Chess, sq: string, student: 'w' | 'b'): string[] {
  const f = sq.charCodeAt(0); const r = Number(sq[1]); const out: string[] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
    const ff = f + df; const rr = r + dr;
    if (ff < 97 || ff > 104 || rr < 1 || rr > 8) continue;
    const t = `${String.fromCharCode(ff)}${rr}`;
    const p = c.get(t as Square);
    if (p && p.color === student && (p.type === 'r' || p.type === 'q' || p.type === 'k')) out.push(t);
  }
  return out;
}

// ── 3. AN OBLIGATION LIFTS ──────────────────────────────────────────────────

/**
 * "With their bishop back on b3, e5 no longer hangs, so d6 isn't forced."
 * `prevFen` is the board the student last moved from (student to move). A
 * piece of the student's hung there; the student's move left it hanging; their
 * reply moved the very piece that attacked it, and now it no longer hangs.
 */
export function obligationLifts(prevFen: string, studentSan: string, theirSanPlayed: string, student: 'w' | 'b'): Read | null {
  let mid: Chess; let after: Chess; let mv: Move;
  try {
    const p = new Chess(prevFen);
    if (p.turn() !== student) return null;
    mid = new Chess(prevFen); mid.move(studentSan);
    after = new Chess(mid.fen());
    mv = after.move(theirSanPlayed);
  } catch { return null; }
  if (after.inCheck()) return null;
  const owed = computeMustDefend(prevFen, student).pieces;
  const still = computeMustDefend(mid.fen(), student).pieces;
  const now = computeMustDefend(after.fen(), student).pieces;
  for (const x of owed) {
    if (!still.some((s) => s.square === x.square)) continue; // the student guarded it
    if (now.some((s) => s.square === x.square)) continue; // still hangs
    const piece = after.get(x.square as Square);
    if (!piece || piece.color !== student || piece.type !== x.piece.toLowerCase()) continue;
    if (mv.captured || mv.to === x.square) continue;
    // Their moved piece was an attacker of it, and is not any more.
    const asThem = new Chess(asIfToMove(mid.fen(), other(student)) ?? mid.fen());
    if (!asThem.attackers(x.square as Square, other(student)).includes(mv.from)) continue;
    const name = `your ${PIECE[piece.type]} on ${x.square}`;
    const theirs = `their ${PIECE[mv.piece]} on ${mv.to}`;
    const text = rotateStem([
      `With ${theirs}, ${name} no longer hangs — you don't have to spend this move guarding it.`,
      `Notice what their ${PIECE[mv.piece]} gave up by going to ${mv.to}: ${name} isn't attacked any more, so the move you owed it is free again.`,
      `Their ${PIECE[mv.piece]} going to ${mv.to} lifts the pressure: ${name} is safe now, and this move is yours to spend.`,
    ], stemKeyOf(after.fen()));
    const squares = [x.square, mv.from, mv.to];
    const body = `From ${mv.from} their ${PIECE[mv.piece]} hit ${x.square}; from ${mv.to} it no longer wins it`;
    const proof = squaresProof(body, squares);
    if (!proof) continue;
    return {
      kind: 'obligation-lifts', text, proof, squares,
      stakes: { points: MATERIAL_VALUE[piece.type] ?? 1, plies: 2 },
      namesMove: false,
      claim: `obligation-lifts:${x.square}`,
    };
  }
  return null;
}

// ── 4. THEIR BISHOP, AGAINST THEIR OWN SETUP ────────────────────────────────

function diagonalReach(c: Chess, sq: string): string[] {
  const p = c.get(sq as Square);
  if (!p) return [];
  const f0 = sq.charCodeAt(0); const r0 = Number(sq[1]); const out: string[] = [];
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (let k = 1; k < 8; k++) {
      const f = f0 + df * k; const r = r0 + dr * k;
      if (f < 97 || f > 104 || r < 1 || r > 8) break;
      const t = `${String.fromCharCode(f)}${r}`;
      const q = c.get(t as Square);
      if (q && q.color === p.color) break;
      out.push(t);
      if (q) break;
    }
  }
  return out;
}

/**
 * "Their bishop came to c4 by reflex; e6 shuts it out." Their bishop just
 * moved, and either (a) its forward diagonals run straight into their OWN
 * pawn — the move goes against the setup they built — or (b) one safe pawn
 * push of yours, a move the engine rates within half a pawn of its best,
 * shuts the bishop's longest forward diagonal right in front of it.
 */
export function bishopOffPlan(fenBefore: string, san: string, student: 'w' | 'b', topLines: readonly EngineLine[]): Read | null {
  let after: Chess; let mv: Move;
  try {
    const b = new Chess(fenBefore);
    if (b.turn() === student) return null;
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (mv.piece !== 'b' || mv.captured || after.inCheck()) return null;
  const them = mv.color;
  const forward = (sq: string): boolean => (them === 'w' ? Number(sq[1]) > Number(mv.to[1]) : Number(sq[1]) < Number(mv.to[1]));
  // (a) their own pawn right in front of the bishop on a forward diagonal.
  const f0 = mv.to.charCodeAt(0); const r0 = Number(mv.to[1]); const dir = them === 'w' ? 1 : -1;
  const blockers: string[] = [];
  for (const df of [1, -1]) {
    const t = `${String.fromCharCode(f0 + df)}${r0 + dir}`;
    if (!/^[a-h][1-8]$/.test(t)) continue;
    const q = after.get(t as Square);
    if (q && q.color === them && q.type === 'p') blockers.push(t);
  }
  const reach = diagonalReach(after, mv.to).filter(forward);
  if (blockers.length === 2 || (blockers.length === 1 && reach.length <= 2)) {
    const theirs = `their bishop on ${mv.to}`;
    const text = rotateStem([
      `${cap(theirs)} runs straight into their own pawn on ${blockers[0]} — that move goes against their own setup.`,
      `${cap(theirs)} is blocked by its own pawn on ${blockers[0]}: a developing move that develops nothing.`,
    ], stemKeyOf(after.fen()));
    const squares = [mv.to, ...blockers];
    const proof = squaresProof(`Its forward diagonal stops at their own pawn on ${blockers[0]}`, squares);
    if (!proof) return null;
    return { kind: 'bishop-off-plan', text, proof, squares, namesMove: false, claim: `bishop-off-plan:${mv.to}` };
  }
  // (b) one safe pawn push of yours shuts its longest forward diagonal.
  const ray = longestForwardRay(after, mv.to, them);
  if (ray.length < 3 || topLines.length === 0) return null;
  const bestCp = seatCp(topLines[0], student);
  for (const line of topLines) {
    if (bestCp - seatCp(line, student) > 50) continue;
    const pSan = uciToSan(after.fen(), line.moves[0]);
    if (!pSan) continue;
    const c = new Chess(after.fen());
    const p = c.move(pSan);
    if (p.piece !== 'p' || p.captured || !ray.includes(p.to)) continue;
    const idx = ray.indexOf(p.to);
    if (idx > 1) continue; // the shut must come close to the bishop
    if (signedLegalSeeFor(c.fen(), p.to, them) > 0) continue;
    const theirs = `their bishop on ${mv.to}`;
    const push = sayMoveNoun(pSan, after.fen());
    const aim = ray[ray.length - 1];
    const text = rotateStem([
      `${cap(theirs)} aims at ${aim}, but one pawn takes the sting out: ${push} shuts the diagonal, and the pawn is safe there.`,
      `One pawn answers ${theirs}: ${push} closes the diagonal toward ${aim}.`,
    ], stemKeyOf(after.fen()));
    const squares = [mv.to, p.to, aim];
    const proof = legalLineProof(after.fen(), [pSan], true);
    if (!proof) continue;
    return { kind: 'bishop-off-plan', text, proof: { ...proof, squares, full: `${pSan} closes the diagonal from ${mv.to} to ${aim}, and they cannot win the pawn on ${p.to}` }, squares, namesMove: true, claim: `bishop-off-plan:${mv.to}` };
  }
  return null;
}

/** The longest diagonal from `sq` pointing into the opponent's half (forward
 *  for `color`), each square up to and including the first piece. */
function longestForwardRay(c: Chess, sq: string, color: 'w' | 'b'): string[] {
  const f0 = sq.charCodeAt(0); const r0 = Number(sq[1]); const dr = color === 'w' ? 1 : -1;
  let best: string[] = [];
  for (const df of [1, -1]) {
    const ray: string[] = [];
    for (let k = 1; k < 8; k++) {
      const f = f0 + df * k; const r = r0 + dr * k;
      if (f < 97 || f > 104 || r < 1 || r > 8) break;
      const t = `${String.fromCharCode(f)}${r}`;
      const q = c.get(t as Square);
      if (q && q.color === color) break;
      ray.push(t);
      if (q) break;
    }
    if (ray.length > best.length) best = ray;
  }
  return best;
}

// ── 5. WHAT THEY WRONGLY EXPECTED ───────────────────────────────────────────

/**
 * "They took the 'free' pawn; your rook lands on the seventh with a threat."
 * Their capture won material by the count (you cannot simply take back), but
 * the engine rates the position at least a pawn and a half better for you
 * than the material says, and its move for you is not a recapture.
 */
export function wronglyExpected(fenBefore: string, san: string, student: 'w' | 'b', topLines: readonly EngineLine[]): Read | null {
  let after: Chess; let mv: Move;
  try {
    const b = new Chess(fenBefore);
    if (b.turn() === student) return null;
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (!mv.captured || !topLines[0]) return null;
  // It looked free: you can't win the capturing piece back on the square.
  if (signedLegalSeeFor(after.fen(), mv.to, student) > 0) return null;
  const studentMaterial = materialBalance(after.fen()) * (student === 'w' ? 1 : -1);
  const engine = seatCp(topLines[0], student);
  if (engine - studentMaterial * 100 < 150) return null;
  const replySan = uciToSan(after.fen(), topLines[0].moves[0]);
  if (!replySan) return null;
  const reply = new Chess(after.fen()).move(replySan);
  if (reply.to === mv.to) return null;
  const proof = legalLineProof(after.fen(), topLines[0].moves.slice(0, 4));
  if (!proof) return null;
  const grabbed = `the ${PIECE[mv.captured]} on ${mv.to}`;
  const text = rotateStem([
    `They took ${grabbed} expecting it to be free — it isn't: ${sayMoveNoun(replySan, after.fen())} hits back, and the grab costs them.`,
    `${cap(grabbed)} looked free to them. It wasn't: ${sayMoveNoun(replySan, after.fen())} hits back.`,
  ], stemKeyOf(after.fen()));
  const squares = [mv.to, reply.from, reply.to];
  return {
    kind: 'wrongly-expected', text, proof: { ...proof, squares }, squares,
    stakes: { points: Math.round((engine - studentMaterial * 100) / 100), plies: 1 },
    namesMove: true,
    claim: `wrongly-expected:${mv.to}`,
  };
}

// ── 6. WHEN THEIR MOVE HELPED YOU ───────────────────────────────────────────

/**
 * "Their bishop to h5 lets you take it with gain of time." The engine's move
 * for you now either (a) was not possible before their move — illegal, or it
 * dropped the piece that played it — or (b) hits the very piece they just
 * moved, with that piece unable to stay. Never a recapture (that is the trade,
 * not a gift).
 */
export function helpedYou(fenBefore: string, san: string, student: 'w' | 'b', topLines: readonly EngineLine[]): Read | null {
  let after: Chess; let mv: Move;
  try {
    const b = new Chess(fenBefore);
    if (b.turn() === student) return null;
    after = new Chess(fenBefore);
    mv = after.move(san);
  } catch { return null; }
  if (!topLines[0] || after.inCheck()) return null;
  const bestSan = uciToSan(after.fen(), topLines[0].moves[0]);
  if (!bestSan) return null;
  const best = new Chess(after.fen()).move(bestSan);
  if (best.captured && best.to === mv.to) return null; // the take-back
  const theirs = theirSan(mv);
  let reason: string | null = null;
  // (b) it hits the piece they just moved, which cannot stay.
  if (mv.piece !== 'p' && mv.piece !== 'k') {
    const now = new Chess(after.fen()); now.move(bestSan);
    const hits = now.attackers(mv.to, student).length > 0;
    const wins = signedLegalSeeFor(asIfToMove(now.fen(), student) ?? now.fen(), mv.to, student) > 0;
    if (hits && wins && !best.captured) reason = `${sayMoveNoun(bestSan, after.fen())} now comes with gain of time — it hits the ${PIECE[mv.piece]} they just moved`;
  }
  // (a) not possible before their move.
  const asYou = asIfToMove(fenBefore, student);
  if (!reason && asYou) {
    let before: Move | null = null;
    try { before = new Chess(asYou).move({ from: best.from, to: best.to, promotion: best.promotion }); } catch { before = null; }
    if (!before) {
      reason = `it makes ${sayMoveNoun(bestSan, after.fen())} possible`;
    } else if (best.piece !== 'k') {
      const was = new Chess(asYou); was.move({ from: best.from, to: best.to, promotion: best.promotion });
      const now = new Chess(after.fen()); now.move(bestSan);
      const lostThen = signedLegalSeeFor(was.fen(), best.to, other(student));
      const lostNow = signedLegalSeeFor(now.fen(), best.to, other(student));
      if (lostThen > 0 && lostNow <= 0) reason = `before it, ${sayMoveNoun(bestSan, after.fen())} dropped material; now it works`;
    }
  }
  if (!reason) return null;
  const proof = legalLineProof(after.fen(), topLines[0].moves.slice(0, 4));
  if (!proof) return null;
  const text = rotateStem([
    `Their ${theirs} helps you: ${reason}.`,
    `Their ${theirs} does you a favour — ${reason}.`,
  ], stemKeyOf(after.fen()));
  const squares = [mv.to, best.from, best.to];
  return { kind: 'helped-you', text, proof: { ...proof, squares }, squares, namesMove: true, claim: `helped-you:${mv.to}:${best.to}` };
}

// ── 7. THE WEDGED PAWN BY YOUR KING ─────────────────────────────────────────

/**
 * "Take on f6 with the queen so no pawn of theirs stays there." Student to
 * move, king on a wing. An enemy pawn stands wedged on the third (sixth) rank
 * in front of it. Of the captures on that square, the one the engine plays
 * leaves no pawn of theirs able to come back there; another capture would
 * be met by a pawn recapture that puts a pawn right back.
 */
export function wedgedPawn(fen: string, student: 'w' | 'b', topLines: readonly EngineLine[]): Read | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || !topLines[0]) return null;
  const them = other(student);
  const king = kingSquare(board, student);
  if (!king) return null;
  const rank = student === 'w' ? 3 : 6;
  const bestSan = uciToSan(fen, topLines[0].moves[0]);
  if (!bestSan) return null;
  const best = new Chess(fen).move(bestSan);
  if (!best.captured || best.captured !== 'p' || Number(best.to[1]) !== rank) return null;
  const w = best.to;
  if (Math.abs(w.charCodeAt(0) - king.charCodeAt(0)) > 1 || Math.abs(Number(w[1]) - Number(king[1])) > 2) return null;
  const pawnBack = (afterCapture: Chess): boolean => afterCapture.moves({ verbose: true })
    .some((m) => m.to === w && m.piece === 'p' && m.color === them);
  const afterBest = new Chess(fen); afterBest.move(bestSan);
  if (pawnBack(afterBest)) return null;
  const proof = legalLineProof(fen, [bestSan], true);
  if (!proof) return null;
  const text = rotateStem([
    `Their pawn on ${w} is wedged right by your king — take it: ${sayMoveClause(bestSan, fen)}, and no pawn of theirs stands there any more.`,
    `Clear the wedge by your king: ${sayMoveClause(bestSan, fen)}. After that, no pawn of theirs can get back to ${w}.`,
  ], stemKeyOf(fen));
  const squares = [w, king, best.from];
  return {
    kind: 'wedged-pawn', text,
    proof: { ...proof, squares, full: `After ${bestSan}, no pawn of theirs can take back on ${w}` },
    squares, namesMove: true, claim: `wedged-pawn:${w}`,
  };
}

/** Every read of THEIR last move from the student's seat, in one call — the
 *  one place the live surfaces and review ask. `prev` is the student's own
 *  previous move (for the obligation that lifted). */
export function readTheirMove(args: {
  fenBefore: string;
  san: string;
  student: 'w' | 'b';
  topLines: readonly EngineLine[];
  prev?: { fenBefore: string; san: string } | null;
}): Read[] {
  const out: Read[] = [];
  const push = (r: Read | null): void => { if (r) out.push(r); };
  try {
    push(quietDanger(args.fenBefore, args.san, args.student));
    if (args.prev) push(obligationLifts(args.prev.fenBefore, args.prev.san, args.san, args.student));
    push(bishopOffPlan(args.fenBefore, args.san, args.student, args.topLines));
    push(wronglyExpected(args.fenBefore, args.san, args.student, args.topLines));
    if (!out.some((r) => r.kind === 'wrongly-expected')) push(helpedYou(args.fenBefore, args.san, args.student, args.topLines));
    const fen = ((): string | null => { try { const c = new Chess(args.fenBefore); c.move(args.san); return c.fen(); } catch { return null; } })();
    if (fen) {
      push(ideaCondition(fen, args.student, args.topLines));
      push(wedgedPawn(fen, args.student, args.topLines));
    }
  } catch { /* a read is a bonus, never a blocker */ }
  return out;
}
