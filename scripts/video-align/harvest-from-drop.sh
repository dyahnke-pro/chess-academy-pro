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
    if ! git cat-file -e "$REF:$DIR/$id.mp4" 2>/dev/null; then
      echo "NO-BLOB  $id"; continue
    fi
    git cat-file blob "$REF:$DIR/$id.mp4" > "$DIR/$id.mp4" 2>/dev/null \
      || { echo "FETCH-FAIL $id"; rm -f "$DIR/$id.mp4"; continue; }
  done
  bash scripts/video-align/harvest-local.sh "$DIR" || echo "harvest-local returned non-zero — continuing"
  # harvest-local deletes what it banks; clear anything it kept (a crash) so the
  # next batch starts from a known-empty directory rather than re-scanning.
  find "$DIR" -maxdepth 1 -name '*.mp4' -delete 2>/dev/null
  echo "--- disk: $(df -h / | awk 'NR==2{print $4}') free ---"
done
echo "=== HARVEST-FROM-DROP DONE ==="
