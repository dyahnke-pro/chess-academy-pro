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
  /** Callback the `navigate_to_route` cerebrum tool uses to actually
   *  push the user-validated route via react-router. WO-BRAIN-04. */
  onNavigate?: ToolExecutionContext['onNavigate'];
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

  const providerName = options.provider ?? resolveProviderName();
  const provider = options.providerOverride ?? pickProvider(providerName);

  const ctx: ToolExecutionContext = {
    onPlayMove: options.onPlayMove,
    onNavigate: options.onNavigate,
    liveFen: input.liveState.fen,
  };

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

    // WO-TEACH-FIX-02 — diagnostic audit so we can verify whether
    // streaming responses are correctly emitting parsed tool calls.
    // If the brain's text contains [[ACTION:...]] but toolCalls is
    // empty, parseActions failed to extract — that's a different bug
    // than "brain didn't emit any actions."
    void logAppAudit({
      kind: 'coach-brain-tool-parse-result',
      category: 'subsystem',
      source: 'coachService.ask',
      summary: `streaming=${useStreaming} parsed=${lastResponse.toolCalls.length} text=${lastResponse.text.length}c`,
      details: JSON.stringify({
        streaming: useStreaming,
        parsedCount: lastResponse.toolCalls.length,
        toolNames: lastResponse.toolCalls.map((c) => c.name),
        textPreview: lastResponse.text.slice(0, 200),
      }),
    });

    if (lastResponse.toolCalls.length === 0) {
      // No tools emitted — terminal turn. Exit the loop.
      break;
    }

    // Dispatch tool calls (each gets the surface context).
    const toolResults: { name: string; ok: boolean; result?: unknown; error?: string }[] = [];
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
