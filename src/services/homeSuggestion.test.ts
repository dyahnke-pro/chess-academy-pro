// THE HOME ROW ROTATES BY NEED (David 2026-10-02: "Make it the most important
// thing but never the same two times in a row … Upload games or tactics or
// learn with coach. Never suggest play with coach." → "just blink the 1-4 tabs
// (rotating according to need) personal algo, not random!").
import { describe, it, expect } from 'vitest';
import { rankFamilies, chooseSuggestion, type SuggestionInput } from './homeSuggestion';
import type { UpNextPick } from './upNextPicker';
import type { UpNextState } from './upNextLoader';

const pick = (kind: UpNextPick['kind'], hub: UpNextPick['hub'], extra: Partial<UpNextPick> = {}): UpNextPick => ({
  kind, key: `up:${kind}`, label: kind, reason: '', bite: '', path: '/', hub, ...extra,
});
const state = (ranked: UpNextPick[], done: string[] = []): UpNextState => ({
  ring: ranked.slice(0, 3), done: new Set(done), current: ranked[0] ?? null, ranked,
});
const input = (ranked: UpNextPick[], o: Partial<SuggestionInput> = {}): SuggestionInput => ({
  state: state(ranked), ownGames: 5, accountLinked: true, ...o,
});

describe('rankFamilies', () => {
  it('no games and no linked account: uploading games matters most (the Weaknesses row)', () => {
    const r = rankFamilies(input([pick('deep-run', 'tactics:deep-run')], { ownGames: 0, accountLinked: false }));
    expect(r[0].family).toBe('upload');
    expect(r[0].pick.hub).toBe('weaknesses');
  });

  it('a linked account is imported weekly already — never asked to upload', () => {
    expect(rankFamilies(input([], { ownGames: 0, accountLinked: true })).map((c) => c.family)).not.toContain('upload');
  });

  it('a slip from the last game outranks everything else', () => {
    const r = rankFamilies(input([pick('game-slip', 'tactics:my mistakes'), pick('opening', 'openings')]));
    expect(r[0].family).toBe('tactics');
  });

  it('openings only when the record has an opening step', () => {
    expect(rankFamilies(input([pick('warm-up', 'tactics:daily')])).map((c) => c.family)).not.toContain('openings');
    expect(rankFamilies(input([pick('opening', 'openings', { reason: 'X is due for review.' })])).map((c) => c.family)).toContain('openings');
  });

  it('Play with Coach is never a candidate', () => {
    const all = rankFamilies(input([pick('game-slip', 'tactics:my mistakes'), pick('opening', 'openings')], { accountLinked: false }));
    expect(all.some((c) => c.pick.path.startsWith('/coach/play'))).toBe(false);
  });

  it('a beginner step leads alone until the path is done', () => {
    const r = rankFamilies(input([pick('start', 'home')]));
    expect(r.map((c) => c.family)).toEqual(['start']);
  });
});

describe('chooseSuggestion', () => {
  const ranked = rankFamilies(input([pick('game-slip', 'tactics:my mistakes')]));

  it('shows the most important family', () => {
    expect(chooseSuggestion(ranked, null)?.family).toBe('tactics');
  });

  it('never the same family two opens in a row', () => {
    expect(chooseSuggestion(ranked, 'tactics')?.family).toBe('learn');
  });

  it('is deterministic — the same record and history give the same row, never a roll', () => {
    expect(chooseSuggestion(ranked, 'learn')?.family).toBe(chooseSuggestion(ranked, 'learn')?.family);
  });

  it('a beginner step repeats on purpose', () => {
    const start = rankFamilies(input([pick('start', 'home')]));
    expect(chooseSuggestion(start, 'start')?.family).toBe('start');
  });
});
