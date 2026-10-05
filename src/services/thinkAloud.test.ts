import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lineAchieves, sayLine, notYet, opponentHabits, depthClauses, obviousStopFlaw } from './thinkAloud';
import { moveWhy } from './deliberation';
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
  it('not yet — check first, the capture is still there after', () => {
    const r = notYet('7k/p3R3/8/8/8/8/8/6K1 w - - 0 1', { san: 'Re8+', pv: ['e7e8', 'h8h7', 'e8e7', 'h7g6', 'e7a7'], cp: 500 });
    expect(r?.capture).toBe('Rxa7');
    expect(r?.text).toMatch(/Not yet — first .* with check/);
  });
  it('their habit: the same knight moved three times', () => {
    // the piece-moved-again count is THE tempo computer's (tempoCount)
    const h = opponentHabits(['e4', 'Nf6', 'Nc3', 'Nd5', 'Nf3', 'Nb4'], 'b');
    expect(h[0]?.kind).toBe('tempo');
  });
});

describe('the one producer', () => {
  const fen = '7k/p3R3/8/8/8/8/8/6K1 w - - 0 1';
  const topLines = [{ moves: ['e7e8', 'h8h7', 'e8e7', 'h7g6', 'e7a7'], evaluation: 500, mate: null }];
  it('names the line and "not yet" only where the move may be named', () => {
    const named = depthClauses({ fen, history: [], topLines, studentColor: 'w', nameMove: true }).map((d) => d.kind);
    // the line wins material, so the LEDGER says it (deliberation), not a 'line' fact
    expect(named).toContain('not-yet');
    expect(named).not.toContain('line');
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
    expect(far).toBeNull();   // no knight of theirs at all: no story
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

describe('several jobs at once, in the door\'s own move-why (catalogue §3; game 1, Bf4)', () => {
  it('Bf4: develops, protects e5 and lines up an x-ray at the queen', () => {
    const c = new Chess();
    for (const m of 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 g6 Bc4 Nb6 Bb3 d6 Qe2 Bg7 O-O O-O h3 dxe5 dxe5 Qc7'.split(' ')) c.move(m);
    const why = moveWhy(c.fen(), 'Bf4', 'w', 'Qc7');
    expect(why).toMatch(/protects your pawn on e5/);
    expect(why).toMatch(/x-ray at their queen on c7/);
  });
});

