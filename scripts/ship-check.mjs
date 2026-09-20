#!/usr/bin/env node
// ship-check — one-button "am I done?" gate.
//
// David, 2026-05-22: "next time I claim done, I should be running ship-check
// and showing you the green checks." This script is that button.
//
// Runs every fast gate in sequence + pulls the live audit stream. Exits 0
// iff every required check passes. Exits 1 with a concise failure summary
// otherwise. Designed to be the pre-push reflex — wire to a git hook or run
// manually before claiming any task complete.
//
//   npm run ship-check         — fast lane (~30-60s): typecheck + lint +
//                                vitest + audit-stream pull. Mandatory.
//   npm run ship-check -- --full
//                              — adds Playwright audit matrix (~5-10min).
//                                Required before declaring a multi-surface
//                                build done.
//
// On failure, prints the LAST N lines of failing stdout/stderr so you can
// see exactly what broke without digging through logs.

import { spawnSync } from 'node:child_process';
import { loadavg, cpus } from 'node:os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const ARGS = new Set(process.argv.slice(2));
const FULL = ARGS.has('--full');
const SUMMARY = ARGS.has('--summary');
const STARTED = Date.now();

const LOG_DIR = join(REPO_ROOT, '.ship-check-log');
const LOG_LATEST = join(LOG_DIR, 'latest.json');

// ── --summary mode: print what changed since the last green run ─────
// Doesn't run any checks — just reads the log and prints a paste-ready
// summary for the next commit message or PR description. Stops early.
if (SUMMARY) {
  if (!existsSync(LOG_LATEST)) {
    console.log('No prior green ship-check log. Run `npm run ship-check` first.');
    process.exit(0);
  }
  const prev = JSON.parse(readFileSync(LOG_LATEST, 'utf-8'));
  const since = prev.sha;
  console.log('');
  console.log(`── since last green ship-check (${prev.timestamp}) ──`);
  console.log(`  Previous green at: ${since.slice(0, 8)}`);
  console.log('');
  const commits = spawnSync('git', ['log', '--oneline', `${since}..HEAD`], { encoding: 'utf-8' });
  if (commits.stdout?.trim()) {
    console.log('  Commits:');
    for (const line of commits.stdout.trim().split('\n')) console.log(`    ${line}`);
  } else {
    console.log('  No commits since last green run.');
  }
  console.log('');
  const files = spawnSync('git', ['diff', '--name-only', `${since}..HEAD`], { encoding: 'utf-8' });
  if (files.stdout?.trim()) {
    const arr = files.stdout.trim().split('\n');
    console.log(`  Files changed (${arr.length}):`);
    for (const f of arr.slice(0, 20)) console.log(`    · ${f}`);
    if (arr.length > 20) console.log(`    · ... +${arr.length - 20} more`);
  }
  console.log('');
  process.exit(0);
}

const results = [];

function runStep(label, cmd, args, opts = {}) {
  const start = Date.now();
  process.stdout.write(`  • ${label}... `);
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(opts.env ?? {}) },
    encoding: 'utf-8',
  });
  const ms = Date.now() - start;
  const ok = r.status === 0;
  const out = (r.stdout ?? '') + '\n' + (r.stderr ?? '');
  const summary = opts.summary ? opts.summary(out) : null;
  results.push({ label, ok, ms, out, summary, optional: opts.optional ?? false });
  const mark = ok ? '✓' : (opts.optional ? '○' : '✗');
  const detail = summary ? `:: ${summary}` : '';
  process.stdout.write(`${mark} ${(ms/1000).toFixed(1)}s ${detail}\n`);
  return ok;
}

// ── Helpers to extract a one-line summary from a step's output ─────

/**
 * DID THE TOOL DIE? One detector, read by every summarizer.
 *
 * The disease this closes (PLAN §B 11c + the pickup sweep): a summarizer that
 * COUNTS matches in a tool's output reads a crash dump as ZERO — zero lint
 * errors, zero type errors, zero failed tests — and prints that count as a
 * verdict. It has now cost this repo twice: a heap-dead eslint rendered as
 * "0 errors", and a heap-dead tsc rendered as "0 type errors", on the strength
 * of which a ceiling was lowered to 0. A dead process knows NOTHING; the only
 * honest summary is that the count is unknown.
 *
 * It lives here, once, because the regex was already written out twice in this
 * file and two copies of a constant are a drift waiting to happen (CLAUDE.md,
 * the fix-latent-rot rule). A new summarizer gets the check by calling this.
 */
const CRASH_SIGNATURES = /FATAL ERROR|heap out of memory|Reached heap limit|Segmentation fault|Abort trap|Killed: 9|SIGABRT|JavaScript heap/;
function crashed(out) {
  return CRASH_SIGNATURES.test(out);
}
function summarizeVitest(out) {
  // A vitest that dies mid-run prints no "Tests N passed" line, so the old
  // `return null` left the row with no detail at all — the reader then blames
  // the product for what was a dead worker. Name it, same as lint and tsc.
  if (crashed(out)) return 'vitest CRASHED — test results UNKNOWN, nothing was verified';
  const m = out.match(/Tests\s+(\d+\s+(?:failed\s+\|\s+)?\d+\s+passed[^|]*)/);
  if (!m) return null;
  // SAY WHAT KIND OF RED (PLAN §B 11a, 2026-09-19): under parallel-session load
  // every gate failure was a vitest `Test timed out` while the product was
  // fine, and one ✗ read exactly like an assertion. Count the two apart so a
  // load artifact is never mistaken for a product red — and vice versa.
  const timeouts = (out.match(/Test timed out/g) ?? []).length;
  const assertions = (out.match(/AssertionError/g) ?? []).length;
  const base = m[1].trim().replace(/\s+/g, ' ');
  if (timeouts === 0 && assertions === 0) return base;
  const kind = timeouts > 0 && assertions === 0 ? ' ⚠ ALL TIMEOUTS — suspect machine load, not the product' : '';
  return `${base} — ${timeouts} timeout(s) / ${assertions} assertion failure(s)${kind}`;
}
function summarizeLint(out) {
  // A dead eslint prints no "✖ N problems" line and no rule errors — read as
  // "0 errors" this labelled a heap crash as a clean run (2026-09-19). Name it.
  if (crashed(out)) return 'eslint CRASHED — error count UNKNOWN';
  const m = out.match(/✖\s+(\d+\s+problems\s+\(\d+\s+errors,\s+\d+\s+warnings\))/);
  if (m) return m[1];
  // No "✖ N problems" line at all: eslint either found nothing (a clean run
  // prints NOTHING) or never finished. The step's exit status decides which —
  // runStep marks the row ✗ on a non-zero exit — so never print "0 errors"
  // here as if it were a verdict (PLAN §B 11c, the leftover).
  return out.includes('error') ? 'errors found' : 'no report line (clean if the row is ✓; a crash if ✗)';
}
function summarizePlaywright(out) {
  if (crashed(out)) return 'audit CRASHED — check count UNKNOWN, the surface was not verified';
  const m = out.match(/DONE\s+—\s+(\d+\/\d+)\s+checks/);
  return m ? `${m[1]} checks passed` : null;
}

