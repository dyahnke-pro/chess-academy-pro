# The 1:1 Coach — Diagnose · Explain · Drill Shut

**David 2026-08-26.** The full plan for the "coach me in what I'm weakest at"
build. This doc is the authoritative record of everything discussed — nothing
left out. It is honest about what the app CAN and CANNOT deliver (no yes-man),
grounded in the 2026-08-26 coach-surface map (four-agent audit of routes, brain,
lesson delivery, data pipelines).

> **The slogan (David, locked):** **LEARN · PLAY · IDENTIFY WEAKNESSES · DRILL
> THEM SHUT.** "Drilled shut" = the completion state of a weakness (pattern
> count → 0 / its SRS reps retired). The coach's voice for surfacing one is
> *"I see consistent mistakes — let's drill them shut"* — never soft ("you keep
> doing X").

---

## 1. The thesis (why this shape, honestly)

The app **cannot** be a real coach in the relational / open-conversational
sense, and chasing that is the trap — faking it (canned praise, invented chess
facts) makes it feel *less* like a coach. It **can** deliver what a human coach
can't scale: a tireless **diagnostic-and-drill loop** grounded in every game
you've played — it remembers every mistake and re-tests you forever. Done right
that feels like a coach with a photographic memory of your whole chess life.

**The build is: surface + scale + deepen the loop we already have — not fake the
human.** The single most important finding of the audit: the hard part is
already built and David loves it (the **My Mistake** engine), it's just buried
and the coach never drives it.

## 2. The loop (every step is deliverable on existing mechanisms)

1. **Diagnose** — `getUnifiedWeaknessProfile()` ranks your patterns from YOUR
   games. **Recency-weighted** so it only calls out mistakes from your *last
   games*, never a 6-month-old one that's probably self-corrected (rows carry
   `lastSeenAt`).
2. **Initiate** — the coach speaks first, from the opening coach-tab prompt:
   *"Name an opening, or let's reduce the [removal-of-the-guard] mistake I've
   seen in your last 3 games."* Relevant → feels like something to fix now.
3. **Show the evidence FIRST** — not "here are 3 similar puzzles." It shows YOUR
   actual instances: *"here are the 4 times you did this, from these games"*
   (the weakness's own `positions[]`). You SEE the coach was right before it
   asks you to trust it — positive reinforcement of the coach's accuracy.
4. **Explain (mandatory Danya 4-layer, §4)** — the exact mechanic you missed,
   why it works, that it's your Nth time, and the fix.
5. **Drill** — the My Mistake engine re-solves your exact positions, then the
   tactics tab pulls fresh reps of the **same pattern** (`puzzleThemes`).
6. **Drill shut + follow up** — SRS re-schedules; the coach re-tests next
   session; when the pattern count hits 0 it's **"drilled shut."**

## 3. What ALREADY EXISTS (do NOT rebuild — the load-bearing inventory)

- **The My Mistake engine** — `coachDrillService` / `buildMistakeDrillQueue` →
  `CoachDrill` (`setupFen` + `solutionSan`). `startMistakeDrills`
  (`CoachTeachPage.tsx`) already: replays to the position, names the mistake,
  asks for the best move, SRS-graded, most-common-weakness-first. Surfaced at
  **`/tactics/mistakes` (`MyMistakesPage`), pinned to the TOP** of the tactics
  grid. **Confirmed: yes, mistakes are under the tactics tab.**
- **Weakness profile** — `getUnifiedWeaknessProfile()` (`weaknessSpine.ts`)
  returns ranked `UnifiedWeakness[]`, each with `positions[{fen, playedSan,
  bestSan}]` (up to 8 — the evidence), `puzzleThemes[]` (fresh reps), `severity`,
  `openCount`, `total`, `lastSeenAt`.
- **Fresh reps** — `getPuzzlesByTheme(theme, N)` / `getPuzzleForThemeAtRating`
  (`puzzleService.ts`) pull puzzles.json reps of a pattern.
- **The computed voice stack** (built + on `main`): `criticality.ts` (sharpness
  score) · `narrationImportance.ts` (speak/rank verdict, rating-scaled,
  contested gate) · `threatOut.ts` (must-defend, null-move probe) ·
  `perturbation.ts` (leans-on / load-bearing piece) · `positionFacts.ts`
  (composer → kind-tagged DNA clauses). Wired into 5 surfaces: Learn
  (`CoachTeachPage`), read-position (`usePositionNarration`), phase
  (`usePhaseNarration`), play-live (`useLiveCoach` extraFacts), hints
  (`useHintSystem` T2/T3). Opening-phase gated (middlegame-only campaign talk).
- **The chokepoint** — `voiceFacts` (`coachApi.ts`): LLM only phrases computed
  facts; registers = live ("sitting next to you") + review (tape review);
  `preferRaw` speaks computed prose verbatim.
- **Board-fact detectors** — `boardConcepts.ts` (outpost / pawn-break / open-file
  / piece-activity / development / simplification), `detectTactics` /
  `tacticClassifier` (fork / pin / skewer / discovery / removal-of-guard /
  back-rank), `perturbation` (best piece + what it leans on).

## 4.0 THE KEYSTONE — broadcast → one-sided discussion (David, locked, emphatic)

**The single realization the whole voice build turns on.** Danya has a
**one-sided discussion** with his viewers; **we broadcast.** Every scattered gap
— the opponent as an agent, the tempting wrong move, the reaction, the arc "with
a destination" (David first read *destination* as *discussion* — that reframe IS
the fix) — is one root: he's in a conversation, we deliver a bulletin.

