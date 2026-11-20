import { Chess } from 'chess.js';
// positionReadComposer — THE READ OF A POSITION, composed in ONE place
// (WO-STANDARD-01, 2026-09-22). `usePositionNarration` used to compose this
// itself from six computers — the note, the phase, the position facts, the
// positional read, the tactics context and the deepest look-ahead — which made
// the hook a third coach (surfaceComposition.scan). The hook now owns the
// engine read, the phrasing and the voice; WHAT is said comes from here.
//
// G0: every sentence returned is computed; the caller's model only phrases
// them, most-important-first, in the order returned.
import { buildFedTacticsContext } from './liveTacticsContext';
import { sharpGap, SHARP_GAP_CP } from './positionCharacter';
import type { BoardReader } from './boardReadFacts';
import { boardReadOffThread } from './boardReadOffThread';
import { tryReadBudget, poolBudgetMs, poolDispatcher, type ReadSurface, type ReadBudget } from './tryReadBudget';
import { decideRead, readContextOf } from './readDecider';
import { stockfishEngine } from './stockfishEngine';
import type { EvalBoardFn } from './perturbation';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from './danyaTeachingService';
import { lastMoveIfStudent, lastMoveIfOpponent, sansOfPgn } from './lastMoveOfLine';
import type { StudentNeedContext } from './needScore';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { WeaknessSignal } from './weaknessSignal';
import type { ReadStory } from './gameStory';

/** The seat every sentence of the read is computed in. The facts computers
 *  write "you / they", so the read speaks that seat end to end and the phraser
 *  is never asked to re-seat anything (G0: pronouns are a board fact — whose
 *  piece — not a phrasing choice). `usePositionNarration` phrases in it too. */
export const READ_SEAT = 'student' as const;

/** How many pool workers a read asks for: one per try it reads, the pool
 *  gives what it has (`acquirePool` never waits). */
const POOL_WANT = 8;

/** The reader for the board's tries, on the surface's budget
 *  (`tryReadBudget`): the board after the best move on the singleton (its
 *  MultiPV fan), every try on the worker pool in parallel when one can be had
 *  — the singleton otherwise, exactly as before. `release` frees the pool. */
export async function surfaceBoardReader(
  surface: ReadSurface,
  /** The read will read tries (the student's turn, not a puzzle being solved). */
  readsTries: boolean,
  acquire: (size: number, budgetMs: number) => Promise<{ engines: Array<{ analyzeDeep(fen: string, depth: number, budgetMs?: number): Promise<StockfishAnalysis> }>; release: () => void } | null>,
  single: (fen: string, depth: number, budgetMs: number) => Promise<StockfishAnalysis>,
): Promise<{ read: BoardReader; release: () => void }> {
  const budget = tryReadBudget(surface);
  const pool = budget.pool && readsTries ? await acquire(POOL_WANT, poolBudgetMs(surface)).catch(() => null) : null;
  const pooled = pool && pool.engines.length > 0
    ? poolDispatcher(pool.engines.map((e) => ({ read: async (fen: string, b: ReadBudget) => (await e.analyzeDeep(fen, b.depth, b.budgetMs)).topLines ?? null })))
    : null;
  const read: BoardReader = (fen, source) => {
    const b = budget.reads[source];
    const viaPool = !!pooled && source !== 'best-after';
    // A pool worker answers one line, the singleton its MultiPV fan: the route is part of the read.
    return cachedTryRead(`${viaPool ? 'pool' : 'single'}|${b.depth}|${b.budgetMs}|${fen}`, async () => (
      pooled && viaPool ? pooled(fen, b) : (await single(fen, b.depth, b.budgetMs)).topLines ?? null
    ));
  };
  return { read, release: () => pool?.release() };
}

/** THE TRY READS, REMEMBERED (a second "read this position" tap, or a re-read
 *  of the same board, re-asked the engine for every tempting move — ~19
 *  searches a tap). A board read to the same depth and budget on the same
 *  route answers the same lines, so it is read once. A read that failed or
 *  came back empty is not kept. Bounded by age, oldest out first — a memory,
 *  not a cap on what is said. */
