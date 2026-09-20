// WHY SECTION 14 DECLINED — the measurement that decides whether its three
// detectors are gated CORRECTLY or gated TOO TIGHTLY (2026-09-20).
//
// They shipped, four real prod games went through them, and not one fired. A
// guess about why is worth nothing, so each detector now says which gate
// stopped it — the same `diag` shape `findTheoryDeparture` has carried since
// July, and for the same reason: a silent null must never be undiagnosable.
// This gate proves the reasons are REAL (they name the gate and the number),
// not decoration, and that they cost nothing when nobody asks.
import { describe, it, expect } from 'vitest';
import { attributePrinciples } from './principleAttribution';
import { classifyMisconception } from './misconceptionClassifier';

const ALAPIN = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6'];
const base = { historySans: ALAPIN, bestSan: 'e6', classification: 'mistake' as const };

describe('section 14 says which gate stopped it', () => {
  it('calculation-depth names the missing eval, then the floor, then the PV shape', () => {
    const live: string[] = [];
    attributePrinciples({ ...base }, live);
    expect(live.join(' | ')).toMatch(/calculation-depth: no persisted eval \(live path\)/);

    const cheap: string[] = [];
    attributePrinciples({ ...base, evalBefore: 30, evalAfterPlayed: -20 }, cheap);
    expect(cheap.join(' | ')).toMatch(/calculation-depth: cost 50cp is under the 150cp floor/);

    const shallow: string[] = [];
    attributePrinciples({ ...base, evalBefore: 30, evalAfterPlayed: -200, pvAfterPlayed: ['Nf3'] }, shallow);
    expect(shallow.join(' | ')).toMatch(/calculation-depth: punishing PV is 1 plies, needs 3/);

    const immediate: string[] = [];
    attributePrinciples({ ...base, evalBefore: 30, evalAfterPlayed: -200, pvAfterPlayed: ['Bxf6', 'gxf6', 'Qh5'] }, immediate);
    expect(immediate.join(' | ')).toMatch(/calculation-depth: the punishment Bxf6 is immediate \(ply 1\)/);
  });

  it('left-book-early names the window, the earliness, or that the move IS book', () => {
    const late: string[] = [];
    // A 30-ply history is past the opening window.
    const long = [...ALAPIN, 'Nf3', 'd6', 'exd6', 'Qxd6', 'Be2', 'Bg4', 'O-O', 'e6', 'Be3', 'Be7', 'd5', 'exd5', 'Nxd5', 'Qxd5', 'Qxd5', 'Nxd5'];
    attributePrinciples({ historySans: long, bestSan: 'O-O', classification: 'mistake' }, late);
    expect(late.join(' | ')).toMatch(/left-book-early: ply \d+ is past the 24-ply opening window/);

    const early: string[] = [];
    attributePrinciples({ historySans: ['e4', 'c5', 'c3', 'a6'], bestSan: 'Nf6', classification: 'mistake' }, early);
    expect(early.join(' | ')).toMatch(/left-book-early: ply 4 is too early/);
  });

  it('no-plan names the opening, a planless structure, or a move that DOES serve the plan', () => {
    const opening: string[] = [];
    attributePrinciples({ ...base }, opening);
    expect(opening.join(' | ')).toMatch(/no-plan: ply \d+ is still the opening/);
  });

  it('the reasons ride out on the `other` fallthrough — the 23% bucket can be measured', async () => {
    // A real middlegame slip that no board heuristic and no fundamental can
    // name — the honest shape of the 23% bucket. `why` must ride out with it.
    const sans = ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'b3', 'b6', 'Bb2', 'Bb7', 'Nbd2', 'Nbd7', 'c4', 'c5', 'Rc1', 'Rc8', 'a3', 'a6', 'h3', 'h6', 'Re1', 'Re8', 'Qe2', 'Qe7'];
    const { Chess } = await import('chess.js');
    const board = new Chess();
    for (const m of sans.slice(0, -1)) board.move(m);
    const c = await classifyMisconception({
      fen: board.fen(),
      playedSan: sans[sans.length - 1],
      bestSan: 'Qc7',
      gamePhase: 'middlegame',
      historySans: sans,
    });
    expect(c).toBeTruthy();
    expect(Array.isArray(c?.why), `tag was ${c?.tag}; why=${JSON.stringify(c?.why)}`).toBe(true);
    expect((c?.why ?? []).length).toBeGreaterThan(0);
    // Every reason names its fundamental and a concrete gate, never a bare "no".
    for (const r of c?.why ?? []) {
      expect(r).toMatch(/^(calculation-depth|left-book-early|no-plan): .{10,}/);
    }
  });

  it('costs nothing when nobody asks — no sink, no reasons, same result', () => {
    const withSink: string[] = [];
    const a = attributePrinciples({ ...base, evalBefore: 30, evalAfterPlayed: -200 }, withSink);
    const b = attributePrinciples({ ...base, evalBefore: 30, evalAfterPlayed: -200 });
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(withSink.length).toBeGreaterThan(0);
  });
});
