# Pro Repertoires → Masterclass Standard — PLAN

**Status:** PLANNING (awaiting David's call on scope + architecture). Do NOT
start authoring content until the open decisions below are resolved.

**Owner directive (David, 2026-05-27):**
1. "Make sure that whatever opening is being taught, the pro actually played it.
   I want their most common lines, things they actually play."
2. "Use the master DB and other tools to find games and build a plan."
3. "Use the internet (especially for influencers and pros that teach on YouTube
   for their lines and recommendations)."

So: every line in every pro opening must be **provenance-bound** to that
specific player — either a real game they played, a position that arises with
real frequency in their game tree, or a line they publicly teach/recommend.
No invented or assumed lines.

---

## 0. BUILD FRESH — discard current data (David 2026-05-27)

"The current stuff will ALL get replaced. We are building fresh." The existing
`pro-repertoires.json` (82 openings, flat schema) is NOT a source of truth and
will be fully replaced. Do NOT audit/preserve/migrate it. Every pro opening's
line set is determined ONLY from:
1. **What they actually play** — the harvested most-played-variation rankings
   (`docs/audit-runs/2026-05-27-pro-provenance/rankings.json`, 136,880 games).
2. **What they explicitly teach/recommend** — web/YouTube (for the teachers;
   honor a named taught line even if their blitz favors something else, e.g.
   Gotham teaches the London while personally blitzing the Trompowsky).
Each shipped line carries a `provenance` record (§4). Elites ground on their
serious/OTB games (online blitz is NOT their real repertoire — Carlsen proof).

## 1. (reference) Prior state being replaced

- `src/data/pro-repertoires.json`: 14 players → **82 openings** across 45
  opening families. Flat pre-masterclass schema: `overview` + 4 `keyIdeas` +
  prose-string `traps`/`warnings` + `variations[{name,pgn,explanation}]`
  (2–9 each, avg 3). Only 3/82 carry structured `trapLines`.
- They route through the SAME `OpeningDetailPage` as masterclasses
  (`App.tsx:270`) but every masterclass content layer keys off `opening.id`,
  and `pro-<player>-<line>` matches **nothing**: no lesson scripts → Watch/Learn
  fall to legacy `WalkthroughMode` dictation (`OpeningDetailPage.tsx:579-614`);
  no punish-gems; no model games; no `mp-*` plans; no named-trap beat-lessons;
  no checkpoint quizzes / common-mistakes; no manifest entry (still show under
  "Most Common", not Masterclasses).
- **Net:** pro openings are a pre-Vienna experience. They are blank not because
  tools were unreachable, but because they predate the masterclass pipeline and
  were never run through it.

### Provenance problem (the new, load-bearing finding)
The current pro lines were authored from assumption, not from each player's real
games. Some are surely right (Eric Rosen ↔ Stafford); many `keyIdeas`/`variations`
have never been checked against what the pro actually plays. **Phase 1 audits
this; ungrounded lines get corrected or dropped.**

---

## 2. Verified grounding toolchain (this sandbox, 2026-05-27)

| Source | Reachability | Role |
|---|---|---|
| Lichess `/player` explorer (direct) | 200 anon | per-player move-frequency tree (THE "what they actually play most" source) |
| chess.com archives API / lichess games API | 200 | full PGN of real games → verify lines + source model wins |
| Masters DB explorer (proxy) | 200 | OTB serious games for elites + topGames IDs |
| `/api/lichess-game-export` | 200 | full PGN + evals |
| WebSearch / WebFetch | works | YouTube/influencer taught lines + recommendations |
| Stockfish 16 (`/usr/games/stockfish`) | runs | gem mining + soundness grading |
| Local pro-game cache (`docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`) | present | 2,000 games / 10 players — offline fallback + verification |
| `openings-lichess.json`, masters-db.json, book corpus | present | G3 spine, theory/frequency, idea grounding |

Gaps: cache missing gukesh/ericrosen/chesswithakeem/samayraina (fetch live).
Proxy doesn't forward `/player` — but direct works from sandbox, so no code
change needed for the build pipeline.

---

## 3. Player taxonomy → grounding source (per David's two rules)

- **OTB elites** — Carlsen, Caruana, Firouzja, Gukesh, Praggnanandhaa, Niemann
  (+ Hikaru classical): real repertoire = **serious games**. Masters DB +
  their game archives (filter to classical/serious; ignore bullet noise).
