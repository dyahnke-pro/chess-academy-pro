#!/usr/bin/env bash
# Helper for the Vienna masterclass model-game sourcing (playbook §5).
# Queries the Lichess Masters explorer for top games per Vienna variation,
# filters White wins (Vienna = White opening), prints clean candidate list.
# Then on a game ID, fetches the full verified PGN from Lichess.
#
# Usage:
#   bash scripts/fetch-vienna-model-games.sh                # list candidates per variation
#   bash scripts/fetch-vienna-model-games.sh <GAMEID>       # fetch full PGN for one game
#
# Requires: curl, python3 (both ship on macOS by default).

set -euo pipefail

# Read the Lichess Personal Access Token from env (set it once per session;
# the actual token lives in per-project memory at
# ~/.claude/projects/.../memory/lichess_api_token.md). Empty token also
# works for the masters endpoint but at a lower rate-limit.
TOKEN="${LICHESS_TOKEN:-}"

# UCI move sequences for each variation's defining position.
# `play=` parameter is simpler than FEN — no URL-encoding gymnastics.
declare -a VARIATIONS=(
  "Classical (3.Bc4 Bc5)|e2e4,e7e5,b1c3,g8f6,f1c4,f8c5"
  "Gambit (3.f4)|e2e4,e7e5,b1c3,g8f6,f2f4"
  "vs 2...Nc6|e2e4,e7e5,b1c3,b8c6"
  "Frankenstein-Dracula (4.Qh5)|e2e4,e7e5,b1c3,g8f6,f1c4,f6e4,d1h5"
  "Paulsen (3.g3)|e2e4,e7e5,b1c3,g8f6,g2g3"
)

list_candidates_for() {
  local LABEL="$1"
  local PLAY="$2"
  echo "═══════════════════════════════════════════════════════════════"
  echo "## $LABEL"
  echo "── top White wins at this position (masters DB) ──"
  curl -s "https://explorer.lichess.ovh/masters?play=$PLAY&topGames=15" \
    -H "Authorization: Bearer $TOKEN" \
  | python3 -c '
import json, sys
try:
    j = json.load(sys.stdin)
except json.JSONDecodeError:
    print("  (could not parse explorer response — check your network)")
    sys.exit(0)
games = [g for g in j.get("topGames", []) if g.get("winner") == "white"]
if not games:
    print("  (no White wins in the top games here — section will self-hide)")
    sys.exit(0)
for g in games[:8]:
    w = (g.get("white") or {}).get("name", "?")
    b = (g.get("black") or {}).get("name", "?")
    y = g.get("year", "?")
    gid = g.get("id", "?")
    print(f"  {gid:>10}  |  {w} - {b}  ({y})")
print(f"  ({len(games)} White wins in topGames; first 8 shown)")
'
  echo
}

fetch_pgn() {
  local ID="$1"
  echo "═══ $ID ═══"
  curl -s "https://lichess.org/game/export/$ID.pgn"
  echo
}

if [ $# -eq 0 ]; then
  echo "Listing model-game candidates per Vienna variation..."
  echo "(All games are top-master games; only White wins shown.)"
  echo ""
  for v in "${VARIATIONS[@]}"; do
    LABEL="${v%%|*}"
    PLAY="${v##*|}"
    list_candidates_for "$LABEL" "$PLAY"
    sleep 0.3   # be polite to the masters API
  done
  echo "═══════════════════════════════════════════════════════════════"
  echo "DONE."
  echo ""
  echo "Next: pick a game ID from each section (or skip any tab where"
  echo "      no White win feels right — the section self-hides per"
  echo "      playbook §0.5). Then fetch the PGN like this:"
  echo ""
  echo "  bash scripts/fetch-vienna-model-games.sh <GAMEID>"
  echo ""
  echo "Example:"
  echo "  bash scripts/fetch-vienna-model-games.sh BfvmTiCI"
  exit 0
fi

# Argument(s) = game IDs — fetch each PGN
for ID in "$@"; do
  fetch_pgn "$ID"
done
