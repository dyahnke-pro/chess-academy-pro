# PLAN — Coach Phase 2: finish the weakness read, teach endgames at depth (2026-09-01)

Owner: David. Phase 1 (the master build — 6 new grounded computers + weakness
**C‑ → A+** + capture gap + self-heal + observability) **SHIPPED to `main`**
tonight (019a2fa, 9f4fa86), prod-audited 12/12 muted. Archived at
`docs/plans/2026-09-01-master-build-SHIPPED.md`.

This is the game plan for what's LEFT — same shape, same spine.

## The G0 guarantee (unchanged — the spine of every item)
- The LLM **never picks the chess fact and never invents one.** It phrases
  computed facts via `voiceFacts` (the one chokepoint) and does nothing else on
  the chess path.
- **Data decides**, not the LLM. Every computer self-gates (`null` when it
  doesn't apply); the one with real facts wins. No LLM router.
- Cannot compute → honest decline + **log it** (`emitGroundingCoverage`). Never
  invented chess.

## Ship discipline (unchanged)
Batch coherent, tested chunks to `main` — one push per batch, ship-check green +
G0 gates first, then the muted 3-instrument prod audit, then read the deflection
log. Never a 50-file mega-push on the live paying app.

---

## 🅐 Batch A — the 3 remaining weakness capture gaps  (do FIRST: highest value, lowest risk)
David: *"if you see us missing something, PLEASE ADD."* Each is a new detector
feeding the SAME weakness spine (`getUnifiedWeaknessProfile`), so each is small,
self-contained, and testable — the exact pattern of `aggregateStrongerOpponentErrors`.

- [ ] **A0. theory-lane precedence fix** (found by tonight's prod audit) — "how
      do I play **against** an isolated queen pawn" is swallowed by the
      opponent-record / player-games lane ("no games against … logged") before
      the new theory lane sees it. Guard the record/player-games lane against a
      STRUCTURE/CONCEPT noun (isolated pawn, IQP, bishop pair, weak square…), or
      raise `isTheoryQuestion` precedence for "against <structure>". Gate:
      extend `audit-coach-new-lanes-prod.mjs` to assert the IQP answer is the
      CORPUS teaching, not a record miss.
- [ ] **A1. missed-opponent-threat / prophylaxis** — the loose-piece heart: we
      capture *your* hang, not "you missed *their* threat." A per-ply threat
      probe (null-move / `detectTactics` from the opponent's side) over stored
      analyzed games → `aggregateMissedThreats` → a UnifiedWeakness row +
      concept ("prophylaxis / ask what they want"). Board-verified; empty when
      thin.
- [ ] **A2. endgame-type conversion split** — thrown wins ARE captured
      (`aggregateConversionFailures`); add the ENDING-TYPE classification
      (R+P / K+P / minor-piece) at the point the game reached the ending, so
      "you lose rook endings" is nameable and routes to the P-V.1 endgame lesson.
- [ ] **A3. self-inflicted structure damage** — a pawn-structure delta detector
      (doubled / isolated / backward you created without compensation) over
      analyzed games → `aggregateStructureDamage` + concept (pawn structure).
- [ ] **A4. wire the new captures into the lifecycle + briefing** so they show in
      "what's my biggest weakness" and the drill chip scopes to them.

Gate for A: `weaknessSpine.test` rows + a lifecycle test + the prod new-lanes
audit extended with a seeded fixture (`loadFixtureIntoIDB`).

## 🅑 Batch B — endgame Level-2 (P-V.2): INTERACTIVE tablebase trainer  ✅ BUILT (2026-09-01)
David: *"not just walks out but allows the user to play and explains the why
behind any mistakes and allows for the user to correct."* Watch → Play → Correct.
- [x] B1. `endgameTablebaseService` — the TRUTH engine: `tablebaseMoves` (per-move
      WDL/DTZ), `bestEndgameMove`, `gradeEndgameMove` (optimal / slower /
      threw-win / threw-draw + grounded why), `buildTablebaseWalk` (perfect line
      + notes). G0/G3: tablebase decides, chess.js validates, LLM out of the loop.
      Gate: `endgameTablebaseService.test.ts` (6).
- [x] B2. `EndgameTablebaseTrainer` — Watch (perfect walk + arrows + notes) →
      Play (user plays, tablebase replies optimally) → Correct (on a real
      mistake: revert to the decision, speak the grounded WHY, "Show me" plays
      the best move). `EndgameTrainerPage` + route `/coach/endgame-trainer/:id`
      (loading/not-found/no-position states). Gate: `EndgameTrainerPage.test.tsx`.
- [x] B3. Coach launch — "play the Lucena with me" (`isEndgamePlayRequest`) →
      `endgame_trainer` action offer → the "Play this ending" chip mounts the
      trainer. Boardless endgame asks now engage grounding (OR-gate add).
- [ ] B4. (follow-up) lead-the-eye per-move highlights beyond the move arrow;
      a prod interactive audit driving a mistake → correction on the live build.

## 🅒 Batch C — P-VI P7: phase-scoped post-game review
- [ ] C1. Filter the post-game review to the phase the student's `trainingFocus`
      flags (opening / middlegame / endgame), so a review zooms to where they
      actually lose. Reuses the existing review engine + the phase tags already
      on mistake puzzles.

## 🅓 Batch D — the universal signal-extractor pipeline (P-I.1/2)  — DATA-GATED, rides ALONE
- [ ] D1. A pure signal-extractor (SAN? square? self-ref? time-ref? wh-word?
      comparison? board present?) + a candidate-map dispatch that WRAPS the
      existing regex fast-path (never rips it out).
- **Why it's last and gated:** the whack-a-mole is already handled in substance
  — every computer self-gates (data-decides) and P-I.3/I.4 self-heal + log every
  miss. D is a *refactor*, not new capability, and your rule is "no big-bang
  dispatch rewrite on a live paying app." **Recommendation: run the deflection
  log (`scripts/audit-coach-grounding-coverage.mjs`) for ~a week first and let
  the DATA say which phrasings actually miss** — then D is targeted, not
  speculative. Don't build D until the log earns it.

---

## Sequencing
1. **Batch A** (incl. A0 precedence fix) — one push. Highest user value.
2. **Batch B** — one push.
3. **Batch C** — one push.
4. **Batch D** — only after a week of deflection-log data justifies it.

## Decisions log
- 2026-09-01 (David): after Phase 1 shipped, build the same game-plan format for
  the rest. Order A→B→C→D; D data-gated.
- 2026-09-01 (Claude, pushback accepted pending David): D (pipeline refactor)
  may not be worth its risk — let the live deflection log decide.

## Next-session pickup
Start at Batch A0 (the precedence fix tonight's audit found), then A1–A4. Every
new detector self-gates + routes through the weakness spine; every fact from
chess.js / engine / tablebase / DB / corpus. `npm run ship-check`, then the
muted prod audit, then read the deflection log.
