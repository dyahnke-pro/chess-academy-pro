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

## ✅ Resolved

- [x] **Coach perspective was ambiguous — user couldn't tell whose side the AI meant.**
  _2026-08-22, Lake Butler:_ "I wish the AI would be able to tell who's side it's
  talking about — I have a hard time understanding if they are talking about me or
  the opponent."
  → **Fixed** by the locked one-perspective standard (student = "you/your",
  opponent = "they/their", "we/our" banned), 2026-08-28, gated by
  `src/data/perspectiveVoice.test.ts`. Confirmed done by David 2026-09-02.

- [x] **Coach Q&A wasn't returning a tailored response.**
  _2026-08-22, Lake Butler:_ "I cannot ask the AI questions and get a tailored
  response — is this normal?"
  → Fixed. Confirmed done by David 2026-09-02.

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
