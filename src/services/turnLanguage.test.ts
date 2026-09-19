/**
 * THE TURN'S LANGUAGE MUST REACH THE GROUNDED LANES.
 *
 * 🔒 MEASURED ON PROD, 2026-09-19. A Thai student asked "ตาต่อไปควรเดินอะไรดี"
 * and got back "The best move is Nc3. It develops into the game, fighting for
 * the center on d5 and e4." — correct, grounded, well-written, and unreadable
 * to them. Greek and Hebrew the same.
 *
 * The cause was not the detector and not the prompt. `coachService` computes
 * the reply language correctly and puts it in the system prompt — but the
 * grounded lanes answer BEFORE any model call, voicing their computed facts
 * through `voiceFacts`. And `voiceFacts` had NO caller passing
 * `targetLanguage` anywhere in the app, so all 105 of those lanes fell back to
 * re-detecting the language from `studentMessage` — which `coachService` has
 * already translated to English. The language was computed once, correctly,
 * and then thrown away by the one path that answers most questions.
 *
 * These are source + wire gates rather than a behavioural test of a
 * 2,900-line function: what broke was a value not being PASSED, so that is
 * what is asserted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('every grounded lane speaks the turn language', () => {
  it('no lane inside getCoachChatResponse calls voiceFacts directly', () => {
    // The turn-bound `voice()` helper is the only door. A bare call is a lane
    // that will answer a Thai question in English, and there are a hundred
    // places to forget — so it is scanned, not remembered.
    const src = readFileSync('src/services/coachApi.ts', 'utf8').split('\n');
    const start = src.findIndex((l) => l.startsWith('export async function getCoachChatResponse'));
    expect(start).toBeGreaterThan(0);
    const end = src.findIndex((l, i) => i > start && /^(?:export )?(?:async )?function \w+/.test(l));
    expect(end).toBeGreaterThan(start);

    const offenders: string[] = [];
    for (let i = start; i < end; i++) {
      const line = src[i];
      const code = line.trim();
      // Blame by STATEMENT, never by proximity: three comments in this file
      // legitimately describe the G0 contract by naming voiceFacts, and the
      // helper's own two-line body is the one sanctioned call.
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) continue;
      if (code.startsWith('voiceFacts(facts, { targetLanguage: studentLanguage')) continue;
      if (/(?:^|[^.\w])voiceFacts\s*\(/.test(line)) offenders.push(`${i + 1}: ${code.slice(0, 90)}`);
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('the helper defaults the language and still lets one call override it', () => {
    // The spread order is the whole contract: the turn's language is the
    // DEFAULT, an explicit per-call target still wins.
    const src = readFileSync('src/services/coachApi.ts', 'utf8');
    expect(src).toContain('voiceFacts(facts, { targetLanguage: studentLanguage, ...o })');
  });
});
