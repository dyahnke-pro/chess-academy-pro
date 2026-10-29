import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computedPlanAt, isPawnBreak, tabPlanFor } from './computedPlan';
import type { LichessExplorerResult, OpeningRecord } from '../types';

const row = (san: string, n: number): LichessExplorerResult['moves'][number] =>
  ({ san, uci: '', white: n, draws: 0, black: 0, averageRating: 2500 }) as LichessExplorerResult['moves'][number];
const node = (n: number, moves: Array<[string, number]>): LichessExplorerResult =>
  ({ white: n, draws: 0, black: 0, moves: moves.map(([s, g]) => row(s, g)), topGames: [], opening: null }) as unknown as LichessExplorerResult;
const masters = (r: LichessExplorerResult | undefined) => (r ? { result: r, source: 'masters' as const } : null);
const fenOf = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// A line that stops in the OPENING: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6
// 5.d3 — nobody has castled. The games walk it on to the middlegame: …d6,
// Nbd2 (60 of 100; O-O first is 40), …O-O, O-O — both sides castled (MG).
// From there d4 is the break and the knight goes d2–f1–g3.
const TABIA = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'];
const APPROACH = ['d6', 'Nbd2', 'O-O', 'O-O'];
const MG = [...TABIA, ...APPROACH];
const T = (...m: string[]): string => [...TABIA, ...m].join(' ');
const TREE: Record<string, LichessExplorerResult> = {
  [TABIA.join(' ')]: node(100, [['d6', 100]]),
  [T('d6')]: node(100, [['Nbd2', 60], ['O-O', 40]]),
  [T('d6', 'Nbd2')]: node(60, [['O-O', 60]]),
  [T('d6', 'O-O')]: node(40, [['O-O', 40]]),
  [T('d6', 'Nbd2', 'O-O')]: node(500, [['O-O', 500]]),
  [T('d6', 'O-O', 'O-O')]: node(40, [['Nbd2', 40]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O')]: node(500, [['a6', 500]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6')]: node(500, [['Re1', 300], ['d4', 200]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1')]: node(300, [['h6', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6')]: node(300, [['Nf1', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6', 'Nf1')]: node(300, [['Be6', 300]]),
  [T('d6', 'Nbd2', 'O-O', 'O-O', 'a6', 'Re1', 'h6', 'Nf1', 'Be6')]: node(300, [['Ng3', 300]]),
};
const lookup = (sans: readonly string[]) => Promise.resolve(masters(TREE[sans.join(' ')]));

// A line ALREADY in the middlegame (both castled by move 5), with two move
// orders below it that meet on one board: c3, …d6, then Nbd2 + a4 in either
// order around …a6. The tree counts the meeting board's games from every
// order — 500, most from lines outside this walk — so the plan may credit
// only the share that came down from the tabia.
const C = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'];
const K = (...m: string[]): string => [...C, ...m].join(' ');
const CASTLED: Record<string, LichessExplorerResult> = {
  [C.join(' ')]: node(100, [['c3', 100]]),
  [K('c3')]: node(100, [['d6', 100]]),
  [K('c3', 'd6')]: node(100, [['Nbd2', 60], ['a4', 40]]),
  [K('c3', 'd6', 'Nbd2')]: node(60, [['a6', 60]]),
  [K('c3', 'd6', 'a4')]: node(40, [['a6', 40]]),
  [K('c3', 'd6', 'Nbd2', 'a6')]: node(500, [['a4', 500]]),
  [K('c3', 'd6', 'a4', 'a6')]: node(40, [['Nbd2', 40]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4')]: node(500, [['Ba7', 500]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4', 'Ba7')]: node(500, [['Re1', 300], ['d4', 200]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4', 'Ba7', 'Re1')]: node(300, [['h6', 300]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4', 'Ba7', 'Re1', 'h6')]: node(300, [['Nf1', 300]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4', 'Ba7', 'Re1', 'h6', 'Nf1')]: node(300, [['Be6', 300]]),
  [K('c3', 'd6', 'Nbd2', 'a6', 'a4', 'Ba7', 'Re1', 'h6', 'Nf1', 'Be6')]: node(300, [['Ng3', 300]]),
};
const castledLookup = (sans: readonly string[]) => Promise.resolve(masters(CASTLED[sans.join(' ')]));

describe('computedPlanAt — the plan is read at a MIDDLEGAME board (2026-10-29)', () => {
  it('walks a line that stops in the opening on to the middlegame, and reads the plan there', async () => {
    const plan = await computedPlanAt(TABIA, 'white', 'italian', 'computed-italian--1', { lookup });
    expect(plan).not.toBeNull();
    // The card's board is the board both sides castled on — never the
    // opening board the line stopped on.
    expect(plan!.criticalPositionFen).toBe(fenOf(MG));
    expect(plan!.criticalPositionFen).not.toBe(fenOf(TABIA));
    // Gate C: the line, then the games' way into its middlegame.
    expect(plan!.lineMoves).toEqual(TABIA);
    expect(plan!.approach).toEqual(APPROACH);
    expect(plan!.pawnBreaks.map((b) => b.move)).toEqual(['d4']);
    expect(plan!.pawnBreaks[0].explanation).toMatch(/^40%/);
    expect(plan!.pieceManeuvers.map((m) => m.route)).toEqual(['d2–f1–g3']);
    expect(plan!.overview).toMatch(/^In the 500 master games that reached this position/);
    // The plan line starts where the line ended and plays the way in first.
    const line = plan!.playableLines![0];
    expect(line.fen).toBe(fenOf(TABIA));
    expect(line.moves.slice(0, APPROACH.length)).toEqual(APPROACH);
    expect(line.moves.length).toBe(line.arrows.length);
    expect(line.moves.length).toBe(line.highlights?.length);
    expect(line.moves.length).toBe(line.annotations.length);
    const c = new Chess(line.fen);
    for (const s of line.moves) expect(() => c.move(s)).not.toThrow();
    // Nothing is marked on the way in; the plan's squares are marked after.
    expect((line.highlights ?? []).slice(0, APPROACH.length).every((h) => h.length === 0)).toBe(true);
  });

  it('a line whose games run out before both sides castle has no plan (empty > invented)', async () => {
    // From the opening board the games go on — Nbd2, …a6, d4 (a break), the
    // knight b1–d2–f1 — but nobody castles before they run out. Read at the
    // opening board this was "the d4 break": the opening's own moves.
    const noCastle: Record<string, LichessExplorerResult> = {
      [TABIA.join(' ')]: node(100, [['d6', 100]]),
      [T('d6')]: node(100, [['Nbd2', 100]]),
      [T('d6', 'Nbd2')]: node(100, [['a6', 100]]),
      [T('d6', 'Nbd2', 'a6')]: node(100, [['d4', 100]]),
      [T('d6', 'Nbd2', 'a6', 'd4')]: node(100, [['Ba7', 100]]),
      [T('d6', 'Nbd2', 'a6', 'd4', 'Ba7')]: node(100, [['Nf1', 100]]),
    };
    const thin = (sans: readonly string[]) => Promise.resolve(masters(noCastle[sans.join(' ')]));
    expect(await computedPlanAt(TABIA, 'white', 'x', 'p', { lookup: thin })).toBeNull();
  });

  it('a line already in the middlegame is not walked: its plan is read on it, with no approach', async () => {
    const plan = await computedPlanAt(MG, 'white', 'x', 'p', { lookup });
    expect(plan!.criticalPositionFen).toBe(fenOf(MG));
    expect(plan!.lineMoves).toEqual(MG);
    expect(plan!.approach).toBeUndefined();
    expect(plan!.playableLines![0].fen).toBe(fenOf(MG));
    expect(plan!.playableLines![0].moves[0]).toBe('a6');
  });

  it('counts what masters played from the tabia as shares that never pass 100%, one board once', async () => {
    const plan = await computedPlanAt(C, 'white', 'italian', 'computed-italian--1', { lookup: castledLookup });
    expect(plan).not.toBeNull();
    expect(plan!.criticalPositionFen).toBe(fenOf(C));
    expect(plan!.lineMoves).toEqual(C);
    // Every order reaches the board before d4 (share 1); d4 is 200 of its 500.
    expect(plan!.pawnBreaks.map((b) => b.move)).toEqual(['d4']);
    expect(plan!.pawnBreaks[0].explanation).toMatch(/^40%/);
    // Nb1–d2–f1–g3: the longer route speaks, never the shorter start of it.
    expect(plan!.pieceManeuvers.map((m) => m.route)).toEqual(['b1–d2–f1–g3']);
    expect(plan!.pieceManeuvers[0].explanation).toMatch(/^60%/);
    expect(plan!.overview).toMatch(/^In the 100 master games that reached this position/);
    for (const m of plan!.overview.match(/\d+%/g) ?? []) expect(Number(m.replace('%', ''))).toBeLessThanOrEqual(100);
    const line = plan!.playableLines![0];
    const c = new Chess(line.fen);
    for (const s of line.moves) expect(() => c.move(s)).not.toThrow();
    expect(line.moves[0]).toBe('c3');
  });

  it('has no plan where too few games reached the board, or nothing clears the bar', async () => {
    expect(await computedPlanAt(TABIA, 'white', 'x', 'p', { lookup: () => Promise.resolve(masters(node(5, [['d6', 5]]))) })).toBeNull();
    expect(await computedPlanAt(MG, 'white', 'x', 'p', { lookup: () => Promise.resolve(masters(node(5, [['a6', 5]]))) })).toBeNull();
    expect(await computedPlanAt(TABIA, 'white', 'x', 'p', { lookup: () => Promise.resolve(null) })).toBeNull();
    expect(await computedPlanAt(['e4', 'e9'], 'white', 'x', 'p', { lookup })).toBeNull();
  });

  // G9.3 Gate C (2026-10-29): the tabia is where the line ends, or the
  // middlegame it walks on to — never a board the line has already left. Read
  // a few plies back where the games were thicker, the plan was one the
  // student's own line had just turned down (the Grünfeld tab plays …Bd7; its
  // plan was "the bishop c8–g4–e6").
  it('a line whose own end the games barely reached has no plan — the boards it left are never the tabia', async () => {
    expect(await computedPlanAt([...MG, 'h6', 'h3'], 'white', 'x', 'p', { lookup })).toBeNull();
    // An end board the games reached in numbers but where nothing clears the
    // bar has none either; the master board one ply back, which has one, is
    // never tried.
    const thin = (sans: readonly string[]) => {
      const key = sans.join(' ');
      if (key === [...MG, 'h6'].join(' ')) return Promise.resolve({ result: node(30, [['h3', 30]]), source: 'online' as const });
      return Promise.resolve(masters(TREE[key]));
    };
    expect(await computedPlanAt([...MG, 'h6'], 'white', 'x', 'p', { lookup: thin })).toBeNull();
    // At the line's own end, the plan is read there.
    const atEnd = await computedPlanAt([...MG, 'a6'], 'white', 'x', 'p', { lookup });
    expect(atEnd!.criticalPositionFen).toBe(fenOf([...MG, 'a6']));
    expect(atEnd!.lineMoves).toEqual([...MG, 'a6']);
    expect(atEnd!.pieceManeuvers.map((m) => m.route)).toEqual(['d2–f1–g3']);
  });

  it('never reads the plan before the middlegame, even a few plies back on a castled line', async () => {
    // The line castles on its last move, on a board the games barely reached.
    // Two plies back — an opening board — masters pushed d4 in 60 of 100
    // games; read there, that was "the d4 break". No plan: an opening board
    // is never the tabia.
    const line = [...TABIA, 'd6', 'O-O', 'O-O'];
    const early: Record<string, LichessExplorerResult> = {
      [T('d6')]: node(100, [['d4', 60], ['O-O', 40]]),
      [T('d6', 'O-O')]: node(100, [['O-O', 100]]),
    };
    const lateCastle = (sans: readonly string[]) =>
      Promise.resolve(sans.length >= line.length ? masters(node(5, [['a6', 5]])) : masters(early[sans.join(' ')]));
    expect(await computedPlanAt(line, 'white', 'x', 'p', { lookup: lateCastle })).toBeNull();
  });

  it('says whose games it counted: masters, strong online players, or both', async () => {
    const all = await computedPlanAt(MG, 'white', 'x', 'p', { lookup });
    expect(all!.overview).toMatch(/^In the 500 master games/);
    expect(all!.playableLines![0].title).toBe('The plan, as masters played it');
    // Past the tabia the masters' games ran out and the stored online tree
    // carried the walk: the shares are strong players', the count masters'.
    const mixed = (sans: readonly string[]) => Promise.resolve(
      TREE[sans.join(' ')] ? { result: TREE[sans.join(' ')], source: sans.length > MG.length ? 'online' as const : 'masters' as const } : null);
    const plan = await computedPlanAt(MG, 'white', 'x', 'p', { lookup: mixed });
    expect(plan!.overview).toMatch(/^In the 500 master games/);
    expect(plan!.pawnBreaks[0].explanation).toMatch(/of the games between strong players here/);
    expect(plan!.playableLines![0].title).toBe('The plan, as strong players played it');
    const online = (sans: readonly string[]) => Promise.resolve(TREE[sans.join(' ')] ? { result: TREE[sans.join(' ')], source: 'online' as const } : null);
    const op = await computedPlanAt(MG, 'white', 'x', 'p', { lookup: online });
    expect(op!.overview).toMatch(/^In the 500 strong online games/);
    expect(op!.playableLines![0].title).toBe('The plan, as strong online players played it');
  });

  it('a share is of ALL the games at each board: the replies it does not walk are never handed to the one it does', async () => {
    // A thin board: 31 games, …Rb8 in 13 and the rest spread under the walk's
    // floor. Passing all 31 to …Rb8 said "100% played axb5" where 11 of the
    // tabia's 42 games did.
    const S = [...MG, 'a6'];
    const R = (...m: string[]): string => [...S, ...m].join(' ');
    const tree: Record<string, LichessExplorerResult> = {
      [S.join(' ')]: node(42, [['Re1', 37], ['h3', 5]]),
      [R('Re1')]: node(37, [['h6', 29], ['b5', 8]]),
      [R('Re1', 'h6')]: node(31, [['Nf1', 13], ['Bb3', 9], ['h3', 9]]),
      [R('Re1', 'h6', 'Nf1')]: node(18, [['Be6', 11], ['Re8', 7]]),
      [R('Re1', 'h6', 'Nf1', 'Be6')]: node(11, [['Ng3', 11]]),
    };
    const look = (sans: readonly string[]) => Promise.resolve(masters(tree[sans.join(' ')]));
    const plan = await computedPlanAt(S, 'white', 'x', 'p', { lookup: look });
    // 37/42 · 29/37 · 13/31 · 11/18 · 11/11 ≈ 18%, never 100%.
    expect(plan!.pieceManeuvers.map((m) => m.route)).toEqual(['d2–f1–g3']);
    expect(plan!.pieceManeuvers[0].explanation).toMatch(/^18%/);
  });

  it('a line that stops in the middle of an exchange is walked on through it; the plan is read after', async () => {
    // The line ends on …exd4 with Nxd4 to come: read there, the structure
    // called the pawn about to be taken "your passed pawn on d4 — push it".
    const C2 = [...C, 'c3', 'd5', 'd4', 'exd4'];
    const K2 = (...m: string[]): string => [...C2, ...m].join(' ');
    const tree: Record<string, LichessExplorerResult> = {
      [C2.join(' ')]: node(100, [['cxd4', 100]]),
      // …Bxd4 could still take back: the walk plays on to the quiet board.
      [K2('cxd4')]: node(100, [['Bb6', 70], ['Bxd4', 30]]),
      [K2('cxd4', 'Bb6')]: node(70, [['exd5', 50], ['e5', 20]]),
      [K2('cxd4', 'Bb6', 'exd5')]: node(50, [['Nxd5', 50]]),
      [K2('cxd4', 'Bb6', 'e5')]: node(20, [['Ne4', 20]]),
    };
    const look = (sans: readonly string[]) => Promise.resolve(masters(tree[sans.join(' ')]));
    const plan = await computedPlanAt(C2, 'white', 'x', 'p', { lookup: look });
    expect(plan).not.toBeNull();
    expect(plan!.lineMoves).toEqual(C2);
    expect(plan!.approach).toEqual(['cxd4', 'Bb6']);
    expect(plan!.criticalPositionFen).toBe(fenOf([...C2, 'cxd4', 'Bb6']));
    // Recapturing on d4 is the exchange, not the plan; exd5 against the pawn
    // that has stood on d5 is.
    expect(plan!.pawnBreaks.map((b) => b.move)).toEqual(['exd5']);
  });

  it('a recapture is never "the break": taking the pawn the opponent just put there answers their break', async () => {
    // Both castled; White pushes b4, Black takes …cxb4 and every game
    // recaptures axb4 — then Black's lever …b5 is taken cxb5. Neither is
    // White's plan, and nothing else was played: no plan (it used to read
    // "the axb4 break, played in 100% of the games").
    const B = ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6', 'O-O', 'O-O', 'd3', 'd6', 'a3', 'a6', 'Rb1', 'Rb8', 'b4', 'cxb4'];
    const R = (...m: string[]): string => [...B, ...m].join(' ');
    const tree: Record<string, LichessExplorerResult> = {
      [B.join(' ')]: node(80, [['axb4', 80]]),
      [R('axb4')]: node(80, [['b5', 80]]),
      [R('axb4', 'b5')]: node(80, [['cxb5', 80]]),
      [R('axb4', 'b5', 'cxb5')]: node(80, [['axb5', 80]]),
      [R('axb4', 'b5', 'cxb5', 'axb5')]: node(80, [['Bd2', 80]]),
    };
    const look = (sans: readonly string[]) => Promise.resolve(masters(tree[sans.join(' ')]));
    expect(await computedPlanAt(B, 'white', 'x', 'p', { lookup: look })).toBeNull();
  });
});

describe('tabPlanFor — one tab of an opening', () => {
  it('reads the tab\'s own line, walked on to its middlegame', async () => {
    const opening = { id: 'italian', color: 'white', pgn: TABIA.join(' '), variations: [] } as unknown as OpeningRecord;
    const plan = await tabPlanFor(opening, -1, lookup);
    expect(plan!.id).toBe('computed-italian--1');
    expect(plan!.criticalPositionFen).toBe(fenOf(MG));
    expect(plan!.approach).toEqual(APPROACH);
  });
});

describe('isPawnBreak', () => {
  const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
  it('a pawn move that meets an enemy pawn is a break; a quiet push is not', () => {
    expect(isPawnBreak(after(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6']), 'd4', 'f6')).toBe(true);
    expect(isPawnBreak(after(['e4', 'e5']), 'h3', 'e5')).toBe(false);
    expect(isPawnBreak(after(['e4', 'e5']), 'Nf3', 'e5')).toBe(false);
  });
  it('taking a pawn that has stood is a break; taking the one that just arrived is not', () => {
    // 1.e4 d5: …d5 is Black's break, 2.exd5 accepts it.
    expect(isPawnBreak(after(['e4', 'd5']), 'exd5', 'd5')).toBe(false);
    // 1.e4 d5 2.Nc3 Nf6: the d5 pawn has stood a move — exd5 resolves the tension.
    expect(isPawnBreak(after(['e4', 'd5', 'Nc3', 'Nf6']), 'exd5', 'f6')).toBe(true);
    // A recapture: 1.d4 e5 2.dxe5 Nc6 3.Nf3 d6 4.exd6 cxd6 — …cxd6 retakes on d6.
    expect(isPawnBreak(after(['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'd6', 'exd6']), 'cxd6', 'd6')).toBe(false);
    // En passant takes the pawn that just arrived: 1.e4 a6 2.e5 d5 3.exd6.
    expect(isPawnBreak(after(['e4', 'a6', 'e5', 'd5']), 'exd6', 'd5')).toBe(false);
  });
});
