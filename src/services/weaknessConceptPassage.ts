// weaknessConceptPassage — the ONE way to fetch the book passage that teaches a
// weakness concept: by the concept's corpus id, never by a free-text search.
//
// A text search returns whatever passage shares the most words, so a concept
// the corpus does not cover gets a DIFFERENT concept's passage (walk
// 2026-10-04: "missed hanging pieces" was taught with the pin passage). With an
// id there is either the right passage or none — empty beats wrong.
import { getConcept, type TheoryHit } from './chessConceptService';

/** The corpus hit for a concept id, in the shape the theory assembler takes,
 *  or null when the id is absent or the corpus has no passage for it. */
export function corpusHitFor(conceptId: string | null | undefined): TheoryHit | null {
  if (!conceptId) return null;
  const c = getConcept(conceptId);
  const passage = c?.passages[0];
  if (!c || !passage) return null;
  return { passage, conceptId: c.id, conceptName: c.name, score: 0 };
}

/** The whole passage text (G4.5: never clipped), or ''. */
export function conceptPassageFor(concept: { corpusConceptId?: string } | null | undefined): string {
  return corpusHitFor(concept?.corpusConceptId)?.passage.text ?? '';
}
