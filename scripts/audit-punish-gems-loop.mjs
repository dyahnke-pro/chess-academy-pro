#!/usr/bin/env node
/**
 * Punish-gems + WLPP interactive loop audit — POST-DEPLOY CONTRACT (G7).
 *
 * David's contract (2026-05-23): "Three CONSECUTIVE passes, each digging
 * deeper and challenging the code harder, with ZERO errors = pass. Not just
 * 3 passes." This runs three escalating tiers in one sweep; the contract is
 * MET only when ALL THREE come back with 0 errors. Any error fails the sweep
 * — you fix and re-run until you get a clean 3/3.
 *
 *   Tier 1 — BREADTH / happy path. Every gem-bearing opening: card renders,
 *            every gem carries the 4 WLPP buttons, Watch mounts the played-
 *            out line and the Watch prose actually fires on the wire.
 *   Tier 2 — FAILURE MODES. Cold IndexedDB, no-gem tab self-hide, pick-
 *            before-load, out-of-order mode switching, the Caro named-trap
 *            Learn path, AND the voice contract decoded off /api/tts:
 *            Learn DICTATES THE MOVE ONLY (no prose/cue) + shows the written
 *            narration below the board, Practice fires NOTHING.
 *   Tier 3 — ADVERSARIAL / stress. Wrong move in Learn (board rejects, no
 *            desync), rapid mode toggling (no leak), full Watch playout to
 *            completion, Practice silence under interaction. Zero pageerrors
 *            / unhandledrejection across the whole tier.
 *
 * The WLPP contract being proven (David): Watch = authored prose narration,
 * Learn = the voice DICTATES THE MOVE ONLY ("Knight to d 5" — never prose or
 * the cue) while the move's WRITTEN narration shows below the board, and the
 * opponent's reply is voice-promise-gated so the dictation is never cut off
 * (David 2026-06-05, supersedes the 2026-05-24 "Learn follows the setting"
 * rule), Practice = silent, Play = coach room.
 *
 * Run (sandbox): npm run dev, then
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-punish-gems-loop.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
// Instrument 3 (G1): the narration listener sidecar. When AUDIT_LISTENER_URL
// is set, every page points its auditStreamUrl localStorage at the local
// listener so the app POSTs its voice/speak/narration events there — proving
// Ruth ACTUALLY SPOKE in the running app, not just that /api/tts was hit.
const LISTENER_URL = process.env.AUDIT_LISTENER_URL || '';

// Data-driven: only WEAPON-tier gems (engine-verified ≥+0.5) surface, so the
// audit tests exactly the openings that actually have a weapon — not a
// hardcoded list. If the engine bar leaves an opening gem-less, its card
// self-hides and there's nothing to drive there.
const GEMS = JSON.parse(await readFile('src/data/punish-gems.json', 'utf-8'));
const WEAPON = new Set(['confirmed', 'positional']);
// POST-DEPLOY: this is THE masterclass post-deploy audit (David 2026-05-24) —
// it must verify EVERY masterclass line is integrated, not just today's gem
// work. Walk EVERY masterclass opening and every variation tab's WLPP. The
// scope is derived from opening-manifests.json (the canonical masterclass
// list) so a NEW masterclass opening is auto-in-scope — no hardcoded list to
// drift (was the original 4 openings; widened 2026-05-26 per the living-audit
// rule when the manifest grew to 39).
// AUDIT_OPENING=<id> scopes a run to ONE opening so they can run in
// parallel (one audit per opening — David OK'd that).
const ONLY = (process.env.AUDIT_OPENING || '').trim();
const MANIFESTS = JSON.parse(await readFile('src/data/opening-manifests.json', 'utf-8'));
let MASTERCLASS = Object.keys(MANIFESTS).filter((k) => !k.startsWith('_'));
let GEM_OPENINGS = [...new Set(GEMS.filter((g) => WEAPON.has(g.tier)).map((g) => g.openingId))];
if (ONLY) { MASTERCLASS = MASTERCLASS.filter((o) => o === ONLY); GEM_OPENINGS = GEM_OPENINGS.filter((o) => o === ONLY); }
const PRIMARY = GEM_OPENINGS[0]; // opening used for the deep voice/WLPP probes

// Console noise that is NOT a bug in the sandbox (firewalled prod + the dev
// server having no /api/tts function). Real app bugs are anything else.
const NOISE = [
  /ERR_CERT/i, /net::ERR_/i, /Failed to load resource/i,
  /\/api\/tts/i, /\/api\/audit-stream/i, /favicon/i, /Polly/i,
  /tts-failure/i, /the server responded with a status of 404/i,
  // The eval-bar's Stockfish WASM worker can trap ("unreachable") under heavy
  // concurrency (4 audits × their own Stockfish workers). It's not part of the
  // gems/WLPP surface and doesn't repeat across passes — environmental.
  /\[Stockfish\]/i, /RuntimeError: unreachable/i, /worker\.onerror/i,
  // The coach LLM (DeepSeek/Anthropic) has NO API key in the sandbox, so any
  // surface that reaches the brain (e.g. gem-Play → coach room) logs a
  // connection error. Environmental, not a masterclass bug — verify coach
  // narration on a funded/prod run (same caveat as the TTS noise above).
  /\[CoachAPI\]/i, /APIConnectionError/i, /Connection error/i,
];
const isNoise = (s) => NOISE.some((re) => re.test(s));

function ttsTextOf(url) {
  const m = url.match(/[?&]text=([^&]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
// Move dictation looks like "Knight to f 3" / "Pawn to e 4" / "Castle
// kingside" / "e takes d 5" — short, no full-sentence prose.
const isMoveDictation = (t) =>
  /^([A-Z][a-z]+ to [a-h] [1-8]|Castle (kingside|queenside)|[a-h] takes [a-h] [1-8]|[A-Z][a-z]+ takes [a-h] [1-8])/.test(t.trim()) &&
  t.trim().split(/\s+/).length <= 6;
const isProse = (t) => t.trim().split(/\s+/).length > 6;
// voiceService.warmup() probes Polly with a one-char "." — that's an
// availability ping, NOT narration. Exclude it from the contract checks.
const isWarmupProbe = (t) => t.trim() === '.' || t.trim() === '';
const narrationTexts = (ev) => ev.tts.map((r) => r.text).filter((t) => t && !isWarmupProbe(t));

// Correctness helpers — prove the RIGHT content, not just that something mounted.
const gemIdOf = (g) => `${g.openingId}:${g.lineMoves.replace(/\s+/g, '_')}:${g.inaccuracy}`;
// A spoken move → its destination token ("Knight to f 3"→"f3", "Castle
// kingside"→"OO"), so a Learn line can be fingerprinted from its dictation.
function destToken(spoken) {
  if (/Castle kingside/.test(spoken)) return 'OO';
  if (/Castle queenside/.test(spoken)) return 'OOO';
  const m = [...spoken.matchAll(/([a-h]) ([1-8])/g)];
  return m.length ? m[m.length - 1][1] + m[m.length - 1][2] : spoken.trim().slice(0, 6);
}
const lineSig = (dicts) => dicts.map(destToken).join('-');

async function makeCtx(browser) {
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  // Instrument 3: route the app's audit POSTs to the local listener sidecar.
  const listenerUrl = process.env.AUDIT_LISTENER_URL || LISTENER_URL;
  if (listenerUrl) {
    await ctx.addInitScript(({ url, secret }) => {
      try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
    }, { url: listenerUrl, secret: LOCAL_LISTENER_SECRET });
  }
  const ev = { pageerrors: [], consoleErrors: [], tts: [] };
  page.on('pageerror', (e) => ev.pageerrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) ev.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('request', (r) => { const u = r.url(); if (/\/api\/tts/.test(u)) ev.tts.push({ t: Date.now(), text: ttsTextOf(u) }); });
  return { ctx, page, ev };
}

async function bootSeed(page) {
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  // Fresh-context onboarding bubble blocks every click until dismissed (G1
  // caveat #5). Pick a skill band and wait for it to detach.
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch { /* no bubble */ }
  // Pro-rep entries land ~30s into the deferred seed, full seed ~50s (G1 caveat
  // #6) — 12s was far too short for a pro-gothamchess opening to be in Dexie.
  // Poll the openings store until it fills past the base repertoire, cap ~60s.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(async () => {
      try {
        const dbs = await indexedDB.databases();
        const name = (dbs.find((d) => /chess/i.test(d.name || '')) || {}).name;
        if (!name) return 0;
        return await new Promise((res) => {
          const req = indexedDB.open(name);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('openings')) { res(0); return; }
            const tx = db.transaction('openings', 'readonly').objectStore('openings').count();
            tx.onsuccess = () => res(tx.result); tx.onerror = () => res(0);
          };
          req.onerror = () => res(0);
          setTimeout(() => res(-1), 4000); // open stalled (sandbox write-stall)
        });
      } catch { return 0; }
    }).catch(() => 0);
    if (n >= 100) return;       // seeded well past base — pro entries present
    if (n === -1 && i >= 5) return; // IDB stalled (sandbox) — proceed, caller handles
  }
}
async function openDetail(page, id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded' });
  // Poll the FULL window for the gems card — the page headings render seconds
  // before the card finishes (esp. a 21-gem tab), so don't early-return 'detail'.
  let sawDetail = false;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    if (await page.locator('[data-testid="punish-gems-card"]').isVisible().catch(() => false)) return 'card';
    const t = await page.locator('body').innerText().catch(() => '');
    if (/not found/i.test(t)) return 'notfound';
    if (/Pitfalls|Master|Overview/i.test(t)) sawDetail = true;
  }
  return sawDetail ? 'detail' : 'timeout';
}
const cardVisible = (p) => p.locator('[data-testid="punish-gems-card"]').isVisible().catch(() => false);
const squares = (p) => p.locator('[data-square]').count();
// Weapons (gems) are LOCKED behind the WLPP ladder until Play (David's unlock
// ladder, 2026-05-24). Unlock via the expert-pass two-tap before any gem check.
// Returns 'card' once the gems card is visible. In the Claude Code sandbox the
// openings-store WRITE the unlock performs STALLS (CLAUDE.md G1), so the card
// never appears — we return 'locked' and the caller SKIPS the gem checks (the
// full gem contract then only runs on a real device / prod).
// The gems CARD renders even when weapons are LOCKED (locked tiles, no
// clickable Watch/Learn buttons). So "card visible" is NOT "unlocked" — the
// real unlock signal is a clickable gem-watch button. Use that, or the sandbox
// write-stall (no buttons ever appear) is mistaken for unlocked and the later
// gem-button clicks time out instead of skipping.
const gemPlayable = async (p) => (await p.locator('[data-testid^="gem-watch-"]').count().catch(() => 0)) > 0;
// Dismiss the onboarding bubble + the auto-opening page-help modal that
// intercept pointer events (G1 #5). EVERY re-navigation can re-open the modal,
// so call this after each openDetail before driving WLPP/gem clicks — without
// it a gem-watch click hangs 30s on an intercepted pointer and the pass throws.
async function dismissModals(page) {
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
    await bubble.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  }
  const modal = page.locator('[data-testid="page-help-modal"]');
  if (await modal.count().catch(() => 0)) {
    await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 3000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await modal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}
