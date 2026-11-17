import { describe, it, expect } from 'vitest';
import { posesNeededSkill, skillSteerScore, neededSkillAlong, STEER_SKILLS } from './skillSteer';
import type { ScoringContext } from '../moveScoring';
import type { MisconceptionTagId } from '../../data/misconceptionTags';

// Danya's board vc--4hTQEnwa7s-11 (public/data/voiced-teachings.json, the
// note's lineSan from the start): Black (the coach) to move.
const FEN = 'r1b1kbnr/pppp1ppp/2n3q1/8/4p3/1P2N3/PBPPPPPP/RN1QKB1R b KQkq - 5 6';
const ctx = (needs: readonly MisconceptionTagId[]): ScoringContext => ({
  fen: FEN, coach: 'b', windowCp: 100, coachEvalCp: 0, pattern: null, phase: 'opening', bossId: null, targets: [],
  focus: { id: 'tactics', levels: new Set(['beginner']), needs: new Set(needs) },
});

describe('skillSteer (WO-SET-WEAKNESS-01): the coach sets up a skill the record needs', () => {
  it('…Bd6 asks the student a rook question the board did not ask before', () => {
    expect(posesNeededSkill(FEN, 'f8d6', new Set(STEER_SKILLS))).toContain('passive-rook');
    expect(skillSteerScore({ uci: 'f8d6', cpLoss: 0 }, ctx(['passive-rook']))).toBe(1);
  });
  it('a skill the record holds is never steered toward', () => {
    expect(posesNeededSkill(FEN, 'f8d6', new Set())).toEqual([]);
    expect(skillSteerScore({ uci: 'f8d6', cpLoss: 0 }, ctx([]))).toBe(0);
    expect(skillSteerScore({ uci: 'f8d6', cpLoss: 0 }, ctx(['bad-trade']))).toBe(0);
  });
  it('never a gift: …Qxg2 drops the queen to Bxg2, whatever it poses', () => {
    expect(skillSteerScore({ uci: 'g6g2', cpLoss: 0 }, ctx(STEER_SKILLS))).toBe(-1);
  });
  it('a move that asks nothing now, whose line sets the skill up a move later, pulls at half', () => {
    // …a6 asks nothing; the coach's line goes on Nc3 …Bd6, which asks it.
    expect(posesNeededSkill(FEN, 'a7a6', new Set(['passive-rook']))).toEqual([]);
    const line = ['a7a6', 'b1c3', 'f8d6'];
    expect(neededSkillAlong(FEN, 'a7a6', line, new Set(['passive-rook']))).toEqual({ skills: ['passive-rook'], now: false });
    expect(skillSteerScore({ uci: 'a7a6', cpLoss: 0, line }, ctx(['passive-rook']))).toBe(0.5);
    // No line, nothing to read on.
    expect(skillSteerScore({ uci: 'a7a6', cpLoss: 0 }, ctx(['passive-rook']))).toBe(0);
  });
  it('off a focus game it says nothing', () => {
    expect(skillSteerScore({ uci: 'f8d6', cpLoss: 0 }, { ...ctx(['passive-rook']), focus: null })).toBe(0);
  });
});
