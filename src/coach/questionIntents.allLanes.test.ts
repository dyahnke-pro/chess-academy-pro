// THE 2026-08-13 ALL-QUESTIONS AUDIT FIXES (run allq-msrzt11w, 41/55):
// five lanes existed end-to-end (detector + assembler + dispatch) but no
// surface on the coachService path ever set their flags, and three asks were
// hijacked by neighboring lanes. These gates pin every repair.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isTacticsQuestion, isConceptQuestion, isAppHelpQuestion,
  isSettingsQuestion, isTimeTroubleQuestion, isLastGameQuestion,
  isTeachingMethodQuestion,
} from './questionIntents';

describe('lane-overlap guards', () => {
  it('navigation phrasing never fires the live-tactics lane', () => {
    expect(isTacticsQuestion('take me to tactics')).toBe(false);
    expect(isTacticsQuestion('open the tactics tab')).toBe(false);
    // …while real board-scan asks still do.
    expect(isTacticsQuestion('are there any tactics here?')).toBe(true);
  });

  it('an app-surface ask is app-help, never a glossary lookup', () => {
    expect(isConceptQuestion('what does the Tactics tab do?')).toBe(false);
    expect(isAppHelpQuestion('what does the Tactics tab do?')).toBe(true);
    // …while a real concept ask stays a concept.
    expect(isConceptQuestion("what's a fork?")).toBe(true);
  });
});

describe('the five once-unreachable lanes are threaded from coachService', () => {
  const SERVICE = readFileSync('src/coach/coachService.ts', 'utf8');
  const cases: Array<[string, string, (q: string) => boolean, string]> = [
    ['settings', 'settingsQuestion: settingsQuestionEngage', isSettingsQuestion, 'is voice on?'],
    ['app-help', 'appHelpQuestion: appHelpQuestionEngage', isAppHelpQuestion, 'what does the Tactics tab do?'],
    ['time-trouble', 'timeTroubleQuestion: timeTroubleQuestionEngage', isTimeTroubleQuestion, 'do I play too fast?'],
    ['last-game', 'lastGameQuestion: lastGameQuestionEngage', isLastGameQuestion, 'did I win my last game?'],
    ['teaching-method', 'teachingMethodQuestion: teachingMethodQuestionEngage', isTeachingMethodQuestion, 'how do you teach the Caro-Kann?'],
  ];
  for (const [name, wire, detector, q] of cases) {
    it(`${name}: detector fires and the flag is threaded`, () => {
      expect(detector(q), `detector dead for "${q}"`).toBe(true);
      expect(SERVICE.includes(wire), `${wire} not threaded`).toBe(true);
    });
  }
  it('all five also ENGAGE grounding without a board', () => {
    expect(SERVICE).toMatch(/teachingMethodQuestionEngage \|\| settingsQuestionEngage \|\| appHelpQuestionEngage \|\| timeTroubleQuestionEngage \|\| lastGameQuestionEngage/);
  });
});

describe('teach-surface hijack guards (source pins)', () => {
  const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
  it('"review my last game" + tab navigation route deterministically, before the fuzzy matcher', () => {
    expect(TEACH).toContain("'/coach/review', 'Opening your games for review.'");
    expect(TEACH).toContain("'/tactics', 'Heading to Tactics.'");
  });
  it('"how do you teach X" clears the teach-command capture', () => {
    expect(TEACH).toMatch(/how\\s\+\(\?:do\|would\|will\|does\)\\s\+\(\?:you\|the\\s\+coach\)\\s\+teach/);
  });
});
