import { describe, it, expect } from 'vitest';
import { currentAskFromContent } from './coachApi';
import { notationQuestionSan } from './groundedAnswer';

// Regression for the 2026-08-28 "coach stuck on Bxe7" P0 bug.
//
// The coach spine (deepseek/anthropic provider) sends ONE composite user
// message: formatEnvelopeAsUserMessage bakes the [Memory] block (which
// includes the RECENT CONVERSATION) and [Live] block, then "[Ask]\n<question>".
// The intent scanners walked messages[last-user].content — i.e. the WHOLE blob
// — so once a prior turn's "what does Bxe7 mean?" / "Bxe7 is chess notation…"
// sat in the memory block, notationQuestionSan re-matched "Bxe7" on EVERY later
// turn and the coach repeated that decode forever, with no LLM call.
//
// currentAskFromContent strips the blob to the current [Ask] so the scanners
// see only the question the user just asked.
describe('currentAskFromContent — strips the envelope blob to the current ask', () => {
  it('returns the text after the last [Ask] marker', () => {
    const blob = [
      '[Memory]',
      '- Recent conversation:',
      '  user: what does Bxe7 mean?',
      '  coach: "Bxe7" is chess notation — it means the bishop takes on e7.',
      '',
      '[Live]',
      'FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      '',
      '[Ask]',
      'how do I attack the king?',
    ].join('\n');
    expect(currentAskFromContent(blob)).toBe('how do I attack the king?');
  });

  it('passes a raw message (no [Ask] marker) through unchanged', () => {
    expect(currentAskFromContent('what does Bxe7 mean?')).toBe('what does Bxe7 mean?');
  });

  it('THE BUG: a prior notation Q in memory must NOT make the current ask look like notation', () => {
    const blob = [
      '[Memory]',
      '- Recent conversation:',
      '  user: what does Bxe7 mean?',
      '  coach: "Bxe7" is chess notation — it means the bishop takes on e7.',
      '',
      '[Ask]',
      'how do I attack the king?',
    ].join('\n');
    // Before the fix, notationQuestionSan(blob) matched "Bxe7" from memory.
    expect(notationQuestionSan(blob)).not.toBeNull(); // (documents the trap)
    // After the fix, the scanner sees only the current ask → no SAN → no notation takeover.
    expect(notationQuestionSan(currentAskFromContent(blob))).toBeNull();
  });

  it('still decodes a REAL current notation question (Q1 keeps working)', () => {
    const blob = ['[Memory]', '', '[Ask]', 'what does Bxe7 mean?'].join('\n');
    expect(notationQuestionSan(currentAskFromContent(blob))).toBe('Bxe7');
  });
});
