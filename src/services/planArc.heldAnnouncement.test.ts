// A HELD PLAN ANNOUNCEMENT IS OFFERED AGAIN (WO-STORY-MATRIX-01 P1-8f). Learn
// stored each side's arc with a plan marked announced the moment it emerged,
// before the door decided — so an announcement the door held was never offered
// again. The arc now keeps it unannounced until the line is kept
// (`withAnnouncement`), and the next read announces it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';
import { aimsOf, stepArc, withAnnouncement, EMPTY_ARC, type ArcState } from './planArc';

const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5'.split(' ');

/** White's arc walked move by move; `hold` says, for each announcement, whether
 *  the door held its line (true: the arc keeps it unannounced). */
function walkWhite(hold: (ply: number) => boolean): Array<{ ply: number; ids: readonly string[] }> {
  const c = new Chess();
  const uci: string[] = []; const fens = [c.fen()];
  const mv: Array<{ from: string; to: string; piece: string; promotion?: string }> = [];
  for (const s of GAME) {
    const m = c.move(s);
    uci.push(m.from + m.to + (m.promotion ?? '')); fens.push(c.fen());
    mv.push({ from: m.from, to: m.to, piece: m.piece, promotion: m.promotion });
  }
  let st: ArcState = EMPTY_ARC;
  const announced: Array<{ ply: number; ids: readonly string[] }> = [];
  for (let i = 0; i < GAME.length; i += 2) {
    const plan = planFromUci(fens[i + 1], uci.slice(i + 1, i + 9), 'black', null);
    const r = stepArc(st, plan?.theirs ? aimsOf(plan.theirs, 'opponent') : [], mv[i], fens[i + 1], 'w', 'opponent');
    const ids = r.events.flatMap((e) => (e.kind === 'emerge' ? [...(e.announces ?? [e.id])] : []));
    if (ids.length) announced.push({ ply: i + 1, ids });
    st = ids.length && hold(i + 1) ? withAnnouncement(r.next, ids, false) : r.next;
  }
  return announced;
}

describe('a held plan announcement', () => {
  it('every emerge names the aims it announces', () => {
    const said = walkWhite(() => false);
    expect(said.length).toBeGreaterThan(0);
    for (const s of said) expect(s.ids.length).toBeGreaterThan(0);
  });

  it('is offered again on the next read that still reads it, where a kept one is not', () => {
    // 21.Bxd6: White's attack on the king emerges, and 22.a6 reads it again.
    const kept = walkWhite(() => false);
    expect(kept.find((s) => s.ply === 41)?.ids).toEqual(['king-attack']);
    expect(kept.some((s) => s.ply === 43)).toBe(false);
    // The door held it at 21.Bxd6: the next read announces it again.
    const held = walkWhite((ply) => ply === 41);
    expect(held.find((s) => s.ply === 43)?.ids).toEqual(['king-attack']);
  });

  it('a plan the next read no longer holds is not announced late', () => {
    // 15.Be2: the knight walk emerges; held, and gone from 16.Nf1's read, it
    // is simply not said — never "announced" without a word.
    const held = walkWhite((ply) => ply === 29);
    expect(held.some((s) => s.ply === 31)).toBe(false);
  });

  it('Learn keeps a held announcement unannounced and adopts a kept one (wiring)', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/opponent: withAnnouncement\(theirStep\.next, heldIds\(theirStep\.events\), false\)/);
    expect(page).toMatch(/student: mineStep \? withAnnouncement\(mineStep\.next, heldIds\(mineStep\.events\), false\)/);
    expect(page).toMatch(/withAnnouncement\(arc\[x\.seat\], x\.ids, true\)/);
  });
});
