// PLAY IS SILENT UNLESS THE STUDENT ASKS (David 2026-09-23).
//
// Three halves, because any one alone is a false green:
//   1. every UNPROMPTED speak site on /coach/play sits behind the one switch,
//      and the switch is OFF — a new automatic line fails here until someone
//      decides whether Play may volunteer it;
//   2. the producers that only fed speech Play never says are DELETED, not
//      switched off (G8.5 rule 4, WO-STORY-MATRIX-01 P1-1, David 2026-10-30):
//      the deep-link entry beat, the LLM per-move commentary and the slip
//      verdict ran every game and were never heard;
//   3. the RECORD survived — slips are still filed (`raiseWhyForSlip`) and the
//      buttons the student taps (Read this position, Why?) still answer.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PLAY_VOLUNTEERS_COACHING } from './CoachGamePage';

const SRC = readFileSync(resolve(__dirname, 'CoachGamePage.tsx'), 'utf8');
const LINES = SRC.split('\n');
/** The page with comments stripped — a deletion note may name what it deleted. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

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
      if (!/voiceService\.speak|phaseNarration\.narrate\(|useNarration\(|createStreamingSpeaker/.test(line)) return;
      if (ON_REQUEST.some((re) => re.test(line))) return;
      // Phase narration is guarded by an early `return` (named 'play-silent'),
      // asserted separately below.
      if (/phaseNarration\.narrate\(/.test(line)) return;
      if (!guarded(i)) offenders.push(`${i + 1}: ${line.trim()}`);
    });
    expect(offenders).toEqual([]);
  });

  it('the producers behind the switch that only fed unheard speech are gone', () => {
    // The page no longer imports or calls them …
    expect(CODE).not.toMatch(/playEntryNarration|buildPlayEntryNarration/);
    expect(CODE).not.toMatch(/coachMoveCommentary|generateMoveCommentary/);
    expect(CODE).not.toMatch(/assembleSlipNarration/);
    expect(CODE).not.toMatch(/USE_LLM_MOVE_COMMENTARY|BLUNDER_ALERT_ADDITION/);
    // … and they are deleted, not parked for another caller.
    for (const f of ['../../services/playEntryNarration.ts', '../../services/coachMoveCommentary.ts']) {
      expect(existsSync(resolve(__dirname, f)), f).toBe(false);
    }
    expect(readFileSync(resolve(__dirname, '../../services/groundedAnswer.ts'), 'utf8')).not.toMatch(/export function assembleSlipNarration\b/);
  });

  // The voice was silent while the TEXT channel volunteered: unasked tips in
  // the chat, a tip bubble and arrows, on by default (attack round 2026-10-07).
  it('the proactive tip hook is behind the switch too (text, bubble, arrows)', () => {
    expect(SRC).toMatch(/useCoachTips\(\{[\s\S]*?enabled: PLAY_VOLUNTEERS_COACHING && /);
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
