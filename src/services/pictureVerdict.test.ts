// THE PICTURE'S CONCLUSIONS, SECOND HALF (WO-PICTURE-01 P3) on three of
// Danya's article boards, with the engine reads stored here (local Stockfish,
// depth 16, one read per candidate and the MultiPV-3 of the board):
//  - the-positional-rook-lift#2 — "hanging on the precipice, but very
//    difficult to finish him off. …Qf6 is met by Rh5 … …c4 … so the rook lift";
//  - endgame-attacks-part-2#3 — "29.Qc5 leads nowhere after 29…Qd7!";
//  - rooks-on-the-seventh-revisited#2 — "breaking through is a different
//    matter … 36.Rxa5? Rxh5 … the first order of business is to make sure
//    that the h5 pawn is safe": 36.Bf7.
import { describe, it, expect } from 'vitest';
import { pictureVerdictOf, type PictureVerdictIn } from './pictureVerdict';
import { consideredTries } from './tryCandidates';
import { temptingOnBoard, standingRefutations, type WeighRead } from './weighedMoves';
import { readBoard, type PictureCtx } from './boardComputers';
import { planPosed } from './moveInsight';

import { ROOKLIFT, ENDGAME, SEVENTH, type Board, type Row } from '../test/fixtures/pictureBoards';
const read = ([evaluation, moves]: Row): WeighRead => ({ evaluation, mate: null, moves: moves.split(' ') });

const made = new Map<Board, PictureVerdictIn>();
function input(b: Board, keep?: (uci: string) => boolean): PictureVerdictIn {
  if (!keep && made.has(b)) return made.get(b) as PictureVerdictIn;
  const i = build(b, keep);
  if (!keep) made.set(b, i);
  return i;
}
function build(b: Board, keep?: (uci: string) => boolean): PictureVerdictIn {
  const student = b.fen.split(' ')[1] as 'w' | 'b';
  const reads = b.reads.map(read).filter((r, i) => i === 0 || !keep || keep(r.moves[0]));
  const considered = consideredTries(b.fen);
  return {
    fen: b.fen, student, rating: 1800, reads, considered,
    tempting: temptingOnBoard({ fen: b.fen, student, rating: 1800, reads, priorMove: null, considered }),
    standing: standingRefutations({ fen: b.fen, student, rating: 1800, reads, considered }),
    lines: b.top.map(read),
  };
}

