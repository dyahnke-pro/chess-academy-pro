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

### 2. What they want — prophylaxis 🟠 (concrete threat of their last move leads `theirMoveChanged` via `detectNewThreat`; positional "what they want" still 🔴)
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

### 5. The long-term target, then the plan 🟠 (weak pawn on an open file → positionAsk improve, `findWeakPawns`)
- G1: "b7 is a long-term weakness with the file open" → later "back to the old plan
  of hitting b7"; double rooks on the e-file against e6; rook to the seventh.
- Compute: weak pawns (backward/isolated/undefended) on a half-open file for us;
  squares of entry (7th rank); keep the target across moves (planMemory).

### 6. Reroute with a destination ✅ (positionAsk improve: `findKnightReroute` / `findWorstPlacedPiece`)
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

### 9. The in-between move 🟠 (`autopilotRecapture` on Tactics; compare paths still to wire)
- G2: "you don't take the queen — the intermediate move Bxf7+, then the queens come
  off on d1".
- Compute: an obvious recapture vs a forcing move first (check/capture/threat) whose
  line nets more — compareTwoMoves on (recapture, best) when best is forcing.

### 10. An alignment to watch 🟠 (positionAsk appends `detectLatentDanger` for the student's side; theirs still 🔴)
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

### 26. How serious is their threat, really 🟠 (positionAsk: best move leaves the attacked piece → "not the real issue")
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

### 30. Make the tactic work 🟠 (Greek gift recognized: `moveInsight.greekGift`, hint withholds the square)
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

### 33. The pawn-grab safety check ✅ (moveMissed: `findTrappedPiece` on the capturing piece along the reply)
- G12: "the key question before ever taking like this — can the queen be trapped?
  List the queen's escapes, and ask whether any one move takes them all away."
- Compute: after a queen capture, the queen's safe squares; does any opponent reply
  leave it none (trapped-piece probe one ply deep)?

### 34. A piece tied to a duty (overload) 🟠 (overload detector exists?)
- G12: "that knight is tied to defending White's own queen, so the moment it moves,
  the queen falls"; G1: "Nc4 — both eye a5 and guard e5" (the duty that stops Na5).
- Compute: a piece that is the sole defender of something bigger; its moves that
  would drop it — name the duty before suggesting the move.

### 35. Your own move's drawback ✅ (moveMissed: `weakenedBy` on the student's move when the reply takes exactly that)
- G12: "Qd6 steps off the a3-e7 diagonal, dropping the guard on e7, and Ne7+ forks
  king and knight"; "d6 cuts the queen's defence of e7 — so d6 has to wait".
- Compute: weakenedBy on the student's candidate/played move → "your move leaves e7
  with no guard" — the wrong-move explanation, before the engine line.

### Also seen in G12–G14
- Pin-aware defending: "f2 is now pinned, so it no longer guards the knight" — the
  defender count must drop pinned defenders (refines 1).
- Reflexes: "whenever White keeps a bishop on e3, keep one eye on it" (Ng4 hits it);
  "Kb1 — a move you should automatically consider any time you castle long" (25).
- Calculate one step further: "after Nxe7+ Kh7 you hit two things at once" (9, 21).
- Don't drown in the sea of winning moves — "the real target is the queen on h6;
  what's in the way? your own bishop — move it usefully" (29).
- After exchanges, update your picture of the board — a common moment to blunder (8).
- Diagnose what blocks consolidation: "you'd love d6, but it drops e7 — so it has
  to wait"; "the real disease is White's two strong pieces on d5 and g5" (5, 21).
- Recapture with the pawn to anchor the attack: "gxf3 — the pawn jams their
  position and becomes an anchor point for mating ideas" (19).
- Multi-job: "f3 — preparing g4, and controlling e4 against both knights" (3);
  "Black's central control isn't necessarily good — d5 is a target" (5).
- Opposite castling: "identify the short-term threats and how each move affects the
  long-term tactical patterns" (2, 27).
