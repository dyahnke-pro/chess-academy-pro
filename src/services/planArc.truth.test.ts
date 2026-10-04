// Plan lines must be true on the board (manual claim check 2026-09-30).
import { describe, it, expect } from 'vitest';
import { stepArc, type Aim, type ArcState } from './planArc';

const announced = (aim: Aim): ArcState => ({ entries: { [aim.id]: { aim, streak: 3, missing: 0, announced: true, steps: 0 } }, done: [], emerged: 1 });

describe('planArc — true on the board', () => {
  it('a different knight reaching the square is not "the knight\'s walk from f3" (item 162)', () => {
    const route: Aim = { id: 'route:n', kind: 'route', squares: ['g1', 'e2', 'e3'], goal: 'e3', phrase: "the knight's walk from f3 to e3", from: 'f3' };
    // White knight lands on e3 from f1 — it came b1-d2-f1, never on the route.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/4N3/PPPP1PPP/R1BQKB1R b KQkq - 1 4';
    const wrong = stepArc(announced(route), [route], { from: 'f1', to: 'e3', piece: 'n' }, fen, 'w', 'student');
    expect(wrong.events.find((e) => e.kind === 'arrive')).toBeUndefined();
    // Control: the route's own knight, stepping from e2, arrives.
    const right = stepArc(announced(route), [route], { from: 'e2', to: 'e3', piece: 'n' }, fen, 'w', 'student');
    expect(right.events.find((e) => e.kind === 'arrive')?.text).toMatch(/That was (?:your|their) plan/);
  });

  it('a knight capture on c3 is not a step toward the c-file (items 171, 172)', () => {
    const file: Aim = { id: 'file:c', kind: 'file', squares: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], goal: null, phrase: 'the c-file' };
    const fen = 'r1bq1rk1/pp3ppp/8/8/8/2n5/P4PPP/R1BQKB1R w KQ - 0 10';
    const out = stepArc(announced(file), [file], { from: 'e4', to: 'c3', piece: 'n' }, fen, 'b', 'opponent');
    expect(out.events.find((e) => /c-file/.test(e.text) && e.kind === 'advance')).toBeUndefined();
  });

  it('a file blocked by the side\'s own pawn is never announced as its plan (items 45, 80)', () => {
    const file: Aim = { id: 'file:c', kind: 'file', squares: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], goal: null, phrase: 'the c-file' };
    const fen = 'r1bqkb1r/pp3ppp/2n2n2/4p3/4P3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 6';
    let st: ArcState = { entries: {}, done: [], emerged: 0 };
    const events = [];
    for (let i = 0; i < 4; i++) { const r = stepArc(st, [file], null, fen, 'w', 'opponent'); st = r.next; events.push(...r.events); }
    expect(events.filter((e) => e.kind === 'emerge')).toHaveLength(0);
    // Control: the same aim for Black, whose c-pawn is gone, does emerge.
    st = { entries: {}, done: [], emerged: 0 };
    const ctl = [];
    for (let i = 0; i < 4; i++) { const r = stepArc(st, [file], null, fen, 'b', 'opponent'); st = r.next; ctl.push(...r.events); }
    expect(ctl.filter((e) => e.kind === 'emerge').length).toBeGreaterThan(0);
  });
});
