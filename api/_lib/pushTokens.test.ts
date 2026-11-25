import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { generateKeyPairSync } from 'node:crypto';
import type * as http2 from 'node:http2';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notifyDevice, devReplyAlert, memTokenStore, safeApnsToken } from './pushTokens';
import { resetApnsTokenCacheForTests, APNS_TOPIC_DEFAULT } from './apns';

const PEM = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const TOKEN = 'b'.repeat(64);

function connectAnswering(status: number, body = '') {
  return (() => {
    const s = new EventEmitter() as EventEmitter & { request: unknown; close: () => void };
    s.close = () => {};
    s.request = () => {
      const r = new EventEmitter() as EventEmitter & { setEncoding: () => void; end: () => void };
      r.setEncoding = () => {};
      r.end = () => queueMicrotask(() => { r.emit('response', { ':status': status }); if (body) r.emit('data', body); r.emit('end'); });
      return r;
    };
    return s as unknown as http2.ClientHttp2Session;
  });
}

describe('notifyDevice', () => {
  beforeEach(() => {
    resetApnsTokenCacheForTests();
    process.env.APNS_KEY = PEM; process.env.APNS_KEY_ID = 'KEYID'; process.env.APNS_TEAM_ID = 'TEAM';
  });
  afterEach(() => { delete process.env.APNS_KEY; delete process.env.APNS_KEY_ID; delete process.env.APNS_TEAM_ID; });

  it('a device with no token is a no-token outcome, not a failure', async () => {
    expect(await notifyDevice('devNOTOKEN1', devReplyAlert('hi'), { store: memTokenStore(), connect: connectAnswering(200) }))
      .toEqual({ sent: false, why: 'no-token' });
  });

  it('sends to the filed token', async () => {
    const store = memTokenStore();
    await store.set('devSEND0001', { token: TOKEN, environment: 'production', platform: 'ios', ts: 1 });
    expect(await notifyDevice('devSEND0001', devReplyAlert('hi'), { store, connect: connectAnswering(200) }))
      .toEqual({ sent: true, environment: 'production' });
  });

  it('drops a token Apple calls dead', async () => {
    const store = memTokenStore();
    await store.set('devDEAD0001', { token: TOKEN, environment: 'production', platform: 'ios', ts: 1 });
    await notifyDevice('devDEAD0001', devReplyAlert('hi'), { store, connect: connectAnswering(410, '{"reason":"Unregistered"}') });
    expect(await store.get('devDEAD0001')).toBeNull();
  });
});

describe('the dev-reply alert', () => {
  it('names David and carries the first ~100 characters', () => {
    const a = devReplyAlert(`Thanks!\n\n${'x'.repeat(300)}`);
    expect(a.title).toBe('New message from David');
    expect(a.body.length).toBeLessThanOrEqual(100);
    expect(a.body.startsWith('Thanks! x')).toBe(true);
    expect(a.body.endsWith('…')).toBe(true);
    expect(a.data).toEqual({ open: 'bell' });
    expect(devReplyAlert('short').body).toBe('short');
  });

  it('accepts hex tokens only', () => {
    expect(safeApnsToken(TOKEN.toUpperCase())).toBe(TOKEN);
    expect(safeApnsToken('xyz')).toBeNull();
  });

  it('the APNs topic is the app bundle id', () => {
    const cfg = readFileSync(join(__dirname, '../../capacitor.config.ts'), 'utf8');
    expect(cfg).toContain(`appId: '${APNS_TOPIC_DEFAULT}'`);
  });
});
