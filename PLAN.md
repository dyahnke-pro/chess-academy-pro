> **LIVE PLAN (2026-09-18).** Read AFTER CLAUDE.md (level I) and `docs/STATE.md`
> (level II, generated — it carries the numbers this file only names). The
> nav-capture plan that used to sit here landed 2026-09-12 and is archived at
> `docs/plans/2026-09-12-nav-capture.md`; the unified-coach build is
> `docs/plans/2026-09-15-one-coach-need-selector.md` (N0–N7 built).

# PLAN — closing the loop (2026-09-18)


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

- ⚠️ **OPEN (found 2026-09-19, deliberately NOT built at 6am): the lesson ACK
  is a hardcoded English template.** A Thai student now gets the lesson, and
  HEARS it in Thai (the voice chokepoint localises), but READS "Sure — let's
  walk through the Italian Game." in English. Six sites in `CoachTeachPage`
  (4680, 5074, 5445, 6186 and the `Ready —` variants) build the confirmation as
  a code template and write it straight into the transcript, so it never passes
  through `voiceFacts` and nothing can translate it. Same class as the defect
  above — computed text that no one localises — just smaller, because the
  teaching itself is in-language.

  🔀 **IT IS A DESIGN FORK, NOT A RISK CALL** (corrected — the first note here
  said it was deferred for the hour, which was the weak reason). Two options
  trade off differently enough that it is David's:
  - **(a) route the acks through the model** (`localizeSpokenText`'s shape,
    keyed on `chosenOrTypedLanguageName` so it follows the CHAT language rather
    than the device locale). Covers all 36 languages, but costs a round-trip
    BEFORE the ack renders — a non-English student watches their confirmation
    lag about a second on every lesson start, in the exact moment just fixed.
  - **(b) a phrase table.** These are SIX fixed templates with one variable
    (the opening name), so they need no model at all: instant, deterministic,
    G0-pure. The cost is coverage — six strings per language, English fallback
    where unsupplied.

  (b) is the better engineering answer and the one the determinism law points
  at; (a) is the one that needs no content work. Recommended: (b), with English
  fallback, seeded for the languages real users actually speak.

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

8. **The review audit's verdict is not reproducible** (#70) — three runs on one
   bundle gave three different red sets, because the background deep dive is a
   race the harness neither waits on nor reports.
9. **The pthread census is intermittent** (#21) — 70 workers one run, 1 the next
   on the same game. Carrier is the multi-threaded SINGLETON, not the pool.
10. **`tsconfig.app.json` excludes every test file** (#61), so test type errors
    are invisible until runtime.
11. **The GothamChess pro-rep audit fails on prod** (#58) — header selector and
    walkthrough click both miss.

### C. The student hears something wrong or repeated

12. **"the queen takes d5 is about as good"** (#51) — the close-call stem renders
    a SAN as a noun phrase. Fired 3x in one 5-ply run.
13. **Stems are ROLLED, not rotated** (#67) — `Math.random` in 5 services, so
    variation is not resume-safe or testable. Same complaint as 12; fix together.
14. **Curated beats re-announce the same move on consecutive plies** (#60).
15. **The voiced corpus is in the wrong register** (#22) — 1,146 he/his, 521
    first-person, 81 fragments.
16. **Read-position: voice fires but the banner never appears** (#59).
17. **The plan lane says the vague thing** while the computer beside it has the
    concrete one (#64) — structures AND pieces.
18. **Two shared positions go silent in game 2** (#68) — n=1; WIDEN THE SAMPLE
    before fixing.
19. Open questions, not yet defects: mistake-puzzle narration and Rule 3 (#23);
    "chat input never usable" after the player-games lane (#19); caching
    `voiceFacts` so a repeat does not bill twice (#35); the Alapin tape's
    remaining prose defects (#36); a pinned review need-coverage baseline (#69);
    the corpus study of his teaching structures vs what we compute (#42); the
    running REMOVAL CANDIDATES list (#33).

## Next-session pickup

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
