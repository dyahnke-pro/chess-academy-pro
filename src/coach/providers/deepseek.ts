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

// 30s. A shorter value BACKFIRES on the interactive turn: the hand-driven prod
// audit (David 2026-09-02) showed a cold DeepSeek first call answers in ~20-22s,
// but a 15s timeout KILLED attempt 1 before the edge finished warming, so the
// retry restarted cold and STACKED (15s + ~20s = ~35s). Keeping 30s lets the
// single cold attempt complete (~22s) with no retry; the raised client cap
// (GameChatPanel, 32s) then shows it. The retry stays as the recovery for a
// genuinely stuck attempt, not a latency multiplier on every cold start.
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
  const start = (stream: boolean): Promise<string> => getCoachChatResponse(
    [{ role: 'user', content: userMessage }],
    systemPrompt,
    stream ? onChunk : undefined,
    task,
    maxTokens,
    'medium',
    'deepseek',
    options?.grounding, // WO-COACH-MASTER-INTEGRATION
    options?.studentLanguage, // the turn's language, for the grounded lanes
  );
  const withTimeout = (work: Promise<string>): Promise<string> => Promise.race([
    work,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('coach-brain-deepseek-timeout')), PROVIDER_TIMEOUT_MS),
    ),
  ]);

  let raw: string;
  // The first attempt's own work (the grounded answer is computed in code,
  // engine reads and all) keeps running past the timeout. Its result is still
  // the answer when it lands first, so the retry RACES it instead of throwing
  // it away (prod walk on a real record, 2026-10-19: a stalled engine pushed
  // a code-computed answer past 30s, and the retry started it over).
  const first = start(true);
  first.catch(() => undefined); // a late failure of the abandoned attempt is not an error
  try {
    raw = await withTimeout(first);
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
      raw = await firstSuccess([first, withTimeout(start(false))]);
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

/** The first of several attempts to SUCCEED; rejects with the last error only
 *  when every one has failed. */
function firstSuccess(attempts: readonly Promise<string>[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let failed = 0;
    for (const a of attempts) {
      a.then(resolve, (e: unknown) => { failed += 1; if (failed === attempts.length) reject(e); });
    }
  });
}
