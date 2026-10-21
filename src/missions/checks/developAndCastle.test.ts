import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { checkDevelopAndCastle, developAndCastleProgress, developAndCastleShowMove } from './developAndCastle';
import type { MissionGame } from '../missionCard';

const line = (moves: string): string[] => moves.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t));
const game = (moves: string, studentColor: 'w' | 'b' = 'w', forgiven: number[] = []): MissionGame => ({
  sans: line(moves), studentColor, forgiven: new Set(forgiven),
});
const check = (moves: string, studentColor: 'w' | 'b' = 'w', forgiven: number[] = []) =>
  checkDevelopAndCastle(game(moves, studentColor, forgiven));

describe('every fixture is a legal game', () => {
  const all = [
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. O-O O-O 7. Bg5 Bg4',
    '1. d4 e5 2. Nf3 e4 3. Ng5',
    '1. d4 d5 2. Nc3 Nf6 3. Bg5 e6 4. Bxf6 Qxf6',
    '1. d4 e6 2. Nf3 Bb4+ 3. Nfd2',
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Nc3 d6 6. d3 O-O 7. Bg5',
    '1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Nf3 e6 5. e3 Nf6 6. Bd3 Bd6 7. Qd2 O-O 8. O-O-O',
    '1. a4 a5 2. h4 h5 3. Ra3 Ra6 4. Rhh3',
    '1. e4 e5 2. Nf3 Nc6 3. Ng5 Nf6 4. Nh3',
    '1. b3 e6 2. Nf3 Ba3 3. e3 Bxc1 4. Qxc1 Nf6 5. Bd3 d5 6. Nc3 O-O 7. O-O',
    '1. e4 e5 2. f3 Qh4+ 3. Ke2',
    '1. e4 e5 2. Nf3 Nc6 3. Ng5 h6 4. Nf3',
  ];
  it.each(all)('%s', (moves) => {
    const b = new Chess();
    for (const san of line(moves)) expect(() => b.move(san)).not.toThrow();
  });
});

describe('develop & castle — the board check', () => {
  it('1. Italian, clean: PASS on the move the last minor comes out with the king castled', () => {
    // Nf3 Bc4 Nc3 d3 O-O Bg5 — the fourth minor (Bg5) lands with the king castled.
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. O-O O-O 7. Bg5')).toEqual({ state: 'pass', ply: 12 });
    // One move earlier the mission is still pending.
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. O-O O-O')).toEqual({ state: 'pending' });
  });

  it('2. a knight moved twice, unforced (Nf3 … Ng5) → MISS repeat-move', () => {
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Ng5')).toEqual({ state: 'miss', ply: 4, reason: 'repeat-move' });
  });

  it('3. a knight kicked by a pawn then moving is EXEMPT — still pending', () => {
    // …e4 hits the knight on f3; Ng5 is its second move, and it was attacked.
    expect(check('1. d4 e5 2. Nf3 e4 3. Ng5')).toEqual({ state: 'pending' });
    // Played on from the Ng5 miss (forgiven), then …h6 kicks it: Nf3 is exempt.
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Ng5 h6 4. Nf3', 'w', [4])).toEqual({ state: 'pending' });
  });

  it('4. a bishop capture (Bxf6) is EXEMPT', () => {
    expect(check('1. d4 d5 2. Nc3 Nf6 3. Bg5 e6 4. Bxf6 Qxf6')).toEqual({ state: 'pending' });
  });

  it('5. in check, a developed knight interposes — EXEMPT', () => {
    expect(check('1. d4 e6 2. Nf3 Bb4+ 3. Nfd2')).toEqual({ state: 'pending' });
  });

  it('6. castled before every minor is out → pending, then PASS when the last one comes out', () => {
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Nc3 d6 6. d3 O-O')).toEqual({ state: 'pending' });
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Nc3 d6 6. d3 O-O 7. Bg5')).toEqual({ state: 'pass', ply: 12 });
  });

  it('7. queenside castle with all four minors out → PASS', () => {
    expect(check('1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Nf3 e6 5. e3 Nf6 6. Bd3 Bd6 7. Qd2 O-O 8. O-O-O')).toEqual({ state: 'pass', ply: 14 });
  });

  it('8. castling lost on both sides by the student → MISS castling-lost', () => {
    // The king walks: both sides gone in one move.
    expect(check('1. e4 e5 2. Ke2')).toEqual({ state: 'miss', ply: 2, reason: 'castling-lost' });
    // One rook moves: one side left, no miss. The second rook takes the last side.
    expect(check('1. a4 a5 2. h4 h5 3. Ra3 Ra6')).toEqual({ state: 'pending' });
    expect(check('1. a4 a5 2. h4 h5 3. Ra3 Ra6 4. Rhh3')).toEqual({ state: 'miss', ply: 6, reason: 'castling-lost' });
  });

  it('8b. a king move that answers a check is not a miss', () => {
    expect(check('1. e4 e5 2. f3 Qh4+ 3. Ke2')).toEqual({ state: 'pending' });
  });

  it('9. Black mirrors 1 and 2', () => {
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. O-O O-O 7. Bg5 Bg4', 'b')).toEqual({ state: 'pass', ply: 13 });
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4', 'b')).toEqual({ state: 'miss', ply: 5, reason: 'repeat-move' });
    // White's moves never miss a Black student's mission.
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Ng5', 'b')).toEqual({ state: 'pending' });
  });

  it('10. a minor captured on its home square counts as resolved', () => {
    // …Bxc1 takes White's bishop at home; with three others out and castled, PASS.
    expect(check('1. b3 e6 2. Nf3 Ba3 3. e3 Bxc1 4. Qxc1 Nf6 5. Bd3 d5 6. Nc3 O-O 7. O-O')).toEqual({ state: 'pass', ply: 12 });
  });

  it('a forgiven miss is walked past, and the next miss still counts', () => {
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Ng5 h6 4. Nf3', 'w', [4])).toEqual({ state: 'pending' });
    expect(check('1. e4 e5 2. Nf3 Nc6 3. Ng5 Nf6 4. Nh3', 'w', [4])).toEqual({ state: 'miss', ply: 6, reason: 'repeat-move' });
  });

  it('pawn and queen moves never miss', () => {
    expect(check('1. e4 e5 2. Qh5 Nc6 3. Qf3 Nf6 4. a4 a5 5. h4 h5')).toEqual({ state: 'pending' });
  });
});

