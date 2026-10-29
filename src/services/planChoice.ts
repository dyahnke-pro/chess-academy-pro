// planChoice — HOW THE PLAN WAS FOUND, AND WHY THIS ONE (David 2026-10-15:
// "We need to be able to tell why the computer picked which plan" … "teach the
// user how to think for themselves").
//
// Two reads, both off the board, both shared by every surface through the one
// plan thread:
//
//   THE METHOD — the three questions a strong player asks before choosing a
//   plan (Naroditsky's habit): where is THEIR weakness, which of YOUR pieces is
//   worst, where is YOUR pawn break. Each answer is a board object computed by
//   the computers the plans themselves use, so the method and the plan can
//   never disagree.
//
//   WHY THIS PLAN — the plans come out of `deriveNextPlanFacts` in a fixed
//   order (king, passer, weak pawn, open file, outpost, worst piece, convert,
//   bishop pair). That order is a chess judgement, so its reason is said out
//   loud: what makes the chosen plan's target worth more than the next one's.
//
// Pure: chess.js and the structure computers. No surface imports.
import { Chess, type Color, type Square } from 'chess.js';
import type { PlanFact, PlanKind } from './nextPlans';
import { describeStructure } from './boardStructure';
import { findWorstPlacedPiece, PIECE_NOUN } from './nextPlans';
import { findPawnBreaks, findWeakSquares, seeSequence } from './positionReadingService';
import { computeExchangeLedger, describeProofResult } from './exchangeLedger';
import { enemyKingStuckInCenter } from './reviewSacrifice';
import { orList } from '../utils/andList';
import { computePieceRoute, computeSliderRoute } from './forwardTeaching';
import { readBoardUrgency } from './boardUrgency';
import { askThenAnswer, type PlayedMove } from '../utils/thinkPause';
import { openSentence } from '../utils/openSentence';

interface MethodRead {
  /** Their weakness, as a phrase ("their king, still on e8", "their isolated pawn on d5"). */
  weakness: { phrase: string; square: string; kind: 'king' | 'isolated' | 'hole'; step: string | null; to: string[]; route?: string[] } | null;
  /** The student's worst-placed piece — and, when it has one, the step that
   *  improves it (a rook with an open file to take, a piece with a route). */
  worst: { phrase: string; square: string; step: string | null; to: string[]; route?: string[] } | null;
  /** The student's pawn breaks (squares a pawn can strike). */
  breaks: string[];
  /** Each break as the push that makes it ([from, to]), for its arrow. */
  breakPushes?: Array<[string, string]>;
  /** HELD: the break is a move the student can play right now, on a surface
   *  that names no move unasked (Learn, before the move). It is said as "ready
   *  now — find it", never by square, and carries no arrow or mark. */
  breakHeld?: boolean;
  /** STEP ZERO — checks, captures, threats (David 2026-10-15: "Plans should
   *  also come from CCT"): what cannot wait, read by the one urgency computer
   *  (`readBoardUrgency`). `answer` is what the scan found; `step` is the move
   *  that comes before the plan, or null when nothing is forcing. */
  cct?: { answer: string; step: string | null; squares: string[]; /** The answer about the board it was read on, said after the student's move. */ past: string; /** What crediting the student's move reads when the answer withholds its square. */ credit?: string[] };
}

function flipTo(fen: string, color: Color): string | null {
  try {
    const parts = fen.split(' ');
    parts[1] = color; parts[3] = '-';
    new Chess(parts.join(' '));
    return parts.join(' ');
  } catch { return null; }
}