describe('pictureVerdict — the verdict read after the tries', { timeout: 60_000 }, () => {
  it('the rook-lift board: better, but hard to finish — …c4 and …Qf6 among the tries that fail', () => {
    const c = pictureVerdictOf(input(ROOKLIFT));
    expect(c?.verdict.kind).toBe('hard-to-finish');
    expect(c?.verdict.word).toBe('slightly better, but hard to finish');
    const names = c?.but.map((t) => t.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(['…c4', '…Qf6', '…Nd4']));
    // …Qf6 goes nowhere: Rh5, and the queen goes back to g6 (his "the queen
    // has to go back") — read off the line returning to the same board.
    const qf6 = c?.but.find((t) => t.name === '…Qf6');
    expect(qf6).toMatchObject({ by: 'returns', reply: 'Rh5', look: 'attack' });
    expect(qf6?.text).toMatch(/…Qf6 (is met by|runs into) Rh5, and the queen (goes|heads straight) back to g6\./);
    // …c4 is the plan's try at the pawn on b3, and the refuter's own words.
    expect(c?.but.find((t) => t.name === '…c4')).toMatchObject({ look: 'plan', target: 'b3', reply: 'bxc4', by: 'result' });
    expect(c?.verdict.text).toMatch(/^You're slightly better, but (it is hard to finish them off|breaking through is another matter)\. .*…c4.* all fail\.$/);
  });

  it('the endgame board: Qc5 to hit b5 fails to …Qd7 — level, with no direct way in', () => {
    const c = pictureVerdictOf(input(ENDGAME));
    expect(c?.but.find((t) => t.name === 'Qc5')).toMatchObject({ look: 'plan', target: 'b5', reply: '…Qd7' });
    expect(c?.verdict.kind).toBe('no-direct-way');
    expect(c?.verdict.text).toMatch(/^It's level, and (there is no direct way in|the direct tries get nowhere)\. .*Qc5.* all fail\.$/);
  });

  it('the seventh-rank board: clearly better, but Rxa5 fails to …Rxh5 and the king walk fails', () => {
    const c = pictureVerdictOf(input(SEVENTH));
    expect(c?.verdict.kind).toBe('hard-to-finish');
    expect(c?.but.find((t) => t.name === 'Rxa5')).toMatchObject({ reply: '…Rxh5', replyTo: 'h5', replyTook: true });
    expect(c?.but.find((t) => t.name === 'Kf4')).toMatchObject({ look: 'king', by: 'material' });
  });

  it('NEGATIVE: no failed try read — the band is said plainly, and no plan is chosen by elimination', () => {
    const c = pictureVerdictOf(input(ROOKLIFT, (u) => u === 'e6c7' || u === 'e6g7'));
    expect(c?.but).toEqual([]);
    expect(c?.verdict).toMatchObject({ kind: 'plain', text: "You're slightly better." });
    expect(c?.plan).toBeNull();
  });

  it('NEGATIVE: a direct try that is the best move and wins material works now — no "but"', () => {
    const fen = '4k3/8/8/3n4/8/8/8/3QK3 w - - 0 1';
    const reads: WeighRead[] = [
      { evaluation: 950, mate: null, moves: ['d1d5', 'e8e7', 'e1e2'] },
      { evaluation: 0, mate: null, moves: ['e1e2', 'd5f4', 'e2e3'] },
    ];
    const c = pictureVerdictOf({ fen, student: 'w', rating: 1800, reads, considered: consideredTries(fen), tempting: [], standing: [] });
    expect(c?.verdict.kind).toBe('works-now');
    expect(c?.verdict.works?.name).toBe('Qxd5');
    expect(c?.plan).toBeNull();
  });

  it('NEGATIVE: a forced mate is the story — no conclusions', () => {
    const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
    const reads: WeighRead[] = [{ evaluation: 100000, mate: 1, moves: ['a1a8'] }, { evaluation: 0, mate: null, moves: ['g1f2', 'g8f8'] }];
    expect(pictureVerdictOf({ fen, student: 'w', rating: 1800, reads, considered: null, tempting: [], standing: [] })).toBeNull();
  });
});

describe('picturePlan — the try that survives, with the computed link', { timeout: 60_000 }, () => {
  it('the rook lift: Kb8 first, then the lift; on f7 the rook hits the knight that answers …d5', () => {
    const p = pictureVerdictOf(input(ROOKLIFT))?.plan;
    expect(p?.san).toBe('…Kb8');
    expect(p?.named).toBe('the rook lift');
    expect(p?.text).toMatch(/^So the slower way: …Kb8 first, then the rook lift\./);
    expect(p?.links).toHaveLength(1);
    expect(p?.links[0]).toMatchObject({ kind: 'hits-replier', moveSan: '…Rf7', at: 'f7', square: 'f3' });
    expect(p?.links[0].text).toBe('On f7 the rook hits their knight, which answers …g4 with Nh4 and …d5 with Nxe5.');
    // NEGATIVE: …Qf6 later in the line guards e5, but the knight that took on
    // e5 has gone to d2 by then — a link holds only while the replier stands.
    expect(p?.links.some((l) => l.moveSan === '…Qf6')).toBe(false);
  });

  it('the seventh-rank board: first Bf7, which guards the h-pawn …Rxh5 takes after Rxa5 or Rd5', () => {
    const p = pictureVerdictOf(input(SEVENTH))?.plan;
    expect(p?.san).toBe('Bf7');
    expect(p?.links).toHaveLength(1);
    expect(p?.links[0]).toMatchObject({ kind: 'guards-taken', at: 'f7', square: 'h5' });
    expect(p?.text).toMatch(/^So (first Bf7|the quiet Bf7 instead)\. On f7 the bishop guards your h-pawn, which …Rxh5 takes after Rxa5 or Rd5\.$/);
    // NEGATIVE: Rxa5, played later in the line, is the failed try itself, not the survivor.
    expect(p?.links.some((l) => l.moveSan === 'Rxa5')).toBe(false);
  });

  it('NEGATIVE: no computed link, no "because" — the endgame board says the survivor alone', () => {
    const p = pictureVerdictOf(input(ENDGAME))?.plan;
    expect(p?.san).toBe('Be2');
    expect(p?.links).toEqual([]);
    expect(p?.text).toMatch(/^So (first Be2|the quiet Be2 instead)\.$/);
  });
});

describe('the registry and the record', { timeout: 60_000 }, () => {
  const ctx = (b: Board): PictureCtx => {
    const i = input(b);
    return { fen: i.fen, student: i.student, rating: 1800, reads: i.reads, considered: i.considered, refuted: { tempting: i.tempting, standing: i.standing }, lines: null };
  };
  it('pictureVerdict and picturePlan read as facts, with the skill the record files', () => {
    const v = readBoard('pictureVerdict', ctx(SEVENTH));
    expect(v).toMatchObject({ computer: 'pictureVerdict', kind: 'verdict', seat: 'student', skill: 'overvalued-attack' });
    const p = readBoard('picturePlan', ctx(SEVENTH));
    expect(p).toMatchObject({ computer: 'picturePlan', kind: 'plan-now', seat: 'student' });
    expect(p?.text).toContain('On f7 the bishop guards your h-pawn');
  });

  it('NEGATIVE: a plain band is the standing\'s to say — no verdict fact', () => {
    const i = input(ROOKLIFT, (u) => u === 'e6c7');
    expect(readBoard('pictureVerdict', { fen: i.fen, student: i.student, rating: 1800, reads: i.reads, considered: i.considered, refuted: null, lines: null })).toBeNull();
  });

  it('both ways: the survivor holds the question, a failed try at a cost misses it, another move answers nothing', () => {
    const lines = [SEVENTH.reads[0], ...SEVENTH.reads.filter(([, m]) => /^(a7a5|d7d5|f3f4) /.test(m))].map(read);
    const tag = (uci: string, cost: number): string[] => planPosed(SEVENTH.fen, uci, cost, lines).map((t) => t.tag);
    expect(tag('c4f7', 0)).toContain('overvalued-attack');
    expect(tag('a7a5', 263)).toContain('overvalued-attack');
    expect(tag('c4d5', 40)).not.toContain('overvalued-attack');
  });
});
