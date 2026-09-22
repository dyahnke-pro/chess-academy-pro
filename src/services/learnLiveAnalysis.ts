// learnLiveAnalysis — a Learn game WAS analysed, live, one student move at a
// time; this turns that record into the shape the rest of the app reads.
//
// B7(c) (PLAN WO-STANDARD-01, 2026-09-22). Play stamps its finished games
// `fullyAnalyzed: true` because every ply was scored as it was played
// (`CoachGamePage`, `movesToAnnotations`). Learn graded every student move the
// same way (`gradePlayedMove` off the pre-move fan) and then saved the game
// with `annotations: null` and no flag — so a student who played ten Learn
// games was still a cold start to the need score, and none of those games ever
// fed line familiarity. The evaluation happened; it was thrown away at save.
//
// Pure. The page accumulates one `LiveStudentGrade` per student ply and hands
// the map here at game over. HONEST ABOUT COVERAGE: the record is only
// `fullyAnalyzed` when EVERY student ply was graded — a ply the engine never
// read (a book move, a timeout) leaves the game un-flagged rather than
// half-flagged, because `fullyAnalyzed` is what the sweep trusts to skip.
import type { CoachGameMove, MoveAnnotation } from '../types';
import { movesToAnnotations } from './coachGameAnnotations';
import { classifyCpLoss } from './gameAnalysisService';

export interface LiveStudentGrade {
  /** 1-based ply of the student's move. */
  ply: number;
  san: string;
  /** White-POV eval BEFORE the move (the fan's root) — the best-move eval. */
  preEvalCpWhitePov: number;
  /** The move's cost to the student, mover-POV, >= 0. */
  cpLossCp: number;
  /** The board after the move. */
  fenAfter: string;
}

/** The white-POV eval AFTER the move: the pre-move read less what the mover
 *  gave up, in White's currency. White loses when the number FALLS. */
export function evalAfterFromGrade(g: Pick<LiveStudentGrade, 'preEvalCpWhitePov' | 'cpLossCp'>, studentColor: 'white' | 'black'): number {
  return studentColor === 'white' ? g.preEvalCpWhitePov - g.cpLossCp : g.preEvalCpWhitePov + g.cpLossCp;
}

export interface LearnGameAnalysis {
  annotations: MoveAnnotation[] | null;
  fullyAnalyzed: boolean;
}

/**
 * The saved-game fields for a finished Learn game.
 *
 * @param grades   one entry per student ply the live grader scored
 * @param history  the game's SANs, from the start
 */
export function learnGameAnalysis(
  grades: ReadonlyMap<number, LiveStudentGrade>,
  history: readonly string[],
  studentColor: 'white' | 'black',
): LearnGameAnalysis {
  const studentPlies: number[] = [];
  for (let ply = 1; ply <= history.length; ply += 1) {
    const isWhitePly = ply % 2 === 1;
    if ((studentColor === 'white') === isWhitePly) studentPlies.push(ply);
  }
  if (studentPlies.length === 0) return { annotations: null, fullyAnalyzed: false };
  const complete = studentPlies.every((ply) => grades.has(ply));
  const moves: CoachGameMove[] = [];
  for (const ply of studentPlies) {
    const g = grades.get(ply);
    if (!g) continue;
    const evaluation = evalAfterFromGrade(g, studentColor);
    moves.push({
      moveNumber: ply,
      san: g.san,
      fen: g.fenAfter,
      isCoachMove: false,
      commentary: '',
      evaluation,
      classification: classifyCpLoss(g.cpLossCp, g.preEvalCpWhitePov, evaluation, studentColor === 'white'),
      expanded: false,
      bestMove: null,
      bestMoveEval: g.preEvalCpWhitePov,
      preMoveEval: g.preEvalCpWhitePov,
    });
  }
  const annotations = moves.length > 0 ? movesToAnnotations(moves, studentColor) : null;
  return { annotations, fullyAnalyzed: complete };
}
