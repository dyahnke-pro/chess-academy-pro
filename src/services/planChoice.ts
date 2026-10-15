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
import { findPawnBreaks, findWeakSquares } from './positionReadingService';
import { enemyKingStuckInCenter } from './reviewSacrifice';
import { orList } from '../utils/andList';
import { computePieceRoute, computeSliderRoute } from './forwardTeaching';
import { THINK_MARK } from '../utils/thinkPause';

export interface MethodRead {
  /** Their weakness, as a phrase ("their king, still on e8", "their isolated pawn on d5"). */
  weakness: { phrase: string; square: string; kind: 'king' | 'isolated' | 'hole'; step: string | null; to: string[] } | null;
  /** The student's worst-placed piece — and, when it has one, the step that
   *  improves it (a rook with an open file to take, a piece with a route). */
  worst: { phrase: string; square: string; step: string | null; to: string[] } | null;
  /** The student's pawn breaks (squares a pawn can strike). */
  breaks: string[];
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
export function methodRead(fen: string, student: Color): MethodRead | null {
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
      const holes = findWeakSquares(fen)[enemy === 'w' ? 'white' : 'black'];
      if (holes[0]) {
        const route = knightRouteTo(chess, holes[0], student);
        const step = route
          ? `bring your knight on ${route.from} to ${holes[0]}${route.via.length ? `, by way of ${route.via.join(' and ')}` : ''} — no pawn of theirs can attack it there`
          : null;
        weakness = { phrase: `the hole on ${holes[0]} that no pawn of theirs can guard`, square: holes[0], kind: 'hole', step, to: route ? [route.from, ...route.via] : [] };
      }
    }
  }
  const w = findWorstPlacedPiece(chess, student);
  let worst: MethodRead['worst'] = null;
  if (w) {
    const r = computePieceRoute(fen, w.sq as Square) ?? computeSliderRoute(fen, w.sq as Square);
    worst = { phrase: `your ${PIECE_NOUN[w.type]} on ${w.sq}`, square: w.sq, step: r && r.route.length ? `walk your ${PIECE_NOUN[w.type]} to ${r.target}` : null, to: r ? [...r.route] : [] };
  } else {
    // A ROOK WITH NO FILE is the worst piece once a file is open (David
    // 2026-10-15: "improve the rook by placing it on open file"): the plan
    // computer reads that as its own plan, so the method has to name it too,
    // or the answers and the plan disagree.
    const file = struct.pawns.openFiles.find((f) => !chess.board().flat().some((c) => c?.color === student && (c.type === 'r' || c.type === 'q') && c.square[0] === f));
    const rook = file ? chess.board().flat().find((c) => c?.color === student && c.type === 'r') : null;
    if (file && rook) worst = { phrase: `your rook on ${rook.square}, with no open file yet`, square: rook.square, step: `put a rook on the open ${file}-file`, to: [`${file}${student === 'w' ? '1' : '8'}`] };
  }
  const asMe = chess.turn() === student ? fen : flipTo(fen, student);
  const breaks: string[] = asMe ? findPawnBreaks(asMe) : [];
  if (!weakness && !worst && breaks.length === 0) return null;
  return { weakness, worst, breaks };
}

/** What makes each plan's target worth playing for, on its own squares. */
const WORTH: Record<PlanKind, (p: PlanFact) => string> = {
  'king-attack': (p) => `their king on ${p.squares[0]} is still in the centre, and a king you can reach is the biggest target on the board`,
  passer: (p) => `nothing of theirs can stop your pawn on ${p.squares[0]} with a pawn, so a piece of theirs must stand guard against it`,
  'weak-pawn': (p) => `no pawn of theirs can protect their pawn on ${p.squares[0]}, so every piece that guards it is a piece doing nothing else`,
  'open-file': (p) => `the ${p.file}-file has no pawns on it — a road into their camp, and the first rook there owns it`,
  outpost: (p) => `no pawn of theirs can chase your piece off ${p.squares[0]}, so it stays there for good`,
  'worst-piece': (p) => `a position is only as strong as its worst piece, and the one on ${p.squares[0]} is doing almost nothing`,
  convert: () => 'you are ahead in material, and every trade makes the extra material count for more',
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
export function methodPlan(read: MethodRead): { steps: string[]; text: string; why: string | null; squares: string[] } | null {
  const steps: string[] = [];
  if (read.worst?.step) steps.push(read.worst.step);
  if (read.weakness?.step) steps.push(read.weakness.step);
  const pieces = steps.length;
  if (read.breaks.length) steps.push(`${pieces ? 'then ' : ''}break open with the push to ${orList(read.breaks)}`);
  if (!steps.length) return null;
  const text = steps.length === 1
    ? steps[0]
    : `${steps.slice(0, -1).join('; ')}; ${steps[steps.length - 1]}`;
  const why = pieces && read.breaks.length
    ? 'A break opens the position, and an open position helps the side whose pieces are already on their best squares — so the pieces go first and the break comes last'
    : null;
  const squares = [...(read.worst?.to ?? []), ...(read.weakness ? [read.weakness.square, ...read.weakness.to] : []), ...read.breaks];
  return { steps, text, why, squares: [...new Set(squares)].filter((x) => /^[a-h][1-8]$/.test(x)) };
}

/** The method spoken as a question and its answer: the student thinks first. */
export function methodLine(read: MethodRead): string {
  const parts: string[] = [];
  if (read.weakness) parts.push(`Their weakness: ${read.weakness.phrase}.`);
  if (read.worst) parts.push(`Your worst piece: ${read.worst.phrase}.`);
  if (read.breaks.length) parts.push(`Your pawn break: the push to ${orList(read.breaks)}.`);
  return `How do you find a plan? Ask three things — where is their weakness, which of your pieces is worst, where is your pawn break? ${THINK_MARK} ${parts.join(' ')}`;
}

/** The squares the method names, to mark on the board. */
export function methodSquares(read: MethodRead): Square[] {
  return [read.weakness?.square, read.worst?.square, ...read.breaks].filter((s): s is string => !!s && /^[a-h][1-8]$/.test(s)) as Square[];
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