**It's literal in the architecture, not a metaphor.** `voiceFacts` is a one-shot
broadcast: "here's the fact package, voice all of it in order, add nothing, the
student may move before you finish." No memory of the last move, no model of what
the student is wondering, no turn. Structurally a monologue. Danya's is a
**stateful, one-sided discussion** — he anticipates your half, reacts, calls
back; he doesn't need you to talk back because he *imagines your side and answers
it.*

**THE UNLOCK — we compute the entire deliberation and then throw it away.** Every
position we run the MultiPV fan — the top candidates and why each falls short.
**That IS the discussion:** "Knight f3? No, drops the pawn. Bishop d3? Solid but
slow. It's got to be this." Danya speaks that weighing out loud — the whole
charm. We compute all of it and speak only the winner, as a bare fact. The
tempting move you'd have played and why it's wrong is already in hand
(`moveReasonOptions` computes "what a player would be tempted to think here").
**We're not missing the data for the discussion — we delete it before we speak.**

**The build frame (all downstream of this):**
1. **Narrate the WEIGHING, not the conclusion** — speak the top **3 (maybe 4)
   candidates** from the fan (David's call on depth) + why each falls short, then
   the move. Not the whole 5-fan; the first 3–4.
2. **Voice the listener's half** — the temptation / the question the student has
   here (from `moveReasonOptions` + the natural-but-wrong move), then answer it.
3. **Make the voice STATEFUL** — narration memory across moves so it can set up
   and pay off (the "destination"/through-line, callbacks). Today it's per-ply
   memoryless — that's the structural gap for the arc.
4. **React** — the good register already permits it ("clean", "that's nasty");
   the flat tiers (§4b-tiers) don't reach the coaching-you surfaces. Fix the
   routing, not the prompt.

All four are computed (G0 intact): the weighing is the fan; the temptation is
`moveReasonOptions`; the state is our own move history; the reaction is bounded
warmth the register already allows. Nothing invented — deliberation *spoken*, not
manufactured.

### 4b-tiers. WHERE the voice is actually flat (grounded — the good voice is walled off)

Four production tiers of voice, discovered by tracing `voiceFacts` callers:
- **RAW (`preferRaw`, no LLM):** weaknesses, mistakes summary, stats, strengths,
  opening-accuracy, best-move, move-rating — the entire coach-**about-you**
  surface. Spoken as a raw computed string. Zero Danya. **Deliberate tradeoff:**
  `preferRaw` is instant and guarantees numbers/SAN survive verbatim ("warmth
  needs the phrasing model, not a raw echo") — fidelity + speed picked over voice.
- **STERILE (default register):** the actual **mistake-puzzle narration**
  (`voiceMistakeNarration`, intent `mistake-review`, no `warm`) → the flat "one
  or two friendly sentences" prompt. The crown-jewel drill speaks flat.
- **DANYA (`warm: true`):** opening sections, middlegame plans, model-game
  annotations, the review walk. The rich voice — reserved for **content**, not
  for coaching you.
- **TEMPLATE (`voiceService.speak`, bypasses `voiceFacts`):** in-game move
  commentary (`USE_LLM_MOVE_COMMENTARY = false`).

**The fix (the pattern already exists):** route the coaching-you surfaces
(weakness / mistakes / drill / in-game) through the **Danya register** with
`mustPreserve` protecting the numbers/SAN (the mistake path already uses
`mustPreserve`) — so we get voice without the fidelity risk `preferRaw` guarded
— AND enrich their fact packages (§4a) so the register has depth to phrase. Not
"write a better prompt" (the prompt is good) — stop spending the good voice only
on openings, point it at the student, feed it the weighing.

## 4. The MANDATORY voice package — the FULL general's briefing, EVERYWHERE

**David, emphatic: the voice must be spoken at EVERY narration — lesson, review,
in-game, in-game, in-game. Everywhere. Mandatory.** And: **"it's not just a
4-layer voice — many things are missing."** He's right. "4 layers" was a lossy
compression. The real, locked spec is the **general's briefing hierarchy** from
`docs/plans/2026-08-26-position-facts-calculator.md` — the OFFLINE calculator
(`scripts/voiced-authoring/position-facts.mjs` + `render-briefing.mjs`) already
computes ALL of it and it's validated (Kramnik / MVL / Nepo). **The bug is that
the RUNTIME voice is a stripped port of it (see §4b) and speaking it was never
mandatory** — the My Mistake drill even speaks a code template via
`voiceService.speak`, OUTSIDE the `voiceFacts`/DNA gate.

### 4a. The full package — the general's briefing hierarchy (ranked, no hard cap)

Every spoken moment is built from these, most-important-first; the vital never
drops, the voice flexes depth. This is what MUST be computed and handed to the
DNA register:

1. **STATUS** — eval + WDL, **band-change only** ("who's winning, and did that
   just change"). Not re-read every ply.
2. **INCOMING FIRE — the threat CALCULATED OUT** — the opponent's PV *played
   out* (flipped-FEN null-move search), **plus LATENT threats 2–3 ply down the
   road** (not just the immediate one), plus what's hanging (SEE). Carries
   `landsAt` — the ply the material actually falls. This is the **must-defend**
   signal (`threatOut`).
3. **THE MOVE + WHY** — the best move IS the PV. The **why carries the
   move-reason classification**, not just a cpLoss label: `hung-piece` (SEE) /
   `ignored-threat` / `walked-into-tactic` / `missed-forcing-win` /
   `lost-the-thread` / `only-move` / `defends-threat` / `wins-material` /
   `imprecise-defence` / `best` / `solid` / `second-best`. **TEACH-BOTH baked in
   for bad moves** (the practical line + the sound refutation, *played out*).
4. **IS IT FORCED?** — only-move vs quiet-choice (MultiPV gap / **criticality
   score**). The "this is the moment — slow down" beat.
5. **STATE OF FORCES** — best/worst piece + **WHY it's strong** (`pieceValueRead`
   + `perturbation` "leans on" — the load-bearing supporter), weak squares, the
   structure. Both sides.
6. **THE CAMPAIGN** — where it's heading: **structure → plan** (IQP / hanging
   pawns / Carlsbad / closed centre → the canonical plan for BOTH sides) + the
   **PV trajectory** (play the line out).

### 4b. Cross-cutting rules that ALSO belong in every spoken moment (were missing)

- **Play the line OUT** — don't just name the better move; play the Stockfish PV
  forward with the **why spoken per move** ("…knight to d5, hitting the weak
  square; now the rook lifts…"). Every candidate carries a short PV ("if the
  knight takes, then…").
- **Refutation played out** — after a mistake, the opponent's *punishing* PV
  (why the move actually failed), from the after-search or the in-fan candidate.
- **The criticality score does 4 jobs**, one signal: the deep-search gate, the
  "key moment / don't rush" beat, AND the silence-when-quiet gate.
- **Prospective vs retrospective are DIFFERENT signals** (do not conflate):
  criticality = "this is sharp NOW"; cpLoss/label = "that WAS a slip";
  must-defend = "the opponent has a concrete standing threat." Three distinct
  jobs.
- **Say-once for standing facts** — forces / structure / edge stated when they
  first appear or CHANGE, never re-read every ply (`pieceValueRead`'s pattern).
- **Both sides / opponent's intent** — explain what THEY are doing, not only your
  error (David's explicit add).
- **Both registers, not blurred** — in-game present-tense live teaching
  ("White develops, eyeing the centre; Black answers…") vs post-game
  retrospective ("you played X, the best was Y"). Locked distinct (CLAUDE.md
  2026-07-19). The review turning-point speaks the retrospective register.
- **The corpus note LEADS when one exists** — 90% of what should be said lives in
  the farmed/voiced notes (`teachingNoteForBoard` exact-position); the detectors
  above are the other ~10% (the urgent board-computed interrupts). Splice the
  note first, computed layers behind it.
- **The Narration Voice Rules** (CLAUDE.md) — concrete over generic (name a
  square/piece/concept every sentence); **name the PATTERN, not the move** ("the
  Greek gift", "removal of the guard", not the SAN); never reference the
  interface; don't restate the board; **silence is acceptable**; ban
  acknowledgments ("great job!"); ban first-person/meta; vary stems; no length
  floor.
- **Board-verified, never padded** — every clause true on the board; **do NOT
  overstate the why** — no non-applicable reasons (David 2026-07-19). Where a
  component is genuinely absent → **terse**, never LLM-filled (the G0 failure
  that reads robotic-or-fake).
- **The importance gate decides WHETHER it speaks** — rating-scaled
  decision-leverage + the contested (WDL) gate. A swing in a decided game is
  silent.

### 4c. The My-Mistake-specific layers (on top of the briefing, for a drill)

- **Pattern + Nth-time** — the motif, and that it's your Nth time (the weakness
  count). "This is the 4th time."
- **The FIX** — what to look for next time (`boardConcepts`).
- **The evidence** — your own prior instances shown as proof (§ evidence-first).

**Depth = computed components; the DNA register phrases them, it does not create
them.** David's fear ("even with DNA it'll be missing") is answered by making the
FULL package computed and mandatory — not by trusting the register to fill gaps.

### 4b-gap. THE OUTLINE IS FAR BETTER THAN THE PRODUCT (David) — the runtime gap

The offline `position-facts.mjs` + `render-briefing.mjs` compute the FULL §4a/4b
briefing and it's validated. The **runtime** port `src/services/positionFacts.ts`
carries only a SUBSET: criticality + importance + must-defend + leans-on + a few
clauses (must-defend / key-moment / opponent-intent / student-leans /
opponent-leans / convert). **Missing at runtime today:** STATUS band-change,
threat CALCULATED OUT with `landsAt` + latent threats, THE MOVE + WHY with the
move-reason classification, teach-both, refutation-played-out, candidate PVs,
play-the-line-out, structure→plan, PV-trajectory campaign, say-once standing
facts, corpus-note-leads. **The mandatory-DNA work is: close this runtime gap —
port the missing briefing components from the proven offline calculator into
`positionFacts.ts`, then make the full package mandatory through `voiceFacts` on
every surface** (including the light-grounding-builder surfaces — voice /
masterclass — which today also miss the fundamentals/famous-game/hint/
alternatives/gameMistake lanes).

## 5. The honest CAN / CANNOT (updated with David's pushback)

| A real coach… | Verdict | Mechanism / honest residual |
|---|---|---|
| Remembers every game + recurring mistakes | **CAN** | `getUnifiedWeaknessProfile`. The app's real strength. |
| Decides what you work on, speaks first | **CAN (not wired)** | Data ranks it; coach reads it only when asked. Missing: **initiation**. |
| Pulls up YOUR game, shows the moment, asks the move | **CAN — built + loved** | The My Mistake engine. |
| Fresh reps of that exact pattern | **CAN** | Tactics tab, `puzzleThemes`. |
| Explains WHY, deeply | **CAN (if computed)** | The 4-layer package (§4). Terse where a layer's absent. |
| Assigns homework, checks next week | **CAN (under-used)** | SRS re-schedules. |
| Hold a coaching conversation | **CAN — David corrected me** | Chat + mic + memory exist; the claim-validator only blocks *invented chess facts*, NOT conversation/motivation. |
| Sense frustration / discouragement | **CAN (heuristic)** | Behavioral signals: repeated wrong, hint-mashing, rage-quit a drill, tilt streak after losses, "this is hard" in text. **Residual: heuristic, not empathy — it reads behavior, doesn't *understand* you.** |
| A pedagogical arc across months | **CAN step closer** | A persistent curriculum object (§8). **Residual: derived from your mistakes, not a human's intuition about where you're headed.** |
| Watch you play, interrupt live | **PARTIAL / off by choice** | Slip-detector + blunder card exist; `useLiveCoach` hard-disabled; the interruptive "why did you play that" picker was **removed by David**. Diagnosis is post-game. |
| Truly read you as a person | **CANNOT** | No model of you as a person. The honest ceiling. Don't fake it. |

## 6. New weakness dimensions David added

- **Position transformation** — trading pieces to favor YOU, not the opponent.
  Computable: `perturbation` already IDs your best piece and theirs; a trade that
  removes YOUR best piece (or keeps your bad one for their good one) is a
  detectable, recurring weakness. **New dimension — add a detector + a weakness
  tag.**
- (Positional weakness in general is currently under-fed — see §7.)

## 7. Data-plumbing reality + the under-feeding fix

The profile is only as good as what feeds it. Audit findings:
- **Import analysis logs misconceptions as `counted: false`** → they're
  display-only (Thinking Errors tab) and **excluded from the counted weakness
  profile**. The dominant import faucet under-feeds the profile.
- **The mistake-puzzle faucet is tactically gated** (`CP_LOSS_THRESHOLD=150` +
  a concrete-tactic requirement) → **positional slips are dropped** unless routed
  through the positional path. So positional weaknesses (David's "positional
  weakness is huge") are under-represented.
- **Fix (Phase 4):** make counted misconceptions include real positional
  patterns from import; capture positional misses (including position-
  transformation) so the profile reflects them, not just tactics.

## 8. Stepping closer to a pedagogical arc (the curriculum object)

Not a human's intuition — a **persistent, data-driven arc**:
- Picks your top 1-2 weaknesses (recency + severity ranked).
- Sets a **mastery target** per weakness = "drilled shut" (pattern count → 0 /
  SRS reps retired).
- **Sequences** them ("this month: removal-of-guard; then: rook endgames").
- **Advances** to the next when one closes; tracks the arc across sessions.
- Persisted (Dexie), surfaced in the training plan + the opening coach prompt.
Residual (honest): it's derived from your mistakes, not a coach's forward
intuition — but "close X, then Y" is a real arc.

## 9. More computed depth to feed the voice (David: "what else can we add?")

All detectable, all feed the 4-layer package:
- **Missed *plan*, not just missed move** — your move's plan vs the engine PV's
  plan (why the whole idea was wrong, not just the square).
- **Ignored threat / prophylaxis** — the null-move probe (`threatOut`) already
  finds the threat you're not meeting ("you're attacking; they're about to break
  — deal with it first").
- **Favorable-trade / position-transformation** (§6).
- **King-safety trajectory** — your pawn-shield decaying over the game.
- **Board-vision blind spots** — the heatmap already flags squares you miss.
- **Initiative / tempo** — moves that hand the opponent a free tempo.

## 10. The "Why?" button (end-of-build check — David)

The "Why?" button **does still exist** on `/coach/play` (`why-button`,
`CoachGamePage.tsx` — injects a prompt into game chat). **TODO at the very end:**
verify it's live + working on every surface it should be, and route the new
computed voice (the 4-layer package) into it so "why?" answers in Danya's voice,
not a generic prompt.

---

## 11. Phases (deliverable order)

**Phase 1 comes first — David: "start with the mandatory DNA phrasing THAT
SHOULD HAVE BEEN DONE ALREADY."**

> **SLICE 1 LANDED (2026-08-26): the deliberation voice.** `src/services/
> deliberation.ts` — `buildDeliberation` turns the MultiPV fan into the weighing
> (top 3, maybe 4 candidates + why each falls short: drops-material board-true /
> clearly-worse / less-precise), `deliberationFacts` renders it. Wired into
> `positionFacts.ts` as the top-ranked (`rank 95`, leads) `deliberation` clause,
> firing only on a genuine STUDENT-to-move choice out of the opening — so it
> reaches every surface already routed through the voice (hints, read-position,
> live play at your turn, Learn pre-move). 6 + 8 tests green. This is the
> keystone (§4.0) made real: we stop deleting the deliberation and speak it.
> NEXT slices: voice the listener's half (temptation, from `moveReasonOptions`);
> stateful narration (callback/through-line); route the coaching-you surfaces off
> `preferRaw`/sterile into the Danya register (§4b-tiers).

- **Phase 1 — Close the runtime voice gap + make the full package mandatory
  everywhere (§4).** Port the missing general's-briefing components from the
  proven offline `position-facts.mjs` / `render-briefing.mjs` into runtime
  `positionFacts.ts` (STATUS band-change, threat-calculated-out + `landsAt` +
  latent, MOVE+WHY with move-reason class, teach-both, refutation-played-out,
  candidate PVs, play-the-line-out, structure→plan, PV-trajectory, say-once
  standing facts, corpus-note-leads). Then route EVERY spoken narration through
  `voiceFacts` with this package — mandatory, no more optional. Ship in slices
  (one briefing component at a time, each gated + audited), NOT one mega-change.
  Files: `positionFacts.ts` (+ new sibling computers ported from the mjs),
  `voiceFacts` (`coachApi.ts`), the 5 wired surfaces + review + the light
  grounding builder (`questionIntents.buildQuestionGrounding`) + the My Mistake
  drill (replace its `voiceService.speak` template). `pending`
- **Phase 2 — Coach initiates the loop.** The recency-weighted opening prompt
  ("name an opening, or reduce your X from the last 3 games") → evidence-first My
  Mistake loop → "drilled shut." Files: coach-tab entry prompt (`CoachHomePage` /
  `SmartSearchBar` / `CoachChatPage` greeting), `getUnifiedWeaknessProfile`
  (recency-filter `lastSeenAt`), `startMistakeDrills`. `pending`
- **Phase 3 — Evidence-first + tactics tab scoped to the weakness.** Show YOUR
  instances (`positions[]`) as proof, then fresh `puzzleThemes` reps. Say
  "drilled shut" at closure. Files: `MyMistakesPage`, `getPuzzlesByTheme`,
  `weaknessSpine`. `pending`
- **Phase 4 — Fix the under-feeding.** Count positional misconceptions; capture
  positional misses incl. position-transformation. Files: `autoAnalyzeGame`
  (`counted:false`), `mistakePuzzleService` (tactical gate), a new
  position-transformation detector. `pending`
- **Phase 5 — Review depth.** Turning-point "what it hinged on" via
  `positionFacts` in the retrospective register (`reviewTurningPoint` /
  `CoachGameReview`). `pending`
- **Phase 6 — Conversation + frustration heuristics.** Behavioral frustration
  signals (repeated wrong / hint-mash / rage-quit / tilt / "this is hard") →
  the coach adapts tone + eases/pushes. Files: chat + mic + memory stores,
  `discussionPractice`, drill-attempt telemetry. `pending`
- **Phase 7 — The curriculum arc.** The persistent curriculum object (§8).
  Files: a new `coachCurriculum` service + Dexie store, `weaknessSpine`,
  training plan. `pending`
- **Phase 8 (end) — Why button + depth additions.** Verify/repair the Why button
  + route computed voice; add the §9 depth signals. `pending`

Each phase (and each Phase-1 slice) ships to `main` on its own (contained,
gated, audited per the touched surface). G1 post-deploy audit after each.

## 12. What we will NOT do (anti-oversell)

- NOT build a new "custom lesson generator" — the My Mistake engine IS the
  lesson (no builder stitches arbitrary FENs into one narrated lesson today, and
  we don't need one; drilling each position independently is correct).
- NOT fake live "react as you play" beyond the existing (David-disabled) slip
  detector.
- NOT promise conversational *chess-fact* answers outside the grounded lanes (the
  validator correctly blocks invented facts); conversation about motivation/meta
  is fine.
- NOT decompose eval into per-theme attribution (not computable) — show the real
  total cp of the detected moments.
- NOT fake empathy — frustration is a behavioral heuristic, labeled as such.

## 13. Decisions log

- **2026-08-26** The "custom lesson" IS the My Mistake engine surfaced + scaled,
  not a new generator.
- **2026-08-26** Slogan: LEARN · PLAY · IDENTIFY WEAKNESSES · DRILL THEM SHUT.
  Voice: "I see consistent mistakes — let's drill them shut."
- **2026-08-26** Initiation is recency-weighted (last ~3 games only).
- **2026-08-26** Evidence-first: show the student's OWN instances as proof before
  drilling.
- **2026-08-26** The 4-layer Danya voice is MANDATORY at every narration
  everywhere; terse (never LLM-filled) where a layer is genuinely absent.
- **2026-08-26** Conversation + frustration ARE deliverable (chat/mic/memory +
  behavioral heuristics); the residual limit is heuristic ≠ empathy.
- **2026-08-26** A data-driven curriculum arc is deliverable; residual is
  derived-from-mistakes ≠ human forward intuition.
- **2026-08-26** New weakness dimension: position transformation (favorable
  trades).
- **2026-08-26** The mandatory voice is the FULL general's briefing (§4a/4b), not
  a 4-layer reduction. "The outline is far better than the product": the offline
  `position-facts.mjs` computes the full briefing; runtime `positionFacts.ts` is
  a subset. Phase 1 = close that gap + make it mandatory everywhere, shipped in
  slices.

## 14. Next-session pickup

Start Phase 1. The engine to surface is `startMistakeDrills` /
`coachDrillService`; the data is `getUnifiedWeaknessProfile` (recency-filter on
`lastSeenAt`); the voice is `positionFacts` + `perturbation` + `boardConcepts` +
the weakness count, routed through `voiceFacts` (§4). Do NOT rebuild the My
Mistake engine — surface it, let the coach initiate it, and make the 4-layer
voice mandatory. The honest ceiling (relational empathy) stays a ceiling; don't
fake it.
