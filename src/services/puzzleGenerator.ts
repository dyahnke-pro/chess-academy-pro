/**
 * puzzleGenerator — ONE source-agnostic puzzle generator (P6 of the
 * computed-concept engine, docs/plans/2026-09-14-computed-concept-detectors.md).
 *
 * David 2026-09-14: "Ability to make puzzles is also good. If the coach is
 * able to generate master level puzzles on its own that would be amazing. Even
 * better if it's from their own games!" and "no difference between my games
 * and a master game. Should be able to make master puzzles from users own."
 *
 * So the generator takes a GAME (any PGN — the student's own, a pro's, an
 * imported one) plus an ANALYZE function (the app's Stockfish at runtime, a
 * spawned engine offline) and walks every position:
 *
 *   engine swing   → the best line beats the runner-up by ≥ minSwingCp AND
 *                    leaves the solver decisively better (or mating) — a
 *                    unique, winning find, not "the slightly better move";
 *   concept        → `conceptForLine` (the concept engine — the SAME walker
 *                    puzzles, Learn, Play and Review consume) must name a
 *                    tactic / mate / technique the line teaches. HARD RULE: a
 *                    puzzle the coach can't teach the concept of is not a
 *                    puzzle (David: "otherwise what is the point??");
 *   rating         → `estimatePuzzleRating` — computed per position, so the
 *                    master tier (≥2400) is a filter over ANY source;
 *   shape          → Lichess convention: `fen` is the position BEFORE the
 *                    opponent's setup move, `moves[0]` is that move, the rest
 *                    is the solution — so every existing puzzle surface
 *                    (PuzzleBoard, the classroom drill, the hint system, the
 *                    reach ladder) serves it unchanged.
 *
 * G0/G3: every move is the engine's PV (chess.js-replayed), every tag is a
 * detector's output, every number is computed. Nothing is invented.
 */
import { Chess } from 'chess.js';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import { conceptForLine, type ComputedConcept } from './conceptEngine';
import { estimatePuzzleRating, type DifficultyFeatures } from './puzzleDifficulty';

/** The engine seam. Runtime: `stockfishEngine.analyzeWithBudget`; offline: a
 *  spawned UCI engine. Must return MultiPV ≥ 2 lines for the uniqueness test. */
export type PuzzleAnalyze = (fen: string) => Promise<Pick<StockfishAnalysis, 'topLines' | 'evaluation'>>;

export type GeneratedSource = 'own-game' | 'master-game' | 'pgn';

export interface GeneratedPuzzle {
  id: string;
  /** Position BEFORE the opponent's setup move (Lichess shape). */
  fen: string;
  /** `setupMove solverMove reply solverMove …` (UCI, space-separated). */
  moves: string;
  /** Lichess-style theme tags derived from the computed concepts + shape. */
  themes: string[];
  rating: number;
  /** The concepts the solution teaches (ranked, lead first). */
  concepts: Array<Pick<ComputedConcept, 'id' | 'name' | 'source' | 'short' | 'full'>>;
  sideToSolve: 'white' | 'black';
  source: GeneratedSource;
  sourceGameId?: string;
  /** 0-based ply index of the solver's position in the source game. */
  plyIndex: number;
  /** Best-line eval minus runner-up, solver POV, centipawns (mate = 10000). */
  swingCp: number;
  features: DifficultyFeatures;
}

export interface GenerateOptions {
  analyze: PuzzleAnalyze;
  /** Best line must beat the runner-up by this much (solver POV). */
  minSwingCp?: number;
  /** Best line must leave the solver at least this much better (or mating). */
  minWinCp?: number;
  /** Cap on solution length (setup move excluded). */
  maxSolutionPlies?: number;
  maxPuzzles?: number;
  source?: GeneratedSource;
  sourceGameId?: string;
  /** Only positions at or after this ply (skip the opening). */
  startPly?: number;
  /** Optional per-position hook (progress reporting / cancellation). */
  onPosition?: (plyIndex: number, total: number) => boolean | undefined;
}

const MATE_CP = 10000;

/** Eval of a line from the SOLVER's point of view, mates saturated. */
function solverPov(line: AnalysisLine, solver: 'w' | 'b'): number {
  const whitePov = line.mate !== null && line.mate !== 0
    ? Math.sign(line.mate) * (MATE_CP - Math.min(Math.abs(line.mate), 50))
    : line.evaluation;
  return solver === 'w' ? whitePov : -whitePov;
}

/** Replay a UCI line from `fen`, returning the legal prefix. */
function legalPrefix(fen: string, uci: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u.slice(4) : undefined });
      if (!m) break;
      out.push(u);
      if (c.isGameOver()) break;
    }
  } catch { /* prefix so far */ }
  return out;
}

