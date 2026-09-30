// Manual claim check of the run B–H tapes (2026-09-30): each false line, on its
// real position, must no longer be produced — and a true twin still must be.
import { describe, it, expect } from 'vitest';
import { attributePrinciples } from './principleAttribution';
import { buildRejectedTempting } from './playCommentary';
import { pieceQualityLines } from './pieceValueRead';

describe('an even trade is not a loose piece (items 133-135)', () => {
  it('Bxf6 (recaptured) is not flagged loose-piece; Nxg5?? still is', () => {
    const trade = attributePrinciples({ replySan: null, historySans: ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'e6', 'h4', 'h5', 'Bg5', 'Bf6', 'Bxf6'], bestSan: 'Qd2', classification: 'inaccuracy' });
    expect(trade.map((a) => a.id)).not.toContain('loose-piece');
    const hang = attributePrinciples({ replySan: null, historySans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'Bg5', 'h6', 'Bh4', 'g5', 'Bg3', 'Nh5', 'Nxg5'], bestSan: 'Nc3', classification: 'blunder' });
    expect(hang.map((a) => a.id)).toContain('loose-piece');
  });
});

describe('bait only when taking is actually wrong (items 37, 144)', () => {
  it('no "bait" when the best move captures on the same square', () => {
    const out = buildRejectedTempting({
      fen: 'r7/2prqpk1/1p2pNp1/p3Pn1p/5Q1P/5N2/PPP2PP1/2KR4 w - - 0 22', studentColor: 'white', baitSquare: 'd7',
      lines: [{ uci: 'd1d7', replyUci: 'e7d7', evalCp: 658 }, { uci: 'f6d7', replyUci: 'a8d8', evalCp: 412 }, { uci: 'd1g1', replyUci: 'd7d8', evalCp: 69 }],
    } as never);
    expect(out?.spoken ?? '').not.toMatch(/bait|refutes/);
  });
  it('no "runs into" when the tempting line still leaves the student clearly ahead', () => {
    const out = buildRejectedTempting({
      fen: 'r1bq1rk1/ppp2pbp/3p1n1B/2nPp1pP/4P1P1/2N2P2/PPPQ4/R3KBNR w KQ - 0 12', studentColor: 'white', baitSquare: 'g5',
      lines: [{ uci: 'd2g5', replyUci: 'f6e8', evalCp: 589 }, { uci: 'h6g5', replyUci: 'h7h6', evalCp: 322 }, { uci: 'h6g7', replyUci: 'g8g7', evalCp: 229 }],
    } as never);
    expect(out?.spoken ?? '').not.toMatch(/bait|runs into|refutes/);
  });
});

describe('a challenger a pawn just takes is not a challenge (item 136)', () => {
  it('Nd5 is not offered against the queen on f6 (…exd5); a safe challenger still is', () => {
    const fen = 'rnb1k1nr/pppp1p2/4pqp1/7p/3PP2P/2N5/PPP2PP1/R2QKBNR w KQkq - 0 7';
    const values = [{ piece: 'q', color: 'b', square: 'f6', value: -2.0 }, { piece: 'Q', color: 'w', square: 'd1', value: 0.3 }] as never;
    const best = pieceQualityLines(values, 'white', undefined, { isMiddlegame: true, fen }).find((l) => l.kind === 'their-best-piece');
    expect(best?.text).toMatch(/queen on f6/);
    expect(best?.text ?? '').not.toMatch(/Nd5 challenges/);
    // Control (uJro3yCDEgk): Bg5 still challenges the f6 knight.
    const ctl = pieceQualityLines([
      { piece: 'n', color: 'b', square: 'f6', value: -1.6 }, { piece: 'n', color: 'b', square: 'd7', value: -0.4 },
      { piece: 'B', color: 'w', square: 'c1', value: 0.2 }, { piece: 'N', color: 'w', square: 'f3', value: 0.8 },
    ] as never, 'white', undefined, { isMiddlegame: true, fen: 'r2qkb1r/pp1n1ppp/5n2/2pp4/3P4/2P2N2/PP3PPP/RNBQK2R w KQkq - 0 10' }).find((l) => l.kind === 'their-best-piece');
    expect(ctl?.text).toMatch(/Bg5 challenges it/);
  });

});

describe('a rook already on the file does not "take" it (item 11)', () => {
  it('Rd8-d7 is not open-file; Rd1 from a1 still is', async () => {
    const { computeMoveFundamentals } = await import('./moveFundamentals');
    const along = computeMoveFundamentals('r2r2k1/p3n1bp/b1p1qpp1/P1p1p3/1p1PP3/2P1BN1P/1PN2PP1/R2QR1K1 b - - 0 17', 'Rd7', 'black');
    expect(along.some((f) => f.id === 'open-file')).toBe(false);
    const onto = computeMoveFundamentals('4k3/1p4p1/8/8/8/8/1P4P1/R3K3 w Q - 0 20', 'Rd1', 'white');
    expect(onto.some((f) => f.id === 'open-file')).toBe(true);
  });
});

describe('closed centre names a break that exists (item 160)', () => {
  it('with Black already on c5, White\'s queenside break is b4; without it, c5', async () => {
    const { namedPawnStructure } = await import('./positionReadingService');
    const withC5 = namedPawnStructure('rnbqkbnr/1p3ppp/p2p4/2pPp3/4P3/2P2N2/PP3PPP/RNBQKB1R w KQkq - 0 6', 'w');
    expect(withC5?.plan).toMatch(/break on the queenside with b4/);
    const noC5 = namedPawnStructure('rnbqkbnr/ppp2ppp/3p4/3Pp3/2P1P3/8/PP3PPP/RNBQKBNR w KQkq - 0 5', 'w');
    expect(noC5?.plan).toMatch(/break on the queenside with c5/);
  });
});

describe('king cover counts a pawn one step forward (item 95)', () => {
  it('g6 still shields g8; only the h-pawn gone is not "2 gone"', async () => {
    const { detectKingExposure } = await import('./kingSafety');
    // Black king g8, pawns f7 g6 (h-pawn gone), White queen + bishop aimed.
    expect(detectKingExposure('r2qr1k1/pb1n1pb1/6p1/2ppp3/3P2PP/2PBP1B1/P2QN3/3R1RK1 b - - 3 21', 'b')).toBeNull();
    // Control: g- and h-pawns both gone — the alarm still fires.
    expect(detectKingExposure('r2qr1k1/pb1n1p2/8/2ppp3/3P2PP/2PBP1B1/P2QN3/3R1RK1 b - - 3 21', 'b')?.missingShield).toBe(2);
  });
});

describe('piece-quality table must describe this board (item 195)', () => {
  it('a stale entry for an empty square is never named', () => {
    const fen = 'r1bqk2r/5ppp/p1np1b2/1p1Np3/4P3/N7/PPP2PPP/R2QKB1R w KQkq - 0 11';
    const values = [
      { piece: 'b', color: 'b', square: 'e6', value: -2.5 }, // stale: e6 is empty
      { piece: 'b', color: 'b', square: 'f6', value: -0.2 },
      { piece: 'n', color: 'w', square: 'd5', value: 0.9 },
    ] as never;
    const lines = pieceQualityLines(values, 'white', undefined, { isMiddlegame: true, fen });
    expect(lines.some((l) => /e6/.test(l.text))).toBe(false);
  });
});
