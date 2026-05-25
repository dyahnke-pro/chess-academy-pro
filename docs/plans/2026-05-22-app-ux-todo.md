# ⭐ TOP PRIORITY — FIX/VERIFY THE LEARN TAB (David 2026-05-22)

Learn must GUIDE move-by-move while YOU play your side. Two fixes already
shipped (PR #653 routing: PlayableLinePlayer mode='learn'; PR #654: opponent
auto-plays + each move voiced). FIRST next session: **verify on prod** that
Learn now (a) auto-plays the opponent's side, (b) speaks each move, (c) only
asks you to play YOUR colour — across all 4 openings. If still off: the
remaining suspects are voice firing on every intended move (authored
keystones only today) and the visual "play this" hint on silent moves. Also
verify Practice mode shares the opponent-auto-play correctly.

---

# App UX TODO + Brainstorm — onboarding & progress model (2026-05-22)

Forward-looking UX work captured during the Caro-Kann masterclass build.
Not started yet — parked here so it isn't lost. Two linked threads: how we
TEACH the user to use the app, and how we TRACK + CONVEY their progress.

---

## TODO 1 — Progress model (WLPP → tiers) + CONVEY it to the user

**The model (locked with David 2026-05-22).** Each WLPP verb advances one
progress tier:

| Verb | Tier | Trigger |
|---|---|---|
| **Watch** | `discovered` | auto, on watching the line's masterclass through (`markLineDiscovered`, exists) |
| **Learn** | `learned` | completing the Learn run **earns a question** — "Do you feel like you have this learned?" → **the user's "Got it" marks it learned**; "Not yet" keeps it discovered and brings it back sooner |
| **Practice** | `perfected` | drilled clean (`markLinePerfected`, exists) |
| **Play** | `mastery` | rolling `getMasteryPercent` from last 10 vs the coach |

**Key decisions:**
- **We ASK the user — the self-assessment is the marker, not just objective
  completion** (David, emphatic: "we do need to ask the user!"). For a
  single-user app, his self-knowledge IS the truth. Completing Learn only
  *earns the question*; the answer marks the tier.
- "Not yet" → SRS confidence rating: line returns for review sooner.
- The eventual **weakness/error ACCOUNTING gate = `learned`** — so
  watched-only and "Not yet" lines never count mistakes against the user
  (this is the "don't penalize new openings" rule, made precise).

**Build notes:**
- New `linesLearned[]` field on the opening record → **Dexie version bump +
  upgrade fn** (standing order).
- The "Got it / Not yet" prompt UI at the end of every Learn run.
- **CONVEY to the user:** show the tier per line/opening (discovered →
  learned → perfected → mastery), and message the loop so they understand
  what each verb does to their progress. This is the message David wants
  surfaced, not buried.

---

## TODO 2 — "How to use this app" onboarding bubbles (the "i" help)

The brainstorm: **info bubbles that pop up explaining what each tab does.**
Formalised by playbook §8 (onboarding) — build to that spec:

- An **"i" top-right on every page** → coach-narrated, spotlighted
  coach-marks that explain WHAT each area/tab does and WHY.
- **Auto-run on first visit, replayable** after via the "i".
- Reusable **`PageHelp`** component.
- Teach features **when they first matter**; use **empty-states as teachers**.
- Teach **THE LOOP**: learn → play → capture → drill (and now: the WLPP
  progress tiers from TODO 1 — explain Watch/Learn/Practice/Play and what
  each does to your progress).
- Concretely for the Masterclasses tab: a bubble on the tab itself + one on
  each WLPP button explaining the verb, plus the progress-tier messaging.

**TODO 1 and TODO 2 are linked:** the onboarding bubbles are HOW we convey
the progress model (TODO 1) to the user. Build them together.

---

## Status
- [~] Progress model: `linesLearned` + `linesPlayed` + `linesUnlockedAll`
      fields ADDED (2026-05-24); WLPP rungs now marked on completion
      (`markRungComplete`, monotonic backfill). STILL TODO: the Learn-completion
      "Got it / Not yet" self-assessment prompt + a visible tier display
      per line/opening. (No Dexie version bump needed — optional object fields,
      read with `?? []`.)
