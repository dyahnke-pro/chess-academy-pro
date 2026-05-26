#!/usr/bin/env bash
# Drives audit-opening-walkthrough.mjs across every masterclass opening,
# capturing per-opening stdout (tab strip, WLPP ladder, Watch narration via
# /api/tts, lesson distinctness, page errors). Batched to limit concurrent
# Chromium+Stockfish load. Logs to /tmp/sweep/<id>.log.
set -u
OUT=/tmp/sweep
mkdir -p "$OUT"
export AUDIT_SMOKE_URL=http://localhost:5173
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome

OPENINGS=$(node -e "const m=require('./src/data/opening-manifests.json');console.log(Object.keys(m).filter(k=>!k.startsWith('_')).join(' '))")
BATCH=3
i=0
for id in $OPENINGS; do
  AUDIT_OPENING="$id" node scripts/audit-opening-walkthrough.mjs > "$OUT/$id.log" 2>&1 &
  i=$((i+1))
  if [ $((i % BATCH)) -eq 0 ]; then wait; echo "[sweep] batch done ($i / done so far)"; fi
done
wait
echo "[sweep] ALL DONE — $i openings"
