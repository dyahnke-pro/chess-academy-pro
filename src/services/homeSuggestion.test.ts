// THE HOME ROW ROTATES BY NEED (David 2026-10-02: "Make it the most important
// thing but never the same two times in a row … Upload games or tactics or
// learn with coach. Never suggest play with coach." → "just blink the 1-4 tabs
// (rotating according to need) personal algo, not random!").
import { describe, it, expect } from 'vitest';
import { rankFamilies, chooseSuggestion, type SuggestionInput } from './homeSuggestion';
import { PICK_KINDS, type UpNextPick, type ThinkingSignal } from './upNextPicker';
import type { UpNextState } from './upNextLoader';

const pick = (kind: UpNextPick['kind'], hub: UpNextPick['hub'], extra: Partial<UpNextPick> = {}): UpNextPick => ({
  kind, key: `up:${kind}`, label: kind, reason: '', bite: '', path: '/', hub, ...extra,
});
const state = (ranked: UpNextPick[], done: string[] = [], thinking: ThinkingSignal | null = null): UpNextState => ({
  ring: ranked.slice(0, 3), done: new Set(done), current: ranked[0] ?? null, ranked, thinking,
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

describe('the thinking lesson in the Learn family (learn-how-to-think)', () => {
  const think = pick('thinking', 'coach');
  const withThinking = (t: ThinkingSignal, ranked: UpNextPick[] = [think]): SuggestionInput => ({
    state: state(ranked, [], t), ownGames: 5, accountLinked: true,
  });

  it('a RED tier-1 habit makes the lesson the Learn family, above a puzzle weakness, below a fresh slip', () => {
    const r = rankFamilies(withThinking({ state: 'red', skill: 'Hung material', step: 'Am I safe?' }, [
      think, pick('weakness', 'tactics:my mistakes'),
    ]));
    expect(r[0].family).toBe('learn');
    expect(r[0].pick.kind).toBe('thinking');
    const slip = rankFamilies(withThinking({ state: 'red', skill: 'Hung material', step: 'Am I safe?' }, [
      think, pick('game-slip', 'tactics:my mistakes'),
    ]));
    expect(slip[0].family).toBe('tactics');
  });

  it('GREY (never proven) still teaches: the lesson edges past a plain coached game', () => {
    const r = rankFamilies(withThinking({ state: 'grey', skill: 'Hung material', step: 'Am I safe?' }));
    const learn = r.find((c) => c.family === 'learn')!;
    expect(learn.pick.kind).toBe('thinking');
    expect(learn.importance).toBeGreaterThan(60);
  });

  it('no signal → the Learn family is the plain coached game at 60, exactly as before', () => {
    const learn = rankFamilies(input([pick('warm-up', 'tactics:daily')])).find((c) => c.family === 'learn')!;
    expect(learn.pick.kind).toBe('learn');
    expect(learn.importance).toBe(60);
  });

  it('a finished thinking bite falls back to the coached game', () => {
    const r = rankFamilies({ state: state([think], ['up:thinking'], { state: 'red', skill: 'x', step: 'Am I safe?' }), ownGames: 5, accountLinked: true });
    expect(r.find((c) => c.family === 'learn')!.pick.kind).toBe('learn');
  });

  it('every Tactics-hub kind keeps its importance (the table is total now, values unchanged)', () => {
    const expected: Record<string, number> = { 'game-slip': 85, grown: 75, weakness: 70, 'deep-run': 55, 'warm-up': 50, long: 50 };
    for (const [kind, imp] of Object.entries(expected)) {
      const r = rankFamilies(input([pick(kind as UpNextPick['kind'], 'tactics:daily')]));
      expect(r.find((c) => c.family === 'tactics')!.importance).toBe(imp);
    }
    expect(PICK_KINDS).toContain('thinking');
  });
});