- Collinear move — interpose on the line between two pieces staring at each other (31).
- Play simple when up material; don't trade automatically — a minor piece may be
  winnable (13).

### 36. Take away the escape square first ✅ (`moveInsight.escapeSquareFirst`; hint withholds move + square, leads positionAsk)
- G18: "this would be mate but for the escape square — so can I take it first? If
  your opponent isn't threatening anything, the answer is often yes" (Qc3); "that's
  how you find quiet moves".
- Compute: a check that fails only because the king has one flight square → a quiet
  move covering that square, engine-confirmed, when the opponent has no threat (2).

### Also seen in G15–G18
- Trade off the defender of their centre: "Bg4 — Black would love to trade the f3
  knight, the natural defender of White's centre" (7).
- Weak pawns on the wing they castle away from usually don't matter — except when you
  hold the centre and they're undeveloped: "you don't have forever; act now" (19, 18).
- Don't release the clamp: "do you want this exchange? No — you want d5 to keep
  clamping" (23).
- Restriction: "c3 is incredibly effective at restricting the bishop — keep it in your
  pocket" (20).
- Defensive driving: "the moment a rook landed on b2 I noted the mate threats on f2"
  (2, 21).
- A retreat that leaves a piece to its fate: "the wrong knight dropped back and the
  g7-bishop was left to its fate" (35).

### 37. Don't hand them a tempo ✅ (moveMissed: the engine's reply is a pawn push hitting your piece)
- G22: "a knight to c6 right now would let White push d5 with tempo, so you reserve it
  and start with Qa5".
- Compute: after our candidate, their pawn push that attacks one of our pieces and
  gains a move (the piece must move) — prefer the order that denies it.

### Also seen in G19–G22
- A pawn move's permanent cost: "e5 weakens the d5-square and the long diagonal" (1).
- Recapture to keep castling / avoid the queen trade: "bxc6, not dxc6" (7, 19).
- King-side pawns forward aren't automatically fatal: "pushing pawns in front of your
  king doesn't automatically get you mated" (26).
- Prophylaxis against restriction: "White wants c3 to bury your bishop, so seize the
  centre first with Bd4"; "f4 only pushes a pawn onto a dark square" (2, 24).
- The right pawn break depends on their setup: "Nc3 changes my thinking — c5 is
  stronger than e5 here"; "the blunder happened because you chose the right break"
  (11).
- Choose the capture version of a move you're making anyway: "since you're moving the
  knight anyway, grab the pawn" (3).
- Whole-board awareness: "Qd2 would drop the rook on a1" (35).
- Don't stop at one pawn while their position collapses; don't give back material by
  reflexive trading (13).
- Open a file for a rook to convert; prepare the push so it doesn't hand over a
  square (11, 18).

### 38. The position opened — hit the gas 🔴
- G24: "the centre is now fully open, so you shift from luxurious positional play to
  hunting tactics — you've invested a pawn, so you must hit the gas"; "only a couple
  of moves stand between them and consolidating, so you accelerate".
- Compute: open files/diagonals jump (structure change) + our development lead /
  material invested → say "now it's tactics, before they consolidate".

### 39. The threat is stronger than the execution 🔴
- G25: "don't just grab on f3 and e5 — keeping them tortured by the weak pawn beats
  winning it and releasing the pressure".
- Compute: a pawn we can win whose capture trades off our best piece or frees theirs
  vs keeping the pressure — compareTwoMoves(capture, keep) + the piece-quality delta.

### Also seen in G23–G26
- "Compare your checks: two similar-looking checks rarely do the same job" — his own
  words for mechanismContrast (✅ built).
- Closed centre: two broad plans — blast the centre or play a wing; hit the chain at
  its base; keep your own chain base propped (11, 5).
- Small development details decide smoothness: "Be3 before castling, so it can drop
  to f2 when the knight lands on f5" (18).
