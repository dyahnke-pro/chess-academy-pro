import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const native = { value: false };
vi.mock('../utils/webOrigin', () => ({
  WEB_ORIGIN: 'https://web.test',
  isNativeApp: () => native.value,
  withWebOrigin: (p: string) => (native.value ? `https://web.test${p}` : p),
}));

import { db } from '../db/schema';
import { loadDataJson, __resetDataVersions } from './dataFile';

type Route = Record<string, unknown>; // a value, or the markers 'html' / 'fail'
const calls: string[] = [];

function serve(routes: Route): void {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    calls.push(input);
    const key = Object.keys(routes).find((k) => input === k || input.startsWith(`${k}?`));
    if (!key) return new Response('not found', { status: 404 });
    const body = routes[key];
    if (body === 'fail') throw new TypeError('Load failed');
    if (body === 'html') return new Response('<!doctype html><html></html>', { status: 200 });
    return new Response(JSON.stringify(body), { status: 200 });
  }));
}

const FILE = '/data/example.json';
const VERSIONS = 'https://web.test/data-versions.json';
const REMOTE = `https://web.test${FILE}`;

beforeEach(async () => {
  calls.length = 0;
  __resetDataVersions();
  await db.delete();
  await db.open();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('loadDataJson — web', () => {
  beforeEach(() => { native.value = false; });

  it('fetches the same-origin path and nothing else', async () => {
    serve({ [FILE]: { a: 1 } });
    expect(await loadDataJson(FILE)).toEqual({ a: 1 });
    expect(calls).toEqual([FILE]);
  });

  it('resolves null when the file is missing', async () => {
    serve({});
    expect(await loadDataJson(FILE)).toBeNull();
  });
});

describe('loadDataJson — native', () => {
  beforeEach(() => { native.value = true; });

  it('uses the copy inside the app bundle when present, without downloading', async () => {
    serve({ [VERSIONS]: { [FILE]: 'v1' }, [FILE]: { bundled: true } });
    expect(await loadDataJson(FILE)).toEqual({ bundled: true });
    expect(calls).not.toContain(REMOTE);
    expect(await db.dataFiles.count()).toBe(0);
  });

  it('downloads from the web origin once when stripped from the bundle, then keeps it', async () => {
    serve({ [VERSIONS]: { [FILE]: 'v1' }, [FILE]: 'html', [REMOTE]: { remote: 1 } });
    expect(await loadDataJson(FILE)).toEqual({ remote: 1 });
    await vi.waitFor(async () => expect(await db.dataFiles.get(FILE)).toBeTruthy());
    const kept = await db.dataFiles.get(FILE);
    expect(kept?.version).toBe('v1');

    // Next session: served from the kept copy, no file request at all.
    calls.length = 0;
    __resetDataVersions();
    expect(await loadDataJson(FILE)).toEqual({ remote: 1 });
    expect(calls).toEqual([expect.stringMatching(/^https:\/\/web\.test\/data-versions\.json/)]);
  });

  it('re-downloads when the deployed version moved on', async () => {
    await db.dataFiles.put({ path: FILE, version: 'old', text: JSON.stringify({ stale: 1 }), fetchedAt: 1 });
    serve({ [VERSIONS]: { [FILE]: 'new' }, [REMOTE]: { fresh: 1 } });
    expect(await loadDataJson(FILE)).toEqual({ fresh: 1 });
    await vi.waitFor(async () => expect((await db.dataFiles.get(FILE))?.version).toBe('new'));
  });

  it('trusts the kept copy offline', async () => {
    await db.dataFiles.put({ path: FILE, version: 'v1', text: JSON.stringify({ kept: 1 }), fetchedAt: 1 });
    serve({ [VERSIONS]: 'fail', [FILE]: 'fail', [REMOTE]: 'fail' });
    expect(await loadDataJson(FILE)).toEqual({ kept: 1 });
  });

  it('serves an out-of-date kept copy when the network is down', async () => {
    await db.dataFiles.put({ path: FILE, version: 'old', text: JSON.stringify({ kept: 1 }), fetchedAt: 1 });
    serve({ [VERSIONS]: { [FILE]: 'new' }, [FILE]: 'fail', [REMOTE]: 'fail' });
    expect(await loadDataJson(FILE)).toEqual({ kept: 1 });
  });

  it('resolves null when there is no copy anywhere', async () => {
    serve({ [VERSIONS]: 'fail' });
    expect(await loadDataJson(FILE)).toBeNull();
  });

  it('persist:false never writes a kept copy', async () => {
    serve({ [VERSIONS]: { [FILE]: 'v1' }, [REMOTE]: { remote: 1 } });
    expect(await loadDataJson(FILE, { persist: false })).toEqual({ remote: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(await db.dataFiles.count()).toBe(0);
  });
});
