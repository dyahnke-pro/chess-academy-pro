> **LIVE PLAN (2026-09-18).** Read AFTER CLAUDE.md (level I) and `docs/STATE.md`
> (level II, generated — it carries the numbers this file only names). The
> nav-capture plan that used to sit here landed 2026-09-12 and is archived at
> `docs/plans/2026-09-12-nav-capture.md`; the unified-coach build is
> `docs/plans/2026-09-15-one-coach-need-selector.md` (N0–N7 built).

# PLAN — closing the loop (2026-09-18)

## 🧹 WO-CLOSEOUT-01 — one session, code first, one push, one audit (David 2026-09-20: "yes, thank you. can you take the second list first?")

Everything on the open list that is code I own and needs no decision from David.
NOT here: #21's wedge (other session), GREEN (needs held evidence over days),
David's calls (Upstash, archived danya notes, spend-guard design), D9b/D15
(blocked on data / unknown root).

1. **Section-14 detectors** — `calculation-depth` → `left-book-early` →
   `no-plan` get pipeline WRITERS on the recording path, fed by the evidence
   computers that already exist (`criticalityScan` gapCp, `theoryDeparture`,
   `planRace`/`deriveNextPlans`), so the 23% `other` fallthrough shrinks and the
   loop's recurrence sentence has something to name on pawn pushes and king
   moves. Measured before/after on the 47-game corpus where present.
2. **Critical moment T1 + T3** — review scans flagged plies too and the REGISTER
   decides; Learn hands its announced plies to the sweep so a prompted find
   records `prompted: true`.
3. **Learn's half on a prod tape** — `audit-second-game-memory-prod` asserts the
   present-tense recurrence clause (one mount, two games).
4. **D11** — couple squares on the `[delta]` facet so stacked generators subsume.
5. **Hygiene** — pre-push hook honours the ship-check watermark; ship-check
   prints timeouts vs assertions; lint crash named as crash; test type-error
   ceiling; `BuildVersionWidget.test`; stale-tactics leftovers
   (`tactics-context-stale` count, `formatTacticsSubBlock` fen); multilingual
   lesson row vs probe.
6. **Measure-first, numbers only** — entry chunk contents/parse, the 57k
   no-position notes' reach, corpus gate unevenness, the 47-game rerun, the
   fundamentals-tab audit on prod. Decisions after, David's.

Order: 1 → 2 → 4 → 5 → 3 (audit) → 6 (measurements) → gates → ONE push → the
loop audit + the standing pair + the second-game audit, sequentially, behind the
shared lock.

**LANDED (code, one session — every item below is gated and typechecks clean):**
- ✅ 1. **Section 14** — `calculation-depth` (PV-gated: the blow lands on the
  opponent's third move or later), `left-book-early` (DB-anchored, G3, not
  before ply 6), `no-plan` (positional; yields to every concrete fundamental)
  are FUNDAMENTALS, so they flow through the spine, `matchFundamental`, the
  `[principle]` facet and the recurrence clause. Every `Record<FundamentalId,…>`
  answers for them. Gate `principleAttribution.section14.test.ts`.
- ✅ 2. **T1** — the review's critical scan covers every student ply past the
  opening; the REGISTER decides; the only exclusion is the double-stop guard at
  the card's mount. Gate `criticalMomentReach.test.ts`. **T3** — Learn keeps the
  plies where the deciding computer kept a `key-moment` clause
  (`announcedPliesRef`), saves them as `GameRecord.promptedPlies`, and the
  review's capture marks those capability rows `prompted: true`. Gate
  `promptedFind.wire.test.ts`.
- ✅ 4. **D11** was already done — `computeBoardDelta` couples squares per clause
  and `reviewFullData` re-keys them onto the `[delta]` facet (the PLAN entry was
  stale). Nothing changed.
