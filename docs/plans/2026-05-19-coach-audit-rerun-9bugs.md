# Coach-tab audit re-run — 9 bug classes from 2026-05-19 live session

Branch: `claude/coach-audit-rerun-Hanbl`
Owner this session: Claude (under David's review)

David ran a "loop interactive audit" of `/coach/teach` overnight that
converged to 0 errors. He then exercised the surface live and pulled
300 audit events that expose 9 distinct bug classes the scripted loop
couldn't see. This plan ships fixes + an enhanced loop audit that
catches each class.

The disease behind several of these is the **chip-tap reentry** path —
chips and picker tiles look like UI affordances but they tap straight
back into the same string-fuzzy-matcher used for typed input. The
chip's context (the opening currently on the board, the stage the chip
refers to) is dropped on the floor. Fixing it collapses two visible
failures into one.

## The 9 bugs

| # | Class | P | Owner file(s) |
|---|---|---|---|
| A | Brief-cap clips state-changing content (you hear opening X; board switches to Y) | P0 | `CoachTeachPage.tsx` + voice path |
| B | "not in the app" / "something new" qualifier ignored | P1 | `coachPrompts.ts` |
| C | Picker omits canonical parent, includes substring-matched unrelated openings | P0 | `openingFuzzyMatcher.ts` |
| D | Chip taps re-enter through fuzzy resolver (no structured payload) | P0 | `ChatInput.tsx` + `CoachTeachPage.tsx` |
| E | G6 arrow obligation violated in-prose mid-walkthrough | P0 | `arrowClaimValidator.ts` |
| F | SAN-to-speech truncation + duplication | P0 | narration-to-speech helper |
| G | Arrows on `/coach/teach` thinner than the rest of the app | P1 | `useBoardTheme.ts` / `ControlledChessBoard.tsx` |
| H | Pre-flight "rejected non-opening" log noise | P3 | `CoachTeachPage.tsx` |
| I | **Wordy for wordy's sake — content filler at every verbosity** | P0 | `coachPrompts.ts` (VERBOSITY_INSTRUCTIONS) |

## Attack order (root-cause first)

