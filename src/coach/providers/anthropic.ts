/**
 * Anthropic provider — wired but dark.
 *
 * Today's `getCoachChatResponse` already routes to Anthropic when the
 * user has an Anthropic key configured. This provider exists so that
 * flipping `COACH_PROVIDER` env var (read in `coachService.ts`) routes
 * brain calls explicitly through the Anthropic-flavoured path. Today
 * it shares the same wrapper as DeepSeek — provider selection happens
 * one layer deeper via `getProviderConfig`. When we eventually want
 * provider-specific prompt shapes or tool-use blocks, this file is
 * where Anthropic-specific behaviour lands.
 *
 * Privacy callout (per COACH-BRAIN-00): DeepSeek is China-hosted.
 * The brain's eventual flip to Anthropic is meant to be a one-line
 * change at the `COACH_PROVIDER` level. Keep that easy.
 */
import { getCoachChatResponse } from '../../services/coachApi';
import { parseActions } from '../../services/coachActionDispatcher';
import { logAppAudit } from '../../services/appAuditor';
import type {
  AssembledEnvelope,
  Provider,
  ProviderCallOptions,
  ProviderResponse,
  ProviderToolCall,
} from '../types';
import { formatEnvelopeAsSystemPrompt, formatEnvelopeAsUserMessage } from '../envelope';

const PROVIDER_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 2000;

function buildResponse(raw: string): ProviderResponse {
  const parsed = parseActions(raw);
  const toolCalls: ProviderToolCall[] = parsed.actions.map((a, i) => ({
    id: `tc-${Date.now()}-${i}`,
    name: a.name,
    args: a.args,
  }));
  return {
    text: parsed.cleanText.trim(),
    toolCalls,
    raw: { fullResponse: raw },
  };
}

async function callAnthropicViaCoachApi(
  envelope: AssembledEnvelope,
  onChunk?: (chunk: string) => void,
  options?: ProviderCallOptions,
): Promise<ProviderResponse> {
  const systemPrompt = formatEnvelopeAsSystemPrompt(envelope);
  const userMessage = formatEnvelopeAsUserMessage(envelope);
  // Force Anthropic at the API layer too. Without this, getCoachChatResponse
  // would re-pick the provider via `getProviderConfig` based on which key is
  // available, which can route the call to DeepSeek even though the brain
  // chose anthropicProvider. The /coach/teach surface must always hit
  // Anthropic (Sonnet/Haiku) regardless of the global default.
  // Task defaults to 'chat_response' (claude-sonnet-4-6); legacy
  // /coach/play call sites passing through the spine override this
  // to keep Haiku/Reasoner routing for cost-sensitive paths.
  const task = options?.task ?? 'chat_response';
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

  // One attempt of the underlying call, raced against PROVIDER_TIMEOUT_MS.
  // The race bounds a hang: getCoachChatResponse has its OWN cross-provider
  // fallback, but it only fires when a call THROWS — a merely-slow call
  // (serverless cold start) never throws, so the timeout converts "slow"
  // into a rejection here.
  const attempt = (stream: boolean): Promise<string> => {
    const promise = getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      stream ? onChunk : undefined,
      task,
      maxTokens,
      'medium',
      'anthropic',
      undefined,        // skipPersonality — coach lane, personality blocks apply
      options?.grounding, // WO-COACH-MASTER-INTEGRATION
    );
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('coach-brain-anthropic-timeout')), PROVIDER_TIMEOUT_MS),
    );
    return Promise.race([promise, timeout]);
  };

  let raw: string;
  try {
    raw = await attempt(true);
  } catch (err) {
    // First call timed out / failed. Previously surfaced a "(coach-brain
    // provider error: …)" bubble with NO retry — the outer race preempted
    // getCoachChatResponse's provider fallback. Retry ONCE: re-enters that
    // cross-provider fallback AND the edge is now warm, so a cold-start
    // timeout recovers instead of dead-ending. Streaming OFF on retry so we
    // never double-emit the chunks the first attempt may have started.
    const firstMessage = err instanceof Error ? err.message : String(err);
    void logAppAudit({
      kind: 'coach-brain-provider-retry',
      category: 'subsystem',
      source: 'anthropicProvider.call',
      summary: `anthropic retry after: ${firstMessage}`,
    });
    try {
      raw = await attempt(false);
    } catch (retryErr) {
      const message = retryErr instanceof Error ? retryErr.message : String(retryErr);
      return {
        text: `(coach-brain provider error: ${message})`,
        toolCalls: [],
        raw: { error: message },
      };
    }
  }
  return buildResponse(raw);
}

export const anthropicProvider: Provider = {
  name: 'anthropic',
  async call(envelope: AssembledEnvelope, options?: ProviderCallOptions): Promise<ProviderResponse> {
    return callAnthropicViaCoachApi(envelope, undefined, options);
  },
  /** First-sentence-fast streaming. The brain hands `onChunk` here so
   *  the TTS dispatcher in CoachTeachPage / GameChatPanel can split on
   *  sentence boundaries and play the first Polly utterance within
   *  ~1s of the model emitting it — instead of waiting for the full
   *  response. Tool-call markers (`[[ACTION:name {args}]]`) are still
   *  parsed from the FULL accumulated response after streaming
   *  completes, so the dispatcher fires every action regardless of
   *  whether streaming was on. */
  async callStreaming(envelope, onChunk, options) {
    return callAnthropicViaCoachApi(envelope, onChunk, options);
  },
};
