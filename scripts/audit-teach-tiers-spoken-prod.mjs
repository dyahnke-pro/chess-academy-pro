// TIER-1/TIER-2 AUDIBLE PROOF (David 2026-07-30 walkthrough architecture):
// "teach me <X>" on LIVE prod must SPEAK the tier's AUTHORED narration —
// masterclass beats (Tier 1, adapted LessonScript) or the baked video
// narration (Tier 2, walkthrough-narrations.json). Marks are computed from
// the tier's shipped source, so a pass proves the RIGHT tier fired, not just
// that something spoke. Clone of audit-teach-corpus-spoken-prod's drive.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   AUDIT_TIER=baked AUDIT_OPENING="latvian gambit" \
//   node scripts/audit-teach-tiers-spoken-prod.mjs
//   # AUDIT_TIER=masterclass AUDIT_OPENING="caro-kann" — Tier-1 variant
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'latvian gambit';
const TIER = process.env.AUDIT_TIER || 'baked';

const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
const clean = (t) => norm(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
const toMarks = (texts) => {
  const marks = [];
  for (const t of texts) {
    const words = clean(t).split(' ');
    if (words.length >= 8) marks.push(words.slice(1, 8).join(' '));
  }
  return marks;
};

let marks = [];
if (TIER === 'baked') {
  const baked = JSON.parse(await readFile('src/data/walkthrough-narrations.json', 'utf8'));
  const key = norm(ASK).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  // Mark sourcing mirrors the runtime lookup: exact key first, then any
  // entry whose key contains every ask token (the runtime's name match is
  // fuzzy — probing with the short auto-accepting ask must still find marks).
  // The runtime resolves an ASK through NAME_ALIASES before looking up the
  // bake ("jobava london" → "Rapport-Jobava System"), so a probe that only
  // token-matches the raw ask reports a FALSE FAIL on every aliased opening
  // (2026-07-31: Jobava failed here while the app served it correctly). Ask
  // the app for the canonical name first, exactly as the runtime does.
  let canonical = ASK;
  try {
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync('npx', ['tsx', 'scripts/danya-corpus/print-spine.mts', ASK], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000,
    }).trim().split('\n').pop();
    canonical = JSON.parse(out).canonicalName ?? ASK;
  } catch { /* fall back to the raw ask */ }
  const canonKey = norm(canonical).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const entry = baked.narrations[canonKey]
    ?? baked.narrations[key]
    ?? Object.entries(baked.narrations).find(([k]) => canonKey.split(' ').every((t) => k.includes(t)))?.[1]
    ?? Object.entries(baked.narrations).find(([k]) => key.split(' ').every((t) => k.includes(t)))?.[1];
  if (!entry) { console.log(`✗ FAIL: no baked narration for "${ASK}" (canonical "${canonical}")`); process.exit(1); }
  marks = toMarks([entry.intro, ...entry.ideas.map((i) => i.text)]);
} else {
  // masterclass: marks from the registered LessonScript's beats (tsx bridge —
  // the lesson lives in TS).
  const { execFileSync } = await import('node:child_process');
  const raw = execFileSync('npx', ['tsx', '--eval', `
    import { findLessonForQuery } from './src/data/lessons/index';
    const hit = findLessonForQuery(${JSON.stringify(ASK)});
    console.log(JSON.stringify(hit ? hit.lesson.beats.map((b) => b.say) : []));
  `], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000 }).trim().split('\n').pop();
  const says = JSON.parse(raw);
  if (says.length === 0) { console.log(`✗ FAIL: no masterclass lesson resolves for "${ASK}"`); process.exit(1); }
  marks = toMarks(says);
}
console.log(`[probe] tier=${TIER} "${ASK}" — ${marks.length} marks from the shipped source`);

const listener = await startAuditListener();
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await blockTtsNetwork(p);   // instrument keeps the request; the provider never sees it
const ttsTexts = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    try { ttsTexts.push(new URL(r.url()).searchParams.get('text') ?? ''); } catch { /* malformed */ }
  }
});

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

