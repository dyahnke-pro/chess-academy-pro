#!/bin/bash
# NEXT ROUND — 24 Naroditsky lessons, then push them to the video-drop branch.
#
# Picked by which TAUGHT opening still has no track, one video per opening before
# any opening gets a second (scripts/video-align/next-round.mjs). Eight of these
# openings have zero video coverage today: Accelerated Dragon, Pirc, Budapest,
# Alekhine, Slav, Benko, open games, Najdorf.
#
# Run from the video-drop clone. Expects: yt-dlp, deno (npm i -g deno, for the
# n-challenge), and fresh cookies at /tmp/yt-cookies.txt — export them from a
# browser window you do NOT sign out of afterwards, since signing out rotates
# them dead.
#
# One at a time with jittered gaps: four at a time got the IP bot-checked after
# ~40 videos, and the cookies were never the problem, the request RATE was.
set -u
mkdir -p drop
for id in qhHtJcXkkfg l65FZlRkWcM k7R9Omne_1Y 9qWUk9eDpTg WmCImz1fv5s CXvo1dMF1Qs \
          uJCgrG90u8A 0npOMfkAlVU mCB8n7v0MEA EN72rn5tVYI KwbAHRLJ1RY Ybg_2qbKXdA \
          IMBSR0A9nJs ieznxMQccW0 D7sbbap9lIc WQFcuBCL1F4 Qewug63GIqc Twv9FExvwSw \
          jwFOi039eeg hw9tEjYabd8 Gk7MNomOOSA Zko_JUK06vM vB8yLBR5lHs QxHsw4ZS2Ts; do
  [ -s "drop/$id.mp4" ] && { echo "SKIP $id"; continue; }
  # 135 is 480p; the chain falls back rather than dropping the video. Video-only
  # DASH sidesteps the SABR wall that 403s every progressive format.
  if yt-dlp --cookies /tmp/yt-cookies.txt --remote-components ejs:npm \
       -f "135/396/bestvideo[height<=480]/bestvideo" \
       -o "drop/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=$id" > "drop/$id.log" 2>&1; then
    echo "OK   $id"
  else
    echo "FAIL $id :: $(grep -oiE 'ERROR.*' "drop/$id.log" | head -1 | cut -c1-70)"
    grep -qE 'HTTP Error (429|403)' "drop/$id.log" && { echo "  rate-limited, sleeping 300s"; sleep 300; }
  fi
  sleep $((45 + RANDOM % 30))
done
rm -f drop/*.log
git add drop && git commit -m "videos: next round — 24 lessons" && git push origin video-drop
