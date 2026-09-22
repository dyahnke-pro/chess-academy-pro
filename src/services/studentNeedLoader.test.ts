// B3 (PLAN WO-STANDARD-01, 2026-09-22): the student model's need half, split
// into a memoised Dexie BASE and a LINE half derived at read time.
//
// Negative controls, both run and reverted:
//  • give `lineRepsFromGames` back its `new Array(sans.length)` → the
//    "position after the line" test fails (index `sans.length` is undefined);
//  • key `loadStudentNeedBase` on the sans prefix again (the old memo) → the
//    identity test fails, because two lines then mean two Dexie reads.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { buildGameRecord, buildUserProfile } from '../test/factories';
import type { MoveAnnotation } from '../types';
import { contextForLine, invalidateStudentNeedContext, lineRepsFromGames, loadStudentNeedBase, loadStudentNeedContext } from './studentNeedLoader';
import { FAMILIAR_REPS, familiarity } from './needScore';

/** White-POV annotations for a line the student (White) plays CLEANLY. */
const clean = (sans: readonly string[]): MoveAnnotation[] => sans.map((san, i) => ({
  moveNumber: Math.floor(i / 2) + 1,
  color: i % 2 === 0 ? 'white' : 'black',
  san,
  evaluation: 20,
  bestMove: null,
  bestMoveEval: 20,
  classification: 'good',
  comment: null,
}));

const NAMES = { lichessUsername: 'alex', chessComUsername: undefined };
const asAlexWhite = (sans: readonly string[], over: Partial<ReturnType<typeof buildGameRecord>> = {}) => buildGameRecord({
  white: 'alex', black: 'someone', result: '1-0', source: 'lichess', fullyAnalyzed: true, annotations: clean(sans), ...over,
});

describe('lineRepsFromGames — ONE LONGER THAN THE LINE', () => {
  it('index sans.length counts games that followed the whole line and then played a clean student ply', () => {
    const games = [
      asAlexWhite(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']),       // followed e4 e5 Nf3 Nc6, then Bb5 (clean)
      asAlexWhite(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']),       // same prefix, a different clean move — still the position
      asAlexWhite(['e4', 'e5', 'Nf3', 'Nf6']),              // left the line at ply 4
    ];
    const reps = lineRepsFromGames(games, ['e4', 'e5', 'Nf3', 'Nc6'], 'white', NAMES);
    expect(reps).toHaveLength(5);
    expect(reps[0]).toBe(3);   // e4 played cleanly in all three
    expect(reps[2]).toBe(3);   // Nf3 likewise
    expect(reps[1]).toBe(0);   // opponent plies never count
    // THE ENTRY THE LIVE SURFACE READS: the student's UPCOMING ply.
    expect(reps[4]).toBe(2);
  });

  it('the position entry is 0 when the line ends on the student\'s own reply-pending ply (opponent to move next)', () => {
    const games = [asAlexWhite(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])];
    const reps = lineRepsFromGames(games, ['e4', 'e5', 'Nf3'], 'white', NAMES);
    expect(reps).toHaveLength(4);
    expect(reps[3]).toBe(0);   // ply 4 is Black's
  });

  it('a costly ply is not a rep', () => {
    const bad = clean(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    bad[4] = { ...bad[4], evaluation: -200, bestMoveEval: 20 };
    const games = [buildGameRecord({ white: 'alex', black: 'x', source: 'lichess', fullyAnalyzed: true, annotations: bad })];
    const reps = lineRepsFromGames(games, ['e4', 'e5', 'Nf3', 'Nc6'], 'white', NAMES);
    expect(reps[4]).toBe(0);
  });
});

describe('contextForLine', () => {
  it('a null base is the cold student — TEACH, never silence', () => {
    const ctx = contextForLine(null, ['e4', 'e5'], 1300);
    expect(ctx.gamesPlayed).toBe(0);
    expect(ctx.rating).toBe(1300);
    expect(ctx.lineReps).toBeUndefined();
  });
});

describe('the base is read once and the line is derived per call', () => {
  beforeEach(async () => {
    await db.games.clear();
    invalidateStudentNeedContext();
    useAppStore.setState({ activeProfile: buildUserProfile({ name: 'alex', currentRating: 1200, ratingBaseline: 1200, preferences: { lichessUsername: 'alex' } }) });
  });

  it('two different lines share ONE base object, and each reads its own familiarity', async () => {
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'];
    await db.games.bulkAdd(Array.from({ length: FAMILIAR_REPS }, () => asAlexWhite([...line, 'Ba4'])));
    const q = { rating: 1200, studentColor: 'white' as const };
    const a = await loadStudentNeedBase(q);
    const b = await loadStudentNeedBase(q);
    expect(a).not.toBeNull();
    expect(b).toBe(a);   // identity — one Dexie read
    const empty = await loadStudentNeedContext({ ...q, sans: [] });
    const deep = await loadStudentNeedContext({ ...q, sans: line });
    // The empty line only knows the position after it (ply 1); the deep line
    // knows every ply AND the ply the student is about to play (index 6).
    expect(empty.lineReps).toHaveLength(1);
    expect(deep.lineReps).toHaveLength(line.length + 1);
    expect(familiarity(deep.lineReps![line.length])).toBe(1);
    expect(deep.gamesPlayed).toBe(FAMILIAR_REPS);
  });
});
