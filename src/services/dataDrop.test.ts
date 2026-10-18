import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildDropPayload, sendMyData, DROP_STORES, redactSecrets } from './dataDrop';

describe('dataDrop', () => {
  beforeEach(async () => { await db.delete(); await db.open(); vi.unstubAllGlobals(); });

  it('exports every store that IS the student record', async () => {
    await db.misconceptionTags.put({ id: 'm1', tag: 'hung-material', source: 'auto-analysis', createdAt: 1, fen: '8/8/8/8/8/8/8/K6k w - - 0 1', playedSan: 'Ka2', status: 'open', masteryHits: 0 });
    const p = await buildDropPayload();
    const stores = p.stores as Record<string, unknown[]>;
    expect(Object.keys(stores).sort()).toEqual([...DROP_STORES].sort());
    expect(stores.misconceptionTags).toHaveLength(1);
  });

  it('returns the code the server stored it under', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ stored: true, code: 'data-drop/x-1-ABC.json.gz', bytes: 900 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendMyData();
    expect(r).toMatchObject({ ok: true, code: 'data-drop/x-1-ABC.json.gz' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('says why when the server refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'too large' }), { status: 413 })));
    expect(await sendMyData()).toMatchObject({ ok: false, error: 'too large' });
  });

  it('never sends a secret: by field name at any depth, and meta rows by key', () => {
    const r = redactSecrets({ id: 'p', preferences: { auditStreamSecret: 'abc', voice: 'ruth' }, apiKey: 'k' }) as Record<string, Record<string, unknown>>;
    expect(r.preferences.auditStreamSecret).toBe('[redacted]');
    expect(r.preferences.voice).toBe('ruth');
    expect(r.apiKey).toBe('[redacted]');
    expect((redactSecrets({ key: 'deepseek_token', value: 'sk-1' }) as { value: string }).value).toBe('[redacted]');
    expect((redactSecrets({ key: 'heat_map_mirror_v1', value: '{}' }) as { value: string }).value).toBe('{}');
  });
});
