/**
 * coachService — the Coach Brain spine entry point.
 *
 * Every surface in the app calls `coachService.ask({ surface, ask,
 * liveState })`. The service:
 *   1. Logs `coach-brain-ask-received`.
 *   2. Reads the four sources (identity, memory, app map, live state)
 *      and assembles the six-part envelope.
 *   3. Calls the active provider (DeepSeek by default; flippable to
 *      Anthropic via `COACH_PROVIDER` env var).
 *   4. Dispatches any tool calls the LLM emitted (via the existing
 *      `[[ACTION:name {args}]]` tag protocol parsed inside the
 *      provider).
 *   5. If `maxToolRoundTrips > 1` (BRAIN-04), feeds the tool results
 *      back to the provider as a follow-up turn, allowing the LLM to
 *      see what each tool returned and react with another tool call
 *      or a final answer. Capped at `maxToolRoundTrips` to prevent
 *      runaway loops.
 *   6. Returns the cleaned text from the FINAL turn + a list of every
 *      tool-call id dispatched across all turns.
 *
 * Surface-specific callbacks (`onPlayMove`, `onNavigate`) are threaded
 * into each tool dispatch via `ToolExecutionContext`. Tools that need
 * a real side effect (cerebrum) consume the context; cerebellum tools
 * ignore it.
 *
 * See `docs/COACH-BRAIN-00.md` for the architecture this implements.
 */
import { Chess } from 'chess.js';
import { logAppAudit } from '../services/appAuditor';
import { scanPositionForTrap } from '../services/positionTrapScan';
import { groundCoachReply, applyCandidateArrows } from '../services/coachAnswerGates';
import { assembleEnvelope } from './envelope';
import { loadAnnotationContextForLive } from './sources/annotationContext';
import { loadBookGroundingForLive } from './sources/bookGrounding';
import { loadMiddlegamePlanForLive } from './sources/middlegamePlan';
import { loadModelGamesForLive } from './sources/modelGames';
import { loadPlayerGamesForLive } from './sources/playerGames';
import { loadProGameReferenceData } from '../services/proGameReferenceData';
import { deepseekProvider } from './providers/deepseek';
import { anthropicProvider } from './providers/anthropic';
import { COACH_TOOLS, getTool, getToolDefinitions } from './tools/registry';
import type {
  AssembledEnvelope,
  CoachAnswer,
  CoachAskInput,
  CoachIdentity,
  CoachPersonality,
  IntensityLevel,
  Provider,
  ProviderName,
  ProviderResponse,
  TacticsLiveContext,
  ToolExecutionContext,
} from './types';

/** Read provider name from `import.meta.env.COACH_PROVIDER`, falling
 *  back to `process.env.COACH_PROVIDER` (Node test envs), default
 *  'deepseek'. David's call 2026-05-19: flip from Anthropic-first
 *  back to DeepSeek-first to spend DeepSeek tokens. On auth/quota
 *  error the coachApi layer transparently retries on Anthropic via
 *  the existing fallback chain (`getFallbackConfig`). The
 *  constitution requires this be a one-line flip. */
/**
 * Strip the stray leading-character streaming artifact that prefixes
 * tool-use turns on chat surfaces (production audit 2026-06-02: a constant
 * leading "C" — "CWe're at the Najdorf…", "CLet me get the engine's read…").
 * Removes a SOLITARY leading letter immediately followed (no space) by a
 * capitalised word, the exact artifact shape. Safe against real coach text:
 *   "Nf3 is best"  → "f" lowercase after N → no change
 *   "White has…"   → "h" lowercase after W → no change
 *   "OK, so…"      → "," after K (not a lowercase letter) → no change
 *   "I think…"     → space after I → no change
 *   "CWe're at…"   → "We" (cap+lower) after C → "We're at…"
 */
export function stripLeadingArtifact(text: string): string {
  return text.replace(/^[A-Za-z](?=[A-Z][a-z])/, '');
}

/** Did a player-data tool result actually carry moves/games? Used by the
 *  G3 fabrication backstop — a player lookup that returned nothing is not
 *  grounding for any "he plays X 55%" claim. */
function hasPlayerData(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as { moves?: unknown[]; games?: unknown[] };
  return (Array.isArray(r.moves) && r.moves.length > 0) ||
         (Array.isArray(r.games) && r.games.length > 0);
}

/** Collect SAN tokens from a player-data tool result into `into`, so the
 *  claim validator (master-play pipeline) accepts moves the coach grounds
 *  in a player's REAL games — the same escape hatch the review surface
 *  uses via `gameSans`. Without this, a lesson built from a chess.com
 *  pro's games (Naroditsky/Hikaru — no Lichess master-play data for the
 *  exact line) trips the master-play SAN gate and stocks out (#4). */
function collectPlayerSans(toolName: string, result: unknown, into: Set<string>): void {
  if (!result || typeof result !== 'object') return;
  const r = result as { moves?: { san?: string }[]; games?: { pgn?: string }[] };
  if (toolName === 'lookup_player_opening_moves' && Array.isArray(r.moves)) {
    for (const m of r.moves) if (m.san) into.add(m.san);
  }
  if (toolName === 'lookup_player_games' && Array.isArray(r.games)) {
    for (const g of r.games) {
      if (typeof g.pgn === 'string') {
        for (const tok of g.pgn.split(/\s+/)) {
          const san = tok.replace(/^\d+\.+/, '').trim();
          if (san) into.add(san);
        }
      }
    }
  }
}

/** Collect the player NAME grounded by a player-games tool — both the
 *  `player` ARG the brain passed ("Carlsen" / "magnuscarlsen") and the
 *  display name in the result ("Magnus Carlsen") — so the entity claim
 *  validator accepts the pro the lesson is about. The arg matters because
 *  the on-the-fly result carries the Lichess HANDLE ("DrNykterstein"),
 *  not the canonical name the brain speaks. (Prod bug 2026-06-02.) */
function collectPlayerNames(toolName: string, args: unknown, result: unknown, into: Set<string>): void {
  if (toolName !== 'lookup_player_opening_moves' && toolName !== 'lookup_player_games') return;
  const a = args as { player?: unknown };
  if (typeof a?.player === 'string' && a.player.trim()) into.add(a.player.trim());
  if (result && typeof result === 'object') {
    const r = result as { player?: unknown; games?: { player?: unknown }[] };
    if (typeof r.player === 'string' && r.player.trim()) into.add(r.player.trim());
    if (Array.isArray(r.games)) for (const g of r.games) if (typeof g.player === 'string' && g.player.trim()) into.add(g.player.trim());
  }
}

/** The safe refusal that replaces a response which cited player percentages
 *  without any grounded player data (the explorer was down / returned
 *  empty). Mirrors claimValidator's stock-fallback. */
const UNGROUNDED_PLAYER_STAT_REFUSAL =
  "I can't pull that player's real games right now — the explorer's unavailable, so I don't have their actual move frequencies. I'm not going to guess percentages from memory. Want me to retry, or teach the opening from the master database instead?";

/** FAIL-LOUDLY (David 2026-06-15: "I want the llm to fail loudly if something
 *  is down… say what is not working — 'Stockfish not responding'"). When a
 *  DATA tool the coach relies on fails this turn, we surface WHAT is down to
 *  the student deterministically instead of letting the LLM paper over it with
 *  an invented evaluation (the dead-engine "exd6 is the engine's #1"
 *  fabrication). Maps each data tool → a plain-language "what's down" clause. */
const DATA_TOOL_DOWN_MESSAGES: Record<string, string> = {
  stockfish_eval: "Stockfish isn't responding, so I can't give you an engine evaluation or a verified best move right now",
  stockfish_classify_move: "Stockfish isn't responding, so I can't grade that move's accuracy right now",
  lookup_master_play: "the master-games database is unreachable, so I can't tell you what masters actually play here",
  lichess_master_games: "the master-games database is unreachable right now",
  lichess_opening_lookup: "the opening database is unreachable right now",
  local_opening_book: "the opening book is unavailable right now",
  lookup_player_games: "I couldn't reach that player's real games right now",
  lookup_player_opening_moves: "I couldn't reach that player's opening stats right now",
};

function resolveProviderName(): ProviderName {
  // Vite-style env (browser builds).
  const viteEnv = (typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined);
  const fromVite = viteEnv?.VITE_COACH_PROVIDER ?? viteEnv?.COACH_PROVIDER;
  // Node-style env (vitest, scripts).
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const fromProcess = typeof process !== 'undefined' && process.env
    ? process.env.COACH_PROVIDER
    : undefined;
  const raw = (fromVite ?? fromProcess ?? 'deepseek').toLowerCase();
  return raw === 'anthropic' ? 'anthropic' : 'deepseek';
}

function pickProvider(name: ProviderName): Provider {
  return name === 'anthropic' ? anthropicProvider : deepseekProvider;
}

/** Map the spine's `CoachSurface` enum to a route path the audit
 *  stream + claim-validator audits can attribute against. Used by
 *  the auto-grounding hook to label which surface generated each
 *  master-play event. WO-COACH-MASTER-INTEGRATION. */
function coachSurfaceToRoute(surface: string): string {
  switch (surface) {
    case 'home-chat':       return '/coach/home';
    case 'standalone-chat': return '/coach/chat';
    case 'game-chat':       return '/coach/play';
    case 'move-selector':   return '/coach/play';
    case 'hint':            return '/coach/play';
    case 'phase-narration': return '/coach/play';
    case 'ping':            return '/coach/play';
    case 'review':          return '/coach/review';
    case 'teach':           return '/coach/teach';
    case 'smart-search':    return '/';
    default:                return `/coach/${surface}`;
  }
}