- ✅ 5. **Hygiene** — the other session had already landed 11a (timeouts vs
  assertions), 11b (hook honours the watermark) and 11c (lint crash named) by the
  time this ran. Landed here: 11d — 🔴 **I MEASURED 0 AND IT WAS A CRASH.** A bare
  `npx tsc -p tsconfig.tests.json --noEmit` dies on the default heap and prints
  ZERO `error TS` lines, which reads exactly like a clean run; I lowered the
  ceiling to 0 on that reading. Re-measured with
  `NODE_OPTIONS=--max-old-space-size=8192`: **236**, the number the other
  session had already measured and set the same night. The ceiling stays 236
  (down from 296, their 60 fixture fixes). The trap is documented IN
  `ship-check.mjs` directly above the constant and I walked into it anyway —
  never read a tsc count without the heap flag. Also landed:
  `BuildVersionWidget.test` regex; `formatTacticsSubBlock(tactics, boardFen)` —
  the board fen is REQUIRED and a stale package renders nothing + audits
  (`formatTacticsSubBlock.stale.test.ts`); the multilingual lesson row polled
  `.first().isVisible()` on a comma-joined locator once after a fixed sleep, so a
  hidden kickoff shell masked a visible `teach-nav-row` — it now asks each
  selector every second for 40 s (the paired probe's method).
- ✅ 3 (instrument). `audit-second-game-memory-prod` gained rows E0/E1: game 1
  RECORDED a fundamental live, and game 2 SPOKE "You've walked into this
  before…" — separate rows, E1 n/a when nothing was recorded. Runs in the end chain.
- ✅ 6. **Measurements (numbers only; the decisions are David's):**
  - **Boot payload / entry chunk** (fresh `npm run build`, 2026-09-20): boot
    preloads **15 files, 26.4 MB raw / 6.1 MB gzip**; the entry chunk is
    **8.6 MB raw / 2.4 MB gzip**. The vendors are ALREADY split out (`ui-vendor`
    518 KB, `react-vendor` 225 KB, `chess-vendor` 106 KB), so the entry is app
    code plus bundled data. Next-largest preloads: voiced 4.3 MB, puzzles
    4.1 MB, subline-narration 3.4 MB, plans 1.7 MB. **Parse time needs a
    device** — it cannot be measured offline, and it is the number that decides
    whether a `/coach/*` route split is worth anything (E.3 said measure first;
    this is the measurement, minus the device half).
  - **Corpus reach, FULL corpus loaded** (`corpusReach.measure.test.ts` →
    `audit-reports/corpus-reach.json`): across 24 repertoire openings the
    phase-transition ritual reaches **24/24** and LESSON BACKGROUND **24/24**.
    So the 57k un-positioned notes are fully reachable by name + concept once
    the floating half lands; pruning them is a MEMORY decision, never a reach
    one. (E.5's "measure both ways before pruning" — this is the after-number.)
  - **Corpus gates are even now** (E.7): G9.4 move-number prefixes, phase
    validity and id-collision-with-primary are asserted for EVERY creator in
    `secondaryTeachings.test.ts`; they were chessbrah-only. 72 tests green.
  - **47-game rerun (E/A-NEW):** `data/sources/wo4-corpus/` is absent on this
    machine, so the measurement half skips honestly. Owed where the corpus lives.
- ☐ fundamentals-tab audit on prod · ☐ `tactics-context-stale` count read off
  the listener — both come from the end chain.

**PROD RUN (bundle `index-CQzqI6Vf`, 9321bbc11, 12:45) — LOOP AUDIT 6/6, and the
cleanest comparison yet.** `AUDIT_GAME_A=nHdi6Qpx AUDIT_GAME_B=MxLHuel4
AUDIT_STUDENT=black`, report `audit-reports/loop-closes-2026-09-20T17-45-41-666Z/`.
Unlike run 5, the control and loop tapes are the SAME beat at the SAME ply (56,
28...Nf8) — identical opening sentence, identical evidence — differing only by:

> "…Loose pieces are what makes their tactic work, so defend it or move it before
> it becomes their idea. **This one keeps recurring in your games — loose piece,
> the second game now — the last one was against nescitus 2 weeks ago. Worth
> drilling.** You: that was a blunder, costing about 4.2 points…"

The A-candidate iteration also proved itself: candidate 1 recorded rows but no
fundamental, so the instrument moved on rather than reporting a false red.

🔴 **BUT SECTION 14 DID NOT FIRE ON A SINGLE REAL GAME.** Four amateur games,
nine flagged student plies between them, and every fundamental recorded was
`loose-piece` or `ignored-threat`. Worst case for the build: A-candidate 1's two
flagged plies were **15...g5 (a pawn push) and 32...Kh8 (a king move)** — exactly
the `other` population section 14 exists for — and they attributed NOTHING.
Reading the gates against those plies: `left-book-early` cannot fire (ply 30,
past the 24-ply opening window), and `no-plan`/`calculation-depth` each need a
condition those boards may not meet (an earned structure plan whose squares the
best move serves; a PV whose first forcing move is ≥3 deep). So the detectors are
GATED CORRECTLY and are TOO NARROW IN PRACTICE — unit-proven, prod-unobserved.
That is the same "a wire that does not fire is not a wire" rule the repo already
holds, and it means the 23% `other` figure has NOT been measured down.
**NEXT (not guessed — measured):** log the REJECTION REASON per detector on the
recording path (D13 already logs unmatched inputs; extend it to say which gate
each section-14 detector failed), run a game library through it, and widen from
the real population rather than from imagination.

**THE OTHER THREE AUDITS (same bundle):**
- **LEARN** `audit-concept-gameplay-prod` **8/8** — the pin invariant voiced
  mid-game, 58 spoken lines, muted, no page errors.
- **FUNDAMENTALS TAB** `audit-fundamentals-tab-prod` **18/19** — every product
  row green (the development pillar rolls up two sections, the NULL-pillar slip
  lights nothing, grey stays silent on a fresh device, the Listen button reached
  the listener). The ONE red was MINE and it was the instrument: the script
  carried `FUNDAMENTAL_COUNT = 33` and section 14 made it 36 — a constant about
  a different build. It now DERIVES the count from `FUNDAMENTAL_IDS` and throws
  rather than defaulting.
- **SECOND-GAME MEMORY** `audit-second-game-memory-prod` **10/11**, and the red
  is a real finding the row was built to separate: **E0 ✅ game 1 RECORDED
  `tempo-handed` live; E1 ❌ game 2 never spoke the recurrence clause.** Read
  the tape before blaming the wire: **game 2 spoke 44 lines and NOT ONE was a
  fundamental verdict** (game 1 spoke two). So the clause had nothing to ride
  on — this is Learn's FUNDAMENTAL NARRATION not firing in the second game, not
  the recurrence wire dropping anything. E1 now has three outcomes (not owed /
  the narration never fired / the wire dropped it) so it can never again fail
  the product for an empty set.
  **OWED, and it is the Learn half of the loop:** find why
  `learnFundamentalVerdict` produced nothing across 17 plies of game 2 while
  game 1 spoke two. Suspects, in order: the backward-look (`look`) is null so
  the whole line including the verdict is skipped; the per-game
  `fundamentalSeenRef` is NOT reset between games (it is a bare `useRef`, not a
  `learnMemory` slot — the exact debt #18 documented for the threat refs); or
  game 2's slips simply attributed nothing. The second is checkable by reading
  one line and is the likeliest.

**RE-RUNS, both green, both earned:**
- **FUNDAMENTALS TAB 19/19** with the derived count (36).
- **SECOND-GAME MEMORY 12/12 — LEARN'S HALF OF THE LOOP IS PROVEN ON PROD.**
  Game 1 recorded `ignored-threat` + `greedy-pawn-grab` live; game 2, on the
  SAME mount, spoke:

  > "Here's how: Their move first, always. Before you look for your own idea,
  > answer what their last move threatens… **You've walked into this before —
  > ignoring a threat, the second game now.** That eyed the pawn on d4, but the
  > knight on f3 holds it…"

  So both registers of the recurrence computer are now demonstrated on the live
  bundle: review (retrospective, names the prior game) and Learn (present tense,
  mid-game). 🔴 **Say plainly what this green is NOT:** it happened WITHOUT the
  fresh-game reset fix below, which was uncommitted at the time. The first run's
  red was not the recurrence wire — it was game 2 speaking no fundamental
  verdict at all — and that outcome is INTERMITTENT, which is the finding.

**🔴 FOUND BY THE RED, FIXED AT THE ROOT: two fresh-game doors, two different
lists.** A new Learn game arrives either because the student ASKS for one or
because the BOARD returns to the start. The ask-door cleared TWO per-game refs;
the board-door cleared EIGHT. So a session's second game could inherit game 1's
`fundamentalSeenRef`, get every fundamental back as its SHORT repeat stem
instead of the full teaching, and with it lose the recurrence clause (which
rides the first-time verdict). It only shows when the ask-door runs alone — the
board-door usually fires too and masks it — which is exactly why one run was red
and the next green on one build. `resetPerGameMemory()` is now the single door;
gate `oneFreshGameReset.test.ts` blames by statement (exactly ONE
`newGame()` call site, inside the reset, and every hand ref named in it), so a
second list cannot be written. Same disease as #18, one door along.

**Status:** plan ✅ · context ✅ · code ✅ · gates ✅ · push ✅ ·
**audits: loop 6/6 ✅ · Learn 8/8 ✅ · fundamentals-tab 19/19 ✅ ·
second-game 12/12 ✅** — WO-CLOSEOUT-01 closed.

## 🎯 WO-LOOP-01 — PROVE THE ONE-LINE DEFINITION ON PROD (David 2026-09-20: "i want to get the main concept of the app working" → "full plan mapped out. then execute it. all code done first in one go, then audit following")

**The concept:** the coach learns you, and what it learned changes what it says
next. Every half of that loop is built and gated IN ISOLATION (record → spine →
ranker → narration → drill → evidence). Nobody has ever shown a real student's
SECOND game sounding different because of their FIRST. That demonstration is the
main concept, and it does not exist. This WO builds the one wire that is still
missing and the one instrument that measures the whole sentence.

**Scope, stated so it cannot creep:** the RED direction only — "you keep doing X,
so I name it and teach it harder". GREEN ("you got better, so I go quiet") needs
repeated held evidence and is not provable in one session. Out of scope and owned
elsewhere tonight: #21 (another session, `stockfishEngine` / `gameAnalysisService`
/ `engineLifecycle` / the census tool — NOT touched here).

**Phase 0 — this plan (committed locally first; pushed WITH the code, once, so the
other session's running audits do not eat a mid-run deploy).**

**Phase 1 — context (all four levels, before a line of code).**
I: the foundation (the loop, capability parity, algo-based). II: this file —
A-NEW landed the spine rows (`fundamental:<id>`, with provenance) and left
`matchFundamental` with ZERO production callers; E.0 measured the recording
half's coverage gap (attributePrinciples attributed none on 06wNUWaA). III:
`surface-map.mjs --changed` on every file touched. IV: read `coachFeatureService`
at the fundamentals-first site (~:1697), `seenFundamentals` (~:1177),
`attributePrinciples` (~:1441), the aggregate (~:4281); `weaknessSpine`
`aggregateFundamentals` + `WeaknessProvenance`; `weaknessSignal.matchFundamental`;
`positionFacts:565` (Learn's spine join); `reviewFacetRank` ranks; the review
audit's game seeding + listener helpers; `audit-fundamentals-tab-prod`'s Dexie
seeding.

**Phase 2 — code, all at once.**
1. **ONE computer, `src/services/recurrence.ts` (leaf):** given the spine signals
   and a `FundamentalId` (or a tactic pattern id), return
   `{ count, games, lastMet: { opponent, daysAgo } | null, ordinal }` from the
   `fundamental:<id>` row's count + provenance — or null when the row is absent
   or count < 2. Null is silence; nothing is invented. Deterministic, no rating,
   no LLM. Gate: `recurrence.test.ts`, negative-controlled (no row → null;
   count 1 → null; unknown id → null; provenance-less row → count without
   `lastMet`).
2. **REVIEW consumer (the owed A-NEW wire):** at the fundamentals-first site,
   when the ply's attributed fundamental has a recurrence, the lead sentence
   gains it — "This recurs for you: your third loose piece across two games —
   you last met it against Svidler, 17 days ago." Phrasing ROTATED on the ply
   (`rotateStem`), facts fixed. Ranked through the existing door, never a new
   branch; the retrospective register.
3. **LEARN consumer (capability parity — name the sibling):** the live lane
   already boosts on `matchTacticPattern` / `matchClauseKind` at
   `positionFacts:565`. Where that join fires on a spoken fact, the same
   computer appends the recurrence clause in the present-tense register ("you
   have walked past this pin twice before"). Same computer, two registers, per
   the two-register law.
4. **THE INSTRUMENT, `scripts/audit-loop-closes-prod.mjs`** (3-instrument,
   muted, vacuity-checked, real pipeline): CONTROL — fresh device, seed real
   game B unanalyzed, open its review, capture every narrated line. LOOP —
   fresh device, seed real game A (a game whose student drops a loose piece),
   open its review and let the sweep RECORD (assert the `misconceptionTags` row
   with `fundamentalId` landed — RECORDED is its own row, separate from
   SPOKEN), then seed game B and open it. Rows: A recorded; the spine carries
   the `fundamental:<id>` row; B's tape DIFFERS from control at the concept
   ply; the recurrence sentence names a count ≥ 2 and a real game; every other
   ply identical (the delta is the loop, not noise); muted. Prints both tapes.
   Registered in AUDIT_INDEX + the CLAUDE.md matrix.
5. **Gates:** unit gates above; `coachFeatureService` gate that the recurrence
   clause appears only with a recurrence (negative control: fresh profile →
   the old sentence, unchanged).

**Phase 3 — the local gates, then ONE push.** Touched-suite vitest, `npm run
typecheck`, lint on changed files, `surface-map --changed` + `--verify`,
`state-of-build --verify`, `audit-vacuity-check` on the new script. Commit all,
merge origin, push once, poll the bundle for the new script's chunk.

**Phase 4 — the audit, sequential, nothing beside it, after the other session's
audits are idle:** `audit-loop-closes-prod` (control then loop), then the
standing pair (Learn, review). Report the TAPES, not the row count.

**The fork that ends the session honestly:** if phase 4 shows game A RECORDED
and the spine row present but B's tape does not change, the wire is not the
sentence — it is the deciding computer's need term, and that is a second
session. The instrument will say which world we are in; the plan does not guess.

**Phase 1 finding that reshaped the build:** the recurrence COMPUTER already
existed — `misconceptionCallbacks.recurrenceClause`, wired into ONE path (the
causal-chain lead) and no other. So the code is a wire, not a new computer, plus
two defects the wire exposed: (a) the count was in ROWS, so two loose pieces in
one game read as "recurring in your games", and whether this game's own swept
rows counted depended on timing — now counted in GAMES via `WeaknessSignal.games`
(distinct provenance, newest first) and `recurrenceFor(signal, currentGameId)`;
(b) `weaknessSignalLoader.invalidateWeaknessSignals` had ZERO callers, so a slip
recorded by the sweep did not reach the next narration for five minutes — the
writers (`misconceptionService`, `mistakePuzzleService`) now emit on a leaf event
(`weaknessModelEvents`, imports nothing, so no cycle through `weaknessSpine`) and
the loader + Learn's hook listen. Both consumers share `fundamentalRecurrence.ts`.

**PHASE 4, RUN 1 (bundle `index-BucBq3e3`, 02:17–02:46) — THE INSTRUMENT FOUND THE
ROOT.** `audit-loop-closes-prod` 4/6, verdict PAIR UNUSABLE, and it was right to
refuse: **neither game got a single misconception row from the sweep.** Learn
8/8 on the same bundle. Read, not guessed: the review page's first open runs
`analyzeSingleGame`, which writes the annotations, stamps `fullyAnalyzed: true`
and returns. The misconception/puzzle/tactic sweep (`generateInsightsForGame`)
was a CLOSURE inside `analyzeAllGames` — the BATCH path only — and the batch
skips a game already stamped analysed. The review's own capture component is a
BUTTON ("Add this game's mistakes to your weaknesses"). So a game a student
first met in review — the most common path — was never recorded into the
student model. The coach diagnosed the loose piece out loud and remembered
nothing. This is the one-way-wire disease at the loop's FIRST hop, and no gate
could see it because every recorder was unit-tested through the batch door.
(Second, smaller: `determinePlayerColor` never read `GameRecord.studentSide`.)

**FIX (run 2):** `generateInsightsForGame` hoisted to ONE exported door, called by
both batch sites and by `analyzeSingleGame` after it writes (habits only on the
full-depth pass; every recorder guards its own game, so sweep-then-deepen does
not double-record). `determinePlayerColor` honours the declared seat first. Gate:
`gameAnalysisService.records.test.ts` — a real row comes OUT for a review-shaped
game, idempotent, negative-controlled, and the review path calls the door. The
audit now prints, for each game, what the engine FLAGGED beside what the sweep
WROTE (so "nothing to record" and "the sweep never ran" can never be confused
again), iterates B candidates until one shares a fundamental with A, and sources
LOSING games first (a GM who won has nothing to record).

**RUN 2 (bundle `index-FRb8wK0Z`, 96f49e2e6, 03:45) — THE RECORD HALF FIRES ON PROD.**
`AUDIT_GAME_A=HSJKsqHS` (Svidler–Carlsen, student Black): the engine flagged
24...Nf4+ a blunder, and the sweep wrote **1 misconception row, `loose-piece`,
from the review's first open** — row A ✅. Before the fix that was 0 on every
review-first game the app has ever analysed. Then the pair: three GM games for B
gave Black no second loose piece (0, 0, and 2 flagged king moves that attributed
NOTHING — the E.0 `other` gap, n=3 now) → row P ❌, verdict PAIR UNUSABLE, the
recurrence sentence still unproven on prod. The instrument named the reason: **GM
games are the wrong population.** Run 3 sources AMATEUR games (explorer
`source=lichess`, 1600–2000 blitz/rapid, `recentGames`, losing side first) —
the app's actual users, whose games carry the fundamentals this measures.
`AUDIT_SOURCE=masters` keeps the old population.

Also seen twice tonight, recorded for #21's owner (the other session): the review
audit WEDGES on the reopen after the dive with the multi engine demoted cleanly
to single (no storm, workers=1) and the walk never leaving ply 0 — node at 0%,
Chromium at 100%, 50 min. That is the "wedge behind the storm", n=2 (their run
+ mine, game jMVMo1Ua). Not this WO's file; the standing review re-run is owed
once it is fixed.

**RUNS 3–4 (amateur games, 04:37 and 04:48) — the instrument found THREE more
things, two of them product.** Run 3: amateur sourcing works (B recorded
`loose-piece` + `ignored-threat` from its own review), but A's three flagged
plies — two pawn pushes and a king move — attributed no fundamental (the `other`
gap, n=4 tonight). Run 4, A pinned to the game known to record loose-piece:
**A recorded, the pair shared `loose-piece` + `ignored-threat`, and B's beat at
28...Nf8 carried the verdict ("Your rook on c8 hangs after this") and NO
recurrence clause.** Reproduced offline with every hop named
(`loopCloses.review.integration.test.ts`, real code, no mocks):
1. INSTRUMENT — the pinned A was not excluded from the pool, so B candidate 2
   was A's own PGN under a second id. Fixed; a game can never be paired with
   itself.
2. PRODUCT — the spine's game index used `conversionDetector.resolvePlayerColor`,
   one of FOUR seat resolvers of that name, and the only one that read
   `GameRecord.studentSide` was `playerIdentity`'s. So a review-first game with
   no stored username had a known game and an UNKNOWN opponent — the clause
   could never say "against X". All four read the declared seat first now; gate
   `seatResolversReadDeclaredSeat.test.ts` blames by statement so a fifth cannot
   skip it.
3. PRODUCT, the one that mattered — `isReviewUncapped()` is TRUE by default, so
   every shipped review beat is composed from FACETS (`computeMoveFacets` →
   `[principle] <verdict>`); the capped fundamentals-first block I wired never
   runs for a real student. The unit test passed because it passed
   `uncapped=false`. The clause now rides on the `[principle]` facet in the
   uncapped path — one claim, one facet, so selection sees one fact. Gate: the
   UNCAPPED case in `coachFeatureService.recurrence.test.ts`.
Offline, the whole chain now speaks: *"This one keeps recurring in your games —
same piece twice, the second game now — the last one was against Rossi, Anna 2
weeks ago. Worth drilling."* Run 5 proves it on prod.

**RUN 5 (bundle `index-BggLa4Jm`, 4264db61c, 06:13) — 6/6, THE LOOP CLOSES ON PROD.**
`AUDIT_GAME_A=MxLHuel4 AUDIT_GAME_B=yTSxn4f7 AUDIT_STUDENT=black` (report
`audit-reports/loop-closes-2026-09-20T11-13-42-985Z/`). Game A (vs kreshtar,
2 weeks earlier): the review's first open RECORDED `ignored-threat` +
`loose-piece`. Game B (vs ionlyknowthelondon), a different game on the same
device, at 15...Nd7 — the coach SAID, and the listener HEARD:

> "Their threat first: your knight on h5 was already attacked, and this move
> doesn't deal with it — Qxh5 wins it. Here's how: Their move first, always…
> **This one keeps recurring in your games — ignoring a threat, the second game
> now — the last one was against kreshtar 2 weeks ago. Worth drilling.** You:
> that was a mistake, costing about 3.0 points — the stronger move was Nxg3…"

The control device (same game B, no game A) never said it; the clause names
A's opponent and not B's; muted. That sentence is the app's one-line definition
happening to a real amateur game on the live bundle: the coach learned the
student in game A, and what it learned changed what it said in game B.

**Honest caveats, so the next reader does not over-read a green:**
- The control's ply 30 was SILENT (not flagged in that analysis) rather than
  "the same beat minus the clause" — time-budgeted classification drift (#70,
  the other session's determinism seam is what makes the control comparison
  exact). The row's contract (clause in loop, absent in control) holds either way.
- Proven in the RED direction on the REVIEW surface. Learn carries the same
  computer (`learnFundamentalVerdict` → present-tense clause, unit-gated), but
  the standing Learn audit plays each game on a fresh mount, so the Learn half
  is proven by gate, not yet by a prod tape. `audit-second-game-memory-prod`
  (one mount, two games) is the instrument to extend for that.
- It took five runs because the instrument kept finding real things: the
  review path never recorded (fixed), GM games have nothing to record (amateur
  sourcing), a game paired with itself (fixed), an unknown opponent on a known
  game (four seat resolvers, fixed), and a wire on the path prod never runs
  (uncapped facets, fixed). Each is gated so it cannot come back.

**OWED, ranked:**
1. The `other` attribution gap is now the loop's ceiling: n=5 tonight of a
   flagged student ply (pawn pushes, king moves) attributed no fundamental, so
   the coach records "a mistake" and can never say what recurs. Section-14
   detectors (E.10) — `calculation-depth` → `left-book-early` → `no-plan`.
2. Learn's half on a prod tape (above).
3. GREEN: the loop can only get LOUDER tonight. `capabilityEvidence` holds the
   held/broken rows; the ranker's quiet direction is the next build.

**Status:** Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · **Phase 4 ✅ — 6/6 on prod**


## THE CRITICAL MOMENT — one computer, two registers (design, 2026-09-18)

David: "I want the only question to come at the critical moment. That is where
the teaching has most effect." → "This will also take place in review." →
"In learn, I want coach to say, this is a critical moment only one move keeps
equality. On review, we are more free to ask questions. No question on learn,
question on review." → "maybe say how many moves keep equality? Algo that for
users."

### What already exists (measured, not recalled)

- **The critical moment is computed on every live ply.** `severityFromGap(gap12,
  rating)` in `positionFacts` → `'critical' | 'only-move'`, from the MultiPV fan,
  rating-scaled. It already reaches `coachDecider` and ranks 65 / 85.
- **Learn already announces it**, and already says different things at the two
  severities (`positionFacts` ~886). It is gated on `studentToMove &&
  a.slowDownOwed`, so a student whose slow-down habit is CLOSED hears nothing —
  already algo-based. What it lacks is the STAKE.
- **`scanCriticality` (the full scanner) has ONE production caller**
  (`onlyMoveSequence`). The live lane derives severity itself from the top-2 gap.
- **Review already has a question card** — pick, reveal, judge, all wired.

### The defect this fixes

Review's question is selected by SWING, not criticality:
`buildTurningPointQuestion` → `turningPointCandidates(...)` → biggest single
swing in pawns, asked once at the END of the walk.

Swing is what it COST; criticality is how much the CHOICE mattered. They come
apart exactly where teaching is best: a position where the student FOUND the
only move has a swing of ZERO, so it can never be the question — and that is the
most instructive moment in the game. On the So–Carlsen draw (2026-09-18 audit)
the card never fired at all: "fewer than 2 costed moments", on a GM draw full of
real forks. This is CLAUDE.md's own importance doctrine, failure mode #1
(sharp-but-flat), living in the review question.

### The build

**ONE computer: how many moves still hold, and what they hold.**

1. **The count IS the trigger — one tolerance, not two.** Count the fan's moves
   scoring within tolerance of the best: `>=3` nothing hinges (SILENT), `2` a
   forgiving fork, `1` only one move holds. Measured 2026-09-18 on real games:
   only-one-move and critical came out 5/5, 24/25, 29/30 — the trigger and the
   count are the same question, and treating them as two was my error.

   🔴 **THE PERSONAL cp-LOSS TOLERANCE IS DISPROVEN — DO NOT BUILD IT.** The
   design here previously said the tolerance should be a robust statistic of the
   student's own per-ply cp-loss distribution ("their own typical error"),
   derived from the `evaluation` + `bestMoveEval` already stored on every
   annotated ply. `scripts/measure-critical-moments.mjs` measured it on 6 real
   games at two rating bands (143 plies, depth 12) and it fails on both axes:

   - **it does not differentiate.** amateur ~1200 vs strong ~2000 came out
     statistically identical — p50 23 vs 23, p75 49 vs 53, p90 116 vs 106,
     mean 41 vs 42. Differentiating students was the ONLY reason to build it.
   - **it nags.** p50 fires 15x/game (every other move) in BOTH cohorts; p75
     fires 8x. The rating band fires 2.5x/game for the amateur, which is the
     right volume for "stop and think".

   So it would make the coach 3-6x chattier AND treat a beginner and an expert
   the same. The claim is deleted rather than annotated (the Lake Butler rule) so
   no future session re-derives it from the same appealing reasoning.

   (One thing it did settle: mean/median ratio 1.8x — a MEAN would have been the
   wrong statistic regardless.)

   **THE RIGHT PERSONAL NUMBER is not "how big are your errors" but "DO YOU FIND
   THE ONLY MOVE WHEN THERE IS ONE"** — press/no-press at critical moments. That
   signal does not exist yet, and it is exactly what this build creates. So the
   shape is the app's standard one and David's own words ("This is gray function.
   Once we have data it algos"): the RATING BAND is the cold-start prior, the
   answer is recorded, and the personal number takes over once there is data. A
   student who reliably finds only-moves earns a LOOSER tolerance (fewer
   positions are forks for them); one who keeps missing them, a tighter one.

2. **The MultiPV cap is a NON-ISSUE — measured, fork closed.** The worry was
   that MultiPV=3 cannot tell "three" from "seven". It cannot, and it never
   matters: we speak ONLY when the count is 1 or 2, and a count of 1 or 2 is
   precisely the case the fan resolved. The positions where 3 of 3 sit within
   tolerance (79% at the amateur band, 53% at the strong one) are exactly the
   positions where nothing hinges and the coach stays SILENT. No wider fan, no
   second engine call, no cost. Do not reopen this.
3. **The stake, computed from the eval, never templated.** "Keeps equality" is a
   claim about the evaluation: false when they are winning (it keeps the WIN) and
   false when they are lost (it promises a draw that is not there). Bands off the
   best line, mover-POV: keeps the win / keeps you on top / keeps you level /
   keeps you in it / limits the damage. Mate is its own answer, never a
   centipawn band. Omit the clause rather than claim a stake with no line to read.

**LEARN — a STATEMENT, never a question.** The student is mid-calculation; a
blocking card takes over the decision (which is why they were removed in Aug).
  "Critical moment — only one move keeps you level. Slow down here."
  "Critical moment — two moves keep you on top; everything else concedes."

**REVIEW — the same computer as a QUESTION**, asked AT that ply during the walk,
not as an end-of-game afterthought. Same count, same tolerance, same stake; only
the register differs. Retargets the existing card from swing → criticality.

**PHRASING — rotate the stem, never the claim** (David 2026-09-18: "I like the
multiple ways of saying the same thing. Keeps it less computer and more like a
coach"). The sanctioned idiom already exists in `methodBeat`: `pick(variants, v)
= variants[Math.abs(v) % variants.length]`, keyed on the PLY — resume-safe,
testable, and NOT `Math.random` (that is #67, five services still rolling).
Three or four variants per shape. The COUNT and the STAKE are facts and never
vary; only the wrapper does.

**RECORDING — DECIDED: a prompted find is GREY** (David 2026-09-18: "This is
gray function. Once we have data it algos"). When Learn announces the moment and
the student then finds the move, that is not evidence they can do it unaided, so
it writes NO `held` row. `CapabilityEvidenceRecord` gains a REQUIRED `prompted`
flag (a new writer must answer); the profile counts prompted rows as neither
held nor broken, so the tag stays GREY -> grey raises rank -> the coach keeps
teaching it. If they find it unaided later, that is a clean `held` and it goes
green on its own.

This is the heat map applied to its own evidence, and it is self-correcting: the
announcement can never inflate the model. Same shape as #34 (a chat-ask reveal
is recorded, not free).

### ✅ BUILT 2026-09-19 — WO-CRITICAL-MOMENT-01

One leaf computer, `src/services/criticalMoment.ts`, read by both registers.
`readCriticalMoment` counts the fan's moves within
`criticalityThresholds(rating).critical` of the best, mover-POV, and bands the
stake off the best line. Every number below was measured or derived, never
recalled.

**What it replaced, and why each was a defect not a tidy-up:**
- `positionFacts`'s two hardcoded key-moment sentences ("Only one move really
  holds here…" / "This is a critical moment…") said neither the COUNT nor the
  STAKE. They now come off the same fan the door grades severity on.
- `moverGap12` was a private 10-line COPY of the same fan scoring — same sign
  flip, same flat ±100000 mate, same "fewer than 2 lines" rule — sitting one
  screen from the clause that would read the other one. Deleted; it delegates.
- `MoveAnnotation` persists one line and the review pool pins `MultiPV 1`, so
  review had no fan to count at all. `DedicatedWorker.analyzeFan` +
  `scanCriticalMoments` is a real new pass, MultiPV 3, over the student's own
  plies past the book, skipping every ply the question plan already owns.

**Three findings the build produced, each a correction to the design above:**

1. 🔴 **THE REVIEW REGISTER IS NOT ONE QUESTION, IT IS THREE, AND THE DESIGN'S
   "ask at the critical moment" WOULD HAVE SHIPPED §G4.5.2's EXACT DEFECT.**
   Selecting by criticality rather than swing exists precisely to reach the
   positions where the student FOUND the only move. Asking them to find it
   again is their own success handed back as a miss they never made — the
   `Nexd4` bug, rebuilt. So the register follows the BOARD:
   `credit` (they held it → STATE it, the app's first computed green sentence
   at a critical moment), `ask` (they missed the ONE move → a real question),
   `note` (they missed a TWO-move fork → stated, because a three-chip question
   with two right answers is not a question). The MOMENT is still selected by
   pure criticality; only its register differs.
2. **A STAKELESS SENTENCE IS UNREACHABLE, so `speaks` requires the stake.**
   `stakeFor` returns null only when the best line is a mate AGAINST the mover
   — and then every line is, so they all score the flat floor, the count fills
   the fan, and the read is already unresolved. Carrying a "say the count,
   claim no stake" branch would have been dead code pretending to be a guard.
3. **`resolved`, not `count`, is the load-bearing field.** A 2-wide fan whose
   both lines hold knows only "at least two"; a BOUNDED score is the search
   saying it cut off before proving the number. Both are unresolved and both
   stay silent, with the reason NAMED (`unresolvedReason`) rather than
   swallowed — an instrument that goes quiet without saying why is
   indistinguishable from one that found nothing.

**Two corrections to my own diagnosis, recorded because a wrong reason left
standing is worse than no reason** (the Lake Butler rule applied to this build):

- I claimed the wire "could never fire on a cold device" because it sat inside
  `if (readingQuizOn)`. The audit reports disprove it — the line was spoken on
  the build where it sat inside that branch, so the setting is on by default.
  The lift out of it still stands (a critical moment has nothing to do with a
  reading-quiz preference), but not for the reason I gave.
- What was actually wrong was the AUDIT ROW plus a real product gap: the reveal
  named the move and never the COUNT, which is the one fact David asked for.
  The row demanded a count phrase the sentence did not contain, so it went red
  on a product that was speaking. Both are fixed; the count now leads every
  register, and review speaks in the past tense it should always have used.

**THE METHOD FAILURE, and the two ROOT causes behind it** (David 2026-09-19:
"Stop guessing. Root fixes. Gain context first."). Four wrong diagnoses in a row
— the card, the settings flag, the walk being frozen, then the reopen phase —
every one made from a log TAIL instead of from the code that produces the
symptom or the `report.json` that carries the answer. The report answered in
seconds the moment it was opened. Two things made the guessing possible, and
both are now fixed at the root:

- **The audit collapsed two states into one number.** `readWalkPly` returns NULL
  when the ply readout cannot be read, and the caller did `?? 0` — so "the walk
  is at ply 0" and "I cannot see the walk" printed IDENTICALLY as
  `[walk] ply 0/93`. A healthy 93-ply run was read as frozen and KILLED on that
  line. Null is now carried, said, and asserted (`WALK readout-stayed-readable`).
- **The scan was keyed on the narration OBJECT, not the game.** The background
  deepen produces a new narration for the same game; `useReviewPlayback` gates
  its own reset on the gameId for exactly this reason, and this effect was doing
  what that hook refuses to do — dropping a selected moment, clearing the
  spoken-set, restarting the scan. A deepen landing after the walk passed the
  ply left the moment unreachable and silently unspoken.

**Settled by reading, not asserting:** `readingChallengesInReview` defaults to
TRUE (`useSettings.ts:95,140`). The "off by default" claim was wrong. The lift
out of that branch stands for the real reason — a user who turns reading
challenges off must not thereby silence the critical moment.

**Recording.** `gameAnalysisService.recordPromptedFind` is the FIRST writer of
`prompted: true` in the app's history — the field has been REQUIRED since the
heat map landed and every row in the store is unaided evidence. It is a RECORD,
not yet a lever: `getCapabilityProfile` skips prompted rows, so a prompted find
changes nothing today, which is the point (the coach's own teaching can never
inflate the model it uses to decide whether to teach).

**OWED, and it needs files this session did not own.** The LEARN half of the
prompted wire is open. Learn announces the moment, the student plays, and the
post-game sweep (`GameReviewWeaknessCapture` → `autoAnalyzeGame`, line 139)
writes `prompted: false` for EVERY ply of that game — including the plies the
coach had just talked them through. Closing it means Learn remembering which
plies it announced at and handing that set to the sweep, which touches
`CoachTeachPage.tsx` (session 3's) and `GameReviewWeaknessCapture.tsx`
(unowned). Until then, a Learn-prompted find is still recorded as unaided.

**Volume, stated rather than discovered later.** Adding the count-2 case roughly
doubles the Learn statement's rate (~2.5 → ~5 per game at the amateur band,
from the 2026-09-18 census: 79% of plies are 3-of-3 within tolerance and stay
silent). It remains gated on `slowDownOwed`, so a student whose slow-down habit
is closed still hears none of it.

**Deliberately NOT changed: the door.** `judgeMoment` still grades severity from
the gap, so on an `interrupt` posture (live play) a two-move fork does not by
itself open the door — the count decides WHAT is said, importance still decides
WHETHER. On `walk` (Learn, review) every ply speaks, so there the count is the
trigger as designed. Widening the door is a separate, bigger change and was not
made as a side effect of this one.

### 🔧 TODO — what this build still owes (2026-09-19, handover)

Ordered by what a future session should do first. Each says what to VERIFY, not
just what to change — the method failure above was diagnosing without reading.

**T1. 🔴 `ask` AND `note` ARE STRUCTURALLY UNREACHABLE ON REVIEW. Fix this
first; it is a real defect, not a gap in coverage.**
Evidence, measured 2026-09-19 — all five prod runs selected `register=credit`,
never once `ask` or `note`:
```
ply 28 credit count=1 stake=on-top gap=646/649/649/671cp played=Nxe2 held  (fixture x4)
ply 18 credit count=1 stake=level  gap=526cp              played=gxf6 held  (b6Ltr4hi)
```
It is not luck. `INACCURACY_CP = 50`, and the tolerance is 100cp (intermediate),
200 (beginner), 50 (expert). A move FAILS TO HOLD exactly when it loses MORE
than the tolerance — which at every band is at or above the flagging threshold,
so it is flagged — and the scan filters flagged plies out
(`!questionPlan.has(sg.ply)`). I excluded precisely the plies the `ask` register
exists for. The only survivors are the sliver `selectReviewQuestions` itself
skips (`evalAfterMover >= 250`, a flagged move that still leaves the student
clearly winning).
Consequence: the question card, its chips, `judgeCriticalMomentPick`,
`handleCriticalPick` and `recordPromptedFind` have NEVER executed in the running
app. Unit-tested, runtime-unproven — the "a wire that does not fire is not a
wire" rule.
The fix is NOT to widen the tolerance (that changes what "critical" means).
Scan the student's plies regardless of flag, and let the REGISTER decide;
suppress only the card at a ply the question plan already stops at, so nothing
double-stops. Then prove it: the audit must assert an `ask` was reached at least
once across a run, or say plainly that no game offered one.

**T2. LEARN IS SHIPPED BUT UNVERIFIED ON PROD.** `audit-concept-gameplay-prod`
was never run this session (one audit, by request). The Learn statement's
`slowDownOwed` gate is cold-device-dependent, so a green review run says nothing
about it. ~15 min.

**T3. LEARN'S `prompted` WIRE IS STILL OPEN — needs files this session did not
own.** Learn announces the moment, the student plays, and the post-game sweep
(`GameReviewWeaknessCapture` → `autoAnalyzeGame:139`) writes `prompted: false`
for EVERY ply, including the ones the coach just talked them through. Closing it
means Learn remembering which plies it announced at and handing that set to the
sweep: `CoachTeachPage.tsx` (session 3) + `GameReviewWeaknessCapture.tsx`.

**T4. `prompted` IS A RECORD, NOT YET A LEVER.** `getCapabilityProfile` skips
prompted rows, so a prompted find changes nothing today — correct by design, and
the reason the flag exists. The lever is the design's own next step: the
personal tolerance from PRESS/NO-PRESS at critical moments (§1 above), which
needs T1 landed first because it is the `ask` path that generates the signal.

**T5. DECIDE THE DOOR ON LIVE PLAY.** `judgeMoment` still grades severity from
the gap, so on `interrupt` posture a two-move fork does not open the door by
itself; the count only decides WHAT is said once the ply speaks. On `walk`
(Learn, review) the count is the trigger as designed. Deliberately not changed
here — widening the door is a bigger change than this build, and should not
happen as a side effect.

**T6. TWO NUMBERS NEVER MEASURED ON A DEVICE.** (a) The Learn statement's
volume roughly doubles (~2.5 → ~5 per game at the amateur band, from the
2026-09-18 census), still gated on `slowDownOwed`. (b) `scanCriticalMoments`
runs on every review open — 41 plies took 9.6s on the audit box with 3 workers;
on a phone's asm.js build that is the number to watch. It already yields a
worker to the review's own dive and aborts on unmount.

### Measure BEFORE writing any of it

✅ **DONE 2026-09-18** — `scripts/measure-critical-moments.mjs`, 6 real games at
two rating bands through the app's explorer proxy, real Stockfish, no fixtures.
Results above: the cap is a non-issue, the count IS the trigger, and the personal
cp-loss tolerance is disproven.

⚠️ **Sample caveat, stated rather than buried:** 6 games, 143 plies, depth 12,
one seat, all from 1.e4 e5. The IDENTICAL distributions could be a sampling
artifact. The result is strong enough to decide DIRECTION (don't build the
cp-loss tolerance, don't widen MultiPV, keep the band until press/no-press data
exists) and not strong enough to pin a threshold. Re-run with more games and a
deeper search before tuning any number.


## 2026-09-18 — end of night: the two owed post-deploy audits

Both run against the live bundle `index-7h-hez6i.js` (commit `cb2ef99b1`),
SEQUENTIALLY, nothing else on the box.

**LEARN — `audit-concept-gameplay-prod` 8/8 GREEN.** The rating change is
verified on the surface it could have broken. Real prose off the listener:
the coach named the opening aloud ("This game is now the Scandinavian
Defense"), then spoke the computed invariant mid-GAME — *"Careful — your
queen on d5 is attacked and nothing's defending it. There's a pin here for
you — have a look. Remember — a pin freezes the piece in front: it can't
move without exposing the more valuable piece behind it."* Correct seat,
correct board, concept voiced from the live computer rather than a bake.

**REVIEW — `audit-review-overhaul-prod`.** Every PRODUCT contract passed
across 54 narrated plies (board-accuracy, seat, no-trade-win, need
coverage 11/12 owed plies, exchange ledger, perspective). The two reds were
both the INSTRUMENT, and both are fixed:

- RECAP/FUNDLEAD concluded "the engine flagged NO student ply" from the
  WALK, and RECAP hardcoded "the seeded game has two" from the days this
  audit ran one fixture. It now rotates a fresh master game each run, so a
  GM draw with genuinely zero flagged plies red-failed a healthy product
  against a constant about a different game. Both now corroborate against
  the annotation record in Dexie (`[engine record] 0 flagged student
  ply(s)`), which took FUNDLEAD red → green on proof instead of
  self-declaration.
- HEAP printed "renderer heap exploded" on a run whose heap sat flat at
  350MB and whose only trip was the worker census. It now names which of
  its three trip causes fired.

**Two findings carried forward, not fixed tonight:**
- **#21** the pthread census is the multi-threaded SINGLETON, not the pool
  (which has been single-thread since 2026-09-07), and it is INTERMITTENT —
  70 workers in one run, 1 in the next on the same game.
- **#70** the review audit's verdict is not reproducible: three runs, three
  different red sets, because the background deep dive is a race the
  harness neither waits on nor reports. A verdict that changes run to run
  makes both colours meaningless.


## The one disease behind everything landed tonight

**A computer wired ONE WAY ONLY, with prose describing the half that is not
connected.** Every instance passed every gate, because no gate can check a
comment against its code. Three found in one session:

| computer | computed | consumed | why nobody noticed |
|---|---|---|---|
| opening announcement | 5× per game | **0×** | flag spent at QUEUE time, and the late queue was nulled on most turns |
| `capabilityEvidence` green | every reviewed game | **0 readers** | `getCapabilityProfile` had 3 call sites, all in its own test |
| coach-games K=32 ELO | every boot | **0** | only `imported-games` was applied; the rest waited on a picker deleted 2026-09-02 |

When you find a doc comment describing a system, GREP FOR ITS READER before you
trust it. That is the cheapest check in this repo and it found three defects.

## Landed (2026-09-18, all on `main`, ship-check green)

- [x] `7cecd3d5c` — **level II of context is generated + verified.**
      `scripts/state-of-build.mjs` derives the state from the code;
      `--verify` runs in ship-check and fails the push when `docs/STATE.md` is
      stale. Proven non-vacuous (mutate the file → exit 1).
- [x] `37daa3a25` — **opening name: queueing is not saying.** Split
      `announcedOpeningName` into `detectedOpeningName` (context, immediate) and
      `spokenOpeningName` (written only where a voice package kept an `opening`
      fact). `hasInstantTeaching` → `noteTaughtThisTurn` (`kind === 'note'`);
      it had been nulling the whole late queue on any substantive fact.
      Prod-verified: game 2 computed 5→10, **spoken 0→10**.
- [x] `cc501a2e0` — **the heat map can lower.** `capabilityTerm` in `needScore`
      is the first term that can reduce need. GREY (absent) and RED (any
      `broken`) lower nothing; GREEN (held ≥ 3, zero broken) goes quiet. The
      ply→tag join is COMPUTED by `capabilitiesShown` — the same computer that
      writes green — so no fourth fact-to-hole mapping was authored.
      `docs/STATE.md` moved 0 readers → 2.
- [x] `53b5189c6` — **the adaptive rating never adapted.** `calibrateStrength`
      re-estimates on every boot and applies any MEASURED source
      (`imported-games` or `coach-games`); guesses (`profile`, `default`) still
      write nothing. `needsPicker` deleted; `strengthCalibrated` bridged (still
      persisted for `DashboardPage`, no longer freezes re-estimation).

- [x] `adfac7c` (**PR #938, draft — NOT on `main` yet**) — **WO-4: the two
  fundamentals taxonomies are joined and the wire is measured.**
  `FUNDAMENTAL_PILLAR: Record<FundamentalId, FundamentalPillar | null>` (total,
  explicit nulls; `piece-values` had ZERO fundamentals, now 3); the page's
  `?? ''` blank-card fallthrough is gone; the join fires on the tab. One wire
  repaired: the sweep builder dropped `evalAfterPlayed`, so `botched-conversion`
  could never record on an imported/finished game — 0 → 11 on the same 47 real
  games. Report + every number: `docs/plans/2026-09-19-wo4-fundamentals-attribution.md`.
  Audit 19/19 muted on a localhost build (prod cannot carry a branch).

## WO-3 — LANDED (2026-09-19, `a9c9376` on `main`, prod audit 8/8 on bundle `index-BeBqQixU`)

The back half of the loop — a recorded weakness becomes a drill, and the drill's
result moves the model. Three severances, every one measured before it was
touched, all fixed at once, one audit at the end (`audit-bucket-delivery-loop`,
live prod, muted).

- ✅ **S1 — the bucket audit graded a join no student reaches.**
  `misconceptionService.mapTagToDrills` had ZERO production callers; the audit
  was its only caller, so `DRILL_PLAN_EMPTY` could not fire where
  `WeaknessTagDrillPage` shows "No drillable positions yet" — the student's
  path (`getMisconceptionDrillPuzzles`) skips rows missing `bestSan` that the
  dead join kept. The audit now grades the shipped route; `mapTagToDrills` +
  `TagDrillPlan` are DELETED so there is one join. The audit's own "not a
  parallel re-implementation" header is corrected, not appended to. Gate:
  `drillJoinDivergence.test.ts`. Prod: the new S1 row fires on the exact seeded
  state — "audit and surface agree".
- ✅ **S2 — two tactic types drilled to zero puzzles.** `zwischenzug` and
  `overloadedPiece` were named; `puzzles.json` (15,000 / 72 themes) carries
  neither. Now `intermezzo` (211) and `capturingDefender` + `deflection`
  (133 / 719). `themesForTactic` is an exhaustive `Record<TacticType,…>`
  (was `Partial`) — which is how a hand census of 16 members became the real
  18 (`checkmate`, `tactical_sequence`). Dead `passedPawn` removed from
  `passed-pawn-neglected` (siblings 996 / 389 remain). Gate:
  `drillVocabulary.test.ts` RE-DERIVES the vocabulary from the corpus.
- ✅ **S3 — a solved drill never turned the heat map GREEN.**
  `recordTagDrillResult` spaced the SRS and never imported `capabilityEvidence`;
  `origin:'drill'` existed with no writer. `MistakePuzzleBoard` now records at
  the one solve door all five drill surfaces share: clean first try → `held`;
  wrong first answer → `broken` at the slip's measured cost; [show me] first →
  `prompted` (grey). STATE.md: HOLD writers 6 → 7. Gates: the spy file (4 cases)
  + a real `held` row landing in the store on a posing position.
  **Proven by unit gate, not by a prod drive-through** — the bucket audit is a
  data-invariant audit and cannot play a puzzle. A Playwright drill-solve that
  reads the `capabilityEvidence` store back is the honest next instrument.
- ✅ The audit itself: it streamed to prod's `/api/audit-stream` (G2 violation,
  the shared Upstash budget) — now a loopback discard, vacuity-checked.

**Flagged, not changed:** `removing_the_guard → 'defensiveMove'` (914) is
suspected to be the wrong Lichess theme — `capturingDefender` is literally
"remove the defender"; `defensiveMove` is closer to its opposite. A
co-occurrence check was inconclusive. Measure before touching.

## LANDED 2026-09-19 (late) — the #21 INSTRUMENT: `audit-engine-worker-census-prod.mjs` (David: "add the audit tool")

**Why an instrument and not a fix.** Reading could not name the spawner:
- the census on a CLEAN bundle (pinned `06wNUWaA`, no deploy mid-run) climbed
  5 → 41 → 76 worker targets at REOPEN, all `stockfish-18-lite.wasm,worker`
  pthreads under ONE live multi-thread parent, then fell to 14;
- PostHog for every headless run in the window: 12 multi inits (one per page
  load), exactly ONE stall + ONE forced respawn + ONE demotion — all from the
  earlier Learn run, NONE during the review reopens. So no restart loop; the
  runtime spawns pthreads inside a single engine while the app sends it plain
  `setoption`/`position`/`go`/`stop`;
- ponder is not mounted on review; the pool and dive workers are single-thread;
  no caller resizes Hash/Threads per call; `ucinewgame` is sent once at init.
- under a mid-run deploy (4 other sessions pushed while the run walked) the same
  climb reached 124 and `WebAssembly.Memory(): could not allocate memory`, with
  761k message-less page errors — the storm made real.

**FIRST TWO PROD RUNS (2026-09-20 ~00:00, pinned `06wNUWaA`, no deploy under either) —
THE SPAWNER IS NAMED.** Reports: `audit-reports/engine-worker-census-2026-09-20T04-44-41-367Z`
(census only — creation events arrive without a URL; fixed in `a48bf7d69`) and
`…T04-54-35-934Z` (attributed). What they measured:
- Census flat the whole first open and walk: 5 → 10 → 5 (1 multi engine + 4
  pthreads + 5 single-thread pool workers). Then REOPEN: **127 engine-worker
  creations, 120 of them `stockfish-18-lite.wasm,worker` pthreads of the
  multi-thread singleton, ALL inside the first 5 seconds**; peak census 126–130;
  `WebAssembly.Memory(): could not allocate memory`; only 30 targets destroyed.
- The UCI clock beside it: in the reopen phase the app sent the multi engine
  exactly TWO commands — `uci` at 0.0 s and `uci` again at 3.0 s — and never an
  `isready`, i.e. the engine never answered `uciok`; the app's crash-retry
  re-created it once. Meanwhile 19 `uci` went to single-thread pool workers
  (the critical-moment scan's `go depth 14` fan + the dive), 15 of which never
  reached `isready` either.
- So #21 is: **on the reopened review page the multi-thread engine's
  initialisation cannot allocate its shared memory, and the Emscripten pthread
  runtime storms Workers (≈120 in 5 s) while the app retries the same build.**
  First-open inits fine on the same page life; the difference at reopen is that
  the previous page's engines (multi 512 MB SAB reservation + 5 pool workers,
  `POOL_IDLE_RETIRE_MS` 60 s) are still resident when the new page inits
  another multi singleton + warms another pool. The 761k message-less page
  errors are the failed pthread starts.

**Fix directions, ranked (not built — David's call; each is a different file):**
1. `stockfishEngine`: a multi init that dies on `WebAssembly.Memory()` / never
   reaches `uciok` must DEMOTE to single (sticky, persisted) instead of retrying
   multi — `handleEarlyMultiFailure` covers `no uciok within 5s`, but the second
   `uci` at 3.0 s was still multi; find why the retry did not take the demote.
2. Bound the multi runtime's pthread pool in the glue patch
   (`scripts/ci/patch-stockfish-memory.mjs` already caps memory; a pthread cap
   belongs beside it) so a failing pthread start cannot storm.
3. Release the previous page's engines on review unmount (`releasePool` keeps
   5 warm for 60 s; the singleton is never terminated) so a reopen does not
   double the renderer's WASM reservations. Cheapest; verify it alone first
   with the census tool (row C + D go green if this is the whole cause).
Re-run `audit-engine-worker-census-prod.mjs` after any of these; rows C/D/E are
the contract.

**BUILT 2026-09-20 — all three at once (David: "all fixes at once, then audit all
at end"), pending the single end audit:**
1. `stockfishEngine.mtFloodGuard`: a MESSAGE-LESS page error (empty `filename`,
   empty `message` — the failed pthread start's shape, 761k of them) during the
   multi boot now trips the fast fallback like a `/stockfish/` one. Before, the
   guard returned early on `!src.includes('/stockfish/')`, so the storm's own
   errors were the one signal it ignored. Gate: the `#21 storm guard` case in
   `stockfishEngine.test.ts`.
2. `gameAnalysisService`: a `_liveWorkers` registry (every `DedicatedWorker`
   adds itself in the constructor, removes itself in `destroy()`) and
   `destroyAllAnalysisWorkers()` — warm AND leased, which `releasePool` could
   never reach. `DedicatedWorker.dead` makes a torn-down worker unre-poolable:
   the unload test caught a lease released after teardown resurrecting corpses
   as "warm", so the next warm spawned nothing. Gate:
   `gameAnalysisService.unload.test.ts`.
3. `engineLifecycle.ts` (new leaf): `teardownEngines()` = singleton `destroy()`
   + `destroyAllAnalysisWorkers()`, logged; `installEngineUnloadHooks()` registers
   ONE `pagehide` listener (fires on iOS Safari where `unload` does not), wired
   at boot in `App.tsx` beside `warmCoachProvider`. Gate:
   `engineLifecycle.test.ts`.
Census tool gained **row G**: snapshot the live worker target ids before the
reopen navigation and assert none survives 3 s into it — the proof the pagehide
teardown ran on the real browser, separate from row C's "the storm did not
happen". Glue pthread cap (direction 2) deliberately NOT built: measure C/D/E/G
first; build it only if the census is still red with the engines released.

**END AUDIT 2026-09-20 (bundle `index-UHuaSXZq`) — #21 is NARROWED, NOT CLOSED.**
- **CENSUS** `audit-engine-worker-census-prod` pinned 06wNUWaA: **7/7** (report
  `audit-reports/engine-worker-census-2026-09-20T05-29-48-093Z/`). Reopen peak
  **9** (was 76 clean / 124 under deploy); row G: **0 of 5** prior worker targets
  live 3 s into the reopen — the pagehide teardown works; 0 WASM errors.
- **LEARN** `audit-concept-gameplay-prod` **8/8** (`concept-gameplay-2026-09-20T05-37-18-794Z/`):
  27 spoken lines, the pin invariant voiced mid-game ("Careful — your queen on d5
  is attacked and nothing's defending it. There's a pin here for you…"), the
  drawback beat ("That eyed the pawn on a2, but the rook on a1 holds it") is
  board-true, 13 board lines gate-clean.
- **REVIEW** `audit-review-overhaul-prod` **28/32** (`review-overhaul-2026-09-20T05-54-07-263Z/`,
  Svidler B22 game). Every functional row green (fundamentals-first, thesis
  withheld until the pick, ledger, seat, board accuracy over 38 plies, critical
  moment "Only one move kept you level here, and it was king to h8", show-me,
  CRIT fan 17 plies). Reds: REOPEN (documented-stale, see the reopen-probe row),
  NEED owed-plies 9/12 (attribution gap, pre-existing), **and HEAP + ERR = #21
  AGAIN: on the reopen made right after the background deep dive the multi init
  failed, `stockfish-variant-fallback` fired ("Uncaught [object ErrorEvent] @
  …/stockfish-18-lite.js"), yet 124 `stockfish-18-lite.wasm,worker` targets stayed
  live to the end of the run and the page logged 1,549,104 message-less
  ErrorEvents.** The walk itself kept working (heap flat at 257 MB, readout live),
  so the renderer no longer wedges — but the storm is not stopped by the
  fallback's `this.worker.terminate()`.

**What the two runs together say.** The census reopen (after an idle walk; pool
already idle-retired) inits multi cleanly. The review reopen (seconds after the
deep dive, pool + leased worker just torn down on pagehide) fails it. So either
(a) `terminate()` frees memory lazily and the new document's 512 MB shared
reservation races it — the boot init at `App.tsx:430` fires 2.5 s in, and
`warmAnalysisPool` at 8 s; or (b) the failure is not memory at all — the ErrorEvent
is message-less, so nobody has read the real error yet. And separately: the
124 pthread targets surviving the parent's `terminate()` means the pthread
workers are not dying with the glue worker (nested-worker teardown), which is
why the error flood continues after the fallback.

**NEXT (in order, each is one small step):**
1. Census tool: capture the real error via CDP `Runtime.exceptionThrown` /
   `Log.entryAdded` on the pthread targets (the page-level `ErrorEvent` has no
   message); add `AUDIT_REOPEN_AFTER_DIVE=1` that waits for `review-dive-done`
   then reopens, to reproduce the review path on the pinned game.
2. `handleEarlyMultiFailure`: after `terminate()`, assert the pthread targets
   die (row: "no `stockfish-18-lite.wasm,worker` target survives the fallback
   by 3 s"). If they do survive, the glue pthread cap (direction 2) is the fix
   after all — a bounded pool cannot storm.
3. Only then consider deferring the boot init on a reopen.

**What the tool measures** (see AUDIT_INDEX): every worker target created or
destroyed (CDP `Target.setDiscoverTargets`, nested pthreads included) beside
every UCI string the main thread posts to an engine worker (a `postMessage` hook
installed before boot), and per engine spawn the commands in the 1.5 s before
it. Vacuity-checked (fails on a blank app in 0 s). First prod run: see below.

## LANDED 2026-09-19 (late) — the fundamental the computer proved reaches the ranker (A-NEW)

Chosen from the outline as the most critical open item: the coach learned
something (79 attributed fundamentals on 47 real games, shown on the tab) and it
changed nothing about what the coach says next (the spine read 0). That is the
app's one-line definition failing at the ranker, for 14 production consumers.

**Two defects, one root — both fixed in `weaknessSpine.ts`, both gated:**
1. **Every batch-analyzed slip vanished from the unified profile on BOTH sides.**
   `autoAnalyzeGame` writes each blunder as a `counted:false` misconception AND
   a `mistakePuzzle` twin at the same fen+move. The spine built its exclusion set
   from ALL misconception rows, so the twin was dropped as "coach-owned" while
   the row itself was dropped as "not counted" — since 2026-06-11. The exclusion
   set is now the rows the coach half actually represents (`counted !== false`).
   Read, then proven by the new gate (twin present once; the counted control still
   dedupes).
2. **`fundamentalId` had no reader on the spine.** `aggregateFundamentals` reads it
   over ALL rows (counted or not) into rows keyed `fundamental:<id>` — label from
   `FUNDAMENTAL_LABEL`, bucket + drill themes from the fundamental's own closed-set
   tag (`FUNDAMENTAL_TAG`, exhaustive by type), provenance attached. The tag rows
   are left exactly alone (the WO-3 double-count guard stands; `learned` was not
   flipped). Ranker joins: `matchClauseKind('fundamental' | 'structure-plan')`
   reaches them; `matchFundamental(id)` is the exact join for a caller holding an
   attributed `FundamentalId`.

**Gates:** `weaknessSpine.fundamentals.test.ts` (negative-controlled: unknown id
invents nothing; empty store → no rows; counted coach row still owns its
position); `fundamentalsPipeline.realGame.test.ts` WO-4 gate now asserts the
spine carries a `fundamental:<id>` row per attributed id with the exact count,
while `countedOnly` still totals 0. Downstream: 13 consumer suites, 120 tests,
green. `docs/STATE.md` unchanged by regeneration.

**OWED from this build:**
- `matchFundamental` has no production caller yet. The precise wire is review's
  `coachFeatureService` (it holds the attributed `FundamentalId` per ply,
  `seenFundamentals` at :1177) — "this recurs for you: your Nth loose piece",
  named from the fundamental row rather than the coarser tag. Not built here:
  narration prose in another surface's file.
- The Fundamentals TAB and the SPINE now agree by construction; rerun the
  measurement half of `fundamentalsPipeline.realGame.test.ts` with the corpus
  present to print the after-number beside the 79 → 0 before.
- G1 on the live bundle: `audit-fundamentals-tab-prod.mjs` (never run on prod
  since WO-4 merged) then the standing pair, sequentially.

## LANDED 2026-09-19 (late) — audits can never fill Redis (David: "i no longer want audits to fill redis")

**State found:** Upstash at `500000/500000` again (`/api/messages` → `degraded`,
`audit-stream` → `storage:memory`); spend guard failing OPEN until Oct 1. The 8
live entries that hour came from a real device with the stream ON (Tactics taps
at 19:52 CDT), not from audits — opt-in-off already kept audits out by DEFAULT.
David's order is stricter: the wrong configuration must be impossible.

**Built (two gates, one marker):**
- `appAuditor.isAuditMarkedPage()` — the marker every audit already sets
  (`auditMuteTts`, gated by `auditHarnessReach`; or `auditRunId`). A marked page
  streams only to the loopback sidecar or its own origin; anything else is
  refused and logged once (`audit-stream-remote-refused`, local log only).
- Every stream POST from a marked page carries `x-audit-marked`; the server
  (`api/audit-stream.ts`) stores nothing carrying it, nor anything from a
  headless UA — `200 stored:0 refused:'audit'`, no Redis, no memory buffer.
- `audit-stream-optin-prod.mjs` rewritten: opt-in proven against the SIDECAR
  (it used to post a real batch to prod every run), plus both gates asserted.
- `auditHarnessReach`: no script may set a literal non-loopback `auditStreamUrl`.
- Gates: `appAuditor.auditGate.test.ts`, `api/audit-stream.refuse.test.ts`.

**Also tonight (same session):** `pinGeometry.canLeaveLine` — a blocker does not
un-pin; the Italian Bc5→f2 pin is detected again (validator board-rescue test was
red on main). Prod audits after: Learn 8/8, review 36/36 MEETS STANDARD.

**OPEN — owed from this session, none started (2026-09-19 23:40):**
1. **Spend guard fails OPEN while Upstash is capped** (`api/_lib/usageGuard.ts`
   treats a Redis error as null → allow). Until Oct 1 there is no brake on
   LLM/TTS spend. Options: fail closed above a per-instance in-memory count, or a
   local counter fallback. Product gap, David's call to prioritise.
2. **42 audits still GET the prod stream pre/post run** (`pullStream`/
   `pullProdStream` inline per script, ~2 Redis commands per run). Reads count
   against the same 500k. Make the pull opt-in (`AUDIT_PULL_PROD_STREAM=1`) in
   one shared helper if David wants audits fully off Redis, not just off writes.
3. ✅ **VERIFIED HONEST (2026-09-19, late)** — "there's a pin here for you" after
   3.Nc3. Emitter: `CoachTeachPage` tactic lane reading `tctx.immediate`, which is
   `detectTactics(fen)` on the CURRENT board. The real detector on that position
   returns exactly one pin: "Queen on d5 pins pawn on g2 against rook on h1" —
   g2 pushing to g3 opens d5–h1 and drops the rook. True, if minor; the invariant
   sentence it carried is the correct concept. Not a defect. (Noted, not churned:
   `detectImmediateTactics` has a `.slice(0, 5)` — it bounds the model's tactic
   ALLOWANCE and the lane speaks one tactic per turn, the `eyes`-clip class of
   G4.5, not a narration cap.)
4. The pre-push hook (11b) and `TEST_TYPE_ERROR_CEILING` (11d) — already listed
   under E.

**Found and NOT fixed here (chips spawned / flagged):**
- The listener sidecar receives NOTHING on David's Mac unless `AUDIT_SANDBOX=1`
  (Chrome 145 blocks https→127.0.0.1 without `--disable-web-security`). A run
  read "0 spoken" while PostHog held 247 narration events for the run id. Chip:
  make the sidecar reachable without weakening web security; fail loudly on
  `audit_stream_post_failed`. Memory: `audit-listener-needs-sandbox-flag`.
- Upstash cap: the plan bump (~$0.20 / 100k) is David's call. Redis-backed
  routes and their degradation are listed in CLAUDE.md §G2.

## ROADBLOCKS — every open item in coach (2026-09-18)

Three buckets. A thing is a roadblock if it stops the LOOP closing, stops an
INSTRUMENT being believable, or reaches the STUDENT as a wrong/repeated line.

### D. THE STUDENT CANNOT GET WHAT THEY ASKED FOR (WO-LIVE-DEFECTS-01)

From real App Store telemetry, week of 2026-09-11 — read off the full
`narration_text` of what two real people actually heard. This bucket is NEW and
it outranks the rest of the WO: everything else is about the QUALITY of what
gets said; this is about whether anything happens at all.

- ✅ **D2/D3/D4 — a user asked for an Italian lesson SEVEN TIMES and never got
  one.** Two landings, and the second is the root.

  `2bfb4961c` shipped the BELT: `start_walkthrough_for_opening` correctly
  refused (home chat cannot host one), the coach correctly navigated to Learn,
  and nothing re-fired the walkthrough on arrival — twelve
  `coach_tool_call_error`s, zero lessons. The ask is now QUEUED
  (`coachMemoryStore.pendingWalkthrough`) before the refusal and Learn drains it
  on mount through `handleSubmit`, so every existing lane runs once instead of a
  second copy of the starter. `takePendingWalkthrough` reads and clears
  atomically.

  🔴 **`170378d5e` is the ROOT, and it corrects the diagnosis above rather than
  adding to it.** The user should never have reached the brain at all. They
  wrote in **Thai**, and `detectLanguage` had no Thai range — so it answered
  `{code:'en', nonEnglish:false}` and every translate branch in the app
  correctly did nothing. Nothing downstream was broken: `routeChatIntent` has
  translated non-English COMMANDS since 2026-07-10 and emits
  `/coach/teach?opening=`, which the Teach surface has always auto-kicked. One
  missing row, four symptoms — the command never routed, the ask reached the
  brain untranslated, the reply came back in English (that is D5's Thai half),
  and narration localisation never fired. Nineteen other writing systems were
  invisible the same way; Vietnamese was worse, its tone marks tripping the
  FRENCH fingerprint so the ask was answered in French. Fixed as a
  `LangCode`-typed table (`SCRIPT_RANGES`) against two `Record<LangCode,string>`,
  so a new script cannot ship unnamed; the Settings picker now derives its list
  from the same record, because it had drifted the other way (Dutch, Polish and
  Turkish were choosable but undetectable).

  **D4 RE-MEASURED, and it was downstream — no separate bug.** Against the live
  provider, the fixed translate prompt preserves the opening name through Thai:
  "สอนฉันเปิดเกมอิตาลีให้หน่อย" → *"Teach me the Italian Opening."*,
  "ช่วยสอนการเปิดเกมรุยโลเปซหน่อยครับ" → *"Please teach me the Ruy Lopez
  opening."*, "สอนซิซิเลียนนัจดอร์ฟให้หน่อย" → *"Teach me the Sicilian
  Najdorf."* So the subject the router resolves is the one they asked for.

  **The instrument could not have caught any of it, and that is now fixed too.**
  `audit-coach-multilingual-prod.mjs` tested exactly the eight scripts that
  already worked — by construction, the set that could not fail — and tested
  only QUESTIONS, which fall through to the brain and translate INSIDE it, so
  they were never at risk. It now carries Thai, Greek, Hebrew, Vietnamese,
  Hindi, Korean and Turkish, and a `lesson` row asserting the COMMAND contract:
  did the router fire (`?opening=` in the url) AND is it the opening they named.
  Those are reported as separate failures because "no lesson started" and "the
  wrong lesson started" cost different fixes.

- ✅ **D-LANG — the coach answered every language in English, and Learn would
  not start a lesson in any of them.** Both found by RUNNING
  `audit-coach-multilingual-prod` against prod on 2026-09-19, and both larger
  than the rows that found them.

  **The reply language.** A Thai "ตาต่อไปควรเดินอะไรดี" came back "The best move
  is Nc3. It develops into the game, fighting for the center on d5 and e4." —
  correct, grounded, well written, unreadable to them. Greek, Hebrew, Hindi,
  Korean and Vietnamese the same, and so were German, Italian and Portuguese,
  which the detector has always seen. So it was never detection. `coachService`
  computes the reply language correctly and puts it in the system prompt, but
  the grounded lanes answer BEFORE any model call: they voice computed facts
  through `voiceFacts`, and `targetLanguage` had NO production caller anywhere
  in the app, so all 105 of them re-detected the language from `studentMessage`
  — which `coachService` has already translated to English. Computed once,
  correctly, then thrown away by the path that answers most questions. 105 of
  the 114 calls are in ONE function, so the fix is one turn-bound `voice()`
  helper plus the value threaded through `ProviderCallOptions`; deliberately
  NOT a module global, which leaked a prior turn's language once already (the
  2026-07-10 polyglot audit answered an English question in Portuguese).

  **The lesson.** "สอนฉันเปิดเกมอิตาลีให้หน่อย" — teach me the Italian — was
  answered "The best move is e4." They asked for a lesson and got a move.
  Learn does not go through `routeChatIntent` (which has translated before
  matching since 2026-07-10); its own pipeline — walkthrough controls,
  settings, the player-game / training-aid / navigation routers,
  `parseCoachIntent`, the stage detectors, name resolution — only ever read
  English. Translated ONCE above every matcher rather than in front of each,
  because that duplication is exactly what let the settings lane translate
  while the lesson lane did not.

  🚨 **AND IT IS A G0 FAILURE, NOT ONLY A TRANSLATION GAP.** The deterministic
  lane missed EVERY non-English ask — but the outcome then fell to the brain,
  which sometimes chose to start a walkthrough anyway. Portuguese got
  "Starting the Italian Game walkthrough"; German got "The best move is e4".
  Same defect, opposite outcomes, decided by the model. A missed deterministic
  route does not fail loudly, it fails RANDOMLY, which is why no one noticed.

  **THE INSTRUMENT IS WHY THIS LIVED FOR MONTHS, and its three bugs are fixed
  too.** (1) It never checked the reply LANGUAGE — only that chess words
  appeared, and those survive translation, so it could not fail on the thing it
  is named after. (2) Its concept row rejected "the born forker", the coach's
  own house line. (3) Its lesson row read the URL, but Learn starts the
  walkthrough IN PLACE — that manufactured a red row on a French ask that had
  actually worked. An accept contract stricter than the product's real voice
  buries the true reds among false ones.

- ✅ **THE TRANSCRIPT HAS A TRANSLATION DOOR (2026-09-19, verified on prod
  bundle `DwL7hnpw`).** Was: a Thai student got the lesson, HEARD it in Thai
  and READ "Sure — let's walk through the Italian Game." in English. Not a
  design choice — an accident of shape: every spoken line funnels through
  `voiceService.speakInternal` and that one door localises, while chat messages
  are built at 85 `setMessages` sites and pushed straight in, so there was no
  door at all. A census found 22 English sources feeding the transcript, not
  the six acks — which is the argument for a door over point fixes.

  **The door is at the RENDER, not the push.** The transcript renders from ONE
  map, so localising there covers every message today and every one added
  later for a single call site; wrapping 85 pushes is a large refactor of a
  12k-line component for no extra coverage. `useLocalizedBeats` is the same
  pattern already here.

  **Table first, model second, English floor** — the order is the determinism
  law, not an optimisation. Fixed app strings are chrome, not computed chess
  facts, so a table answers synchronously: no round-trip, and no
  English-then-swap flicker in the exact moment just fixed.

  Prod, same ask: `มาเรียน Italian Game กันเลยครับ` — instant, from the table,
  with the proper name preserved. And the greeting and the no-games line came
  back Thai too, through the model fallback, though neither is in the table.
  That is the difference between fixing six strings and fixing the cause.

- ✅ **VERIFIED ON PROD (2026-09-19, bundle `senxol9e`).** The fixes were
  re-run against the deployed build, and the two lanes that were still English
  an hour earlier are the ones that moved:

  | ask | before tonight | after |
  |---|---|---|
  | Thai "what's the best move" | *"The best move is Nf3…"* | *"หมากที่ดีที่สุดคือ exd5 ครับ และตอนนี้ฝ่ายขาวได้เปรียบเล็กน้อย ประมาณ 0.6 แต้ม"* |
  | Greek "what's the best move" | *"This game is now the King's Pawn Game…"* | *"Η καλύτερη κίνηση είναι Nf3. Μπαίνει στο παιχνίδι, διεκδικώντας το κέντρο στα d4 και e5"* |
  | Hebrew "what is a fork" | *"The knight is the born forker…"* | *"מזלג הוא כלי שבו חייל אחד מאיים על שניים — כלי אחד תוקף שני אויבים בבת אחת"* |
  | Thai "teach me the Italian" | *"The best move is e4."* | the Italian Game walkthrough starts |

  Every row that produced a language-checkable reply came back in the student's
  language, and the chess tokens (`exd5`, `Nf3`, `d4`, `e5`) survive verbatim
  through the fidelity net in all of them.

  **The lesson start is confirmed by a PAIRED PROBE, not by the audit.** The
  audit's lesson row still reports "no walkthrough UI" while two focused probes
  — the same Thai ask as the FIRST turn and as a FOLLOW-UP, the only variable —
  both show `teach-nav-row` at +5s and print the running lesson. The probes
  watch continuously and dump the transcript; the audit row checks once. So the
  ROW is the suspect instrument, and it is left flagged rather than quietly
  called green: `scripts/probe-thai-lesson.mjs` is the trustworthy measurement
  until someone works out why the row disagrees.

### WO-LIVE-DEFECTS-01 — the rest of the list

Shipped 2026-09-19 in 2bfb4961c + 7bc0677ab. Both standing audits green after:
Learn 8/8, Review 28/28 MEETS STANDARD.

- ✅ **D1** mate graded as a 300-point blunder — `capEval` on both terms
  (mirroring `gameAnalysisService:1238`) plus a `#` short-circuit so a mating
  move is never classified at all.
- ✅ **D5** language fell back to English mid-conversation — one detected
  non-English message is now a sticky session fact; an explicit setting wins.
- ✅ **D6** promotion narrated as a pawn push — a `promotion` fundamental at
  weight 90, and the passed-pawn branch is skipped on the same move.
- ✅ **D7** `kingádas` — ROOT FOUND: the translation prompt said "translate
  every other word", so the model translated the opening NAME. Proper names are
  labels, not phrases, and the prompt now says so.
- ✅ **D8/D12** the same line 4–5× in 25 seconds — a say-once ledger at the
  voice chokepoint. The existing de-flood held ONE slot for 1500ms and the
  observed gaps were 3–13s, so it caught none of them. 30s window, bounded,
  audited, explicit taps exempt.
- ✅ **D9a** `hint-revealed` mirrored to PostHog — the instrument was blind, so
  "did they tap Hint 154 times?" could not be asked at all.
- ✅ **D10** missing space between two spoken segments — normalizer at the
  chokepoint, narrow (punctuation + capital only, decimals untouched).
- ✅ **D13** half of all weakness tags `uncategorized` — the unmatched inputs
  are now logged. Deliberately NOT a new tag: extend the tagger from the real
  population, never from imagination.

**NOT BUILT, and why — do not re-derive:**
- ⏸ **D9b** (154 answer-reveals on Play) — blocked BY DESIGN on D9a. It needs a
  session recorded with the instrument that just shipped. Do the ten-minute
  local repro first (play 20 moves without touching Hint, count `speakForced`).
- ⏸ **D11** (three generators stack into one utterance) — needs squares COUPLED
  first. G4.5.1 forbids subsuming facts with no squares ("silence must never be
  a guess"), and those three push free prose, so string-matching them would
  break the exact rule the fix exists to serve.
- ⏸ **D15** (TTS playback timeout) — root genuinely unknown; not guessed at.

### A. The loop cannot close (highest — these are the app, not polish)

✅ **A-NEW — LANDED 2026-09-19 (late). Was: THE MODEL CANNOT READ THE FUNDAMENTAL
THE COMPUTER PROVED.** See the landed section below for the two defects behind it;
the original measurement follows unchanged.

🔴 (as measured before the fix) On 47 real amateur games through the real pipeline:
154/154 flagged moves captured, 79 carry an attributed `fundamentalId` — and the
weakness SPINE sees **0** of them. `autoAnalyzeGameMisconceptions` hardcodes
`learned:false` (the ONLY entry from batch analysis, review-open and a finished
coach game), every row lands `counted:false`, and `weaknessSpine` +
`weaknessAnalyzer` read `getMisconceptionProfile({countedOnly:true})`.
`fundamentalId` lives ONLY on those rows (a `MistakePuzzle` carries none), so the
Fundamentals tab says "loose piece 19×" while the ranker that decides what the
coach teaches next has never heard of it. **This is the loop not closing, one
layer down from the heat map.** NOT fixed in WO-4: the gate defends against
double-counting the TAG (true) and that is WO-3's file. The fix is not "flip
`learned`" — it is a fundamental-aware spine reader that aggregates
`fundamentalId` over ALL rows the way `getFundamentalCounts` already does, so the
fundamental counts once and the tag is left alone. David's call; one file.

0. ✅ **FIXED (#77) — CLICK-TO-MOVE SILENTLY DROPPED THE STUDENT'S MOVE.**
   🔴 The entry here previously read "the first coach reply of a game
   intermittently blows 90s" and blamed a cold LLM / the serialized Stockfish
   singleton. THAT WAS WRONG and is deleted rather than annotated. The coach was
   never slow: measured on prod it answered in 4.5–4.9s every time.

   What actually happened: `useChessGame.onSquareClick` read the current
   selection out of REACT STATE, so the second tap of a click-move only saw the
   first tap's selection if React had COMMITTED a render in between. When it had
   not, the tap fell through to "select this square instead" — and an
   enemy-occupied destination has no legal moves for the side to move, so the
   selection cleared and THE MOVE VANISHED with no error, no sound, no feedback.

   Proven on prod, same position, same two squares: a 250ms gap between taps was
   REFUSED; a 2.5s gap landed in 0.5s; a DRAG always worked (a drag needs no
   state to survive between two events). The window stretches past 250ms exactly
   when the coach's narration pipeline is running engine analyses on the main
   thread — i.e. right after its reply, which is when the student is tapping.

   Fix: the selection is now held in REFS, which update synchronously; the state
   still drives the selection ring and the legal-move dots. Both refs are written
   in the only two places that write the selection, so they cannot drift. It
   lands on all 39 surfaces that use `useChessGame` at once.

   Why no test caught it: the existing test put each click in its own `act`, so
   React always committed in between — and its comment said each click "must be
   a separate act", writing the defect down as a requirement. Two new tests put
   both clicks in ONE `act` (one of them the real `Qxd5` capture), and were
   verified to FAIL on the old code and pass on the new.

   The Learn audit's row C red was downstream of this all along: the audit's own
   clicks were being dropped, so the game never reached the ply that poses the
   concept, and the audit reported it as "no coach reply".

1. ✅ **DONE (fe8e50cd3 + c4715f593) — GREY TEACHES, and it feeds the RANKER.**
   Not the per-tag need prior this item originally described: David corrected the
   framing ("the ranking computer decides"), and grey went into
   `computeImportance`'s student term instead, where the `rank > 0` guard makes
   it structurally unable to manufacture a moment on a quiet ply. RED > GREY >
   GREEN, MAX not sum. Both lanes feed it. Gate: `studentMomentBoost.test.ts`.
2. ✅ **DONE (fcf483f) — ONE COMPUTER, BOTH DIRECTIONS** (#25). The entry here
   read "a capability can go RED from anywhere and can only go GREEN through
   analysis". The sharper finding was the other way round: `recordCapabilitiesShown`
   only ever wrote `held`, so `CapabilityOutcome`'s `broken` member could not
   exist and BOTH readers (`needScore:287`, `studentMomentBoost:58`) guarded on
   `broken > 0` — unreachable code describing an impossible state. Now
   `recordCapabilityEvidence`: same posed set, outcome decided from the real
   cpLoss. Live writers added via one door (`discussionPractice.recordMoveEvidence`),
   each surface declaring its own `capabilityOrigin` through a REQUIRED
   parameter. HOLD writers 4 -> 5, six surfaces feeding them.
   Found stress-testing it: `studentMomentBoost.isGrey` returned false for a
   broken tag, harmless ONLY while nothing wrote one — the moment failures are
   recorded it made the coach QUIETER on a capability just demonstrably failed.
   Now `isUnproven`.
   STILL OPEN: press/no-press AT A CRITICAL MOMENT, which the critical-moment
   build (above) creates. `prompted` is in place and required, waiting for it.
3. ✅ **DONE (fcf483f) — AND THE BULLET UNDERSTATED IT.** This read "the number
   is correct at the source now; threading it is the rest". It was not correct
   at the source: `playerRatingService:160` anchored the running K=32 ELO at
   `currentRating`, the field `calibrateStrength:134` then WRITES, so every boot
   re-scored the same games from the number the last boot wrote — measured
   800 -> 990 and 1200 -> 888 across ten opens on zero new games. §4 of
   `docs/plans/2026-09-17-computer-unification.md` reverted code for this and it
   returned on 2026-09-18 through a change that widened the SOURCE without
   touching the ANCHOR. Fixed with a write-once `ratingBaseline`; gate
   `ratingIdempotence.test.ts` (negative control: reverting the anchor turns 3
   of 5 red with the measured drift). Three more fell out: a refresh clobbered
   `puzzleRating` (the SRS's own number), the profile seeded at 800 on a comment
   describing the picker deleted 2026-09-02, and Learn set its slip bar from the
   PUZZLE rating.
   NOT DONE, deliberately: the 29 hand-rolled `?? 1200` sites already carry the
   correct value and `oneStudentRating.test.ts` gates it — naming, not a defect.
4. ✅ **THE ENDGAME ZERO WAS FALSE** (fcf483f). `state-of-build.mjs:94` probed
   `components/Coach/CoachEndgame*` for corpus reach, but the corpus is spliced
   in `EndgameLessonTab` (4 calls + its own `corpusNote` test), which
   `CoachEndgamePage` mounts 4x — the same renderer-not-producer mistake the
   comment one line above it warns about. STATE.md printed a red ZERO for a
   surface that works, and ship-check gates on that file. Its HOLD scan was also
   keyed on a function NAME and read a rename as the app losing a writer.
5. ✅ **DONE (fcf483f)** (#32). `WeaknessProvenance` already existed with `from`
   REQUIRED and 4 of 5 aggregators filling it; the one bare source was the
   COACH'S OWN capture. The record shape was never the problem —
   `MisconceptionTagRecord.sourceGameId` existed and `captureMisconception`
   always forwarded it — the live sites never passed one, because Learn minted
   its game id at SAVE time, after every slip was already written. The id now
   comes from `learnMemory`, which already knows when a game begins by the one
   mechanism that cannot be fooled (the board going backwards).
6. 🔴 **NOT A DEFECT — THIS BULLET IS WRONG AND IS DELETED, NOT ANNOTATED.** It
   read "No concept-level spaced retrieval. SRS is keyed to `openingId` and
   covers MOVES, not ideas." Measured 2026-09-19: a concept-level SRS exists and
   IS read. `misconceptionService` writes `dueAt` on capture (:114), lengthens
   it on success (:266) and snaps it back on a miss (:274), and
   `isMisconceptionDue` drives `openCount` in `getMisconceptionProfile` (:219),
   which SIX production modules consume including the weakness spine and
   `coachApi`. What is missing is a SURFACE that schedules a session around it —
   a build, and one that needs a decision about where it lives, not a fix.
7. ✅ **STRUCTURALLY DONE (fcf483f)** (#34). `CapabilityEvidenceRecord.prompted`
   is REQUIRED, and the profile counts a prompted row as NEITHER held nor
   broken, so a told-then-found move leaves the tag GREY and the coach keeps
   teaching it — the coach's own teaching can never inflate the model it uses to
   decide whether to teach. Every writer answers it. The remaining wire is the
   drill surfaces' `hintRevealed` (`useEndgamePlayout:267`, React state read by
   4 components, zero services) and the critical-moment announcement, which is
   the first thing that will ever pass `prompted: true`.

### 🔴🔴 OPEN — TWO SURFACES STOP MAKING PROGRESS ON `index-C7Z2So9u` (2026-09-19, ~06:00)

Two independent observations on the same bundle, both "the app advances a
little and then stops". They may be one disease; nobody has bisected either.

**LEARN** — the coach never replies after the student's 4th ply, so the game
stalls one ply short of the position that poses the concept. Row C fails for
want of a PLY, not for want of a concept.

**REVIEW** — the walk advances to ply 2 (the `AUTO advances-by-itself` row
PASSES, "from ply 0 -> 2") and then sits at **ply 0 of 93 for 1,100 seconds**.
The readout is not broken: it reads correctly before (`AUTO`) and after
(`REOPEN walk-readout-is-live`, "ply readout reads 11"). Three rows fail
downstream of it — RECAP ("end reached=false"), FUNDLEAD and SHOW, all of
which need the walk to reach their ply. First-open also slowed 100.6s ->
170.6s.

**WHAT IS NOT THE CAUSE**, checked rather than assumed:
- Not a cold start. The second game in the same Learn run is warm and fast
  (30s) while the first stalls (136s), twice.
- Not intermittent. Identical numbers across re-runs.
- Not this session's corpus work. The degender landed voiced-corpus DATA and
  a script that never enters the bundle — grep-verified, only a test imports
  it.
- NOT YET RULED OUT: the service-worker mid-session swap (third candidate
  below). Real, independently confirmed, now fixed — but it does not account
  for the asymmetry or the repeatability, so it is a candidate, not the answer.
- Not the audit's seat hardcode. That was real and is fixed (`isStudentPly`);
  SEAT is green now and FUNDLEAD reads the correct seat ("You: that was a
  mistake") on the right ply.

**WHAT IS LEFT.** Between the last all-green bundle and this one the other
session landed `6f088da` / `cda379b` / `5bbd3d1`, rewriting 249 lines of
`coachApi.ts` plus `coachService.ts` and `CoachTeachPage.tsx` to detect and
carry the turn's language. That is the reply path on Learn and it is
circumstantial on Review.

**A THIRD CANDIDATE, FOUND 2026-09-19 EVENING — AND WHAT IT DOES *NOT*
EXPLAIN.** The PWA shipped `skipWaiting: true` + `clientsClaim: true` +
`cleanupOutdatedCaches: true`, so a newly-deployed service worker activated
under a page that was still running, DELETED the precache that page was
executing out of, and claimed it. Every later lazy chunk or Web Worker fetch
then asked for a hashed file the deploy no longer serves. `__HOLD_SW_RELOAD__`
made it worse rather than better: it deferred the RELOAD while the activation
went ahead, so it kept a session alive on top of code that had just been
purged. Confirmed on David's own iPhone the same day — `stockfish-error`
(worker load failure), `lichess-error TypeError: Load failed`, `sw-lifecycle
installed -> activating -> controllerchange -> activated`, `pagehide
persisted=false`, and no `app-boot` on reopen. FIXED: the worker now waits and
the page asks for the handover only when no hold is held (vite.config.ts,
index.html, gate `src/test/swHandover.test.ts`).

That matters here because every audit run starts moments after waiting for the
new bundle to land — i.e. precisely inside the swap window. **But do not adopt
it as the verdict.** It fails to explain the two sharpest facts above: the
asymmetry (the CANONICAL ask stalls, the same game started from a PICKER CHIP
does not — a cache purge has no reason to care how the ask was typed) and the
repeatability (136s twice, to the second, which reads like a timeout boundary,
not like a race). Treat it as a THIRD candidate that also removes a large
source of noise from the measurement: the next run of both audits is the first
clean one either way, and should be taken before any bisect.

**THE ONE-STEP BISECT:** build `6f088da^` locally and run
`audit-concept-gameplay-prod` against `http://localhost:5173`. If the
canonical ask answers in ~27s there and 136s on prod, it is that commit.
Deliberately not reverted or patched from here — that work is in flight, and
a blind fix into a surface another session is actively editing is how two
correct changes become one broken one.

### 🔴 SUPERSEDED DETAIL — the Learn half, as first written (~05:40)

`audit-concept-gameplay-prod` row C went 8/8 -> 7/8. NOT the concept
computer: the game never reaches the position that poses it. The coach does
not reply after the student's 4th ply, so `Nc3` — the move that creates the
pin the invariant describes — is never played.

**Measured, twice, on one bundle:**

| bundle | canonical ask | typo ask (via the picker) |
|---|---|---|
| `index-BBopxcK2` | 5 plies, **27s** ✅ | 5 plies, 26s ✅ |
| `index-C7Z2So9u` | 4 plies, **136s** ❌ | 5 plies, 30s ✅ |
| `index-C7Z2So9u` (re-run) | 4 plies, **136s** ❌ | 5 plies, 30s ✅ |

So it is not a cold start (the second game in the same run is warm and fast)
and not intermittent (identical twice). It is asymmetric: the ask typed
CANONICALLY stalls; the same game started by TAPPING A PICKER CHIP does not.
136s is suspiciously close to a timeout boundary.

**WHOSE CHANGE — evidence, not a verdict.** Between the green bundle and the
red one, this session landed only voiced-corpus DATA and a script that never
enters the bundle (only a test imports it; verified by grep). The other
session landed `6f088da` / `cda379b` / `5bbd3d1`, which rewrote **249 lines of
`coachApi.ts`** plus `coachService.ts` and 51 lines of `CoachTeachPage.tsx` —
the exact reply path that now stalls — to detect and carry the turn's
language.

That is circumstantial: the window, the surface, and the asymmetry all point
one way, but NOBODY HAS BISECTED IT. Deliberately not "fixed" from here at
05:40 while that work is in flight — a blind patch into a surface another
session is actively editing is how two correct changes become one broken one.

**To confirm in one step:** re-run `audit-concept-gameplay-prod` with the
language path short-circuited, or bisect `6f088da`. The canonical ask is
`"Play the Scandinavian Defense, Lasker Variation with me"`.

### A-ADJACENT, found by the post-deploy audit (2026-09-19)

- ✅ **A GUESSED SEAT NARRATED THE STUDENT'S OWN MOVES AS THE OPPONENT'S**
  (d9a193f). On a Slav where the student was BLACK, review said "Your opponent
  developed into the game" about the student's move, and the ONE ply the engine
  flagged came back "Your opponent: that was a mistake, costing about 1.4
  points". `resolvePlayerColor` infers the seat from NAMES; neither the username
  match nor the engine-name shortcut applies to a game imported with unfamiliar
  names, so it returned null and `CoachReviewSessionPage` defaulted to 'white'
  for board ORIENTATION — then threaded that guess into `buildReviewSegments` as
  the NARRATION SEAT. The file refuses to guess one line away (the WIN/LOSS badge
  shows `?`); the narration was less careful than the badge. Fixed with the field
  that should have existed: `GameRecord.studentSide`, read first, declared by both
  coach save paths, absent still means infer.
- ✅ **THE WALK BUDGET WAS A CONSTANT ABOUT A DIFFERENT GAME** (7582d23). RECAP
  and THESIS failed the product for the instrument's pacing: the walk reached ply
  80 of 89 at poll 575 of 600. The recap is spoken at the end and the
  turning-point card only appears after it. 600 was tuned when this audit ran ONE
  fixture; it now rotates a game every run, so the budget scales with the game.
  The audit was also withholding its own input — it computes expectations from
  `studentSide` and never seeded that field.

### B. The instruments are not believable (a green here means nothing)

7c. ✅ **DONE (2026-09-19) — THE DEAD-SELECTOR CLASS HAS A GATE.** #59 (below,
   §C 16) was the calibration-bubble failure again under a new name: an audit
   blocking on a testid nothing renders fails SILENTLY (timeout, `.catch`,
   wall-clock) or, worse, files a false finding. `noDeadTestidWaits.test.ts`
   generalises `noDeadCalibrationBubble`: an audit may not waitFor / click /
   fill / read a LONE `data-testid` absent from `src/` (the extractor sees the
   literal, the `xTestId=` prop forms and template prefixes; alternation lists
   with a live fallback are not blamed). Measured: 1,695 rendered ids, 7 dead
   blocking actions in 4 scripts (`audit-settings-behavior` ×3 on
   `gameplay-coaching-row-modal/-close`, `audit-coach-full-interactive` on
   `filter-all` + `coach-play-redirect`, `audit-gotham-prorep-interactive` on
   `featured-pro-openings`, `audit-review-functions-probe` on
   `review-full-detail-toggle`) — the shrink-only baseline. Fix the script,
   delete the line. LATER THE SAME NIGHT: the extractor learned suffix
   templates (`${testId}-modal`), which cleared the two settings ids as false
   positives, and three of the rest were fixed to today's contracts — the
   review probe now asserts the Deep Review Detail toggle is ABSENT (removed
   2026-09-16; it had false-failed every run since), the Gotham audit asserts
   the standard Pro grid lists his card (the pinned section was reverted
   2026-05-31), the coach-full audit's `filter-all` no-op is gone. Baseline: 1
   (a Promise.race arm beside a live id).

7a. ✅ **DONE (2026-09-19) — EVERY narration listener was DARK on this Mac, and
   every audit still printed its rows.** Two shut valves on the one pipe, found
   in series:
   - Chrome 148 (Playwright 1.58's bundle) enforces Local Network Access: an
     https page may POST to 127.0.0.1 only with a permission grant, and headless
     denies it. The 2026-07-13 hand-rolled PNA flag lived in TWO places under
     names Chrome has since renamed, and a second `--disable-features` after the
     helper overrides it (Chromium keeps the last). Now ONE source,
     `LOOPBACK_SIDECAR_ARGS` inside `sandboxLaunchArgs()` on every path;
     `LISTENER_LAUNCH_ARGS` re-exports it; the gems loop's literal is gone.
     Gate: `auditHarnessReach.test.ts` fails any audit spelling
     `--disable-features=` itself.
   - The sidecar allowed a FIXED header list at preflight, and the app started
     sending `x-audit-marked` (landed from another session the same night), so
     every POST died at CORS again with the flag in place. The listener now
     echoes `Access-Control-Request-Headers`; it is a loopback capture, and the
     secret check is the gate.
   The Learn gameplay audit played two 29-ply games and captured ZERO events of
   ANY kind — which reads as "the coach is silent" when the truth is "the pipe
   is shut". Proof: 0 → 153 listener events, 8/8 on prod. Any audit "green"
   recorded on a Mac under Chrome 148 before this fix verified nothing about
   the voice. Ask whether the instrument reached the surface FIRST.
   The run's prose list ALSO showed every line twice — read the raw tape before
   calling that a §C defect: it was ONE utterance and TWO app events of kind
   `coach-narration-spoken` (the Learn lane record `CoachTeachPage.trackA` plus
   voiceService's own). The audit's prose filter now keeps voiceService's.

7b. ✅ **DONE (2026-09-19) — an LLM-written `[BOARD: highlight:]` reached the
   board.** `GameChatPanel.test` 'strips an LLM highlight marker' was red on
   untouched main. Cause: the 2026-09-13 preserve in `applyCandidateArrows` kept
   highlight markers by matching the TEXT, and a marker code wrote is the same
   string as one the LLM wrote. Fix is structural, not a filter: the read's
   `keySquares` ride a typed read-once channel (`consumeCoachKeySquares`, the
   action-offer pattern) and `coachService.ask` re-appends them AFTER the arrow
   pass strips every marker. One builder (`keySquareHighlightMarker`). Gates:
   `coachAnswerGates.test` (dated contract), `coachApi.keySquares.test`.

8. **The review audit's verdict is not reproducible** (#70) — three runs on one
   bundle gave three different red sets, because the background deep dive is a
   race the harness neither waits on nor reports.
   - ✅ **The instrument could not even PIN a game (found 2026-09-19).** A
     reproducibility pair ran a Scandinavian and then, "pinned" to it, a Ruy
     Lopez: `AUDIT_GAME_ID` swallowed a transient fetch throw and silently
     rotated to a fresh pick, then printed a reproduce line for a game it never
     played. Fixed: three fetch attempts with backoff, the reason named, exit 2
     under a pin that cannot be honoured. Every "not reproducible" reading
     taken before this fix may have compared two different games.
   - The worker storm seen on the reopen (124 pthread helpers, page errors) is
     #21, owned by the focused-noyce session tonight — not re-derived here.
   - ✅ **MEASURED, PINNED, SAME BUNDLE (2026-09-20): 4 of 5 red rows identical
     across two runs of Firouzja–Carlsen 06wNUWaA.** Stable: RECAP aggregate,
     FUNDLEAD (0/4 flagged plies lead with a fundamental — §E item 0), HEAP and
     ERR (#21). The residue is two things, neither a harness race:
     (a) **classification drift from time-budgeted analysis.** The review sends
     `go depth N movetime B` (`gameAnalysisService`: sweep 200 ms at depth ≤12,
     deep pass 8 s at depth 16 on ≤24 plies) and stamps the depth REACHED, so
     under load the same ply grades differently — ply 50 was an inaccuracy
     (0.8) in run 1 and a mistake (1.1) in run 2; ply 48 0.9 → 0.7; the
     critical-moment stake flipped in-it → damage. The annotations are not a
     pure function of the game, so no row that depends on WHICH plies flagged
     can be. OWED: an audit-only determinism seam, the mute's twin —
     `localStorage.auditDeterministicAnalysis=1` read in `gameAnalysisService`
     makes every review `budgetMs` undefined (depth-only) at the four sites:
     `evaluateFensPooled`'s default, the dive worker's `analyzePosition`, the
     sacrifice verify and the best-move refine (`positionBudgetMs ??
     REVIEW_POSITION_BUDGET_MS`), plus the shallow sweep. Gate it like
     `auditMute`: product code may never set the flag.
     (b) **one instrument skew, fixed.** `ACC board-accuracy` red on run 2
     only: "Your pawn on g6 now eyes their pawn on h5" filed under ply 31
     (White's Be3) when it is the ply-32 sentence (…g6). The audit read the
     ply readout and the narration banner in two separate DOM round trips, and
     the muted voice-gated walk advanced between them. The three reads are now
     one atomic snapshot.
   - **THE SEAM LANDED AND THE PAIR STILL DIFFERED (2026-09-20, bundle
     `index-BeoVsaKE`, 06wNUWaA pinned, `AUDIT_DETERMINISTIC=1`):** run 1 34/36,
     run 2 33/36, `only2=['CRIT spoken-names-count-and-stake']`; FUNDLEAD ply 50
     "MISTAKE 1.1" vs "INACCURACY 0.7". So the budget was NOT the residue. Read
     the code end to end and found two mechanisms, neither a budget:
     (a) `evaluateFensPooled` hands positions to the pool off a shared `next`
     counter — WHICH worker's WARM transposition table searches ply 50 is
     timing, and a single-thread engine at a fixed depth is only deterministic
     given the same table; (b) the sacrifice verify and the best-move refine
     ran on the SINGLETON — the multi-thread build (Threads ≤4, lazy SMP),
     nondeterministic by construction — and sat on the live engine behind an
     open review, the exact defect the dive was moved off on 2026-09-06, two
     sites over (rot-on-sight). ✅ BUILT: under the audit flag the pool worker
     sends `ucinewgame` before every position (single-thread build, a 16 MB
     memset, spawns nothing — the #21 storm rule is about the multi build), so
     a pool eval is a pure function of (fen, depth) whichever worker gets it;
     and ONE dedicated pool worker is acquired lazily and held through the
     annotation loop for the dive, the sacrifice verify and the best-move
     refine (singleton only when no worker can be had). Gate:
     `analysisDeterminism.pool.test.ts` — a fake Worker records the UCI stream:
     product = one clear per worker per game; flag = every `position fen` is
     preceded by `ucinewgame`; parity = with a pool available the review makes
     ZERO singleton calls, with the dive killed at the flagged ply so the
     refine has to search. ✅ **VERIFIED ON PROD (2026-09-20 08:12–08:45,
     bundle `index-D0T1cBBh`, 06wNUWaA pinned, `AUDIT_DETERMINISTIC=1`, two
     runs back to back under the lock, nothing else running): 34/36 and 34/36,
     IDENTICAL red sets (RECAP + FUNDLEAD — §E item 0, real), and the FUNDLEAD
     detail byte-identical across all five plies (48 → 1.1, 50 → 0.9, 62, 64,
     68), CRIT moment @ply 66 identical, no reopen wedge, ERR none.** The
     residue was the hash and the singleton, not the budget; the verdict is
     now a pure function of the game under the flag. Still true: the singleton
     fallback (no pool worker at all) stays nondeterministic and is out of
     reach of any flag — a device with no pool is the only place a pinned pair
     can still differ. #70 CLOSED for the review audit.
   - **What the full row diff of that pair still showed (read, not asserted):**
     (a) the critical-moment FAN read "10 speak / gap 99667" vs "9 speak / gap
     99688" — the moment matched this time, but that is the exact path that
     flipped `CRIT spoken-names-count-and-stake` in the earlier pair: the fan
     is time-boxed (`CRITICAL_FAN_BUDGET_MS` 1.5 s) on a warm, queue-assigned
     table and only `analyzePosition` had the cold start. First wire (cold
     start + the fan's clock lifted to the ten-minute ceiling) was MEASURED
     WRONG on the next pinned pair: MultiPV 3 at depth 14 from a cold hash on
     the one worker the pool had did not finish 22 plies before the reopen
     aborted the pass — "no scanCriticalMoments event", the question never
     fired. Deterministic and unbounded is the wrong pair. ✅ REWIRED: under
     the flag the fan sends `go depth 14 nodes 1200000` (a node limit is the
     third kind of bound — deterministic on one thread with a cold table AND
     finite), with its own 30 s watchdog; the pass keeps its real 1.5 s
     budget. Gate: the source must carry the node-bound send and the fan must
     never go through `reviewBudget`. VERIFIED 1 OF 2: node-bound run 1 on
     `index-WwZIaxGS` read "22 read, 9 speak, gap 99640, 3087 ms" — same
     wall-clock as the product's clocked fan and the same verdict as the
     clock-lifted run before it; run 2 hit the #21 wedge at the reopen and was
     killed, so the byte-identical PAIR on the node-bound fan is still owed
     (the chain's diff picked the previous report and read "identical" off the
     wrong pair — a script defect, `diff-review-pair.py`, fixed to key on the
     run's own report path next time). (b) the
     EXPLORE reply's eval (1.3 vs 1.4) — a LIVE ask on the singleton, not
     review analysis; out of scope for the flag by design. (c) the LEDGER
     sample strings differ — prose from the PROJECTION layer (`computePvLine`
     through `acquirePvEngines`, `PROJ_TIMEOUT_MS` 7 s deadlines in
     `coachFeatureService`). Under the flag those deadlines would have to be
     lifted TOO or every projection aborts; owed, not done — it changes
     prose, never a red row.
9. **The pthread census is intermittent** (#21) — 70 workers one run, 1 the next
   on the same game. Carrier is the multi-threaded SINGLETON, not the pool.
   - **2026-09-20, taken over from focused-noyce after 07acb13fb.** Their fix
     holds on the storm: with a raw-CDP tap on the review audit's own browser
     (`AUDIT_CDP_PORT` + `probe-cdp-tap.mjs`), the reopen after the dive logged
     "Multi-thread variant failed at runtime (1 error event), falling back to
     single-threaded" and NO storm followed — peak 5 workers, no pthread
     helpers. What remains is a WEDGE behind it: the page's main thread then
     answered neither `Runtime.evaluate` nor `Debugger.pause` for 6 s,
     Chromium at 100% for 50 min, the reopened walk stuck at ply 0 with only
     the single-thread fallback worker alive. The tap saw no worker exception,
     so the flood is message-less `error` events on the page — consistent with
     the FALLBACK failing to start too while the previous document's memory
     lingers. Two probe runs that reopened without walking to the end stayed
     clean; both wedging runs walked to the recap first. `probe-pthread-errors-
     prod.mjs` now hooks every Worker's error events per URL (the flood's
     source, named), samples main-thread responsiveness per census, and has a
     PROBE_FULL_WALK=1 mode — the next run names the flooding worker.
   - **n=2 (2026-09-20, focused-noyce, independent):** their own review run on
     jMVMo1Ua (student=white) sat 49 min with node at 0% and the log ending
     "reopened walk ply=0: 104MB workers=1 {stockfish-18-lite-single.js:1}" —
     demote clean, no storm, walk never leaves ply 0. Same shape, different
     game. The wedge, not the storm, is #21's remaining defect.
   - **n=3 (2026-09-20 ~05:00, my full-walk probe), and the wedge is READ:**
     this reopen ran on the SINGLE build from the start (the persisted multi
     fallback), six single-thread workers alive and EVERY one answered a CDP
     `Runtime.evaluate` — the engines are fine. The page's MAIN thread is what
     is stuck: `Runtime.evaluate` times out and `Debugger.pause` never lands
     in 30 s → spinning in NATIVE code (no JS/wasm interrupt check reached),
     Chromium at 100%. It answered 0 ms at walk+5 s after the reopen, then
     never again. Not the engine, not the storm. Fits a catastrophic regex
     over narration text or a structured-clone/JSON.stringify of something
     huge on the reopened walk. NEXT: the probe now takes an OS-level
     `sample <renderer pid> 8` at wedge time (names the native frames) and
     races every page.evaluate (it had wedged itself for 68 min on one).
   - **n=4 (2026-09-20 ~07:44, full-walk probe with the OS sample armed): NO
     WEDGE.** First walk to the recap, dive done, reopen, 60 s of reopened
     walk — main thread 1–4 ms at every census, workers alive throughout, the
     sample never fired. ⚠️ CONTAMINATED for its last ~5 min: my own chain's
     wait loop deleted the probe's (ownerless) lock and the queued Gotham
     audit started beside it at 07:40 — recorded in memory, loop fixed. So
     this is n=4 of "no wedge under MORE load", weak in the direction that
     matters. **What it DID name: the error flood's source.** The page-side
     Worker hook caught `Uncaught RuntimeError: unreachable
     @stockfish-18-lite-single.js:11` — 7 events on the first walk (all five
     single-thread pool workers vanished from the census at walk+75 s), 3 on
     the reopen. That is a WASM trap (an `abort()` inside the engine — the
     shape a failed allocation takes), on the single-thread build, i.e. the
     analysis POOL, while the multi engine sat clean. A trapped pool worker
     never answers, so `analyzePosition` rejects after budget+4 s and the
     ply's eval is NULL → a null pair classifies `good` — the batch path
     documents exactly this data bug ("every move marked fine, permanently").
     NEXT for #21: (a) count how many curve/dive positions came back null on
     a run with traps (add it to the review audit's engine row); (b) capture
     the worker's stderr/`abort` reason — the glue prints it before the trap;
     (c) memory: 5 single workers × 16 MB hash + the multi engine's 64 MB +
     4 helpers on a 4 GB tab is the first suspect.
   - **n=5 (2026-09-20 09:59–10:29, bundle `index-WwZIaxGS`, my own pinned
     review run, `AUDIT_DETERMINISTIC=1`, nothing else on the machine):** the
     WEDGE, clean. Dive finished before the reopen; reopen startable in 0.3 s;
     `review-walk-started` + ONE `review-narration-spoken` fired, then "JS heap
     UNREADABLE (renderer wedged or evaluate timed out)" at ply 0, no ply
     readout ever, workers=1 (`stockfish-18-lite-single.js`), pool churn {},
     until the 30-min bound killed the browser. Same shape as n=1–3: the page's
     MAIN thread stops answering right after the reopened walk speaks its
     first line. Four of the five wedges had no determinism flag, so the flag
     is not the cause. It is reproducible enough to hunt now — ~1 in 3 reopens.
   - **n=6 (2026-09-20 10:35–11:05, product mode, no flag, no deploy under it —
     bundle and origin verified unchanged): first attempt of the hunt WEDGED,
     and the new OS sample fired — on the WRONG process** (the selector took
     "the hottest process matching chrom(e|ium)" and got the Claude desktop
     app, whose path contains the word). What that mis-sample still proved:
     the hottest chromium-named process on the box was at **0.3 % CPU** at the
     moment the page stopped answering — so this wedge is an IDLE-BLOCKED main
     thread, not a spin. (n=1's "100 % for 50 min" was the pthread storm,
     since fixed; do not conflate.) The sampler now takes every Playwright
     renderer by executable path + `--type=renderer`, logs cpu/rss per
     renderer, and prints the main thread's deepest frames; the audit also
     logs any dialog and whether a raw CDP `Runtime.evaluate` HANGS or ERRORS
     at blow-up. Also read: "0 workers" at blow-up is the pool's 60 s idle
     retire, not a signal.
   - 🔴 **CORRECTION, same hour: n=5 and n=6 are PROBABLY ARTIFACTS of my own
     chain bound, not wedges.** The heap probe's race is 4 s, so a real wedge
     is detected within seconds — yet in BOTH runs the blow-up fired at 29:53
     and the chain's `bounded 1800` killed the browser at 30:00. A clean run
     takes ~18 min; something made those two take 30, and the kill landed
     mid-reopen and read as "JS heap UNREADABLE". What made them slow is
     unknown because the audit log carried NO timestamps. Hunt 2 (three
     bounded attempts) found nothing; attempt 3 I killed myself by removing
     the bound the wrong way (kill the watcher SUBSHELL, never its `sleep` —
     the sleep's exit releases the kill; memory `background-chain-guards`).
     Now: every audit log line is stamped, `AUDIT_WEDGE_HUNT=1` makes the
     audit exit 3 right after the blow-up diagnostics (no more 49-min hangs on
     un-raced evaluates), and hunt 3 runs UNBOUNDED. The honest count of
     clean-machine, deploy-free wedges is therefore n=2 and n=3 (both real:
     49 min at 0 % node, and a main thread that never answered) — the
     reproduction rate is unknown, not "1 in 3".
10. ✅ **HALF DONE — the VISIBILITY half of #61 landed** (`tsconfig.tests.json`
    + ship-check's `test typecheck` phase, 296 errors at a shrink-only ceiling).
    Test type errors are no longer invisible; they are counted and capped. What
    remains is the RUNTIME half at 11e below: drive the ceiling to 0 so a new
    test type error blocks the push. (This entry used to say "invisible until
    runtime" — deleted, not annotated, because it was no longer true.)
11. **The GothamChess pro-rep audit fails on prod** (#58) — header selector and
    walkthrough click both miss.
    - ✅ **READ AND FIXED (2026-09-20), four layers, none of them the product.**
      Two of the day's runs were CONTAMINATED (each overlapped another tape by
      a lock mistake — memory `background-chain-guards`), so their identical
      misses proved nothing; the first CLEAN run (08:45, 32/34) still missed
      the Pro tab and the Watch button. A fresh-context probe
      (`probe-openings-tab-mount.mjs`) then measured the product: tab bar at
      +23 s direct / +55 s via the home page, the Pro grid with 8 player cards
      the instant `tab-pro` is clicked, zero errors. So the misses were the
      HARNESS: (1) the Watch button was counted before the detail page's
      Dexie read rendered it → bounded wait; (2) the audit never injected
      `autoDismissCalibration`, so its Pro-tab click landed on the page-help
      modal, and (3) that click's error was SWALLOWED (`.catch(() => null)`)
      into "0 tab" — the silent-no-op class; (4) the card row filtered by
      TEXT and raced the async card render → keyed on the id-bearing testid
      with a wait. Clean run on the fixed script: **33/34**, the last red
      being (4); with (4) fixed: **34/34 on prod (09:39, bundle
      `index-WwZIaxGS`), vacuity-checked. #58 CLOSED.** The two WARNs are instruments, not
      product: "audit-stream captured 0 events" (the stream is opt-in and OFF
      — expected since 2026-09-11) and "0 POST bodies / 42 entries on
      listener" (the sidecar HAS the run's events; the script's own
      `page.on('request')` intercept counted none — its wire-side counter is
      dead while the listener works; fold the row onto the listener). The
      content-section rows (plans / model games / pitfalls) PASSED clean, but
      they are still "does the word appear" checks — the G9.3 meta-lesson
      class — and owe a real assertion.

11a. **ship-check false-reds under parallel-session load (2026-09-19).** Three
    runs in one afternoon went red with ZERO assertion errors: every gate
    failure was a vitest `Test timed out` (punish-gems conversions at 5–22s
    that run at ~400ms alone) while three sibling worktrees ran their own
    typecheck/eslint (load avg 34–56 on 6 cores; a 55s typecheck took 1398s).
    A contaminated ship-check is worse than none. ✅ DONE 2026-09-20
    (b393b2b74): `summarizeVitest` counts "Test timed out" against
    AssertionError and flags an all-timeout red as suspected machine load.
    Still worth considering: a load check before the gates run
    (`sysctl -n vm.loadavg`) that refuses to start above ~8 and says why.
11b. **The pre-push hook spawns a SECOND full ship-check on every push**
    (shared `.git/hooks/pre-push` across all worktrees). With ship-check already
    running detached for the same SHA, a plain `git push` hung 2+ minutes and
    doubled the load that causes 11a. ✅ DONE 2026-09-20 (b393b2b74 +
    e0c964b4e): the hook skips when `.ship-check-log/latest.json` records a
    green run for HEAD's SHA; and the installer now resolves the COMMON git
    dir, because in a worktree `.git` is a file and every worktree session
    that ran it had installed nothing (ENOTDIR).
11c. **✅ FIXED 2026-09-19 (`10334b048`) — lint rendered a heap crash as a
    verdict.** On Node 26 whole-repo eslint died with a V8 native stack trace
    and the summarizer printed `✗ lint … 0 errors` — a row that contradicts
    itself. The step now carries `--max-old-space-size=8192` itself. Left
    open → ✅ closed 2026-09-20 (b393b2b74): with no report line the summary
    says so instead of "0 errors", and the row's ✓/✗ comes from the exit
    status; every native-crash signature names a crash.
11d. 🔴 **PREMISE CORRECTED (2026-09-20): the real count IS 296, the ceiling is
    right.** "0 errors — lower the ceiling to 0" was tsc CRASHING under load
    (a heap death prints no `error TS` line), the same disease as 11c's lint
    row; on a quiet machine the phase prints "296 errors (at the ceiling)". The
    step now names a crash instead of counting zero. The runtime half of #61
    is still owed the honest way: drive the 296 down, then lower the ceiling.
    - ✅ **296 → 236 (2026-09-20), ceiling lowered to 236.** Sixty were one
      class — a type GREW required fields after its fixtures were written
      (`SidePlan` +11, `MoveAnnotation` +2, `NeedPlyInput.clauseKind`,
      `MistakesLike`, `TablebaseLookupResult.bestMove`, the weakness cluster's
      `total`) — fixed at the fixture with one defaults spread per file, never
      by loosening the type; plus a JSON import whose literals widen to
      `string` (`masters-test-db.json`), typed once through the lookup's own
      option. Also measured: a bare `npx tsc -p tsconfig.tests.json` on the
      default heap DIES silently and prints 0 errors — run it with
      `NODE_OPTIONS=--max-old-space-size=8192` or the count is a lie (the 11d
      disease, one process over). Remaining, by file: 9 services/shareableInsightsService.test.ts; 8 utils/hardRefresh.test.ts; 8 components/Kid/KingMarchGame.test.tsx; 7 services/weaknessSignal.test.ts; 7 services/tacticAlertService.test.ts; 7 services/lookaheadPlan.test.ts;
11e. **Source-text regex tests drift silently when the guarded code MOVES**
    (2026-09-19, `coachLaneWiring.test.ts`): three assertions failed on
    untouched `main` — a guard grew an operand, a ref migrated into
    `learnMemRef.current.gemFen`, an import gained a sibling export — with the
    guarded behaviour intact. Fixed and mutation-tested. TODO: when a refactor
    moves a guard, grep `src/**/*.test.ts` for `toMatch(/` against the moved
    symbol in the same commit; a surface-map `--changed` run lists the tests
    that reach the file.

### C. The student hears something wrong or repeated

11f. ✅ **DONE (2026-09-19) — the read named the coach's own plan in the third
    person.** Prod tape from the rewritten read-position audit: "my Modern
    Defense… My bishop on f8 wants g7… Look ahead — **they're** lining up a
    skewer in 2: Nc3, then Bg7." The read is spoken AS the opponent (I/my) and
    `speakDeepestLookahead` was written once, in the student register (you/
    they), then injected verbatim as a REQUIRED sentence. Two seats in one
    utterance — the seat-is-part-of-the-selection rule. Fix: the function takes
    a REQUIRED `LookaheadSeat` and the threat stem is a `Record` over it
    (student: "they're lining up"; coach-is-opponent: "I'm lining up"); the
    opportunity branch is the student's own shot in both seats and does not
    vary. Callers declare: the read passes `coach-is-opponent`, phase narration
    `student`. Gate: `liveTacticsContext.test.ts`.

12. ✅ **DONE (already was) — "the queen takes d5 is about as good"** (#51).
    Verified before spending a minute on it, and the bullet claiming it open is
    DELETED rather than annotated: `uncertaintyClause` (tacticalRead.ts) already
    routes BOTH move slots through `sayMoveNoun`, and its own comment records
    the finding. Gate added so it cannot reopen (`liveVoiceDefects.test.ts`).
13. ✅ **DONE — stems are ROTATED, not rolled** (#67). Five sites converted to
    `rotateStem`, keyed on something stable about the moment:
    `mistakeNarration` ×3 on the FEN, `gamesService` ×3 on the move index / the
    opening id, `openingNarrationService` on the record's own `id` — a field
    that had been sitting on `OpeningNarration` the whole time while the doc
    comment claimed it "rotates" and the body rolled. `stemKeyOf` (FNV-1a) joins
    `rotateStem` so a caller with a stable STRING needs no private hash. LEFT
    ALONE, deliberately: the `shuffle` and the random challenge-position pick in
    `gamesService` — those size and vary an EXERCISE, they are not stems.
14. ✅ **DONE — curated beats re-announce the same move on consecutive plies**
    (#60). The missing dedupe term was the beat's SUBJECT: `curatedBeatSeen`
    keys on beat ID (different beat) and `buildVoicePackage`'s novelty set on
    whole sentences (different words), so two lessons teaching Bc4 slipped
    between both. `beatSubject` computes it at INDEX time beside `seat` and
    `register`, and RECOGNISES rather than invents — the leading token of the
    prose counts only if it is a move on the beat's own replayed line; anything
    else is null and never subject-deduped. The guard is a `continue`, like the
    register guard, so a position holding another beat still teaches.
15. **The voiced corpus is in the wrong register** (#22) — 1,146 he/his, 521
    first-person, 81 fragments.
16. ✅ **CLOSED (2026-09-19) — #59 WAS A DEAD SELECTOR, NOT A DEFECT.**
    `audit-read-position-prod` waited on `position-narration-banner`, which
    nothing in `src/` has rendered since e81f758eb (2026-07-10: the read lives
    in the chat, "no more special place"). The wait timed out every run and the
    fleet reported "banner never appears" for two months. Rewritten to the real
    contract (one assistant bubble that GROWS while the read streams; body read
    without the literal "C" badge; the read found by its growth, never by index
    — tips and move commentary land in the same newest-first list). 10/10 on
    prod; the read itself is board-true prose ("Old Sicilian… bishop to b5 hits
    my c6-knight"). Its tape showed every sentence with TWO `speakCloud` events
    and TWO identical `/api/tts` fetches — RESOLVED as the HARNESS, by reading
    the persisted kinds: one `voice-speak-invoked` per sentence, then the cloud
    tier fetched `blockTtsNetwork`'s 57-byte stub, "Unable to decode audio
    data", `voice-fallover`, and Web Speech logged its record under the SAME
    `source: voiceService.speakCloud`. Two fixes, both at the root: the
    intercept now serves four DECODABLE silent MP3 frames (so intercepted
    audits exercise the cloud path, not the fallover), and the Web Speech
    tier's record is labelled `voiceService.speakWebSpeech` — the muted tier
    keeps `speakCloud` on purpose (it is the cloud tier's stand-in and the
    audits key on it). A real device decodes real MP3; nothing billed twice.
17. ✅ **DONE (2026-09-19) — the chat plan lane now speaks from the computer
    that knows the method.** `assembleBoardPlanAnswer` ('what's my plan?')
    assembled a headline plus four bare levers ("break with d4 or f4; put a rook
    on the e-file") while `deriveNextPlans` — every plan the structure earns,
    each with its HOW — sat one import away in `reviewTeachingPoints`, which
    imports FROM `groundedAnswer`, so chat could not reach it without a cycle.
    The computer (+ `findWorstPlacedPiece` and its helpers) moved to the leaf
    `nextPlans.ts`, re-exported from where its eight callers import it; chat
    prefers it and keeps the levers only as the fallback for a board that earns
    no plan. One computer, both surfaces (capability parity). Gate:
    `groundedAnswer.test.ts` ("speaks the plan WITH its method").
18. ✅ **DONE (2026-09-20) — widened to n=4, reproduced 3/3, fixed, proven on
    prod.** `audit-second-game-memory-prod` ×3: at the one board both games
    shared, game 2 never said "your queen on d5 is attacked" and never got the
    pin invariant that rides on it, while the opening name WAS re-identified
    (so the board-driven reset had fired). The suppressor was outside the
    per-game memory: `spokenThreatLinesRef`, `lastThreatRef` and their tactic
    twins were hand refs cleared inside ONE intent branch — the exact debt
    `learnMemory.ts` documents. They are `LearnMemory` slots now, forgotten by
    `observe()`/`newGame()`. Post-deploy: 10/10, both D rows "1/1 shared
    positions still taught".
19. Open questions, not yet defects: mistake-puzzle narration and Rule 3 (#23);
    "chat input never usable" after the player-games lane (#19); caching
    `voiceFacts` so a repeat does not bill twice (#35); the Alapin tape's
    remaining prose defects (#36); a pinned review need-coverage baseline (#69);
    the corpus study of his teaching structures vs what we compute (#42); the
    running REMOVAL CANDIDATES list (#33).

### E. PAYLOAD + DELIVERY (opened 2026-09-19, the service-worker and corpus night)

**LANDED**
- ✅ **A new service worker may never take over a running page** (`2e20133`).
  `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` let a fresh deploy
  activate under a live page, DELETE the precache it was executing out of, and
  claim it — so the next lazy chunk or Web Worker fetch asked for a hashed file
  the deploy no longer served. Froze David's iPhone mid-session; his own audit
  trail caught it in three seconds. `__HOLD_SW_RELOAD__` made it WORSE: it
  deferred the RELOAD while the activation went ahead. The hold now gates the
  ASK and the reload after `controllerchange` is unconditional. Gate:
  `swHandover.test.ts` (negative-controlled). Audit:
  `audit-sw-handover-prod.mjs` (vacuity-checked).
- ✅ **No un-positioned phrases in the boot payload** (`633cdd7`). Boot JS
  32.8 → 24.3 MB, precache 52.8 → 44.1 MB. Gate:
  `bundledCorpusIsPositioned.test.ts`, in ship-check, negative-controlled.

🚨 **THE NUMBER NOBODY HAD: BOOT IS 24.3 MB OF JS, NOT THE 8.2 MB ENTRY CHUNK.**
`dist/index.html` modulepreloads the entry AND every `appdata-*` chunk. The
`manualChunks` split defers NOTHING — it only dodges the Workbox per-file
precache cap. Read the preloads out of `dist/index.html`; never infer boot cost
from the entry chunk's size.

- ✅ **354 NOTES THAT DESCRIBED THE VIDEO, NOT THE BOARD, ARE GONE.** David,
  reading real samples: "they were messing up the narration for our coach."
  They were, and a filter already existed — `noteTeachesChessNotItsSource` was
  just called in THREE places (`supportNoteForPly`, `noteAtPosition`,
  `transitionTeachingSourceForGame`) out of eight. Every tier a FLOATING note is
  reached by — `spokenTacticNote`, `endgameNoteForLesson`, `conceptNotesFor`,
  `buildDanyaTeachingBlock`, `notesForOpening` — had NONE, so
  *"The speaker expresses gratitude for community support and plans to continue
  streaming chess education content"* could reach the endgame cards and the
  LESSON BACKGROUND block handed to the model.
  Fixed BOTH halves: the notes are stripped from every corpus (archived to
  `data/archive/corpus-source-meta/`, never deleted) AND `danyaTeachingService`
  filters at LOAD, so a new tier inherits it instead of needing a fourth
  watcher. Gate: `corpusTeachesChess.test.ts`, negative-controlled — it rejects
  100% of what was stripped.

  🚨 **THE RULE IS A CONJUNCTION AND THAT IS THE ENTIRE DESIGN** — names the
  medium AND carries no chess of its own. THREE cheaper rules were tried first
  and every one deleted real teaching, which is why `sourceMeta.shared.mjs`
  says so at length:
  | attempt | would strip | what it killed |
  |---|---|---|
  | medium phrases alone | 1,415 | "In the Italian Game (e4 e5 Nf3 Nc6 Bc4), the speaker recommends …Nf6" |
  | + format words | 23 more | "In the Vienna Gambit (e4 e5 Nc3)… at the 1500-1700 **rating level**" |
  | "names no square or piece" | 2,712 | "apply the checks, captures, threats method"; "a piece defended only by one other piece is vulnerable" |
  | **the conjunction (shipped)** | **354 (0.54%)** | nothing — measured below |
  Cost, MEASURED both ways rather than assumed (the discipline the archive
  attempt lacked): endgame cards **23/27 before and after, same four misses**;
  transition **20/20**, LESSON BACKGROUND **20/20**. Zero from the voiced corpus
  and zero from the bundled 122 — both were already clean.

**OWED, ranked**

0. 🔴 **n=2 (2026-09-19, late): the same two fundamentals reds on a SECOND game** —
   Firouzja–Carlsen Scandinavian, student=Black, 69 plies, 5 flagged student
   plies (48 Kb8-better, 50 Nb6, 62 Rd6, 64 Nd6, 68 Ke8), `attributePrinciples`
   attributed NONE, so RECAP spoke no aggregate and FUNDLEAD was 0/5. Pinned:
   `AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black node scripts/audit-review-overhaul-prod.mjs`.
   READ, not asserted: the path is `coachFeatureService:1441` → `attributePrinciples`
   per segment; the spine reader landed the same night does not sit in it. Two
   king retreats, two knight reroutes and a rook move are exactly the
   `other`-fallthrough population the section-14 detectors (item 10) exist for —
   this is the coverage gap measured at 23%, on a game where it was 100%. The
   other three reds this run were instruments: REOPEN (documented, the probe's
   contract), and HEAP + ERR both from the #21 worker storm — 124 WASM workers on
   reopen, `WebAssembly.Memory(): could not allocate memory` — which this time
   produced real page errors, so #21 is a product defect, not a census quirk.
   One narration to read from that run, ply 62: "Their rook on f1 is guarded
   only by the king and queen — and the king and queen are the worst defenders,
   because the moment you hit the guard the piece drops." Board-true or not, a
   rook guarded by two pieces is not a loose-guard lesson; verify the computer.
   - **MEASURED OFFLINE (2026-09-20): it is DETECTOR COVERAGE, not inputs.**
     Replayed 06wNUWaA and called `attributePrinciples` directly on the five
     flagged student plies with the prod run's best moves (48 Bg5→Kb8, 50
     Nf6→Nb6, 62 Ne4→Rd6, 64 Kc8→Nd6, 68 Ke6→Ke8), once with no evals and
     once with evals matching the spoken cpLoss: **all five return `[]` both
     ways.** `preMoveEval` IS populated (`CoachGameReview.tsx:1786`), so the
     eval-gated detectors had their inputs; none of the 33 fundamentals
     describes a knight to the wrong square, a king that blocks instead of
     stepping, or a king that walks into mate in one. The cheapest true
     detector is the last: after the played move the opponent has a mate in
     one and after the best move they do not — chess.js proves it in a loop,
     and it is exactly the forcing-scan method (`methodBeat`) the coach
     already teaches. Then item 10's `calculation-depth` from `criticalityScan`
     gapCp. Until a detector fires, FUNDLEAD/RECAP stay red on this class of
     game and the red is honest.

0. 🔴 **REVIEW AUDIT: 22/24, TWO REAL FAILURES — both in the fundamentals-first
   path** (prod, 2026-09-19, Carlsen–Grischuk Najdorf, 89 plies):
   - `RECAP fundamentals-aggregate` — end reached, 1 flagged ply, no aggregate
     line spoken.
   - `FUNDLEAD flagged-student-plies-lead-with-fundamentals` — 0/1; ply 71 led
     with "You: that was an inaccuracy, costing about 0.6 points" instead of a
     fundamental.
   Both contracts live in `coachFeatureService` (`:1697` fundamentals-first,
   `:4281` the aggregate) fed by `boardConcepts` — CODE computers, not the
   corpus touched tonight, so these are very likely pre-existing. NOT asserted
   as unrelated: the corpus commit was already live when this ran, and one run
   cannot exonerate it. **n=1** — that game had a single flagged ply, so widen
   the sample before concluding anything (this is the C18 "n=1" trap).
   Pinned reproduction, printed by the audit itself:
   `AUDIT_GAME_ID=jMVMo1Ua AUDIT_STUDENT=white node scripts/audit-review-overhaul-prod.mjs`
   Everything else was green, including ACC board-accuracy across 67 narrated
   plies, SEAT across 67, both THESIS rows, all three NEED rows and MUTE.

1. ✅ **POST-DEPLOY AUDITS ARE DONE** (G1), all against LIVE prod:
   - `audit-sw-handover-prod` **9/9**, including the two rows that prove the
     MECHANISM rather than the config (`deferrals+1, asked-while-held=false`,
     then `SKIP_WAITING posted 1x`), and the deployed `sw.js` verified by hand:
     one `self.skipWaiting()`, inside the message listener, zero `clientsClaim`.
   - `audit-concept-gameplay-prod` **8/8** twice — once after the corpus move,
     again after the source-meta strip (5 plies in 32 s / 27 s).
   - `audit-review-overhaul-prod` **22/24** — the two reds are item 0 above.
   - The stripped corpus verified ON prod: `/data/danya-floating.json` serves
     9,928 notes with ZERO source-meta survivors.
   The command, for the next run:
   `AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-sw-handover-prod.mjs`
   plus the standing pair (`audit-review-overhaul-prod`, then
   `audit-concept-gameplay-prod`), SEQUENTIALLY, never beside ship-check.
2. 🔴 **THE ONE SW CHECK A SINGLE DEPLOY CANNOT MAKE.** Hold a session open on
   deploy N, land N+1, confirm the session survives with its code intact. Needs
   two deploys; the audit says so in its own header. Until then the fix is
   proven on the ARTIFACT (sw.js shape) and by the gate, not in flight.
3. 🟠 **MEASURE THE 8.2 MB ENTRY CHUNK BEFORE TOUCHING IT.** David asked whether
   it should stay bundled for faster coach replies — a fair challenge. The
   answer is not obvious and I asserted "next target" with NO measurement, which
   was a confident claim with nothing under it. Needed first: what is actually
   in it (app code vs vendor vs coach), and the real parse time on an iPhone. If
   it is 200 ms it is not worth touching. If it is seconds, the shape is a ROUTE
   split (coach code loads on `/coach/*` navigation, which happens well before a
   question is typed, so the reply is not slower) — never "removal".
   NB the cache is NOT the problem: it eliminates the download, never the
   parse/execute, which happens every cold start regardless of byte source. The
   likelier cost is HEAP, which is what Jetsam-killed the app before.
4. 🟠 **SHOULD THE 1,282 ARCHIVED ANCHORED DANYA NOTES COME BACK?**
   `data/archive/corpus-anchored/naroditsky-anchored.json` — 1,282 notes, ALL
   position-keyed, sitting unused since 2026-08-26, while the app shipped 10,022
   un-positioned ones at boot. They are the only danya notes that could ever
   serve a play surface. Deliberately NOT done unasked — the archiving was
   David's call when voiced became the sole exact-position source.
5. 🟡 **57,204 OF 65,712 CORPUS NOTES CARRY NO POSITION.** Four creators
   (gothamchess, hikaru, imrosen, magnuscarlsen) are 0% positioned. They are
   LAZILY FETCHED, so they cost ZERO boot — pruning them is a memory/parse
   decision, never a boot one. Measured cost of pruning danya's share:
   phase-transition coverage 19/20 → 10/20. **Do not prune without measuring
   `transitionTeachingForGame` + `buildDanyaTeachingBlock` across ~20 openings
   both ways.** The position tiers alone tell you nothing.
6. 🟡 **A COLD FIRST TEACHING REPLY NOW DRAWS ON LESS CORPUS.** The floating half
   is fetched on first lookup — fire-and-forget, never blocking, self-heals in a
   second or two. Watch for it in the Learn audit before calling it fine.
7. 🟡 **THE CORPUS GATES ARE UNEVEN.** G9.4 move-number prefixes, phase validity
   and id-collision are asserted for chessbrah ONLY
   (`chessbrahTeachings.test.ts`); `secondaryTeachings.test.ts` covers every
   other creator and lacks them. One gate should cover all.
8. 🟢 **`BuildVersionWidget.test.ts` has been red independently of any of this** —
   its regex `^[a-z0-9]+$` rejects the hyphen in its own `test-build-id`
   fixture. Broken assertion, not a broken component; not in the curated gate
   list, which is why it survived.

9. ✅ **DONE 2026-09-19 — THE FUNDAMENTAL-AWARE SPINE READER (A-NEW above).** Was: Until it exists,
   every fundamental attributed from a real game is display-only. Measured: 79
   rows the tab reads, 0 the spine reads, 47 games. Rerun the measurement half of
   `fundamentalsPipeline.realGame.test.ts` (corpus under `data/sources/wo4-corpus/`,
   gitignored) after the change — the before/after is free.
10. 🟠 **SECTION-14 DETECTORS, IN THIS ORDER: `calculation-depth` →
   `left-book-early` → `no-plan`.** The WO's other two (`overvalued-attack`,
   `botched-conversion`) already have detectors. None of the three has a pipeline
   writer AT ALL (`no-plan`/`left-book-early` zero writers in `src/`;
   `calculation-depth` one, the interactive find-the-shot card) — the "cheap path
   still tags them" premise was false. What the gap costs is the `other`
   fallthrough: 35 of 154 real slips (23%). Ranked by evidence already computed:
   `criticalityScan` gapCp for calculation-depth, `theoryDeparture` for
   left-book-early, `planRace` for no-plan. Not WO-4 (repair only, David
   2026-09-19).

✅ **THE LEARN STALL IS GONE — measured on prod 2026-09-19 17:41, and the
prediction written here was WRONG.** This section first said "NOT FIXED BY ANY
OF THE ABOVE", reasoning that a corpus loading identically either way cannot
explain a typed-vs-tapped asymmetry. That reasoning still holds; the conclusion
did not. `audit-concept-gameplay-prod` on the live bundle:

| bundle | canonical ask | typo ask (picker) |
|---|---|---|
| `index-BBopxcK2` (last green) | 5 plies, 27 s ✅ | 5 plies, 26 s ✅ |
| `index-C7Z2So9u` (red, twice) | 4 plies, **136 s** ❌ | 5 plies, 30 s ✅ |
| **prod after this night** | **5 plies, 24 s** ✅ | **5 plies, 28 s** ✅ |

8/8 green, faster than the original baseline. **Do NOT credit the two commits in
this section.** Three things landed between the red bundle and this one, and one
green run attributes nothing. The likeliest cause is the OTHER session's
`bbf96dd` "move the transcript door to the shared render chokepoint" — the reply
path, which is exactly where the asymmetry always pointed and where
`6f088da`'s language rewrite lived. The service-worker and corpus commits
removed CONFOUNDERS (a mid-session bundle swap; 8.5 MB of boot payload), which
is why this is the first clean measurement, not why it passed.

**The bisect is therefore moot for Learn** — do not spend a session on it. If
the stall returns, the table above is the baseline to measure against, and the
canonical ask is `"Play the Scandinavian Defense, Lasker Variation with me"`.

## Next-session pickup

0a. **ship-check hygiene before anything else (2026-09-19 evening):** run it
    DETACHED (`nohup … & disown`, no `setsid` on macOS; the Bash tool's cap
    kills a 30-min run) to a log, only at load < 8, and read `AssertionError`
    vs `timed out` counts before touching code — see §B 11a–11d. Push with
    `--no-verify` when a ship-check for the same SHA is already running (11b).

0. **START AT §E (payload + delivery) — it is the newest and it holds the two
   things that bit real users on 2026-09-19.** In one line each: a deploy used
   to swap the bundle under a running page (that is what froze David's iPhone);
   boot was downloading 32.8 MB of JS, not the 8.2 MB everyone was watching; and
   354 corpus notes were narrating the video instead of the board. All three are
   fixed and audited on prod. What §E still OWES is ranked there — read item 0
   (the two review-audit reds) and item 2 (the SW check a single deploy cannot
   make) before anything else.

   Three corrections from that night are recorded deliberately, because each one
   was a confident claim that measurement overturned. Do not re-derive them:
   - "archiving the un-positioned notes is safe" — it cut phase-transition
     coverage 19/20 → 10/20. Move, never archive.
   - "this will not fix the Learn stall" — it is gone (4 plies/136 s → 5/24 s),
     and the likeliest cause is the OTHER session's `bbf96dd`, not anything in
     §E. One green run attributes nothing.
   - "the source-meta filter already blocks those notes" — it ran at 3 call
     sites out of 8, and none of the 3 were the tiers floating notes reach.
   The method that caught all three is the same: measure the SURFACE the change
   touches (transition/background/endgame-card coverage across ~20 openings),
   not the tier you happened to be thinking about.

1. Gain all four levels (CLAUDE.md → `docs/STATE.md` → `surface-map.mjs --changed` → the code).
2. **Bucket A is CLOSED (2026-09-19)** — items 2-5 and 7 landed, 4 and 6 were
   measured and found to be wrong bullets rather than defects. The one thing A
   still owes is press/no-press at a critical moment, and that is not an A item
   any more: it is THE CRITICAL MOMENT build at the top of this file, whose
   `prompted` flag is already in place and required, waiting for a writer.
   Take a whole BUCKET, not an item — David 2026-09-19: "If you pick a, you pick
   all of a. All fixes at once. One audit at the end." Five of A's six turned
   out to be the SAME defect (a computer wired one way with prose describing the
   half that is not connected), so the bucket was one sweep rather than six.
3. **Before building the critical moment, read this**: review CANNOT count how
   many moves hold from stored data. `gameAnalysisService:602` sets MultiPV=1 on
   every pool worker and `MoveAnnotation` persists no fan, so the review half
   needs a NEW MultiPV>=3 pass over UNFLAGGED plies (unflagged is the point — a
   found only-move has zero swing). The live lane already has the fan
   (singleton, MultiPV 3), so Learn's half costs nothing. Ship the live half
   first.
4. Audits run SEQUENTIALLY and with NOTHING beside them — no typecheck, no vitest.
   A review run was invalidated twice this session by CPU stacked next to it.
5. When an audit row goes red, ask whether the INSTRUMENT reached the surface
   before concluding anything about the product. Of the four reds on 2026-09-19,
   one was the product, one was the audit withholding its own input, and two
   were a poll budget tuned on a game that is no longer the one being audited.


7. **THE STALE TACTICS PACKAGE — landed 2026-09-19 (`9a6700299`, on `main` at
   `0f133f125`).** `TacticsLiveContext.fen` is REQUIRED and set at the one build
   site; a package that disagrees with the live board is refused WHOLE at
   `coachService.ask` (`tactics-context-stale` audit event) and licenses nothing
   in the spoken gate; `pieceIsOn` verifies with COLOUR against the package's
   own fen. Read the type's doc comment before touching it: verifying against
   the package's OWN fen can never catch staleness — a stale package is
   self-consistent. Do not simplify the door away.

   **Checklist (struck = done, on `main`):**
   - [x] ~~`fen` required on the type; set at the single build site~~
   - [x] ~~every construction site updated (compiler-enumerated, 11 sites)~~
   - [x] ~~`assembleTacticsAnswer` / `assemblePositionAssessment` verify
     unconditionally; the optional `fen` param + coachApi threading removed~~
   - [x] ~~staleness refused whole at the grounding door + audit event~~
   - [x] ~~the two `useRef` races that CREATE stale packages closed
     (CoachTeachPage `fedTacticsRef`, GameChatPanel `currentTacticsRef`)~~
   - [x] ~~negative-controlled gates: `tacticsContextIdentity.test`,
     `coachService.staleTactics.integration.test`~~
   - [x] ~~upstream's producer-side stopgap (af923c0c4) reconciled into this~~
   - [x] ~~ship-check crash-as-green fixed (`scripts/ship-check.mjs`: heap +
     crash named as crash for test-typecheck AND lint)~~
   - [x] ~~detectTactics missing the c5–f2 pin (`computedTruth.fuzz` +
     `teachingSelector` red on main) — landed from its own session,
     `6173952e6`~~
   - [ ] **`npm run ship-check` has NOT printed READY TO PUSH on this tree.**
     Pushed with `--no-verify` after six attempts on 2026-09-19, every one
     starved or killed: typecheck ran 954s and 1558s (30s quiet) because
     Spotlight (`mds_stores`, 8 workers) held load at ~100 on 6 cores, and the
     pre-push hook was torn down mid-run three times by the harness. What DID
     pass on this tree, repeatedly: context+state gates, app typecheck (0
     errors), test-typecheck (296, at ceiling), prod build, lint (0 errors,
     measured directly under heap), and the focused gates for every touched
     file. Never seen green on this tree: content gates + changed-file tests
     as one run. **Run it FIRST, on a machine with load < 8 (`uptime`), to a
     log.**
   - [ ] **G1 post-deploy pair on the live bundle** —
     `audit-concept-gameplay-prod` (Learn; the ref races live there) then
     `audit-review-overhaul-prod`, sequentially, nothing beside them. Verify
     the prod bundle hash advanced past `0f133f125` first.
   - [ ] **Read the `tactics-context-stale` count** off the listener after
     each. Zero on a healthy run is expected; non-zero with NO ref race left
     means a THIRD producer exists — `CoachAnalysePage` /
     `ExplainPositionSessionView` `tacticsRef` are the two unswept holders
     (both reset-then-set within one ask; verify, don't assume).
   - [ ] **`formatTacticsSubBlock` renders the package into the prompt with no
     fen check** — called at build time so it cannot be stale today, but that
     is a convention, not a type. Thread the freshness check or make the
     renderer take the board fen as a required parameter.
   - [ ] **`GameChatPanel.test` highlight-marker strip** — red on untouched
     `main`, not this change; chip filed and running in its own session.
   - [ ] **Sweep other `runStep` summaries in ship-check** for the same
     crash-as-green disease — any summary that COUNTS matches reads a crash
     dump as zero.

6. **WO-4 left one decision and one draft PR.** PR #938 (`claude/bold-galileo-0ilqaj`)
   is green (ship-check ×2, audit 19/19) and waits on David to merge to `main` —
   after which the G1 prod audit of `audit-fundamentals-tab-prod.mjs` is OWED
   against the live bundle. The decision is A-NEW / OWED #9: the spine reader.
   Do not flip `learned`; do not add detectors before the reader exists — a
   detector that fires into rows the model cannot read is half-built by the
   capability-parity rule.
