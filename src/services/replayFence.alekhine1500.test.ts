// Hand walk 2026-09-27 — Alekhine Four Pawns, student White at 1500, a game
// Naroditsky teaches move by move (vc-1rcEbI44WqE). Each flag pinned on the
// real board it was heard on.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { strategicWhyLed } from './moveFundamentals';
import { conceptInstanceKey } from './conceptKey';

const GAME = 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 Qd7 Nf3 Bg4 Be2 O-O-O c5 Nd5 Nxd5 Qxd5 Kf2 e6 h3 Bf5 Qa4 Qe4 Qa3 Qc2 b4 Be7 b5 Nb8 Qxa7 Bd3 Rhe1 Bxb5 Rab1 Qa4 Qxa4 Bxa4 Nd2 f6 Nc4 Bc6 Bf3 fxe5 Nxe5 Rhf8 Kg3 Bxf3 Nxf3 Nc6 Bf2 Rf6 Re4 Rd5 Rbe1 Kd7 Kh2 h6 Bg3 g5 Be5 Nxe5'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const s of GAME.slice(0, n)) c.move(s); return c.fen(); };

describe('Alekhine 1500 hand walk — the flags stay fixed', () => {
  it('Be5 with …Nxe5 on is a trade offer, never "lands on the e5 outpost" (ply 67)', () => {
    expect(strategicWhyLed(fenAt(66), 'Be5', 'white') ?? '').not.toMatch(/outpost/);
  });
  it('one battery on e6 is one claim, whichever back square the stack uses (ply 61)', () => {
    expect(conceptInstanceKey('battery', ['e1', 'e4', 'e6'])).toBe(conceptInstanceKey('battery', ['e2', 'e4', 'e6']));
    expect(conceptInstanceKey('fork', ['a', 'b'])).not.toBe(conceptInstanceKey('fork', ['a', 'c']));
  });
  it('the Learn memory is reset only by the board going backwards — no mid-turn "length <= 2" reset (ply 5)', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).not.toMatch(/chainHistory\.length\s*<=\s*2\)\s*\{\s*resetPerGameMemory\(\)/);
  });
});

describe('back rank (Alekhine ply 75)', () => {
  it('no "back rank can be invaded" when the only check lands on a square the bishop covers', async () => {
    const { detectTactics } = await import('./tacticsDetector');
    const t = detectTactics('3k4/1pprb3/4p1r1/2P3pp/3PR3/4N2P/P5PK/5R2 w - - 2 39').tactics;
    expect(t.some((x) => x.type === 'back_rank')).toBe(false);
  });
});

describe('one move, one voice (Alekhine ply 79)', () => {
  it('the gap line stands down when a concept already tells the same fork', async () => {
    const { gapEchoedByVerdict } = await import('./opponentGap');
    const fork = { kind: 'concept', text: 'After Ne5, your knight on e5 forks their rook on d7 and their rook on g6.', squares: ['e5', 'd7', 'g6'] };
    expect(gapEchoedByVerdict('Ne5', [fork], 'e5')).toBe(true);
    expect(gapEchoedByVerdict('Ne5', [fork], 'c5')).toBe(false);
  });
});
