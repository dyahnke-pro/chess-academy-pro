import { describe, expect, it } from 'vitest';
import { readQuestion, type AskMoment } from './readQuestion';
import { REAL_QUESTIONS } from './realQuestions.fixture';
import { fuzzyMatchOpening } from '../../services/openingFuzzyMatcher';

const BOARD_SCREENS = new Set(['play', 'learn', 'puzzle', 'review', 'opening']);
const nameOpening = (t: string) => {
  const c = fuzzyMatchOpening(t).candidates[0];
  return c ? { name: c.canonicalName, score: c.score } : null;
};
// The fixture logged the SCREEN, not the board or the chat history; assume a
// board on a board screen and a prior coach line anywhere but Home.
const momentFor = (screen: string): AskMoment => ({
  screen: screen as AskMoment['screen'],
  hasBoard: BOARD_SCREENS.has(screen),
  lastCoachLine: screen === 'home' ? undefined : 'earlier coach line',
});
const NON_LATIN = /[฀-๿]/;

describe('readQuestion against the 258 real questions (shadow score)', () => {
  it('reports kind accuracy and never guesses a command from a stray word', () => {
    const scored = REAL_QUESTIONS.filter((r) => !NON_LATIN.test(r.q));
    const misses: string[] = [];
    let right = 0;
    let askedBack = 0;
    for (const r of scored) {
      const got = readQuestion(r.q, momentFor(r.screen), { nameOpening });
      if (got.kind === r.kind) right += 1;
      else {
        if (got.kind === 'unclear') askedBack += 1;
        misses.push(`${r.kind.padEnd(9)} → ${got.kind.padEnd(9)} [${r.screen}] ${r.q.slice(0, 80)}`);
      }
    }
    console.log(`\nKIND ACCURACY ${right}/${scored.length} (${Math.round((100 * right) / scored.length)}%), ` +
      `${askedBack} misses ask back, ${REAL_QUESTIONS.length - scored.length} untranslated skipped\n` + misses.join('\n'));
    // The bugs that sent "Dammit" and "Let's do it" into an opening picker.
    for (const q of ['Dammit', "Let's do it", 'Books']) {
      expect(readQuestion(q, momentFor('play'), { nameOpening }).kind).not.toBe('command');
    }
    expect(right).toBeGreaterThan(0);
  }, 60_000);
});
