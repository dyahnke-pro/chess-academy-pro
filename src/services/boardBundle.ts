/**
 * ONE STANDARD BUNDLE EVERY COMPUTER READS (WO-PICTURE-01 P2/P3 infrastructure,
 * David 2026-11-19: "We pull all information from many computers but they are
 * only read as single sources of information").
 *
 * Each computer takes its own hand-made context, so nothing could ask EVERY
 * computer about a board — the picture, the refuter's "why does the result
 * change", the board at the end of a try. This table builds each computer's
 * context from one bundle: the board, the student, the engine's lines on it,
 * and the move that reached it. A computer whose context the bundle cannot
 * fill says which fields it needs (`needs`), never silently dropped; a new
 * computer fails to compile here until it answers (a `Record` over every id).
 *
 * Pure. Generated from `BoardContexts`, then held by the compiler.
 */
import { Chess, type Color } from 'chess.js';
import { readBoardAll, type BoardContexts, type ComputerId } from './boardComputers';
import type { CoachFact } from './coachFact';
import type { EngineLine } from './engineLineRead';
import type { AnalysisLine } from '../types';
import { afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './captureRun';
import type { MoveWords } from './thoughtReads';
import type { LastMove } from './material';
import { emptyPlanThread } from './gameStory';
import { NO_SOUND_PLIES } from './thinkAloud';
import { computeMustDefend } from './threatOut';
import { detectSetUpChance } from './setUpChance';
import { INACCURACY_CP, MISTAKE_CP } from './engineConstants';

export interface BoardBundle {
  /** The board read. */
  fen: string;
  /** Whose seat the words are for. */
  student: Color;
  /** The engine's lines from `fen`, best first, White's seat. */
  lines: readonly EngineLine[];
  rating: number;
  /** The game's moves to `fen`, SAN. */
  history: readonly string[];
  /** The move that reached `fen`, when there is one. */
  priorMove: { fenBefore: string; san: string } | null;
  /** Whose move that was. */
  priorMoveSeat: Color | null;
  /** The engine's lines from `priorMove.fenBefore`, best first, White's seat:
   *  what the mover could have played instead. */
  priorLines: readonly EngineLine[] | null;
  /** Other reads of the best line from `fen` (each from the reply), where the
   *  caller holds them: the line is named by the one naming rule (`lineTrust`).
   *  Absent: one read. */
  seconds?: ReadonlyArray<readonly string[]>;
}

type Adapter<K extends ComputerId> = ((b: BoardBundle) => BoardContexts[K] | null) | { needs: readonly string[] };

function studentCp(b: BoardBundle): number | null {
  const l = b.lines[0];
  if (!l || l.mate !== null || l.cp === null) return null;
  return b.student === 'w' ? l.cp : -l.cp;
}
function analysisOf(b: BoardBundle): AnalysisLine[] {
  return linesAsAnalysis(b.lines);
}
function replySan(b: BoardBundle): string | null {
  const u = b.lines[0]?.moves[0];
  if (!u) return null;
  try { return new Chess(b.fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return null; }
}
function moveOf(b: BoardBundle): { fenBefore: string; san: string; mover: Color } | null {
  if (!b.priorMove) return null;
  const mover: Color = b.priorMove.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  return { ...b.priorMove, mover };
}

function lineCp(l: EngineLine | undefined): number | null {
  if (!l) return null;
  if (l.mate !== null) return l.mate > 0 ? 100000 : -100000;
  return l.cp;
}
/** The engine's best move for the mover, from `fenBefore`. */
function priorBest(b: BoardBundle): string | null {
  const u = b.priorLines?.[0]?.moves[0];
  if (!u || !b.priorMove) return null;
  try { return new Chess(b.priorMove.fenBefore).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return null; }
}
/** What the move cost its mover: the best line before, against the board after. */
function cpLossOf(b: BoardBundle): number | null {
  const MOVE = moveOf(b);
  const before = lineCp(b.priorLines?.[0]);
  const after = lineCp(b.lines[0]);
  if (!MOVE || before === null || after === null) return null;
  const sign = MOVE.mover === 'w' ? 1 : -1;
  return Math.max(0, Math.min(2000, (before - after) * sign));
}

// ── THE REST OF THE BUNDLE, READ HONESTLY (WO-PICTURE-01 bundle reach) ──
// Every value below is read off the bundle itself: the engine's lines, the
// game's moves, or a fresh board's empty ledger (a standalone read has said
// nothing yet). A value a computer would state as a fact and the bundle does
// not hold is never made up — that computer keeps its `needs`.

/** A standalone read has said nothing: every say-once ledger starts empty. */
const NOTHING_SAID: ReadonlySet<string> = new Set<string>();

const toMove = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'b' : 'w');
/** Half-moves played to `fen`, off the FEN's own move counter. */
function plyOf(b: BoardBundle): number {
  const full = Number(b.fen.split(' ')[5] ?? 1) || 1;
  return (full - 1) * 2 + (toMove(b.fen) === 'b' ? 1 : 0);
}
/** A line's score from `side`'s seat; null on a mate or no score. */
function seatCp(l: EngineLine | undefined, side: Color): number | null {
  if (!l || l.mate !== null || l.cp === null) return null;
  return side === 'w' ? l.cp : -l.cp;
}
/** `uci` played out on `fen` as SAN (the playable prefix). */
function sansOf(fen: string, uci: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  } catch { /* the playable prefix */ }
  return out;
}
/** The engine's best line from `fen`, SAN — what follows the move. */
const lineSans = (b: BoardBundle): string[] => sansOf(b.fen, b.lines[0]?.moves ?? []);
const followOf = (b: BoardBundle): string[][] => { const s = lineSans(b); return s.length > 0 ? [s] : []; };
const bestLine = (b: BoardBundle): readonly string[] => b.lines[0]?.moves ?? [];
function linesAsAnalysis(ls: readonly EngineLine[]): AnalysisLine[] {
  return ls.map((l, i) => ({ rank: i + 1, evaluation: l.mate !== null ? (l.mate > 0 ? 100000 : -100000) : (l.cp ?? 0), mate: l.mate, moves: [...l.moves], depth: 0 })) as AnalysisLine[];
}
const priorAnalysis = (b: BoardBundle): AnalysisLine[] | null => (b.priorLines && b.priorLines.length > 0 ? linesAsAnalysis(b.priorLines) : null);
const scoredLines = (ls: readonly EngineLine[]): Array<{ moves: readonly string[]; evaluation: number; mate: number | null }> =>
  linesAsAnalysis(ls).map((l) => ({ moves: l.moves, evaluation: l.evaluation, mate: l.mate }));

