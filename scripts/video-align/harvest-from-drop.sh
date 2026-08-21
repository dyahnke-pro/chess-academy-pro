#!/bin/bash
# harvest-from-drop — materialise videos off the `video-drop` branch and bank them.
#
# The videos reach this container as git blobs on a branch, not as files: the
# clone is blobless (`--filter=blob:none`), so a 500-video branch costs nothing
# until a blob is actually asked for. This walks the ids, checks out ONE batch at
# a time with `git cat-file`, hands the directory to harvest-local.sh (which
# scans, banks and deletes each file), and moves on.
#
# BATCHED ON PURPOSE. Materialising all of them at once is several gigabytes of
# writable disk, and this session's disk is a fixed allowance — "no space left on
# device" mid-sweep would leave half-written mp4s that scan as garbage. A batch
# is materialised, consumed and gone before the next one is fetched, so peak
# usage is one batch rather than the whole branch.
#
# A blob that will not materialise is SKIPPED, never fatal: one bad object must
# not end a sweep of hundreds (the round-5 download command used `|| break` and
# one oversize file killed the whole round).
#
# Usage: harvest-from-drop.sh <ids-file> [batch-size]
set -u
IDS=${1:?usage: harvest-from-drop.sh <ids-file> [batch]}
BATCH=${2:-25}
REF=${REF:-origin/video-drop}
DIR=${DIR:-drop}
mkdir -p "$DIR"

mapfile -t ALL < "$IDS"
total=${#ALL[@]}
echo "=== $total id(s) to harvest from $REF, batches of $BATCH ==="

i=0
while [ $i -lt $total ]; do
  batch=("${ALL[@]:$i:$BATCH}")
  i=$((i + BATCH))
  echo "--- materialising $((${#batch[@]})) (through $i/$total) ---"
  for id in "${batch[@]}"; do
    [ -z "$id" ] && continue
    if [ -f "data/video-tracks/$id.json" ] || [ -f "data/video-pending/$id.json" ]; then
      echo "SKIP-BANKED $id"; continue
    fi
    # A LESSON OVER 100MB ARRIVES SPLIT, AND MUST NOT GO MISSING.
    # GitHub refuses a blob that big, so those are pushed as `.mp4.part-aa`,
    # `.part-ab`, … Checking only for `<id>.mp4` reported NO-BLOB and moved on —
    # 19 of the 586 on the branch, silently dropped, which is the exact shape of
    # failure this pipeline keeps re-learning: the loop says success and the
    # lesson is on the floor. `cat` in order is byte-exact, so the rejoined file
    # is the one yt-dlp wrote and ffmpeg reads it unchanged.
    if git cat-file -e "$REF:$DIR/$id.mp4" 2>/dev/null; then
      git cat-file blob "$REF:$DIR/$id.mp4" > "$DIR/$id.mp4" 2>/dev/null \
        || { echo "FETCH-FAIL $id"; rm -f "$DIR/$id.mp4"; continue; }
    else
      parts=$(git ls-tree -r --name-only "$REF" 2>/dev/null | grep -E "^$DIR/$(printf '%s' "$id" | sed 's/[][\.*^$/]/\\&/g')\.mp4\.part-" | sort)
      if [ -z "$parts" ]; then echo "NO-BLOB  $id"; continue; fi
      : > "$DIR/$id.mp4"
      ok=1
      for part in $parts; do
        git cat-file blob "$REF:$part" >> "$DIR/$id.mp4" 2>/dev/null || { ok=0; break; }
      done
      if [ "$ok" -ne 1 ]; then echo "FETCH-FAIL $id (split)"; rm -f "$DIR/$id.mp4"; continue; fi
      echo "JOINED   $id ($(printf '%s\n' $parts | wc -l) parts)"
    fi
  done
  bash scripts/video-align/harvest-local.sh "$DIR" || echo "harvest-local returned non-zero — continuing"
  # harvest-local deletes what it banks; clear anything it kept (a crash) so the
  # next batch starts from a known-empty directory rather than re-scanning.
  find "$DIR" -maxdepth 1 -name '*.mp4' -delete 2>/dev/null
  echo "--- disk: $(df -h / | awk 'NR==2{print $4}') free ---"
done
echo "=== HARVEST-FROM-DROP DONE ==="
