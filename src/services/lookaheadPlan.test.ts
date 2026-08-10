// Two plans out of one engine line, and a key square that earns its adjective.
//
// David 2026-08-09: "Stockfish only tells you the plan for the side to move.
// Can we calculate looking ahead and then narration what the plan is for both
// sides?" A principal variation IS both sides playing well in alternation, so
// the answer is yes and it costs nothing extra — the reading was what was
// missing, not the data.
//
// What these tests hold: the plans are about the RIGHT side (the easiest thing
// to get backwards, and the most damaging — a student told the opponent's plan
// is theirs will defend the wrong square), the horizon is respected, and "the
// square this position turns on" is a claim the counts have to earn.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  buildLookaheadPlan, keySquaresOf, keySquareLine, PLAN_HORIZON,
} from './lookaheadPlan';
import type { PvLine, PvPly, PlyFacts } from './pvPlayback';

const EMPTY: PlyFacts = {
  captured: null, isCheck: false, isMate: false, promotion: null,
  tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [],
  outpostGained: null, shieldLost: 0,
};

/** Replay real SANs into PvPly[]. The facts are INPUTS to the reading under
 *  test, so they are filled from chess.js truth (what was actually captured)
 *  plus whatever the individual test wants to add. */
function plies(
  fen: string,
  sans: string[],
  extra: Record<number, Partial<PlyFacts>> = {},
): PvPly[] {
  const board = new Chess(fen);
  const out: PvPly[] = [];
  sans.forEach((san, i) => {
    const fenBefore = board.fen();
    const mv = board.move(san);
    const captured = mv.captured
      ? `takes the ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' } as Record<string, string>)[mv.captured]}`
      : null;
    out.push({
      san: mv.san,
      uci: `${mv.from}${mv.to}`,
      moverColor: mv.color === 'w' ? 'white' : 'black',
      fenBefore,
      fenAfter: board.fen(),
      facts: { ...EMPTY, captured, ...(extra[i] ?? {}) },
    });
  });
  return out;
}

