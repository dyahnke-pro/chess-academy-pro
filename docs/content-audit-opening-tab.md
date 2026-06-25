# Opening Tab — Content Audit (for confirmation)

_Generated 2026-06-24 from a grounded per-section audit of all 123 curated openings (42 masterclass + 81 pro). Every item is FLAGGED for David to confirm — nothing was auto-edited._

## How to read this
- **Axes:** every section judged on **Accuracy** (true vs the replayed line/FEN/data), **Relevance** (actually about THIS opening), **Non-redundancy** (earns its place vs siblings).
- **Tier 1** is mechanically re-derived from the *current* data — confirmed, fix with confidence.
- **Tier 2+** are AI-flagged, grounded findings (quoted + the data they contradict). High-confidence on the sampled set, but they are CANDIDATES for your eye, not gospel.

## Caveats (calibrate trust)
- The adversarial verify pass was killed by an API session limit; I (main loop) re-validated instead — systemic items mechanically, high items by grounding + sampling. So Tier 2 may carry some false positives.
- **Engine move-quality claims were NOT re-checked live** (no clean Stockfish CLI here). A pitfall claim like "the correct move is much better" is reasoned, not engine-confirmed — marked where relevant.
- Re-built against current `main` AFTER the parallel session's plan fixes, so already-fixed plan issues are excluded.
- Move legality + line soundness are covered by the existing 2,388 green gates — not re-litigated here.

## Spot-verification notes (my own re-checks)
Confirmed dead-on against the data: Vienna Falkbeer=Frankenstein dup; Vienna "Stanley"/"Gambit" explanations describing moves the line never plays; Sveshnikov duplicate model games + Overview "drew every game" vs a `0-1` model game; Pirc "Adams beats Kotronias" (game is Leko–Adams); Alapin White player named three ways (`mg-adams` / "Adams" / "Deep Blue"); Dutch overview "…e5 break" with no …e5 in the line.

One **partial false positive**, to show the failure mode: the Najdorf "model game tagged student-side-black, result 1-0" claim is imprecise — those `1-0` games are actually `studentSide: undefined`, and the one tagged `black` is `0-1` (student wins). The *real* issue is a gate hole (untagged White-win games on a Black opening escape the orientation check), not what the finding literally says. So treat Tier 2 wording as a strong pointer, not verbatim truth.

## Totals
- **123 openings judged**, 3 clean.
- Raw findings: **175 high / 259 medium / 148 low**.
- High findings concentrate in **model games** and **variation explanations** (accuracy: prose describing a different game/line than the one shown).

---

## TIER 1 — Mechanically confirmed against current data (20)

### Duplicate model games — CORRECTED (was 3, real count 0)
The initial "3 duplicate games" was a packet artifact — the packet stored only the first 20 plies, so different games sharing an opening+players+result looked identical. Full-PGN check (now the `contentConsistency` gate) shows **0 true duplicate games**. Reclassified:
- **sicilian-sveshnikov** `mg-lichess-gnCbmvaX` / `mg-lichess-9hRmnVXz`: two DIFFERENT games (different PGNs) with the **same overview pasted on both** → an overview-accuracy bug, handled in Phase 3, not a dedup.
- **pro-naroditsky-alapin**, **pro-naroditsky-kid**: different PGNs AND different overviews → legitimate distinct games, **not** bugs.

### Duplicate / mislabeled variation tabs (2)
- **vienna-game**: "Falkbeer Variation" and "Frankenstein-Dracula" share the identical Watch narration.
- **pro-hikaru-closed-sicilian**: "Grand Prix f4 + f5" and "vs ...g6" share the identical move line.

### Classic-Wisdom vs From-the-Books — same passage, conflicting author (6)
- **ruy-lopez**: "The Ruy Lopez is a siege, not a skirmish. Your bishop fixes …" attributed to **Capablanca, José Raúl** (Classic Wisdom) AND **Lasker, Edward** (From the Books).
- **vienna-game**: "The Vienna is the King's Gambit's patient cousin — White dev…" attributed to **Bird, H. E. (Henry Edward)** (Classic Wisdom) AND **Lasker, Edward** (From the Books).
- **four-knights-game**: "The Four Knights is the most natural opening in chess — both…" attributed to **Bird, H. E. (Henry Edward)** (Classic Wisdom) AND **Capablanca, José Raúl** (From the Books).
- **petrov-defence**: "The Petroff answers aggression with symmetry: where White at…" attributed to **Capablanca, José Raúl** (Classic Wisdom) AND **Staunton, Howard** (From the Books).
- **philidor-defence**: "The Philidor is solid and cramped — Black props up the king'…" attributed to **Staunton, Howard** (Classic Wisdom) AND **Lasker, Edward** (From the Books).
- **queens-gambit**: "The Queen's Gambit is no true gambit at all — the offered c-…" attributed to **Capablanca, José Raúl** (Classic Wisdom) AND **Lasker, Edward** (From the Books).

### Duplicate middlegame plans — two plans, identical demonstrated line (9)
- **sicilian-najdorf**: `mp-siciliannajdorf-6f3` and `mp-siciliannajdorf-main` play the same lineSan.
- **pro-gothamchess-qgd**: `mp-progothamchess-qgd-classical` and `mp-progothamchess-qgd-carlsbad-e5` play the same lineSan.
- **pro-naroditsky-kid**: `mp-pronaroKID-classical-kingside` and `mp-pronaroKID-classical-c5` play the same lineSan.
- **pro-naroditsky-alekhine**: `mp-pronaroAlek-twoknights-equality` and `mp-pronaroAlek-twoknights-trade` play the same lineSan.
- **pro-naroditsky-kia**: `mp-pronaroKIA-reti-attack` and `mp-pronaroKIA-reti-nc4` play the same lineSan.
- **pro-naroditsky-kia**: `mp-pronaroKIA-kid-transposition` and `mp-pronaroKIA-pirc-nh4` play the same lineSan.
- **pro-naroditsky-rossolimo**: `mp-pronaroRoss-nc6-maroczy` and `mp-pronaroRoss-nc6-b4push` play the same lineSan.
- **pro-gothamchess-caro-advance-white**: `mp-progothamchess-caro-advance-h4-pin` and `mp-progothamchess-caroadv-bf5-c4break` play the same lineSan.
- **pro-gothamchess-french-defense**: `mp-progothamchess-french-defense-rubinstein` and `mp-progothamchess-french-tarrasch-b5gambit` play the same lineSan.

---

## TIER 2 — High-severity AI findings by opening (99 with flagged text still present in current data)

_Ranked by # of high findings. Each: the quoted claim → the data it conflicts with → suggested fix._

### benoni-defence (4)
- **[accuracy] variations — Snake Benoni (...Bd7-a4 Maneuver)** — The explanation describes a bishop maneuver (...Bd7-a4-c2) and a knight retreat (...Na8-b6) that NEVER occur in the variation's sanLine. The line is just the ordinary Modern Benoni ...Na6-c7 knight route — no ...Bd7, no ...a4 bishop, no ...Na8-b6 anywhere. The named-after maneuver is absent from the moves it claims to teach.
  - claim: The Snake Benoni is a creative system where Black reroutes the light-squared bishop along an unusual path: ...Bd7-a4-c2 targeting White's e4 pawn from behind. The knight retreats ...Na8-b6 to support 
  - fix: Either replace the sanLine with an actual Snake Benoni line (the ...Be7/...Bd7 snake bishop path) and re-author the beats to match, or rename this tab to what t
- **[accuracy] variations — Snake Benoni (watchLearnBeats)** — The beats label the routine ...Na6-c7 knight maneuver as 'the Snake' and as 'completing the Snake.' The Snake Benoni is defined by the BISHOP path (...Bd7-a4), not this knight route — so the spoken narration misnames what the student is watching.
  - claim: Black starts the Snake manoeuvre with …Na6, the knight heading for c7 ... White contests the e-file with Re1, and Black completes the Snake with …Nc7
  - fix: Remove the 'start/complete the Snake' framing from these beats; describe the actual ...Na6-c7 regrouping, or rebuild the line/beats around a genuine snake-bisho
- **[accuracy] modelGames — mg-benoni-fianchetto** — The overview describes a g3/Bg2 Fianchetto game with ...Re8/...Nbd7 play, but the openingSan is a Bf4 Classical line (Bf4, Qa4+, Bxd6) with no g3, no Bg2, no ...Nbd7, no ...Re8. The prose contradicts both the moves and the (correct) variation tag. The id 'mg-benoni-fianchetto' also mislabels it.
  - claim: overview: 'Fianchetto Benoni — Carlsen beats Keymer from the Black side: against g3/Bg2, the …a6/…b5 break and …Re8/…Nbd7 piece play'
  - fix: Rewrite the overview to describe the actual Bf4 Classical line shown (Qa4+ Bd7, ...b5, Bxd6 Qb6), matching the variation tag; rename the id accordingly.
- **[accuracy] modelGames — mg-benoni-fourpawns** — The overview/theme claim a Four Pawns game with the ...Ng4 counter exploiting an e5-thrust, but the openingSan is a Taimanov Bb5+ line — there is no ...Ng4, no e5 push, no Four Pawns structure in the moves. The prose describes a different system than the game played.
  - claim: overview: 'Benoni Four Pawns — Topalov beats Bareev from the Black side: the …Ng4 counter and …Re8 pressure exploit the over-extended e5-thrust.' middlegameTheme: '…Ng4 counter vs the big centre'
  - fix: Rewrite the overview/theme to match the Taimanov Bb5+ line actually shown (...Nfd7 block, ...Na6 development), or swap in a real Four Pawns / ...Ng4 game; renam

