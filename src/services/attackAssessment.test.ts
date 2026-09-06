import { describe, it, expect } from 'vitest';
import { assembleAttackAssessment } from './groundedAnswer';
import { isAttackAssessmentQuestion, isPlanQuestion } from '../coach/questionIntents';

// David 2026-09-06: "if an attack on the king side is good. Or if I have a valid
// attack lined up." The coach must ANSWER this — a board-computed attacker-vs-
// defender count on the enemy king, not a generic eval readout.

describe('isAttackAssessmentQuestion — routes the attack ask', () => {
  const yes = [
    'do I have an attack lined up?',
    'do I have a valid attack?',
    'is my kingside attack good?',
    'is my attack sound?',
    'do I have enough for an attack?',
    'is there a real attack here?',
    'can I mount an attack?',
    'is a kingside attack good here',
  ];
  for (const q of yes) it(`YES: "${q}"`, () => expect(isAttackAssessmentQuestion(q)).toBe(true));

  // Must NOT swallow a move-hunt or a generic plan question.
  const no = ['what should I play here?', "what's my plan?", 'attack the d5 pawn'];
  for (const q of no) it(`no: "${q}"`, () => expect(isAttackAssessmentQuestion(q)).toBe(false));
});

describe('assembleAttackAssessment — counts attackers vs defenders on the enemy king', () => {
  it('reports a REAL attack when the student outnumbers the defenders (3 vs 1)', () => {
    const fen = 'r1b2rk1/ppp2ppp/8/6N1/3P4/3B1R2/PPP2PPP/2Q1K3 w - - 0 1';
    const a = assembleAttackAssessment(fen, 'white');
    expect(a?.facts).toMatch(/real attack/i);
    expect(a?.facts).toMatch(/3 pieces/);
    expect(a?.facts).toMatch(/1 defender\b/);
  });

  it('reports NO attack from the starting position (nothing bears on the king)', () => {
    const a = assembleAttackAssessment('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white');
    expect(a?.facts).toMatch(/no attack lined up/i);
  });

  it('notes an uncastled enemy king in the centre as a target', () => {
    // Black king still on e8; a couple of White pieces eyeing the centre.
    const fen = 'rnbqk2r/ppp1bppp/4pn2/8/2BP4/4PN2/PPP2PPP/RNBQ1RK1 w kq - 0 1';
    const a = assembleAttackAssessment(fen, 'white');
    expect(a?.facts).toMatch(/still in the centre/i);
  });

  it('is purely board-computed (no engine source) — G0', () => {
    const a = assembleAttackAssessment('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'white');
    expect(a?.sources).toEqual(['board:chess.js']);
  });

  it('does not conflate the attack ask with the plan lane', () => {
    // "do I have an attack" is NOT a plan question — the two lanes stay separate.
    expect(isPlanQuestion('do I have an attack lined up?')).toBe(false);
  });
});