- **YouTube teachers** — Naroditsky, GothamChess (Levy), Eric Rosen, Anna
  Cramling, ChessWithAkeem, Samay Raina: real repertoire = **what they
  teach/recommend** (WebSearch/WebFetch their videos + Chessable/stated reps)
  cross-confirmed against their `/player` tree + archives.
- **Both** — Hikaru, Dubov (elite OTB AND massive streamers): use both, prefer
  serious games for the line, streams/recs for flavor.

---

## 4. The provenance contract (new gate)

Every variation/line taught in a pro opening must carry a `provenance` record:
```
{ kind: 'game' | 'tree' | 'recommendation',
  ref: <game URL> | <player-explorer freq, games, score> | <YouTube/article URL>,
  player: <playerId>, verifiedAt: <iso> }
```
- `game` — a real game the pro played reaching this line (URL).
- `tree` — the line arises in the pro's `/player` tree above a frequency floor
  (proposed ≥3% of games at its fork, ≥N games).
- `recommendation` — the pro publicly teaches it (video/article URL).
A line with no provenance does NOT ship. Output dataset:
`src/data/pro-line-provenance.json`. A new gate (`proLineProvenance.test.ts`)
fails if any shipped pro line lacks a resolvable provenance entry. This is the
machine-checkable form of "make sure the pro actually played it."

---

## 5. Decisions (RESOLVED 2026-05-27)

- **D1 = FULL STANDALONE.** Every pro opening is its own masterclass, authored
  from the PLAYER'S real line — own lessons, own gems mined from his line, model
  games = his real wins, own plans/traps/quizzes. No inheriting the generic base.
- **D2 = WAVE 1 PROOF FIRST.** Build ~4 end-to-end to prove the
  provenance→masterclass pipeline, THEN scale to all 14. Wave 1 =
  **Naroditsky, GothamChess, Eric Rosen, Carlsen** (3 YouTube teachers + 1 elite,
  so both grounding paths get exercised).
- D3 (frequency floor) / D4 follow during Phase 0; draft floor ≥3% at fork AND
  ≥20 games in tree, OR a documented recommendation.
- **D5 = PLAY/TEACH UX = BADGE + FILTER (David 2026-05-27).** Build a LARGE pro
  repertoire using BOTH played + taught lines. Each pro opening gets a
  `provenance: 'plays' | 'teaches' | 'both'` tag (+ game-count + video URL).
  ProPlayerPage keeps White/Black grouping, adds a provenance chip per card + a
  filter toggle (All / Plays / Teaches). NOT separate tabs — most signature lines
  are BOTH, which a hard split would orphan/duplicate.

