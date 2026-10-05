import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lineAchieves, sayLine, weighTwo, notYet, opponentHabits, thinkAloud, depthClauses, obviousStopFlaw } from './thinkAloud';
import { materialPlan, holeAccess } from './moveInsight';

describe('think aloud — the speed-run depth', () => {
  it('a line ends on what it achieves: hxg5 fxg5 opens the h-file toward their king', () => {
    const fen = '6k1/8/5p2/6p1/7P/8/8/4K2R w K - 0 1';
    expect(lineAchieves(fen, ['hxg5', 'fxg5'], 'w')).toMatchObject({ kind: 'file', text: 'the h-file opens toward their king' });
  });
  it('the line in words names their reply as theirs and carries an arrow per ply', () => {
    const fen = '6k1/8/5p2/6p1/7P/8/8/4K2R w K - 0 1';
    const s = sayLine(fen, ['hxg5', 'fxg5'], 'w');
    expect(s?.text).toMatch(/then their f-pawn .*h-file opens/);
    expect(s?.line.plies).toHaveLength(2);
  });
  it('no open-file claim without a rook or queen to use it', () => {
    expect(lineAchieves('6k1/8/5p2/6p1/7P/8/8/4K3 w - - 0 1', ['hxg5', 'fxg5'], 'w').kind).toBe('none');
  });
  it('material is read where the line ends', () => {
    expect(lineAchieves('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', ['Qxd5'], 'w').kind).toBe('material');
  });
  it('on one hand / on the other, each with its own reason', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const w = weighTwo(fen, { san: 'Nf3', pv: ['g1f3'], cp: 40 }, { san: 'Bc4', pv: ['f1c4'], cp: 30 });
    expect(w?.text).toMatch(/knight.*bishop|bishop.*knight/i);
  });
  it('not yet — check first, the capture is still there after', () => {
    const r = notYet('7k/p3R3/8/8/8/8/8/6K1 w - - 0 1', { san: 'Re8+', pv: ['e7e8', 'h8h7', 'e8e7', 'h7g6', 'e7a7'], cp: 500 });
    expect(r?.capture).toBe('Rxa7');
    expect(r?.text).toMatch(/Not yet — first .* with check/);
  });
  it('their habit: the same knight moved three times', () => {
    const h = opponentHabits(['e4', 'Nf6', 'Nc3', 'Nd5', 'Nf3', 'Nb4', 'd4'], 'b');
    expect(h[0]?.text).toMatch(/same piece — that knight has moved three times/);
  });
  it('volume follows criticality: a decision says more than a routine move', () => {
    const fen = '6k1/8/5p2/6p1/7P/8/8/4K3 w - - 0 1';
    const c = [{ san: 'hxg5', pv: ['h4g5', 'f6g5'], cp: 50 }, { san: 'Kf2', pv: ['e1f2'], cp: 0 }];
    const quiet = thinkAloud({ fen, history: [], candidates: c, critical: false });
    const deep = thinkAloud({ fen, history: [], candidates: c, critical: true });
    expect(deep.words).toBeGreaterThan(quiet.words);
    expect(deep.lines.length).toBeGreaterThan(0);
  });
});

describe('the one producer', () => {
  const fen = '7k/p3R3/8/8/8/8/8/6K1 w - - 0 1';
  const topLines = [{ moves: ['e7e8', 'h8h7', 'e8e7', 'h7g6', 'e7a7'], evaluation: 500, mate: null }];
  it('names the line and "not yet" only where the move may be named', () => {
    const named = depthClauses({ fen, history: [], topLines, studentColor: 'w', nameMove: true }).map((d) => d.kind);
    expect(named).toEqual(expect.arrayContaining(['not-yet', 'line']));
    const held = depthClauses({ fen, history: [], topLines, studentColor: 'w', nameMove: false }).map((d) => d.kind);
    expect(held).not.toContain('line');
    expect(held).not.toContain('not-yet');
  });
});

describe('his game-2 read, computed (full transcript)', () => {
  const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
  it('"what does Black want? …Bg4. The obvious move is h3 — but h3 creates a hook"', () => {
    const fen = fenAt('e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 Qh4 Nd2 c6 Bc4 d6 Nf3 Qh5');
    const f = obviousStopFlaw(fen, 'w');
    expect(f?.threatSan).toBe('Bg4');
    expect(f?.stopSan).toBe('h3');
    expect(f?.text).toMatch(/hook/);
  });
  it('inaccessibility: a weak square their knight cannot reach soon is no worry', () => {
    const far = holeAccess('4k3/8/8/8/8/8/5P2/4K3 w - - 0 1', 'f4');
    const near = holeAccess('4k1n1/8/8/8/8/8/5P2/4K3 w - - 0 1', 'f4');
    expect(far?.text).toMatch(/no knight of theirs can get there/);
    expect(near?.text).toMatch(/gets there in two/);
  });
  it('transforming the advantage: the line ends in a pawn ending you are winning', () => {
    const out = lineAchieves('8/2b4R/2k5/4P3/8/6K1/5P2/8 w - - 0 1', ['Rxc7+', 'Kxc7'], 'w');
    expect(out.kind).toBe('pawn-ending');
  });
  it('up the exchange: rooks need open files', () => {
    expect(materialPlan('2b1k3/5ppp/8/8/8/8/5PPP/R3K3 w - - 0 1', 'w')?.text).toMatch(/up the exchange/);
  });
});
