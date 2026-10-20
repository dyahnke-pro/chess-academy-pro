// THE BOARD-QUESTION ASPECTS (David 2026-08-28) — the vocabulary for "answer
// any board question from grounded facts." It mirrors the error side
// (`misconceptionTags.ts`): every ASPECT is a thing the computer can
// deterministically break a position into, so it is a thing a user can ask
// about. `boardQuestionRouter` sorts a question into one-or-more aspects.
//
// The per-aspect catalog that used to live here (component / weakness theme /
// computer / needsEngine, `BOARD_QUESTION_BUCKETS`) was never read by any code
// and was deleted as dead (2026-10-20); the dispatch lives in the router and
// `groundedAnswer`.

/** Every question aspect. Add here first, then the router + dispatcher. */
export type QuestionAspect =
  // position
  | 'eval' | 'wdl' | 'phase' | 'criticality' | 'material' | 'space' | 'basics'
  // side
  | 'my-plan' | 'opponent-plan' | 'my-threats' | 'opponent-threats' | 'initiative' | 'development'
  // square
  | 'square-control' | 'square-safety' | 'square-weakness' | 'square-occupant'
  // piece
  | 'piece-purpose' | 'piece-safety' | 'piece-activity' | 'piece-role' | 'piece-plan'
  // move
  | 'best-move' | 'move-eval' | 'move-purpose' | 'move-consequence' | 'why-best' | 'why-failed' | 'legal-moves' | 'move-comparison'
  // pawns
  | 'passed-pawns' | 'weak-pawns' | 'pawn-breaks' | 'majorities' | 'structure'
  // king
  | 'king-safety-mine' | 'king-safety-theirs' | 'king-lines' | 'checks' | 'in-check'
  // tactics
  | 'hanging' | 'motifs' | 'trapped' | 'mate-threat' | 'loose' | 'overload'
  // endgame
  | 'endgame-result' | 'endgame-technique'
  // opening
  | 'opening-name' | 'master-play' | 'opening-plans';

