// "Tell me about the endgame" is about the SUBJECT, never a board (2026-10-28).
// Through the real coachService.ask path: with no board the chat asked "which
// position do you mean?", with one in the opening it said "you're not in an
// endgame yet", and "how do I play endgames?" was read as a request to play one
// and answered "That did not come through". The app's endgame principles answer
// it, with the endgame lessons one tap away.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { coachService } from './coachService';
import { isEndgameTopicAsk, isEndgamePlayRequest } from './questionIntents';

const OPENING = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const KP_ENDING = '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1';

const ask = (text: string, fen?: string) => coachService.ask({
  surface: 'standalone-chat',
  ask: text,
  liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat', ...(fen ? { fen } : {}) },
} as unknown as Parameters<typeof coachService.ask>[0], {});

const PRINCIPLES = /^Endgames come down to 7 principles\. When queens come off, march the king toward the center\./;

describe('the endgame as a topic', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  const offline = (): void => { vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 })); };

  it.each([
    ['tell me about the endgame', undefined],
    ['how do I play endgames?', undefined],
    ['what are the endgame principles?', undefined],
    ['teach me about endgames', undefined],
    ['tell me about the endgame', OPENING],
  ])('%s → the principles, and the endgame lessons are offered', async (q, fen) => {
    offline();
    const a = await ask(q, fen);
    expect(a.text).toMatch(PRINCIPLES);
    expect(a.actionOffer?.[0]?.type).toBe('endgame_training');
  }, 60_000);

  it.each([
    ['can I hold this ending?', KP_ENDING],
    ['play the Lucena with me', undefined],
    ['what endgame am I weakest at?', undefined],
    ['how do I win a rook endgame?', undefined],
  ])('negative control — a board, a named ending or the record is something else: %s', async (q, fen) => {
    offline();
    const a = await ask(q, fen);
    expect(a.text).not.toMatch(PRINCIPLES);
  }, 60_000);
});

describe('isEndgameTopicAsk / isEndgamePlayRequest', () => {
  it('a how-to is not a request to play', () => {
    expect(isEndgamePlayRequest('how do I play endgames?')).toBe(false);
    expect(isEndgamePlayRequest('how to play rook endings')).toBe(false);
    expect(isEndgamePlayRequest('play the Lucena with me')).toBe(true);
    expect(isEndgamePlayRequest('let me practise king and pawn endings')).toBe(true);
  });
  it('reads the topic, never a board', () => {
    expect(isEndgameTopicAsk('tell me about the endgame')).toBe(true);
    expect(isEndgameTopicAsk('endgame tips')).toBe(true);
    expect(isEndgameTopicAsk('is this endgame winning?')).toBe(false);
    expect(isEndgameTopicAsk('can I hold this ending?')).toBe(false);
    expect(isEndgameTopicAsk('rook endgames')).toBe(false);
    expect(isEndgameTopicAsk('which endgames am I weakest at?')).toBe(false);
    expect(isEndgameTopicAsk('the Philidor endgame')).toBe(false);
  });
});
