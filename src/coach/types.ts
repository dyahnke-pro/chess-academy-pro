/**
 * Coach Brain — shared types for the unified coach spine
 * (WO-BRAIN-01). See `docs/COACH-BRAIN-00.md` for the architecture
 * the names below map to.
 */
import type { CoachMessage, HintRequestRecord, IntendedOpening } from '../stores/coachMemoryStore';

// ─── Identity ────────────────────────────────────────────────────────────────

export type CoachIdentity = 'danya' | 'kasparov' | 'fischer';

// ─── Personality (WO-COACH-PERSONALITIES) ───────────────────────────────────
//
// Personality is the VOICE of the coach — tone, register, style. It's an
// orthogonal axis to `CoachIdentity` (which was a never-implemented
// name-based switch). The OPERATOR-mode hard rules (user sovereignty over
// moves, play_move-when-mentioned, stockfish_eval grounding) hold across
// every personality; only the way the coach SAYS things changes.
//
// Three intensity dials modulate independently of personality, so a user
// can run e.g. "soft personality" with "medium flirt" if that's the vibe
// they want. Each personality ships sensible per-dial defaults but every
// dial is independently overridable from Settings.

export type CoachPersonality =
  | 'default'
  | 'soft'
  | 'edgy'
  | 'flirtatious'
  | 'drill-sergeant';

export type IntensityLevel = 'none' | 'medium' | 'hard';

export interface PersonalitySettings {
  personality: CoachPersonality;
  profanity: IntensityLevel;
  mockery: IntensityLevel;
  flirt: IntensityLevel;
}

/** The defaults that get applied when the user picks a personality but
 *  hasn't explicitly overridden a specific dial. Lives here next to the
 *  type so consumers (settings UI, envelope assembly, tests) never drift. */
export const PERSONALITY_DIAL_DEFAULTS: Record<
  CoachPersonality,
  Pick<PersonalitySettings, 'profanity' | 'mockery' | 'flirt'>
> = {
  default: { profanity: 'none', mockery: 'none', flirt: 'none' },
  soft: { profanity: 'none', mockery: 'none', flirt: 'none' },
  edgy: { profanity: 'medium', mockery: 'hard', flirt: 'none' },
  flirtatious: { profanity: 'medium', mockery: 'none', flirt: 'hard' },
  'drill-sergeant': { profanity: 'hard', mockery: 'hard', flirt: 'none' },
};

// ─── Memory snapshot ─────────────────────────────────────────────────────────

/** Read-only snapshot of the four-source coach memory at envelope-
 *  assembly time. Future-proofed: every field defined; only
 *  `intendedOpening` is populated end-to-end today, the rest default
 *  to empty arrays / null per UNIFY-01's schema-only fields. */
export interface CoachMemorySnapshot {
  intendedOpening: IntendedOpening | null;
  conversationHistory: CoachMessage[];
  preferences: {
    likes: string[];
    dislikes: string[];
    style: 'sharp' | 'positional' | 'solid' | null;
  };
  hintRequests: HintRequestRecord[];
  blunderPatterns: { id: string; pattern: string; occurrences: number; lastSeen: number }[];
  growthMap: { id: string; topic: string; masteryLevel: number; lastReviewed: number }[];
  gameHistory: { id: string; ts: number; result: 'win' | 'loss' | 'draw'; openingName: string | null }[];
}

// ─── App routes manifest entry ──────────────────────────────────────────────

export interface RouteManifestEntry {
  path: string;
  title: string;
  description: string;
  featuresAvailable: string[];
  openingsCovered?: string[];
}

// ─── Live state passed in by the calling surface ────────────────────────────

export type CoachSurface =
  | 'home-chat'
  | 'game-chat'
  | 'standalone-chat'
  | 'smart-search'
  | 'move-selector'
  | 'hint'
  | 'phase-narration'
  | 'review'
  | 'teach'
  | 'ping';

