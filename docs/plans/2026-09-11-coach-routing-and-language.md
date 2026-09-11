# Coach Routing Gate + Multilingual Voice — consolidated plan (2026-09-11)

Ties together everything decided with David after the coach audit:
the audit-method root fix (A/B/C), the multilingual angle (D), and the
"speak & write in the user's language" behavior. Follows the shipped
why-depth/routing fixes (`2026-09-11-coach-why-depth-and-routing.md`).

## The two root problems (already analyzed)
1. **The routing gate tests DETECTION, not DISPATCH.** `questionMatrix.audit`
   asserts *some* intent flag fired (`firedIntent`), never that the CORRECT
   lane wins after dispatch — so "concept steals why-best-move" passed the gate
   and only showed up in a prod run. And the driver samples ONE seeded phrasing
   per lane per run (`qs/qs2/qs3` → `pickPhrasing`), so "comprehensive" was a
   sample in depth, not exhaustive — new phrasings surface new (pre-existing)
   failures each run.
2. **Three sources of truth for "language" that disagree.** Written chat reply
   follows the detected input language (`coachService` askLang); the SPOKEN
   voice follows only the manual `narrationLanguage` SETTING
   (`spokenLanguageName`); mic STT is hardcoded `en-US`. So typing Spanish gives
   a Spanish reply in an English voice; speaking Spanish mis-transcribes.

## Decisions (locked with David 2026-09-11)
- **Matrix stays ONE English source of truth.** Do NOT fork it per-language —
  input is normalized to English before routing (`translateToEnglish` in
  coachService/coachSessionRouter), so one English matrix + English detectors
  already cover all 15 languages. Forking would reintroduce drift ×15.
- **Detected input language WINS; the setting is the default/fallback.** In a
  coach conversation the language the user types/speaks drives written AND
  spoken replies. The setting governs non-conversational narration (lessons,
  walkthroughs, auto-commentary) and is the fallback when input can't be
  confidently detected (bare chess notation is not a language signal).
- **Scope split:** written+spoken language behavior first (fully verifiable);
  mic STT language a follow-up (device-dependent, can't be verified in sandbox).
- **Audit method to the root:** A → B → C → D (below). C is the fix that would
  have caught the concept-steal without a prod run.

## Workstream 1 — Speak & write in the user's language (product) — FIRST
The written path already follows detected input. Fix the spoken path (and later
the mic) to the same "conversation language".
- **Resolver:** conversationLanguage = confidently-detected(user input) → else
  `narrationLanguage` setting → else English. One resolver, used by both the
  written and spoken conversational paths (kills the drift).
- **Spoken:** `localizeSpokenText` / `voiceService.speakInternal` currently read
  ONLY the setting (`spokenLanguageName`). For a CONVERSATIONAL reply, speak in
  the detected conversation language instead — thread the detected language into
  the chat-reply speak path (explicit override arg, so lesson narration still
  uses the setting; no leaky shared state).
- **Non-conversational narration:** unchanged — uses the setting.
- **Gate:** unit test — a conversational reply spoken while the setting is
  English but the input was Spanish localizes to Spanish; a lesson still uses
  the setting.
- **Follow-up (separate pass):** mic STT `lang` from the conversation language
  (voiceInputService's three hardcoded `en-US`), first-utterance = setting/
  device locale. Device-verified, flagged to David.

## Workstream 2 — The routing gate, done right (infrastructure)
### A — Matrix as the single source of truth + correct-lane gate
- Expand the English `QUESTION_MATRIX` phrasings per lane (hand-authored, richer
  than today's 2-3), each declaring its expected lane.
- The gate iterates EVERY phrasing (not one seeded draw) and asserts it flags
  its OWN lane — replacing `firedIntent` ("some flag") with "the RIGHT flag".
  Kills the detector↔matrix drift (the CLAUDE.md single-source-of-truth rule).

### B — Templated phrasing generation
- Generate variations off each canonical phrasing (question-form, synonym,
  British/US, abbreviation, typo) so coverage isn't bounded by imagination —
  the G7 off-canonical discipline, systematized. Each generated phrasing must
  be a TRUE positive for its lane (no ambiguous cross-lane strings).

### C — `resolveLane(grounding)` — the DISPATCH-precedence gate (the root fix)
- Extract the coachApi lane dispatch ORDER into a pure `resolveLane(grounding)`
  that returns which lane actually ANSWERS (mirrors the real precedence,
  including suppressions like concept-token-gating, endgame>plan). 
- The gate runs every matrix phrasing through `buildQuestionGrounding` →
  `resolveLane` and asserts the ANSWERING lane, not just a set flag. This is
  what catches a steal (concept before why-best-move) at gate time, forever —
  no prod run needed. coachApi's real dispatch must then be driven by / kept in
  lockstep with `resolveLane` so the gate can't drift from reality.

### D — Multilingual seam audit (prod)
- The seam that can break multilingual routing is `translateToEnglish`, not the
  detectors. A prod audit takes a SMALL set of native-correct questions per
  language → real `translateToEnglish` → `resolveLane` → assert the right lane.
- Catches translation-induced misroutes; any gap feeds back into the ONE
  English matrix (helping all languages at once). Needs a live provider → runs
  as a prod audit (like the all-questions driver), not a bare unit test. Start
  with the highest-usage languages, expand to all 15.

## Sequencing
1. **Workstream 1** (spoken-follows-detected) — concrete, user-facing, fully
   verifiable, independent of the gate work. Ship first.
2. **A → B → C** — the durable "routing never silently regresses" foundation.
   C is load-bearing (dispatch precedence).
3. **D** — depends on C (`resolveLane`) and validates Workstream 1's language
   routing end-to-end.
4. Mic STT language — follow-up, device-verified.

## Gates / audits (standing-net: each ships its gate)
- W1: spoken-language unit gate (conversation vs lesson).
- A/B: exhaustive matrix correct-lane gate.
- C: `resolveLane` dispatch-precedence gate (the concept-steal regression test).
- D: prod multilingual seam audit.
- Then the 3-instrument prod audit on the coach surfaces touched.

## Notes
- No product code is written until each item's root cause + fix is agreed
  (David's non-negotiable). This doc IS that agreement for the set above.
- The audit driver's stale ACCEPT regexes (strengths/records read ❌ while
  correct) are fixed as part of A (honest contracts).
