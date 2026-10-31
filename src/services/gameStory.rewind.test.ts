/**
 * A TAKEBACK TAKES BACK THE PLAN TOO (WO-STORY-MATRIX-01 P1-8b, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Fails on the code before it: Learn kept the student's plan thread on
 * `learnMemory.planThread`, which `learnMemory.rewind` never touched — a plan
 * stated after the board a takeback returned to stayed "stated", so replaying
 * the same move stated nothing: the plan the student had just un-heard was
 * never heard again (and its method, "How do you find a plan?", never asked).
 * The thread is the story's now, checkpointed by ply.
 */
import { describe, it, expect } from 'vitest';
import { createLearnMemory } from './learnMemory';
import { planThreadTurn, adoptPlanTrial } from './planThread';
import { withoutTags } from '../utils/thinkPause';

/** A rook ending: past the opening at any ply, with a plan on the board. */
const OPEN_C = 'r5k1/pp3ppp/8/3p4/8/8/PP3PPP/3R2K1 b - - 0 25';
const asWhite = (fen: string): string => fen.replace(' b ', ' w ');

/** One plan turn as Learn runs it: on a copy of the story's thread, adopted
 *  when its line spoke (the door kept it), at the ply the board is on. */
function planTurn(mem: ReturnType<typeof createLearnMemory>, ply: number): string[] {
  const trial = mem.story.plans().thread;
  const lines = planThreadTurn(trial, { ply, fenBefore: OPEN_C, fenAfter: asWhite(OPEN_C), student: 'w', holdPlayable: false });
  const desk = mem.story.plans();
  if (adoptPlanTrial(desk.thread, trial, lines.map((l) => l.claim), lines.map((l) => l.claim))) mem.story.setPlans(ply, desk);
  // The think-pause tokens are per line; the words are what the student hears.
  return lines.map((l) => withoutTags(l.text));
}

describe('rewind(8) takes back a plan stated at ply 9 and a claim said at ply 10', () => {
  it('replaying ply 9 states the plan again — the method and all', () => {
    let plies = 8;
    const mem = createLearnMemory({ livePlies: () => plies });
    mem.observe();
    plies = 9; mem.observe();
    const first = planTurn(mem, 9);
    expect(first[0], 'the fixture states a plan').toMatch(/^How do you find a plan\?/);
    // Stood: the same board next turn says nothing.
    expect(planTurn(mem, 9)).toEqual([]);
    plies = 10; mem.observe();
    mem.story.commit(10, { claims: ['def:pin'] });
    const id = mem.gameId;
    mem.rewind(8);
    plies = 8;
    expect(mem.observe(), 'a takeback is not a new game').toBe(false);
    expect(mem.gameId).toBe(id);
    expect(mem.story.current().said.has('def:pin')).toBe(false);
    expect(mem.story.plans().thread.stated).toBeNull();
    plies = 9; mem.observe();
    expect(planTurn(mem, 9)).toEqual(first);
  });

  it('a plan stated at or before the board stays stated', () => {
    let plies = 8;
    const mem = createLearnMemory({ livePlies: () => plies });
    mem.observe();
    expect(planTurn(mem, 8).length).toBeGreaterThan(0);
    plies = 10; mem.observe();
    mem.rewind(8);
    plies = 8; mem.observe();
    expect(mem.story.plans().thread.stated?.ply).toBe(8);
    expect(planTurn(mem, 9)).toEqual([]);
  });

  it('a new game forgets the plans with everything else', () => {
    const mem = createLearnMemory({ livePlies: () => 8 });
    mem.observe();
    planTurn(mem, 8);
    mem.newGame();
    expect(mem.story.plans().thread.stated).toBeNull();
    expect(mem.story.plans().thread.methodSaid).toBe(false);
  });
});