/** Trim a solver-first line so it ENDS on a solver move (odd length) and
 *  respects the cap — the student's last move is the answer, never a reply. */
function trimToSolverMove(uci: string[], maxPlies: number): string[] {
  let line = uci.slice(0, maxPlies);
  if (line.length % 2 === 0) line = line.slice(0, -1);
  return line;
}

/** Lichess-style tags from the computed concepts + the solution shape. */
export function themesFor(concepts: readonly Pick<ComputedConcept, 'id' | 'source'>[], solverPlies: number, mateIn: number | null, swingCp: number): string[] {
  const tags = new Set<string>();
  const TACTIC_TAG: Record<string, string> = {
    fork: 'fork', pin: 'pin', skewer: 'skewer', discovery: 'discoveredAttack', double_check: 'doubleCheck',
    back_rank: 'backRankMate', removal_of_guard: 'capturingDefender', trapped_piece: 'trappedPiece',
    mate_threat: 'mate', overload: 'overloading', battery: 'attackingF2F7',
  };
  const MATE_TAG: Record<string, string> = {
    'back-rank-mate': 'backRankMate', 'smothered-mate': 'smotheredMate', 'arabian-mate': 'arabianMate',
    'anastasias-mate': 'anastasiaMate', 'hook-mate': 'hookMate', 'bodens-mate': 'bodenMate',
    'double-bishop-mate': 'doubleBishopMate', 'dovetail-mate': 'dovetailMate', 'kill-box-mate': 'killBoxMate',
    'vukovic-mate': 'vukovicMate', 'balestra-mate': 'balestraMate', 'morphys-mate': 'morphysMate',
    'pillsburys-mate': 'pillsburysMate', 'opera-mate': 'operaMate', 'swallows-tail-mate': 'swallowstailMate',
    'epaulette-mate': 'epauletteMate', 'corner-mate': 'cornerMate', 'blind-swine-mate': 'blindSwineMate',
  };
  const TECH_TAG: Record<string, string[]> = {
    opposition: ['endgame', 'pawnEndgame'], 'key-squares': ['endgame', 'pawnEndgame'], 'rule-of-the-square': ['endgame', 'pawnEndgame'],
    'rook-pawn-corner': ['endgame', 'pawnEndgame'], lucena: ['endgame', 'rookEndgame'], philidor: ['endgame', 'rookEndgame'],
    'cut-off-king': ['endgame', 'rookEndgame'], 'rook-behind-passer': ['endgame', 'rookEndgame'],
    'wrong-rook-pawn-bishop': ['endgame', 'bishopEndgame'], 'kp-vs-k': ['endgame', 'pawnEndgame'],
    'pawn-endgame': ['endgame', 'pawnEndgame'], 'rook-endgame': ['endgame', 'rookEndgame'], 'queen-endgame': ['endgame', 'queenEndgame'],
    'queen-vs-rook': ['endgame', 'queenRookEndgame'], 'opposite-bishops': ['endgame', 'bishopEndgame'], 'same-bishops': ['endgame', 'bishopEndgame'],
    'bishop-vs-knight': ['endgame'], 'knight-endgame': ['endgame', 'knightEndgame'], 'minor-endgame': ['endgame'],
    'rook-and-minor': ['endgame'], 'major-piece': ['endgame'], 'mating-material': ['endgame', 'mate'],
  };
  for (const c of concepts) {
    if (c.source === 'tactic' && TACTIC_TAG[c.id]) tags.add(TACTIC_TAG[c.id]);
    if (c.source === 'mate') { tags.add('mate'); if (MATE_TAG[c.id]) tags.add(MATE_TAG[c.id]); }
    if (c.source === 'technique' || c.source === 'matchup') for (const t of TECH_TAG[c.id] ?? ['endgame']) tags.add(t);
  }
  if (mateIn !== null && mateIn >= 1 && mateIn <= 5) { tags.add('mate'); tags.add(`mateIn${mateIn}`); }
  tags.add(solverPlies <= 1 ? 'oneMove' : solverPlies === 2 ? 'short' : solverPlies <= 3 ? 'long' : 'veryLong');
  tags.add(swingCp >= MATE_CP - 100 || swingCp >= 600 ? 'crushing' : 'advantage');
  return [...tags];
}

