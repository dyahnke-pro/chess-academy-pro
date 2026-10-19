import { describe, it, expect } from 'vitest';
import { NO_PROOF } from './proof';
import { decideTurn, LANE_PHASE, laneOutOfPhase } from './learnTurnDoor';

// David's Smith-Morra, after 34.Kf3 (2026-10-19): a knight-and-rook ending.
const ENDING = '5r2/pp4k1/3p1R2/2nN2P1/4P3/5K2/8/8 b - - 0 34';
const MIDDLEGAME = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

describe('the ending is narrated as an ending (David 2026-10-19: endgame narrations not targeted)', () => {
  it('opening, castling and king-attack lanes are held in an ending, with the reason', () => {
    const d = decideTurn([
      { lane: 'kingSafety', proof: NO_PROOF.stated, text: 'Your king is still in the centre and castling is ready.', fen: ENDING },
      { lane: 'openingIdea', proof: NO_PROOF.stated, text: 'Master games from here go for the c5 break.', fen: ENDING },
      { lane: 'pawnEnding', proof: NO_PROOF.stated, text: 'Your g-pawn is two squares from queening and their king cannot catch it.', fen: ENDING, squares: ['g5', 'g7'] },
    ]);
    expect(d.spoke).toEqual(['pawnEnding']);
    expect(d.held).toEqual(expect.arrayContaining(['kingSafety', 'openingIdea']));
  });

  it('the same lanes still speak before the ending', () => {
    expect(laneOutOfPhase('kingSafety', MIDDLEGAME)).toBe(false);
    expect(laneOutOfPhase('kingSafety', ENDING)).toBe(true);
  });

  it('danger, the verdict and the move\'s own reason are never phase-held', () => {
    for (const l of ['threat', 'dangerLevels', 'threatAnswer', 'mistake', 'drawback', 'moveIntent', 'movePoint', 'tactic', 'planArc'] as const) {
      expect(LANE_PHASE[l]).toBe('any');
    }
  });
});

describe('a tactic alert is heard (David 2026-10-19: "i also never heard a tactic alert")', () => {
  const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  it('a staked tactic speaks on a verdict turn; the same tactic unstaked was held', async () => {
    const { costStakes, mateStakes } = await import('./factStakes');
    const verdict = { lane: 'mistake' as const, proof: NO_PROOF.stated, text: 'Nf6 was a mistake — it cost a point and a half.', fen: FEN, stakes: costStakes(150) ?? undefined };
    const tactic = { lane: 'tactic' as const, proof: NO_PROOF.stated, text: 'There is a forced mate here.', fen: FEN, squares: ['f7'] };
    expect(decideTurn([verdict, tactic]).spoke).not.toContain('tactic');
    expect(decideTurn([verdict, { ...tactic, stakes: mateStakes('you', 1, true) }]).spoke).toContain('tactic');
  });

  it('the page marks the alert said only after the door spoke it, and stakes it', async () => {
    const { readFileSync } = await import('node:fs');
    const code = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(code).toMatch(/spoke\.includes\('tactic'\)\) markTacticSaid\?\.\(\)/);
    expect(code).toMatch(/lane: 'tactic' as const, [^\n]*stakes: tacticStakes/);
    // The say-once memory is written only inside the deferred mark.
    const writes = code.match(/lastTacticKey = /g) ?? [];
    expect(writes.length).toBe(1);
    expect(code).toMatch(/markTacticSaid = \(\) => \{\s*learnMemRef\.current\.lastTacticKey = saidKey/);
  });
});