const line = (p: PvPly[]): PvLine => ({
  plies: p, rootEvalCp: 20, terminalEvalCp: 20, delivers: true, closeAlternative: null,
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('two plans, one line', () => {
  it('attributes each side\'s moves to that side', () => {
    // The easiest thing to get backwards and the most damaging: a student told
    // the opponent's plan is their own defends the wrong square.
    const plan = buildLookaheadPlan(line(plies(START, ['e4', 'c5', 'Nf3', 'd6'])), 'white');
    expect(plan).not.toBeNull();
    expect(plan?.white.headingFor).toContain('e4');
    expect(plan?.white.headingFor).toContain('f3');
    expect(plan?.black.headingFor).toContain('c5');
    expect(plan?.white.headingFor, "Black's move landed in White's plan").not.toContain('c5');
    expect(plan?.black.headingFor, "White's move landed in Black's plan").not.toContain('e4');
  });

  it('points mine/theirs at the student\'s actual colour', () => {
    const p = plies(START, ['e4', 'c5', 'Nf3', 'd6']);
    const asWhite = buildLookaheadPlan(line(p), 'white');
    const asBlack = buildLookaheadPlan(line(p), 'black');
    expect(asWhite?.mine).toBe(asWhite?.white);
    expect(asWhite?.theirs).toBe(asWhite?.black);
    expect(asBlack?.mine).toBe(asBlack?.black);
    expect(asBlack?.theirs).toBe(asBlack?.white);
  });

  it('speaks the student\'s plan as "you" and the opponent\'s as "they"', () => {
    const plan = buildLookaheadPlan(line(plies(START, ['e4', 'c5', 'Nf3', 'd6'])), 'white');
    expect(plan?.mine.text).toMatch(/^You\b/);
    expect(plan?.theirs.text).toMatch(/^They\b/);
  });

  it('reports a trade on the side that made it', () => {
    const plan = buildLookaheadPlan(
      line(plies(START, ['e4', 'd5', 'exd5', 'Qxd5'])),
      'white',
    );
    expect(plan?.white.trading).toContain('pawn');
    expect(plan?.black.trading).toContain('pawn');
    expect(plan?.white.text).toContain('trade');
  });

  it('refuses to call a move and a reply a plan', () => {
    expect(buildLookaheadPlan(line(plies(START, ['e4', 'c5'])), 'white')).toBeNull();
  });

  it('stops reading at the horizon', () => {
    // Past it, both sides are being credited with a future neither committed
    // to; a student told "they are going to take on e5" about ply 14 watches
    // it not happen and learns to distrust the coach.
    const long = plies(START, [
      'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5',
    ]);
    expect(long.length).toBeGreaterThan(PLAN_HORIZON);
    const plan = buildLookaheadPlan(line(long), 'white');
    // Be3 is ply 11 (0-indexed 10), past the horizon — its square must not appear.
    expect(plan?.white.headingFor).not.toContain('e3');
  });

  it('says nothing rather than something empty', () => {
    const plan = buildLookaheadPlan(line(plies(START, ['Nf3', 'Nf6', 'Ng1', 'Ng8'])), 'white');
    // Knights shuffling out and back: no captures, no files, no outposts — but
    // the squares are still real, so a "pieces toward" line is honest.
    expect(typeof plan?.mine.text).toBe('string');
  });
});

describe('key squares are counted, not felt', () => {
  it('ranks a square both sides touch above one only a single side visits', () => {
    // 1.e4 d5 2.exd5 Qxd5 — d5 is touched by both, twice each.
    const keys = keySquaresOf(plies(START, ['e4', 'd5', 'exd5', 'Qxd5']));
    expect(keys[0].square).toBe('d5');
    expect(keys[0].contested).toBe(true);
  });

  it('counts material that changed hands on the square', () => {
    const keys = keySquaresOf(plies(START, ['e4', 'd5', 'exd5', 'Qxd5']));
    const d5 = keys.find((k) => k.square === 'd5');
    expect(d5?.materialOnSquare, 'two pawns were taken on d5').toBeGreaterThan(0);
  });

  it('drops squares nothing happened on', () => {
    const keys = keySquaresOf(plies(START, ['e4', 'd5', 'exd5', 'Qxd5']));
    expect(keys.some((k) => k.square === 'h6')).toBe(false);
  });

  it('earns the strong claim only when the counts support it', () => {
    // "The square this position turns on" is a different claim from "a square
    // worth watching", and which one is spoken is decided by arithmetic.
    const hot = keySquaresOf(plies(START, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd8']));
    expect(keySquareLine(hot)).toContain('turns on');

    const quiet = keySquaresOf(plies(START, ['Nf3', 'Nf6', 'Ng1', 'Ng8']));
    expect(keySquareLine(quiet)).not.toContain('turns on');
  });

  it('says nothing when the line touches nothing twice', () => {
    expect(keySquareLine(keySquaresOf(plies(START, ['e4', 'c5'])))).toBe('');
  });
});

describe('every claim traces to a move the engine actually played', () => {
  it('never names a square no ply touched', () => {
    const sans = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'];
    const p = plies(START, sans);
    const touched = new Set(p.flatMap((x) => [x.uci.slice(0, 2), x.uci.slice(2, 4)]));
    for (const k of keySquaresOf(p)) {
      expect(touched.has(k.square), `${k.square} appeared in the read but no move touched it`).toBe(true);
    }
    const plan = buildLookaheadPlan(line(p), 'white');
    for (const sq of [...(plan?.white.headingFor ?? []), ...(plan?.black.headingFor ?? [])]) {
      expect(touched.has(sq)).toBe(true);
    }
  });

  it('never hands over a move', () => {
    const plan = buildLookaheadPlan(line(plies(START, ['e4', 'd5', 'exd5', 'Qxd5'])), 'white');
    for (const text of [plan?.mine.text ?? '', plan?.theirs.text ?? '']) {
      expect(text, `a move leaked into the plan: ${text}`)
        .not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });
});
