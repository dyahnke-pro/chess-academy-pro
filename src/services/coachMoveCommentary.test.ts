import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import {
  classifyEvalSwing,
  generateMoveCommentary,
} from './coachMoveCommentary';
import * as coachApi from './coachApi';

function gameAfter(moves: string[]): Chess {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
}

describe('classifyEvalSwing', () => {
  it('returns "neutral" when either eval is missing', () => {
    expect(classifyEvalSwing(null, 10, 'w')).toBe('neutral');
    expect(classifyEvalSwing(10, null, 'w')).toBe('neutral');
  });

  it('classifies a big positive swing for White as excellent', () => {
    expect(classifyEvalSwing(0, 120, 'w')).toBe('excellent');
  });

  it('classifies a big negative swing for White as blunder', () => {
    expect(classifyEvalSwing(0, -400, 'w')).toBe('blunder');
  });

  it('inverts perspective for Black', () => {
    expect(classifyEvalSwing(0, 400, 'b')).toBe('blunder');
    expect(classifyEvalSwing(0, -400, 'b')).toBe('excellent');
  });

  it('uses "book" for tiny swings', () => {
    expect(classifyEvalSwing(10, 15, 'w')).toBe('book');
  });
});

describe('generateMoveCommentary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns trimmed LLM output when the call succeeds', async () => {
    const llmOut = 'The f4 push sharpens the center and opens the f-file for a future rook swing, but it commits the king to short castling and concedes the e4 square to Black pieces.';
    const spy = vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockResolvedValue('  ' + llmOut + '  ');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'f4']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: -30,
    });
    expect(out).toBe(llmOut);
    expect(spy).toHaveBeenCalled();
  });

  it('returns empty string when the LLM surfaces the no-key banner', async () => {
    vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockResolvedValue('⚠️ No API key configured.');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
    });
    expect(out).toBe('');
  });

  it('returns empty string when the LLM call rejects', async () => {
    vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockRejectedValue(new Error('network down'));
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
    });
    expect(out).toBe('');
  });

  it('returns empty string when offline=true is passed', async () => {
    const spy = vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockResolvedValue('should not be used');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
      offline: true,
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns empty string when no move has been played yet', async () => {
    const spy = vi.spyOn(coachApi, 'getCoachChatResponse');
    const out = await generateMoveCommentary({
      gameAfter: new Chess(),
      mover: 'w',
      evalBefore: null,
      evalAfter: null,
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes review tone when reviewTone=true', async () => {
    const spy = vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockImplementation(async (_m, systemPrompt) => systemPrompt);
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'Nf3']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
      reviewTone: true,
    });
    // The mock returns the system prompt; it should mention the review context.
    expect(out.toLowerCase()).toContain('reviewing');
    expect(spy).toHaveBeenCalled();
  });

  it('uses the play-context system prompt when reviewTone is omitted', async () => {
    const spy = vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockImplementation(async (_m, systemPrompt) => systemPrompt);
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'Nf3']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
    });
    expect(out.toLowerCase()).toContain('game-against-ai');
    expect(spy).toHaveBeenCalled();
  });

  it('includes the best reply suggestion when provided', async () => {
    const spy = vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockImplementation(async (messages) => JSON.stringify(messages));
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'Nf3']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: 25,
      bestReplySan: 'Nc6',
    });
    expect(out).toContain('Nc6');
    expect(spy).toHaveBeenCalled();
  });

  it('passes the subject to the prompt when provided', async () => {
    vi
      .spyOn(coachApi, 'getCoachChatResponse')
      .mockImplementation(async (messages) => JSON.stringify(messages));
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'c5']),
      mover: 'b',
      evalBefore: 20,
      evalAfter: 25,
      subject: 'Sicilian Najdorf',
    });
    expect(out.toLowerCase()).toContain('sicilian najdorf');
  });
});
