# Teach + Watch narration → the Naroditsky in-game register (2026-07-19)

David (2026-07-18/19): bring the **/coach/teach walkthrough** and the **Watch/matchup**
narration up to the same Naroditsky standard the post-game review reached in the Danya
build — using the 10 transcripts + the tape rubric. **BUT** (locked, said heading to bed):
*"his post game review is different from his in game narrations. Don't just copy
everything post game review has into watch and learn narrations."*

## The register distinction (locked in CLAUDE.md — the guardrail for this work)

- **Review register** (`/coach/review`) = RETROSPECTIVE, the user's OWN game, mistake-aware:
  "you played X, best was Y", "your opponent slipped", "the turning point…", "your plan vs
  the opponent's plan." Produced by `buildReviewSegments` + `openingIdeasNarrator`.
- **In-game / Watch / Learn register** (`/coach/teach` walkthrough, matchup Watch,
  model-game playback, WLPP) = PRESENT-TENSE live teaching of a DEMO game: "White develops,
  eyeing the center; Black answers …, and the tension builds." NO mistake-recap, NO "best
  move was", NO "YOUR plan" framing (it's "White's plan / Black's plan"). Produced by
  `generateOpeningFromDbNarration` (openingGenerator.ts) — a SEPARATE engine.
- **Shared spine** (may carry across): opening naming, both sides' plans, structural beats
  (anchor→plan→target), per-move WHY (board-verified, never padded), playing lines out with
  the why spoken per move.

## Current-state assessment (2026-07-19)

The Teach/Watch engine (`generateOpeningFromDbNarration`, prompt at openingGenerator.ts
~L1302) is ALREADY substantially in the correct register:
- House voice = Naroditsky teaching (David 2026-07-05 block). ✓
- Teaches the IDEA/WHY per move, keystone vs routine word-spending. ✓ (R2)
- Central through-line / hook intro. ✓ (partial R3)
- Grounded on the Danya teaching corpus (`buildDanyaTeachingBlock`), not book passages. ✓
- No move-number prefixes; SAN-in-prose; board-truth gated by `narrationAccuracy`. ✓
- The matchup Watch already speaks real per-move why ("e4 — White grabs the center and
  opens lines", "c5 — the Sicilian refuses symmetry"). ✓
- Watch/matchup is FUNCTIONAL end-to-end (audited 8/8, `audit-coach-watch-matchup.mjs`). ✓

So this is NOT a rewrite — the register is already right. It's a **refinement toward the
tape's specific in-game habits**, plus David's explicit anti-overstatement caveat.

## Gaps vs the tape rubric (from `data/sources/naroditsky-voice/review-register-rubric.md`)

The rubric distilled the in-game register from 10 transcripts. Gaps the current prompt
does NOT yet instruct:

1. **Anti-overstatement of the WHY (David 2026-07-19, explicit: "be careful not to
   overstate the why, I don't want non-applicable reasons stated").** The tape states ONE
   named target *"because the pawn on d6 is far from a monster"* — a single true reason,
   not a laundry list. Multi-reason is fine WHEN each clause is genuinely true of THIS
   position (David: "if more than one reason exists it's ok to state more than one why").
   The prompt has no guard against padding. → add: state only reasons TRUE of this exact
   position; one true reason beats three plausible ones; never generic filler.
2. **Structural beat skeleton** (rubric §1a): ANCHOR (the trigger: structure/pawn-event/
   piece-placement) → PLAN (a maneuver as a square-by-square itinerary) → TARGET (ONE named
   weakness, with "because") → optional WARNING (rule-then-exception) / TRANSFER. On a
   KEYSTONE move, shape the why this way instead of a flat sentence.
3. **Name the opening in the first 1–3 moves + re-name the variation at every branch**
   (rubric §2). The intro poses the through-line but is told NOT to name-by-move; ensure the
   opening/variation is NAMED early in prose and each fork branch idea NAMES its line.
4. **Rule-then-exception** ("the moment Black plays c6 you almost always play a4… BUT…").
   The tape states the RULE first, then the concrete exception — a habit worth one line.

Not in scope for this pass (present-tense register makes them N/A or they're review-only):
mistake-recap, "best move was", question-before-answer diagnostics (that's the review/
faucet surface, not passive Watch), theory-source-honesty asides (nice-to-have, later).

## Plan (incremental, gated, audited — one focused prompt change, not a rewrite)

- [x] Lock the register distinction + the real-game audit standard in CLAUDE.md (done, this session).
- [x] Assess the current engine + distill the in-game gap from the rubric (this doc).
- [ ] **Phase A — anti-overstatement + structural-beat + name-early prompt refinement** in
      `generateOpeningFromDbNarration` (openingGenerator.ts). Additive HOUSE-VOICE bullets:
      (1) the WHY discipline (only position-true reasons, never padded); (2) the keystone
      structural skeleton (anchor→plan→target, itinerary routes, one "because" target);
      (3) name the opening/variation early + at each branch. Keep it tight — the prompt is
      already good; this sharpens it toward the tape, does not bloat it.
- [ ] Gate: `narrationAccuracy`, `lessonIntegrity`, `narrationGrounding`, `lessonDepth`,
      `wlppNarration` + `ship-check`. (LLM prose is non-deterministic; the gates enforce
      board-truth so a sharper prompt can't invent.)
- [ ] Audit the actual generated narration against the rubric: re-run
      `audit-coach-watch-matchup.mjs` (voice fired, per-move why) + a spot Teach walkthrough,
      confirm the why is applicable + the opening is named early. 3 instruments.
- [ ] Ship batched to `main`; post-deploy audit; pull audit-stream (narration events).

## Task #5 (separate, review-path): play out BOTH lines on the board

David: "he talks about different lines and plays them out… the lines come from Stockfish
best moves… state the why behind the best moves as the user watches." This is the
review/analysis "show both lines" habit (the practical line + the engine-best alternative),
distinct from the Watch walkthrough which already plays its spine out. Tracked separately;
needs the review PV-playback surface, not the walkthrough engine.

## Next-session pickup

The register distinction is LOCKED in CLAUDE.md — read it first. The engine is already in
the right register; this is a refinement pass, not a rewrite. Do NOT port review's
retrospective phrasing into the walkthrough prompt. The tape rubric
(`data/sources/naroditsky-voice/review-register-rubric.md`) is the bar; the transcripts are
reference-only (no verbatim). Audit generated narration against the rubric, not just "it
rendered."
