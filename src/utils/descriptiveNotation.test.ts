import { describe, it, expect } from 'vitest';
import { scrubDescriptiveNotationForSpeech } from './descriptiveNotation';
import { detectSanitizerLeak } from '../services/voiceService';

describe('scrubDescriptiveNotationForSpeech', () => {
  it('elides a run of descriptive moves', () => {
    const input = 'The proper continuation would have been P-Kt5, B-K3, Q-B2 and P-Q4, capturing the file.';
    const out = scrubDescriptiveNotationForSpeech(input);
    expect(out).toBe('The proper continuation would have been a specific line, capturing the file.');
  });

  it('elides diagonal and square shorthand', () => {
    const input = 'The Bishop is needed on the diagonal QB1-KR6, to prevent a Knight from settling at KB5.';
    const out = scrubDescriptiveNotationForSpeech(input);
    expect(out).toContain('a specific line');
    expect(out).not.toMatch(/QB1|KR6|KB5/);
  });

  it('handles captures and castling', () => {
    expect(scrubDescriptiveNotationForSpeech('then PxP and O-O').toLowerCase()).not.toMatch(/pxp|o-o/);
  });

  it('leaves ordinary prose and proper names untouched', () => {
    const prose = 'the moves of the Janowski-Lasker game in Paris, 1912, were instructive.';
    expect(scrubDescriptiveNotationForSpeech(prose)).toBe(prose);
  });

  it('result no longer trips the TTS sanitizer leak detector', () => {
    const input =
      'The proper continuation would have been P-Kt5, B-K3, Q-B2 and P-Q4. In the Ruy Lopez the Bishop is needed on the diagonal QB1-KR6 to prevent a Knight at KB5, except by P-KKt3.';
    const scrubbed = scrubDescriptiveNotationForSpeech(input);
    expect(detectSanitizerLeak(scrubbed)).toBe(false);
  });
});