- A hole is not an invitation to jump now: "g5 is an outpost, but Ng5 lets them trade
  and fill it — later it's a transit square" (24, 6).
- Start with a move you know is good (18); trade your good bishop to shatter their
  structure "while you still can" (19).
- An exposed king forces the defenders onto vulnerable squares — go after them (29).
- Pieces with no squares get trapped — rooks too, by minor pieces (25).
- Imbalances: two minors vs a rook usually favour the rook, unless the minors are very
  active (8); don't walk the king backwards in an endgame (15).
- Intermediate moves can be positional — improve a piece before you take (9).
- "The queen is the supporting actress" — don't rush her out (20).

## From his chess.com articles (see docs/naroditsky-articles.md)
- Greek Gift: the sacrifice works through the queen + knight tandem; its four
  camouflages — it looks impossible, the knight/queen route is non-standard, the
  defence looks sufficient, it transforms into a different attack (30, 25).
- How to Avoid Blunders: before every move — double attacks and pins (DAP), recheck
  the main line, then hidden 2–3-move mates against your own king (2, 35).
- The Tactical Detector: loose pieces drop off; track transformations — what just
  became defended or undefended, new alignments, king safety shifts (1, 10).
- The Positional Threat: what they would do with a second move in a row — a trade of
  a key piece or an induced weakness; defend it or counter with something forcing
  (2, 17, 7).
- Turn Off The Autopilot: the "forced" recapture and the natural move — ask whether
  it is truly forced (9, 4).
- How To Ignore A Threat And Win: weigh the threat's true size against a faster,
  more forcing counter-threat (26, 32).
- The Art Of Maneuvering: improve the worst piece, pressure a weakness, bring
  reserves to an attack — "if one piece stands badly, the whole game stands badly" (6).
- Weak Squares? Who Cares?: a weak square matters only if a piece can reach it in
  time and it can't be challenged; worth conceding for activity or time (24, 19).
- Punishing The Pawn Grabber: develop and keep central pressure; an unjustified grab
  gives chances "in due course"; don't trust the grabber (33, 16).

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
| 12 | qhHtJcXkkfg Sensei, Accelerated Dragon | Black wins (Qxb2 grab, Bf3 anchor, Nxf2+) | 58 |
| 13 | 4_Ev1a1_2Mg Elephant Gambit | White wins (queen won) | 57 |
| 14 | _X7t6o3o6JM Jobava London vs g6 | White wins (Nxd5 discovery, Nxe7+) | 56 |
| 15–26 | _zT8aWZh2x0, mIzJ3LYZvKw, CQFSXmfxMV8, JwmxAagJ7bQ, pXBR9CxK3lQ, 3XUh57mV8a8, VeHyQWutHPQ, QVw89_6fh2Y, Zko_JUK06vM, Jt5bST3j-Cw, br2ThhGdJXU, 1zfJ7ABoh8k | insight notes only (filtered) | ~620 |

## Line audit (David 2026-10-05: "is the narration accurate to the longer line?")
`moveInsight.lineAudit.test.ts` (LINE_AUDIT=1): real puzzles, natural wrong tries,
Stockfish to depth 12, every moveMissed claim checked against the full line.
12/45 claims were wrong when the line was cut at 5 plies (material counted before the
line settled; checks unsaid) → 0/46 after reading the whole line, naming checks, and
saying a queen's worth or more as a floor.

## Full collection read — reader agents A (videos 26–80), B (80–160), C (160–end)

Not built yet (🔴) unless marked. A6 and B1 (pawn hook) are one type; C10 duplicates A7; B6 mirrors 36; B5 mirrors 26.

### A
**A1. An attack is not a plan.** 8urm 8...Qg5: hitting the queen pays only if the threat achieves something. 1PI3 10.Bxf4: not Rxf4 — it hits the queen but leaves the rook badly placed.
Compute: when a move attacks a piece, compare our attacker's pieceQuality/eval after the target's best retreat against the quiet best move.

