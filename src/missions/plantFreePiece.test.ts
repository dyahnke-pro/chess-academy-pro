import { describe, expect, it } from 'vitest';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from '../services/positionReadingService';
import { newlyAttackedPieces } from './coachDials';
import { plantCandidates, verifyPlants, type PlantRead } from './plantFreePiece';

const fenOf = (moves: string): string => { const b = new Chess(); for (const s of moves.split(/\s+/).filter(Boolean)) b.move(s); return b.fen(); };

/** Black to move, queens off — the Level 1 fixture board. */
const QUIET_BLACK = fenOf('e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 Bc5 Bd3');
/** White to move, queens on. */
const ITALIAN_WHITE = fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6 Nc3 O-O');
/** Black to move, queens on. */
const ITALIAN_BLACK = fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6 Bg5');
const BOARDS = [QUIET_BLACK, ITALIAN_WHITE, ITALIAN_BLACK];

function pieceAt(fen: string, sq: Square): { type: PieceSymbol; color: Color } | null {
  return new Chess(fen).get(sq) ?? null;
}

describe('plantCandidates — the shape of a plant', () => {
  it('finds plants on real boards, the most central first', () => {
    const r = plantCandidates(QUIET_BLACK);
    expect(r.reject).toBeNull();
    expect(r.candidates.map((c) => c.uci)).toEqual(['f6d5', 'f6g4', 'c5a3', 'c5g1']);
    expect(r.candidates[0]).toMatchObject({ square: 'd5', gain: 3 });
  });

  it.each(BOARDS)('never a capture, a check or a promotion — %s', (fen) => {
    for (const c of plantCandidates(fen).candidates) {
      const m = new Chess(fen).move({ from: c.uci.slice(0, 2), to: c.uci.slice(2, 4) });
      expect(m.captured, c.uci).toBeUndefined();
      expect(m.promotion, c.uci).toBeUndefined();
      expect(m.san, c.uci).not.toMatch(/[+#]/);
    }
  });

  it.each(BOARDS)('the free piece is a knight, bishop or rook and the queen stays safe — %s', (fen) => {
    for (const c of plantCandidates(fen).candidates) {
      const coach = new Chess(fen).turn();
      const student: Color = coach === 'w' ? 'b' : 'w';
      const piece = pieceAt(c.fenAfter, c.square);
      expect(piece?.color).toBe(coach);
      expect(['n', 'b', 'r']).toContain(piece?.type);
      expect(legalSeeGainFor(c.fenAfter, c.square, student)).toBeGreaterThanOrEqual(3);
      const after = new Chess(c.fenAfter);
      for (const row of after.board()) for (const cell of row) {
        if (cell && cell.color === coach && cell.type === 'q') expect(legalSeeGainFor(c.fenAfter, cell.square, student), c.uci).toBe(0);
      }
    }
  });

  it.each(BOARDS)('a plant threatens nothing — %s', (fen) => {
    const student: Color = new Chess(fen).turn() === 'w' ? 'b' : 'w';
    for (const c of plantCandidates(fen).candidates) expect(newlyAttackedPieces(fen, c.uci, student), c.uci).toEqual([]);
  });

  it('never plants the queen: a coach with only a queen to give gives nothing', () => {
    // White's queen could step onto d4, where the rook takes it — that is not a plant.
    expect(plantCandidates('6k1/5ppp/8/8/1r6/8/5PPP/3Q2K1 w - - 0 1')).toEqual({ candidates: [], reject: 'no-free-piece' });
  });

  it('a gift that would also attack a student piece is refused — "threatens"', () => {
    // Nd3 and Nc2 both hang the knight AND hit the student's knight on b4.
    expect(plantCandidates('3r2k1/5ppp/8/8/1n6/8/5PPP/4N2K w - - 0 1')).toEqual({ candidates: [], reject: 'threatens' });
  });

  it('no plant while a recapture is owed or the coach is in check', () => {
    // 4…Nxd4: White owes the recapture on d4.
    expect(plantCandidates(fenOf('e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4')).reject).toBe('mid-exchange');
    expect(plantCandidates(fenOf('e4 e5 Qh5 Nc6 Qxf7+')).reject).toBe('mid-exchange');
  });
});

describe('verifyPlants — the engine confirms the gift (mocked)', () => {
  const plants = plantCandidates(QUIET_BLACK).candidates;
  const line = (uci: string, whiteCp: number): { moves: string[]; evaluation: number; mate: null } => ({ moves: [uci], evaluation: whiteCp, mate: null });
  /** A reader answering per board: the student's capture and their best move. */
  const reader = (byFen: Record<string, ReturnType<typeof line>[] | null>): PlantRead =>
    async (fen) => (byFen[fen] === null ? null : { topLines: byFen[fen] ?? [] });

  it('accepts a capture that is best and leaves the student +2 or better', async () => {
    const [d5] = plants;
    const r = await verifyPlants([d5], reader({ [d5.fenAfter]: [line('e4d5', 290), line('c1e3', 40)] }));
    expect(r.pick).toEqual({ uci: 'f6d5', square: 'd5', studentCp: 290 });
  });

  it('rejects a POISONED plant — the capture loses for the student', async () => {
    const [d5] = plants;
    // Taking looks free but the engine says it costs: best is something else, the capture is −150.
    const poisoned = await verifyPlants([d5], reader({ [d5.fenAfter]: [line('c1e3', 60), line('e4d5', -150)] }));
    expect(poisoned).toEqual({ pick: null, scan: { 'not-best': 1 } });
    // The capture IS best, but the student ends below +2.
    const thin = await verifyPlants([d5], reader({ [d5.fenAfter]: [line('e4d5', 120)] }));
    expect(thin).toEqual({ pick: null, scan: { 'not-winning': 1 } });
  });

  it('a read that never came back is counted, never guessed', async () => {
    const [d5] = plants;
    expect(await verifyPlants([d5], reader({ [d5.fenAfter]: null }))).toEqual({ pick: null, scan: { 'no-read': 1 } });
  });

  it('reads at most three, and picks the smallest verified gift', async () => {
    let reads = 0;
    const r = await verifyPlants(plants, async (fen) => {
      reads += 1;
      const c = plants.find((p) => p.fenAfter === fen);
      if (!c) return null;
      // The student (White, to move after the plant) takes in every case.
      const cp = c.uci === 'f6g4' ? 260 : 380;
      return { topLines: [line(`xx${c.square}`, cp)] };
    });
    expect(reads).toBe(3);
    expect(r.pick).toMatchObject({ uci: 'f6g4', studentCp: 260 });
  });
});
