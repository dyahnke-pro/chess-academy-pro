import { describe, it, expect } from 'vitest';
import { findFocusPlant, NO_PLANTS, plantAsk, PLANT_EASIER_FROM_PLY, PLANT_FIRST_PLY, PLANT_SPACING_PLIES, presents, wantedDifficulty, type PlantState } from './focusPlant';
import type { FocusChance } from './focusChances';
import type { CoachLine, SlipRead } from '../../missions/earnedSlip';

describe('plantAsk — the focus is presented every game, harder by the record', () => {
  const red = { state: 'red' as const, posed: 0 };
  const owed = NO_PLANTS;
  const presented: PlantState = { ...NO_PLANTS, presented: { ply: 14, difficulty: 0 } };
  it('THE GUARANTEE: until your side has been presented, every state asks — green too, at its own step', () => {
    expect(plantAsk(owed, red, PLANT_FIRST_PLY)).toEqual({ tag: null, difficulty: 0 });
    expect(plantAsk(owed, { state: 'grey', posed: 0 }, PLANT_FIRST_PLY)).toEqual({ tag: null, difficulty: 0 });
    expect(plantAsk(owed, { state: 'short', posed: 0 }, PLANT_FIRST_PLY)).toEqual({ tag: null, difficulty: 1 });
    expect(plantAsk(owed, { state: 'green', posed: 0 }, PLANT_FIRST_PLY)).toEqual({ tag: null, difficulty: 2 });
  });
  it('no cap holds the guarantee back — not the chances the board already posed below your step', () => {
    expect(plantAsk(owed, { state: 'green', posed: 5 }, PLANT_FIRST_PLY)).toEqual({ tag: null, difficulty: 2 });
    expect(plantAsk({ ...owed, count: 3, lastPly: 12, done: true }, { state: 'short', posed: 4 }, 30)).toEqual({ tag: null, difficulty: 1 });
  });
  it('THE EASIER STEP: nothing presented by move 20 — one step easier, never below the plainest', () => {
    expect(wantedDifficulty('green', PLANT_EASIER_FROM_PLY - 1)).toBe(2);
    expect(wantedDifficulty('green', PLANT_EASIER_FROM_PLY)).toBe(1);
    expect(wantedDifficulty('short', PLANT_EASIER_FROM_PLY)).toBe(0);
    expect(wantedDifficulty('red', PLANT_EASIER_FROM_PLY)).toBe(0);
  });
  it('extras after it: red or untested up to three on your side; short and green none', () => {
    expect(plantAsk(presented, red, 30)).toEqual({ tag: null, difficulty: 0 });
    expect(plantAsk(presented, { state: 'red', posed: 3 }, 30), 'the board already posed three').toBeNull();
    expect(plantAsk({ ...presented, count: 3, lastPly: 10 }, red, 40), 'three plants is the most').toBeNull();
    expect(plantAsk({ ...presented, presented: { ply: 14, difficulty: 1 } }, { state: 'short', posed: 1 }, 30)).toBeNull();
    expect(plantAsk({ ...presented, presented: { ply: 14, difficulty: 2 } }, { state: 'green', posed: 1 }, 30)).toBeNull();
  });
  it('never in the opening, and spaced', () => {
    expect(plantAsk(owed, red, PLANT_FIRST_PLY - 1)).toBeNull();
    const after: PlantState = { ...NO_PLANTS, count: 1, lastPly: 20 };
    expect(plantAsk(after, red, 20 + PLANT_SPACING_PLIES - 1)).toBeNull();
    expect(plantAsk(after, red, 20 + PLANT_SPACING_PLIES)).not.toBeNull();
  });
  it('a find without a prompt ends the extras (never the guarantee); a miss asks for the same pattern', () => {
    expect(plantAsk({ ...presented, done: true }, red, 30)).toBeNull();
    expect(plantAsk({ ...owed, done: true }, red, 30), 'still owed').not.toBeNull();
    expect(plantAsk({ ...presented, need: 'missed-your-fork' }, red, 30)).toEqual({ tag: 'missed-your-fork', difficulty: 0 });
  });
  it('presents: your side at or above the step counts; their side never does', () => {
    const take = { seat: 'exploit', difficulty: 1 } as FocusChance;
    expect(presents(take, 'short', 20)).toBe(true);
    expect(presents(take, 'green', 20)).toBe(false);
    expect(presents(take, 'green', PLANT_EASIER_FROM_PLY), 'the easier step').toBe(true);
    expect(presents({ seat: 'defend', difficulty: 2 } as FocusChance, 'red', 20)).toBe(false);
  });
});

describe('findFocusPlant — a real slip that poses your side of the focus', () => {
  // Black (the coach) to move: …Nb6 keeps the knight; …Nf4 drops it to the f1 rook.
  const FEN = 'r3k3/8/8/3n4/8/8/8/4KR2 b - - 0 30';
  const coachLines: CoachLine[] = [
    { uci: 'd5b6', coachCp: 300, pv: ['d5b6', 'f1f7'] },
    { uci: 'd5f4', coachCp: 0, pv: ['d5f4', 'f1f4'] },
  ];
  // The student's read after …Nf4: Rxf4 wins the knight.
  const read: SlipRead = (fen) => Promise.resolve(fen.startsWith('r3k3/8/8/8/5n2/')
    ? { topLines: [{ moves: ['f1f4', 'a8a2'], evaluation: 300, mate: null }, { moves: ['e1e2', 'f4d5'], evaluation: 0, mate: null }] }
    : { topLines: [] });

  it('loose pieces: the coach leaves a piece to take, and the lesson reader poses it', async () => {
    const { pick } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null, difficulty: 0 }, read);
    expect(pick?.uci).toBe('d5f4');
    expect(pick?.chance).toMatchObject({ kind: 'take', seat: 'exploit', tag: 'missed-your-free-piece' });
  });

  it('any other focus needs a slip after which nothing hangs — a dropped piece is not a shot', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, { id: 'tactics', levels: ['beginner'] }, { tag: null, difficulty: 0 }, read);
    expect(pick).toBeNull();
    expect(scan['no-slip']).toBe(1);
  });

  it('after a miss, only the same pattern is planted', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: 'missed-your-fork', difficulty: 0 }, read);
    expect(pick).toBeNull();
    expect(scan['wrong-pattern']).toBe(1);
  });

  it('the step decides: …Nf4 leaves the piece that just moved — the plainest, not a short or green chance', async () => {
    const { pick } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null, difficulty: 0 }, read);
    expect(pick?.chance.difficulty).toBe(0);
    const { pick: none, scan } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null, difficulty: 1 }, read);
    expect(none).toBeNull();
    expect(scan['wrong-difficulty']).toBe(1);
  });

  it('never in a decided game', async () => {
    const won: CoachLine[] = coachLines.map((l) => ({ ...l, coachCp: l.coachCp + 900 }));
    const { pick, scan } = await findFocusPlant(FEN, won, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null, difficulty: 0 }, read);
    expect(pick).toBeNull();
    expect(scan.decided).toBe(1);
  });
});
