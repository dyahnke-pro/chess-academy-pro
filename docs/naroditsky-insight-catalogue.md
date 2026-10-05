# Naroditsky insight catalogue — what the coach must be able to compute

Built by reading his speedrun games one at a time (David 2026-10-05: "We do this
through the entire speed run collection"). Source: the voiced notes
(`public/data/voiced-teachings.json`, ids `vc-<video>-<n>`), original prose
written from his videos. Each game adds examples and new types. Every type is a
target for a deterministic computer (G0) wired into the insight build
(`src/services/moveInsight.ts`).

Status per type: ✅ computed + spoken · 🟠 partial · 🔴 missing.

## Types

### 1. What their move changed ✅ (`moveInsight.weakenedBy` + `theirMoveChanged`, leads `positionAsk`; plan-blocked half still 🔴)
The consequence of the opponent's last move: a defender removed, a square or
pawn left weak, a plan of ours now blocked.
- G1 (Alekhine 4 Pawns): "fxe5 — but now b7 loses its last defender"; "Rhf8 leaves
  e6 weak"; "Nc6 — and the rook stops covering e6"; "Bc6 — now Na5 no longer works,
  it would drop e5"; "Nxe5+ — the king must leave d7, weakening e6".
- Compute: defenders of every piece/pawn before vs after the move (1→0 = "lost its
  last defender"); squares a moved piece stopped covering; our engine-best move
  before vs after (a plan that now fails, with the reason from moveMissed).

### 2. What they want — prophylaxis 🟠 (material threats only today)
- G1: "you don't want the rook reaching f6, so Ne3 with tempo"; "h3 first — if the
  bishop ever comes to h5, g4 is in your pocket"; "Rf4 so the rook can't come to
  f6 and f2"; "snuffing out counterplay".
- Compute: null-move engine probe → their best move if it were their turn, named
  with its purpose (infiltration square, check, attack on a piece); our move that
  takes it away.

### 3. A move's several jobs 🟠
- G1: "Kf2 — guarding the bishop, connecting the rooks, preparing Qa4"; "Nf3 guards
  e5, a piece you always want out, defers the recapture"; "Nc4 — if fxe5 you
  recapture with the knight, both eye a5 and guard e5".
- Compute: for the best move, every fact it changes — defends X, connects rooks,
  frees a line, prepares a square for another piece (that piece's new legal
  moves), stops a threat.

### 4. Why not the natural move 🟠 (opening refutedAlternative; Learn deliberation)
- G1: "rather than c5, which would gift the d5 outpost, Be3"; "the automatic Nf3 is
  a serious inaccuracy because of Bg4"; "Qa4 is tempting, but first h3"; "rather
  than grab another pawn, Rf1".
- Compute: the most natural alternative (developing / capture / the move humans
  play) vs the best, through compareTwoMoves + a named mechanism (outpost given,
  pin allowed, reply that hits).

### 5. The long-term target, then the plan 🔴
- G1: "b7 is a long-term weakness with the file open" → later "back to the old plan
  of hitting b7"; double rooks on the e-file against e6; rook to the seventh.
- Compute: weak pawns (backward/isolated/undefended) on a half-open file for us;
  squares of entry (7th rank); keep the target across moves (planMemory).

### 6. Reroute with a destination 🟠 (findWorstPlacedPiece)
- G1: "Nd2, aiming for c4 and a5"; "Bf2, building pressure on e6".
- Compute: a piece's path (2-3 moves) to a square that hits the target / an outpost.

### 7. Trades — which, and why 🔴
- G1: "better than trading queens: Rab1"; "offer a trade to shift that f6-rook";
  "Bf3 — target the bishop and offer a trade so the centre doesn't collapse";
  "recapture with the knight — no isolated pawns".
- Compute: trade offers on the board; the eval with vs without the trade; the
  defender the trade removes; recapture choices by pawn structure.

### 8. The practical verdict 🟠 (eval phrase, WDL)
- G1: "about equal — this will be a grind"; "grabbing e6 now gets murky, so play
  patiently"; "totally winning; it's just one pawn".
- Compute: eval + WDL + how forcing the position is → press / be patient / convert.

### 9. The in-between move 🔴
- G2: "you don't take the queen — the intermediate move Bxf7+, then the queens come
  off on d1".
- Compute: an obvious recapture vs a forcing move first (check/capture/threat) whose
  line nets more — compareTwoMoves on (recapture, best) when best is forcing.

### 10. An alignment to watch 🟠 (pins/skewers detected only once they exist)
- G2: "their king and rook are on the same diagonal — always be alert to that" →
  Bb4+ wins the exchange.
- Compute: enemy king/queen/rook sharing a line (file/rank/diagonal) with a square
  a piece of ours can reach next move; name the alignment before the tactic.

### 11. The pawn break you are aiming for 🟠 (pawnBreak computers exist)
- G2: "what I'm eyeing here is the e5-break" → e5 dxe5 Bb4+ wins material.
- Compute: legal and prepared breaks; the tactic/opening of lines the break unlocks.

### 12. The phase changes the rules 🔴
- G2: "in the endgame the rules are slightly different — with no queens, their
  attack isn't scary, so you casually develop"; "an endgame, so their activity
  matters less".
- Compute: queens off → king safety weighs less, king activity more; say it when
  the student's move answers a non-threat.

### 13. Technique when ahead 🔴
- G2: "up the exchange — make the rooks count, rooks love open positions" (h4 to
  pry lines); "they're helping you trade everything"; "transforming the advantage —
  give back the exchange to reach a winning pawn endgame"; "get the king into the
  game".
- Compute: material lead → trades favour us (say so on trade offers); open files for
  rooks; a give-back into a won ending (tablebase/engine on the simplified board).

### 14. The unassailable outpost 🟠 (outpost computers exist)
- G2: "the knight to e4 — a beautiful, unassailable square; they can trade their
  bishop for it, but that's good for you, you're up the exchange".
- Compute: a square no enemy pawn can attack; what trading for it would cost them.

### 15. Endgame technique 🟠
- G2: zugzwang ("every move harms their position"); pawns as "bumpers" to exhaust
  their moves; protected passer; escort the pawn; underpromote to avoid stalemate.
- Compute: zugzwang (every legal move worsens the eval), tempo counts, stalemate
  check on promotion.

### 16. What the opponent wrongly believes 🔴
- G2: "Black plays h6, thinking he's won a piece — I've foreseen this"; "dxe5,
  thinking you blundered a pawn".
- Compute: the opponent's capture that looks winning one ply deep but loses along
  the engine line — the hidden resource, named.

### Also seen (folded into types above)
- Flexibility / don't waste time: "you don't have to move the bishop immediately";
  "I don't want to waste time with h3" (3, 4).
- Bad bishop: "the bishop is biting on granite" (5, piece quality).
- A piece whose job is done: "the knight on b3 has done its job — where's a good
  square for it?" (6).

### 17. The idea behind their odd move 🔴
- G3: "the king to h2 — a weird move; maybe planning Rg1 and g4" → then "now I see
  their idea: after Bxf3 gxf3 the king is off the open file and the rook attacks
  down the g-file".
- Compute: their quiet move's purpose — the engine's continuation for them after it
  (null-move probe from our side), the file/diagonal/square it prepares.

### 18. Do it while you can (move order) 🔴
- G3: "Bg4 now — if Nc6 first, they play h3 and you'll regret it, so squeeze this in".
- Compute: a move that is good now and stops being available after their natural
  reply (the square gets covered / the pin gets prevented).

### 19. Accept a cost for a permanent gain 🔴
- G3: "Bxf3 creates such damage on their kingside that it's worth it — the
  weaknesses are permanent; manage the open g-file"; "axb6 gives doubled pawns that
  don't matter, plus the a-file".
- Compute: a trade that ruins their structure (doubled/isolated pawns, open king)
  weighed against what it gives (open file toward our king); structure deltas.

### 20. Where does the piece do more? 🟠 (pieceQuality, mobility)
- G3: "the queen on f6 or h4? Only one creates a threat — on h4 it does nothing".
- Compute: candidate squares for the same piece compared by threats created and
  squares hit (the "same piece, two squares" compare already in tacticalRead).

### 21. When to defend — count their next threat 🟠
- G3: "now the threats on g7 are serious — one more move and they're insurmountable,
  so now's the time" (Kh8); "the problem is the g-file, not their bishop".
- Compute: attackers vs defenders on the square under fire after their best
  reinforcing move; defend exactly when the count flips.

### 22. Finish what you started 🔴
- G3: "having said A you must say B — putting the queen on f6 and NOT taking on f3
  makes no sense".
- Compute: our previous move's purpose (what it attacked/prepared) still available
  → name it as the follow-through.

### Also seen in G3
- Check for in-between moves before recapturing (method → 9).
- Take first to set up the fork: "the queen takes g4 first, then Nf3+" (move order
  inside a tactic → 18).
- Practical: against cautious players keep the tension and force decisions; with
  seconds left, leave the opponent pawn moves so stalemate is impossible (15).
- Two connected passers far from their king win (15).

### 23. Who releases the tension 🔴
- G4: "a classic standoff of queens — you don't want to be the one to release the
  tension and help your opponent develop, so you won't take on e2"; G3: "against
  boring players keep the tension — force decisions".
- Compute: a mutual capture (both sides can take); who benefits from the trade
  (whose development/recapture improves) — the eval after each side takes.

### 24. Colour complexes and blockades 🔴
- G4: "h5, stopping g4 and making f5 impossible — a light-square blockade; g6 makes
  their kingside pawns immobile" → later "it weakened the dark squares, I
  underestimated that"; "e3 induces b5, fixing their pawns on light squares, so a
  bishop to b3 comes"; G1-video: "e6 with g6 played leaves the dark squares in the
  centre weak".
- Compute: pawns fixed on one colour vs the bishops left; holes of a colour around
  the king; a pawn push that fixes enemy pawns on our bishop's colour.

### Also seen in G4
- Recapture choice for structure and bishop scope: "dxe6 opens the d-file and frees
  the light-squared bishop; fxe6 would box it in" (7, 19).
- Campaign against a bad piece: "White's bishop on c3 is a bad piece — launch a
  campaign against it" (5).
- A fixed pawn as a sitting duck: double rooks, reroute the knight to f5, "d4 becomes
  a sitting duck" (5, 6).
- Build a home for a piece to free a square: "b6 and Bb7, freeing the knight to
  reach c6 — c6 is the dream" (6).
- Practical gambit defence: "hand the piece back and cash in on development";
  "drain the life out of the position" (8).
- Back-rank duty limits a rook: "keep a rook guarding the eighth — it really limits
  you" (2, 21).
- Honest self-assessment after the game: misjudgements named (the coach's review
  register).

### 25. Patterns that should occur automatically 🟠 (trapped-piece / pattern detectors)
- G5: "whenever a knight lands on g6 like this, one idea should automatically occur
  to you — shove the pawn to h5" → the knight is trapped; "two trapped pieces like
  this show the importance of a space advantage".
- Compute: a piece with no safe squares after a pawn push (trapped-piece probe on
  the board after each candidate pawn move); name the pattern ("h-pawn against a
  knight on g6").

### 26. How serious is their threat, really 🔴
- G5: "the pin isn't scary at all"; G1: "the bishop to d3 — less of a problem than
  it looks"; G4: "I don't see what the bishop threatens, so you continue the plan".
- Compute: their apparent threat (pin, attack on a piece) vs the engine's eval if we
  ignore it — say "not a real threat" when ignoring it costs nothing.

### Also seen in G5
- After winning material: keep pieces for the attack or trade down — "don't be
  dogmatic about trading everything; if the attack is a slam dunk, take it" (13).
- Conversion: attack the base of the pawn chain; "why give up pawns when you can
  just defend them"; "no need to grab more pawns — just promote"; cut the king off;
  never stalemate unless you have calculated mate (13, 15).
- A multi-job move: "Nd4 — stable, clears the way to castle queenside, and can
  eliminate the e6 bishop" (3).

### 27. A move good in every branch 🔴
- G6: "if White doesn't castle queenside, b5 costs nothing and grabs space; if White
  does, you've gained a tempo — every tempo is crucial in opposite-side castling".
- Compute: the candidate's eval against each of the opponent's main replies/plans —
  name it when it holds up in all of them.

### 28. Their king is stuck — open the centre 🟠 (king-in-centre detector exists)
- G6: "the knight back to d7 to open the centre — because White's king is stuck in
  the middle; castling queenside is easy to punish, kingside makes h4 a liability".
- Compute: a king that cannot castle safely on either side (castling rights,
  open files, pawn storms) → the break that opens lines toward it.

### 29. Finishing an attack 🔴
- G6: "when finishing an attack, don't fixate on mate — use the king's weakness as a
  springboard to winning decisive material"; "one rook to the h-file, the other to
  the b-file — division of labour"; G7: "ask which pieces aren't yet in the attack";
  "Rh3+ looks counterproductive — you lure the king to e2 for a reason".
- Compute: pieces not bearing on the king zone; the forcing line that wins material
  vs the one that mates; a check that drives the king onto a forking square.

### 30. Make the tactic work 🔴
- G7: "the Greek gift Bxh2+, Kxh2, Ng4+ doesn't work yet, because the queen on d1
  covers g4 — h5 anchors g4, preparing both the sacrifice and Ng4".
- Compute: a known pattern that fails by one defender/one square → the preparatory
  move that removes the defender or covers the square (engine: pattern works after
  the prep, not before).

### Also seen in G6–G8
- Their pawn move creates a target: "f3 weakens e3 — that pawn is now a target"; an
  odd-looking piece (Bh6) justified by it (1, 5).
- Prepare the break one more move so it doesn't leave a soft pawn (11).
- Move order inside a pawn exchange: "hxg4 first — e5 first allows gxh5" (18).
- Remove their best piece efficiently: "the knight on e5 is a launching pad against
  f7 — your first job is to remove it" (7).
- Restrict their pieces: b5 cramping their minor pieces; "a good piece on an open
  file, even if it isn't doing anything obvious" (6, 20).
- Check your own move for forks: "Kd7 walks into Bf5+ — so Kf8" (4).
- Premature: "g5 here would be a serious mistake"; "no need yet" (18, 23).
- Ignore what doesn't matter: "g4 does nothing against your real plan of b5" (26).
- "When in doubt, default to reasonable moves" (8).

### 31. Take the sting out (instead of stopping it) 🔴
- G10: "instead of physically stopping the knight to b5, take the sting out of it —
  move one of these pieces so Nb5 isn't a fork, preferably without ruining the
  placement of the pieces; Be7 would worsen the bishop, Bc5 would not".
- Compute: their threat (2) → the moves that defuse it, ranked by what they do to
  our own piece quality (pieceQuality before/after).

### 32. Don't move the attacked piece on reflex 🔴
- G10: "a lot of people have the instinct of moving the knight, but my instinct is
  to first check whether I can play Rh5 anyway — and I can, mate is unstoppable".
- Compute: a piece of ours is attacked → does our strongest move ignore it (counter-
  threat, mate, bigger capture)? compareTwoMoves(save the piece, best).

### Also seen in G9–G11
- Every opponent move has a drawback — "I saw this tactic by evaluating the drawback
  of Black's previous move"; "when a move like that is made I consider its
  drawbacks: what squares does it no longer control?" (1 — the most explicit
  statement of the type).
- No confrontation → incremental gains, don't get over-excited (a4 grabbing space,
  making b7 backward) (8).
- Keep the piece that cramps them: "you do not want to remove this knight — it
  would give Black breathing room"; "no rush, Black is paralysed" (7, 13).
- Circumstances changed: "I said you don't want to part with your bishop — that was
  then, this is now" → trade it when it ruins their structure (19).
- Trade their strongest piece for yours when you have more good pieces (7).
- The worst-case-scenario test: "even if you allowed them to do everything they
  wanted, could they attack this pawn?" (26).
- A safety move vs a needed move; offer a queen trade actively (8, 7).
- Undermine a pawn chain: a5 against b4 — "a lose-lose spot for them" (5).
- Premature push: "d5 — the cart before the horse" (4).
- Lure a piece away: "Be2 luring the knight off d2 so you check on c1 and win the
  queen" (29).

## Games read
| # | video | game | notes |
|---|---|---|---|
| 1 | 1rcEbI44WqE Master Class, Alekhine's Defense | Four Pawns, White wins in 54 (mate) | 88 |
| 2 | uVQKL83tZb0 Chess Speedrun 2065 | Ruy Lopez, Bird Defense, White wins in 54 (K+P ending) | 79 |
| 3 | DO28z1MTaC8 Master Class, Three Knights | Black wins in 44 (connected passers) | 80 |
| 4 | TYKVZpAy5Ow Sensei Speedrun, Halloween Gambit | Black wins in 61 (N+B ending) | 75 |
| 5 | rgLTiUZAWQY DYI Speedrun, Scandinavian (Portuguese) | White wins in 48 (knight trapped by h4-h5) | 73 |
| 6 | C2unZJEz01o Barry Attack vs KID | Black wins (attack, material) | 65 |
| 7 | UVJ75kdDdt8 Sensei, Delayed Alapin | Black wins (Bh2+ Bg1 attack) | 65 |
| 8 | 0ipLPOAN_m8 DYI, KID fianchetto | Black wins in 40 (queenside, mate) | 64 |
| 9 | EPS51oKRgpU DYI 5-min blitz | White wins (Nxg5 tactic, queenside squeeze) | 64 |
| 10 | cmJbc_BzTp8 Master Class, f6 vs Danish | Black wins (positional, c4 square, mate) | 64 |
| 11 | 3nyxVHwDCTY DYI, KID vs fianchetto | Black wins (queenside play, f2 attack) | 61 |
