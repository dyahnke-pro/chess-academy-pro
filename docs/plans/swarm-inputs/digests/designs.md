# 30 designs for the one coach (30 returned)

## design:1 (student-first: what the student hears, move by move)
**ONE COACH: design, built around what the student hears**

**What the student hears (the measure).** Take 6.h3 in the Scandinavian, the move that decided both tape games. Today the coach says nothing there (compare.md:20-29). The one coach would say, in order:
1. What changed: "their h-pawn hits your bishop on g4."
2. Knowledge: "a guard doesn't help when the attacker is cheaper."
3. The tempting move fails: "castling looks natural, but hxg4 Nxg4 leaves you a piece for a pawn."
4. The answer: "Bh5 keeps the pin; Bxf3 trades it off."
5. The habit: "their move first: what does it hit?"

Each part gets an arrow as it is said. On Brief the student hears only parts 1 and 4.

**1. The fact type: `ChessFact`.** It widens `VoiceFact` (voicePackage.ts:95), which already carries `claims`, `squares` and `fen`. It adds:
- **`claimKey`**: kind + squares + seat. This replaces the ~12 key shapes.
- **`kind`**: one of the `FactKind` values, all in one vocabulary.
- **`seat`**: student or opponent.
- **`role`**: CHANGED, GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE, HABIT or KNOWLEDGE.
- **`moves` and `line`**: UCI moves plus the FEN each starts from, with the opponent's reply included.
- **`stakes`**: from factStakes.
- **`verb`**: the F01 verb it serves.
- **`recordTag`**: so the same fact can write to the student record.

The fact carries no prose. Two type rules keep it honest:
- A `Record<FactKind, Role>` table replaces `FACT_ROLE` (reviewFacetRank.ts:267) and Learn's lead table, so a new kind does not compile until it has a role.
- `recordTag` is a required field, so a computer cannot be added without saying how a miss is recorded.

**2. The modules**

| Module | What it becomes | Built from today |
|---|---|---|
| `engineRead` | One read per position. Key: 4-field FEN, depth actually reached, MultiPV. The singleton and the pool both use it. | Replaces stockfishCache's `fen::depth` key (stockfishCache.ts:33) and the pool's own reads (duplicate census §C1). |
| `facts/*` | Every computer emits `ChessFact[]`. One threat fact uses the signed SEE. | `computePositionFacts` (positionFacts.ts:451) becomes the collector; `depthClauses` (thinkAloud.ts:226), deliberation, moveFundamentals and gemCrushLines become emitters. Floored SEE (positionReadingService.ts:212) is replaced. |
| `moveGrade` | One grader, one stored record per move: grade, reason, better move, refutation line. | `gradeMove` (accuracyService.ts:122) feeding `saveVerdict` (moveVerdictStore.ts:55). |
| `decide` | The only door: importance, then need (now posture-aware), then subsume by `claimKey`, then floor, then order by stakes. | `decide` (coachDecider.ts:297) plus `selectFacts` (factSelector.ts:209). |
| `chain` | Orders the kept facts into the F18 sequence: CHANGED, TEMPTING and why it fails, not-yet/REMOVE-IT, LINE, HABIT. Brief takes the top two roles, never "the first two sentences". | Seeds: Learn's DNA_BEAT, `deliberationFacts` (deliberation.ts:246), `methodBeatFor` (methodBeat.ts:116). |
| `ledger` | Per game: claims said, with their squares, re-opened when a computed "it changed" check fires. Per student: terms (V18), ideas taught, and when each idea is due again. | Replaces `learnMemory`, `standingFactMemory` and about 14 other memory owners (census §B2). |
| `render` | Typed renderers (move, piece, pawn, line, seat word). Each returns words plus the marks for them. One SAN-to-words. | Replaces ~40 piece-name tables and 6 SAN-to-words renderers (census G1/G2). |
| `marks` | One adapter turns facts into claims for `admitArrows` (arrowDoor.ts:187). A line is drawn one arrow per spoken segment (brief item 6). Highlights get a door of their own. | Replaces the 5 resolvers that read arrows back out of prose. |
| `surfaceMode` | `SURFACE_CONTRACT` (surfaceContract.ts:30) with every field read: register, withholds, speaks, plus posture, whether library notes may speak, and kid mode. New entries for play, tactics, openings and kid. | Today only `registerFor` is read. |
| `record` | Any fact with a student-seat `recordTag` writes held or broken to capabilityEvidence, from every surface. | One write path for every surface (F5, R1). |

**3. What gets deleted**
- **Deciders that become `decide` + `chain`:** `learnTurnDoor.decideTurn` (:319), the playCommentary ladder, voicePackage's fixed rank, the second `teachingSelector` run, and Review's pre-gates (coachFeatureService.ts:1487-1727).
- **Dead code:** the cascade at coachFeatureService.ts:2532-3395, `rankFacets`, `buildThreatCheckQuestion`, and `components/Play/*`.
- **Prose-to-arrow resolvers:** `namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, and VoiceChatMic's `[ARROW:]` parser.
- **Side graders:** `classifyEvalSwing`, `detectGreatMove`, `gradeGuess`, and tacticClassifier's quality ladder.

**4. Build order (each phase ships on its own)**
- **P0: the slip that lost both games.** Smallest slice, lowest risk, most felt by the student.
  - Use the signed SEE in the cheaper-attacker lane (CoachTeachPage.tsx:8294).
  - Make `identityFor` (openingIdentity.ts:51) fall back to the family name when the variation entry is empty.
  - Pass `history` into Learn's read (CoachTeachPage.tsx:9692).
  - Proof: a test at 6.h3 that fails on today's code.
- **P1: `ChessFact` and `engineRead`.** Every adapter wraps an existing computer; nothing is rewritten. Engine first because the chain cannot argue a line two engines disagree on (D7: Learn said f5, Review said h5).
- **P2: `chain` on Learn's walk read.**
  - Deliberation stays on in the opening (today it is off for fullmove < 10, positionFacts.ts:463).
  - Add the per-move opening-job computer (V19).
  - Learn starts speaking F18.
- **P3: Review on the same `decide` + `chain`.** Review already calls `decide` at coachFeatureService.ts:2308. Delete the dead cascade. Turning-point causes come from facts.
- **P4: `ledger` and `marks`.** Line arrows build up one per segment; the resolvers go.
- **P5: `moveGrade` and `record`.**
- **P6: the other surfaces through `surfaceMode`:** chat, Play-on-ask, Tactics, Openings, Kids.
- **Traps (F04):** the one trap library emits `ChessFact`s from P2 onward. "Gem heard live" is David's acceptance test, so it should not wait until the end.

**5. Tests that make the old shape impossible**
- `decide` returns `ChessFact[]`, and `render` is the only place strings are made. A gate bans string-returning reasoners on coach paths.
- Arrow gate: `admitArrows` claims may come only from fact moves. The banned resolvers fail the build if imported.
- One-ledger gate: no say-once `Set` or `Ref` outside `ledger`.
- One-engine gate: only `engineRead` calls `stockfishEngine.analyze*`. The cache key includes MultiPV.
- Contract gate: every `SurfaceContract` field has a reader. A new surface fails to compile until it declares its mode.
- Grade parity: Learn, Review and Play read the same stored grade for a seeded move.
- Tape contracts:
  - 6.h3 speaks its CHANGED fact and the cheaper-attacker knowledge.
  - Named moves arrowed 100%, wordless arrows 0.
  - Every spoken unit carries an F01 verb (open question 3f).
- Record gate: a fact with a student-seat question and no record path fails.

**6. Which RULEBOOK rules each part satisfies**

| Part | Rules |
|---|---|
| `ChessFact` | F0c, F3, F4, F5, F7, R5, D10 |
| `chain` | F0, F0b, F18, F01, S3, S12, V7, V11, V15 |
| `decide` | D1-D5, D11, F06, V14, V19, F05 (asks only when the record calls for it) |
| `ledger` | D6, V13, V18 |
| `engineRead` | D7, F06 (expensive reads done ahead of time) |
| `moveGrade` | G1-G9 |
| `marks` | S10 |
| `render` | V1, V2, V8, V9, V16, S13 (templates per language) |
| `surfaceMode` | F2, S1-S9, S11 |
| `record` | R1-R4, F9, F13, F17, V6 |

The only live code touched in P0 is the lines named there; every later phase deletes what the new part replaces.

## design:2 (data model: the one fact type every computer emits (with squares, stakes, role, verb))
**ONE COACH: design through the data-model lens (≈890 words)**

**The problem.** Today a fact takes five different shapes:
- `VoiceFact` (voicePackage.ts:95)
- `ClauseItem` (positionFacts.ts:347)
- `TeachingHint` (learnBoardTeaching.ts:66)
- `DepthClause` (thinkAloud.ts:191)
- Review's `[tag]` strings

The decider takes `facts: readonly string[]` and keeps squares and stakes in side maps keyed by the sentence text (coachDecider.ts:134, :140, :155). So say-once, merging duplicates, arrows and the record all match on wording. That is the shared cause of the repeats, the 7-of-64 arrow coverage and Learn and Review disagreeing.

**1. The fact type — `src/coach/fact.ts` (new)**

```ts
type Fact = Brand<{
  id: ClaimId;            // kind:seat:sortedSquares[:lineHead] — made only by makeFact()
  kind: FactKind;         // the one vocabulary (reviewFacetRank.ts:265, grown)
  role: ChainRole;        // changed|goal|reason|obstacle|remove|tempting|line|habit|knowledge|describe
  verb: F01Verb | null;   // recognize|identify|plan|prevent|strategize|consequence|geometry|knowledge
  seat: 'student'|'opponent'|'none';
  fen: string; altFen?: string;
  squares: {sq: Square; mark: 'target'|'hole'|'outpost'|'weak'|'key'}[];
  moves: {from, to, san, arrow: ArrowRole, vouchedBy?: 'engine'|'book'}[];
  lines: {fen: string; uci: string[]; replyNamed: boolean}[];
  stakes: FactStakes | 'none';               // factStakes.ts:27, required
  links: {rel: 'so'|'but'|'first'|'then'; to: ClaimId}[];   // F0b
  evidence: {tag: CapabilityTag} | {na: NaReason};          // F5: required
  terms: TermId[];        // V18
  read: ReadKey | null;   // D7: which shared engine read it came from
  payload: PayloadFor<kind>;   // typed data, NO prose
}>
```

- **Facts carry no text.** One renderer per kind (`Record<FactKind, Renderer>`) produces `{words, marks}` together. A sentence and its arrows can never come apart, and nothing ever reads prose back.
- **One table per kind.** `src/coach/factTables.ts` holds `Record<FactKind, {roles, verb, layer, capability|na, renderer}>`. It absorbs `FACT_ROLE`/`CLAUSE_ROLE` (reviewFacetRank.ts:267), teachingLayers and computerRoles.
- **Roles.** `FacetRole` today is binary teach/describe (:159). It becomes the seven F0c roles plus `knowledge` and `describe`.

**2. The chain**

engine read → producers → `decide` → `composeChain` → render → marks → ledger + record.

- **Engine read — `src/coach/engineRead.ts`.** One read, keyed on (4-field FEN, depth reached, MultiPV). Both the singleton (stockfishEngine.ts:1381) and the pool (gameAnalysisService.ts:708) feed it, with the Dexie cache behind it.
  - Absorbs `stockfishCache` (its key `fen::depth` ignores MultiPV) and `hooks/stockfishFenCache`.
  - Every option is set and restored per search.
- **Producers.** Every computer returns `Fact[]`. `computePositionFacts` (positionFacts.ts:1050) becomes the single collector for every surface. Review stops calling `decide` directly (coachFeatureService.ts:2308) and goes through it too.
- **Grader.** One grader writes one verdict per move (G7): `gradeMove` plus the mate and brilliancy rules from `classifyCpLoss` (gameAnalysisService.ts:252). Its output is facts: `tempting` (the move played) and `line` (the refutation).
- **Decider.** `coachDecider.decide` takes `Fact[]`. It merges two facts when their ids or square sets coincide, orders by stakes, and a red tag raises a fact. It also absorbs:
  - `learnTurnDoor.decideTurn` (:319)
  - the `voicePackage` keep/order step
  - the `playCommentary` ladder (:652)
  - Review's pre-gates (coachFeatureService.ts:1487-1727)
- **Composer — `src/coach/chain.ts`.** It slots the surviving facts by role in F18 order: what their move changed → candidates (tempting, each with the `but` that kills it) → first this → the line, with their reply → the habit. It joins them with `links`. `thinkAloud.depthClauses` and `deliberation` become producers. A fact that fills no role and has no verb is cut (F01, F0c).

**3. Memory**

- **Per game — `src/coach/gameLedger.ts`.** Keyed by `ClaimId`, holding the squares. A computed `changed(fact, prev)` verdict re-opens a claim when its state changes (V13). It replaces all 15 memory owners: `learnMemory` (learnMemory.ts:52), `standingFactMemory`, the 28 Review sets, `saidRef`, and the rest.
- **Per student.** A Dexie store of terms and ideas (V18, spaced repetition of ideas). Migration per R6.

**4. Arrows**

- `factMarks(fact, spokenUpTo)` returns `ArrowClaim`s with `source: 'fact'` and feeds them to `arrowDoor.admitArrows` (arrowDoor.ts:187). A new highlight door works the same way for squares.
- A line is drawn one ply at a time, in step with the words (S10, item 6).
- Deleted: the five resolvers that read prose (`namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, `VoiceChatMic.extractArrows`) and `MAX_GREEN_ARROWS_PER_PLY`.

**5. Surface modes**

`SURFACE_CONTRACT` (coach/surfaceContract.ts:30) becomes the only input a surface gives:
- It gains `posture`, `tense`, `withholds` and `delivery` fields, plus entries for `play`, `tactics` and `openings`.
- Every field is required and every one is read.
- The walk/interrupt literals at 6 sites, the 5 extra register enums and `PLAY_VOLUNTEERS_COACHING` are deleted.

**6. Build order (each phase ships on its own)**

Weighed three ways:
- **Risk-first** says fix the engine key first.
- **Smallest slice** says adapters first.
- **Student first** says arrows and the gem.

The combined order:
1. **P0 — type and adapters.**
   - Ship `Fact`, `makeFact` and the `fromClauseItem` / `fromHint` / `fromDepth` / `fromVoiceFact` adapters, with a temporary `legacyText` field.
   - `decide` takes `Fact[]`.
   - Fix the engine cache key (a one-line correctness fix).
   - Build the **pin broken with tempo** computer as a native `Fact`: payload, a role (`reason` / `line`), a capability tag, and the full line `Bxf7+ Kxf7 Ng5+ Ke8 Qxg4`. It proves the shape end to end on the first gem.
   - Proof: recorded tapes come out identical.
2. **P1 — arrows from facts on Learn.** Adds an arrow-coverage emitter.
3. **P2 — `gameLedger`.** Delete the 15 memory owners.
4. **P3 — `engineRead`.** Pool and singleton merged.
5. **P4 — composer.** Review moves onto the collector. Deliberation is unlocked before move 10 (positionFacts.ts:463).
6. **P5 — decider absorbs the other doors.** `learnTurnDoor`, `voicePackage` and `playCommentary` fold into `decide`; the ~114 `groundedAnswer` chat assemblers emit facts.
7. **P6 — renderers own all text.** Delete `legacyText` and the prose resolvers.
8. **P7 — one grader and one record reader (R4).** Delete `classifyEvalSwing`, `detectGreatMove`, `gradeGuess`, `classifyMoveQuality` and the dead tactical profile.

**7. Tests that make the old shape impossible**

- `Fact` is branded, so only `makeFact` can build one. A `string` passed to `decide` fails to compile.
- The `Record<FactKind,…>` table is exhaustive, so a new kind fails to compile until it has a role, a verb, a capability (or an `na` reason) and a renderer.
- A renderer property test: every move the words name appears in `marks`.
- `fact.gate.test` (scans by statement, like `corpusScope.test.ts`) fails on:
  - an import of a prose resolver,
  - a `new Set<string>` said-memory under `components/Coach` or `services/review*`,
  - `analyzePosition` outside `engineRead`,
  - a centipawn band outside the grader.
- A dual-use test: every kind is either recordable or names its `na` reason.
- A seat test: a `student`-seat fact never renders for the other seat (V16).

**8. Rules each part satisfies**

| Part | Rules |
|---|---|
| Fact type | F3, F5, F6, F7, R5, V16, D9, D10 |
| Kind tables | F0c, F01, F4, R5 |
| Composer | F0, F0b, F18, V7, S3 |
| Decider | D1–D5, D11, G9, F06, V14, V15 |
| Ledgers | D6, V13, V18, R1–R3 |
| Engine read | D7, F12/F13 inputs |
| Marks | S10, V18 |
| Contract | F2, S1, S2, S4, S5, S11 |
| Grader | G1, G7, G8 |

**Rule-breaking text in files P0 leaves alone.** `inaccuracyCall.ts:729-735` and `opponentGap.ts:87-88` still speak in the first person ("from me", "I let you off"), against V1. The fix belongs in P6, when their renderers are rewritten.

## design:3 (the one composer that turns ranked facts into one thinking chain)
**ONE COACH: the composer lens (one fact type → one decider → one thinking chain)**

**1. The fact type, `CoachFact` (new file `src/services/coachFact.ts`)**
`{ id, kind: FactKind, role: ChainRole, seat, fen, squares, lines: SpokenLine[], stakes: FactStakes, links: {so?, but?, first?: id}, vocab: tag, posed?: {question, answerSan} }`
- `id` is the claim key: kind + squares + seat. Today the code has about 12 key shapes, and the said-once memories match on prose (map-brief:316).
- `squares`, `lines` and `claims` already exist on `VoiceFact` (voicePackage.ts:95-145). `stakes` already exists as `FactStakes` (factStakes.ts:27). `ClauseItem` (positionFacts.ts:347) and `DepthClause` (thinkAloud.ts:191) already carry squares, lines and stakes. So most computers convert by adapter, not by rewrite.
- **The fact carries no finished sentence.** Words come from one typed renderer: piece, line, move-with-consequence, seat word, kid mode with no notation.
- `ChainRole` is one of: name | changed | goal | reason | obstacle | remove | tempting | line | their | habit | knowledge.
- `ROLE: Record<FactKind, ChainRole>` replaces two tables: the binary teach/describe `FACT_ROLE` (reviewFacetRank.ts:159,267) and Learn's `DNA_BEAT` (learnTurnDoor.ts:122). Because it is a `Record`, a new kind fails to compile until someone gives it a role.

**2. The chain composer (`thinkingChain.ts`)**
- `compose(selected: CoachFact[], mode, ledger) → Thought`
- It orders the facts in F18's sequence: changed → tempting + why it fails (its line) → "not yet, first this" (remove) → the line, with their reply → their recurring tendency → habit. A goal or obstacle opens the chain when there is no "changed" fact.
- Links between facts become words: `so` (reason), `but` (tempting / obstacle), `first` (remove). The wording rotates on a stable key (ply + claim id hash), never `Math.random`.
- A fact that fills no role, or arrives with no link and no stakes, is refused (F0b, F0c).
- **Brief** keeps the highest-value whole links. Today's `applyBriefVoiceCap` cuts by sentence instead (map-brief:312).

**3. The decider: `coachDecider.decide`, kept as the only door**
- `FactBundle.facts` changes from `readonly string[]` (coachDecider.ts:133) to `CoachFact[]`.
- Steps, in order:
  1. importance and need, with a need step that knows the posture (today the need veto ignores posture: coachFeatureService.ts:2320-2340);
  2. subsume by claim id, replacing the text-overlap check;
  3. floor;
  4. order by stakes;
  5. hand the survivors to `compose`.
- The audit row (D9) gains the role of each fact and the chain's shape.

**4. Memory**
- **Per game:** one `GameLedger` keyed by claim id, carrying squares and a state hash. A "something changed" check re-opens a fact (V13). It replaces about 16 owners: learnMemory, standingFactMemory, about 28 Review sets, saidRef and others (census B §2).
- **Per student:** a persistent `TermLedger` in a new Dexie store, added with a version bump and a migration (R6). It holds which terms have been taught and which the student has shown they understand (V18).

**5. Engine read**
- One `EngineRead` keyed on (4-field FEN, depth actually reached, MultiPV), shared by the singleton and the pool (census C §1).
- Fact computers consume it; they never search on their own. This is what stops Review saying both Bf5 and Bxf3 at the same position (D7).

**6. Arrows**
- `marksFor(thought)` reads `fact.lines` and `fact.squares` only, and sends them through `arrowDoor.admitArrows` (arrowDoor.ts:187).
- One arrow per spoken move, timed to its segment and drawn from where the piece will be once the line is walked. All arrows clear at the end of the idea (S10).

**7. Surface modes**
- `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes the only place a surface is declared. Today only `registerFor` is read, from three call sites.
- Each surface declares: tense, posture, which roles it withholds, and when it speaks.
  - **Review:** withholds the tempting move and the line until the student taps the board.
  - **Learn:** names the move only at a deciding moment or where the student's own record says they go wrong (S3).
  - **Play:** speaks only when asked.
  - **Kids:** the notation-free renderer.

**Which existing files become which part**
- **"Changed":** `moveInsight` `theirMoveChanged` (:573).
- **Obstacle:** one threat fact, merged from `detectNewThreat` and `computeMustDefend`, with the signed exchange count (not the floored one) so a defended piece hit by a pawn counts (compare-1 #1).
- **Tempting + reason:** `deliberation` (:144) and `refutedAlternative`. Turn deliberation on before move 10; it is off today (positionFacts.ts:463,480), which goes against F02.
- **Remove / line / their:** `thinkAloud.depthClauses` (:226). These are already typed.
- **Goal:** `structurePlan` and `deriveNextPlans`. The game thesis is `teachingSelector`.
- **Habit:** `methodBeat`.
- **Knowledge:** `conceptEngine` definitions.
- **Name:** `openingIdentity` and `openingAnnouncement`.
- **The producer harness:** `positionFacts.computePositionFacts`. It computes everything and keeps everything (F06).
- **The board-truth check:** `buildVoicePackage` (D10).

**What gets deleted**
- `learnTurnDoor` (`LEARN_LANES`, `DNA_BEAT`), with the `always` safety floor moving into the decider.
- The `playCommentary` ladder.
- voicePackage's fixed `RANK`.
- The dead `rankFacets` (reviewFacetRank.ts:434).
- Review's dead capped cascade (coachFeatureService.ts:2532-3395).
- The five prose→arrow resolvers: `namedMoveArrows`/`segmentNamedArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, and VoiceChatMic's tags.
- The per-surface say-once sets.
- About 40 piece-name tables, folded into the one renderer.

**Build order (each phase ships on its own)**
- **P0:** add `CoachFact`, the `ROLE` Record, and adapters from ClauseItem, DepthClause and VoiceFact. No behaviour changes.
- **P1:** compose on the "read this position" tap (positionReadComposer.ts:130). It is a single tap-only file of 190 lines, the lowest-risk proof. Then the Learn walk read (CoachTeachPage.tsx:9692), the same door. This is the first change David hears.
- **P2:** the `GameLedger`, plus the `EngineRead` key fix (MultiPV and depth reached).
- **P3:** arrows from facts on Learn. Delete Learn's prose resolvers.
- **P4:** Review. `computeMoveFacets` (reviewFullData.ts:242) emits CoachFacts. Delete the cascade and `segmentNamedArrows`.
- **P5:** Learn's live turns move onto `decide`. Delete learnTurnDoor and playCommentary.
- **P6:** chat assemblers, Tactics refutations, Openings and Kids return CoachFacts.
- **P7:** the persistent `TermLedger`.

**Tests that make the old shape impossible**
- **Types:** `decide` accepts only `CoachFact[]`, so a string fails to compile. The `ROLE` Record is exhaustive. `seat` is a required field.
- **`chainLinks.test`:** every composed link after the first has a `so`, `but` or `first` edge (F0b).
- **`noProseArrows.gate`:** the resolvers can't be imported outside the renderer. Arrow coverage is emitted on every line: named moves arrowed 100%, wordless arrows 0.
- **`oneLedger.gate`:** no new `Set<string>` whose name means said or spoken, anywhere in coach paths. It blames by statement, the same way corpusScope.test works.
- **`surfaceContract.gate`:** every surface reads `contractFor`.
- **Deleted-module gate:** learnTurnDoor and playCommentary may not reappear.
- **Determinism gate:** no `Math.random` in coach paths.
- **Negative controls:** the 6.h3 bishop-hit position must produce an obstacle → remove chain.

**Which rules each part satisfies**

| Part | Rules |
|---|---|
| `CoachFact` / `ROLE` | F0c, F7, R5 |
| Composer | F0, F0b, F18, V12, V13, V15 |
| Decider | D1–D5, D9, D11, F06 |
| Ledgers | D6, V18 |
| `EngineRead` | D7 |
| Arrows | S10 |
| Contract | S1–S5, S11, V16 |
| Renderer | V1, V2, V8, V9 |
| Facts carrying `posed` | F5, R1 |

**The three weighings**
- **Risk-first** puts the engine-key fix in P2: an honest chain built on two engines that disagree still lies.
- **Smallest slice** is P1 on the tap.
- **The student's experience** argues for Learn's walk read straight after the tap: that is where 6.h3 went silent in both games.

## design:4 (the deciding computer: ranking by consequence (D11) and the student record)
The deciding computer: one coach that ranks every fact by its consequence and by the student's own record

**The core defect.** `coachDecider.decide` (coachDecider.ts:297) is already close to D1. It has an importance gate, a need gate, a board veto, subsumption, a stakes-valued order and a closing method beat. But it decides over prose. `FactBundle.facts` is a `string[]` (:133). A fact's kind is read back out of a `[tag]` prefix (reviewFacetRank.ts:339), and the student's record can only arrive pre-matched (`momentBoost`, `holeByFact`, :63-126). Its stakes are material or mate only (factStakes.ts:27-33). An unstaked fact (structure, plan, a drawback) ranks below every staked one (reviewFacetRank.ts:352-365). So D11 can't be expressed. A defended bishop hit by a pawn has no stakes, because the SEE is floored at 0 (positionReadingService.ts:212-215). That is why 6.h3 went silent on both tapes (compare-1 #1).

## Architecture

**1. `CoachFact`, one typed shape that every computer emits.** Fields:
- `claimId`: kind + squares + seat
- `kind: FactKind`, the existing union (reviewFacetRank.ts:266)
- `role: ChainRole`: goal | reason | obstacle | removeIt | tempting | line | habit | knowledge
- `seat`, `squares`, `moves` (a UCI line)
- `consequence: Consequence`
- `recordTag: MisconceptionTagId | null`
- `render`: a key into the typed renderers

There is no text until after the decision.

**2. `consequence.ts`.** This is D11 made computable. It replaces `factStakes.ts`. `Consequence` holds:
- what is at stake, by kind: material, mate, square, structure, tempo, king or castling
- the points at stake
- the plies until it lands
- `usable`: can the opponent reach the square within N plies, or does the engine's best line go there
- `lasts`: does it persist, e.g. is the backward pawn on a file they can pile onto
- `costs`: the signed `legalSeeGain` (positionReadingService.ts:242) plus `exchangeLedger.proofCut` (:314)

A drawback that isn't usable scores 0 and stays unsaid but is kept (F06). `Record<FactKind, ConsequenceRule>` makes every kind declare how its consequence is measured, so it can't compile otherwise.

**3. `StudentRecord.read(tag)`.** One reader (R4). It returns `{state: red | green | grey, streak, games, provenance}`. `capabilityProven` (capabilityEvidence.ts:265) is the only green rule. The heat map, needScore, Up next, Tactics and Weaknesses all read it. It is raise-only (R3). The four absence-lowering rules go: lifecycle `fixed`, curriculum `mastered`, the dossier, and the trend. Spine holes gain a `capabilityTag`, so red and green finally join.

**4. `decide(moment, facts: CoachFact[], record, mode)`.** The one door. Its steps:
- **Board veto.**
- **Subsume by `claimId`**, then Jaccard on the fact's own squares (D4).
- **Value:** `consequence × 0.8^plies`, plus the student's raise from `record` joined on `recordTag`. This is the join done in the door on structured data. It replaces `momentBoost` and `holeByFact`. Small consequences rise as the record shows strength (F03).
- **Whether to speak:** importance plus need (D2). Under `mode.posture === 'walk'`, which covers Learn live, Review and Watch, importance sets how much is said and never whether the move gets a turn (D3, V11).
- **Fill the chain roles in F18 order** from the top-valued facts.
- **Method last.**
- **`askDecider`** (F05): asks only when the record shows a red streak over N games.
- **Emit** one row of chosen, quiet-with-reason and roles (D9).

**5. `GameLedger`.** One said-ledger per game, keyed by `claimId` (D6, V13). A consequence delta or a squares delta re-opens a fact. A persistent `TermLedger` per student covers V18.

**6. `engineRead(fen4, depthReached, multiPV)`.** One cache shared by the singleton and the pool (D7). Consequence's `usable` and the tempting/line roles read only from it.

**7. Arrows.** Arrows are drawn from `fact.moves` and `fact.squares` and go to `arrowDoor.admitArrows` (arrowDoor.ts:187), one arrow per spoken move (S10). Prose is never parsed for arrows.

**8. Surface modes.** `SURFACE_CONTRACT` (surfaceContract.ts:30) gains a posture field and a `play` entry. The decider reads `contractFor`, which has no readers today. The `'walk'/'interrupt'` literals at the six call sites go (S1).

## Which files become which part
- **The door:** coachDecider.ts, with factSelector.ts as its subsumption step and narrationImportance.ts as its importance step.
- **Consequence:** factStakes.ts, plus threatOut.ts:71 and exchangeLedger.
- **Record reader:** capabilityEvidence.ts, heatMap.ts, weaknessSignalLoader.ts and studentRecord.ts (the duplicate `loadProvenTags` merges into one).
- **Roles:** `DNA_BEAT` (learnTurnDoor.ts:117) and `FACT_ROLE` collapse into one exhaustive `FACT_CHAIN_ROLE`.
- **GameLedger:** learnMemory.ts plus standingFactMemory.

## What gets deleted
- learnTurnDoor's `LEARN_LANES` lead, `DESCRIPTION_LEAD` and `BEGINNER_ALWAYS` (:98-316)
- `voicePackage.RANK` (:193)
- the `playCommentary.buildPlayCommentary` ladder
- Review's pre-gates (coachFeatureService.ts:1487-1727) and the dead capped cascade (:2532-3395)
- the dead `rankFacets`
- the 15 per-surface say-once memories
- the legacy `computeWeaknessProfile` readers
- the dead `tacticalProfileService`
- the 5 prose-to-arrow resolvers

