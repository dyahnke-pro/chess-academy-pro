# User Feedback Log

Durable record of in-app user feedback (PostHog `feedback_submitted`) and its
resolution status, so future sessions don't re-chase issues that are already
fixed. PostHog events are immutable and can't be "checked off" there — this file
IS the checkbox. When you address a feedback item, mark it resolved here with the
fix that closed it and the date.

**Source of truth for pulling new feedback** (native, real users, David + Apple
review + audits excluded — see the native-user recipe in `CLAUDE.md`):

```sql
SELECT timestamp, properties.$geoip_city_name AS city, properties.summary AS feedback
FROM events
WHERE event='feedback_submitted'
  AND coalesce(properties.audit_run_id,'')='' 
  AND properties.$raw_user_agent NOT LIKE '%HeadlessChrome%'
  AND coalesce(properties.distribution,'')!='testflight'      -- excludes David
  AND coalesce(properties.$geoip_city_name,'')!='Cupertino'   -- excludes Apple review
ORDER BY timestamp DESC
```

---

## 🔴 REOPENED — live transcripts contradict the fix (2026-09-02)

Two items were checked off, then re-examining the actual coach `ask_text` →
`answer_text` on real iOS users (2026-09-02) showed both still broken **inside
the answers themselves** — a grounded move came back, but in the wrong voice
and/or answering the wrong question. Do NOT re-close these without reading the
live transcripts.

- [ ] **Coach perspective still speaks in color, not "you/they".** The
  2026-08-28 `perspectiveVoice.test.ts` gate covers SHIPPED narration data, but
  the LIVE coach-answer path (`coach_answer.answer_text`) is ungated and still
  emits third-person color. Real answers on 2026-08-27:
  - Ask: *"What's the strongest move for **me**…"* → *"…forced mate in 6 **for
    white**."* (never "you have a forced mate")
  - Ask: *"Did I have any good moves"* → *"**Black** is slightly better."*
  Fix must reach the runtime coach-answer voice, not just the static data gate.
  Original report: _2026-08-22, Lake Butler_ — "I wish the AI would tell whose
  side it's talking about."

- [ ] **Coach deflects review/retrospective questions into present best-move.**
  Ask: *"Did I have any good moves"* (retrospective, about the move already
  played) → *"The best move **is** f5"* (present position). Same class:
  *"Do I have any strong points"*, *"Review my last[t]"*, a pasted PGN, and a
  chess.com game link ALL returned the *"I can't verify that precisely from
  grounded data"* fallback. ~15% of real coach replies (94/635) are that
  fallback; all 4 conversing users hit it. Review-intent + game-paste/link intent
  are unhandled. Original report: _2026-08-22, Lake Butler_ — "I cannot ask the
  AI questions and get a tailored response — is this normal?"

## ✅ Resolved

- [x] **In-game "why" not clear to the user.**
  _2026-08-19, Pomona:_ "Why did that give ground"
  → Addressed. Confirmed done by David 2026-09-02.

---

## 💚 Positive (no action needed)

- _2026-08-31, Ingleside:_ "I love this app so much."

---

## 🐛 Meta / harness notes

- `feedback_submitted` **double-fires** — each submission lands twice within a
  few seconds (same text, same device). Minor submit-handler dedupe bug; dedupe
  on `(device_id, summary, minute)` when counting, and worth fixing at the source.
