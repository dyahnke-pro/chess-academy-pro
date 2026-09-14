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
- **P2b — mate-pattern detectors** [pending]: §C, audit `mating-patterns.json`
  first for what already detects.
- **P3 — consolidate** `puzzleConceptHint` → one source [pending].
- **P4 — wire chokepoints** [pending]: `envelope.ts:741` + `coachApi.ts:5395`;
  each surface with a fires-for-real test + its speaking contract (table above).
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
- **P4b — must-build refinements** [pending]: renderer voice-gate compliance,
  no-solution live-board path, weakness-spine both-directions, importance filter,
  harness triage. Woven through P1/P4 (listed separately so none is dropped).
- **P5 — ship** [pending]: ship-check + master-set validation report +
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

Start P1: `src/services/conceptEngine.ts` (the shared computer) + the material
signature calculator + the renderer, with the validation harness reading
`public/data/master-puzzles.json` and `src/data/puzzles.json`. Do NOT wire
surfaces until the engine validates green against the known-answer corpora.
