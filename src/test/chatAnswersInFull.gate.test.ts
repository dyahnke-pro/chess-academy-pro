import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { BOARD_COMPUTERS } from '../services/boardComputers';
import { placeFact } from '../services/coachFact';
import { QUESTION_IDEAS } from '../coach/questionThought';

/** CHAT ANSWERS IN FULL, WHOEVER ASKS (David 2026-11-17: "I don't want chat
 *  limited for beginners as far as what it can say/identify … if they ask a
 *  complex question about a deep line, coach should reply with the
 *  appropriate answer"). A question was asked, so it is answered: no record
 *  fades it (green → short or silent), no register shortens it, and a forced
 *  mate is stated, never posed as "can you see it?" (that test is Learn's,
 *  where nobody asked). The beginner register touches chat in one place only:
 *  how a move is written in the bubble ("knight to f3 (Nf3)", ChatMessage). */
const CHAT_PATH = [
  'src/coach/dispatchCoachTurn.ts', 'src/coach/boardTurnAnswer.ts', 'src/coach/questionThought.ts',
  'src/services/coachApi.ts', 'src/services/groundedAnswer.ts', 'src/services/movePurposeEngine.ts',
  ...readdirSync('src/coach').filter((f) => /^chatTurn.*\.ts$/.test(f) && !f.includes('.test.')).map((f) => `src/coach/${f}`),
];
const LIMITS = /\b(?:asksToSee|calculationProven|loadFadeLevels|loadProvenTags|provenTagSet|fadeText|fadeLevelOf|beginnerRegister|loadBeginnerRegister|useBeginnerRegister|holdState|capabilityProven)\b/;
const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');

describe('chat answers in full', () => {
  it('no chat module reads the record or the register to limit an answer', () => {
    const offenders = CHAT_PATH.filter((p) => LIMITS.test(code(p)));
    expect(offenders).toEqual([]);
  });
  it('the chat thought composes with no record', () => {
    expect(code('src/services/moveThoughtFacts.ts')).toMatch(/composeThought\([^;]*'chat', voice, NOT_LED, null\)/);
  });
  // EVERY CHAT BOX, EVERY COMPUTER (David 2026-11-17: "All chat surfaces!"):
  // every chat box goes through the one door to the one thought, so a computer
  // marked as reaching chat through the thought must land in a group some
  // question asks — or chat could never say it (the trap a move sets was
  // marked wired and no question asked for it).
  it('every computer wired to chat through the thought lands in a group a question asks', () => {
    const asked = new Set(Object.values(QUESTION_IDEAS).flatMap((q) => q.groups));
    const unasked: string[] = [];
    for (const [id, spec] of Object.entries(BOARD_COMPUTERS)) {
      const chat = spec.surfaces.chat as { wired?: string };
      if (chat.wired !== 'services/moveThoughtFacts.ts') continue;
      for (const seat of ['student', 'opponent'] as const) {
        const { group } = placeFact(spec.kind, seat);
        if (!asked.has(group)) unasked.push(`${id} (${seat}) → ${group}`);
      }
    }
    expect(unasked).toEqual([]);
  });
});
