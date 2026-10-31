import { describe, expect, it } from 'vitest';
import { afterCaptureSan, afterCaptureSanForms, captureInWords, capturePieceName } from './captureWords';

// ONE WAY TO SAY A CAPTURE (David 2026-10-30: "queen takes d8, takes the
// queen"). After its SAN only what the capture leads to; or piece words with
// no SAN — never the capture twice.
describe('after the SAN: what the capture leads to, never the capture again', () => {
  it('material is a count, and "nothing can take back" only when true', () => {
    expect(afterCaptureSan({ kind: 'nets', captured: 'q', free: true, gave: null }, 'verb')).toBe('wins a queen, and nothing can take back');
    expect(afterCaptureSan({ kind: 'nets', captured: 'p', free: false, gave: null }, 'participle')).toBe('winning a pawn');
    expect(afterCaptureSan({ kind: 'nets', captured: 'knight', free: false, gave: null }, 'verb')).toBe('wins a knight');
  });
  it('a take-back that costs the capturer says what it gave: the exchange is never a whole rook', () => {
    expect(afterCaptureSan({ kind: 'nets', captured: 'r', free: false, gave: 'n' }, 'verb')).toBe('wins a rook for a knight');
    expect(afterCaptureSan({ kind: 'nets', captured: 'q', free: false, gave: 'bishop' }, 'participle')).toBe('winning a queen for a bishop');
  });
  it('a take-back completes the trade, or names the capture that keeps it going', () => {
    expect(afterCaptureSan({ kind: 'take-back', next: null }, 'verb')).toBe('completes the trade');
    expect(afterCaptureSan({ kind: 'take-back', next: '…Ncxd4' }, 'participle')).toBe('keeping the trade going, with …Ncxd4 next');
    expect(afterCaptureSan({ kind: 'take-back-gain', got: 'r', gave: 'n', seat: 'you' }, 'verb')).toBe('gets you a rook for the knight they took');
    expect(afterCaptureSan({ kind: 'take-back-gain', got: 'r', gave: 'n', seat: 'they' }, 'verb')).toBe('gets them a rook for the knight you took');
  });
  it('a trade and a piece given up', () => {
    expect(afterCaptureSan({ kind: 'trade', piece: 'n', captured: 'n' }, 'verb')).toBe('trades knights');
    expect(afterCaptureSan({ kind: 'trade', piece: 'b', captured: 'n' }, 'participle')).toBe('trading the bishop for the knight');
    expect(afterCaptureSan({ kind: 'gives-up', piece: 'r', captured: 'n' }, 'verb')).toBe('gives up the rook for the knight');
  });
  it('rotation forms say the same outcome in other words, from the seat', () => {
    expect(afterCaptureSanForms({ kind: 'nets', captured: 'p', free: true, gave: null }, 'you')).toEqual(['wins a pawn, and nothing can take back', 'costs them a pawn — nothing can take back', 'is a free pawn: nothing can take back']);
    expect(afterCaptureSanForms({ kind: 'nets', captured: 'p', free: true, gave: null }, 'they')[1]).toBe('costs you a pawn — nothing can take back');
    expect(afterCaptureSanForms({ kind: 'take-back', next: null }, 'you')).toEqual(['completes the trade']);
  });
});

describe('in piece words, with no SAN', () => {
  it('names both pieces, and "theirs" when they are the same', () => {
    expect(captureInWords({ piece: 'q', captured: 'q', square: 'd8' }, 'you')).toBe('your queen takes theirs on d8');
    expect(captureInWords({ piece: 'r', captured: 'n', square: 'h2' }, 'they')).toBe('their rook takes your knight on h2');
    expect(captureInWords({ piece: 'b', captured: 'p', square: 'c5' }, null)).toBe('the bishop takes the pawn on c5');
  });
  it('a letter or a name is a piece; anything else is "piece"', () => {
    expect(capturePieceName('n')).toBe('knight');
    expect(capturePieceName('Bishop')).toBe('bishop');
    expect(capturePieceName('constructor')).toBe('piece');
    expect(capturePieceName(null)).toBe('piece');
  });
});
