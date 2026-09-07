# Narration DNA everywhere — review future-lines + learn/play deltas

David 2026-09-07: in review, when the coach talks out FUTURE sequences of
moves there are (a) no arrows and (b) the prose "only says wins material" —
it does not follow the same standard as everything else. Follow-up: "Make
sure that ALL narrations follow the same pattern. Even in learn and play. I
feel like those narrations are not running through the computer and dna. You
can see this in posthog report."

## What the PostHog data proved (native `coach_narration_spoken`, 30d)

Same review, two registers depending on whether the async warm pass survived:

- DNA (good): *"You take the queen — that's the win — and there's a deeper
  threat brewing underneath: if they sit still, the finish line is checkmate."*
- Raw template (bad): *"…it runs Kxd7 (captures the knight, wins material),
  then Kxe2 (captures the knight, wins material), then a6, then d5, then
  axb5 (captures the knight, wins material)…"*

Root cause: the review's projection lines (punishment / better-line-why /
deep-threat / opening-plan) are rendered by the deterministic `render()` in
`augmentWithProjections` (coachFeatureService). The review DOES try to warm
every segment via `voiceReviewLines` → `voiceFacts`, but a projection line
walks through MANY future FENs, and the fidelity nets
(`narrationBoardAccurate`, `narrationCoversFacets`) validate the warm text
against the SINGLE `s.fenAfter`. A rephrase mentioning the future-line
squares can never validate → the warm pass is **structurally rejected** for
every projection segment → the robotic `SAN (…, wins material), then …`
template ships. So these lines are effectively LLM-bypassed already; the
computer just wasn't writing them in the DNA register.

Learn/Play: the delta/threat asides in `engineDeltaLines.ts`
(`bestLineDeltaFromPv`, `computeThreatDelta`) render formulaic templates and
never touch the DNA register — so they clash with the warm baked lines beside
them ("And now White is threatening cxb4 — wins the bishop on b4").

## Decisions (David, 2026-09-07)

1. **Arrows on review future-lines**: auto-draw the lead-the-eye arrow per
   spoken move — **WITHOUT moving the pieces**. "I just want the arrows to
   appear as the moves are spoken." (Reverses the visual PLAYOUT half of the
   2026-09-05 button-only lock; the piece-playout button stays as an opt-in.)
2. **DNA through the COMPUTER, not the LLM.** No new live LLM calls. The
   deterministic renderer must WRITE the DNA register itself, so it reads like
   the warm pass with zero model in the loop (purest G0). Applies to review
   fallback + learn/play deltas alike.

## The build

- **`src/services/dnaLineNarrator.ts` (new, shared).** One deterministic
  DNA-register renderer for a projected line:
  - `dnaMoveClause(fenBefore, san, prev)` — per move, merges the tactical
    outcome (winning capture NAMES the piece won — "winning the knight", never
    a bare "wins material"; tactic landed; check; mate; outpost / passed pawn
    / open file / king-shield) with the board-true positional concept from
    `buildReviewMoveTeaching` (the existing DNA per-move computer). Flowing
    prose, no `( … )` parentheticals. Recapture-aware (threads `prev`).
  - `narrateDnaLine(plies, opts)` — joins the clauses, varied connectors,
    dedupe generic tags. Verdict is the caller's job (kept in `render`).
  Robust to empty/invalid FEN (falls back to the SAN) so callers that only
  hold a raw PV still get a line.
- **Review (`coachFeatureService.augmentWithProjections.render`)** → calls
  `narrateDnaLine`; keeps its own `— and {verdict}` suffix. The `#4b` engine-
  confirmation tail also drops the parenthetical format.
- **Learn/Play (`engineDeltaLines.bestLineDeltaFromPv`)** → renders the
  "strongest line" through `narrateDnaLine`. Spoken raw (no LLM).
- **Review arrows (`CoachGameReview`)** → new progressive-arrow reveal: on a
  projection segment, cumulative green arrows appear on a cadence on the
  STATIC board (`walkExplorationFen` stays null → pieces never move), cleared
  on ply change. The "Walk the line" piece-playout button is retained as an
  explicit opt-in.

## Gates / tests

- New `dnaLineNarrator.test.ts` (no bare "wins material" as a sole clause;
  names the captured piece; mate/quiet handling; empty-FEN robustness).
