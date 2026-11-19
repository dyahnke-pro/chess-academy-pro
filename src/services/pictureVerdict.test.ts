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

type Row = [number, string];
interface Board { fen: string; top: Row[]; reads: Row[] }
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

const ROOKLIFT = {
  fen: '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25',
  top: [
    [-126, 'c8b8 e1e2 d8d7 d1a1 b8c8 e2e1 c8c7 e1f1 d7f7 f3d2 g6f6 f1e2'],
    [-121, 'g6f6 d3d4 e5d4 c3d4 g5g4 d4d5 g4f3 d5e6 f6e6 h6f4 e6e4'],
    [-110, 'd8d7 d1a1 c8b8 e1e2 g6f7 a1f1 a6a5 f1a1 g5g4 f3e1 d6d5 a1a5'],
  ],
  reads: [
    [-126, 'c8b8 e1e2 d8d7 d1a1 b8c8 e2e1 c8c7 e1f1 d7f7 f3d2 g6f6 f1e2'],
    [-50, 'c5c4 b3c4 b5c4 d3c4 g6e4 e3e4 b7e4 f3d2 e4b7 d2f1 d8d7 f1e3 e6c5'],
    [-21, 'g5g4 f3h4 g6h5 h4f3 h5f7 f3g5 e6g5 h6g5 d8d7 c3c4 h7h5 e3d2 b5b4'],
    [123, 'd6d5 f3e5 g6f6 f2f4 d5e4 d3e4 f6e7 h2d2 d8d2 d1d2 g5f4 h6f4 e6f4'],
    [-79, 'b7c6 b3b4 c5c4 d3c4 g6e4 e3e4 c6e4 f3d2 e4b7 c4b5 a6b5 f2f3 g8g6'],
    [291, 'b7e4 d3e4 g6f6 b3b4 c5b4 c3b4 c8b7 h2h5 d6d5 h6g5 e6g5 f3g5 d5d4'],
    [-117, 'g6f6 h2h5 f6g6 h5h2 d8d7 f3d2 e6d8 e1e2 d8f7 d1h1 d6d5 e4d5 b7d5'],
    [569, 'g6h6 h2h6 e6f4 g3f4 g5f4 e3e2 d8d7 b3b4 c5b4 c3b4 g8g6 h6h5 c8b8'],
    [701, 'g6e4 d3e4 g5g4 f3g5 e6g5 h6g5 g8g5 e3g5 b7c6 h2h6'],
    [296, 'e6d4 c3d4 c5d4 e3g5 g6e6 g5h4 c8b8 f3d2 d8e8 f2f4 g8g6 f4f5'],
    [505, 'b7d5 e4d5 e6c7 e3g5 g6f7 g5h5 f7d5 c3c4 d5b7 h5f5 c8b8 f5e4 b7c8'],
    [161, 'e6c7 f3g5 d8e8 e1e2 c7e6 g5e6 e8e6 d1g1 g6f7 f2f4'],
    [165, 'e6g7 h6g5 d8d7 h2h6 g6f7 b3b4 c5b4 d1c1 c8b8 c3b4 g7e6'],
    [292, 'e6f4 h6g5 d8e8 g3f4 e5f4 g5f4 b7e4 f3h4 g6h5 e1d2 e4f5 h4f5 h5f5'],
    [23, 'b5b4 c3b4 c5b4 d1c1 c8b8 e3b6 g6f6 f3g5 g8g5 c1c6 d8c8 c6d6 g5g6'],
  ],
};
const ENDGAME = {
  fen: '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29',
  top: [
    [-7, 'f1e2 b7e7 e2b5 a4a3 b2a3 e7a3 d4d8 g8h7 d8d2 a3c5 b5e2 c5f5'],
    [-11, 'g1g2 b7e7 f1b5 a4a3 b2a3 e7a3 b5e2 a3b2 g2f1 b2c1 f1g2 c1e1'],
    [-34, 'd4d8 g8h7 d8d4 b7a6 d4c5 a4a3 b2a3 a6a4 f1e2 a4c2 c5b5 c2c3'],
  ],
  reads: [
    [-7, 'f1e2 b7e7 e2b5 a4a3 b2a3 e7a3 d4d8 g8h7 d8d2 a3c5 b5e2 c5f5'],
    [-33, 'd4d8 g8h7 d8d4 h6h5 f1e2 b7c6 g1f2 f6g4 f2g1 g4h6 e2f1 h6f5 d4e5'],
    [-159, 'f1h3 b7d5 h3f1 d5f5 d4a7 f5f3 f1b5 g8h7 b5c4 f3d1 c4f1 d1c2 a7a5'],
    [-71, 'f1g2 b7d5 d4d5 f6d5 g1f2 d5c3 f2e1 b5b4 e1d2 c3d5 g2e4 d5b6 e4d3'],
    [-489, 'f1b5 b7b5 c3c4 b5a5 h2h3 a5e1 g1g2 e1e2 g2g1 e2f3 c4c5 f3g3 g1f1'],
    [-587, 'd4f6 g7f6 h2h4 b7b6 h4h5 b6e3 g1h1 e3c1 h1g1 c1b2 c3c4 a4a3 c4b5'],
    [-205, 'c3c4 b5b4 c4c5 a4a3 b2a3 b4a3 f1c4 b7b1 g1g2 b1c2 g2h3 c2f2 c5c6'],
    [-39, 'd4d6 h6h5 f1e2 g8h7 d6d4 b7c6 e2f1 c6a6 h2h3 a4a3 b2a3 a6a3 f1b5'],
    [-100, 'd4c5 b7d7 c5b5 d7d2 b5e2 d2c1 g1f2 h6h5 h2h3 f6d5 f5f6 g7g6 g3g4'],
    [-163, 'd4e5 b5b4 c3b4 b7b4 e5b5 b4e1 b5e2 e1c1 g1f2 h6h5 h2h3 f6d5 f1g2'],
    [-684, 'd4e4 b7e4 f1d3 e4e3 g1g2 e3d3 g3g4 f6e4 b2b3 a4b3 g4g5 h6g5'],
    [-110, 'd4b4 b7d7 b4b5 d7d2 b5e2 d2c1 g1f2 h6h5 h2h3 f6d5 f1g2 d5e3 g2e4'],
    [-721, 'd4a4 b5a4 b2b4 a4b3 f1c4 f6g4 h2h4 b7c7 g1g2 b3b2 c4a2 g4e3 g2f2'],
    [-775, 'd4b6 b7b6 f1e2 b6e3 g1f1 e3d2 g3g4 d2b2 f1e1 b2c3 e1f1'],
    [-866, 'd4d5 b7d5 f1e2 d5d2 g1f1 d2c1 f1f2 c1b2 f2e1 a4a3 e2d3 b2c3 e1d1'],
    [-1107, 'd4d7 b7d7 h2h3 d7d2 f1b5 d2c1 b5f1 c1b2 g3g4 a4a3 f1c4 b2c3 g4g5'],
    [-1333, 'd4a7 b7a7 g1f2 f6g4 f2e1 a7e3 f1e2 e3c1 e2d1 c1b2 d1g4 a4a3 h2h4'],
    [-1529, 'd4d3 e4d3 f1e2 b7e4 e2d1 e4e3 g1g2 f6e4 g2h3 d3d2 d1c2 e3f2 c2d1'],
    [-1118, 'd4c4 b5c4 f1c4 b7b2 h2h3 b2c3 g3g4 a4a3 g4g5 c3c4 g5g6 a3a2 g6f7'],
    [-396, 'b2b3 a4b3 d4b4 b7d5 c3c4 b5c4 f1c4 d5d1 g1g2 d1f3 g2g1 f3e3 g1g2'],
  ],
};
const SEVENTH = {
  fen: '5r1k/R2R2p1/7p/p4prP/2B5/5K2/8/8 w - - 0 36',
  top: [
    [279, 'c4f7 f5f4 f7g6 g5g3 f3f2 f8g8 a7a5 g3c3 a5a2 c3c8 d7d2 c8b8'],
    [268, 'c4d5 f5f4 d5f7 a5a4 a7a4 g5g3 f3f2 g3h3 a4a7 f8b8 f7g6 b8b2'],
    [264, 'c4e6 f5f4 e6f7 a5a4 f7g6 g5g3 f3f2 f8b8 a7a4 b8b2 f2f1 g3f3'],
  ],
  reads: [
    [279, 'c4f7 f5f4 f7g6 g5g3 f3f2 f8g8 a7a5 g3c3 a5a2 c3c8 d7d2 c8b8'],
    [-377, 'd7g7 g5g7 a7a6 f5f4 c4e2 g7g5 a6h6 h8g7 h6a6 g5h5 a6a7 g7h8 f3g4'],
    [16, 'a7a5 g5h5 c4d3 h5g5 a5c5 h8g8 f3e2 f5f4 c5g5 f4f3 e2d1'],
    [249, 'c4e6 f5f4 e6f7 g5g3 f3f4 g3g2 f4e4 g2g1 f7g6 g1e1 e4d5 e1d1 d5c5'],
    [239, 'c4d5 a5a4 d5f7 f5f4 f7g6 g5g3 f3f2 a4a3 d7f7 f8b8 f7f4 g3c3 f2e1'],
    [0, 'f3f4 g5g4 f4f3 g4c4 d7g7 c4g4 g7h7 h8g8 h7h6 g4g7 h6g6 g7g6 h5g6'],
    [248, 'f3e3 f5f4 e3f2 f8b8 c4f7 g5g3 f7g6 b8b2 f2f1 g3f3 f1e1 f3e3 e1d1'],
    [236, 'd7f7 f8c8 c4e6 c8e8 e6d7 e8b8 f7f5 g5g1 d7b5 b8d8 b5e2 g1c1 f3f2'],
    [13, 'd7d5 g5h5 d5a5 h5g5 c4d3 h6h5 f3f4 g5g1 a5f5 f8f5 d3f5 h8g8 f4e5'],
    [-494, 'a7a8 f8a8 c4d5 a8f8 d5f7 f8f7 d7f7 g5h5 f3f4 h8h7 f7a7 h5h4 f4f5'],
    [239, 'a7b7 a5a4 c4f7 f5f4 f7g6 g5g3 f3f2 g3b3 b7a7 b3b2 f2f3 b2b3 f3g4'],
    [-485, 'd7d8 f8d8 c4f7 d8f8 f7g6 f5f4 a7a6 g5c5 a6a7 c5c3 f3f2 f8b8 f2f1'],
    [258, 'd7e7 f5f4 c4f7 g5g3 f3f2 f8b8 f7g6 g3h3 e7b7 b8d8 b7f7 f4f3 f7f3'],
    [271, 'f3f2 g5g4 c4f7 g4e4 f2f3 f8b8 a7a5 e4h4 a5f5 h4b4 f5a5 b4b5'],
    [256, 'f3e2 f5f4 c4f7 f4f3 e2f2 a5a4 d7d3 g5b5 d3f3 b5b2 f2g3 b2b5 f3a3'],
  ],
};

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