### pirc-defence (3)
- **[accuracy] modelGames** — The overview names the opponent as 'Kotronias', but the game's white player is Leko. The model game is Leko–Adams; 'Adams beats Kotronias' is the wrong opponent — the card's prose contradicts its own listed players.
  - claim: Czech setup — Adams beats Kotronias from the Black side: the …c6/…d6 wall holds firm, then …b5/…e5 expands.
  - fix: Rewrite as 'Adams beats Leko from the Black side'. Also drop '…b5' (see separate finding) since the shown openingSan plays …e5 but no …b5.
- **[accuracy] modelGames** — Both the theme and the overview hang the lesson on …h6 and …c5, but the openingSan shows neither: Black plays …c6 (not …c5) and …h5 (not …h6).
  - claim: Byrne Variation — Mamedyarov beats Rublevsky from the Black side: against the Bg5 setup, …h6 and …c5 win the central fight.
  - fix: Re-describe to the moves actually played: …c6 + …Qa5 (after Bh6) and the opposite-castling …h5 storm; fix both middlegameTheme and overview.
- **[accuracy] variations** — The explanation makes …Qa5 the centerpiece of Black's defense, but the lesson beats taught for this tab never play …Qa5 — they teach a Bd3/…b5/…Nbd7/…e5/…b4/…Qc7 plan. Explanation and beats describe two different schemes for the same variation, so the prose contradicts the lesson the student watches.
  - claim: Black's defense centers on rapid queenside counterplay starting with ...c6 and the immediate ...Qa5 hitting the c3 knight. The ...Qa5 pin creates concrete threats ... while preparing ...Nbd7 and ...b5
  - fix: Align the explanation with the beats (the …b5/…Nbd7/…e5/…b4/…Qc7 plan), or re-author the beats to the …Qa5 line the explanation and sanLine describe.

### vienna-game (3)
- **[redundancy] variations[].Falkbeer Variation** — The 'Falkbeer Variation' watchLearnBeats are a verbatim copy of the Frankenstein-Dracula beats — the prose even calls the line 'the Frankenstein-Dracula', confirming the copy. Two tabs ship the same lesson under different names; one earns no place.
  - claim: "say": "The Frankenstein-Dracula begins quietly enough: Bc4, the Italian-Vienna bishop pointing at f7... But what follows is the wildest known line in the entire Vienna repertoire..."
  - fix: Delete the duplicate tab, or differentiate: the Frankenstein-Dracula tab already covers the calmer Be7 middlegame; this one should cover the Nc6/Nxa8 main line 
- **[accuracy] variations[].Stanley Variation** — The explanation names three concrete ideas (Na4 hitting the bishop, Nxb6 winning the bishop pair, a Qb3 battery) that never occur in the variation's actual moves. The board the student plays through shows a Bg5/Nd5/Nxf6 plan instead.
  - claim: "The Na4 maneuver targets the dark-squared bishop, and after Nxb6, White has the bishop pair which is a significant long-term advantage. ... The Qb3 battery on the a2-g8 diagonal creates persistent pr
  - fix: Rewrite the Stanley explanation to describe the line actually shown (Bg5 pin on f6, Nd5 probe, symmetrical castled manoeuvring), or drop the Na4/Nxb6/Qb3 senten
