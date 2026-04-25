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
 *   5. Returns the cleaned text + a list of tool-call ids.
 *
 * BRAIN-01 ships a single round-trip: the service does NOT loop on
 * tool results back into a follow-up LLM call. Tool results are
 * dispatched and audit-logged; if the LLM needs to react to a tool
 * result, the calling surface dispatches a follow-up ask. Multi-turn
 * tool loops are a future WO once we know how often surfaces actually
 * need them.
 *
 * See `docs/COACH-BRAIN-00.md` for the architecture this implements.
 */
import { logAppAudit } from '../services/appAuditor';
import { assembleEnvelope } from './envelope';
import { deepseekProvider } from './providers/deepseek';
import { anthropicProvider } from './providers/anthropic';
import { COACH_TOOLS, getTool, getToolDefinitions } from './tools/registry';
import type {
  CoachAnswer,
  CoachAskInput,
  CoachIdentity,
  Provider,
  ProviderName,
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
   *  `runAgentTurn`'s `onChunk`. WO-BRAIN-02. */
  onChunk?: (chunk: string) => void;
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

  const streaming = !!options.onChunk && typeof provider.callStreaming === 'function';
  void logAppAudit({
    kind: 'coach-brain-provider-called',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `provider=${provider.name} streaming=${streaming}`,
  });

  const response = streaming && options.onChunk && provider.callStreaming
    ? await provider.callStreaming(envelope, options.onChunk)
    : await provider.call(envelope);

  // Dispatch tool calls (single-pass; no loop-back into LLM).
  const dispatchedIds: string[] = [];
  for (const call of response.toolCalls) {
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
      const result = await tool.execute(call.args);
      dispatchedIds.push(call.id);
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
    }
  }

  void logAppAudit({
    kind: 'coach-brain-answer-returned',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `provider=${provider.name} text=${response.text.length}c tools=${dispatchedIds.length}`,
  });

  return {
    text: response.text,
    toolCallIds: dispatchedIds,
    provider: provider.name,
  };
}

/** Single-method service object. Surfaces import this and call
 *  `coachService.ask(...)`. No other entry points. */
export const coachService = { ask };

/** Re-export the toolbelt for tests / debugging. */
export { COACH_TOOLS };
