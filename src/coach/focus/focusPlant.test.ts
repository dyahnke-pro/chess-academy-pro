import { describe, it, expect } from 'vitest';
import { findFocusPlant, NO_PLANTS, plantAsk, PLANT_EASIER_FROM_PLY, PLANT_SPACING_PLIES, presents, SECOND_CHANCE_PLY, THIRD_CHANCE_PLY, wantedDifficulty, type FocusPlantAsk, type PlantState } from './focusPlant';
import type { FocusChance } from './focusChances';
import type { CoachLine, SlipRead } from '../../missions/earnedSlip';

const MIDDLEGAME = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const ENDGAME = '4k3/8/8/8/8/8/8/R3K3 w - - 0 40';

describe('plantAsk — a chance every game at a varied point, more for beginners', () => {
  const rung0 = { rung: 0 as const, posed: 0, targetPly: 18 };
  const owed = NO_PLANTS;
  const presented: PlantState = { ...NO_PLANTS, presented: { ply: 18, difficulty: 0 } };

  it('THE GUARANTEE waits for the game\'s target ply, then asks every move at the rung', () => {
    expect(plantAsk(owed, rung0, 17, MIDDLEGAME)).toBeNull();
    expect(plantAsk(owed, rung0, 18, MIDDLEGAME)).toEqual({ tag: null, difficulty: 0, extra: false });
    expect(plantAsk(owed, { rung: 2, posed: 0, targetPly: 12 }, 30, MIDDLEGAME)).toEqual({ tag: null, difficulty: 2, extra: false });
  });
  it('no cap holds the guarantee back — not the chances the board posed below the rung', () => {
    expect(plantAsk(owed, { rung: 3, posed: 6, targetPly: 12 }, 30, MIDDLEGAME)).toEqual({ tag: null, difficulty: 3, extra: false });
  });
  it('THE EASIER RUNG: nothing presented by move 20 — one rung easier, never below the plainest', () => {
    expect(wantedDifficulty(3, PLANT_EASIER_FROM_PLY - 1)).toBe(3);
    expect(wantedDifficulty(3, PLANT_EASIER_FROM_PLY)).toBe(2);
    expect(wantedDifficulty(1, PLANT_EASIER_FROM_PLY)).toBe(0);
    expect(wantedDifficulty(0, PLANT_EASIER_FROM_PLY)).toBe(0);
  });
  it('a beginner gets three, one a phase: the second from move 15, the third from move 25 or the endgame', () => {
    const one = { ...rung0, posed: 1 };
    expect(plantAsk(presented, one, SECOND_CHANCE_PLY - 1, MIDDLEGAME)).toBeNull();
    expect(plantAsk(presented, one, SECOND_CHANCE_PLY, MIDDLEGAME)).toEqual({ tag: null, difficulty: 0, extra: true });
    const two = { ...rung0, posed: 2 };
    expect(plantAsk(presented, two, THIRD_CHANCE_PLY - 1, MIDDLEGAME), 'not yet move 25').toBeNull();
    expect(plantAsk(presented, two, THIRD_CHANCE_PLY - 1, ENDGAME), 'the endgame came first').toEqual({ tag: null, difficulty: 0, extra: true });
    expect(plantAsk(presented, two, THIRD_CHANCE_PLY, MIDDLEGAME)).toEqual({ tag: null, difficulty: 0, extra: true });
    expect(plantAsk(presented, { ...rung0, posed: 3 }, 60, ENDGAME), 'three is the beginner\'s').toBeNull();
  });
  it('an intermediate gets two; the top rungs one', () => {
    expect(plantAsk(presented, { rung: 1, posed: 1, targetPly: 12 }, 40, MIDDLEGAME)).not.toBeNull();
    expect(plantAsk(presented, { rung: 1, posed: 2, targetPly: 12 }, 60, ENDGAME)).toBeNull();
    expect(plantAsk(presented, { rung: 2, posed: 1, targetPly: 12 }, 60, ENDGAME)).toBeNull();
    expect(plantAsk(presented, { rung: 3, posed: 1, targetPly: 12 }, 60, ENDGAME)).toBeNull();
  });
  it('a flip counts as one of the game\'s chances', () => {
    expect(plantAsk({ ...presented, flips: 1 }, { rung: 1, posed: 1, targetPly: 12 }, 60, ENDGAME)).toBeNull();
  });
  it('spaced: four moves after the last plant', () => {
    const after: PlantState = { ...presented, count: 1, lastPly: 30 };
    expect(plantAsk(after, { ...rung0, posed: 1 }, 30 + PLANT_SPACING_PLIES - 1, MIDDLEGAME)).toBeNull();
    expect(plantAsk(after, { ...rung0, posed: 1 }, 30 + PLANT_SPACING_PLIES, MIDDLEGAME)).not.toBeNull();
  });
  it('a miss asks for the same pattern next', () => {
    expect(plantAsk({ ...presented, need: 'missed-your-fork' }, { ...rung0, posed: 1 }, 30, MIDDLEGAME)).toEqual({ tag: 'missed-your-fork', difficulty: 0, extra: true });
  });
  it('presents: your side at or above the rung counts; their side never does', () => {
    const take = { seat: 'exploit', difficulty: 1 } as FocusChance;
    expect(presents(take, 1, 20)).toBe(true);
    expect(presents(take, 2, 20)).toBe(false);
    expect(presents(take, 2, PLANT_EASIER_FROM_PLY), 'the easier rung').toBe(true);
    expect(presents({ seat: 'defend', difficulty: 3 } as FocusChance, 0, 20)).toBe(false);
  });
});

