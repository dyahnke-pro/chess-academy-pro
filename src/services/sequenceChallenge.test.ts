import { describe, it, expect } from 'vitest';
import { judgeSequenceAttempt, moverPlies, isLegalAt, EQUIVALENT_CP } from './sequenceChallenge';
import type { PvPly } from './pvPlayback';

const QUIET_FACTS = {
  captured: null, isCheck: false, isMate: false, promotion: null,
  tacticLanded: null, materialGained: 0, newOpenFiles: [],
  newPassedPawns: [], outpostGained: null, shieldLost: 0,
};

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function ply(overrides: Partial<PvPly>): PvPly {
  return {
    san: 'e4', uci: 'e2e4', moverColor: 'white',
    fenBefore: START,
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKB1R b KQkq e3 0 1',
    facts: QUIET_FACTS,
    ...overrides,
  };
}

describe('sequenceChallenge — R4 trust contract', () => {
  it('exact SAN (glyph-insensitive) and exact squares both credit', async () => {
    expect(await judgeSequenceAttempt({
      expected: ply({ san: 'Nf3+', uci: 'g1f3' }),
      attempt: { san: 'Nf3', from: 'g1', to: 'f3' },
      pvLineEvalCp: 100,
    })).toBe('exact');
    expect(await judgeSequenceAttempt({
      expected: ply({}),
      attempt: { san: 'e4', from: 'e2', to: 'e4' },
      pvLineEvalCp: 100,
    })).toBe('exact');
  });

  it('an eval-EQUIVALENT different move credits (the trust-killer defused)', async () => {
    const verdict = await judgeSequenceAttempt({
      expected: ply({}), // PV says e4, line promise +100
      attempt: { san: 'd4', from: 'd2', to: 'd4' },
      pvLineEvalCp: 100,
      evalProbe: () => Promise.resolve(80), // d4 evals +0.8 — within 30cp of promise
    });
    expect(verdict).toBe('equivalent');
  });

  it('a verified WORSE move is wrong', async () => {
    const verdict = await judgeSequenceAttempt({
      expected: ply({}),
      attempt: { san: 'a4', from: 'a2', to: 'a4' },
      pvLineEvalCp: 100,
      evalProbe: () => Promise.resolve(100 - EQUIVALENT_CP - 50), // clearly below the bar
    });
    expect(verdict).toBe('wrong');
  });

  it('probe unavailable → unverified (generous), NEVER wrong', async () => {
    expect(await judgeSequenceAttempt({
      expected: ply({}),
      attempt: { san: 'a4', from: 'a2', to: 'a4' },
      pvLineEvalCp: 100,
      evalProbe: () => Promise.reject(new Error('engine busy')),
    })).toBe('unverified');
    expect(await judgeSequenceAttempt({
      expected: ply({}),
      attempt: { san: 'a4', from: 'a2', to: 'a4' },
      pvLineEvalCp: 100,
      // no probe wired at all
    })).toBe('unverified');
  });

  it('mover-relative equivalence for a BLACK line', async () => {
    // Black line promising -120 (White POV): an attempt evaling -100 is
    // within 30cp for Black → equivalent; -60 is worse for Black → wrong.
    const expected = ply({ moverColor: 'black', san: 'e5', uci: 'e7e5' });
    expect(await judgeSequenceAttempt({
      expected, attempt: { san: 'c5', from: 'c7', to: 'c5' },
      pvLineEvalCp: -120, evalProbe: () => Promise.resolve(-100),
    })).toBe('equivalent');
    expect(await judgeSequenceAttempt({
      expected, attempt: { san: 'h5', from: 'h7', to: 'h5' },
      pvLineEvalCp: -120, evalProbe: () => Promise.resolve(-60),
    })).toBe('wrong');
  });

  it('moverPlies filters the student side of an alternating PV', () => {
    const plies = [
      ply({ moverColor: 'white', san: 'Nd5' }),
      ply({ moverColor: 'black', san: 'Qd8' }),
      ply({ moverColor: 'white', san: 'Nxf6+' }),
      ply({ moverColor: 'black', san: 'gxf6' }),
    ];
    expect(moverPlies(plies).map((p) => p.san)).toEqual(['Nd5', 'Nxf6+']);
  });

  it('isLegalAt guards a drifted board', () => {
    expect(isLegalAt(START, { san: 'e4', from: 'e2', to: 'e4' })).toBe(true);
    expect(isLegalAt(START, { san: 'e5', from: 'e7', to: 'e5' })).toBe(false); // not White's move
    expect(isLegalAt('garbage', { san: 'e4', from: 'e2', to: 'e4' })).toBe(false);
  });
});