export interface LiveState {
  surface: CoachSurface;
  fen?: string;
  phase?: 'opening' | 'middlegame' | 'endgame';
  /** Stockfish centipawn eval (white-perspective) for the live FEN.
   *  Surfaces that already run a debounced engine analysis for an
   *  eval bar (CoachTeachPage) thread it through here so the envelope
   *  can present ground-truth material/eval to the brain WITHOUT it
   *  having to call stockfish_eval itself. Production audit (build
   *  4e628e5) caught the brain hallucinating "you're up a pawn" after
   *  losing its queen for a knight because it self-counted instead of
   *  consulting the engine. */
  evalCp?: number;
  /** Mate distance in plies (positive = white mates, negative = black
   *  mates). When set, supersedes evalCp for "who's winning" reads. */
  evalMateIn?: number;
  /** Stockfish PV[0] in UCI (e.g. `g1f3`) for the live FEN. Surfaces that
   *  already run a debounced engine analysis (CoachTeachPage's eval bar)
   *  thread it here so the grounding-inversion chat layer can ground a
   *  best-move answer in CODE — the engine's true best move — and voice it
   *  through `voiceFacts`, instead of handing the LLM the board. Optional;
   *  the grounding pipeline falls back to the master-play top move when
   *  absent. See docs/plans/2026-06-10-coach-chat-grounding-inversion.md. */
  engineBestMoveUci?: string;
  /** Pre-fetched Lichess explorer snapshot for the current FEN. The
   *  surface (CoachTeachPage) fires `fetchLichessExplorer` on every
   *  FEN change and threads the compact result here so the brain can
   *  cite ECO / opening name / amateur+master frequencies / sample
   *  master games without spending a round-trip on
   *  lichess_opening_lookup or lichess_master_games. The brain still
   *  has the active tools available for branch FENs the lesson
   *  hasn't navigated to yet. */
  lichessSnapshot?: {
    eco: string | null;
    name: string | null;
    /** Top moves from the amateur (lichess) explorer with frequency. */
    topAmateurMoves: { san: string; total: number; whitePct: number | null }[];
    /** Top moves from the masters explorer with rating. */
    topMasterMoves: { san: string; total: number; averageRating: number }[];
    /** Sample master games at this FEN. */
    topMasterGames: {
      white: string;
      black: string;
      winner: 'white' | 'black' | null;
      year: number;
    }[];
  };
  moveHistory?: string[];
  /** Free text describing what triggered this call. */
  userJustDid?: string;
  currentRoute?: string;
  /** Whose turn it is right now in the live position. The /coach/teach
   *  surface threads this through so the brain stops emitting moves
   *  for the wrong side — production audit (build 30fe8c8) showed
   *  the LLM trying to play `play_move {"san":"e5"}` from a
   *  black-to-move position with the white-side mental model, and
   *  chess.js correctly rejected it 5 trips in a row. */
  whoseTurn?: 'white' | 'black';
  /** Which side the STUDENT is playing on this surface (the coach plays the
   *  other side in /coach/play). Without it the coach knows whose turn it is
   *  from the FEN but has to GUESS which side is the student, and it guessed
   *  wrong — "Black's turn to move — that's yours" when the student is White
   *  (response-loop whose-turn probe 2026-06-05). Handed so the coach maps
   *  whoseTurn → "your move" / "my move" correctly. */
  studentColor?: 'white' | 'black';
  /** Pre-computed tactical context for the current FEN. Surfaces with
   *  Stockfish PV access (CoachTeachPage, CoachGamePage) build this via
   *  classifyPosition + scanUpcomingTactics so the brain can NAME
   *  tactics by pattern (fork, pin, skewer, back-rank threat, etc.)
   *  across opening, middlegame, and endgame phases instead of just
   *  citing the eval number. Without this block the brain knows the
   *  position is +2.0 but cannot articulate *why* it's +2.0.
   *
   *  G3 contract (same shape as opening / master-play grounding):
   *  the brain's tactical vocabulary is bounded by what this block
   *  contains. It must not invent tactics that didn't appear in the
   *  pre-computed scan. */
  tactics?: TacticsLiveContext;
  /** Curated per-move annotation context drawn from the 1893
   *  opening-book JSONs in `src/data/annotations/`. Populated by
   *  `coachService.ask` when `lichessSnapshot.name` is known and a
   *  matching annotation file exists. Surfaces may pre-populate this
   *  field to skip the auto-lookup (e.g. when they already loaded
   *  annotations for an in-flight walkthrough).
   *
   *  G3 contract: the brain riffs on this text rather than inventing
   *  plans, alternatives, or pawn-structure claims that aren't
   *  anchored in the curated source. */
  annotationContext?: LiveAnnotationContext;
  /** Classical-book passages drawn from `src/data/chess-concepts.json`
   *  (664 passages from 7 Gutenberg classics: Capablanca, Lasker,
   *  Staunton, Young, Edge, Bird). Populated by `coachService.ask`
   *  from the user's ask text + opening name. Quiet when no concepts
   *  matched. */
  bookGrounding?: LiveBookGrounding;
  /** Named strategic plan for the current opening, drawn from
   *  `src/data/middlegame-plans.json` (180 curated plans). Populated
   *  when the opening is recognized AND has a registered plan.
   *  Carries title + overview + strategic themes + pawn breaks +
   *  piece maneuvers — the brain has the structural plan available
   *  even mid-opening. Quiet when no plan exists for the opening. */
  middlegamePlan?: LiveMiddlegamePlan;
  /** Curated pro/master games for the current opening, drawn from
   *  `src/data/model-games.json` (~121 games). Up to 2 highest-rated
   *  examples shipped per call. The brain can cite "Morphy's Opera
   *  game" or "Carlsen vs Anand 2014" by name + year + critical
   *  moments instead of fabricating game citations. Quiet when no
   *  curated games are registered for the opening. */
  modelGames?: LiveModelGameContext;
  /** Pro player game references for the current opening, drawn from
   *  `src/data/pro-game-references.json` (the coach's breadth layer of
   *  REAL pro games). Populated by `coachService.ask` when an opening
   *  is recognized AND we have reference games for it. Scoped to a
   *  single pro when `proOpeningId` is set; otherwise spans every pro
   *  who plays the opening. Quiet when no references exist. (David
   *  2026-06-01.) */
  playerGames?: LivePlayerGamesContext;
  /** When the surface is a SPECIFIC pro opening (e.g. the
   *  /openings/pro/... detail page or a pro walkthrough), the pro
   *  opening id (e.g. "pro-naroditsky-caro-kann"). Scopes player-game
   *  references to that one pro instead of every pro who plays the
   *  line. Optional — base-openingId matching covers the rest. */
  proOpeningId?: string;
  /** Ground-truth SAN list for surfaces analyzing a SPECIFIC played
   *  game (game review). These are the moves actually played — chess.js-
   *  validated, real, legal — so the master-play claim validator treats
   *  them (plus the legal moves of the position being analyzed) as
   *  grounded. Without this, reviewing a game that left master book
   *  (a sacrifice, a sharp middlegame) tripped the validator on the
   *  game's OWN moves — every concrete SAN the coach mentioned about
   *  the student's game was flagged as an ungrounded hallucination and
   *  the answer stocked out. The Lichess explorer is the wrong authority
   *  for "analyze MY game"; the game itself is. Review passes the full
   *  move list; other surfaces leave undefined (strict master-play
   *  grounding stays in force for opening / "what do masters play"
   *  questions). */
  gameSans?: string[];
  /** TRUE when this turn is step-by-step MOVE NARRATION — the coach is
   *  narrating a move that was just played (the engine-driven Learn reply, or
   *  a "I played X. Your move." report) and explaining the ideas around it,
   *  NOT answering "what do masters play here?". In that context the coach
   *  legitimately names tactical continuations a ply or two ahead ("…then
   *  bxc3 doubles my pawns") that are neither currently legal nor in the move
   *  history — and those are TEACHING, not a "masters play X" fabrication.
   *  When set, the claim validator skips the bare-SAN gate for this turn
   *  (every SAN still gets a board-verified arrow via the G6 arrow validator,
   *  and the percentage / game-count / player-name / comparative guards stay
   *  fully in force). Without this, a deep Learn game stocked out ~half its
   *  turns: the coach named a real recapture/threat the explorer's top-N for
   *  the exact FEN didn't carry, the SAN gate flagged it, retries exhausted,
   *  and the student heard "I can't verify which moves are sound" instead of
   *  the lesson (prod, David's iPhone + deep audit, 2026-06-04). */
  moveNarration?: boolean;
  /** Engine-computed principal variation, pre-injected when the student
   *  asks for a PLAN ("what's my plan?", "next three moves?"). David
   *  2026-06-05: "use stockfish for the next three moves — more reliable."
   *  The plan's MOVE backbone is the engine's best line (real, legal,
   *  verified) instead of the LLM free-synthesizing moves. Because a PV is
   *  best-play-by-BOTH-sides (a forcing line, not a plan), the brain is
   *  instructed to anchor the student's NEXT move on `pvSan[0]`, teach the
   *  IDEA, and frame later plies as contingent on the opponent's reply.
   *  Pre-injecting (vs. relying on the brain to call `stockfish_eval`) is
   *  what makes it reliable — the brain skipped the tool intermittently.
   *  The play surface computes it for plan turns; quiet otherwise. */
  enginePlan?: {
    /** Principal variation in SAN from the current FEN, alternating
     *  sides (~6 plies). `pvSan[0]` is the side-to-move's best move. */
    pvSan: string[];
    /** White-perspective centipawn eval of the line; null when forced mate. */
    evalCp: number | null;
    /** Mate distance in plies (signed, white positive); null when not forced. */
    mateIn: number | null;
    /** Search depth that produced the line. */
    depth: number;
    /** Side the student is playing — so the brain knows which PV plies
     *  are the student's moves (the plan) vs the opponent's replies. */
    studentSide: 'white' | 'black';
  };
}