/** One move of the game, with its board and what it took. */
interface Played { fenBefore: string; san: string; uci: string; to: string; captured: string | null; mover: Color }
const sameBoard = (a: string, z: string): boolean => a.split(' ').slice(0, 2).join(' ') === z.split(' ').slice(0, 2).join(' ');
const bareSan = (s: string): string => s.replace(/[+#!?]+$/, '');
const GAMES = new WeakMap<BoardBundle, Played[] | null>();
/** The game replayed from the start — only when `history` really reaches
 *  `fen` and ends on `priorMove`; null when it does not (then nothing the
 *  game would answer is said). */
function gameOf(b: BoardBundle): Played[] | null {
  if (GAMES.has(b)) return GAMES.get(b) ?? null;
  let out: Played[] | null = [];
  try {
    const c = new Chess();
    for (const san of b.history) {
      const fenBefore = c.fen();
      const m = c.move(san);
      out.push({ fenBefore, san: m.san, uci: `${m.from}${m.to}${m.promotion ?? ''}`, to: m.to, captured: m.captured ?? null, mover: m.color });
    }
    if (!sameBoard(c.fen(), b.fen)) out = null;
    const last = out && out.length > 0 ? out[out.length - 1] : null;
    if (out && b.priorMove && (!last || bareSan(last.san) !== bareSan(b.priorMove.san) || !sameBoard(last.fenBefore, b.priorMove.fenBefore))) out = null;
    if (out && !b.priorMove && out.length > 0) out = null;
  } catch { out = null; }
  GAMES.set(b, out);
  return out;
}
/** The move before the one that reached `fen` (the other side's), or null at
 *  the game's start; undefined when the game is not known. */
function earlierOf(b: BoardBundle): Played | null | undefined {
  const g = gameOf(b);
  if (!g) return undefined;
  return g.length >= 2 ? g[g.length - 2] : null;
}
const asMove = (p: Played | null): { fenBefore: string; san: string } | null => (p ? { fenBefore: p.fenBefore, san: p.san } : null);
const asLastMove = (p: Played | null): LastMove | null => (p ? { to: p.to, captured: p.captured } : null);
/** The SANs played before the move that reached `fen`. */
function sansBefore(b: BoardBundle): string[] | null {
  const g = gameOf(b);
  return g ? g.slice(0, -1).map((m) => m.san) : null;
}
/** The capture run before the move that reached `fen`, and after it. */
function capturesOf(b: BoardBundle): { before: PrevCaptureContext; after: PrevCaptureContext } | null {
  const g = gameOf(b);
  if (!g) return null;
  let before = NO_PREV_CAPTURE;
  let after = NO_PREV_CAPTURE;
  for (const m of g) { before = after; after = afterCapture(after, m); }
  return { before, after };
}
/** The move that reached `fen`, worded as Review words a played move. */
function wordsOf(b: BoardBundle): MoveWords | null {
  const MOVE = moveOf(b);
  return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, moverIsStudent: MOVE.mover === b.student, tense: 'past', namesPlayedMove: true } : null;
}
/** The move that reached `fen`, UCI. */
function playedUci(b: BoardBundle): string | null {
  if (!b.priorMove) return null;
  try { const m = new Chess(b.priorMove.fenBefore).move(b.priorMove.san); return `${m.from}${m.to}${m.promotion ?? ''}`; } catch { return null; }
}
/** The student's move that reached `fen`, with its cost. */
function studentMove(b: BoardBundle): { fenBefore: string; san: string; mover: Color; loss: number } | null {
  const MOVE = moveOf(b);
  const loss = cpLossOf(b);
  return MOVE && MOVE.mover === b.student && loss !== null ? { ...MOVE, loss } : null;
}
/** A capture played (Review's trade line): the move, the line after it, the move before it. */
function tradePlayed(b: BoardBundle): BoardContexts['tradeJudged'] | null {
  const MOVE = moveOf(b);
  const s = earlierOf(b);
  if (!MOVE || s === undefined) return null;
  const loss = cpLossOf(b);
  const exact = seatCp(b.priorLines?.[0], 'w') !== null && seatCp(b.lines[0], 'w') !== null;
  return { fenBefore: MOVE.fenBefore, fenAfter: b.fen, san: MOVE.san, moverIsStudent: MOVE.mover === b.student, student: b.student, lineUci: bestLine(b), prior: asMove(s), costCp: loss, moverCostCp: exact ? loss : null };
}
/** Their move read off the engine's lines after it. */
function theirReadOf(b: BoardBundle): BoardContexts['theirRead'] | null {
  const MOVE = theirMove(b);
  const s = earlierOf(b);
  return MOVE && s !== undefined ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lines: scoredLines(b.lines), prev: asMove(s), flagged: null } : null;
}
/** Their move that reached `fen`. */
function theirMove(b: BoardBundle): { fenBefore: string; san: string; mover: Color } | null {
  const MOVE = moveOf(b);
  return MOVE && MOVE.mover !== b.student ? MOVE : null;
}

