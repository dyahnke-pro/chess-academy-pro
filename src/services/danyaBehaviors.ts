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
  findXrays,
  findKnightReroute,
  findFianchetto,
  findRookLift,
  findBlockade,
} from './positionReadingService';

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const PIECE_VALUE_TABLE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

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
      // Danya's real "piece activity" read is a CONCRETE placement — a knight
      // on an outpost, a rook on the open file, a bad bishop to improve — NOT
      // "your queen is your most active piece" (the queen always has the widest
      // scope; naming it every turn was the bug). Prefer a good minor/rook, then
      // a bad piece to reroute. `findPieceQuality` computes exactly this.
      const notes = findPieceQuality(fen).filter((n) => n.color === student);
      const good = notes.find((n) => n.quality === 'good' && (n.piece === 'n' || n.piece === 'b' || n.piece === 'r'));
      if (good) {
        // A good outpost / rook on the open file is worth praising any time.
        return { fact: `Your ${PIECE_NAME[good.piece]} on ${good.square} — ${good.reason}. Build around it.`, squares: [good.square] };
      }
      // "Reroute your worst piece" is a MIDDLEGAME idea — in the opening a piece
      // is passive because it isn't developed yet (David 2026-08-23).
      const isMiddlegame = Number(fen.split(' ')[5] ?? '0') >= 10;
      if (!isMiddlegame) return null;
      const bad = notes.find((n) => n.quality === 'bad');
      if (bad) {
        return { fact: `Your ${PIECE_NAME[bad.piece]} on ${bad.square} is a ${bad.reason} — reroute it to a better square.`, squares: [bad.square] };
      }
      // Fallback: a genuinely passive MINOR (never the queen/king/rook).
      const { weakest } = strongestWeakestPiece(fen, student);
      if (weakest && (weakest.piece === 'n' || weakest.piece === 'b') && weakest.scope <= 1) {
        return { fact: `Your ${PIECE_NAME[weakest.piece]} on ${weakest.square} is doing nothing — find it a better square.`, squares: [weakest.square] };
      }
      return null;
    },
  },
  {
    id: 'king-safety',
    weight: 937,
    detect: ({ fen, student, opp }) => {
      // A king with its pawn shield intact is NOT exposed — the raw `exposed`
      // flag fired on move 1 (David's complaint). Require REAL exposure: an
      // open file bearing on the king AND a broken shield (≤1 shield pawn), and
      // only past the opening so it isn't just "the uncastled starting king".
      const moveNo = Number(fen.split(' ')[5] ?? '0');
      const theirs = kingSafetyRead(fen, opp);
      if (theirs?.exposed && theirs.openFilesNearKing.length >= 1 && theirs.shieldPawns <= 1 && moveNo >= 8) {
        const files = theirs.openFilesNearKing.join(', ');
        return { fact: `The enemy king on ${theirs.square} is exposed — the ${files}-file is open toward it. Play for the attack.`, squares: [sq(theirs.square)] };
      }
      // Your own king stuck in the center is only a real problem once pieces are
      // out and the center can open — not on move 3 with everything at home.
      const mine = kingSafetyRead(fen, student);
      if (mine && !mine.castled && mine.inCenter && moveNo >= 8 && mine.openFilesNearKing.length >= 1) {
        return { fact: `Your king on ${mine.square} is still in the center with lines opening — castle before anything sharp.`, squares: [sq(mine.square)] };
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
    detect: ({ fen, student, opp, chess }) => {
      if (!chess) return null;
      const moveNo = Number(fen.split(' ')[5] ?? '99');
      if (moveNo < 3 || moveNo > 14) return null;
      const mine = developmentRead(fen, student);
      const theirs = developmentRead(fen, opp);
      if (!mine || !theirs) return null;
      // Only fire when you are genuinely BEHIND the opponent — not just
      // "uncastled", which was true for both sides every opening ply.
      const iLag = mine.developedMinors + (mine.castled ? 2 : 0);
      const theyLead = theirs.developedMinors + (theirs.castled ? 2 : 0);
      if (theyLead - iLag >= 2 && !mine.castled) {
        return { fact: `You're behind in development — get the minor pieces out and castle before the position sharpens.`, squares: [] };
      }
      return null;
    },
  },
  {
    id: 'tactics',
    weight: 647,
    detect: ({ fen, student, chess }) => {
      if (!chess) return null;
      const t = detectTactics(fen);
      // Only surface tactics that actually MATTER — drop the trivial geometric
      // "bishop pins the f7-PAWN against a knight" noise that fired every ply.
      // A pin/skewer must involve a real piece (≥ knight) behind the line, and
      // every reported tactic must favor the student.
      const meaningful = t.tactics.filter((p) => {
        if (p.beneficiary !== student || p.type === 'none') return false;
        if (p.type === 'pin' || p.type === 'skewer') {
          // involvedSquares: [attacker, front, back]. The PINNED (front) piece
          // must be a real piece (≥ knight) — pinning the f7-PAWN against a
          // knight is not a teaching tactic (it fired every ply). A pin/skewer
          // is worth naming only when the immobilized piece is worth winning or
          // shielding something worth winning.
          const frontSq = p.involvedSquares[1];
          const front = frontSq ? chess.get(frontSq as Square) : null;
          const val = (x: { type: PieceSymbol } | null | undefined): number => (x ? { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }[x.type] : 0);
          // The PINNED/skewered piece itself must be a real piece — pinning the
          // f7-PAWN (against a knight or even the king) is not a teaching tactic
          // and fired on nearly every ply.
          if (val(front) < 3) return false;
        }
        return true;
      });
      if (meaningful.length > 0) {
        const p = meaningful[0];
        return { fact: p.description, squares: p.involvedSquares.map(sq) };
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
      // advantage is WHITE-positive; convert to the student's side. Require ≥2
      // so a mid-exchange transient (one side has captured, recapture pending)
      // doesn't read as a durable material edge.
      const studentAdv = student === 'w' ? advantage : -advantage;
      if (studentAdv >= 2) {
        return { fact: `You're up material — trade pieces, keep pawns, and steer for the endgame.`, squares: [] };
      }
      if (studentAdv <= -2) {
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
      // A real, mounting threat — not "one bishop eyes f7" every ply. Either the
      // target is genuinely winnable (SEE) OR there is real tension with ≥2
      // attackers (the "two attackers, two defenders, one more and it falls"
      // frame Danya actually uses on a contested pawn like d4).
      const targets = pressuredTargets(fen, student);
      const winnable = targets.find((x) => x.verdict === 'winnable' && PIECE_VALUE_TABLE[x.piece] >= 3);
      if (winnable) {
        return { fact: `You win the ${PIECE_NAME[winnable.piece]} on ${winnable.square} — it can't be held.`, squares: [winnable.square] };
      }
      const tension = targets.find((x) => x.verdict === 'balanced-tension' && x.attackers >= 2);
      if (tension) {
        return { fact: `${tension.attackers} attackers on ${tension.square} against ${tension.defenders} defenders — pile on one more and it falls.`, squares: [tension.square] };
      }
      return null;
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
    id: 'knight-maneuver',
    weight: 207,
    detect: ({ fen, student }) => {
      if (Number(fen.split(' ')[5] ?? '0') < 10) return null; // a middlegame idea
      const rr = findKnightReroute(fen, student);
      if (rr) {
        const path = rr.via ? `, by way of ${rr.via},` : '';
        return { fact: `Route the knight from ${rr.from} to ${rr.to}${path} — a square no pawn can ever chase it from.`, squares: [rr.from, rr.to] };
      }
      return null;
    },
  },
  {
    id: 'x-ray',
    weight: 125,
    detect: ({ fen, student }) => {
      const xr = findXrays(fen, student)[0];
      if (xr) {
        return { fact: `Your ${PIECE_NAME[xr.sliderPiece]} on ${xr.slider} x-rays their ${PIECE_NAME[xr.targetPiece]} on ${xr.target} through ${xr.blocker} — if that blocker shifts, you win it.`, squares: [xr.slider, xr.blocker, xr.target] };
      }
      return null;
    },
  },
  {
    id: 'rook-lift',
    weight: 128,
    detect: ({ fen, student }) => {
      if (Number(fen.split(' ')[5] ?? '0') < 10) return null; // an attacking-phase idea
      const rl = findRookLift(fen, student);
      if (rl) {
        return { fact: `Lift the rook to ${rl.to} and swing it along the third rank into the attack.`, squares: [rl.rook, rl.to] };
      }
      return null;
    },
  },
  {
    id: 'fianchetto',
    weight: 93,
    detect: ({ fen, student }) => {
      const b = findFianchetto(fen, student);
      if (b) {
        return { fact: `Your bishop on ${b} rakes the long diagonal — keep that diagonal open and it dominates.`, squares: [b] };
      }
      return null;
    },
  },
  {
    id: 'blockade',
    weight: 86,
    detect: ({ fen, student }) => {
      const bl = findBlockade(fen, student);
      if (bl) {
        return { fact: `Your ${bl.blocker} piece is the perfect blockader — it sits in front of the passed pawn on ${bl.pawn} and that pawn goes nowhere.`, squares: [bl.blocker, bl.pawn] };
      }
      return null;
    },
  },
  {
    id: 'piece-preservation',
    weight: 90,
    detect: ({ fen, student }) => {
      // Only once pieces are actually developed, and only for a genuinely ACTIVE
      // minor — not the move-1 home bishop that happens to out-scope the enemy's
      // still-sleeping pieces.
      const moveNo = Number(fen.split(' ')[5] ?? '0');
      if (moveNo < 6) return null;
      const keep = bestMinorToKeep(fen, student);
      if (keep?.dominant && keep.note.scope >= 6) {
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
