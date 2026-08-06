// The running commentary must be RIGHT about whose piece it names and silent on
// an unremarkable position — a coach who comments on every recapture teaches
// nothing (the locked voice law: speak when it instructs).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildPlayCommentary, buildRejectedTempting, buildPriorityFirst, buildInstantReplyLine } from './playCommentary';

describe('buildPlayCommentary', () => {
  it('names the opponent knight on an unchallengeable outpost when the trade is available', () => {
    // White to move. Black knight on d4 (White's half), defended by the e5
    // pawn; White has no c- or e-pawn behind it to ever challenge — a textbook
    // outpost. White's knight on f3 can capture it right now.
    const fen = '4k3/8/5p2/4p3/3n4/5N2/6P1/4K3 w - - 0 1';
    // Sanity: the position is legal and Nxd4 exists.
    expect(new Chess(fen).moves()).toContain('Nxd4');
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    expect(beat?.kind).toBe('trade-the-best-piece');
    expect(beat?.facts[0]).toContain('d4');
    expect(beat?.facts[0]).toContain('outpost');
  });

  it('says nothing when it is not the student to move', () => {
    const fen = '4k3/8/5p2/4p3/3n4/5N2/6P1/4K3 w - - 0 1';
    expect(buildPlayCommentary({ fen, studentColor: 'black' })).toBeNull();
  });

  it('reports only the OPPONENT\'s hanging piece, never the student\'s own', () => {
    // White to move; Black's rook on a5 hangs to nothing defending it and
    // White's bishop on d2 can be read as loose too — the beat must name the
    // BLACK piece for a white student.
    const fen = '4k3/8/8/r7/8/8/3B4/4K3 w - - 0 1';
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    if (beat) {
      expect(beat.kind).toBe('tactic');
      expect(beat.facts[0]).toContain('a5');
      expect(beat.facts[0]).not.toContain('d2');
    }
  });

  it('is silent on the ordinary opening position', () => {
    const fen = new Chess().fen();
    expect(buildPlayCommentary({ fen, studentColor: 'white' })).toBeNull();
  });

  it('a hanging PAWN alone stays silent — gambit pawns are theory, not tactics', () => {
    // Black's a5-pawn is en prise to b4 and nothing else is on. Measured on
    // the repertoire corpus: 7.9% of theory plies have a loose pawn; speaking
    // on each is the tuned-out failure.
    expect(buildPlayCommentary({ fen: '4k3/8/8/p7/1P6/8/8/4K3 w - - 0 1', studentColor: 'white' })).toBeNull();
  });

  it('mate on the board outranks everything and never names the move', () => {
    // Ra8# is available. The fact says mate exists; it must not say where.
    const beat = buildPlayCommentary({ fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', studentColor: 'white' });
    expect(beat?.kind).toBe('tactic');
    expect(beat?.facts[0]).toContain('MATE');
    expect(beat?.facts[0]).not.toContain('a8');
  });

  it('speaks the student\'s OWN event tactic from the expanded detector', () => {
    // White Rd1 attacks the black knight on d4 whose sole defender (Bb6) is
    // itself capturable by Rb1 — removal of the guard, beneficiary White.
    const beat = buildPlayCommentary({ fen: '6k1/8/1b6/8/3n4/8/6PP/1R1R2K1 w - - 0 1', studentColor: 'white' });
    expect(beat?.kind).toBe('tactic');
    expect(beat?.facts[0]).toContain('TACTIC ON THE BOARD');
  });

  it('seeding observation: enemy queen and rook on one file, student owns a rook', () => {
    // Black Qd6 + Rd8 share the d-file (d7 empty, luft on h6 so no back-rank
    // flag); White owns Ra1. Not a tactic — the noticing that precedes one.
    const beat = buildPlayCommentary({ fen: '3r2k1/5pp1/3q3p/8/8/8/6PP/R5K1 w - - 0 20', studentColor: 'white' });
    expect(beat?.kind).toBe('seeding-observation');
    expect(beat?.facts[0]).toContain('d-file');
    expect(beat?.facts[0]).toContain('rook');
  });

  it('seeding observation stays silent without a matching slider for the line', () => {
    // Same alignment, but White\'s only piece is a bishop — wrong geometry.
    const beat = buildPlayCommentary({ fen: '3r2k1/5pp1/3q3p/8/8/8/6PP/B5K1 w - - 0 20', studentColor: 'white' });
    expect(beat?.kind).not.toBe('seeding-observation');
  });
});

describe('buildRejectedTempting', () => {
  // Scandinavian shape: after e4 d5, exd5 (a capture) is playable but the
  // fixture scores it 180cp below the best line with ...Qxd5 as the reply.
  const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  it('names the tempting capture AND its refutation, never the best move', () => {
    const rt = buildRejectedTempting({
      fen,
      studentColor: 'white',
      lines: [
        { uci: 'e4e5', replyUci: 'c7c5', evalCp: 40 },
        { uci: 'e4d5', replyUci: 'd8d5', evalCp: -140 },
      ],
    });
    expect(rt?.temptingSan).toBe('exd5');
    expect(rt?.refutationSan).toBe('Qxd5');
    expect(rt?.facts).toContain('exd5');
    expect(rt?.facts).toContain('Qxd5');
    expect(rt?.facts).not.toContain('e5 '); // the best move stays unnamed
  });

  it('a quiet alternative is not "tempting" — silence', () => {
    // Second line is a quiet knight move, not a capture or check.
    const rt = buildRejectedTempting({
      fen,
      studentColor: 'white',
      lines: [
        { uci: 'e4e5', replyUci: 'c7c5', evalCp: 40 },
        { uci: 'g1f3', replyUci: 'd5e4', evalCp: -140 },
      ],
    });
    expect(rt).toBeNull();
  });

  it('an eval gap under 1.5 pawns is a preference, not a refutation — silence', () => {
    const rt = buildRejectedTempting({
      fen,
      studentColor: 'white',
      lines: [
        { uci: 'e4e5', replyUci: 'c7c5', evalCp: 40 },
        { uci: 'e4d5', replyUci: 'd8d5', evalCp: -60 },
      ],
    });
    expect(rt).toBeNull();
  });
});

describe('buildPriorityFirst', () => {
  it('names the isolated-pawn priority and withholds the move', () => {
    // Black's d5-pawn is ISOLATED (no c- or e-pawn). White's best move
    // Nc3 attacks it after landing. The beat names d5, not the knight move.
    // A best move that does NOT attack the weak pawn stays silent…
    const fen = '6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/6K1 w - - 0 20';
    expect(buildPriorityFirst({ fen, studentColor: 'white', bestUci: 'd2b3' })).toBeNull();
    // …and Nb1–c3, which lands attacking d5, names the priority.
    const fen2 = '6k1/pp3ppp/8/3p4/8/8/PP1N1PPP/1N4K1 w - - 0 20';
    const pf2 = buildPriorityFirst({ fen: fen2, studentColor: 'white', bestUci: 'b1c3' });
    expect(pf2?.targetSquare).toBe('d5');
    expect(pf2?.facts).toContain('d5');
    expect(pf2?.facts).toContain('isolated');
    expect(pf2?.facts).not.toContain('Nc3');
  });

  it('a healthy pawn target means no priority beat', () => {
    // Black's d5 has a c6 neighbour — connected, not weak. Same knight jump.
    const fen = '6k1/pp3ppp/2p5/3p4/8/8/PP1N1PPP/1N4K1 w - - 0 20';
    expect(buildPriorityFirst({ fen, studentColor: 'white', bestUci: 'b1c3' })).toBeNull();
  });
});

describe('buildInstantReplyLine', () => {
  it('a quiet move is just the move', () => {
    expect(buildInstantReplyLine({ san: 'Nf3', isCheckmate: false, isCheck: false }))
      .toBe('Nf3.');
  });

  it('a capture names the victim from chess.js, never invented', () => {
    expect(buildInstantReplyLine({ san: 'Bxc6', captured: 'n', isCheckmate: false, isCheck: false }))
      .toBe('Bxc6 — taking your knight.');
  });

  it('check and capture-with-check carry their own emphasis', () => {
    expect(buildInstantReplyLine({ san: 'Qh5+', isCheckmate: false, isCheck: true }))
      .toBe('Qh5 — check.');
    expect(buildInstantReplyLine({ san: 'Qxf7+', captured: 'p', isCheckmate: false, isCheck: true }))
      .toBe('Qxf7 — taking your pawn, with check.');
  });

  it('checkmate outranks everything', () => {
    expect(buildInstantReplyLine({ san: 'Qxf7#', captured: 'p', isCheckmate: true, isCheck: true }))
      .toBe('Qxf7 — checkmate.');
  });

  it('the whole flow from a real board — chess.js fields feed it directly', () => {
    // Scholar's mate final position: Qxf7# captures a pawn and mates.
    const c = new Chess('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4');
    const m = c.move('Qxf7');
    expect(m).toBeTruthy();
    const line = buildInstantReplyLine({
      san: m.san,
      captured: m.captured,
      isCheckmate: c.isCheckmate(),
      isCheck: c.isCheck(),
    });
    expect(line).toBe('Qxf7 — checkmate.');
  });
});
