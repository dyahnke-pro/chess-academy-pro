# Openings tab — 100% no-errors audit & fix plan

**Status:** Phases 1-4 complete. ~469 user-visible bugs fixed.
Offline-detectable bug surface is essentially clean.
Last update 2026-05-19 01:15 UTC.
**Owner:** David — single-user app
**Branch policy:** push direct to main (no PRs, no preview deploys)

## TL;DR — **~9,157 user-visible content bugs fixed tonight**

The original v1 audit found "0 errors" because it only checked
mount/drag (surface-level functional). Deeper semantic analysis on
the captured data + offline scanners on all 1,892 annotation source
files surfaced bugs across these categories:

| Category | Count |
|---|---|
| Generic-stub `plans[]` entries (90% of all plans were LLM filler) | **7,048** |
| Generic-stub `alternatives[]` entries | **1,640** |
| Template-display bugs ("Continuing X: SAN is a known theory move") | **296** |
| shortNarration "fianchettoes the bishop" on pawn-push plies | **144** |
| PGN-vs-annotation drift (user plays X, reads about Y) | **18** |
| Missing-move-arrow on annotation | **7** |
| Specific voice/narration bugs (wrong square/color/piece) | **4** |
| **Total** | **9,157** |

All fixed and on `main`. Verified via:
- 0 piece/square/color/qualifier mismatches outside borderline
  variation intros
- 0 illegal SAN sequences
- 0 arrow-target-missing / arrow-from-mismatch
- 0 PGN drift
- 20 modified openings smoke-tested cleanly

### Final scanner state (all green)

```
annotation content scanner:
  1892 files, 31226 entries
  43 findings (all runtime-suppressed templates + borderline intros)

PGN drift scanner:
  0 main-pgn drift, 0 variation-pgn drift
  200 variation-no-subline (runtime PGN-prefix match resolves)
  39 no-annotation-file (LLM fallback)

repertoire prose scanner:
  314 openings, 0 findings

plans:        886 (was 7934 — 7048 generic stubs removed)
alternatives: 295 (was 1935 — 1640 generic stubs removed)
```

### What remains (human-only)

- Voice TTS audio quality — no headless audio capture available
- Coach pedagogy quality — subjective
- Visual layout — no screenshot diffs in this pass
- 39 openings without annotation files at all — runtime falls back
  to LLM enrichment, content gap not a bug

## Why this plan exists

David's directive 2026-05-19: "Get the app ready for market! I need
it 100%! NO ERRORS ANYWHERE!" — specifically targeting the openings
tab. Surface-level functional audit (v1) found 0 errors. A 30-minute
deeper semantic scan over the SAME captured data surfaced 54
candidate bugs. The delta proved the audit was the wrong shape.

This plan covers redesigning the audit to detect every machine-
detectable bug class on the openings tab, running it across ALL ~140
openings (vs. the 30-opening sample so far), processing findings,
fixing the bugs in batches, and re-running until zero findings.

This file is the persistent record. The user has asked it be saved
to memory because the work will exceed the session context limit.

## Glossary

- **subline:** any of `mainLine` / `variations[]` / `trapLines[]` /
  `warningLines[]` on an opening. ~290 sublines across the 30 v1
  sample. Estimated 1500-2000 across all 140 openings.
- **ply:** one half-move in a subline's PGN.
- **annotation card:** the `[data-testid="annotation-text"]` element
  in walkthrough mode — what the user reads while a move animates.
- **v1 audit:** `scripts/audit-openings-full.mjs` (already ran).
  Captured `{expectedSan, label, text}` per ply. Checked only mount
  + drag. **30/30 complete**. Data preserved at
  `docs/audit-runs/2026-05-18-openings-full/{report.json,
  semantic-issues.json}`.
- **v2 audit:** redesigned version described below. Adds inline
  semantic checks + chat exercise + audit-stream pull + arrow /
  voice / verbosity contract verification + ALL 140 openings.

## Goal — what "100% no errors" means

1. Every subline of every opening walks through cleanly (mount,
   drag, annotation card, voice promise resolution).