- `engineDeltaLines.test.ts` still green (fallback text keeps the SANs).
- Review fidelity tests still green (projection segments still ship the
  deterministic text; it's just DNA-register now).
- `npm run ship-check` → READY TO PUSH.

## Decision 3 (David, 2026-09-07, follow-up)

"The dna in the llm is only used for free speak, not chess/board related
narrations. That way no llm call for board specific questions. Confirm that is
the standard. Sounds like it's not."

CONFIRMED it was NOT the standard. Board narration still made LLM calls in:
- the **review walk** (`voiceReviewLines` warmed every computed segment), and
- **Learn/Play move commentary** (`coachMoveCommentary` paths 1 & 2 warmed via
  `voiceFacts({warm:true})`).

(The `serveGroundedPositionDefault` path was ALREADY `preferRaw` per the
2026-09-02 chokepoint precedent — so this just extends that same rule to the two
stragglers.)

Aligned standard: **board/position/move/line narration = computed DNA, spoken
raw, zero LLM. Free-speak (chat Q&A, review intro/closing narrative arc) keeps
the LLM DNA register.** Changes:
- `coachMoveCommentary` move-commentary + move-purpose → `preferRaw` (facts are
  already speakable prose by the speakable-facts law).
- Review walk warm block REMOVED — every segment ships its computed DNA prose
  (buildReviewMoveTeaching + narrateDnaLine). Intro/closing/recap framing stays
  free-speak. Removed the now-dead `voiceReviewLines` import +
  `REVIEW_HOUSE_VOICE_TIMEOUT_MS`.

Tradeoff (flagged to David): the review walk loses sentence-to-sentence LLM
variety in exchange for one consistent register, no model, no latency, and no
warm-reject fallback. `narration*` fidelity helpers kept (tested independently).

## Decision 4 (David, 2026-09-07): computer+DNA to ALL Tier-3 narration

"Check for other narration paths that skip this standard and add it. Computer
and dna to ALL tier 3 narration pathways (anything not tier 1 and 2)." Plus: "I
still want review narration to run through dna" (→ review stays in the DNA
register, computer-written, no LLM — satisfied by the walk change above).

Full audit of every `voiceFacts(... warm/LLM ...)` call, classified:

RUNTIME BOARD NARRATION → converted to computed DNA (no LLM):
- review walk — done (warm block removed).
- Learn/Play move commentary paths 1 & 2 — done (`preferRaw`).
- coach-teach step-by-step move-narration (`coachApi` move-narration) — `preferRaw`.
- mistake-puzzle narration intro (`mistakeNarrationVoice`) — `preferRaw`.
- (non-English still routes to the model to TRANSLATE only — phrasing, not chess.)

ALREADY computed (no change needed — `serveGroundedPositionDefault` forces
`preferRaw` per the 2026-09-02 chokepoint, so the `warm:true` on these is dead):
- phase-transition narration (`usePhaseNarration`, also `computedOnly:true`).
- live coach (`useLiveCoach`).
- all coach board Q&A (best-move / plan / tactics / board-verdict / …).

LEFT on the LLM — FREE-SPEAK framing / authored-content read / translation
(these are NOT tier-3 computed position narration):
- review intro / closing / recap (the narrative arc — free speak about the game).
- whole-game review text (`gameReviewService`) + coach report.
- opening-section read-aloud (`openingSectionNarrator`) — weaves AUTHORED
  repertoire bullets; raw would speak the "- " markers. Authored content read.

FLAGGED for David (separate, larger — NOT done this pass): the AUTHORING
pipelines that use the LLM to WRITE gated chess prose offline —
`openingGenerator` (Tier-3 walkthrough per-move prose; CLAUDE.md's tier-3
currently says "the model only phrases what code computed") and
`contentGenerationService` (middlegame-plan / sideline / model-game annotation
generation). These are generation-time + board-gated, not runtime narration —
converting them to computer-written DNA is a major separate build. Confirm if
you want that too.

## Status
- [x] dnaLineNarrator + tests
- [x] wire review render + #4b tail
- [x] wire engineDeltaLines (Learn/Play strongest-line)
- [x] review progressive arrows (auto, no piece movement)
- [x] board narration → computed DNA, no LLM (review walk + move commentary)
- [ ] ship-check green
- [ ] push to main (batched; David stages ONE OTA when all updates done)
- [ ] post-deploy: prod 3-instrument review audit (owed after this lands on main)

Pre-existing failures (NOT introduced here, verified via git stash; not
ship-check gates): `learnDeltaAudit` pro-aman smothered-mate payoff;
`lookaheadPlan` "reports material won" (engine-flaky).
