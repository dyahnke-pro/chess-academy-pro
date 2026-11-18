/**
 * BOARD READ FACTS — every fact the app's computers make about one board, for
 * the read (David 2026-11-18: "Read this position" in his manner): the
 * board's own reads (`computePositionFacts`, every candidate before any door),
 * the tempting moves refuted by their own lines (`temptingOnBoard`), and what
 * the engine's best move does (`moveThoughtFacts` on the board after it).
 *
 * `readDecider.decideRead` picks which of them a read says and orders them.
 * The engine is a parameter, so the app (Stockfish in a worker) and the
 * offline fitter (`scripts/board-facts-dump.ts`, native Stockfish) build the
 * SAME facts the decider was trained on.
 */
import { Chess } from 'chess.js';
import { computePositionFacts, type PositionFactsInput } from './positionFacts';
import { stakeValue } from './factStakes';
import { factDepth } from './thoughtComposer';
import { temptingOnBoard, candidateMoves, type WeighRead } from './weighedMoves';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { ReadFact } from './readDecider';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { IntroTense } from '../utils/moveIntro';
import type { ImportanceTier } from './narrationImportance';

/** One engine read of a board: its lines, best first. Null when unread. */
export type BoardReader = (fen: string) => Promise<readonly AnalysisLine[] | null>;

export interface BoardFact extends ReadFact {
  group: string;
  squares: readonly string[];
  /** The candidate's id in `computePositionFacts` (position facts only). */
  id: string | null;
}

export interface BoardReadInput {
  fen: string;
  studentColor: 'w' | 'b';
  rating: number;
  /** The engine's read of THIS board (MultiPV), best line first. */
  before: readonly AnalysisLine[];
  /** Reads any other board the facts need (each tempting move, the board after the best move). */
  read: BoardReader;
  /** A puzzle still being solved: nothing that rules a move in or out. */
  withhold: boolean;
  /** 'now' in the app (the move is shown, not played); the fitter's facts were built 'past'. */
  tense: IntroTense;
  history: readonly string[];
  theory: boolean;
  /** Read the moves a player is drawn to (the student's turn only). */
  readTempting: boolean;
  /** REQUIRED: the student's record for the need term (null on a fitter's board). */
  studentNeedContext: PositionFactsInput['studentNeedContext'];
  /** Passed through to the board's reads: the record, and the last move on each side. */
  extra?: Pick<PositionFactsInput, 'studentWeaknesses' | 'evalBoard' | 'lastMove' | 'opponentLastMove'>;
}

function asAnalysis(lines: readonly AnalysisLine[]): StockfishAnalysis {
  const top = lines[0];
  return {
    bestMove: top?.moves[0] ?? '',
    evaluation: top?.evaluation ?? 0,
    isMate: top?.mate !== null && top?.mate !== undefined,
    mateIn: top?.mate ?? null,
    depth: top?.depth ?? 0,
    topLines: [...lines],
    nodesPerSecond: 0,
  };
}

export interface BoardRead {
  facts: BoardFact[];
  /** The one door's importance tier for the board (null when unread). */
  tier: ImportanceTier | null;
}

export async function boardReadFacts(i: BoardReadInput): Promise<BoardRead> {
  const side: 'w' | 'b' = i.fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const facts: BoardFact[] = [];
  const top = i.before[0];
  if (!top) return { facts, tier: null };

  const pf = await computePositionFacts({
    theory: i.theory, namesPlayedMove: true, boardComputers: 'composer', posture: 'asked', namesBestMove: !i.withhold,
    fen: i.fen, moverColor: side, studentColor: i.studentColor, rating: i.rating, analysis: asAnalysis(i.before), history: [...i.history],
    studentNeedContext: i.studentNeedContext, ...(i.extra ?? {}),
  });
  for (const c of pf.candidates) {
    if (i.withhold && c.kind === 'deliberation') continue;
    facts.push({ from: 'position', kind: c.kind, group: c.group, text: c.text, squares: c.squares ?? [], stake: stakeValue(c.stakes), depth: null, id: c.id });
  }
  const done = (): BoardRead => ({ facts, tier: pf.importance.tier });
  if (i.withhold) return done();

  // The tempting moves, each read to its own line — the student's turn only.
  if (i.readTempting && side === i.studentColor) {
    const tempting: WeighRead[] = [{ evaluation: top.evaluation, mate: top.mate, moves: top.moves }];
    for (const c of candidateMoves(i.fen, i.rating, { played: null, scored: null })) {
      if (c.uci === top.moves[0]) continue;
      const after = new Chess(i.fen);
      try { after.move({ from: c.from, to: c.to, promotion: c.uci[4] }); } catch { continue; }
      if (after.isGameOver()) continue;
      const t = (await i.read(after.fen()).catch(() => null))?.[0];
      if (t) tempting.push({ evaluation: t.evaluation, mate: t.mate, moves: [c.uci, ...t.moves], earlier: t.earlier?.moves ? [c.uci, ...t.earlier.moves] : null });
    }
    for (const t of temptingOnBoard({ fen: i.fen, student: i.studentColor, rating: i.rating, reads: tempting, priorMove: null })) {
      facts.push({ from: 'tempting', kind: 'refuted', group: 'choices', text: t.text, squares: [], stake: null, depth: null, id: null });
    }
  }

  // What the best move does, read on the board after it.
  const uci = top.moves[0];
  if (uci) {
    const board = new Chess(i.fen);
    let san: string;
    try { san = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' }).san; } catch { return done(); }
    const after = await i.read(board.fen()).catch(() => null);
    if (after) {
      for (const f of moveThoughtFacts({
        fenBefore: i.fen, san, moverIsStudent: side === i.studentColor, namesPlayedMove: true, plainThreatsSeen: false, tense: i.tense, theory: false, story: false,
        prev: NO_PREV_CAPTURE, line: top.moves, history: [], theirLast: null, phrases: null, reads: { before: [...i.before], after: [...after], passBefore: [], passAfter: [] }, costCp: 0,
      })) {
        facts.push({ from: 'bestMove', kind: f.kind, group: f.group, text: f.text, squares: f.squares ?? [], stake: stakeValue(f.stakes), depth: factDepth(f), id: null });
      }
    }
  }
  return done();
}
