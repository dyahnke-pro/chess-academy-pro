/**
 * Coach Brain — shared types for the unified coach spine
 * (WO-BRAIN-01). See `docs/COACH-BRAIN-00.md` for the architecture
 * the names below map to.
 */
import type { CoachMessage, HintRequestRecord, IntendedOpening } from '../stores/coachMemoryStore';

// ─── Identity ────────────────────────────────────────────────────────────────

export type CoachIdentity = 'danya' | 'kasparov' | 'fischer';

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
