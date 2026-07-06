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

## Follow-on (flagged, not in this pass)
- Log the raw picker answer (`userReason` is collected but the *chip* choice
  isn't) so "what I said vs what the board showed" is fully auditable per-answer.
- Emit a `discussion-picker-shown` audit so pickers-shown vs buckets-delivered
  can be reconciled (the two-popups-one-bucket question).

Status: engine — in progress.