/** Pre-formatted classical-book grounding block. The text is built
 *  by `chessConceptService.buildCoachChatContext` (and friends) — it
 *  arrives shaped for direct paste into the system prompt with its
 *  own header / footer. Stored alongside `sourceCount` for audit
 *  observability so the wired audit can verify book passages
 *  actually shipped without re-parsing the formatted block. */
export interface LiveBookGrounding {
  /** The pre-formatted block, ready to inject into the envelope.
   *  Starts with `═══ REFERENCE FROM CHESS CLASSICS ═══` and ends
   *  with `═════════════════════════════════════`. */
  block: string;
  /** Number of passages folded into the block — typically 1-3
   *  (one opening + up to three concept passages). 0 means nothing
   *  matched; the loader returns null in that case rather than
   *  shipping an empty block. */
  sourceCount: number;
}

/** Strategic plan context for the current opening, drawn from
 *  `src/data/middlegame-plans.json`. See `LiveState.middlegamePlan`. */
export interface LiveMiddlegamePlan {
  id: string;
  openingId: string;
  title: string;
  overview: string;
  criticalPositionFen: string | null;
  strategicThemes: string[];
  pawnBreaks: Array<{ move: string; explanation: string }>;
  pieceManeuvers: Array<{ piece: string; route: string; explanation: string }>;
  endgameTransitions: string[];
}

