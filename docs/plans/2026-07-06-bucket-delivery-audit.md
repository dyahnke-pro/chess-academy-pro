# Bucket Delivery + Organization Audit Tools — 2026-07-06

**Ask (David):** *"We need audit tools for bucket delivery and organization."*
Triggered by the Vienna Learn-with-Coach session: David saw **two** "why'd
you play that?" pickers but only **one** `misconception_captured` reached
PostHog — and there was no tool to prove whether that was correct (a
good-move probe doesn't bucket) or a dropped delivery. The raw picker answer
isn't logged, so bucket delivery is currently *inferred*, not *verifiable*.

## The pipeline being audited (ground truth, file:line)

1. `slipDetector.detectSlip` — rating-adaptive gate: does this move warrant a
   picker? (beginner→blunder, intermediate→≥100cp, advanced→≥50cp).
2. `discussionPractice.captureMisconception` — orchestrates classify → log.
3. `misconceptionClassifier.classifyMisconception` — **deterministic** (no LLM,
   G0): board inspection → ONE closed-set tag (`misconceptionTags.ts`).
4. `misconceptionService.logMisconception` — persists to `db.misconceptionTags`,
   emits `misconception-captured` audit with `bucket=`.
5. Option-B dual-write: a counted slip w/ `bestSan` → `addMistakePuzzleFromCapture`
   → `db.mistakePuzzles` (the drillable rep).
6. `weaknessSpine.getUnifiedWeaknessProfile` — merges coach + analysis rows,
   dedups by position (coach wins), ranks by openCount→severity→recency.
7. `misconceptionService.mapTagToDrills` — tag → drill plan (themes + positions).

## What the tools verify

### DELIVERY — an answer reaches the right bucket and drives a drill
- `UNKNOWN_TAG` — every captured tag is in the closed set (hallucination guard held).
- `BUCKET_MISMATCH` — the row's bucket matches the tag def (`other`→phase bucket).
- `OTHER_NO_LABEL` — every `other` row carries a customLabel.
- `COUNTED_NO_DRILL` — every counted slip w/ bestSan has a matching mistakePuzzle
  (Option-B dual-write landed) — the "dropped delivery" detector.
- `DROPPED_FROM_PROFILE` — every counted capture surfaces in the unified profile
  (or is correctly deduped into an analysis row), nothing silently dropped.
- `DRILL_PLAN_EMPTY` — every non-`other` bucketed tag with due instances yields a
  non-empty `mapTagToDrills` plan.

### ORGANIZATION — buckets are correct + well-ordered
- `INVALID_BUCKET` / `EMPTY_LABEL` — every unified row has a valid bucket + label.
- `RANK_OUT_OF_ORDER` — profile is monotonic by openCount→severity→recency.
- `DUP_ACROSS_PIPELINES` — no position in both a coach row and an analysis row.
- `SRS_LEVEL_OOB` / `SRS_DUEAT_INCONSISTENT` — masteryHits in range; dueAt sane.
- `NEVER_GRADUATES` — no row parked beyond the max interval (would fall out of
  the loop permanently — David's "never graduates out" contract).

## Deliverables

- `src/services/bucketPipelineAudit.ts` — pure invariant engine over the Dexie
  stores. `auditBucketPipeline()` → `{ captures, buckets, delivery, organization,
  violations }`. Browser-independent (mirrors `continuityPreflight`).
- `src/services/bucketPipelineAudit.test.ts` — unit gate: seeds clean + broken
  captures, proves every invariant fires and clean data passes. In ship-check.
- `window.__bucketAudit` bridge (guarded) so the loop can run it in the live app.
- `scripts/audit-bucket-delivery-loop.mjs` — Playwright loop: seed synthetic
  captures into IDB, run the engine in-page, assert 0 violations, print the
  bucket map + delivery/organization rollup. 3-consecutive-clean-pass contract.
- Wire into ship-check gate list, the Post-Deploy Audit matrix, `docs/AUDIT_INDEX.md`.

## PostHog events added (standing order: document event names + props)

- **`discussion_response`** — fired on every LEARN picker answer.
  Props: `surface`, `kind` ('slip'), `response` (the answer text or
  "(could not say)"), `response_mode` ('chip'|'typed'|'hint'), `was_hint`,
  `move`, `game_phase`, `cp_loss`, `should_count`, `student_rating`,
  `logged_tag` (the classified misconception tag), `bucket`. **This is "see
  how the user responds to the pop-ups."**
- **`discussion_good_move`** — fired when a near-best move that set up a tactic
  is recognized (NON-BLOCKING, no picker). Props: `surface`, `move`,
  `game_phase`, `cp_loss`, `student_rating`. Lets us see the good/slip ratio.

Query how users respond:
`node scripts/posthog-query.mjs "SELECT properties.response_mode, count() FROM
events WHERE event='discussion_response' AND timestamp > now() - INTERVAL 7 DAY
GROUP BY properties.response_mode"`

## Delivered (2026-07-06)

- ✅ **Audit engine** `bucketPipelineAudit.ts` (13 invariants) + unit gate
  `bucketPipelineAudit.test.ts` (6/6) — in ship-check.
- ✅ **Good-move picker cut** — `useDiscussionPractice` routes a good move to a
  non-blocking spoken "atta boy" (`speakForced`, honors verbosity) + a
  `discussion_good_move` event; the blocking picker is slips-only.
- ✅ **Response logging** — `discussion_response` on every picker answer,
  carrying the raw response + mode + resulting bucket.
- ✅ **Adaptive verified** — `slipWarrantsInterjection` gate wired end-to-end
  (rating passed from `CoachTeachPage:3759`); covered by the hook test's
  "120cp mistake interrupts a 1200 but not an 800" case.
- ✅ **Live audit tool** `window.__bucketAudit` bridge + `audit-bucket-delivery-loop.mjs`
  (clean-delivery + drop-detection scenarios). Registered in AUDIT_INDEX.

Status: COMPLETE. Follow-on (future): a `discussion_picker_shown` event to
reconcile pickers-shown vs buckets-delivered directly.