const TRY_READ_CACHE = new Map<string, Promise<readonly AnalysisLine[] | null>>();
const TRY_READ_CACHE_SIZE = 512;
function cachedTryRead(key: string, run: () => Promise<readonly AnalysisLine[] | null>): Promise<readonly AnalysisLine[] | null> {
  const hit = TRY_READ_CACHE.get(key);
  if (hit) {
    TRY_READ_CACHE.delete(key);
    TRY_READ_CACHE.set(key, hit);
    return hit;
  }
  const p = run();
  TRY_READ_CACHE.set(key, p);
  if (TRY_READ_CACHE.size > TRY_READ_CACHE_SIZE) {
    const oldest = TRY_READ_CACHE.keys().next().value;
    if (oldest !== undefined) TRY_READ_CACHE.delete(oldest);
  }
  p.then((lines) => { if (!lines || lines.length === 0) TRY_READ_CACHE.delete(key); }, () => { TRY_READ_CACHE.delete(key); });
  return p;
}

interface PositionReadInput {
  fen: string;
  pgn: string;
  playerColor: 'white' | 'black';
  openingName: string | null;
  rating: number;
  /** The engine's read of this board, already taken by the caller (cached or fresh); null when the engine gave nothing. */
  analysis: StockfishAnalysis | null;
  /** The student's tactics skill-radar reading, when the profile carries one. */
  tacticsSkill: number | undefined;
  studentWeaknesses: readonly WeaknessSignal[];
  studentNeedContext: StudentNeedContext | null;
  /** The engine's board evaluator for the facts computer — the caller owns the engine. */
  evalBoard: EvalBoardFn;
  /** True once the caller has moved on (a newer tap, an unmount): stop composing. */
  isCancelled: () => boolean;
  /** May a corpus note lead the read? REQUIRED (2026-09-23): Learn free play
   *  carries no corpus notes; the surface that mounts the read decides. */
  corpusNotes: boolean;
  /** A move the read must NOT give away — a puzzle's solution before the
   *  student has answered (Tactics "Teach me this position", 2026-10-01).
   *  REQUIRED: `null` on a live board. When set, the weighing lane (it names
   *  the move) stays quiet, and any line naming the move or its squares is
   *  dropped — the read teaches the POSITION, never the answer. */
  withhold: string | null;
  /** REQUIRED — read the moves a player is drawn to here
   *  (`movePurposeEngine.temptingReads`, at `rating`, from the engine's best
   *  line in `analysis`) so the tempting move that fails is said
   *  (WO-DANYA-READS-01 group 4). The composer reads them itself, so a
   *  surface never imports the computer. Never on a withheld board. */
  readTempting: boolean;
  /** REQUIRED: the surface the read is on — its engine budget for the tries
   *  (`tryReadBudget`: Learn shallow and parallel, Review deep). */
  surface: ReadSurface;
  /** REQUIRED: the game's story the read is told against (`ReadStory`, taken
   *  when the student taps) — Learn's mount only; null on every standalone
   *  board (`boardReadFacts.story`). */
  story: ReadStory | null;
}

/** Below this the forcing best move is one of several (a capture or a
 *  check that merely keeps pace with the quiet moves). */
const FORCING_SHOT_GAP_CP = 50;

/**
 * IS THERE A SHOT FOR THE STUDENT TO PLAY NOW — the forcing-scan habit's
 * earning fact (Danya narration test 2026-11-19: "Habit for positions like
 * this: CCT" on a quiet squeeze where the top three moves sit within a tenth,
 * because a standing pin, which carries no verdict, counted as a shot). With
 * two lines or more the ENGINE says it: the student mates, one move stands a
 * sharp gap above the rest, or a check or capture stands clearly above it.
 * With one line (a puzzle) the detectors' own tactic for the student does.
 */