/** Curated model-games context for the current opening, drawn from
 *  `src/data/model-games.json`. See `LiveState.modelGames`. */
export interface LiveModelGameContext {
  openingId: string;
  openingName: string;
  /** Total games available for this opening; capped at 2 in the
   *  shipped array but reported in full so the brain knows there's
   *  more if needed. */
  totalAvailable: number;
  games: Array<{
    id: string;
    white: string;
    black: string;
    result: string;
    year: number;
    event: string;
    overview: string;
    /** First ~25 plies of the game's PGN — enough to identify the
     *  line and the early structure. Brain can call lichess_master_games
     *  if it needs deeper detail. */
    pgnPrefix: string;
    criticalMoments: Array<{
      moveNumber: number;
      annotation: string;
      concept: string;
    }>;
  }>;
}

/** Pro player game references for the current opening, drawn from
 *  `src/data/pro-game-references.json` via Dexie. The BREADTH layer
 *  alongside the hand-narrated `modelGames`: many of a pro's REAL
 *  games per variation (full move list, opponent + rating + result +
 *  source), so the coach can say "Naroditsky beat a 3176 in this exact
 *  line" and walk the actual moves during teaching + walkthroughs.
 *  See `src/coach/sources/playerGames.ts`. (David 2026-06-01.) */
