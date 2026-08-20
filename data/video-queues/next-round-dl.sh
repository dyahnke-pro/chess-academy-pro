#!/bin/bash
# ROUND 7 — the last 16 unharvested Naroditsky lessons on openings we teach.
# Every taught opening now has at least one track, so this round is depth on the
# four still-thin ones (Scotch, Caro-Kann, King's Indian, French).
#
# TWO SIZE FIXES, because the last round lost lessons to file size:
#
# 1. 360p, NOT 480p. `-f 134` first. The scanner reads the BOARD, and 30 of the
#    banked tracks were built at 360p (square 45px) and tracked fine — the
#    geometry scales by width automatically. 480p was never buying accuracy, it
#    was buying roughly double the bytes, on David's data.
# 2. ANYTHING STILL OVER 95MB IS SPLIT, NOT SKIPPED. GitHub refuses a blob over
#    100MB, and the drop branch is how these travel — so the old
#    `--max-filesize 99M` did not solve the size problem, it just dropped the
#    lesson on the floor and reported success. `split -b 95M` here, `cat` in
#    harvest-local.sh: the join is byte-exact, ffmpeg reads the rejoined file
#    unchanged.
set -u
mkdir -p drop
for id in 7xgOCneMX8s Z5QLUtjiGFg 9JUlD51s6zE 8O4UG9NtUoM zmdiLoeqFyU 898k4qkY0vg \
          ciTwGjksQWs -t1i9fKUUiI VOQ7DlsATuc 3XUh57mV8a8 NqtT3roFaBs H0Fln-ujA3w \
          ofUcXj4ArHA NQQnQ9X9dL8 1GSLXUHTrzc OE2pJpVVzYw; do
  ls "drop/$id.mp4" "drop/$id.mp4.part-aa" >/dev/null 2>&1 && continue
  echo "=== $id"
  ./yt-dlp-nightly --remote-components ejs:npm -4 --socket-timeout 30 --retries 15 \
    -f "134/396/135/bestvideo[height<=480]/bestvideo" \
    -o "drop/$id.mp4" -- "$id" || echo "FAILED $id (continuing)"
  # Split only what would be rejected. Most 360p lessons land well under this.
  if [ -f "drop/$id.mp4" ] && [ "$(stat -f%z "drop/$id.mp4" 2>/dev/null || stat -c%s "drop/$id.mp4")" -gt 99000000 ]; then
    echo "    splitting (over 95MB)"
    split -b 95M "drop/$id.mp4" "drop/$id.mp4.part-" && rm -f "drop/$id.mp4"
  fi
  sleep 5
done
git add drop && git commit -m "videos: round 7" && git push origin video-drop
