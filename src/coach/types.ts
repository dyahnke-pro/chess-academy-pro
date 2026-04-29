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
  | 'ping';

export interface LiveState {
  surface: CoachSurface;
  fen?: string;
  phase?: 'opening' | 'middlegame' | 'endgame';
  evalCp?: number;
  moveHistory?: string[];
  /** Free text describing what triggered this call. */
  userJustDid?: string;
  currentRoute?: string;
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

export interface Provider {
  name: ProviderName;
  call(envelope: AssembledEnvelope): Promise<ProviderResponse>;
  /** Optional streaming variant. WO-BRAIN-02 added this so migrated
   *  surfaces (in-game chat first) can preserve token-by-token UX.
   *  When omitted, callers fall back to `call(...)`. */
  callStreaming?(
    envelope: AssembledEnvelope,
    onChunk: (chunk: string) => void,
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
  /** Provider used for this call (for debugging / audit). */
  provider: ProviderName;
}
