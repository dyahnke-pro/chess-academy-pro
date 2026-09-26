// Walk 3 of the 1380 speedrun (2026-09-26) — one owner per claim.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findPieceQuality } from './positionReadingService';
import { detectBehaviors } from './danyaBehaviors';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };
const GAME = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8 g4 f5 Rxd8 Qe7 gxh5 Qxd8 Bxe6+ Kh8 Bg5 f4 Bxf4 Bc5+ Kg2 Qe7 Bc4 b5 Bd3 g6 Ne4 b4';

describe('walk 3 — one owner per claim', () => {
  it('a file both sides have a rook on is owned by neither (30.Ne4)', () => {
    const notes = findPieceQuality(fenAfter(GAME)).filter((n) => n.reason === 'rook on the open file' && n.square[0] === 'f');
    expect(notes).toEqual([]);
  });

  it('while castling is one move away, only the positional read says "castle" (7.Bb3)', () => {
    const fen = fenAfter('e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7');
    const facts = detectBehaviors({ fen, studentColor: 'white' }).map((h) => h.fact);
    expect(facts.some((f) => /still in the center with lines opening/.test(f))).toBe(false);
  });
});

describe('one habit, taught once a game (walk 3, 21.Rxd8 → 22.gxh5)', () => {
  it('the verdict drops its "how" when the method beat already taught that habit, and marks it when it speaks', async () => {
    const { learnFundamentalVerdict } = await import('./learnFundamentalNarration');
    const pre = GAME.split(' ').slice(0, 42);
    const c = new Chess(); for (const s of pre) c.move(s);
    const input = {
      currentGameId: 'walk3', fenBefore: c.fen(), historySans: [...pre, 'gxh5'], playedSan: 'gxh5', bestSan: 'Rxf8+',
      studentColor: 'white' as const, evalBeforeWhiteCp: 681, evalAfterWhiteCp: 418,
      bestPvUci: ['d8f8', 'g8f8', 'f3f5', 'f8g8', 'g4h5', 'g8h8', 'e1g3', 'b4c5'],
      playedPvUci: ['f8d8', 'e1g3', 'g8h8', 'b3e6', 'e7e6', 'g3g5', 'd8f8', 'g5f4'],
    };
    // Fresh game: the how speaks, and the habit is recorded as taught.
    const said = new Set<string>();
    const first = learnFundamentalVerdict(input, new Set(), [], said);
    expect(first).not.toBeNull();
    expect(first!.verdict).toMatch(/answer what their last move threatens/);
    expect(said.has('method:opponent-threat')).toBe(true);
    // The method beat already taught it this game: the verdict keeps its fact, loses the lecture.
    const again = learnFundamentalVerdict(input, new Set(), [], new Set(['method:opponent-threat']));
    expect(again?.verdict ?? '').not.toMatch(/answer what their last move threatens/);
  });
});
