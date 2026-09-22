// THE GATE FOR WO-STANDARD-01 C3 — a PLAY game's live engine lines reach the
// record path, so the PV-gated fundamental lands on the row.
//
// Before C3 a Play game logged depth-10 live annotations with no `pv`, and the
// live capture carried no `pvAfterPlayed` / `evalBefore` — so `calculation-
// depth` (the one section-14 detector whose input is a LINE) declined every
// live slip with "punishing PV is 0 plies, needs 3", while the same slip in an
// imported+reviewed game was attributed. That is the capability-parity rot
// (CLAUDE.md): two record types for one kind of thing, one of them blind.
//
// The fixture is a REAL position where the punishment is three plies deep and
// the played move is quiet: after the Italian line ending ...Qd7, White plays
// Nd4?! (best Ng5) and the reply Rb8 → Nb5 → Bxf2+ lands the blow on the third
// ply. `calculation-depth` is the LEADING attribution there (probed 2026-09-22
// with the attributor directly), so the sweep — which stores only `attrs[0]`
// — files it on the misconception row. Proof is the ROW, negative-controlled
// by the same game with the lines stripped.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O O-O 7. Re1 a6 8. Bb3 Ba7 9. h3 h6 10. Nbd2 Re8 11. Nf1 Be6 12. Bxe6 Rxe6 13. Ng3 Qd7 14. Nd4 Rb8';

/** The Play surface's own annotation for 14.Nd4 — depth-10 live read, the
 *  `pv` exactly as `CoachGamePage` now files it (UCI). */
function nd4(withPv: boolean): MoveAnnotation {
  return {
    moveNumber: 14, color: 'white', san: 'Nd4', evaluation: -140, bestMove: 'f3g5', bestMoveEval: 20,
    classification: 'mistake', comment: null,
    ...(withPv ? { pv: { afterPlayed: ['a8b8', 'd4b5', 'a7f2'], afterBest: [] } } : {}),
  };
}

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.games.clear();
  await db.mistakePuzzles.clear();
});

describe('C3 — a Play game\'s live pv is attributed on the record path', () => {
  it('the saved live annotation with pv → a misconception row carrying fundamentalId calculation-depth', async () => {
    await db.games.put(buildGameRecord({ id: 'play-pv', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: PGN, annotations: [nd4(true)] }));
    const result = await autoAnalyzeGameMisconceptions('play-pv');
    expect(result.logged).toBe(1);
    const rows = await db.misconceptionTags.where('sourceGameId').equals('play-pv').toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].fundamentalId, 'the three-ply punishment is only visible through the line').toBe('calculation-depth');
    expect(rows[0].bestSan).toBe('Ng5');
  });

  it('NEGATIVE CONTROL: the same game with the lines stripped never names calculation-depth', async () => {
    await db.games.put(buildGameRecord({ id: 'play-nopv', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: PGN, annotations: [nd4(false)] }));
    const result = await autoAnalyzeGameMisconceptions('play-nopv');
    expect(result.logged).toBe(1);
    const rows = await db.misconceptionTags.where('sourceGameId').equals('play-nopv').toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].fundamentalId).not.toBe('calculation-depth');
  });
});