/** The three questions, answered on this board for the student. */
export function methodRead(
  fen: string, student: Color,
  /** Learn before the student's move: a step that is a legal move right now
   *  is held (LEARN NAMES NO MOVE UNASKED). Review names it — the game is over. */
  holdPlayable = false,
): MethodRead | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = student === 'w' ? 'b' : 'w';
  const struct = describeStructure(fen);
  if (!struct) return null;
  let weakness: MethodRead['weakness'] = null;
  const queensOn = chess.board().some((r) => r.some((c) => c?.type === 'q'));
  const king = chess.board().flat().find((c) => c?.type === 'k' && c.color === enemy);
  if (king && queensOn && enemyKingStuckInCenter(fen, student)) {
    weakness = { phrase: `their king, still on ${king.square}`, square: king.square, kind: 'king', step: `attack their king on ${king.square} before it gets out`, to: [] };
  } else {
    const iso = struct.pawns.isolatedPawns[enemy].find((sq) => 'cdef'.includes(sq[0])) ?? struct.pawns.isolatedPawns[enemy][0];
    if (iso) weakness = { phrase: `their isolated pawn on ${iso}`, square: iso, kind: 'isolated', step: `pile up on their pawn on ${iso}`, to: [] };
    else {
      // A hole their piece already stands on is guarded by being occupied —
      // the weakness is a hole still EMPTY for you to use.
      const holes = findWeakSquares(fen)[enemy === 'w' ? 'white' : 'black'].filter((h) => !chess.get(h));
      if (holes[0]) {
        const route = knightRouteTo(chess, holes[0], student);
        // Held: the first hop is the student's next move, so the route's
        // squares stay unsaid and undrawn — the goal square is the plan.
        const via = route && !holdPlayable ? route.via : [];
        const step = route
          ? `bring your knight on ${route.from} to ${holes[0]}${via.length ? `, by way of ${via.join(' and ')}` : ''} — no pawn of theirs can attack it there`
          : null;
        weakness = { phrase: `the hole on ${holes[0]} that no pawn of theirs can guard`, square: holes[0], kind: 'hole', step, to: route ? [route.from, ...via] : [], ...(route && !holdPlayable ? { route: [route.from, ...route.via, holes[0]] } : {}) };
      }
    }
  }
  const w = findWorstPlacedPiece(chess, student);
  let worst: MethodRead['worst'] = null;
  if (w) {
    const r = computePieceRoute(fen, w.sq as Square) ?? computeSliderRoute(fen, w.sq as Square);
    worst = { phrase: `your ${PIECE_NOUN[w.type]} on ${w.sq}`, square: w.sq, step: r && r.route.length ? `walk your ${PIECE_NOUN[w.type]} to ${r.target}` : null, to: r && !holdPlayable ? [...r.route] : [], ...(r && r.route.length && !holdPlayable ? { route: [w.sq, ...r.route] } : {}) };
  } else {
    // A ROOK WITH NO FILE is the worst piece once a file is open (David
    // 2026-10-15: "improve the rook by placing it on open file"): the plan
    // computer reads that as its own plan, so the method has to name it too,
    // or the answers and the plan disagree.
    const file = struct.pawns.openFiles.find((f) => !chess.board().flat().some((c) => c?.color === student && (c.type === 'r' || c.type === 'q') && c.square[0] === f));
    // The rook that reaches the file in one move is the one named, and its
    // move is the arrow; none reaches → the first rook, with no arrow.
    const asMeFen = flipTo(fen, student);
    const reach = file && asMeFen ? new Chess(asMeFen).moves({ verbose: true }).find((m) => m.piece === 'r' && m.to[0] === file && m.from[0] !== file && !m.captured) : undefined;
    const rook = reach ? { square: reach.from } : file ? chess.board().flat().find((c) => c?.color === student && c.type === 'r') ?? null : null;
    if (file && rook) worst = { phrase: `your rook on ${rook.square}, with no open file yet`, square: rook.square, step: `put a rook on the open ${file}-file`, to: holdPlayable && reach ? [] : [reach ? reach.to : `${file}${student === 'w' ? '1' : '8'}`], ...(reach && !holdPlayable ? { route: [reach.from, reach.to] } : {}) };
  }
  const asMe = chess.turn() === student ? fen : flipTo(fen, student);
  const breaks: string[] = asMe ? findPawnBreaks(asMe) : [];
  const pushes = asMe ? new Chess(asMe).moves({ verbose: true }).filter((m) => m.piece === 'p' && !m.captured && breaks.includes(m.to)) : [];
  const breakPushes = breaks.flatMap((b): Array<[string, string]> => { const m = pushes.find((x) => x.to === b); return m ? [[m.from, m.to]] : []; });
  // A break the student can push right now IS their move: held before the move.
  const breakHeld = holdPlayable && chess.turn() === student && breakPushes.length > 0;
  // A capture one reply away is the student's move too (OS-11 g4 9…dxe4: "take
  // their pawn on c3, the piece attacking your pawn" on their move, played two
  // moves later) — held whoever is to move.
  const cct = cctRead(fen, student, holdPlayable);
  if (!weakness && !worst && breaks.length === 0 && !cct?.step) return null;
  return { weakness, worst, breaks, breakPushes: breakHeld ? [] : breakPushes, ...(breakHeld ? { breakHeld } : {}), ...(cct ? { cct } : {}) };
}

const UNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** Checks, captures, threats — the forcing scan before any plan, answered by
 *  the one urgency computer. The bigger stake leads, as in `urgencyLead`. Only
 *  what the computer read is claimed: a free piece of theirs is said only on
 *  the student's move, and checks are not claimed when none were looked for. */
function cctRead(
  fen: string,
  student: Color,
  /** The student moves next and the step is a capture they can play: held
   *  (LEARN NAMES NO MOVE UNASKED — "So the plan: take their pawn on g4
   *  first", prod 2026-10-20). The answer says something is there; the
   *  square waits for the move, and `credit` keeps what crediting needs. */
  holdCapture = false,
): MethodRead['cct'] | null {
  const u = readBoardUrgency(fen, student === 'w' ? 'white' : 'black');
  if (!u) return null;
  const biggestSave = u.save[0]?.value ?? 0;
  if (u.win && u.win.value >= biggestSave) {
    // FREE only when nothing guards it. A guarded piece that still falls is
    // said by what the ledger nets over the trades on its square (prod Review
    // 2026-10-29: "their pawn on g6 is free to take" with f7 guarding it — it
    // falls to the bishop behind the capture), and only when the ledger agrees.
    const p = UNAME[u.win.piece];
    if (!u.win.guarded) {
      if (holdCapture) {
        return { answer: 'something of theirs is free to take — find it', past: `their ${p} on ${u.win.square} was free to take`, step: 'take what is free first — material on offer comes before any plan', squares: [], credit: [u.win.square] };
      }
      return { answer: `their ${p} on ${u.win.square} is free to take`, past: `their ${p} on ${u.win.square} was free to take`, step: `take their ${p} on ${u.win.square} first — material on offer comes before any plan`, squares: [u.win.square] };
    }
    const seq = seeSequence(fen, u.win.square as Square);
    const ledger = seq.length ? computeExchangeLedger(fen, seq, student) : null;
    if (ledger && ledger.settled && ledger.netPawns > 0) {
      const result = describeProofResult(ledger);
      if (holdCapture) {
        return { answer: 'something of theirs falls in the trades — find it', past: `on ${u.win.square}, ${result} in the trades`, step: 'take what the trades give first — material comes before any plan', squares: [], credit: [u.win.square] };
      }
      return { answer: `on ${u.win.square}, ${result} in the trades`, past: `on ${u.win.square}, ${result} in the trades`, step: `trade on ${u.win.square} first — material on offer comes before any plan`, squares: [u.win.square] };
    }
  }
  if (u.save[0]) {
    const s0 = u.save[0];
    if (u.takeAttacker && holdCapture) {
      return { answer: `your ${UNAME[s0.piece]} on ${s0.square} is attacked`, past: `your ${UNAME[s0.piece]} on ${s0.square} was attacked`, step: `deal with the attack on your ${UNAME[s0.piece]} first`, squares: [s0.square], credit: [s0.square, u.takeAttacker.square] };
    }
    if (u.takeAttacker) {
      return { answer: `your ${UNAME[s0.piece]} on ${s0.square} is attacked`, past: `your ${UNAME[s0.piece]} on ${s0.square} was attacked`, step: `take their ${UNAME[u.takeAttacker.piece]} on ${u.takeAttacker.square}, the piece attacking your ${UNAME[s0.piece]}`, squares: [s0.square, u.takeAttacker.square] };
    }
    return { answer: `your ${UNAME[s0.piece]} on ${s0.square} can be taken`, past: `your ${UNAME[s0.piece]} on ${s0.square} could be taken`, step: `get your ${UNAME[s0.piece]} on ${s0.square} out of danger first`, squares: [s0.square] };
  }
  if (u.promotion) {
    return { answer: `their pawn on ${u.promotion.from} is one step from promoting`, past: `their pawn on ${u.promotion.from} was one step from promoting`, step: `stop their pawn on ${u.promotion.from} first`, squares: [u.promotion.from, u.promotion.to] };
  }
  return { answer: u.myMove ? 'nothing of yours can be taken, and nothing of theirs is free' : 'nothing of yours can be taken', past: u.myMove ? 'nothing of yours could be taken, and nothing of theirs was free' : 'nothing of yours could be taken', step: null, squares: [] };
}

