// slipDepth — HOW THE PUNISHMENT LANDED, proven on the board (WO-DEPTH-01,
// David 2026-11-08: "this game is 100% deterministic. I think it's up to us and
// our tools as to how deeply we dive into it. And I want to dive deep!!").
//
// Measured on David's 1,134 slips against the same player's ordinary moves in
// the same game (`slipDepth.measure.test.ts`): the narrow path (60% vs 55%
// with three or fewer moves holding), a quiet best move (72% vs 67%) and the
// lead-up conditions (pressure 9.2% vs 11.1%, complication 1.6% vs 1.5%,
// cramp 2.5% vs 2.6% over 6,221 slips) do not tell his slips apart, so none of
// them is said as a reason. What does: his slips are quiet moves (62% took,
// checked and threatened nothing, against 50%), and of those that lost
// material, 73% took two or more of the opponent's moves to land and a third
// began with a quiet move. So the deep read is HOW the punishment landed —
// the habit that would have caught it reads it (`safetyHabits.slipHabit`).
// Pure: chess.js and the one line proof. Nothing on a null.
import { Chess, type Square } from 'chess.js';
import { proofCut } from './exchangeLedger';
import { legalSeeGainFor } from './positionReadingService';
import { computeMustDefend } from './threatOut';
import { NAME_NEAR_PLIES } from './lineTrust';
import { andList } from '../utils/andList';

