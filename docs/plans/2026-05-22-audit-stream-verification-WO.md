# WO — Verify audit-stream capture after network unblock (2026-05-22)

**For:** the FIRST fresh session that boots after David updates the
environment's network policy + env vars. Pick this up before anything
else if the audit stream is the open question.

## Why this exists

Prior session (PR #644, branch `claude/audit-log-review-iaedu`) fixed a
real bug: in `/coach/review` the master-play claim validator was gating
the student's OWN game moves against the Lichess explorer; once a game
left book (a sacrifice / sharp middlegame) every concrete SAN tripped and
the coach stocked out with "I can't verify which moves are sound." Fix
threads a `gameSans` ground-truth set (the played game + legal moves of
the reviewed FEN) so the validator stops nuking real moves. Verified by
unit tests; **NOT** verified live, because the sandbox could not reach
prod.

Two environment gaps blocked live verification, which David is fixing in
the web UI:
1. **Network egress** — sandbox got `403 Host not in allowlist` on
   `https://chess-academy-pro.vercel.app`. David is adding it (and
   `api.vercel.com`) to the env's allowlist.
2. **Secrets not set** — `AUDIT_STREAM_SECRET`, `DEEPSEEK_KEY`,
   `ANTHROPIC_KEY` were "NOT set" per the SessionStart hook. David is
   adding them to the env-var config.

Network/env changes only apply to a **brand-new** session (baked at
container boot), hence this hand-off.

## Step 0 — confirm the environment is actually unblocked

Run the SessionStart hook output / check secrets. Then test egress:

```bash
SINCE=$(( $(date +%s000) - 3600000 ))
curl -s -m 25 -o /tmp/audit_pull.json -w "HTTP %{http_code}\n" \
  -H "x-audit-secret: ${AUDIT_STREAM_SECRET:?pass inline if hook says NOT set}" \
  "https://chess-academy-pro.vercel.app/api/audit-stream?since=${SINCE}"
head -c 2000 /tmp/audit_pull.json; echo
```

- `403 Host not in allowlist` → network policy still not applied. STOP,
  tell David the allowlist didn't take (or this isn't a fresh post-change
  session).
- `401` → the `x-audit-secret` doesn't match prod's `AUDIT_STREAM_SECRET`
  env. The three values must match: prod Vercel env, the app's
  `profile.preferences.auditStreamSecret`, and the token. Tell David.
- `200` with `storage: "redis"` or `"memory"` and event objects → GOOD,
  capture is working. Continue.
- `200` with `error: "server misconfigured: AUDIT_STREAM_SECRET not set"`
  → a Preview deploy got aliased to prod (Preview lacks the
  Production-only secret). Tell David to re-alias the prod deploy.

> The `AUDIT_STREAM_SECRET` value is NOT in this doc by design (never
> commit secrets). Get it from the env-var config, per-project memory, or
> ask David to paste it inline.

## Step 1 — answer David's actual question: "are the builds capturing data?"

From the Step-0 pull, inspect the events:

- Confirm the **401 storm is gone** — the prior dump had 26
  `audit-stream-post-failed` (lastStatus 401) and 151
  `audit-stream-truncated`. If POSTs now succeed, you'll see real
  `logAppAudit()` events flowing (route-changed, review-playback-step,
  coach-brain-*, voice-*, master-play-lookup, etc.) and NO 401 rollups.
- Report counts by `kind` and a few sample events so David can eyeball
  that the data shape is right.

## Step 2 — verify the review-coach fix END TO END (needs prod + LLM)

The #644 fix is on the PR's preview build, NOT prod. To verify live:

- If David **merged #644 to main** and Vercel redeployed: confirm the
  live bundle hash changed (`curl -s https://chess-academy-pro.vercel.app/
  | grep -oE '/assets/index-[A-Za-z0-9]+\.js' | head -1`), then run the
  interactive `/coach/review` audit (G7) — open a reviewed game that
  contains a sacrifice / off-book sharp middlegame, ask the coach about a
  move past book, and confirm it gives a real grounded answer instead of
  "I can't verify which moves are sound." Pull the stream and confirm NO
  `master-play-enforcement-fallback` fires for `surface=/coach/review` on
  legitimate game moves.
- This needs `DEEPSEEK_KEY` (or `ANTHROPIC_KEY`) set, or the coach returns
  "No API key configured."
- If #644 is NOT merged yet: don't claim the fix is verified on prod. The
  preview URL carries the fix; only David can drive it (sandbox can't do
  real-device/interactive voice).

## Status / pickup

- PR **#644** (draft) — review-coach grounding fix. CI green. Branch
  `claude/audit-log-review-iaedu`. Merge → run G1/G7 review audits.
- Open env config items (David's side): network allowlist + the three
  secrets.
- The `audit-stream-truncated` noise (cap 300, truncation events logged
  into the same buffer) is a known low-pri design nit — only touch if
  David asks.