/** What makes each plan's target worth playing for, on its own squares. */
const WORTH: Record<PlanKind, (p: PlanFact) => string> = {
  'king-attack': (p) => `their king on ${p.squares[0]} is still in the centre, and a king you can reach is the biggest target on the board`,
  // A PASSER IS NAMED BY ITS FILE (David's Smith-Morra replay 2026-10-19,
  // move 49: "nothing of theirs can stop your pawn on d6" spoken after he had
  // pushed it to d7). The reason stays true however far it walks.
  passer: (p) => `nothing of theirs can stop your ${p.squares[0]?.[0] ?? ''}-pawn with a pawn, so a piece of theirs must stand guard against it`,
  'weak-pawn': (p) => `no pawn of theirs can protect their pawn on ${p.squares[0]}, so every piece that guards it is a piece doing nothing else`,
  'open-file': (p) => `the ${p.file}-file has no pawns on it — a road into their camp, and the first rook there owns it`,
  outpost: (p) => `no pawn of theirs can chase your piece off ${p.squares[0]}, so it stays there for good`,
  'worst-piece': (p) => `a position is only as strong as its worst piece, and the one on ${p.squares[0]} is doing almost nothing`,
  // The REASON, not the method: the how (nextPlans) already says "every trade
  // makes it count for more", and the walk heard both back to back (2026-10-19).
  convert: () => 'you are ahead in material, and with fewer pieces left they have less to fight back with',
  'bishop-pair': () => 'you have two bishops and they don\'t, and bishops grow stronger as the board opens',
};

/** What makes the plan's own target worth playing for — the reason alone,
 *  for a sentence that has already named the plan it beats. */
export function planWorth(plan: PlanFact): string {
  return WORTH[plan.kind](plan);
}

/** Why the first plan was chosen over the rest, said as a reason. */
export function whyThisPlan(plans: readonly PlanFact[]): string | null {
  const top = plans[0];
  if (!top) return null;
  const next = plans.find((p) => p.kind !== top.kind);
  return next
    ? `${WORTH[top.kind](top)} — so it comes before ${next.goalIng}`
    : WORTH[top.kind](top);
}

/** The shortest knight walk (≤ 3 hops) to `target`, through empty squares
 *  their pawns do not hit. */
function knightRouteTo(chess: Chess, target: Square, me: Color): { from: string; via: string[] } | null {
  if (chess.get(target)) return null;
  const them: Color = me === 'w' ? 'b' : 'w';
  const pawnHit = (sq: string): boolean => chess.attackers(sq as Square, them).some((a) => chess.get(a)?.type === 'p');
  if (pawnHit(target)) return null;
  const hops = (sq: string): string[] => {
    const f = sq.charCodeAt(0); const r = Number(sq[1]);
    return [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]
      .map(([df, dr]) => `${String.fromCharCode(f + df)}${r + dr}`)
      .filter((x) => /^[a-h][1-8]$/.test(x));
  };
  let best: { from: string; via: string[] } | null = null;
  for (const k of chess.board().flat()) {
    if (!k || k.type !== 'n' || k.color !== me) continue;
    let frontier: Array<{ sq: string; path: string[] }> = [{ sq: k.square, path: [] }];
    const seen = new Set<string>([k.square]);
    for (let d = 0; d < 3 && frontier.length; d++) {
      const next: typeof frontier = [];
      for (const { sq, path } of frontier) {
        for (const h of hops(sq)) {
          if (h === target) { if (!best || path.length < best.via.length) best = { from: k.square, via: path }; continue; }
          if (seen.has(h) || chess.get(h as Square) || pawnHit(h)) continue;
          seen.add(h); next.push({ sq: h, path: [...path, h] });
        }
      }
      if ((best as { from: string } | null)?.from === k.square) break;
      frontier = next;
    }
  }
  return best;
}

