// The composer really carries each lane through (G8.5: a wire that does not
// fire is not a wire). Positions are the computers' own fixtures from his games.
import { describe, it, expect } from 'vitest';
import { dangerAnswerLines, studentMoveAnswerLines, studentMoveTeaching, theirMoveAnswerLines, theirMoveTeaching } from './learnBoardTeaching';
import { Chess } from 'chess.js';
import ruleFx from './__fixtures__/ruleException-his.json';
import kingFx from './__fixtures__/kingAttack-his.json';
import falseFx from './__fixtures__/falseAlarm-his.json';

const base = { cpLoss: 0, bothCp: true, bestSan: null, bestLine: undefined, reply: null, cpAfter: null };

const afterOf = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

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
    // Learn holds the next hop (LEARN NAMES NO MOVE UNASKED): the idea speaks, Qg3 is not named.
    expect(good.some((h) => h.lane === 'kingAttack' && /one more queen move brings it to bear/.test(h.text) && !/Qg3/.test(h.text))).toBe(true);
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

  it('a held next hop draws no arrow — the arrow would name the move (Black walk 2026-10-19)', () => {
    const p = (kingFx as { key: string; fen: string; san: string }[]).find((x) => x.key === 'xoS71OW-Re0:21')!;
    const [h] = studentMoveTeaching({ ...base, fenBefore: p.fen, san: p.san, history: [p.san] }).filter((x) => x.lane === 'kingAttack');
    expect(h.arrows).toEqual([]);
    expect(h.text).not.toMatch(/g3/);
  });
});

describe('Play asks the same computers (David 2026-09-30)', () => {
  it('"was that a good move?" carries the timing read of the student\'s move', () => {
    const h = ['e4', 'e6', 'Nc3', 'a6', 'Nf3', 'e5', 'Nd5'];
    expect(studentMoveAnswerLines(h, 6, 0, 'Nd5').join(' ')).toMatch(/The timing of Nd5 matters/);
  });
  it('"what did their move do?" carries the tempo count', () => {
    const h = 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bd2 Qb6'.split(' ');
    expect(theirMoveAnswerLines(h, 11, 'w').join(' ')).toMatch(/That's their queen's third move already/);
  });
  it('"how am I doing?" carries the stalemate warning', () => {
    expect(dangerAnswerLines('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', 'w', null).join(' ')).toMatch(/stalemate/);
  });
  it('answers write no evidence — text only', () => {
    const out = studentMoveAnswerLines(['e4', 'e6', 'Nc3', 'a6', 'Nf3', 'e5', 'Nd5'], 6, 0, 'Nd5');
    expect(out.every((t) => typeof t === 'string')).toBe(true);
  });
});

