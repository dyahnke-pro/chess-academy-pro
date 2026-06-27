/**
 * analysisPracticeStats — durable per-category reading accuracy for Analysis
 * Practice. Persisted in the existing `meta` key-value store (no schema
 * migration) so it survives sessions and can feed the weaknesses surface: the
 * category a student consistently MIS-reads (e.g. always misses back-rank
 * threats, never spots a bad bishop) is a real, trackable weakness.
 *
 * This is the loop-back layer David asked for — "it could help analyze
 * positions… feeds back" — kept deliberately self-contained (one meta key, no
 * shared-state writes) so it can't destabilise the existing weakness pipeline.
 */
import { db } from '../db/schema';
import type { ReadingQuestionType } from './positionReadingService';

const META_KEY = 'analysis-practice-stats.v1';

export interface CategoryStat {
  asked: number;
  correct: number;
}
export type AnalysisPracticeStats = Partial<Record<ReadingQuestionType, CategoryStat>>;

export async function getAnalysisPracticeStats(): Promise<AnalysisPracticeStats> {
  const rec = await db.meta.get(META_KEY);
  if (!rec?.value) return {};
  try {
    const parsed = JSON.parse(rec.value) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as AnalysisPracticeStats) : {};
  } catch {
    return {};
  }
}

/** Record one graded read. Idempotent-safe under concurrent calls is NOT
 *  guaranteed (read-modify-write) — fine for a single-user local store. */
export async function recordReadingResult(type: ReadingQuestionType, correct: boolean): Promise<void> {
  const stats = await getAnalysisPracticeStats();
  const cur = stats[type] ?? { asked: 0, correct: 0 };
  stats[type] = { asked: cur.asked + 1, correct: cur.correct + (correct ? 1 : 0) };
  await db.meta.put({ key: META_KEY, value: JSON.stringify(stats) });
}

export interface WeakestCategory {
  type: ReadingQuestionType;
  accuracy: number;
  asked: number;
}

/**
 * The reading category the student is WEAKEST at — lowest accuracy among
 * categories with a meaningful sample (≥ `minSamples`). Null when no category
 * has enough data yet. This is the signal a weakness surface consumes.
 */
export function weakestCategory(stats: AnalysisPracticeStats, minSamples = 3): WeakestCategory | null {
  let worst: WeakestCategory | null = null;
  for (const [type, s] of Object.entries(stats)) {
    if (!s || s.asked < minSamples) continue;
    const accuracy = s.correct / s.asked;
    if (!worst || accuracy < worst.accuracy) {
      worst = { type: type as ReadingQuestionType, accuracy, asked: s.asked };
    }
  }
  return worst;
}