/** Every computer, by id: how to build its context from the bundle, or what it needs. */
export const BUNDLE_ADAPTERS: { [K in ComputerId]: Adapter<K> } = {
  pinBreakOwn: (b) => ({ fen: b.fen, student: b.student }),
  pinBreakTheirs: { needs: ["pinned: the pinned piece the caller's own pin read found"] },
  prophylaxis: (b) => ({ fen: b.fen, engineFirstMoves: b.lines.map((l) => l.moves[0]).filter((m): m is string => !!m) }),
  prophylaxisMissed: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s ? { prevFen: s.fenBefore, studentSan: s.san, fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  enablingMove: (b) => ({ fen: b.fen, pv: b.lines[0]?.moves ?? [] }),
  tradeLedger: (b) => ({ history: b.history, student: b.student }),
  notYetPlayed: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss } : null; },
  heldResource: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss, student: b.student } : null; },
  captureChoice: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss, student: b.student } : null; },
  kickAfterRecapture: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), bestUci: b.lines[0]?.moves ?? [], student: b.student } : null; },
  pawnSquareTaken: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, cpLoss: loss } : null; },
  kingReadsBestLine: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, student: b.student, bestUci: b.lines[0]?.moves ?? [] } : null; },
  sacCompensation: (b) => { const MOVE = moveOf(b); return MOVE && b.lines[0] ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fenAfter: b.fen, mover: MOVE.mover, moverCp: seatCp(b.lines[0], MOVE.mover), moverCpBefore: seatCp(b.priorLines?.[0], MOVE.mover), student: b.student, line: bestLine(b) } : null; },
  sacMechanism: { needs: ["sacIdx: which game move is the mating sacrifice (the caller's sacrifice read)"] },
  sacKingShield: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  structureState: (b) => ({ fen: b.fen }),
  phaseVerdict: { needs: ["phase: the turn of the game the transition detector found (the stock-take is said only then)"] },
  middlegameOrientation: (b) => ({ fen: b.fen, student: b.student, seat: 'both', san: b.priorMove?.san ?? null }),
  opponentDevelopment: (b) => { const g = gameOf(b); return g ? { oppSans: g.filter((m) => m.mover !== b.student).map((m) => m.san), fen: b.fen, student: b.student } : null; },
  studentMovePoint: (b) => { const MOVE = moveOf(b); const caps = capturesOf(b); return MOVE && caps && MOVE.mover === b.student ? { fenBefore: MOVE.fenBefore, san: MOVE.san, prevCap: caps.before } : null; },
  positionalVerdict: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fen: b.fen, student: b.student, studentCp: studentCp(b), quietBareBalanced: true } : null; },
  plyFacts: (b) => { const MOVE = moveOf(b); const caps = capturesOf(b); return MOVE && caps ? { fenBefore: MOVE.fenBefore, san: MOVE.san, prevCap: caps.before, moverIsStudent: MOVE.mover === b.student } : null; },
  boardDelta: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fenAfter: b.fen, student: b.student } : null; },
  fundamentalVerdict: { needs: ["attrs: the graded move's principle attributions (the attribution sweep)"] },
  tacticRule: { needs: ["type: the tactic the better move lands, named by the caller's classifier"] },
  moveInfluence: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, fenAfter: b.fen, san: MOVE.san, student: b.student } : null; },
  heardCorrection: { needs: ["heard: the verdict said live on this move (a surface record)"] },
  opponentMoveTeaching: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  boardTactics: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fenAfter: b.fen, student: b.student, lineUci: bestLine(b), motifSaid: new Map<string, readonly string[]>(), skipMateAgainst: null } : null; },
  tiedDefender: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s ? { fenBefore: s.fenBefore, fenAfterMove: MOVE.fenBefore, fenAfterReply: b.fen, student: b.student } : null; },
  obligationLifted: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, fenAfter: b.fen, student: b.student } : null; },
  queenGrabTrap: (b) => ({ fen: b.fen }),
  bookMove: (b) => (gameOf(b) ? { history: b.history, student: b.student, plain: false } : null),
  openingTheory: (b) => (gameOf(b) ? { history: b.history, student: b.student } : null),
  moveGains: (b) => (gameOf(b) ? { history: b.history, student: b.student } : null),
  opensCheck: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, line: b.lines[0]?.moves ?? null, student: b.student, tense: 'now' } : null; },
  captureOrder: (b) => { const MOVE = moveOf(b); const pre = priorAnalysis(b); return MOVE && pre ? { fenBefore: MOVE.fenBefore, san: MOVE.san, line: bestLine(b), reads: pre.map((l) => ({ evaluation: l.evaluation, mate: l.mate, moves: l.moves })), student: b.student, tense: 'past' } : null; },
  knightSquareTaken: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  slipsOnLine: (b) => ({ history: b.history, student: b.student }),
  lastTimeHere: { needs: ["rows: the student's own book departures (the record)"] },
  trapped: (b) => ({ fen: b.fen, student: b.student }),
  countMethod: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, playedSan: MOVE.san, student: b.student, costCp: null } : null; },
  priorityFirst: (b) => { const best = b.lines[0]?.moves[0]; return best && toMove(b.fen) === b.student ? { fen: b.fen, student: b.student, bestUci: best } : null; },
  threatCost: { needs: ["line, squares: the threat warning another computer just said"] },
  threatAnswer: { needs: ["squares, shape: the threat just named by another computer"] },
  planThread: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s !== undefined ? { thread: emptyPlanThread(), ply: plyOf(b), fenBefore: MOVE.fenBefore, fenAfter: b.fen, student: b.student, studentPovCp: studentCp(b), studentMove: asMove(s), holdPlayable: false, studentBestUci: b.lines[0]?.moves[0] ?? null } : null; },
  structureMove: (b) => { const m = studentMove(b); return m ? { fenBefore: m.fenBefore, san: m.san, student: b.student, cpLoss: m.loss, bestSan: priorBest(b), bestUci: b.priorLines?.[0]?.moves ?? [], reply: replySan(b), namesBetterMove: true, namesStudentMoves: true } : null; },
  structureTheirMove: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  statusBand: (b) => { const now = studentCp(b); const prev = seatCp(b.priorLines?.[0], b.student); return now !== null && prev !== null ? { fen: b.fen, studentCp: now, prevStudentCp: prev } : null; },
  latentDanger: (b) => ({ fen: b.fen, student: b.student }),
  tradeDanger: (b) => ({ fen: b.fen, student: b.student }),
  latentFork: (b) => ({ fen: b.fen, student: b.student }),
  centralKingDanger: (b) => ({ fen: b.fen, student: b.student, namesMoves: true }),
  conversion: (b) => ({ fen: b.fen, student: b.student }),
  opponentIntent: (b) => ({ fen: b.fen, topLines: analysisOf(b) }),
  criticalMoment: (b) => (b.lines.length > 0 ? { fen: b.fen, topLines: analysisOf(b), mover: toMove(b.fen), studentToMove: toMove(b.fen) === b.student, ply: plyOf(b), anchor: b.priorMove, critical: false } : null),
  leansOn: { needs: ["read: the perturbation probe (its own async engine run)"] },
  strategicPlan: (b) => { const best = replySan(b); return best && b.fen.split(' ')[1] === b.student ? { fen: b.fen, bestSan: best, student: b.student } : null; },
  structurePlan: (b) => ({ fen: b.fen, student: b.student, heard: null, said: null }),
  tradeTarget: (b) => ({ fen: b.fen, student: b.student, bestLine: b.lines[0]?.moves ?? null }),
  tradeRead: (b) => { const MOVE = moveOf(b); const s = earlierOf(b); return MOVE && s !== undefined ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: cpLossOf(b), priorMove: asLastMove(s), namesPlayedMove: true } : null; },
  refutedAlt: { needs: ["popular: the games database's moves at the student's level"] },
  trapChance: (b) => ({ fen: b.fen, student: b.student, line: b.lines[0]?.moves ?? null, priorMove: b.priorMove }),
  setUpChance: (b) => { if (toMove(b.fen) !== b.student || b.lines.length === 0) return null; const read = detectSetUpChance(b.fen, analysisOf(b), b.student, 'full'); return read ? { fen: b.fen, read } : null; },
  mustDefend: (b) => { const cp = studentCp(b); return cp !== null ? { fen: b.fen, student: b.student, read: computeMustDefend(b.fen, b.student), studentToMove: toMove(b.fen) === b.student, studentCp: cp, looseSpells: null } : null; },
  liveMethod: { needs: ["signals: the live surface's method signals"] },
  boardPlans: (b) => ({ fen: b.fen, student: b.student, withTrump: true }),
  boardConcept: (b) => ({ fen: b.fen, student: b.student, rating: b.rating, analysis: b.lines.length > 0 ? { topLines: analysisOf(b), evaluation: lineCp(b.lines[0]) ?? 0 } : undefined }),
  pinPressure: (b) => ({ fen: b.fen, student: b.student }),
  guardRemoval: (b) => ({ fen: b.fen, student: b.student }),
  deliberation: (b) => { const words = wordsOf(b); const fan = priorAnalysis(b); const caps = capturesOf(b); const s = earlierOf(b); return words && fan && caps && s !== undefined ? { words, fan, prev: caps.before, theirLast: asMove(s), deep: false } : null; },
  structureBoard: (b) => ({ fen: b.fen, student: b.student }),
  structureLines: (b) => (toMove(b.fen) === b.student && b.lines.length > 0 ? { fen: b.fen, student: b.student, lines: scoredLines(b.lines), namesMoves: true } : null),
  openingStory: (b) => (gameOf(b) && toMove(b.fen) === b.student ? { history: b.history, fen: b.fen, student: b.student, namesStudentMoves: true, theory: true } : null),
  castleByHand: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingFromCentre: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  keptHome: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSquares: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lines: b.priorLines ? b.priorLines.map((l) => ({ moves: l.moves })) : null, bestUci: b.priorLines?.[0]?.moves[0] ?? null } : null; },
  ifTheyPlay: { needs: ["replies: one read of every legal reply (the human model's fan)"] },
  temptingRefuted: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, rating: b.rating, reads: null, priorMove: b.priorMove } : null; },
  temptingNow: (b) => ({ fen: b.fen, student: b.student, rating: b.rating, reads: null, priorMove: b.priorMove }),
  alsoGood: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, rating: b.rating, reads: null } : null; },
  squareChoice: (b) => { const MOVE = moveOf(b); const s = earlierOf(b); const loss = cpLossOf(b); return MOVE && s !== undefined ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, rating: b.rating, reads: null, priorMove: asMove(s), beaten: loss !== null && loss >= INACCURACY_CP ? b.priorLines?.[0]?.moves[0] ?? null : null, namesStudentMoves: true } : null; },
  pawnBreak: (b) => { const MOVE = moveOf(b); const s = earlierOf(b); return MOVE && s !== undefined ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lastTo: s?.to ?? null, namesStudentMoves: true } : null; },
  oppositeBishops: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  planSteps: (b) => (b.priorMove && b.lines[0] ? { fenAfter: b.fen, line: bestLine(b), student: b.student, played: playedUci(b) } : null),
  planOfTheBoard: (b) => (b.lines.length > 0 ? { fen: b.fen, lines: analysisOf(b), student: b.student, namesMoves: true } : null),
  compensation: (b) => ({ fenAfter: b.fen, student: b.student, studentCp: studentCp(b) ?? 0, line: b.lines[0]?.moves ?? [] }),
  harmlessPin: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? [] } : null; },
  queenNet: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  bothSaved: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines } : null; },
  stalemateTrick: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  perpetualCheck: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines } : null; },
  windmill: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  minorMatchup: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSiege: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines } : null; },
  backRankWeakness: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  loadedDiscovery: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSacrifice: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines, seconds: b.seconds ?? [] } : null; },
  deepCombination: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines, seconds: b.seconds ?? [] } : null; },
  intoTheirCamp: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  targetPressure: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lineAfter: b.lines[0]?.moves ?? [], costCp: null } : null; },
  breakPrep: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lineAfter: b.lines[0]?.moves ?? [], costCp: null } : null; },
  breakStopped: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  flexibleMove: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, reads: null } : null; },
  exchangeSacrifice: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, reads: null } : null; },
  pawnMajority: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, prior: b.priorMove } : null; },
  fortress: (b) => { const MOVE = moveOf(b); return MOVE && b.lines.length > 0 ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, replies: b.lines } : null; },
  pieceItinerary: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, history: b.history } : null; },
  forcedRun: (b) => { const MOVE = moveOf(b); const before = sansBefore(b); return MOVE && before ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, history: before, line: lineSans(b), evalsAfter: null } : null; },
  threatPurpose: { needs: ["line: the played-out PV (computePvLine, its own engine run)"] },
  temptingCapture: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? null } : null; },
  count: (b) => ({ fen: b.fen, student: b.student }),
  royal: (b) => ({ fen: b.fen, student: b.student }),
  rook7: (b) => ({ fen: b.fen, student: b.student }),
  badBishop: (b) => ({ fen: b.fen, student: b.student }),
  whyItEnded: { needs: ["plies: the whole game graded ply by ply"] },
  idlePiece: { needs: ["plies: the whole game graded ply by ply"] },
  quietDecider: { needs: ["plies: the whole game graded ply by ply"] },
  exploreInvite: { needs: ["plies, index: the whole game graded ply by ply"] },
  murkyRead: { needs: ["plies, index: the whole game graded ply by ply"] },
  pawnEndingCount: (b) => { const m = studentMove(b); return m ? { fenBefore: m.fenBefore, san: m.san, replySan: replySan(b), cpLoss: m.loss, evalAfterCp: studentCp(b) } : null; },
  spareTempo: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss } : null; },
  passerDecoy: (b) => ({ fen: b.fen, student: b.student }),
  zugzwangAt: { needs: ["read: the tablebase zugzwang read (async)"] },
  // The line starts with the move played (`mateLine`'s first SAN), then the engine's line after it.
  mateLineAt: (b) => { const m = studentMove(b); const u = playedUci(b); return m && u ? { fenBefore: m.fenBefore, lineUci: [u, ...bestLine(b)], student: b.student, san: m.san } : null; },
  lineWinsAt: (b) => { const m = studentMove(b); const u = playedUci(b); const s = earlierOf(b); return m && u && s !== undefined ? { fenBefore: m.fenBefore, lineUci: [u, ...bestLine(b)], student: b.student, san: m.san, prior: asMove(s), seconds: b.seconds ?? [] } : null; },
  attackAsks: { needs: ["target: the square the caller's attack read aims at"] },
  theirOpeningChoice: (b) => { const MOVE = theirMove(b); const loss = cpLossOf(b); return MOVE && loss !== null && gameOf(b) ? { history: b.history, student: b.student, cpLoss: loss, coachChose: false, fen: b.fen } : null; },
  openingNamed: { needs: ["det, spokenName, transposed: the opening detector's read and what the game already called it"] },
  sacPayoff: (b) => { const MOVE = moveOf(b); return MOVE ? { fenAfter: b.fen, mover: MOVE.mover, moverPovEvalCp: seatCp(b.lines[0], MOVE.mover), moverPovBeforeCp: seatCp(b.priorLines?.[0], MOVE.mover), kingCentreTaught: false } : null; },
  sacShield: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  takeStock: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fen: b.fen, student: b.student, studentPovCp: studentCp(b) } : null; },
  kingHuntCue: (b) => ({ fen: b.fen, student: b.student }),
  opponentTarget: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  causalChain: (b) => (gameOf(b) && b.history.length > 0 ? { sans: b.history, ply: b.history.length, student: b.student, rating: b.rating, fen: b.fen } : null),
  endgamePhase: (b) => ({ fen: b.fen, student: b.student }),
  recapture: (b) => { const m = studentMove(b); const s = earlierOf(b); return m && s !== undefined ? { fenBefore: m.fenBefore, san: m.san, theirLast: s?.san ?? null, reply: null, faultCp: m.loss, namesStudentMoves: true } : null; },
  mateLine: (b) => { const MOVE = moveOf(b); return MOVE && b.priorLines ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), lineUci: b.priorLines[0]?.moves ?? [], reply: replySan(b) } : null; },
  winsLine: (b) => { const m = studentMove(b); const s = earlierOf(b); const best = b.priorLines?.[0]; return m && s !== undefined && best ? { fenBefore: m.fenBefore, san: m.san, bestSan: priorBest(b), lineUci: best.moves, reply: replySan(b), prior: asMove(s), seconds: b.seconds ?? [] } : null; },
  kneeJerk: (b) => { const m = studentMove(b); const s = earlierOf(b); return m && s !== undefined ? { fenBefore: m.fenBefore, san: m.san, theirLast: s?.san ?? null, bestSan: priorBest(b), faultCp: m.loss } : null; },
  strongChoice: (b) => { const MOVE = moveOf(b); return MOVE && MOVE.mover === b.student ? { fenBefore: MOVE.fenBefore, san: MOVE.san, ply: plyOf(b) } : null; },
  fileClaimed: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, cpLoss: null } : null; },
  blunderCheck: (b) => { const m = studentMove(b); return m ? { fenBefore: m.fenBefore, san: m.san, reply: replySan(b), faultCp: m.loss, again: false, ply: plyOf(b) } : null; },
  autopilot: { needs: ["popularTopSan: the games database's most played move here"] },
  pawnEndingCounted: (b) => { const m = studentMove(b); return m ? { fenBefore: m.fenBefore, san: m.san, reply: replySan(b), faultCp: m.loss, cpAfter: studentCp(b) } : null; },
  outsidePasserDecoy: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  keepPressing: (b) => { const m = studentMove(b); return m ? { fenBefore: m.fenBefore, san: m.san, bestSan: priorBest(b), faultCp: m.loss, cpAfter: studentCp(b) } : null; },
  tradeDeal: (b) => { const m = studentMove(b); const s = earlierOf(b); return m && s !== undefined ? { fenBefore: m.fenBefore, san: m.san, reply: replySan(b), faultCp: m.loss, values: undefined, prior: asLastMove(s), namesStudentMoves: true, ply: plyOf(b) } : null; },
  kingAttack: (b) => { const m = studentMove(b); return m && b.lines.length > 0 ? { fenBefore: m.fenBefore, san: m.san, reply: replySan(b), cpLoss: m.loss, namesStudentMoves: true, linesAfter: b.lines.map((l) => l.moves) } : null; },
  ruleException: (b) => { const m = studentMove(b); const before = sansBefore(b); return m && before ? { fenBefore: m.fenBefore, san: m.san, history: before, reply: replySan(b), bothCp: seatCp(b.priorLines?.[0], 'w') !== null && seatCp(b.lines[0], 'w') !== null, cpLoss: m.loss } : null; },
  falseAlarm: (b) => { const m = studentMove(b); const s = earlierOf(b); const pre = priorAnalysis(b); return m && s && pre ? { theirFenBefore: s.fenBefore, fenBefore: m.fenBefore, studentSan: m.san, bestLine: pre[0], reply: null } : null; },
  pushOrHold: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, cpAfter: studentCp(b) } : null; },
  counterThreat: (b) => { const MOVE = moveOf(b); return MOVE && MOVE.mover === b.student ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, studentMoveCostCp: cpLossOf(b) } : null; },
  playedConcept: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, define: () => '' } : null; },
  tempoCount: (b) => ({ history: b.history, student: b.student }),
  stalemateWatch: (b) => ({ fen: b.fen, student: b.student }),
  checkMethod: (b) => ({ fen: b.fen, student: b.student, bestUci: b.lines[0]?.moves[0] ?? null }),
  planChoice: (b) => (toMove(b.fen) === b.student && b.lines.length > 0 ? { fen: b.fen, lines: scoredLines(b.lines), student: b.student, lastMove: b.priorMove } : null),
  zugzwang: { needs: ["read: the tablebase zugzwang read (async)"] },
  kingCourse: (b) => ({ fen: b.fen, student: b.student }),
  foundMove: (b) => { const m = studentMove(b); const pre = priorAnalysis(b); const caps = capturesOf(b); const s = earlierOf(b); return m && pre && caps && s !== undefined ? { fenBefore: m.fenBefore, san: m.san, preLines: pre, student: b.student, prevCapture: caps.before, prior: asMove(s) } : null; },
  theirDeepFact: (b) => { const words = wordsOf(b); return words && theirMove(b) ? { words, line: lineSans(b) } : null; },
  studentDeepFact: (b) => { const words = wordsOf(b); return words && moveOf(b)?.mover === b.student ? { words, line: lineSans(b) } : null; },
  binding: (b) => { const words = wordsOf(b); const s = earlierOf(b); return words && s !== undefined ? { words, theirLast: asMove(s), plainSeen: false, point: null } : null; },
  boardTeacherOwn: (b) => { const words = wordsOf(b); return words && moveOf(b)?.mover === b.student ? { words, phrases: null } : null; },
  boardTeacherTheirs: (b) => { const words = wordsOf(b); return words && theirMove(b) ? { words, phrases: null } : null; },
  prize: { needs: ["square, stem: the piece the surface asks about and the game's occurrence of it"] },
  gambitPoint: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s ? { fenBefore: s.fenBefore, fenAfterMove: MOVE.fenBefore, fenAfterReply: b.fen, san: s.san, to: s.to, student: b.student } : null; },
  structureNaming: (b) => ({ fen: b.fen, student: b.student, openingName: null }),
  quietMovePoint: (b) => { const MOVE = moveOf(b); const caps = capturesOf(b); return MOVE && caps ? { fenBefore: MOVE.fenBefore, san: MOVE.san, prevCapture: caps.before } : null; },
  slipAnswer: (b) => { const MOVE = theirMove(b); const caps = capturesOf(b); const loss = cpLossOf(b); return MOVE && caps && loss !== null && loss >= INACCURACY_CP ? { fen: b.fen, prevCapture: caps.after, answerSan: replySan(b), lineUci: b.lines[0]?.moves ?? null, register: 'review' } : null; },
  countWarning: (b) => ({ fen: b.fen, student: b.student }),
  wingsRace: (b) => ({ fen: b.fen, student: b.student }),
  kingInCentre: (b) => ({ fen: b.fen, student: b.student }),
  notYet: (b) => { const best = replySan(b); return best && toMove(b.fen) === b.student ? { fen: b.fen, bestSan: best, pv: bestLine(b), student: b.student } : null; },
  obviousStop: (b) => (b.lines.length > 0 ? { fen: b.fen, student: b.student, lines: scoredLines(b.lines) } : null),
  keyDefenderNow: (b) => (b.lines.length > 0 ? { fen: b.fen, student: b.student, line: analysisOf(b)[0] } : null),
  positionRead: (b) => ({ fen: b.fen, student: b.student }),
  kingExposure: (b) => ({ fen: b.fen, side: b.student, student: b.student, owner: false }),
  shelterCracked: (b) => ({ fen: b.fen, student: b.student }),
  trappedPiece: (b) => ({ fen: b.fen, student: b.student, lineUci: b.lines[0]?.moves ?? [] }),
  worstPiece: (b) => { const MOVE = moveOf(b); const to = MOVE && MOVE.mover === b.student ? new Chess(MOVE.fenBefore).move(MOVE.san).to : null; return { fen: b.fen, student: b.student, movedTo: to }; },
  passerPush: (b) => { const MOVE = moveOf(b); const m = MOVE && MOVE.mover === b.student ? new Chess(MOVE.fenBefore).move(MOVE.san) : null; return { fen: b.fen, student: b.student, pushed: m && m.piece === 'p' ? m.to : null }; },
  minority: (b) => ({ fen: b.fen, student: b.student }),
  colourComplex: (b) => ({ fen: b.fen, student: b.student }),
  raceOfPlans: (b) => ({ fen: b.fen, student: b.student }),
  theirCost: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  threatStopped: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s ? { studentFenBefore: s.fenBefore, studentFenAfter: MOVE.fenBefore, reply: MOVE.san, student: b.student } : null; },
  playItAnyway: (b) => { const MOVE = theirMove(b); const s = earlierOf(b); return MOVE && s ? { studentFenBefore: s.fenBefore, studentFenAfter: MOVE.fenBefore, reply: MOVE.san, fenNow: b.fen, lines: scoredLines(b.lines), student: b.student } : null; },
  trickSidestepped: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  theirHabit: (b) => (gameOf(b) ? { history: b.history, student: b.student, sound: NO_SOUND_PLIES } : null),
  yourHabit: (b) => (gameOf(b) ? { history: b.history, student: b.student, sound: NO_SOUND_PLIES } : null),
  knownAttack: (b) => ({ fen: b.fen, student: b.student, studentCp: studentCp(b) }),
  timing: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, history: b.history, student: b.student } : null; },
  bluff: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), student: b.student } : null; },
  contrast: (b) => { const MOVE = moveOf(b); const best = priorBest(b); return MOVE && best ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: best, student: b.student } : null; },
  newThreat: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, fenAfter: b.fen, mover: MOVE.mover, student: b.student, answerSan: MOVE.mover !== b.student ? replySan(b) : null } : null; },
  moveAspect: (b) => { const words = wordsOf(b); const caps = capturesOf(b); return words && caps ? { words, prev: caps.before, follow: followOf(b), phrases: null } : null; },
  moveThreatDeep: { needs: ["reads.passAfter: a null-move engine read of the board after the move"] },
  moveAllows: (b) => { const words = wordsOf(b); const loss = cpLossOf(b); return words && loss !== null && loss >= MISTAKE_CP && b.lines[0] ? { words, student: b.student, costCp: loss, after: analysisOf(b)[0], against: b.priorLines?.[0]?.moves ?? null } : null; },
  moveJobRead: (b) => { const words = wordsOf(b); const s = earlierOf(b); return words && s !== undefined ? { words, theirLast: asMove(s), follow: followOf(b), phrases: null } : null; },
  moveFundamentals: (b) => { const words = wordsOf(b); return words ? { words, follow: followOf(b) } : null; },
  theirAim: (b) => { const words = wordsOf(b); return words && theirMove(b) ? { words, line: lineSans(b), plainSeen: false } : null; },
  outFirst: (b) => { const words = wordsOf(b); return words ? { words, line: lineSans(b) } : null; },
  orderFirst: (b) => { const words = wordsOf(b); return words ? { words, line: lineSans(b), fan: priorAnalysis(b) ?? [] } : null; },
  desperadoMove: (b) => { const words = wordsOf(b); return words ? { words, bestUci: b.priorLines?.[0]?.moves[0] ?? null } : null; },
  emptyCheckMove: (b) => { const words = wordsOf(b); return words ? { words, costCp: cpLossOf(b), replyUci: b.lines[0]?.moves[0] ?? null } : null; },
  transposition: (b) => { const words = wordsOf(b); const before = sansBefore(b); return words && before ? { words, history: before } : null; },
  mastersBreak: (b) => { const words = wordsOf(b); const before = sansBefore(b); return words && before ? { words, history: before } : null; },
  structureFormed: (b) => { const words = wordsOf(b); return words ? { words } : null; },
  moveCut: (b) => { const words = wordsOf(b); return words ? { words } : null; },
  moveCage: (b) => { const words = wordsOf(b); return words ? { words } : null; },
  moveStopsBreak: (b) => { const words = wordsOf(b); const before = sansBefore(b); return words && before ? { words, history: before } : null; },
  moveRoute: (b) => { const words = wordsOf(b); return words ? { words, line: lineSans(b), skipFrom: null } : null; },
  followUpFirst: { needs: ["followFirst: an engine read of the board with the mover's follow-up played first"] },
  takesAway: (b) => { const words = wordsOf(b); return words ? { words } : null; },
  gambitOffer: (b) => { const words = wordsOf(b); return words && b.lines.length > 0 ? { words, after: analysisOf(b), student: b.student, costCp: cpLossOf(b) } : null; },
  standingRead: (b) => { const words = wordsOf(b); const pre = priorAnalysis(b); return words && pre && b.lines.length > 0 ? { words, student: b.student, before: pre[0], after: analysisOf(b)[0], lines: analysisOf(b) } : null; },
  movePurpose: { needs: ["reads.passBefore/passAfter: null-move engine reads around the move"] },
  onlyMoveRead: (b) => { const words = wordsOf(b); const pre = priorAnalysis(b); return words && pre ? { words, fan: pre } : null; },
  principle: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, taught: NOTHING_SAID, stemKey: plyOf(b), namesPlayedMove: true } : null; },
  principleContrast: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), student: b.student, taught: NOTHING_SAID, stemKey: plyOf(b) } : null; },
  oppositionRead: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, afterCp: studentCp(b) } : null; },
  zugzwangRead: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, after: b.lines.length > 0 ? analysisOf(b) : null, passAfter: null } : null; },
  theoreticalEnding: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, afterCp: studentCp(b) } : null; },
  raceCount: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  promotionChoice: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, before: priorAnalysis(b) } : null; },
  keyDefender: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: cpLossOf(b), after: analysisOf(b)[0] ?? null } : null; },
  practicalChance: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, reads: { moverCp: seatCp(b.priorLines?.[0], MOVE.mover), costCp: cpLossOf(b), after: analysisOf(b) } } : null; },
  pawnCutsGuard: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  chainBase: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pinnedPawnGuard: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  castlingTaken: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  castlingWing: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pieceMovedAgain: (b) => { const MOVE = moveOf(b); return MOVE ? { history: b.history, fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  queenChased: (b) => { const MOVE = moveOf(b); return MOVE ? { history: b.history, fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  blockade: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  tradeOffer: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null, afterCp: studentCp(b) } : null; },
  fileTrade: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null, line: b.lines[0]?.moves ?? null } : null; },
  pawnEndingTrade: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: cpLossOf(b), after: analysisOf(b)[0] ?? null } : null; },
  queenHunt: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? null } : null; },
  secondAttacker: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  outOfReach: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, altUcis: (b.priorLines ?? []).map((l) => l.moves[0]).filter((m): m is string => !!m) } : null; },
  poisonedPiece: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, fan: null } : null; },
  everyMate: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pawnCentre: (b) => ({ fen: b.fen, student: b.student }),
  centreDuo: (b) => ({ fen: b.fen, student: b.student }),
  harmlessWeakPawns: (b) => ({ fen: b.fen, student: b.student, best: b.lines[0] ? { cp: b.lines[0].cp, mate: b.lines[0].mate } : null }),
  noSafeChecks: (b) => ({ fen: b.fen, student: b.student }),
  kingRace: (b) => ({ fen: b.fen, student: b.student }),
  kingBox: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, namesPlayedMove: true } : null; },
  promotionWithCheck: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), student: b.student, namesPlayedMove: true } : null; },
  inaccessibleHole: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  wingWithoutPieces: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  urgentStrike: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  misplacedQueen: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  theirWorstPiece: (b) => ({ fen: b.fen, student: b.student, bestLine: b.lines[0]?.moves ?? null }),
  kingInOpen: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  kingActivityGap: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  kingSiegeNow: (b) => ({ fen: b.fen, student: b.student, studentCp: studentCp(b) }),
  zugzwangIfPassed: (b) => ({ fen: b.fen, student: b.student }),
  leverPasser: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  coordinationGap: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  endgameVerdict: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  defenderInTime: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  tactify: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  seventhRankMate: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  pieceTempo: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  tensionKept: (b) => (b.lines.length > 0 ? { fen: b.fen, lines: b.lines, student: b.student } : null),
  secondFront: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  lateralRookDefence: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  squareForPiece: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  tradeRelievesCramp: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  queenKnightNet: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  selfBlock: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  mateThreatLever: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  queenlessMate: (b) => ({ fen: b.fen, student: b.student }),
  tensionReleased: (b) => { const MOVE = moveOf(b); return MOVE && b.priorLines ? { fenBefore: MOVE.fenBefore, san: MOVE.san, lines: b.priorLines, playedCp: seatCp(b.lines[0], MOVE.mover), reply: null, student: b.student } : null; },
  exchangeIdeas: (b) => { const MOVE = moveOf(b); const g = gameOf(b); const mine = MOVE?.mover === b.student; return { fen: b.fen, student: b.student, lines: scoredLines(b.lines), studentMove: MOVE && mine ? { fenBefore: MOVE.fenBefore, san: MOVE.san, costCp: cpLossOf(b), bestSan: priorBest(b), history: g ? g.map((m) => m.san) : null } : null, opponentMove: MOVE && !mine ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null, continuation: b.lines[0]?.moves ?? null, nameMove: true }; },
  tradeJudged: (b) => tradePlayed(b),
  tradeSettled: (b) => tradePlayed(b),
  tacticGeometry: (b) => { const MOVE = theirMove(b); return { fen: b.fen, me: b.student, pv: bestLine(b), ...(MOVE ? { lastOpponentMove: { fenBefore: MOVE.fenBefore, san: MOVE.san } } : {}), register: 'live' }; },
  knownSlip: { needs: ["gems: the club gem index lookup at the board"] },
  trapAhead: { needs: ["gems: the club gem index lookup at the board"] },
  baitSet: { needs: ["replies: one read of every legal reply (the human model's fan)"] },
  theirRead: (b) => theirReadOf(b),
  theirPreventTest: (b) => theirReadOf(b),
  theirTrigger: (b) => theirReadOf(b),
  tradeKept: (b) => { const MOVE = moveOf(b); const pre = priorAnalysis(b); const s = earlierOf(b); return MOVE && pre && s !== undefined ? { fenBefore: MOVE.fenBefore, san: MOVE.san, before: pre, priorMove: asLastMove(s), theirLast: asMove(s), student: b.student } : null; },
  keySquareRead: (b) => ({ fen: b.fen, student: b.student }),
  shoulderRead: (b) => ({ fen: b.fen, student: b.student }),
  connectedPassers: (b) => ({ fen: b.fen, student: b.student }),
};

/** Every computer the bundle can fill, read on it. A computer that throws is
 *  skipped (its own `safe` already guards it). */
export function readEveryComputer(b: BoardBundle): CoachFact[] {
  const out: CoachFact[] = [];
  for (const id of Object.keys(BUNDLE_ADAPTERS) as ComputerId[]) {
    const a = BUNDLE_ADAPTERS[id] as Adapter<typeof id>;
    if (typeof a !== 'function') continue;
    let ctx: BoardContexts[typeof id] | null = null;
    try { ctx = a(b); } catch { ctx = null; }
    if (!ctx) continue;
    try { out.push(...(readBoardAll(id, ctx) as CoachFact[])); } catch { /* a computer that cannot read this board says nothing */ }
  }
  return out;
}