let seenSpoken = null;
let detail = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Attach the narration listener on PROD too, not just localhost. The old
  // http:// gate meant every prod run silently reported listener=0 and the
  // 3-instrument standard degraded to two (Playwright + /api/tts decode) —
  // and a decoded TTS request is NOT proof the app spoke. Chromium treats
  // http://localhost as a potentially-trustworthy origin, so an https page
  // may post to it; the listener already sends the CORS + private-network
  // headers that allows.
  // Seed the profile DIRECTLY (url AND secret) then reload so App.init()
  // hydrates its config cache from it. Two bugs kept listener=0 on every
  // run: the old code wrote only localStorage — which the app migrates from
  // just once, and only when a profile already exists, so a write right
  // after goto() lands too late — and it never set the SECRET at all, so
  // the listener 401'd whatever did arrive.
  await p.evaluate(({ url, secret }) => new Promise((res) => {
    const o = indexedDB.open('ChessAcademyDB');
    o.onsuccess = () => {
      const dbi = o.result;
      try {
        const tx = dbi.transaction('profiles', 'readwrite');
        const g = tx.objectStore('profiles').get('main');
        g.onsuccess = () => {
          const prof = g.result;
          if (prof) {
            prof.preferences = { ...prof.preferences, auditStreamUrl: url, auditStreamSecret: secret };
            tx.objectStore('profiles').put(prof);
          }
        };
        tx.oncomplete = () => { dbi.close(); res(true); };
        tx.onerror = () => { dbi.close(); res(false); };
      } catch { dbi.close(); res(false); }
    };
    o.onerror = () => res(false);
  }), { url: listener.url, secret: listener.secret }).catch(() => undefined);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await dismiss(); await dismiss();

  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box.press('Enter');

  const started = Date.now();
  while (Date.now() - started < 420000 && !seenSpoken) {
    await p.waitForTimeout(4000);
    const spokenPool = clean([
      ...ttsTexts,
      ...listener.getCapturedEvents().map((e) => `${e.summary ?? ''} ${e.details ?? ''}`),
    ].join(' '));
    for (const mark of marks) if (!seenSpoken && spokenPool.includes(mark)) seenSpoken = mark;
    try {
      const skip = p.locator('[data-testid="walkthrough-skip"], button:has-text("Continue")').first();
      if (await skip.isVisible({ timeout: 500 })) await skip.click({ force: true });
    } catch { /* nothing to nudge */ }
  }
  detail = `spoken=${seenSpoken ? 'YES' : 'NO'} tts=${ttsTexts.length} listener=${listener.getCapturedEvents().length} (${Math.round((Date.now() - started) / 1000)}s)`;
} catch (e) {
  detail = `ERROR ${String(e).slice(0, 140)}`;
}
await writeFile(`/tmp/teach-tier-${TIER}-tts.json`, JSON.stringify({ ask: ASK, tier: TIER, ttsTexts }, null, 1)).catch(() => undefined);
await b.close();
await listener.stop().catch(() => undefined);

try {
  const since = Date.now() - 15 * 60 * 1000;
  const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': process.env.AUDIT_STREAM_SECRET ?? '' } });
  if (res.ok) {
    const events = (await res.json()).entries ?? [];
    const rel = events.filter((e) => /llm-error|reword|danyaSplice|bakedVideoNarration|cache-invalidated/i.test(`${e.kind} ${e.source}`));
    for (const e of rel.slice(-6)) console.log(`  [prod-audit] ${e.kind} | ${e.source} | ${(e.summary ?? '').slice(0, 110)}`);
  }
} catch { /* stream optional */ }

const ok = !!seenSpoken;
console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: teach-me-${ASK} speaks the ${TIER} tier narration — ${detail}`);
if (seenSpoken) console.log(`  spoken mark: "${seenSpoken}"`);
console.log(`  tts transcript → /tmp/teach-tier-${TIER}-tts.json`);
process.exit(ok ? 0 : 1);
