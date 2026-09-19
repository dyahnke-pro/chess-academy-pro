# BACKLOG — the master list

Long-running work that outlives any one session. **Not** a session todo list and
not a build plan: `PLAN.md` holds the LIVE build, `docs/plans/` holds the
archive, this holds the things that take weeks and must not be forgotten between
them.

Rules for this file: every item states what is DONE, what REMAINS, and the
MEASURED number behind both. An item with no number is a wish, not a backlog
entry. Update the numbers when you touch the area; never delete an item to make
the list look shorter.

---

## 1. Finish the creator corpora — only ONE of six is distilled

**Status: 1 of 6 done (David 2026-09-17: "we have finished only Naroditski's
corpus. we still need to finish the rest of those. that will happen in time.")**

The **voiced** corpus is the hand-authored, board-truth-verified, position-keyed
teaching that is the SOLE exact-position source on every play surface
(teach / play / review / read-position). Everything else can only teach a
pattern, never a board. Distilling a creator's videos into voiced notes is what
moves their teaching from "pattern" to "position".

**Done — Naroditsky:** 7,477 voiced notes, 6,498 distinct positions, 100%
position-keyed (`vc-` ids, `yt:` sources). Grown from 560 at the 2026-08-26
retirement — 13× in three weeks.

**Remaining — still floating-only (concept-reachable, position-blind):**

| corpus | notes shipping | position-keyed | reaches |
|---|---:|---:|---|
| saintlouis | 35,175 | 0% | tactics drill + endgame only |
| hangingpawns | 6,609 | 0% | tactics drill + endgame only |
| chessbrah | 2,766 | 0% | tactics drill + endgame only |
| **total undistilled** | **44,550** | **0%** | — |

**Raw material already on disk** (the anchored copies pulled on 2026-08-26, kept
whole in `data/archive/corpus-anchored/`): hangingpawns 3,600 · saintlouis 1,355
· naroditsky 1,282 · chessbrah 457 · hikaru 39 · imrosen 5 = **6,738 notes that
already carry a line**. These are a starting point for distillation, not a
shortcut — they were pulled precisely because farmed prose may not claim a
specific board (CLAUDE.md, the exact-position rule).

**The cost of the gap, measured 2026-09-17.** The retired generic bake covered 23
openings / 220 spine plies. Voiced covers **81 of those 220 plies (37%)** today;
21 of 23 openings have at least one position, but the worst are bare:

- Bird Opening **0/18**
- Polish / Sokolsky Attack **0/11**
- Rubinstein Opening 2/14 · Latvian Gambit 2/14 · Bishop's Opening 2/17

Everything not covered falls through to **computed** narration — which is why
defects in the computed path (`coachDecider`, `positionFacts`, the live
composer) now cost more than they did in August.

**Runbook:** `docs/voiced-narration-pipeline.md` — §8 is the absorb-a-batch
procedure (rebuild the 3 derived files, gate, ship; do NOT regen
`note-anchors.json` for a voiced-only batch). Tools: `scripts/voiced-authoring/`.

**Next honest step:** pick the creator whose openings overlap what students
actually play, not the one with the most notes. saintlouis is 35k notes but only
20% carry an opening name at all.

---

## 2. Prove the floating corpora still fire where they are fenced to

Raised 2026-09-17, unverified. The 44,550 floating notes are fenced to the
**tactics drill** (`tacticNoteForPuzzleThemes`) and **endgame lessons**
(`endgameNoteForLesson`). Nobody has shown a real note coming OUT of either
surface since the 2026-08-26 fence went in.

CLAUDE.md: *"A WIRE THAT DOES NOT FIRE IS NOT A WIRE."* Given four Learn audits
turned out to be dead on the same day this was raised, assume nothing. Owed: a
test that shows a real note in the output of each of those two surfaces.

---

## 3. Dead audit scripts referencing the retired bake

Found 2026-09-17. `audit-learn-full-game.mjs` was repaired (it died at import for
three weeks, which is why no full Learn game had been played). Three more still
reference the retired bake and have NOT been checked:

- `scripts/audit-teach-bridge-prod.mjs`
- `scripts/audit-teach-corpus-spoken-prod.mjs`
- `scripts/audit-teach-tiers-spoken-prod.mjs`

Plus tooling: `scripts/danya-corpus/{arrow-diff,coverage-report,narrate-from-video,print-spine,tier-coverage}` and `scripts/tts-prerender.mts`.

Root cause worth fixing structurally: the retirement commit swept `src/`,
`public/`, `data/` and `docs/` — and **zero** files under `scripts/`. Instruments
are outside the blast-radius habit, and nothing runs them on a schedule, so a
script that dies at import produces no signal at all.

---

## 4. Live Learn defects found reading a full game (2026-09-17)

First complete Learn game ever captured with a working narration wire — 22
plies to checkmate, 233 spoken lines, 630 audit events. Report:
`audit-reports/learn-full-game-2026-09-17T03-43-47-467Z/`.

**POST-DEPLOY AUDIT, 2026-09-19 (prod, bundle `index-CWTOFc5b`).**
`audit-concept-gameplay-prod` **8/8**. `audit-learn-full-game` drove a real
41-ply game to checkmate, 325 lines spoken, 0 silent plies, 0 page errors.

- ✅ **L1 confirmed on a live game.** The coach played `Nb5#` at ply 41, spoke
  exactly `"Checkmate."` and nothing else — `voicePackage` empty. No "The move
  is…", no "their king is still in the centre".
- ⚠️ **The run flagged 2 false claims, and BOTH were a miss in the new
  hypothetical guard, not a product defect.** `whatItAllowed` said *"That let
  them swing pieces toward your king, win a pawn, create a passed pawn on d5 and
  trade off the rook"* — a projection along the opponent's PV, and `d4d5` (the
  move that creates the passer) is IN that pv. Two causes, both fixed: the
  clause splitter did not split on a bare `and`, so the projective half could
  not be separated from its neighbour; and a CREATION verb was not a
  hypothetical marker, though a thing the line creates is by definition not on
  the board yet. Re-verified against the exact sentence + FEN from the report,
  with controls in both directions — both projections now pass, both real lies
  ("your knight on b5 is hanging", "the rook on d5 is loose") are still caught,
  and a true present claim still passes.
