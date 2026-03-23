// IndexedDB-backed cache adapter for @huggingface/transformers
// Replaces the browser Cache API which doesn't persist on iOS WKWebView
// and gets cleared by PWA service worker updates.

import { db } from '../db/schema';

interface TransformersCache {
  match(request: string): Promise<Response | undefined>;
  put(request: string, response: Response): Promise<void>;
}

class ModelCacheService implements TransformersCache {
  async match(request: string): Promise<Response | undefined> {
    try {
      const entry = await db.modelCache.get(request);
      if (!entry) return undefined;

      const headers = JSON.parse(entry.headers) as Record<string, string>;
      return new Response(entry.data, {
        status: 200,
        headers,
      });
    } catch {
      return undefined;
    }
  }

  async put(request: string, response: Response): Promise<void> {
    try {
      const blob = await response.blob();
      const headers = JSON.stringify(Object.fromEntries(response.headers.entries()));

      await db.modelCache.put({
        key: request,
        data: blob,
        headers,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('[ModelCache] Failed to cache model file:', error);
    }
  }

  async clear(): Promise<void> {
    await db.modelCache.clear();
  }

  async hasEntries(): Promise<boolean> {
    const count = await db.modelCache.count();
    return count > 0;
  }
}

export const modelCacheService = new ModelCacheService();
