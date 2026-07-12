
// ── stripInjectedBlocks (David 2026-07-11: "I played f4" was hijacked by the
// training vertical + the language was misread — both from surface-injected
// instruction blocks reaching the detectors) ────────────────────────────────
import { stripInjectedBlocks } from './coachService';

describe('stripInjectedBlocks', () => {
  it('strips the STEP-BY-STEP narration block, keeping the student words', () => {
    const ask = 'I played f4.\n\n[STEP-BY-STEP NARRATION — the engine already played the coach\'s reply e5; NARRATE it. Draw [BOARD: arrow:e7-e5:green].]';
    expect(stripInjectedBlocks(ask)).toBe('I played f4.');
  });
  it('leaves plain questions untouched', () => {
    expect(stripInjectedBlocks('Why is Nf3 better than Qf3?')).toBe('Why is Nf3 better than Qf3?');
    expect(stripInjectedBlocks('what about [this] idea')).toBe('what about [this] idea');
  });
});
