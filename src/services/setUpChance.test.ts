import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { positionPosed } from './moveInsight';
import { capabilityOutcomes } from './capabilityEvidence';
import { detectSetUpChance, setUpHeldClause, setUpClause, setUpSkill, setUpPosed } from './setUpChance';
import type { AnalysisLine } from '../types';

/** One sound engine line from `fen`, in SAN, as an analysis line. */
function line(fen: string, sans: string[], evaluation = 0): AnalysisLine {
  const c = new Chess(fen);
  const moves = sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
  return { rank: 1, evaluation, moves, mate: null };
}

// Boards and the engine's own lines from the Danya bench's real reads (moment 3
// measure), each line as long as the engine read it.
const PIN_KING = 'r2qkb1r/pp4pp/2n1pp2/2Pp2B1/6n1/2P3PN/PP2PP1P/RN1QK2R w KQkq - 0 9';
const PIN_QUEEN = 'r1bq1rk1/p1p2ppp/1p1p1nn1/3Pp3/2P1P3/3B1N1P/P1P2PP1/R1BQ1RK1 w - - 0 11';
const FORK = 'r4rk1/ppp1pp1p/3p1bp1/5P2/2PnP3/2NB3q/PP3P1P/R2Q1R1K b - - 0 13';
const MATE_THREAT = 'r3r1k1/bbpq1p1n/p1np3Q/1p6/3PP3/1B3NNP/PP3PP1/R3R1K1 w - - 1 19';
const PIN_ENDING = '8/1ppkb3/4p1r1/2P4p/3PR3/6pP/P5P1/5RK1 w - - 2 45';

describe('moment 3: the tactic a quiet move sets up', () => {
  it('a quiet queen move that pins their knight to their king — said without the move', () => {
    const s = detectSetUpChance(PIN_KING, [line(PIN_KING, ['Qa4', 'h5'])], 'w');
    expect(s?.kind).toBe('pin');
    expect(s?.targets).toEqual(['n', 'k']);
    const held = setUpHeldClause(s!);
    expect(held).toBe('A quiet move here pins their knight to their king: it cannot move, so whatever it guards is guarded no more.');
    expect(held).not.toMatch(/Qa4|a4/);
    expect(setUpClause(s!)).toMatch(/^Qa4 quietly pins their knight to their king/);
    expect(setUpSkill(s!)).toBe('missed-your-pin');
  });

  it('a pin to the queen says the queen is what falls', () => {
    const s = detectSetUpChance(PIN_QUEEN, [line(PIN_QUEEN, ['Bg5', 'h6'])], 'w');
    expect(setUpHeldClause(s!)).toBe('A quiet move here pins their knight to their queen: if it steps off the line, the queen behind it is attacked.');
  });

  it('a quiet knight move whose line forks king and bishop next move — named by the one classifier', () => {
    const s = detectSetUpChance(FORK, [line(FORK, ['Nf3', 'Qxf3', 'Qxf3+', 'Kg1', 'c6', 'c5', 'Be5', 'Ne2', 'dxc5', 'Ng3', 'Qxd3'], -715)], 'b');
    expect(s).toMatchObject({ kind: 'strike', motif: 'fork', depth: 2 });
    expect(setUpHeldClause(s!)).toBe('A quiet move here sets up a fork of their king and bishop: it wins material on your next move.');
    expect(setUpSkill(s!)).toBe('missed-your-fork');
  });

  it('a mating threat that wins the queen never claims mate', () => {
    const s = detectSetUpChance(MATE_THREAT, [line(MATE_THREAT, ['Nh5', 'Qg4', 'hxg4', 'Bxd4', 'Nxd4', 'Nxd4', 'Qg7#'], 900)], 'w');
    expect(s?.mates).toBe(false);
    expect(setUpHeldClause(s!)).not.toMatch(/ends in mate/);
    expect(setUpHeldClause(s!)).toMatch(/wins material on your next move/);
  });

  it('a line more than half a pawn worse than the best sets nothing up', () => {
    const best = { rank: 1, evaluation: 200, moves: ['h2h3'], mate: null };
    const s = detectSetUpChance(PIN_KING, [best, { ...line(PIN_KING, ['Qa4', 'h5'], 100), rank: 2 }], 'w');
    expect(s).toBeNull();
  });

  it('not the student\'s move, or a capture first, sets nothing up', () => {
    expect(detectSetUpChance(PIN_KING, [line(PIN_KING, ['Qa4', 'h5'])], 'b')).toBeNull();
    const cap = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectSetUpChance(cap, [line(cap, ['exd5', 'Qxd5'])], 'w')).toBeNull();
  });
});

