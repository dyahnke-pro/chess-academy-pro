# Learn: root-cause diagnoses for the six coding items (2026-10-19/20)

These were run read-only on `learn-standard` 4ad28bd8. The producers are unchanged since b494915, and every chess fact was checked with chess.js or Stockfish 16.

Evidence comes from the muted fair-pace replay of David's Smith-Morra game on his record (see `opening-measure-2026-10-19.md`, g1).

Each section gives:
- what was heard;
- the root cause;
- the proof chain (file:line);
- the fix at the producer, plus every other producer that shares the cause;
- a failing test (input and assertion);
- the blast radius.

**Shared root (1, 5, 6):** the phase lane (`usePhaseNarration`) re-runs `computePositionFacts` on the board the door just judged. It flattens the facts to bare text (`clauseText`), which drops the claim key, squares, stakes and proof. It then grades or speaks each sentence alone.
- **1:** a claim about the board after …Bg4 is graded on the current board, so it is dropped, while its answer survives on its own.
- **5:** without a claim key, say-once can only match exact words, so repeats get through.
- **6:** the door's subsumption, the verdict hold and the word average never see the phase lines.

The structural fix is one door per turn, with the phase facts entering it as typed facts.



---

## DEFECT 1: the phase report drops a true "…Bg4 pins your knight" warning and then speaks its answer alone

Checked on build b494915 (cap-branch HEAD). The producer files are identical in learn-standard: `git diff b4949153..HEAD` touches only one unrelated block of CoachTeachPage.tsx (8787, tactic stakes). Muted replay record: `/tmp/claude-0/-home-user-chess-academy-pro/78aa15cf-9515-5135-9736-99a1720b46f1/scratchpad/os1/g1-smithmorra.json`.

**FEN correction.** The FEN in the task is the board after the student's 7.O-O. The transition actually fires on the board after the coach's reply 7…Bg7, with White to move: `r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8`. The log shows this fen with `moveNumber 14` at t=397330, because `phaseFen = liveFenRef.current` (CoachTeachPage.tsx:12236-12246). Only with White to move do the two producers below fire at all: `depthClauses` requires `toMove === studentColor` (thinkAloud.ts:316) and the registry requires `studentIsMoving` (positionFacts.ts:1206).

### 1) What was observed, and the path from producer to voice

**Producer A — `thinkAloud.obviousStopFlaw`** (thinkAloud.ts:426-466)
- It runs its own diagonal scan for a bishop pinning a knight (431-447) and returns one string of two sentences (461): "They want the bishop to g4, pinning your knight. The obvious stop is the pawn to h3, but that pawn becomes a hook for their pawn on g6 — find another way."
- `depthClauses` pushes it as `{ kind: 'stop-flaw', text }` (thinkAloud.ts:320), with no lines, squares, motif or proof.
- Its declared role is `FACT_PROOF['stop-flaw'] = 'proven'` (reviewFacetRank.ts:417), so it is supposed to carry a proof.
- The door noticed in this run: t=399870 `coach-decision … "unproven":1,"unprovenKinds":["stop-flaw"]`.

**Producer B — `prophylaxis.findProphylaxis`** (prophylaxis.ts:142-176), rendered by `prophylaxisIdea` (193-196): "Watch Bg4 — it would pin your knight on f3. One move stops it before it lands."
- `BOARD_COMPUTERS.prophylaxis` returns this as `namesMove: true, idea` (boardComputers.ts:183-193).
- Because the move is held, positionFacts.ts:1210-1211 keeps only `{ kind: 'speedrun-read', rank: 45, text: r.idea, claim }`. The read's proof, squares and `theirs` move are thrown away.
- The kind is relabelled `speedrun-read`, which is filed as a `'description'` (reviewFacetRank.ts:431).

**The phase lane**
1. usePhaseNarration.ts:645 calls `computePositionFacts({ boardComputers: 'composer', … })`.
2. Line 673 flattens with `clauseText(pf.clauses, …)`, which keeps only `.text` (positionFacts.ts:478-480). Lines, proof, squares and `gradeFen` are all lost here.
3. The text becomes `transitionSentence`, then `extraFacts` (772), then `groundedMoveFeedback({ computedOnly: true })` (coachApi.ts:2431-2468), then `apiResponse`.
4. That is re-split into sentences (794-795, then 446-451 `splitSpeakableSentences`) and each sentence is dispatched on its own.
5. Line 404 runs `isSpokenSentenceGrounded(sentence, event.fen, …, phaseTactics)`, which reaches the tactic check at coachAnswerGates.ts:73-85 and `stripUngroundedTacticSentences` (tacticClaimValidator.ts:186).
6. "pin" is not in `phaseTactics`, which was built for `event.fen` (usePhaseNarration.ts:627).
7. The fallback check `tacticTypeVerifiedOnBoard(event.fen, 'pin', prose)` (tacticClaimValidator.ts:147-157) runs `detectTactics` on the current board, finds no pin, and the sentence is dropped. Both drops are logged at t=397978 and t=397979.

**What survived**
- "The obvious stop is …" contains no tactic word, so it passes. It reaches `speakSentence` with `proof: NO_PROOF.description` (CoachTeachPage.tsx:8147-8172) and is spoken alone at t=418586.
- B's second sentence, "One move stops it before it lands.", never reached the voice (0 occurrences in the transcript). I did not establish why.

### 2) Root cause

The two producers of the "their wanted pin" claim emit a claim about the board after …Bg4 as bare words, with no line, squares or proof — even though their declared role (`'proven'`) and the existing shapes (`ClauseItem.lines` / `gradeFen`, `BoardRead.fen` / `lines`) require one. `usePhaseNarration` then flattens the facts to a string and grades each split sentence against the current board. So the true threat is judged on a board where the pin does not exist yet and is dropped, while its answer, a separate sentence of the same fact, passes on its own.

### 3) Proof

All reproduced with the app's own code (tsx at b4949153) plus chess.js and Stockfish.

