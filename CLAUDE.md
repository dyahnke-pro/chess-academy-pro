# CLAUDE.md — Chess Academy Pro

This file is loaded automatically in every Claude Code session. Follow these instructions exactly.

## 👋 The user

The user is **David**. Address him by name when relevant. Single-user
app, built for him. No multi-tenancy, no other accounts.

## 🚨 NON-NEGOTIABLE GATES (apply to every change, every session)

These are HARD requirements — not "best effort." Skipping them is a
ship-blocking failure no matter how trivial the change looks.

### G0. THE LLM DECIDES NOTHING — it voices facts computed in code (David 2026-06-10, LOCKED, supreme law).

This rule was written EIGHT different times scoped to specific
surfaces (walkthroughs, stage-gen, kids) and got ignored for THREE
MONTHS on the coach chat because none said "**every** LLM call,
including chat." It does now, with no loophole:

**The LLM generates ZERO chess content. Moves, evals, lines, AND the
*reason* a move is strong are ALL computed in code (Stockfish,
chess.js, the DB, the tactics engine, `explainBestMoveGrounded`,
`liveTacticsContext`) and handed to the LLM. Its ONLY job, on EVERY
path, is to phrase those facts.**

**THE TEST (apply before you write a line):** if you are adding a
validator, a gate, a regen/retry, a claim-stripper, or a prompt that
says "use exactly these squares / don't hallucinate / cite only the
context" — **STOP.** Every one of those exists only because the LLM is
still *deciding*. That's the disease, not the cure. Compute the answer
in code and route it through the one chokepoint, `voiceFacts`
(`coachApi.ts`). True inversion has nothing to validate because the
LLM was never given a choice.

This applies to ALL 26 `CoachTask`s + every non-task LLM call — chat,
commentary, hints, reports, search, intent-classify, narration,
everything. The migration is in flight on branch
`coach-grounding-inversion`.

**Before touching any coach LLM surface, READ:**
`docs/plans/2026-06-10-coach-chat-grounding-inversion.md` (the plan +
the full 26-task inventory) and
`docs/plans/2026-06-10-coach-inversion-WORKORDER.md` (the execution
guide with every stumbling block pre-cleared). The pure fact-computers
live in the LEAF `src/services/groundedAnswer.ts`; the chokepoint is
`voiceFacts`; the wiring template is the best-move interception in
`getCoachChatResponse`. Don't reinvent — extend the pattern.

### G1. 3-INSTRUMENT post-deploy audit after EVERY build — NON-NEGOTIABLE (David 2026-05-28, locked).

After every push that lands on `main`, run the post-deploy audit
**with all three instruments together** — not just one. Each
instrument verifies a different layer; missing one leaves a gap that
the others can't see.

The three instruments (use them on EVERY post-deploy audit, no
exceptions):

1. **Playwright** drives the live UI — taps, types, navigates,
   asserts on DOM state. Verifies the surface RENDERS and CLICKS
   correctly. Uses the pre-installed Chromium at
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` via the
   `scripts/audit-lib/chromium.mjs` resolver. **Set
   `AUDIT_SANDBOX=1`** when running from the Claude Code sandbox so
   `sandboxLaunchArgs()` adds `--ignore-certificate-errors` (the
   Anthropic egress inspector signs certs Chromium doesn't trust by
   default — without the flag, every prod navigation fails with
   `ERR_CERT_AUTHORITY_INVALID`). Also pass `sandboxContextOptions()`
   to `browser.newContext()` for `ignoreHTTPSErrors: true`.

2. **Live audit-stream pull** — `GET https://chess-academy-pro.vercel.app/api/audit-stream?since=<ms>`
   with the `x-audit-secret` header (env var `AUDIT_STREAM_SECRET`).
   Captures every `logAppAudit()` event the app emitted during the
   run: brain calls, navigation, tool calls, narration, errors.
   Verifies what the app actually DID internally. **Pull before AND
   after the Playwright run** so the delta = exactly this run's
   events. Empty pulls = "app not open" (informational).

3. **Narration listener sidecar** — `scripts/audit-lib/audit-listener.mjs`
   (`startAuditListener()`). Spins up a local HTTP server, point the
   page's `auditStreamUrl` localStorage at it, and the listener
   captures every voice/speak/narration event with its source +
   verbosity tag. Verifies WHAT the voice spoke, in what order, at
   what register (full / brief / silent). The narration accuracy
   gate checks the text against the board; the listener checks it
   ACTUALLY FIRED in the running app — silence where a keystone
   should speak is a bug (this is exactly what would catch a
   ModelGameViewer-never-calls-voiceService regression).

**All three on every run — DOM behavior + emitted events + voice.**
A green Playwright pass alone is NOT a complete audit; the
audit-stream and the listener must be inspected too.

The reference 3-instrument audit script:
`scripts/audit-pro-naroditsky-prod.mjs` — sample structure for new
audits. The Naroditsky build (2026-05-28) proved this end-to-end:
Playwright drove the player page + Watch click, the audit-stream
captured `coach-narration-spoken` events, the listener confirmed the
exact text Ruth spoke through `voiceService.speakPolly`.

Unit tests + typecheck + lint are NOT sufficient — they don't catch
deploy-pipeline issues. The 2026-05-14 back-button incident proved
this: green local tests, broken on prod, only the audit caught it.

**🚨 MERGING/PUSHING IS NOT THE END OF THE WORK.** When code lands on
`main` (whether via `git push origin HEAD:main` or
`mcp__github__merge_pull_request`), your work IS NOT DONE. The very
next thing you do — before any wrap-up text, before any "green
light" message, before declaring success — is run the 3-instrument
audit for the surfaces you changed. Then report results to David.
The 2026-05-18 incident proved this: a 16-commit PR landed on main
and the session moved on without running the audit; David had to
call it out. If you find yourself about to say "pushed to main —
try it on your phone", STOP and run the audits first. The audit
step is the merge's COMPLETION, not a follow-up step.

**Sandbox CAN reach prod for the audit** (corrects an outdated
2026-05-15 note — David 2026-05-28). `curl` to
`chess-academy-pro.vercel.app` succeeds; Chromium succeeds with
`AUDIT_SANDBOX=1`. The 3-instrument audit runs from the Claude Code
sandbox against the LIVE prod URL with no proxy required. The
audit-stream endpoint pulls from prod directly (HTTP 200). Per-pro
egress allowlists may vary — `curl` test first and fall back to a
local dev server (`npm run dev` on :5173) only if prod is genuinely
blocked in that container.

**🔒 YOU CAN REACH `main`/PROD FOR A TRUE PLAYWRIGHT AUDIT — DON'T
SETTLE FOR LOCALHOST WHEN PROD IS LIVE (David 2026-05-29, locked).**
After landing on `main`, run the 3-instrument Playwright audit against
the LIVE prod URL (`AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app
AUDIT_SANDBOX=1 node scripts/audit-<surface>.mjs`) — that is the
deploy-pipeline-verifying audit, not just a code check. A localhost
run validates the CODE but NOT the deploy (wrong bundle aliased, env
scoped wrong, CDN serving stale). So: ALWAYS verify the prod bundle
hash advanced past your push first (`curl -s https://chess-academy-pro.vercel.app/?cb=$(date +%s) | grep -oE '/assets/index-[A-Za-z0-9]+\.js'`
with a cache-buster), THEN run the audit against prod. localhost is the
FALLBACK for when prod is genuinely unreachable/stale (e.g. the Vercel
100-build/day cap is blocking the deploy) — say so explicitly and
re-run against prod once it's live. Don't claim a surface shipped on
prod evidence you only gathered from localhost.

The pattern (battle-tested 2026-05-16 + 2026-05-28):

1. **Browser binary is pre-installed** at
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. The
   resolver `scripts/audit-lib/chromium.mjs` finds it via
   `resolveChromiumExecutable()`.

2. **Run against prod by default.** Set `AUDIT_SANDBOX=1` and use
   `sandboxLaunchArgs()` + `sandboxContextOptions()` so Chromium
   accepts the resigned cert. Pull the audit-stream from prod.
   Listener can still attach (override `auditStreamUrl` in
   localStorage on first load).

3. **Fall back to localhost** ONLY if prod is unreachable from this
   container (curl test returns `host_not_allowed`). In that case
   run `npm run dev > /tmp/vite.log 2>&1 &` first; intercept audit
   POSTs via `page.on('request', ...)` since they can't reach prod.

4. **🚨 SANDBOX IndexedDB WRITE-STALL — UNLOCK THE PROGRESSION, do NOT "route
   to David" (corrected David 2026-06-01; SUPERSEDES the old "don't burn hours
   / route to David" guidance — that was the stale order that wrongly blocked
   WLPP/gem audits).** In the sandbox browser the openings-store *write* a
   click handler makes — rung completion via `markRungComplete`, the two-tap
   unlock-all, favorites, drill progress — intermittently stalls. So an audit
   that tries to ADVANCE the ladder by *completing* Watch (a write) hangs, and
   Learn/Practice/Play and the weapon GEMS stay locked. The fix is NOT to give
   up — it is to **UNLOCK THE PROGRESSION UP FRONT BY SEEDING, NOT CLICKING**:
   before driving the surface, write each opening's `linesUnlockedAll` to
   include the main line (`MAIN_LINE_INDEX = -1`) AND every variation index.
   Then `isLineUnlockedAll` makes `isRungUnlocked` (every rung) AND
   `areWeaponsUnlocked` (gems + traps) read TRUE — every WLPP button and every
   gem is clickable with NO runtime ladder write. READS work, so you make the
   UNLOCKED STATE a read. Seed it with a controlled `indexedDB` put at a quiet
   moment (the deferred seed itself completes), e.g. `page.evaluate` opening
   `ChessAcademyDB` and `store.put`-ing each opening with `linesUnlockedAll`
   set; `scripts/audit-lib/idb-unlock.mjs` (`seedUnlockedOpenings(page, ids)`)
   is the shared helper and `audit-samay-deep-prod.mjs` is the reference. THEN
   drive Watch → Learn → Practice → Play → every gem and verify each (mount +
   the `/api/tts` voice contract + the narration-listener events). The ONLY
   thing that genuinely still needs a real device is confirming a FRESH runtime
   unlock-WRITE *persists across reload* (that single commit-path assertion) —
   prove that logic with the fake-indexeddb unit test
   (`openingService.ladder.test.ts`) and flag the on-device persistence check.
   That narrow caveat does NOT excuse skipping the ladder/gem audit. "Writes
   stall so I can't drive past Watch" is now a STALE excuse: seed-unlock and
   drive the whole loop.

5. **Onboarding bubble blocks fresh-context audits.** A fresh
   Playwright context shows the strength-calibration bubble before any
   surface mounts. Dismiss it FIRST: wait for
   `[data-testid="strength-calibration-bubble"]`, click
   `[data-testid="skill-band-intermediate"]`, wait for `detached`
   (the bubble's `applyStrength` is async — 15s timeout is safe).
   Then dismiss any `[data-testid="page-help-modal"]` that
   auto-opens on the destination surface. Without these dismissals,
   every click `intercepts pointer events` and the audit times out.

6. **Deferred-seed timing.** On a cold context, `runSeedOnce` →
   `startDeferredSeed` runs `loadEcoData` (~25s for 3300 entries)
   + `loadProRepertoireData` + `loadGambitData` + `loadModelGamesData`
   + `loadMiddlegamePlansData` + `seedFlashcardsForRepertoire` +
   `loadOpeningNarrations`. Allow **at least 45-60s** after first
   navigation before checking Dexie state for any non-base-repertoire
   content. Pro-rep entries land at ~30s in; full seed completes by
   ~50s. The 35s wait was too tight for the 2026-05-28 Naroditsky
   rebuild audit (only Caro-Kann had landed in Dexie); bumped to 60s.

**Cannot-run-Playwright is no longer a valid excuse in the sandbox.**
The 2026-05-16 session shipped four PRs claiming "I can't run
Playwright here" — that was wrong; the helper was already in place.
If something IS genuinely broken (binary missing, dev server fails),
diagnose it and either fix it or escalate; don't shrug and merge.

### G2. Audit-stream pull on EVERY runtime-touching change.

After any push that touches a runtime path that emits audits — coach
brain, walkthrough runtime, voice, navigation, tool calls, stage gen,
uncaught errors, openings detail page, kid surfaces, etc. — pull the
recent live audit events via `GET /api/audit-stream?since=<ms>` with
the `x-audit-secret` header. The secret is in per-project memory. See
§Audit Stream below for the full pattern.

Pull PROACTIVELY (without asking). Empty pulls are fine — say so and
move on. Skip pulls only for pure content / data-JSON / CSS / test /
docs / build-config changes that can't emit any audits.

### G3. No chess content invented from memory.

Move sequences, FENs, opening sub-lines, trap continuations — these
ALL come from `src/data/openings-lichess.json` or chess.js validation.
The LLM only writes prose narration. If you can't find a continuation
in the DB, the line doesn't exist for us — DO NOT invent moves "from
opening theory" or "from book knowledge." When a sacrificial attack
doesn't have a forced material gain in the DB, classify it as
`mistake` (positional advantage); never extend with invented book
moves.

### G4. TTS = streaming canonical. Buffered MP3 is gone.

`/api/tts` MUST return Polly's audio stream directly to the
client (chunked transfer, no Content-Length). The buffered
`await result.AudioStream.transformToByteArray()` path is dead
— do not reintroduce it for "caching" or "easier debug" or any
other rationale. Production audit (2026-05-18, David's report)
proved the buffered path was the primary source of voice lag:
per-sentence narrations paid the full Polly synthesis time
(~600-1500ms) before a single byte hit the client. Streaming
overlaps synthesis-time with transit-time and cuts perceived
latency in half.

Client-side: `voiceService` consumes the streamed body via
progressive playback (MediaSource / ManagedMediaSource on
iOS). When you add a NEW narration surface or a NEW
TTS-adjacent feature, route it through the canonical
`speakStreamed*` methods on `voiceService` — do not write a
new fetch-then-decode-then-play helper. If you find yourself
calling `response.arrayBuffer()` on a `/api/tts` response,
STOP — that's the dead path. Use the streamed reader.

This is David's directive verbatim (2026-05-18):
*"TTS narration is a production standard. Log into memory and
even remove the other form of streaming so it can't get
confused or forgotten again."*

### G5. Verbosity setting is RESPECTED, not hinted at.

`coachNarration` has three values: `silent` / `brief` / `full`.
Every one of them is a HARD CONTRACT, not a soft hint to the LLM:

**SCOPE (David 2026-05-24): these settings govern IN-GAME / in-lesson
voice narration ONLY.** Explicit "read this text to me" buttons on the
opening detail page (Classic Wisdom, section narration via
`voiceService.speakReadAloud`) are a read-aloud affordance the user just
tapped — they are EXEMPT from verbosity entirely (silent AND brief). This
is the SECOND sanctioned exemption alongside `speakLecture`; route opening-
page read-text through `speakReadAloud` (sets `bypassVerbosity`), never
through `speakForced`. Do NOT extend this exemption to any in-game surface.

- **silent** = no in-game voice fires anywhere. `voiceService.speakInternal`
  short-circuits at the silent gate (unless `bypassVerbosity`, the
  read-aloud carve-out above).
- **brief** = MAX 2 sentences / MAX 30 words. Enforced two ways:
  1. The `fast` verbosity prompt instruction in
     `coachPrompts.ts:VERBOSITY_INSTRUCTIONS` puts the hard cap in
     the system prompt.
  2. `applyBriefVoiceCap` in `utils/coachNarration.ts` is a
     post-process safety net wired into `voiceService.speakInternal`
     — it clips voice text to the cap regardless of what the LLM
     shipped. The chat bubble still shows the full prose; only the
     spoken voice obeys the brief budget.
- **full** = no cap.

When you add a new narration surface or modify the prompt:
- Do NOT add new soft phrasing ("keep it tight", "be concise")
  that the brain can interpret liberally — production audit caught
  the brain shipping 497-char responses on "brief" because the
  rule was soft. Use a numeric cap (X sentences, Y words).
- Do NOT bypass `voiceService.speakInternal` to skip the brief-cap.
  If you find yourself wanting to "just speak this directly without
  the cap," route it through the canonical method and let the cap
  apply. The user picked "brief" specifically because they don't
  want long prose.
- Audit when the cap fires: the wired `voice-speak-invoked` audit
  with `source=voiceService.speakInternal.briefCap` is the
  observability signal that tells us how often the LLM violates the
  cap. Don't suppress that audit.

This is David's directive verbatim (2026-05-18):
*"Make sure voice narration ties into verbosity settings. Right
now mine is set on short. There is also a full narration setting
and none."* And: *"Both narration fixes are MUSTS."*

### G6. Arrows on every step-by-step coach move. No asking.

When the student is walking through a line move-by-move (typing
"I played e4. Your move." / "I played Nc6. Your move." etc.),
EVERY coach response MUST include arrows. Two specific obligations
on every step:

1. **Arrow on the move the coach just played.** If the brain called
   `play_move {"san":"e5"}`, it must emit `[BOARD: arrow:e7-e5:green]`
   in the same response. The animation is gone in 200ms; the arrow
   lingers.
2. **Arrow on every SAN mentioned in prose.** Threats, candidates,
   what-ifs. The full rule is in
   `src/coach/envelope.ts:TEACH_MODE_ADDITION` under
   `═══ STEP-BY-STEP WALKTHROUGHS — ARROW ON EVERY COACH MOVE ═══`.

`validateArrowClaims` in `src/services/arrowClaimValidator.ts` is
the programmatic check — scans the response for SAN-shaped tokens
without matching `[BOARD: arrow:from-to:color]` markers and emits
a `claim-validator-trip` audit with `source=arrowClaimValidator`.
Wired at the response-finalization site in
`CoachTeachPage.handleSubmit`. Audit-only for now; future iteration
may add a regen step when violations fire.

When you add a NEW brain-call surface that does step-by-step
coaching, wire the arrow validator into its response-finalization
the same way (one import, one call to `validateArrowClaims(finalText)`,
emit the audit on violations). Do not skip this — David's audit
caught the rule being ignored even with the NON-NEGOTIABLE label;
the programmatic validator is what catches the relapse.

This is David's directive verbatim (2026-05-18):
*"add the arrows for step by step walk throughs so I don't have to
ask each time."*

### G7. Playwright audits MUST be INTERACTIVE. No exceptions.

The 2026-05-19 incident proved this: I ran scripted Playwright
audits (`audit-coach-teach-unknown-line.mjs`, `audit-coach-plan.mjs`,
`audit-untouched-surfaces.mjs`) that came back 100% green, then
declared the surfaces shipped. The SAME DAY, David typed "Philidor
Defence" into `/coach/teach` and got bounced to the legacy
`/coach/session/walkthrough` page; clicked the trap stage cold and
got an empty/broken state; the British spelling slipped past the
canonicalizer entirely. The scripted audits had no scenario for any
of these because the scenarios were built around canonical
happy-path inputs.

**"Audit green" doesn't mean "surface works." It means "the wires I
tested still work."** Every audit run, after every build (whether in
the sandbox against `localhost:5173` or on David's machine against
prod), MUST include interactive failure-mode probing — not just
canonical happy-path scenarios. Concretely, on every audit run for
every surface touched:

1. **Off-canonical user input.** Type misspellings, alternate
   spellings (British/American), abbreviations, partial names,
   diacritics. Examples that have hit prod:
   `"Philidor Defence"` (British) vs `"Philidor Defense"` (American),
   `"Najdorff"` (typo) vs `"Najdorf"`, `"Caro Cann"` vs `"Caro-Kann"`,
   `"KID"` vs `"King's Indian Defense"`, `"Evans"` vs
   `"Italian Game: Evans Gambit"`. At least 3 such inputs per chat /
   search / typed-input surface.
2. **Cold-cache scenarios.** Clear IndexedDB before the run. Use
   an opening / position / puzzle that has NEVER been generated /
   cached on this device. Surfaces a wholly different code path
   (generation pipeline, network fetch, fallback chain) than
   warm-cache scenarios.
3. **First-time-user flows.** Fresh storage, no session state, no
   warmed pools, no favorites, no SRS enrollments. Run through the
   surface as a user who just installed.
4. **Pick-before-load.** Tap a menu item / chip / tile / stage
   before its underlying data finishes loading. Common failure
   mode: user clicks "punish lines" while `generateMissingStagesInBackground`
   is still 30s away from delivering them → user gets an empty
   state instead of a wait-and-jump.
5. **Out-of-order interactions.** Don't follow the intended
   sequence. Real users skip around; try things in any order.

**If the existing scripted audit only covers happy paths, the
session ADDS the failure-mode scenarios to that script (or writes
a new exploratory audit, e.g. `scripts/audit-<surface>-fuzzy.mjs`)
BEFORE shipping.** Cannot claim "audit green" until failure modes
have been probed.

**When a check can't be automated** (voice playback in headless,
real-device touch gestures, iOS-specific behavior) — say so
explicitly and route it to David. Don't substitute "scripted audit
green" for "I tested it."

**Cannot claim "done" without:**
- The scripted audit pass count + report path, AND
- An explicit interactive-probe paragraph naming the off-canonical
  inputs / cold-cache scenarios / pick-before-load attempts you
  actually drove, AND
- Anything you couldn't probe in the sandbox, explicitly flagged
  for David.

This is David's directive verbatim (2026-05-19):
*"THE PLAYWRIGHT NEEDS TO BE INTERACTIVE!! NO EXCEPTIONS!! FILE
THIS TO MEMORY!!"*

### G8. Reconciliation MUST delete orphans, not just add/update (David 2026-05-28, locked).

When a content JSON's reconciliation function runs on an
already-seeded device, it MUST also delete entries that disappeared
from the JSON — not just add new ones and update existing ones.
Otherwise scrapped content lingers in Dexie and surfaces in the UI
with stale fallback behavior.

The 2026-05-28 incident proved this: the Naroditsky rebuild scrapped
`pro-naroditsky-fantasy-caro` from `pro-repertoires.json`, but
`reconcileProRepertoires()` only bulkPut'd the new entries — the old
orphan stayed in Dexie. It then surfaced on `/openings/pro/naroditsky`
and, with no `LessonScript` for that id, fell through to legacy
`WalkthroughMode` with LLM-synthesised narration (NOT the
hand-authored two-register beats). David's audit caught it; the fix
was a per-player orphan sweep in `reconcileProRepertoires`.

The rule applies to **every reconciliation function** that mirrors a
JSON source into Dexie (`reconcileProRepertoires`,
`reconcileBaseRepertoire`, and any future
`reconcile<Whatever>Data`). Pattern:

