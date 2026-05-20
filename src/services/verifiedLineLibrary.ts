import repertoireData from '../data/repertoire.json';
import gambitsData from '../data/gambits.json';
import proData from '../data/pro-repertoires.json';
import { Chess } from 'chess.js';

/**
 * verifiedLineLibrary
 * -------------------
 * The coach's library of Stockfish-verified opening traps + pitfalls,
 * pulled from the three opening-data files (repertoire / gambits /
 * pro-repertoires). Every line here passed the ±150cp accuracy gate
 * (see scripts/audit-traps-stockfish.mjs + purge-by-eval.mjs), so any
 * puzzle built from one is guaranteed sound — the student's task move
 * is engine-confirmed to win (trap) or the opponent's reply is
 * engine-confirmed to punish (pitfall).
 *
 * The coach uses this to GENERATE puzzles on demand without inventing
 * positions: take a verified line, replay to the position just before
 * the decisive move, and the solution is the move(s) that follow.
 *
 * Consumed by coachApi (system-prompt injection on puzzle/trap intent)
 * so the brain can hand the student a real, verified trap puzzle
 * instead of a hallucinated one. A pointer note is also written to
 * coachMemory so the brain knows the capability exists.
 */

export interface VerifiedLine {
  openingId: string;
  openingName: string;
  studentColor: 'white' | 'black';
  role: 'trap' | 'pitfall';
  name: string;
  /** Full PGN from the start position (walk-from-move-1) OR moves
   *  from setupFen when setupFen is present (mined lines pending the
   *  lead-in fetch). */
  pgn: string;
  setupFen?: string;
  verifiedEval?: string;
  source: 'repertoire' | 'gambits' | 'pro';
  /** Position the solver faces — the FEN one move before the
   *  decisive blow. Null if the line is too short to pose a puzzle. */
  challengeFen: string | null;
  /** The decisive move(s) in SAN — the puzzle solution. */
  solution: string[];
}

interface RawLine {
  name: string;
  pgn: string;
  setupFen?: string;
  verifiedEval?: string;
  source?: string;
}
interface RawOpening {
  id: string;
  name: string;
  color: 'white' | 'black';
  trapLines?: RawLine[];
  warningLines?: RawLine[];
}

function openingsOf(data: unknown, accessor: 'array' | 'openings'): RawOpening[] {
  if (accessor === 'openings') {
    return ((data as { openings?: RawOpening[] }).openings ?? []);
  }
  return (Array.isArray(data) ? data : Object.values(data as object)) as RawOpening[];
}

// Replay a line; return the challenge FEN (1 move before the end) and
// the solution (the final move, plus the opponent reply if the
// decisive blow is 2 plies). Only LICHESS-puzzle / authored-verified
// lines are puzzle-eligible (they carry a verifiedEval).
function buildPuzzlePosition(pgn: string, setupFen?: string): { challengeFen: string | null; solution: string[] } {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 1) return { challengeFen: null, solution: [] };
  const chess = setupFen ? new Chess(setupFen) : new Chess();
  // Replay all but the last move to get the challenge position.
  const solutionPly = tokens[tokens.length - 1];
  try {
    for (let i = 0; i < tokens.length - 1; i += 1) {
      chess.move(tokens[i].replace(/[+#!?]+$/, ''));
    }
  } catch {
    return { challengeFen: null, solution: [] };
  }
  return { challengeFen: chess.fen(), solution: [solutionPly] };
}

function collect(): VerifiedLine[] {
  const out: VerifiedLine[] = [];
  const files: { data: unknown; accessor: 'array' | 'openings'; source: VerifiedLine['source'] }[] = [
    { data: repertoireData, accessor: 'array', source: 'repertoire' },
    { data: gambitsData, accessor: 'array', source: 'gambits' },
    { data: proData, accessor: 'openings', source: 'pro' },
  ];
  for (const { data, accessor, source } of files) {
    for (const op of openingsOf(data, accessor)) {
      const push = (line: RawLine, role: VerifiedLine['role']): void => {
        // Only verified lines (carry verifiedEval) are puzzle-grade.
        if (!line.verifiedEval) return;
        const { challengeFen, solution } = buildPuzzlePosition(line.pgn, line.setupFen);
        out.push({
          openingId: op.id,
          openingName: op.name,
          studentColor: op.color,
          role,
          name: line.name,
          pgn: line.pgn,
          setupFen: line.setupFen,
          verifiedEval: line.verifiedEval,
          source,
          challengeFen,
          solution,
        });
      };
      for (const t of op.trapLines ?? []) push(t, 'trap');
      for (const w of op.warningLines ?? []) push(w, 'pitfall');
    }
  }
  return out;
}

const LIBRARY: VerifiedLine[] = collect();

/** All verified lines (traps + pitfalls) across all three surfaces. */
export function getAllVerifiedLines(): readonly VerifiedLine[] {
  return LIBRARY;
}

/** Verified lines for a specific opening (by canonical name match). */
export function getVerifiedLinesForOpening(openingName: string): VerifiedLine[] {
  if (!openingName) return [];
  const lo = openingName.toLowerCase();
  return LIBRARY.filter(
    (l) => l.openingName.toLowerCase() === lo ||
      lo.includes(l.openingName.toLowerCase()) ||
      l.openingName.toLowerCase().includes(lo),
  );
}

/** Coverage summary — used for the coach-memory pointer note + tests. */
export function getLibrarySummary(): {
  total: number; traps: number; pitfalls: number;
  puzzleReady: number; bySource: Record<string, number>;
} {
  const traps = LIBRARY.filter((l) => l.role === 'trap').length;
  const pitfalls = LIBRARY.filter((l) => l.role === 'pitfall').length;
  const puzzleReady = LIBRARY.filter((l) => l.challengeFen !== null).length;
  const bySource: Record<string, number> = {};
  for (const l of LIBRARY) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
  return { total: LIBRARY.length, traps, pitfalls, puzzleReady, bySource };
}

/** Build a system-prompt block of verified trap/pitfall puzzles for an
 *  opening, so the coach can hand the student a REAL verified puzzle
 *  instead of inventing one. Empty string when nothing matched. */
export function buildVerifiedPuzzleContext(openingName: string, max = 4): string {
  const lines = getVerifiedLinesForOpening(openingName)
    .filter((l) => l.challengeFen !== null)
    .slice(0, max);
  if (lines.length === 0) return '';
  const rows = lines.map((l) => {
    const tag = l.role === 'trap' ? 'TRAP (student wins)' : 'PITFALL (student loses if they err)';
    return `- ${tag} "${l.name}" [${l.verifiedEval}]: from FEN ${l.challengeFen} the key move is ${l.solution.join(' ')}. Student plays ${l.studentColor}.`;
  });
  return [
    '═══ VERIFIED TRAP/PITFALL PUZZLES (Stockfish-confirmed) ═══',
    'These positions are engine-verified. If the student wants a puzzle',
    'or trap drill for this opening, use one of these — do NOT invent a',
    'position or a winning move. Present the challengeFEN and ask for',
    'the key move.',
    '',
    ...rows,
    '═══════════════════════════════════════════════════════════',
  ].join('\n');
}
