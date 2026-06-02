/**
 * save_opening_to_repertoire — close the on-the-fly learning loop.
 *
 * An on-the-fly lesson (the coach teaching "how <pro> plays X" from real
 * games) is otherwise EPHEMERAL: it's cached for replay but never becomes
 * a drillable, SRS-tracked opening in the student's repertoire. This tool
 * is the opt-in "Save & drill" action — when the student says "save it" /
 * "I want to practice this" after a lesson, the brain calls it to:
 *   1. mark the opening `isRepertoire` (drillable + progress-tracked) and
 *      `isFavorite` (Training Plan rolodex), then
 *   2. seed its spaced-repetition flashcards.
 *
 * Resolves a canonical opening name (preferred) or ECO code to one
 * OpeningRecord — same resolver as `favorite_opening`. Idempotent.
 */
import type { Tool } from '../../types';
import {
  searchOpenings,
  getOpeningByEco,
  saveOpeningToRepertoire,
} from '../../../services/openingService';
import { seedFlashcardsForRepertoire } from '../../../services/dataLoader';

export const saveOpeningToRepertoireTool: Tool = {
  name: 'save_opening_to_repertoire',
  category: 'cerebrum',
  kind: 'write',
  description:
    "After teaching an opening (curated OR built on the fly), SAVE it to the student's repertoire so they can DRILL it, get spaced-repetition flashcards, and track progress. Call this when the student says 'save it' / 'add it so I can practice' / 'I want to drill this' after a lesson. Resolves a canonical opening name (preferred, e.g. \"Caro-Kann Defense\") or an ECO code to one opening, marks it repertoire + favorite, and seeds its flashcards. Idempotent — safe to call twice. Returns { id, name, saved }.",
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description:
          'Canonical opening name as taught (e.g. "Italian Game", "Caro-Kann Defense"). Fuzzy-matched; best hit wins.',
      },
      ecoCode: {
        type: 'string',
        description: 'ECO code (e.g. "C50", "B10") — used when `name` is absent.',
      },
    },
    required: [],
  },
  async execute(args) {
    const name = typeof args.name === 'string' ? args.name.trim() : '';
    const ecoCode = typeof args.ecoCode === 'string' ? args.ecoCode.trim() : '';
    if (!name && !ecoCode) {
      return { ok: false, error: 'Either `name` or `ecoCode` is required.' };
    }
    try {
      let id: string | null = null;
      if (name) {
        const matches = await searchOpenings(name);
        if (matches.length > 0) id = matches[0].id;
      }
      if (!id && ecoCode) {
        const ecoMatches = await getOpeningByEco(ecoCode);
        if (ecoMatches.length > 0) id = ecoMatches[0].id;
      }
      if (!id) {
        return { ok: false, error: `No opening matched name="${name}" ecoCode="${ecoCode}".` };
      }
      const savedName = await saveOpeningToRepertoire(id);
      if (!savedName) {
        return { ok: false, error: `Opening id "${id}" not found.` };
      }
      // Seed spaced-repetition flashcards for the newly-repertoire opening
      // (idempotent — skips openings already seeded).
      await seedFlashcardsForRepertoire();
      return { ok: true, result: { id, name: savedName, saved: true } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
