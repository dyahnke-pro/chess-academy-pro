import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { narrateOpeningSection } from './openingSectionNarrator';

// GROUNDED (David 2026-07-09: one LLM command). The authored bullets ARE the
// facts; narrateOpeningSection voices them through voiceFacts, which adds
// NOTHING (so the old "invent a visual cue" hallucination is impossible). These
// mock voiceFacts to assert the bullets reach the one chokepoint + the cache /
// fallback behavior.
vi.mock('./coachApi', () => ({
  voiceFacts: vi.fn(),
}));

import { voiceFacts } from './coachApi';

describe('narrateOpeningSection (grounded)', () => {
  beforeEach(async () => {
    vi.mocked(voiceFacts).mockReset();
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
    expect(voiceFacts).not.toHaveBeenCalled();
  });

  it('voices the bullets as facts through the one chokepoint', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce(
      '  The Fried Liver arises when Black allows Ng5, targeting f7 ...  ',
    );

    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      color: 'white',
      kind: 'traps',
      bullets: ['Watch for Ng5 tactics', 'Defend f7 carefully'],
    });

    expect(result).toBe('The Fried Liver arises when Black allows Ng5, targeting f7 ...');
    expect(voiceFacts).toHaveBeenCalledTimes(1);
    // The bullets + opening name are the FACTS passed to the chokepoint.
    const [facts, opts] = vi.mocked(voiceFacts).mock.calls[0];
    expect(facts).toContain('Italian Game');
    expect(facts).toContain('Watch for Ng5 tactics');
    expect(facts).toContain('Defend f7 carefully');
    expect(facts).toContain('white');
    expect(opts).toMatchObject({ warm: true });
  });

  it('strips wrapping markdown code fences from the output', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce('```\nThe key danger is the pin on the c-file.\n```');
    const result = await narrateOpeningSection({
      openingId: 'french-defence',
      openingName: 'French Defence',
      kind: 'warnings',
      bullets: ['Mind the c-file pin'],
    });
    expect(result).toBe('The key danger is the pin on the c-file.');
  });

  it('strips wrapping quotes from the output', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce(
      '"Be alert when Black plays c5 — the pawn break undermines the chain."',
    );
    const result = await narrateOpeningSection({
      openingId: 'french-defence',
      openingName: 'French Defence',
      kind: 'warnings',
      bullets: ['c5 break undermines the chain'],
    });
    expect(result).toBe('Be alert when Black plays c5 — the pawn break undermines the chain.');
  });

  it('caches the result so a second call does not re-hit the LLM', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce('The Lasker Trap features queenside tactics down the b-file.');
    const input = {
      openingId: 'albin-countergambit',
      openingName: 'Albin Countergambit',
      kind: 'traps' as const,
      bullets: ['Lasker Trap on the b-file'],
    };
    const first = await narrateOpeningSection(input);
    const second = await narrateOpeningSection(input);
    expect(first).toBe(second);
    expect(voiceFacts).toHaveBeenCalledTimes(1);
  });

  it('re-queries when the bullets change (cache key changes)', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce('First paragraph.').mockResolvedValueOnce('Second paragraph.');
    await narrateOpeningSection({ openingId: 'italian-game', openingName: 'Italian Game', kind: 'traps', bullets: ['A'] });
    await narrateOpeningSection({ openingId: 'italian-game', openingName: 'Italian Game', kind: 'traps', bullets: ['A', 'B'] });
    expect(voiceFacts).toHaveBeenCalledTimes(2);
  });

  it('falls back to joined bullets when the LLM call throws', async () => {
    vi.mocked(voiceFacts).mockRejectedValueOnce(new Error('network'));
    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'warnings',
      bullets: ['First point', 'Second point'],
    });
    expect(result).toBe('First point. Second point');
  });

  it('falls back to joined bullets when the LLM returns an empty string', async () => {
    vi.mocked(voiceFacts).mockResolvedValueOnce('');
    const result = await narrateOpeningSection({
      openingId: 'italian-game',
      openingName: 'Italian Game',
      kind: 'traps',
      bullets: ['Only bullet'],
    });
    expect(result).toBe('Only bullet');
  });
});