**Board facts (chess.js and the app's detector)**
- `detectTactics(phaseFen)` finds no pins.
- On the null-move board `…b kq - 2 8` (`sideToMoveAs`), Bg4 is legal (c8→g4).
- `detectTactics(after Bg4)` finds `pin [g4,f3,d1]`, beneficiary Black: "Bishop on g4 pins knight on f3 against queen on d1".
- g4 is not attacked by White after Bg4, so the bishop lands safely.
- After h3, `attackers('g4','w')` = `['h3']`, so h3 is a real stop.
- `findProphylaxis(phaseFen)` = `{ kind: 'pin', intent: Bg4 c8→g4, victim: n f3, prevention: h3 }`.

**Gate verdicts (unchanged validator, empty context)**

| Sentence | Graded on phaseFen | Graded on the after-Bg4 board |
|---|---|---|
| "They want the bishop to g4, pinning your knight." | dropped | kept |
| "The obvious stop is the pawn to h3, … find another way." | kept | kept |
| "Watch Bg4 — it would pin your knight on f3." | dropped | kept |
| "One move stops it before it lands." | kept | kept |
| Fake: "They want the bishop to b4, pinning your knight on c3." | — | dropped |

The after-Bg4 column holds whether the context's fen is moved to that board or left at phaseFen: in the second case `staleContext = true` and only the board check runs. Since the fake is still dropped there, the gate is not loosened — it was just given the wrong board.

**Stockfish depth 20 at phaseFen (White's view)**
- Top lines: e5 −0.17, Nd5 −0.28 (the line is Nd5 Bg4, so the engine plays …Bg4 itself), Bd5 −0.30, Ng5 −0.41.
- After h3 it is Black +0.31, so h3 is about −0.31 for White: level with the 2nd and 3rd best moves. At depth 14, h3 is in the top four (−0.36), which is why producer B fired.
- So the two producers contradict each other about the same stop: B holds h3 as the answer ("one move stops it"); A names h3 and says "find another way".

### 4) The fix

**(a) One computer for the claim.** `prophylaxis.intents` / `findProphylaxis` becomes the only detector of "their next move pins, kicks or forks your piece". It already has the landing-safety check (`legalSeeGainFor`) and a verified prevention (`stillWorks`).
- Delete `obviousStopFlaw`'s own pin scan (thinkAloud.ts:431-447). The hook judgement (`hookCreated`) becomes a verdict on prophylaxis's prevention.
- The engine decides that verdict once, so a stop is either the held answer or the obvious stop that fails — never both. Today's guard only compares against the engine's top move (thinkAloud.ts:318-320).
- The result type holds `threat: { intent, victim, behind, line: { fen: sideToMoveAs(fen, them), sans: [intent.san] }, squares, motif }` together with `stop`. The answer text can only be rendered from that object, so the answer cannot exist without its threat.
- It is emitted as one `ClauseItem` (threat and answer in one `text`) carrying `lines`, `squares: [g4, f3, d1]`, `motif: 'pin'`, and an exact proof (kind `'line'`, the Bg4 line plus those squares).
- When the move is held, the prevention square stays out of the squares and the proof; only the threat line goes in.

**(b) A held idea keeps its proof.** Make `BoardRead.idea` a typed read (`{ text, proof, squares, lines, motif }`), not a bare string. Then the held paths keep them instead of discarding them:
- positionFacts.ts:1210-1211 (registry held idea)
- thinkAloud.ts:358-360 (tacticGeometry idea, pushed with no proof)
- thinkAloud.ts:338, the `text === r.text ? squares : {}` in `push` — the held-idea call at :366 loses its squares
- thinkAloud.ts:340/367, `pushKing` passes `NO_PROOF.withheld` for the held idea

**(c) The phase lane passes facts, not words.**
- Replace the `clauseText` → `extraFacts` → `apiResponse` → re-split round trip with the `pf.clauses` list.
- The unit of decision is the fact. Each fact is graded whole, on `event.fen` or on the boards along its own `lines`, with the same `stripUngroundedTacticSentences`. This is the rule `voicePackage.verify` already applies for board claims (voicePackage.ts:322-336).
- If any sentence of a fact is refused, the whole fact is refused. Splitting into sentences happens only afterwards, for speech pacing.
- `speakSentence(text, fen)` becomes `speakFact(fact)`, so the door gets the real proof and lines (CoachTeachPage.tsx:8152 today hard-codes `NO_PROOF.description`) and decides once per fact.

**Why this is the root and not the symptom.** The gate is unchanged and still refuses fakes. The claim now carries the board it is about, so every grader (the phase gate, `voicePackage`, the Why button) judges it on the right board, and the producer meets its declared `'proven'` role. The answer cannot be heard alone because it is no longer a separate unit anywhere.

**Other producers and callers with the same cause**
- **Same claim, other detectors:**
  - `groundedAnswer.opponentIdeas` (groundedAnswer.ts:667-690, chat: "…Bg4 would pin the knight on f3 to the queen on d1"): a third detector with its own safety rule.
  - Learn's per-move lane (CoachTeachPage.tsx:10425-10432): same read, `NO_PROOF.withheld`, no line, key `prophylaxis:g4`. The phase copy's key is `prophylaxis:g4:idea`, so say-once cannot see that they are the same fact. The turn lane at ply 13 held prophylaxis as "aside" and the phase lane offered it again.
  - Consumers that are fine once (a) lands: bookMoveWhy.ts:200/344/473 and reviewFullData.ts:1449.
- **Same flattening (`clauseText` loses lines and proof):** useLiveCoach.ts:296, positionReadComposer.ts:158, chatBoardRead.ts:112, whyBestMove.ts:160. None of these runs the tactic-word gate, so the same claim survives there but without its board.

### 5) Failing tests

Shared setup:
- `FEN = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8'`
- `SANS = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7'`
- `TOP` (from the Stockfish runs above): `[{moves:['e4e5','c6e5','f3e5','g7e5'],evaluation:-17,mate:null}, {moves:['c3d5','c8g4','d1b3'],evaluation:-28,mate:null}, {moves:['c4d5','h7h6'],evaluation:-30,mate:null}, {moves:['h2h3','g8f6'],evaluation:-31,mate:null}]`

**Test 1 — producer** (`src/services/thinkAloud.test.ts`, or a new `theirWantedMove.test.ts`)
- Take `depthClauses({fen:FEN, history:SANS, topLines:TOP, studentColor:'w', nameMove:false})` and find the fact whose text names Bg4.
- Assert `fact.lines[0].sans` equals `['Bg4']`.
- Replay that line from `lines[0].fen`; `detectTactics` must find a pin covering g4, f3 and d1.
- Assert `isProof(fact.proof)` is true.
- Today this fails: `lines` and `proof` are undefined.

**Test 2 — the lane** (new `src/hooks/usePhaseNarration.hypothetical.test.ts`)
- Use the real `coachAnswerGates`. The existing usePhaseNarration.test.ts:89-93 mocks the gate to always pass, which is why this interaction was never tested.
- Event fen is `FEN`; the engine resolves with `TOP`; `buildFedTacticsContext` returns `{fen: FEN, immediate: [], hanging: [], threats: [], opportunities: []}` (what the replay's depth-10 search produced).
- `computePositionFacts` returns the real clause from Test 1; `groundedMoveFeedback` echoes `extraFacts`; `speakSentence` is a spy.
- Assert: let `i` = index of the spoken text matching `/pinning your knight|would pin your knight/` and `j` = index matching `/obvious stop/`. Require `i >= 0` and (`j === -1` or `i < j`). Today `i = -1` and `j >= 0`, so it fails.
- Negative control: the clause "They want the bishop to b4, pinning your knight on c3. The obvious stop is the pawn to a3 — find another way." with lines `[{fen: sideToMoveAs(FEN,'b'), sans:['Bb4']}]` (an illegal move). Nothing should be spoken. Today the a3 half is spoken alone, so this fails too.

### 6) Risks and blast radius

- **`depthClauses`** is called only from positionFacts.ts:1152, but `computePositionFacts` reaches CoachTeachPage.tsx:10340, useLiveCoach.ts:264, usePhaseNarration.ts:645, positionReadComposer.ts:130, chatBoardRead.ts:81, whyBestMove.ts:137 and boardTurnAnswer.ts:134.
- **Existing tests:** thinkAloud.test.ts:52-58 asserts `obviousStopFlaw`'s `threatSan`, `stopSan` and text on another FEN; update it to the new shape. usePhaseNarration.test.ts relies on the `extraFacts` echo and will need updating when the round trip goes.
- **`'stop-flaw'` tables** (reviewFacetRank.ts:327/377/417/473) are `Record`s over the kind, so renaming the kind will fail to compile until each is answered. That is the intended effect.
- **`BoardRead.idea` type change** touches every `idea` consumer: CoachTeachPage.tsx:10428-10431, positionFacts.ts:1210-1211, and the structure reads' `heldForm` (boardComputers.ts:154, 338).
- **`isSpokenSentenceGrounded`** keeps its sentence form for VoiceChatMic.tsx:445 and CoachGamePage.tsx:2938/3724. Add the fact-level entry alongside it.
- **Play** mounts the phase hook with `speakSentence: null` (CoachGamePage.tsx:1819-1832), so `speakFact` needs a no-door path there too.
- **Learn names no move unasked:** the merged verdict must keep h3 held wherever prophylaxis holds it. Today the A sentence names an engine-sound h3 as the move to avoid.
- **More words:** Learn transitions will now speak the threat. The ply-13 report was already 298 words; the door's ranking decides what speaks, and nothing should be capped.

---

# DEFECT 2: the phase look-ahead says "a discovery is 4 moves away" without saying what is discovered

**Producer unchanged since b494915.** `git diff --stat b4949153..HEAD` is empty for every file involved: `liveTacticsContext.ts`, `usePhaseNarration.ts`, `tacticClassifier.ts`, `lineGeometry.ts`, `weaknessSignal.ts`, `weaknessSpine.ts`, `tacticVocabulary.ts` and `coach/types.ts`. The `CoachTeachPage.tsx` diff since then is the tactic-stakes refactor and does not touch this path. The volunteered branch that produced the sentence came in with commit 4f9ecafb (2026-10-19).

**Correction to the brief: the sentence is computed on a different board.** It is not computed on the post-O-O FEN (Black to move). It is computed on the board after the coach's reply 7...Bg7:

`r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8`

- `CoachTeachPage.tsx:12238` sets `phaseFen = liveFenRef.current` after the reply has landed.
- On the post-O-O FEN, `studentOpens` would be false and the output would be "they're lining up a discovery in N". That is not what was heard.

## 1) Observed output and how it reaches the voice

The output, reproduced exactly with `tsx` against b4949153 sources:

> "Look ahead — a discovery is 4 moves away: their knight to e5 and then their knight taking on c4. Spot it before it lands. This is a pattern that keeps catching you — watch for it."

The chain, from producer to voice:

1. **`tacticClassifier.ts:596-663` `scanUpcomingTactics`** walks the engine's best line (the PV) from the board after Bg7.
   - At ply 4 (`Nxc4`), `detectDiscovery` (`tacticClassifier.ts:275-289`, which uses `lineGeometry.ts:57-74`) returns:
     - `involvedSquares: ['e5','g7','c3']`
     - `description: "Moving from e5 to c4 reveals bishop on g7 attacking knight on c3"`
   - The scan pushes an entry with that `pattern`, `fen` (the tactic board), `line: [Ng5, Ne5, Qb3, Nxc4]`, `depthAhead: 4`, plus `lineEval` and `lineMate`.
2. **`liveTacticsContext.ts:419-431` `upcomingToEntry`** keeps only `{type, description, depthAhead, line, spoken}`.
   - It drops `pattern.involvedSquares`, the tactic board `u.fen`, `lineEval` and `lineMate`.
   - `spoken` is null because `spokenUpcoming` (`liveTacticsContext.ts:442-456`) refuses lines longer than 2 plies.
   - Reproduced entry: `{"type":"discovery","description":"Moving from e5 to c4 reveals…","depthAhead":4,"line":["Ng5","Ne5","Qb3","Nxc4"],"spoken":null}`.
3. **`usePhaseNarration.ts:627-635`** builds this package as `buildFedTacticsContext(event.fen, …)`. Then **`usePhaseNarration.ts:703`** calls `speakDeepestLookahead(phaseTactics, 'student', 'w', /*namesStudentMoves*/ false, weaknessRef.current)`.
4. **`liveTacticsContext.ts:515-616` `speakDeepestLookahead`** produces the sentence:
   - `pattern = pick.type.replace(...)` gives "discovery" (line 560).
   - `toMove === studentColor` gives `studentOpens` (line 582).
   - The branch at line 599 keeps only the odd plies, "their knight to e5" and "their knight taking on c4".
   - Line 603 builds `` `Look ahead — a ${pattern} is ${pick.depthAhead} moves away: … Spot it before it lands.${holeTag}` ``.
   - `holeTag` (lines 574-576) adds "This is a pattern that keeps catching you".
5. **`usePhaseNarration.ts:704`** appends it to `transitionSentence`. Line 771 passes it as `extraFacts` to `groundedMoveFeedback` with `computedOnly: true` (`coachApi.ts:2394`, `2431`). `dispatchSentence` then splits it into the three sentences heard and sends each through `speakSentence` (`usePhaseNarration.ts:437-440`).
6. **`CoachTeachPage.tsx:8148-8173`**: the phase door calls `coachTurn({… lane:'phase', proof: NO_PROOF.description})` (line 8153), then `voiceService.speakPackage`.

## 2) Root cause (one sentence)

`upcomingToEntry` cuts the PV scan's result down to the pattern's type word and its moves, throwing away the detector's computed geometry and never asking whether the line wins anything. So `speakDeepestLookahead`, a second renderer of the same "upcoming tactic" claim, can only say "a discovery" over the moves. It cannot say what is uncovered, onto what, or whether it wins.

**Separate cause for the record claim:** `matchTacticPattern` joins the student's record by motif alone. Every `analysis:tactic:*` row means "you missed a tactic you could have played". The threat branch voices that row as "keeps catching you", which is the opposite claim.

## 3) Proof

**What the code throws away.** The scan has all the geometry. The detector holds the moving square (`from`), the piece behind it (`d.behind`, the bishop on g7) and the target (`d.target`, the knight on c3), all at `tacticClassifier.ts:282-287`. `upcomingToEntry` (419-431) copies none of it into a typed field. The threat entry type (`coach/types.ts:613-641`) has no `squares` field, while `immediate` does (`coach/types.ts:580`). The discovery detector also never records the mover's destination: its `involvedSquares[0]` is `e5`, which is empty on the tactic board, and `c4` appears nowhere.

**The line is real and is engine best play** (engine-at, depth 18, every ply checked):

| Position | Top move | Eval |
|---|---|---|
| after Ng5 | Ne5 | +0.36 Black's view |
| after Ng5 Ne5 | Qb3 | −0.24 |
| after Qb3 | Nxc4 | +0.32 |
| after Nxc4 | Qxc4 | −0.26 |

The exact PV `f3g5 c6e5 d1b3 e5c4 b3c4 …` also appeared as line 3 (MultiPV 3) at depth 14, 1 thread.

**It is a discovery, but it wins nothing.** Checked with chess.js after Nxc4:
- Black's attackers of c3: `[g7]`. White's defenders of c3: `[b3, b2]`.
- The knight on c4 is attacked by `b3` and has no Black defender.
- So Nxc4 trades the knight for the bishop (Qxc4 takes back), and Bxc3 would be met by bxc3 or Qxc3.
- The app's own line-outcome computer, `proofCut(fen, [Ng5,Ne5,Qb3,Nxc4,Qxc4,…], 'w')`, returns **null** (no material settles).
- The app's own threat-alert check `isCriticalThreat(u,'w',…,1414)` returns **false**.
- The pattern table already marks `discovery` with `wins: true` (`tacticVocabulary.ts:115`). The rule that such a pattern may only be named when the line collects is applied at `lookaheadPlan.ts:641-656`. The look-ahead skips that rule.

**"4 moves away" is wrong.** `depthAhead` counts plies (`depthAhead: i + 1`, `tacticClassifier.ts:648`). Two of the four plies are the student's. The discovery lands on Black's second move from now, so it is two moves away.

**The tag has no record behind it.** In David's data drop:
- There are 130 `mistakePuzzles` with `tacticType: 'discovered_attack'`, all unsolved.
- 130 of 130 have David to move: the tag classifies his missed best move (`mistakePuzzleService.ts:606`, `detectTacticType(fen, bestMove, …)`).
- The spine labels these rows "Missed discovered attacks" (`weaknessSpine.ts:285`). All three producers of `analysis:tactic:*` rows say "Missed …" (lines 285, 620, 665).
- There are zero `capabilityEvidence` or `misconceptionTags` rows about discoveries.
- `PATTERN_TO_TACTIC.discovery` maps to `discovered_attack`. `matchTacticPattern` (`weaknessSignal.ts:253-257`) matches on that cluster with no notion of side, so `isHole` is true for the opponent's discovery.

So the record backs "you tend to miss your own discoveries" (the opportunity tag). Nothing records that the opponent's discoveries keep catching him.

**Second test case, where the discovery does win.** David's own game chesscom-1034830120, FEN `r1b1rknQ/1pp3p1/p1n1pp2/2b3N1/3q1P2/2N5/PPPB1RPP/R5K1 w - - 2 18`.
- Depth-18 PV: `Nce4 Qxb2 Rf1 Bd4 Bc1 Bxf2+ Kxf2 Qxa2` (−2.37).
- After Nce4 Qxb2, all of White's top four replies lose the exchange to Bxf2+.
- `proofCut` net is −4 for the student.
- Today's output names neither the bishop on c5 nor the rook on f2: "Look ahead — a discovery is 2 moves away: their queen taking on b2. Spot it before it lands."

**How often this fires.** Across 387 positions with David to move (120 of his games, Stockfish depth 9, MultiPV 3), the detector flagged 24 opponent discoveries in the look-ahead. Only 3 netted 2 or more points of material within 3 more plies.

## 4) The fix

**A. At the producer: carry the detector's geometry and the line's outcome on the entry.**

- `types/tacticTypes.ts:25-37`: add typed roles to `TacticPattern`, for example `roles: { mover?: {piece, from, to}; unmasked?: {piece, square}; targets: {piece, square}[] }`.
- `tacticClassifier.ts:275-289` `detectDiscovery`: fill `roles` from values it already holds (`chessAfter.get(toSquare)`, `fromSquare`, `toSquare`, `d.behind`, `d.target`). Do the same in each detector in `detectTacticsAtStep` (`668-709`); each already holds its pieces.
- The renderer then picks its geometry sentence from a `Record<TacticPatternType, …>`, so a pattern without roles fails to compile instead of falling back to the bare word.
- `tacticClassifier.ts:646-654`: also carry the whole PV in standard move notation, so the outcome can be computed on the full line.
- `liveTacticsContext.ts:419-431` `upcomingToEntry`, with the entry type at `coach/types.ts:613-641`, gets required fields:
  - `roles`
  - `squares` (parity with `immediate`)
  - `tacticFen: u.fen`
  - `collects`, computed by the one outcome computer `proofCut(rootFen, pvSan, student)` the same way `lookaheadPlan.ts:641-652` does it (mate goes to the side that benefits; otherwise `ledger.netPawns` in that side's favour)

**B. In the renderer: `speakDeepestLookahead` (`liveTacticsContext.ts:515-616`) voices only the facts on the entry.**

- Name the pattern with `patternWord(type)` from `tacticVocabulary.ts:134`, not `type.replace` at line 560. That gives "discovered attack" and "removing-the-guard tactic" (David's 2026-10-13 naming).
- A pattern marked `wins: true` (discovery included) is said only when `entry.collects` is true. Otherwise the entry has no claim to voice, and the renderer moves to the next deep entry or returns null. This is the existing material-claim rule (WO-OUTCOME-01, `lookaheadPlan.ts:653`) applied to this producer, not a new gate.
- Close on the geometry from `roles`, seated from the student's side with `seatPieceReferences(…, student)`. For case B: "their queen taking on b2 uncovers their bishop on c5 onto your rook on f2". Only the opponent's moves are named; the student's moves stay held when `namesStudentMoves` is false. This uses the detector's geometry, never prose parsing.
- Count in the beneficiary's moves: `theirPlies.length` gives "on their next move" or "in two moves", never `depthAhead` plies. The same plies-called-moves error is in all four stems (lines 584, 592, 603 and the threat stems at 504-507 and 621-624).

**C. The record seat: require it in the join.**

- Change `matchTacticPattern(pattern, signals, seat: 'finds' | 'falls-for')` in `weaknessSignal.ts:253`. Better still, give `WeaknessSignal` a typed `seat` field that each aggregator fills: `weaknessSpine.ts:280-289`, `600-635` and `649-685` all write `'finds'`.
- No motif row records falling for the opponent's tactic, so a threat matches nothing. The "keeps catching you" tag goes silent, and an opportunity record no longer biases which threat is picked (`liveTacticsContext.ts:549-556`).
- The opportunity tag "the kind you tend to miss" stays; David's 130 rows back it.

**Why this is root-cause and not a symptom fix.** The facts come from the detector's own geometry and the existing outcome computer, attached once where the entry is built. Every reader of the entry gets the same structured facts. Nothing is parsed from prose, no new gate is added, and no output is silenced after the fact.

**Other producers and readers with the same cause:**
- **`spokenUpcoming` (`liveTacticsContext.ts:442-456`)** is the entry's other renderer. On case B it produces "if you play Nce4 and they answer Qxb2, moving from d4 to b2 reveals their bishop on c5 attacking your rook on f2". It never names the moving piece, and it names the student's move. The Learn turn lane volunteers that text at `CoachTeachPage.tsx:8707-8714` ("Watch out — if you play Nce4 …"), which breaks LEARN NAMES NO MOVE UNASKED. It should become the same roles-based renderer with a required `namesStudentMoves`.
- **`CoachTeachPage.tsx:8711`** pulls `threatSquares` out of `up.description` with a regex: squares scraped from prose, because the entry has no `squares` field. For a discovery it marks e5, which is empty after the move. Replace with `roles`/`squares`.
- **Readers of `spoken`/`description`:** `groundedAnswer.ts:1613, 3882, 3925-3929`, `positionReadingService.ts:2224` (answer key), and the read-position call at `positionReadComposer.ts:191`.
- **`formatTacticsSubBlock` (`liveTacticsContext.ts:745, 751`)** gives the model a bare `description` for upcoming threats with no outcome marker. Immediate tactics get one (`706ff`).
- **`tacticClaimValidator.ts:310-311`** allows any threat type, including a discovery that wins nothing.
- **`isCriticalThreat` (`tacticAlertService.ts:397-424`)** is the existing per-ply threat check. Its only caller is `CoachGamePage.tsx:2910`; the look-ahead never consults it. Have it read the entry's outcome so the two cannot disagree.
- **`CoachTeachPage.tsx:8153`** passes `NO_PROOF` for every phase sentence, although the look-ahead has a proof (the line, plus the role squares).

## 5) Failing test

New file: `src/services/liveTacticsContext.discoveryLookahead.test.ts`. Build each context with `buildTacticsLiveContext(fen, analysis, 'w', 1414)`.

**Case A: David's Smith-Morra, the exact defect.**
- FEN `r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8`
- `topLines: [{ moves: 'f3g5 c6e5 d1b3 e5c4 b3c4 g8h6 h2h3 e8g8'.split(' '), evaluation: -41, mate: null }]`

| # | Assertion | Today |
|---|---|---|
| A1 | `ctx.threats[0].roles` equals `{mover:{piece:'n',from:'e5',to:'c4'}, unmasked:{piece:'b',square:'g7'}, targets:[{piece:'n',square:'c3'}]}` and `collects === false` | fails: fields undefined |
| A2 | `speakDeepestLookahead(ctx,'student','w',false,[])` does not match `/discover/i` (null here) | fails: returns the observed "a discovery is 4 moves away…" sentence |
| A3 | with a signal shaped like David's record (`clusterId:'analysis:tactic:discovered_attack'`, `label:'Missed discovered attacks'`, `openCount:130`, `total:130`, `lifecycleStatus:'persistent'`, `proven:false`), output does not match `/keeps catching you/` | fails: the observed tag |

**Case B: David's game chesscom-1034830120, a discovery that does win.**
- FEN `r1b1rknQ/1pp3p1/p1n1pp2/2b3N1/3q1P2/2N5/PPPB1RPP/R5K1 w - - 2 18`
- `topLines: [{ moves: 'c3e4 d4b2 a1f1 c5d4 d2c1 d4f2 g1f2 b2a2'.split(' '), evaluation: -237, mate: null }]`
- Assert `speakDeepestLookahead(ctx,'student','w',false,[])` matches `/their queen taking on b2/`, `/their bishop on c5/` and `/your rook on f2/`, and does not match `/knight to e4|if you play|2 moves away/`.
- Today it fails: "a discovery is 2 moves away: their queen taking on b2…".

**Existing test to replace.** `liveTacticsContext.test.ts:382-392` ("tags an opponent-threat motif that keeps catching the student") invents a "Walks into pins" row on `analysis:tactic:pin`; no aggregator writes such a row. Replace it with A3. The `ctxWith` fixtures (`liveTacticsContext.test.ts:250-397`) need the new required fields.

## 6) Risks and blast radius

- **Phase transitions on Learn and Play.** `usePhaseNarration.ts:703` mounts in both `CoachTeachPage` and `CoachGamePage:1819`. When the outcome check removes the look-ahead, more transitions go fully silent through the `!phaseLookahead && !pfConcrete` early exit (`usePhaseNarration.ts:722`). The 3-in-24 measurement above predicts this will be common. That is correct, but expect quieter phase turns in the audits.
- **Read position** (`positionReadComposer.ts:191`, the asked read) gets the geometry and the outcome rule too.
- **Type change on the entry.** `coach/types.ts:613-641` breaks every place that builds `TacticsLiveContext` threats or opportunities, including test fixtures, until they supply the new fields. That compile failure is intended.
- **Board check on future pieces.** `usePhaseNarration.ts:404`, `isSpokenSentenceGrounded(…, event.fen)`, judges piece-on-square claims against today's board. Name a role "on <square>" only when it stands there on `event.fen` (true for the bishop on g7 / knight on c3 in case A and the bishop on c5 / rook on f2 in case B). Otherwise name it by its move, or the check will drop a true sentence.
- **`matchTacticPattern` callers that must pass a side:** `liveTacticsContext.ts:550`, `needScore.ts:311`, `positionFacts.ts:1391`, `tacticAlertService.ts:606` (`isTacticWeakness` is 'finds'), and `teachingSelector.ts:174, 325`. The ranking callers only ever raise a score, so the only spoken change is the tag.
- **Tests and mocks to update:** `usePhaseNarration.test.ts:72` mocks `speakDeepestLookahead`. Also update the Learn turn-lane threat path (`CoachTeachPage.tsx:8687-8714`) and the chat and discussion answer keys that read `spoken`.

---

# Defect 3: two true move-counts about two different boards, spoken in one turn with nothing saying which board each is about

Producers are unchanged since b494915. `git diff b4949153..HEAD` does not touch `criticalMoment.ts` or `positionFacts.ts`. It does touch `learnBoardTeaching.ts` and `CoachTeachPage.tsx`, but only to move `tacticStakesFor`, which has nothing to do with this.

## 1. What was said, and where each sentence comes from

**"King to g6 was the only move that kept the win."** This is the `foundMove` lane, and it counts on the board before Kg6.
- `CoachTeachPage.tsx:9688-9693`: `preStudentRead` is the previous turn's coach probe. That probe ran at `CoachTeachPage.tsx:10017-10033` with 6 engine lines at depth 14 and was stored in `studentBestReadRef`.
- `CoachTeachPage.tsx:11527` calls `foundMoveTeaching(fenBefore, 'Kg6', preStudentRead.topLines, 'w', …)`.
- `learnBoardTeaching.ts:920` calls `readCriticalMoment({ topLines, moverColor:'w', fen: fenBefore })`, then `criticalMomentFound` at `criticalMoment.ts:438-447`, which renders `` `${playedSan} was the only move that ${stake}.` ``
- `CoachTeachPage.tsx:11529` queues it with `queueHint(fenAfterReply, found, fenBefore)`. Its grading board is the board before the move, and at line 12052 it reaches the door as `fen: gradeFen`.

**"On this move, two moves keep the win. The rest give it away."** This is the `positionFacts` lane, and it counts on the board after Black's reply.
- `CoachTeachPage.tsx:10027` runs `studentBest = analyzeWithBudget(probe.fen(), 14, 1200)` with 6 lines. `probe.fen()` is the board after the coach's reply.
- `CoachTeachPage.tsx:10340` calls `computePositionFacts({ fen: probe.fen(), moverColor: probe.turn(), …, opponentLastMove: { fenBefore: move.fen, san: m.san } })`.
- `positionFacts.ts:644-645` derives `plyNumber` from that board and calls `readCriticalMoment({ topLines, moverColor })`. It passes no `fen`.
- `positionFacts.ts:1069` hands both to `buildClauses`. Line 1836 calls `criticalMomentStatement(criticalRead, plyNumber)`, which picks stem `[1]` at `criticalMoment.ts:331`. Lines 1837-1845 push it as the `key-moment` clause.
- `CoachTeachPage.tsx:10465` queues it with `queueSpokenHint(probe.fen(), c.text, 'positionFacts', …)`. It goes through `coachTurn` at line 12038 and is spoken by `speakTrackA` at line 12195.

**Proof the statement was counted on the board after the reply.** The stem rotates on the ply. Stem index 1 means `ply % 4 == 1`.
- The board before Kg6 is fullmove 46 with White to move, so ply = 45·2+1 = 91, which picks stem 3 ("Your move now…").
- The board after Black's reply is fullmove 47 with White to move, so ply = 93, which picks stem 1 ("On this move…"). That is the one heard.
- The statement also has no "Both are … moves" suffix. That fits: `positionFacts` passes no `fen`, so `holdingSans` is empty and `lookAt` returns `''`.

The "King to g6 — now king to f7 doesn't work…" sentence is a separate lane (`moveIntent`). "Well found." is the `decision` praise from `dnaRules.ts:26`.

## 2. Root cause

`criticalMomentStatement` (`criticalMoment.ts:318-335`) words its claim about the student's next decision with "this move" / "now" ("On this move", "Narrow on this move", "This move is the fork in the road", "Slow down — on this move"). It never names the board it counted. `positionFacts` already holds the reply that made that board (`input.opponentLastMove`) and drops it at line 1836. So when Learn speaks the statement right after the verdict on the move just played, "this move" attaches to Kg6.

Your framing assumed two counters disagreeing. That is not what happened. There is one counter per board, and both counts are true on their own board. What is missing is the frame.

## 3. Proof: the code and the engine facts

**Engine on the board before Kg6.** `6k1/1p6/3p4/1N5K/p3P3/8/8/8 w - - 0 46`, Stockfish depth 20, 6 lines:

| Move | Eval |
|---|---|
| Kg6 | +6.60 |
| Kg4 | +0.17 |
| Nc3, Kg5, Kh4, Kh6 | 0.00 |

At depth 14 (what the app ran): Kg6 601, Kg4 21, then 4, 0, 0, 0. `readCriticalMoment` returns count 1 with stake `win`. **"Kg6 was the only move that kept the win" is true.**

**Black's reply after Kg6.** Black has exactly five legal moves (Kh8, Kf8, b6, d5, a3). For each reply, the number of White moves that keep the win (6 lines, depth 14, win line at 300):

| Reply | Evals | Moves keeping the win | Statement |
|---|---|---|---|
| Kh8 | 675 664 664 650 638 426 | 6 of 6 | count fills the fan, silent |
| Kf8 | 655 0 0 0 −8 −9 | 1 | "only one move" |
| b6 | 665 647 533 527 368 10 | 5 | silent |
| **d5** | **584 573 −40 −41 −41 −41** | **2** | **"two moves keep the win"** |
| a3 | 676 544 300 −440 … | 3 | silent |

Only **46…d5** produces the sentence that was heard, so the reply was d5. On the board after it, `6k1/1p6/6K1/1N1p4/p3P3/8/8/8 w - - 0 47`, depth 20 confirms: exd5 +7.06, e5 +6.43, everything else about −0.40. **"Two moves keep the win, the rest give it away" is true.**

**The count is already one fan per board, by construction.** This turn's `studentBest` is stored in `studentBestReadRef` (line 10031). On the next move it becomes `probeRead` → `preStudentRead` (lines 9688-9690). So the next verdict ("exd5 was one of just two moves…") will read the same fan the statement read.

The data needed to frame the statement exists and is thrown away in two places:
- `LaneFact.fen` is required (`learnTurnDoor.ts:374-377`), and the door uses it only for phase (line 509).
- `positionFacts` holds `opponentLastMove` (line 231) but does not pass it to the statement.

## 4. The fix

**Where: `criticalMoment.ts` `criticalMomentStatement`, the producer.**
- Add a **required** third parameter: `after: { san: string; fenBefore: string } | null`. This is the reply that made the counted board. Required, so a new caller has to answer it, the same way the seat parameters are required elsewhere.
- **When `after` is supplied:** render "After their `${sayMoveNoun(after.san, after.fenBefore)}`, …". Here that gives: "After their pawn to d5, two moves keep the win; the rest give it away."
- **When `after` is null:** use only stems that name the student's decision, e.g. "Your move now: …" or "For your next move — …".
- **Delete all four "this move" stems** (lines 325, 326, 331, 332). Rotation stays on the opening words only; the count and the stake are unchanged.
- **Call site `positionFacts.ts:1836`:** pass `studentToMove && input.opponentLastMove ? input.opponentLastMove : null`. Thread it through the `buildClauses` arguments (line 1069 and the args type near 1497) as a required field.

**Why this is the root and not a symptom fix.** The sentence is wrong where it is made, because it does not say which decision it counts. Every surface that puts this sentence beside a verdict on another move is fixed at once: the Learn turn, `boardTurnAnswer`, `chatBoardRead` and `positionReadComposer` (these three already pass `opponentLastMove`). Nothing is gated or silenced; the next-move count is real teaching.

Two other options are worse:
- **Hiding the key-moment when `foundMove` spoke** is a gate that deletes a true lesson. That is banned.
- **Framing at the door by comparing each fact's `fen`** is unreliable, because `fen` is a grading board and producers set it inconsistently. For example, the backward hints at `CoachTeachPage.tsx:11729-11782` queue with `fenAfterReply` and no grading board, so a door-level frame would mislabel them.

**Other producers with the same cause or the same claim (grepped by wording and by data):**
1. The one-move stems in the same function (lines 325, 326). They are fixed by the same change.
2. `positionFacts.ts:1856-1861`: "They're on a knife-edge here — only one move keeps them in it." This states a count and a hard-coded stake ("in it") from the gap-based tier, not from `readCriticalMoment`. It is a second counter for the same claim. The header of `criticalMoment.ts` (lines 8-11) says "count is 1" and "severity is critical" are the same thing; since the band rule (lines 197-211) that is no longer true. This line should read `criticalRead`.
3. `boardTurnAnswer.ts:368-375`: its own `WIN = 300` copy of `STAKE_FLOOR.win`, producing "X is the only move that keeps the win; every other move gives it back." It has none of the safety checks (fan too narrow, bounded scores, band edge). Another counter for the same claim; it should read `readCriticalMoment`.
4. `positionCharacter.ts:125-126`: "only one move really works here", decided from the gap alone.
5. `playedMoveGrade.ts:152` (via `accuracyService.provesOnlyMove`) against the found-move count. On the same Kg6 board these two disagree:
   - `provesOnlyMove` treats the game as decided (win% 90.1 at +601) and says no.
   - The count says one move holds.
   - That is why the praise was the `decision` kind ("Well found.") while the verdict said "only move".
   - The stand-down at `CoachTeachPage.tsx:9810-9818` is a gate between these two producers.

**Related unwired code, for David to decide:**
- `lookAt` (`criticalMoment.ts:340-345`) is unreachable in production, because the only caller of `criticalMomentStatement` passes no `fen`. Do **not** fix that by passing `fen`: on this board White's only pawn is e4, so "Both are pawn moves" names the answer, which breaks the rule that Learn never names the student's next move unasked. I'd delete it; that is David's call.
- `foundMoveTeaching` never passes `seat`, so `bestReason` (`criticalMoment.ts:269-276`) is never computed in Learn, and the found verdict never gets its "why".
- `foundMoveTeaching` reads the same fan twice (`learnBoardTeaching.ts:920` and 935), and the page reads it a third time (`CoachTeachPage.tsx:9815`). That is wasted work, though the count is the same each time.

## 5. The failing test

**New file `src/services/criticalMoment.frame.test.ts`**, using the `computePositionFacts` call pattern from `positionFacts.test.ts:172-200`:

```ts
const AFTER_D5 = '6k1/1p6/6K1/1N1p4/p3P3/8/8/8 w - - 0 47';   // ply 93 → today's stem [1]
const l = (rank, cp, uci) => ({ rank, evaluation: cp, mate: null, moves: [uci] });
const fan = { evaluation: 584, isMate: false, mateIn: null, depth: 14, bestMove: 'e4e5',
  topLines: [l(1,584,'e4e5'), l(2,573,'e4d5'), l(3,-40,'b5c3'), l(4,-41,'g6g5'), l(5,-41,'g6h5'), l(6,-41,'g6f5')] };
const r = await computePositionFacts({ boardComputers: 'surface', posture: 'walk', fen: AFTER_D5,
  moverColor: 'w', studentColor: 'w', analysis: fan,
  opponentLastMove: { fenBefore: '6k1/1p6/3p2K1/1N6/p3P3/8/8/8 b - - 1 46', san: 'd5' } });
const t = r.clauses.find((c) => c.kind === 'key-moment')?.text;
expect(t).toMatch(/two moves keep the win/);        // the claim, unchanged
expect(t).toMatch(/^After their pawn to d5,/);      // FAILS today: "On this move, two moves keep the win. The rest give it away."
expect(t).not.toMatch(/\bthis move\b/i);            // FAILS today
```

**Companion check.** `foundMoveTeaching('6k1/1p6/3p4/1N5K/p3P3/8/8/8 w - - 0 46', 'Kg6', [l(1,601,'h5g6'), l(2,21,'h5g4'), l(3,4,'h5h4'), l(4,0,'b5c3'), l(5,0,'h5g5'), l(6,0,'h5h6')], 'w', 'g6', history)` should start "Kg6 was the only move that kept the win." This pins down that the two boards really have different, true counts.

**Unit check on the producer.** Loop `ply` over 90..97 and call `criticalMomentStatement(read, ply, anchor)` with the d5 anchor, then again with `null`. Each output must name its decision and none may contain "this move". Today it fails at every ply where `ply % 4` is 1 or 2.

## 6. Risks and who else calls it

- **Only one production call site** of `criticalMomentStatement`: `positionFacts.ts:1836`.
- **`criticalMoment.test.ts` needs updating** where it calls the statement with 2 arguments (lines 64, 123-128, 140, 155, 180, 195-197, 203). Pass `null` there; those tests check the claim, not the stem, so they still hold.
- **`positionFacts.test.ts:176-206` is unaffected.** It passes no `opponentLastMove`, so it gets the unanchored wording, and its assertions are on the claim.
- **Surfaces that start saying "After their …":** Learn (`CoachTeachPage`), `boardTurnAnswer`, `chatBoardRead`, `positionReadComposer` (all already pass `opponentLastMove`).
- **Surfaces that get "Your move now" wording:** `useLiveCoach` (Play, which is silent unless asked), `usePhaseNarration`, `whyBestMove` (`clauseText(['key-moment','convert'])`).
- **No audit depends on the stem text.** The only match in `scripts/audit-lib` is `critical-moment-voice.mjs`, which is review-only and does not check wording.
- **Voice cost:** new sentence strings miss the TTS clip cache, which is a small one-off cost. No walkthrough regeneration is needed; this is all live narration.

---

## Defect 4: Learn computes one move's cost three different ways

The door, the spoken verdict and the saved record each work out the cost themselves, from the same short time-limited engine reads, using different arithmetic. They disagree by design.

### 1. What was observed

The producers have not changed since b494915. `git diff b4949153..HEAD` touches only an unrelated `tacticStakesFor` refactor in `CoachTeachPage.tsx`. Line numbers below are from `/home/user/cap-ls` HEAD.

**Case A: the coach's …Rxb2 (ply 38, Black)**
- Board before: `r1b1k3/pp2p2N/2np2p1/6R1/4P1n1/1PN3P1/1P3rP1/4R1K1 b - - 0 19`
- Board after: `r1b1k3/pp2p2N/2np2p1/6R1/4P1n1/1PN3P1/1r4P1/4R1K1 w - - 0 20`
- Move committed at t=1438385.
- `learn-reason-source` at t=1439788 said: "Their Rxb2 is imprecise. Rf7 was their move — it would attack the knight on h7."
- Spoken once at t=1440172 (`speakCloud`). The `trackA` and `hintRegister` rows at t=1439796 are log rows for the same utterance, not repeats.
- Heard 4655 ms after the student's axb3. No cost was said.

**Case B: the student's Kg5 (ply 77, White)**
- Board before: `5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w - - 4 39`
- Board after: `5k2/1p6/3p2P1/p5K1/3nP3/2N5/8/8 b - - 5 39`
- t=2668246, `learn-reward`: `second-best`, `fault:true`.
- t=2671621, `learn-turn-decision`: `turn.moveCostCp: 63`, `ownMove: affirm`, no `mistake` lane offered.
- t=2674381, `misconception-captured`: `cpLoss=115`, `bestSan=e5`, tag `calculation-depth`.
- No verdict on Kg5 was heard. The coach's next move, Ne6+ (141cp at depth 20), was spoken as "a mistake — it throws away about a point".

**What Stockfish says** (Stockfish 16; side to move's point of view):

| Read | Kg5 cost | Rxb2 cost |
|---|---|---|
| Depth 20, top 4 lines | best Ke3 −0.11, e5 −0.22, Kg5 −1.34 → **112–123** | Rf7 +5.88, Rxb2 +3.94 → **194** |
| Depth 20, both moves scored in one search | **142** | **168** |
| Depth 14, both moves scored in one search | **133** | **186** |
| Depth 14, read before minus a separate read after | 149 | 222 |
| 6-line spread, depth 6 / 9 / 10 / 13 / 18 | **60** / 84 / 100 / 149 / 146 | 234–245 at depth 10–14 |

- **Kg5:** the door's 63 only reproduces from a depth-6 spread of lines. Kg5 is a **mistake**: 11–12.5 points of win% lost, against the 10-point mistake bar. The record's 115 is close to right, but by luck — its method is the one `moveCost.ts` exists to ban.
- **Rxb2:** about 170–200cp, matching the reported ~207. Scored in one search, the win% drop is 7.9–9.4, so it is an **inaccuracy**. "Imprecise" is correct under your locked rule of matching chess.com's expected points. What is wrong is how the word is computed (see 3c).

### 2. Root cause

Learn has no single owner of "what did this move cost": three call sites each turn the same time-limited reads into a cost with different arithmetic, and each label is graded from whichever cost its own lane computed.

### 3. Proof

**(a) The door's 63 — a spread of lines with no depth check.**
- `CoachTeachPage.tsx:10021-10030`: the reply probe is `setMultiPv(6)` plus `analyzeWithBudget(fen, COACH_TURN_DEPTH=14, 1200)`. It goes into `studentBestReadRef` and becomes `preStudentRead` (lines 9688-9693).
- `CoachTeachPage.tsx:9734-9742`: `gradePlayedMove(...)` gives `studentCpLoss = grade.cpLossCp`.
- `playedMoveGrade.ts:69,77-91`: the input type drops `depth`, and the cost is the best line minus the played line, whatever depth the search reached.
- `moveCost.ts:41-46` has the `deepEnough` check for exactly this case (the walk oct3e comment). `gradePlayedMove` never uses it.

`studentCpLoss` then feeds:
- the door: `moveCostCp` at line 10958 (instant) and line **12040** (late);
- `rememberHeardVerdict` at line 9765 — this is the "one verdict per move" that Review repeats (`learnGameRecord.ts:172-178`);
- `liveGradesRef` (lines 9749-9759), which becomes the saved annotation (`learnGameRecord.ts:59-62`);
- the position facts' last-move cost (lines 10373 and 10379);
- `counterThreatTeaching` (line 11740);
- the learn reward.

Because 63 is below `VERDICT_TURN_CP = 100` (`learnTurnDoor.ts:423, 599-600`), the turn was not treated as a verdict turn.

**(b) The late lanes' cost — a different number on the same turn.**
- `CoachTeachPage.tsx:11177-11179`: `liveMoveCost(fenBefore, uci, preStudentRead, 14) ?? 0` scores both moves in one search and does check depth. This number feeds `studentMoveTeaching`, `slipSpoken`, `backwardLook` and `learnFundamentalVerdict`.
- In the same late wave, the door at line 12040 reads `studentCpLoss` from (a). So one turn uses two costs.
- `?? 0` turns "could not price" into "cost nothing", which the comment at lines 9678-9681 forbids.

**(c) The label mixes two different searches.**
- `inaccuracyCall.ts:599-613` builds the "before" eval as `moverEvalAfterCp + cpLoss`.
- For the coach, `moverEvalAfterCp = cm.evalAfterWhiteCp` (line 11953). That comes from the reply probe — another 1.2-second, 6-line read (lines 10261-10265) — while `cpLoss` comes from the one-search scoring at lines 11920-11921.
- For Rxb2 this gives a "before" eval that neither search produced. Same-search scores give 9.4% (imprecise). The mixed pair with a depth-14 "after" read of 342 gives 10.4% (a mistake). The word flips depending on which read finished.
- The two-score function already exists: `moveScoresOneSearch` (`moveCost.ts:29-60`) returns the cost plus both scores from the same search. Review grades off it (`gameAnalysisService.ts:2176-2186`). Learn's `liveMoveCost` (`playedMoveGrade.ts:182`) throws the two scores away.
- Rxb2's cost is also searched twice (lines 11901 and 11920). Searches with `searchmoves` bypass the cache and in-flight sharing (`stockfishEngine.ts:1484, 1542`).

**(d) The record's 115 — before minus after, read from a mislabelled cache entry.**
- `useDiscussionPractice.ts:389-419`: two `analyzePosition(…, 14)` calls, then `cpLoss = evalBeforeMover - evalAfterMover`. This runs 6 s later (`CoachTeachPage.tsx:9865-9898`).
- The tape shows both reads were cache **hits** at t=2674247 and t=2674248, `depth=14`.
- Those entries were first asked for at t=2616318 (the before-board, during the previous reply's think time — the 1.2-second, 6-line probe) and t=2668413 (the after-board, 175 ms after Kg5 — `midTurnRead`, a 1.5-second budget, lines 9945-9947).
- The engine caches under the depth it was **asked** for (`stockfishEngine.ts:1669, 2370-2371`). The budget's `stop()` (lines 2083-2084, 1971) does not clear that key. `holdForQuestion` (1991-1994) and `supersedeWaiting` (2020-2024) do, under their own rule: "never cached under the depth it asked for".
- So 63 and 115 come from **the same two budget-limited searches**: 63 is the gap between lines inside the probe, and 115 is the probe's best line minus the other read's eval. The tape does not show whether the probe was actually cut short; the code path caches it as depth 14 either way.
- The 115 drives `captureMisconception` (`cpLoss`, severity), `recordMoveEvidence`, `advanceLive` (the opponent's strength) and the hint dial.

That breaks the "one detector, two consumers" rule: teaching graded Kg5 at 63, strength and record at 115. PLAN.md:59 already lists `useDiscussionPractice`, `liveFundamental` and CoachGamePage as "siblings not yet migrated" to the one-search cost. The missing depth check in `gradePlayedMove` and the mixed-search band are not listed.

### 4. The fix — one cost computer, one search per move, every reader uses it

1. **`playedMoveGrade.ts`:** replace `liveMoveCost` with `liveMovePrice(fenBefore, playedUci, fan, depth): Promise<MovePrice | null>`.
   - It calls `moveScoresOneSearch` and returns `{costCp, bestWhiteCp, playedWhiteCp, depth, band}`.
   - `band` is `gradeMove({beforeCp: best·sign, afterCp: played·sign})` — both from the same search.
   - It is memoized by `(fenBefore, playedUci, depth)`, so every caller gets the same promise and the engine runs one search.
2. **`moveCost.ts`:** split out the synchronous "read it from the spread of lines" branch (`scoresFromFan`).
   - It returns null when the search is shallower than asked or the move is not among the lines.
   - `gradePlayedMove` reads only this, and its own `cpLossCp` / `labelFor` arithmetic (lines 77-91) is deleted.
   - A budget-cut read then grades nothing, and the instant reaction waits for the late wave — the same thing it already does for a move outside the lines.
3. **`CoachTeachPage.tsx`:**
   - the door (10958 / 12040), `rememberHeardVerdict`, `liveGradesRef`, the last-move facts (10373-10379) and `counterThreatTeaching` (11740) all read the price;
   - the heard verdict is written after the price resolves, so Review stores the grade the verdict lane actually used;
   - `?? 0` is deleted at 11178, 11901 and 11920 — an unpriced move stays null.
4. **`callInaccuracyDetailed` / `backwardLook`:** take the price and grade the band from its two scores from the same search. The rebuilt "before = after + cost" at `inaccuracyCall.ts:599-613` goes. `moverEvalAfterCp` stays for wording only. This applies to the coach side (line 11953) too.
5. **`useDiscussionPractice.evaluatePlayerMove`:** delete the before-minus-after subtraction and price the move through `liveMovePrice`.
   - In Learn this is a memo hit, so the record gets the same number as the door and the voice.
   - PlayableLinePlayer, MiddlegamePractice and OpeningPlayMode get the one-search cost automatically.
   - This follows the precedent of Play's `recordGradedMove` (CoachGamePage.tsx:3132-3142), which removed a second checker on 2026-06-04 because the two disagreed.
6. **Engine — another producer with the same fault (a number that claims a depth it doesn't have):** at `stockfishEngine.ts:2370`, cache under `pending.depth` (the depth reached), not `cacheDepth` (the depth asked). A cut-short read can then only answer requests at or below what it actually searched.
7. **Other producers with the same cause:**
   - `CoachGamePage.tsx:2636-2637`: the coach move veto `coachEvalIfBest - coachEvalAfter`;
   - `liveFundamental` falling back to two evals when `costCp` is null.

**Wording for Rxb2 is your call.** After this fix Rxb2 still says "imprecise", which is correct under the chess.com rule. Whether giving back about 2 points in a +5.9 position should also say how big the give-back was is new: today `costFitsGrade` (`engineConstants.ts:236-240`) keeps any cost above 100cp out of an "imprecise" line. That one is for you to decide; I have not designed it.

### 5. Tests that fail on today's code

- **`src/services/playedMoveGrade.test.ts`**
  - Input: Kg5 board `5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w - - 4 39`, played `f4g5`. The 6-line spread is `{depth: 6, topLines: [e4e5 −17, f4e3 −25, f4g5 −77, c3d5 −77, g6g7 −89, c3a2 −109]}` (Stockfish depth-6 numbers). The scorer stub returns `[e4e5 −4, f4g5 −137]` (depth-14 one-search numbers).
  - Assert: `g === null || g.cpLossCp === await moveCostOneSearch({…, depth: COACH_TURN_DEPTH})`.
  - Today: 60 vs 133, so it fails.
- **`src/hooks/learnSilentCapture.test.ts`** (same harness)
  - Input: `analyzePosition` returns before −3 (best e4e5) and after −118, which is the 115 path. A call with `{searchmoves}` returns `[e4e5 −4, f4g5 −137]`. Call `evaluatePlayerMove` with the Kg5 arguments.
  - Assert: `captureMisconception` was called with `context.cpLoss === 133`.
  - Today: 115, so it fails.
- **`src/services/stockfishEngine.test.ts`**
  - Input: `analyzeWithBudget(FEN, 14, 300)`; on `go`, emit `info depth 6 multipv 1 score cp -17 pv e4e5`; advance 300 ms, then emit `bestmove e4e5`.
  - Assert: `stockfishCache.get(FEN, 14) === undefined` and `result.depth === 6`.
  - Today: the cache returns the depth-6 read as depth 14, so it fails.

### 6. Blast radius

**Learn**
- Which turns count as verdict turns, and therefore turn length.
- Some instant grades will speak later, in the late wave, when the probe was shallow.
- Learn reward chimes.
- Heard verdicts stored for Review ("one verdict per move").
- The saved game's annotations, which also get stamped `fullyAnalyzed` at a depth that may not have been reached.
- Fundamental attribution, the heat-map evidence carried on the last move, and the counter-threat lane.
- The coach's own verdict words: stable from now on, and searched once instead of twice.

**The record**
- My Mistakes cost and severity, capability held/broken, the opponent's live strength and the hint dial, on Learn and on the three Openings practice surfaces.

**Engine cache**
- Every reader of a depth-keyed cache entry gets an honest depth: the eval bar's depth-12 requests, the record's reads, and any budget-limited caller.

**Instrument gap**
- The student-side `backwardLook` never logs why it declined; only the coach side does (`lastCoachVerdictDecline`). So the tape cannot show which cost the student's verdict lane used at Kg5. It should emit the same decline row the coach side does.

---

# DEFECT 5: repeats in the Smith-Morra replay (build b494915)

**Scope.** I checked every producer in the chain below and none has changed between b4949153 and HEAD 4ad28bd8:
- `/home/user/cap-ls/src/hooks/usePhaseNarration.ts`
- `/home/user/cap-ls/src/services/speedRunReads.ts`
- `positionFacts.ts`, `learnTurnDoor.ts`, `voicePackage.ts`, `thinkAloud.ts`, `kingAttackReads.ts`, `conceptKey.ts`, `thinkPause.ts`, `learnMemory.ts`, all in `/home/user/cap-ls/src/services/` (`thinkPause.ts` is in `/home/user/cap-ls/src/utils/`)
- `/home/user/cap-ls/scripts/audit-lib/hand-driver.mjs`

`CoachTeachPage.tsx` changed in only two hunks (lines 39 and 8787, the tactic-stakes refactor), and neither touches the code involved here. I ran the real code checks at b4949153 in `/home/user/cap-branch`.

## 0. How the report maps to the prep, and a correction to the instrument note

**Numbering.** The report's numbers are White's MOVE numbers as printed in `g1.out` (`${moveNo}.${san}`). The prep's ply for move N is 2N−1:
- 16, 23, 27, 43, 47, 48 are plies 31, 45, 53, 85, 93, 95.
- 17 and 18 are plies 33 and 35.
- 27, 29, 30 are plies 53, 57, 59.
- 4 and 5 are plies 7 and 9.

**The "≤ 50 ms apart" rule in the instrument note is wrong.** Two shapes of double-logging each cover ONE utterance:
- **(a) Every line, via the harness.** `hand-driver.mjs:72-75` collects every `coach-narration-spoken` row. That includes the page's package row (`CoachTeachPage.voicePackage`, `hintRegister` or `phase`) and the voice's playback row (`voiceService.speakCloud`). A line with no SAN reads identically in both, so it looks doubled. The two rows are 0.4–10.3 s apart, not ≤ 50 ms.
- **(b) Phase lines.** `speakPackage` logs when the line is queued and `speakCloud` logs when it plays. A phase line that waited behind another line (`speakInternal.noOverlap`) shows the two rows 12.9 s apart:
  - "Nothing hinges…": t=398047 and t=410967
  - "The plan here: plant the knight on the g5 outpost…": t=1777638 and t=1790510
- **The reliable count** is the `voice-speak-invoked` rows (`speakForced` / `speak`): exactly one per utterance.

## 1. What was observed

### Reported items that are NOT repeats in this build

| Report | What the raw transcript shows | Verdict |
|---|---|---|
| "Same line twice in one turn" at 16, 23, 27, 43, 47, 48 | One `speakForced` per line, each with a package row and a playback row:<br>• 16 "Careful — your pawn on f2…": voicePackage 1229445 / speakForced 1230146 / speakCloud 1230170<br>• 16 "Take it — one capture removes the bishop…": hintRegister 1229871 / speakForced 1240188 / speakCloud 1240190<br>• 23 "Careful — their bishop on d7…": 1681589 / 1682266 / 1682271<br>• 27 "Their bishop on g4 has nothing defending it…": 2022136 / 2022516 / 2022535<br>• 43 "Careful — your pawn on g7…": 2914029 / 2914403 / 2914431<br>• 47 "mate in 3": 3184632 / 3184993 / 3185004<br>• 48 "mate in 2": 3205404 / 3205789 / 3205797 | Instrument artifact (a) |
| Plan lecture at 4 and 5 | No plan text is said at plies 7 or 9. `planThread.ts:146-153` (commit 4070b084, whose test is named "move 4 of the Smith-Morra") holds the plan until the opening is over. The lecture now comes as one fact: the question at move 7 (speakForced 397972, "…where is your pawn break?") and the answer at move 8 (speakForced 525895, "Checks, captures, threats: …"). | Not a repeat. The answer is deliberately held until the student moves (`splitThink`, `CoachTeachPage.tsx:10897-10921`). Its sentence keys were already recorded at move 7 (`CoachTeachPage.tsx:12085`). |
| g6 plan at 17 and 18 | The same split. The `hintRegister` row at t=1271222 holds the whole fact. The question was spoken at t=1271425 ("…Why this one and not seizing the open c-file?"). The answer "No pawn of theirs can protect their pawn on g6…" was spoken at t=1345683/1345685 with no package row of its own. | Not a repeat. Separate problem: the held answer was spoken ahead of that turn's danger line ("Careful — this costs a pawn…"), which was ready at 1345448 but voiced at 1356880. |
| "Knight on f6 hides their king" at 27, 29, 30 | Heard once, at move 27 (speakForced 2030367). At moves 29 and 30 the read was computed (coach-decision rows t=2133442 and t=2176466 list `king-read`) but not heard. Running the real `ownPieceShelter` at plies 54, 58 and 60 gives the same key `concept:discovery:f6f1` all three times (`kingAttackReads.ts:650` → `conceptKey.ts:20`), so the claim ledger dropped the later two. | Already fixed at the producer by 4070b084, which is an ancestor of b4949153. The old key `kr:shelter:${slider}${blocker}${king}` changed with the king's square. |

### REAL repeats: the same claim said twice in different words, missed by the say-once ledger

**R1: claim `srr:any-move-fine`, said in a different wording each time.**
- **Move 7 / ply 13 (O-O), phase lane.** `CoachTeachPage.phase` t=397982 → speakForced 398048 → speakCloud 410967: "Nothing hinges on your next move — pick a sensible one and keep your clock for the hard decisions."
- **Move 11 / ply 21 (Re1), turn door, positionFacts lane.** `hintRegister` t=820373 → speakForced 820379 → speakCloud 820383: "Your next move is not a big decision — several are about equally good, so save your time for the moves that are."
- **Same producer and claim.** Both come from `anyMoveFine`, and its own code calls this claim once-a-game. The wording rotates on the move number: 8 % 3 = 2 gives the "Nothing hinges" form, 12 % 3 = 0 gives the "not a big decision" form.
- **Checked with real code and Stockfish.** Running the real `anyMoveFine` on the two boards returns exactly these two sentences with the same claim. Stockfish depth 20 agrees both are "any move is fine" positions (White's view):
  - Move 8: e5 −0.17, Nd5 −0.28, Bd5 −0.30.
  - Move 12: Rc1 −2.86, Nd5 −2.99, Qb3 −2.99.
- **Same cause, second symptom.** At ply 13 the turn door had already HELD this same claim as "contradicts" (decision row t=398830). The only thing that produces that hold is the calm-read check in `learnTurnDoor.ts:668` and `:673`. The phase lane's copy then spoke anyway, next to the "a discovery is 4 moves away" look-ahead, and the next move, Bxf7+, cost 198 cp.
- **Reproduces in both other replays, in both directions:**
  - Najdorf (g2): phase at move 7 (speakForced t=336527, "Nothing hinges…"), then door at move 8 (hintRegister t=412407, "…Your next move is not a big decision…").
  - Larsen (g3): door at move 7 (speakForced t=360264, "Nothing hinges…"), then phase at move 8 (speakForced t=435525, "Your next move is not a big decision…").

**R2: `overprotect`, the knight on d5, a read with no claim key.**
- **Move 26 / ply 51**, on board `r5k1/pp6/2np1p2/3N4/4P1b1/1P4P1/6K1/5R2 w - - 0 27`. speakForced t=1950332: "Give your knight on d5 a second guard — it is your best piece, and one defender is one capture away from losing it."
- **Move 33 / ply 65**, on board `r7/pp4k1/3p1R2/2nN2P1/4P3/8/6K1/8 w - - 4 34`. speakForced t=2363875: "Your knight on d5 is your best piece — overprotect it: a second guard means it can never be won or traded off cheaply, and it frees your other pieces."
- **Producer.** `overprotect` (`speedRunReads.ts:224-233`) has no claim and two wordings that rotate on the move number's parity (27 gives the second, 34 the first). The real code returns no claim on both boards.
- **It is one claim.** Same knight, same outpost, the same single guard from the e4 pawn. The knight left d5 at 27.Nxf6+ and came back at 32.Nd5+.

## 2. Root cause

When a producer does not hand its claim key to the turn door, the game's say-once ledger only knows the claim by the exact words it was spoken in. Two producers do this:
- The phase lane turns computed facts into bare sentences: `clauseText` → `speakSentence(text, fen)` → `{lane:'phase', text}`.
- The `overprotect` read never had a key.

So when the same claim comes back in a different wording (`rot(fen, …)`, keyed on the move number), it is new text and passes `buildVoicePackage`.

## 3. Proof

The code path, using `/home/user/cap-ls` paths. In every line, the arrow is "is handed to".

**The once-a-game claim exists at the source.**
- `/home/user/cap-ls/src/services/speedRunReads.ts:28`: `rot(fen, …)` picks the wording by move number.
- `:68-83`: `anyMoveFine` returns `{ idea: rot(…3 wordings…), claim: 'srr:any-move-fine' }`.
- `:37`: on `Read`, `claim?` is optional, documented as "A once-per-game claim".
- `:668-672`: the read is exempt from the relevance filter and is to be said "once a game anyway".

**The turn lane keeps the claim.**
- `thinkAloud.ts:357` (`push` copies `r.claim`) and `:384` (the idea is spoken when the move is withheld).
- → `positionFacts.ts:1152-1161` (the depth clauses keep `claim`).
- → `CoachTeachPage.tsx:10465` (`queueSpokenHint(…, c.claim ? [c.claim] : undefined …)`).
- → `voicePackage.ts:496` (`claim already said`) and `:556`, plus `spokenSentenceKeys` at `:588-595`.
- → the game ledger `learnMemRef.current.spokenKeys` (`CoachTeachPage.tsx:12085`).

**The phase lane strips the claim.**
- `usePhaseNarration.ts:645-674`: `computePositionFacts` → `clauseText(pf.clauses…)`. `positionFacts.ts:478-480` returns `c.text` only; claim, squares and stakes are dropped.
- `:771`: `transitionSentence` becomes `extraFacts`.
- `groundedMoveFeedback(computedOnly)` returns plain text, which is split into sentences.
- `dispatchSentence` (`:325-442`) → `via(trimmed, event.fen)` (`:438-439`), under the contract `speakSentence: (text: string, fen: string)` (`:82`).
- `CoachTeachPage.tsx:8153`: `facts: [{ lane: 'phase', text, fen, proof: NO_PROOF.description }]`, with no claims, squares or stakes.
- `:8172` therefore records only the sentence's text key.

**What that does in this game.**
- At ply 13 the ledger never got the key `claim:srr:any-move-fine`: the turn lane held the fact ("contradicts"), and the phase lane's copy carried no claim.
- `sayKey` (`voicePackage.ts:401-421`) turns the two wordings into unrelated keys ("nothinghinges…" vs "yournextmoveisnot…"), with no shared start for the near-twin check to catch.
- So the move-11 copy passes.
- The calm-read hold (`learnTurnDoor.ts:668`) tests `claims?.includes('srr:any-move-fine')`, which a claim-less phase fact can never satisfy. The phase lane also calls the door once per sentence, so no stake from the same transition is ever "at stake" beside it.

**Measured with the real door at b4949153.**
- `decideTurn` on the phase fact as `CoachTeachPage` builds it today, then on the move-12 fact: the second call speaks "Your next move is not a big decision — …".
- The same run with `claims: ['srr:any-move-fine']` on the phase fact: the second call speaks `''`.
- For `overprotect` (no claim on either fact): the second call speaks "Your knight on d5 is your best piece — overprotect it: …".

## 4. The fix

### F1: the phase lane hands the door facts, not sentences (the producer that strips the claim)
- **Contract.** Replace `speakSentence: ((text, fen) => Promise<void>) | null` (`usePhaseNarration.ts:82`) with `speakFacts: ((facts: readonly PhaseFact[]) => Promise<void>) | null`, where `PhaseFact = { text; fen; claims: readonly string[] /* REQUIRED, [] is an answer */; squares?; stakes?; proof: FactProof }`. A required `claims` field means a new phase producer cannot compile without answering it.
- **Producer.** In the branch for a mount with a door, keep `pf.clauses` (each `ClauseItem` carries claim, squares, stakes and proof; `positionFacts.ts:405-445`) instead of `clauseText` (`:673`). Hand them over with `claims: c.claim ? [c.claim] : []`, together with the balance sheet's existing keys (`stockKeys`) and the look-ahead's tactic key. Send the whole transition in ONE door call, so the turn rules (the calm-read hold, subsumption, the mate turn) see its facts together.
- **What stays.** The text pipeline (`groundedMoveFeedback` → split → `speakPackage`) stays only for a mount without a door (Play, which passes null and is silent at `CoachGamePage.tsx:1894`) and for `onReport`.
- **Adapter.** `CoachTeachPage.tsx:8149-8174` maps each fact to `{lane:'phase', text, fen, claims, squares, stakes, proof}`, the same way `queueSpokenHint` already does at `:10465`. Line `:8172` then records the `claim:` keys.
- **Effect.**
  - Najdorf move 8 and Smith-Morra move 11: the reworded copy is dropped at `voicePackage.ts:496`.
  - Larsen move 8: the phase lane's copy is dropped.
  - Ply 13: the door can hold "Nothing hinges…" beside the look-ahead stake.

### F2: every rotating-wording read must carry a claim
- Make `claim` required on `Read` (`speedRunReads.ts:37`): `claim: string | null`, where null explicitly means a one-moment read.
- `overprotect` gets `srr:overprotect:${cell.square}`.
- Same class, latent today:
  - `keepTension` (`:55-65`, three wordings, no claim) → `srr:tension:${from}${to}`
  - `heldByTactic` (`:186`) → `srr:held:${square}`
  - `castleSide` (`:118-125`, has a promise key but no claim) → `srr:castle-side:${side}`
  - the rotating tails at `:109`, `:311`, `:552`, `:571` → keyed on the engine move
- Nothing downstream changes: `thinkAloud.ts:357`, `positionFacts.ts:1161` and `CoachTeachPage.tsx:10465` already forward a claim when there is one.

**Why this is the root fix.** The claim ledger already works. The producers were dropping or never writing the key. No text filter is added and `sayKey` is untouched.

**Every producer that reaches the voice without the claim ledger:**
1. The phase lane: claims stripped. Fixed by F1. Proven in all three replays.
2. Claim-less rotating-wording reads in `speedRunReads`. Fixed by F2. Proven by `overprotect`; the others above are latent.
3. The held answer from `speakTrackA` (`CoachTeachPage.tsx:10897-10921`). It is spoken outside the next turn's door, but its keys were recorded with the question (`:12085`), so it cannot repeat. Its problems are order and board, not repetition.
4. Direct `voiceService.speak` lines: "Well found.", "That's five in a row.", "Threat met.", "Got it — after your move…". These are per-event by design and never enter the ledger. No repeat was observed.
5. Two text-only side ledgers: `usePhaseNarration.ts:315-316` (`spokenKeys`) and `voiceService.ts:1246-1262` (`recentlySpoken`, last 12 lines). Neither sees claims, and neither should be extended to cover this.

## 5. The failing tests

**T1: new file `/home/user/cap-ls/src/services/speedRunReads.claim.test.ts`**
```ts
const F27='r5k1/pp6/2np1p2/3N4/4P1b1/1P4P1/6K1/5R2 w - - 0 27', F34='r7/pp4k1/3p1R2/2nN2P1/4P3/8/6K1/8 w - - 4 34';
const a=overprotect(F27,'w')!, b=overprotect(F34,'w')!;
expect(a.text).not.toBe(b.text);   // the wordings rotate (passes today)
expect(a.claim).toBeTruthy();      // FAILS today: undefined
// claims passed the way CoachTeachPage.tsx:10465 passes them
const ledger=new Set<string>();
const d1=decideTurn([{lane:'positionFacts',text:a.text,fen:F27,squares:a.squares,claims:a.claim?[a.claim]:undefined,proof:NO_PROOF.description}],undefined,ledger);
for (const k of spokenSentenceKeys(d1.pkg)) ledger.add(k);
const d2=decideTurn([{lane:'positionFacts',text:b.text,fen:F34,squares:b.squares,claims:b.claim?[b.claim]:undefined,proof:NO_PROOF.description}],undefined,ledger);
expect(d2.pkg.spoken).toBe('');    // FAILS today: "Your knight on d5 is your best piece — overprotect it: …"
```

**T2: new file `/home/user/cap-ls/src/hooks/usePhaseNarration.claims.test.ts`**
- **Mocks.** Copy them from `usePhaseNarration.test.ts:39-95`, but leave out the `voicePackage` mock. Mock `computePositionFacts` to return the clause built by the REAL `anyMoveFine(F8, L8)`: `{kind:'speedrun-read', rank:45, text:r.idea, claim:r.claim}`. The engine resolves with `topLines: L8`; `groundedMoveFeedback` is set to `echoComputedFacts`; `corpusNotes: false`; `tacticsOwnedByTurn: true`.
- **Boards and engine lines (evaluations from White's view):**
  - `F8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8'`, with `L8 = e4e5 −17, c3d5 −28, c4d5 −30`
  - `F12 = 'r1b1k2r/pp2p1bp/2np1np1/q5N1/4PB2/2N5/PP3PPP/R2QR1K1 w - - 6 12'`, with `L12 = a1c1 −286, c3d5 −299, d1b3 −299`
- **Assert A.** The fact the hook hands the door carries `claims` containing `'srr:any-move-fine'`. This FAILS today: the door receives `('Nothing hinges on your next move — …', F8)`.
- **Assert B.** Pass what was handed through the real `decideTurn` and `spokenSentenceKeys`, as `CoachTeachPage.tsx:8153` and `:8172` do. Then call `decideTurn([{lane:'positionFacts', text: anyMoveFine(F12,L12).idea, fen:F12, claims:['srr:any-move-fine'], proof}], undefined, ledger)` and expect `pkg.spoken === ''`.
  - Measured today: it speaks "Your next move is not a big decision — several are about equally good, so save your time for the moves that are."
  - Measured with the claim carried: `''`.

## 6. Blast radius

- **`usePhaseNarration`** has two mounts: `CoachTeachPage.tsx:8131` (has a door) and `CoachGamePage.tsx:1819` (passes null and is gated silent). `usePhaseNarration.test.ts` passes `speakSentence: null` at lines 129, 389 and 406; those need the rename.
- **Learn.** Both phase transitions of every game:
  - Phase lines the turn lane already said will now be dropped as "claim already said".
  - Reworded repeats in the turn lane disappear.
  - The ply-13 contradiction goes away once the transition is a single door call.
  - Expect fewer heard words at the transition turns in `audit-learn-replay` and in the interrupt contract of `audit-concept-gameplay-prod`.
- **`Read.claim` made required.** This touches every read function in `speedRunReads.ts`. Its consumers are `thinkAloud.ts:356-392`, `moveInsight.ts:41` (imports `castleSide`, `heldByTactic`, `keepTension`, …) and `tacticalRead.ts:21`. The surfaces reached through `depthClauses` are Learn's late lane and phase lane, plus chat (`boardComputers.ts:343-346`). Tests: `speedRunReads*.test.ts` and `deliberation.speedrun.test.ts`.
- **Instrument.** The prep should count `voice-speak-invoked` rows as utterances, not `speakPackage`/`speakCloud` text pairs.
- **Not run.** `node scripts/surface-map.mjs --changed` must run before the build; I did not run it because it writes files and this pass was read-only.

---

## DEFECT 6: the phase turn at ply 13 (7.O-O), opening-to-middlegame, rule `castled-connected`

Board after the coach's reply 7…Bg7: `F = r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8`. The late wave and the phase wave both decided on this same board: the hintRegister facts and the `phase-transition-detected` event carry an identical FEN.

### 1) What was actually heard

**The 298 is a counting error.** The prep script counted every phase line twice: once from `speakPackage` and once from `speakCloud`. The 62-word late line came only through `speakCloud`, so it was counted once. That gives 62 + 2×118 = 298.

**The true turn is 7 utterances: 180 whitespace tokens, 172 words.** That is 60 words from the late wave and 112 words from the phase wave, spread over 6 separate clips. Times are measured from the student's move.

| t (voice start) | source | words | text |
|---|---|---|---|
| +6607 | speakCloud (Track A, late door, `CoachTeachPage.hintRegister`) | 60 | "Ask it of every candidate: after it, can they take anything of yours? Commit the pawn last — a knight move now, the pawn later … where is your pawn break?" |
| +19528 | speakCloud (queued at +6608 by speakPackage; `speakInternal.noOverlap` at +6609) | 18 | "Nothing hinges on your next move — pick a sensible one and keep your clock for the hard decisions." |
| +27153 | phase | 22 | "The obvious stop is the pawn to h3, but that pawn becomes a hook for their pawn on g6 — find another way." |
| +36388 | phase | 37 | "Before the middlegame gets going, the balance sheet: it's level — you're ahead in development … they're up a pawn — and the two hold each other." |
| +48432 | phase | 19 | "Look ahead — a discovery is 4 moves away: their knight to e5 and then their knight taking on c4." |
| +56460 | phase | 5 | "Spot it before it lands." |
| +58476 | phase | 11 | "This is a pattern that keeps catching you — watch for it." |

**"Nothing hinges" at +6.6 s and +19.5 s is one utterance, not a repeat.** It was queued once by `speakPackage` at +6608, invoked once by `speakForced` at +6609, waited behind the 62-word hint (`noOverlap`), and started speaking at +19528. The code confirms the two log points: `voiceService.ts:1271` logs when a line is queued, and the `speakCloud` log at about :2214 fires when the voice starts.

**There are no real repeats in this turn.** What is wrong is different:
- **A contradiction.** "Nothing hinges on your next move" is spoken next to "find another way" and "a discovery is 4 moves away … Spot it before it lands."
- **An orphaned half-sentence.** "The obvious stop is the pawn to h3…" was spoken alone. Its first sentence, "They want the bishop to g4, pinning your knight.", was dropped at +6539 by `usePhaseNarration.spokenSentenceGate`.
- **One fact split into three turns.** The look-ahead is one fact but was spoken as three clips, each decided separately.
- **The plan answer arrives late.** The answer half of the late wave's plan question (63 words) was spoken after the student's next move, at ply 15 +4836. This is deliberate (the answer waits for the move), so it is not counted here.

**Door rows.**
- Late wave: offered `[positional, planArc, prophylaxis, positionFacts×4]`, spoke `[planArc, positionFacts]` (both speedrun reads).
- It held `prophylaxis` as "aside" ("Watch Bg4 — it would pin your knight on f3…") and `positionFacts` as "contradicts".
- The late `coach-decision` row (+4728) has `spokenCount 4`, `unprovenKinds ['stop-flaw']`. So the four positionFacts were every-branch, flexible-first, any-move-fine and stop-flaw. Two spoke and two were held: any-move-fine, and stop-flaw, whose hold reason is hidden because `heldWhy` keeps only the first reason per lane.
- Phase wave: 8 rows of `turn.kind = 'phase'`, each with exactly one offered fact. Two had nothing survive the voice package (`CoachTeachPage.phase.held` at +6542 and +6543); those rows carry no text, so this tape cannot say which sentences they were. The other six each spoke one sentence.

**Chess checks.**
- Stockfish depth 20 at F gives e5 −0.17, Nd5 −0.28, Bd5 −0.30, Ng5 −0.41. The top three are within 13 cp, so "Nothing hinges" is true on its own. The defect is putting it next to facts that carry stakes.
- The discovery geometry checks out in chess.js: after …Ne5 the g7–c3 diagonal is blocked; …Nxc4 opens it, and the bishop then attacks the knight on c3, which b2 defends.
- The balance sheet is true: White has 3 pieces out and is castled against Black's 2 pieces, and Black is a pawn up.

**Producers are unchanged since b494915.** `git diff b4949153..HEAD` is empty for `usePhaseNarration`, `learnTurnDoor`, `coachDecider`, `voiceService`, `voicePackage`, `positionFacts`, `speedRunReads`, `thinkAloud`, `liveTacticsContext` and `reviewPositionalAssessment`. In `CoachTeachPage` the only changes are the import line and the tactic-stakes refactor at about :8786, both outside the phase path.

### 2) Root cause

On Learn, a phase transition is a second decider for the same turn. `usePhaseNarration` re-runs positionFacts on the board the late wave's door has just judged, with `'composer'` board computers and the `'interrupt'` posture. It flattens every fact to plain prose, losing the claim, squares, stakes and proof. `CoachTeachPage` then sends each sentence alone through `coachTurn({turn:{kind:'phase'}, facts:[one]})`, with no `alreadySaid`. So the facts the door held come back as plain prose, and none of the door's cross-fact rules can see them: the calm-read check, subsumption, the verdict-turn hold and the 80-word marginal bar.

### 3) Proof chain

**The late wave goes through the door properly.**
- `CoachTeachPage.tsx:10340-10342` calls `computePositionFacts` with `boardComputers:'surface'` and posture `'walk'`.
- `:10465` queues every clause through `queueSpokenHint`, keeping squares, the claim, lines, stakes, role and fact kind.
- `:12038-12058` makes one `coachTurn` call with `alreadySaid: instantSpokenText` and `priorLead`.
- `:12195` speaks it through `speakTrackA`, on Track A's one chain.

**The door holds the calm read.**
- `learnTurnDoor.ts:668-673`: `calmRead` is true when the fact's claims include `srr:any-move-fine`, and the fact is held as "contradicts" when any surviving fact has stakes. Here the staked survivor is `srr:every-branch` (`speedRunReads.ts:421`, which sets stakes).
- The rotation in `speedRunReads.ts:28/82` depends only on the move number: `rot` picks by fullmove, 8 % 3 = 2, which is the "Nothing hinges…" wording. The same board therefore always yields the same sentence.
- Without `nameMove`, the claim rides as the idea (`thinkAloud.ts:357, 383`).

**Then the second decider runs on the same board.**
- `CoachTeachPage.tsx:12236-12246`: after `verdictPass`, and only when `!mistakeCalledThisTurn`, it calls `runPhaseTransition`, which calls `phaseNarration.narrate` (:8208).
- `usePhaseNarration.ts:640-676`: `computePositionFacts` with `boardComputers: 'composer'` (:646) and `posture: 'interrupt'` (:648). This contradicts the field's own contract at `positionFacts.ts:234-238`: Learn reads them in its own lanes already, and two producers of one claim would say it twice.
- `:673-674`: `clauseText(pf.clauses)` takes only the text and appends it to `transitionSentence`. Claim, squares and stakes are dropped here.
- `:703-704`: `speakDeepestLookahead` returns one 3-sentence string (`liveTacticsContext.ts:603` plus the extra sentence at :575).
- `:757-794`: `groundedMoveFeedback({extraFacts: transitionSentence, computedOnly})` splits the text into sentences. The per-sentence gate (:404) runs, then a separate speech chain (:432-444) calls `speakSentence` once per sentence.

**The per-sentence door call is where every rule goes blind.**
- `CoachTeachPage.tsx:8149-8173`: `coachTurn({ posture:'learn', turn:{kind:'phase'}, facts:[{ lane:'phase', text, fen, proof: NO_PROOF.description }], priorKeys, priorLead })`, with no `alreadySaid`, then `voiceService.speakPackage` (:8173).
- In `decideTurn`, with one fact and no claims, `somethingAtStake` only sees that one fact and `calmRead` has no claim to read (:668-669).
- Subsumption has no squares to compare (`sameClaim` on an empty list).
- The fact is either the lead or there is no lead (:652-654), so it is never held as "aside", "restates" or "off-topic".
- The word count starts at `wordsIn(undefined) = 0` and only one fact is ever counted (:725-739), so the marginal bar can never fire.
- The only thing left that can stop a sentence is the text-keyed say-once in the voice package, which is what produced the two empty held rows.

**The data matches this exactly.** The late door held any-move-fine and stop-flaw on F. Less than a second later the phase door spoke both on F: the whole any-move-fine sentence, and the stop-flaw's second sentence on its own. It then added 76 more words (the balance sheet plus three look-ahead clips) that the late door never saw.

### 4) The fix

**Fold the transition into the late wave, so a turn has one door.**

1. **Detect the transition earlier, inside the late wave.** Move the pure `detectPhaseTransition` call (`CoachTeachPage.tsx:8186-8201`, with its `pendingRecapture` and walkthrough guards) into the late-wave fact assembly, before `computePositionFacts` at :10340. `probe.fen()` is F, the same board.
2. **Pass `phaseTurn` into the existing late call.** When the transition fires, the late `computePositionFacts` call gets `phaseTurn`. The balance sheet (`positionFacts.ts:1008` → clause kind `'stock'`) then arrives through the existing :10465 loop as a structured fact with its claim, proof and role ('teach'). No computer runs twice.
3. **Make the look-ahead one structured fact.** `speakDeepestLookahead` should return `{ text, squares, stakes, line }` instead of a string, so the computer couples its own data at emission. The late wave queues it once as a `phase` lane fact with `lineProof` and a claim. The thesis from `selectTeaching`, when the game has turned, is queued the same way. The `positionReadComposer.ts:191` caller reads `.text`.
4. **Delete the second door.** Remove Learn's `usePhaseNarration` speaking path: the `speakSentence` closure (:8149-8174) and the `narrate` call. Remove the timer fire at :12236-12248, including the `mistakeCalledThisTurn` branch; the door's verdict-turn hold (`turnHolds`) already decides that case. Remove the then-unused hook arguments `speakSentence`, `tacticsOwnedByTurn` and `getStanding` (rule G8.5), and the `'phase'` member of `LearnTurnTag` (`coachDecisionEvents.ts:216`).

**Why this is the root fix and not a gate.** No sentence is filtered. The fix removes the producer that recomputes and flattens facts, and the decider that judged sentences in isolation. After it, the calm-read check, subsumption, the verdict-turn hold, say-once by claim and the 80-word bar all apply to the transition automatically, and a future phase line has no other way in.

**Smaller alternatives that are not root fixes:**
- Passing `alreadySaid` to the per-sentence call only wakes the word bar. The text still has no claims, and positionFacts still runs twice.
- Batching the sentences into one phase call still re-runs the composer computers, so facts the door held still come back.

**Other places the same cause shows up:**
- **The text-only say-once.** The hook's `spokenKeys` and the page's `priorKeys` both match on sentence text, against the rule that say-once keys on the claim. A change in rotated wording would slip past them.
- **Its own speech chain.** The hook's chain is outside Track A's generation guard (the `staleTurnVoice` rule), so a phase line can keep talking up to `PHASE_REPORT_PLY_GRACE = 3` plies after the student moves on.
- **A blind spot in the audit tool.** `why-count.turnLength` counts each spoken line as a turn. This 180-token turn scores as seven turns averaging about 25 words, so the defect drags the Learn average down instead of up.
- **Already correct:** the instant→late chain (`:9362` → `:12038`) follows the contract. Play's mount (`CoachGamePage.tsx:1819`) is dormant because `PLAY_VOLUNTEERS_COACHING=false` and the `narrate` call is gated (:1894).

### 5) The failing tests

**T1 — fails today. `src/components/Coach/CoachTeachPage.onePhaseDoor.test.ts`**, a statement-level source scan in the style of `staleTurnVoice.test.ts`:
- Every `coachTurn({` call in `CoachTeachPage.tsx` has `turn: { kind: 'instant'` or `turn: { kind: 'late'`. Fails today at **:8153** (`kind: 'phase'`).
- `CoachTeachPage` passes no `speakSentence` to `usePhaseNarration` and makes no `voiceService.speakPackage(` call. Fails today at **:8149** and **:8173**.
- The late `computePositionFacts` call (from :10340) includes `phaseTurn`. Fails today: it is absent.

**T2 — the measured drop, through the real door and real producers. `src/services/learnTurnDoor.phaseTurn.test.ts`**:
- **Input:** board F; top lines from the Stockfish depth-20 run above (−17, −28, −30, −41 cp, White's view). Late facts from `speedRunReads` (every-branch with stakes, flexible-first, any-move-fine with claim `srr:any-move-fine`), the stop-flaw from `obviousStopFlaw`, and the prophylaxis read. Phase facts from the new assembler: the `'stock'` balance sheet and the structured look-ahead. The assembler does not exist yet, so the test fails at import today.
- **Control arm, so the test cannot pass vacuously:** replay the :8153 call shape, one `coachTurn({turn:{kind:'phase'}})` per sentence, and assert the spoken text includes "Nothing hinges on your next move".
- **One-door arm:** a single `coachTurn({turn:{kind:'late',ply:13}, facts:[...late, ...phase], alreadySaid:''})`. Assert:
  - the `srr:any-move-fine` text is never spoken (`heldWhy.positionFacts === 'contradicts'`);
  - "The obvious stop" never speaks without "They want" (one fact, one decision);
  - the look-ahead is one kept fact, not three;
  - spoken words are fewer than in the control arm (today's 112-word phase stack). With the plan text already over 80 words, the unstaked balance sheet should land in `held` as "marginal" (per `learnTurnDoor.ts:732`).

### 6) Blast radius

- **`CoachTeachPage.tsx`:** the phase mount (:8121-8178, keeping `phaseStateRef` for detection), `runPhaseTransition` (:8180-8210), the timer fire (:12236-12248), the late facts (:10340-10466), and the `turnLeadRef` phase consumer (:8150/:8171; the ref itself stays for instant→late).
- **`usePhaseNarration.ts`:** the Learn-only arguments are removed. `usePhaseNarration.test.ts` (:129, :389, :406) passes them and needs updating.
- **`liveTacticsContext.speakDeepestLookahead`:** its return shape changes. Two callers: the hook and `positionReadComposer` (the tapped "Read this position").
- **`coachDecisionEvents.ts:216`:** the `LearnTurnTag` 'phase' kind is removed. Consumers to update: `learnTurnDoor.test.ts:435` and `scripts/audit-concept-gameplay-prod.mjs:680, 698`, which skip phase rows.
- **Surfaces:** Learn free play only. Play stays silent, and Review and Kids are not touched.
- **Instruments:** the `CoachTeachPage.phase` and `.phase.held` audit rows disappear, and phase facts now show up in the late `learn-turn-decision` row's `offered` list. The `why-count` per-line turn length should be re-read after the fix, because it currently hides this turn.
- **Audits to re-run:** `audit-concept-gameplay-prod` and a hand walk of a castling transition, such as this game's ply 13.

**One process note.** I ran `node scripts/surface-map.mjs --help`, which wrote one map into `docs/surface-maps/`. The output was byte-identical to the committed file: `git status` is clean and the worktree is unchanged.