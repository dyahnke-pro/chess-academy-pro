import {
  isWhoseTurnQuestion,
  isLiveColorQuestion,
  isMateQuestion,
  isDrawQuestion,
  isBestMoveQuestion,
  isPositionAssessmentQuestion,
} from './questionIntents';

/**
 * THE DETERMINISTIC BOARD QUESTIONS — one registry, because four separate
 * hand-maintained copies of this list produced four production bugs in a day.
 *
 * Every one of these has an EXACT answer computable in code (G0: the LLM voices
 * facts, it decides nothing). What kept going wrong was never the answer — it
 * was that "which questions are these?" was restated, partially and by hand, at
 * every site that needed to know:
 *
 *   1. coachService's autoGrounding gate — WHICH QUESTIONS NEED A GROUNDING
 *      OBJECT. The board-verdict intents were never added, so with no FEN they
 *      produced no grounding at all and the model answered a chess question
 *      freely.
 *   2. coachApi's chess-signal seal vs its banter branch — WHICH QUESTIONS ARE
 *      ABOUT THE BOARD. Two copies, written five weeks apart; the second never
 *      learned that a board question can carry no chess vocabulary, so the same
 *      turn read as a board question on one path and as banter on the other.
 *   3. computeLiveBoardVerdict — WHICH QUESTIONS MAY CONSULT THE TABLEBASE.
 *      best-move was absent, so with a dead engine the coach refused "what's
 *      the best move?" on the very position it had just answered "mate in 15"
 *      for, out of the same tablebase response.
 *   4. The early interception — WHICH QUESTIONS ANSWER BEFORE THE FUZZY LANES.
 *      `assessment` was absent, so "am I winning?" was captured by the
 *      opening-name picker and came back "did you mean one of these?" — with
 *      `positionAssessmentQuestion` already set to true. A whitelist could
 *      never have caught that one: the flag was right, nothing read it in time.
 *
 * So the list lives HERE, once, and every site derives from it. Adding a
 * question is one entry; `boardQuestions.registry.test.ts` then FAILS until
 * every site handles it. The rot is caught by the build instead of by a user.
 *
 * Detection is a pure function of the ask on purpose — the grounding flags
 * (`bestMoveQuestion`, `positionAssessmentQuestion`, …) are themselves just
 * cached calls to these same detectors, so keying off the ask lets the builder
 * of the grounding object and its consumers ask the identical question.
 */
export type BoardQuestionId =
  | 'whose-turn'
  | 'live-colour'
  | 'mate'
  | 'draw'
  | 'best-move'
  | 'assessment';

export interface BoardQuestion {
  id: BoardQuestionId;
  /** Pure — depends only on the (cleaned) ask. */
  detect: (ask: string) => boolean;
  /** What this entry can answer from, loosest first. Documentation for the
   *  reader and the assertion the gate makes: an entry listing 'tablebase'
   *  MUST still answer with the engine dead on a covered position. */
  needs: ReadonlyArray<'side' | 'fen' | 'tablebase' | 'engine'>;
  /** Canonical phrasings. Not used at runtime — the gate drives these through
   *  every site to prove the entry is reachable from all of them. */
  samples: readonly string[];
}

/**
 * ORDER IS PRECEDENCE. `detectBoardQuestion` returns the FIRST match, so the
 * narrow readings come before the broad ones: "is this a draw?" is a draw
 * question, not a position assessment, even though both detectors fire on some
 * phrasings. `assessment` is deliberately last — it is the widest net and must
 * never steal a question one of the exact answers above owns.
 */
export const BOARD_QUESTIONS: readonly BoardQuestion[] = [
  {
    id: 'whose-turn',
    detect: isWhoseTurnQuestion,
    needs: ['side'],
    samples: ['whose turn is it?', "who's to move?", 'is it my move?'],
  },
  {
    id: 'live-colour',
    detect: isLiveColorQuestion,
    needs: ['side'],
    samples: ['what color am I?', 'what colour am I playing?'],
  },
  {
    id: 'mate',
    detect: isMateQuestion,
    needs: ['fen', 'tablebase', 'engine'],
    samples: ['how many moves until mate?', 'is there a mate here?'],
  },
  {
    id: 'draw',
    detect: isDrawQuestion,
    needs: ['fen', 'tablebase', 'engine'],
    samples: ['is this a draw?', 'is this drawn?'],
  },
  {
    id: 'best-move',
    detect: isBestMoveQuestion,
    needs: ['fen', 'tablebase', 'engine'],
    samples: ["what's the best move?", 'what is the best move here?'],
  },
  {
    id: 'assessment',
    detect: isPositionAssessmentQuestion,
    needs: ['fen', 'tablebase', 'engine'],
    samples: ['am I winning?', "who's better here?", 'how do I stand?'],
  },
];

/** The first entry whose detector fires, or null. Order above is precedence. */
export function detectBoardQuestion(ask: string | undefined): BoardQuestionId | null {
  if (!ask) return null;
  return BOARD_QUESTIONS.find((q) => q.detect(ask))?.id ?? null;
}

/** Is this ask any deterministic board question? The single predicate every
 *  routing gate calls instead of restating the list. */
export function isAnyBoardQuestion(ask: string | undefined): boolean {
  return detectBoardQuestion(ask) !== null;
}
