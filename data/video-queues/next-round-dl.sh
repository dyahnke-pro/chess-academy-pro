#!/bin/bash
# BIG ROUND — 100 Naroditsky lessons, 5 minutes between each (~8.5 hours).
#
# Composition, because only 16 of these are gap-picks: the taught-opening queue
# is nearly drained (every taught opening already has a track). After those 16
# come 61 whose TITLE names a taught opening, then speedrun uploads whose
# opening is discovered by SCANNING rather than by the title — most Naroditsky
# titles name no opening at all, and the board read is what identifies the line.
#
# SIZE: 360p (`-f 134`), and anything still over 95MB is SPLIT rather than
# skipped — GitHub refuses a blob over 100MB and the drop branch is how these
# travel. `harvest-local.sh` cats the parts back; the join is byte-exact.
set -u
mkdir -p drop
for id in 7xgOCneMX8s Z5QLUtjiGFg 9JUlD51s6zE 8O4UG9NtUoM zmdiLoeqFyU 898k4qkY0vg \
          ciTwGjksQWs -t1i9fKUUiI VOQ7DlsATuc 3XUh57mV8a8 NqtT3roFaBs H0Fln-ujA3w \
          ofUcXj4ArHA NQQnQ9X9dL8 1GSLXUHTrzc OE2pJpVVzYw bXAHcPB2hEk KwU9YZOZkQU \
          IEnsliJAt3U rk_9n_Kj6EE nSASokndzVQ nkDlJMpLezk JXqgHjE14K4 r7W4yl6y29c \
          O0JmBfMtiWs f8alAsVJRc8 G_V3C8LQ_ik Q0CTfDwnd3A PmStO-m1Eu4 kWk-UW7GdnY \
          ktoa6lk6qNk IHjt6amFgyE 6WyNj23mrCc HAMhInc37gI uJro3yCDEgk lLkqjBOGgek \
          wrk4e6bGi1Y gcx89fY8nZQ o29kg7LLAVg cKeN_oR3VEA hBzXn8Kdaao Dj_hLEdDpAg \
          d-CFu7RMVoY UVJ75kdDdt8 TGXiOtbbDLE oUhyUlyh1Fs SV-y9Ai7QkA ac2evoOBWko \
          utcO6odBZIg _Y-iXy9b4Ew CZC9BI_joNU DCBwXvH3kH4 0fb75Z-i03A YQhpedRR2Y4 \
          TPTu9YuBMwU kVIQEb0fOPg hX6W4X_CqkA C14ui8o_esM 38QzSkFRn4E zhfOsKtD2vk \
          VeHyQWutHPQ JwmxAagJ7bQ fc8rxAMb7xI U9ZVpNscIGg -Y5bZoD6TM0 3nyxVHwDCTY \
          4_Ev1a1_2Mg 4Vbr9EQoGd4 wBbeP1w-NTQ BmFrJuPdwxE 0LxFKZyaD-I 8L-cDJJBbxc \
          8QxDmN_BMaU yfcdobOQxcw _sp6jBv0EWA oqbLgvN8DCs sqpNZmRg7oc sfjI4jEY58s \
          MvaAX4pTvYU k9EmWn_MvQc 4Y88u0Qjd5s u6uLgifbn5I YFoByIzKGUk 1tbpB-Qrqds \
          24yObE8SLzY tPdiNtdFe98 jL_wSA6EeY8 HvrXmUORIcQ 91lZ8sfu-XU wbCZq2_-xM0 \
          ft4drtuFhMU KJTX68hK87w LvWVEAyZzxc oF7Rh6qXj1A 4EXCxC9UxI0 Wwp9E6P-AHo \
          Mre1JH64oWs X6HE6h1OjRQ vH3fLZ7Y4YM GbY7R4GYN_M; do
  ls "drop/$id.mp4" "drop/$id.mp4.part-aa" >/dev/null 2>&1 && continue
  echo "=== $id"
  ./yt-dlp-nightly --remote-components ejs:npm -4 --socket-timeout 30 --retries 15 \
    -f "134/396/135/bestvideo[height<=480]/bestvideo" \
    -o "drop/$id.mp4" -- "$id" || echo "FAILED $id (continuing)"
  if [ -f "drop/$id.mp4" ] && [ "$(stat -f%z "drop/$id.mp4" 2>/dev/null || stat -c%s "drop/$id.mp4")" -gt 99000000 ]; then
    echo "    splitting (over 95MB)"
    split -b 95M "drop/$id.mp4" "drop/$id.mp4.part-" && rm -f "drop/$id.mp4"
  fi
  # Push every 10 so an interrupted overnight run does not lose the whole batch.
  n=$(( ${n:-0} + 1 ))
  if [ $(( n % 10 )) -eq 0 ]; then
    git add drop && git commit -q -m "videos: big round (+$n)" && git push -q origin video-drop || echo "push deferred"
  fi
  sleep 300
done
git add drop && git commit -m "videos: big round" && git push origin video-drop
