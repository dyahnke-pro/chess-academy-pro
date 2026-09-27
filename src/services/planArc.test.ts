// planArc — each side's plan followed across a real game (the Blumenfeld
// hand-walk, 2026-09-26). Every assertion names the defect it guards; each was
// a real wrong read on this game before the fix.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { planFromUci } from './lookaheadPlan';
import { aimsOf, stepArc, EMPTY_ARC, type ArcEvent, type Aim } from './planArc';

const GAME = 'd4 Nf6 c4 e6 Nf3 c5 d5 b5 b3 Bb7 Nbd2 exd5 cxb5 d6 Bb2 Be7 e3 O-O Bd3 Nbd7 O-O Qc7 Re1 Ne5 Nxe5 dxe5 Rc1 e4 Be2 Qd7 Nf1 Rac8 a4 Qf5 Ng3 Qg6 Be5 Rfd8 a5 Bd6 Bxd6 Rxd6 a6 Ba8 Nh5 Nxh5 Bxh5 Qg5 Qg4 Qxg4 Bxg4 Rc7 Rc2 d4 Rec1 d3 Rxc5 Rxc5 Rxc5 g6 Rc8+ Kg7 Rxa8 d2 Rc8 d1=Q+ Bxd1 Rxd1#'.split(' ');

interface Said extends ArcEvent { ply: number; san: string }

function walk(color: 'w' | 'b'): Said[] {
  const c = new Chess();
  const uci: string[] = []; const fens = [c.fen()];
  const mv: Array<{ from: string; to: string; piece: string; promotion?: string }> = [];
  for (const s of GAME) {
    const m = c.move(s);
    uci.push(m.from + m.to + (m.promotion ?? '')); fens.push(c.fen());
    mv.push({ from: m.from, to: m.to, piece: m.piece, promotion: m.promotion });
  }
  const seat = color === 'w' ? 'opponent' : 'student';
  let st = EMPTY_ARC; const out: Said[] = [];
  for (let i = color === 'w' ? 0 : 1; i < GAME.length; i += 2) {
    // Review's hindsight read: the plan the side actually went on to play.
    const plan = planFromUci(fens[i + 1], uci.slice(i + 1, i + 9), 'black');
    const side = color === 'w' ? plan?.theirs : plan?.mine;
    const r = stepArc(st, side ? aimsOf(side, seat) : [], mv[i], fens[i + 1], color, seat);
    st = r.next;
    for (const e of r.events) out.push({ ...e, ply: i + 1, san: GAME[i] });
  }
  return out;
}

const white = walk('w');
const black = walk('b');
const at = (list: Said[], ply: number, kind: ArcEvent['kind']): Said[] => list.filter((e) => e.ply === ply && e.kind === kind);