/** Stable id from the solver position + line — the dedupe key across runs. */
function puzzleId(source: GeneratedSource, fenSolver: string, line: readonly string[]): string {
  let h = 2166136261;
  for (const ch of `${fenSolver}|${line.join(' ')}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return `gen-${source}-${h.toString(36)}`;
}

/**
 * Generate puzzles from a sequence of positions (`fenBefore` + the move played
 * from it). Every position from `startPly` on is examined as a potential
 * SOLVER position; the setup move is the move that reached it.
 */
export async function generatePuzzlesFromPositions(
  plies: ReadonlyArray<{ fenBefore: string; uci: string }>,
  opts: GenerateOptions,
): Promise<GeneratedPuzzle[]> {
  const minSwing = opts.minSwingCp ?? 150;
  const minWin = opts.minWinCp ?? 150;
  const maxPlies = opts.maxSolutionPlies ?? 7;
  const maxPuzzles = opts.maxPuzzles ?? Infinity;
  const source = opts.source ?? 'pgn';
  const out: GeneratedPuzzle[] = [];
  const seen = new Set<string>();
  let skipUntil = -1; // plies inside a found combination are not new puzzles

  for (let i = Math.max(1, opts.startPly ?? 1); i < plies.length && out.length < maxPuzzles; i += 1) {
    if (opts.onPosition && opts.onPosition(i, plies.length) === false) break;
    if (i <= skipUntil) continue;
    const setup = plies[i - 1];
    const fenSolver = plies[i].fenBefore; // the position the setup move reached
    let solver: 'w' | 'b';
    try { solver = new Chess(fenSolver).turn(); } catch { continue; }

    let analysis: Awaited<ReturnType<PuzzleAnalyze>>;
    try { analysis = await opts.analyze(fenSolver); } catch { continue; }
    const lines = analysis.topLines ?? [];
    const best = lines[0];
    if (!best || best.moves.length === 0) continue;

    // Unique + winning: the engine's swing, on the solver's side of the board.
    const bestCp = solverPov(best, solver);
    if (bestCp < minWin) continue;
    if (lines.length < 2) continue; // can't prove uniqueness without a runner-up
    const swingCp = bestCp - solverPov(lines[1], solver);
    if (swingCp < minSwing) continue;

    const line = trimToSolverMove(legalPrefix(fenSolver, best.moves), maxPlies);
    if (line.length === 0) continue;

    // The concept the line teaches — the same walker every coach surface uses.
    const mateIn = best.mate !== null && best.mate !== 0 && Math.sign(best.mate) === (solver === 'w' ? 1 : -1)
      ? Math.abs(best.mate) : null;
    let concepts: ComputedConcept[] = [];
    try {
      concepts = conceptForLine({
        fen: fenSolver, uci: line, studentColor: solver,
        rootEvalCp: analysis.evaluation, lineEvalCp: best.evaluation, lineMate: best.mate, max: 3,
      }).filter((c) => c.source !== 'positional');
    } catch { concepts = []; }
    // HARD RULE: no concept, no puzzle — and the LEAD must be something the
    // solution DOES (a tactic, a mate, a named technique). A bare matchup
    // principle ("in a rook ending, activity…") is background, not the reason
    // the key move wins; it may ride as a support, never justify the puzzle.
    if (concepts.length === 0 || concepts[0].source === 'matchup') continue;

    const est = estimatePuzzleRating(fenSolver, line, concepts[0], mateIn);
    const id = puzzleId(source, fenSolver, line);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      fen: setup.fenBefore,
      moves: [setup.uci, ...line].join(' '),
      themes: themesFor(concepts, est.features.solverPlies, mateIn, swingCp),
      rating: est.rating,
      concepts: concepts.map((c) => ({ id: c.id, name: c.name, source: c.source, short: c.short, full: c.full })),
      sideToSolve: solver === 'w' ? 'white' : 'black',
      source,
      sourceGameId: opts.sourceGameId,
      plyIndex: i,
      swingCp,
      features: est.features,
    });
    skipUntil = i + line.length - 1;
  }
  return out;
}

/** Replay a PGN into (fenBefore, uci) plies. Empty on an unparseable PGN. */
export function pliesFromPgn(pgn: string): Array<{ fenBefore: string; uci: string; san: string }> {
  const out: Array<{ fenBefore: string; uci: string; san: string }> = [];
  try {
    const c = new Chess();
    c.loadPgn(pgn);
    const history = c.history({ verbose: true });
    const replay = new Chess();
    for (const m of history) {
      const fenBefore = replay.fen();
      replay.move(m.san);
      out.push({ fenBefore, uci: `${m.from}${m.to}${m.promotion ?? ''}`, san: m.san });
    }
  } catch { return []; }
  return out;
}

/** Generate puzzles from any PGN — the student's own game, a pro's, an import. */
export async function generatePuzzlesFromPgn(pgn: string, opts: GenerateOptions): Promise<GeneratedPuzzle[]> {
  const plies = pliesFromPgn(pgn);
  if (plies.length < 2) return [];
  return generatePuzzlesFromPositions(plies, opts);
}
