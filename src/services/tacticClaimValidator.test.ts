import { describe, it, expect } from 'vitest';
import { validateTacticClaims, stripUngroundedTacticSentences } from './tacticClaimValidator';
import type { TacticsLiveContext } from '../coach/types';

const EMPTY_CTX: TacticsLiveContext = {
  immediate: [],
  hanging: [],
  threats: [],
  opportunities: [],
  lookaheadDepth: 4,
};

function ctxWith(allowed: Array<{ type: string; description: string; squares?: string[]; depthAhead?: number; line?: string[] }>): TacticsLiveContext {
  return {
    immediate: allowed.map((a) => ({
      type: a.type,
      description: a.description,
      squares: a.squares ?? [],
    })),
    hanging: [],
    threats: [],
    opportunities: [],
    lookaheadDepth: 4,
  };
}

describe('validateTacticClaims', () => {
  it('returns empty results when the response has no tactic vocabulary', () => {
    const r = validateTacticClaims('Solid developmental move. Both sides finish development naturally.', EMPTY_CTX);
    expect(r.claims).toEqual([]);
    expect(r.violations).toEqual([]);
    expect(r.hasAnyTacticClaim).toBe(false);
  });

  it('flags a fork claim as a violation when no fork is in the context', () => {
    const r = validateTacticClaims('Watch out — Black has a fork on c7 after Nb5.', EMPTY_CTX);
    expect(r.hasAnyTacticClaim).toBe(true);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].type).toBe('fork');
    expect(r.violations[0].reason).toBe('not-in-vocabulary');
  });

  it('accepts a fork claim when fork is in immediate vocabulary', () => {
    const ctx = ctxWith([{ type: 'fork', description: 'Knight on d5 forks queen and rook' }]);
    const r = validateTacticClaims('Knight on d5 forks the queen and rook.', ctx);
    expect(r.violations).toHaveLength(0);
    expect(r.claims.some((c) => c.type === 'fork' && c.valid)).toBe(true);
  });

  it('accepts hanging-piece mention when context.hanging is populated', () => {
    const ctx: TacticsLiveContext = {
      ...EMPTY_CTX,
      hanging: [{ square: 'd7', piece: 'q', color: 'b' }],
    };
    const r = validateTacticClaims('Black queen on d7 is hanging — Nxd7 wins material.', ctx);
    expect(r.violations).toHaveLength(0);
  });

  it('flags hanging-piece claim when no piece is actually hanging in context', () => {
    const r = validateTacticClaims('Black queen on d7 is hanging — Nxd7 wins material.', EMPTY_CTX);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].type).toBe('hanging');
  });

  it('uses "no-context-block" reason when context is null', () => {
    const r = validateTacticClaims('Black has a pin on the e-file.', null);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].reason).toBe('no-context-block');
  });

  it('handles multiple distinct tactic words in one response', () => {
    const ctx = ctxWith([
      { type: 'fork', description: 'fork on c7' },
      { type: 'pin', description: 'pin on e-file' },
    ]);
    const r = validateTacticClaims(
      'Pin on the e-file. Fork is also on the table. Skewer would lose tempo.',
      ctx,
    );
    expect(r.claims.length).toBeGreaterThanOrEqual(3);
    // fork + pin valid, skewer is a violation
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].type).toBe('skewer');
  });

  it('treats "double attack" as a fork synonym', () => {
    const r = validateTacticClaims('White creates a double attack on the knight and bishop.', EMPTY_CTX);
    expect(r.claims.some((c) => c.type === 'fork')).toBe(true);
  });

  it('treats "deflection" as removal-of-guard', () => {
    const r = validateTacticClaims('Nice deflection — the rook drops.', EMPTY_CTX);
    expect(r.claims.some((c) => c.type === 'removal_of_guard')).toBe(true);
  });

  it('flags back-rank claim when not in context', () => {
    const r = validateTacticClaims('Back rank is weak — be careful of mate on the back rank.', EMPTY_CTX);
    expect(r.violations.some((v) => v.type === 'back_rank')).toBe(true);
  });
});

describe('stripUngroundedTacticSentences (the enforcing gate)', () => {
  it('drops a sentence that asserts a tactic absent from the bounded context', () => {
    const text = 'This develops the knight. There is a pin on the e-file.';
    const { clean, dropped } = stripUngroundedTacticSentences(text, EMPTY_CTX);
    expect(clean).toBe('This develops the knight.');
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toContain('pin');
  });

  it('keeps a tactic sentence when the tactic IS in the bounded context', () => {
    const ctx = ctxWith([{ type: 'pin', description: 'pin on e7' }]);
    const text = 'There is a pin on the e-file. Exploit it with Re1.';
    const { clean, dropped } = stripUngroundedTacticSentences(text, ctx);
    expect(dropped).toHaveLength(0);
    expect(clean).toBe(text);
  });

  it('keeps a NEGATION sentence ("there is no pin here") even when out of vocab', () => {
    const text = 'There is no pin here, so develop normally.';
    const { clean, dropped } = stripUngroundedTacticSentences(text, EMPTY_CTX);
    expect(dropped).toHaveLength(0);
    expect(clean).toBe(text);
  });

  it('keeps an AVOIDANCE sentence ("this avoids a fork")', () => {
    const text = 'Castle first. This avoids a fork on e2.';
    const { clean, dropped } = stripUngroundedTacticSentences(text, EMPTY_CTX);
    expect(dropped).toHaveLength(0);
    expect(clean).toBe(text);
  });

  it('is a no-op when NO context block was sent (can\'t disprove a concept)', () => {
    const text = 'The idea of a pin is to immobilize a defender.';
    const { clean, dropped } = stripUngroundedTacticSentences(text, null);
    expect(dropped).toHaveLength(0);
    expect(clean).toBe(text);
  });

  it('strips a fabricated tactic from inside the spoken [VOICE:] block', () => {
    const text = 'Develop calmly. [VOICE: Nf3 develops. Black has a deadly skewer on the long diagonal.]';
    const { clean, dropped } = stripUngroundedTacticSentences(text, EMPTY_CTX);
    expect(clean).toBe('Develop calmly. [VOICE: Nf3 develops.]');
    expect(dropped.some((d) => d.includes('skewer'))).toBe(true);
  });

  it('never severs a [BOARD: arrow] / [[ACTION]] marker when dropping a neighbour', () => {
    const text = 'Play Nf3. [BOARD: arrow:g1-f3:green] There is a fork on f7. [[ACTION:play_move {"san":"Nf3"}]]';
    const { clean } = stripUngroundedTacticSentences(text, EMPTY_CTX);
    expect(clean).toContain('[BOARD: arrow:g1-f3:green]');
    expect(clean).toContain('[[ACTION:play_move {"san":"Nf3"}]]');
    expect(clean).not.toMatch(/fork/);
  });
});