- [x] **Onboarding `PageHelp` bubbles per tab (playbook §8) DONE (2026-05-24).**
      All main tabs + sub-tab landings carry an "i" (top-right) that auto-opens
      on FIRST visit (Dexie-meta tracked) then lives behind the icon. Copy
      teaches flow + cross-tab connections (Dashboard = the order of operations;
      Weaknesses = how errors log → feed the coach). NOT on play surfaces.
- [x] **WLPP unlock ladder (TODO 3b core) DONE (2026-05-24).** Watch→Learn→
      Practice→Play rungs are forward-locked (greyed + "Complete X to unlock Y"
      + checkmark on done); weapons (gems + named traps) locked until Play;
      per-line "I already know this — unlock all" escape so nobody's trapped.
      Resolver = `src/utils/wlppLadder.ts` (7 tests); marking = `markRungComplete`
      (5 tests). Play marks on LAUNCH (no in-page completion signal — the main
      line hands off to /coach/play). Verified interactively on the Vienna.
      REMAINING ladder rungs (TODO 3b items 2-3): line-complete → reward
      animation/star; opening-complete → graduate → unlock next opening;
      subline gating (TODO 3c, gate variations behind main-line WATCH only).
- Accounting gate (weakness tagging) deferred until the `learned` gate exists.
- [ ] **Coach proactively asks the user about their mistakes** — after a game/drill, the coach surfaces a mistake and *quizzes* the student on it ("you played X here — what was better, and why?") rather than just labeling it. Retention + active recall. (David 2026-05-24)
- [ ] **Store readiness (App Store + Play Store production)** — full plan at
      `docs/plans/2026-05-24-store-readiness.md`. Not a rewrite (Android already
      Capacitor-wired); real gaps = icon/splash assets, Android audio/mic native
      patch, WebView-parity QA, mic permissions + privacy, Play keystore.

---

## NEXT-SESSION PRIORITY ORDER (David 2026-05-22)

