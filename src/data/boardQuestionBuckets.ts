// THE BOARD-QUESTION BUCKET CATALOG (David 2026-08-28) — the source of truth for
// "answer any board question from grounded facts." It mirrors the error side
// (`misconceptionTags.ts`): every ASPECT is a thing the computer can
// deterministically break a position into, so it is a thing a user can ask about
// AND a weakness signal. The router sorts a question into one-or-more aspects;
// the dispatcher maps each aspect to a computer function; the weakness spine maps
// each aspect (weighted by the grounded answer's severity) to a weakness theme.
//
// Coverage is auditable here: a `computer: null` aspect is a known gap (answered
// by the SCOPED catch-all until its own function lands). Do NOT let this drift
// from the dispatcher — a test asserts every non-null computer resolves.

/** The 10 components a chess position deterministically decomposes into. */
export type PositionComponent =
  | 'position' | 'side' | 'square' | 'piece' | 'move'
  | 'pawns' | 'king' | 'tactics' | 'endgame' | 'opening';

/** The weakness theme an aspect feeds when asked-about (parallel to a
 *  misconception `bucket`). Repeated asks in a theme = a knowledge gap there. */
export type WeaknessTheme =
  | 'board-vision' | 'threat-awareness' | 'king-safety' | 'pawn-structure'
  | 'planning' | 'calculation' | 'piece-activity' | 'endgame-technique'
  | 'opening-knowledge' | 'evaluation';

/** Every question aspect. Add here first, then the router + dispatcher. */
export type QuestionAspect =
  // position
  | 'eval' | 'wdl' | 'phase' | 'criticality' | 'material' | 'space' | 'basics'
  // side
  | 'my-plan' | 'opponent-plan' | 'my-threats' | 'opponent-threats' | 'initiative' | 'development'
  // square
  | 'square-control' | 'square-safety' | 'square-weakness' | 'square-occupant'
  // piece
  | 'piece-purpose' | 'piece-safety' | 'piece-activity' | 'piece-role'
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

export interface BucketDef {
  aspect: QuestionAspect;
  component: PositionComponent;
  theme: WeaknessTheme;
  /** Needs a Stockfish read (eval/PV/wdl), vs pure chess.js board truth. */
  needsEngine: boolean;
  /** Dispatcher key → the computer function, or null for a not-yet-built aspect
   *  (handled by the scoped catch-all until specialised). */
  computer: string | null;
}

