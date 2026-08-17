#!/bin/bash
# bank-loop — keep turning downloaded videos into banked tracks, forever.
#
# David 2026-08-17: *"i still want you DLing and distilling videos. we can do the
# rewrite tomorrow."* Downloading and distilling are machine work; the writing is
# not. This runs the machine half continuously so the bank grows while the prose
# waits for a person.
#
# ONE VIDEO AT A TIME, ON PURPOSE. Three concurrent scans put a 4-core box at
# load ~10, which did not speed anything up and did make the pre-push ship-check
# time out twice — and a timeout reads exactly like a real test failure, which
# cost two rounds of chasing a bug that was not there.
#
# Each pass: scan -> track -> stamp openings + title check -> DELETE the video.
# The video is ~50MB and disposable once tracked; the track is ~15KB and is
# everything a note needs. The title check is stamped HERE rather than at writing
# time so tomorrow's session can trust the bank without re-deriving whether each
# board matches its title.
set -u
cd /home/user/chess-academy-pro || exit 1
GEO_X=${GEO_X:-370}; GEO_Y=${GEO_Y:--2}; GEO_S=${GEO_S:-60}
IDLE=${IDLE:-120}

while true; do
  progressed=0
  for v in /tmp/vid/*.mp4 /tmp/vid/*.webm; do
    [ -e "$v" ] || continue
    id=$(basename "$v"); id="${id%.*}"
    [ -f "data/video-tracks/$id.json" ] && { rm -f "$v"; continue; }
    [ -f "data/video-pending/$id.json" ] && { rm -f "$v"; continue; }

    # GEOMETRY SCALES WITH THE ENCODE. The stream layout is fixed, but YouTube
    # serves it at whatever resolution it likes, and the pixel numbers scale with
    # it — the 640x360 encode is exactly 0.75x the 854x480 one. Feeding the
    # 854-width numbers to a 640-width video reads a board that is not there and
    # the scan refuses, which looks like a bad video and is not: C4xtj2rc0_k
    # refused this way and gave 58 plies of Owen's Defence once scaled.
    w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$v" 2>/dev/null | head -1)
    w=${w:-854}
    sx=$(node -e "process.stdout.write(String($GEO_X*$w/854))")
    sy=$(node -e "process.stdout.write(String($GEO_Y*$w/854))")
    ss=$(node -e "process.stdout.write(String($GEO_S*$w/854))")
    if ! python3 scripts/video-align/scan_stream.py "$v" /tmp/g_$id.json \
         "$sx" "$sy" "$ss" 2 --calibrated > /tmp/g_$id.log 2>&1; then
      # DO NOT DELETE A REFUSED VIDEO. A refusal is usually a fixable geometry
      # or orientation problem, not a bad video — the Danish Gambit refused,
      # then yielded 286 plies once its board was read by hand. Deleting it
      # destroys the only artifact that makes that fix possible, and the video
      # cannot be re-fetched without live cookies. Park it instead.
      echo "SCAN-REF $id (parked for a hand look)"
      mkdir -p /tmp/vid-refused
      mv -f "$v" /tmp/vid-refused/ 2>/dev/null
      echo "$id" >> data/video-queues/needs-hand-geometry.txt
      rm -f /tmp/g_$id.json; progressed=1; continue
    fi
    title=$(node -e "
      const m=JSON.parse(require('fs').readFileSync('data/sources/naroditsky-voice/manifest.json','utf8'));
      const v=(Array.isArray(m)?m:(m.videos??[])).find(v=>v.id===process.argv[1]);
      process.stdout.write(v?v.title:'');" "$id" 2>/dev/null)

    if VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs \
         "$id" /tmp/g_$id.json "$title" "$sx,$sy,$ss" > /tmp/b_$id.log 2>&1; then
      echo "BANKED   $id :: $(cat /tmp/b_$id.log)"
    else
      echo "NO-GAME  $id :: $(tail -1 /tmp/b_$id.log | cut -c1-60)"
    fi
    rm -f "$v" /tmp/g_$id.json
    progressed=1
  done

  if [ "$progressed" = "1" ]; then
    VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/map-openings.mjs --write \
      > /tmp/bank-map.log 2>&1
    echo "--- bank: $(ls data/video-pending/*.json 2>/dev/null | grep -vc by-opening) tracks ---"
  fi
  sleep "$IDLE"
done
