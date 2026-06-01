/**
 * DeepSeek provider — active LLM for the Coach Brain spine.
 *
 * Wraps the existing `getCoachChatResponse` so every brain call rides
 * the same auth/key/encryption path as the rest of the app. Forces
 * the user-preference layer to "anthropic" or "deepseek" via the
 * `COACH_PROVIDER` env var would require deeper changes; for now this
 * provider just calls into `getCoachChatResponse` and the existing
 * provider selector picks the underlying model based on the user's
 * configured key.
 *
 * Tool calls: parsed from the LLM response via the existing
 * `[[ACTION:name {args}]]` tag protocol — see
 * `src/services/coachActionDispatcher.ts`. Returned as
 * `ProviderToolCall[]` in shape, contents, and ordering.
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

async function callDeepSeek(
  envelope: AssembledEnvelope,
  onChunk?: (chunk: string) => void,
  options?: ProviderCallOptions,
): Promise<ProviderResponse> {
  const systemPrompt = formatEnvelopeAsSystemPrompt(envelope);
  const userMessage = formatEnvelopeAsUserMessage(envelope);
  // Pin DeepSeek at the API layer. Non-Learn surfaces stay on DeepSeek
  // even though the Anthropic env key is also present — Learn is the
  // only surface that uses Anthropic (see anthropicProvider for the
  // mirror call with 'anthropic'). The fallback chain still kicks in
  // if DeepSeek's call errors.
  const task = options?.task ?? 'chat_response';
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;

  // One attempt of the underlying call, raced against PROVIDER_TIMEOUT_MS.
  // The race is what bounds a hang: getCoachChatResponse has its OWN
  // cross-provider fallback, but that only fires when a call THROWS — a
  // merely-slow call (commonly a serverless cold start) never throws, so the
  // timeout has to convert "slow" into a rejection here.
  const attempt = (stream: boolean): Promise<string> => {
    const promise = getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      stream ? onChunk : undefined,
      task,
      maxTokens,
      'medium',
      'deepseek',
      undefined,        // skipPersonality — coach lane
      options?.grounding, // WO-COACH-MASTER-INTEGRATION
    );
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('coach-brain-deepseek-timeout')), PROVIDER_TIMEOUT_MS),
    );
    return Promise.race([promise, timeout]);
  };

  let raw: string;
  try {
    raw = await attempt(true);
  } catch (err) {
    // The first call timed out / failed. Previously this surfaced a
    // "(coach-brain provider error: …)" bubble with NO retry — the outer
    // race preempted getCoachChatResponse's provider fallback. Retry ONCE:
    // the retry re-enters that cross-provider fallback AND the underlying
    // function/edge is now warm, so a cold-start timeout recovers instead of
    // dead-ending. Streaming is OFF on the retry so we never double-emit the
    // chunks the first (failed) attempt may have started.
    const firstMessage = err instanceof Error ? err.message : String(err);
    void logAppAudit({
      kind: 'coach-brain-provider-retry',
      category: 'subsystem',
      source: 'deepseekProvider.call',
      summary: `deepseek retry after: ${firstMessage}`,
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

export const deepseekProvider: Provider = {
  name: 'deepseek',
  async call(envelope: AssembledEnvelope, options?: ProviderCallOptions): Promise<ProviderResponse> {
    return callDeepSeek(envelope, undefined, options);
  },
  async callStreaming(envelope, onChunk, options) {
    return callDeepSeek(envelope, onChunk, options);
  },
};
