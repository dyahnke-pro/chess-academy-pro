#!/bin/bash
# Stop the harvest loops, push on a quiet machine, restart them.
#
# ship-check has now timed out three times because scans had this 4-core box at
# load ~10. A timeout is reported identically to a real test failure, which cost
# two rounds of chasing a bug that did not exist. The scans are interruptible and
# resumable — they skip anything already banked — so pausing them is free, and
# racing them is not.
cd /home/user/chess-academy-pro || exit 1

# Hold the lock for the whole cycle, and release it however we exit — a stale
# lock would leave the harvest permanently stopped, which is worse than the
# race it prevents.
touch /tmp/harvest-paused
trap 'rm -f /tmp/harvest-paused' EXIT INT TERM

for p in $(pgrep -f "ytq.sh"); do kill "$p" 2>/dev/null; done
for p in $(pgrep -f "bank-loop.sh"); do kill "$p" 2>/dev/null; done
sleep 2
for p in $(pgrep -f scan_stream); do kill "$p" 2>/dev/null; done
for p in $(pgrep -f "yt-dlp"); do kill "$p" 2>/dev/null; done
sleep 3
echo "loops paused; load: $(uptime | sed 's/.*load average: //')"

# COMMIT ONLY THE BANK, NEVER `add -A`. A blanket add filed a hand-written
# quarantine decision and a new gate under "chore: bank tracks from the harvest
# loop" — the content was safe, but the message hid the two things in the batch
# that a later session would actually need to find. The loop's output is exactly
# these paths; anything else in the tree is deliberate work and gets its own
# commit by hand.
git add data/video-pending data/video-tracks data/video-queues 2>/dev/null
git diff --cached --quiet || git commit -q -m "chore(video-align): bank tracks from the harvest loop"
if [ -n "$(git status --porcelain)" ]; then
  echo "NOTE: uncommitted work outside the bank — left for a hand commit:"
  git status --porcelain | sed 's/^/  /'
fi
git fetch origin -q
git push origin HEAD:main HEAD:claude/coach-narration-sync-jhu1ws 2>&1 | tail -5
echo "--- push finished, restarting loops ---"

rm -f /tmp/harvest-paused
echo "lock released — supervisor restarts the loops within 2 min"
