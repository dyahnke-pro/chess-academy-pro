import { describe, expect, it } from 'vitest';
import { bossGate, withPractice, PRACTICE_GAMES } from './attempts';
import { MISSIONS, type MissionRecordRow } from '../registry';
import type { BossAttemptRecord, MissionId } from '../missionCard';

const attempt = (result: BossAttemptRecord['result'], at: number, targeted: MissionId[] = ['free-piece-stay-ahead']): Pick<BossAttemptRecord, 'result' | 'targeted' | 'at'> => ({ result, at, targeted });
const played = (id: MissionId, ats: number[], watcher = false): MissionRecordRow[] => ats.map((at) => ({ missionId: id, outcome: 'pass-first-try', at, ...(watcher ? { watcher } : {}) }));

describe('after a boss game', () => {
  it('locked stays locked whatever the attempts say', () => {
    expect(bossGate(false, [attempt('win', 1)], [])).toEqual({ kind: 'locked' });
  });

  it('first time: ready; one loss: a rematch', () => {
    expect(bossGate(true, [], [])).toEqual({ kind: 'ready', attempts: 0 });
    expect(bossGate(true, [attempt('loss', 1)], [])).toEqual({ kind: 'ready', attempts: 1 });
  });

  it(`two losses in a row: its weakest target is practised for ${PRACTICE_GAMES} games first`, () => {
    const a = [attempt('loss', 1), attempt('loss', 2)];
    expect(bossGate(true, a, [])).toEqual({ kind: 'practice', cardId: 'free-piece-stay-ahead', remaining: 3 });
    // Watched games and games before the loss do not count as practice.
    const r = [...played('free-piece-stay-ahead', [1.5]), ...played('free-piece-stay-ahead', [3], true), ...played('free-piece-stay-ahead', [4])];
    expect(bossGate(true, a, r)).toEqual({ kind: 'practice', cardId: 'free-piece-stay-ahead', remaining: 2 });
    expect(bossGate(true, a, played('free-piece-stay-ahead', [3, 4, 5]))).toEqual({ kind: 'ready', attempts: 2 });
  });

  it('a draw breaks the losing streak; a win beats it (replayable)', () => {
    expect(bossGate(true, [attempt('loss', 1), attempt('draw', 2), attempt('loss', 3)], [])).toEqual({ kind: 'ready', attempts: 3 });
    expect(bossGate(true, [attempt('loss', 1), attempt('win', 2)], [])).toEqual({ kind: 'beaten', attempts: 2 });
  });

  it('a pair of losses already followed by a rematch is spent', () => {
    const a = [attempt('loss', 1), attempt('loss', 2), attempt('loss', 10)];
    expect(bossGate(true, a, [])).toEqual({ kind: 'ready', attempts: 3 });
  });

  it('a boss that targeted nothing owes no practice', () => {
    expect(bossGate(true, [attempt('loss', 1, []), attempt('loss', 2, [])], [])).toEqual({ kind: 'ready', attempts: 2 });
  });

  it("the practice card takes its phase's slot and stops being watched", () => {
    const fp = MISSIONS['free-piece-stay-ahead'];
    const dc = MISSIONS['develop-and-castle'];
    const r = withPractice([dc], [fp], fp);
    expect(r.cards.map((c) => c.id)).toEqual(['develop-and-castle', 'free-piece-stay-ahead']);
    expect(r.watchers).toEqual([]);
    expect(withPractice([dc], [fp], null)).toEqual({ cards: [dc], watchers: [fp] });
  });
});
