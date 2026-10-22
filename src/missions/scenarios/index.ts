/**
 * SCENARIO STARTS — the curated boards a phase begins from when a live game
 * will not reliably reach the card's target (docs/CAMPAIGN.md §5,
 * WO-CAMPAIGN-MASTER Lane A).
 *
 * Every library is built OFFLINE and checked in: no engine runs here. A
 * provider picks one board by seed — the same seed, the same board, so a game
 * resumes onto the position it began. `Record<ScenarioId, …>` means a new
 * scenario id fails to compile until it has a provider.
 *
 *   kq-vs-k — king and queen against a lone king, the student to move, the
 *             lone king in the centre, mate in 8–10 (the exact K+Q vs K table,
 *             confirmed by Stockfish). Built by
 *             `scripts/scenarios/build-kq-vs-k.mjs` into `kqVsK.json`.
 *   rook-cut-off — rook and pawn against rook, the student to move, the
 *             defending king not yet cut off; only the rook moves that cut it
 *             off win, the push draws (lichess tablebase, exact; Stockfish
 *             agrees). `scripts/scenarios/build-rook-cut-off.mjs`.
 */
import type { ScenarioId } from '../missionCard';
import kqVsK from './kqVsK.json';
import rookCutOff from './rookCutOff.json';

/** What the UI calls the cut from the live game to a scenario board. */
export const SCENARIO_TRANSITION_LABEL = 'Endgame scene';

export interface ScenarioBoard {
  fen: string;
  /** The student's mate distance in moves with best play, where the library
   *  records one. */
  dtm?: number;
}

export interface ScenarioProvider {
  id: ScenarioId;
  /** How many boards there are for a student playing `studentColor`. */
  size: (studentColor: 'w' | 'b') => number;
  /** The board for `seed` (any integer — e.g. a hash of the game id), or null
   *  when the library has none for that colour. */
  position: (studentColor: 'w' | 'b', seed: number) => string | null;
}

interface Library {
  w: readonly ScenarioBoard[];
  b: readonly ScenarioBoard[];
}

/** `seed` folded onto [0, n): negatives, fractions and non-numbers included. */
export function seedIndex(seed: number, n: number): number {
  if (n <= 0) return -1;
  const s = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return ((s % n) + n) % n;
}

function fromLibrary(id: ScenarioId, library: Library): ScenarioProvider {
  return {
    id,
    size: (color) => library[color].length,
    position: (color, seed) => {
      const boards = library[color];
      const i = seedIndex(seed, boards.length);
      return i < 0 ? null : boards[i].fen;
    },
  };
}

export const SCENARIOS: Record<ScenarioId, ScenarioProvider> = {
  'kq-vs-k': fromLibrary('kq-vs-k', kqVsK),
  'rook-cut-off': fromLibrary('rook-cut-off', rookCutOff),
};

/** The curated board scenario `id` starts from for this student and seed. */
export function scenarioPosition(id: ScenarioId, studentColor: 'w' | 'b', seed: number): string | null {
  return SCENARIOS[id].position(studentColor, seed);
}
