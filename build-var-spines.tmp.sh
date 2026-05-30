#!/usr/bin/env bash
b() { node scripts/build-opening-spine.mjs "$1" "$2" 2>&1 | grep -E "^\[spine\]|Error|illegal|throw" | head -2 | sed "s/^/  /"; }

echo "===== KING'S GAMBIT ====="
b kg__kieseritzky      "e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5"
b kg__bishops          "e4 e5 f4 exf4 Bc4"
b kg__modern           "e4 e5 f4 exf4 Nf3 d5"
b kg__falkbeer         "e4 e5 f4 d5 exd5 e4"
b kg__classical-decl   "e4 e5 f4 Bc5"

echo "===== EVANS GAMBIT ====="
b ev__accepted-main    "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4"
b ev__accepted-bc5     "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4"
b ev__compromised      "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3"
b ev__declined         "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6"

echo "===== SCOTCH GAMBIT ====="
b sc__main-nf6         "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5"
b sc__haxo-bc5         "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5"
b sc__max-lange        "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 O-O Nf6 e5 d5"
b sc__london-bb4       "e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bb4+"

echo "===== VIENNA GAMBIT ====="
b vi__main-nf3         "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3"
b vi__qf3              "e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3"
b vi__accepted         "e4 e5 Nc3 Nf6 f4 exf4"

echo "===== DANISH GAMBIT ====="
b da__accepted-full    "e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2"
b da__sorensen-decl    "e4 e5 d4 exd4 c3 d5"
b da__schlechter       "e4 e5 d4 exd4 c3 dxc3 Nxc3"

echo "===== SMITH-MORRA ====="
b sm__accepted-main    "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4"
b sm__accepted-d6      "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6"
b sm__alapin-decl      "e4 c5 d4 cxd4 c3 Nf6"
b sm__push-decl        "e4 c5 d4 cxd4 c3 d3"

echo "===== STAFFORD ====="
b st__d3-main          "e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3"
b st__nc3              "e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3"
b st__e5               "e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5"
b st__bc4-trap         "e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Bc4"

echo "===== MARSHALL ATTACK ====="
b ma__main-line        "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6"
b ma__bf5-modern       "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Bf5"
b ma__d4-decline       "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 d4"

echo "===== ENGLUND ====="
b en__main-qb4         "d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+"
b en__soller           "d4 e5 dxe5 Nc6 Nf3 f6"
b en__hartlaub         "d4 e5 dxe5 d6"
b en__zilbermints      "d4 e5 dxe5 Nc6 Nf3 Nge7"

echo "===== BUDAPEST ====="
b bu__alekhine-bf4     "d4 Nf6 c4 e5 dxe5 Ng4 Bf4"
b bu__rubinstein-nd2   "d4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc4"
b bu__adler-nf3        "d4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5"
b bu__fajarowicz       "d4 Nf6 c4 e5 dxe5 Ne4"

echo "===== ALBIN ====="
b al__lasker-trap      "d4 d5 c4 e5 dxe5 d4 e3 Bb4+"
b al__normal-nf3       "d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 g3"
b al__spassky-be7      "d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 a3 Be6"

echo "===== BENKO ====="
b be__fully-accepted   "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1"
b be__fianchetto       "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 Nf3 d6 g3"
b be__declined-nf3     "d4 Nf6 c4 c5 d5 b5 Nf3"
b be__modern-bxa6      "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6"