export interface LivePlayerGamesContext {
  /** App player id whose games these are (e.g. "naroditsky"), when scoped. */
  playerId: string | null;
  /** Base opening id resolved for the lookup (e.g. "caro-kann"). */
  openingId: string;
  openingName: string;
  /** Total reference games available for this opening (full set in Dexie). */
  totalAvailable: number;
  games: Array<{
    id: string;
    /** Display name of the pro who played this game. */
    player: string;
    studentSide: 'white' | 'black';
    opponent: string;
    opponentRating: number | null;
    result: string;
    date: string | null;
    source: 'chess.com' | 'otb' | 'lichess';
    variationLabel: string;
    /** First ~40 plies of clean SAN — enough to walk the line in a
     *  lesson. The full game lives in Dexie / the lookup_player_games
     *  tool if the brain needs the whole thing. */
    pgnPrefix: string;
    plyCount: number;
  }>;
}

/** Curated opening-book context attached to the envelope's live
 *  state. Each entry is the per-ply annotation lifted from
 *  `src/data/annotations/<id>.json`, windowed around the current ply
 *  (one prior ply for context + lookahead up to 6 moves total). See
 *  `src/coach/sources/annotationContext.ts`. */
export interface LiveAnnotationContext {
  /** Lichess-style opening name (e.g. "Italian Game"). Stays as
   *  displayed for prose grounding. */
  openingName: string;
  /** Annotation file ID after slug + alias resolution
   *  (e.g. "italian-game"). */
  openingId: string;
  /** Concatenated SAN PGN of all moves played so far. */
  pgnSoFar: string;
  /** Ply count at the moment the envelope was built (= moveHistory
   *  length). The brain uses this to locate "now" inside the window. */
  currentPly: number;
  /** Total annotated entries for this opening — useful for the brain
   *  to gauge how deep the book context goes vs how far past book the
   *  current position is. */
  totalAnnotated: number;
  /** Per-ply windowed annotations. */
  moves: Array<{
    ply: number;
    san: string;
    annotation: string;
    shortNarration?: string;
    plans?: string[];
    alternatives?: string[];
    pawnStructure?: string;
  }>;
}

/** Pre-computed tactical context attached to the envelope's live
 *  state. See `LiveState.tactics`. */