/** THE PLAN THE THREE ANSWERS MAKE (David 2026-10-15: "That doesn't line up
 *  … Should be improve the rook by placing it on open file, plant the knight
 *  on the weak square and break open with the pawn"). The method's answers ARE
 *  the plan: improve the worst piece, aim at their weakness, then break. One
 *  computer, so what the student is told to ask and the plan they hear can
 *  never disagree. The ORDER is taught too: pieces first, the break last.
 *  Null when the answers give no step to play. */
/** One arrow per step of a route, each on its OWN board — the piece moved
 *  along the route so far — so the arrow door checks every hop as a legal
 *  move from where the piece will stand (David 2026-10-15: "Arrows trace its
 *  route?"). The opponent's replies are not invented: the board is the one
 *  in front of the student with only this piece walked. */
export interface RouteArrow { from: string; to: string; fen: string }
function routeArrows(fen: string, route: readonly string[]): RouteArrow[] {
  const out: RouteArrow[] = [];
  let c: Chess;
  try { c = new Chess(fen); } catch { return out; }
  const piece = c.get(route[0] as Square);
  if (!piece) return out;
  for (let i = 0; i + 1 < route.length; i++) {
    out.push({ from: route[i], to: route[i + 1], fen: c.fen() });
    c.remove(route[i] as Square);
    if (c.get(route[i + 1] as Square)) break;
    c.put(piece, route[i + 1] as Square);
  }
  return out;
}

export function methodPlan(read: MethodRead, fen?: string): { steps: string[]; text: string; why: string | null; whyAsk: string; squares: string[]; arrows: RouteArrow[] } | null {
  const steps: string[] = [];
  if (read.cct?.step) steps.push(read.cct.step);
  if (read.worst?.step) steps.push(read.worst.step);
  if (read.weakness?.step) steps.push(read.weakness.step);
  const pieces = steps.length - (read.cct?.step ? 1 : 0);
  if (read.breaks.length) steps.push(`${pieces ? 'then ' : ''}break open with ${read.breakHeld ? 'the pawn push that is ready now' : `the push to ${orList(read.breaks)}`}`);
  if (!steps.length) return null;
  const text = steps.length === 1
    ? steps[0]
    : `${steps.slice(0, -1).join('; ')}; ${steps[steps.length - 1]}`;
  // EVERY PLAN SAYS WHY: the order when there is one; otherwise why that
  // target, or why that piece.
  const why = pieces && read.breaks.length
    ? 'A break opens the position, and an open position helps the side whose pieces are already on their best squares — so the pieces go first and the break comes last'
    : read.weakness?.step ? WEAKNESS_WHY[read.weakness.kind](read.weakness.square)
      : read.worst?.step ? 'a position is only as strong as its worst piece'
        : null;
  const whyAsk = pieces && read.breaks.length ? 'Why in that order?' : read.weakness?.step ? 'Why that target?' : 'Why that piece?';
  const squares = [...(read.cct?.squares ?? []), ...(read.worst?.to ?? []), ...(read.weakness ? [read.weakness.square, ...read.weakness.to] : []), ...(read.breakHeld ? [] : read.breaks)];
  const arrows: RouteArrow[] = fen ? [
    ...(read.worst?.step && read.worst.route ? routeArrows(fen, read.worst.route) : []),
    ...(read.weakness?.step && read.weakness.route ? routeArrows(fen, read.weakness.route) : []),
    ...(read.breakPushes ?? []).flatMap(([f, t]) => routeArrows(fen, [f, t])),
  ] : [];
  return { steps, text, why, whyAsk, squares: [...new Set(squares)].filter((x) => /^[a-h][1-8]$/.test(x)), arrows };
}

/** THE METHOD AND THE PLAN ITS ANSWERS MAKE, as one sentence — the one
 *  producer (OS-11 duplicate map #7: planThread and boardPlanFacts each built
 *  "… So the plan: …" from the same template). Null when the answers make no
 *  plan. `fen`: the board the method was read on. */
export function methodPlanSentence(read: MethodRead, fen: string): { text: string; squares: string[]; arrows: RouteArrow[] } | null {
  const mp = methodPlan(read, fen);
  if (!mp) return null;
  return {
    text: `${methodLine(read, fen)} So the plan: ${mp.text}.${mp.why ? ` ${mp.whyAsk} ${openSentence(mp.why)}.` : ''}`,
    squares: [...new Set([...methodSquares(read), ...mp.squares])],
    arrows: mp.arrows,
  };
}

