#!/usr/bin/env bash
# Targeted card-coverage runs (David 2026-07-20: "make sure each function that
# should have fired did … pop-ups, different lines"). The 5-game sweep exercises
# cameo / why-picker / §5 / rewind / turning-point, but NOT find-shot → sequence
# (needs "student winning but missed the shot") or trap (needs a poisoned-material
# grab). These two constructed games force those data shapes so every interactive
# card gets real E2E exercise.
#   • findshot — Caro Réti trap: student (White) misses 6.Nd6# by playing 6.Nxf6+
#                → missed forced mate → find-shot card (chains to the sequence card).
#   • trap     — student (White) plays the unsound 6.Bxf7+ (SEE −2, poisoned) from
#                a level position → the trap re-decision card.
set -u
DIR=/tmp/review-sweep
mkdir -p "$DIR"

run () {
  local name="$1" side="$2" result="$3" pgn="$4"
  echo "───────────────────────────────────────────────"
  echo ">>> CARD GAME: $name  (student=$side, result=$result)"
  env AUDIT_SANDBOX=1 AUDIT_PROXY="$HTTPS_PROXY" AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_LISTENER=1 \
      AUDIT_STUDENT="$side" AUDIT_RESULT="$result" AUDIT_PGN="$pgn" \
      node scripts/audit-review-real-game.mjs > "$DIR/$name.log" 2>&1
  echo "    exit=$?  $(grep -E 'VERDICT' "$DIR/$name.log" | tail -1)"
  echo "    functions: $(grep 'DISTINCT FUNCTIONS FIRED' "$DIR/$name.log" | tail -1)"
}

run findshot white "1/2-1/2" "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ngf6 6. Nxf6+ Nxf6 7. Bg5 e6 8. O-O-O Be7 9. Nf3 O-O 10. Ne5 c5 11. dxc5 Qa5 12. Kb1 Qxc5 13. Bxf6 Bxf6 14. Nd3 Qc7 15. g3 b5"
run trap     white "0-1"     "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6 5. O-O Nf6 6. Bxf7+ Kxf7 7. Ng5+ Kg8 8. Qf3 Qe7 9. Nc3 Nd4 10. Qd1 h6 11. Nf3 Nxf3+ 12. Qxf3 Be6 13. Nd5 Bxd5 14. exd5"

echo "═══════════════════════════════════════════════"
echo "CARD-COVERAGE SUMMARY:"
for g in findshot trap; do
  echo "  $g: $(grep 'DISTINCT FUNCTIONS FIRED' "$DIR/$g.log" | tail -1 | sed 's/.*FIRED: //')"
done
