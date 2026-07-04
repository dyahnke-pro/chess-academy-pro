# Grounded conversational "what should I train / what am I weak in"

**David 2026-07-04:** *"Conversation is key to the llm!! But GROUNDED!!!"*
+ *"Use a theorist to fill all possible verbs"* (exhaustive detector coverage).

The coach must ANSWER meta-coaching questions ("what should I train",
"what should I learn next", "what tactics am I weak in", "where am I
losing") conversationally — the LLM PHRASING a weakness profile computed
in code, never inventing it (G0). Today they dead-end at the opening
picker or get hijacked into a drill.

## Findings (traced in code)
1. The grounded path already exists — `progressQuestion` →
   `assembleProgressAnswer(detectBadHabits)` → `voiceFacts`
   (`coachApi.ts:1805`). Exact G0 shape. Three gaps stop it:
2. **Detector gaps** — `PROGRESS_QUESTION_RE` (`coachService.ts:706`)
   misses "train", "learn", "what TOPIC am I weak in".
3. **Thin answer** — used only `detectBadHabits`, not the ranked
   `getUnifiedWeaknessProfile()` (tactics/openings/phase/conversion/
   board-vision). "What tactics am I weak in?" couldn't be answered.
4. **Router hijack** — `trainingAidRouter` branch 8 caught "tactics" in a
   DIAGNOSIS question and started a drill.

## The fix (mirror the existing pattern; no new intent)
- [x] **P1** — `assembleWeaknessRecommendation(weaknesses,{topic})` +
  `weaknessTopicFromText()` in `groundedAnswer.ts` (pure leaf). Grounded
  on the unified profile; top-3 by openCount, most-frequent first, topic
  bucket filter, true "drill your mistakes" next-step fact, null-empty.
- [x] **P2** — enrich the `coachApi.ts` progress interception: unified
  profile first (topic-filtered→unfiltered), fall back to bad-habits,
  then the computed no-data line. Same `voiceFacts` chokepoint.
- [ ] **P3** — widen `PROGRESS_QUESTION_RE` with the THEORIST's full verb
  surface (train/learn/study/hone/sharpen/brush up/shore up/master/…),
  weakness nouns, struggle predicates, and topic-scoped "weak in X".
  Scoped so it never swallows "learn the Sicilian" (opening resolution
  runs first) or a drill imperative.
- [ ] **P4** — `trainingAidRouter` self-contained `DIAGNOSIS_RE` guard →
  null for diagnosis questions; drill IMPERATIVES untouched.
- [ ] **P5** — tests: questionIntents (all theorist phrasings match +
  negatives excluded), trainingAidRouter (diagnosis→null, imperative→
  drill), groundedAnswer (rank/null/topic-filter).

## Decisions log
- 2026-07-04: Enrich the EXISTING progress intent, not a parallel intent
  — one path, no collision, mirrors G0.
- 2026-07-04: Router guard lives IN the router (self-contained regex, no
  coachService import) so every surface inherits diagnosis-vs-drill.
- 2026-07-04: Verb list from a dedicated theorist agent per David, so the
  detector is exhaustive (morphological + phrasal + informal variants).

## Next-session pickup
Detector + router regex are the load-bearing pieces; the assembler +
wiring already land. After P3-P5: ship-check gates, push to the working
branch, then the grounded-coach audit (`audit-coach-stress.mjs` meta
phrasings) + audit-stream pull for `grounded_voice`/`intent:progress`.
