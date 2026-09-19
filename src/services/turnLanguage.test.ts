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
  // 🔴 THE FIRST VERSION OF THIS GATE HAD THE SAME BLIND SPOT AS THE FIRST
  // VERSION OF THE FIX (found by re-running the prod audit, 2026-09-19). It
  // scanned only `getCoachChatResponse`'s own body — so it was green while
  // `serveGroundedPositionDefault`, `signalReroute` and `computeLiveBoardVerdict`,
  // which that function CALLS and which voice their own facts, still answered a
  // Thai question in English. A lane reached through a helper is still a lane.
  // The scan is now the whole file: every call either carries the turn language
  // or goes through the turn-bound helper.
  it('no voiceFacts call anywhere in coachApi is left to guess the language', () => {
    const src = readFileSync('src/services/coachApi.ts', 'utf8').split('\n');
    const offenders: string[] = [];
    for (let i = 0; i < src.length; i++) {
      const line = src[i];
      const code = line.trim();
      // Blame by STATEMENT, never by proximity: several comments legitimately
      // describe the G0 contract by naming voiceFacts.
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) continue;
      if (code.startsWith('export async function voiceFacts')) continue;
      if (code.includes('const voice: typeof voiceFacts')) continue;
      if (!/(?:^|[^.\w])voiceFacts\s*\(/.test(line)) continue;
      // The call may span lines — look at it and the few that follow.
      const stmt = src.slice(i, i + 6).join(' ');
      if (stmt.includes('targetLanguage')) continue;
      offenders.push(`${i + 1}: ${code.slice(0, 90)}`);
    }
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('the helper defaults the language and still lets one call override it', () => {
    // The spread order is the whole contract: the turn's language is the
    // DEFAULT, an explicit per-call target still wins.
    const src = readFileSync('src/services/coachApi.ts', 'utf8');
    expect(src).toContain('voiceFacts(facts, { targetLanguage: studentLanguage, ...o })');
  });

  it('the helpers that voice their own facts take the turn language', () => {
    // Named explicitly, because these three are the ones the first gate missed.
    const src = readFileSync('src/services/coachApi.ts', 'utf8');
    for (const fn of ['signalReroute', 'serveGroundedPositionDefault', 'computeLiveBoardVerdict']) {
      const at = src.indexOf(`function ${fn}(`);
      expect(at, fn).toBeGreaterThan(0);
      const sig = src.slice(at, src.indexOf('): Promise', at));
      expect(sig, `${fn} must accept the turn language`).toContain('turnLanguage');
    }
  });
});
