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
# The gap ADAPTS rather than sitting on a guess — see the success branch below.
# It starts where the old fixed value was, so a limited IP is not hammered on
# startup, and walks down to MIN_GAP while fetches keep succeeding.
GAP=${GAP:-150}
MIN_GAP=${MIN_GAP:-20}
MAX_GAP=${MAX_GAP:-600}
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
    # WALK THE GAP DOWN WHILE IT IS WORKING. The old fixed 150-270s was a guess
    # made once after a bot-check and never retested — David's point, and a fair
    # one. But the ceiling is real and is YouTube's, not ours: measured
    # 2026-08-17, three back-to-back fetches returned HTTP 429 then 403 twice,
    # while a subtitle fetch on the same cookies pulled 515KB fine. So auth is
    # not the constraint and MEDIA fetches specifically are.
    #
    # Neither a fixed fast gap nor a fixed slow one can be right, because the
    # limit moves with whatever else has hit this IP. Shrinking on success and
    # growing on refusal finds it instead of assuming it.
    echo "DL OK   $id (gap ${GAP}s)"
    fails=0
    GAP=$(( GAP - 15 )); [ "$GAP" -lt "$MIN_GAP" ] && GAP=$MIN_GAP
    sleep $((GAP + RANDOM % 30))
  else
    fails=$((fails + 1))
    # 429 and 403 on media are the limiter talking; anything else is usually
    # this one video (missing format, members-only) and must not drag the whole
    # queue into an 80-minute backoff.
    if grep -qE "HTTP Error (429|403)" /tmp/vid/"$id".log 2>/dev/null; then
      GAP=$(( GAP * 2 )); [ "$GAP" -gt "$MAX_GAP" ] && GAP=$MAX_GAP
      if [ "$fails" -ge 5 ]; then back=4800; else back=$((300 * (1 << (fails - 1)))); fi
      echo "DL LIMIT $id (streak $fails) — gap now ${GAP}s, backing off ${back}s"
      sleep "$back"
    else
      echo "DL SKIP $id :: $(grep -oiE 'ERROR.*' /tmp/vid/"$id".log 2>/dev/null | head -1 | cut -c1-70)"
      fails=0
      sleep $((GAP + RANDOM % 30))
    fi
  fi
done < /tmp/todo.txt
echo "=== SLOW PASS DONE ==="
