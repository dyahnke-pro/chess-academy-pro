import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { narrateOpeningSection } from './openingSectionNarrator';

vi.mock('./coachApi', () => ({
  getCoachChatResponse: vi.fn(),
}));

// Import after mock so vi.mocked() sees the mocked export.
import { getCoachChatResponse } from './coachApi';

describe('narrateOpeningSection', () => {
  beforeEach(async () => {
    vi.mocked(getCoachChatResponse).mockReset();
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string for an empty bullet list without calling the LLM', async () => {
    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'traps',
      bullets: [],
    });
    expect(result).toBe('');
    expect(getCoachChatResponse).not.toHaveBeenCalled();
  });

  it('asks the LLM for a cohesive paragraph and returns the trimmed text', async () => {
    vi.mocked(getCoachChatResponse).mockResolvedValueOnce(
      '  The Fried Liver arises when Black allows Ng5, targeting f7 ...  ',
    );

    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      color: 'white',
      kind: 'traps',
      bullets: ['Watch for Ng5 tactics', 'Defend f7 carefully'],
    });

    expect(result).toBe(
      'The Fried Liver arises when Black allows Ng5, targeting f7 ...',
    );
    expect(getCoachChatResponse).toHaveBeenCalledTimes(1);
    // Ensure the bullets made it into the prompt.
    const [messages] = vi.mocked(getCoachChatResponse).mock.calls[0];
    const userMessage = messages[0].content;
    expect(userMessage).toContain('Italian Game');
    expect(userMessage).toContain('Watch for Ng5 tactics');
    expect(userMessage).toContain('Defend f7 carefully');
    expect(userMessage).toContain('white');
  });

  it('strips wrapping markdown code fences from the LLM output', async () => {
    vi.mocked(getCoachChatResponse).mockResolvedValueOnce(
      '```\nThe key danger is the pin on the c-file.\n```',
    );

    const result = await narrateOpeningSection({
      openingId: 'french-defence',
      openingName: 'French Defence',
      kind: 'warnings',
      bullets: ['Mind the c-file pin'],
    });

    expect(result).toBe('The key danger is the pin on the c-file.');
  });

  it('strips wrapping quotes from the LLM output', async () => {
    vi.mocked(getCoachChatResponse).mockResolvedValueOnce(
      '"Be alert when Black plays c5 — the pawn break undermines the chain."',
    );

    const result = await narrateOpeningSection({
      openingId: 'french-defence',
      openingName: 'French Defence',
      kind: 'warnings',
      bullets: ['c5 break undermines the chain'],
    });

    expect(result).toBe(
      'Be alert when Black plays c5 — the pawn break undermines the chain.',
    );
  });

  it('caches the result so a second call does not re-hit the LLM', async () => {
    vi.mocked(getCoachChatResponse).mockResolvedValueOnce(
      'The Lasker Trap features queenside tactics down the b-file.',
    );

    const input = {
      openingId: 'albin-countergambit',
      openingName: 'Albin Countergambit',
      kind: 'traps' as const,
      bullets: ['Lasker Trap on the b-file'],
    };

    const first = await narrateOpeningSection(input);
    const second = await narrateOpeningSection(input);

    expect(first).toBe(second);
    expect(getCoachChatResponse).toHaveBeenCalledTimes(1);
  });

  it('re-queries the LLM when the bullets change (cache key changes)', async () => {
    vi.mocked(getCoachChatResponse)
      .mockResolvedValueOnce('First paragraph.')
      .mockResolvedValueOnce('Second paragraph.');

    await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'traps',
      bullets: ['A'],
    });
    await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'traps',
      bullets: ['A', 'B'],
    });

    expect(getCoachChatResponse).toHaveBeenCalledTimes(2);
  });

  it('falls back to joined bullets when the LLM call throws', async () => {
    vi.mocked(getCoachChatResponse).mockRejectedValueOnce(new Error('network'));

    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'warnings',
      bullets: ['First point', 'Second point'],
    });

    expect(result).toBe('First point. Second point');
  });

  it('falls back to joined bullets when the LLM returns an empty string', async () => {
    vi.mocked(getCoachChatResponse).mockResolvedValueOnce('');

    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'traps',
      bullets: ['Only bullet'],
    });

    expect(result).toBe('Only bullet');
  });
});
