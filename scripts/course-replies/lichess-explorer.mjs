// The Lichess opening explorer for OFFLINE scripts — called directly with the
// owner's token, never through the live app's /api/lichess-explorer
// (WO-COURSE-01, 2026-10-28). The app's proxy leaves from Vercel's shared
// addresses, which Lichess rate-limits; a script spending that budget takes
// lookups away from real users (measured: the proxy answered 429 to five of
// six calls while the same token answered 200 from this machine).
//
// Token: LICHESS_TOKEN_FILE (a file holding it) or LICHESS_TOKEN. The explorer
// answers 401 without one.
import { readFileSync } from 'node:fs';

const BASE = 'https://explorer.lichess.ovh';

function token() {
  if (process.env.LICHESS_TOKEN) return process.env.LICHESS_TOKEN.trim();
  if (process.env.LICHESS_TOKEN_FILE) return readFileSync(process.env.LICHESS_TOKEN_FILE, 'utf8').trim();
  throw new Error('Lichess explorer needs LICHESS_TOKEN_FILE or LICHESS_TOKEN (it answers 401 without a token).');
}

/** One explorer lookup. `db` is 'lichess' (amateur, by `ratings`) or 'masters'.
 *  Retries a 429 after Lichess's own wait (a minute when it gives none);
 *  returns null when the explorer will not answer. */
export async function explorerLookup(fen, { db = 'lichess', ratings = '1000,1200,1400,1600,1800,2000', speeds = 'blitz,rapid,classical', moves = 30, attempts = 4 } = {}) {
  const q = db === 'masters'
    ? `fen=${encodeURIComponent(fen)}&moves=${moves}&topGames=0`
    : `variant=standard&speeds=${speeds}&ratings=${ratings}&moves=${moves}&topGames=0&recentGames=0&fen=${encodeURIComponent(fen)}`;
  const headers = { Authorization: `Bearer ${token()}` };
  for (let a = 0; a < attempts; a++) {
    const r = await fetch(`${BASE}/${db}?${q}`, { headers }).catch(() => null);
    if (r?.ok) return r.json();
    const wait = r?.status === 429 ? 1000 * Number(r.headers.get('retry-after') ?? 60) : 2000 * (a + 1);
    await new Promise((res) => setTimeout(res, wait));
  }
  return null;
}
