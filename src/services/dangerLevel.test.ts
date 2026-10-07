import { describe, it, expect } from 'vitest';
import { dangerLevel, openThreatLine } from './liveTacticsContext';

describe('the danger level, computed and spoken first (David 2026-10-06)', () => {
  it('a hanging knight the warning names: a piece is at stake', () => {
    // their bishop on b4 hits your undefended knight on c3
    const fen = '4k3/8/8/8/1b6/2N5/8/4K3 w - - 0 1';
    expect(dangerLevel(fen, 'w', ['b4', 'c3'])).toBe('piece');
    expect(openThreatLine('Watch out — their bishop on b4 hits your knight on c3.', fen, 'w', ['b4', 'c3'], 0)).toBe('Danger — a whole piece is at stake. Their bishop on b4 hits your knight on c3.');
  });
  it('a guarded bishop hit by a pawn loses material — never "a pawn is at stake" (Learn tape 2026-10-07, 6.h3)', () => {
    const fen = 'rn2kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N1P/PPP2PP1/R1BQKB1R b KQkq - 0 6';
    expect(dangerLevel(fen, 'b', ['h3', 'g4'])).toBe('material');
    expect(openThreatLine('Watch out — their pawn on h3 hits your bishop on g4.', fen, 'b', ['h3', 'g4'], 0))
      .toBe('Watch out — this loses material if you ignore it. Their pawn on h3 hits your bishop on g4.');
  });
  it('a mate threat decides the game', () => {
    // back rank: their rook can mate on e1 if you pass
    const fen = '4r1k1/8/8/8/8/8/5PPP/6K1 w - - 0 1';
    expect(dangerLevel(fen, 'w', ['e8', 'e1'])).toBe('decisive');
  });
  it('nothing lost by force: not urgent yet', () => {
    const fen = '4k3/8/8/8/8/2N5/8/4K3 w - - 0 1';
    expect(dangerLevel(fen, 'w', ['c3'])).toBe('not-yet');
    expect(openThreatLine('Watch out — if they play Bb4, the knight is pinned.', fen, 'w', ['c3'], 0)).toBe('Not urgent yet, but see it coming — if they play Bb4, the knight is pinned.');
  });
  it('a DIFFERENT piece hangs: no level, so it is never pinned to the wrong threat', () => {
    // the warning names c3, but the hanging piece is the bishop on f3
    const fen = '4k3/8/8/7q/8/2N2B2/8/4K3 w - - 0 1';
    expect(dangerLevel(fen, 'w', ['c3'])).toBeNull();
    expect(openThreatLine('Watch out — something about c3.', fen, 'w', ['c3'], 0)).toBe('Watch out — something about c3.');
  });
  it('rotates on the ply, never random', () => {
    const fen = '4k3/8/8/8/1b6/2N5/8/4K3 w - - 0 1';
    const a = openThreatLine('Watch out — x.', fen, 'w', ['c3'], 0);
    const b = openThreatLine('Watch out — x.', fen, 'w', ['c3'], 1);
    expect(a).not.toBe(b);
    expect(openThreatLine('Watch out — x.', fen, 'w', ['c3'], 2)).toBe(a);
  });
});

describe('openThreatLine — "Careful —" takes the computed level too', () => {
  it('opens a hanging queen with the level, never "not yet"', () => {
    // Black queen on d5 attacked by the c3 knight, nothing guarding it.
    const fen = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3';
    const out = openThreatLine("Careful — your queen on d5 is attacked and nothing's defending it.", fen, 'b', ['d5'], 3);
    expect(out).not.toMatch(/^Careful/);
    expect(out).not.toMatch(/Not urgent|No rush/);
    expect(out).toMatch(/queen on d5 is attacked/);
  });
});

describe('a loud alarm is said with full weight once a game, then plainly — never "Again —" (tape 2026-10-06)', () => {
  it('after the first loud alarm, the next keeps its plain warning', async () => {
    const { isLoudAlarm } = await import('./liveTacticsContext');
    const fen = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3';
    const line = "Careful — your queen on d5 is attacked and nothing's defending it.";
    const first = openThreatLine(line, fen, 'b', ['d5'], 3, 0);
    expect(isLoudAlarm(first)).toBe(true);
    expect(first).not.toMatch(/^Again/);
    const later = openThreatLine(line, fen, 'b', ['d5'], 3, 1);
    expect(later).toBe(line);
    expect(later).not.toMatch(/^Again/);
  });
  it('a pawn-level warning is never "Again"', () => {
    // White to move; the black knight on d4 is hanging to nothing: use a pawn hit.
    const fen = '4k3/8/8/8/3p4/4P3/8/4K3 b - - 0 1';
    const out = openThreatLine('Watch out — their pawn on e3 hits your pawn on d4.', fen, 'b', ['d4'], 1, 5);
    expect(out).not.toMatch(/^Again/);
  });
});
