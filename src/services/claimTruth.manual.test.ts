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

describe('a recapture that just loses the piece says so (item 84)', () => {
  it('exd4 vs Qxd4: Qxd4 "would just lose the queen to Nxd4", not "…e5 hits it"', async () => {
    const { recaptureChoice } = await import('./recaptureChoice');
    const line = recaptureChoice('r1bqkbnr/pp2pppp/2n5/3p4/3p1B2/2N1P3/PPP2PPP/R2QKBNR w KQkq - 0 5', 'exd4', null, 'Bf5');
    expect(line).toMatch(/Qxd4 would just lose the queen to Nxd4/);
    expect(line).not.toMatch(/hits it/);
  });
});

describe('a pawn capture taken straight back is not a doubled-pawn weakness (item 294)', () => {
  it('…bxc3 in the closed Sicilian is not "c5 is a weak pawn"', () => {
    const hist = ['e4', 'c5', 'Nc3', 'a6', 'g3', 'b5', 'a3', 'Bb7', 'Bg2', 'd6', 'd3', 'e6', 'f4', 'Nf6', 'Nf3', 'Be7', 'O-O', 'Nbd7', 'h3', 'Qc7', 'Ne2', 'h5', 'a4', 'b4', 'c3', 'bxc3'];
    const out = attributePrinciples({ replySan: null, historySans: hist, bestSan: 'b3', classification: 'mistake' });
    expect(out.map((a) => a.id)).not.toContain('created-pawn-weakness');
  });
});

describe('Bc2 in ktoa6lk6qNk: the blow is g4 and it wins a piece (items 189, 190)', () => {
  const hist = ['e4', 'c5', 'Nf3', 'd6', 'c3', 'Nf6', 'h3', 'Nc6', 'Bd3', 'g6', 'Bc2', 'Bg7', 'O-O', 'e5', 'Re1', 'O-O', 'd4', 'cxd4', 'cxd4', 'exd4', 'Nxd4', 'Re8', 'Nf3', 'd5', 'exd5', 'Rxe1+', 'Qxe1', 'Nxd5', 'Bb3', 'Bf5', 'Na3', 'Qd7', 'Qd1', 'Ncb4', 'Qe1', 'Nc6', 'Qd1', 'Ncb4', 'Nd4', 'Bd3', 'Nac2', 'Rc8', 'Nxb4', 'Nxb4', 'a3', 'Bxd4', 'axb4', 'Qf5', 'Qe1', 'a6', 'Be3', 'Bxb2', 'Rd1', 'Bc3', 'Bd2', 'Bd4', 'Be3', 'Bc3', 'Bd2', 'Bxd2', 'Qxd2', 'Bc2'];
  it('a pawn hitting the queen is the immediate blow — no "gxf5 was waiting deeper"', () => {
    const out = attributePrinciples({ replySan: 'Bxc2', historySans: hist, bestSan: 'Bc4', classification: 'mistake', pvAfterPlayed: ['g4', 'Bxb3', 'gxf5', 'Bxd1', 'Qxd1'], evalBefore: 109, evalAfterPlayed: -171 } as never);
    expect(out.map((a) => a.id)).not.toContain('calculation-depth');
  });
  it('the plan reader says "a piece for a pawn", not "a pawn"', async () => {
    const { planFromUci } = await import('./lookaheadPlan');
    const p = planFromUci('2r3k1/1p3p1p/p5p1/5q2/1P6/1B5P/2bQ1PP1/3R2K1 w - - 1 32', ['g2g4', 'f5f3', 'b3c2', 'f3h3', 'd2e2', 'h3c3'], 'black', null);
    expect(p?.theirs?.text).toMatch(/win a piece for a pawn/);
  });
});

describe('the verdict on a found move (P2 #2)', () => {
  it('names the move as the only one that held, with no praise word', async () => {
    const { readCriticalMoment, criticalMomentFound } = await import('./criticalMoment');
    // White to move; Qxf7 mates-in-spirit (+900), everything else is level.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const read = readCriticalMoment({
      topLines: [
        { rank: 1, evaluation: 900, moves: ['h5f7'] },
        { rank: 2, evaluation: 10, moves: ['h5e2'] },
        { rank: 3, evaluation: 0, moves: ['h5f3'] },
      ],
      moverColor: 'w', fen,
    });
    const line = criticalMomentFound(read, 'Qxf7#');
    expect(line).toMatch(/^Qxf7# was the only move that kept the win here\./);
    expect(line ?? '').not.toMatch(/great|nice|excellent|well done|correct/i);
    // Not found → nothing.
    expect(criticalMomentFound(read, 'Qe2')).toBeNull();
  });
});

