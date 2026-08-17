#!/bin/bash
# Push the harvest on a timer, not per track.
#
# Two reasons this is batched. Each push runs a ~10-minute ship-check via the
# pre-push hook, and each push to main is a Vercel production build against a
# 100/day cap — CLAUDE.md's deploy policy is explicit that it is one deploy per
# finished body of work, never one per commit. A loop banking a track every few
# minutes would burn both.
#
# Each cycle pauses the loops first: ship-check has timed out three times racing
# the scanners at load ~10, and a timeout is reported identically to a real test
# failure. The scans resume cleanly — they skip anything already banked.
INTERVAL=${INTERVAL:-1200}   # 20 minutes — keeps pace with the bank loop
cd /home/user/chess-academy-pro || exit 1
while true; do
  sleep "$INTERVAL"
  # NEVER START A SECOND SHIP-CHECK. Each one is a ~10-minute, CPU-bound run
  # (typecheck, prod build, full eslint), so two on a 4-core box do not take 10
  # minutes each — they take 35 and look hung. That is exactly what happened
  # when a hand-run check overlapped this timer, and the symptom was
  # indistinguishable from a stuck gate.
  if pgrep -f "ship-check.mjs" > /dev/null; then
    echo "[$(date -u +%H:%M)] ship-check already running — skipping this cycle"
  elif [ -n "$(git status --porcelain)" ] || [ -n "$(git log origin/main..HEAD --oneline 2>/dev/null)" ]; then
    echo "[$(date -u +%H:%M)] push cycle starting"
    # KEEP THE WHOLE OUTPUT. This piped through `tail -6`, which threw away
    # every line of a ship-check failure and left only "push aborted" — so a
    # real regression looked identical to a timeout and could not be diagnosed
    # without re-running a 10-minute check by hand.
    /tmp/pushcycle.sh > /tmp/pushcycle.last.log 2>&1
    tail -6 /tmp/pushcycle.last.log
  else
    echo "[$(date -u +%H:%M)] nothing to push"
  fi
done
