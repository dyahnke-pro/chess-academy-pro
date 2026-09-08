# Phase 2 Surface Map — threat depth rework

**The §0 pre-build gate for Phase 2** of `docs/plans/2026-09-08-unified-coach.md`.
No code until this map is written + reviewed. Status: **DRAFT — consumer/gates
map in flight (agent).**

## What Phase 2 does (David 2026-09-07)
1. **KILL the remedial explainer** from the default path —
   `describeThreatRecognition` (groundedAnswer.ts:4933): "the pattern to spot: an
   under-defended high-value piece falls to a cheaper attacker." David:
   "Obvious, remedial, and unnecessary."
2. **Rating-scaled threat DEPTH via engine PV** (`computePvLine`): 1400 → 3-4
   ply, 1800 → 4-6 ply, min 1. Deeper for stronger (principle 4). Never
   hallucinate — cap at the reliable PV window.
3. **SPELL THE LINE OUT for everyone** — the opponent's threat is NOT the
   student's find-the-move (principle 5), so show the line. Best-but-not-forced
   is valid ("not forced, but their strongest try is…"); best moves that lead to
   a losing position count (David #4).
4. **Attach causal-chain logic to threats** where a chain proves the WHY ("their
   queen on f3 blocks the knight, so … threatens to trap it").

## The threat core (VERIFIED — groundedAnswer.ts)
- **`detectNewThreat(fenBefore, fenAfter, moverWB)` :4825 → `DetectedThreat|null`.**
  The SOUND fact-computer: null-move scan, biggest NEW threat (mate-1 / safe
  royal fork / SEE-verified clean capture), side-agnostic, board-proven,
  counter-tactic-checked. **KEEP — this is the G0 fact source.** Carries from/
  landing/targets/targetSquares/guards for arrows.
- **`describeStudentThreat` :4916** — "you're now threatening {san} — it {detail}".
  The 1-ply line David LIKED. KEEP; Phase 2 can DEEPEN it with a spelled PV line.
- **`describeThreatRecognition` :4933** — the REMEDIAL pattern-explainer. **REMOVE
  from the default path** (keep the function only if a caller genuinely wants the
  "how to spot it" teaching behind an explicit toggle; otherwise delete).
- **`describeThreatPrevention` :5000** — the DEFENSE teaching (undermine guard /
  cover square / move target / verified relief). KEEP — it's board-proven and
  useful; not remedial.
- **`computePvLine` (pvPlayback.ts)** — the engine PV spelled ply-by-ply with
  PlyFacts (captured/isCheck/tacticLanded/materialGained). The raw material to
  SPELL the threat line truthfully + name each consequence.

## The rework shape (design)
- New leaf helper (proposed) `threatLine.ts`: given `DetectedThreat` + fen +
  rating, spell the threat's continuation via `computePvLine` to the rating-
  scaled depth, naming each consequence from PlyFacts (board-true, G0). Returns
  the spoken line + arrows. Reused by every threat surface. Depth via the SAME
  rating machinery as Phase 1 (criticalityThresholds/the plan's depth tiers) —
  do NOT add a new depth curve (principle 8; the P7 orphan list already flags
  the depth deciders to unify).
- Replace `describeThreatRecognition` calls with either nothing (silence) or the
  spelled line, per surface.
- Where a causal chain (`buildCausalChain`/`findAllowedChain`) explains the
  threat's cause, prepend the chain's "why" (Phase 1 engine, already shipped).

## PENDING (fill when agent returns)
- [ ] Every production caller of the 4 threat fns + which surface + spoken/text.
- [ ] Exact call sites of `describeThreatRecognition` (what killing it affects).
- [ ] coachFeatureService threat callout (~1819) + `staticThreat` +
      `augmentWithProjections` (~2395) PV deepening — which surface each feeds.
- [ ] Any existing rating-scaling of threat depth (to reuse, not duplicate).
- [ ] Gates/tests covering threat narration (reviewDeepThreat, threatCheck, …).
- [ ] Kid exclusion verified.

## Tests this phase will ship
- The remedial line no longer appears on the default path (a "does NOT come out"
  gate).
- Threat depth scales: 1400 vs 1800 spelled line differs in ply count.
- Every spelled ply is board-accurate (extend the causal-chain audit's board-
  truth reader to the threat line).
- Forced vs best-but-not-forced framing is honest.
