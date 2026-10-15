import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { learnMistakeRecurrence } from './learnFundamentalNarration';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import type { WeaknessSignal } from './weaknessSignal';

describe('a plain mistake says when it recurs — the loop out loud (Learn audit 2026-10-15)', () => {
  const c = new Chess();
  for (const m of ['e4', 'e5', 'Nf3', 'Qf6', 'Nc3']) c.move(m);
  const fenBefore = c.fen();
  const history = ['e4', 'e5', 'Nf3', 'Qf6', 'Nc3', 'Qf4'];
  const cls = classifyMisconceptionNow({ fen: fenBefore, playedSan: 'Qf4', bestSan: 'Nc6', historySans: history });
  const signal = (gameId: string): WeaknessSignal => ({
    clusterId: cls?.tag ?? 'none', bucket: 'tactical' as never, label: 'Loose piece', openCount: 2, severity: 60,
    puzzleThemes: [], total: 2, games: [{ gameId, opponentName: 'Coach' }], capabilityTag: null,
  } as unknown as WeaknessSignal);
  it('the classifier names the slip (the tag the record files it under)', () => {
    expect(cls?.tag).toBeTruthy();
  });
  it('a weakness recorded in ANOTHER game is named, once a game', () => {
    const seen = new Set<string>();
    const input = { fenBefore, playedSan: 'Qf4', bestSan: 'Nc6', historySans: history, currentGameId: 'now' };
    expect(learnMistakeRecurrence(input, [signal('earlier')], seen)).toMatch(/You've walked into this before — loose piece/);
    expect(learnMistakeRecurrence(input, [signal('earlier')], seen)).toBeNull();
  });
  it('this game only, or a fresh record: nothing', () => {
    const input = { fenBefore, playedSan: 'Qf4', bestSan: 'Nc6', historySans: history, currentGameId: 'now' };
    expect(learnMistakeRecurrence(input, [signal('now')], new Set())).toBeNull();
    expect(learnMistakeRecurrence(input, [], new Set())).toBeNull();
  });
});

describe('the green direction out loud — held this time (2026-10-15)', () => {
  it('a question failed in another game and held now is named, once a game', async () => {
    const { learnHeldRecurrence } = await import('./learnFundamentalNarration');
    const sig = { clusterId: 'passive-rook', bucket: 'positional', label: 'Passive rook', openCount: 1, severity: 40, puzzleThemes: [], total: 1, games: [{ gameId: 'g1', opponentName: 'Sam' }], capabilityTag: null } as unknown as WeaknessSignal;
    const said = new Set<string>();
    expect(learnHeldRecurrence('passive-rook', [sig], 'g2', said)).toBe('That one has caught you before — passive rook — the last one was against Sam. This time you held it.');
    expect(learnHeldRecurrence('passive-rook', [sig], 'g2', said)).toBeNull();
    expect(learnHeldRecurrence('passive-rook', [sig], 'g1', new Set())).toBeNull();
  });
});
