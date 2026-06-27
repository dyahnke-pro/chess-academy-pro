# PLAN — Game Review batch (2026-06-27)

Source findings: `docs/notes/2026-06-27-game-review-observations.md`.
Ship strategy: all web fixes → `main`, then ONE TestFlight build (David tests
there; web pushes don't reach the app). Post-deploy: 3-instrument audit +
PostHog mining (read key now works — `Read_key_PostHog` was revoked; David
provided a fresh `phx_` key; durable analytics confirmed the e5-hanging
hallucination + that `voice-fallover` is NOT mirrored to PostHog).

Sequencing logic: GROUNDING is the spine — it fixes 3 bugs and unblocks 2
features. Do it first. UI/sound/accuracy are independent and can land alongside.

## Phase 1 — Ground the review voice (the spine) [fixes #5, #A; unblocks #6, why, demo]
- **1a. Hanging = a LEGAL capture wins material.** Root cause: `findHangingPieces`
  (tacticClassifier.ts:499) counts pinned/illegal attackers; `explainBestMoveGrounded`
  (groundedAnswer.ts) has an `else` that says "left X hanging" with NO legal
  capture. Fix: a piece is hanging ONLY if a legal capture exists whose SEE ≥ 0
  (use `seeGain` BUT guard it to legal captures — `chess.attackers` is pin-blind).
  Remove the no-legal-capture "hanging" branch. Add PIN detection so the coach can
  say "the knight is pinned" instead. Regression test: David's exact ply-15 FEN →
  NOT hanging.
- **1b. "Where you left the book" (theoryDeviationScan).** Fix the SAN-equality
  miss (1.e4 flagged off-book) + the masters-DB records with games but zero W/D/L
  → "common choice / untested / thousands" contradiction (explorerTranslate). Test:
  1.e4 in a Vienna is NOT a deviation.
- **1c. Structured recap citations (G0 inversion).** Recap move-references come
  from the analysis annotations as `{ply, playedSan, suggestedSan, squares}`; LLM
  only phrases. Kills recap hallucinations + is the data source for previews.

## Phase 2 — The grounded "why" (two whys + move-order comparator)
- Two whys as CONTRAST: why your move was a mistake (what it ALLOWED) + why the
  better move is better (what it ACHIEVES).
- New `explainMoveOrder`: eval both orders, take the worse order's refutation,
  classify mechanism (attacks-the-queen=TEMPO via `chess.attackers` / wins-material
  =`seeGain` / seizes-square=geometry). Honest limit: no concrete line → say less,
  never invent (the "bishop-before-queen" case is the tempo branch).
- The current per-move line is thin ("Mistake. Best move was Be4. Drops 2.7 pawns.")
  — augment flagged plies with the why.

## Phase 3 — Choreographed why-demo (board + voice synced) [#6 previews ride here]
- Beat ASSEMBLER: grounded why → `{fen, move, arrows[], highlights[], say}[]`.
- Review "why-demo" mode on the EXISTING voice-gated lesson player
  (narrationSegments + useWalkthroughRunner): pause → take back wrong move → play
  correct (orange + spoken) → demonstrate the line with arrows on named squares AS
  the voice speaks → restore. Every move/arrow from the computed line (G0).
- Inline board previews for recap citations build on 1c.

## Phase 4 — The diagnostic ask (it never asked) [answers "why it didn't ask"]
- `readingChallengesInReview` defaults FALSE → decide: default ON, or a prominent
  in-flow toggle. Extend the gate from "what do you see" to also "why was this a
  mistake?" → reveal → speak the grounded why (Phase 2). Must be visible (Phase 5).

## Phase 5 — Review-UI layout [#1, #2, #B]
- Footer (Play Again / Back to Coach) shouldn't sit over chat/narration; show at
  game-end or make the region scroll with bottom inset for fixed controls+nav.
- Clipped filter-tab row behind "Pick a game" (header overlaps scroll top).
- Mid-walk narration text must be reachable every ply (this also unmasks Phase 4's
  prompt).

## Phase 6 — No-sound (#3)
- Polly failing → Web-Speech fallover on ~every line (audit-stream). Verify
  `/api/tts` returns a Polly stream on prod (G4); check `AWS_*_POLLY` creds/region;
  confirm iOS plays the fallback (or stop Polly failing).
- Mirror `voice-fallover` → a PostHog event (it's the no-sound signal and is
  currently invisible in durable analytics; only `tts_failure`=4 was captured vs
  near-universal fallover in the stream).

## Phase 7 — Accuracy depth 16 (#4) [coded+committed locally: 4ede3d8]
- Decide 690-game re-analysis handling: prioritize the OPEN game first / throttle
  background, don't crunch all 690 at once. Then ship.

## Phase 8 — Piece-glow (#7)
- Verify the white-green / black-purple glow is intended vs noise.

## Decisions for David
- D1: Reading gate default ON, or stay opt-in with a clearer prompt? (Phase 4)
- D2: Re-analysis on the depth bump — prioritize open game + throttle vs full
  background sweep of 690? (Phase 7)
- D3: Build order — full batch in the phase order above, or start with the
  grounding spine (1+2+3) and ship that first, UI/sound/accuracy second?
</content>
