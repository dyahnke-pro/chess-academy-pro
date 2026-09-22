import { describe, it, expect } from 'vitest';
import {
  assembleRetrospectiveAnswer, assembleMethodAnswer, assembleHintAnswer, hintUnavailableReason,
  assemblePiecePlanAnswer, assembleRepertoireGapAnswer, assembleOpeningProfileAnswer, answerBoardQuestion,
} from './groundedAnswer';
import { stripQuestionFiller } from '../coach/questionIntents';

/** THE ROUTER'S COMPUTERS (PLAN §E, 2026-09-22). Every clause the four new
 *  lanes speak is board-computed; these prove what comes OUT, on real boards. */

// After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Nc3 Nf6 — a normal opening board.
const ITALIAN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// After 1.e4: the f1 bishop's diagonal is open.
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('assembleRetrospectiveAnswer — the move ON THE TAPE, whose move it was', () => {
  // Position before 1...Nc6 in the Italian: r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b
  const beforeBc5 = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  it("the student's move that WAS best — named, with what it did, no 'better'", () => {
    const a = assembleRetrospectiveAnswer({
      playedSan: 'Bc5', fenBefore: beforeBc5, moveNumber: 3, moverColor: 'black', mover: 'student',
      bestMoveUci: 'f8c5', cpLoss: 0, quality: 'best', missedMate: null, allowedMate: null,
    });
    expect(a.facts).toMatch(/^Your Bc5 on move 3 was the engine's top move/);
    expect(a.facts).not.toMatch(/preferred/);
  });
  it("the COACH's own move, not best — honest about the seat and names the engine's choice", () => {
    const a = assembleRetrospectiveAnswer({
      playedSan: 'a6', fenBefore: beforeBc5, moveNumber: 3, moverColor: 'black', mover: 'coach',
      bestMoveUci: 'f8c5', cpLoss: 60, quality: 'inaccuracy', missedMate: null, allowedMate: null,
    });
    expect(a.facts).toMatch(/^My a6 on move 3/);
    expect(a.facts).toMatch(/The engine preferred Bc5/);
    expect(a.facts).toMatch(/my skill-level move/);
    expect(a.bestMoveSan).toBe('Bc5');
  });
  it('a stored CLASS with no centipawns speaks the class and NO invented figure (G0)', () => {
    const a = assembleRetrospectiveAnswer({
      playedSan: 'a6', fenBefore: beforeBc5, moveNumber: 3, moverColor: 'black', mover: 'student',
      bestMoveUci: 'f8c5', cpLoss: null, quality: 'mistake', missedMate: null, allowedMate: null,
    });
    expect(a.facts).toMatch(/was a mistake\./);
    expect(a.facts).not.toMatch(/points/);
  });
  it('no engine read at all — names the move + ply and says the grade is missing, never the stock line', () => {
    const a = assembleRetrospectiveAnswer({
      playedSan: 'a6', fenBefore: beforeBc5, moveNumber: 3, moverColor: 'black', mover: 'student',
      bestMoveUci: null, cpLoss: null, quality: null, missedMate: null, allowedMate: null,
    });
    expect(a.facts).toMatch(/Your a6 on move 3/);
    expect(a.facts).toMatch(/don't have an engine read/);
    expect(a.facts).not.toMatch(/verify that precisely/);
  });
});

describe('assembleMethodAnswer — how to think here, NEVER the best move', () => {
  it('lists the real forcing moves and the candidates, and never names the engine move', () => {
    const a = assembleMethodAnswer({ fen: ITALIAN, studentColor: 'white', engineBestSan: 'd3' });
    expect(a).not.toBeNull();
    const f = a!.facts;
    expect(f).toMatch(/^Here's the routine for this position/);
    expect(f).toMatch(/First, their idea/);
    expect(f).toMatch(/Then the forcing moves/);
    expect(f).toMatch(/Nxe5/);            // a capture that genuinely exists here
    expect(f).toMatch(/Then candidates/);
    expect(f).not.toMatch(/\bd3\b/);      // the engine's move is withheld
    expect(f).not.toMatch(/best move/i);
    expect(a!.bestMoveSan).toBeNull();
  });
  it('on a quiet board says so instead of inventing a forcing move', () => {
    const a = assembleMethodAnswer({ fen: START, studentColor: 'white', engineBestSan: 'e4' });
    expect(a!.facts).toMatch(/no checks or captures/);
    expect(a!.facts).not.toMatch(/\be4\b/);
  });
  it('closes with the habit the moment earns', () => {
    const a = assembleMethodAnswer({ fen: ITALIAN, studentColor: 'white', engineBestSan: 'Nxe5' });
    expect(a!.facts).toMatch(/forcing/i);
  });
});

describe('assembleHintAnswer — piece + goal + the WHY, square withheld', () => {
  it('names the piece and the idea, never the destination square', () => {
    const a = assembleHintAnswer({ fen: START, bestMoveUci: 'e2e4', moverColor: 'white' });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/look at your pawn on e2/);
    expect(a!.facts).not.toMatch(/\be4\b/);
    expect(a!.facts).toMatch(/Where does it want to go\?$/);
  });
  it('null when the uci does not fit the board', () => {
    expect(assembleHintAnswer({ fen: START, bestMoveUci: 'e4e5', moverColor: 'white' })).toBeNull();
  });
  it('the unavailable reasons are CONCRETE, never the generic refusal', () => {
    expect(hintUnavailableReason({ hasFen: false, hasEngineMove: false })).toMatch(/no position on the board/);
    expect(hintUnavailableReason({ hasFen: true, hasEngineMove: false })).toMatch(/engine read/);
    for (const r of [hintUnavailableReason({ hasFen: false, hasEngineMove: false }), hintUnavailableReason({ hasFen: true, hasEngineMove: false }), hintUnavailableReason({ hasFen: true, hasEngineMove: true })]) {
      expect(r).not.toMatch(/verify that precisely/);
    }
  });
});

describe('assemblePiecePlanAnswer — the plan for ONE named piece', () => {
  it('the f1 bishop on move one: blocked by its own e2 pawn, so the plan is to clear the line', () => {
    const a = assemblePiecePlanAnswer(START, stripQuestionFiller('whats teh best plan for my bishp on f1'), 'white', null);
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/^Your bishop on f1/);
    expect(a!.facts).toMatch(/can't move at all right now/);
    expect(a!.facts).toMatch(/your own pawn on e2/);
    expect(a!.facts).toMatch(/clear the line first/);
  });
  it('after 1.e4 the bishop has a square, ranked by the board', () => {
    const a = assemblePiecePlanAnswer(AFTER_E4, 'what is the plan for my bishop on f1', 'white', null);
    expect(a!.facts).toMatch(/sees \d+ squares from f1/);
    expect(a!.facts).toMatch(/The square that opens it up is [a-h][1-8]/);
    expect(a!.bestMoveFromTo?.from).toBe('f1');
  });
  it("uses the ENGINE's square when the engine's move is this piece", () => {
    const a = assemblePiecePlanAnswer(AFTER_E4, 'plan for my bishop', 'white', 'f1c4');
    expect(a!.facts).toMatch(/The engine's line puts it on c4/);
  });
  it('a piece the student does not have is answered honestly', () => {
    expect(assemblePiecePlanAnswer(START, 'plan for my bishop on d3', 'white', null)!.facts).toMatch(/don't have a bishop on d3/);
  });
  it('the board dispatcher routes the typo ask to this computer', () => {
    const r = answerBoardQuestion(START, stripQuestionFiller('whats teh best plan for my bishp on f1'), 'white');
    expect(r?.aspect).toBe('piece-plan');
    expect(r?.answer.facts).toMatch(/bishop on f1/);
  });
});

describe('assembleRepertoireGapAnswer learn-next — the HOME opening through the floor', () => {
  const base = { kind: 'learn-next' as const, offBookPct: 49, totalGames: 932, bestAgainst: [], gamesByColor: { white: 470, black: 462 } };
  it("NEGATIVE CONTROL: with the Pirc on file, the 3-game 0% Elephant Gambit is never 'what to learn next'", () => {
    const a = assembleRepertoireGapAnswer({
      ...base,
      worstAgainst: [{ name: 'Elephant Gambit', winRate: 0, games: 3 }],
      homeCandidates: [{ name: 'Pirc Defence', color: 'black', games: 63, winRate: 49, thin: false }],
    });
    expect(a!.facts).toMatch(/your Pirc Defence as black scores 49% over 63 games/);
    expect(a!.facts).not.toMatch(/Elephant/);
  });
  it('nothing clears the floor: the thin read speaks WITH its sample size', () => {
    const a = assembleRepertoireGapAnswer({
      ...base, gamesByColor: { white: 8, black: 6 },
      worstAgainst: [{ name: 'Elephant Gambit', winRate: 0, games: 3 }],
      homeCandidates: [{ name: 'Elephant Gambit', color: 'black', games: 3, winRate: 0, thin: true }],
    });
    expect(a!.facts).toMatch(/only 3 games/);
    expect(a!.facts).not.toMatch(/worst matchup at 0% over 3 games\. Want me to teach/);
  });
});

describe('assembleOpeningProfileAnswer — a thin row always carries its sample size', () => {
  it('thin weakest row says "only N games"', () => {
    const a = assembleOpeningProfileAnswer({ kind: 'weakest', openings: [{ name: 'Elephant Gambit', color: 'black', games: 3, winRate: 0, thin: true }] });
    expect(a!.facts).toMatch(/0% over only 3 games — too few to be sure/);
  });
  it('a floor-clearing row speaks plainly', () => {
    const a = assembleOpeningProfileAnswer({ kind: 'weakest', openings: [{ name: 'Pirc Defence', color: 'black', games: 63, winRate: 49, thin: false }] });
    expect(a!.facts).toMatch(/49% win over 63 games/);
    expect(a!.facts).not.toMatch(/only/);
  });
});
