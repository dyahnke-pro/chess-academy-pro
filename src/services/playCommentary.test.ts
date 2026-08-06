// The running commentary must be RIGHT about whose piece it names and silent on
// an unremarkable position — a coach who comments on every recapture teaches
// nothing (the locked voice law: speak when it instructs).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildPlayCommentary } from './playCommentary';

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
