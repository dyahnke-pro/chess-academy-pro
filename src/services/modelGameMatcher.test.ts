import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  matchModelGameCameo,
  sharedFeatureLines,
  buildCameoPlayback,
  pickCameoAnchor,
} from './modelGameMatcher';
import { structureSignature } from './boardStructure';

/**
 * These fixtures ARE the §2.1 probe corpus — the hand-checked outcomes the
 * matcher was calibrated on. If a data or scoring change breaks one, the
 * calibration has drifted: re-run the probe by hand before touching the
 * expectations.
 */
describe('modelGameMatcher — the ONE cameo, or none (Phase 2)', () => {
  it('an IQP middlegame surfaces an IQP moment', () => {
    const cameo = matchModelGameCameo(
      'r2q1rk1/pp2bppp/2n1bn2/8/2BP4/2N2N2/PP3PPP/R1BQR1K1 w - - 4 12',
      { openingFamily: 'queens-gambit' },
    );
    expect(cameo).not.toBeNull();
    expect(cameo!.ratio).toBeGreaterThanOrEqual(0.6);
    expect(cameo!.matched).toBeGreaterThanOrEqual(4);
    expect(cameo!.sharedFeatures.join(' ')).toContain('isolated queen');
  });

  it('an opposite-wing race surfaces a race game', () => {
    const cameo = matchModelGameCameo(
      'r2q1rk1/pp1bppbp/2np1np1/8/3NPP2/1BN1B3/PPPQ2PP/2KR3R w - - 5 11',
      { openingFamily: 'sicilian-defense' },
    );
    expect(cameo).not.toBeNull();
    expect(cameo!.sharedFeatures.join(' ')).toContain('opposite wings');
  });

  it('the QGD Carlsbad surfaces Fischer–Spassky Reykjavik game 6', () => {
    const cameo = matchModelGameCameo(
      'r1bq1rk1/pp1n1ppp/2pb1n2/3p4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 6 9',
      { openingFamily: 'queens-gambit-declined' },
    );
    expect(cameo).not.toBeNull();
    expect(cameo!.gameId).toBe('mg-fischer-spassky-g6');
    expect(cameo!.sharedFeatures.join(' ')).toContain('queenside pawn majority');
  });

  it('a French locked chain surfaces a chain-play moment', () => {
    const cameo = matchModelGameCameo(
      'r1bqkb1r/pp3ppp/2n1pn2/2ppP3/3P4/2P2N2/PP3PPP/RNBQKB1R w KQkq - 1 6',
      { openingFamily: 'french-defense' },
    );
    expect(cameo).not.toBeNull();
    expect(cameo!.sharedFeatures.join(' ')).toContain('locked central pawn chain');
  });

  it('an R+minor ending with no matching conversion moment returns NULL — empty > tenuous', () => {
    const cameo = matchModelGameCameo('5rk1/1b3ppp/4p3/8/P7/4BP2/5P1P/3R2K1 w - - 0 28', {
      openingFamily: 'caro-kann-defense',
    });
    expect(cameo).toBeNull();
  });

  it('a featureless position returns NULL — vacuous matches never become cameos', () => {
    const cameo = matchModelGameCameo(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    );
    expect(cameo).toBeNull();
  });

  it('an invalid FEN returns NULL, never throws', () => {
    expect(matchModelGameCameo('not a fen')).toBeNull();
  });

  it('every returned cameo is fully NAMED and jumps past move 1', () => {
    const cameo = matchModelGameCameo(
      'r2q1rk1/pp2bppp/2n1bn2/8/2BP4/2N2N2/PP3PPP/R1BQR1K1 w - - 4 12',
    )!;
    expect(cameo.white.length).toBeGreaterThan(0);
    expect(cameo.black.length).toBeGreaterThan(0);
    expect(cameo.momentMoveNumber).toBeGreaterThan(1);
    expect(cameo.pgn.length).toBeGreaterThan(0);
  });

  it('every matched cameo has a verified PLAYABLE stretch (moment reached in pgn, real tail)', () => {
    const cameo = matchModelGameCameo(
      'r1bq1rk1/pp1n1ppp/2pb1n2/3p4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 6 9',
      { openingFamily: 'queens-gambit-declined' },
    )!;
    const playback = buildCameoPlayback(cameo);
    expect(playback).not.toBeNull();
    expect(playback!.plies.length).toBeGreaterThanOrEqual(4);
    // Every played ply is legal from the moment position (chess.js truth).
    const chess = new Chess(playback!.startFen);
    for (const p of playback!.plies) {
      expect(() => chess.move(p.san)).not.toThrow();
      expect(chess.fen()).toBe(p.fenAfter);
    }
  });

  it('buildCameoPlayback returns null when the moment is not in the pgn', () => {
    expect(
      buildCameoPlayback({
        pgn: 'e4 e5 Nf3 Nc6 Bb5 a6',
        momentFen: '5rk1/1b3ppp/4p3/8/P7/4BP2/5P1P/3R2K1 w - - 0 28',
      }),
    ).toBeNull();
  });

  it('pickCameoAnchor finds ONE thematic ply in a game reaching an IQP middlegame', () => {
    // Walk a plausible student game into the IQP shape and hand the fens over.
    const chess = new Chess();
    const sans = ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Be7', 'cxd5', 'Nxd5', 'Bd3', 'Nc6', 'O-O', 'O-O'];
    const fens = [chess.fen()];
    for (const s of sans) {
      chess.move(s);
      fens.push(chess.fen());
    }
    const anchor = pickCameoAnchor(fens, { openingFamily: 'caro-kann' });
    expect(anchor).not.toBeNull();
    expect(anchor!.plyIndex).toBeGreaterThanOrEqual(10);
    expect(anchor!.cameo.sharedFeatures.length).toBeGreaterThan(0);
  });

  it('pickCameoAnchor returns null for a short game that never forms a structure', () => {
    const chess = new Chess();
    const fens = [chess.fen()];
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6']) {
      chess.move(s);
      fens.push(chess.fen());
    }
    expect(pickCameoAnchor(fens)).toBeNull();
  });

  it('sharedFeatureLines states only features true on BOTH signatures', () => {
    const iqpSig = structureSignature(
      'r2q1rk1/pp2bppp/2n1bn2/8/2BP4/2N2N2/PP3PPP/R1BQR1K1 w - - 4 12',
    )!;
    const endgameSig = structureSignature('5rk1/1b3ppp/4p3/8/P7/4BP2/5P1P/3R2K1 w - - 0 28')!;
    // IQP vs endgame share nothing thematic — the lines must not invent.
    const lines = sharedFeatureLines(iqpSig, endgameSig);
    expect(lines.join(' ')).not.toContain('isolated queen');
    expect(lines.join(' ')).not.toContain('endgame');
  });
});
