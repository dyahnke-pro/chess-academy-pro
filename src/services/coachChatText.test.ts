/**
 * THE TRANSCRIPT'S TRANSLATION DOOR.
 *
 * 🔒 A Thai student got the lesson, HEARD it in Thai, and READ "Sure — let's
 * walk through the Italian Game." in English (prod, 2026-09-19). Voice had a
 * chokepoint and chat did not, so 22 of the coach's own English strings — from
 * 85 push sites — could never be translated by anything.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { COACH_PHRASES, phraseFor, needsLocalizing } from './coachChatText';
import { codeForLanguageName, LANG_NAME, type LangCode } from '../utils/detectLanguage';

describe('the phrase table answers the strings the coach actually writes', () => {
  // These are the EXACT literals CoachTeachPage ships. A table entry that does
  // not match the real string is a table that silently never fires, which is
  // the failure mode a "does the table have rows" test would miss.
  const REAL: ReadonlyArray<readonly [string, string]> = [
    ["Sure — let's walk through the Italian Game.", 'Italian Game'],
    ["Ready — let's walk through the Ruy Lopez.", 'Ruy Lopez'],
    ["Putting together the Italian Game — this takes about a minute. The first time only; after this it'll be instant.", 'the Italian Game'],
    ["I couldn't build the Caro-Kann walkthrough this time. Try again or pick a different opening.", 'Caro-Kann'],
    ['Walkthrough is paused. Tap Resume to continue, or ask another question.', ''],
    ['Hit a snag — say it again?', ''],
  ];

  for (const [english, variable] of REAL) {
    it(`matches and fills: "${english.slice(0, 44)}…"`, () => {
      const thai = phraseFor(english, 'th');
      expect(thai, 'the table must match the literal the app ships').toBeTruthy();
      expect(thai).not.toBe(english);
      // the variable survives into the translation, not just the frame
      if (variable) expect(thai).toContain(variable);
      // and nothing is left holding an unfilled placeholder
      expect(thai).not.toMatch(/\$\d/);
    });
  }

  it('a string the table does not carry returns null, for the model to take', () => {
    expect(phraseFor('Some brand new sentence nobody has translated.', 'th')).toBeNull();
  });

  it('a known string in an unseeded language returns null rather than English', () => {
    // Returning the ENGLISH would look like a hit and stop the model fallback —
    // the student would be stuck reading English with nothing left to try.
    expect(phraseFor('Hit a snag — say it again?', 'bo')).toBeNull();
  });
});

describe('what may and may not be translated', () => {
  it('the app\'s own English is localizable', () => {
    expect(needsLocalizing("Sure — let's walk through the Italian Game.")).toBe(true);
  });

  it('a reply ALREADY in the student\'s language is left alone', () => {
    // Re-translating the brain's Thai answer is how you end up in a third
    // language — the bug that answered a Vietnamese question in French.
    expect(needsLocalizing('หมากที่ดีที่สุดคือ exd5 ครับ')).toBe(false);
    expect(needsLocalizing('Η καλύτερη κίνηση είναι Nf3.')).toBe(false);
  });

  it('empty content is never sent anywhere', () => {
    expect(needsLocalizing('   ')).toBe(false);
  });
});

describe('the table cannot drift from the language vocabulary', () => {
  it('every language a phrase claims is a real, nameable language', () => {
    for (const phrase of COACH_PHRASES) {
      for (const code of Object.keys(phrase.say) as LangCode[]) {
        expect(LANG_NAME[code], `${phrase.key} names unknown language "${code}"`).toBeTruthy();
      }
    }
  });

  it('the name→code lookup is the exact inverse of code→name', () => {
    for (const [code, name] of Object.entries(LANG_NAME) as Array<[LangCode, string]>) {
      if (code === 'en') continue;
      expect(codeForLanguageName(name), name).toBe(code);
    }
    expect(codeForLanguageName('English')).toBeNull();
    expect(codeForLanguageName('Klingon')).toBeNull();
  });

  it('every phrase covers the same languages, so one is never half-translated', () => {
    // A phrase seeded in fewer languages than its siblings means a student
    // reads a mix: the ack in Thai, the error in English. Same capability
    // everywhere, or it is not a table.
    const [first, ...rest] = COACH_PHRASES;
    const expected = new Set(Object.keys(first.say));
    for (const phrase of rest) {
      expect(new Set(Object.keys(phrase.say)), `${phrase.key} covers a different language set`).toEqual(expected);
    }
  });
});

describe('the door is actually wired at the render', () => {
  it('ChatMessage localizes, and no longer renders the raw content', () => {
    // A door nobody walks through is not a door. `ChatMessage` is the one
    // component every coach bubble renders through (its own docstring has said
    // so since the 2026-06-15 markup leak), so this one call site covers all
    // six transcript surfaces and the seventh someone adds next month.
    const src = readFileSync('src/components/Coach/ChatMessage.tsx', 'utf8');
    expect(src).toContain('useLocalizedContent(message.content, message.role');
    expect(src, 'the bubble must render the localized text').toContain('renderFormattedText(shownContent)');
    expect(src, 'the raw content must no longer reach the bubble')
      .not.toContain('renderFormattedText(message.content)');
  });

  it('no coach surface hand-rolls a bubble that bypasses the door', () => {
    // The first cut of this door sat in CoachTeachPage's own map and missed
    // five surfaces. The fix is a census, not a list: any component rendering
    // a message's `.content` straight into JSX is a surface the door cannot
    // reach. Kid surfaces are EXCLUDED by contract, not by oversight — a kid
    // LLM call must route through `getKidLlmResponse`, and this door's model
    // fallback calls `voiceFacts` directly, so wiring it there would break the
    // kid personality wall. That is a decision for David, recorded here.
    const files = globSync('src/components/**/*.tsx', {
      ignore: ['**/*.test.tsx', 'src/components/Kid/**'],
    });
    // Blame by STATEMENT: `${m.content}` inside a template literal builds a
    // PROMPT, not a bubble, and `content={msg.content}` is the door being
    // called. Neither is a raw render, so neither may trip this.
    const raw = /(?<![$=])\{\s*(?:msg|m|message)\.content\s*\}/;
    const offenders = files.filter((f) => {
      if (f.endsWith('Coach/ChatMessage.tsx')) return false; // the door itself
      return raw.test(readFileSync(f, 'utf8'));
    });
    expect(offenders, 'these render coach text with no translation door').toEqual([]);
  });
});