**1. Line-memorization SRS — the top lever (do BEFORE building opening #2).**
Another opening adds breadth, but the Caro/Ruy/Pirc/Vienna courses don't
*stick* without retention. SRS is what turns "I watched it" into "I can play
it under pressure." Build:
- Per-move SRS cards from the existing verified lesson lines: `(openingId,
  variation, ply)` → position FEN + correct SAN + SRS state.
- **FSRS** scheduling (not SM-2/Anki) — modern, fewer reviews, better
  retention. Surface due reps through the Training Plan + Dexie SRS store.
- **Drill the spine + KEY moves, not every filler move**, and keep the
  narration "why" attached to each card → "understand then retain", not rote
  (this is how it beats Chessable on our terms / honours the ideas-first ethos).
- Feed the "Got it / Not yet" self-assessment (TODO 1) into initial card ease.
- Natural home: the WLPP **Practice** mode (add scheduling + board-move grading).
- Multi-file build (scheduler + review UI + Training-Plan wiring) — needs a
  fresh session, not a 2%-data tail.

**2. Build opening #2 — needs David's repertoire first.** Pick from what he
actually plays (White 1st move + main Black answers), most-faced first — not
at random. Process is locked (playbook §0.5/§0.6); builders + gates + model-
game/trap pipelines all proven on Caro, so it's "author the data, it lights up."

**Done this session (in prod):** Caro masterclass (flagship+6 var+7 model
games+Qe2 warning), anti-invention gates 1-7, course-scoped coach chat,
continue-playing CTA, depth shortfalls extended, Stockfish engine-soundness
CI gate. Run the engine workflow to vet Vienna/Ruy deep tails.

---

## THE USER PATH — "the proper way to use the app" (what the bubbles teach)

The mantra: **Watch → Learn → Practice → Play → (Capture →) Drill.**
The first four climb the progress tiers (TODO 1); SRS + capture keep it from
leaking back out. This is the content the onboarding "i" bubbles (TODO 2)
must communicate, and the empty-states should nudge toward.

1. **First visit:** "i" bubbles walk each tab — what it does + why.
2. **Masterclasses tab → pick an opening you actually play.**
3. **Watch** the main line + each variation → get the ideas → *discovered*.
4. **Learn** → voice guides each move, you play it → "Got it / Not yet" → *learned*.
5. **Practice** → same line, silent, Hint on demand → clean replay → *perfected*.
6. **Play** → vs the coach, locked to the line → real reps → *mastery* (rolling).
7. **Ask the coach** anytime — scoped to the exact line being studied.
8. **Watch the model game** → see the idea win at the top level.
9. **Daily SRS reps** (once built) → due moves resurface so it doesn't fade.
10. (Future) **Capture** mistakes from real games → **drill** them.

The flywheel in one line: *learn it, play it, find the holes, drill them shut.*

---

## TODO 3 — Guide users back to Learn/Practice/Play after Watch

Problem: Watch is the satisfying part; users forget to climb L→P→P. Fixes:
1. **Tiered end-of-Watch hand-off.** The end-of-Watch CTA should tee up the
   NEXT RUNG, not skip to Play: Watch→"Now Learn it", Learn→"Practice it",
   Practice→"Play it".
   - **[x] DONE (2026-05-24): Watch → Learn.** LessonPlayer's end CTA was "Play
     it out against the coach" wired to Play; now it reads **"Now Learn it →"**
     and steps to Learn (`onContinueToNext` → `setViewMode('learn')` for the
     main line / `handleStartVariationLearn` for a variation tab). The
     jump-straight-to-Play bug is fixed.
   - [ ] Remaining rungs: Learn-complete → Practice, Practice-complete → Play
     (wire the `PlayableLinePlayer` `onComplete` to advance the ladder instead
     of exiting).
2. **Show the unfinished ladder everywhere.** Per line: `Watched ✓ · Learn ○
   · Practice ○ · Play ○` with the next rung lit. An incomplete ladder is a
   standing nudge.
3. **Training Plan resurfaces watched-but-not-learned lines** as today's reps
   ("You watched the Advance Caro — Learn it now, 3 min"). Re-entry point.
   Once SRS lands, due reps are the daily return reason.
- **Structural lever (already decided):** Watch earns only `discovered`, never
  `learned` — the system withholds "done" until they climb, so it's the nudge.
- **(David 2026-05-23) Make the post-Watch "continue playing" hand-off STRONGER
  and present on ALL openings.** Right now the continue-to-play CTA after the
  Watch tab is weak / inconsistent across openings — every opening (main line +
  every variation) must surface a prominent "keep going" hand-off when Watch
  ends (step to the next rung per item 1). Audit it across all masterclass
  openings, not just Caro.

### TODO 3b — Progressive unlock / gating (David 2026-05-22, loved it)

Make the path a LADDER with gated unlocks — three nested levels:

1. **Rung-gating (per line).** Only the next WLPP rung is live; the rest are
   greyed/locked. Watch lit → finish → Learn lights up → Practice → Play.
   Guards: (a) completed rungs stay RE-OPENABLE (forward-lock only, never lock
   backward); (b) an "I already know this — unlock all" escape per line so it
   gates the learner without trapping the expert. Default gated.
2. **Line completion → reward unlock.** Finishing a line's full ladder earns a
   **mastered star** AND unlocks that line's **model game** as the payoff
   ("You've mastered the Advance — now watch Carlsen win with it"). Reward
   teaches + feels earned.
3. **Opening completion → graduation → next opening unlocks.** Mastering all
   variations graduates the opening and UNLOCKS THE NEXT OPENING in the
   repertoire queue (amateur-frequency order). The whole app becomes a path:
   openings unlock in order → variations within → rungs within those.

**Training Plan announces every unlock** ("Practice unlocked. Next: the …c5
break drill, 3 min") — the lesson plan tells them what just opened up.

Ties to TODO 1 tiers (discovered/learned/perfected/mastery ARE the rung
states) + TODO 3 (the come-back nudges become "next unlock" prompts).

### TODO 3c — Subline gating + what unlocks unlock (David 2026-05-22)

**Subline gating — light, not the full ladder.** Do NOT lock variation tabs
behind the ENTIRE Classical ladder — it's a DEFENCE (opponent picks the line),
and the Classical isn't even most-faced (Advance 37% > Exchange 30% >
Classical 21%), so full-ladder gating leaves the user unprepared for the line
they'll actually meet. Instead:
- Gate sublines behind the Classical's **WATCH only** (~9 min, teaches the
  core ideas every variation reuses) → then tabs open.
- Unlock variations in **amateur-frequency order** (Advance first), matching
  what they'll face — not the showcase order.
- Keep the **"unlock all" escape** for a surprise line tonight.

