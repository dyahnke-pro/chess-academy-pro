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
  buildLookaheadPlan, keySquaresOf, keySquareLine, describePlan, planFromUci, PLAN_HORIZON,
} from './lookaheadPlan';
import type { SidePlan } from './lookaheadPlan';
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

describe('the read sees the whole line, not just where pieces land', () => {
  // David 2026-08-09: "make sure the PV calculates or sees as much as possible,
  // not just key squares." The first version hand-filled four fields and left
  // the engine path's other six empty — a quietly thinner copy. `planFromUci`
  // now replays through the SAME `computePlyFacts` the engine path uses, so
  // these are the real numbers, not a mock's.
  const uci = (moves: string[]): string[] => moves;

  it('reports material won across the line', () => {
    // 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 — White is a pawn up inside the horizon.
    const plan = planFromUci(START, uci(['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5']), 'white');
    expect(plan, 'the line did not replay').not.toBeNull();
    expect(plan?.white.materialSwing).toBeGreaterThan(0);
  });

  it('counts pieces converging on the enemy king', () => {
    // Scholar's shape: queen and bishop both arrive next to the black king.
    // "They are coming for you" as arithmetic rather than atmosphere.
    const plan = planFromUci(START, uci(['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7', 'e8f7']), 'white');
    expect(plan?.white.nearEnemyKing).toBeGreaterThanOrEqual(2);
  });

  it('fills every field the engine path computes, not a subset', () => {
    const plan = planFromUci(START, uci(['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4']), 'white');
    for (const side of [plan?.white, plan?.black]) {
      expect(side).toBeTruthy();
      expect(typeof side?.materialSwing).toBe('number');
      expect(typeof side?.shieldStripped).toBe('number');
      expect(typeof side?.nearEnemyKing).toBe('number');
      expect(Array.isArray(side?.passedPawns)).toBe(true);
      expect(Array.isArray(side?.opening)).toBe(true);
    }
  });

  it('refuses a line too short to read', () => {
    expect(planFromUci(START, uci(['e2e4', 'c7c5']), 'white')).toBeNull();
  });

  it('stops at the first illegal move instead of guessing past it', () => {
    expect(planFromUci(START, uci(['e2e4', 'e7e5', 'zzzz', 'd7d5']), 'white')).toBeNull();
  });
});

describe('the sentence is ordered by the position, not by a fixed ladder', () => {
  // Drives the REAL scorer. An earlier draft of this block reimplemented the
  // weights inside the test, which would have passed against any code at all.
  const base: SidePlan = {
    color: 'white', headingFor: [], opening: [], trading: [], outposts: [],
    passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
    mates: false, nearEnemyKing: 0, text: '',
  };
  const say = (over: Partial<SidePlan>): string => describePlan({ ...base, ...over }, 'mine');

  it('leads with a four-piece attack over winning a pawn', () => {
    expect(say({ nearEnemyKing: 4, materialSwing: 1 })).toMatch(/^You want to bring pieces at their king/);
  });

  it('leads with a rook over a two-piece gesture at the king', () => {
    expect(say({ nearEnemyKing: 2, materialSwing: 5 })).toMatch(/^You want to win a rook/);
  });

  it('weighs a passed pawn by how close it is to promoting', () => {
    const near = say({ passedPawns: ['a7'], trading: ['pawn'] });
    const far = say({ passedPawns: ['a3'], outposts: ['e5'] });
    expect(near).toMatch(/^You want to create a passed pawn on a7/);
    expect(far).not.toMatch(/^You want to create a passed pawn/);
  });

  it('says a rook is a rook and a pawn is a pawn', () => {
    expect(say({ materialSwing: 5 })).toContain('a rook');
    expect(say({ materialSwing: 3 })).toContain('a piece');
    expect(say({ materialSwing: 1 })).toContain('a pawn');
  });

  it('puts mate above everything else in the position', () => {
    const loud = say({
      mates: true, tactic: 'fork', nearEnemyKing: 4, shieldStripped: 3, materialSwing: 9,
    });
    expect(loud.toLowerCase()).toContain('mate');
    expect(loud).not.toContain('fork');
  });

  it('warns rather than congratulates when the mate is THEIRS', () => {
    expect(describePlan({ ...base, mates: true }, 'theirs').toLowerCase())
      .toContain('stop it');
  });

  it('never lists more than three things', () => {
    const loud = say({
      tactic: 'fork', nearEnemyKing: 4, shieldStripped: 3, materialSwing: 5,
      passedPawns: ['a7'], outposts: ['e5'], opening: ['c'], trading: ['rook'],
    });
    // Eight facts available; a coach that lists eight has said nothing.
    expect(loud.split(/,| and /).length).toBeLessThanOrEqual(3);
  });

  it('falls back to where the pieces are going when nothing concrete happens', () => {
    expect(say({ headingFor: ['e4', 'f3'] })).toContain('toward e4 and f3');
  });

  it('says nothing when there is nothing', () => {
    expect(say({})).toBe('');
  });
});
