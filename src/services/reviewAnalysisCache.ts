import { db } from '../db/schema';
import type { AnalysisCacheEntry } from '../types';

export async function getCachedAnalysis(gameId: string): Promise<AnalysisCacheEntry | undefined> {
  return db.analysisCache.get(gameId);
}

export async function saveCachedAnalysis(entry: AnalysisCacheEntry): Promise<void> {
  await db.analysisCache.put(entry);
}

export async function clearAnalysisCache(gameId?: string): Promise<void> {
  if (gameId) {
    await db.analysisCache.delete(gameId);
  } else {
    await db.analysisCache.clear();
  }
}
