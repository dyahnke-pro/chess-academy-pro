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
  positionReadLine, lineShapeLine, terminalReadLine, PLAN_HORIZON,
} from './lookaheadPlan';
import type { SidePlan, LookaheadPlan, LineShape, TerminalRead } from './lookaheadPlan';
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
    // When BOTH sides fall back to the drift clause the two are merged into one
    // sentence (see the twin-drift describe below — David heard the unmerged
    // pair as a stutter), so the contract is about the whole utterance rather
    // than about each field: the student is "you", the opponent is "they", and
    // neither is missing.
    const said = [plan?.theirs.text, plan?.mine.text].filter(Boolean).join(' ');
    expect(said).toMatch(/\byou\b/i);
    expect(said).toMatch(/\bthey\b/i);
    expect(said, 'the opponent half is not first').toMatch(/^They\b/);
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
    expect(keySquareLine(hot)).toContain("Everything's running through");

    const quiet = keySquaresOf(plies(START, ['Nf3', 'Nf6', 'Ng1', 'Ng8']));
    expect(keySquareLine(quiet)).not.toContain("Everything's running through");
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

  it('does not invite the student to FIND a mate that has already landed', () => {
    // The full-game walk ended with "there is a forced mate in this line — it
    // is there if you find it" spoken on the move that DELIVERED mate. Tense
    // is not decoration once the game is over.
    const board = new Chess();
    for (const san of ['f3', 'e5', 'g4', 'Qh4#']) board.move(san);
    const plan = planFromUci(board.fen(), [], 'white');
    const said = `${plan?.mine.text} ${plan?.theirs.text}`.toLowerCase();
    expect(said, 'invited the student to find a mate already on the board').not.toContain("if you can find it");
    expect(said).toContain('game over');
  });

  it('still speaks the future tense for a mate the line is HEADING toward', () => {
    const base = {
      color: 'white' as const, headingFor: [], opening: [], trading: [], outposts: [],
      passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
      nearEnemyKing: 0, text: '',
    };
    expect(describePlan({ ...base, mates: true }, 'mine')).toContain("if you can find it");
    expect(describePlan({ ...base, mates: true, mateDelivered: true }, 'mine')).toContain('game over');
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
    expect(say({ nearEnemyKing: 4, materialSwing: 1 })).toMatch(/^You want to swing pieces toward their king/);
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

  it('says EVERYTHING the line earned, most important first', () => {
    // There was a three-clause cap here. David removed it (2026-08-10: "I want
    // to hear everything the PV has to say. Do not limit it.") — every clause
    // is a distinct board-true fact the engine's own line produced, and a cap
    // silently discarded the lowest-ranked ones. What keeps an uncapped
    // sentence safe is the RANKING, so that is what this now holds.
    const loud = say({
      tactic: 'fork', nearEnemyKing: 4, shieldStripped: 3, materialSwing: 5,
      passedPawns: ['a7'], outposts: ['e5'], opening: ['c'], trading: ['rook'],
    });
    expect(loud.split(/,| and /).length, 'clauses were dropped').toBeGreaterThan(3);
    // Ranking still decides the ORDER, which is what makes an uncapped
    // sentence safe: a student who moves again mid-sentence loses only the
    // tail. Stripping three shield pawns scores 99 and a fork 90, so the
    // pawns lead here — the scorer answering to the position rather than to a
    // fixed ladder is the whole design.
    const lead = loud.replace(/^You want to /, '');
    expect(lead).toMatch(/^pull the pawns away/);
    // …and the cheapest clause is last, not missing.
    expect(loud).toContain('open the c-file');
  });

  it('falls back to where the pieces are going when nothing concrete happens', () => {
    expect(say({ headingFor: ['e4', 'f3'] })).toContain('to e4 and f3');
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
    expect(positionReadLine(read, 'white')).toContain("They've got 3");
    expect(positionReadLine(read, 'black')).not.toContain("They've got 3");
  });

  it('never tells a rookless side where a rook belongs', () => {
    // A half-open file is a PAWN fact, so it outlives the rooks — and the line
    // then advises a student to post a piece they no longer own. It showed up
    // as a `voicePackage.plan` grading drop in David's live log (2026-08-10);
    // per G0 the fix is that the claim is never computed, not that a gate
    // catches it.
    const read: PositionRead = {
      tacticsNow: [], oppositeWings: false, islands: { white: 2, black: 2 },
      halfOpen: { white: ['e'], black: [] }, endgameType: null,
      materialBalance: 0, evalSwingCp: null,
    };
    const ROOKLESS = '4k3/5ppp/8/8/8/8/PPP2PPP/4K3 w - - 0 1';
    const WITH_ROOK = '4k3/5ppp/8/8/8/8/PPP2PPP/R3K3 w - - 0 1';
    expect(positionReadLine(read, 'white', undefined, ROOKLESS)).not.toContain('rook');
    expect(positionReadLine(read, 'white', undefined, WITH_ROOK)).toContain('rook');
    // No board handed in → say nothing rather than guess.
    expect(positionReadLine(read, 'white')).not.toContain('rook');
  });
});

