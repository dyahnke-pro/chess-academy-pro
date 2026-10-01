# Unify the coach — one teacher on every surface (2026-10-01)

David, 2026-10-01: *"Every move you make is to unify the coach and algo. Nothing
new, just tying things together."* · *"The app is a TEACHER. Not a reader of the
board. Everything we do teaches the user how to think … rules to follow, golden
nuggets."*

This is Phase 7 of `2026-09-08-unified-coach.md` ("one coach, not a pile of
features"), scoped to what the week of 2026-09-24 → 10-01 built. NOTHING here is a
new computer. Every row names the EXISTING function that closes it.

Inputs (measured, not recalled):
- Code census of 140 feat/fix commits (read-only, every claim grepped; spot-checked
  by hand: studentMoveTeaching has ONE caller; queenVsSeventh / findTriangulation /
  findBreakthrough have ZERO; deriveNarrationArrows has no refuted-move rule; two
  trade computers).
- Learn tape, 3 fresh games, every unique sentence classed teach vs describe:
  ~40 of ~150 (≈27%) state the board with no rule (`/tmp` notes copied below §B).
- Review tape: same 3 games — classification pending the walk.

## The shape of the problem
The week's computers were built for Learn. `studentMoveTeaching` /
`theirMoveTeaching` / `dangerAnswerLines` (learnBoardTeaching.ts) are pure and
called ONLY by CoachTeachPage. Review rebuilt a handful one by one; chat reaches a
few through answer lines. So the same student sees a different coach on each tab —
and the lessons (rules, methods, definitions) are attached to some lanes and not
others. Two fixes, one principle: **one computer per fact, one lesson per fact,
every surface calls it.**

## A. Unify — one computer per fact (ranked by how often a student hits it)

| # | gap | today | close with |
|---|---|---|---|
| A1 | **Move grade** — 3 wordings, 2 band inputs (Learn cp bands, Review win%) | inaccuracyCall.ts:370 (cp only) · reviewFullData QUALITY_CLAUSE :1076 · groundedAnswer assembleMoveRatingAnswer :5586 | `callInaccuracyDetailed` fed evalBefore/After so `classifyMove` uses one band; one wording for all three |
| A2 | **Student-move lanes Learn-only** — recapture, kneeJerk, strongChoice, fileRace, blunderCheck, autopilot, keepPressing, kingAttack, ruleException, falseAlarm, pushOrHold, moveIntent, moveOrder, theirMoveCost, tempo, stalemate, checkMethod, countMethod, splitPosition, character | CoachTeachPage only | Review calls `studentMoveTeaching` / `theirMoveTeaching` / `dangerAnswerLines` per ply, through its own door (coachDecider) |
| A3 | **Threat answer** — 3 computers | threatAnswer.ts:58 (Learn) · describeThreatPrevention (Review/chat) · deliberation.threatAnswerWhy | `threatAnswer` everywhere |
| A4 | **Trade verdict** — 2 computers, Learn can say both on one trade | tradeJudgement.ts:39 · tradeQuality.readTrade :126 (Review + positionFacts 'trade') | one: the piece-quality judgement (`tradeJudgement`, reads `pieceValueRead`) |
| A5 | **Best/worst piece** — 3 computers | pieceValueRead (Learn) · pieceQuality ablation (Review) · findPieceQuality (chat) | `pieceValueRead` |
| A6 | **Held evidence written from Learn only** — games played in Play or imported can never turn bad-trade / capture-toward-centre / mistimed-break / calculation-depth / missed-threat / no-plan GREEN | recordTeachingEvidence (Learn) vs capabilitiesPosed (sweep) | fold each lane's `evidence` into `capabilitiesPosed`, as stalemate already is |
| A7 | **Named-move arrows** — 3 derivations; walkthrough/lesson path has no refuted-line rule (fbd62b6ba overstated "every surface") | namedMoveArrows · injectCandidateArrows · narrationArrows.deriveNarrationArrows :180 | `extractArrowableSans` inside all three; Review gets the named-move fallback |
| A8 | **Askable claims vacuous** — chat never reaches moveIntent, moveOrder, causalChain, backwardLook, planArc, mastersPlanRead, priorityFirst, theirPurpose/Intent, character, trapAhead, pushOrHold; studentMoveAnswerLines passes bestLine undefined | computerRoles `askable: wired` checks only that the `via` name exists | answer lines call the lane computers; the gate asserts a note comes OUT per askable lane |
| A9 | **Concept clause absent from Review** | conceptEngine via positionFacts (Learn/chat) | `conceptForBoard` / `endgameConceptFor` in Review |
| A10 | **Two teach/describe tables** | DESCRIPTION_LEAD (learnTurnDoor:94) · FACT_ROLE (reviewFacetRank:252) | LEARN_LANES role from FACT_ROLE — one table |
| A11 | **Two "green" consumers** — Learn fades, Review never does | fadeWhenGreen · needScore capability term | one reader (`capabilityProven`) and the same fade on Review |
| A12 | **Built, never wired** — triangulation, queen vs 7th-rank pawn, breakthrough | zero production callers | wire through endgameTechnique on Learn/Review/endgame, or delete (G8.5) |

## B. Teach, don't describe — the lesson is joined, never newly written

Measured on Learn (3 games): ~40 of ~150 unique sentences describe only.

| # | describe-only line (examples) | producer | the EXISTING lesson to join |
|---|---|---|---|
| B1 | "Bc4 clears the way to castle." · "Their …Nbd7 prepares …Rad8, to take the half-open d-file." · "a3 takes b4 away from their bishop." · "Ne3 lands on the e3 outpost" (~17/150) | moveIntent / theirIntent / timing / "X first, so that Y" | the rule tables `moveFundamentals` / `principleVoice.fundamentalHow` already speak on the student's OWN move ("The rule behind O-O: …") — carry the rule with the purpose, say-once per game, BOTH seats |
| B2 | "Their plan is taking shape: the queen to c3 via f4 and e3." · "There it is — their rook on the e-file." (~6) | planArc | the threat step's answer ("What do you do about it? …" — threatAnswer) applied to a plan |
| B3 | "Be7 was a blunder. f6 was the move — it would win a piece." (a missed pawn FORK) · "Bxe4 was the only move that kept you level." (no why) (~4) | inaccuracyCall alone; foundMove with no discarded proofs | the tactic's own definition (tacticInvariant: "a fork hits two targets…") + `methodBeat` forcing scan; foundMove names why via deliberation |
| B4 | "Your passed pawn is on e4 — three squares from queening." · "a new isolated pawn on b3" (~4) | passer / structure deltas | `endgameTechnique` (rule of the square, rook behind the passer, blockade); `namedPawnStructure().plan` |
| B5 | "It's the Mieses-Kotroc Variation." · "a strong player's choice — 2178 of 2713 games" · "You left the book with h3; the usual move was d4." (~4) | opening name / strongChoice / theoryDeparture | `openingIdentity` (what the move provokes/aims at), `mastersPlanRead`, the departure's cost |
| B6 | Review [structure] [count] [worst] [rook7] [passer] [badbishop] [king] [opp-dev] "[endgame] The position is X." | reviewFullData facets | REVIEW_TO_POSITIONAL → `conceptEngine.positionalConcepts`, countMethod, pieceValueRead, endgameConceptFor, tempoCount |
| B7 | Learn `commentary` / `positional` / `behavior`; positionFacts leans ("fights for d5") | playCommentary, positionalRead, danyaBehaviors | `methodBeat.liveMethodBeatFor`, `renderFundamentalVerdict` |
| B8 | REVERSE — `SECTION_TEACHING` (fundamentalsCatalog:195): authored rules shown only on the Fundamentals page, never spoken by the coach | — | the fundamental's lesson rides its verdict on every surface |

## C. The other coach tabs (route census 2026-10-01, every claim grepped)

Learn and Review are two of eleven live routes under `/coach`. The rest were built
before the week's computers and mostly do not call them.

| # | route | gap | close with |
|---|---|---|---|
| C1 | `/coach/analyse` + `/coach/session/explain-position` | two copies of an LLM-DECIDES read ("Analyze this position deeply… 4-6 sentences", CoachAnalysePage:93) — a G0 breach; computed arrows thrown away (renders the stream, board has no `arrows`); weaknesses from legacy `profile.badHabits`; records nothing | `composePositionRead` / `usePositionNarration` (already on Play + Learn), render `finalText` arrows |
| C2 | `/coach/fundamentals` | standing is slip counts only (`pillarStanding` sets asked = slips>0) — cannot show GREEN, and "asked" is inferred from failure | `summariseEvidence` / `capabilityProven` / `capabilitiesPosed` |
| C3 | `/coach/endgame` (all tabs) + endgame trainer | teaches, records only an endgame Elo — endgame misses never reach the spine or heat map | `recordTeachingEvidence` / misconception rows |
| C4 | endgame trainer | `endgameMistakeConcept` (endgameProfileService:121) is a private copy with its own opposition check and generic templates; "Show me" says `The move is X.` with no reason | `conceptEngine.endgameConceptFor` / `endgameTechnique`; speak `buildEndgameWhy` |
| C5 | `/coach/pro-games` | ~2,200 games replayed SILENT (no `criticalMoments`) | `scanCriticality` marks the moments, `narrateContinuationMove` voices them |
| C6 | `/coach/plan` + `/coach/train` | two weakness readers (spine vs `getStoredWeaknessProfile` + `badHabits`); rep subtitle "Your top error — seen 3×." is a count with no rule; Train's `flashcard_review` → `/play` (no such route → home); `tactic_drill` passes `?theme=` that AdaptivePuzzlePage never reads | `getUnifiedWeaknessProfile` / `buildTodaysReps`; `fundamentalHow` / `SECTION_TEACHING` on the rep; fix the two links |
| C7 | `/coach/session/narrate` | a FOURTH grade wording (`CLASSIFICATION_LINES`, "A mistake — this loses tempo or material") and a parallel review | route to `/coach/review/:gameId` |
| C8 | `/coach/session/practice` | "Correct! Great find! Well done!" (banned); a miss reveals raw UCI "The best move was e2e4" with no why; records nothing | `callInaccuracyDetailed` for the why; `recordTeachingEvidence` |
| C9 | `/coach/endgame` From-Your-Games | "The move actually played was X (−Ncp)" — a bare number | `endgameConceptFor` / `gradeEndgameMove().why` |
| C10 | `/coach/session/middlegame` | runner duplicated (`WalkthroughRunnerBody` ≡ `MiddlegamePlanInline`); records nothing | one shared runner |
| C11 | `/coach/library` | no chapter links to the student's record (fundamentals ↔ library never point at each other) | join on the fundamental id |

Grade wordings, now counted across the whole tab: Learn (`inaccuracyCall`),
Review (`QUALITY_CLAUSE`), chat (`assembleMoveRatingAnswer`), narrate
(`CLASSIFICATION_LINES`), endgame trainer (`gradeEndgameMove().why`) — five. A1
closes the BAND split first (done for Learn, below); C7 deletes one wording.

## Order (why this order)
1. **A1 grade** — every flagged move on every surface; three wordings is the most
   visible "different coaches" symptom. Then **B3** rides on it (the grade carries
   the missed pattern + habit).
2. **B1 rules on purposes** — the largest describe-only block (~17 of 40).
3. **A2 Review calls the Learn computers** — the biggest structural gap; B1/B3 then
   reach Review for free.
4. A3 → A5 merges (threat answer, trade, piece) — each removes a duplicate.
5. A6 evidence from every sweep (the loop's green half for Play/imported games).
6. A7 arrows, A8 askable, A9–A11, B2, B4–B8, A12.
7. C1 (the G0 breach) first among the other tabs, then C2/C3 (the loop), C7/C8
   (grade + banned praise), C5, C6, C4, C9–C11.

Each step: one shared change, a fail-on-old test on a real walked position, the
related tests, then a walk of Learn AND Review on fresh games with every claim
counted. Nothing new is built; a row that needs a new computer is moved to a
"not now" list for David.

## Status
- [x] A1 — Learn's grade is fed both evals, so `classifyMove` uses the review's
  win-% bands (300cp given back at +12 is no longer "a blunder" in Learn and
  unflagged in Review). Test: `inaccuracyCall.test` "one grade on every surface".
- [x] B3 — the grade carries the pattern the better move would have landed
  (`InaccuracyCall.pattern`, from `landedTacticFor`); Learn appends the rule once
  a game through its ONE definition ledger (`takeDefinition`, which the instant
  alert and the composer already used); Review emits it as a say-once `[rule]`
  (`rule:def:<type>`). NB the walk example "f6 — it would win a piece" was NOT a
  fork (two pawns, two attackers); the detector was right and that case is pinned.
- [~] A2 — Review calls `studentMoveTeaching` per student ply; a total
  `REVIEW_TAG_FOR_LANE` routes the 9 lanes Review lacked (recapture, knee-jerk,
  blunder-check, autopilot, keep-pressing, rule-exception, false-alarm, king
  attack, push-or-hold) and maps the 6 it already produces to null. Say-once by
  claim (`hint:` identity). Evidence recording from Review is A6. Walk pending.
- [x] Walk find: `detectNewThreat` named threats from a piece the opponent can
  simply take (23.Qxc7 "threatening Qxd8+" with …Rxc7 coming) — now answered by
  capture → no threat, on every surface that reads it.
- [ ] A3 … A12, B1, B2, B4 … B8, C1 … C11.
