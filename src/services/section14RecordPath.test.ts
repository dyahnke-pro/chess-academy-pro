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
  // Fischer–Spassky 1972, game 6 (QGD Tartakower), the first 30 plies from
  // `model-games.json`; at move 16 White's structure earns a plan and Qa5 serves
  // it. Bc6 is quiet, serves nothing, and no other fundamental claims it.
  const PREFIX = '1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5';
  const white16 = (san: string): MoveAnnotation => ({
    moveNumber: 16, color: 'white', san, evaluation: -120, bestMove: 'a3a5', bestMoveEval: 20, classification: 'mistake', comment: null,
  });

  it('LANDS on a quiet, planless move where the best move serves the earned plan', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-np', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: `${PREFIX} 16. Bc6`, annotations: [white16('Bc6')] }));
    expect(r.fundamentalId).toBe('no-plan');
    expect(r.bestSan).toBe('Qa5');
  });

  it('NEGATIVE CONTROL: castling on the same move is never planless, whatever it cost', async () => {
    const r = await rowFor(buildGameRecord({ id: 's14-np-castle', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: `${PREFIX} 16. O-O`, annotations: [white16('O-O')] }));
    expect(r.fundamentalId).not.toBe('no-plan');
  });
});
