// What the app itself costs to download, read off App Store Connect.
//
// The schedule's `include=manualPrices` gives the app prices WITHOUT their
// price point, so the price was never read: two scripts saw "no price point",
// skipped every row and still concluded "NOT free" (asc-final-check on
// 2026-11-11, while the app was free) — and the repair script would then have
// written a new price schedule on that false reading. The price points are
// asked for by name on the schedule's manualPrices, and a row whose price
// cannot be read makes the whole read UNKNOWN, never "not free".

/**
 * The price in force today in `territory`, from manualPrices rows.
 * @param {Array<{territory: string|null, startDate: string|null, endDate: string|null, customerPrice: string|null}>} rows
 * @param {string} today YYYY-MM-DD
 * @param {string} territory
 * @returns {{customerPrice: string} | {unknown: string}}
 */
export function currentPrice(rows, today, territory = 'USA') {
  const live = rows.filter((r) => (r.territory === territory || r.territory === null)
    && (!r.startDate || r.startDate <= today)
    && (!r.endDate || r.endDate > today));
  if (live.length === 0) return { unknown: `no ${territory} price in force on ${today}` };
  const missing = live.find((r) => r.customerPrice === null || r.customerPrice === undefined);
  if (missing) return { unknown: `a ${territory} price row carries no price point` };
  // The latest start wins when two overlap (an open-ended old row plus a newer one).
  live.sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')));
  return { customerPrice: String(live[0].customerPrice) };
}

/** @param {string} customerPrice */
export function isFreePrice(customerPrice) {
  return Number(customerPrice) === 0;
}

/**
 * Read the app's manual prices with their price points.
 * @param {(path: string) => Promise<any>} get returns parsed JSON, or {__error, __body}
 * @param {string} appId
 * @returns {Promise<{rows: Array<{territory: string|null, startDate: string|null, endDate: string|null, customerPrice: string|null}>} | {error: string}>}
 */
export async function readAppPriceRows(get, appId) {
  const sched = await get(`/v1/apps/${appId}/appPriceSchedule`);
  if (!sched || sched.__error) return { error: `schedule ${sched?.__error ?? 'no reply'} ${String(sched?.__body ?? '').slice(0, 200)}` };
  const schedId = sched.data?.id;
  if (!schedId) return { error: 'the app has no price schedule' };
  const rows = [];
  let url = `/v1/appPriceSchedules/${schedId}/manualPrices?include=appPricePoint,territory&fields[appPricePoints]=customerPrice&limit=200`;
  for (let page = 0; url && page < 20; page += 1) {
    const r = await get(url);
    if (!r || r.__error) return { error: `manualPrices ${r?.__error ?? 'no reply'} ${String(r?.__body ?? '').slice(0, 200)}` };
    const points = new Map((r.included || []).filter((x) => x.type === 'appPricePoints').map((x) => [x.id, x.attributes?.customerPrice ?? null]));
    for (const p of r.data || []) {
      const ppId = p.relationships?.appPricePoint?.data?.id ?? null;
      rows.push({
        territory: p.relationships?.territory?.data?.id ?? null,
        startDate: p.attributes?.startDate ?? null,
        endDate: p.attributes?.endDate ?? null,
        customerPrice: ppId ? (points.get(ppId) ?? null) : null,
      });
    }
    url = r.links?.next ? r.links.next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  return { rows };
}