/** The method spoken as a question and its answer: the student thinks first.
 *  `fen` is the board the method was read on (the student to move). */
export function methodLine(read: MethodRead, fen: string): string {
  const parts: string[] = [];
  if (read.cct) parts.push(`Checks, captures, threats: ${read.cct.answer}.`);
  if (read.weakness) parts.push(`Their weakness: ${read.weakness.phrase}.`);
  if (read.worst) parts.push(`Your worst piece: ${read.worst.phrase}.`);
  if (read.breaks.length) parts.push(read.breakHeld ? 'Your pawn break: one is ready to push right now — find it.' : `Your pawn break: the push to ${orList(read.breaks)}.`);
  return askThenAnswer('How do you find a plan? First the forcing scan — checks, captures, threats. Then three things: where is their weakness, which of your pieces is worst, where is your pawn break?', parts.join(' '), (m) => methodAfterMove(read, fen, m));
}

/** THE METHOD'S ANSWER AFTER THE STUDENT MOVED (the answer waits for the
 *  move, David 2026-10-18): about the board it was asked on, in the past
 *  tense, crediting what they found. A move from another board resolves
 *  nothing (Black walk 2026-10-19: the 11…Bh4 answer heard after 12…Nxb3). */
function methodAfterMove(read: MethodRead, fen: string, m: PlayedMove): string | null {
  const key = (f: string): string => f.split(' ').slice(0, 2).join(' ');
  if (key(m.fenBefore) !== key(fen)) return null;
  let mv: ReturnType<Chess['move']> | null = null;
  try { mv = new Chess(fen).move(m.san); } catch { return null; }
  if (!mv) return null;
  const parts: string[] = [];
  if (read.cct) {
    const dealt = read.cct.step !== null && (read.cct.credit ?? read.cct.squares).some((q) => q === mv.from || q === mv.to);
    parts.push(dealt
      ? `You ran the forcing scan: ${read.cct.past}, and your move dealt with it.`
      : `Before your move, checks, captures, threats: ${read.cct.past}.`);
  }
  if (read.weakness) parts.push(`Their weakness was ${read.weakness.phrase.replace(/^their /, 'the ')}.`);
  if (read.worst) parts.push(mv.from === read.worst.square
    ? `You improved your worst piece, ${read.worst.phrase.replace(/^your /, 'the ')}.`
    : `Your worst piece was ${read.worst.phrase.replace(/^your /, 'the ')}.`);
  if (read.breaks.length) {
    const found = mv.piece === 'p' && read.breaks.includes(mv.to);
    // A missed held move is never named (LEARN NAMES NO MOVE UNASKED); a found one is credited.
    parts.push(found
      ? `You found it — ${mv.san} was the pawn break that was ready.`
      : read.breakHeld ? 'A pawn break was ready to push.' : `Your pawn break was the push to ${orList(read.breaks)}.`);
  }
  return parts.length ? parts.join(' ') : null;
}

/** The squares the method names, to mark on the board. */
export function methodSquares(read: MethodRead): Square[] {
  return [...(read.cct?.squares ?? []), read.weakness?.square, read.worst?.square, ...(read.breakHeld ? [] : read.breaks)].filter((s): s is string => !!s && /^[a-h][1-8]$/.test(s)) as Square[];
}

/** WHY a weakness is one — the reason, by kind, so "what is their weakness?"
 *  is answered with what makes it a target, never a square alone. */
const WEAKNESS_WHY: Record<NonNullable<MethodRead['weakness']>['kind'], (sq: string) => string> = {
  king: () => 'with the centre opening, it can be attacked before it reaches safety',
  isolated: () => 'no pawn can ever protect it, so it needs pieces to guard it — and those pieces are tied to it',
  hole: () => 'no pawn of theirs can ever attack it, so a piece you plant there stays for good',
};
export function weaknessLine(read: MethodRead): string | null {
  const w = read.weakness;
  return w ? `Their weakness is ${w.phrase.replace(/^their /, 'the ')}: ${WEAKNESS_WHY[w.kind](w.square)}.` : null;
}
