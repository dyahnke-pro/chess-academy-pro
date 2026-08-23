/**
 * danyaBehaviors — duplicate as MANY of Naroditsky's deterministic teaching
 * behaviors as chess.js/engine can compute, and FIRE them at the same relative
 * RATE we see them in his farmed corpus (David 2026-08-23: "I want as many
 * behaviors as we can duplicate deterministically, set to fire at the same rate
 * that we see his teachings").
 *
 * Two pieces:
 *   1. A REGISTRY of behaviors. Each wraps an existing deterministic computer
 *      (`positionReadingService`, `tacticsDetector`, `tacticalRead`) and, for a
 *      given board, returns a board-TRUE fact string or null. G0/G3 to the
 *      core: the fact is computed here; the LLM (where one runs) only phrases
 *      it. Every clause names a real square/piece — never a vibe.
 *   2. A rate-matched SCHEDULER (`BehaviorScheduler`, stride scheduling). Each
 *      behavior carries a `weight` = its corpus note count. When several fire on
 *      one turn the scheduler picks the one whose long-run spoken share is
 *      furthest below its target weight, so across a game the DISTRIBUTION of
 *      what the coach talks about tracks his corpus distribution.
 *
 * Weights are the measured `concepts`-tag counts in `src/data/danya-teachings.json`
 * (11,426 notes). Only behaviors with an HONEST deterministic computer are
 * here; the vibe concepts (initiative, counterplay, coordination, conversion,
 * flexibility) have none and are deliberately absent (empty > invented).
 */
import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { tacticalReadFromLines, namedTacticClause } from './tacticalRead';
import {
  strongestWeakestPiece,
  kingSafetyRead,
  findWeakPawns,
  developmentRead,
  findPieceQuality,
  countMaterial,
  findPassedPawns,
  findPawnBreaks,
  findOpenFiles,
  pressuredTargets,
  computeSpace,
  findWeakSquares,
  bishopPair,
  bestMinorToKeep,
  opponentIntentRead,
} from './positionReadingService';

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** A single engine PV line, as the coach turn already has it in hand. */
export interface BehaviorLine { moves: string[]; evaluation: number }

export interface BehaviorContext {
  fen: string;
  studentColor: Color | 'white' | 'black';
  /** Already-computed MultiPV lines for this FEN (latency-safe reuse). */
  topLines?: ReadonlyArray<BehaviorLine>;
}

export interface BehaviorHit {
  id: string;
  /** The board-true teaching fact — concrete, names squares/pieces (G0 seam). */
  fact: string;
  /** Squares to lead the eye to (arrows/highlights). */
  squares: Square[];
  /** Corpus firing weight. */
  weight: number;
}

export interface Behavior {
  id: string;
  /** Corpus note count — the target relative firing rate. */
  weight: number;
  detect(ctx: NormalizedCtx): { fact: string; squares: Square[] } | null;
}

interface NormalizedCtx {
  fen: string;
  student: Color;
  opp: Color;
  studentWord: 'white' | 'black';
  topLines?: ReadonlyArray<BehaviorLine>;
  chess: Chess | null;
}

function normalize(ctx: BehaviorContext): NormalizedCtx | null {
  const student: Color = ctx.studentColor === 'w' || ctx.studentColor === 'white' ? 'w' : 'b';
  let chess: Chess | null = null;
  try { chess = new Chess(ctx.fen); } catch { chess = null; }
  if (!chess) return null;
  return {
    fen: ctx.fen,
    student,
    opp: student === 'w' ? 'b' : 'w',
    studentWord: student === 'w' ? 'white' : 'black',
    topLines: ctx.topLines,
    chess,
  };
}

const sq = (s: string): Square => s as Square;

/**
 * The registry. Weights are corpus note counts (2026-08-23 tally). Order is
 * documentation only — the scheduler decides what actually speaks.
 */
