/**
 * THE COMPUTERS THAT NEED THEIR OWN READ (WO-PICTURE-01, the difference
 * reader's engine-backed path).
 *
 * Eight board computers cannot be read off a standalone bundle: each needs a
 * read the bundle does not hold — a null-move search, the follow-up played
 * first, the played-out PV, every legal reply scored, the static eval with a
 * supporter taken off, the tablebase. `readEveryComputer` stays pure and leaves
 * them out (`BUNDLE_ADAPTERS` names what each needs); this performs exactly
 * those extra reads, through an injected engine (`PvEngine`, the one seam the
 * PV computer already takes), and returns the facts they give.
 *
 * A read the engine cannot make (no `evalBoard`, no `tablebase`, no
 * `everyMove`, a search that fails) leaves that computer silent — never a
 * guessed input. Each board read is made once per call (`cached`).
 */
import { Chess, type Color } from 'chess.js';
import type { BoardBundle } from './boardBundle';
import { readBoardAll, type BoardContexts, type ComputerId } from './boardComputers';
import type { CoachFact } from './coachFact';
import type { AnalysisLine, StockfishAnalysis } from '../types';
import type { EngineLine } from './engineLineRead';
import type { MoveWords } from './thoughtReads';
import { computePvLine, type PvEngine } from './pvPlayback';
import { nullMoveFen, type IntentReads } from './moveIntent';
import { computeLeansOn, type EvalBoardFn } from './perturbation';
import { readZugzwang } from './zugzwang';
import { DECISIVE_LINE_CP } from './threatPurpose';
import type { TablebaseMovesResult } from './endgameTablebaseService';
import type { ReplyRead } from './ifTheyPlay';

/** The engine the extra reads go through. `analyzePosition` is required (the
 *  PV seam); the rest are the reads only some engines can make. */
export interface BundleEngine extends PvEngine {
  /** Stockfish's static `eval` table for a board (the leans-on probe). */
  evalBoard?: EvalBoardFn;
  /** The tablebase's result for a board of ≤7 pieces (zugzwang). */
  tablebase?: (fen: string) => Promise<TablebaseMovesResult | null>;
  /** Every legal move on a board scored, from the side to move's seat (the
   *  reply tree's fan, `humanReply.scoreEveryMove`'s shape). */
  everyMove?: (fen: string) => Promise<readonly ReplyRead[] | null>;
}

/** The computers this reads, each by the read it makes. */
export const ENGINE_COMPUTERS = {
  leansOn: 'the static eval with each supporter taken off (evalBoard)',
  threatPurpose: 'the PV from the board, played out (analyzePosition)',
  zugzwang: 'the tablebase on the board and on it with the move passed',
  zugzwangAt: 'the tablebase on the board and on it with the move passed',
  moveThreatDeep: 'a null-move read of the board after the move',
  movePurpose: 'null-move reads of the boards before and after the move',
  followUpFirst: 'a read of the board with the mover\'s follow-up played first',
  ifTheyPlay: 'every legal reply on the board scored (everyMove)',
  baitSet: 'every legal reply on the board scored (everyMove)',
} as const satisfies Partial<Record<ComputerId, string>>;
export type EngineComputerId = keyof typeof ENGINE_COMPUTERS;

/** The depth each extra read is searched to. */
export const ENGINE_READ_DEPTH = 12;

const toMove = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

function asAnalysis(ls: readonly EngineLine[]): AnalysisLine[] {
  return ls.map((l, i) => ({ rank: i + 1, evaluation: l.mate !== null ? (l.mate > 0 ? 100000 : -100000) : (l.cp ?? 0), mate: l.mate, moves: [...l.moves] }));
}
function lineCp(l: { evaluation: number; mate: number | null } | undefined): number | null {
  if (!l) return null;
  if (l.mate !== null) return l.mate > 0 ? 100000 : -100000;
  return l.evaluation;
}

function read<K extends ComputerId>(id: K, ctx: BoardContexts[K] | null): CoachFact[] {
  if (!ctx) return [];
  try { return readBoardAll(id, ctx) as CoachFact[]; } catch { return []; }
}

/**
 * Every engine-backed computer read on the bundle: the extra reads made
 * through `engine`, the facts they give. The bundle's own lines are used
 * wherever they are the read a computer needs (the board before the move, when
 * the bundle holds it); every other read is made here, once.
 */
