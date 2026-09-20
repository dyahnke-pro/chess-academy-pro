#!/usr/bin/env node
/**
 * probe-cdp-tap — attach to a running audit's Chromium (launched with
 * AUDIT_CDP_PORT=<port>) and record every exception / error log entry from
 * EVERY target, nested pthread workers included, keyed by worker URL. Runs
 * until the browser closes or TAP_MS elapses, then prints errors grouped by
 * worker and writes a report. #21 step 1: read the storm's real error on the
 * run that storms (the review audit), not on a probe that stays clean.
 *
 *   AUDIT_CDP_PORT=9333 node scripts/audit-review-overhaul-prod.mjs &
 *   node scripts/probe-cdp-tap.mjs        # same port, same browser
 */
import { mkdir, writeFile } from 'node:fs/promises';
const PORT = Number(process.env.AUDIT_CDP_PORT ?? 9333);
const TAP_MS = Number(process.env.TAP_MS ?? 45 * 60_000);
const OUT = `audit-reports/cdp-tap-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const shortUrl = (u) => (u || '').split('/').pop().split('?')[0];
const log = (s) => console.log(s);

async function connect() {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) {
    try { const v = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json()); if (v.webSocketDebuggerUrl) return v.webSocketDebuggerUrl; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`no Chromium on port ${PORT} within 120s`);
}
const url = await connect();
const ws = new WebSocket(url);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
const targets = new Map(); const errors = []; const census = [];
const attachAll = (sessionId) => send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId).catch(() => undefined);
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Target.attachedToTarget') {
    const { sessionId, targetInfo, waitingForDebugger } = m.params;
    targets.set(targetInfo.targetId, { url: shortUrl(targetInfo.url) || targetInfo.type, type: targetInfo.type, sessionId, t: Date.now() });
    await send('Runtime.enable', {}, sessionId).catch(() => undefined);
    await send('Log.enable', {}, sessionId).catch(() => undefined);
    await attachAll(sessionId);
    if (waitingForDebugger) await send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => undefined);
    return;
  }
  if (m.method === 'Target.targetInfoChanged') { const t = targets.get(m.params.targetInfo.targetId); if (t) t.url = shortUrl(m.params.targetInfo.url) || t.url; return; }
  if (m.method === 'Target.detachedFromTarget') { for (const [tid, t] of targets) if (t.sessionId === m.params.sessionId) targets.delete(tid); return; }
  const owner = [...targets.values()].find((t) => t.sessionId === m.sessionId);
  const wurl = owner?.url ?? 'browser';
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails ?? {};
    errors.push({ t: Date.now(), url: wurl, kind: 'exception', text: `${d.text ?? ''} ${d.exception?.description ?? d.exception?.value ?? ''}`.trim().slice(0, 300), at: `${shortUrl(d.url)}:${d.lineNumber ?? '?'}` });
  } else if (m.method === 'Runtime.consoleAPICalled' && /error|warning/.test(m.params.type)) {
    errors.push({ t: Date.now(), url: wurl, kind: `console.${m.params.type}`, text: (m.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
  } else if (m.method === 'Log.entryAdded' && /error|warning/.test(m.params.entry?.level ?? '')) {
    errors.push({ t: Date.now(), url: wurl, kind: `log.${m.params.entry.level}`, text: String(m.params.entry.text ?? '').slice(0, 300), at: shortUrl(m.params.entry.url) });
  } else if (m.method === 'Target.targetCrashed') {
    errors.push({ t: Date.now(), url: targets.get(m.params.targetId)?.url ?? '?', kind: 'crashed', text: `${m.params.status} code=${m.params.errorCode}` });
  }
};
await attachAll(undefined);
log(`[tap] attached on port ${PORT}`);
const t0 = Date.now(); let closed = false; ws.onclose = () => { closed = true; };
while (!closed && Date.now() - t0 < TAP_MS) {
  await new Promise((r) => setTimeout(r, 10_000));
  const by = {}; for (const t of targets.values()) if (t.type === 'worker') by[t.url] = (by[t.url] ?? 0) + 1;
  const n = Object.values(by).reduce((a, c) => a + c, 0);
  census.push({ t: Date.now(), n, by, errors: errors.length });
  if (n > 20 || census.length % 6 === 0) log(`[tap] +${Math.round((Date.now() - t0) / 1000)}s workers=${n} ${JSON.stringify(by)} errors=${errors.length}`);
}
const byUrl = {}; for (const e of errors) { (byUrl[e.url] ??= { n: 0, kinds: {}, msgs: new Map() }); byUrl[e.url].n += 1; byUrl[e.url].kinds[e.kind] = (byUrl[e.url].kinds[e.kind] ?? 0) + 1; const k = e.text.slice(0, 140); if (!byUrl[e.url].msgs.has(k)) byUrl[e.url].msgs.set(k, { at: e.at, n: 0 }); byUrl[e.url].msgs.get(k).n += 1; }
log('\n===== ERRORS BY WORKER =====');
for (const [u, v] of Object.entries(byUrl).sort((a, b) => b[1].n - a[1].n)) { log(`${String(v.n).padStart(8)}  ${u}  ${JSON.stringify(v.kinds)}`); for (const [msg, m] of [...v.msgs.entries()].slice(0, 5)) log(`            ×${m.n} ${m.at ?? ''} ${msg}`); }
const peak = census.reduce((a, c) => Math.max(a, c.n), 0); log(`peak workers: ${peak}`);
await mkdir(OUT, { recursive: true }); await writeFile(`${OUT}/report.json`, JSON.stringify({ port: PORT, census, errors, targets: [...targets.values()] }, null, 2));
log(`report: ${OUT}/report.json`);
process.exit(0);
