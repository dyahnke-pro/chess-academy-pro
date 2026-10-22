import { describe, it, expect } from 'vitest';
import { findFocusPlant, NO_PLANTS, plantAsk, PLANT_FIRST_PLY, PLANT_SPACING_PLIES, type PlantState } from './focusPlant';
import type { CoachLine, SlipRead } from '../../missions/earnedSlip';

describe('plantAsk — when the coach may leave a chance', () => {
  const red = { state: 'red' as const, posed: 0 };
  it('red or untested: up to three on your side; short: one; green: none', () => {
    expect(plantAsk(NO_PLANTS, red, PLANT_FIRST_PLY)).toEqual({ tag: null });
    expect(plantAsk(NO_PLANTS, { state: 'grey', posed: 2 }, PLANT_FIRST_PLY)).not.toBeNull();
    expect(plantAsk(NO_PLANTS, { state: 'red', posed: 3 }, PLANT_FIRST_PLY), 'the board already posed three').toBeNull();
    expect(plantAsk(NO_PLANTS, { state: 'short', posed: 0 }, PLANT_FIRST_PLY)).not.toBeNull();
    expect(plantAsk(NO_PLANTS, { state: 'short', posed: 1 }, PLANT_FIRST_PLY)).toBeNull();
    expect(plantAsk(NO_PLANTS, { state: 'green', posed: 0 }, PLANT_FIRST_PLY)).toBeNull();
  });
  it('three plants is the most, whatever the board posed', () => {
    expect(plantAsk({ ...NO_PLANTS, count: 3, lastPly: 10 }, red, 40)).toBeNull();
  });
  it('never in the opening, and spaced', () => {
    expect(plantAsk(NO_PLANTS, red, PLANT_FIRST_PLY - 1)).toBeNull();
    const after: PlantState = { ...NO_PLANTS, count: 1, lastPly: 20 };
    expect(plantAsk(after, red, 20 + PLANT_SPACING_PLIES - 1)).toBeNull();
    expect(plantAsk(after, red, 20 + PLANT_SPACING_PLIES)).not.toBeNull();
  });
  it('a find without a prompt ends it; a miss asks for the same pattern', () => {
    expect(plantAsk({ ...NO_PLANTS, done: true }, red, 30)).toBeNull();
    expect(plantAsk({ ...NO_PLANTS, need: 'missed-your-fork' }, red, 30)).toEqual({ tag: 'missed-your-fork' });
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
    const { pick } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null }, read);
    expect(pick?.uci).toBe('d5f4');
    expect(pick?.chance).toMatchObject({ kind: 'take', seat: 'exploit', tag: 'missed-your-free-piece' });
  });

  it('any other focus needs a slip after which nothing hangs — a dropped piece is not a shot', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, { id: 'tactics', levels: ['beginner'] }, { tag: null }, read);
    expect(pick).toBeNull();
    expect(scan['no-slip']).toBe(1);
  });

  it('after a miss, only the same pattern is planted', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, { id: 'loose-pieces', levels: ['beginner'] }, { tag: 'missed-your-fork' }, read);
    expect(pick).toBeNull();
    expect(scan['wrong-pattern']).toBe(1);
  });

  it('never in a decided game', async () => {
    const won: CoachLine[] = coachLines.map((l) => ({ ...l, coachCp: l.coachCp + 900 }));
    const { pick, scan } = await findFocusPlant(FEN, won, { id: 'loose-pieces', levels: ['beginner'] }, { tag: null }, read);
    expect(pick).toBeNull();
    expect(scan.decided).toBe(1);
  });
});
