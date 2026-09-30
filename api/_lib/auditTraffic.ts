/**
 * 🔒 AUDIT TRAFFIC NEVER TOUCHES REDIS (David 2026-09-30: "make sure it doesn't
 * fill back up! Make sure nothing auto dumps into it").
 *
 * The 2026-09-19 gate kept audits out of `/api/audit-stream` — and the budget
 * still burned. Measured 2026-09-30 13:49–16:49 UTC: 28,665 `/api/messages`,
 * 14,737 `/api/referrals` and 6,446 LLM-proxy calls in three hours, ~14.5k
 * fresh headless page boots. Every boot of the app GETs the bell (2 LRANGEs),
 * issues a referral code for its brand-new device id (~6 GET/SETs) and pays a
 * spend-guard INCR per coach call — ≈150k Upstash commands in one afternoon
 * against a 500k/month cap shared with the bell, referrals and the rate limit.
 *
 * So the audit marker is checked at EVERY Redis door, from this one place:
 * a request is audit traffic when it carries `x-audit-marked` (stamped by an
 * audit-marked page, `appAuditor.isAuditMarkedPage`) or a headless/automation
 * user agent. Such a request is answered without a single Redis command.
 * Gate: `api/auditTraffic.gate.test.ts` fails if a route that constructs an
 * Upstash client does not call this.
 */
export const AUDIT_MARKED_HEADER = 'x-audit-marked';

const AUDIT_UA = /HeadlessChrome|AuditCoachPlayBot|Playwright/i;

type HeaderBag =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function read(headers: HeaderBag, name: string): string {
  if (typeof (headers as { get?: unknown }).get === 'function') {
    return (headers as { get(n: string): string | null }).get(name) ?? '';
  }
  const v = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? v.join(',') : (v ?? '');
}

export function isAuditTraffic(headers: HeaderBag): boolean {
  return read(headers, AUDIT_MARKED_HEADER) !== '' || AUDIT_UA.test(read(headers, 'user-agent'));
}
