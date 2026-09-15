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

**Both doors (David 2026-09-14: "I do also want a master level puzzle square in
tactics tho! Able to reach it from both surfaces").** Coach-as-hub does NOT remove
the Tactics entry. Master Level is reachable from BOTH:
- **Coach** — pulled in-conversation (above).
- **Tactics hub** — a dedicated **Master Level square** in `TacticsPage.tsx` →
  `/tactics/master` (route + `AdaptivePuzzlePage master` already exist; today the
  link lives only inside the adaptive page, NOT on the hub grid — that's the gap
  to close). Tile matches the hub's Dashboard grid language; loading/empty/error
  already handled by the master surface. Both doors, one destination.

**HARD RULE — every puzzle the coach serves carries its concept teaching (David
2026-09-14: "Coach needs to be able to teach the concepts behind the puzzles it
is showing… Otherwise what is the point??").** Teach and generate/serve are two
abilities, but the coach NEVER shows a puzzle it cannot teach the concept behind.
A served puzzle with no computed concept is a defect, not a fallback. (If a
puzzle genuinely maps to no concept — the descriptor-only floor — the coach
teaches at least the coarse matchup-class / board principle; bare arrow is never
acceptable from the coach.)

## 🔒 GOVERNING LAW — ONE COMPUTATIONAL SYSTEM, NO ISOLATED FUNCTION (David 2026-09-14: "No more isolation. It needs to be tied into the entire computer system so no function is working independently, rather they all work as one single computational system.")

The P1 engine was built BESIDE the app's computer (its own geometry walk, its own
static importance table, its own output). Tested in isolation it plateaued —
single-position geometry surfaces incidental tactics; material-count can't find
the critical move. The fix is not more detectors; it is INTEGRATION:

- **The concept engine is a CONSUMER of the one computer the app already runs,
  never its own.** Input = the surface's existing `StockfishAnalysis` (the
  eval-bar read `buildFedTacticsContext` already GUARANTEES is fed) and its PV;
  on a puzzle the solution IS the PV. Zero new engine sweeps — never in the
  render path.
- **Ranking = the engine's eval swing**, with `scanCriticality` / `cpLoss` as the
  SHARED signals. A static per-tactic importance table is the "second parallel
  criticality" CLAUDE.md forbids — it is retired. Material swing is only the
  no-engine fallback.
- **Output rides the fed package**: the ranked concepts join the same
  `TacticsLiveContext` block that `buildFedTacticsContext` assembles and
  `envelope.ts:741` / `voiceFacts` speak. One package → every surface. No side
  channel.