function sanOf(fen: string, uci: string | undefined): { san: string; capture: boolean; check: boolean } | null {
  if (!uci || uci.length < 4) return null;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return m ? { san: m.san, capture: !!m.captured, check: /[+#]$/.test(m.san) } : null;
  } catch { return null; }
}

export interface Refutation {
  /** The punisher's moves until the cost landed (a mate, or settled material). */
  moves: number;
  /** The line's plies until the cost landed, the punisher's first move
   *  included — what `lineTrust`'s naming horizon is measured in. */
  plies: number;
  mate: boolean;
  /** Material the punisher came out ahead, in pawns (null on a mate). */
  netPawns: number | null;
  /** The punishment began with a move that neither took nor checked. */
  quietStart: boolean;
  /** The line, in SAN, cut where the cost lands. */
  sans: string[];
}

/** The punishment the engine found after the slip (`pvUci`, the punisher's
 *  move first), cut where it lands. Null when the line proves no mate and no
 *  settled material — then the cost was positional and no depth is claimed. */
export function refutationOf(fenAfter: string, pvUci: readonly string[]): Refutation | null {
  if (pvUci.length === 0) return null;
  const sans: string[] = [];
  let fen = fenAfter;
  for (const uci of pvUci) {
    const m = sanOf(fen, uci);
    if (!m) break;
    sans.push(m.san);
    try { const c = new Chess(fen); c.move(m.san); fen = c.fen(); } catch { break; }
  }
  if (sans.length === 0) return null;
  const punisher = new Chess(fenAfter).turn();
  const first = sanOf(fenAfter, pvUci[0]);
  const proof = proofCut(fenAfter, sans, punisher);
  if (!proof) return null;
  if (!proof.mate && (!proof.ledger || proof.ledger.netPawns < 1)) return null;
  return {
    moves: Math.ceil(proof.plies / 2),
    plies: proof.plies,
    mate: proof.mate,
    netPawns: proof.mate ? null : proof.ledger?.netPawns ?? null,
    quietStart: !!first && !first.capture && !first.check,
    sans: proof.sans.slice(0, proof.plies),
  };
}

/** HOW THE PUNISHMENT LANDED, as a kind:
 *  · `left-to-take` — the piece could simply be taken right after the move;
 *  · `threat` / `quiet` — the punishment began with a move that took nothing
 *    and gave no check (leaving pieces under attack, or not), and landed
 *    within the distance a line may be named on one read (`NAME_NEAR_PLIES`);
 *  · `check` / `capture` — it began with a check or a capture and landed
 *    within that distance;
 *  · `later` — it landed past that distance, or proves no material: no habit
 *    of the moment would have found it;
 *  · `unknown` — not takeable at once, and no line from the board after the
 *    move to say how it fell. */
export type FallKind = 'left-to-take' | 'threat' | 'quiet' | 'check' | 'capture' | 'later' | 'unknown';

export interface Fall {
  kind: FallKind;
  /** The cut punishment line (null for `left-to-take` read off the board alone,
   *  and for `later`). */
  ref: Refutation | null;
  /** The slipper's pieces the quiet first move left under attack. */
  hit: Array<{ piece: string; square: string }>;
  /** The square the slip lost a piece on (given, or the first square the
   *  punisher captures on in the cut line). */
  lostSquare: string | null;
  /** The punisher's move (1 = their first) that took the piece there, or -1. */
  takenAt: number;
  /** The piece taken there, as it stood when taken ('n', 'b', …), or null. */
  takenPiece: string | null;
}

const sameBoard = (a: string, b: string): boolean => a.split(' ').slice(0, 2).join(' ') === b.split(' ').slice(0, 2).join(' ');
const squareOf = (san: string): string | null => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(san)?.[1] ?? null;

/** How the slip `san` from `fenBefore` was punished. `line` is the engine's
 *  answer from the board after it (their move first) — used only when it starts
 *  on that board. Null when the move is illegal or nothing was lost. */
export function howItFell(fenBefore: string, san: string, lostSquare: string | null, line: { fen: string; uci: readonly string[] } | null): Fall | null {
  let fenAfter: string;
  try { const c = new Chess(fenBefore); if (!c.move(san)) return null; fenAfter = c.fen(); } catch { return null; }
  const punisher = new Chess(fenAfter).turn();
  const slipper: 'w' | 'b' = punisher === 'w' ? 'b' : 'w';
  const pv = line && sameBoard(line.fen, fenAfter) ? line.uci : null;
  const ref = pv ? refutationOf(fenAfter, pv) : null;
  const firstTaken = ref?.sans.find((x, i) => i % 2 === 0 && /x/.test(x)) ?? null;
  const lost = lostSquare && /^[a-h][1-8]$/.test(lostSquare) ? lostSquare : firstTaken ? squareOf(firstTaken) : null;
  if (!lost) return null;
  const base = { lostSquare: lost, hit: [] as Fall['hit'], takenAt: -1, takenPiece: null as string | null };
  const there = new Chess(fenAfter).get(lost as Square);
  if (there && there.color === slipper && legalSeeGainFor(fenAfter, lost as Square, punisher) > 0) {
    return { kind: 'left-to-take', ref, ...base, takenPiece: there.type };
  }
  if (!pv) return { kind: 'unknown', ref: null, ...base };
  // A slip that gives check leaves them one answer to choose from at most: the
  // reply is forced, never "a quiet move" of theirs (14.Bxd7+ …Kf8 is out of
  // check, not a quiet idea), so how it fell is not said.
  if (new Chess(fenAfter).inCheck()) return { kind: 'later', ref: null, ...base };
  if (!ref || ref.plies > NAME_NEAR_PLIES || ref.sans.length === 0) return { kind: 'later', ref: null, ...base };
  // The move that TOOK the lost piece, and the piece as it stood then (Bxd4,
  // then …Nxd4: the bishop walked onto d4 during the line).
  let takenAt = -1; let takenPiece: string | null = null;
  try {
    const b = new Chess(fenAfter);
    for (let i = 0; i < ref.sans.length; i += 1) {
      if (i % 2 === 0 && /x/.test(ref.sans[i]) && squareOf(ref.sans[i]) === lost) {
        const p = b.get(lost as Square);
        if (p && p.color === slipper) { takenAt = i / 2 + 1; takenPiece = p.type; }
        break;
      }
      b.move(ref.sans[i]);
    }
  } catch { takenAt = -1; takenPiece = null; }
  const first = ref.sans[0];
  let hit: Fall['hit'] = [];
  if (ref.quietStart) {
    try {
      const c = new Chess(fenAfter); c.move(first);
      const before = new Set(computeMustDefend(fenAfter, slipper).pieces.map((p) => p.square));
      hit = computeMustDefend(c.fen(), slipper).pieces.filter((p) => !before.has(p.square)).map((p) => ({ piece: p.piece.toLowerCase(), square: p.square }));
    } catch { hit = []; }
  }
  const kind: FallKind = ref.quietStart ? (hit.length ? 'threat' : 'quiet') : /[+#]$/.test(first) ? 'check' : 'capture';
  return { kind, ref, lostSquare: lost, hit, takenAt, takenPiece };
}

/** The deep families a game's costly moves can share — the punishments a
 *  one-move blunder check walks past. A piece simply left to be taken is the
 *  fundamentals recap's (the loose-piece count), never said twice. */
export type FallFamily = 'quiet-threat' | 'quiet-move' | 'short-line';
const FAMILY: Partial<Record<FallKind, FallFamily>> = { threat: 'quiet-threat', quiet: 'quiet-move', check: 'short-line', capture: 'short-line' };

export interface CostlyMove {
  seat: 'w' | 'b';
  san: string;
  fenBefore: string;
  /** The engine's answer, their move first (`recordReplyLine`), or null. */
  replyUci: readonly string[] | null;
}

/** THE GAME'S RECURRING DEEP REASON (WO-DEPTH-01, David 2026-11-08: "a main
 *  concept that helped a user win or lose … a reoccurring theme throughout the
 *  game"): each seat's costly moves grouped by how their punishment landed,
 *  a family kept when two or more share it. Largest first; ties keep game order. */
export function recurringFalls(moves: readonly CostlyMove[]): Array<{ seat: 'w' | 'b'; family: FallFamily; sans: string[]; firsts: string[] }> {
  const groups = new Map<string, { seat: 'w' | 'b'; family: FallFamily; sans: string[]; firsts: string[] }>();
  for (const m of moves) {
    let fenAfter: string;
    try { const c = new Chess(m.fenBefore); if (!c.move(m.san)) continue; fenAfter = c.fen(); } catch { continue; }
    const fall = m.replyUci?.length ? howItFell(m.fenBefore, m.san, null, { fen: fenAfter, uci: m.replyUci }) : null;
    // A mate is its own story, never "wins material".
    const family = fall && !fall.ref?.mate ? FAMILY[fall.kind] : undefined;
    if (!family) continue;
    const key = `${m.seat}:${family}`;
    const g = groups.get(key) ?? { seat: m.seat, family, sans: [], firsts: [] };
    g.sans.push(m.san);
    g.firsts.push(fall?.ref?.sans[0] ?? '');
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.sans.length >= 2).sort((a, b) => b.sans.length - a.sans.length);
}

const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const FAMILY_WORDS: Record<FallFamily, string> = {
  'quiet-threat': 'a quiet threat that wins material',
  'quiet-move': 'a quiet move that wins material',
  'short-line': 'a short forcing line that wins material',
};
const FAMILY_HABIT: Record<FallFamily, string> = {
  'quiet-threat': 'After your move, look for their threats, not only their captures.',
  'quiet-move': 'After your move, look for their best reply, quiet moves included.',
  'short-line': 'After your move, play their checks and captures out until the board goes quiet.',
};

/** REVIEW'S MAIN CONCEPT, said in the closing (retrospective, the student's
 *  seat): the student's own recurring deep reason first, else the opponent's.
 *  Null when no family recurs — silence over a theme the game did not have. */
export function mainConceptLine(moves: readonly CostlyMove[], student: 'w' | 'b'): string | null {
  const falls = recurringFalls(moves);
  const mine = falls.find((f) => f.seat === student);
  const theirs = falls.find((f) => f.seat !== student);
  const f = mine ?? theirs;
  if (!f) return null;
  const count = COUNT[f.sans.length] ?? String(f.sans.length);
  // THE SAME SHOT every time is the sharper fact (7.h3 and 8.Ne4 both allowed
  // …Nf3+, winning the queen): say the shot, not only its family.
  const shot = f.firsts.every((x) => x && x === f.firsts[0]) ? f.firsts[0] : null;
  const what = shot ? `the same shot, ${shot}, which wins material` : FAMILY_WORDS[f.family];
  return f === mine
    ? `${count} of your costly moves, ${andList(f.sans)}, allowed ${what}. ${FAMILY_HABIT[f.family]}`
    : `${count} of their costly moves, ${andList(f.sans)}, allowed ${what}.`;
}
