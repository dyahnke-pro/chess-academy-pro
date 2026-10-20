# OS-11 item 6 — duplicate producers → one each: the map (read-only, origin/batch3 b7d7093)

**Who it's for:** whoever codes item 6. That is this session once David says "go" here, or another fixer.

**What's here:** for each duplicate set, every producer with `file:line`, its claim key and surface; the one owner it should become; what to delete; and a test on a real OS-11 board that FAILS on the current code. Line numbers are on batch3 b7d7093.

> **Status against `origin/dead-exports` d71562b6d (checked 2026-10-20, read-only).** The knip sweep removed `export` keywords and three symbols with NO reference at all, tests included (`capabilityEvidence.clearCapabilityProfileMemo`, `endgameProgressService.getDueEndgameCount`, `gamesService.getGuessPositions` — none on these maps). Knip counts a test import as a use, so it could not see test-only producers, and it does not judge duplicate behaviour. Every file this map names changed only in `export` keywords, except planRace.ts (`pawnSquareRace` deleted at ~:567, below every line cited here). **Line numbers below hold on dead-exports.**

**Marks:** (a) OPEN · (b) OPEN · (c) OPEN · (d) OPEN — none of the four is touched by the sweep; #4 codes them.

## (a) The opposite-castling race — four producers, three definitions of the fact — OPEN on dead-exports

The fact: the kings are castled on opposite wings with queens on. It is DEFINED three times:
- `boardStructure.describeStructure(fen).kings.oppositeWings` — the one king-wing fact. splitPosition says it reads this, and so does reviewStrategicOrientation.
- `planRace.castledWing()` (inside `detectStormRace`, planRace.ts:147-170) — its own definition.
- `openingStory.castledSide(history, …)` — read from the castling MOVES in the game's history, not the board (openingStory.ts:428-438).

It is SAID by four producers:

| # | producer | text | claim key | surface |
|---|---|---|---|---|
| 1 | openingStory.ts:437 (beat 'character', opposite branch) | "Kings on opposite wings: this is a race. Your pawns can storm the … every tempo counts." | `story:character` | Learn, opening-story lane |
| 2 | splitPosition.ts:15-27 `splitPosition()` → learnBoardTeaching.ts:574-583 `splitPositionTeaching` | "The kings are on opposite wings, so split the board … It is a race — a tempo matters more than a pawn here." | `split-position` | Learn, lane `splitPosition` |
| 3 | planRace.ts:408-425 storm-race clause → kingAttackReads.ts:707-717 `stormRace` | "both kings face a pawn storm: your pawn on X is N pushes from …" | `kr:storm:<yours><theirs>` | Learn (king reads). Review also reads `planRaceClause` at reviewFullData.ts:1054 |
| 4 | reviewStrategicOrientation.ts:593-612 `raceLine` | "The kings are on opposite wings — this is a race, and it's won by throwing your pawns …" | none (review orientation) | Review |

**g2 heard three of them:** #1 at 10…a5 (+2.4s); #3 at 10…a5 (+17.0s); #2 at 13…Qb8 (+5.3s). The claim did not change in between.

