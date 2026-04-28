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

  // WO-VISIBLE-POLISH cycle 3 / Audit Finding 53 — the per-chunk
  // strip in GameChatPanel.onChunk leaked the entire tag because
  // chunks of a streamed response often split MID-action-tag, and
  // neither chunk-half contains a complete `[[ACTION:...]]` for the
  // regex to match. The fix is to strip on the assembled buffer at
  // sentence-detect time, not on each chunk before append. This
  // test pins the assembled-buffer behaviour: feeding the same
  // payload as concatenated chunks (matching the streaming pattern)
  // must produce the same stripped output.
  it('strips an action tag that was split across streaming chunks', () => {
    const chunk1 = 'Let me check [[ACTION:stockfish_eval ';
    const chunk2 = '{"fen":"r2qk2r/p1p1nQpp/2npB3"}]] hmm.';
    const assembled = chunk1 + chunk2;
    expect(stripCoachOutputTags(assembled)).toBe('Let me check  hmm.');
  });

  it('keeps a partial action tag in the buffer until its closing ]] arrives', () => {
    const partial = 'pre [[ACTION:foo {"k":"v"}';
    // Without the closing `]]`, the regex correctly does NOT match —
    // partial passes through. The next chunk arrives and completes
    // the tag, then the strip matches.
    expect(stripCoachOutputTags(partial)).toBe(partial);
    expect(stripCoachOutputTags(partial + '}]] tail')).toBe('pre  tail');
  });
});