describe('develop & castle — progress and the shown move', () => {
  it('progress counts minors out and the castle', () => {
    expect(developAndCastleProgress(game('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O'))).toBe('2/4 pieces out · castled');
    expect(developAndCastleProgress(game(''))).toBe('0/4 pieces out · not castled yet');
  });

  it("shows the engine's best move that develops or castles", () => {
    // After 1.e4 e5 2.Nf3 Nc6 the engine likes Ng5 (not wanted), then Bc4.
    const fen = (() => { const b = new Chess(); for (const s of line('1. e4 e5 2. Nf3 Nc6')) b.move(s); return b.fen(); })();
    expect(developAndCastleShowMove(fen, 'w', ['f3g5', 'f1c4', 'b1c3'])).toEqual({ from: 'f1', to: 'c4' });
  });

  it('nothing can come out yet: shows the pawn that frees a bishop (audit game 3, Black)', () => {
    // 1.e4 Nc6 2.Nf3 Nf6 3.Nc3 — both Black knights are out, both bishops are
    // shut in, castling is not possible: the next step is the pawn.
    const fen = (() => { const b = new Chess(); for (const s of line('1. e4 Nc6 2. Nf3 Nf6 3. Nc3')) b.move(s); return b.fen(); })();
    // The engine's choice wins when it frees a minor…
    expect(developAndCastleShowMove(fen, 'b', ['c6b8', 'd7d5', 'e7e5'])).toEqual({ from: 'd7', to: 'd5' });
    // …a move that frees nothing (a knight back home) never does…
    expect(developAndCastleShowMove(fen, 'b', ['c6b8', 'a7a6'])?.from).toMatch(/^[a-h]7$/);
    // …and with no read, a centre pawn that frees a bishop.
    const fallback = developAndCastleShowMove(fen, 'b', []);
    expect(fallback?.from).toBe('e7');
  });

  it('with no wanted move in the read, castles first, then a knight', () => {
    const castleReady = (() => { const b = new Chess(); for (const s of line('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')) b.move(s); return b.fen(); })();
    expect(developAndCastleShowMove(castleReady, 'w', [])).toEqual({ from: 'e1', to: 'g1' });
    expect(developAndCastleShowMove(new Chess().fen(), 'w', ['e2e4'])).toMatchObject({ from: expect.stringMatching(/^[bg]1$/) });
  });
});
