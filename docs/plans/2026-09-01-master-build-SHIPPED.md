# PLAN — Coach: command every question, every weakness, teach the concept (2026-09-01)

Owner: David. The vision, agreed in full this session: the coach answers **any**
question (end the phrasing whack-a-mole), holds **full command of the weaknesses
tab** (specifics + history + improvement + drills), rolls errors up into a
**concept/theme it can teach**, and **generates endgame technique** on demand —
all without breaking **G0** (the LLM decides no chess content; it only phrases
facts computed in code).

## The G0 guarantee (the spine of every part below)
- The LLM **never picks the chess fact and never invents one.** It does two
  allowed things: (1) phrase computed facts via `voiceFacts` (the chokepoint),
  (2) — nothing else in the chess path.
- **Data decides**, not the LLM. Answer-computers self-gate (`null` when they
  don't apply); the one that returns real facts wins. No LLM router.
- Anything we **cannot compute** → honest decline + **log it**. Never invented
  chess. That is the hard ceiling and it is by design.

---

## Part I — The universal answering pipeline (ends the whack-a-mole)
Replace "match a phrasing to a lane" (finite regexes, infinite phrasings) with
"extract signals → run data-gated computers → self-heal + log".
1. **Deterministic signal extraction** (code): SAN? square? piece word?
   self-reference? time-reference? wh-word? comparison? board present?
2. **Candidate computers** keyed by signals; **first non-null wins**; priority
   breaks ties. All existing `assemble*`/`explain*`/`answer*` (63 today).
3. **Self-heal**: chess question, every computer null → computed position
   default or honest "can't verify yet" — never a dumb deflection.
4. **LLM phrases only** (`voiceFacts`).
5. **Every miss logged** (`safe-default-stock` telemetry) → the ranked backlog.
- [ ] P-I.1 signal extractor (pure, tested)
- [ ] P-I.2 candidate-map + data-decides dispatch (wrap, don't rip out the
      existing regex fast-path — it stays as the instant tier)
- [x] P-I.3 self-heal on full-miss — chess→`serveGroundedPositionDefault`
      already wired; ADDED banter→grounded self-heal on the fully-stripped path
      (`self-heal-position` lane) (2026-09-01)
- [x] P-I.4 deflection-log — `emitGroundingCoverage`(`safe-default-*` /
      `self-heal-*`) records every miss with the question; read via
      `scripts/audit-coach-grounding-coverage.mjs` (already wired)

## Part II — Full conversational DeepSeek, grounded chess (G0 intact)
- Free/warm on any **no-chess-claim** turn (rapport, motivation, "you there?").
- **Grounded** the instant it is a chess claim — board-specific AND **general
  theory** → the concept/book corpus (`chess-concepts.json`), never memory.
- Classifier stays **aggressive** (David: "leave aggressive"); banter lane's
  narrow SAN/eval/stat stripper stays; fully-stripped banter **self-heals to
  grounded** (P-I.3).
- [x] P-II.1 theory lane → concept corpus — `searchTheoryPassage` free-text
      corpus search + `assembleTheoryAnswer` + `isTheoryQuestion` (2026-09-01)
- [x] P-II.2 capabilities overview ("what can you help with") → app manifest
      (`assembleCapabilitiesOverview`, CAPABILITY_HEADLINES) (2026-09-01)
- [ ] P-II.3 P3 — verify non-chess turns reach the warm lane

## Part III — Weaknesses: C‑ → A+ (full command of the tab)
**Use the weaknesses we already capture** (David point 3): tactical motifs,
mistake puzzles by classification+phase, opening weak-spots, conversion
failures, time-trouble, board-vision heatmap, misconceptions, trade motifs,
errors-by-situation, phase breakdown.
**Capture gaps to ADD (verify each, add the genuinely-missing):**
- [x] blunder-vs-stronger-opponent — `aggregateStrongerOpponentErrors`
      (weaknessSpine), cross-refs mistake→game Elos, surfaces only when the
      vs-stronger rate is elevated (2026-09-01)
- [ ] missed-opponent-threat / prophylaxis failures — needs a per-move threat
      pass over stored games (larger detector build); FLAGGED, not faked
- [ ] endgame-type conversion (lost R+P / K+P), beyond generic thrown-wins —
      conversion failures ARE captured (`aggregateConversionFailures`); the
      per-type split is the remaining add; FLAGGED
- [ ] self-inflicted structure damage — needs a pawn-structure delta detector;
      FLAGGED
**A+ computers (net-new):**
- [x] P-III.1 **weakness LIFECYCLE** — `weaknessLifecycle.getWeaknessLifecycle`
      over the archive timeline: FIXED (used-to, gone — self-fixed), PERSISTENT,
      EMERGING, MOST-PRESSING; anchored on the latest game date (2026-09-01)
- [x] P-III.2 **motif → behavior → CONCEPT** rollup — `weaknessConceptMap
      .conceptForCluster` + corpus grounding; the pressing/briefing lane teaches
      the concept from the book corpus (2026-09-01)
- [x] P-III.3 **motif-scoped drill** — `buildMistakeDrillQueue({ motif })` +
      the `weakness_drill` chip's `theme=` route + CoachTeachPage handler
      (2026-09-01)
- [x] P-III.4 **weakness briefing** — `assembleWeaknessBriefingAnswer`
      (most-pressing + persistent + emerging + cleaned-up + drill nudge)
      (2026-09-01)
Dependencies: full archive imported + analyzed (R1 stall fix is load-bearing);
a sample floor ("need more history"); the map is hand-authored.

## Part IV — Confirmed gap-computers
- [x] P-IV.1 **opponent-move "why"** — `assembleOpponentMoveAnswer` (chess.js
      geometry on the opponent's last move + standing threat), `isOpponentMove
      Question`, self-gates on the position (2026-09-01)
- [x] P-IV.2 **name-this-opening** — `assembleOpeningNameAnswer` via
      `detectOpeningTranspositional`, `isNameOpeningQuestion` (2026-09-01)
- [x] (capabilities = P-II.2; theory = P-II.1)

## Part V — Endgame technique (content already farmed; wire + generate)
Naroditsky endgame teaching is already in the corpus (`danyaTeachingService
.endgameNoteForLesson`) + `endgame-principles.json` + concept corpus + Syzygy
tablebase (`assembleEndgameAnswer`).
- [x] P-V.1 **endgame-technique computer** — `matchEndgameLesson` over the 27
      hand-authored lessons (Lucena/Philidor/opposition/…) + `assembleEndgame
      TechniqueAnswer`; falls in after the tablebase verdict for a no-board /
      general technique ask. voiceFacts phrases (2026-09-01)
- [ ] P-V.2 **Level 1 generative teaching** — on request, walk the **tablebase**
      line for a requested ending (canonical FEN), narrate the technique it is
      *reading* (moves tablebase-perfect ≤7 pieces; >7 = engine, honestly
      labeled). Same inversion as `generateOpeningFromDbNarration`.
- [ ] P-V.3 (follow-on) Level 2 — full *playable* generated endgame walkthrough
      (WLPP-style, tablebase as truth). Bigger; David: Level 1 now, Level 2 next.

## Part VI — Leftover phase
- [ ] P-VI.1 **P7** — phase-scoped post-game review from `trainingFocus`

## Part VII — Observability (the convergence engine)
- [x] audit fails if the banter lane ever ships a SAN/eval —
      `coachApi.banterContract.test.ts` (2026-09-01)
- [x] deflection-log report = the real missing-computer backlog —
      `emitGroundingCoverage` + `scripts/audit-coach-grounding-coverage.mjs`
      (already wired; P-I.4)

## Sequencing (dependency order)
1. ✅ Part IV gap-computers + Part II theory/capabilities + P-V.1 endgame computer.
2. ✅ Part I self-heal (P-I.3) + P-I.4 deflection log (already wired).
3. ✅ Part III weakness A+ (lifecycle + concept map + motif-drill + briefing +
   the blunder-vs-stronger capture) + Part VII observability gate.
4. ⏳ DEFERRED — separate, deliberately-staged follow-ups (NOT in this batch):
   - **P-I.1/2 full signal-extractor pipeline** — a REFACTOR, not new capability.
     The whack-a-mole is already addressed in substance: every computer
     self-gates (data-decides) and P-I.3/I.4 self-heal + log every miss. A
     signal-extractor module is an optimization; the PLAN's own rule is "wrap
     the fast-path, never rip it out — live paying app, no big-bang rewrite," so
     it does NOT belong in a large multi-computer push. Do it as its own change.
   - **Remaining 3 capture gaps** (missed-opponent-threat, endgame-type
     conversion split, structure-damage) — each needs a new per-move/structure
     detector; flagged honestly rather than faked.
   - **P-V.2 endgame Level-1 generative walk**, **P-VI P7 phase-scoped review**
     — enhancements, not gaps.

## Ship discipline
Batch coherent, tested chunks to `main` (not per-fix, not one 50-file mega-push
on a live paying app). ship-check green + G0 gates before each push. Post-deploy
3-instrument silent audit. Then read the deflection log for the next computers.

## Decisions log
- 2026-09-01 (David): full conversational DeepSeek — free on no-chess-claim,
  grounded on every chess claim incl. general theory; classifier aggressive.
- 2026-09-01 (David): NO LLM router (breaks G0) — data-decides via self-gating
  computers; self-heal loved; deflection-log = the backlog.
- 2026-09-01 (David): weaknesses C‑→A+ — lifecycle (incl. fixed-before-app),
  motif→behavior→CONCEPT teaching, motif-drills. Add missing captures.
- 2026-09-01 (David): endgame technique via tablebase-grounded generation, same
  G0 inversion as openings; Level 1 now, Level 2 next.

## Next-session pickup
Start at Sequencing step 1. Every new computer self-gates + routes through
`voiceFacts`; every fact from chess.js / engine / tablebase / DB / corpus. Run
`npm run ship-check`, then the silent prod audit.
