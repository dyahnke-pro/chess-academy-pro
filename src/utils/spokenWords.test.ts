import { describe, it, expect } from 'vitest';
import { spokenWordCount } from './spokenWords';
import { sanitizeForTTS } from '../services/voiceService';

const said = (t: string): number => sanitizeForTTS(t).split(/\s+/).filter(Boolean).length;

describe('spokenWordCount — a turn is measured as the voice says it (Learn audit 2026-10-15)', () => {
  const lines = [
    'Now if they go ahead with gxf6 anyway, you take their queen on d1.',
    'After Ng4, Ne4, Qb6, your queen on b6 and your bishop on c5 form a battery.',
    'Rxd8+ wins the rook, then O-O and O-O-O are both gone.',
    'The R2b3 lift and Nbd2 both help.',
  ];
  it.each(lines)('matches the spoken word count: %s', (t) => {
    expect(spokenWordCount(t)).toBe(said(t));
  });
  it('is longer than the written count when the line carries notation', () => {
    const t = lines[1];
    expect(spokenWordCount(t)).toBeGreaterThan(t.split(/\s+/).length);
  });
});
