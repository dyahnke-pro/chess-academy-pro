#!/usr/bin/env node
/**
 * audit-concept-gameplay-prod — P5's DONE-condition for the computed-concept
 * engine (docs/plans/2026-09-14-computed-concept-detectors.md): the coach
 * SPEAKS a computed concept during LIVE GAMEPLAY, not only on puzzles.
 *
 * Three instruments per G1, MUTED (never a byte of TTS):
 *   1. Playwright drives the real Learn surface (/coach/teach) on LIVE prod and
 *      asks for a lesson whose taught spine LANDS a tactic on a student ply.
 *   2. The app's own audit events land on a loopback listener sidecar; the
 *      prod audit-stream is pulled before + after (opt-in, off by default —
 *      empty is expected and informational, CLAUDE.md §G2).
 *   3. The narration events on that listener carry the SPOKEN text — the
 *      proof is what the coach SAID, not that a function ran.
 *
 * WHY THIS OPENING. `landedTacticTeaching` (dnaLineNarrator) splices the
 * computed tactic + its invariant as beat two on any taught ply that lands a
 * tactic — on every narration tier, corpus note or not (openingGenerator PASS
 * 1). The ask must name a line whose OWN entry carries the tactic: the
 * generator extends a family ask along the most-popular branch, and the first
 * run of this audit learned that the hard way ("Torre Attack" resolved to the
 * …e6 Classical entry offline but the live spine went …g6, where Bg5 pins
 * nothing). Probed 2026-09-15: "Scandinavian Defense, Lasker Variation"
 * resolves to its 11-ply entry and ply 10 is the student's own …Bg4, pinning
 * Nf3 to the queen — so the spoken walkthrough MUST contain the pin
 * invariant; the LLM has no say in it (G0).
 *
 * Contracts asserted (experience, not text-presence):
 *   A. the ask starts a real walkthrough (a walkthrough testid mounts) — never
 *      a chat refusal / "did you mean" picker
 *   B. the listener captured narration events (instrument 3 alive)
 *   C. a SPOKEN line carries an engine INVARIANT sentence (TACTIC_INVARIANT
 *      vocabulary) — the concept was voiced mid-lesson
 *   D. every spoken line is gate-clean (no we/our/us; no raw enum leak such as
 *      "mate_threat")
 *   E. off-canonical ask (G7): a misspelled "torre atack" still starts a lesson
 *   F. vacuity guard: ≥3 spoken lines; instruments stayed muted; 0 page errors
 *
 * Run (from the sandbox, against LIVE prod):
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-concept-gameplay-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const ASK = process.env.AUDIT_CONCEPT_ASK ?? 'Teach me the Scandinavian Defense, Lasker Variation';
/** The chip a student taps when the typo ask lands on a picker. */
const CHIP_PICK = new RegExp(process.env.AUDIT_CONCEPT_CHIP ?? 'Lasker', 'i');
const ASK_TYPO = process.env.AUDIT_CONCEPT_ASK_TYPO ?? 'teach me the scandinavian lasker variaton';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/concept-gameplay-${stamp}`;
const BOOT_TIMEOUT_MS = 45_000;
/** Cold generation on prod (DeepSeek) + the muted, voice-gated playback. */
const LESSON_BUDGET_MS = Number(process.env.AUDIT_CONCEPT_BUDGET_MS ?? 210_000);

/** The engine's invariants (conceptEngine TACTIC_INVARIANT), matched on
 *  SUBSTANCE: the concept NAMED plus the invariant's distinctive cue. The
 *  computed beat is handed to the phrasing pass, which may reword it (G0: the
 *  model phrases, it never decides) — on prod "a pin freezes the piece in
 *  front: it can't move without exposing…" was spoken as "That's a pin: the
 *  piece in front is frozen — it cannot move without exposing…", and an
 *  exact-sentence regex called that a miss (2026-09-15). Each cue is a phrase
 *  the reword keeps; `auditConceptGameplayCues.test.ts` pins every cue to the
 *  engine's own invariant text so this list cannot drift from the source. */
export const CONCEPT_CUES = [
  { type: 'fork', name: /\bfork/i, cue: /two targets/i },
  { type: 'pin', name: /\bpin\b|\bpinned\b/i, cue: /piece in front/i },
  { type: 'skewer', name: /\bskewer/i, cue: /valuable piece/i },
  { type: 'discovery', name: /\bdiscover/i, cue: /second attacker|unveil/i },
  { type: 'double_check', name: /double check/i, cue: /two pieces/i },
  { type: 'back_rank', name: /back[- ]rank/i, cue: /own pawns/i },
  { type: 'removal_of_guard', name: /remov\w* the (?:guard|defender)|defender/i, cue: /defending|defender/i },
  { type: 'trapped_piece', name: /trapped/i, cue: /no safe square/i },
  { type: 'overload', name: /overload/i, cue: /two defensive jobs|two jobs/i },
  { type: 'battery', name: /battery/i, cue: /same line/i },
];
const carriesConcept = (line) => CONCEPT_CUES.some((c) => c.name.test(line) && c.cue.test(line));
const RAW_ENUM_LEAK = /\b(mate_threat|removal_of_guard|trapped_piece|back_rank|double_check|discovered_attack|tactical_sequence)\b/;
const WALKTHROUGH_TESTIDS = ['walkthrough-choose-mode', 'walkthrough-stage-menu', 'walkthrough-leaf-panel', 'walkthrough-fork-panel', 'walkthrough-step-back', 'walkthrough-trap-bar', 'walkthrough-gem-bar'];

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function pullStream(sinceMs) {
  if (!SECRET) return { ok: false, reason: 'AUDIT_STREAM_SECRET not set', events: [] };
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, events: [] };
    const json = await res.json();
    return { ok: true, events: json.events ?? json.entries ?? [] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err), events: [] };
  }
}

async function dismissGates(page) {
  for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 4000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 10_000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

/** Narration lines the app itself reported as SPOKEN (summary preview + the
 *  full line in details). Instrument 3. */
function spokenLines(listener) {
  return listener.getCapturedEvents()
    .filter((e) => /coach-narration-spoken|voice-speak-invoked/i.test(e.kind ?? ''))
    .map((e) => `${e.summary ?? ''} ${typeof e.details === 'string' ? e.details : JSON.stringify(e.details ?? '')}`);
}

async function askForLesson(page, listener, ask, label) {
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await dismissGates(page);
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 25_000 });
  // pressSequentially, not fill — the React textarea needs real key events.
  await input.pressSequentially(ask, { delay: 12 });
  await page.keyboard.press('Enter');
  const started = Date.now();
  let mounted = null;
  let spokenBefore = spokenLines(listener).length;
  while (Date.now() - started < LESSON_BUDGET_MS) {
    await page.waitForTimeout(3000);
    for (const t of WALKTHROUGH_TESTIDS) {
      if (!mounted && (await page.locator(`[data-testid="${t}"]`).count()) > 0) mounted = t;
    }
    const lines = spokenLines(listener);
    // Stop once the concept has been voiced, or the lesson reached its leaf.
    if (lines.some(carriesConcept)) break;
    // A fork is a question to the STUDENT — a human taps a line; so does the
    // driver (functional-audit rule: handle the branch a real user hits, never
    // let one unanswered prompt swallow the rest of the run). Prefer the taught
    // continuation when it is on offer, else the first option.
    // A "did you mean…" picker (fuzzy match below auto-accept — the wide-berth
    // rule: when in doubt, ASK) is answered the way a student answers it: tap
    // the chip that names the line asked for. A picker is the CORRECT reply
    // to a typo; leaving it unanswered is the harness failing, not the coach.
    const chips = page.locator('[data-testid^="coach-choice-chip-"]');
    if (!mounted && (await chips.count()) > 0) {
      const labels = await chips.allInnerTexts();
      const want = labels.findIndex((l) => CHIP_PICK.test(l));
      if (want >= 0) {
        await chips.nth(want).click({ force: true }).catch(() => {});
        console.log(`[picker] ${label}: tapped "${labels[want].replace(/\s+/g, ' ').slice(0, 60)}" of ${labels.length} chips`);
        continue;
      }
    }
    const fork = page.locator('[data-testid^="walkthrough-fork-option-"]');
    if ((await fork.count()) > 0) {
      const labels = await fork.allInnerTexts();
      const want = labels.findIndex((l) => /queen takes d5|qxd5/i.test(l));
      const idx = want >= 0 ? want : 0;
      await fork.nth(idx).click({ force: true }).catch(() => {});
      console.log(`[fork] ${label}: answered "${(labels[idx] ?? '').replace(/\s+/g, ' ').slice(0, 60)}" (${labels.length} options)`);
      continue;
    }
    if (mounted && (await page.locator('[data-testid="walkthrough-leaf-panel"]').count()) > 0 && lines.length === spokenBefore) break;
    spokenBefore = lines.length;
  }
  const secs = Math.round((Date.now() - started) / 1000);
  if (!mounted) {
    await page.screenshot({ path: `${OUT_DIR}/${label}-no-walkthrough.png`, fullPage: true }).catch(() => {});
    const body = await page.locator('body').innerText().catch(() => '');
    await writeFile(`${OUT_DIR}/${label}-body.txt`, body).catch(() => {});
    console.log(`[diag] ${label}: tail of transcript:\n${body.slice(-900)}`);
  }
  return { mounted, secs };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const runStart = Date.now();
  const before = await pullStream(runStart - 60_000);
  console.log(`[stream] pre-run pull: ${before.ok ? `${before.events.length} events` : `unavailable (${before.reason})`}`);
  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit); // G1: never a byte of TTS
  const RUN_ID = process.env.AUDIT_RUN_ID ?? `concept-gameplay-${Math.random().toString(36).slice(2, 10)}`;
  await context.addInitScript(stampAuditRunId(RUN_ID));
  console.log(`[audit-run-id] ${RUN_ID}`);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  let ttsRequests = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });

  try {
    // ── A/B/C/D: the canonical ask ─────────────────────────────────────────
    const a = await askForLesson(page, listener, ASK, 'canonical');
    record('A. the ask STARTS a walkthrough (never a refusal / picker)', !!a.mounted, `ask="${ASK}" mounted=${a.mounted ?? 'none'} after ${a.secs}s`);
    const lines = spokenLines(listener);
    record('B. narration listener captured spoken lines (instrument 3 alive)', lines.length > 0, `${lines.length} spoken`);
    const hit = lines.find(carriesConcept);
    record('C. a SPOKEN line carries a computed concept INVARIANT (the concept was voiced mid-lesson)', !!hit, hit ? hit.replace(/\s+/g, ' ').slice(0, 180) : `none of ${lines.length} lines`);
    // Board NARRATION only (a line that names a square or a piece) — the
    // coach's opening greeting ("What are we working on today?") is not a
    // piece-perspective claim and is outside the you/they rule.
    const boardLines = lines.filter((l) => /\b[a-h][1-8]\b|\b(knight|bishop|rook|queen|king|pawn)\b/i.test(l));
    const dirty = boardLines.filter((l) => /\b(we|our|us)\b/i.test(l) || RAW_ENUM_LEAK.test(l));
    record('D. every spoken board line is gate-clean (you/they; no raw enum leak)', dirty.length === 0, `${boardLines.length} board lines${dirty.length ? ' — ' + dirty.slice(0, 2).map((l) => l.slice(0, 100)).join(' | ') : ''}`);
    await writeFile(`${OUT_DIR}/spoken-canonical.json`, JSON.stringify(lines, null, 1)).catch(() => {});

    // ── E: off-canonical ask (G7 — interactive, messy human input) ──────────
    const e = await askForLesson(page, listener, ASK_TYPO, 'typo');
    record('E. a misspelled ask still starts the lesson (G7 off-canonical input)', !!e.mounted, `ask="${ASK_TYPO}" mounted=${e.mounted ?? 'none'} after ${e.secs}s`);

    // ── F: vacuity + instrument hygiene ────────────────────────────────────
    const all = spokenLines(listener);
    record('F1. vacuity guard: ≥3 spoken lines across the run', all.length >= 3, `${all.length}`);
    record('F2. the run stayed MUTED (zero /api/tts requests)', ttsRequests === 0, `${ttsRequests} tts requests`);
    record('F3. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close().catch(() => {});
    await listener.stop();
  }

  const after = await pullStream(runStart);
  console.log(`[stream] post-run pull: ${after.ok ? `${after.events.length} events this run (opt-in stream — empty is expected)` : `unavailable (${after.reason})`}`);
  const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, ask: ASK, results, listenerEvents: listener.getCapturedEvents().length, listenerByKind: listener.countByKind(), streamEventsThisRun: after.events.length, pageErrors };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => { console.error('audit crashed:', err); process.exit(1); });
