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
import { logAppAudit } from '../services/appAuditor';
import { assembleEnvelope } from './envelope';
import { deepseekProvider } from './providers/deepseek';
import { anthropicProvider } from './providers/anthropic';
import { COACH_TOOLS, getTool, getToolDefinitions } from './tools/registry';
import type {
  AssembledEnvelope,
  CoachAnswer,
  CoachAskInput,
  CoachIdentity,
  Provider,
  ProviderName,
  ProviderResponse,
  ToolExecutionContext,
} from './types';

/** Read provider name from `import.meta.env.COACH_PROVIDER`, falling
 *  back to `process.env.COACH_PROVIDER` (Node test envs), default
 *  'deepseek'. The constitution requires this be a one-line flip. */
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

export interface CoachServiceOptions {
  /** Override the active provider. Useful for tests. */
  provider?: ProviderName;
  /** Override the coach identity (default: 'danya'). */
  identity?: CoachIdentity;
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
  /** WO-FOUNDATION-02 trace harness — surface-supplied UUID for
   *  joining audit entries across the pipeline. */
  traceId?: string;
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
  lines.push(
    '',
    'Use these results to decide. Either call additional tools or give your final answer.',
  );
  return lines.join('\n');
}

async function ask(input: CoachAskInput, options: CoachServiceOptions = {}): Promise<CoachAnswer> {
  void logAppAudit({
    kind: 'coach-brain-ask-received',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `surface=${input.surface} ask="${input.ask.slice(0, 60)}"`,
    details: JSON.stringify({ surface: input.surface, askLen: input.ask.length }),
  });

  // WO-FOUNDATION-02 trace harness — fires at the start of every
  // ask, mirroring coach-brain-ask-received but carrying the
  // traceId so the audit pipeline can be reconstructed.
   
  console.log('[TRACE-5]', options.traceId, 'ask received, input.ask:', input.ask);
  void logAppAudit({
    kind: 'trace-ask-received',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `ask="${input.ask.slice(0, 80)}" surface=${input.surface} traceId=${options.traceId ?? 'none'}`,
  });

  // WO-FOUNDATION-02: Layer 1 routing moved upstream to
  // GameChatPanel.handleSend. Most user messages never reached this
  // entry point — pre-LLM intercepts at the surface short-circuit
  // first. The router now runs at the surface boundary with the
  // user's raw text. This entry point only sees messages that the
  // surface chose to forward (real LLM round-trips), so router
  // bypass-LLM logic at this layer was dead code.

  const envelope = assembleEnvelope({
    identity: options.identity,
    toolbelt: getToolDefinitions(),
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
  void logAppAudit({
    kind: 'trace-toolbelt',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `tools=${envelope.toolbelt.map((t) => t.name).join(',')} traceId=${options.traceId ?? 'none'}`,
  });

  const providerName = options.provider ?? resolveProviderName();
  const provider = options.providerOverride ?? pickProvider(providerName);

  const ctx: ToolExecutionContext = {
    onPlayMove: options.onPlayMove,
    onTakeBackMove: options.onTakeBackMove,
    onSetBoardPosition: options.onSetBoardPosition,
    onResetBoard: options.onResetBoard,
    onNavigate: options.onNavigate,
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

  // WO-FOUNDATION-02 trace harness — same shape as the audit above
  // but carries the traceId so it joins the per-message trace.
   
  console.log('[TRACE-6]', options.traceId, 'ctx-built:', {
    onPlayMove: typeof ctx.onPlayMove,
    onTakeBackMove: typeof ctx.onTakeBackMove,
    onResetBoard: typeof ctx.onResetBoard,
    onSetBoardPosition: typeof ctx.onSetBoardPosition,
    onNavigate: typeof ctx.onNavigate,
  });
  void logAppAudit({
    kind: 'trace-ctx-built',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `onPlayMove=${typeof ctx.onPlayMove} onTakeBackMove=${typeof ctx.onTakeBackMove} onResetBoard=${typeof ctx.onResetBoard} traceId=${options.traceId ?? 'none'}`,
  });

  const maxRoundTrips = Math.max(1, options.maxToolRoundTrips ?? 1);
  const dispatchedIds: string[] = [];

  let currentEnvelope: AssembledEnvelope = envelope;
  let useStreaming = !!options.onChunk && typeof provider.callStreaming === 'function';
  let lastResponse: ProviderResponse = { text: '', toolCalls: [] };

  for (let trip = 1; trip <= maxRoundTrips; trip++) {
    void logAppAudit({
      kind: 'coach-brain-provider-called',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `provider=${provider.name} streaming=${useStreaming} trip=${trip}/${maxRoundTrips}`,
    });

    lastResponse = useStreaming && options.onChunk && provider.callStreaming
      ? await provider.callStreaming(currentEnvelope, options.onChunk)
      : await provider.call(currentEnvelope);

    // WO-FOUNDATION-02 trace harness — what tool calls did the
    // provider return? Critical signal for diagnosing why play_move
    // doesn't dispatch.
     
    console.log('[TRACE-9]', options.traceId, 'provider response:', {
      toolCalls: lastResponse.toolCalls,
      textPreview: lastResponse.text.slice(0, 200),
    });
    void logAppAudit({
      kind: 'trace-provider-response',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `toolCallNames=${lastResponse.toolCalls.map((c) => c.name).join(',')} textLen=${lastResponse.text.length} traceId=${options.traceId ?? 'none'}`,
    });

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
    for (const call of lastResponse.toolCalls) {
      const tool = getTool(call.name);
      if (!tool) {
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `unknown tool ${call.name}`,
          details: JSON.stringify({ id: call.id, args: call.args }),
        });
        continue;
      }
      if (tool.kind === 'write') {
        writeCalls.push(call);
      } else {
        readCalls.push(call);
      }
    }

    const dispatchOne = async (call: typeof lastResponse.toolCalls[number]) => {
      // eslint-disable-next-line no-console
      console.log('[TRACE-10]', options.traceId, 'tool dispatch:', call.name, call.args);
      void logAppAudit({
        kind: 'trace-tool-dispatch',
        category: 'subsystem',
        source: 'coachService.ask',
        summary: `tool=${call.name} traceId=${options.traceId ?? 'none'}`,
      });
      const tool = getTool(call.name);
      // Existence already verified above; non-null assertion is safe
      // here because unknown tools were filtered out.
      if (!tool) return;
      try {
        const result = await tool.execute(call.args, ctx);
        dispatchedIds.push(call.id);
        toolResults.push({
          name: call.name,
          ok: result.ok,
          result: result.result,
          error: result.error,
        });
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} ${result.ok ? 'ok' : 'error'}`,
          details: JSON.stringify({ id: call.id, name: call.name, ok: result.ok, error: result.error }),
        });
      } catch (err) {
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} threw`,
          details: err instanceof Error ? err.message : String(err),
        });
        toolResults.push({
          name: call.name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    // Phase 1: read-only tools in parallel.
    if (readCalls.length > 0) {
      await Promise.allSettled(readCalls.map(dispatchOne));
    }
    // Phase 2: write tools sequentially, in original emit order.
    for (const call of writeCalls) {
      await dispatchOne(call);
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
      // Streaming the follow-up turns would surface intermediate
      // tool-orchestration text to the user. Suppress.
      useStreaming = false;
    } else {
      break;
    }
  }

  void logAppAudit({
    kind: 'coach-brain-answer-returned',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `provider=${provider.name} text=${lastResponse.text.length}c tools=${dispatchedIds.length}`,
  });

  return {
    text: lastResponse.text,
    toolCallIds: dispatchedIds,
    provider: provider.name,
  };
}


/** Single-method service object. Surfaces import this and call
 *  `coachService.ask(...)`. No other entry points. */
export const coachService = { ask };

/** Re-export the toolbelt for tests / debugging. */
export { COACH_TOOLS };