async function ensureWeapons(page, id) {
  const st = await openDetail(page, id);
  if (st !== 'card' && st !== 'detail') return st; // notfound / timeout
  await dismissModals(page);
  if (await gemPlayable(page)) return 'card';
  // SEED the progression UNLOCKED in IndexedDB (G1 #4 + 2026-06-01 problem-solve).
  // The expert-pass CLICK does NOT surface the gems — they live INSIDE the
  // ladder, and the runtime markRungComplete/unlock write stalls in the sandbox.
  // Seeding `linesUnlockedAll` makes the unlocked STATE a READ (areWeaponsUnlocked
  // → true), so the gems surface and can be PLAYED. Proven on prod 2026-06-01:
  // 4 gem-watch buttons surfaced after the seed. The runtime unlock-WRITE
  // persistence is the separate fake-indexeddb unit-test / real-device concern.
  const seed = await seedUnlockedOpenings(page, [id]);
  if (seed.ok && seed.updated > 0) {
    const st2 = await openDetail(page, id); // reload so React reads the unlocked state
    await dismissModals(page); // the reload re-opens the page-help modal — clear it so gem clicks land
    if ((st2 === 'card' || st2 === 'detail') && await gemPlayable(page)) return 'card';
  }
  // Fallback: the expert-pass two-tap (rarely needed once seeding works).
  const btn = page.locator('[data-testid="weapons-unlock-all-btn"]').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});       // tap 1: arm the confirm
    await page.waitForTimeout(400);
    await btn.click().catch(() => {});       // tap 2: confirm → Dexie write + reload
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      if (await gemPlayable(page)) return 'card';
    }
  }
  return 'locked'; // even seeding failed — gem probes are device/prod-only
}
async function exitPlayer(page) {
  // The player exposes a back/exit affordance; fall back to browser back.
  const back = page.locator('[aria-label="Exit" i], [aria-label="Back" i], [data-testid*="exit" i], [data-testid*="back" i]').first();
  if (await back.isVisible().catch(() => false)) { await back.click().catch(() => {}); }
  else { await page.goBack().catch(() => {}); }
  await page.waitForTimeout(1200);
}

