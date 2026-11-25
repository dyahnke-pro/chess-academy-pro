import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import type * as http2 from 'node:http2';
import {
  signApnsJwt, providerToken, resetApnsTokenCacheForTests, buildApnsHeaders, buildApnsPayload,
  sendApns, pushToToken, apnsConfigFromEnv, APNS_HOSTS, APNS_TOPIC_DEFAULT, JWT_TTL_MS, type ApnsConfig,
} from './apns';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const CFG: ApnsConfig = { keyPem: PEM, keyId: 'ABC123DEFG', teamId: 'TEAM123456', topic: 'com.chessacademy.pro' };
const TOKEN = 'a'.repeat(64);
const dec = (s: string): Record<string, unknown> => JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as Record<string, unknown>;

/** A fake HTTP/2 session: records the request, answers with status + body. */
function fakeConnect(answers: { status: number; body?: string }[], seen: { host: string; headers: Record<string, string>; payload: string }[]) {
  let i = 0;
  return ((host: string) => {
    const session = new EventEmitter() as EventEmitter & { request: unknown; close: () => void };
    session.close = () => {};
    session.request = (headers: Record<string, string>) => {
      const req = new EventEmitter() as EventEmitter & { setEncoding: () => void; end: (b: string) => void };
      req.setEncoding = () => {};
      req.end = (payload: string) => {
        seen.push({ host, headers, payload });
        const a = answers[Math.min(i, answers.length - 1)]; i += 1;
        queueMicrotask(() => {
          req.emit('response', { ':status': a.status });
          if (a.body) req.emit('data', a.body);
          req.emit('end');
        });
      };
      return req;
    };
    return session as unknown as http2.ClientHttp2Session;
  });
}

describe('APNs provider token', () => {
  beforeEach(() => resetApnsTokenCacheForTests());

  it('is an ES256 JWT with kid, iss and iat, verifiable with the public key', () => {
    const jwt = signApnsJwt(CFG, 1_700_000_000_000);
    const [h, c, s] = jwt.split('.');
    expect(dec(h)).toEqual({ alg: 'ES256', kid: 'ABC123DEFG' });
    expect(dec(c)).toEqual({ iss: 'TEAM123456', iat: 1_700_000_000 });
    const sig = Buffer.from(s, 'base64url');
    expect(sig.length).toBe(64); // raw r||s, not DER
    const v = createVerify('SHA256'); v.update(`${h}.${c}`); v.end();
    expect(v.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, sig)).toBe(true);
  });

  it('is reused inside the TTL and re-minted after it', () => {
    const a = providerToken(CFG, 1_000_000);
    expect(providerToken(CFG, 1_000_000 + JWT_TTL_MS - 1)).toBe(a);
    expect(providerToken(CFG, 1_000_000 + JWT_TTL_MS + 1000)).not.toBe(a);
  });

  it('reads its config from the env, unescaping a one-line PEM', () => {
    expect(apnsConfigFromEnv({})).toBeNull();
    const cfg = apnsConfigFromEnv({ APNS_KEY: PEM.replace(/\n/g, '\\n'), APNS_KEY_ID: 'K', APNS_TEAM_ID: 'T' });
    expect(cfg?.keyPem).toBe(PEM.trim());
    expect(cfg?.topic).toBe(APNS_TOPIC_DEFAULT);
  });
});

describe('APNs request', () => {
  beforeEach(() => resetApnsTokenCacheForTests());

  it('builds the headers Apple requires', () => {
    expect(buildApnsHeaders(TOKEN, 'JWT', 'com.chessacademy.pro')).toMatchObject({
      ':method': 'POST', ':path': `/3/device/${TOKEN}`, authorization: 'bearer JWT',
      'apns-topic': 'com.chessacademy.pro', 'apns-push-type': 'alert',
    });
  });

  it('puts the alert under aps and the tap data beside it', () => {
    expect(buildApnsPayload({ title: 'T', body: 'B', data: { open: 'bell' }, threadId: 'messages' })).toEqual({
      aps: { alert: { title: 'T', body: 'B' }, sound: 'default', 'thread-id': 'messages' }, open: 'bell',
    });
  });

  it('sends to the token environment host and reports 200', async () => {
    const seen: { host: string; headers: Record<string, string>; payload: string }[] = [];
    const r = await sendApns({ token: TOKEN, environment: 'production', alert: { title: 'T', body: 'B' }, cfg: CFG }, fakeConnect([{ status: 200 }], seen));
    expect(r).toEqual({ status: 200, reason: null });
    expect(seen[0].host).toBe(APNS_HOSTS.production);
    expect(seen[0].headers.authorization).toMatch(/^bearer ey/);
    expect(JSON.parse(seen[0].payload).aps.alert.title).toBe('T');
  });

  it('retries once on the other host after BadDeviceToken, and reports the host that answered', async () => {
    const seen: { host: string; headers: Record<string, string>; payload: string }[] = [];
    const out = await pushToToken({ token: TOKEN, environment: 'production', alert: { title: 'T', body: 'B' }, cfg: CFG },
      fakeConnect([{ status: 400, body: '{"reason":"BadDeviceToken"}' }, { status: 200 }], seen));
    expect(out).toEqual({ sent: true, environment: 'sandbox' });
    expect(seen.map((s) => s.host)).toEqual([APNS_HOSTS.production, APNS_HOSTS.sandbox]);
  });

  it('calls a 410 token dead', async () => {
    const out = await pushToToken({ token: TOKEN, environment: 'production', alert: { title: 'T', body: 'B' }, cfg: CFG },
      fakeConnect([{ status: 410, body: '{"reason":"Unregistered"}' }], []));
    expect(out).toMatchObject({ sent: false, why: 'dead-token' });
  });

  it('without credentials sends nothing', async () => {
    const seen: { host: string; headers: Record<string, string>; payload: string }[] = [];
    const out = await pushToToken({ token: TOKEN, environment: 'production', alert: { title: 'T', body: 'B' }, cfg: null }, fakeConnect([{ status: 200 }], seen));
    expect(out).toEqual({ sent: false, why: 'no-config' });
    expect(seen).toHaveLength(0);
  });
});