export interface TacticsLiveContext {
  /** Tactics on the board RIGHT NOW for the side to move
   *  (forks/pins/skewers/back-rank/etc.). */
  immediate: Array<{
    /** Canonical pattern name (fork, pin, skewer, discovery, double_check,
     *  back_rank, removal_of_guard). */
    type: string;
    /** Human-readable description, e.g. "Knight on d5 forks queen on c7
     *  and rook on f6". */
    description: string;
    /** Squares involved in the tactic. */
    squares: string[];
  }>;
  /** Undefended attacked pieces (either color). */
  hanging: Array<{ square: string; piece: string; color: 'w' | 'b' }>;
  /** Tactics in the opponent's principal variation — THREATS to warn
   *  the student about. */
  threats: Array<{
    type: string;
    description: string;
    depthAhead: number;
    line: string[];
  }>;
  /** Tactics in the student's principal variation — OPPORTUNITIES
   *  the student should aim for. */
  opportunities: Array<{
    type: string;
    description: string;
    depthAhead: number;
    line: string[];
  }>;
  /** Half-move depth the PV scan covered (rating-adaptive via
   *  `getTacticLookahead`). The brain must not claim a tactic
   *  further out than this depth. */
  lookaheadDepth: number;
  /** GROUND-TRUTH board facts computed deterministically from the FEN
   *  (chess.js), injected so the brain NEVER has to eyeball the board —
   *  the audit (2026-06-02) caught it putting a castled king on e8 and
   *  missing a mate-in-1. The renderer marks these authoritative: the
   *  brain must not contradict the king squares, must not invent a
   *  check, and must report `mateInOne` when set / never claim a mate
   *  when it's null. Present whenever a valid FEN was supplied. */
  boardFacts?: {
    sideToMove: 'white' | 'black';
    whiteKing: string;
    blackKing: string;
    /** Which side (if any) is currently in check. */
    inCheck: 'white' | 'black' | null;
    /** SAN of a forced mate-in-one for the side to move, if one exists;
     *  null when there is none. Computed by trying every legal move. */
    mateInOne: string | null;
    /** Plain-English inventory of EVERY white piece + its square, e.g.
     *  "King e1, Queen d1, Rook a1, Rook h1, Bishop c4, Knight f3,
     *  pawns on a2 b2 c2 d2 e4 f2 g2 h2". The brain reads piece locations
     *  from HERE instead of parsing the raw FEN — LLMs misparse FENs (the
     *  2026-06-02 audit caught it claiming "no e4 pawn, starting
     *  position" mid-game with the correct FEN in the prompt). */
    whitePieces: string;
    /** Same inventory for black. */
    blackPieces: string;
    /** Per-piece ATTACK / DEFENSE map (ground truth, chess.js attackers()):
     *  every piece currently ATTACKED by the enemy, with the exact squares
     *  that attack it and the exact squares that defend it. Lets the coach
     *  explain WHY a piece is (or isn't) hanging with the RIGHT pieces
     *  instead of eyeballing — prod drive 2026-06-05 caught the coach saying
     *  "the rook on a1 defends e2" when the KING on e1 did, and "the queen
     *  attacks a5" when the BISHOP on b6 did. A piece is hanging iff
     *  `attackedBy` is non-empty AND `defendedBy` is empty. Hanging-first,
     *  capped to the most-pressured pieces. */
    attackMap: Array<{
      square: string;
      piece: string;
      color: 'white' | 'black';
      attackedBy: string[];
      defendedBy: string[];
    }>;
    /** Deterministic material balance (chess.js piece values, kings
     *  excluded), white-perspective, in plain English — e.g. "White is
     *  down 3 (rook+pawn = 6 vs queen = 9)" / "Material is even" / "White
     *  is up 5 (extra rook)". Injected so the coach states up/down/ahead/
     *  behind from ground truth instead of eyeballing — it intermittently
     *  flips the SIGN on tricky imbalances (R+P vs Q: said "White is ahead"
     *  while down 3 — response-loop audit 2026-06-05). NOT an eval (no
     *  positional judgment); pure material count. */
    material: string;
  };
}

// ─── Envelope (what every LLM call contains) ─────────────────────────────────

export interface AssembledEnvelope {
  identity: string;
  memory: CoachMemorySnapshot;
  appMap: RouteManifestEntry[];
  liveState: LiveState;
  toolbelt: ToolDefinition[];
  ask: string;
}

// ─── Tools ──────────────────────────────────────────────────────────────────

/** JSON-schema-style tool definition, provider-agnostic. The provider
 *  layer translates this into whatever shape its API expects. */
