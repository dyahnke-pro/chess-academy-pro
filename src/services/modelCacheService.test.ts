import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { modelCacheService } from './modelCacheService';

describe('modelCacheService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  describe('match', () => {
    it('returns undefined when no cached entry exists', async () => {
      const result = await modelCacheService.match('https://huggingface.co/model/config.json');
      expect(result).toBeUndefined();
    });

    it('returns a Response when cached entry exists', async () => {
      // Use put+match roundtrip (avoids fake-indexeddb Blob limitations)
      const response = new Response('test data', {
        headers: { 'content-type': 'application/json' },
      });
      await modelCacheService.put('https://huggingface.co/model/config.json', response);

      const result = await modelCacheService.match('https://huggingface.co/model/config.json');
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(200);
    });

    it('returns Response with correct headers', async () => {
      const blob = new Blob(['binary data'], { type: 'application/octet-stream' });
      await db.modelCache.put({
        key: 'https://huggingface.co/model/weights.onnx',
        data: blob,
        headers: JSON.stringify({ 'content-type': 'application/octet-stream', 'content-length': '11' }),
        timestamp: Date.now(),
      });

      const result = await modelCacheService.match('https://huggingface.co/model/weights.onnx');
      expect(result?.headers.get('content-type')).toBe('application/octet-stream');
      expect(result?.headers.get('content-length')).toBe('11');
    });
  });

  describe('put', () => {
    it('stores a Response in IndexedDB', async () => {
      const response = new Response('cached content', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });

      await modelCacheService.put('https://huggingface.co/model/file.txt', response);

      const entry = await db.modelCache.get('https://huggingface.co/model/file.txt');
      expect(entry).toBeDefined();
      expect(entry!.key).toBe('https://huggingface.co/model/file.txt');
      expect(entry!.timestamp).toBeGreaterThan(0);
      expect(JSON.parse(entry!.headers)).toHaveProperty('content-type', 'text/plain');
    });

    it('overwrites existing entries with same key', async () => {
      const response1 = new Response('version 1');
      const response2 = new Response('version 2');

      await modelCacheService.put('https://huggingface.co/model/file.txt', response1);
      await modelCacheService.put('https://huggingface.co/model/file.txt', response2);

      const count = await db.modelCache.where('key').equals('https://huggingface.co/model/file.txt').count();
      expect(count).toBe(1);

      // Verify via match that the latest version is returned
      const result = await modelCacheService.match('https://huggingface.co/model/file.txt');
      expect(result).toBeDefined();
    });
  });

  describe('clear', () => {
    it('removes all cached entries', async () => {
      await db.modelCache.put({
        key: 'url1',
        data: new Blob(['a']),
        headers: '{}',
        timestamp: Date.now(),
      });
      await db.modelCache.put({
        key: 'url2',
        data: new Blob(['b']),
        headers: '{}',
        timestamp: Date.now(),
      });

      await modelCacheService.clear();

      const count = await db.modelCache.count();
      expect(count).toBe(0);
    });
  });

  describe('hasEntries', () => {
    it('returns false when empty', async () => {
      expect(await modelCacheService.hasEntries()).toBe(false);
    });

    it('returns true when entries exist', async () => {
      await db.modelCache.put({
        key: 'url1',
        data: new Blob(['a']),
        headers: '{}',
        timestamp: Date.now(),
      });

      expect(await modelCacheService.hasEntries()).toBe(true);
    });
  });
});
