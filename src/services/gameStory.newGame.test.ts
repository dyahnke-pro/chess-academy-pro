/**
 * A SECOND GAME CROSSES INTO THE MIDDLEGAME OUT LOUD (WO-STORY-MATRIX-01 P1-8c,
 * design docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Fails on the code before it: Learn held the phase detector's "already fired"
 * ledger in a page ref (`phaseStateRef`) that nothing reset inside a mount —
 * `resetPerGameMemory`, `learnMemory.newGame` and `forgetPageRefs` all passed
 * it by — so the first game spent the opening→middlegame boundary for every
 * game after it, and game 2's move into the middlegame fired nothing. The
 * ledger is the game's story now: the phase events it has noted.
 */
import { describe, it, expect } from 'vitest';
import { createLearnMemory } from './learnMemory';
import { storyPhaseTransition, type LastMoveSnapshot } from './phaseTransitionDetector';
import { phaseCrossed } from './gameStory';

/** White has castled with both rooks home — the opening is over (rule 2). */
const INTO_MIDDLEGAME: LastMoveSnapshot = {
  fen: 'r1bq1rk1/pp3ppp/2np1n2/2b1p3/4P3/2NP1N2/PPPQ1PPP/R1B2RK1 w - - 0 21',
  san: 'Re1', moveNumber: 21, isCoachMove: false,
};
/** Queens off, a rook each: the endgame. */
const INTO_ENDGAME: LastMoveSnapshot = {
  fen: '4k3/8/8/3r4/8/8/3R4/4K3 w - - 0 30',
  san: 'Rd2', moveNumber: 59, isCoachMove: false,
};

describe('two games in one mount: each crosses its own phases', () => {
  it('game 2\'s move into the middlegame fires its phase event', () => {
    let plies = 0;
    const mem = createLearnMemory({ livePlies: () => plies });
    plies = 21; mem.observe();
    const first = storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white');
    expect(first?.kind, 'game 1 crosses into the middlegame').toBe('opening-to-middlegame');
    expect(storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white'), 'a boundary fires once a game').toBeNull();
    // A NEW GAME in the same mount — the board went back to the start.
    plies = 1;
    expect(mem.observe()).toBe(true);
    plies = 21; mem.observe();
    const second = storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white');
    expect(second?.kind, 'game 2 crosses too').toBe('opening-to-middlegame');
    expect(phaseCrossed(mem.story.current(), 'middlegame')).toBe(true);
  });

  it('the endgame too, after a new game started from the caller\'s door', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white');
    expect(storyPhaseTransition(mem.story, INTO_ENDGAME, 'white')?.kind).toBe('middlegame-to-endgame');
    mem.newGame();
    storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white');
    expect(storyPhaseTransition(mem.story, INTO_ENDGAME, 'white')?.kind).toBe('middlegame-to-endgame');
  });

  it('a takeback before the boundary takes it back; one after it keeps it', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white');
    mem.rewind(22);
    expect(storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white'), 'still crossed: the board is past it').toBeNull();
    mem.rewind(20);
    expect(storyPhaseTransition(mem.story, INTO_MIDDLEGAME, 'white')?.kind, 'replayed into the middlegame: it fires again').toBe('opening-to-middlegame');
  });

  it('an opening that ends queenless spends the endgame boundary with it (one beat, not two)', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    // The opening's end found on a board that is already an endgame.
    expect(storyPhaseTransition(mem.story, INTO_ENDGAME, 'white')?.kind).toBe('opening-to-middlegame');
    expect(phaseCrossed(mem.story.current(), 'endgame')).toBe(true);
    expect(storyPhaseTransition(mem.story, INTO_ENDGAME, 'white')).toBeNull();
  });
});