// ─── ONE PASS — touches EVERY function, depth scales with `level` ────────────
// David 2026-05-24: "the audit needs to touch EVERY FUNCTION on each pass, then
// deeper on every other pass after the first." So each pass exercises the WHOLE
// surface (card render across all weapon openings, Watch, Learn, Practice, Play,
// named-trap Learn, self-hide, voice contract) — and level 2/3 add cold-cache,
// play-to-completion, wrong-move/interaction stress, pick-before-load,
// out-of-order toggling, and widen the deep per-function checks to EVERY weapon
// opening. The contract is MET only on 3 CONSECUTIVE error-free passes.
async function runPass(browser, level) {
  const { ctx, page, ev } = await makeCtx(browser);
  const errs = [];
  const skips = [];
  const fail = (m) => errs.push(`P${level}: ${m}`);
  const skip = (m) => skips.push(`P${level}: ${m}`);
  const silentCheck = (label) => { const nt = narrationTexts(ev); if (nt.length) fail(`${label}: NOT silent (${nt.length} tts: "${nt[0]}")`); };
  try {
    await bootSeed(page);
    // Cold-cache is exercised on every deeper pass (clear IDB, reseed).
    if (level >= 2) {
      await page.evaluate(async () => { for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); });
      await bootSeed(page);
    }

    // ── card render + 4 WLPP buttons + CORRECT gem data — every pass ──
    // The main tab shows ALL of an opening's weapon gems; assert each tile
    // names its REAL inaccuracy + punish (not just "a card rendered").
    for (const id of GEM_OPENINGS) {
      const st = await ensureWeapons(page, id);
      if (st === 'locked') { skip(`${id}: weapons locked + unlock write stalled (sandbox) — gem checks are device/prod-only`); continue; }
      if (st !== 'card') { fail(`${id}: gems card did not render (${st})`); continue; }
      if ((await page.locator('[data-testid^="punish-gem-"]').count()) < 1) fail(`${id}: no gem tiles`);
      for (const mode of ['watch', 'learn', 'practice', 'play']) {
        if (!(await page.locator(`[data-testid^="gem-${mode}-"]`).count())) fail(`${id}: missing ${mode} button`);
      }
      for (const g of GEMS.filter((x) => x.openingId === id && WEAPON.has(x.tier))) {
        const tile = page.locator(`[data-testid="punish-gem-${gemIdOf(g)}"]`);
        if (!(await tile.count())) { fail(`${id}: gem tile missing for ${g.inaccuracy}→${g.punish}`); continue; }
        const txt = await tile.innerText().catch(() => '');
        if (!txt.includes(g.inaccuracy)) fail(`${id} gem: tile omits inaccuracy "${g.inaccuracy}"`);
        if (!txt.includes(g.punish)) fail(`${id} gem: tile omits punish "${g.punish}"`);
      }
    }

    // ── MASTERCLASS INTEGRATION — every masterclass opening × every variation
    //    tab: the WLPP buttons are wired (every pass); deeper passes actually
    //    MOUNT the variation Learn (≥2) and Watch (≥3) lessons. This is what
    //    proves the WHOLE masterclass surface is integrated, not just gems. ──
    for (const id of MASTERCLASS) {
      const st = await openDetail(page, id);
      if (st === 'notfound' || st === 'timeout') { fail(`${id}: masterclass detail did not load (${st})`); continue; }
      const tabN = await page.locator('[data-testid^="variation-tab-"]').count();
      if (tabN < 1) { fail(`${id}: no variation tabs`); continue; }
      const tabTitles = []; // per-tab Watch lesson TITLE — for distinctness
      for (let i = 0; i < tabN; i++) {
        const tabLabel = (await page.locator('[data-testid^="variation-tab-"]').nth(i).innerText().catch(() => `#${i}`)).trim();
        await page.locator('[data-testid^="variation-tab-"]').nth(i).click().catch(() => {});
        await page.waitForTimeout(1500); // let tab-selection register before driving WLPP
        for (const b of ['walkthrough-btn', 'learn-btn', 'practice-btn', 'play-btn']) {
          if (!(await page.locator(`[data-testid="${b}"]`).count())) fail(`${id} [${tabLabel}]: missing ${b}`);
        }
        if (level >= 2) {
          // The variation WATCH lesson must mount AND be the RIGHT lesson:
          // capture its title (color-agnostic; Learn stalls waiting for the
          // student so its dictation can't fingerprint the line).
          await page.locator('[data-testid="walkthrough-btn"]').click().catch(() => {});
          await page.waitForTimeout(2500);
          if ((await squares(page)) < 64) fail(`${id} [${tabLabel}] Watch: lesson did not mount`);
          const title = (await page.locator('[data-testid="lesson-title"]').first().innerText().catch(() => '')).trim();
          if (!title) fail(`${id} [${tabLabel}] Watch: lesson has no title`);
          tabTitles.push({ tabLabel, title });
          await exitPlayer(page);
          await openDetail(page, id);
        }
        if (level >= 3) {
          // Learn + Practice must also MOUNT (interactive modes reachable).
          await page.locator('[data-testid^="variation-tab-"]').nth(i).click().catch(() => {});
          await page.waitForTimeout(1500); // let tab-selection register before driving WLPP
          await page.locator('[data-testid="learn-btn"]').click().catch(() => {});
          await page.waitForTimeout(2000);
          if ((await squares(page)) < 64) fail(`${id} [${tabLabel}] Learn: did not mount`);
          await exitPlayer(page);
          await openDetail(page, id);
        }
      }
      // CORRECTNESS: no two tabs may load the IDENTICAL lesson (catches a tab
      // showing the wrong/duplicate lesson — e.g. the old main==Classical dup).
      if (level >= 2) {
        const byTitle = new Map();
        for (const { tabLabel, title } of tabTitles) {
          if (!title) continue;
          if (byTitle.has(title)) fail(`${id}: "${tabLabel}" loads the SAME lesson ("${title}") as "${byTitle.get(title)}" (duplicate/wrong)`);
          else byTitle.set(title, tabLabel);
        }
      }
    }

    // The deep Watch/Learn/Practice/Play checks run on PRIMARY every pass, and
    // widen to EVERY weapon opening on the deepest pass.
    const deepOpenings = level >= 3 ? GEM_OPENINGS : [PRIMARY];
    for (const id of deepOpenings) {
      // Unlock weapons first (gems are ladder-locked until Play). If the unlock
      // write stalls (sandbox), skip this opening's deep gem probes.
      const ws = await ensureWeapons(page, id);
      if (ws === 'locked') { skip(`${id}: weapons locked + unlock write stalled (sandbox) — deep gem probes device/prod-only`); continue; }
      if (ws !== 'card') { fail(`${id}: gems card did not render for deep probe (${ws})`); continue; }
      // ── WATCH — mounts + narrates AUTHORED PROSE on the wire ──
      // Re-unlock before each probe: every openDetail re-navigation re-reads
      // Dexie, and in the sandbox the unlock write stalls (G1) so weapons
      // re-lock. ensureWeapons re-arms the in-memory unlock or returns 'locked'
      // → skip cleanly (device/prod-only) instead of timing out on a click.
      if (await ensureWeapons(page, id) === 'locked') { skip(`${id} Watch: unlock write stalled (sandbox) — device/prod-only`); continue; }
      ev.tts.length = 0;
      await page.locator('[data-testid^="gem-watch-"]').first().click();
      await page.waitForTimeout(level >= 2 ? 3500 : 2500);
      if (await cardVisible(page)) fail(`${id} Watch: detail card did not unmount`);
      if ((await squares(page)) < 64) fail(`${id} Watch: board absent`);
      if (!narrationTexts(ev).some(isProse)) fail(`${id} Watch: no prose narration fired`);
      if (level >= 3) {
        // Play the crush out to completion — no desync / throw mid-playout.
        let last = '', stalls = 0;
        for (let i = 0; i < 40 && stalls < 6; i++) {
          await page.waitForTimeout(1000);
          const b = await page.locator('body').innerText().catch(() => '');
          const m = b.match(/MOVE\s+(\d+)\s*\/\s*(\d+)/i);
          const tag = m ? `${m[1]}/${m[2]}` : '';
          if (tag && tag === last) stalls++; else stalls = 0;
          last = tag;
          if (m && m[1] === m[2]) break;
        }
        if ((await squares(page)) < 64) fail(`${id} Watch playout: board lost`);
      }
      await exitPlayer(page);

      // ── LEARN — mounts + DICTATES THE MOVE ONLY (David 2026-06-05: "i just
      //    want it saying the moves, theory was already stated in watch"). The
      //    voice speaks move-dictation form ("Knight to d 5"), NEVER prose or
      //    the cue; the move's WRITTEN narration is listed below the board
      //    instead. Supersedes the 2026-05-24 "Learn follows the setting" rule. ──
      if (await ensureWeapons(page, id) === 'locked') { skip(`${id} Learn: unlock write stalled (sandbox) — device/prod-only`); continue; }
      ev.tts.length = 0;
      await page.locator('[data-testid^="gem-learn-"]').first().click();
      await page.waitForTimeout(4000);
      if ((await squares(page)) < 64) fail(`${id} Learn: board absent`);
      const lt = narrationTexts(ev);
      if (!lt.length) fail(`${id} Learn: no narration fired (should dictate the move)`);
      // The voice must DICTATE the move — never prose/theory (that lives in Watch).
      const learnProse = lt.filter(isProse);
      if (learnProse.length) fail(`${id} Learn: spoke PROSE/theory, not move-dictation ("${learnProse[0].slice(0, 50)}")`);
      if (!lt.some(isMoveDictation)) fail(`${id} Learn: voice did not dictate a move (got "${lt[0]}")`);
      // …and the move's WRITTEN narration is shown below the board.
      if (!(await page.locator('[data-testid="memory-move-narration"]').count())) fail(`${id} Learn: written move-narration area missing below the board`);
      if (level >= 3) {
        for (const sq of ['a3', 'h6', 'c3', 'f6']) {
          const cl = page.locator(`[data-square="${sq}"]`).first();
          if (await cl.isVisible().catch(() => false)) { await cl.click().catch(() => {}); await page.waitForTimeout(150); }
        }
        if ((await squares(page)) < 64) fail(`${id} Learn: board vanished on stray click`);
      }
      await exitPlayer(page);

      // ── PRACTICE — mounts + SILENT (level 3: silent under board interaction) ──
      if (await ensureWeapons(page, id) === 'locked') { skip(`${id} Practice: unlock write stalled (sandbox) — device/prod-only`); continue; }
      ev.tts.length = 0;
      await page.locator('[data-testid^="gem-practice-"]').first().click();
      await page.waitForTimeout(level >= 2 ? 4000 : 2500);
      if ((await squares(page)) < 64) fail(`${id} Practice: board absent`);
      if (level >= 3) {
        for (const sq of ['e4', 'e5', 'd4', 'd5']) {
          const cl = page.locator(`[data-square="${sq}"]`).first();
          if (await cl.isVisible().catch(() => false)) { await cl.click().catch(() => {}); await page.waitForTimeout(250); }
        }
      }
      silentCheck(`${id} Practice`);
      await exitPlayer(page);

      // ── PLAY — hands off to the coach room ──
      if (await ensureWeapons(page, id) === 'locked') { skip(`${id} Play: unlock write stalled (sandbox) — device/prod-only`); continue; }
      await page.locator('[data-testid^="gem-play-"]').first().click();
      await page.waitForTimeout(2500);
      if (await cardVisible(page)) fail(`${id} Play: did not leave the detail card`);
      await exitPlayer(page);
    }

    // ── named-trap Learn (Caro Qe2) — mounts a board (when caro is in scope) ──
    if (MASTERCLASS.includes('caro-kann')) {
      await openDetail(page, 'caro-kann');
      const tl = page.locator('[data-testid="named-trap-learn-karpov-qe2-mate"]');
      await tl.waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
      if (await tl.count()) {
        await tl.scrollIntoViewIfNeeded().catch(() => {});
        await tl.click().catch(() => {}); await page.waitForTimeout(2500);
        if ((await squares(page)) < 64) fail('named-trap Learn: board absent');
        await exitPlayer(page);
      } else { fail('named-trap Learn button not found'); }
    }

    // ── NO EMPTY CARD — the real contract: a gem-less tab shows no card; a
    //    tab that DOES show the card must carry ≥1 tile (never empty junk).
    //    Switching tabs must never crash. (Not "≥1 tab must be empty" — an
    //    opening can legitimately have a gem on every tab.) ──
    await ensureWeapons(page, PRIMARY); // unlock so the per-tab gems-empty check is meaningful (lock-safe: cardVisible-guarded below)
    const tabCount = await page.locator('[data-testid^="variation-tab-"]').count();
    for (let i = 0; i < tabCount; i++) {
      await page.locator('[data-testid^="variation-tab-"]').nth(i).click().catch(() => {});
      await page.waitForTimeout(800);
      if (await cardVisible(page) && (await page.locator('[data-testid^="punish-gem-"]').count()) < 1) {
        fail(`${PRIMARY} tab#${i}: gems card visible but EMPTY (no tiles)`);
      }
    }

    // ── deeper passes: pick-before-load + out-of-order toggling ──
    if (level >= 2) {
      await page.goto(`${URL}/openings/${PRIMARY}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const wb = page.locator('[data-testid^="gem-watch-"]').first();
      if (await wb.isVisible().catch(() => false)) await wb.click().catch(() => {});
      await page.waitForTimeout(2500); // must not crash
    }
    if (level >= 3) {
      await openDetail(page, PRIMARY);
      for (let r = 0; r < 3; r++) {
        for (const mode of ['watch', 'learn', 'practice']) {
          const b = page.locator(`[data-testid^="gem-${mode}-"]`).first();
          if (await b.isVisible().catch(() => false)) {
            await b.click().catch(() => {}); await page.waitForTimeout(400);
            await exitPlayer(page); await openDetail(page, PRIMARY);
          }
        }
      }
    }
  } catch (e) { fail(`threw — ${String(e).slice(0, 160)}`); }
  errs.push(...ev.pageerrors.map((p) => `P${level} pageerror: ${p}`), ...ev.consoleErrors.map((c) => `P${level} console: ${c}`));
  await ctx.close();
  return { errs, skips };
}

// ─── CONTINUITY PREFLIGHT (David 2026-06-01: "this is a full play audit, bots
//     are not trusted; check for continuity errors and lock it into scope"). ──
// A deterministic, browser-INDEPENDENT replay — it does NOT depend on the flaky
// sandbox browser (which David doesn't trust) or on the write-stalled unlock. It
// proves every line the audit will PLAY is ONE continuous, gap-free line, so a
// rung never jumps onto a different/illegal position. A continuity error here is
// a HARD FAIL — the audit cannot be "met" over a broken line. The classes:
//   1. Gem field continuity — playLine === lineMoves + inaccuracy + punishSeq,
//      every move legal from the prior FEN (no board jump / no field drift), and
//      the inaccuracy sits exactly at the spine boundary with the punish next.
//   2. Gem narration continuity — watch/learn arrays match the playLine length
//      (no slid cue) and the two keystone beats NAME their own move on their own
//      ply (inaccuracy beat says the inaccuracy, punish beat says the punish).
//   3. Variation↔spine continuity — every variation line branches FROM the
//      opening spine (shares its opening plies) and is itself a legal, gap-free
//      line — never a cold/unrelated position.
async function continuityPreflight() {
  const errs = [];
  let proRep = [];
  try { proRep = JSON.parse(await readFile('src/data/pro-repertoires.json', 'utf-8')).openings ?? []; } catch { /* none */ }
  let NARR = {};
  try {
    const txt = await readFile('src/data/lessons/punishGemNarration.ts', 'utf-8');
    // lightweight: we only need to know which gemIds have an entry + their array
    // lengths/keystone text. Pull it via a tiny eval-free parse of the object keys.
    NARR = txt; // searched by substring below (gemId + the keystone SAN)
  } catch { /* none */ }
  const gemId = (g) => `${g.openingId}:${g.lineMoves.replace(/\s+/g, '_')}:${g.inaccuracy}`;

  for (const g of GEMS.filter((x) => WEAPON.has(x.tier))) {
    const tag = `${g.openingId} ${g.inaccuracy}→${g.punish}`;
    // 1. field continuity
    const rebuilt = [g.lineMoves, g.inaccuracy, ...(g.punishSeq ?? [])].join(' ').replace(/\s+/g, ' ').trim();
    if (rebuilt !== g.playLine.trim()) errs.push(`CONTINUITY ${tag}: playLine ≠ lineMoves+inaccuracy+punishSeq (field drift)`);
    const setup = g.lineMoves.split(' ');
    const play = g.playLine.split(' ');
    if (play[setup.length] !== g.inaccuracy) errs.push(`CONTINUITY ${tag}: inaccuracy not at spine boundary (ply ${setup.length})`);
    if (play[setup.length + 1] !== g.punish) errs.push(`CONTINUITY ${tag}: punish not immediately after inaccuracy`);
    // legal gap-free replay
    const c = new Chess();
    for (const m of play) {
      const before = c.fen();
      try { c.move(m); } catch { /* surfaced below */ }
      if (c.fen() === before) { errs.push(`CONTINUITY ${tag}: board JUMP — illegal/discontinuous move "${m}"`); break; }
    }
    // 2. narration continuity (only if a narration entry exists for this gem)
    const id = gemId(g);
    if (NARR.includes(`"${id}"`) || NARR.includes(`'${id}'`)) {
      // keystone board-flow: the inaccuracy + punish beats must name their move.
      // (array-length alignment is already hard-gated by punishGems.test; here we
      // assert the two keystone tokens appear near the gemId block.)
      const bare = (s) => s.replace(/[+#]/g, '');
      const blockStart = Math.max(NARR.indexOf(`"${id}"`), NARR.indexOf(`'${id}'`));
      const block = NARR.slice(blockStart, blockStart + 2400);
      if (!block.includes(bare(g.inaccuracy))) errs.push(`CONTINUITY ${tag}: narration block omits inaccuracy token "${g.inaccuracy}"`);
      if (!block.includes(bare(g.punish))) errs.push(`CONTINUITY ${tag}: narration block omits punish token "${g.punish}"`);
    }
  }
  // 3. variation↔spine continuity for the weapon openings that are pro entries
  for (const id of GEM_OPENINGS) {
    const o = proRep.find((x) => x.id === id);
    if (!o?.pgn || !Array.isArray(o.variations)) continue;
    const spine = o.pgn.split(' ');
    for (const v of o.variations) {
      if (!v?.pgn) continue;
      const vm = v.pgn.split(' ');
      // legal, gap-free
      const c = new Chess();
      let ok = true;
      for (const m of vm) { const b = c.fen(); try { c.move(m); } catch { /* */ } if (c.fen() === b) { ok = false; break; } }
      if (!ok) { errs.push(`CONTINUITY ${id} [${v.name}]: variation line illegal/discontinuous`); continue; }
      // Branches from the spine: must share the opening up to (and including)
      // the STUDENT's first move — the earliest legitimate branch point. For a
      // WHITE opening the opening is identified at ply 1 (1.c4 / 1.Nf3 / 1.d4),
      // so a variation defined by Black's different first reply correctly shares
      // just 1 ply; for a BLACK opening it's identified at ply 2 (1.e4 c6), so a
      // real variation must share ≥2. Below that floor it's a cold/unrelated line.
      const minShared = String(o.color).toLowerCase() === 'white' ? 1 : 2;
      let shared = 0;
      while (shared < spine.length && shared < vm.length && spine[shared] === vm[shared]) shared++;
      if (shared < minShared) errs.push(`CONTINUITY ${id} [${v.name}]: variation does not branch from the opening spine (shares ${shared} plies, need ${minShared})`);
    }
  }
  return errs;
}

(async () => {
  console.log(`[loop] weapon openings: ${GEM_OPENINGS.join(', ') || '(none)'} — primary: ${PRIMARY ?? '(none)'}`);
  // FULL-PLAY audit, bots-not-trusted: continuity is verified deterministically
  // BEFORE any browser work, so a write-stalled sandbox run still hard-checks
  // every line's continuity. A continuity error fails the audit outright.
  const continuityErrs = await continuityPreflight();
  if (continuityErrs.length) {
    console.log(`\n[loop] CONTINUITY PREFLIGHT: ${continuityErrs.length} ERROR(S) — FAIL`);
    continuityErrs.forEach((e) => console.log(`   ✗ ${e}`));
    process.exit(1);
  }
  console.log('[loop] continuity preflight: clean ✓ (every played line is gap-free + branches correctly)');
  if (!PRIMARY) {
    console.log('\n[loop] CONTRACT DEFERRED — no engine-graded weapon gems present. Run the mine-punish-gems Action (Stockfish) to populate, then re-run.');
    process.exit(2);
  }
  // Instrument 3: spin up the listener sidecar (if not already pointed at one).
  let listener = null;
  if (!process.env.AUDIT_LISTENER_URL) {
    try {
      listener = await startAuditListener();
      process.env.AUDIT_LISTENER_URL = listener.url;
      console.log(`[loop] narration listener sidecar: ${listener.url}`);
    } catch (e) { console.log(`[loop] listener sidecar unavailable: ${String(e).slice(0, 80)}`); }
  }
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
  const report = { url: URL, ts: new Date().toISOString(), passes: [] };
  let clean = 0;
  let playSkipped = false; // any pass that SKIPPED the actual gem play (write-stall)
  for (const level of [1, 2, 3]) {
    process.stdout.write(`\n[loop] Pass ${level} (every function${level > 1 ? `, depth ${level}` : ''}) …\n`);
    const { errs, skips } = await runPass(browser, level);
    report.passes.push({ level, errors: errs, skips });
    if (skips.some((s) => /locked|stall/i.test(s))) playSkipped = true;
    if (skips.length) { console.log(`[loop] Pass ${level}: ${skips.length} skip(s):`); skips.forEach((s) => console.log(`   ○ ${s}`)); }
    if (errs.length === 0) { clean++; console.log(`[loop] Pass ${level}: 0 errors ✓ (consecutive clean: ${clean})${skips.length ? ` [${skips.length} skipped]` : ''}`); }
    else { console.log(`[loop] Pass ${level}: ${errs.length} ERROR(S) — streak reset`); errs.forEach((e) => console.log(`   ✗ ${e}`)); clean = 0; }
  }
  await browser.close();
  // Instrument 3 report: what the listener actually captured from the running app.
  if (listener) {
    const captured = listener.getCapturedEvents();
    const voice = captured.filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
    console.log(`\n[loop] listener sidecar captured ${captured.length} audit event(s), ${voice.length} voice/narration event(s) in-app`);
    if (voice.length) voice.slice(0, 8).forEach((e) => console.log(`   ♪ ${e.kind} ${(e.source || '')} ${(e.summary || '').slice(0, 70)}`));
    report.listener = { total: captured.length, voice: voice.length, sample: voice.slice(0, 12) };
    await listener.stop().catch(() => {});
  }
  await mkdir('audit-reports', { recursive: true }).catch(() => {});
  await writeFile(`audit-reports/punish-gems-loop-${ONLY || 'all'}-${report.ts.replace(/[:.]/g, '-')}.json`, JSON.stringify(report, null, 2));
  const threeClean = clean === 3;
  // FULL-PLAY contract (David 2026-06-01): a skip is NOT a pass. If the gem play
  // was never actually exercised (sandbox write-stall locked the weapons), the
  // contract is NOT met — it is DEFERRED to a real device / prod where the
  // unlock write lands. Continuity preflight already passed (hard floor); the
  // full interactive play-through still owes a device/prod run.
  const met = threeClean && !playSkipped;
  if (met) console.log(`\n[loop] CONTRACT MET — continuity clean + 3 consecutive error-free passes with the gems actually PLAYED (clean streak: ${clean}/3)`);
  else if (threeClean && playSkipped) console.log(`\n[loop] CONTRACT DEFERRED — continuity clean + 0 errors, but the gem PLAY-THROUGH was skipped (sandbox unlock write-stall). Full-play is owed on a real device / prod; a skip is not a pass.`);
  else console.log(`\n[loop] CONTRACT NOT MET — need continuity clean + 3 consecutive error-free passes with gems played (clean streak: ${clean}/3${playSkipped ? ', play skipped' : ''})`);
  process.exit(met ? 0 : 1);
})();
