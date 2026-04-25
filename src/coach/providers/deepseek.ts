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
import type {
  AssembledEnvelope,
  Provider,
  ProviderResponse,
  ProviderToolCall,
} from '../types';
import { formatEnvelopeAsSystemPrompt, formatEnvelopeAsUserMessage } from '../envelope';

const PROVIDER_TIMEOUT_MS = 30_000;

export const deepseekProvider: Provider = {
  name: 'deepseek',
  async call(envelope: AssembledEnvelope): Promise<ProviderResponse> {
    const systemPrompt = formatEnvelopeAsSystemPrompt(envelope);
    const userMessage = formatEnvelopeAsUserMessage(envelope);
    const promise = getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      undefined,
      'chat_response',
      2000,
      'medium',
    );
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('coach-brain-deepseek-timeout')), PROVIDER_TIMEOUT_MS),
    );
    let raw: string;
    try {
      raw = await Promise.race([promise, timeout]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        text: `(coach-brain provider error: ${message})`,
        toolCalls: [],
        raw: { error: message },
      };
    }
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
  },
};