1. **D — chip-tap structured payload.** Chips carry `{ intent, openingId?, stage? }`. Tap path skips the fuzzy resolver. Fixes the "pickers navigated me away" headline.
2. **C — picker candidate quality.** Canonical parent always at top; filter substring-matched namesakes from unrelated families.
3. **I — verbosity content rules.** Tier-specific content guidance + scaffolding-phrase ban at every tier. Replaces the soft "be concise" hint with a numeric + content directive. Bans "Great question," "Let me show you," "so we can," etc.
4. **A — brief-cap protects state-changing content.** When the response triggers `set_board_position` / `start_walkthrough`, the spoken voice line MUST name the new opening — even at `brief`. Two routes considered (decision below).
5. **F — SAN-to-speech truncation + duplication.** Fix the regex/template bugs surfacing as "knight to b" and "knight to c knight to c6."
6. **E — G6 in-prose arrows.** Promote `arrowClaimValidator` from audit-only to a post-process step that synthesises missing arrows from the SANs the LLM mentioned. Regen as last resort.
7. **G — arrow visual.** Centralize arrow style (thickness, color palette) in `useBoardTheme` so every board renders identically.
8. **B — "not in the app" prompt rule.** Add a comprehension rule to the system prompt.
9. **H — pre-flight log noise.** Downgrade severity or drop entirely (it's not actually a routing failure).

## Decisions log

### D-1 — chip payload shape

Chips will carry a discriminated union. Three kinds today:

- `{ kind: 'walkthrough', openingId: string }` — start a walkthrough for the resolved opening.
- `{ kind: 'stage', openingId: string, stage: 'drill' | 'findMove' | 'punish' | 'concepts' }` — load a stage of the current opening.
- `{ kind: 'play-against', openingId: string }` — drop into play mode on the named opening.

Chip text remains human-readable for display; the payload is what the tap handler uses. Falls back to the legacy string path when no payload is set (older saved chats).

### A-1 — brief-cap content protection (TBD with David)

Two options. Picking one when we get there:

1. **Suppress board changes at `brief`** — the coach is allowed to recommend in prose but cannot silently swap the board out from under a one-sentence reply.
2. **Enforce a "set-board sentence"** — when the brain calls `set_board_position` or `start_walkthrough`, the voice line MUST begin with "Setting the board to {name}." and brief-cap preserves the first sentence. The rest is fair game to clip.

Pre-discussion lean: option 2. It keeps the spoken signal aligned with the visual signal at every verbosity.

### I-1 — verbosity content rules

`VERBOSITY_INSTRUCTIONS` will be rewritten to specify **what kind of content** each tier produces, not just length. Banned scaffolding phrases at every tier (list TBD; seed with "Great question", "Let me show you", "so we can", "I think", "Now we'll see", "Watch the…").

## Sequencing logic

- D before C: D's fix changes how picker tiles are tapped, so C can assume the new tap contract is in place.
- I before A: A's brief-cap rules reference content rules from I.
- F before G: F is its own surface fix and decouples cleanly.
- E after F: E's arrow synthesis needs the same SAN→data helper F refactors.
- G after E: arrow theme changes go through `useBoardTheme` after we know what synthesised arrows look like.

## Loop audit enhancement

After all 9 bugs are fixed, `scripts/audit-coach-teach-interactive.mjs` gets new scenarios:

1. **Chip-tap context preservation** — generate a `[CHOICES]` set with a known-context opening, tap each chip, assert the resolved opening matches the context (not a fuzzy-match of the chip text).
2. **Picker quality** — type "danish gambit," assert canonical parent is in the picker; type "I wanted the X," assert no unrelated-family namesakes.
3. **In-prose arrow obligation** — start a walkthrough, mid-walkthrough ask "which is most aggressive?", assert every SAN in the response has a matching `[BOARD: arrow:...]` marker.
4. **Brief-cap state-changing protection** — at `verbosity=brief`, ask for an opening, assert the spoken voice line names the opening that ends up on the board.
5. **SAN-to-speech sanity** — capture every `voiceService.speak*` call across a session, assert no "knight to {letter}" patterns without a digit, no duplicated SAN stems.
6. **Verbosity content** — at each tier, assert no banned scaffolding phrases.
7. **"not in the app" comprehension** — ask for an opening NOT in `openings-lichess.json` and assert the response doesn't silently swap to an in-app opening.

Loop runs until 3 consecutive clean passes.

## Next-session pickup

If the session compacts mid-work, the load-bearing context is:

- `src/components/Coach/CoachTeachPage.tsx:984-1042` — fuzzy-ambiguity picker emit path.
- `src/components/Coach/CoachTeachPage.tsx:2568-2577` — chip-tap handler that calls `handleSubmit(choice)` (Bug D).
- `src/components/Coach/CoachTeachPage.tsx:2645-2659` — picker-tile handler that does the same.
- `src/services/openingFuzzyMatcher.ts` — `MAX_CANDIDATES`, scoring, `TEACHABLE` filter (Bug C).
- `src/services/openingDetectionService.ts:936+` — `findLinePickerOptions` for broad-name picker (separate path).
- `src/coach/envelope.ts:247+` — `[CHOICES:]` prompt rule the LLM follows.
- `src/coach/coachPrompts.ts` — `VERBOSITY_INSTRUCTIONS` (Bug I).
- `src/services/arrowClaimValidator.ts` — audit-only validator that needs promotion (Bug E).
- `src/utils/coachNarration.ts` (or wherever `applyBriefVoiceCap` lives) — brief-cap implementation (Bug A).

## Status

| Bug | Status |
|---|---|
| D | pending |
| C | pending |
| I | pending |
| A | pending — decision needed (A-1) |
| F | pending |
| E | pending |
| G | pending |
| B | pending |
| H | pending |

Audit loop: not yet enhanced. Will run after all 9 fixes land.