- **The comprehensive picture is the LINE, not a position** (David: "the forward
  looking PV is needed and stockfish analysis all working together at the time"):
  engine PV → walk each ply (`computePlyFacts`, the existing per-ply fact
  computer) → detectors name what lands at each ply → the swing ranks which is
  THE point → renderer speaks the ranked set. The sacrifice, the fork it buys,
  the ending it reaches — one story.
- Honest bounds: the walk respects `pvDepthForRating` (never past what the engine
  can stand behind); a cold board with no cached analysis answers with geometry
  now and the deeper line picture when the PV arrives (same async posture as the
  eval bar). Geometry-now is a degrade, never silence.

The integration seam is `buildFedTacticsContext` — the function that already IS
the one-computer package builder. `conceptForLine` is one more thing it computes
from the same analysis.

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

### TWO-FOR-ONE — this feeds LIVE GAMEPLAY narration, not just puzzles (David 2026-09-14: "You're not done until coach can speak these themes and concepts during game play as well as puzzles")

The same computed themes/concepts that TEACH a puzzle must ENRICH the per-move
narration during Learn, Teach-x-opening, and Play. This is the whole "carry
everywhere" point and it is a DEFINITION-OF-DONE condition, not a stretch goal.

CRITICAL wiring note: the puzzle path and the live-gameplay narration path are
DIFFERENT code. Learn / Teach-x-opening narrate through `openingGenerator`
(`generateOpeningFromDbNarration`) + the walkthrough runtime; Play narrates
through `usePhaseNarration` + `playCommentary` / `coachMoveCommentary`; Review
through `dnaLineNarrator` / `reviewMoveTeaching`. None of those is the chat
envelope. So `conceptForBoard` must be woven into the **per-move narration
computers themselves**, so the spoken "why" of a move names the theme/concept it
serves ("…Nd5, planting the outpost AND eyeing the fork on c7"), not just the
chat surface. Respecting each contract: Learn/Teach narrate actively per move;
Play stays silent-until-asked + phase-transitions; the importance filter still
gates so it doesn't narrate a concept on every quiet move.

**DONE = the coach speaks these themes/concepts during LIVE GAMEPLAY (Learn
walkthrough per-move, Teach-x-opening, Play phase-transitions/on-ask) AND on
puzzles, proven by the 3-instrument audit + narration listener.** "Puzzles pass"
is not done.

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

**Difficulty is a property of the POSITION, not the pedigree of the game (David
2026-09-14: "no difference between my games and a master game… should be able to
make master puzzles from users own").** The engine finds a hard-to-find resource
whether a GM or a 1200 sat at the board; if the position holds a 2400-hard shot,
it's a 2400 puzzle regardless of source. So: **ONE source-agnostic generator;
difficulty computed per position; "master tier" is a difficulty filter (≥2400)
over ANY source — including the user's own games.** An own-game master puzzle is
the most motivating outcome of all ("you were in a 2400-level position in your own
game — here's the shot").

Sources the SAME generator points at:
- **The user's own games** — via `autoAnalyzeGame` / `gameAnalysisService` at
  runtime (piggyback the analysis the app already runs — never a second sweep);
  extends `mistakePuzzleService`, `gameCalculationPuzzleService`,
  `fromYourGamesService`.
- **Master / pro games** — the pro corpora we hold (`pro-game-references.json`,
  chess.com pro archives). Offline batch (like `build-master-puzzles.mjs`).
- **The Lichess master DB** — already shipped; also the CALIBRATION set for the
  rating estimator (known ratings) and a guaranteed-quality supply.

Honest nuance (yield, not a gate): hard resources arise LESS OFTEN in a weaker
player's games, so fewer master-tier puzzles per game from a beginner's corpus.
Surface them when they genuinely occur; never promise a firehose from a beginner's
history. Source stays open; expectation stays honest.

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

## Per-phase process (David 2026-09-14: "regain context after each build, even before auditing so you know what to look for")

After EACH phase's build, BEFORE running its audit:
1. Re-read this plan doc (the phase's intent + its done-condition + the gates it
   must pass) and the relevant surface-map region (`docs/coach-system-map.md`,
   and the detector/endgame/consumer maps this plan was built from).
2. Restate what the phase was supposed to change and therefore WHAT THE AUDIT
   MUST LOOK FOR — the specific fires-for-real assertions, the surfaces touched,
   the voice/importance/verbosity gates in scope.
3. THEN run the 3-instrument audit against that restated checklist, not a stale
   mental model. A build followed by an audit that doesn't know what changed is
   how green audits miss real regressions.

Update the phase's status marker + the decisions log as each lands.

## Phased plan

- **P1 — shared engine** [done 2026-09-14]: `endgameMatchup` (signature +
  15-class reducer), `conceptEngine` (renderer registers + `conceptForBoard` /
  `conceptForLine` router), `conceptCoverage.report.test.ts` harness.
- **P2 — endgame technique detectors** [in progress 2026-09-14 — first pass
  landed]: `endgameTechnique.ts` now carries eight geometry theorems, routed by
  matchup class in `namedTechniqueFor` (most-specific first): key squares (on /
  head-for), rule of the square (who-moves + double-step honest), the rook-pawn
  corner draw, the opposition, Lucena, Philidor (setup vs third-rank-held),
  cutting off the king, rook behind the passer (Tarrasch), wrong-bishop draw.
  Every `full` states the geometry proved + the rule — NEVER a game result (the
  other king may still decide it). Known-answer gate: `endgameTechnique.test.ts`
  walks all 30 labeled positions of `pawn-endings` / `rook-endings` /
  `drawn-patterns` and pins each to its concept id, plus a "no other lesson
  fires a technique it wasn't labeled for" sweep. DECIDED: coarse class first,
  named techniques inside it (specific > general > silent).
  Still owed (need the solution line or the engine, not bare geometry):
  triangulation, outflanking, breakthrough, zugzwang, Vancura, OCB fortress,
  Q-vs-R fortress, mate-pattern detectors (P2b).
  Coverage after P2 (400-puzzle sample, line-walk): AGREE 23.3% / FIRES-NO-TAG
  70.8% / SILENT 6.0% — silence rose from 3.1% on purpose (generic positional
  leads no longer count as teaching); the endgame leads are now named
  techniques (opposition, rook-behind-passer, cutting-off, pawn ending…)
  instead of the bare matchup principle. Multi-pawn endings count only the
  DIRECT opposition (a 4,000-puzzle probe showed every distant hit there was
  noise).
  **DATA DEFECT flagged:** `drawn-patterns.json` → `opposite-color-bishops`'s
  only position (`4b3/6k1/8/7p/pP5P/3BK1P1/2P5/8 b`) has BOTH bishops on light
  squares (Be8, Bd3) — it is a same-coloured-bishop ending and its own solution
  trades them on f7. The lesson teaches OCB over a board that isn't one. Needs
  a real OCB game position (G3 — never invented); the gate pins it to
  `same-bishops` until replaced.
- **P2b — mate-pattern detectors** [done 2026-09-14]: `matePatterns.ts` —
  `classifyMatePattern(fenAfterMate)` builds the mate geometry (checkers,
  the eight flights with self-block vs. cover-by-whom computed with the king
  lifted, protectors) and runs 28 named rules most-specific-first plus the
  seven piece-mate fundamentals (K+Q, K+R, R+R, B+B, B+N, Q+B, Q+N — only
  when the attacking king takes part and no pawn helps; otherwise a named
  pattern wins, e.g. Balestra / Anderssen). Vocabulary + spoken register =
  `mating-patterns.json` (hand-authored `narration.recognition`). Known-answer
  gate: `matePatterns.test.ts` plays the mating move of all 33 mate-in-1
  lesson positions (found by search, no solution field needed) and pins each
  to its id — 36/36. Wired: `conceptForLine` names a delivered mate by its
  pattern (`source: 'mate'`, importance 0.98, prospective phrasing so the
  same walker serves a live PV that merely reaches the mate), so puzzles,
  the briefing, Learn, Review and the walkthrough all say "Anastasia's mate",
  not "Rh5#" (Narration Voice Rule 7). Nothing detected → generic mate
  register (never specific-but-wrong).
- **P3 — consolidate** `puzzleConceptHint` → one source [done 2026-09-14]:
  `conceptHintForPuzzle({fen, moves, themes, studentToMove})` — the computed
  lead's short register leads, the theme table is the fallback — now feeds
  every drill hint (`endgameDrillService`, `adaptiveEndgameService` ×2,
  `gameCalculationPuzzleService`). `puzzleConceptExplanation` (PuzzleBoard +
  the classroom drill) leads with the COMPUTED concept (name + invariant idea;
  `computedId`/`computedSource` added; the tag→book passage kept for sourcing
  and as fallback), and `conceptIdeaForThemes(themes, board?)` lets the hint
  system's Tier-3 answer classify the engine's best move on the live FEN
  instead of trusting tags — a puzzle tagged "pin" whose solution forks now
  says fork. Gates: `puzzleConceptHint.test.ts`, the extended
  `puzzleConceptExplanation.test.ts`.
- **Master Level square** [done 2026-09-14]: `/tactics/master` already existed
  but only the coach door led to it — the Tactics hub now carries the tile
  (David: "reach it from both surfaces"). Gate in `TacticsPage.test.tsx`.
- **Rot fixed on the way (P2b/P3):** `classifyMatchup` hand-parsed any string
  and read `"nope"` as a knight + pawn → "minor-piece ending"; it now
  validates the FEN first (→ `non-endgame`), and `conceptForLine` returns []
  on an unparseable root. Two test fixtures carried TWO black kings (invalid
  FENs the hand parser tolerated) — fixed.
- **P4 — wire chokepoints** [done — landed inside P4a, marker corrected
  2026-09-15]: BOTH chokepoints carry the concept. Proactive: `envelope.ts:741`
  → `formatTacticsSubBlock` → the `CONCEPTS (COMPUTED — voice these, in this
  order…)` block (`liveTacticsContext.ts:556`), gated by
  `liveTacticsContext.test.ts` "attaches computed concepts from the SAME
  analysis". Reactive: `coachApi.ts:5395` → `assembleTacticsAnswer` leads with
  `tactics.concepts[0].full` (`groundedAnswer.ts:2746`), gated by
  `groundedAnswer.test.ts` "leads with the ranked concept sentence". The
  `[pending]` here was stale for a day and would have sent the next session
  re-wiring a wire that fires.
- **P4b — ONE tactic classifier** [in progress 2026-09-15]: see the SURFACE MAP
  section. `detectTacticType` = a projection of `conceptForLine` through the
  vocabulary bridge; `TacticType` gains `checkmate`; `TACTIC_TEACHING.concept`
  derives from `tacticInvariant`; the drill readers go stored-first; the
  `legacy` tail is `{clearance, x_ray}` and shrink-only.
- **P4a — ONE COMPUTATIONAL SYSTEM integration** [done 2026-09-14]:
  `conceptForLine` (the single walker over `computePlyFacts`, solution or engine
  PV), importance from the engine's swing on the shared `criticalityThresholds`
  (static table retired), `conceptForBoard` consumes the surface's existing
  `StockfishAnalysis`, and `buildTacticsLiveContext` attaches ranked `concepts`
  to the fed package that `formatTacticsSubBlock` renders. The chat/prompt path
  now carries computed concepts on every surface that builds the package.
- **P4c (part 1) — the concept SPEAKS on the computed paths** [done 2026-09-14]:
  `computePositionFacts` ranks the lead concept as a `concept` clause in the
  spoken briefing (Play phase transitions, Read-this-position, Learn live coach,
  review `whyBestMove`), matched to the student's specific hole through the
  vocabulary bridge; Learn's spoken interjection (`assembleTacticsAnswer` →
  `voiceFacts`) leads with the concept sentence. Kids excluded (gate test).
  A wire that fires: gated by tests that a real concept comes OUT. Verified
  by inspection 2026-09-14 that every briefing consumer uses a DENY-list
  (`clauseText(pf.clauses, ['must-defend', …])`), never an allowlist, so the
  `concept` clause is spoken on all four: Learn live coach (`useLiveCoach`),
  Play phase transitions (`usePhaseNarration`), Read-this-position
  (`usePositionNarration`), and Learn's computed spoken-hint queue
  (`CoachTeachPage` → `queueSpokenHint(…, 'computed')`).
- **P4c (part 2) — the remaining computed narration paths** [done 2026-09-14]:
  the tactic INVARIANT (why the pattern wins) now rides every projected line
  at the ply it lands, once per line, from the same `tacticInvariant` register:
  `narrateDnaLine(…, { teachInvariant })` → Learn/Play's best-line delta
  (`bestLineDeltaFromPv`); `firstTacticInvariant(plies)` → the review's
  better-line walk AND the shot-sequence playback (CoachGameReview); and
  `landedTacticTeaching(fenBefore, san)` → `openingGenerator` PASS 1 as beat
  two on any taught ply that lands a tactic (trap/punish plies), replacing the
  generated aside/weighing so the two-beat contract holds. All consume
  `computePlyFacts` — no new sweep. `usePhaseNarration` needs nothing extra:
  its spoken text is the `computePositionFacts` briefing from part 1.
  **Latent find fixed on sight:** `computePlyFacts`' fork reality-gate required
  two *winnable* targets and scored the king as worth 0 and "defended" by any
  friendly piece covering its square — so the textbook ROYAL fork (Nc7+ on
  king+rook) never "landed" on any surface. Royal forks now need one other
  winnable target (same rule the skewer branch already had). Gate:
  `pvPlayback.test.ts` royal-fork test.
- **P4c — wire the LIVE-GAMEPLAY narration computers** [done — parts 1–2 above]:
  weave `conceptForBoard` into the per-move narration paths so themes/concepts are
  spoken mid-game — `openingGenerator`/walkthrough (Learn + Teach-x-opening),
  `usePhaseNarration` + `playCommentary`/`coachMoveCommentary` (Play,
  contract-respecting), `dnaLineNarrator`/`reviewMoveTeaching` (Review). Each with
  a fires-for-real test proving the spoken "why" names the concept. NOT done until
  gameplay speaks these, not only puzzles.
- **P4b — must-build refinements** [4 of 5 done 2026-09-14]:
  1. voice gates — every register is authored neutral/you-they (the tests
     assert no we/our/us on every concept + every technique + every mate
     register); the spoken path still runs through `voiceFacts` → briefCap →
     sanitizeForTTS, nothing bypasses `speakInternal`. DONE.
  2. no-solution live path — `conceptForBoard` walks the surface's existing
     engine PV (`analysis.topLines[0]`) as the solution surrogate. DONE.
  3. weakness spine — BOOST direction done (`applyWeaknessBoost` matches the
     concept clause through `matchTacticPattern`). FEED direction (a MISSED
     puzzle's computed concept recorded to the weakness model) is still owed:
     hook points are `PuzzleBoard`'s outcome → `weaknessClusterForPattern(id)`
     → the spine's cluster record; `captureMisconception` is the LLM slip
     classifier and is NOT the right recorder for a computed concept.
  4. importance filter — the concept rides `computePositionFacts`' ranked
     clauses (tactic/mate 70, technique/principle 39) under the same
     `criticalityThresholds`; on the line walk `importanceFromSwing` scores the
     lead. Deliberately NOT gated on "decided": a named technique IS the
     convert-mode teaching (Lucena in a won rook ending must speak), and a
     positional platitude never leads (`dropGenericLead`). DONE.
  5. harness triage buckets — DONE (`conceptCoverage.report.test.ts`).
- **P5 — ship** [in progress 2026-09-14]: four stacks landed on `main`
  through the ship-check hook (P4a/P4c → `16709b0`, P2 → `788d0cf`,
  P2b+P3+tile → `4d9ecf2`). Prod audit `scripts/audit-concept-engine-prod.mjs`
  (muted, 3-instrument, vacuity-checked: "noticed the void") — first run
  16/17 against the pre-tile bundle (A1 tile absent, expected), re-run
  against `index-eJ36YYcf`: **19/19 green** (hub tile → `/tactics/master`
  mounts; 3 drill puzzles → computed FORK explanation, gate-clean; 37 app
  events on the loopback listener, 6 narration events, all muted; 0 page
  errors). G7 note: this surface has no typed input, so the off-canonical
  probes don't apply; pick-before-load is covered by the Show-Solution wait.
  The Random Mix pool led with forks every time, so the OTHER concept names
  are proven by the unit gates on prod code, not by this run. The drill run also caught a narration
  smell in the prod voice — the same concept clause ("forces the king to
  react") on every check of one line — fixed: `narrateDnaLine` says an idea
  once per line. Still owed here: OTA when David asks (only when asked).
  Rot noted, not yet fixed: `missedTacticService.detectTacticType` is a
  SECOND one-ply tactic classifier (no reality gate) feeding mistake-puzzle
  `tacticType`; P6's generator must tag through the concept engine instead,
  and that classifier should be retired behind the vocabulary bridge.
- **P5 — ship** [detail]: ship-check + master-set validation report +
  3-instrument prod audit across every surface — INCLUDING live-gameplay
  narration (Learn/Teach-x-opening/Play), with the narration listener confirming
  the concept was SPOKEN mid-game — + OTA (David asked for OTA on completion).
- **P6 — puzzle generation** [pending]: ONE source-agnostic generator (engine
  swing → uniqueness → soundness → concept-detector tag → rating estimator →
  dedupe), pointed at own games (runtime, off `autoAnalyzeGame`) AND master/pro
  games (offline). Difficulty is computed per position; the **master tier is a
  difficulty filter (≥2400) over any source — own games included.** Rating
  estimator validated vs known Lichess ratings. Ships tagged by source into the
  reach ladder + drill + concept teaching. Likely its own plan doc when P6 starts
  (substantial), but the tagger is the concept engine from P1–P2, so P6 must
  follow the engine.

## SURFACE MAP — P4b: ONE tactic classifier (2026-09-15, David: "make sure this build is unified. One coach system, not 5")

Written BEFORE the code, per the §0 pre-build gate in
`docs/plans/2026-09-08-unified-coach.md`. This is the map of the one real split
the unification sweep found — everything else the sweep checked is already one
system (importance is single-source on `criticalityThresholds`; the concept
engine fans out through three hubs, `positionFacts` / `liveTacticsContext` /
`dnaLineNarrator`, to ~15 surfaces).

### The disease (one sentence)

The app has TWO tactic classifiers on TWO vocabularies, and the one that TAGS
what a student is weak at is not the one the coach TEACHES from.

- **Stack A — the engine** (`TacticPatternType`): `tacticClassifier` geometry →
  `tacticsDetector.detectTactics` → `pvPlayback.computePlyFacts.tacticLanded`
  (reality-gated: the move must CREATE the tactic, the moved piece must be its
  agent, ≥2 winnable targets for a fork) → `conceptEngine.conceptForLine` →
  `TACTIC_INVARIANT` / `TACTIC_NAME`. This is what every coach surface voices.
- **Stack B — the tagger** (`TacticType`): `missedTacticService.detectTacticType
  (fen, uci)` — one ply, priority-ordered geometry, NO reality gate (a check
  plus one attacked piece is a "fork"; a fork on two DEFENDED pieces counts; a
  smothered mate is a "fork"). Its answer is PERSISTED as `mistakePuzzles.
  tacticType` and `classifiedTactics.tacticType`, becomes the weakness cluster
  `analysis:tactic:<TacticType>` (`weaknessSpine.bucketForMistake`), the
  tactical profile's `weakestTypes`, and the drill-queue filter.
- **The join** between them (`weaknessSignal.matchTacticPattern` →
  `tacticVocabulary`) is correct — but it joins a tag Stack B computed to a
  concept Stack A computed, so the same board can be a "pin" in the student's
  hole and a "fork" in the coach's mouth, and the hole never gets hit.
- **A second authored concept vocabulary rides Stack B:** `tacticAlertService.
  TACTIC_TEACHING[t].concept` ("A fork attacks two or more pieces at once…")
  is spoken by the My-Mistakes drill (`MistakePuzzleBoard` → `useStruggleDetection`
  → `getCoachingMessage`, and as the Why fallback) and by the Play tactic
  alerts — while the classroom drill speaks the engine's invariant ("a fork hits
  two targets at once, and only one can escape"). Two puzzle surfaces, two
  definitions of a fork.

### Target + shared computers changed

1. `missedTacticService.detectTacticType(fen, bestMoveUci, pvUci?)` becomes
   the ONE classifier: engine-first, `TacticType` = a PROJECTION of
   `conceptForLine`'s answer through `tacticVocabulary.toTacticType`, tiered so
   the tail can never contradict the engine (mechanics → engine → mechanics →
   legacy tail → sentinel). The old geometry survives ONLY as
   `legacyTacticGeometry`, consulted for the members the engine has no detector
   for, declared in `TACTIC_TYPE_AUTHORITY: Record<TacticType, …>` (compile-time
   exhaustive; the `legacy` set = `{clearance, x_ray}` and can only shrink).
2. `TacticType` gains `'checkmate'`. Without it the unified classifier REGRESSES:
   a missed non-back-rank mate stops being a (wrong) "fork" and becomes
   `tactical_sequence`, which `mistakePuzzleService` drops — the student would
   lose the puzzle. Non-destructive to stored rows; every `Record<TacticType,…>`
   fails to compile until filled (TACTIC_TEACHING, TACTIC_LABELS, the two
   explanation tables, icons, the bridge). New weakness bucket: "Missed
   checkmates", drill pool `mate` / `mateIn1` / `mateIn2`.
3. `tacticVocabulary`: `mate_threat → 'checkmate'` (one-way; a delivered mate is
   not a live `TacticPatternType`, so `checkmate → null`). A live mate-threat
   concept now boosts for a student who misses mates.
4. `TACTIC_TEACHING[t].concept` is DERIVED from `tacticInvariant(toTacticPattern
   Type(t))` for every bridged member — one invariant vocabulary, two
   projections. `lookFor` / `beginnerHint` stay authored: they are WHERE-TO-LOOK
   registers, not competing definitions.

### Every consumer (the neighbours) — 10 call sites of `detectTacticType`

| Kind | Site | Reach of the change | Register |
|---|---|---|---|
| PRODUCER (persists) | `mistakePuzzleService` ×3 (L486 import path, L748 coach-game path, L1168 capture builder) | new `mistakePuzzles.tacticType` rows are engine-tagged; the two PV paths now pass `pvMoves` so the walk sees the whole solution | — |
| PRODUCER (persists) | `tacticClassifierService.deriveMissedTacticsForGame` L230 | new `classifiedTactics.tacticType` rows engine-tagged (1-ply, no PV in the annotation) | — |
| PRODUCER (in-memory) | `missedTacticService.detectMissedTactics` L847 | game-insights missed-tactic list | review |
| PRODUCER (in-memory) | `analyticsService.scanFoundTacticsByType` L764 | "tactics the player FOUND" breadth — now reality-gated too (a brilliant that "forked" two defended pieces no longer counts as a fork find) | analytics |
| READER (re-classified on read — ROT) | `tacticDrillService` L70 + L234, `tacticCreateService` L103, `MistakePuzzleBoard` L214 | switched to STORED-FIRST (`m.tacticType ?? detectTacticType(…)`), the pattern `tacticalProfileService` already uses. Old rows keep their stored (legacy) tag consistently everywhere; new rows carry the engine tag consistently everywhere — no row disagrees with itself | drill |
| READER (stored-first, correct) | `tacticalProfileService` L196 | unchanged | profile |
| LIVE | `tacticAlertService.detectGameplayTactic` L375 + `scanUpcomingTactic` L434 → `useCoachTips` → `CoachGamePage` (tip bubble + chat inject, no voice) / `OpeningPlayMode` (`say(tip)` in the locked-line middlegame — a Settings-opted training aid, pre-existing contract, NOT changed here) | the alert's LABEL now comes from the engine; both sites pass the PV tail. The walker itself (`scanUpcomingTactic`) stays — it is a cadence/cooldown surface with its own tests; it is a remaining parallel PV walker beside `tacticClassifier.scanUpcomingTactics` + `conceptForBoard`, noted below | play (silent-until-asked honoured: this path only fires when the user enabled tactic alerts) |

Downstream of the persisted tag (unchanged code, changed INPUT): `weaknessSpine.
bucketForMistake` → `UnifiedWeakness.tag` → `weaknessSignal.matchTacticPattern` →
`positionFacts` concept-clause boost (L339); `tacticalProfileService.weakestTypes`
→ `isTacticWeakness`; `themesForTactic` → drill pools; `TACTIC_LABELS` /
`tacticLabel` / `tacticTypeLabel` / both `generateExplanation`s → display text.

**Kid surfaces:** none of the touched files live under `Kid/`; verified by grep
after the edit (the kid contract is untouched).

### Gates that guard these surfaces

Existing (all must stay green or be updated to the NEW contract, never deleted):
`missedTacticService.test.ts` (50 legacy-geometry cases — those that pin legacy
PRIORITY rather than the contract retarget to `legacyTacticGeometry`),
`missedTacticService.audit.test.ts`, `tacticAlertService.test.ts` (asserts the
OLD authored fork/pin sentences — updated to the one voice),
`tacticVocabulary.test.ts` (asserts `mate_threat → null` — updated),
`useStruggleDetection.test.ts`, `useCoachTips.test.ts`,
`MistakePuzzleBoard.test.tsx`, `mistakePuzzleService*.test.ts`,
`weaknessSpine.test.ts`, `conceptEngine.test.ts`.

New: `tacticTypeUnification.test.ts` — (a) `TACTIC_TYPE_AUTHORITY` is exhaustive
and every `engine` member is bridged; (b) AGREEMENT on real boards: the tag ==
the projection of the engine's lead; (c) the engine's strictness holds (a check
plus one defended attacked piece is NOT a fork); (d) mechanics (promotion,
hanging piece); (e) the legacy tail classifies clearance / x-ray and a legacy
"fork" on an engine-silent board is NOT surfaced; (f) a delivered smothered mate
→ `checkmate`, a back-rank mate → `back_rank`; (g) one voice: for every bridged
member, `getCoachingMessage(t,'guide')` opens with the engine's invariant;
(h) a cost bound (the classifier now walks the line).

Runtime audits owed (Post-Deploy matrix): `audit-mistakes-quality-loop.mjs`
(My-Mistakes chip + hint tiers), `audit-coach-tactical-awareness.mjs`,
`audit-concept-engine-prod.mjs` (regression), `audit-weaknesses.mjs`, plus P5's
live-gameplay concept-spoken run.

### Contract deltas (what each neighbour must tolerate)

1. `detectTacticType` is STRICTER. Same signature + optional PV. New rows are
   tagged by the reality-gated walk. NO backfill of old rows — re-tagging a
   student's history rewrites their weakness record without their action; the
   stored-first readers make old and new rows each self-consistent instead.
   (Decision logged; David can ask for a backfill.)
2. `TACTIC_TEACHING.concept` text changes for the 9 bridged members → the
   struggle coaching and the missed-tactic alert now say what the classroom
   drill says. Spoken text, so the `perspectiveVoice` gate applies — the engine
   invariants are already gate-clean.
3. `TacticType` is wider by one member. `Partial<Record<…>>` sites
   (`weaknessSpine` labels/themes, analytics) get `checkmate` where it is a real
   value; the exhaustive ones are compiler-enumerated.

### Remaining rot, seen and NOT taken in this pass (each is its own blast radius)

- Four label tables for one enum (`TACTIC_LABELS`, `tacticLabel`,
  `tacticTypeLabel`, `TACTIC_NAME`) — different registers (singular / plural /
  spoken / pattern-side); duplicated constants that can drift.
- Three PV walkers beside `conceptForLine`: `tacticAlertService.scanUpcomingTactic`
  (label now unified), `tacticClassifier.scanUpcomingTactics`, and
  `CoachGamePage`'s threat announce over the latter.
- `LICHESS_THEME_TO_TACTIC` has no `mate*` entries, so solved mate puzzles do not
  yet count toward the new `checkmate` motif stats (`getTacticTypeFromThemes`
  is first-match-wins over the theme list, so adding `mate` must not shadow
  `backRankMate`).

## CORRECTION (2026-09-14) — the "pin over-fires" finding was a RUNNER ARTIFACT

The finding below said the tactic side was detector-limited and pin over-fired 3×
(Pin 424 vs Fork 149). **That was wrong** — it came from the `tsx` harness, which
could not load the engine import chain (`capacitor-stockfish-native`) and produced
garbage. Re-run under vitest (mocked engine — the CORRECT env), the distribution is
balanced: opposition 85, rook 79, **Pin 78, Fork 57**, pawn 54, discovered 48, …
No pin inversion. The tactic DETECTORS are fine; do NOT "tighten" them.

Corrected scorecard (n=1500 master, `conceptForSolution`): **43% covered** with a
computed concept (agree 22.6% + fires-no-tag 20.3%), **57% silent**. The silence is
mostly honest — master puzzles are quiet/defensive/positional-heavy with no single
nameable tactic (empty > invented). What lifts the 57% is §E **positional concepts**
(outpost/open-file/weak-square/IQP — not yet wired) + P4b's **eval-swing** to name a
quiet move's point — NOT detector tightening. The harness is now the env-gated
`conceptCoverage.report.test.ts` (the `.mts` couldn't run here — that was the same
native-import problem).

Lesson: run the harness in the env that matches production (mocked engine), never a
bare `tsx` script that silently loses the engine chain.

## §E positional finding (2026-09-14) — SILENCE IS NOT THE METRIC, AGREEMENT IS

Wiring the board-provable positional tags took puzzle silence **57% → 3.3%** —
and agreement **did not move (22.6%)**; fires-no-tag ballooned to 74%. Because
"development lead / bishop pair / pawn weakness" are TRUE on nearly every
middlegame: platitudes. Replacing silence with a generic truth is not teaching
("empty > generic"). Rule adopted: **positional platitudes may SUPPORT but never
LEAD** — only sharp, decision-bearing ideas (passed pawn, knight outpost, king
safety, pawn storm, active rook, open file) can lead a quiet position; the
generic tags ride only behind a real lead. Watch the AGREE line, never the
SILENT line, when judging a change.

Also caught by the kid gate test: `formatTacticsSubBlock` dropped the whole block
when a concept was the ONLY computed content (its `has` gate didn't count
concepts) — a quiet rook ending would have rendered nothing. Fixed; gate holds.

## P1 validation finding (2026-09-14 — the harness did its job) — SUPERSEDED BY THE CORRECTION ABOVE

Ran `conceptForSolution` over 1,500 master puzzles (agree / fires-no-tag / silent):
- **OLD theme-map: 30.7%. AGREE 28.9%, FIRES-NO-TAG 55.5%, SILENT 15.6%.**
- Split by concept family, two very different stories:
  - **Endgame/matchup side — SOLID.** 62% of endgame puzzles get a teachable
    class; endgame leads agree cleanly with their tags (rook/pawn/knight endings).
  - **Tactic side — DETECTOR-LIMITED.** Lead distribution is inverted from reality
    (Pin 424 vs Fork 149; the corpus is ~2× more forks than pins), and puzzles
    tagged `fork` come back `Pin`. Root cause: `computePlyFacts.tacticLanded`
    flags whatever tactic the key move's landing square creates, incidental pins
    over-fire, and a puzzle's true motif often spans moves — material-count alone
    doesn't locate the critical move.
- **Consequences for the plan:**
  - **P2 must tighten the tactic detectors** (pin over-fire first) before the
    tactic-concept path is trustworthy — the endgame path is ready now.
  - **P4b's importance filter must use the EVAL SWING**, not material-count, to
    locate the solution's critical move + true motif. This is why must-build #4 is
    load-bearing, not polish.
  - The `fires-no-tag` bucket is a MIX of tag-missing (Lichess didn't tag the
    motif — a real win) and detector-wrong (pin over-fire) — the harness prints a
    sample for human triage; do not read 55.5% as all-error or all-win.

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
- 2026-09-14: ADD a puzzle GENERATION ability — ONE source-agnostic generator,
  concept engine as tagger, rating estimated + validated vs known Lichess ratings.
  (David: "even better if it's from their own games")
- 2026-09-14 (CORRECTION): difficulty is a property of the POSITION, not the game
  source — master tier is a difficulty filter over ANY source, so master-level
  puzzles CAN come from the user's own games. Dropped the "own games = their
  rating" gate. Only real difference is yield. (David: "no difference between my
  games and a master game")
- OPEN: P2 coarse-class-first vs all-named-techniques-at-once. (awaiting David)
- 2026-09-14: coach is the HUB — pulls puzzles (master DB + general DB +
  generated) in-conversation so users don't bounce across the app. Every served
  puzzle carries its concept teaching (bare arrow never acceptable). (David)
- 2026-09-14: P2 = coarse-matchup-class-first, then named techniques as validated
  passes (degrade-safe; fastest correct coverage). (my call, logged)
- 2026-09-14: Master Level reachable from BOTH the coach AND a dedicated square in
  the Tactics hub (`TacticsPage.tsx` → `/tactics/master`); coach-as-hub does not
  remove the Tactics entry. (David)
- 2026-09-14: TWO-FOR-ONE / DONE-condition — the concept engine feeds LIVE
  gameplay narration (Learn, Teach-x-opening, Play), woven into the per-move
  narration computers, not just puzzle surfaces. Not done until the coach speaks
  themes/concepts during gameplay. (David)
- OPEN: P6 own-games generation runtime cadence — after every analyzed game, or
  on demand? (revisit when P6 starts)

## Next-session pickup

P1–P4a, P4c, P2, P2b, P3 and the Master Level tile are on `main`. Do not rebuild
them. In flight: **P4b** (one tactic classifier — see SURFACE MAP). Owed after it:
**P5** — the 3-instrument prod audit that proves the concept is SPOKEN during
LIVE gameplay (Learn / Teach-x-opening / Play phase-transition), with the
narration listener, not just on puzzles; then **P6** (puzzle generation, its own
plan doc). Regain context first: this doc's phase markers + `docs/coach-system-map.md`
+ the surface's contract in the table under "Everywhere the coach lives".
