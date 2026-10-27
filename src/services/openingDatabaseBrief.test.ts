// "Tell me more about the a3 sicillian" (David 2026-10-27) — answered from the
// databases instead of "There's no answer for that one yet". The masters' games
// are injected at their one boundary; the opening DB and the identity file are
// the real ones the app ships.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { openingDatabaseBrief } from './openingDatabaseBrief';
import { setOpeningIdentity } from './openingIdentity';
import { isWebSearchAsk, WEB_SEARCH_ANSWER, isAppHelpQuestion, openingIdentityQuery, buildQuestionGrounding } from '../coach/questionIntents';
import type { LichessExplorerResult, LichessExplorerMove } from '../types';

setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')) as Parameters<typeof setOpeningIdentity>[0]);

const mv = (san: string, white: number, draws: number, black: number): LichessExplorerMove =>
  ({ uci: '', san, averageRating: 2400, white, draws, black, game: null });

// The masters after 1.e4 c5 2.a3, the 2026-10-27 shape.
const A3_MASTERS: LichessExplorerResult = {
  white: 132, draws: 262, black: 212, topGames: [], opening: null,
  moves: [mv('g6', 60, 140, 106), mv('Nc6', 30, 50, 41), mv('e6', 25, 50, 35), mv('Nf6', 5, 8, 7)],
};

describe('openingDatabaseBrief — what an opening is, from the databases', () => {
  it('the Mengarini: its moves, its move\'s job, who scores and what the masters play', async () => {
    const b = await openingDatabaseBrief('Sicilian Defense: Mengarini Variation', async () => A3_MASTERS);
    expect(b?.moves).toEqual(['e4', 'c5', 'a3']);
    expect(b?.mastersRead).toBe(true);
    const text = b?.text ?? '';
    expect(text.startsWith('The Sicilian Defense: Mengarini Variation is e4 c5 a3.')).toBe(true);
    expect(text).toMatch(/They play a3 — it prepares b4: their pawn on a3 covers b4, and masters push b4 in \d+% of their games from here\./);
    expect(text).toContain('In 606 master games from here, your side wins 35% and theirs 22%; the rest are drawn.');
    // …Nf6 (3%) is under the bar the lesson's fork tiles use.
    expect(text).toContain('The masters answer …g6 in 50%, …Nc6 in 20% and …e6 in 18% of their games.');
  });

  it('offline: says what the bundled data knows, never invents the rest', async () => {
    const b = await openingDatabaseBrief('Sicilian Defense: Mengarini Variation', async () => { throw new Error('offline'); });
    expect(b?.mastersRead).toBe(false);
    expect(b?.text).not.toMatch(/master games from here|masters answer/);
    expect(b?.text.startsWith('The Sicilian Defense: Mengarini Variation is e4 c5 a3.')).toBe(true);
  });

  it('negative control: a name not in the opening database has no brief', async () => {
    expect(await openingDatabaseBrief('Intercontinental Ballistic Missile Gambit', async () => A3_MASTERS)).toBeNull();
  });
});

describe('the opening the question names reaches the lane (his exact words)', () => {
  it.each([
    ['Tell me more about the a3 sicillian', 'a3 sicillian'],
    ['tell me a bit about the Mengarini', 'Mengarini'],
    ['can you tell me something about the Bowdler Attack?', 'Bowdler Attack'],
    ['what do you know about the Alapin?', 'Alapin'],
    ['what can you tell me about the Najdorf', 'Najdorf'],
    ['tell me about the Ponziani', 'Ponziani'],
  ])('%s → %s', (ask, name) => {
    expect(openingIdentityQuery(ask)).toBe(name);
  });
  it.each([
    ['Tell me more about the a3 sicillian', 'a3 sicillian'],
    ['what do you know about the Alapin?', 'Alapin'],
    ['tell me a bit about the Mengarini', 'Mengarini'],
  ])('through the real question read, filler and all: %s', (ask, name) => {
    // The grounding the lanes see — the unit above passed while prod failed,
    // because the read strips "tell me" and "you know" before extracting.
    expect(buildQuestionGrounding(ask, {}).openingIdentityName).toBe(name);
  });
  it.each(['tell me more about this position', 'tell me more about that', 'tell me more about my move'])('not an opening: %s', (ask) => {
    expect(openingIdentityQuery(ask)).toBeNull();
  });
});

describe('a web-search ask is answered honestly', () => {
  it('reaches the app-help lane, which answers it', () => {
    expect(isAppHelpQuestion('Can you Google it?')).toBe(true);
  });
  it.each(['Can you Google it?', 'google it', 'search the web for that', 'can you look it up online'])('%s', (ask) => {
    expect(isWebSearchAsk(ask)).toBe(true);
  });
  it.each(['Tell me more about the a3 sicillian', 'what is the best move here', 'search for a tactic'])('not: %s', (ask) => {
    expect(isWebSearchAsk(ask)).toBe(false);
  });
  it('says where answers come from, never "I"', () => {
    expect(WEB_SEARCH_ANSWER).toMatch(/opening database/);
    expect(WEB_SEARCH_ANSWER).not.toMatch(/\bI\b/);
  });
});
