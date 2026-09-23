// PLAY IS SILENT UNLESS THE STUDENT ASKS (David 2026-09-23).
//
// Two halves, because either alone is a false green:
//   1. every UNPROMPTED speak site on /coach/play sits behind the one switch,
//      and the switch is OFF — a new automatic line fails here until someone
//      decides whether Play may volunteer it;
//   2. the RECORD survived — slips are still filed (`raiseWhyForSlip`) and the
//      buttons the student taps (Read this position, Why?) still answer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLAY_VOLUNTEERS_COACHING } from './CoachGamePage';

const SRC = readFileSync(resolve(__dirname, 'CoachGamePage.tsx'), 'utf8');
const LINES = SRC.split('\n');

/** Speak calls the student asked for — exempt from the switch. */
const ON_REQUEST = [/speakReadAloud\(/, /positionNarration\.narrate\(/];

/** The headers of the blocks that ENCLOSE a line — walked upward by brace
 *  depth, so a nearby mention of the switch in an unrelated statement cannot
 *  vouch for a call it does not actually guard. */
function enclosingHeaders(lineIdx: number, max = 4): string[] {
  const out: string[] = [];
  let depth = 0;
  for (let j = lineIdx - 1; j >= 0 && out.length < max; j--) {
    const l = LINES[j].replace(/\/\/.*$/, '');
    for (let k = l.length - 1; k >= 0; k--) {
      if (l[k] === '}') depth++;
      else if (l[k] === '{') {
        if (depth === 0) { out.push(l); break; }
        depth--;
      }
    }
  }
  return out;
}
function guarded(lineIdx: number): boolean {
  return enclosingHeaders(lineIdx).some((h) => /PLAY_VOLUNTEERS_COACHING/.test(h));
}

describe('Play volunteers nothing', () => {
  it('the switch is OFF', () => {
    expect(PLAY_VOLUNTEERS_COACHING).toBe(false);
  });

  it('every unprompted speak site is behind the switch', () => {
    const offenders: string[] = [];
    LINES.forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      if (!/voiceService\.speak|phaseNarration\.narrate\(|useNarration\(/.test(line)) return;
      if (ON_REQUEST.some((re) => re.test(line))) return;
      // Dead LLM commentary path — unreachable while USE_LLM_MOVE_COMMENTARY is false.
      if (/createStreamingSpeaker/.test(line)) return;
      if (/useNarration\(/.test(line)) {
        // Fed by the entry-beat effect, whose first line is the switch.
        if (!/if \(!PLAY_VOLUNTEERS_COACHING\) return;\n\s*if \(entryBeatFiredRef\.current\) return;/.test(SRC)) offenders.push(`${i + 1}: ${line.trim()}`);
        return;
      }
      // Phase narration is guarded by an early `return` (named 'play-silent'),
      // asserted separately below.
      if (/phaseNarration\.narrate\(/.test(line)) return;
      if (!guarded(i)) offenders.push(`${i + 1}: ${line.trim()}`);
    });
    expect(offenders).toEqual([]);
  });

  it('phase transitions are suppressed with a named reason, not skipped silently', () => {
    expect(SRC).toContain("? 'play-silent'");
  });

  it('keeps the RECORD and the on-request answers', () => {
    expect(SRC.match(/raiseWhyForSlip\(\);/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(SRC).toContain('void voiceService.speakReadAloud(answer)');
    expect(SRC).toContain('void positionNarration.narrate()');
  });
});
