/**
 * principleQuiz — Phase 3.3 of the Danya review build: the "device"
 * application mini-quiz. After the coach states the principle, the student
 * immediately APPLIES it ("would this move be acceptable according to our
 * device? … why not?") — the principle is a tool, not a poster.
 *
 * G0 throughout: candidates come from the engine's own lines plus the
 * student's actual played move; every verdict is an eval comparison
 * (mover-POV, computed); the reveal states only those numbers. No LLM
 * decides anything here.
 */
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { principleFor } from '../data/principles';

export interface PrincipleQuizEngine {
  analyzePosition(fen: string, depth: number): Promise<StockfishAnalysis>;
}

export interface PrincipleQuizCandidate {
  san: string;
  /** Cost vs the engine's best, in mover-POV centipawns (0 for the best). */
  deltaCp: number;
  /** Passes the device: within EQUIV_CP of the best move. */
  complies: boolean;
}

export interface PrincipleQuiz {
  tag: string;
  device: string;
  fen: string;
  ask: string;
  /** Deterministic order (sorted by SAN) — no shuffle-randomness. */
  candidates: PrincipleQuizCandidate[];
  correctSan: string;
}

/** A failing candidate must fail CLEARLY (vs best, mover-POV), so the
 *  reveal has something concrete to say and the quiz has one honest
 *  answer. Near-best alternatives never become distractors. */
const CLEAR_FAIL_CP = 100;

const moverPov = (whitePovCp: number, moverIsWhite: boolean): number =>
  moverIsWhite ? whitePovCp : -whitePovCp;

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    return mv.san;
  } catch {
    return null;
  }
}

/** Mover-POV eval of a candidate move, from the root analysis when the
 *  multipv lines carry it, else via a child-position probe. Null when
 *  unverifiable — the quiz then omits the candidate (never guesses). */
async function evalCandidate(
  fen: string,
  san: string,
  moverIsWhite: boolean,
  analysis: StockfishAnalysis,
  engine: PrincipleQuizEngine,
  depth: number,
): Promise<number | null> {
  for (const line of analysis.topLines) {
    const first = line.moves[0];
    if (first && uciToSan(fen, first) === san) {
      return line.mate !== null
        ? (line.mate > 0 ? 100_000 : -100_000)
        : moverPov(line.evaluation, moverIsWhite);
    }
  }
  try {
    const c = new Chess(fen);
    c.move(san);
    const child = await engine.analyzePosition(c.fen(), depth);
    // Child eval is White-POV of the child position — still White-POV
    // globally, so the same mover-POV conversion applies.
    return moverPov(child.evaluation, moverIsWhite);
  } catch {
    return null;
  }
}

/**
 * Build the mini-quiz for a principle moment, or null when an honest
 * single-answer quiz can't be formed (no device for the tag, the played
 * move actually passes, evals unverifiable). Null means NO quiz — never
 * a manufactured one.
 */
export async function buildPrincipleQuiz(opts: {
  tag: string;
  fen: string;
  playedSan: string;
  engine: PrincipleQuizEngine;
  depth?: number;
}): Promise<PrincipleQuiz | null> {
  const { tag, fen, playedSan, engine } = opts;
  const depth = opts.depth ?? 12;
  const device = principleFor(tag);
  if (!device) return null;

  let moverIsWhite: boolean;
  try {
    const c = new Chess(fen);
    moverIsWhite = c.turn() === 'w';
    c.move(playedSan); // validity check only
  } catch {
    return null;
  }

  let analysis: StockfishAnalysis;
  try {
    analysis = await engine.analyzePosition(fen, depth);
  } catch {
    return null;
  }
  const bestSan = uciToSan(fen, analysis.bestMove);
  if (!bestSan || bestSan === playedSan) return null;
  const bestEval = analysis.isMate && analysis.mateIn !== null
    ? (moverPov(analysis.evaluation, moverIsWhite) > 0 ? 100_000 : -100_000)
    : moverPov(analysis.evaluation, moverIsWhite);

  const playedEval = await evalCandidate(fen, playedSan, moverIsWhite, analysis, engine, depth);
  if (playedEval === null) return null;
  const playedDelta = bestEval - playedEval;
  // The quiz needs the played move to CLEARLY fail the device — a near-best
  // played move makes "which passes?" ambiguous or dishonest.
  if (playedDelta < CLEAR_FAIL_CP) return null;

  const candidates: PrincipleQuizCandidate[] = [
    { san: bestSan, deltaCp: 0, complies: true },
    { san: playedSan, deltaCp: playedDelta, complies: false },
  ];

  // Optional third chip: the engine's second line, only when it ALSO
  // clearly fails (a close second would give the quiz two right answers).
  const second = analysis.topLines[1]?.moves[0];
  if (second) {
    const secondSan = uciToSan(fen, second);
    if (secondSan && secondSan !== bestSan && secondSan !== playedSan) {
      const line = analysis.topLines[1];
      const secondEval = line.mate !== null
        ? (line.mate > 0 ? 100_000 : -100_000)
        : moverPov(line.evaluation, moverIsWhite);
      const delta = bestEval - secondEval;
      if (delta >= CLEAR_FAIL_CP) {
        candidates.push({ san: secondSan, deltaCp: delta, complies: false });
      }
    }
  }

  candidates.sort((a, b) => a.san.localeCompare(b.san));
  return {
    tag,
    device,
    fen,
    ask: 'Run the device on this position — which move passes?',
    candidates,
    correctSan: bestSan,
  };
}

/** The spoken verdict for a picked candidate — computed numbers only. */
export function quizVerdictLine(quiz: PrincipleQuiz, pickedSan: string): string {
  const picked = quiz.candidates.find((c) => c.san === pickedSan);
  if (!picked) return `The device points to ${quiz.correctSan}.`;
  if (picked.complies) {
    return `Right — ${picked.san} passes the device. That's the engine's own choice.`;
  }
  const pawns = (picked.deltaCp / 100).toFixed(1);
  return `${picked.san} fails the device — it gives up about ${pawns} pawns. The move that passes is ${quiz.correctSan}.`;
}
