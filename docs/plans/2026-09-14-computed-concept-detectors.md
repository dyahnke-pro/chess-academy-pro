# Computed Concept Detectors — the coach's board-reading ability

**Status:** planning (no feature code yet). Plan doc committed before diving in
per the PLAN-doc standing order.
**Owner context:** David, 2026-09-14. Started from "tie the coach into the master
puzzles so it can teach the concept, not just point an arrow," and sharpened
across the conversation into a general principle.

## The principle (David, verbatim intent)

> "Everything in chess is deterministic. We build the detectors. We use the
> puzzles to test our outcomes because we already know the solutions."

> "The LLM should never be making a decision" — including deciding *what a fork
> is*. Even the concept explanation is computed, never authored-from-the-model.

> "Coach is getting new abilities. All abilities need to carry anywhere the coach
> lives." — not a puzzle feature; a coach ability exposed everywhere the coach
> speaks.

So: **detectors compute the concept, a renderer speaks it, the puzzles validate
it.** G0 to the core — the model phrases nothing it wasn't handed; ideally the
computed prose is spoken verbatim (`preferRaw`), LLM bypassed.

## The reframe vs. what shipped

`puzzleConceptExplanation.compose()` today = `narrateDnaLine` (the board-true
INSTANCE, computed) + a STATIC authored idea sentence (`getConcept` first
sentence). The authored half is the part that "feels wrong" — it's a fixed blob,
not derived from this position. This build replaces the authored half with the
**detector's own invariant, rendered per position**. The instance says *what
happens here*; the invariant says *why the pattern works*, and both are computed.

## Coverage baseline (measured, not guessed)

- Master set: 4,132 puzzles, rating 2400–3035 (median 2534).
- Current `THEME_TO_CONCEPT_ID` reaches **32%** of master puzzles.
- Master is **53% endgame, 19% quietMove, 21% defensiveMove**, only 7% fork —
  the current map is a tactics map; the master set is technique.
- Across BOTH corpora (master + `puzzles.json` = 19,132 puzzles): **72 distinct
  themes**, and **2,293 distinct endgame matchup signatures**.
- The 2,293 signatures are why matchups must be a **general calculator**, not an
  enum. Single-bishop-each-side splits 548 opposite-colored / 774 same-colored.

## Coach is the hub — no bouncing (David 2026-09-14: "I just want ppl to be able to use coach without bouncing all over the app")

The coach is the ONE place. It pulls puzzles IN and serves them in the
conversation/classroom — the user never navigates to `/tactics`, `/openings`, etc.
to learn. Puzzle SOURCES the coach can pull from:
- the **master DB** (`master-puzzles.json`, the 4,132 elite Lichess puzzles),
- the general puzzle DB (`puzzles.json`),
- **generated from the user's own games** (P6),
- **generated master tier** from master/pro games (P6).

All flow through the classroom drill + `conceptForBoard`, in-conversation.

