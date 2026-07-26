# Forward-looking integration — make the app actually look ahead (David 2026-07-26)

David: "the app doesn't look ahead as well as it could." A 4-cluster audit
(gem tracker / tactical core / decision-point+positional / narration backbone)
mapped every forward-looking build, its wiring, and whether narration fires.
This plan fixes the gaps. **Play is EXCLUDED** — it stays a pure playing
surface (locked); teaching lives in **Learn** (Watch demo + interactive) and
**Review**, each in its own register (the 2026-07-19 two-register law).

## What exists (the forward-looking stack)
- `liveTacticsContext` — the real engine-PV look-ahead (~3 moves, rating-adaptive),
  wired almost everywhere but **LLM-mediated only** (fed to the prompt, not spoken
  as computed fact).
- `detectNewThreat` (+ recognition/prevention) — the "#27 deep threat" set, but it's
  actually a **1-ply null-move** scan (name overstates it). Speaks directly on
  Review/Play/Learn; recognition+prevention only in Review.
- gem tracker (`gemCrushLines`) — precomputed crush; Watch/Play/Teach ✓; **review
  register (`buildReviewGemSay`) built + tested but wired to NOTHING**.
- `engineDeltaLines` (`computeThreatDelta`, `bestLineDeltaFromPv`) — the Watch/Play
  per-move delta (arrows on static board, present tense).
- `forkTalk` / `thinkAloud` — decision points, Learn interactive only.
- `reviewTeachingPoints` — positional plans, Review only.
- `computePvLine` → `playBetterLineOut` — the PV "better line" walkout, Review only.
- `forwardTeaching` (#31) — **all dead code**. `detectDecisionPoint` = dup of the
  wired `forkTalk` (SCRAP); `computePieceRoute` = the one genuine gap (KEEP + wire);
  `explainConditionalCapture` = marginal (hold).

## The gaps (why look-ahead underperforms)
1. **Watch has no *plan* look-ahead** — it fires a gem or a 1-ply threat delta, but
   **quiet developing moves get zero** ("and now this knight is heading for f5" is
   never said). BIGGEST hole, engine-free to fix.
2. Deepest look-ahead is **LLM-mediated**, not spoken as fact.
3. **Review shadowing** — the forward king-attack cue loses its slot to a generic
   "you're better" verdict (`coachFeatureService.ts:1635` before `:1659`).
4. **Review gem-crush unwired** (David explicitly asked for crush lines in review).
5. Recognition/prevention (spot-it / defend-it) is **Review-only** — Learn drops it.
6. No shared layer; heavy duplication (4 fork detectors, 2 threat engines).

## Architecture — ONE shared look-ahead layer, two consumers (NOT Play)
A single set of pure/near-pure fact-computers that Learn (Watch + interactive) and
Review consume, each phrasing in-register. Reuse the existing computers; do not
re-code. Play is explicitly excluded and stays lean (phase narration + light slip
note only). Fold in `computePieceRoute`; scrap `detectDecisionPoint`.

## Phased plan (one increment, gate after each)
- [ ] **P1 — Watch quiet-move plan look-ahead (this increment).** Wire
  `computePieceRoute` into the Watch per-move aside as the 3rd fallback
  (gem → threat-delta → **route-plan**) via a new `computeRouteDelta` in
  `engineDeltaLines.ts`. Engine-free, present-tense, lead-the-eye arrow. Rescues
  the one genuine `forwardTeaching` gap from dead code + fills Watch's biggest hole.
- [ ] **P2 — Review gem-crush wiring.** Wire `buildReviewGemSay` / review
  `computeGemCrush` into the review walk (it exists + is tested).
- [ ] **P3 — De-shadow the Review forward cues.** Make the king-attack / forward
  plan beat an APPEND (like the threat call-outs), not a first-match-wins loser.
- [ ] **P4 — Recognition/prevention into Learn.** Surface `describeThreatRecognition`
  / `describeThreatPrevention` in the Learn delta (present-tense), not Review-only.
- [ ] **P5 — Speak the deep PV look-ahead as computed fact** (a directly-spoken path
  for `liveTacticsContext`'s upcoming-tactic scan, so the best foresight isn't
  LLM-diluted). Biggest lift — design carefully.
- [ ] **P6 — Dedup pass** — consolidate toward one fork detector / one threat path
  where safe (last, non-breaking).
- [ ] Scrap `detectDecisionPoint` (dup); decide `explainConditionalCapture` (marginal).

## Non-negotiables
- Play excluded — no teaching pushed into the play flow.
- Two-register law — facts port, phrasing does not.
- G0/G3 — every square/line computed in code; the voice only phrases it.
- narrationAccuracy + reviewCorpusSweep gates stay green (board-true).

## Status
- [x] P1 DONE — `computeRouteDelta` (engineDeltaLines) wired as the Watch aside's
  3rd fallback (gem → threat → route-plan). Rescues `computePieceRoute` from dead
  code; quiet developing knight moves now teach their forward route to an outpost,
  present-tense, one green arrow, engine-free. 3 unit tests; walkthrough hook green.
- [ ] P2 IN PROGRESS next — review gem-crush wiring.