describe('the opening summary (census #52)', () => {
  it('played, still there, or moved past — read off the board', async () => {
    const { openingSummaryLine } = await import('./learnBoardTeaching');
    const brk = { san: 'd4', square: 'd4' };
    expect(openingSummaryLine(brk, ['Nf3', 'd4'], '4k3/8/8/8/3P4/8/8/4K3 b - - 0 1')).toMatch(/you got its break in/);
    expect(openingSummaryLine(brk, ['Nf3'], '4k3/8/8/8/8/8/3P4/4K3 w - - 0 1')).toMatch(/still there to play/);
    expect(openingSummaryLine(brk, ['Nf3'], '4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toMatch(/moved past it/);
  });
});

describe('studentMoveIsPrompted — a move the coach NAMED is never proof (2026-10-06)', () => {
  it('the move advice speaking marks the coming move prompted', async () => {
    const { studentMoveIsPrompted } = await import('./learnBoardTeaching');
    expect(studentMoveIsPrompted(['deliberation'], true)).toBe(true);
    expect(studentMoveIsPrompted(['key-moment'], false)).toBe(true);
    expect(studentMoveIsPrompted(['fundamental'], false)).toBe(false);
  });
});

describe('an attack by a cheaper piece says why it matters (Learn audit 2026-10-14)', () => {
  it('names the attack and that a guard does not help', async () => {
    const { cheaperAttackerLine } = await import('./learnBoardTeaching');
    expect(cheaperAttackerLine('b', 'd2', 'q', 'a5', 0)).toBe('Careful — their bishop on d2 hits your queen on a5, and a guard does not help: the bishop is worth less than your queen.');
  });
  it('rotates its wording by move, so the formula is never said three times running (David 2026-10-14)', async () => {
    const { cheaperAttackerLine } = await import('./learnBoardTeaching');
    const said = [0, 1, 2].map((r) => cheaperAttackerLine('p', 'h3', 'b', 'g4', r));
    expect(new Set(said).size).toBe(3);
    for (const s of said) expect(s).toMatch(/pawn on h3/);
  });
});

describe('a hanging piece is warned in rotated words (David 2026-10-14)', () => {
  it('three moves, three wordings, each with its reason', async () => {
    const { hangingPieceLine } = await import('./learnBoardTeaching');
    const said = [0, 1, 2].map((r) => hangingPieceLine('r', 'h8', r, false));
    expect(new Set(said).size).toBe(3);
    for (const s of said) expect(s).toMatch(/rook on h8.*nothing/);
  });
});

describe('every student move gets its own reason — the board teacher as fallback (David 2026-10-14)', () => {
  it('says what a quiet developing move did, with the move as its subject', async () => {
    const { boardTeacherPoint } = await import('./learnBoardTeaching');
    const h = boardTeacherPoint('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'd5', afterOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'd5'), new Map());
    expect(h?.lane).toBe('movePoint');
    expect(h?.text).toMatch(/^d5 /);
  });
});

describe('the board teacher\'s reason keeps the squares it names (A-plan P5)', () => {
  it('Nf3 against …d5: the squares named are its proof, marked on the board', async () => {
    const { boardTeacherPoint } = await import('./learnBoardTeaching');
    const h = boardTeacherPoint('rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2', 'Nf3', afterOf('rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2', 'Nf3'), new Map());
    expect(h?.squares).toEqual(expect.arrayContaining(['d4', 'e5']));
    expect(h?.proof && typeof h.proof === 'object' && 'kind' in h.proof ? h.proof.kind : null).toBe('squares');
  });
  it('a reading that names no square stays a description (castling)', async () => {
    const { boardTeacherPoint } = await import('./learnBoardTeaching');
    const h = boardTeacherPoint('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5', 'O-O', afterOf('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5', 'O-O'), new Map());
    expect(h?.squares ?? []).toEqual([]);
  });
});


describe('no point about a piece already taken (Alekhine walk 2026-10-19)', () => {
  it('Qa4 taken by …Bxa4: the queen\'s point is not said', async () => {
    const { boardTeacherPoint } = await import('./learnBoardTeaching');
    const fen = '4k3/8/8/1b6/8/8/8/Q3K3 w - - 0 1';
    const taken = (() => { const c = new Chess(fen); c.move('Qa4'); c.move('Bxa4'); return c.fen(); })();
    expect(boardTeacherPoint(fen, 'Qa4', taken, new Map())).toBeNull();
  });
});

describe('an idea is said in full once a game, then referred to (Learn audit 2026-10-20, V7)', () => {
  // "Their bishop trains on the pawn on g7 — pressure you have to answer" was
  // said three times in one game: Learn's board teacher had no phrase memory.
  const ITALIAN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';
  it('the second SPOKEN saying is the short form, counted off the kept claims', async () => {
    const { boardTeacherPoint, spokenIdeaCounts } = await import('./learnBoardTeaching');
    const after = afterOf(ITALIAN, 'O-O');
    const first = boardTeacherPoint(ITALIAN, 'O-O', after, new Map())!;
    expect(first.text).toMatch(/tucked safely away/);
    expect(first.claims).toContain('idea:castle:0');
    // The door kept it: its claims are remembered for the game.
    const said = new Set<string>(first.claims ?? []);
    const second = boardTeacherPoint(ITALIAN, 'O-O', after, spokenIdeaCounts(said))!;
    expect(second.text).not.toMatch(/tucked safely away/);
    expect(second.claims).toContain('idea:castle:1');
  });
  it('an idea that was offered and held does not count as said', async () => {
    const { boardTeacherPoint } = await import('./learnBoardTeaching');
    const after = afterOf(ITALIAN, 'O-O');
    boardTeacherPoint(ITALIAN, 'O-O', after, new Map());
    // Nothing was remembered, so the next offer is still the full form.
    expect(boardTeacherPoint(ITALIAN, 'O-O', after, new Map())!.text).toMatch(/tucked safely away/);
  });
});

// Learn prod audit 2026-10-21, 11.gxf6 against the student's Black: "Their
// pawn hits the pawn on g7." — the target named with no owner. It is the
// student's pawn, and says so.
describe('a target is named with its owner', () => {
  it('their pawn hits YOUR pawn on g7', async () => {
    const { theirBoardPoint } = await import('./learnBoardTeaching');
    const before = '2kr3r/ppp2ppp/4pn2/q1b3P1/3n4/2NB1N2/PPPB1PP1/R2QK2R w KQ - 2 11';
    const point = theirBoardPoint(before, 'gxf6', afterOf(before, 'gxf6'), new Map());
    expect(point?.text).toMatch(/your pawn on g7/);
    expect(point?.text).not.toMatch(/the pawn on g7/);
  });
});
