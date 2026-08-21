#!/bin/bash
# 106 lessons — the 16 remaining gap-picks on TAUGHT openings first, then the 90
# left in the channel queue. 10s between each, roughly 1 hour.
#
# 360p (`-f 134`), and anything still over 95MB is SPLIT rather than skipped:
# GitHub refuses a blob over 100MB and the drop branch is how these travel.
# harvest-local.sh cats the parts back before scanning — the join is byte-exact.
#
# `stat -f%z` is the macOS spelling; the Linux `-c%s` fallback keeps the same
# script working either place. Getting this wrong disables the split SILENTLY,
# which is how a whole round was lost once already.
set -u
mkdir -p drop
n=0
for id in 7xgOCneMX8s Z5QLUtjiGFg 9JUlD51s6zE 8O4UG9NtUoM zmdiLoeqFyU 898k4qkY0vg \
          ciTwGjksQWs -t1i9fKUUiI VOQ7DlsATuc 3XUh57mV8a8 NqtT3roFaBs H0Fln-ujA3w \
          ofUcXj4ArHA NQQnQ9X9dL8 1GSLXUHTrzc OE2pJpVVzYw opvsrx5TCdU SV-y9Ai7QkA \
          ac2evoOBWko 7ntWn4K1_E4 TYKVZpAy5Ow d6tZXETpqT0 6JsSbmpj7UQ R2skmBe07aQ \
          RUYbO35XVCE wn7jKtpg2dg Vy6j7N_Wh0o n5BL4u1QpfY HF8cvN3ZKtU vosZEy6YML0 \
          d-MNpi_zPr0 -PSQS88VdZU VBxmm4zzC1g 8QxDmN_BMaU 25w0mYsx_Lk Ytkf3qZTj74 \
          HiCeU8tIh0U 3knyQ8z7lrQ aEKSPFwvFoY PHAmfkkrSSs js6ZLkfXwEg HVKBVYhxpEY \
          hzotV0aslmY 33EpuPv4ULw QJ3YfBMrVls nsG9XSdGkj8 uuDQbMlXeDQ Wgl8OsI1dB4 \
          qlEZdH3nEZs 8EZYSq6c_hg WM0vlYWi33I iwCO5bNiuNw oH407-a1v-4 xoS71OW-Re0 \
          lWVZLZdQHcY cdEASsRLWcg J6MDnL_B83w OwrIaWwPJvM U8zArIhxato ii1vl5wLPWU \
          FqVMAv3wKes qW-mT-FbLnA OkjaIVnXg9o WwRujiYpgq0 ZlIq20_wnho iQQDU3H7vaU \
          woqgGKERnps FPI9J8_LmJQ wdHXvOBC8bw n781_V5I0ac 9Iu56-1zzfI hyAhvdIvtzQ \
          3UqPa5eV2e0 bIxvPbhuTpo 7uxRcomJo7I VEwKZo8l7yY CfCoA7jQu84 W6nkqNrWVrk \
          gOKiOKPv-X0 7f2sPY2U204 CpaJYTaDHM0 j4-gTbXfwXg EfHnGTCO1s4 uVQKL83tZb0 \
          E0cMsom-N7E 1AMYr01rkHE JEMVGw2WdCE Z4WjtjMl3j8 Nu5BrqlnACs SziecWG-v0c \
          SXsVWpN8e1A HDSMjuNWNQk 26ZXZEiudhA xQ-L0aZ24FA NQYFSC5TCnE n64LCdoBzaU \
          6BHS8KMqLkU dJYcXok1_wQ SDIQje8v5SY kqgaZ8Tfhyk 7Tueff34xjA pXBR9CxK3lQ \
          fg3i2Yl_vqQ ndNfx0HHcLk s3ea8V8twrY S-PGKHRQM5o; do
  ls "drop/$id.mp4" "drop/$id.mp4.part-aa" >/dev/null 2>&1 && continue
  echo "=== $id"
  ./yt-dlp-nightly --remote-components ejs:npm -4 --socket-timeout 30 --retries 15 \
    -f "134/396/135/bestvideo[height<=480]/bestvideo" \
    -o "drop/$id.mp4" -- "$id" || echo "FAILED $id (continuing)"
  if [ -f "drop/$id.mp4" ] && [ "$(stat -f%z "drop/$id.mp4" 2>/dev/null || stat -c%s "drop/$id.mp4")" -gt 99000000 ]; then
    echo "    splitting (over 95MB)"; split -b 95M "drop/$id.mp4" "drop/$id.mp4.part-" && rm -f "drop/$id.mp4"
  fi
  # Push every 10 so an interrupted run keeps everything it already fetched.
  n=$((n+1)); [ $((n % 10)) -eq 0 ] && { git add drop && git commit -q -m "videos: +$n" && git push -q origin video-drop || echo "    push deferred"; }
  sleep 10
done
git add drop && git commit -m "videos: final batch" && git push origin video-drop