**A2. Skip the middleman.** dowe 11.e5: no Rf1 first; e5 works right away.
Compute: the plan move is already engine-best (or within a few cp) compared with prep-then-move.

**A3. The least valuable piece for the job.** SDIQ 23.Nc7: reach e8 with the knight, not the queen. 38Qz 32...f6: defend with a pawn before tying down a piece.
Compute: among moves that reach the same square or give the same defence, rank by piece value and by what each one leaves undefended.

**A4. Provoke the commitment.** 6si_ 6.Be2 provokes ...c4, which releases the pressure on d4. cKeN 11.a4 invites ...b4, a lasting target. r7W4 12.a6 fixes ...b6 before their pawns fix yours.
Compute: the engine's expected reply is a pawn advance. Diff the structure afterwards: pressure relieved, a new fixed pawn, a new hole.

**A5. They stopped it — play it anyway?** 7f2s 12...f4: White seems to cover f4, but after exf4 gxf4 the knight must lose a tempo.
Compute: our planned push lands on a square the opponent just covered, and the engine still rates it best. Name the reply that makes the cover fail.

**A6. The pawn hook.** Gti0 15...g6 creates a hook, so h5 opens the h-file. 8wVt 7.Be3 induces ...h6 as a hook for the storm.
Compute: an enemy pawn advanced in front of its castled king that one of our pawns can contact; the lever opens a file.

**A7. Open or lock the centre to suit the wing attack.** 24yO 9...e4 and 8wVt 8.d5 close the centre to free the wing attack. Gti0 9...c5 keeps it open, since ...d5 would free their queenside attack.
Compute: from the castling sides and the central tension, compare the eval of the locking push against keeping the tension.

**A8. The retreat square that keeps your break.** RehH 9...Be7, not Ba5: from a5 the bishop gets hemmed in by b4 and ...c5 dies.
Compute: for each retreat square, test whether the pawn chase gains a tempo and whether our break stays playable.

**A9. A piece held only by a tactic.** u1ZS 10.Bd3/11.Bd2: the loose b1 bishop survives tactically, so recheck it every move.
Compute: a piece with more attackers than defenders whose capture fails tactically; flag it when the opponent's move removes that tactic.

**A10. The right piece for the hole.** gyOx 15.Bxe4: give back the bishop and keep the knight for d6 (a bishop there "bites on granite"). 9JUl: a knight on d4 controls eight squares.
Compute: for each hole, which of our pieces can reach it and how mobile each would be there. Prefer trades that keep the best occupant.

**A11. Behind in material: unbalance.** Gti0 4...Bg4: down a piece, castle on the opposite side and keep pieces on.
Compute: with a material deficit, prefer asymmetric plans (type 13 inverted).