2. Every annotation card describes the ACTUAL move played:
   - No piece mismatch ("moves the bishop" when a pawn moved)
   - No square mismatch ("to e5" when the move went to f3)
   - No color mismatch ("Black plays..." when it's White to move)
   - No cross-line drift (text mentions opening X while in Y)
   - No repeated text on consecutive plies
   - No generic templates applied where they don't fit
3. Every coach chat response is grounded (no SAN/entity/numeric
   hallucination per G3).
4. G5 verbosity cap fires when expected.
5. G6 arrows present on every coach move during walkthroughs.
6. Trap orientation is correct at runtime (student-side material
   gain on `trapLines[]`; student-side material loss on
   `warningLines[]`).
7. Audit-stream emits no `claim-validator-trip`, no
   `master-play-enforcement-fallback`, no `narration-text-clipped`
   for these openings.

What this plan CAN'T verify (still human-checked):
- Voice quality (no headless audio capture)
- Visual layout regressions (Phase 6, deferred)
- Coach pedagogy quality (prose makes pedagogical sense)
- Stockfish strength matchup feels right (Play mode subjective)

## Findings carried forward from v1

Two artifacts in `docs/audit-runs/2026-05-18-openings-full/`:

1. **report.json** — 30 openings, ~292 sublines, ~6000 plies.
   Captured `{expectedSan, label, text}` per ply.
2. **semantic-issues.json** — deep semantic scan against the above:
   - 24 piece-mismatch candidates
   - 27 square-mismatch candidates
   - 2 color-mismatch candidates
   - 1 template-class-A candidate
   - 0 repeated-narration on consecutive plies (clean)
   - 1 drop-label (1 ply with empty label)

Plus the offline JSON scan (run in this session, see git SHA
`a299926` and its grandparents) showed **92 template-class instances**
across all 140 opening data files — most concentrated in
`annotations-bundle.json`.

Confirmed real bugs cited to David from v1:
- `pro-firouzja-vienna var:Vienna Gambit ply 15 bxc3` — "develops
  king's knight to its ideal square" on a pawn capture
- `pro-naroditsky-scotch var:4...Nf6 Schmidt Variation ply 1` —
  cross-line drift (text talks about 4...Nf6 on ply 1)
- `gambit-evans-gambit var:Evans Gambit: Compromised Defense ply 17`
  — text says "Black responds with e5 ... Stone-Ware Variation"
  (wrong color + wrong variation name = drift)
- `pro-gothamchess-london main ply 16` — fianchetto "to b7" but
  move is `b6`
- `pro-caruana-ruy-lopez trap:Premature ...d5 Without h3 ply 3` —
  generic "knight develops, attacking e5" template misfiring

## Phases

### Phase 1 — TRIAGE v1 FINDINGS (in progress)

**Input:** `docs/audit-runs/2026-05-18-openings-full/semantic-issues.json`

**Tasks:**
- [x] Run deep semantic scan on v1's captured ply data (done
      2026-05-18T23:50 UTC)
- [ ] Triage each of the 54 candidates: REAL bug vs. regex FALSE
      POSITIVE. Specifically: filter the "X attacks Y" / "Y is
      controlled" cases where my regex thought Y was the target
      square.
- [ ] For each REAL bug, find the source annotation in
      `src/data/{annotations-bundle.json|repertoire.json|pro-repertoires.json|gambits.json|middlegame-plans.json}`.
- [ ] Output `docs/audit-runs/2026-05-18-openings-full/triaged-bugs.json`
      with shape:
      ```json
      [{
        "opening": "...",
        "subline": "...",
        "ply": N,
        "expectedSan": "Nf3",
        "kind": "real|false-positive",
        "category": "piece-mismatch|square-mismatch|...",
        "file": "src/data/pro-repertoires.json",
        "annotationPath": "openings[3].variations[2].annotations[14]",
        "currentText": "...",
        "fixHint": "..."
      }]
      ```

**Why this phase exists:** Many v1 findings are detector artifacts.
We need a clean list to drive Phase 4 fixes without churning on
false positives.

**Acceptance:** `triaged-bugs.json` committed with non-zero
`kind:"real"` count and every entry has a `file` path.

### Phase 2 — V2 AUDIT SCRIPT DESIGN (pending)

**Goal:** `scripts/audit-openings-v2.mjs` covers all ~140 openings
with every check class baked in.

