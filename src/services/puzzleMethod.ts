import { coachTurn } from './coachDecider';
import { fadeLevelsFrom } from './fadeText';
import { CALM_BOARD } from './boardState';
import { NO_BOOST } from './studentMomentBoost';
import { layerStandings } from './teachingLayers';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import type { MethodHabit } from './methodBeat';
import type { SlipRead } from './safetyHabits';
import { howItFell } from './slipDepth';
import { Chess } from 'chess.js';
import type { MistakePuzzle } from '../types';

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
  /** REQUIRED — the student's own slip this puzzle comes from (My Mistakes),
   *  so the habit says how the piece fell (`slipHabit`); null for a puzzle
   *  that is not one of their slips (a Lichess theme puzzle). */
  slip: SlipRead | null,
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
    }, bundle: { facts: [], board: CALM_BOARD }, posture: 'walk', method: { bestSan, cpLossCp: stakesCp, ignoredThreat: false, isStudentMove: true, saidHabits: said, ply: variety, slip } });
  // The door's own field (`CoachDecision.method`). This read a "[method] "
  // prefix off the spoken lines, and the "[tag] text" form was deleted
  // (WO-STORY-MATRIX-01 P1-6d), so every puzzle lost its habit silently.
  return d.method;
}

/** A Lichess puzzle carries no cpLoss; its tags say how much the answer wins.
 *  Lichess defines `crushing` and `mate` as decisive and `advantage` as a clear
 *  edge — read as the size of the miss, never a guess about the student. */
export function cpFromThemes(themes: readonly string[]): number | null {
  if (themes.some((t) => /^mate|crushing/.test(t))) return 300;
  if (themes.includes('advantage')) return 150;
  return null;
}

/** THE SLIP A MY MISTAKES PUZZLE COMES FROM (WO-DEPTH-01): the move played on
 *  the puzzle's board and the engine's answer the record kept, so the habit
 *  says how the piece fell. Null when the puzzle carries no answer line (filed
 *  before it was kept) — then the habit is the one the solution earns. */
export function mistakeSlipRead(p: Pick<MistakePuzzle, 'fen' | 'playerMoveSan' | 'playerColor' | 'punishUci'>): SlipRead | null {
  if (!p.punishUci?.length) return null;
  let after: string;
  try { const c = new Chess(p.fen); if (!c.move(p.playerMoveSan)) return null; after = c.fen(); } catch { return null; }
  const punishLine = { fen: after, uci: p.punishUci };
  const lostSquare = howItFell(p.fen, p.playerMoveSan, null, punishLine)?.lostSquare ?? null;
  if (!lostSquare) return null;
  return { fenBefore: p.fen, san: p.playerMoveSan, lostSquare, guardLeft: null, student: p.playerColor === 'white' ? 'w' : 'b', punishLine };
}
