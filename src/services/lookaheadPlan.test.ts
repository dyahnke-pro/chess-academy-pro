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
  buildLookaheadPlan, keySquaresOf, keySquareLine, describePlan, planFromUci,
  positionReadLine, PLAN_HORIZON,
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
  });

  it('does not call a PAWN trade a plan', () => {
    // It was in the five-narration sample — "They want to win a pawn, open the
    // d-file and trade off the pawn" — and says nothing: pawns come off in
    // almost every line. Trading a PIECE is an intention; trading a pawn is
    // weather.
    const plan = buildLookaheadPlan(line(plies(START, ['e4', 'd5', 'exd5', 'Qxd5'])), 'white');
    expect(plan?.white.text).not.toContain('trade off the pawn');
  });

  it('DOES call a piece trade a plan', () => {
    const plan = buildLookaheadPlan(
      line(plies(START, ['e4', 'e5', 'Nf3', 'Nc6', 'Nxe5', 'Nxe5'])),
      'white',
    );
    // White's Nxe5 takes a PAWN; it is Black who takes the knight back — so
    // the piece-trade clause belongs to Black, which is also a second check
    // that trades land on the side that made them.
    expect(plan?.black.text).toContain('trade off the knight');
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

  it('reads the board even when the line is too short to be a plan', () => {
    // It used to return null here, which meant the coach went SILENT for the
    // last moves of every game — a full-game walk ended with three silent
    // plies including the checkmate, the worst possible moment to have nothing
    // to say. A plan needs four plies; a board read needs none.
    const plan = planFromUci(START, uci(['e2e4', 'c7c5']), 'white');
    expect(plan, 'a short line went silent again').not.toBeNull();
    expect(plan?.mine.headingFor, 'a two-ply line was described as an intention').toEqual([]);
    expect(plan?.read).toBeTruthy();
  });

  it('claims no intention it cannot support from a short line', () => {
    const plan = planFromUci(START, uci(['e2e4', 'e7e5', 'zzzz', 'd7d5']), 'white');
    expect(plan?.mine.materialSwing).toBe(0);
    expect(plan?.mine.trading).toEqual([]);
    expect(plan?.keySquares).toEqual([]);
  });

  it('still announces a mate on the board with no line left to read', () => {
    // Fool's mate: the game is over, there is no continuation, and this is
    // exactly the moment the coach must not be quiet.
    const board = new Chess();
    for (const san of ['f3', 'e5', 'g4', 'Qh4#']) board.move(san);
    const plan = planFromUci(board.fen(), [], 'white');
    expect(plan?.theirs.text.toLowerCase(), 'silent at checkmate').toContain('mate');
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

describe('hallucination is impossible by construction, not by gate', () => {
  // David 2026-08-10: "we need to make sure they are deterministically computed
  // and handed to the TTS. Make hallucinations impossible. Gates are there only
  // for redundancy."
  //
  // The sentence is assembled from fixed templates with computed values
  // interpolated, and `pkg.spoken` carries it to the voice verbatim — no model
  // sits between the board and the words. This proves the property rather than
  // asserting it: across a few thousand generated plans, EVERY square the
  // sentence names has to have come from the input. A template that invented
  // one would be caught here, not by a validator downstream.
  const SQUARES = ['a1', 'b4', 'c6', 'd5', 'e5', 'f7', 'g2', 'h8', 'a7', 'e4'];
  const TACTICS = [null, 'fork', 'pin', 'skewer', 'discovery', 'back_rank', 'mate_threat', 'trapped_piece'];

  /** Deterministic pseudo-random — no Math.random, per the audit-harness rule,
   *  and a failing case is reproducible from its index alone. */
  const pick = <T,>(list: readonly T[], seed: number): T => list[seed % list.length];

  it('never names a square that was not in the computed input', () => {
    for (let i = 0; i < 2000; i += 1) {
      const plan: SidePlan = {
        color: i % 2 ? 'white' : 'black',
        headingFor: i % 3 === 0 ? [pick(SQUARES, i), pick(SQUARES, i + 1)] : [],
        opening: i % 4 === 0 ? [pick(['a', 'c', 'e', 'h'], i)] : [],
        trading: i % 5 === 0 ? [pick(['pawn', 'knight', 'rook'], i)] : [],
        outposts: i % 6 === 0 ? [pick(SQUARES, i + 2)] : [],
        passedPawns: i % 7 === 0 ? [pick(SQUARES, i + 3)] : [],
        materialSwing: i % 11,
        shieldStripped: i % 4,
        tactic: pick(TACTICS, i),
        mates: i % 97 === 0,
        nearEnemyKing: i % 6,
        text: '',
      };
      const said = describePlan(plan, i % 2 ? 'mine' : 'theirs');
      const allowed = new Set([...plan.headingFor, ...plan.outposts, ...plan.passedPawns]);
      for (const square of said.match(/\b[a-h][1-8]\b/g) ?? []) {
        expect(
          allowed.has(square),
          `case ${i} invented the square ${square}: "${said}"`,
        ).toBe(true);
      }
    }
  });

  it('never emits a raw detector identifier', () => {
    // The 60-gem sweep caught "You want to land a mate_threat" — the coach
    // reading a variable name aloud. A detector enum is a program's word for a
    // thing, never a person's, and an unknown tactic is DROPPED rather than
    // spoken as its identifier.
    for (const tactic of TACTICS) {
      const said = describePlan({
        color: 'white', headingFor: [], opening: [], trading: [], outposts: [],
        passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic,
        mates: false, nearEnemyKing: 0, text: '',
      }, 'mine');
      expect(said, `a raw identifier reached the voice: "${said}"`).not.toMatch(/_/);
    }
    expect(describePlan({
      color: 'white', headingFor: [], opening: [], trading: [], outposts: [],
      passedPawns: [], materialSwing: 0, shieldStripped: 0,
      tactic: 'some_future_detector', mates: false, nearEnemyKing: 0, text: '',
    }, 'mine'), 'an unrecognised tactic was spoken instead of dropped').toBe('');
  });

  it('never emits a move, at any combination of facts', () => {
    for (let i = 0; i < 2000; i += 1) {
      const said = describePlan({
        color: i % 2 ? 'white' : 'black',
        headingFor: [pick(SQUARES, i)],
        opening: [pick(['a', 'd', 'f'], i)],
        trading: [pick(['pawn', 'bishop', 'queen'], i)],
        outposts: [pick(SQUARES, i + 1)],
        passedPawns: [pick(SQUARES, i + 2)],
        materialSwing: i % 9,
        shieldStripped: i % 3,
        tactic: pick(TACTICS, i),
        mates: i % 53 === 0,
        nearEnemyKing: i % 5,
        text: '',
      }, i % 2 ? 'mine' : 'theirs');
      expect(said, `case ${i} handed over a move: "${said}"`)
        .not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
    }
  });

  it('is a pure function of its input — same plan, same words, every time', () => {
    // The TTS clip cache keys on the exact string, so a sentence that varies
    // run to run is both a re-synthesis bill and a sign something nondeterministic
    // crept in.
    const plan: SidePlan = {
      color: 'white', headingFor: ['e4'], opening: ['c'], trading: ['knight'],
      outposts: ['d5'], passedPawns: ['a7'], materialSwing: 3, shieldStripped: 1,
      tactic: 'fork', mates: false, nearEnemyKing: 3, text: '',
    };
    const first = describePlan(plan, 'mine');
    for (let i = 0; i < 50; i += 1) expect(describePlan(plan, 'mine')).toBe(first);
  });
});

describe('the read sees the board as it stands, not only what the line changes', () => {
  // David 2026-08-10, asked why these were missing: they were. The plan was
  // built from the diffs `computePlyFacts` exposes, so it saw everything the
  // line CHANGED and nothing the position already IS. A pin standing on the
  // board that no move in the line touches was invisible, and
  // `describeStructure` was computed twice per ply and then discarded except
  // for two of its fields. Both are chess.js geometry — no engine, no excuse.
  it('reports material balance and pawn islands from the root position', () => {
    const plan = planFromUci(START, ['e2e4', 'd7d5', 'e4d5', 'd8d5'], 'white');
    expect(plan?.read).toBeTruthy();
    expect(typeof plan?.read.materialBalance).toBe('number');
    expect(plan?.read.islands.white).toBeGreaterThan(0);
    expect(plan?.read.islands.black).toBeGreaterThan(0);
  });

  it('leaves the eval swing NULL rather than guessing when no engine verified the line', () => {
    // `planFromUci` has no engine, so it has no terminal eval. Saying so beats
    // inventing a number the student would take as measured.
    expect(planFromUci(START, ['e2e4', 'c7c5', 'g1f3', 'd7d6'], 'white')?.read.evalSwingCp).toBeNull();
  });

  it('leads with opposite-wing kings, because it reframes everything else', () => {
    const read = {
      tacticsNow: ['fork'], oppositeWings: true,
      islands: { white: 3, black: 1 }, halfOpen: { white: ['c'], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    };
    expect(positionReadLine(read, 'white')).toContain('opposite wings');
  });

  it('names a tactic already on the board, in English', () => {
    const read = {
      tacticsNow: ['mate_threat'], oppositeWings: false,
      islands: { white: 2, black: 2 }, halfOpen: { white: [], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    };
    const said = positionReadLine(read, 'white');
    expect(said).toContain('mating threat');
    expect(said, 'a raw identifier reached the voice').not.toMatch(/_/);
  });

  it('says nothing when the board has nothing worth saying', () => {
    expect(positionReadLine({
      tacticsNow: [], oppositeWings: false,
      islands: { white: 1, black: 1 }, halfOpen: { white: [], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    }, 'white')).toBe('');
  });

  it('reads islands from the STUDENT\'s side of the board', () => {
    const read = {
      tacticsNow: [], oppositeWings: false,
      islands: { white: 1, black: 3 }, halfOpen: { white: [], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    };
    // For White the opponent has more islands; flipping the student must flip
    // whose weakness it is, not lose it.
    expect(positionReadLine(read, 'white')).toContain('They have 3');
    expect(positionReadLine(read, 'black')).not.toContain('They have 3');
  });
});

describe('the plan does not repeat itself', () => {
  // A plan is stable across several plies by nature — the same pin is still
  // coming three moves later — so without a said-set the coach chants. Measured
  // on a five-narration sample from a real game: "There is already a pin on the
  // board" four plies running, and the same intention three times.
  const P: SidePlan = {
    color: 'white', headingFor: ['e4', 'f3'], opening: ['d'], trading: ['knight'],
    outposts: ['e5'], passedPawns: [], materialSwing: 1, shieldStripped: 0,
    tactic: 'pin', mates: false, nearEnemyKing: 0, text: '',
  };

  it('says something different on the next ply', () => {
    const said = new Set<string>();
    const first = describePlan(P, 'mine', said);
    const second = describePlan(P, 'mine', said);
    expect(first).not.toBe('');
    expect(second, 'the coach repeated itself verbatim').not.toBe(first);
  });

  it('DESCENDS rather than falling silent while it still has facts', () => {
    // Suppressing without descending turns the ply into silence, which is the
    // other half of the same failure.
    const said = new Set<string>();
    const lines = [1, 2].map(() => describePlan(P, 'mine', said)).filter(Boolean);
    expect(lines.length).toBe(2);
    expect(new Set(lines).size).toBe(2);
  });

  it('goes quiet once it has genuinely said everything', () => {
    const said = new Set<string>();
    for (let i = 0; i < 6; i += 1) describePlan(P, 'mine', said);
    expect(describePlan(P, 'mine', said)).toBe('');
  });

  it('the board read stops repeating too', () => {
    const read = {
      tacticsNow: ['pin'], oppositeWings: false,
      islands: { white: 1, black: 3 }, halfOpen: { white: ['c'], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    };
    const said = new Set<string>();
    const a = positionReadLine(read, 'white', said);
    const b = positionReadLine(read, 'white', said);
    expect(a).toContain('pin');
    expect(b, 'the same board fact was spoken twice running').not.toBe(a);
    expect(b, 'it fell silent instead of descending to the next true fact').not.toBe('');
  });
});

describe('a passed pawn belongs to the side that has it', () => {
  // `newPassedPawns` pools BOTH colours into one untagged list, so crediting
  // the mover with everything in it hands a side the opponent's passed pawn.
  // The board settles it: the square must hold a pawn of that colour.
  //
  // Found while chasing "you want to create a passed pawn on c2" in a full-game
  // walk. That particular claim turned out to be TRUE — by then Bxb5+ had taken
  // the last black pawn off the b-file and c2 really was passed — but the hole
  // it exposed was real, so the check stays.
  it('never credits a side with the other side\'s passed pawn', () => {
    const GAME = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5',
      'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+'];
    const all = new Chess();
    const uci: string[] = [];
    for (const san of GAME) { const m = all.move(san); uci.push(`${m.from}${m.to}${m.promotion ?? ''}`); }

    const board = new Chess();
    for (let i = 0; i < GAME.length; i += 1) {
      board.move(GAME[i]);
      const plan = planFromUci(board.fen(), uci.slice(i + 1, i + 9), 'white');
      if (!plan) continue;
      // Every claimed passer must be a pawn of that colour somewhere in the
      // line — verified independently here, from the same board the coach saw.
      for (const [side, colour] of [[plan.white, 'w'], [plan.black, 'b']] as const) {
        for (const sq of side.passedPawns) {
          const probe = new Chess(board.fen());
          let seen = false;
          for (const u of uci.slice(i + 1, i + 9)) {
            try { probe.move({ from: u.slice(0, 2), to: u.slice(2, 4) }); } catch { break; }
            const piece = probe.get(sq as never) as { type?: string; color?: string } | undefined;
            if (piece?.type === 'p' && piece.color === colour) { seen = true; break; }
          }
          expect(seen, `${colour} was credited with a passed pawn on ${sq} it never had`).toBe(true);
        }
      }
    }
  });
});