### (archived) D1. Architecture: standalone vs inherit-base vs hybrid
45 of 82 families already have a full generic masterclass (Scotch, Vienna, Caro,
Italian, Ruy, French, Najdorf, KID, …). A pro opening teaches the PLAYER'S
specific line, not generic mainline theory.
- **A. Full standalone** per pro opening (lessons/gems/games/plans/traps/quizzes
  authored from the player's line). Faithful, enormous (82 builds).
- **B. Inherit base + overlay** — pro opening reuses the base masterclass's
  engine-verified layers, overlays player voice/keyIdeas. Cheap, but dilutes
  "his actual line" when the pro diverges from mainline.
- **C. Hybrid (recommended)** — the pro's LINE is provenance-sourced and drives
  the lesson spine + model games (his real wins) + gems mined from his line;
  shared engine/theory layers are reused where the line coincides with the base.
  Best fidelity-to-effort, directly honors "his most common lines."

### D2. Scope / order
All 82, or a priority wave first? Proposed wave 1 = the YouTube teachers whose
provenance is richest + most on-brand (Naroditsky, GothamChess, Eric Rosen) +
one elite (Carlsen), to prove the pipeline end-to-end before scaling.

### D3. Frequency floor for `tree` provenance
What % / game-count makes a line "a line he actually plays" vs a one-off? (Draft:
≥3% at the fork AND ≥20 games in his tree, OR any documented recommendation.)

### D4. Pro vs generic relationship on the page
Is the pro section a distinct "learn how <player> plays X" experience (implies
A/C), or a player-flavored entry into openings already taught generically
(implies B)? D1 follows from this.

---

## 5b. WAVE-1 BUILD LIST (from harvest + taught recs, 2026-05-27)

Grounded in `rankings.json` (games/serious/score) + web-confirmed taught lines.
"played" = data-dominant; "taught" = web/YouTube recommendation. Each opening
becomes a full standalone masterclass built from the player's own line.

**Naroditsky** (teacher+elite, 12,269 games)
- White: Alapin Sicilian (300g+, taught ✓), Four Knights Scotch (409g C47, taught
  "Four Knights Scotch" ✓), Jobava/London (164g+), Caro-Kann Exchange (73g),
  Sicilian Canal (67g)
- Black: Accelerated Dragon (220g+), King's Indian Defence (200g+)

**GothamChess** (teacher, 12,261 games)
- White: Trompowsky (950g — signature, played), Vienna C29 Paulsen (103g, NAMED by
  David ✓, played+taught), London System + anti-KID plan (taught ✓, NAMED by David
  — 3.Nc3/Qd2/Bh6/h4), Levitsky/Jobava (151g)
- Black: Scandinavian (450g+, signature taught ✓), French Rubinstein (315g),
  Modern Defence (290g), Caro-Kann Two-Knights (104g)

**Eric Rosen** (teacher, 12,057 games)
- White: London System / Accelerated London (dominant, signature taught ✓)
- Black: Stafford Gambit / Petrov (378g C42, signature taught ✓), QGD Exchange,
  Catalan

**Carlsen** (elite, 9,623 games) — ⚠️ online = varied blitz, NOT his real
repertoire (0 serious per line). DO NOT build from online blitz. Needs OTB /
masters-DB sourcing first; propose his OTB mainstays (Ruy Lopez as White, etc.)
pending that grounding step. Flagged as the elite-path proof.

Build order (cleanest-grounded first): Eric Rosen Stafford → Naroditsky Alapin →
Gotham Vienna/London → Carlsen (after OTB sourcing).

## 5c. BUILD DOCTRINE per pro opening (David 2026-05-27)

Full Vienna-recipe standalone, with these sources nailed down:
- **Deep middlegame plans — always.** Every pro masterclass carries deep
  middlegame plans ("no reason not to"). Plan IDEAS + structures are mined from
  the pro's OWN games in the harvested 136k-game DB (the structures they actually
  reach and how they play them), oriented to the student side, lead-the-eye +
  Stockfish-sound.
- **Trap/weapon section = the masters-vs-amateur gem miner.** Keep the
  engine-first punish-gem pipeline: amateur-explorer blunders refuted by
  Stockfish, masters-DB false-weapon veto. Named traps layered on top.
- **Model games = the pro's REAL wins.** We HAVE these — the harvested games +
  the local pro-game cache. Source each variation's model game from the player's
  actual student-side wins (never fabricate; never a loss/draw).
- **The harvested game DB feeds variation DISCOVERY too** — beyond the
  top-frequency lines, mine the pro's games for additional real variations they
  play, each provenance-bound.

## 6. Phased plan (once decisions land)

- **Phase 0 — Provenance harvest.** For each player: resolve handles; pull
  `/player` frequency tree (both colors) + archives; WebSearch/WebFetch taught
  reps for the teachers; build `pro-line-provenance.json`. Extend the cache to
  the 4 missing players. (Tooling all verified; runnable now.)
- **Phase 1 — Audit current data vs provenance.** Flag every existing pro line
  that isn't confirmed. Produce a per-opening verdict: keep / correct-to-real-line
  / drop. Report counts to David.
- **Phase 2 — Per-opening rebuild** through the Vienna recipe (playbook §0.7
  STEP 0–9), grounded in provenance: lessons (two-register narration), model
  games = the player's real wins, gems mined from his line, lead-the-eye plans,
  named traps, quizzes, manifest entry. Per architecture decision (D1).
- **Phase 3 — Gates + audits.** `npm run ship-check` content gates +
  `proLineProvenance.test.ts` + per-opening interactive audits (3 clean rounds),
  audit-stream pull. Push to `main`, post-deploy audit (G1).

## 6b. BUILD PROGRESS — Eric Rosen Stafford (first opening)