- 📋 **84 ORPHAN lines, and the new split says what they are.** All are
  `voiceService.*` echoes whose SPOKEN text has been TTS-sanitised — "rook takes
  b7" where the anchored app event said "Rxb7" — so text matching cannot pair
  them with their twin. Not unchecked *claims*: the written form was checked.
  The real fix is threading the position through `voiceService` so an echo
  carries its own board; deliberately not done here (shared file, two sessions
  in flight). 195 lines carried their own FEN, 46 paired by text.

**STATUS 2026-09-19: all eight are now DONE.** Two of the diagnoses written here
turned out to be WRONG when measured, and both are deleted rather than annotated
(items 1 and 2) — a wrong diagnosis in a backlog is worse than no entry, because
the next session acts on it. Both were wrong the same way: they named the fix
before measuring the producer.

1. **DONE (2026-09-19) — and the diagnosis here was WRONG. THE FLOOR WAS NEVER
   INVOLVED; THE LOG LIED.**

   🔴 The entry used to read: *"Two coach moves in one game — `Qc7` at 122cp and
   `Qxc5` at 184cp — were classified as not worth mentioning. The advanced
   rating band's own threshold is 50cp. Whatever floor `coachVerdict` applies is
   mis-scaled or inverted."* That is deleted rather than annotated, because a
   session acting on it would have gone tuning a threshold that is correct.

   `MISTAKE_CP` is **100**. Both moves clear it, and `callInaccuracy` returns a
   full verdict for both when called directly — measured, not reasoned about.
   What actually happened is that `callInaccuracy` returns a bare `null` for
   FIVE different reasons and its caller in Learn logged one of them as fact:

       coach move Qxc5 cost 184cp — under the floor, nothing to call

   printed unconditionally, whichever guard refused. The log named the one guard
   that had PASSED, and the backlog entry above was written from reading it.
   **An instrument that asserts its own cause is worse than one that stays
   quiet, because it answers a question nobody thinks to re-ask.**

   Fixed at the instrument: `callInaccuracyDetailed` returns `{call, declined}`
   and `callInaccuracy` is a one-line view over it, so the reason is computed by
   the same pass that decides and cannot drift from it. `backwardLook` publishes
   the coach lane's reason; Learn logs that instead of a guess. The real cause of
   the two silences is now whatever the next live game prints — most likely
   `no-better-move-supplied`, but that is a PREDICTION and the log will say.

   Found in passing: the `played-the-best-move` arm is unreachable —
   `classifyMove({wasBest:true})` returns `'best'`, so the quality guard answers
   first. Kept as a precondition, documented as shadowed, and the gate asserts
   the OBSERVED reason rather than the arm's apparent one.