// ── Audit-stream pull (informational; never blocks) ─────────────────
// 🔒 OFF UNLESS EXPLICITLY ASKED FOR (David 2026-09-11: "make sure no audit runs
// through redis anymore"). The GET is a Redis LRANGE against the same
// 500k/month budget that holds the spend guard, and since streaming went
// opt-in (2026-09-11) the answer is an empty list by default — so this ran a
// billed query on every ship-check to learn nothing. Set SHIP_CHECK_PULL_STREAM=1
// when you have deliberately turned streaming on and actually want the pull.
function pullAuditStream() {
  const start = Date.now();
  process.stdout.write(`  • audit-stream... `);
  if (process.env.SHIP_CHECK_PULL_STREAM !== '1') {
    const summary = 'not pulled (stream is opt-in; set SHIP_CHECK_PULL_STREAM=1)';
    results.push({ label: 'audit-stream', ok: true, ms: 0, optional: true, summary });
    process.stdout.write(`○ ${summary}\n`);
    return;
  }
  const secret = process.env.AUDIT_STREAM_SECRET ?? readAuditSecret();
  if (!secret) {
    process.stdout.write(`○ skipped (AUDIT_STREAM_SECRET not in env)\n`);
    results.push({ label: 'audit-stream', ok: true, ms: 0, optional: true, summary: 'skipped (no secret)' });
    return;
  }
  const since = Date.now() - 60 * 60_000; // last hour
  const r = spawnSync('curl', [
    '-s', '-m', '15',
    '-H', `x-audit-secret: ${secret}`,
    `https://chess-academy-pro.vercel.app/api/audit-stream?since=${since}`,
  ], { encoding: 'utf-8' });
  const ms = Date.now() - start;
  try {
    const parsed = JSON.parse(r.stdout ?? '{}');
    const count = parsed.count ?? 0;
    const errEvents = (parsed.entries ?? []).filter(e => /error|fail|trip|fallback/i.test(`${e.kind} ${e.source}`));
    const summary = count === 0
      ? 'empty (stream is opt-in & off by default — not a health signal)'
      : `${count} events, ${errEvents.length} error-class`;
    results.push({ label: 'audit-stream', ok: true, ms, optional: true, summary });
    process.stdout.write(`○ ${(ms/1000).toFixed(1)}s :: ${summary}\n`);
  } catch (e) {
    results.push({ label: 'audit-stream', ok: true, ms, optional: true, summary: 'fetch failed' });
    process.stdout.write(`○ ${(ms/1000).toFixed(1)}s :: fetch failed (non-blocking)\n`);
  }
}

