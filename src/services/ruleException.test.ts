// A rule and its exception (census #10) on his own games.
import { describe, it, expect } from 'vitest';
import { ruleException } from './ruleException';
import fixture from './__fixtures__/ruleException-his.json';

interface P { key: string; fen: string; san: string; history: string[] }
const run = (key: string) => {
  const p = (fixture as P[]).find((x) => x.key === key);
  if (!p) throw new Error(key);
  return ruleException(p.fen, p.san, p.history);
};

describe('ruleException — the rule, and why it bends here', () => {
  it('…Bc6: "a bishop to c6 first, because it hits g2"', () => {
    const out = run('UVJ75kdDdt8:14');
    expect(out?.rule).toBe('twice');
    expect(out?.text).toMatch(/^…Bc6 moves the same piece twice — .* it hits the pawn on g2\.$/);
  });

  it('Na4: "the knight to a4, hitting the queen on b6"', () => {
    expect(run('QUk_oflYX0M:17')?.text).toMatch(/hits the queen on b6/);
  });

  it('…g5: "pushing pawns in front of your king doesn\'t automatically get you mated"', () => {
    const out = run('3XUh57mV8a8:22');
    expect(out?.rule).toBe('shield-pawn');
    expect(out?.text).toMatch(/^…g5 loosens your own king/);
  });

  it('f4: "chases the knight — it does loosen your own position a touch"', () => {
    expect(run('fGBhk9oqdbg:19')?.text).toMatch(/^f4 loosens your own king .* hits the knight on e5/);
  });

  it('Qf3 out early earns it by hitting a pawn it wins', () => {
    expect(run('JyTKdxfD8no:15')?.rule).toBe('early-queen');
  });

  it('says nothing on a forced retreat (Bb3 after the bishop was hit)', () => {
    expect(run('IMBSR0A9nJs:9')).toBeNull();
  });

  it('says nothing on a routine h3 against a pinning bishop', () => {
    expect(run('1PI3xfMiUE4:39')).toBeNull();
  });
});
