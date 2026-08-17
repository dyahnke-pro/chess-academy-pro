#!/bin/bash
# run-batch — every downloaded video through to a saved build.
#
# David 2026-08-17: *"dont stop until you have finished all of the videos that
# you have downloaded."*
#
# One video per invocation of the inner loop, N in parallel. Frames are streamed
# (scan_stream.py), so disk stays flat no matter how many run — the file-based
# scanner needed ~2.6GB per video and could not have done this batch at all.
#
# A video that cannot be read is REFUSED and recorded, never guessed at. The log
# is the record of which ones need geometry read by hand.
set -u
VIDDIR=/tmp/vid
OUT=/tmp/batchbuild
GEO_X=${GEO_X:-370}
GEO_Y=${GEO_Y:--2}
GEO_S=${GEO_S:-60}
JOBS=${JOBS:-3}
mkdir -p "$OUT"

one() {
  local f="$1" id
  id=$(basename "$f"); id="${id%.*}"
  if [ -f "data/video-tracks/$id.json" ]; then echo "SKIP $id (already built)"; return; fi
  local grids="$OUT/$id.grids.json"
  if [ ! -s "$grids" ]; then
    if ! python3 scripts/video-align/scan_stream.py "$f" "$grids" "$GEO_X" "$GEO_Y" "$GEO_S" 2 --calibrated \
         > "$OUT/$id.scan.log" 2>&1; then
      echo "REFUSED-SCAN $id :: $(tail -1 "$OUT/$id.scan.log" | cut -c1-90)"; return
    fi
  fi
  local title
  title=$(node -e "
    const m=JSON.parse(require('fs').readFileSync('data/sources/naroditsky-voice/manifest.json','utf8'));
    const v=(Array.isArray(m)?m:(m.videos??[])).find(v=>v.id===process.argv[1]);
    process.stdout.write(v?v.title:'');" "$id" 2>/dev/null)
  if node scripts/video-align/build.mjs "$id" "$grids" "$title" "$GEO_X,$GEO_Y,$GEO_S" \
       > "$OUT/$id.build.log" 2>&1; then
    echo "BUILT $id :: $(cat "$OUT/$id.build.log")"
  else
    echo "REFUSED-BUILD $id :: $(tail -1 "$OUT/$id.build.log" | cut -c1-90)"
  fi
}
export -f one
export OUT GEO_X GEO_Y GEO_S

ls "$VIDDIR"/*.mp4 "$VIDDIR"/*.webm 2>/dev/null | xargs -P "$JOBS" -I{} bash -c 'one "$@"' _ {}
echo "=== BATCH DONE ==="
