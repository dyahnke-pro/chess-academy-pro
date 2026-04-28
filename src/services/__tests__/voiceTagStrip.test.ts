/**
 * Pin the production-payload behaviour from Audit Finding 48 directly
 * against the strip regex used by GameChatPanel + voice path.
 * WO-VISIBLE-POLISH bug 2.
 *
 * The canonical regex lives in `src/coach/stripTags.ts`. This file
 * exercises the exact spoken-aloud sample reported in the audit so a
 * regression on either the regex or the call-site replace order is
 * caught immediately.
 */
import { describe, it, expect } from 'vitest';
import { stripCoachOutputTags } from '../../coach/stripTags';

describe('voiceTagStrip — Finding 48', () => {
  it('strips the exact production payload that reached Polly', () => {
    const input = 'Let me check [[ACTION:stockfish_eval {"fen":"r2qk2r/p1p1nQpp/2npB3"}]] hmm';
    expect(stripCoachOutputTags(input)).toBe('Let me check  hmm');
  });

  it('strips even when the payload contains nested ] inside a JSON array', () => {
    const input = '[[ACTION:foo {"alts":["a","b"]}]] tail';
    expect(stripCoachOutputTags(input)).toBe(' tail');
  });

  it('still strips the single-bracket regression form with JSON payload', () => {
    const input = 'pre [ACTION:play_move {"san":"Nf3"}] post';
    expect(stripCoachOutputTags(input)).toBe('pre  post');
  });
});