## Build order (each phase ships alone)
- **P0, the smallest risk-first slice.** A signed SEE and a "cheaper attacker / defended but losing" consequence, fed into today's `decide` through the existing `stakes` map. Proof: Scandinavian 6.h3 and 22.Qe4 speak. A test on that FEN fails on the old floored SEE (B4).
- **P1.** `CoachFact` plus `claimId`, with `decide` taking facts. A string shim stays for unmigrated callers, and every use of it is logged.
- **P2.** Learn onto the door: delete `decideTurn` ranking and `voicePackage.RANK`, make Learn `walk` (D3), and fix the lines dropped by queue-on-next-move (CoachTeachPage.tsx:10155).
- **P3.** Review onto the door: delete the pre-gates and the cascade, and give the need step a posture (coachFeatureService.ts:2320-2340).
- **P4.** `StudentRecord.read` with one green rule, then `GameLedger` and `TermLedger`.
- **P5.** The chain composer over roles, plus the arrow adapter.
- **P6.** Chat's grounded answers, Tactics (puzzleMethod), Kids mode and Play-on-ask go through the door.

**Student experience first.** P0 changes what David hears first: a warning on the move his bishop is hit. **Risk first.** P1 keeps the string shim, so no surface breaks on the day the type lands.

## Tests that make the old shape impossible
- `decide(facts: readonly CoachFact[])`. A `string[]` fails to compile once the shim is removed at the end of P6.
- `Record<FactKind, ConsequenceRule>` and `Record<FactKind, ChainRole>` are exhaustive.
- **Gate scan:** no surface imports `selectFacts`, `computeImportance`, `decideTurn`, `buildPlayCommentary` or `voicePackage` ordering. This extends `coachDecider.test.ts`.
- **Gate:** a fact with role `teach` must carry a consequence or the `knowledge` kind. Nothing falls below the floor by accident.
- **Gate:** `isWeakness` and `isProven` exist only in StudentRecord. A grep bans `lifecycle === 'fixed'` in any lowering path.
- **Ledger test:** the same `claimId` is said twice only after a consequence delta.
- **Arrow coverage:** every `fact.moves` that is spoken is arrowed, and no arrow lacks a fact.
- **D3 test:** a `walk` posture never closes a row on importance. This already exists as an audit contract; it becomes a unit test.

## Rules each part satisfies
| Part | Rules |
|---|---|
| CoachFact | F0c, F4, R5, S10 |
| Consequence | D11, D5, F06, F01 (CONSEQUENCES), D10 |
| Decider | D1, D2, D3, D4, D9, F2, S1, V14, V15 (Brief keeps the highest values, not the first beats; learnTurnDoor.ts:433) |
| Record | R1–R4, F9, F03, F10, F17 |
| Ledgers | D6, V13, V18 |
| Engine read | D7, F13 |
| Arrows | S10 |
| Surface modes | S1–S9, S11 |

**Open questions for David (B6).**
1. How many plies ahead `usable` looks. I propose the engine's best line, else 2 plies.
2. Whether a green record may quiet a fact worth up to 1.5 pawns that lands now. That is today's `GREEN_QUIET_BELOW` (coachDecider.ts:129); D11 says it should grow with the student.

## design:5 (one memory per game)
**One coach, designed around one memory per game**

**The architecture (five parts, one path, every surface)**

1. **`CoachFact`**, the one fact type: `{ claimId, kind, role, seat, squares, moves/lineUci, stakes, stateKey, render() }`.
   - The roles are GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE and HABIT (F0c).
   - `claimId` is `kind:sortedSquares:seat`, made only by `claimOf(fact)`, never from prose.
   - `stateKey` is a digest of what makes the claim true right now: the attacker/defender count, the stake, the pinned piece's value.
   - This grows out of `VoiceFact`, which already carries `claims`, `squares` and `lines` (voicePackage.ts:95-145).
2. **`EngineRead`**: one cache keyed on the 4-field FEN, the depth reached and MultiPV, shared by the singleton and the pool (D7, map-brief §Engine reads).
3. **`decide()`**: extended from `coachDecider.decide` (coachDecider.ts:297). It runs importance, need, subsume (D4), floor, order (D5), then **ledger**, then a role assignment.
4. **`composeChain()`**: puts the kept facts in F18 order (what changed, tempting choices, not-yet, the line, the habit). It grows out of `thinkAloud.depthClauses` (thinkAloud.ts:226).
5. **Marks come from facts.** `factToClaims(fact)` feeds `arrowDoor.admitArrows` (arrowDoor.ts:187), plus a new highlight door. No resolver reads prose (S10).