export const BOARD_QUESTION_BUCKETS: readonly BucketDef[] = [
  // ── position ──
  { aspect: 'eval', component: 'position', theme: 'evaluation', needsEngine: true, computer: 'assemblePositionAssessment' },
  { aspect: 'wdl', component: 'position', theme: 'evaluation', needsEngine: true, computer: null },
  { aspect: 'phase', component: 'position', theme: 'planning', needsEngine: false, computer: null },
  { aspect: 'criticality', component: 'position', theme: 'calculation', needsEngine: true, computer: null },
  { aspect: 'material', component: 'position', theme: 'evaluation', needsEngine: false, computer: 'assembleMaterialAnswer' },
  { aspect: 'space', component: 'position', theme: 'piece-activity', needsEngine: false, computer: null },
  { aspect: 'basics', component: 'position', theme: 'board-vision', needsEngine: false, computer: null },
  // ── side ──
  { aspect: 'my-plan', component: 'side', theme: 'planning', needsEngine: true, computer: 'assemblePlanAnswer' },
  { aspect: 'opponent-plan', component: 'side', theme: 'planning', needsEngine: true, computer: null },
  { aspect: 'my-threats', component: 'side', theme: 'threat-awareness', needsEngine: false, computer: 'assembleThreatAnswer' },
  { aspect: 'opponent-threats', component: 'side', theme: 'threat-awareness', needsEngine: false, computer: 'assembleThreatAnswer' },
  { aspect: 'initiative', component: 'side', theme: 'planning', needsEngine: true, computer: null },
  { aspect: 'development', component: 'side', theme: 'planning', needsEngine: false, computer: null },
  // ── square ──
  { aspect: 'square-control', component: 'square', theme: 'board-vision', needsEngine: false, computer: 'assembleSquareControlAnswer' },
  { aspect: 'square-safety', component: 'square', theme: 'board-vision', needsEngine: false, computer: 'assembleSquareControlAnswer' },
  { aspect: 'square-weakness', component: 'square', theme: 'pawn-structure', needsEngine: false, computer: null },
  { aspect: 'square-occupant', component: 'square', theme: 'board-vision', needsEngine: false, computer: 'assembleSquareControlAnswer' },
  // ── piece ──
  { aspect: 'piece-purpose', component: 'piece', theme: 'piece-activity', needsEngine: false, computer: 'assemblePiecePurposeAnswer' },
  { aspect: 'piece-safety', component: 'piece', theme: 'board-vision', needsEngine: false, computer: 'assemblePieceSafetyAnswer' },
  { aspect: 'piece-activity', component: 'piece', theme: 'piece-activity', needsEngine: false, computer: null },
  { aspect: 'piece-role', component: 'piece', theme: 'piece-activity', needsEngine: false, computer: null },
  // ── move ──
  { aspect: 'best-move', component: 'move', theme: 'calculation', needsEngine: true, computer: 'assembleMoveEvalAnswer' },
  { aspect: 'move-eval', component: 'move', theme: 'calculation', needsEngine: true, computer: 'assembleCandidateMoveAnswer' },
  { aspect: 'move-purpose', component: 'move', theme: 'calculation', needsEngine: false, computer: 'assembleMovePurposeAnswer' },
  { aspect: 'move-consequence', component: 'move', theme: 'calculation', needsEngine: true, computer: null },
  { aspect: 'why-best', component: 'move', theme: 'calculation', needsEngine: true, computer: 'explainBestMoveGrounded' },
  { aspect: 'why-failed', component: 'move', theme: 'calculation', needsEngine: false, computer: 'whyItFailed' },
  { aspect: 'legal-moves', component: 'move', theme: 'board-vision', needsEngine: false, computer: null },
  { aspect: 'move-comparison', component: 'move', theme: 'calculation', needsEngine: true, computer: 'assembleAlternativesAnswer' },
  // ── pawns ──
  { aspect: 'passed-pawns', component: 'pawns', theme: 'pawn-structure', needsEngine: false, computer: null },
  { aspect: 'weak-pawns', component: 'pawns', theme: 'pawn-structure', needsEngine: false, computer: null },
  { aspect: 'pawn-breaks', component: 'pawns', theme: 'pawn-structure', needsEngine: false, computer: null },
  { aspect: 'majorities', component: 'pawns', theme: 'pawn-structure', needsEngine: false, computer: null },
  { aspect: 'structure', component: 'pawns', theme: 'pawn-structure', needsEngine: false, computer: 'assemblePositionalAnswer' },
  // ── king ──
  { aspect: 'king-safety-mine', component: 'king', theme: 'king-safety', needsEngine: false, computer: 'assembleKingSafetyAnswer' },
  { aspect: 'king-safety-theirs', component: 'king', theme: 'king-safety', needsEngine: false, computer: 'assembleKingSafetyAnswer' },
  { aspect: 'king-lines', component: 'king', theme: 'king-safety', needsEngine: false, computer: 'assembleKingSafetyAnswer' },
  { aspect: 'checks', component: 'king', theme: 'calculation', needsEngine: false, computer: null },
  { aspect: 'in-check', component: 'king', theme: 'board-vision', needsEngine: false, computer: null },
  // ── tactics ──
  { aspect: 'hanging', component: 'tactics', theme: 'board-vision', needsEngine: false, computer: 'assembleHangingAnswer' },
  { aspect: 'motifs', component: 'tactics', theme: 'calculation', needsEngine: false, computer: 'assembleTacticsAnswer' },
  { aspect: 'trapped', component: 'tactics', theme: 'board-vision', needsEngine: false, computer: null },
  { aspect: 'mate-threat', component: 'tactics', theme: 'king-safety', needsEngine: true, computer: null },
  { aspect: 'loose', component: 'tactics', theme: 'board-vision', needsEngine: false, computer: 'assembleHangingAnswer' },
  { aspect: 'overload', component: 'tactics', theme: 'calculation', needsEngine: false, computer: null },
  // ── endgame ──
  { aspect: 'endgame-result', component: 'endgame', theme: 'endgame-technique', needsEngine: true, computer: 'assembleEndgameAnswer' },
  { aspect: 'endgame-technique', component: 'endgame', theme: 'endgame-technique', needsEngine: false, computer: null },
  // ── opening ──
  { aspect: 'opening-name', component: 'opening', theme: 'opening-knowledge', needsEngine: false, computer: null },
  { aspect: 'master-play', component: 'opening', theme: 'opening-knowledge', needsEngine: false, computer: 'assembleMasterPlayAnswer' },
  { aspect: 'opening-plans', component: 'opening', theme: 'opening-knowledge', needsEngine: false, computer: null },
];

const BY_ASPECT: ReadonlyMap<QuestionAspect, BucketDef> = new Map(
  BOARD_QUESTION_BUCKETS.map((b) => [b.aspect, b]),
);
export function bucketFor(aspect: QuestionAspect): BucketDef | undefined {
  return BY_ASPECT.get(aspect);
}
export function themeFor(aspect: QuestionAspect): WeaknessTheme | undefined {
  return BY_ASPECT.get(aspect)?.theme;
}
