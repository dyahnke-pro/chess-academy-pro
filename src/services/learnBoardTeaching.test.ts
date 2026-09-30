// The composer really carries each lane through (G8.5: a wire that does not
// fire is not a wire). Positions are the computers' own fixtures from his games.
import { describe, it, expect } from 'vitest';
import { studentMoveTeaching, theirMoveTeaching } from './learnBoardTeaching';
import { admitArrows } from './arrowDoor';
import { Chess } from 'chess.js';
import ruleFx from './__fixtures__/ruleException-his.json';
import kingFx from './__fixtures__/kingAttack-his.json';
import falseFx from './__fixtures__/falseAlarm-his.json';

const base = { cpLoss: 0, bothCp: true, bestSan: null, bestLine: undefined, reply: null, cpAfter: null };

describe('learnBoardTeaching — every lane reaches the door', () => {
  it('rule→exception comes out with its claim and event', () => {
    const p = (ruleFx as { key: string; fen: string; san: string; history: string[] }[]).find((x) => x.key === 'UVJ75kdDdt8:14')!;
    const out = studentMoveTeaching({ ...base, fenBefore: p.fen, san: p.san, history: [...p.history, p.san] });
    const rx = out.find((h) => h.lane === 'ruleException');
    expect(rx?.text).toMatch(/hits the pawn on g2/);
    expect(rx?.claims[0]).toMatch(/^rule-twice-/);
    expect(rx?.event?.name).toBe('coach_rule_exception_named');
  });

  it('the timing of a sound move comes out, and not on a costly one (P3 parity)', () => {
    const pre = ['e4', 'e6', 'Nc3', 'a6', 'Nf3', 'e5'];
    const c = new Chess();
    for (const m of pre) c.move(m);
    const out = studentMoveTeaching({ ...base, fenBefore: c.fen(), san: 'Nd5', history: [...pre, 'Nd5'] });
    const t = out.find((h) => h.lane === 'timing');
    expect(t?.text).toBe('The timing of Nd5 matters — a move earlier, their pawn would have taken on d5 and won your knight.');
    expect(t?.claims).toEqual(['timing:Nd5']);
    const bad = studentMoveTeaching({ ...base, cpLoss: 80, fenBefore: c.fen(), san: 'Nd5', history: [...pre, 'Nd5'] });
    expect(bad.some((h) => h.lane === 'timing')).toBe(false);
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

  it('push or hold reaches the door in a close ending', () => {
    // Rook ending, White a pawn up, the student plays a quiet king move.
    const out = studentMoveTeaching({ ...base, fenBefore: 'r5k1/5ppp/8/8/8/8/4PPPP/R5K1 w - - 0 1', san: 'Kf1', history: ['Kf1'], cpAfter: 90 });
    expect(out.find((h) => h.lane === 'pushOrHold')?.claims).toEqual(['ending-rook-endgame-up']);
  });

  it('their move cost reaches the door', () => {
    // V4lW-6f56Cg: "the passive d6 declines the gambit … blocks in the bishop".
    const t = theirMoveTeaching('rnbqkb1r/pppp1ppp/5n2/4p3/4PP2/2N5/PPPP2PP/R1BQKBNR b KQkq - 0 3', 'd6', 'w');
    expect(t?.lane).toBe('theirMoveCost');
    expect(t?.event?.name).toBe('coach_their_move_cost_named');
  });

  it('a spoken idea carries its arrow, and the arrow door admits it (David 2026-09-30)', () => {
    const p = (kingFx as { key: string; fen: string; san: string }[]).find((x) => x.key === 'xoS71OW-Re0:21')!;
    const [h] = studentMoveTeaching({ ...base, fenBefore: p.fen, san: p.san, history: [p.san] }).filter((x) => x.lane === 'kingAttack');
    expect(h.arrows).toEqual([expect.objectContaining({ from: 'e1', to: 'g3', role: 'play' })]);
    const live = new Chess(p.fen); live.move(p.san);
    // Their turn is irrelevant to a plan arrow: the door sets the piece's side to move.
    const drawn = admitArrows(h.arrows, { fen: live.fen(), studentColor: live.turn() === 'w' ? 'black' : 'white' }).arrows;
    expect(drawn.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['e1g3']);
  });
});
