// HAND-AUTHORED narration for punish gems (David 2026-05-24). Keyed by gemId
// (= `${openingId}:${lineMoves_with_underscores}:${inaccuracy}`). For each gem:
//   watch[i] = the full Watch line spoken as move i plays ('' = stay silent on
//              routine moves; the position is the lesson there).
//   learn[i] = the TRUNCATED Learn cue spoken as the student plays move i,
//              reinforcing the Watch lesson ('' = fall back to move dictation,
//              used for the opponent's auto-played replies).
// EVERY line is hand-written and verified against its own move + position —
// never generated, never a beat-summary dropped on the wrong ply. A gem only
// SURFACES once it has an entry here (no thin-narration gems ship).
//
// Authoring discipline: replay the gem's playLine move-by-move; write each
// line to name what is actually happening on THAT move. Cross-check the idea
// against theory before committing.

export interface GemNarration {
  watch: string[];
  learn: string[];
}

export const GEM_NARRATION: Record<string, GemNarration> = {
  // Caro — White's 3.f3 (Fantasy) but 4.f3?? offered too loosely: 4...exf3 just
  // wins a pawn. playLine: e4 c6 d4 d5 Nc3 dxe4 f3 exf3 Nxf3 Nf6 Bd3 Bg4 h3 Bxf3 Qxf3
  'caro-kann:e4_c6_d4_d5_Nc3_dxe4:f3': {
    watch: [
      '', '', '', '', '', '',
      'f3? White offers a pawn to blast open the centre — but here it is simply unsound. The e4-pawn is yours, and f3 only hangs another.',
      'exf3 — take it. You stay a pawn to the good; all White gets is a little development.',
      'Nxf3 claws one pawn back, but you are still up a pawn with a rock-solid Caro structure.',
      '',
      '',
      'Bg4 pins the f3-knight to the queen — pile pressure on the one piece doing White any work.',
      '',
      'Bxf3 — trade the knight off and simplify while you are ahead. Fewer pieces, same extra pawn.',
      'Qxf3, and you have steered into a clean pawn-up middlegame. The gambit gave White nothing.',
    ],
    learn: [
      '', '', '', '', '', '',
      '', // 4.f3 (opponent)
      'exf3 — grab the free pawn.',
      '', // 5.Nxf3 (opponent)
      '', // ...Nf6
      '', // 6.Bd3 (opponent)
      'Bg4 — pin the knight.',
      '', // 7.h3 (opponent)
      'Bxf3 — trade it off, stay a pawn up.',
      '', // 8.Qxf3 (opponent)
    ],
  },

  // Caro Fantasy — after 3.f3 dxe4 4.fxe4 e5, White's 5.c3?? ignores the centre
  // and the king is caught. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 c3 Qh4+ Kd2 Nf6 Nf3 Qf2+ Be2 Nxe4+ Kc2
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5:c3': {
    watch: [
      '', '', '', '', '', '', '', '',
      'c3? White ignores the fire in the centre. The king on e1 has no shelter now — and the queen pounces.',
      'Qh4+! Check straight down the open diagonal. Blocking with g3 just drops e4 with check, so the king has to walk.',
      'Kd2 — the king flees into the centre. Exactly where you want it: no castling, no cover.',
      'Nf6 develops with tempo, eyeing e4 and adding a second attacker to the hunt.',
      '',
      'Qf2+ — keep checking, keep the initiative. The white king never gets a free move.',
      '',
      'Nxe4+! Win the central pawn WITH check. You are up a pawn and White is caught in a net.',
      'Kc2 — the king bolts to the queenside, but it is hopeless: down a pawn and hideously exposed.',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      '', // 5.c3 (opponent)
      'Qh4 — check, and chase the king.',
      '', // 6.Kd2
      'Nf6 — develop, hit e4.',
      '', // 7.Nf3
      'Qf2 — check, keep the initiative.',
      '', // 8.Be2
      'Nxe4 — win the pawn, with check.',
      '', // 9.Kc2
    ],
  },
  // Caro Fantasy — White's 7.Bxf7+?? is an UNSOUND sac; just take it and you're
  // up a piece. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 Bxf7+ Kxf7 O-O Ke8 Nbd2 Nh6 h3 Bh5 c3
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7:Bxf7+': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'Bxf7+? White flings the bishop at f7 hoping for a king hunt — but there is no follow-up here. It is just a piece thrown away.',
      'Kxf7 — take it. The checks dry up at once, and you are simply up a whole bishop.',
      '',
      'Ke8 — walk the king straight back home. No rush; nothing is attacking it.',
      '',
      'Nh6 brings the last piece out, heading for f5 or g4 — finish developing with the extra bishop in your pocket.',
      '',
      'Bh5 sidesteps the h3 nudge and keeps the bishop. Calm, clean consolidation — a piece to the good.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '', // 7.Bxf7+ (opponent)
      'Kxf7 — just take the bishop.',
      '', // 8.O-O
      'Ke8 — walk the king home.',
      '', // 9.Nbd2
      'Nh6 — develop, consolidate.',
      '', // 10.h3
      'Bh5 — keep the bishop, stay a piece up.',
      '', // 11.c3
    ],
  },

  // Caro Fantasy — White's 8.Nc3?? leaves d4 loose with the centre tense; exd4
  // wins it. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 Nc3 exd4 Ne2 Bc5 Kh1 Qe7 Ng3 O-O-O Qd3
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7_O-O_Ngf6:Nc3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nc3? Natural-looking development — but with the centre still tense it leaves d4 underdefended. Strike before White consolidates.',
      'exd4 — win the central pawn. The knight on c3 cannot recapture, and d4 is yours to keep.',
      '',
      'Bc5 clamps the extra pawn on d4 and rakes toward f2 — the bishop does double duty.',
      '',
      'Qe7 connects the pieces, ready to castle long and load the open files.',
      '',
      'O-O-O — king tucked away, rooks swinging to the centre: a pawn up with all the initiative.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', // 8.Nc3 (opponent)
      'exd4 — win the centre pawn.',
      '', // 9.Ne2
      'Bc5 — guard d4, eye f2.',
      '', // 10.Kh1
      'Qe7 — connect, prepare to castle long.',
      '', // 11.Ng3
      'Castle long — king safe, a pawn up.',
      '', // 12.Qd3
    ],
  },

  // Vienna — Black grabs e4, then 4...g6?? drops e5 with check and loses a piece.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 g6 Qxe5+ Qe7 Qxe4 Qxe4+ Nxe4 c6 b3 Bg7
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5:g6': {
    watch: [
      '', '', '', '',
      'Bc4 takes aim at f7 — the Vienna bishop on its working diagonal.',
      'Black grabs the e4-pawn. Tempting — but it cracks open the king, and the queen is coming.',
      'Qh5! Two threats in one move: mate on f7, and the loose pawn on e5. Black can only answer one.',
      'g6 hits the queen and guards f7 — but it leaves e5 hanging, and with check. This is the slip.',
      'Qxe5 — check! You snatch the pawn AND skewer the knight on e4 down the open file. That is the price of g6.',
      'Black must block. Qe7 is forced.',
      'Qxe4 collects the knight.',
      'Black trades queens off, hoping to blur the damage.',
      'Nxe4 recaptures — and the dust settles with you a clean piece ahead.',
      '', '', '',
    ],
    learn: [
      '', '', '', '',
      'Bc4 — aim at f7.',
      '', // ...Nxe4 (opponent)
      'Qh5 — hit f7 and e5 at once.',
      '', // ...g6 (opponent, the mistake)
      'Qxe5 — check, and fork the e4-knight.',
      '', // ...Qe7
      'Qxe4 — take the knight.',
      '', // ...Qxe4+
      'Nxe4 — recapture, a clean piece up.',
      '', '', '',
    ],
  },

  // Vienna Frankenstein — 5...Qf6?? parks the queen on Nd5's fork square.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Qf6 Nd5 Qg6 Qxg6 hxg6 Nxc7+ Kd8 Nxa8 b6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3:Qf6': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Qf6 defends f7 and eyes f2 — but it parks the queen right on the d5-knight’s fork square. The blow is ready.',
      'Nd5! Forking the f6-queen and threatening Nxc7+ — the family fork that wins a rook. Black can’t save both.',
      'Qg6 — the queen runs and offers a trade.',
      'Qxg6 — take it. The point isn’t the queens; it’s what comes next.',
      '',
      'Nxc7+ — the royal fork: the king and the a8-rook at once.',
      '',
      'Nxa8 collects the rook. You’ve won the exchange — convert from here.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', // through Qf6 (opponent) at index 9
      'Nd5 — fork the queen, threaten c7.',
      '', // ...Qg6
      'Qxg6 — trade, then the fork.',
      '', // ...hxg6
      'Nxc7 — the royal fork.',
      '', // ...Kd8
      'Nxa8 — win the rook.',
      '', // ...b6
    ],
  },

  // Vienna Frankenstein — 6...Qf6?? ignores the Nb5 already eyeing c7.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 Qf6 Nxc7+ Kd8 Nxa8 Qg6 Qxg6 hxg6 Ne2 b6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5:Qf6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Qf6 develops the queen but ignores the knight on b5 staring at c7. That’s the slip.',
      'Nxc7+! The fork lands — king and the a8-rook. Nb5 was loaded all along.',
      '',
      'Nxa8 takes the rook — a clean exchange to the good.',
      'Black tries to trade queens to muddy it —',
      'Qxg6, and after the recapture you simply develop with the extra material.',
      '',
      '',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', // through Qf6 (opponent) at index 11
      'Nxc7 — the royal fork.',
      '', // ...Kd8
      'Nxa8 — win the rook.',
      '', // ...Qg6
      'Qxg6 — trade off, stay up the exchange.',
      '', '', '', // ...hxg6, Ne2, b6
    ],
  },

  // Vienna — 4...Nf6?? blocks f7 but drops g7. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Nf6 Qxg7 Rf8 d3 Nd4 Nf3 c6 Nxe5 d5
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4:Nf6': {
    watch: [
      '', '', '', '', '', '',
      'Qg4 swings out and stares straight at g7.',
      'Nf6 develops and blocks the road to f7 — but it abandons g7. The queen pounces.',
      'Qxg7! Snatch the pawn and hit the h8-rook. Black scrambles while you’re up material with the initiative.',
      'Rf8 saves the rook —',
      '',
      '',
      'Nf3 develops and hits the d4-knight; the g7-pawn is long gone.',
      '',
      'Nxe5 — grab a second pawn. Two up, with a safe king.',
      '',
    ],
    learn: [
      '', '', '', '', '', '',
      'Qg4 — eye g7.',
      '', // ...Nf6
      'Qxg7 — take the pawn, hit the rook.',
      '', '', '', // ...Rf8, d3, ...Nd4
      'Nf3 — develop, hit the knight.',
      '', // ...c6
      'Nxe5 — grab a second pawn.',
      '', // ...d5
    ],
  },

  // Vienna Frankenstein — 5...Qg6?? saves the queen but not the c7-fork.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qg6 Qxg6 hxg6 Nxc7+ Kd8 Nxa8 Nf6 d3 d5
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5:Qg6': {
    watch: [
      '', '', '', '', '', '',
      'Qg4 eyes g7; Black defends with Qf6.',
      '',
      'Nd5 forks the f6-queen and loads Nxc7+ — Black must answer both.',
      'Qg6 saves the queen and offers a trade, but it does nothing about the c7-fork. Decisive slip.',
      'Qxg6! Trade the queens — the recapture is what opens the door.',
      '',
      'Nxc7+ — the royal fork: king and the a8-rook.',
      '',
      'Nxa8 takes the rook. Up the exchange, cleanly winning.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', // through Nd5 setup
      'Nd5 — fork the queen, load c7.',
      '', // ...Qg6
      'Qxg6 — trade, then strike.',
      '', // ...hxg6
      'Nxc7 — the royal fork.',
      '', // ...Kd8
      'Nxa8 — win the rook.',
      '', '', '',
    ],
  },

  // Vienna Frankenstein — 6...Bb6?? takes the eye off g7. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Bb6 Qxg7 d6 Nf3 Bh3 Nxb6 cxb6 Qxf7+ Kd8
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5_Qxf2+_Kd1:Bb6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '',
      'Kd1 sidesteps the check; Black’s queen is deep in your camp, but your g4-queen and d5-knight are both loaded.',
      'Bb6 retreats the bishop to save it — but it takes the eye off g7. Now the queen feasts.',
      'Qxg7! Grab the pawn, hit the h8-rook, and the threats pile up. Black is losing on every front.',
      '',
      'Nf3 develops, defends, and keeps everything coordinated.',
      '',
      'Nxb6 — snap off the bishop.',
      '',
      'Qxf7+ — and the king is hunted, a winning material edge in hand.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      'Kd1 — sidestep, stay loaded.',
      '', // ...Bb6
      'Qxg7 — take g7, hit the rook.',
      '', // ...d6
      'Nf3 — develop, hold it together.',
      '', // ...Bh3
      'Nxb6 — win the bishop.',
      '', // ...cxb6
      'Qxf7 — check, decisive.',
      '', // ...Kd8
    ],
  },

  // Vienna Gambit Accepted — 4...d6?? is too slow; seize the centre with d4.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 d6 d4 g5 d5 Ne5 Bb5+ c6 dxc6 bxc6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3:d6': {
    watch: [
      '', '', '', '', '', '', '',
      'd6 is too slow in the Gambit — it does nothing about your centre. Take it.',
      'd4! Build the big e4+d4 centre while Black still clutches the f4-pawn. You are already better.',
      'g5 tries to prop up f4 —',
      'd5 — gain space with tempo, kicking the c6-knight.',
      '',
      'Bb5+ develops with check and disrupts Black further.',
      '',
      'dxc6 rips open the centre against the uncastled king.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', // through d6 (opponent) at index 7
      'd4 — seize the centre.',
      '', // ...g5
      'd5 — gain space, kick the knight.',
      '', // ...Ne5
      'Bb5 — check, disrupt.',
      '', // ...c6
      'dxc6 — rip it open.',
      '', // ...bxc6
    ],
  },

  // Vienna Gambit — 5...Bc5?? walks into d4 and a kingside crash.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bc5 d4 Be7 h4 d6 Nxg5 Bxg5 Qh5 Qe7
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4:Bc5': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Bc5 looks natural — but it walks into a central break that comes with tempo.',
      'd4! Hit the bishop and build the centre at once. The g5/f4 pawn-grab is about to cost Black.',
      'Be7 retreats —',
      'h4 — pry open the g5-pawn holding Black’s extra material together.',
      '',
      'Nxg5! The knight crashes in; the g5-point collapses.',
      '',
      'Qh5 — double attack on the loose g5-bishop and f7. Black is overwhelmed.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', // through Bc5 (opponent) at index 9
      'd4 — hit the bishop, take the centre.',
      '', // ...Be7
      'h4 — pry open g5.',
      '', // ...d6
      'Nxg5 — crash through.',
      '', // ...Bxg5
      'Qh5 — double attack, g5 and f7.',
      '', // ...Qe7
    ],
  },

  // Vienna Gambit — 6...Nge7?? leaves g5 hanging; Nxg5 + kingside storm.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 Nge7 Nxg5 Rf8 Qh5 Ng6 Nxh7 Qh4+ Qxh4 Nxh4
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4:Nge7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Nge7 develops the knight — but it abandons g5, and the Gambit’s whole point is to win that pawn back with interest.',
      'Nxg5! Snap off the pawn and storm the kingside — the knight eyes f7 and h7.',
      'Rf8 props up f7 —',
      'Qh5 piles on, threatening mate ideas on f7 and h7.',
      '',
      'Nxh7! Grab another pawn and fork the rook; the attack rolls on.',
      'Black checks to bail into an endgame —',
      '',
      'but after the queens come off you are up material with a wrecked black kingside.',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', // through Nge7 (opponent) at index 11
      'Nxg5 — win the pawn, attack.',
      '', // ...Rf8
      'Qh5 — pile on f7 and h7.',
      '', // ...Ng6
      'Nxh7 — grab a pawn, fork the rook.',
      '', // ...Qh4+
      'Qxh4 — trade, stay up.',
      '', // ...Nxh4
    ],
  },

  // Vienna Gambit — 7...Nge7?? (castled version); Nxg5 then the Bxf7+ sac.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O Nge7 Nxg5 Ng6 Bxf7+ Kf8 Bxg6 Bxd4+ Kh1 hxg6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4_d6_O-O:Nge7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nge7 again leaves g5 hanging — and now you are castled, so the attack comes at full force.',
      'Nxg5! Win the pawn and ignite the kingside — f7 is the target.',
      '',
      'Bxf7+! The bishop sacrifices to rip the king open.',
      '',
      'Bxg6 — collect the knight; the king is stripped bare.',
      'Black grabs a pawn with check in desperation —',
      '',
      'but you are winning: a shredded black king and decisive material.',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', // through Nge7 (opponent) at index 13
      'Nxg5 — win the pawn, target f7.',
      '', // ...Ng6
      'Bxf7 — sac, rip the king open.',
      '', // ...Kf8
      'Bxg6 — take the knight.',
      '', // ...Bxd4+
      'Kh1 — sidestep, stay winning.',
      '', // ...hxg6
    ],
  },

  // Vienna Gambit — 8...fxg3?? grabs a third pawn and opens f7 to the sac.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O h6 g3 fxg3 Bxf7+ Kf8 e5 dxe5 Bd5 Nf6 Nxe5 Qd6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4_d6_O-O_h6_g3:fxg3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'fxg3 grabs a third pawn, but it opens the f-file straight at f7 — and you are ready to strike.',
      'Bxf7+! The sac tears the king open; the f-file and your development lead do the rest.',
      '',
      'e5 — blow open the centre while the king is stuck on f8.',
      '',
      'Bd5 retreats the bishop to a monster post on the long diagonal.',
      '',
      'Nxe5 — centralise the knight; your pieces swarm the exposed king.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', // through fxg3 (opponent) at index 15
      'Bxf7 — sac, open the king.',
      '', // ...Kf8
      'e5 — blow open the centre.',
      '', // ...dxe5
      'Bd5 — monster bishop.',
      '', // ...Nf6
      'Nxe5 — centralise, swarm.',
      '', // ...Qd6
    ],
  },

  // Vienna — 7...Bh5?? leaves the bishop on the rim; g4 traps it / opens the h-file.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 h3 Bh5 g4 Nxg4 hxg4 Bxg4 Bb5 f5 Qe2 Qd7
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Nf6_d3_Bc5_f4_d6_Nf3_Bg4_h3:Bh5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'h3 quizzes the g4-bishop —',
      'Bh5 keeps the pin but parks the bishop on the rim, where a pawn storm can trap it. Strike.',
      'g4! Attack the bishop and pry open the h-file at Black’s king. The pin backfires.',
      'Nxg4 tries to muddy it —',
      'hxg4 wins the knight; the h-file is yours.',
      '',
      'Bb5 develops with tempo, pinning the c6-knight — up material, with the initiative and an open file at the king.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'h3 — quiz the bishop.',
      '', // ...Bh5
      'g4 — attack the bishop, open the h-file.',
      '', // ...Nxg4
      'hxg4 — win the knight.',
      '', // ...Bxg4
      'Bb5 — pin, develop, press.',
      '', '', '',
    ],
  },

  // Vienna Frankenstein deep — 8...Qg5?? wanders; d4 opens and the Nxc7+ fork lands.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qg5 d4 Qg4 Nxc7+ Kd8 Nxa8 Ne4 g3 Nf6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3_f5_Qd5:Qg5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qd5 centralises, hitting f5 —',
      'Qg5 sends the queen on a raid, but ignores the knight on b5 loaded on c7. Now you break.',
      'd4! Rip the centre open; the Nxc7+ fork is coming and Black can’t cover it all.',
      'Qg4 keeps the queen active —',
      'Nxc7+ — the royal fork: king and the a8-rook.',
      '',
      'Nxa8 wins the rook. Decisive, with Black’s king stuck in the centre.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qd5 — centralise.',
      '', // ...Qg5
      'd4 — break open, set up c7.',
      '', // ...Qg4
      'Nxc7 — the royal fork.',
      '', // ...Kd8
      'Nxa8 — win the rook.',
      '', '', '',
    ],
  },

  // Vienna Frankenstein — 6...e4?? lunges and hangs; Nxe4 wins it and forks d6.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Nf3 e4 Nxe4 g6 Nxd6+ Bxd6 Qh6 Bf8 Qf4 d5
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Be7_Nf3:e4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '',
      'Nf3 develops, eyeing e5 —',
      'e4? The pawn lunges forward but just hangs — and the d6-knight behind it is loose too.',
      'Nxe4! Win the pawn — and the knight forks into d6. Black’s loose pieces fall.',
      'g6 hits the queen —',
      'Nxd6+ — snap off the knight with check; you’re up material cleanly.',
      '',
      'Qh6 keeps the queen active on the dark squares.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      'Nf3 — develop, eye e5.',
      '', // ...e4
      'Nxe4 — win the pawn, fork d6.',
      '', // ...g6
      'Nxd6 — take the knight, check.',
      '', // ...Bxd6
      'Qh6 — keep harassing.',
      '', '', '',
    ],
  },

  // Ruy Closed — 6...O-O?? (with Re1 in) allows Bxc6 + Nxe5 to bag a clean pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 O-O Bxc6 bxc6 Nxe5 Bb7 d4 d5 exd5 cxd5
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Be7_Re1:O-O': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'O-O looks safe — but with the rook already on e1, it walks into a clean pawn grab.',
      'Bxc6! Trade, then snatch e5 — the e1-rook means Black can’t win the pawn back.',
      '',
      'Nxe5 collects the pawn — a lasting extra pawn.',
      '',
      'd4 builds the centre behind the extra pawn.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'Bxc6 — trade, then take e5.',
      '', 'Nxe5 — win the pawn.',
      '', 'd4 — build the centre.',
      '', '', '',
    ],
  },

  // Ruy Open — 9...Nxd4?? just loses a piece; the desperado tricks fizzle.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 Nxd4 Nxd4 Bb7 Nf3 Bd6 a4 O-O Nc3 Nxc3
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Nxe4_d4_b5_Bb3:Nxd4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxd4? Grabbing the pawn loses a piece — there’s no real follow-up.',
      'Nxd4 recaptures. You’re up a clean piece.',
      '',
      'Nf3 retreats the knight to safety, keeping the extra material.',
      '',
      'a4 chips at Black’s queenside to open lines while you’re up a piece.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxd4 — take the knight, up a piece.',
      '', 'Nf3 — retreat, keep the piece.',
      '', 'a4 — pry the queenside.',
      '', '', '',
    ],
  },

  // Ruy Open — 9...Bc5?? ignores the loose centre; Qxd5 wins material.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Bc5 Qxd5 Qxd5 Bxd5 Bb7 Bxe4 O-O-O Bg5 Rde8
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Nxe4_d4_b5_Bb3_d5_dxe5:Bc5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Bc5 develops but ignores the loose d5-pawn and the offside e4-knight. The queens come off with profit.',
      'Qxd5! Win the pawn and offer the trade — the recapture is the real point.',
      '',
      'Bxd5 — now the bishop rakes the long diagonal, hitting the e4-knight and the a8-rook.',
      '',
      'Bxe4 collects the knight. Up a piece with a monster bishop.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qxd5 — win the pawn, offer the trade.',
      '', 'Bxd5 — rake the diagonal, hit e4.',
      '', 'Bxe4 — win the knight.',
      '', '', '',
    ],
  },

  // Ruy Berlin (4.O-O a6) — 4...a6?? drops a pawn: Bxc6 dxc6 Nxe5 (Re1 makes
  // the ...Qd4 regain fail — Google-confirmed). playLine:
  // e4 e5 Nf3 Nc6 Bb5 Nf6 O-O a6 Bxc6 dxc6 Nxe5 Bc5 Nc3 h6 Nf3 Bg4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O:a6': {
    watch: [
      '', '', '', '', '', '', '',
      'a6 is the slip in this O-O-first order — the pawn-grab that follows can’t be answered.',
      'Bxc6! Trade, then take e5 — and the usual ...Qd4 regain fails to Re1. A clean pawn.',
      '',
      'Nxe5 wins the pawn; theory confirms Black can’t get it back.',
      '',
      'Nc3 develops, holding the extra pawn comfortably.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      'Bxc6 — trade, then take e5.',
      '', 'Nxe5 — win the pawn.',
      '', 'Nc3 — develop, hold the pawn.',
      '', '', '',
    ],
  },

  // Ruy Berlin Open — 9...Nxd4?? loses a piece; the f2 desperado fizzles.
  // playLine: e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nxd4 Nxd4 Bc5 Nb3 Bxf2+ Rxf2 Nxf2 Qf3 O-O
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4:Nxd4': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Nxd4? Grabbing the pawn just loses a piece — there’s no follow-up.',
      'Nxd4 takes the knight. You’re up a clean piece.',
      '',
      'Nb3 steps out of the bishop’s pin, keeping the extra piece.',
      'Black tries Bxf2+ as a desperado —',
      'Rxf2 — it fizzles; the material holds.',
      '',
      'Qf3 mops up the f2-knight and consolidates. Cleanly winning.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      'Nxd4 — take the knight.',
      '', 'Nb3 — dodge the pin.',
      '', 'Rxf2 — calmly take, stay up.',
      '', 'Qf3 — win f2, consolidate.',
      '',
    ],
  },

  // Ruy Berlin Open — 7...Nc4?? has no home; Qe2 gains time and the initiative.
  // playLine: e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nc4 Qe2 Nb6 Rd1 Qe7 Bg5 f6 Bh4 Bd7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4_Nd6_Bxc6_dxc6_dxe5:Nc4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nc4 looks active, but the knight has no stable home — you gain time hitting it.',
      'Qe2 eyes the c4-knight and clears d1 for the rook. Black must retreat and lose time.',
      '',
      'Rd1 seizes the open file with tempo.',
      '',
      'Bg5 develops with pressure on f6 and e7.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qe2 — hit the knight, clear d1.',
      '', 'Rd1 — seize the file.',
      '', 'Bg5 — develop with pressure.',
      '', '', '',
    ],
  },

  // Ruy Exchange — 5...Nf6?? forgets e5; Nxe5 bags the pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O Nf6 Nxe5 Bc5 Nc3 h6 Kh1 h5 Qe1 h4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O:Nf6': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Nf6 develops, but it forgets e5 — and in the Exchange that pawn is the whole fight.',
      'Nxe5! Snatch the pawn; the usual ...Qd4 fork doesn’t regain it here.',
      '',
      'Nc3 develops, holding the extra pawn.',
      '',
      'Kh1 tucks the king, calmly a pawn up.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      'Nxe5 — win the pawn.',
      '', 'Nc3 — develop, hold it.',
      '', 'Kh1 — tuck the king, consolidate.',
      '', '', '',
    ],
  },

  // Ruy Exchange — 6...Bd6?? overloads e5 with f6 played; dxe5 wins a pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 Bd6 dxe5 fxe5 Nxe5 Qh4 Nf3 Qh5 Nbd2 Ne7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4:Bd6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bd6 develops, but with f6 already played the e5-point is overloaded. Break it.',
      'dxe5! Open the centre — after the recaptures, e5 falls.',
      '',
      'Nxe5 wins the pawn, landing the knight on a dominant square.',
      '',
      'Nf3 calmly retreats, a pawn up with the safer king.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'dxe5 — break the centre.',
      '', 'Nxe5 — win the pawn, centralise.',
      '', 'Nf3 — retreat, stay up.',
      '', '', '',
    ],
  },

  // Ruy Exchange — 7...Bc5?? hangs to the Qh5+ fork, winning the bishop.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 Bc5 Qh5+ g6 Qxc5 Qe7 Qc3 c5 Nf3 Bg4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4:Bc5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Bc5 develops to a natural square — but it hangs to a check. The queen forks.',
      'Qh5+! Check and fork — the king and the loose c5-bishop at once. Black can’t save both.',
      '',
      'Qxc5 collects the bishop. Up a clean piece.',
      '',
      'Qc3 retreats to safety, consolidating the extra piece.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qh5 — check, fork the bishop.',
      '', 'Qxc5 — win the piece.',
      '', 'Qc3 — retreat, consolidate.',
      '', '', '',
    ],
  },

  // Ruy Exchange — 8...Bd6?? allows Qh5+, knocking Black’s coordination apart.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Bd6 Qh5+ g6 Qf3 Qe7 Bf4 Bxf4 Qxf4 b6
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4_c5_Nb3:Bd6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Bd6 develops, but it allows a disruptive check that knocks Black’s coordination apart.',
      'Qh5+! The check forces ...g6, weakening the kingside light squares for free.',
      '',
      'Qf3 retreats with the king already softened — you keep the initiative.',
      '',
      'Bf4 offers to trade Black’s good bishop; the resulting structure favours you.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qh5 — check, weaken g6.',
      '', 'Qf3 — retreat, keep the initiative.',
      '', 'Bf4 — trade off his good bishop.',
      '', '', '',
    ],
  },

  // Pirc Austrian — White's 8.Be3?? walks into Ng4 with tempo (student = Black).
  // playLine: e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 Be3 Ng4 Bd2 cxd4 Nb5 Ne3 Bxe3 dxe3 Nc3
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_f4_Bg7_Nf3_O-O_Bd3_Na6_O-O_c5:Be3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Be3? White develops the bishop into a tempo-loss — the knight jumps to g4 and hits it at once.',
      'Ng4! Hit the e3-bishop and gain time. White wastes moves while you seize the centre.',
      'Bd2 retreats —',
      'cxd4 — open the c-file and the centre while you’re a tempo up.',
      '',
      'Ne3! The knight forks in; White is forced to trade and damage his own structure.',
      '',
      'dxe3 — White’s left with wrecked pawns; you’re comfortably better.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Ng4 — hit the bishop, gain a tempo.',
      '', 'cxd4 — open the centre.',
      '', 'Ne3 — fork, wreck his structure.',
      '', 'dxe3 — and you’re clearly better.',
      '',
    ],
  },

  // Pirc 150-style — White's 7.e5?? is too slow in the opposite-side race; b4!
  // (student = Black). playLine: e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6 f4 b5 e5 b4 exf6 exf6 Bh4 bxc3 Qxc3 Nd7 Qxc6
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_Bg5_Bg7_Qd2_O-O_O-O-O_c6_f4_b5:e5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'e5? White lunges in the centre, but in this opposite-side race it’s too slow — your attack lands first.',
      'b4! Don’t recapture — strike the knight on c3 first. Your queenside attack is faster than anything White has.',
      'exf6 grabs the knight —',
      'exf6 — recapture and rip open the e-file toward White’s king.',
      '',
      'bxc3 — tear open the c-file; White’s king on c1 is suddenly freezing.',
      '',
      'Nd7 brings the last piece into the attack. You’re winning the race.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'b4 — strike c3 first, race him.',
      '', 'exf6 — open the e-file.',
      '', 'bxc3 — tear open his king.',
      '', 'Nd7 — bring the last piece.',
      '',
    ],
  },

  // Pirc g3 system — White's Be3?? again invites Ng4 (student = Black).
  // playLine: e4 d6 d4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nge2 e5 O-O Nc6 Be3 Ng4 Qd2 Nxe3 fxe3 Bh6 d5 Nb8 h3
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_g3_Bg7_Bg2_O-O_Nge2_e5_O-O_Nc6:Be3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Be3? Again the bishop walks into Ng4 — and here it costs White even more tempo.',
      'Ng4! Hit the bishop. White can’t hold it without conceding the bishop pair and a damaged structure.',
      '',
      'Nxe3 — take the bishop; the recapture wrecks White’s f-pawns.',
      '',
      'Bh6 — pile onto the dark squares White just weakened. Your bishop is a monster.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Ng4 — hit the bishop.',
      '', 'Nxe3 — take it, wreck his pawns.',
      '', 'Bh6 — rule the dark squares.',
      '', '', '',
    ],
  },

  // Pirc Austrian — White's 8.O-O?? castles into the tension; cxd4 strikes
  // (student = Black). playLine: e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5 Nfd7 Be2 c5 O-O cxd4 Qxd4 Nc6 Qf2 dxe5 Rb1 Qa5 h3
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_f4_Bg7_Nf3_O-O_e5_Nfd7_Be2_c5:O-O': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'O-O? White castles into the central tension instead of resolving it. Strike now.',
      'cxd4 — open the centre with tempo; the queen recapture walks into a hit.',
      '',
      'Nc6! Develop with tempo, kicking the queen off its post.',
      '',
      'dxe5 — win the e5-pawn. You’ve untangled with the extra pawn and the freer game.',
      '',
      'Qa5 activates the queen at the loose queenside — comfortably better.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'cxd4 — open the centre.',
      '', 'Nc6 — develop, kick the queen.',
      '', 'dxe5 — win the pawn.',
      '', 'Qa5 — activate, press.',
      '',
    ],
  },

  // ── CRUSHES I OWED — full-strength, no disclaimer ──────────────────────────

  // Vienna Frankenstein — 7...Nd4?? ignores the loaded Nb5; a forcing combo wins.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 Nd4 Nxd6+ Ke7 Nxc8+ Rxc8 Qxf7+ Kd6 Qd5+ Ke7
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3:Nd4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nd4? Black centralises the knight but ignores the loaded Nb5 — now a forcing sequence wins outright.',
      'Nxd6+! Fork the king and grab the bishop — the start of a decisive combination.',
      '',
      'Nxc8+ — the other bishop falls too, the king flushed into the open.',
      '',
      'Qxf7+ — collect a pawn with check; the king is hunted.',
      '',
      'Qd5+ — the net tightens. You are winning by a mountain of material.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxd6 — fork, take the bishop.',
      '', 'Nxc8 — take the other bishop.',
      '', 'Qxf7 — check, grab the pawn.',
      '', 'Qd5 — tighten the net.',
      '',
    ],
  },

  // Vienna Frankenstein — 6...d6?? abandons the trapped f2-queen; Nxf2 wins it.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Kf8 Nh3 d6 Nxf2 Bxg4+ Nxg4 h5 Nge3 Bxe3 Nxe3 Nf6
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5_Qxf2+_Kd1_Kf8_Nh3:d6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd6?? Black ignores his own queen, stranded deep on f2. Snap it off.',
      'Nxf2! Win the queen. Black gets a bishop and a check for it, but you come out a clear piece ahead.',
      'Black grabs your queen with check —',
      'Nxg4 recaptures the bishop. The dust settles: you are up a piece.',
      '',
      'Nge3 brings the knight back into play, consolidating the extra material.',
      '',
      'Nxe3 — keep it simple, cleanly winning.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxf2 — win the queen.',
      '', 'Nxg4 — recapture, a piece up.',
      '', 'Nge3 — bring the knight back.',
      '', 'Nxe3 — consolidate.',
      '',
    ],
  },

  // ── WEAKER, POSITIONAL gems — each OPENS with the honest disclaimer ─────────

  // Caro Fantasy — Qb3 is only a small inaccuracy (+0.75). playLine:
  // e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6 Qb3 O-O Nbd2 b5 Bd3 Nc5 Qc2 Nxd3 Qxd3
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7_O-O_Ngf6_c3_Bd6:Qb3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Be straight: this is a quieter weapon than the tactical traps — no material falls. But Qb3 is a genuine inaccuracy, the queen drifting to the rim doing little. Punish it the simplest way.',
      'O-O — just castle. Harmonious pieces, a sound centre, and White’s queen offside: a small but real, lasting edge.',
      '', '', '',
      'Nc5 — the knight heads for d3, angling to trade off White’s good bishop.',
      '',
      'Nxd3 — make the swap; the bishop pair and the better minor pieces are yours.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'O-O — castle; you’re simply better.',
      '', '', '',
      'Nc5 — head for d3.',
      '', 'Nxd3 — win the bishop pair.',
      '',
    ],
  },

  // Ruy Berlin Open — 5...bxc6 (+0.85): structure, not material. playLine:
  // e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 bxc6 dxe5 Nf5 Bg5 Be7 Bxe7 Nxe7 Nc3 O-O
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4_Nd6_Bxc6:bxc6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'A smaller edge than the crushes — no piece won, just structure. But after bxc6 Black’s pawns are doubled and limp, and you grab a free tempo.',
      'dxe5 — hit the d6-knight and win time; your healthy structure against his damaged one is the whole point.',
      '',
      'Bg5 develops with a pin, pressing the awkward black pieces.',
      '',
      'Bxe7 trades into a comfortable edge: better pawns, easier game.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'dxe5 — hit the knight, gain time.',
      '', 'Bg5 — develop, pin.',
      '', 'Bxe7 — trade into a better structure.',
      '', '', '',
    ],
  },

  // Ruy Closed — 17...d5 premature (+0.76). playLine:
  // e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d5 exd5 Na5 Ba2 b3 Bxb3 Nxb3 cxb3 Nxd5
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Be7_Re1_b5_Bb3_O-O_a4_b4_d3:d5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'A quiet one — no tactic, no won piece. But d5 is premature: exd5 wins a pawn briefly, and even after Black regains it you keep the structural pull.',
      'exd5 — take the pawn and open the centre on your terms.',
      '',
      'Ba2 keeps the bishop on its strong diagonal.',
      '',
      'Bxb3 — the dust clears with you holding the better structure and the cleaner position.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'exd5 — take the pawn, open the centre.',
      '', 'Ba2 — keep the diagonal.',
      '', 'Bxb3 — settle into the better game.',
      '', '', '',
    ],
  },

  // Ruy Exchange (3...a6 4.Bxc6) — bxc6 (+0.59), the gentlest edge. playLine:
  // e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 bxc6 d4 exd4 Qxd4 Qf6 Qa4 Bc5 Nc3 Ne7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6:bxc6': {
    watch: [
      '', '', '', '', '', '', '',
      'The gentlest edge in the set — be honest: no material, and Black is fine in plenty of lines. But recapturing with bxc6 lets you take the centre and a slight, lasting pull.',
      'd4 — strike the centre immediately, before Black coordinates.',
      '',
      'Qxd4 centralises with tempo.',
      '',
      'Qa4 keeps the queen active, pressuring the loose queenside pawns.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      'd4 — take the centre.',
      '', 'Qxd4 — centralise.',
      '', 'Qa4 — press the weak pawns.',
      '', '', '',
    ],
  },

  // Ruy Exchange endgame — Bd6 (+0.54), a nudge. playLine:
  // e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bd6 Na5 b6 Nc4 Be7 Bf4 Bd8 Nc3 Be6
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4_c5_Nb3_Qxd1_Rxd1:Bd6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'The smallest edge here — honestly, it’s a nudge, not a knockout. But Bd6 lets your knight reroute to a dominant square with tempo.',
      'Na5 — heading for the c4-outpost, where the knight sits unchallenged.',
      '',
      'Nc4 reaches the outpost, eyeing the dark squares and Black’s weak pawns.',
      '',
      'Bf4 offers to trade Black’s only active piece, leaving you the cleaner game.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Na5 — reroute toward c4.',
      '', 'Nc4 — seize the outpost.',
      '', 'Bf4 — trade his active piece.',
      '', '', '',
    ],
  },

  // Vienna — 6...Ng4 (+0.76), a modest sac-edge. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Ng4 Ng5 h6 Bxf7+ Kf8 f5 hxg5 Qxg4 Kxf7
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Nf6_d3_Bc5_f4_d6_Nf3:Ng4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'A modest edge, not a crush — it runs through a sac that nets only a small plus. But Ng4 overreaches, and you turn the tables on f7.',
      'Ng5! Hit f7 — knight and bishop gang up on Black’s weakest point.',
      '',
      'Bxf7+ — the sac opens the king for a lasting initiative and a pawn.',
      '',
      'f5 keeps the attack rolling while you’re materially fine and the king is stuck.',
      '',
      'Qxg4 regains the piece; you’re left a touch better with the safer king.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'Ng5 — gang up on f7.',
      '', 'Bxf7 — open the king.',
      '', 'f5 — keep it rolling.',
      '', 'Qxg4 — regain the piece, stay better.',
      '',
    ],
  },

  // Vienna — 7...Bxf3 (+0.88), structural. playLine:
  // e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bxf3 Qxf3 a5 Ne2 Nc6 c3 Nd7 a3 Kh8
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Bc5_d3_d6_Nf3_O-O_O-O_Bg4_h3:Bxf3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'A quiet, structural edge — no material won. But Bxf3 hands you the bishop pair for free, and that is a real, durable asset.',
      'Qxf3 — recapture toward the centre; two bishops against the knights in an open position.',
      '',
      'Ne2 reroutes the knight toward the kingside, improving your worst piece.',
      '',
      'c3 builds a broad pawn centre; the bishops will love the open lines.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qxf3 — recapture, keep the bishop pair.',
      '', 'Ne2 — reroute the knight.',
      '', 'c3 — build the centre.',
      '', '', '',
    ],
  },

  // Vienna g3 — 6...e4 (+0.85), a long-term weakness. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 e4 Qe2 f5 d3 Qf6 O-O Bd6 dxe4 O-O
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3:e4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'A positional edge, not a tactic — say so plainly. e4 lunges the pawn forward, where it becomes a long-term weakness you round up.',
      'Qe2 — pressure the overextended e4-pawn; you’ll undermine it with d3.',
      '',
      'd3 — challenge e4 at its base; it can’t be held.',
      '',
      'O-O finishes development; you win or cripple e4 with the better game.',
      '',
      'dxe4 collects it — a clean structural plus.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qe2 — pressure e4.',
      '', 'd3 — hit it at the base.',
      '', 'O-O — finish developing.',
      '', 'dxe4 — win the pawn.',
      '',
    ],
  },

  // Vienna g3 — 8...Bg4 (+0.62), a tempo. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 Bc5 O-O Bg4 h3 Bxf3 Qxf3 O-O a4 Bd6 Qd5 Rb8
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3_Bc5_O-O:Bg4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'A small edge — no win, just a tempo and the bishop pair. Bg4 pins nothing important here, so you simply question it.',
      'h3 — put the question to the bishop; it must trade or retreat awkwardly.',
      '',
      'Qxf3 recaptures, and you own the two bishops in an open centre.',
      '',
      'a4 gains queenside space, pressing the long-term plus.',
      '',
      'Qd5 centralises into a comfortable pull.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'h3 — question the bishop.',
      '', 'Qxf3 — take the bishop pair.',
      '', 'a4 — gain space.',
      '', 'Qd5 — centralise.',
      '',
    ],
  },

  // Vienna g3 — 9...f5 (+0.58), the slightest plus. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 Bc5 O-O O-O d3 f5 Nxe5 Nxe5 d4 Bd6 dxe5 Bxe5 Ba3 Re8
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3_Bc5_O-O_O-O_d3:f5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'The slightest edge here — be honest, it’s a small plus. But f5 loosens Black’s centre, and Nxe5 exploits the moment.',
      'Nxe5 — grab the e5-pawn while it hangs; the little tactics favour you.',
      '',
      'd4 — hit the c5-bishop and clamp the centre.',
      '',
      'dxe5 keeps a healthy extra structure and the bishop pair.',
      '',
      'Ba3 develops with a pin into a pleasant edge.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxe5 — grab the pawn.',
      '', 'd4 — hit the bishop, clamp.',
      '', 'dxe5 — keep the better structure.',
      '', 'Ba3 — develop with a pin.',
      '',
    ],
  },
};

export function getGemNarration(gemId: string): GemNarration | null {
  return GEM_NARRATION[gemId] ?? null;
}
export function hasGemNarration(gemId: string): boolean {
  return gemId in GEM_NARRATION;
}
