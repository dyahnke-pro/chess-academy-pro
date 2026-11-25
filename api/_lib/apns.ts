/**
 * APNs — Apple's push service, spoken directly (David 2026-11-25: "real remote
 * push notifications on the native iOS app").
 *
 * Token-based auth: one ES256 JWT signed with the team's .p8 key (Vercel env
 * APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID), reused for ~50 minutes (Apple
 * refuses a token older than an hour and throttles one minted more than once
 * every 20 minutes). The request is HTTP/2 to api.push.apple.com, or the
 * sandbox host for a token from a debug build. node's own http2 + crypto, no
 * server dependency.
 *
 * Which host a token belongs to is decided by the build that minted it, not by
 * anything the client can be trusted to know for certain: TestFlight and App
 * Store builds are production, only an Xcode-run build is sandbox. So the
 * client's guess is a first try, and a `BadDeviceToken` there is retried once
 * on the other host — the host that answers becomes the token's environment.
 */
import { createSign, type KeyObject, createPrivateKey } from 'node:crypto';
import * as http2 from 'node:http2';

export type ApnsEnvironment = 'production' | 'sandbox';

/** The app's bundle id — the APNs topic. Must equal capacitor.config.ts appId. */
export const APNS_TOPIC_DEFAULT = 'com.chessacademy.pro';

export const APNS_HOSTS: Record<ApnsEnvironment, string> = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
};

/** Reuse window for the signed token: under Apple's 60-minute ceiling. */
export const JWT_TTL_MS = 50 * 60 * 1000;

export interface ApnsConfig {
  keyPem: string;
  keyId: string;
  teamId: string;
  topic: string;
}

/** Read the credentials from the environment, or null when any is missing. */
export function apnsConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ApnsConfig | null {
  const keyPem = (env.APNS_KEY ?? '').replace(/\\n/g, '\n').trim();
  const keyId = (env.APNS_KEY_ID ?? '').trim();
  const teamId = (env.APNS_TEAM_ID ?? '').trim();
  if (!keyPem || !keyId || !teamId) return null;
  return { keyPem, keyId, teamId, topic: (env.APNS_TOPIC ?? '').trim() || APNS_TOPIC_DEFAULT };
}

const b64url = (b: Buffer | string): string =>
  Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Sign a provider token. PURE apart from the signature (ES256, raw r||s). */
