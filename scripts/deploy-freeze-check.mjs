#!/usr/bin/env node
/**
 * deploy-freeze-check — alarm for the failure that ate 2026-06-14/15: prod
 * silently frozen behind `main` (the Vercel Ignored Build Step was `exit 0`,
 * cancelling every deploy; nobody noticed for ~2 days because "it committed
 * fine"). There was ZERO monitoring for it. This is that monitoring.
 *
 * Signal (timestamp-based so it's robust to git-triggered vs manual `vercel
 * deploy --prebuilt` deploys — no commit-SHA matching needed):
 *   FROZEN  ⇔  the latest `main` commit is older than THRESHOLD_MS AND no
 *             READY production deployment was created AFTER that commit.
 * i.e. a commit landed, the deploy window elapsed, and prod never caught up.
 * Normal batched-lag (commit just landed, deploy in flight) does NOT trip it
 * because the commit hasn't aged past the threshold yet.
 *
 * Exit 1 on freeze → the health-check job fails → emails the repo owner (the
 * same zero-config alert the rest of health-check uses). Non-fatal/skips when
 * VERCEL_TOKEN is absent (logs and exits 0) so it never breaks the probe.
 *
 * Env: VERCEL_TOKEN (Vercel API), GITHUB_SHA + checkout (main HEAD + its time).
 */
import { execSync } from 'node:child_process';

const PROJECT_ID = 'prj_qYJMwF1apaxdp6sIZzcvZMz9BcZN';
const TEAM_ID = 'team_EG9m215w9cQHWilBOPnOtIFS';
// Generous: covers npm install + vite build + Vercel queue. A real freeze
// stays tripped; a normal deploy clears well inside this.
const THRESHOLD_MS = 45 * 60 * 1000;

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.log('[deploy-freeze] VERCEL_TOKEN not set — skipping (non-fatal).');
  process.exit(0);
}

function mainCommitTimeMs() {
  try {
    const ct = execSync('git log -1 --format=%ct HEAD', { encoding: 'utf8' }).trim();
    return Number(ct) * 1000;
  } catch (err) {
    console.log('[deploy-freeze] could not read HEAD commit time — skipping:', err?.message ?? err);
    return null;
  }
}

const main = async () => {
  const commitMs = mainCommitTimeMs();
  if (commitMs === null) process.exit(0);
  const ageMin = Math.round((Date.now() - commitMs) / 60000);

  const r = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&target=production&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    console.log(`[deploy-freeze] Vercel API ${r.status} — skipping (non-fatal).`);
    process.exit(0);
  }
  const { deployments = [] } = await r.json();
  const ready = deployments.filter((d) => (d.readyState ?? d.state) === 'READY');
  const latestReadyMs = ready.length ? Math.max(...ready.map((d) => d.created ?? 0)) : 0;

  const prodAfterCommit = latestReadyMs >= commitMs;
  const aged = Date.now() - commitMs > THRESHOLD_MS;

  console.log(`[deploy-freeze] main HEAD age=${ageMin}m; latest READY prod ${latestReadyMs ? new Date(latestReadyMs).toISOString() : 'NONE'}; commit ${new Date(commitMs).toISOString()}`);

  if (!prodAfterCommit && aged) {
    console.error(
      `::error::DEPLOY FROZEN — main HEAD is ${ageMin}m old and NO production deploy has gone READY since it. ` +
      `Prod is serving stale code. Check Vercel Ignored Build Step + the daily-deploy/iOS pipeline.`,
    );
    process.exit(1);
  }
  console.log('[deploy-freeze] OK — prod is tracking main (or within the deploy window).');
};

main().catch((e) => {
  // Never let the freeze probe itself become a flaky failure.
  console.log('[deploy-freeze] check errored — skipping (non-fatal):', e?.message ?? e);
  process.exit(0);
});
