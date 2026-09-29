**1. Why one move produces 5–8 facts, and where "one idea" would live**

Learn's live commentary is not made by one composer. It is about 15 lanes sitting inline in a closure inside `CoachTeachPage.tsx`, the 14.6k-line page component.
- `decide()` sees only one lane: the clauses from `computePositionFacts` (`positionFacts.ts:903`), called with `posture:'walk'` (`CoachTeachPage.tsx:9073-9076`). Under walk, importance never mutes the ply, and the floor is about 0 on important tiers.
- Subsumption can't merge different ideas. It needs Jaccard ≥ 0.6 (`factSelector.ts:79`) and the same family (B12). Two different ideas on one ply never merge.
- Every other lane goes around the door. Nineteen `queueSpokenHint` sites push onto a pending list (`:8522`): deliberation, register/gap (`:9130-9131`), planArc (`:9530`), fork (`:9266`), hint dial (`:9341`, `:9488`), borrowed/drawback/point (`:10279`, `:10470-10493`).
- There are two voice tracks. The instant package and event line speak first, then the late package.
- `buildVoicePackage` (`voicePackage.ts:339`) sorts by a fixed `RANK` (`:179`, `:402`) and is **uncapped by design** (`:298`). Only a DNA-kind filter follows (`CoachTeachPage.tsx:10646`).

So no single place picks THE teaching point. `voicePackage` orders the lines; it doesn't choose one. The right home is `decide()`. Route every lane's fact into its bundle with `stakes` and `family`, then have `decide()` return one lead plus optional support. That keeps "the computer decides", with no cap.

**2. Game-level thesis**

Only a partial one exists.
- `planArc` (`planArc.ts:97`) keeps per-seat aims across the game (`planArcRef`, `CoachTeachPage.tsx:1808`, `:9516-9523`). It holds several aims at once, not one thesis, and nothing later refers back to it.
- The review thesis (`teachingSelector.renderThesis`, `:346`) is retrospective ("turned"). It needs the whole game.
- Where a thesis would go: a `learnMemRef.thesis` = the dominant planArc aim, locked once it `emerge`s. `decide()` would then give a bonus to facts whose squares touch it, which is L5.

**3. Effort for the L0 match instrument**

Headless is feasible, but not today "by calling the composer directly": the orchestration lives in the component. Precedent: `computedVoiceAudit.report.test.ts` already drives the real producers with node Stockfish (`:47`). But it re-calls the lanes itself, a parallel pipeline that can drift from the page and go falsely green.
- **Honest route:** extract the turn into a pure `composeLearnTurn(input) → {lines, decision}` that the page and L0 both call. About 3–5 days, and the same seam is where L1 lands.
- **Browser route:** batch `hand-driver.mjs`. About 1 day to build, but roughly 5s a ply, so the ~300 in-game videos (~12k plies) take about 15–20 hours. Only fine for a ~20-game fixed set.

**4. Cheap computers (the data already exists)**

- **Stakes / equal choice and practical vs objective:** the MultiPV fan (`analysis.topLines`) is already read by `deliberation`. Both are a count of the gap.
- **Rule→exception:** the principle lands in `ruleHere` and the engine best is in the same `computePositionFacts` scope.
- **Multi-job:** count the distinct clause kinds pinned to the played move's squares.
- **L9 "his move here":** `src/data/danya-play-db.json` is shipped and unused on the live board.
- **What-changed:** `backwardLook` and board-delta exist; they need squares coupled in, not a new computer.

**Question for the coach brains**

When his one idea and our top-stakes fact disagree, which should L0 score as the match? The same idea (which structure fired), or the same square target? That choice decides whether L1 ranks on stakes or on "one plan all game".

**Top recommendation**

Extract `composeLearnTurn` first. That one extraction makes L0 run headless on the real pipeline, gives L1 its single deciding point in `decide()`, and gives the thesis (L5) a place to live.