// planArc — each side's plan followed across a real game (the Blumenfeld
// hand-walk, 2026-09-26). Every assertion names the defect it guards; each was
// a real wrong read on this game before the fix.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { planFromUci } from './lookaheadPlan';
import { aimsOf, aimWalkableNow, joinEmerges, stepArc, EMPTY_ARC, type ArcEvent, type Aim } from './planArc';

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
    expect(rookWalk.every((t) => /getting the rook to c8/.test(t))).toBe(true);
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

  it('a plan never pursued leaves silently — no "they have let it go" (2026-09-30)', () => {
    // Measured on 20 of his games: 18 of 23 announced opponent plans were
    // "let go" within two moves with no move made toward them — the engine's
    // line changing, not the opponent changing their mind.
    let st = stepArc(EMPTY_ARC, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    st = stepArc(st, [outpost], null, EMPTY_BOARD, 'w', 'opponent').next;
    const miss1 = stepArc(st, [], null, EMPTY_BOARD, 'w', 'opponent');
    expect(miss1.events).toEqual([]);
    const miss2 = stepArc(miss1.next, [], null, EMPTY_BOARD, 'w', 'opponent');
    expect(miss2.events).toEqual([]);
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
    const arcs = segs.filter((s) => /That was the plan|plan is taking shape|what (they are after|you are building)|given up on/.test(s.narration ?? ''));
    expect(arcs.length).toBeGreaterThan(0);
    expect(segs.some((s) => /There it is — their knight on g3/.test(s.narration ?? ''))).toBe(true);
  }, 120000);
});

describe('an attack on the king needs queens and a middlegame (review walk 2026-09-27)', () => {
  const aim = { id: 'king-attack', kind: 'king-attack' as const, squares: ['g7'], goal: null, phrase: 'an attack on your king' };
  const run = (fen: string) => {
    let st = EMPTY_ARC;
    const out: string[] = [];
    for (let i = 0; i < 3; i++) { const r = stepArc(st, [aim], null, fen, 'b', 'opponent'); st = r.next; out.push(...r.events.map((e) => e.kind)); }
    return out;
  };
  it('a rook endgame announces no king attack', () => {
    expect(run('6k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 40')).not.toContain('emerge');
  });
  it('NEGATIVE CONTROL: queens on, move 20 — it still emerges', () => {
    expect(run('3q2k1/5ppp/8/8/8/8/5PPP/3Q2K1 b - - 0 20')).toContain('emerge');
  });
});

describe('a route only takes shape toward ONE goal', () => {
  // The first live walk with the lane open (3UqPa5eV2e0, 2026-09-29) said
  // "Their plan is taking shape: the knight's walk to h2" — two DIFFERENT knight
  // routes on consecutive engine reads counted as one plan read twice.
  const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';
  const route = (goal: string, path: string[]): Aim => ({
    id: 'route:n', kind: 'route', squares: path.slice(1), goal, phrase: `the knight's walk to ${goal}`,
  });

  it('two different destinations on consecutive reads never emerge', () => {
    const a = stepArc(EMPTY_ARC, [route('e5', ['f6', 'd7', 'e5'])], null, FEN, 'b', 'opponent');
    const b = stepArc(a.next, [route('h2', ['f6', 'g4', 'h2'])], null, FEN, 'b', 'opponent');
    expect(b.events.filter((e) => e.kind === 'emerge')).toEqual([]);
  });

  it('the same destination read twice still emerges (positive control)', () => {
    const a = stepArc(EMPTY_ARC, [route('e5', ['f6', 'd7', 'e5'])], null, FEN, 'b', 'opponent');
    const b = stepArc(a.next, [route('e5', ['f6', 'd7', 'e5'])], null, FEN, 'b', 'opponent');
    expect(b.events.filter((e) => e.kind === 'emerge').map((e) => e.text)).toEqual([
      "Their plan is taking shape: the knight's walk to e5.",
    ]);
  });
});

