import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { threatPurpose, lineRestatesClaim } from './threatPurpose';
import type { PvLine, PvPly } from './pvPlayback';

/** A minimal PvLine from a FEN and SANs (facts: mate only — all this reads). */
function lineOf(fen: string, sans: string[]): PvLine {
  const c = new Chess(fen);
  const plies: PvPly[] = sans.map((san) => {
    const fenBefore = c.fen();
    const m = c.move(san);
    return {
      san: m.san, uci: `${m.from}${m.to}${m.promotion ?? ''}`, moverColor: m.color === 'w' ? 'white' : 'black',
      fenBefore, fenAfter: c.fen(),
      facts: { captured: null, isCheck: c.inCheck(), isMate: c.isCheckmate(), promotion: null, tacticLanded: null, materialGained: 0, newOpenFiles: [], newPassedPawns: [], passedPawnsHanded: [], outpostGained: null, shieldLost: 0 },
    };
  });
  return { plies, rootEvalCp: 0, terminalEvalCp: null } as unknown as PvLine;
}

describe('threatPurpose', () => {
  it('names mate when the line mates', () => {
    // Black (them) to move: Rxd2 takes the knight, but the line ends Rd1# on the back rank.
    const fen = '3r2k1/5ppp/8/8/8/8/P2N1PPP/6K1 b - - 0 1';
    const r = threatPurpose(lineOf(fen, ['Rxd2', 'a3', 'Rd1#']), 'w');
    expect(r).toBe('Their Rxd2 looks aimed at your knight on d2, but its real point is mate.');
  });
  it('silent when the line wins only what it first aimed at', () => {
    const fen = '3r2k1/5ppp/8/8/8/8/P2N1PPP/4R1K1 b - - 0 1';
    expect(threatPurpose(lineOf(fen, ['Rxd2', 'a3', 'Rb2']), 'w')).toBeNull();
  });
  it('a piece that moves inside the line and is taken there is the SAME piece — silent (review audit 2026-10-14)', () => {
    // …d5 hits the bishop on c4; it steps to b3 and the queen takes it there.
    // The old read said "its real point is your bishop on b3" — b3 was empty.
    const fen = '6k1/3p4/1q6/8/2B5/8/7P/7K b - - 0 1';
    expect(threatPurpose(lineOf(fen, ['d5', 'Bb3', 'Qxb3']), 'w')).toBeNull();
  });
});

// Review tape 2026-10-21, 19…f4: the kick on e3 was spoken, then the deep pass
// added "Watch what they're building — left alone, their idea goes: they play
// fxe3 and you answer Rxe3". The line was the claim's own consequence.
describe('lineRestatesClaim — a deep line that only plays out a spoken claim', () => {
  // Black to move again (the probe's null move): …fxe3 takes the bishop on e3.
  const fen = 'r5k1/8/8/8/5p2/4B3/8/4R1K1 b - - 0 1';
  const line = lineOf(fen, ['fxe3', 'Rxe3', 'Kf7']);

  it('is a restatement when one spoken claim names the attacker, the target and what the line wins', () => {
    expect(lineRestatesClaim(line, [['f4', 'e3', 'g3']])).toBe(true);
    expect(lineRestatesClaim(line, [['a2'], ['f4', 'e3']])).toBe(true);
  });

  it('is new when no single spoken claim holds all of it', () => {
    expect(lineRestatesClaim(line, [])).toBe(false);
    expect(lineRestatesClaim(line, [['f4'], ['e3']])).toBe(false);
    expect(lineRestatesClaim(line, [['g5', 'f6']])).toBe(false);
  });

  it('is new when the line wins something the claim never named', () => {
    // …fxe3 Rxe3 Rxa1: the a8 rook then takes the rook on a1, which the claim never named.
    const wider = lineOf('r5k1/8/8/8/5p2/4B3/8/R3R1K1 b - - 0 1', ['fxe3', 'Rxe3', 'Rxa1']);
    expect(lineRestatesClaim(wider, [['f4', 'e3']])).toBe(false);
  });

  it('is new when the line mates', () => {
    const mating = lineOf('3r2k1/5ppp/8/8/8/8/P2N1PPP/6K1 b - - 0 1', ['Rxd2', 'a3', 'Rd1#']);
    expect(lineRestatesClaim(mating, [['d8', 'd2', 'd1']])).toBe(false);
  });
});
