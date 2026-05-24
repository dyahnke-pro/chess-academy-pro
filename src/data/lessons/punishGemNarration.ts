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
};

export function getGemNarration(gemId: string): GemNarration | null {
  return GEM_NARRATION[gemId] ?? null;
}
export function hasGemNarration(gemId: string): boolean {
  return gemId in GEM_NARRATION;
}
