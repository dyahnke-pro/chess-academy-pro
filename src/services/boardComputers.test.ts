import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';
import { countKey } from './conceptKey';
import { BOARD_COMPUTERS, readBoard, readBoardAll, readKey, type ComputerId } from './boardComputers';
import { COMPUTER_CATALOG, FACT_GROUP, stepOf, type CoachFact } from './coachFact';
import { emptyPlanThread } from './gameStory';
import { isProof } from './proof';

const SRC = resolve(__dirname, '..');
const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('boardComputers — the one registry', () => {
  it('every "wired" surface names a file that really calls the computer', () => {
    const bad: string[] = [];
    for (const [id, spec] of Object.entries(BOARD_COMPUTERS) as [ComputerId, { surfaces: Record<string, { wired?: string; not?: string }> }][]) {
      for (const [surface, ans] of Object.entries(spec.surfaces)) {
        if (!ans.wired) { if (!ans.not?.trim()) bad.push(`${id}/${surface}: no reason`); continue; }
        const code = readFileSync(resolve(SRC, ans.wired), 'utf8');
        // Learn reaches it through the registry, by id; another surface may still
        // call the computer's own function (owed onto the registry, P4).
        const viaRegistry = new RegExp(`readBoard(All)?\\('${id}'`).test(code);
        const fnByComputer: Partial<Record<ComputerId, RegExp>> = {
          prophylaxis: /findProphylaxis\(/, tiedDefender: /newTiedDefender\(/, trapped: /trappedOnBoard\(/,
          structureMove: /studentMoveStructure\(/, structureTheirMove: /theirMoveStructure\(/, structureBoard: /boardStructure\(/,
          // Learn packs the priority to the hint dial's register, so it calls the computer itself.
          priorityFirst: /buildPriorityFirst\(/,
        };
        if (!viaRegistry && !(fnByComputer[id]?.test(code))) bad.push(`${id}/${surface}: ${ans.wired} never calls it`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('a real position comes out of each computer, with its proof', () => {
    const fen = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']);
    const ph = readBoard('prophylaxis', { fen, engineFirstMoves: ['h2h3'] });
    expect(ph?.text).toMatch(/^h3 first/);
    expect(isProof(ph!.proof)).toBe(true);
    // …and silent when the engine does not agree.
    expect(readBoard('prophylaxis', { fen, engineFirstMoves: ['f1e2'] })).toBeNull();

    const order = readBoard('moveOrder', { fen: '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1', pv: ['e2e3', 'h7h6', 'f1d3'] });
    expect(order?.marks?.play).toEqual({ from: 'e2', to: 'e3' });

    const tie = readBoard('tiedDefender', { fenBefore: '4k3/3n4/8/4p3/8/8/8/R5NK w - - 0 1', fenAfterMove: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', fenAfterReply: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', student: 'w' });
    expect(tie?.claims).toEqual([countKey('e5')]);
    // One count, one key (OS-11 #6): count-before-you-take on the same square shares it.
    expect(readBoard('countMethod', { fenBefore: '4k3/8/3p1p2/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nxe5', student: 'w', costCp: 200 })?.claims).toEqual([countKey('e5')]);

    const grab = readBoard('queenGrabTrap', { fen: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17' });
    expect(grab && isProof(grab.proof)).toBe(true);
  });

  // THE ONE FACT (WO-STORY-MATRIX-01 P1-6a). Each read used to come back as a
  // `BoardRead` that every surface relabelled at its call site — Review filed
  // it under `BOARD_COMPUTERS[id].kind`, the live read under the same plus a
  // rank, Learn under the role, skill and board it gave the book move by hand.
  // It is the one fact now, placed by its own kind and naming its computer.
  it('every read is the one fact: its id, its kind\'s place, its computer', () => {
    const fen = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']);
    const reads: Array<[ComputerId, CoachFact | null]> = [
      ['prophylaxis', readBoard('prophylaxis', { fen, engineFirstMoves: ['h2h3'] })],
      ['moveOrder', readBoard('moveOrder', { fen: '4k3/7p/8/8/8/8/4P3/4KB2 w - - 0 1', pv: ['e2e3', 'h7h6', 'f1d3'] })],
      ['tiedDefender', readBoard('tiedDefender', { fenBefore: '4k3/3n4/8/4p3/8/8/8/R5NK w - - 0 1', fenAfterMove: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', fenAfterReply: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', student: 'w' })],
      ['countMethod', readBoard('countMethod', { fenBefore: '4k3/8/3p1p2/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nxe5', student: 'w', costCp: 200 })],
      ['queenGrabTrap', readBoard('queenGrabTrap', { fen: 'r2q1r1k/pppnn1p1/3p3p/1P1Qp3/8/P1N2N1P/5PP1/R1B1R1K1 w - - 1 17' })],
      ...readBoardAll('planThread', { thread: emptyPlanThread(), ply: 20, fenBefore: after(['e4', 'e5']), fenAfter: after(['e4', 'e5', 'Nf3']), student: 'b', holdPlayable: false }).map((f): [ComputerId, CoachFact] => ['planThread', f]),
    ];
    expect(reads.filter(([, f]) => f === null).map(([id]) => id)).toEqual([]);
    for (const [id, f] of reads as Array<[ComputerId, CoachFact]>) {
      expect(f.id).toBe(`${id}:${readKey(f)}`);
      expect(f.kind).toBe(BOARD_COMPUTERS[id].kind);
      expect(f.group).toBe(FACT_GROUP[f.kind]);
      expect(f.step).toBe(stepOf(f.kind, f.seat));
      expect(f.computer).toBe(BOARD_COMPUTERS[id].computer);
      expect(COMPUTER_CATALOG[f.computer]).toBeDefined();
      expect(f.fen).toMatch(/^\S+ [wb] /);
    }
  });

  it('a fact is seated by whose move it is about: the guard the student\'s move tied down is the student\'s', () => {
    // Their knight is tied down by the student's Re1 (pressure bought it):
    // every door seats it as the student's (Learn's move point, the live
    // clause), so the producer's answer is the same — never the opponent's,
    // which the door reads as something done TO the student.
    const tie = readBoard('tiedDefender', { fenBefore: '4k3/3n4/8/4p3/8/8/8/R5NK w - - 0 1', fenAfterMove: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', fenAfterReply: '4k3/3n4/8/4p3/8/8/8/4R1NK b - - 1 1', student: 'w' });
    expect(tie?.seat).toBe('student');
    // Its place is still their side's step: the kind decides it, not the seat.
    expect(tie?.step).toBe('theirs');
  });

  it('the stop still to play carries its held form and the moves it draws', () => {
    const fen = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']);
    const ph = readBoard('prophylaxis', { fen, engineFirstMoves: ['h2h3'] });
    // It names the student's move, so a surface that holds the move says its
    // held form: their idea, without the stopping move.
    expect(ph?.namesStudentMove).toBe(true);
    expect(ph?.heldForm?.text).toMatch(/One move stops it/);
    expect(ph?.heldForm?.text).not.toMatch(/\bh3\b/);
    expect(ph?.marks?.play).toEqual({ from: 'h2', to: 'h3' });
    expect(ph?.marks?.theirs?.to).toBeDefined();
  });

  it('the book move carries its role, skill and board — no surface relabels it', async () => {
    const { __setLocalDbForTests } = await import('./masterPlayLookup');
    const { positionFen } = await import('./masterPlayCache');
    // SYNTHETIC counts, as bookMoveWhy.test's: every book ply played, then Ne2
    // the book move where the student plays Nf3.
    const history = ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'Nf3'];
    const positions: Record<string, Array<{ san: string; games: number }>> = {};
    const c = new Chess();
    history.forEach((san, i) => {
      positions[positionFen(c.fen())] = i === history.length - 1 ? [{ san: 'Ne2', games: 400 }] : [{ san, games: 900 }];
      c.move(san);
    });
    __setLocalDbForTests({ positions });
    try {
      const f = readBoard('bookMove', { history, student: 'w' });
      expect(f?.role).toBe('teach');
      expect(f?.skill).toBe('left-book-early');
      // The board the student left the book on, after their move.
      expect(f?.fen).toBe(c.fen());
      expect(f?.claims).toEqual([readKey(f!)]);
    } finally {
      __setLocalDbForTests(null);
    }
  }, 30_000);

  it('the plan thread carries its proof (the stop is proven off their move)', () => {
    const thread = emptyPlanThread();
    const reads = readBoardAll('planThread', { thread, ply: 20, fenBefore: after(['e4', 'e5']), fenAfter: after(['e4', 'e5', 'Nf3']), student: 'b', holdPlayable: false });
    for (const r of reads) expect(r.proof).toBeDefined();
  });
});
