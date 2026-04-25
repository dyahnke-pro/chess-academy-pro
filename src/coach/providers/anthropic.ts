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
import type {
  AssembledEnvelope,
  Provider,
  ProviderResponse,
  ProviderToolCall,
} from '../types';
import { formatEnvelopeAsSystemPrompt, formatEnvelopeAsUserMessage } from '../envelope';

const PROVIDER_TIMEOUT_MS = 30_000;

export const anthropicProvider: Provider = {
  name: 'anthropic',
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
      setTimeout(() => reject(new Error('coach-brain-anthropic-timeout')), PROVIDER_TIMEOUT_MS),
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
