import { coachTurn } from './coachDecider';
import { fadeLevelsFrom } from './fadeText';
import { CALM_BOARD } from './boardState';
import { NO_BOOST } from './studentMomentBoost';
import { layerStandings } from './teachingLayers';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import type { MethodHabit } from './methodBeat';
import type { TacticType } from '../types';
import { recall, type RecallMemory } from './fundamentalRecurrence';
import { weaknessClusterForTactic } from './tacticVocabulary';

/** The student's whole record — ONE shape, defined at its one door
 *  (`studentRecord.loadStudentRecord`). */
import type { StudentRecord } from './studentRecord';
export type { StudentRecord } from './studentRecord';

/**
 * THE METHOD BEAT ON A PUZZLE — decided by the ONE door (`coachDecider.decide`),
 * from the student's WHOLE record, never from the puzzles alone (David
 * 2026-10-01: "The algo is generated from users entire data base. Not just
 * puzzles. We need to tie together all algorithms so they are unified").
 *
 * The door owns every part of the call: the moment's tier from what the puzzle
 * is worth, the habit bar from the weakness spine (`habitNeedFrom` — an OPEN
 * forcing-scan habit drops the bar, a closed one keeps it high), and say-once
 * per session. The puzzles used to say "look for checks, captures, and threats"
 * to every stuck student on every unnamed puzzle — including ones whose answer
 * was a quiet move, where that advice points the wrong way. Null = stay quiet.
 *
 * Posture is `walk`: the student is working the puzzle and asked to be helped,
 * so importance ranks the moment and never vetoes it.
 */
export function puzzleMethodLine(
  bestSan: string | null,
  /** What the puzzle is worth, mover-POV cp: the mistake's cost on a My
   *  Mistakes card, or the Lichess theme's definition (see `cpFromThemes`). */
  stakesCp: number | null,
  said: Set<MethodHabit>,
  record: StudentRecord,
  variety = 0,
): string | null {
  const d = coachTurn({ signals: { decision: null, cpLossCp: stakesCp, threatNet: 0, teachingBeat: false, evalCpWhitePov: null, wdl: null }, student: {
      // Not read for volume (B6) — carried for completeness of the context.
      rating: DEFAULT_STUDENT_RATING,
      weaknesses: record.weaknesses,
      // A puzzle is not a line they have played, so there is no familiarity
      // verdict to give: null = no need data, which reads as speak.
      need: null,
      moveAdvice: null,
      momentBoost: NO_BOOST,
      layers: layerStandings(record.weaknesses, record.capabilities),
      fade: fadeLevelsFrom(record.heat),
    }, bundle: { facts: [], board: CALM_BOARD, squares: new Map(), proofs: new Map() }, posture: 'walk', method: { bestSan, cpLossCp: stakesCp, ignoredThreat: false, isStudentMove: true, saidHabits: said, ply: variety } });
  const beat = d.spoken.find((t) => t.startsWith('[method] '));
  return beat ? beat.slice('[method] '.length) : null;
}

/** A Lichess puzzle carries no cpLoss; its tags say how much the answer wins.
 *  Lichess defines `crushing` and `mate` as decisive and `advantage` as a clear
 *  edge — read as the size of the miss, never a guess about the student. */
export function cpFromThemes(themes: readonly string[]): number | null {
  if (themes.some((t) => /^mate|crushing/.test(t))) return 300;
  if (themes.includes('advantage')) return 150;
  return null;
}

/** THE LOOP ON A PUZZLE (David 2026-10-15: "strengthen the coach's memory"):
 *  the motif the puzzle trains, joined to the student's own games through the
 *  one memory computer. Solved clean → "This time you held it — that one has caught you before …
 *  This time you held it." Missed → "The same pattern has caught you in your
 *  games …". Solved with help → nothing: being shown is not proving. Said once
 *  a session per weakness and direction (`memory`). */
export function puzzleRecallLine(
  tacticType: TacticType | null,
  outcome: 'clean' | 'helped' | 'missed',
  record: StudentRecord,
  memory: RecallMemory,
): string | null {
  if (!tacticType || tacticType === 'tactical_sequence' || outcome === 'helped') return null;
  return recall({
    matches: [{ tag: weaknessClusterForTactic(tacticType) }],
    direction: outcome === 'clean' ? 'held' : 'failed',
    register: 'drill',
    signals: record.weaknesses,
    // A puzzle is no game: every recorded game is prior.
    currentGameId: null,
    memory,
  });
}