export const DANYA_BEHAVIORS: Behavior[] = [
  {
    id: 'piece-activity',
    weight: 1039,
    detect: ({ fen, student }) => {
      const { strongest, weakest } = strongestWeakestPiece(fen, student);
      if (strongest && strongest.scope >= 9) {
        return { fact: `Your ${PIECE_NAME[strongest.piece]} on ${strongest.square} is your most active piece, hitting ${strongest.scope} squares — build around it.`, squares: [strongest.square] };
      }
      if (weakest && weakest.scope <= 1) {
        return { fact: `Your ${PIECE_NAME[weakest.piece]} on ${weakest.square} is doing nothing — find it a better square.`, squares: [weakest.square] };
      }
      return null;
    },
  },
  {
    id: 'king-safety',
    weight: 937,
    detect: ({ fen, student, opp }) => {
      const theirs = kingSafetyRead(fen, opp);
      if (theirs?.exposed) {
        const files = theirs.openFilesNearKing.join(', ');
        return { fact: `The enemy king on ${theirs.square} is exposed${files ? ` — the ${files}-file is open toward it` : ''}. Play for the attack.`, squares: [sq(theirs.square)] };
      }
      const mine = kingSafetyRead(fen, student);
      if (mine?.exposed && !mine.castled) {
        return { fact: `Your own king on ${mine.square} is still in the center — get it safe before you push.`, squares: [sq(mine.square)] };
      }
      return null;
    },
  },
  {
    id: 'prophylaxis',
    weight: 927,
    detect: ({ fen, studentWord }) => {
      const intent = opponentIntentRead(fen, studentWord);
      if (!intent) return null;
      if (intent.kind === 'capture') {
        return { fact: `The opponent is eyeing ${intent.san} — it would win the piece on ${intent.target}. Deal with that first.`, squares: [intent.target] };
      }
      return { fact: `The opponent wants ${intent.san}, forking on ${intent.target} — take the square away from them.`, squares: [intent.target] };
    },
  },
  {
    id: 'pawn-structure',
    weight: 818,
    detect: ({ fen, opp, student }) => {
      const theirs = findWeakPawns(fen, opp);
      const pick = theirs.backward[0] ?? theirs.isolated[0] ?? theirs.doubled[0];
      if (pick) {
        const kind = theirs.backward.includes(pick) ? 'backward' : theirs.isolated.includes(pick) ? 'isolated' : 'doubled';
        return { fact: `The ${kind} pawn on ${pick} is a lasting weakness — pile up on it.`, squares: [pick] };
      }
      const mine = findWeakPawns(fen, student);
      const minePick = mine.backward[0] ?? mine.isolated[0];
      if (minePick) {
        const kind = mine.backward.includes(minePick) ? 'backward' : 'isolated';
        return { fact: `Watch your ${kind} pawn on ${minePick} — don't let it become a target.`, squares: [minePick] };
      }
      return null;
    },
  },
  {
    id: 'development',
    weight: 753,
    detect: ({ fen, student, chess }) => {
      if (!chess) return null;
      // Only an opening-phase message — count full moves.
      const moveNo = Number(fen.split(' ')[5] ?? '99');
      if (moveNo > 12) return null;
      const dev = developmentRead(fen, student);
      if (dev && !dev.castled && dev.developedMinors < dev.totalMinors - 1) {
        return { fact: `You're behind in development — finish getting the minor pieces out and castle before anything sharp.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'tactics',
    weight: 647,
    detect: ({ fen, student }) => {
      const t = detectTactics(fen);
      const mine = t.tactics.find((p) => p.beneficiary === student && p.type !== 'none');
      if (mine) {
        return { fact: mine.description, squares: mine.involvedSquares.map(sq) };
      }
      return null;
    },
  },
  {
    id: 'calculation',
    weight: 449,
    detect: ({ fen, studentWord, topLines }) => {
      if (!topLines || topLines.length === 0) return null;
      const read = tacticalReadFromLines(fen, topLines, studentWord, { maxPlies: 6 });
      if (!read?.keyTactic) return null;
      const point = namedTacticClause(read.line);
      if (!point) return null;
      const seq = read.line.slice(1, read.keyTactic.atPly + 1).map((p) => p.san);
      return { fact: seq.length ? `Calculate it out: ${seq.join(', ')} — ${point.replace(/^The point — /, '')}` : point, squares: [] };
    },
  },
  {
    id: 'outpost',
    weight: 544,
    detect: ({ fen, student, chess }) => {
      if (!chess) return null;
      const notes = findPieceQuality(fen);
      const out = notes.find((n) => n.color === student && n.reason.includes('outpost'));
      if (out) {
        return { fact: `${out.square} is an outpost — a knight there can't be chased by a pawn and dominates.`, squares: [out.square] };
      }
      return null;
    },
  },
  {
    id: 'material',
    weight: 302,
    detect: ({ fen, student }) => {
      const { advantage } = countMaterial(fen);
      // advantage is WHITE-positive; convert to the student's side.
      const studentAdv = student === 'w' ? advantage : -advantage;
      if (studentAdv >= 1) {
        return { fact: `You're up material — trade pieces, keep pawns, and steer for the endgame.`, squares: [] };
      }
      if (studentAdv <= -1) {
        return { fact: `You're down material — don't trade; look for activity and counterplay.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'passed-pawn',
    weight: 231,
    detect: ({ fen, student }) => {
      const passers = findPassedPawns(fen, student);
      if (passers.length > 0) {
        return { fact: `The passed pawn on ${passers[0]} is a long-term trump — support it and push.`, squares: [passers[0]] };
      }
      return null;
    },
  },
  {
    id: 'pawn-break',
    weight: 215,
    detect: ({ fen, student, chess }) => {
      if (!chess) return null;
      // Only when it's the student to move (the break is theirs to make).
      if (chess.turn() !== student) return null;
      const breaks = findPawnBreaks(fen);
      if (breaks.length > 0) {
        return { fact: `${breaks[0]} is the pawn break that cracks the position open — prepare it.`, squares: [breaks[0]] };
      }
      return null;
    },
  },
  {
    id: 'bishop-pair',
    weight: 191,
    detect: ({ fen, student }) => {
      if (bishopPair(fen, student)) {
        return { fact: `You hold the bishop pair — keep the position open so both bishops bite.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'open-file',
    weight: 190,
    detect: ({ fen, student, chess }) => {
      if (!chess) return null;
      const files = findOpenFiles(fen);
      const mine = student === 'w' ? files.whiteSemiOpen : files.blackSemiOpen;
      const all = [...files.open, ...mine];
      if (all.length === 0) return null;
      // Only speak if the student has a rook NOT yet on that file.
      const file = all[0];
      let hasRookOnIt = false; let hasRook = false;
      for (const row of chess.board()) for (const cell of row) {
        if (cell && cell.type === 'r' && cell.color === student) {
          hasRook = true;
          if (cell.square[0] === file) hasRookOnIt = true;
        }
      }
      if (hasRook && !hasRookOnIt) {
        return { fact: `The ${file}-file is open — your rook belongs there.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'pressure',
    weight: 135,
    detect: ({ fen, student }) => {
      const targets = pressuredTargets(fen, student);
      const t = targets.find((x) => x.verdict === 'winnable' || x.verdict === 'balanced-tension');
      if (!t) return null;
      const tail = t.verdict === 'balanced-tension'
        ? `${t.attackers} attackers against ${t.defenders} defenders — one more and it falls`
        : `you win the ${PIECE_NAME[t.piece]} on ${t.square}`;
      return { fact: `Pressure on ${t.square}: ${tail}.`, squares: [t.square] };
    },
  },
  {
    id: 'space',
    weight: 105,
    detect: ({ fen, student }) => {
      const space = computeSpace(fen);
      const mine = student === 'w' ? space.white : space.black;
      const theirs = student === 'w' ? space.black : space.white;
      if (mine >= theirs + 4) {
        return { fact: `You own more space — keep them cramped, don't rush, improve every piece first.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'weak-square',
    weight: 90,
    detect: ({ fen, opp }) => {
      const weak = findWeakSquares(fen);
      const holes = opp === 'w' ? weak.white : weak.black;
      if (holes.length > 0) {
        return { fact: `${holes[0]} is a hole in their camp — a piece planted there can't be kicked.`, squares: [holes[0]] };
      }
      return null;
    },
  },
  {
    id: 'piece-preservation',
    weight: 90,
    detect: ({ fen, student }) => {
      const keep = bestMinorToKeep(fen, student);
      if (keep?.dominant) {
        return { fact: `Keep your ${PIECE_NAME[keep.note.piece]} on ${keep.note.square} — it outclasses their minor; don't trade it off.`, squares: [keep.note.square] };
      }
      return null;
    },
  },
];

/** Every behavior that fires (board-true) on this position, with its weight. */
export function detectBehaviors(ctx: BehaviorContext): BehaviorHit[] {
  const n = normalize(ctx);
  if (!n) return [];
  const hits: BehaviorHit[] = [];
  for (const b of DANYA_BEHAVIORS) {
    let res: { fact: string; squares: Square[] } | null = null;
    try { res = b.detect(n); } catch { res = null; }
    if (res && res.fact) hits.push({ id: b.id, fact: res.fact, squares: res.squares, weight: b.weight });
  }
  return hits;
}

/**
 * Rate-matched selection across turns (STRIDE scheduling). Each behavior has
 * `stride = 1 / weight`; a `pass` accumulator starts at 0. On each turn the
 * scheduler picks, among the behaviors that FIRE, the one with the lowest
 * `pass`, then advances that behavior's `pass` by its stride. Long-run spoken
 * frequency of each behavior converges to its share of total weight — so the
 * coach talks about things in the same proportions as the corpus. Fully
 * deterministic (no RNG — the surface bans `Math.random` on the hot path).
 */
export class BehaviorScheduler {
  private pass = new Map<string, number>();
  private readonly stride = new Map<string, number>();

  constructor(behaviors: readonly Behavior[] = DANYA_BEHAVIORS) {
    for (const b of behaviors) this.stride.set(b.id, b.weight > 0 ? 1 / b.weight : Number.POSITIVE_INFINITY);
  }

  /** Pick the rate-fair behavior among this turn's fired hits (null if none). */
  pick(hits: readonly BehaviorHit[]): BehaviorHit | null {
    if (hits.length === 0) return null;
    let best: BehaviorHit | null = null;
    let bestPass = Number.POSITIVE_INFINITY;
    for (const h of hits) {
      const p = this.pass.get(h.id) ?? 0;
      // Tie-break by higher weight (more-taught behavior wins the tie).
      if (p < bestPass || (p === bestPass && best !== null && h.weight > best.weight)) {
        best = h; bestPass = p;
      }
    }
    if (best) {
      const stride = this.stride.get(best.id) ?? 1;
      this.pass.set(best.id, bestPass + stride);
    }
    return best;
  }

  /** Convenience: detect + pick in one call. */
  next(ctx: BehaviorContext): BehaviorHit | null {
    return this.pick(detectBehaviors(ctx));
  }

  reset(): void { this.pass.clear(); }
}
