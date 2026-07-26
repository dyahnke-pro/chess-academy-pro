/**
 * /api/revenuecat-webhook — RevenueCat → PostHog server-side purchase tracking.
 *
 * RevenueCat POSTs every subscription lifecycle event here (initial purchase,
 * renewal, cancellation, refund/expiration, billing issue, trial start /
 * conversion). We map it (`_lib/revenuecatEvent`) and forward it to PostHog's
 * capture API, keyed on RevenueCat's app-user id — the SAME distinct id the app
 * `identify()`s with (`getStableAnalyticsId`), so server-side money events land
 * on the same PostHog person as the in-app usage events.
 *
 * WHY THIS EXISTS: client purchase events (`billingAnalytics.ts`) only fire in a
 * build that ships them AND can't see anything that happens while the app is
 * closed (renewals, refunds, churn). This webhook captures ALL of it, no app
 * build required, and RevenueCat backfills history on connect.
 *
 * Auth: shared secret. Configure the SAME value in the RevenueCat dashboard
 *   (Project → Integrations → Webhooks → Authorization header) and in the
 *   `REVENUECAT_WEBHOOK_SECRET` env var. RevenueCat sends it verbatim as the
 *   `Authorization` header; a missing/wrong value → 401. Unset env → 500
 *   (fail closed — never an open ingest endpoint), same posture as audit-stream.
 *
 * SETUP (David, one-time — RevenueCat dashboard):
 *   Project → Integrations → Webhooks → Add
 *     URL:  https://chess-academy-pro.vercel.app/api/revenuecat-webhook
 *     Authorization header: <the REVENUECAT_WEBHOOK_SECRET value>
 *   Then set REVENUECAT_WEBHOOK_SECRET in Vercel (production).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapRevenueCatEvent, type RevenueCatEvent } from './_lib/revenuecatEvent.js';

interface RevenueCatWebhookBody {
  event?: RevenueCatEvent;
  api_version?: string;
}

/** Forward one mapped event to PostHog's capture API. Never throws. */
async function captureToPostHog(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<boolean> {
  const key = process.env.VITE_POSTHOG_KEY;
  if (!key) return false;
  const host = (process.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');
  try {
    const resp = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected) {
    // Fail closed — never accept unauthenticated ingest.
    res.status(500).json({ error: 'server misconfigured: REVENUECAT_WEBHOOK_SECRET not set' });
    return;
  }
  const provided = req.headers['authorization'];
  if (provided !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // Vercel parses JSON bodies; tolerate a raw string too.
  let body: RevenueCatWebhookBody;
  try {
    body = typeof req.body === 'string' ? (JSON.parse(req.body) as RevenueCatWebhookBody) : (req.body as RevenueCatWebhookBody);
  } catch {
    res.status(400).json({ error: 'invalid json' });
    return;
  }

  const mapped = mapRevenueCatEvent(body?.event);
  if (!mapped) {
    // Acknowledge so RevenueCat doesn't retry a structurally-empty event.
    res.status(200).json({ ok: true, skipped: 'no mappable event' });
    return;
  }

  const forwarded = await captureToPostHog(mapped.event, mapped.distinctId, mapped.properties);
  res.status(200).json({ ok: true, event: mapped.event, forwarded });
}