export interface CoachServiceOptions {
  /** Override the active provider. Useful for tests. */
  provider?: ProviderName;
  /** Override the legacy coach identity (default: 'danya'). Kept for
   *  backward compat with pre-personality call sites; new callers use
   *  `personality` + the three intensity dials below. */
  identity?: CoachIdentity;
  /** Personality voice for this call. Defaults to 'default' which
   *  produces the same prompt as the pre-personality build (modulo
   *  three "no-op" dial clauses reinforcing the default behavior).
   *  WO-COACH-PERSONALITIES. */
  personality?: CoachPersonality;
  /** Profanity intensity dial. Default: 'none'. */
  profanity?: IntensityLevel;
  /** Mockery intensity dial. Default: 'none'. */
  mockery?: IntensityLevel;
  /** Flirt intensity dial. Default: 'none'. */
  flirt?: IntensityLevel;
  /** Verbosity dial — clamps how much the coach says per turn. Wired
   *  into the identity prompt's teaching block. Default: 'normal'. */
  verbosity?: 'minimal' | 'normal' | 'verbose';
  /** Inject a custom provider instance (used by tests with a mock). */
  providerOverride?: Provider;
  /** When provided, the service routes through the provider's
   *  streaming path (if implemented) and pipes raw token chunks
   *  here as they arrive. The final returned `CoachAnswer.text` is
   *  the post-action-stripped, full response — same semantics as
   *  `runAgentTurn`'s `onChunk`. WO-BRAIN-02.
   *
   *  Streaming only applies to the FIRST turn of a multi-turn loop.
   *  Follow-up turns (when `maxToolRoundTrips > 1`) always run
   *  non-streaming — intermediate text isn't user-facing. */
  onChunk?: (chunk: string) => void;
  /** Maximum number of provider round-trips for tool result loop-back.
   *  Default `1` preserves BRAIN-01..03 single-pass behavior. Move-
   *  selector surface uses `3` so the brain can fetch data via
   *  cerebellum tools, see results, and emit a `play_move` decision in
   *  a follow-up turn. WO-BRAIN-04. */
  maxToolRoundTrips?: number;
  /** Callback the `play_move` cerebrum tool uses to actually play a
   *  move on the calling surface. Returning `{ ok: false, reason }`
   *  surfaces the failure back to the LLM in the next round-trip so it
   *  can choose differently. WO-BRAIN-04. */
  onPlayMove?: ToolExecutionContext['onPlayMove'];
  /** Callback the `take_back_move` cerebrum tool uses to revert the
   *  board by N half-moves. WO-COACH-OPERATOR-FOUNDATION-01. */
  onTakeBackMove?: ToolExecutionContext['onTakeBackMove'];
  /** Callback the `set_board_position` cerebrum tool uses to jump the
   *  board to an arbitrary FEN. WO-COACH-OPERATOR-FOUNDATION-01. */
  onSetBoardPosition?: ToolExecutionContext['onSetBoardPosition'];
  /** Callback the `reset_board` cerebrum tool uses to restart the game
   *  from the starting position. WO-COACH-OPERATOR-FOUNDATION-01. */
  onResetBoard?: ToolExecutionContext['onResetBoard'];
  /** Callback the `navigate_to_route` cerebrum tool uses to actually
   *  push the user-validated route via react-router. WO-BRAIN-04. */
  onNavigate?: ToolExecutionContext['onNavigate'];
  /** Callback the `quiz_user_for_move` cerebrum tool uses to register
   *  a one-shot quiz on the live board. WO-COACH-LICHESS-OPENINGS. */
  onQuizUserForMove?: ToolExecutionContext['onQuizUserForMove'];
  /** Callback the `start_walkthrough_for_opening` cerebrum tool uses to
   *  hand off to the WalkthroughMode UI. WO-COACH-LICHESS-OPENINGS. */
  onStartWalkthroughForOpening?: ToolExecutionContext['onStartWalkthroughForOpening'];
  /** WO-FOUNDATION-02 trace harness — surface-supplied UUID for
   *  joining audit entries across the pipeline. */
  traceId?: string;
  /** Tool names to exclude from the toolbelt for THIS call. Used by
   *  the coach-turn fallback chain to retry without tools that are
   *  suspected of hanging (e.g. `stockfish_eval` when the engine is
   *  stuck). The LLM physically does not see excluded tools in its
   *  toolbelt, AND the spine refuses to dispatch them if the LLM
   *  hallucinates a call. WO-COACH-RESILIENCE. */
  excludeTools?: readonly string[];
  /** Per-call task hint for model selection. Maps to CoachTask in the
   *  underlying coachApi (move_commentary → cheap, position_analysis_chat
   *  → reasoner, chat_response → sonnet/deepseek-chat, etc.). When
   *  omitted the providers default to 'chat_response'. WO-COACH-UNIFY-01. */
  task?: import('../types').CoachTask;
  /** Per-call max-tokens override. Useful for short one-shot calls
   *  (tactic alerts ~200, move-commentary ~500) where the provider
   *  default of 2000 wastes budget. WO-COACH-UNIFY-01. */
  maxTokens?: number;
  /** Per-call system-prompt addendum, appended to the envelope's
   *  identity. Used by migrated surfaces with a prompt too dynamic
   *  for a generic surface block. WO-COACH-UNIFY-01. */
  systemPromptAddition?: string;
  /** When true, the envelope skips appending the surface-mode block
   *  (TEACH_MODE_ADDITION / REVIEW_MODE_ADDITION / PHASE_NARRATION_ADDITION)
   *  for this call. Used by JSON-only / prose-only prep calls that
   *  want surface='review' for memory + live-state injection but
   *  conflict with the surface block's `[VOICE: ...]` / `[BOARD: ...]`
   *  marker mandate. Production audit (build 6459def+) showed the
   *  review-segments JSON parse failing because the LLM honored both
   *  prompts at once and emitted markdown markers wrapped around the
   *  JSON. Memory + live-state injection still happens regardless. */
  suppressSurfaceMode?: boolean;
  /** When true, drop the entire `[Toolbelt]` block from the envelope's
   *  system prompt. The brain still has identity + app map + memory +
   *  live state, but loses the tool list and the
   *  "call tools via `[[ACTION:name {args}]]`" preamble. Use for
   *  pure-prose / JSON-only calls (Review summary card, intro/closing
   *  narration prep) where no tool is needed and the temptation to
   *  emit `[[ACTION:record_blunder ...]]` leaks raw tags into the
   *  rendered output (production audit, chesscom-971406909). The
   *  spine's response-side dispatcher still rejects hallucinated tool
   *  calls, so this is safe defense-in-depth, not behavior change. */
  suppressToolbelt?: boolean;
  /** Optional getter the spine calls between trips to refresh
   *  `ctx.liveFen`. Without this, the FEN snapshotted at handleSubmit
   *  time stays frozen across all round-trips — so when the brain
   *  successfully plays a move in trip 2, trips 3+ still see the
   *  pre-move FEN and wastes turns trying to play moves for the
   *  side that already moved (production audit, build 38d4ace). The
   *  surface should pass a getter that reads from a ref. */
  getLiveFen?: () => string;
  /** WO-COACH-MASTER-INTEGRATION — master-play grounding for THIS
   *  coach turn. When provided AND intent detection matches a move
   *  question, the brain pre-injects master-play context for the
   *  current FEN + look-ahead positions and validates the LLM's
   *  output (up to 2 retries; stock fallback after exhaustion).
   *  Surfaces pass `{ currentFen, surface }`; the watcher
   *  (`useMasterPlayWatcher`) keeps the cache warm so the pre-
   *  injection path is near-instant. Kid surfaces MUST NOT pass this.
   *  See `MasterGroundingOptions` in `src/services/coachApi.ts`. */
  grounding?: import('../services/coachApi').MasterGroundingOptions;
}

/** Format a list of tool results plus the LLM's previous text into a
 *  follow-up `ask` body. The follow-up envelope keeps the same
 *  identity, memory, app map, live state, and toolbelt — only the
 *  ask changes. */
function formatToolResultsAsFollowUpAsk(
  originalAsk: string,
  previousAssistantText: string,
  results: { name: string; ok: boolean; result?: unknown; error?: string }[],
): string {
  const lines: string[] = [
    '[Original ask]',
    originalAsk,
    '',
  ];
  if (previousAssistantText.trim().length > 0) {
    lines.push('[Your previous response]', previousAssistantText, '');
  }
  lines.push('[Tool results from previous turn]');
  for (const r of results) {
    const payload: string[] = [`ok=${r.ok}`];
    if (r.result !== undefined) payload.push(`result=${JSON.stringify(r.result)}`);
    if (r.error) payload.push(`error=${r.error}`);
    lines.push(`- ${r.name}: ${payload.join(' ')}`);
  }
  // Explicit anti-replay rule. Production audit (build a67a4eb) showed
  // the brain emitting `play_move d5` twice in a row across trips —
  // trip 2's d5 succeeded, then trip 3 emitted d5 again (rejected
  // because d5 was already on the board). The brain was reading
  // "play_move ok" as "the call worked" without realizing the move
  // is now permanently committed. Spell it out.
  const succeededMoves = results
    .filter((r) => r.name === 'play_move' && r.ok)
    .map((r) => {
      const result = r.result as { san?: string } | undefined;
      return result?.san ?? null;
    })
    .filter((san): san is string => san !== null);
  if (succeededMoves.length > 0) {
    lines.push(
      '',
      `IMPORTANT: ${succeededMoves.join(', ')} ${succeededMoves.length === 1 ? 'is' : 'are'} ALREADY ON THE BOARD. Do NOT call play_move again with ${succeededMoves.length === 1 ? 'that move' : 'those moves'} — it would either fail (the move is no longer legal from the new position) or play a different move with the same name (different piece). The board has advanced; your job now is to narrate WHAT YOU JUST DID and prompt the student's next move. Use NO more play_move calls this turn unless you genuinely want to play a NEW different move.`,
    );
  }
  lines.push(
    '',
    'Use these results to decide. Either call additional tools or give your final answer.',
  );
  return lines.join('\n');
}

/** Produce a one-line preview of a tool's result payload so the audit
 *  log surfaces what the tool actually did, not just whether it ok'd.
 *  Audit-driven (#20, #21): paste-back logs used to show
 *  `stockfish_eval ok` with no eval / best-move data, leaving "the
 *  brain made a wrong claim" reports without engine ground truth.
 *  Returns null when the result has no informative shape — in that
 *  case the audit summary stays at the bare ok/error verb. */
function previewToolResult(
  name: string,
  result: { ok: boolean; result?: unknown; error?: string },
): string | null {
  if (!result.ok) return null;
  const r = result.result as Record<string, unknown> | undefined;
  if (!r) return null;
  if (name === 'stockfish_eval' || name === 'stockfish_classify_move') {
    const best = typeof r.bestMove === 'string' ? r.bestMove : null;
    const ev = typeof r.evaluation === 'number' ? r.evaluation : null;
    const isMate = r.isMate === true;
    const mateIn = typeof r.mateIn === 'number' ? r.mateIn : null;
    const depth = typeof r.depth === 'number' ? r.depth : null;
    const parts: string[] = [];
    if (best) parts.push(`best=${best}`);
    if (isMate && mateIn !== null) parts.push(`mate=${mateIn}`);
    else if (ev !== null) parts.push(`eval=${ev > 0 ? '+' : ''}${(ev / 100).toFixed(2)}`);
    if (depth !== null) parts.push(`d${depth}`);
    return parts.length > 0 ? parts.join(' ') : null;
  }
  if (name === 'set_intended_opening') {
    const oname = typeof r.name === 'string' ? r.name : null;
    const color = typeof r.color === 'string' ? r.color : null;
    return oname && color ? `${color} ${oname}` : null;
  }
  if (name === 'set_board_position') {
    const fen = typeof r.fen === 'string' ? r.fen : null;
    return fen ? `fen=${fen.split(' ')[0]}…` : null;
  }
  if (name === 'play_move' || name === 'take_back_move') {
    const san = typeof r.san === 'string' ? r.san : null;
    return san ? `san=${san}` : null;
  }
  if (name === 'lichess_opening_lookup') {
    const eco = typeof r.eco === 'string' ? r.eco : null;
    const oname = typeof r.name === 'string' ? r.name : null;
    return oname || eco ? `${oname ?? '?'} (${eco ?? '?'})` : null;
  }
  return null;
}

/** Runtime grounding gates applied to EVERY coach answer in the spine.
 *  Thin wrapper over the shared `groundCoachReply` (services/
 *  coachAnswerGates) — the SAME gate set every bypass surface uses, so
 *  there is one implementation and no drift. See that module for the
 *  per-gate contract. */
function runAnswerGates(
  finalText: string,
  fen: string | null,
  tactics: TacticsLiveContext | null,
  surface: string,
  playerDataGrounded: boolean,
  evalCp: number | undefined,
  evalMateIn: number | undefined,
): string {
  return groundCoachReply(finalText, {
    fen,
    tactics,
    playerDataGrounded,
    evalCp,
    evalMateIn,
    source: `coachService:${surface}`,
  });
}

/** A PLAN / STRATEGY question — the answer names forward moves several
 *  plies ahead that the bare-SAN claim gate would otherwise flag as
 *  ungrounded and stock out (response-loop audit 2026-06-05). Detecting it
 *  here lets the grounding pipeline exempt the bare-SAN gate for the turn
 *  while keeping the stat / count / player / comparative guards in force. */