const ask = (a: Partial<FocusPlantAsk> = {}): FocusPlantAsk => ({ tag: null, difficulty: 0, extra: false, ...a });
const BEGINNER = { levels: ['beginner' as const] };

describe('findFocusPlant — a real slip that leaves your side a chance at your rung', () => {
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

  it('the coach leaves a piece to take, and the lesson\'s own reader poses it', async () => {
    const { pick } = await findFocusPlant(FEN, coachLines, BEGINNER, ask(), read);
    expect(pick).toMatchObject({ uci: 'd5f4', seat: 'exploit', dropCp: 300 });
    expect(pick?.chance).toMatchObject({ kind: 'take', seat: 'exploit', tag: 'missed-your-free-piece', difficulty: 0 });
  });
  it('the rung decides: the piece that just moved is rung 0, never a rung-1 chance', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, BEGINNER, ask({ difficulty: 1 }), read);
    expect(pick).toBeNull();
    expect(scan['wrong-difficulty']).toBe(1);
  });
  it('after a miss, only the same pattern is planted', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, BEGINNER, ask({ tag: 'missed-your-fork' }), read);
    expect(pick).toBeNull();
    expect(scan['wrong-pattern']).toBe(1);
  });
  it('the guarantee is never stopped by a decided game — ahead or behind (David: MUST)', async () => {
    const won = coachLines.map((l) => ({ ...l, coachCp: l.coachCp + 900 }));
    expect((await findFocusPlant(FEN, won, BEGINNER, ask(), read)).pick?.uci).toBe('d5f4');
    const lost = coachLines.map((l) => ({ ...l, coachCp: l.coachCp - 1200 }));
    expect((await findFocusPlant(FEN, lost, BEGINNER, ask(), read)).pick?.seat, 'the guarantee never flips').toBe('exploit');
  });

  // …Nf4 drops the knight (rung 0) AND takes the guard off the b6 bishop
  // (rung 1): a rung-1 student would take the knight and never meet the bishop.
  const TWO = 'r3k3/8/1b6/3n4/8/8/8/1R2KR2 b - - 0 30';
  const twoLines: CoachLine[] = [
    { uci: 'e8d7', coachCp: 0, pv: ['e8d7'] },
    { uci: 'd5f4', coachCp: -600, pv: ['d5f4', 'f1f4'] },
  ];
  const twoRead: SlipRead = (fen) => Promise.resolve(fen.startsWith('r3k3/8/1b6/8/5n2/')
    ? { topLines: [{ moves: ['f1f4', 'a8a2'], evaluation: 300, mate: null }, { moves: ['b1b6', 'a8a2'], evaluation: 280, mate: null }] }
    : { topLines: [] });
  it('a plant with an EASIER chance beside the asked one is refused', async () => {
    const { pick, scan } = await findFocusPlant(TWO, twoLines, BEGINNER, ask({ difficulty: 1 }), twoRead);
    expect(pick).toBeNull();
    expect(scan['easier-too']).toBe(1);
  });
  it('twin: asked at rung 0, the same slip plants the knight', async () => {
    const { pick } = await findFocusPlant(TWO, twoLines, BEGINNER, ask({ difficulty: 0 }), twoRead);
    expect(pick?.chance).toMatchObject({ kind: 'take', piece: { square: 'f4' }, difficulty: 0 });
  });
});

describe('the flip — way ahead, the extra is their tactic for you to stop', () => {
  // Black (the coach) is a queen and a rook down. …Nb3 hits the loose rook on
  // a1 — the lesson becomes saving it; …Ne6 sets nothing up.
  const FEN = '4k3/8/8/2n5/8/8/8/R5KQ b - - 0 40';
  const coachLines: CoachLine[] = [
    { uci: 'c5e6', coachCp: -880, pv: ['c5e6'] },
    { uci: 'c5b3', coachCp: -900, pv: ['c5b3', 'a1a8'] },
  ];
  const read: SlipRead = () => Promise.resolve({ topLines: [{ moves: ['a1a8', 'e8e7'], evaluation: 1400, mate: null }] });

  it('an extra with you way ahead: the coach sets up a threat at your rung', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, BEGINNER, ask({ extra: true }), read);
    expect(pick).toMatchObject({ uci: 'c5b3', seat: 'defend', dropCp: 20 });
    expect(pick?.chance).toMatchObject({ kind: 'save', seat: 'defend', piece: { square: 'a1' }, difficulty: 0 });
    expect(scan['no-flip']).toBe(1);
  });
  it('twin: the guarantee (not an extra) never flips — and a 20cp move is no slip', async () => {
    const { pick, scan } = await findFocusPlant(FEN, coachLines, BEGINNER, ask(), read);
    expect(pick).toBeNull();
    expect(scan['no-slip']).toBe(1);
  });
});
