# Card — `structurePlanFact` (family F)

### A. Identity
- `structurePlanFact(fen, studentColor)` — `src/services/nextPlans.ts:958-1071` (the trump: passer branches, isolani, IQP); helpers `passerBlock` :884, `passerStopper` :944, `isolaniStructure` :1135, `passerTrumpSentence` :767.
- Adapter `boardComputers.ts:~3010-3026`: say-once by `ideaKey`/`aim`, event `announce`|`changed` (`structurePlanEvent`, planThread), kind `structure-plan`, LIVE_READ. Census: 351 / 287 said (T).

### B. Facts
- **B1** `StructurePlanFact`: `id` (passer-blockaded-enemy | passer-blockaded-friendly | passer-caught | passer-stopped | passer-race:you/them | passer-mine | passer-theirs | iqp-mine | iqp-theirs), `aim`, `ideaKey`, `squares`, `text`.
- **B2 dropped**: `block.piece` and square kept only in text (:972-975); `stopper` {front, by, piece} in text (:986); `race` object (`detectPlanRace`, :1007) — counts dropped; `ending` boolean (:1034) used for wording only.
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
| SPF1 | IQP owner traded down | S | id iqp-mine, S's move traded pieces (material count down), cost ≥ inaccuracy | iso | "With an isolated pawn, keep pieces on and attack: every trade brings the endgame where it's a target." | "In the ending d4 falls." | engine best (a non-trade) | "With an isolated pawn, ask before every trade: does this bring the ending closer?" | after | ending already (:1034) | C (piece count diff) |
| SPF2 | vs IQP — didn't trade/blockade | S | id iqp-theirs, S played away from it | | "Against an isolated pawn, trade pieces and blockade the square in front." | | engine best | | after | | H |
| SPF3 | passer stopped by S's move | S | id changed passer-mine → passer-stopped/caught on S's move | stopper | "A passed pawn is a trump only while it can run: your move let their knight cover the square in front." | | engine best | | after | | C (event diff) |
| SPF4 | their passer | O | id passer-theirs and S's move ignored it (join blockade BL2) | | "Their passed pawn is the danger: stop it before it runs." | | engine best | | after | | H |
| SPF5 | knowledge — blockaded passer | S | passer-blockaded-enemy | | "A blockaded passer is still a trump: challenge the blockader first." | | | | Review/chat | | H |
| SPF6 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- SPF1/SPF2: no exact cause today; nearest `no-plan`. Candidate new cause `traded-into-target` (S traded pieces with an IQP). SPF3/SPF4: `passed-pawn-neglected` / blockade-lifted (blockade card).

### F. Build changes
1. Type the branch payload (`stopper`, `blocker`, `race` counts) on `StructurePlanFact`.
2. Expose the `announce/changed` event with the move that caused it (planThread already computes it) → SPF3 trigger.
3. `mistakeLesson`: `no-plan` + iqp-mine + a trade → SPF1.

### G. Proof boards
- Census (subsumed lines in readPosition dump): "You're playing with the isolated pawn on d6 — keep pieces on and use the open lines for activity…"; "Your passed pawn on c2 can't advance yet: their knight on b3 covers c1…"; "They have an isolated pawn on e6, so trade pieces and pile onto it…".
- Guard: ending (≤2 non-pawn pieces) switches the IQP wording.

### H. Open questions
1. New cause `traded-into-target` vs folding into `no-plan`?
