#!/bin/bash
# harvest — download, scan, bank the track, throw the video away.
#
# David 2026-08-17: *"the hardest or most important part is getting the video DL.
# so do that first, save them, then we do the rewrite at our leisure."*
#
# The download is the perishable half: it needs cookies that expire within the
# hour, and a video not grabbed while they are live is unavailable until fresh
# ones arrive. The writing needs only time. So this banks the machine half as
# fast as the cookies allow and leaves the prose for later.
#
# IT BANKS THE TRACK, NOT THE VIDEO. A video is ~50MB and cannot live in git; a
# track is ~15KB and carries everything a note needs — positions, timestamps,
# forks. So each video is deleted the moment its track exists, which keeps disk
# flat no matter how many are harvested. Nothing has to be downloaded twice.
#
# A track lands in data/video-pending/ — captured, not shipped. It moves to
# data/video-tracks/ only when its notes are hand-written (gated).
#
# Usage: harvest.sh <id> [id...]      env: KEEP_VIDEO=1 to skip the delete
set -u
COOKIES=${COOKIES:-/tmp/yt-cookies.txt}
VID=${VID:-/tmp/vid}
SUBS=${SUBS:-/tmp/subs}
GRIDS=${GRIDS:-/tmp/batchbuild}
GEO="${GEO_X:-370} ${GEO_Y:--2} ${GEO_S:-60}"
mkdir -p "$VID" "$SUBS" "$GRIDS" data/video-pending

for id in "$@"; do
  if [ -f "data/video-tracks/$id.json" ] || [ -f "data/video-pending/$id.json" ]; then
    echo "SKIP     $id (already banked)"; continue
  fi

  # SUBTITLES FIRST, and always kept: they are needed to write the notes later,
  # they are tiny, and they expire with the same cookies as the video.
  if [ ! -s "$SUBS/$id.en.vtt" ]; then
    yt-dlp --cookies "$COOKIES" --remote-components ejs:npm \
      --write-auto-sub --skip-download --sub-format vtt --sub-langs en \
      -o "$SUBS/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=$id" \
      > "$SUBS/$id.log" 2>&1
  fi

  f=$(ls "$VID/$id".mp4 "$VID/$id".webm 2>/dev/null | head -1)
  if [ -z "$f" ]; then
    # 135 is 480p and is missing on some uploads; the chain falls back rather
    # than dropping the video.
    yt-dlp --cookies "$COOKIES" --remote-components ejs:npm \
      -f "135/396/bestvideo[height<=480]/bestvideo" \
      -o "$VID/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=$id" \
      > "$VID/$id.log" 2>&1
    f=$(ls "$VID/$id".mp4 "$VID/$id".webm 2>/dev/null | head -1)
  fi
  if [ -z "$f" ]; then
    echo "DL-FAIL  $id :: $(grep -oE 'ERROR.*' "$VID/$id.log" 2>/dev/null | head -1 | cut -c1-80)"
    continue
  fi

  if ! python3 scripts/video-align/scan_stream.py "$f" "$GRIDS/$id.grids.json" $GEO 2 --calibrated \
       > "$GRIDS/$id.scan.log" 2>&1; then
    echo "SCAN-REF $id :: $(tail -1 "$GRIDS/$id.scan.log" | cut -c1-70)"
    [ -z "${KEEP_VIDEO:-}" ] && rm -f "$f"
    continue
  fi

  title=$(node -e "
    const m=JSON.parse(require('fs').readFileSync('data/sources/naroditsky-voice/manifest.json','utf8'));
    const v=(Array.isArray(m)?m:(m.videos??[])).find(v=>v.id===process.argv[1]);
    process.stdout.write(v?v.title:'');" "$id" 2>/dev/null)

  if VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs \
       "$id" "$GRIDS/$id.grids.json" "$title" "${GEO_X:-370},${GEO_Y:--2},${GEO_S:-60}" \
       > "$GRIDS/$id.build.log" 2>&1; then
    echo "BANKED   $id :: $(cat "$GRIDS/$id.build.log")"
  else
    echo "NO-GAME  $id :: $(tail -1 "$GRIDS/$id.build.log" | cut -c1-70)"
  fi

  # The video has served its purpose the moment a track exists. Grids too — they
  # are ~800KB each and regenerable from the video, which we are also deleting;
  # the track is the artifact worth keeping.
  if [ -z "${KEEP_VIDEO:-}" ]; then
    rm -f "$f" "$GRIDS/$id.grids.json"
  fi
done
echo "=== HARVEST DONE ==="