**A12. Spend thinking time where it matters.** Nd2N 17...Qxd5: the knight recapture was fine too, so spend 10 seconds. 1671 12...Nc6: "know which decisions matter."
Compute: when the gap between the top engine moves is tiny, say "any is fine" (the inverse of the slow-down beat, using criticalityScan's gap).


### B

**B1. The pawn hook.** A pawn pushed one square in front of your castled king gives their pawns something to latch onto and open a file.
- Najdorf 8...Be7: unpin with the bishop, not ...h6, because h6 is a hook for White's g-pawn.
- Scotch 8...h6: Black made a hook, so castle long and storm with g4–g5.
- Compute: a pawn on rank 3 in front of the king (h6/g6/h3/g3) that an enemy pawn can reach and capture within ≤2 pushes, and the capture opens a file at the king.

**B2. Castling by hand.** The king lost its right to castle, so walk it to safety: Kf7, a rook to f8/e8, then Kg8.
- Scotch Gambit 10...h6: the plan is ...Kf7, ...Re8 and ...Kg8, but ...Kf7 right now fails to Ng5, so h6 comes first.
- Compute: castling rights gone and the king on the e/f-file. Search short king+rook routes to a g-file shelter, Stockfish-checked.

**B3. The useful waiting move: let them commit first.**
- 2260 15.Kb1: "chess procrastination".
- Scandinavian 11.d3: don't reveal your hand. b4 cannot be stopped, so play it later when it comes with tempo (12.b4).
- Compute: several engine top moves sit within ~20cp, and one of them is a king tuck or a quiet move with no pawn commitment, and the plan move stays available.

**B4. An empty threat.** An attack whose target just steps away gains nothing.
- Moist lesson 16.Bf4: a threat needs a purpose beyond itself.
- London 10.h3: ...Nh4 is "one-move-itis".
- Compute: after our attacking move, their best reply moves the piece to a square that is no worse (same mobility or eval). Our eval is also no better than with a quiet developing move.

**B5. The best-case test for a plan.** Even if the plan fully succeeds, does it achieve anything?
- Fantasy Caro 12...O-O-O: even if a4–a5–a6 all worked, ...b5 answers it and three tempi are wasted.
- Compute: play our plan moves while the opponent passes (null moves). If the final eval barely moves, the plan is empty. (Mirror of 26.)

**B6. Give your own piece a retreat square before it is chased** (the mirror of 36).
- Morra as Black 5...h6: a bolt-hole on h7 makes a later Nh4 harmless.
- KID 13...Nb8: ...Na5 would run into b4, so the knight goes the long way round.
- Compute: our piece can be attacked next move by a knight or pawn and has no safe square. Find a move that creates one.

**B7. Grade every piece's safety.** A piece is safe only when a pawn guards it. One defender means it can be hit. A queen always counts as loose.
- 1920 23...Bc6, not ...Bb5: c6 is pawn-guarded.
- 2260 26...Ra7: the h7-knight is guarded only by a rook, so hit that rook.
- Compute: for each piece, count defenders and note the defender type (pawn/piece/none). Flag loose or singly defended ones.

**B8. When lost, complicate.**
- Alapin piece-sac game 11.fxg7: the recovery technique is to complicate and sow doubt.
- Compute: eval below the lost threshold. Prefer near-equal moves that leave the opponent the biggest only-move gap (criticalityScan).

**B9. Force a piece onto an awkward square.**
- Scandinavian 3.Bb5+: provoking ...Bd7 cuts Black's queen off from d5.
- London 5...d6: deliberately keeps White's knight stuck on c3, where it clogs their setup.
- Compute: after a check or attack forces a block or retreat, measure the drop in that piece's mobility, or the line it now cuts between their own pieces.

**B10. Mutual pins: who breaks free first.**
- Ruy for beginners 10...h6 and 11...g5: borrow their idea, kick the pinner, and pay with loosened king pawns.
- Compute: both sides have a piece pinned to the queen. Weigh pin-breaking pawn moves against king-shelter cost.

**B11. Put the rook on the file that will open.**
- QG 16.Rad1: if ...e6 trades the pawns off, the rook is already stacked behind the queen.
- 1870 14.Re1 before f4.
- Compute: a file closed only by pawn tension that resolves in the PV. Compare rook placements by eval.


### C

**C1. A move that fails now can work later.** Recheck rejected candidates each move.
**C2. Defend with the cheapest piece.** The pawn or minor first.
**C3. Queens and rooks make bad defenders.** A heavy piece tied to a guard is wasted.
**C4. Choose the recapture.** Compare what each recapturing piece leaves behind.
**C5. Secure the loose piece before you collect.** Take only once your own loose piece is guarded.
**C6. Force a concession.** Ask a question whose every answer costs them something.
**C7. A weakness only counts if you can use it.** It must be reachable and attackable.
**C8. Which side to castle.** Weigh the pawn shelter against the opponent's open files and lever pawns.
**C9. Pin quality.** A pin to the king versus the queen, and whether it can be broken cheaply.
**C10. Close the centre before a wing attack.** Duplicates A7.
**C11. Trade one advantage for another.** Give back material to keep the initiative, and the reverse.