describe('aimWalkableNow — a live guess is said only if it can be walked from THIS board', () => {
  // The positions of the 2026-09-29 Learn walk, taken from the games themselves.
  const fenAfter = (id: string, plies: number): string => {
    const v = JSON.parse(readFileSync(`data/video-narration-voiced/${id}.json`, 'utf8')) as { moves: Array<{ ply: number; line: string[] }> };
    const g = new Chess(); let last = 0; let n = 0;
    for (const m of v.moves) {
      if (m.ply < last) break; last = m.ply;
      for (const s of m.line) { if (n >= plies) return g.fen(); g.move(s); n += 1; }
    }
    return g.fen();
  };
  const route = (piece: string, path: string[]): Aim => ({
    id: `route:${piece}`, kind: 'route', squares: path.slice(1), goal: path[path.length - 1], phrase: 'x', from: path[0],
  });

  it('a route back to where the piece just came from is not a plan (manual check 2026-09-30)', () => {
    const h = 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Qe2 d6 Qd1 a6'.split(' ');
    const c = new Chess();
    for (const san of h) c.move(san);
    // White's queen just went e2 → d1: "the queen's walk from d1 to e2" is a retreat, not a plan.
    expect(aimWalkableNow(route('q', ['d1', 'e2']), c.fen(), 'w', h)).toBe(false);
    // Without history the guard cannot apply (and the route is otherwise legal).
    expect(aimWalkableNow(route('q', ['d1', 'e2']), c.fen(), 'w')).toBe(true);
  });

  it('a bishop route through a diagonal the queen blocks is refused (FqVMAv3wKes ply 36)', () => {
    const fen = fenAfter('FqVMAv3wKes', 36);
    const b = new Chess(fen);
    expect(b.get('e7')?.type).toBe('b');
    expect(b.get('d4')?.type).toBe('q');
    expect(aimWalkableNow(route('b', ['e7', 'f6', 'c3']), fen, 'b')).toBe(false);
  });

  it('a knight route onto a square it would simply lose is refused (3UqPa5eV2e0 ply 38)', () => {
    const fen = fenAfter('3UqPa5eV2e0', 38);
    const b = new Chess(fen);
    const knight = ['d7', 'd5', 'f6', 'e5'].find((sq) => b.get(sq as never)?.type === 'n' && b.get(sq as never)?.color === 'b');
    expect(knight).toBeTruthy();
    // g4 is covered twice by White, once by Black.
    expect(b.attackers('g4', 'w').length).toBeGreaterThan(b.attackers('g4', 'b').length);
    expect(aimWalkableNow(route('n', ['d7', 'f6', 'g4']), fen, 'b')).toBe(false);
  });

  it('a real reroute that later landed passes (Blumenfeld Nd2-f1-g3, positive control)', () => {
    const c = new Chess();
    for (const s of GAME.slice(0, 27)) c.move(s);
    expect(aimWalkableNow(route('n', ['d2', 'f1', 'g3']), c.fen(), 'w')).toBe(true);
  });

  it('a route naming a piece that is not there is refused', () => {
    const c = new Chess();
    expect(aimWalkableNow(route('n', ['e4', 'f6', 'g4']), c.fen(), 'w')).toBe(false);
  });
});

describe('aimWalkableNow — "an attack on your king" needs pieces on the king NOW', () => {
  const kingAim: Aim = { id: 'king-attack', kind: 'king-attack', squares: [], goal: null, phrase: 'an attack on your king' };
  it('refused when no piece of theirs bears on the king (walk 3, FqVMAv3wKes ply 27)', () => {
    expect(aimWalkableNow(kingAim, new Chess().fen(), 'b')).toBe(false);
  });
  it('passes with two pieces on the king zone (positive control)', () => {
    // Black queen h4 and bishop c5 both bear on f2, next to the white king.
    const fen = 'rnb1k1nr/pppp1ppp/8/2b1p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4';
    expect(aimWalkableNow(kingAim, fen, 'b')).toBe(true);
  });
});

describe('aimWalkableNow — an outpost is pawn-guarded and pawn-proof', () => {
  const outpost = (sq: string): Aim => ({ id: `outpost:${sq}`, kind: 'outpost', squares: [sq], goal: sq, phrase: `the outpost on ${sq}` });
  it('refused when no own pawn guards it (walk 4)', () => {
    // After 1.e4 e5 2.Nf3 Nc6: d4 for White is guarded by no white pawn on c3/e3.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(aimWalkableNow(outpost('d5'), fen, 'w')).toBe(false);
  });
  it('refused when an enemy pawn can still come to hit it', () => {
    // White pawn e4 guards d5, but black c-pawn on c7 can come to c6.
    const fen = 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    expect(aimWalkableNow(outpost('d5'), fen, 'w')).toBe(false);
  });
  it('passes a true outpost (positive control): e4 guards d5, no black c/e pawn can reach it', () => {
    const fen = '4k3/8/3p4/4p3/4P3/8/8/4K3 w - - 0 1';
    expect(aimWalkableNow(outpost('d5'), fen, 'w')).toBe(true);
  });
});

describe('joinEmerges — the plan said as a plan (P2 #1)', () => {
  it('two aims on one move become one "X, then Y" line', () => {
    const ev = (text: string, sq: string): ArcEvent => ({ id: text, kind: 'emerge', seat: 'student', text, squares: [sq] });
    const out = joinEmerges([ev('The plan for you here: the knight\'s walk from f3 to d4.', 'd4'), ev('Your plan from here: the c-file.', 'c1')]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("The plan for you here: the knight's walk from f3 to d4, then the c-file.");
    expect(out[0].squares).toEqual(['d4', 'c1']);
  });
  it('one aim passes through unchanged', () => {
    const e: ArcEvent = { id: 'a', kind: 'emerge', seat: 'student', text: 'The plan for you here: x.', squares: [] };
    expect(joinEmerges([e])).toEqual([e]);
  });
});

describe('the move → plan link (P3): advance events carry their step', () => {
  it('the Learn page speaks the student FIRST step and the landing, never every step', async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/e\.kind === 'arrive' \|\| \(e\.kind === 'advance' && e\.step === 1\)/);
    // A move after the student's plan was told is prompted for the plan skill.
    expect(page).toMatch(/recordHeld\('no-plan'[^\n]*planToldBoardsRef\.current\.has/);
  });
});
