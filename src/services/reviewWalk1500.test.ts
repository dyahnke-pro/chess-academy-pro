// Review hand-walk, game N1500 (2026-09-26): each defect pinned at the real
// position (or the real sentence) it was spoken on.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectTactics } from './tacticsDetector';
import { computeMoveFundamentals } from './moveFundamentals';
import { moveMeetsThreat, pastTenseReviewNarration, type ReviewMoveSegment } from './coachFeatureService';

const GAME = 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 Qd7 Nf3 Bg4 Be2 O-O-O c5 Nd5 Nxd5 Qxd5 Kf2 e6 h3 Bf5 Qa4 Qe4 Qa3 Qc2 b4 Be7 b5 Nb8 Qxa7 Bd3 Rhe1 Bxb5 Rab1 Qa4 Qxa4 Bxa4 Nd2 f6 Nc4 Bc6 Bf3 fxe5 Nxe5 Rhf8 Kg3 Bxf3 Nxf3 Nc6 Bf2 Rf6 Re4 Rd5 Rbe1 Kd7 Kh2 h6 Bg3 g5 Be5 Nxe5 Nxe5+ Kd8 Ng4 Rg6 Rf1 h5 Ne3 Rd7 Rb1 Kc8 Nc4 g4 Ne5 g3+ Kg1 Rf6 Nxd7 Kxd7 Rf1 Rg6 Rf7 Ke8 Rh7 h4 Rf4 Bg5 Rf3 Bf6 Rf4 Bg5 Rff7 Be3+ Kf1 Bxd4 Rxc7 Rf6+ Ke2 Be5 Rc8#'.split(' ');
function fenAt(ply: number): string {
  const c = new Chess();
  for (const m of GAME.slice(0, ply)) c.move(m);
  return c.fen();
}
const past = (narration: string, narrationSource?: string): string => {
  const seg = { narration, narrationSource } as unknown as ReviewMoveSegment;
  pastTenseReviewNarration([seg]);
  return (seg as { narration: string }).narration;
};

describe('review walk 1500 — claims the board did not support', () => {
  it('a queen that can TRADE itself off is not trapped (…Qa4 vs Qa7; Qxa4 was on)', () => {
    const trapped = detectTactics(fenAt(42)).tactics.filter((t) => t.type === 'trapped_piece' && t.involvedSquares[0] === 'a7');
    expect(trapped).toEqual([]);
  });

  it('Kf2-g3 is not "toward the center" — it gets no nearer', () => {
    const f = computeMoveFundamentals(fenAt(52), 'Kg3', 'white');
    expect(f.map((x) => x.id)).not.toContain('king-activity');
  });

  it('a rook stepping out of capture is not prophylaxis (Rh7 out of Kxf7)', () => {
    expect(moveMeetsThreat(fenAt(90), 'Rh7', 'Kxf7')).toBe(false);
  });
});

describe('review walk 1500 — tense', () => {
  it('orientation (concept) beats stay in the present — rules, not history', () => {
    const rule = "Your structure just took a hit — an isolated pawn on the a-file. It's a target now; look to trade it off.";
    expect(past(rule, 'orientation')).toBe(rule);
    const convert = "You're up material with the position simplified. Improve your worst piece, trade when it's offered.";
    expect(past(convert, 'orientation')).toBe(convert);
  });
  it('a sentence already framed in the present keeps one tense ("this is a race, and it\'s won by…")', () => {
    const race = "The kings are on opposite wings — this is a race, and it's won by throwing your pawns at their king.";
    expect(past(race)).toBe(race);
  });
  it('a plan change is prescriptive, never past-tensed', () => {
    const plan = "The plan changes here — now it's to convert your extra material.";
    expect(past(plan)).toBe(plan);
  });
  it('an event sentence is still made retrospective', () => {
    expect(past("You're clearly better.")).toBe('You were clearly better.');
  });
});
