# Usage-report watermark (where the last rundown left off)

When David asks for a usage / activity / "who used the app" rundown, he has
ALREADY been shown every native-iOS event up to the cutoff below. **Start the
new rundown AFTER this cutoff** — don't re-report data he's already seen.
After you show him a fresh batch, UPDATE the cutoff to the newest event you
reported and move the ✅.

Scope reminder: native iOS / App Store real users only (per CLAUDE.md — exclude
web/pwa, David's TestFlight, Apple reviewers in Cupertino/Sunnyvale, and
audit/bot traffic).

## Last data shown to David

- ✅ **Through 2026-09-07T21:54:18Z** (UTC)
  - Last event in that batch: device `2bd362a4` (Taza, Morocco), App Store.
  - Shown during the 2026-09-08 session.
  - Next rundown: report native-iOS activity with `timestamp > 2026-09-07T21:54:18Z`.

## Note

There is currently NO telemetry for in-app message reads/receipts (the bell /
`/api/messages` emits no PostHog event). "Did users get/read my messages?"
cannot be answered until a `message_viewed` event is instrumented.