describe('what is not a set-up', () => {
  it('a quiet move that attacks a piece at once is a threat, never a set-up', () => {
    // h5 hits the knight on g6; the line wins the other knight after it takes
    // the pawn. The threat readers say this, not moment 3.
    const fen = 'r2qkb1r/pppbppp1/5nnp/3P4/2P4P/5N2/PP2BPP1/RNBQK2R w KQkq - 0 10';
    expect(detectSetUpChance(fen, [line(fen, ['h5', 'Nxh5', 'Rxh5', 'e6'], 200)], 'w')).toBeNull();
  });

  it('a line cut off mid-exchange, the student in check, wins nothing', () => {
    // …Qxe1 takes the queen, Nxf6+ checks, and the rook takes the queen back.
    const fen = 'rn3rk1/pp3ppp/2p2n2/q3p3/6b1/P1NP2P1/1PP2PBP/R1B1QRK1 b - - 0 11';
    expect(detectSetUpChance(fen, [line(fen, ['Re8', 'Ne4', 'Qxe1', 'Nxf6+'], -150)], 'b')).toBeNull();
  });

  it('a piece they simply put where it is taken is not a tactic the quiet move built', () => {
    // Kh8, then Ba6 drops the bishop: a waiting move, not a shot.
    const fen = 'r5k1/4pp1p/3p2p1/2pP4/2B5/p3PK2/1r3PPP/R7 b - - 5 27';
    expect(detectSetUpChance(fen, [line(fen, ['Kh8', 'Ba6', 'Rxa6', 'g4'], -300)], 'b')).toBeNull();
  });

  it('a tactic already on the board is the shot (moment 2), never a set-up', () => {
    // The fork board with a white rook left loose on h5: …gxh5 wins it now.
    const fen = 'r4rk1/ppp1pp1p/3p1bp1/5P1R/2PnP3/2NB3q/PP3P1P/R2Q1R1K b - - 0 13';
    const quiet = line(fen, ['Nf3', 'Qxf3', 'Qxf3+', 'Kg1', 'c6', 'c5', 'Be5', 'Ne2', 'dxc5', 'Ng3', 'Qxd3'], -715);
    expect(detectSetUpChance(fen, [quiet], 'b')?.motif).toBe('fork');
    const shot = { ...line(fen, ['gxh5', 'a3'], -700), rank: 2 };
    expect(detectSetUpChance(fen, [quiet, shot], 'b')).toBeNull();
  });
});

describe('the position composer hands moment 3 to the door', () => {
  it('a set-up on the student\'s move (Learn\'s walk posture) is a held pointer at the motif\'s skill', async () => {
    const { computePositionFacts } = await import('./positionFacts');
    const analysis = { topLines: [line(PIN_ENDING, ['Rf7', 'Rg8'], 150)], evaluation: 150, isMate: false, mateIn: null, seldepth: 18, depth: 16, wdl: null };
    const facts = await computePositionFacts({ boardComputers: 'surface', posture: 'walk', fen: PIN_ENDING, moverColor: 'w', studentColor: 'w', analysis, history: [], namesBestMove: false } as never);
    expect(facts.setUp?.kind).toBe('pin');
    const clause = (facts.clauses as Array<{ computer: string; heldForm?: { points?: string; text: string } }>).find((c) => c.computer === 'detectSetUpChance');
    expect(clause?.heldForm?.points).toBe('missed-your-pin');
    expect(clause?.heldForm?.text).toMatch(/^A quiet move here pins their/);
  }, 30_000);
});

// THE SET-UP ON THE RECORD (David 2026-11-08: "Repeatedly missing a set-up is
// noted as a weakness the coach teaches"). Its own row, posed from the board's
// best line alone — the line the record and the population both carry.
describe('the set-up row — posed off the best line, scored by the one scoring', () => {
  const forkLine = line(FORK, ['Nf3', 'Qxf3', 'Qxf3+', 'Kg1', 'c6', 'c5', 'Be5', 'Ne2', 'dxc5', 'Ng3', 'Qxd3'], -715).moves;

  it('a quiet move that sets up a fork is posed; a pin that wins nothing is not', () => {
    expect(setUpPosed(FORK, forkLine)).toBe(true);
    expect(setUpPosed(PIN_KING, line(PIN_KING, ['Qa4', 'h5']).moves)).toBe(false);
    expect(positionPosed(FORK, { bestSan: 'Nf3', bestLine: forkLine }).map((p) => p.tag)).toContain('missed-set-up');
  });

  it('a costly move breaks it, a clean one holds it', () => {
    const alsoPosed = positionPosed(FORK, { bestSan: 'Nf3', bestLine: forkLine });
    const missed = capabilityOutcomes({ fenBefore: FORK, playedSan: 'a6', moverColor: 'black', cpLoss: 400, bestSan: 'Nf3', shotLine: forkLine, alsoPosed });
    expect(missed.find((o) => o.tag === 'missed-set-up')?.outcome).toBe('broken');
    const found = capabilityOutcomes({ fenBefore: FORK, playedSan: 'Nf3', moverColor: 'black', cpLoss: 0, shotLine: forkLine, alsoPosed });
    expect(found.find((o) => o.tag === 'missed-set-up')?.outcome).toBe('held');
  });
});
