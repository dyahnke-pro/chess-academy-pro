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

### 0.3 Re-measure
New games from the unused pool (QJ3YfBMrVls, 5MAKlJpkpsg, kYbh2NTFsS8,
s3ea8V8twrY, FPI9J8_LmJQ, 33EpuPv4ULw, zprg2WbmgzQ, l65FZlRkWcM, tWGrKGoNNEA,
wn7jKtpg2dg, …): walk → tape → checker → manual pass on the unchecked half.
Loop until **≥97% of ALL checkable claims**, not just the auto-checked ones.

---

## PHASE 1 — Architecture owed before new lanes (from the full review)

| # | build | why now |
|---|---|---|
| ~~1.1~~ | ~~ACC-1: extract Learn's narration builder~~ — **DROPPED 2026-09-30** | the move handler is ~3,000 lines of a 14,450-line page; the tape harness already records exactly what the real page speaks, so the extraction buys no measurement and carries large regression risk |
| 1.2 | **T1: every speaking lane through `coachDecider`** (one door) | lanes still bypass the ranker; a new lane would add another bypass |
| 1.3 | **Shared claim keys across lanes** (#49) | the same fact from 3 lanes on one ply ("open file" ×3) |
| 1.4 | **One thread per move** (#23): lead + one support, ~30 words | what Danya does; we still stack 3–5 lines |
| ✅ 1.5 | **`facts[]` audit-only list** — already gone (nothing pushes to it; the OUTLINE line was stale) | — |
| 1.6 | **Board tag on every emission** (feeds 0.2) | truth checking needs it |

---

## PHASE 2 — Close the biggest Danya gaps (measured, near-zero today)

Ranked by his moment count in the 13 shared games (× how often across the
430-game census). Every build is **dual-use** (teaches it AND records a miss
into the heat map) or it is not done.

| rank | gap | his moments / ours | computer (exists?) | what to build |
|---|---|---|---|---|
| ✅ 0 | **The opening's key idea, computed** (replaces hand-written beats) | 15% of all he says (census) | NEW `mastersPlanRead` | Walks the masters DB (his-games DB as fallback) weighted by games; names the pawn break each side goes for with its share, recaptures and captures-in-hand excluded, ≥40% floor. Lane `openingIdea`, say-once per game. Measured on 33 walked games: fires in 7, every line a real plan. The hand-written feed (`curatedBeatAt`, 33 beats in 18 games, visibly poor: "sourced from the Gordima-distilled…") is REMOVED from Learn with its orphaned module, boot warm and tests (G8.5). What it covered is now said by computed lanes: opening name, `moveIntent`, `namedPawnStructure`, `mastersPlanRead`. |
| 1 | **The plan, said as a plan** | 37 / 0 | `planArc`, `deriveNextPlans`, `planRace` exist | speak the plan at phase changes and after the opening leaves book: "the plan here is X, then Y"; carry it across moves (one thread) |
| 2 | **Verdict on GOOD moves** | 38 / 1 | `moveReason`, `nextMoveAdvice` | a good student move earns one line naming WHY it is good when it was a decision moment (importance tier ≥ critical) — silence after a good move teaches nothing |
| 3 | **Playing a line out loud** | 20 / 0 | `computePvLine`, `dnaLineNarrator` | "if X, then Y, then Z" — 2–4 plies from the PV at decision moments, with the arrows drawn (arrow door) |
| 4 | **Weighing candidates** | 19 / 0 | `deliberation` | "I'm looking at A or B —" before naming; rule one out with its refutation |
| 5 | **What THEIR move wants** | 14 / 0 | `opponentIntent`, `moveIntent(seat:opponent)` | fires today only on threats; extend to quiet moves (prepares / prevents, now truth-gated) |
| 6 | **Composure / don't panic** | 14 / 0 | none | when the student is worse but the engine says it holds: "looks scary, but …" with the one move that holds |
| 7 | **Tempo** | 12 / 0 | none as a lane | a move that develops WITH a threat, or a piece forced to move twice: count it |
| 8 | **The common wrong move** | 10 / 0 | explorer data exists | the move most players at the student's band play here, and why it fails (the refuted-alternative lane on the explorer's top move) |
| 9 | **Converting when ahead** | 18 / 0 | `conversionMethod` | name the choice (trade / attack / push) and WHY this one; stalemate + diminishing-returns watch |
| 10 | **Recapture choice** | 8 / 0 | built (#50) but rarely fires | measure why it does not fire on these 8 |
| 11 | **Practical play** | 9 / 0 | criticalMoment counts | "only one move holds, the rest lose" as a practical warning; human-vs-engine framing |
| 12 | **Space / prophylaxis** | 13 / 0 | positionalRead, moveIntent.prevents | prophylaxis now truth-gated — let it speak on quiet positions |
| 13 | **Piece quality / structure** | ~10% | `pieceValueRead`, `namedPawnStructure` | fix the stale-table bug (195) first, then speak structure CHANGES, not states |
| 14 | **King attack** | 2 / 22 | king-attack aim | open lines, storms, sacs at the king — the census #2 missing item |

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

---

## PHASE 4 — The loop (the app's definition), still owed

- **Heat map GREEN** is built for tactics; extend `capabilityEvidence` so every
  Phase-2 computer records "posed and answered" as well as "missed".
- **Strength from move one** (gem hit → book departure → cpLoss at decision
  moments) — one detector, two consumers; not wired to the opponent's strength yet.
- **Fade:** two phrasings per fact kind by heat-map state (#27).
- **Concept-level spaced retrieval** and **transfer** ("you met this two games ago").

---

## PHASE 5 — Surfaces and content (open tasks)

- Review lines draw arrows + walk-the-line button (#25).
- Question walk: basic + next-level board questions mid-game (#37); coach
  answering questions walk + fix (#41).
- T4: concession, move→plan link, branching line narrator (#46).
- Plans: break preparation, plan chooser, transposition reader, opening summary (#52).
- Voiced corpus: strip video residue + first person (#55); re-anchor 163
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
