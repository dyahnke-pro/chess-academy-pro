// Don't panic (census #7) on his own games. Engine lines stored with the fixture.
import { describe, it, expect } from 'vitest';
import { falseAlarm } from './falseAlarm';
import type { AnalysisLine } from '../types';
import fixture from './__fixtures__/falseAlarm-his.json';

interface P { key: string; fenBefore: string; fenAfter: string; best: { cp: number; pv: string[] } }
const run = (key: string, reply: string | null = null) => {
  const p = (fixture as P[]).find((x) => x.key === key);
  if (!p) throw new Error(key);
  const line: AnalysisLine = { rank: 1, evaluation: p.best.cp, moves: p.best.pv, mate: null };
  return falseAlarm(p.fenBefore, p.fenAfter, line, reply);
};

describe('falseAlarm — the threat you can ignore', () => {
  it('…Bxf2+ is coming, but Qxd5 first: "you move the king to f1"', () => {
    const out = run('uJro3yCDEgk:25');
    expect(out?.text).toMatch(/^Their move threatens …Bxf2\+ .* but you don't have to react: Qxd5 comes first, and if they go ahead with …Bxf2\+, Kf1 answers it\.$/);
  });

  it('once they HAVE played it, no "if" — just the answer', () => {
    expect(run('uJro3yCDEgk:25', 'Bxf2+')?.text).toMatch(/and after …Bxf2\+, Kf1 answers it\.$/);
  });

  it('Rxg1 is on, but …hxg4 first', () => {
    expect(run('UVJ75kdDdt8:36')?.text).toMatch(/threatens Rxg1 .* …hxg4 comes first/);
  });

  it('says nothing when the best move meets the threat (…Nd5 defends c7)', () => {
    expect(run('x-TMzSM51Cw:22')).toBeNull();
  });

  it('says nothing when the best move covers the pawn (Bb2 guards c3)', () => {
    expect(run('zprg2WbmgzQ:15')).toBeNull();
  });
});
