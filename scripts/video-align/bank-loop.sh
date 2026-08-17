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

    if ! python3 scripts/video-align/scan_stream.py "$v" /tmp/g_$id.json \
         "$GEO_X" "$GEO_Y" "$GEO_S" 2 --calibrated > /tmp/g_$id.log 2>&1; then
      echo "SCAN-REF $id"; rm -f "$v" /tmp/g_$id.json; progressed=1; continue
    fi
    title=$(node -e "
      const m=JSON.parse(require('fs').readFileSync('data/sources/naroditsky-voice/manifest.json','utf8'));
      const v=(Array.isArray(m)?m:(m.videos??[])).find(v=>v.id===process.argv[1]);
      process.stdout.write(v?v.title:'');" "$id" 2>/dev/null)

    if VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs \
         "$id" /tmp/g_$id.json "$title" "$GEO_X,$GEO_Y,$GEO_S" > /tmp/b_$id.log 2>&1; then
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
