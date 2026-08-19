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
# The working shape, from the run that landed the first drop (David 2026-08-19):
# the NIGHTLY binary (stock yt-dlp 403s on the media fetch even when the webpage
# and player API come back fine), -4 to pin IPv4, and the bare video id after `--`
# so an id beginning with a dash is not read as a flag.
#
# NO COOKIES — David 2026-08-19: they are not needed from his home IP. The
# cookie dance in the older notes was a datacenter-IP problem, and carrying it
# over adds an hour-long expiry to a command that does not need one.
# It BREAKS on the first failure rather than walking the rest of the list into a
# limiter that has already said no.
mkdir -p drop
for id in qhHtJcXkkfg l65FZlRkWcM k7R9Omne_1Y 9qWUk9eDpTg WmCImz1fv5s CXvo1dMF1Qs \
          uJCgrG90u8A 0npOMfkAlVU mCB8n7v0MEA EN72rn5tVYI KwbAHRLJ1RY Ybg_2qbKXdA \
          IMBSR0A9nJs ieznxMQccW0 D7sbbap9lIc WQFcuBCL1F4 Qewug63GIqc Twv9FExvwSw \
          jwFOi039eeg hw9tEjYabd8 Gk7MNomOOSA Zko_JUK06vM vB8yLBR5lHs QxHsw4ZS2Ts; do
  test -f "drop/$id.mp4" && continue
  echo "=== $id"
  ./yt-dlp-nightly --remote-components ejs:npm -4 --socket-timeout 30 --retries 15 \
    -f "135/396/bestvideo[height<=480]/bestvideo" --max-filesize 99M \
    -o "drop/$id.mp4" -- "$id" || { echo "STOPPED at $id"; break; }
  sleep $((60 + RANDOM % 60))
done
git add drop && git commit -m "videos: next round" && git push origin video-drop
