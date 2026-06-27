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

## Phase 9 — Analysis Practice + coach-comms polish (IMG_4301, David)
- **Mic not working (RECURRING — 2nd surface).** David hit "mic unavailable" on
  coach chat earlier AND on Analysis Practice now → likely SYSTEMIC, not
  per-surface. Investigate the voice-input path (Web Speech / Capacitor mic
  permission + the iOS AVAudioSession; getUserMedia in the in-app browser vs
  standalone). Prioritize — it's blocking "communication with coach."
- **No Send button** for typed answers on Analysis Practice
  (`AnalysisPracticePage.tsx` — I built submit on the input; needs a visible
  Send button, not Enter-only).
- **Turn indicator too subtle.** "· White to move" is low-contrast grey under
  the board; make whose-move prominent (badge / bold) on Analysis Practice (and
  check the review board has a clear turn indicator too).
- Tie the "better communication with coach here" to the same grounded-why +
  voice work — the Analysis Practice grader already exists; make its I/O (mic +
  send + turn) actually usable.
- **Interactive board (David).** Analysis Practice renders a STATIC board
  (`ConsistentChessboard` display mode). Make it interactive: let the student
  PLAY the answer move on the board (drag/click squares), graded deterministically
  the same way the reading "tactic/best-move" questions resolve — reuse the
  walkthrough `Board/ChessBoard` (emits SAN via onMove) or ConsistentChessboard
  controlled mode + a chess.js instance. The played move is the answer for
  tactic/find-the-move questions; verbal answer stays for plan/why questions.

## Phase 10 — Analysis Practice = a GROUNDED DISCUSSION COACH (David, expands #9)
Verbatim: "it's also only asking about tactics, i want it asking about who is
winning, what are the strengths and weaknesses of each side. this is a
discussion based training exercise with a personal coach."

So Analysis Practice is NOT one-shot tactic Q&A — it's a multi-turn DISCUSSION
about a position, coach-led, covering every dimension. Crucially it's the SAME
grounded substrate as the review "why" (build once, both surfaces consume):

Discussion dimensions (each grounded, LLM only converses — G0):
- **Who's winning + by how much** → `assemblePositionAssessment` (eval/mate,
  already in groundedAnswer.ts). buildReadingQuestions needs the eval passed in
  (it currently only gets the tactics context).
- **Strengths / weaknesses of EACH side** → `findPieceQuality` (outposts, bad
  bishops, open rooks) + `findPawnBreaks` + pawn-structure facts (isolated/
  doubled/passed — may need a small structure computer) + king safety. Summarize
  per side.
- **Tactics / threats / hanging** → the existing tactics context (now pin-aware).
- **Plans / pawn breaks** → pawn breaks + the engine PV (`assemblePlanAnswer`).
- **The "why" of a move** → the move-order/tempo comparator (Phase 2).

Shape: coach asks an open question ("Who do you think is better here, and why?"),
student answers (TYPED + MIC + by MOVING ON THE BOARD), coach responds grounded +
follows up — a real back-and-forth, not a quiz. Reuse `getCoachChatResponse`
routed through `voiceFacts` with the grounded dimension facts injected (the
Discussion Practice / coach-chat grounding pattern already exists). Interactive
board (Phase 9) lets the student show a line; voice in/out for the conversation.

⚠️ Because this is a discussion redesign, do NOT over-build the OLD one-shot UI
(static board + single textarea). Build the grounded substrate first (shared with
review), then the discussion surface on top. The Phase 1 grounding + Phase 2 why
are the foundation for BOTH review and this — not wasted.

## Decisions for David
- D1: Reading gate default ON, or stay opt-in with a clearer prompt? (Phase 4)
- D2: Re-analysis on the depth bump — prioritize open game + throttle vs full
  background sweep of 690? (Phase 7)
- D3: Build order — full batch in the phase order above, or start with the
  grounding spine (1+2+3) and ship that first, UI/sound/accuracy second?
</content>
