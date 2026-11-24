# Card — `structurePlanFact` (family F)

### A. Identity
- `structurePlanFact(fen, studentColor)` — `src/services/nextPlans.ts:958-~1064` (the trump: passer branches, isolani, IQP); helpers `passerBlock` :884, `passerStopper` :944, `isolaniStructure` :1135, `passerTrumpSentence` :767.
- Adapter `structurePlan` `boardComputers.ts:3007-~3026` (input :677): say-once by `ideaKey`/`aim`, event `announce`|`changed` (`structurePlanEvent`, planThread), kind `structure-plan`, LIVE_READ. Census: 351 / 287 said (T).

### B. Facts
- **B1** `StructurePlanFact`: `id` (passer-blockaded-enemy | passer-blockaded-friendly | passer-caught | passer-stopped | passer-race:you/them | passer-mine | passer-theirs | iqp-mine | iqp-theirs), `aim`, `ideaKey`, `squares`, `text`.
- **B2 dropped**: `block.piece` and square kept only in text (:969-974); `stopper` {front, by, piece} in text (:983-985); `race` object (`detectPlanRace`, :1006-1007) — counts dropped; `ending` boolean (:1037-1038, ≤2 non-pawn pieces) used for wording only. The `passer-mine` text is a before-move instruction ("push it and make them deal with the promotion", :1014) — it names the student's next move, the same defect as passedPawnPush.
- **B3 cheap**: the id CHANGE across a move (`structurePlanEvent` already computes announce/changed) — a change caused by S's move = the move altered the trump (e.g. passer-mine → passer-stopped: "your move let their knight cover the queening path").
- **B4 gates**: student passer first (most advanced), then theirs, then isolani (named, then any central isolated), endings for IQP wording; said once per idea/aim.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | text per id (the rule is inside: "keep pieces on and use the open lines", "trade pieces and pile onto it") | — |
| CONSEQUENCE | partly | id passer-stopped/caught | — |
| BETTER MOVE + JOB | no | — | engine best |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SPF1 | IQP owner traded down | S | id iqp-mine, S's move traded pieces (material count down), cost ≥ inaccuracy | iso | "With an isolated pawn, keep pieces on and attack: every trade brings the endgame where it's a target." | "In the ending d4 falls." | engine best (a non-trade) | "With an isolated pawn, ask before every trade: does this bring the ending closer?" | after | ending already (:1038) | C (piece count diff) |
| SPF2 | vs IQP — didn't trade/blockade | S | id iqp-theirs, S played away from it | | "Against an isolated pawn, trade pieces and blockade the square in front." | | engine best | | after | | H |
| SPF3 | passer stopped by S's move | S | id changed passer-mine → passer-stopped/caught on S's move | stopper | "A passed pawn is a trump only while it can run: their knight now covers the square in front of yours." | | engine best | | after | | C (event diff) |
| SPF4 | their passer | O | id passer-theirs and S's move ignored it (join blockade BL2) | | "Their passed pawn is the danger: stop it before it runs." | | engine best | | after | | H |
| SPF5 | knowledge — blockaded passer | S | passer-blockaded-enemy | | "A blockaded passer is still a trump: challenge the blockader first." | | | | Review/chat | | H |
| SPF6 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): SPF1/SPF2 → **E15 positional** (`bad-trade` / `no-plan`); SPF3/SPF4 → E15 `passed-pawn-neglected` or **E12 allowed-threat** (their passer's push).
- SPF1/SPF2: no exact cause today; nearest `no-plan`. Candidate new cause `traded-into-target` (S traded pieces with an IQP). SPF3/SPF4: `passed-pawn-neglected` / blockade-lifted (blockade card).

### F. Build changes
1. Type the branch payload (`stopper`, `blocker`, `race` counts) on `StructurePlanFact`.
2. Expose the `announce/changed` event with the move that caused it (planThread already computes it) → SPF3 trigger.
3. `mistakeLesson`: `no-plan` + iqp-mine + a trade → SPF1. No new cause: an IQP owner trading down is E15 positional with the record tag `bad-trade` ("relieved the opponent's position", misconceptionTags.ts:409) — the tag exists, the recipe row keys on it.
4. `passer-mine` (:1014) leaves Learn's before-move path; its push is SPF3/passedPawnPush PP1's BETTER-MOVE after the move.

### G. Proof boards
- Census (subsumed lines in readPosition dump): "You're playing with the isolated pawn on d6 — keep pieces on and use the open lines for activity…"; "Your passed pawn on c2 can't advance yet: their knight on b3 covers c1…"; "They have an isolated pawn on e6, so trade pieces and pile onto it…".
- Guard: ending (≤2 non-pawn pieces) switches the IQP wording.

### H. Open questions
- none (the cause is a build question, answered in F3: the existing `bad-trade` tag).