2. **DONE (2026-09-19) — and the fix is NOT one guard per producer.** Ply 22
   spoke "Checkmate." and then "The move is Rd1", "Re1 is playable, but not as
   precise", "Their king is still in the centre — every line that opens toward
   it is worth looking at."

   The obvious fix is a `isGameOver` early return in each producer, and it is
   wrong twice over — both halves MEASURED before a line was written:
   - the producers that name a move **already refuse**. On a mated board
     `buildDeliberation`, `tacticalReadFromLines` and `buildGuidedFindChallenge`
     each return null, because each must resolve a move on the board first and
     there are none. Guarding them adds dead code and a green test proving
     nothing.
   - the lanes that DID speak **cannot guard themselves**. `engineReadLines`
     takes an analysis and `pieceQualityLines` an eval table — neither takes a
     FEN, by design. A mated position still has pieces on it, so "your rook on
     h1 is asleep" survives checkmate with nothing in scope to notice.

   So the precondition can only be checked where the position is known, and that
   is `queueSpokenHint` — the ONE queue every late lane in Learn funnels through,
   which already takes the FEN as its first argument. One guard covers lane
   fifteen and lane sixteen alike instead of a convention each new lane must
   remember. (Learn's existing game-over guard sat inside `turnFacts` and covered
   only the package it returns, which is why the queued lanes walked past it.)
   Play was already clean: `endedInMate` + `capEval` — verified, not assumed.

3. **DONE (2026-09-19) — the claim, and the number that hid it.** "Your knight
   on b5 is hanging" at ply 22; b5 was captured at ply 7 (`axb5`).

   **The claim.** It comes from `TacticsLiveContext.hanging`, and that type
   carries **no record of which board it was computed for** — so a package built
   for one position can be handed to another and every consumer voices it in good
   faith. Same shape as the seat and register bugs: the identifying field is
   missing, so nothing downstream is *able* to check. Until the package carries
   its own position, the producers verify: `assemblePositionAssessment` and
   `assembleTacticsAnswer` now confirm the piece is actually on the board they
   were handed before claiming it hangs. Not a claim-stripper on prose (G0 bans
   that) — a fact-computer reading the truth directly off the board.

   **The number.** "116 of 233" conflated two different things, and that is why
   it pointed at the wrong layer. Most of the 117 are `voiceService.*` ECHOES of
   an app-side event that already carried the board — correctly not double
   counted, and genuinely checkable via their twin. The ones that matter are
   ORPHANS: text that reached the student with no position recorded anywhere.
   The audit now matches unanchored lines to anchored ones by text, so a
   duplicate INHERITS its twin's board and is checked properly, and orphans are
   counted, printed and reported separately. Owed: `TacticsLiveContext` should
   carry its own FEN so the check becomes unconditional — deliberately not done
   here, it is a shared type and two other sessions are in flight.

4. **DONE (2026-09-19) — internal state in the voice.** "You're down 2 points of
   material here (no engine eval on this exact spot)." All three branches of that
   material read carried a plumbing clause; all three are gone. The material
   count is a complete fact on its own — read off the board with chess.js, and
   exactly as true here as on the engine path. Missing the eval is a reason to
   say LESS, never a reason to narrate the absence.

   The gate covers all three branches on purpose: the first cut checked only the
   "up" one, and the negative-control run then passed with the plumbing restored
   on "down". A gate covering one arm of a three-way conditional is the same
   false green this section exists to record.

