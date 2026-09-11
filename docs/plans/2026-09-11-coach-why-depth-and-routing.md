# Coach "Why" Depth + Concept-Lane Routing — build plan (2026-09-11)

Follow-on to the coach audit (`docs/coach-audit-broken-map-2026-09-11.md`,
`docs/coach-audit-fix-map-2026-09-11.md`). The first-pass fixes shipped on `main`
(518e0f4); this plan fixes the two things the re-audit + computer-accuracy audit
exposed as still wrong, at the ROOT (no bandaids).

## Decisions (locked with David 2026-09-11)
- **Routing fix = token-gated fall-through** (not an exclusion list, not a full
  reorder): the concept lane ANSWERS only when it has a real concept token or a
  theory passage; otherwise it FALLS THROUGH so the specific lanes run. The
  honest "no lesson yet" decline moves to a true last resort.
- **Scope = all four phases now.**
- **Quiet-Why = teach fully on an explicit tap:** an explicit "Why?" request
  bypasses the importance/silence gate so the plan/briefing speaks even on a
  quiet balanced board. Automatic in-game narration keeps the gate.

## Root causes (from the audits)
- **D1 (routing):** `CONCEPT_QUESTION_RE` is broad ("what's the idea behind…",
  "how does the…"), so `conceptQuestion` is set for asks that are really
  why-best-move / master-play / app-help. The concept lane (coachApi.ts:4761)
  dispatches before those and DECLINES (4794) when it finds no glossary token —
  stealing the turn. My first fix excluded 3 named lanes in `isConceptQuestion`
  (a bandaid; why-best-move/master-play/app-help still broke).
- **Why-quality:** on a quiet/positional best move (h3, b4, O-O, Kb1),
  `explainBestMoveGrounded` returns null (it only speaks concrete tactics), so
  `computeWhyBestMove` falls to a bare restatement ("advancing the pawn to h3")
  and the positionFacts briefing is importance-gated off → no real idea. Fails
  "explain the idea behind every move."
- Two polish bugs: "It castling gets your king to safety" (grammar); double
  period ("…on d8..") in the why chain.

## Phases (all on `claude/coach-tab-feature-map-2sma08` → `main`)

### Phase 1 — Routing root cause (token-gated fall-through)
- coachApi.ts concept lane (4761): keep the token (4764) + theory-passage (4777)
  ANSWER attempts; REMOVE the early decline (4794-4799) so a tokenless concept
  ask falls through.
- Add the honest decline as a LAST RESORT at ~5622 (after position-assessment,
  before the grounding-block/LLM path) — every specific lane (all dispatch
  < 5622, verified) has had its chance first. Same guards (`!positionalTopic`,
  `!matchEndgameLesson`).
- Remove the now-redundant D1 bandaid in `isConceptQuestion`
  (questionIntents.ts) — the strengths/teaching-method/skill-radar deferral.
  KEEP the STRENGTHS_QUESTION_RE "strongest part of my game" addition (a real
  detector-gap fix, not a bandaid).
- Gate: why-best-move ("what's the idea behind the engine's move?", "how does the
  engine see this?"), master-play, app-help route to their own lanes; a genuine
  tokenless concept ask ("what makes a good bishop") still gets the last-resort
  decline, never a board deflect.

### Phase 2 — Polish bugs
- explainBestMoveGrounded castling branch: "It castling gets…" → grammatical.
- computeWhyBestMove: stop the double period when the reason already ends in ".".

### Phase 3 — Positional "why" depth
- Extend `explainBestMoveGrounded`'s quiet-move handling to cover the gaps the
  audit found: prophylactic pawn moves (h3 stops …Bg4 — via `opponentIntent`),
  plan-pawn advances (b4 = queenside space/break), king-safety moves (Kb1 off the
  open file). Compose existing computers (opponentIntent, the break/outpost/
  control logic already in-file); G0/G3 — board truth only, no invented ideas.
- Quiet-Why gate bypass: `computeWhyBestMove` (the explicit tap) requests the
  positionFacts briefing WITHOUT the importance-silence suppression, so a quiet
  board still gets the plan. Automatic narration path unchanged.
- Re-run `computerAccuracy.audit.test.ts` — quiet moves must now get a real idea.

### Phase 4 — Unify chat-why → computeWhyBestMove
- The chat why-best-move lane (coachApi.ts:4977) routes through the richer
  `computeWhyBestMove` where a live/plan analysis exists (reuse the existing
  `enginePlan` — NO new engine call), so typed "why is this best" matches the
  button. The REVIEW path (reviewFlaggedMove, 4982) stays engine-free (the
  on-device engine stalls there — do not reintroduce it).

## Gates / verification (the standing-net principle — each phase ships its gate)
- questionMatrix / a focused test: the D1 phrasings route to their own lane.
- computerAccuracy.audit harness: quiet-move rationale is non-hollow.
- ship-check green; then the all-questions prod driver + the 3-instrument audit.

## Sequencing logic
Phase 1 first (unblocks the 3 stolen lanes + removes the bandaid). Phase 2 is
trivial and independent. Phase 3 is the real depth work and needs 1-2 to be
clean first. Phase 4 depends on 3 (the button computer is worth unifying only
once it's good). One batched deploy at the end (Vercel cap).
