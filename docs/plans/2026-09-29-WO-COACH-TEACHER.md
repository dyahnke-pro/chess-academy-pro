# WO-COACH-TEACHER — Learn free play + chat that teach like Naroditsky

**Owner of the whole:** the session that wrote this (2026-09-29). **Approved by David 2026-09-29.**
Source of the plan: `docs/plans/2026-09-29-danya-full-review.md` §FINAL PLAN (two-round brainstorm, 5 brains, real prod tape).
Evidence: `docs/plans/danya-review-2026-09-29/` (8 video-reader reports, sources audit, brainstorm r1, prod tape).

> **For a new session picking up a work order:** read §0 and §1, then ONLY your work order. Claim it by editing its **Status** line to `🔵 <your session / date>` in the same commit as your first code. Stay inside your **Files** list — another session owns the rest. Ship on a branch, merge to `main` when green (CLAUDE.md Deployment Policy).

---

## 0. What we are building, in one paragraph

Today Learn free play speaks ~1.3 disconnected labels per move ("A pawn break is available on d5", "Nf3 follows a principle…") and chat answers about half the questions asked (tape: 7/14; real App Store typed questions: ~17% answered, 38% got "I can't verify that precisely"). Naroditsky never stops talking — but it is ONE line of thought: what I want, what they want, what I'm checking, why this move — around a plan that SWITCHES as the board changes (tactical → positional → tactical), and when asked "why not X?" he plays X out and shows the refutation. Target: the same shape, every word still computed in code (G0).

## 1. Rules every work order obeys

1. **G0.** Code computes every chess fact. The model may only (a) phrase, (b) PARSE a chat question into the closed `BoardQuery` schema (David approved 2026-09-29). It never decides what is true.
2. **No caps (G4.5).** Selection is a ranker's decision, never "stop after N".
3. **One door (G4.5.15).** Everything Learn says passes `coachDecider` / the Learn turn door. A lane that speaks around it is a bug.
4. **Plans are not locked** (David 2026-09-29: "Plans change as the board does… tactical to positional back to tactics"). The current plan is re-read every turn; a switch is SAID.
5. **Corpus notes stay out of Learn free play** (CLAUDE.md 2026-09-23). His style reaches Learn through computers, never by reciting his notes.
6. **Audits**: hand-walk one of his games after each merged WO (CLAUDE.md "WALK IT, FLAG EVERYTHING, THEN FIX"), muted.
7. **Don't touch `src/components/Weaknesses/**` or the weaknesses services** — another session is fixing a freeze there.


## 1.5 HOW THIS FITS WHAT IS ALREADY BUILT (context pass 2026-09-29 — read before any WO)

This is not a new track. It is the next step of four that already exist:

| existing work | what it already did | what this plan adds on top |
|---|---|---|
| **computer-unification Phase 4** (`2026-09-17-computer-unification.md` §2.6, §6) | slice 1 DONE: 15 say-once refs → `learnMemory.ts` (orphan ceiling now 1). Phase 4 target named: `buildLearnFacts(ctx) → VoiceFact[]`, a LIFT of `computeInstantTeaching` (~`CoachTeachPage.tsx:7514`) | **WO-1 IS slice 2 of Phase 4.** Not a new "door" — lift the lanes into `buildLearnFacts`, then pick a lead. Also covers `handleStudentMove`'s late lanes (the ~19 `queueSpokenHint` sites) which §6 did not list. |
| **WO-DANYA-01** (PLAN.md §464, OUTLINE §000) | 8 hand-walks + fixes; A, A2, C, C2 done; plan arc; fork trick; quiet-move purpose (partial) | **WO-1b IS open item B** ("subsumption, not a cap") — now by relevance to the plan, not only same-claim. Leftovers (rook template, "either works", duplicate break lanes, transposition name) stay in WO-DANYA-01. |
| **WO-TEACH-02** (PLAN.md §284) | S1–S7 built as live clauses THROUGH `decide()`: refuted alternative, principle-once, stopped threat, `positionVerdict`/stock, candidates + proof lines, transfer ledger, forcing scan. `opponentMovePurpose` (S3). Teach meter on `coach-decision`. | Those facts are the INGREDIENTS WO-2 chains together. The teach meter becomes one column of WO-5. |
| **WO-LAYERS-01** (PLAN.md §558) | layer standings in the door (red raised, grey bottom-up, green quiet as `proven`), `proofCut`, bluff, conversion step, `moveTiming`, `liveStrength` | WO-4's shrinking repeats extend the same standings ACROSS games; WO-2's lead rule must respect layers (grey = safety before plan). |
| **planArc** (`planArc.ts`, behind `lookaheadPlan`) | each side's plan followed: takes shape / lands / given up | **WO-2 extends planArc** (no new `planThread.ts`): add the character switch (tactical ↔ positional) and plan-aware grading. |
| **pieceOptions + WalkableLine + Walk button** (WO-DANYA-01 C, `ChatMessage.tsx:~290`) | "couldn't X just move?" answers in chat with engine lines per option, drawn on a board, Walk button steps and returns | **WO-3's why-not/what-if REUSE this shape** (engine read → proof-cut line → WalkableLine). **WO-6 mostly exists** — shrinks to: auto-play the walk in Learn instead of a button, if needed. |
| **`danyaBehaviors` scheduler** | 25 computed behaviours fired at his corpus rate | Stays; once WO-1 lands it is one more lane INTO the lead decision rather than a separate voice. |

