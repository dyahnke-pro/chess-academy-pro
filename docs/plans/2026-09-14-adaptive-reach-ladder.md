# Adaptive Reach Ladder — one persisted difficulty engine across the app (2026-09-14)

David's vision, locked over a long design conversation. The app's Elo/algo
training tools should all ride ONE adaptive difficulty controller that pushes the
user just past their level, is *felt* as a challenge, remembers where they got
to, and adapts freely up AND down to their true ability. Plus a real Master tier
and multi-move sequences at every level.

> "go big or go home."

## THE LOCKED SPEC

### 1. One persisted "reach rating" per player (the controller)
- **Persisted** in Dexie (`profile.preferences`), never session-reset. The edge
  they climbed to is still there next session.
- **Seed**: first-time only = their base `puzzleRating` + `STRETCH_SEED` (200).
  Thereafter RESUME the persisted reach (never re-inflate +200 each session).
- **Floats freely up AND down** to their TRUE tactical level. NO band cages
  (the current Easy/Medium/Hard floors block a weak solver from adapting down —
  David's pushback: "what if they're bad at tactics"). Floor only at the pool
  minimum (~400); ceiling at the pool max (~3000, Master band top).
- **Equilibrium ≈ 80% success (the learning zone), not 50%.** 50% = half your
  reps are failure = demoralizing + slower learning ("desirable difficulty" /
  the 85% rule). Tune so `down-step ≈ 4 × up-step` → equilibrium success
  `p = down/(up+down) = 0.8`. All constants tunable.

### 2. The challenge is FELT (David: "80% won't be felt")
The *feeling* of being pushed comes from the SLOPE and the SPIKES, not from a low
success rate (a low rate is just frustration; at the 80% edge each puzzle already
sits at the top of their ability, so it's a fight, not a freebie):
- **Streak ramp** — on a correct streak (≥3, ≥5) multiply the up-step so the
  rating climbs *hard* and the puzzles visibly toughen. Plateaus at the new edge
  when they start missing.
- **Boss spikes** — every N solves / on a hot streak, inject one puzzle WELL
  above reach (`SPIKE = +300…+400`), cued as a challenge. Missing a spike carries
  a REDUCED penalty (×0.25) so a boss never tanks the ladder or demoralizes.
- **Coach step-up cue** — on a real tier-cross / streak milestone, the coach
  says it ("you're solving these cleanly — let's step it up a notch"). Up is
  LOUD (celebratory); down is GENTLE (silent, or a soft "let's lock these in" —
  never "you're getting worse"). Visual level-up ALWAYS shows; the VOICE respects
  the verbosity setting (Silent users still see it). Cue is a COMPUTED trigger,
  the coach only voices it (G0). Milestone praise (allowed — not per-move).

### 3. Multi-move sequences — first-class at EVERY level, favored
- Difficulty and length are independent (a 3-mover can be rated 900 or 2200).
  So multi-move puzzles are served across the WHOLE ladder, not gated to hard.
  Beginner → easy 2-move combos; expert → brutal long ones.
- **Favored** in selection (David: "my favorite type, most beneficial") — weight
  toward `long` / `veryLong` / `mateIn2+` across every band.
- **NO length cap.** Sequences run their true length (5, 6, 8+). Length is a
  difficulty signal, never a ceiling. Reach controls only how much of a long line
  the student must find unaided before a hint — the puzzle is never truncated.

### 4. Master Level — new opt-in section, real master DB
- A "push me" section, NOT something the adaptive ladder drops you into. High
  floor (2400+, tunable).
- **Dedicated CC0 pool** pulled from the Lichess public puzzle DB
  (`database.lichess.org`, CC0 — same source as the current pool, full dump runs
  past 2600). Filter to 2400+, FAVOR multi-move, sample a few thousand. Ship
  **lazy-fetched from `public/data/master-puzzles.json`** (not bundled — keeps
  the JS bundle lean, same pattern as the farmed corpora).
- **Still adaptive** — same controller, seeded/floored in the elite band, floats
  within 2400↔2800+. Boss spikes still apply on top.
- **Own rating**, separate from the main reach (like the existing separate
  endgame rating) so a bad day at 2600 doesn't crater the normal tactics number.

### 5. Review questions become rating-targeted multi-move sequences
- Fire a sequence question whenever the game held a multi-move tactic — **for the
  player** (a shot they MISSED: "you had something — find it", then the line) or
  **against the player** (a tactic they WALKED INTO: "you played X — what did
  that let them do?", find the refutation). Extends the existing
  `seqState`/`runSequencePlayback`, not a rewrite.
- A game position has NO Elo, so estimate its difficulty from the line
  (sequence length + forcing + material + only-move) and target the player's
  reach ± a stretch; ask longer unaided as reach climbs.

### 6. Shared, and folds in the two existing systems
- ONE controller + ONE update rule shared by: **Tactics (adaptive) · Train My
  Mistakes · Teach Me Tactics · Review questions**. Folds in today's split
  (classic Elo `PuzzleTrainerPage` + session `adaptivePuzzleService`) so the two
  tabs stop behaving differently on the same account.
- **Kids excluded** — they have their own per-piece adaptive ratings; `/kid` is
  hands-off.

## CURRENT STATE (what exists today, from the review)
- `profile.puzzleRating` — persisted Elo, read+written by both puzzle tabs.
- `PuzzleTrainerPage` — pure Elo (converges to 50%). `AdaptivePuzzlePage` +
  `adaptivePuzzleService` — session float, `+50–75 correct / −(30–40+escalating)
  wrong`, clamped to Easy/Medium/Hard bands, end-rating persisted.
- Problems: adaptive equilibrium ≈ 37% success (too hard); band floors block
  adapting down; two update rules; no felt ramp/spike/cue; single-move only.
- `puzzles.json` — bundled Lichess CC0 subset (~15K), thin above 2400.
- Review question plan: `reviewQuestionPlan.selectReviewQuestions` (severity-
  ranked, budget-capped, single-move find-shot/trap/why). No rating targeting.

## PHASED BUILD (each phase: tests + ship-check + main push)
- **P1 — the controller.** `src/services/reachRating.ts`: pure, persisted-state
  math — seed, float (80% tune), streak ramp, boss-spike decision + reduced
  penalty, tier/streak milestone events, floor/ceiling, no band cage. Dexie
  persistence in `profile.preferences` (no schema bump — non-indexed fields).
  Full unit tests (equilibrium, ramp, spike, floor, persistence, milestones).
- **P2 — Tactics adaptive page = the flagship "feel it" surface.** Wire
  `AdaptivePuzzlePage` to the controller: felt streak-ramp, boss spikes, coach
  step-up cue (voiced + visual), no band cage, favor multi-move. Retire the
  band-clamp; keep Easy/Medium/Hard as *seeds*.
- **P3 — Master Level.** CC0 master pull (stream-filter the Lichess dump; CI or
  curated fallback if the dump is unreachable from here), `public/data/
  master-puzzles.json`, lazy loader, new section/tile, own rating, elite band.
- **P4 — Multi-move sequences in review.** Rating-targeted, for/against,
  extends `seqState`; difficulty from line length/forcing.
- **P5 — Fold in Train-Mistakes + Teach-Tactics** onto the shared controller.

## TUNABLE CONSTANTS (one place, dial after feeling it)
`STRETCH_SEED=200`, target success `0.80` (→ up/down ratio), streak ramp
thresholds (3,5) + multipliers (×2,×3), `SPIKE=+350`, spike miss-penalty ×0.25,
tier band width (~150), pool floor 400, Master floor 2400.

## GATES
`reachRating.test.ts` (math + persistence + milestones), master-pool integrity
(CC0, ≥2400, chess.js-legal, multi-move share), review sequence tests, cue-trigger
tests. Kids-untouched assertion. ship-check before every push; batch the OTA to
ONE cut at the end of the feature (David controls OTA).

## NEXT-SESSION PICKUP
Start at the current phase marker below. The controller (P1) is the keystone —
every surface reads it.

### Status
- P1 controller — pending
- P2 tactics wire — pending
- P3 master level — pending
- P4 review sequences — pending
- P5 mistakes/teach fold-in — pending
