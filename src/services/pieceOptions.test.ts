// pieceOptions — "couldn't he just move the queen?" (WO-DANYA-01 C).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePieceOptions, dutiesOf, renderPieceOptions } from './pieceOptions';
import type { PvEngine } from './pvPlayback';
import type { StockfishAnalysis } from '../types';

// White queen d1 guards the bishop on d3, which the rook on d8 attacks.
const FEN = '3r2k1/5ppp/8/8/8/3B4/5PPP/3Q2K1 w - - 0 1';

function engineFrom(map: Record<string, { cp: number; pv: string[] }>): PvEngine {
  return {
    analyzePosition: (fen: string): Promise<StockfishAnalysis> => {
      const hit = map[fen.split(' ').slice(0, 2).join(' ')] ?? { cp: 0, pv: [] };
      return Promise.resolve({
        bestMove: hit.pv[0] ?? '', evaluation: hit.cp, isMate: false, mateIn: null, depth: 12,
        topLines: [{ rank: 1, evaluation: hit.cp, moves: hit.pv, mate: null }], nodesPerSecond: 0,
      });
    },
  };
}
const key = (fen: string, uci: string): string => {
  const c = new Chess(fen); c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  return c.fen().split(' ').slice(0, 2).join(' ');
};

describe('pieceOptions — narrow to the job, refute each, give the verdict', () => {
  it('the duty is computed: the queen guards the attacked bishop on d3', () => {
    expect(dutiesOf(FEN, 'd1')).toEqual(['d3']);
  });

  it('only the squares that keep the guard are options, each answered by its line', async () => {
    const engine = engineFrom({
      // Qd2 keeps the guard; Black has nothing — about level.
      [key(FEN, 'd1d2')]: { cp: 20, pv: ['g8f8'] },
      // Qe2 keeps the guard, but Rxd3 Qxd3 is an even trade — also level.
      [key(FEN, 'd1e2')]: { cp: 10, pv: ['g8f8'] },
    });
    const a = await computePieceOptions({ fen: FEN, pieceSquare: 'd1', seat: 'opponent', studentColor: 'black', playedUci: null, engine });
    expect(a).not.toBeNull();
    expect(a!.narrowedBy).toBe('duty');
    const sans = a!.options.map((o) => o.san).sort();
    // Every option still guards d3 from its new square.
    for (const o of a!.options) {
      const c = new Chess(FEN); c.move(o.san);
      expect(c.attackers('d3', 'w')).toContain(o.line.plies[0].uci.slice(2, 4));
    }
    expect(sans).toContain('Qd2');
    expect(sans).not.toContain('Qh5');          // leaves the bishop to hang
    expect(a!.facts).toMatch(/^Where can their queen on d1 go and still guard d3\?/);
    // A walkable line per option, starting at the question's position.
    expect(a!.lines.length).toBe(a!.options.length);
    expect(a!.lines[0].startFen).toBe(FEN);
  });

  it('a refuted option is said with its reply line and result, never the option twice', () => {
    const text = renderPieceOptions({
      seat: 'opponent', piece: 'q', from: 'f3', duty: ['e4'], narrowedBy: 'duty',
      options: [
        { san: 'Qf5', moverCp: -300, refutation: 'Then O-O and Bxf5 — you win a queen for a bishop', line: { label: 'Qf5', startFen: FEN, plies: [] } },
        { san: 'Qg4', moverCp: -150, refutation: null, line: { label: 'Qg4', startFen: FEN, plies: [] } },
      ].sort((x, y) => y.moverCp - x.moverCp),
      playedSan: 'Bf3', playedCp: 0, allMoves: 12,
    });
    expect(text).toMatch(/Where can their queen on f3 go and still guard e4\? Just Qg4 and Qf5\./);
    expect(text).toMatch(/Qf5\? Then O-O and Bxf5 — you win a queen for a bishop\./);
    expect(text).not.toMatch(/Qf5\? Qf5/);
    expect(text).toMatch(/So no — moving it doesn't help; Bf3 was the better move\./);
  });

  it('NEGATIVE CONTROL: not the mover\'s piece, or no piece there → no answer', async () => {
    const engine = engineFrom({});
    expect(await computePieceOptions({ fen: FEN, pieceSquare: 'd8', seat: 'opponent', studentColor: 'black', playedUci: null, engine })).toBeNull();
    expect(await computePieceOptions({ fen: FEN, pieceSquare: 'e4', seat: 'opponent', studentColor: 'black', playedUci: null, engine })).toBeNull();
  });

  it('the student\'s own piece is "your"', () => {
    const text = renderPieceOptions({ seat: 'student', piece: 'n', from: 'c3', duty: [], narrowedBy: 'escape', options: [], playedSan: null, playedCp: null, allMoves: 4 });
    expect(text).toBe('Your knight on c3 is attacked, and every square it can reach is covered.');
  });
});

import { pieceOptionsRef } from '../coach/questionIntents';
import { resolvePieceQuestion } from './pieceOptions';

describe('pieceOptionsRef — the question, parsed', () => {
  it.each([
    ["couldn't he just move the queen?", { seat: 'opponent', piece: 'q' }],
    ['why didnt they move their knight', { seat: 'opponent', piece: 'n' }],
    ['could I have just moved my bishop?', { seat: 'student', piece: 'b' }],
    ['what if the rook on e1 ran away', { seat: null, piece: 'r', square: 'e1' }],
    ["couldn't white's queen just go back", { seat: null, color: 'white', piece: 'q' }],
  ])('%s', (ask, want) => {
    expect(pieceOptionsRef(ask)).toMatchObject(want);
  });
  it('NEGATIVE CONTROL: a named destination is a candidate move; a plain question is nothing', () => {
    expect(pieceOptionsRef('could I move my queen to f5?')).toBeNull();
    expect(pieceOptionsRef('what is the best move here?')).toBeNull();
    expect(pieceOptionsRef('why is my queen bad')).toBeNull();
  });
});

describe('resolvePieceQuestion — the decision the question is about', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 — Black to move; the student is Black.
  const history = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
  const c = new Chess(); for (const m of history) c.move(m);
  it("the opponent just moved → the position before THEIR move, and that move", () => {
    const r = resolvePieceQuestion({ ref: { seat: 'opponent', color: null, piece: 'b', square: null }, fen: c.fen(), history, studentColor: 'black' });
    expect(r?.playedUci).toBe('f1c4');
    expect(r?.pieceSquare).toBe('f1');
    expect(r?.seat).toBe('opponent');
  });
  it('the student is to move → the question is about now, nothing played', () => {
    const r = resolvePieceQuestion({ ref: { seat: 'student', color: null, piece: 'n', square: null }, fen: c.fen(), history, studentColor: 'black' });
    expect(r?.playedUci).toBeNull();
    expect(r?.fen).toBe(c.fen());
    expect(['c6', 'g8']).toContain(r?.pieceSquare);
  });
  it('NEGATIVE CONTROL: a history that does not replay to the board is refused', () => {
    expect(resolvePieceQuestion({ ref: { seat: 'opponent', color: null, piece: 'b', square: null }, fen: c.fen(), history: ['d4'], studentColor: 'black' })).toBeNull();
  });
});

