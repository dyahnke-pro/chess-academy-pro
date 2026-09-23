#!/usr/bin/env node
// DURABLE PREFLIGHT for the iOS marketing version (2026-09-09) — the cure the
// ci_post_clone comment has begged for since the 9th "Preparing build for App
// Store Connect failed" incident. A hardcoded MARKETING_VERSION goes stale the
// instant Apple releases that version: the App Store closes a released version's
// train, so the next Xcode Cloud archive dies ~9 minutes in with an ITMS-90062
// "must contain a higher version". Ten identical incidents (2.8 … 4.0.2).
//
// This resolves the version to actually build with: read the LIVE App Store
// version from Apple's PUBLIC iTunes lookup (no App Store Connect keys needed,
// reachable from CI), and if the pinned version is not already ABOVE it, bump
// the patch above the live version. So a forgotten bump self-heals instead of
// burning a 9-minute build.
//
// Prints ONE line — the version to use — and NOTHING else, so ci_post_clone can
// capture it. On ANY error (network, parse, unexpected shape) it prints the
// pinned version unchanged: staying on the pinned string is exactly today's
// behavior, so the preflight can only ever help, never break a build.
//
// Caveat: the public lookup shows the RELEASED version only. An approved-but-
// unreleased train (the 4.0.1 window) needs the ASC train query (keys already in
// the workflow) — a future addition; this covers every released-version case,
// which is 9 of the 10 incidents.

const APP_ID = '6776418777';

const pinned = (process.argv[2] || '').trim();
const isSemver = (v) => /^\d+\.\d+(\.\d+)?$/.test(v);

/** Parse "X.Y.Z" → [X,Y,Z] (missing patch → 0). Returns null if malformed. */
function parts(v) {
  if (!isSemver(v)) return null;
  const p = v.split('.').map(Number);
  return [p[0], p[1], p[2] ?? 0];
}
/** a > b ? */
function gt(a, b) {
  for (let i = 0; i < 3; i += 1) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}

async function main() {
  // No valid pinned arg → nothing safe to fall back to; emit whatever we got.
  const pp = parts(pinned);
  if (!pp) { process.stdout.write(pinned); return; }

  // 🔴 READ EVERY STOREFRONT AND TAKE THE HIGHEST (2026-09-23). This used to
  // read `country=us` only. Apple's storefronts do not update together: 4.0.4
  // released at 00:21 UTC and four hours later the GLOBAL lookup said 4.0.4
  // while `country=us` still said 4.0.3 — so the preflight judged the closed
  // 4.0.4 train "above live", kept it, and Xcode Cloud run #202 died at
  // "Preparing build for App Store Connect". The highest version any
  // storefront reports is the one whose train is closed.
  let live = null;
  for (const qs of ['', '&country=us']) {
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${APP_ID}${qs}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const j = await res.json();
      const v = parts(j?.results?.[0]?.version ?? '');
      if (v && (!live || gt(v, live))) live = v;
    } catch { /* offline / blocked — try the next storefront, then fall through to pinned */ }
  }

  // No live read, or pinned already exceeds live → keep pinned.
  if (!live || gt(pp, live)) { process.stdout.write(pinned); return; }

  // Pinned is at or below the live (released) version → bump patch above live.
  process.stdout.write(`${live[0]}.${live[1]}.${live[2] + 1}`);
}

main().catch(() => process.stdout.write(pinned));
