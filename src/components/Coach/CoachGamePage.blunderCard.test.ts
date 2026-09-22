// THE BLUNDER CARD IS OFF, AND THE RECORD SURVIVED IT (David 2026-09-22).
//
// Two halves, because either alone is a false green:
//   1. the switch is OFF — the modal "Blunder Detected" overlay may not pause
//      the board on Play (it re-raised on every move after a hung piece);
//   2. turning the UI off did NOT take the record with it — the blunder branch
//      still speaks the explanation and still files the slip (the 2026-08-05
//      Learn lesson: the capture was a side effect of the card, and removing
//      the card silently starved My Mistakes and the weakness spine).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BLUNDER_CARD_ENABLED } from './CoachGamePage';

const SRC = readFileSync(resolve(__dirname, 'CoachGamePage.tsx'), 'utf8');

describe('the Play blunder card', () => {
  it('is switched OFF', () => {
    expect(BLUNDER_CARD_ENABLED).toBe(false);
  });

  it('only ever enters blunder_pause behind the switch', () => {
    const entries = SRC.match(/status: [^\n]*'blunder_pause'/g) ?? [];
    expect(entries.length, 'exactly one place sets the pause status').toBe(1);
    expect(entries[0]).toContain('BLUNDER_CARD_ENABLED ?');
  });

  it('keeps the RECORD and the VOICE in the blunder branch when the card is off', () => {
    const start = SRC.indexOf('// BLUNDER INTERCEPTION: pause game and explain');
    const end = SRC.indexOf('// Non-blunder: sync the move and let the coach-move useEffect respond.');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const branch = SRC.slice(start, end);
    // The record: the same classification still raises the "why did you play
    // that?" capture, unconditionally — not inside the switch.
    const raise = branch.indexOf('raiseWhyForSlip();');
    expect(raise).toBeGreaterThan(0);
    expect(branch.slice(0, raise)).not.toMatch(/if \(BLUNDER_CARD_ENABLED\) \{[^}]*$/);
    // The voice + transcript: the explanation is still spoken and mirrored.
    expect(branch).toContain('gameChatRef.current?.injectAssistantMessage(explanation)');
    expect(branch).toContain('void voiceService.speak(explanation)');
  });
});