**Surface modes.** `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes the only place a surface differs: its register, what it withholds, and when it speaks. Today only `registerFor` has readers. Play gets its own row and its silence moves into the table (CoachGamePage.tsx:281). Kids becomes a row (S1, S11).

**My lens: one memory per game**

`GameLedger` (new file `services/gameLedger.ts`, a leaf with no imports):
- `gameId`: minted once by the surface session. `newGame()` is the only reset.
- `said: Map<ClaimId, { ply, stateKey, squares, depth: 'full' | 'fact' | 'refrain' }>`.
- `pending`: one slot for a withheld answer. It replaces `gemPending`, `heldMove` and `slipAnswer` (learnMemory.ts:57-70).
- `credited`: ideas the student found on their own. They feed V6 praise and lines like "the same fork you found on move 9".
- `motifFirst` (from motifLedger.ts:31), `slipsThisGame`, `promises`.

The ledger's verdict, made inside `decide()`, has three outcomes:
- **New claim**: say it in full.
- **Same claim, same `stateKey`**: quiet, with reason `said-already`.
- **Same claim, changed `stateKey`**: reopen it, said in the shorter refrain form (full, then the fact, then a refrain), with its squares re-highlighted.

That is V13's "unless something changed" as a computed verdict. It also gives V12 its stable rotation key: how many times this claim has been said. The reference coach's refrain ("rule, 'there it is again', cue, silence") is standingRefrains.ts:236 rebuilt on facts instead of a regex over finished sentences (teach-brief.md:473).

`StudentLedger` (new Dexie store, schema v40, additive only, R6) holds the term and idea memory that has to survive between games:
- V18: whether each term has been taught and whether the student has shown they understand it.
- Brief item 3d: when an idea was taught and when it is due again.

Today `newGame()` clears `conceptTaught` (learnMemory.ts:257-266), which is why the pin definition repeated word for word in the next game (compare.md:89).

**The three weighings**

- **Student experience.** Repeats were 9 of the 52 walk errors (RULEBOOK D6 note). Three cases come from the tapes:
  - the pin definition said again in game 2;
  - `threatStronger` fired twice in a row (speedRunReads.ts:157);
  - the review re-said "your answer was d4…" (compare.md:433).
  Each one becomes impossible once identity is the claim rather than the wording.
- **Risk.** There are about 15 owners today, keyed on four different "new game" signals: plies (learnMemory.ts:273), fullmove (standingFactMemory.ts:57, coachGameEngine.ts:436), `gameId` (useLiveCoach.ts:166), and per-call scope (coachFeatureService.ts:1487). Three steps keep this safe:
  - Phase 1 points the old sets at the ledger, so behaviour stays the same and can be measured before anything is deleted.
  - Keys come from computers, and a claim with no squares is never folded together with another (as with today's subsumption).
  - `voicePackage`'s sentence ledger (`sayKey`, :408) stays as a backup until the gate in Phase 4 lands (F7).
- **Smallest slice that ships.** Learn only, two owners: `learnMemory` plus `standingFactMemory`. This also removes the `takeDefinition` double ledger (CoachTeachPage.tsx:7752-7758).

**Which files become which part**
- `learnMemory.ts` becomes `gameLedger.ts`, keeping `mintGameId` (:210).
- The `claims` field of `VoiceFact` becomes `CoachFact.claimId`.
- `motifLedger.ts` becomes a ledger slice.
- `standingRefrains.ts` becomes the refrain renderer.
- `factSelector`'s `said.has(text)` check (factSelector.ts:265) becomes the ledger verdict.

**What gets deleted**
- `standingFactMemory.ts`.
- About 28 sets in `coachFeatureService` (1487-1727).
- The CoachTeachPage refs (census B §2.3).
- `useLiveCoach` `saidRef` (:162).
- The fullmove-backwards reset in coachGameEngine.ts:430-437.
- The two `saidHabitsRef` copies (PuzzleBoard:183, MistakePuzzleBoard:184).
- `usePhaseNarration` `spokenKeys` (:304).
- The prose `sayKey` ledger.
- The three dead exports: `rankFacets`, `buildThreatCheckQuestion`, `contractFor`.

**Build order (each phase ships on its own)**
1. **Ledger in Learn.** `GameLedger` and `ClaimId` go in. learnMemory and standingFactMemory both write through to it. Taught terms persist to `StudentLedger`. *Shippable: no repeat of a definition across games.*
2. **One fact type in Learn.** Learn lanes emit `CoachFact`, and `decide()` replaces `learnTurnDoor.decideTurn`'s say-once logic. Arrows come from facts.
3. **Review on the same ledger.** Review moves onto the ledger plus `decide()` and deletes its 28 sets. The structured refrain replaces the regex fold. `pending` drives the ask-before-tell (S4).
4. **Everything else in the game.** Chat, read-position, Why?, phase narration and Play-on-ask share the same ledger for that game, so chat stops repeating what the live voice already said (map-brief §memories).
5. **The chain on top.** `composeChain` runs over the kept facts on every surface. The EngineRead merge happens here too.

**Tests that make the old shape impossible (F7)**
- `ClaimId` is a branded type only `claimOf()` can make. Prose cannot be passed as a key, so this fails to compile.
- `gameLedger.gate.test.ts`, a source scan, fails if:
  - any coach surface declares a `Set` or `Map` named `*said*`, `*spoken*`, `*seen*`, `*taught*` or `*announced*` outside the ledger;
  - any reset is keyed on plies or fullmove.
- A test reads the same pin across two games: it is defined once, and redefined only when `StudentLedger` says it is not understood.
- A same-claim/changed-state test: the attacker count goes from 2 to 3, the claim reopens as a refrain, and its squares are drawn.
- `algoAuditContract` gains a row: every quiet fact names `said-already` or `reopened` (D9).
- An Expansion test: a new `CoachSurface` without a ledger scope fails to compile (`Record<CoachSurface,…>`).

**Rules each part satisfies**
- Ledger: D6, V13, V12, V18, V6, F05 (only through `pending`), D9.
- `CoachFact`: F0c, S10, D4, R5.
- `decide()`: D1, D2, D3, D5, F06.
- `composeChain`: F0, F0b, F18.
- `EngineRead`: D7, G7.
- Surface contract: F2, S1, S5, S11.
- Additive Dexie store: R6. Ledger writes batched: R7.

**New, for David to decide (B6)**
- A cross-game "you played this here last time" read (F18 step 2).
- Using the idea-level spacing schedule to decide when a taught idea is brought back.

Inputs: `/home/user/wt-work/RULEBOOK.md`, `/home/user/wt-work/docs/plans/2026-10-07-duplicate-census.md`, `/home/user/wt-work/docs/plans/swarm-inputs/digests/{map-brief,teach-brief,compare}.md`

## design:6 (one engine read per position)
# ONE COACH — designed around one engine read per position

## Architecture

**1. The engine read, the one door (new `src/services/engine/`).**
- `readPosition(fen, need: {minDepth, minLines, budgetMs, priority}) → PositionRead`.
- `PositionRead` = `{key: 4-field FEN, lines[{uci[], cp|mate (always signed from White's side), wdl}], depthReached, multiPv, source}`. The key uses `evalCacheKey` (positionEvalCache.ts:48).
- Lookup is monotonic. A stored read answers a request only when `depthReached ≥ minDepth` and `lines ≥ minLines`. Otherwise the engine searches deeper or wider, and the stored read only ever gets better.
- Storage: an in-memory LRU, with Dexie behind it (cache C, extended to hold lines and WDL).
- Both backends implement `EngineBackend.search(fen, {depth, multiPv, budget})`:
  - **The singleton.** MultiPV is set and restored inside each search. Today `setMultiPv` persists on the worker (stockfishEngine.ts:2091). It is called around the search at CoachGameReview.tsx:934/938 and CoachTeachPage.tsx:9431/9434, and passed as a per-call option at coachAnswerGates.ts:400.
  - **The pool.** It must report WDL, the full PV and a signed mate. Today it pins MultiPV to 1 (gameAnalysisService.ts:772), cuts the PV at 8 plies (:485) and returns `mate: null` (:948).
- The opponent's move choice (`getBestMove` at a skill level, stockfishEngine.ts:1789) stays outside this door. It is random on purpose (F6) and it is not a reading.

**2. Derived engine facts, each computed once per `PositionRead`.**
- Grade: `gradeMove` (accuracyService.ts:122), plus Best/Excellent, only-move Great from the gap in win %, and Miss.
- Criticality: one gap computer replaces five (scanCriticality criticalityScan.ts:103, readCriticalMoment criticalMoment.ts:164, choiceGap, sharpGap, gap12).
- One "is the game already decided" gate.
- The line: `computePvLine` (pvPlayback.ts:529) reads stored lines instead of searching again.

**3. The fact type `CoachFact`.**
- Fields: `{claimId: kind+squares+seat, role: GOAL|REASON|OBSTACLE|REMOVE_IT|TEMPTING|LINE|HABIT, kind, seat, squares[], lineUci[], stakes{cp, plies}, readRef{key, depthReached}}`.
- Every field is required.
- Every computer takes `(read: PositionRead, board, record)` and cannot call the engine itself.
- The extended `VoiceFact` (coachDecider.ts:140 already carries squares) becomes this type.

**4. The chain composer `thinkChain.ts`.**
- Built from `depthClauses` (thinkAloud.ts:226) and the weighing in `deliberation`.
- It orders the roles in the F18 order: what their move changed, the candidates and why each fails, "not yet, first this", the line with their reply, the habit.
- Remove the deliberation gate for the first 9 moves (positionFacts.ts:463), because it silences opening weighing and the opening is the priority (F02).

**5. The decider.**
- `decide` (coachDecider.ts:297) is the only one. Its need step becomes posture-aware.
- Absorbed into it: `decideTurn` (learnTurnDoor.ts:319), voicePackage's fixed rank, playCommentary's ladder and the second teachingSelector run.
- Chat intents go through the same door.

**6. Memory.**
- One per-game `gameLedger` keyed by `claimId`, holding the squares too.
- It replaces about 20 say-once owners (learnMemory.ts:265, standingFactMemory.ts:57, …).
- A fact speaks again when its `stakes` or `squares` change.

**7. Arrows.**
- Drawn from `fact.lineUci` and `fact.squares` only, through `admitArrows` (arrowDoor.ts:187), one arrow per spoken move.
- The resolvers that re-read the prose to find moves are deleted.

**8. Surface modes.**
- `SURFACE_CONTRACT: Record<Surface, {tense, posture, withholds, channel, enginePriority}>` is required, so a new surface does not compile until it fills it in.
- Play, Openings, Tactics and Kids are added.
- `enginePriority` controls only how deep and how fast a read is. It never changes the truth of a read.

## Why the engine read sits at the bottom (my lens)

Every downstream disagreement is two different reads under one FEN:
- Learn picked f5 and Review picked h5 at the same position (compare G3).
- The Bf5/Bxf3 contradiction (D7).
- False only-move calls after a puzzle solve: the narrowed MultiPV leaks into later searches, so criticalityScan.ts:122-125 sees no runner-up and sets the gap to Infinity.

Two further faults:
- A budget-stopped read is cached under the depth that was asked for (stockfishEngine.ts:1613, 2285-2286).
- Cache B (stockfishFenCache.ts:22) ignores depth entirely, and 8 files use it.

Once every fact carries a `readRef`, two parts of the coach cannot disagree, because they hold the same read. That is F7: the mistake becomes impossible, not caught afterwards.

**Weighed three ways:**
- **Risk-first:** Phase 0 changes no wording. It only stops wrong reads from being stored or served.
- **Smallest slice:** Phase 0 is three fixes and their tests.
- **Student experience:** Phase 0 already removes the contradictions and the false "only move" calls. Phase 4's prefetch removes the roughly 7-second wait to start a Review.

## What gets deleted

- `hooks/stockfishFenCache.ts`
- `stockfishCache.ts` (folded into the read store)
- `setMultiPv` as a public method
- `queueAnalysis` (stockfishEngine.ts:1892, a second serialization on top of the brain mutex)
- the three move scorers (SINGLETON_SCORER, deepScorer, the pool's) → one
- enginePlanContext's two read paths
- Direct engine calls in the 48 files that make them today → zero

## Build order — every phase ships on its own

| Phase | Work |
|---|---|
| **P0 Correct reads** | Cache by the depth actually reached. Put MultiPV in the cache key and set/restore it per search. Make the pool report WDL, the full PV and a signed mate. |
| **P1 One door** | Build `readPosition` and the backends. Move Review and Learn first, then chat, Play-on-ask, Openings, Tactics and Kids. Delete cache B. |
| **P2 One grade and one criticality** | Derive both from `PositionRead`, adding the G1–G6 grades. Write them to the verdict store (G7). |
| **P3 `CoachFact`** | Add `readRef` and the role. Change computer signatures to take the read. Learn's live lanes first. |
| **P4 Chain, decider, ledger, arrows** | Learn, then Review, then chat. Ahead-of-time reads: Learn reads during the opponent's turn; Review reads straight from Dexie positions the batch analysis already stored. |

## Tests that make the old shape impossible

- **`engineDoor.gate.test`:** fails if `analyzePosition`, `analyzeWithBudget`, `setMultiPv`, `acquirePvEngines` or `getCachedStockfish` appears outside `services/engine/`.
- **`readMonotonic.test`:** a search stopped at depth 8 is never served to a request for depth 12.
- **`multiPvIsolation.test`:** a puzzle solve followed by `scanCriticality` still sees a runner-up.
- **`oneTruth.test`:** the Learn, Review and chat pipelines name the same best move for the same FEN.
- **Compile-time:** `CoachFact` requires `readRef`, `squares` and `role`, and `SURFACE_CONTRACT` is a `Record`, so a new surface or a fact missing a field does not compile.
- **`arrowFromFact.test`:** no arrow without a fact, and every move in a fact's line gets its arrow.

## Rules each part satisfies

| Part | Rules |
|---|---|
| Engine read | D7, F6, F7, F06 (compute everything; deep reads ahead of time), D8, R7 |
| Derived facts | G1–G8, F13 (strength measured against the position, one measurement) |
| `CoachFact` and the composer | F0, F0b, F0c, F18, F3, F4, S10 |
| Decider | D1, D2, D3, D5, D9, F2, S1 |
| Ledger | D6, V13 |
| Surface contract | S1–S9, S11 |
| Dexie extension | R6: add fields with a version bump; old one-line rows are kept as reads with one line |

## Open risks

- A MultiPV-3 search plays its best line slightly weaker than a single-line search. The standard read should be 3 lines everywhere, and the pool is raised to match.
- The pool's results are not deterministic between runs. Reads are therefore compared by position, never by ply.

## design:7 (arrows and highlights by construction)
**One coach, arrows and highlights by construction (design, under 900 words)**

**The root cause.** Every renderer returns a bare string, so the board has to guess the arrows back out of the words. Today that guessing happens in five places that read prose and turn it into arrows:
- `namedMoveArrows` (learnBoardTeaching.ts:435)
- `deriveNarrationArrows` (narrationArrows.ts:180)
- `spokenLineArrows` (arrowEngine.ts:515)
- `extractMoveArrows` (coachMoveExtractor.ts:55)
- `segmentNamedArrows` (coachFeatureService.ts:611)

There is also text matching inside Learn. The late queue finds a fact's arrows with `l.text.includes(f.text)` (CoachTeachPage.tsx:11198-11200), and highlight timing scrapes squares out of sentences (`squaresInText`, narrationSegments.ts:84). The decider itself returns `spoken: string[]` (coachDecider.ts:224), so the moves and squares are already gone before the board is told anything. The fix: the same function call produces the words and their marks, so a sentence that names a move without drawing it cannot be built.

## Architecture (`src/coach/brain/`)

1. **The fact type, `CoachFact` (fact.ts).** It grows out of `VoiceFact` (voicePackage.ts:95-145), which already carries `squares` and `lines`. Fields:
   - `claimId`: kind + squares + seat. One key replaces the ~12 key shapes, so D4 and D6 work on keys, not wording.
   - `role`: CHANGED | GOAL | REASON | OBSTACLE | REMOVE | TEMPTING | LINE | HABIT | KNOWLEDGE (F0c, F18).
   - `seat`, `stakes{cp, plies}`.
   - `clauses: Clause[]`.

   Each `Clause` is `{words: SpokenWords, marks: Mark[]}`. A `Mark` is one of:
   - `move{from, to, fenAt, role}`
   - `linePly{from, to, fenAt, order}`
   - `square{sq, meaning}` (outpost, hole, target, key square, flight square)
   - `ray{from, through, to}` (pin, skewer, battery)
   - `region{squares}` (the square of the pawn, the opposition squares)

2. **Renderers (render.ts).** One small set: `piece`, `square`, `move`, `line` and `seatWord`. Each returns `{words, marks}` together.
   - `SpokenWords` is a branded type that only these renderers can create. They replace the ~40 piece-name tables and the 6 SAN-to-words functions (census C G1/G2).
   - `line()` replays the moves with chess.js the way `keptLines` does (voicePackage.ts:647). Each ply gets its own `fenAt`, so every arrow starts from where that piece will be once the line is walked (S10's visualization rule).
   - The arrow door already takes a board per line ply (arrowDoor.ts:49-51).

3. **Producers.** Each computer emits `CoachFact`s:
   - `thinkAloud.depthClauses` (thinkAloud.ts:226)
   - deliberation, which supplies TEMPTING
   - `exchangeLedger.proofCut`, which supplies LINE
   - the threat computers
   - `methodBeat`, which supplies HABIT

   Producers never write a string themselves; all words come from the renderers.

4. **The decider.** `coachDecider.decide` stays the one door (D1) but returns `CoachFact[]` instead of strings. Subsumption compares the facts' marks. The order comes from the computed stakes (D5).

5. **The chain composer (`composeThought`).** It takes the kept facts and orders their clauses CHANGED → TEMPTING with why it fails → REMOVE ("first this") → LINE → HABIT. The result is a `Thought = Clause[]`.

6. **Memory.** One per-game `GameLedger` keyed by `claimId`, which stores the marks too. A refrain ("the same pin as before") can then re-highlight the old squares instead of dropping them (D6, V13). A separate per-student term ledger serves V18: the first time a term is used, it gets an explaining clause plus a `ray` mark.

7. **Engine read.** One read per (4-field FEN, depth reached, MultiPV), shared by the singleton engine and the worker pool. Without this, the LINE arrows from two surfaces can disagree (D7).

8. **The board timeline (player.ts).** `speakThought` speaks one clause at a time. When a clause starts, its marks are revealed through `admitArrows` (arrowDoor.ts:187), plus a new highlight door built the same way.
   - Line plies appear one per spoken move, using `BoardArrow.order`. That field is new; BoardArrow (types/index.ts:1321) has no order field today.
   - Everything clears when the thought ends.
   - A refusal at the door silences that clause's marks and logs why. It never keeps the arrow while dropping the words.

9. **Surface modes.** `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes the only thing a surface reads: `{tense, posture, withholds, delivery}`. Every surface (Learn, Review, Play-on-ask, chat, Tactics, Openings, Kids) must declare an entry or it fails to compile. A withheld fact keeps its marks hidden until the student answers on the board (S4).

## What gets deleted

- The five prose resolvers above, plus `VoiceChatMic.extractArrows`.
- Square-scraping highlight timing (`squaresInText` / `buildNarrationSegments`).
- The arrow caps: `MAX_GREEN_ARROWS_PER_PLY` (openingGenerator.ts:1296) and `MAX_CANDIDATE_ARROWS` (arrowEngine.ts:433). They broke V14 and only existed because lines were dumped on the board all at once.
- The never-filled `leadEyeArrows` (CoachTeachPage.tsx:7972).
- The 34 `arrows: []` lanes. Their facts get real marks or the lane goes.

## Build order (each phase ships alone)

- **P0 (low risk, biggest win).**
  - Make `VoiceFact.squares` and `lines` required.
  - In the Learn late queue, draw from the kept fact's own marks, not the text match at :11198.
  - Add an `arrow-coverage` audit row per spoken line: named moves, arrows drawn, wordless arrows, refusals.
  - This alone attacks the 7-of-64 plies count.
- **P1.**
  - Clause-timed reveal and the `order` field.
  - Lines drawn one arrow per spoken move, from where each piece will be.
  - Clear at the end of the thought. Delete the caps.
- **P2.**
  - Renderers return `{words, marks}`. Move the threat, tactic and trade producers onto them.
  - Retire the resolvers one surface at a time: Learn, then Review, Openings, Puzzles, chat.
- **P3.**
  - `decide` returns facts; `composeThought` builds the chain; the `claimId` ledger goes live.
- **P4.**
  - The highlight door.
  - `ray` marks for pins, skewers and batteries; the door cannot draw these lines today.
  - A dashed TEMPTING mark.
  - The new "pin breaks with check" fact, which arrives with its marks from day one.
- **P5.**
  - The unified engine read.
  - All surfaces move onto `SURFACE_CONTRACT`, Kids included.

**Weighing it three ways.**
- **Risk-first:** P0 changes only where the late queue gets its arrows. A wrong arrow is worse than a missing one, so the door keeps refusing; refused arrows are logged and their words still play, nothing is guessed.
- **Smallest first slice:** P0.
- **The student's experience:** the board moves with the voice. Each arrow appears as its word is said, and the line builds up in the student's head before it clears.

## Tests that make the old shape impossible

- **Type:** coach speech paths accept only a `Thought` or `SpokenWords`, never a plain string.
- **Gate:** extend `src/test/arrowDoor.gate.test.ts` to ban imports of the five resolvers and of `squaresInText`, and any `MAX_*ARROWS` constant.
- **Property test:** for every renderer output, each move named in the words has exactly one mark, and every mark traces back to a clause. Named moves arrowed 100%, wordless arrows 0.
- **Line test:** N moves spoken produce N arrows ordered 1…N, each drawn from its own `fenAt`, all cleared at the end of the thought.
- **Audit contract:** the `arrow-coverage` row is asserted in both `audit-concept-gameplay-prod` and `audit-review-overhaul-prod`.

## Rules each part satisfies

| Part | Rules |
|---|---|
| Fact type + renderers | S10, F7, V18 |
| Chain composer | F0, F0b, F0c, F18 |
| Decider | D1, D4, D5, D9 |
| Ledger | D6, V13 |
| Engine read | D7, D10 |
| Removing the caps | V14 |
| Surface modes | S1–S9, S11, F2 |
| Mode-gated reveal | S4, F05 |

## design:8 (surfaces as mode settings (Learn/Review/Play/chat/lessons))
**One coach, with each tab as a mode setting. Design built through my lens (surfaces as mode settings).**

**1. The idea.** The brain runs the same way on every tab: board → computers → facts → decider → composer → renderer. A tab can only pass in one row of the contract table. The computers never see that row, so a tab can change how the coach speaks but never what is true (F2, S1).

**2. Modules**
- **`ThoughtFact`** (new, `src/coach/brain/fact.ts`) is the one fact type. It extends `VoiceFact` (`voicePackage.ts:95`), which already carries `claims`, `squares`, `lines` and `fen`. It adds:
  - `role`: Changed | Goal | Reason | Obstacle | RemoveIt | Tempting | Line | Habit | Knowledge. It is required, so a fact with no role cannot be built (F0c).
  - `verb` (the F01 verb), `seat` (V16), `stakes` (D5) and `recordTag` (F4/F5: the same fact feeds the record).
  - `claimId = makeClaim(kind, squares, seat)`. This is a branded type and the only possible say-once key (D4, D6).
- **BoardRead**: one engine read per position, shared by every tab (D7). It is keyed on (4-field FEN, depth reached, MultiPV). That fixes the cache key bug (census C §1) and the per-call MultiPV setting that persists across calls (map §Engine).
- **Computers**: the existing ones, each changed to return `ThoughtFact[]` instead of a sentence:
  - `thinkAloud.depthClauses` (`thinkAloud.ts:226`)
  - `readCriticalMoment` (`criticalMoment.ts:164`)
  - `deliberation` (`deliberation.ts:246-424`)
  - `methodBeatFor` (`methodBeat.ts:116`)
  - and the rest.
- **Decider**: `coachDecider.decide` (`coachDecider.ts:297`) becomes the only decider (D1). It absorbs `learnTurnDoor.decideTurn` (`learnTurnDoor.ts:319`), the `playCommentary` ladder, `voicePackage`'s fixed priority order and Review's pre-gates (`coachFeatureService.ts:1487-1727`). Its `posture` parameter (`:301`) is replaced by `surface: CoachSurface`, and posture is read from the contract.
- **Composer** (new, the F0c/F18 chain). It orders the kept facts as: Changed → Tempting + why it fails → RemoveIt ("not yet, first this") → Line, with their reply → Habit. It starts from `DNA_BEAT` (`learnTurnDoor.ts:122`) generalised into a `Record<Role, order>`.
- **Renderer**: typed renderers for piece, pawn, line, move-with-consequence and seat word. Each returns `{words, marks}` taken from the fact, and the marks go to `arrowDoor.admitArrows` (`arrowDoor.ts:187`). No arrow is ever resolved from prose (S10).
- **Memory**
  - **GameLedger**: one per game, keyed by `claimId`, holding squares. It is re-opened only by a computed "it changed" verdict (D6, V13).
  - **StudentLedger**: the one reader of red/green/grey (R4) plus the per-student term ledger for V18.

**3. Tab modes** (`SURFACE_CONTRACT`, `surfaceContract.ts:30`, becomes the only mode input)

The table exists today, but only `registerFor` is read. `contractFor`, `.withholds` and `.speaks` have no readers (census B §4). Each row gets these fields: `{tense, posture, speaks, withholds, asks, corpus, render, recording}`.

| Mode | tense | posture | speaks | withholds / asks | corpus | render |
|---|---|---|---|---|---|---|
| Learn (`teach`) | present | walk (D3) | always | names the move only where it matters (S3); asks only on a long-standing weakness (F05) | no | voice + board |
| Review | retrospective | walk | always | the turning-point move until the student answers on the board (S4) | no | voice + board |
| Play (new row) | present | interrupt | on-request (S5) | none | no | on tap |
| chat (`*-chat`) | present | walk | on-request | none | yes (S6) | text + board |
| "teach me X" / lessons / Watch | present | walk | always | none | the library note leads (S7) | voice + board |
| Openings Learn rung | present | walk | always | none | yes | voice says the move only, text below the board (S9) |
| Openings Practice | — | — | silent | Hint is on-request | — | — |
| Tactics | present | interrupt | wrong try refuted aloud (S8) | the solution | yes | voice + board |
| kid | present | walk | always | none | no | kidSafe renderer: no SAN, kid memory only (S11) |

`recording` is always on. A silent mode still records (F06, F5); this is where Play's no-op `raiseSlipPrompt` gets fixed (map §Play).

**4. Existing files and where they go**
- `positionFacts.computePositionFacts` (`positionFacts.ts:451`) becomes the facts stage.
- Review stops calling `decide` directly (`coachFeatureService.ts:2308`) and uses the same pipeline. That also gives Review `depthClauses`, which it lacks today (map §thinking chain).
- Lane lead order: `LEARN_LANES` lead → `DNA_BEAT` → roles.
- Teach/describe split: `FACT_ROLE` → roles.
- Voice: `applyBriefVoiceCap` (`voiceService.ts:1446`) is replaced by a Brief choice inside the decider (V15).

**5. What gets deleted**
- `PLAY_VOLUNTEERS_COACHING` (`CoachGamePage.tsx:281`) and Play's volunteering through `useCoachTips`.
- The six hard-coded register enums (census B §4).
- `decideTurn`, `buildPlayCommentary` and voicePackage's fixed priority order.
- The dead review cascade (`coachFeatureService.ts:2532-3395`), `rankFacets`, `buildThreatCheckQuestion` and `components/Play/*`.
- The five prose-to-arrow resolvers (census C G11).
- The 15 say-once memories (census B §2).

**6. Build order (each phase ships on its own)**
- **P0, no change in what is said**:
  - `decide(…, surface)`;
  - the contract becomes live, with a Play row added;
  - the flag is deleted;
  - posture literals are removed.

  This is the lowest-risk and smallest slice, and it stops the 9-deciders count growing.
- **P1**: `ThoughtFact` + `makeClaim` + GameLedger, plus one BoardRead. Existing `VoiceFact` producers are wrapped by an adapter. Arrows are drawn from fact marks only.
- **P2, the first thing the student hears change**: the Composer goes live on Learn. Learn already passes through `computePositionFacts`, so its 50 lanes map onto roles. Learn's `history` and deliberation wiring breaks also get fixed here: `history` is never passed to the main read (`CoachTeachPage.tsx:9692` vs `positionFacts.ts:1009`), and deliberation is off for fullmove < 10 (`positionFacts.ts:463`).
- **P3**: Review moves onto the pipeline, and the dead cascade and the say-once sets are deleted.
- **P4**: chat, Tactics, the Openings rungs and kid move onto their contract rows, and the extra chat routers are folded.
- **P5**: StudentLedger as the one reader of green; the old readers are deleted.

**7. Tests that make the old shape impossible**
- `decide` has no `posture` parameter, so a literal `'walk'` won't compile. A scan bans `SurfacePosture` literals outside `surfaceContract.ts`.
- **Mode-blind computers**: a scan fails any computer that imports `CoachSurface` or `surfaceContract` (F2).
- **Same-board parity**: one FEN through every row must produce an identical set of claim ids. Only what is spoken, its tense and its rendering may differ (S1, G7).
- **Exhaustive tables**: `Record<CoachSurface, Contract>` and `Record<Role, …>`, so a new tab or role fails to compile until someone answers for it (F7).
- **Arrows**: `admitArrows` accepts only a `FactMark`, which a string cannot construct (S10). Coverage is measured: named moves arrowed 100%, wordless arrows 0.
- **Memory**: a ledger key is a `ClaimId` and cannot be a string. A scan fails any second `new Set` used as a said-memory in a tab file (D6).
- **Play**: an `Utterance` built on an `on-request` row needs a request token (S5).
- **Kids**: `kidIsolation.gate.test.ts` is kept.

**8. Rulebook coverage**
- ThoughtFact: F0c, F4, F5, F06, V16
- Decider: D1-D5, D9, D11, V14, V15
- Composer: F0, F0b, F18, V7, V11
- Ledgers: D6, V13, V18, R1-R4
- BoardRead: D7, G7
- Contract: F2, S1-S9, S11, V15
- Renderer: V1, V2, V8, V9, S10

**9. For David (B6)**
- **Open**: does V11 ("never silent") cover Play? The contract makes it a one-cell decision.
- **Contradiction**: the comment in `surfaceContract.ts:18-21` still says Play speaks at phase transitions, which contradicts S5. P0 deletes it.

Inputs read: `/home/user/wt-work/RULEBOOK.md`, `/home/user/wt-work/docs/plans/2026-10-07-duplicate-census.md`, and `/home/user/wt-work/docs/plans/swarm-inputs/digests/{map-brief,teach-brief,compare}.md`.

## design:9 (migration order with least risk to paying users)
**The One Coach: an architecture and a low-risk migration order**

**Where the risk is.** Paying users only get new code through an OTA dispatch or an App Store build. A push to `main` reaches the web app only. So every phase below lands on `main` behind a shadow switch, and is OTA-dispatched only after its swarm check and hand walk. The real danger is in two places. One is data on phones: R6 says it can't be renamed, and R7 says a backfill can't freeze the phone. The other is the voice getting quieter: V11 says never silent. So the order is: add the new pieces, run them in shadow, switch over, and only then delete. A Dexie store is never deleted inside the release that stops writing to it.

## Architecture (seven modules)

1. **`fact.ts`: the one fact type.** Fields: `{kind, role: GOAL|REASON|OBSTACLE|REMOVE|TEMPTING|LINE|HABIT|KNOWLEDGE, seat, squares, moves: uci[], line?: uci[], stakes{cp, plies}, claimId = kind+squares+seat, fenFrom}`.
   - This grows out of `VoiceFact` (voicePackage.ts:95), which already carries claims and squares.
   - Computers return a Fact, not a sentence. Today most reasoners return bare strings (map-brief:37).
   - Satisfies F0c, S10, D4, R5.
2. **`engineRead.ts`: one read per position.**
   - Keyed on (4-field FEN, depth reached, MultiPV), shared by the singleton (`stockfishEngine.ts:1381`) and the worker pool (`gameAnalysisService.ts:708`).
   - Every search sets its options and restores them afterwards.
   - It replaces `stockfishCache` (keyed `${fen}::${depth}`, stockfishCache.ts:33) and `hooks/stockfishFenCache`.
   - Satisfies D7 and fixes the Bf5-vs-Bxf3 contradiction.
3. **`moveGrade.ts`: one grader, one stored record.**
   - The record holds the grade (with chess.com labels), the reason class, the better move and the refutation line as moves.
   - It extends `moveVerdictStore.saveVerdict` (:55). Fields are only added, never renamed (R6).
   - Satisfies G1–G9 and R1.
4. **`chain.ts`: the composer.**
   - Orders roles: what their move changed → the tempting choice and why it fails → "not yet, first this" → the line, with their reply → the habit.
   - Its seed is `thinkAloud.depthClauses` (thinkAloud.ts:226), together with deliberation, methodBeat and readCriticalMoment.
   - Satisfies F0, F0b, F18.
5. **`decider`: one door.** `coachDecider.decide` (coachDecider.ts:297) becomes the only door.
   - The need step is made posture-aware, which is the missing piece noted at map-brief:311.
   - `learnTurnDoor`, `playCommentary`, the `voicePackage` keep/order step, the `teachingSelector` gate and Review's pre-gates (coachFeatureService.ts:1487-1727) all fold into it. That is nine doors today (census B §1).
   - Satisfies D1–D5, D9 and D11.
6. **`gameLedger` + `studentLedger`: memory.**
   - One per-game said-ledger keyed by `claimId`, with a "something changed" re-open. It replaces about 15 owners (census B §2).
   - One persistent ledger per student for terms and ideas (V18, and spaced repetition of ideas).
   - Satisfies D6, V13 and V18.
7. **The surface contract and one arrow adapter.**
   - `SURFACE_CONTRACT` (surfaceContract.ts:30) gains real readers for `withholds` and `speaks`. Play, Openings, Tactics and Kids get their own entries.
   - One function, Fact → arrow claims, feeds `arrowDoor.admitArrows` (arrowDoor.ts:187). The five resolvers that read arrows back out of the prose are removed (census C G11).
   - Satisfies S1, S10 and F2.

**Rendering.** Typed renderers turn a fact into its words plus its marks: piece, pawn, move-with-consequence, seat word. They replace the roughly 40 piece-name tables and 6 SAN-to-words functions (census C G1/G2). Satisfies V1, V2, V9 and S13.

**Surface modes** are read from the contract and never decided by code at the call site:

| Surface | Tense | Speaks | Withholds |
|---|---|---|---|
| Learn | live | every ply (D3) | — |
| Review | looking back | — | asks before it tells (S4) |
| Play | — | only when asked (S5) | — |
| Chat | — | answers | — |
| Tactics | — | wrong-try refutation spoken | — |
| Openings WLPP | per rung | per rung | per rung |
| Kids | plain words, no notation, one gentle voice | — | — |

## Build order: each phase ships on its own

**P0 – root-cause fixes, no structural change.** This is the lowest-risk phase and gives the biggest experience gain.
- The "piece attacked by a cheaper one" alert reads the floored `legalSeeGainFor`, so a losing capture counts as an answer. Fix: read `signedLegalSeeFor` instead (positionReadingService.ts:212 vs :242, used at CoachTeachPage.tsx:8294). This is the cause of the 6.h3 silence (compare-1 #1).
- Fall back from an empty variation entry to the family entry in `identityFor`. Today 272 entries are hidden that way (compare-4 G7).
- Turn `useCoachTips` off on Play, which breaks S5 today.
- Each fix comes with a test that fails on the old code (B4).

**P1 – `engineRead`.**
- Add the new key and run both caches in shadow, logging any disagreement.
- Once the shadow shows no disagreement, delete cache B and the MultiPV leak.
- No Dexie change.

**P2 – the Fact type plus the arrow adapter, starting with one lane.**
- Port the threat lane first: `detectNewThreat` and `computeMustDefend` merge into one threat fact (map-brief:94).
- Then port the other lanes one at a time. Each port deletes its prose→arrow resolver in the same commit (G8.5).

**P3 – `gameLedger`.**
- Same as P1: write to both the old and the new ledger, read the new one, then delete the old owners.
- Covers the `takeDefinition` double ledger (CoachTeachPage.tsx:7752).

**P4 – the one grader.**
- Additive fields in `moveVerdicts`, with the backfill run through `backfillSchedule.ts` (R7).
- Remove `classifyEvalSwing`, `liveCoachTriggers.detectGreatMove`, `tacticClassifier.classifyMoveQuality` and `gradeGuess` (census A row 1).

**P5 – the chain composer and the single decider, Learn first.**
- Learn first, because its tapes are the measured baseline. `learnTurnDoor` is retired only after a hand walk shows no silent ply and no drop in claim accuracy.

**P6 – Review onto the same chain.**
- Delete the dead cascade (coachFeatureService.ts:2532-3395), the four turning-point pickers and the five recap producers.

**P7 – the student record.**
- One reader for "is this a weakness / is it proven". The six green rules collapse onto `capabilityProven`.
- Raise-only (R3). Remove the double-count (`weaknessSpine.mergeByKey` :859).
- One theme vocabulary as a `Record<…>`.

**P8 – the trap library (F04) and the gem steerer**, built on Facts and the one grader. **P9 – Kids** as a surface mode.

**Why opening/gem work isn't first, even though the student experience argues for it:** the gem lane needs P2's Fact and P4's grader to tell a trap from a two-pawn edge. If it is built first, it gets built twice.

## Deleted
- The five prose→arrow resolvers.
- Cache B.
- Nine decider doors, reduced to one.
- About 15 memory owners, reduced to one.
- Four side graders.
- `rankFacets`, `buildThreatCheckQuestion`, `computeTacticalProfile` (dead code).
- `components/Play/*`.
- The legacy `weaknessAnalyzer` reader.
- Three turning-point pickers.

## Tests that make the old shape impossible
- **No new prose reasoners.** Any exported computer returning a `string` from `services/` fails, unless it is on a shrink-only allowlist.
- **One door per surface.** Every `voiceService.speak*` call goes through `decide()`, extending `coachDecider.test.ts`.
- **No arrows from prose.** Arrows reach `admitArrows` only from the Fact adapter, by grepping the callers.
- **One grader.** A gate fails on any `cpLoss >=` grading outside `moveGrade`.
- **One engine path.** A gate fails on `analyzePosition` outside `engineRead`.
- **Contract completeness.** `CoachSurface` is exhaustive, so adding a surface fails to compile until every field of its contract is filled.
- **Shadow diff.** A shadow test asserts the spoken-ply count per walk is ≥ the old count (V11) and claim accuracy is 100% (D10).

## design:10 (the trap library (F04) and gem pipeline to the voice)
**ONE COACH, built from the trap library outward**

**Architecture**

1. **The fact type: `CoachFact`.** It extends `VoiceFact` (voicePackage.ts:95) with these fields:
   - `id`: a claim key made of kind, squares and seat
   - `role`: GOAL, REASON, OBSTACLE, REMOVE, TEMPTING, LINE, HABIT or KNOWLEDGE
   - `seat`, `squares`, `lineUci[]`
   - `stakes`: `{cp, plies}`
   - `recordTag`
   
   Every computer returns this type, never a bare string (map-brief :37, :156). `lineUci` is required when the role is LINE or TEMPTING, so an arrow can never be missing its move (S10).

2. **One engine read: `positionRead(fen)`.** It is keyed by a 4-field FEN plus depth reached plus MultiPV, and it is shared by the singleton and the pool (D7, map-brief :382). The trap computers stop making their own reads (compare-5 §2: systems #4–#6).

3. **The trap library: `src/services/trapLibrary.ts` plus `src/data/trap-library.json`.** This is the lens, and it is one shape:
   - `{id, name, motif, seat, spineKey, setup?, slipSan, punishUci[], proof:{kind:'mate'|'piece', cutPly}, conditions[], freqByBand, status:'trap'|'pattern'|'slip'}`
   - A build script folds in today's sources: punish-gems.json, gambit-punish-gems.json, the 16 `*TrapLessons.ts` files, the repertoire trap lines and the two classification JSONs.
   - `status:'trap'` only when `exchangeLedger.proofCut` proves at least 3 points of settled material, or mate (F04). This replaces `TRAP_BAR_CP = 300` (punishGems.ts:66), which measures centipawns, not material: 20 of its 69 weapons win less than a piece (compare-5 §1.3).
   - `setup` stores bait moves, such as Légal's Nxe5 (compare-5 G1/G12).
   - `name` and `motif` fix the "Punish X with Y" wording, which names neither the trap nor the motif (compare-5 G3).
   - Patterns carry their engine-checked `conditions` (P1: "does their queen reach g5 through an empty e7?").
   - The runtime index stays keyed by position (gemCrushLines.ts:116-139), so transpositions are free: 25 Bishop's Opening weapon gems are reachable by transposition (compare-5 §1.2).

4. **Trap computers.** Each one is dual-use (F4/F5) and emits CoachFacts with roles:
   - `trapSet`: the student's sound move lays a snare. This is a new lane after the student's move; `trapAheadTeaching` returns null off the student's turn (learnBoardTeaching.ts:541).
   - `trapAhead`: TEMPTING (the slip) + REASON (the mechanism, from the tactic on the punish line) + the safe alternative from `positionRead`. This replaces "Careful here… a known trap" (learnBoardTeaching.ts:573).
   - `trapSprung`: they slipped. It names the trap and gives LINE (the full punish). It only asks the student when F05 allows.
   - `trapWalkedIn` / `trapAvoided`: the missing branches in Review (compare-5 G9/G10).
   - `patternConditions`: the new "pin breaks with tempo" computer (with check, with a bigger threat, or with a discovery, and the piece must land safely). It is a new clause in `isRealPin` (pinGeometry.ts:135), and it covers S12's after-the-move explanation.

5. **The steerer: `trapSteer`.** It replaces the rating gate `slipsAllowed` (coachGameEngine.ts:239-249). The student's trap record decides (F03/F10): GREY and RED traps may be planted, once per game, chosen inside the strength window from moves the student's own band plays. While the game is still in book, the coach's book move (CoachTeachPage.tsx:7644-7651) yields to the move that heads for the nearest trap spine. Hard keeps zero planted slips, because that is a button the player chose (F11).

6. **The record.** The tag is `trap:<id>`, with held and broken rows, recorded through capabilityEvidence. `trapDecision` (trapLearning.ts:48) becomes the one reader for traps (R4). The current three tags are deleted: `gem→missed-tactic` (computerRoles.ts:47), `trapAhead→null` (:89) and `missed-opponents-threat` (trapLearning.ts:23). Rows come from every surface: Learn, Play (quietly), imported games and Review (R1). Planted slips are kept out of the strength estimate (F12/F13).

7. **The chain composer: `thinkChain.compose(facts, mode)`.** It orders roles the F18 way: what their move changed, then TEMPTING, then REMOVE ("not yet"), then LINE, then HABIT. It absorbs `thinkAloud.depthClauses` (thinkAloud.ts:226) and the Learn-only `DNA_BEAT` table.

8. **The decider.** `coachDecider.decide` (coachDecider.ts:297) is the only door (D1):
   - It takes `CoachFact[]` instead of strings.
   - It gets a need step that knows the surface's posture.
   - It folds in `learnTurnDoor.decideTurn` (:319), the fixed `voicePackage` RANK and `playCommentary`'s ladder.

9. **Memory.** There is one per-game ledger keyed by `CoachFact.id`, replacing the ~15 memories (D6). There is also one per-student ledger for terms and ideas (V18).

10. **Arrows.** One adapter, `factToClaims`, feeds `arrowDoor.admitArrows` (arrowDoor.ts:187). Lines are drawn one arrow per spoken move. No resolver reads prose.

11. **Surface modes.** `Record<Surface, {register, posture, withholds, speaks, kid}>` lives in surfaceContract.ts, and every surface reads it (S1). Today only `registerFor` has readers.

**Deleted:**
- `openingTrapDetector` and `positionTrapScan`: they hand the LLM game counts and points (openingTrapDetector.ts:124), against F3 and V8.
- `gemFinder`'s live bake with its own bar (gemFinder.ts:50).
- `detectEnginePunish` used as a trap bar (engineDeltaLines.ts:140).
- `trap-line-classifications.json` and `trap-engine-verification.json`, folded into the library.
- The 5 Jobava "Weapon" lessons, which win nothing (compare-5 §1.5).
- The dead Review cascade (coachFeatureService.ts:2532-3395).
- The "Can you find it?" prompt that every student gets (gemCrushLines.ts:801), which goes against F05.

**Build order (each phase ships)**

- **P0: the student hears a trap.** This is the smallest slice and the acceptance test.
  - `trapSteer` replaces `slipsAllowed`.
  - Book-first yields to the steer.
  - The `name` and `motif` fields go in for the existing weapon gems.
  - `trapAhead` gets its mechanism clause.
  - Proof: a muted Learn audit where the coach walks into a weapon gem from a GREY record, and the listener hears it named with its punish line.
- **P1: the library build.** Every gem is re-cut on proofCut, the hand-written lessons are folded in, Légal and the Shilling get `setup` entries, and the Bishop's Opening and Jobava lists from compare-5 §5–6 are added, each engine-verified.
- **P2: record parity.** `trap:<id>` rows from Learn, Play, imported games and Review, plus the walked-in and avoided branches, plus V6 praise when a red trap is held.
- **P3: `CoachFact`, the adapter and `positionRead`.** Trap facts are the first through `decide` and the arrow door.
- **P4: the composer, `patternConditions` and S12** (an unsound sac explained right after it is played).
- **P5: migrate the remaining computers and delete the ~217 duplicates.** The census is the checklist.

**Tests that make the old shape impossible**
- `trapLibraryBar.test`: every `status:'trap'` entry has a legal line, the punisher's seat matches, and proofCut shows a piece or mate.
- `oneTrapLibrary.gate`: nothing imports the gem JSONs, `*TrapLessons` or `openingTrapDetector` except trapLibrary.
- `trapSteer` takes no rating argument (a type test). Its gate fails if an elo or rating parameter appears.
- `Record<TrapEvent, CapabilityTag>`: a new event fails to compile until it is mapped.
- `CoachFact`: `lineUci` is required by type for LINE and TEMPTING.
- `decideIsTheDoor.gate`: no surface ranks facts itself.
- Arrow coverage: every named move gets an arrow, and no arrow appears without words.
- A planted-slip strength test: planted slips never move the strength estimate.

**Rules satisfied**

| Part | Rules |
|---|---|
| Library and its bar | F04, F02, F03, D8, D10, V10 |
| Steerer | F03, F10, F11, F15 |
| Record | F4, F5, F9, R1–R5 |
| Composer and roles | F0, F0b, F0c, F18 |
| Decider | D1–D5, D9, D11 |
| Memory | D6, V13, V18 |
| Engine read | D7, F6 |
| Arrows | S10 |
| Surface modes | F2, S1–S12 |
| Deletions | F3, F7, V8, B4 |

Weighed three ways:
- **Risk:** false traps (D10) and a polluted strength estimate are both closed by the build-time proof and by excluding planted slips.
- **Smallest shippable slice:** P0.
- **The student's experience:** the first thing the student gets is a named trap, sprung and explained.

## design:11 (opening teaching to the hilt (V19, F02))
I could not read RULEBOOK.md or questions.md: the permission classifier blocked the read, and I did not try to get around it. The rule IDs below are taken from how the map, compare and census digests use them, so check each against the rulebook. All other code claims come from the digests and the census, and I opened 7 anchors myself to confirm them.

# ONE COACH: openings first

## Architecture

**1. `CoachFact`, the one fact type (new, `coach/fact.ts`).**
- Fields: `{ id, role, kind, seat, squares, moves, lineUci, stakes{cp,plies}, verb, source }`.
- `id` is kind + squares + seat, written by the computer that made the fact. It replaces the ~12 key shapes matched on prose.
- `role` is a `Record<FactRole,…>` over GOAL | OBSTACLE | REASON | REMOVE_IT | TEMPTING | LINE | HABIT | KNOWLEDGE. That gives F0c its role assigner; today FACT_ROLE is binary (`reviewFacetRank.ts:267`).
- No reasoner returns a bare string to a surface (S10).

**2. `EngineRead`.**
- One read keyed on (4-field FEN, depth reached, MultiPV), shared by the singleton and the pool.
- Fixes the cache that ignores MultiPV (`stockfishCache` key `fen::depth`; census C§1) and the pool's MultiPV 1 with no WDL (D7).

**3. `openingOracle` (my lens).** `read(history, seat, band)` returns one `BookFacts` set:
- **identity:** the name on its defining ply. The `defining` field (`openingIdentity.ts:20`) has no reader today. Also the opening's bargain.
- **theory status** for the move just played.
- **level moves:** what players at the student's band play, from the amateur explorer.
- **the usual next reply,** said as a warning ("Nc3 hits the queen", "h3 asks the bishop").
- **departure:** `{ply, who, played, usual, usualJob, playedAllows}`.
- **traps:** traps ahead, traps the student's move sets, and traps sidestepped, from the position-keyed gem index (`gemCrushLines.ts:116-139`), with name, mechanism and condition (F04).
- **lesson beats:** the authored lesson beats for this position and seat. Learn and Review cannot reach them today (compare-4 G8).

It replaces the seven book judgments (map-brief:222): `bookDeparture.ts:49`, `theoryDeparture.ts:73` (each declares its own `MIN_BOOK_GAMES=20`), theoryDeviationScan, isBookLine, the lecture's departurePly, principleAttribution #35, and buildOpeningMoveDetail. Once those go, Learn and Review cannot name different plies.

**4. `openingMoveJob` (new).** Each opening move's own job: what it guards, what it makes room for, the line it keeps open, and what it allows. Today `principleLine` returns null after the first time a rule is said (`moveFundamentals.ts:1291-1295`), and 7 of 9 owed opening plies went silent that way. This serves V19 and V11.

**5. `thinkingChain.compose(facts, mode, record)`.** The F18 order:
1. what their move changed
2. the candidates, including the tempting move at the student's level
3. why each one fails
4. not yet, first this
5. the line, with their reply named
6. the habit

It joins depthClauses (`thinkAloud.ts:226`), deliberation and methodBeat. The opening gate is removed: deliberation is off for fullmove < 10 (`positionFacts.ts:463,480`, confirmed), and that breaks F02.

**6. The decider.**
- `coachDecider.decide` (`coachDecider.ts:297`) is the only door, with a need step that knows the posture.
- It absorbs `learnTurnDoor.decideTurn` (`:319`), voicePackage's RANK, the playCommentary ladder, and selectTeaching running twice. Chat moves onto the same door. (D1)

**7. Memory.**
- One per-game said-ledger keyed on `CoachFact.id`, re-opened by a computed "it changed" verdict (D6, V13).
- One persistent per-student term ledger (V18). Today `learnMemory.ts:270-277` clears taught terms every game.

**8. Arrows.** One fact→claim adapter feeds `arrowDoor.admitArrows` (`arrowDoor.ts:187`). The five prose resolvers go (census C G11). (S10)

**9. Surface modes.**
- Every surface reads `SURFACE_CONTRACT` (`surfaceContract.ts:30`) for register, withholding and speak policy. Today only `registerFor` is read.
- Play gets its own entry.
- Learn: interrupt. Review: walk + retrospective. Openings: walk. Play: speaks only when asked.

**10. Record.** Every fact with a role writes posed and answered evidence (F2, R1, R3). For openings that means:
- a per-line strength record;
- found or missed for each gem punish, from every surface;
- an "avoided the trap" green row.

## Build order (each phase ships alone)

**P0, the smallest risk-first slice (three root fixes):**
- Use signed SEE in the cheaper-attacker alert (`CoachTeachPage.tsx:8294`; `legalSeeGainFor` floors at 0, `positionReadingService.ts:212-215`). This is the cause of 6.h3 losing the bishop in both games.
- `identityFor` falls back to the family entry when the exact entry exists but is empty (`:51-63` returns the empty hit). Today 627 of 1,577 entries produce no sentence.
- Add MultiPV to the cache key.

**P1:** `CoachFact` plus the arrow adapter. Wrap the existing opening computers to emit facts: openingIdentity, refutedAlternative, strongChoice, trapAheadAt and bookDeparture. Learn's opening plies then speak through `decide`.

**P2:** `openingOracle` merge. Delete the seven book judgments, and Review reads the oracle. Delete buildOpeningMoveDetail's line that reads the reference coach's own play DB, which breaks F0d.

**P3:** the opening content:
- `openingMoveJob`
- the usual-reply warning
- the bargain and the retreat menu
- `forkTrickFor` both ways (today its only production caller is `trickSidestepped`)
- the pin that breaks with check (`isRealPin`, `pinGeometry.ts:135-165`, has no such test). It must also check that the escaping piece lands safely: in the brief's first gem, 5…Qxg5 refutes the knight check.
- a gem steerer that heads Learn toward the nearest gem position inside the strength window (`slipsAllowed` blocks it for anyone at 1000 or above; map-brief:243).

**P4:** `thinkingChain` with the opening gate removed and candidates sourced at the student's level.

**P5:** one ledger plus the term ledger.

**P6:** decider unification and chat.

**P7:** record wiring for openings and traps.

## Deleted

- theoryDeviationScan, isBookLine, the lecture's departurePly, `theoryDeparture` (folded into the oracle).
- The prose arrow resolvers: namedMoveArrows, deriveNarrationArrows, spokenLineArrows, extractMoveArrows, the `[ARROW:]` parse.
- `rankFacets`.
- learnTurnDoor's lead table.
- The dead capped cascade (`coachFeatureService.ts:2532-3395`).
- `components/Play/*`.
- The second hanging definition (census A#2).

## Tests that make the old shape impossible

- `Record<FactRole,…>` and `Record<CoachSurface,…>`, so a new member fails to compile until it is answered.
- **Gate:** only `openingOracle` may import the masters/amateur caches for book judgments.
- **Gate:** no surface imports a reasoner that returns `string`, and no prose→arrow resolver is imported.
- **Parity test:** Learn and Review produce identical departure plies and identity lines on the same game.
- **Coverage test:** every student book ply on the repertoire lines has a job fact; 0 identity entries are empty after the family fallback.
- **Seat test:** no trap or lesson fact is delivered to the wrong seat.
- **Tape test:** the 6.h3 position yields an OBSTACLE fact with squares h3→g4.

## Rules each part serves

- F00, F01: the verbs on every fact.
- F02, V19: oracle and move-job.
- F03, F04: traps with name, mechanism and conditions.
- F05: the contract decides withholding.
- F0c, F18: the chain.
- F0d: no name, no own-DB.
- F2: one coach.
- D1, D4, D6, D7: decider, subsumption by id, ledger, one engine read.
- S3: the critical moment names the move.
- S10: arrows from facts.
- V1, V8: words, no "I", no numbers.
- V11, V13, V18.
- G7: one stored grade.
- R1, R3: record both directions.

## design:12 (the progression (F03): traps early, thinking later, decided by the record)
**The one coach, seen through F03 (traps early, thinking later, the record decides)**

**1. Architecture**

- **`Fact`** (new, `src/brain/fact.ts`): `{claimId: kind+squares+seat, kind: FactKind, role: GOAL|REASON|OBSTACLE|REMOVE|TEMPTING|LINE|HABIT|KNOWLEDGE, seat, squares, lineUci, stakes{cp,plies}, tags: MisconceptionTagId[], trapId?}`.
  - Every computer returns a Fact. The roles live in an exhaustive `Record<FactKind, Role>`, which replaces the binary `FACT_ROLE` table (reviewFacetRank.ts:267) and `LEARN_LANES` (learnTurnDoor.ts:98, :316).
- **`engineRead`**: one cache keyed on (4-field FEN, depth reached, MultiPV). It is shared by the singleton (stockfishEngine.ts:1381) and the pool (gameAnalysisService.ts:708). Cache A (stockfishCache.ts) and Cache B (hooks/stockfishFenCache.ts) become this one cache.
- **`trapLibrary`**: one F04 bar, "wins at least a piece or mate", proven by `exchangeLedger.proofCut` (exchangeLedger.ts:314).
  - Each row carries a `TrapId`, `setup`, `slip`, `punish[]`, `conditions[]`, `name` and `seat`.
  - It absorbs these systems: gems (data/lessons/punishGems.ts:66-69), the trapLines and their classification files, openingTrapDetector, gemFinder, detectEnginePunish, and the trap-lesson files.
- **`record`**: one reader, built on `capabilityProven` (capabilityEvidence.ts:265), the weakness spine and `trapDecision` (trapLearning.ts:48). It returns red/green/grey per tag AND per `TrapId`.
- **`progression`** (new, the F03 dial): per student, per opening family, a continuous `trapWeight` from 0 to 1. Its inputs:
  - (a) the per-trap states;
  - (b) the share of the student's decisive games decided by a library trap in the first ~15 moves, in either direction (the map lists this as MISSING, "F03 PROGRESSION METER");
  - (c) how often this student's own opponents fall for the traps the student sets.
  
  An empty record gives 1, because grey teaches. No rating is read anywhere. If traps start deciding the student's games again, the weight rises again.
- **`decide`**: `coachDecider.decide` (coachDecider.ts:297) becomes the only door. Its need step becomes posture-aware. Its value term becomes stakes × the progression weight for the fact's family (trap/opening vs plan/thinking) × the student's red holes. The dial changes order, never volume. There is no cap (V14), and Brief takes the top of that order (V15).
- **`compose`**: builds the F18 chain from roles: what their move changed → tempting choice and why it fails → not yet, first this → the line → what they keep doing wrong → the habit.
  - Its seeds are `thinkAloud.depthClauses` (thinkAloud.ts:226), deliberation (deliberation.ts:144) and `methodBeat`.
  - Deliberation is turned on in the opening. Today it is off below move 10 (positionFacts.ts:463, :480), which contradicts F02.
- **`ledger`**: one per-game said-ledger keyed by `claimId`, re-opened only by a computed "it changed" verdict. Next to it, one persistent per-student ledger of terms and ideas (V18). These replace learnMemory, standingFactMemory, the ~28 Review sets and the rest of the 15 memory owners.
- **`marks`**: one adapter turns `Fact.squares`/`lineUci` into calls to `arrowDoor.admitArrows` (arrowDoor.ts:187), one arrow per spoken ply (S10).
- **`surfaceMode`**: `SURFACE_CONTRACT` (coach/surfaceContract.ts:30) becomes the only place register, posture, withholding and speaking are read. Play speaks nothing unless asked. Kids is a mode at the start of the progression.

**2. How the progression plays out for a student**

- **Early (weight near 1):**
  - Every opening move gets its job and the trap around it, in both directions: "your move sets X" (a new trap-set lane that runs after the student's move) and "careful, X walks into Y" with the mechanism.
  - The coach, as opponent, actually plays the slip at the student's level, and the punish is taught.
  - The trap is named (V10) and taught with its conditions (F04 patterns, e.g. the first gem *fails* to 5…Qxg5, compare.md:625).
- **Later:** per opening, as the student's traps go green and their opponents stop falling for them, the dial lowers trap ordering. The chain's TEMPTING/PLAN/PREVENT facts then lead. Traps still speak wherever that trap is red or grey (`trapDecision`, trapLearning.ts:48-62).
- **Per opening:** a student who is strong in the Italian but new to the Caro gets a trap-heavy Caro.

**3. Risk first: why the gem has never been heard**

- The slip is gated on rating: `slipsAllowed` (coachGameEngine.ts:239-249, called at :441) only lets it through under 1000 on Medium. That breaks F03 and F10.
- On a named opening, book moves are returned before anything else (CoachTeachPage.tsx:7644-7651).
- Every trap is recorded under one tag, `TRAP_TAG='missed-opponents-threat'` (trapLearning.ts:23), so per-trap progress lives only in a FEN key, and it is recorded from Learn only.
- The fix:
  - `slipsAllowed(record)` reads `progression` instead of rating.
  - A gem steerer picks, from the band's own book moves, the branch toward the nearest gem spine.
  - `gemResolution` records punish found / missed under the `TrapId` from every surface.

**4. Deletions**

- The rating gate in `slipsAllowed`.
- The self-report check in `isBeginnerMode` (ratingBands.ts:87) and `BEGINNER_ALWAYS` (learnTurnDoor.ts:316).
- `learnTurnDoor.decideTurn`, voicePackage's fixed RANK, the playCommentary ladder, and the second `selectTeaching` call in Review.
- The dead `rankFacets` and `buildThreatCheckQuestion`.
- The dead capped cascade in coachFeatureService.ts:2532-3395.
- `computeTacticalProfile`.
- The prose→arrow resolvers: learnBoardTeaching.ts:432, narrationArrows.ts:180, coachMoveExtractor.ts:55, arrowEngine.ts:515.
- The trap systems #3-#7 (compare.md:640-649), and the Jobava "trap" lessons, none of which win material (compare.md:629-633).

**5. Build phases (each one ships on its own)**

1. **Trap library and per-trap record.**
   - Apply the F04 bar through proofCut and add `TrapId`.
   - Switch slips to the record, and add the steerer.
   - Record gems from all surfaces.
   - *Acceptance:* David hears a gem in a Learn game.
2. **Progression dial.**
   - The meter goes into `decide`'s value term.
   - The audit row `coach-decision` emits `trapWeight` (D9).
3. **`Fact` type and roles.** Convert the opening and trap computers first (F02): identity, book oracle, trapAhead, forkTrick, pin-broken-with-tempo.
4. **`compose` + `ledger` + `marks`** on Learn. Delete decideTurn.
5. **Review, chat-on-ask and Tactics** move onto the same door. Delete Review's memory sets and the old recap producers.
6. **`engineRead`** unified, with the MultiPV and depth keying fixed.
7. **Kids** becomes a mode, and the old opening players are merged.

**6. Tests that make the old shape impossible**

- `progression.noRating.test`: a static scan that fails if `progression`, `slipsAllowed` or `decide` imports `currentRating`, `isBeginnerMode` or `ratingBands`.
- `oneTrapLibrary.gate`: only `trapLibrary` may define a trap bar; any other `*_BAR_CP`, or gemFinder/openingTrapDetector thresholds, fails the build. Every row's proofCut must win at least a piece or mate.
- `factRole.exhaustive`: a compile-time `Record<FactKind, Role>`. A computer that returns a string to the door fails to compile.
- `arrowsFromFacts.gate`: bans prose→arrow resolvers. Named moves must be arrowed 100% and wordless arrows must be 0.
- `trapRecordParity`: a gem met in Learn, Play, Review or an import writes one evidence row carrying its `TrapId`.
- `progression.behaviour`: a simulated record where traps decide games keeps the weight high; green traps plus opponents who never fall lower it; a relapse raises it again.

**7. Rules each part satisfies**

| Part | Rules |
|---|---|
| Fact/roles | F0b, F0c, F4, F5, R5 |
| trapLibrary | F04, D8 |
| progression | F03, F10, F15, F17 |
| record | R1-R4, F9 |
| decide | D1-D5, D9, D11 |
| compose | F0, F18, S3 |
| ledger | D6, V13, V18 |
| engineRead | D7 |
| marks | S10 |
| surfaceMode | S1, S5, S11 |

The deletions serve F2.

One open point is NEW (B6) and needs David's call: how many plies counts as "decided by a trap" in the progression meter (proposed: ≤15 moves, a swing worth at least a piece).

## design:13 (questions only for long-standing weaknesses (F05))
# The one coach: design, with the F05 ask gate in depth

## Architecture (`src/coach/brain/`)

1. **`Fact`**, the one fact type. It extends today's `VoiceFact`, which already carries squares and lines (`voicePackage.ts`). Fields: `{claimId (kind+squares+seat), kind, role: GOAL|REASON|OBSTACLE|REMOVE|TEMPTING|LINE|HABIT, seat, squares, movesUci, line, stakes{cp,plies}, verb, capabilityTag, source}`. Every computer must return this type; a bare string will not compile. That covers F0c, S10, D4 and R5.
2. **`engineRead`**, one read keyed on (4-field FEN, depth reached, MultiPV). The singleton and the pool both use it (`stockfishEngine.ts:1381`, `gameAnalysisService.ts:921`). Covers D7.
3. **`collectFacts`**. Today's `computePositionFacts` (`positionFacts.ts:1050`) becomes a collector only. It returns `Fact[]` and decides nothing. Covers F06.
4. **`composeChain`**, the F18 order: what changed, then tempting choices and why each fails, then not-yet, then the line, then the habit. It is seeded from `thinkAloud.depthClauses` (`thinkAloud.ts:226`) and `deliberation`. Covers F0, F0b and F18.
5. **`decide`**, the only door (`coachDecider.ts:297`). The surface posture comes from `SURFACE_CONTRACT` (`surfaceContract.ts:30`), whose `contractFor` (`:67`) has zero readers today. `learnTurnDoor`, `playCommentary`, `voicePackage` RANK and `teachingSelector` stop being deciders. Covers D1–D5 and S1.
6. **`gameLedger`**, one per-game ledger of what has been said, keyed by `claimId`. It replaces `learnMemory`, `standingFactMemory` and Review's 28 sets. Covers D6 and V13.
7. **`studentStanding`**, the one reader of the record (R4). It is built on `summariseEvidence` and `capabilityProven` (`capabilityEvidence.ts:265`) plus the weakness spine's provenance (`weaknessSpine.ts:79`).
8. **`askGate`**, the F05 decider. Details in the next section.
9. **`marks`**, one adapter that turns a `Fact` into door claims (`arrowDoor.admitArrows`). The 5 prose→arrow resolvers are deleted. Covers S10.

## My lens: questions only for long-standing weaknesses (F05)

**Today.** At least 11 places decide on their own when to ask or hold back (census §B3). Three of them break F05:
- the gem callout asks every student "Can you find it?" (`gemCrushLines.ts:737`);
- Review asks "Find the move" at every turning point (`CoachGameReview.tsx:1455`);
- `guidedFindTheMove.buildHoldChallenge` (`:84`) and `blunderRewind.findRewindTarget` (`:39`) ask too.

**The gate.** `askGate(fact, standing, surface): Ask | null`, with:
`Ask {why: StandingProvenance, prompt, expect: fact.movesUci|squares, channel: 'board', tries: 1}`.

- `why` is a **required** field: an Ask with no reason fails to compile. The words come from real provenance ("You've walked into this kind of fork in three games now"; spoken with no number, per V8).
- **Long-standing**, proposed: the tag was broken in at least 3 **distinct games**, spread over at least 14 days, and it is not `capabilityProven`. The thresholds should be measured, not chosen, by the same sweep as `capabilityGreen.measure.test.ts`.
- **What the gate must not read:**
  - The spine's `openCount`. `mergeByKey` (`weaknessSpine.ts:859`) double-counts one miss across `mistakePuzzles` and `classifiedTactics`.
  - Lifecycle `'fixed'`. `boostFor` returns 0 on it (`weaknessSignal.ts:150`), which lowers a weakness by absence and breaks R3.
- **The question is posed only when the board poses it.** The fact must be live on this ply and match the red tag. The ledger asks once per tag per game. That is a gate, not a cap (V14).
- **Every other case teaches.** A fresh install is all GREY, so the gate always returns null and the student gets the full coach (F15). Rating is never an input (F10).
- **Recording.** An answer to an Ask is written with `prompted: true` (`capabilityEvidence.ts:175`) into the `'know'` reading (`:83`). Only unprompted play in the `'use'` reading can turn a tile green (R2). An asked question names the motif, so it is partly telling.

**By surface** (read from `contract.withholds`, which becomes `Record<CoachSurface, AskPolicy>`):

| Surface | Asks? |
|---|---|
| Learn | Says why, asks, and the student answers by playing a move. No card, the board never stops (S2). Facts held back for the question stay unsaid until the answer. |
| Review | Turning-point "find it" only when the cause tag is long-standing; otherwise it teaches the moment straight. |
| Play, chat | Never (S5, S6). |
| Tactics | Exempt: the puzzle itself is the question (S8). |
| Kids | Same gate, plain-words mode (S11). |

**Weighing it three ways:**
- **Risk-first.** The real danger is a wrong red: double counts and theme maps that don't round-trip (census D §C) would ask a student about something they don't actually get wrong. So the gate reads distinct games from evidence rows only. The tag maps must be fixed first (R5).
- **Smallest slice.** Gate only the two loudest askers: the gem callout and the Review turning point.
- **Student experience.** A question nobody can explain feels like a quiz. A question with a reason feels like a coach working on you. When it is not the right time, the student gets the chain, not silence.

## What gets deleted

- Gem `CALLOUTS` (`gemCrushLines.ts:736-740`).
- `principleQuiz`, `guidedFindTheMove` and `blunderRewind` as separate askers (each becomes an `Ask`).
- Dead `buildThreatCheckQuestion`.
- `learnMemory.questionsAnswered` (`:99`) and the other memory owners (census §B2).
- The `criticalMoment.ts:285` "never names the move" Learn register. It conflicts with S3.
- `learnTurnDoor` as a decider.
- The 5 arrow resolvers (census §C G11).
- The 4 side graders (G8).

## Build order (each phase ships on its own)

1. **`Fact` + `claimId` + `gameLedger`.** `collectFacts` returns `Fact[]`. Learn's output stays the same, but repeats are gone.
2. **`studentStanding` + `askGate`**, wired to replace the gem callout and the Review question. This is the smallest slice.
3. **`engineRead`**, one cache, MultiPV in the key.
4. **`composeChain` + `decide`** as the only door on Learn, Review, phase narration and chat taps.
5. **`marks`**, arrows from facts. Delete the resolvers.
6. **One grader and the one trap library**, plus the per-motif evidence on every surface (F04, F5, G8).

## Tests that make the old shape impossible

- **`askGate.gate.test.ts`.** No production file outside `askGate` may build a question prompt or withhold a move. It blames by statement, like `coachDecider.test.ts`.
- **Required types.** `Ask.why` is required, and `AskPolicy` is a `Record<CoachSurface,…>`, so a new surface fails to compile until it declares its policy.
- **Cold-start fuzz.** On an empty record the gate returns null for every fact.
- **Double-count test.** One slip written to 5 stores counts as one game.
- **Prompted-never-green.** An answered Ask never changes `capabilityProven`.
- **Lifecycle never consulted.** Asserted by scanning `askGate`'s imports.
- **Audit row.** `coach-decision` gains `asked: {tag, games, spanDays} | null` (D9), with a contract row: on a fresh device, zero asks.

## Rules each part satisfies

| Part | Rules |
|---|---|
| `Fact` | F0c, S10, D4, R5 |
| `engineRead` | D7 |
| `collectFacts` | F06 |
| `composeChain` | F0, F0b, F18 |
| `decide` | D1–D5, S1, V11 |
| `gameLedger` | D6, V13 |
| `studentStanding` | R2–R4 |
| `askGate` | F05, F10, F15, S2, S5 |
| `marks` | S10 |
| audit row | D9 |

## Open for David (B6)

1. **S4 vs F05.** S4 says Review asks before it tells, every time. F05 says ask only for a long-standing weakness. Which wins in Review?
2. **The "long-standing" thresholds** (3 games, 14 days are my proposal, to be measured).
3. **Asked answers.** I propose they count only toward "knows it" (the `'know'` half), never toward green. Agree?

## design:14 (praise for improvement (V6))
**ONE COACH: design through the lens of praise for improvement (V6)**

**Architecture**

1. **`CoachFact`** (new, `services/coachFact.ts`). It holds `{kind, role, claim, moves[], squares[], stakes, seat, verb, evidenceIds[]}`. A `Record<FactKind, Role>` gives every computer a role, so a new kind will not compile until it has one (F0c, F7). The roles are GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE, HABIT, plus **IMPROVEMENT**. Improvement is not a sentence tacked on the end. It reframes F18 step 1, "what your move changed": "this time you saw it: Nd5 hit c7 and e7, and Qd8 covers both."
2. **One verdict per move.** `accuracyService.gradeMove` is extended to the G1–G6 ladder and saved once in `moveVerdicts`. Great and Brilliant are computed only there (G7, G8). This is where grade praise comes from.
3. **One record reader.** `capabilityProven` (`capabilityEvidence.ts:265`) is the only green rule. Evidence rows gain optional `posedSquares` and `bestSan` (the record has only `fen` and `playedSan` today, `:139-178`). Old rows stay as they are (R6). This lets praise be arrowed (S10).
4. **`improvement.ts`** (new, pure). Inputs: the record snapshot taken when the game starts, this move's evidence rows, and the verdict. Output: `PraiseFact | null`. There are five kinds, matching V6:
   - **dodged**: a tag that is red or has a broken history is held this time, unprompted.
   - **applied**: a concept taught in an earlier game or lesson is held. This generalizes `drilledTransferLine` (`learnBoardTeaching.ts:734-747`).
   - **habit**: a game-level count of posed questions that were all held, for example "every opening move where a piece could hang, you kept it". It counts posed rows, never quiet stretches (R3).
   - **grade**: a Great or Brilliant verdict, with its sacrifice or only-move squares.
   - **milestone**: a tag crossing to green (the `useProvenWatcher` diff, `hooks/useProvenWatcher.ts:15-35`), or a course finished.
   
   Hard guards: an unprompted held row only (`prompted` at `:175`). Never a grey tag, because there is no baseline to improve on. Never below `PROVEN_MIN_IMPORTANCE` (`:222`), so routine moves never get praised.
5. **Decider.** `coachDecider.decide` (`:297`) becomes the only door (D1). Praise ranks like any other fact (D5). D4 folds the praise and the move's own point on the same squares into one sentence. The other 8 doors from census B§1 are removed.
6. **Memory.** `learnMemory` is promoted to the one `GameMemory` (D6). Praise is said once per tag per game; a milestone once ever.
7. **Engine read.** One cache, keyed by fen, depth and MultiPV, and the worker pool reads it too. This fixes the stack gaps in census C§1 (D7).
8. **Arrows.** Drawn only from `fact.moves` and `fact.squares` through `arrowDoor.admitArrows`. The 5 prose-to-arrow resolvers go (census C§4).
9. **Surface modes.** The existing `SURFACE_CONTRACT` (`coach/surfaceContract.ts:30`), which today only has `registerFor` read, becomes `Record<CoachSurface, {tense, posture, withholds, voice}>`, and every surface reads it (S1). Praise per surface:
   - **Learn:** live, present tense.
   - **Review:** "you dodged…" at the ply, plus the recap.
   - **Play:** silent. Praise is banked and taught in Review (S5).
   - **Tactics:** an unaided solve on a red theme.
   - **Openings:** a trap sidestepped after warned games (`trapDecision` turns green at `trapLearning.ts:57`).
   - **Kids:** milestones only (S11).
   - **Chat:** "am I improving?" is answered from proven tags.

**Existing files: what each becomes**

| File | Becomes |
|---|---|
| `learnReward.ts` | Keeps the chime table. Its comment "the coach's VOICE still never praises" (`:12-13`) is deleted; it now contradicts V6. |
| `CoachTeachPage.tsx:1751-1756` (proven to `fireLearnReward`) | The milestone source. |
| `heatMap.newlyGreen` (`:88`) | Milestones on the Weaknesses page. |
| `trapLearning.ts:57` green state | A "dodged" source. |
| `teachingEffectService.ts:23-65` (today computed and only logged) | Context for Review's recap only. A falling rate alone is never praise (R3). |
| `computerRoles.ts:47` (gem `held: PRE`) | Records a punish-found held row when the find was unannounced. |

**Deleted**

- The praise row of `voicePackage.DNA_REFUSE` (`:279-282`). Today it drops every praise sentence, so V6 cannot be spoken. It is replaced by the type: a praise sentence can only be built from a `PraiseFact` that has evidence ids and squares, so an empty "great job" cannot be expressed (F7).
- The other green rules: `studentDossier.ts:97` strengths, lifecycle "fixed" as green, and the duplicate `loadProvenTags` (`studentRecord:24` and `weaknessSignalLoader:79`).
- The side graders `classifyEvalSwing`, `detectGreatMove` and `gradeGuess` (G8).
- The dead `rankFacets`, `buildThreatCheckQuestion` and `contractFor`.
- 14 of the 15 memories, and 4 of the 5 arrow resolvers.

**Weighing it three ways**

- **Risk first.** False praise is worse than none: it teaches the student the coach is not watching. That is why the guards are unprompted, red or broken history, and the importance bar. Praising a fluke at grey is the main failure, and it is excluded.
- **Smallest slice that ships.** Phase 0 below: just "dodged" plus milestone, in Learn.
- **Student experience.** Praise lands only because it names the squares. A student with holes may get several per game (map-brief:522), and no cap is needed (V14), because the guards do the selecting.

**Build order (each phase ships on its own)**

- **P0, praise slice:** add `posedSquares` and `bestSan`, the single proven reader, `improvement.ts` (dodged + milestone), the IMPROVEMENT role in `decide`, and the type-gated praise lift. Learn only.
- **P1:** one verdict (G1–G8), which adds grade praise.
- **P2:** `CoachFact` on every Learn computer, the composer (`thinkAloud.depthClauses:226`), and arrows drawn from facts.
- **P3:** one `GameMemory` and one engine read.
- **P4:** Review, Play banking, Tactics, Openings, and evidence from Play and imported games (F5, R1).
- **P5:** Kids and Chat.

**Tests that make the old shape impossible**

- **`improvement.test`:** returns null for a prompted held row, a grey tag, a row under the bar, or a repeat in the same game. Returns `dodged` with squares for a red tag held unaided.
- **`praiseOnlyFromFact.gate`:** no producer except `improvement.ts` emits the IMPROVEMENT role. The DNA regex stays as a backstop for every other path.
- **`noAbsencePraise.gate`:** `teachingEffect` cannot reach the praise role.
- **`playSilent`:** extended so praise in Play is recorded but never spoken.
- **`coachDecisionEmits` and `algoAuditContract`:** a `praise` field on `coach-decision`, asserted in `audit-loop-green-prod`.
- **`Record<CoachSurface, Mode>`:** exhaustive, so a new surface must declare its mode.

**Rules each part satisfies**

| Part | Rules |
|---|---|
| Fact type and roles | F0c, F0b, F7, F8 |
| Verdict | G1–G9 |
| Record reader | R2, R3, R4, F9 |
| `improvement.ts` | V6, V4, F1, F4 |
| Decider | D1–D5, D9 |
| Memory | D6, V13 |
| Engine read | D7 |
| Arrows | S10 |
| Modes | S1–S11, F2 |
| Praise text | V1, V8, V0 |

## design:15 (terms taught in context (V18))
**ONE COACH — design through the V18 lens (terms taught in context)**

**1. Architecture**

- **The fact type, `coach/brain/fact.ts`.** Every computer returns a `CoachFact`, never a bare string:
  - `claimId`: the fact's kind, squares and seat;
  - `role`: GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE or HABIT;
  - `seat`, `squares`, `movesUci`, `lines` and `stakes`;
  - **`terms: readonly TermId[]`**, which is required;
  - `capabilityTag`, linking the fact to the student record.

  Today most reasoners return prose (map-brief: "Most reasoners return a bare string"). That is why arrows are scraped back out of sentences.
- **Terms, `coach/brain/terms.ts` (the lens).** `TERMS: Record<TermId, TermDef>`. Each entry holds:
  - `define(fact, fen)`, which returns the words and the marks for this exact board;
  - `motifTag`, which links the term to the record (F4/F5).

  It absorbs the definition tables that are scattered today:
  - `TACTIC_INVARIANT` (conceptEngine.ts:124);
  - `MATCHUP_PRINCIPLE` (:147);
  - the technique definitions (:183);
  - the chat glossary (`assembleConceptAnswer`, groundedAnswer.ts:4024);
  - `FUNDAMENTALS` (:4064);
  - the principle prose (census C, G7).

  A definition must be true of the board it is spoken on. The pin text says "it can't move" (conceptEngine.ts:126), which is false when the pinned piece can leave with check. So `define` reads the fact's `breaksWithTempo` flag and teaches the exception. That includes whether the escaping piece lands safely: the brief's first gem loses to 5…Qxg5 (compare-5 §1).
- **The chain, `coach/brain/chain.ts`.** One F18 order:
  1. what their move changed;
  2. the tempting moves and why each fails;
  3. not yet, first this;
  4. the line with their reply;
  5. what the opponent keeps doing wrong;
  6. the habit.

  Each term used in the chain is rendered by the term gate (below), so a definition attaches to the fact that first uses the term. Seeds:
  - `thinkAloud.depthClauses` (thinkAloud.ts:226) is the only caller-wired producer (positionFacts.ts:1009);
  - `deliberation` supplies the weighing;
  - `methodBeat` supplies the habit.
- **The decider.** `coachDecider.decide` (coachDecider.ts:297) stays the one door and gains:
  - posture-aware need (map-brief: the need veto ignores posture);
  - role order;
  - the jobs of `learnTurnDoor.decideTurn` (:319), `voicePackage`, `playCommentary.buildPlayCommentary` and `teachingSelector`.
- **Memory.**
  - `gameLedger`: one per game, keyed by `claimId`. It replaces `learnMemory` (it clears `conceptTaught` every game at :277), `standingFactMemory`, the takeDefinition double ledger (CoachTeachPage.tsx:7752-7758) and Review's ~28 sets (coachFeatureService.ts:1487-1727).
  - `studentLedger`: a new Dexie store `taughtLog` (term or idea id, first taught, last taught, count, gameId), with a version bump and an upgrade function. It also feeds spaced repetition of ideas (brief 3d).
- **Term gate.** `termState(term)` returns one of four states:

  | State | When | What is said |
  |---|---|---|
  | new | never taught | full definition with marks |
  | taught | in `taughtLog` | bare word |
  | understood | green on the linked motif: `capabilityProven` (capabilityEvidence.ts:265) over unprompted held evidence, because being told is not proof (R2) | bare word |
  | relapsed | red again after understood | the short form once that game (the `short` register already exists, conceptEngine.ts:50) |

  A brand-new student is all grey, so they get every definition (F15).
- **Engine.** One read keyed on (4-field FEN, depth reached, MultiPV). The singleton (stockfishEngine.ts:1381) and the pool (gameAnalysisService.ts:708) both use it. This fixes the cache key in stockfishCache.ts, which ignores MultiPV.
- **Arrows.** `factToClaims(fact)` feeds `arrowDoor.admitArrows` (arrowDoor.ts:187), plus a new highlight door. Definitions carry geometry marks: a pin draws the ray from the attacker through the pinned piece to what is behind it, which needs the x-ray role the door lacks today (map-brief, arrows MISSING). Lines are drawn one arrow per spoken move (S10).
- **Surface modes.** `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes real. Today `contractFor`, `withholds` and `speaks` have no readers. Each surface declares tense, posture, withholding and render (voice, chat or kid words). Play gets its own entry and replaces `PLAY_VOLUNTEERS_COACHING` (CoachGamePage.tsx:281).

**2. Deleted**

- **Definition paths:** `takeDefinition`; `reviewFullData.ts:566-570`; the definition paths in `tacticAlertService.ts:141` and `projectedLineVoice.ts:98`; the `principlesTaught`, `conceptTaught` and `saidExplainers` sets.
- **Prose-to-arrow resolvers:** `namedMoveArrows` (learnBoardTeaching.ts:432), `coachMoveExtractor`, `spokenLineArrows`, and the `[ARROW:]` tags in VoiceChatMic.
- **Dead code:**
  - the review cascade, coachFeatureService.ts:2532-3395;
  - `rankFacets` (reviewFacetRank.ts:434);
  - `buildThreatCheckQuestion`;
  - `computeTacticalProfile`;
  - `components/Play/*`.

**3. Phases (each one ships)**

- **P0, the smallest slice, which is also the lowest-risk and the one the student hears:**
  - `terms.ts`, `taughtLog`, and `termGate` replacing the 5 definition paths above;
  - the definition highlights the squares it names.

  It fixes "the pin definition repeated word for word next game" (compare-1 #8) and gives a true pin-with-check exception. It touches no decider.
- **P1:** the engine key fix and one cache; `claimId` plus `gameLedger` on Learn.
- **P2:** the `CoachFact` type. The three biggest string producers are converted first: `explainBestMoveGrounded`, `betterMoveReason` and `deliberation.moveWhy`.
- **P3:** `chain.ts` on Learn through positionFacts. Deliberation turns on in the opening, which today is off for fullmove < 10 (positionFacts.ts:463).
- **P4:** Review moves onto `chain` and `decide`, and its own facet stack is deleted.
- **P5:** arrows come from facts, including the x-ray role; the resolvers are deleted.
- **P6:** the term `understood` and `relapsed` states run off one record reader (R4).
- **P7:** chat, Play-on-ask, Tactics, Openings and Kids become contract modes.

**4. Tests that make the old shape impossible**

- `CoachFact.terms` is required, and `TERMS` is a `Record<TermId,…>`. `TacticPatternType`, `MatchupClass` and `PositionalConceptId` each get an exhaustive `Record` mapping to `TermId`, so a new member fails to compile.
- `termGate.gate.test` blames by statement. It fails on any `tacticInvariant(` call or `Remember —` literal outside `terms.ts`.
- `termPersistence.test`: two games with the same pin; the second game must speak the bare word.
- `termTruth.test`: on the first-gem board after …Bg4, the pin definition must not claim "can't move", and must name the check escape and whether g5 is safe.
- `termMarks.test`: every term with geometry returns marks, and no mark appears without words.
- Extend `coachDecider.test` to fail if `decideTurn` or `buildVoicePackage` is called from a surface.
- `gameLedger.test`: one owner, so a say-once `Set` in a coach file fails the gate.
- Cache test: the key carries MultiPV, and the pool goes through the cache.

**5. Rules each part serves**

| Part | Rules |
|---|---|
| Terms layer | V18, F01 (knowledge), F4/F5, R2/R3, F15, V10, D10, S13 (per-language templates) |
| Chain | F0, F0b, F0c, F18 |
| Decider | D1–D5, D11, G9 |
| Memory | D6, V13 |
| Engine | D7 |
| Arrows | S10 |
| Contract | S1–S11, F2 |
| Deletions | F7, B4 |

All of this is read-only design; nothing in the repo was changed.

## design:16 (never silent (V11) with the narration setting (V15) choosing points not clipping)
**The one coach. Lens: never silent (V11), with the narration setting choosing points, not clipping (V15)**

**Headline (verified):** Brief is not enforced anywhere today. The cap is switched off globally (`NARRATION_BRIEF_CAP_ENABLED = false`, voiceService.ts:292). If it were on, it would clip text that is already ordered (voiceService.ts:1446, coachNarration.ts:136). Learn orders by danger, then lead, then beat, and only then by worth (learnTurnDoor.ts:433). So a re-enabled clip would keep sentences by their position, not their importance. Silence also exists today as a legal outcome: decide closes with `empty`, `unsupported`, `said-already` and the other gates (coachDecider.ts:220, 411-431). And Learn's "newest move wins" chain throws away queued lines (CoachTeachPage.tsx:10145-10190; compare-1 #9).

**Architecture (`src/coach/brain/`)**
1. **`Fact` type** (fact.ts): `{claimId: kind+squares+seat, kind: FactKind, role: Role, verb: F01Verb, seat, squares, moves[], line: uci[] (their replies included), stakes {cp, plies}, tier: 'thought'|'clause'|'floor', render: RenderKey}`. `ROLE: Record<FactKind, Role>` is exhaustive. The roles are goal, reason, obstacle, remove-it, tempting, line, habit, what-changed and move-point. Computers return Facts and never strings. This replaces the prose-only reasoners (map-brief: explainBestMoveGrounded, betterMoveReason).
2. **`engineRead`**: one read per position, keyed on (4-field FEN, depth reached, MultiPV), shared by the singleton and the pool. This replaces cache A, cache B and the pool's own reads (census C §1).
3. **Computers**: the existing detectors are wrapped to emit Facts.
4. **`decide(facts, ctx)`**: the only door. Importance and need set the depth of what is said, never whether a move is spoken about (D3). Order comes from stakes (D5). Subsumption works on claimId, not on matching prose (D4). The narration setting is a **selection budget** inside the decider:
   - **Full**: everything that clears the bar.
   - **Brief**: the highest-ranked whole points that fit in 2 sentences and 30 words.
   - **Silent**: the decision still runs and the record is still written; the ledger marks facts "unsaid", not "said" (F06).
5. **`compose(thought)`**: puts the facts into the F18 order: what changed, then the tempting move and why it fails, then not yet / first this, then the line in words, then the habit. Seeds: `deliberation` (weighing), `thinkAloud.depthClauses` (thinkAloud.ts:226), `methodBeat` (habit).
6. **`floorClause(move)`**: a fact with role move-point and tier floor. It is built from `narrateContinuationMove` (continuationMoveNarration.ts:75), extended to say the move's job, for example "kicks the bishop" from moveFundamentals.ts:393. On a walk surface the floor clause is always there. It speaks only when no stronger fact covers the ply.
7. **`ledger`**: one per-game claim ledger (D6) plus one persistent per-student term and idea ledger (V18). It replaces about 15 owners (census B §2).
8. **`marks`**: one adapter turns each Fact's moves, squares and line into `arrowDoor.admitArrows` claims. A line is drawn one arrow per spoken move (S10).
9. **`SURFACE_CONTRACT`** (surfaceContract.ts:30) becomes the only place a surface differs: `{tense, posture, speaks, withholds, channel}`. Its unread fields get readers. Play: `speaks: 'on-request'` (S5). Kid: a render mode only (S11).

**Never silent, in depth**
- On a walk surface the decider's return type is `NonEmpty<Fact>` (Learn, Review, lessons). `empty` and `unsupported` can no longer occur there. They stay valid only for posture `interrupt` (Play on request).
- **Pacing replaces dropping.** When move N+1 arrives while N's thought is still playing, N is cut back to its lead clause, finished, and then N+1 speaks. Facts that were not said go back to the ledger as unsaid and can be chosen again (F06, V13). A "what changed" fact can carry an unsaid obstacle into N+1's thought. This removes the lost rows [16], [36], [43]… (compare-1 #9).
- **Brief chooses; it never clips.** `applyBriefVoiceCap` becomes a tripwire. If it ever truncates, that is a defect (F7).
- Rhythm comes from the decider, not from a cap (V14, V19). Opening facts rank above the floor clause. A quiet-looking waste of a move always gets a fact. Measured bands from the reference coach (teach-brief §1: median about 20 words a note, 90-133 at decisions) are audit sanity bands, not limits.

**Which files become which part**
- `coachDecider.decide` → `decide`.
- `factSelector` → subsumption on claimId.
- `voicePackage` → `compose`; its fixed RANK is deleted.
- `learnTurnDoor.LEARN_LANES` → the `ROLE` table.
- `surfaceContract` → the contract.
- `learnMemory`, `standingFactMemory`, `standingRefrains` → `ledger`.
- `stockfishCache` → `engineRead`.

**Deleted**
- `learnTurnDoor.decideTurn` (its arrows and lanes move to roles).
- `playCommentary.buildPlayCommentary`.
- The second `selectTeaching` run.
- Review's dead capped cascade (coachFeatureService.ts:2532-3395).
- The pre-gates at coachFeatureService.ts:1487-1727.
- The 5 prose-to-arrow resolvers (census C G11).
- The dead exports `rankFacets` and `buildThreatCheckQuestion`.
- The say-once refs in CoachTeachPage and CoachGameReview.
- The newest-move-wins drop.

**Build order (each phase ships)**
- **P0 (risk-first, smallest slice):** the Fact type, `floorClause`, NonEmpty walk decisions, and Brief selection inside the current `decide` as a wrapper. This alone makes V11 and V15 true on Learn and Review.
- **P1:** claimId, one ledger, and pacing that compresses instead of dropping.
- **P2:** `engineRead`, so the Bf5 vs Bxf3 contradiction is gone (D7).
- **P3:** the computers the tapes needed, wrapped as Facts:
  - the attacked-by-a-cheaper-piece threat (fix the floored SEE, positionReadingService.ts:212);
  - opening identity with fallback to the family name;
  - one ranked list of why-better reasons.
  Then `compose` in F18 order.
- **P4:** Review on the same chain; delete the cascade and its recap duplicates.
- **P5:** marks from facts; delete the resolvers.
- **P6:** chat, Play on request, Tactics, Openings and Kids as contract modes.

**Weighed three ways**
- Risk: P0 changes the door's output, not the computers, so it can be reverted.
- Smallest slice: P0 fits in one day.
- Student first: the cost of today's silence was three pieces lost to pawns, all at moves where the coach said nothing (compare-1 #1). Floor clauses plus P3's threat fact close exactly that gap first.

**Tests that make the old shape impossible**
- **Types:** `decide(posture:'walk')` returns `NonEmpty<Fact>`; `ROLE` and `SURFACE_CONTRACT` are exhaustive `Record`s.
- **Scan gates:**
  - no surface calls `voiceService.speak*` with a string; it only gets a composed Thought;
  - no `new Set` say-once outside `ledger`;
  - `applyBriefVoiceCap` is imported only by the tripwire;
  - no code outside `marks` builds arrows from prose.
- **Behaviour:**
  - two moves 300 ms apart both get a spoken clause;
  - Brief output is whole sentences and at most 30 words, with zero cap trips, over replayed tapes;
  - the claimId for Bg4 is the same in Learn and Review.
- **Audit contract** (D9): each `coach-decision` row carries `tier`, `words`, `budget` and the quiet facts. An audit asserts `silentWalkPlies === 0` and `briefTrips === 0`.

**Rules each part satisfies**
- Fact / role: F0b, F0c, F3, F4, F5, R5.
- `decide`: D1, D2, D3, D4, D5, D11, V14, V15, F06.
- `floorClause` and pacing: V11, V19.
- `compose`: F0, F18.
- `ledger`: D6, V13, V18.
- `engineRead`: D7.
- `marks`: S10.
- Contract: F2, S1-S5, S11.
- Emission: D9.
- `NonEmpty`, the tripwire and the scan gates: F7.

## design:17 (deleting the ~217 duplicates without losing behaviour)
**One coach, designed by deleting the ~217 duplicates without losing what they do**

**How deletion stays safe (my lens).** No duplicate is removed until a parity test proves the canonical computer reproduces every claim the old one made. "Behaviour" here means the facts the coach states, not its wording. Each step runs old and new over a set of real positions and compares them by claim ID: the 52-error games, the learn5 and review tapes, and the 15 games used by `capabilityGreen.measure`. Two outcomes are allowed:
- The claim survives in the new computer.
- The claim is listed as a lost false claim, with the board that proves it false. Conflicts resolve toward the board (D10), never toward the old output.

Only then are the callers switched, the old code deleted, and its symbol added to a ban list that can only grow (F7).

**The architecture**

1. **The fact type, `ChessFact`.** It extends `VoiceFact` (`voicePackage.ts:95`), which already carries `claims`, `squares` and `lines`. New required fields:
   - `kind`, from the one `FactKind` vocabulary;
   - `role`: `goal | reason | obstacle | removeIt | tempting | line | habit | knowledge | changed`;
   - `claimId`: kind + squares + seat;
   - `seat`;
   - `stakes`, using `FactStakes` from `factStakes.ts:27`;
   - `capabilityTag`.

   One `Record<FactKind, Role>` replaces both `FACT_ROLE`, which is only teach/describe (`reviewFacetRank.ts:267`), and the `LEARN_LANES` lead table (`learnTurnDoor.ts`). A new fact cannot compile until it has a role (F0c, R5).

2. **One engine read, `engineRead`** (D7). It wraps `stockfishCache` with the key (4-field FEN, depth reached, MultiPV); today the key is `fen::depth` (`stockfishCache.ts:33`). The worker pool (`gameAnalysisService.ts:921`) reads and writes the same cache. Options are restored after every search.
   - Deleted: `hooks/stockfishFenCache.ts`, the MultiPV bypass at `coachAnswerGates.ts:400`, and the duplicate read paths in `enginePlanContext`.

3. **One grader, `moveRecord`** (G7, G8). It merges `accuracyService.gradeMove:122` with the mate and brilliancy rules in `classifyCpLoss`. The result is stored once in `moveVerdicts`, with the better move and the refutation line attached.
   - Deleted: `tacticClassifier.classifyMoveQuality:142`, `classifyEvalSwing:109`, `detectGreatMove:77`, `gradeGuess:239`.

4. **The computers.** Each census group keeps one canonical computer, and each returns `ChessFact[]`.

   | Group | Canonical computer |
   |---|---|
   | Hanging pieces | `findHangingBySee`, with the exchange score made signed. It is floored at 0 today (`positionReadingService.ts:212`), which is the root of both lost games. |
   | Threats | One threat fact, merging `detectNewThreat` and `computeMustDefend` |
   | Pins | `pinGeometry` |
   | Pawn structure | `describeStructure` |
   | Material | `settledBalance` |
   | Book departure | One book oracle replacing the 7 judgments |
   | Trades | One trade verdict |
   | Turning points | One picker |

5. **The collector, `collectFacts`.** This is `positionFacts.computePositionFacts` (`:451`), which Learn, chat and phase narration already reach. Review moves onto it: `computeMoveFacets`' tagged strings become producers of `ChessFact`.

6. **The one decider, `coachDecider.decide`** (`:297`, D1). It absorbs the logic of:
   - `learnTurnDoor.decideTurn` (`:319`): its danger and hold rules become decide steps;
   - `voicePackage` keep/order;
   - the `playCommentary` ladder;
   - `teachingSelector`;
   - Review's pre-gates (`coachFeatureService.ts:1487-1727`).

   Its need step becomes posture-aware (D2, D3, D5).

7. **The composer, `thinkChain.compose`** (F0, F0b, F18). It orders the kept facts by role: what changed → the tempting choice and why it fails → "not yet, first this" → the line with their reply → what they keep doing → the habit. Its sources are `thinkAloud.depthClauses:226`, `deliberation` and `methodBeat`. Deliberation is switched on in the opening (F02); today it is off before move 10 (`positionFacts.ts:463`). Rendering goes through typed renderers for piece, pawn, line, move and seat, which replace about 40 piece tables, 6 SAN renderers and 18 list joins (V4, V9, V16).

8. **Memory** (D6, V13, V18).
   - `gameLedger`: one per game, keyed by `claimId`, built from `learnMemory.ts:223`. It replaces the 15 owners and is re-opened only by a computed "this changed" verdict.
   - `studentLedger`: persistent in Dexie (new store, version bump, migration per R6). It holds the term ledger and the idea ledger for spaced repetition.

9. **Arrows, `factMarks(chain)`** (S10). It turns each kept fact's `squares` and `lines` into claims for `arrowDoor.admitArrows` (`:187`), one arrow per spoken move, from where each piece will stand.
   - Deleted: the 5 resolvers that read moves back out of prose (`namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, VoiceChatMic's tags) and the 4-arrow cap.

10. **Surface modes** (S1, F2). `SURFACE_CONTRACT` (`surfaceContract.ts:30`) gains `play`, `openings`, `tactics` and `endgame`, and the decider reads all three of its fields; today only `registerFor` is read. Deleted: the 6 register enums declared at call sites. Play is `on-request` (S5); kids is a mode (S11).

11. **The record** (R1–R4). `recordCapabilityEvidence` is the single writer. One reader answers both "is this weak?" and "is this proven?". One theme map replaces the 6.

**Build order (each phase ships)**
- **P0 – Safety net, no change to what the student hears.**
  - Build the parity harness and the ban-list gate.
  - Delete code with no callers: `rankFacets`, `buildThreatCheckQuestion`, `computeTacticalProfile`, `getTacticMotifStats`, `components/Play/*`, `computeLeadEyeArrows`, and Review's dead capped cascade (`coachFeatureService.ts:2532-3395`).
- **P1 – Threats and hanging pieces (the student-first slice).** Signed exchange score, one threat fact, the cheaper-attacker rule. This is what decided both games on the tapes. It is the smallest slice that ships, and it deletes 6 threat readers.
- **P2 – `engineRead`.** Highest risk: the MultiPV leak corrupts the only-move and punish checks.
- **P3 – `moveRecord`.**
- **P4 – `ChessFact` required fields plus `gameLedger`.**
- **P5 – Decider merge plus composer, Learn first, then Review moved onto `collectFacts`.**
- **P6 – `factMarks` and resolver deletion.**
- **P7 – One reader and one vocabulary for the record.**
- **P8 – Renderer sweep and kids mode.**

**Tests that make the old shape impossible**
- **Compile-time:**
  - `Record<FactKind, Role>` and `Record<CoachSurface, SurfaceContract>` are exhaustive;
  - `claimId`, `seat`, `squares` and `role` are required.
- **Gates:**
  - Only `engineRead` may import `analyzePosition` or the pool.
  - Only `factMarks` may call `admitArrows`.
  - No surface may import `decideTurn`, `buildVoicePackage` or `selectTeaching`; this extends `coachDecider.test`.
  - No component may hold a say-once `Set` or ref.
  - No piece-name literal outside `render/`.
  - Every `SURFACE_CONTRACT` field has a reader.
  - Banned symbols list, which only grows.
- **Parity tests:** `oneCoachParity.test.ts`, one per merged group.

**Weighed three ways**
- **Risk first:** the engine read and the grader carry stored data, so they come before the decider.
- **Smallest slice:** P1 is the smallest change that ships.
- **Student's experience:** P1 again, because it is the miss that cost both games.

I put P1 before P2 on purpose. The cheaper-attacker fix does not depend on the engine cache, and it changes what the student hears straight away.

**Rulebook mapping**

| Part | Rules |
|---|---|
| Fact type and role table | F0c, F4, F5, R5 |
| Engine read | D7, F6 |
| Grader | G1–G9 |
| Decider | D1–D5, D9, D11, V14, V15 |
| Composer | F0, F0b, F18, V7, V11, V19 |
| Ledgers | D6, V13, V18, F06 |
| Arrows | S10 |
| Surface contract | S1–S11, F2 |
| Record | R1–R5, F9, F13 |
| Parity and ban list | F7, B4, D10 |

The new computers the gaps call for (pin broken with check, desperado, the trap-condition checker) are outside this deletion design. They are new (B6), so they go to David before anything is built.

## design:18 (tests that make a second computer impossible to add)
**One coach: architecture, with the tests that stop a second computer being added**

Two kinds of protection. Types make the wrong shape fail to compile, which is what F7 asks for. Source-scan gates are the backup: each one starts with a ceiling set from the census counts, and the ceiling can only go down. This copies the two gates that already work, `src/test/arrowDoor.gate.test.ts` (ceiling at zero) and `oneLineReader.gate.test.ts`.

**1. The fact type: `coach/fact.ts`**

`CoachFact = { id, kind, role, seat, verb, squares, moves, line?, stakes, recordTag, fen, readId }`
- **`id`** is a ClaimId: kind + squares + seat. It is built where the fact is computed, never from the sentence. It replaces the 12 key shapes (map-brief:316).
- **`kind`** comes from one union, `FactKind`. Four tables are keyed on it as `Record<FactKind, …>`:
  - `ROLE`: goal / reason / obstacle / remove-it / tempting / line / habit / knowledge (F0c).
  - `VERB`: the F01 verbs. This is the "teaching vs description" check (questions 3f).
  - `RECORD_TAG`: a capability tag, or `{none, why}`. This is F5, every computer works both ways.
  - `RENDER`: the typed renderer.
  A new kind does not compile until all four answer for it.
- **`moves` / `squares` / `line`** carry the arrows (S10).
- **`readId`** points to the one engine read the fact came from (D7).

It grows out of `VoiceFact` (`voicePackage.ts:95`), which already carries `claims` and squares. The binary `FACT_ROLE` table (`reviewFacetRank.ts:267`) becomes `ROLE`.

**2. The computers: `coach/registry.ts`**

`REGISTRY: Record<Question, Computer>`. There is one producer per chess question: the census's 15 groups (hanging, pin, fork, threat, turning point, better-move reason, trade, worst piece, plan, structure, material, king safety, book departure, phase, missed tactic), plus `grade` and `isTrap` (the F04 bar). Each computer takes an `EngineRead` and returns `CoachFact[]`.

Who wins each group:
- `findHangingBySee`, not the floored/raw version. The floored SEE (`positionReadingService.ts:212-215`) is what silenced 6.h3 (compare-1 #1).
- `describeStructure` (`boardStructure.ts:269`).
- `exchangeLedger.proofCut`.
- `gradeMove` (G8).
- `deliberation`, as the TEMPTING producer.

**3. One engine read: `coach/engineRead.ts`**

A branded `EngineRead`. It is cached on (4-field FEN, depth reached, MultiPV) and shared by the singleton and the pool. Options are set and restored on every search. This fixes the three bugs in map-brief:376-378. It folds in `stockfishCache` and `hooks/stockfishFenCache.ts`, and wraps `gameAnalysisService.acquirePvEngines`.

**4. The decider: `coachDecider.decide`**

It stays the only door (`coachDecider.ts:297`). It gains a posture-aware need step, so Review's second need gate goes (map-brief:311).

These fold into it:
- `learnTurnDoor.decideTurn`. Its `DNA_BEAT` becomes the role order.
- `voicePackage`'s keep/order.
- `playCommentary`'s priority ladder.
- `teachingSelector`'s thesis, which becomes a GOAL-role fact.
- Review's pre-gates (`coachFeatureService.ts:1487-1727`).

**5. The chain: `coach/thinkingChain.ts`**

`compose(facts, mode, ledger, record) → Thought` puts the facts in the F18 order: what changed → tempting choices and why each fails → "not yet, first this" → the line → the habit. The parts it chains come from `thinkAloud.depthClauses` (`thinkAloud.ts:226`), `deliberation` (turned on in the opening; today it is off before move 10, `positionFacts.ts:463`) and `methodBeat`.

`Thought` is branded and can only be built by this module. It holds `{ sentences, marks }`.

**6. Memory**

- **`coach/gameLedger.ts`**: one ledger per game, keyed by ClaimId. A said fact is re-opened when a state hash changes (V13, D6). It replaces about 16 owners and 60+ sets (census B §2).
- **`coach/studentLedger.ts`**: persistent, per student. It holds terms taught and understood (V18) and the due dates for ideas (questions 3d). It is a new Dexie store with a version bump (R6).

**7. Arrows**

There is one adapter, `Thought.marks → ArrowClaim[] → arrowDoor.admitArrows` (`arrowDoor.ts:187`). Lines are built one arrow per spoken move. There is a highlight door alongside it.

The five resolvers that read arrows back out of the prose are deleted: `namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, and VoiceChatMic's `[ARROW:]` tags.

**8. Surface modes**

`SURFACE_CONTRACT` (`surfaceContract.ts:30`) is extended to every surface: Learn, Review, Play-on-ask, chat, Tactics, Openings Watch/Learn, lessons, Kids. Each entry holds `{tense, posture, withholds, speaks, notesAllowed, kidSafe, asks}`. `compose` reads only `contractFor(surface)`, which has zero readers today. The hard-coded literals go: the 6 `'walk'/'interrupt'` sites and the other 6 register enums.

**9. The record**

- One writer: `recordEvidence(fact, outcome)`, which reads `RECORD_TAG`.
- One reader: `studentRecord.read(tag)` (R1, R4).

**What gets deleted**

- Dead code: `rankFacets`, `buildThreatCheckQuestion`, `computeTacticalProfile`, and `components/Play/*`.
- The dead Review cascade (`coachFeatureService.ts:2532-3395`).
- The extra graders: `classifyEvalSwing`, `detectGreatMove`, `classifyMoveQuality`'s labels, and `gradeGuess`.
- The losing producer in each of the 15 groups.
- About 107 private piece-name tables and 17 inline list joins.
- 3 of the 4 recap producers on Review.

**The tests that make the old shape impossible**

1. **`registry.gate`**: fails on any exported function in `src/services` that returns a `CoachFact` of a `Question` it does not own. The backup is a name-pattern scan per census group (`/find.*Hanging|isPinned|detect.*Threat|turningPoint/`) with a shrink-only ceiling of 47.
2. **Speaking needs a `Thought`.** The `voiceService.speak*` signatures take `Thought`, so a string fails `npm run typecheck` (never bare `tsc`, which checks nothing here). A legacy-shim ceiling holds 107+20 calls today.
3. **`Record<FactKind, …>` × 4**: a new kind cannot compile until its role, its verb, its record path and its renderer are all decided. This covers F5, F0c and F01 together.
4. **`oneEngineRead.gate`**: `analyzePosition(`, `analyzeWithBudget(` and `getBestMove(` may only appear in `engineRead.ts`. The ceiling starts at the census C §1 call-site list. Plus a test that two calls with different MultiPV never share a cache entry.
5. **`oneLedger.gate`**: bans `new Set` / `useRef(new Set` with names matching `said|spoken|seen|announced|taught` under `components/Coach` and `services`. Ceiling 70, going to 0.
6. **`oneDecider.gate`**: extends `coachDecider.test.ts:142` to ban `decideTurn(`, `buildVoicePackage(`, `selectTeaching(` and `buildPlayCommentary(` outside the decider.
7. **`noProseArrows.gate`**: bans imports of the five resolvers. It is paired with an `algoAuditContract` row asserting, per line spoken on the tape, named moves arrowed = 100% and wordless arrows = 0 (questions 4).
8. **`everySurfaceRunsTheChain`**: generated from the `SURFACE_CONTRACT` keys. Each surface must produce its turn through `compose`.
9. **`coachSurfacesAgree`, widened.** It runs about 30 real positions, including both Lasker games, through every mode and asserts the same ClaimId set, minus what each mode withholds. This is the only gate that catches a second computer under a new name. It also stays green when a board is legitimately reclassified, as long as every surface changes together.
10. **Vocabulary round trip**: every `TacticType` ↔ Lichess theme ↔ capability tag maps there and back (R5; census D finding 3).
11. **One writer for strength**: extend `oneStudentRating` so only one estimator may write `currentRating` (F13).

**Build order: each phase ships on its own, weighed three ways**

- **P0, risk-first and smallest.** Land gates 1–7 with ceilings at today's counts. Nothing changes for the student, and the duplicates stop growing on the day it lands. Plus the floored-SEE root fix, which gives the student a warning at 6.h3.
- **P1, student first.** `CoachFact`, ClaimId, `gameLedger` and fact-carried arrows on Learn. This targets the two complaints the student actually hears: repeats were 9 of the 52 walk errors, and only 7 of 64 plies were arrowed.
- **P2.** `engineRead`, the cache fix, and folding in the pool. This ends the Bf5 vs Bxf3 contradiction.
- **P3.** The `compose` chain replaces the ordering of Learn's 50 lanes, with deliberation turned on in the opening (F02, F18).
- **P4.** Review moves onto `compose` and `decide`. Delete the cascade, the pre-gates and the extra recaps.
- **P5.** Chat, Play-on-ask, Tactics, Openings and Kids modes join through the contract. Gate 8 reaches its full set.
- **P6.** The record: one writer, one reader, migrated stores, per-motif capability. Ratchet every ceiling down to 0 and delete the shims.

**Rulebook coverage**

| Part | Rules |
|---|---|
| Fact type | F0b, F0c, F5, F01, S10, V13 |
| Registry | F2, F3, F4, G7, G8, F04 |
| engineRead | D7 |
| decide | D1–D5, D9, D11 |
| compose | F0, F18, S3, V11 |
| Ledgers | D6, V18 |
| Contract | S1, S2–S11, V15 |
| Record | R1–R5, F13 |
| Gates | F7, B4 |

The gates are backups by F7's own wording; the types are what make the wrong shape impossible. Watch gate 9: of everything here, it is the only gate that can be fooled by a well-named copy that disagrees.

## design:19 (performance on a phone (F06: compute everything, never late))
# One-coach design, with phone performance as the lens: compute everything, never be late

## 1. Architecture

**A. `coach/engineRead.ts`: one engine read store (D7)**
- One store keyed on {4-field FEN, depth actually reached, MultiPV}. Both the singleton engine and the worker pool (`gameAnalysisService.ts:921` `acquirePvEngines`) read from it and write to it.
- The store returns WDL, mate and lines in UCI the same way whichever engine ran. Today the pool drops WDL and turns a mate into `mate:null` (map.md §Engine).
- It fixes three live bugs:
  - A budget-stopped search is cached under the depth that was asked for (`stockfishEngine.ts:1569`, cacheDepth = requested depth). Then `stockfishCache.ts:62-67` hands a "deeper" answer to a shallower ask.
  - MultiPV is never reset between searches, so one caller's line count leaks into the next.
  - `hooks/stockfishFenCache.ts:22` ignores depth entirely.
- Reads are saved to Dexie, so reopening a Review never searches again.
- Phone limit: one live worker only. `useEnginePonder.ts:24-28` says that more would run the iPhone out of memory or CPU. The pool runs only when Learn or Play is not live, and its size is capped on iOS.

**B. The `Fact` type: no prose inside it**
- Fields: `{ claimId: kind+squares+seat, kind: FactKind, seat, squares, moves: {san,uci}[], line?: uci[], stakes: {cp, plies}, tier: 0|1|2 }`.
- Words are made only at render time. Arrows therefore come from the fact, never from the sentence (S10).

**C. Facts are computed in three cost tiers (F06)**
- **Tier 0, no engine:** chess.js only, on every ply, budget about 30 ms on an iPhone. Covers what is hanging (SEE signed, not floored), pins, the book answer, structure, and `computeMustDefend` (`positionFacts.ts:466`).
- **Tier 1, one shared depth-12 MultiPV-3 read:** weighing the candidates, refutations, threats. This read is almost always already done ahead of time (see the precompute rules below).
- **Tier 2, deep:** PV playouts and `criticalityScan`. It runs only when the cheap importance check says the moment may speak, or in the background before it is needed.

**Precompute rules, so the coach is never late:**
- **Learn:** the coach knows its own reply before the board shows it. Tier 0 and Tier 1 for the student's next position start while the reply animates. While the student thinks, the ponder (`useEnginePonder.ts`) also works out the student's likely replies: the engine's top 3 plus the moves players at their level play.
- **Review:** the whole game is known. When the game ends or is imported, the pool computes every ply in batch and saves the facts. This replaces the 7 s timeout in review prep (`coachFeatureService.ts:3764`).
- **Facts that arrive late are not dropped.** Today Learn throws away a turn's queued lines when the next move starts (`CoachTeachPage.tsx:10150-10162`; 7 lost rows on the tape, compare.md:95). Under the new design a late fact goes into the ledger as unsaid and comes back when it matters again.

**D. `coach/roles.ts` and the chain composer (F0c, F18)**
- One table, `ROLE_OF: Record<FactKind, Role | 'none'>`, where Role is goal, reason, obstacle, remove-it, tempting choice, line or habit. It replaces both role tables in use today: `FACT_ROLE` (`reviewFacetRank.ts:267`) and Learn's `LEARN_LANES` lead split (census B).
- `composeChain(facts)` builds on `thinkAloud.depthClauses` (`thinkAloud.ts:226`), deliberation and `methodBeat`.
- Deliberation stops being switched off in the opening (`positionFacts.ts:463,480`), because F02 puts the opening first.
- Composing is string assembly over the fact list, so it costs almost nothing.

**E. One decider: `coachDecider.decide` (`coachDecider.ts:297`) (D1-D5, D9)**
- It takes the whole fact set, assigns roles, folds facts that make the same claim, ranks by stakes, then composes.
- The surface supplies its rules from `SURFACE_CONTRACT` (`coach/surfaceContract.ts:30`), and every field of that contract is now read.

**F. Memory**
- **`SaidLedger`:** one per game, keyed by `claimId`, holding squares. It also re-opens a fact when its state changes. It replaces `learnMemory` (about 15 sets), `standingFactMemory`, and Review's 28 sets (D6).
- **`StudentTermLedger`:** saved in Dexie per student, for V18 (a term is explained the first time, then just used).

**G. Renderers:** typed renderers for piece, move-with-consequence, line and seat word, each returning `{text, marks}`, plus a template per language (V0, V1, V2, V8, S13).

**H. Arrows:** fact marks go through one adapter into `arrowDoor.admitArrows` (`arrowDoor.ts:187`). A line's arrows are timed to each spoken move through narrationSegments (S10). The 4-arrow ceiling goes (`openingGenerator.ts:1296`).

**I. Surface modes:** each surface is one `SURFACE_CONTRACT` row stating its tense, when it speaks, what it withholds, and how it shows things.

| Surface | Mode |
|---|---|
| Learn | live, walks every move |
| Review | looking back, asks before it tells |
| Play | answers only when asked |
| Chat | answers questions |
| Tactics | refutes a wrong try out loud |
| Openings (Watch / Learn / Practice / Play) | as S9 |
| Kids | plain words, no notation |

## 2. Existing files and what they become

- `positionFacts.ts` becomes the Tier 0/1 fact producer.
- `stockfishCache.ts` becomes `engineRead`.
- `thinkAloud`, `deliberation` and `methodBeat` become the composer.
- `coachDecider` becomes the only door.
- `learnMemory` becomes the `SaidLedger`.

## 3. What gets deleted

- **Engine:** `stockfishFenCache.ts`, `queueAnalysis` (`stockfishEngine.ts:1816`), `evaluateMove` (`:2026`).
- **Learn decision paths:** `learnTurnDoor`, voicePackage's own ranking, the playCommentary ladder.
- **Review:** the dead cascade (`coachFeatureService.ts:2532-3395`).
- **Arrows:** the 5 prose-to-arrow resolvers (census C G11).
- **Dead exports:** `rankFacets`, `buildThreatCheckQuestion`.

## 4. Build order (each phase ships on its own)

1. **P0, risk-first and invisible:** the `engineRead` key, MultiPV reset on every search, cache B merged into A, the pool writing to the same store. Smallest slice; unblocks D7.
2. **P1:** the `Fact` type, `claimId` and `SaidLedger`, on Learn only.
3. **P2, the biggest win for the student:** precompute. Learn's speculative pre-reads, and Review's facts computed in batch and saved. Every coach-decision audit row records time-to-first-word.
4. **P3:** the role table and composer, with Learn and Review both on one producer.
5. **P4:** arrows from facts, and the prose resolvers deleted.
6. **P5:** chat, Tactics, Openings, Play-on-ask and Kids moved onto the door.
7. **P6:** one grader (G8) and one record (R1).

Moving fact computation into a Web Worker waits until the P2 numbers show the main thread is over budget. Its risk is higher than its proven gain.

## 5. Tests that make the old shape impossible

- **One engine:** a gate fails any import of `stockfishEngine` outside `engineRead`.
- **Engine key:** a depth-8 budget-stopped read must never answer a depth-14 ask, and a 1-line read must never answer a 3-line ask.
- **Facts carry no text:** the arrow door accepts only marks taken from facts, and a gate bans the prose resolvers.
- **Roles:** `Record<FactKind, …>` is exhaustive, so a new fact kind does not compile until it has a role.
- **Memory:** a gate bans new say-once `Set`s outside the ledger.
- **Never late:** for every ply, the decider produces speech from Tier 0 facts alone (V11), so the first word never waits on the engine.
- **Arrows:** the audit measures every named move arrowed and zero wordless arrows.

## 6. Rules each part satisfies

| Part | Rules |
|---|---|
| A, engine read | D7, F06, R7 |
| B and C, facts and tiers | F3, F06, F4, D10 |
| D, roles and composer | F0, F0b, F0c, F18, F02 |
| E, one decider | D1-D5, D9, D11, V14 |
| F, memory | D6, V13, V18 |
| G, renderers | V0-V2, V8, V12, S13 |
| H, arrows | S10 |
| I, surface modes | F2, S1-S11 |

All file:line cites point into `/home/user/wt-work/src`.

## design:20 (the student record: one writer, one reader, one vocabulary (R1-R5))
**ONE COACH: design through the student-record lens (R1–R5)**

**Architecture**

1. **One fact type, `CoachFact`**: `{claimId (kind+squares+seat), role, kind, skill: SkillId, squares, lines: UCI[], stakes, seat, posed?: {importance, bestUci}}`.
   - Every computer emits this shape. No computer returns prose.
   - `skill` is the hinge. The fact that teaches a pin names the same `SkillId` that records a missed pin. That is F4 and F5 in the type itself.
   - Today the fork, Learn's gem lane and the threat lane all collapse to `'missed-tactic'` or `'missed-opponents-threat'` (computerRoles.ts:47-49).

2. **One vocabulary**, `src/data/skillVocabulary.ts`.
   - `SkillId` = today's `MisconceptionTagId` (data/misconceptionTags.ts:278) plus per-motif tactic ids, trap ids from the one trap library, and term ids (V18).
   - Every outside vocabulary (Lichess theme, `TacticType`, `FundamentalId`, `MoveFundamentalId`, `WeaknessCategory`) maps in through an exhaustive `Record<…, SkillId>`.
   - It replaces the 8 theme maps, whose round trip breaks today: tacticClassifierService.ts:56 vs weaknessSpine.ts:352-353, plus a third spelling, `removal_of_guard`.
   - It is a superset, so stored rows stay valid with no rename (R6).

3. **One writer**, `studentRecord.record(evidence)`.
   - It extends the existing `CapabilityEvidenceRecord` (capabilityEvidence.ts:139) with:
     - `eventKey = gameId:ply:skill`, so one event is stored once (R1);
     - `posed.bestUci` and `squares`, so "you held it" / "you broke it again" can draw an arrow (S10);
     - a widened `skill`.
   - Learn, Play, import, Review, puzzles and lessons all call it.
   - `mistakePuzzles`, `classifiedTactics`, `puzzleMisses` and `moveVerdicts` stay as drill and grade artifacts. They stop being counted as weakness evidence. That removes the `mergeByKey` double count (weaknessSpine.ts:868-869).

4. **One reader**, `studentRecord.read(skill)`. It returns `{state: red | green | grey, streak, openCount, provenance (game, opponent, date, squares), ideaDue, termTaught}`.
   - Green means `capabilityProven` (capabilityEvidence.ts:265), and nothing else.
   - Red means an open hole or a break with no streak since.
   - Absence never lowers anything (R3). Today two lines lower by absence: `boostFor` returns 0 for lifecycle `'fixed'` (weaknessSignal.ts:150) and subtracts 4 for an improving trend (:163). Both get deleted. The function's own comment at :153 already says this rule; the code contradicts it.

5. **Memory**
   - **Per game:** one said-ledger keyed on `claimId`, shared by every lane. It replaces about 15 owners, including `learnMemory.newGame` (learnMemory.ts:265-277).
   - **Per student, inside the record:**
     - the term ledger (V18): today `conceptTaught` is wiped every game, at learnMemory.ts:275;
     - the taught-idea log, with spaced review of ideas;
     - the trap-meeting state.

6. **The decider, the chain, the engine and arrows** (other lenses own these; how they touch the record):
   - **Decider:** `coachDecider.decide` (coachDecider.ts:297) reads `read(skill)` for its need step (D2) and its order (D5).
   - **Chain:** the composer fills REASON and HABIT from provenance ("third game you've walked into this fork, last against X").
   - **Asking (F05):** the coach asks only when `read().state === 'red'` and the streak of breaks is long.
   - **Engine:** one engine read (D7) supplies `posed.importance` and `bestUci`. The verdict and the record therefore come from the same number (F13).
   - **Arrows:** drawn from `fact.squares` and `fact.lines` through `arrowDoor.admitArrows` (arrowDoor.ts:187).
   - **Surface modes:** a surface changes only the tense, the timing and what it withholds. The `record()` call is identical on every surface (S1).

**Which existing files become which part**
- `capabilityEvidence.ts` becomes the event log, the green bar and the writer core.
- `studentRecord.ts` (29 lines) becomes the one door. The duplicate `loadProvenTags` in weaknessSignalLoader.ts:79 goes; studentRecord.ts:24 keeps it, with memoization added.
- `weaknessSpine.ts` becomes a reader-side aggregator. Its 8 `capabilityTag: null` rows (:394, :582, :622, :667, :693, :782, :804, :845) get their skill from the vocabulary, which makes the dead heat-map Practice button work (HeatMapPanel.tsx:81).
- `tacticVocabulary.ts` is absorbed into `skillVocabulary.ts`.
- `trapLearning.ts` keeps its warn/test logic but stops filing under `TRAP_TAG = 'missed-opponents-threat'` (:23). Its green-after-one-avoid rule (:57) defers to the one bar.

**Deleted**
- Dead: `tacticalProfileService` and `isTacticWeakness`.
- Legacy readers: `weaknessAnalyzer.computeWeaknessProfile` and `gameInsightsService.getMistakeInsights`.
- Green and fixed rules that disagree with the one bar: lifecycle lowering, mistakePuzzle `'mastered'` used as green, curriculum `'mastered'` and dossier strengths. All of them re-point to `read()`.
- LLM-written notes: `coachMemoryService`'s `[[REMEMBER:]]` (coachMemoryService.ts:101). These break F3.
- Strength: the result-based Elo chain (playerRatingService.ts:80-117) and the 7 writers of `currentRating`.

**Build order** (each phase ships on its own)
- **P0 — vocabulary and honesty.** `skillVocabulary.ts` with exhaustive maps. Delete absence-lowering. One `loadProvenTags`. Join the spine rows to their skills. The student sees a missed fork turn its tile red, and Practice works.
- **P1 — one writer.**
  - Play and imported games write both halves: remove the `opts.reviewed` gate (autoAnalyzeGame.ts:423) and the skip of blunder plies (:284), so games record "broken" as well as "held".
  - Per-motif tactic skills.
  - Trap meetings recorded from every surface.
  - Store `eventKey` and posed squares on every row.
- **P2 — one reader.** Migrate heat map, `needScore`, `boostFor`, `rankThemeTargets`, dossier, curriculum and Up next onto `read()`. Old stores become derived. Backfill on the `backfillSchedule` pattern (R7).
- **P3 — the record speaks.** HABIT and REASON from provenance. Praise when the student dodges their usual mistake: a red skill answered cleanly, per V6. Today `teachingEffectService.ts:23-45` computes "is the taught mistake declining" and only logs it. The persistent term ledger. The F05 ask. The F03 progression meter.
- **P4 — strength.** `liveStrength` is reset per game (useDiscussionPractice.ts:357) and never saved. Persist it per skill and per opening, fed from the same posed rows. Delete the Elo chain and FirstRunStrength (F13, F15, F17).

**Tests that make the old shape impossible**
- `oneRecordWriter.gate.test.ts`: only `studentRecord` may write the evidence stores. It blames by statement, not by file.
- `skillVocabulary.roundTrip.test.ts`: every outside id → `SkillId` → back again, with exhaustive `Record`s, so a new term fails to compile until it is mapped (R5).
- `factRecords.test.ts`: `Record<FactKind, SkillId | {none: reason}>`. A computer that teaches without recording fails to compile (F5).
- `absenceNeverLowers.test.ts`: a property test. Adding time with no new rows never lowers `boostFor` or `read().state`.
- `eventOnce.test.ts`: one slip seen by Learn, the analysis sweep and Review is counted once.
- `everySurfaceRecords.test.ts`: `Record<CoachSurface, writerWired>`.
- `noLlmRecord.gate.test.ts`: bans `REMEMBER` tags.
- `oneGreen.gate.test.ts`: bans `'fixed'` or `'mastered'` used as a lowering input anywhere outside `capabilityProven`.

**Rules each part satisfies**

| Part | Rules |
|---|---|
| Writer | R1, F5, F4, R6 |
| Reader | R4, R2, R3, F9, F10 |
| Vocabulary | R5, F4 |
| `CoachFact.skill` + squares | F0c, S10, D4, D6 |
| Memory ledgers | D6, V13, V18 |
| Record-fed HABIT/REASON, praise, ask | F1, F05, V6, F03 |
| Strength | F11, F12, F13, F15, F17 |
| Backfill | R7 |

**The three ways of weighing it**
- **Risk-first:** P0 changes no persisted shape. P1 adds fields; it renames nothing.
- **Smallest slice:** P0 alone fixes the dead heat map and the R3 violation.
- **Student's experience first:** P3 is where the student first hears the loop ("you've done this three times — and this time you didn't").

## design:21 (think-aloud: their thought process (F18) with tempting choices from what players at their level actually play)
The one coach, seen through think-aloud (F18): one engine read, one stored grade, one typed fact, one candidate sourcer, one chain composer, one decider, one memory and one arrow adapter. Each surface only declares how it speaks, never what is true (F2, S1).

**The fact type: `coach/fact.ts` (new)**
`Fact = { claim (kind+squares+seat), kind: FactKind, role: Role, seat, squares[], moves[{fenFrom,uci}], line?{fen,uci[]}, stakes: FactStakes, recordTag: CapabilityTag|null }`. It carries no prose.
- `ROLE: Record<FactKind, Role>` maps every kind to one of CHANGED, GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE, THEIR-HABIT, HABIT or KNOWLEDGE. A new kind does not compile until it has a role (F0c, F7).
- It replaces the bare strings and the binary teach/describe table `FACT_ROLE` (`reviewFacetRank.ts:267`).
- It extends the existing `DepthClause` (`thinkAloud.ts:191`), which already carries `lines`, `squares`, `stakes` and `claim`.

**Engine read: `positionRead.ts` (new, wraps `stockfishEngine`)**
- Keyed on (4-field FEN, depth reached, MultiPV), and shared by the singleton and the pool.
- Every option is set and restored on each search. Today the cache key is `${fen}::${depth}` (`stockfishCache.ts:2`) and MultiPV leaks onto the shared worker (D7).

**Grade: `accuracyService.gradeMove` becomes the only grader**
- One stored record per ply in `moveVerdicts`: grade, reason class, better move, refutation line (G7, G8).
- Delete `classifyEvalSwing`, `liveCoachTriggers.detectGreatMove` and `gradeGuess` (census A row 1).

**My lens: the candidate sourcer `thinkCandidates.ts` (new, F18 step 2)**
It builds a ranked `TemptingSet` from:
1. **What this student played last time here.** Looked up by FEN in `moveVerdicts`/`games`.
2. **What players at their level play.** Read from `amateurPlayCache.getCachedAmateurPlay` (`amateurPlayCache.ts:37`) at the student's measured per-opening strength (F10, F17). Today only refutedAlternative, coachApi and the Learn page read that cache (`CoachTeachPage.tsx:9740`).
3. **The trap library's slip at this position.** The library is keyed by position; today that is the gem index (`gemCrushLines.ts:116-139`).
4. **The forcing moves.** Every check and capture, each given a one-word verdict.
5. **The engine's runner-up.** Comes from `buildDeliberation` (`deliberation.ts:144`). It is capped at `DEFAULT_MAX = 3` (`:55`); the cap goes (V14).

How each candidate is handled:
- It is refuted by its own engine line, cut to the proof with `exchangeLedger.proofCut` (:314).
- The refutation uses the **signed** exchange count, never the floored `legalSeeGainFor` (`positionReadingService.ts:213`). The floored count is why 6.h3 went silent (compare-1 #1).
- It is labelled with the reason it fails (drops material, allows tactic X, loses a tempo, blocks the plan).
- A candidate with no proven refutation is not said (D10).
- `refutedAlternativeCore.candidatesFromAmateur` (:159) and `pickAlternative` (:87) are absorbed into the sourcer.

**Chain composer: `thinkChain.ts` (new)**
- Orders the facts the F18 way: CHANGED, then GOAL/OBSTACLE, then TEMPTING with why it fails, then NOT-YET/REMOVE-IT, then LINE (their reply named), then THEIR-HABIT, then HABIT.
- Sources it absorbs: `thinkAloud.depthClauses` (:226), `deliberation`, `moveInsight.theirMoveChanged`, `threatAnswer`, `liveMethodBeat` (`methodBeat.ts:296`) and `learnTurnDoor.DNA_BEAT` (:122).
- A finding that fills no role is not said.
- Brief = the first two roles, whole sentences (V15).

**Decider: `coachDecider.decide` (:297) becomes the only door (D1)**
- It returns a chain, not strings.
- Its need step reads the surface's posture (map §Deciders).
- Folded in or deleted: `learnTurnDoor.decideTurn`, the `playCommentary` ladder, `voicePackage`'s fixed rank, Review's pre-gates, and the dead `rankFacets` (census B §1).

**Memory**
- **`gameLedger` (one per game).** Keyed by claim id and carrying squares. It is re-opened by a computed "it changed" verdict (V13, D6). It replaces about 15 say-once owners, including `learnMemory`, `standingFactMemory`, the 28 sets in coachFeatureService and `useLiveCoach.saidRef`.
- **`studentLedger` (persistent, per student).** Terms explained (V18), ideas taught and when they are due again, and per-candidate "fell for it / avoided it" evidence. The avoided evidence goes into `capabilityEvidence`, so dodging a tempting move becomes green and drives praise (F5, R2, V6).

**Arrows**
- `factToClaims` (new) turns each fact's moves, squares and line into calls to `arrowDoor.admitArrows` (:187), one arrow per spoken move, timed to the words, cleared at the end of the idea (S10).
- Delete the five prose resolvers: `namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows` and VoiceChatMic's `[ARROW:]` tags. Also delete `MAX_GREEN_ARROWS_PER_PLY`.

**Surface modes: `surfaceContract.ts` (:30) is actually read**
`contractFor`, `withholds` and `speaks` have zero readers today. Each surface declares register, when it speaks, what it withholds, and how it delivers:
- **Learn:** present tense, the chain on every ply (V11, D3).
- **Review:** looking back. At a turning point it asks before it tells: TEMPTING and LINE are held until the student taps the board (S4).
- **Play:** speaks only when asked (S5).
- **Chat:** goes through the same door.
- **Tactics:** a wrong try is TEMPTING plus its LINE, spoken (S8).
- **Openings Watch:** the library note leads, then the chain (S7).
- **Kids:** a mode, not separate code (S11).

**Build order (each phase ships on its own)**
- **P0 (risk first).** Fix the engine cache key and MultiPV restore. Switch the cheaper-attacker lane (`CoachTeachPage.tsx:8294`) to the signed exchange count. Small, and it removes live false silences and false claims (B4).
- **P1 (smallest slice, student first).** Fact type, sourcer and composer on Learn, for the student's own move only.
  - Lift the opening gate on deliberation (`positionFacts.ts:463,480`, `fullmove < 10`). The tempting move must speak in the opening (F02, V19).
  - The proving slice is the Scandinavian 6.h3: "Bh5 keeps the pin; leaving it loses it to hxg4" (compare-1, compare-4 G3).
- **P2.** The decider consumes chains. Learn's 50 lanes are mapped to roles. Delete `DNA_BEAT`, `buildPriorityFirst` and voicePackage's rank.
- **P3.** Review runs the chain. Delete the dead capped cascade (`coachFeatureService.ts:2532-3395`) and `segmentNamedArrows` (:611).
- **P4.** The two ledgers. The fell-for/avoided evidence starts recording.
- **P5.** Chat, Play-on-ask, Tactics, Openings and Kids move onto the door.
- **P6.** The trap library feeds candidate source 3 (F04).
  - The pin-breaks-with-tempo computer, including whether the escaping piece lands safely. The brief's first gem actually loses to 5…Qxg5 (compare-5 §1), so the chain must teach it as a pattern with its failing condition (S12).
  - Every other new computer in the "missing" lists is brought to David first (B6).

**Tests that make the old shape impossible**
- `ROLE` exhaustiveness (compile-time).
- `factOnlySpeech.test`: no surface turns a string-returning computer into speech; only `thinkChain` output reaches the voice.
- `arrowSource.test`: `admitArrows` is called only from `factToClaims`.
- `temptingProven.test`: every TEMPTING fact carries a refutation line with a non-empty proof cut.
- `chainOrder.test`: on fixed positions the roles come out in F18 order. The Scandinavian 6.h3 / 9.g5 / 15.c3 positions must name the threat and the candidates.
- `oneLedger.test`: one say-once owner per game.
- `engineKey.test`: two reads at different MultiPV never collide.
- Extend `coachDecider.test`, so any surface that calls `selectFacts` or a lane ranker directly fails.

**Rules each part serves**
- Fact type: F0b, F0c, F3, F7, R5.
- Engine read: D7, F6.
- Grade: G1–G9.
- Candidate sourcer: F18, F0, F10, F17, F02, F04, D8, D10.
- Composer: F0, F0c, F18, F01, V7, V15.
- Decider: D1–D5, D9, D11.
- Ledgers: D6, V13, V18, R1–R4, F5, V6.
- Arrows: S10.
- Surface modes: S1–S12, F2.

All file:line citations are from the working tree at /home/user/wt-work/src and the digests in /home/user/wt-work/docs/plans/swarm-inputs/digests/.

## design:22 (consequences and drawbacks (D11) as first-class facts)
**One coach, designed around consequence (D11 lens)**

**The core change.** Today each computer returns its own sentence and decides for itself whether something matters. In the new design every computer returns one typed fact. One judge decides what each fact *costs* or *allows*. One decider ranks the facts by that consequence. One composer joins them into a single thought.

**1. The fact type** (new `brain/fact.ts`)

```ts
interface ChessFact {
  claim: ClaimKey            // kind + squares + seat (one key, replaces ~12 key shapes)
  kind: FactKind             // the single vocabulary (R5), Record<FactKind, RoleSpec>
  role: 'goal'|'reason'|'obstacle'|'removeIt'|'tempting'|'line'|'habit'|'knowledge'
  seat: 'student'|'opponent'
  squares: Square[]; lineUci: string[]          // marks travel with the fact (S10)
  consequence: Consequence                      // REQUIRED
  recordTag: CapabilityTag | null               // dual use (F4/F5)
}
interface Consequence { usable: 'proven'|'notUsable'; how: 'reach'|'pv'|'exchange'|'none';
  stakesCp: number; plies: number; lasts: boolean }
```

- `consequence` is required, so a computer cannot emit a bare drawback. "Unproven" does not compile.
- The judge `brain/consequence.ts` answers D11's four questions:
  - **Can the opponent use it?** Reach in N plies, or the engine's best line goes there.
  - **Does it cost something?** The signed exchange count `positionReadingService.ts:234`, never the floored one at `:212`/`:149`.
  - **Does it last?**
  - **Does this student need it?** Their record raises it.
- Every move produces a delta for both sides: what it gained and what it gave up (guard lifted, square left, castling, tempo). This grows from `moveInsight.ts:523/573` and `theirMoveCost.ts:60`.
- A drawback is spoken only when `usable === 'proven'`.

**2. One engine read** (`brain/engineRead.ts`)
- Keyed on the 4-field FEN, the depth actually reached, and MultiPV. Today's key is `${fen}::${depth}` (`stockfishCache.ts:33`).
- The worker pool reads and writes the same cache, so Learn, Review and the batch pass can never disagree about the best move (D7).

**3. One grader** (`brain/grade.ts`)
- Produces one stored record per move: grade, reason class, what it cost, the outcome band it crossed, the better move and the refutation line.
- Built on `accuracyService.gradeMove`. It adds the grades we lack: Best, Excellent, Great, Miss (G1–G9).

**4. One decider** (`brain/decide.ts`)
- Grows from `coachDecider.decide` (`coachDecider.ts:297`), keeping importance → need → merge-duplicates → floor.
- Order comes from the consequence: what is at stake and how soon. The student's red items move up.
- The need step knows the surface's posture. Every row is still recorded for audit (D9).

**5. The chain composer** (`brain/chain.ts`)
- Grows from `thinkAloud.depthClauses` (`thinkAloud.ts:226`) and the deliberation weighing.
- Fills the roles in F18 order: what their move changed → the tempting choice and why it fails → "not yet, first this" → the line with their reply → the habit.

**6. Memory** (`brain/memory.ts`)
- One ledger per game, keyed by claim and holding squares. It reopens a fact when the consequence judge says its stakes changed (V13).
- One persistent per-student term ledger, as a new Dexie store with a version bump (V18, R6).

**7. Marks** (`brain/marks.ts`)
- Each fact's `squares` and `lineUci` become claims for `arrowDoor.admitArrows` (`arrowDoor.ts:187`), one per spoken move.
- A matching highlight door is added. Nothing is read back out of prose.

**8. Surfaces**
- `SURFACE_CONTRACT` (`surfaceContract.ts:30`) becomes the only place a surface differs: register, what it withholds, when it speaks.
- Play is added to it and stays silent unless asked. Kids is added as a mode.

**What gets deleted**
- **Deciders:** `learnTurnDoor.decideTurn` (`learnTurnDoor.ts:319`), voicePackage's fixed RANK, the `playCommentary` ladder, and Review's pre-gates (`coachFeatureService.ts:1487-1727`).
- **Graders and side doors:** the 5 extra graders, the dead cascade (`coachFeatureService.ts:2532-3395`), dead `rankFacets`, and `components/Play/*`.
- **Arrows:** the 5 prose→arrow resolvers (`namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, VoiceChat tags).
- **Memory:** the 15 separate say-once owners.

**Build order — each phase ships on its own**

| Phase | What it ships | Why this order |
|---|---|---|
| **P0 — smallest, highest risk-payoff** | The `ChessFact` and `Consequence` types, plus the judge on one question: "a cheaper piece attacks a defended piece". Wired into Learn (`CoachTeachPage.tsx:8294`, which today stands down on the floored exchange count) and into Review's threat callout. | 6.h3 decided both tape games and every door was blind to it. For the student this is the biggest win: the warning before the piece is lost. |
| **P1** | One engine read (the cache key fix). | It is invisible, but every later phase stands on it. |
| **P2** | `grade.ts` plus the stored move record; the side graders are removed. | — |
| **P3** | `decide` and `chain` on Learn. Deliberation turned on in the opening (removing the `fullmove < 10` gate at `positionFacts.ts:463/480`, F02). The game ledger. | — |
| **P4** | Review runs through the same chain; the dead cascade and the 4 turning-point pickers are deleted. | — |
| **P5** | Marks come from facts; the prose resolvers are deleted. | — |
| **P6** | Chat, Play-on-ask, Tactics, Openings and Kids go through the contract. | — |
| **P7** | One writer per event into the record; one reader (R1, R4). | — |

**Tests that make the old shape impossible**
- **`brainFact.gate`:** any computer registered with `chain` must return `ChessFact[]`, not a string. A drawback fact without `consequence` fails typecheck.
- **`flooredSeeBan`:** the floored `legalSeeGainFor` may not decide whether a threat is answered.
- **`oneDecider` and `oneLedger`:** no imports of the old doors or memories outside `brain/`.
- **`engineKey`:** the same FEN at MultiPV 3 and MultiPV 6 gives two different keys, and the pool reads the same cache.
- **`noProseArrows`:** the resolver names are banned.
- **`factKindExhaustive`:** `Record<FactKind, RoleSpec>`, so a new kind does not compile until it is given a role.
- **`surfaceContractRead`:** every surface reads all three fields (register, withholds, speaks).
- **Real-position tests:** 6.h3 must yield an obstacle with `usable: 'proven'`. A backward pawn that nothing can reach must stay silent.

**Drawbacks of this design (D11 applied to itself)**
- **P3 replaces Learn's 50 lanes in one go.** Run the old door in shadow, compare the decision rows, then cut over.
- **The term ledger is a new Dexie store.** It needs a version bump and an upgrade (R6).
- **The judge adds a cost to every fact.** Run cheap checks (reach, exchange count) every move; read the engine line only when the decider may use it (F06).
- **Missing computers are not built yet.** The pin that breaks with tempo is David's decision in the brief (item 7), but compare-5 measured that the brief's first gem loses to 5…Qxg5. It must be built as a pattern with its conditions, not as a trap (F04). The other missing computers are B6 and go to David first.

**Rules each part satisfies**

| Part | Rules |
|---|---|
| Fact type | F0c, F4, F5, S10, R5 |
| Consequence judge | D11, F01 (consequence, prevent), D10 |
| Engine read | D7, F06 |
| Grader | G1–G9 |
| Decider | D1–D5, D9, F06, V14 |
| Chain | F0, F0b, F18, V7, V11 |
| Memory | D6, V13, V18 |
| Marks | S10 |
| Surface contract | F2, S1–S12 |

Files: `/home/user/wt-work/src/services/coachDecider.ts`, `thinkAloud.ts`, `voicePackage.ts`, `arrowDoor.ts`, `positionReadingService.ts`, `stockfishCache.ts`, `coach/surfaceContract.ts`, `components/Coach/CoachTeachPage.tsx`.

## design:23 (knowledge and golden nuggets (F01) as facts the decider can rank)
**ONE COACH: design through the knowledge lens (golden nuggets as rankable facts)**

**1. The fact type** (new `src/coach/fact.ts`)

`CoachFact = { claim, kind: FactKind, role, verb, seat, fen, squares, lines, stakes, recordTag, nugget?, text }`

- **What already exists.** `VoiceFact` already carries `claims`, `squares` and `lines` (voicePackage.ts:95-140). `DepthClause` already carries `lines`, `stakes` and `claim` (thinkAloud.ts:191-203).
- **What is new:**
  - `role` is one of GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE, HABIT or KNOWLEDGE.
  - `verb` is one of the F01 verbs.
  - `recordTag` is required (`MisconceptionTagId | 'na'`), so a computer that cannot record fails to compile (F4, F5).
- **The decider changes input.** `FactBundle.facts` is plain strings today (coachDecider.ts:134), with squares and stakes in side maps keyed by text (:139, :155). It becomes `CoachFact[]`.

**2. Knowledge as facts: the Nugget registry** (new `src/coach/nuggets.ts`)

The registry is `Record<NuggetId, Nugget>`, and each nugget holds:
- `condition(fen, host) → instance | null`. This is a computer, and the nugget only fires when it returns an instance.
- `invariant`: the why, moved here from `TACTIC_INVARIANT` (conceptEngine.ts:124-136).
- `term`: the V18 glossary entry.
- `failsWhen`: the check that tells a working case from a failing one (F04).
- `habit`, `recordTag`, and two verified FENs: one where it fires and one where it doesn't.

Two rules for how nuggets rank:
- **A nugget never speaks alone.** It attaches to a host fact as that fact's "so" or "because" link (F0b). Its stakes are the host's stakes (factStakes.ts:27), so D5 order holds and a nugget can never outrank the danger that earns it. `ComputedConcept.bare` (conceptEngine.ts:64) is banned on live surfaces.
- **The record decides how much to say.**
  - GREY (never tested): full invariant plus the term definition.
  - RED (keeps failing): invariant plus habit.
  - GREEN (proven): the bare term, or nothing.
  - These come from `capabilityProven` (capabilityEvidence.ts:265), never from a rating (F10).

The first nuggets come from the tapes:
1. **Cheaper attacker beats a guard / count by value.** The live branch exists but reads the floored SEE (`legalSeeGainFor`, positionReadingService.ts:212). It should use the signed SEE (`signedLegalSeeFor`, positionReadingService.ts:242). `countMethod` stays silent below two attackers and two defenders (countMethod.ts:29).
2. **Pin broken with tempo.** `isRealPin` has no check, threat or discovery exit (pinGeometry.ts:135-165). The `failsWhen` must also test whether the escaping piece lands safely. compare-5 §1.1 measured the brief's first gem losing to 5…Qxg5.
3. **Early queen gets hit with tempo** (the opening's bargain).
4. **The square of the pawn** (`detectRuleOfSquare`, endgameTechnique.ts:180).
5. **King on the diagonal / two goals.** No computer exists.

**3. The other parts**

- **Chain** (new `src/coach/chain.ts`). `composeThought(kept)` orders the facts the decider kept by the F18 roles: what changed, then the tempting choice and why it fails, then not-yet, then the line, then the closing habit and knowledge (F0c). Its seeds are `depthClauses` (thinkAloud.ts:226), `deliberation`, and `methodBeat` (methodBeat.ts:116, :296).
- **Decider.** `coachDecider.decide` (coachDecider.ts:297) becomes the only door.
  - Need becomes posture-aware.
  - Subsumption runs on the claim id (kind + squares + seat).
  - `learnTurnDoor.decideTurn`, `playCommentary`'s ladder and `voicePackage`'s fixed RANK fold into it (D1).
- **Memory.**
  - One `GameLedger` keyed by claim id, replacing about 15 owners (census B §2) (D6).
  - One persistent `KnowledgeLedger` per student. It lives on `capabilityEvidence` rows with origin `'reading'` (capabilityEvidence.ts:69); this adds rows and renames nothing (R1, R6).
  - The per-game wipe of `conceptTaught` goes (learnMemory.ts:270-277). That wipe is why the pin definition repeated word for word in the next game.
- **Engine.** One `EngineRead` keyed by 4-field FEN, depth and MultiPV, shared by the singleton and the pool (census C §1) (D7).
- **Arrows.** One `factToClaims(fact)` feeds `arrowDoor.admitArrows` (arrowDoor.ts:187). A nugget draws its own geometry: the pin ray, the pawn's square, the attackers and defenders (S10).
- **Surface modes.** `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes read for real: register, posture, withholds and whether library notes may speak. Today only `registerFor` is read. Kids is a mode on the same contract (S1, S11).

**4. What gets deleted**

- **Prose-to-arrow resolvers:** `namedMoveArrows` (learnBoardTeaching.ts:432), `deriveNarrationArrows`, `coachMoveExtractor.extractMoveArrows`, `VoiceChatMic.extractArrows`.
- **Dead code:** `rankFacets` (reviewFacetRank.ts:434), `buildThreatCheckQuestion`, `computeTacticalProfile`.
- **Review's dead capped cascade:** coachFeatureService.ts:2532-3395.
- **Duplicate tables:** the roughly 12 tactic name/definition tables (G6) and 8 principle prose tables (G7) fold into the nugget and term registry.
- **Replaced deciders and memories:** `learnTurnDoor` and Review's 28 say-once Sets, once they are migrated.

**5. Build order (each phase ships on its own)**

- **P0, the smallest risk-first slice.** The `CoachFact` type plus the nugget registry with nuggets 1-3. They are wired into Learn's live alert and Review's opponent-move teaching through today's `decide`, using an adapter that keeps the facts' squares. The `KnowledgeLedger` comes in here too.
  - The student hears "a guard doesn't help when the attacker is cheaper" at 6.h3 on both surfaces. That is the slip that decided both tape games.
- **P1.** `decide` takes `CoachFact[]`; `GameLedger`; `factToClaims`; the prose resolvers are deleted.
- **P2.** The chain composer on Learn and Review; the opening reads become facts: identity, bargain, book departure as "the job the book move did".
- **P3.** The one engine read and cache key.
- **P4.** The contract drives Play-on-ask, chat, Tactics (a wrong try refuted with its nugget), Openings and Kids.
- **P5.** The trap library. An F04 "pattern with conditions" is a nugget whose `failsWhen` is engine-verified, so gems, `forkTrick`'s set-it-yourself case and the trap-ahead warning all read one registry.

**6. Tests that make the old shape impossible**

- Exhaustive `Record<NuggetId, Nugget>`. Each nugget's fire FEN must fire and its no-fire FEN must not (a negative control). The first gem's FEN must return `failsWhen`.
- A type gate: `decide()` will not take a string. A scan bans prose resolvers and string fact arrays on the coach path, extending the pattern `coachInversion.gate`, which already bans validator calls on the coach path.
- `recordTag` is required. A dual-use test proves each nugget writes held and broken evidence.
- The ledger test: a new game does not clear the term ledger, and a proven term speaks as the bare word.
- Arrow coverage: every move or square a fact names has a mark that comes from the fact; zero wordless arrows.
- No `bare` concept on a surface whose contract is live.
- F0d: the nugget and term phrase tables contain no player names.

**7. The three weighings**

- **Risk first.** Nuggets ride on host stakes, so a new nugget cannot outrank a danger. The negative-control FENs stop a deterministically wrong rule from shipping, which is exactly what the first gem would have been.
- **Smallest slice.** P0 touches one alert branch and one Review producer, plus two new leaf files.
- **Student first.** Grey teaches in full, red adds the habit, green goes quiet. The student hears years of knowledge only where their own board shows it.

**8. Which rules each part satisfies**

| Part | Rules |
|---|---|
| Fact type | F3, F0b, F0c, S10 |
| Nuggets | F01, F04, F4, F5, F9, V10, V18 |
| Ranking | D2, D4, D5, D11, F10, F17 |
| Chain | F0, F18 |
| Decider | D1, D3, D9 |
| Memory | D6, V13, R1-R4 |
| Engine | D7, D8 |
| Arrows | S10 |
| Contract | F2, S1-S11 |
| Tests | F7 |

Files read: /home/user/wt-work/RULEBOOK.md, docs/plans/swarm-inputs/questions.md, docs/plans/2026-10-07-duplicate-census.md, digests/map-brief.md, teach-brief.md, compare.md.

## design:24 (Review identity preserved while sharing everything)
**The one coach, seen from Review: Review keeps its identity because the contract says so, not because its code is separate**

**Thesis.** Review stays Review because of four settings in its contract (`coach/surfaceContract.ts:30`): looking back, walk every move, hold the answer until the student answers on the board, and tell the game's story. It keeps no computers of its own. Today that contract has one reader, `registerFor`. Its other parts (`contractFor`, `.withholds`, `.speaks`) have no reader at all (census B§4). Meanwhile Review runs its own pieces:
- 4 turning-point pickers (`CoachGameReview.tsx:783`, `:1454`).
- About 28 say-once sets (`coachFeatureService.ts:1487-1727`).
- A facet bag of strings (`reviewFullData.ts:242`).
- An arrow scraper that re-reads moves out of the finished sentence (`coachFeatureService.ts:611`).

**Architecture**

1. **The fact type, `coach/brain/fact.ts`.** This widens `VoiceFact` (`voicePackage.ts:95`), which already carries `claims`, `squares`, `fen` and `altFen`. New fields:
   - `claimId`: kind + squares + seat.
   - `role`: one of CHANGED, GOAL, REASON, OBSTACLE, REMOVE_IT, TEMPTING, LINE, HABIT, KNOWLEDGE, PRAISE, THESIS.
   - `moves` (uci + san), `line` (uci[] with the reply named), `stakes` (cp, plies), `seat`, `recordTag`.
   - No prose. Text is produced at render time.
   - Satisfies F0c, S10, D4 and R5.
2. **`brain/read.ts`, one producer per position.** `readPosition(fen, history)` merges `computePositionFacts` (`positionFacts.ts:451`) and `computeMoveFacets` (`reviewFullData.ts:242`). Every computer gets a small adapter that returns `Fact[]`. Learn and Review read the same position the same way. Satisfies F2, F4 and F06.
3. **`brain/gameRead.ts`, the whole-game layer.** This is the only thing Review uses more than other surfaces. It is still shared, so phase narration and Learn's recap can use it too.
   - One turning-point picker: merge `selectTurningPoints` (`turningPoints.ts:211`), `turningPointCandidates` and the critical-moment ask.
   - One thesis: `selectTeaching` run once, with the student's data and the game result (today the thesis says "the open file decided it" in a game the student lost; compare-3 G8).
   - The cause chain (`causalChain`), cause counts, the opponent's recurring slips, and the last chance.
   - All of it comes out as `Fact`s with the THESIS / LINE / HABIT roles.
4. **Engine, `brain/engineRead.ts`.**
   - One read, keyed on (4-field FEN, depth reached, MultiPV).
   - The pool (`gameAnalysisService.ts:708`) and the singleton both write to it, so Review's batch analysis feeds its own walk.
   - Fixes the cache key that ignores MultiPV (census C§1) and the Bf5 vs Bxf3 contradiction (rule D7).
5. **Decider.** `coachDecider.decide` (`coachDecider.ts:297`) becomes the only door.
   - It takes `Fact[]` instead of `FactBundle.facts: readonly string[]` (`:134`).
   - The need step learns about posture, which deletes Review's second need gate (`coachFeatureService.ts:2320-2340`).
   - Satisfies D1, D2, D3, D5 and D11.
6. **Composer, `brain/chain.ts`.** It orders the facts the decider kept into one F18 thought: CHANGED → TEMPTING with why it fails → REMOVE_IT ("not yet, first this") → LINE → HABIT.
   - The order lives in a `Record<Role, …>`, so a new role does not compile until it has a place.
   - Seeded from `thinkAloud.depthClauses` (`thinkAloud.ts:226`).
   - Satisfies F0, F0b and F18.
7. **Memory.**
   - `GameLedger`: one per game id, keyed by `claimId`, holding squares. A computed "it changed" verdict re-opens a fact. Refrains work on claim ids, not the regex over finished prose in `standingRefrains`.
   - `StudentLedger`: persistent, for terms (V18) and spaced repetition of ideas.
   - Satisfies D6 and V13.
8. **Arrows.** One adapter turns `Fact` moves and squares into `admitArrows` claims (`arrowDoor.ts:187`). A LINE beat draws one arrow per spoken move. No resolver reads prose. Satisfies S10.
9. **Surface modes.** `SURFACE_CONTRACT` gains `posture`, `ask`, `story`, `corpus` and `delivery`, and `contractFor` becomes the only reader. Review's entry:

   `{register:'retrospective', posture:'walk', speaks:'always', withholds:'turning-move-until-board-answer', ask:'find-on-board-one-try', story:true, corpus:false}`

   Satisfies S1, S4 and S7.

**What stays Review's own (identity)**
- Past-tense wording: one renderer, with a key for each register.
- The story: thesis, the 1-3 moments, and the recap, all from `gameRead`.
- Ask before telling on the 1-3 moments: find the move on the board, one try, then the move and why, then the cause, then the habit that fits that cause. Today the habit is hard-coded at `turningPoints.ts:173`.
- The opponent's slip spoken as the student's chance, graded Miss when it went unpunished (G5).

Everything else is shared, including the threat on a defended piece and the opening's bargain that Learn already computes (compare-2 #1, #6).

**What gets deleted**
- The dead capped cascade, `coachFeatureService.ts:2532-3395` (`isReviewUncapped` is always true, `reviewNarrationBuild.ts:28`).
- 3 of the 4 turning-point pickers.
- 4 recap producers, down to `gameRead`.
- The ~28 say-once sets.
- The prose→arrow resolver `segmentNamedArrows`.
- The Review cards (rewind, principle quiz, guided find-the-move), replaced by board taps.
- `rankFacets` (`reviewFacetRank.ts:434`, dead).
- The fallback that names a better move with no reason (`reviewFullData.ts:536`).
- Review voicing fundamentals only on the student's own moves (`:1046`). The CHANGED role covers both seats.

**Build order (each phase ships)**
- **P0, risk-first.**
  - Engine read: key the cache on depth reached and MultiPV; pool and singleton share it.
  - The signed-exchange fix, so a pawn hitting a defended piece becomes an OBSTACLE fact (`CoachTeachPage.tsx:8294`, `positionReadingService.ts:212`). This fixes 6.h3 in Learn and Review at once.
- **P1, smallest slice: Review's turning-point reveal.**
  - The `Fact` type with adapters for the reveal's sources: `betterMoveReason`, `moveFundamentals`, `principleAttribution` ignored-threat, `methodBeat`.
  - `chain.ts` composes find → one try → reason ranked by stakes → tempting choice refuted → line → habit that fits the cause.
  - Only 1-3 moments per game, so it is bounded. Compare-2 #3 and #9 are fixed when it lands.
- **P2.** `decide(Fact[])`, `GameLedger`, the arrow adapter. Review's whole walk runs through them, then the cascade and the sets are deleted.
- **P3.** Learn moves onto the same read, chain and ledger. The `learnTurnDoor` lead table becomes the roles in the mode.
- **P4.** `gameRead` produces the one thesis and recap. Phase narration reads it.
- **P5.** Chat, Tactics (`puzzleMethod.ts:41` already calls `decide`) and Openings move onto the same read; Play speaks only when asked.

**Tests that make the old shape impossible**
- **Compile:** `FactBundle.facts` no longer accepts strings; `Record<Role,…>`; `SurfaceContract` fields required, so a surface missing one does not compile.
- **Mode parity:** the same FEN in review mode and teach mode yields the same set of claim ids; only the rendered text differs. Without this, sharing everything can quietly turn back into Review-only facts.
- **Withholding:** in review mode, no spoken text names the turning move's SAN before the board answer event.
- **Scan gates:**
  - Surface files may import only `brain/*` (extend `surfaceContract.scan.test.ts`).
  - No `new Set` say-once sets in surface files.
  - `namedMoveArrows`, `deriveNarrationArrows` and `spokenLineArrows` are banned outside the adapter.
- **Tape test (Scandinavian games 1 and 2):** 6.h3 yields an OBSTACLE fact on both surfaces; every move named in speech has an arrow; no arrow without words; the habit fits the cause.
- **Engine:** the cache key includes MultiPV; the pool and the singleton return the same best move.
- **Register:** the past-tense renderer never picks a present-tense key.

**Weighed three ways**
- **Risk-first:** strangle Review from the inside. `coachFeatureService` is 5,429 lines, so it is not rewritten. Each adapter ships behind the mode-parity test.
- **Smallest slice:** P1 touches only the reveal.
- **Student experience:**
  - Review stops being a stack of separate findings.
  - Their threat is named on the move that makes it.
  - The moment is asked once, on the board.
  - The game gets one story, true to the result.

**Rulebook coverage:** F0, F0b, F0c, F2, F4, F5 (`recordTag`), F06, F18, D1-D7, D10, D11, S1, S4, S10, V13, V16 (`seat`), R5, G7 (one grade record is read).

**Read:** `/home/user/wt-work/RULEBOOK.md`, `/home/user/wt-work/docs/plans/2026-10-07-duplicate-census.md`, `/home/user/wt-work/docs/plans/swarm-inputs/digests/{map-brief,teach-brief,compare}.md`.

## design:25 (master-game references, rare and meaningful (brief item 2))
**ONE COACH: design through the master-game-reference lens (~880 words)**

**1. Architecture**

- **`Fact`** (new file `coach/fact.ts`). Every computer returns this instead of a string. Fields:
  - `claim`: kind + squares + seat
  - `role`: GOAL / REASON / OBSTACLE / REMOVE / TEMPTING / LINE / HABIT
  - `fen`, `squares`, `lines`, `stakes`, `verbs`
  - `precedent?`
  
  It grows out of `VoiceFact`, which already carries squares and claims (`voicePackage.ts:95-125`). Today `decide` takes strings and maps them to kinds by reading the text (`coachDecider.ts:340`).
- **Chain composer** (`coach/chain.ts`). This is `thinkAloud.ts` made general. It orders role-facts in F18 order on every surface.
- **Decider**: `coachDecider.decide` (`:297`) becomes the only door. It takes `Fact[]` and the surface's posture. `learnTurnDoor`, `voicePackage`'s RANK and Review's second need gate all fold into it.
- **Memory**:
  - One game ledger keyed by claim id. It replaces about 20 say-once owners (`learnMemory.ts:265`, `standingFactMemory.ts:57`, `coachFeatureService.ts:1487-1727`).
  - One student ledger for terms, ideas and precedents.
- **Engine read**: one stored read per position. The `stockfishCache` key `${fen}::${depth}` (census) gains MultiPV.
- **Arrows**: one adapter turns `Fact.lines/squares` into `arrowDoor.admitArrows` claims (`arrowDoor.ts:187`). Every resolver that reads moves back out of the prose is deleted.
- **Surface modes**: `surfaceContract` becomes `Record<Surface,{register,posture,withholds,speaks}>`. Today `contractFor` and `withholds` have no readers (map-brief §said-once).

**2. Master-game references (the lens)**

**What exists, and why it falls short**
- Review: `pickStoryGame` matches on the opening name only and takes the highest-rated game (`reviewStoryGame.ts:134-146`). It speaks a generic, app-ish sentence: "look up X… Seeing the plan in a strong player's hands…" (`:170`), against V4 and V5.
- Review lecture: `modelGameClause` gives exact-position top games, once per lecture (`reviewOpeningTheory.ts:546-557, 704-710`).
- Opening identity: a list of famous games cut at two (`openingIdentity.ts:143-144`), a G4.5 / V14 breach.
- Chat: the `lookup_player_games` tool (`coach/coachService.ts:122`).
- The 2,209 pro games have no position index (`proGameReferenceService.ts:15-46`). Most of its exports have no production caller (map.md).
- There are two different `StructureSignature` types (`structureSignature.ts:17`, `boardStructure.ts:289`). That is unreconciled rot.

**The design**

- **Offline index** (`scripts/build-precedent-index.mjs` → `public/data/precedent-index.json`, fetched lazily). It walks every ply of `model-games.json` (642 games) and `public/data/pro-game-references.json` (2,209). Each ply gets keys:
  - **K1** — the exact position (first four FEN fields) plus the move played
  - **K2** — a slip-and-punish matched against the one trap library (F04)
  - **K3** — tactic just played, plus the structure key, plus castling sides
  - **K4** — a pawn break played in a matching structure
  
  Only games the student's side won are indexed. That is already a build-time rule for pro games (`types/index.ts:390-391`) and the `modelGames-orientation` gate does the same for model games.
- **Runtime computer** `findPrecedent(host: Fact)` returns `{credit, ply, moves, tier}`. It matches only on the host fact's own claim, never on the opening name alone.
- **Rare by construction, not by a cap.** A precedent is not a `Fact`; it is a field on a host fact, so it can never speak alone (F0c). It attaches only when:
  - the host fact spoke at a deciding or teaching moment;
  - the match is K1 or K2, or K3/K4 with the same idea claim;
  - the student ledger has not already shown this idea with a game. That is V13's say-once applied to ideas.
- **What the student hears.** One clause, crediting only the game: "the same knight jump decided Carlsen–Aronian, 2019." The board offers that game; on a tap it is walked with arrows taken from its real moves (S10). Play stays silent unless asked (S5).
- **Openings first.** The Teach-me Catalan lesson draws its "how this opening is played" game from the indexed pro and model games (the brief counts Carlsen's 15 Catalans; the index's pro-game source and K1/K3 keys cover them).

**3. Existing file → part**

| Existing file | Becomes |
|---|---|
| `reviewOpeningTheory.modelGameClause`, `reviewStoryGame`, `openingIdentity.famous`, `proGameReferenceData` | sources for the precedent index |
| `structureSignature.ts` + `boardStructure.ts` | one structure key |
| `thinkAloud.ts` | the chain composer |
| `coachDecider.ts` | the decider |
| `arrowDoor.ts` | the only board door |

**4. Deleted**
- `pickStoryGame`'s text (`:170`)
- `modelGameClause` (`:546`)
- the famous-game cut (`:144`)
- one of the two `StructureSignature` types
- the unused `proGameReferenceService` exports and the second (Dexie) copy of the pro games
- `buildOpeningMoveDetail`'s "your bread-and-butter" line, which reads the reference coach's own games to the student (map-brief, Openings)

**5. Build order (each phase ships on its own)**

- **P0, the smallest real slice.** Index K1 from the two sources. Learn's opening facts (`openingAnnouncement`, `refutedAlternative`) and the Review lecture take precedents through `decide`. `modelGameClause` and `pickStoryGame` are deleted in the same commit.
- **P1.** `Fact` type, claim ids and the game ledger; `decide` takes `Fact[]`.
- **P2, gem precedents (F02).** K2 against the one trap library. Measure the hit rate first: masters rarely play gem slips, so the pros' chess.com blitz games are the likely source.
- **P3, the chain composer on every surface.** Review moves off its bag of tagged strings (`reviewFullData.ts:242`).
- **P4, middlegame precedents (K3/K4).** Enabled only after a measurement test over 15 real games shows precedents rare (median at most one a game) and on-idea.
- **P5, walk the game on tap.**

**6. Tests that make the old shape impossible**
- **Type rule**: a precedent needs `host: ClaimId`, so a precedent with no host fact does not compile.
- **`oneGameCitation.gate`**: fails on any template naming players outside the precedent renderer. It bans "he teaches" / "his" / counts such as "4 of 6" (F0d, V8).
- **`precedentTruth`**: every indexed ply is chess.js-legal and the credited side won, with a negative control.
- **`precedentRarity.measure`**: over real games, every precedent shares its host's claim kind.
- **`decideOnlyDoor`**: extends `coachDecider.test`'s gate (CLAUDE.md G4.5.15) so no surface cites a game outside `decide`.

**7. Rules satisfied**

| Rule | How |
|---|---|
| F0d | credit the game, never the teaching voice |
| F2, S1 | one finder on every surface |
| F0c | a precedent fills no role on its own |
| D1, D5 | the decider places it |
| D6, V13 | ledger says it once |
| D8 | real games only |
| D9 | the audit row records the tier |
| D10 | the precedent's match is computed by the finder; its claim never comes from the prose |
| V14 | no cap, only an idea-level say-once |
| S10 | arrows come from the game's own moves |
| F02, F04 | openings and gems first |

Files read: `RULEBOOK.md`, `docs/plans/swarm-inputs/questions.md`, `docs/plans/2026-10-07-duplicate-census.md`, and the three digests in `docs/plans/swarm-inputs/digests/` (only parts of `map-brief.md` and `teach-brief.md`, located by searching on the game-reference topic).

## design:26 (the reference coach as the bar: how each of his teaching acts maps to one computer)
**One Coach: design, seen through the reference coach's teaching acts**

**1. The fact type** (`coach/brain/fact.ts`)

`TeachFact = { act, role, verb, seat, claimId, squares, lines:{fen,uci[]}[], stakes, text?, changed? }`

- `role` is one of GOAL, REASON, OBSTACLE, REMOVE_IT, TEMPTING, LINE, HABIT, KNOWLEDGE or PRAISE (F0c).
- `claimId` is the fact's kind plus its squares plus the seat. It replaces the ~12 key shapes listed in map-brief:316.
- It joins the two partial shapes that already exist: `VoiceFact` (voicePackage.ts:95) has claims and squares, and `DepthClause` (thinkAloud.ts:191) has lines, stakes and claim.
- A computer returns facts, never a sentence. Words are produced at the end by typed renderers (piece, pawn, line, move-with-consequence, seat word).

**2. Each teaching act maps to one computer** (`coach/brain/acts.ts`)

`ACTS: Record<TeachingAct, Computer>` covers every act in the teach-brief catalogue. Because it is a `Record`, a new act fails to compile until a computer and a role are named for it (F7). Each act section collapses onto one owner:

| Section of the reference coach | One computer, built from | Role |
|---|---|---|
| A. Opening: named, its bargain, theory, your level | `openingRead`: openingAnnouncement:54, openingIdentity:85 (falls back to the family name when the variation entry is empty), ONE book oracle replacing bookDeparture:49, theoryDeparture:73 and four others, refutedAlternativeCore:159 | GOAL, KNOWLEDGE, TEMPTING |
| B. Traps | `trapLibrary` (F04): gemCrushLines:564, forkTrick:81, plus the new pin broken with tempo next to pinGeometry.isRealPin:135 | TEMPTING, LINE, OBSTACLE |
| C. Weighing, "not yet", lines | `weigh`: deliberation.buildDeliberation:144, refutedAlternative:81, thinkAloud.depthClauses:226 | TEMPTING, REMOVE_IT, LINE |
| D. Reading their move | `theirMove`: moveInsight:573, opponentIntent:55, theirMoveCost:60, falseAlarm:37, plus ONE threat fact replacing detectNewThreat (groundedAnswer:6890) and computeMustDefend (threatOut:71). It uses the signed exchange count, not the version floored at 0 (positionReadingService:212) | OBSTACLE |
| E. Prevention | moveIntent:124 | REMOVE_IT |
| F. Tactics and geometry | tacticsDetector, pinGeometry, countMethod:17, loosePieces:35 | GOAL, KNOWLEDGE |
| H. Trades | ONE trade verdict, merging tradeJudgement:40 and tradeQuality.readTrade | REASON |
| I. Plans | ONE plan fact, merging structurePlan, deriveNextPlans and mastersPlanRead | GOAL |
| J. Endgame | conceptEngine.endgameConceptFor | KNOWLEDGE |
| K. Method | methodBeat:116/296 | HABIT |
| Review story | teachingSelector:347 merged with turningPoints:211 | GOAL (thesis) |

**3. The chain** (`coach/brain/chain.ts`)

`compose(facts, mode)` builds one thought in F18 order:
1. what their move changed;
2. the tempting choices and the concrete reason each fails;
3. "not yet, first this";
4. the line, with their reply in words;
5. what the opponent keeps doing wrong;
6. the habit that finds it next time.

Every link is joined by a "so" or a "but" (F0b). A fact that fills no role is never said.

**4. The decider**

`coachDecider.decide` (coachDecider.ts:297) becomes the only door. Its need step gets a posture input, which Review lacks today (map-brief:311).
- `learnTurnDoor.decideTurn` (:319), the playCommentary ladder, voicePackage's fixed RANK and the Review pre-gates all fold into it.
- It decides how much is said, never whether a move is spoken about (D3, V11).
- Brief mode keeps the top-ranked links, never the first two sentences (V15).

**5. Memory**

- `GameLedger`: one per game, keyed by `claimId`, holding squares. A computed "it changed" verdict re-opens a claim. It replaces about 16 owners (census B§2), and it is what lets a refrain re-highlight the square it refers back to.
- `StudentLedger` in Dexie, behind a migration (R6): terms (V18), ideas due again, and the student's own move here last time (F18 step 2).

**6. Engine read**

One read per position, keyed by (4-field FEN, depth reached, MultiPV), shared by the singleton and the worker pool. Every option is set and restored on each search. This fixes the cache key at stockfishCache.ts:33, which ignores MultiPV.

**7. Arrows**

`factToClaims(fact)` feeds `arrowDoor.admitArrows` (arrowDoor.ts:187). Each line is drawn one arrow per spoken move, timed to the words, then cleared at the end of the idea (S10). No resolver ever reads prose. A new highlight door works the same way.

**8. Surface modes**

`SURFACE_CONTRACT` (surfaceContract.ts:30) is made real: today only `registerFor` is read, so `withholds` and `speaks` gain readers. Play, Tactics, Openings, Kids and chat are added. A mode sets only tense, when to speak, what is held back and how it is shown (S1). The ask decider follows F05.

**9. Record**

One writer: every fact the board posed records held or missed against its `claimId`, on every surface (F5, R1).

**What gets deleted**
- Dead code: `rankFacets` (reviewFacetRank:434), `buildThreatCheckQuestion`, `components/Play/*`.
- The dead Review cascade at coachFeatureService.ts:2532-3395 (`isReviewUncapped` already defaults to true).
- The five prose-to-arrow resolvers: learnBoardTeaching.namedMoveArrows:432, narrationArrows.deriveNarrationArrows:180, arrowEngine.spokenLineArrows:515, coachMoveExtractor:55 and VoiceChatMic.extractArrows:32.
- The side graders: tacticClassifier.classifyMoveQuality:142, classifyEvalSwing:109, detectGreatMove:77, gradeGuess:239 (G8).
- The 16 memories, and the `computeMoveFacets` string bag (reviewFullData:242).

**Build order** (each phase ships on its own)

- **P0** (risk first, smallest slice): use the signed exchange count in Learn's cheaper-attacker alert. 6.h3 hitting the g4 bishop decided both tape games (compare:1 #1). Add the `TeachFact` type, with an adapter from `VoiceFact`/`DepthClause`.
- **P1**: GameLedger and factToClaims on Learn. Measured target: named moves arrowed 100%, wordless arrows 0.
- **P2** (the first change the student hears): the chain on Learn through positionFacts:1009, which is already the single producer. Remove the fullmove<10 off-switch on deliberation (positionFacts:463/480) so the opening weighs too (F02). Pass `history` so the opponent-habit fact can fire.
- **P3**: Review moves onto the chain, and the cascade is deleted.
- **P4**: one engine read.
- **P5**: openingRead, trapLibrary, a gem steerer, and the pin broken with tempo. Acceptance: David hears the first gem taught.
- **P6**: chat, Tactics, Openings WLPP and Kids modes, plus the one record writer and one record reader.

**Tests that make the old shape impossible**
- `brainDoor.gate`: no file outside `coach/brain` calls importance, selection or ranking directly. This extends `coachDecider.test`.
- `ACTS` stays exhaustive over every act in the catalogue. A computer that returns `string` fails the type check.
- `admitArrows` accepts only `TeachFact`-derived claims, so a string input does not compile.
- `oneLedger.gate`: no said-key `Set` exists outside GameLedger.
- `surfaceContract.gate`: every field has a reader, and every surface is declared.
- `oneGrader.gate`, plus an engine-key test that MultiPV and depth reached are part of the key.
- An arrow-coverage audit row asserts 100% of named moves arrowed and 0 wordless arrows.
- A chain test: on 6.h3 (Scandinavian, Lasker line) the output contains an OBSTACLE about the g4 bishop.

**Rules each part satisfies**

| Part | Rules |
|---|---|
| Fact and acts | F0c, F01, F3, F4, F8, R5 |
| Chain | F0, F0b, F18, V7 |
| Decider | D1, D2, D3, D4, D5, D9, D11, V14, V15 |
| Memory | D6, V13, V18 |
| Engine read | D7 |
| Arrows | S10 |
| Modes | F2, S1 to S11 |
| Record | F5, F9, R1 to R4 |
| Trap library | F04 |
| Build order | F14, B4 |

All file references are under `/home/user/wt-work/src`.

## design:27 (minimal first slice that ships tonight and proves the one brain end to end)
**The one coach: minimal-first-slice design**

**Lens verdict.** The first slice is one chess fact that goes through the whole brain on two surfaces. That fact is **"their pawn hits your defended piece"**. It decided both tape games: 6.h3 against Bg4, then g5 and c3 (compare-1 #1, compare-2 #1–2, compare-3 G1). I weighed it three ways:
- **Risk-first:** it adds a new path beside the old ones and deletes nothing tonight.
- **Smallest:** it is one fact kind.
- **Student-first:** it fixes the actual loss in both games.

The opening gem is the higher-value fact (F02). But it needs a gem steerer and the trap library first, so it is too big for tonight.

**Architecture**

1. **`CoachFact`** (new, `src/coach/fact.ts`). This one typed fact replaces today's prose strings:
   - `id`: a claim key built from kind + squares + seat. This replaces about 12 different key shapes (map: said-once).
   - `kind`, `role`, `verb` (the F01 verb it serves) and `seat` (whose piece it concerns: student or opponent).
   - `squares`, `lines` (SAN from the fen), `stakes` (`FactStakes`, factStakes.ts:27) and `fen`.
   - `role` is a union of GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE and HABIT.

   `VoiceFact` (voicePackage.ts:95) already carries `claims`, `squares` and `lines`. It becomes the rendered output of a CoachFact, not something a producer writes.

2. **The chain: `thinkChain.compose(facts, register)`.** It orders roles the way F18 does: what changed → OBSTACLE → TEMPTING and why it fails → REMOVE-IT ("first this") → LINE → HABIT. A missing role is skipped. A fact with no role cannot be built, because the type makes `role` required (F0c).

3. **The decider: `coachDecider.decide` stays the one door** (coachDecider.ts:297).
   - `FactBundle.facts` changes from `readonly string[]` (:134) to `readonly CoachFact[]`, so the `squares` side map (:140) goes away.
   - Subsumption (merging two facts that say the same thing) and stakes ordering then work on ids, not on text.

4. **Memory: one `gameLedger` per game, keyed by `CoachFact.id`.** It also holds a re-open rule ("the stakes or squares changed"). Every lane and surface reads it. It absorbs `learnMemory` (learnMemory.ts:52) and `standingFactMemory` (:52) first.

5. **Engine read: `positionRead(fen4, depth, multiPv)`.**
   - It fixes the cache key in stockfishCache.ts:33 (`${fen}::${depth}`), which ignores MultiPV.
   - The worker pool reads it too, so the batch analysis and the live surfaces share one cache.

6. **Arrows: `factMarks(fact)` → `arrowDoor.admitArrows`** (arrowDoor.ts:187). Every arrow and highlight comes from a fact's `lines`/`squares`, never from the sentence (S10).

7. **Surface modes: `SURFACE_CONTRACT`** (surfaceContract.ts:30).
   - Add `play` and `posture`, and make `withholds`/`speaks` actually read. Today only `registerFor` is read (census B4).
   - A surface may change tense, timing, what it withholds and how it shows things (S1). Nothing else.

**First slice: what gets built tonight (Phase 0)**

- **Producer:** `threatByCheaper(fen, seat)` → a CoachFact with role OBSTACLE.
  - It uses the signed exchange read `signedCaptureRead` (positionReadingService.ts:207), not the version floored at 0 (`legalSeeGainFor`, :212).
  - That floor is the root cause of the miss: Learn's own branch at CoachTeachPage.tsx:8294 treats a losing capture as an answer.
  - The wording comes from the How-to-Think sentence (thinkingSafetyStep.ts:53), with the seat word added.
- **REMOVE-IT:** the existing kick/retreat reason in moveFundamentals.ts:393 (the "kicks their bishop off g4" text), filled into the slot.
- **HABIT:** the opponent-threat habit at methodBeat.ts:142.
- **Wiring:** both Learn's live turn and Review's threat callout (coachFeatureService.ts:2913) call the same producer → compose → decide → ledger → factMarks. Each passes only its register (present tense vs looking back).
- **Record:** on a miss, `recordCapabilityEvidence` (capabilityEvidence.ts:466) writes the same claim id as red. It writes green when the student answered the threat on their own. That makes the computer work both ways (F4, F5).

**Phases (each one ships on its own)**

| Phase | Build | Deletes |
|---|---|---|
| P0 (tonight) | The slice above | Nothing |
| P1 | Move `thinkAloud.depthClauses` (thinkAloud.ts:226, already typed), `deliberation` and `refutedAlternative` onto CoachFact. Review gets the chain; today it hears almost none of it (map: think-aloud). Turn deliberation on in the opening (positionFacts.ts:463). | Review's dead "capped cascade" (coachFeatureService.ts:2532–3395) |
| P2 | One grader writes one stored verdict per move (grade, better move, refutation line). That record fills TEMPTING and LINE. | `classifyEvalSwing`, `detectGreatMove`, `gradeGuess`, `tacticClassifier.classifyMoveQuality` (census A1) |
| P3 | One engine read (`positionRead`) | Per-FEN narration cache `hooks/stockfishFenCache.ts`; the per-call MultiPV options that leak between searches |
| P4 | One ledger. learnTurnDoor's lead table becomes role order inside `decide`. | `learnTurnDoor.decideTurn`, `playCommentary`'s ordering ladder, about 14 memory owners, `rankFacets` (dead) |
| P5 | All arrows come from facts | 5 prose→arrow resolvers (census G11), and `MAX_GREEN_ARROWS_PER_PLY`, replaced by line arrows timed per move (questions.md item 6) |
| P6 | One reader of the student record (R4) | Legacy `weaknessAnalyzer` readers; dead `tacticalProfileService` |
| P7 | Chat and Kids go through the door | — |

**Tests that make the old shape impossible**

- **Type gates:**
  - `FactBundle.facts: CoachFact[]`, so passing a string fails to compile.
  - `Record<FactRole, RoleSlot>` in the composer, so a new role fails to compile until someone places it.
  - `Record<CoachSurface, SurfaceContract>` must cover `play`.
- **Parity test:** on one fen, Learn and Review produce the same set of claim ids, and differ only in register (F2, S1).
- **Ban gates:** importing a prose→arrow resolver fails, and so does calling the floored `legalSeeGainFor` on a threat-answer path.
- **6.h3 regression test:** on the tape position, the fact is emitted, the arrow h3→g4 is drawn and a red row is recorded. It must fail on today's code (B4).
- **Ledger test:** one claim id is spoken once per game and re-opened only when its stakes change (D6, V13).
- **Coverage emit:** every spoken line reports named moves vs arrows drawn, so "named moves arrowed 100%, wordless arrows 0" becomes a measured contract, not a hope.

**Rules each part satisfies**

| Part | Rules |
|---|---|
| CoachFact | F0c, F3, F6, S10, R5 |
| Composer | F0, F0b, F18 |
| Decider | D1–D5, D9, D11, G9 |
| Ledger | D6, V13, V18 (persistent term ledger comes later) |
| Engine read | D7 |
| factMarks | S10, D10 |
| Record write | F4, F5, F9, R1–R3 |
| Contract | S1–S5, V15 |
| Slice choice | F00, F01 (IDENTIFY, PREVENT, KNOWLEDGE), F14 (map wide, touch little) |

**Open, and owed to David (B6):** the pin-broken-with-check computer and the gem steerer are new computers. They need his yes before P1 can take on the gem.

## design:28 (adversarial-first: the design that is hardest to break)
**One Coach design, built so the old shape cannot be written again**

**Lens.** I designed so the old shape can't come back: each wrong shape fails to compile or fails a gate (F7). Three other ways of weighing it are folded in. Risk-first moves the engine read and the signed exchange count to the front. Smallest-slice makes the first chain ship on Learn's opening. Student-first makes that slice the gem David has never heard.

**1. The fact type: `CoachFact` (new file `coach/fact.ts`)**

Every field is required, so a computer that leaves one out does not compile:
- `claimId`: fact kind + squares + seat. It replaces the 12 key shapes noted in map-brief.md:316.
- `role`: `Record<Role, …>` over GOAL | REASON | OBSTACLE | REMOVE_IT | TEMPTING | LINE | HABIT | KNOWLEDGE | CHANGED (F0c).
- `seat`: student | opponent | none (V16).
- `marks`: `{moves: Uci[], squares, lines: Uci[][]}`.
- `stakes`: cp and plies-to-land, carried over from today's `factStakes`.
- `verbs`: F01 verbs, non-empty (brief 3f).
- `evidenceTag`: a `CapabilityTag | null` where null must state a reason. That makes F5 dual-use structural.
- `engineRef`: the key of the one engine read it used.

The model already partly exists. `VoiceFact` carries `claims`, `squares` and `lines` (voicePackage.ts:95) and `ClauseItem` sits at positionFacts.ts:347. They become thin aliases, then are removed.

**2. The modules**

| Module | Becomes / absorbs | Rules |
|---|---|---|
| `coach/engineRead.ts` | `stockfishCache` (key `${fen}::${depth}`, stockfishCache.ts:33) plus the pool adapter at gameAnalysisService.ts:921. Key = 4-field FEN, depth reached, MultiPV. The pool and the singleton share it, and options are restored on every search. | D7 |
| `coach/computers/*` | Every fact computer, behind one `Computer<Input>` interface that returns `CoachFact[]`. Duplicates collapse onto one per question (census A, groups 1–15). For example, "is it hanging" uses the signed exchange count only (`signedLegalSeeFor`, positionReadingService.ts:236). The floored `legalSeeGainFor` (:212) is not allowed on any threat path. | F3, F4, F8 |
| `coach/ledger.ts` | One per-game store keyed by `claimId` and carrying squares, plus a computed "changed" verdict that reopens a fact. It replaces the 15 memories (census B§2). A separate per-student store holds the term ledger and the idea ledger. | D6, V13, V18 |
| `coach/decide.ts` | Grows out of `coachDecider.decide` (coachDecider.ts:297), which already does importance, then need, subsume, floor, order, method. It takes in the work of `learnTurnDoor.decideTurn` (:319, including `DNA_BEAT` :122), `playCommentary`, the ranking in `voicePackage`, the pre-gates in `teachingSelector` and Review's pre-gates (coachFeatureService.ts:1487-1727). Its need step knows the posture. | D1–D5, D11 |
| `coach/compose.ts` | The only function that turns facts into sentences. It walks the F18 order: CHANGED → TEMPTING (each fact with its refutation) → REMOVE_IT ("not yet, first this") → LINE (their reply in words) → HABIT. It seeds from `thinkAloud.depthClauses` (called at positionFacts.ts:1009) and `deliberation` (turned on for the opening, fixing positionFacts.ts:463). Brief = the top-ranked links, never a clipped sentence (it replaces the `applyBriefVoiceCap` truncation in this role). | F0, F0b, F18, V15 |
| `coach/render/*` | Typed renderers: piece, pawn, line, seat word, move-with-consequence. Each returns `{words, marks}`. They replace about 40 piece-name tables, 8 SAN-to-words renderers and 18 inline list joins (census C, G1–G3). | V1, V2, V8, V9 |
| `coach/marks.ts` | One fact-to-claim adapter feeding `arrowDoor.admitArrows` (:187), plus a new highlight door. A line is drawn one arrow per spoken move, then cleared at the end of the idea. | S10 |
| `coach/surfaceMode.ts` | `SURFACE_CONTRACT` (surfaceContract.ts:30), made authoritative: `Record<Surface, {tense, posture, withholds, speaks, renderMode}>`. Play gets an entry with `speaks:'on-ask'`, replacing the constant at CoachGamePage.tsx:281. Kid mode is a render mode. | S1–S11 |
| `record/one.ts` | One reader and one writer over `capabilityEvidence` (recordCapabilityEvidence :466). One rule decides green. One vocabulary map round-trips. | R1–R5 |
| `traps/library.ts` | One table that passes the F04 bar. It replaces the 8 trap systems and adds the pin-that-breaks-with-tempo computer and a gem steerer. | F04 |

**3. Build order (every phase ships to main)**

- **P0, root fixes:**
  - Use the signed exchange count on the threat lane (CoachTeachPage.tsx:8294; compare-1 #1, the 6.h3 silence).
  - Introduce `engineRead`, keyed on depth reached and MultiPV.
  - Relax the `slipsAllowed` gate (coachGameEngine.ts:247) so it reads the record, not an Elo of 1000.
- **P1, facts in shadow mode:** wrap the existing computers with adapters that emit `CoachFact`. Nothing speaks differently yet. An audit row compares the facts against today's lanes.
- **P2, first full slice (Learn opening + traps):** `traps/library` plus the pin-broken-with-check computer go through ledger → decide → compose → marks on Learn plies 1–15 only. Acceptance: David hears the Bg4 gem taught.
- **P3, all of Learn:** delete `learnTurnDoor`, the `playCommentary` ladder, the prose resolvers and the Learn memories.
- **P4, Review:**
  - Facets become facts.
  - Delete the dead cascade (coachFeatureService.ts:2532-3395), 3 of the 4 turning-point pickers and 3 of the 4 Review recap producers (census B§5).
  - Retire `segmentNamedArrows`.
- **P5, the other surfaces:** chat assemblers, Play-on-ask, Tactics refutations, Openings Watch beats and Kids.
- **P6, grader and record:**
  - One grader per G1–G4, one stored verdict per move (G7).
  - The six green rules become one (R3).
  - Merge the theme maps.

**4. Deleted outright**
- `rankFacets` (reviewFacetRank.ts:434), `buildThreatCheckQuestion` and `computeTacticalProfile`.
- `components/Play/*`.
- `stockfishFenCache`.
- 4 of the 5 prose-to-arrow resolvers.
- The side graders (`classifyEvalSwing`, `detectGreatMove`, `gradeGuess`).
- `MAX_GREEN_ARROWS_PER_PLY`.

**5. Tests that make the old shape impossible**
1. **Import gate:** no file under `components/` or `hooks/` imports from `coach/computers/*` or calls `voiceService.speak*` with a string that did not come from `compose`.
2. **Construction gate:** `CoachFact` can only be built by `makeFact()`, which enforces non-empty `marks` whenever the words name a move or square, and non-empty `verbs`.
3. **Marks property test:** for every composed line on 20 real games, every move it names gets an arrow and every arrow belongs to a line. Measured 100% / 0, negative-controlled.
4. **Seat flip:** the same position from the other seat produces no "you" claims about the other side.
5. **One-each gates:** exactly one `decide`, one ledger owner, one engine cache and one grader (blamed by statement).
6. **Exhaustiveness:** `Record<Role,…>`, `Record<Surface,…>` and `Record<TacticType, Theme>` with a round-trip test (R5).
7. **Dual-use:** every computer declares an evidence tag or a reason it has none (F5).
8. **Gem acceptance, tested end to end:** the slip on the board → a TEMPTING plus LINE chain spoken → arrows drawn → the record goes red or green.

**6. What breaks it, and the answer**
- Adapters that just wrap prose: the construction gate rejects marks parsed back out of the words.
- Shadow mode hiding regressions: the audit row compares lanes against facts on real tapes, and a fact that disappears fails the run.
- A surface sneaking in its own speech: the import gate, plus `speaks` read from the surface table.

All file:line references above were spot-checked against `/home/user/wt-work/src` except the gem gate at CoachTeachPage.tsx:7645 and :8487, which comes from map-brief.md:243. Inputs read: `/home/user/wt-work/RULEBOOK.md`, `/home/user/wt-work/docs/plans/2026-10-07-duplicate-census.md` and `/home/user/wt-work/docs/plans/swarm-inputs/digests/{map-brief,teach-brief,compare}.md`. teach-brief.md was read to line 505 of 638 and compare.md to line 605 of 740, so the last sections of each were not read.

## design:29 (simplest possible design)
**ONE COACH: the simplest design**

**The idea.** Build nothing new where something already works. Five layers already exist and are half-wired. The design promotes one existing module per layer to be the only one, gives the fact type the fields it lacks, and deletes the copies.

**The chain (one function per box, every surface)**

`Board → Read → Computers → Decide → Compose → Render(surface) → {Voice, Arrows, Record}`

1. **Read: one engine read.** `stockfishCache` becomes the only cache. The key changes from `${fen}::${depth}` (stockfishCache.ts:33) to (4-field FEN, depth reached, MultiPV). The worker pool (gameAnalysisService.ts:708) reads and writes through it. Options are restored after every search. This satisfies **D7**.
2. **Fact: one type.** Extend `VoiceFact` (voicePackage.ts:95), which already carries `claims`, `squares` and `fen`. It gains these required fields:
   - `role` (GOAL | REASON | OBSTACLE | REMOVE | TEMPTING | LINE | HABIT | CHANGED | NUGGET)
   - `claimId` (fact kind + squares + seat)
   - `seat`
   - `lines` (UCI)
   - `stakes` (cp and plies, already used by factStakes)
   - `verb` (an F01 verb)

   Because the fields are required, a computer that returns prose fails to compile. This satisfies **F0c, S10, V16, F01-f**.
3. **Computers.** The existing pure functions (detectTactics, threatAnswer, deliberation, thinkAloud.depthClauses at thinkAloud.ts:226, moveFundamentals, openingIdentity, gemCrushLines, recaptureChoice and the rest) each return `Fact[]`, never a sentence. `positionFacts.computePositionFacts` (positionFacts.ts:451) is the one place that calls them all, on every surface. It computes everything and keeps everything (**F06**). Learn's 50 lanes become computers, not deciders.
4. **Decide.** `coachDecider.decide` (coachDecider.ts:297) is the only door. Its steps stay as they are: importance, then need (made posture-aware), subsume, floor, order by stakes, habit. It now returns `Fact[]`, not strings. These are deleted: `learnTurnDoor.decideTurn` (learnTurnDoor.ts:319), `playCommentary.buildPlayCommentary`, the order step in voicePackage, Review's pre-gates (coachFeatureService.ts:1487-1727) and the dead `rankFacets`. This satisfies **D1–D5, D9, D11, G9**.
5. **Compose (new, about 200 lines).** `composeChain(facts)` puts the kept facts in F18 order:
   - CHANGED, then GOAL/OBSTACLE
   - TEMPTING (each followed by its refutation)
   - REMOVE ("first this")
   - LINE (their reply named)
   - HABIT

   Each role is joined to the next with "so" or "but" (**F0b**). The phrases come from one typed renderer set: piece, pawn, line, move-with-consequence, seat word. It replaces about 40 piece-name tables and 6 SAN renderers. Wording rotates on `claimId + ply` (**F6, V12**). Brief keeps the first N roles by rank and never cuts a sentence mid-thought (**V15**).
6. **Render by surface mode.** `SURFACE_CONTRACT` (surfaceContract.ts:30) becomes the only mode table:
   - It gains entries for `play`, `tactics`, `openings` and `kid`.
   - It gains a `posture` field, which replaces the 6 hard-coded walk/interrupt literals.
   - Every field gets a reader: `register` (the tense), `withholds`, `speaks`, `posture`, `notation`.

   Today only `registerFor` is read; `contractFor`, `withholds` and `speaks` have zero readers (census B§4).
   - Play: `on-request`.
   - Review: `withholds` until the student answers.
   - Kid: no SAN.

   This satisfies **S1–S11, F2, V11** (walk posture means every ply gets a clause).
7. **Memory: one GameLedger** of `claimId → {squares, state}`. It replaces learnMemory (learnMemory.ts:52), standingFactMemory, the 28 Review Sets, and the refs on CoachTeachPage, CoachGameReview, useLiveCoach and CoachGamePage. A changed state re-opens a fact; a repeat becomes a refrain carrying its squares. A **StudentLedger**, persisted, holds the terms taught (**V18**) and ideas due for spaced repetition (brief 3d). This satisfies **D6, V13**.
8. **Arrows.** `factToClaims(fact)` is the only input to `arrowDoor.admitArrows` (arrowDoor.ts:187). A LINE draws one arrow per spoken move, in order, then clears at the end of the idea. That removes `MAX_GREEN_ARROWS_PER_PLY` (openingGenerator.ts:1296). These are deleted: namedMoveArrows, deriveNarrationArrows, spokenLineArrows, extractMoveArrows and VoiceChatMic's tag parser. This satisfies **S10**.
9. **Record.** Every fact with a role is dual-use. When the board posed it and the student answered, the result goes to `recordCapabilityEvidence` (capabilityEvidence.ts:466) as held or broken. The verdict is written once to `moveVerdictStore.saveVerdict`. `capabilityProven` (capabilityEvidence.ts:265) is the only reader. This satisfies **F4, F5, F9, G7, R1–R4**.

**Build order (each phase ships to main)**

- **P1: tracer bullet, the 6.h3 moment on Learn.** This is the gap that decided both taped games: a pawn attacked a defended piece and the coach said nothing. The phase:
  - Fix the floored exchange count at its root: Learn's gate at CoachTeachPage.tsx:8294 must use the signed count (positionReadingService.ts:242), not `legalSeeGainFor`, which floors at zero (:212).
  - Ship the new Fact type, `composeChain`, `factToClaims` and GameLedger for one fact family: a threat to your piece, with its answer, its tempting move and the habit. It runs through `decide`.

  It is the smallest slice that exercises every layer, carries the most risk if the shape is wrong, and is the first thing the student will actually hear.
- **P2: Learn fully on the chain.**
  - Every Learn lane emits Facts, then `learnTurnDoor` and `playCommentary` are deleted.
  - The opening goes first (**F02/V19**): openingIdentity falls back to the family entry, the bargain sentence, a per-move job for each opening move, and the trap set or trap avoided as TEMPTING plus LINE.
  - Learn reads the hand-written lesson beats by position (compare-4 G8).
  - Deliberation turns on before move 10.
- **P3: engine read unified.** Change the cache key, route the pool through the cache, restore options after each search. It ships alone because the risk is isolated.
- **P4: Review.**
  - `computeMoveFacets` (reviewFullData.ts:242) returns Facts.
  - Delete the dead cascade (coachFeatureService.ts:2532-3395) and `segmentNamedArrows`.
  - The 4 turning-point pickers become `selectTurningPoints` alone, with the ignored-threat cause added.
  - One stake-ranked reason replaces whyBetter, betterMoveReason and moveFundamentals' rescue reason.
- **P5: chat, Play-on-ask, Tactics, Openings Watch.** The groundedAnswer assemblers become computers. The routers collapse onto `dispatchCoachTurn` → `decide`.
- **P6: one grader and one record.** One `gradeMove` with Best, Excellent, Great and Miss added. Delete the five side graders. One weakness reader. The vocabulary maps become an exhaustive `Record`.

**Deleted overall:** 8 deciders, about 14 say-once memories, 4 prose-to-arrow resolvers, the second cache and the pool's private reads, about 40 piece-name tables, 5 SAN renderers, 17 inline list joins, 5 graders, the dead cascade, components/Play, and `rankFacets`, `buildThreatCheckQuestion` and `computeTacticalProfile`.

**Tests that make the old shape impossible**

| What the test enforces | Rule |
|---|---|
| Fact fields are required, so a computer returning a string fails to compile | F0c |
| `Record<FactKind, Role>` is exhaustive, so a new fact kind needs a role before it compiles | F0c |
| The existing gate that bans calling the decider's parts directly extends to `decideTurn`, `buildPlayCommentary` and `selectTeaching` outside the door | D1 |
| Ban imports of the prose-to-arrow resolvers; a walk must show named moves arrowed 100% and wordless arrows 0 | S10 |
| Ban any say-once ledger outside GameLedger | D6 |
| The cache key includes MultiPV, and the pool reads through the cache | D7 |
| Every SURFACE_CONTRACT field has a production reader, and Play speaks nothing unless asked | S1, S5 |
| Every fact that speaks carries an F01 verb | F01 |
| No `I`, `we` or numbers in rendered output | V1, V8 |
| No `speak(` call on a coach surface outside the renderer | F2 |

Any change to `WALKTHROUGH_GEN_REV` happens once, in P2.

**The three weighings I made before settling**
- **Risk-first:** P1 proves every layer on one fact before anything is migrated in bulk, and P3 isolates the engine change.
- **Smallest slice:** one fact family, end to end, on Learn, where positionFacts already feeds `decide`.
- **Student first:** P1 fixes the silence that lost both taped games, and P2 makes the opening the first thing the coach teaches.

## design:30 (audit instruments: how a hand walk proves teaching, accuracy and arrows)
**ONE COACH: design through the audit lens (how a hand walk proves teaching, accuracy and arrows)**

**Core move:** if every fact carries its role, squares, moves, seat and engine read all the way to the voice, the hand walk can check structure instead of scraping prose. Today `tape-verify.mjs:1-11` reads sentences and settles only about 40% of them. Claims that come with a fact attached can each be checked by a test.

**1. Architecture**
- **The fact type, `coach/fact.ts` (new).** `ChessFact {claimId: kind+squares+seat, kind, role, seat, fen, squares[], moves(uci)[], line(uci)[], stakes{cp, plies}, verb(F01), source, readKey}`. It grows out of `VoiceFact` (`voicePackage.ts:95`), which already holds claims and squares but loses them at `decide()`.
- **Engine read, `coach/engineRead.ts`.** One read keyed by (4-field FEN, depth reached, MultiPV), shared by the singleton and the pool. This fixes `stockfishCache.ts:2` (key ignores MultiPV) and the pool's separate reads (`gameAnalysisService.ts:566,772`). Every fact stamps its `readKey`.
- **Computers.** Each computer emits `ChessFact` instead of a string:
  - threats: `detectNewThreat` and `computeMustDefend` become one fact;
  - reasons: `explainBestMoveGrounded`, `betterMoveReason` and `deliberation` become one stake-ranked reason list;
  - one grader: `accuracyService.gradeMove`.
- **Chain, `coach/chain.ts`.** Built from `thinkAloud.depthClauses` (`thinkAloud.ts:226`), `deliberation` and `methodBeat`. It assigns the F0c roles in F18 order: what changed, tempting choice and why it fails, not-yet, the line, the habit.
- **Decider.** `coachDecider.decide` (`coachDecider.ts:297`) takes in `learnTurnDoor`, `playCommentary`, the keep logic of `voicePackage` and `teachingSelector`. It takes facts and returns facts. The posture comes from the surface contract.
- **Memory.** One per-game ledger keyed by `claimId` replaces `learnMemory`, `standingFactMemory`, the ~28 Review sets and the CoachTeachPage refs. It re-opens a fact only on a computed "changed" verdict. A separate per-student ledger holds terms and ideas (V18, 3d).
- **Render, `coach/render.ts`.** The only place a string is born. It returns `{words, marks}` from the fact, built on `sanToSpeech`. The model only phrases (F3).
- **Arrows.** `factMarks(fact)` feeds `arrowDoor.admitArrows` (`arrowDoor.ts:187`), and a new highlight door sits beside it. A line is drawn one arrow per spoken move, from where each piece will be (S10).
- **Surface modes.** `SURFACE_CONTRACT` (`surfaceContract.ts:30`) is read in full: register, withholds, speaks. That covers Learn, Review, Play-on-ask, chat, Tactics, Openings and Kids, plus a new Play entry.

**2. Instruments (my lens, built first)**
- **Thought row.** Widen `CoachDecisionRow` (`coachDecisionEvents.ts:29`) into a `coach-thought` row per utterance. It holds the facts spoken (claimId, role, verb, squares, moves, readKey), the facts held quiet and why, and the marks drawn, each with its claimId.
- **Fact verifier (accuracy).** Extend `scripts/scoreboard/tape-verify.mjs` and `claim-verify.mjs`, keeping them independent: they import nothing from the app. They check each fact's `kind`+`squares` with chess.js and stored engine reads, over 100% of facts. A sentence with no fact behind it is itself a finding.
- **Arrow ledger.**
  - named moves arrowed = moves in spoken facts that have a mark with the same claimId; target 100%;
  - wordless marks = marks whose claimId was not spoken; target 0;
  - line completeness = arrows drawn ÷ line plies spoken.
- **Teaching meter.**
  - A line whose facts fill only description roles counts as description and is a defect (F01, brief 3f).
  - Two facts with no reason link between them break F0b.
- **Memory and engine checks.**
  - The same claimId spoken twice without a "changed" verdict is a repeat (D6).
  - Two readKeys on one 4-field FEN with different best moves is a D7 contradiction (the Bf5/Bxf3 case).
  - A fact's seat that differs from the student's seat is a V16 flag.
- **Walk set.** The learn5 and rev-g1/g2 games and the 52 errors become fixed regression games, matched by position, not ply (the opponent is random by design). They run through `hand-driver.mjs`, with flagging first and fixing after.

**3. Build order (each phase ships)**
- **P0, instruments only (risk-first).** Thought row, fact verifier and arrow ledger, run on today's tapes to get a baseline. Nothing reaches users, and it measures every later phase.
- **P1, threats (student experience first).** The fact type, engineRead, and threats converted end to end on Learn. This fixes the floored `legalSeeGainFor` (`positionReadingService.ts:212`) that hid 6.h3 in both games (compare-1 #1), and threat arrows now come from the fact. It is the smallest slice that ships.
- **P2, chain on Learn.** Threat, tempting choice, line and habit. Turn deliberation on in the opening.
- **P3, Review onto the same decider and chain.**
- **P4, one ledger and the term ledger.**
- **P5, the other surfaces.** Chat, Play-on-ask, Tactics, Openings.
- **P6, Kids as a surface mode.**

The new computers (pin broken with tempo, gem steerer, cheaper-attacker rule) are B6 items for David's yes before they are built.

**4. Deleted**
- the dead cascade, `coachFeatureService.ts:2532-3395`;
- dead exports: `rankFacets`, `buildThreatCheckQuestion`, `contractFor`'s dead twin paths, `computeTacticalProfile`;
- the prose arrow resolvers: `namedMoveArrows`, `deriveNarrationArrows`, `spokenLineArrows`, `extractMoveArrows`, VoiceChatMic `[ARROW:]` tags;
- `MAX_GREEN_ARROWS_PER_PLY` (`openingGenerator.ts:1296`);
- the extra graders (G8);
- Cache B (`stockfishFenCache`).

**5. Tests that make the old shape impossible**
- `decide()` and the chain take and return `ChessFact` only. A `Record<FactKind, Role>` table means a new kind fails to compile until it is given a role.
- Gate: no exported coach-path computer returns `string`; only `render.ts` builds words.
- Gate: every `ArrowClaim` carries a `claimId`; importing any prose resolver fails.
- Gate: only `engineRead` calls `analyzePosition` or the pool.
- Gate: no surface creates its own said-Set; the ledger is the only one.
- Gate: `scripts/scoreboard/*` imports nothing from `src/` (verifier independence).
- Walk contract, held on every hand walk (B4):
  - facts true: 100%;
  - named moves arrowed: 100%;
  - wordless marks: 0;
  - repeats: 0;
  - seat flips: 0;
  - description-only lines: 0;
  - every ply spoken in Learn and Review (V11/D3).

**6. Rules served**

| Part | Rules |
|---|---|
| Fact type and render | F3, F0b, F0c, S10, V4, V16 |
| Chain | F0, F18, F01 |
| Decider | D1–D5, D11, F06, S1 |
| Ledger | D6, V13, V18 |
| Engine read | D7, D8 |
| Surface contract | S1–S9, S11 |
| Thought row and verifier | D9, D10, F7 |
| Arrow ledger | S10 |
| One grader | G7, G8 |
| Facts feeding the record | F4, F5, R1, R2 |

**Files:**
- /home/user/wt-work/src/services/voicePackage.ts:95
- /home/user/wt-work/src/services/coachDecider.ts:297
- /home/user/wt-work/src/services/coachDecisionEvents.ts:29
- /home/user/wt-work/src/services/arrowDoor.ts:187
- /home/user/wt-work/src/services/thinkAloud.ts:226
- /home/user/wt-work/src/coach/surfaceContract.ts:30
- /home/user/wt-work/src/services/stockfishCache.ts:2
- /home/user/wt-work/src/services/positionReadingService.ts:212
- /home/user/wt-work/src/services/openingGenerator.ts:1296
- /home/user/wt-work/scripts/scoreboard/tape-verify.mjs
- /home/user/wt-work/scripts/claim-verify.mjs
- /home/user/wt-work/scripts/audit-lib/hand-driver.mjs
