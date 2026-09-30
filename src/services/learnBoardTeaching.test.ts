// The composer really carries each lane through (G8.5: a wire that does not
// fire is not a wire). Positions are the computers' own fixtures from his games.
import { describe, it, expect } from 'vitest';
import { studentMoveTeaching, theirMoveTeaching } from './learnBoardTeaching';
import ruleFx from './__fixtures__/ruleException-his.json';
import kingFx from './__fixtures__/kingAttack-his.json';
import falseFx from './__fixtures__/falseAlarm-his.json';

const base = { cpLoss: 0, bothCp: true, bestSan: null, bestLine: undefined, reply: null };

describe('learnBoardTeaching — every lane reaches the door', () => {
  it('rule→exception comes out with its claim and event', () => {
    const p = (ruleFx as { key: string; fen: string; san: string; history: string[] }[]).find((x) => x.key === 'UVJ75kdDdt8:14')!;
    const out = studentMoveTeaching({ ...base, fenBefore: p.fen, san: p.san, history: [...p.history, p.san] });
    const rx = out.find((h) => h.lane === 'ruleException');
    expect(rx?.text).toMatch(/hits the pawn on g2/);
    expect(rx?.claims[0]).toMatch(/^rule-twice-/);
    expect(rx?.event?.name).toBe('coach_rule_exception_named');
  });

  it('king attack comes out, not on a move that cost a pawn', () => {
    const p = (kingFx as { key: string; fen: string; san: string }[]).find((x) => x.key === 'xoS71OW-Re0:21')!;
    const good = studentMoveTeaching({ ...base, fenBefore: p.fen, san: p.san, history: [p.san] });
    expect(good.some((h) => h.lane === 'kingAttack' && h.claims.includes('prepares:e1g3'))).toBe(true);
    const bad = studentMoveTeaching({ ...base, cpLoss: 150, fenBefore: p.fen, san: p.san, history: [p.san] });
    expect(bad.some((h) => h.lane === 'kingAttack')).toBe(false);
  });

  it('don\'t panic needs the student to have played the engine\'s move', () => {
    const p = (falseFx as { key: string; fenBefore: string; fenAfter: string; best: { cp: number; pv: string[] } }[]).find((x) => x.key === 'uJro3yCDEgk:25')!;
    // No history that leads to this board → nothing is said (the replay guard).
    const out = studentMoveTeaching({
      ...base, fenBefore: p.fenAfter, san: 'Qxd5', history: ['e4', 'Qxd5'], bestSan: 'Qxd5',
      bestLine: { rank: 1, evaluation: p.best.cp, moves: p.best.pv, mate: null },
    });
    expect(out.some((h) => h.lane === 'falseAlarm')).toBe(false);
  });

  it('their move cost reaches the door', () => {
    // V4lW-6f56Cg: "the passive d6 declines the gambit … blocks in the bishop".
    const t = theirMoveTeaching('rnbqkb1r/pppp1ppp/5n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR b KQkq - 0 3', 'd6', 'w');
    expect(t?.lane).toBe('theirMoveCost');
    expect(t?.event?.name).toBe('coach_their_move_cost_named');
  });
});