describe('run I manual check: a recapture is not a win, a pawn recapture is not a coin-flip', () => {
  it('"That let them win a pawn, starting with Bxc4" is not said after the student\'s own …bxc4', async () => {
    const { whatItAllowed } = await import('./concessionBeat');
    const args = {
      fenAfter: 'r2qk2r/5pp1/p1bbpn2/2p4p/2pP4/1B6/PPN2PPP/R1BQ1RK1 w kq - 0 14',
      opponentPv: ['b3c4', 'f6g4', 'h2h3', 'd6h2', 'g1h1', 'h2c7'],
      studentColor: 'black' as const, cpLoss: 120,
    };
    expect(whatItAllowed({ ...args, fenBefore: 'r2qk2r/5pp1/p1bbpn2/1pp4p/2PP4/1B6/PPN2PPP/R1BQ1RK1 b kq - 0 13', playedSan: 'bxc4' })?.line ?? '').not.toMatch(/win a pawn/);
  });
  it('Nxf3 vs gxf3 is never "does the same job"', async () => {
    const { tacticalReadFromLines, uncertaintyClause } = await import('./tacticalRead');
    const fen = '1nkr1r2/1pp1b1pp/4p3/2P1N3/3P4/4BbKP/P5P1/1R2R3 w - - 0 28';
    const lines = [
      { rank: 1, evaluation: -19, moves: ['e5f3', 'b8c6', 'e3f2', 'f8e8', 'g3h2', 'e7f6'], mate: null },
      { rank: 2, evaluation: -40, moves: ['g2f3', 'e7f6', 'e3f2', 'd8d5', 'e5g4', 'f6d4'], mate: null },
      { rank: 3, evaluation: -481, moves: ['b1b3', 'f3d5', 'b3a3', 'e7f6', 'a3a8', 'f6e5'], mate: null },
    ];
    const read = tacticalReadFromLines(fen, lines as never, 'white');
    expect(read?.closeAlternative ?? null).toBeNull();
    for (let r = 0; r < 4; r++) expect(read ? uncertaintyClause(read, { rotation: r }) : null).toBeNull();
  });
});

describe('an even trade is not "waiting deeper" (Learn walk 2026-10-02, plies 26 and 38)', () => {
  const g = ['e4', 'e5', 'c3', 'Be7', 'd4', 'exd4', 'cxd4', 'Nf6', 'Nc3', 'Nc6', 'h3', 'd5', 'e5', 'Ne4', 'Bd3', 'Bb4', 'Bxe4', 'dxe4', 'Ne2', 'Be6', 'O-O', 'Bc4', 'Be3', 'Bxc3', 'bxc3', 'O-O'];
  it('…O-O: exf6 en passant against the student\'s own …f5 is not the blow', () => {
    const out = attributePrinciples({ replySan: 'Re1', historySans: g, bestSan: 'Ne7', classification: 'mistake', pvAfterPlayed: ['Re1', 'f5', 'exf6', 'Qxf6'], evalBefore: 66, evalAfterPlayed: -31 } as never);
    expect(out.find((a) => a.id === 'calculation-depth')?.evidence?.moves?.[0]).not.toBe('exf6');
  });
  it('…a6: axb5 axb5 is a pawn swap, not the blow', () => {
    const h = [...g, 'Re1', 'Bd5', 'Qc2', 'Na5', 'Nf4', 'c6', 'Qa4', 'Nc4', 'Rab1', 'b5', 'Qc2', 'a6'];
    const out = attributePrinciples({ replySan: 'Nxd5', historySans: h, bestSan: 'Qd7', classification: 'mistake', pvAfterPlayed: ['Qe2', 'f6', 'a4', 'Qd7', 'axb5', 'axb5'], evalBefore: 131, evalAfterPlayed: 40 } as never);
    expect(out.find((a) => a.id === 'calculation-depth')?.evidence?.moves?.[0]).not.toBe('axb5');
  });
});

describe('a guard is not the piece doing nothing (Learn walk 2026-10-02, ply 56)', () => {
  it('…Qg4+ with the knight on h6 guarding the queen: no "improve your worst piece"', () => {
    const h = ['h4', 'Nc6', 'c3', 'Nf6', 'f3', 'e5', 'g4', 'd5', 'b4', 'e4', 'h5', 'exf3', 'exf3', 'Bd6', 'Kf2', 'O-O', 'd4', 'a5', 'b5', 'Ne7', 'a4', 'c5', 'g5', 'Nf5', 'gxf6', 'Qxf6', 'f4', 'cxd4', 'c4', 'dxc4', 'Bxc4', 'Bc5', 'Kf1', 'Be6', 'Bxe6', 'Qxe6', 'Qf3', 'Qc4+', 'Kg2', 'Qxc1', 'Ne2', 'Ne3+', 'Kg3', 'Qb2', 'Nbc3', 'dxc3', 'Rab1', 'Nf5+', 'Kg4', 'Nh6+', 'Kh3', 'Qa2', 'Nxc3', 'Qe6+', 'Kg2', 'Qg4+'];
    const out = attributePrinciples({ replySan: 'Qxg4', historySans: h, bestSan: 'Nf5', classification: 'blunder' });
    expect(out.map((a) => a.id)).not.toContain('worst-piece-unimproved');
  });
});
