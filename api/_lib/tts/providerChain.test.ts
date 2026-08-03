/**
 * The migration's safety property, as a test.
 *
 * David's constraint on this work was "don't break my app". Concretely that
 * means: on a deployment with NO Google key — which is every deployment until
 * the key is provisioned — `/api/tts` must behave EXACTLY as it does today,
 * i.e. serve from Polly. And when the Google key is added, Google must take
 * over while Polly stays behind it as the safety net.
 *
 * That is entirely decided by `selectProviders()`, so it is pinned here.
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
  it('serves from Polly alone when no Google key is set (today\'s prod)', () => {
    withPolly();
    expect(selectProviders().map((p) => p.id)).toEqual(['polly']);
  });

  it('puts Google first once its key lands, keeping Polly as the safety net', () => {
    withPolly();
    process.env.GOOGLE_TTS_API_KEY = 'test-google-key';
    expect(selectProviders().map((p) => p.id)).toEqual(['google', 'polly']);
  });

  it('runs on Google alone once the Polly credentials are removed', () => {
    // The end state: deleting the AWS env vars is what finishes the migration,
    // and it must leave a working single-provider chain.
    process.env.GOOGLE_TTS_API_KEY = 'test-google-key';
    expect(selectProviders().map((p) => p.id)).toEqual(['google']);
  });

  it('reports an empty chain when nothing is configured (endpoint 503s)', () => {
    // Never a crash, and never a silent 200 with no audio.
    expect(selectProviders()).toEqual([]);
  });

  it('accepts every provisioned spelling of the Google key', () => {
    // process.env lookups are case-sensitive and the key on the Vercel project
    // is `google_api_key`, not the canonical name. Reading only one spelling
    // would leave prod silently on Polly — the migration would look like it
    // simply never happened.
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
    withPolly();
    expect(selectProviders().map((p) => p.id)).toEqual(['polly']);
  });
});
