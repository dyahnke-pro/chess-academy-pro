import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { threatPurpose } from './threatPurpose';
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
});
