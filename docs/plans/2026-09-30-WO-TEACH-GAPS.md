# WO-TEACH-GAPS — everything still missing from the coach (2026-09-30)

Branch: `claude/chess-app-review-perf-du6haq`. Everything stays on the branch
until David says main.

Inputs, all measured, none recalled:
- **Truth:** manual claim check of the run B–H tapes (6 agents, 324 claims the
  checker could not grade) + my own recheck of every FALSE. 271 checkable →
  **40 false after recheck (85%)**. ~29 of the 40 fixed in this batch
  (tests fail on old code, pass on new). Target stays **≥97%**.
- **Coverage:** Naroditsky moment match — 13 shared games, 312 of his tagged
  moments, ±1 ply, regex classifier: **14% overall**.
- **Census:** `docs/plans/2026-09-27-naroditsky-teaching-census.md` (Missing /
  Partial tables) and `docs/plans/2026-09-29-danya-full-review.md` (L2–L9).
- Open task list (#23–#70).

Order rule (unchanged from the full review): **truth before coverage.** A new
lane that speaks a false line costs more than a silent move. Phase 0 and 1 land
before any new computer in Phase 3.


---

## 🔒 RELEASE GATE (David 2026-09-30: "We go live once the entire system is built and verified to 97% accuracy. All phases 1-6 done, then merge")

Nothing merges to `main` until BOTH hold:
1. **Phases 1–6 are all done** — every row ✅, or ⛔ with David's explicit say.
2. **The whole system verifies at ≥ 97%** of all checkable claims on a fresh walk
   (walk → tape → `tape-verify.mjs` → manual pass on the unchecked half), plus the
   Learn and Review prod-shaped audits green, including LD1/LD2/LE1.

Then merge, then the post-deploy audit on prod.

---

## PHASE 0 — Finish the truth pass (blocks everything)

Status: 37 of 40 fixed, each with a fail-on-old test (`claimTruth.manual.test.ts`, `moveIntent.takesAway`, `planArc.truth`). 🟠 97 / 281 / 203 do not reproduce on the stored engine lines (the live walk used a different PV); the plan reader's material wording now names the real deal ("a piece for a pawn", like-for-like cancels) and threats count as forcing — re-verify all three in 0.3.

### 0.1 The 11 remaining false one-offs (manual check 2026-09-30)
| item | line spoken | what is wrong | fix at |
|---|---|---|---|
| ✅ 65 | "The tactics have settled — ask which piece is doing the least" | …Bb4 pin was the top move on the board | `positionCharacter` / quiet-switch: never "settled" while `detectTactics(immediate)` has a live tactic for either side |
| ✅ 84 | "Qxd4 would put the queen on d4, where …e5 hits it" | Nc6 simply takes it: Qxd4?? Nxd4 | recapture-choice reason: check the square is SAFE before naming a later hit; say "loses the queen to Nxd4" |
| ✅ 95 | "Your king's cover is thin — 2 of the pawns in front of it are gone" | only the h-pawn is gone; g6 + Bg7 still shield | king-shield count: a pawn advanced one square still shields; count only missing/over-advanced |
| 🟠 97 | "Bxc6 was the move — the idea is to set up a pin" | no pin arises in the line | best-move "idea" label must come from `detectTactics` on the PV, not the move's class |
| ✅ 189 | "their gxf5 was waiting deeper" | the refutation was g4 hitting the queen | refutation name = the PV move that actually wins material, not the first capture in the line |
| ✅ 190 | "Bc2 let them win a pawn" | g4 won a BISHOP | material read from the PV's net count, not a default "pawn" |
| ✅ 195 | "The bishop on e6 — trade it off" | no bishop on e6 | `pieceQualityLines` reads a stale eval table; key the table to the FEN and drop squares that are empty on this board |
| 🟠 203 | "The point of …d5: it takes h4 away" | d5 has nothing to do with h4 | covered by the new `denied()` rule? — verify on the position; if not, require the denied square be ATTACKED by the moved piece |
| 🟠 281 | "Qe2 was the move — it would win a pawn" | pressure only; no pawn falls | "wins a pawn" only when the PV end shows +1 pawn net |
| ✅ 294 | "c5 is a weak pawn now" | d6 defends it | weak-pawn read: isolated / backward only (no friendly pawn can ever defend it) |
| 28 | "leaves you about 1.8 points worse" | stored lines ~1.3 | wording fixed ("against the best move"); verify the number is best − line on the SAME board |

### 0.2 Checker gaps (so the next 100 games are measured, not hand-checked)
- Add verifiers for every class fixed today so a regression is caught automatically:
  "takes X away" (replay X: legal + safe + engine value), route arrival (piece
  identity), file plan (own pawn), bait (best move captures same square),
  loose piece (net of capture), challenger (cheapest attacker).
- **Read the board the claim is ABOUT.** Two agent FALSEs (186, 255) were true
  on the board the student faces. Tag each lane with its board (`before` /
  `mid` / `after`) at emission; the checker reads that tag instead of guessing.
- **cp sign:** stored lines are WHITE's point of view. Document it in
  `tape-verify.mjs` and the dump; the agents all had to rediscover it.
- Native Stockfish is NOT in this container — the checker must use
  `node_modules/stockfish/bin/stockfish-18-lite-single.js`.
- Game-history claims ("the third game now") are unverifiable from a board:
  have the lane emit its count source so the checker can grade it.

### 0.3 Re-measure — ✅ MET on run I (2026-09-30)
Run I: 6 fresh games walked on the fixed code (314c1cc21). Checker: 76 of 76
checked claims TRUE (coverage 46%). Manual pass on the 89 it could not grade
(3 agents): 68 TRUE, 3 FALSE, 9 advice, 9 unverifiable. **Combined: 144 TRUE /
3 FALSE = 98.0% of all checkable claims.** Two of the three fixed with
fail-on-old tests (a recapture called "win a pawn"; a pawn recapture called
"the same job" as a piece recapture). 🟠 Open: a plan route read backwards
("the queen's walk from c2 to d7" just after it came from d7) — needs the game
history at the route check; logged, not yet fixed.

### 0.3 (original text)
New games from the unused pool (QJ3YfBMrVls, 5MAKlJpkpsg, kYbh2NTFsS8,
s3ea8V8twrY, FPI9J8_LmJQ, 33EpuPv4ULw, zprg2WbmgzQ, l65FZlRkWcM, tWGrKGoNNEA,
wn7jKtpg2dg, …): walk → tape → checker → manual pass on the unchecked half.
Loop until **≥97% of ALL checkable claims**, not just the auto-checked ones.

---

## PHASE 1 — Architecture owed before new lanes (from the full review)

| # | build | why now |
|---|---|---|
| ~~1.1~~ | ~~ACC-1: extract Learn's narration builder~~ — **DROPPED 2026-09-30** | the move handler is ~3,000 lines of a 14,450-line page; the tape harness already records exactly what the real page speaks, so the extraction buys no measurement and carries large regression risk |
| 🟠 1.2 | **T1: every speaking lane through `coachDecider`** (one door) — ASSESSED 2026-09-30: Learn already has ONE door for its lanes (`learnTurnDoor.decideTurn`, every lane through `buildVoicePackage`; `positionFacts` enters it already decided by `coachDecider`). Merging the two deciders is a rewrite of the same scale as the dropped 1.1; debt, not a blind refactor | lanes still bypass the ranker; a new lane would add another bypass |
| 🟡 1.3 | **Shared claim keys across lanes** (#49) — in progress: `convert-method` joins the botched-conversion verdict and the "up material now" switch; `namesBetter` lets a verdict drop a better move the grade already names | the same fact from 3 lanes on one ply ("open file" ×3) |
| 🟡 1.4 | **One thread per move** (#23): lead + one support, ~30 words — MEASURED on run I (121 spoken plies, deduped): median 1 line / 22 words, mean 1.5 lines / 28 words; only 5 plies > 60 words, and those are repeated-claim stacks (fixed via 1.3), not missing structure | what Danya does; we still stack 3–5 lines |
| ✅ 1.5 | **`facts[]` audit-only list** — already gone (nothing pushes to it; the OUTLINE line was stale) | — |
| ✅ 1.6 | **Board tag on every emission** — each spoken fact's board rides its `coach-narration-spoken` event (`details.facts[{text,fen}]`); the hand driver collects it, the tape stores it per ply (`rec.boards`), the checker prints it with every FALSE and in the manual-pass dump | truth checking needs it |

---

## PHASE 2 — Close the biggest Danya gaps (measured, near-zero today)

Ranked by his moment count in the 13 shared games (× how often across the
430-game census). Every build is **dual-use** (teaches it AND records a miss
into the heat map) or it is not done.

| rank | gap | his moments / ours | computer (exists?) | what to build |
|---|---|---|---|---|
| ✅ 0 | **The opening's key idea, computed** (replaces hand-written beats) | 15% of all he says (census) | NEW `mastersPlanRead` | Walks the masters DB (his-games DB as fallback) weighted by games; names the pawn break each side goes for with its share, recaptures and captures-in-hand excluded, ≥40% floor. Lane `openingIdea`, say-once per game. Measured on 33 walked games: fires in 7, every line a real plan. The hand-written feed (`curatedBeatAt`, 33 beats in 18 games, visibly poor: "sourced from the Gordima-distilled…") is REMOVED from Learn with its orphaned module, boot warm and tests (G8.5). What it covered is now said by computed lanes: opening name, `moveIntent`, `namedPawnStructure`, `mastersPlanRead`. |
| ✅ 1 | **The plan, said as a plan** — the student's plan is now ANNOUNCED on Learn, prescriptively ("The plan for you here: X, then Y." — two aims on one move joined by `joinEmerges`); it used to be filtered, and its old wording claimed the student was already pursuing it. Also fixed: a route back to where the piece just came from is not a plan (`aimWalkableNow` history guard) | 37 / 0 | `planArc`, `deriveNextPlans`, `planRace` exist | speak the plan at phase changes and after the opening leaves book: "the plan here is X, then Y"; carry it across moves (one thread) |
| ✅ 2 | **Verdict on GOOD moves** — `criticalMomentFound`, lane `foundMove`: at a real decision moment the student played one of the only moves that held; said with why each alternative failed, no praise word | 38 / 1 | `moveReason`, `nextMoveAdvice` | a good student move earns one line naming WHY it is good when it was a decision moment (importance tier ≥ critical) — silence after a good move teaches nothing |
| ✅ 3 | **Playing a line out loud** — `exchangeLedger.proofForMover`: when the move is named with its reason, the engine's forcing winning line (≤7 plies, ends in mate or net material) is said after it | 20 / 0 | `computePvLine`, `dnaLineNarrator` | "if X, then Y, then Z" — 2–4 plies from the PV at decision moments, with the arrows drawn (arrow door) |
| ✅ 4 | **Weighing candidates** — `deliberationFacts` opens with "Candidates: A, B or C." (alphabetical, never telegraphs) before ruling out, only when a verdict follows | 19 / 0 | `deliberation` | "I'm looking at A or B —" before naming; rule one out with its refutation |
| ✅ 5 | **What THEIR move wants** — lane `theirIntent`: `moveIntent` from their seat on a quiet reply, what it prepares (the stopped-threat half was already `theirPurpose`) | 14 / 0 | `opponentIntent`, `moveIntent(seat:opponent)` | fires today only on threats; extend to quiet moves (prepares / prevents, now truth-gated) |
| ✅ 6 | **Composure / don't panic** — ALREADY BUILT as `falseAlarm` (census #7) + the gambit line; not duplicated. Firing rate to measure in the re-walk | 14 / 0 | none | when the student is worse but the engine says it holds: "looks scary, but …" with the one move that holds |
| ✅ 7 | **Tempo** — "with tempo" existed (`moveFundamentals`); the COUNT is new: `tempoCount`, lane `tempo` — their piece's third move in the opening while you have more minors out | 12 / 0 | none as a lane | a move that develops WITH a threat, or a piece forced to move twice: count it |
| 🟠 8 | **The common wrong move** — ALREADY BUILT (S2 refuted alternative reads amateur play at the student's band, warmed each turn). 0 in the walks is a HARNESS artifact: the localhost vite server has no `/api/lichess-explorer`, so the cache is always cold there. Measure on prod | 10 / 0 | explorer data exists | the move most players at the student's band play here, and why it fails (the refuted-alternative lane on the explorer's top move) |
| ✅ 9 | **Converting when ahead** — the method step was already live (`readConversion` in `positionFacts`); the missing half is new: `stalemateWatch`, lane `stalemate` — ahead by a piece and a move of yours stalemates them: every such move named | 18 / 0 | `conversionMethod` | name the choice (trade / attack / push) and WHY this one; stalemate + diminishing-returns watch |
| 🟠 10 | **Recapture choice** — built; measure its rate in the re-walk (fires only on a real two-way recapture) | 8 / 0 | built (#50) but rarely fires | measure why it does not fire on these 8 |
| ✅ 11 | **Practical play** — ALREADY BUILT: `criticalMomentStatement` ("only one move holds — slow down") on Learn, plus `foundMove` after it | 9 / 0 | criticalMoment counts | "only one move holds, the rest lose" as a practical warning; human-vs-engine framing |
| 🟠 12 | **Space / prophylaxis** — `moveIntent.prevents` truth-gated (P0) and now also read from their seat (`theirIntent`); measure in the re-walk | 13 / 0 | positionalRead, moveIntent.prevents | prophylaxis now truth-gated — let it speak on quiet positions |
| ✅ 13 | **Piece quality / structure** — stale-table bug fixed (195); a structure is named once, the move it crystallises (`namedPawnStructure`, say-once) | ~10% | `pieceValueRead`, `namedPawnStructure` | fix the stale-table bug (195) first, then speak structure CHANGES, not states |
| ✅ 14 | **King attack** — we OVER-say it (his 2, ours 22); nothing to build | 2 / 22 | king-attack aim | open lines, storms, sacs at the king — the census #2 missing item |

---

## PHASE 3 — The rest of the census (Missing + Partial), after 97%

**Missing (census ranks):** rule → exception (#10); what THEIR move cost them
structurally (#5); one move, two jobs (#6, partly built in moveIntent);
alternative refuted because it fails a JOB (#11); how to calculate — count,
visualise, blunder-check (#12); endgame technique (#13, task #47: attack from
behind, pawn defends pawn, lateral pin); push for a win or hold (#14, task #51);
the wishlist method (#15).

**Partial:** the opening's key idea (15% of everything he says — the single
biggest thing, still partial); overall verdict by one comparison; candidates as
a question; trade judgement (T3, #45); quiet-move purpose (Ne2-not-Nf3, Qa1
behind the rook); tempo; piece maneuvers (destination first, then path);
timing ("now is the moment", `moveTiming`); their next move; hidden danger;
plan against plan.

**Parked computers (L2–L9, full review):** rule→exception, what-changed /
drawback read (both seats), multi-job + stakes, callbacks to the thesis,
conversion method with the choice, habit split into `methodBeat`, opponent
intent as a two-step plan + structure transfer on the opening name, his data on
the live board (`danya-play-db` "his move here", trap candidates as gems).

**Method beats still missing:** split the position, three ways to meet check,
question the knee-jerk, trigger→scan, autopilot guard, safety precheck.

**STATUS 2026-09-30 (census re-checked against the code, not the list):**
- ALREADY BUILT, list was stale: rule→exception (`ruleException`), what their
  move cost (`theirMoveCost`), push or hold (`pushOrHold`), endgame technique
  (`endgameTechnique`: opposition, key squares, rule of the square, rook-pawn
  corner, Lucena, Philidor, cut-off, rook behind the passer), the wishlist
  method (`moveIntent.prepares`), the alternative that fails a job
  (`refutedAlternative`), candidates (P2 #4), tempo (P2 #7).
- ✅ NEW: **timing** on Learn (`moveTiming` was review-only — parity), lane
  `timing`; **trade judgement** (`tradeJudgement`, lane `trade`: ahead / behind
  and it cost / bad bishop from fixed centre pawns / attacker by the king gone);
  **three ways to meet check** (`checkMethod`, lane `checkMethod`, once per game,
  names the kinds never the move); **question the knee-jerk** (`kneeJerk`, lane
  `kneeJerk`, once per game).
- STILL OPEN: split the position, trigger→scan, autopilot guard, safety
  precheck — each needs a board signal that proves the habit mattered; not
  built until one is found (empty > generic).

---

## PHASE 4 — The loop (the app's definition), still owed

- **Heat map GREEN** is built for tactics; extend `capabilityEvidence` so every
  Phase-2 computer records "posed and answered" as well as "missed".
  - 🟡 STARTED 2026-09-30: a Learn lane can couple `evidence` (tag + posed
    importance) at emission; `recordTeachingEvidence` → `recordLaneEvidence`
    writes one HELD row (origin `learn`, `prompted` honest — a found move after
    the critical moment was announced counts as neither). Wired: found move →
    `calculation-depth` (90), a good trade → `bad-trade` (60), a well-timed pawn
    move → `mistimed-pawn-break` (70). Only HELD: the miss is already recorded
    by the live slip capture. Gate: `capabilityEvidence.lane.test.ts` (two
    unprompted finds → GREEN; prompted never). Open: stalemate avoided, check
    answered without the king, tempo (their half — nothing of the student's to
    record).
- **Strength from move one** — ✅ ALREADY WIRED on Play: `liveStrength` reads the same posed/answered measurement as `capabilityEvidence` and sets the Stockfish opponent every move (`CoachGamePage` → `discussion.liveRating`). The line above saying "not wired" was stale. Gem hit / book departure as extra inputs: open.
- **Fade:** ✅ BUILT 2026-09-30 — the Learn door (`fadeWhenGreen`) speaks only the first sentence of a lane whose skill the student has PROVEN (`loadProvenTags` → `capabilityProven`); grey/red keep the full teaching; only lanes whose held half is wired can fade. Recorded on the `learn-turn-decision` row as `faded`; audit contract LD3 (a fresh device fades nothing).
- **Concept-level spaced retrieval** and **transfer** ("you met this two games ago").

---

## PHASE 5 — Surfaces and content (open tasks)

- Review lines draw arrows + walk-the-line button (#25).
- Question walk: basic + next-level board questions mid-game (#37); coach
  answering questions walk + fix (#41).
- T4: concession, move→plan link, branching line narrator (#46).
- Plans: break preparation, plan chooser, transposition reader, opening summary (#52).
- Voiced corpus: strip video residue + first person (#55) — 🟡 residue ✅ (5 notes fixed at the source, banned by `voicedDepersonalized.test`); first person MEASURED at 700 of 7,477 notes, held to a shrink-only ceiling — each needs an authoring decision (flip to "you" or drop), not a blind rewrite; re-anchor 163
  one-ply-late opponent beats (#56).
- **NO HAND-WRITTEN NOTES ON THE LIVE COACH (David 2026-09-30: "I do not want
  to rely on the hand written notes. I want to accomplish the ideas via
  computer.").** Items 206/207/263 were hand-authored lesson beats reaching the
  live board through `curatedBeatAt`. Order, so the opening never goes quiet:
  1. Build the **opening-idea computer** (Phase 2 #0 below) — the key idea, the
     typical plan and the break, computed from the pawn structure, the move DB
     (most-played continuations + their results) and the engine.
  2. Measure it against the curated beats on the same positions (coverage +
     claim checker).
  3. Remove the `curatedBeatAt` feed from Learn free play and Review, and its
     gate/test anchors (G8.5: delete the producer with the lane).
  Masterclass Watch/Learn lessons on /openings are NOT in this scope unless
  David says so.
- Algo search depth: `searchUntilStable` + consumers + audit contract (#42).
- Walks still owed: 800/1000, endgame-heavy, both seats (#40); 1380 re-walk (#32);
  N900/N1500/N2065 review walks (#34); 1690 free-play + review (#57).

---

## PHASE 6 — Ship

Only after David's say: merge the branch to `main` (the push to main needs his
allow), grep the live chunk for a new string, then the two muted audits in
sequence — Learn (`audit-concept-gameplay-prod`) then Review
(`audit-review-overhaul-prod`) — and read the narrations, not the counts.

---

## Sequencing

0 → 1 → 2 → 3/4/5 in parallel where they do not share files. Phase 0 is the
gate: every new lane is one more thing that can say something false, and the
measured rate is 85%, not 97%. Phase 1 before Phase 2 because a lane added
before the one door and the one thread lands as one more disconnected label
(the full review's finding, all five readers agreed).

---

## PHASE 6 — every computer dual-use, Play asks them, audits for live (David 2026-09-30)

David: "Make sure all other computers carry the same dual role … Can we add a teaching function to ALL current computers? … add the proper audit tools for when we go live … Play still needs access to these computers to answer questions on demand." Decisions: scope = all live-coach computers; no-student-skill → N/A with a reason; Play = every question that makes sense; merge after the audits are built and green.

- ✅ **`computerRoles.ts`** — `Record<LearnLane, {computer, tag, held, broken, askable}>`, each half `wired` (code path named and checked to exist) / `owed` (shrink-only, now 1: falseAlarm on Play needs an engine line at question time) / `na` with its reason. A new lane fails to compile until it answers. Gate `computerRoles.test.ts`.
- ✅ **HONESTY BUG FOUND AND FIXED**: `evaluatePlayerMove` recorded every clean Learn move as UNPROMPTED held evidence, though Learn now announces critical moments before the move. `prompted` is a REQUIRED arg at all five capture sites (Learn: announced ply; WLPP practice: hint shown; middlegame practice: hint used; opening play: hint level; review card: false).
- ✅ Held rows now wired for: found move, good trade, well-timed quiet move, right recapture, threat rightly ignored, move order, move intent. Said-before-the-move lanes (gem, tactic, threat, its answer, stalemate, check method) are N/A: a find after them is prompted.
- ✅ **Trade by piece quality** — `tradeJudgement` reads the engine's per-piece table (fetched only on a completed trade): their busiest piece off = good trade; your best for their idlest = a bad deal. `weakestByDelta` is the twin of `strongestByDelta`.
- ✅ **Play Q&A** — `studentMoveAnswerLines` / `theirMoveAnswerLines` / `dangerAnswerLines` (text only — answers never write evidence) appended to the move-rating, opponent-move and assessment answers in `coachApi`.
- ✅ **Audit tools** — the Learn door emits `learn-turn-decision` (aggregated like `coach-decision`); `recordLaneEvidence` logs `lane-evidence`. Contracts in `audit-concept-gameplay-prod.mjs`: LD1 emitted, LD2 spoken ⊆ offered and lead spoke, LE1 held-only + prompted answered. Declared in `algoAuditContract.test.ts`.
- ✅ Run J (re-walk of run I, new build): candidates, tempo count, trade-when-ahead, found-move, plan-as-plan all fire. Fixed from it: timing on captures/checks (quiet moves only), "their piece" for the king.

### Run J — re-walk on the Phase 2-6 build (2026-09-30)
6 games (run I's), 114 spoken plies. Checker, after fixing two checker bugs
(opponent-intent moves were played for the student; found-move lines were not
replayed from the board before the move — a new verifier now does): **79 of 80
checked claims TRUE (98.8%), coverage 48%.** The one FALSE was real — "the
tactics have settled" with material loose — fixed at the source (the switch is
held while either side can win a piece by exchange; pinned by a test). The
manual pass on the unchecked half is owed on the FINAL build (the release
gate's measurement), not on this one.

### TRIAGE vs CODE (2026-09-30, every open row of Phases 1/3/4/5, file:line checked)
BUILT: 1.2 Learn door · one move two jobs · latentDanger · concession (#46).
PARTIAL: ~~1.2 Review speaks outside the door~~ ✅ (every uncapped review ply passes `buildVoicePackage`: board grade on the board before OR after the move, the not-speakable screen, a per-game sentence ledger; audit row `review-voice-package`, contract "REVIEW DOOR package ran"; Play stays silent by David's call) · 1.3 ~10 lanes carry no claim key · 1.4 (structure yes; NO word budget — and a budget would be a G4.5 cap, so the structure IS the answer) · trigger→scan (forcing-scan only) · how-to-calculate (drill only) · overall verdict (a list, not one comparison) · piece maneuvers (path-first wording) · ~~their next move~~ ✅ (Learn's `theirIntent` lane says what their quiet move prepares — that IS their next move) · ~~planRace (file-collision review-only)~~ ✅ (`fileClaimed`, lane `fileRace`: said AFTER the student's rook takes the contested file — never "claim it now", which would name the next move unearned; held evidence `passive-rook`) · ~~callbacks to the thesis~~ ✅ folded into the move→plan link · trap candidates (LLM context, not a gem) · structure transfer · ~~heat-map (stalemate avoided, check answered)~~ ✅ stalemate avoided is a `capabilitiesPosed` question (held/broken on every recording surface); check answered = N/A (no student-model tag names it; a costly answer is already attributed) · transfer (slips only) · liveStrength (no gem/book inputs) · #37/#41 walks unrecorded · ~~move→plan link (student advance filtered)~~ ✅ (the student's FIRST step toward their announced plan speaks once; a move after the plan was told is prompted for `no-plan`) · branching narrator (no caller) · break preparation (narrow) · opening summary.
MISSING: split the position · ~~autopilot guard~~ ✅ · ~~safety precheck (blunder check)~~ ✅ · ~~his data on the live board~~ ✅ (`strongChoice`, depersonalized) · ~~concept-level SRS~~ ✅ (`conceptSchedule`: a missed card brings its concept's other open cards due today; phase-only buckets never pull) · ~~fade~~ ✅ · plan chooser · transposition reader · #56 re-anchor 163 beats · walks #40, #32.

**David's calls on the design rows (2026-09-30):** concept-level SRS → FOLD INTO MISTAKE DRILLS (cards carry the concept tag; SRS schedules by concept too; no new screen or store) · his data on the live board → SAY IT DEPERSONALIZED ("a strong player's choice here is X", never a name) · fade → SHORT PHRASING WHEN GREEN · one door → REVIEW YES, PLAY NO (Play stays silent; its answers already use the shared computers).

### Honesty fix (2026-09-30, found while wiring the stalemate row)
A warning spoken BEFORE the student moves (threat, tactic, gem, stalemate, how
to meet check) never marked that move as prompted — only the critical-moment
announcement did. A warned-then-answered move could therefore file as unaided
proof. Now the Learn door's spoken lanes are checked against
`SAID_BEFORE_MOVE` (derived from the role table) and the board they spoke on
is marked; the move made from it joins `announcedPliesRef`, so every evidence
row it writes is prompted.

### Review through the one door — measured (2026-09-30)
Scratch run: 4 real model games, node Stockfish depth 9, the production
(uncapped) builder. 301 review sentences, 0 false on the boards around the
move. The door dropped 24 of 280 parts (8.6%): the plan-race sentence repeated
on 7 straight plies, restated standing tactics, repeated trade/target lines —
real repetition — plus FOUR false refusals it exposed, all fixed at the root:
- `voicePackage` refused "Do not move the pawns in front of your own king…" as
  an "instruction to a model" (case-insensitive DO NOT) — now shouted only.
- `configurationClaims` refused a GOAL ("build toward a passed pawn", "their
  plan is taking shape: a passed pawn") and a PRINCIPLE ("a rook needs an open
  file") as false board claims. Learn's plan line runs the same checker, so a
  passer plan could never be spoken on Learn either. A structure named after an
  aspiration word in its own sentence is no longer a claim about the board.