**The owner** is planRace — kingAttackReads already calls it "the one race computer".
- One function, e.g. `oppositeWingsRace(fen, student)`, built on `describeStructure(fen).kings` (delete `castledWing`'s second definition). It returns `{ myWing, theirWing, storm: StormRace | null }`.
- ONE claim key, `race:opposite-wings`, once per game.
- The character sentence is the claim. The storm count, when `stormRunner` finds runners, is its proof, said with it, never as a second sentence later.

**Delete:**
- `splitPosition()` and its lane `splitPosition` (learnBoardTeaching.ts:574-583, `LEARN_LANES.splitPosition`, `coach_split_position_taught`). Its one extra idea — "a tempo matters more than a pawn" — moves into the owner's sentence.
- openingStory's opposite-wings branch (openingStory.ts:437). Keep the same-wing branch (:438, "no pawn race" is a different claim) and `story:character-ahead` (:448, the master-games castling prediction BEFORE the kings are set; also a different claim).

**Readers:**
- `kingAttackReads.stormRace` becomes the owner's Learn lane.
- reviewStrategicOrientation.ts:604 reads the owner and keeps its storm arrows. It is the review register of the same claim, not a second computer.

**Fix while there** (it is the same computer; also in OS-11 defect 5):
- `stormRunner` (planRace.ts:118-145) counts "contact" with ANY enemy pawn on the adjacent files of the king's wing.
- So on g2's board, White's f3 meeting Black's CENTRE pawn e5 becomes "one push from your king's pawns … their storm arrives first".
- Contact must be with the pawns that shelter the king (the king's file and its neighbours).

**Failing test** (g2 after 11.Bb5, `rn1q1rk1/1p2bppp/3pbn2/pB2p3/4P3/1NN1BP2/PPPQ2PP/2KR3R b - - 1 11`, student Black):
- (1) Collect the race text from every Learn producer: openingStoryAt (history to ply 21), splitPosition, kingAttackReads.stormRace. Expect exactly one fact carrying the race claim, with claim key `race:opposite-wings`. Old code: three producers can say it, each with its own key.
- (2) The storm count for White's f3 must not count Black's e5. Old code: `theirPushes === 1`.

## (b) "Push f/g/h toward their king" vs "castle short" — two plans for one king — OPEN on dead-exports

| producer | text | heard |
|---|---|---|
| splitPosition.ts:42-76 `kingCommitted` → structureReads.ts:148-155 (act `king-committed`, key `king-committed:<theirKingSq>`) | "Their king went kingside, and yours is still in the centre — so the plan changes: your pawns on f2, g2 and h2 now face it. Pushed, they pry open files toward their king." | g3 7.c4 (+3.8s); g4 4…Nge7 (+4.4s) |
| kingSafety.ts:163-213 `detectCentralKingDanger` → `centralKingDangerClause` / `castleAdvice` (positionFacts) | "Move your knight on g1, then castle short before the centre opens." | g3 9.d3 (+5.5s) — the student then played Nf3 and O-O |

**The cause:** `kingCommitted` never asks where the student's own king is going. `castleRoute(fen, student)` (kingSafety.ts:225-239) already decides that, and it is what `castleAdvice` reads.
- On both boards the route is SHORT, on the same wing as their king.
- So the pawns `kingCommitted` tells the student to push are the shelter `castleAdvice` sends the king behind.

**The owner:** `castleRoute` is the single answer to "where does my king go". `kingCommitted` reads it and speaks only when the route is to the OTHER wing, or when there is no route (king stays central). Otherwise it is null. Optionally, when the master-games castling prediction exists (openingStory `plan().whiteCastle/blackCastle`, used by `story:character-ahead`), let it decide the side ahead of the blocker count. It is data, the blocker count is a heuristic.

**Failing tests:**
- g3 after 7…O-O, `r1bq1rk1/1ppp1ppp/p2b1n2/n3p3/2P5/NP2P3/PB1PBPPP/R2QK1NR w KQ - 1 8`, student White. `castleRoute` gives short (blocker g1); `kingCommitted` must be null. Old code returns the f2/g2/h2 storm text.
- g4 after 5.O-O, `r1b1kb1r/ppppnppp/2n2q2/1B2p3/4P3/2N2N2/PPPP1PPP/R1BQ1RK1 b kq - 7 5`, student Black. The route is short (blocker f8); `kingCommitted` must be null. Old code says f7/g7/h7.

## (c) A pin said twice in one turn — the threat line carries no claim key — OPEN on dead-exports

g2 12…Nc7 13.Bb6:
- the instant wave (+2.0s): "Watch out — their bishop on b6 pins your knight on c7 against your queen on d8. Remember — a pin freezes …"
- the late wave (+18.0s): "With their bishop to b6, their bishop on b6 pins your knight on c7 against your queen on d8."

| producer | claim key |
|---|---|
| threat lane, CoachTeachPage.tsx:9499 (`lane: 'threat'`, text `threatLine`) | **none** — the entry has `squares` but no `claims` |
| playedConcept.ts:35-65 → learnBoardTeaching.ts:501-522 `playedConceptTeaching` (lane `playedConcept`, CoachTeachPage.tsx:12187 for their reply) | `played-concept:pin:<squares>` |

**The cause:**
- The door's same-geometry subsumption (learnTurnDoor.ts:618-636) runs on ONE wave's survivors.
- Cross-wave say-once runs on claim keys, and the threat line has none.
- So the late wave cannot know the pin was said.

**The owner:** one claim key for a tactic on the board, e.g. `tactic:<type>:<sorted involved squares>`, computed by ONE helper next to the shared vocabulary (tacticVocabulary.ts). Every producer that states a tactic attaches it: the threat lane (:9499), the tactic lane (:9498), playedConcept, and the liveTacticsContext threats. The ledger then drops the second. Keep playedConcept's either-seat naming (David 2026-10-18); only the claim becomes one. Nothing to delete here but the ad-hoc key format `played-concept:` → the shared key.

**Failing test** (g2 after 13.Bb6, `r2q1rk1/1pn1bppp/1B1pbn2/pB2p3/4P3/1NN2P2/PPPQ2PP/1K1R3R b - - 5 13`, student Black): the threat-lane fact and `playedConceptTeaching(fenBefore, 'Bb6', 'b', …)` carry the same claim key. Old code: the threat fact has no claims, so the test fails.

## (d) The 8.Bxf7+ verdict said twice — the batch-2 fix is in the build and did not take — OPEN on dead-exports

`mistakeTurnLine` (de450346, "a mistake turn says the loss once") was written for exactly this line, and it IS an ancestor of b7ab6d3. The OS-11 replay still heard the full fundamental verdict, then the recurrence, then the grade's evidence, then the slip question (decision row: spoke=[mistake, blunderCheck], lead=blunderCheck):

> "That pawn was defended: your bishop takes on f7 and is taken on the spot — it cost you far more than a pawn. Here's how: … You've walked into this before — taking a poisoned pawn, the third game now … Bishop takes f7 with check was a mistake. That took the pawn on f7, but the king on e8 takes back — you lose a bishop for a pawn. Blunder check before you let go of a piece: run CCT …"

That order is the `else` branch of mistakeTurnLine.ts:54-66. So `sameLossAsGrade(fund, look.lostSquare)` was FALSE on the live path:
- `fund.square` comes from learnFundamentalNarration.ts:155-159, `attrs[0].facts.square` (poisoned-pawn).
- `look.lostSquare` comes from backwardLook.ts:408 ← inaccuracyCall.ts:829 / 1211: `punishment?.lostSquare ?? failedLost ?? replyTaken`.

The slip question was also asked although the verdict taught a HOW, so `howOnly` was empty while `verdict` carried the HOW.

Neither value can be read off the transcript. The first step is to CAPTURE `fund.square`, `look.lostSquare` and `fund.howOnly` at this board (g1 before 8.Bxf7+, `r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8`, reply Kxf7, student White). The app's own `backwardLook.line` row in the transcript has the engine line to drive it. The test then asserts the line says the loss ONCE (the grade's evidence plus the HOW only), and never adds the slip question beside a taught HOW.

**For defect 5's owner, the same turn:** the verdict was 16.7 s late because the previous turn's method question owed its answer, and "the answer the last turn's question never reached leads this one" (CoachTeachPage.tsx:11095-11103). The answer is a 39-word past-tense recap (planChoice.ts:304-318 `methodAfterMove`), spoken forced BEFORE the door's verdict on a -241 blunder. On a costly move the verdict must lead and the owed answer wait or drop. The same owed-answer path was cut after 1 ms in g4 10…Bf5 (C6).
