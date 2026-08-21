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
# ONE RUN AT A TIME. Two concurrent runs iterate the same directory, and each
# deletes the grids file at the end of its own iteration — so one run removed the
# grids the other had just written, build.mjs died on the missing file, and the
# non-zero exit was recorded as NO-GAME with the video deleted. Seven lessons
# were written off that way, all of them fine. The lock makes the race
# impossible rather than making the failure legible after the fact.
LOCK=${LOCK:-/tmp/harvest-local.lock}
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "another harvest-local is running (lock: $LOCK) — refusing to race"; exit 1
fi
SRC=${1:?usage: harvest-local.sh <dir> [id...]}
shift || true
GRIDS=${GRIDS:-/tmp/batchbuild}
GEO="${GEO_X:-370} ${GEO_Y:--2} ${GEO_S:-60}"
mkdir -p "$GRIDS" data/video-pending

ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  ids=()
  # `*.mp4.part-aa` is listed too, or a split lesson is invisible to the sweep:
  # the id lives in the basename before `.mp4`, and only the FIRST part is read
  # so a four-part video enqueues once.
  for f in "$SRC"/*.mp4 "$SRC"/*.webm "$SRC"/*.mp4.part-aa; do
    [ -e "$f" ] || continue
    b=$(basename "$f"); b=${b%.part-aa}; ids+=("${b%.*}")
  done
  [ ${#ids[@]} -gt 0 ] && ids=($(printf '%s\n' "${ids[@]}" | awk '!seen[$0]++'))
fi

for id in "${ids[@]}"; do
  if [ -f "data/video-tracks/$id.json" ] || [ -f "data/video-pending/$id.json" ]; then
    echo "SKIP     $id (already banked)"; continue
  fi
  # SPLIT FILES ARRIVE IN PARTS, BECAUSE GITHUB REFUSES A BLOB OVER 100MB.
  # The drop branch is how the videos get here, so a 105MB lesson simply cannot
  # be pushed — the round-5 command papered over that with `--max-filesize 99M`,
  # which silently skipped those lessons instead of splitting them. `split -b 95M`
  # on his side, `cat` on this side: the concatenation is byte-exact, so the
  # rejoined mp4 is the file yt-dlp wrote and ffmpeg reads it unchanged.
  if ls "$SRC/$id".mp4.part-* >/dev/null 2>&1; then
    echo "JOIN     $id ($(ls "$SRC/$id".mp4.part-* | wc -l) parts)"
    cat "$SRC/$id".mp4.part-* > "$SRC/$id.mp4" && rm -f "$SRC/$id".mp4.part-*
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
  [ -n "${W:-}" ] && [ "$W" -gt 0 ] 2>/dev/null || W=854

  # TWO LAYOUTS, NOT ONE. The numbers above put the board on the RIGHT, next to
  # the webcam — that is the lab/speedrun layout and it is what every banked
  # track used. A second layout puts the board on the LEFT with the camera and
  # the game header stacked on the right, and under the right-board numbers it
  # reads NOTHING: 78 videos were parked for hand geometry on 2026-08-21, and
  # the first one opened by eye (D0AlZuN14Fw, a Naroditsky-Ortiz Suarez lesson)
  # was a left-board upload sitting at 3,3,44 on a 640-wide frame. Read at 854
  # that is 4,4,58.7, which is the second candidate below.
  #
  # Trying both costs nothing and risks nothing: scan_stream --calibrated
  # CONFIRMS the geometry against the start position, so the wrong layout
  # REFUSES rather than tracking a false line. That is the same property that
  # makes a single hand-read safe; it does not weaken by being tried twice.
  # An explicit GEO_X/GEO_Y/GEO_S still pins one layout and skips the search.
  if [ -n "${GEO_X:-}${GEO_Y:-}${GEO_S:-}" ]; then
    CANDS="${GEO_X:-370},${GEO_Y:--2},${GEO_S:-60}"
  else
    # THREE HAND-READ LAYOUTS, in descending order of how many tracks each
    # has produced. Read off a frame by eye and CONFIRMED against the start
    # position; this list is not a detector and must never become one.
    #   1. lab/speedrun  — board right, beside the webcam
    #   2. 2019 uploads  — board left, wooden theme, header stacked right
    #   3. co-stream     — board right, larger, below a player bar (640: 320,20,40)
    CANDS="370,-2,60 4,4,58.7 427,26.7,53.4"
  fi

  scanned=0
  for cand in $CANDS; do
    IFS=, read -r CX CY CS <<< "$cand"
    read -r GX GY GS <<< "$(awk -v w="$W" -v x="$CX" -v y="$CY" -v s="$CS" \
      'BEGIN{r=w/854; printf "%.4f %.4f %.4f", x*r, y*r, s*r}')"
    GEO="$GX $GY $GS"
    if python3 scripts/video-align/scan_stream.py "$f" "$GRIDS/$id.grids.json" $GEO 2 --calibrated \
         > "$GRIDS/$id.scan.log" 2>&1; then
      scanned=1; break
    fi
  done

  if [ "$scanned" -ne 1 ]; then
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

  VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/build.mjs \
    "$id" "$GRIDS/$id.grids.json" "$title" "$GX,$GY,$GS" \
    > "$GRIDS/$id.build.log" 2>&1
  rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "BANKED   $id :: $(cat "$GRIDS/$id.build.log")"
    [ -z "${KEEP_VIDEO:-}" ] && rm -f "$f"
  # A CRASH IS NOT A NO-GAME, AND MUST NOT DELETE THE VIDEO. `build.mjs` prints
  # its own refusal and exits non-zero for a genuine no-game; a stack trace is
  # the pipeline breaking, and recording that as a verdict retires a good video
  # permanently — the skip test consults no-game.txt, so it would never be
  # fetched again.
  elif grep -q "no usable game tracked" "$GRIDS/$id.build.log" 2>/dev/null; then
    echo "NO-GAME  $id :: $(tail -1 "$GRIDS/$id.build.log" | cut -c1-70)"
    grep -qxF "$id" data/video-queues/no-game.txt 2>/dev/null || echo "$id" >> data/video-queues/no-game.txt
    [ -z "${KEEP_VIDEO:-}" ] && rm -f "$f"
  else
    echo "CRASHED  $id (rc=$rc) :: $(grep -m1 -oE 'Error:.*' "$GRIDS/$id.build.log" | cut -c1-70) — video KEPT"
  fi
  rm -f "$GRIDS/$id.grids.json"
done
# BANKING A TRACK IS NOT FINISHING IT. `build.mjs` writes the moves; the opening
# resolution and the TITLE CHECK come from map-openings, and until it runs the
# bank holds tracks with no `openings` and no `titleCheck` at all. That matters
# more than tidiness: the title check is what catches a MISTRACKED build (titled
# a Scotch, tracked a Jobava), and CLAUDE.md forbids writing notes over one. A
# session that banked 34 lessons and stopped here left every one of them
# indistinguishable from a verified track.
echo "--- resolving openings + title checks for the bank ---"
VIDEO_TRACK_DIR=data/video-pending node scripts/video-align/map-openings.mjs --write \
  | tail -1 || echo "map-openings FAILED — the bank has tracks with no titleCheck"
echo "=== HARVEST-LOCAL DONE ==="