export function signApnsJwt(cfg: Pick<ApnsConfig, 'keyPem' | 'keyId' | 'teamId'>, nowMs: number): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId }));
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(nowMs / 1000) }));
  const input = `${header}.${claims}`;
  const key: KeyObject = createPrivateKey(cfg.keyPem);
  const signer = createSign('SHA256');
  signer.update(input);
  signer.end();
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(sig)}`;
}

let cached: { jwt: string; at: number; keyId: string } | null = null;

/** The provider token, minted once and reused for JWT_TTL_MS. */
export function providerToken(cfg: ApnsConfig, nowMs: number = Date.now()): string {
  if (cached && cached.keyId === cfg.keyId && nowMs - cached.at < JWT_TTL_MS) return cached.jwt;
  const jwt = signApnsJwt(cfg, nowMs);
  cached = { jwt, at: nowMs, keyId: cfg.keyId };
  return jwt;
}

/** Test seam: forget the cached token. */
export function resetApnsTokenCacheForTests(): void {
  cached = null;
}

export interface PushAlert {
  title: string;
  body: string;
  /** Custom keys delivered beside `aps` — what the app does on a tap. */
  data?: Record<string, string>;
  threadId?: string;
}

/** The JSON Apple receives. PURE. */
export function buildApnsPayload(alert: PushAlert): Record<string, unknown> {
  return {
    aps: {
      alert: { title: alert.title, body: alert.body },
      sound: 'default',
      ...(alert.threadId ? { 'thread-id': alert.threadId } : {}),
    },
    ...(alert.data ?? {}),
  };
}

/** The HTTP/2 headers for one push. PURE. */
export function buildApnsHeaders(token: string, jwt: string, topic: string): Record<string, string> {
  return {
    ':method': 'POST',
    ':path': `/3/device/${token}`,
    authorization: `bearer ${jwt}`,
    'apns-topic': topic,
    'apns-push-type': 'alert',
    'apns-priority': '10',
    'content-type': 'application/json',
  };
}

export interface ApnsResult {
  status: number;
  /** Apple's reason string on a failure (`BadDeviceToken`, `Unregistered`, …). */
  reason: string | null;
}

/** The slice of http2.connect the sender uses — injectable for tests. */
export type Http2Connect = (authority: string) => http2.ClientHttp2Session;

const SEND_TIMEOUT_MS = 8000;

/** One push to one token on one host. Never throws: a transport error is status 0. */
export function sendApns(
  args: { token: string; environment: ApnsEnvironment; alert: PushAlert; cfg: ApnsConfig; nowMs?: number },
  connect: Http2Connect = (a) => http2.connect(a),
): Promise<ApnsResult> {
  return new Promise((resolve) => {
    let settled = false;
    let session: http2.ClientHttp2Session | null = null;
    const done = (r: ApnsResult): void => {
      if (settled) return;
      settled = true;
      try { session?.close(); } catch { /* already closed */ }
      resolve(r);
    };
    const timer = setTimeout(() => done({ status: 0, reason: 'timeout' }), SEND_TIMEOUT_MS);
    try {
      session = connect(APNS_HOSTS[args.environment]);
      session.on('error', (e: Error) => { clearTimeout(timer); done({ status: 0, reason: e.message.slice(0, 120) }); });
      const jwt = providerToken(args.cfg, args.nowMs);
      const req = session.request(buildApnsHeaders(args.token, jwt, args.cfg.topic));
      let status = 0;
      let body = '';
      req.on('response', (h) => { status = Number(h[':status'] ?? 0); });
      req.setEncoding('utf8');
      req.on('data', (c: string) => { body += c; });
      req.on('end', () => {
        clearTimeout(timer);
        let reason: string | null = null;
        if (body) {
          try { reason = (JSON.parse(body) as { reason?: string }).reason ?? null; } catch { reason = body.slice(0, 120); }
        }
        done({ status, reason });
      });
      req.on('error', (e: Error) => { clearTimeout(timer); done({ status: 0, reason: e.message.slice(0, 120) }); });
      req.end(JSON.stringify(buildApnsPayload(args.alert)));
    } catch (e) {
      clearTimeout(timer);
      done({ status: 0, reason: e instanceof Error ? e.message.slice(0, 120) : String(e) });
    }
  });
}

/** A token Apple says is dead for good — drop it rather than retry forever. */
export function isDeadToken(r: ApnsResult): boolean {
  return r.status === 410 || r.reason === 'Unregistered' || r.reason === 'BadDeviceToken' || r.reason === 'DeviceTokenNotForTopic';
}

export type PushOutcome =
  | { sent: true; environment: ApnsEnvironment }
  | { sent: false; why: 'no-config' | 'dead-token' | 'failed'; result?: ApnsResult };

/**
 * Send to a token, trying its recorded environment first and the other host
 * once on BadDeviceToken (a build whose environment the client guessed wrong).
 */
export async function pushToToken(
  args: { token: string; environment: ApnsEnvironment; alert: PushAlert; cfg: ApnsConfig | null },
  connect?: Http2Connect,
): Promise<PushOutcome> {
  if (!args.cfg) return { sent: false, why: 'no-config' };
  const first = await sendApns({ ...args, cfg: args.cfg }, connect);
  if (first.status === 200) return { sent: true, environment: args.environment };
  if (first.reason === 'BadDeviceToken') {
    const other: ApnsEnvironment = args.environment === 'production' ? 'sandbox' : 'production';
    const second = await sendApns({ ...args, environment: other, cfg: args.cfg }, connect);
    if (second.status === 200) return { sent: true, environment: other };
    return { sent: false, why: isDeadToken(second) ? 'dead-token' : 'failed', result: second };
  }
  return { sent: false, why: isDeadToken(first) ? 'dead-token' : 'failed', result: first };
}