describe('pieceOptions — a refutation must prove something AGAINST the option', () => {
  it("THE LOCAL RUN: a line where the student comes out behind never refutes the OPPONENT's option", () => {
    // Opponent (White) option; the engine line ends with the STUDENT losing
    // material — that line shows the option WORKING, so it is not a refutation.
    const text = renderPieceOptions({
      seat: 'opponent', piece: 'q', from: 'd1', duty: [], narrowedBy: 'all',
      options: [{ san: 'Qc1', moverCp: 40, refutation: null, line: { label: 'Qc1', startFen: FEN, plies: [] } }],
      playedSan: 'Qf3', playedCp: 30, allMoves: 6,
    });
    expect(text).toBe("Their queen on d1 wasn't guarding anything or under attack, so it comes down to the best square: Qc1. So Qc1 was about as good as Qf3 — neither changes much.");
  });
  it('narrowed options that survive are said to hold', () => {
    const text = renderPieceOptions({
      seat: 'opponent', piece: 'q', from: 'f3', duty: ['e4'], narrowedBy: 'duty',
      options: [
        { san: 'Qg4', moverCp: -20, refutation: null, line: { label: 'Qg4', startFen: FEN, plies: [] } },
        { san: 'Qf5', moverCp: -300, refutation: 'Then O-O and Bxf5 — you win a queen for a bishop', line: { label: 'Qf5', startFen: FEN, plies: [] } },
      ],
      playedSan: null, playedCp: null, allMoves: 9,
    });
    expect(text).toMatch(/Qf5\? Then O-O and Bxf5 — you win a queen for a bishop\. Qg4 holds\./);
  });
});

describe('pieceOptions — a piece that cannot move', () => {
  it('says so, instead of falling through to the best move', async () => {
    const start = new Chess().fen(); // the a1 rook has no legal move
    const a = await computePieceOptions({ fen: start, pieceSquare: 'a1', seat: 'student', studentColor: 'white', playedUci: null, engine: engineFrom({}) });
    expect(a?.facts).toBe("Your rook on a1 had no legal move — it couldn't go anywhere.");
    expect(a?.lines).toEqual([]);
  });
});