describe('planArc on a real game', () => {
  it('follows the knight walk: emerges, steps, ARRIVES on g3', () => {
    expect(white.some((e) => e.kind === 'emerge' && e.id === 'route:n')).toBe(true);
    expect(at(white, 31, 'advance').map((e) => e.id)).toEqual(['route:n']);
    // The route was keyed on the word "knight" while the board speaks "n" —
    // Ng3 read as "another step toward the knight's walk to g3".
    expect(at(white, 35, 'arrive')[0]?.text).toMatch(/knight on g3/);
    expect(at(white, 35, 'advance')).toEqual([]);
  });

  it('a capture landing on the goal is the arrival (Bxd6)', () => {
    expect(at(white, 41, 'arrive')[0]?.text).toMatch(/bishop on d6/);
  });

  it('another piece landing on a route square is not a step on that route', () => {
    // Bd6 once counted as "another step toward the rook's walk to d6".
    expect(black.filter((e) => e.san === 'Bd6' && e.id.startsWith('route:r'))).toEqual([]);
    expect(at(black, 42, 'arrive')[0]?.text).toMatch(/rook on d6/);
  });

  it('an aim the board already shows never "takes shape"', () => {
    // A white rook has stood on c1 since Rc1 — the c-file is held, not a plan.
    expect(white.filter((e) => e.id === 'file:c')).toEqual([]);
  });

  it('an announced route keeps its name until it lands', () => {
    const rookWalk = white.filter((e) => e.id === 'route:r').map((e) => e.text);
    expect(rookWalk.length).toBeGreaterThan(2);
    expect(rookWalk.every((t) => /walk to c8/.test(t))).toBe(true);
  });

  it('pawn pushes step toward the passer, and promotion is its arrival', () => {
    expect(black.filter((e) => e.san === 'd4' || e.san === 'd3').every((e) => e.kind === 'drop' || e.id === 'passer:d')).toBe(true);
    expect(at(black, 66, 'arrive')[0]?.text).toMatch(/pawn has queened on d1.*passed pawn/);
  });

  it('a landing move carries no "let it go" beside it', () => {
    for (const list of [white, black]) {
      const plies = new Set(list.filter((e) => e.kind === 'arrive').map((e) => e.ply));
      expect(list.filter((e) => e.kind === 'drop' && plies.has(e.ply))).toEqual([]);
    }
  });

  it('stems rotate — the same opener never twice running', () => {
    const emerges = white.filter((e) => e.kind === 'emerge').map((e) => e.text.split(':')[0]);
    for (let i = 1; i < emerges.length; i += 1) expect(emerges[i]).not.toBe(emerges[i - 1]);
  });
});

describe('stepArc rules', () => {
  const outpost: Aim = { id: 'outpost:d5', kind: 'outpost', squares: ['d5'], goal: 'd5', phrase: 'the outpost on d5' };
  const EMPTY_BOARD = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

  it('one read is a whim, two is a plan', () => {
    const a = stepArc(EMPTY_ARC, [outpost], null, EMPTY_BOARD, 'w', 'opponent');
    expect(a.events).toEqual([]);
    const b = stepArc(a.next, [outpost], null, EMPTY_BOARD, 'w', 'opponent');
    expect(b.events.map((e) => e.kind)).toEqual(['emerge']);
  });

  it('drops only after two reads missing, and never says it twice', () => {
    let st = stepArc(EMPTY_ARC, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    st = stepArc(st, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    const miss1 = stepArc(st, [], null, EMPTY_BOARD, 'w', 'opponent');
    expect(miss1.events).toEqual([]);
    const miss2 = stepArc(miss1.next, [], null, EMPTY_BOARD, 'w', 'opponent');
    expect(miss2.events.map((e) => e.kind)).toEqual(['drop']);
    expect(stepArc(miss2.next, [], null, EMPTY_BOARD, 'w', 'opponent').events).toEqual([]);
  });

  it('an arrived aim never re-announces', () => {
    let st = stepArc(EMPTY_ARC, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    st = stepArc(st, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    const onD5 = '4k3/8/8/3N4/8/8/8/4K3 b - - 0 1';
    const hit = stepArc(st, [], { from: 'f4', to: 'd5', piece: 'n' }, onD5, 'w', 'opponent');
    expect(hit.events.map((e) => e.kind)).toEqual(['arrive']);
    let after = hit.next;
    for (let i = 0; i < 3; i += 1) {
      const r = stepArc(after, [outpost], null, EMPTY_BOARD, 'w', 'opponent');
      expect(r.events).toEqual([]);
      after = r.next;
    }
  });
});

describe('the arc reaches the review narration', () => {
  it('a real review speaks a plan landing', async () => {
    const { buildReviewSegments } = await import('./coachFeatureService');
    type Input = Parameters<typeof buildReviewSegments>[0][number];
    const c = new Chess();
    const inputs = GAME.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as Input; });
    const segs = buildReviewSegments(inputs, 'black', 'Blumenfeld Countergambit', true, 1500);
    const arcs = segs.filter((s) => /That was the plan|plan is taking shape|what (they are after|you are building)|let .* go\./.test(s.narration ?? ''));
    expect(arcs.length).toBeGreaterThan(0);
    expect(segs.some((s) => /There it is — their knight on g3/.test(s.narration ?? ''))).toBe(true);
  }, 120000);
});
