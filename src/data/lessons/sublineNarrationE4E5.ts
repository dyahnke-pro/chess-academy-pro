import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration } from '../../services/sublineLesson';

// GROUP A — 1.e4 e5 complex + e4 gambits. Owned by ONE parallel session.
// Hand-written, board-verified subline narration. Every entry binds to a REAL
// subline in course-sublines.json (key `${openingId}::${variationIndex}::${trigger}@${atPly}`),
// the line replays legally, beats land on real plies, vision-arrow origins sit on
// real pieces, cues are ≤8 words, and every source resolves. Never generated,
// never templated (G3 — the LLM only phrases facts true on the board).

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

const RUY = ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const RUY_DEV = ['book:ruy-lopez', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];

// ── Ruy Lopez (student WHITE). triggerMove is BLACK's deviation; narrate White's plan. ──

// Nf6@5 — the Berlin Defence (Bb5 Nf6). Berlin Wall endgame OR quiet d3.
const RUY_BERLIN: SublineNarration = {
  intro: {
    say: "Nf6 — the Berlin Defence, the granite wall Kramnik used to take Kasparov's crown. Black ignores the hit on e5 and just develops, daring you into the famous Berlin endgame. Castle: after …Nxe4, d4, …Nd6, Bxc6 dxc6, dxe5 the queens come off and you nurse a small, nagging pull — Black's doubled c-pawns against your healthy kingside majority. Want queens on? d3 keeps a quiet, lasting Italian-style squeeze.",
    sayShort: 'Nf6 — Berlin: castle and squeeze.',
  },
  sources: RUY,
};
// Nxe4@9 — the Open Ruy Lopez (Ba4 Nf6 O-O Nxe4). Strike with d4.
const RUY_OPEN: SublineNarration = {
  intro: {
    say: "Nxe4 — the Open Ruy Lopez. Black snatches the e4-pawn and bets everything on free, active piece play. You hit back in the centre at once with d4: after …b5, …d5 and …Be6 the position opens, but the trumps are yours — a mobile central majority, an Re1 boring down the e-file, and the lasting weakness of Black's loosened queenside. Develop fast and the structure tells.",
    sayShort: 'Nxe4 — Open Ruy: strike with d4.',
  },
  sources: RUY,
};
// b5@9 — Black grabs queenside space (O-O b5), Arkhangelsk/Møller territory.
const RUY_B5: SublineNarration = {
  intro: {
    say: "…b5 — Black grabs queenside space and chases your bishop before tending the kingside, steering toward the Arkhangelsk and Møller systems. Retreat to b3, where the bishop keeps raking the a2-g8 diagonal straight at f7. You've lost nothing: meet the coming …Bb7 or …Bc5 with a calm c3 and d3, building the centre while Black's early …b5 leaves c6 and the d5-square a shade loose.",
    sayShort: '…b5 — retreat Bb3, keep eyeing f7.',
  },
  sources: RUY,
};
// Closed Ruy — Black castles (O-O@11/@13). The great Spanish build-up.
const RUY_CLOSED_OO: SublineNarration = {
  intro: {
    say: "…O-O — Black castles into the main-line Closed Ruy. Now the great Spanish build-up begins: c3 to prepare d4, and the knight tour Nbd2-f1-g3 swinging toward the kingside. You're playing for a slow central clamp and a later kingside initiative — the richest, most-trodden middlegame in all of chess, and you hold the easier side of it.",
    sayShort: '…O-O — c3, d4, the knight tour.',
  },
  sources: RUY,
};
// Closed Ruy — Black props e5 with …d6 (d6@11/@13/@15).
const RUY_CLOSED_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black props the e5-pawn in classic Closed-Ruy style before castling. Your recipe is unhurried and unchanged: c3 and d4 for the broad centre, Nbd2-f1-g3 routing the knight to the kingside, Bc2 to keep the bishop alive on the b1-h7 diagonal. The set-up is rock-solid but a touch passive — you own the space and dictate where the game is fought.",
    sayShort: '…d6 — c3, d4, clamp the centre.',
  },
  sources: RUY,
};
// Bg4@15 — Black pins f3 before castling (…c3 Bg4).
const RUY_BG4: SublineNarration = {
  intro: {
    say: "…Bg4 — Black pins the f3-knight before castling, leaning on your kingside. No need to rush: put the question with h3, and after …Bh5 the bishop can be left or traded on f3 to hand you the bishop pair. Then push on with d4 and the centre — the pin is an annoyance, not a threat, and your space edge persists.",
    sayShort: '…Bg4 — put the question with h3.',
  },
  sources: RUY,
};
// Na5@17 — the Chigorin (…c3 O-O h3 Na5). Keep the bishop: Bc2.
const RUY_CHIGORIN: SublineNarration = {
  intro: {
    say: "…Na5 — the classical Chigorin: Black chases your prized light-squared bishop off the a2-g8 diagonal. Don't allow the trade — retreat to c2, where the bishop swings onto the b1-h7 diagonal aimed at Black's king. The knight on a5 sulks on the rim, miles from the centre, and you'll seize space with d4 while it tries to find a way home.",
    sayShort: '…Na5 — keep the bishop: Bc2.',
  },
  sources: RUY,
};
// Nb8@17 — the Breyer (…c3 O-O h3 Nb8). Knight reroutes via d7.
const RUY_BREYER: SublineNarration = {
  intro: {
    say: "…Nb8 — the Breyer Defence, the deepest idea in the Closed Ruy: Black retreats the knight all the way home to reroute it via d7, where it shores up e5 and frees the c-pawn. It's slow, so seize the moment — play d4 and grab the centre while the knight is offside. You get a free hand and a real space edge before Black completes the manoeuvre.",
    sayShort: '…Nb8 — Breyer: grab the centre, d4.',
  },
  sources: RUY,
};
// Bb7@17 — the Zaitsev (…c3 O-O h3 Bb7). Bishop eyes e4.
const RUY_ZAITSEV: SublineNarration = {
  intro: {
    say: "…Bb7 — the Zaitsev System, Karpov's old workhorse. The bishop trains on e4 down the long diagonal, daring you to defend the centre. Answer with d4, building the broad pawn duo; the bishop's pressure on e4 is real but containable, and your space plus the standard Nbd2-f1-g3 regroup keep the initiative firmly in your hands.",
    sayShort: '…Bb7 — Zaitsev: build d4, hold e4.',
  },
  sources: RUY,
};
// Bb7@15 — anti-Marshall a4, then …Bb7.
const RUY_BB7_A4: SublineNarration = {
  intro: {
    say: "…Bb7 — Black fianchettoes against your anti-Marshall a4, aiming the bishop at e4. The a4-thrust has already pried at b5, so keep the queenside pressure: trade on b5 or prod with axb5, then turn to d4 and the centre. You've dodged the Marshall gambit entirely and kept a clean, pleasant Spanish pull.",
    sayShort: '…Bb7 — pressed queenside, then d4.',
  },
  sources: RUY,
};
// Bc5@11 — the Møller (…O-O b5 Bb3 Bc5). Active bishop on the a7-g1 diagonal.
const RUY_MOLLER: SublineNarration = {
  intro: {
    say: "…Bc5 — the Møller Defence, throwing the bishop to its most active diagonal aimed at f2 instead of the meek …Be7. Meet the aggression head-on: c3 prepares d4, and after the centre advances you gain tempo hitting the bishop while it hunts for a safe square. Black's piece is busy and a little loose — you take the centre and the better-coordinated game.",
    sayShort: '…Bc5 — Møller: c3 then d4 with tempo.',
  },
  sources: RUY,
};
// Bc5@9 / Bc5@7 — Black develops the bishop actively a touch early.
const RUY_BC5_EARLY: SublineNarration = {
  intro: {
    say: "…Bc5 — Black skips …Be7 and posts the bishop actively toward f2. Make the move-order cost something: c3 prepares d4, and when the centre rolls forward you'll hit the bishop with tempo and gain the space you want. The active bishop looks pretty, but it's the piece you'll be chasing while you build.",
    sayShort: '…Bc5 — c3 and d4, gain tempo.',
  },
  sources: RUY,
};
// Be7@11 — Black plays …Be7 in the …b5 lines (…O-O b5 Bb3 Be7).
const RUY_BE7_LATE: SublineNarration = {
  intro: {
    say: "…Be7 — Black tucks the bishop back into the solid Closed-Ruy slot after the early …b5. Nothing changes: c3 and d4 build the centre, Nbd2-f1-g3 routes the knight kingside, and the bishop on b3 keeps watch over f7. A sound but passive set-up for Black — you take the space and the long initiative.",
    sayShort: '…Be7 — Closed Ruy: c3 and d4.',
  },
  sources: RUY,
};
// d6@7 cont — the Steinitz Deferred (Ba4 d6 O-O). One White move follows.
const RUY_STEINITZ: SublineNarration = {
  intro: {
    say: "…d6 — the Steinitz Deferred, an old and ultra-solid way to prop the e5-pawn at once. Castle and keep your central break d4 in reserve: Black's set-up is cramped and a little passive, so develop naturally, prepare c3 and d4, and squeeze the extra space. Reliable for Black, but you call the tune.",
    sayShort: '…d6 — Steinitz: castle, ready d4.',
  },
  beats: [
    { atMove: 8, say: "O-O — the king reaches g1 and you keep every option open. The d4 break is loaded for when Black commits, and the Spanish bishop on a4 still leans on c6. Black is solid but passive; you simply have more space and the freer game.", highlights: [H('g1', SOFT), H('d4', KEY)] },
  ],
  sources: RUY,
};
// f5@5 cont — the Schliemann/Jaenisch against the Ruy (Bb5 f5 Nc3 fxe4 Nxe4 Nf6).
const RUY_SCHLIEMANN_W: SublineNarration = {
  intro: {
    say: "…f5 — the Schliemann, Black's wildest Ruy gambit, blasting the f-pawn at your centre. Don't get greedy in the chaos — the cool, theory-approved antidote is Nc3, ignoring the pawn-grab and developing with threats. After …fxe4 Nxe4 the knight lands on a beautiful central square, your king is safe, and Black's loosened kingside becomes a long-term liability.",
    sayShort: '…f5 — Schliemann: answer Nc3.',
  },
  beats: [
    { atMove: 8, say: "Nxe4 — the knight recaptures onto a dominant central post, eyeing d6 and g5. You've kept your structure whole while Black has spent a kingside pawn and bared the e8-h5 diagonal; develop, castle, and the holes around Black's king do the talking.", arrows: [A('e4', 'd6')], highlights: [H('e4', KEY)] },
  ],
  sources: RUY_DEV,
};
// Open Ruy deep tail (var 3: …Nxe4 d4 b5 Bb3 then exd4/d6/Be7/Nxd4/Bc5).
const RUY_OPEN_DEEP: SublineNarration = {
  intro: {
    say: "The Open Ruy unfolds — Black holds the extra e4-pawn behind …b5 and busy pieces, you have the centre and the initiative. Keep the pressure flowing: Nxd4 or the centralising moves regain the pawn, the d-file and e-file open for your rooks, and Black's straggling queenside is the chronic target. Develop, double on the open lines, and press the structural edge.",
    sayShort: 'Open Ruy — regain the pawn, press.',
  },
  sources: RUY,
};
// Berlin Wall endgame deep tail (var 4: …Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 …).
const RUY_BERLIN_ENDGAME: SublineNarration = {
  intro: {
    say: "The Berlin endgame — queens are gone, Black's king has lost the right to castle, and the famous Wall is up. This is a positional grind, not a knockout: your trump is the clean kingside pawn majority that can make a passer, against Black's crippled doubled c-pawns that never will. Clamp the dark squares with Bf4 and Nc3, restrain Black's bishop pair, and squeeze the long endgame.",
    sayShort: 'Berlin endgame — grind the better majority.',
  },
  sources: ['book:ruy-lopez', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Ruy_Lopez,_Berlin_Defence'],
};
// Exchange Ruy, …dxc6 deep tail (var 8: Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 …).
const RUY_EXCHANGE_DXC6: SublineNarration = {
  intro: {
    say: "The Exchange Ruy with …dxc6 — Black keeps the bishop pair and the half-open d-file as compensation for the shattered, doubled c-pawns. Your edge is structural and durable: a clean four-against-three kingside majority that can roll to a passed pawn, while Black's extra queenside pawn is worthless. Trade pieces, steer for the endgame, and let the healthier pawns decide — Fischer's favourite way to play the Spanish.",
    sayShort: 'Exchange — trade down, win the majority.',
  },
  sources: ['book:ruy-lopez', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};
// Marshall pawn push e4@17 (var 5: …c3 d5 exd5 e4). Student White, a pawn up.
const RUY_MARSHALL_E4: SublineNarration = {
  intro: {
    say: "…e4 — the Marshall Attack in full cry. Black has burned a pawn to rip open lines at your king, and now jams the e-pawn forward to kick your f3-knight and clear the way for …Bd6, …Qh4 and a rook-lift onslaught. You're a clean pawn up — defence is your whole game. Tuck the pieces back with d4, Be3 and Nd2, give nothing soft, and once the storm spends itself the extra pawn wins.",
    sayShort: '…e4 — Marshall: defend the extra pawn.',
  },
  sources: ['book:ruy-lopez', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Marshall_Attack'],
};

// ── Italian Game (student WHITE). triggerMove is BLACK's deviation. ──
const IT = ['book:italian-game', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'];
const IT_CTR = ['book:italian-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'];

// Bc5@5 — Bc4 Bc5, the Giuoco Piano proper.
const IT_GP_BC5: SublineNarration = {
  intro: {
    say: "…Bc5 — the Giuoco Piano, the oldest opening in the book and still a main road. Both bishops point at the enemy f-pawn. Now you choose your tempo: the modern c3-and-d3 build-up for a slow central clamp, or the classical c3 and an immediate d4 to blow the centre open. Either way you steer the structure, and Black has nothing better than to follow.",
    sayShort: '…Bc5 — Giuoco Piano: build c3 and d4.',
  },
  sources: IT,
};
// Nf6@5 — Bc4 Nf6, the Two Knights.
const IT_TWO_KNIGHTS: SublineNarration = {
  intro: {
    say: "…Nf6 — the Two Knights, the fighting reply, hitting your e4-pawn at once and inviting a brawl. The choice is yours: the swashbuckling Ng5 lunging straight at f7, or the principled d4 break tearing open the centre. Black has picked the sharpest battleground in the Italian — meet it head-on and play for the initiative.",
    sayShort: '…Nf6 — Two Knights: d4 or Ng5.',
  },
  sources: IT,
};
// Be7@5 — Bc4 Be7, the Hungarian Defence.
const IT_HUNGARIAN: SublineNarration = {
  intro: {
    say: "…Be7 — the Hungarian Defence, the safe and modest sidestep that ducks every Italian sharpness. Black gives ground without a fight, so take it: play d4, build the broad centre, castle, and develop with a free hand. There are no tricks here — just a clean space advantage and an easier game for you to press.",
    sayShort: '…Be7 — Hungarian: take the centre, d4.',
  },
  sources: IT_CTR,
};
// Pianissimo (var2, Bc4 Bc5 d3) — slow maneuvering: O-O@9, a6@13/@11/@9, a5@11, h6@11, d6@7.
const IT_PIANISSIMO: SublineNarration = {
  intro: {
    say: "Black settles into the quiet Giuoco Pianissimo, matching your d3 with patient development. No fireworks, so play the modern main-line plan: a3 and c3 to prepare a clamping b4 or d4, the Nbd2-f1-g3 knight tour to the kingside, and Re1 behind the e-pawn. Tiny, lasting space is the whole game — out-manoeuvre, don't out-blast.",
    sayShort: 'Quiet Italian — a3, c3, the knight tour.',
  },
  sources: IT,
};
// Bb6@11 — cxd4 Bb6, Black retreats; White owns the broad d4-e4 centre.
const IT_GIUOCO_BB6: SublineNarration = {
  intro: {
    say: "…Bb6 — Black tucks the bishop back to safety, leaving you with the prize: a broad, mobile d4-e4 pawn centre. This is the whole point of the c3-d4 Giuoco. Roll the pawns — d5 to gain space and cramp the c6-knight, or develop with Nc3 and pile up — and use your central majority to squeeze Black off the board.",
    sayShort: '…Bb6 — own the centre, push d5.',
  },
  sources: IT_CTR,
};
// Bb6@11 in the Pianissimo (var2, d3 …Bb6) — slow.
const IT_PIANISSIMO_BB6: SublineNarration = {
  intro: {
    say: "…Bb6 — Black retreats the bishop to its safe Pianissimo square, keeping things solid and quiet. Stay patient and play the system: c3 to brace the centre, Nbd2-f1-g3 routing the knight to the kingside, and prepare the d4 break for the right moment. A long manoeuvring game where your small space edge is the asset to nurse.",
    sayShort: '…Bb6 — patient: c3, knight tour, d4.',
  },
  sources: IT,
};
// Bxc3+@13 — Black trades on c3, you build the big centre with bxc3.
const IT_GRECO_BXC3: SublineNarration = {
  intro: {
    say: "…Bxc3+ — Black trades the dark bishop off, and bxc3 hands you exactly what the Giuoco dreams of: a towering d4-e4 pawn centre on a half-open b-file. Black has surrendered his most active piece to dent your pawns, but those pawns are a battering ram, not a weakness. Push d5 or e5, open lines for the bishop pair, and storm forward.",
    sayShort: '…Bxc3+ — bxc3: a towering centre.',
  },
  sources: IT_CTR,
};
// O-O@13 — Black castles into the centre (…Bb4+ Nc3 O-O). Greco attack.
const IT_GRECO_OO: SublineNarration = {
  intro: {
    say: "…O-O — Black castles right into your big centre, the critical Greco test. Now you uncork the attack the line was built for: d5 to kick the c6-knight, Bg5 to pin the defender of the kingside, and the e-pawn rolling toward Black's king. You have the centre, the bishop pair and the initiative — play fast and direct.",
    sayShort: '…O-O — strike d5 and Bg5, attack.',
  },
  sources: IT_CTR,
};
// d6@13 / d5@13 — Black challenges your centre.
const IT_GRECO_BREAK: SublineNarration = {
  intro: {
    say: "Black challenges your broad centre rather than castle into it. Don't let the pawns be undermined cheaply: meet …d5 with e5, clamping and gaining space, and answer …d6 by completing development with d5 or Bg5 and keeping the duo intact. The centre is your engine — protect it, then advance it at Black's king.",
    sayShort: 'Defend the centre, answer …d5 with e5.',
  },
  sources: IT_CTR,
};
// Møller Attack — Nxc3@15 (var0) / Bxc3@15 (var6): the sharp sac line.
const IT_MOLLER: SublineNarration = {
  intro: {
    say: "The Møller Attack — Black has snatched on e4 and c3, and you are down material but holding a thunderclap of an initiative. The whole point is speed: Re1, Ba3 and the d5-thrust rain down on Black's stranded king before it can find shelter. Objectively Black can hold with precise defence, but over the board this is one of the most fearsome practical attacks in the open games — play it with fire.",
    sayShort: 'Møller — sac material, attack at full speed.',
  },
  sources: ['book:italian-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Giuoco_Piano'],
};
// Bd2 quiet line (var1) — …Bb4+ Bd2 Bxd2+ Nbxd2 O-O. Active isolated d-pawn.
const IT_BD2_QUIET: SublineNarration = {
  intro: {
    say: "…O-O — the quiet Bd2 main line, where Black has traded the dark bishops to defuse the attack. You're left with an isolated d4-pawn, but it's the GOOD kind: it grips e5 and c5, your pieces flow to active squares, and Re1, Ne5 and a kingside build-up give you the easier game. The isolani is a spear here, not a weakness.",
    sayShort: '…O-O — active isolani: Re1, Ne5, press.',
  },
  sources: IT_CTR,
};
// Bd2 line, Black's …d5 freeing manoeuvre (Nce7@19, Na5@23) — equalizing, stay active.
const IT_BD2_FREEING: SublineNarration = {
  intro: {
    say: "Black breaks with …d5 and reroutes the knight to blockade your isolated d-pawn — the book equalizing method. Don't drift: keep the pieces active, Qb3 and the rooks bearing on the d- and e-files, and probe the kingside before the blockade sets. The position is balanced, so the win is MADE — keep the initiative and make Black solve problems.",
    sayShort: '…d5 — stay active, press before the blockade.',
  },
  sources: IT_CTR,
};
// Bd2 line, …d6 (d6@15) — solid.
const IT_BD2_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black props e5 and keeps the structure compact in the quiet Bd2 line. With the dark bishops traded there's no attack to fear and none to fear from; you have the freer development and the central d4-pawn. Complete the build-up with Nc3 and Re1, keep the small space edge, and play the long game from the better side of equality.",
    sayShort: '…d6 — develop, hold the small edge.',
  },
  sources: IT_CTR,
};
// Giuoco waiting moves (a6@7, h6@7, Qf6@7) after Bc4 Bc5 c3.
const IT_GP_WAIT: SublineNarration = {
  intro: {
    say: "Black slips in a useful little move while you prepare the centre. It costs a tempo you should pounce on: play d4 right now, opening the position before Black is ready for it. With your development a step ahead, the central break favours you — seize the centre and the initiative comes with it.",
    sayShort: 'A waiting move — strike d4 at once.',
  },
  sources: IT,
};
// Evans Gambit (var3, b4 Bxb4 c3 Ba5 d4) — accepted, White's big centre + dev for the pawn.
const IT_EVANS: SublineNarration = {
  intro: {
    say: "The Evans Gambit accepted — you've thrown the b-pawn to rip open lines and gain a colossal lead in development. This is romantic-era chess at its purest: the c3-d4 centre rolls forward, the bishop swings to a3 hitting Black's stuck king, and every tempo screams. You're a pawn down and completely on top — develop with threats and pour the attack on before Black untangles.",
    sayShort: 'Evans accepted — roll the centre, attack.',
  },
  sources: ['book:evans-gambit', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
};
// Evans, Black returns the pawn / consolidates (Ne5@17, Bg4@15 deep) — same theme.
const IT_EVANS_DEEP: SublineNarration = {
  intro: {
    say: "Deep in the Evans Gambit, your pawns dominate the board — the broad d4-e4-d5 wedge cramps Black while your pieces eye his king. The gambit pawn is a memory; the lead in space and time is the reality. Keep developing toward the king, open a file with f4 or a rook-lift, and convert the initiative the gambit bought you.",
    sayShort: 'Evans — dominate with the centre, attack.',
  },
  sources: ['book:evans-gambit', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
};
// Hungarian with d4 (var4) — exd4@7, dxe5@9, Bg4@9: comfortable centre vs passive Black.
const IT_HUNGARIAN_D4: SublineNarration = {
  intro: {
    say: "Black plays the modest Hungarian and you've answered with d4, the principled central thrust. The Hungarian's price is passivity: you get the bigger share of the centre and the freer pieces, so develop naturally, castle, and use the space. Black is solid but cramped — squeeze, and the small advantage grows with every quiet move.",
    sayShort: 'Hungarian — d4 centre, squeeze the space.',
  },
  sources: IT_CTR,
};
// Hungarian Qh5 pawn-recovery line (var4) — Be6@13, Nf6@13, Nh6@13, Qd4@13, f6@15.
const IT_HUNGARIAN_QH5: SublineNarration = {
  intro: {
    say: "Qh5 — you swing the queen out to win back the e5-pawn and poke at f7. Black must spend a move defending, and after you recover the pawn the position is level and open. Don't over-press a balanced game: regain the material, complete development, and play from the small comfort of the freer pieces. Solid for both — patience wins it.",
    sayShort: 'Qh5 — regain the pawn, stay level.',
  },
  sources: IT,
};
// Scotch Gambit / Two Knights 4.d4 (var5) — Nxe4@7, Nxd4@7, d5@7, d6@7.
const IT_SCOTCH_GAMBIT: SublineNarration = {
  intro: {
    say: "You've met the Two Knights with d4, the Scotch Gambit, offering a pawn to seize the initiative. After …exd4 your lead in development is the asset: O-O and Re1 throw the rook onto the open e-file, the bishop glares at f7, and the Max Lange and Canal attacks loom. Black must defend precisely — play energetically and make the gambit pawn pay in pure activity.",
    sayShort: 'Scotch Gambit — O-O, Re1, attack f7.',
  },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Gambit'],
};
// Max Lange / Canal deep tail (var5, Rxe6 lines) — Be7@23, Qd5@23, Qf5@23, h6@23, f5@11.
const IT_MAXLANGE_DEEP: SublineNarration = {
  intro: {
    say: "The smoke clears in the Canal-Max Lange complex: the tactics have run their course, material is roughly level, and your pieces are the active ones — rook deep on e6, knights and bishop swarming Black's exposed king. This is a sharp, double-edged middlegame where initiative is everything. Keep forcing, target the loosened kingside, and don't let Black consolidate.",
    sayShort: 'Max Lange — active pieces, keep forcing.',
  },
  sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'],
};

// ── Two Knights Defence (student BLACK). triggerMove is WHITE's deviation. ──
const TK = ['book:two-knights-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'];
const TK_INIT = ['book:two-knights-defence', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'];

// d3@6 — Bc4 Nf6 d3, the quiet Modern (White ducks Ng5).
const TK_D3_QUIET: SublineNarration = {
  intro: {
    say: "d3 — White declines the sharp Ng5 lunge for the quiet Modern treatment, propping the bishop and biding time. That suits you perfectly: develop in comfort with …Bc5 or …Be7, …d6 and …O-O, and aim for the freeing …d5 break or …Na5 to swap off White's strong light bishop. No tricks, no pressure — a sound, equal game where your pieces flow freely.",
    sayShort: 'd3 — develop freely, aim for …d5.',
  },
  sources: TK,
};
// Ng5@6 — the Knight Attack / Fried Liver lunge at f7. Answer …d5.
const TK_NG5: SublineNarration = {
  intro: {
    say: "Ng5 — the Knight Attack, lunging straight at f7 and the Fried Liver. It looks scary and it is completely fine for you: answer …d5! striking the centre and slamming the door, the move every theory book demands. After exd5 you have the Polerio's …Na5 hitting the c4-bishop, or the razor-sharp …b5 and …Nd4 gambits — in every one you get a roaring initiative for a pawn. Never fear Ng5; welcome it.",
    sayShort: 'Ng5 — answer …d5, seize the initiative.',
  },
  sources: TK,
};
// d4@6 — Bc4 Nf6 d4, the Scotch Gambit. Take …exd4.
const TK_D4_GAMBIT: SublineNarration = {
  intro: {
    say: "d4 — the Scotch Gambit, offering a pawn to prise the centre open. Take it with …exd4: you're a pawn up and the way to neutralise the coming Max Lange is the central counter …d5 yourself, returning the pawn to free your pieces and blunt White's bishop. Defend the first few energetic moves accurately and the position is balanced — or better, with that extra pawn.",
    sayShort: 'd4 — take …exd4, then strike …d5.',
  },
  sources: TK,
};
// d4@4 cont — the Scotch Game (e4 e5 Nf3 Nc6 d4). Equalize with …Qe7/…Nd5.
const TK_SCOTCH: SublineNarration = {
  intro: {
    say: "d4 — White swerves into the Scotch, trading the central pawns to free his pieces early. The book equalizer is precise and well worth knowing: after the exchanges, …Qe7 pressures the advanced e5-pawn and …Nd5 plants the knight on a dominant central blockade. You accept doubled c-pawns but gain the bishop pair and rock-solid piece play — a comfortable, fully equal game.",
    sayShort: 'd4 — Scotch: …Qe7 and …Nd5 equalize.',
  },
  beats: [
    { atMove: 11, say: "…Qe7 — the queen swings out to lean on the advanced e5-pawn, the cramping spearhead of White's position. It defends the attacked f6-knight and prepares …Nd5, after which e5 becomes a target rather than a thorn. This is the move that takes the sting out of the Scotch.", arrows: [A('e7', 'e5')], highlights: [H('e5', KEY)] },
    { atMove: 13, say: "…Nd5 — the knight lands on its dream central square, blockading and eyeing both wings. Yes, your c-pawns are doubled, but you hold the bishop pair and the freer game; the strong knight and open b-file are full compensation. You've equalised cleanly from the Scotch.", highlights: [H('d5', KEY)] },
  ],
  sources: TK,
};
// Nc3@4 cont — the Four Knights (e4 e5 Nf3 Nc6 Nc3 Nf6). Symmetrical, solid.
const TK_FOUR_KNIGHTS: SublineNarration = {
  intro: {
    say: "Nc3 — White steers into the calm, classical Four Knights, mirroring development. Match him with …Nf6 and you stand on perfectly equal ground: solid, symmetrical, no weaknesses. If White ever drifts you have the …Bb4 pin and the …Nd4 Rubinstein counter waiting; until then, develop comfortably and there is simply nothing to fear.",
    sayShort: 'Nc3 — Four Knights: …Nf6, easy equality.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 — the symmetrical reply, claiming your own share of the centre. The position is balanced and weakness-free; from here the …Bb4 pin and the …Nd4 Rubinstein keep dynamic resources in reserve while you develop in total comfort.", highlights: [H('e4', SOFT), H('e5', SOFT)] },
  ],
  sources: TK,
};
// Bb5@4 cont (var0) — White transposes to a Ruy. Play …a6.
const TK_RUY: SublineNarration = {
  intro: {
    say: "Bb5 — White sidesteps the Two Knights and transposes to a Ruy Lopez. Nothing to fear: put the question with …a6, and after Ba4 you're in familiar Spanish territory with …b5 held in reserve to kick the bishop. Develop solidly with …Be7 and …O-O — a balanced, deeply-charted game where you know every plan.",
    sayShort: "Bb5 — it's a Ruy: …a6 and develop.",
  },
  beats: [
    { atMove: 5, say: "…a6 — the Morphy move, putting the bishop on the spot at once. After Ba4 it clings to the diagonal, but now …b5 is loaded to chase it away whenever you choose. White's anti-Italian has become a main-line Ruy Lopez, and you're right at home.", highlights: [H('b5', KEY)] },
  ],
  sources: TK,
};
// Quiet Italian/Two-Knights middlegame (var4/var7, d3 Be7 O-O O-O Re1 d6 + a quiet White move).
const TK_QUIET_MIDDLE: SublineNarration = {
  intro: {
    say: "White settles for a slow, quiet manoeuvring game in the d3 Italian — no break, no threat, just patient improvement. Answer in kind and you're completely fine: reroute with …Na5 to challenge the strong c4-bishop, swing the knight via …Nd7-f8-g6, and prepare the …d5 or …c6-and-…d5 break to free the position. Equal and rich — out-play, don't out-rush.",
    sayShort: 'Quiet — …Na5, reroute, break with …d5.',
  },
  sources: TK,
};
// Bb5@14 — White pins after …Na5 (…c3 Na5 Bb5). Kick with …c6.
const TK_QUIET_BB5: SublineNarration = {
  intro: {
    say: "Bb5 — White pins your knight after …Na5, trying to make the offside steed awkward. Shrug it off with …c6, putting the question to the bishop; after it retreats you've gained space, your knight returns via c6 or sits on a5 eyeing the bishop pair, and the position is comfortably level. The pin is a pinprick, not a problem.",
    sayShort: 'Bb5 — kick it with …c6, stay equal.',
  },
  sources: TK,
};
// Fried Liver Polerio deep (var1, Ng5 d5 exd5 Na5 …). Pawn sac for the initiative.
const TK_POLERIO: SublineNarration = {
  intro: {
    say: "The Polerio — you've given a pawn in the main Knight-Attack line, and the compensation is textbook and lasting: a big lead in development, the bishop pair, and White's pieces tangled and retreating while yours pour out. The …e4 thrust gains space and chases the knight home, and White spends the whole opening untangling. The pawn is a fair price for this initiative.",
    sayShort: 'Polerio — a pawn for the raging initiative.',
  },
  sources: TK_INIT,
};
// Fritz / Ulvestad sharpest lines (var5/var6) — Black's attack for material.
const TK_FRITZ_ULVESTAD: SublineNarration = {
  intro: {
    say: "The sharpest forest in the Two Knights — the Fritz and Ulvestad, where …Nd4 and …b5 throw material onto the fire for a withering attack. White's king is stuck in the centre, your pieces swarm the open lines, and the …Qxg5 and …e4 ideas keep the initiative blazing. This is theory to the teeth and double-edged to the hilt — know it, and Black's attack is worth every pawn.",
    sayShort: 'Fritz/Ulvestad — sac material, hunt the king.',
  },
  sources: TK_INIT,
};
// 4…Bc5 Bxf7+ lines (var2) — king walks to e7, Black gets the piece/initiative back.
const TK_BC5_BXF7: SublineNarration = {
  intro: {
    say: "You've met the Knight Attack with the bold …Bc5, and White grabbed on f7 with check. Your king walks to e7 — ugly but completely safe, because White's attacking pieces have nothing to follow up with. You'll round up the loose bishop on d5, untangle with …Rf8 and …d6, and emerge with the bishop pair and a sound game. The check looked terrifying; it was a bluff.",
    sayShort: '…Bc5 — walk …Ke7, round up the bishop.',
  },
  sources: TK_INIT,
};
// Scotch Gambit / Max Lange e5-advance defence (var0/var3). Black holds with …d5/…Ne4.
const TK_MAXLANGE: SublineNarration = {
  intro: {
    say: "The Max Lange complex — White has pushed e5 to cramp you and open lines for the attack. The defence is known and sound: …d5 returns the pawn to free your game, …Ne4 plants the knight on a strong central post, and …Bd7 and …Be7 calmly complete development. Weather the tactical storm with precise moves and the extra space evaporates into a balanced, even game.",
    sayShort: 'Max Lange — defend with …d5 and …Ne4.',
  },
  sources: TK,
};

// ── Four Knights Game (student WHITE). triggerMove is BLACK's deviation. ──
const FK = ['book:four-knights-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];
const FK_CTR = ['book:four-knights-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];
const FK_INIT = ['book:four-knights-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];

// Spanish Four Knights, symmetric Bb5…Bb4 maneuvering. Break symmetry first.
const FK_SPANISH: SublineNarration = {
  intro: {
    say: "The Spanish Four Knights — symmetric, solid, and famously level. Your trump is the extra tempo of moving first, so break the symmetry on YOUR terms: the Metger unpin with Ne2 and Ng3 reroutes the knight to the kingside, Bg5 pins, and d4 grabs the centre a beat before Black can. Small and durable, but it's a pull, and it's yours.",
    sayShort: 'Break symmetry first — Ne2-g3 and d4.',
  },
  sources: FK,
};
// Bc5@7 / Bd6@7 — Black's other bishop tries vs Bb5.
const FK_BC5BD6: SublineNarration = {
  intro: {
    say: "Black develops the bishop off the symmetric square. Make the tempo tell: d3 and the Nd5 leap put the knight on a commanding central outpost, and Bg5 pins the f6-knight to fix the kingside. With your development a step ahead you take the centre with d4 when ready and keep a comfortable, pleasant initiative throughout.",
    sayShort: 'Press with Nd5 and d4, develop ahead.',
  },
  sources: FK,
};
// Scotch Four Knights (var1, d4 exd4 Nxd4 Bb4 Nxc6 …). Active pieces, Bg5/Qf3.
const FK_SCOTCH_FK: SublineNarration = {
  intro: {
    say: "The Scotch Four Knights — you've opened the centre with d4 and reached a lively, near-symmetrical structure where your pieces find the more active posts. Bg5 pins the f6-knight, Qf3 swings toward the kingside, and the rooks pour onto the central files. The game is balanced but yours to drive — keep the pieces aimed at Black's king and probe the weakened squares.",
    sayShort: 'Scotch FK — active pieces, Bg5 and Qf3.',
  },
  sources: FK_CTR,
};
// Bb4@7 var2 — Black pins before resolving the centre (d4 Bb4).
const FK_D4_PIN: SublineNarration = {
  intro: {
    say: "…Bb4 — Black pins the c3-knight before deciding on the centre. Don't let it stall you: d5 gains space and kicks the c6-knight, or the sharp Nxe5 grabs a pawn and tests the pin. Either way the centre opens in your favour while Black's bishop is committed — develop with tempo and keep the initiative.",
    sayShort: '…Bb4 — answer d5 or the sharp Nxe5.',
  },
  sources: FK_CTR,
};
// var2 Nd5 lines — White's central knight leap regains material, stays active.
const FK_NMD5: SublineNarration = {
  intro: {
    say: "Nd5 — the knight vaults to the central outpost, hitting the f6-knight and the c7-square and regaining the gambit pawn by force. Black must spend time untangling while your pieces stay forward and active. You emerge with a small but real lead in space and development — keep the knight's grip on d5 and press the freer game.",
    sayShort: 'Nd5 — central leap, regain the pawn.',
  },
  sources: FK_INIT,
};
// Halloween Gambit (var3, Nxe5 Nxe5 d4) — a knight sac for a huge centre.
const FK_HALLOWEEN: SublineNarration = {
  intro: {
    say: "The Halloween Gambit — you've flung a knight onto e5 to build a monstrous pawn centre and stampede Black's pieces backward with d4, f4 and e5. Objectively it's dubious and a calm defender holds the extra piece, but over the board it is a terrifying practical weapon: the pawns roll, Black's knights get herded home, and one inaccuracy and the centre crashes through. Attack at full tilt and make Black prove it.",
    sayShort: 'Halloween — sac the knight, storm the centre.',
  },
  sources: FK_INIT,
};
// var5 fork-trick line (Bc4 Nxe4 Nxe4 d5 …) — symmetrical, tiny White pull.
const FK_ITALIAN_FT: SublineNarration = {
  intro: {
    say: "The fork-trick line — the centre has simplified into a near-symmetrical position with bishops on open diagonals. There's no attack here, just a quiet, even game where your slightly freer pieces give a nagging edge. Castle, post a rook on e1, and pressure the e-file; the win, if it comes, is squeezed from tiny advantages, not conjured.",
    sayShort: 'Symmetrical — press the e-file, squeeze.',
  },
  sources: FK,
};
// Rubinstein Counterattack deep (var6, …Nd4 … dxc3/cxd2+) — sharp, consolidate.
const FK_RUBINSTEIN: SublineNarration = {
  intro: {
    say: "The Rubinstein Counterattack — Black has thrown a pawn forward to c3 (or c2!) to disrupt your camp and seize the initiative. Keep your nerve: round up the advanced pawn, complete development, and let your extra material or healthier structure speak. The lines are sharp and theory-soaked, but with accurate consolidation you steer to a safe, balanced-to-better game.",
    sayShort: 'Rubinstein — consolidate, mop up the pawn.',
  },
  sources: FK_INIT,
};
// Glek System (var8, g3 Bc5 Bg2 d6 d3) — White fianchettoes, presses.
const FK_GLEK: SublineNarration = {
  intro: {
    say: "The Glek System — you've fianchettoed the king's bishop, and the g2-bishop rakes the long diagonal toward Black's queenside and centre. This is the modern, flexible Four Knights: castle, brace with d3 and c3, and prepare the Nh4 or d4 levers to open lines for the bishop. A quiet, strategically rich game where your harmonious setup gives the lasting pull.",
    sayShort: 'Glek — fianchetto, press the long diagonal.',
  },
  sources: FK,
};
// g6@5 cont — Black fianchettoes, White takes the big centre.
const FK_G6: SublineNarration = {
  intro: {
    say: "…g6 — Black heads for a Pirc-style fianchetto against your Four Knights. Punish the slight passivity by grabbing the centre: d4 opens it, and after the exchanges you own the broad d4-e4 space while Black is still untangling. Develop quickly, castle, and lean on your space edge — the fianchetto bishop bites on granite.",
    sayShort: '…g6 — seize the centre with d4.',
  },
  beats: [
    { atMove: 8, say: "Nxd4 — you've claimed the full classical centre against Black's fianchetto. The knight dominates from d4 and the e4-pawn cramps Black's whole kingside; with more space and faster development, you set the agenda while the g7-bishop stares at your solid centre.", arrows: [A('d4', 'c6')], highlights: [H('d4', KEY), H('e4', SOFT)] },
  ],
  sources: FK_CTR,
};

export const SUBLINE_NARRATION_E4E5: Record<string, SublineNarration> = {
  // ── Ruy Lopez ──
  'ruy-lopez::0::Nf6@5': RUY_BERLIN,
  'ruy-lopez::1::Nf6@5': RUY_BERLIN,
  'ruy-lopez::2::Nf6@5': RUY_BERLIN,
  'ruy-lopez::3::Nf6@5': RUY_BERLIN,
  'ruy-lopez::5::Nf6@5': RUY_BERLIN,
  'ruy-lopez::6::Nf6@5': RUY_BERLIN,
  'ruy-lopez::7::Nf6@5': RUY_BERLIN,
  'ruy-lopez::8::Nf6@5': RUY_BERLIN,
  'ruy-lopez::0::Nxe4@9': RUY_OPEN,
  'ruy-lopez::1::Nxe4@9': RUY_OPEN,
  'ruy-lopez::2::Nxe4@9': RUY_OPEN,
  'ruy-lopez::5::Nxe4@9': RUY_OPEN,
  'ruy-lopez::6::Nxe4@9': RUY_OPEN,
  'ruy-lopez::7::Nxe4@9': RUY_OPEN,
  'ruy-lopez::0::b5@9': RUY_B5,
  'ruy-lopez::1::b5@9': RUY_B5,
  'ruy-lopez::2::b5@9': RUY_B5,
  'ruy-lopez::3::b5@9': RUY_B5,
  'ruy-lopez::5::b5@9': RUY_B5,
  'ruy-lopez::6::b5@9': RUY_B5,
  'ruy-lopez::0::O-O@13': RUY_CLOSED_OO,
  'ruy-lopez::1::O-O@13': RUY_CLOSED_OO,
  'ruy-lopez::2::O-O@13': RUY_CLOSED_OO,
  'ruy-lopez::0::O-O@11': RUY_CLOSED_OO,
  'ruy-lopez::1::O-O@11': RUY_CLOSED_OO,
  'ruy-lopez::2::O-O@11': RUY_CLOSED_OO,
  'ruy-lopez::5::O-O@11': RUY_CLOSED_OO,
  'ruy-lopez::6::O-O@11': RUY_CLOSED_OO,
  'ruy-lopez::5::d6@13': RUY_CLOSED_D6,
  'ruy-lopez::6::d6@13': RUY_CLOSED_D6,
  'ruy-lopez::5::d6@15': RUY_CLOSED_D6,
  'ruy-lopez::7::d6@15': RUY_CLOSED_D6,
  'ruy-lopez::0::d6@11': RUY_CLOSED_D6,
  'ruy-lopez::1::d6@11': RUY_CLOSED_D6,
  'ruy-lopez::2::d6@11': RUY_CLOSED_D6,
  'ruy-lopez::0::Bg4@15': RUY_BG4,
  'ruy-lopez::1::Bg4@15': RUY_BG4,
  'ruy-lopez::2::Bg4@15': RUY_BG4,
  'ruy-lopez::0::Na5@17': RUY_CHIGORIN,
  'ruy-lopez::2::Na5@17': RUY_CHIGORIN,
  'ruy-lopez::1::Nb8@17': RUY_BREYER,
  'ruy-lopez::2::Nb8@17': RUY_BREYER,
  'ruy-lopez::0::Bb7@17': RUY_ZAITSEV,
  'ruy-lopez::1::Bb7@17': RUY_ZAITSEV,
  'ruy-lopez::6::Bb7@15': RUY_BB7_A4,
  'ruy-lopez::7::Bc5@11': RUY_MOLLER,
  'ruy-lopez::7::Bc5@13': RUY_MOLLER,
  'ruy-lopez::6::Bc5@9': RUY_BC5_EARLY,
  'ruy-lopez::7::Bc5@9': RUY_BC5_EARLY,
  'ruy-lopez::4::Bc5@7': RUY_BC5_EARLY,
  'ruy-lopez::7::Be7@11': RUY_BE7_LATE,
  'ruy-lopez::3::d6@7': RUY_STEINITZ,
  'ruy-lopez::5::d6@7': RUY_STEINITZ,
  'ruy-lopez::6::d6@7': RUY_STEINITZ,
  'ruy-lopez::7::d6@7': RUY_STEINITZ,
  'ruy-lopez::3::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::4::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::5::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::6::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::7::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::8::f5@5': RUY_SCHLIEMANN_W,
  'ruy-lopez::3::exd4@13': RUY_OPEN_DEEP,
  'ruy-lopez::3::d6@13': RUY_OPEN_DEEP,
  'ruy-lopez::3::Be7@13': RUY_OPEN_DEEP,
  'ruy-lopez::3::Nxd4@13': RUY_OPEN_DEEP,
  'ruy-lopez::3::Bc5@15': RUY_OPEN_DEEP,
  'ruy-lopez::4::Be7@19': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::Be6@19': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::h6@19': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::Nc4@13': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::bxc6@11': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::Be7@9': RUY_BERLIN_ENDGAME,
  'ruy-lopez::4::d6@7': RUY_BERLIN_ENDGAME,
  'ruy-lopez::8::Bc5@13': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Bd6@13': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Bd6@17': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Bd7@13': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Bd7@17': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Be6@17': RUY_EXCHANGE_DXC6,
  'ruy-lopez::8::Ne7@13': RUY_EXCHANGE_DXC6,
  'ruy-lopez::5::e4@17': RUY_MARSHALL_E4,

  // ── Italian Game ──
  'italian-game::4::Bc5@5': IT_GP_BC5,
  'italian-game::5::Bc5@5': IT_GP_BC5,
  'italian-game::1::Nf6@5': IT_TWO_KNIGHTS,
  'italian-game::4::Nf6@5': IT_TWO_KNIGHTS,
  'italian-game::2::Be7@5': IT_HUNGARIAN,
  'italian-game::3::Be7@5': IT_HUNGARIAN,
  'italian-game::2::O-O@9': IT_PIANISSIMO,
  'italian-game::2::a6@13': IT_PIANISSIMO,
  'italian-game::2::a6@11': IT_PIANISSIMO,
  'italian-game::2::a6@9': IT_PIANISSIMO,
  'italian-game::2::a5@11': IT_PIANISSIMO,
  'italian-game::2::h6@11': IT_PIANISSIMO,
  'italian-game::2::d6@7': IT_PIANISSIMO,
  'italian-game::0::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::1::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::6::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::2::Bb6@11': IT_PIANISSIMO_BB6,
  'italian-game::0::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::6::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::0::O-O@13': IT_GRECO_OO,
  'italian-game::6::O-O@13': IT_GRECO_OO,
  'italian-game::0::d6@13': IT_GRECO_BREAK,
  'italian-game::6::d6@13': IT_GRECO_BREAK,
  'italian-game::0::d5@13': IT_GRECO_BREAK,
  'italian-game::6::d5@13': IT_GRECO_BREAK,
  'italian-game::0::Nxc3@15': IT_MOLLER,
  'italian-game::6::Bxc3@15': IT_MOLLER,
  'italian-game::1::O-O@15': IT_BD2_QUIET,
  'italian-game::1::Nce7@19': IT_BD2_FREEING,
  'italian-game::1::Na5@23': IT_BD2_FREEING,
  'italian-game::1::d6@15': IT_BD2_D6,
  'italian-game::0::a6@7': IT_GP_WAIT,
  'italian-game::1::a6@7': IT_GP_WAIT,
  'italian-game::6::a6@7': IT_GP_WAIT,
  'italian-game::0::h6@7': IT_GP_WAIT,
  'italian-game::1::h6@7': IT_GP_WAIT,
  'italian-game::6::h6@7': IT_GP_WAIT,
  'italian-game::0::Qf6@7': IT_GP_WAIT,
  'italian-game::1::Qf6@7': IT_GP_WAIT,
  'italian-game::6::Qf6@7': IT_GP_WAIT,
  'italian-game::3::d6@11': IT_EVANS,
  'italian-game::3::Ne5@17': IT_EVANS_DEEP,
  'italian-game::3::Bg4@15': IT_EVANS_DEEP,
  'italian-game::3::Nf6@15': IT_EVANS_DEEP,
  'italian-game::3::Nce7@17': IT_EVANS_DEEP,
  'italian-game::3::Nge7@15': IT_EVANS_DEEP,
  'italian-game::3::h6@15': IT_EVANS_DEEP,
  'italian-game::3::Bd7@15': IT_EVANS_DEEP,
  'italian-game::4::exd4@7': IT_HUNGARIAN_D4,
  'italian-game::4::dxe5@9': IT_HUNGARIAN_D4,
  'italian-game::4::Bg4@9': IT_HUNGARIAN_D4,
  'italian-game::4::Be6@13': IT_HUNGARIAN_QH5,
  'italian-game::4::Nf6@13': IT_HUNGARIAN_QH5,
  'italian-game::4::Nh6@13': IT_HUNGARIAN_QH5,
  'italian-game::4::Qd4@13': IT_HUNGARIAN_QH5,
  'italian-game::4::f6@15': IT_HUNGARIAN_QH5,
  'italian-game::5::Nxe4@7': IT_SCOTCH_GAMBIT,
  'italian-game::5::Nxd4@7': IT_SCOTCH_GAMBIT,
  'italian-game::5::d5@7': IT_SCOTCH_GAMBIT,
  'italian-game::5::d6@7': IT_SCOTCH_GAMBIT,
  'italian-game::5::Be7@23': IT_MAXLANGE_DEEP,
  'italian-game::5::Qd5@23': IT_MAXLANGE_DEEP,
  'italian-game::5::Qf5@23': IT_MAXLANGE_DEEP,
  'italian-game::5::h6@23': IT_MAXLANGE_DEEP,
  'italian-game::5::f5@11': IT_MAXLANGE_DEEP,

  // ── Two Knights Defence ──
  'two-knights-defence::1::d3@6': TK_D3_QUIET,
  'two-knights-defence::2::d3@6': TK_D3_QUIET,
  'two-knights-defence::3::d3@6': TK_D3_QUIET,
  'two-knights-defence::5::d3@6': TK_D3_QUIET,
  'two-knights-defence::6::d3@6': TK_D3_QUIET,
  'two-knights-defence::3::Ng5@6': TK_NG5,
  'two-knights-defence::4::Ng5@6': TK_NG5,
  'two-knights-defence::1::d4@6': TK_D4_GAMBIT,
  'two-knights-defence::2::d4@6': TK_D4_GAMBIT,
  'two-knights-defence::5::d4@6': TK_D4_GAMBIT,
  'two-knights-defence::6::d4@6': TK_D4_GAMBIT,
  'two-knights-defence::1::d4@4': TK_SCOTCH,
  'two-knights-defence::2::d4@4': TK_SCOTCH,
  'two-knights-defence::3::d4@4': TK_SCOTCH,
  'two-knights-defence::4::d4@4': TK_SCOTCH,
  'two-knights-defence::5::d4@4': TK_SCOTCH,
  'two-knights-defence::6::d4@4': TK_SCOTCH,
  'two-knights-defence::7::d4@4': TK_SCOTCH,
  'two-knights-defence::1::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::2::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::3::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::4::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::5::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::6::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::7::Nc3@4': TK_FOUR_KNIGHTS,
  'two-knights-defence::0::Bb5@4': TK_RUY,
  'two-knights-defence::4::c3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::4::h3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::h3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::4::Nbd2@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::Nbd2@12': TK_QUIET_MIDDLE,
  'two-knights-defence::4::Nc3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::Nc3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::4::a3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::a3@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::a4@12': TK_QUIET_MIDDLE,
  'two-knights-defence::4::Bg5@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::Bg5@12': TK_QUIET_MIDDLE,
  'two-knights-defence::7::Bb5@14': TK_QUIET_BB5,
  'two-knights-defence::1::Bd3@14': TK_POLERIO,
  'two-knights-defence::1::Nd4@18': TK_POLERIO,
  'two-knights-defence::1::Ng1@18': TK_POLERIO,
  'two-knights-defence::1::Nh4@18': TK_POLERIO,
  'two-knights-defence::1::O-O@24': TK_POLERIO,
  'two-knights-defence::5::O-O@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::5::Qa4+@14': TK_FRITZ_ULVESTAD,
  'two-knights-defence::5::Nf3@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::5::Qe2@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::5::d4@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::6::O-O@18': TK_FRITZ_ULVESTAD,
  'two-knights-defence::6::Nc3@12': TK_FRITZ_ULVESTAD,
  'two-knights-defence::6::Bc6@18': TK_FRITZ_ULVESTAD,
  'two-knights-defence::6::d3@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::6::dxe5@16': TK_FRITZ_ULVESTAD,
  'two-knights-defence::2::Bxc6@14': TK_BC5_BXF7,
  'two-knights-defence::2::c3@12': TK_BC5_BXF7,
  'two-knights-defence::2::d3@12': TK_BC5_BXF7,
  'two-knights-defence::2::d3@14': TK_BC5_BXF7,
  'two-knights-defence::2::h3@14': TK_BC5_BXF7,
  'two-knights-defence::0::Bb3@10': TK_MAXLANGE,
  'two-knights-defence::0::Bxc6+@12': TK_MAXLANGE,
  'two-knights-defence::0::Nxc6@14': TK_MAXLANGE,
  'two-knights-defence::0::O-O@12': TK_MAXLANGE,
  'two-knights-defence::0::O-O@14': TK_MAXLANGE,
  'two-knights-defence::0::c3@18': TK_MAXLANGE,
  'two-knights-defence::0::f3@18': TK_MAXLANGE,
  'two-knights-defence::0::exd6@10': TK_MAXLANGE,
  'two-knights-defence::0::exf6@10': TK_MAXLANGE,
  'two-knights-defence::3::e5@8': TK_MAXLANGE,
  'two-knights-defence::3::Nc3@10': TK_MAXLANGE,
  'two-knights-defence::3::Nxd4@10': TK_MAXLANGE,
  'two-knights-defence::3::Nb5@18': TK_MAXLANGE,
  'two-knights-defence::3::Rxe7+@20': TK_MAXLANGE,

  // ── Four Knights Game ──
  'four-knights-game::0::Bd6@7': FK_BC5BD6,
  'four-knights-game::0::Bxc3@11': FK_SPANISH,
  'four-knights-game::0::Bc5@7': FK_BC5BD6,
  'four-knights-game::0::g6@5': FK_G6,
  'four-knights-game::0::d6@7': FK_SPANISH,
  'four-knights-game::0::h6@15': FK_SPANISH,
  'four-knights-game::0::Bd7@15': FK_SPANISH,
  'four-knights-game::0::Ne7@13': FK_SPANISH,
  'four-knights-game::0::Ne7@15': FK_SPANISH,
  'four-knights-game::1::Bxc3+@11': FK_SCOTCH_FK,
  'four-knights-game::1::dxc6@11': FK_SCOTCH_FK,
  'four-knights-game::1::Bd6@21': FK_SCOTCH_FK,
  'four-knights-game::1::h6@21': FK_SCOTCH_FK,
  'four-knights-game::1::c6@17': FK_SCOTCH_FK,
  'four-knights-game::1::Bxc3@17': FK_SCOTCH_FK,
  'four-knights-game::1::Rb8@21': FK_SCOTCH_FK,
  'four-knights-game::1::Be6@21': FK_SCOTCH_FK,
  'four-knights-game::1::Be6@23': FK_SCOTCH_FK,
  'four-knights-game::1::Re8@21': FK_SCOTCH_FK,
  'four-knights-game::2::Bb4@7': FK_D4_PIN,
  'four-knights-game::2::g6@5': FK_G6,
  'four-knights-game::2::Be7@9': FK_NMD5,
  'four-knights-game::2::Nb4@9': FK_NMD5,
  'four-knights-game::2::Nxd5@9': FK_NMD5,
  'four-knights-game::2::d6@9': FK_NMD5,
  'four-knights-game::2::Bc5@9': FK_NMD5,
  'four-knights-game::3::Nb8@11': FK_HALLOWEEN,
  'four-knights-game::3::Ne7@11': FK_HALLOWEEN,
  'four-knights-game::3::Qb6@19': FK_HALLOWEEN,
  'four-knights-game::3::Neg4@13': FK_HALLOWEEN,
  'four-knights-game::3::Bc5@7': FK_HALLOWEEN,
  'four-knights-game::3::Qe7@15': FK_HALLOWEEN,
  'four-knights-game::3::Nb4@11': FK_HALLOWEEN,
  'four-knights-game::3::Nf6@19': FK_HALLOWEEN,
  'four-knights-game::3::Qh4+@19': FK_HALLOWEEN,
  'four-knights-game::3::Bxd6@19': FK_HALLOWEEN,
  'four-knights-game::4::Bd6@7': FK_BC5BD6,
  'four-knights-game::4::Bxc3@11': FK_SPANISH,
  'four-knights-game::4::Bc5@7': FK_BC5BD6,
  'four-knights-game::4::g6@5': FK_G6,
  'four-knights-game::4::d6@7': FK_SPANISH,
  'four-knights-game::4::c6@17': FK_SPANISH,
  'four-knights-game::4::Bxc3@9': FK_SPANISH,
  'four-knights-game::4::Bg4@13': FK_SPANISH,
  'four-knights-game::4::c6@19': FK_SPANISH,
  'four-knights-game::5::Bc5@13': FK_ITALIAN_FT,
  'four-knights-game::5::Bg4@13': FK_ITALIAN_FT,
  'four-knights-game::5::f5@13': FK_ITALIAN_FT,
  'four-knights-game::5::Bd7@13': FK_ITALIAN_FT,
  'four-knights-game::5::Nd4@13': FK_ITALIAN_FT,
  'four-knights-game::5::Bg4@15': FK_ITALIAN_FT,
  'four-knights-game::5::Bd7@15': FK_ITALIAN_FT,
  'four-knights-game::5::f5@15': FK_ITALIAN_FT,
  'four-knights-game::5::Bg4@17': FK_ITALIAN_FT,
  'four-knights-game::5::f5@17': FK_ITALIAN_FT,
  'four-knights-game::6::cxd2+@13': FK_RUBINSTEIN,
  'four-knights-game::6::Bc5@15': FK_BC5BD6,
  'four-knights-game::6::c6@15': FK_RUBINSTEIN,
  'four-knights-game::6::Bb4@7': FK_SPANISH,
  'four-knights-game::6::Qe7@11': FK_RUBINSTEIN,
  'four-knights-game::6::cxb2@13': FK_RUBINSTEIN,
  'four-knights-game::6::Be7@15': FK_RUBINSTEIN,
  'four-knights-game::6::Bd6@7': FK_BC5BD6,
  'four-knights-game::6::Ng8@11': FK_RUBINSTEIN,
  'four-knights-game::6::c6@11': FK_RUBINSTEIN,
  'four-knights-game::7::Bd6@7': FK_BC5BD6,
  'four-knights-game::7::Bxc3@11': FK_SPANISH,
  'four-knights-game::7::Bc5@7': FK_BC5BD6,
  'four-knights-game::7::g6@5': FK_G6,
  'four-knights-game::7::d6@7': FK_SPANISH,
  'four-knights-game::7::h6@15': FK_SPANISH,
  'four-knights-game::7::c5@21': FK_SPANISH,
  'four-knights-game::7::Bd7@15': FK_SPANISH,
  'four-knights-game::7::Ne7@13': FK_SPANISH,
  'four-knights-game::8::h6@11': FK_GLEK,
  'four-knights-game::8::O-O@11': FK_GLEK,
  'four-knights-game::8::Be6@11': FK_GLEK,
  'four-knights-game::8::h6@13': FK_GLEK,
  'four-knights-game::8::Ng4@11': FK_GLEK,
  'four-knights-game::8::Bg4@13': FK_GLEK,
  'four-knights-game::8::Nd4@11': FK_GLEK,
  'four-knights-game::8::Be6@13': FK_GLEK,
  'four-knights-game::8::Be6@15': FK_GLEK,
};
