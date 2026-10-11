// THE HARD QUESTIONS, LOCKED (hard-question walk 2026-10-11, GothamChess–
// AlexOstrovskiy). Each was misread on a real board; each now has to reach
// the computer that answers it. A new routing change that sends one of these
// back to the wrong place fails here, not on a student.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readTurnInCode } from './chatTurnCodeReader';
import { validateChatTurn } from './chatTurn';
import { notationQuestionSan } from '../services/groundedAnswer';
import { isMateQuestion, isMatePatternNameQuestion } from './questionIntents';
import { matchTrainingAidRoute } from '../services/trainingAidRouter';

const GAME = 'd4 d5 Bf4 Nf6 e3 g6 Nc3 Bg7 h4 O-O h5 Nxh5 Rxh5 gxh5 Qxh5 e6 Bd3 f5 g4 Nd7 gxf5 Nf6 Qh2 exf5 O-O-O Ne4 Bxc7 Qe8 Nxd5 Be6 Nf4 Rc8 Be5 Bxe5 dxe5 Bxa2 Bxe4 fxe4 Qg3+ Kh8 e6 Qc6 Rd2 Rfd8 Nh5 Rxd2 Qg7#'.split(' ');
const at = (plies: number) => {
  const c = new Chess();
  for (const m of GAME.slice(0, plies)) c.move(m);
  return { fen: c.fen(), history: GAME.slice(0, plies), studentColor: 'white' as const };
};

describe('hard questions reach the right computer', () => {
  it.each([
    [4, 'If Black plays c5 and I take dxc5, what happens?', ['c5', 'dxc5']],
    [6, 'Calculate Nh5 Bg5 h6 Bh4 g5 — is my bishop trapped?', ['Nh5', 'Bg5', 'h6', 'Bh4', 'g5']],
    [8, 'Why not Nb5 hitting c7? Calculate Nb5 Na6.', ['Nb5', 'Na6']],
    [12, 'After Rxh5 gxh5 Qxh5, count the material.', ['Rxh5', 'gxh5', 'Qxh5']],
    [26, 'Can I take e4? Calculate Bxe4 fxe4.', ['Bxe4', 'fxe4']],
  ])('ply %i: "%s" is a line, calculated — never refused', (ply, ask, sans) => {
    const b = at(ply);
    const t = readTurnInCode(ask, b as never)!;
    expect(t?.kind).toBe('line-outcome');
    expect(t.referents.map((r) => (r as { san: string }).san)).toEqual(sans);
    expect(validateChatTurn(t, b as never).ok).toBe(true);
  });

  it('ply 2: "if I play c4 and you take" is the line c4 dxc4 — not a pawn on c4', () => {
    const t = readTurnInCode('If I play c4 and you take, how do I win the pawn back?', at(2) as never)!;
    expect(t.kind).toBe('line-outcome');
    expect(t.referents.map((r) => (r as { san: string }).san)).toEqual(['c4', 'dxc4']);
  });

  it('ply 20: "was g4 best, or Qh2?" compares the two where g4 was played', () => {
    const t = readTurnInCode('Was g4 best? The engine might prefer Qh2 — explain the difference.', at(20) as never)!;
    expect(t.kind).toBe('retrospective-move');
    expect(t.referents.map((r) => (r as { san: string }).san)).toEqual(['g4', 'Qh2']);
  });

  it.each([
    "What's the main threat here? Can Black defend h7 after Bd3? Calculate Bd3 f5.",
    'What is Black threatening? Is Qc2+ a problem? Calculate it.',
  ])('"%s" is never a notation question', (ask) => {
    expect(notationQuestionSan(ask)).toBeNull();
  });

  it('ply 45: "is there a forced mate for me now?" is the mate question', () => {
    expect(isMateQuestion('Is there a forced mate for me now? How many moves? Show me.')).toBe(true);
  });

  it('after mate: "what is the name of this mating pattern?" names it — never a drill', () => {
    expect(isMatePatternNameQuestion('What is the name of this mating pattern?')).toBe(true);
    expect(matchTrainingAidRoute('What is the name of this mating pattern?')).toBeNull();
  });
});
