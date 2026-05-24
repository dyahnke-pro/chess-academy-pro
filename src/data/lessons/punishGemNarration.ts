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
};

export function getGemNarration(gemId: string): GemNarration | null {
  return GEM_NARRATION[gemId] ?? null;
}
export function hasGemNarration(gemId: string): boolean {
  return gemId in GEM_NARRATION;
}
