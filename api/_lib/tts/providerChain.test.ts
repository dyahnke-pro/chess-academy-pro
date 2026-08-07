/**
 * ONE SERVER VOICE — the chain is Google-only (David 2026-08-07, second
 * "I heard the old Polly voice" report; the migration plan's exit criteria
 * were met — `x-tts-source: google` verified on prod — so the Polly leg is
 * removed per the plan's sanctioned one-line change).
 *
 * The properties pinned here:
 *  - Polly credentials NEVER put Polly in the chain, in any combination.
 *  - Google serves alone whenever any accepted spelling of its key is set.
 *  - Nothing configured → empty chain (endpoint 503s; the client falls to
 *    its device-TTS floor). Never a crash, never a silent 200.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { selectProviders } from '../../tts';

const ENV_KEYS = [
  'GOOGLE_TTS_API_KEY',
  'GOOGLE_API_KEY',
  'google_api_key',
  'AWS_ACCESS_KEY_ID_POLLY',
  'AWS_SECRET_ACCESS_KEY_POLLY',
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function withPolly(): void {
  process.env.AWS_ACCESS_KEY_ID_POLLY = 'test-key';
  process.env.AWS_SECRET_ACCESS_KEY_POLLY = 'test-secret';
}

describe('selectProviders', () => {
  it('NEVER serves from Polly — even with only AWS credentials set', () => {
    withPolly();
    expect(selectProviders()).toEqual([]);
  });

  it('runs on Google alone even when Polly credentials are still provisioned', () => {
    withPolly();
    process.env.GOOGLE_TTS_API_KEY = 'test-google-key';
    expect(selectProviders().map((p) => p.id)).toEqual(['google']);
  });

  it('reports an empty chain when nothing is configured (endpoint 503s)', () => {
    expect(selectProviders()).toEqual([]);
  });

  it('accepts every provisioned spelling of the Google key', () => {
    // process.env lookups are case-sensitive and the key on the Vercel project
    // is `google_api_key`, not the canonical name. Reading only one spelling
    // would leave prod silently voiceless.
    for (const name of ['GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY', 'google_api_key']) {
      for (const k of ['GOOGLE_TTS_API_KEY', 'GOOGLE_API_KEY', 'google_api_key']) delete process.env[k];
      process.env[name] = 'test-google-key';
      expect(selectProviders().map((p) => p.id), `not read from ${name}`).toEqual(['google']);
    }
  });

  it('reads credentials per call, not at module load', () => {
    // Edge runtime env vars are not reliably bound when a module evaluates —
    // a cached module-scope read would pin the chain to whatever was set at
    // cold start. Same hazard documented in _lib/usageGuard.ts.
    expect(selectProviders()).toEqual([]);
    process.env.GOOGLE_TTS_API_KEY = 'test-google-key';
    expect(selectProviders().map((p) => p.id)).toEqual(['google']);
  });
});
