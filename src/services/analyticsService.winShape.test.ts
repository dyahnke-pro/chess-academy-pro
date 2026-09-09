import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';
import { personalRecords, winShapeStats } from './analyticsService';

// Loop audit 2026-09-09 (real knight_mare_01 data): the Patterns tab showed a
// bogus "Fastest win: 1 move" — an abandonment / timeout-on-move-1 counted as a
// win by play. Legal chess can't mate before move 2, so a sub-2-move decisive
// result is excluded from the records and the win-SHAPE breakdown; a genuine
// Fool's-mate miniature (2 moves) still counts.
describe('win-shape / records exclude sub-2-move abandonments (loop audit 2026-09-09)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({
      id: 'main',
      name: 'hero',
      preferences: { chessComUsername: 'hero' },
    }));
  });

  it('does not report a 1-move abandonment as the fastest win', async () => {
    await db.games.bulkPut([
      // Abandonment: hero (White) played one move, opponent never moved → 1-0.
      buildGameRecord({ id: 'abandon', white: 'hero', black: 'foe', pgn: '1. e4 1-0', result: '1-0' }),
      // Genuine Fool's mate, hero as Black (4 plies = 2 moves).
      buildGameRecord({ id: 'fools', white: 'foe', black: 'hero', pgn: '1. f3 e5 2. g4 Qh4# 0-1', result: '0-1' }),
    ]);
    const rec = await personalRecords();
    expect(rec.fastestWin).not.toBeNull();
    expect(rec.fastestWin!.moves).toBe(2);      // the Fool's mate, NOT the 1-move abandon
    expect(rec.fastestWin!.gameId).toBe('fools');
  });

  it('excludes sub-2-move abandonments from the win-shape breakdown', async () => {
    const longPgn =
      '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 ' +
      '8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 ' +
      '14. Ng3 g6 15. a4 c5 16. d5 c4 17. Bg5 h6 18. Be3 Nc5 19. Qd2 h5 ' +
      '20. Bg5 Be7 21. Bxf6 Bxf6 22. Nxh5 gxh5 23. Qxh5 1-0';
    await db.games.bulkPut([
      buildGameRecord({ id: 'abandon', white: 'hero', black: 'foe', pgn: '1. e4 1-0', result: '1-0' }),
      buildGameRecord({ id: 'fools', white: 'foe', black: 'hero', pgn: '1. f3 e5 2. g4 Qh4# 0-1', result: '0-1' }),
      buildGameRecord({ id: 'long', white: 'hero', black: 'foe', pgn: longPgn, result: '1-0' }),
    ]);
    const ws = await winShapeStats();
    expect(ws.totalWins).toBe(2);     // abandon excluded; fools + long counted
    expect(ws.quickWins).toBe(1);     // only the Fool's mate is a real quick win
    expect(ws.midLengthWins).toBe(1); // the 23-move win
  });
});