- **[accuracy] variations[].Vienna Gambit** — The explanation describes the Gambit ACCEPTED (exf4) with a queen trade and Bxf4/O-O-O/Nd5 plan, but the variation's sanLine and beats are the Gambit DECLINED (...d5) Bardeleben line. The prose is about a different line than the one the student plays.
  - claim: "After exf4 e5, the knight is driven back and White builds a massive center with d4. The queen exchange on d8 looks tame but White gets a tremendous endgame advantage... The bishop develops to f4 reca
  - fix: Replace the explanation with one matching the ...d5 Declined / Qf3 Bardeleben line the sanLine and beats actually teach (counter-strike d5, Qf3 hitting e4+d5, .

### pro-hikaru-nimzo-larsen (3)
- **[accuracy] modelGames** — Overview states the game year as 2019, contradicting the packet's year:2018 / event date 2018-04-04. A paying user sees a date that conflicts with the game's own metadata. The '39-move' and opponent rating 2724 are unverifiable from the packet (openingSan is only 10 moves) but the year is a hard contradiction.
  - claim: Nakamura vs Firouzja (2724), 2019. A 39-move demolition of one of the world's elite in the Nimzo-Larsen.
  - fix: Change '2019' to '2018' to match the year/event fields, and drop the unverifiable '39-move' / rating embellishments unless sourced from the actual game record.
- **[accuracy] modelGames** — Overview year 2020 contradicts the metadata year:2017 / event date 2017-01-15. Additionally the cited opponent rating '2947' is implausibly high for any human and is unverifiable from the packet. The move-claim ('recaptures with the queen', …e5) does correctly match the openingSan (d4 exd4 Qxd4).
  - claim: Nakamura vs Zhigalko Sergei (2947), 2020. Black challenges the centre with …e5 and Hikaru recaptures with the queen...
  - fix: Set the year to 2017 to match metadata and remove the unverifiable '2947' rating.
- **[accuracy] modelGames** — Overview year 2020 contradicts the metadata year:2018 / event date 2018-10-16. The '167-move marathon' move count and rating 2909 cannot be verified from the openingSan (10 moves) and the year is a direct contradiction.
  - claim: Nakamura vs Nihal Sarin (2909), 2020. A 167-move marathon in the double-fianchetto Nimzo-Larsen...
  - fix: Correct the year to 2018 and drop the unverifiable '167-move' / rating claims unless backed by the full game record.

### pro-ericrosen-london (3)
- **[accuracy] modelGames** — The overview describes the Ne5 + Bd3 battery plan, but the actual game contains NO Ne5 and NO Bd3. White instead plays Qf3 and grabs the b7-bishop (Qxb7) into a sharp tactical melee. The prose describes a completely different game than the moves show.
  - claim: A win over a 2952 against the …e6 wall: Ne5 and the Bd3 battery aim at h7, and the quiet London becomes a direct assault on the king.
  - fix: Rewrite the overview to describe what actually happened (the Qf3/Qxb7 queenside grab and ensuing tactics), or replace this game with one that genuinely shows th
- **[accuracy] modelGames** — Triple mismatch. (1) The overview claims the …c5/…Qb6 line with the Na3-Nc4 reroute, but the moves contain no …Qb6, no Na3 and no Nc4. (2) White captures dxc5 and fianchettoes Bg2 — this is not even a London (no Bf4). (3) The variation field is tagged 'vs …d5 Classical', which also does not match the …c5 overview OR the moves.
  - claim: A win over a 2822 in the …c5/…Qb6 line — the Na3-Nc4 reroute neutralises Black's aggression and Rosen converts the better structure.
  - fix: Either retag/rewrite to match the actual game (a dxc5 / g3 line, which arguably doesn't belong in a London packet), or swap in a real …c5/…Qb6 game showing the 
- **[accuracy] modelGames** — The overview promises queenside castling and an h4-h5 storm against a fianchetto. The moves show the OPPOSITE: White castles kingside (O-O), plays g3/Bg2 (a fianchetto of its own), there is no O-O-O, no h4, no h5, no Bf4, and Black never fianchettoes (…Be7, …e5, no …g6). Every concrete claim in the overview is contradicted by the moves.
  - claim: A win over a 3056 in the e4 attacking hybrid: full centre, queenside castling, and an h4-h5 storm that rips open the fianchettoed king.
  - fix: Replace with a genuine d6/g6 game featuring O-O-O and h4-h5, or rewrite the overview to match this kingside-castling KIA-style game (which doesn't illustrate th

### italian-game (2)
- **[accuracy] variations[0] Giuoco Piano: Main Line with Nc3 — watchLearnB** — The lesson beats play 9.Bd3 and 9...O-O and explicitly condemn Ba3 as a blunder hanging the bishop to ...dxc4 — yet the variation's sanLine and finalFen play exactly Ba3 dxc4. The Watch line teaches the opposite move from the line the variation actually stores. A user watching the beats then replaying the line gets two contradictory 9th moves.
  - claim: Note the precise order: the greedy Ba3 here would leave the c4-bishop hanging to …dxc4, so White saves the bishop first.
  - fix: Pick one move and make beats + sanLine + finalFen agree. Either rewrite the sanLine to '...d5 Bd3 O-O' to match the beats, or rewrite the beats to teach the Ba3
- **[accuracy] variations[4] Italian: Hungarian Defense — explanation** — White has neither doubled e-pawns nor an open f-file on this line; White's real edge here is simply being a clean pawn up. The named structural advantages are fabricated for this position.
  - claim: The doubled e-pawns and open f-file for White provide lasting pressure
  - fix: Replace with the true assessment: White is a clean pawn up with a centralised queen and easier development; remove the doubled-e-pawn / open-f-file claim.

### sicilian-sveshnikov (2)
- **[accuracy] overview** — The overview's own packet contradicts it: 'drew every game' is false when a Caruana-Carlsen 2018 game in the same packet is a decisive Black win. A paying user reading the overview then opening the model game finds a contradiction.
  - claim: Carlsen drew Caruana every game with Black using the Sveshnikov in their 2018 World Championship match in London — cementing its elite status.
  - fix: Soften to the verifiable claim, e.g. 'Carlsen leaned on the Sveshnikov as Black against Caruana in their 2018 World Championship match' — drop the absolute 'dre
- **[accuracy] middlegamePlans** — A specific game attribution ('Carlsen outplayed Nepomniachtchi from here') is attached to the plan's terminal position but is unsupported by any artifact in the packet — an invented/uncheckable name-drop in user-facing narration.
  - claim: …Be7 develops; the bishop can later challenge or trade White's d5-knight with …Bg5 or …Nxd5. Black has the full Sveshnikov ... — Carlsen outplayed Nepomniachtchi from here.
  - fix: Remove the Nepomniachtchi attribution, or replace with a position description; only cite a game that exists in modelGames[].

### london-system (2)
- **[accuracy] variations — London: Nh4-f5 Knight Maneuver** — The variation is NAMED for and explained as an Nh4-then-f5 knight maneuver with a Qc2/Bd3 battery, but its own line never plays Nh4 or Nf5 — the knight goes Ng3-f3-e5 and then BACK to f3 — and the queen never reaches c2 (stays on d1). The centerpiece idea the section is built around does not occur on the board it shows.
  - claim: This sophisticated regrouping maneuver sends the knight to h4 and then f5, where it becomes a dominating piece pressuring e7, d6, and g7... Combined with the battery of Qc2 and Bd3 aimed at the kingsi
  - fix: Either re-anchor the sanLine to a line that actually executes Nh4-Nf5 with Qc2, or retitle/rewrite the explanation to describe what the shown line really does (
- **[accuracy] variations — London vs Grunfeld Setup** — The explanation cites three concrete features — an Nh4 maneuver to f5, a ...e5 break, and a Qb3 move pressuring b7/d5 — none of which appear anywhere in the variation's sanLine. The knights are on d2 and f3, there is no ...e5, and the queen never leaves d1. A paying user replaying the line sees none of the described play.
  - claim: The Nh4 maneuver eyes the f5 square, a powerful outpost in this pawn structure. After Black's ...e5 break, the central exchanges lead to a position where White's bishop pair and better pawn structure 
  - fix: Rewrite the explanation to match the actual moves (quiet completion vs the fianchetto: Be2, O-O, c3, Nbd2, with ...Nd7 inviting an exchange on c5/in the centre)

### dutch-defence (2)
- **[accuracy] modelGames** — The overview and theme advertise the '…e5 central break / central counterstrike,' but the openingSan never plays …e5 (and never plays dxe6). The line instead ends with the …Ne4/…fxe4 cramp motif. The prose describes a different plan than the moves show.
  - claim: Leningrad …e5 break — Caruana beats Kramnik from the Black side, meeting White's space with a central counterstrike. (middlegameTheme: 'The …c6 and …e5 central break in the Leningrad')
  - fix: Either retheme this game to the …Ne4/…fxe4 cramp it actually plays, or replace the openingSan with a game that reaches the …c6/…e5 break it is tagged with.
- **[accuracy] modelGames** — The overview/theme claim the …Qe8 reroute and …b5 break, but the openingSan shows the queen going to e7 (not e8), no …b5, and a Bg5/Bxf6 exchange line. The signature manoeuvre the prose names never occurs in the shown moves.
  - claim: Ilyin-Zhenevsky — Speelman beats Illescas from the Black side, the …Qe8 reroute and …b5 break giving play across the board. (middlegameTheme: '…Qe8 kingside reroute plus the …b5 queenside break')
  - fix: Replace with a game that actually features …Qe8 and the …b5 break, or rewrite the overview/theme to describe the …Bxf6/…Qe7 line that the openingSan shows.

### semi-slav (2)
- **[accuracy] variations › Botvinnik Variation Deep › explanation** — The material description is simply wrong. There is no exchange given anywhere (both sides keep 2 rooks). White sacrificed a knight (Nxg5) and won it back (exf6), netting two pawns; at the terminus White is actually UP a pawn, not Black up 'two pawns and a piece for the exchange.' The explanation also contradicts its own beat narration on the same line.
  - claim: Black grabs two pawns and a piece for the exchange, creating a wildly unbalanced position.
  - fix: Rewrite to match the board and the beat: 'White sacrifices a knight with Nxg5 for two pawns and a powerful attack; Black has an extra piece in the resulting imb
- **[accuracy] modelGames › mg-semislav-botvinnik › overview** — Winner is named backwards. 0-1 means Black won, and Kramnik is White. It was Shirov (Black) who beat Kramnik. As written it credits the loser and contradicts studentSide=black (the game must showcase Black winning).
  - claim: Botvinnik — Kramnik beats Shirov from the Black side: the wild …dxc4/…b5/…Bb7 gambit complex, navigated to a winning king-hunt.
  - fix: 'Botvinnik — Shirov beats Kramnik from the Black side: the wild …dxc4/…b5/…Bb7 gambit complex, navigated to a winning king-hunt.'

### kings-indian-defence (2)
- **[accuracy] variations[Saemisch Variation] — watchLearnBeats[3]** — In this line White's light bishop sat on f1 (it was never developed), so Nxf1 captures a BISHOP, not a rook — White's rooks are on a1/h1 in the final FEN with castling rights KQ intact. Black's compensation is a pawn (g3) plus TWO BISHOPS (f1 and e3) for the queen, not 'a rook and two minor pieces'. Also there is only ONE black knight (it ended on e3; the other knight is still on b8), so 'the f1-knight and e3-knight' describes a nonexistent second knight.
  - claim: g3 Nxg3! and the combination rolls — Qf2 …Nxf1 snaffles the rook, Qxh4 …Nxe3 and Black emerges with a rook and two minor pieces plus a wrecked white kingside for the queen. ... the f1-knight and e3-kn
  - fix: Rewrite to: 'Qf2 …Nxf1 grabs the bishop, Qxh4 …Nxe3 — Black has a pawn and two bishops, plus a shattered white kingside, for the queen. The engine rates it roug
- **[accuracy] modelGames[mg-kid-main]** — The openingSan shows White trading on e5 (dxe5 dxe5) and an immediate QUEEN TRADE (Qxd8 Rxd8) reaching an open-center queenless middlegame on move 8. There is no locked center and no …f5/…f4/…g5 pawn-storm structure — the overview/theme describe the exact opposite of what the game's moves show.
  - claim: overview: 'KID Classical — Firouzja beats Carlsen from the Black side: the …f5/…f4/…g5 kingside avalanche crashes through against White's queenside play.' (middlegameTheme: '…f5/…f4/…g5 kingside storm
  - fix: Either retag this game's theme to the queenless …e5/open-center endgame it actually reaches (and rewrite the overview accordingly), or replace it with a game th

### grunfeld-defence (2)
- **[accuracy] modelGames[].mg-grunfeld-russian** — The overview reverses the winner. Kasparov is White; the game is 0-1, so Leko (Black) beat Kasparov. The prose says 'Kasparov beats Leko from the Black side', which is doubly wrong — Kasparov was White and Kasparov lost. A paying user is told the wrong player won and the wrong color.
  - claim: Russian System — Kasparov beats Leko from the Black side: the …a6/…b5 Hungarian plan against Qb3
  - fix: Rewrite to 'Leko beats Kasparov from the Black side' (or 'Black beats Kasparov, Garry — 0-1'). Keep the …a6/…b5 Hungarian-plan description, which matches the op
- **[accuracy] variations[].Taimanov Variation (f3)** — The variation is named '(f3)' and the explanation repeatedly centers on an f3 pawn, but no f3 is ever played in the line — it's a Bc4/Ne2 setup. It also cites a …Be6-a2 maneuver that never occurs (the bishop goes to d7). Both the name and the explanation describe a different line than the moves shown.
  - claim: The Taimanov with f3 builds a strong pawn center and supports e4 permanently. ... The f3 pawn shore up the center but weakens the kingside slightly ... the ...Be6-a2 maneuver creates tactical complica
  - fix: Either rename/relabel to match the actual Bc4/Ne2 Classical line and rewrite the explanation (drop all f3 and …Be6-a2 references, describe …Bd7 + …Rc8 c-file pr

### budapest-gambit (2)
- **[accuracy] variations[0] Adler** — This line never plays ...Bf5; Black's light-squared bishop is still on its home square (c8) at the final position. The narration places a black bishop on f5 that does not exist in this variation.
  - claim: The bishop on f5 controls key light squares while both rooks activate on central files.
  - fix: Remove the f5-bishop claim. Describe the actual final picture (knight on e5, bishop on c5, undeveloped c8-bishop still to come), e.g. 'the knight is strong on e
- **[accuracy] variations[5] Alekhine with Bc5** — The explanation lists ...Bf5 as one of Black's developing moves, but this variation plays ...Re8, not ...Bf5. The light bishop is never developed in the line; the explanation contradicts both the sanLine and the variation's own Watch beat.
  - claim: Black develops naturally with d6, O-O, and Bf5 obtaining a harmonious position with no structural weaknesses.
  - fix: Replace 'Bf5' with 'Re8' to match the line: 'Black develops naturally with d6, O-O, and Re8 on the half-open e-file.'

### pro-gothamchess-scandinavian (2)
- **[accuracy] variations** — The c3-knight is NOT pinned to the e1-king: White's Bd2 interposes on the diagonal (a5-b4-c3-d2-e1), breaking any pin. There is no pin at this position.
  - claim: 8.Qe2 Bb4! — there's the pin and attack: Bb4 hits Nc3, which is pinned by Qa5 against the king on e1.
  - fix: Drop 'pinned by Qa5 against the king on e1.' Reframe as the beat already does: '…Bb4 leans on c3; …Bxc3 doubles White's queenside pawns.' No pin is present once
- **[accuracy] keyIdeas** — Repeats the false 'Qa5 pins the c3-knight' claim and overstates it as a material-winning pin-and-attack. With Bd2 on the board the c3-knight is defended (Bd2, Qe2, b2) and unpinned; Bxc3 wins no material, only doubles pawns.
  - claim: c6 ... prepares …Bb4 hitting the c3-knight WITH the queen on a5 pinning it — a pin-and-attack combo that wins material if White isn't careful.
  - fix: Match keyIdea #1's careful conditional, or recast as 'pressures c3; …Bxc3 inflicts doubled pawns' rather than 'pinning it ... wins material.'

### pro-gothamchess-ponziani (2)
- **[accuracy] traps** — The named winning move (Qa4+) is illegal as a check and the tactic it promises ('winning the e4-knight') does not exist on the board. A paying user is taught a forced win that isn't real.
  - claim: After 3…Nf6 4.d4 Nxe4?? 5.d5! the c6-knight has to move (no defender), but wherever it goes (5…Ne7 or 5…Nb8), White plays 6.Qa4+ winning the e4-knight. Pure pin-and-fork tactics from move 5.
  - fix: Remove this trap or rewrite it to the actual Ponziani 4...Nxe4 refutation (e.g. 5.d5 Ne7/Nb8 and the follow-ups that genuinely regain/win material, per the line
- **[accuracy] keyIdeas** — Both halves of the tactical mechanism are false: d5 does not attack the e4-knight, and Nc6 was never a defender of e4. This is the same fabricated tactic that powers the bad trap entry.
  - claim: Then 4.d4! and if 4…Nxe4 5.d5! kicks the c6-knight AND attacks the e4-knight (since it's no longer defended by Nc6).
  - fix: Drop 'AND attacks the e4-knight (since it's no longer defended by Nc6)'. Keep only the true claim that 5.d5 kicks the c6-knight, and describe the real way White

### pro-naroditsky-alekhine (2)
- **[accuracy] commonMistakes** — The repertoire's own main line plays …dxe5 here and praises it, yet this Common Mistake brands the same move in the same position as a blunder ('…dxe5?') and prescribes …Nb6 instead. A user is told the headline move is both correct and wrong.
  - claim: After Nf3, the immediate …dxe5? grabs the wedge pawn but loses the knight's outpost: Nxe5 with active piece play for White and our knight on d5 is loose. The correct move is …Nb6
  - fix: Delete this mistake entry, or re-anchor it to a DIFFERENT position/move order where …dxe5 is genuinely premature (e.g. before …d6 / before the wedge is supporte
- **[accuracy] traps** — …Bg4 is described as pinning 'the f3-knight,' but there is no knight on f3 in this line (White's only knight is on c3). The promised 'forced' material win rests on a piece that isn't on the board.
  - claim: After e5 Nd5 d4 d6 c4? Nb6 Nc3 Bg4! pins the f3-knight to the queen and wins material.
  - fix: Either correct the line to include Nf3 before …Bg4 (e.g. …c4 Nb6 Nf3 Bg4), or rewrite the trap to name the actual target on this move order; verify the refutati

### pro-gothamchess-closed-sicilian (2)
- **[accuracy] keyIdeas** — There are NO doubled pawns. On b5 a KNIGHT captured (Nxb5), not a pawn — Black's structure is untouched. Black's pawns in the finalFen are a6,b7,d6,e7,f7,g7,h7, all single. The 'doubled a-pawns' weakness is fabricated (a confusion with the Rossolimo Bxc6 structure), and it's billed as the idea that 'decides' the whole repertoire.
  - claim: Bb5 + the knight exchange on b5 leaves Black with doubled a-pawns and a structural weakness.
  - fix: Remove the doubled-pawn claim. The real positional edge here is the bishop-for-knight trade plus central space after Qxd4 — state that instead.
- **[accuracy] variations** — Same false claim as keyIdea #2: no doubled a-pawn exists in the line. The variation explanation hangs its entire strategic thesis ('the weakness that decides') on a pawn structure that isn't on the board.
  - claim: The doubled a-pawn on Black's side is the long-term weakness that decides — Black's defence must keep pieces active or get slowly outplayed.
  - fix: Re-author around the actual imbalance (White's space/development vs Black's bishop pair with no targets), which the watchLearnBeats already describe correctly.

### pro-carlsen-queens-pawn (2)
- **[accuracy] modelGames (mg-pro-carlsen-queens-pawn-2)** — The overview describes a Catalan with a decisive g2-bishop, but this game is a Grünfeld Exchange with White's big e4/d4 centre and bishops on b5/e3. There is no g2-bishop and no Catalan structure anywhere in the line — the prose contradicts the moves outright.
  - claim: a Catalan-flavoured grind where the g2-bishop quietly decides the game
  - fix: Rewrite the overview to the actual game: the Grünfeld Exchange / big-centre line (e4 + d4 vs ...g6, the Bb5+ and Be3 development pressing Black's queenside). Dr
- **[relevance] modelGames (mg-pro-carlsen-queens-pawn-2)** — The game is tagged to the 'vs King's Indian g6' variation but it didn't play a King's Indian — Black committed to ...d5 (Grünfeld), a structurally different opening. A user clicking the KID tab gets a Grünfeld game.
  - claim: "variation": "vs King's Indian g6"
  - fix: Re-tag to a Grünfeld/anti-Grünfeld variation if one exists in the packet, or replace mg2 with a real King's Indian game (...d6/...e5, e.g. the structure of the 

### pro-aman-ruy-lopez (2)
- **[accuracy] modelGames** — A templating leak ships raw 'undefined (undefined)' into user-facing model-game overviews across all 8 games — a paying user sees broken placeholder text.
  - claim: a bullet win over undefined (undefined) in 2026
  - fix: Populate the opponent name/rating from the source PGN, or rephrase the overview to omit the opponent when unknown (e.g. 'a 2026 bullet win in the Closed Morphy'
- **[accuracy] modelGames** — All three Morphy model-game overviews promise the 'Ba4-Bb3-Bc2 reroute and the big d4 break', but none of the three games actually play Bc2, and two of them play d3 rather than the d4 break. The overview describes the variation theme, not the game it's attached to.
  - claim: Watch the slow Closed-Ruy squeeze, the Ba4-Bb3-Bc2 reroute, and the big d4 break.
  - fix: Rewrite each overview to describe what that specific game's openingSan actually does (game 0: an early d4-d5-d6 space grab with the bishop staying on a4; games 

### pro-aman-french-white (2)
- **[accuracy] modelGames** — All nine model-game overviews ship an unresolved data placeholder for the opponent name/rating ('over undefined (undefined)'). A paying user reads 'over undefined (undefined)' as a broken string.
  - claim: a bullet win over undefined (undefined) in 2026
  - fix: Resolve the opponent name+rating from the source PGN, or drop the 'over <opp> (<rating>)' clause entirely when unknown.
- **[accuracy] modelGames** — This game's overview promises the doubled-pawn bishop-pair structure and the h4-h5 storm, but the game played Bd2 then recaptured Bxc3 (bishop, not pawn) — there are NO doubled c-pawns and h4 is never played. The promised theme contradicts the moves.
  - claim: Watch the e5 clamp, the bishop pair, and the h4-h5 kingside storm.
  - fix: Either pick a game that actually shows the bxc3 + h4-h5 plan, or rewrite this overview to describe the Bd2/dxc5 structure it actually plays.

### pro-carlsen-closed-sicilian (2)
- **[relevance] modelGames** — This game is an Open Sicilian misattributed to the Closed/Grand Prix repertoire and tagged variation 'vs …d6'. It does not demonstrate this opening at all. The overview's 'Closed Sicilian' label and 'the f5 break opens lines' are false — the only f5 here is Black's …f5, and there is no White f4-f5 Grand Prix structure.
  - claim: "Carlsen vs Nepomniachtchi,I (2766), 2022 — Closed Sicilian: a model Closed Sicilian where the f5 break opens lines to the king." openingSan: "e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 f5 Bb2 Bg7 O-O-O 
  - fix: Remove MG2 from this opening's modelGames (it belongs to an Open Sicilian build), or replace it with a real Carlsen Nc3+f4 Grand Prix win.
- **[relevance] modelGames** — Despite the Bb5+ intro, this game transposes into a full Open Sicilian (d4/Nxd4) — exactly the 'Open theory' the repertoire claims to sidestep. Calling it 'the anti-Sicilian sidestep paying off' contradicts its own moves, and tagging it 'vs …d6' Grand Prix is a misattribution.
  - claim: "Carlsen vs Vachier Lagrave,M (2763), 2021 — Closed Sicilian: the anti-Sicilian sidestep paying off with a direct mating attack." openingSan: "e4 c5 Nc3 d6 Bb5+ Bd7 Bxd7+ Qxd7 Nf3 Nc6 d4 cxd4 Nxd4 e6 
  - fix: Remove MG3 or re-source a genuine Nc3/f4 Closed-Sicilian Carlsen win; do not describe a d4-Open-Sicilian game as the anti-Sicilian sidestep.

### pro-carlsen-kings-gambit (2)
- **[accuracy] modelGames** — The overview names the Kieseritzky, but the game's openingSan plays 3.Nc3 (the Mason/Three Knights King's Gambit) — it never plays Nf3/…g5/h4/…g4/Ne5, which IS the Kieseritzky. White even recaptures on f4 with Bxf4 rather than maintaining the Kieseritzky outpost. The variation tag is correctly null, but the prose misattributes the line.
  - claim: Carlsen vs Martinez Alcantara,Jose Eduardo (2644), 2025 — King's Gambit: the Kieseritzky attack in full cry, the pawn sacrifice fully justified.
  - fix: Replace 'the Kieseritzky attack in full cry' with a description matching the actual line, e.g. 'the 3.Nc3 King's Gambit with d4 and Bxf4 — recapturing the pawn 
- **[accuracy] modelGames** — The overview asserts White 'keeps the extra pawn,' but at the end of the shown openingSan White is materially DOWN, not up — Black has just grabbed the c3-pawn with …Nxc3. The claim is the opposite of what the line demonstrates.
  - claim: Carlsen vs Abund (2872), 2023 — the Falkbeer — White meets the counter-gambit correctly and keeps the extra pawn.
  - fix: Either drop the 'keeps the extra pawn' claim (the result is still 1-0, so frame it as 'meets the counter-gambit correctly and outplays Black from a roughly bala

### caro-kann (1)
- **[accuracy] middlegamePlans / mp-carokann-advance** — The FEN is the CLOSED Advance chain (Black pawn still on c6, White pawns on c3+e5 supporting d4): the c-file is NOT open, there is NO black knight on c6 (it's a pawn; the knight is on d7), there is NO queen on b6 (queen is on d8), and d4 is NOT isolated. The overview describes a different Advance structure (the variation's …cxd4 cxd4 IQP line). The plan's own annotations correctly teach the …f6 break for this closed position, so the move-data is right — only the overview prose is mismatched.
  - claim: Black has reached the Caro Advance tabiya after …c5 and …cxd4 cxd4: the c-file is fully open and every black piece converges on White's d4-pawn — the knight on c6, the queen on b6.
  - fix: Rewrite the overview to the actual position: closed Advance chain (White's e5/d4 pawn wedge with c3 support), Black's plan is the …f6 break against the e5 head 

### scotch-game (1)
- **[accuracy] variations — Scotch: 4...Qh4 (Steinitz Variation)** — The explanation asserts 'Black grabs the e4 pawn,' but in the variation's own canonical line the e4 pawn is never captured — it sits on e4 in the finalFen and the queen is still on h4. The claim describes a different continuation than the one the variation actually stores.
  - claim: The critical line continues with Bb4+ c3 Ba5 and Black grabs the e4 pawn.
  - fix: Either change the explanation to match the stored line (after c3 Ba5 the e4-pawn is NOT taken; Black retreats the bishop) or change the variation's sanLine/fina

### sicilian-dragon (1)
- **[accuracy] overview** — Two factual errors that contradict the packet's own cited Wikipedia source: (1) the originator per the source is Louis Paulsen, not Bird, who merely played it frequently; (2) Bird is called a 'Russian master' — the source calls Paulsen German and never makes Bird Russian (Bird was English). A paying user fact-checking the history sees the overview disagreeing with the app's own definition card on the same screen.
  - claim: Pioneered by Russian master Henry Bird in 1880, the Dragon became Black's main aggressive Sicilian weapon for a century.
  - fix: Rewrite to match the packet source: e.g. "The modern Dragon was originated by German master Louis Paulsen around 1880 and popularized by Henry Bird that decade.

### sicilian-najdorf (1)
- **[accuracy] modelGames** — This is a Black opening; a model game tagged studentSide black with result 1-0 showcases the student's side getting beaten, the opposite of what a model game should teach. (mg-lichess-6ra0xjZ4 Carlsen-Grischuk 1-0 in the Adams Attack 6.g3 is the same problem — White wins, Black loses.)
  - claim: "white": "Carlsen, Magnus", "black": "Ding, Liren", "result": "1-0", "studentSide": "black", "variation": "Najdorf: English Attack (6.Be3 Main Line)"
  - fix: Replace both 1-0 games with real games where Black (the Najdorf side) wins, or retag them as illustrative/cautionary rather than 'model' games.

### sicilian-alapin (1)
- **[accuracy] modelGames** — The white player is given three different ways: id 'mg-adams', overview 'Adams', white-field 'Deep Blue'. The record is internally incoherent about who Black even played, on top of the result contradiction. Looks like a mis-stitched/auto-generated entry.
  - claim: "id": "mg-adams-sicilian-alapin", "white": "Deep Blue (Computer)", "event": "Deep Blue vs Kasparov Match..." ... overview: "neutralizing Adams' central play"
  - fix: Pick one real game with consistent white/black/result/event/id, hand-author the overview to match, and ensure studentSide=black corresponds to a Black win.

### evans-gambit (1)
- **[accuracy] overview** — The overview describes the Kasparov-Anand game as a '25-move kingside attack' and locates the match 'at Riga', but the packet's own model game and Lasker plan describe the SAME game as a positional grind from a small edge, and tag the event as the PCA World Championship (which was in New York, not Riga). The headline overview contradicts the packet's other artifacts.
  - claim: Garry Kasparov famously revived it at the highest level in his 1995 match against Anand at Riga — beating Anand in a 25-move kingside attack.
  - fix: Change to 'revived it against Anand in their 1995 PCA World Championship match in New York' and drop '25-move kingside attack' — describe it as recovering the p

### reti-opening (1)
- **[accuracy] variations[] — Reti: Reti Gambit** — There is no Bg5 and no Qd8 anywhere in this line. White's dark-squared bishop goes to e3 (per the finalFen), not g5; Black's queen sits on d4, never retreating to d8. Both claimed moves are fabricated — the GothamChess 'Bg5 pins the knight' class of board-inaccurate narration.
  - claim: The Bg5 pin creates immediate tactical pressure, and Qd8 costs Black another tempo to regroup.
  - fix: Rewrite to the actual position: 'Be3 challenges the centralised black queen on d4 and develops with tempo; Black must spend a move stepping the queen aside, lea

### english-opening (1)
- **[accuracy] commonMistakes** — The stated refutation is false. After Nxe5 ...Nxc3 White simply replays bxc3 (the b2-pawn recaptures) and is UP a pawn — there is no material-winning fork. Nxe5 actually fails because the c6-knight recaptures with ...Ncxe5, leaving White down a knight for a pawn. The named tactic (...Nxc3 forking the queen and winning material) does not occur on this board.
  - claim: Grabbing the pawn with Nxe5 walks into ...Nxc3! — the d5-knight forks the queen and White loses material.
  - fix: Rewrite the explanation to the real reason: 'Nxe5?? loses a piece to the simple recapture ...Ncxe5 (or ...Nxe5) — White is down a knight for a pawn. Just fianch

### alekhine-defence (1)
- **[accuracy] variations — Two Pawns Attack** — The Watch/Learn beats teach a cxd6 + …g6/…Bg7/…e5 fianchetto line, but the variation's stored sanLine/finalFen is an exd6 + …Be7/…Bf5/…d5/…Nc4/Bxc4/Qa4 line. The lesson the user watches does not match the line (and final position) the tab claims to teach — two different variations packed under one tab.
  - claim: Beat 2: "…exd6 …cxd6 trades off White's spearhead and defuses the space advantage; Black fianchettoes …Bg7" (moves: "...d6 exd6 cxd6 Nc3 g6 Nf3 Bg7 Be3 O-O"); Beat 3: "the active g7-bishop, the g4-pin
  - fix: Make the beats and the sanLine agree: either rewrite the beats to follow the exd6/…Be7/…Bf5/Qa4 sanLine, or change the sanLine/finalFen (and name) to the cxd6 f

### petrov-defence (1)
- **[redundancy] classicWisdom / fromTheBooks** — The exact same 101-word passage is shipped twice — once as 'Classic Wisdom' attributed to Capablanca (PART II) and once as 'From the Books' attributed to Staunton's Blue Book. Two sections present the identical text as if from two different authors. A paying user sees the same paragraph in two places under two names.
  - claim: The Petroff answers aggression with symmetry: where White attacks the king's pawn, Black does not defend it but counterattacks White's in turn. ... The Petroff is a fortress, not a battering ram — and
  - fix: Keep the passage in ONE section with ONE correct attribution; delete or replace the duplicate so the two Understand-zone readers don't echo each other.

### slav-defence (1)
- **[accuracy] variations[].Winawer Countergambit (...e5!?)** — The explanation describes the genuine ...e5!? countergambit (3.Nc3 e5, with the dxe5 d4 pawn lever), but the moves actually on the board are a completely different line: the Botvinnik-style 5.Bg5 h6 6.Bh4 dxc4 7.e4 g5 (Black grabs c4 and hits the Bh4 with ...g5). The line shown never plays ...e5, dxe5, or ...d4. A paying user reads about a pawn sacrifice for the initiative while watching a different opening where Black is a pawn up via ...dxc4. Prose contradicts the moves.
  - claim: The Winawer Countergambit with ...e5!? is a sharp and provocative choice that immediately challenges White's center. Black sacrifices a pawn to open lines and seize the initiative before White can con
  - fix: Either rewrite the explanation to describe the line actually shown (the ...g5 anti-Bh4 / Botvinnik-flavored line where Black holds the c4-pawn), or replace the 

### queens-indian (1)
- **[accuracy] modelGames** — The overview names the winner backwards. result 0-1 means Black (Kovalev) won; Mamedyarov is White. The prose says 'Mamedyarov beats Kovalev from the Black side', which is doubly wrong — Mamedyarov is White and is the LOSER. A paying user reads the winner as the loser.
  - claim: …Bb4+ — Mamedyarov beats Kovalev from the Black side: the check develops with tempo and fractures White's coordination before …Bb7.
  - fix: Rewrite to: '…Bb4+ — Kovalev beats Mamedyarov from the Black side: the check develops with tempo and fractures White's coordination before …Bb7.'

### old-indian-defence (1)
- **[accuracy] modelGames** — The overview reverses the result. Result 0-1 means Black (Granda) won; Giri is White and lost. The student side is Granda, not Giri. As written it credits the win to the wrong player AND puts White's name on the Black side — directly contradicting the result/white/black/studentSide fields.
  - claim: Old Indian — Giri beats Granda from the Black side: the restrained …d6/…e5 with …Nc5-outpost manoeuvring and patient piece play.
  - fix: Rewrite to "Granda beats Giri from the Black side" (matching the other two model-game overviews, which correctly name the Black-side winner).

### two-knights-defence (1)
- **[accuracy] variations** — The explanation describes the 5...Bc5 6.e5 main-line Max Lange (with ...d5/...Be6), but the line actually taught is the 5...Nxe4 declining line. The prose contradicts both the sanLine and its own beats; a user reads about ...Bc5/...Be6 while the board plays ...Nxe4/...Qd8.
  - claim: After 5.O-O Bc5 6.e5, White blows open the center and both sides must calculate with extreme precision. Black's key resource is the counterattack with ...d5 followed by ...Be6, blocking the e-file and
  - fix: Rewrite the explanation to match the taught 5...Nxe4 line: pocket the pawn, kill the Re1 pin with ...d5 hitting the c4-bishop, retreat ...Qd8 after Nc3, and rea

### pro-gothamchess-london (1)
- **[accuracy] modelGames[0] (mg-pro-gothamchess-london-0)** — The overview describes a completely different game from the one in the fields. (1) Wrong opponent: overview says 'Hope_6', header says 'AlexOstrovskiy'. (2) Wrong opening/plan: openingSan shows a g6/King's-Indian setup with Nc3 (not Nbd2), NO Nf3, and an h4-h5 ROOK-SACRIFICE kingside attack (Rxh5! gxh5 Qxh5) — not a 'Bf4+e3+Nf3+Nbd2 queenside grind, c7-b6 bishop trade, Ne4-d6 fork, endgame conversion'. The overview text appears copied from the mp-...-classical-attack plan (which IS 'vs Hope_6', Bxb6 queenside).
  - claim: Gotham vs Hope_6 (2643) — a textbook London System grind. Levy plays his usual Bf4 + e3 + Nf3 + Nbd2 setup, trades the dark-squared bishop on c7-b6 to open the queenside, and outplays his opponent in 
  - fix: Rewrite the overview to describe the actual game in openingSan: the …g6 KID-style London where Levy plays h4-h5 and the Rxh5! rook sacrifice / Qxh5 kingside att

### pro-gothamchess-caro-kann (1)
- **[accuracy] modelGames[] — mg-pro-gothamchess-caro-kann-0 (GMHikaruOnTwi** — The overview describes a different game than the moves shown. The bishop goes to g4 (then retreats to d7 after f3), NOT to f5 — so 'trading the light-squared bishop early with the Bf5 main line' is false (the bishop is neither on f5 nor traded in the shown line). The queen goes to c7, never …Qa5+ or …Qa6. And there is no …c5 break (the freeing break played is …e5). Every concrete claim in the prose is contradicted by the openingSan.
  - claim: Levy plays his signature Caro-Kann as Black, trading the light-squared bishop early with the Bf5 main line. Patient development with …Qa5+ / …Qa6 forces White's queen into awkward squares, then the …c
  - fix: Rewrite the overview to match the actual game: Exchange Caro with …Bg4 (met by f3, bishop to d7), …Qc7 piling on the open c-file, and the …e5 central break — or

### pro-gothamchess-anti-sicilian (1)
- **[accuracy] variations[0] Rossolimo 3.Bb5 e6 — explanation** — Calls the position 'IQP-style' when neither side has a d-pawn, let alone an isolated one. It is an open, near-symmetric structure, not an IQP.
  - claim: you've reached an IQP-style position
  - fix: Remove the IQP framing; describe it as an open centre / queen-centralisation edge with the healthier structure.

### pro-naroditsky-caro-kann (1)
- **[accuracy] commonMistakes** — CM#4's FEN (rnbqkb1r/pp2pppp/2p2N2/8/3P4/8/PPP2PPP/R1BQKBNR b — verified = exactly e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+) is the SAME recapture decision the Classical and Modern lessons teach. The lessons teach exf6 as the correct repertoire move; this pitfall labels exf6 a blunder and gxf6 the correct move. A paying user is told to play exf6 in the lesson and then punished for it in the pitfall — flat contradiction on one position.
  - claim: After Nxf6+ in the Classical Caro-Kann, the natural …exf6? gives Black doubled f-pawns AND a passive structure. The correct move is …gxf6
  - fix: Delete CM#4 or rewrite it to match the taught repertoire (exf6 is the chosen move). If gxf6 is genuinely Naroditsky's pick, then the Classical + Modern beats ar

### pro-naroditsky-fantasy-caro (1)
- **[accuracy] middlegamePlans** — The plan title advertises a 'Bxf6' move, but Bxf6 never appears anywhere in the plan's own lineSan (no bishop capture on f6 at all). The title names a move the line doesn't contain.
  - claim: Fantasy Caro — Bxf6 + O-O-O kingside attack
  - fix: Rename the title to reflect the actual line, e.g. 'Fantasy Caro — Nxg6 damages the kingside, d5/c4 clamp' — drop the non-existent Bxf6.

### pro-naroditsky-ruy-lopez (1)
- **[accuracy] variations[0] Berlin Defense** — The bishop pair belongs to BLACK in this line, not White. The packet repeats the inverted claim in the variation explanation ('better pawn structure and bishop pair compensation') and in Berlin beat 4. A paying user is taught the opposite of what's on the board.
  - claim: the Berlin Endgame: queens off, bishop pair for White, doubled c-pawns for Black.
  - fix: Reverse the attribution: White's compensation is the superior pawn structure / Black's doubled c-pawns; BLACK holds the bishop pair. Rewrite beat 4 and the vari

### pro-gothamchess-trompowsky (1)
- **[accuracy] traps** — The trap tells the user to retreat Bh4 against …Ne4, the exact move the packet's own commonMistake flags as the blunder, and which the Vaganian variation main line replaces with h4. The packet gives the user directly opposite advice on the same position.
  - claim: If Black plays an early …Ne4 (Vaganian-style attack on the bishop), retreat Bh4 — the knight on e4 has no real support and gets chased away with h4 + Nd2-Nxe4.
  - fix: Rewrite the trap to recommend the aggressive h4 (matching commonMistakes[0] and the Vaganian variation), or remove it. Do not advise retreating Bh4 against …Ne4

### pro-gothamchess-kia (1)
- **[accuracy] modelGames** — The overview describes the canonical KIA setup move-by-move, but the actual moves play a completely different system: e3 (not g3), c4, b3, Bb2 (queenside fianchetto), Bb5, and a d4 break that opens the centre. There is NO g3, NO Bg2, NO d3, NO Nbd2, NO e4 — and therefore no e4-e5 wedge and no f4-f5 storm. The overview misdescribes its own game.
  - claim: Levy's KIA at full power — same Nf3+g3+Bg2+d3+Nbd2+e4 setup every game. The e4-e5 push grabs space, then f4-f5 builds the kingside attack.
  - fix: Replace this game with one whose openingSan actually plays the KIA (the other three model games do), or, if this game is intentionally a different Levy system, 

### pro-gothamchess-pirc-defense (1)
- **[accuracy] middlegamePlans** — The title advertises "…Nd4 Centralization" that never occurs in the line; the plan actually teaches a rook centralization on e5. Title contradicts its own pieceManeuvers and the moves.
  - claim: "vs Austrian Attack: …c5 Counter + …Nd4 Centralization" (title)
  - fix: Retitle to "vs Austrian Attack: active …Rf5 defence + …Re5 centralization" (drop the …Nd4 claim).

### pro-hikaru-caro-kann (1)
- **[accuracy] modelGames** — Overview says 2020; the record's year/event fields say 2021 (Aug 29). The spoken year contradicts the card's own data fields.
  - claim: Nakamura vs 0gZPanda (2912), 2020. The Two Knights, met by the classical …Bg4 pin...
  - fix: Change the overview year to 2021 to match the year/event fields (or correct the fields).

### pro-ericrosen-budapest (1)
- **[accuracy] modelGames** — The overview says this is the '…Bc5 line vs Nf3' and that 'the bishop and knight train on f2.' But the openingSan shows 3.Nf3 e4 (the 4.Nfd2 main line where Black pushes …e4, NOT taking on e5 with the knight), then …c6, …d5, …Bd6 — there is no …Bc5, no g4-knight, and nothing trains on f2. The game does not play the variation its overview and id (mg-...-nf3, the '…Bc5' tab) attribute to it. A paying user clicking the …Bc5 variation's model game sees a completely different system.
  - claim: "A win over a 2565 in the …Bc5 line vs Nf3 — the bishop and knight train on f2 and Black's activity overwhelms White." openingSan: "d4 Nf6 c4 e5 Nf3 e4 Nfd2 c6 e3 d5 Nc3 a6 f3 exf3 Qxf3 Bd6 Bd3 Bg4 Qf
  - fix: Replace with a real Rosen game that actually reaches …Ng4/…Bc5 vs Nf3, or correct the overview to describe the …e4 line this game actually plays (and re-tag it 

### pro-ericrosen-qgd (1)
- **[accuracy] watchLearnBeatsMain** — '…Bxh4' is geometrically impossible for Black. The d6-bishop's kingside diagonal is d6-e5-f4-g3-h2 (it reaches h2, not h4); h4 lies on the d8-e7-f6-g5-h4 diagonal the bishop never occupies (the repertoire keeps it on d6). No Black knight/pawn captures h4 here either. The actual minor trade in this exact line is Bxe4 dxe4 (White takes Black's e4-knight), per the packet's own middlegame plan — Black never plays …Bxh4.
  - claim: …Ne4 jumping into the hole, …Bxh4 or …f5-f4 prying open lines at White's king.
  - fix: Replace '…Bxh4' with the line's real maneuver, e.g. '…Ne4 — met by Bxe4 dxe4 — and …f5-f4 prying open lines at White's king.'

### pro-ericrosen-french (1)
- **[relevance] modelGames** — The game is tagged/described as the Advance variation, but the moves show Black playing …dxe4 with White recapturing Nxe4 (a Rubinstein/exchange structure) — there is no e5 advance, no Advance pawn chain at all. None of the overview's described motifs (…c5, …Qb6, …c4, minority attack) occur anywhere in the openingSan. A paying user studying the Advance gets a game that is not the Advance and shows none of the promised ideas.
  - claim: "A win over a 2529 in the Advance — …c5, …Qb6 and …c4 clamp the queenside and Black's minority attack decides." (mg-pro-ericrosen-french-advance)
  - fix: Replace with a genuine Advance-variation game that actually plays …c5/…Qb6/…c4, or relabel the overview to describe the structure that actually occurred (Black 

### pro-caruana-nimzo-indian (1)
- **[accuracy] modelGames** — The boilerplate overview describes a bishop trade and doubled pawns that do not occur in this game. Black keeps the bishop (…Be7) and White's structure is undoubled. A paying user reading the overview is told the opposite of what the moves show.
  - claim: Caruana (Black) defeats Aronian (2777) in the Nimzo-Indian ... Black trades the bishop for the c3-knight, fixes White's structure, and plays against the doubled pawns and the centre.
  - fix: Author a game-specific overview: the Classical Qc2 with an early …c5/dxc5 where Black regains the pawn via …Qa5/…Qxc5 and plays a normal Nimzo middlegame; do no

### pro-caruana-najdorf (1)
- **[accuracy] modelGames** — Game C's openingSan is a 6.Nb3 e6 line with a g4/h4 pawn storm — there is no ...e5 (Black plays ...e6) and no Be3/f3 English Attack setup. The overview's '...e5' and 'English-Attack' description is contradicted by the moves of this very game.
  - claim: Caruana (Black) defeats Harikrishna (2726) in the Najdorf Sicilian ... the English-Attack Najdorf where Black grabs the centre with …e5 and counterpunches
  - fix: Rewrite Game C's overview to describe what it actually plays (a 6.Nb3 e6 Najdorf where White launches a g4/h4 kingside pawn storm and Black counters with ...b5/

### pro-caruana-taimanov (1)
- **[accuracy] modelGames** — Two of the three model-game overviews assert Black 'strikes with …d5' but their own openingSan shows no …d5 move at all. Game A is a …Qc7/…Ne5 setup; Game B is an …e5-by-White line answered with …Ne7/…Qxe5. The prose contradicts the moves a paying user can replay.
  - claim: the flexible Taimanov — Black develops harmoniously, strikes with …d5, and outplays White from a sound structure.
  - fix: Write a game-specific overview per model game describing what that game actually shows (Game A: …Qc7 + …Ne5/…Neg4 piece play; Game B: meeting White's e5 with …N

### pro-samayraina-open-sicilian (1)
- **[accuracy] endgamePlans** — Two false claims: (1) …Rxd4 is a rook-for-rook trade, not 'giving up the exchange'; (2) Black is NOT 'down material' after cxd4 — the material is level. A paying user reading 'Black is down material' on a position where material is equal is being misinformed about the actual trade.
  - claim: "…Rxd4 — Black gives up the exchange to slow the pawn, a measure of how dangerous it has become." and "cxd4 — recapture. Black is down material AND still facing the passer."
  - fix: Rewrite to: '…Rxd4 — Black trades rooks to blunt the passer' and 'cxd4 — recapture; material is level, but the b-pawn on the 7th is decisive.' Keep the (correct

### pro-samayraina-italian (1)
- **[accuracy] modelGames** — The overview advertises the slow 'knight reroute' Pianissimo, but this game's moves are a sharp open-d4, e5-push, Bxf7+ bishop sacrifice attack — the opposite of a slow maneuvering reroute. The templated overview was stamped on without matching the game's actual character. A paying user clicking this 'reroute' demo gets a piece-sac slugfest.
  - claim: A practical demonstration of the Giuoco Pianissimo — the knight reroute and the central d4 break, the way he plays it in his own games.
  - fix: Rewrite the overview to describe the game's real content (sharp d4/e5 break and the Bxf7+ sacrifice), or replace the game with one that actually shows the Nbd2-

### pro-samayraina-caro-white (1)
- **[accuracy] modelGames** — The openingSan shows 2…d6, NOT the Caro-Kann's defining 2…d5 — Black never challenges the centre with …d5, so this is not a Caro-Kann Panov at all (it's a 1.e4 c6 2.c4 d6 Old-Indian/irregular setup). After 9.d5 c5 White has an ADVANCED, supported d5-pawn — there is no isolated queen's pawn anywhere in the game, yet the overview claims 'pressure on the IQP.' The opening identity and the central middlegame claim both contradict the moves.
  - claim: "overview": "A Samay Raina win in Caro Panov (vs 2062). A practical demonstration of the Accelerated Panov — pressure on the IQP and a kingside attack..." with "openingSan": "e4 c6 c4 d6 d4 Qd7 Nc3 e5
  - fix: Replace game 3 with a real 2…d5 Panov win from Samay's corpus, or rewrite its overview to describe the actual 2…d6 / advanced-d5-pawn structure and drop the 'Pa

### pro-samayraina-sicilian-black (1)
- **[relevance] commonMistakes** — This 'common mistake' is about choosing the Najdorf over the Dragon — a different Sicilian. It teaches nothing about the …Nc6/…e5 repertoire the user is studying, and contradicts the packet's own Kalashnikov framing.
  - claim: …g6 commits to a Dragon, walking into the dangerous Yugoslav Attack ... The Najdorf's …a6 is more flexible ... Flexibility is the Najdorf's great strength.
  - fix: Replace with a mistake that actually arises in the …Nc6/…e5 lines (a real Kalashnikov/anti-Sicilian pitfall), or remove it. Keep mistake[1], which is correctly 

### pro-samayraina-scandi (1)
- **[relevance] modelGames** — The game is the …Qd6 Scandinavian, not the taught …Qd8 line, and it is a sharp tactical g-file scramble (…Nxg4, …Bxg4) — the opposite of the 'solid development and the …c5 break' the overview claims. The overview misattributes the game's content and variation.
  - claim: "A practical demonstration of the modern …Qd8 Scandinavian — solid development and the …c5 break, the way he plays it in his own games." (mg-pro-samayraina-scandi-1)
  - fix: Either retag/re-narrate this game to its actual …Qd6 + g-file tactics content, or replace it with a genuine …Qd8 solid-development game; do not stamp the generi

### pro-caruana-french (1)
- **[accuracy] variations** — The beat says 'tripled' queenside pawns, but the board shows doubled c-pawns. The earlier beat in the same variation correctly says 'doubling White's pawns' — so the line is internally contradictory and the board contradicts 'tripled'.
  - claim: White grabs g7 and h7; Black opens the c-file with cxd4, smashing into White's tripled, shattered queenside.
  - fix: Change 'tripled, shattered queenside' to 'doubled, shattered queenside' to match the finalFen and the earlier beat.

### pro-caruana-italian (1)
- **[accuracy] endgamePlans** — The position is a rook-and-double-knight ending, not 'a knight ending.' The overview contradicts both the board (rooks present and active) and its own title. A paying user reading 'knight ending' over a board with rooks sees it as wrong.
  - claim: From his Pianissimo, this repertoire converts a knight ending the modern way: activate the king. ... while the c4-knight blockades.
  - fix: Drop 'a knight ending'; describe it as a rook ending with knights, e.g. 'converts a rook-and-knight ending the modern way: activate the king and the rook (Rc1).

### pro-caruana-kid (1)
- **[relevance] middlegamePlans** — The plan's starting position is a Classical e4/Be2 King's Indian, not the Fianchetto the main lesson teaches. The bishop is on e2 with no g3 fianchetto, so the plan does NOT continue the opening spine it claims to pick up from — a continuity break (G9.3 Gate C). A user who just watched the Fianchetto Watch lesson is handed a middlegame from a different system.
  - claim: The King’s Indian Break: …e5 and …a5 — a data-derived plan from this repertoire's games, picking up exactly where the opening leaves off.
  - fix: Either re-anchor the plan's lineStartFen to the actual Fianchetto spine terminus, or relabel the plan as belonging to the Classical e4 variation and drop the 'p

### pro-carlsen-open-sicilian (1)
- **[accuracy] modelGames** — The overview is contradicted by the game's own openingSan on two counts. (1) The game is a Bc4–Bb3 Classical/Italian-style setup (h3, Bc4, Bb3) — NOT the English Attack, which is the Be3/f3/Qd2/O-O-O setup taught in the main line and shown in mg2. There is no Be3, f3 or Qd2 in this line. (2) White castles SHORT — the san ends 'O-O O-O' with the White king landing on g1 — so 'castles long and storms the kingside' is false. A paying user comparing the move list to the description sees an obviously wrong label.
  - claim: Carlsen vs LyonBeast (2859), 2025 — Open Sicilian: the English Attack in full flow — Carlsen castles long and storms the kingside to a crushing win.
  - fix: Rewrite the overview to match the actual line, e.g. 'Open Sicilian, Classical Bc4 treatment — Carlsen develops Bc4-b3 against f7, castles short, and grinds the 

### pro-carlsen-ruy-lopez (1)
- **[accuracy] variations** — The beat names the wrong piece for the c6 capture. There is no Bxc6 in this line; the doubling capture is Nxc6. A paying user replaying the line will see a knight (not a bishop) take on c6, contradicting the narration.
  - claim: After the central trades, Bxc6 doubles Black's pawns and the bishop drops to d3 on the attacking diagonal.
  - fix: Reword to: 'After the central trades, Nxc6 doubles Black's c-pawns, and then the bishop drops to d3 on the attacking diagonal.'

### pro-carlsen-sicilian (1)
- **[accuracy] modelGames** — The overview calls this a Najdorf with opposite-side castling and a queenside avalanche, but the moves are a c3/d3 (Alapin/KIA-style) Sicilian. There is no 5.d4/Najdorf, no opposite-side castling (only Black O-O is shown), and Bxc6 bxc6 leaves Black with doubled c-pawns — the opposite of a 'queenside avalanche'. Every structural claim in the overview is contradicted by the game's own moves.
  - claim: Carlsen vs Nakamura,Hi (2813), 2025 — Sicilian: the Najdorf counter-attack — opposite-side castling and the queenside avalanche.
  - fix: Re-describe the game by what it actually plays (a c3-Sicilian where Black equalizes with ...d5/...d4 and the bishop pair after Bxc6), or swap in an actual Najdo

### pro-carlsen-1e5 (1)
- **[accuracy] modelGames[mg-pro-carlsen-1e5-1]** — The overview describes this game as the Closed Ruy / Chigorin reroute, but the moves are an Italian Pianissimo with no Chigorin maneuver. It is also tagged variation 'vs Italian Bc4', so the prose directly contradicts both the openingSan and its own tag. A paying user reading 'Closed Ruy / Chigorin' over an Italian board would be misled.
  - claim: ...e5: the Closed Ruy from Black's side — the Chigorin reroute and a long grind.
  - fix: Rewrite to match the moves, e.g. 'Carlsen vs Polish_fighter3000 (2858), 2026 — the Italian: a quiet Pianissimo Carlsen grinds down from Black's side.'

### pro-carlsen-kid (1)
- **[accuracy] modelGames** — The overview attributes this game to the Mar del Plata kingside storm (...f5-f4), but the openingSan is an exchange/Gligoric-type line where Black plays ...Bg4 and liquidates the centre with ...exd4 Bxd4. There is no d5 lock, no locked centre, and no ...f5 — the structural premise of the Mar del Plata storm is absent. A knowledgeable user replaying the game sees a traded centre, not the avalanche described.
  - claim: Carlsen vs GMWSO (2851), 2024 — King's Indian: the Mar del Plata kingside storm — ...f5-f4 and the attack crashes through.
  - fix: Re-tag/re-author the overview to describe the actual structure (exchange-on-d4 / Gligoric line and the resulting piece play), or replace the game with one that 

### pro-aman-sicilian-kan (1)
- **[accuracy] modelGames** — The literal placeholder string 'undefined (undefined)' leaks into user-facing prose where the opponent name and rating should be. A paying user reads 'a bullet win over undefined (undefined)' on every single model game.
  - claim: a bullet win over undefined (undefined) in 2022
  - fix: Populate the opponent name/rating (or drop the clause). Either fill from the source PGN white/black headers or rewrite the template to omit the opponent when un

### pro-carlsen-french (1)
- **[accuracy] modelGames[] — mg-pro-carlsen-french-1** — The overview describes a ...c5/...b4 queenside pawn-break, but the game is a symmetrical Exchange French — neither ...c5 nor ...b4 is played, and the structure (c-pawns home, pieces traded on f5/d3) makes a 'queenside break' false. This is the Steinitz-mainline boilerplate blurb mis-stamped onto an Exchange game; a paying user reading it next to the moves sees a flat contradiction.
  - claim: Carlsen vs Nakamura,Hi (2804), 2025 — French: the French counter-attack — ...c5 and ...b4 break open White's queenside.
  - fix: Rewrite the overview to describe what this game actually shows — a symmetrical Exchange where Black equalizes the bishops (…Bd6, …Bf5, trading the bad bishop on

### pro-aman-nimzo-indian (1)
- **[accuracy] modelGames** — Every model-game overview ships a broken template placeholder where the opponent name and rating should be. A paying user reads 'win over undefined (undefined)', which looks like a bug, and the trailing 'converting against a strong opponent' is unverifiable since the opponent is literally undefined.
  - claim: a bullet win over undefined (undefined) in 2024
  - fix: Populate the opponent name/rating before render, or drop the 'over <opponent> (<rating>)' clause and the 'strong opponent' tail entirely when opponent data is a

### pro-aman-reti (1)
- **[accuracy] modelGames** — Broken template interpolation leaks the literal word 'undefined' into user-facing prose on every single model game. A paying user sees 'a bullet win over undefined (undefined)' — obviously broken.
  - claim: a bullet win over undefined (undefined) in 2024
  - fix: Populate white/black (and opponent rating) from the source game, or rephrase the overview to omit the opponent when unknown (e.g. 'a bullet win in 2024').

### pro-carlsen-scandinavian (1)
- **[accuracy] variations › vs 2.Nc3** — The line claims Black holds 'the bishop pair' as an advantage, but only one knight pair was traded (Nxf6+ exf6) so White still has both bishops too. There is no bishop-pair imbalance — the minor-piece configuration is symmetric. The same false claim repeats in beat #2 ('Black's bishop pair gives a comfortable, active game').
  - claim: the bishop pair and open e-file give an active game
  - fix: Drop the 'bishop pair' framing for this line. Black's real assets here are the half-open e-file and the d6-bishop / central solidity — sell those instead, in bo

### pro-carlsen-modern (1)
- **[accuracy] endgamePlans[mp-carlsen-modern-endgame]** — The pawn is BLOCKADED and ISOLATED, not passed and not protected. A passed pawn requires no enemy pawn on its file/adjacent files ahead — White's d3 pawn sits directly ahead on the d-file. 'Protected' requires a friendly pawn on c5/e5 — Black has neither (e5 is a White pawn). The false claim is the stated 'long-term trump' of the whole endgame plan and is repeated four times (overview prose, pawnBreaks.explanation, pieceManeuvers.explanation, strategicThemes/annotation[0]). A paying user studying this as 'the winning idea' is taught a structurally wrong evaluation.
  - claim: the d4-pawn is a protected passed pawn — the long-term trump
  - fix: Re-evaluate and rewrite the trump. d4 is a blockaded passed-pawn candidate at best. Describe the real edge (Black's queenside majority b5/a-pawns vs a2/b2, acti

---

## Where the rest live
- Full re-validated findings (all 582, every severity, with live/changed status): `audit-reports/content-audit/_findings-revalidated.json` (gitignored — regenerate with the content-audit scripts).
- Systemic detectors: `scripts/content-audit/detect-systemic.cjs`. Per-opening packets: `scripts/content-audit/build-packets.ts`.
