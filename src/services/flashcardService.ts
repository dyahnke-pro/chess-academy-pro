import { db } from '../db/schema';
import { calculateNextInterval, createDefaultSrsFields } from './srsEngine';
import { computePosition } from './dataLoader';
import type { FlashcardRecord, OpeningRecord, SrsGrade } from '../types';

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Generates flashcard decks for a single opening.
 * Creates three card types:
 *   - `name_opening`  — given the position, name the opening
 *   - `explain_idea`  — given the position, explain the key ideas
 *   - `best_move`     — one card per variation, asking about the key idea
 *
 * Idempotent: skips if cards already exist for this opening.
 */
export async function generateFlashcardsForOpening(
  openingId: string,
): Promise<void> {
  const opening = await db.openings.get(openingId);
  if (!opening) return;

  const existing = await db.flashcards
    .where('openingId')
    .equals(openingId)
    .count();
  if (existing > 0) return;

  const cards = buildCards(opening);
  if (cards.length > 0) {
    await db.flashcards.bulkAdd(cards);
  }
}

/**
 * Generates flashcard decks for all repertoire openings that don't have cards.
 */
export async function generateAllRepertoireFlashcards(): Promise<void> {
  const repertoire = await db.openings
    .filter((o) => o.isRepertoire)
    .toArray();

  for (const opening of repertoire) {
    await generateFlashcardsForOpening(opening.id);
  }
}

function buildCards(opening: OpeningRecord): FlashcardRecord[] {
  const defaults = createDefaultSrsFields();
  const today = new Date().toISOString().split('T')[0];
  const cards: FlashcardRecord[] = [];

  // Card: name the opening
  cards.push({
    id: `${opening.id}-name-0`,
    openingId: opening.id,
    type: 'name_opening',
    questionFen: opening.fen,
    questionText: 'Name this opening position.',
    answerMove: null,
    answerText: `${opening.name} (ECO ${opening.eco})${opening.overview ? '. ' + opening.overview : ''}`,
    srsInterval: defaults.interval,
    srsEaseFactor: defaults.easeFactor,
    srsRepetitions: defaults.repetitions,
    srsDueDate: today,
    srsLastReview: null,
  });

  // Card: explain the key ideas
  if (opening.keyIdeas?.length) {
    cards.push({
      id: `${opening.id}-idea-0`,
      openingId: opening.id,
      type: 'explain_idea',
      questionFen: opening.fen,
      questionText: `What are the key ideas in the ${opening.name}?`,
      answerMove: null,
      answerText: opening.keyIdeas.join(' | '),
      srsInterval: defaults.interval,
      srsEaseFactor: defaults.easeFactor,
      srsRepetitions: defaults.repetitions,
      srsDueDate: today,
      srsLastReview: null,
    });
  }

  // Cards: one per variation (best move / key idea)
  (opening.variations ?? []).forEach((variation, i) => {
    const { fen } = computePosition(variation.pgn);
    cards.push({
      id: `${opening.id}-var-${i}`,
      openingId: opening.id,
      type: 'best_move',
      questionFen: fen,
      questionText: `What is the key idea in the ${variation.name}?`,
      answerMove: null,
      answerText: variation.explanation,
      srsInterval: defaults.interval,
      srsEaseFactor: defaults.easeFactor,
      srsRepetitions: defaults.repetitions,
      srsDueDate: today,
      srsLastReview: null,
    });
  });

  return cards;
}

// ─── Review ───────────────────────────────────────────────────────────────────

/**
 * Submits a review for a flashcard, updating its SRS scheduling fields.
 */
export async function reviewFlashcard(
  id: string,
  grade: SrsGrade,
): Promise<void> {
  const card = await db.flashcards.get(id);
  if (!card) return;

  const result = calculateNextInterval(
    grade,
    card.srsInterval,
    card.srsEaseFactor,
    card.srsRepetitions,
  );

  await db.flashcards.update(id, {
    srsInterval: result.interval,
    srsEaseFactor: result.easeFactor,
    srsRepetitions: result.repetitions,
    srsDueDate: result.dueDate,
    srsLastReview: new Date().toISOString().split('T')[0],
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns cards due for review today, up to limit. */
export async function getDueFlashcards(
  limit: number = 20,
): Promise<FlashcardRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.flashcards
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

/** Returns all flashcards for a given opening. */
export async function getFlashcardsForOpening(
  openingId: string,
): Promise<FlashcardRecord[]> {
  return db.flashcards.where('openingId').equals(openingId).toArray();
}

/** Returns the number of flashcards due today. */
export async function getDueFlashcardCount(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  return db.flashcards.where('srsDueDate').belowOrEqual(today).count();
}

export interface FlashcardStats {
  total: number;
  due: number;
  byOpening: Record<string, number>;
}

/** Returns summary statistics for the flashcard collection. */
export async function getFlashcardStats(): Promise<FlashcardStats> {
  const today = new Date().toISOString().split('T')[0];
  const [total, dueCards, allCards] = await Promise.all([
    db.flashcards.count(),
    db.flashcards.where('srsDueDate').belowOrEqual(today).toArray(),
    db.flashcards.toArray(),
  ]);

  const byOpening: Record<string, number> = {};
  for (const card of allCards) {
    byOpening[card.openingId] = (byOpening[card.openingId] ?? 0) + 1;
  }

  return { total, due: dueCards.length, byOpening };
}
