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
  /** Independent-verification refs (concept:<id> | book:<openingId> | https URL)
   *  proving the IDEAS were checked against the books / online, not training
   *  recall. Gated by narrationSources + punishGems.test (David 2026-05-25). */
  sources?: string[];
}

export const GEM_NARRATION: Record<string, GemNarration> = {
  // Two Knights (student = Black). Max Lange: 6.Bb5 Ne4, White lunges f3? —
  // ...Qh4+ rips open the uncastled king. Engine-confirmed, Black wins material.
  'two-knights-defence:e4_e5_Nf3_Nc6_Bc4_Nf6_d4_exd4_e5_d5_Bb5_Ne4_Nxd4_Bd7_Bxc6_bxc6:f3': {
    sources: ['concept:pos-king-safety', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/Two_Knights_Defense,_Max_Lange_Attack'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      '…Ne4 — Black plants the knight on the central e4-outpost, already eyeing f2 and g3.',
      '', '', '', '',
      'f3? White jabs at the e4-knight, but with the king still stuck in the centre this only tears open the h4-diagonal.',
      '…Qh4+ — the queen lands with check on the freshly-opened diagonal; White has no safe shelter.',
      '',
      '…Nxg3 — the knight crashes in; after hxg3 …Qxg3+ the White king is stripped bare and Black stays up material.',
      '',
      '…Qxg5 — the bishop lunge just hangs a piece; Black scoops it up.',
      '',
      '…Qxg3+ — material to the good with the White king marooned on d2. The f3 push lost on the spot.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Ne4 — central outpost, eye f2/g3', '', '', '', '',
      '',
      'Qh4+ — strike the open diagonal',
      '',
      'Nxg3 — crash in, strip the king',
      '',
      'Qxg5 — take the free bishop',
      '',
      'Qxg3+ — up material, king stranded',
      '',
    ],
  },
  // Two Knights — Traxler Counterattack (4…Bc5). After 5.Bxf7+ Ke7, White
  // must save the bishop with 6.Bd5/Bb3; 6.O-O? lets …h6 trap the g5-knight.
  'two-knights-defence:e4_e5_Nf3_Nc6_Bc4_Nf6_Ng5_Bc5_Bxf7+_Ke7:O-O': {
    sources: ['concept:tac-trap', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Two_Knights_Defense,_Traxler_Counterattack'],
    watch: [
      '', '', '', '', '', '', '',
      '…Bc5 — the Traxler Counterattack: Black ignores the threat to f7 and aims his own pieces at White’s king.',
      '',
      '…Ke7 — declining the bishop; now the f7-bishop and the g5-knight are both loose, and …h6 is coming.',
      'O-O? White castles into the storm instead of rescuing a piece with Bd5 — the g5-knight has no escape.',
      '…h6 — the knight is trapped: it must abandon the f7-bishop, and Black wins material.',
      '',
      '…Kxf7 — collecting the bishop; the stranded h7-knight is dead weight.',
      '',
      '…Qxf6 — Black emerges a clean piece up with a safe king and the full centre.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '',
      'Bc5 — the Traxler, hit back', '',
      'Ke7 — decline, leave them loose',
      '',
      'h6 — trap the g5-knight',
      '',
      'Kxf7 — win the bishop',
      '',
      'Qxf6 — a piece up, consolidate',
      '', '', '',
    ],
  },
  // Two Knights — Max Lange: 6.Bb5 Ne4 7.Qxd4? grabs the pawn in the open
  // centre — …Bc5 hits the queen with tempo and …Bxf2+ drags the king out.
  'two-knights-defence:e4_e5_Nf3_Nc6_Bc4_Nf6_d4_exd4_e5_d5_Bb5_Ne4:Qxd4': {
    sources: ['concept:tac-double-attack', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Two_Knights_Defense,_Max_Lange_Attack'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      '…Ne4 — the knight seizes the central outpost; the Max Lange tension is set.',
      'Qxd4? grabbing the pawn drags the queen into the open centre, inviting a hit with tempo.',
      '…Bc5 — attacking the d4-queen with gain of tempo, the bishop already raking toward f2.',
      '',
      '…Bxf2+ — crashing through with check; the White king is dragged out onto e2.',
      '',
      '…O-O — Black tucks the king away while White’s is stranded in the centre.',
      '',
      '…Nxc3+ — ripping open the king’s cover; Black is up a pawn with a winning attack.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Ne4 — central outpost',
      '',
      'Bc5 — hit the queen, tempo',
      '',
      'Bxf2+ — crash in with check',
      '',
      'O-O — your king safe, his isn’t',
      '',
      'Nxc3+ — tear open the king',
      '',
    ],
  },
  // Philidor (student = Black). White's premature Bg5 is a FAKE pin — the
  // f6-knight only screens the e7-bishop, not the king, and e4 hangs: …Nxe4
  // wins the pawn. Two common move orders.
  'philidor-defence:e4_e5_Nf3_d6_Bc4_Be7_d4_exd4_Nxd4_Nf6_Nc3_O-O:Bg5': {
    sources: ['book:philidor-defence', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'Bg5? — the pin is an illusion: the f6-knight only screens the e7-bishop, not the king, and the e4-pawn is left undefended.',
      '…Nxe4 — snapping off the loose e4-pawn; the “pinned” knight was never truly pinned.',
      '',
      '…Qxe7 — recapturing the bishop, a clean pawn to the good.',
      '',
      '…Qd8 — calmly sidestepping the Nd5 fork; the knight bites on granite.',
      '',
      '…Re8 — Black consolidates the extra pawn with a comfortable game.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '',
      'Nxe4 — the pin is fake, take e4',
      '',
      'Qxe7 — a clean pawn up',
      '',
      'Qd8 — dodge the Nd5 fork',
      '',
      'Re8 — consolidate',
      '',
    ],
  },
  'philidor-defence:e4_e5_Nf3_d6_d4_exd4_Nxd4_Nf6_Nc3_Be7:Bg5': {
    sources: ['book:philidor-defence', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '',
      'Bg5? — the pin is only skin-deep: Nf6 screens the e7-bishop, not the king, and e4 hangs.',
      '…Nxe4 — taking the free e4-pawn; the knight even eyes the g5-bishop in passing.',
      '',
      '…Qxe7 — a clean pawn up after the trade.',
      '',
      '…c6 — blunting the Bb5 check; the extra pawn stands.',
      '',
      '…Qxe4+ — regaining everything with check, a pawn ahead and the better centre.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      '',
      'Nxe4 — fake pin, grab e4',
      '',
      'Qxe7 — a clean pawn up',
      '',
      'c6 — block the check',
      '',
      'Qxe4+ — a pawn ahead, with check',
      '',
    ],
  },
  // Petrov (student = Black). Main line: after …Nb4, White's Qa4+? walks into
  // …b5 forking the queen and c4.
  'petrov-defence:e4_e5_Nf3_Nf6_Nxe5_d6_Nf3_Nxe4_d4_d5_Bd3_Nc6_O-O_Be7_c4_Nb4:Qa4+': {
    sources: ['book:petrov-defence', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '…Nb4 — the knight leaps in, eyeing c2 and d3; Black is already comfortable.',
      'Qa4+? — the check walks straight into a pawn fork; the queen has no good post on a4.',
      '…b5 — forking the a4-queen and the c4-pawn at once; White must lose time and a pawn.',
      '',
      '…bxc4 — collecting the pawn; Black is a clean pawn up with the freer game.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nb4 — leap in, eye c2/d3',
      '',
      'b5 — fork the queen and c4',
      '',
      'bxc4 — a clean pawn up',
      '', '', '', '', '',
    ],
  },
  // Petrov — Cochrane Gambit (4.Nxf7?!). White sacs the knight for two pawns
  // and Black's open king; it is unsound — accurate defence keeps the piece.
  'petrov-defence:e4_e5_Nf3_Nf6_Nxe5_d6_Nxf7_Kxf7_d4_Be7:Bc4+': {
    sources: ['book:petrov-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence,_Cochrane_Gambit'],
    watch: [
      '', '', '', '', '', '',
      'Nxf7 — the Cochrane Gambit: White gives up the knight for two pawns and your exposed king. It is unsound; defend with care and the extra piece tells.',
      '', '', '',
      'Bc4+? — the most-played check, but it only invites …d5, blunting it with tempo.',
      '…d5 — slamming the door on the check and hitting the bishop; the extra material stays.',
      '',
      '…Nxe4 — snapping another central pawn; Black consolidates a winning edge.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      '',
      'd5 — block the check, hit the bishop',
      '',
      'Nxe4 — grab the centre, stay up',
      '', '', '', '', '',
    ],
  },
  // Petrov — Steinitz 3.d4 Nxe4 4.Bc4? — …d5 hits the bishop with tempo and
  // anchors the e4-knight; Black wins the d4-pawn.
  'petrov-defence:e4_e5_Nf3_Nf6_d4_Nxe4:Bc4': {
    sources: ['book:petrov-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
    watch: [
      '', '', '', '', '',
      '…Nxe4 — grabbing the e4-pawn; in this 3.d4 line the knight is well supported.',
      'Bc4? — the bishop lunges, but …d5 hits it with tempo while shoring up the e4-knight.',
      '…d5 — gaining a tempo on the bishop and locking the e4-knight into place.',
      '',
      '…exd4 — pocketing the d4-pawn; Black emerges a clean pawn ahead.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '',
      'Nxe4 — grab e4, it holds',
      '',
      'd5 — hit the bishop, hold e4',
      '',
      'exd4 — a clean pawn up',
      '', '', '', '', '',
    ],
  },
  // Four Knights (student = White). Spanish Four Knights symmetry-break: after
  // 5…a6?, Bxc6 removes e5's only defender, then Nxe5 wins the pawn outright.
  'four-knights-game:e4_e5_Nf3_Nc6_Nc3_Nf6_Bb5_Bb4_O-O:a6': {
    sources: ['book:four-knights-game', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
    watch: [
      '', '', '', '', '', '', '', '', '',
      '…a6? — Black breaks the symmetry first, but it loosens c6 and gifts White a concrete tempo.',
      'Bxc6 — striking first: the c6-knight was the sole defender of e5.',
      '',
      'Nxe5 — collecting the pawn. After …Bxc3 dxc3 everything holds; White is simply up material.',
      '', '', '',
      'd4 — rolling the centre, a clean pawn to the good.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      'Bxc6 — remove e5’s defender',
      '',
      'Nxe5 — win the pawn',
      '', '', '',
      'd4 — roll the centre, a pawn up',
      '',
    ],
  },
  // Najdorf (student = Black). English Attack 6.f3 e5: White's Nf5? has no
  // support — …d5 strikes the centre, chases the knights, and wins a pawn.
  'sicilian-najdorf:e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6_f3_e5:Nf5': {
    sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      '…e5 — the Najdorf thrust, kicking the d4-knight off its perch.',
      'Nf5? — the knight lunges to f5 instead of the steady Nb3, but it has no support there.',
      '…d5 — striking the centre with tempo; the c3-knight is hit and the f5-knight is stranded.',
      '',
      '…d4 — rolling the pawn on, chasing the c3-knight and seizing space.',
      '',
      '…Nxd5 — trading down; Black emerges with the bigger centre.',
      '',
      '…Qxd5 — collecting the pawn, a clean material edge in hand.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'e5 — kick the d4-knight',
      '',
      'd5 — strike, hit c3 and f5',
      '',
      'd4 — chase, grab space',
      '',
      'Nxd5 — trade, stay ahead',
      '',
      'Qxd5 — a pawn up',
      '',
    ],
  },
  // Najdorf (student = Black). 6.Be3 Ng4: White's Bf4? walks into …e5 forking
  // the bishop and the d4-knight, with the …Nxf2! fork resource.
  'sicilian-najdorf:e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6_Be3_Ng4:Bf4': {
    sources: ['concept:tac-fork', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      '…Ng4 — challenging the e3-bishop, daring it to pick a square.',
      'Bf4? — the bishop sidesteps to f4 and walks straight into a central break.',
      '…e5 — forking the f4-bishop and the d4-knight; White cannot save both cleanly.',
      '',
      '…Nxf2! — the knight crashes in, forking the d1-queen and the h1-rook.',
      '',
      '…exf4 — Black has won the f2-pawn and the bishop for the knight: a clean extra pawn, White’s king flushed out.',
      '',
      '…Nc6 — developing with tempo; the king stranded on f2 has no shelter.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Ng4 — challenge the bishop',
      '',
      'e5 — fork bishop and knight',
      '',
      'Nxf2 — crash in, fork Q+R',
      '',
      'exf4 — win bishop and pawn',
      '',
      'Nc6 — develop, king exposed',
      '',
    ],
  },
  // Caro — White's f3 (Fantasy) but f3?? offered too loosely: exf3 just
  // wins a pawn. playLine: e4 c6 d4 d5 Nc3 dxe4 f3 exf3 Nxf3 Nf6 Bd3 Bg4 h3 Bxf3 Qxf3
  'caro-kann:e4_c6_d4_d5_Nc3_dxe4:f3': {
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
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
      '', // f3 (opponent)
      'exf3 — grab the free pawn.',
      '', // Nxf3 (opponent)
      '', // ...Nf6
      '', // Bd3 (opponent)
      'Bg4 — pin the knight.',
      '', // h3 (opponent)
      'Bxf3 — trade it off, stay a pawn up.',
      '', // Qxf3 (opponent)
    ],
  },

  // Caro Fantasy — after f3 dxe4 fxe4 e5, White's c3?? ignores the centre
  // and the king is caught. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 c3 Qh4+ Kd2 Nf6 Nf3 Qf2+ Be2 Nxe4+ Kc2
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5:c3': {
    sources: ['book:caro-kann', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
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
      '', // c3 (opponent)
      'Qh4 — check, and chase the king.',
      '', // Kd2
      'Nf6 — develop, hit e4.',
      '', // Nf3
      'Qf2 — check, keep the initiative.',
      '', // Be2
      'Nxe4 — win the pawn, with check.',
      '', // Kc2
    ],
  },
  // Caro Fantasy — White's Bxf7+?? is an UNSOUND sac; just take it and you're
  // up a piece. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 Bxf7+ Kxf7 O-O Ke8 Nbd2 Nh6 h3 Bh5 c3
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7:Bxf7+': {
    sources: ['book:caro-kann', 'concept:tac-sacrifice', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
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
      '', // Bxf7+ (opponent)
      'Kxf7 — just take the bishop.',
      '', // O-O
      'Ke8 — walk the king home.',
      '', // Nbd2
      'Nh6 — develop, consolidate.',
      '', // h3
      'Bh5 — keep the bishop, stay a piece up.',
      '', // c3
    ],
  },

  // Caro Fantasy — White's Nc3?? leaves d4 loose with the centre tense; exd4
  // wins it. playLine: e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 Nc3 exd4 Ne2 Bc5 Kh1 Qe7 Ng3 O-O-O Qd3
  'caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7_O-O_Ngf6:Nc3': {
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
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
      '', // Nc3 (opponent)
      'exd4 — win the centre pawn.',
      '', // Ne2
      'Bc5 — guard d4, eye f2.',
      '', // Kh1
      'Qe7 — connect, prepare to castle long.',
      '', // Ng3
      'Castle long — king safe, a pawn up.',
      '', // Qd3
    ],
  },

  // Vienna — Black grabs e4, then g6?? drops e5 with check and loses a piece.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 g6 Qxe5+ Qe7 Qxe4 Qxe4+ Nxe4 c6 b3 Bg7
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5:g6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — Qf6?? parks the queen on Nd5's fork square.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Qf6 Nd5 Qg6 Qxg6 hxg6 Nxc7+ Kd8 Nxa8 b6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3:Qf6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — Qf6?? ignores the Nb5 already eyeing c7.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 Qf6 Nxc7+ Kd8 Nxa8 Qg6 Qxg6 hxg6 Ne2 b6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5:Qf6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna — Nf6?? blocks f7 but drops g7. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Nf6 Qxg7 Rf8 d3 Nd4 Nf3 c6 Nxe5 d5
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4:Nf6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — Qg6?? saves the queen but not the c7-fork.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qg6 Qxg6 hxg6 Nxc7+ Kd8 Nxa8 Nf6 d3 d5
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5:Qg6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — Bb6?? takes the eye off g7. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Bb6 Qxg7 d6 Nf3 Bh3 Nxb6 cxb6 Qxf7+ Kd8
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5_Qxf2+_Kd1:Bb6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Gambit Accepted — d6?? is too slow; seize the centre with d4.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 d6 d4 g5 d5 Ne5 Bb5+ c6 dxc6 bxc6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3:d6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Gambit — Bc5?? walks into d4 and a kingside crash.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bc5 d4 Be7 h4 d6 Nxg5 Bxg5 Qh5 Qe7
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4:Bc5': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Gambit — Nge7?? leaves g5 hanging; Nxg5 + kingside storm.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 Nge7 Nxg5 Rf8 Qh5 Ng6 Nxh7 Qh4+ Qxh4 Nxh4
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4:Nge7': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Gambit — Nge7?? (castled version); Nxg5 then the Bxf7+ sac.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O Nge7 Nxg5 Ng6 Bxf7+ Kf8 Bxg6 Bxd4+ Kh1 hxg6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4_d6_O-O:Nge7': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Gambit — fxg3?? grabs a third pawn and opens f7 to the sac.
  // playLine: e4 e5 Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O h6 g3 fxg3 Bxf7+ Kf8 e5 dxe5 Bd5 Nf6 Nxe5 Qd6
  'vienna-game:e4_e5_Nc3_Nc6_f4_exf4_Nf3_g5_Bc4_Bg7_d4_d6_O-O_h6_g3:fxg3': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna — Bh5?? leaves the bishop on the rim; g4 traps it / opens the h-file.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 h3 Bh5 g4 Nxg4 hxg4 Bxg4 Bb5 f5 Qe2 Qd7
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Nf6_d3_Bc5_f4_d6_Nf3_Bg4_h3:Bh5': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein deep — Qg5?? wanders; d4 opens and the Nxc7+ fork lands.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qg5 d4 Qg4 Nxc7+ Kd8 Nxa8 Ne4 g3 Nf6
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3_f5_Qd5:Qg5': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — e4?? lunges and hangs; Nxe4 wins it and forks d6.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Be7 Nf3 e4 Nxe4 g6 Nxd6+ Bxd6 Qh6 Bf8 Qf4 d5
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Be7_Nf3:e4': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Ruy Closed — O-O?? (with Re1 in) allows Bxc6 + Nxe5 to bag a clean pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 O-O Bxc6 bxc6 Nxe5 Bb7 d4 d5 exd5 cxd5
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Be7_Re1:O-O': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Open — Nxd4?? just loses a piece; the desperado tricks fizzle.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 Nxd4 Nxd4 Bb7 Nf3 Bd6 a4 O-O Nc3 Nxc3
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Nxe4_d4_b5_Bb3:Nxd4': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Open — Bc5?? ignores the loose centre; Qxd5 wins material.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Bc5 Qxd5 Qxd5 Bxd5 Bb7 Bxe4 O-O-O Bg5 Rde8
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Nxe4_d4_b5_Bb3_d5_dxe5:Bc5': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Berlin (O-O a6) — a6?? drops a pawn: Bxc6 dxc6 Nxe5 (Re1 makes
  // the ...Qd4 regain fail — Google-confirmed). playLine:
  // e4 e5 Nf3 Nc6 Bb5 Nf6 O-O a6 Bxc6 dxc6 Nxe5 Bc5 Nc3 h6 Nf3 Bg4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O:a6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Berlin Open — Nxd4?? loses a piece; the f2 desperado fizzles.
  // playLine: e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nxd4 Nxd4 Bc5 Nb3 Bxf2+ Rxf2 Nxf2 Qf3 O-O
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4:Nxd4': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Berlin Open — Nc4?? has no home; Qe2 gains time and the initiative.
  // playLine: e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nc4 Qe2 Nb6 Rd1 Qe7 Bg5 f6 Bh4 Bd7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4_Nd6_Bxc6_dxc6_dxe5:Nc4': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Exchange — Nf6?? forgets e5; Nxe5 bags the pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O Nf6 Nxe5 Bc5 Nc3 h6 Kh1 h5 Qe1 h4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O:Nf6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Exchange — Bd6?? overloads e5 with f6 played; dxe5 wins a pawn.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 Bd6 dxe5 fxe5 Nxe5 Qh4 Nf3 Qh5 Nbd2 Ne7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4:Bd6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Exchange — Bc5?? hangs to the Qh5+ fork, winning the bishop.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 Bc5 Qh5+ g6 Qxc5 Qe7 Qc3 c5 Nf3 Bg4
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4:Bc5': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Exchange — Bd6?? allows Qh5+, knocking Black’s coordination apart.
  // playLine: e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Bd6 Qh5+ g6 Qf3 Qe7 Bf4 Bxf4 Qxf4 b6
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4_c5_Nb3:Bd6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Pirc Austrian — White's Be3?? walks into Ng4 with tempo (student = Black).
  // playLine: e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 Be3 Ng4 Bd2 cxd4 Nb5 Ne3 Bxe3 dxe3 Nc3
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_f4_Bg7_Nf3_O-O_Bd3_Na6_O-O_c5:Be3': {
    sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
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

  // Pirc 150-style — White's e5?? is too slow in the opposite-side race; b4!
  // (student = Black). playLine: e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6 f4 b5 e5 b4 exf6 exf6 Bh4 bxc3 Qxc3 Nd7 Qxc6
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_Bg5_Bg7_Qd2_O-O_O-O-O_c6_f4_b5:e5': {
    sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
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
    sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
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

  // Pirc Austrian — White's O-O?? castles into the tension; cxd4 strikes
  // (student = Black). playLine: e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5 Nfd7 Be2 c5 O-O cxd4 Qxd4 Nc6 Qf2 dxe5 Rb1 Qa5 h3
  'pirc-defence:e4_d6_d4_Nf6_Nc3_g6_f4_Bg7_Nf3_O-O_e5_Nfd7_Be2_c5:O-O': {
    sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
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

  // Vienna Frankenstein — Nd4?? ignores the loaded Nb5; a forcing combo wins.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 Nd4 Nxd6+ Ke7 Nxc8+ Rxc8 Qxf7+ Kd6 Qd5+ Ke7
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3:Nd4': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna Frankenstein — d6?? abandons the trapped f2-queen; Nxf2 wins it.
  // playLine: e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Kf8 Nh3 d6 Nxf2 Bxg4+ Nxg4 h5 Nge3 Bxe3 Nxe3 Nf6
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Bc5_Qg4_Qf6_Nd5_Qxf2+_Kd1_Kf8_Nh3:d6': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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
    sources: ['book:caro-kann', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
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

  // Ruy Berlin Open — bxc6 (+0.85): structure, not material. playLine:
  // e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 bxc6 dxe5 Nf5 Bg5 Be7 Bxe7 Nxe7 Nc3 O-O
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4_Nd6_Bxc6:bxc6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Closed — d5 premature (+0.76). playLine:
  // e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d5 exd5 Na5 Ba2 b3 Bxb3 Nxb3 cxb3 Nxd5
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Be7_Re1_b5_Bb3_O-O_a4_b4_d3:d5': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Ruy Exchange (a6 Bxc6) — bxc6 (+0.59), the gentlest edge. playLine:
  // e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 bxc6 d4 exd4 Qxd4 Qf6 Qa4 Bc5 Nc3 Ne7
  'ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6:bxc6': {
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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
    sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
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

  // Vienna — Ng4 (+0.76), a modest sac-edge. playLine:
  // e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Ng4 Ng5 h6 Bxf7+ Kf8 f5 hxg5 Qxg4 Kxf7
  'vienna-game:e4_e5_Nc3_Nc6_Bc4_Nf6_d3_Bc5_f4_d6_Nf3:Ng4': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna — Bxf3 (+0.88), structural. playLine:
  // e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6 Nf3 O-O O-O Bg4 h3 Bxf3 Qxf3 a5 Ne2 Nc6 c3 Nd7 a3 Kh8
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Bc5_d3_d6_Nf3_O-O_O-O_Bg4_h3:Bxf3': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna g3 — e4 (+0.85), a long-term weakness. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 e4 Qe2 f5 d3 Qf6 O-O Bd6 dxe4 O-O
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3:e4': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna g3 — Bg4 (+0.62), a tempo. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 Bc5 O-O Bg4 h3 Bxf3 Qxf3 O-O a4 Bd6 Qd5 Rb8
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3_Bc5_O-O:Bg4': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // Vienna g3 — f5 (+0.58), the slightest plus. playLine:
  // e4 e5 Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2 Nxc3 bxc3 Nc6 Nf3 Bc5 O-O O-O d3 f5 Nxe5 Nxe5 d4 Bd6 dxe5 Bxe5 Ba3 Re8
  'vienna-game:e4_e5_Nc3_Nf6_g3_d5_exd5_Nxd5_Bg2_Nxc3_bxc3_Nc6_Nf3_Bc5_O-O_O-O_d3:f5': {
    sources: ['book:vienna-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Vienna_Game'],
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

  // ── Italian Game (mined on CI from the amateur explorer + Stockfish) ──────

  // Two Knights / Scotch-gambit: Nxd4?? drops to the f7 sac. 16 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Nf6_d4:Nxd4': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '',
      'Nxd4? The knight grabs the d4-pawn — but it was the c6-knight that guarded f7 from afar. With it gone, f7 is fatally weak, and White does not recapture.',
      'Bxf7+! The bishop crashes into f7 with check. The king is forced to take.',
      '',
      'Nxe5+ — the point. The knight snaps the e5-pawn with check; the king must run, and the stranded d4-knight falls next.',
      '',
      'Qxd4 collects the knight. White gave a bishop but took two pawns and a knight, and Black has lost the right to castle.',
      '',
      'Qc4+ — the queen checks and rakes the weak light squares. White is simply winning.',
      '',
    ],
    learn: [
      '', '', '', '', '', '',
      'd4 — strike the centre.',
      '',
      'Bxf7+ — sac, drag the king out.',
      '',
      'Nxe5+ — fork, win the knight back.',
      '',
      'Qxd4 — collect it, up material.',
      '',
      'Qc4+ — keep the heat on.',
      '',
    ],
  },

  // Giuoco main line: Bb6?! is too slow — e5! storms the centre. 20 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4:Bb6': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bb6?! Retreating the bishop is too passive here — it hands White his strongest break for free.',
      'e5! The centre pawn storms forward with tempo, kicking the f6-knight and seizing a huge space advantage — the modern way to punish a passive Italian.',
      '',
      'Bd5 — the bishop plants itself in the centre, eyeing f7 and b7 and propping the cramping e5-pawn.',
      '',
      'Nc3 challenges the e4-knight; the f5-pawn Black needed to play has left lasting light-square holes.',
      '',
      'Nxe4 trades into a clear plus: the e5-pawn cramps Black and the squares around his king are full of holes.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      '',
      'e5! — storm the centre.',
      '',
      'Bd5 — dominate the centre.',
      '',
      'Nc3 — hit the knight.',
      '',
      'Nxe4 — trade into a plus.',
      '',
    ],
  },

  // Greco/Nc3: after Nxe4 O-O, d5?? drops a piece to Nxd5. 24 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4_O-O:d5': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5? Black tries to shore up the e4-knight, but the d5-pawn is undefended and the move simply drops material.',
      'Nxd5! Winning a pawn and hitting c7 — Black’s position cracks along the centre.',
      '',
      'Re1 pins and piles onto the e4-knight down the open file.',
      '',
      'Qxe1 recaptures; now the e4-knight is falling too.',
      '',
      'Qxe4 — the dust settles two pawns up with the safer king. The greedy ...d5 just lost material.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'O-O — tuck the king away.',
      '',
      'Nxd5 — win the pawn.',
      '',
      'Re1 — pin on the e-file.',
      '',
      'Qxe1 — recapture.',
      '',
      'Qxe4 — two pawns up.',
      '',
    ],
  },

  // Møller Attack accepted: Bxc3?! Ba3! — the exchange sac roars. 26 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4_O-O_Nxc3_bxc3:Bxc3': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Bxc3?! Black keeps grabbing — the bishop snatches the c3-pawn and eyes the a1-rook. But White has a quiet killer.',
      'Ba3! The bishop slides out with deadly purpose: it stops Black from ever castling, and his king is stuck in the centre while the loot on c3 means nothing.',
      '',
      'Bb5 — pinning and developing with tempo; every White piece joins the hunt.',
      '',
      'Re1+! The rook checks down the open e-file. Black’s king is caught and the trophy bishop on a1 is out of the game.',
      '',
      'Qc2 brings the queen in with a decisive lead in development. The exchange Black won is worthless against the storm.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'bxc3 — recapture.',
      '',
      'Ba3! — stop the castle.',
      '',
      'Bb5 — pin with tempo.',
      '',
      'Re1+ — open the e-file.',
      '',
      'Qc2 — pile in.',
      '',
    ],
  },

  // Greco/Nc3 again: Nxc3?? loses to the Qe1+ zwischenzug. 26 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4_O-O_Bxc3_bxc3:Nxc3': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxc3?? Black snatches a third pawn with the knight — but it’s a blunder. White checks first.',
      'Qe1+! The zwischenzug. The queen checks before recapturing — Black must block, and then the c3-knight simply falls.',
      '',
      'Qxc3 wins the knight clean. White is a piece up for a pawn with the bishop pair — completely winning.',
      '',
      'Bd3 develops toward the king; the extra piece will tell.',
      '',
      'Rb1 seizes the open b-file. White converts the extra material at leisure.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'bxc3 — recapture.',
      '',
      'Qe1+! — check first.',
      '',
      'Qxc3 — win the knight.',
      '',
      'Bd3 — develop, up a piece.',
      '',
      'Rb1 — grab the file.',
      '',
    ],
  },

  // Hungarian Defence: the passive Nxe5?? drops a pawn to the Qh5 fork. 18 plies.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Be7_d4_d6_dxe5:Nxe5': {
    sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Nxe5? Recapturing with the knight walks into a simple combination — the e5-knight is loose and the queen is about to pounce.',
      'Nxe5 — White takes the knight.',
      '',
      'Qh5! The fork. The queen hits the loose e5-pawn and threatens mayhem on f7 and h7 at once.',
      '',
      'Qxe5 wins the pawn with a dominating central queen, raking the e7-bishop and the long diagonal. A clean pawn up against the passive Hungarian.',
      '',
      'Bh6 keeps the king stuck in the centre, denying Black any chance to castle out of trouble.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      'dxe5 — open the centre.',
      '',
      'Nxe5 — take the knight.',
      '',
      'Qh5! — the fork.',
      '',
      'Qxe5 — win the pawn.',
      '',
      'Bh6 — trap the king in.',
      '',
    ],
  },
  // ── Scotch Game (mined on CI from the amateur explorer + Stockfish) ──────
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nxd4_Qxd4:Nf6": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "Nf6? Developing straight into the queen's fire — the e5 push gains a tempo and a big central clamp.", "e5! The pawn jumps forward with tempo, kicking the knight away and seizing space while the queen sits proudly on d4.", "", "Qe3 keeps the extra space and eyes the kingside; Black is cramped and a step behind.", "", "Qf3 holds the e5-pawn and the central grip — White is comfortably better.", "", "Nc3 finishes development with a clear space-and-structure edge.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "e5 — clamp and kick the knight.", "", "Qe3 — keep the space.", "", "Qf3 — hold e5.", "", "Nc3 — develop, you're better.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Be3:Nf6": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "Nf6?? A blunder — it ignores the c5-bishop, which the bishop on e3 is already attacking.", "Nxc6 — first remove the defender, trading the knights.", "", "Bxc5 wins the bishop clean; Black has nothing to recapture with. White is simply up a piece.", "", "Be3 tucks the bishop back — the extra piece will decide.", "", "Nc3 develops with a winning material edge in hand.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "Nxc6 — remove the c5 defender.", "", "Bxc5 — win the bishop.", "", "Be3 — retreat, up a piece.", "", "Nc3 — develop and convert.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Be3_Qf6_c3:Bxd4": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "", "", "Bxd4? Trading the good bishop for the knight only helps White — it hands over the bishop pair and a mighty pawn centre.", "cxd4 — recapturing toward the centre. White now owns the bishop pair and a broad, mobile centre.", "", "Nc3 hits the d5-pawn and develops with tempo.", "", "Nb5! The knight leaps in, eyeing c7 and d6 against a king that can no longer castle.", "", "Rc1 piles onto the half-open c-file; White's pieces swarm.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "", "", "cxd4 — take the centre, bishop pair.", "", "Nc3 — hit d5.", "", "Nb5! — leap at c7 and d6.", "", "Rc1 — seize the c-file.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Nf6_e5:Qe7": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "Qe7? Pinning the e5-pawn looks clever, but it parks the queen on the e-file where White's rook is coming with deadly effect.", "O-O — and the rook is ready for e1. The e5-pawn is poisoned.", "", "Nxe5 — give the knight back to spring the trap.", "", "Re1! The rook skewers the queen to the king down the e-file; Black must shed material to survive.", "", "f4 hits the queen again and keeps the initiative rolling — White is clearly on top.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "O-O — ready the rook, poison e5.", "", "Nxe5 — spring the trap.", "", "Re1! — skewer the queen.", "", "f4 — hit the queen, keep pressing.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nf6_Nc3:Nxd4": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "Nxd4? The most popular move here, and an inaccuracy — trading on d4 only invites White's queen to a dominating central post.", "Qxd4 — the queen lands in the centre with a tempo-gaining grip, and Black has no way to challenge her.", "", "f3 anchors e4 and prepares to castle long and storm the kingside.", "", "Be3 develops and eyes the queenside dark squares.", "", "O-O-O — opposite-side castling, and White's attack is the faster one.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "Qxd4 — centralise the queen.", "", "f3 — anchor e4, prep long castle.", "", "Be3 — develop, eye the queenside.", "", "O-O-O — castle long, attack first.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Nb3:Bxf2+": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "Bxf2+? A tempting sacrifice, but it is simply unsound here — there's no follow-up.", "Kxf2 — the king grabs the bishop. White is up a clean piece for a single pawn, and the king is perfectly safe.", "", "Nc3 develops; the king walks to safety and the extra piece wins.", "", "Be2 prepares to connect the rooks and tuck the king away.", "", "Rf1 brings the rook back into play — White is winning comfortably.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "Kxf2 — take it, up a piece.", "", "Nc3 — develop, convert.", "", "Be2 — reroute the king to safety.", "", "Rf1 — rook back, winning.", ""],
  },
  "scotch-game:e4_e5_Nf3_Nc6_d4_exd4_c3_dxc3_Nxc3_Bb4_Bc4_d6_O-O:Be6": {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ["", "", "", "", "", "", "", "", "", "", "", "", "", "Be6? It walks into a thunderbolt — the c4-bishop and the c3-knight are perfectly placed to pounce.", "Nd5! The knight forks the b4-bishop and threatens c7; suddenly every Black piece is loose.", "", "Qb3 doubles on b7 and f7 at once, hitting two targets the knight uncovered.", "", "Qxb7 grabs the pawn and attacks the a8-rook.", "", "Nxc7+! The fork — the king must move and the rook in the corner falls. The Göring's development lead crashes through.", ""],
    learn: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "Nd5! — fork the bishop, hit c7.", "", "Qb3 — double on b7 and f7.", "", "Qxb7 — grab the pawn, hit the rook.", "", "Nxc7+ — fork; win the rook.", ""],
  },
  'french-defence:e4_e6_d4_d5_e5_c5_c3_Nc6:f4': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 e5 c5 c3 Nc6 f4 Qb6 Nf3 Nh6 dxc5 Bxc5 Bd3 f6 Qe2
    watch: ['', '', '', '', '', '', '', '', 'f4? Too ambitious — White grabs more space but neglects the queenside. The b2-pawn and the d4-base are both suddenly underdefended.', 'Qb6! The thematic French hit: the queen attacks d4 and rakes b2 down the b-file at once. White cannot comfortably defend both.', '', 'Nh6 heads for f5, the dream square, eyeing d4 and the dark holes f4 left behind.', '', 'Bxc5 develops with tempo. Black is simply comfortable to better — active pieces, a target on d4, and White\'s centre creaking.', '', 'f6 strikes the e5-spearhead and cracks the centre in Black\'s favour; the f4-push stands exposed as a weakness.', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Qb6 — hit d4 and b2.', '', 'Nh6 — reroute toward f5.', '', 'Bxc5 — develop, stay on top.', '', 'f6 — break the centre open.', ''],
  },
  'french-defence:e4_e6_d4_d5_Nc3_Nf6_Bg5_Be7:Nf3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 Nf3 Nxe4 Bxe7 Qxe7 Nxe4 dxe4 Nd2 f5 Qh5+
    watch: ['', '', '', '', '', '', '', '', 'Nf3? Natural-looking, but it forgets that e4 is defended only once. Black strikes at once.', 'Nxe4! Winning a pawn out of the pin — if White recaptures the knight, the g5-bishop hangs, so the tactic just works.', '', 'Qxe7 recaptures the bishop. Black is a clean pawn up with a healthy position.', '', 'dxe4 — and Black keeps the extra pawn, a strong protected pawn on e4 that cramps White.', '', 'f5 props the e4-pawn and shores up the kingside; the pawn-up structure is rock-solid.', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Nxe4 — win the e4-pawn.', '', 'Qxe7 — take the bishop back.', '', 'dxe4 — keep the extra pawn.', '', 'f5 — defend the e4-pawn.', ''],
  },
  'french-defence:e4_e6_d4_d5_Nd2_Nf6_e5_Nfd7_Bd3_c5_c3_Nc6_Ne2_cxd4_cxd4_f6:Nf3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 Nf3 fxe5 Ng5 Bd6 Bc2 Nf6 dxe5 Bxe5 O-O
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nf3? White had to recapture with exf6. Instead the e5-spearhead is left hanging to the …f6 lever.', 'fxe5! Simply winning the e5-pawn. The pawn that cramped Black all opening is gone, and Black is a pawn up.', '', 'Bd6 develops toward h2 and holds the extra pawn; Black has the freer game.', '', '', '', 'Bxe5 — the dust settles with Black a clean pawn ahead and the bishop beautifully centralised.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'fxe5 — win the e5-pawn.', '', 'Bd6 — develop, hold the pawn.', '', '', '', 'Bxe5 — recapture, a pawn up.', ''],
  },
  'french-defence:e4_e6_d4_d5_Nc3_Nf6_Bg5_dxe4_Nxe4_Be7:Nf3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Nf3 Nxe4 Bxe7 Qxe7 Bd3 Nf6 Qe2 Bd7 O-O-O
    watch: ['', '', '', '', '', '', '', '', '', '', 'Nf3?? A blunder. White had to settle the e4-knight first with Bxf6; now it simply drops.', 'Nxe4! Black wins a clean piece. Once the bishops come off, the knight on e4 is just extra material with no recapture.', '', 'Qxe7, and Black is up a full knight for nothing. The game is effectively decided.', '', '', '', 'Bd7 calmly develops; a piece to the good, Black simply completes development and converts.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', 'Nxe4 — win a whole piece.', '', 'Qxe7 — up a piece.', '', '', '', 'Bd7 — develop and convert.', ''],
  },
  'french-defence:e4_e6_d4_d5_e5_c5_c3_Nc6_Nf3_Qb6_Bd3_cxd4_cxd4_Bd7:Be3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 Be3 Qxb2 Nbd2 Nb4 Nb3 Qc3+ Ke2 Nxd3 Qxd3
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Be3? This leaves the b2-pawn — and the rook behind it — fatally loose. White had to cover b2 first.', 'Qxb2! The queen grabs the pawn and now eyes the a1-rook. White is already losing material.', '', 'Nb4 jumps in with threats on d3 and c2 — Black piles on while a pawn up.', '', 'Qc3+ checks and tightens the net; White\'s position is collapsing.', '', 'Nxd3 wins the bishop as well — Black emerges with a decisive material edge.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qxb2 — grab the pawn, hit the rook.', '', 'Nb4 — pile on, hit d3.', '', 'Qc3+ — check and fork.', '', 'Nxd3 — win the bishop.', ''],
  },
  'french-defence:e4_e6_d4_d5_e5_c5_c3_Nc6_Nf3_Qb6_Bd3_cxd4_cxd4_Bd7_O-O_Nxd4:Be3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Be3 Nxf3+ Qxf3 Qxb2 Nd2 Qxe5 Bf4 Qf6 Qe3
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Be3? This loosens b2 and walks into a fork — the d4-knight is poised to strike.', 'Nxf3+! A zwischenzug with check: Black wins the e5-pawn and then b2, cashing the gambit material in for keeps.', '', 'Qxb2 snatches the second pawn; Black is clearly up material with a safe king.', '', 'Qxe5 grabs the spearhead too — Black is rolling, several pawns to the good.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxf3+ — check, then collect.', '', 'Qxb2 — take the second pawn.', '', 'Qxe5 — and another pawn.', '', '', ''],
  },
  'french-defence:e4_e6_d4_d5_Nc3_Nf6_Bg5_Bb4:a3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 a3 Bxc3+ bxc3 dxe4 Ne2 Nbd7 c4 h6 Bh4
    watch: ['', '', '', '', '', '', '', '', 'a3? A slow sideline that simply invites the trade handing Black the structural prize.', 'Bxc3+! Take it — the trade wrecks White\'s queenside into doubled c-pawns, the permanent McCutcheon target.', '', 'dxe4 — with the c3-knight gone, the e4-pawn falls too. Black is a pawn up with the better structure.', '', 'Nbd7 develops smoothly; Black has the structure, the extra pawn, and no problems.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Bxc3+ — wreck the c-pawns.', '', 'dxe4 — win the e4-pawn.', '', 'Nbd7 — develop, stay on top.', '', '', ''],
  },
  'french-defence:e4_e6_d4_d5_Nc3_dxe4:f3': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nc3 dxe4 f3 Bb4 fxe4 Bxc3+ bxc3 Qh4+ Ke2 Qxe4+ Kf2
    watch: ['', '', '', '', '', '', 'f3? White tries to win the centre back, but this just tears open lines around White\'s own king.', 'Bb4! Pin the c3-knight before White can recapture in good order — the e1-king is about to be exposed.', '', 'Bxc3+ smashes the knight and the pawn shelter; the white king is stuck in the centre.', '', 'Qh4+ — the queen joins with check and forces the king to walk into the open.', '', 'Qxe4+ wins the pawn back with a raging attack on the exposed king. Black is winning.', ''],
    learn: ['', '', '', '', '', '', '', 'Bb4 — pin before fxe4.', '', 'Bxc3+ — open the king.', '', 'Qh4+ — check, drag the king out.', '', 'Qxe4+ — win the pawn, keep attacking.', ''],
  },
  'french-defence:e4_e6_d4_d5_Nc3_dxe4_Nxe4_Nd7_Nf3_Ngf6:Neg5': {
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    // e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Neg5 h6 Nh3 c5 Bd3 cxd4 Nxd4 e5 Nb3
    watch: ['', '', '', '', '', '', '', '', '', '', 'Neg5? The knight lunges to g5 with nothing to do there. Black simply kicks it.', 'h6! Put the question to the knight — it has no good square. Nh3 dumps it on the rim, and Black takes the centre.', '', 'c5 strikes the centre while White\'s knight sulks on h3; Black seizes space and the better game.', '', '', '', 'e5 rolls the centre forward — Black has a clear initiative with the knight stranded on the rim.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', 'h6 — kick the offside knight.', '', 'c5 — hit the centre, take over.', '', '', '', 'e5 — roll the centre.', ''],
  },

  // ── King's Gambit — curated confirmed crushes (mined 2026-05-25, engine-first;
  // theory-spot-checked). The other ~20 mined KG gems stay dark until narrated.
  'kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4_Nxe4_Nf3_Bc5_Qe2_Bf5_Nc3:Bb4': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '…Bb4? develops with a pin on the c3-knight — but it walks straight into a fork.',
      'Qb5+! A check that also attacks the bishop on b4 — a royal fork hitting two pieces down two lines at once. Black must answer the check and cannot save the bishop.',
      '',
      'Qxb4 collects the bishop. White is up a clean piece with the healthier position — a decisive material edge.',
      '',
      '',
      '',
      '',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Qb5+ — check and fork the bishop.',
      '',
      'Qxb4 — take the piece, you’re winning.',
      '',
      '',
      '',
      '',
      '',
    ],
  },
  'kings-gambit:e4_e5_f4_exf4_Bc4_Nf6_Nc3_Bb4_e5:Qe7': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'e5 stabs forward, attacking the knight on f6 while the bishop on b4 stays pinned to the e1-king.',
      '…Qe7? blocks the king in and leaves the knight on f6 hanging to the e5-pawn.',
      'Qe2 — pile on. Black is tied in knots: the f6-knight is attacked, the b4-bishop is pinned, and the king is stuck on e8.',
      '',
      'exf6 wins the knight; after …Qxf6 the queen is dragged onto a fork.',
      '',
      'Nd5! forks the queen and c7. White is winning decisively.',
      '',
      '',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'e5 — hit the knight, keep the pin.',
      '',
      'Qe2 — pile on the pin.',
      '',
      'exf6 — win the knight.',
      '',
      'Nd5 — fork the queen.',
      '',
      '',
      '',
    ],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4:f6': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '…f6? props the g5-pawn but fatally weakens the light squares around the king.',
      'Nxg5! The knight crashes in — taking it with …fxg5 lets hxg5 rip the h-file wide open straight at the king.',
      '',
      '',
      '',
      'Bxh5+! The bishop joins with check; the king is hauled into the open and White’s attack is overwhelming.',
      '',
      '',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Nxg5 — sacrifice into the king.',
      '',
      '',
      '',
      'Bxh5+ — check, hunt the king.',
      '',
      '',
      '',
    ],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ne5:g3': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '…g3? lunges at the kingside but ignores the e5-knight’s leap into f7.',
      'Nxf7! The knight sacrifices itself to drag the king out: after …Kxf7 it is stranded in the centre with White’s queen ready to pounce.',
      '',
      'Qh5+ — the queen swings in with check, hunting the exposed king and winning material with a raging attack.',
      '',
      '',
      '',
      'Bc4+ — every piece joins with tempo; the king has no shelter and White is winning.',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Nxf7 — sac, drag the king out.',
      '',
      'Qh5+ — check, chase the king.',
      '',
      '',
      '',
      'Bc4+ — check, bring the bishop.',
      '',
    ],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ng5:f6': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '…f6? attacks the g5-knight — but White does not retreat it.',
      'Qxg4! Ignoring the attacked knight. If Black grabs it with …fxg5, hxg5 tears open the h-file at the king — so White keeps a crushing initiative.',
      '',
      'Qf5 — the queen dominates the light squares, hitting f6 and eyeing the king. Black is paralysed.',
      '',
      '',
      '',
      '',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Qxg4 — ignore the knight, attack.',
      '',
      'Qf5 — centralise, keep the bind.',
      '',
      '',
      '',
      '',
      '',
    ],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_d6_d4_g5_h4_g4_Ng1_Bh6_Nc3_Nc6_Nge2:Qf6': {
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
    watch: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '…Qf6? places the queen on a square the knight can hit with tempo.',
      'Nd5! Leaping in with tempo — attacking the queen on f6 and the c7-pawn at once. The queen must run and White takes over the board.',
      '',
      'Qd3 — White swings toward the kingside while the knight on d5 dominates; the f4-pawn and the initiative are White’s.',
      '',
      '',
      '',
      '',
      '',
    ],
    learn: [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Nd5 — jump in, hit the queen.',
      '',
      'Qd3 — build the attack.',
      '',
      '',
      '',
      '',
      '',
    ],
  },
  'scandinavian-defence:e4_d5_exd5_Qxd5_Nc3_Qa5_d4_c6_Bd2_Qc7_Nf3_Nf6_Bc4_Bg4:Bxf7+': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Bd2 Qc7 Nf3 Nf6 Bc4 Bg4 Bxf7+ Kxf7 h3 Bxf3 Qxf3 Kg8 g4 e6 g5
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bxf7+? An unsound sacrifice. White gives up the bishop hoping to expose the king, but Black has everything covered — there is no real follow-up.', 'Kxf7 — just take it. Black is a clean piece up and the king is perfectly safe, ready to tuck back to g8.', '', 'Bxf3 trades off White\'s one active piece, snuffing the last spark of the bluff.', '', 'Kg8 tucks the king away — Black is simply a piece up with no danger at all.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Kxf7 — take the piece, king is safe.', '', 'Bxf3 — trade off the attacker.', '', 'Kg8 — king safe, up a piece.', '', '', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_d4_Nxd5_Nf3_g6_Be2_Bg7_O-O_O-O_c4_Nb6:b3': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6 b3 c5 Bb2 Nc6 a4 Bf5 a5 Nc8 b4
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'b3? Too slow. In this King\'s-Indian structure White cannot afford to dawdle — Black strikes the centre at once.', 'c5! Hitting d4 and opening the long diagonal for the g7-bishop. Black seizes the initiative against White\'s broad but loose centre.', '', 'Nc6 piles onto d4; White\'s centre is creaking and Black is already the more comfortable side.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'c5 — strike d4, open the diagonal.', '', 'Nc6 — pile onto d4.', '', '', '', '', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_c4_e6_dxe6_Bxe6:b3': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 b3 Nc6 Nf3 Ne4 Nc3 Qf6 Bb2 O-O-O Qb1
    watch: ['', '', '', '', '', '', '', '', 'b3? Far too slow against a gambit. White must hurry to develop and consolidate the extra pawn; instead this hands Black free rein.', 'Nc6 develops with tempo, eyeing d4 and the centre. Black\'s lead in development is already worth far more than the pawn.', '', 'Ne4 leaps to a dominating central outpost; every black piece is firing while White flounders.', '', '', '', 'O-O-O throws the rook onto the open d-file with threats — the gambit has paid off in full.', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Nc6 — develop, seize the initiative.', '', 'Ne4 — dominate the centre.', '', '', '', 'O-O-O — rook to the d-file.', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_c4_e6_dxe6_Bxe6_d4_Bb4+_Bd2_Qe7:Qa4+': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Qa4+ Bd7+ Be2 Bxa4 Nc3 O-O Kf1 Nc6 Nf3
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', 'Qa4+?? A blunder. The check looks natural, but Black has a devastating in-between reply.', 'Bd7+! A zwischenzug — Black blocks the check WITH check, and the bishop now also attacks the white queen on a4. White must answer the check first, and the queen is lost.', '', 'Bxa4 — and the queen falls. Black is up a full queen; the game is effectively over.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Bd7+ — block with check, hit the queen.', '', 'Bxa4 — win the queen.', '', '', '', '', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_c4_e6_dxe6_Bxe6_d4_Bb4+_Bd2_Qe7_Bxb4_Qxb4+_Qd2_Nc6:a3': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 c4 e6 dxe6 Bxe6 d4 Bb4+ Bd2 Qe7 Bxb4 Qxb4+ Qd2 Nc6 a3 Qxd2+ Nxd2 Nxd4 O-O-O Ng4 Nh3 O-O-O b4
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'a3? A wasted move that walks into a tactic and drops the d4-pawn.', 'Qxd2+ — take the queen with check. After the recapture Black grabs the d4-pawn too, regaining the gambit material with the better game.', '', 'Nxd4 collects the central pawn; Black has the material back and an active, comfortable position.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qxd2+ — trade favourably with check.', '', 'Nxd4 — win back the pawn.', '', '', '', '', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_d4_Bg4_Be2_Bxe2_Qxe2_Qxd5:c3': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 c3 Qxg2 Qf3 Qxf3 Nxf3 e6 a4 Nc6 Nbd2
    watch: ['', '', '', '', '', '', '', '', '', '', 'c3? This leaves the g2-pawn hanging on the long diagonal — a costly oversight.', 'Qxg2! The queen snatches g2 and rakes the h1-rook down the diagonal. Black wins material out of nowhere.', '', 'Qxf3 forces the trade on Black\'s terms; Black emerges a clean pawn up with the safer position.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', 'Qxg2 — grab the pawn, hit the rook.', '', 'Qxf3 — trade, stay a pawn up.', '', '', '', '', ''],
  },
  'scandinavian-defence:e4_d5_exd5_Nf6_d4_Bg4_Be2_Bxe2_Qxe2_Qxd5_Nf3_e6_O-O_Nc6:c4': {
    sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
    // e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 e6 O-O Nc6 c4 Nxd4 Nxd4 Qxd4 Nc3 a6 Qf3 c6 b3
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'c4? The most common try here, but it abandons the d4-pawn\'s defender — and Black pounces.', 'Nxd4! The little tactic: the knight grabs d4 because c4 left it undefended. If White recaptures, the queen takes back and Black is a pawn up.', '', 'Qxd4 regains the piece, leaving Black a clean pawn ahead with an active centralised queen.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxd4 — grab the loose pawn.', '', 'Qxd4 — recapture, a pawn up.', '', '', '', '', ''],
  },
  'alekhine-defence:e4_Nf6_e5_Nd5_d4_d6_c4_Nb6:Nc3': {
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    // e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 Nc3 dxe5 dxe5 Qxd1+ Nxd1 Nc6 f4 Bf5 Nf3
    watch: ['', '', '', '', '', '', '', '', 'Nc3? This fails to shore up the e5-spearhead. Black undermines at once.', 'dxe5! Striking the spearhead. After the trades the e5-pawn is left weak and falls.', '', 'Qxd1+ trades queens — with no attack to fear, Black simply hunts the weak e5-pawn.', '', 'Nc6 piles onto e5; the pawn cannot be held, and Black wins it cleanly.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'dxe5 — undermine the spearhead.', '', 'Qxd1+ — trade queens, target e5.', '', 'Nc6 — win the weak e5-pawn.', '', '', ''],
  },
  'alekhine-defence:e4_Nf6_e5_Nd5_d4_d6_c4_Nb6_f4_dxe5_fxe5_Nc6_Be3_Bf5:Bd3': {
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    // e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Bd3 Bxd3 Qxd3 Nxe5 Qe2 Nexc4 Bf2 e6 Nc3
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bd3?? A blunder. It offers a trade but fatally loosens the defence of the centre — and Black wins material by force.', 'Bxd3 — take the bishop. After Qxd3 the e5-pawn is suddenly undefended.', '', 'Nxe5! The first pawn falls, and the knight eyes c4 next. Black is already a pawn up with more to come.', '', 'Nexc4! A second pawn drops. Black has won two pawns out of the blunder and is simply winning.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bxd3 — trade, loosen the centre.', '', 'Nxe5 — win the e5-pawn.', '', 'Nexc4 — and a second pawn.', '', '', ''],
  },
  'alekhine-defence:e4_Nf6_e5_Nd5_c4_Nb6_d4_d6:Nc3': {
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    // e4 Nf6 e5 Nd5 c4 Nb6 d4 d6 Nc3 dxe5 dxe5 Qxd1+ Nxd1 Nc6 f4 Bf5 Nf3
    watch: ['', '', '', '', '', '', '', '', 'Nc3? It leaves the e5-spearhead under-defended. Black undermines immediately.', 'dxe5! Hitting the spearhead — after the trades the e5-pawn becomes a weakness.', '', 'Qxd1+ trades queens; with the position simplified Black just targets the loose e5-pawn.', '', 'Nc6 attacks e5 — the pawn falls and Black is clearly better.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'dxe5 — undermine the spearhead.', '', 'Qxd1+ — trade queens, target e5.', '', 'Nc6 — win the weak e5-pawn.', '', '', ''],
  },
  'alekhine-defence:e4_Nf6_e5_Nd5_c4_Nb6_c5_Nd5_d4_d6_cxd6_exd6:f4': {
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
    // e4 Nf6 e5 Nd5 c4 Nb6 c5 Nd5 d4 d6 cxd6 exd6 f4 dxe5 dxe5 Nc6 Nc3 Bb4 Bd2 Be6 Bb5
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', 'f4? Over-extending once more. The e5-pawn is now overworked, and Black strikes.', 'dxe5! Undermining. After the recapture the e5-spearhead is isolated and weak.', '', 'Nc6 attacks e5; the over-extended pawn becomes a lasting target.', '', 'Bb4 pins and develops — Black is comfortably better with e5 under fire.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'dxe5 — undermine the spearhead.', '', 'Nc6 — target the weak e5-pawn.', '', 'Bb4 — pin, pile on e5.', '', '', ''],
  },
  'benko-gambit:d4_Nf6_c4_c5_d5_b5_Nf3_bxc4:Qc2': {
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    // d4 Nf6 c4 c5 d5 b5 Nf3 bxc4 Qc2 Nxd5 Qxc4 e6 e4 Qa5+ Bd2 Nb4 Qb3
    watch: ['', '', '', '', '', '', '', '', 'Qc2? This forgets the d5-pawn — Black simply grabs it for free.', 'Nxd5! Winning the central pawn. White can round up c4, but Black stays a sound pawn up with an active knight.', '', 'e6 solidifies the extra pawn; Black is simply a pawn to the good.', '', 'Qa5+ develops with check, and after Bd2 Nb4 Black keeps the material with active pieces.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Nxd5 — grab the free d5-pawn.', '', 'e6 — shore up the extra pawn.', '', 'Qa5+ — check, keep the pawn.', '', '', ''],
  },
  'benko-gambit:d4_Nf6_c4_c5_d5_b5_cxb5_a6_Nc3_axb5_e4_b4:e5': {
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    // d4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 e5 bxc3 exf6 cxb2 Bxb2 Qa5+ Qd2 Qxd2+ Kxd2
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', 'e5? Over-eager. It allows a crushing in-between capture.', 'bxc3! Take the knight first. After exf6 cxb2 the passed pawn is one step from queening and forks the rook.', '', 'cxb2 — the pawn reaches the seventh, attacking the a1-rook. White must deal with it and Black comes out on top.', '', 'Qa5+ forces the queens off into an endgame where Black is clearly better.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'bxc3 — take the knight, push on.', '', 'cxb2 — to b2, hit the rook.', '', 'Qa5+ — trade into a better ending.', '', '', ''],
  },
  'benko-gambit:d4_Nf6_c4_c5_d5_b5_cxb5_a6_Nc3_axb5_e4_b4_Nb5_d6_Bc4_g6:Bf4': {
    sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
    // d4 Nf6 c4 c5 d5 b5 cxb5 a6 Nc3 axb5 e4 b4 Nb5 d6 Bc4 g6 Bf4 Bg7 Nf3 O-O e5 Nh5 Bg5 h6 Bh4
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bf4? Misplacing the bishop. Black calmly develops and White\'s setup backfires.', 'Bg7 fianchettoes; now if White lunges e5, the f4-bishop is loose and Black will hit it.', '', 'O-O — Black is safe and ready; White\'s e5 push runs into …Nh5 hitting the f4-bishop.', '', 'Nh5 forks the f4-bishop; White\'s pieces tangle and Black is clearly better.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bg7 — develop, exploit the loose bishop.', '', 'O-O — safe, prepare …Nh5.', '', 'Nh5 — hit the f4-bishop.', '', '', ''],
  },

  // Nimzo 4.Qc2 — White’s wing lunge h4 hangs the g5-bishop to a zwischenzug.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O Nf3 d5 Bg5 h6 h4 Bxc3+ bxc3 hxg5 hxg5 Ne4 e3 g6 g4
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Qc2_O-O_Nf3_d5_Bg5_h6:h4': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'h4? White lunges on the wing before finishing development — and the g5-bishop is suddenly loose. There is a zwischenzug.',
      'Bxc3+ first — the in-between check removes the bishop’s defender before you touch it.',
      '',
      'hxg5 — now collect the bishop. White wins a pawn back, but you stay up a piece for a pawn.',
      '',
      'Ne4 lands on the hole, hammering the wrecked c3-pawns. A piece for a pawn, with the better structure.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '', 'Bxc3 — check first, remove the guard.', '', 'hxg5 — now win the bishop.', '', 'Ne4 — a piece up, dominate.', '', '', '',
    ],
  },

  // Nimzo 4.Qc2 5.a3 — White’s c5 releases the centre too early; ...Ne4 and ...e5.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 c5 Ne4 Qc2 e5 Nf3 exd4 e3 dxe3 Bxe3
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Qc2_O-O_a3_Bxc3+_Qxc3_d5:c5': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'c5? White grabs space but releases the central tension too early — the d4-pawn is left weak and a knight leaps into e4.',
      'Ne4 jumps to the hole with tempo, hitting the queen on c3 and seizing the centre.',
      '',
      'e5! Strike at the centre while White is uncoordinated; the d4-pawn cannot be held.',
      '',
      'exd4 — when the smoke clears Black holds an extra pawn with a monster knight on e4.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '', 'Ne4 — leap in, hit the queen.', '', 'e5 — hit the loose centre.', '', 'exd4 — a pawn up, great knight.', '', '', '',
    ],
  },

  // Nimzo Rubinstein 4.e3 — premature c5; ...b6 undermines the base.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 c5 b6 cxb6 Bxc3+ bxc3 axb6 Ne2 Ba6 Bc2
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_e3_O-O_Bd3_d5:c5': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '',
      'c5?! White clamps the queenside, but a pawn chain is undermined at its base — and the d3-bishop ends up biting on granite.',
      'b6! Hit the base of the c5-pawn before White can prop it up.',
      '',
      'Bxc3+ — trade off and damage the white pawns before recapturing.',
      '',
      'axb6 — recapture, open the a-file, and leave the doubled c3-pawn as a standing target.',
      '',
      'Ba6 trades off White’s good light-squared bishop; the c3-weakness and the bishop pair hand Black the edge.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '',
      '', 'b6 — undermine the c5-pawn.', '', 'Bxc3 — trade, wreck his pawns.', '', 'axb6 — open the a-file.', '', 'Ba6 — trade his good bishop.', '',
    ],
  },

  // Nimzo Rubinstein — White’s premature d5 overextends; ...Nb6 wins it.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 Nbd7 d5 Nb6 Be2 exd5 Bd2 Nc4 Be1 Nxb2 Qc2
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_e3_O-O_Bd3_d5_Nf3_c5_O-O_dxc4_Bxc4_Nbd7:d5': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5? White lunges in the centre for space, but the pawn overextends — and the c4-bishop is hit at the same time.',
      'Nb6 attacks the c4-bishop and targets the loose d5-pawn in one move.',
      '',
      'exd5 wins the central pawn cleanly. Black is a healthy pawn up with the initiative.',
      '',
      'Nc4 — the knight invades, raking b2 and the dark squares; White’s queenside cracks.',
      '',
      'Nxb2 snatches a second pawn. Two pawns up with a dominant position.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', 'Nb6 — hit the bishop and d5.', '', 'exd5 — win the pawn.', '', 'Nc4 — invade, hit b2.', '', 'Nxb2 — grab a second pawn.', '',
    ],
  },

  // Nimzo Leningrad 4.Bg5 — White’s e4 with the bishop on h4 walks into ...g5.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 d6 e4 g5 Bg3 Bxc3+ bxc3 Nxe4 Bd3 Nxg3 hxg3
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Bg5_h6_Bh4_c5_d5_d6:e4': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'e4? White builds the big centre, but with the bishop marooned on h4 it walks straight into a kingside pawn-fork.',
      'g5! Hit the h4-bishop and gain time; it must shuffle to g3, where it sits loose.',
      '',
      'Bxc3+ — remove the defender of e4 with check before grabbing the pawn.',
      '',
      'Nxe4 wins the central pawn — and the knight even forks the g3-bishop.',
      '',
      'Nxg3 trades the knight for the bishop and shatters White’s pawns. Black is a clean pawn up with the bishop pair.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '', 'g5 — hit the bishop, gain time.', '', 'Bxc3 — check, undefend e4.', '', 'Nxe4 — win the pawn.', '', 'Nxg3 — a pawn up, bishop pair.', '',
    ],
  },

  // Nimzo Fianchetto 4.Nf3/g3 — White’s O-O misses the c3 combination.
  // playLine: d4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5 O-O Nxc3 bxc3 Bxc3 Ba3 Bxd4 Bxf8 Kxf8 Rb1
  'nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Nf3_c5_g3_cxd4_Nxd4_O-O_Bg2_d5_cxd5_Nxd5:O-O': {
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'O-O? Natural development — but it walks into a combination: the d5-knight and b4-bishop gang up on c3.',
      'Nxc3 begins it — capture the knight to prise open the c3-square.',
      '',
      'Bxc3 recaptures, forking the a1-rook and the d4-knight at once.',
      '',
      'Bxd4 collects the knight; Black wins material and keeps the dominant dark-squared bishop.',
      '',
      'Kxf8 — the dust settles with Black up clear material. The lost castling means nothing here.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', 'Nxc3 — start the combination.', '', 'Bxc3 — fork the rook and knight.', '', 'Bxd4 — win the knight.', '', 'Kxf8 — clear material edge.', '',
    ],
  },

  // ── King's Gambit (White) — verified vs corpus + online (David 2026-05-25) ──
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_g4_O-O_gxf3_Qxf3:Bd6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'Bd6? Black tries to blockade — but the knight White sacrificed on f3 bought a roaring initiative, and the centre pawns now do the talking.', 'd4! The centre bursts open while Black is undeveloped; e4–e5 looms to hit the d6-bishop and the king stuck on e8.', '', 'e5 — the spearhead lunges, attacking the d6-bishop and tearing open the lines toward Black’s king.', '', '', '', 'Bxf4 — the gambit pawn returns and every white piece converges on f7. A textbook Muzio crush.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'd4 — burst the centre open.', '', 'e5 — hit the bishop.', '', '', '', 'Bxf4 — regain it, full attack.', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Muzio_Gambit'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_g4_O-O_gxf3_Qxf3_Qf6_c3:c5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'c5? Black grabs space but ignores the centre — fatal with the king uncastled and White’s pieces poised.', 'e5! The pawn slams forward with tempo, hitting the f6-queen and clearing e4 for the attack.', '', '', '', 'Bxf4 — White scoops the pawn back; the open f-file and the Bc4/Qf3 battery rake at f7.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'e5 — gain tempo on the queen.', '', '', '', 'Bxf4 — regain it, open the f-file.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Muzio_Gambit'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_Bg7_h4:f6': {
    watch: ['', '', '', '', '', '', '', '', '', 'f6? It guards g5 but fatally loosens the king — and White strikes first.', 'Nxg5! A knight sacrifice that rips the kingside open; fxg5 Bxg5 leaves the black king naked with the queen swinging to h5.', '', '', '', '', '', 'Qh5+ — the queen lands with check; the king is hunted in the centre, full value for the piece.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Nxg5 — rip the kingside open.', '', '', '', '', '', 'Qh5+ — hunt the king.', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-king-safety', 'https://www.chessable.com/blog/kings-gambit/'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_Bg7_h4_h6_d4:f6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'f6? It props up g5 but fatally weakens e6 and the a2–g8 diagonal.', 'Ne5! The knight leaps in — fxe5 fails, and the threat is the fork Nf7 hitting queen and rook.', '', 'Nf7! — forking the d8-queen and the h8-rook, the Bc4 nailing the square.', '', 'Nxd8 — White wins the queen. The f6–f7 weakening cost Black the game.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Ne5 — leap to the fork.', '', 'Nf7 — fork queen and rook.', '', 'Nxd8 — win the queen.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:tac-fork', 'concept:pos-development', 'https://www.chessable.com/blog/kings-gambit/'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_Bg7_h4_h6_d4_d6_Nc3:c6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'c6? A slow move in a sharp position — it does nothing about White’s development lead.', 'Qd3 — White centralises the queen, eyes the kingside, and keeps the bind; the gambit pawn is a small price for the initiative.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qd3 — centralise, keep the bind.', '', '', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-development', 'concept:pos-initiative', 'https://www.chessable.com/blog/kings-gambit/'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_d6_d4:Nc6': {
    watch: ['', '', '', '', '', '', '', 'Nc6? Natural — but it lets White recapture cleanly and keep the big centre.', 'Bxf4 — the gambit pawn is back. White has the full d4/e4 centre, a healthy structure, and a comfortable edge.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'Bxf4 — regain it, big centre.', '', '', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Fischer_Defense'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_d6_d4_g5_h4:Bg4': {
    watch: ['', '', '', '', '', '', '', '', '', 'Bg4? It pins the knight but ignores h4 hammering the g5-pawn.', 'hxg5! White wins the g-pawn and tears the chain apart; the h-file opens against the king.', '', 'Bxf4 — and the second pawn returns. White is up a pawn with the safer king.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'hxg5 — smash the chain.', '', 'Bxf4 — regain the second pawn.', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-open-file', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Fischer_Defense'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_d6_d4_g5_h4_g4_Ng1:h5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'h5? Black props up g4, but the f4-pawn is left to fall.', 'Bxf4 — White simply recovers the gambit pawn with a dominant centre and the better-placed pieces.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Bxf4 — take the pawn back.', '', '', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Fischer_Defense'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_d6_d4_g5_h4_g4_Ng1_Bh6_Nc3:Ne7': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Ne7? Passive — it blocks the bishop and does nothing for the loose f4-pawn.', 'Nge2 — the knight reroutes to round up f4 and bolster the centre.', '', '', '', 'Bxf4 — the pawn is back and White’s pieces are the more active. A clean structural edge.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nge2 — reroute to win f4.', '', '', '', 'Bxf4 — regain it, better pieces.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Fischer_Defense'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_Bc4_g4_O-O_gxf3_Qxf3_Qf6_e5:Bc5+': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Bc5+? A check that loses time — the king just steps aside and Black’s attack stalls.', 'Kh1 — calmly out of check; now White’s own attack rolls with d4 and Bxf4 to come.', '', 'd4 — the centre expands, hitting the c5-bishop and opening lines at Black’s king.', '', 'Bxf4 — pawn recovered, the f-file open, the Muzio initiative decisive.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Kh1 — sidestep, keep attacking.', '', 'd4 — expand, hit the bishop.', '', 'Bxf4 — open the f-file.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Muzio_Gambit'],
  },
  'kings-gambit:e4_e5_f4_d5_exd5_e4_d3:f5': {
    watch: ['', '', '', '', '', '', '', 'f5? Black overreaches, trying to build a pawn wall — but it leaves e4 hanging.', 'dxe4! White wins the centre pawn and the overextended structure collapses.', '', 'e5 — the passer rolls; Black’s pieces are pushed back and White keeps the extra material.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'dxe4 — win the centre pawn.', '', 'e5 — roll the passer.', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Falkbeer_Countergambit'],
  },
  'kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4:Bc5': {
    watch: ['', '', '', '', '', '', '', '', '', 'Bc5? Aggressive but loose — White simply develops and keeps the extra pawn.', 'Nc3 — developing with tempo, guarding e4 and preparing to push it.', '', 'e5 — the pawn advances, kicking the f6-knight; White consolidates a healthy extra pawn.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Nc3 — develop, guard e4.', '', 'e5 — kick the knight.', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Falkbeer_Countergambit'],
  },
  'kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4_Nxe4_Nf3_Bc5_Qe2:Bf2+': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Bf2+? A spite check that wrecks the bishop’s coordination — the king is fine.', 'Kd1 — the king steps up; the f2-bishop is now offside and Black’s centre knight falls.', '', '', '', 'Nxe4 — White collects the overextended knight.', '', 'Qxe4+ — and with check, White emerges a clean pawn up with the initiative.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Kd1 — step up, bishop’s offside.', '', '', '', 'Nxe4 — collect the knight.', '', 'Qxe4+ — a pawn up, with tempo.', ''],
    sources: ['book:kings-gambit', 'concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Falkbeer_Countergambit'],
  },
  'kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3:exf4': {
    watch: ['', '', '', '', '', '', '', 'exf4? Taking the pawn now — but with the bishop committed to c5 it just hands White the centre.', 'd4 — White seizes the full centre with tempo, hitting the c5-bishop.', '', 'Bxf4 — the pawn is back, the centre is huge, and the c5-bishop is misplaced.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'd4 — seize the centre, hit Bc5.', '', 'Bxf4 — regain the pawn.', '', '', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3_Nf6_Bc4:Bg4': {
    watch: ['', '', '', '', '', '', '', '', '', 'Bg4? Pinning the f3-knight — but White breaks the pin with a pawn and keeps the edge.', 'fxe5 — opening the f-file; after the exchanges White’s pieces flow to active squares.', '', 'Qxf3 — recapturing, the queen eyes f7 down the half-open file.', '', 'Nd5 — the knight jumps to the strong central outpost; White is comfortably better.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'fxe5 — open the f-file.', '', 'Qxf3 — eye f7.', '', 'Nd5 — central outpost.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-open-file', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3_Nf6_Bc4_O-O_d3:Ng4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'Ng4? The knight lunges at nothing — there’s no target on f2 and it will be chased.', 'Qe2 — calmly defending and preparing f5 to grab kingside space.', '', 'f5 — clamping the kingside; the g4-knight is offside and White expands.', '', '', '', 'g4 — the pawns roll; White builds a kingside initiative while the knight sits dim.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Qe2 — defend, prepare f5.', '', 'f5 — clamp the kingside.', '', '', '', 'g4 — roll the pawns.', ''],
    sources: ['book:kings-gambit', 'concept:att-kingside-storm', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3_Nf6_Bc4_O-O_d3_Nc6_f5:Ng4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Ng4? Again the knight jumps in without a target — and now it costs.', 'Bg5! — pinning and harassing; the f6-square and the black queen come under fire while the g4-knight hangs in the air.', '', '', '', 'Nd5 — the knight storms the outpost; White’s pieces dominate the centre for a big edge.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bg5 — pin and harass.', '', '', '', 'Nd5 — storm the outpost.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3_Nf6_Bc4_O-O_d3_Nc6_f5_Na5_Bb3_Nxb3_axb3:Ng4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Ng4? The knight sortie achieves nothing concrete and will be repelled.', 'Qe2 — defending f2 and keeping the half-open a-file and the bishop pair working.', '', '', '', 'Be3 — trading off Black’s good bishop; White’s structure and the open a-file give a pleasant pull.', '', 'O-O — fully coordinated, a small but durable edge.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qe2 — defend, keep the pull.', '', '', '', 'Be3 — trade the dark bishop.', '', 'O-O — coordinate, hold the edge.', ''],
    sources: ['book:kings-gambit', 'concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ne5_Nf6_d4:Nxe4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'Nxe4? Greedy — snatching a second pawn lets White’s development explode.', 'Bxf4 — developing with threats; the e5-knight and the open lines already eye f7.', '', 'Bb5+ — a check that drags the king or blocks, setting up the f7 break.', '', 'Nxf7! — the knight crashes in; after Kxf7 the king is hauled into the open with White’s pieces swarming.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Bxf4 — develop with threats.', '', 'Bb5+ — check, prep f7.', '', 'Nxf7 — crash the king open.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },
  'kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ng5_h6_Nxf7_Kxf7_d4:h5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'h5? With the king already dragged to f7, Black must develop and consolidate — h5 wastes the vital tempo.', 'Bc4+ — check, exploiting the exposed king; Black must block and weaken further.', '', 'Bxd5+ — grabbing the pawn with check and keeping the king on the run; full compensation for the piece.', '', 'Bxf4 — a pawn back, the bishops raking the open position around Black’s stranded king.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bc4+ — check the open king.', '', 'Bxd5+ — grab with check, keep hunting.', '', 'Bxf4 — pawn back, bishops raking.', '', '', ''],
    sources: ['book:kings-gambit', 'concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
  },

  // ── Scotch Game (White) — not in the pre-1930s corpus; verified vs engine +
  // online (Wikipedia / Chessable). Only the gems with a concrete, engine-
  // confirmed point are narrated; the subtle ≤+1.0 positional ones stay
  // baselined rather than narrate a reason I can't verify (David 2026-05-25).
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nxd4_Qxd4_d6_Nc3_Nf6_Bg5_Be7_O-O-O:c5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'c5? It hits the d4-queen, but the king is still in the centre — and White checks first.', 'Bb5+! The zwischenzug. Black must deal with the check, so the pawn’s attack on the queen never arrives in time.', '', 'Bxe7 — White grabs the bishop and trades down a clean pawn to the better game.', '', 'Bxd8 — collecting; the c5 lunge has cost Black material.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bb5+ — check first, zwischenzug.', '', 'Bxe7 — grab the bishop.', '', 'Bxd8 — up material.', '', '', ''],
    sources: ['concept:tac-zwischen', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Be3_Qf6_c3_Nge7_Bc4:Qg6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Qg6? The queen drifts off f6 — and with the pressure on d4 gone, the knight is free to strike.', 'Nxc6 — removing the defender; after the recapture the queen swings to h5 and hits f7.', '', 'Qh5 — eyeing f7; the threat of Qxf7+ outruns Black’s ...Bxe3.', '', 'Qxf7+ — the pawn falls with check and a raging attack on the stuck king.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxc6 — remove the defender.', '', 'Qh5 — hit f7.', '', 'Qxf7+ — grab it, attack.', '', '', ''],
    sources: ['concept:pos-initiative', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Scotch_Game', 'https://www.chessable.com/blog/the-scotch-game/'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Be3_Qf6_c3_Nge7_Bc4_O-O_O-O_d6_Nxc6:Bxe3': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bxe3? Black grabs the bishop instead of dealing with the knight on c6 — a costly slip.', 'fxe3 — recapturing, and now the c6-knight is a monster, forking the e7-knight and the queen.', '', 'Nxe7+ — the fork lands with check; White wins a clean piece.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'fxe3 — recapture, knight forks.', '', 'Nxe7+ — fork, win a piece.', '', '', '', '', ''],
    sources: ['concept:tac-fork', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nf6_Nxc6_bxc6_e5_Qe7_Qe2_Nd5_c4_Ba6_b3:Qh4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qh4? The queen sortie hits nothing concrete and just invites White to develop with gain.', 'Bb2 — the bishop takes the long diagonal, raking toward the centre and kingside; White’s space and the two bishops give a lasting pull.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Bb2 — long diagonal, lasting pull.', '', '', '', '', '', '', ''],
    sources: ['concept:pos-bishop-pair', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_c3_dxc3_Nxc3_Bb4_Bc4_d6_O-O_Bxc3_bxc3:Nge7': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nge7? It blocks the defence of f7 and lets White’s lead in development pounce.', 'Ng5! — the knight jumps at f7, the eternal soft spot; with the Bc4 already aimed there, the threats pile up fast.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Ng5 — jump at f7.', '', '', '', '', '', '', ''],
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Nb3_Bb6_Nc3_Nf6_Qe2:h6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'h6? A slow, weakening move in a position that demands development.', 'e5 — White grabs the centre with tempo, kicking the f6-knight to the rim; the space advantage is real.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'e5 — seize space, kick the knight.', '', '', '', '', '', '', ''],
    sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Nb3_Bb6_Nc3_Nf6_Qe2_d6_Be3_Bxe3_Qxe3:Nb4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nb4? The knight jumps to the rim with no future — a3 will kick it and it loses time.', 'O-O-O — White castles into the lead; the rook hits d6, Bb5+ looms, and the misplaced knight leaves White clearly better.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'O-O-O — castle into the lead.', '', '', '', '', '', '', ''],
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },

  // ── Italian Game / Evans Gambit (White) — verified vs engine + online
  // (Chess.com / Wikipedia). c3+d4 central break, Qb3/Ba3 diagonals at f7.
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3:a6': {
    watch: ['', '', '', '', '', '', '', 'a6? A slow waiting move that does nothing for the centre — White seizes the moment.', 'd4! The thematic Italian break rips the centre open with tempo, hitting the c5-bishop.', '', 'cxd4 — White builds a broad, mobile pawn centre while Black has wasted time.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'd4 — the central break.', '', 'cxd4 — broad pawn centre.', '', '', '', '', ''],
    sources: ['concept:pos-center', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3:d5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'd5? Black strikes back in the centre a move too early, with the bishop loose on b4.', 'exd5 — White wins the pawn; after Nxd5 both the b4-bishop and the d5-knight become targets.', '', 'O-O — calmly completing development; White keeps the extra pawn and the initiative.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'exd5 — win the pawn.', '', 'O-O — keep the edge.', '', '', '', '', ''],
    sources: ['concept:pos-center', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Ba5_d4_exd4_O-O:Bxc3': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Bxc3? Greedily grabbing a second pawn opens the very lines White’s gambit wanted.', 'Nxc3 — recapturing with the knight; White’s lead in development is now overwhelming.', '', 'Qb3 — the queen swings to the a2–g8 diagonal, hitting f7 and tying Black down. Full Evans value and more.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxc3 — recapture, huge lead.', '', 'Qb3 — hit f7.', '', '', '', '', ''],
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Ba5_d4_exd4_O-O_d6_cxd4:h6': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'h6? A wasted tempo in a gambit where every move counts.', 'Qb3 — the queen lands on the b3–f7 diagonal, hitting f7 and b7 at once.', '', 'd5 — the centre pawn lunges, forking the c6-knight and blasting the position open for White’s bishops.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qb3 — hit f7 and b7.', '', 'd5 — fork, blast it open.', '', '', '', '', ''],
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Ba5_d4_exd4_O-O_d6_cxd4_Bb6_d5:Ne5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Ne5? Trading into White’s strong d5-clamp — it hands White the more pleasant game.', 'Nxe5 — removing Black’s most active piece; the d5-pawn cramps Black and White is clearly better.', '', '', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxe5 — trade off, keep the clamp.', '', '', '', '', '', '', ''],
    sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Be7_d4:Nf6': {
    watch: ['', '', '', '', '', '', '', 'Nf6? It attacks e4 but ignores the centre — White strikes first.', 'dxe5 — winning the pawn and chasing the knight; after Ng4 the queen comes to d5 hitting g4 and f7.', '', 'Qd5 — the double attack: the g4-knight and f7 both hang. White stays a clean pawn up.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'dxe5 — win the pawn, chase.', '', 'Qd5 — double attack.', '', '', '', '', ''],
    sources: ['concept:tac-double-attack', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  },
  'italian-game:e4_e5_Nf3_Nc6_Bc4_Nf6_d4_exd4_O-O:d5': {
    watch: ['', '', '', '', '', '', '', '', '', 'd5? Returning the pawn to free the position — but it walks into a pin.', 'exd5 — winning the race; after Nb4 the bishop checks and Black’s pieces tangle.', '', 'Bb5+ — check, exploiting the loose pieces; White emerges a clean pawn up with the initiative.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'exd5 — win the race.', '', 'Bb5+ — check, win material.', '', '', '', '', ''],
    sources: ['concept:tac-pin', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },

  // ── Scotch Game — low-end POSITIONAL gems (David 2026-05-25: keep, narrate
  // honestly). Each is a real ≥+0.5 jump from the opening baseline (engine-
  // verified), but a small "clearly better", never a crush — the narration says
  // so plainly. Student is White.
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Bc5_Be3_Qf6_c3_Nge7_Bc4_O-O_O-O:Nxd4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxd4? Natural to trade, but it hands White the recapture toward the centre — a small, lasting pull.', 'cxd4 — the c-pawn rebuilds the centre; White’s broad pawns and the half-open c-file are the edge.', '', '', '', '', '', 'Nd5 — the knight lands on the central outpost; White is clearly better, nothing forced, just the sounder position.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'cxd4 — rebuild the centre', '', '', '', '', '', 'Nd5 — the central outpost', ''],
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nf6_Nxc6:dxc6': {
    watch: ['', '', '', '', '', '', '', '', '', 'dxc6? Recapturing toward the centre — but …bxc6 was sounder; this walks into the queen trade.', 'Qxd8+ — trade queens and rob Black of castling; the king must trudge to d8.', '', 'f3 — a small, pleasant edge: Black’s king is stuck on d8 and the queenside pawns are doubled.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Qxd8+ — trade, deny castling', '', 'f3 — press the better structure', '', '', '', '', ''],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nf6_Nxc6_bxc6_e5:Ne4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'Ne4? The knight grabs a forward post, but it’s easily challenged and traded — leaving White the space.', 'Nd2 — offer to trade the e4-knight; once it’s gone White’s e5-wedge tells.', '', '', '', '', '', 'Be3 — develop; White’s central space is the clear, if modest, edge.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Nd2 — trade off the knight', '', '', '', '', '', 'Be3 — press the space', ''],
    sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Bc4:h6': {
    watch: ['', '', '', '', '', '', '', 'h6? A slow move that wastes a tempo — White simply develops and takes over.', 'O-O — castle and press; with a free move in hand White builds a comfortable space edge.', '', 'Re1 — the rook backs the centre, e5 to come.', '', 'e5 — the pawn lunges, shoving the f6-knight to the rim; White is clearly better on space.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'O-O — develop, take over', '', 'Re1 — back the centre', '', 'e5 — gain space, kick the knight', '', '', ''],
    sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Nf6_e5_d5_Bb5:Ng4': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', 'Ng4? The knight lunges with no target — White kicks it and damages the structure.', 'h3 — question the knight; it must go to the awful h6-square.', '', 'Bxh6 — trade it off, shattering Black’s kingside pawns.', '', 'Qxd4 — regain the pawn; White is clearly better, the safer king against Black’s wrecked kingside.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'h3 — kick the knight', '', 'Bxh6 — shatter the kingside', '', 'Qxd4 — regain it, clearly better', '', '', ''],
    sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_Nxd4_Nf6_Nc3_Bb4_Nxc6_bxc6_Bd3_d5_exd5:Nxd5': {
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxd5? Recapturing, but Black’s doubled c-pawns stay a lasting weakness.', 'O-O — calmly develop; White owns the bishop pair and the sounder structure.', '', 'Ne4 — the knight eyes d6 and the dark squares; White is clearly better.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'O-O — develop, bishop pair', '', 'Ne4 — eye d6, press', '', '', '', '', ''],
    sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_c3:d6': {
    watch: ['', '', '', '', '', '', '', 'd6? Passive — declining the gambit lets White build the full centre for free.', 'cxd4 — take the pawn back and stand with a broad d4/e4 centre.', '', 'Nc3 — develop; the big centre and free play give White a clear pull.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'cxd4 — broad centre, pawn back', '', 'Nc3 — develop, press the centre', '', '', '', '', ''],
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },
  'scotch-game:e4_e5_Nf3_Nc6_d4_exd4_c3_dxc3_Nxc3:Be7': {
    watch: ['', '', '', '', '', '', '', '', '', 'Be7? Passive — it leaves f7 soft and the kingside loose.', 'Bc4 — train on f7; Black’s only guard is the awkward …Nh6.', '', 'Bxh6 — trade it off, shattering Black’s kingside pawns.', '', '', '', 'Qxh6 — the queen grabs the pawn and eyes the open kingside; White is clearly better.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Bc4 — aim at f7', '', 'Bxh6 — shatter the kingside', '', '', '', 'Qxh6 — grab it, press the king', ''],
    sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
  },

  // ── GothamChess Caro — Fantasy variation (student = Black) ────────────────
  // Mined 2026-05-29 (engine-first, confirmed/positional tiers). All three sit
  // on the Fantasy 3.f3 spine where White over-presses; the solid Caro punishes.
  'pro-gothamchess-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7:Bxf7+': {
    // 21 plies. Bxf7+ at 12 (White), Kxf7 punish at 13 (Black).
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      'Bxf7+? White throws the bishop at f7 hoping for a quick attack — but with no pieces ready to follow up, it’s just a piece sacrificed for one pawn.',
      '…Kxf7 — take it. The king is perfectly safe here; nothing attacks it, and Black is simply up a whole bishop.',
      'O-O — White castles, still hunting for an attack that isn’t there.',
      '…Ke8 — the king strolls back to safety; the extra piece is decisive.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '',
      '',
      'Kxf7 — just take it, up a piece',
      '',
      'Ke8 — king back, piece in pocket',
      '', '', '', '', '',
    ],
    sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },
  'pro-gothamchess-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7_O-O_Ngf6:Nc3': {
    // 23 plies. Nc3 at 14 (White), exd4 punish at 15 (Black).
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nc3? White develops but leaves the d4-pawn loose — the centre White built with f3 is overextended.',
      '…exd4 — strike the centre. Black wins the d4-pawn cleanly; the e5-pawn that cramped Black is gone and Black is a pawn up.',
      'Ne2 — White tries to round the pawn back up.',
      '…Bc5 — develop with tempo, defending the extra pawn and eyeing f2.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '',
      'exd4 — take the loose centre pawn',
      '',
      'Bc5 — develop, guard the pawn',
      '', '', '', '', '',
    ],
    sources: ['concept:pos-center', 'concept:pawn-majority', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },
  'pro-gothamchess-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_Bg4_Bc4_Nd7_O-O_Ngf6_c3_Bd6:Qb3': {
    // 25 plies. Qb3 at 16 (White), O-O punish at 17 (Black). Positional (+0.7).
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qb3? The queen eyes b7 and f7, but Black is fully developed and the threat is hollow — this just misplaces the queen.',
      '…O-O — calmly castle. Everything is defended, the king is safe, and Black’s harmonious position is simply more pleasant.',
      'Nbd2 — White brings the knight out.',
      '…b5 — gain queenside space and shove the c4-bishop off the a2-g8 diagonal.',
      'Bd3 — the bishop retreats.',
      '…Nc5 — the knight jumps to a strong square hitting the d3-bishop; Black is clearly better.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '',
      'O-O — castle, the threat is hollow',
      '',
      'b5 — gain space, kick the bishop',
      '',
      'Nc5 — strong square, hit the bishop',
      '', '', '',
    ],
    sources: ['concept:pos-development', 'concept:pos-outpost', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },

  // ── GothamChess Vienna Gambit (student = WHITE) ──────────────────────────
  // Bc5?! instead of Be6 in the gambit main: White grabs the centre with d4
  // and gets a clear edge (positional, +1.4). 20 plies; Bc5 at 11, d4 at 12.
  'pro-gothamchess-vienna:e4_e5_Nc3_Nf6_f4_d5_fxe5_Nxe4_Qf3_Nxc3_bxc3:Bc5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bc5?! Black develops the bishop actively, but it bites on granite and leaves the d5-pawn and the centre to White.',
      'd4 — the punish. White seizes the centre with tempo, hitting the c5-bishop and rolling the big pawn duo forward.',
      '…Be7 — the bishop has to retreat, having achieved nothing.',
      'Bd3 — White trains the bishop on the h7-square, building the kingside attack.',
      '',
      'h4 — the pawn storm begins; White is clearly better with the centre and the initiative.',
      '',
      'Qh5 — the queen joins the kingside build-up, eyeing f7 and h7.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bc5 — bites on granite',
      'd4 — seize the centre with tempo',
      'Be7 — the bishop retreats',
      'Bd3 — aim at h7',
      '',
      'h4 — storm, White is better',
      '',
      'Qh5 — join the attack',
      '',
    ],
    sources: ['concept:pos-center', 'concept:pos-development', 'https://www.chess.com/openings/Vienna-Game-Vienna-Gambit'],
  },

  // …c5 then …d4?! early instead of …Nc6: White ignores it and develops Nf3,
  // keeping the better structure and the c3/d3 clamp (positional, +0.85).
  // 22 plies; d4 at 13, Nf3 at 14.
  'pro-gothamchess-vienna:e4_e5_Nc3_Nf6_f4_d5_fxe5_Nxe4_Qf3_Nxc3_bxc3_c5_Qg3:d4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd4?! Black grabs space, but pushing past gives up the central tension and the d4-pawn will become a target rather than a strength.',
      'Nf3 — White simply develops, eyeing the loose d4-pawn and refusing to be distracted by the advance.',
      '…Nc6 — Black defends the pawn and develops.',
      'Bb5 — the pin, tying the c6-knight to the defence of the over-extended pawn.',
      '',
      'Bc4 — the bishop repositions to hit the d5 and f7 squares.',
      '',
      'Bd5 — White clamps the strong central outpost; the bishop dominates and White is clearly better.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd4 — over-extends, becomes a target',
      'Nf3 — develop, eye the d4-pawn',
      'Nc6 — Black defends',
      'Bb5 — pin the defender',
      '',
      'Bc4 — reposition the bishop',
      '',
      'Bd5 — clamp the outpost, White better',
      '',
    ],
    sources: ['concept:pos-center', 'concept:pos-outpost', 'https://www.chess.com/openings/Vienna-Game-Vienna-Gambit'],
  },

  // …Nc6 then …d4?! instead of …Bf5: same premature push; White pins with Bb5
  // and trades into the better structure (positional, +0.73).
  // 24 plies; d4 at 15, Bb5 at 16.
  'pro-gothamchess-vienna:e4_e5_Nc3_Nf6_f4_d5_fxe5_Nxe4_Qf3_Nxc3_bxc3_c5_Qg3_Nc6_Nf3:d4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd4?! Pushing the pawn again over-extends; it leaves d5 weak and hands White a clear target on d4.',
      'Bb5 — the pin. White ties the c6-knight to the d4-pawn’s defence and prepares to pile on.',
      '',
      'Bc4 — the bishop swings to the a2-g8 diagonal, eyeing d5 and f7.',
      '',
      'Bd5 — the bishop reaches its dream square, clamping the centre.',
      '',
      'Bxe6 — White trades to damage the structure; after the recapture the d4-pawn is weak and White is clearly better.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd4 — over-extends, weakens d5',
      'Bb5 — pin the defender',
      '',
      'Bc4 — swing to the diagonal',
      '',
      'Bd5 — the dream square',
      '',
      'Bxe6 — damage the structure, White better',
      '',
    ],
    sources: ['concept:pos-center', 'concept:pos-outpost', 'https://www.chess.com/openings/Vienna-Game-Vienna-Gambit'],
  },

  // ── GothamChess Italian Game (student = WHITE) ───────────────────────────
  // Giuoco Piano: 5.c3 h6?! is a slow waiting move; White hits the centre with
  // b4-b5 and wins a pawn (confirmed, +1.6 / +1). 16 plies; h6@7, b4@8.
  'pro-gothamchess-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3:h6': {
    watch: [
      '', '', '', '', '', '', '',
      'h6?! A slow waiting move that does nothing for the centre and hands White the initiative for free.',
      'b4 — the punish. White gains queenside space with tempo, kicking the c5-bishop and preparing b5 to chase the knight.',
      '…Bb6 — the bishop retreats; Black is already a step behind.',
      'b5 — the pawn rolls on, forking the c6-knight and cramping Black.',
      '…d5 — Black lashes out, but it loses a pawn by force.',
      'Bxd5 — White scoops the pawn; the engine has White winning.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '',
      'h6 — a slow waiting move',
      'b4 — gain space with tempo',
      'Bb6 — the bishop retreats',
      'b5 — fork the knight, cramp Black',
      'd5 — Black lashes out',
      'Bxd5 — win the pawn, White winning',
      '', '', '',
    ],
    sources: ['concept:pos-center', 'concept:tac-fork', 'https://www.chess.com/openings/Italian-Game-Giuoco-Piano'],
  },

  // Giuoco c3-d4: after the IQP arises, …Bb6?! lets White push d5 with a
  // crushing space bind (confirmed, +2.1). 20 plies; Bb6@11, d5@12.
  'pro-gothamchess-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4:Bb6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bb6?! Retreating the bishop passively lets White seize the centre with a powerful pawn thrust.',
      'd5 — the punish. The pawn jumps forward, kicking the c6-knight and clamping the whole board.',
      '…Ne7 — the knight is shoved to a passive square.',
      'e5 — the second pawn rolls up, hitting the f6-knight and grabbing a huge space bind.',
      '…Ng4 — the knight scrambles for air.',
      'd6 — the pawn wedge drives deeper, ripping Black’s position apart; White is clearly winning.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Bb6 — too passive',
      'd5 — seize the centre, kick the knight',
      'Ne7 — shoved back',
      'e5 — roll the second pawn',
      'Ng4 — scrambling',
      'd6 — the wedge, White winning',
      '', '', '',
    ],
    sources: ['concept:pos-center', 'concept:pos-space', 'https://www.chess.com/openings/Italian-Game-Giuoco-Piano'],
  },

  // Giuoco c3-d4 Greco: …Nxc3?! grabs a pawn but Qe1+! wins it back with a
  // decisive pin and a huge edge (confirmed, +4.8 / +1). 26 plies; Nxc3@17,
  // Qe1+@18.
  'pro-gothamchess-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4_O-O_Bxc3_bxc3:Nxc3': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxc3?! Black snatches the c3-pawn, but the knight is loose and the king is still in the centre — a fatal combination.',
      'Qe1+ — the punish. The queen checks and skewers: it forks the king and the offside knight on c3.',
      '…Ne7 — Black blocks the check, the only move.',
      'Qxc3 — White scoops the knight back; material is even but White is utterly dominant with the centre and the lead in development. The engine reads it as winning.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxc3 — the knight is loose',
      'Qe1+ — check and skewer the knight',
      'Ne7 — forced block',
      'Qxc3 — win the knight back, dominant',
      '', '', '', '', '',
    ],
    sources: ['concept:tac-pin', 'concept:tac-skewer', 'https://www.chess.com/openings/Italian-Game-Giuoco-Piano'],
  },

  // Evans Gambit Accepted: …Nge7?! is passive; Ng5! hits f7 and h7 and starts
  // a winning kingside attack (confirmed, +2.5). 26 plies; Nge7@17, Ng5@18.
  'pro-gothamchess-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Ba5_d4_exd4_O-O_d6_cxd4_Bb6_Nc3:Nge7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nge7?! Developing the knight passively to e7 blocks the e-file and leaves f7 fatally weak.',
      'Ng5 — the punish. The knight leaps to attack f7 and h7, the soft squares around Black’s king.',
      '…Rf8 — Black scrambles to defend f7.',
      'Qh5 — the queen piles onto the kingside, threatening mate on f7 and h7.',
      '…Ng6 — the knight rushes back to defend.',
      'Nxh7 — White crashes through, winning a pawn and shattering the king; the attack is decisive.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nge7 — passive, weakens f7',
      'Ng5 — leap at f7 and h7',
      'Rf8 — Black defends f7',
      'Qh5 — pile on, threaten mate',
      'Ng6 — rush back to defend',
      'Nxh7 — crash through, decisive',
      '', '', '',
    ],
    sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://www.chess.com/openings/Evans-Gambit'],
  },

  // ── GothamChess London / Jobava (student = WHITE) ────────────────────────
  // Jobava move-order: …Nc6?! allows the Nb5 raid; the knight harasses c7 and
  // forces the king to move, costing castling (confirmed, +1.7). 18 plies;
  // Nc6@9, Nb5@10.
  'pro-gothamchess-london:d4_d5_Nc3_Nf6_Bf4_e6_e3_c5_Nf3:Nc6': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Nc6?! A natural developing move, but it allows a strong knight raid into the weak c7-square.',
      'Nb5 — the punish. The knight leaps to b5, threatening the Nc7 fork against the rook and king.',
      '…Kd7 — Black’s king is forced to shuffle to defend c7, losing the right to castle.',
      'Nc7 — the knight harasses, hitting the a8-rook and forcing another concession.',
      '…Rb8 — Black tucks the rook away.',
      'Ng5 — White switches the attack to the kingside, hitting f7. With Black’s king stranded on d7 and unable to castle, White is clearly better.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '',
      'Nc6 — allows the c7-raid',
      'Nb5 — leap at c7, threaten the fork',
      'Kd7 — Black loses castling',
      'Nc7 — harass the rook',
      'Rb8 — Black tucks the rook',
      'Ng5 — switch to f7, White better',
      '', '', '',
    ],
    sources: ['concept:pos-king-safety', 'concept:tac-fork', 'https://www.chess.com/openings/London-System'],
  },

  // ── GothamChess Ponziani (student = WHITE) ───────────────────────────────
  // Main line: …Be7?! is passive; Qb3 + d5 + e6 cramp Black badly (positional,
  // +0.7). 20 plies; Be7@11, Qb3@12.
  'pro-gothamchess-ponziani:e4_e5_Nf3_Nc6_c3_Nf6_d4_exd4_e5_Nd5_cxd4:Be7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Be7?! A passive retreat that does nothing to fight White’s big centre.',
      'Qb3 — White probes the d5-knight and eyes both b7 and f7, gaining time.',
      '', 'd5 — the centre rolls forward, kicking the knight all the way back to b8 and cramping Black completely.',
      '', '', '',
      'e6 — the pawn wedge stabs into Black’s position; with a huge space bind White is clearly better.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'Be7 — too passive',
      'Qb3 — probe, gain time',
      '', 'd5 — cramp, knight back to b8',
      '', '', '',
      'e6 — the wedge, White better',
      '',
    ],
    sources: ['concept:pos-center', 'concept:pos-space', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // Main line with …Bb4+: …Qe7?! is clumsy; White develops Nc3 with a smooth,
  // better game (positional, +0.6). 22 plies; Qe7@13, Nc3@14.
  'pro-gothamchess-ponziani:e4_e5_Nf3_Nc6_c3_Nf6_d4_exd4_e5_Nd5_cxd4_Bb4+_Bd2:Qe7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qe7?! The queen blocks the f8-bishop and stands awkwardly in front of her own pieces.',
      'Nc3 — White develops with tempo, hitting the d5-knight and completing the harmonious setup.',
      '', '', '', 'Bd3 — the bishop trains on h7; White’s pieces flow out naturally while Black stays cramped and clumsy. White is comfortably better.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qe7 — awkward, blocks the bishop',
      'Nc3 — develop with tempo',
      '', '', '', 'Bd3 — aim at h7, White better',
      '', '', '',
    ],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // 4…Nxe4 5.d5 …Na5?? — the knight is trapped on the rim; b4! wins it
  // (confirmed, +2.4 / piece). 18 plies; Na5@9, b4@10.
  'pro-gothamchess-ponziani:e4_e5_Nf3_Nc6_c3_Nf6_d4_Nxe4_d5:Na5': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Na5?? The knight flees to the rim, but there is no escape — it walks into a trap.',
      'b4 — the punish. The pawn attacks the a5-knight, which has no safe square.',
      '…b6 — Black tries to make a luft for the knight, but it is too late.',
      'bxa5 — White simply wins the knight; a clean piece up.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '',
      'Na5 — flees to the rim, trapped',
      'b4 — attack the knight',
      'b6 — too late',
      'bxa5 — win the piece',
      '', '', '', '', '',
    ],
    sources: ['concept:tac-trapped-piece', 'concept:pos-knight-rim', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // 4…Nxe4 5.d5 Bc5 6.dxc6 Bxf2+ 7.Ke2 …d5?! — White consolidates the extra
  // piece with Nbd2 (confirmed, +2.1). 22 plies; d5@13, Nbd2@14.
  'pro-gothamchess-ponziani:e4_e5_Nf3_Nc6_c3_Nf6_d4_Nxe4_d5_Bc5_dxc6_Bxf2+_Ke2:d5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5?! Black throws another pawn forward for activity, but the material deficit is simply too great.',
      'Nbd2 — White calmly develops, challenging the e4-knight and consolidating the extra piece from the gambit chaos.',
      '', 'Nxe4 — White trades off Black’s active knight, simplifying toward a winning material edge.',
      '', 'Kxf2 — the king mops up the bishop; White is up a piece with the storm weathered. Winning.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5 — desperate activity',
      'Nbd2 — consolidate the extra piece',
      '', 'Nxe4 — trade off the active knight',
      '', 'Kxf2 — mop up, a piece up',
      '', '', '',
    ],
    sources: ['concept:pos-material', 'concept:pos-king-safety', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // 3…d5 4.Qa4 Nf6 5.Nxe5 …Bd7?! — White grabs the e5-pawn and trades cleanly,
  // a clear pawn up (confirmed, +1.2). 18 plies; Bd7@9, Nxd7@10.
  'pro-gothamchess-ponziani:e4_e5_Nf3_Nc6_c3_d5_Qa4_Nf6_Nxe5:Bd7': {
    watch: [
      '', '', '', '', '', '', '', '', '',
      'Bd7?! Black offers to trade, but this just helps White keep the extra e5-pawn cleanly.',
      'Nxd7 — White trades off and stays a healthy pawn up.',
      '', 'exd5 — White grabs a second central pawn, the position simplifying in his favour.',
      '', '', '',
      'd4 — White claims the centre; a clean pawn up with the better structure. Winning.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '',
      'Bd7 — helps White keep the pawn',
      'Nxd7 — trade, stay a pawn up',
      '', 'exd5 — grab a second pawn',
      '', '', '',
      'd4 — claim the centre, a pawn up',
      '',
    ],
    sources: ['concept:pos-material', 'concept:pos-center', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // ── GothamChess Anti-Sicilian Rossolimo (student = WHITE) ────────────────
  // After Bxc6 + c3, …e6?! is too slow; d4! opens the centre against the
  // doubled pawns for a clear edge (confirmed, +1.1). 20 plies; e6@11, d4@12.
  'pro-gothamchess-anti-sicilian:e4_c5_Nf3_Nc6_Bb5_g6_Bxc6_bxc6_O-O_Bg7_c3:e6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '',
      'e6?! Too slow — it walls in the g7-bishop and does nothing to fight White’s central break.',
      'd4 — the punish. With Black’s queenside pawns doubled, White opens the centre to exploit the superior structure.',
      '', 'cxd4 — White recaptures, leaving a healthy passed-pawn majority against Black’s doubled c-pawns.',
      '', 'Bf4 — the bishop develops to a strong diagonal; White is clearly better with the cleaner pawns and the freer pieces.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '',
      'e6 — too slow, walls in the bishop',
      'd4 — open the centre',
      '', 'cxd4 — superior structure',
      '', 'Bf4 — develop, White better',
      '', '', '',
    ],
    sources: ['concept:pos-center', 'concept:pos-pawn-structure', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },

  // After Bxc6 + c3 Nf6 Re1, …d5?! lets White grab the e5 wedge with a lasting
  // space bind (positional, +0.8). 22 plies; d5@13, e5@14.
  'pro-gothamchess-anti-sicilian:e4_c5_Nf3_Nc6_Bb5_g6_Bxc6_bxc6_O-O_Bg7_c3_Nf6_Re1:d5': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5?! Advancing the pawn lets White clamp the centre with a strong wedge.',
      'e5 — the punish. The pawn jumps forward, kicking the f6-knight and grabbing a cramping space bind.',
      '…Nd7 — the knight is shoved to a passive square.',
      'd4 — White builds the big pawn centre, the e5/d4 duo dominating the board and burying Black’s doubled pawns.',
      '', '', '', 'White is clearly better with the space and the structure.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'd5 — lets White clamp the centre',
      'e5 — the space wedge, kick the knight',
      'Nd7 — shoved back',
      'd4 — build the big centre',
      '', '', '', 'space and structure, White better',
      '',
    ],
    sources: ['concept:pos-center', 'concept:pos-space', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },

  // ── GothamChess Milner-Barry Gambit (student = WHITE) ────────────────────
  // French Advance: …c4?! releases the central tension early; b3! undermines
  // the pawn chain for a clear edge (positional, +1.0). 16 plies; c4@7, b3@8.
  'pro-gothamchess-milner-barry:e4_e6_d4_d5_e5_c5_c3:c4': {
    watch: [
      '', '', '', '', '', '', '',
      'c4?! Releasing the central tension hands White a free hand — the c5-c4 push leaves the d4-pawn unchallenged and the pawn chain there to be undermined.',
      'b3 — the punish. White strikes at the base of Black’s queenside pawn chain, opening lines against the over-extended pawns.',
      '', 'Qf3 — White develops the queen actively, eyeing the kingside and the loosened light squares.',
      '', 'a4 — White expands and undermines further; with the better structure and freer pieces White is clearly better.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '',
      'c4 — releases the tension',
      'b3 — undermine the chain',
      '', 'Qf3 — develop actively',
      '', 'a4 — expand, White better',
      '', '', '',
    ],
    sources: ['concept:pos-pawn-structure', 'concept:pos-center', 'https://www.chess.com/openings/French-Defense-Advance-Variation'],
  },

  // Main gambit: …Nxd4?! grabs the pawn but Nxd4 then Nb5-Nd6+ wins material
  // by force (confirmed, +3.5). 22 plies; Nxd4@13, Nxd4@14.
  'pro-gothamchess-milner-barry:e4_e6_d4_d5_e5_c5_c3_Nc6_Nf3_Qb6_Bd3_cxd4_cxd4:Nxd4': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxd4?! Grabbing the gambit pawn this way runs into a concrete refutation.',
      'Nxd4 — White recaptures, and now the knight eyes b5 and the d6-square.',
      '…Bc5 — Black hits the knight, hoping to win it.',
      'Nb5 — the point! The knight jumps to b5, threatening the crushing Nd6+ fork.',
      '…a6 — Black tries to chase it, but it is too late.',
      'Nd6+ — the fork lands, winning the bishop pair and the exchange; White emerges clearly up material.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nxd4 — runs into a refutation',
      'Nxd4 — recapture, eye b5/d6',
      'Bc5 — Black hits the knight',
      'Nb5 — threaten Nd6+',
      'a6 — too late',
      'Nd6+ — the fork, win material',
      '', '', '',
    ],
    sources: ['concept:tac-fork', 'concept:tac-knight-outpost', 'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit'],
  },

  // Declined with …Bd7: …Nge7?! is passive; dxc5! grabs the pawn back with a
  // clear edge (positional, +1.0). 22 plies; Nge7@13, dxc5@14.
  'pro-gothamchess-milner-barry:e4_e6_d4_d5_e5_c5_c3_Nc6_Nf3_Qb6_Bd3_Bd7_O-O:Nge7': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nge7?! Too passive — the knight blocks the e7-bishop and lets White resolve the centre favourably.',
      'dxc5 — White grabs the c5-pawn, gaining time on the b6-queen and keeping the extra structure.',
      '…Qxc5 — the queen recaptures, exposed in the centre.',
      'b4 — White hits the queen with tempo, gaining queenside space.',
      '…Qb6 — the queen retreats once more.',
      'Qe2 — White completes development with a clear initiative; the gambit has transposed into a pleasant, better game.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nge7 — too passive',
      'dxc5 — grab the pawn with tempo',
      'Qxc5 — the queen is exposed',
      'b4 — hit the queen, gain space',
      'Qb6 — the queen retreats',
      'Qe2 — develop, clear edge',
      '', '', '',
    ],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/French-Defense-Advance-Variation-Milner-Barry-Gambit'],
  },

  // vs …Nh6: …Qb6?! allows Nc3 + Bxf5 + Nxd5 winning the d5-pawn (confirmed,
  // +1.0). 22 plies; Qb6@13, Nc3@14.
  'pro-gothamchess-milner-barry:e4_e6_d4_d5_e5_c5_c3_Nc6_Nf3_Nh6_Bd3_cxd4_cxd4:Qb6': {
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qb6?! The queen eyes d4 and b2, but it leaves the d5-pawn under-defended.',
      'Nc3 — White develops, adding a defender to the centre and an attacker to d5.',
      '', 'Bc2 — White repositions the bishop, unblocking and preparing to pile on d5.',
      '', 'Bxf5 — White trades to damage the structure, then targets the loose d5-pawn.',
      '', 'Nxd5 — the knight grabs the central pawn; White is a clean pawn up with the better game.',
      '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qb6 — leaves d5 loose',
      'Nc3 — develop, defend and attack',
      '', 'Bc2 — reposition, eye d5',
      '', 'Bxf5 — damage the structure',
      '', 'Nxd5 — win the pawn',
      '',
    ],
    sources: ['concept:pos-center', 'concept:tac-overloaded-defender', 'https://www.chess.com/openings/French-Defense-Advance-Variation'],
  },

  // ── GothamChess Fantasy Variation vs Caro (student = WHITE) ──────────────
  // 3…dxe4 4.fxe4 …e6?! is passive; Nf3 then d5! gains a strong central space
  // edge (confirmed, +1.0). 16 plies; e6@7, Nf3@8.
  'pro-gothamchess-fantasy-caro:e4_c6_d4_d5_f3_dxe4_fxe4:e6': {
    watch: [
      '', '', '', '', '', '', '',
      'e6?! Passive — it walls in the light-squared bishop and lets White seize the centre.',
      'Nf3 — White develops naturally, preparing to expand in the centre with the big e4/d4 duo.',
      '…c5 — Black strikes at the centre, the principled freeing try.',
      'd5 — the punish. White rams the pawn forward, gaining a strong central space wedge and cramping Black’s position.',
      '', '', 'exd5 — after the exchanges White has the freer game with the central space and the better-placed pieces.',
      '', '',
    ],
    learn: [
      '', '', '', '', '', '', '',
      'e6 — passive, walls in the bishop',
      'Nf3 — develop, prepare to expand',
      'c5 — Black strikes the centre',
      'd5 — ram the wedge, cramp Black',
      '', '', 'exd5 — central space, White better',
      '', '',
    ],
    sources: ['concept:pos-center', 'concept:pos-space', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },
};

export function getGemNarration(gemId: string): GemNarration | null {
  return GEM_NARRATION[gemId] ?? null;
}
export function hasGemNarration(gemId: string): boolean {
  return gemId in GEM_NARRATION;
}
