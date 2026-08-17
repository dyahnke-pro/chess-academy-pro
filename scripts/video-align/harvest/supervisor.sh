#!/bin/bash
# supervisor — keep the harvest loops alive, and restart whichever has died.
#
# David: *"i hope things are running while youre just sitting there. always makes
# me nervous."* He was right to be: the loops had stopped. The downloader exits
# normally when it reaches the end of its queue file, and the bank loop can die
# on an unhandled error — both silently, and both look identical to "idle" from
# outside.
#
# So liveness is checked rather than assumed, every 2 minutes, and a heartbeat is
# written so the answer to "is it actually running" is a file anyone can read
# instead of a claim.
cd /home/user/chess-academy-pro || exit 1

while true; do
  # STAND DOWN WHILE A PUSH IS RUNNING. push-cycle pauses the loops so
  # ship-check gets a quiet box; this supervisor then saw them "down" and
  # restarted them within two minutes, so ship-check ran under full load
  # anyway and timed out — reported identically to a real test failure. Three
  # separate pushes died this way before the two scripts were reconciled.
  if [ -f /tmp/harvest-paused ]; then
    sleep 20
    continue
  fi

  # COUNT, DO NOT JUST TEST FOR ONE. `pgrep -f x > /dev/null` answers "is at
  # least one running", which is the wrong question when something else also
  # starts them: push-cycle used to restart the loops itself, so its copy and
  # this one both ran and stacked. Three downloaders were live at once, which
  # TRIPLED the request rate against a limit that was already refusing us — the
  # 429s read as YouTube tightening when they were self-inflicted. push-cycle no
  # longer restarts anything, and any surplus found here is trimmed.
  for extra in $(pgrep -f "bank-loop.sh" | tail -n +2); do kill "$extra" 2>/dev/null; done
  for extra in $(pgrep -f "ytq.sh" | tail -n +2); do kill "$extra" 2>/dev/null; done
  for extra in $(pgrep -f "trq.sh" | tail -n +2); do kill "$extra" 2>/dev/null; done

  if ! pgrep -f "bank-loop.sh" > /dev/null; then
    setsid nohup scripts/video-align/bank-loop.sh >> /tmp/bankloop.live.log 2>&1 < /dev/null &
    echo "[$(date -u +%H:%M:%S)] restarted bank-loop"
  fi
  # The downloader legitimately finishes its queue; restart it only while there
  # is still something unharvested, or it would respawn forever on an empty list.
  #
  # COUNTED THE SAME WAY THE DOWNLOADER SKIPS. If this count includes ids the
  # downloader will skip — refusals, no-games — it respawns a process that has
  # nothing to do, every two minutes, forever. The two tests have to agree.
  if ! pgrep -f "ytq.sh" > /dev/null; then
    remaining=$(node -e "
      const fs=require('fs');
      const ids=(f)=>{try{return fs.readFileSync(f,'utf8').split('\n').filter(Boolean);}catch{return [];}};
      const have=new Set([...fs.readdirSync('data/video-tracks'),...fs.readdirSync('data/video-pending')].map(f=>f.replace('.json','')));
      for (const id of ids('data/video-queues/needs-hand-geometry.txt')) have.add(id);
      for (const id of ids('data/video-queues/no-game.txt')) have.add(id);
      const q=ids('data/video-queues/naroditsky.txt');
      const onDisk=(d)=>{try{return fs.readdirSync(d).filter(f=>/\.(mp4|webm)\$/.test(f)).map(f=>f.replace(/\.(mp4|webm)\$/,''));}catch{return [];}};
      const disk=new Set([...onDisk('/tmp/vid'),...onDisk('/tmp/vid-refused')]);
      console.log(q.filter(id=>!have.has(id)&&!disk.has(id)).length);" 2>/dev/null || echo 0)
    if [ "${remaining:-0}" -gt 0 ]; then
      cp data/video-queues/naroditsky.txt /tmp/todo.txt
      setsid nohup /tmp/ytq.sh >> /tmp/ytq.live.log 2>&1 < /dev/null &
      echo "[$(date -u +%H:%M:%S)] restarted downloader ($remaining left)"
    fi
  fi

  # The transcript pull is supervised separately from the video download BECAUSE
  # IT SURVIVES A RATE LIMIT THE DOWNLOADER DOES NOT. Captions come back fine
  # while media fetches are returning 429, so tying the two together would idle
  # the half that still works for the sake of the half that does not.
  if ! pgrep -f "trq.sh" > /dev/null; then
    left=$(node -e "
      const fs=require('fs');
      const ids=(f)=>{try{return fs.readFileSync(f,'utf8').split('\n').filter(Boolean);}catch{return [];}};
      const have=new Set(fs.readdirSync('data/video-transcripts').map(f=>f.replace('.vtt.gz','')));
      for (const id of ids('data/video-queues/no-transcript.txt')) have.add(id);
      console.log(ids('data/video-queues/naroditsky.txt').filter(id=>!have.has(id)).length);" 2>/dev/null || echo 0)
    if [ "${left:-0}" -gt 0 ]; then
      setsid nohup /tmp/trq.sh >> /tmp/trq.live.log 2>&1 < /dev/null &
      echo "[$(date -u +%H:%M:%S)] restarted transcript pull ($left left)"
    fi
  fi

  # The pusher is supervised too. It died with the loops, which is the worse
  # failure of the two: the harvest would have kept running and quietly
  # accumulated work that was never committed or pushed.
  if ! pgrep -f "periodic-push.sh" > /dev/null; then
    setsid nohup bash /tmp/periodic-push.sh >> /tmp/periodic-push.log 2>&1 < /dev/null &
    echo "[$(date -u +%H:%M:%S)] restarted periodic-push"
  fi

  # Heartbeat: readable proof of life, not an assertion.
  {
    echo "heartbeat $(date -u +%H:%M:%S)  (epoch $(date +%s) — STALE IF OLDER THAN ~3 MIN)"
    echo "  bank-loop:  $(pgrep -f 'bank-loop.sh' >/dev/null && echo up || echo DOWN)"
    echo "  downloader: $(pgrep -f 'ytq.sh' >/dev/null && echo up || echo idle)"
    echo "  pusher:     $(pgrep -f 'periodic-push.sh' >/dev/null && echo up || echo DOWN)"
    echo "  transcripts:$(pgrep -f 'trq.sh' >/dev/null && echo ' up' || echo ' idle')"
    echo "  banked: $(ls data/video-pending/*.json 2>/dev/null | grep -vc by-opening)  on-disk: $(ls /tmp/vid/*.mp4 /tmp/vid/*.webm 2>/dev/null | wc -l)  transcripts: $(ls data/video-transcripts/*.gz 2>/dev/null | wc -l)  grids: $(ls data/video-grids/*.gz 2>/dev/null | wc -l)"
    echo "  uncommitted: $(git status --porcelain | wc -l)  unpushed: $(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)"
  } > /tmp/harvest-heartbeat.txt
  sleep 120
done
