/**
 * MiddlegamePattern — the data shape for middlegame teaching content.
 *
 * Distinct from `WalkthroughTree` (which teaches a specific opening
 * line) but reuses many of the same supporting types — a pattern is
 * essentially a curated set of mini-walkthroughs around a single
 * theme (Greek gift sacrifice, isolated queen pawn, kingside pawn
 * storm, etc.) plus the same five teaching stages we apply to
 * openings (concepts / findMove / drill / punish / play).
 *
 * The CRITICAL piece that openings don't need: a `triggerQuestion` —
 * the question the student should ask in their own games to
 * recognize this pattern. Without it, the student learns trivia.
 * With it, they learn to see.
 *
 * Each `examples` entry is a `WalkthroughTree` that begins from a
 * mid-game `startFen`. The existing animation engine + UI
 * (useTeachWalkthrough + WalkthroughControls) plays them through
 * unchanged.
 */
import type {
  WalkthroughTree,
  ConceptCheckQuestion,
  FindMoveQuestion,
  DrillLine,
  PunishLesson,
} from './walkthroughTree';

/** Broad categorization for pattern picker UIs. */
export type PatternCategory =
  | 'tactic'    // forks, pins, sacrifices, removing the defender
  | 'structure' // IQP, hanging pawns, pawn chains, outposts
  | 'attack'    // kingside attack templates, opposite-side castling
  | 'defense'   // counter-attack, simplification, fortress
  | 'endgame';  // middlegame-to-endgame transitions

/** Difficulty hint for sequencing. Foundational = 1200-1400; intermediate
 *  = 1400-1700; advanced = 1700+. Loose; not used for gating, just for
 *  picker labeling. */
export type PatternDifficulty = 'foundational' | 'intermediate' | 'advanced';

/** A position where the pattern would-be-the-pattern fails — looks
 *  like the setup but the sacrifice / plan / move doesn't work. The
 *  most underrated piece of pattern teaching: knowing when NOT to
 *  play the move you've learned. */
export interface AntiPattern {
  /** Display name, e.g. "Greek Gift refuted by ...g6." */
  name: string;
  /** The FEN the position starts from. */
  startFen: string;
  /** Which side the student is studying. */
  studentSide: 'white' | 'black';
  /** What makes it superficially LOOK like the pattern fires. */
  whyLooksLikePattern: string;
  /** Why the pattern actually fails here. */
  whyDoesntWork: string;
  /** What the correct approach is instead. */
  correctApproach: string;
  /** The SAN of the move that LOOKS right but loses. */
  failingMove: string;
  /** The SAN sequence of the refutation (opponent's response that
   *  punishes the misapplied pattern). At least 2-3 plies showing
   *  why the sacrifice / plan loses. */
  refutation: string[];
}

/** A pair of positions that look superficially similar but require
 *  different plans. Forces deep recognition vs. surface-level. */
export interface CompareContrastPair {
  /** Setup prompt, e.g. "Both positions are IQPs, but the right plan
   *  differs. Which is which?" */
  prompt: string;
  /** First position. */
  positionA: ComparePosition;
  /** Second position. */
  positionB: ComparePosition;
}

export interface ComparePosition {
  startFen: string;
  studentSide: 'white' | 'black';
  /** Short label shown on the tap target, e.g. "Trade pieces" or
   *  "Attack the king." */
  correctPlanLabel: string;
  /** Full reasoning shown after the student picks. */
  correctPlanExplanation: string;
}

/** The full middlegame pattern data shape. */
export interface MiddlegamePattern {
  /** Stable id for routing + caching, e.g. 'greek-gift-sacrifice'. */
  id: string;
  /** Display name, e.g. "Greek Gift Sacrifice." */
  name: string;
  /** Category for picker grouping. */
  category: PatternCategory;
  /** Difficulty hint. */
  difficulty: PatternDifficulty;

  /** THE question the student should ask to recognize this pattern
   *  in their own games. The single most important pedagogical
   *  field. Without this, pattern teaching becomes trivia. */
  triggerQuestion: string;

  /** 2-4 sentence intro framing what the pattern is + when it
   *  applies. Spoken at the start of the lesson. */
  intro: string;
  /** 1-2 sentence outro inviting the next stage. */
  outro: string;

  /** Example positions where the pattern fires. Each is a
   *  WalkthroughTree starting from a mid-game FEN; the engine plays
   *  them through with full narration + arrows just like an opening
   *  line. Aim for 3-5 examples to build pattern recognition. */
  examples: WalkthroughTree[];

  /** 1-2 anti-pattern positions — looks like the pattern, but the
   *  sacrifice / plan FAILS. Teaches when NOT to play the move. */
  antiPatterns?: AntiPattern[];

  /** 1-2 compare-and-contrast pairs — positions that look similar
   *  but require different plans. Forces deep pattern recognition. */
  compareContrast?: CompareContrastPair[];

  /** Stage 2: concept check. */
  concepts?: ConceptCheckQuestion[];

  /** Stage 3: find the move (recognition puzzles starting from
   *  pattern positions). */
  findMove?: FindMoveQuestion[];

  /** Stage 4: drill (repeat the pattern setup-to-finish until
   *  automatic). */
  drill?: DrillLine[];

  /** Stage 5: punish (when opponent gives you the pattern setup,
   *  recognize and exploit). */
  punish?: PunishLesson[];

  /** Cross-references: opening names where this pattern naturally
   *  appears. Used by the leafOutros of those openings to suggest
   *  this pattern as a follow-up lesson. */
  appearsIn?: string[];
}