export async function readEngineComputers(b: BoardBundle, engine: BundleEngine, depth: number = ENGINE_READ_DEPTH): Promise<CoachFact[]> {
  const seen = new Map<string, Promise<StockfishAnalysis | null>>();
  const analyze = (fen: string): Promise<StockfishAnalysis | null> => {
    const hit = seen.get(fen);
    if (hit) return hit;
    const p = engine.analyzePosition(fen, depth).then((a) => (a && a.topLines?.length ? a : null), () => null);
    seen.set(fen, p);
    return p;
  };
  const linesAt = async (fen: string | null): Promise<AnalysisLine[]> => (fen ? (await analyze(fen))?.topLines ?? [] : []);

  const out: CoachFact[] = [];
  const student = b.student;
  const fen = b.fen;

  // ── The board itself ──
  // WHAT A THREAT IS FOR: the engine's line from this board, played out —
  // only a line decisive for the side to move (`DECISIVE_LINE_CP`, the bar
  // every surface reads it under: "only from a line the caller has already
  // verified as decisive").
  const top = (await analyze(fen))?.topLines[0];
  const moverWhite = toMove(fen) === 'w';
  const moverCp = top ? (top.mate !== null ? (top.mate > 0 === moverWhite ? 100000 : -100000) : (moverWhite ? top.evaluation : -top.evaluation)) : null;
  if (moverCp !== null && moverCp >= DECISIVE_LINE_CP) {
    const cachedEngine: PvEngine = { analyzePosition: (f, d) => (d === depth ? analyze(f).then((a) => { if (!a) throw new Error('no read'); return a; }) : engine.analyzePosition(f, d)) };
    const pv = await computePvLine(fen, { engine: cachedEngine, depth }).catch(() => null);
    out.push(...read('threatPurpose', pv ? { line: pv, student } : null));
  }

  // WHAT A PIECE LEANS ON: both seats, the static eval with each supporter off.
  if (engine.evalBoard) {
    const ev = engine.evalBoard;
    for (const [color, seat] of [[student, 'student'], [student === 'w' ? 'b' : 'w', 'opponent']] as const) {
      const l = await computeLeansOn(fen, color, ev).catch(() => null);
      out.push(...read('leansOn', l ? { fen, read: l, seat } : null));
    }
  }

  // ZUGZWANG: the tablebase on the board and on it with the move passed. The
  // student's turn is `zugzwang`; theirs is `zugzwangAt` (the same read, from
  // the student's seat).
  if (engine.tablebase) {
    const z = await readZugzwang(fen, engine.tablebase).catch(() => null);
    if (z) {
      const studentToMove = toMove(fen) === student;
      out.push(...(studentToMove ? read('zugzwang', { fen, read: z }) : read('zugzwangAt', { fen, read: z, studentToMove })));
    }
  }

  // EVERY REPLY ON THE BOARD: the reply tree and the bait it holds.
  if (engine.everyMove) {
    const replies = await engine.everyMove(fen).catch(() => null);
    if (replies && replies.length > 0) {
      const after = await linesAt(fen);
      const ctx: BoardContexts['ifTheyPlay'] = {
        fen, replies, rating: b.rating, student, seconds: after.map((l) => l.moves),
        played: null, tense: 'live', liveBoard: null, madeBy: b.priorMove?.san ?? null,
      };
      out.push(...read('ifTheyPlay', ctx), ...read('baitSet', ctx));
    }
  }

  // ── The move that reached the board ──
  const pm = b.priorMove;
  if (!pm) return out;
  const mover: Color = toMove(pm.fenBefore);
  const words: MoveWords = { fenBefore: pm.fenBefore, san: pm.san, moverIsStudent: mover === student, tense: 'past', namesPlayedMove: true };
  const before = b.priorLines && b.priorLines.length > 0 ? asAnalysis(b.priorLines) : await linesAt(pm.fenBefore);
  const after = await linesAt(fen);
  const passBefore = await linesAt(nullMoveFen(pm.fenBefore));
  const passAfter = await linesAt(nullMoveFen(fen));

  // WHAT THE MOVE THREATENS, two or three moves deep (the null-move line after it).
  if (passAfter.length > 0) out.push(...read('moveThreatDeep', { words, reads: { before, after, passAfter }, student }));

  // WHAT THE MOVE PREPARES, proven against the null-move reads around it.
  if (passBefore.length > 0 || passAfter.length > 0) {
    const reads: IntentReads = { before, after, passBefore, passAfter };
    const pre = lineCp(before[0]);
    const post = lineCp(after[0]);
    const costCp = pre !== null && post !== null ? Math.max(0, Math.min(2000, (pre - post) * (mover === 'w' ? 1 : -1))) : null;
    out.push(...read('movePurpose', { words, reads, line: null, costCp, ruleBoard: null }));
  }

  // THE ORDER MATTERS: the mover's next move in the line after this one,
  // played first instead — read only where it was legal before this move.
  const follow = after[0]?.moves[1];
  if (follow && after[0]) {
    let swapped: string | null = null;
    try {
      const c = new Chess(pm.fenBefore);
      c.move({ from: follow.slice(0, 2), to: follow.slice(2, 4), promotion: follow[4] });
      swapped = c.fen();
    } catch { swapped = null; }
    const ffLine = swapped ? (await linesAt(swapped))[0] : undefined;
    if (ffLine) out.push(...read('followUpFirst', { words, followFirst: { uci: follow, line: ffLine }, line: after[0] }));
  }
  return out;
}
