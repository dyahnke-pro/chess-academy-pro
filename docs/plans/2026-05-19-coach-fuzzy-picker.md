# Coach fuzzy + picker + stage-menu wait — implementation plan

David's directive (2026-05-19, after the Philidor Defence bounce
audit + trap-stage-clicked-cold audit):

1. **Stage-menu wait-for-load.** When the user picks a stage
   (drill / quiz / trap / punish / find-the-move) BEFORE the
   background stage gen has finished, the surface must wait for
   load and then jump — not show an empty state. *"need freedom
   of choice"* — no hard-and-fast play-order rule.

2. **Fuzzy spelling matcher.** Wide berth on user-typed opening
   names. *"give it a wide birth and then have coach ask and
   confirm or have it give several close options in the picker."*

3. **Picker-driven disambiguation.** When the coach asks a
   question (because of ambiguity, or because there's a real
   choice to surface), the answer surfaces as tap-targets above
   the chat input. *"asking a question develops picker answers"*.

Closes G7 (filed today): the audit for this PR must be
INTERACTIVE per the new gate.

---

## Phase plan

### Phase 1 — Stage-menu wait-for-load

**Surface:** `/coach/teach` stage menu (drill / quiz / trap / punish
/ findMove).

**Files:**
- `src/hooks/useTeachWalkthrough.ts` — `startAtStageMenu` and the
  stage-pick handler need to detect "stage entries empty AND
  generation in progress" and queue the jump until merge fires.
- `src/services/openingGenerator.ts` — confirm the
  `mergeStageIntoCache` callback fires reliably on completion;
  surface a per-stage promise / event the hook can await.
- `src/components/Coach/CoachTeachPage.tsx` — wire the wait state
  into the existing busy + generationStatus UI so the user sees
  "loading punish lessons…" instead of an empty list.

**Status:** pending.

### Phase 2 — Fuzzy matcher (data layer)

**New file:** `src/services/openingFuzzyMatcher.ts`.

Returns `{ candidates: Array<{ name, score, source }>, autoAccept: boolean }`.

- **Scoring:** trigram overlap + Levenshtein distance against
  `openings-lichess.json` names + ECO codes + the alias map in
  `openingDetectionService.NAME_ALIASES`.
- **Cutoffs:**
  - Top hit ≥ 0.92 AND second hit ≤ 0.77 (gap of 0.15) → `autoAccept: true`
  - Otherwise → `autoAccept: false`, return up to 4 candidates
- **British/American spelling** treated as equivalent in scoring
  (drop terminal "ce" vs "se" diffs before distance calc).
- **Diacritics + punctuation** normalized (Caro-Kann == Caro Kann == carokann).

**Status:** pending.

### Phase 3 — Brain envelope: `[CHOICES:]` marker

**Files:**
- `src/coach/envelope.ts` — add `[CHOICES: A | B | C]` to the
  brain's authorship contract (similar to `[VOICE:]` and
  `[BOARD:]`). Brain emits this when asking the user a question
  with discrete answers.
- `src/services/coachPrompts.ts` — add the marker to the system
  prompt's "how to ask the student a question" section.
- `src/services/sanitizeCoachText.ts` — strip the `[CHOICES:]`
  marker from the displayed chat bubble (same pattern as
  `[VOICE:]` and `[BOARD:]` markers).

**Status:** pending.

### Phase 4 — Picker UI

**Files:**
- `src/components/Coach/ChatInput.tsx` — render the picker chips
  slot ABOVE the input. Already exists in some form per the
  earlier "picker chips above input" PR; this phase extends it
  to consume `[CHOICES:]` markers.
- `src/components/Coach/CoachTeachPage.tsx` — parse `[CHOICES:]`
  from streaming chunks (same pattern as `[VOICE:]` extraction at
  `tryExtractVoiceMarker`). Hand the options to ChatInput as
  state.
- **Tap behavior:** tap a chip → autofill the input AND send
  immediately. Match the existing picker-chip behavior so the
  two pickers are visually + interactively identical.

**Status:** pending.

### Phase 5 — Wire the fuzzy matcher into the surface

**Files:**
- `src/components/Coach/CoachTeachPage.tsx` — replace the
  strict canonicalizer in `handleSubmit.surfaceRouting` with
  the fuzzy matcher.
  - `autoAccept` → run the existing in-place generation flow.
  - Not `autoAccept` → emit a coach message with `[CHOICES:]`
    listing the candidates; let the user pick.
- `src/services/coachAgent.ts` — same swap in `parseCoachIntent`
  so search-bar fuzzy hits also emit picker candidates.

**Status:** pending.

### Phase 6 — Audit (G7-compliant)

Per the brand-new G7: the audit MUST be interactive, not just
scripted.

**New script:** `scripts/audit-coach-teach-fuzzy.mjs`.

Scenarios:
1. Type `"Philidor Defence"` (British) → expect in-place
   walkthrough on `/coach/teach`, no bounce to `/coach/session/walkthrough`.
2. Type `"Najdorff"` (typo) → expect either autoaccept or a
   `[CHOICES:]` picker offering "Najdorf Variation", "Najdorf
   English Attack", etc.
3. Type `"KID"` → expect picker offering King's Indian
   Defense variants.
4. Type `"sicilian"` (lowercase, partial) → expect picker with
   top Sicilian variations.
5. Type `"asdfghjkl"` (no match) → expect coach response
   like "I don't recognize that opening — try one from the
   list" with no crash.
6. Cold-cache scenario: clear IDB, type `"Philidor Defence"` →
   verify generateOpening fires in place + walkthrough renders.
7. Pick-before-load: type a known opening, immediately tap the
   "punish" stage (before background gen merges) → expect a
   loading state + jump-when-ready, not an empty stage.
8. Re-audit the walkthrough bounce path (per David's request):
   verify no path under any tested input bounces to
   `/coach/session/walkthrough`.

Each scenario is a SCRIPTED Playwright run that drives REAL
USER interactions (typed input, tap, etc.) — interactive even
though Playwright-controlled.

Also: add `audit-coach-teach-fuzzy.mjs` to the matrix in
CLAUDE.md §Post-Deploy Audit and to `docs/AUDIT_INDEX.md`.

**Status:** pending.

---

## Sequencing rationale

Phase 1 (stage-menu wait) is INDEPENDENT and short. Ships first
so David's freedom-of-choice ask lands fast.

Phases 2–5 ship as one PR (fuzzy matcher → marker → picker UI →
wiring) because the four layers only work together — partial
landings would leave half-functional state.

Phase 6 is the audit. Per G7, cannot claim done without it.

## Next-session pickup

If this session is interrupted mid-plan, the next session reads
this doc + the unmerged commits on `main` to resume. Each phase
above will have its commit hash filled in as work lands.