// ─────────────────────────────────────────────────────────────────────────
// THE QUESTION-INTENT THESAURUS (David 2026-06-14: "throw the thesaurus at
// this problem for ALL questions"). Each grounded-answer router below is built
// from an explicit LIST of phrasings instead of one dense regex, so a student
// gets routed to the right computed-fact answer no matter HOW they word it —
// "what are my weaknesses?" and "what's the weakest aspect of my game?" must
// land in the same place. To widen a router, add a phrasing to its array.
// Disambiguations between routers (e.g. position-assessment must NOT swallow
// progress/best-move) are preserved and covered by coachService.questionIntents.test.ts.
//
// `anyOf` joins alternatives into one case-insensitive regex; `\b` word
// boundaries are baked into each fragment as needed.
const anyOf = (alts: string[]): RegExp => new RegExp(alts.join('|'), 'i');

const PLAN_QUESTION_RE = anyOf([
  String.raw`\bplans?\b`,
  String.raw`\bstrateg(?:y|ies|ize|ic)\b`,
  String.raw`\bnext\s+(?:few|couple|two|three|several|2|3|\d+)\s+moves?\b`,
  String.raw`\bmain\s+ideas?\b`,
  String.raw`\bmy\s+ideas?\b`,
  String.raw`\bidea\s+here\b`,
  String.raw`\blong[-\s]?term\b`,
  String.raw`\bgame\s*plan\b`,
  String.raw`\bhow\s+(?:do\s+i|should\s+i|to)\s+(?:proceed|continue|play|approach|handle|develop|set\s+up)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the|my)\s+(?:plan|idea|strategy|approach|goal|aim)\b`,
  String.raw`\bwhat(?:'?s| is| am)?\s+i\s+(?:trying|aiming|looking)\s+to\s+(?:do|achieve)\b`,
  String.raw`\boutline\s+(?:a|my|the)?\s*(?:plan|strategy)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+my\s+(?:goal|objective|aim)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:my|the)\s+(?:setup|structure|formation|pawn\s+structure)\b`,
  String.raw`\bwhere\s+(?:do|should)\s+(?:my\s+)?(?:pieces?|knights?|bishops?|rooks?|queen|king)\s+(?:go|belong|head)\b`,
  String.raw`\bhow\s+do\s+i\s+(?:make\s+progress|build\s+up|improve\s+my\s+position|attack|defend|press|convert\s+my\s+edge)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:right|correct|best)\s+(?:plan|setup|approach|way\s+to\s+play)\b`,
  String.raw`\bwhat\s+am\s+i\s+(?:supposed|meant)\s+to\s+do\b`,
  String.raw`\blong[-\s]?(?:range|haul)\b`,
]);
export function isPlanQuestion(ask: string | undefined): boolean {
  return !!ask && PLAN_QUESTION_RE.test(ask);
}

/** A BEST-MOVE / SOUNDNESS question — "what's the best move here?", "is
 *  this sound?", "does White only have one good move?". Answering it
 *  HONESTLY means naming the engine's best move AND the short line that
 *  shows why (the opponent's reply + the follow-up). Those forward SANs
 *  aren't legal in the current position, so the bare-SAN claim gate flagged
 *  them, exhausted the retry budget, and served the cold can't-verify
 *  fallback — on a position the coach was literally holding a Stockfish eval
 *  for (David 2026-06-09, "No bueno").
 *  Detecting it here exempts JUST the bare-SAN gate for the turn (the same
 *  carve-out plan/move-narration questions already get); every fabrication
 *  guard — percentages, game counts, ratings, player attributions, "most
 *  popular" comparatives — stays fully in force, so G3 is not weakened. */
const BEST_MOVE_QUESTION_RE = anyOf([
  String.raw`\b(?:best|strongest|top|optimal|ideal|right|correct|winning|killer|critical)\s+(?:move|continuation|option|choice|try|play|reply|response|idea)\b`,
  String.raw`\bbest\b[\s\S]{0,12}\bto\s+play\b`,
  String.raw`\bonly\s+(?:\w+\s+){0,3}(?:good\s+)?moves?\b`,
  String.raw`\bone\s+(?:good\s+)?move\b`,
  String.raw`\bwhat\s+should\s+(?:i|white|black|we)\s+play\b`,
  String.raw`\bwhat\s+(?:do|would|can|must|should)\s+(?:i|we|you)\s+play(?:\s+here)?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+|white'?s?\s+|black'?s?\s+|my\s+)?best(?:\s+(?:move|here|option|play))?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:right|correct|winning|strongest)\s+(?:move|continuation)\b`,
  String.raw`\bhow\s+should\s+(?:i|we)\s+(?:continue|respond|recapture)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+move\b`,
  String.raw`\bis\s+(?:this|that|it|[A-Za-z0-9+#=-]{1,6})\s+(?:the\s+)?(?:best|sound|good|winning|correct|playable|right|strong|a\s+(?:good|sound|strong)\s+move)\b`,
  String.raw`\bshould\s+i\s+(?:play|go\s+for|take|capture|push|trade|castle)\b`,
  String.raw`\bcandidate\s+moves?\b`,
  String.raw`\bwhat\s+(?:do|should)\s+i\s+do\s+(?:here|now|in\s+this)\b`,
  String.raw`\bis\s+there\s+(?:a\s+)?better\s+(?:move|option|continuation)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:engine|computer)('?s)?\s+(?:move|pick|choice|line)\b`,
  String.raw`\btop\s+(?:choice|pick|move)\b`,
  String.raw`\bwhat\s+now\b`,
]);
export function isBestMoveQuestion(ask: string | undefined): boolean {
  return !!ask && BEST_MOVE_QUESTION_RE.test(ask);
}

/** A TACTICS / DANGER question — "is anything hanging?", "what's the threat?",
 *  "is there a fork / pin / mate here?", "am I in danger?", "is my queen safe?".
 *  The answer is `liveTacticsContext`'s ALREADY-computed descriptions (forks,
 *  hanging pieces, mate-in-one, top threat/opportunity) — so the grounding
 *  inversion (Phase 2) routes it through `assembleTacticsAnswer` → voiceFacts
 *  and the LLM voices the engine's facts, deciding nothing. */
const TACTICS_QUESTION_RE = anyOf([
  String.raw`\bhang(?:ing|s)?\b`,
  String.raw`\ben\s*prise\b`,
  String.raw`\bloose\s+piece`,
  String.raw`\b(?:any\s+)?threats?\b`,
  String.raw`\b(?:a\s+)?forks?\b`,
  String.raw`\bpinn?(?:ed|ing)?\b`,
  String.raw`\bskewers?\b`,
  String.raw`\bdiscover(?:ed|y|ies)\b`,
  String.raw`\bdouble\s+attack\b`,
  String.raw`\bin\s+danger\b`,
  String.raw`\bunder\s+attack\b`,
  String.raw`\b(?:is\s+(?:it|there|my|the)\b[\s\S]{0,40}\b(?:safe|hanging|attacked|defended|loose|trapped))`,
  String.raw`\bam\s+i\s+safe\b`,
  String.raw`\bsafe\s+(?:here|now)\b`,
  String.raw`\bcan\s+(?:i|it|he|she|they|white|black)\s+be\s+(?:punished|taken|captured|trapped|exploited)\b`,
  String.raw`\b(?:is\s+there\s+(?:a\s+)?)?mate(?:\s+(?:here|in\s+\w+|threat))?\b`,
  String.raw`\btactics?\b`,
  String.raw`\bcombination\b`,
  String.raw`\b(?:any\s+)?(?:shot|sac(?:rifice)?|trick|tactic)\s+(?:here|available|on|in\s+this)?\b`,
  String.raw`\bcan\s+i\s+(?:win|grab|take|snag|pick\s+up)\s+(?:material|a\s+piece|a\s+pawn|the)\b`,
  String.raw`\bwin\s+(?:material|a\s+piece|a\s+pawn)\b`,
  String.raw`\bundefended\b`,
  String.raw`\boverload(?:ed|ing)?\b`,
  String.raw`\bback[-\s]?rank\b`,
  String.raw`\bcan\s+i\s+sac(?:rifice)?\b`,
  String.raw`\bis\s+(?:my\s+|the\s+|his\s+|her\s+)?\w+\s+(?:defended|protected|loose|hanging|trapped|en\s*prise)\b`,
  String.raw`\bweak\s+(?:king|back\s*rank|squares?)\b`,
  String.raw`\bdeflect(?:ion|ing)?\b`,
  String.raw`\bremoving\s+the\s+defender\b`,
]);
export function isTacticsQuestion(ask: string | undefined): boolean {
  return !!ask && TACTICS_QUESTION_RE.test(ask);
}

/** A POSITION-ASSESSMENT question — "who's winning?", "how do I stand here?",
 *  "what's the eval?", "is this good/bad for me?", "what's going on in this
 *  position?". Phase 1 (the "who's winning / eval" row): answered from Stockfish
 *  eval + the top live-tactics fact via `assemblePositionAssessment` → voiceFacts.
 *  Deliberately position-scoped phrasings ONLY — it must NOT swallow "how am I
 *  improving" (that's `isProgressQuestion`, about the student over time) or
 *  "what should I play" (`isBestMoveQuestion`). */
const POSITION_ASSESSMENT_RE = anyOf([
  String.raw`\bwho(?:'?s| is| has)\s+(?:winning|better|worse|ahead|on\s+top|the\s+(?:advantage|edge|initiative|upper\s+hand))\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?eval(?:uation)?\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:score|assessment|verdict)\b`,
  String.raw`\b(?:am\s+i|are\s+we)\s+(?:better|worse|winning|losing|ahead|behind|equal|fine|ok(?:ay)?|in\s+trouble|in\s+good\s+shape)\b`,
  String.raw`\bis\s+(?:this|that|it|the|my)\s+(?:position\s+)?(?:good|bad|better|worse|winning|won|losing|lost|equal|level|balanced|fine|ok(?:ay)?|drawish|close|unclear|dangerous)\b`,
  String.raw`\bhow\s+(?:do\s+i|am\s+i)\s+(?:stand|standing|doing\s+here)\b`,
  String.raw`\bwhere\s+do\s+i\s+stand\b`,
  String.raw`\bhow(?:'?s| is)?\s+(?:my|the)\s+position\b`,
  String.raw`\bhow\s+(?:good|bad)\s+is\s+(?:my|this|the)\s+position\b`,
  String.raw`\bassess(?:\s+(?:this|the\s+position))?\b`,
  String.raw`\bevaluate\s+(?:this|the\s+position)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+going\s+on\s+(?:here|in\s+this)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:situation|status)\b`,
  String.raw`\bwho\s+stands\s+better\b`,
  String.raw`\bhow\s+(?:bad|good)\s+is\s+(?:it|this)\b`,
  String.raw`\bam\s+i\s+(?:up|down)\s+(?:material|a\s+pawn|a\s+piece|the\s+exchange)\b`,
  String.raw`\bwho\s+(?:has|holds)\s+(?:the\s+)?(?:edge|advantage|initiative|better\s+position)\b`,
  String.raw`\bis\s+(?:it|this)\s+(?:lost|won|winning|losing|equal|level|holdable)\b`,
  String.raw`\bhow\s+much\s+(?:better|worse|ahead|behind)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+(?:engine\s+)?(?:eval|number|advantage)\b`,
]);
export function isPositionAssessmentQuestion(ask: string | undefined): boolean {
  return !!ask && POSITION_ASSESSMENT_RE.test(ask);
}

/** A "HOW DO MASTERS PLAY THIS?" / "most popular move?" question — Phase 4.
 *  The master-play lookup has the real top moves + frequencies; the grounding
 *  inversion voices them via `assembleMasterPlayAnswer` so the LLM never
 *  fabricates a frequency. Distinct from `isBestMoveQuestion` (the ENGINE's
 *  best move) — this is about master PRACTICE / popularity. */
