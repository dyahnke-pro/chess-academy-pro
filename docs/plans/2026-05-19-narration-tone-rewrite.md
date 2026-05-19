# Narration Tone Rewrite — Plan

**Date:** 2026-05-19
**Status:** ⏸ deferred — David's call: "we do the narration last"
**Owner:** Claude / David

## Why

David approved the tone from the Evans Gambit content draft (this
session, 2026-05-19) and asked: *"i want every narration in this
tone. not just the new stuff we added. possible? doable?"*

Yes — doable. This doc captures the plan so any session can resume
without re-deriving context.

## What "this tone" means

Pulled from the Evans Gambit draft. The voice rules:

1. **Confident, declarative** — say what to do and why, no hedge.
2. **Specific chess detail** — name squares, piece routes, named
   patterns (Compromised Defence, Qa4 pin, Bxh7 sac, Carlsbad
   structure, etc.). Never generic.
3. **Concrete plans, not abstractions** — "the Bc4 + Re1 battery
   will hammer e8" beats "White builds central pressure."
4. **Anti-marketing voice** — no "powerful weapon," no "discover
   the secrets of," no "unleash devastating attacks."
5. **History notes where genuinely informative** — names + dates
   for context (Anderssen 1852, Kasparov 1995). Skip if not adding
   chess understanding.
6. **No filler conjunctives** — drop "in this opening," "remember
   that," "as we discussed."
7. **Concrete piece names + squares, not pronouns** — "the c3-knight"
   not "the knight." "Bxf7+" not "the bishop takes."
8. **Tactical/positional verbs match the action** — "threatens,"
   "pressures," "kicks," "blunts," "outposts" — not "is good in,"
   "is useful for."
9. **Cite by SAN inside prose** — "5.c3 prepares d4" not "After 5.c3
   the next move is the d-pawn push."
10. **Banned phrasings:** "powerful," "devastating," "the secret of,"
    "key to success," "essential to remember," "we will see," "let
    me show you," "for example consider," "in conclusion."

## Scope — what gets rewritten

| Surface | Items | ≈ words | Notes |
|---|---|---|---|
| `repertoire.json:overview` | 40 | 3,200 | Per-opening intro paragraph |
| `repertoire.json:keyIdeas[]` | 160 | 3,200 | 4 bullets × 40 openings |
| `repertoire.json:variations[].name` + descriptions | ~300 | 9,000 | Per-variation strategy hint |
| `repertoire.json:trapLines[].name` + descriptions | ~250 | 7,500 | Trap setup + payoff prose |
| `repertoire.json:warningLines[]` descriptions | ~120 | 3,600 | What goes wrong + why |
| `middlegame-plans.json` overviews + pawnBreaks + pieceManeuvers | ~30 existing + new | 4,500 | |
| `common-mistakes.json` explanations | ~50 existing + new | 2,500 | |
| `checkpoint-quizzes.json` hints + concept tags | ~80 existing + new | 2,400 | |
| `model-games.json` overview + criticalMoments[] annotations | ~30 existing + new | 6,000 | Needs verified PGNs first |
| `pro-repertoires.json` — overview + keyIdeas + variations | ~82 entries | ~10,000 | Pro-tab equivalents |
| **Runtime narration** | Generated at runtime | n/a | Update prompts in `coachPrompts.ts`, `openingGenerator.ts`, `walkthroughLlmNarrator.ts` |

Total static text: ~52,000 words across ~900 entries.
Runtime narration: covered automatically once prompts are updated.

## Phased plan

**Phase 0 — Save this plan.** ← current step.

**Phase 1 — Tone guide doc** (`docs/voice-guide.md`, future).
Crisp single-page summary of the voice rules + 5 good/bad examples.
Used by any session writing new narration.

**Phase 2 — Update runtime LLM prompts.** One commit touching:
- `src/coach/coachPrompts.ts` — SYSTEM_PROMPT
- `src/services/openingGenerator.ts` — narration system prompt in
  `generateOpeningFromDbNarration`
- `src/services/walkthroughLlmNarrator.ts` — narration prompt
- `src/coach/sources/personalities/*.ts` — verify default
  personality matches the voice
After this commit, EVERY runtime LLM call speaks the new tone.
Static text is still old until Phase 3+.

**Phase 3 — Rewrite 40 opening overviews.** Most visible static
text. Stage to `audit-reports/staged/overviews-batch-<n>.json`,
show David sample diffs, merge in batches of 10.

**Phase 4 — Rewrite 160 key ideas.** Per-opening 4-bullet list.
Same batch + review pattern.

**Phase 5 — Variation / trap / warning descriptions.** Rolling
rewrite in batches of 10 openings.

**Phase 6 — Pro repertoires.** Same treatment as main openings.

**Phase 7 — Model games + middlegame plans + mistakes + quiz.**
The "new content" we're already drafting in this voice. Just keep
going at this depth.

## Sequencing logic

Phase 2 first (runtime prompts) because it's small + instant +
biggest user impact (live coach + walkthrough narration improve
immediately). Static text Phases 3-6 are bigger but discrete and
parallelizable.

## Validation gates per batch

Same as the content gates (see CLAUDE.md voice rules + chess.js
validation):
1. No banned phrasings (regex check)
2. No invented chess content (every SAN reachable via chess.js)
3. Every named pattern matches the curated taxonomy
4. Diff shown to David before merge
5. Audit script runs against the affected surface post-merge

## Decisions log

- **2026-05-19:** David approved the Evans Gambit draft tone.
  "i like it" / "i want every narration in this tone"
- **2026-05-19:** David said "save the plan, we do the narration
  last" — narration rewrite parks until other work completes.

## Other-work parking lot (do these first)

Per "we do the narration last," priorities ahead of narration:

- [ ] **Finish content generation** — 15 openings still missing
      Middlegame Plans / Common Mistakes / Quiz items. Evans
      Gambit drafted (this session); 14 more to do. Validation
      harness ready at `scripts/validate-content-batch.mjs`.
- [ ] **Trap repair pass** — 169 broken traps flagged by
      `audit-traps-stockfish`. Repair script ready at
      `scripts/repair-broken-traps.mjs` (proposal-only, no writes).
      Run it, review proposals, merge.
- [ ] **Model Games miner** — separate pass to get verified game
      PGNs for the Model Games section (28 openings missing).

## Next-session pickup

If you're resuming this from a fresh session:

1. Read this doc top to bottom.
2. Check if Phase 2 (runtime prompts) has landed yet — `git log --grep=tone` or `git log src/coach/coachPrompts.ts`.
3. If not, start there. It's the smallest highest-leverage change.
4. If yes, jump to whichever later Phase has staged content awaiting
   merge (look in `audit-reports/staged/`).
5. Never write to data files without staging → validation gates →
   David's OK. Per the 2026-05-19 directive.
