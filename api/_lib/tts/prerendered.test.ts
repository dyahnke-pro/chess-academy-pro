/**
 * Pre-render lookup gates.
 *
 * The whole point of this layer is that it can make voice CHEAPER but must
 * never be able to make voice SILENT. So the tests are mostly about failure:
 * every broken condition has to return null so the caller synthesizes exactly
 * as it does today.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prerenderKey, lookupPrerendered, isPrerenderEnabled, resetPrerenderCache } from './prerendered';

const BASE = 'https://blob.example.com/tts/v1';

const realFetch = globalThis.fetch;

function mockFetch(handler: (url: string) => Response | Promise<Response>): void {
  globalThis.fetch = vi.fn(async (input: unknown) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as { url: string }).url;
    return handler(url);
  }) as unknown as typeof fetch;
}

function audioResponse(bytes = new Uint8Array([1, 2, 3])): Response {
  return new Response(bytes, { status: 200 });
}

beforeEach(() => {
  resetPrerenderCache();
  delete process.env.TTS_PRERENDER_BASE_URL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TTS_PRERENDER_BASE_URL;
  resetPrerenderCache();
});

const REQ = { text: 'The knight eyes d5.', voiceKey: 'ruth', ssml: true, style: 'default' };

describe('prerenderKey', () => {
  it('is stable for identical input', async () => {
    expect(await prerenderKey(REQ)).toBe(await prerenderKey({ ...REQ }));
  });

  it('is 32 hex chars', async () => {
    expect(await prerenderKey(REQ)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('changes when anything that changes the AUDIO changes', async () => {
    const base = await prerenderKey(REQ);
    expect(await prerenderKey({ ...REQ, text: 'The bishop eyes d5.' })).not.toBe(base);
    expect(await prerenderKey({ ...REQ, voiceKey: 'matthew' })).not.toBe(base);
    expect(await prerenderKey({ ...REQ, style: 'edgy' })).not.toBe(base);
    expect(await prerenderKey({ ...REQ, prosodyMode: 'spike' })).not.toBe(base);
    expect(await prerenderKey({ ...REQ, ssml: false })).not.toBe(base);
  });

  it('ignores voice-key casing (the endpoint lowercases before lookup)', async () => {
    expect(await prerenderKey({ ...REQ, voiceKey: 'RUTH' })).toBe(await prerenderKey(REQ));
  });
});

describe('lookupPrerendered', () => {
  it('is disabled — and a silent no-op — when the base URL is unset', async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    expect(isPrerenderEnabled()).toBe(false);
    expect(await lookupPrerendered(REQ)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('serves the clip on a manifest hit', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    const key = await prerenderKey(REQ);
    mockFetch((url) => {
      if (url.endsWith('/manifest.json')) {
        return new Response(JSON.stringify({ version: 1, hashes: [key] }), { status: 200 });
      }
      if (url === `${BASE}/${key}.mp3`) return audioResponse();
      return new Response('not found', { status: 404 });
    });
    const stream = await lookupPrerendered(REQ);
    expect(stream).not.toBeNull();
  });

  it('misses cleanly when the text is not in the manifest (live coach speech)', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    mockFetch((url) => {
      if (url.endsWith('/manifest.json')) {
        return new Response(JSON.stringify({ version: 1, hashes: ['deadbeef'] }), { status: 200 });
      }
      throw new Error('should not fetch a clip on a manifest miss');
    });
    expect(await lookupPrerendered(REQ)).toBeNull();
  });

  it('fails open when the manifest is unreachable', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    mockFetch(() => {
      throw new Error('network down');
    });
    expect(await lookupPrerendered(REQ)).toBeNull();
  });

  it('fails open when the manifest is malformed', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    mockFetch((url) =>
      url.endsWith('/manifest.json')
        ? new Response('<html>oops</html>', { status: 200 })
        : audioResponse(),
    );
    expect(await lookupPrerendered(REQ)).toBeNull();
  });

  it('fails open when the manifest and the blob store disagree', async () => {
    // Manifest claims the clip exists but the object is gone — synthesizing is
    // the safe answer, never a 404 body handed to the audio decoder.
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    const key = await prerenderKey(REQ);
    mockFetch((url) =>
      url.endsWith('/manifest.json')
        ? new Response(JSON.stringify({ version: 1, hashes: [key] }), { status: 200 })
        : new Response('gone', { status: 404 }),
    );
    expect(await lookupPrerendered(REQ)).toBeNull();
  });

  it('fetches the manifest once per isolate, not once per narration', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    const key = await prerenderKey(REQ);
    let manifestFetches = 0;
    mockFetch((url) => {
      if (url.endsWith('/manifest.json')) {
        manifestFetches += 1;
        return new Response(JSON.stringify({ version: 1, hashes: [key] }), { status: 200 });
      }
      return audioResponse();
    });
    await lookupPrerendered(REQ);
    await lookupPrerendered(REQ);
    await lookupPrerendered(REQ);
    expect(manifestFetches).toBe(1);
  });

  it('collapses a concurrent stampede into one manifest fetch', async () => {
    process.env.TTS_PRERENDER_BASE_URL = BASE;
    const key = await prerenderKey(REQ);
    let manifestFetches = 0;
    mockFetch(async (url) => {
      if (url.endsWith('/manifest.json')) {
        manifestFetches += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new Response(JSON.stringify({ version: 1, hashes: [key] }), { status: 200 });
      }
      return audioResponse();
    });
    await Promise.all([lookupPrerendered(REQ), lookupPrerendered(REQ), lookupPrerendered(REQ)]);
    expect(manifestFetches).toBe(1);
  });
});