**Completion rewards — CORRECTED (David 2026-05-25): model games are NOT a
gated reward.**
- **Model games are ALWAYS available** — never gated behind line/ladder
  completion. They render unconditionally and only self-hide when there's no
  real student-side win to show. (Supersedes the earlier "line ladder complete
  → unlock the MODEL GAME" idea.) ✅ Already how the code works
  (`ModelGamesSection` is ungated).
- **ONLY the trap/weapon lines are gated** — gems + named traps stay locked
  until the **Play** rung is complete (`areWeaponsUnlocked` = `play` done or
  "unlock all"). Don't drill the punish before you know the line. ✅ Done.

### TODO 3d — "Hidden gem" 💎 reward when a line has no trap (David 2026-05-22)

So EVERY line has an unlockable reward, no dead-ends. Reward ladder per line:
**model game (always) → trap/weapon (if real) → else a HIDDEN GEM.**

A gem = a piece of powerful, line-specific knowledge: *how to punish a common
INACCURACY by the opponent.* On-ethos because it's SOURCED, never invented —
same grounding as everything else:
- **Explorer** finds a move the opponent plays reasonably often at amateur
  level but that SCORES POORLY (a real, common inaccuracy — it shows up in the
  games the user will actually face, not a textbook curiosity).
- **Stockfish** confirms the punishing reply is genuinely best/winning.
- **chess.js** validates the line.
- Shape: "When White plays the lazy [common inferior move] here, punish with
  [engine-confirmed reply] — you're already better." Gate it on Stockfish
  soundness, like the rest.

This is the playbook §7 "exploit inaccuracy" idea repackaged as the per-line
unlock — and arguably MORE useful than a trap (traps are rare; inaccuracies
are everywhere, so every line yields at least one gem). Builder task like the
model games: query the line's key positions for a frequent-but-inferior
opponent move + the engine-best punish, author the insight.

### TODO 3e — THE BIG ONE: systematic "punish the inaccuracy" generator (David 2026-05-22, lightbulb)

David's realization: the hidden-gem mechanic IS a content-generation ENGINE
for trap-style material on EVERY line — not just a per-line reward. Named
traps (Qe2 Nd6#) are the rare hand-authored case; this is the systematic case
that scales to every line + every opening automatically.

**The method — two DBs, two jobs:**
- **Amateur explorer → find the bad move they actually play.** Common at the
  user's level BUT scores poorly FOR THE OPPONENT (low opp win-rate /
  Stockfish-inferior). A real inaccuracy you'll meet, not theory.
- **Masters explorer + Stockfish → the crush.** The verified strong response
  that punishes it; chess.js validates the line.

Output: a mined "gem" / mini-trap per line — "when White plays the lazy
[common inferior move], punish with [engine-best reply], you're better."
Scales because every position has a common bad try.

**On-ethos guardrails (so it's grounded, never invented):**
1. "Scores poorly" measured from the OPPONENT'S side (their win-rate /
   Stockfish eval), not gut feel.
2. Punish must be Stockfish-CONFIRMED winning for the student.
3. Frequency FLOOR — the inaccuracy must be commonly played (skip 0.3%
   blunders nobody makes).

Builder shape (like add-caro-model-games.mjs): walk the line's branch points,
query amateur explorer for frequent-but-inferior opponent moves, attach the
masters/Stockfish-best punish, gate on engine soundness → candidate gems for
review. This generalises trap content to all 40 openings without hand-
authoring each.

---

## ⭐ PRIORITY UPDATE (David 2026-05-22, emphatic — "absolute must, fix as soon as data resets")

David's #1 want, the reason the course always had a "trap" section: **TODO 3e
— the systematic punish-the-inaccuracy generator.** Build it FIRST next
session (it's a contained builder like add-caro-model-games.mjs, faster than
the full SRS build, and it's the feature he's been trying to articulate).

Revised next-session order:
1. **TODO 3e — punish-the-inaccuracy generator** (amateur DB finds the common
   bad move → masters + Stockfish crush it → gem/mini-trap per line). THE must.
2. **SRS** (retention — makes it stick).
3. **Opening #2** (needs David's repertoire).

---

## ⭐⭐ DIRECTIVE — RESTRUCTURE THE ENTIRE WEAPON SECTION (David 2026-05-22)

"This was the whole point to me building this app." The weapon section is
being REDEFINED around the systematic punish-the-inaccuracy engine (TODO 3e),
not around famous named traps.

**Old model:** weapons = hand-authored famous named traps (Qe2 Nd6#, etc.) —
rare, most openings have few/none, section often empty.

**New model:**
- **PRIMARY = mined "punish the inaccuracy" gems (TODO 3e).** Every line gets
  "here's the common mistake your opponent actually makes, here's how you
  crush it" — amateur DB finds the frequent-but-poor move, masters+Stockfish
  confirm the punish, chess.js validates. Scales to every line / every
  opening. This is the SPINE of the section. It's never empty again.
- **Named traps = the rare jewels layered ON TOP** (Qe2, Légal's, Fishing
  Pole…) — kept where real, but no longer the *definition* of weapons.

**Build implications:**
- Data model: a generated-gems store/file (mined inaccuracy → punish line +
  insight + freq + engine eval), alongside the existing hand-authored
  *TrapLessons.ts named traps.
- Weapons-section UI: gems as the default list, named traps highlighted.
- **Playbook §3 (weapons rules) must be REWRITTEN** when this lands — it
  currently assumes hand-authored-only. Update the doctrine to: gems primary
  (generated + gated), named traps as the curated overlay.
- Pairs with / built on TODO 3e (the generator). 3e is the engine; this is
  the section rebuilt around it.

This is the #1 architectural priority alongside 3e — David's core vision for
the app.

---

## TODO — Pro model games: source proper per-opening models (David 2026-05-24)

The pro repertoire opening sections render model games via `ModelGamesSection`
(opening-level). An audit found the pro model games did NOT reliably match the
pro + the line: 25 games were the WRONG OPENING for their section (Ruy games in
Italian/Scotch sections, KID in Grünfeld, Nimzo in Catalan/QGD, etc.) — those
were **stripped** (commit on branch `claude/jolly-galileo-FqH02`). Now source
**1 proper model game per opening** — featuring the named pro, in the correct
line, and (where the section implies a side) showing that side doing well.
Sourcing rule (playbook §0.7 STEP 7): REAL games only, never fabricate a PGN;
web-identify then get the PGN from a fetchable source or David.

**SOURCING IS NOT BLOCKED — there's a local cache (David 2026-05-24).**
`docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json` holds **2,000 real
games (10 pros × 200)** with full PGNs, fetched from the chess.com + lichess
game APIs by `scripts/fetch-pro-games-local.mjs`. The pro model games were
fuzzy-matched out of it (`curate-pro-games-fuzzy.mjs`). So re-curation is a
local-cache + name/line-match problem, NOT "David must provide." Re-fetch more
(or other pros) by re-running `fetch-pro-games-local.mjs` (those APIs are
reachable). Caveat: the cache covers each pro's RECENT ~200 games, so a pro who
doesn't currently play an opening has no game for it — that section stays empty
(correct; empty > wrong-line). The remaining manual part is **narration**
(cached games are raw PGNs → author overview [+ critical moments]).

**RE-CURATED from the cache (done 2026-05-24):**
- `pro-caruana-italian` ← Caruana 1-0 Naroditsky, Italian Two Knights (C55), narrated.
- `pro-niemann-grunfeld` ← Niemann 0-1 (Black win), Grünfeld Exchange (D85), narrated.
  (Top-rated candidate was a Torre Attack mislabel — skipped, used the real D85.)

**STILL EMPTIED — no winning game for the pro in the cache → stay self-hidden
until a broader fetch or a real game turns up (do NOT force a wrong-line match):**
- `pro-naroditsky-scotch` — Naroditsky has no Scotch win cached (plays d4/QP).
- `pro-gothamchess-italian` — 0 Italian games cached.
- `pro-hikaru-scotch` — only a Black loss cached.
- `pro-firouzja-italian` — only Black/draw cached, no White Italian win.
- `pro-firouzja-grunfeld` — cache has him as White vs Grünfeld, not playing it as Black.
- `pro-niemann-anti-marshall` — 0 anti-Marshall games cached.
  → These pro-opening SECTIONS may be claimed-but-unplayed repertoire lines;
  consider whether they should exist, or fetch a wider game set.

**REDUCED — 1 left (a mismatch was removed; verify the survivor + consider a 2nd):**
`pro-carlsen-ruy-lopez`, `pro-carlsen-catalan`, `pro-carlsen-berlin`,
`pro-caruana-qgd`, `pro-caruana-catalan`, `pro-dubov-catalan`,
`pro-dubov-tarrasch-defense`, `pro-dubov-scotch`, `pro-praggnanandhaa-catalan`.

**STILL OPEN (separate passes, not done in the strip):**
1. **De-dup right-family copies.** The same game is reused across several of a
   pro's sections (e.g. one Caruana Ruy game sat in anti-berlin + berlin +
   ruy-lopez; a Gotham Ponziani in italian + ponziani). One game per section.
2. **Pro-presence.** At least `pro-naroditsky-jobava-london` features
   Jobava–Mamedyarov with NO Naroditsky — the model must feature the pro (or be
   re-scoped). Audit every section for "is the named pro actually a player?"
   (handle map: Carlsen=MagnusCarlsen, Caruana=FabianoCaruana, Firouzja=Firouzja2003,
   Gotham=GothamChess, Naroditsky=DanielNaroditsky, Pragg=rpragchess, Dubov=Duhless,
   Niemann=HansOnTwitch, Nakamura=Hikaru, So=GMWSO).
3. **Narration bar.** Most pro games are templated-overview + 0 critical
   moments (thin). Per the "no thin-narration ships" doctrine, author a real
   overview + critical moments, OR gate so only narrated games surface
   (mirrors gems' `isSurfaceableGem`). (This was the in-progress filter/gate
   work — paused 2026-05-24.)

---

## ⭐ REMAINING TRACKS (David 2026-05-25, after the cohesion-loop work shipped)

The app-cohesion training loop is done + merged. David's read on what's left:
**(A) finish the opening masterclasses, and (B) the pro-repertoire model-game gap.**

### A. Finish the opening masterclasses
Build the remaining masterclasses to the LOCKED keystone standard
(`docs/opening-masterclass-playbook.md` §0.5 — author the data, the wiring
lights up). Each = main line + variations (all validated lines) + per-variation
model games (student-side WINS) + gems/traps + plans + quizzes + narration
(two registers, sourced). The bigger track.

### B. Pro-repertoire completeness — WALKED 2026-05-25
Walked all **14 pros / 82 opening entries**. **Text content is 100% complete**
(every entry has overview + 4 key ideas + variations with explanations). The
**only gap is model games: 46/82 have one, 36 are missing.** (Traps are sparse
by design — empty > forced — NOT a gap.)

**The 36 missing a model game, by pro:**
- **Akeem** — Italian, Scotch, King's Gambit, Caro-Kann (all 4)
- **Hikaru** — KIA, Scotch, London, Najdorf, KID, Benko, English (7 of 8; only Nimzo has one)
- **Gukesh** — Italian, Catalan, Najdorf (all 3)
- **Eric Rosen** — London, Stafford, Englund (all 3)
- **Samay** — Italian, Najdorf, Nimzo (all 3)
- **Naroditsky** — Scotch, Vienna, Semi-Slav
- **Carlsen** — English, Sveshnikov, QP London
- **Anna Cramling** — London, The Cow
- **Firouzja** — Italian, Grünfeld
- **Dubov** — Modern Benoni, Dutch
- **GothamChess** — Italian, Rossolimo
- **Caruana** — Petroff
- **Niemann** — Anti-Marshall
- **Praggnanandhaa** — ✅ none (fully complete)

**Fill path (sourcing reality, per the section above):**
- The 10 cached pros: fuzzy-match a real pro-WIN in the correct line out of
  `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`, then author
  overview + critical moments. A pro with no cached win for an opening →
  the section correctly **self-hides** (empty > wrong-line); not all 36 are
  fillable.
- The **streamer pros (Akeem, Samay, Gukesh)** likely aren't in the 10-pro
  cache → need a fresh `scripts/fetch-pro-games-local.mjs` fetch, or they stay
  model-game-less (section just doesn't render).
- Never fabricate a PGN; templated overviews are filtered by `isNarratedModelGame`.

Audit walker: `/tmp/pro-audit.cjs` (ad-hoc; re-derive by walking
`pro-repertoires.json` openings + cross-referencing `model-games.json`).
