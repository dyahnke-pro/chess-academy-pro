#!/bin/bash
# ONE AT A TIME, JITTERED GAPS, EXPONENTIAL BACK-OFF ON REFUSAL.
#
# Four-at-a-time got this IP bot-checked after ~40 videos: media fetches began
# returning 403 while subtitle fetches on the SAME cookies still worked, then it
# escalated to "Sign in to confirm you're not a bot". The cookies were never the
# problem; the request RATE was.
#
# Jitter matters as much as the gap — a request exactly every N seconds is itself
# a signature. On refusal, back off hard rather than retrying into the limiter.
#
# THE SKIP TEST MUST COVER EVERY WAY A VIDEO IS FINISHED WITH, NOT JUST SUCCESS.
# It used to ask only "is it banked, or on disk", so any video the pipeline
# handled WITHOUT producing a track fell straight back into the queue and was
# fetched again on the next pass — forever. Measured before the fix:
# C4xtj2rc0_k pulled four times and GqdveDSL2SA twice, against a request budget
# David explicitly asked to protect ("try not to set off any alarms on youtube
# for DLing too many at a time"). Two paths reach that state and neither leaves a
# track behind: a scan refusal parks the video for hand geometry, and a build
# that tracks fine but finds no usable game records NO-GAME. Both are recorded in
# the queue dir, so both are consulted here.
set -u
BASE=${BASE:-150}
fails=0

# Read fresh per video, never cached: the bank loop appends to these files
# concurrently, and an id refused thirty seconds ago must not be fetched now.
handled() {
  local id="$1"
  [ -f "data/video-tracks/$id.json" ] && return 0
  [ -f "data/video-pending/$id.json" ] && return 0
  ls /tmp/vid/"$id".mp4 /tmp/vid/"$id".webm >/dev/null 2>&1 && return 0
  ls /tmp/vid-refused/"$id".mp4 /tmp/vid-refused/"$id".webm >/dev/null 2>&1 && return 0
  grep -qxF "$id" data/video-queues/needs-hand-geometry.txt 2>/dev/null && return 0
  grep -qxF "$id" data/video-queues/no-game.txt 2>/dev/null && return 0
  return 1
}

while read -r id; do
  [ -z "$id" ] && continue
  handled "$id" && continue

  yt-dlp --cookies /tmp/yt-cookies.txt --remote-components ejs:npm \
    -f "135/396/bestvideo[height<=480]/bestvideo" -o "/tmp/vid/%(id)s.%(ext)s" \
    "https://www.youtube.com/watch?v=$id" > /tmp/vid/"$id".log 2>&1
  rc=$?

  # A DOWNLOAD WE KILLED IS NOT A DOWNLOAD YOUTUBE REFUSED. Every push cycle
  # pauses this loop, which kills whatever is in flight; counted as a refusal
  # that costs a 300s backoff for nothing AND walks the streak up toward the
  # 80-minute one — which is indistinguishable from real rate-limiting, and
  # would send the next session hunting a throttle that was self-inflicted.
  # 128+n is the shell's encoding of "died on signal n": 143 = SIGTERM.
  if [ "$rc" -ge 128 ]; then
    echo "DL INT  $id (interrupted, not counted)"
    continue
  fi

  if [ "$rc" -eq 0 ]; then
    echo "DL OK   $id"
    fails=0
    sleep $((BASE + RANDOM % 120))
  else
    fails=$((fails + 1))
    echo "DL FAIL $id (streak $fails)"
    if [ "$fails" -ge 5 ]; then back=4800; else back=$((300 * (1 << (fails - 1)))); fi
    echo "  backing off ${back}s"
    sleep "$back"
  fi
done < /tmp/todo.txt
echo "=== SLOW PASS DONE ==="