export interface ToolDefinition {
  name: string;
  description: string;
  /** Each property is a JSON-schema fragment ({ type, description }). */
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export type ToolCategory = 'cerebellum' | 'cerebrum';

/** Read vs write classification for spine dispatch parallelization
 *  (WO-STOCKFISH-SWAP-AND-PERF). Read-only tools (stockfish_eval,
 *  lichess lookups, local_opening_book, set_intended_opening) can
 *  run concurrently when the LLM emits multiple in one trip — none
 *  of them mutate board state or depend on each other's results.
 *  Write tools (play_move, take_back_move, reset_board,
 *  set_board_position, navigate_to_route) mutate state and MUST run
 *  sequentially in the order the LLM emitted them, after all
 *  read-only tools have settled, to preserve causality. */
export type ToolKind = 'read' | 'write';

/** Surface-supplied callbacks + context the spine threads into every
 *  tool dispatch. Cerebrum tools use these to invoke real side
 *  effects (play a move, navigate the router) on behalf of the calling
 *  surface. Cerebellum tools ignore the context. WO-BRAIN-04. */
export interface ToolExecutionContext {
  /** Called by `play_move` to actually play the chosen SAN. The
   *  callback returns `{ ok, reason? }` to tell the brain whether the
   *  move landed (e.g. legal) so the LLM can react in a follow-up
   *  round-trip. Boolean returns are also accepted. */
  onPlayMove?: (
    san: string,
  ) =>
    | Promise<{ ok: boolean; reason?: string } | boolean>
    | { ok: boolean; reason?: string }
    | boolean;
  /** Called by `take_back_move` to revert the board by N half-moves.
   *  WO-COACH-OPERATOR-FOUNDATION-01. */
  onTakeBackMove?: (
    count: number,
  ) =>
    | Promise<{ ok: boolean; reason?: string } | boolean>
    | { ok: boolean; reason?: string }
    | boolean;
  /** Called by `set_board_position` to jump the board to an arbitrary
   *  FEN. WO-COACH-OPERATOR-FOUNDATION-01. */
  onSetBoardPosition?: (
    fen: string,
  ) =>
    | Promise<{ ok: boolean; reason?: string } | boolean>
    | { ok: boolean; reason?: string }
    | boolean;
  /** Called by `reset_board` to restart the game from the starting
   *  position. WO-COACH-OPERATOR-FOUNDATION-01. */
  onResetBoard?: ()
    => Promise<{ ok: boolean; reason?: string } | boolean>
    | { ok: boolean; reason?: string }
    | boolean;
  /** Called by `navigate_to_route` to actually push the route via
   *  react-router. Path has already been validated against the app
   *  manifest before this runs. */
  onNavigate?: (path: string) => void;
  /** WO-COACH-LICHESS-OPENINGS — called by `quiz_user_for_move`. Puts
   *  the live board into "find the move" mode for a specific
   *  expected SAN. Surface displays the prompt, waits for the user's
   *  move, and resolves with `{ ok: true, played }` when the user
   *  played the expected (or alternative) move, or `{ ok: false,
   *  played, expected }` when they played something else. The coach
   *  reads the result on the next LLM round-trip and narrates
   *  feedback. */
  onQuizUserForMove?: (args: {
    expectedSan: string;
    prompt: string;
    allowAlternatives?: readonly string[];
  }) =>
    | Promise<
        | { ok: true; played: string }
        | { ok: false; played: string; expected: string }
        | { ok: false; reason: string }
      >;
  /** WO-COACH-LICHESS-OPENINGS — called by
   *  `start_walkthrough_for_opening`. Hands off to the existing
   *  WalkthroughMode UI seeded by an opening name (and optional
   *  variation / orientation / PGN). Surface navigates and returns
   *  `{ ok: true }` once the route push is dispatched. */
  onStartWalkthroughForOpening?: (args: {
    opening: string;
    variation?: string;
    orientation?: 'white' | 'black';
    pgn?: string;
  }) =>
    | Promise<{ ok: boolean; reason?: string }>
    | { ok: boolean; reason?: string };
  /** FEN at the time of the call — used by `play_move` to validate SAN
   *  legality before invoking `onPlayMove`. */
  liveFen?: string;
  /** WO-FOUNDATION-02 trace harness — per-message UUID generated at
   *  GameChatPanel.handleSend, threaded through CoachServiceOptions
   *  into the spine and onto every tool's ToolExecutionContext so
   *  audit trail entries can be joined end-to-end. Optional;
   *  callers that don't generate one omit it. */
  traceId?: string;
}

export interface Tool extends ToolDefinition {
  category: ToolCategory;
  /** Spine dispatch hint. Read tools dispatch in parallel within a
   *  toolCalls batch; write tools serialize after the read wave. */
  kind: ToolKind;
  execute: (
    args: Record<string, unknown>,
    ctx?: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionResult {
  ok: boolean;
  /** Free-form payload returned to the LLM as the tool result. */
  result?: unknown;
  error?: string;
}

// ─── Provider abstraction ───────────────────────────────────────────────────

export type ProviderName = 'deepseek' | 'anthropic' | 'router-direct';

export interface ProviderToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ProviderResponse {
  text: string;
  toolCalls: ProviderToolCall[];
  /** Provider-specific metadata for debugging. */
  raw?: unknown;
}

/** Per-call options the spine threads from `CoachServiceOptions` into
 *  the provider. Today's only option is `task` — model-routing hint
 *  the underlying coachApi uses to pick the right model
 *  (interactive_review → haiku, position_analysis_chat → reasoner,
 *  chat_response → sonnet/deepseek-chat). Without this the spine
 *  always uses chat_response on Anthropic, which routes everything
 *  through the expensive Sonnet model — fine for /coach/teach where
 *  depth matters, wasteful for /coach/play move-commentary where
 *  Haiku is the right call. WO-COACH-UNIFY-01. */
export interface ProviderCallOptions {
  /** CoachTask hint passed down to the underlying API for model
   *  selection. When omitted, the provider uses 'chat_response'. */
  task?: import('../types').CoachTask;
  /** Optional max-tokens override. When omitted, the provider uses
   *  its built-in default (typically 2000). Useful for short
   *  one-shot calls (tactic alerts, explore reactions) that don't
   *  need a long context budget. */
  maxTokens?: number;
  /** WO-COACH-MASTER-INTEGRATION — master-play grounding for THIS
   *  turn. When provided AND the user's last message looks like a
   *  move question, the brain pre-injects master-play context and
   *  validates the response against it (up to 2 retries; stock
   *  fallback after exhaustion). The surface decides whether to
   *  engage by passing this block; the provider passes it through to
   *  `getCoachChatResponse`. Kid surfaces MUST NOT pass this.
   *  See `MasterGroundingOptions` in `src/services/coachApi.ts`. */
  grounding?: import('../services/coachApi').MasterGroundingOptions;
}

export interface Provider {
  name: ProviderName;
  call(envelope: AssembledEnvelope, options?: ProviderCallOptions): Promise<ProviderResponse>;
  /** Optional streaming variant. WO-BRAIN-02 added this so migrated
   *  surfaces (in-game chat first) can preserve token-by-token UX.
   *  When omitted, callers fall back to `call(...)`. */
  callStreaming?(
    envelope: AssembledEnvelope,
    onChunk: (chunk: string) => void,
    options?: ProviderCallOptions,
  ): Promise<ProviderResponse>;
}

// ─── Service entry point ────────────────────────────────────────────────────

export interface CoachAskInput {
  surface: CoachSurface;
  ask: string;
  liveState: LiveState;
}

export interface CoachAnswer {
  text: string;
  /** Tool call IDs the service dispatched in fulfilling this ask. */
  toolCallIds: string[];
  /** Tool NAMES dispatched in fulfilling this ask, in dispatch order.
   *  Surfaces use this to detect state-changing tool calls
   *  (`set_board_position`, `start_walkthrough_for_opening`) and
   *  enforce the "Setting the board to {name}." spoken sentence per
   *  Bug A2 (audit 2026-05-19). */
  dispatchedToolNames: string[];
  /** Provider used for this call (for debugging / audit). */
  provider: ProviderName;
}
