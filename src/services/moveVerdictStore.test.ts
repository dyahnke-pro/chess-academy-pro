import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { applyVerdict, getVerdicts, saveVerdict, toVerdictLabel, verdictKey } from './moveVerdictStore';

const FEN = 'r1b2rk1/pp1n1pbp/2pp1np1/q3p3/2PPP3/2N1BN1P/PPQ1BPP1/R4RK1 b - - 0 15';

beforeEach(async () => { await db.delete(); await db.open(); });

describe('moveVerdictStore — one verdict per move', () => {
  it('keys by position (no move counters) and SAN (no check marks)', () => {
    expect(verdictKey(FEN, 'Qh4+')).toBe(verdictKey(FEN.replace(' 0 15', ' 3 40'), 'Qh4'));
  });

  it('the first write wins — a later grade never rewrites what the student heard', async () => {
    await saveVerdict({ fenBefore: FEN, san: 'Qh4', label: 'mistake', cpLoss: 148, bestUci: 'g3f1', depth: 14, source: 'learn' });
    await saveVerdict({ fenBefore: FEN, san: 'Qh4', label: 'fine', cpLoss: 20, bestUci: 'g3f1', depth: 16, source: 'review' });
    const v = (await getVerdicts([verdictKey(FEN, 'Qh4')])).get(verdictKey(FEN, 'Qh4'));
    expect(v?.label).toBe('mistake');
    expect(v?.source).toBe('learn');
  });

  it('review keeps its own positive flavour; the stored verdict decides the fault', () => {
    const fine = { key: 'k', label: 'fine' as const, cpLoss: 0, bestUci: null, depth: 14, source: 'learn' as const, recordedAt: 0 };
    const mistake = { ...fine, label: 'mistake' as const };
    expect(applyVerdict('great', fine, false)).toBe('great');
    expect(applyVerdict('mistake', fine, false)).toBe('good');
    expect(applyVerdict('good', mistake, false)).toBe('mistake');
    expect(applyVerdict('good', mistake, true)).toBe('book');
    expect(applyVerdict('good', { ...fine, label: 'blunder' }, true)).toBe('blunder');
    expect(applyVerdict('inaccuracy', undefined, false)).toBe('inaccuracy');
    expect(toVerdictLabel('best')).toBe('fine');
  });
});
