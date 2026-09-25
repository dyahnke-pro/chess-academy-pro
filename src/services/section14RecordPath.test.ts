// THE GATE FOR WO-STANDARD-01 C5 — which of the three section-14 detectors
// (`calculation-depth`, `left-book-early`, `no-plan`) can actually LAND on a
// misconception row through the record path, on a real annotated game.
//
// The finding that provoked it: the section-14 detectors read as "firing on
// nothing real" — `calculation-depth` declined every recording-path slip with
// "punishing PV is 0 plies", and nothing had ever shown `no-plan` on a row.
// Decided from the code, after C2/C3:
//
//   calculation-depth  input = a punishing PV >= 3 plies + mover-POV evals.
//                      EXISTS on the record path now: the review's deep dive
//                      persists `annotation.pv`, and C3 makes Play/Learn
//                      persist the same shape live. Lands (row 1).
//   left-book-early    input = the SAN history + the openings DB. Always
//                      existed; the detector was simply never proven. Lands
//                      (row 2), and a BOOK move never trips it (control).
//   no-plan            input = the SAN history + best move + `deriveNextPlans`.
//                      Always existed; rare by CONSTRUCTION (subsumed by any
//                      other fundamental on the same move, needs an earned plan
//                      the best move serves and the played move ignores).
//                      Probed 2026-09-22 over the first 60 model games: it leads
//                      at Fischer–Spassky 1972 g6, move 16, when White plays
//                      the planless Bc6 instead of Qa5. Lands (row 3).
//
// So none of the three is a detector with a missing input; none is made to
// return null. Every row is the ROW in Dexie, negative-controlled on the same
// game.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { buildGameRecord } from '../test/factories';
import type { GameRecord, MoveAnnotation } from '../types';

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.games.clear();
  await db.mistakePuzzles.clear();
});

async function rowFor(game: GameRecord): Promise<{ fundamentalId: string | null | undefined; bestSan: string | undefined }> {
  await db.games.put(game);
  const result = await autoAnalyzeGameMisconceptions(game.id);
  expect(result.logged, `${game.id}: the sweep wrote no row — the fixture is not flagged`).toBe(1);
  const rows = await db.misconceptionTags.where('sourceGameId').equals(game.id).toArray();
  expect(rows).toHaveLength(1);
  return { fundamentalId: rows[0].fundamentalId, bestSan: rows[0].bestSan };
}

describe('section 14 on the record path — calculation-depth', () => {
  // The Italian: after ...Qd7 White plays the quiet Nd4?! (best Ng5); the
  // punishment Rb8 → Nb5 → Bxf2+ lands on the THIRD ply — only a line shows it.
  const PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O O-O 7. Re1 a6 8. Bb3 Ba7 9. h3 h6 10. Nbd2 Re8 11. Nf1 Be6 12. Bxe6 Rxe6 13. Ng3 Qd7 14. Nd4 Rb8';
  const nd4 = (pv: boolean): MoveAnnotation => ({
    moveNumber: 14, color: 'white', san: 'Nd4', evaluation: -140, bestMove: 'f3g5', bestMoveEval: 20, classification: 'mistake', comment: null,
    ...(pv ? { pv: { afterPlayed: ['a8b8', 'd4b5', 'a7f2'], afterBest: [] } } : {}),
  });

  it('LANDS when the annotation carries the punishing line', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-cd', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: PGN, annotations: [nd4(true)] }));
    expect(r.fundamentalId).toBe('calculation-depth');
    expect(r.bestSan).toBe('Ng5');
  });

  it('NEGATIVE CONTROL: without the line it cannot — the input is the pv, and only the pv', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-cd-nopv', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: PGN, annotations: [nd4(false)] }));
    expect(r.fundamentalId).not.toBe('calculation-depth');
  });
});

describe('section 14 on the record path — left-book-early', () => {
  // A Najdorf move order where Black leaves the book at move 5 with ...Nbd7
  // (the DB continues a6 / Nc6 / e6 / g6 here) — a KNOWLEDGE signal, ply 10.
  const OFF_BOOK = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nbd7 6. Be2';
  const IN_BOOK = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2';
  const black5 = (san: string): MoveAnnotation => ({
    moveNumber: 5, color: 'black', san, evaluation: 130, bestMove: 'b8c6', bestMoveEval: 0, classification: 'mistake', comment: null,
  });

  it('LANDS on a flagged departure inside the opening window', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-lbe', source: 'coach', white: 'Stockfish Bot', black: 'David', studentSide: 'black', pgn: OFF_BOOK, annotations: [black5('Nbd7')] }));
    expect(r.fundamentalId).toBe('left-book-early');
    expect(r.bestSan).toBe('Nc6');
  });

  it('NEGATIVE CONTROL: a flagged move that IS book never files as leaving the book', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-lbe-book', source: 'coach', white: 'Stockfish Bot', black: 'David', studentSide: 'black', pgn: IN_BOOK, annotations: [black5('a6')] }));
    expect(r.fundamentalId).not.toBe('left-book-early');
  });
});

describe('section 14 on the record path — no-plan', () => {
  // 🔴 FIXTURE REPLACED 2026-09-24. The Fischer–Spassky prefix this used sat on
  // a board where Black's a6 pawn attacks the bishop on b5 — a whole piece en
  // prise — and `deriveNextPlans` correctly states NO plan while material is
  // the story (walk 5, R7). The detector declined honestly; the fixture had
  // stopped being a planless position. This one is: a Tarrasch isolated queen's
  // pawn out of book, where White's structure earns "win their weak pawn on d5 —
  // plant your knight on d4", nothing is hanging, and 14.b3 touches none of it
  // while the best move Nd4 is the plan.
  const PREFIX = '1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 exd5 5. Nf3 Nc6 6. g3 Nf6 7. Bg2 Be7 8. O-O O-O 9. dxc5 Bxc5 10. a3 a5 11. Bg5 Be6 12. Rc1 h6 13. Bxf6 Qxf6';
  const white14 = (san: string, best = 'f3d4'): MoveAnnotation => ({
    moveNumber: 14, color: 'white', san, evaluation: -80, bestMove: best, bestMoveEval: 40, classification: 'mistake', comment: null,
  });

  it('LANDS on a quiet, planless move where the best move serves the earned plan', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-np', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: `${PREFIX} 14. b3`, annotations: [white14('b3')] }));
    expect(r.fundamentalId).toBe('no-plan');
    expect(r.bestSan).toBe('Nd4');
  });

  it('NEGATIVE CONTROL: when the best move does not serve the plan either, it is never planless', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-np-offplan', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: `${PREFIX} 14. b3`, annotations: [white14('b3', 'c3a4')] }));
    expect(r.fundamentalId).not.toBe('no-plan');
  });
});