const MASTER_PLAY_QUESTION_RE = anyOf([
  String.raw`\bwhat\s+do\s+(?:the\s+)?(?:masters?|grandmasters?|gms?|pros?|professionals?|top\s+players?|strong\s+players?|titled\s+players?|they)\s+(?:play|do|prefer|choose|continue|go\s+for|opt\s+for|favou?r)\b`,
  String.raw`\bhow\s+do\s+(?:the\s+)?(?:masters?|grandmasters?|gms?|pros?|top\s+players?)\s+(?:play|continue|handle|treat|approach|meet)\b`,
  String.raw`\bmost\s+(?:popular|common|played|frequent|usual|tested)\s+(?:move|continuation|line|choice|reply|response)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:main|book|theoretical|critical|principal|standard|usual|normal)\s+(?:line|move|continuation|reply)\b`,
  String.raw`\bwhat\s+do(?:es)?\s+(?:the\s+)?(?:books?|database|theory|stats?|data|engine\s+stats?)\s+say\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?theory(?:\s+here|\s+say)?\b`,
  String.raw`\bmain\s*line\b`,
  String.raw`\bbook\s+move\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:usually|typically|normally|commonly)\s+played\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:played|standard|normal)\s+(?:here|in\s+this)\b`,
  String.raw`\bhow\s+is\s+(?:this|it)\s+(?:usually|normally|typically)\s+(?:played|met|handled|answered)\b`,
  String.raw`\bwhat\s+do\s+the\s+(?:best|elite|top)\s+players?\b`,
  String.raw`\bbest\s+by\s+test\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:engine|database)\s+(?:top|favou?rite)\b`,
]);
export function isMasterPlayQuestion(ask: string | undefined): boolean {
  return !!ask && MASTER_PLAY_QUESTION_RE.test(ask);
}

/** An ENDGAME question — "can I win this?", "is this a draw?", "how do I hold
 *  this ending?". Phase 5: the answer is the SYZYGY TABLEBASE (literal truth for
 *  ≤7-piece endings), voiced via `assembleEndgameAnswer`. The interception gates
 *  on `lookupTablebase` returning a hit (≤7 pieces), so this detector can be
 *  broad on the endgame-verdict shape; a non-endgame position falls through to
 *  the engine-eval path. */
const ENDGAME_QUESTION_RE = anyOf([
  String.raw`\bend(?:game|ing)s?\b`,
  String.raw`\bcan\s+i\s+(?:win|hold|draw|save|defend|convert|promote|queen)\b`,
  String.raw`\bhow\s+(?:do\s+i|to)\s+(?:win|hold|draw|convert|defend|promote|queen)\s+(?:this|it|the)?\b`,
  String.raw`\bis\s+this\s+(?:a\s+)?(?:theoretical(?:ly)?\s+)?(?:win|won|winning|draw|drawn|lost|losing|holdable|defensible)\b`,
  String.raw`\bis\s+(?:this|it)\s+(?:winning|won|drawn|drawish|lost)(?:\s+for\s+me)?\b`,
  String.raw`\b(?:theoretical(?:ly)?|tablebase)\b`,
  String.raw`\bcan\s+(?:this|it)\s+be\s+(?:won|held|drawn|saved)\b`,
  String.raw`\bis\s+(?:this|it)\s+winnable\b`,
  String.raw`\bcan\s+i\s+save\s+(?:this|it|the\s+game)\b`,
  String.raw`\b(?:rook|pawn|king|queen|bishop|knight|minor[-\s]?piece)\s+(?:and\s+\w+\s+)?end(?:game|ing)\b`,
  String.raw`\bopposite[-\s]?colou?red?\s+bishops?\b`,
  String.raw`\bhow\s+do\s+i\s+(?:convert|finish|win)\s+(?:from\s+here|this\s+(?:ending|endgame))\b`,
  String.raw`\bking\s+and\s+pawn\b`,
]);
export function isEndgameQuestion(ask: string | undefined): boolean {
  return !!ask && ENDGAME_QUESTION_RE.test(ask);
}

/** A PRO-GAME question — "how does Naroditsky play this?", "show me his games
 *  here", "what does the pro do in this line?". Phase 4: the answer is the
 *  player's REAL game corpus (pro-game-references → LivePlayerGamesContext),
 *  voiced via `assemblePlayerGamesAnswer`. The interception gates on that
 *  context being PRESENT (only loaded on pro-opening / opening-signal turns),
 *  so this detector can be broad on the "how does X play / show me X's games"
 *  shape without name-matching every pro. Distinct from `isMasterPlayQuestion`
 *  (aggregate master practice) — this is ONE player's actual games. */
const PLAYER_GAMES_QUESTION_RE = anyOf([
  String.raw`\bhow\s+does\s+(?:he|she|they|\w+)\s+(?:play|handle|treat|approach|continue|meet)\b`,
  String.raw`\b(?:show|see|find|pull\s+up|got)\s+(?:me\s+)?(?:his|her|their|\w+'?s)\s+games?\b`,
  String.raw`\bwhat\s+does\s+(?:he|she|they|the\s+pro|\w+)\s+(?:do|play|prefer|choose)\s+(?:here|in\s+this|in\s+the)\b`,
  String.raw`\bwhat\s+(?:did|has)\s+(?:he|she|they|\w+)\s+(?:play(?:ed)?|do(?:ne)?)\b`,
  String.raw`\bhas\s+(?:he|she|they|\w+)\s+(?:ever\s+)?played\s+(?:this|here)\b`,
  String.raw`\b\w+'s\s+(?:real\s+)?games?\b`,
  String.raw`\b(?:his|her|their)\s+(?:real\s+|actual\s+|own\s+)?games?\b`,
  String.raw`\bdid\s+(?:he|she|they|\w+)\s+(?:play|face|win\s+with)\b`,
  String.raw`\b(?:his|her|their)\s+(?:repertoire|lines?|games\s+here)\b`,
  String.raw`\bpull\s+(?:up\s+)?(?:his|her|their|\w+'?s)\b`,
  String.raw`\bhow\s+did\s+(?:he|she|they|\w+)\s+(?:win|handle|beat)\b`,
]);
export function isPlayerGamesQuestion(ask: string | undefined): boolean {
  return !!ask && PLAYER_GAMES_QUESTION_RE.test(ask);
}

/** A CONCEPT / DEFINITION question — "what's a fork?", "explain zwischenzug",
 *  "what does zugzwang mean?". Phase 5: the answer is the injected BOOK corpus
 *  (chess-concepts.json), voiced via `assembleConceptAnswer` → voiceFacts —
 *  never the LLM's training memory. This matches only the DEFINITIONAL shape
 *  and excludes position-specific cues ("is there a fork HERE", "am I in
 *  danger") so it doesn't collide with `isTacticsQuestion`; the interception
 *  then confirms a real concept token via `detectConceptsInText`. */
const CONCEPT_QUESTION_RE = anyOf([
  String.raw`\bwhat(?:'?s| is| are| does)\s+(?:a|an|the\s+)?[a-z]+`,
  String.raw`\bwhat\s+do\s+you\s+mean\s+by\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:meaning|definition)\s+of\b`,
  String.raw`\bwhat(?:'?s| is)?\s+the\s+difference\s+between\b`,
  String.raw`\bexplain\b`,
  String.raw`\bdefine\b`,
  String.raw`\b(?:tell|teach)\s+me\s+about\b`,
  String.raw`\bdescribe\b`,
  String.raw`\bwhat\s+does\s+\w+\s+mean\b`,
  String.raw`\bhow\s+does\s+(?:a|an|the)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?(?:idea|point|purpose|concept)\s+(?:behind|of)\b`,
  String.raw`\bwhy\s+(?:is|are)\s+(?:a\s+|an\s+|the\s+)?(?:[a-z]+\s+){1,3}(?:good|important|strong|useful|bad|weak|better|worse)\b`,
  String.raw`\bwhat\s+(?:are\s+)?(?:the\s+)?principles?\b`,
]);
const CONCEPT_POSITIONAL_CUE_RE =
  /\b(?:here|this\s+position|on\s+the\s+board|right\s+now|in\s+this|my\s+(?:position|move)|best\s+move|should\s+i\s+play)\b/i;
export function isConceptQuestion(ask: string | undefined): boolean {
  return !!ask && CONCEPT_QUESTION_RE.test(ask) && !CONCEPT_POSITIONAL_CUE_RE.test(ask);
}

/** A STUDENT-PROGRESS question — "am I improving?", "what should I work on?",
 *  "what are my weaknesses?", "how am I doing?", "my bad habits". The answer is
 *  the student's OWN computed history (their persisted bad-habit profile), so
 *  the grounding inversion (Phase 6) routes it through `assembleProgressAnswer`
 *  → voiceFacts. The LLM voices the student's real data; it invents no weakness. */
// Reusable fragments for the progress/weakness router (the most-worded ask).
const IMPROVE_VERBS = String.raw`(?:work\s+on|improve(?:\s+on)?|practi[sc]e|focus\s+on|get\s+better(?:\s+at)?|fix|address|sharpen|study|brush\s+up\s+on|shore\s+up)`;
const WEAKNESS_NOUNS = String.raw`(?:weakness(?:es)?|weak\s+(?:spots?|points?|areas?|aspects?|parts?|sides?)|weakest\s+(?:spot|point|area|aspect|part|skill|move|link|element|side)|flaws?|shortcomings?|blind\s+spots?|achilles\s+heel|leaks?|holes?|gaps?|sticking\s+points?|bad\s+habits?|recurring\s+(?:mistakes?|errors?)|common\s+(?:mistakes?|errors?))`;
const PROGRESS_QUESTION_RE = anyOf([
  String.raw`\bam\s+i\s+(?:improving|getting\s+(?:better|worse)|progressing|developing|growing|any\s+good|good\s+enough|getting\s+anywhere)\b`,
  String.raw`\bhow\s+am\s+i\s+(?:doing|progressing|playing|improving|developing|getting\s+on)\b`,
  String.raw`\bhow(?:'?s| is| has)\s+my\s+(?:game|play|chess|progress|improvement)\b`,
  String.raw`\bwhat\s+(?:should|do|can|must|ought)\s+i\s+(?:(?:need|want|have|like|try)\s+to\s+)?` + IMPROVE_VERBS + String.raw`\b`,
  String.raw`\b(?:need|want|have|trying|gotta|got\s+to)\s+to?\s*` + IMPROVE_VERBS + String.raw`\b`,
  String.raw`\bwhat\s+(?:are|is|to)\s+(?:my\s+)?(?:work\s+on|improve)\b`,
  String.raw`\b(?:my|the)\s+(?:biggest\s+|main\s+|worst\s+|greatest\s+|number\s+one\s+)?` + WEAKNESS_NOUNS + String.raw`\b`,
  String.raw`\b` + WEAKNESS_NOUNS + String.raw`\s+(?:in|of)\s+my\s+(?:game|play|chess)\b`,
  String.raw`\bweakest\s+(?:aspect|part|area|point|spot|skill|element|side|link|piece)\s+of\s+my\s+(?:game|play|chess)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+(?:the\s+)?weakest\s+(?:aspect|part|area|point|spot|side)\b`,
  String.raw`\b(?:my|the)\s+(?:progress|improvement|strengths?|strong\s+(?:points?|suits?|areas?))\b`,
  String.raw`\bwhere\s+(?:am\s+i|do\s+i)\s+(?:keep\s+)?(?:weak|struggl(?:e|ing)|los(?:e|ing)|need\s+work|go(?:ing)?\s+wrong|mess(?:ing)?\s+up|blunder(?:ing)?|fall(?:ing)?\s+short|drop(?:ping)?\s+points?)\b`,
  String.raw`\bwhat(?:'?s| is)?\s+holding\s+me\s+back\b`,
  String.raw`\bwhat\s+(?:trips|throws|holds)\s+me\s+(?:up|back)\b`,
  String.raw`\bwhat\s+(?:am\s+i|do\s+i)\s+(?:bad|worst|good|best|strong|weak)\s+at\b`,
  String.raw`\bwhat\s+do\s+i\s+(?:do|get|keep\s+(?:doing|getting))\s+wrong\b`,
  String.raw`\bbiggest\s+(?:weakness|mistake|problem|issue|flaw|leak)\b`,
  String.raw`\bwhat\s+(?:keeps?\s+)?(?:costing|losing)\s+me\s+(?:games|points|rating)\b`,
]);
export function isProgressQuestion(ask: string | undefined): boolean {
  return !!ask && PROGRESS_QUESTION_RE.test(ask);
}