function readAuditSecret() {
  for (const path of ['.env.local', '.env']) {
    const fp = join(REPO_ROOT, path);
    if (!existsSync(fp)) continue;
    const txt = readFileSync(fp, 'utf-8');
    const m = txt.match(/^AUDIT_STREAM_SECRET=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────
console.log('');
console.log('── ship-check ──────────────────────────────────');
console.log(FULL ? '  mode: FULL (Playwright matrix included)' : '  mode: fast');
console.log('');

// Set when the test-file typecheck goes ABOVE its ceiling — a NEW type error in
// a test. Blocks the push even though the step itself is `optional` (the step is
// optional so an at-ceiling backlog is not a permanent red).
let testTypeErrorRegression = 0;

// REQUIRED: typecheck + lint + load-bearing CONTENT GATES.
//
// We run a CURATED gate list — not `vitest run` over everything — because
// the repo carries unrelated UI/snapshot tests that rot at a different
// cadence than the gate tests. The gates below are the ones that protect
// content correctness (chess legality, narration grounding, depth, plan
// orientation). If any of these fail, the build can't ship. If a non-gate
// test fails, that's a separate problem the gate harness shouldn't gate.
const GATE_TESTS = [
  // Board accuracy for corpus lines rewritten by hand out of the review
  // register (David 2026-09-12: "make sure the narrations match what is
  // being shown on the board"). Same contract as narrationAccuracy, applied
  // to the voiced corpus instead of the curated lessons.
  'src/data/corpusRewriteAccuracy.test.ts',
  // The voiced corpus cannot regress: the two derived files must still be
  // what their source builds (the drift that silently reverts
  // voiced-matchups.json), and chatter is held under a shrink-only ceiling.
  'src/data/voicedCorpusIntegrity.test.ts',
  // The corpus sweep's classifier + trim: pins the ten teaching lines the
  // guard used to eat, and the chatter that must stay cut.
  'src/services/narrationQuality.shared.test.ts',
  // 🔒 DANYA DEVICE COVERAGE (David 2026-08-23, "100%") — every teaching device
  // (behaviours + register clauses + structure) must fire on its crafted trigger
  // position. Self-play can't reach every position (the coach controls its own
  // side), so THIS is the coverage proof; a device regressing to silence on its
  // own trigger makes ship-check RED.
  'src/services/danyaDeviceCoverage.test.ts',
  'src/services/danyaExploitability.test.ts',
  // 🔒 G0 — the LLM decides nothing. Freezes the band-aid count in the coach
  // LLM path; adding a validator/regen/"don't hallucinate" prompt instead of
  // routing through voiceFacts makes ship-check go RED and blocks the push.
  // The teeth behind the rule that was written 8x and ignored for 3 months.
  'src/services/coachInversion.gate.test.ts',
  // 🔒 LLM CHOKEPOINT — every model wire funnels through coachApi.ts and every
  // network primitive is leak-audited. Touching a provider SDK / the /api/llm
  // proxy anywhere else, or adding an untagged primitive, makes ship-check RED.
  // Turns "what else are we missing?" into an enforced, closed question.
  'src/services/coachLlmChokepoint.gate.test.ts',
  // 🔒 BUILT-BUT-UNWIRED GATE (David 2026-09-09) — every board-awareness
  // computer must reach the typed chat Q&A, not just automatic narration.
  // A new positionReadingService computer that no chat lane consumes (and
  // isn't a declared helper) makes ship-check RED, forcing a chat wire.
  'src/services/boardComputerChatCoverage.test.ts',
  // 🔒 PRESCRIPTION GATE (David 2026-07-22) — plan templates may never
  // prescribe a piece the student doesn't have or phase-blind technique.
  // Locative claims were gated; prescriptive grammar is now gated too.
  'src/services/planPrescriptions.test.ts',
  // 🔒 COMPUTED-VOICE GROUNDING (David 2026-09-12 deep dive) — describeMoveGeometry
  // must never claim fork/pin/"wins"/"attacks" on a move whose piece LEGALLY hangs
  // (the pin-blind seeGain class + the unguarded bare-"attacks" clause). voiceFacts
  // can only rephrase, never correct a false computed claim, so it's gated here.
  'src/services/computedVoiceGrounding.test.ts',
  // 🔒 DIFFERENTIAL MATERIAL-TRUTH CORPUS (David 2026-09-13 "make the drift
  // impossible to reopen") — locks the pin/legality-aware SEE sweep against a
  // geometry-only regression. Every differential row proves BOTH the pin-aware
  // read is honest AND the naive seeGain would have lied on that board (invents
  // a win on a pinned attacker / misses a hang behind a pinned defender), and
  // ties capturesWinMaterial + landingIsSafe + the C#6 isCriticalThreat gate to
  // the honest sign — so reintroducing any geometry-only path trips it.
  'src/services/computedMaterialTruth.corpus.test.ts',
  // 🔒 POSITIONAL-TRUTH CORPUS (David 2026-09-13 "strengthen the computers") —
  // locks the positional fact-computers (piece quality / outpost / bad bishop /
  // weak-square holes / passers + blockade) to their board-true definitions so a
  // refactor can't reintroduce a count-only bad bishop or a piece-based hole.
  'src/services/positionalTruth.corpus.test.ts',
  // 🔒 COMPUTED-TRUTH FUZZER (David 2026-09-13 "then do 2") — seeded, reproducible
  // fuzz over the board computers: legalSeeGain vs brute-force optimal SEE on 80
  // random legal positions + definitional invariants (holes, passers, colour
  // complex, minority lever) on 240. The discovery half that catches the next
  // false-claim class at scale, deterministic so it can gate.
  'src/services/computedTruth.fuzz.test.ts',
  // 🔒 OTA UPDATE CONTRACT (2026-09-03) — the reply shape of /api/ota/manifest
  // IS the update mechanism for every native device, and both of its failure
  // modes are INVISIBLE from the app: a no-op without `kind:'up_to_date'` makes
  // the plugin log a phantom downloadFailed (72 of 127 recorded "failures" were
  // ours), and equality-only version comparison lets a stale pointer roll
  // devices BACKWARD onto an older bundle — which is how devices ended up
  // stranded on the Aug-5 build carrying the iOS WASM crash. Nothing in the UI
  // goes red when this breaks; only this does.
  // 🔒 THE SPOKEN VOICE (2026-09-03) — /api/tts picks the voice by DETECTING the
  // passage's language, so a false positive reads a whole English passage in a
  // foreign accent. Reported twice from two different causes (a lone umlaut in a
  // NAME; then plain English words — Turkish `at`, Portuguese `no` — sitting in
  // the stopword lists). Both fixes were verified against hand-picked strings,
  // and neither would have caught the other. This runs the real detector over
  // the real shipped prose and requires silence.
  // 🔒 OPENING NAME RESOLUTION (2026-09-03) — David asked for the "traxler
  // counter gambit", the coach agreed by name, then taught the DANISH GAMBIT.
  // The resolver required every query token to match a shipped name, and the DB
  // says "Traxler Counterattack" — so two CORRECT extra words turned a working
  // match into null. Nothing else goes red when a name silently resolves to the
  // wrong opening; the student just gets taught something they never asked for.
  // 🔒 THE REVENUE PATH REPORTS ITS OWN DEATH (2026-09-03). initBilling fails
  // OPEN with no key — correct, nobody gets locked out — but on NATIVE that
  // means no purchase, no restore, no subscription, and it used to return in
  // silence. The OTA bundle is built from the WEB env, which has no RevenueCat
  // key, so every OTA device hits it. Nothing else can go red for this: the app
  // looks perfect while billing is dead.
  'src/services/billingUnconfigured.test.ts',
  'src/services/openingNameResolution.test.ts',
  // 🔒 HUB COPY vs SURFACE CONTRACT (2026-09-03) — the Play tile advertised
  // "Coach narrates each move" while /coach/play is a PURE PLAYING SURFACE that
  // stays silent until asked. A user reads the tile, plays, hears near-silence,
  // and concludes the coach is broken — the deliberate design reads as a defect.
  // Nothing else goes red when shipped copy contradicts shipped behaviour.
  'src/components/Coach/coachHubCopy.test.ts',
  'api/_lib/ttsLangContent.test.ts',
  'api/_lib/ttsLang.test.ts',
  'api/ota/manifest.test.ts',
  'src/services/otaObserver.test.ts',
  'src/data/corpusTeachesChess.test.ts',      // a shipped note teaches CHESS, not the video it came from —
                                               // the filter existed but ran at 3 call sites of 8, so narrator
                                               // prose reached the endgame cards (David 2026-09-19)
  'src/data/bundledCorpusIsPositioned.test.ts', // a BUNDLED corpus carries only notes the app can anchor —
                                               // danya shipped 6.8 MB of un-positioned phrases at boot for
                                               // weeks because nothing measured it (David 2026-09-19)
  'src/data/lessons/lessonIntegrity.test.ts',
  'src/data/lessons/narrationAccuracy.test.ts',
  'src/data/lessons/narrationGrounding.test.ts',
  'src/data/lessons/lessonDepth.test.ts',
  'src/data/lessons/courseScope.test.ts',
  'src/data/punishGems.test.ts',
  'src/data/lessons/wlppNarration.test.ts',
  'src/data/lessons/lessonTabIntegrity.test.ts',
  'src/data/lessons/pircIntegrity.test.ts',
  'src/data/repertoire-orientation.test.ts',
  'src/data/pro-repertoires-orientation.test.ts',
  'src/data/trapEngineBacking.test.ts',        // trap-claims are Stockfish-backed — no unbacked "weapon" ships (David 2026-08-27)
  'src/data/proRepLessonCoverage.test.ts',     // G9.3 Gate A — every pro-rep opening has a curated LessonScript
  'src/data/proRepLessonAccuracy.test.ts',     // G9.3 — pro-rep lesson narration is board-accurate + reaches a middlegame
  'src/data/proRepPlanAccuracy.test.ts',       // pro-rep middlegame-plan narration is board-accurate (hyphenated + bishop-pair claims)
  'src/data/proRepNarrationVoice.test.ts',     // pro-rep lesson spoken voice: no move-number prefixes, sayShort <=8 words (David 2026-05-31)
  'src/data/proRepLessonArrows.test.ts',       // pro-rep lesson arrows: non-pawn origin + valid piece geometry (David 2026-06-01 "gate the arrows!")
  'src/data/variationMiddlegameDepth.test.ts',
  'src/data/openingManifests.test.ts',
  // 🔒 COST GATES (David 2026-09-11: "what cannot happen is maxing this out
  // again"). The Upstash budget is shared by the spend guard, the bell and the
  // referral credits; blowing it silently switched the spend guard OFF (it
  // fails open) and stranded OTA update checks. These are cheap and fast.
  'src/test/auditStreamNoRedis.test.ts',       // no audit script streams into prod Redis
  'src/services/appAuditor.test.ts',           // streaming is opt-in; "off" sticks
  'api/_lib/usageGuard.test.ts',               // guard pipeline stays 3 commands, backstop bounds a runaway
  'api/ota/manifest.test.ts',                  // OTA reads Blob, not a Redis command per launch
  'src/data/modelGames.test.ts',
  'src/data/modelGames-orientation.test.ts',
  'src/data/perspectiveVoice.test.ts',         // ONE perspective: student=you/your, opponent=they/their, never we/our (David 2026-08-28)
  'src/services/tacticTypeUnification.test.ts', // ONE tactic classifier: the weakness tag is a projection of the concept the coach teaches; legacy geometry has no product caller (David 2026-09-15 "one coach system, not 5")
  'src/services/teachingSelector.test.ts',
  'src/services/structureProse.test.ts',
  'src/services/exchangeLedger.test.ts',
  'src/services/factSelector.test.ts',
  'src/services/coachDecider.test.ts',
  // The two halves of the algo-audit rule: the door EMITS on every return
  // path, and a named audit ASSERTS on the rows. Emission alone is
  // decoration, so both gates ship together or neither means anything.
  'src/services/coachDecisionEmits.test.ts',
  'src/test/algoAuditContract.test.ts',
  'src/services/methodBeat.test.ts',
  'src/services/mapConcurrent.test.ts',
  'src/services/reviewFacetRank.test.ts',
  'src/services/reviewNarrationDefects.test.ts',
  'src/services/needScore.test.ts',
  'src/services/reviewNeedGate.test.ts',
  'src/services/refutedAlternative.test.ts',
  'src/services/planMemory.test.ts',
  'src/coach/surfaceContract.scan.test.ts',
  'src/services/needCoverage.report.test.ts', // N6: the need-coverage number per profile — cold floor never drops, mastered ceiling never rises // N4: the surface table is exhaustive; no surface hard-codes a register or calls a fact-computer directly (shrink-only baseline) // N1: THE ONE SELECTOR — thesis/moments/chain, surface-blind, the review card's own candidates
  'src/services/tacticTypeBackfill.test.ts', // N0: persisted tactic tags are re-tagged through the ONE unified classifier on boot (idempotent, sync-safe, never guesses)
  'src/test/auditConceptGameplayCues.test.ts', // the gameplay audit recognises a SPOKEN concept by name + the engine invariant's cue — pinned to conceptEngine so the audit cannot drift from the source it verifies
  'src/data/lessons/openingWiring.test.ts',
  'src/services/middlegamePlanner.test.ts',
  'src/data/middlegamePlanThemes.test.ts',
  'src/data/middlegamePlanContinuity.test.ts',
  'src/data/lessons/lessonSources.test.ts',
  'src/components/Openings/MiddlegamePlansSection.test.tsx',
  'src/components/Openings/EndgamePlansSection.test.tsx',
  'src/components/Openings/CommonMistakesSection.test.tsx',
  'src/components/Openings/OpeningExplorerPage.test.tsx',
  'src/components/Openings/OpeningDetailPage.wiring.test.ts',
  // 🔒 NO DEAD LANES. Five narration lanes were found this session computing
  // correctly and reaching nobody — the gem, the plan, the mate branch, the
  // corpus tiers below the bake, and a split lane whose threshold could never
  // be met. Every one passed its own unit tests, because a test that calls a
  // function with values chosen to satisfy it can never ask whether those
  // values occur. This gate asks the opposite question of each lane and fails
  // the build the moment one becomes structurally unable to speak.
  'src/services/laneReachability.test.ts',
  'src/utils/commonMistakeLine.test.ts',
  'src/data/commonMistakeNarration.test.ts',
  'src/data/proRepertoireSources.test.ts',
  'src/data/narrationProvenance.test.ts',
  'src/data/gambitSources.test.ts',
  'src/data/contentConsistency.test.ts',  // opening-tab content fix gate (shrinking baseline → 0)
  'src/data/narrationFactCheck.test.ts',  // chess.js verifies authored attack/fork/coverage claims (was drifting unguarded)
  // ── CONTENT-GROUNDING GATES (David 2026-06-29 "gate the shit out of everything"). ──
  // Stockfish 18 (offline → grounding-items.json) adjudicates every line / mistake
  // / trap / gem; shrinking baselines grandfather the current backlog so NEW
  // un-grounded content fails the build. Rebuild data: node scripts/ci/build-grounding.cjs
  'src/data/groundingLines.test.ts',      // opening lines sound for the student (engine)
  'src/data/groundingMistakes.test.ts',   // common-mistakes are really mistakes (wrong engine-worse than right)
  'src/data/groundingTraps.test.ts',      // trap weapons win / warnings punish (engine)
  'src/data/groundingGems.test.ts',       // punish-gems still leave a real student edge (engine)
  'src/data/groundingLessons.test.ts',    // lesson sublines (deep Watch/Learn tails) sound for the student (engine)
  'src/data/groundingPlans.test.ts',      // middlegame-plan lines sound for the student (engine)
  'src/data/lessons/groundingContinuation.test.ts', // no NEW out-of-book decaying-tail line (stage-2 best-move tripwire)
  // The bake IS what the voice says, and it is committed data — so the file
  // that ships can drift from the offline gate that produced it. Re-runs the
  // real gate over the real bake (2026-08-08: 342 lines had come back echoing
  // the prompt's own example, turning a Philidor note into skewer prose).
  'src/services/spokenBakeFidelity.test.ts',
  // The hand-written spoken forms live in a small reviewable file and only
  // reach a student through the big one. Two files can drift, silently — the
  // app keeps speaking, just not the reviewed words. This asserts the merge
  // has been run and every line is in the shipped bake verbatim.
  'src/services/handwrittenSpoken.test.ts',
  // The three defects David's 2026-08-16 prod game exposed: borrowed teaching
  // naming pieces the board does not have, the opponent's Elo never reaching
  // the engine, and the hint lane grading the student at a different depth
  // than it advised at. Each passed every existing test.
  'src/services/coachTurnTruth.test.ts',
  // …and the ROOT of the first of those (David: "good that gates work, but fix
  // at the root"). The gate refused 238 piece-false sentences in one prod game;
  // this asserts selection stops offering them, so the gate goes back to being
  // the backup that never fires.
  'src/services/noteSelectionPieceTruth.test.ts',
  // The audit's own honesty: a candidate the SEARCH passed over is not a gate
  // trip. 130 of them filled 43% of David's rolling buffer in one game.
  'src/services/coachAnswerGates.test.ts',
  // The REASON attached to a recommended move. "Winning the pawn on f5" with a
  // bishop covering f5 is why David said the suggestions were bad — the moves
  // were all within 26cp of best; the reasons were not true.
  'src/services/playCommentary.test.ts',
  // The alert lane's two 2026-08-16 defects: a battery reported with nothing
  // to aim at ("the useless rook and queen battery on the 8th rank"), and the
  // opponent look-ahead switched off by a `null` analysis, so a fork could
  // only ever be announced after it landed.
  // An audit that cannot reach prod is not an audit — it fails as
  // ERR_CONNECTION_RESET, which reads as "prod is down, use localhost". 43 of
  // 278 scripts were in that state on 2026-08-16.
  'src/test/auditHarnessReach.test.ts',
  // The OTA version must mean the same thing on both sides of the comparison.
  // 7 real iOS devices were failing to update because Xcode Cloud and the
  // deploy runner abbreviated the same SHA to different lengths.
  'src/test/otaVersionStable.test.ts',
  // A price stated in prose drifts the moment the store tier changes — and it
  // was stated in the Terms of Service, for a product with paying members.
  'src/data/pricingCopy.test.ts',
  'src/services/tacticsDetector.test.ts',
  'src/services/liveTacticsContext.test.ts',
  // "Your strongest reply" said for a move 10-18cp off the engine's own top
  // line, twice in one game. MultiPV 3 already returns the runner-up.
  'src/services/bestReplyRanking.test.ts',
  // Was red on `main` and nobody saw it, because it was in no gate list.
  'src/services/hintLaneCoverage.test.ts',
  // ── WEAKNESS-LOOP / BUCKET-DELIVERY GATES (David 2026-07-06 "log and audit the buckets"). ──
  'src/services/bucketPipelineAudit.test.ts', // captured answer → right bucket + drill (delivery) + ranking/dedup/SRS (organization)
  'src/hooks/useDiscussionPractice.test.ts',  // faucet: rating-adaptive slip picker, good-move non-blocking line, response logging
  // The live surfaces see the student's NEED, and only on their own ply — the
  // mover guard is what stops half of every game going mute.
  'src/services/liveNeedGate.test.ts',
  // A Watch-register beat speaking on a live board narrates the student to a
  // third party — "he takes away Black's pin", said to the person who just
  // played it. The register is part of the selection, like the seat.
  'src/services/curatedBeatRegister.test.ts',
  // A Lichess puzzle carries the opening's tag whichever side is solving, so
  // 58% of the punish stage seated the student in the opponent's chair.
  'src/services/punishStageSeat.test.ts',
  // The perspective law was written into five prompts in five wordings, and
  // every copy banned we/our while permitting "he's up a point of material".
  'src/services/perspectiveRule.test.ts',
  // ONE list answered TWO questions in five files, and the difference was f7 —
  // the coach could not say Ng5 eyes it.
  'src/services/keySquares.test.ts',
  // The fork two moves out — four gates, a two-move domain, and a rank BELOW
  // must-defend so foresight never speaks over live material.
  'src/services/latentFork.test.ts',
  // The coach told you to push a passer without ever checking whose queens
  // first — and the obvious fix, a tempo count per plan, compares pawn pushes
  // against rook moves.
  'src/services/planRace.test.ts',
  // The coach carried two fundamentals vocabularies — 33 negatives filed under
  // weakness tags, 10 positives filed under nothing — and the positive ids were
  // destroyed at the module boundary before anyone could map them.
  'src/services/fundamentalVocabulary.test.ts',
  // The concept axis carried two vocabularies spelling six of the same ideas
  // differently — knight-outpost vs outpost, passed-pawn vs passed-pawn-push —
  // so a live weakness could never match the review beat that taught it.
  'src/services/conceptVocabulary.test.ts',
  // PlanBeat carried text+arrows only — no id, no squares — so review's plan
  // beats fell straight through the decider's subsumption (a fact with no
  // squares is never collapsed) and nothing could rank or dedupe them.
  'src/services/planBeatShape.test.ts',
  // The coach/third-coach divergence as a shrink-only number: 254 direct
  // fact-computer imports across 56 surfaces, 62 of them in CoachTeachPage.
  'src/coach/surfaceComposition.scan.test.ts',
  // The forget-on-rewind say-once rule, implemented twice under two ref names.
  'src/services/standingFactMemory.test.ts',
  // Importance gates the INTERRUPT and scaled by rating alone — identical for a
  // student with 200 analysed games and one with zero, while needScore had been
  // data-driven all along. Raise-only; a hole must never invent a moment.
  'src/services/importanceStudentTerm.test.ts',
  // A stubbed chess.js is a second implementation nobody keeps in step: three
  // files carried one and two of them took 17 tests red on `main` unnoticed.
  'src/test/noChessJsMock.test.ts',
  // Four gates were green against 19.6% of the teaching corpus because
  // `import '../test/loadFullCorpus'` primes nothing — it exports a function.
  'src/test/loadFullCorpusIsCalled.test.ts',
  // 159 scripts waited on an element deleted 2026-09-02 — 52.6 min of dead
  // wall-clock per fleet run, and two pro-rep audits crashing outright.
  'src/test/noDeadCalibrationBubble.test.ts',
  // The board's FEN must be LIVE, not the render snapshot — a same-tick read
  // after a mutation returned the PRE-mutation position and broke a takeback.
  'src/hooks/useChessGame.liveFen.test.tsx',
];

// ── THE CONTEXT GATE (David 2026-09-17, non-negotiable: "You must gain context
// before each build! Make that impossible to forget or bypass.") ──────────────
//
// CLAUDE.md has said "MAP EVERY SURFACE BEFORE BUILDING" since 2026-09-08 and it
// was bypassed anyway. A rule in a markdown file is a convention, and this repo's
// own doctrine is that conventions rot while gates do not — so the rule runs here
// and FAILS THE PUSH. `--verify` REGENERATES each changed surface's map from the
// code and diffs it against the committed one, which proves the map is FRESH
// instead of merely present: a map written before the change cannot match the
// code after it. Runs FIRST because it is the cheapest step (<1s) and because a
// build started without context should stop before anything else is spent on it.
// ── THE LOAD GUARD (PLAN §B 11a, 2026-09-20) ────────────────────────────────
//
// Three ship-checks in one afternoon went red with ZERO assertion errors:
// every gate failure was a vitest `Test timed out` while three sibling
// worktrees ran their own typecheck/eslint (load avg 34–56 on 6 cores; a 55 s
// typecheck took 1398 s). A contaminated ship-check is worse than none — it
// costs the run AND sends the session chasing a product red that is not
// there. So the check refuses to START above a load cap and says why, instead
// of running blind and reporting a machine artifact as a verdict. Override
// with SHIP_CHECK_LOAD_CAP=<n> (or SHIP_CHECK_IGNORE_LOAD=1 when you have
// read the load yourself and accept the risk).
{
  const load1 = loadavg()[0];
  const cores = cpus().length || 1;
  const cap = Number(process.env.SHIP_CHECK_LOAD_CAP ?? 8);
  const ignore = process.env.SHIP_CHECK_IGNORE_LOAD === '1';
  process.stdout.write(`  • load guard  ... `);
  if (load1 > cap && !ignore) {
    process.stdout.write(`✗ 0.0s :: load ${load1.toFixed(1)} on ${cores} cores is above the ${cap} cap\n`);
    console.error(`\n  ship-check refused to start: 1-minute load average ${load1.toFixed(1)} (cap ${cap}).`);
    console.error('  Something else is burning the machine (another session\'s typecheck, an audit, a build).');
    console.error('  Wait for it, or rerun with SHIP_CHECK_LOAD_CAP=<n> / SHIP_CHECK_IGNORE_LOAD=1 once you have read the load yourself.');
    process.exit(1);
  }
  process.stdout.write(`✓ 0.0s :: load ${load1.toFixed(1)} on ${cores} cores (cap ${cap}${ignore ? ', ignored' : ''})\n`);
}
// ── THE DOCS LANE (2026-09-20, David: "anything you can do to streamline this
// process, especially getting things to main without cutting critical corners")
//
// MEASURED, not guessed: a docs-only commit was paying the FULL gate — 419 s
// including a 53 s PRODUCTION BUILD, a 25 s typecheck and a 30 s test-typecheck
// — to verify a change to PLAN.md. Three such commits in one evening is twenty
// minutes spent proving that prose cannot break a compiler. Under the load this
// repo sees with four sessions, those runs stretched to 18 minutes each.
//
// 🚨 THIS IS SCOPE, NOT A BYPASS, AND THE DISTINCTION IS THE WHOLE POINT. The
// lane does not skip a gate that could fail; it skips gates that CANNOT observe
// the change, and it still runs every gate that READS a doc. Two tests do:
// `outlineCoverage` (PLAN.md + OUTLINE.md) and `pricingCopy`
// (docs/store-listing-copy.md). Both run here. A docs commit that breaks the
// board gate still fails the push, which is exactly what happened the first time
// this gate met a wrapped continuation line.
//
// FAIL CLOSED, THREE WAYS — any doubt takes the full lane:
//   1. ONE non-doc path in the diff and the lane is off entirely. Not "mostly
//      docs": all or nothing, because the cost of a wrong skip is a broken main
//      and the cost of a wrong full run is seven minutes.
//   2. An EMPTY file list means git told us nothing, which is not evidence of a
//      docs-only change — take the full lane.
//   3. SHIP_CHECK_NO_DOCS_LANE=1 forces the full run when you want it anyway.
//
// It prints every file it is deciding on, so the decision is auditable in the
// log rather than asserted. An unexplained fast pass is not a pass.
// EXCLUSIONS, each for a measured reason rather than caution:
//  · `..` anywhere — `docs/../src/evil.ts` matched the first draft of this
//    allowlist and would have skipped every code gate for a source file. Git
//    does not normally emit such a path; the lane still refuses it, because a
//    guard that relies on its input being well-formed is not a guard.
//  · CLAUDE.md — `surface-map.mjs` EMBEDS its locked sections into the
//    committed surface maps, so editing it can stale them and the context gate
//    is the thing that catches that. It is a doc that code gates can observe.
//  · docs/surface-maps/** — those ARE the generated maps the context gate
//    verifies. A change there is exactly what must not skip verification.
const DOC_PATH = /^(?:[^/]*\.md|docs\/.*|\.github\/.*\.md)$/;
const DOC_EXCLUDED = (f) =>
  f.includes('..') || f === 'CLAUDE.md' || f.startsWith('docs/surface-maps/');
const _docsLaneFiles = (() => {
  try {
    return changedFiles();
  } catch {
    return [];
  }
})();
const DOCS_LANE =
  process.env.SHIP_CHECK_NO_DOCS_LANE !== '1' &&
  !FULL &&
  _docsLaneFiles.length > 0 &&
  _docsLaneFiles.every((f) => DOC_PATH.test(f) && !DOC_EXCLUDED(f));

if (DOCS_LANE) {
  console.log('  ── DOCS LANE ───────────────────────────────');
  console.log('  Every changed path is documentation, so the code gates cannot');
  console.log('  observe this change. Running only the gates that READ docs.');
  for (const f of _docsLaneFiles) console.log(`    · ${f}`);
  console.log('');
  runStep('doc gates   ', 'npx', [
    'vitest',
    'run',
    'src/test/outlineCoverage.test.ts',
    'src/data/pricingCopy.test.ts',
  ]);
  const failed = results.filter((r) => !r.ok && !r.optional);
  console.log('');
  console.log('──────────────────────────────────────────────');
  if (failed.length === 0) {
    console.log(`  READY TO PUSH (docs lane — ${_docsLaneFiles.length} doc file(s), no code touched)`);
    process.exit(0);
  }
  console.error('  ✗ docs lane FAILED — a gate that reads these docs is red.');
  process.exit(1);
}

runStep('context gate', 'node', ['scripts/surface-map.mjs', '--verify']);
//
// THE SAME GATE, ONE LEVEL UP (David 2026-09-18: "You do not miss this step
// ever again"). The four levels of context are I. FOUNDATION, II. STATE,
// III. SURFACE, IV. CODE — and III has been ungameable since the line above
// landed, while II was a promise. A promise is a convention, and this repo's
// own doctrine is that conventions rot. So level II is DERIVED from the code
// and verified exactly the way the surface map is: `--verify` regenerates
// docs/STATE.md and fails the push when the committed copy disagrees with what
// the code now says. Nothing in it is typed by hand, so it cannot be
// hand-waved, and a state written before the change cannot survive it.
runStep('state gate  ', 'node', ['scripts/state-of-build.mjs', '--verify']);
runStep('typecheck   ', 'npm', ['run', 'typecheck']);

// TEST-FILE TYPECHECK — a SHRINK-ONLY CEILING, not a hard zero (#61).
//
// `tsconfig.app.json` excludes every test file, so a type error in a test was
// invisible until that line RAN. It cost real time on 2026-09-19: a required
// parameter added to a hook compiled clean and its stale call site only blew up
// at runtime, inside a test.
//
// Turning it on found 318 errors across 108 files. A hard zero would mean a
// 318-error cleanup before anything else can ship, so this uses the pattern the
// repo already uses for the narration backlogs: the number is VISIBLE and may
// only go DOWN. That is enough to catch what the app cares about — a NEW error,
// which is exactly the class that bit us.
//
// KNOWN WEAKNESS, stated rather than hidden: a count can be held flat by adding
// one error and fixing another. It is still strictly better than no signal, and
// lowering the ceiling as the backlog clears is the intended direction.
// 318 → 317 (2026-09-19): typing `concepts` on the secondary-corpus gate's
// `Note` cleared two, and the corpus move added one back.
//
// 317 → 296 (2026-09-19, same day, second pass): every error that sat inside a
// LOAD-BEARING GATE. They were not cosmetic. `coachDecider.test` and
// `liveNeedGate.test` built a StudentContext missing BOTH `need` and
// `momentBoost` — the two terms this codebase deliberately made REQUIRED
// because review forgot them ("an optional student term is a lane's licence to
// forget the student"). The gate enforcing the one-door rule was itself
// forgetting the student. `needCoverage.report.test` omitted `capabilities`,
// the GREEN heat-map term, so the coverage number could not see the green path
// at all — the path that shipped the night before; it also omitted `clauseKind`,
// so the number is measured through the conceptId arm only (now stated at the
// call site). `liveNeedGate.test` imported `ImportanceSignals` from a module
// that does not export it, masking four further errors until corrected.
// All five gates pass unchanged and the numbers did not move.
//
// ZERO gate files carry a type error. Keep it that way; drive the rest down
// from the non-gate backlog. Ceilings only ever come DOWN.
const TEST_TYPE_ERROR_CEILING = 236;
// THE INSTRUMENT MUST NOT REPORT NOTHING AS GREEN (2026-09-19). Under Node's
// default heap this tsc run DIES with "FATAL ERROR: … heap out of memory"
// (SIGABRT, exit 134). A crash dump contains zero "error TS" lines, so the
// count below read a dead process as "0 errors — lower the ceiling to 0". Had
// anyone obeyed, the next healthy run would have failed 296 over a ceiling of
// 0. Two fixes: give it the heap it needs (8 GB measures 296 in ~35s), and
// name a crash as a crash — the count is UNKNOWN, not zero.
runStep('test typecheck', 'npx', ['tsc', '-p', 'tsconfig.tests.json', '--noEmit'], {
  optional: true,
  env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim() },
  summary: (out) => {
    if (crashed(out)) {
      return 'tsc CRASHED (heap) — error count UNKNOWN, ceiling NOT measured; do not lower it';
    }
    const n = (out.match(/error TS/g) ?? []).length;
    if (n > TEST_TYPE_ERROR_CEILING) {
      testTypeErrorRegression = n;
      return `${n} errors — ABOVE the ${TEST_TYPE_ERROR_CEILING} ceiling (a NEW test type error)`;
    }
    return n < TEST_TYPE_ERROR_CEILING
      ? `${n} errors — BELOW the ceiling, lower TEST_TYPE_ERROR_CEILING to ${n}`
      : `${n} errors (at the ceiling)`;
  },
});
// PRODUCTION BUILD (2026-07-12, the corpus-bundle incident): typecheck+lint
// can be green while `npm run build` FAILS — a data JSON inlined into the
// entry chunk pushed index.js past the Workbox precache cap and every Vercel
// deploy silently errored for hours (prod stale at an old commit while
// ship-check kept saying READY TO PUSH). The vite build IS the deploy gate;
// run it here so a broken production build can never ship silently again.
runStep('prod build  ', 'npm', ['run', 'build']);
// Lint with NO warning cap — ship-check blocks on ERRORS only (warnings are
// pre-existing rot that drifts up and down at a different cadence than the
// gate set). `npm run lint` enforces a project-wide warning cap (currently
// 248) that's useful in code review but ALSO fails ship-check when the cap
// is exceeded, even when no errors were introduced. Decouple the two.
// 🔒 The lint step needs a heap the default Node limit does not give it.
// Found 2026-09-19 on Node 26: a whole-repo eslint died with a V8 native
// stack trace, and the summarizer — which only reads eslint's own report —
// rendered that crash as "✗ … 0 errors": a row that contradicts itself and
// reads as a lint failure while NOTHING was linted. The same command with an
// 8 GB heap exits 0. An instrument must never report a crash as a verdict, so
// the heap rides on the step itself rather than on whoever remembers to
// export it. Any caller-supplied NODE_OPTIONS is kept in front of it.
runStep('lint (errors)', 'npx', [
  'eslint', '.', '--ext', 'ts,tsx',
  '--report-unused-disable-directives',
  '--max-warnings', '99999',
], {
  summary: summarizeLint,
  // Whole-repo eslint exceeds Node 26's default heap on an arm64 Mac and dies
  // with SIGABRT after ~100s; see the test-typecheck note above for the same
  // failure and the same fix.
  env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=8192`.trim() },
});
runStep('content gates', 'npx', ['vitest', 'run', ...GATE_TESTS], { summary: summarizeVitest });

// Co-located tests for the source files changed in THIS work — catches
// regressions in tests that aren't in the curated GATE_TESTS and that the
// (un-run) full suite would otherwise hide. David 2026-05-24: ship-check let a
// ModelGamesSection regression through because that .test wasn't gated. Rule:
// edit Foo.tsx → ship-check runs Foo.test.tsx.
const _colocated = changedSourceTests(changedFiles());
if (_colocated.length) {
  runStep('changed-file tests', 'npx', ['vitest', 'run', ..._colocated], { summary: summarizeVitest });
} else {
  console.log('  • changed-file tests... ○ none beyond the gates');
}

// INFORMATIONAL: audit stream pull (never blocks).
pullAuditStream();

// ── FULL MODE — Playwright matrix auto-detected from changed files ──
//
// Maps file globs → audit scripts. When --full runs, we look at the
// files changed in this work (unpushed commits + working tree) and run
// the audits whose globs match. Matrix mirrors CLAUDE.md's Post-Deploy
// Audit table so the source of truth stays in one place.
//
// "Always" entries run on every --full regardless of changes — they're
// the canonical content-rendering checks that should pass whatever you
// touched. Surface-specific entries layer on top.
const AUDIT_MATRIX = [
  { script: 'audit-named-traps.mjs',         globs: ['src/data/lessons/', 'src/components/Openings/', 'src/data/repertoire.json'], always: true },
  { script: 'audit-leadeye-plans.mjs',       globs: ['src/data/lessons/', 'src/data/middlegame-plans.json', 'src/components/Openings/'], always: true },
  { script: 'audit-opening-trap-tiles.mjs',  globs: ['src/data/lessons/', 'src/data/repertoire.json', 'src/components/Openings/'] },
  { script: 'audit-coach-teach-unknown-line.mjs', globs: ['src/components/Coach/Teach', 'src/services/coachAgent', 'src/services/openingGenerator'] },
  { script: 'audit-coach-master-integration.mjs', globs: ['src/coach/sources/', 'src/services/masterPlayWatcher', 'src/services/claimValidator'] },
  { script: 'audit-coach-tactical-awareness.mjs', globs: ['src/coach/sources/tactics', 'src/services/tactics'] },
  { script: 'audit-dashboard.mjs',           globs: ['src/components/Dashboard', 'src/components/SmartSearchBar'] },
  { script: 'audit-weaknesses.mjs',          globs: ['src/components/Weaknesses', 'src/services/weaknessService'] },
  { script: 'audit-coach-plan.mjs',          globs: ['src/components/Coach/Plan', 'src/services/coachPlan'] },
  { script: 'audit-coach-review.mjs',        globs: ['src/components/Coach/Review', 'src/services/gameReview'] },
  { script: 'audit-back-from-review.mjs',    globs: ['src/components/Coach/Review'] },
  { script: 'audit-tactics.mjs',             globs: ['src/components/Tactics', 'src/services/srsEngine'] },
  { script: 'audit-tactic-drill-flow-prod.mjs', globs: ['src/components/Tactics/TacticDrillPage.tsx', 'src/components/Puzzles/PuzzleBoard.tsx'] },
  { script: 'audit-settings-behavior.mjs',   globs: ['src/components/Settings'] },
];

function changedFiles() {
  // Unpushed commits + working-tree changes. Falls back to "everything in
  // src/" if git is unavailable.
  const out = [];
  for (const cmd of [
    ['git', ['diff', '--name-only', 'origin/main...HEAD']],
    ['git', ['diff', '--name-only', 'HEAD']],
    ['git', ['ls-files', '--others', '--exclude-standard']],
  ]) {
    const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf-8' });
    if (r.status === 0) out.push(...r.stdout.split('\n').filter(Boolean));
  }
  return [...new Set(out)];
}

// Co-located *.test.{ts,tsx} for changed source files, minus what GATE_TESTS
// already runs (avoid double-running). A changed `.test` file runs directly.
function changedSourceTests(changed) {
  const tests = new Set();
  for (const f of changed) {
    if (!/^src\/.*\.(ts|tsx)$/.test(f)) continue;
    // Mirror vitest.config.ts `exclude` — the benchmark suite is opt-in
    // (`npm run test:perf` / its own config), so running it via the default
    // config yields "No test files found" and falsely fails the step.
    if (f.startsWith('src/test/benchmarks/')) continue;
    if (/\.test\.(ts|tsx)$/.test(f)) { if (existsSync(f)) tests.add(f); continue; }
    const base = f.replace(/\.(ts|tsx)$/, '');
    for (const t of [`${base}.test.ts`, `${base}.test.tsx`]) if (existsSync(t)) tests.add(t);
  }
  return [...tests].filter((t) => !GATE_TESTS.includes(t));
}

function pickAudits(changed) {
  const picked = [];
  for (const entry of AUDIT_MATRIX) {
    const matches = entry.always
      ? true
      : entry.globs.some((g) => changed.some((f) => f.startsWith(g)));
    if (matches) picked.push(entry.script);
  }
  return picked;
}

if (FULL) {
  console.log('');
  console.log('  ── Playwright audits (FULL mode) ────────────');
  const devUp = spawnSync('curl', ['-sf', 'http://localhost:5173/'], { encoding: 'utf-8' }).status === 0;
  if (!devUp) {
    console.log('  ✗ dev server not running on :5173 — start it first (npm run dev)');
    results.push({ label: 'playwright-prereq', ok: false, ms: 0, out: 'dev server down', summary: 'dev server not running' });
  } else {
    const changed = changedFiles();
    const audits = pickAudits(changed);
    console.log(`  changed: ${changed.length} files — picked ${audits.length} audit script${audits.length === 1 ? '' : 's'}`);
    for (const f of changed.slice(0, 8)) console.log(`    · ${f}`);
    if (changed.length > 8) console.log(`    · ... +${changed.length - 8} more`);
    console.log('');
    for (const script of audits) {
      runStep(script.replace('.mjs','').padEnd(38), 'node', [`scripts/${script}`], {
        env: { AUDIT_SMOKE_URL: 'http://localhost:5173' },
        summary: summarizePlaywright,
      });
    }
  }

  // Hole 6 — masters legitimacy (network, via prod proxy) + Stockfish
  // soundness (engine, auto-skips when no UCI binary) on past-book lesson
  // plies. Doesn't need the dev server. Only when masterclass content
  // changed, since it's a multi-minute network/engine pass.
  const mcTouched = changedFiles().some(
    (f) => f.startsWith('src/data/lessons/') || f === 'src/data/middlegame-plans.json',
  );
  if (mcTouched) {
    console.log('');
    console.log('  ── Hole 6: past-book verification (masters + Stockfish) ──');
    runStep('hole6-pastbook-verify'.padEnd(38), 'npx',
      ['vitest', 'run', 'src/data/lessons/mastersCoverage.test.ts'],
      { env: { RUN_MASTERS_AUDIT: '1' }, summary: summarizeVitest });
  }
}

// ── Report ────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok && !r.optional);
// A NEW test type error blocks, even though its step is `optional`. The step is
// optional so that the 318-error BACKLOG is not a permanent red; the ceiling is
// what makes it a gate rather than a readout.
if (testTypeErrorRegression > 0) {
  failed.push({
    label: 'test typecheck',
    ok: false,
    ms: 0,
    optional: false,
    summary: `${testTypeErrorRegression} > ${TEST_TYPE_ERROR_CEILING} — a NEW type error in a test file`,
    out: 'Run: npx tsc -p tsconfig.tests.json --noEmit',
  });
}
const elapsed = ((Date.now() - STARTED) / 1000).toFixed(1);

console.log('');
console.log('──────────────────────────────────────────────');
if (failed.length === 0) {
  console.log(`  READY TO PUSH (${elapsed}s)`);
  // Persist a green-run watermark — `--summary` reads this to print
  // "what's changed since last green." Gitignored.
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ?? '';
    const entry = {
      sha,
      timestamp: new Date().toISOString(),
      elapsedSec: Number(elapsed),
      mode: FULL ? 'full' : 'fast',
      checks: results.map((r) => ({ label: r.label.trim(), ok: r.ok, summary: r.summary ?? null })),
    };
    writeFileSync(LOG_LATEST, JSON.stringify(entry, null, 2) + '\n');
  } catch { /* logging is best-effort */ }
  console.log('');
  process.exit(0);
}

console.log(`  ${failed.length} CHECK${failed.length === 1 ? '' : 'S'} FAILED (${elapsed}s)`);
console.log('');
for (const r of failed) {
  console.log(`  ✗ ${r.label.trim()}`);
  const tail = (r.out ?? '').split('\n').filter(l => l.trim()).slice(-25);
  for (const line of tail) console.log(`      ${line}`);
  console.log('');
}
console.log('  Fix the failures above and re-run.');
console.log('');
process.exit(1);