**HARD RULE — every puzzle the coach serves carries its concept teaching (David
2026-09-14: "Coach needs to be able to teach the concepts behind the puzzles it
is showing… Otherwise what is the point??").** Teach and generate/serve are two
abilities, but the coach NEVER shows a puzzle it cannot teach the concept behind.
A served puzzle with no computed concept is a defect, not a fallback. (If a
puzzle genuinely maps to no concept — the descriptor-only floor — the coach
teaches at least the coarse matchup-class / board principle; bare arrow is never
acceptable from the coach.)

## Architecture — ONE shared computer, exposed at the chokepoints

Build a single surface-agnostic entry point (mirrors `teachingNoteForBoard`):

```
conceptForBoard(fen, { solutionMoves?, themes? }) -> ComputedConcept | null
```

Every surface calls the same function. It never gets wired per-surface (that is
how surfaces drift). The concept rides the coach's existing chokepoints:
- Proactive / prompt path: a `state.concept` sub-block at `src/coach/envelope.ts:741`
  (mirroring `formatTacticsSubBlock`).
- Reactive / voiced-answer path: near `src/services/coachApi.ts:5395`
  (`assembleTacticsAnswer` + `voiceFacts`).

### Everywhere the coach lives (ability carries; VOICING obeys each contract)

| Surface | Receives via | Speaking contract |
|---|---|---|
| Learn `/coach/teach` | envelope block + drill (`explainDrillConcept`) | speaks when it teaches |
| Play `/coach/play` | same envelope | **silent until asked / phase-transition only** (locked pure-playing-surface) |
| Post-game review | facet → `conceptForBoard` | on the moment it explains |
| Read-this-position | `usePositionNarration` | on the tap |
| Tactics drill / all puzzles | `PuzzleBoard` + hint | on hint + solve |
| Endgame | classifier IS the endgame concept | on the lesson/drill |
| Coach chat Q&A | reactive path (`coachApi.ts:5395`) | when asked |
| **Kids** | — | **excluded by contract** |

Boundary (no-yes-man): "carry everywhere" = the ability is AVAILABLE everywhere;
voicing still respects each surface's rule. Play does not narrate concepts
unprompted. Access ≠ permission to speak.

Anti-fake gate ("a wire that doesn't fire is not a wire"): each surface ships a
test proving a REAL concept comes OUT for a real position — not that the import
exists.

---

## FULL DETECTOR + COMPUTER INVENTORY (leave nothing out)

Legend: **[have]** exists, reuse · **[extend]** exists but coarse · **[new]** build.

### A. Calculators (pure, deterministic, no network)

1. **Material signature calculator** — [new]. `fen` → canonical per-side piece
   string (Q/R/B/N + pawn count), bishop square-colors tracked. Names ANY of the
   2,293+ matchups by construction. Built on `endgameProfileService.material(fen)`
   [have].
2. **Matchup-class reducer** — [new]. Collapses a signature into a teachable
   CLASS (list in §D). This is the finite, teachable layer over the infinite
   signature space.
3. **Winning-side calculator** — [new]. From the puzzle's solution direction +
   outcome theme (puzzle = ground truth). Tablebase optional cross-check only.
4. **Bishop-colour-relation calculator** — [new]. Opposite- vs same-coloured
   bishops (drives OCB drawishness teaching).
5. **Key-square / opposition-distance calculator** — [extend]. Direct opposition
   exists (`kingsInDirectOpposition` [have]); add distant opposition + key
   squares + rule-of-the-square.
6. **Concept renderer** — [new]. THE core piece: turns a detector's defining
   property (involved squares, beneficiary, technique name, structure) into the
   general-idea clause, instantiated to the board. Replaces the static authored
   sentence in `compose()`.
7. **Pawn-structure / signature calculator** — [have]. `describeStructure`,
   `structureSignature`, `computeStructureSignature`.
8. **Phase calculator** — [have]. `classifyPhase`, `isEndgameByMaterial`,
   `phaseTransitionDetector`.
9. **Outcome (WDL) lookup** — [have], network, ≤7pc. `endgameTablebaseService`,
   `lookupTablebase`. OPTIONAL cross-check; never a hard runtime dependency
   (offline path uses solution-move + geometry).

### B. Tactical motif detectors

Present in `tacticsDetector.detectTactics(fen)` [have], FEN-only, with
`involvedSquares` + `beneficiary`:
- fork, pin, skewer, discovery, discoveredCheck, back-rank, trapped-piece,
  removal-of-guard (capturingDefender), overload, battery, mate-threat,
  hanging-piece.

Move-based (we hold the puzzle's solution) via `classifyPosition` /
`computePlyFacts` [have] + [new] coverage for:
- double-check [have via classifyPosition], deflection [new], attraction/decoy
  [new], clearance [new], interference [new], zwischenzug/intermezzo [new],
  enPassant [new], underPromotion [new], promotion [new], advancedPawn [new],
  collinearMove [new/skip — geometry tag, low value].

### C. Mate-pattern detectors (the tail I was short on)

Named-mate geometry detectors on the mating position. Some data exists in
`mating-patterns.json` (via `endgameService`) [have/partial]; audit which have
real detectors, build the rest [new]:
- back-rank, smothered, Anastasia's, Boden's, opera, Pillsbury's, epaulette,
  corner, swallowstail, hook, Arabian, kill-box, Morphy's, dovetail,
  blind-swine, triangle, Vukovic, double-bishop, balestra, Damiano's, Légal's,
  scholar's.

### D. Endgame matchup CLASSES + named-technique detectors

**Matchup classes** (finite, teachable — the reducer's output space):
- K+P vs K; multi-pawn K+P vs K+P
- R+P vs R; R+Ps vs R+Ps (rook endgame)
- Q vs Q (+P); Q vs R
- R vs minor (R vs B, R vs N)
- B vs B same-colour; B vs B opposite-colour (OCB); B vs N; N vs N
- minor(s) vs pawns; two-minor mating material (B+N, two bishops)
- major+minor complexes (QR, RB, RN, QRB, QRR…) → "simplify toward a won ending"
- rooks-on + opposite-coloured bishops (drawish tendency)

**Named-technique detectors** (geometry predicates; vocabulary + labeled corpus
already exist in `ENDGAME_ALIASES` [have] and the 27-lesson JSONs [have]):
- opposition (direct [have] + distant [new]), key squares [new], rule of the
  square [new], outflanking [new], triangulation / zugzwang [new], breakthrough
  [new]
- Lucena / building the bridge [new], Philidor rook draw [new], Vancura [new],
  cutting off the king [new], rook behind the passed pawn [new]
- wrong-rook-pawn + bishop draw [new], opposite-coloured-bishop fortress [new],
  Q-vs-R fortress/technique [new]
- principles: activate the king, two weaknesses, do not rush, trade when ahead,
  push passed pawns, rooks behind passers [have as lesson prose]

### E. Positional / structural concepts

Reuse `boardConcepts(fen)` [have] + `structureSignature` [have]: outpost, open
file, passed pawn, weak squares, IQP, doubled, backward, hanging pawns, bishop
pair, space, initiative, tempo, prophylaxis, centre, development, king safety.

---

## Must-build refinements (found stress-testing the plan, 2026-09-14)

These are load-bearing; the plan is wrong without them.

1. **Renderer obeys the voice gates.** Computed concept prose still routes through
   the voice contract: `perspectiveVoice` (you/they, **never we/our** — that gate
   fails the build), G5 verbosity / `briefCap` (≤30 words on "brief" or the idea
   clips mid-sentence), `sanitizeForTTS` (no move-number prefixes, no robotic bare
   SAN). The renderer emits gate-clean prose, never raw English.
2. **No-solution live-board path.** On Play / Review / Read-this-position there is
   no puzzle solution, so the engine/tablebase **best move is the solution
   surrogate** that feeds the winning-side + named-technique detectors. Without
   this the ability silently degrades to tactics-only on exactly the live
   surfaces it must carry to.
3. **Weakness-spine integration (both directions).** A computed concept is
   PRIORITIZED when it matches the student's recurring hole
   (`tacticVocabulary.weaknessClusterForPattern` → the weakness spine, as
   `speakDeepestLookahead` already does) AND taught/missed concepts FEED the
   weakness model. This is what makes it coaching, not narrating.
4. **Importance filter (2026-08-26 rule).** On the proactive / Play path a concept
   speaks only when it clears the importance gate (decision leverage / realized
   swing / must-defend / teaching beat; silent if the position is decided). The
   computer selects + orders; concepts ride the same gate.
5. **Validation-harness triage, not equality.** Lichess tags are patchy, so
   "classification == known theme" is naive. Three buckets: **agree /
   detector-wrong / tag-missing**, with a human-reviewable disagreement list — not
   a pass/fail number.

## Multi-concept output (decided 2026-09-14 — David: "Speak multi concepts")

Positions often carry several true concepts (fork + deflection + winning; opposition
+ zugzwang). `conceptForBoard` returns a RANKED list, not one. The renderer speaks
the lead + supporting concepts, ordered by the importance filter (§ must-build 4)
and capped to the verbosity budget (§ must-build 1) so "brief" still fits. Ranking is
computed (decision leverage, realized swing, specificity); the model never picks.

## Quiz vs teach (decided 2026-09-14)

Teach = the concept engine explains. **Quiz = the classroom drill + generated
puzzles (below), fed BY the concept engine** — same detectors tag what the quiz is
testing. Not a separate probe engine; teach and quiz share one machinery.

## Router

`conceptForBoard` selects: **board-first for endgames** (Lichess tags are patchy
— 25% of master endgames are tagged descriptor-only), **most-specific-motif-wins
for tactics**. Degrade: specific technique → coarse matchup-class principle →
silent. Never specific-but-wrong (a wrong predicate lies deterministically).

## The validation harness (David's key insight)

Run every detector over `master-puzzles.json` (4,132) + `puzzles.json` (15,000) +
the 27 labeled lesson positions (FEN + result + solution), and assert each
classification AGREES with the known theme/solution. This is the G3 guard: a
predicate is only trusted once it's proven on thousands of known-answer boards.
Emits a coverage + agreement report artifact.

## Honest constraints

- **Tablebase outcome is network-only** (Lichess proxy, ≤7pc). We mostly don't
  need it — the puzzle's solution moves are verified ground truth, so
  Lucena-vs-Philidor resolves offline from geometry + winning-side. Tablebase is
  a cross-check, not a dependency. Classification stays offline-deterministic.
- **Descriptor-only floor**: puzzles tagged only crushing/advantage/long/master
  with no motif and no classifiable board stay correctly silent. The board
  classifier shrinks this floor sharply (endgames become classifiable) but it is
  never zero. Empty > invented.

## Rot fixed on the way

`puzzleConceptHint.ts` keeps a SECOND theme→teaching map (`HINT_ENTRIES`) that
drifts from `THEME_TO_CONCEPT_ID`. Consolidate into the one source
(`conceptForBoard` / `conceptIdeaForThemes`); repoint the drill-builders
(`endgameDrillService`, `adaptiveEndgameService`, `gameCalculationPuzzleService`).

## Puzzle GENERATION ability (added 2026-09-14 — David: "Ability to make puzzles… master level on its own… even better from their own games")

The generator and the concept engine are the same machinery pointed two ways: the
detectors that TEACH a puzzle are what TAG a generated one. The LLM generates
nothing (G0/G3) — this is exactly how Lichess built the DB we ship.

**Reconciliation (no-yes-man): rating = how hard the solution is to find, not who
you are.** A 1200's game yields ~1200-rated puzzles, not 2400. So two SOURCES,
one generator (mirrors the pro-rep doctrine — only the source differs):

- **From the user's own games** — highest value, most motivating. Rated at TRUE
  difficulty, whatever it is. Extends existing infra: `mistakePuzzleService`,
  `gameCalculationPuzzleService`, `fromYourGamesService`, `autoAnalyzeGame`,
  `gameAnalysisService`. Runs at runtime, piggybacking the analysis pass the app
  already does (never a second engine sweep).
- **Master-level tier** — genuinely 2400+ from MASTER/PRO games: the pro corpora
  we already hold (`pro-game-references.json`, chess.com pro archives) + the
  Lichess master DB. Offline batch (like `build-master-puzzles.mjs`).

**The generator pipeline (deterministic):**
1. Engine over each position (reuse the game's analysis where present).
2. Detect a decisive **eval swing** after a candidate best move (a blunder by one
   side creates a puzzle for the other).
3. **Uniqueness gate** — the solution must be the ONLY move that wins/holds;
   two equal winners = not a puzzle, hard reject.
4. **Soundness gate** — never generate a puzzle whose "solution" is actually
   losing (the soundness-sweep rule, student's perspective).
5. **Tag** with the concept detectors (§B–E) — the reuse payoff.
6. **Rate** via the rating estimator below.
7. **Dedupe** near-identical positions.

**Rating estimator** — we can't crowd-vote Glicko, so estimate from computable
features: solution depth, quiet-vs-forcing key move (quiet = harder), sacrifice
involved, count of plausible-looking alternatives, eval margin. **Validated
against the KNOWN Lichess ratings on the master DB** (the puzzles are the test
bench once more) — tune until our estimate correlates, report the error.

**Persistence + surfacing:** generated puzzles land in the puzzle store tagged by
source (`own-game` | `master-gen`), flow into the reach ladder + classroom drill +
`conceptForBoard` teaching like any other puzzle. "From your own game" is a
first-class label.

## Phased plan

- **P1 — shared engine** [pending]: material signature + matchup-class reducer +
  winning-side + bishop-colour + concept renderer + router → `conceptForBoard`.
  Regression: existing tactical puzzles still board-true. Validation harness
  scaffolded.
- **P2 — endgame technique detectors** [pending]: §D + §A.5, each landed with its
  harness assertion over master + lesson corpus. Closes the 68%.
  DECISION: coarse-matchup-class-first, or all named techniques at once?
- **P2b — mate-pattern detectors** [pending]: §C, audit `mating-patterns.json`
  first for what already detects.
- **P3 — consolidate** `puzzleConceptHint` → one source [pending].
- **P4 — wire chokepoints** [pending]: `envelope.ts:741` + `coachApi.ts:5395`;
  each surface with a fires-for-real test + its speaking contract (table above).
- **P4b — must-build refinements** [pending]: renderer voice-gate compliance,
  no-solution live-board path, weakness-spine both-directions, importance filter,
  harness triage. Woven through P1/P4 (listed separately so none is dropped).
- **P5 — ship** [pending]: ship-check + master-set validation report +
  3-instrument prod audit across every surface + OTA (David asked for OTA on
  completion).
- **P6 — puzzle generation** [pending]: one generator (engine swing → uniqueness
  → soundness → concept-detector tag → rating estimator → dedupe), two sources
  (own-games runtime off `autoAnalyzeGame`; master tier offline off pro corpora +
  master DB). Rating estimator validated vs known Lichess ratings. Ships behind a
  source tag into the reach ladder + drill + concept teaching. Likely its own plan
  doc when P6 starts (substantial), but the tagger is the concept engine from
  P1–P2, so P6 must follow the engine.

## Decisions log

- 2026-09-14: concept is COMPUTED (detector invariant), not authored. LLM decides
  nothing, including "what a fork is." (David)
- 2026-09-14: it's a COACH ABILITY, carries everywhere the coach lives; voicing
  obeys each surface's contract; kids excluded. (David)
- 2026-09-14: matchups = general signature calculator + finite teachable classes,
  NOT an enum (2,293 signatures measured). (David: "all variations… leave nothing
  out.")
- 2026-09-14: speak MULTI concepts (ranked lead + supports, importance-ordered,
  verbosity-capped), not one. (David)
- 2026-09-14: quiz = classroom drill + generated puzzles fed by the concept
  engine; teach and quiz share one machinery. (David)
- 2026-09-14: ADD a puzzle GENERATION ability — two sources (own games; master
  tier from master/pro games), one deterministic generator, concept engine as
  tagger, rating estimated + validated vs known Lichess ratings. (David: "even
  better if it's from their own games")
- OPEN: P2 coarse-class-first vs all-named-techniques-at-once. (awaiting David)
- 2026-09-14: coach is the HUB — pulls puzzles (master DB + general DB +
  generated) in-conversation so users don't bounce across the app. Every served
  puzzle carries its concept teaching (bare arrow never acceptable). (David)
- 2026-09-14: P2 = coarse-matchup-class-first, then named techniques as validated
  passes (degrade-safe; fastest correct coverage). (my call, logged)
- OPEN: P6 own-games generation runtime cadence — after every analyzed game, or
  on demand? (revisit when P6 starts)

## Next-session pickup

Start P1: `src/services/conceptEngine.ts` (the shared computer) + the material
signature calculator + the renderer, with the validation harness reading
`public/data/master-puzzles.json` and `src/data/puzzles.json`. Do NOT wire
surfaces until the engine validates green against the known-answer corpora.
