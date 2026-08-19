#!/bin/bash
# harvest-local — scan and bank videos ALREADY ON DISK. Never downloads.
#
# David 2026-08-19, after two sessions burned his data allowance in fifteen
# minutes each: *"i have DL'd the videos and they are ready for you to work on,
# but i trust that you will NOT DO THAT AGAIN"*. So the perishable half now
# happens on his machine (`data/video-queues/next-round-dl.sh`) and he hands the
# files over on the `video-drop` branch; this is the other half, and it makes no
# network requests at all.
#
# Same scan -> track -> delete as harvest.sh, minus the two yt-dlp calls. A
# video is deleted once its track exists (the track is ~15KB and carries
# everything a note needs) unless KEEP_VIDEO=1.
#
# Usage: harvest-local.sh <dir-of-mp4s> [id ...]     # no ids = every mp4 there
set -u
SRC=${1:?usage: harvest-local.sh <dir> [id...]}
shift || true
GRIDS=${GRIDS:-/tmp/batchbuild}
GEO="${GEO_X:-370} ${GEO_Y:--2} ${GEO_S:-60}"
mkdir -p "$GRIDS" data/video-pending

ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  ids=()
  for f in "$SRC"/*.mp4 "$SRC"/*.webm; do [ -e "$f" ] || continue; ids+=("$(basename "${f%.*}")"); done
fi

for id in "${ids[@]}"; do
  if [ -f "data/video-tracks/$id.json" ] || [ -f "data/video-pending/$id.json" ]; then
    echo "SKIP     $id (already banked)"; continue
  fi
  f=$(ls "$SRC/$id".mp4 "$SRC/$id".webm 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "MISSING  $id (not in $SRC)"; continue; fi

  # GEOMETRY IS IN PIXELS, SO IT MOVES WITH THE RESOLUTION. yt-dlp format 135 is
  # 480p and is missing on some uploads, so the fallback chain hands back 360p —
  # and ten of eleven refusals in the first local run were exactly that: 640x360
  # files read with the 854x480 numbers, which lands the grid off the board and
  # reads nothing. Scaling by width recovers 277.5,-1.5,45, which is what the
  # already-banked 360p tracks used. The scan still CONFIRMS against the start
  # position, so a wrong scale refuses rather than tracking a false line.
  W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f" 2>/dev/null)
  if [ -n "${W:-}" ] && [ "$W" -gt 0 ] 2>/dev/null; then
    read -r GX GY GS <<< "$(awk -v w="$W" -v x="${GEO_X:-370}" -v y="${GEO_Y:--2}" -v s="${GEO_S:-60}" \
      'BEGIN{r=w/854; printf "%.4f %.4f %.4f", x*r, y*r, s*r}')"
  else
    GX=${GEO_X:-370}; GY=${GEO_Y:--2}; GS=${GEO_S:-60}
  fi
  GEO="$GX $GY $GS"

  if ! python3 scripts/video-align/scan_stream.py "$f" "$GRIDS/$id.grids.json" $GEO 2 --calibrated \
       > "$GRIDS/$id.scan.log" 2>&1; then
    # A refusal is the scanner declining geometry it cannot confirm against the
    # start position — park it for a hand read rather than tracking a false line.
    echo "SCAN-REF $id :: $(tail -1 "$GRIDS/$id.scan.log" | cut -c1-70)"
    grep -qxF "$id" data/video-queues/needs-hand-geometry.txt 2>/dev/null || echo "$id" >> data/video-queues/needs-hand-geometry.txt
    continue
  fi

  title=$(node -e "
    const m=JSON.parse(require('fs').readFileSync('data/sources/naroditsky-voice/manifest.json','utf8'));
    const v=(Array.isArray(m)?m:(m.videos??[])).find(v=>v.id===process.argv[1]);
    process.stdout.write(v?v.title:'');" "$id" 2>/dev/null)

  if VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs \
       "$id" "$GRIDS/$id.grids.json" "$title" "$GX,$GY,$GS" \
       > "$GRIDS/$id.build.log" 2>&1; then
    echo "BANKED   $id :: $(cat "$GRIDS/$id.build.log")"
    [ -z "${KEEP_VIDEO:-}" ] && rm -f "$f"
  else
    echo "NO-GAME  $id :: $(tail -1 "$GRIDS/$id.build.log" | cut -c1-70)"
    grep -qxF "$id" data/video-queues/no-game.txt 2>/dev/null || echo "$id" >> data/video-queues/no-game.txt
    [ -z "${KEEP_VIDEO:-}" ] && rm -f "$f"
  fi
  rm -f "$GRIDS/$id.grids.json"
done
echo "=== HARVEST-LOCAL DONE ==="