async function ask(input: CoachAskInput, options: CoachServiceOptions = {}): Promise<CoachAnswer> {
  // WO-COACH-UNIFY-01 visibility: include task + maxTokens in the
  // ask-received audit so paste-back audit logs show which surface
  // picked which model. Surfaces migrated onto the spine are
  // distinguishable from legacy /coach/play LLM calls (which fire
  // 'coach-llm-model-selected' instead) by the presence of these
  // fields.
  void logAppAudit({
    kind: 'coach-brain-ask-received',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `surface=${input.surface} task=${options.task ?? 'chat_response'} maxTokens=${options.maxTokens ?? 'default'} ask="${input.ask.slice(0, 60)}"`,
    details: JSON.stringify({
      surface: input.surface,
      askLen: input.ask.length,
      task: options.task ?? 'chat_response',
      maxTokens: options.maxTokens ?? null,
      providerOverride: options.providerOverride?.name ?? null,
    }),
  });

  // WO-FOUNDATION-02 trace harness — fires at the start of every
  // ask, mirroring coach-brain-ask-received but carrying the
  // traceId so the audit pipeline can be reconstructed.

  // WO-FOUNDATION-02: Layer 1 routing moved upstream to
  // GameChatPanel.handleSend. Most user messages never reached this
  // entry point — pre-LLM intercepts at the surface short-circuit
  // first. The router now runs at the surface boundary with the
  // user's raw text. This entry point only sees messages that the
  // surface chose to forward (real LLM round-trips), so router
  // bypass-LLM logic at this layer was dead code.

  // Auto-load curated opening-book annotations whenever the surface
  // didn't pre-populate annotationContext but has either a
  // lichessSnapshot opening name OR a move history we can detect an
  // opening from. Brings the 1893 curated annotation files under
  // `src/data/annotations/` into the brain's [Live state] block as
  // authoritative grounding for every surface that touches a
  // recognizable opening (teach, play, review, analyse, …). Surfaces
  // that already loaded annotations (e.g. via walkthrough) can
  // short-circuit by setting `liveState.annotationContext` themselves
  // — we don't overwrite. Silent on lookup miss.
  const hasOpeningSignal =
    !!input.liveState.lichessSnapshot?.name ||
    (input.liveState.moveHistory?.length ?? 0) > 0;
  if (!input.liveState.annotationContext && hasOpeningSignal) {
    try {
      const ctx = await loadAnnotationContextForLive({
        openingName: input.liveState.lichessSnapshot?.name,
        moveHistory: input.liveState.moveHistory ?? [],
      });
      if (ctx) {
        input = {
          ...input,
          liveState: { ...input.liveState, annotationContext: ctx },
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.annotationContext',
          summary: `loaded annotation ctx: ${ctx.openingName} (id=${ctx.openingId}, ${ctx.moves.length}/${ctx.totalAnnotated} plies windowed at ply ${ctx.currentPly})`,
        });
      } else {
        // Audit no-match for observability — the loader was reached
        // but no annotation file matched the resolved opening. Helps
        // identify openings that need authored annotations.
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.annotationContext',
          summary: `no-match: openingName="${input.liveState.lichessSnapshot?.name ?? '?'}" histLen=${input.liveState.moveHistory?.length ?? 0}`,
        });
      }
    } catch (err) {
      // Annotation lookup failures must NEVER block the brain call —
      // the surface has the existing FEN/eval/tactics grounding and
      // can answer without book context.
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.annotationContext',
        summary: `book ctx load failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  // Middlegame plan from middlegame-plans.json (180 curated plans).
  // Gates on opening recognition (via lichessSnapshot.name OR
  // moveHistory-based detection) AND a matching plan registered for
  // that opening. Quiet when no plan exists. Carries title +
  // overview + strategic themes + pawn breaks + maneuvers into the
  // envelope so "what's the plan here?" gets the curated answer.
  if (!input.liveState.middlegamePlan && hasOpeningSignal) {
    try {
      const plan = loadMiddlegamePlanForLive({
        openingName: input.liveState.lichessSnapshot?.name,
        moveHistory: input.liveState.moveHistory ?? [],
      });
      if (plan) {
        input = {
          ...input,
          liveState: { ...input.liveState, middlegamePlan: plan },
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.middlegamePlan',
          summary: `loaded plan "${plan.title}" (id=${plan.id}, themes=${plan.strategicThemes.length}, breaks=${plan.pawnBreaks.length}, maneuvers=${plan.pieceManeuvers.length}) for opening=${plan.openingId}`,
        });
      } else {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.middlegamePlan',
          summary: `no-match: openingName="${input.liveState.lichessSnapshot?.name ?? '?'}" histLen=${input.liveState.moveHistory?.length ?? 0}`,
        });
      }
    } catch (err) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.middlegamePlan',
        summary: `plan load failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  // Model games from model-games.json (~121 curated pro/master
  // games keyed by opening). Up to 2 highest-rated examples shipped
  // per call, with overview + early-PGN + critical moments. The
  // brain can cite "Morphy vs Duke of Brunswick 1858" or "Carlsen
  // vs Anand 2014" by name+year instead of fabricating game refs.
  if (!input.liveState.modelGames && hasOpeningSignal) {
    try {
      const games = loadModelGamesForLive({
        openingName: input.liveState.lichessSnapshot?.name,
        moveHistory: input.liveState.moveHistory ?? [],
      });
      if (games) {
        input = {
          ...input,
          liveState: { ...input.liveState, modelGames: games },
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.modelGames',
          summary: `loaded ${games.games.length}/${games.totalAvailable} model game(s) for ${games.openingName} (id=${games.openingId})`,
        });
      } else {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.modelGames',
          summary: `no-match: openingName="${input.liveState.lichessSnapshot?.name ?? '?'}" histLen=${input.liveState.moveHistory?.length ?? 0}`,
        });
      }
    } catch (err) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.modelGames',
        summary: `model games load failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  // Pro player game references (the breadth layer of REAL pro games,
  // src/data/pro-game-references.json). Scoped to the pro opening when
  // the surface passes proOpeningId; otherwise matched by base opening
  // id across every pro who plays the line. The brain walks + cites a
  // pro's actual games during teaching + walkthroughs instead of the
  // ~2 hand-narrated model games alone. (David 2026-06-01.)
  if (!input.liveState.playerGames && (hasOpeningSignal || input.liveState.proOpeningId)) {
    try {
      // Prime the reference cache (fetched from public/data, not bundled)
      // so the synchronous loadPlayerGamesForLive read below sees it.
      await loadProGameReferenceData();
      const games = loadPlayerGamesForLive({
        openingName: input.liveState.lichessSnapshot?.name,
        moveHistory: input.liveState.moveHistory ?? [],
        proOpeningId: input.liveState.proOpeningId ?? null,
      });
      if (games) {
        input = {
          ...input,
          liveState: { ...input.liveState, playerGames: games },
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.playerGames',
          summary: `loaded ${games.games.length}/${games.totalAvailable} player game ref(s) for ${games.openingName}${games.playerId ? ` (player=${games.playerId})` : ''}`,
        });
      } else {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.playerGames',
          summary: `no-match: openingName="${input.liveState.lichessSnapshot?.name ?? '?'}" proOpeningId="${input.liveState.proOpeningId ?? '?'}"`,
        });
      }
    } catch (err) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.playerGames',
        summary: `player games load failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  // Position TRAP SCAN — the runtime trap-mining tool (the SAME
  // `scanPositionForTrap` /coach/play + /coach/teach use), CENTRALIZED here so
  // EVERY play/chat surface that routes through coachService.ask gets identical
  // trap detection with NO per-surface code (David 2026-06-16: "all playing
  // surfaces should now be identically coded"). Gated on a trap/tactics-shaped
  // question + a live FEN so a normal ask never pays the per-candidate
  // cloud-eval cost. G0: code decides the trap; the LLM only voices it
  // (the envelope renders it under "Position trap scan"). Surfaces that already
  // set trapSignal (none today) aren't overwritten. Off-book / no explorer
  // coverage → null → correctly silent (G3).
  const asksAboutTrap =
    /\b(trap|traps|tactic|tactics|blunder|fall(?:ing)?\s+into|caught|punish|refut|trick|tricks)\b/i.test(
      input.ask,
    );
  if (!input.liveState.trapSignal && input.liveState.fen && asksAboutTrap) {
    const fen = input.liveState.fen;
    try {
      const mover: 'w' | 'b' = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      let engineBestSan: string | undefined;
      const bestUci = input.liveState.engineBestMoveUci;
      if (bestUci && bestUci.length >= 4) {
        try {
          const c = new Chess(fen);
          const mv = c.move({
            from: bestUci.slice(0, 2),
            to: bestUci.slice(2, 4),
            promotion: bestUci.slice(4, 5) || undefined,
          });
          engineBestSan = mv?.san;
        } catch {
          /* refutation hint is optional */
        }
      }
      let legalSan: string[] | undefined;
      try {
        legalSan = new Chess(fen).moves();
      } catch {
        /* detector skips legality filtering when absent */
      }
      const trap = await scanPositionForTrap({ fen, mover, engineBestSan, legalSan });
      if (trap) {
        input = {
          ...input,
          liveState: { ...input.liveState, trapSignal: trap },
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.trapScan',
          summary: `trap: ${trap.trapMove} (${trap.gamesPlayed}g ${trap.evalCpForMover}cp ${trap.severity}) on ${input.liveState.surface}`,
        });
      } else {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.trapScan',
          summary: `no trap at fen (scan ran, none qualified) on ${input.liveState.surface}`,
        });
      }
    } catch (err) {
      // Trap scan failures must NEVER block the brain call — the surface
      // still has FEN/eval/tactics grounding and answers without it.
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.trapScan',
        summary: `trap scan failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  // Book grounding from chess-concepts.json (Capablanca/Lasker/etc).
  // Same shape as annotation context — pre-loaded grounding into the
  // envelope, gated on something to match against. Uses the user's
  // ask text PLUS the opening name (when available) to drive concept
  // detection and opening-passage lookup. Skipped silently when no
  // concept matched. Independent of annotationContext: a position
  // can have either, both, or neither depending on what corpus
  // covers it.
  if (!input.liveState.bookGrounding) {
    try {
      const grounding = loadBookGroundingForLive({
        askText: input.ask,
        openingName: input.liveState.lichessSnapshot?.name ?? null,
      });
      if (grounding) {
        input = {
          ...input,
          liveState: { ...input.liveState, bookGrounding: grounding },
        };
        void logAppAudit({
          kind: 'book-grounding-injected',
          category: 'subsystem',
          source: 'coachService.ask.bookGrounding',
          summary: `loaded ${grounding.sourceCount} classical passage(s) (${grounding.block.length} chars) for ask="${input.ask.slice(0, 60)}"`,
        });
      } else {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'coachService.ask.bookGrounding',
          summary: `no-match: askLen=${input.ask.length} openingName="${input.liveState.lichessSnapshot?.name ?? '?'}"`,
        });
      }
    } catch (err) {
      // Book lookup failures must NEVER block the call. Existing
      // grounding (annotations, lichess, tactics) carries the brain.
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'coachService.ask.bookGrounding',
        summary: `book grounding load failed: ${(err as Error)?.message?.slice(0, 120) ?? 'unknown'}`,
      });
    }
  }

  const envelope = assembleEnvelope({
    identity: options.identity,
    personality: options.personality,
    profanity: options.profanity,
    mockery: options.mockery,
    flirt: options.flirt,
    verbosity: options.verbosity,
    systemPromptAddition: options.systemPromptAddition,
    suppressSurfaceMode: options.suppressSurfaceMode,
    suppressToolbelt: options.suppressToolbelt,
    toolbelt: getToolDefinitions({ exclude: options.excludeTools }),
    input,
  });

  void logAppAudit({
    kind: 'coach-brain-envelope-assembled',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `assembled (${envelope.toolbelt.length} tools, ${envelope.appMap.length} routes)`,
    details: JSON.stringify({
      toolbeltSize: envelope.toolbelt.length,
      appMapSize: envelope.appMap.length,
      hasIntendedOpening: envelope.memory.intendedOpening !== null,
      hintRequestCount: envelope.memory.hintRequests.length,
      conversationHistorySize: envelope.memory.conversationHistory.length,
    }),
  });

  // WO-FOUNDATION-02 trace harness — list the tool names the LLM
  // sees in the toolbelt so we can verify play_move / take_back_move
  // / reset_board / set_board_position are present.

  const providerName = options.provider ?? resolveProviderName();
  const provider = options.providerOverride ?? pickProvider(providerName);

  const ctx: ToolExecutionContext = {
    onPlayMove: options.onPlayMove,
    onTakeBackMove: options.onTakeBackMove,
    onSetBoardPosition: options.onSetBoardPosition,
    onResetBoard: options.onResetBoard,
    onNavigate: options.onNavigate,
    onQuizUserForMove: options.onQuizUserForMove,
    onStartWalkthroughForOpening: options.onStartWalkthroughForOpening,
    liveFen: input.liveState.fen,
    traceId: options.traceId,
  };

  // WO-FOUNDATION-02 diagnostic: log the typeof every callback at
  // ctx-build time so we can verify the surface plumbing reached the
  // spine. If onPlayMove is `undefined` here, the surface didn't
  // pass it; if it's `function`, the chain up to here is intact.
   
  console.log('[coachService.ask] ctx-built:', {
    onPlayMove: typeof ctx.onPlayMove,
    onTakeBackMove: typeof ctx.onTakeBackMove,
    onResetBoard: typeof ctx.onResetBoard,
    onSetBoardPosition: typeof ctx.onSetBoardPosition,
    onNavigate: typeof ctx.onNavigate,
  });
  void logAppAudit({
    kind: 'coach-brain-tool-parse-result',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `ctx-built: onPlayMove=${typeof ctx.onPlayMove} onTakeBackMove=${typeof ctx.onTakeBackMove} onResetBoard=${typeof ctx.onResetBoard} onSetBoardPosition=${typeof ctx.onSetBoardPosition} onNavigate=${typeof ctx.onNavigate}`,
  });

  const dispatchedIds: string[] = [];
  const dispatchedToolNames: string[] = [];
  // G3 fabrication backstop: did a player-data tool actually return
  // moves/games this turn? If the brain attempted one, got nothing, yet
  // still cites percentages, those are fabricated (see finalText guard).
  let playerDataGrounded = false;
  // Fail-loudly: data tools that FAILED this turn (name → error). Surfaced to
  // the student after the final text so a down data source is never hidden
  // behind an invented answer (David 2026-06-15).
  const failedDataTools = new Map<string, string>();
  // SANs from the player's REAL games (pre-loaded block + player-tool
  // results), fed into the grounding `gameSans` so the claim validator
  // accepts player-grounded moves instead of nuking the lesson (#4).
  const playerSans = new Set<string>();
  // Player NAMES grounded this turn, fed into grounding.groundedPlayers so
  // the entity validator accepts the pro the lesson is about (#entity fix).
  const playerNames = new Set<string>();
  // The board FEN the FINAL prose describes — starts at the live FEN and
  // advances to the result of any board-changing tool this turn
  // (set_board_position / play_move / reset_board). The board-claim gate
  // (below) validates the answer's piece-on-square / pin claims against
  // THIS fen so "the knight on a3" can't be spoken when a3 is empty.
  let boardFenForClaims = input.liveState.fen ?? null;
  // Cap multi-turn tool loops so a misbehaving brain can't loop forever.
  const maxRoundTrips = Math.max(1, options.maxToolRoundTrips ?? 1);

  let currentEnvelope: AssembledEnvelope = envelope;
  const useStreaming = !!options.onChunk && typeof provider.callStreaming === 'function';
  let lastResponse: ProviderResponse = { text: '', toolCalls: [] };
  // Hoisted so the post-loop collapse-retry can re-call the provider with
  // the same grounding/task/maxTokens (see the collapse guard below).
  let lastProviderCallOptions: Parameters<typeof provider.call>[1];

  for (let trip = 1; trip <= maxRoundTrips; trip++) {
    // Refresh liveFen between trips ONLY (trip > 1). Trip 1 uses the
    // surface-supplied `input.liveState.fen` already wired into
    // ctx.liveFen above — that value carries the surface's authoritative
    // FEN at ask time, including any explicit fenOverride
    // handleStudentMove passed for the post-board-move case. Calling
    // getLiveFen on trip 1 would clobber the correct override with a
    // stale ref value because React hasn't re-rendered yet at the
    // moment coachService.ask runs synchronously inside the same
    // event-handler tick (production audit, build 5df4252: brain saw
    // post-e4 FEN at envelope assembly but starting-position FEN at
    // playMoveTool validation, rejecting "e5" as illegal for white).
    // From trip 2 on, the surface has long since re-rendered AND the
    // brain itself may have played a move via play_move, so the latest
    // gameRef value is the truth and the refresh is what keeps
    // chess.js validation in sync with the live board.
    if (trip > 1 && options.getLiveFen) {
      const fresh = options.getLiveFen();
      if (fresh) ctx.liveFen = fresh;
    }
    void logAppAudit({
      kind: 'coach-brain-provider-called',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `surface=${input.surface} provider=${provider.name} task=${options.task ?? 'chat_response'} streaming=${useStreaming} trip=${trip}/${maxRoundTrips}`,
      details: JSON.stringify({
        surface: input.surface,
        provider: provider.name,
        task: options.task ?? 'chat_response',
        maxTokens: options.maxTokens ?? null,
        streaming: useStreaming,
        trip,
        maxRoundTrips,
      }),
    });

    // WO-COACH-MASTER-INTEGRATION — auto-build grounding when the
    // surface didn't pass one explicitly. Every coach surface that
    // hands the spine a `liveState.fen` qualifies; the intent detector
    // inside `getCoachChatResponse` decides whether to actually engage
    // the pipeline based on the user's last message. Kid surfaces use
    // `getKidLlmResponse` directly (not coachService.ask), so this
    // path is coach-lane-only by construction.
    // Fold the player's real-game SANs (pre-loaded block + accumulated
    // player-tool results from prior trips) into gameSans so the claim
    // validator treats them as grounded — the chess.com-pro lesson fix (#4).
    for (const g of input.liveState.playerGames?.games ?? []) {
      const pre = (g as { pgnPrefix?: string }).pgnPrefix;
      if (pre) for (const t of pre.split(/\s+/)) if (t) playerSans.add(t.replace(/^\d+\.+/, ''));
      const nm = (g as { player?: string }).player;
      if (nm) playerNames.add(nm);
    }
    const mergedGameSans =
      playerSans.size > 0
        ? [...(input.liveState.gameSans ?? []), ...playerSans]
        : input.liveState.gameSans;
    const groundedPlayers = playerNames.size > 0 ? [...playerNames] : undefined;
    // Progress ("am I improving?") and concept ("what's a fork?") questions are
    // answered from the student's history / the book corpus — NO board needed —
    // so engage grounding even with no FEN. Other grounded intents need a live
    // position.
    const progressQuestion = isProgressQuestion(input.ask);
    const conceptQuestionEngage = isConceptQuestion(input.ask);
    const autoGrounding =
      options.grounding ??
      (input.liveState.fen || progressQuestion || conceptQuestionEngage
        ? {
            currentFen: input.liveState.fen,
            // DB-grounding: thread the move history through so the
            // claim validator can consult openings-lichess.json as a
            // second source. Without this, the validator rejected
            // SANs that are canon in the current opening's named
            // sub-variations but not in the live Lichess explorer's
            // top-N for the exact FEN (the Steinitz Gambit failure
            // mode caught 2026-05-18).
            moveHistory: input.liveState.moveHistory,
            // Game-review ground truth: the moves actually played in
            // the game under review. The claim validator treats these
            // (and the legal moves of the reviewed position) as grounded
            // so the coach can discuss the student's OWN game without the
            // master-play gate nuking legal moves that aren't in the
            // Lichess explorer's top-N. Undefined off the review surface.
            gameSans: mergedGameSans,
            groundedPlayers,
            // Step-by-step move-narration turns exempt the bare-SAN gate (the
            // coach is narrating a played move + tactical ideas a ply ahead,
            // not claiming "masters play X"). The G6 arrow validator + the
            // stat/player/comparative guards still apply. (David 2026-06-04.)
            moveNarration: input.liveState.moveNarration,
            // PLAN / STRATEGY questions exempt the bare-SAN gate (a plan
            // names forward moves several plies ahead, not "masters play
            // X"). Detected from the user's ask. The stat / count / player /
            // comparative guards still apply. (Response-loop audit 2026-06-05.)
            planQuestion: isPlanQuestion(input.ask),
            // BEST-MOVE / SOUNDNESS questions exempt the bare-SAN gate too:
            // the honest answer names the engine's best move + the short
            // line that proves it (forward moves not legal now). The
            // stat/count/player/comparative guards still apply. (David
            // 2026-06-09 "No bueno": the coach refused a plain "best move
            // here?" because the explanation's forward SANs tripped the gate.)
            bestMoveQuestion: isBestMoveQuestion(input.ask),
            // GROUNDING INVERSION (STEP A) — thread the live engine snapshot +
            // tactics so the chat layer can COMPUTE a best-move / eval / tactics
            // answer and voice it through `voiceFacts`, instead of handing the
            // LLM the board. All optional; the interception falls through to the
            // master-play top move / legacy path when absent. The engine move is
            // what lets OFF-BOOK positions (no master data) ground.
            engineBestMoveUci: input.liveState.engineBestMoveUci,
            // enginePlan carries a white-perspective eval for plan turns; the
            // eval-bar snapshot carries one for every turn. Either is fine — both
            // are white-perspective (the interception converts to side-to-move).
            engineEvalCp: input.liveState.enginePlan?.evalCp ?? input.liveState.evalCp,
            engineMateIn: input.liveState.enginePlan?.mateIn ?? input.liveState.evalMateIn,
            // STEP D Phase 3 — the engine PV backs a PLAN answer (assemblePlanAnswer).
            enginePlan: input.liveState.enginePlan,
            tactics: input.liveState.tactics,
            // STEP B — tactics/danger (Phase 2) + student-progress (Phase 6).
            // Both assemblers exist; these flags tell the interception to
            // COMPUTE the answer (engine tactics / the student's bad-habit
            // profile) and voice it via voiceFacts. Studentcolor lets the
            // tactics answer warn about the STUDENT's hanging pieces.
            tacticsQuestion: isTacticsQuestion(input.ask),
            progressQuestion,
            // STEP D Phase 4 — "how do masters play this?" voices the master-play
            // lookup's real top moves + frequencies (assembleMasterPlayAnswer).
            masterPlayQuestion: isMasterPlayQuestion(input.ask),
            // STEP D Phase 5 — "what's a fork?" voices the book corpus
            // (assembleConceptAnswer); the interception confirms a real concept.
            conceptQuestion: isConceptQuestion(input.ask),
            // STEP D Phase 4 (cont) — "how does <pro> play this?" voices the
            // player's REAL games (assemblePlayerGamesAnswer); gated on the
            // playerGames context being present.
            playerGamesQuestion: isPlayerGamesQuestion(input.ask),
            playerGames: input.liveState.playerGames ?? undefined,
            // STEP D Phase 5 — "can I win this endgame?" → the syzygy tablebase
            // (assembleEndgameAnswer); the interception does the ≤7-piece lookup.
            endgameQuestion: isEndgameQuestion(input.ask),
            // Phase 1 cont — "who's winning / how do I stand?" → eval + top
            // tactic (assemblePositionAssessment); grounds the biggest slice of
            // the free-reasoning chat fallback.
            positionAssessmentQuestion: isPositionAssessmentQuestion(input.ask),
            studentColor: input.liveState.studentColor,
            surface: coachSurfaceToRoute(input.liveState.surface),
          }
        : undefined);
    const providerCallOptions =
      options.task !== undefined || options.maxTokens !== undefined || autoGrounding
        ? {
            task: options.task,
            maxTokens: options.maxTokens,
            grounding: autoGrounding,
          }
        : undefined;
    lastProviderCallOptions = providerCallOptions;
    lastResponse = useStreaming && options.onChunk && provider.callStreaming
      ? await provider.callStreaming(currentEnvelope, options.onChunk, providerCallOptions)
      : await provider.call(currentEnvelope, providerCallOptions);

    if (lastResponse.toolCalls.length === 0) {
      // No tools emitted — terminal turn. Exit the loop.
      break;
    }

    // Dispatch tool calls. WO-STOCKFISH-SWAP-AND-PERF (part 3):
    // read-only tools (stockfish_eval, lichess lookups, opening book,
    // set_intended_opening, ...) run concurrently via Promise.allSettled
    // so a single LLM trip emitting "look it up + eval the position"
    // doesn't pay sequential network + worker latency. Write tools
    // (play_move, take_back_move, reset_board, set_board_position,
    // navigate_to_route) run sequentially after the read wave to
    // preserve causality — the LLM's intent for these is order-
    // dependent. Tool classification lives on the Tool definition
    // (kind: 'read' | 'write').
    const toolResults: { name: string; ok: boolean; result?: unknown; error?: string }[] = [];
    const readCalls: typeof lastResponse.toolCalls = [];
    const writeCalls: typeof lastResponse.toolCalls = [];
    // WO-COACH-RESILIENCE: refuse to dispatch tools the caller asked
    // to exclude even if the LLM hallucinates a call. Belt and
    // suspenders — the LLM doesn't see the tool in its envelope, but
    // model-side regressions emit unknown calls all the time.
    const excludeSet = options.excludeTools && options.excludeTools.length > 0
      ? new Set(options.excludeTools)
      : null;
    for (const call of lastResponse.toolCalls) {
      // suppressToolbelt = "this call has no tools." Any tool call the
      // brain emits despite that is a hallucination — refuse to
      // dispatch. The display-strip + sanitizeCoachStream still hides
      // the leaked `[[ACTION:...]]` text from the user.
      if (options.suppressToolbelt) {
        void logAppAudit({
          kind: 'coach-brain-tool-skipped',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `dropped ${call.name} (toolbelt suppressed)`,
          details: JSON.stringify({ id: call.id, name: call.name, reason: 'toolbelt-suppressed', args: call.args }),
        });
        continue;
      }
      if (excludeSet?.has(call.name)) {
        void logAppAudit({
          kind: 'coach-brain-tool-skipped',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `excluded ${call.name} (resilience fallback)`,
          details: JSON.stringify({ id: call.id, name: call.name, reason: 'excluded', args: call.args }),
        });
        continue;
      }
      const tool = getTool(call.name);
      if (!tool) {
        void logAppAudit({
          kind: 'coach-brain-tool-skipped',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `unknown ${call.name}`,
          details: JSON.stringify({ id: call.id, name: call.name, reason: 'unknown', args: call.args }),
        });
        continue;
      }
      if (tool.kind === 'write') {
        writeCalls.push(call);
      } else {
        readCalls.push(call);
      }
    }

    const dispatchOne = async (call: typeof lastResponse.toolCalls[number]): Promise<void> => {

      const tool = getTool(call.name);
      // Existence already verified above; non-null assertion is safe
      // here because unknown tools were filtered out.
      if (!tool) return;
      // Audit-instrumentation phase-7 (2026-05-19): tool-call latency.
      // We log every tool call's existence + result, but until now had
      // no time-to-result data. Slow tools (Lichess API timeout, hung
      // Stockfish, slow DB query) are real UX bugs and we couldn't see
      // them from the audit alone.
      const startedAt = Date.now();
      try {
        const result = await tool.execute(call.args, ctx);
        const latencyMs = Date.now() - startedAt;
        dispatchedIds.push(call.id);
        dispatchedToolNames.push(call.name);
        toolResults.push({
          name: call.name,
          ok: result.ok,
          result: result.result,
          error: result.error,
        });
        if (!result.ok && Object.prototype.hasOwnProperty.call(DATA_TOOL_DOWN_MESSAGES, call.name)) {
          failedDataTools.set(call.name, result.error ?? 'unavailable');
        }
        if (
          result.ok &&
          (call.name === 'lookup_player_opening_moves' || call.name === 'lookup_player_games') &&
          hasPlayerData(result.result)
        ) {
          playerDataGrounded = true;
          collectPlayerSans(call.name, result.result, playerSans);
          collectPlayerNames(call.name, call.args, result.result, playerNames);
        }
        // Track the board the FINAL prose will describe. Board-changing
        // tools carry the resulting FEN in their result; capture it so the
        // board-claim gate validates against the position actually shown.
        if (result.ok) {
          const rf = (result.result as { fen?: unknown } | undefined)?.fen;
          if (typeof rf === 'string' && rf.trim()) boardFenForClaims = rf.trim();
          else if (call.name === 'reset_board') boardFenForClaims = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        }
        // Audit-driven (#20, #21): include a high-signal preview of the
        // tool result so paste-back logs surface "stockfish said
        // bestMove=Nf3 eval=+0.4" instead of just "stockfish_eval ok".
        // The full result is still threaded back to the LLM via
        // toolResults; this is observability for the human reading
        // the audit panel.
        const resultPreview = previewToolResult(call.name, result);
        const summarySuffix = resultPreview ? ` ${resultPreview}` : '';
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} ${result.ok ? 'ok' : 'error'} latency=${latencyMs}ms${summarySuffix}`,
          details: JSON.stringify({
            id: call.id,
            name: call.name,
            ok: result.ok,
            error: result.error,
            preview: resultPreview ?? null,
            latencyMs,
          }),
        });
        // Dedicated tool-call-error trail — captures full error text +
        // the exact args that triggered it. The existing
        // coach-brain-tool-called audit packs args into `details` JSON
        // but for production triage we want a high-signal kind we can
        // filter on directly. See the local_opening_book "aiColor must
        // be 'white' or 'black'" surfaced in the audit log for an
        // example of what this captures.
        if (!result.ok) {
          void logAppAudit({
            kind: 'tool-call-error',
            category: 'subsystem',
            source: 'coachService.ask',
            summary: `${call.name}: ${result.error ?? 'unknown error'}`,
            details: JSON.stringify({
              id: call.id,
              name: call.name,
              args: call.args,
              error: result.error,
            }),
          });
        }
      } catch (err) {
        const latencyMs = Date.now() - startedAt;
        void logAppAudit({
          kind: 'coach-brain-tool-threw',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} threw after ${latencyMs}ms`,
          details: err instanceof Error ? err.message : String(err),
        });
        void logAppAudit({
          kind: 'tool-call-error',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} threw: ${err instanceof Error ? err.message : String(err)}`,
          details: JSON.stringify({
            id: call.id,
            name: call.name,
            args: call.args,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            latencyMs,
          }),
        });
        toolResults.push({
          name: call.name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
        if (Object.prototype.hasOwnProperty.call(DATA_TOOL_DOWN_MESSAGES, call.name)) {
          failedDataTools.set(call.name, err instanceof Error ? err.message : String(err));
        }
      }
    };

    // Phase 1: read-only tools in parallel.
    if (readCalls.length > 0) {
      await Promise.allSettled(readCalls.map(dispatchOne));
    }
    // Phase 2: write tools sequentially, in original emit order.
    // Refresh liveFen BEFORE each write tool so a prior write in the
    // same trip is visible to the next. Production audit (build
    // 21c79dd) caught the brain emitting [set_board_position(endgame
    // FEN), play_move(Kd5)] in one trip; play_move's pre-validation
    // read the STALE starting FEN (snapshotted at trip 1 setup) and
    // rejected Kd5 as illegal because there's no king at d5 in the
    // starting position. The fix mirrors the trip>1 refresh above —
    // any previous write (set_board_position, play_move,
    // take_back_move, reset_board) updates the surface's
    // liveFenRef, and this getter pulls the latest value before the
    // next write validates against it.
    // Track play_move rejections in this trip. After the second one,
    // short-circuit subsequent play_move calls with a stronger error
    // that breaks the brain out of the "demo by sequencing play_move"
    // pattern. Production audit (build 42fb9a0) caught the brain
    // emitting 9 sequential play_move calls in one trip on a "Vienna
    // trap" lesson — every one rejected (sovereignty + illegal-move
    // chain) — instead of using start_walkthrough_for_opening. The
    // prompt rule wasn't enough; this is the code-level backstop.
    let playMoveRejectionsThisTrip = 0;
    for (const call of writeCalls) {
      if (options.getLiveFen) {
        const fresh = options.getLiveFen();
        if (fresh) ctx.liveFen = fresh;
      }
      // Break the cascade: if play_move has already been rejected
      // twice this trip, refuse subsequent play_move calls with
      // explicit redirect guidance. Other tools (set_board_position,
      // take_back_move, etc.) pass through normally.
      if (call.name === 'play_move' && playMoveRejectionsThisTrip >= 2) {
        const error =
          `play_move SHORT-CIRCUITED — this trip has already had ${playMoveRejectionsThisTrip} play_move rejections. ` +
          `STOP attempting to walk through a sequence via play_move. play_move is for ONE move on YOUR color's turn during practical play, not a way to enact hypothetical lines. ` +
          `If the student asked for a guided opening lesson ("teach me [opening]" / "show me the trap"), call start_walkthrough_for_opening with the opening name — that routes them to a surface where each move animates sequentially. ` +
          `If you just want to show one position to discuss, call set_board_position ONCE with the FEN and explain in prose + [BOARD: arrow] markers.`;
        toolResults.push({ name: call.name, ok: false, error });
        void logAppAudit({
          kind: 'tool-call-error',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `play_move short-circuited after ${playMoveRejectionsThisTrip} rejections this trip`,
          details: JSON.stringify({ id: call.id, args: call.args, rejectionsThisTrip: playMoveRejectionsThisTrip }),
        });
        continue;
      }
      const beforeLen = toolResults.length;
      await dispatchOne(call);
      // Count rejections of play_move only — other tool failures don't
      // indicate the cascading-demo pattern.
      if (call.name === 'play_move') {
        const last = toolResults[toolResults.length - 1];
        if (last && beforeLen < toolResults.length && !last.ok) {
          playMoveRejectionsThisTrip += 1;
        }
      }
    }

    // If we have round-trips remaining AND we dispatched any tools,
    // build a follow-up envelope and loop. Otherwise terminate.
    if (trip < maxRoundTrips && toolResults.length > 0) {
      const followUpAsk = formatToolResultsAsFollowUpAsk(
        envelope.ask,
        lastResponse.text,
        toolResults,
      );
      currentEnvelope = { ...currentEnvelope, ask: followUpAsk };
      // Keep streaming on for follow-up trips. The user perceives
      // each non-streamed trip as a 2–3s silent pause followed by a
      // burst — production audit shows that's the "choppy" feel.
      // Streaming all trips lets each trip's prose start playing
      // within ~500ms of the trip beginning, which is what makes
      // the coach feel like a continuous lesson instead of a
      // sequence of stuttering replies. The previous concern
      // ("intermediate tool-orchestration text leaks to the user")
      // is fine — that prose IS the lesson; the coach narrating
      // "let me check the engine" while the engine call is in
      // flight reads as natural pacing, not orchestration noise.
      // Suppression turned out to be the bigger UX problem.
    } else {
      break;
    }
  }

  // Strip the stray leading-character artifact that prefixes tool-use
  // turns on chat surfaces. Production audit 2026-06-02 caught a constant
  // leading "C" glued to the answer — "CWe're at the Najdorf…", "CLet me
  // get the engine's read…" — on every turn that called a cerebellum tool
  // (stockfish_eval / lichess_opening_lookup); in the worst case the whole
  // reply collapsed to just "C". The root cause lives in the streaming /
  // multi-trip tool-use accumulation (provider.callStreaming → the
  // streamed delta boundary when a tool call interrupts the text block)
  // and is only reproducible against the live keyed brain. This is a
  // boundary guard + telemetry: it removes a SOLITARY leading letter that
  // is immediately followed (no space) by a capitalised word — the exact
  // artifact shape — and never touches legitimate openings ("Nf3…" → "f"
  // is lowercase, "White…" → "h" is lowercase, "OK,…" → no lower after
  // the cap, "I think" → space after the letter). The audit fires whenever
  // it trips so prod telemetry can pin the streaming source for a real fix.
  // ── Collapse guard ────────────────────────────────────────────────
  // Production audit (2026-06-02): the STREAMING path intermittently
  // (~25-30%) returns an empty or single-char ("C") final text — the
  // synthesis is lost at the stream's content-block boundary, so the user
  // gets nothing (originally seen on tool questions, but it also hits
  // plain streamed turns: the cerebellum tools are handled INSIDE
  // getCoachChatResponse, so coachService often dispatches zero
  // [[ACTION]] tools and `dispatchedIds` is 0 even when the brain used a
  // tool — the empty answer is the symptom regardless). We can't watch
  // the keyed stream from here, but we CAN detect the collapse (a
  // streamed answer that is empty / <=1 alphanumeric char — never a
  // legitimate coach reply) and recover it with ONE non-streaming retry
  // on the same envelope. The non-streaming path doesn't hit the
  // streaming boundary bug, so it returns the real synthesis. Bounded to
  // a single extra call; fires only on the rare collapse.
  const looksCollapsed = (t: string): boolean => t.replace(/[^A-Za-z0-9]/g, '').length <= 1;
  if (useStreaming && looksCollapsed(lastResponse.text)) {
    void logAppAudit({
      kind: 'coach-brain-empty-collapse-retry',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `streamed answer collapsed ("${lastResponse.text.slice(0, 4)}") on ${input.surface}; retrying non-streaming`,
      details: JSON.stringify({ surface: input.surface, provider: provider.name, tools: dispatchedIds.length, dispatchedToolNames }),
    });
    try {
      const recovered = await provider.call(currentEnvelope, lastProviderCallOptions);
      if (recovered.text && !looksCollapsed(recovered.text)) {
        // Stream the recovered text to any listener so the bubble fills.
        if (options.onChunk) options.onChunk(stripLeadingArtifact(recovered.text));
        lastResponse = { ...recovered };
      }
    } catch {
      // Recovery is best-effort; fall through with whatever we have.
    }
  }

  const rawText = lastResponse.text;
  const deartifacted = stripLeadingArtifact(rawText);
  if (deartifacted !== rawText) {
    void logAppAudit({
      kind: 'coach-brain-leading-artifact-stripped',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `stripped leading "${rawText[0]}" from ${input.surface} answer (tools=${dispatchedIds.length})`,
      details: JSON.stringify({
        surface: input.surface,
        provider: provider.name,
        strippedChar: rawText[0],
        toolCallsDispatched: dispatchedIds.length,
        dispatchedToolNames,
        preview: rawText.slice(0, 60),
      }),
    });
  }
  let finalText = deartifacted;

  // G3 fabrication backstop (deterministic — prompt + tool-shape reduce
  // this but an LLM can't be guaranteed on a negative constraint). If the
  // brain ATTEMPTED a player-data lookup, got NO data back, yet still
  // states a player percentage, that figure is fabricated from memory.
  // Replace the whole answer with a safe refusal rather than ship invented
  // pro stats. Mirrors claimValidator's stock-fallback.
  const playerToolAttempted =
    dispatchedToolNames.includes('lookup_player_opening_moves') ||
    dispatchedToolNames.includes('lookup_player_games');
  if (playerToolAttempted && !playerDataGrounded && /\d+\s*%/.test(finalText)) {
    void logAppAudit({
      kind: 'claim-validator-trip',
      category: 'subsystem',
      source: 'coachService.ungroundedPlayerStatGuard',
      summary: `replaced ungrounded player-stat answer on ${input.surface} — player lookup returned no data but the response cited a percentage`,
      details: JSON.stringify({ surface: input.surface, preview: finalText.slice(0, 200) }),
    });
    finalText = UNGROUNDED_PLAYER_STAT_REFUSAL;
  }

  // Non-silence safety net (production bug 2026-06-02: "no lesson started"
  // — the brain dispatched tools across all round-trips and returned EMPTY
  // text). If we have no final text AND no walkthrough was started (the
  // walkthrough runtime narrates on its own, so empty is fine THERE), don't
  // ship silence — give a short actionable nudge instead.
  if (
    !finalText.trim() &&
    dispatchedToolNames.length > 0 &&
    !dispatchedToolNames.includes('start_walkthrough_for_opening')
  ) {
    void logAppAudit({
      kind: 'coach-brain-answer-returned',
      category: 'subsystem',
      source: 'coachService.emptyAnswerGuard',
      summary: `empty answer after ${dispatchedToolNames.length} tool call(s) on ${input.surface} — served non-silent fallback (tools=${dispatchedToolNames.join(',')})`,
      details: JSON.stringify({ surface: input.surface, dispatchedToolNames }),
    });
    finalText =
      '[VOICE: Let me start that lesson.] Tell me the opening you want to learn — say "walk me through it" — and I\'ll animate it move by move on the board.';
  }

  // ── RUNTIME GROUNDING GATES (run on EVERY coach answer, EVERY surface) ──
  // Previously these lived only on individual surfaces (board-claim on the
  // hint hook, arrow/tactic on CoachTeachPage) — so masterclass-chat,
  // middlegame-practice, live-coach, game-chat etc. shipped UNVALIDATED
  // prose, and the teach hallucination ("the knight on a3" on an empty a3)
  // sailed through. Centralising them in the spine wires every gate into
  // every turn. The board the prose describes is `boardFenForClaims`
  // (live FEN advanced by this turn's board-changing tools).
  finalText = runAnswerGates(
    finalText,
    boardFenForClaims,
    input.liveState.tactics ?? null,
    input.surface,
    playerDataGrounded,
    input.liveState.evalCp,
    input.liveState.evalMateIn,
  );
  // Arrow standard (async, engine-colored) — the ONE arrow path. Every
  // move the coach mentioned gets a code-resolved, Stockfish-rank-
  // colored arrow; the LLM no longer emits [BOARD: arrow:] markers.
  finalText = await applyCandidateArrows(finalText, boardFenForClaims, `coachService:${input.surface}`);

  // ── FAIL LOUDLY: a data source the coach relies on went down this turn ──
  // David 2026-06-15: "I want the llm to fail loudly if something is down…
  // say what is not working — 'Stockfish not responding'." When a DATA tool
  // failed (engine crashed, explorer/master DB unreachable), tell the student
  // WHAT is down — deterministically, up front — instead of letting an
  // invented answer stand (the dead-engine "exd6 is the engine's #1"
  // fabrication). The per-tool tool-call-error audit already fired; this
  // surfaces it to the USER. Runs after grounding so it can't be stripped.
  if (failedDataTools.size > 0) {
    const clauses = [
      ...new Set([...failedDataTools.keys()].map((n) => DATA_TOOL_DOWN_MESSAGES[n])),
    ];
    finalText = `⚠️ Heads up — ${clauses.join('; ')}. I won't make that up — here's my general read instead:\n\n${finalText}`.trim();
    void logAppAudit({
      kind: 'claim-validator-trip',
      category: 'subsystem',
      source: 'coachService.dataUnavailableGuard',
      summary: `surfaced data-source-down to student on ${input.surface}: ${[...failedDataTools.keys()].join(', ')}`,
      details: JSON.stringify({ surface: input.surface, failed: Object.fromEntries(failedDataTools) }),
    });
  }

  // Board-announce gate (was CoachTeachPage-only): when a board-changing
  // tool fired, the spoken [VOICE:] block should announce it ("Setting the
  // board to…" / "Starting the … walkthrough.") so the student is never
  // surprised by the board moving under them. Audit on every surface now.
  {
    const boardTools = dispatchedToolNames.filter(
      (n) => n === 'set_board_position' || n === 'start_walkthrough_for_opening',
    );
    if (boardTools.length > 0) {
      const voiceMatch = /\[VOICE:\s*([^\]]*)\]/i.exec(finalText);
      const firstSpoken = (voiceMatch ? voiceMatch[1] : finalText).trim().toLowerCase();
      const announced =
        firstSpoken.startsWith('setting the board') ||
        firstSpoken.startsWith('starting the ') ||
        firstSpoken.startsWith("let's set the board") ||
        firstSpoken.startsWith("i'm setting the board");
      if (firstSpoken && !announced) {
        void logAppAudit({
          kind: 'claim-validator-trip',
          category: 'subsystem',
          source: 'coachService.boardAnnounceGate',
          summary: `board-changing tool(s) [${boardTools.join(', ')}] fired but voice did not announce it on ${input.surface}`,
          details: JSON.stringify({ surface: input.surface, boardTools, firstSpoken: firstSpoken.slice(0, 120) }),
        });
      }
    }
  }

  void logAppAudit({
    kind: 'coach-brain-answer-returned',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `surface=${input.surface} provider=${provider.name} task=${options.task ?? 'chat_response'} text=${finalText.length}c tools=${dispatchedIds.length}`,
    details: JSON.stringify({
      surface: input.surface,
      provider: provider.name,
      task: options.task ?? 'chat_response',
      maxTokens: options.maxTokens ?? null,
      textLength: finalText.length,
      toolCallsDispatched: dispatchedIds.length,
      textPreview: finalText.slice(0, 120),
    }),
  });

  return {
    text: finalText,
    toolCallIds: dispatchedIds,
    dispatchedToolNames,
    provider: provider.name,
  };
}


/** Single-method service object. Surfaces import this and call
 *  `coachService.ask(...)`. No other entry points. */
export const coachService = { ask };

/** Re-export the toolbelt for tests / debugging. */
export { COACH_TOOLS };
