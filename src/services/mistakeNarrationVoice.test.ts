import { describe, it, expect } from 'vitest';
import { sanDestinationSquare } from './mistakeNarrationVoice';

// #3 root-cause gate (David 2026-09-07): the mistake-review register is told
// "say the idea, not the notation", so a full-SAN `mustPreserve` (e.g. "Bxc3+")
// false-tripped the fidelity net on every capture/check move and discarded the
// warm line for flat computed prose. mustPreserve now carries the LANDING SQUARE,
// which natural phrasing ("the bishop took on c3") keeps.
describe('sanDestinationSquare', () => {
  it('extracts the landing square from capture + check SANs (the false-trip class)', () => {
    expect(sanDestinationSquare('Bxc3+')).toBe('c3');
    expect(sanDestinationSquare('Qxf3+')).toBe('f3');
    expect(sanDestinationSquare('Rh4+')).toBe('h4');
    expect(sanDestinationSquare('exd5')).toBe('d5');
    expect(sanDestinationSquare('Nf3')).toBe('f3');
    expect(sanDestinationSquare('Raxe1#')).toBe('e1');
  });

  it('handles promotion SANs', () => {
    expect(sanDestinationSquare('e8=Q')).toBe('e8');
    expect(sanDestinationSquare('e8=Q+')).toBe('e8');
    expect(sanDestinationSquare('bxa1=N#')).toBe('a1');
  });

  it('returns empty for castling and unparseable input (no square to preserve)', () => {
    expect(sanDestinationSquare('O-O')).toBe('');
    expect(sanDestinationSquare('O-O-O')).toBe('');
    expect(sanDestinationSquare('')).toBe('');
    expect(sanDestinationSquare(undefined)).toBe('');
  });
});