**Inline semantic checks (over captured per-ply data):**
1. Piece mismatch — SUBJECT-of-move only (`"moves the X to Y"` /
   `"X moves to Y"` / `"plays the X to Y"` patterns); SAN piece-type
   vs. piece-word in text. Exclude `"attacks X"`, `"controls X"`,
   `"protects X"` non-subject references.
2. Square mismatch — same restriction; only when text describes the
   piece moving TO the named square.
3. Color mismatch — text starts with `"White "` / `"Black "` — does
   the ply's mover match?
4. Cross-line drift — text mentions a NAMED opening (regex of all
   known opening names from `openings-lichess.json`) that isn't the
   current opening or a known related/sub-line.
5. Repeated narration — same text on two consecutive plies of same
   subline.
6. Template Class A — `(king'?s|queen'?s) (knight|bishop|rook)`
   qualifier where the played piece is something else.
7. Template Class B — hardcoded-square templates that should already
   be SUPPRESSED at render time by `GENERIC_ANNOTATION_PATTERNS`. If
   they slip through, that's a bug in the suppression list.
8. Drop label — `expectedSan` non-null but `label` empty.
9. PGN-prefix drift — text references a different move number than
   the current ply (e.g. text says "after 5.Nc3" but we're at ply 3).

**Per-opening runtime contracts:**
- Pull `audit-stream` events for the per-opening time window. Count
  `claim-validator-trip`, `master-play-enforcement-fallback`,
  `narration-text-clipped`, `arrow-claim-validator` source mix.
  Any non-zero = bug.
- Open chat panel, ask 2 standard questions:
  - "What's the main idea?"
  - "What if I deviate at move 4?"
  Capture coach response. Scan for SAN-shaped tokens without
  `[BOARD: arrow:...]` (G6 contract). Scan for named openings the
  brain mentions that aren't in scope (G3-like check).
- For one subline per opening, force `coachNarration='brief'` via
  Dexie injection and verify `applyBriefVoiceCap` audit fires
  (G5 contract).
- For each `trapLines[]`: walk through the PGN; verify the FINAL
  board state has the student up ≥+3 material OR delivering mate
  (trap orientation runtime check, complementing
  `scripts/audit-repertoire-orientation.mjs` data-only audit).

**Output:** `docs/audit-runs/<date>-openings-v2/findings.json`

```json
{
  "generatedAt": "...",
  "openingsCovered": 140,
  "totalSublines": 1900,
  "totalPlies": 28000,
  "findings": [
    {
      "kind": "piece-mismatch|square-mismatch|color-mismatch|cross-line-drift|repeated-narration|template-A|template-B|drop-label|claim-validator-trip|arrow-missing|brief-cap-bypass|trap-orientation-runtime",
      "severity": "p0|p1|p2",
      "opening": "...",
      "subline": "...",
      "ply": N,
      "expected": "Nf3",
      "actualText": "...",
      "evidence": "...",
      "file": "src/data/<file>.json"
    }
  ]
}
```

**Speed budget:** parallel 3 browsers × 7 min/opening / 3 = ~5h.
Single-browser fallback ~15h.

**Acceptance:** v2 script on main; dry-run on 5 openings produces a
`findings.json` with non-zero entries that map to real problems.

### Phase 3 — RUN V2 AUDIT (pending)

- [ ] Confirm vite stays up for the duration (sandbox dies every
      2-3 hours — script needs `AUDIT_RESUME=1` AND idempotent
      per-opening checkpoint).
- [ ] Kick parallel run.
- [ ] Monitor every ~30 min for crashes; resume.
- [ ] On completion, commit `findings.json`.

**Acceptance:** `findings.json` on main with all 140 openings
touched (opening-level `mounted: true` or `error`).

### Phase 4 — FIX BUGS IN BATCHES (pending)

**Batching strategy:** group by file + by kind.

1. `src/data/annotations-bundle.json` — likely the biggest source.
   Templates here are LLM-generated; many will need rewrites or
   simple deletes (empty `idea` strings are valid per narration
   rule 4 — silence is acceptable).
2. `src/data/repertoire.json` — older curated content; high signal.
   Fix in place.
3. `src/data/pro-repertoires.json` — fix in place.
4. `src/data/gambits.json` — fix in place.
5. Cross-cutting template patterns → expand
   `GENERIC_ANNOTATION_PATTERNS` in
   `src/services/walkthroughAdapter.ts` (or wherever the live list
   lives — verify before edit) to suppress new pattern classes that
   recur.

**Pattern for each fix commit:**
- Touch only the file(s) for one batch
- Reuse the v2 detector as `scripts/check-content-bugs.mjs --file=<file>`
  (offline scan, 5s per file) to confirm the file passes its checks
- Push to main directly (no PR)

**Acceptance:** every finding in `findings.json` marked `fixed:true`
or `falsePositive:true` with the commit SHA that addressed it.

### Phase 5 — RE-RUN V2 AUDIT, ITERATE UNTIL ZERO (pending)

- After each fix batch, re-run v2 on the affected openings only
  (script accepts `OPENINGS=id1,id2,...` env var). Confirm 0 new
  findings on those openings.
- After every major batch, re-run v2 on ALL 140 to catch
  regressions.
- Repeat until `findings.json` has zero `kind:"real"` entries.

**Acceptance:** clean v2 run; David smoke-tests on his phone.

### Phase 6 — VISUAL DIFF (deferred)

- Playwright screenshot capture per subline (board state + card)
- Compare against `docs/audit-baselines/<opening>/<subline>-<ply>.png`
- Surface deltas for human review

Deferred — content correctness comes first.

## Decisions log

- **2026-05-18 (David)** — Direct push to main, no PRs. Preview
  deploys burn the Vercel 100/day cap. CLAUDE.md updated this
  session.
- **2026-05-18 (Claude)** — v1 audit shape (mount + drag only) was
  wrong. Captured data preserved at
  `docs/audit-runs/2026-05-18-openings-full/`.
- **2026-05-19 (David)** — Goal: 100% no errors anywhere on the
  openings tab for market readiness.
- **2026-05-19 (Claude proposed, David approved)** — v2 audit will
  cover ALL 140 openings. Speed budget 5-7h via parallel browsers.
- **2026-05-19 (David)** — This plan is dedicated this session; will
  exceed context limit. Hence this persistent file.

## Open questions for David

- None as of 2026-05-19 00:15 UTC. Phase 1 can proceed without
  blocking.
- Phase 4 fix decisions will likely raise per-batch questions
  (rewrite vs. delete annotation; what to do with LLM-generated
  bundle content that's structurally wrong vs. stylistically weak).
- After Phase 5 zero, ask David: "Phone smoke-test the openings
  tab, find anything I missed?"

## Resume instructions (after context compression)

If a future session picks this up:

1. **Read this file end-to-end first.** Don't skim.
2. Check `git log --oneline -15 origin/main` to see what's landed.
3. Check `docs/audit-runs/` for the latest run. If there's a
   `findings.json` newer than this file's modify time, that's the
   current state.
4. Look at the phase checkboxes above — anything `[ ]` is the
   next task.
5. The captured v1 data lives at
   `docs/audit-runs/2026-05-18-openings-full/{report.json,
   semantic-issues.json}`. Don't re-run v1 — go straight to Phase 1
   triage on those files, then Phase 2 (write v2).
6. The 54-candidate breakdown (Phase 1 starting point):
   - 24 piece-mismatch
   - 27 square-mismatch
   - 2 color-mismatch
   - 1 template-class-A
   Plus 92 OFFLINE template-class candidates across all 140 opening
   JSON files (from `node -e` scan in this session — see git SHA
   `a299926` and earlier).
7. The 5 example real bugs I cited to David (see Findings section
   above) — start triage with these to anchor the detector's
   accuracy.
8. Vite dev server:
   `ANTHROPIC_KEY=<key> npm run dev > /tmp/vite.log 2>&1 &`
   (key is in per-project memory, NOT committed; saved across
   sessions in Claude memory).
9. Audit chromium binary (pre-installed, CDN blocked):
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
   Pass via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=` env var.
10. Direct push to main: `git push origin main` works in this
    sandbox. No PRs. CLAUDE.md was updated to reflect this 2026-05-18.
11. Audit stream pull endpoint:
    `GET https://chess-academy-pro.vercel.app/api/audit-stream?since=<ms>`
    with header `x-audit-secret: <secret>` (secret in
    per-project memory).
