#!/bin/bash
# transcript-queue — pull and keep the captions for every queued video.
#
# David 2026-08-17: *"everything that we get access to gets saved, this is
# incase we need to adjust the narrations you wright, there are often more than
# one idea stated after each move, or if something else goes wrong. save it
# all!"* A hand-written note captures ONE of the ideas a teacher states at a
# move; the transcript is where the others still are. Re-visiting a narration
# without it means re-downloading a video, and that is the step that needs live
# cookies and a rate limit that is not always granted.
#
# THIS RUNS WHEN THE VIDEO DOWNLOADER CANNOT. Measured 2026-08-17: with media
# fetches returning HTTP 429 and 403 on fresh cookies, a subtitle fetch on the
# SAME cookies pulled 515KB without complaint. Captions are served from a
# different, far more permissive path — which is also how we knew the cookies were
# never the problem, only the rate. So a rate-limited hour is not a dead hour:
# the whole channel's teaching text can still be banked while the videos wait.
#
# Kept gzipped (448K of VTT goes to ~80K) because the queue is hundreds of
# videos long and the raw text compresses extremely well.
#
# Reference only — never quoted, never shipped as narration. Storing it is what
# makes that reference checkable later.
set -u
GAP=${GAP:-20}
cd /home/user/chess-academy-pro || exit 1
OUT=data/video-transcripts
mkdir -p "$OUT" /tmp/vtt

while read -r id; do
  [ -z "$id" ] && continue
  [ -f "$OUT/$id.vtt.gz" ] && continue

  # NO COOKIES NEEDED. Measured 2026-08-20: the `web_embedded` player client
  # walks past the "sign in to confirm you're not a bot" check that every other
  # client hits from a datacenter IP. It serves no usable video format — hence
  # --ignore-no-formats-error, since yt-dlp otherwise refuses before it ever
  # reaches the caption track — but the caption track itself comes back in full.
  # So the transcript half of this pipeline is self-serve from a session.
  if yt-dlp --extractor-args "youtube:player_client=web_embedded" \
       --ignore-no-formats-error --no-warnings \
       --write-auto-sub --skip-download --sub-format vtt --sub-langs "en.*" \
       -o "/tmp/vtt/%(id)s.%(ext)s" \
       "https://www.youtube.com/watch?v=$id" > /tmp/vtt/"$id".log 2>&1; then
    # THE LANGUAGE CODE IS NOT ALWAYS `en`. Measured 2026-08-21: _JUvx36zOYw
    # carries its auto-captions as `en-en`, so `--sub-langs en` skipped it and
    # the queue recorded "no english captions" for a video that has them. The
    # request is a REGEX (hence "en.*"), and the written filename carries
    # whatever code came back — so the pickup has to glob, not name one code.
    vtt=$(ls /tmp/vtt/"$id".*.vtt 2>/dev/null | head -1)
    if [ -n "$vtt" ]; then
      gzip -c "$vtt" > "$OUT/$id.vtt.gz"
      echo "TR OK   $id ($(du -h "$OUT/$id.vtt.gz" | cut -f1))"
      rm -f /tmp/vtt/"$id".*.vtt
    else
      # Auto-captions are not guaranteed to exist. That is a fact about the
      # upload, not a failure to retry — recorded so it is not attempted again.
      echo "TR NONE $id (no english captions)"
      echo "$id" >> data/video-queues/no-transcript.txt
    fi
  else
    echo "TR FAIL $id :: $(grep -oiE 'ERROR.*' /tmp/vtt/"$id".log 2>/dev/null | head -1 | cut -c1-60)"
    sleep 120
  fi
  rm -f "/tmp/vtt/$id.log"
  sleep $((GAP + RANDOM % 20))
done < /tmp/todo.txt
echo "=== TRANSCRIPT PASS DONE ==="
