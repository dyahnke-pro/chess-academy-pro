/**
 * THE DRILL VOCABULARY MUST BE THE CORPUS'S VOCABULARY.
 *
 * A weakness is drilled by handing puzzle-theme ids to `puzzles.json`. When the
 * code names a theme the corpus does not carry, the query matches nothing and
 * the student's drill is EMPTY — silently, with every other test green. That is
 * the `discovery` / `discovered_attack` failure from the top of CLAUDE.md in a
 * new place: the computer TEACHES the motif and cannot DRILL it, because two
 * vocabularies for one idea never reconcile.
 *
 * Measured 2026-09-19, before the fix: `zwischenzug` and `overloadedPiece` named
 * themes carried by ZERO of the 15,000 puzzles. The corpus calls them
 * `intermezzo` (211) and files overloading under `capturingDefender` (133).
 *
 * This gate RE-DERIVES the vocabulary from the corpus rather than restating it,
 * so it cannot drift: a themes list is legal only if the puzzles back it.
 */
import { describe, it, expect } from 'vitest';
import puzzles from '../data/puzzles.json';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';
import { TACTIC_TO_PATTERN } from './tacticVocabulary';
import { themesForTactic } from './weaknessSpine';
import type { TacticType } from '../types';

/** Every theme any puzzle actually carries — derived, never hand-listed. */
const CORPUS_THEMES: ReadonlySet<string> = new Set(
  (puzzles as ReadonlyArray<{ themes?: string[] }>).flatMap((p) => p.themes ?? []),
);

/** The runtime list of tactic types, taken from an exhaustive Record over the
 *  union so a new member appears here without anyone maintaining a second list. */
const ALL_TACTICS = Object.keys(TACTIC_TO_PATTERN) as TacticType[];

describe('drill vocabulary is grounded in the puzzle corpus', () => {
  it('the corpus is loaded (the gate cannot pass vacuously)', () => {
    expect(puzzles.length).toBeGreaterThan(1000);
    expect(CORPUS_THEMES.size).toBeGreaterThan(50);
  });

  it('every theme `themesForTactic` names is carried by at least one puzzle', () => {
    const dead: string[] = [];
    for (const t of ALL_TACTICS) {
      for (const theme of themesForTactic(t)) {
        if (!CORPUS_THEMES.has(theme)) dead.push(`${t} -> '${theme}'`);
      }
    }
    expect(dead, `themes no puzzle carries:\n  ${dead.join('\n  ')}`).toEqual([]);
  });

  it('every tactic type drills to a NON-EMPTY set of puzzles', () => {
    const severed: string[] = [];
    for (const t of ALL_TACTICS) {
      const themes = themesForTactic(t);
      if (themes.length === 0) continue; // deliberately undrilled is a decision, not a break
      const hits = (puzzles as ReadonlyArray<{ themes?: string[] }>).filter((p) =>
        (p.themes ?? []).some((x) => themes.includes(x)),
      ).length;
      if (hits === 0) severed.push(`${t} -> [${themes.join(', ')}] matches 0 puzzles`);
    }
    expect(severed, `tactics that drill to nothing:\n  ${severed.join('\n  ')}`).toEqual([]);
  });

  it('every `puzzleThemes` a misconception tag declares is carried by the corpus', () => {
    const dead: string[] = [];
    for (const tag of MISCONCEPTION_TAGS) {
      for (const theme of tag.drill.puzzleThemes ?? []) {
        if (!CORPUS_THEMES.has(theme)) dead.push(`${tag.id} -> '${theme}'`);
      }
    }
    expect(dead, `declared themes no puzzle carries:\n  ${dead.join('\n  ')}`).toEqual([]);
  });
});
