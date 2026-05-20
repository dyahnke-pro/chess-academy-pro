// Poll the live prod URL until it serves the build for a specific git
// commit, then exit 0. Used by .github/workflows/post-deploy-audit.yml
// so the post-deploy Playwright audit runs against the bundle we just
// pushed — never a stale one (the 2026-05-14 back-button incident:
// auditing the old alias chases regressions that aren't shipped yet).
//
// How it knows which build is live: vite stamps every build with
// `__BUILD_ID__ = "<git-short-sha>+<unix-ms>"` (see vite.config.ts).
// That string is inlined into appAuditor's chunk, which App.tsx imports
// statically — so it lands in the entry chunk or a modulepreloaded core
// chunk referenced by index.html. We fetch index.html, crawl its JS
// asset URLs, and look for the expected short SHA substring.
//
// Env:
//   PROD_URL       prod origin (default https://chess-academy-pro.vercel.app)
//   EXPECTED_SHA   git short sha to wait for (required)
//   TIMEOUT_MS     give-up budget (default 900000 = 15 min)
//   INTERVAL_MS    poll cadence (default 15000 = 15 s)

const PROD_URL = (process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const EXPECTED_SHA = (process.env.EXPECTED_SHA ?? '').trim();
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 900_000);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 15_000);

if (!EXPECTED_SHA) {
  console.error('[wait-for-prod-build] EXPECTED_SHA is required');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

async function servedSha() {
  const bust = `?_=${Date.now()}`;
  const html = await fetchText(`${PROD_URL}/${bust}`);
  // Collect every /assets/*.js referenced by the shell (entry script +
  // modulepreload chunks). dedupe.
  const assetPaths = [...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0]))];
  if (assetPaths.length === 0) return { found: false, assetCount: 0 };
  for (const path of assetPaths) {
    let js;
    try {
      js = await fetchText(`${PROD_URL}${path}${bust}`);
    } catch {
      continue;
    }
    // Build id is "<sha>+<ms>" — match the sha immediately followed by '+'
    // to avoid coincidental hex collisions with asset hashes.
    if (js.includes(`${EXPECTED_SHA}+`)) return { found: true, assetCount: assetPaths.length, path };
  }
  return { found: false, assetCount: assetPaths.length };
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;
  console.log(`[wait-for-prod-build] waiting for ${EXPECTED_SHA} at ${PROD_URL} (budget ${Math.round(TIMEOUT_MS / 1000)}s)`);
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const r = await servedSha();
      if (r.found) {
        console.log(`[wait-for-prod-build] live build matches ${EXPECTED_SHA} (in ${r.path}) after ${attempt} attempt(s)`);
        process.exit(0);
      }
      console.log(`[wait-for-prod-build] attempt ${attempt}: ${EXPECTED_SHA} not live yet (${r.assetCount} asset(s) checked)`);
    } catch (err) {
      console.log(`[wait-for-prod-build] attempt ${attempt}: fetch error — ${err.message}`);
    }
    await sleep(INTERVAL_MS);
  }
  console.error(`[wait-for-prod-build] TIMEOUT — ${EXPECTED_SHA} never went live within ${Math.round(TIMEOUT_MS / 1000)}s`);
  process.exit(1);
}

main();
