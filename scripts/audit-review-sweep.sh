#!/usr/bin/env bash
# Multi-game review-audit sweep (David 2026-07-20 "run this on at least 5 games").
# Runs the uncapped real-game review audit across 5 varied games — sharp mate,
# positional IQP, sacrificial attack, a Black-student win, and a draw — and prints
# a PASS/FAIL summary. Each game uses the SAME standard (15 R-contract gates).
set -u
BASE_ENV="AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_LISTENER=1"
DIR=/tmp/review-sweep
mkdir -p "$DIR"

run () {
  local name="$1" side="$2" result="$3" pgn="$4"
  echo "───────────────────────────────────────────────"
  echo ">>> GAME: $name  (student=$side, result=$result)"
  env AUDIT_SANDBOX=1 AUDIT_PROXY="$HTTPS_PROXY" AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_LISTENER=1 \
      AUDIT_STUDENT="$side" AUDIT_RESULT="$result" AUDIT_PGN="$pgn" \
      node scripts/audit-review-real-game.mjs > "$DIR/$name.log" 2>&1
  local code=$?
  local verdict; verdict=$(grep -E "VERDICT" "$DIR/$name.log" | tail -1)
  local fails; fails=$(grep -cE "❌ FAIL" "$DIR/$name.log")
  echo "    exit=$code  ${verdict:-<no verdict — likely FATAL/timeout>}  (fail-gates=$fails)"
  grep -E "❌ FAIL" "$DIR/$name.log" | sed 's/^/      /'
}

run opera    white "1-0"     "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#"
run iqp      white "1-0"     "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d5 6. exd5 exd5 7. Be2 Be7 8. O-O O-O 9. Bg5 Be6 10. Re1 Nc6 11. Nxc6 bxc6 12. Bf3 Qd6 13. Na4 Rab8 14. c4 dxc4 15. Bxc6 Rb4 16. b3 cxb3 17. Qxb3 Rxa4 18. Qxa4 Bd5 19. Bxd5 Nxd5 20. Rad1 Qc6 21. Qxc6"
run immortal white "1-0"     "1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#"
run blackwin black "0-1"     "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. Bg5 h6 7. Bh4 g5 8. Bg3 h5 9. Nxg5 h4 10. Nxf7 hxg3 11. Nxd8 Bg4 12. Qd2 Nd4 13. Nc3 Nf3+ 14. gxf3 Bxf3 15. hxg3 Rh1#"
run draw     white "1/2-1/2" "1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3 Nxe4 5. d4 d5 6. Bd3 Nc6 7. O-O Be7 8. c4 Nb4 9. Be2 O-O 10. Nc3 Bf5 11. a3 Nxc3 12. bxc3 Nc6 13. Re1 Re8 14. cxd5 Qxd5 15. Bf4 Rac8 16. Qb3 Qxb3"

echo "═══════════════════════════════════════════════"
echo "SWEEP SUMMARY:"
for g in opera iqp immortal blackwin draw; do
  v=$(grep -E "VERDICT" "$DIR/$g.log" | tail -1 | grep -oE "MEETS STANDARD|FAILS STANDARD" || echo "NO-VERDICT")
  echo "  $g: $v"
done