- ✅ **Main lesson built + verified + LIVE.** `src/data/lessons/proEricRosenStafford.ts`
  (`PRO_ERICROSEN_STAFFORD_LESSON`, openingId `pro-ericrosen-stafford`, black,
  8 beats, two-register, 10-ply). Spine chess.js-verified
  (`scripts/verify-stafford-spine.mjs`); arrows/highlights all grounded +
  sight-line-legal (self-checked with the gate logic). Wired into runtime
  `lessons/index.ts` LESSONS → renders via LessonPlayer (Watch/Learn) instead of
  the legacy fallback. Grounded in his 688 real Stafford games (~80%).
- ✅ **Orientation bridge.** `registry.ts` COLOR_BY_ID now merges
  pro-repertoires.json colors so pro lessons resolve their student side + pass
  the orientation gate.
- ⏳ **NOT yet done for this opening:** gate-registry registration
  (`registry.ts` ALL_LESSONS) + manifest entry — DEFERRED until the manifest/gate
  bridge lands (openingManifests + content gates must read pro-repertoires.json),
  to avoid red gates mid-build. Lesson is self-verified in the interim.
  Remaining content: variation lessons (Stafford 4.Nf3 / 5.Nc3 lines), punish-gems
  (the …Nxe4 / …Bxf2+ traps — MINE + verify, don't author from memory), model
  games (his real wins), deep middlegame plans (mined from his games), checkpoint
  quizzes + common mistakes, then full gate registration + interactive audit.

## 6e. POST-DEPLOY AUDIT — GREEN IN SANDBOX (3 tools, corrected 2026-05-27)

CORRECTION to §6c below: the sandbox CAN render + audit the pro masterclass
(David was right). The earlier "can't render" was a deep-link that skipped the
AWAITED seed. Fix in `audit-pro-stafford.mjs`: boot → onboarding → **`/openings`
(awaits seedDatabase)** → direct-IDB unlock + voice-on (the fixture-loader
pattern; raw txns work) → navigate to the Stafford → renders. **10/10 checks:**
- Playwright: renders, 4 variation tabs, WLPP buttons, middlegame-plan card,
  model-game card, Watch plays the LessonPlayer.
- Listener: hand-written narration verified via the on-screen beat text. (TTS
  audio requests = 0: voiceEnabled-in-IDB needs a reload to reach Zustand, and a
  reload reintroduces the reconcile openings-write stall — so audio FIRING +
  QUALITY stays David's check per G7; narration CONTENT is verified on-screen.)
- Audit-stream: capture wired via `page.on('request')` (0 POSTs — prod stream
  blocked in sandbox, expected).
- WLPP ladder unlock via raw IDB write SUCCEEDS once the boot-seed settles.

## 6c. POST-DEPLOY AUDIT (3 tools, 2026-05-27) — superseded by §6e

Ran `scripts/audit-pro-stafford.mjs` vs localhost dev server with all three
tools (Playwright drive + /api/tts listener + /api/audit-stream capture):
- ✅ App boots, first-run strength-calibration handled, pro Stafford route loads.
- ⚠️ Opening does NOT render in-sandbox — stuck "Loading opening…" because the
  pro-opening Dexie seed (`startDeferredSeed` → openings-store WRITE) hits the
  **documented G1 sandbox IndexedDB write-stall**. NOT a code bug (base
  masterclasses hit the same stall). → Live render + narration firing + audio
  quality + unlock persistence MUST be verified by DAVID on prod / a real device.
- ✅ Write/resolve LOGIC proven instead (G1-sanctioned) via
  `proEricRosenStafford.test.ts` (4 tests): opening record well-formed
  (black, verified spine, 3 provenance-tagged variations), orientation bridges
  to black, main + 3 variation lessons resolve to distinct LessonPlayer scripts.
- ✅ All content gates green (lessonIntegrity / narrationAccuracy /
  narrationGrounding / lessonDepth / wlppNarration / lessonTabIntegrity /
  openingManifests + orientation/theme gates).

🔔 FOR DAVID — prod verification needed (sandbox can't): open
`/openings/pro/ericrosen/pro-ericrosen-stafford`, tap Watch + Learn, confirm the
hand-written Stafford narration speaks and the board leads the eye; confirm the
unlock ladder persists.

## 6d. ERIC ROSEN STAFFORD — COMPLETE (2026-05-27)

Full Vienna-standard standalone masterclass, all built fresh from his real games
+ verified, all gated (12 content-gate files, 4397 tests green; typecheck clean):
- ✅ Main lesson + 3 variation lessons (Nxc6 / 4.Nf3 Retreat / 4.Nxf7 Sac) —
  two-register, ≥20-ply, grounded arrows.
- ✅ Named weapon: the …Bxf2+ forced-mate trap (chess.js-verified), full WLPP.
- ✅ Model game: real Eric Rosen win abZzbeTM (…Bxf2+ → Qxe3#), studentSide black.
- ✅ Deep middlegame plan: kingside-space + f2-hunt, theme-demonstrating,
  lead-the-eye, two-register, sourced.
- ✅ 4 grounded key ideas; provenance `both` (plays 688g/~80% + teaches).
- ⏳ Optional/self-hiding not yet built (enhancements): checkpoint quizzes,
  common-mistakes (Pitfalls), endgame plan — all manifest floor 0, section
  self-hides; add when a genuine one exists.
- 🔔 PROD VERIFY (David): the full Stafford page render + WLPP + voice can't be
  checked in-sandbox (G1 openings-write stall) — confirm on prod/device.

Reusable pro-opening INFRA now in place (every future pro build inherits):
orientation/manifest/tab-integrity/themes gate bridges to pro-repertoires.json;
trap-ladder + tab→plan wiring accept pro ids; provenance harvest + confirmer
scripts.

## 6f. ERIC ROSEN LONDON — data grounded, lessons DRAFTED (not registered)

- ✅ Data grounded: `pro-ericrosen-london` pgn (22-ply vs-…d5 main), 3 provenance-
  tagged variations (vs …d5 / vs KID / vs …c5), 4 key ideas, provenance `both`
  (plays 1352g / teaches). Lives in pro-repertoires.json now.
- ✅ Lessons authored + self-verified (legality, grounded arrows, ≥20-ply, two
  registers): `proEricRosenLondon.ts` + `proEricRosenLondonVariations.ts`.
- 🚧 NOT registered — held as DRAFTS. The London transposes, and my accelerated
  2.Bf4 spine order doesn't anchor ≥6 plies in openings-lichess.json (G3 /
  lessonIntegrity), which orders it `d4 Nf6 Nf3 d5 Bf4 c5 e3 Qb6 Nc3` (vs …c5) and
  `d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 Be2` (vs KID). **TO FINISH:** re-derive each beat's
  move array to follow a real DB line for ≥6 plies (positions are identical —
  pure transposition), keep narration aligned, then re-register in index.ts /
  registry.ts / opening-manifests.json and run lessonIntegrity. Gates stay green
  meanwhile (drafts are unimported).

## 7. Next-session pickup
Decisions D1–D4 are the gate. Once set, start Phase 0 (provenance harvest) — all
sources verified reachable in-sandbox 2026-05-27; no laptop handoff needed.

## 10. SESSION CHECKPOINT (2026-05-28) — study-notes corpus + Jobava variations

**New grounding infra (all committed + pushed to the branch):**
- **STUDY NOTES = new grounding source (David: "from his perspective, tell a
  story").** Harvested each teacher's lichess studies (their lines + IDEAS, in
  text) as a cite-and-translate reference. Paths:
  `docs/audit-runs/2026-05-27-pro-provenance/naroditsky-study-notes/` (12 studies)
  + `…/study-notes/<pro>/` (ericrosen 7 — his OWN verbatim, gothamchess 5, anna 1,
  samay 1). PDF: `…/naroditsky-study-notes/Naroditsky-Study-Notes.pdf`; builder
  `scripts/build-study-notes-pdf.mjs`. Emailed (Gmail DRAFT, not auto-sent) to
  chessacademypro@gmail.com.
  - **🔒 LICENSING — cite-not-copy (David confirmed).** These are NOT public
    domain (unlike the Gutenberg book corpus). Use the MOVES + IDEAS, write our
    OWN narration, CITE the study (`https://lichess.org/study/<id>` resolves in
    narrationSources). NEVER ship their verbatim prose. Citation ≠ a copyright
    licence. Fan-compiled studies = "his lines/ideas", not verbatim; Eric Rosen's
    are his own.
  - **Elites (Carlsen/Caruana/Firouzja/Gukesh/Pragg/Niemann/Dubov/Hikaru/Akeem)
    have NO teaching studies** — ground them on master games (the dumps + masters
    DB), which IS the right source. Don't keep searching for fan derivatives.
  - **TODO (B-item):** wire study notes into the app "book section" as
    `src/data/pro-study-notes.json` + a `study:<id>` source type + BookReader —
    cite/translate surface only, never verbatim.
- **MASTERS DB is the G3 anchor now (David: "we teach how masters play it").**
  `dbAnchor.ts` unions `longestMastersAnchorPly` (each ply a move masters played
  from that position in `public/data/openings-masters-db.json`) with the lichess
  prefix anchor. Lets real Jobava sidelines (…c5/…Bf5/…a6, absent from the 3,653
  lichess subset but heavily played by masters) anchor ≥6. Existing lessons keep
  their lichess anchor.
- **FULL-PGN harvest tool:** `scripts/harvest-pro-full-pgns.mjs`
  (`PLAYERS=<pro>`) → `…/full-pgns/<pro>.json` (gitignored). Naroditsky done
  (20,549 games, full SAN). ⚠️ Stores color/result/elo/date/pgn but **NOT player
  names** — for model games, Naroditsky = `g.color` side; opponent name not in
  dump (re-fetch via `scripts/fetch-chesscom-game.mjs <id>` if a model game needs
  the name). Each OTHER pro needs this harvest run before building their openings.

**JOBAVA — variation tabs DONE (research-first, his voice, cited, gate-green):**
- Process locked: pull his study line FIRST → confirm against his game dump →
  author narration as a STORY in OUR words → cite his study. (David: "research
  BEFORE building.")
- …c5 = **4.e4!** (study N3XOjphc); …Bf5 = Ne5 + **g4! storm** (N3XOjphc SEC 6);
  …a6 = **a3 clamp + e4 break** (N3XOjphc SEC 2); …g6 = **h4!** (HaFTAegs).
  Main line …e6/Nb5 lesson already built. All in
  `proNaroditskyJobavaVariations.ts` + pro-repertoires.json variations[].

**JOBAVA — REMAINING (next session, build order: plans → model games → traps):**
- **Plan per variation** from each bucket's aggregate ideas (already mined):
  …c5 → e4/Bd3/Ne5; …Bf5 → Ne5 + g4-h4-h5 storm; …a6 → a3/b4 + e4; …g6 →
  h4-h5 + Qd2/Bh6 + Ne5. Two-register + lead-the-eye (`add-leadeye-to-plans.mjs`),
  theme-demo, cite his study.
- **Model game per variation** (his real wins, in the dump):
  …c5 `139555012928` (b3289), …Bf5 `143802846266` (b3142), …a6 `133330743613`
  (b3177), …g6 `150885490597` (b3192). studentSide white; overview + 2 critical
  moments (compute FENs from the dump PGN); cite game URL + his study. (The OLD
  main-line model game `mg-pro-naroditsky-jobava-nb5` + plan
  `mp-pronaroditskyjobava-bishoppair` predate study-grounding — refresh them.)
- **Traps:** run `mine-punish-gems` on the Jobava (test the explorer proxy
  first; CI fallback) — engine-first, amateur-data, masters-veto.

Then: full ship-check + interactive audit, and apply the SAME research-first
process to the rest of Naroditsky (then other pros, frequency-floor ≤10/colour).

## 8. BUILD METHOD REFINEMENTS (David, mid-build)

- **Only build TAUGHT/PLAYED lines.** Each line must be what the pro actually
  teaches or plays — grounded in their game-frequency + their stated teaching +
  a ≥6-ply DB anchor (openings-lichess.json). NOT a generic engine/most-popular
  line if it isn't what they do (e.g. Gotham's anti-KID is the aggressive
  Qd2/Bh6 attack he teaches, NOT the quiet central trade).
- **DEEPEN lines using real PGN DATA**, not just the explorer's per-ply most-
  popular move. Follow a real game PGN (the pro's own game where possible, else a
  masters-DB game) past the opening into the middlegame so the deep beat is a
  genuine played continuation, ≥20 plies.
- **FLAG issues to David.** Distinguish cosmetic/syntax bugs (stale arrow origin
  after a piece trades off the square; apostrophe inside a single-quoted cue
  breaking the parse) — caught by the gates, fixed in place — from genuine
  content problems (an untaught line, an unsound move), which must be surfaced.
- Recurring authoring gotchas to pre-empt: (a) double-quote any sayShort/say
  containing an apostrophe; (b) a vision arrow's origin piece must still be on
  that square at the beat's FINAL position; (c) every arrow endpoint + highlight
  square must be named bare in the prose (SAN like "Nf6"/"Bxf7" does NOT count).

## 9. TODO / PUNCH-LIST (flagged 2026-05-27 — before "done")

### A. NEEDS FIXING on already-shipped content
1. **Parity gap — 9 of 13 registered openings have NO model game + NO playable
   plan** (lessons + keyIdeas only): fantasy-caro, ericrosen-london, scotch,
   vienna, jobava-london, grunfeld, semi-slav, gothamchess-scandinavian,
   gothamchess-london. Only Stafford/KID/Alapin/Najdorf have the full set.
   → Backfill each with the pro's OWN real-game model game + a real playable
   middlegame plan (the §8 standard).
2. **Leftover auto-import JUNK still in the data:** 60 boilerplate pro model
   games (no studentSide, thin "Daniel Naroditsky as White vs…" overviews, some
   are student-side LOSSES) + 136 zero-ply SHELL plans, all for UNREGISTERED pro
   openings. They're not gated (those openings aren't in the manifest) but can
   render thin/losing content on those pro pages. → Scrap all pro boilerplate
   model games + shell plans (per "scrap preexisting").

### B. INFRA planned but NOT built
3. `proLineProvenance.test.ts` gate (machine-checkable "the pro actually plays
   this line") — never built. Provenance tags ARE on the built openings'
   pro-repertoires.json entries; the gate isn't.
4. ProPlayerPage **provenance badge + filter** UX (D5: plays/teaches/both chip +
   All/Plays/Teaches filter) — never built.

### C. SCOPE remaining (69 of 82 openings)
5. GothamChess ×8 more, Eric Rosen ×1 (Englund), then the ELITES (Carlsen,
   Caruana, Firouzja, Gukesh, Pragg, Niemann ×8 each) — masters-DB/OTB grounded,
   their OWN games for model games — and the streamers (Dubov, Hikaru, Anna,
   Akeem, Samay).
6. **Traps**: only Stafford has one. The engine gem-miner (mine-punish-gems) has
   NOT been run on any pro opening — should run it on the sharp ones (Vienna,
   Scotch, Najdorf, Fantasy Caro) to surface verified weapons (or confirm none).

### D. DEPLOY / VERIFY
7. All work is on branch `claude/pro-repertoires-masterclass-audit-SPrGW`, NOT
   merged to `main`. Per CLAUDE.md masterclass builds ship to main — merge when
   David judges the set ready.
8. Full-set post-deploy 3-tool audit (only Stafford/Alapin/Najdorf/KID audited
   individually) + David's prod-device check (G1: sandbox can't verify the
   IndexedDB unlock-write persistence or audio quality).

### E. UX — pro main tab indicators (David 2026-05-28, before final completion)
9. **On the ProPlayerPage main tab, identify per opening whether:**
   - **study notes are available** for it (he has lichess studies in the
     harvested corpus that cover the opening), and
   - **a masterclass exists** for it (it's built to masterclass-tier — i.e.
     has lessons + variations + model game + plan, or is registered in the
     opening manifest).
   Implementation sketch: `src/data/pro-study-notes.json` (openingId →
   `[{ studyId, url, title, role }]`) from the harvested
   `docs/audit-runs/.../*-study-notes/` corpus; a `getStudyNotesFor(openingId)`
   helper; `hasMasterclassTier(openingId)` helper; small badges in the
   ProPlayerPage opening list. **Cite, don't ship verbatim** (per §10 licensing
   rule).
10. **Lesson-source refresh:** every Naroditsky opening EXCEPT Jobava still
    cites the generic `youtube.com/@DanielNaroditskyGM` SRC. Replace with the
    specific lichess-study URL per opening once §9 study-notes mapping lands
    (Alapin/Vienna/Najdorf/KID/Grunfeld/Scotch/SemiSlav/FantasyCaro).
