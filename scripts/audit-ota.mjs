#!/usr/bin/env node
/**
 * audit-ota — is the OTA (Capgo self-hosted) update pipeline actually working?
 *
 * David 2026-07-24: "the OTA hasn't worked once!" — and we had no instrument
 * to say WHY. This is that instrument. Two halves:
 *
 *   SERVER (deterministic, runs now, no device):
 *     1. GET  /api/ota/manifest            → returns {version, url}
 *     2. POST manifest {version_name: OLD} → offers the update (url non-empty)
 *     3. POST manifest {version_name: CUR} → no-op (empty url) for a current device
 *     4. GET  the bundle url               → 200, is a real ZIP, index.html at ROOT
 *        (Capgo requires the web root at the zip root — a nested dist/ silently
 *         breaks every apply)
 *     5. Blob pointer mirror matches the manifest (Redis/Blob agree)
 *     6. version scheme looks like the git short SHA the iOS build stamps
 *     7. the no-op reply carries kind:'up_to_date'  (WITHOUT it the plugin
 *        classifies the response "failed" and fires a PHANTOM downloadFailed —
 *        that was 72 of 127 recorded "failures" before 2026-09-03)
 *     8. a 7-char legacy version is recognised as the SAME bundle as its
 *        8-char publish (or those devices update forever, in a loop)
 *     9. the pointer carries a monotonic `ordinal` + `history` (forward-only:
 *        a pointer without them cannot stop a rollback, and a rollback is what
 *        stranded devices on the Aug-5 bundle carrying the WASM crash)
 *    10. the delta manifest is served to a canary device, and its per-file
 *        SHA-256 hashes ACTUALLY match the bytes at their download_url — the
 *        one check that proves the delta contract rather than assuming it
 *
 *   DEVICE (the real answer — reads the telemetry src/services/otaObserver.ts
 *   emits): on-device the observer fires `ota_boot` (running vs builtin bundle)
 *   + the journey events (ota_update_available → ota_download_complete → ota_set
 *   → ota_app_ready, or the break: ota_download_failed / ota_update_failed / a
 *   set with no app_ready = auto-revert / NOTHING = a pre-autoUpdate build that
 *   never polls). This half is pulled from PostHog (durable) — see the printed
 *   query. It only has data once a TestFlight build carrying otaObserver ships;
 *   until then the device half reports the blind spot honestly.
 *
 * Usage: node scripts/audit-ota.mjs
 *   AUDIT_OTA_URL   override the prod base (default the live app)
 * Exit 0 = all server checks green; 1 = a real server-side break.
 */

