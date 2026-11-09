/**
 * A FACT THAT EXPLAINS THE ONE BEFORE IT (WO-STORY-MATRIX-01 P1-6d). Review's
 * tactic rule — "Remember — a fork hits two targets at once…" — is its own
 * fact, said right after the verdict that named the fork. It spoke only
 * because Review's facts were strings that opened with a `[rule]` tag, which
 * hid the "Remember —" opening from the package's check; with the tag gone
 * (the facts are the one fact) the rule was dropped on every ply. The rule
 * the check states is the one kept here: a fact that opens by explaining the
 * one before it speaks after that fact, and never alone.
 */
import { describe, it, expect } from 'vitest';
import { buildVoicePackage, type VoiceFact } from './voicePackage';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const VERDICT = 'That move was a blunder — the stronger move set up a fork.';
const RULE = 'Remember — a fork hits two targets at once, and only one can escape, so the other falls.';

const fact = (text: string): VoiceFact => ({ kind: 'computed', text, fen: FEN });

describe('a fact that explains the one before it', () => {
  it('speaks right after the fact it explains (Review\'s "Remember —" after the verdict)', () => {
    expect(buildVoicePackage([fact(VERDICT), fact(RULE)]).spoken).toBe(`${VERDICT} ${RULE}`);
  });
  it('is never said alone', () => {
    expect(buildVoicePackage([fact(RULE)]).spoken).toBe('');
  });
  it('goes when the fact before it was dropped as already said', () => {
    expect(buildVoicePackage([fact(VERDICT), fact(RULE)], VERDICT).spoken).toBe('');
  });
});