export function readHasShot(
  fen: string,
  student: 'w' | 'b',
  lines: ReadonlyArray<{ moves: readonly string[]; evaluation: number; mate?: number | null }>,
  detectorTactic: boolean,
): boolean {
  if (fen.split(' ')[1] !== student) return false;
  const best = lines[0];
  if (!best || lines.length < 2) return detectorTactic;
  const seat = student === 'w' ? 1 : -1;
  if (typeof best.mate === 'number') return best.mate * seat > 0;
  const gap = sharpGap(best.evaluation, lines[1].evaluation) ?? 0;
  if (gap >= SHARP_GAP_CP) return true;
  let forcing = false;
  try {
    const u = best.moves[0];
    const m = new Chess(fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    forcing = !!m.captured || /[+#]$/.test(m.san);
  } catch { return false; }
  return forcing && gap >= FORCING_SHOT_GAP_CP;
}

/** The SAN and the two squares a withheld move would reveal. */
function withheldMarks(fen: string, san: string | null): { san: string; squares: string[] } | null {
  if (!san) return null;
  try {
    const m = new Chess(fen).move(san);
    return m ? { san: m.san.replace(/[+#]$/, ''), squares: [m.from, m.to] } : null;
  } catch {
    return null;
  }
}

function reveals(text: string, marks: { san: string; squares: string[] } | null): boolean {
  if (!marks) return false;
  if (text.includes(marks.san)) return true;
  return marks.squares.some((sq) => new RegExp(`\\b${sq}\\b`).test(text));
}

/**
 * Every computed sentence of the read, most-important-first, joined for the
 * phraser. Empty when the board says nothing worth a word — the caller then
 * stays silent rather than inventing.
 */
export async function composePositionRead(i: PositionReadInput): Promise<string> {
  const studentCC: 'w' | 'b' = i.playerColor === 'white' ? 'w' : 'b';
  const sans = sansOfPgn(i.pgn);
  const marks = withheldMarks(i.fen, i.withhold);

  // The bounded tactics context — the habit that closes the read reads it.
  // Reuses the analysis the caller already took (no extra engine
  // read); falls back to a FEN-only scan if that analysis is thin.
  const tactics = (await buildFedTacticsContext(
    i.fen,
    studentCC,
    i.rating,
    i.analysis,
    () => Promise.resolve(null), // latency-safe: reuse the cached analysis, no extra engine read
    i.tacticsSkill,
  ).catch(() => undefined)) ?? null;
  if (i.isCancelled()) return '';

  // 1. THE CORPUS LEADS (David 2026-08-13: "narrations follow the corpus,
  //    hand written, computed note format"). A read of the board starts from a
  //    farmed teaching note about THIS position when one exists — board-gated
  //    at retrieval, framed honestly by origin. No note = the computed facts
  //    carry the read alone.
  let noteLine = '';
  if (i.corpusNotes) try {
    const src = teachingSourceForBoard(sans, i.fen, i.openingName, i.playerColor);
    if (src) noteLine = generalizedTeaching(src.origin, spokenBeatText(src.note)).trim();
  } catch { /* corpus unavailable — the computed read stands alone */ }

  // 2. THE READ — every fact the computers make about this board, and the
  //    ones his order asks for, one a step (`readDecider`: the story, the
  //    calm answer, the tempting move refuted). The habit closes it below.
  let readLines: string[] = [];
  let habitLine: string | null = null;
  const before = [...(i.analysis?.topLines ?? [])].sort((x, y) => x.rank - y.rank);
  if (before.length) try {
    // The tries are read only on the student's own turn, never on a puzzle
    // still being solved: no tries, no pool.
    const readsTries = i.readTempting && !marks && i.fen.split(' ')[1] === studentCC;
    const reader = await surfaceBoardReader(
      i.surface, readsTries,
      async (size, budgetMs) => (await import('./gameAnalysisService')).acquirePvEngines(size, budgetMs),
      (fen, depth, budgetMs) => stockfishEngine.analyzeWithBudget(fen, depth, budgetMs),
    );
    const read = await boardReadOffThread({
      fen: i.fen, studentColor: studentCC, rating: i.rating, before, history: sans, theory: true, tense: 'now',
      withhold: !!marks, readTempting: i.readTempting && !marks, engineFutures: tryReadBudget(i.surface).engineFutures,
      read: reader.read,
      story: i.story,
      // THE HEAT MAP + THE NEED TERM (B3): the student's record and the
      // last move on each side when the PGN produces this board.
      studentNeedContext: i.studentNeedContext,
      extra: {
        evalBoard: i.evalBoard, studentWeaknesses: i.studentWeaknesses,
        lastMove: lastMoveIfStudent(sans, i.playerColor, i.fen) ?? undefined,
        opponentLastMove: lastMoveIfOpponent(sans, i.playerColor, i.fen) ?? undefined,
      },
    }).finally(reader.release);
    // 3. THE DECIDER picks the facts and THE HABIT THAT CLOSES THE READ
    //    (WO-DANYA-READS-01 group 9): the routine that finds this board's
    //    point next time — on a puzzle being solved, the attacking scan.
    const decided = decideRead(read.facts, readContextOf({
      fen: i.fen,
      top: before[0] ? { evaluation: before[0].evaluation, mate: before[0].mate ?? null } : null,
      bestUci: before[0]?.moves[0] ?? null,
      withheld: marks?.squares ?? null,
      studentShot: readHasShot(i.fen, studentCC, before, (tactics?.immediate ?? []).some((t) => t.side === 'student')),
      said: i.story?.claims ?? null,
      line: before[0]?.moves ?? [],
    }));
    readLines = decided.facts.map((f) => f.text);
    habitLine = decided.habit;
  } catch { readLines = []; }
  if (i.isCancelled()) return '';

  return [noteLine, ...readLines, habitLine ?? '']
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !reveals(t, marks))
    .join(' ');
}