describe('"the square this position turns on" is said once', () => {
  // From the prod audit transcript, 2026-08-10, five seconds apart:
  //   "d5 is the square this position turns on — both sides keep coming back."
  //   "d3 is the square this position turns on — both sides keep coming back."
  // Each was true of its own line. Together they cancel: a coach that names
  // THE decisive square every move has named nothing.
  const hot = () => keySquaresOf(plies(START, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd8']));

  it('spends the superlative once, then speaks honestly', () => {
    const said = new Set<string>();
    expect(keySquareLine(hot(), said)).toContain("Everything's running through");
    // A different square, same game — it may still be worth naming, but not as
    // the one the position turns on.
    const other = keySquaresOf(plies(START, ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Nxe5']));
    const second = keySquareLine(other, said);
    expect(second, `said the superlative twice: ${second}`).not.toContain("Everything's running through");
  });

  it('still names the second square rather than going silent', () => {
    const said = new Set<string>();
    keySquareLine(hot(), said);
    const other = keySquaresOf(plies(START, ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Nxe5']));
    const second = keySquareLine(other, said);
    expect(second, 'the weaker form should still speak').not.toBe('');
  });

  it('without a said-set every caller still gets the strong form', () => {
    // The set is the caller's memory of ONE game; a fresh game starts fresh.
    expect(keySquareLine(hot())).toContain("Everything's running through");
  });
});

describe('the two sides never say the same sentence twice', () => {
  // David 2026-08-10, after listening back: "I think I heard a double
  // sentence." His iPhone transcript, 02:47:57 —
  //   "They bring their pieces toward c6 and d7 over the next few moves.
  //    You bring your pieces toward c3 and d3 over the next few moves."
  // Identical word for word bar the pronouns and the squares. Both true, which
  // is what made it survive every board-truth gate we have; it is a VOICE
  // defect, and it fires on quiet positions, which is most of them.
  const QUIET = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

  /** A line where neither side captures anything — the drift case. */
  function driftPlan(studentColor: 'white' | 'black'): LookaheadPlan | null {
    return planFromUci(QUIET, ['b8c6', 'd2d4', 'g8f6', 'b1c3'], studentColor);
  }

  it('merges the twin drift sentence into one', () => {
    const plan = driftPlan('black');
    expect(plan).not.toBeNull();
    if (!plan) return;
    const spoken = [plan.theirs.text, plan.mine.text].filter(Boolean);
    const drifting = spoken.filter((s) => /(You|They)'re bringing pieces to /.test(s));
    expect(drifting.length, `two drift sentences in one breath: ${spoken.join(' ')}`)
      .toBeLessThanOrEqual(1);
  });

  it('keeps BOTH sides in the merged sentence', () => {
    const plan = driftPlan('black');
    if (!plan) return;
    const said = [plan.theirs.text, plan.mine.text].filter(Boolean).join(' ');
    if (!/heading for/.test(said)) return; // the merge did not apply here
    expect(said).toMatch(/heading for .+; you are heading for /);
  });

  it('never says two sentences with the same shape back to back', () => {
    // The general form of the defect, swept over a real game: no two spoken
    // plan sentences in one utterance may reduce to the same template.
    const game = new Chess();
    for (const san of ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5']) {
      game.move(san);
      const fen = game.fen();
      const probe = new Chess(fen);
      const uci: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const ms = probe.moves({ verbose: true });
        if (!ms.length) break;
        probe.move(ms[0].san);
        uci.push(`${ms[0].from}${ms[0].to}`);
      }
      const studentColor = new Chess(fen).turn() === 'w' ? 'white' : 'black';
      const plan = planFromUci(fen, uci, studentColor);
      if (!plan) continue;
      const shapes = [plan.theirs.text, plan.mine.text].filter(Boolean)
        // Strip everything that differs between the two voices, leaving the
        // template — if two survive identical, the student heard a stutter.
        .map((s) => s.replace(/\b(You|They|your|their)\b/g, '_').replace(/\b[a-h][1-8]\b/g, '#'));
      expect(new Set(shapes).size, `${san}: same sentence twice — ${shapes[0]}`).toBe(shapes.length);
    }
  }, 30_000);
});

describe('the plan does not repeat itself', () => {
  // A plan is stable across several plies by nature — the same pin is still
  // coming three moves later — so without a said-set the coach chants. Measured
  // on a five-narration sample from a real game: "There is already a pin on the
  // board" four plies running, and the same intention three times.
  const P: SidePlan = {
    color: 'white', headingFor: ['e4', 'f3'], opening: ['d'], trading: ['knight'],
    outposts: ['e5'], passedPawns: [], materialSwing: 1, shieldStripped: 0,
    tactic: 'pin', tacticSquare: 'e4', mates: false, nearEnemyKing: 0,
    kingAttackSquares: [], materialSquares: ['e4'], tradeSquares: ['e5'],
    text: '', spokenClauses: [],
  };

  it('says something different on the next ply', () => {
    const said = new Set<string>();
    const first = describePlan(P, 'mine', said);
    const second = describePlan(P, 'mine', said);
    expect(first).not.toBe('');
    expect(second, 'the coach repeated itself verbatim').not.toBe(first);
  });

  it('says it ALL on the first ply, then has nothing left to repeat', () => {
    // Before the cap came off, the plan trickled out three clauses at a time
    // and this test held it to descending rather than falling silent. Uncapped,
    // the first ply says everything the line earned — so silence afterwards is
    // the CORRECT answer, not a regression. What must never happen is the same
    // clause twice.
    const said = new Set<string>();
    const first = describePlan(P, 'mine', said);
    expect(first).not.toBe('');
    expect(describePlan(P, 'mine', said), 'repeated a clause it had already spoken').toBe('');
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
    // Uncapped, the first call says every fresh rung — the pin, the islands and
    // the half-open file — so the second correctly has nothing left.
    expect(a).toContain('pin');
    expect(a, 'the read spoke one rung and discarded the rest').toContain('islands');
    expect(b, 'the same board fact was spoken twice running').not.toBe(a);
    expect(b, 'nothing was left, so silence is right').toBe('');
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

describe('an uncontested square has to earn the sentence', () => {
  // Also found on PROD: "a7 is worth watching; the play keeps running through
  // it" — in a quiet Italian, about a rim square nothing was fighting over. It
  // reached the top slot on two touches and no contest. Contest is the whole
  // signal; without it the traffic has to be heavy enough to mean something.
  const key = (over: Partial<{ square: string; whiteTouches: number; blackTouches: number }>) => ([{
    square: 'a7', whiteTouches: 2, blackTouches: 0, materialOnSquare: 0,
    weight: 3, contested: false, ...over,
  }]);

  it('says nothing about a square one side merely passed through', () => {
    expect(keySquareLine(key({}))).toBe('');
  });

  it('still speaks when one side keeps returning to it', () => {
    expect(keySquareLine(key({ whiteTouches: 5 }))).toContain('Keep half an eye on');
  });

  it('always speaks for a contested square, however light the traffic', () => {
    // Contest is the signal that does not need volume behind it.
    expect(keySquareLine(key({ whiteTouches: 1, blackTouches: 1, contested: true }))).not.toBe('');
  });
});

describe('the drift line does not repeat itself', () => {
  // From the prod transcript, two plies running:
  //   "You bring your pieces toward d4 and c3 over the next few moves."
  //   "You bring your pieces toward d4 and c3 over the next few moves."
  // Every SCORED clause is filtered against the said-set; the drift fallback
  // returned early and skipped the check entirely, so the one line most likely
  // to hold across a quiet stretch was the one line free to chant.
  const drift = (): SidePlan => ({
    color: 'white', headingFor: ['d4', 'c3'], opening: [], trading: [], outposts: [],
    passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
    tacticSquare: null, mates: false, nearEnemyKing: 0,
    kingAttackSquares: [], materialSquares: [], tradeSquares: [],
    text: '', spokenClauses: [],
  });

  it('says it once', () => {
    const said = new Set<string>();
    const first = describePlan(drift(), 'mine', said);
    expect(first).not.toBe('');
    expect(describePlan(drift(), 'mine', said), 'chanted the same destinations').toBe('');
  });

  it('speaks again when the pieces head somewhere NEW', () => {
    const said = new Set<string>();
    describePlan(drift(), 'mine', said);
    const moved = { ...drift(), headingFor: ['e5', 'f6'] };
    expect(describePlan(moved, 'mine', said), 'new destinations are real news').not.toBe('');
  });

  it('keeps the two voices apart — "you" and "they" are different claims', () => {
    const said = new Set<string>();
    expect(describePlan(drift(), 'mine', said)).not.toBe('');
    expect(describePlan(drift(), 'theirs', said)).not.toBe('');
  });
});

describe('the rest of what the line has to say', () => {
  // David 2026-08-10, asked what more the PV could yield: "I want them all.
  // Spoken when they apply." Each of these was computable from plies already
  // replayed and read by nothing.
  const plan = (sans: string[], color: 'white' | 'black' = 'white') =>
    buildLookaheadPlan(line(plies(START, sans)), color);

  it('names the piece being REROUTED, with the squares it travels', () => {
    // The most characteristic thing a coach says about a line, and the plan had
    // the data and no sentence: `headingFor` kept the destinations and lost the
    // journey, so a three-hop regrouping read as two unrelated squares.
    const p = plan(['Nf3', 'e5', 'Nd4', 'd5', 'Nb5', 'a6']);
    expect(p?.white.maneuver?.path, 'the journey was not tracked').toEqual(['g1', 'f3', 'd4', 'b5']);
    expect(p?.white.maneuver?.piece).toBe('knight');
    expect(p?.white.text).toContain('walk the knight round to b5');
  });

  it('does not call a single move a reroute', () => {
    expect(plan(['Nf3', 'e5', 'd4', 'd5'])?.white.maneuver).toBeNull();
  });

  it('counts the checks each side gives', () => {
    // Through `planFromUci`, which computes the per-ply facts for real — the
    // hand-built fixture above fills them from a blank template, so `isCheck`
    // there is always false and would test nothing.
    const real = planFromUci(START, ['e2e4', 'f7f5', 'd1h5', 'g7g6', 'h5g6', 'h7g6'], 'white');
    expect(real?.white.checks, 'checks were never read off the plies').toBeGreaterThanOrEqual(2);
  });

  it('reports how much material comes off in TOTAL, not just the net', () => {
    // A line where twelve points change hands is a different animal from one
    // where a pawn does, even when the two end level.
    const p = plan(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxg2']);
    expect(p?.shape.traded).toBeGreaterThan(0);
  });

  it('says a forced run out loud, and stays quiet when there are choices', () => {
    const said = new Set<string>();
    expect(lineShapeLine({ forcedPlies: 3, traded: 0, endsInEndgame: false }, said))
      .toContain('forced');
    expect(lineShapeLine({ forcedPlies: 0, traded: 0, endsInEndgame: false })).toBe('');
  });

  it('says the line trades down into an ending', () => {
    expect(lineShapeLine({ forcedPlies: 0, traded: 12, endsInEndgame: true }))
      .toMatch(/comes off.*endgame|endgame/s);
  });

  it('says each shape fact once a game, not once a ply', () => {
    const said = new Set<string>();
    const shape = { forcedPlies: 3, traded: 12, endsInEndgame: true };
    expect(lineShapeLine(shape, said)).not.toBe('');
    expect(lineShapeLine(shape, said), 'the shape read chanted').toBe('');
  });

  it('never hands over a move in any of it', () => {
    for (const sans of [
      ['Nf3', 'e5', 'Nd4', 'd5', 'Nb5', 'a6'],
      ['e4', 'f5', 'Qh5+', 'g6', 'Qxg6+', 'hxg6'],
      ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxg2'],
    ]) {
      const p = plan(sans);
      for (const t of [p?.white.text, p?.black.text, lineShapeLine(p?.shape ?? { forcedPlies: 0, traded: 0, endsInEndgame: false })]) {
        expect(t ?? '', `a move leaked: ${t}`).not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
      }
    }
  });
});

describe('the reroute clause survived its own prod run', () => {
  // Both of these were found by READING the transcript of an 8/8-green audit,
  // not by the checks passing. A green run is not the bar.
  it('says the reroute ONCE', () => {
    // The clause had been added twice — an interrupted edit that partly
    // applied — so the coach said "walk the knight round to c6, by way of f3
    // and d4, walk the knight round from g1 to c6, by way of f3 and d4".
    const p = buildLookaheadPlan(line(plies(START, ['Nf3', 'e5', 'Nd4', 'd5', 'Nb5', 'a6'])), 'white');
    const said = p?.white.text ?? '';
    expect(said.match(/walk the/g)?.length ?? 0, `doubled: ${said}`).toBeLessThanOrEqual(1);
  });

  it('never calls a round trip a reroute', () => {
    // "walk the queen round from d1 to d1, by way of f3" — a real journey and
    // a nonsense sentence. A piece that comes home was chased back or is
    // marking time; neither is the regrouping this clause is for.
    // g1 → f3 → g1: the knight ends where it started. (The first fixture I
    // wrote added a third hop and ended on f3, which is a genuine reroute —
    // the test was wrong, not the guard.)
    const p = buildLookaheadPlan(line(plies(START, ['Nf3', 'e5', 'Ng1', 'd5'])), 'white');
    expect(p?.white.maneuver, 'a round trip was reported as a reroute').toBeNull();
  });
});

describe('the rest of the inventory — everything the line leaves behind', () => {
  // David 2026-08-10, given the list of what the PV could still yield: "I want
  // them all. Spoken when they apply." These are the remainder.
  const shape = (over: Partial<LineShape> = {}): LineShape => ({
    forcedPlies: 0, traded: 0, endsInEndgame: false, repeats: false,
    pliesToFirstCapture: 0, quietMoveIndex: null, evalSwingCp: null,
    castlingLost: null, ...over,
  });
  const terminal = (over: Partial<TerminalRead> = {}): TerminalRead => ({
    loose: [], mobilityShift: { mine: 0, theirs: 0 }, kingOnOpenFile: null,
    betterPawns: null, breaks: [], ...over,
  });

  it('calls a repetition what it is', () => {
    expect(lineShapeLine(shape({ repeats: true }))).toContain('repeats the position');
  });

  it('says a quiet move is buried in there WITHOUT naming its square', () => {
    // Finding the in-between move is the exercise; saying it exists is the hint.
    const said = lineShapeLine(shape({ quietMoveIndex: 3 }));
    expect(said).toContain('quiet move');
    expect(said).not.toMatch(/\b[a-h][1-8]\b/);
  });

  it('names a manoeuvring line by how long nothing is taken', () => {
    expect(lineShapeLine(shape({ pliesToFirstCapture: 7 }))).toContain('manoeuvring');
    expect(lineShapeLine(shape({ pliesToFirstCapture: 1 }))).not.toContain('manoeuvring');
  });

  it('tells the student whose castling rights went', () => {
    expect(lineShapeLine(shape({ castlingLost: 'mine' }))).toContain('Your king loses');
    expect(lineShapeLine(shape({ castlingLost: 'theirs' }))).toContain('They lose');
  });

  it('says NOTHING about the eval swing — it would be meaningless', () => {
    // A first draft spoke "playing this through is worth about a pawn to you"
    // from the root→terminal swing. On this path the line IS the engine's
    // principal variation, and a PV's terminal eval equals its root eval by
    // definition — that is what makes it principal. The swing is structurally
    // zero, so the sentence could only ever say nothing or say something false.
    // Found by auditing whether each new lane could actually fire, not by a
    // test failing.
    for (const cp of [20, 150, -400, 900]) {
      expect(lineShapeLine(shape({ evalSwingCp: cp })), `spoke a PV swing at ${cp}`).toBe('');
    }
  });

  it('reads the king on an open file at the END of the line', () => {
    expect(terminalReadLine(terminal({ kingOnOpenFile: 'mine' }))).toContain('Your king ends up');
    expect(terminalReadLine(terminal({ kingOnOpenFile: 'theirs' }))).toContain('Their king ends up');
  });

  it('reports a real squeeze, not engine noise', () => {
    expect(terminalReadLine(terminal({ mobilityShift: { mine: 0, theirs: -12 } })))
      .toContain('fewer squares');
    expect(terminalReadLine(terminal({ mobilityShift: { mine: 0, theirs: -3 } }))).toBe('');
  });

  it('says who comes out with the tidier pawns', () => {
    expect(terminalReadLine(terminal({ betterPawns: 'mine' }))).toContain('tidier pawns');
  });

  it('names the break that is ready once the line finishes', () => {
    expect(terminalReadLine(terminal({ breaks: ['c5'] }))).toContain('pawn break on c5');
  });

  it('says each of these once a game, not once a ply', () => {
    const said = new Set<string>();
    const t = terminal({ kingOnOpenFile: 'mine', betterPawns: 'mine', breaks: ['c5'] });
    expect(terminalReadLine(t, said)).not.toBe('');
    expect(terminalReadLine(t, said), 'the terminal read chanted').toBe('');
  });

  it('never hands over a move in any of it', () => {
    const all = [
      lineShapeLine(shape({ repeats: true, quietMoveIndex: 2, castlingLost: 'both', evalSwingCp: 400 })),
      terminalReadLine(terminal({ kingOnOpenFile: 'theirs', loose: ['e5'], breaks: ['c5'], betterPawns: 'mine' })),
    ];
    for (const t of all) expect(t, `a move leaked: ${t}`).not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
  });

  it('a PAWN is never described as being rerouted', () => {
    // A live probe produced "they want to walk the pawn round to a5, by way of
    // b6" — that is a pawn capturing twice, not a regrouping, and no coach has
    // ever described it that way. Found by printing what the lane actually
    // says, not by an assertion failing.
    // A black pawn walking b5 → b4 → b3: three squares, one pawn.
    const p = buildLookaheadPlan(line(plies(START, ['e4', 'b5', 'd4', 'b4', 'Nf3', 'b3'])), 'black');
    expect(p?.black.maneuver, 'a pawn was called a reroute').toBeNull();
    expect(p?.black.text ?? '').not.toContain('walk the pawn');
  });

  it('does NOT list the idle pieces as something a side WANTS', () => {
    // The same probe read back "You want to swing pieces toward their king,
    // park a piece on d5 and leave a1, d1, f1 exactly where they are" — a
    // caveat grammatically promoted to an intention. Inside the mistake
    // callout it became "Na5 was the move, to … leave a1, d1, f1 exactly where
    // they are." Empty beats wrong.
    const P: SidePlan = {
      color: 'white', headingFor: [], opening: [], trading: [], outposts: ['d5'],
      passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
      tacticSquare: null, idlePieces: ['a1', 'd1', 'f1'], maneuver: null,
      checks: 0, promotes: null, mates: false, nearEnemyKing: 0,
      kingAttackSquares: [], materialSquares: [], tradeSquares: [],
      text: '', spokenClauses: [],
    };
    const said = describePlan(P, 'mine');
    expect(said, `spoke a caveat as a want: ${said}`).not.toContain('exactly where they are');
    expect(said, 'the real intention was lost with it').toContain('d5');
  });

  it('names the pieces a plan leaves behind', () => {
    // "Your queenside sleeps through this line" — a plan is as much about what
    // it leaves out as what it includes.
    const P: SidePlan = {
      color: 'white', headingFor: [], opening: [], trading: [], outposts: [],
      passedPawns: [], materialSwing: 0, shieldStripped: 0, tactic: null,
      tacticSquare: null, idlePieces: ['a1', 'b1', 'c1'], maneuver: null,
      checks: 0, promotes: null, mates: false, nearEnemyKing: 0,
      kingAttackSquares: [], materialSquares: [], tradeSquares: [],
      text: '', spokenClauses: [],
    };
    // The FIELD is still computed — it is a real observation and a future
    // sentence of its own. It is just not a clause in the list of wants; see
    // the test above for why.
    expect(P.idlePieces).toEqual(['a1', 'b1', 'c1']);
    expect(describePlan(P, 'mine')).not.toContain('a1, b1, c1');
  });
});

describe('what the plan leaves out gets its OWN sentence', () => {
  // A live probe once read this back as "You want to swing pieces toward their
  // king, park a piece on d5 and leave a1, d1, f1 exactly where they are." The
  // want-list grammar turned a caveat into an intention — nobody plans to leave
  // their rooks at home. It is still worth saying, so it says itself.
  const planWithIdle = (idle: string[]): SidePlan => ({
    color: 'white', headingFor: ['d5'], opening: [], trading: [], outposts: ['d5'],
    materialSwing: 0, passedPawns: [], shieldStripped: 0, tactic: null, mates: false,
    nearEnemyKing: 0, kingAttackSquares: [], materialSquares: [], tradeSquares: [],
    tacticSquare: null, idlePieces: idle, maneuver: null, checks: 0, promotes: null,
    text: '', aside: '', spokenClauses: [],
  });

  it('never lets an idle piece become something the side WANTS', () => {
    const said = describePlan(planWithIdle(['a1', 'd1', 'f1']), 'mine');
    expect(said, 'the caveat is still inside the want-list')
      .not.toMatch(/want to [^.]*\b(leave|sit)\b/);
  });

  it('says it, in the register of a noticing, in its OWN field', () => {
    // `aside`, not the return value. A trailing sentence on `text` repeated
    // once per road in the fork offer's previews — three options that exist to
    // be told apart, all ending identically. The caller decides now.
    const plan = planWithIdle(['a1', 'd1', 'f1']);
    describePlan(plan, 'mine');
    expect(plan.aside).toMatch(/Worth noticing: your pieces on a1, d1 and f1 sit this one out/);
  });

  it('stays quiet when only one or two pieces sit out — that is every plan', () => {
    const plan = planWithIdle(['a1', 'd1']);
    describePlan(plan, 'mine');
    expect(plan.aside).toBe('');
  });

  it('never catalogues the OPPONENT\'s idle pieces — that is not the student\'s problem', () => {
    const plan = planWithIdle(['a1', 'd1', 'f1']);
    describePlan(plan, 'theirs');
    expect(plan.aside).toBe('');
  });

  it('says it once per game, not every ply', () => {
    const said = new Set<string>();
    const first = planWithIdle(['a1', 'd1', 'f1']);
    describePlan(first, 'mine', said);
    const second = planWithIdle(['a1', 'd1', 'f1']);
    describePlan(second, 'mine', said);
    expect(first.aside).toMatch(/sit this one out/);
    expect(second.aside).toBe('');
  });

  it('THE REGRESSION: once per game even as the sleepers change', () => {
    // The test above repeated the SAME three squares, which is the one case the
    // old square-keyed guard handled — so it passed while David heard the caveat
    // EIGHT times in one game. These are his actual samples, in order, from the
    // PostHog transcript of 2026-08-11: one piece wakes up, the sample shifts,
    // and the "once per game" guard saw a brand-new observation every time.
    const said = new Set<string>();
    const samples = [['a1', 'c1', 'd1'], ['d3', 'f3', 'a1'], ['c3', 'f3', 'a1'], ['f3', 'a1', 'f1']];
    const spoke = samples.map((idle) => {
      const plan = planWithIdle(idle);
      describePlan(plan, 'mine', said);
      return plan.aside;
    });
    expect(spoke.filter(Boolean), `heard ${spoke.filter(Boolean).length} times`).toHaveLength(1);
    expect(spoke[0]).toMatch(/a1, c1 and d1/);
  });
});

// ─── DAVID'S GAME OF 2026-08-11: THREE SENTENCES THAT READ AS BROKEN ─────────
//
// All three are the same class of defect — every clause was TRUE and the
// utterance was still unusable, because nothing checked what the sentence said
// once the values were substituted in.
describe('sentences that were true and still wrong', () => {
  const planWith = (over: Partial<SidePlan>): SidePlan => ({
    color: 'white', headingFor: [], opening: [], trading: [], outposts: [],
    materialSwing: 0, passedPawns: [], shieldStripped: 0, tactic: null, mates: false,
    nearEnemyKing: 0, kingAttackSquares: [], materialSquares: [], tradeSquares: [],
    tacticSquare: null, idlePieces: [], maneuver: null, checks: 0, promotes: null,
    text: '', aside: '', spokenClauses: [], ...over,
  });

  it('never routes a piece to a square "by way of" that same square', () => {
    // His exact utterances: "walk the queen round to c2, by way of c2 and b3"
    // and "walk the knight round to c6, by way of c6 and a5". The journeys are
    // real — the piece left and came back — the sentences are not.
    const said = describePlan(planWith({
      maneuver: { piece: 'queen', path: ['d1', 'c2', 'b3', 'c2'] },
    }), 'mine');
    expect(said).not.toMatch(/to c2, by way of[^.]*\bc2\b/);
    if (/walk the queen/.test(said)) expect(said).toMatch(/to c2, by way of b3/);
  });

  it('says nothing at all when the only waypoint IS the destination', () => {
    // d1 → c2 → d1 → c2. Every intermediate square is either where it started
    // or where it ends up, so there is no reroute left to describe and the
    // clause must drop rather than reach for a phrasing.
    const said = describePlan(planWith({
      maneuver: { piece: 'knight', path: ['d1', 'c2', 'd1', 'c2'] },
    }), 'mine');
    expect(said).not.toMatch(/by way of/);
  });

  it('the marks follow the route it actually described', () => {
    const plan = planWith({ maneuver: { piece: 'bishop', path: ['f1', 'e2', 'g4', 'e2'] } });
    describePlan(plan, 'mine');
    const clause = plan.spokenClauses.find((c) => /by way of/.test(c.text));
    expect(clause?.squares).toEqual(['f1', 'g4', 'e2']);
  });

  it('promotes to a new queen once, not twice', () => {
    // The clause was added to the list twice in one edit — same weight, same
    // text, back to back — so a promoting line said it and then said it again.
    const said = describePlan(planWith({ promotes: 'a8' }), 'mine');
    expect(said.match(/new queen on a8/g) ?? []).toHaveLength(1);
  });

  it('names every standing tactic in ONE frame, not one frame each', () => {
    // Verbatim from the transcript: "There's already a fork sitting on the
    // board, whether or not anyone plays into it. There's already a removal of
    // the defender sitting on the board, whether or not anyone plays into it."
    const read = {
      tacticsNow: ['fork', 'removal_of_guard'], oppositeWings: false,
      islands: { white: 1, black: 1 }, halfOpen: { white: [], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    };
    const line = positionReadLine(read, 'white', new Set());
    expect(line.match(/sitting on the board/g) ?? []).toHaveLength(1);
    expect(line).toMatch(/a fork and a removal of the defender/);
  });

  it('still refuses to re-announce a tactic named on an earlier ply', () => {
    const said = new Set<string>();
    const read = (tactics: string[]) => ({
      tacticsNow: tactics, oppositeWings: false,
      islands: { white: 1, black: 1 }, halfOpen: { white: [], black: [] },
      endgameType: null, materialBalance: 0, evalSwingCp: null,
    });
    const first = positionReadLine(read(['fork']), 'white', said);
    const second = positionReadLine(read(['fork', 'pin']), 'white', said);
    expect(first).toMatch(/a fork sitting/);
    expect(second).toMatch(/a pin sitting/);
    expect(second, 'the fork was already said').not.toMatch(/fork/);
  });
});