5. **DONE (2026-09-19) — the board-checker no longer grades hypotheticals.** It
   flagged "a4 was the move — it *would* create a passed pawn on b4" because b4
   is empty now. It is empty *because* the sentence is about a future that did
   not happen. Projected and conditional clauses are the coach's whole foresight
   register, and grading them against the present board marks the correct ones
   wrong — the checker's own earlier lesson ("a checker that flags true
   statements is worse than no checker") applied to itself.

   The split is by CLAUSE, not by sentence: "your rook on d1 is loose, so a4
   would win the pawn on b4" makes one present claim and one projected one, and
   only the first is the checker's to grade.

6. **FIXED (2026-09-17) — a Watch-register paragraph in a live game.**
   `curatedBeatAt` has exactly ONE caller, `CoachTeachPage`'s live game reply;
   Watch and the LessonPlayer read their beats straight off `getLessonScript`.
   So hand-authored masterclass prose written to be WATCHED was served to
   somebody mid-GAME. Measured on five real opening lines: **44 of 93 plies
   fired a beat and 36 spoke as a spectator** — "Before White commits to the big
   central break, **he** takes away Black's pin", "**So let's rewind.**", said to
   the person who had just played those moves.

   🔴 **The earlier diagnosis here was WRONG and is deleted rather than
   annotated: "the beat goes into `factLines` for the phrasing pass … so the
   model COULD reframe it."** There is no model on that path. `buildVoicePackage`
   produces `pkg.spoken`, which is spoken verbatim — deliberately, as the purest
   G0. So the input's register IS the output's register, and no prompt change
   could ever have fixed this.

   The fix: `beatRegister(say, seat)` classifies the SOURCE at index time and
   `curatedBeatAt` takes the surface's register as a REQUIRED parameter. It never
   rewrites prose — a regex turning "White does" into "you does" is what that
   road leads to. The guard is a `continue`, so a position holding both a
   spectator beat and a clean one still teaches: the live walk fell from 44 plies
   to **32, not to 8**. What speaks now reads right — "Bb5 — the Ruy Lopez …
   you're leaning on the whole point", "White grabs kingside space with h4,
   threatening to trap your bishop. You make a quiet hole with h6."
   Gate: `curatedBeatRegister.test.ts`. Doctrine: CLAUDE.md, under THE SEAT IS
   PART OF THE SELECTION.

   **OWED — bake a live rendering for the other 2,436.** 1,312 of 3,748 beats are
   live-safe today. The rest are CORRECT where they live (Watch is supposed to
   say "White develops the knight") and must not be rewritten in place; they need
   an ADDITIVE second rendering, generated offline and gated exactly like the
   bake — `narrationAccuracy` for the board claims, `perspectiveVoice` for
   we/our, plus a check that the new text is `live-safe`. **Do NOT "recover" the
   2,436 by loosening either guard** — the seat or the register — that doubles
   the reach of the violation instead of removing it.

7. **DONE (2026-09-19) — consecutive plies re-announce the same move.**
   Reading the post-fix Italian walk: ply 5 "Bc4 — the Italian bishop", ply 6
   "Bc4 — the Italian bishop, pointed straight at f7", then ply 7 "c3 — modest",
   ply 8 "c3 — quiet, but loaded", ply 9 "c3 and d3 — the Giuoco Pianissimo".
   Five beats, three distinct ideas. `curatedBeatSeenRef` dedupes by beat ID and
   `buildVoicePackage`'s novelty set matches whole sentences, so two lessons
   teaching the same move in different words evade both. The dedupe term that is
   missing is the beat's SUBJECT (the move it leads with), not its text.

