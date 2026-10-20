import { db } from '../db/schema';

// ─── Queries ──────────────────────────────────────────────────────────────────

interface FlashcardStats {
  total: number;
  due: number;
  byOpening: Record<string, number>;
}

/** Returns summary statistics for the flashcard collection. */
export async function getFlashcardStats(): Promise<FlashcardStats> {
  const today = new Date().toISOString().split('T')[0];
  // Three bare db.flashcards calls in one Promise.all each open their own
  // auto-transaction; under iOS WebKit memory pressure one can commit while
  // another's cursor is mid-iteration, throwing "Attempt to iterate a
  // cursor that doesn't exist" / "…without an in-progress transaction"
  // (PostHog unhandled-rejection). Same fix pattern as
  // getUnifiedWeaknessProfile / computeWeaknessProfile / exportUserData —
  // one shared read transaction (2026-07-25 commit 342e4cec missed this
  // fourth call site).
  const [total, dueCards, allCards] = await db.transaction('r', db.flashcards, async () => {
    return Promise.all([
      db.flashcards.count(),
      db.flashcards.where('srsDueDate').belowOrEqual(today).toArray(),
      db.flashcards.toArray(),
    ]);
  });

  const byOpening: Record<string, number> = {};
  for (const card of allCards) {
    byOpening[card.openingId] = (byOpening[card.openingId] ?? 0) + 1;
  }

  return { total, due: dueCards.length, byOpening };
}
