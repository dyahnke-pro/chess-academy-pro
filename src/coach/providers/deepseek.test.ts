import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the underlying brain call + envelope formatting so we drive the
// provider's retry logic directly without a real LLM round-trip.
const getCoachChatResponse = vi.fn();
vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: (...args: unknown[]) => getCoachChatResponse(...args),
}));
vi.mock('../envelope', () => ({
  formatEnvelopeAsSystemPrompt: () => 'SYS',
  formatEnvelopeAsUserMessage: () => 'USER',
}));
const logAppAudit = vi.fn();
vi.mock('../../services/appAuditor', () => ({ logAppAudit: (...a: unknown[]) => logAppAudit(...a) }));

import { deepseekProvider } from './deepseek';
import type { AssembledEnvelope } from '../types';

const envelope = {} as AssembledEnvelope;

describe('deepseekProvider — cold-start timeout retry', () => {
  beforeEach(() => {
    getCoachChatResponse.mockReset();
    logAppAudit.mockReset();
  });

  it('retries once when the first call rejects (timeout) and returns the warm result', async () => {
    getCoachChatResponse
      .mockRejectedValueOnce(new Error('coach-brain-deepseek-timeout'))
      .mockResolvedValueOnce('The plan is to push d4 and open the center.');

    const res = await deepseekProvider.call(envelope);

    // recovered — NOT the "(coach-brain provider error: …)" dead-end bubble
    expect(res.text).toBe('The plan is to push d4 and open the center.');
    expect(res.text).not.toContain('provider error');
    expect(getCoachChatResponse).toHaveBeenCalledTimes(2);
    // observability: the retry is audited
    expect(logAppAudit).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'coach-brain-provider-retry' }),
    );
  });

  it('disables streaming on the retry so chunks are never double-emitted', async () => {
    const onChunk = vi.fn();
    getCoachChatResponse
      .mockRejectedValueOnce(new Error('coach-brain-deepseek-timeout'))
      .mockResolvedValueOnce('warm answer');

    // `callStreaming` is optional on the provider contract; this provider
    // always implements it, which is the point of the test.
    await deepseekProvider.callStreaming!(envelope, onChunk);

    // 1st call (index 2 arg) gets the onChunk; retry (2nd call) gets undefined
    expect(getCoachChatResponse.mock.calls[0][2]).toBe(onChunk);
    expect(getCoachChatResponse.mock.calls[1][2]).toBeUndefined();
  });

  it('returns the error bubble only when BOTH attempts fail', async () => {
    getCoachChatResponse
      .mockRejectedValueOnce(new Error('coach-brain-deepseek-timeout'))
      .mockRejectedValueOnce(new Error('still down'));

    const res = await deepseekProvider.call(envelope);

    expect(res.text).toContain('provider error');
    expect(res.text).toContain('still down');
    expect(getCoachChatResponse).toHaveBeenCalledTimes(2);
  });
});

describe('deepseekProvider — the turn language reaches the grounded lanes', () => {
  beforeEach(() => {
    getCoachChatResponse.mockReset();
    logAppAudit.mockReset();
  });

  // 🔒 MEASURED ON PROD 2026-09-19: a Thai question came back "The best move is
  // Nc3…". The grounded lanes inside the brain voice their facts BEFORE any
  // model call, so the language instruction in the system prompt never reaches
  // them — they need the value, and this is the slot it travels in.
  it('forwards studentLanguage as the 10th argument', async () => {
    getCoachChatResponse.mockResolvedValueOnce('ok');
    await deepseekProvider.call(envelope, { studentLanguage: 'Thai' });
    expect(getCoachChatResponse.mock.calls[0][9]).toBe('Thai');
  });

  it('passes nothing on an English turn, so the raw fast path is unchanged', async () => {
    getCoachChatResponse.mockResolvedValueOnce('ok');
    await deepseekProvider.call(envelope);
    expect(getCoachChatResponse.mock.calls[0][9]).toBeUndefined();
  });
});