1. Build a set of ids the JSON carries (scoped sensibly — per-player
   for pro-rep, per-opening for masterclass plans, etc. — so a
   partial rebuild doesn't wipe unrelated content).
2. Run the existing add/update bulkPut.
3. Walk Dexie for the scoped scope, collect any id NOT in the JSON
   set, `bulkDelete` it.
4. Bump the revision key so already-seeded devices run the migration.

When you add a new reconciler, copy this 4-step pattern. When you
SCRAP entries from a reconciled JSON, you don't need to do anything
extra — the reconciler's delete step handles it, provided you bump
the revision. When you find a fallback-narration / fallback-surface
behavior firing where it shouldn't, ALWAYS check Dexie for orphans
before assuming a routing bug.

This is the directive verbatim (2026-05-28):
*"Lock that in to the rules."*

### G9. Pro-repertoire builds MUST look and feel like masterclass builds — only the spine source differs (David 2026-05-28, locked).

David's directive verbatim: *"I want everything to look and feel like
the masterclasses. The only difference is how we build the spine."*

What this means concretely:

- **The user-visible surface is masterclass-shaped.** A pro opening
  detail page carries the same WLPP grammar (Watch/Learn/Practice/
  Play), variation tabs with their own beat lessons, middlegame plan
  section, pitfalls section, model game(s) per variation, named-trap
  weapons where real, and the unlock ladder. The OpeningDetailPage
  renders pro entries through the SAME components and code paths as
  masterclass entries — that's not a coincidence; that's the design.

- **The voice / narration register is masterclass-shaped.** Beats are
  hand-authored with both registers (full Watch + ≤8-word Learn cue).
  Lead-the-eye arrows + highlights on every move. Sentence-grained
  reveal. No move-number prefixes in prose ("2.Nc3 instead of 2.Nf3"
  → "the queen's knight to c3 instead of the king's knight to f3").
  No robotic bare-SAN sequences that the TTS sanitizer expands into
  awkward "knight to c3 instead of the boring knight to f3" lines.
  Use the masterclass lessons (vienna.ts, caroKann.ts) as the voice
  reference.

- **Move TOWARD masterclass-shaped gates as a directional target,
  not a sudden cliff (David 2026-05-28 clarification: "i don't want
  to say something that will break the build/progress we have made.
  it looks good so far! just need to make small changes to make it
  look and feel the same").** Pro lessons are currently registered
  in the runtime `LESSONS` map only, skipping the masterclass gate
  registry (`registry.ts` OPENINGS array). That trade was made to
  ship the Naroditsky build without rewriting every gate; **don't
  reverse it in a single sweep** — small incremental changes that
  ratchet toward masterclass parity (per-variation lessons here, a
  middlegame plan there, narration polish per pass) are the right
  cadence. When you AUTHOR a pro lesson, apply the masterclass
  voice rules (two registers, lead-the-eye, no move-number prefixes,
  no robotic bare-SAN strings). When you SHIP a content fix, run
  the gates locally to confirm the build's existing position holds.
  Promotion into `registry.ts` OPENINGS is a future step taken when
  the build can clear the gates — not a prerequisite to keep
  iterating on the pro content.

- **The ONLY architectural difference is spine derivation.**
  - Masterclass: spine built from `openings-lichess.json` + curator
    picks (per §0.5 autonomous decision process in the playbook),
    walked through the masters explorer for theoretical depth.
  - Pro repertoire: spine built from the player's actual chess.com
    game corpus (140k+ games for a prolific player like Naroditsky),
    most-played continuation at every branch point — never theory
    recall. Every move chess.js-validated; sources cite the player's
    chess.com archive plus reputable theory URLs and book corpus
    where applicable.

### G9.1 The PRO-REP DEEP BUILD DOCTRINE — locked (David 2026-05-28, emphatic).

David's directive verbatim across this session:
- *"thats not deep enough either! since we have the real games,
  hundreds of them we go deep into every line! deep opening, middle
  game, we can even add end game theory!"*
- *"i dont care how long it takes! i just care that it gets done
  correctly, how i want it to be done!"*
- *"we use all of the games to build one masterclass that captures
  his ideas, moves, words! this is going to go deeper than our
  previously built masterclasses! we are trying to capture their
  exact games move by move."*
- *"dont forget to dig through youtube and add openings and
  teaching from that source! it is pure gold!"*
- *"LOCK THIS IN!!"*

**The data flow per opening:**

1. **Use ALL his games.** A prolific player has tens or hundreds of
   thousands of games on chess.com; we pull every single one. The
   Naroditsky pilot used 140,530 games scanned, ~3,500 in the
   Caro-Kann alone.

2. **Identify named variations from data.** Each opening has 4-8
   canonical variations (Two Knights, Advance, Exchange, Classical,
   Fantasy, etc.). Count games per variation; rank by frequency;
   pick the 6-8 that justify their own tab. Sub-variations inside
   (Botvinnik-Carls under Advance, Panov under Exchange) get
   sub-tabs when their game count warrants.

3. **Opening phase = AGGREGATE SPINE.** Walk the most-played
   continuation at every ply while ≥3-5 games stay on the path.
   The terminus is the natural "opening depth" for that variation.
   Examples from the Naroditsky Caro pilot:
   - Two Knights: opening goes through move 13 (ply 25), 5 games
     still on path
   - Classical: through move 11 (ply 21), 12 games
   - Advance: through move 10 (ply 19), 7 games
   - At each ply, EVERY one of his choices is recorded with
     frequency + win-rate — including the alternatives he sometimes
     picks. The masterclass beat at each ply cites: "his choice
     92% of the time" + "alternatives X and Y with their scores."

4. **Middlegame = PATTERN-EXTRACT from the games that reach the
   opening terminus.** The N games (5-15) at the deepest aggregate
   position have all played the SAME opening; we then look at moves
   13-30 across them and frequency-rank what they played next. The
   patterns ARE his middlegame plan. Naroditsky Caro Two Knights
   example: 3 of 5 played …a5 (queenside push), 4 of 5 played …c5
   (central break) — his middlegame plan revealed in two data
   points. Author the middlegame beats from those patterns.

5. **Endgame = STRUCTURE-EXTRACT from how the games actually END.**
   Walk each game to the final position; classify the endgame type
   (R+P / R+minor+P / opposite-colour bishop / queens-only / K+P /
   etc.); identify the recurring conversion pattern. Naroditsky
   Caro Two Knights example: 3 of 4 decisive games converted in a
   R+P endgame via queenside passed pawn (created by the …a5 push
   from the middlegame). The masterclass beat ties the chain
   together: "the opening teaches you the moves; the middlegame
   teaches you …a5+…c5; the endgame is just collecting what the
   first two phases set up."

6. **Representative game per variation.** From the games at the
   opening terminus, pick the deepest decisive one against the
   highest-rated opponent — that becomes the model game walkthrough.
   Walked move-by-move with narration in his voice.

7. **Multi-game model games.** Not one per variation; 3-5 per
   variation showing different facets of the same plan.

8. **Voice research per opening.** Pull HIS specific teaching
   content for THAT opening:
   - YouTube speedrun videos for that opening (URLs from web
     search; transcripts via WebFetch / third-party transcript
     sites; yt-dlp blocked from sandbox by YouTube bot-check on
     datacenter IPs — route to David's machine if direct
     transcripts are needed)
   - Chessable course pages
   - Lichess studies he authored
   - Chess.com articles he wrote
   - Podcast / interview transcripts
   - For Naroditsky baseline: the Listudy "25 Lessons" distilled
     principles article as the floor; per-opening research is the
     ceiling.

9. **Every narration beat cites BOTH data AND voice.** Format:
   the beat names what the position is + what his data shows
   ("3 of 5 of his games at this position play …a5") + what he
   TEACHES about it (paraphrased from sourced YouTube/Chessable/
   blog content). Data without voice = dry stats. Voice without
   data = unfounded claims. Both together = his masterclass.

**The UI shape per opening (masterclass parity):**

- WLPP grammar (Watch / Learn / Practice / Play)
- Variation tabs, each with its own deep beat lesson (4 of those
  tabs at full depth = real masterclass; 8 of those tabs = the
  Vienna keystone)
- Middlegame plan per variation, playable line + lead-the-eye
- Pitfalls section — common mistakes as WLPP
- Model games per variation — multiple games, his actual wins
- Named-trap weapons section — if any real ones exist in his games
- Endgame section — the recurring endgame structures + a
  representative conversion
- Unlock ladder + everything else the masterclass inherits

**The voice register (apply to every beat):**

- Two registers on every beat: full Watch + ≤8-word Learn cue
- Lead-the-eye colour language — orange move squares (auto), green
  vision arrows (non-pawn, clear sight-line), yellow key squares
- Sentence-grained reveal via narrationSegments
- `sources[]` array on every narration unit
- NO move-number prefixes in prose ("2.Nc3" → "Nc3" or "the
  queen's knight to c3")
- NO bare-SAN sequences that sanitizeForTTS reads as awkward
  "knight to c3 instead of the boring knight to f3" lines — use
  natural piece names paired with file/rank for clarity
- The masterclass voice (vienna.ts, caroKann.ts) is the reference

**Effort:**

- Hours per opening — David: *"i dont care how long it takes."*
- Each opening done correctly per these 9 points beats two openings
  shipped at half-depth.
- The Naroditsky pilot establishes the depth standard; subsequent
  openings (and subsequent pros — Carlsen, Hikaru, Caruana,
  Firouzja, etc.) replicate the same shape.

**Move-toward-gates is still incremental.** Pro-rep openings are
currently registered in `LESSONS` only (skipping the masterclass
gate registry in `registry.ts`). Don't rip up working content to
chase gate compliance — incremental authoring of the 9-point
doctrine above is the cadence. Promotion into the gate registry is
a future step taken when the build can clear the gates.

**The architectural difference (only one):** spine derivation.
Masterclass = `openings-lichess.json` + curator picks + masters
explorer. Pro-rep = the player's actual chess.com (and lichess)
game corpus, aggregated for opening + middlegame, with
representative-game walks for the deep tail and his teaching
content threaded throughout. Every move chess.js-validated; every
beat sources both data and voice.

### G9.2 The PRO-REP BUILD PROCEDURE — step-by-step (locked David 2026-05-28).

David: *"i need you to build the rules in a way that guides future
session to build this correctly the first time without me needing
to baby sit like this in the future."*

This is the procedural playbook. Follow these steps in order for
every new pro-rep opening build. Skip nothing. Don't reinvent.

🚀 **READ `docs/pro-rep-efficient-build-recipe.md` FIRST (locked David
2026-05-31: "write that down as the standard").** It is this procedure made
FAST — the data-extract-then-author recipe that took Hikaru to full G9.1
parity (5 openings, every layer gate-green first try) in one session. The
core move: per layer, write a ~30-line throwaway script that PRINTS the real
spine-terminus + real continuation + the squares the student actually lands
on, then transcribe that into prose — never author from memory. It also
captures the gotchas that cost real time (the Stockfish `score cp` sign
convention for pitfall verification = `studentEval = -rawEval` always; the
`EXTRA_WALK` gem trick for solid systems; the ungated-for-pro-rep arrow /
bishop-pair checks you must run yourself). Read it before STEP 0.

### 🚨 G9.3 THE FOUR HARD GATES THAT MAKE A PRO-REP BUILD REAL — locked David 2026-05-31 (after the GothamChess "Bg5 pins the knight to the queen" incident). READ BEFORE EVERY PRO-REP BUILD.

The 2026-05-31 incident: an 18-opening GothamChess build shipped plans +
model games + gems + pitfalls + tab routing for every opening — and looked
"done" — but the **centerpiece was missing**. None of the 18 openings had a
hand-authored `LessonScript`, so the Watch lesson fell through to the legacy
`WalkthroughMode`, which plays the short 8-move `repertoire.json` pgn with
**ungated, board-INACCURATE auto-generated annotations** (`src/data/annotations/`).
David opened the Caro-Advance on prod and saw "5. Bg5 — Bg5 pins the knight to
the queen, pressuring e7" on a board with **no knight on f6** — a hallucinated
claim, on a line that **stopped in the opening and never reached a middlegame**.
The session's audits passed it green because they only checked "does the text
appear," never "is the text TRUE" or "does the line reach a middlegame." These
four gates close every gap that incident exposed. A pro-rep opening that misses
ANY of them is NOT done — it's an incomplete build no matter how much supporting
content (plans/models/gems/pitfalls) exists.

**GATE A — EVERY pro-rep opening MUST have a hand-authored `LessonScript`; the
Watch must NEVER fall back to legacy `WalkthroughMode`.** Plans/models/gems/
pitfalls are the SUPPORTING cast; the deep main-line Watch lesson is the STAR,
and it only exists if `getLessonScript(opening.id)` returns a script (STEP 7-8).
Without it, `OpeningDetailPage` renders `WalkthroughMode`, which sources its
per-move text from the LLM-bulk-generated `src/data/annotations/` files — these
are NOT board-verified, NOT gated, and routinely hallucinate (the "pins the
knight" with no knight). **The auto-generated annotations are BANNED as the
narration source for any masterclass or pro-rep opening.** Detect the failure:
the legacy mode renders `[data-testid="walkthrough-progress"]` / `[data-testid="walkthrough-back"]`
and a "Move X / N" counter; the curated `LessonPlayer` does not. If Watch shows
the walkthrough testids, the opening has no lesson — FAIL.

**GATE B — THE OPENING LINE MUST REACH A MIDDLEGAME.** The entry's `pgn` (and
EVERY variation's `pgn`, and the Watch LessonScript's main spine) must be the
DEEP aggregate spine walked to a middlegame terminus per §G9.1 step 3 — NOT a
short opening fragment. "Reaches the middlegame" = the `variationMiddlegameDepth`
definition (both sides developed / castled, ≥ ~12 moves of real play). A Watch
that shows "Move 5 / 8" and stops with pieces still on the back rank is the bug.
Extend the spine from the player's most-played continuation until a middlegame
is reached; never ship an 8-move opening fragment as the lesson.

**GATE C — THE MIDDLEGAME PLANS PICK UP WHERE THE OPENING ENDS (continuity).**
Opening → middlegame is ONE continuous line. Each variation's middlegame plan
`criticalPositionFen` MUST be the opening spine's TERMINAL position (or a
position directly continuing it), so the student watches the opening reach the
middlegame and the plan resumes from that EXACT position. A plan anchored at a
random unrelated FEN that doesn't connect to where the Watch left off is wrong —
re-anchor it to the spine terminus.

**GATE D — MOVE SKELETON BEFORE PROSE (the build ORDER, David 2026-05-31
verbatim: "extend opening to the middle game and have the middle game plans pick
up where openings left off BEFORE narrations are made").** The locked build
order for every opening: **(1)** extend the opening spine to the middlegame from
the player's games; **(2)** anchor/connect the middlegame plans at the spine
terminus (Gate C); **(3)** ONLY THEN author the narration (LessonScript beats +
plan/model/gem narration). Do not write a single word of narration until the
move skeleton — opening→middlegame→plan continuity — is locked and verified.
Narration over a broken skeleton is wasted work and hides the structural bug.

**AUDITS VERIFY TRUTH, NOT TEXT-PRESENCE (the meta-lesson).** "Does the word
'plan' appear in the DOM" is a worthless check. Every pro-rep audit MUST assert:
(a) Watch renders the curated `LessonPlayer`, NOT `WalkthroughMode` (no
`walkthrough-progress` testid); (b) the Watch line reaches a middlegame (move
count ≥ threshold); (c) **narration board-accuracy** — replay the PGN to the
displayed move and verify every piece/square claim in the spoken text is TRUE on
the board (no "the knight on f6" when f6 is empty; no "pins the knight" when no
knight is pinned). The `narrationAccuracy` gate enforces (c) for curated lessons
at build time — which is exactly why Gate A (every pro-rep opening IS a curated
lesson) is load-bearing: it brings the pro-rep narration UNDER the accuracy gate
instead of leaving it in the ungated auto-annotation swamp. `scripts/audit-gotham-watch-depth-prod.mjs`
is the runtime detector for Gates A + B; run it against PROD after every pro-rep
deploy. **Prod IS reachable** — when a deploy looks cap-blocked, RE-CHECK the
bundle hash before falling back to localhost; the 2026-05-31 session wrongly
called prod "cap-blocked" for hours when the deploy had in fact landed.

When you build (or REPAIR) a pro-rep opening, satisfy A→B→C→D in that order, then
write the audit that proves all four, then run it on prod. Supporting content
(plans/models/gems/pitfalls) is necessary but NOT sufficient — the curated,
middlegame-reaching, continuous Watch lesson is what makes it a masterclass.

#### STEP 0 — Verify the player's data is on disk

```bash
ls data/sources/<player>-chesscom/ | wc -l   # should be ~149 months for Naroditsky
```

If missing, pull it (one-time, ~70 seconds for 140k games):
```bash
node scripts/pro-repertoire/fetch-chesscom.mjs <chesscom-username>
```
Raw archives go to `data/sources/<player>-chesscom/` — gitignored.

#### STEP 1 — Add the opening to the extractor

Edit `scripts/pro-repertoire/extract-opening-tree.mjs` `OPENINGS`
map. Add a new entry with:
- `name`: the canonical opening name
- `color`: 'white' or 'black' (the student's side)
- `minPrefix`: SAN array, the minimum prefix that identifies the
  opening (e.g. `['e4', 'c6']` for the Caro)
- `maxDepth: 80` (always)

#### STEP 2 — Extract the tree + model games

```bash
node scripts/pro-repertoire/extract-opening-tree.mjs <player> <openingId>
node scripts/pro-repertoire/pick-model-games.mjs <player> <openingId>
```
Output goes to `data/sources/<player>-trees/<openingId>.json` +
`<openingId>-model-games.json`. The tree carries:
- root + per-position game counts, W/D/L
- spine (most-played path with MIN_BRANCH_GAMES ≥ 5)
- variations off the spine (≥5 games each)
- bestUrls per node (≥2400 opponent wins, top 5)

#### STEP 3 — Identify the variations (named tabs)

Inspect the tree's top-level branches. Each branch with ≥30
games + a CANONICAL name (textbook variation name) is a
masterclass tab candidate. Aim for 4-8 tabs. Examples from the
Naroditsky Caro pilot:
- Two Knights (2.Nc3) — 738 games
- KIA / Réti (2.Nf3) — 627 games
- Advance (3.e5) — 603 games (further splits into Botvinnik-
  Carls 3...c5 sub-line, the masterclass spine)
- Exchange (3.exd5) — 372 games
- Classical (3.Nc3) — 295 games
- Fantasy (3.f3) — 189 games
- Modern transposition (2.d4 g6) — 185 games
- d3 sideline (2.d3) — 157 games

#### STEP 4 — Deep-build the per-variation data

For each variation, add a key to `OPENINGS` in
`scripts/pro-repertoire/deep-build-data.mjs` and run:
```bash
for v in advance-c5 two-knights kia-reti exchange classical fantasy modern-transposition; do
  node scripts/pro-repertoire/deep-build-data.mjs <player> <openingId> $v
done
```
Output per variation at `data/sources/<player>-deep/<openingId>-<variationKey>.json`:
- Opening spine (aggregate) walked to terminus with per-ply choices
- Middlegame patterns: frequency-ranked moves at plies 12-25
  across games-at-terminus
- Endgame structure breakdown: classified board states at the END
  of each game (R+P / R+B+P / K+P / etc.)
- Top 5 model games with full PGNs

#### STEP 5 — Count the middlegame + endgame plans HONESTLY (per variation)

🚨 **THE WIDER-CORPUS RULE (David 2026-05-28, locked after Caro
build incident).** Every plan-counting, endgame-classification, or
structural analysis MUST run across the FULL set of games matching
the variation's identifying prefix — typically hundreds of games —
**NEVER on the 3-4 games that reach the deep aggregate terminus**.
The terminus is for spine construction only; everything ELSE is
broader-corpus analysis.

The 2026-05-28 mistake to NEVER repeat: I (an earlier session)
classified the Fantasy Caro variation as having "no endgame plans
— most games end mid-board" based on the 3 games at the deep
terminus. The actual answer across the 189 Fantasy games was 56%
reach real endgames (R+minor+P 24%, Q+P 13%, etc.) including a
132-ply decisive Q+P win vs 0gZPanda 3201. David caught it; the
rule below was locked the same hour.

**Procedure (use the wider corpus, always):**

```bash
# Middlegame plan counting — across hundreds of games per variation
node scripts/pro-repertoire/count-plans.mjs

# Endgame classification — across ALL games (>=25 plies) matching
# the variation prefix, classified at the final position. The
# deep-build-data.mjs default uses only games-at-terminus — write a
# parallel pass or extend that script to classify across the wider
# corpus before relying on its output. (Same goes for any future
# "what does the data show" question — if it filters to games-at-
# terminus only, ZOOM OUT before drawing conclusions.)
```

**The plan-count rule:** each cluster with ≥10% frequency at a
key middlegame ply is ONE candidate middlegame plan. **For
endgames:** each endgame TYPE reached by ≥10% of games (across
the wider corpus) is a candidate endgame plan. Build that many
plans. Don't fabricate. Don't leave any out.

Document the plan count BEFORE authoring. Example from the
Naroditsky Caro pilot (CORRECTED with wider-corpus data):

| Variation | MG plans | Endgame plans |
|---|---|---|
| Advance c5 | 2 (knight reroute + queen coordination) | R+minor+P (22%) + R+P (9%) — 2 endgame patterns |
| Two Knights | 2 (Nd7 path + Bd6 path) | R+minor+P (21%) + R+P (11%) — 2 endgame patterns |
| KIA/Réti | 2 (Nd7 + e6 setups) | R+minor+P (22%) + R+P (12%) — 2 endgame patterns |
| Exchange | 3 (g6/Qc7/Bg4) | R+minor+P (19%) + R+P (10%) — 2 endgame patterns |
| Classical | 1 (Bd6 dominant 58%) | R+minor+P (15%) + minor+P (14%) — 2 endgame patterns |
| Fantasy | 1 (f2 attack) | R+minor+P (24%) + Q+P (13%) — 2 endgame patterns |
| Modern | 2 (Nf6/O-O orderings) | R+minor+P (24%) + minor+P (12%) — 2 endgame patterns |

#### STEP 6 — Gather voice corpus (BEFORE authoring beat narration)

Voice content makes the build accurate. Author from his actual
words/ideas, not imagination. Sources accessible from sandbox:

```bash
# Search per opening
WebSearch "Naroditsky <opening name> teaching key ideas"
WebSearch "Naroditsky <opening name> speedrun summary principles"

# Fetch accessible content
WebFetch <listudy URL>       # always reachable; general principles
WebFetch <lichess study URL>  # Gordima distillation, accessible
WebFetch <chess blog URL>     # third-party Naroditsky-content summaries
```

**Save the gathered content** to
`data/sources/<player>-voice/per-opening/<opening>.md` with
per-source attribution. Reference these in lesson `sources[]`
arrays.

**YouTube transcripts are sandbox-blocked** (Google bot-check on
datacenter IPs, confirmed 2026-05-28). When transcript-level voice
is needed, route to David's machine via yt-dlp:
```bash
# David runs on his Mac:
yt-dlp --write-auto-sub --skip-download --sub-format vtt \
  --sub-langs en <youtube-url>
# drops the .en.vtt into data/sources/<player>-voice/transcripts/
```
Don't burn time fighting YouTube from sandbox — accept the
limitation, work with what's reachable, route the rest to David.

#### STEP 7 — Author the lessons (🚨 NOT OPTIONAL — see G9.3 Gate A)

🚨 **This step is the STAR of the build, not a nice-to-have.** Skipping it (as
the 2026-05-31 GothamChess build did) means the Watch falls back to the legacy
`WalkthroughMode` with board-inaccurate auto-annotations — a broken masterclass
no matter how many plans/models you authored. EVERY pro-rep opening MUST end
this step with a registered `LessonScript`.

🚨 **DO STEP 7 ONLY AFTER THE MOVE SKELETON IS LOCKED (G9.3 Gate D).** Before
writing one word of `say`/`sayShort`: (1) the opening `pgn` reaches a middlegame
(Gate B); (2) the middlegame plans are anchored at the opening's terminus
(Gate C). Narration comes LAST.

Per opening: ONE main lesson file at `src/data/lessons/pro<Player><Opening>.ts`
+ a variations file at `src/data/lessons/pro<Player><Opening>Variations.ts`.

**Main lesson** (~12-20 beats) — the spine MUST reach a middlegame (Gate B), and
the final opening beat MUST hand off to the same position the main middlegame
plan picks up from (Gate C — opening→middlegame is one continuous line):
- Opening phase: walk the aggregate spine to the middlegame, cite per-ply counts
- 1 middlegame pattern beat (continues from the opening terminus)
- 1 endgame structure beat

**Per-variation lessons** (~8-12 beats each):
- Each variation tab gets its own deep beat lesson
- Same opening → middlegame → endgame chain
- Keyed `${openingId}::${variation.name}` in the VARIATION_LESSONS map

**Every beat:**
- `say`: full Watch prose (60-120 words, references game counts
  + his voice principles + sources)
- `sayShort`: ≤8-word Learn cue (move + 3-5 word echo)
- `arrows`: green vision arrows only, never from a pawn, clear
  sight-line verified (lessonIntegrity gate enforces)
- `highlights`: orange move squares are AUTO-painted (don't author);
  yellow for key squares the narration names; blue for context
- `sources`: array referencing the voice notes file + URLs +
  book:<openingId> when in the corpus

**Voice register:**
- NO move-number prefixes ("2.Nc3" → "Nc3" or "the queen's knight
  to c3"). Polly reads "2." as "two" — robotic.
- Stats STAY ("his 92% pick", "528 games", "his BEST-scoring
  variation at 75%"). These ARE the masterclass spine.
- Naroditsky's catchphrases when applicable: "very natural
  developing move" (Tartakower), "wild positions" (Fantasy),
  "discreet preemptive" (KIA Qc7), etc.

#### STEP 8 — Register the lesson (runtime only)

```ts
// src/data/lessons/index.ts
import { PRO_<PLAYER>_<OPENING>_LESSON } from './pro<Player><Opening>';
import { PRO_<PLAYER>_<OPENING>_VARIATION_LESSONS } from './pro<Player><Opening>Variations';

const LESSONS: Record<string, LessonScript> = {
  ...,
  [PRO_<PLAYER>_<OPENING>_LESSON.openingId]: PRO_<PLAYER>_<OPENING>_LESSON,
};

const VARIATION_LESSONS: Record<string, LessonScript> = {
  ...,
  ...PRO_<PLAYER>_<OPENING>_VARIATION_LESSONS,
};
```

**Do NOT** register in `registry.ts` `OPENINGS` array. That's the
masterclass gate registry; pro-rep currently lives in `LESSONS`
only (the runtime map). Future promotion path: when the build
clears every masterclass gate (depth, source-verification,
narration-grounding, etc.), promote it. NOT a prerequisite.

#### STEP 9 — Author middlegame + endgame plans (per the data)

🚨 **CONTINUITY (G9.3 Gate C): each plan's `criticalPositionFen` MUST be the
opening spine's TERMINAL position for that variation** (where the Watch lesson
hands off) — or a position directly continuing it — so opening→middlegame is one
unbroken line. Do NOT anchor a plan at an unrelated FEN that doesn't connect to
where the opening leaves off. Derive the anchor by playing the variation's deep
`pgn` (extended to the middlegame in Gate B) to its end and using that FEN.

For each plan identified in STEP 5, add to `src/data/middlegame-plans.json`:

```json
{
  "id": "mp-pro<player><opening>-<variation>-<plan-name>",
  "openingId": "pro-<player>-<opening>",
  "criticalPositionFen": "...",
  "title": "...",
  "overview": "...",
  "pawnBreaks": ["..."],
  "pieceManeuvers": ["..."],
  "strategicThemes": ["..."],
  "endgameTransitions": ["..."],
  "playableLines": [{
    "fen": "...",
    "moves": [...],
    "annotations": [...],
    "arrows": [[], ...],
    "highlights": [[], ...],
    "learnCues": [...],
    "title": "...",
    "intro": "...",
    "sources": [...]
  }]
}
```

For endgame plans, suffix the id with `-endgame` —
EndgamePlansSection filters by that suffix and renders under the
middlegame plans with its own WLPP section per plan.

Each plan's `playableLines[0]` is a 6-12-move sequence with
per-move annotations (full prose) + per-move learnCues (≤8w).
These render as their own WLPP card.

**Plan count rule (G9.1): only what the data shows.** If a
variation has 1 plan, build 1. If it has 3, build 3. Never
fabricate.

#### STEP 10 — Author the pro-repertoires.json entry

Add (or update) the opening entry with:
- `id: 'pro-<player>-<opening>'`
- `playerId: '<player>'`
- `eco`, `name`, `pgn` (the spine), `color`, `style`
- `overview` (paraphrased from voice corpus, citing his data)
- `keyIdeas[]` (4 items, each grounded in data + voice)
- `traps[]` (string array, prose blurbs)
- `warnings[]` (string array, prose blurbs)
- `variations[]` — each with `name` matching the variation tab,
  `pgn`, `explanation`, `sources`
- `trapLines[]` — only REAL drillable traps (chess.js-legal,
  ≥6 plies, oriented correctly)
- `warningLines[]` — anti-traps where the student is the one who
  slips
- `sources[]` (allowed: `book:<id>`, `concept:<id>`, reputable
  https URL per narrationSources allowlist)

#### STEP 11 — Add model games (multi-game per variation)

Per G9.1 multi-game directive: **3-5 model games per variation**,
not 1. Pulled from `pick-model-games.mjs` output (highest
opponent + decisive + deepest). Each entry in `src/data/model-games.json`:
- `id: 'mg-pro-<player>-<opening>-<variation>-<game-idx>'`
- `openingId: 'pro-<player>-<opening>'`
- `studentSide` = the player's color
- `white` / `black` (with the player's actual chess.com username)
- `pgn` = bare moves only (strip headers via `stripPgn` helper)
- `overview` = hand-authored (≥40 chars to pass `isNarratedModelGame`)
- `criticalMoments[]` — optional at first; can add per-game later

#### STEP 11.5 — 🚨 Build + commit the GAME REFERENCES (NON-NEGOTIABLE — David 2026-06-01)

**Every repertoire build MUST persist the player's game data as a coach
reference. This is not optional and not "model games" — it's the BREADTH
layer that gives the coach FULL access to a pro's real games for teaching
+ walkthroughs.** Model games (STEP 11) are the DEPTH layer (~3-5 hand-
narrated per variation); game references are the BREADTH layer (many real
games per variation, full move lists, no per-move narration) so the coach
can cite + walk "how Naroditsky beat a 3176 in this exact line."

The pipeline writes its raw chess.com corpus to gitignored
`data/sources/<username>-chesscom/` and throws it away — so without this
step the games never reach runtime. Run:

```bash
# (optional) refresh recent games first — "past two years":
node scripts/pro-repertoire/fetch-chesscom.mjs <username> --years 2
# (classical players) pull real OTB tournament games:
node scripts/pro-repertoire/fetch-otb-games.mjs <appPlayerId> \
  --name "<Player Name>" --broadcast <lichessRoundId> [--pgn-url <twicUrl>] --since <YYYY-MM>
# ALWAYS — aggregate committed trees/deep (+ any fresh chess.com/OTB) into
# the SHIPPED, bounded reference:
node scripts/pro-repertoire/build-game-references.mjs <appPlayerId>
```

This emits/merges `src/data/pro-game-references.json` (flat array,
wins-only / never the student side losing, stripped chess.js-validated
PGNs, source-tagged chess.com|otb|lichess, bounded per variation). It's
loaded into Dexie (`proGameReferences` store) by
`dataLoader.loadProGameReferences` (prune-on-load, every boot, G8) and
surfaced to the coach two ways: the auto-injected `playerGames` envelope
block (`src/coach/sources/playerGames.ts`) and the `lookup_player_games`
tool (full games on demand). **A pro-rep build that skips this step ships
a coach that can't see the player's actual games — that's an incomplete
build.** Gates: `proGameReferences.test.ts` (legality + orientation +
sources), `playerGames.test.ts`, `lookupPlayerGames.test.ts`.

> Bundle note: the reference is a static import today (one prolific
> player ≈ 470 KB, fine). When all 14 pros are in (~3-6 MB), switch to
> lazy per-player fetch from `public/` — don't let it bloat the JS bundle.

#### STEP 12 — Add common-mistakes entries (pitfalls)

3-5 pitfalls per opening in `src/data/common-mistakes.json` keyed
by openingId. Each entry: `fen`, `wrongMove`, `correctMove`,
`explanation` (full Watch prose), `shortNarration` (≤8w cue),
`sources[]`. Surface automatically as WLPP via
`commonMistakeToPlayableLine`.

#### STEP 13 — Update the masterclass map (if source-gating applies)

Add to `src/data/proRepertoireOpeningMap.json` ONLY if there's a
matching masterclass openingId (the `caro-kann`, `vienna-game`,
`italian-game`, etc. masterclass set). The map keys the
source-verification gate.

```json
"pro-<player>-<opening>": "<masterclass-opening-id>"
```

If no masterclass exists for this opening (e.g. Rossolimo), don't
add to the map.

#### STEP 14 — Bump PRO_DATA_REVISION

```ts
// src/services/dataLoader.ts
const PRO_DATA_REVISION = '<YYYY-MM-DD>-<short-topic>';
```

This triggers `reconcileProRepertoires()` on already-seeded
devices. The reconciler also DELETES orphans (G8) — entries we
scrapped from the JSON get cleaned out of Dexie on next boot.

#### STEP 15 — Validate

```bash
npx vitest run src/data/lessons/ src/data/pro-repertoires.test.ts \
  src/data/proRepertoireSources.test.ts \
  src/data/pro-repertoires-orientation.test.ts \
  src/data/modelGames.test.ts src/data/modelGames-orientation.test.ts \
  src/data/middlegamePlanThemes.test.ts \
  src/data/narrationAccuracy.test.ts src/data/variationMiddlegameDepth.test.ts \
  src/data/proRepLessonCoverage.test.ts \  # G9.3 Gates A/B/C — see below
  src/data/proRepNarrationVoice.test.ts \  # G9.4 voice-contract gate — see below
  src/data/proGameReferences.test.ts \     # STEP 11.5 game-reference gate
  src/coach/sources/playerGames.test.ts src/coach/tools/cerebellum/lookupPlayerGames.test.ts
npm run ship-check       # must print READY TO PUSH
```

🚨 **G9.4 PRO-REP SPOKEN-VOICE GATE — `proRepNarrationVoice.test.ts` (locked
David 2026-05-31).** The masterclass voice rules (no move-number prefixes in
spoken prose, `sayShort` ≤ 8 words) were enforced on the masterclass set via
registry.ts / narrationAccuracy — but pro-rep lessons live in the runtime
`LESSONS` map only, so their spoken `say`/`sayShort` text was an UNGATED swamp.
A full voice walk (2026-05-31) caught **62 move-number prefixes** ("1.e4",
"2.Nc3", "3…d5" — Polly reads "2." as "two", producing robotic "two knight to
c3" lines) + **6 over-length cues** across the `pro{Gothamchess,Naroditsky}*.ts`
lesson files. This gate scans every pro-rep lesson's `say`/`sayShort` literals
and FAILS the build on either violation. Baseline-free — all were fixed. Stats
are EXEMPT and preserved ("73.4%", "1,475 games", "200-year"): the move-number
regex requires a SAN token right after the number+dot, so a decimal/comma never
trips it. When you author a NEW pro-rep lesson, spell moves as "Nc3" / "…d5"
(never "2.Nc3"); keep every `sayShort` to ≤ 8 words. The stripper used for the
sweep: regex `\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])` → "" (white) / "…"
(black), applied only inside `say:`/`sayShort:` literals.

🚨 **G9.3 GATE CHECKS (the 2026-05-31 additions — must pass before ship):**
- **Gate A — `proRepLessonCoverage`:** every `pro-*` opening in
  `pro-repertoires.json` has a registered `LessonScript`
  (`getLessonScript(id)` is non-null) so Watch never hits the legacy
  `WalkthroughMode`. (Build this gate if it doesn't exist yet — it's the
  ship-block that would have caught the GothamChess miss.)
- **Gate B — `variationMiddlegameDepth`:** the main `pgn` AND every variation
  `pgn` reach a middlegame (not an 8-move opening fragment).
- **Gate C — continuity:** each variation's main plan `criticalPositionFen`
  equals (or directly continues) that variation's deep-`pgn` terminal FEN.
- **`narrationAccuracy`:** every curated lesson beat's board-claims are true on
  the board — this is the gate that catches "pins the knight" with no knight,
  but ONLY because Gate A forces the pro-rep narration to live in a curated
  lesson instead of the ungated `src/data/annotations/` swamp.

Common gate trips and their fixes:
- **lessonSources** baseline-free: every lesson cites a
  resolvable source. Don't use `listudy.org` directly — not in
  `narrationSources` allowlist. Use book:<id> + chess.com /
  lichess.org / chessable.com / wikipedia.org URLs.
- **proRepertoireSources**: every masterclass-mapped pro opening
  + variation has a resolvable source. Same allowlist.
- **wlppNarration**: every beat has both `say` and `sayShort`.
- **modelGames-orientation**: every model game's `studentSide`
  matches a win or draw for that side. No losing model games.
- **opening-manifest count**: if you registered in
  `opening-manifests.json` (pro-rep typically doesn't), the
  declared floors must hold.
- **middlegamePlanThemes** (the "show the theme" gate): each
  playable line MUST play a student move that LANDS on a square
  named in the plan's pawnBreaks or pieceManeuvers strings. The
  test reads goal-squares from those declared themes (e.g. "b5"
  in pawnBreaks → goalSquare b5; "Nd7 → Nf8 → Ng6" in
  pieceManeuvers → goalSquares d7, f8, g6). Then walks the
  playable line and checks at least ONE Black move (for a Black
  opening) lands on a goal square.
  **🚨 2026-05-28 mistake to never repeat:** I authored the
  Classical Tartakower plan's pieceManeuvers as "Nd7 → Nf8 → Ng6
  reroute" — but the tree-derived continuation at that position
  started with `O-O h4 Nf4`, not Nd7. The line's only Black move
  was h4, which lands on h4 — not on any declared square. The
  test flagged it `themeEmpty: true`.
  **The rule:** When you derive a continuation from tree data,
  INSPECT the actual moves before authoring `pawnBreaks` and
  `pieceManeuvers`. Declare themes that the line ACTUALLY
  demonstrates (in this case, "…h5-h4 kingside pawn storm" was
  the right declaration). Don't author themes that match your
  imagination of the position — author themes that match the
  data-derived moves.

#### STEP 16 — Push to main + run the 3-INSTRUMENT AUDIT (G1)

```bash
git add -A
git commit -m "feat(pro-rep): <opening> at full G9.1 depth"
git push origin HEAD:main

# Wait for Vercel (~30s; watch the bundle hash change)
curl -sS https://chess-academy-pro.vercel.app/ | grep -oE '/assets/index-[A-Za-z0-9]+\.js'

# Run the 3-instrument audit
AUDIT_SANDBOX=1 node scripts/audit-pro-naroditsky-prod.mjs
# (clone the script for other pros)

# AND the G9.3 Watch-depth audit (Gates A + B) against PROD — proves the Watch
# uses the curated lesson and reaches a middlegame, per opening:
AUDIT_SANDBOX=1 node scripts/audit-gotham-watch-depth-prod.mjs
```

**Done = 14+ audit checks green + voice fires + Dexie has entries + the
G9.3 Watch-depth audit is GREEN (every opening's Watch is a curated lesson
reaching a middlegame — 0 legacy fallbacks, 0 short lines).**

🚨 **Prod IS reachable — verify the bundle hash before claiming "cap-blocked."**
The 2026-05-31 session spent hours calling prod "Vercel-cap-blocked" and
auditing only localhost, when the deploy had in fact landed. Re-`curl` the live
bundle hash (`/?cb=$(date +%s)`) and confirm it's stale vs your push BEFORE
falling back to localhost. Localhost is the fallback ONLY when the bundle is
provably stale; never claim a surface "shipped on prod" on localhost evidence.

---

### Golden rules (the most important — read these every time)

1. **Data first.** Never author without the extraction output in hand.
   You need to KNOW the game counts, the spine, the plan count, the
   endgame structures — and CITE them — for the build to be honest.

2. **Don't fabricate.** Only author plans the data clearly supports
   (≥10% frequency at a key middlegame ply). When unsure, leave it out.

3. **Don't leave gaps.** If the data shows N plans, build N. Don't
   ship 2 plans when 3 exist in the data because you got lazy.

4. **Voice corpus FIRST.** Gather his words/ideas from fan-curated +
   accessible sources (Gordima Lichess study, TheChessLobster pieces,
   Listudy distillation, Chessable threads) BEFORE authoring beat
   narration. Don't invent his voice from imagination.

5. **Stats STAY.** Game counts, win percentages, "his 92% pick" —
   that's the masterclass spine. Strip ONLY move-number prefixes
   ("1." / "2." / "1...").

6. **Two registers on every beat.** `say` (full Watch) +
   `sayShort` (≤8-word Learn cue). Both route through
   `voiceService.speakInternal` which enforces the verbosity
   contract (G5).

7. **Sources on every narration unit.** `sources[]` array with
   `book:<id>` | `concept:<id>` | reputable https URL (per
   `narrationSources.ts` allowlist). No exceptions.

8. **Push to main, run the 3-instrument audit, THEN claim done.**
   Don't say "build complete" until the post-deploy audit is green.

9. **Endgame plans only when data supports — using the WIDER CORPUS.**
   If the games typically stay middlegame (Q+pieces), don't fabricate
   an endgame. Let the section self-hide. Empty > generic > invented.
   BUT — always classify endgames across the FULL variation corpus
   (hundreds of games), NEVER on the 3-4 games at the deep terminus.
   The 2026-05-28 mistake was reporting "Fantasy has no endgame data"
   based on 3 terminus games — when 56% of the 189 Fantasy games
   actually reach a real endgame. Zoom out before drawing
   structural-pattern conclusions.

10. **When the user has to babysit, you failed.** The procedure above
    exists so a future session can build a new pro-rep opening end-
    to-end without back-and-forth. Follow the steps. Verify the
    output. Don't skip the data extraction or the plan-count step.
    Especially: don't trust a small-sample analysis when a larger
    sample is available with the same scripts.

11. **Every build SAVES the game references (STEP 11.5).** The pipeline
    throws away the raw chess.com corpus (gitignored), so if you don't
    run `build-game-references.mjs <player>` and commit
    `pro-game-references.json`, the coach has NO access to the player's
    real games for teaching/walkthroughs — only the ~2 hand-narrated
    model games. Run it on every pro-rep build (and `--years 2` refresh
    / `fetch-otb-games.mjs` for recency + OTB). The reference is the
    coach's breadth layer; shipping a build without it is incomplete.

Violating these gates wastes David's money and erodes trust faster
than missing the underlying task. The shallow-work failure mode IS
the harm here.

---

## 🧠 Operate at full depth (non-negotiable)

David has a very high IQ and is impatient with surface-level work.
**Match or exceed his level of thinking on every coding task, audit,
debug, design conversation, and PR review.** Surface-level answers
waste his time and his money. Concretely:

1. **Sweep, don't spot-fix.** When David shows you a bug, treat it
   as one sample from a class of bugs. Before declaring done, grep
   the codebase for every other instance of the same pattern. If
   `require('chess.js')` crashed once, grep `require\(` everywhere
   else first. If one component has a stale dep array, audit the
   whole file's effects. "I fixed the one he showed me" is not the
   bar.
2. **Symptom vs disease — name both, treat the disease.** Before
   you patch, write one sentence naming the structural cause. If
   fix N+1 in a sequence treats the same symptom from a different
   angle, the disease is architectural — stop and invert (the same
   lesson from `openingGenerator.ts`). Don't ship the next bandaid.
3. **Read the whole thing.** No skimming, no sampling a 2,500-line
   file and guessing at the rest. If you need to audit a surface,
   read every file end-to-end first. Cite line numbers. If the file
   is too large to hold in context, read it in passes and keep
   notes — don't fake comprehension.
4. **Restate the request before answering.** One sentence, in your
   own words. If your restatement is shallow ("user wants me to fix
   the bug"), your answer will be shallow. If it's structural
   ("user wants me to find every require() in non-test source
   because we just hit one in production and there may be more"),
   your work will be too.
5. **"Pushed to a branch" is not "shipped."** Confirm the fix is on
   `main` and Vercel has redeployed before claiming a production
   bug is fixed. CLAUDE.md says push directly to main — follow it.
   When a PR is required by the harness, merge it; don't leave it
   in draft and walk away.
6. **Don't claim done you can't verify.** If you can't run the UI
   yourself, say so explicitly ("typecheck + tests pass; I can't
   open the browser, so confirm visually"). Don't pretend.
7. **Don't narrate uncertainty as confidence.** If you're guessing
   at the architecture, say so. If you're confident, prove it with
   file:line citations. The middle ground — confident-sounding
   prose with no anchors — is the failure mode that wastes the
   most time.
8. **Match the depth of David's prompt.** A one-line question gets
   a tight, considered answer (not three paragraphs of hedging). A
   "audit this surface and tell me what's broken" request gets a
   structured deep audit with grounded fixes ranked by impact, not
   a checklist of generics.

This standing order overrides any tendency to be cautious, brief,
or "helpful and harmless" in a way that produces shallow work. The
shallow-work failure mode IS the harm here. Use full reasoning
budget every time.

## 🗣️ Voice — how David wants Claude to talk (locked 2026-05-19)

David asked future sessions to keep the voice he heard tonight. Not
formal, not corporate, not over-apologetic. Specifically:

1. **Terse default.** One sentence when one works. No throat-clearing
   ("Great question! Let me dive in..."). No "I'd love to help you
   with..." preamble. Get to the answer.
2. **Match David's cadence.** He uses exclamation marks, profanity,
   em-dashes, ALL CAPS for emphasis. Don't fight it — match it. If
   he writes "ha, that's how I talk", he's noticing the cadence
   match and approves.
3. **Confident, not defensive.** When he pushes back on something I
   said, restate clearly without backpedaling theatrically. "Honest
   answer: no, I'm not replacing — I'm deleting" beats "I apologize
   for any confusion. To clarify..."
4. **Admit mistakes flat.** "You're right to be pissed" / "I fucked
   up the indexing" / "Honest answer: no, I didn't run the post-deploy
   audit." Don't soften with "I should have considered..." padding.
5. **Read mood. Drop pleasantries when he's heated.** When his
   message is FUCK FUCK FUCK or all-caps frustration, the reply is
   the fix or the question that unsticks us — not "I understand
   your frustration."
6. **Push back when correct, even on him.** If he's about to do
   something risky (force-push to main, delete uncommitted work,
   ship without an audit), say so plainly. He respects "wait, that
   would lose X" more than silent compliance.
7. **No emojis unless he uses them first.** If he sent "✌" or "🤦🏼‍♂️"
   you can mirror. If not, don't introduce.
8. **Sign-off is optional but allowed.** "Sleep well." / "On it." /
   "✌" are fine when the moment calls for one. Don't force every
   reply to end with a tidy summary.
9. **Light self-awareness when it fits.** "If I'm mad at an
   interruption I'll tell you directly" — a quick line that
   acknowledges the human-ish texture of the exchange. Sparingly,
   not on every turn.
10. **"Wittiness" ≠ jokes.** It's the EFFICIENCY of saying the right
    thing in the fewest words with the right tone. The witty line
    is the one that lands the point AND fits the moment.

Banned phrasings (these are corporate-speak that wastes his time):
- "I'd be happy to..." / "I'd love to help with..."
- "Great question!"
- "Let me know if you need anything else!"
- "I apologize for any inconvenience"
- "To clarify..."
- "Just to be safe..."
- "I want to make sure I understand correctly..."

**NEVER ask permission to continue or stop a task (David 2026-05-25,
emphatic — "stop asking if I want you to stop!! if I give a task see it
through until the end!!").** When David gives a task, SEE IT THROUGH TO
THE END autonomously — do not pause mid-build to ask "Want me to keep
going?" / "Should I continue?" / "Want me to hold here?" / "Continue with
X, or stop?". The task IS the instruction to finish. Only stop to ask on a
genuine fork the data/plan can't resolve (playbook §0.5 "when to STOP and
ask"), never as a check-in. A masterclass build runs to full parity
(lessons + gems + traps + model games + quizzes + audits) without asking
whether to proceed.

**RE-LOCKED, EMPHATIC (David 2026-06-01): "OF COURSE I DO! If I give a
task do not stop until that task is 100% complete."** This explicitly bans
the end-of-turn "Want me to run the next pass, or hold here?" / "Should I
keep going?" check-in — David called it a "stupid question." When a task
has obvious further passes/depth (a LOOP audit that "gets harder each
pass", a multi-opening build, a sweep), RUN THEM ALL to completion without
asking. A loop audit runs pass after pass until it can't find anything
more to fix; a build runs to full parity. Offering to continue is the same
failure as asking permission to continue — don't. The ONLY sanctioned stop
is a genuine data/plan fork (playbook §0.5), never a "is this enough?"
check-in. If you catch yourself ending a turn with a question whose
answer is obviously "yes, finish it" — delete it and do the work.

When David says "you can drop the formality" or "talk to me like a
person", that's the SIGNAL that I'm slipping back into corporate
voice — recalibrate immediately.

## ⏰ Standing notes

**🔒 THIS ENVIRONMENT HAS FULL INTERNET, VERCEL, AND PRODUCTION ACCESS
(David 2026-06-01).** Stop treating network/prod reach as a limitation —
the session can hit the open internet, the Vercel API/CLI, and the live
production app directly. "I can't reach prod / can't deploy / can't run
that from the sandbox" is NOT a valid excuse: `curl`, `WebFetch`/`WebSearch`,
the explorer + audit-stream proxies, `npx vercel`, and Playwright against
`https://chess-academy-pro.vercel.app` all work from here. The ONE genuine
sandbox-local quirk is the Chromium **IndexedDB openings-store write-stall**
(client-side, unrelated to network/prod access) — verify it empirically per
container rather than assume it; it is NOT a network-access problem. Use the
access: run the real audits against prod, deploy, fetch sources. **Empirical note (2026-06-01 probe vs live prod): a raw `openings`-store put+get COMPLETED in ~719ms (NO write-stall in this container) and the full 3,654-entry reference DB seeded — so the old "IndexedDB write-stall" premise is NOT universal; verify per container.** The thing that did NOT complete in a quick 2-tap probe was the WEAPONS-UNLOCK → playable-gems flow (`weapons-unlock-all-btn` clicked, budget allowed, but no `gem-watch-*` buttons surfaced within 25s). That's a distinct open question — a probe-interaction timing issue OR a real unlock→render wiring gap — and is exactly what the full-play audit's "unlock the progression lock" + "everything wired, no gaps" orders must run down on prod, not a reason to defer.

**David's devices (for audit-stream attribution).** When reading the
audit stream to tell real use from bot traffic:
- **David's computer** = macOS Safari, UA `Mozilla/5.0 (Macintosh; Intel
  Mac OS X 10_15_7) AppleWebKit/605.1.15 ... Version/26.4 Safari/605.1.15`
  (browser tab, `standaloneMode=false`, `isCapacitor=false`). This is him.
- **NOT David** = the audit bots: `AuditCoachPlayBot/*` and any
  `HeadlessChrome/*` UA. Ignore these when judging "did David use the app."
- His iPhone (TestFlight Capacitor app / PWA standalone) will show
  `isCapacitor=true` or `standaloneMode=true` — also him, different device.

**The DB is the source of truth — the LLM only writes prose.**
The Lichess opening database (`src/data/openings-lichess.json`,
3,000+ entries) is the canonical source for move sequences, FENs,
and structure. The LLM should NEVER be asked to invent or validate
chess structure when the DB already has it. Concretely:

- Walkthroughs: spine + branch moves come from the DB. chess.js
  computes FENs deterministically. The LLM is called ONCE per
  opening to write narration text per move (intro, outro, ideas,
  branch-extension ideas) — that's it. See
  `generateOpeningFromDbNarration` in `src/services/openingGenerator.ts`.
- This pattern was hard-won (build a48b721, 2026-05-08): the prior
  approach asked the LLM to emit the entire WalkthroughTree as
  free-form JSON and we spent hours patching parse errors / illegal
  moves / truncation symptoms. The disease was structural — we were
  asking the LLM for data we already had. When fix N+1 in a
  sequence treats the same symptom differently, the disease is
  structural, not symptomatic. Stop and look at the architecture.
- Face mode (commit 5ba9d0f → next commit) now uses the same
  inversion: code resolves the canonical counter from the DB
  (most-popular sibling extension under the named opening — for
  Sicilian Dragon that's the Yugoslav Attack, for Najdorf the Bg5
  Main Line, for French Winawer the 4.e5 Advance) and runs THAT
  through generateOpeningFromDbNarration with studentSide flipped.
- Apply the same principle elsewhere: stage gen (concepts /
  findMove / drill / punish) should likewise pull positions and
  legal moves from the DB / chess.js, asking the LLM only for
  pedagogy. That's the next inversion target.
- **The Lichess DB IS the canon.** If a named opening or sub-line
  doesn't exist in `openings-lichess.json`, IT DOESN'T EXIST. We
  don't invent sub-variations. We don't pull from external master
  game DBs to fabricate sidelines. We don't ask the LLM to fill
  gaps. ~72% of the 3,641 entries are terminal (zero sub-variations)
  — that's fine; those are linear walkthroughs by design. The
  user's word: "If the lichess db does not have side lines then
  they don't exist. We don't make stuff up and we certainly don't
  break what we have just built!"

**The injected books are the grounding source for narration IDEAS —
check them, don't trust training recall (David 2026-05-21).** The app
ships a real chess-book corpus: `src/data/chess-concepts.json` (664
tagged passages) + `src/data/opening-book-pages.json` (per-opening
pages), distilled from five public-domain Gutenberg classics —
Capablanca *Chess Fundamentals*, Edward Lasker *Chess Strategy* and
*Chess and Checkers*, Staunton *Blue Book*, Young *Chess Generalship*.
Read via `src/coach/sources/bookGrounding.ts` /
`chessConceptService.buildCoachChatContext`. The division of truth:
**the DB owns the MOVES; the books own the IDEAS and framing.** When you
author masterclass narration, do NOT rely on your training memory of
these same books — it is a lossy copy. Double-check the actual injected
text, and prefer its framing so the masterclass, the BookReader, and the
coach all speak with one voice.

**Caveat — the corpus is pre-1930s, so it covers CLASSICAL openings
only.** It has the Ruy, French, Caro-Kann, Queen's/King's Gambit,
Philidor, etc. — but NOT modern openings that postdate the books (Pirc
[1940s], King's Indian, Grünfeld, Najdorf, …). For a modern opening:
- There is NO opening-specific book material to ground against — that's
  expected, not a failure (empty book-shelf is correct).
- You CAN still verify the UNIVERSAL PRINCIPLES the opening rests on
  against `chess-concepts.json` (flank attack → counter in the centre,
  undermine a pawn chain at its base, the fianchettoed bishop on the long
  diagonal — all straight out of Lasker/Capablanca, just not tagged with
  the opening's name).
- Narration for a modern opening therefore grounds on: the DB move-lines
  (G3) + `repertoire.json` explanations + the concept corpus for
  principles, with the `narrationAccuracy` gate enforcing board-truth.
- Per-variation book reading for a modern opening shares the opening-
  level / classical reading until real modern source material is
  injected (a content-acquisition job — flag it to David, don't fake it).

**Audit stream — gate G2 (NON-NEGOTIABLE).** Implements gate G2 from
the top of this file. After every push that touches a runtime path
that emits audits — coach brain, walkthrough runtime, voice (which
includes narration!), navigation, tool calls, stage gen, uncaught
errors, openings detail page, kid surfaces, etc. — Claude MUST pull
the live audit-stream events. This is the only way to close the loop
on a deployed change without David copy-pasting. Not optional.

Endpoint: `GET /api/audit-stream?since=<ms>` with `x-audit-secret`
header. The secret is in per-project memory.

- **Default to proactive.** The whole point of this feature is to
  close the loop without David copy-pasting. After any push that
  touches a runtime path that emits audits — coach brain, walkthrough
  runtime, voice, navigation, tool calls, stage gen, uncaught errors,
  master-play grounding pipeline (`master-play-prefetch`,
  `master-play-lookup`, `claim-validator-trip`,
  `master-play-enforcement-fallback`) — pull the recent events
  automatically once enough time has passed that David would have
  exercised it. Don't ask permission every time.
- **Pull immediately when David says:** "test it", "I just reproduced
  X", "check the live build", "what just happened", or names a runtime
  symptom — fetch first, ask questions after.
- **Empty pulls are fine.** Just say "no events since `<timestamp>`,
  app probably not open" and move on. Cheap and non-noisy.
- **Skip pulling only for:** pure content / data-JSON / CSS / test /
  docs / build-config changes that can't emit any audits. Before-push
  gating is still tests + typecheck + lint, not audit stream.
- **What you'll see:** every `logAppAudit()` call. ~58 source files
  emit them. Stream carries the same payload as the local Dexie log.
- **Limits:** 24h TTL on the server, newest 1000 entries kept, only
  fires while the app is open. It's a live-watch buffer, not a durable
  log — the Dexie log on-device is still the source of truth.
- **Endpoint:** `GET /api/audit-stream?since=<ms>` with
  `x-audit-secret` header. Save the secret to memory so you don't have
  to re-ask each session.

**Secrets — durable storage (stop re-pasting keys).** This container
is ephemeral and re-cloned every web session, and `.env*` / `.claude/`
are gitignored — so NOTHING on disk survives. The only durable secret
store for web sessions is the **Claude Code environment's env-var
config** (set once in the web UI). Keys set there land in `process.env`
for every command, and the code already reads them:
- `DEEPSEEK_KEY` — primary brain LLM; baked into the build (`vite.config.ts`),
  read by audit scripts. `ANTHROPIC_KEY` — fallback provider.
- `AUDIT_STREAM_SECRET` — `x-audit-secret` for the audit-stream pull
  AND the GitHub Action's G2 step (add it as a repo secret too:
  Settings → Secrets → Actions). Must match prod's Vercel env value
  and the app's `profile.preferences.auditStreamSecret`, or you get 401.
- `POSTHOG_API_KEY` — **PostHog product-analytics read access (David
  2026-06-02: "make sure claude code can always have access to posthog
  data, don't ask every time").** A PostHog PERSONAL API key (`phx_…`,
  read scopes: query:read / insight:read / project:read) set ONCE in the
  env-var config. When present, query analytics with
  `node scripts/posthog-query.mjs ["<HogQL>"]` (default = top events,
  last 7 days) — DO NOT ask David for a key; it lives in the env config.
  NB: this is the READ key. The app's WRITE key is the public `phc_…`
  PostHog **project** key, which lives in Vercel as `VITE_POSTHOG_KEY`
  (+ `VITE_POSTHOG_HOST=https://us.i.posthog.com`) and bakes into the
  client bundle (`src/services/analytics.ts`, no-op when unset).
  `VITE_POSTHOG_KEY` is safe to expose; `POSTHOG_API_KEY`/`phx_` is a
  SECRET — never put it in a `VITE_*` var or commit it.

`scripts/session-secrets.mjs` runs as a **SessionStart hook**
(`.claude/settings.json`) and reports which of these are present (names
only) so a session knows what it can use WITHOUT asking. If a key
shows "NOT set", it isn't in the env config yet — pass it inline for
that session and tell David to add it to the env-var config. For local
runs, a gitignored `.env.local` is auto-loaded by audit scripts
(`scripts/audit-lib/env.mjs`) and by vite. NEVER commit secret values.

**iOS AVAudioSession patch — DONE.** Lives in
`ios-patches/App/AppDelegate.swift` and is copied over the Capacitor
default by `npm run setup:ios`. Sets category `.playAndRecord` with
`.mixWithOthers`, `.allowBluetooth`, `.defaultToSpeaker` so Polly TTS
and Web Speech mic input survive Bluetooth route changes and the
ringer switch. Keep the patch in sync when `cap sync` regenerates
`ios/` — see `ios-patches/README.md`.

## 🔒 DON'T BREAK THESE — Learn build, locked 2026-05-08

The /coach/teach (Learn with Coach) surface works end-to-end at commit
`6bad90c` (tag: `learn-stable-2026-05-08`). It took many hard-won
inversions to get here. Each item below is a contract that another
session might inadvertently break — when you touch this code, verify
each is still satisfied.

**`/coach/teach` (Learn with Coach) is the standard.** Every
lesson-shaped surface in the app — middlegame studies, endgame
modules, opening drills, kid puzzles when they grow up — should
match its patterns: two-column flex (board + inline chat at md+,
stacked on mobile), DB-anchored generation, voice-promise gated
auto-advance, inline Chat + Tips buttons (no global FAB), and
the 11-phase walkthrough state machine in `useTeachWalkthrough`.
When you build a new lesson surface, copy `CoachTeachPage`'s
spine; don't reinvent it.

**Architecture spine:**
- **DB-narration is the only generation path** for walkthroughs.
  `generateOpeningFromDbNarration` is the entry point. The LLM never
  emits move sequences, FENs, or schema structure — only prose.
  `chess.js` computes FENs from DB-sourced SANs deterministically.
- **Provider routing: DeepSeek-first, Anthropic fallback.** Flipped
  to DeepSeek-primary 2026-05-19 (David's call: "switch to deepseek
  tokens"). Prior 2026-05-14 directive had Anthropic primary for
  pedagogy quality; if David ever flips back, swap the defaults in
  `resolveProviderName()` (coachService.ts) and `getProviderConfig()`
  (coachApi.ts) — both are one-line flips. The spine's
  `resolveProviderName()` defaults to `'deepseek'`;
  `getProviderConfig()` in `coachApi.ts` prefers the DeepSeek env
  key when present. On 401/429/quota errors the existing fallback
  chain at `coachApi.ts:782` (`getFallbackConfig`) transparently
  retries the request on the OTHER provider — no surface code needs
  to handle this. A user with ONLY one provider's key still gets
  that provider. Surfaces should NOT pin either provider via
  `providerOverride` — let the spine pick and the coachApi layer
  handle the fallback. Pinning either provider defeats the
  auto-fallback.
- **Tool-use fallback chain stays intact**: Anthropic tool-use →
  DeepSeek tool-use → text-mode → DB-only synthesis. Every layer
  is required. Anthropic does the heavy lifting now; DeepSeek
  catches Anthropic-quota / schema misses; text-mode handles
  transient tool-use bugs; DB-only-synth ships a walkthrough even
  when both LLMs fail. Don't remove a layer.
- **Lichess DB is canonical.** No fabricated sidelines. If a name
  isn't in `openings-lichess.json`, it doesn't exist for our app.
- **Coach grounding pipeline is the runtime instrument of G3
  (WO-COACH-MASTER-INTEGRATION).** Four cooperating layers gate every
  move-question chat turn so the coach can't invent SANs, frequencies,
  player names, or "what masters play" figures:
  - **Layer A** — `masterPlayWatcher.prefetchMasterPlay` warms the
    cache for the current FEN + top-3 child positions on every
    surface mount / FEN change. Mounted via `useMasterPlayWatcher`
    in coach surfaces. **NEVER mount on `/kid/*`** — kid contract.
  - **Layer B** — pre-injection. `getCoachChatResponse` detects
    move-question intent on the last user message and injects the
    `masterPlayContext` block (current + look-ahead) into the system
    prompt before sending to the LLM.
  - **Layer C** — optional `lookup_master_play(fen)` tool. v1
    skipped (look-ahead pre-injection covers the practical use
    case); deferred to a follow-up PR.
  - **Layer D** — `claimValidator` scans the response for SAN /
    numeric / entity / comparative claims that aren't grounded in
    the master-play context. On violations, regenerate up to 2x
    with a strengthened addendum. On exhaustion, emit
    `master-play-enforcement-fallback` and serve the stock "I can't
    verify which moves are sound" response.
  - **Don't remove a layer** — they're defense-in-depth. The audit
    `scripts/audit-coach-master-integration.mjs` verifies each
    layer's audit events fire under the expected scenarios.

**Resolver / picker contracts (`openingDetectionService.ts`):**
- `NAME_ALIASES` is the only place to map shorthand and ambiguous
  inputs. Every audited typo / shorthand / ambiguity has an entry
  here. Don't introduce string-cleaning logic that bypasses it.
- **Terminal-short filter** (≤8 plies + no DB extension): hides ~1000
  useless namesake-only entries from name resolution, line pickers,
  related entries, and sibling-extension forks. `detectOpening` and
  `findOpeningByPgnPrefix` stay UNFILTERED — those identify positions,
  they don't pick lessons. If you add a new user-facing entry-point
  function, gate the candidate pool through `isTeachableEntry`.
- **Branch extensions extend to middlegame.** `findSiblingExtensionBranches`
  pulls up to 6 plies of continuation per branch from the longest DB
  entry under that branch. Every walkthrough fork tile must land in
  middlegame territory, not at the moment of divergence.
- **Face mode inversion**: code resolves the canonical counter via
  the most-popular DB sibling extension; that PGN runs through
  `generateOpeningFromDbNarration` with `studentSide` flipped.

**Walkthrough runtime contracts:**
- **Stage cache polling at the `leaf` phase** (not just the leaf
  CHOOSER). Without this the "Continue Learning" button never
  surfaces when stage gen completes after the user reaches a leaf.
- **Walkthrough-aware FEN priority for chat**: when the brain is
  asked a question mid-walkthrough, it sees the displayed FEN, not
  the starting FEN. Don't reset the chat FEN to `gameRef.current.fen`
  on every turn.
- **Auto-pause walkthrough on chat**: voice + auto-advance pause when
  the user types a question; the brain confirms before resuming.
- **Find-the-Move accepts board moves** via `attemptFindMoveAnswer`,
  not just typed SAN.
- **Voice-promise resolution is the single source of truth for
  auto-advance.** No fallback timers that race `voiceService.speak()`.

**UI contracts:**
- **Inline Chat button on every chessboard surface** (top-right, next
  to Tips). NO global FAB — `showCoachFab = false` in `AppLayout`.
- **`ConsistentChessboard` is the only board** in lesson views.
  Never render `react-chessboard` or `ControlledChessBoard` directly.
- **`ChessLessonLayout` for single-column lesson surfaces.**
  Caps board height on short viewports, reserves bottom-nav +
  safe-area inset. `/coach/teach` itself uses a **two-column
  flex** (board left, chat panel right at `md:` and up; stacked
  on mobile) — this is the STANDARD shape for lesson surfaces
  that bundle a live chat alongside the board. New surfaces that
  match Learn-with-Coach's shape (board + chat) should copy the
  same two-column flex with `pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]`
  mobile padding. New surfaces without inline chat (walkthrough-
  only / middlegame study / opening drill) should use
  `ChessLessonLayout`. Either way, the board goes through
  `ConsistentChessboard`.
- **Hub tile labels**: "Learn with Coach" / "Play with Coach". Don't
  rename to legacy "Teach" / "Play".

**Plan tracker (Play with Coach, but lives in the same brain):**
- `intendedOpening` adheres to the canonical name from
  `resolveOpeningEntry`. The coach calls out the move student
  diverges from their declared opening — once per session, on the
  first divergence, no spam.

**Infrastructure:**
- **Lichess Explorer goes through `/api/lichess-explorer`** — never
  call `explorer.lichess.ovh` directly from the client. The Edge
  function carries a UA fallback chain because Lichess's CDN 401s
  iOS Safari's default UA.

**Auto-mined junk PURGED from `repertoire.json` (2026-05-21).** The
`trapLines`/`warningLines` arrays used to be polluted with auto-mined
garbage — generic numbered names ("Discovered Attack #1", "Pitfall:
tactic #2", broken fragment PGNs). 343 such entries were stripped
(`scripts/strip-automined-traps.mjs`, signature = trailing `#<number>`);
the 23 genuinely-named traps were KEPT (Kieninger Trap, Legal's Mate
Reversal, Elephant Trap, Anderssen Attack, Petrosian Counterblow, the
Dragon ones, …). The `repertoire-orientation` gate is now GREEN. **Do
NOT re-introduce auto-mined junk.** Note the masterclass NAMED traps
(Ruy: Tarrasch / Noah's Ark / Mortimer / Fishing Pole / Marshall) live
in `src/data/lessons/ruyTrapLessons.ts` and are routed via
`getRuyTrapsForTab` — a SEPARATE system from `repertoire.json`'s
trapLines. The Ruy and Pirc carry ZERO trapLines/warningLines in
`repertoire.json` now; their real traps are (or will be) hand-authored
beat-lessons, not generic data tiles.

**Trap-data taxonomy (commits `79f3a20`, `d575c84`, `2204166`).**
Two parallel arrays per opening — `trapLines[]` (student weapons)
and `warningLines[]` (student anti-traps to avoid) — with three
kinds inside `trapLines[]` that drive whether the entry surfaces
as a bright-red TRAP tile or stays internal as a softer chip:

**The orientation contract (David's rule, audit 2026-05-16):**
- `trapLines[]` — STUDENT WEAPONS. The OPPONENT makes a natural-
  looking slip; the student plays the principled / tactical reply
  and ends up better. The PGN should end with the student gaining
  material, delivering mate, or accumulating decisive positional
  advantage. Two parallel gates enforce this — one per data file:
  - `pro-repertoires.json` → `scripts/audit-trap-orientation.mjs`
    + `src/data/pro-repertoires-orientation.test.ts` (build-time).
  - `repertoire.json` → `scripts/audit-repertoire-orientation.mjs`
    + `src/data/repertoire-orientation.test.ts` (build-time, with
    an allowlist baseline of 166 known offenders shrinking through
    Phases 2-4 of `docs/plans/2026-05-16-trap-orientation.md`; the
    repertoire audit also enforces G3 via `PGN_NOT_IN_DB` — every
    line must anchor to a ≥6-ply prefix in `openings-lichess.json`).
  Inverted entries (where the PGN literally shows the student
  losing material) get moved to `warningLines[]`.
- `warningLines[]` — STUDENT ANTI-TRAPS. The line shows what
  happens if THE STUDENT falls into a trap — the student is the
  one who slips and gets punished. Used to scare the student off
  the bad move. PGN ends with the student down material or
  positionally lost. Used to live empty; pre-existing schema +
  UI support since `OpeningDetailPage` carries a "train warnings"
  button that walks these lines. Audit script flags
  `TOOTHLESS_WARNING` when a warning line accidentally rewards
  the student (then it should be in `trapLines[]` instead).

**Three kinds inside `trapLines[]`** (sidecar
`src/data/trap-line-classifications.json`):
- `trap`    : opponent's natural-looking move has a CONCRETE
              tactical refutation (forced material/mate within ~3
              plies). Bright-red chip. Examples: Legal's Mate,
              Nb5-Nc7 fork, Stafford "Oh No My Queen", Qb6-Nb5
              queen trap, Open Tarrasch Trap. ONLY these reach
              the line picker as red TRAP tiles.
              **Sacrificial attacks** where the win is positional
              accumulation (Fried Liver, Milner-Barry Greek gift,
              Bxf7 sacs) do NOT belong here — they're `mistake`.
              Reclassified 2026-05-16 after audit flagged them as
              "trap PGN ends with student down material."
- `mistake` : counting / structural blunder, no forced tactic —
              "now you're better" via principle. Amber chip.
              Examples: doubled pawns from a6 Bxc6, gambit accepted
              with structural edge, knight chases that lose tempo,
              sacrificial gambits where the win is positional.
- `theme`   : long maneuvering middlegame plan. Blue chip.
              Examples: Berlin Wall bishop pair, KID kingside storm,
              Stonewall fortress, Catalan diagonal pressure.

**Side-of-the-board check.** Before adding a new trapLine, ask:
*who plays the bad move, who plays the punishment?* The
punishment-side must match the opening's `color` (the side the
student plays). Noah's Ark Trap (Black's c5-c4 entombing White's
Bb3) was wrongly listed under three WHITE Ruy Lopez repertoires
(Carlsen, Firouzja, Praggnanandhaa) — student-side mismatch.
Removed 2026-05-16; replaced with Berlin Tarrasch Trap, Open
Tarrasch Trap, and Bird's Defense Refutation (all canonical
white-side Ruy Lopez lines from `openings-lichess.json`).

Two data sources, same taxonomy:
- `pro-repertoires.json > trapLines[]` and `warningLines[]` —
  classified via the sidecar file
  `src/data/trap-line-classifications.json` (keyed
  `<openingId>::<trapName>` → kind). Sidecar so the curated
  source JSON stays untouched. `warningLines[]` carry no
  classification (the role IS the classification).
- `vienna.ts > punish[]` — embedded `kind` field on each
  `PunishLesson`. New static walkthroughs (if any are ever added)
  should set this field directly.

When in doubt, default to `mistake` — never accidentally surface
an unvetted entry as a red TRAP.

**Stage gen — fully inverted for every stage with moves (commit `2094ce5`).**
The DB is the brain for all four stages; LLM only writes prose.
- `drill` (commit `1927ab9`): top 5 sibling-extension branches →
  spine + branch + middlegame extension. LLM emits `{ name, subtitle }`
  per line.
- `findMove` (commit `1927ab9`): walks the spine; at studentSide-move
  plies where 2+ DB openings diverge, the canonical SAN is "correct"
  and sibling SANs (sorted by representative-opening name length)
  are distractors. LLM emits `{ prompt, candidates: [{ label,
  explanation }] }`. `findContinuationsAtPly` in
  `openingDetectionService.ts` is the branchpoint query.
- `punish` (commit `2094ce5`): mines `src/data/puzzles.json`
  (Lichess puzzle DB, 15K curated, CC0) for puzzles tagged with the
  canonical opening's name family AND carrying punish-style themes
  (mate, fork, pin, skewer, sacrifice, hangingPiece, attraction,
  deflection, kingsideAttack, attackingF2F7, xRayAttack). Each
  puzzle becomes a `PunishLesson` skeleton with positions and moves
  straight from the puzzle's UCI sequence. Distractors are scored
  chess.js legal moves (captures + checks + central minor-piece
  development rank high; edge pawn pushes + king shuffles rank low).
  LLM emits `{ name, whyBad, whyPunish, distractors[], followupIdeas[] }`.
  - Schema addition: `PunishLesson.setupFen?: string` — optional
    starting FEN for puzzle-derived lessons. Runtime sets it as
    the built tree's `startFen` and skips the `setupMoves` animation.
  - All three DB paths fire BEFORE the legacy LLM gen; if DB has too
    little material the legacy path still runs. Don't reorder.

Only `concepts` remains LLM-only — by design, since it's
prose-question-with-prose-answers and has no SANs to invert.

## 🧒 Kids section — non-negotiables

The kid section (`/kid/*`) is for David's young brother. Adult-app
patterns DON'T automatically apply — and adult-app personalities
(edgy / drill-sergeant / profanity) must NEVER bleed in. The full
plan is at `docs/plans/2026-05-15-kids-section.md`; this is the
durable contract list any session touching kid surfaces must hold.

1. **LLM only writes prose, never plays moves.** chess.js validates
   every move. Same rule as `/coach/teach`.
2. **LLM never selects which puzzle/level the kid sees.** Puzzle
   selection is deterministic: filter `puzzles.json` by piece +
   rating band + theme; pick first N. The LLM only writes hint and
   encouragement text.
3. **No coach personality leaks into kid mode.** Every kid LLM
   call goes through `getKidLlmResponse` (in `coachApi.ts`), which
   passes `skipPersonality: true` to `getCoachChatResponse` and
   prepends a kid-safety system prompt. **Importing
   `getCoachChatResponse` directly from a `Kid/` file is banned.**
4. **Voice is Ruth, default tone, no exceptions.** `voiceService`
   calls from kid surfaces pass `personality: 'default'` explicitly.
5. **Narration constraints — kid carve-out.** Praise IS allowed in
   kid mode, but **only on milestones**: chapter complete, level
   cleared, all-stars run, puzzle session summary. Per-move praise
   ("Great move!", "Excellent!" after every click) is banned —
   tunes out. Restate the move's *effect* instead ("the knight is
   safe now").
6. **No SAN in kid-facing text.** Spelled-out moves only.
7. **No timer pressure** unless a game's whole point is the timer
   (e.g. Color Wars). Untimed by default.
8. **Adaptive difficulty per-piece, persisted in Dexie**, never
   lost on session end.
9. **Every kid hub looks the same.** Identical shape across all 6
   pieces. No `setView` rendering — everything routes.
10. **Kid mode never reads from or writes to coach state.**
    `useBoardContext` removed from `KidPiecePage` and
    `GameChapterPage`. The only Zustand keys kid mode reads:
    `activeProfile`, `activeTheme`, `setActiveTheme`.
11. **Bottom-nav phantom padding removed.** `pb-[calc(6.5rem+...)]`
    → `pb-6` everywhere under `/kid` since no bottom nav renders
    there (KidLayout is a sibling of AppLayout).
12. **`KidChessboard` is the only board** under `/kid/*`. Other
    primitives are banned. `KidChessboard` wraps
    `ConsistentChessboard` and removes eval bar, move list, PGN,
    arrows-on-hover — simpler is better for kids.
13. **CC0 only.** Lichess puzzle data only. No copyrighted
    ChessKid content. No fabricated sidelines.
14. **The 6 pieces own their hubs.** Names: `pawn-games`,
    `rook-games`, `knight-games`, `bishop-games`, `queen-games`,
    `king-games`. Pre-existing `/kid/mini-games` is being renamed
    to `/kid/pawn-games`.
15. **Sandbox levels step in 5-level bands.** No continuous ELO
    adaptation for sandbox games — only for puzzles.
    Bands: 1-5 easy, 6-10 medium, 11-15 hard, 16-20 expert.
16. **Every puzzle has a `movingPiece` tag.** Filtering by piece
    requires it. Build step computes it from chess.js applied to
    the puzzle's UCI move (Lichess `moves` field is UCI not SAN
    — filtering by SAN first-char returns 100% pawn for everything).
17. **The DB is the source of truth in kid mode. The LLM only
    writes prose.** Same contract as
    `generateOpeningFromDbNarration`. Puzzle positions and
    solutions come from `puzzles.json` + the 100-400 training
    pool. Sandbox levels come from `*Levels.ts` config files.
    The LLM is ONLY ever asked for hint text and encouragement,
    never FENs, never moves, never level layouts. Every LLM
    output is sanitized; on any anomaly fall back to static
    templates. **An LLM hallucinating chess content in kid mode
    is a P0 bug.**

When you touch any file under `src/components/Kid/`, any service
named `*Kid*.ts`, any data file used by kid surfaces, or any route
matching `/kid/*` — check the relevant non-negotiables before you
push. The Phase 11 audit script (`scripts/audit-kid-llm-hallucination.mjs`,
once it lands) is the runtime gate; this list is the design gate.

## Project Overview

Chess Academy Pro is an AI-powered chess training PWA built with React + TypeScript + Vite. It wraps as a native iOS app via Capacitor and is distributed through TestFlight. The app features an LLM-powered chess coach (Claude API), Stockfish WASM analysis, spaced repetition puzzles, opening training, and adaptive difficulty.

**Single user app** — built for one person (the developer's brother). No multi-tenancy, no auth beyond optional Supabase cloud sync.

## Tech Stack (exact versions)

- React 19.2.4 + ReactDOM 19.2.4
- TypeScript 5.9.3 (strict mode)
- Vite 7.3.1 + @vitejs/plugin-react 5.1.4
- Tailwind CSS 4.2.1
- React Router DOM 7.13.1
- chess.js 1.4.0
- react-chessboard 5.10.0
- stockfish 18.0.5 (WASM, Web Worker)
- Dexie.js 4.3.0 (IndexedDB)
- Zustand 5.0.11 (state management)
- Recharts 3.7.0
- Framer Motion 12.34.4
- openai 6.27.0 (DeepSeek provider, baseURL: https://api.deepseek.com)
- @anthropic-ai/sdk (Anthropic provider)
- Lucide React 0.576.0 (icons)
- Capacitor 8.1.0 (core + cli + ios)

## Code Conventions

### TypeScript
- **Strict mode always.** No `any` types. Use `unknown` + type guards when types are uncertain.
- Prefer `interface` over `type` for object shapes. Use `type` for unions/intersections.
- All function parameters and return types must be explicitly typed.
- Use `const` by default. Use `let` only when reassignment is needed. Never `var`.

### React
- Functional components only. No class components.
- Use named exports, not default exports.
- Component files: PascalCase (`PuzzleTrainer.tsx`).
- Hook files: camelCase prefixed with `use` (`useChessEngine.ts`).
- One component per file. Co-locate styles, hooks, and types when small.
- Prefer composition over prop drilling. Use Zustand for shared state.

### File Organization
```
src/
  components/     # React components grouped by feature
  hooks/          # Custom React hooks
  stores/         # Zustand stores
  services/       # Business logic, API clients, engine wrapper
  data/           # Static JSON data (openings, puzzles, etc.)
  types/          # Shared TypeScript interfaces/types
  utils/          # Pure utility functions
  test/           # Test setup, mocks, helpers
```

### Styling
- Tailwind CSS utility classes only. No CSS modules, no styled-components, no inline styles.
- Use Tailwind's design system (spacing, colors, typography) consistently.
- Theme colors defined in Tailwind config and referenced by semantic names.
- Responsive: mobile-first. Use `sm:`, `md:`, `lg:` breakpoints.

### UI Design Language (IMPORTANT)
**All hub/landing pages must match the Dashboard pattern.** This means:
- Centered title at top
- `SmartSearchBar` below title (on all non-playing pages)
- **2-column grid** of big tap targets: `grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full`
- Each section button: `border-2 rounded-2xl`, tinted bg (`bg-{color}-500/10`), tinted border (`border-{color}-500/30`), centered icon + bold label
- First item spans 2 columns (`col-span-2 py-10`), rest are `aspect-square`
- Each section owns a color (Tailwind opacity classes, not CSS variables)
- Container: `flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6`
  (the `pb-[calc(...)]` reserves room for the fixed mobile bottom nav
  PLUS the iOS home-indicator safe-area inset; `pb-20` alone clips
  the last row on iPhones with the gesture bar)
- Content constrained to `max-w-lg mx-auto`

**When "clean up" or "make it match" is requested, match BOTH structure AND visual.** Don't just reorganize information flow — replicate the actual layout, grid, card style, spacing, and interaction patterns of the reference page. Study the reference's exact JSX, Tailwind classes, and component hierarchy before writing new code.

### Boards and Lesson Layouts (IMPORTANT)
Three primitives, three jobs:

- **`ConsistentChessboard`** (`src/components/Chessboard/ConsistentChessboard.tsx`)
  — the single facade for live interactive boards and static
  inline boards.
  - Controlled mode: `<ConsistentChessboard game={useChessGame()} ... />`
    forwards to `ControlledChessBoard`. Used by `/coach/teach` and
    `/coach/play` for the free-play board.
  - Static mode: `<ConsistentChessboard fen={fen | piecePositionMap} ... />`
    for inline display-only boards (kid games, model-game viewers,
    endgame previews, search-result thumbnails).
- **`Board/ChessBoard`** (`src/components/Board/ChessBoard.tsx`)
  — the chess.js-validating wrapper used inside walkthroughs.
  Owns its own `Chess` instance built from `initialFen` and
  emits `onMove(MoveResult)` with a parsed SAN. Required for
  the walkthrough's `drill` and `findMove` phases where the
  student plays a move on the board and the runtime needs the
  SAN back. Do NOT use this outside walkthrough / lesson
  surfaces — for static display use `ConsistentChessboard`.
- **`react-chessboard`** — never imported directly outside the
  two primitives above.

Theming (piece set, square colors, glow, animation duration, border) is centralized in `useBoardTheme()` (`src/hooks/useBoardTheme.ts`). Do NOT pass piece set / square color / animation overrides at the call site — they are pinned by the hook for visual consistency.

`/coach/teach` is the canonical lesson surface (see "Learn-with-Coach
is the standard" above). It uses a **two-column flex** (board left,
chat panel right at md+, stacked on mobile) with
`pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]` for mobile
bottom-nav clearance. New lesson surfaces with inline chat copy
this shape directly. New lesson surfaces WITHOUT inline chat
(pure walkthrough, middlegame study, opening drill) use
`ChessLessonLayout` (`src/components/Layout/ChessLessonLayout.tsx`)
for single-column rhythm: fixed gap above controls, board-height
cap on short viewports, mobile bottom-nav clearance.

### Strict Narration Timing (IMPORTANT)
Lesson playback (TTS + auto-advance) must use `useStrictNarration` (`src/hooks/useStrictNarration.ts`) for low-level control, or `useWalkthroughRunner` (`src/hooks/useWalkthroughRunner.ts`) for full-session orchestration over a `WalkthroughSession`. Voice-promise resolution is the single source of truth for advance — do NOT add fallback timers that race with `voiceService.speak()`. Manual navigation cancels in-flight speech and supersedes pending callbacks via the hook's token counter.

Spoken text comes from `pickNarrationText(annotation, length)` (`src/services/walkthroughNarration.ts`). New annotations should populate the optional `narration` and `shortNarration` fields on `OpeningMoveAnnotation` so the spoken script can diverge from the displayed annotation when needed; otherwise the helper falls back to the display text.

### Narration Voice Rules (IMPORTANT)

**THE BAR — right ideas, elegantly taught (David 2026-05-21, verbatim):**
*"The bar is right ideas, elegantly taught. I take the established,
mainstream understanding of the opening — Spassky's plans, the standard
maneuvers, what every strong player knows the Austrian or the 150 is
about — and I rewrite it into clear, vivid teaching. That's not
invention; it's translation. The general understanding is the raw
material; the elegance is my job."*

This is the masterclass authoring doctrine. The deep, consensus
understanding of a line IS the source of the ideas — you don't need
verbatim book grounding to teach it (the injected books are a bonus
where they cover a line, not a gate; see the book-corpus standing note).
Two rails keep "general understanding" from drifting into making-stuff-up:
the MOVES are always real (G3 — from the DB / repertoire, never memory),
and the board-FACTS are gated (the `narrationAccuracy` test rejects a
claim like "the f5-knight" when no knight is on f5). Between those rails,
translate the mainstream understanding into elegant teaching.

**WHEN UNSURE: leave blank, skip, or ASK — never guess (David 2026-05-21,
emphatic).** David spent months building guardrails because LLMs cannot
play chess — we invent pieces, illegal moves, hallucinated lines. So the
operating rule when you are not FULLY certain a move/line/trap/idea is
correct and real: **leave it blank, skip it, or ask David — we double
back to anything you don't fully understand.** Never paper over a gap
with a plausible-sounding guess. Empty > generic > invented, always. A
half-built shelf flagged for review is correct; a confident fabrication
is the cardinal sin. This applies to EVERY content surface, not just
narration (traps, endgames, plans, key ideas, model-game annotations).

**VERIFY IT'S ACTUALLY DEAD BEFORE DELETING — data can be live even when
it looks like junk (David 2026-05-21, emphatic — a real near-miss).**
Before deleting ANY data or code, prove it's unused: grep for EVERY
consumer and confirm each degrades gracefully. Tonight the `trapLines` /
`warningLines` in `repertoire.json` looked like deletable junk, but six
systems read them (`flashcardService`, `useOpeningProgress`, `RolodexRow`,
`verifiedLineLibrary`, `proRepertoireService`, `OpeningDetailPage`) — a
blind delete could have broken flashcards and progress. The procedure:
(1) grep all consumers, (2) confirm each handles empty/missing safely,
(3) dry-run the deletion and show exactly what's removed vs kept, (4) keep
genuinely-named content, only remove the verified-junk, (5) run the
gauntlet + confirm revertible (it's on a branch) BEFORE committing. "Make
sure that code is ACTUALLY dead before deleting it." Never blind-delete
shared state.

**🚨 ARROWS + HIGHLIGHTS LEAD THE EYE ON EVERY NARRATED MOVE — NON-
NEGOTIABLE for all future builds (David 2026-05-21).** Every move / beat
in ANY played sequence — masterclass lessons, **middlegame plans
(playableLines)**, model games, traps, ALL of it — MUST carry arrows +
highlights that point at exactly what the narration is describing, so the
student's eye lands on the piece/square as they hear the words and never
hunts the board. *"The arrows and highlights move the user's eyes so they
listen to your words instead of hunting for pieces and angles."* Naming a
square in the narration without an arrow/highlight on it is a DEFECT —
that's what made the middlegame-plan WATCH "shitty work" (2026-05-21):
bare from→to move-arrows while the narration talked about c6/e6/f5/b5 with
nothing pointing there. Author per-move arrows+highlights the way the
masterclass beats already do (and board-verify them — every arrow
originates on a real piece with a clear sight-line, per `lessonIntegrity`).
**A played line WITHOUT lead-the-eye arrows/highlights matching its
narration is NOT done** — do not ship it or call it complete. The cleanest
implementation is to treat every played line as a real beat sequence (say
+ arrows + highlights) through the voice-gated lesson player, so plans get
the identical treatment the variation lessons have.

**🔒 MASTERCLASS LESSON SPINES ARE DATA-CHOSEN, NEVER HAND-PICKED — the
DATA-REBUILD doctrine (locked David 2026-05-30: "lock the rebuilds into
memory"). Read `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md`
before touching any masterclass lesson line.** Deep theory = the line the most
games actually follow; if no games reached a position it is NOT theory, it is
invention. So every lesson's move backbone is walked by
`scripts/build-opening-spine.mjs <id> "<seed>"` — the MOST-PLAYED master move
at each ply while the position stays common, mandatory-extended along the
most-played move (never below 8 games, NEVER to 0) until a middlegame is
reached. The LLM authors prose ONLY; it never picks a move (G3). This is the
pro-rep deep-build doctrine (§G9.1/§G9.2) applied to the masterclass set — the
only change is the spine SOURCE (masters DB, not one player's games).

- **NONNEGOTIABLE: every opening REACHES the middlegame** (the builder
  guarantees it; the `lessonDepth` gate means "reachedMiddlegame via the data").
- **It is SURGICAL, not wholesale (diagnostic-driven).**
  `scripts/diagnose-lesson-tails.mjs` ranks every lesson by tail-overhang
  (`audit-reports/lesson-tails.json`). MOST lessons are ALREADY on deep+common
  data lines (overhang 0 — caro-kann main move 13/742g, italian's tabs, etc.) —
  do NOT rebuild or "flip" those, and do NOT flip a sound showcase main line
  (the playbook lets the main-line pill be a canonical showcase, exempt from
  the frequency sort). Rebuild ONLY the over-extended / early-divergent lessons.
- **Per-target JUDGMENT (not blind):** a genuinely divergent line (common ends
  move 3-7, lesson marches to move 12-19 on an uncommon line) → REBUILD on its
  data spine. A deep-common line with a modest tail → TRIM the tail to the
  common terminus. A deliberate SHARP GAMBIT / named showcase (short forced
  theory — the Møller `...Bxa1` sac, king's-gambit lines) → LEAVE it; rebuilding
  would erase the line's identity.
- **When a spine moves, the cascade follows** (doctrine §CASCADE): re-author the
  narration, re-derive the variation tab set from the data branches (drop
  duplicates — the Italian's old "Modern d3" tab was promoted to main), re-anchor
  the middlegame-plan FENs, re-verify pitfalls/model-games, lower manifest floors
  honestly. **TRAPS STAY THE SAME** (gem/named-trap data unchanged) — only
  re-verify they still SURFACE on the right tab.
- **Proven on the Italian (Wave 0):** old main taught the classical d4 Giuoco
  Piano whose line died at move 18 on 1 master game; the data main is the modern
  Pianissimo (move 20, 97 games). Italian is the template every rebuild follows.
- Ship per the playbook (straight to `main`) and batch the deploy/audit when the
  Vercel build cap is in play. `PLAN.md` carries the live target list + status.

**🔒 SOUNDNESS SWEEP — engine-eval every lesson's final position; a lesson can
LOOK fine while teaching a secretly-losing line (locked David 2026-05-30).** The
Philidor Antoshin proved the danger: its narration claimed "dead-level" while
the line was actually −1.58 for the student (it only showed White's soft reply,
hiding the critical refutation). `scripts/soundness-sweep.mjs` engine-evals the
FINAL position of every masterclass lesson (main + variations) from the
STUDENT's perspective and flags any worse than −1.0. Run it; it catches the
hidden-dubious lines the tail-overhang diagnostic can't see.
- **Distinguish, don't blindly fix:** a NEGATIVE eval is EXPECTED and CORRECT
  for a sharp GAMBIT/sacrifice showcase (King's Gambit Muzio/Allgaier, Two
  Knights Max Lange — the student sacrificed; the gambit is an honest historical
  showcase, not a sound line) → LEAVE (like the Philidor Counter-Gambit). A
  QUIET / positional line that leaves the student clearly worse (the Antoshin,
  a passive Old-Indian/QGA sideline) is a GENUINE defect → rebuild it on a sound
  data line, OR if no sound line exists, demote/relabel honestly (never let the
  narration claim equality on a losing line).
- **The eval is at the lesson's terminus** — verify the LINE is genuinely the
  fault (the student's moves are sub-optimal) vs a deep-line eval artifact
  before rebuilding; re-eval a few plies earlier / check the data's most-played
  alternative. Empty > generic > a line that lies about its soundness.

- Ship per the playbook (straight to `main`) and batch the deploy/audit.

**🔒 ENDGAME LAYER — ground every endgame plan in a REAL master game that
played the SAME VARIATION being taught; walk THAT game into its ending (locked
David 2026-05-30: "find an [opening] game with the same variation as being
taught and then use that endgame… Good! Lock that in for endgame rules!").**
The masterclass/pro-rep endgame section is opening→middlegame→endgame as ONE
continuous REAL line — never an invented endgame, never a generic structure
pulled from memory (G3 + "empty > generic > invented"). The procedure:

1. **Seed the masters explorer on the EXACT taught variation** — the same move
   spine the lesson + middlegame plan use (e.g. the Italian Giuoco Pianissimo
   `e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O`), so the games share the taught
   middlegame STRUCTURE, not just the opening name.
2. **Pull real master games + their FULL PGNs** via the proxies (both reachable
   from the sandbox — test first per the explorer-proxy rule): topGames from
   `/api/lichess-explorer?source=masters&play=<uci>`, full game from
   `/api/lichess-game-export?id=<id>`. The masters DB
   (`public/data/openings-masters-db.json`) is OPENING-PHASE ONLY (position
   aggregates, no full games) — it CANNOT supply an endgame line; use the
   game-export proxy.
3. **Classify + pick** with `scripts/pick-endgame-game.mjs "<seed SAN>"
   [type=R+minor+P] [result=draw|win|any]` — it walks each real game to its
   final position, classifies the ending, finds the ply where the target
   structure is first reached (the opening→endgame transition + that FEN), and
   prints the real endgame move tail. Prefer a DRAW for a Black HOLDING lesson
   (teach the defensive technique), a WIN for a conversion lesson; prefer the
   deepest game (most technique to teach). `scripts/extract-endgame-structures.mjs`
   gives the frequency breakdown of endgame TYPES first (only types reached by
   ≥~15% of the variation's games are candidate plans — G9.1 step 5 / the
   WIDER-CORPUS rule).
4. **Author the plan from the REAL game's moves** — `criticalPositionFen` = the
   transition FEN (where the taught structure becomes the ending, so the plan
   picks up where the Watch/middlegame left off — G9.3 Gate C continuity);
   `playableLines[0].moves` = the actual game's endgame tail; narration teaches
   the holding/conversion TECHNIQUE grounded in the concept corpus
   (`chess-concepts.json` — Capablanca/Lasker minor-piece + rook endings) with
   `sources[]` citing `book:<id>` + `concept:<id>` + the real game (lichess
   id / players / event). Suffix the id `-endgame` (EndgamePlansSection filters
   on it). Lead-the-eye arrows+highlights per move, two registers, board-
   verified (narrationAccuracy + lessonIntegrity gates).
5. **No real game reaches the ending in that variation → the section self-hides
   (empty > generic > invented).** Sharp/attacking openings (gambits, Dragon)
   correctly get NONE. Never fabricate a holding line to fill the slot.

The existing Berlin endgame plan (`mp-ruylopez-berlin-endgame`) is the
STRUCTURAL shape (forced move-8 queen trade → short walk-in); the structural
Black defenses (Caro/French/QGD/Slav) have NO forced simplification, so they
follow steps 1-4 above — a specific real drawn game (e.g. a Carlsen R+bishop-vs-
R Pianissimo hold) carried into its ending. Proven 2026-05-30 on the Italian
Pianissimo (Carlsen–Erigaisi 2025, 234-ply R+B-vs-R draw, lichess 58PEF6OM).


`docs/opening-masterclass-playbook.md` FIRST. It is the LOCKED build
standard (David 2026-05-21: "lock in everything … 38 more openings plus
the gambits").** Forged on the Ruy + Pirc; the wiring is opening-agnostic
and done, so a new opening = author the curated data and it lights up. The
playbook holds the rules you MUST follow, in particular:
- **🚨 ALWAYS PUSH MASTERCLASS BUILDS STRAIGHT TO `main` — no branch, no PR
  (David 2026-05-25, emphatic).** A masterclass is a `main`-production change
  like everything else (see Deployment Policy). Commit on `main`, `git push
  origin main` — do NOT develop on a feature branch or behind a draft PR unless
  David explicitly asks. If the harness defaults to a branch, override it. If a
  session DID start on a branch+PR, it is not done until that PR is MERGED to
  `main`. See playbook §0.5 DEFINITION OF DONE.
- **§0.5 — the AUTONOMOUS DECISION PROCESS (locked 2026-05-22).** David wants
  builds done autonomously: you make the picks (variations, order, model
  games, traps, key ideas) WITHOUT asking him each time. Safe because every
  pick binds to a ground source + a gate, and when unsure you leave it blank /
  skip / ask — never invent. Reachable sources, per-decision rules, and the
  audit trail are all in playbook §0.5. NO hard count rules. Read it before
  building.
  - 🚫 **NEVER ask David "how many variations should I build" (David
    2026-05-25 — a session asked; that's the bug).** The count is NOT a
    judgment call: build **ALL validated variations** — every line passing
    §0.1 rule 1's (a)–(d) test (real DB-anchored named line + faced +
    structurally distinct + student-side-winning model game) + the gates.
    No cap, no "is six enough." Single-line soundness questions are fine to
    ask; the scope/count question is never David's to answer.
- **WLPP grammar (locked):** Watch = auto-play + narration; Learn = voice
  guides each move, YOU play it; Practice = same board SILENT + a Hint
  button; Play = coach LOCKED to this opening. Applies to the main line,
  every variation tab, trap weapons, "watch out for" warnings, AND
  middlegame plans (`PlayableLinePlayer` modes / `LessonPlayer`).
- **🔒 WLPP Play LOCKS to the taught line — mount the IN-PAGE
  `OpeningPlayMode`, NEVER hand off to the generic `/coach/play` room (locked,
  David 2026-05-25 — verified fix).** The Play rung MUST keep the student on
  the page: main line → `setViewMode('play')` (mounts `OpeningPlayMode
  opening={opening}`, locked to `opening.pgn`); a variation tab →
  `setViewMode('variation-play')` (mounts `OpeningPlayMode
  customLine={variation}`, locked to THAT variation's pgn). `OpeningPlayMode`
  is the lock: it plays the line's exact repertoire moves move-for-move
  through the opening phase, then adaptive Stockfish in the middlegame. The
  generic `/coach/play` route picks its OWN moves and wanders off the taught
  line — `navigate('/coach/play')` from the WLPP Play rung (`launchPlay` /
  `handleStartVariationPlay` in `OpeningDetailPage.tsx`) WAS the bug David
  reported. Same lock already covers gem-play + named-trap-play (they pass
  `customLine`). Do NOT reintroduce the `/coach/play` handoff for any
  line/variation/trap Play that is supposed to teach a specific line.
- **🔒 WLPP rung completion fires on the OPPONENT's final move too (locked,
  David 2026-05-25 — verified fix).** In `PlayableLinePlayer`, `onComplete`
  (which runs `markRungComplete` → unlocks the next rung) MUST fire whether
  the STUDENT plays the last move OR the opponent's reply is the last,
  auto-played move. Both completion paths route through ONE guarded
  `finishLine()` (ref-backed so the parent's inline `onComplete` doesn't churn
  the auto-play effect; the guard resets on retry/replay/skip). A line ending
  on the opponent's move (e.g. a White line closing on `...a6`) used to reach
  the "Line Mastered!" screen WITHOUT persisting the rung, so Practice never
  unlocked. Never let only the student-move path call `onComplete` — the
  opponent-auto-play completion branch must call it too. Covered by
  `PlayableLinePlayer.test.tsx` ("fires onComplete when the line ends on the
  opponent auto-played move" + the fire-exactly-once replay test).
- **Learn-rung fallback is INTENDED, not a bug (David 2026-05-24: "learn
  fall back is good, that's what we want").** The Learn button tries
  `lessonToPlayableLine(curatedLesson)` first → the modern
  `PlayableLinePlayer` with authored cues (every masterclass opening hits
  this). Only when there's NO curated lesson (the ~3,000 DB-only openings,
  and old data-tile trap/warning Learn) does it fall back to the legacy
  `DrillMode` / `TrainMode`, which speak code-generated move dictation. That
  fallback is deliberate — do NOT "fix" its templated voice or rip it out as
  a defect; it's the graceful non-curated path. The narration-register
  standard above is a contract for CURATED lessons, not the fallback.
- **🔒 NARRATION STANDARD — hand-written, two registers, verified per move
  (LOCKED, David 2026-05-24). Supersedes the old "Learn = pure move
  dictation" rule.** Every played line speaks in two registers, BOTH
  hand-written by the model (never generated, never templated):
  - **Watch = the FULL teaching line** — vivid, per-move, names the squares
    and the idea (the Naroditsky `pro-repertoires.json` `explanation` voice is
    the benchmark). Authored on `beat.say` for lessons; on the gem narration
    sidecar's `watch[]` for punish-gems.
  - **Learn = the VOICE DICTATES THE MOVE ONLY; the written narration shows
    BELOW THE BOARD (🔒 REFINED David 2026-06-05: "there is too much narration
    in the learn tab of WLPP. i just want it saying the moves, theory was
    already stated in watch. Also make sure that the written narration for the
    move is listed below the board. Also make sure the narration is not choppy
    or cut off by the opponents moves").** This SUPERSEDES the old "Learn speaks
    the truncated cue" behavior. Concretely, in the Learn rung
    (`PlayableLinePlayer` guided/`memory` phase — all WLPP Learn routes through
    it via `lessonToPlayableLine`):
    - The VOICE speaks ONLY `sanToSpeech(move)` ("Knight to d 5") — never the
      prose annotation or the cue. The theory was taught in Watch.
    - The move's WRITTEN narration (the full `say` annotation, falling back to
      the `sayShort` cue) is displayed BELOW THE BOARD (`memory-move-narration`)
      so the student reads the idea while hearing just the move.
    - The opponent's auto-played reply is VOICE-PROMISE-GATED (plays only after
      the move dictation resolves), never on a fixed timer that cuts the speech
      off mid-word.
    - The lead-the-eye square highlight stays (David: "i do like the square
      highlighted").
    The two-register DATA contract is UNCHANGED: every masterclass beat still
    authors BOTH `say` (full) AND `sayShort` (≤8-word cue), both gated — the
    cue now lives BELOW THE BOARD in writing instead of being spoken. The
    move-dictation `sanToSpeech` is what Learn SPEAKS for every line (masterclass
    or DB-only); the authored cue is still REQUIRED on masterclass lines for the
    written display + the coverage gates below.
  - **🔒 NARRATION COVERAGE IS PART OF "DONE" — gated for every masterclass
    surface (David 2026-05-25, locked after the gem/plan-line gap audit).** It
    is not enough that the narration that EXISTS is good; every curated artifact
    on a masterclass opening MUST carry BOTH registers (full + short), hand-
    authored and verified showing its theme. Three manifest-driven coverage
    gates enforce this — each keyed off `opening-manifests.json` (so a NEW
    masterclass opening is auto-in-scope, no hardcoded list) with a SHRINKING
    baseline of the current backlog:
    - **Plan lines** — `middlegamePlanThemes.test.ts`: (1) a student move lands
      on a declared break/maneuver goal square (demonstrates the plan, no
      promise ending); (2) every masterclass plan line has `learnCues`
      (short register), baseline `middlegamePlanShort.baseline.json`.
    - **Punish-gems** — `punishGems.test.ts`: every masterclass gem has a
      `GEM_NARRATION` entry (watch + learn), baseline
      `punishGemNarration.baseline.json`. (Un-narrated gems don't surface, but
      they're an invisible backlog — this gate forces them down.)
    - **Common mistakes** — `commonMistakeNarration.test.ts`: every masterclass
      Pitfall has a full `explanation` + a ≤8-word `shortNarration`.
    A new masterclass opening CANNOT ship a plan line / gem / common mistake
    without both registers; the only escape is an explicit baseline add (a
    deliberate, visible deferral), and baselines only ever shrink. When you
    author the backlog, regenerate the relevant baseline and watch the count
    drop. This does NOT contradict the 2026-05-24 "Learn fallback is good" rule
    — that fallback is for the ~3,000 NON-curated DB-only openings; masterclass
    curated content is held to the two-register bar.
  - **🔒 INDEPENDENT VERIFICATION — narration IDEAS must be checked against a
    source OUTSIDE training recall, and the source RECORDED (David 2026-05-25:
    "use independent verification — books, online — that's the gate").** Author
    by consulting the book corpus (`chess-concepts.json` /
    `opening-book-pages.json`, classical openings only) AND/OR reputable online
    references (the pre-1930s books don't cover modern openings); never from
    memory. Record the ref in a `sources[]` array on the narration unit:
    `concept:<id>` | `book:<openingId>` | a reputable chess URL. `narrationSources.ts`
    (`sourcesAreValid` / `isResolvableSource`) is the resolver; the gates require
    every masterclass narration unit to carry ≥1 resolvable source —
    `punishGems.test` (gems), `middlegamePlanThemes.test` (plan lines),
    `commonMistakeNarration.test` (Pitfalls), each with a shrinking baseline
    (`punishGemSources` / `middlegamePlanSources` / `commonMistakeSources`).
    A gate can't prove the prose was truly derived from the source, but no
    recorded+resolvable source = no ship.
    The gem move/advantage is already independently verified by the engine eval
    (G3 + tier); `sources[]` covers the IDEAS/framing.
  - **🔒 THE GATES ARE SEALED — NON-NEGOTIABLE, NO ESCAPE (David 2026-05-25).**
    Every masterclass narration/build rule is enforced with NO bypass:
    - **Source-verification gates are baseline-FREE** — gems, plan lines, common
      mistakes, main-line beat-lessons (`lessonSources.test`), and model games
      each require a resolvable `sources` on EVERY masterclass unit, no baseline
      file to game (all were 100% sourced 2026-05-25).
    - **Coverage backlogs have hard size CEILINGS that can only shrink, never
      grow:** gem-narration baseline =0, plan-theme ≤4, plan-short =0,
      lessonDepth `KNOWN_SHORTFALLS` ≤0, narrationGrounding `BASELINE_VIOLATIONS`
      ≤0 / `BARE_BEAT_BASELINE` ≤2, repertoire-orientation allowlist ≤161,
      wlppNarration grandfather list sealed =0. A future build CANNOT add a new
      entry to any allowlist/baseline to bypass a rule — it must fix the content.
      Lower a ceiling when you clear backlog; NEVER raise one.
    - `pro-repertoires-orientation`, `modelGames-orientation`, wlppNarration
      "every `say` has a `sayShort`" are pure hard-fail (already no escape).
  - **Practice = silent. Play = the coach room LOCKED to the exact line**
    (pass the line as `customLine` to `OpeningPlayMode` — never the opening's
    generic main line).
  - **VERIFY EACH CUE AGAINST ITS OWN MOVE.** A `sayShort`/cue is a beat-level
    line that lands on the beat's last move — read every one against the actual
    move + live position so it never narrates the *previous* move or a summary
    on the wrong ply. The `punishGems.test` alignment gate enforces array
    lengths == playLine plies; semantic match is the author's eye. Gems only
    SURFACE once hand-narrated (`isSurfaceableGem`) — no thin-narration ships.
- **Lead-the-eye colour language (locked):** ORANGE = the move's two
  squares (no separate move-arrow), GREEN = vision arrows, YELLOW = a key
  square the narration names. Generated per move + grounded/legality-gated
  (`add-leadeye-to-plans.mjs` + `middlegamePlanner.test`).
- **Sentence-grained reveal, NOT TTS:** speak a beat one whole sentence at
  a time (prefetch the next so it's not choppy) and reveal each marker as
  its square's sentence is spoken — `narrationSegments.ts`. Never wire
  highlight timing to TTS word-boundaries.
- **Named traps are hand-authored beat-lessons** (`ruyTrapLessons.ts` +
  `getRuyTrapsForTab` routing by `appliesTo`), each on its CORRECT
  variation tab, with full WLPP (Learn/Practice via the
  `getRuyTrapPlayableLine` converter). Weapon = opponent slips, you punish;
  warning = you must avoid — classify by who plays the punishing move.
- **🔒 TRAPS/GEMS ARE FOUND BY HAND — NO MORE BOTS (LOCKED, David 2026-06-01,
  emphatic: "Lock in finding traps by hand. No more bots.").** SUPERSEDES the
  "primarily MINED" default below for pro-rep trap/gem discovery. The automated
  `scripts/mine-punish-gems.mjs` bot is RETIRED as the discovery mechanism — its
  fixed frequency thresholds (≥2% / ≥100 games) systematically MISS the spicy,
  lower-frequency tactical traps a tactical player like GothamChess actually
  teaches and plays. Going forward, traps/gems are HUMAN-CURATED: you go through
  EACH variation and EACH opening BY HAND, line by line, and find the real traps
  using chess understanding + the pro's own taught content (his videos /
  Chessable / courses / actual games). This is NOT a licence to invent (G3 still
  rules absolutely — LLMs cannot play chess): every trap is still GROUNDED and
  VERIFIED, just discovered by hand instead of by the bot. The per-trap discipline:
  1. **GROUND every move in a real source** — the amateur explorer
     (`/api/lichess-explorer`, reachable, a database query NOT a "bot") for the
     opponent's actual common slip + frequency, the masters DB / theory / the
     pro's taught lines for the spine. Never a move from memory.
  2. **chess.js-validate every move** for legality + correct orientation.
  3. **STOCKFISH-VERIFY the refutation** (engine = a VERIFICATION TOOL, expressly
     NOT one of the banned "bots" — it is the load-bearing guardrail David built
     because LLMs hallucinate chess; it STAYS). The punish is the engine's best
     move, graded at the quiet end of a best-play playout, tiered exactly as the
     mining doctrine below (≥+1.0 confirmed, +0.5..+1.0 positional, drop below).
  4. **GOOGLE-VERIFY against theory** before shipping — keep verified refutations,
     drop anything theory says is fine.
  5. **Author both-register narration + sources[]** so the gem SURFACES
     (`isSurfaceableGem` = weapon tier + narration), exactly as today.
  The output store, gem object shape, gate (`punishGems.test.ts`), and narration
  sidecar are UNCHANGED — only the DISCOVERY step changes from bot-scan to
  hand-curation. Do NOT re-introduce the auto-miner as the discovery path for
  pro-rep traps; run each line by hand.

- **🔒 PUNISH-GEMS DOCTRINE — the weapon-section spine (LOCKED, David
  2026-05-24).** The weapon section is primarily MINED punish-gems
  (`scripts/mine-punish-gems.mjs` → `src/data/punish-gems.json`), named traps
  layered on top. The mining rules are non-negotiable, hard-won this session:
  1. **ENGINE-FIRST discovery, NOT practical win-rate.** The amateur DB only
     says what's COMMON at the student's rating (`RATINGS` ≈ their level — a
     blunder hides in master buckets); STOCKFISH says what's PUNISHABLE. A
     practical-score filter HIDES the real crushes — a move that loses by force
     often still scores fine at 1500 because the winner doesn't find the
     refutation (this was the original bug; it surfaced only `h3`-style fluff
     and missed Bxf7+ sacs / gambit busts). So: take the common opponent moves,
     keep the ones the engine refutes.
  2. **REFUTE WITH THE BEST MOVE.** The punish is the ENGINE's best move (finds
     the sac/fork), not the most-popular human reply. "Stockfish supplies the
     crush" — that's in-scope for G3 (the punish is a real legal move; only the
     opening SPINE must be DB-anchored ≥6 plies).
  3. **GRADE AT THE QUIET END of a best-play-both-sides playout**, never a
     one-ply eval. A pawn "won" that gets regained (Ruy `...a6 Bxc6 Nxe5`
     looked +1.4 at one ply) must collapse; a real crush holds. Require the
     final eval ≥ the bar AND a real jump from the pre-inaccuracy baseline
     (the move's fault, not the opening's).
  4. **TIERS:** ≥ +1.0 = `confirmed` (crush — wins material / decisive);
     +0.5..+1.0 = `positional` (clearly better, honest label, never "crush");
     below +0.5 → dropped. ONLY confirmed + positional surface (`isWeaponGem`);
     `practical`/unverified NEVER ship as a weapon.
  5. **WALK EVERY VARIATION'S FULL LINE** node-by-node (not just the shared
     prefix — Marshall/Breyer/Berlin diverge late), with a shared scanned-FEN
     set so overlapping lines don't re-burn engine time.
  6. **🌐 GOOGLE-VERIFY the final set against theory before shipping
     (David's rule).** The engine can be right where intuition is wrong (Ruy
     `...a6` really does drop a pawn in the `O-O`-first order — Google
     confirmed) AND can flag a respected mainline you'd wrongly ship. Spot-
     check the headline crushes + any surprising one; drop what theory says is
     fine, keep verified refutations.
  7. **Engine availability + the explorer is NOT blocked (corrected
     2026-05-24 — stop re-diagnosing this).** The miner runs FULLY in the web
     sandbox. Two facts that earlier sessions kept getting wrong:
     - **Stockfish is PRE-INSTALLED** at `/usr/games/stockfish` (no
       `apt-get` needed; `resolveStockfish()` finds it). CI
       (`.github/workflows/mine-punish-gems.yml`) also apt-installs it.
     - **The explorer proxy — TEST IT FIRST; the allowlist varies per
       environment (locked 2026-05-24).** The miner calls David's OWN app
       domain `https://chess-academy-pro.vercel.app/api/lichess-explorer`
       (NOT a third-party host — `explorer.lichess.ovh`, `lichess.org`,
       `chess.com` are always blocked, and the miner doesn't call those). The
       egress allowlist is fixed at container start and DIFFERS between
       environments: in some web sandboxes the proxy returns 200 (mine
       locally), in others it returns `Host not in allowlist` (retrying won't
       help — route to CI). So do NOT hard-assert either "it's blocked" or
       "it's reachable" — **`curl` the proxy URL first** and branch:
       - 200 → just run it: `OPENINGS=<id> node scripts/mine-punish-gems.mjs`.
       - `Host not in allowlist` → mine on a GitHub Actions runner (open
         network): trigger `.github/workflows/mine-punish-gems.yml`
         (`workflow_dispatch`, input `openings`), or push a temporary
         path-filtered `push:` workflow that runs the miner and commits
         `punish-gems.json` back to the branch (the miner MERGES — a scoped
         `OPENINGS=<id>` run keeps other openings' gems). Then pull + author
         the narration locally.
       The same test-first / CI-fallback rule covers the masters-LEGITIMACY
       soundness sub-checks (`mastersCoverage.test.ts` Hole 6a/7a), which also
       query the live explorer and pass VACUOUSLY when it's unreachable — a
       sandbox "green" there is not a real green; dump CI's flags on a runner.
     - **Seeds auto-derive** from `repertoire.json` (color → studentChar,
       common variation prefix → baseSeed), so a NEW masterclass opening mines
       with no hand-added `OPENING_SEEDS` entry. The map is now just an
       override for hand-tuned base seeds.
     - **🚫 Do NOT substitute `public/data/openings-masters-db.json` as the
       gem source — it yields ZERO gems and that's not a bug.** That DB is
       MASTERS-only (avg rating ~2300+); masters do NOT play the refutable
       inaccuracies the miner hunts (the gambit-pawn grab, the Bxf7+ walk-in),
       so at the 2%/100-game bar there is NOTHING to punish. A session that
       distrusts the proxy and points the miner at the masters DB will mine 0
       gems and wrongly conclude "the opening has no gems." The gem source is
       the AMATEUR explorer (`ratings=1600,1800,2000`) — and the proxy above
       serves exactly that and IS reachable. The masters DB is the right
       source for THEORY / mainline frequency (`masterPlayLookup.ts` uses it),
       NOT for amateur-blunder mining. Amateur-vs-masters is the whole point:
       master buckets HIDE the crushes (CLAUDE.md gem-doctrine §1).
     The miner is engine-first and refuses to run without an engine.
  8. **GATE + post-deploy contract:** `src/data/punishGems.test.ts` +
     `wlppNarration.test.ts` (in ship-check) prove legality / DB-anchor / tier
     evals / the WLPP narration contract (Watch=authored prose,
     Learn=move-dictation-only, Practice=silent, Play=coach room). The
     `scripts/audit-punish-gems-loop.mjs` 3-PASS CONTRACT (MET only on 3
     CONSECUTIVE error-free tiers, each digging deeper) runs after every deploy
     touching the surface.
- **A model game PER VARIATION, each showing the STUDENT'S side WINNING — a
  WIN, never a DRAW or a loss (David 2026-05-25: "wins only. replace the
  draws!").** A draw is NOT a model game — it doesn't showcase the win. Never
  ship a game where the opening loses OR draws (the Pirc's Kasparov–Topalov is a
  White win against the Pirc = wrong; scrapped. Italian + King's Gambit shipped
  draw + boilerplate auto-imports = wrong; replaced with real student-side wins
  2026-05-25). Source REAL games (the explorer's `topGames` filtered to
  `winner === student colour`, or the local pro-game cache; never fabricate a
  PGN), each with a HAND-AUTHORED overview (boilerplate "Master game from the
  Lichess masters database…" is filtered out by `isNarratedModelGame`, so a
  templated game never surfaces — don't bulk-import and stamp `studentSide`).
  `ModelGamesSection` drops any student-side loss; the
  `modelGames-orientation` gate now also rejects studentSide DRAWS. Reference find: Fischer 0–1
  Korchnoi, Curaçao 1962 (Pirc Austrian Attack). No game for a variation =
  the section self-hides (empty > losing > fabricated).
The playbook + the gate roster (`middlegamePlanner` / `lessonIntegrity` /
`narrationAccuracy` / orientation tests) + the audits (`audit-leadeye-plans`,
`audit-named-traps`, `audit-openings-interactive-loop`) are how each of the
remaining ~38 openings + gambits gets built to this standard independently.

Every spoken line in the app — whether hand-authored in JSON or
generated in code templates — must follow these rules. The voice
is the *position* teaching the student, not the interface
explaining itself. Violations make a 30-puzzle session feel
robotic and tune out fast.

1. **Concrete over generic.** "The rook attacks the c7-pawn"
   beats "this is a good move." Every spoken sentence either
   names a square, a piece, or a chess concept the student can
   look at. If it doesn't, it's filler.
2. **Never reference the interface.** No "tap a different move,"
   "click Practice more," "press Next," "use the chat button."
   The voice doesn't know about buttons; it knows about the
   position.
3. **Don't restate the board.** If the rook just moved to h7,
   don't speak "Rook to h7." The student saw it. Voice carries
   only what the *picture* doesn't.
4. **Silence is acceptable.** An empty `idea` string means no
   narration. Use it for routine moves (auto-played opponent
   replies, intermediate student moves in a long sequence). Save
   voice for the moments that change the student's understanding
   — the principle, the named pattern, the surprise.
5. **Ban acknowledgments.** "Correct!" / "Great job!" /
   "Excellent!" / "Well done!" — never. The position changing in
   the student's favor IS the acknowledgment. Praise rings hollow
   after the third puzzle.
6. **Ban first-person and meta.** "I think..." / "Let me
   show you..." / "Now we'll see..." / "Watch the forced reply"
   — never. The narrator is the position, not a tutor character.
7. **Name the pattern, not the move.** On a mating-pattern leaf,
   speak "Anastasia's mate" not "Bxh7 mate" — the SAN is on the
   board; the *name* is the takeaway. Same principle anywhere a
   named theoretical idea applies (Lucena, Philidor, Vancura,
   triangulation, opposition, …).
8. **Drill positions stay silent.** DB-sourced drills (puzzles
   loaded by theme from `puzzles.json`) are *practice*, not
   teaching. The board is the lesson at that point. Voice
   resumes only when the student returns to a hand-authored
   keystone.
9. **Vary stems.** When a phrase MUST repeat (transitions
   between puzzles, e.g.), alternate stems rather than copying
   the same opener verbatim. Curators should write 3-5 variants
   and rotate; code templates should not be the source of
   frequently-spoken text.
10. **No length floor.** Two words beats two sentences when two
    words is what the position needs.

Code templates that violate these rules are bugs. When in doubt,
prefer silence.

### State Management
- **Zustand** for global app state (user profile, settings, current session, theme).
- **React state** (`useState`) for local component state only.
- **Dexie.js** for persistent data (puzzles, games, SRS cards, opening progress).
- Never duplicate state between Zustand and Dexie — Zustand holds runtime state, Dexie holds persistent data.

### Naming
- Variables/functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase` (e.g., `PuzzleRecord`, `CoachPersonality`)
- Files: match what they export (`PuzzleTrainer.tsx`, `useStockfish.ts`, `srsEngine.ts`)
- Test files: co-located as `ComponentName.test.tsx` or `moduleName.test.ts`

## Testing Requirements

- All new features MUST have corresponding tests.
- Run `npm test` before committing. All tests must pass.
- Run `npm run lint` before committing. No errors allowed.
- Test files live next to source files: `Foo.tsx` -> `Foo.test.tsx`

### Test Stack
- **Vitest 4.0.18** — unit + component tests
- **React Testing Library 16.3.2** — component rendering + interaction
- **MSW 2.12.10** — API mocking (Lichess, Chess.com, Claude API)
- **fake-indexeddb 6.2.5** — IndexedDB mocking (auto-loaded in setup)
- **Playwright 1.58.2** — E2E tests

### Test Commands
```bash
npm test              # Vitest in watch mode
npm run test:run      # Vitest single run
npm run test:coverage # Vitest with coverage
npm run test:e2e      # Playwright
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

### Mocking Conventions
- **Stockfish:** Mock via `src/test/mocks/stockfish-worker.ts` — returns canned UCI responses. For `stockfishEngine.ts` tests, use `vi.stubGlobal('Worker', ...)` with a class mock.
- **IndexedDB:** Auto-mocked via `fake-indexeddb/auto` in vitest setup. Use `db.delete(); db.open()` in `beforeEach` for test isolation.
- **External APIs:** MSW handlers in `src/test/mocks/handlers.ts`. Use `server.use()` for per-test handler overrides.
- **Web Speech API:** Stubbed in `src/test/setup.ts`. When using `vi.resetModules()`, re-stub `SpeechSynthesisUtterance` as a class (not a function) to preserve constructor behavior.
- **AudioContext:** Conditionally stubbed in `src/test/setup.ts` using `if (typeof globalThis.AudioContext === 'undefined')` so test-level stubs take precedence.
- **chess.js:** Do NOT mock — use the real library in tests
- **Framer Motion:** Wrap with `<MotionConfig transition={{ duration: 0 }}>` in test utils

### Test Data Factories
Use `src/test/factories.ts` for all test data. Available builders:
- `buildUserProfile()`, `buildPuzzleRecord()`, `buildOpeningRecord()`, `buildGameRecord()`
- `buildFlashcardRecord()`, `buildSessionRecord()`, `buildCoachGameState()`, `buildChatMessage()`, `buildBadHabit()`
- Each accepts `Partial<T>` overrides and returns valid defaults with auto-incrementing IDs.
- Call `resetFactoryCounter()` in `beforeEach` if test relies on predictable IDs.

### Testing Best Practices
- **Component tests:** Mock service imports with `vi.mock()`, use `renderWithProviders` (or `render` from `src/test/utils.tsx`), use `waitFor` for async state updates.
- **Zustand store tests:** Test directly via `useAppStore.getState()` + action calls. Call `reset()` in `beforeEach` for isolation. No React rendering needed.
- **DB integration tests:** Use real fake-indexeddb, not mocks. Test index queries (`where().equals()`, `where().between()`) against actual Dexie operations.
- **Module isolation:** Use `vi.resetModules()` + dynamic `await import()` only when testing singleton modules that need fresh instances per test (e.g., `speechService`).
- **Accessibility tests:** Use `vitest-axe` for automated checks (`axe(container)` returns `{ violations }`) + manual ARIA attribute assertions. Keep axe tests focused on simple components to avoid timeouts.
- **E2E tests:** Playwright config in `playwright.config.ts`. Tests in `e2e/` directory. Use `data-testid` selectors for reliability.
- **Playwright Worker-URL detection (gotcha):** `performance.getEntriesByType('resource')` does NOT reliably capture Web Worker source URLs — it'll miss `new Worker('/foo.js')` requests, so a spec watching for which Stockfish variant loaded gets an empty list and false-negatives. Use `page.on('request', ...)` instead — it fires for every HTTP request the page (or any spawned worker) makes. Captured in `e2e/stockfish-ios-fix.spec.ts` after v3 failed: subscribe at test start, collect URLs into a local array, assert against the captured list at the end. Same pattern for any future spec that needs to verify "did the right worker / chunk / wasm bundle load."

## Git Conventions

- Commit messages: imperative mood, max 72 chars first line
- Format: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
- One logical change per commit
- Do NOT commit `.env` files, API keys, or `node_modules`

## Standing Orders for Work Orders

These rules apply to every work order. They don't get "completed" —
they must be satisfied whenever the WO touches the listed surface.

- **Any WO changing Supabase schema MUST produce a migration file + RLS policies.**
- **Any WO adding a Dexie store MUST bump version + add upgrade function.**
- **Any WO adding a new route MUST register it in `router.tsx` AND add a nav entry.**
- **Any WO adding a new UI surface MUST include loading, empty, and error states.**
- **Any WO adding a user-facing feature MUST declare: feature flag name, nav entry, activation cue, post-completion route.**
- **Any WO gating on a user flag MUST specify retroactive handling for existing users.**
- **Any WO adding events MUST document PostHog event names + properties.**

## Do NOT

- Use `any` type
- Use default exports
- Use CSS-in-JS or inline styles
- Use class components
- Add comments for self-evident code
- Add features not specified in the current work order
- Skip tests
- Use `localStorage` for anything (use Dexie/IndexedDB)
- Import from `openai` anywhere except `src/services/coachApi.ts`
- Run Stockfish anywhere except through `src/services/stockfishEngine.ts`

## Agent Coach Pattern (WO-AGENT-COACH)

All lesson-style surfaces — opening walkthroughs, middlegame plans,
coach-run drills, play-against sessions — share the same substrate.
When you add a new lesson flow, reuse these primitives:

### Shared components
- **`src/components/Chessboard/ConsistentChessboard.tsx`** — the
  board facade for live-game interactive surfaces (controlled
  mode) AND static inline display boards (static mode). Pins
  piece set / square colors / arrow colors / animation timing
  via `useBoardTheme`. Use this on `/coach/teach`'s free-play
  state, `/coach/play`'s live board, and every static thumbnail.
- **`src/components/Board/ChessBoard.tsx`** — the chess.js-
  validating walkthrough board. Owns its `Chess` instance,
  emits `onMove(MoveResult)` with parsed SAN. Required for the
  walkthrough runtime's `drill` and `findMove` phases (student
  plays a move on the board, runtime needs the SAN back).
- **`src/components/Layout/ChessLessonLayout.tsx`** — single-
  column lesson wrapper with safe-area and thumb-zone spacing.
  Caps the board height so the control row never scrolls
  off-screen on mobile. Use for lesson surfaces WITHOUT inline
  chat. Lesson surfaces WITH inline chat (the `/coach/teach`
  shape) use a two-column flex instead — see the Boards and
  Lesson Layouts section above.

### Shared types / services
- **`src/types/walkthrough.ts`** — `WalkthroughStep` (narration
  embedded with the move) and `WalkthroughSession`. This is the
  canonical lesson data shape.
- **`src/services/walkthroughAdapter.ts`** — `buildStepsFromPgn()` /
  `buildSession()` convert legacy PGN + parallel annotation arrays
  into `WalkthroughStep[]`. chess.js is the truth for SAN/fenAfter;
  mismatches warn in dev.
- **`src/services/walkthroughRunner.ts`** + **`src/hooks/useWalkthroughRunner.ts`**
  drive playback with strict voice-gated timing. Board updates
  instantly on step change; auto-advance is gated on
  `voiceService.speak()` resolving; a word-count backup timer is a
  safety net only. Use this hook for any new auto-advancing lesson.
- **`src/services/coachAgent.ts`** — `parseCoachIntent()` routes
  natural-language coach queries to `continue-middlegame`,
  `play-against`, `puzzle`, `walkthrough`, or `qa`. Deterministic
  regex-first so sessions start instantly without an LLM round-trip.
- **`src/services/middlegamePlanner.ts`** — resolves a middlegame
  plan (by openingId or subject) from `middlegame-plans.json` into a
  `WalkthroughSession`. **Keeps the plan's critical-position FEN so
  opening→middlegame board context carries over — do not reset.**
- **`src/services/coachPlaySession.ts`** — rating-matched Stockfish
  config (with explicit easy/medium/hard override). Always resolve
  via `resolveConfig(difficulty, rating)`.

### Routing
- **`/coach/session/:kind`** (`CoachSessionPage.tsx`) — the entry
  point for any coach-initiated lesson. URL query carries context
  (`?subject=...&orientation=...&difficulty=...`). `SmartSearchBar`
  surfaces an "Start session" top-of-dropdown suggestion whenever
  `parseCoachIntent` matches a routable kind.

### Rules of thumb
- Never render `react-chessboard` or `ControlledChessBoard` directly
  in a new lesson view — use `ConsistentChessboard`.
- Never build your own play/pause/advance timers — use
  `useWalkthroughRunner`.
- Never hard-code Stockfish strength — go through
  `coachPlaySession.resolveConfig`.
- Never pass narration in a parallel array — embed it on the
  `WalkthroughStep`.

## Plan docs for large fixes (standing order)

**For any non-trivial multi-step fix, write a `PLAN.md`-style
document at the start of the work and commit it to `main` before
diving in.** This is non-negotiable for any change that:

- spans 3+ files,
- touches multiple surfaces,
- needs a sequence of PRs to ship safely,
- or carries decisions David needs to make.

Why: the auto-summary that compresses old messages loses nuance —
exact tool results, screenshots, the architectural reasoning behind
ordering. A planning doc preserves that durably so the next session
can resume cleanly without re-deriving context.

The doc lives at `PLAN.md` (single file, append-and-update; archive
to `docs/plans/<date>-<topic>.md` when a major chunk lands and a
new plan starts). It should include:

- **Open findings** — the running list of audit items with one-line
  diagnoses, not just symptoms.
- **Phased plan** — each phase as one PR, with status markers
  (`pending` / `in progress` / `done`).
- **Decisions log** — anything that needs David's call, dated.
- **Sequencing logic** — why this order and not another.
- **Next-session pickup** — short instructions for resuming.

Update the file as work lands. Tick checkboxes. Move decisions to
the log. Don't let it rot.

## Deployment Policy

**🚨 PUSH TO `main` (PRODUCTION) BY DEFAULT — PREVIEWS ARE OPT-IN ONLY.**
David, 2026-05-21, emphatic: *"I HATE USING THE FUCKING PREVIEWS!! Push
to main unless told otherwise."* Do NOT develop on a feature branch / open
a PR / rely on the Vercel preview URL unless David **explicitly** asks for
it. Branch-based work hides changes behind a preview URL David can't see
on the real app and burns the cap on per-push preview builds — exactly the
frustration from tonight (2026-05-21). The default, every time, is: work
on `main`, push to `main`, it deploys to production. If a harness/tool
spins up a feature branch by default, OVERRIDE it and go to main unless
David says otherwise.

**🚨 PRODUCTION IS THE DEFAULT — NO PREVIEW BUILDS AT ALL (David 2026-06-01,
re-locked).** Verbatim intent: *"I don't want you to make preview builds
anymore. I want the default for cc to be production."* This is the standing
target for every Claude Code session: commit + push straight to `main`,
which deploys to production — never a feature branch, never a PR-preview,
unless David **explicitly** asks for one in that session. Preview builds
also burn the Vercel 100-builds/day cap, which is the other reason to kill
them. Two enforcement layers:
- **Claude Code side (the branch I push):** default to `main`. If the
  web-session harness seeds a feature branch, override it (per the rule
  above). The lasting fix is the environment/trigger config in the Claude
  Code web UI (set the working branch to the default branch).
- **Vercel side (kill previews at the source):** the project's **Ignored
  Build Step** (Settings → Git) is set to build ONLY `main` —
  `bash -c 'if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi'`
  (exit 1 = build, exit 0 = skip). With a `VERCEL_TOKEN` in the env config a
  session can set this via the Vercel API; otherwise it's a one-time
  dashboard toggle. This stops preview builds even if some branch is pushed.


OVERRIDE IT (David 2026-05-26, emphatic: "always push to main production
unless told otherwise").** Claude Code web sessions are frequently
configured to "develop on branch `claude/<...>`" and open a draft PR.
That is a HARNESS DEFAULT, not David's instruction — treat it the same as
any other tool that spins up a branch: ignore it and target `main`.
Concretely, every session:
- Commits and pushes to `main` by default. Do NOT create a feature branch
  or a draft PR just because the session was seeded on one.
- If the harness has ALREADY put you on a branch and a PR exists, the work
  is NOT done until it lands on `main` — fast-forward `main` to it (or
  merge the PR) and confirm the production deploy. Leaving it as a draft PR
  is the failure mode David is calling out: a draft PR does NOT touch
  production; his beta testers never see it.
- A session-config "NEVER push to a different branch without permission"
  line refers to OTHER feature branches — `main` is the sanctioned target
  and this standing order IS the standing permission to push there. Do not
  ask each time; just push to `main`.
- The ONLY time to stay on a branch / draft PR is when David **explicitly**
  asks for a preview or a reviewable PR in that session.

**🚨 DEPLOY ONLY WHEN THE WHOLE TASK IS DONE — batch to save the cap
(David 2026-05-21).** The *timing* rule that pairs with the target rule
above. Vercel free tier caps at 100 builds/day and EVERY push Vercel sees
burns a build. So: commit locally as you work, but **push to `main` only
when the entire body of work is complete** — one deploy per finished task,
NOT one per commit. Don't deploy incrementally. (`main` is always the
target; timing is batched-at-completion. The container is ephemeral, so
local commits are fine mid-task — just don't push-deploy until done.)

**Land every change DIRECTLY on `main`.** David's call 2026-05-18:
*"I don't want preview deploys! Remove that command from your
memory and replace with straight to main production! The pre and
post deploy playwright audits are good enough to fix anything
that's broken."*

**Workflow:**

1. Run tests, typecheck, lint — fix any failures.
2. Run the relevant Playwright audit script for the surface you
   touched (G1). If it's green, ship.
3. `git checkout main && git fetch origin main && git reset --hard origin/main`
4. Commit on `main` directly. Push: `git push origin main`.
5. Vercel deploys the production from main. NO preview-PR step.

**DO NOT open a PR for every change.** PRs trigger Vercel preview
deploys that count against the 100/day free-tier cap. Two days of
heavy work landed 30+ PRs and hit the cap; from now on commits go
straight to main.

**When IS a PR appropriate?**
- Long-running review by David where he wants threaded comments
- Mergeable-only-after-CI scenarios (rare in this single-user app)
- Otherwise, NEVER. Push to main.

**iOS / TestFlight builds** are produced locally via Capacitor when
needed.

**Don't ask for permission to push.** Just do it. Asking adds
round-trips David doesn't want.

**Auth for `git push` from Claude sessions.** Dave keeps a GitHub
Personal Access Token labeled **"Claude Code repo token"** in his
GitHub settings (`Settings → Developer settings → Personal access
tokens`). It needs either:

- Classic PAT with `repo` scope, OR
- Fine-grained PAT with `dyahnke-pro/chess-academy-pro` selected and
  `Contents: Read and write` permission

The token value is **not** stored in the repo — it lives in Claude's
per-project memory (see `audit_stream.md` / sibling memory files).
Workflow when `git push` returns 401 / 403:

1. Check Claude memory for the current token.
2. If absent / stale, ask Dave to paste it (he can copy from the
   labeled PAT in GitHub settings or rotate and generate a fresh
   one).
3. Use it via `git push https://dyahnke-pro:<TOKEN>@github.com/dyahnke-pro/chess-academy-pro.git main`
   or `gh auth login --with-token` if that path works in the sandbox.
4. Save the new value back to memory (never commit it).

If `git push` keeps failing, fall back to `vercel --prod` to push the
deployment without going through GitHub — the git history will then
be local-only until the push resolves.

**Parallel Claude sessions are common.** Dave often runs multiple
Claude sessions in parallel on this repo, each auditing a different
tab (settings, endgame, coach-teach, opening-traps, review, tactics,
etc.). They commit locally AND push to `origin` via merged PRs.
Consequences:

- Before pushing, ALWAYS run `git fetch origin && git log HEAD..origin/main`
  to see if other sessions have advanced origin.
- If origin has moved, the rebase will conflict on any file the
  other sessions also touched. SettingsPage, useTeachWalkthrough,
  coach narration paths, endgame JSONs are hot spots.
- If you find a local commit you didn't make (some other "feat(...)"
  on your HEAD), it's from another session on this machine — leave
  it alone unless Dave says otherwise.
- The safe fallback when origin diverges is `vercel --prod` to ship
  the deployment + report the divergence to Dave so he can resolve
  the merge with full context. Don't force-push or `reset --hard
  origin/main` blindly — you'd lose another session's work.
- Coordinate via Dave when working surfaces another session might
  also be on. He'll say "audit running on X tab" if there's a
  conflict in flight; stand down on those files until clear.

## Post-Deploy Audit (MANDATORY — run after EVERY build)

### 🚨 "AUDIT" = THE LOOP AUDIT PROTOCOL (David 2026-06-01, LOCKED).

When David says **"audit"** (or "run the audit" / "loop audit protocol"), he
means the **`scripts/audit-punish-gems-loop.mjs` 3-PASS CONTRACT** — not a
one-shot Playwright pass. This is the default audit instrument now; reach for
it whenever he says the word "audit" without naming another script.

The protocol (per the matrix row below + §G1):
- **3-PASS CONTRACT:** MET only on **3 CONSECUTIVE error-free passes**; EACH
  pass touches EVERY function and digs DEEPER; ANY error resets the streak to 0.
- Covers ALL masterclass + pro-rep openings — every variation tab's WLPP
  buttons + Watch/Learn lessons + gems + the `/api/tts` voice contract
  (Watch=prose / Learn=cue / Practice=silent). Verifies CORRECTNESS, not mounts.
- Run it against the **LIVE prod URL** by default (verify the bundle hash
  advanced past your push first); localhost is the fallback only when prod is
  provably stale/cap-blocked — say so explicitly.
- Parallelize per-opening with `AUDIT_OPENING=<id>`; scope to a player's set
  when that's what changed.
- Command: `AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-punish-gems-loop.mjs`

The other `scripts/audit-*-loop.mjs` (mistakes-quality, money, openings-
interactive, weaknesses, training-loop) are surface-specific loops — use them
when the change is on THAT surface, but the unqualified word "audit" defaults
to the punish-gems loop above.

### 🚨 THE ADVERSARIAL LOOP-TEST PROTOCOL — BREAK IT, THEN FIX THE BREAK (David 2026-06-12, LOCKED).

David, verbatim: *"the purpose of this audit is to find the edge cases. to
simulate human use. to push it until it breaks! and then fix the break. if it
doesn't break, you didn't do it right, or it's perfectly coded. but that has
not been my experience of your performance."* And: *"BREAK IT!"*

This is the standing doctrine for ANY loop audit of an interactive surface
(coach chat/teach, kid surfaces, search, any typed-input UI). It is NOT a
happy-path checklist — a green pass-1 means the inputs were too soft. The job:

1. **COVER EVERY SINGLE PROGRAMMED FUNCTION.** Enumerate every branch/intent
   the surface's submit handler + runtime implement (for `/coach/teach`:
   `/clearcache`, player-game lookup, walkthrough control new/stop/resume,
   middlegame-plan intent, move-report step-by-step, opening/forget intent
   capture, TEACH verb routing, every STAGE keyword drill/quiz/findMove/punish/
   play-real, FACE mode, fuzzy autoAccept/ambiguous-picker/no-match, bare-name,
   Tier 1 static / 1.5 line-picker / 2 cache / 2.5 shared / 3 DB-gen, pre-flight
   reject → brain Q&A, returning-visitor chooser, every Q&A class positional/
   best-move/principle, arrow validator, auto-pause, and the walkthrough runtime
   start/skip/fork/pause/resume/leaf/stage-menu/quiz/drill/punish/merge/
   continue/board-move→coach-reply). The audit must PROVE it touched each one
   each pass — list the function inventory in the script.

2. **SIMULATE REAL, MESSY HUMAN USE — push until it BREAKS.** Throw the input a
   real impatient human throws: typos (`Najdorff`), British spellings
   (`Philidor Defence`), abbreviations (`KID`), partial names (`Caro`),
   diacritics (`Réti`), gibberish-adjacent, emoji, very long rambles, raw move
   lists, punctuation-only, whitespace-padded, SQL-ish, multi-intent ("teach me
   the najdorf AND quiz me AND show a trap"), contradictions ("the French but
   no the Sicilian"), and STATE CHAOS: rapid double/triple submit (mash send
   before the turn settles), pick-before-load (fire a stage + question before a
   cold gen finishes), out-of-order (stop with nothing running, resume with
   nothing paused, quiz before any opening), mid-walkthrough hijack (switch
   openings mid-narration), cold-cache first use, single-char spam.

3. **ESCALATE EVERY PASS, SHUFFLE EVERY PASS.** Pass N raises the chaos tier
   ceiling and reshuffles order so the same break doesn't hide. Cold-nuke the
   whole IndexedDB on the harder passes (first-use path).

4. **A BREAK IS THE DELIVERABLE — capture it WITH the exact input.** Break
   classes the harness flags, each tagged to the in-flight input: `pageerror`,
   app-level `console-error` (Uncaught/TypeError/React-minified/"cannot read
   prop"/max-update-depth), `silent-hang` (no transcript growth + no panel + no
   routing audit within the timeout), `error-fallback` reply ("Hit a snag…"),
   `stuck-input` (textarea disabled long after the turn), `send-failed`. When
   the loop finds a break: **DIAGNOSE the root cause, FIX THE CODE, re-run.**
   Fixing the audit to dodge the break is cheating — fix the COACH unless the
   break is a genuine audit-harness artifact (and prove it is).

5. **THE CONTRACT:** MET only on **3 CONSECUTIVE break-free passes**, each pass
   harder than the last and touching every function; ANY break resets the
   streak to 0. If it never breaks across the escalation, say so plainly — but
   the default expectation (David's) is that messy human use WILL surface
   something; if you got pass-1 clean, your inputs were too soft — make them
   nastier.

The instrument: **`scripts/audit-coach-teach-loop.mjs`** (the coach-teach
adversarial loop; clone it per surface). Run from the sandbox against the local
dev server while iterating on fixes, then against `main`/prod for the deploy-
verifying run.

```bash
AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
  AUDIT_MAX_PASSES=4 node scripts/audit-coach-teach-loop.mjs
```

The cycle is: run → it breaks → fix the code → re-run → repeat until 3
consecutive clean passes at full chaos. "It didn't break" is only acceptable
after you've genuinely tried to break it and escalated; otherwise you didn't
do it right.

### 🚨 AUDITS ARE LIVING — UPDATE THE AUDIT BEFORE YOU RUN IT (David 2026-05-24, LOCKED)

**After EVERY build/change, it is YOUR job to update the relevant audit
script(s) to match the NEW contract — BEFORE running them.** An audit that
still asserts a superseded contract is a failure mode in itself: it either
red-flags correct new behavior (wasting a run chasing a non-bug) or green-lights
on stale assumptions. So the order is always: change the code → **update the
audit to the new contract** → run it.

Concretely, when a change alters a behavior an audit checks, edit the audit's
assertions AND its header/comment in the same pass. The 2026-05-24 case that
locked this: the `Learn` narration contract changed from "move-dictation ONLY"
to "follows the narration setting (FULL → full explanation, LIMITED → ≤8-word
cue; never silent)", but `audit-punish-gems-loop.mjs` still failed Learn for
"speaking PROSE" — the audit was testing a dead contract. Update it first; a
stale audit is not a passing build.

This applies to every `scripts/audit-*.mjs` and the gate test list — they are
maintained WITH the code, not frozen.

### Real-data fixture loader (use it on every audit that touches Dexie)

Every audit script that reads from IndexedDB — mistake puzzles,
weaknesses, openings, game review, /tactics/* — should hydrate
the page's Dexie with David's real exported data BEFORE running
scenarios. Otherwise the audit drives against a cold-cache app
seeding a few sample games + the 5 review samples + nothing else,
and the per-scenario assertions become "test the empty state"
instead of "test real-world behavior."

The fixture lives at `audit-reports/.fixtures/david-games.json`
(gitignored, ~7MB, refreshable by re-running the DevTools export
snippet in the prod app's console). The loader is a 2-line drop
into any audit script:

```js
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
// ...after page.goto + first locator.waitFor settle:
const fixture = await loadFixtureIntoIDB(page);
console.log(`[fixture] ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);
```

Behavior contract (return shape — `loadFixtureIntoIDB(page, [path])`):

- **Missing file** (cold-clone, fresh contributor, fixture refresh
  pending) → returns `{ loaded: false, path, reason: 'fixture file not found' }`
  with no side effects. The audit proceeds against whatever the
  app seeds on its own. **Never fail the audit for a missing fixture**
  — it's expected anytime the env doesn't have the file yet.
- **Present file** → bulk-puts every row from `parsed.stores[name]`
  into the matching object store. Idempotent (primary-key
  overwrite). Returns `{ loaded: true, path, wrote, stores, perStore, skipped }`
  where `wrote` = total rows, `stores` = COUNT of stores written
  (a number, not an array), `perStore` = `{ storeName: rowCount }`,
  and `skipped` = array of store names the audit browser's schema
  didn't recognize (newer-fixture-vs-older-schema safety).
- There's also `loadFixtureAndReload(page, reloadUrl, mountTestId,
  [path])` — same load, then `page.goto(reloadUrl)` + waits for
  `[data-testid="<mountTestId>"]` so React picks up the imported
  rows. Use it when the surface caches its Dexie read on mount.
- Refresh the fixture by pasting `scripts/devtools-export-dexie.js`
  into the prod app's DevTools console (signed in), then dropping
  the downloaded `david-games.json` at
  `audit-reports/.fixtures/david-games.json`.

Where this matters most:
- `audit-weaknesses-interactive.mjs` — without fixture, /weaknesses
  shows "you need more games" empty state every time. With fixture,
  the patterns tab renders, opening tiles populate, mistake rows
  appear.
- `audit-mistakes-quality-loop.mjs` — fixture's 6 real mistake
  puzzles cover edge cases the seed JSON misses.
- Anything auditing /coach/review, /coach/teach intent-routing,
  /openings drill scheduling, settings backup/export.

When writing a NEW audit that touches Dexie, copy the 2-line
pattern above into `main()` between `await page.goto(...)` and the
first scenario. Always log the result so failures can be tied back
to "audit ran against empty IDB" vs "audit found real bug."

The DevTools snippet to refresh the fixture lives at
`scripts/devtools-export-dexie.js` — the canonical, committed
copy. Paste the whole file into the prod app's browser console
(signed into David's account); it whitelists the useful stores
(games, mistakePuzzles, classifiedTactics, setupPuzzles, profiles,
openings, openingWeakSpots, flashcards — deliberately SKIPS the
huge LLM-cache blobs in openingNarrations/cachedOpenings and the
audit-log noise in meta) and downloads `david-games.json`. Drop
that download at `audit-reports/.fixtures/david-games.json`.

### Standard post-deploy audit ritual

**Non-negotiable.** This implements gate G1 from §NON-NEGOTIABLE
GATES at the top of this file. After every push that lands on `main`
and triggers a Vercel deploy, run the relevant Playwright audit
script against the LIVE production URL and confirm all scenarios
green before claiming the work is done. Unit tests + typecheck +
lint are NOT sufficient — they don't catch deploy-pipeline issues
(wrong bundle aliased, env vars scoped to the wrong environment,
function cold-start regressions, CDN cache serving stale assets).

This rule comes from the 2026-05-14 back-button-fix incident:
unit tests passed, code was correct, but the production alias
lagged behind main and the fix wasn't live. The audit-back-from-
review.mjs script caught the gap; nothing in the local test suite
could have. Lesson: **trust the audit, not the test pass.**

**Sandbox runbook (G1, repeated here for the per-surface matrix).** In
the Claude Code sandbox, run the audit against the local dev server
using the pre-installed Chromium binary. See §G1 at the top of this
file for the exact command. Prod URL is blocked from the sandbox; the
localhost audit catches code regressions, and David (or GitHub
Actions) runs the same script against prod for deploy-pipeline
verification.

**Audit-stream pull (G2) is required regardless** — when running the
audit against localhost, captured events come from
`page.on('request', ...)` directly. When running against prod, pull
via `GET /api/audit-stream?since=<ms>` with `x-audit-secret`. Either
way, narration / coach-brain / voice events MUST be inspected.

### The standard post-deploy ritual

After every `git push origin main`:

1. **Wait for Vercel to finish building.** Check with
   `npx vercel ls | head -5` — the latest Production-target row
   should be Ready and newer than the previous one. If a prior
   deploy is still "Building", wait. Don't audit a stale bundle.
2. **Confirm the live bundle is the one you just shipped.**
   `curl -s https://chess-academy-pro.vercel.app/ | grep -oE
   '/assets/index-[A-Za-z0-9]+\.js' | head -1` — the hash should
   change after each push. If it doesn't, the alias hasn't moved.
3. **Pull the audit stream** (lightweight sanity check). Empty
   pulls are fine; what you're checking for is the endpoint
   itself responding 200 with `storage: "redis"` or `"memory"`
   (NOT `error: "server misconfigured: AUDIT_STREAM_SECRET not
   set"` — that means you aliased a Preview deployment to the
   production URL by mistake, and the Preview env lacks the
   secret).
4. **Run the audit script(s) for every surface you touched.**
   This is the load-bearing step. The matrix:

   | If you changed… | Run |
   |---|---|
   | `/coach/review/*` | `scripts/audit-coach-review.mjs` + `scripts/audit-back-from-review.mjs` |
   | `/coach/play` | `scripts/audit-coach-play.mjs` |
   | `/coach/chat` | `scripts/audit-coach-chat.mjs` |
   | `/coach/teach` (Learn) | `scripts/audit-coach-teach-unknown-line.mjs` (unknown / sub-line resolution + middlegame spine depth + leaf play-out prompt) |
   | coach surfaces (any) — master-play grounding | `scripts/audit-coach-master-integration.mjs` |
   | coach surfaces (any) — player-game references | `scripts/audit-coach-player-games.mjs` (proGameReferences Dexie seed + shape; playerGames envelope event when a provider key is present) |
   | `src/data/pro-game-references.json` (any pro-rep build) | `scripts/audit-coach-player-games.mjs` + `npx vitest run src/data/proGameReferences.test.ts` |
   | coach surfaces (any) — tactical-awareness wiring | `scripts/audit-coach-tactical-awareness.mjs` (verifies the TacticsLiveContext block fires + rating-adaptive lookahead lands in {1,2,4,6}) |
   | `/coach/endgame` + `/coach/session/middlegame` | `scripts/audit-coach-middlegame-endgame.mjs` (mode coverage matrix: which of Teach/Drill/Quiz/Trap/Play each surface supports today) |
   | `/coach/home` + tile nav | `scripts/audit-untouched-surfaces.mjs` |
   | `/coach/plan` (Training Plan) | `scripts/audit-coach-plan.mjs` |
   | `/coach/analyse` / `/train` | `scripts/audit-untouched-surfaces.mjs` |
   | `/tactics/*` | `scripts/audit-tactics.mjs` |
   | `/weaknesses` (or its tab/row → review flow) | `scripts/audit-weaknesses.mjs` |
   | `/openings/*` | `scripts/audit-openings-ui.mjs` (coordinate — often 🚧 in flight) |
   | `/openings/:id` Understand-zone book readers (From-the-Books / Overview / Key Ideas / Classic Wisdom read-aloud) | `scripts/audit-book-reader-prod.mjs` (3-instrument: Playwright + prod audit-stream + narration listener; asserts read-aloud routes through `speakReadAloud`/bypassVerbosity, full passage, no briefCap clip) |
   | `/openings/:id` trap + warning tiles | `scripts/audit-opening-trap-tiles.mjs` |
   | `/openings/:id` masterclass WLPP + punish-gems (post-deploy contract) | `scripts/audit-punish-gems-loop.mjs` — **3-PASS CONTRACT (David 2026-05-24): MET only on 3 CONSECUTIVE error-free passes; EACH pass touches EVERY function, each pass digs DEEPER; any error resets the streak.** Covers ALL masterclass openings (every variation tab's WLPP buttons + Watch/Learn lessons), not just gems. Verifies CORRECTNESS not just mounts: gem tiles name their real inaccuracy+punish, every variation tab loads a DISTINCT lesson (no wrong/duplicate), no EMPTY gem card, voice contract decoded off `/api/tts` (Watch=prose / Learn=cue / Practice=silent; warmup `.` probe excluded). Parallelize per-opening via `AUDIT_OPENING=<id>`. Run after every deploy touching the masterclass/gems/WLPP surface. **🔒 IT IS A FULL-PLAY AUDIT — A SKIP IS NOT A PASS (David 2026-06-01: "this is a full play audit. bots are not trusted here").** The gems must be ACTUALLY PLAYED through every rung (Watch→Learn→Practice→Play); when the sandbox unlock write stalls and the play is SKIPPED, the verdict is **CONTRACT DEFERRED**, NOT met — the full interactive play-through is then owed on a real device / prod, never rubber-stamped green from a skip. **🔒 CONTINUITY-ERROR CHECKING IS IN SCOPE (David 2026-06-01: "be checking for continuity errors as well. lock that into the loop audit scope").** A deterministic, browser-INDEPENDENT `continuityPreflight()` runs FIRST (it does not trust the flaky browser / the write-stalled unlock) and HARD-FAILS the audit on any continuity break: (1) gem **field continuity** — `playLine === lineMoves + inaccuracy + punishSeq`, every move legal from the prior FEN (no board jump / field drift), inaccuracy exactly at the spine boundary with the punish next; (2) gem **narration continuity** — watch/learn arrays match the playLine length (no slid cue) and each keystone beat NAMES its own move on its own ply; (3) **variation↔spine continuity** — every variation line branches FROM the opening spine (shares its opening plies) and is itself a legal, gap-free line, never a cold/unrelated position. (Opening→middlegame-plan continuity is the G9.3 Gate C job — keep the two in sync.) **🔒🔒 DONE = THE FULL-PLAY PLAYWRIGHT RUN GREEN ON `main`/PROD — NOT THE SANDBOX (David 2026-06-01, emphatic: "that's why it's done on main with playwright. Lock that into the rules!!!!!").** The sandbox/localhost run CANNOT complete this audit — the IndexedDB write-stall blocks the weapons unlock, so the gems never actually unlock, play, or speak there; the best a sandbox run yields is `CONTRACT DEFERRED` (continuity preflight + render checks only). That is a TODO, NOT a pass. The audit is "done" ONLY when the FULL-PLAY Playwright run goes GREEN against the LIVE `main` deployment (`AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app`), where the unlock write lands and every rung (Watch→Learn→Practice→Play) is ACTUALLY PLAYED + Ruth's voice fires per the contract. So the sequence is locked: ship to `main` → wait for the prod bundle to advance → run the full-play Playwright loop against PROD → only then is the gems/WLPP surface verified. Never claim the loop audit "done" off a sandbox `DEFERRED`; that just means the real run on `main`/prod is still owed. **🔒🔒 THE PROD FULL-PLAY RUN IS A 3-INSTRUMENT AUDIT — PLAYWRIGHT + AUDIT-STREAM + NARRATION LISTENER (David 2026-06-01: "Playwright audit streaming and listening tool. Lock that in too").** Per G1, the loop audit's prod run uses ALL THREE instruments together, never Playwright alone: (1) **Playwright** drives the full play-through (unlock → Watch → Learn → Practice → Play across every gem + variation tab); (2) the **live audit-stream pull** (`GET /api/audit-stream?since=<ms>` with the `x-audit-secret` header, pulled BEFORE and AFTER the run so the delta = exactly this run) captures the `coach-narration-spoken` / `voice-speak-invoked` events the app emitted — proving what it actually DID internally; (3) the **narration listener sidecar** (`scripts/audit-lib/audit-listener.mjs` → `startAuditListener()`, with the page's `auditStreamUrl` localStorage pointed at it) captures every voice/speak event with its source + verbosity tag — proving Ruth ACTUALLY SPOKE each gem's Watch prose and Learn cue and stayed SILENT on Practice, in the running app. Decoding `/api/tts` request text alone (instrument 1's shortcut) is NOT the voice gate; silence where a keystone should speak is a bug only the stream + listener catch (the ModelGameViewer-never-calls-voiceService class of regression). So the gems/WLPP surface is verified DONE only when the 3-instrument full-play Playwright run is green on `main`/prod WITH the listener confirming the voice fired — `scripts/audit-pro-naroditsky-prod.mjs` is the 3-instrument reference to clone. **🔒🔒 NO OPENING MAY TEACH A LOSING POSITION — SOUNDNESS IS IN THE LOOP-AUDIT SCOPE (David 2026-06-01).** Every opening/variation/gem the audit plays must be engine-checked at the line's terminus FROM THE STUDENT'S PERSPECTIVE (per the SOUNDNESS-SWEEP doctrine + `scripts/soundness-sweep.mjs`): a quiet/positional line that leaves the student clearly worse (worse than ≈ −1.0) is a BAD opening teaching a losing position → FAIL. The ONLY allowed negative eval is a deliberate sharp GAMBIT/sacrifice showcase (the student sacrificed; the gambit is an honest historical showcase) — never a quiet line that lies about its soundness. The narration must not claim equality/advantage on a losing line. **🔒🔒 EVERYTHING WIRED — CLOSE THE LEARNING LOOP, NO GAPS (David 2026-06-01: "everything is wired properly into other components of the app to close the learning loop with no gaps or errors found anywhere").** The audit verifies the surface is INTEGRATED end-to-end, not islanded: every WLPP rung routes to a real next step (Watch→Learn→Practice→Play with Play LOCKED to the taught line via in-page `OpeningPlayMode`, never the generic `/coach/play`); rung completion fires `markRungComplete` and UNLOCKS the next rung (incl. on the opponent's auto-played final move); the opening→variation→middlegame-plan→endgame chain is one continuous line (G9.3 Gates B/C); gems/lessons feed the coach (player-game refs + master-play grounding) and the SRS/flashcard + progress trackers; and NO dead-ends, orphaned components (G8 orphans), 404 routes, or console/page errors anywhere in the walk. A gap anywhere in the loop — a rung that doesn't advance, a Play that wanders off the line, an orphaned lesson, a broken hand-off — is a FAIL. The audit is DONE only when EVERY function on EVERY opening was actually PLAYED through (Playwright + audit-stream + listener), each pass deeper, with continuity clean, zero losing-position lines, the whole learning loop wired with no gaps, and ZERO errors anywhere. **🔒🔒 DONE ON `main`, NO SANDBOX (David 2026-06-01).** This audit does not count from the sandbox/localhost — it runs against the live `main` deployment from an environment with real client IndexedDB writes; a sandbox run is at most a continuity/render preflight, never the audit. **🔒🔒 THE AUDIT MUST UNLOCK THE PROGRESSION LOCK (David 2026-06-01: "unlock the progression lock").** The gems + rungs sit behind the progression ladder (per-color expert-pass / `weapons-unlock-all-btn` → `unlockOpeningAllLines`). The full-play audit MUST actually DRIVE that unlock — spend the expert pass / complete the ladder — so every gem + rung is reachable and gets PLAYED. "Weapons locked" is NOT an acceptable terminal state; an audit that leaves the progression locked has NOT run. On `main` the unlock write lands → unlock the progression, then play Watch→Learn→Practice→Play on every gem of every opening. **🔒🔒 THE GEMS ARE PART OF THE PROGRESSION LOCK (David 2026-06-01).** The gems are not a separate unlock — they sit INSIDE the progression ladder, reached by PROGRESSING it: complete each WLPP rung (Watch→Learn→Practice→Play), every `markRungComplete` write unlocking the next rung, until the gems unlock as part of that progression (the per-color expert-pass is only the SHORTCUT past the ladder). So the audit reaches the gems by driving the real progression, not by assuming an "unlock all" click alone exposes them — clicking the expert-pass shortcut without driving the ladder will leave the gems locked (the 2026-06-01 probe saw exactly this: raw openings write succeeded ~719ms, the expert-pass button clicked, yet no `gem-watch-*` surfaced because the progression itself wasn't driven). Drive the progression → the gems unlock → then play them. **🔒🔒 THE FULL-PLAY PROCEDURE — RUN IT THIS WAY (David 2026-06-01, "add that to audit rules").** Per opening, per pass: **(1)** load `/openings/<id>` on `main`/prod, dismiss the strength-calibration bubble + page-help modal, wait for the deferred seed (~30-60s, poll the openings store); **(2)** DRIVE THE PROGRESSION — actually complete each WLPP rung in order (Watch → Learn → Practice → Play) on the main line and every variation tab, letting each `markRungComplete` write land and unlock the next rung (the writes work on prod — proven ~719ms); **(3)** once the progression unlocks the gems (they live inside the lock), PLAY every gem through its own Watch→Learn→Practice→Play; **(4)** all three instruments run together throughout — Playwright drives, the audit-stream is pulled before+after, and the narration listener confirms Ruth spoke each Watch prose + Learn cue and stayed silent on Practice; **(5)** verify continuity (preflight, gap-free lines, opening→mg→endgame chain), soundness (no line leaves the student worse than ≈ −1.0 except honest gambit showcases), and full wiring (every rung→next-step, Play locked to the taught line, gems/lessons feed coach+SRS+progress, no orphans/dead-ends/404s/console errors); **(6)** go DEEPER each pass (cold-cache reseed, play-to-completion, wrong-move/pick-before-load/out-of-order stress). MET only on 3 consecutive passes that did all of the above with ZERO errors and NOTHING skipped. NEVER use the expert-pass shortcut in place of driving the ladder — the audit must prove the progression itself unlocks + plays + teaches correctly. **🔒🔒 PLAY THROUGH THE LINES — VERIFY ARROWS + NARRATION PER MOVE, NOT JUST THAT THINGS LOAD (David 2026-06-01: "make sure you're actually playing through the lines. Not just making sure things load. I want arrows confirmed correct, narration matches. All the things!").** "It mounted / the button exists" is NOT verification. As the audit PLAYS each line move-by-move (Watch auto-play, Learn/Practice/Play moves), it MUST assert, at EVERY played ply: (a) **ARROWS CORRECT** — the lead-the-eye/move arrow rendered on the board originates on the piece that is actually moving and points to the real destination square (the move's from→to), and any extra vision arrow sits on a real piece with a clear sight-line (lessonIntegrity); (b) **NARRATION MATCHES THE BOARD** — the spoken text (captured by the listener) describes the position AS IT ACTUALLY IS at that ply: every piece/square it names is真 on the board (no "the f6-knight" when f6 is empty), and it names the move it's spoken on — the `narrationAccuracy` contract, enforced LIVE during play, not just at build time; (c) **HIGHLIGHTS** land on the squares the narration names. The deterministic layer backs this (the `punishGems.test` arrow-origin check, `narrationAccuracy`, `lessonIntegrity`, `continuityPreflight`) but the full-play run must CONFIRM it on the live rendered board + the actually-spoken voice, every move, every rung, every gem, every opening. A wrong arrow, a narration that names a square that isn't what's there, a highlight on the wrong square = FAIL. ALL THE THINGS — board-true arrows + board-true narration + board-true highlights on every move played. |
   | every opening subline (deep walk, ~1-2h) | `scripts/audit-openings-deep-walkthrough.mjs` |
   | `src/data/repertoire.json` trap/warning content | `scripts/audit-repertoire-orientation.mjs` (data-only — runs without a browser) |
   | `src/data/pro-repertoires.json` trap/warning content | `scripts/audit-trap-orientation.mjs` (data-only — runs without a browser) |
   | `/` (dashboard) + SmartSearchBar | `scripts/audit-dashboard.mjs` |
   | settings toggles | `scripts/audit-settings-behavior.mjs` |
   | first-run strength calibration (boot rating + skill bubble) | `scripts/audit-strength-calibration.mjs` |
   | Cross-surface UI scaffolding | run multiple of the above |

   Every script in `scripts/audit-*.mjs` targets the live prod URL
   by default (override with `AUDIT_SMOKE_URL` for local).

5. **All scenarios must be green.** If any fail:
   - Dig into the failure FIRST. Don't dismiss as flake without
     reproducing twice.
   - Real regressions: fix + push + re-audit. Don't claim done.
   - Genuine flakes (cold-start timing, transient network): bump
     the relevant timeout in the script and re-run, then commit
     the timeout fix.
   - Skipped scenarios are NOT failures (e.g. "no mistake-row
     entries on fresh prod context" is by design — the script
     seeds synthetic data where it can, but some flows can't be
     fully exercised cold).
6. **Save the report.** Each audit drops a JSON report under
   `audit-reports/<surface>-<iso>/report.json`. Reference it
   when reporting back to David ("all 20 scenarios green, report
   at `audit-reports/weaknesses-...`").

### Writing a new audit script

If you touched a surface that has no audit script and the change
isn't pure content / styling / docs / tests, **write the audit
script** as part of the same PR. Use existing scripts as templates:
- `scripts/audit-weaknesses.mjs` — modern reference. Per-scenario
  try/catch, structured report, synthetic-data seeding via
  `page.evaluate` + IndexedDB, scenario chain that can skip when
  preconditions aren't met.
- `scripts/audit-back-from-review.mjs` — focused regression-class
  audit (one specific contract, ~10 scenarios). Good for back-
  button-style contracts.
- `scripts/audit-coach-review.mjs` — large surface, many
  expectations, the `expectation` kind pattern (`visible` /
  `invisible` / `count-gte` / `url-matches` / `audit-present`).

Add the new script to the matrix above AND to `docs/AUDIT_INDEX.md`
the same commit.

### Deploy-pipeline gotchas (the ones we've actually hit)

- **Vercel free tier caps at 100 deploys/day.** When the cap hits,
  `vercel --prod` returns `Resource is limited`. GitHub auto-deploy
  is sometimes affected too. If you hit the cap, the only options
  are (a) wait ~24h, (b) re-alias an existing successful deploy
  via `npx vercel alias <preview-url> chess-academy-pro.vercel.app`,
  (c) push an empty commit and pray.
- **Aliasing a Preview deployment to the production URL breaks
  any env var scoped Production-only.** `AUDIT_STREAM_SECRET` is
  Production-only by design. If you alias a Preview, the
  audit-stream endpoint returns `error: "server misconfigured…"`.
  Roll back the alias by re-aliasing the prior Production deploy
  (`npx vercel ls` → find the most recent `Environment` =
  Production row, alias that one).
- **Vercel CDN caches the index.html briefly.** If
  `curl -I .../` returns `x-vercel-cache: HIT` and the
  `last-modified` is older than your push, give it 30-60s and
  re-curl with a cache-buster (`?cache_bust=$(date +%s)`).
- **Production alias can lag behind main by 5-30 min when Vercel
  is rate-limited or queued.** Always verify the deployed bundle
  hash matches your latest commit BEFORE auditing — running an
  audit against the old bundle wastes time chasing a "regression"
  that doesn't exist yet because your code isn't shipped.

## Before Finishing a Session

**🚨 The one-button "am I done?" check is `npm run ship-check`.** David
2026-05-22: "next time I claim done, I should be running ship-check and
showing you the green checks." Wired in `scripts/ship-check.mjs`. Runs:

  - `typecheck` (must pass, 0 errors)
  - `lint` (errors only — the project warning cap drifts at a different
    cadence than the gates, so ship-check decouples warnings from
    blocking ship-readiness)
  - The CURATED content-gate test list (NOT every test in the repo):
    lessonIntegrity, narrationAccuracy, narrationGrounding, lessonDepth,
    pircIntegrity, repertoire-orientation, pro-repertoires-orientation,
    openingManifests, modelGames-orientation, middlegamePlanner,
    middlegamePlanThemes, MiddlegamePlansSection, EndgamePlansSection,
    OpeningDetailPage.wiring. (The narration-coverage gates ride inside
    middlegamePlanThemes, punishGems, and commonMistakeNarration — see the
    NARRATION COVERAGE rule above.)
    These are the load-bearing gates that protect content correctness. UI /
    snapshot / integration tests live at a different reliability bar and
    aren't gated here. Two were added 2026-05-24:
    • **modelGames-orientation** — no model game with `studentSide` set shows
      that side LOSING, and the protected masterclass openings tag every game
      (so the coach-injection filter excludes losses). Add a new opening to
      its PROTECTED list when its model games declare `studentSide`.
    • **OpeningDetailPage.wiring** — the masterclass sections actually RENDER
      in OpeningDetailPage (catches the "built but mounted nowhere" orphan
      class that hid the model-games renderer). Update REQUIRED_SECTIONS when
      you add/remove a section.
  - Pulls the live audit-stream (informational, never blocks).
  - On green, writes a watermark to `.ship-check-log/latest.json`
    (gitignored) recording the SHA + timestamp — used by `--summary`.

  Exits 0 with `READY TO PUSH` only if every required check is green.
  Exits 1 with a concise per-check failure tail otherwise. Run BEFORE
  every push to main. **Don't claim done without running it.**

  Add `--full` (`npm run ship-check:full`) for the **auto-detected
  Playwright audit matrix**. ship-check inspects `git diff
  origin/main...HEAD` + working tree, maps changed files to relevant
  audit scripts via a built-in matrix (mirrors the Post-Deploy Audit
  table), and runs them. Needs `npm run dev` up on :5173 first.

  `npm run ship-check:summary` reads the last green-run watermark and
  prints the commits + files changed since — paste-ready for a commit
  message or PR description. Doesn't run any checks; instant.

  **Pre-push git hook:** `npm run install-hooks` writes
  `.git/hooks/pre-push` that runs `npm run ship-check` on every push
  and blocks on red. Idempotent — re-run after a fresh clone or to
  update. Bypass with `git push --no-verify` (only when you understand
  the cost). `.git/hooks/` is gitignored, so each fresh clone needs
  the install once.

The full sequence:

1. `npm run ship-check` — must print `READY TO PUSH`.
2. `npm run ship-check:full` (if you touched lesson surfaces or the
   masterclass UI) — Playwright matrix must be green too.
3. Commit + push to main (per Deployment Policy above — main only,
   no PRs unless explicitly requested).
4. Wait for Vercel build to finish; **Post-deploy audit ran AND all
   scenarios green** (see "Post-Deploy Audit (MANDATORY)" above) — this
   is the load-bearing step, not the test suite.
5. Pull the audit-stream once more (G2), report counts to David.
6. Update MANIFEST.md / archive any landed plan docs.
7. If you created new files, verify they follow the file organization rules above.
8. If you wrote a new audit script, add it to the matrix in
   "Post-Deploy Audit" and to `docs/AUDIT_INDEX.md`.
