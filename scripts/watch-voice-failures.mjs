// Voice-failure watch — pulls the live audit-stream and surfaces any
// voice/TTS failures since a cursor. Driven by the audit-watch cron
// workflow (every ~10 min). The point: catch "no audio on older
// iPhones"-class failures the moment a tester hits them, instead of
// waiting for a screen-recording.
//
// Failure kinds we alert on:
//   - tts-failure       Polly fetched but couldn't play / iOS element
//                       playback error (voiceService.playViaElement).
//   - polly-fallback    Polly cooled down / errored.
//   - voice-fallover    Polly → Web Speech demotion.
//
// Env:
//   PROD_URL             default https://chess-academy-pro.vercel.app
//   AUDIT_STREAM_SECRET  x-audit-secret (repo secret; required)
//   SINCE_MS             only events newer than this epoch-ms (default 20m ago)
//   OUT_FILE             path to write the failures JSON (default /tmp/voice-failures.json)
//   GITHUB_OUTPUT        when set, writes count / maxTs / hasFailures outputs

import { writeFile, appendFile } from 'node:fs/promises';

const PROD_URL = (process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const SINCE_MS = Number(process.env.SINCE_MS ?? Date.now() - 20 * 60_000);
const OUT_FILE = process.env.OUT_FILE ?? '/tmp/voice-failures.json';

const FAILURE_KINDS = new Set(['tts-failure', 'polly-fallback', 'voice-fallover']);

async function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

async function main() {
  if (!SECRET) {
    console.log('[watch] AUDIT_STREAM_SECRET not set — skipping.');
    await setOutput('count', '0');
    await setOutput('hasFailures', 'false');
    return;
  }

  const url = `${PROD_URL}/api/audit-stream?since=${SINCE_MS}`;
  let res;
  try {
    res = await fetch(url, { headers: { 'x-audit-secret': SECRET }, cache: 'no-store' });
  } catch (err) {
    console.error(`[watch] fetch failed: ${err.message}`);
    await setOutput('count', '0');
    await setOutput('hasFailures', 'false');
    return;
  }
  if (!res.ok) {
    console.error(`[watch] ${res.status} ${res.statusText}`);
    await setOutput('count', '0');
    await setOutput('hasFailures', 'false');
    return;
  }

  const parsed = await res.json();
  // The endpoint returns { entries, count, storage }.
  const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  const failures = entries.filter((e) => FAILURE_KINDS.has(e.kind));
  failures.sort((a, b) => a.timestamp - b.timestamp);

  const maxTs = failures.length ? failures[failures.length - 1].timestamp : SINCE_MS;
  console.log(
    `[watch] storage=${parsed.storage} window-since=${new Date(SINCE_MS).toISOString()} ` +
      `total=${entries.length} failures=${failures.length}`,
  );
  for (const f of failures) {
    console.log(`    ${new Date(f.timestamp).toISOString()}  ${f.kind}  ${f.source}  ${f.summary}`);
  }

  await writeFile(OUT_FILE, JSON.stringify({ since: SINCE_MS, maxTs, failures }, null, 2));
  await setOutput('count', String(failures.length));
  await setOutput('maxTs', String(maxTs));
  await setOutput('hasFailures', failures.length > 0 ? 'true' : 'false');
}

main();