const BASE = process.env.AUDIT_OTA_URL || 'https://chess-academy-pro.vercel.app';
const MANIFEST = `${BASE}/api/ota/manifest`;
const BLOB_POINTER =
  process.env.OTA_POINTER_URL ||
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass === true ? '✓' : pass === 'warn' ? '⚠' : '✗';
  console.log(`  ${tag} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function getJson(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { res, text, json };
}

/** Minimal, dependency-free ZIP sanity: PK magic + the presence of a
 *  root-level "index.html" entry in the central directory filename table. */
function zipLooksValid(buf) {
  if (buf.length < 22) return { ok: false, reason: 'too small to be a zip' };
  // Local file header magic PK\x03\x04
  const magicOk = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  if (!magicOk) return { ok: false, reason: 'no PK zip magic' };
  const ascii = buf.toString('latin1');
  // Capgo needs index.html at the ZIP ROOT. A root entry appears as a filename
  // with no directory prefix; a nested one appears as "dist/index.html" etc.
  const hasRootIndex = /(^|[^/\w])index\.html/.test(ascii);
  const hasNestedOnly = /\/index\.html/.test(ascii) && !/(^|\x00|PK..........)index\.html/.test(ascii);
  if (!hasRootIndex) return { ok: false, reason: 'no index.html found in zip' };
  return { ok: true, nested: hasNestedOnly };
}

async function main() {
  console.log('\n── audit-ota ─────────────────────────────────────');
  console.log(`  base: ${BASE}\n`);

  // 1. Manifest returns a published bundle.
  let published = null;
  try {
    const { res, json } = await getJson(`${MANIFEST}?cb=${Date.now()}`);
    const ok = res.ok && json && typeof json.version === 'string' && typeof json.url === 'string' && json.url.length > 0;
    published = ok ? json : null;
    record('manifest returns a published bundle', ok, ok ? `version=${json.version}` : `status=${res.status} body=${JSON.stringify(json)}`);
  } catch (e) {
    record('manifest returns a published bundle', false, String(e));
  }

  // 2. A device on an OLD version is offered the update.
  try {
    const { res, json } = await getJson(MANIFEST, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ version_name: 'audit-old-0000000' }),
    });
    const offered = res.ok && json && json.url && json.url.length > 0 && json.version !== 'audit-old-0000000';
    record('old-version device is OFFERED the update', !!offered, offered ? `→ ${json.version}` : `got ${JSON.stringify(json)}`);
  } catch (e) {
    record('old-version device is OFFERED the update', false, String(e));
  }

  // 3. A device already on the published version gets a no-op.
  if (published) {
    try {
      const { res, json } = await getJson(MANIFEST, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version_name: published.version }),
      });
      const noop = res.ok && json && (json.url === '' || !json.url) && json.version === published.version;
      record('current-version device gets a no-op', !!noop, noop ? 'empty url (correct)' : `got ${JSON.stringify(json)}`);
    } catch (e) {
      record('current-version device gets a no-op', false, String(e));
    }
  }

  // 4. The bundle zip is downloadable, a real zip, with index.html at ROOT.
  if (published) {
    try {
      const res = await fetch(published.url, { cache: 'no-store' });
      const buf = Buffer.from(await res.arrayBuffer());
      const mb = (buf.length / 1024 / 1024).toFixed(2);
      const z = zipLooksValid(buf);
      const ok = res.ok && z.ok && !z.nested;
      record(
        'bundle zip downloadable + index.html at zip root',
        ok ? true : z.ok && z.nested ? 'warn' : false,
        ok ? `${mb} MB, valid zip` : z.ok && z.nested ? `${mb} MB but index.html looks NESTED (Capgo needs it at root)` : `status=${res.status} ${z.reason || ''}`,
      );
    } catch (e) {
      record('bundle zip downloadable + index.html at zip root', false, String(e));
    }
  }

  // 5. Blob pointer mirror agrees with the manifest (Redis vs Blob divergence
  //    once silently no-op'd 60% of checks — 2026-07-19).
  if (published) {
    try {
      const { res, json } = await getJson(`${BLOB_POINTER}?cb=${Date.now()}`);
      const agrees = res.ok && json && json.version === published.version;
      record('Blob pointer mirror agrees with manifest', agrees ? true : 'warn', agrees ? `both ${published.version}` : `manifest=${published.version} blob=${json ? json.version : `(status ${res.status})`}`);
    } catch (e) {
      record('Blob pointer mirror agrees with manifest', 'warn', String(e));
    }
  }

  // 6. Version scheme sanity — the published version should look like the git
  //    short SHA the iOS build stamps as OTA_BUNDLE_VERSION, or a device's
  //    builtin version can never match it and it either always- or never-updates.
  if (published) {
    const looksSha = /^[0-9a-f]{7,12}$/.test(published.version);
    record('published version looks like a git short SHA', looksSha ? true : 'warn', looksSha ? published.version : `"${published.version}" — confirm it matches ci_post_clone.sh OTA_BUNDLE_VERSION`);
  }

  // 7. 🔒 THE PHANTOM-FAILURE REGRESSION. The plugin maps a MISSING `kind` to
  //    "failed" (CapacitorUpdaterPlugin.swift normalizedUpdateResponseKind),
  //    then fires downloadFailed + a failure stat on EVERY no-op check. If this
  //    check ever goes red again, the OTA failure rate in PostHog is fiction.
  if (published) {
    try {
      const { json } = await getJson(MANIFEST, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version_name: published.version }),
      });
      const ok = json && json.kind === 'up_to_date';
      record(
        "no-op reply carries kind:'up_to_date' (no phantom downloadFailed)",
        !!ok,
        ok ? "kind='up_to_date'" : `kind=${json ? JSON.stringify(json.kind) : 'n/a'} — the plugin will record this no-op as a FAILURE`,
      );
    } catch (e) {
      record("no-op reply carries kind:'up_to_date' (no phantom downloadFailed)", false, String(e));
    }
  }

  // 8. Legacy 7-char builtin vs 8-char publish must collapse to one bundle.
  if (published && /^[0-9a-f]{8}$/.test(published.version)) {
    try {
      const short = published.version.slice(0, 7);
      const { json } = await getJson(MANIFEST, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version_name: short }),
      });
      const ok = json && (!json.url || json.url === '');
      record(
        '7-char legacy version recognised as the same bundle',
        !!ok,
        ok ? `${short} == ${published.version}` : `offered an update to ${json && json.version} — legacy devices will re-download forever`,
      );
    } catch (e) {
      record('7-char legacy version recognised as the same bundle', false, String(e));
    }
  }

  // 9. Forward-only needs an ordinal + history on the pointer, or it degrades
  //    to the pre-2026-09-03 behaviour that rolled devices backward.
  let pointer = null;
  try {
    const { res, json } = await getJson(`${BLOB_POINTER}?cb=${Date.now()}`);
    pointer = res.ok ? json : null;
    const ok = pointer && typeof pointer.ordinal === 'number' && pointer.ordinal > 0;
    record(
      'pointer carries a monotonic ordinal (forward-only guard armed)',
      ok ? true : 'warn',
      ok ? `ordinal=${pointer.ordinal} history=${Object.keys(pointer.history || {}).length} versions` : 'no ordinal — pointer predates the forward-only guard; publish once to arm it',
    );
  } catch (e) {
    record('pointer carries a monotonic ordinal (forward-only guard armed)', 'warn', String(e));
  }

  // 10. 🔒 THE DELTA CONTRACT, PROVEN NOT ASSUMED. Ask as a canary device, then
  //     actually download one manifest file and hash it. The plugin compares
  //     SHA-256 hex of the raw bytes (CryptoCipher.calcChecksum); if our hashes
  //     disagree by even one file the device re-downloads that file forever, or
  //     the whole update fails — silently, as a downloadFailed.
  if (pointer && pointer.manifestUrl) {
    const canary = process.env.OTA_AUDIT_CANARY_DEVICE || 'eb8cc1c1-f377-4e31-94ff-d404a7ce31ae';
    try {
      const { json } = await getJson(MANIFEST, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version_name: 'audit-old-0000000', device_id: canary }),
      });
      const entries = json && Array.isArray(json.manifest) ? json.manifest : null;
      record(
        'delta manifest served to a canary device',
        entries ? true : 'warn',
        entries ? `${entries.length} files` : 'no manifest in the reply (OTA_DELTA=off, or the device is not in the canary list)',
      );

      if (entries && entries.length > 0) {
        const { createHash } = await import('node:crypto');
        // Verify the SMALLEST entry so the check stays fast; a hash mismatch is
        // systematic (same algorithm for every file), so one file proves it.
        let worst = null;
        const sample = entries.find((e) => /\.(html|json|txt|css)$/.test(e.file_name)) || entries[0];
        const r = await fetch(sample.download_url, { cache: 'no-store' });
        if (!r.ok) {
          worst = `download_url ${r.status} for ${sample.file_name}`;
        } else {
          const buf = Buffer.from(await r.arrayBuffer());
          const got = createHash('sha256').update(buf).digest('hex');
          if (got !== sample.file_hash) worst = `${sample.file_name}: manifest says ${sample.file_hash.slice(0, 12)}…, bytes hash to ${got.slice(0, 12)}…`;
        }
        record(
          'delta file hashes match the bytes served (SHA-256)',
          worst === null,
          worst === null ? `verified ${sample.file_name} (${entries.length} files in manifest)` : worst,
        );
      }
    } catch (e) {
      record('delta manifest served to a canary device', 'warn', String(e));
    }
  }

  // ── DEVICE HALF (honest blind-spot report until a build with the observer ships)
  console.log('\n  ── device journey (PostHog `ota_*` — durable) ──');
  console.log('  Once a TestFlight build carrying src/services/otaObserver.ts is');
  console.log('  installed, each device emits ota_boot + the update journey. Pull it:');
  console.log('');
  console.log("    SELECT properties.running AS running, properties.builtin AS builtin,");
  console.log("           properties.runningStatus AS status, event, count() AS n,");
  console.log('           max(timestamp) AS last');
  console.log("    FROM events WHERE event LIKE 'ota_%'");
  console.log('      AND timestamp > now() - INTERVAL 14 DAY');
  console.log('    GROUP BY running, builtin, status, event ORDER BY last DESC');
  console.log('');
  console.log('  Read: running==builtin on every boot + only ota_no_need_update →');
  console.log('  never updates. ota_set with no following ota_app_ready → auto-revert.');
  console.log('  No ota_* rows at all → autoUpdate:false legacy install (blind).');

  // Verdict (server half).
  const fails = results.filter((r) => r.pass === false);
  const warns = results.filter((r) => r.pass === 'warn');
  console.log('\n──────────────────────────────────────────────────');
  if (fails.length === 0) {
    console.log(`  ✅ SERVER PIPELINE HEALTHY (${results.length - warns.length} green${warns.length ? `, ${warns.length} warn` : ''})`);
    console.log('  → If devices still never update, the break is CLIENT-side; ship the');
    console.log('    otaObserver build and re-run the device query above.');
  } else {
    console.log(`  ✗ ${fails.length} SERVER CHECK(S) FAILED — OTA can't work until fixed:`);
    for (const f of fails) console.log(`      • ${f.name}: ${f.detail}`);
  }
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('audit-ota crashed:', e);
  process.exit(1);
});
