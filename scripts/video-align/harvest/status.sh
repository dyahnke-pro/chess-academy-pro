#!/bin/bash
# THE ONLY HONEST WAY TO READ THE HEARTBEAT.
#
# The heartbeat file states "bank-loop: up" as a fact, which is true only at the
# instant it was written. When the supervisor itself died the whole harvest
# stopped and the file kept saying everything was up — and was quoted to David
# as proof it was running, two hours after it stopped. A snapshot with no
# freshness check is indistinguishable from a live one.
#
# So this refuses to print the contents without the age, and says plainly when
# the writer is gone.
f=/tmp/harvest-heartbeat.txt
[ -f "$f" ] || { echo "NO HEARTBEAT — harvest has never run in this container"; exit 1; }
age=$(( $(date +%s) - $(stat -c %Y "$f") ))
if [ "$age" -gt 180 ]; then
  echo "!! HEARTBEAT STALE: ${age}s old — the supervisor is DEAD, nothing below is current"
else
  echo "heartbeat fresh (${age}s old)"
fi
sed 's/^/  /' "$f"
echo "  live now: $(pgrep -fc 'bank-loop.sh' 2>/dev/null || echo 0) bank, $(pgrep -fc 'ytq.sh' 2>/dev/null || echo 0) dl, $(pgrep -fc 'supervisor.sh' 2>/dev/null || echo 0) supervisor"
