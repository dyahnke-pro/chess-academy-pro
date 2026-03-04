import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import type { FlashcardRecord } from '../types';

const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();
const TOMORROW = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();

function makeCard(overrides: Partial<FlashcardRecord> = {}): FlashcardRecord {
  return {
    id: 'card-1',
    openingId: 'vienna-game',
    type: 'name_opening',
    questionFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    questionText: 'Name this opening.',
    answerMove: null,
    answerText: 'Vienna Game (ECO C25)',
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: TODAY,
    srsLastReview: null,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Flashcards CRUD', () => {
  it('adds a card and retrieves by ID', async () => {
    await db.flashcards.add(makeCard());
    const card = await db.flashcards.get('card-1');
    expect(card?.questionText).toBe('Name this opening.');
    expect(card?.openingId).toBe('vienna-game');
  });

  it('retrieves cards by openingId', async () => {
    await db.flashcards.add(makeCard({ id: 'card-1', openingId: 'vienna-game' }));
    await db.flashcards.add(makeCard({ id: 'card-2', openingId: 'vienna-game' }));
    await db.flashcards.add(makeCard({ id: 'card-3', openingId: 'scotch-game' }));

    const viennaCards = await db.flashcards.where('openingId').equals('vienna-game').toArray();
    expect(viennaCards).toHaveLength(2);
  });

  it('queries due cards (srsDueDate <= today)', async () => {
    await db.flashcards.add(makeCard({ id: 'due-today', srsDueDate: TODAY }));
    await db.flashcards.add(makeCard({ id: 'due-yesterday', srsDueDate: YESTERDAY }));
    await db.flashcards.add(makeCard({ id: 'due-tomorrow', srsDueDate: TOMORROW }));

    const due = await db.flashcards.where('srsDueDate').belowOrEqual(TODAY).toArray();
    expect(due).toHaveLength(2);
    expect(due.map((c) => c.id)).toContain('due-today');
    expect(due.map((c) => c.id)).toContain('due-yesterday');
    expect(due.map((c) => c.id)).not.toContain('due-tomorrow');
  });

  it('updates SRS fields after review', async () => {
    await db.flashcards.add(makeCard());
    await db.flashcards.update('card-1', {
      srsInterval: 6,
      srsEaseFactor: 2.6,
      srsRepetitions: 2,
      srsDueDate: TOMORROW,
      srsLastReview: TODAY,
    });

    const updated = await db.flashcards.get('card-1');
    expect(updated?.srsInterval).toBe(6);
    expect(updated?.srsEaseFactor).toBe(2.6);
    expect(updated?.srsRepetitions).toBe(2);
    expect(updated?.srsDueDate).toBe(TOMORROW);
    expect(updated?.srsLastReview).toBe(TODAY);
  });

  it('bulk adds multiple cards', async () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      makeCard({ id: `card-${i}` }),
    );
    await db.flashcards.bulkAdd(cards);
    const count = await db.flashcards.count();
    expect(count).toBe(10);
  });

  it('filters by type', async () => {
    await db.flashcards.add(makeCard({ id: 'c1', type: 'name_opening' }));
    await db.flashcards.add(makeCard({ id: 'c2', type: 'best_move' }));
    await db.flashcards.add(makeCard({ id: 'c3', type: 'explain_idea' }));

    const bestMoves = await db.flashcards.where('type').equals('best_move').toArray();
    expect(bestMoves).toHaveLength(1);
    expect(bestMoves[0].id).toBe('c2');
  });

  it('deletes a card', async () => {
    await db.flashcards.add(makeCard());
    await db.flashcards.delete('card-1');
    const result = await db.flashcards.get('card-1');
    expect(result).toBeUndefined();
  });
});