**So the honest order is:** WO-1 (= Phase 4 slice 2 + DANYA B) → WO-2 (planArc + switch + grading, stitching TEACH-02's facts) → WO-3 (extends the pieceOptions pattern to every question) → WO-4 → WO-5 measures all of it.


## 1.6 WHAT THE CODE ACTUALLY DOES — read end to end 2026-09-29 (`CoachTeachPage.tsx` 7514–10760)

**A Learn turn speaks in up to FOUR separate voices, not two:**
1. the grade of the student's move, spoken at once (`gradePlayedMove`, ~8669), plus a gem resolution if one was pending (~8561);
2. the INSTANT package with the coach's reply (`computeInstantTeaching` ~7514): event line + gem · tactic · threat · computed commentary (`buildPlayCommentary`) · curated beat · danyaBehaviors (quiet turns) · positional read → `buildVoicePackage` (~8345);
3. the LATE package when the engine settles (~10638): register (but-turn / hedge / compare), opponent gap, named structure, piece quality, **position facts through `decide()` (the ONLY lane that does)**, priority-first, rejected-tempting, plan-arc events, backward look / fundamental / move point, the coach's own verdict;
4. the phase transition (`runPhaseTransition`, ~10720).

**🔴 Teaching that is COMPUTED and NEVER SPOKEN** — found reading, verify with a test before relying on it:
- The `facts[]` array (~8780–10000) is a leftover of the per-move model call that was removed ("NO MODEL CALL ON A MOVE", ~10735). It is only LOGGED (`turnFacts`). Everything that only lands there is silent: **the causal chain** ("SAY THIS FIRST"), **think-aloud**, **fork talk** (engine forks), the **improving move**, the **best-reply line with its played-out proof**, the **look-ahead plan text**, the opening chain + trap names, the rating-reality split.
- The DNA whitelist (`DNA_VOICE_KINDS`, ~371) has no `'plan'` and no `'fork'`. The late package drops every non-whitelisted fact, so **the plan-arc events built 2026-09-27 ("There it is — … That was the plan") and the book fork are filtered out**. The prod tape (42 plies) has zero plan-arc lines.
- `trackABestReply` is muted by `NARRATE_DNA_ONLY`.

So the lanes most like his thinking-out-loud — plan, causal chain, think-aloud, candidate lines — exist and are the ones silenced. **WO-1 therefore starts by routing these INTO the door** (as facts with kind, squares, stakes) rather than building new computers; the door, not a whitelist, decides what speaks. The whitelist was the 2026-08-23 answer to "the non-DNA lanes are noise"; the door replaces it.

**The two-wave timing (open question for WO-1c):** the instant package must stay instant (the reply lands, the voice starts in ~1s); the lead fact usually needs the engine read (late). Proposed: the instant wave carries only urgent facts (a threat, a tactic, the event); the one connected thought is the late wave. To measure on the tape before building.

## 2. Work orders

Dependency graph: `WO-0` and `WO-5` any time · `WO-1` first on the Learn side · `WO-2`, `WO-4` build pure now, wire after `WO-1` · `WO-3` + `WO-6` in parallel with everything.

---

### WO-0 — Tape bugs (hours)
**Status:** 🔵 this session — 3 of 4 fixed on branch `wo0-chat-bugs` (why-not → candidate lane; unclosed `[VOICE:` stripped; "let's play, I'll be white" — the play pattern missed the comma and the phone apostrophe ’, so it fell to the model which invented a Caro-Kann). Open: the takeback stall (needs a localhost repro).
**Files:** `src/services/questionIntents.ts`, `src/services/coachApi.ts` (only the lines named), the markup stripper wherever `[VOICE:` leaks.
- `[VOICE:` markup leaked into chat AND voice on a typo'd question (tape Q8).
- `\bwhy\s+not\b` sits in the best-move-reason list (`questionIntents.ts:~437`), so "why not e5?" answers with the best move. Route to a why-not lane (a stub that WO-3 fills; until then: evaluate X, say its cost vs best).
- "let's play, I'll be white" → "I'll answer with the Caro-Kann" then 1…e5 was played.
- Takeback ("take that back and play c6") → coach never replied again.
**Done:** each reproduced with a failing test first; tape questions Q4, Q8, Q12 re-asked on prod and answered.

---

### WO-1 — THE DOOR: every Learn line through one decision
**Status:** 🔵 this session, 2026-09-29
**Files:** `src/components/Coach/CoachTeachPage.tsx` (the per-turn narration path only), NEW `src/services/learnTurnDoor.ts`, `src/services/voicePackage.ts`, `src/services/coachDecisionEvents.ts`.

Today (engineer map, `brainstorm-r1/engineer.md`): ~15 lanes. One (`computePositionFacts` → `decide()`, `CoachTeachPage.tsx:~9073`) goes through the decider. The rest call `queueSpokenHint` (`:8482`, 19 call sites) into a pending list, and two `buildVoicePackage` passes (instant `:8345`, late `:10638`) order + dedupe but never CHOOSE.

- ✅ **1a DONE 2026-09-29 (branch `wo1-learn-door`, `learnTurnDoor.ts`)** — lane table `LEARN_LANES` replaces the kind whitelist; both waves through `decideTurn`; lanes logged on the voicePackage/hintRegister audit rows; gate `learnTurnDoor.test.ts`. Behaviour-preserving. The plan arc was opened, walked (localhost, 3UqPa5eV2e0, 38 plies) and CLOSED again: its first and only live line was board-false — ply 37 "Their plan is taking shape: the knight's walk to h2" as the knight went f6→d5, h2 covered by the king. So its silence was hiding a wrong computer, not just a wiring slip. Its lane stays closed with that reason until WO-2 proves the aim reading. **Found:** the silenced `facts[]` producers (think-aloud, fork talk, improving move) emit PROMPT blocks for a model ("THINK ALOUD … weave these reads"), in third person ("the student's king") and built on the retired withhold-the-move contract — they cannot be un-silenced as-is; their raw reads are WO-2's ingredients, re-rendered in code. The causal chain (`renderCausalChain`, register 'learn') IS already speakable → next lane to open.
- **1a (original spec) — route + record, no audible change.** Every lane carries a `lane` id. Both package passes go through `learnTurnDoor.decideTurn()`, which today returns exactly what `buildVoicePackage` returned, and emits ONE `learn-turn-decision` row per turn: lanes offered, lanes kept, facts per turn, sentences per turn, lead lane. Gate: a test that fails if any call site speaks Learn per-turn narration without the door.
- **1b — the door picks a LEAD.** `decideTurn` returns `{ lead, support[], held[] }`. Lead rule (until WO-2 lands): a deciding moment → biggest stakes; otherwise the fact that answers "what's the plan / what do they want". Support must share squares or plan with the lead; the rest are `held` — available behind a "why?" / chat, not spoken. This is subsumption by relevance, not a cap.
- **1b SAFETY FLOOR (review 2026-09-29):** a threat or a hanging piece is NEVER `held` — safety facts always lead or support.
- **1b will not close the biggest gaps alone** (scoreboard, 2 games): it fixes over-talking (we speak on 46 of 49 beats; piece quality 12× to his 1, principles 11 to 3). The biggest MISSES — plans (16/1), move purpose (13/3), king attack (10/2), verdicts on good moves (10/1) — need new computing: WO-2.
- **1c — one sentence chain.** The lead + support render as one connected utterance (connectives: "so", "which is why", "but first") instead of stacked sentences.
**Done:** `learn-turn-decision` rows on a hand-walk of his game `3UqPa5eV2e0` show one lead per turn; tape ply 11 (four labels) comes out as one thought; ship-check green; hand-walk flags written.

---

### WO-2 — The plan thread (switches with the board)
**Status:** ⚪ open — build the pure computer now, wire after WO-1
**Files:** `src/services/planArc.ts` (extend — NOT a new planThread.ts), its test, `positionFacts.ts` only for the grading hook.
- extend planArc: `stepArc(...)` also returns → { plan, character: 'tactical'|'positional'|'conversion'|'defence', switched, why }`. Board picks the plan (their concession, the structure, `planArc`'s dominant aim). Character flips on: a tactic appears/vanishes, material changes, structure changes, a plan lands or dies.
- A switch is a fact: "The position has changed — now it's about the king." A plan landing: "There it is — that's what the knight tour was for."
- **Plan-aware grading — ENGINE-PROVEN, never plan-proven (review 2026-09-29):** a move is "deliberate" only when the ENGINE eval holds N plies deep; serving the plan computer's aim is never enough (that computer was 3/4 false on walk 2 and would excuse real mistakes). Such a move is "deliberate", never "a mistake" (tape plies 29, 41 — the outpost move called a mistake).
- **Grading GOOD moves (owner: WO-2, review 2026-09-29):** his biggest single miss after plans — a verdict on a good move (10 of his, 1 of ours). Name what the move did right, from the same computed read.
- **"First X, so that Y":** when the plan move fails now, name the obstacle (own piece in the way, a kick with tempo, a piece left hanging) and the quiet move that removes it.
**FIRST (partly done 2026-09-29):** route identity fixed (two unrelated routes no longer count as one plan read twice). Walk 2 after that fix (3UqPa5eV2e0 + FqVMAv3wKes, 82 plies): 4 plan-arc lines, 3 false — a light-squared bishop's "walk to c3" through a blocked diagonal, a knight's walk to a square covered twice, and a student 'drop' for a plan the student never heard (the student's emerge is filtered in Learn, so its drop must be too). ROOT: aims come from ONE engine line's `maneuver` (`lookaheadPlan`) and are never validated. WO-2 step 1 = a validator: the named piece (by square) can reach the goal, the goal is safe for it (SEE), and the path isn't blocked; only validated aims enter the arc. Same computer feeds review's `[plan-arc]` — check review for the same false lines. Then: fix `planArc`'s aim reading — the "knight's walk to h2" line (3UqPa5eV2e0 ply 37) is false; a test on that exact position must fail before the fix. Only then re-open `LEARN_LANES.planArc`.
**Done:** unit tests on tape `3UqPa5eV2e0` positions (plan = open the centre → switch at d5 → Nd2-c4 reroute → outpost c6 = landed); wired into WO-1's lead rule.

---

### WO-3 — A coach you can talk to (BoardQuery chat)
**Status:** ⚪ open — SUPERSEDED by `docs/plans/2026-09-29-ONE-CHAT.md` §FINAL (one contract for all nine chat entries, the action half, shadow-first rollout)
**Files:** NEW `src/services/boardQuery.ts` (schema + resolver), NEW `src/services/boardQueryAnswer.ts`, the fall-through in `coachApi.ts` (`~6335-6389`, `~6484-6500`, stock line `~1772`), `questionIntents.ts` only to hand off.
- **Schema (closed):** `kind`: why | why-not | what-if | is-good | plan | meaning | eval | meta. `subject`: a SAN (chess.js-validated from the right side), `last-move` by seat ("that" = the last ply, resolved in CODE by coordinates), a piece on a square, the position, a plan by seat, a concept id. `seat`: me | them.
- **Parser:** the 55 regex lanes stay as the fast path; anything they miss goes to the model, which may ONLY fill the schema. Validation by chess.js; unresolvable → a clarifying question with the candidate moves as choices ("the queen move or the pawn take?"). The stock "can't verify" line is deleted.
- **Answers:** why-not / what-if → play X, the refutation from `computePvLine`, a consequence read from `positionFacts`: "X? Then Y, Z — and [consequence]." Echo the parsed question so a misparse is visible. "Explain that last move" replays that move's WO-1 decision. "What's the plan" names WO-2's plan.
**Done:** the tape's 14 questions + the 86 real typed native questions (`brainstorm-r1/dialogue.md`) re-asked: most answered, zero stock lines; the exhaustive routing audit green.

---

### WO-4 — Repeats that shrink, across games
**Status:** ⚪ open — pure now, wire after WO-1
**Files:** NEW `src/services/exposureRegister.ts` (+ Dexie store with version bump + upgrade, per standing orders), reads the heat map.
- Per concept, persisted: full rule + reason → short callback ("f3 again") → trigger cue only → deliberate silence at the trigger, then speak to the result ("you found it" / "it was there"). The step comes from the student's own record (red holds full; green goes silent), never the rating.
- Rule → exception only after the rule is learned (grey gets both in one breath; red gets the rule only).
- Silent-at-trigger results feed `capabilityEvidence` — the only honest green.
**Done:** a two-game test on one device shows the second game's callback shorter; silent repeat writes capability evidence.

---

### WO-5 — The measuring stick
**Status:** 🟠 OWNED by the "Chess app review" session — its scoreboard (branch `claude/chess-app-review-perf-du6haq`, `scripts/scoreboard/`) IS this instrument, bigger: his 1,394 lines tagged + Learn's spoken output taped across 50 of his games, one classifier (2-game read: 15.2%). The 50-game run is the WO-5 baseline, committed before WO-1b merges. The hand labels below become the TAGGER'S accuracy check, not a second instrument. **Every scoreboard row also carries a BOARD-TRUTH column** — topic match without truth is sounding like him while being wrong. Re-tape on current main (plan arc re-opened behind walkability; PR #980 un-shadowed priority-first + the behaviours) before reading the gaps.
**Files:** NEW `data/danya-labels/*.json` (tagger check). No app code.
- Hand-label ~200 in-game plies from ~20 of his games (spread across ratings), by IDEA kind (plan / their plan / tactic / structure / prerequisite / switch / verdict), never by words. Skip the ~25 bare/defective distilled videos (reader reports list them).
- Score our `learn-turn-decision` lead against the label. Report per idea kind + a chat score from WO-3's question set.
- Do NOT score word overlap. Do NOT target his distilled 0.6 sentences/ply.
**Done:** a baseline number committed before WO-1b merges.

---

### WO-6 — The scratch board
**Status:** ⚪ open — MOSTLY EXISTS (WalkableLine + Walk button from WO-DANYA-01 C); only build what WO-3 finds missing
**Files:** NEW `src/components/Coach/ScratchLinePlayer.tsx` (+ test), its mount point in `CoachTeachPage.tsx` coordinated with WO-1's owner.
- Plays a line on the Learn board (arrows per move, voice per move), then snaps back to the game position. Board input disabled while it runs; any tap cancels and snaps back. Uses `ConsistentChessboard`.
- Used by WO-3 (why-not / what-if) and later by WO-2 ("first X so that Y").
**Done:** plays a 4-ply refutation and restores the exact game FEN; a board move during playback cancels cleanly.

---

## 3. What we are NOT doing yet
- The L2–L9 computer list in the review doc is parked until WO-1..3 land — more lanes today means more disconnected labels.
- No authored history / psychology / anecdotes.
- No corpus notes in Learn free play.

## 4. Status board (update in the same commit as the work)
| WO | status | owner |
|---|---|---|
| WO-0 bugs | ✅ 3/4 on main (PR #979); takeback stall open | this session |
| WO-1 door | 🔵 1a ✅ on main (PR #976); 1a'' ✅ `facts[]` cut + causal chain spoken (PR #981); 1a' ✅ orphan cleanup (G8.5): 5 closed lanes + their producers deleted, the silent fork/think-aloud/improving/best-reply chain that out-ranked priority-first removed, the unspoken look-ahead paragraph (and its arrows, and its hold on the behaviour filler) removed, 6 dead modules deleted, gate in `learnTurnDoor.test.ts`. **On main + live (PR #980, verified in the deployed chunk).** 1b next | this session |
| WO-2 plan thread | 🔵 step 1 ✅ on main (PR #977, #978: route identity + board check; lane open) | this session |
| WO-3 BoardQuery chat | ⚪ | — |
| WO-4 shrinking repeats | ⚪ | — |
| WO-5 measuring stick | 🟠 50-game scoreboard baseline | Chess app review session |
| WO-6 scratch board | ⚪ | — |

## 5. THE PLAN FROM HERE (2026-09-29, after the orphan cleanup + the review)

**WORDS BEFORE SILENCE (David 2026-09-29: "Let's get the words down before we focus on silence").** Scoreboard (34 of his 50 games, 906 beats): we land a point on 38% of his teaching beats, 17% point-for-point. The gap is WHAT WE SAY — he explains what a move is FOR (plans 115 → 12%, quiet-move purpose 89 → 7%, prevents 73 → 7%, routes 61 → 10%, king attack 52 → 10%, their move's purpose 51 → 4%, recapture choice 47 → 6%); we describe the board. So: `moveIntent` (review session, engine-proven prevents/prepares, one lane) → 1b leads with purpose → WO-2. The decoder's SILENCE half waits until the words land.

In order. Each step ends on main with a localhost hand-walk; a full prod audit only when David asks.

1. **WO-1 · cut `facts[]`** (this session, next). Everything left in the late read's `facts[]` either reaches a lane or is deleted (G8.5). The `turnFacts` audit row gets rebuilt from what the door actually spoke, so `audit-learn-full-game`'s beat histogram counts speech, not computation.
2. **WO-0 · takeback stall.** "Take that back and play c6" → the coach never replies. Repro on localhost, failing test first, fix through `actionForCommand`.
3. **WO-5 · baseline → THE DECODER** (David 2026-09-29: "it only works on the games he played. We need a computed algo that knows what to speak. The dna and decoding computer"). The scoreboard grades us on HIS games; the runtime must decide on ANY board. So WO-5's tagged data (his lines + his silences, per ply) becomes the INPUT to a decoder: for every ply compute our existing features (stakes, tactic present, plan event, structure, deciding moment, character) and fit which ones predict (a) he speaks and (b) the idea kind. Output = a readable `Record` table (the DNA), deterministic, that WO-1b's lead-picker reads instead of hand rules. Guards: fit on 40 games, score on 10 held out; features he reacts to that no computer sees are logged as GAPS (→ WO-2's build list); the table picks WHEN and WHAT KIND, facts still come from our computers, board-checked. Builds on the review session's run (in progress 2026-09-29).
   **Baseline first** (Chess app review session). The 50-game scoreboard, re-taped on current main, with a board-truth column. Committed BEFORE 1b merges.
4. **WO-1b · one lead per turn.** `decideTurn → { lead, support[], held[] }`. Lead = biggest stakes on a deciding moment, else the plan fact. Support shares squares or plan with the lead. SAFETY FLOOR: a threat or hanging piece is never held. Measured against the WO-5 baseline: over-talking falls (46 of 49 beats; piece quality 12× his 1) without losing a safety fact.
5. **WO-1c · one connected thought.** Lead + support render with connectives, not stacked sentences.
6. **WO-2 · the plan thread** — the biggest misses (plans 16/1, move purpose 13/3, king attack 10/2, good-move verdicts 10/1):
   - character + switches (tactical ↔ positional) as facts;
   - grading good moves (new — owner WO-2);
   - "deliberate, not a mistake" ONLY when the engine eval holds N plies — never on the plan computer's word;
   - "first X, so that Y".
7. **ONE-CHAT** (replaces WO-3), per `2026-09-29-ONE-CHAT.md` §FINAL: ChatTurn schema + ledger → offline parser eval gated on the 86 real + held-out phrasings (the 554 reported separately) → shadow mode → switch. Start-game always confirmed + echoed; `walkLine` only through the arrow door.
8. **WO-4 · shrinking repeats**, then **WO-6 · scratch board**.

**Coordination:** CoachTeachPage's turn path is this session's (the review session dropped ACC-1). Anyone else touching CoachTeachPage merges main first.