8. **DONE — plan versus plan: the coach told you to run a race it had never
   looked at.** `structurePlan` (boardPlan.ts) is an else-chain: `if (mine)
   { … return }` and only THEN the enemy-passer branch. So whenever the student
   had a passed pawn of their own, everything below was unreachable and the
   coach said *"Your passed pawn on b5 is the trump here — push it and make them
   deal with the promotion"* with runners on BOTH wings, having never once
   checked whether THEIRS queens first. Not an abstract "no plan-vs-plan" gap —
   the coach handing out an instruction it had not tested.

   **The build order in the task said "tempo count to each plan's key square".
   That is WRONG and was corrected before a line was written.** `deriveNextPlans`
   emits eight plan kinds; only three have a countable arrival (push the passer,
   blockade the isolani, seize the file) and those three count in DIFFERENT
   UNITS — pawn pushes, minor-piece hops, rook moves. A cross-kind number reports
   "their plan is faster" when their plan is seizing a file, which is not a
   terminal event at all. **A race is real only when both sides run the SAME plan
   kind toward the SAME kind of terminal event**; everything else is silent.
   Measured over 11,028 real positions from 120 model games: passer-race fires
   818 times (all 818 speak), file-collision 2,757 (809 speak) — so the narrow
   rule is not a thin rule, and my own "this branch is near-dead" suspicion about
   the file collision was disproven by the census rather than acted on.

   Four defects in the first draft, every one found by READING the prose the
   probe printed, none by a type or a test:
   - **a blockaded pawn was counted as running** — a2 with an enemy knight on a3,
     unable to move at all, reported as "6 pushes from queening". The same class
     of lie the whole item exists to kill. Only RUNNING passers (front square
     empty) enter the race now; a blockaded one already has its teaching in
     `structurePlan` ("dislodge that blockader").
   - **side to move was ignored** — equal counts returned silence, when both
     runners three away and your move means YOU queen first. That is the clearest
     case there is and the draft threw it away. `youQueenFirst` folds the move in:
     moving first wins a tie, because your Nth move lands before their Nth.
   - **"1 pushes"**.
   - the clause promised a result; it now says "if nobody interferes", because a
     middlegame piece can still blockade (don't overstate the why).

   **Two more caught only by reading REAL GAMES, after the constructed FENs were
   all green** (the constructed positions were bare kings and pawns, so neither
   could possibly have shown up there):
   - **a file collision replaced the passer plan.** Karpov–Kasparov move 14:
     White has a passed d-pawn AND a contested c-file, and the unfiltered race
     handed back the c-file clause — so the student heard about the file and the
     passed pawn was never mentioned. Only a PASSER race may stand in for the
     passer plan; the file collision reaches review through its own facet, where
     it sits BESIDE the plan instead of deleting it.
   - **the imperative was phase-blind.** Fischer–Spassky 1972 move 27: both
     runners three pushes away, the move White's — and with queens and rooks
     still on, "push, and make them be the one who stops to defend" sends the
     student into a sharp middlegame. With queens on, the race is a standing FACT,
     not a marching order: *"you get there first once the queens come off — that
     race is your reason to trade into the endgame, not to go pushing into the
     middlegame."* Better chess, and it teaches why you would want the trade.
     `deriveNextPlans` already gates its escort clause on `queensOn` for exactly
     this reason; this now matches it.

   **And a PRE-EXISTING bug it exposed: `planMemory.stepPlan` compared the
   rendered SENTENCE to decide whether the plan had changed.** So any plan naming
   a square that moves re-announced itself on every push — "your passed pawn on
   b5" became "on b6" and read as the coach changing its mind about the plan it
   had just given. `structurePlanFact` now returns `{ text, id }` and the fold
   compares the ID, so advancing the pawn you were told to advance is a `carry`
   and only a genuinely different plan — or a race whose winner FLIPPED — is a
   `changed`. The carried text still refreshes, so a re-mention names b6 not b5.
   Comparing rendered prose to establish identity is the same anti-pattern as
   scraping squares back out of a sentence.

   `[plan-race]` ranks **21** — above `plan-now` (20), below `endgame` (22):
   the race CORRECTS the plan, so hearing "push your passer" first and "theirs
   queens first" second is backwards. Deduped by VERDICT, not by counts — the
   counts change every push, so a count key would re-announce every ply; a FLIP
   (you were winning that race, now you are not) is the one repeat worth hearing.
   `stepsToPromote` moved from boardPlan to planRace so there is one copy.
   Gate: `planRace.test.ts`.
