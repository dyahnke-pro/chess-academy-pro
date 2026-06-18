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
  beats: [
    { atMove: 5, say: "Nf6 leaves e5 to its fate and bites at e4 instead — pure Berlin nerve. Castle behind your own pressure: the f3-knight already leans on e5, and after Nxe4 d4 Nd6 the queens come off into the endgame you want.", sayShort: "Nf6 — castle, your knight eyes e5.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY), H('e4', SOFT)] },
  ],
  sources: RUY,
};
// Nxe4@9 — the Open Ruy Lopez (Ba4 Nf6 O-O Nxe4). Strike with d4.
const RUY_OPEN: SublineNarration = {
  intro: {
    say: "Nxe4 — the Open Ruy Lopez. Black snatches the e4-pawn and bets everything on free, active piece play. You hit back in the centre at once with d4: after …b5, …d5 and …Be6 the position opens, but the trumps are yours — a mobile central majority, an Re1 boring down the e-file, and the lasting weakness of Black's loosened queenside. Develop fast and the structure tells.",
    sayShort: 'Nxe4 — Open Ruy: strike with d4.',
  },
  beats: [
    { atMove: 9, say: "Black snatches e4 — now hammer the centre straight back. d4 prises it open, the e4-knight gets chased, and your central majority plus the loose black queenside tell the tale.", sayShort: "Nxe4 — strike d4 at the centre.", highlights: [H('d4', KEY), H('e4', ATK)] },
  ],
  sources: RUY,
};
// b5@9 — Black grabs queenside space (O-O b5), Arkhangelsk/Møller territory.
const RUY_B5: SublineNarration = {
  intro: {
    say: "…b5 — Black grabs queenside space and chases your bishop before tending the kingside, steering toward the Arkhangelsk and Møller systems. Retreat to b3, where the bishop keeps raking the a2-g8 diagonal straight at f7. You've lost nothing: meet the coming …Bb7 or …Bc5 with a calm c3 and d3, building the centre while Black's early …b5 leaves c6 and the d5-square a shade loose.",
    sayShort: '…b5 — retreat Bb3, keep eyeing f7.',
  },
  beats: [
    { atMove: 9, say: "b5 puts the question to your bishop — slide it to b3, where it still glares down the diagonal toward f7. You concede nothing, and the early b5 leaves c6 and d5 a shade loose for later.", sayShort: "b5 — retreat to b3, eye f7.", arrows: [A('a4', 'b3')], highlights: [H('b3', KEY), H('f7', SOFT)] },
  ],
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
  beats: [
    { atMove: 15, say: "Bg4 pins your f3-knight to the queen — no need to fret. h3 puts the question; after Bh5 you keep the d4 break in hand and the pin is an itch, not a wound.", sayShort: "Bg4 — h3 puts the question.", highlights: [H('f3', KEY), H('h3', ATK)] },
  ],
  sources: RUY,
};
// Na5@17 — the Chigorin (…c3 O-O h3 Na5). Keep the bishop: Bc2.
const RUY_CHIGORIN: SublineNarration = {
  intro: {
    say: "…Na5 — the classical Chigorin: Black chases your prized light-squared bishop off the a2-g8 diagonal. Don't allow the trade — retreat to c2, where the bishop swings onto the b1-h7 diagonal aimed at Black's king. The knight on a5 sulks on the rim, miles from the centre, and you'll seize space with d4 while it tries to find a way home.",
    sayShort: '…Na5 — keep the bishop: Bc2.',
  },
  beats: [
    { atMove: 17, say: "Na5 lunges at your prized bishop — refuse the trade. Bc2 keeps it alive on the b1-h7 road aimed at Black's king, while the knight sulks on the rim, miles from the centre.", sayShort: "Na5 — keep the bishop, Bc2.", arrows: [A('b3', 'c2')], highlights: [H('c2', KEY), H('a5', SOFT)] },
  ],
  sources: RUY,
};
// Nb8@17 — the Breyer (…c3 O-O h3 Nb8). Knight reroutes via d7.
const RUY_BREYER: SublineNarration = {
  intro: {
    say: "…Nb8 — the Breyer Defence, the deepest idea in the Closed Ruy: Black retreats the knight all the way home to reroute it via d7, where it shores up e5 and frees the c-pawn. It's slow, so seize the moment — play d4 and grab the centre while the knight is offside. You get a free hand and a real space edge before Black completes the manoeuvre.",
    sayShort: '…Nb8 — Breyer: grab the centre, d4.',
  },
  beats: [
    { atMove: 17, say: "Nb8 — the deep Breyer retreat, rerouting the knight via d7. While it tours the back rank, seize the moment: d4 claims the full centre before the knight ever gets home.", sayShort: "Nb8 — grab the centre with d4.", highlights: [H('d4', KEY), H('b8', SOFT)] },
  ],
  sources: RUY,
};
// Bb7@17 — the Zaitsev (…c3 O-O h3 Bb7). Bishop eyes e4.
const RUY_ZAITSEV: SublineNarration = {
  intro: {
    say: "…Bb7 — the Zaitsev System, Karpov's old workhorse. The bishop trains on e4 down the long diagonal, daring you to defend the centre. Answer with d4, building the broad pawn duo; the bishop's pressure on e4 is real but containable, and your space plus the standard Nbd2-f1-g3 regroup keep the initiative firmly in your hands.",
    sayShort: '…Bb7 — Zaitsev: build d4, hold e4.',
  },
  beats: [
    { atMove: 17, say: "Bb7 trains on e4 down the long diagonal — meet it head-on with d4, building the broad duo. The pressure on e4 is real but contained, and your space plus the knight tour keep the initiative.", sayShort: "Bb7 — answer d4, hold e4.", highlights: [H('e4', KEY), H('d4', ATK)] },
  ],
  sources: RUY,
};
// Bb7@15 — anti-Marshall a4, then …Bb7.
const RUY_BB7_A4: SublineNarration = {
  intro: {
    say: "…Bb7 — Black fianchettoes against your anti-Marshall a4, aiming the bishop at e4. The a4-thrust has already pried at b5, so keep the queenside pressure: trade on b5 or prod with axb5, then turn to d4 and the centre. You've dodged the Marshall gambit entirely and kept a clean, pleasant Spanish pull.",
    sayShort: '…Bb7 — pressed queenside, then d4.',
  },
  beats: [
    { atMove: 15, say: "Bb7 answers your a4 thrust — keep prising the queenside. Trade or jab on b5, then turn to d4: you've dodged the Marshall entirely and kept a clean Spanish pull.", sayShort: "Bb7 — press b5, then d4.", highlights: [H('b5', KEY), H('d4', SOFT)] },
  ],
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
  beats: [
    { atMove: 11, say: "Be7 tucks back into the solid slot — nothing changes for you. c3 and d4 build the centre, then Nbd2-f1-g3 swings the knight kingside. Sound but passive; the space is yours.", sayShort: "Be7 — c3 and d4, take space.", highlights: [H('d4', KEY)] },
  ],
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
    { atMove: 5, say: "…f5 — the Schliemann, Black's wildest Ruy gambit, hurling the f-pawn at your centre. Don't grab greedily in the chaos: the cool, theory-approved antidote is Nc3, developing and keeping the tension.", sayShort: "…f5 — answer Nc3, stay cool.", arrows: [A('b1', 'c3')], highlights: [H('c3', KEY)] },
    { atMove: 6, say: "Nc3 ignores the pawn-grab and develops with purpose, piling a second guard on e4 and eyeing the d5-outpost. Black usually resolves the tension with …fxe4.", sayShort: "Nc3 — develop, guard e4.", arrows: [A('c3', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 7, say: "…fxe4 opens the f-file but hands you a beautiful central square. Recapture Nxe4 and your knight dominates the middle.", sayShort: "…fxe4 — recapture Nxe4.", arrows: [A('c3', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 8, say: "Nxe4 — the knight lands on a dominant central post, eyeing d6 and g5. Your structure is whole while Black has spent a kingside pawn and bared the e8-h5 diagonal; develop, castle, and the holes around his king tell.", sayShort: "Nxe4 — dominant central knight.", arrows: [A('e4', 'd6')], highlights: [H('e4', KEY)] },
    { atMove: 9, say: "…Nf6 challenges your centralised knight — fine, trade or retreat it with tempo. You keep the safer king and the long-term target of Black's loosened, airy kingside.", sayShort: "…Nf6 — keep the safer king.", highlights: [H('e4', KEY), H('f6', SOFT)] },
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
  beats: [
    { atMove: 17, say: "e4 jabs your knight and clears the way for Black's onslaught — but you're a clean pawn up. Tuck the knight to d2, wall up with Be3, and once the storm blows out the pawn decides.", sayShort: "e4 — retreat the knight to d2.", arrows: [A('f3', 'd2')], highlights: [H('d2', KEY), H('e4', SOFT)] },
  ],
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
  beats: [
    { atMove: 5, say: "Bc5 — the Giuoco, both bishops trained on the enemy f-pawn. Stake your tempo: c3 readies d4 to blow the centre open while your bishop already eyes f7.", sayShort: "Bc5 — c3 then d4, eye f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
  sources: IT,
};
// Nf6@5 — Bc4 Nf6, the Two Knights.
const IT_TWO_KNIGHTS: SublineNarration = {
  intro: {
    say: "…Nf6 — the Two Knights, the fighting reply, hitting your e4-pawn at once and inviting a brawl. The choice is yours: the swashbuckling Ng5 lunging straight at f7, or the principled d4 break tearing open the centre. Black has picked the sharpest battleground in the Italian — meet it head-on and play for the initiative.",
    sayShort: '…Nf6 — Two Knights: d4 or Ng5.',
  },
  beats: [
    { atMove: 5, say: "Nf6 hits e4 and picks a fight — oblige it. d4 cracks the centre, or Ng5 dives straight at f7. Both swing your pieces at Black's tender point.", sayShort: "Nf6 — d4 or Ng5 at f7.", arrows: [A('c4', 'f7')], highlights: [H('e4', KEY), H('f7', SOFT)] },
  ],
  sources: IT,
};
// Be7@5 — Bc4 Be7, the Hungarian Defence.
const IT_HUNGARIAN: SublineNarration = {
  intro: {
    say: "…Be7 — the Hungarian Defence, the safe and modest sidestep that ducks every Italian sharpness. Black gives ground without a fight, so take it: play d4, build the broad centre, castle, and develop with a free hand. There are no tricks here — just a clean space advantage and an easier game for you to press.",
    sayShort: '…Be7 — Hungarian: take the centre, d4.',
  },
  beats: [
    { atMove: 5, say: "Be7 — the meek Hungarian. Punish the passivity: d4 plants the full centre, you castle and develop with a free hand while Black sits cramped and short of counterplay.", sayShort: "Be7 — take the centre with d4.", highlights: [H('d4', KEY)] },
  ],
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
  beats: [
    { atMove: 11, say: "Bb6 hands you the prize — a broad d4-e4 centre. Roll it forward: d5 grabs space and cramps the c6-knight, and your central majority squeezes Black off the board.", sayShort: "Bb6 — push d5, cramp c6.", highlights: [H('d5', KEY), H('c6', SOFT)] },
  ],
  sources: IT_CTR,
};
// Bb6@11 in the Pianissimo (var2, d3 …Bb6) — slow.
const IT_PIANISSIMO_BB6: SublineNarration = {
  intro: {
    say: "…Bb6 — Black retreats the bishop to its safe Pianissimo square, keeping things solid and quiet. Stay patient and play the system: c3 to brace the centre, Nbd2-f1-g3 routing the knight to the kingside, and prepare the d4 break for the right moment. A long manoeuvring game where your small space edge is the asset to nurse.",
    sayShort: '…Bb6 — patient: c3, knight tour, d4.',
  },
  beats: [
    { atMove: 11, say: "Bb6 keeps it quiet — stay patient. c3 braces the centre, the knight tours Nbd2-f1-g3, and the d4 break waits in reserve. A long squeeze where your small space edge is the asset.", sayShort: "Bb6 — patient: c3, then d4.", highlights: [H('d4', KEY)] },
  ],
  sources: IT,
};
// Bxc3+@13 — Black trades on c3, you build the big centre with bxc3.
const IT_GRECO_BXC3: SublineNarration = {
  intro: {
    say: "…Bxc3+ — Black trades the dark bishop off, and bxc3 hands you exactly what the Giuoco dreams of: a towering d4-e4 pawn centre on a half-open b-file. Black has surrendered his most active piece to dent your pawns, but those pawns are a battering ram, not a weakness. Push d5 or e5, open lines for the bishop pair, and storm forward.",
    sayShort: '…Bxc3+ — bxc3: a towering centre.',
  },
  beats: [
    { atMove: 13, say: "Bxc3+ trades to dent your pawns — but bxc3 hands you a towering d4-e4 centre and a half-open b-file. Push d5 or e5 and storm: those pawns are a battering ram, not a weakness.", sayShort: "Bxc3+ — bxc3, towering centre.", highlights: [H('d4', KEY), H('e4', ATK)] },
  ],
  sources: IT_CTR,
};
// O-O@13 — Black castles into the centre (…Bb4+ Nc3 O-O). Greco attack.
const IT_GRECO_OO: SublineNarration = {
  intro: {
    say: "…O-O — Black castles right into your big centre, the critical Greco test. Now you uncork the attack the line was built for: d5 to kick the c6-knight, Bg5 to pin the defender of the kingside, and the e-pawn rolling toward Black's king. You have the centre, the bishop pair and the initiative — play fast and direct.",
    sayShort: '…O-O — strike d5 and Bg5, attack.',
  },
  beats: [
    { atMove: 13, say: "O-O castles right into your guns — uncork the attack. d5 kicks the c6-knight, Bg5 pins its defender, and the e-pawn rolls at the king. Centre, bishops, initiative: go fast.", sayShort: "O-O — d5 and Bg5, attack.", arrows: [A('c1', 'g5')], highlights: [H('d5', KEY), H('g5', ATK)] },
  ],
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
  beats: [
    { atMove: 15, say: "Material's gone but the initiative blazes — Re1, Ba3 and the d5-thrust rain on Black's stranded king. Objectively he can hold; over the board it is one of the most fearsome attacks in the open games. Play it with fire.", sayShort: "Møller — sac, then storm the king.", highlights: [H('d5', ATK)] },
  ],
  sources: ['book:italian-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Giuoco_Piano'],
};
// Bd2 quiet line (var1) — …Bb4+ Bd2 Bxd2+ Nbxd2 O-O. Active isolated d-pawn.
const IT_BD2_QUIET: SublineNarration = {
  intro: {
    say: "…O-O — the quiet Bd2 main line, where Black has traded the dark bishops to defuse the attack. You're left with an isolated d4-pawn, but it's the GOOD kind: it grips e5 and c5, your pieces flow to active squares, and Re1, Ne5 and a kingside build-up give you the easier game. The isolani is a spear here, not a weakness.",
    sayShort: '…O-O — active isolani: Re1, Ne5, press.',
  },
  beats: [
    { atMove: 15, say: "O-O — the quiet line, and your isolated d4-pawn is the proud kind: it grips e5 and c5. Re1 and Ne5 post your pieces aggressively; the isolani is a spear here, never a weakness.", sayShort: "O-O — active isolani, Ne5.", arrows: [A('f3', 'e5')], highlights: [H('d4', KEY), H('e5', ATK)] },
  ],
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
  beats: [
    { atMove: 15, say: "d6 keeps the structure compact — no attack to fear, none to fear from. Finish with Nc3 and Re1, hold the central d4-pawn, and play the long game from the better side of equality.", sayShort: "d6 — develop, hold d4.", highlights: [H('d4', KEY)] },
  ],
  sources: IT_CTR,
};
// Giuoco waiting moves (a6@7, h6@7, Qf6@7) after Bc4 Bc5 c3.
const IT_GP_WAIT: SublineNarration = {
  intro: {
    say: "Black slips in a useful little move while you prepare the centre. It costs a tempo you should pounce on: play d4 right now, opening the position before Black is ready for it. With your development a step ahead, the central break favours you — seize the centre and the initiative comes with it.",
    sayShort: 'A waiting move — strike d4 at once.',
  },
  beats: [
    { atMove: 7, say: "Black slips in a quiet little move while you prepare — pounce. Strike d4 right now, cracking the centre before he's ready; a step ahead in development, the break favours you.", sayShort: "A waiting move — strike d4 now.", highlights: [H('d4', KEY)] },
  ],
  sources: IT,
};
// Evans Gambit (var3, b4 Bxb4 c3 Ba5 d4) — accepted, White's big centre + dev for the pawn.
const IT_EVANS: SublineNarration = {
  intro: {
    say: "The Evans Gambit accepted — you've thrown the b-pawn to rip open lines and gain a colossal lead in development. This is romantic-era chess at its purest: the c3-d4 centre rolls forward, the bishop swings to a3 hitting Black's stuck king, and every tempo screams. You're a pawn down and completely on top — develop with threats and pour the attack on before Black untangles.",
    sayShort: 'Evans accepted — roll the centre, attack.',
  },
  beats: [
    { atMove: 11, say: "You're a pawn down and on top — the Evans bargain. The c3-d4 centre rolls, Ba3 will rake the king, and Qb3 joins the c4-bishop's aim at f7. Develop with threats and pour it on.", sayShort: "Evans — roll the centre, hit f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
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
  beats: [
    { atMove: 6, say: "d3 ducks the sharp lines — develop in comfort. The bishop swings to c5, you castle, and the freeing d5 break beckons. Sound and equal, every piece flowing to a good square.", sayShort: "d3 — …Bc5, aim for …d5.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY), H('d5', SOFT)] },
  ],
  sources: TK,
};
// Ng5@6 — the Knight Attack / Fried Liver lunge at f7. Answer …d5.
const TK_NG5: SublineNarration = {
  intro: {
    say: "Ng5 — the Knight Attack, lunging straight at f7 and the Fried Liver. It looks scary and it is completely fine for you: answer …d5! striking the centre and slamming the door, the move every theory book demands. After exd5 you have the Polerio's …Na5 hitting the c4-bishop, or the razor-sharp …b5 and …Nd4 gambits — in every one you get a roaring initiative for a pawn. Never fear Ng5; welcome it.",
    sayShort: 'Ng5 — answer …d5, seize the initiative.',
  },
  beats: [
    { atMove: 6, say: "Ng5 lunges at f7 — answer d5! and slam the centre shut. After exd5 the Polerio's Na5 or the sharp b5 gambits hand you a roaring initiative. Welcome this, don't fear it.", sayShort: "Ng5 — answer …d5, seize play.", highlights: [H('d5', KEY), H('f7', SOFT)] },
  ],
  sources: TK,
};
// d4@6 — Bc4 Nf6 d4, the Scotch Gambit. Take …exd4.
const TK_D4_GAMBIT: SublineNarration = {
  intro: {
    say: "d4 — the Scotch Gambit, offering a pawn to prise the centre open. Take it with …exd4: you're a pawn up and the way to neutralise the coming Max Lange is the central counter …d5 yourself, returning the pawn to free your pieces and blunt White's bishop. Defend the first few energetic moves accurately and the position is balanced — or better, with that extra pawn.",
    sayShort: 'd4 — take …exd4, then strike …d5.',
  },
  beats: [
    { atMove: 6, say: "d4 — the Scotch Gambit. Take it: exd4, then meet the coming Max Lange with your own d5 break, returning the pawn to free your game and blunt White's bishop.", sayShort: "d4 — take exd4, then …d5.", highlights: [H('d4', KEY), H('d5', ATK)] },
  ],
  sources: TK,
};
// d4@4 cont — the Scotch Game (e4 e5 Nf3 Nc6 d4). Equalize with …Qe7/…Nd5.
const TK_SCOTCH: SublineNarration = {
  intro: {
    say: "d4 — White swerves into the Scotch, trading the central pawns to free his pieces early. The book equalizer is precise and well worth knowing: after the exchanges, …Qe7 pressures the advanced e5-pawn and …Nd5 plants the knight on a dominant central blockade. You accept doubled c-pawns but gain the bishop pair and rock-solid piece play — a comfortable, fully equal game.",
    sayShort: 'd4 — Scotch: …Qe7 and …Nd5 equalize.',
  },
  beats: [
    { atMove: 4, say: "d4 ducks into a Scotch — open the centre on your terms. …exd4 grabs the pawn and forces White to spend time recapturing; your pieces flood out with tempo behind it.", sayShort: "d4 — answer …exd4.", arrows: [A('e5', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 5, say: "…exd4 — and White must retake with the knight, drifting it to d4 right in the path of your coming development. The centre is opening exactly how you want it.", sayShort: "…exd4 — White retakes on d4.", arrows: [A('f3', 'd4')], highlights: [H('d4', ATK)] },
    { atMove: 7, say: "…Nf6 develops with a hit on the e4-pawn, forcing the pace. White usually relieves it by trading on c6 — which only hands you the bishop pair and a half-open b-file aimed at his queenside.", sayShort: "…Nf6 — develop, strike e4.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…bxc6 recaptures toward the centre, opening the b-file for your rook and reinforcing the d5-square for the knight to come. Doubled c-pawns are a small price for the two bishops and a fluid centre.", sayShort: "…bxc6 — head for …Nd5.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 11, say: "…Qe7 swings the queen out to lean on White's over-extended e5-pawn and eye the open e-file; White props it with Qe2, and now you spring the knight to its dream square.", sayShort: "…Qe7 — lean on e5.", arrows: [A('e7', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 13, say: "…Nd5 lands on the perfect central blockade, screening everything and eyeing f4 and c3. With the bishop pair, the rock on d5 and effortless development, you're fully equal and pleasant to play.", sayShort: "…Nd5 — the dream blockade.", arrows: [A('d5', 'f4')], highlights: [H('d5', KEY)] },
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
  beats: [
    { atMove: 14, say: "Bb5 pins after your Na5 — shrug it off. c6 puts the question; the bishop must retreat, your knight eyes the bishop pair, and the position is comfortably level. A pinprick, no more.", sayShort: "Bb5 — kick it with …c6.", highlights: [H('c6', KEY), H('b5', SOFT)] },
  ],
  sources: TK,
};
// Fried Liver Polerio deep (var1, Ng5 d5 exd5 Na5 …). Pawn sac for the initiative.
const TK_POLERIO: SublineNarration = {
  intro: {
    say: "The Polerio — you've given a pawn in the main Knight-Attack line, and the compensation is textbook and lasting: a big lead in development, the bishop pair, and White's pieces tangled and retreating while yours pour out. The …e4 thrust gains space and chases the knight home, and White spends the whole opening untangling. The pawn is a fair price for this initiative.",
    sayShort: 'Polerio — a pawn for the raging initiative.',
  },
  beats: [
    { atMove: 13, say: "…bxc6 — you recapture, a pawn down but with a flying lead in development and the bishop pair. White's pieces tangle and retreat; the …e4 thrust gains space, and the initiative is a fair price for the pawn.", sayShort: "…bxc6 — a pawn for the initiative.", highlights: [H('c6', KEY)] },
  ],
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
    say: "You've met the Knight Attack with the bold …Bc5, and White grabbed on f7 with check. Your king walks to e7 — ugly but completely safe, because White's attacking pieces have nothing to follow up with. You'll round up the loose white bishop, untangle with …Rf8 and …d6, and emerge with the bishop pair and a sound game. The check looked terrifying; it was a bluff.",
    sayShort: '…Bc5 — walk …Ke7, round up the bishop.',
  },
  beats: [
    { atMove: 9, say: "…Ke7 — the king walks, ugly but completely safe: White's attackers have nothing to follow up. Round up the loose white bishop, untangle with …Rf8 and …d6, and emerge with the bishop pair. The check was a bluff.", sayShort: "…Ke7 — walk the king, it's safe.", highlights: [H('e7', KEY), H('d5', SOFT)] },
  ],
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
  beats: [
    { atMove: 7, say: "Bb4 pins before resolving the centre — don't stall. d5 gains space and kicks the c6-knight, or the sharp Nxe5 grabs a pawn and tests the pin. Either way the centre opens your way.", sayShort: "Bb4 — answer d5 or Nxe5.", highlights: [H('d5', KEY), H('e5', ATK)] },
  ],
  sources: FK_CTR,
};
// var2 Nd5 lines — White's central knight leap regains material, stays active.
const FK_NMD5: SublineNarration = {
  intro: {
    say: "Nd5 — the knight vaults to the central outpost, hitting the f6-knight and the c7-square and regaining the gambit pawn by force. Black must spend time untangling while your pieces stay forward and active. You emerge with a small but real lead in space and development — keep the knight's grip on d5 and press the freer game.",
    sayShort: 'Nd5 — central leap, regain the pawn.',
  },
  beats: [
    { atMove: 9, say: "Your knight sits proud on d5, hitting f6 and clawing at c7 while it claws back the gambit pawn. Black untangles as your pieces stay forward — keep the grip on d5 and press the freer game.", sayShort: "Nd5 — central grip, regain the pawn.", arrows: [A('d5', 'c7')], highlights: [H('d5', KEY)] },
  ],
  sources: FK_INIT,
};
// Halloween Gambit (var3, Nxe5 Nxe5 d4) — a knight sac for a huge centre.
const FK_HALLOWEEN: SublineNarration = {
  intro: {
    say: "The Halloween Gambit — you've flung a knight onto e5 to build a monstrous pawn centre and stampede Black's pieces backward with d4, f4 and e5. Objectively it's dubious and a calm defender holds the extra piece, but over the board it is a terrifying practical weapon: the pawns roll, Black's knights get herded home, and one inaccuracy and the centre crashes through. Attack at full tilt and make Black prove it.",
    sayShort: 'Halloween — sac the knight, storm the centre.',
  },
  beats: [
    { atMove: 6, say: "Nxe5 — the Halloween sacrifice. You fling the knight to build a monstrous pawn centre with d4 and stampede Black's pieces backward with f4 and e5. Dubious in theory, terrifying over the board — storm it.", sayShort: "Nxe5 — sac for a monster centre.", highlights: [H('e5', KEY)] },
  ],
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
  beats: [
    { atMove: 10, say: "e5 — you advance as Black flings the d-pawn forward to disrupt your camp. Keep your nerve: round up the advanced pawn, complete development, and let your healthier structure speak. Sharp, but consolidation steers you to safety.", sayShort: "e5 — advance, then consolidate.", highlights: [H('e5', KEY)] },
  ],
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
    { atMove: 5, say: "…g6 heads for a Pirc-style fianchetto — punish the slow setup by grabbing the centre at once. d4 rips it open before the bishop is even home.", sayShort: "…g6 — seize the centre, d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "Nxd4 — you own the full classical centre against the fianchetto. The knight dominates from d4 and the e4-pawn cramps Black's kingside; with more space and faster development you set the agenda.", sayShort: "Nxd4 — the full centre is yours.", arrows: [A('d4', 'c6')], highlights: [H('d4', KEY), H('e4', SOFT)] },
    { atMove: 9, say: "…Bg7 glares down the long diagonal, but it bites on granite — your d4-knight and e4-pawn hold firm. Develop Be2 or Be3, castle, and your space squeezes Black for the whole game.", sayShort: "…Bg7 — it bites on granite.", arrows: [A('g7', 'd4')], highlights: [H('d4', KEY), H('e4', SOFT)] },
  ],
  sources: FK_CTR,
};

// ── Scotch Game (student WHITE). triggerMove is BLACK's deviation. ──
const SC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'];
const SC_INIT = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'];

// Classical Scotch (var0 + shared Bc5@7) — …Bc5 Be3 Qf6 c3 lines.
const SC_CLASSICAL: SublineNarration = {
  intro: {
    say: "…Bc5 — the Classical Scotch, Black posting the bishop opposite your d4-knight. Meet it with Be3 to challenge the bishop and brace the knight, c3 to bolster the centre, and Bc4 eyeing f7. You'll castle, line the rooks on the central files, and use your space and the half-open d-file to keep a small, lasting pull while Black untangles.",
    sayShort: '…Bc5 — Be3, c3, press the centre.',
  },
  sources: SC,
};
// Mieses main line (var1, Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4) — e5 space + Black's doubled c-pawns.
const SC_MIESES: SublineNarration = {
  intro: {
    say: "The Mieses main line — your e5-pawn cramps Black's kingside and c4 kicks the d5-knight back to the rim. The structural verdict is yours to exploit: Black carries doubled, sickly c-pawns while your queenside majority is healthy. Develop behind the e5-wedge, finish your king's safety, and grind the long-term pawn weakness in the endgame.",
    sayShort: 'Mieses — e5 space, target the c-pawns.',
  },
  sources: SC,
};
// Scotch with Bc4 (var2, Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4) — sharp, active pieces.
const SC_BC4: SublineNarration = {
  intro: {
    say: "The Bc4 Scotch — you've kept the bishop trained on f7 and thrown the e5-pawn forward to cramp and to open lines. After Bb5 pins the c6-knight, your pieces swarm the centre while Black scrambles to consolidate. It's sharp and rich in initiative: pressure f7 and the loose queenside, castle, and keep Black solving problems on every move.",
    sayShort: 'Bc4 — e5 wedge, Bb5 pin, attack f7.',
  },
  beats: [
    { atMove: 10, say: "Bb5 pins the c6-knight while your e5-wedge cramps — the pieces swarm the centre. Pressure f7, castle into the attack, and make Black solve a problem on every single move.", sayShort: "Bb5 — pin c6, swarm the centre.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] },
  ],
  sources: SC_INIT,
};
// Scotch with Nc3 / Bd3 IQP (var3 & var6, Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 …).
const SC_NC3_IQP: SublineNarration = {
  intro: {
    say: "The Nc3 Scotch — the exchanges have left a lively, near-symmetrical middlegame where your pieces find the more active squares. Bg5 pins the f6-knight, Qf3 swings to the kingside, and the rooks claim the open central files. The game is balanced, so the win is MADE: keep the pieces aimed at Black's king and probe the weak light squares before he consolidates.",
    sayShort: 'Nc3 Scotch — active pieces, Bg5 and Qf3.',
  },
  sources: SC,
};
// Göring Gambit (var4, c3 dxc3 Nxc3 Bb4 Bc4 …) — a pawn for a roaring lead in development.
const SC_GORING: SublineNarration = {
  intro: {
    say: "The Göring Gambit — you've fed a pawn to rip the centre open and seize a commanding lead in development. This is attacking chess: Bc4 glares at f7, you castle in a flash, and the open lines pour your rooks toward Black's king before he can untangle. Down a pawn and completely on top — develop with threats and make the initiative pay.",
    sayShort: 'Göring — a pawn for a roaring attack.',
  },
  beats: [
    { atMove: 10, say: "Bc4 — the gambit bishop trains on f7. You're a pawn down with a commanding lead in development; castle, throw the rooks onto the open files, and the lines reach Black's king before he untangles.", sayShort: "Bc4 — eye f7, develop and attack.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
  ],
  sources: SC_INIT,
};
// Steinitz …Qh4 raid (var5, Nxd4 Qh4 Nb5) — harass the early queen.
const SC_STEINITZ_QH4: SublineNarration = {
  intro: {
    say: "…Qh4 — Steinitz's audacious early queen raid, snapping at e4 and the h-pawn. Don't panic, punish it: Nb5 leaps in hitting c7 and the a7-rook fork while gaining tempo, and the loose black queen gets chased around the board. You complete development with threats and emerge a clear tempo or two ahead — the raid is a gift, not a danger.",
    sayShort: '…Qh4 — Nb5 hits c7, chase the queen.',
  },
  sources: SC_INIT,
};
// Modern Nb3 main line (var7, Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6 Qe2) — opposite-side play.
const SC_NB3_MODERN: SublineNarration = {
  intro: {
    say: "The modern Nb3 main line — you've nudged Black's bishop to b6 and built the flexible Qe2-and-Be3 setup. Now choose your battleground: Be3 trades the dark bishops and O-O-O sets up an opposite-wing pawn-storm race, or O-O keeps it quiet and positional. Either way you hold the central space and the bishop-pair option — pick the structure that suits and press.",
    sayShort: 'Nb3 — Be3, then choose O-O-O or O-O.',
  },
  sources: SC,
};
// Nf6@5 cont — Black delays the capture (d4 Nf6). White takes on e5.
const SC_NF6_EARLY: SublineNarration = {
  intro: {
    say: "…Nf6 — Black hits e4 before recapturing on d4, a slippery move-order. Answer dxe5 and after …Nxe4 the centre clears into a balanced, open game; you keep a touch more space and the freer development. Don't over-press the symmetry — finish developing, claim an open file, and squeeze the small edge that moving first hands you.",
    sayShort: '…Nf6 — answer dxe5, keep the small edge.',
  },
  beats: [
    { atMove: 5, say: "Nf6 hits e4 before recapturing — answer dxe5. After Nxe4 the centre clears into a balanced game where your extra space and faster development give the nagging edge.", sayShort: "Nf6 — take dxe5, keep the edge.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] },
  ],
  sources: SC,
};

// ── Scotch Gambit (student WHITE). triggerMove is BLACK's deviation. ──
const SCG = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Gambit'];
const SCG_CTR = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scotch_Gambit'];

// Main Scotch Gambit (var0 + Bc5@7) — Bc4 Bc5 c3 Nf6 e5, the classical attack.
const SCG_MAIN: SublineNarration = {
  intro: {
    say: "The Scotch Gambit proper — you've given the d-pawn to rush your pieces out and aim the bishop at f7. The e5-pawn jabs the f6-knight and grabs space, Bb5 pins, and your lead in development is the whole point. Castle fast, throw the rooks onto the open files, and pour the attack onto Black's king before he untangles. Down a pawn, fully on top.",
    sayShort: 'Scotch Gambit — e5, Bb5, attack f7.',
  },
  sources: SCG,
};
// Sharp …Bb4+ pawn-grab line (var1) — White gets a violent attack (exf6, fxg7).
const SCG_SHARP: SublineNarration = {
  intro: {
    say: "Black has gorged on pawns with …Bb4+ and …dxc3, and now you collect the bill in initiative. e5 hits the knight, and the thunderbolts exf6 and fxg7 rip open Black's king before he has a piece out. This is romantic-era fire: every tempo is a threat, the open lines all point at the black monarch, and the extra pawns are meaningless against the storm. Attack.",
    sayShort: '…Bb4+ — e5 then exf6, storm the king.',
  },
  beats: [
    { atMove: 12, say: "e5 — the spearhead. It kicks the f6-knight and clears the way for the exf6 and fxg7 thunderbolts, ripping Black's king open before a piece is out. Every tempo is a threat — storm it.", sayShort: "e5 — kick the knight, rip it open.", highlights: [H('e5', KEY), H('f6', SOFT)] },
  ],
  sources: SCG,
};
// Max Lange complex (var2, Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4) — active pieces, sharp.
const SCG_MAXLANGE: SublineNarration = {
  intro: {
    say: "The Max Lange complex — your e5-wedge cramps Black and Bb5 pins the defender while the pieces swarm the centre. It's razor-sharp and brimming with initiative: f7 is the target, the e-file is your highway, and Black must defend with absolute precision. Keep forcing, castle into the attack, and make the gambit pawn pay in pure activity.",
    sayShort: 'Max Lange — e5 wedge, swarm the king.',
  },
  beats: [
    { atMove: 8, say: "e5 — the wedge cramps Black and opens lines while Bb5 looms to pin. f7 is the target, the e-file your highway; keep forcing and castle straight into the attack.", sayShort: "e5 — the wedge; target f7.", highlights: [H('e5', KEY), H('f7', SOFT)] },
  ],
  sources: SCG_CTR,
};
// Nf6@5 / Nf6@7 — Black hits e4 first. White recovers, small pull.
const SCG_NF6_EARLY: SublineNarration = {
  intro: {
    say: "…Nf6 — Black strikes at e4 before you can build, a slippery move-order. Take on e5 and the centre clears into a balanced, open game where you keep a shade more space and the faster development. Don't force the symmetry — finish developing, seize an open file, and squeeze the small edge that the first move hands you.",
    sayShort: '…Nf6 — recover on e5, keep the edge.',
  },
  sources: SCG,
};
// d6@5 cont — Black declines with …d6 (d4 d6 Bb5 Bd7). White keeps the centre.
const SCG_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black declines the gambit and props the e5-pawn instead of grabbing on d4. Make the meekness cost something: Bb5 pins the c6-knight, you keep the full d4-e4 pawn duo, and with a clean space edge and quicker development you press a comfortable, risk-free pull. He gave you the centre for free — use it.",
    sayShort: '…d6 — Bb5 pin, keep the big centre.',
  },
  beats: [
    { atMove: 5, say: "…d6 declines the gambit meekly — make it cost. Bb5 pins the c6-knight while your d4-e4 duo dominates and a clean space edge gives a risk-free pull.", sayShort: "…d6 — answer Bb5.", arrows: [A('f1', 'b5')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "Bb5 pins the c6-knight to the king, freezing Black's grip on e5 and the centre while you finish developing with a clear space edge.", sayShort: "Bb5 — pin, keep the duo.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('d4', SOFT), H('e4', SOFT)] },
    { atMove: 7, say: "…Bd7 breaks the pin, but you keep the central duo and the room. Trade or retreat, castle, and press the freer game while Black stays cramped and passive.", sayShort: "…Bd7 — keep space, press on.", highlights: [H('d4', SOFT), H('e4', SOFT)] },
  ],
  sources: SCG_CTR,
};

// ── Evans Gambit (student WHITE). triggerMove is BLACK's deviation. ──
const EV = ['book:evans-gambit', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'];
const EV_CTR = ['book:evans-gambit', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Evans_Gambit'];

// Bxb4@7 — Black accepts the gambit pawn.
const EV_BXB4: SublineNarration = {
  intro: {
    say: "…Bxb4 — accepted. You've handed over the b-pawn to gain a tempo hitting the bishop and the time to build the dream centre. Play c3 and d4: the pawns roll forward, the bishop swings to a3 raking Black's king, and Qb3 lines up with the c4-bishop on f7. This is the Evans bargain — a pawn for a lead in development you turn straight into an attack.",
    sayShort: '…Bxb4 — c3 and d4, build the attack.',
  },
  beats: [
    { atMove: 7, say: "Bxb4 accepts — now build the dream. c3 and d4 roll the centre, Ba3 rakes the king, and your bishop eyes f7. A pawn for a lead in development you cash straight into an attack.", sayShort: "Bxb4 — c3, d4, then attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
  sources: EV,
};
// Ba5@9 — the main retreat. Build with d4.
const EV_BA5: SublineNarration = {
  intro: {
    say: "…Ba5 — the main retreat, keeping the bishop on the a5-e1 diagonal eyeing your knight's pin. Now strike: d4 throws the centre forward, Qb3 trains the queen-and-bishop battery on f7, and O-O brings the rook into the attack. The gambit pawn is a memory; the rolling centre and the lead in development are the reality — pour it on.",
    sayShort: '…Ba5 — d4 centre, Qb3 battery on f7.',
  },
  beats: [
    { atMove: 9, say: "Ba5 — the main retreat. Strike: d4 throws the centre forward, Qb3 lines the queen-and-bishop battery on f7, O-O brings the rook in. The pawn's a memory; the initiative is real.", sayShort: "Ba5 — d4 and Qb3 on f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
  sources: EV_CTR,
};
// Bd6@9 + var3 deep — the solid modern …Bd6 retreat (blocks the d-pawn).
const EV_BD6: SublineNarration = {
  intro: {
    say: "…Bd6 — the solid modern retreat, planting the bishop to overprotect e5 and slow your d4 break. It's resilient but passive, blocking Black's own d-pawn. Carry on with d4 and O-O; you keep the broad centre, the bishop pair option, and a long initiative for the pawn. Patient pressure on the cramped position is the way — the bishop on d6 just gets in Black's way.",
    sayShort: '…Bd6 — d4 and O-O, press the cramp.',
  },
  sources: EV_CTR,
};
// Bb6@7 early + var2 a4 lines — Black retreats early; White harasses with a4.
const EV_BB6_QUIET: SublineNarration = {
  intro: {
    say: "…Bb6 — Black retreats the bishop without grabbing the pawn, steering for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to trap or chase the bishop and forcing …a6 or …a5 in reply. Then Nc3, d3 and a calm build-up leave you with more space and the easier game — the positional face of the Evans still favours you.",
    sayShort: '…Bb6 — harass with a4, then Nc3.',
  },
  sources: EV,
};
// Be7@5 / Be7@9 — Black declines the fight, retreats passively to e7.
const EV_BE7: SublineNarration = {
  intro: {
    say: "…Be7 — the meek retreat, tucking the bishop back and declining the gambit's fire. Take the gift of space: d4 builds the full centre, you castle and develop freely, and Black sits cramped with a passive bishop and no counterplay. There are no tricks here — just a clean central clamp and an easy, pleasant initiative to grind.",
    sayShort: '…Be7 — d4 centre, squeeze the passivity.',
  },
  sources: EV_CTR,
};
// Nf6@5 — Bc4 Nf6, Black sidesteps into the Two Knights.
const EV_NF6: SublineNarration = {
  intro: {
    say: "…Nf6 — Black declines the Evans entirely and heads for the Two Knights, hitting your e4-pawn. Fine by you: the swashbuckling Ng5 lunges at f7, or the principled d4 break opens the centre. Black has merely swapped one sharp battleground for another — pick your attack and play it with the same Evans aggression.",
    sayShort: '…Nf6 — Two Knights: d4 or Ng5.',
  },
  beats: [
    { atMove: 5, say: "Nf6 dodges the Evans into a Two Knights — fine by you. d4 cracks the centre or Ng5 dives at f7. Play it with the same Evans aggression and keep the initiative.", sayShort: "Nf6 — d4 or Ng5 at f7.", arrows: [A('c4', 'f7')], highlights: [H('e4', KEY), H('f7', SOFT)] },
  ],
  sources: EV,
};
// Deep accepted attack (the many …Ba5/…Bb6 main-line attacking positions).
const EV_ATTACK: SublineNarration = {
  intro: {
    say: "Deep in the Evans Gambit accepted — your pieces dominate the board for the price of a pawn. The d4-e4 centre cramps Black, the Qb3-and-Bc4 battery glares at f7, and Ba3 and the rooks pour toward the king. The pawn is irrelevant; the lead in development and the open lines are everything. Keep developing with threats, open the position, and make the initiative crash through.",
    sayShort: 'Evans attack — centre, battery on f7, storm.',
  },
  beats: [
    { atMove: 10, say: "d4 — the Evans centre rolls forward. The pawns seize space, Ba3 will rake the king, and Qb3 joins the c4-bishop's aim at f7. A pawn down and dominating — develop with threats and pour it on.", sayShort: "d4 — roll the centre, then attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
  sources: EV,
};

// ── King's Gambit (student WHITE). triggerMove is BLACK's deviation. ──
const KG = ['book:kings-gambit', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];
const KG_CTR = ['book:kings-gambit', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

// var0 — Hanstein/classical …g5 Bg7 defence (exf4 Nf3 g5 Bc4 Bg7 h4 d4 Nc3).
const KG_HANSTEIN: SublineNarration = {
  intro: {
    say: "The classical defence — Black holds the f4-pawn with …g5 and fianchettoes the bishop on g7. You take dead aim at the wobbly kingside chain: h4 to prise open the g5-pawn, d4 to seize the centre, and Nc3 and the rooks pouring down the half-open f-file at f7. The gambit pawn buys you a roaring initiative; pry the chain apart and the attack flows toward Black's king.",
    sayShort: 'Classical — h4 and d4, hit g5.',
  },
  beats: [
    { atMove: 8, say: "h4 — prise open the g5-f4 chain that holds Black's extra pawn. The file cracks, your rook and pieces flood toward f7, and the gambit pawn buys a roaring initiative.", sayShort: "h4 — crack the g5 chain open.", highlights: [H('g5', KEY), H('h4', ATK)] },
  ],
  sources: KG,
};
// var1 — Fischer Defence (exf4 Nf3 d6 d4). Big centre, methodical attack.
const KG_FISCHER: SublineNarration = {
  intro: {
    say: "…d6 — the Fischer Defence, a cool, modern way to hold the gambit pawn and keep the kingside flexible. Don't be rushed: d4 builds the broad centre, Nc3 and Bc4 develop with purpose, and you prepare to regain f4 or blast open the f-file at the right moment. The extra pawn is temporary; your space and the open lines toward f7 are the lasting trumps.",
    sayShort: '…d6 — Fischer: d4 centre, eye the f-file.',
  },
  beats: [
    { atMove: 6, say: "d4 — build the broad centre against the Fischer. Nc3 and Bc4 develop with purpose, and you prepare to win back f4 or blast the f-file open. The extra pawn is temporary; your space lasts.", sayShort: "d4 — broad centre, eye the f-file.", highlights: [H('d4', KEY)] },
  ],
  sources: KG_CTR,
};
// var2 — Muzio Gambit (exf4 Nf3 g5 Bc4 g4 O-O gxf3 Qxf3). Knight sac for a ferocious attack.
const KG_MUZIO: SublineNarration = {
  intro: {
    say: "The Muzio Gambit — the wildest sacrifice in classical chess. You let Black take the f3-knight with …gxf3, and Qxf3 unleashes the storm: queen, bishop and rook all train on f7 while Black has barely a piece off the back rank. Objectively it is unclear, but over the board it is sheer terror — Bxf4, Nc3 and Rae1 pile on faster than Black can untangle. Attack with total abandon.",
    sayShort: 'Muzio — sac the knight, storm f7.',
  },
  beats: [
    { atMove: 10, say: "Qxf3 — and the storm breaks. Queen, bishop and rook all swing toward f7 while Black has barely a piece off the back rank. Bxf4, Nc3 and Rae1 pile on faster than he can untangle — attack with total abandon.", sayShort: "Qxf3 — the storm breaks at f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY), H('f4', SOFT)] },
  ],
  sources: KG,
};
// var3 — Falkbeer / Modern Counter-Gambit (f4 d5 exd5 e4 d3). Open game, small edge.
const KG_FALKBEER: SublineNarration = {
  intro: {
    say: "…d5 — the Falkbeer Counter-Gambit, refusing your gambit and striking back in the centre with a pawn of Black's own. Defuse it with d3, undermining the advanced e4-pawn and opening the position for your pieces. After the central pawns clear you reach a balanced, lively game where your better development and the bishop pair hand you a small but genuine pull. Open it up and out-play.",
    sayShort: '…d5 — Falkbeer: undermine with d3.',
  },
  sources: KG_CTR,
};
// var4 — King's Gambit Declined with …Bc5 (f4 Bc5 Nf3 d6 Nc3 Bc4 d3 f5).
const KG_DECLINED: SublineNarration = {
  intro: {
    say: "…Bc5 — the King's Gambit Declined, the safe and respected refusal: Black ignores the pawn and plants the bishop on the a7-g1 diagonal eyeing your king. Play it positionally: Nf3, Nc3 and Bc4 develop, d3 braces the centre, and the f5 advance grabs kingside space and clamps Black in. No sacrifices needed — you nurse the space edge and the half-open f-file into a lasting initiative.",
    sayShort: '…Bc5 — KGD: develop, clamp with f5.',
  },
  sources: KG,
};
// var5 — Kieseritzky (exf4 Nf3 g5 h4 g4 Ne5). Main line, knight on e5, attack.
const KG_KIESERITZKY: SublineNarration = {
  intro: {
    say: "The Kieseritzky — the main line of the King's Knight's Gambit. Your knight leaps to e5, a dominant outpost from which it eyes f7, g4 and d7, while h4 and the coming d4 and Bxf4 reclaim the kingside and open lines. This is the sharpest theory in the opening: play energetically, keep the knight's grip, and drive the attack at Black's exposed king.",
    sayShort: 'Kieseritzky — Ne5 outpost, d4 and Bxf4.',
  },
  beats: [
    { atMove: 8, say: "Ne5 — the knight leaps to its dominant outpost, eyeing f7, g4 and d7 at once. With h4 and the coming d4 and Bxf4 you reclaim the kingside and tear open lines — drive the attack at Black's exposed king.", sayShort: "Ne5 — the outpost; attack the king.", arrows: [A('e5', 'f7')], highlights: [H('e5', KEY)] },
  ],
  sources: KG,
};
// var6 — Allgaier (exf4 Nf3 g5 h4 g4 Ng5 h6 Nxf7). Sac the knight, drag the king out.
const KG_ALLGAIER: SublineNarration = {
  intro: {
    say: "The Allgaier — you fling the knight onto f7 with Nxf7, dragging Black's king into the open before a single defender is developed. It's a romantic, double-edged gambit: the king walks to f7, but d4, Bxf4 and Nc3 hurl your whole army at the bared monarch down the f-file. Objectively risky, practically lethal — chase the king and never let it find shelter.",
    sayShort: 'Allgaier — Nxf7, hunt the bare king.',
  },
  beats: [
    { atMove: 13, say: "Black's king is bared on f7 — pour it on. d4, Bxf4 and Nc3 hurl your whole army down the f-file at a king with no shelter in sight. Risky in theory, lethal in practice — never let it settle.", sayShort: "Allgaier — hunt the bared king.", highlights: [H('f7', KEY)] },
  ],
  sources: KG,
};
// var7 — King's Bishop's Gambit (exf4 Bc4). Aim at f7, develop fast.
const KG_BISHOPS: SublineNarration = {
  intro: {
    say: "The King's Bishop's Gambit — instead of Nf3 you throw the bishop to c4 at once, aiming straight at f7 and keeping the queen's path to h5 open. Black usually strikes with …Nf6 and …d5; meet it with Nc3 and d4, recapture the centre, and your pieces flood toward the king. Rapid development and the f-file pressure are the gambit's payment — develop with threats and attack.",
    sayShort: "Bishop's Gambit — Bc4 at f7, develop fast.",
  },
  beats: [
    { atMove: 4, say: "Bc4 — the Bishop's Gambit, the bishop at f7 at once and the queen's road to h5 kept open. Meet …Nf6 and …d5 with Nc3 and d4, recapture the centre, and flood your pieces toward the king.", sayShort: "Bc4 — aim at f7, develop fast.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
  ],
  sources: KG,
};
// Accepted, …d6 quiet hold (exf4 Nf3 d6 d4 g5 h4 g4). Take the centre, crack g5.
const KG_ACC_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black holds the extra f-pawn the quiet way, propping up the kingside and keeping options open. Seize the centre by force: d4 hands you a broad pawn duo, and when Black grabs space with …g5 to defend f4, you crack the chain open with h4. You're playing for the f-file and a kingside initiative — the pawn is only borrowed.",
    sayShort: '…d6 — d4 centre, then h4.',
  },
  beats: [
    { atMove: 5, say: "…d6 props the position and clings to the gambit pawn — solid, but slow. Punish the delay: d4 grabs the full centre at once while Black is still uncommitted.", sayShort: "…d6 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "d4 — the broad centre is yours. Now Bc4, Nc3 and castling line up smoothly, and you're ready to win f4 back with Bxf4 whenever you choose.", sayShort: "d4 — broad centre, regain f4.", highlights: [H('d4', KEY), H('f4', SOFT)] },
    { atMove: 8, say: "…g5 lunged to defend f4 — answer h4! The pawn levers the g5-point, the g-file cracks open, and your rooks get a highway toward Black's bared king. The gambit pawn bought you exactly this attack.", sayShort: "h4 — prise the g5 chain open.", arrows: [A('h4', 'g5')], highlights: [H('g5', KEY), H('h4', SOFT)] },
  ],
  sources: KG,
};
// Accepted, …d5 Modern (exf4 Nf3 d5 exd5 Nf6 Bc4 Nxd5 O-O). Open, level, faster develop.
const KG_ACC_D5: SublineNarration = {
  intro: {
    say: "…d5 — the Modern Defence, Black handing the pawn straight back to free his game and kill your attack. Accept the deal: take on d5, and you out-develop him in the open position. Material levels out, but Bc4, castling and the half-open f-file leave you a step ahead with the pleasanter game.",
    sayShort: '…d5 — take exd5, out-develop.',
  },
  beats: [
    { atMove: 5, say: "…d5 gives the pawn back to open lines and blunt your initiative — happily taken. exd5 grabs it and clears the centre, where your lead in development will tell.", sayShort: "…d5 — answer exd5.", arrows: [A('e4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 6, say: "exd5 — the centre opens. Black will regain the pawn with …Nf6 and …Nxd5, levelling material, but you finish developing first and keep the pressure.", sayShort: "exd5 — open it, stay ahead.", highlights: [H('d5', KEY)] },
    { atMove: 8, say: "Bc4 braces the d5-pawn that …Nf6 is eyeing and will rake the a2-g8 diagonal the moment it clears. After …Nxd5 you castle a clear tempo ahead.", sayShort: "Bc4 — hold d5, develop.", arrows: [A('c4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 10, say: "O-O — king safe and the rook drops onto the half-open f-file, glaring down at f7. Material is level, but your faster development and that open file hand you a small, lasting pull. Develop, double rooks, press.", sayShort: "O-O — rook to the f-file.", highlights: [H('f7', KEY)] },
  ],
  sources: KG_CTR,
};
// Accepted, …Nf6 (exf4 Nf3 Nf6 e5 Nh5 d4). Gain time, big centre.
const KG_ACC_NF6: SublineNarration = {
  intro: {
    say: "…Nf6 develops and pokes at your e4-pawn — so push past it and gain time. e5 kicks the knight to the rim at h5, where it bites on nothing, and d4 rolls up the broad centre behind it. The f4-pawn comes back with Bxf4 at your leisure; for now you have space, tempo and a stranded enemy knight.",
    sayShort: '…Nf6 — push e5, gain time.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 hits e4 to slow you down — turn it into a gift. e5! shoves the pawn forward with tempo, chasing the knight to the edge of the board.", sayShort: "…Nf6 — answer e5.", arrows: [A('e4', 'e5')], highlights: [H('e5', KEY), H('f6', SOFT)] },
    { atMove: 6, say: "e5 drives the knight to h5, offside on the rim, while you bank central space for free. Every tempo Black spends on that knight, you spend building.", sayShort: "e5 — chase the knight to h5.", highlights: [H('e5', KEY), H('h5', SOFT)] },
    { atMove: 8, say: "d4 — the centre is a wall, the h5-knight is stranded, and your pieces flow out toward f7. Bxf4 reclaims the pawn whenever you like; the space and initiative are already yours.", sayShort: "d4 — big centre, knight stranded.", highlights: [H('d4', KEY), H('h5', SOFT)] },
  ],
  sources: KG_CTR,
};
// Accepted, …Ne7 (exf4 Nf3 Ne7 d4 d5 Nc3). Take the centre, press d5.
const KG_ACC_NE7: SublineNarration = {
  intro: {
    say: "…Ne7 — a flexible developing move, the knight rerouting toward g6 to bolster f4. Don't let Black settle: d4 grabs the full centre at once, and when he hits back with …d5 you develop Nc3 with pressure on it. Your centre and lead in development dominate while the e7-knight sits passive — Bxf4 regains the pawn in time.",
    sayShort: '…Ne7 — d4, press the centre.',
  },
  beats: [
    { atMove: 5, say: "…Ne7 heads quietly for g6 to prop up f4 — but it's slow. Take the centre now with d4 while Black is still untangling.", sayShort: "…Ne7 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "d4 — the broad centre stands. Black strikes back with …d5 to stake his own claim; you simply keep developing toward it.", sayShort: "d4 — full centre, keep rolling.", highlights: [H('d4', KEY)] },
    { atMove: 8, say: "Nc3 develops with tempo, leaning on the d5-pawn while your centre cramps Black and the e7-knight does little. Bxf4 wins the pawn back soon; the initiative stays with you.", sayShort: "Nc3 — pressure d5, stay on top.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] },
  ],
  sources: KG_CTR,
};
// Accepted, …Be7 (exf4 Nf3 Be7 Bc4 Nf6). Solid; develop with threats.
const KG_ACC_BE7: SublineNarration = {
  intro: {
    say: "…Be7 — a modest, solid hold, the bishop covering the h4-e1 diagonal and eyeing the spite-check …Bh4+. Develop with threats of your own: Bc4 trains on f7, then d4, Nc3 and Bxf4 build the centre and reclaim the pawn. You keep the half-open f-file and a free, comfortable initiative for the gambit pawn.",
    sayShort: '…Be7 — Bc4, then d4.',
  },
  beats: [
    { atMove: 5, say: "…Be7 quietly shores up the kingside and keeps …Bh4+ in reserve — sound but passive. Answer in kind but with bite: Bc4 swings onto the a2-g8 diagonal at f7.", sayShort: "…Be7 — answer Bc4.", arrows: [A('f1', 'c4')], highlights: [H('c4', KEY)] },
    { atMove: 6, say: "Bc4 aims straight at f7 and clears the back rank for castling. Black develops …Nf6; you follow with d4, Nc3 and Bxf4, regaining the pawn with the freer game and the f-file pointed at his king.", sayShort: "Bc4 — aim f7, then d4.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
  ],
  sources: KG,
};

// ── Vienna Game (student WHITE). triggerMove is BLACK's deviation. ──
const VN = ['book:vienna-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'];
const VN_CTR = ['book:vienna-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Vienna_Game'];

// var0 — Vienna with f4 d5 (fxe5 Nxe4 Nf3). Open game, slight pull.
const VN_F4D5: SublineNarration = {
  intro: {
    say: "…d5 — Black's principled central counter to your f4, the soundest reply to the Vienna Gambit. The game opens up: fxe5 and Nf3 develop, and after the dust settles you reach a lively, roughly level middlegame with the half-open f-file and easy piece play. Don't force it — develop, castle, contest the centre, and the f-file pressure gives a small, pleasant edge.",
    sayShort: '…d5 — open it up, press the f-file.',
  },
  sources: VN_CTR,
};
// var1 / var3 Qh5 lines — the Frankenstein-Dracula attack (Bc4 Nxe4 Qh5).
const VN_FRANKENSTEIN: SublineNarration = {
  intro: {
    say: "Bc4 …Nxe4 Qh5 — the Frankenstein-Dracula, one of the wildest tabiyas in chess. Your queen barges to h5 hitting e5 and forcing …Nd6, then Bb3 keeps the bishop alive and Nb5 leaps at c7, ripping into Black's queenside. Theory calls it roughly balanced, but the practical pressure is enormous — Black walks a tightrope while you hurl pieces at the king. Attack with conviction.",
    sayShort: 'Qh5 — Frankenstein: Bb3, Nb5, attack c7.',
  },
  sources: VN,
};
// var2 — quiet Bc4 Bc5 d3 maneuvering.
const VN_QUIET: SublineNarration = {
  intro: {
    say: "…Bc5 with …d6 — the quiet, modern Vienna where both sides build slowly. Match the patience and use your space: Nf3 and O-O finish development, and the f4 break is loaded to open the f-file toward Black's king at the right moment. A rich manoeuvring game where your kingside pawn lever and the better-placed pieces give a small, lasting initiative.",
    sayShort: 'Quiet Vienna — develop, ready the f4 break.',
  },
  sources: VN,
};
// var1/var3 non-Qh5 — early Bc4 bishop/pawn development.
const VN_BC4_DEV: SublineNarration = {
  intro: {
    say: "Black develops calmly against your Bc4 Vienna rather than grabbing on e4. That suits you: complete your own development with Nf3 and d3, keep the bishop trained on f7, and prepare the thematic f4 break to prise the centre open. With harmonious pieces and the kingside lever in hand, you steer toward a comfortable game with the easier plan.",
    sayShort: 'Develop, hold f7, prepare the f4 break.',
  },
  beats: [
    { atMove: 5, say: "Black develops calmly instead of grabbing e4 — that suits you. Hold the bishop trained on f7, finish with Nf3 and d3, and load the f4 break to prise the centre open. Harmonious pieces, the easier plan.", sayShort: "Develop, hold f7, load the f4 break.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY), H('f4', SOFT)] },
  ],
  sources: VN,
};
// var4 — Hamppe / KG-style Vienna (Nc3 Nc6 f4 exf4 Nf3 g5 Bc4 Bg7 d4).
const VN_HAMPPE: SublineNarration = {
  intro: {
    say: "The Hamppe lines — a King's-Gambit-flavoured Vienna where Black props f4 with …g5 and fianchettoes on g7. You strike at the over-extended kingside: d4 grabs the centre, Bc4 and O-O bring the pieces toward f7, and h4 or the f-file pressure crack the g5-f4 chain. The gambit pawn buys a roaring initiative — open lines at Black's king and pour it on.",
    sayShort: 'Hamppe — d4 centre, crack the g5 chain.',
  },
  sources: VN,
};
// var5 — Vienna Gambit accepted with e5 (f4 exf4 e5 Ng8 Nf3). Space, attack.
const VN_GAMBIT_E5: SublineNarration = {
  intro: {
    say: "The Vienna Gambit accepted — your e5-pawn stabs the f6-knight back to g8, gaining a big lead in space and time while Black is shoved backward. Develop fast: Nf3, d4 and Bxf4 reclaim the gambit pawn and the broad centre, and the half-open f-file points straight at f7. You're playing for a kingside attack with the better-developed army — keep the pressure on and don't let Black untangle.",
    sayShort: 'Vienna Gambit — e5 space, d4 and attack.',
  },
  beats: [
    { atMove: 6, say: "e5 — your pawn shoves the f6-knight back to g8, seizing big space and time. Nf3, d4 and Bxf4 reclaim the centre and the pawn, and the half-open f-file points straight at f7.", sayShort: "e5 — seize space, then d4 and Bxf4.", highlights: [H('e5', KEY), H('f7', SOFT)] },
  ],
  sources: VN_CTR,
};
// var6 — Mieses g3 fianchetto (Nc3 Nf6 g3 d5 exd5 Nxd5 Bg2).
const VN_G3: SublineNarration = {
  intro: {
    say: "The Mieses g3 system — you fianchetto the king's bishop and let the g2-bishop rake the long light diagonal toward Black's queenside. After the central trades you carry the bishop pair and a flexible structure; castle, play d3 and Nf3, and lean on the long diagonal and the half-open b-file. A calm, strategically rich game where your harmonious setup gives the durable pull.",
    sayShort: 'g3 — fianchetto, press the long diagonal.',
  },
  sources: VN,
};
// var7 — Qg4 f2-sacrifice attack (Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1).
const VN_QG4: SublineNarration = {
  intro: {
    say: "The Qg4 gambit — you throw the queen to g4 hitting g7, and after the f2-pawn falls Nd5 leaps to the heart of the board threatening c7 and the fork while Black's queen is misplaced. It's a swashbuckling, double-edged attack: your king walks to d1 but your pieces swarm Black's loose camp and uncastled king. Sharp and dangerous — keep the initiative roaring and hunt the king.",
    sayShort: 'Qg4 — Nd5 central, hunt the king.',
  },
  beats: [
    { atMove: 8, say: "Nd5 — the knight leaps to the heart of the board, threatening c7 and the fork while Black's queen sits misplaced. Your king walks to d1, but your pieces swarm his loose, uncastled camp.", sayShort: "Nd5 — central leap, hunt the king.", arrows: [A('d5', 'c7')], highlights: [H('d5', KEY), H('c7', SOFT)] },
  ],
  sources: VN,
};

// ── Vienna Gambit (student WHITE). triggerMove is BLACK's deviation. ──
const VG = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Vienna_Game'];

// var0 — accepted with e5 (f4 exf4 e5 Ng8 Nf3). Space and attack.
const VG_E5: SublineNarration = {
  intro: {
    say: "The Vienna Gambit accepted — your e5-pawn shoves the f6-knight back to g8, winning a big lead in space and development while Black is forced into reverse. Build the attack: Nf3 and d4 erect the broad centre, Bxf4 reclaims the gambit pawn, and the half-open f-file aims at f7. You're a pawn down for a commanding initiative — develop with threats and storm the kingside before Black can untangle.",
    sayShort: 'Accepted — e5 space, d4 and Bxf4.',
  },
  beats: [
    { atMove: 6, say: "e5 — the pawn drives the f6-knight all the way home to g8, winning space while Black goes into reverse. Build with Nf3 and d4, win back f4, and aim the f-file at the king.", sayShort: "e5 — drive the knight back, build.", highlights: [H('e5', KEY), H('f7', SOFT)] },
  ],
  sources: VG,
};
// var1 — f4 d5 fxe5 Nxe4 Qf3. White's Qf3/Bf4/O-O-O attack with the bishop pair.
const VG_QF3: SublineNarration = {
  intro: {
    say: "…d5 fxe5 …Nxe4 Qf3 — the modern main line, and your pieces flow to fighting squares. After …Nxc3 dxc3 you hold the bishop pair and open lines, Bf4 develops with tempo, and O-O-O throws the rook onto the d-file for an opposite-wing attack. The e5-pawn cramps Black's kingside while you castle long and roll the h- and g-pawns — a rich, attacking game with the initiative firmly yours.",
    sayShort: 'Qf3 — bishop pair, O-O-O, attack.',
  },
  beats: [
    { atMove: 8, say: "Qf3 — the queen swings to a fighting square, hitting the e4-knight and bearing down the file toward f7. After …Nxc3 dxc3 you hold the bishop pair; Bf4 and O-O-O follow for an opposite-wing storm.", sayShort: "Qf3 — bishop pair, then O-O-O.", arrows: [A('f3', 'f7')], highlights: [H('e4', KEY), H('f7', SOFT)] },
  ],
  sources: VG,
};

// ── Petrov Defence (student BLACK). triggerMove is WHITE's deviation. ──
const PT = ['book:petrov-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const PT_CTR = ['book:petrov-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const PT_KS = ['book:petrov-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];

// var0/var5 — Classical main line (Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3). Symmetry holds.
const PT_MAIN: SublineNarration = {
  intro: {
    say: "The Petrov main line, the fortress you reach when you want no weaknesses. Its whole logic is symmetry: your knight sits proudly on e4, mirrored by White's, and your …d5 pawn anchors it while opening the light bishop. Finish with …Bd6 or …Be7, castle, and meet c4 with …c6 — by the time White probes with Nc3 or Re1 you have a rock-solid position that simply offers nothing to attack.",
    sayShort: 'Main Petrov — symmetry, …d5, then castle.',
  },
  beats: [
    { atMove: 9, say: "…d5 — the keystone of the Petrov. It anchors your e4-knight on its outpost so it can't be cheaply chased, and at the same time frees your light-squared bishop. This little pawn is what makes the whole defence hold together.", sayShort: "…d5 — anchor the knight, free the bishop.", highlights: [H('e4', KEY), H('d5', ATK)] },
  ],
  sources: PT,
};
// var1 — 3.d4 line (d4 Nxe4 Bd3 d5 Nxe5 Nd7). Solid equality.
const PT_D4: SublineNarration = {
  intro: {
    say: "The 3.d4 Petrov — White opens the centre early instead of recapturing on e5. The antidote is precise and well-charted: …d5 anchors your e4-knight, …Nd7 challenges White's advanced knight and offers the trade that defuses all pressure, and …Bd6 develops toward the kingside. Castle, and you sit behind a symmetrical, weakness-free structure that holds the balance with ease.",
    sayShort: '3.d4 — …d5, …Nd7, trade and equalize.',
  },
  beats: [
    { atMove: 9, say: "…Nd7 — challenge White's advanced e5-knight head-on, offering the trade that dissolves all his pressure. Simple, solid, symmetrical: White is left with a position that refuses to give him a target.", sayShort: "…Nd7 — challenge e5, trade off.", highlights: [H('e5', KEY)] },
  ],
  sources: PT_CTR,
};
// var2 — 3.Nc3 transposing to a Four Knights / Scotch (Nc3 Nc6 d4 exd4 Nxd4 Bb4).
const PT_NC3_TRANSPOSE: SublineNarration = {
  intro: {
    say: "Nc3 — White steers the Petrov into Four-Knights and Scotch territory. Follow the principled path: …Nc6 and after d4 the …Bb4 pin contests the e4-square just as in the Nimzo spirit. You'll trade on c3 to dent White's pawns or hold the pin and develop; either way you reach a balanced, well-known structure where your pieces are as active as White's and there's nothing to fear.",
    sayShort: 'Nc3 — …Nc6 and the …Bb4 pin, equalize.',
  },
  beats: [
    { atMove: 9, say: "…Bb4 — the Nimzo-style pin, nailing the c3-knight and fighting for the e4-square just as in the Nimzo proper. Trade on c3 to dent White's pawns, or hold the pin and squeeze — either road is comfortable.", sayShort: "…Bb4 — pin c3, contest e4.", arrows: [A('b4', 'c3')], highlights: [H('c3', KEY), H('e4', SOFT)] },
  ],
  sources: PT,
};
// var3 — Cochrane Gambit (Nxe5 d6 Nxf7 Kxf7) + Nxf7 sacs. A piece up; get the king safe.
const PT_COCHRANE: SublineNarration = {
  intro: {
    say: "The Cochrane Gambit — White has flung a knight onto f7 to drag your king into the open. It looks terrifying and it is completely sound for you: you're a full piece up for one or two pawns, and the entire game hinges on a single idea — get the king to safety and the extra material wins itself. Play …d5 to slam the diagonal shut, walk the king to g8, untangle with …Re8, and don't grab, don't panic.",
    sayShort: 'Cochrane — …d5, tuck the king away.',
  },
  sources: PT_KS,
};
// var4/var6 — 5.Nc3 / Nimzowitsch line (Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7). Solid, opposite-castling.
const PT_5NC3: SublineNarration = {
  intro: {
    say: "The 5.Nc3 line — White trades knights and recaptures with dxc3, taking the bishop pair and a half-open d-file in return for doubled c-pawns. There's nothing to fear: develop naturally with …Be7, …Nc6 and …Be6, get the queen to d7 and castle long, and your structure is the sounder one. White's bishops look active, but your solid setup and healthy pawns hold the balance comfortably.",
    sayShort: '5.Nc3 — …Be7, …Nc6, …Be6, castle long.',
  },
  beats: [
    { atMove: 9, say: "…Nxc3 — trade the knights; after dxc3 White grabs the bishop pair but saddles himself with doubled c-pawns. Your structure is the sounder one — develop, castle long, and let the healthy pawns tell.", sayShort: "…Nxc3 — trade, give White doubled pawns.", highlights: [H('c3', KEY)] },
  ],
  sources: PT,
};

// ── Philidor Defence (student BLACK). triggerMove is WHITE's deviation. ──
const PH = ['book:philidor-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Philidor_Defence'];
const PH_CTR = ['book:philidor-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Philidor_Defence'];
const PH_INIT = ['book:philidor-defence', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Philidor_Defence'];

// var0/var1 — Hanham main (d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6). Solid, cramped, free with the breaks.
const PH_HANHAM: SublineNarration = {
  intro: {
    say: "The Hanham Philidor — cramped but bombproof. Your pawns on e5 and d6 form a low, solid wall and every piece has a safe home: …Nbd7, …Be7, …c6 and castle. The position is a coiled spring — bide your time, then uncoil with …exd4 to open lines or the freeing …d5 break at the perfect moment. Defend accurately and the cramp dissolves into a sound, fully playable game.",
    sayShort: 'Hanham — solid setup, free with …d5.',
  },
  sources: PH,
};
// var2/var3 + d4@4 — Improved/open Hanham via 3…exd4 (d4 exd4 Nxd4 Nf6 Nc3 Be7).
const PH_OPEN: SublineNarration = {
  intro: {
    say: "The modern Philidor — you've taken on d4 early to reach the Improved Hanham, a more elastic version of the defence. Build the same sturdy shell: …Be7, …O-O, …Re8 or …Nbd7, and reroute the knight via …Nf5 or break with …d5 when White over-commits. Your structure is compact and weakness-free; meet White's Be3, Bg5 or f4 calmly and the position holds the balance with active piece play.",
    sayShort: 'Modern Philidor — …Be7, …O-O, …d5 break.',
  },
  beats: [
    { atMove: 7, say: "…Nf6 — building the compact Philidor shell. Develop …Be7 and …O-O behind it, then reroute the knight via …Nf5 or break with …d5 when White over-commits. Weakness-free and elastic.", sayShort: "…Nf6 — build the shell, then …d5.", highlights: [H('d5', SOFT)] },
  ],
  sources: PH_CTR,
};
// var4 — Philidor Counter-Gambit (d4 f5). Sharp, Black seizes the initiative.
const PH_COUNTERGAMBIT: SublineNarration = {
  intro: {
    say: "…f5 — the Philidor Counter-Gambit, the sharpest and riskiest way to play the Philidor. Be clear-eyed: with accurate play White keeps a real edge, so this is a practical weapon that banks on complications and White slipping, not a sound equalizer. If you play it, play it with fire — grab space with …fxe4 and …e4, open lines, and make White prove the refutation over the board.",
    sayShort: '…f5 — sharp, risky counter-gambit.',
  },
  beats: [
    { atMove: 5, say: "…f5 — the counter-gambit, sharp but objectively risky: White keeps an edge with precise play. You bank on complications — grab space with …fxe4 and …e4, open lines, and make White prove the refutation at the board.", sayShort: "…f5 — risky gambit, bank on complications.", highlights: [H('f5', KEY), H('e4', SOFT)] },
  ],
  sources: PH_INIT,
};
// var5 — White's quiet d3/g3 KIA setup. Black develops comfortably.
const PH_D3_QUIET: SublineNarration = {
  intro: {
    say: "White chooses the quiet d3 and g3 setup, a King's-Indian-Attack in reverse rather than a fight for the centre. That hands you an easy game: develop naturally with …Be7, …O-O and …Nc6, claim your share of the centre, and prepare …d5 or …Nd4 to seize the initiative. There's no pressure to react to — match White's calm and you stand at least equal with the freer plan.",
    sayShort: 'Quiet d3 — develop, …Nc6, then …d5.',
  },
  sources: PH,
};

// ── Schliemann Defence (student BLACK). triggerMove is WHITE's deviation. ──
const SCH = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const SCH_DEV = ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];

// Nc3@6 — the main antidote (Bb5 f5 Nc3 fxe4 Nxe4 Nf6). Active, sharp equality.
const SCH_NC3: SublineNarration = {
  intro: {
    say: "Nc3 — the principled main line against your Schliemann, calmly developing and defending e4 instead of grabbing on f5. This is the theory-rich brawl the gambit is built for, and it's fully sound for you: you trade on e4, chase White's pieces, and develop with the initiative down the half-open f-file. Don't go quiet now — keep punching.",
    sayShort: 'Nc3 — …fxe4 and …Nf6, keep attacking.',
  },
  beats: [
    { atMove: 6, say: "Nc3 develops and braces the e4-pawn — the critical main line. Don't hesitate: the open f-file and your lead in piece activity are the whole point of the gambit, so strike at the centre at once with …fxe4.", sayShort: "Nc3 — answer …fxe4.", arrows: [A('f5', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 7, say: "…fxe4 rips open the centre and the f-file in one stroke. White must recapture — Nxe4 — bringing the knight to a square where you can hit it immediately and gain time for your development.", sayShort: "…fxe4 — White retakes Nxe4.", arrows: [A('c3', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…Nf6 challenges the centralised knight and develops with tempo — exactly the active, pressing game the Schliemann promises. From here …d5, …Bd6 and castling pour your pieces toward White's king while the f-file stays yours.", sayShort: "…Nf6 — challenge the e4-knight.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: SCH,
};
// d3@6 — the modern positional try (Bb5 f5 d3 fxe4 dxe4). Solid, equal.
const SCH_D3: SublineNarration = {
  intro: {
    say: "d3 — the modern, positional answer, refusing the sharp lines and keeping the centre solid. Defuse it calmly: trade on e4, let White recapture with the d-pawn, and then develop with …Bc5 and …Nf6 to use the half-open f-file. White avoids the fireworks, but you stand at least equal with the freer, more aggressive setup.",
    sayShort: 'd3 — …fxe4, then …Bc5.',
  },
  beats: [
    { atMove: 6, say: "d3 keeps it solid and sidesteps the brawl — no problem. Open the position on your terms with …fxe4; you'll trade White's centre pawn and hand yourself a clean half-open f-file to work with.", sayShort: "d3 — answer …fxe4.", arrows: [A('f5', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 7, say: "…fxe4 — and White recaptures with dxe4, leaving a single central pawn and that lovely open f-file aimed at f2. Now you develop with purpose.", sayShort: "…fxe4 — White retakes dxe4.", arrows: [A('d3', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 8, say: "…Bc5 swings the bishop to its most aggressive diagonal, eyeing f2, while the f8-rook will pile onto the half-open f-file after you castle. Solid, active, and the freer side — White's caution gave you the initiative.", sayShort: "…Bc5 — press the half-open f-file.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY)] },
  ],
  sources: SCH_DEV,
};
// d4@6 — central counter (Bb5 f5 d4 fxe4 Nxe5 Nxe5). Open it up.
const SCH_D4: SublineNarration = {
  intro: {
    say: "d4 — White meets your gambit with a central counter-thrust, striking at e5 before you can build. Stay aggressive: take on e4 to keep the lines open, and when White grabs on e5 you simply recapture, landing a strong knight in the centre with an extra cramping pawn. This is the open, double-edged battle the Schliemann thrives in.",
    sayShort: 'd4 — …fxe4, keep it sharp.',
  },
  beats: [
    { atMove: 6, say: "d4 hits e5 and tries to blow the centre open before you're ready — meet force with force. …fxe4 keeps the lines open and your e4-pawn cramps White's kingside; don't let him consolidate.", sayShort: "d4 — answer …fxe4.", arrows: [A('f5', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 7, say: "…fxe4 — now White snatches the loose e5-pawn with Nxe5, but it's a trade you welcome: your c6-knight is ready to recapture and seize the centre.", sayShort: "…fxe4 — White grabs e5.", arrows: [A('f3', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 9, say: "…Nxe5 plants a powerful knight on e5, and you've kept the advanced e4-pawn jamming White's kingside. Dynamic equality with the initiative — develop quickly and let that cramping pawn and active knight do the talking.", sayShort: "…Nxe5 — strong knight, extra pawn.", arrows: [A('e5', 'f3')], highlights: [H('e4', KEY), H('e5', SOFT)] },
  ],
  sources: SCH,
};
// Bxc6@6 — early trade (Bb5 f5 Bxc6 dxc6 Nc3 Nf6). Bishop pair + central pawns.
const SCH_BXC6: SublineNarration = {
  intro: {
    say: "Bxc6 — White trades off the bishop early to dent your structure. Recapture toward the centre and count your trumps: the bishop pair, a broad pawn front, and open lines for both rooks. The doubled c-pawns are a trifle; with …Nf6, …Bc5 and the …f4 push you grab kingside space and the initiative. The trade hands you the more dynamic game.",
    sayShort: 'Bxc6 — …dxc6, bishop pair rolls.',
  },
  beats: [
    { atMove: 6, say: "Bxc6 swaps the bishop to wreck your queenside pawns — but recapturing toward the centre is all upside for you. …dxc6 opens the d-file and keeps a big pawn front.", sayShort: "Bxc6 — recapture …dxc6.", arrows: [A('d7', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 7, say: "…dxc6 — and look at the compensation: the bishop pair, an e5-f5 pawn duo cramping White, and the d-file pried open for your rook. Doubled c-pawns never mattered less.", sayShort: "…dxc6 — bishop pair, big centre.", arrows: [A('c8', 'e6')], highlights: [H('e5', SOFT), H('f5', SOFT)] },
    { atMove: 9, say: "…Nf6 develops and eyes e4; next comes …Bc5 to the active diagonal and the …f4 thrust to grab kingside space. The two bishops and the initiative make this the side you want.", sayShort: "…Nf6 — then …Bc5 and …f4.", arrows: [A('f8', 'c5')], highlights: [H('f4', KEY)] },
  ],
  sources: SCH_DEV,
};
// Sharp e4-push lines (exf5 e4, Bxc6 in the e4 lines, Ng1@10, d3@10). Gambit initiative.
const SCH_SHARP: SublineNarration = {
  intro: {
    say: "You've thrown the e-pawn forward to e4, the gambit heart of the Schliemann: the pawn cramps White's kingside and strips the f3-knight of its best square. White scrambles to untangle while your pieces pour out with tempo. It's wild and theory-soaked, but the initiative is yours — keep the e-pawn supported, develop with threats, and make White prove he can survive the pressure.",
    sayShort: '…e4 — cramp White, drive the initiative.',
  },
  sources: SCH,
};
// Bc4@4 — White declines into an Italian (Bc4 Bc5).
const SCH_ITALIAN: SublineNarration = {
  intro: {
    say: "Bc4 — White sidesteps your Schliemann into a quiet Italian. No problem: …Bc5 develops the bishop to its best diagonal and you're in familiar, comfortable territory. Castle, play …d6 and …Nf6, and aim for the …d5 break — a sound, equal game where you know every plan and White has gained nothing by avoiding the fight.",
    sayShort: 'Bc4 — …Bc5, a comfy Italian.',
  },
  beats: [
    { atMove: 4, say: "Bc4 ducks the gambit into a quiet Italian — happily met. Mirror it: …Bc5 stakes your bishop on the strong a7-g1 diagonal, eye to eye with his, and you're on home ground.", sayShort: "Bc4 — answer …Bc5.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY)] },
    { atMove: 5, say: "…Bc5 trains on f2 down the same diagonal White is using. Now castle, play …d6 and …Nf6, and prepare the …d5 break — a comfortable, equal game where every plan is at your fingertips.", sayShort: "…Bc5 — eye f2, plan …d5.", arrows: [A('c5', 'f2')], highlights: [H('f2', ATK), H('d5', SOFT)] },
  ],
  sources: SCH_DEV,
};
// Nc3@4 — Four Knights (Nc3 Nf6). Symmetric, solid.
const SCH_FOUR_KNIGHTS: SublineNarration = {
  intro: {
    say: "Nc3 — White steers into a calm Four Knights instead of allowing the Schliemann. Mirror him with …Nf6 and you stand on equal, weakness-free ground. The …Bb4 pin and the …Nd4 counter wait in reserve if White drifts; until then develop in comfort. White has dodged the brawl, but you have a sound, fighting position with nothing to fear.",
    sayShort: 'Nc3 — …Nf6, easy equality.',
  },
  beats: [
    { atMove: 4, say: "Nc3 steers into a calm, symmetrical Four Knights — meet it in kind. …Nf6 mirrors the development, claims your share of the centre, and keeps the …Bb4 pin and …Nd4 counter in reserve for if White overreaches.", sayShort: "Nc3 — mirror with …Nf6.", highlights: [H('e4', KEY), H('e5', SOFT)] },
    { atMove: 5, say: "…Nf6 hits the e4-pawn and finishes mirroring White's setup — fully equal, weakness-free, and easy to play. Castle, complete development, and the position is balanced with chances for both.", sayShort: "…Nf6 — hit e4, fully equal.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: SCH_DEV,
};
// d4@4 — Scotch (d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5). Equalize with …Qe7/…Nd5.
const SCH_SCOTCH: SublineNarration = {
  intro: {
    say: "d4 — White avoids the Schliemann with the Scotch, but the book equalizer is clean and active. Trade on d4, develop with tempo by hitting e4, and after the dust settles …Qe7 leans on White's advanced e5-pawn and …Nd5 lands the knight on a dominant central blockade. Doubled c-pawns, yes — but the bishop pair and easy play hand you a fully comfortable game.",
    sayShort: 'd4 — Scotch sidestep: …exd4, equalize active.',
  },
  beats: [
    { atMove: 4, say: "d4 ducks the gambit into a Scotch — open the centre on your terms. …exd4 grabs the pawn and forces White to spend time recapturing; your pieces will flood out with tempo behind it.", sayShort: "d4 — answer …exd4.", arrows: [A('e5', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 5, say: "…exd4 — and White must retake with the knight, drifting it to d4 where it sits in the path of your coming development. The centre is opening exactly how you want it.", sayShort: "…exd4 — White must retake on d4.", arrows: [A('f3', 'd4')], highlights: [H('d4', ATK)] },
    { atMove: 7, say: "…Nf6 develops with a hit on the e4-pawn, forcing the pace. White usually relieves the pressure by trading on c6 — which only hands you the bishop pair and a half-open b-file pointing at his queenside.", sayShort: "…Nf6 — develop, strike e4.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…bxc6 recaptures toward the centre, opening the b-file for your rook and reinforcing the d5-square for the knight to come. The doubled c-pawns are a small price for the two bishops and a fluid centre.", sayShort: "…bxc6 — head for …Nd5.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 11, say: "…Qe7 leans on White's over-extended e5-pawn and eyes the open e-file; White props it with Qe2, and now you spring the knight to its dream square.", sayShort: "…Qe7 — lean on e5.", arrows: [A('e7', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 13, say: "…Nd5 lands on the perfect central blockade, screening everything and eyeing f4 and c3. With the bishop pair, the rock on d5 and effortless development, you're fully equal and pleasant to play — White's sidestep gained him nothing.", sayShort: "…Nd5 — the dream blockade.", arrows: [A('d5', 'f4')], highlights: [H('d5', KEY)] },
  ],
  sources: SCH_DEV,
};

// ── Danish Gambit (student WHITE). triggerMove is BLACK's deviation. ──
const DAN = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Danish_Gambit'];

// Main accepted lines (Bc4 …Bc5/…Nf6/…d6/…Ne5). Development lead and bishops for the pawn.
const DAN_MAIN: SublineNarration = {
  intro: {
    say: "The Danish Gambit accepted — you've fed a pawn (or two) to rip the centre open and hurl your pieces out. The bishop on c4 glares at f7, the knight on c3 eyes d5 and e4, and your development is far ahead. This is romantic attacking chess: castle, swing the rooks to the open files, and pour pressure onto Black's king before he can untangle and return the material.",
    sayShort: 'Danish — bishops and development, attack f7.',
  },
  beats: [
    { atMove: 9, say: "A pawn or two down and flying — the bishop glares at f7, the c3-knight eyes d5, your development races. Castle, swing the rooks to the open files, and storm the king before Black ever returns the material.", sayShort: "Danish — bishops and rooks, attack f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] },
  ],
  sources: DAN,
};
// …Bb4 lines (…Bb4 Nf3 d6 O-O …Bxc3/…Bg4/…Be6). Two bishops, open b-file.
const DAN_BB4: SublineNarration = {
  intro: {
    say: "Black pins with …Bb4 and may trade on c3, handing you doubled c-pawns — but look closer: bxc3 hands you a half-open b-file pointing at b7 and a monstrous pawn centre to roll forward. You keep the bishop pair and the lead in development the gambit bought. Open lines with d4-d5 or Bg5, aim the rooks at the king, and let the initiative do the work.",
    sayShort: '…Bb4 — bxc3, open b-file, two bishops.',
  },
  sources: DAN,
};

// ── Stafford Gambit (student BLACK). triggerMove is WHITE's deviation. ──
const STAF = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Stafford_Gambit'];

// Accepted (Nxc6 dxc6) + White's quiet setups. A tricky, trap-laden practical gambit.
const STAF_ACCEPTED: SublineNarration = {
  intro: {
    say: "The Stafford accepted — after …dxc6 you've traded a pawn for a flying lead in development and a board full of traps. Be honest: with accurate play White stands a little better, so this is a practical weapon, not a refutation. Bank on speed — …Bc5 and …Ng4 swarm f2, …Qd4 and …Qh4 join the hunt, and the open d- and g-files feed the attack. Set the traps and make White find every only-move.",
    sayShort: 'Stafford — fast development, swarm f2.',
  },
  beats: [
    { atMove: 7, say: "…dxc6 — you trade a pawn for a flying lead in development and a board full of traps. Bank on speed: …Bc5 and …Ng4 swarm f2, the open d- and g-files feed the attack. Set the traps and make White find every only-move.", sayShort: "…dxc6 — fast development, swarm f2.", highlights: [H('f2', KEY)] },
  ],
  sources: STAF,
};
// e5 push (Nxc6 dxc6 e5 Ne4). White grabs space; Black stays active.
const STAF_E5: SublineNarration = {
  intro: {
    say: "e5 — White lunges the pawn forward to gain space and kick your knight. Bounce to e4, a strong central outpost, and hit back with …c5 and …Bc5, keeping your pieces active and the lines toward f2 alive. White's extra pawn means little while his king sits uncastled and your development races ahead — keep generating threats and don't let the position simplify.",
    sayShort: 'e5 — …Ne4 outpost, hit back …c5.',
  },
  beats: [
    { atMove: 8, say: "e5 shoves your knight — bounce it to e4, a strong central outpost. Hit back with c5 and Bc5; White's king sits uncastled while your development races ahead.", sayShort: "e5 — …Ne4, hit back …c5.", arrows: [A('f6', 'e4')], highlights: [H('e4', KEY), H('c5', SOFT)] },
  ],
  sources: STAF,
};
// White declines the trade (Nf3 retreat or d4 hold). Black regains the pawn / gets play.
const STAF_DECLINED: SublineNarration = {
  intro: {
    say: "White sidesteps the main Stafford trade, retreating the knight or propping it with d4 rather than capturing on c6. That eases your task: …Nxe4 snatches the pawn straight back, or you develop briskly with …Bc5 and …d6 and claim full equality. Without the gambit complications White has nothing extra — finish development, keep the pieces active, and you stand at least equal.",
    sayShort: 'Declined — …Nxe4 regains, easy game.',
  },
  beats: [
    { atMove: 6, say: "White sidesteps the main trade — easy for you. Nxe4 snatches the pawn straight back, or develop briskly with Bc5 and d6 for full equality. No complications, and nothing extra for White.", sayShort: "Declined — …Nxe4 regains the pawn.", highlights: [H('e4', KEY)] },
  ],
  sources: STAF,
};
// Critical Nxf7 (forks queen and rook). White's best; Black gets partial compensation.
const STAF_CRITICAL: SublineNarration = {
  intro: {
    say: "Nxf7 — White's critical try, forking your queen and rook to win the exchange. This is the line where the Stafford is, honestly, at its thinnest: you'll be down material. But you're not without resources — the knight on f7 is loose, your development springs ahead, and …Qe7 and the open lines hand you practical compensation. Play for activity and traps, eyes open that you must fight for the draw.",
    sayShort: 'Nxf7 — down the exchange, play for tricks.',
  },
  beats: [
    { atMove: 6, say: "Nxf7 — White's critical fork wins the exchange, the Stafford at its thinnest. Take it with Kxf7, spring your development ahead, and play for activity and traps, eyes open you're fighting for the draw.", sayShort: "Nxf7 — …Kxf7, fight for it.", highlights: [H('f7', KEY)] },
  ],
  sources: STAF,
};

// ── Marshall Attack (student BLACK). triggerMove is WHITE's deviation. ──
const MAR = ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Marshall_Attack'];
const MAR_DEV = ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Marshall_Attack'];

// exd5@16 — the Marshall accepted. Sac the pawn for a kingside attack.
const MAR_MAIN: SublineNarration = {
  intro: {
    say: "exd5 — White accepts, and the Marshall is on. You've burned the e5-pawn for one of the most feared attacks in chess: …Nxd5 recaptures, then …Nf6, …Bd6, …Qh4 and …Bb7 swing every piece at White's king while the rook lifts to e6-g6 or h6. It is deeply analysed and fully sound — the initiative and the open lines are worth far more than the pawn. Attack with total conviction.",
    sayShort: 'exd5 — Marshall on: …Nxd5, storm the king.',
  },
  beats: [
    { atMove: 16, say: "exd5 — the Marshall is ON. Nxd5 recaptures, then Nf6, Bd6, Qh4 and the rook-lift swing every piece at White's king. The pawn's burned for one of chess's great attacks — go all in.", sayShort: "exd5 — …Nxd5, storm the king.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY), H('h4', SOFT)] },
  ],
  sources: MAR,
};
// a4@14 / h3@14 — the Anti-Marshall. White sidesteps the gambit.
const MAR_ANTI: SublineNarration = {
  intro: {
    say: "The Anti-Marshall — White slips in a4 or h3 to dodge your gambit before you can play …d5. No matter: …Bb7 develops the bishop to the long diagonal aimed at e4, and you transpose toward sound Zaitsev-style Ruy structures, balanced and rich. White has avoided the fireworks but conceded the initiative's edge — develop naturally and you have a rich, balanced game.",
    sayShort: 'Anti-Marshall — …Bb7, solid equality.',
  },
  beats: [
    { atMove: 14, say: "White slips in a4 or h3 to dodge your Marshall — no matter. Bb7 aims the bishop at e4 down the long diagonal, and you slide into sound Zaitsev-style structures where that long-diagonal bishop keeps a rich, balanced game.", sayShort: "Anti-Marshall — …Bb7 eyes e4.", highlights: [H('e4', KEY)] },
  ],
  sources: MAR_DEV,
};
// d3@8 / d3@10 — quiet d3 Ruy. Develop comfortably.
const MAR_D3: SublineNarration = {
  intro: {
    say: "d3 — White chooses the quiet, modern Ruy, refusing to commit the centre and sidestepping your Marshall. Develop in comfort: …d6 or …d5 in one go, …Be7 and …O-O, and the …Na5 or …Nb8-d7 reroutes to challenge the b3-bishop. There's no pressure to meet — match White's patience, claim your share of the centre, and you stand fully equal with easy piece play.",
    sayShort: 'd3 — develop, …Be7 and …O-O, equalize.',
  },
  sources: MAR_DEV,
};
// Bxc6@6 / Bxc6@10 — Exchange (delayed) Ruy. Bishop pair, structural play.
const MAR_EXCHANGE: SublineNarration = {
  intro: {
    say: "Bxc6 — White trades into an Exchange Ruy structure, swapping the strong bishop to dent your queenside pawns. Recapture with …dxc6 and you gain the bishop pair and the half-open d-file in return. The doubled c-pawns are no weakness in the middlegame; with …Bg4, …Qd6 and …f6 you keep the centre fluid and the two bishops give you the long-term trumps. A sound, fighting game.",
    sayShort: 'Bxc6 — …dxc6, bishop pair, press the centre.',
  },
  sources: MAR_DEV,
};
// Bc4@4 — White plays the Italian instead (Bc4 Bc5).
const MAR_ITALIAN: SublineNarration = {
  intro: {
    say: "Bc4 — White avoids the whole Ruy with an Italian. Comfortable for you: …Bc5 posts the bishop on its best diagonal, and you head for familiar Giuoco territory with …d6, …Nf6 and the …d5 break. Castle, develop harmoniously, and you have an equal, well-charted game — White's sidestep has handed you a sound position with every plan at your fingertips.",
    sayShort: 'Bc4 — …Bc5, a comfortable Italian.',
  },
  beats: [
    { atMove: 4, say: "Bc4 dodges into an Italian — comfortable. Mirror it: …Bc5 posts your bishop on the strong a7-g1 diagonal, eye to eye with his.", sayShort: "Bc4 — answer …Bc5.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY)] },
    { atMove: 5, say: "…Bc5 trains on f2 down the same diagonal. Now …d6, …Nf6 and the …d5 break follow — an equal, well-charted Giuoco where every plan is at your fingertips.", sayShort: "…Bc5 — eye f2, plan …d5.", arrows: [A('c5', 'f2')], highlights: [H('f2', ATK), H('d5', SOFT)] },
  ],
  sources: MAR_DEV,
};
// Nc3@4 — Four Knights (Nc3 Nf6). Symmetric, solid.
const MAR_FOUR_KNIGHTS: SublineNarration = {
  intro: {
    say: "Nc3 — White steers into a calm Four Knights. Mirror with …Nf6 and you stand on equal, weakness-free ground, with the …Bb4 pin and the …Nd4 Rubinstein counter held in reserve. White has dodged the Ruy and the Marshall, but you have a perfectly sound, fighting position — develop in comfort and there is nothing to fear.",
    sayShort: 'Nc3 — Four Knights: …Nf6, easy equality.',
  },
  beats: [
    { atMove: 4, say: "Nc3 — a calm Four Knights. Mirror it: …Nf6 claims your share of the centre, weakness-free, with the …Bb4 pin and …Nd4 Rubinstein held in reserve.", sayShort: "Nc3 — answer …Nf6.", highlights: [H('e4', KEY), H('e5', SOFT)] },
    { atMove: 5, say: "…Nf6 hits the e4-pawn and finishes mirroring White's setup — perfectly sound and easy to play. Castle, complete development, and the game is balanced with chances for both.", sayShort: "…Nf6 — hit e4, fully equal.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: MAR_DEV,
};
// d4@4 — Scotch (d4 exd4 Nxd4). Equalize with …Qe7/…Nd5.
const MAR_SCOTCH: SublineNarration = {
  intro: {
    say: "d4 — White avoids the Ruy with the Scotch. The book equalizer is clean: after the exchanges, …Qe7 leans on the advanced e5-pawn and …Nd5 plants the knight on a dominant central blockade. You accept doubled c-pawns for the bishop pair and easy development — a comfortable, fully equal game, and White's sidestep of your Marshall has cost him any edge.",
    sayShort: 'd4 — Scotch: …Qe7 and …Nd5 equalize.',
  },
  beats: [
    { atMove: 4, say: "d4 ducks into a Scotch — open the centre on your terms. …exd4 grabs the pawn and forces White to spend time recapturing; your pieces flood out with tempo behind it.", sayShort: "d4 — answer …exd4.", arrows: [A('e5', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 5, say: "…exd4 — and White must retake with the knight, drifting it to d4 right in the path of your coming development. The centre is opening exactly how you want it.", sayShort: "…exd4 — White retakes on d4.", arrows: [A('f3', 'd4')], highlights: [H('d4', ATK)] },
    { atMove: 7, say: "…Nf6 develops with a hit on the e4-pawn, forcing the pace. White usually relieves it by trading on c6 — which only hands you the bishop pair and a half-open b-file aimed at his queenside.", sayShort: "…Nf6 — develop, strike e4.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…bxc6 recaptures toward the centre, opening the b-file for your rook and reinforcing the d5-square for the knight to come. Doubled c-pawns are a small price for the two bishops and a fluid centre.", sayShort: "…bxc6 — head for …Nd5.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 11, say: "…Qe7 swings the queen out to lean on White's over-extended e5-pawn and eye the open e-file; White props it with Qe2, and now you spring the knight to its dream square.", sayShort: "…Qe7 — lean on e5.", arrows: [A('e7', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 13, say: "…Nd5 lands on the perfect central blockade, screening everything and eyeing f4 and c3. With the bishop pair, the rock on d5 and effortless development, you're fully equal and pleasant to play.", sayShort: "…Nd5 — the dream blockade.", arrows: [A('d5', 'f4')], highlights: [H('d5', KEY)] },
  ],
  sources: MAR_DEV,
};

// ════════════════════════════════════════════════════════════════════════════
// COVERAGE COMPLETION — every remaining course-subline of the Group-A openings,
// authored to the full bar (lead with the deviation move, second person, a
// talk-and-point beat, board-verified). These keys override the base map's
// older entries (this file is spread AFTER the base in MERGED_NARRATION).
// ════════════════════════════════════════════════════════════════════════════

// ── Ruy Lopez (student WHITE) ──
const COV_RUY_NA5: SublineNarration = {
  intro: {
    say: "…Na5 — the Chigorin: Black's knight chases your prized light-squared bishop off the a2-g8 diagonal. Don't allow the trade — slide it back to c2, where it eyes Black's king on the b1-h7 road while you roll d4 and seize the centre. The a5-knight sulks offside on the rim.",
    sayShort: "…Na5 — keep the bishop, Bc2.",
  },
  beats: [
    { atMove: 15, say: "Na5 lunges at your bishop — refuse the swap. Bc2 keeps it alive, re-aimed at Black's kingside, and after d4 your big centre rolls while the rim-knight on a5 does nothing useful.", sayShort: "Bc2 — save the bishop.", arrows: [A('b3', 'c2')], highlights: [H('c2', KEY), H('a5', SOFT)] },
  ],
  sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};
const COV_RUY_BE7: SublineNarration = {
  intro: {
    say: "…Be7 — the main Closed Ruy: Black develops solidly and tucks the king away. Take your time and build: Re1 props the e4-pawn, then c3 and d4 raise the broad centre while the a4-bishop keeps a long-range bind on c6. Slow, rich, and pleasant — the classical Spanish squeeze is yours.",
    sayShort: "…Be7 — Re1, back the centre.",
  },
  beats: [
    { atMove: 9, say: "Be7 finishes Black's setup — now claim the centre. Re1 backs the e4-pawn so c3 and d4 can follow, and your a4-bishop keeps leaning on c6 the whole time.", sayShort: "Re1 — back e4, prep d4.", arrows: [A('f1', 'e1')], highlights: [H('e1', KEY), H('e4', SOFT)] },
  ],
  sources: ['book:ruy-lopez', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};
const COV_RUY_A6: SublineNarration = {
  intro: {
    say: "…a6 — the Morphy Defence, by far Black's most popular try: he puts the question to your bishop at once. Retreat to a4, keeping the pin on the a4-e8 diagonal so the c6-knight stays tied down; you castle, play c3 and d4, and steer into the main Closed Ruy with a comfortable, lasting initiative.",
    sayShort: "…a6 — Ba4, hold the pin.",
  },
  beats: [
    { atMove: 6, say: "a6 pokes the bishop — don't surrender the pin. Ba4 keeps the clamp on c6 along the a4-e8 road, so Black can't free his game easily while you prepare c3 and d4.", sayShort: "Ba4 — keep the c6 pin.", arrows: [A('a4', 'c6')], highlights: [H('c6', KEY)] },
  ],
  sources: ['book:ruy-lopez', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};
const COV_RUY_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black shores up e5 quietly instead of grabbing space with …b5. That's a touch passive: build the classic centre with c3 and d4, keep the a4-bishop trained on c6, and you enjoy more room and the freer pieces in a calm, risk-free Spanish.",
    sayShort: "…d6 — prep c3 and d4.",
  },
  beats: [
    { atMove: 11, say: "d6 props up e5 but cedes you space — take the centre. c3 then d4 builds the broad pawn duo, while your a4-bishop keeps the long bind on c6 and Black stays cramped.", sayShort: "c3 and d4 — take the centre.", arrows: [A('a4', 'c6')], highlights: [H('d4', KEY)] },
  ],
  sources: ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};
const COV_RUY_BXC6: SublineNarration = {
  intro: {
    say: "…bxc6 — the Exchange Ruy, Black recapturing toward the centre. He keeps a half-open b-file, but you've handed him doubled c-pawns against your clean kingside pawn majority. Castle, play d4 to trade pieces, and steer toward an endgame where that healthy 4-against-3 majority is a real, nagging edge.",
    sayShort: "…bxc6 — castle, aim for d4.",
  },
  beats: [
    { atMove: 8, say: "bxc6 doubles Black's c-pawns — the long-term trump is yours. Castle, then d4 to open and trade down toward the ending, where your healthy kingside majority outweighs his crippled queenside.", sayShort: "Re1 — play for d4.", arrows: [A('f1', 'e1')], highlights: [H('c6', SOFT), H('c7', SOFT), H('d4', KEY)] },
  ],
  sources: ['book:ruy-lopez', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Ruy_Lopez'],
};

// ── Italian Game (student WHITE) ──
const COV_IT_D6: SublineNarration = {
  intro: {
    say: "…d6 — the Giuoco Pianissimo, Black settling in for a slow game. Don't drift: prepare the d4 break, keep your Bc4 aimed at f7, and reroute with Nbd2-f1-g3 in the classic Italian buildup. With the central lever in hand you press a small, durable pull.",
    sayShort: "…d6 — break with d4.",
  },
  beats: [
    { atMove: 7, say: "d6 closes the centre for now — your job is to crack it open. The d4 break is the lever, and the c4-bishop's stare down the a2-g8 diagonal keeps f7 a permanent worry for Black.", sayShort: "d4 — open it, hit f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
  ],
  sources: ['book:italian-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'],
};
const COV_IT_NF6: SublineNarration = {
  intro: {
    say: "…Nf6 — the Two Knights, Black's sharpest reply, hitting your e4-pawn and inviting a brawl. You choose the battleground: the swashbuckling Ng5 lunging straight at f7, or the principled d4 break blowing the centre open. Either way the c4-bishop already glares at f7 — meet the fight head-on.",
    sayShort: "…Nf6 — Ng5 or d4 at f7.",
  },
  beats: [
    { atMove: 5, say: "Nf6 strikes e4 and dares you forward. Ng5 jumps at f7 while the c4-bishop joins the assault on the same square — or play d4 to rip the centre. Pick your weapon; both aim at f7.", sayShort: "Ng5 and Bc4 — hit f7.", arrows: [A('f3', 'g5'), A('c4', 'f7')], highlights: [H('f7', KEY)] },
  ],
  sources: ['book:italian-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Italian_Game'],
};

// ── Two Knights Defence (student BLACK) ──
const COV_TK_BB5: SublineNarration = {
  intro: {
    say: "Bb5 — White swerves out of the Two Knights and into a Ruy Lopez. Nothing to fear: put the question with …a6, and after Ba4 …Nf6 you're in familiar, well-charted Spanish territory. Keep the bishop guessing, eye the …Nxe4 and …b5 breaks, and play for the fully sound counter-chances Black gets in the Ruy.",
    sayShort: "Bb5 — it's a Ruy: …a6.",
  },
  beats: [
    { atMove: 7, say: "Bb5 makes it a Ruy — so play like it. …Nf6 already leans on the e4-pawn, the way Black fights for the initiative in the Open Spanish; develop fast, ask the bishop with …b5, and the position is balanced and rich.", sayShort: "…Nf6 — hit the e4-pawn.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: ['book:two-knights-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'],
};

// ── Four Knights Game (student WHITE) ──
const COV_FK_ND4: SublineNarration = {
  intro: {
    say: "…Nd4 — the Rubinstein, Black's sharpest Four Knights try: he ignores the hit on c6 and jumps into your camp. The clean reply is Nxd4 exd4, when Black's recaptured pawn lands on d4 as a long-term target and you hold the easier game; if you'd rather keep pieces on, Ba4 or Bc4 also leaves you a small, safe pull. No tricks to fear.",
    sayShort: "…Nd4 — trade with Nxd4.",
  },
  beats: [
    { atMove: 7, say: "Nd4 leaps in expecting tricks — just trade it off. Nxd4 exd4 leaves that black pawn on d4 as a target you'll round up later, and your development flows while Black untangles.", sayShort: "Nxd4 — make d4 a target.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY)] },
  ],
  sources: ['book:four-knights-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
};
const COV_FK_BG4: SublineNarration = {
  intro: {
    say: "…Bg4 — Black pins your f3-knight in the fianchetto Four Knights. Break the pin with tempo: h3 puts the question, and whether he takes or retreats you follow with Nd5, planting a knight on the central outpost. With the g2-bishop raking the long diagonal you keep a comfortable, harmonious game.",
    sayShort: "…Bg4 — h3, then Nd5.",
  },
  beats: [
    { atMove: 11, say: "Bg4 pins the f3-knight to your queen — meet it calmly. After h3 questions the bishop, the c3-knight springs to d5, a dominating outpost, while your fianchettoed bishop keeps watching the long light diagonal.", sayShort: "Nd5 — leap to the outpost.", arrows: [A('c3', 'd5')], highlights: [H('f3', SOFT), H('d5', KEY)] },
  ],
  sources: ['book:four-knights-game', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Four_Knights_Game'],
};

// ── Scotch Game (student WHITE) ──
const COV_SC_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black declines the Scotch tension and props up e5 passively instead of taking on d4. Make him pay for the meekness: Bb5 pins the c6-knight, your d4-and-e4 pawns command the centre, and with a clean space edge and faster development you press a comfortable, risk-free pull.",
    sayShort: "…d6 — pin with Bb5.",
  },
  beats: [
    { atMove: 6, say: "…d6 keeps the centre rigid and passive — punish it. Bb5 pins the c6-knight while your d4-e4 duo dominates the middle and Black is left cramped.", sayShort: "Bb5 — pin, keep the duo.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('d4', SOFT), H('e4', SOFT)] },
    { atMove: 7, say: "…Bd7 breaks the pin, but you keep the central duo and the space edge. Trade or retreat the bishop, castle, and press the freer, roomier game while Black stays passive.", sayShort: "…Bd7 — keep space, press on.", highlights: [H('d4', SOFT), H('e4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scotch_Game'],
};

// ── Vienna Game (student WHITE) ──
const COV_VN_GAMBIT_OO: SublineNarration = {
  intro: {
    say: "…O-O — Black castles into the Vienna Gambit tabiya. You gave the f-pawn for a roaring lead in development and a half-open f-file pointed at Black's king. Pour it on: develop the dark-squared bishop with menace, swing a rook to the f-file, and let the cramping e5-pawn choke Black while your pieces attack.",
    sayShort: "…O-O — storm the f-file.",
  },
  beats: [
    { atMove: 13, say: "O-O tucks Black's king away — now you hunt it. Bg5 develops with menace, pinning and pressuring the kingside, and the f-file plus the cramping e5-pawn give your attack all the fuel it needs.", sayShort: "Bg5 — develop with menace.", arrows: [A('c1', 'g5')], highlights: [H('f7', ATK), H('e5', KEY)] },
  ],
  sources: ['book:vienna-game', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
};
const COV_VN_H6: SublineNarration = {
  intro: {
    say: "…h6 — a quiet, useful luft that stops your Bg5 and Ng5 pins before they start. Nothing forcing here, so out-build him: jump the knight to the d5 outpost or prepare the c3-and-d4 central break, keep the Bc4 trained on f7, and play a rich Italian-style middlegame with the freer game.",
    sayShort: "…h6 — knight to d5.",
  },
  beats: [
    { atMove: 11, say: "h6 makes a quiet luft but doesn't fight for the centre — so seize it. The c3-knight heads to the d5 outpost, dominating the board, while your Bc4 keeps one eye fixed on f7.", sayShort: "Nd5 — grab the outpost.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] },
  ],
  sources: ['book:vienna-game', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Vienna_Game'],
};

// ── Petrov Defence (student BLACK) ──
const COV_PT_OO: SublineNarration = {
  intro: {
    say: "O-O — White castles in the Petrov main line, and your position is a fortress built on pure symmetry. Trade on e5 with …Nxe5: your e4-knight stays rock-solid, you develop the bishop toward d6, and you reach a dead-level middlegame with no weakness for White to bite on.",
    sayShort: "O-O — recapture with …Nxe5.",
  },
  beats: [
    { atMove: 10, say: "White castles, but the Petrov gives nothing away. …Nxe5 restores the balance, your knight on e4 sits proud in the centre, and after …Bd6 you're solid as granite with everything defended.", sayShort: "…Nxe5 — win the pawn back.", arrows: [A('d7', 'e5')], highlights: [H('e5', ATK), H('e4', KEY)] },
  ],
  sources: ['book:petrov-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
};
const COV_PT_BC4: SublineNarration = {
  intro: {
    say: "Bc4+ — the Cochrane bite: White checks to justify the knight he sacrificed on f7. Block with …d5 — your f6-knight guards the pawn, the check fizzles, and you simply keep the extra piece. Tuck the king to safety, untangle, and convert; White's two pawns aren't nearly enough for the material.",
    sayShort: "Bc4+ — block with …d5.",
  },
  beats: [
    { atMove: 11, say: "Bc4+ tries to make the sacrifice work — calmly block. …d5 interposes, and because the f6-knight defends it the check leads nowhere; you stay up a clean piece and just need to bring the king to safety and trade down.", sayShort: "…d5 — the f6-knight guards it.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY), H('f7', SOFT)] },
  ],
  sources: ['book:petrov-defence', 'concept:tac-sacrifice', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
};

// ── Philidor Defence (student BLACK) ──
const COV_PH_RE1: SublineNarration = {
  intro: {
    say: "Re1 — the Philidor main tabiya; White piles on the e-file behind his big centre and you're solid but cramped. Free it with patience: play …c6 and …Qc7 first, then strike with …exd4 and aim for the …d5 break to blow the centre open. Played accurately, the cramp dissolves into a fully sound game.",
    sayShort: "Re1 — free it with …d5.",
  },
  beats: [
    { atMove: 12, say: "Re1 stacks the e-file on your centre — answer with timing, not panic. Prepare with …c6 and …Qc7, then …exd4 opens lines and the …d5 break is the freeing blow that equalizes the position.", sayShort: "…exd4 then …d5 — break free.", arrows: [A('e5', 'd4')], highlights: [H('d5', KEY), H('c6', SOFT)] },
  ],
  sources: ['book:philidor-defence', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
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
  'ruy-lopez::0::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 13, say: "O-O — Black completes the main-line Closed Ruy. Now the great Spanish build-up: c3 to prepare d4, then the knight tour Nbd2-f1-g3 swinging at the kingside. You play for a slow central clamp and the easier side of chess's richest middlegame.", sayShort: "O-O — c3, d4, the knight tour.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::1::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 13, say: "O-O — Black completes the main-line Closed Ruy. Now the great Spanish build-up: c3 to prepare d4, then the knight tour Nbd2-f1-g3 swinging at the kingside. You play for a slow central clamp and the easier side of chess's richest middlegame.", sayShort: "O-O — c3, d4, the knight tour.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::2::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 13, say: "O-O — Black completes the main-line Closed Ruy. Now the great Spanish build-up: c3 to prepare d4, then the knight tour Nbd2-f1-g3 swinging at the kingside. You play for a slow central clamp and the easier side of chess's richest middlegame.", sayShort: "O-O — c3, d4, the knight tour.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::0::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 11, say: "O-O — Black castles a move early. Nothing changes: c3 and d4 build the centre, Bc2 keeps the bishop on the a2-g8 diagonal, and the Nbd2-f1-g3 tour heads for the king. Take the space and the initiative.", sayShort: "O-O — c3 and d4, standard plan.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::1::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 11, say: "O-O — Black castles a move early. Nothing changes: c3 and d4 build the centre, Bc2 keeps the bishop on the a2-g8 diagonal, and the Nbd2-f1-g3 tour heads for the king. Take the space and the initiative.", sayShort: "O-O — c3 and d4, standard plan.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::2::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 11, say: "O-O — Black castles a move early. Nothing changes: c3 and d4 build the centre, Bc2 keeps the bishop on the a2-g8 diagonal, and the Nbd2-f1-g3 tour heads for the king. Take the space and the initiative.", sayShort: "O-O — c3 and d4, standard plan.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::5::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 11, say: "O-O — Black castles a move early. Nothing changes: c3 and d4 build the centre, Bc2 keeps the bishop on the a2-g8 diagonal, and the Nbd2-f1-g3 tour heads for the king. Take the space and the initiative.", sayShort: "O-O — c3 and d4, standard plan.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::6::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 11, say: "O-O — Black castles a move early. Nothing changes: c3 and d4 build the centre, Bc2 keeps the bishop on the a2-g8 diagonal, and the Nbd2-f1-g3 tour heads for the king. Take the space and the initiative.", sayShort: "O-O — c3 and d4, standard plan.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::5::d6@13': { ...RUY_CLOSED_D6, beats: [{ atMove: 13, say: "d6 props e5 in classic Closed-Ruy style. Your recipe is unhurried: c3 and d4 for the centre, Bc2 to keep the bishop on the b1-h7 diagonal, and the knight tour to the kingside. Solid but passive for Black — you own the space.", sayShort: "d6 — c3, d4, clamp the centre.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::6::d6@13': { ...RUY_CLOSED_D6, beats: [{ atMove: 13, say: "d6 props e5 in classic Closed-Ruy style. Your recipe is unhurried: c3 and d4 for the centre, Bc2 to keep the bishop on the b1-h7 diagonal, and the knight tour to the kingside. Solid but passive for Black — you own the space.", sayShort: "d6 — c3, d4, clamp the centre.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::5::d6@15': { ...RUY_CLOSED_D6, beats: [{ atMove: 15, say: "d6 — Black bolsters e5 with the centre already prepared. Now play d4! the thematic break, and after the tension you reach the rich Closed-Ruy middlegame with more space. Route the knight Nbd2-f1-g3 toward the king.", sayShort: "d6 — play d4, the main break.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::7::d6@15': { ...RUY_CLOSED_D6, beats: [{ atMove: 15, say: "d6 in the modern d3 Ruy — a slow maneuvering game. Reroute the knights toward d5 and the kingside, prepare the d4 break or a kingside expansion, and nurse the small, lasting space edge. Patience is the plan.", sayShort: "d6 — slow Ruy: reroute, then d4.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::0::d6@11': { ...RUY_CLOSED_D6, beats: [{ atMove: 11, say: "d6 props e5 early in the Closed Ruy. Same patient recipe: c3 and d4 for the big centre, Bc2 to keep the bishop on the b1-h7 road, and the knight tour to the kingside. A touch cramped for Black; the space is yours.", sayShort: "d6 — c3, d4, route the knight.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::1::d6@11': { ...RUY_CLOSED_D6, beats: [{ atMove: 11, say: "d6 props e5 early in the Closed Ruy. Same patient recipe: c3 and d4 for the big centre, Bc2 to keep the bishop on the b1-h7 road, and the knight tour to the kingside. A touch cramped for Black; the space is yours.", sayShort: "d6 — c3, d4, route the knight.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::2::d6@11': { ...RUY_CLOSED_D6, beats: [{ atMove: 11, say: "d6 props e5 early in the Closed Ruy. Same patient recipe: c3 and d4 for the big centre, Bc2 to keep the bishop on the b1-h7 road, and the knight tour to the kingside. A touch cramped for Black; the space is yours.", sayShort: "d6 — c3, d4, route the knight.", highlights: [H('d4', KEY)] }] },
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
  'ruy-lopez::7::Bc5@11': { ...RUY_MOLLER, beats: [{ atMove: 11, say: "Bc5 — the Møller, the bishop on its most active diagonal aimed at f2. Meet it: c3 prepares d4, and as the centre rolls forward you hit the bishop with tempo. Black's piece is busy and a little loose; take the centre and the better coordination.", sayShort: "Bc5 — c3, d4, gain tempo.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY), H('f2', SOFT)] }] },
  'ruy-lopez::7::Bc5@13': { ...RUY_MOLLER, beats: [{ atMove: 13, say: "Bc5 — the active Møller bishop, aimed at f2 alongside the b7-bishop on the long diagonal. Brace with c3 and Nbd2, prepare d4, and hit the c5-bishop with tempo when the centre advances. You keep the space and the steadier game.", sayShort: "Bc5 — c3 and Nbd2, then d4.", arrows: [A('b3', 'f7')], highlights: [H('d4', KEY), H('f2', SOFT)] }] },
  'ruy-lopez::6::Bc5@9': { ...RUY_BC5_EARLY, beats: [{ atMove: 9, say: "Bc5 — Black posts the bishop actively early instead of …Be7. Make the move-order cost: c3 readies d4, and when the centre rolls you hit the bishop with tempo. The pretty bishop is the piece you'll be chasing while you build.", sayShort: "Bc5 — c3 and d4, gain tempo.", highlights: [H('d4', KEY), H('f2', SOFT)] }] },
  'ruy-lopez::7::Bc5@9': { ...RUY_BC5_EARLY, beats: [{ atMove: 9, say: "Bc5 — Black posts the bishop actively early instead of …Be7. Make the move-order cost: c3 readies d4, and when the centre rolls you hit the bishop with tempo. The pretty bishop is the piece you'll be chasing while you build.", sayShort: "Bc5 — c3 and d4, gain tempo.", highlights: [H('d4', KEY), H('f2', SOFT)] }] },
  'ruy-lopez::4::Bc5@7': { ...RUY_BC5_EARLY, beats: [{ atMove: 7, say: "Bc5 — Black develops actively in the Berlin-Italian hybrid. Strike the centre: c3 and d4 challenge at once, and the c5-bishop gets hit with tempo as the pawns advance. You take the space and the initiative.", sayShort: "Bc5 — c3 and d4 with tempo.", highlights: [H('d4', KEY), H('f2', SOFT)] }] },
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
  'ruy-lopez::3::exd4@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 13, say: "exd4 — Black opens the centre in the Open Ruy. Recapture and your initiative flows: Re1 hits the e4-knight, the open d- and e-files feed your rooks, and Black's straggling queenside is the chronic target. Regain the pawn and press.", sayShort: "exd4 — Re1, regain and press.", arrows: [A('b3', 'f7')], highlights: [H('e4', KEY), H('d4', SOFT)] }] },
  'ruy-lopez::3::d6@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 13, say: "d6 props the Open-Ruy knight on e4. Keep the pressure: dxe5 or Nbd2 hits the e4-knight, the open lines favour your rooks, and Black's loose queenside is the target. Develop, and the structure tells.", sayShort: "d6 — hit the e4-knight, press.", arrows: [A('b3', 'f7')], highlights: [H('e4', KEY)] }] },
  'ruy-lopez::3::Be7@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 13, say: "Be7 develops in the Open Ruy. Round up the extra pawn: Re1 and Nbd2 challenge the e4-knight, and the open centre plus Black's weak queenside hand you the better game. Regain the material and squeeze.", sayShort: "Be7 — Re1 and Nbd2, regain it.", arrows: [A('b3', 'f7')], highlights: [H('e4', KEY)] }] },
  'ruy-lopez::3::Nxd4@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 13, say: "Nxd4 trades in the centre — recapture Nxd4 and your pieces dominate: the d4-knight is strong, Re1 eyes the e4-knight, and Black's loosened queenside is the long-term weakness. The structure favours you.", sayShort: "Nxd4 — recapture, dominate the centre.", arrows: [A('f3', 'd4')], highlights: [H('e4', KEY), H('d4', SOFT)] }] },
  'ruy-lopez::3::Bc5@15': { ...RUY_OPEN_DEEP, beats: [{ atMove: 15, say: "Bc5 — the active Open-Ruy bishop. With e5 cramping and Re1 lining the e-file, develop Nbd2 and Bc2, target the e4-knight, and lean on Black's loose queenside. The freer structure is yours.", sayShort: "Bc5 — target e4, press queenside.", highlights: [H('e4', KEY)] }] },
  'ruy-lopez::4::Be7@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 19, say: "Be7 — the Berlin Wall is up, queens long gone. A positional grind: your clean kingside majority can make a passer, Black's doubled c-pawns never will. Clamp with Bf4 and Nc3, restrain the bishop pair, and squeeze the long endgame.", sayShort: "Be7 — grind the better majority.", highlights: [H('e5', KEY)] }] },
  'ruy-lopez::4::Be6@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 19, say: "Be6 — Black develops in the Berlin endgame. Your edge is structural: the healthy kingside majority versus Black's crippled doubled c-pawns. Bf4, Rad1 and Ne2-g3 improve your pieces; trade pieces and roll the majority toward a passed pawn.", sayShort: "Be6 — improve, roll the majority.", highlights: [H('e5', KEY)] }] },
  'ruy-lopez::4::h6@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 19, say: "h6 — a useful luft in the Berlin endgame. Press your trump: the clean kingside majority. Bf4 clamps the dark squares, the knight reroutes to g3, and you grind Black's doubled c-pawns in the long, queenless game.", sayShort: "h6 — clamp Bf4, grind the majority.", highlights: [H('e5', KEY)] }] },
  'ruy-lopez::4::Nc4@13': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 13, say: "Nc4 — the knight hops to c4, but it's no fortress. Develop with Nc3 and Bf4 hitting the dark squares; you'll trade into the endgame where your healthy kingside majority and Black's doubled c-pawns decide. The grind favours you.", sayShort: "Nc4 — Nc3, Bf4, grind it.", highlights: [H('c4', KEY), H('e5', SOFT)] }] },
  'ruy-lopez::4::bxc6@11': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 11, say: "bxc6 — Black recaptures with the b-pawn, keeping a compact mass but conceding the bishop pair. Steer for the endgame: dxe5 and the queen trade, then your clean structure and the better pawns grind Black down. Trade and squeeze.", sayShort: "bxc6 — trade down, squeeze.", highlights: [H('c6', KEY)] }] },
  'ruy-lopez::4::Be7@9': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 9, say: "Be7 — Black develops in the Berlin's open lines. You're heading for the famous endgame: Bxc6 and dxe5 win the bishop pair and a healthy structure. Trade into the queenless middlegame and grind the doubled c-pawns.", sayShort: "Be7 — Bxc6, head for the endgame.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] }] },
  'ruy-lopez::4::d6@7': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 7, say: "d6 props e5 in the Berlin — a solid, slightly passive choice. Build with Re1, c3 and d4 for the centre, or Bxc6 to damage the structure. You hold the space and the easier game; squeeze the cramped position.", sayShort: "d6 — Re1, c3, d4, squeeze.", arrows: [A('b5', 'c6')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::8::Bc5@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 13, say: "Bc5 hits your d4-knight — sidestep with Nb3 or Be3, keeping your trump intact: the clean four-against-three kingside majority. Black's bishop pair is compensation, but trade pieces and steer for the endgame where the healthier pawns decide.", sayShort: "Bc5 — Nb3, keep the majority.", arrows: [A('d4', 'b3')], highlights: [H('d4', KEY)] }] },
  'ruy-lopez::8::Bd6@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 13, say: "Bd6 develops toward the kingside. Keep your eye on the prize: the healthy kingside majority that can roll to a passed pawn, against Black's worthless extra queenside pawn. Trade pieces, simplify, and grind the structural edge — Fischer's way.", sayShort: "Bd6 — trade down, roll the majority.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::8::Bd6@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 17, say: "Bd6 — queens are off, the endgame is here. Your kingside majority is the trump: it can manufacture a passed pawn, Black's doubled c-pawns cannot. Centralise the rook, trade minor pieces, and roll the healthy pawns home.", sayShort: "Bd6 — endgame: roll the majority.", highlights: [H('d1', KEY)] }] },
  'ruy-lopez::8::Bd7@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 13, say: "Bd7 develops the bishop modestly. Steer toward the endgame: trade pieces and your clean kingside majority outweighs Black's bishop pair and doubled c-pawns. Simplify, keep the structure, and grind the better pawns to a win.", sayShort: "Bd7 — simplify, grind the majority.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::8::Bd7@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 17, say: "Bd7 — in the queenless endgame your path is clear. The kingside four-against-three can make a passer; Black's doubled c-pawns cannot. Bring the rook to the open d-file, trade minors, and convert the structural edge.", sayShort: "Bd7 — open d-file, convert.", highlights: [H('d1', KEY)] }] },
  'ruy-lopez::8::Be6@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 17, say: "Be6 develops in the endgame, eyeing your queenside. No matter: your kingside majority is the long-term winner. Trade the light bishops if you can, centralise the rook, and march the healthy pawns while Black's doubled c-pawns sit useless.", sayShort: "Be6 — centralise, march the pawns.", highlights: [H('d1', KEY)] }] },
  'ruy-lopez::8::Ne7@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 13, say: "Ne7 reroutes toward g6 or f5. Keep your structural trump front of mind: the clean kingside majority versus Black's crippled queenside. Trade pieces, simplify into the endgame, and the healthier pawns carry the day.", sayShort: "Ne7 — simplify, win the endgame.", highlights: [H('d4', KEY)] }] },
  'ruy-lopez::5::e4@17': RUY_MARSHALL_E4,

  // ── Italian Game ──
  'italian-game::4::Bc5@5': IT_GP_BC5,
  'italian-game::5::Bc5@5': IT_GP_BC5,
  'italian-game::1::Nf6@5': IT_TWO_KNIGHTS,
  'italian-game::4::Nf6@5': IT_TWO_KNIGHTS,
  'italian-game::2::Be7@5': IT_HUNGARIAN,
  'italian-game::3::Be7@5': IT_HUNGARIAN,
  'italian-game::2::O-O@9': { ...IT_PIANISSIMO, beats: [{ atMove: 9, say: "O-O — both sides settle into the quiet Pianissimo. Play the modern plan: a3 and c3 to prepare a clamping b4 or d4, the Nbd2-f1-g3 tour to the kingside, and Re1 behind the e-pawn. Tiny, lasting space is the whole game.", sayShort: "O-O — a3, c3, the knight tour.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::2::a6@13': { ...IT_PIANISSIMO, beats: [{ atMove: 13, say: "a6 — a slow move; you've already built the ideal Pianissimo. Now expand: d4 challenges the centre, or Nbd2-f1-g3 swings the knight kingside. Your small, lasting space edge is the asset — improve and break when set.", sayShort: "a6 — break d4, route the knight.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::2::a6@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "a6 — Black marks time. Continue the build: O-O, Re1, Nbd2-f1-g3, and prepare the d4 break. The Pianissimo is a patient squeeze; nurse the space and strike the centre at the right moment.", sayShort: "a6 — build, then break d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::2::a6@9': { ...IT_PIANISSIMO, beats: [{ atMove: 9, say: "a6 — Black slips in a waiting move. Press on: c3 and a3 ready the b4 and d4 breaks, the knight tours toward the kingside, and Re1 backs the e-pawn. Out-manoeuvre from your small, durable space edge.", sayShort: "a6 — c3, a3, then d4 or b4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::2::a5@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "a5 — Black halts your b4 break. No matter: switch to d4, or the Nbd2-f1-g3 reroute and a kingside expansion. The a5-push loosens b5 for your knight; nurse the space and break in the centre instead.", sayShort: "a5 — break d4, use the b5 hole.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('b5', SOFT)] }] },
  'italian-game::2::h6@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "h6 — a useful luft. Keep building: O-O, Re1, the Nbd2-f1-g3 tour, and prepare d4. The Pianissimo rewards patience; improve every piece and strike the centre when the moment is right.", sayShort: "h6 — build slowly, then d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::2::d6@7': { ...IT_PIANISSIMO, beats: [{ atMove: 7, say: "d6 — Black props e5 in the quiet line. Build the modern Italian: O-O, c3 and a3 toward the b4 and d4 breaks, the knight tour to the kingside. Patient maneuvering where your small space edge is the whole game.", sayShort: "d6 — c3, a3, the slow squeeze.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::0::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::1::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::6::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::2::Bb6@11': IT_PIANISSIMO_BB6,
  'italian-game::0::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::6::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::0::O-O@13': IT_GRECO_OO,
  'italian-game::6::O-O@13': IT_GRECO_OO,
  'italian-game::0::d6@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 13, say: "d6 challenges your big centre — don't let it be undermined cheaply. Hold the duo with d5 or Bg5 and a-pawn ideas, and keep developing. The centre is your engine; protect it, then advance it at Black's king.", sayShort: "d6 — defend the centre, then advance.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('d5', SOFT)] }] },
  'italian-game::6::d6@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 13, say: "d6 challenges your big centre — don't let it be undermined cheaply. Hold the duo with d5 or Bg5 and a-pawn ideas, and keep developing. The centre is your engine; protect it, then advance it at Black's king.", sayShort: "d6 — defend the centre, then advance.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('d5', SOFT)] }] },
  'italian-game::0::d5@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 13, say: "d5 strikes back in the centre — meet it with e5, clamping and gaining space, or exd5 to keep the lines open. Your broad centre and the bishop trained on f7 keep the initiative; advance the pawns at the king.", sayShort: "d5 — answer e5, clamp the centre.", highlights: [H('e5', KEY), H('d5', SOFT)] }] },
  'italian-game::6::d5@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 13, say: "d5 strikes back in the centre — meet it with e5, clamping and gaining space, or exd5 to keep the lines open. Your broad centre and the bishop trained on f7 keep the initiative; advance the pawns at the king.", sayShort: "d5 — answer e5, clamp the centre.", highlights: [H('e5', KEY), H('d5', SOFT)] }] },
  'italian-game::0::Nxc3@15': IT_MOLLER,
  'italian-game::6::Bxc3@15': IT_MOLLER,
  'italian-game::1::O-O@15': IT_BD2_QUIET,
  'italian-game::1::Nce7@19': { ...IT_BD2_FREEING, beats: [{ atMove: 19, say: "Nce7 reroutes the knight to blockade your isolated d-pawn — the book equalizing method. Don't drift: Qb3 and the rooks pressure d5 and f7, and probe the kingside before the blockade sets. The win is made — keep the initiative.", sayShort: "Nce7 — Qb3, press before the blockade.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
  'italian-game::1::Na5@23': { ...IT_BD2_FREEING, beats: [{ atMove: 23, say: "Na5 hits your queen again, shuffling for the draw — sidestep and keep pressing. The bishop and queen eye f7 and d5, the isolated pawn is dynamic not weak, and you hold the freer game. Avoid the repetition and play for more.", sayShort: "Na5 — keep pressing, avoid the draw.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
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
  'italian-game::3::Ne5@17': { ...IT_EVANS_DEEP, beats: [{ atMove: 17, say: "Ne5 — Black's knight jumps to the centre, but your pawns dominate. The broad d4-e4-d5 wedge cramps Black while f4 or the rooks open lines at the king. The gambit pawn is a memory; convert the space and initiative.", sayShort: "Ne5 — dominate the centre, open lines.", highlights: [H('d5', KEY)] }] },
  'italian-game::3::Bg4@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 15, say: "Bg4 pins your f3-knight — no bother. Your centre and development overwhelm: Be2 or h3 breaks the pin, the rooks pour onto the open files, and the bishops rake Black's king. A pawn down and crushing.", sayShort: "Bg4 — break the pin, attack.", arrows: [A('c4', 'f7')], highlights: [H('f3', KEY)] }] },
  'italian-game::3::Nf6@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 15, say: "Nf6 develops against your big centre — keep building. The d4-e4 duo cramps, d5 or e5 advances at the king, and Ba3 and the rooks join. Your lead in development and space are full value for the pawn.", sayShort: "Nf6 — advance the centre, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::3::Nce7@17': { ...IT_EVANS_DEEP, beats: [{ atMove: 17, say: "Nce7 reroutes under your space-grabbing d5-push. Your wedge dominates: cramp Black, swing the rooks to the open files, and break with f4 or e5 at the king. The pawn is irrelevant against this initiative.", sayShort: "Nce7 — dominate, break at the king.", highlights: [H('d5', KEY)] }] },
  'italian-game::3::Nge7@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 15, say: "Nge7 develops passively under your big centre. Roll on: d5 cramps further, Ba3 hits the king, and the rooks pour onto the open files. Black is curled up; convert the space and the lead in development.", sayShort: "Nge7 — roll d5, pour it on.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::3::h6@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 15, say: "h6 — a luft under your dominating centre. Press regardless: d5 grabs more space, Ba3 rakes the king, and the rooks swing to the open files. The gambit pawn buys an attack that rolls on — develop with threats.", sayShort: "h6 — push d5, keep attacking.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::3::Bd7@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 15, say: "Bd7 develops modestly — your centre and pieces dominate. d5 cramps, Ba3 hits the king, the rooks own the open files. A pawn down and crushing; keep developing toward Black's monarch.", sayShort: "Bd7 — d5, Ba3, crush.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::4::exd4@7': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 7, say: "exd4 — Black opens the centre in the passive Hungarian. Recapture and develop with the freer hand: your pieces flow to active squares, you castle, and the extra space squeezes Black's cramped, counterplay-free position.", sayShort: "exd4 — recapture, squeeze the space.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'italian-game::4::dxe5@9': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 9, say: "dxe5 — Black recaptures, the centre simplifies. You stand pleasantly: the d-file is half-open for your rook, the bishop eyes f7, and your slightly freer pieces give a nagging pull. Trade into a comfortable edge.", sayShort: "dxe5 — half-open d-file, press.", arrows: [A('c4', 'f7')], highlights: [H('e5', KEY)] }] },
  'italian-game::4::Bg4@9': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 9, say: "Bg4 pins the f3-knight but lets you keep the e5-pawn. Hold the extra pawn: exd6 or Be2 and h3 untangle, and your material plus the bishop eyeing f7 give a clear edge. Don't fear the pin.", sayShort: "Bg4 — keep the e5-pawn, untangle.", arrows: [A('c4', 'f7')], highlights: [H('e5', KEY), H('f3', SOFT)] }] },
  'italian-game::4::Be6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 13, say: "Qh5 has recovered the pawn and pokes at f7; Be6 defends. The position is level and open — don't over-press. Develop, castle, and play from the small comfort of the freer pieces. Patience holds the balance.", sayShort: "Qh5 — pawn back, play it level.", arrows: [A('h5', 'f7')], highlights: [H('f7', KEY)] }] },
  'italian-game::4::Nf6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 13, say: "Nf6 hits your h5-queen — retreat it to e2 or f3, having recovered the e5-pawn. The game is level and open; complete development, castle, and the marginally freer pieces give a small pull. Don't force a balanced position.", sayShort: "Nf6 — retreat the queen, stay level.", highlights: [H('h5', KEY)] }] },
  'italian-game::4::Nh6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 13, say: "Nh6 develops to defend f7 awkwardly. Recover and consolidate: Qxe5 regains the pawn, or develop and castle. The position is balanced; play from the comfort of the freer pieces and don't over-reach in a level game.", sayShort: "Nh6 — regain e5, play level.", highlights: [H('f7', KEY)] }] },
  'italian-game::4::Qd4@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 13, say: "Qd4 centralizes Black's queen, eyeing your loose pawns — trade or chase it: Qxe5 grabs the pawn and offers the swap, or Be3 and Nc3 develop with tempo. The game is balanced; neutralise the queen and play the equal middlegame.", sayShort: "Qd4 — trade or chase, stay equal.", highlights: [H('d4', KEY)] }] },
  'italian-game::4::f6@15': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 15, say: "f6 kicks your e5-queen — retreat it to g3 or f4, the pawn safely recovered. The position is level and open; develop, castle, and the slightly freer pieces give the nagging pull. Patience in a balanced game.", sayShort: "f6 — retreat the queen, play level.", highlights: [H('e5', KEY)] }] },
  'italian-game::5::Nxe4@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 7, say: "Nxe4 grabs the pawn in the Scotch Gambit — but you're flying. O-O and Re1 throw the rook onto the e-file pinning the knight, the bishop glares at f7, and the Max Lange looms. Black must defend with precision; attack.", sayShort: "Nxe4 — O-O, Re1, attack f7.", arrows: [A('c4', 'f7')], highlights: [H('e4', KEY), H('f7', SOFT)] }] },
  'italian-game::5::Nxd4@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 7, say: "Nxd4 grabs the centre pawn — recapture Nxd4 and your lead in development is the asset. The bishop eyes f7, the open lines feed your pieces, and Black is behind. Develop with threats and press the initiative.", sayShort: "Nxd4 — recapture, attack f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'italian-game::5::d5@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 7, say: "d5 strikes back in the centre — meet it with exd5 or Bb5, keeping the initiative. The open position favours your developed pieces and the bishop aimed at f7. Black has gone double-edged; keep forcing and develop with threats.", sayShort: "d5 — answer exd5, keep pressing.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
  'italian-game::5::d6@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 7, say: "d6 props e5 solidly — recover the centre with dxe5 or O-O. Your bishop eyes f7, the half-open files favour your rooks, and the lead in development gives a pleasant pull. Develop, castle, and press.", sayShort: "d6 — recover the centre, press f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'italian-game::5::Be7@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Be7 — deep in the Canal, your rook sits boldly on e6. Keep forcing: the rook rakes the sixth rank, the knight and bishop swarm, and Black's king is exposed on the queenside. Material is level; the initiative and the loose king decide — press.", sayShort: "Be7 — press the active rook on e6.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::Qd5@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Qd5 offers the queen trade, but keep the pieces on — your rook on e6 and the knights swarm Black's exposed king. Decline simplification, keep forcing, and the active pieces and the loose monarch are your edge in this sharp position.", sayShort: "Qd5 — keep pieces on, keep forcing.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::Qf5@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Qf5 eyes your e6-rook and the kingside — hold it with the queen or g4, and keep attacking. The rook on the sixth and the active pieces target Black's exposed king. Sharp and roughly level; the initiative is everything.", sayShort: "Qf5 — hold e6, keep attacking.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::h6@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "h6 — a luft in the sharp Canal. Press your active rook on e6 and the swarming pieces; Black's king is loose on the queenside. Material's level, so the initiative decides — keep forcing and target the exposed monarch.", sayShort: "h6 — press e6, target the king.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::f5@11': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 11, say: "f5 props Black's e4-knight but loosens the king. Strike: Nc3 or Nbd2 hits the knight, and the open e-file plus the weakened light squares hand you the initiative. Develop with threats and the loose black king tells.", sayShort: "f5 — hit the e4-knight, press.", highlights: [H('e4', KEY)] }] },

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
  'two-knights-defence::4::c3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "c3 — White braces for a slow maneuvering game. Match the patience and improve: reroute …Na5 to challenge the c4-bishop, swing …Nd7-f8-g6, and ready the …d5 or …c6-and-…d5 break. Equal and rich — out-play, don't out-rush.", sayShort: "c3 — …Na5, reroute, break …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY), H('a5', SOFT)] }] },
  'two-knights-defence::4::h3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "h3 — a quiet luft; White isn't forcing anything. Improve your pieces: …Na5 hits the strong bishop, the knight reroutes via d7-f8-g6, and the …d5 break frees you. The position is level; manoeuvre and pick your moment.", sayShort: "h3 — …Na5, then break …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::7::h3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "h3 — a quiet luft; White isn't forcing anything. Improve your pieces: …Na5 hits the strong bishop, the knight reroutes via d7-f8-g6, and the …d5 break frees you. The position is level; manoeuvre and pick your moment.", sayShort: "h3 — …Na5, then break …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::4::Nbd2@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Nbd2 — White begins the Italian knight tour. Mirror the plan: …Na5 to swap off the c4-bishop, or …Nd7 and …Nf8-g6 to your own kingside, then the …d5 break. You're fully equal — out-manoeuvre from the more harmonious setup and strike when ready.", sayShort: "Nbd2 — …Na5, then …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::7::Nbd2@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Nbd2 — White begins the Italian knight tour. Mirror the plan: …Na5 to swap off the c4-bishop, or …Nd7 and …Nf8-g6 to your own kingside, then the …d5 break. You're fully equal — out-manoeuvre from the more harmonious setup and strike when ready.", sayShort: "Nbd2 — …Na5, then …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::4::Nc3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Nc3 — White develops the knight toward d5. Contest it: …Na5 trades the strong bishop, …Be6 covers d5, and the …d5 break beckons. The quiet middlegame is level; out-manoeuvre from a sound, flexible setup.", sayShort: "Nc3 — …Na5, contest d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::7::Nc3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Nc3 — White develops the knight toward d5. Contest it: …Na5 trades the strong bishop, …Be6 covers d5, and the …d5 break beckons. The quiet middlegame is level; out-manoeuvre from a sound, flexible setup.", sayShort: "Nc3 — …Na5, contest d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::4::a3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "a3 — a tiny waiting move; White has no break. Take your time too: …Na5 hits the bishop, reroute the knights, and prepare …d5. The position is balanced and rich; the win is made by out-playing, not out-rushing.", sayShort: "a3 — …Na5, reroute, …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::7::a3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "a3 — a tiny waiting move; White has no break. Take your time too: …Na5 hits the bishop, reroute the knights, and prepare …d5. The position is balanced and rich; the win is made by out-playing, not out-rushing.", sayShort: "a3 — …Na5, reroute, …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY)] }] },
  'two-knights-defence::7::a4@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "a4 — White grabs a little queenside space. Don't react nervously: …Na5 challenges the bishop, …a5 or …Be6 holds the queenside, and …d5 frees the centre. A level, manoeuvring game where your active reroutes give the easier plan.", sayShort: "a4 — …Na5, …a5, then …d5.", arrows: [A('c6', 'a5')], highlights: [H('d5', KEY), H('a5', SOFT)] }] },
  'two-knights-defence::4::Bg5@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Bg5 pins your f6-knight — ease it with …h6, or …Be6 and …Na5 to trade White's strong bishop. Then the …d5 break frees you. The quiet game is comfortably equal; untangle and out-manoeuvre.", sayShort: "Bg5 — …h6, then …Na5 and …d5.", highlights: [H('f6', KEY), H('d5', SOFT)] }] },
  'two-knights-defence::7::Bg5@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 12, say: "Bg5 pins your f6-knight — ease it with …h6, or …Be6 and …Na5 to trade White's strong bishop. Then the …d5 break frees you. The quiet game is comfortably equal; untangle and out-manoeuvre.", sayShort: "Bg5 — …h6, then …Na5 and …d5.", highlights: [H('f6', KEY), H('d5', SOFT)] }] },
  'two-knights-defence::7::Bb5@14': TK_QUIET_BB5,
  'two-knights-defence::1::Bd3@14': TK_POLERIO,
  'two-knights-defence::1::Nd4@18': TK_POLERIO,
  'two-knights-defence::1::Ng1@18': TK_POLERIO,
  'two-knights-defence::1::Nh4@18': TK_POLERIO,
  'two-knights-defence::1::O-O@24': TK_POLERIO,
  'two-knights-defence::5::O-O@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "O-O — White finally tucks the king away, but you've a raging attack for the material. Your queen dominates d5, the bishops will swarm, and …Bg4 or …Bc5 pile onto f2 and the loose white camp. Keep forcing — the initiative is the compensation.", sayShort: "O-O — keep attacking, queen on d5.", highlights: [H('d5', KEY)] }] },
  'two-knights-defence::5::Qa4+@14': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 14, say: "Qa4+ — White's queen darts out with check, but it's a fleeting raid. Block with …Bd7 or …Qd7, develop with tempo, and your bishops and open lines pour out. You've given material for a withering initiative; keep the pieces coming.", sayShort: "Qa4+ — block …Bd7, keep developing.", arrows: [A('c8', 'd7')], highlights: [H('a4', KEY)] }] },
  'two-knights-defence::5::Nf3@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "Nf3 develops, but you're swarming for the material. Your queen rules d5, and …Bg4 pins it, …Bc5 hits f2, the rooks crash onto the open files. This is the Fritz at full cry — keep the threats raining and don't let White consolidate.", sayShort: "Nf3 — …Bg4 pins, …Bc5 hits f2.", arrows: [A('c8', 'g4')], highlights: [H('d5', KEY), H('f2', SOFT)] }] },
  'two-knights-defence::5::Qe2@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "Qe2 offers the queen trade to blunt your attack — keep the pieces on! …Bg4 pins, …Bc5 swarms f2, and the open lines feed your initiative. Decline simplification, keep forcing, and make White prove he can survive the deficit.", sayShort: "Qe2 — decline trades, keep attacking.", arrows: [A('c8', 'g4')], highlights: [H('d5', KEY), H('f2', SOFT)] }] },
  'two-knights-defence::5::d4@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "d4 grabs space, but your attack roars on. The queen commands d5, …Bc5 and …Bg4 pile onto f2 and f3, and the rooks pour to the centre. You've sacrificed for the initiative — keep the pieces swarming and the threats coming.", sayShort: "d4 — swarm f2, keep the attack.", arrows: [A('c8', 'g4')], highlights: [H('d5', KEY), H('f2', SOFT)] }] },
  'two-knights-defence::6::O-O@18': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 18, say: "O-O — the dust of the Ulvestad settles with your king on d8 but your pieces blazing. The queen rakes from g5, the knight dominates d5, and the bishops will join the hunt. Your activity and the exposed white king are full value for the pawn — press on.", sayShort: "O-O — press: queen g5, knight d5.", highlights: [H('d5', KEY), H('g5', SOFT)] }] },
  'two-knights-defence::6::Nc3@12': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 12, say: "Nc3 develops, but your gambit fires. The d4-knight is a thorn, …Qxg5 and …Nxd5 reclaim material with interest, and your pieces flood out. The sharp Ulvestad is double-edged to the hilt — keep generating threats.", sayShort: "Nc3 — the d4-knight bites, attack.", arrows: [A('d4', 'f3')], highlights: [H('d4', KEY)] }] },
  'two-knights-defence::6::Bc6@18': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 18, say: "Bc6 — White returns the bishop to block, but your attack rolls. The queen rakes g5, the d5-knight dominates, and …Bb4+ or …Rb8 prise open lines at the exposed white king. Keep the pieces swarming; the initiative is worth the material.", sayShort: "Bc6 — keep swarming, queen g5.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'two-knights-defence::6::d3@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "d3 develops modestly, but you've reclaimed material and kept the initiative. The d5-knight dominates, the queen sits active on g5, and your pieces are the busier. Develop with threats and convert the activity the gambit bought.", sayShort: "d3 — d5-knight dominates, press.", highlights: [H('d5', KEY)] }] },
  'two-knights-defence::6::dxe5@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 16, say: "dxe5 grabs a pawn, but your pieces dominate. The knight rules d5, the queen rakes from g5, and the open lines favour your rooks. You've the initiative and active pieces for the material; keep forcing and target the loose white king.", sayShort: "dxe5 — knight d5, queen g5, press.", highlights: [H('d5', KEY), H('g5', SOFT)] }] },
  'two-knights-defence::2::Bxc6@14': TK_BC5_BXF7,
  'two-knights-defence::2::c3@12': TK_BC5_BXF7,
  'two-knights-defence::2::d3@12': TK_BC5_BXF7,
  'two-knights-defence::2::d3@14': TK_BC5_BXF7,
  'two-knights-defence::2::h3@14': TK_BC5_BXF7,
  'two-knights-defence::0::Bb3@10': { ...TK_MAXLANGE, beats: [{ atMove: 10, say: "Bb3 retreats the bishop in the Max Lange. Keep defending soundly: …Ne4 plants the knight on its strong post, …Bc5 or …Be7 develops, and …Bg4 or …O-O completes. Weather the storm with precision and the extra space evaporates into equality.", sayShort: "Bb3 — …Ne4, develop, hold.", arrows: [A('f6', 'e4')], highlights: [H('e4', KEY)] }] },
  'two-knights-defence::0::Bxc6+@12': { ...TK_MAXLANGE, beats: [{ atMove: 12, say: "Bxc6+ — White trades to dent your pawns; recapture …bxc6 and the half-open b-file is yours. Your e4-knight is strong, the bishop pair compensates the doubled pawns, and …Bc5 and …O-O complete a sound, balanced game.", sayShort: "Bxc6+ — …bxc6, the e4-knight holds.", highlights: [H('c6', KEY), H('e4', SOFT)] }] },
  'two-knights-defence::0::Nxc6@14': { ...TK_MAXLANGE, beats: [{ atMove: 14, say: "Nxc6 trades on c6 — recapture …Bxc6 and you've equalised. Your e4-knight dominates the centre, the bishop pair is yours, and the open lines suit your pieces. The Max Lange storm has blown out into a level, comfortable game.", sayShort: "Nxc6 — …Bxc6, you've equalised.", arrows: [A('d7', 'c6')], highlights: [H('c6', KEY), H('e4', SOFT)] }] },
  'two-knights-defence::0::O-O@12': { ...TK_MAXLANGE, beats: [{ atMove: 12, say: "O-O — White castles in the Max Lange. Keep defending: …Bc5 or …Be7 develops, …O-O follows, and …Bg4 or …f5 supports your strong e4-knight. Precise moves dissolve White's space into a balanced, even game.", sayShort: "O-O — …Bc5, support the e4-knight.", arrows: [A('f8', 'c5')], highlights: [H('e4', KEY), H('c5', SOFT)] }] },
  'two-knights-defence::0::O-O@14': { ...TK_MAXLANGE, beats: [{ atMove: 14, say: "O-O — White completes development. You're solid: the e4-knight is anchored, …Bc5 and …O-O finish your setup, and the bishop on d7 covers the light squares. Weather the last of the Max Lange and the game is comfortably level.", sayShort: "O-O — finish …Bc5 and …O-O.", arrows: [A('f8', 'c5')], highlights: [H('e4', KEY)] }] },
  'two-knights-defence::0::c3@18': { ...TK_MAXLANGE, beats: [{ atMove: 18, say: "c3 — deep in the Max Lange, the smoke has cleared. Your e4-knight dominates, the bishop pair and the bishop on c5 eye f2, and the open b-file is yours. The defence has held; press your active pieces from a balanced, comfortable game.", sayShort: "c3 — e4-knight dominates, press.", highlights: [H('e4', KEY), H('f2', SOFT)] }] },
  'two-knights-defence::0::f3@18': { ...TK_MAXLANGE, beats: [{ atMove: 18, say: "f3 hits your strong e4-knight — retreat it to g5 with tempo, eyeing f3 and the kingside. You keep the bishop pair, the open b-file and a sound game; the Max Lange is fully neutralised. Reroute and press.", sayShort: "f3 — reroute the knight, you're fine.", arrows: [A('e4', 'g5')], highlights: [H('e4', KEY)] }] },
  'two-knights-defence::0::exd6@10': { ...TK_MAXLANGE, beats: [{ atMove: 10, say: "exd6 — White grabs the d-pawn, but recapture …Bxd6 and you've a free, active game. Your pieces develop to natural squares, the centre is open, and Black equalises easily with no weaknesses. The space edge has evaporated.", sayShort: "exd6 — recapture …Bxd6, free game.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] }] },
  'two-knights-defence::0::exf6@10': { ...TK_MAXLANGE, beats: [{ atMove: 10, say: "exf6 — White grabs the knight, but you've a thunderbolt: …d3! the passed pawn jams deep into White's camp, and …Qxf6 regains the piece with a raging initiative. The Max Lange's sharpest line is fine for you — push the pawn and attack.", sayShort: "exf6 — push …d3, regain with attack.", highlights: [H('d3', KEY)] }] },
  'two-knights-defence::3::e5@8': { ...TK_MAXLANGE, beats: [{ atMove: 8, say: "e5 — the Max Lange push, cramping you and opening lines. The defence is textbook: …d5! returns the pawn to free your game, …Ne4 plants the knight, and …Bc5 and …Bg4 develop. Weather the storm precisely and reach a balanced game.", sayShort: "e5 — answer …d5, then …Ne4.", highlights: [H('e5', KEY), H('d5', SOFT)] }] },
  'two-knights-defence::3::Nc3@10': { ...TK_MAXLANGE, beats: [{ atMove: 10, say: "Nc3 challenges your e4-knight. Keep it simple: …d5 supports it and frees your game, …Be7 and …O-O complete, and the …Be6 plan holds the light squares. The gambit is neutralised; you stand level with sound development.", sayShort: "Nc3 — support with …d5, develop.", highlights: [H('e4', KEY), H('d5', SOFT)] }] },
  'two-knights-defence::3::Nxd4@10': { ...TK_MAXLANGE, beats: [{ atMove: 10, say: "Nxd4 recaptures, hitting your e4-knight's support. Stay precise: …Be7 develops, …O-O gets safe, and …d5 or …Nf6 consolidates the knight. The Scotch-Gambit complications fizzle into a balanced game with active pieces.", sayShort: "Nxd4 — …Be7, …O-O, consolidate.", highlights: [H('e4', KEY)] }] },
  'two-knights-defence::3::Nb5@18': { ...TK_MAXLANGE, beats: [{ atMove: 18, say: "Nb5 jumps in eyeing c7 — calmly parried with …Kd8 or …Na6, covering the fork. You've survived the tactical flurry; the position is balanced, your king finds safety, and the equal game holds. Defend accurately.", sayShort: "Nb5 — cover c7 with …Kd8.", highlights: [H('c7', KEY)] }] },
  'two-knights-defence::3::Rxe7+@20': { ...TK_MAXLANGE, beats: [{ atMove: 20, say: "Rxe7+ — a desperado, but you're ready: …Nxe7 or …Kxe7 recaptures and the attack peters out. You emerge with the material and a safe king; the Canal's fireworks have spent themselves. Recapture and consolidate the win.", sayShort: "Rxe7+ — recapture, the attack ends.", arrows: [A('c6', 'e7')], highlights: [H('e7', KEY)] }] },

  // ── Four Knights Game ──
  'four-knights-game::0::Bd6@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bd6 — a passive bishop that blocks Black's own d-pawn. Press the tempo: d3 and the Nd5 leap put your knight on a commanding outpost, Bg5 pins, and you take the centre with d4 when ready. Develop a step ahead and keep a pleasant pull.", sayShort: "Bd6 — Nd5 and d4, press ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::0::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 11, say: "Bxc3 — Black trades to break the symmetry; bxc3 gives you the bishop pair and a half-open b-file. Now you're a tempo ahead with two bishops: Bg5 pins, Re1 and d4 expand, and the queenside file feeds your rook. Press the imbalance you've won.", sayShort: "Bxc3 — bxc3, bishop pair, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::0::Bc5@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bc5 develops the bishop actively. Make the tempo tell: d3 and the Nd5 jump command the centre, Bg5 pins the f6-knight, and Bxc6 doubles Black's pawns if it suits. You're a step ahead in development — take the centre and the pull.", sayShort: "Bc5 — Nd5, develop a step ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::0::g6@5': FK_G6,
  'four-knights-game::0::d6@7': { ...FK_SPANISH, beats: [{ atMove: 7, say: "d6 props e5 solidly. Break the symmetry on your terms: the Nd5 leap, Bxc6 to damage the structure, or d4 for the centre. With the extra tempo of moving first, claim the initiative — develop and out-manoeuvre.", sayShort: "d6 — Nd5 or d4, break symmetry.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::0::h6@15': { ...FK_SPANISH, beats: [{ atMove: 15, say: "h6 questions your g5-bishop — Bxf6 doubles Black's pawns and bares the king, or Bh4 keeps the pin. You hold the bishop pair and the half-open b-file from bxc3; with d4 and the rooks you press the structural imbalance. Keep the initiative.", sayShort: "h6 — Bxf6 doubles, press the file.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::0::Bd7@15': { ...FK_SPANISH, beats: [{ atMove: 15, say: "Bd7 develops modestly. You've won the imbalance: the bishop pair, the half-open b-file, and the extra space. Play d4 to expand, swing the rook to b1, and press at the queenside and centre. The first-move tempo has become a lasting edge.", sayShort: "Bd7 — d4 and Rb1, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::0::Ne7@13': { ...FK_SPANISH, beats: [{ atMove: 13, say: "Ne7 reroutes the knight toward g6. Seize the moment: Nd5 or d4 grabs the centre while the knight tours, and Bxf6 or the pin keeps Black tied. With the extra tempo and the bishop-pair option, press your small, durable pull.", sayShort: "Ne7 — Nd5 or d4, grab the centre.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::0::Ne7@15': { ...FK_SPANISH, beats: [{ atMove: 15, say: "Ne7 heads for g6. You hold the bishop pair and the half-open b-file; play d4 to expand the centre, swing the rook to b1, and the knight's slow tour lets you seize space first. Press the structural edge you've won.", sayShort: "Ne7 — d4 and Rb1, take space.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::1::Bxc3+@11': { ...FK_SCOTCH_FK, beats: [{ atMove: 11, say: "Bxc3+ — Black trades to dent your pawns; bxc3 gives you a broad centre and the bishop pair. Your pieces find active squares: Bd3, Bg5 and Qf3 swing at the king. The doubled c-pawns are a fair price for the initiative — attack.", sayShort: "Bxc3+ — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::1::dxc6@11': { ...FK_SCOTCH_FK, beats: [{ atMove: 11, say: "dxc6 — Black recaptures toward the centre. Your pieces are the more active in the near-symmetrical structure: Bd3, O-O and the Bg5-Qf3 battery aim at the king. The game is level, so make the win — press the kingside light squares.", sayShort: "dxc6 — active pieces, press the king.", highlights: [H('c6', KEY)] }] },
  'four-knights-game::1::Bd6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Bd6 develops toward your king. Keep the pieces aimed: Bg5 pins, Qf3 swings, Rad1 backs the centre, and the light squares around Black's king beckon. The IQP is dynamic; press the kingside before Black consolidates.", sayShort: "Bd6 — pile on the kingside, press.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::h6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 keeps the pin, or Bxf6 to damage Black's kingside. Your pieces are active, Qf3 and Bd3 eye the king, and the IQP is a dynamic asset. Keep forcing on the kingside light squares.", sayShort: "h6 — Bh4 or Bxf6, keep attacking.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'four-knights-game::1::c6@17': { ...FK_SCOTCH_FK, beats: [{ atMove: 17, say: "c6 props Black's d5-pawn. Develop and attack: Bg5 pins the f6-knight, Qf3 swings at the king, and the rooks claim the central files. The near-symmetrical IQP is level — press the kingside light squares.", sayShort: "c6 — Bg5 and Qf3, attack.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Bxc3@17': { ...FK_SCOTCH_FK, beats: [{ atMove: 17, say: "Bxc3 — Black trades to dent your structure; bxc3 and the half-open b-file plus the bishop pair are yours. Bd3, Bg5 and Qf3 swing at the king; the doubled c-pawns are a small price for the active pieces. Attack.", sayShort: "Bxc3 — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::1::Rb8@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Rb8 — Black eyes the half-open b-file, but your kingside attack is faster. Bg5 pins, Qf3 and Bd3 train on the king, and Rad1 backs the centre. The IQP is dynamic; press at the king before Black's counterplay arrives.", sayShort: "Rb8 — your attack is faster, press.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Be6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Be6 develops, covering the light squares. Keep the heat on: Bg5 pins, Qf3 and Bd3 aim at the king, and Rad1 backs the centre. The IQP gives dynamic play; press the kingside before Black fully consolidates.", sayShort: "Be6 — press the kingside, attack.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Be6@23': { ...FK_SCOTCH_FK, beats: [{ atMove: 23, say: "Be6 develops in the deep IQP. Your pieces are fully mobilised: Bg5, Qf3 and the rooks on the central files train on Black's king. The isolated d-pawn is dynamic; keep forcing on the kingside light squares before Black neutralises.", sayShort: "Be6 — rooks centralised, keep forcing.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Re8@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Re8 backs Black's e-file. No matter: your attack rolls. Bg5 pins, Qf3 and Bd3 eye the king, Rad1 holds the centre. The IQP is a dynamic asset; press the kingside light squares and keep Black defending.", sayShort: "Re8 — press the kingside, attack.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::2::Bb4@7': FK_D4_PIN,
  'four-knights-game::2::g6@5': FK_G6,
  'four-knights-game::2::Be7@9': FK_NMD5,
  'four-knights-game::2::Nb4@9': FK_NMD5,
  'four-knights-game::2::Nxd5@9': { ...FK_NMD5, intro: { say: "…Nxd5 — Black grabs your bold Belgrade Gambit knight. Recapture with exd5: the pawn jabs at the c6-knight and seizes central space. You're a pawn down, but the cramping d5-pawn and a real lead in development buy the initiative — develop fast and make the gambit pay.", sayShort: "…Nxd5 — recapture exd5, attack." }, beats: [
    { atMove: 9, say: "…Nxd5 snaps off your bold d5-knight — recapture with the pawn. exd5 hits the c6-knight and clamps the centre with the gambit's spearhead.", sayShort: "…Nxd5 — answer exd5.", arrows: [A('e4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 10, say: "exd5 — the pawn jabs at the c6-knight and grabs space. Black checks with …Bb4+ to gain a tempo; you simply block with c3.", sayShort: "exd5 — hit c6, grab space.", arrows: [A('d5', 'c6')], highlights: [H('c6', ATK)] },
    { atMove: 12, say: "c3 blocks the check and hits the bishop while the d5-pawn cramps Black and your pieces flow out fast. A pawn for the initiative — the Belgrade in full flow.", sayShort: "c3 — block, the Belgrade rolls.", arrows: [A('c3', 'b4')], highlights: [H('b4', ATK), H('d5', KEY)] },
  ] },
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
  'four-knights-game::4::Bd6@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bd6 — a passive bishop that blocks Black's own d-pawn. Press the tempo: d3 and the Nd5 leap put your knight on a commanding outpost, Bg5 pins, and you take the centre with d4 when ready. Develop a step ahead and keep a pleasant pull.", sayShort: "Bd6 — Nd5 and d4, press ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::4::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 11, say: "Bxc3 — Black trades to break the symmetry; bxc3 gives you the bishop pair and a half-open b-file. Now you're a tempo ahead with two bishops: Bg5 pins, Re1 and d4 expand, and the queenside file feeds your rook. Press the imbalance you've won.", sayShort: "Bxc3 — bxc3, bishop pair, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::4::Bc5@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bc5 develops the bishop actively. Make the tempo tell: d3 and the Nd5 jump command the centre, Bg5 pins the f6-knight, and Bxc6 doubles Black's pawns if it suits. You're a step ahead in development — take the centre and the pull.", sayShort: "Bc5 — Nd5, develop a step ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::4::g6@5': FK_G6,
  'four-knights-game::4::d6@7': { ...FK_SPANISH, beats: [{ atMove: 7, say: "d6 props e5 solidly. Break the symmetry on your terms: the Nd5 leap, Bxc6 to damage the structure, or d4 for the centre. With the extra tempo of moving first, claim the initiative — develop and out-manoeuvre.", sayShort: "d6 — Nd5 or d4, break symmetry.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::4::c6@17': { ...FK_SPANISH, beats: [{ atMove: 17, say: "c6 — Black props the centre in the deep symmetric line. You've broken the mirror first: Ng3 eyes f5, d4 expands, and Bc4 or Ba4 keeps the bishop active. The extra tempo tells — press the kingside and centre from the better setup.", sayShort: "c6 — Ng3 and d4, press first.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::4::Bxc3@9': { ...FK_SPANISH, beats: [{ atMove: 9, say: "Bxc3 — an early trade; bxc3 hands you the bishop pair and the half-open b-file at once. Now you're a clear tempo ahead: d4 expands the centre, Bg5 and Re1 develop, and the open file feeds your rook. Press the imbalance.", sayShort: "Bxc3 — bxc3, two bishops, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::4::Bg4@13': { ...FK_SPANISH, beats: [{ atMove: 13, say: "Bg4 — Black pins toward your rerouting knight. No bother: h3 puts the question, and your Ne2-g3 tour heads for f5 while d4 expands. With the first-move tempo and the bishop-pair option, the small edge is yours — keep improving.", sayShort: "Bg4 — h3, then Ng3 and d4.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::4::c6@19': { ...FK_SPANISH, beats: [{ atMove: 19, say: "c6 — deep in the symmetric main, you've already played d4 and broken the mirror. Press: the centre is yours, Ng3 eyes f5, and Bc4 or a kingside build follow. The extra tempo of moving first has matured into a real initiative.", sayShort: "c6 — centre is yours, press on.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::5::Bc5@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 13, say: "Bc5 develops in the symmetrical fork-trick line. There's no attack here — just a quiet, even game where your slightly freer pieces nag. Castle, bring a rook to the e-file, and press it. The win, if it comes, is squeezed from small edges.", sayShort: "Bc5 — castle, press the e-file.", highlights: [H('e4', KEY)] }] },
  'four-knights-game::5::Bg4@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight — h3 puts the question, or play around it. The position is near-symmetrical and balanced; develop, castle, and lean on the e-file. Out-play from the marginally freer pieces — there's no attack, just a tiny pull.", sayShort: "Bg4 — h3, hold the e-file.", highlights: [H('f3', KEY)] }] },
  'four-knights-game::5::f5@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 13, say: "f5 strikes your e4-bishop but loosens Black's king. Retreat it to d3 or c2 eyeing h7, and the weakened light squares become targets. The symmetry is broken in your favour — develop and press the holes f5 left behind.", sayShort: "f5 — retreat Bd3, target the holes.", arrows: [A('e4', 'd3')], highlights: [H('e4', KEY)] }] },
  'four-knights-game::5::Bd7@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 13, say: "Bd7 develops quietly. The fork-trick line is near-symmetrical and level; castle, bring a rook to the e-file, and the slightly freer pieces give a nagging pull. There's nothing to force — out-manoeuvre from the marginally better coordination.", sayShort: "Bd7 — castle, squeeze the e-file.", highlights: [H('e4', KEY)] }] },
  'four-knights-game::5::Nd4@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 13, say: "Nd4 plants a knight in the centre, eyeing f3 and c2 — challenge it with Nxd4 or sidestep with Bd3. The position stays near-symmetrical and balanced; neutralise the intruder, castle, and press the e-file from the slightly freer game.", sayShort: "Nd4 — challenge Nxd4, stay level.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY)] }] },
  'four-knights-game::5::Bg4@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 15, say: "Bg4 pins after castling — h3 questions it, or Be2 and Nbd2. The fork-trick structure is symmetrical and even; develop, hold the e-file, and the tiny edge of the freer pieces is your only asset. Out-play patiently.", sayShort: "Bg4 — h3, hold the e-file.", highlights: [H('f3', KEY)] }] },
  'four-knights-game::5::Bd7@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 15, say: "Bd7 develops modestly after castling. The symmetrical fork-trick game is balanced; bring a rook to e1, post the pieces actively, and press the e-file. The marginally freer development is the only imbalance — squeeze it.", sayShort: "Bd7 — Re1, press the e-file.", highlights: [H('e4', KEY)] }] },
  'four-knights-game::5::f5@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 15, say: "f5 hits your e4-bishop and loosens Black's king. Retreat to d3 or c2 toward h7, and the holes on e5 and around the king become targets. Re1 backs the e-file; the broken symmetry favours you — press the weakened light squares.", sayShort: "f5 — retreat Bd3, press the holes.", arrows: [A('e4', 'd3')], highlights: [H('e4', KEY)] }] },
  'four-knights-game::5::Bg4@17': { ...FK_ITALIAN_FT, beats: [{ atMove: 17, say: "Bg4 pins your f3-knight in the symmetrical line — h3 puts the question, then Nbd2 and the e-file pressure. The position is balanced; the freer pieces and the rook on e1 give a tiny pull. Out-manoeuvre patiently.", sayShort: "Bg4 — h3, press the e-file.", highlights: [H('f3', KEY)] }] },
  'four-knights-game::5::f5@17': { ...FK_ITALIAN_FT, beats: [{ atMove: 17, say: "f5 strikes the e4-bishop but bares Black's king. Drop the bishop to d3 or c2 aiming at h7, and with Re1 on the e-file the holes f5 created become your targets. The broken symmetry hands you the initiative — press the light squares.", sayShort: "f5 — retreat Bd3, target the king.", arrows: [A('e4', 'd3')], highlights: [H('e4', KEY)] }] },
  'four-knights-game::6::cxd2+@13': FK_RUBINSTEIN,
  'four-knights-game::6::Bc5@15': { ...FK_BC5BD6, beats: [{ atMove: 15, say: "Bc5 develops in the Rubinstein endgame. You've weathered the counterattack: the bishop pair and the open files are yours, the doubled c-pawns offset by activity. Develop Be3 or O-O, trade pieces, and press the bishop pair in the simplified position.", sayShort: "Bc5 — bishop pair, trade and press.", highlights: [H('c5', KEY)] }] },
  'four-knights-game::6::c6@15': FK_RUBINSTEIN,
  'four-knights-game::6::Bb4@7': { ...FK_SPANISH, beats: [{ atMove: 7, say: "Bb4 — the symmetric Spanish pin. Break the mirror on your terms: O-O and then the Metger unpin with Ne2-g3, Bg5 to pin, and d4 a beat before Black. The extra tempo of moving first is your durable, nagging pull.", sayShort: "Bb4 — break symmetry, Ne2-g3, d4.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::6::Qe7@11': FK_RUBINSTEIN,
  'four-knights-game::6::cxb2@13': FK_RUBINSTEIN,
  'four-knights-game::6::Be7@15': FK_RUBINSTEIN,
  'four-knights-game::6::Bd6@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bd6 — a passive bishop that blocks Black's own d-pawn. Press the tempo: d3 and the Nd5 leap put your knight on a commanding outpost, Bg5 pins, and you take the centre with d4 when ready. Develop a step ahead and keep a pleasant pull.", sayShort: "Bd6 — Nd5 and d4, press ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::6::Ng8@11': FK_RUBINSTEIN,
  'four-knights-game::6::c6@11': FK_RUBINSTEIN,
  'four-knights-game::7::Bd6@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bd6 — a passive bishop that blocks Black's own d-pawn. Press the tempo: d3 and the Nd5 leap put your knight on a commanding outpost, Bg5 pins, and you take the centre with d4 when ready. Develop a step ahead and keep a pleasant pull.", sayShort: "Bd6 — Nd5 and d4, press ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::7::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 11, say: "Bxc3 — Black trades to break the symmetry; bxc3 gives you the bishop pair and a half-open b-file. Now you're a tempo ahead with two bishops: Bg5 pins, Re1 and d4 expand, and the queenside file feeds your rook. Press the imbalance you've won.", sayShort: "Bxc3 — bxc3, bishop pair, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::7::Bc5@7': { ...FK_BC5BD6, beats: [{ atMove: 7, say: "Bc5 develops the bishop actively. Make the tempo tell: d3 and the Nd5 jump command the centre, Bg5 pins the f6-knight, and Bxc6 doubles Black's pawns if it suits. You're a step ahead in development — take the centre and the pull.", sayShort: "Bc5 — Nd5, develop a step ahead.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::7::g6@5': FK_G6,
  'four-knights-game::7::d6@7': { ...FK_SPANISH, beats: [{ atMove: 7, say: "d6 props e5 solidly. Break the symmetry on your terms: the Nd5 leap, Bxc6 to damage the structure, or d4 for the centre. With the extra tempo of moving first, claim the initiative — develop and out-manoeuvre.", sayShort: "d6 — Nd5 or d4, break symmetry.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::7::h6@15': { ...FK_SPANISH, beats: [{ atMove: 15, say: "h6 questions your g5-bishop — Bxf6 doubles Black's pawns and bares the king, or Bh4 keeps the pin. You hold the bishop pair and the half-open b-file from bxc3; with d4 and the rooks you press the structural imbalance. Keep the initiative.", sayShort: "h6 — Bxf6 doubles, press the file.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::7::c5@21': { ...FK_SPANISH, beats: [{ atMove: 21, say: "c5 — Black challenges your big centre in the deep symmetric line. You hold the bishop pair, the half-open b-file and the broad centre; meet c5 with d5 or keep the tension, and press the queenside and the two bishops. The first-move edge endures.", sayShort: "c5 — hold the centre, press the bishops.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::7::Bd7@15': { ...FK_SPANISH, beats: [{ atMove: 15, say: "Bd7 develops modestly. You've won the imbalance: the bishop pair, the half-open b-file, and the extra space. Play d4 to expand, swing the rook to b1, and press at the queenside and centre. The first-move tempo has become a lasting edge.", sayShort: "Bd7 — d4 and Rb1, press.", highlights: [H('c3', KEY)] }] },
  'four-knights-game::7::Ne7@13': { ...FK_SPANISH, beats: [{ atMove: 13, say: "Ne7 reroutes the knight toward g6. Seize the moment: Nd5 or d4 grabs the centre while the knight tours, and Bxf6 or the pin keeps Black tied. With the extra tempo and the bishop-pair option, press your small, durable pull.", sayShort: "Ne7 — Nd5 or d4, grab the centre.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::8::h6@11': { ...FK_GLEK, beats: [{ atMove: 11, say: "h6 — a quiet luft in the Glek. Build the system: O-O, the g2-bishop raking the long diagonal, and the Nh4 or d4 lever to open lines for it. A strategically rich game where your harmonious setup gives the lasting pull.", sayShort: "h6 — O-O, then Nh4 or d4.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::8::O-O@11': { ...FK_GLEK, beats: [{ atMove: 11, say: "O-O — Black castles in the Glek. Spring the system: O-O, then Nh4 to swing the knight toward f5, or the d4 break to open the long diagonal for your g2-bishop. Your harmonious setup gives a small, lasting initiative — press it.", sayShort: "O-O — Nh4 or d4, press.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::8::Be6@11': { ...FK_GLEK, beats: [{ atMove: 11, say: "Be6 develops, covering d5. Continue the Glek: O-O, then Nd5 or the d4 lever to open the long diagonal for your g2-bishop. The strategically rich setup gives the pull — improve the pieces and break when set.", sayShort: "Be6 — O-O, then Nd5 or d4.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::8::h6@13': { ...FK_GLEK, beats: [{ atMove: 13, say: "h6 — a luft in the Glek; nothing forcing. Press the system: the g2-bishop rakes the long diagonal, Nh4 heads for f5, and the d4 break opens lines. Your harmonious setup and the long-diagonal pressure give a small, durable edge.", sayShort: "h6 — Nh4, d4, press the diagonal.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::8::Ng4@11': { ...FK_GLEK, beats: [{ atMove: 11, say: "Ng4 jabs at f2 — calmly covered. Your king's bishop is on g2, so brush it back with Rf1 and h3; Black has loosened with nothing to show. Continue the Glek: Nh4, d4, and press the long diagonal.", sayShort: "Ng4 — brush back h3, press on.", highlights: [H('f2', KEY)] }] },
  'four-knights-game::8::Bg4@13': { ...FK_GLEK, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight — h3 puts the question, or Nd5 and Nh4 reroute around it. The Glek setup rolls on: the g2-bishop rakes the long diagonal and the d4 break opens lines. The pin is a nuisance, not a threat — press.", sayShort: "Bg4 — h3, then Nh4 and d4.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::8::Nd4@11': { ...FK_GLEK, beats: [{ atMove: 11, say: "Nd4 plants a knight in the centre — challenge it with Nxd4 or Ne2, keeping your structure. The Glek's harmonious setup persists: the g2-bishop rakes the long diagonal, and the d4 or f4 levers open lines. Neutralise and press.", sayShort: "Nd4 — challenge Nxd4, press on.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY)] }] },
  'four-knights-game::8::Be6@13': { ...FK_GLEK, beats: [{ atMove: 13, say: "Be6 develops, eyeing d5. Continue the Glek: Nd5 or the d4 lever opens the long diagonal for your g2-bishop, and Nh4 heads for f5. Your harmonious setup and the long-diagonal pressure give the lasting pull — improve and break.", sayShort: "Be6 — Nd5 or d4, open the diagonal.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },
  'four-knights-game::8::Be6@15': { ...FK_GLEK, beats: [{ atMove: 15, say: "Be6 develops in the Glek. Spring the plan: Nd5 plants a knight on the outpost, or d4 opens the long diagonal for your g2-bishop. Nh4 eyes f5. The strategically rich position gives a small, durable edge — press it.", sayShort: "Be6 — Nd5 and d4, press.", arrows: [A('c3', 'd5')], highlights: [H('d5', KEY)] }] },

  // ── Scotch Game ──
  'scotch-game::0::Nf6@5': SC_NF6_EARLY,
  'scotch-game::0::Ne5@13': { ...SC_CLASSICAL, beats: [{ atMove: 13, say: "Ne5 — Black's knight hops to e5, eyeing your bishop. Tuck it to e2 or hit it with f4; your d4-knight dominates, the bishop-pair option remains, and you keep the central pull. Trade the dark bishops and press the half-open d-file.", sayShort: "Ne5 — keep the d4 grip, press.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::d6@13': { ...SC_CLASSICAL, beats: [{ atMove: 13, say: "d6 props Black's setup. Complete development: O-O, line the rooks on the central files, and use your space and the d4-knight's grip. Trade the dark bishops with Be3, and the half-open d-file plus the central control give a lasting pull.", sayShort: "d6 — O-O, press the d-file.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::Ne5@15': { ...SC_CLASSICAL, beats: [{ atMove: 15, say: "Ne5 hits the c4-bishop after castling. Slide it back to b3 or e2, keep the d4-knight's central grip, and play on the half-open d-file. Your space and the better-placed pieces give a small, lasting edge — improve and press.", sayShort: "Ne5 — retreat the bishop, keep d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::Bb6@15': { ...SC_CLASSICAL, beats: [{ atMove: 15, say: "Bb6 tucks the bishop to safety. Now press: your d4-knight dominates, the rooks come to the central files, and Nd2-f3 or a kingside plan improves your game. Trade the dark bishops and squeeze the half-open d-file.", sayShort: "Bb6 — press d4 and the d-file.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::Bb6@13': { ...SC_CLASSICAL, beats: [{ atMove: 13, say: "Bb6 retreats the bishop early. Complete development: O-O and the rooks to the central files, keep the d4-knight's grip, and prepare a kingside expansion. Your space and the better coordination give the pull.", sayShort: "Bb6 — O-O, keep the central grip.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::Qg6@13': { ...SC_CLASSICAL, beats: [{ atMove: 13, say: "Qg6 swings the queen at g2 — calmly covered. O-O tucks the king, Qf3 or Bd3 guards, and your d4-knight and central space tell. Neutralise the queen sortie and press the half-open d-file.", sayShort: "Qg6 — cover g2, press the centre.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('g2', SOFT)] }] },
  'scotch-game::0::a6@15': { ...SC_CLASSICAL, beats: [{ atMove: 15, say: "a6 — a slow move; your setup is ideal. Press: the d4-knight grips the centre, the rooks come to the central files, and Nd2 or f4 improves your game. Trade the dark bishops and grind the small space edge.", sayShort: "a6 — press d4, improve the pieces.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'scotch-game::0::Nxd4@13': { ...SC_CLASSICAL, beats: [{ atMove: 13, say: "Nxd4 trades — recapture Bxd4 (or cxd4) and your bishops dominate the long diagonals while the half-open d-file feeds your rook. The Classical Scotch hands you the bishop pair and a pleasant pull; develop and press.", sayShort: "Nxd4 — recapture, bishop pair.", arrows: [A('e3', 'd4')], highlights: [H('d4', KEY)] }] },
  'scotch-game::1::Nf6@5': SC_NF6_EARLY,
  'scotch-game::1::dxc6@9': { ...SC_MIESES, beats: [{ atMove: 9, say: "dxc6 — Black recaptures toward the centre, and after Qxd8+ Kxd8 the queens vanish. Your trump is structural: Black's king has lost castling and his doubled c-pawns are weak. Develop, seize the open d-file, and grind the endgame edge.", sayShort: "dxc6 — trade queens, grind the structure.", highlights: [H('c6', KEY)] }] },
  'scotch-game::1::Nb6@15': { ...SC_MIESES, beats: [{ atMove: 15, say: "Nb6 retreats the knight from c4's push. Your e5-pawn cramps Black's kingside and his doubled c-pawns are the chronic target. Develop with Nc3 and Be3, finish the king's safety, and grind the structural edge in the long game.", sayShort: "Nb6 — e5 space, target the c-pawns.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::1::O-O-O@17': { ...SC_MIESES, beats: [{ atMove: 17, say: "O-O-O — Black castles long into the Mieses. Your edge holds: the e5-wedge cramps, the doubled c-pawns are weak, and with opposite-side castling you can storm with the a- and b-pawns. Develop, then race on the queenside.", sayShort: "O-O-O — storm the queenside, press.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::1::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::1::Qb4+@15': { ...SC_MIESES, beats: [{ atMove: 15, say: "Qb4+ — a check to grab a tempo; block with Nc3 or Bd2, developing as you go. The e5-wedge still cramps and the doubled c-pawns remain weak. Neutralise the check and press your structural edge in the long game.", sayShort: "Qb4+ — block Nc3, keep the edge.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::1::Qh4@17': { ...SC_MIESES, beats: [{ atMove: 17, say: "Qh4 swings the queen at your kingside — calmly parried with g3 or Nf3. The e5-pawn cramps, the doubled c-pawns are weak, and once you neutralise the queen sortie your structural edge tells. Develop and grind.", sayShort: "Qh4 — parry g3, press the structure.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::1::Nb6@17': { ...SC_MIESES, beats: [{ atMove: 17, say: "Nb6 reroutes the knight. Your Mieses edge persists: the e5-wedge cramps Black, his doubled c-pawns are the long-term weakness, and the bishop on a6 bites on b3's granite. Develop, finish castling, and grind.", sayShort: "Nb6 — e5 space, grind the c-pawns.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::1::g5@17': { ...SC_MIESES, beats: [{ atMove: 17, say: "g5 — Black lashes out, but it loosens his own king. Stay solid: develop with Nc3 and Be3, castle, and the e5-wedge plus the weak doubled c-pawns give your structural edge. The over-extension hands you targets.", sayShort: "g5 — stay solid, exploit the holes.", highlights: [H('e5', KEY), H('c6', SOFT)] }] },
  'scotch-game::2::Nf6@5': SC_NF6_EARLY,
  'scotch-game::2::O-O@19': SC_BC4,
  'scotch-game::2::Be7@17': SC_BC4,
  'scotch-game::2::Bxc6@15': SC_BC4,
  'scotch-game::2::Bb6@19': SC_BC4,
  'scotch-game::2::c5@17': SC_BC4,
  'scotch-game::2::Qe7@19': SC_BC4,
  'scotch-game::2::Bc5@7': { ...SC_CLASSICAL, beats: [{ atMove: 7, say: "Bc5 — Black develops actively in the Bc4 Scotch. Strike: c3 to recover d4 and build the centre, your bishop eyeing f7. The lead in development and the open lines give the initiative; castle and press.", sayShort: "Bc5 — c3, recover d4, press f7.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'scotch-game::2::Bc5@13': SC_BC4,
  'scotch-game::3::Nf6@5': SC_NF6_EARLY,
  'scotch-game::3::Bxc3+@11': { ...SC_NC3_IQP, beats: [{ atMove: 11, say: "Bxc3+ — Black trades to dent your pawns; bxc3 hands you a broad centre and the bishop pair. Your pieces find active squares: Bd3, Bg5 and Qf3 swing at the king. The doubled c-pawns are a small price for the initiative.", sayShort: "Bxc3+ — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'scotch-game::3::dxc6@11': { ...SC_NC3_IQP, beats: [{ atMove: 11, say: "dxc6 — Black recaptures toward the centre. Your pieces are the more active: Bd3, O-O and the Bg5-Qf3 battery aim at the king. The near-symmetrical structure is balanced, so make the win — press the kingside and the weak light squares.", sayShort: "dxc6 — active pieces, press the king.", highlights: [H('c6', KEY)] }] },
  'scotch-game::3::Bd6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Bd6 develops toward your king. Keep the pieces aimed: Bg5 pins, Qf3 swings, Rad1 backs the centre, and the light squares around Black's king beckon. The IQP is dynamic; press the kingside before Black consolidates.", sayShort: "Bd6 — pile on the kingside, press.", highlights: [H('d5', KEY)] }] },
  'scotch-game::3::h6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 keeps the pin, or Bxf6 to damage Black's kingside. Your pieces are active, Qf3 and Bd3 eye the king, and the IQP is a dynamic asset. Keep forcing on the kingside.", sayShort: "h6 — Bh4 or Bxf6, keep attacking.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'scotch-game::3::c6@17': { ...SC_NC3_IQP, beats: [{ atMove: 17, say: "c6 props Black's d5-pawn. Develop and attack: Bg5 pins the f6-knight, Qf3 swings at the king, and the rooks come to the central files. The near-symmetrical IQP structure is level — press the kingside light squares.", sayShort: "c6 — Bg5 and Qf3, attack.", highlights: [H('d5', KEY)] }] },
  'scotch-game::3::Bxc3@17': { ...SC_NC3_IQP, beats: [{ atMove: 17, say: "Bxc3 — Black trades to dent your structure; recapture bxc3 and the half-open b-file and bishop pair are yours. Bd3, Bg5 and Qf3 swing at the king; the doubled c-pawns are a small price for the active pieces.", sayShort: "Bxc3 — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'scotch-game::3::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::3::Rb8@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Rb8 — Black eyes the half-open b-file. No matter: your kingside attack is faster. Bg5 pins, Qf3 and Bd3 train on the king, and Rad1 backs the centre. The IQP is dynamic; press at the king before Black's counterplay arrives.", sayShort: "Rb8 — your attack is faster, press.", highlights: [H('d5', KEY)] }] },
  'scotch-game::4::Nf6@5': SC_NF6_EARLY,
  'scotch-game::4::Nf6@13': SC_GORING,
  'scotch-game::4::Bg4@13': SC_GORING,
  'scotch-game::4::Bg4@15': SC_GORING,
  'scotch-game::4::Be6@15': SC_GORING,
  'scotch-game::4::Be6@13': SC_GORING,
  'scotch-game::4::h6@13': SC_GORING,
  'scotch-game::4::Nge7@13': SC_GORING,
  'scotch-game::4::h6@15': SC_GORING,
  'scotch-game::5::Nf6@5': SC_NF6_EARLY,
  'scotch-game::5::Nf6@7': { ...SC_STEINITZ_QH4, beats: [
    { atMove: 7, say: "…Nf6 develops and pokes at e4. The clean plan: trade on c6 to wreck Black's pawns, then ram e5 to seize the centre and gain time on the knight.", sayShort: "…Nf6 — Nxc6, then e5.", arrows: [A('d4', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 9, say: "…bxc6 — Black's queenside pawns are doubled and his structure dented. Now seize the centre by force.", sayShort: "…bxc6 — his pawns are doubled.", arrows: [A('e4', 'e5')], highlights: [H('c6', SOFT), H('e5', KEY)] },
    { atMove: 10, say: "e5 — the wedge rolls up, kicking the f6-knight to the rim and clamping the middle. Black scrambles with …Qe7 to bite at the pawn.", sayShort: "e5 — clamp, kick the knight.", arrows: [A('e5', 'f6')], highlights: [H('e5', KEY), H('f6', SOFT)] },
    { atMove: 12, say: "Qe2 props the e5-wedge and develops. Black blockades with …Nd5 to level the game, but you keep the spatial pull and the safer structure — castle and lean on those doubled c-pawns.", sayShort: "Qe2 — hold e5, press the pawns.", arrows: [A('e2', 'e5')], highlights: [H('e5', KEY), H('c6', SOFT)] },
  ] },
  'scotch-game::5::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::5::Bb4+@7': { ...SC_STEINITZ_QH4, beats: [
    { atMove: 7, say: "…Bb4+ checks to disrupt your development — but you welcome it. Block with c3, gaining a free tempo to build the centre while hitting the bishop.", sayShort: "…Bb4+ — block with c3.", arrows: [A('c2', 'c3')], highlights: [H('c3', KEY)] },
    { atMove: 8, say: "c3 blocks the check and jabs at the b4-bishop, which retreats to c5. You've gained a tempo and a broad centre.", sayShort: "c3 — block, hit the bishop.", arrows: [A('c3', 'b4')], highlights: [H('b4', ATK)] },
    { atMove: 10, say: "Be3 develops, braces your strong d4-knight and offers to trade Black's active bishop. Castle, double on the central files, and your space gives a small, lasting pull.", sayShort: "Be3 — brace d4, press the centre.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::5::Qf6@7': { ...SC_STEINITZ_QH4, beats: [
    { atMove: 7, say: "…Qf6 swings the queen out early to eye d4 and f2 — develop and defend in one with Be3.", sayShort: "…Qf6 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 shores up the d4-knight and develops with tempo. Black posts …Bc5; you stand solid with the centre and the better structure, and Black's queen will cost him a tempo to retreat.", sayShort: "Be3 — defend d4, develop.", arrows: [A('e3', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 9, say: "…Bc5 piles onto d4 — but c3, Bc4 and castling consolidate everything. Your space and the half-open files hand you the pull while Black's pieces sit awkwardly around your knight.", sayShort: "…Bc5 — consolidate, keep the pull.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::5::Qxe4+@11': { ...SC_STEINITZ_QH4, beats: [{ atMove: 11, say: "Qxe4+ — Black snatches a pawn with check in the Steinitz raid, but Be3 blocks and develops, and Nxc7+ ideas loom. The black queen is overworked and the king exposed; develop with threats and the initiative outweighs the pawn.", sayShort: "Qxe4+ — Be3 blocks, Nb5 bites.", highlights: [H('e4', KEY)] }] },
  'scotch-game::5::Bc5@9': { ...SC_STEINITZ_QH4, beats: [
    { atMove: 9, say: "…Bc5 develops in the Steinitz raid line, but Black's early queen sortie has left him loose. Your Nb5 already eyes c7 — develop and threaten.", sayShort: "…Bc5 — Nb5 eyes c7.", arrows: [A('b5', 'c7')], highlights: [H('c7', KEY)] },
    { atMove: 10, say: "Qe2 develops with threats, supporting the Nb5 raid on c7 and the fork of a8 while Black's queen sits awkwardly on h4. You're a tempo or two ahead — keep developing and punish the early sortie.", sayShort: "Qe2 — back Nb5, press the lead.", arrows: [A('b5', 'c7')], highlights: [H('c7', KEY), H('h4', SOFT)] },
  ] },
  'scotch-game::5::Qxe4+@9': { ...SC_STEINITZ_QH4, beats: [{ atMove: 9, say: "Qxe4+ — Black grabs e4 with check, but it's greedy. Be2 blocks and develops, Nxc7+ forks loom, and the wandering black queen will be chased. You emerge a clear tempo ahead with the initiative; develop with threats.", sayShort: "Qxe4+ — Be2 blocks, Nc7+ looms.", highlights: [H('e4', KEY), H('c7', SOFT)] }] },
  'scotch-game::6::Nf6@5': SC_NF6_EARLY,
  'scotch-game::6::Bxc3+@11': { ...SC_NC3_IQP, beats: [{ atMove: 11, say: "Bxc3+ — Black trades to dent your pawns; bxc3 hands you a broad centre and the bishop pair. Your pieces find active squares: Bd3, Bg5 and Qf3 swing at the king. The doubled c-pawns are a small price for the initiative.", sayShort: "Bxc3+ — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'scotch-game::6::dxc6@11': { ...SC_NC3_IQP, beats: [{ atMove: 11, say: "dxc6 — Black recaptures toward the centre. Your pieces are the more active: Bd3, O-O and the Bg5-Qf3 battery aim at the king. The near-symmetrical structure is balanced, so make the win — press the kingside and the weak light squares.", sayShort: "dxc6 — active pieces, press the king.", highlights: [H('c6', KEY)] }] },
  'scotch-game::6::c6@17': { ...SC_NC3_IQP, beats: [{ atMove: 17, say: "c6 props Black's d5-pawn. Develop and attack: Bg5 pins the f6-knight, Qf3 swings at the king, and the rooks come to the central files. The near-symmetrical IQP structure is level — press the kingside light squares.", sayShort: "c6 — Bg5 and Qf3, attack.", highlights: [H('d5', KEY)] }] },
  'scotch-game::6::Bxc3@17': { ...SC_NC3_IQP, beats: [{ atMove: 17, say: "Bxc3 — Black trades to dent your structure; recapture bxc3 and the half-open b-file and bishop pair are yours. Bd3, Bg5 and Qf3 swing at the king; the doubled c-pawns are a small price for the active pieces.", sayShort: "Bxc3 — bxc3, bishop pair, attack.", highlights: [H('c3', KEY)] }] },
  'scotch-game::6::h6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 holds the pin or Bxf6 dents the kingside. Your pieces flow toward the king with Qf3 and Bd3, the knight reroutes via Ne2-g3, and the IQP gives dynamic play. Keep forcing.", sayShort: "h6 — Bh4, reroute Ng3, attack.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'scotch-game::6::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::6::Be7@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Be7 breaks the pin on f6. Reroute and press: Ne2-g3 heads for f5, Qf3 and Bd3 aim at the king, and the rooks claim the central files. The near-symmetrical IQP is level; make the win on the kingside.", sayShort: "Be7 — Ng3 and Qf3, press the king.", highlights: [H('d5', KEY)] }] },
  'scotch-game::6::Bg4@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Bg4 hits your queen — drop it to g3 or e3, keeping the attack alive. Ne2-g3 reroutes toward f5, Bd3 eyes h7, and the central files are yours. The IQP is dynamic; keep the pieces pointed at Black's king.", sayShort: "Bg4 — retreat the queen, keep attacking.", highlights: [H('d5', KEY)] }] },
  'scotch-game::7::Nf6@5': SC_NF6_EARLY,
  'scotch-game::7::O-O@13': { ...SC_NB3_MODERN, beats: [{ atMove: 13, say: "O-O — Black castles in the modern Nb3 line. Now choose: Be3 to trade the dark bishops and O-O-O for an opposite-wing pawn-storm race, or O-O for a quiet positional game. You hold the central space and the bishop-pair option — pick your structure and press.", sayShort: "O-O — choose O-O-O or O-O, press.", highlights: [H('e4', KEY)] }] },
  'scotch-game::7::O-O@15': { ...SC_NB3_MODERN, beats: [{ atMove: 15, say: "O-O — Black castles after the Be3 setup. Spring the plan: Bxb6 and O-O-O launch an opposite-wing pawn-storm race, or O-O keeps it positional. Your space and the open lines give the pull — pick the battleground and attack.", sayShort: "O-O — O-O-O and storm, or press.", highlights: [H('e4', KEY)] }] },
  'scotch-game::7::Nf6@7': { ...SC_NB3_MODERN, beats: [
    { atMove: 7, say: "…Nf6 develops and pokes at e4. The clean plan: trade on c6 to wreck Black's pawns, then ram e5 to seize the centre and gain time on the knight.", sayShort: "…Nf6 — Nxc6, then e5.", arrows: [A('d4', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 9, say: "…bxc6 — Black's queenside pawns are doubled and his structure dented. Now seize the centre by force.", sayShort: "…bxc6 — his pawns are doubled.", arrows: [A('e4', 'e5')], highlights: [H('c6', SOFT), H('e5', KEY)] },
    { atMove: 10, say: "e5 — the wedge rolls up, kicking the f6-knight to the rim and clamping the middle. Black scrambles with …Qe7 to bite at the pawn.", sayShort: "e5 — clamp, kick the knight.", arrows: [A('e5', 'f6')], highlights: [H('e5', KEY), H('f6', SOFT)] },
    { atMove: 12, say: "Qe2 props the e5-wedge and develops. Black blockades with …Nd5 to level the game, but you keep the spatial pull and the safer structure — castle and lean on those doubled c-pawns.", sayShort: "Qe2 — hold e5, press the pawns.", arrows: [A('e2', 'e5')], highlights: [H('e5', KEY), H('c6', SOFT)] },
  ] },
  'scotch-game::7::Be6@15': { ...SC_NB3_MODERN, beats: [{ atMove: 15, say: "Be6 develops and offers the light-bishop trade. Carry on: Bxb6 and O-O-O for the opposite-wing race, or O-O and the central files. Your space and the better structure give a small, lasting pull — choose and press.", sayShort: "Be6 — Bxb6, then O-O-O or O-O.", highlights: [H('e4', KEY)] }] },
  'scotch-game::7::Bg4@15': { ...SC_NB3_MODERN, beats: [{ atMove: 15, say: "Bg4 hits your e2-queen — drop it to d2 or e1, or block with f3. The pin is fleeting; Bxb6 and O-O-O still launch the queenside storm, or O-O keeps it solid. Neutralise and press your space edge.", sayShort: "Bg4 — sidestep the queen, press.", highlights: [H('e4', KEY)] }] },
  'scotch-game::7::Qe7@13': { ...SC_NB3_MODERN, beats: [{ atMove: 13, say: "Qe7 lines Black's queen up opposite yours. Develop and choose: Be3 and O-O-O for the opposite-wing race, or O-O and the central files. The queens facing off suit your space edge; pick the structure and press for more.", sayShort: "Qe7 — develop, choose your wing.", highlights: [H('e4', KEY)] }] },
  'scotch-game::7::Re8@19': { ...SC_NB3_MODERN, beats: [{ atMove: 19, say: "Re8 — both kings have castled, yours long, the race is on. Your queen on e3 and the central pieces eye Black's king; storm with the g- and h-pawns while keeping your own king snug. Opposite-side, sharp, and yours to drive — attack.", sayShort: "Re8 — opposite castling, storm the king.", highlights: [H('c1', KEY)] }] },
  'scotch-game::7::Qe7@15': { ...SC_NB3_MODERN, beats: [{ atMove: 15, say: "Qe7 develops the queen modestly. Press your plan: Bxb6 and O-O-O for the opposite-wing storm, or O-O and the central files. Your space and the better-coordinated pieces give the pull — choose the battleground and attack.", sayShort: "Qe7 — Bxb6, then choose your wing.", highlights: [H('e4', KEY)] }] },

  // ── Scotch Gambit ──
  'scotch-gambit::0::d6@5': SCG_D6,
  'scotch-gambit::0::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 5, say: "Nf6 hits e4 before recapturing — answer dxe5. After …Nxe4 the centre clears into a balanced game where your extra space and quicker development give the nagging edge. Develop, seize a file, and squeeze.", sayShort: "Nf6 — take dxe5, keep the edge.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] }] },
  'scotch-gambit::0::Ng4@11': { ...SCG_MAIN, beats: [{ atMove: 11, say: "Ng4 — the knight hops to the rim under your e5-wedge. Brush it back with h3 when ready; for now cxd4 rebuilds the centre and the bishop eyes f7. A pawn down with a commanding initiative.", sayShort: "Ng4 — cramp with e5, eye f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'scotch-gambit::0::Ne4@11': { ...SCG_MAIN, beats: [{ atMove: 11, say: "Ne4 — the knight leaps forward, but it's loose. Hit it with cxd4 and Qe2 or d3, regain the pawn, and your e5-wedge plus the bishop's glare at f7 keep Black scrambling. Develop with threats.", sayShort: "Ne4 — chase it, keep the wedge.", arrows: [A('c4', 'f7')], highlights: [H('e4', KEY), H('f7', SOFT)] }] },
  'scotch-gambit::0::Qe7@11': { ...SCG_MAIN, beats: [{ atMove: 11, say: "Qe7 leans on your e5-pawn — defend it dynamically. cxd4 and O-O finish development, Re1 backs the wedge, and the bishop glares at f7. Black's queen is awkward there; press the initiative.", sayShort: "Qe7 — back e5, develop and press.", arrows: [A('c4', 'f7')], highlights: [H('e5', KEY), H('f7', SOFT)] }] },
  'scotch-gambit::0::Ng8@11': { ...SCG_MAIN, beats: [{ atMove: 11, say: "Ng8 — the knight crawls all the way home! You've won the centre and a fistful of tempi. cxd4, Bf4 and the rooks pour out while Black is curled up on the back rank. A pawn down and utterly dominating.", sayShort: "Ng8 — it retreated; pour it on.", arrows: [A('c4', 'f7')], highlights: [H('e5', KEY), H('g8', SOFT)] }] },
  'scotch-gambit::0::Nd7@13': { ...SCG_MAIN, beats: [{ atMove: 13, say: "Nd7 unpins the c6-knight, but your bishop on b5 still bites and the e5-wedge cramps. cxd4 rebuilds the centre, O-O and Re1 follow, and your space and development are well worth the pawn.", sayShort: "Nd7 — keep the wedge, cxd4.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('e5', SOFT)] }] },
  'scotch-gambit::0::Bg4@17': { ...SCG_MAIN, beats: [{ atMove: 17, say: "Bg4 pins your f3-knight deep in the Max Lange — meet it with Be2 or h3 and keep building. Your e5-pawn and d4-centre cramp, the pieces are active, and the sharp position favours the better-prepared attacker. Stay precise.", sayShort: "Bg4 — break the pin, keep building.", highlights: [H('f3', KEY)] }] },
  'scotch-gambit::0::Ng4@13': { ...SCG_MAIN, beats: [{ atMove: 13, say: "Ng4 hops to the rim under your e5-wedge. Brush it back with h3 when it suits; cxd4 rebuilds, Bb5 pins, and your space plus the open lines keep the initiative. The gambit pawn buys real pressure.", sayShort: "Ng4 — h3 later, keep pressing.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] }] },
  'scotch-gambit::0::Qe7@13': { ...SCG_MAIN, beats: [{ atMove: 13, say: "Qe7 props the position under the e5-wedge — but the queen sits passive there. cxd4 and O-O finish development, the b5-bishop pins, and you press the cramped, awkward black camp. The pawn is a small price.", sayShort: "Qe7 — develop, press the cramp.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('e5', SOFT)] }] },
  'scotch-gambit::1::d6@5': SCG_D6,
  'scotch-gambit::1::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 5, say: "Nf6 hits e4 before recapturing — answer dxe5. After …Nxe4 the centre clears into a balanced game where your extra space and quicker development give the nagging edge. Develop, seize a file, and squeeze.", sayShort: "Nf6 — take dxe5, keep the edge.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] }] },
  'scotch-gambit::1::Ng4@13': SCG_SHARP,
  'scotch-gambit::1::Ne4@13': SCG_SHARP,
  'scotch-gambit::1::cxb2@13': SCG_SHARP,
  'scotch-gambit::1::Nf6@7': { ...SCG_NF6_EARLY, beats: [{ atMove: 7, say: "Nf6 hits e4 — push e5! and the Max Lange erupts. The pawn cramps, Bb5 looms to pin, and your pieces swarm f7. Black must defend with precision; keep forcing and castle straight into the attack.", sayShort: "Nf6 — push e5, the Max Lange.", arrows: [A('c4', 'f7')], highlights: [H('e5', KEY), H('f7', SOFT)] }] },
  'scotch-gambit::1::Ng8@13': SCG_SHARP,
  'scotch-gambit::1::Bc5@7': { ...SCG_MAIN, beats: [{ atMove: 7, say: "Bc5 — the main Scotch Gambit. Strike with c3 to recover d4, or e5 and the Max Lange. Your bishop is on f7, development races, and the pawn buys a roaring initiative. Castle and attack.", sayShort: "Bc5 — c3 or e5, attack f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'scotch-gambit::1::Qxf6@15': SCG_SHARP,
  'scotch-gambit::1::Qe7@19': SCG_SHARP,
  'scotch-gambit::2::d6@5': SCG_D6,
  'scotch-gambit::2::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 5, say: "Nf6 hits e4 before recapturing — answer dxe5. After …Nxe4 the centre clears into a balanced game where your extra space and quicker development give the nagging edge. Develop, seize a file, and squeeze.", sayShort: "Nf6 — take dxe5, keep the edge.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] }] },
  'scotch-gambit::2::Be7@17': SCG_MAXLANGE,
  'scotch-gambit::2::Bxc6@15': SCG_MAXLANGE,
  'scotch-gambit::2::c5@17': SCG_MAXLANGE,
  'scotch-gambit::2::Ne6@21': SCG_MAXLANGE,
  'scotch-gambit::2::Bxd4+@19': SCG_MAXLANGE,
  'scotch-gambit::2::Bc5@7': { ...SCG_MAIN, beats: [{ atMove: 7, say: "Bc5 — the main Scotch Gambit. Strike with c3 to recover d4, or e5 and the Max Lange. Your bishop is on f7, development races, and the pawn buys a roaring initiative. Castle and attack.", sayShort: "Bc5 — c3 or e5, attack f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'scotch-gambit::2::Bc5@13': SCG_MAXLANGE,
  'scotch-gambit::2::Ne4@9': SCG_MAXLANGE,

  // ── Evans Gambit ──
  'evans-gambit::0::Nf6@5': EV_NF6,
  'evans-gambit::0::Qe7@13': EV_ATTACK,
  'evans-gambit::0::Qf6@13': EV_ATTACK,
  'evans-gambit::0::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::0::Nf6@17': EV_ATTACK,
  'evans-gambit::0::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::0::exd4@11': EV_ATTACK,
  'evans-gambit::0::Na5@19': EV_ATTACK,
  'evans-gambit::0::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },
  'evans-gambit::0::Bb6@15': EV_ATTACK,
  'evans-gambit::1::Qf6@15': EV_ATTACK,
  'evans-gambit::1::Nf6@5': EV_NF6,
  'evans-gambit::1::Nh6@15': EV_ATTACK,
  'evans-gambit::1::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::1::d6@11': EV_ATTACK,
  'evans-gambit::1::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::1::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },
  'evans-gambit::1::Nge7@13': EV_ATTACK,
  'evans-gambit::1::Bd6@9': { ...EV_BD6, beats: [{ atMove: 9, say: "Bd6 — the solid modern retreat, overprotecting e5 and blocking Black's own d-pawn. Roll on: d4 and O-O keep the broad centre and the bishop pair, and patient pressure on the cramped position is the way, the pawn a fair price.", sayShort: "Bd6 — d4 and O-O, press the cramp.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::1::Nf6@13': EV_ATTACK,
  'evans-gambit::2::Nf6@5': EV_NF6,
  'evans-gambit::2::Bxb4@7': EV_BXB4,
  'evans-gambit::2::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::2::h6@13': { ...EV_BB6_QUIET, beats: [{ atMove: 13, say: "h6 — a useful luft in the quiet Evans, nothing forcing. Continue the plan: O-O, then prepare d4 or Bg5 and the f-file. Your queenside space and the better bishop give a small, lasting pull — out-manoeuvre him.", sayShort: "h6 — castle, prepare d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::2::O-O@13': { ...EV_BB6_QUIET, beats: [{ atMove: 13, say: "O-O — Black castles into the quiet Evans. Now turn the screw: d4 challenges the centre, or Bg5 pins and the rooks swing over. Your queenside space from a4-a5 and the active bishops give the pull — press it.", sayShort: "O-O — challenge d4, swing the rooks.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::2::Nxb4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 13, say: "Nxb4 grabs the b-pawn — but it loosens Black's grip and the knight strays. Hit back with d4, opening the centre while the b4-knight is offside; your bishops and the open lines more than answer the pawn.", sayShort: "Nxb4 — open d4, the knight strays.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('b4', SOFT)] }] },
  'evans-gambit::2::d6@11': { ...EV_BB6_QUIET, beats: [{ atMove: 11, say: "d6 props the centre in the quiet Evans. Hold your edge: a4 and a5 have prised the queenside, Nc3 and d3 develop, and you prepare d4 or the f-file. More space, the easier game — squeeze.", sayShort: "d6 — develop, prepare d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::2::Nd4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 13, say: "Nd4 jumps to the centre — challenge it: Nxd4 Bxd4 hands you the bishop pair and the freer game, or sidestep and keep the tension. Your queenside space and active pieces hold the edge.", sayShort: "Nd4 — challenge Nxd4, take the pair.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::2::a5@9': { ...EV_BB6_QUIET, beats: [{ atMove: 9, say: "a5 halts your a-pawn but bites on b5 and c5 — squares your knight covets. Nc3, d3 and a slow build leave you the freer game; the b5-outpost and your central space are the lasting assets.", sayShort: "a5 — use the b5 hole, build.", highlights: [H('b5', KEY), H('c5', SOFT)] }] },
  'evans-gambit::2::Ng4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 13, say: "Ng4 lunges at f2 — calmly parried. With your king's bishop covering and pieces developed, brush it back with h3 and Black is loosened with nothing to show. Continue d4 and the squeeze.", sayShort: "Ng4 — brush it back with h3.", highlights: [H('f2', KEY), H('g4', SOFT)] }] },
  'evans-gambit::3::Nf6@5': EV_NF6,
  'evans-gambit::3::Nf6@13': { ...EV_BD6, beats: [{ atMove: 13, say: "Nf6 finally develops, but you're already castled and active. Re1 backs the centre, e5 or Bg5 strike, and the bishops rake Black's cramped camp. Convert the lead in development the gambit bought.", sayShort: "Nf6 — Re1 and e5, strike.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'evans-gambit::3::exd4@13': { ...EV_BD6, beats: [{ atMove: 13, say: "exd4 finally grabs the centre pawn — recapture cxd4 and your broad duo stands, the bishops blaze, the rooks own the open lines. A pawn down and dominating; pour the pieces at the king.", sayShort: "exd4 — recapture cxd4, dominate.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::3::Qf6@13': { ...EV_BD6, beats: [{ atMove: 13, say: "Qf6 eyes f2 and develops — but the queen blocks Black's own pieces. Hold firm with Be3 or Nbd2, keep the centre, and your faster development and bishop pair tell. Develop with threats.", sayShort: "Qf6 — hold f2, keep developing.", arrows: [A('c4', 'f7')], highlights: [H('f2', KEY)] }] },
  'evans-gambit::3::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::3::Ba5@9': EV_BA5,
  'evans-gambit::3::Qe7@13': { ...EV_BD6, beats: [{ atMove: 13, say: "Qe7 props the cramped position passively. Press your trumps: the d4-centre, the bishops, the open lines. Nbd2-f1-g3 or e5 turns the screw, and the initiative is full value for the pawn.", sayShort: "Qe7 — press the centre and bishops.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'evans-gambit::3::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::3::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },
  'evans-gambit::3::Nf6@11': { ...EV_BD6, beats: [{ atMove: 11, say: "Nf6 develops against your big centre — keep building. O-O, then the d4-e5 push or Bg5 pile pressure on. Your centre and the bishop pair are the engine; turn the initiative the pawn bought into an attack.", sayShort: "Nf6 — castle, push the centre.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::4::Nf6@5': EV_NF6,
  'evans-gambit::4::Nxe5@15': EV_ATTACK,
  'evans-gambit::4::Bg4@15': EV_ATTACK,
  'evans-gambit::4::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::4::Qe7@17': EV_ATTACK,
  'evans-gambit::4::Nge7@15': EV_ATTACK,
  'evans-gambit::4::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::4::exd4@11': EV_ATTACK,
  'evans-gambit::4::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },
  'evans-gambit::4::Na5@17': EV_ATTACK,
  'evans-gambit::5::Nf6@5': EV_NF6,
  'evans-gambit::5::Bg4@15': EV_ATTACK,
  'evans-gambit::5::Nf6@15': EV_ATTACK,
  'evans-gambit::5::Nge7@15': EV_ATTACK,
  'evans-gambit::5::Ne5@17': EV_ATTACK,
  'evans-gambit::5::h6@15': EV_ATTACK,
  'evans-gambit::5::Nce7@17': EV_ATTACK,
  'evans-gambit::5::Bd7@15': EV_ATTACK,
  'evans-gambit::5::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::5::d6@11': EV_ATTACK,
  'evans-gambit::6::Nf6@5': EV_NF6,
  'evans-gambit::6::Nf6@15': EV_ATTACK,
  'evans-gambit::6::Nge7@15': EV_ATTACK,
  'evans-gambit::6::h6@15': EV_ATTACK,
  'evans-gambit::6::Qf6@15': EV_ATTACK,
  'evans-gambit::6::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::6::d6@11': EV_ATTACK,
  'evans-gambit::6::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::6::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },
  'evans-gambit::6::Nge7@13': EV_ATTACK,
  'evans-gambit::7::Nf6@5': EV_NF6,
  'evans-gambit::7::Qe7@13': EV_ATTACK,
  'evans-gambit::7::Qf6@13': EV_ATTACK,
  'evans-gambit::7::Nf6@15': EV_ATTACK,
  'evans-gambit::7::Be7@5': { ...EV_BE7, beats: [{ atMove: 5, say: "Be7 — Black sidesteps into a passive Hungarian. Take the space: d4 builds the full centre, or b4 grabs the Evans initiative anyway. Castle, develop freely, and squeeze the cramped, counterplay-free position.", sayShort: "Be7 — take the centre with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] }] },
  'evans-gambit::7::Na5@17': EV_ATTACK,
  'evans-gambit::7::exd4@15': EV_ATTACK,
  'evans-gambit::7::Be7@9': { ...EV_BE7, beats: [{ atMove: 9, say: "Be7 — the meek retreat in the accepted Evans. Build the dream: d4 plants the centre, Ba3 rakes the bishop on e7 and the king, and you've a roaring initiative for the pawn. Develop and attack.", sayShort: "Be7 — d4 and Ba3, attack.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('f7', SOFT)] }] },
  'evans-gambit::7::exd4@11': EV_ATTACK,
  'evans-gambit::7::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 7, say: "Bb6 declines the pawn for the quieter Evans. Make the tempo tell: a4 lunges at the queenside, threatening a5 to chase or trap the bishop. Then Nc3, d3 and a calm build-up leave you more space and the easier game.", sayShort: "Bb6 — harass with a4, gain space.", highlights: [H('b6', KEY), H('a5', SOFT)] }] },

  // -- Kings Gambit --
  'kings-gambit::0::g4@9': KG_HANSTEIN,
  'kings-gambit::0::Bg4@13': KG_HANSTEIN,
  'kings-gambit::0::Nc6@11': KG_HANSTEIN,
  'kings-gambit::0::g4@11': KG_HANSTEIN,
  'kings-gambit::0::g4@13': KG_HANSTEIN,
  'kings-gambit::0::c6@13': KG_HANSTEIN,
  'kings-gambit::0::f6@9': KG_HANSTEIN,
  'kings-gambit::0::c6@11': KG_HANSTEIN,
  'kings-gambit::0::Be6@13': KG_HANSTEIN,
  'kings-gambit::0::f6@11': KG_HANSTEIN,
  'kings-gambit::1::Bg4@7': KG_FISCHER,
  'kings-gambit::1::Nf6@7': KG_FISCHER,
  'kings-gambit::1::Be7@7': KG_FISCHER,
  'kings-gambit::1::Nc6@7': KG_FISCHER,
  'kings-gambit::1::h6@7': KG_FISCHER,
  'kings-gambit::1::f6@9': KG_FISCHER,
  'kings-gambit::1::Be7@9': KG_FISCHER,
  'kings-gambit::1::Bg4@9': KG_FISCHER,
  'kings-gambit::1::Qf6@11': KG_FISCHER,
  'kings-gambit::1::Bh6@9': KG_FISCHER,
  'kings-gambit::2::Bh6@11': KG_MUZIO,
  'kings-gambit::2::Bc5+@11': KG_MUZIO,
  'kings-gambit::2::Bd6@11': KG_MUZIO,
  'kings-gambit::2::d6@11': KG_MUZIO,
  'kings-gambit::2::d5@11': KG_MUZIO,
  'kings-gambit::2::Qe7@11': KG_MUZIO,
  'kings-gambit::2::Qg5@11': KG_MUZIO,
  'kings-gambit::2::Nf6@11': KG_MUZIO,
  'kings-gambit::2::Nc6@11': KG_MUZIO,
  'kings-gambit::2::Qf5@13': KG_MUZIO,
  'kings-gambit::3::Bc5@9': { ...KG_FALKBEER, beats: [{ atMove: 9, say: "Bc5 develops actively in the Falkbeer — but you've calmly taken on e4 and stand a pawn to the good. Finish with Nf3, Be2 and O-O; once you untangle, the extra pawn and Black's thin compensation tell.", sayShort: "Bc5 — develop, a clean pawn up.", highlights: [H('e4', KEY)] }] },
  'kings-gambit::3::O-O@15': { ...KG_FALKBEER, beats: [{ atMove: 15, say: "O-O — Black castles in the Falkbeer main line. You've untangled with Nf3, Qe2 and Nc3; the position is balanced and open, your pieces as active as his. Complete development, contest the centre, and outplay from the better-coordinated side.", sayShort: "O-O — develop, contest the centre.", highlights: [H('e4', KEY)] }] },
  'kings-gambit::3::Nxc3@17': { ...KG_FALKBEER, beats: [{ atMove: 17, say: "Nxc3 — Black trades the active knight. Recapture bxc3, and your doubled c-pawns are offset by the half-open b-file and the bishop pair. The Falkbeer's fire is out; play the calm middlegame from equality, pressing the better structure.", sayShort: "Nxc3 — bxc3, douse the Falkbeer.", highlights: [H('c3', KEY)] }] },
  'kings-gambit::3::Bb4@15': { ...KG_FALKBEER, beats: [{ atMove: 15, say: "Bb4 pins your c3-knight — unpin in comfort with Bd2 or Qd2, or simply O-O-O and let the pin lapse. You've fully neutralised the counter-gambit; the open position is level and yours to outplay.", sayShort: "Bb4 — unpin Bd2, you're fine.", highlights: [H('c3', KEY)] }] },
  'kings-gambit::3::exf4@5': { ...KG_FALKBEER, beats: [
    { atMove: 5, say: "exf4 — Black snatches your f-pawn back, levelling material in this Falkbeer-Modern order. No matter: you're the better-developed side and the d5-pawn cramps him. Race your pieces out and round up f4 later.", sayShort: "exf4 — level; you lead development.", highlights: [H('d5', KEY), H('f4', SOFT)] },
    { atMove: 8, say: "Bc4 props the d5-pawn that …Nf6 is eyeing and lines up on the kingside. You're a clean step ahead in development; just keep finishing it.", sayShort: "Bc4 — hold d5, develop.", arrows: [A('c4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 10, say: "O-O — king safe and the rook drops onto the half-open f-file, glaring at f7. Black regains d5 and material stays level, but your faster development and that open file give you the easier, more pleasant game.", sayShort: "O-O — rook to the f-file.", highlights: [H('f7', KEY)] },
  ] },
  'kings-gambit::3::Bf2+@15': { ...KG_FALKBEER, beats: [{ atMove: 15, say: "Bf2+ — a check that lands the bishop in your camp, but it's just a sortie. Kxf2 or Kd1, and the bishop is stranded deep in your position; round it up or chase it, and your sound structure and pieces tell.", sayShort: "Bf2+ — Kxf2, the bishop's stranded.", arrows: [A('e1', 'f2')], highlights: [H('f2', KEY)] }] },
  'kings-gambit::3::c6@5': { ...KG_FALKBEER, beats: [
    { atMove: 5, say: "…c6 offers a pawn to blast the centre open after …cxd5 — don't oblige. Nc3 develops and holds everything together, keeping the game on your terms with the d5-pawn cramping Black's centre.", sayShort: "…c6 — answer Nc3, decline.", arrows: [A('b1', 'c3')], highlights: [H('c3', KEY)] },
    { atMove: 8, say: "Nf3 develops and eyes the loose f4-pawn. Material is level after …exf4, but your pieces flow out fast and the advanced d5-pawn keeps Black cramped — Bc4, O-O and Bxf4 follow for a sound, pleasant edge.", sayShort: "Nf3 — develop, level and easy.", highlights: [H('d5', KEY)] },
  ] },
  'kings-gambit::3::Bb4@17': { ...KG_FALKBEER, beats: [{ atMove: 17, say: "Bb4 pins the c3-knight in the deep Falkbeer — calmly met by O-O-O or Qd2. You've consolidated with Be3 and Qe2; the open middlegame is balanced and yours to press from the more harmonious setup.", sayShort: "Bb4 — O-O-O and unpin, level.", highlights: [H('c3', KEY)] }] },
  'kings-gambit::3::O-O@19': { ...KG_FALKBEER, beats: [{ atMove: 19, say: "O-O — the dust settles in the Falkbeer with queens facing off. Your structure is sound, the pieces developed, and the game level with a pull for whoever grabs the open files first. Centralise the rooks and outplay.", sayShort: "O-O — grab the open files, outplay.", highlights: [H('e4', KEY)] }] },
  'kings-gambit::3::Nd7@17': { ...KG_FALKBEER, beats: [{ atMove: 17, say: "Nd7 retreats the active knight to regroup — exactly the lull you want. Castle long, line the rooks on the central files, and your consolidated position and the bishop pair give a small, lasting pull in the open game.", sayShort: "Nd7 — castle long, press the files.", highlights: [H('e4', KEY)] }] },
  'kings-gambit::4::exf4@5': { ...KG_DECLINED, beats: [{ atMove: 5, say: "exf4 — Black grabs the pawn after declining with …Bc5. Fine: d4 builds the centre, Bxf4 recovers the pawn, and you've a free, pleasant game with the half-open f-file at the king. Develop and press.", sayShort: "exf4 — d4, then Bxf4 recovers.", highlights: [H('f4', KEY), H('d4', SOFT)] }] },
  'kings-gambit::4::Nc6@5': { ...KG_DECLINED, beats: [{ atMove: 5, say: "Nc6 develops; take with fxe5, winning a pawn. After the recapture you stand a clean pawn up with the f-file half-open — develop, castle, and the extra material plus the file tell.", sayShort: "Nc6 — take fxe5, a pawn up.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] }] },
  'kings-gambit::4::Nf6@5': { ...KG_DECLINED, beats: [{ atMove: 5, say: "Nf6 develops and eyes e4 — meet it calmly with Nc3 or d3, holding the centre. The King's Gambit Declined is a slow positional game; keep the f4-tension, develop, and aim the f-file at Black's king when it opens.", sayShort: "Nf6 — hold with Nc3 or d3.", highlights: [H('e4', KEY)] }] },
  'kings-gambit::4::d5@5': { ...KG_DECLINED, beats: [{ atMove: 5, say: "d5 strikes the centre — answer Nxe5! grabbing the pawn, since …dxe4 runs into Nxf7 tricks. You emerge a pawn up with active pieces; consolidate and the material tells. A combative reply rewarded.", sayShort: "d5 — answer Nxe5, snatch the pawn.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY)] }] },
  'kings-gambit::4::Nc6@9': { ...KG_DECLINED, beats: [{ atMove: 9, say: "Nc6 develops in the positional KGD. Play the system: d3 braces, and the f5 advance grabs kingside space and clamps Black in. No sacrifices — nurse the space edge and the half-open f-file into a lasting initiative.", sayShort: "Nc6 — clamp with f5, press.", arrows: [A('c4', 'f7')], highlights: [H('f5', KEY), H('f7', SOFT)] }] },
  'kings-gambit::4::Bg4@9': { ...KG_DECLINED, beats: [{ atMove: 9, say: "Bg4 pins your f3-knight — release it with h3 and Be3 when ready, or play around it. Your KGD setup with d3 and the f5 clamp rolls on; the pin is a nuisance, not a threat. Build the kingside space.", sayShort: "Bg4 — h3 later, clamp with f5.", highlights: [H('f3', KEY), H('f5', SOFT)] }] },
  'kings-gambit::4::Ng4@9': { ...KG_DECLINED, beats: [{ atMove: 9, say: "Ng4 jabs at f2 — calmly covered. With O-O coming and your pieces on guard, brush it back with Rf1 and h3; Black has loosened with nothing to show. Continue d3 and the f5 clamp.", sayShort: "Ng4 — guard f2, then h3.", highlights: [H('f2', KEY)] }] },
  'kings-gambit::4::Bg4@11': { ...KG_DECLINED, beats: [{ atMove: 11, say: "Bg4 pins the knight in the positional KGD — meet it with h3 and Be3, or Nbd2. Your setup is solid, the f5 break looms, and you keep the kingside space and the easier plan. Out-manoeuvre the pinned position.", sayShort: "Bg4 — break the pin, aim f5.", highlights: [H('f5', KEY)] }] },
  'kings-gambit::4::a6@13': { ...KG_DECLINED, beats: [{ atMove: 13, say: "a6 — a slow move; you've already clamped with f5, grabbing kingside space and the half-open f-file. Build the attack: g4 and the rook-lift, or Bd2 and O-O-O for an opposite-wing storm. The space edge is yours to press.", sayShort: "a6 — press the f5 clamp, attack.", highlights: [H('f5', KEY), H('g4', SOFT)] }] },
  'kings-gambit::4::Nd4@13': { ...KG_DECLINED, beats: [{ atMove: 13, say: "Nd4 plants a knight in the centre — challenge it with Nxd4 or Bd2 and O-O-O. You've already grabbed kingside space with f5; trade off the intruder and storm the king with g4 and the rooks. The clamp is the asset.", sayShort: "Nd4 — trade it, storm with g4.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY), H('f5', SOFT)] }] },
  'kings-gambit::5::d6@5': KG_ACC_D6,
  'kings-gambit::5::Qe7@15': KG_KIESERITZKY,
  'kings-gambit::5::d5@5': KG_ACC_D5,
  'kings-gambit::5::Nxe4@11': KG_KIESERITZKY,
  'kings-gambit::5::Nf6@5': KG_ACC_NF6,
  'kings-gambit::5::Ne7@5': KG_ACC_NE7,
  'kings-gambit::5::Be7@5': KG_ACC_BE7,
  'kings-gambit::5::Nc6@15': KG_KIESERITZKY,
  'kings-gambit::5::d5@11': KG_KIESERITZKY,
  'kings-gambit::5::d6@9': { ...KG_KIESERITZKY, beats: [
    { atMove: 9, say: "…d6 hits your dominant e5-knight and tries to blunt the attack — but it walks into a crushing little sequence. Nxg4! the knight skips back with tempo, snapping off the g4-pawn and keeping the initiative.", sayShort: "…d6 — answer Nxg4.", arrows: [A('e5', 'g4')], highlights: [H('g4', KEY)] },
    { atMove: 10, say: "Nxg4 — a pawn regained and the knight still eyeing f6 and h6. Black challenges it with …Nf6; you welcome the trade that opens his king.", sayShort: "Nxg4 — pawn back, keep pressing.", highlights: [H('g4', SOFT)] },
    { atMove: 12, say: "Nxf6+ — rip off Black's best defender with check; after …Qxf6 the kingside is shattered, the f-file wide open, and Bxf4, d4 and Nc3 pour in. The Kieseritzky attack rolls on with the king exposed.", sayShort: "Nxf6+ — wreck the kingside.", arrows: [A('f6', 'e8')], highlights: [H('f6', KEY)] },
  ] },
  'kings-gambit::6::d6@13': KG_ALLGAIER,
  'kings-gambit::6::h5@13': KG_ALLGAIER,
  'kings-gambit::6::d6@5': KG_ACC_D6,
  'kings-gambit::6::d5@5': KG_ACC_D5,
  'kings-gambit::6::Qf6@13': KG_ALLGAIER,
  'kings-gambit::6::Nf6@13': KG_ALLGAIER,
  'kings-gambit::6::Nf6@5': KG_ACC_NF6,
  'kings-gambit::6::Ne7@5': KG_ACC_NE7,
  'kings-gambit::6::f3@13': KG_ALLGAIER,
  'kings-gambit::6::Be7@5': KG_ACC_BE7,
  'kings-gambit::7::Bb4@13': KG_BISHOPS,
  'kings-gambit::7::Nxd5@11': KG_BISHOPS,
  'kings-gambit::7::Nc6@13': KG_BISHOPS,
  'kings-gambit::7::Bg4@13': KG_BISHOPS,
  'kings-gambit::7::Bb4@9': KG_BISHOPS,
  'kings-gambit::7::g5@13': KG_BISHOPS,
  'kings-gambit::7::Be6@13': KG_BISHOPS,
  'kings-gambit::7::d5@5': { ...KG_BISHOPS, beats: [
    { atMove: 5, say: "…d5 strikes the centre in the Bishop's Gambit, offering the pawn back to break open the position — so take it. Bxd5! the bishop snaps the pawn and keeps blazing down the a2-g8 diagonal at f7.", sayShort: "…d5 — answer Bxd5.", arrows: [A('c4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 6, say: "Bxd5 — the bishop grabs the centre pawn and trains on f7. Black hits it with …Nf6; you simply develop Nc3 and keep building.", sayShort: "Bxd5 — grab it, eye f7.", arrows: [A('d5', 'f7')], highlights: [H('f7', SOFT)] },
    { atMove: 8, say: "Nc3 develops and guards e4 as Black pins with …Bb4. Material is level, but you hold the bishop pair, open lines and the f4-pawn still to round up — castle and let your faster development decide.", sayShort: "Nc3 — develop, level and active.", arrows: [A('c3', 'e4')], highlights: [H('e4', KEY)] },
  ] },
  'kings-gambit::7::f3@15': KG_BISHOPS,
  'kings-gambit::7::Bc5@9': KG_BISHOPS,

  // -- Vienna Game --
  'vienna-game::0::Bc5@9': { ...VN_F4D5, beats: [{ atMove: 9, say: "Bc5 develops actively in the open f4-d5 Vienna. Develop and contest: d4 or Be2 and O-O, the half-open f-file your rook's highway. After the dust the game is balanced with a small pull for you — castle, claim the f-file, and squeeze.", sayShort: "Bc5 — develop, claim the f-file.", highlights: [H('f7', KEY)] }] },
  'vienna-game::0::Nc6@9': { ...VN_F4D5, beats: [{ atMove: 9, say: "Nc6 develops, eyeing e5. Recover and develop: d4 or Qe2, hold the e5-pawn or trade, and the half-open f-file points at f7. The open game is roughly level with a small pull — castle and press the f-file.", sayShort: "Nc6 — develop, press the f-file.", highlights: [H('f7', KEY)] }] },
  'vienna-game::0::Be6@13': { ...VN_F4D5, beats: [{ atMove: 13, say: "Be6 develops in the open Vienna; you've recaptured with dxc3, gaining the bishop pair and the half-open d- and f-files. Develop Bf4 or Be3, castle, and press both files at Black's position. The bishop pair gives the pull.", sayShort: "Be6 — bishop pair, press the files.", highlights: [H('f7', KEY)] }] },
  'vienna-game::0::Nc6@13': { ...VN_F4D5, beats: [{ atMove: 13, say: "Nc6 develops. With dxc3 you hold the bishop pair and the half-open d- and f-files; develop Bf4, castle, and double on the open files. The structure and the two bishops give a small, lasting edge — press.", sayShort: "Nc6 — bishop pair, double the files.", highlights: [H('f7', KEY)] }] },
  'vienna-game::0::Bg4@13': { ...VN_F4D5, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight — Be2 or h3 breaks it. You hold the bishop pair from dxc3 and the half-open files; develop, castle, and double the rooks on the d- and f-files. The pin is a trifle against your structural pull.", sayShort: "Bg4 — break the pin, press the files.", highlights: [H('f3', KEY)] }] },
  'vienna-game::0::Bg4@9': { ...VN_F4D5, beats: [{ atMove: 9, say: "Bg4 pins your knight early — h3 puts the question, or Be2. Develop and recover: hold or trade the e5-pawn, castle, and the half-open f-file feeds your rook. The open game is level with a small pull — press the f-file.", sayShort: "Bg4 — h3, press the f-file.", highlights: [H('f3', KEY), H('f7', SOFT)] }] },
  'vienna-game::0::c6@13': { ...VN_F4D5, beats: [{ atMove: 13, say: "c6 props Black's centre. You hold the bishop pair from dxc3 and the half-open d- and f-files; develop Bf4 and the rooks, castle, and press both files. The two bishops and the structure give the pull — squeeze.", sayShort: "c6 — bishop pair, press the files.", highlights: [H('f7', KEY)] }] },
  'vienna-game::0::d6@5': { ...VN_F4D5, beats: [
    { atMove: 5, say: "…d6 declines the gambit quietly, propping up e5. Take the space and develop: Nf3 eyes e5 and prepares to open the f-file with fxe5 when it suits.", sayShort: "…d6 — develop Nf3, hold f4.", arrows: [A('g1', 'f3')], highlights: [H('f4', KEY)] },
    { atMove: 6, say: "Nf3 develops, leans on e5 and braces the f4-lever. The half-open f-file points at f7, and fxe5 opens lines whenever you choose.", sayShort: "Nf3 — eye e5, ready fxe5.", arrows: [A('f3', 'e5')], highlights: [H('e5', SOFT)] },
    { atMove: 7, say: "…Nbd7 props the centre, but you hold the space and the f4-break in hand. Bc4, castle, and fxe5 to crack open the f-file at the king when the moment comes — a comfortable, pressing game.", sayShort: "…Nbd7 — keep the f-file lever.", highlights: [H('f7', KEY)] },
  ] },
  'vienna-game::0::f5@11': { ...VN_F4D5, beats: [{ atMove: 11, say: "f5 props Black's knight but loosens the king badly. Strike: d3 hits the e4-knight, or exf6 en passant rips open the f-file. The weakened light squares around Black's king are your targets — develop with threats and attack.", sayShort: "f5 — hit e4, rip the f-file open.", highlights: [H('e4', KEY)] }] },
  'vienna-game::1::g6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "g6 — Black blocks the queen but bares the dark squares. Qf3 or Qe2 keeps the heat, Nb5 leaps at c7, and the c4-bishop glares at f7. You've a roaring initiative for the pawn — develop with threats and hunt the loosened king.", sayShort: "g6 — Qf3 and Nb5, attack the king.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::1::d5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "d5 blocks the bishop's diagonal — take it: Bxd5 keeps the attack, the queen rakes from h5, and Nb5 eyes c7. Black's king is loose and his pieces tangled; develop with threats and the initiative is worth the pawn.", sayShort: "d5 — take Bxd5, keep attacking.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
  'vienna-game::1::Ng5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Ng5 — the knight jumps to defend, but d4 and h4 chase it while your attack builds. The queen rakes from h5, the c4-bishop eyes f7, and Black is tangled. Develop with threats and press the loose king.", sayShort: "Ng5 — chase it, keep attacking.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::1::Qf6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Qf6 defends f7 awkwardly. Press: Nb5 leaps at c7 and a8, the c4-bishop glares at f7, and d4 opens lines. Black's queen blocks his own pieces; develop with threats and the initiative rolls on for the pawn.", sayShort: "Qf6 — Nb5 and Bc4, press f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::1::Qe7@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Qe7 defends passively. Pour it on: Nb5 hits c7, the c4-bishop rakes f7, and d4 or O-O brings more force. Black's queen clogs his development; keep developing with threats and the loose king is the target.", sayShort: "Qe7 — Nb5, Bc4, hunt the king.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::1::Nc6@5': VN_BC4_DEV,
  'vienna-game::1::Qf6@11': { ...VN_FRANKENSTEIN, beats: [{ atMove: 11, say: "Qf6 defends in the main Frankenstein. Keep the screws on: Nb5 already eyes c7, the b3-bishop and the queen rake the kingside, and Qxf7 or d4 break through. Black walks a tightrope; over the board your attack is fearsome — press.", sayShort: "Qf6 — Nb5 hits c7, attack.", arrows: [A('b5', 'c7')], highlights: [H('c7', KEY)] }] },
  'vienna-game::1::Bc5@5': VN_BC4_DEV,
  'vienna-game::1::Be7@9': { ...VN_FRANKENSTEIN, beats: [{ atMove: 9, say: "Be7 — the main Frankenstein-Dracula tabiya. Your queen barges on h5, Bb3 keeps the bishop alive, and Nb5 leaps at c7, ripping into Black's queenside. Theory calls it balanced, but the practical pressure is enormous — keep hurling pieces at the king.", sayShort: "Be7 — Nb5 at c7, keep attacking.", arrows: [A('c3', 'b5')], highlights: [H('c7', KEY)] }] },
  'vienna-game::1::Bg7@19': { ...VN_FRANKENSTEIN, beats: [{ atMove: 19, say: "Bg7 — Black tries to trap your a8-knight, but you're up the exchange. Extricate it with Nb6 or Nc7, or give it back for more material; your queen on d5 and the bishops dominate. You've won the Frankenstein battle — convert the material.", sayShort: "Bg7 — extract the knight, you're up material.", highlights: [H('a8', KEY)] }] },
  'vienna-game::2::Nc6@11': { ...VN_QUIET, beats: [{ atMove: 11, say: "Nc6 develops in the quiet Vienna. Play the system: the f4 break is loaded to open the f-file at Black's king, the Nbd2-f1-g3 reroute heads kingside, and your pieces sit harmoniously. A rich maneuvering game where the kingside lever gives the pull.", sayShort: "Nc6 — load the f4 break, press.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::c6@11': { ...VN_QUIET, beats: [{ atMove: 11, say: "c6 props Black's centre. Continue the quiet plan: prepare the f4 break to open lines, reroute Nbd2-f1-g3 kingside, and keep the bishop on f7's diagonal. The maneuvering game favours your kingside lever — improve and break when set.", sayShort: "c6 — prepare f4, reroute the knight.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::Be6@11': { ...VN_QUIET, beats: [{ atMove: 11, say: "Be6 offers to swap your bishop — sidestep with Bb3, keeping it on f7's diagonal. Then the f4 break opens the f-file at the king, and the knight reroutes kingside. Hold the bishop and press the kingside lever.", sayShort: "Be6 — keep the bishop Bb3, then f4.", highlights: [H('f4', KEY)] }] },
  'vienna-game::2::a6@11': { ...VN_QUIET, beats: [{ atMove: 11, say: "a6 — a slow move; your setup is ideal. Spring the plan: the f4 break opens the f-file at Black's king, the knight reroutes Nbd2-f1-g3, and the bishop eyes f7. Nurse the kingside lever into a lasting initiative — improve and break.", sayShort: "a6 — break f4, reroute, press.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::Nc6@5': { ...VN_QUIET, beats: [{ atMove: 5, say: "Nc6 develops in the quiet Vienna; build the system: d3 braces, Nf3 and O-O develop, and the f4 break is loaded to open lines at the king. The harmonious setup and the kingside lever give the pull — develop and break when ready.", sayShort: "Nc6 — d3, Nf3, load the f4 break.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::Nxe4@5': { ...VN_FRANKENSTEIN, beats: [
    { atMove: 5, say: "…Nxe4 grabs the e4-pawn — the critical Frankenstein-Dracula moment. Don't bother recapturing; strike with Qh5! hitting the loose e5-pawn and the e4-knight in one blow.", sayShort: "…Nxe4 — answer Qh5!", arrows: [A('d1', 'h5')], highlights: [H('h5', KEY)] },
    { atMove: 6, say: "Qh5 — the double attack: …Qxe5+ regaining a pawn and Qxe4 regaining the knight both loom. Black scrambles to cover with …Nd6.", sayShort: "Qh5 — double attack, e5 and e4.", arrows: [A('h5', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 7, say: "…Nd6 drops back to block, forking your queen and the c4-bishop. Save the bishop with tempo — slide it to b3 and keep raking f7.", sayShort: "…Nd6 — save the bishop, Bb3.", arrows: [A('d6', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 8, say: "Bb3 tucks the bishop onto the a2-g8 diagonal, still glaring at f7 behind the lines. Black develops …Be7; now you pour pieces at the loosened king.", sayShort: "Bb3 — safe bishop, eye f7.", arrows: [A('b3', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 9, say: "…Be7 — the main tabiya. Nb5 leaps at c7, your queen and bishop rake the kingside, and Black stays tangled. Theory calls it balanced, but over the board the initiative for the pawn is fierce — keep attacking.", sayShort: "…Be7 — Nb5 at c7, attack.", arrows: [A('c3', 'b5')], highlights: [H('c7', KEY)] },
  ] },
  'vienna-game::2::c6@7': { ...VN_QUIET, beats: [{ atMove: 7, say: "c6 props the centre in the quiet line. Continue: Nf3, O-O, and prepare the f4 break to open the f-file. The Nbd2-f1-g3 reroute heads kingside. A patient maneuvering game where the kingside lever gives a small, lasting edge.", sayShort: "c6 — Nf3, O-O, then f4.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::Bb4@5': { ...VN_QUIET, beats: [{ atMove: 5, say: "Bb4 pins your c3-knight — no bother in the quiet Vienna. O-O or Bd2 and a3 unpin, then the f4 break and the Nge2-g3 reroute. Your bishop eyes f7 and the maneuvering game favours your kingside lever — develop and press.", sayShort: "Bb4 — unpin, then break f4.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::2::Nc6@7': { ...VN_QUIET, beats: [{ atMove: 7, say: "Nc6 develops in the quiet Vienna. Build: Nf3, O-O, and load the f4 break to open lines at the king, the bishop on f7's diagonal. The harmonious setup and the kingside lever give the pull — improve and break when set.", sayShort: "Nc6 — Nf3, O-O, prepare f4.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::3::g6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "g6 — Black blocks the queen but bares the dark squares. Qf3 or Qe2 keeps the heat, Nb5 leaps at c7, and the c4-bishop glares at f7. You've a roaring initiative for the pawn — develop with threats and hunt the loosened king.", sayShort: "g6 — Qf3 and Nb5, attack the king.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::3::d5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "d5 blocks the bishop's diagonal — take it: Bxd5 keeps the attack, the queen rakes from h5, and Nb5 eyes c7. Black's king is loose and his pieces tangled; develop with threats and the initiative is worth the pawn.", sayShort: "d5 — take Bxd5, keep attacking.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
  'vienna-game::3::Ng5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Ng5 — the knight jumps to defend, but d4 and h4 chase it while your attack builds. The queen rakes from h5, the c4-bishop eyes f7, and Black is tangled. Develop with threats and press the loose king.", sayShort: "Ng5 — chase it, keep attacking.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::3::Qf6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Qf6 defends f7 awkwardly. Press: Nb5 leaps at c7 and a8, the c4-bishop glares at f7, and d4 opens lines. Black's queen blocks his own pieces; develop with threats and the initiative rolls on for the pawn.", sayShort: "Qf6 — Nb5 and Bc4, press f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::3::Qe7@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 7, say: "Qe7 defends passively. Pour it on: Nb5 hits c7, the c4-bishop rakes f7, and d4 or O-O brings more force. Black's queen clogs his development; keep developing with threats and the loose king is the target.", sayShort: "Qe7 — Nb5, Bc4, hunt the king.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'vienna-game::3::Nc6@5': VN_BC4_DEV,
  'vienna-game::3::Bc5@5': VN_BC4_DEV,
  'vienna-game::3::Bb4@5': VN_BC4_DEV,
  'vienna-game::3::Nc6@9': { ...VN_FRANKENSTEIN, beats: [{ atMove: 9, say: "Nc6 develops in the main line. Spring Nb5! hitting c7 and a8, the b3-bishop and queen rake the kingside, and the threats pile up. Black's king has no shelter; he holds only with precision, so keep forcing and make him find every move.", sayShort: "Nc6 — Nb5 hits c7, pile on.", arrows: [A('c3', 'b5')], highlights: [H('c7', KEY)] }] },
  'vienna-game::3::c6@5': { ...VN_BC4_DEV, beats: [
    { atMove: 5, say: "…c6 prepares the …d5 freeing break — strike first. d4 seizes the centre at once, before Black can get …d5 in on his terms.", sayShort: "…c6 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "d4 grabs the full centre and jabs at e5. Black pins with …Bb4, but you're better developed with more space.", sayShort: "d4 — take the centre, hit e5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 7, say: "…Bb4 pins your c3-knight — a nuisance, not a threat. Bd3, Nf3 or Qe2 and castling consolidate the broad centre and the space edge while you keep the bishop trained on f7.", sayShort: "…Bb4 — consolidate, keep the space.", highlights: [H('c3', SOFT)] },
  ] },
  'vienna-game::4::Bg4@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight in the Hamppe. No fear: h3 puts the question, Be3 and Qd2 develop, and you press the over-extended g5-f4 chain. Your d4-centre and the f-file feed the attack — the gambit pawn buys a roaring initiative.", sayShort: "Bg4 — h3, press the g5 chain.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::h6@11': { ...VN_HAMPPE, beats: [{ atMove: 11, say: "h6 props Black's g5-pawn. Crack the chain anyway: h4 hits g5, O-O and the f-file pressure build, and the c4-bishop eyes f7. Your d4-centre dominates; the gambit pawn buys an attack — pry the kingside open and pour it on.", sayShort: "h6 — h4 cracks g5, attack.", arrows: [A('c4', 'f7')], highlights: [H('g5', KEY), H('f4', SOFT)] }] },
  'vienna-game::4::g4@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "g4 lunges at your knight but over-extends fatally. Ne1 or Ng5 reroutes, and the loosened kingside is riddled with holes — Bxf4, the f-file, and a piece sac on the bared king all loom. Your d4-centre dominates; punish the over-reach.", sayShort: "g4 — reroute, punish the over-reach.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::g4@11': { ...VN_HAMPPE, beats: [{ atMove: 11, say: "g4 thrusts at your f3-knight, but it bares Black's king. Reroute with Ng5 or Ne1, and the holes on f4, f5 and the open f-file become your highway. Your d4-centre and the c4-bishop dominate — punish the loosening over-extension.", sayShort: "g4 — reroute Ng5, punish it.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Nge7@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "Nge7 develops, defending the g-pawns. Press the chain: h4 hits g5, the f-file pressure builds, and Bxf4 recovers the pawn with the initiative. Your d4-centre and the bishop aimed at f7 dominate — pry the kingside open.", sayShort: "Nge7 — h4 and Bxf4, attack.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Bd7@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "Bd7 develops modestly. Press the over-extended kingside: h4 cracks g5, the rook lifts on the f-file, and Bxf4 recovers the pawn with a roaring attack. Your d4-centre dominates — open lines at Black's king.", sayShort: "Bd7 — h4, Bxf4, open the king.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Nh6@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "Nh6 develops toward f5 to defend. Strike the chain: h4 hits g5, Bxf4 recovers the pawn, and the f-file pours at Black's king. Your d4-centre and the c4-bishop dominate the board — pry the kingside open and attack.", sayShort: "Nh6 — h4 and Bxf4, press.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Nh6@11': { ...VN_HAMPPE, beats: [{ atMove: 11, say: "Nh6 heads for f5. Crack the kingside: h4 hits g5, O-O and the f-file build the attack, and Bxf4 recovers the pawn. Your d4-centre dominates and the c4-bishop eyes f7 — the gambit pawn buys a roaring initiative.", sayShort: "Nh6 — h4, Bxf4, attack.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Nge7@11': { ...VN_HAMPPE, beats: [{ atMove: 11, say: "Nge7 develops to bolster the kingside. Press: h4 cracks g5, O-O and the f-file build, and Bxf4 recovers the pawn with the initiative. Your d4-centre and the bishop eyeing f7 dominate — open lines and attack the king.", sayShort: "Nge7 — h4 and Bxf4, press.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::Bc5@5': { ...VN_HAMPPE, beats: [
    { atMove: 5, say: "…Bc5 develops actively instead of grabbing the pawn. Develop with purpose: Nf3 adds a guard to e5 and readies the f4-lever to open the file.", sayShort: "…Bc5 — develop Nf3.", arrows: [A('g1', 'f3')], highlights: [H('f4', KEY)] },
    { atMove: 6, say: "Nf3 leans on e5 and supports the f4-tension. With d3, Bc4 and castling you keep the space and the half-open f-file aimed at Black's king — a comfortable, pressing game.", sayShort: "Nf3 — guard e5, ready f4.", arrows: [A('f3', 'e5')], highlights: [H('e5', SOFT)] },
  ] },
  'vienna-game::5::Qe7@7': VN_GAMBIT_E5,
  'vienna-game::5::d6@9': VN_GAMBIT_E5,
  'vienna-game::5::Nc6@9': VN_GAMBIT_E5,
  'vienna-game::5::Bb4@9': VN_GAMBIT_E5,
  'vienna-game::5::g5@9': VN_GAMBIT_E5,
  'vienna-game::5::Bc5@9': VN_GAMBIT_E5,
  'vienna-game::5::Be7@9': VN_GAMBIT_E5,
  'vienna-game::5::f6@9': VN_GAMBIT_E5,
  'vienna-game::5::h6@9': VN_GAMBIT_E5,
  'vienna-game::5::Bg4@11': VN_GAMBIT_E5,
  'vienna-game::6::Be6@9': { ...VN_G3, beats: [{ atMove: 9, say: "Be6 develops in the Mieses g3 Vienna. Build the system: O-O, d3 and Nf3, the g2-bishop raking the long light diagonal toward Black's queenside. After the central trades you carry a flexible structure — improve and press the long diagonal.", sayShort: "Be6 — O-O, press the long diagonal.", highlights: [H('d5', KEY)] }] },
  'vienna-game::6::Bc5@11': { ...VN_G3, beats: [{ atMove: 11, say: "Bc5 develops; you've recaptured bxc3, gaining the bishop pair and a half-open b-file. The g2-bishop rakes the long diagonal, and after the centre clears your two bishops and the open file give the edge. Develop Nf3 or Ne2 and press.", sayShort: "Bc5 — bishop pair, press the diagonal.", highlights: [H('c5', KEY)] }] },
  'vienna-game::6::c6@9': { ...VN_G3, beats: [{ atMove: 9, say: "c6 props Black's d5-knight. Build the Mieses: O-O, d3 and Nf3, the g2-bishop raking the long diagonal. A calm, strategically rich game where your harmonious setup and the long-diagonal pressure give a durable pull — improve and break.", sayShort: "c6 — O-O, press the long diagonal.", highlights: [H('d5', KEY)] }] },
  'vienna-game::6::c6@11': { ...VN_G3, beats: [{ atMove: 11, say: "c6 props the centre; with bxc3 you hold the bishop pair and the half-open b-file. The g2-bishop rakes the long diagonal, and your two bishops plus the open file give the edge. Develop Nf3, castle, and press both the file and the diagonal.", sayShort: "c6 — bishop pair, press the file.", highlights: [H('b7', KEY)] }] },
  'vienna-game::6::Bd6@11': { ...VN_G3, beats: [{ atMove: 11, say: "Bd6 develops; you've taken bxc3 for the bishop pair and the half-open b-file. The g2-bishop rakes the long diagonal toward b7, and your two bishops give a lasting edge. Castle, develop Nf3, and press the file and the diagonal.", sayShort: "Bd6 — bishop pair, rake the diagonal.", highlights: [H('b7', KEY)] }] },
  'vienna-game::6::Bg4@17': { ...VN_G3, beats: [{ atMove: 17, say: "Bg4 pins your f3-knight in the Mieses — h3 puts the question, or Be3 and Nbd2 around it. The g2-bishop rakes the long diagonal, your structure is sound, and the d4 lever opens lines. The pin is a nuisance — press the long diagonal.", sayShort: "Bg4 — h3, press the long diagonal.", highlights: [H('d4', KEY)] }] },
  'vienna-game::6::Nb6@9': { ...VN_G3, beats: [{ atMove: 9, say: "Nb6 retreats the knight from the centre. Seize space: d4 or c4 expands, the g2-bishop rakes the long diagonal, and Nf3 and O-O develop. Your harmonious Mieses setup gives a small, durable edge — improve the pieces and press.", sayShort: "Nb6 — expand d4, press the diagonal.", highlights: [H('d5', KEY)] }] },
  'vienna-game::6::Be7@11': { ...VN_G3, beats: [{ atMove: 11, say: "Be7 develops solidly; with bxc3 you hold the bishop pair and the half-open b-file. The g2-bishop rakes the long diagonal, and your two bishops plus the open file give the pull. Develop Nf3, castle, and press the file and diagonal.", sayShort: "Be7 — bishop pair, press the file.", highlights: [H('b7', KEY)] }] },
  'vienna-game::6::Bc5@5': { ...VN_G3, beats: [
    { atMove: 5, say: "…Bc5 develops actively against your Mieses g3 setup. Stay the course: Bg2 completes the fianchetto, putting the bishop on the long light diagonal.", sayShort: "…Bc5 — answer Bg2.", arrows: [A('f1', 'g2')], highlights: [H('g2', KEY)] },
    { atMove: 6, say: "Bg2 finishes the fianchetto. With O-O, d3 and Nf3 to follow, the bishop will rake the long diagonal once the centre clears — a calm, strategically rich game where your harmonious setup gives the lasting pull.", sayShort: "Bg2 — fianchetto, long diagonal.", highlights: [H('g2', KEY)] },
  ] },
  'vienna-game::6::Bg4@15': { ...VN_G3, beats: [{ atMove: 15, say: "Bg4 pins your f3-knight — h3 puts the question, or Be3 and Nbd2. The g2-bishop rakes the long diagonal, your structure is harmonious, and the d4 break opens lines. The pin is a trifle; press the long diagonal and the centre.", sayShort: "Bg4 — h3, press the centre.", highlights: [H('d4', KEY)] }] },
  'vienna-game::7::d6@11': VN_QG4,
  'vienna-game::7::Nf6@11': VN_QG4,
  'vienna-game::7::g6@11': VN_QG4,
  'vienna-game::7::Bb6@11': VN_QG4,
  'vienna-game::7::Qg6@9': VN_QG4,
  'vienna-game::7::Na5@11': VN_QG4,
  'vienna-game::7::Bxf2+@9': VN_QG4,
  'vienna-game::7::Bd6@11': VN_QG4,
  'vienna-game::7::Nge7@11': VN_QG4,
  'vienna-game::7::h5@13': VN_QG4,

  // -- Vienna Gambit --
  'vienna-gambit::0::Qe7@7': VG_E5,
  'vienna-gambit::0::Nc6@9': VG_E5,
  'vienna-gambit::0::Bb4@9': VG_E5,
  'vienna-gambit::0::g5@9': VG_E5,
  'vienna-gambit::0::Bc5@9': VG_E5,
  'vienna-gambit::0::d5@9': VG_E5,
  'vienna-gambit::0::Be7@9': VG_E5,
  'vienna-gambit::0::Bg4@11': VG_E5,
  'vienna-gambit::0::f6@9': VG_E5,
  'vienna-gambit::0::h6@9': VG_E5,
  'vienna-gambit::1::Nc6@13': VG_QF3,
  'vienna-gambit::1::Bc5@13': VG_QF3,
  'vienna-gambit::1::c5@13': VG_QF3,
  'vienna-gambit::1::Nd7@13': VG_QF3,
  'vienna-gambit::1::O-O@15': VG_QF3,
  'vienna-gambit::1::c6@13': VG_QF3,
  'vienna-gambit::1::Nd7@15': VG_QF3,
  'vienna-gambit::1::Bg5@15': VG_QF3,
  'vienna-gambit::1::c5@15': VG_QF3,
  'vienna-gambit::1::Nc6@9': { ...VG_QF3, beats: [
    { atMove: 9, say: "…Nc6 develops and props the e4-knight — answer with Bb5, pinning the knight and piling pressure on the loose centre while you complete development.", sayShort: "…Nc6 — answer Bb5.", arrows: [A('f1', 'b5')], highlights: [H('b5', KEY)] },
    { atMove: 10, say: "Bb5 pins the c6-knight and adds a piece to the assault. Your queen rakes from f3, the e5-pawn cramps Black, and you'll regain the material with the better game — develop with threats.", sayShort: "Bb5 — pin, keep the initiative.", arrows: [A('b5', 'c6')], highlights: [H('c6', ATK)] },
  ] },

  // -- Petrov Defence --
  'petrov-defence::0::c4@10': PT_MAIN,
  'petrov-defence::0::Nc3@10': PT_MAIN,
  'petrov-defence::0::Be2@10': PT_MAIN,
  'petrov-defence::0::c4@12': PT_MAIN,
  'petrov-defence::0::c3@12': PT_MAIN,
  'petrov-defence::0::h3@12': PT_MAIN,
  'petrov-defence::0::Nbd2@14': PT_MAIN,
  'petrov-defence::0::Re1@14': PT_MAIN,
  'petrov-defence::0::Nc3@14': PT_MAIN,
  'petrov-defence::0::cxd5@16': PT_MAIN,
  'petrov-defence::1::Nxf7@10': { ...PT_COCHRANE, beats: [{ atMove: 10, say: "Nxf7 — the Cochrane sacrifice in the 3.d4 line. Take it: Kxf7, a clean piece up for a pawn. Now the only task is safety — …d5 shuts the diagonal, the king tucks to g8, and the extra piece decides. Don't panic, don't grab.", sayShort: "Nxf7 — …Kxf7, a piece up.", arrows: [A('e8', 'f7')], highlights: [H('f7', KEY)] }] },
  'petrov-defence::1::Nc3@10': PT_D4,
  'petrov-defence::1::Nf3@10': PT_D4,
  'petrov-defence::1::Bxe4@10': PT_D4,
  'petrov-defence::1::Re1@14': PT_D4,
  'petrov-defence::1::Bf4@10': PT_D4,
  'petrov-defence::1::Qe2@10': PT_D4,
  'petrov-defence::1::Nc3@14': PT_D4,
  'petrov-defence::1::Nd2@12': PT_D4,
  'petrov-defence::2::Bd2@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::f3@10': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Bg5@10': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Bg5@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::e5@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Qd3@10': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Qd4@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::f3@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Bd3@10': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Bd2@10': PT_NC3_TRANSPOSE,
  'petrov-defence::3::Bd3@10': { ...PT_COCHRANE, beats: [{ atMove: 10, say: "Bd3 eyes your king down the b1-h7 road, but you're a whole piece up — just keep tidying. With …d5 already blunting the diagonal, walk the king to g8 behind …Re8 and the material simply wins. The bishop barks; it cannot bite.", sayShort: "Bd3 — tuck the king to g8.", arrows: [A('f7', 'g8')], highlights: [H('g8', KEY), H('d5', SOFT)] }] },
  'petrov-defence::3::Bd3@12': { ...PT_COCHRANE, beats: [{ atMove: 12, say: "Bd3 aims at your king, calmly parried. A piece up with …Re8 already in, walk the king to g8 and untangle with …Nf6 and …c6. White has a bishop pointed at granite and nothing behind it.", sayShort: "Bd3 — king to g8, untangle.", arrows: [A('f7', 'g8')], highlights: [H('g8', KEY)] }] },
  'petrov-defence::3::d5@14': { ...PT_COCHRANE, beats: [{ atMove: 14, say: "d5 jabs your e6-bishop — a tempo, nothing more. Slide it back to f5 or g4, the king is already safe behind …Re8, and your extra piece carries the game. White is just spending moves he can't afford.", sayShort: "d5 — retreat the bishop, stay up.", arrows: [A('e6', 'f5')], highlights: [H('f5', KEY)] }] },
  'petrov-defence::3::f4@12': { ...PT_COCHRANE, beats: [{ atMove: 12, say: "f4 grabs kingside space, but with no pieces behind it the storm is bluster. Strike back with …d5 in the centre, walk the king to g8, and your extra piece overwhelms a lone pawn-push.", sayShort: "f4 — hit …d5, king to g8.", arrows: [A('f7', 'g8')], highlights: [H('d5', KEY), H('g8', SOFT)] }] },
  'petrov-defence::3::Bg5@12': { ...PT_COCHRANE, beats: [{ atMove: 12, say: "Bg5 pins your f6-knight against the queen — shrug it off with …h6. After Bxf6 Bxf6 you've traded into a clean, safe extra piece; tuck the king to g8 and convert at your leisure.", sayShort: "Bg5 — …h6 breaks the pin.", highlights: [H('h6', KEY), H('f6', SOFT)] }] },
  'petrov-defence::3::Be2@12': { ...PT_COCHRANE, beats: [{ atMove: 12, say: "Be2 — a meek developing move that does nothing to your fortress. You're a piece up; finish the job with …Kg8, …c6 and …Nbd7, and the material tells with no counterplay in sight.", sayShort: "Be2 — king to g8, consolidate.", arrows: [A('f7', 'g8')], highlights: [H('g8', KEY)] }] },
  'petrov-defence::3::Qe2@14': { ...PT_COCHRANE, beats: [{ atMove: 14, say: "Qe2 lines the queen up behind the bishop's old diagonal — but you've already blunted it with …Be6. A piece up, walk the king to g8, offer the light-bishop trade, and convert the extra piece.", sayShort: "Qe2 — king to g8, trade down.", arrows: [A('f7', 'g8')], highlights: [H('g8', KEY), H('e6', SOFT)] }] },
  'petrov-defence::3::Nc3@8': { ...PT_COCHRANE, beats: [
    { atMove: 8, say: "Nc3 develops, but without the d4-and-Bc4 pressure White has even less for the sacrificed piece. Trade his dangerous light-squared bishop with …Be6.", sayShort: "Nc3 — answer …Be6.", arrows: [A('c8', 'e6')], highlights: [H('e6', KEY)] },
    { atMove: 9, say: "…Be6 offers to swap White's most dangerous attacker and braces the …d5 wall. Trade it, build the pawn shield, walk the king home, and the extra piece is decisive.", sayShort: "…Be6 — trade, build …d5, convert.", arrows: [A('e6', 'c4')], highlights: [H('d5', SOFT)] },
  ] },
  'petrov-defence::4::Bd3@12': PT_5NC3,
  'petrov-defence::4::Bc4@12': PT_5NC3,
  'petrov-defence::4::Bf4@12': PT_5NC3,
  'petrov-defence::4::bxc3@10': PT_5NC3,
  'petrov-defence::4::Be2@12': PT_5NC3,
  'petrov-defence::4::Bd3@14': PT_5NC3,
  'petrov-defence::4::Bd3@16': PT_5NC3,
  'petrov-defence::4::Nd4@16': PT_5NC3,
  'petrov-defence::4::Bb5@20': PT_5NC3,
  'petrov-defence::4::Bc4@14': PT_5NC3,
  'petrov-defence::5::c4@10': PT_MAIN,
  'petrov-defence::5::c4@12': PT_MAIN,
  'petrov-defence::5::Nc3@10': PT_MAIN,
  'petrov-defence::5::Be2@10': PT_MAIN,
  'petrov-defence::5::h3@12': PT_MAIN,
  'petrov-defence::5::Nbd2@12': PT_MAIN,
  'petrov-defence::5::Qe2@12': PT_MAIN,
  'petrov-defence::5::Re1@16': PT_MAIN,
  'petrov-defence::5::Nc3@16': PT_MAIN,
  'petrov-defence::5::cxd5@16': PT_MAIN,
  'petrov-defence::6::Be3@12': PT_5NC3,
  'petrov-defence::6::Bd3@12': PT_5NC3,
  'petrov-defence::6::Bc4@12': PT_5NC3,
  'petrov-defence::6::bxc3@10': PT_5NC3,
  'petrov-defence::6::Be2@12': PT_5NC3,
  'petrov-defence::6::Bd3@14': PT_5NC3,
  'petrov-defence::6::Bd3@16': PT_5NC3,
  'petrov-defence::6::Bb5@20': PT_5NC3,
  'petrov-defence::6::Bb5@18': PT_5NC3,
  'petrov-defence::6::Bc4@14': PT_5NC3,

  // -- Philidor Defence --
  'philidor-defence::0::Bg5@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "Bg5 pins your f6-knight — ease it with …h6 and …Qc7, or reroute …Nf8-g6. Your Hanham wall is intact; prepare the …exd4 trade or the freeing …d5 break, and the cramp dissolves into a sound game.", sayShort: "Bg5 — …h6, then free with …d5.", highlights: [H('f6', KEY), H('d5', SOFT)] }] },
  'philidor-defence::0::h3@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "h3 — a quiet luft; nothing forcing. Continue the Hanham plan: …Qc7 and …Re8 connect your forces, then strike with …exd4 to open lines or …d5 to free the position. Patience, then the break.", sayShort: "h3 — …Qc7, …Re8, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::0::dxe5@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "dxe5 — White releases the central tension. Recapture …dxe5, and your cramp eases at once: the d-file opens for your rook and your pieces breathe. A comfortable, near-equal middlegame.", sayShort: "dxe5 — recapture, the cramp eases.", highlights: [H('e5', KEY), H('d5', SOFT)] }] },
  'philidor-defence::0::h3@16': { ...PH_HANHAM, beats: [{ atMove: 16, say: "h3 — another slow move; White has nothing forcing. With …a5 fixing the queenside, complete the regroup …Qc7 and …Re8, then prepare the …exd4 or …d5 break. The solid Hanham holds and waits for its moment.", sayShort: "h3 — regroup, then break …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::0::a4@12': { ...PH_HANHAM, beats: [{ atMove: 12, say: "a4 — White expands on the queenside. Meet it with …a5 to fix the pawns, or …c6 and …b5 ideas. Then turn to the centre: …exd4 or …d5 is the freeing break the Hanham lives for. Hold firm and choose your moment.", sayShort: "a4 — fix with …a5, free with …d5.", highlights: [H('d5', KEY), H('a5', SOFT)] }] },
  'philidor-defence::0::Bb3@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "Bb3 retreats the bishop off the c4-d5 diagonal — a quiet improving move. Carry on: …Qc7 and …Re8, then the …exd4 trade or the …d5 break. Your Hanham is rock-solid; uncoil when ready.", sayShort: "Bb3 — …Qc7, …Re8, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::0::a3@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "a3 — a tiny waiting move. White has no break, so prepare your own: …Qc7 connects, …Re8 backs the e-file, and …exd4 or …d5 frees you. The coiled spring uncoils at the right moment.", sayShort: "a3 — prepare …d5 and uncoil.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::0::d5@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "d5 — White closes the centre. The game shifts to the wings: meet it with …c5 and a kingside …f5 break later, or …cxd5 to keep lines fluid. The locked centre suits your patient maneuvering; pick your wing.", sayShort: "d5 — …c5, then a …f5 break.", highlights: [H('c5', KEY), H('f5', SOFT)] }] },
  'philidor-defence::0::Be3@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "Be3 develops the bishop and braces d4. No threat — continue …Qc7 and …Re8, and ready the …exd4 trade or the …d5 break. The Hanham is sound; you maneuver behind the lines and strike when set.", sayShort: "Be3 — maneuver, then break …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::0::b3@16': { ...PH_HANHAM, beats: [{ atMove: 16, say: "b3 — White shores up the queenside. With …a5 fixing the pawns, complete your setup …Qc7 and …Re8 and prepare the central …exd4 or …d5. Patient and bombproof — uncoil at the perfect moment.", sayShort: "b3 — finish …Re8, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::a4@12': { ...PH_HANHAM, beats: [{ atMove: 12, say: "a4 — White expands on the queenside. Meet it with …a5 to fix the pawns, or …c6 and …b5 ideas. Then turn to the centre: …exd4 or …d5 is the freeing break the Hanham lives for. Hold firm and choose your moment.", sayShort: "a4 — fix with …a5, free with …d5.", highlights: [H('d5', KEY), H('a5', SOFT)] }] },
  'philidor-defence::1::a4@10': { ...PH_HANHAM, beats: [{ atMove: 10, say: "a4 — White expands early. Don't rush: castle first with …O-O, meet a5 with …a5 or …a6, and keep the …exd4 and …d5 breaks in reserve. The Hanham is patient; safety first, then the freeing break.", sayShort: "a4 — castle, then free with …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::g4@8': { ...PH_HANHAM, beats: [{ atMove: 8, say: "g4 — White lashes out on the kingside before developing. Stay solid: …h6 and …Nb6 or …c6, and consider castling queenside out of the storm. The over-extension leaves holes — meet the bluster with calm central play.", sayShort: "g4 — stay calm, …h6 and …c6.", highlights: [H('g4', KEY), H('d5', SOFT)] }] },
  'philidor-defence::1::h3@12': { ...PH_HANHAM, beats: [{ atMove: 12, say: "h3 — a quiet luft. Continue the Hanham: …c6 to brace d5, …Qc7 and …Re8 to connect, then the …exd4 or …d5 break. The wall holds; uncoil when the moment comes.", sayShort: "h3 — …c6, …Re8, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::Rg1@8': { ...PH_HANHAM, beats: [{ atMove: 8, say: "Rg1 — White readies a g4 pawn-storm. Forestall it: …h6 and …c6, and tuck the king queenside if the storm comes. The Hanham is bombproof against such loosening lunges; develop calmly and let White over-reach.", sayShort: "Rg1 — …h6, …c6, develop calmly.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::g3@8': { ...PH_HANHAM, beats: [{ atMove: 8, say: "g3 — White heads for a quieter fianchetto setup. Develop in comfort: …Be7, …O-O and …c6, then the …exd4 or …d5 break at leisure. No pressure to meet; your solid Hanham equalizes with ease.", sayShort: "g3 — develop, then free …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::Be2@8': { ...PH_HANHAM, beats: [{ atMove: 8, say: "Be2 — a modest developing move. Continue your setup …Be7, …O-O and …c6, and prepare the freeing …exd4 or …d5. The Hanham is patient and sound; complete development and strike the centre when ready.", sayShort: "Be2 — …Be7, …O-O, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::1::dxe5@6': { ...PH_HANHAM, beats: [
    { atMove: 6, say: "dxe5 — White grabs in the centre, baiting the old trap. You're ready: …Nxe4! snatches the pawn straight back instead of recapturing meekly.", sayShort: "dxe5 — answer …Nxe4.", arrows: [A('f6', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 9, say: "White lunges Qd5, forking your e4-knight and threatening mate on f7 — but …Nc5! skips clear with tempo, attacking the queen. The fork evaporates and material is level.", sayShort: "…Nc5 — hit the queen, fork gone.", arrows: [A('c5', 'd5')], highlights: [H('d5', ATK)] },
    { atMove: 11, say: "Bg5 pins, but …Qd7 calmly steps out, unpinning and developing. The trap is fully defused and the game is balanced — pure accuracy rewarded.", sayShort: "…Qd7 — unpin, trap defused.", highlights: [H('d7', SOFT)] },
  ] },
  'philidor-defence::1::Rd1@14': { ...PH_HANHAM, beats: [{ atMove: 14, say: "Rd1 — White lines the rook behind the d-pawn. Continue the Hanham regroup …Qc7 and …Re8, then the …exd4 or …d5 break. Your structure is solid and your plan clear; uncoil the spring at the right moment.", sayShort: "Rd1 — …Qc7, …Re8, then …d5.", highlights: [H('d5', KEY)] }] },
  'philidor-defence::2::Bd3@8': { ...PH_OPEN, beats: [
    { atMove: 8, say: "Bd3 aims the bishop at your kingside on the b1-h7 diagonal — sidestep its glare with a fianchetto. …g6 prepares …Bg7, blunting the bishop and guarding the dark squares.", sayShort: "Bd3 — answer …g6.", highlights: [H('g6', KEY)] },
    { atMove: 9, say: "…g6 clears the way for …Bg7 to neutralise the d3-bishop and command the long diagonal. Fianchetto, castle, and your Improved Hanham shell is rock-solid and weakness-free.", sayShort: "…g6 — then …Bg7, solid shell.", arrows: [A('f8', 'g7')], highlights: [H('g7', KEY)] },
  ] },
  'philidor-defence::2::Bg5@8': PH_OPEN,
  'philidor-defence::2::Bc4@8': PH_OPEN,
  'philidor-defence::2::Be3@14': PH_OPEN,
  'philidor-defence::2::Nf5@14': PH_OPEN,
  'philidor-defence::2::h3@14': PH_OPEN,
  'philidor-defence::2::Bg5@14': PH_OPEN,
  'philidor-defence::2::Re1@14': PH_OPEN,
  'philidor-defence::2::g3@10': PH_OPEN,
  'philidor-defence::2::Bf4@14': PH_OPEN,
  'philidor-defence::3::Bd3@8': { ...PH_OPEN, beats: [
    { atMove: 8, say: "Bd3 aims the bishop at your kingside on the b1-h7 diagonal — sidestep its glare with a fianchetto. …g6 prepares …Bg7, blunting the bishop and guarding the dark squares.", sayShort: "Bd3 — answer …g6.", highlights: [H('g6', KEY)] },
    { atMove: 9, say: "…g6 clears the way for …Bg7 to neutralise the d3-bishop and command the long diagonal. Fianchetto, castle, and your Improved Hanham shell is rock-solid and weakness-free.", sayShort: "…g6 — then …Bg7, solid shell.", arrows: [A('f8', 'g7')], highlights: [H('g7', KEY)] },
  ] },
  'philidor-defence::3::Bg5@8': PH_OPEN,
  'philidor-defence::3::Bc4@8': PH_OPEN,
  'philidor-defence::3::f4@14': PH_OPEN,
  'philidor-defence::3::Be3@14': PH_OPEN,
  'philidor-defence::3::Re1@14': PH_OPEN,
  'philidor-defence::3::h3@14': PH_OPEN,
  'philidor-defence::3::Bg5@14': PH_OPEN,
  'philidor-defence::3::g3@10': PH_OPEN,
  'philidor-defence::3::Bf4@10': PH_OPEN,
  'philidor-defence::4::Nc3@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Nxe5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Ng3@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Bg5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Nc5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Ng5@8': PH_COUNTERGAMBIT,
  'philidor-defence::4::dxe5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Qxd4@12': PH_COUNTERGAMBIT,
  'philidor-defence::4::dxe5@6': PH_COUNTERGAMBIT,
  'philidor-defence::4::Ne5@12': PH_COUNTERGAMBIT,
  'philidor-defence::5::c3@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "c3 — White braces the centre in the quiet d3 system. Seize your space: …d5 challenges the centre at once, or …Nd4 plants a knight on a strong post. With the freer development, you press for the initiative from at least equality.", sayShort: "c3 — strike …d5 or …Nd4.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY), H('d4', SOFT)] }] },
  'philidor-defence::5::Nc3@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "Nc3 — White develops in the quiet setup. Answer in the centre: …d5 claims your share and opens lines for your pieces, or …Nd4 leaps to a dominant outpost. The freer game and the initiative are yours to take.", sayShort: "Nc3 — claim the centre with …d5.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::d4@4': { ...PH_OPEN, beats: [
    { atMove: 4, say: "d4 — White challenges your Philidor centre at once. Take it: …exd4 trades into the elastic Improved Hanham, where you build a compact, weakness-free shell.", sayShort: "d4 — answer …exd4.", arrows: [A('e5', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 7, say: "…Nf6 develops with a poke at e4, gaining a tempo to complete your setup. …Be7 and …O-O come next behind the solid shell.", sayShort: "…Nf6 — develop, hit e4.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…Be7 and castling finish the compact Hanham shell — no weaknesses, every piece placed. Reroute via …Nf5 or break with …d5 when White over-commits; the position is sound and fully playable.", sayShort: "…Be7 — finish the shell, eye …d5.", highlights: [H('d5', SOFT)] },
  ] },
  'philidor-defence::5::h3@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "h3 — a quiet luft. Take the initiative: …d5 strikes the centre, or …Nd4 and …f5 grab kingside space. White's passive setup hands you the freer, more aggressive game — press it.", sayShort: "h3 — …d5 or …Nd4, press.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::Re1@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "Re1 — White backs the e-pawn. Don't wait: …d5 contests the centre, or the …Nd4 and …Bg4 plan pressures f3 and the kingside. You stand at least equal with the more active pieces — seize the initiative.", sayShort: "Re1 — …d5, then active play.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::Bg5@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "Bg5 pins your f6-knight — break it with …h6, and if Bxf6 Bxf6 you keep the bishop pair. Then …d5 or …Nd4 claims the centre. White's quiet setup gives you the freer game; take the initiative.", sayShort: "Bg5 — …h6, then …d5.", highlights: [H('f6', KEY), H('d5', SOFT)] }] },
  'philidor-defence::5::Be3@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "Be3 develops quietly. Answer with …d5 to challenge the centre, or …Nd4 and …Bg4 for active piece play. White's restrained setup gives you space and the easier plan — press for more from equality.", sayShort: "Be3 — …d5 or …Nd4, take space.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::Nc3@10': { ...PH_D3_QUIET, beats: [{ atMove: 10, say: "Nc3 — White develops the knight in the quiet system. Stake your claim: …Nc6 and …d5, or …c6 and …d5 in one go, contesting the centre. With the freer development you press the initiative from at least equality.", sayShort: "Nc3 — …Nc6 and …d5, equalize.", arrows: [A('b8', 'c6')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::Nbd2@10': { ...PH_D3_QUIET, beats: [{ atMove: 10, say: "Nbd2 — White develops modestly toward a KIA. Take the centre: …Nc6 and …d5, or …c6 preparing …d5. Your freer development and central space give the initiative; keep improving and the …d5 break frees your whole game.", sayShort: "Nbd2 — …Nc6, then …d5.", arrows: [A('b8', 'c6')], highlights: [H('d5', KEY)] }] },
  'philidor-defence::5::b3@12': { ...PH_D3_QUIET, beats: [{ atMove: 12, say: "b3 — White builds a double fianchetto. Strike the centre before he's set: …d5 challenges at once, or …Nd4 plants a knight. The slow setup hands you the freer game and the initiative — don't let White consolidate.", sayShort: "b3 — strike …d5, take the initiative.", arrows: [A('c6', 'd4')], highlights: [H('d5', KEY)] }] },

  // -- Schliemann Defence --
  'schliemann-defence::0::Bc4@4': SCH_ITALIAN,
  'schliemann-defence::0::d4@4': SCH_SCOTCH,
  'schliemann-defence::0::Nc3@4': SCH_FOUR_KNIGHTS,
  'schliemann-defence::0::Nc3@6': SCH_NC3,
  'schliemann-defence::0::d3@6': SCH_D3,
  'schliemann-defence::0::Bxc6@6': SCH_BXC6,
  'schliemann-defence::0::Bxc6@8': { ...SCH_SHARP, beats: [
    { atMove: 8, say: "Bxc6 trades the bishop to dent your pawns — but you've already shoved the e-pawn to e4, cramping White's kingside. Recapture toward the centre and the gambit rolls on with no loss of steam.", sayShort: "Bxc6 — recapture …dxc6.", highlights: [H('c6', KEY), H('e4', ATK)] },
    { atMove: 9, say: "…dxc6 opens the d-file for your rook and frees the light bishop, which now rakes the long diagonal all the way to White's kingside. The e4-pawn jams him, the bishop pair is yours — White won a bishop but handed you the initiative.", sayShort: "…dxc6 — bishop pair, e-pawn cramps.", arrows: [A('c8', 'g4')], highlights: [H('e4', KEY), H('c6', SOFT)] },
  ] },
  'schliemann-defence::1::Bc4@4': SCH_ITALIAN,
  'schliemann-defence::1::d4@4': SCH_SCOTCH,
  'schliemann-defence::1::Nc3@4': SCH_FOUR_KNIGHTS,
  'schliemann-defence::1::Ng1@10': { ...SCH_SHARP, beats: [{ atMove: 10, say: "Ng1 — your e4-pawn has shoved White's knight all the way back to its starting square! That is the Schliemann's dream: huge space and a fistful of tempi. Roll …e3 to cramp further and develop with threats; the initiative is overwhelming.", sayShort: "Ng1 — your e-pawn drove it home!", highlights: [H('e4', KEY), H('g1', SOFT)] }] },
  'schliemann-defence::1::Nc3@6': SCH_NC3,
  'schliemann-defence::1::d3@10': { ...SCH_SHARP, beats: [{ atMove: 10, say: "d3 strikes at your proud e4-pawn — keep it rolling with …e3, jamming forward to freeze White's kingside and clog his development. A pawn down, yes, but the cramping wedge and your lead in development are full value.", sayShort: "d3 — push …e3, jam it deeper.", highlights: [H('e4', KEY), H('e3', ATK)] }] },
  'schliemann-defence::1::d3@6': SCH_D3,
  'schliemann-defence::1::Bxc6@6': SCH_BXC6,
  'schliemann-defence::1::d4@6': SCH_D4,
  'schliemann-defence::1::Bxc6@8': { ...SCH_SHARP, beats: [{ atMove: 8, say: "Bxc6 trades on c6 — recapture …dxc6 and press on. You keep the bishop pair and the cramping e4-wedge, and the open d-file feeds your rooks. White has a pawn; you have the initiative and the better long-term game.", sayShort: "Bxc6 — …dxc6, keep the wedge.", highlights: [H('c6', KEY), H('e4', SOFT)] }] },
  'schliemann-defence::2::Bc4@4': SCH_ITALIAN,
  'schliemann-defence::2::d4@4': SCH_SCOTCH,
  'schliemann-defence::2::Nc3@4': SCH_FOUR_KNIGHTS,
  'schliemann-defence::2::Nc3@6': SCH_NC3,
  'schliemann-defence::2::Bxc6@6': SCH_BXC6,
  'schliemann-defence::2::d4@6': SCH_D4,

  // -- Danish Gambit --
  'danish-gambit::0::Nf6@9': DAN_MAIN,
  'danish-gambit::0::d6@9': DAN_MAIN,
  'danish-gambit::0::Bc5@9': DAN_MAIN,
  'danish-gambit::0::Ne5@9': DAN_MAIN,
  'danish-gambit::0::Nf6@13': { ...DAN_BB4, beats: [{ atMove: 13, say: "Nf6 develops, but you're flying — castled, both bishops raking, the c4-bishop already on f7. Pile in: e5 to kick the knight, or Bg5 and the rooks down the open files. Your initiative is worth the pawn many times over.", sayShort: "Nf6 — pile in: e5 or Bg5.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'danish-gambit::0::Bg4@13': { ...DAN_BB4, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight — no bother. Your bishops blaze: c4 at f7, and with Qb3 you double on f7 and b7 in one stroke. The pin is a trifle against your roaring development; keep developing and attack.", sayShort: "Bg4 — Qb3 doubles on f7.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] }] },
  'danish-gambit::0::Bg4@15': { ...DAN_BB4, beats: [{ atMove: 15, say: "Bg4 pins the knight, but bxc3 handed you the gift: a half-open b-file at b7 and a towering centre. Hit b7 with Qb3 or Rb1, roll d5, and the open lines reach Black's king long before the pawn count matters.", sayShort: "Bg4 — hit b7, roll the centre.", arrows: [A('c4', 'f7')], highlights: [H('b7', KEY), H('d4', SOFT)] }] },
  'danish-gambit::0::Be6@15': { ...DAN_BB4, beats: [{ atMove: 15, say: "Be6 challenges your prized bishop — don't trade tamely. Bxe6 fxe6 wrecks Black's kingside and rips open the f-file for your rook, or Bd3 keeps the bishop aimed at h7. The half-open b-file and the big centre keep the attack alive.", sayShort: "Be6 — Bxe6 wrecks his kingside.", highlights: [H('e6', KEY), H('b7', SOFT)] }] },
  'danish-gambit::0::h6@17': { ...DAN_BB4, beats: [{ atMove: 17, say: "h6 questions your g5-bishop — answer with purpose. Bxf6 doubles Black's pawns and bares his king, or Bh4 keeps the pin. With the open b-file, the c4-bishop and your broad centre, the initiative rolls on either way.", sayShort: "h6 — Bxf6 doubles and bares him.", arrows: [A('g5', 'f6')], highlights: [H('f6', KEY)] }] },
  'danish-gambit::0::Be6@13': { ...DAN_BB4, beats: [{ atMove: 13, say: "Be6 offers to swap your attacking bishop — sidestep with Bd3 or Bb3, keeping it trained on Black's kingside. You're castled and developed for the price of a pawn; hold the bishop and keep the pieces pouring at the king.", sayShort: "Be6 — keep the bishop: Bd3 or Bb3.", arrows: [A('c4', 'd3')], highlights: [H('e6', KEY)] }] },
  // -- Stafford Gambit --
  'stafford-gambit::0::Nc3@8': STAF_ACCEPTED,
  'stafford-gambit::0::Be2@10': STAF_ACCEPTED,
  'stafford-gambit::0::e5@8': STAF_E5,
  'stafford-gambit::0::Nf3@6': STAF_DECLINED,
  'stafford-gambit::0::h3@10': STAF_ACCEPTED,
  'stafford-gambit::0::Be3@10': STAF_ACCEPTED,
  'stafford-gambit::0::d4@6': STAF_DECLINED,
  'stafford-gambit::0::Bc4@8': STAF_ACCEPTED,
  'stafford-gambit::0::Nxf7@6': STAF_CRITICAL,
  'stafford-gambit::0::f3@8': STAF_ACCEPTED,
  'stafford-gambit::1::d3@8': STAF_ACCEPTED,
  'stafford-gambit::1::e5@8': STAF_E5,
  'stafford-gambit::1::Bc4@10': STAF_ACCEPTED,
  'stafford-gambit::1::Nf3@6': STAF_DECLINED,
  'stafford-gambit::1::h3@10': STAF_ACCEPTED,
  'stafford-gambit::1::d4@6': STAF_DECLINED,
  'stafford-gambit::1::Be2@10': STAF_ACCEPTED,
  'stafford-gambit::1::Be3@12': STAF_ACCEPTED,
  'stafford-gambit::1::Bc4@8': STAF_ACCEPTED,
  'stafford-gambit::1::Nxf7@6': STAF_CRITICAL,
  // -- Marshall Attack --
  'marshall-attack::0::Bc4@4': MAR_ITALIAN,
  'marshall-attack::0::d4@4': MAR_SCOTCH,
  'marshall-attack::0::Nc3@4': MAR_FOUR_KNIGHTS,
  'marshall-attack::0::Bxc6@6': { ...MAR_EXCHANGE, beats: [
    { atMove: 6, say: "Bxc6 trades into the Exchange to dent your pawns — but recapture toward the centre and your trumps appear. …dxc6 keeps the bishop pair and opens the d-file for your rook.", sayShort: "Bxc6 — recapture …dxc6.", highlights: [H('c6', KEY)] },
    { atMove: 7, say: "…dxc6 — the d-file is yours and the light bishop is freed to rake the kingside. Doubled c-pawns are no weakness here; with …Bg4, …Qd6 and …f6 you keep the centre fluid and the two bishops do the deciding.", sayShort: "…dxc6 — bishop pair, open d-file.", arrows: [A('c8', 'g4')], highlights: [H('c6', SOFT)] },
  ] },
  'marshall-attack::0::d3@8': { ...MAR_D3, beats: [
    { atMove: 8, say: "d3 — the Anti-Marshall, a quiet Ruy that dodges your gambit before …d5. No problem: settle into a rich maneuvering game with …Bc5, posting the bishop actively on the a7-g1 diagonal.", sayShort: "d3 — answer …Bc5.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY)] },
    { atMove: 9, say: "…Bc5 trains on f2 and the centre. Castle, play …d6, then slide the bishop back to a7 — active but tucked safe from White's b4 and d4 tempo-gainers.", sayShort: "…Bc5 — eye f2, then …Ba7.", arrows: [A('c5', 'f2')], highlights: [H('f2', ATK)] },
    { atMove: 13, say: "…Ba7 sits the bishop on the long diagonal, immune to pawn pushes yet still glaring at your centre and the f2-square. Now the knight begins its tour.", sayShort: "…Ba7 — safe, eyes f2.", arrows: [A('a7', 'f2')], highlights: [H('a7', KEY)] },
    { atMove: 21, say: "…Ng6 completes the classic knight tour from c6 via e7, eyeing f4 and h4 to join a kingside attack. With …O-O and the …d5 break in reserve, you have a rich, fully equal game and every plan in hand.", sayShort: "…Ng6 — knight tour, eye f4.", arrows: [A('g6', 'f4')], highlights: [H('f4', KEY)] },
  ] },
  'marshall-attack::0::d3@10': { ...MAR_D3, beats: [
    { atMove: 10, say: "d3 — the quiet Anti-Marshall, dodging your gambit. Settle in comfortably: …b5 gains queenside space and chases the a4-bishop back.", sayShort: "d3 — answer …b5.", arrows: [A('b7', 'b5')], highlights: [H('b5', KEY)] },
    { atMove: 11, say: "…b5 expands and kicks the bishop to b3. Build the classic Ruy chain with …d6 and castle, then reroute the knight to challenge that bishop.", sayShort: "…b5 — gain space, hit the bishop.", arrows: [A('b5', 'a4')], highlights: [H('a4', ATK)] },
    { atMove: 17, say: "…Na5 jumps to challenge White's strong b3-bishop — the classic Chigorin maneuver. Trade or chase it, then …c5 and …d5 expand in the centre.", sayShort: "…Na5 — challenge the b3-bishop.", arrows: [A('a5', 'b3')], highlights: [H('b3', ATK)] },
    { atMove: 19, say: "…c5 grabs central space and clamps White's d4 break. With …Re8 and the …d5 lever you have a rich, fully equal middlegame and the freer plan.", sayShort: "…c5 — grab space, clamp d4.", arrows: [A('c5', 'd4')], highlights: [H('d4', KEY)] },
  ] },
  'marshall-attack::0::exd5@16': { ...MAR_MAIN, beats: [
    { atMove: 16, say: "exd5 — White grabs the pawn and the Marshall is ON. You've burned e5 for one of chess's most feared attacks: …Nxd5 recaptures and the storm gathers.", sayShort: "exd5 — Marshall on: …Nxd5.", arrows: [A('f6', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 17, say: "…Nxd5 recaptures, the knight proud in the centre. White snatches on e5, but you win it straight back and the e-file rips open for your attack.", sayShort: "…Nxd5 — centralise the knight.", highlights: [H('d5', KEY)] },
    { atMove: 21, say: "…Nf6 redevelops with tempo, eyeing e4 and g4 and clearing d5. The pieces gather now: …Bd6, …Qh4 and …Bb7 swing at White's king while he clings to the pawn.", sayShort: "…Nf6 — regroup, gather the attack.", arrows: [A('f6', 'g4')], highlights: [H('g4', KEY)] },
    { atMove: 23, say: "…Bd6 develops and hits the exposed rook on e5 with tempo, the bishop heading for the b8-h2 diagonal aimed at White's king. The Marshall is in full cry — the initiative is worth far more than the pawn.", sayShort: "…Bd6 — hit the rook, aim h2.", arrows: [A('d6', 'e5')], highlights: [H('e5', ATK)] },
  ] },
  'marshall-attack::0::h3@14': { ...MAR_ANTI, beats: [
    { atMove: 14, say: "h3 — the Anti-Marshall, White stopping …Bg4 and dodging your gambit. Develop naturally: …Bb7 puts the bishop on the long diagonal, training toward e4.", sayShort: "h3 — answer …Bb7.", arrows: [A('c8', 'b7')], highlights: [H('b7', KEY)] },
    { atMove: 15, say: "…Bb7 eyes e4 down the long diagonal — the heart of the Zaitsev setup. Play …d6, then reroute the knight so the bishop's stare on e4 comes alive.", sayShort: "…Bb7 — eye e4, Zaitsev setup.", highlights: [H('e4', KEY)] },
    { atMove: 19, say: "…Na5 challenges White's a2-bishop, the thematic Ruy maneuver, clearing c6 so the b7-bishop bears fully on e4.", sayShort: "…Na5 — hit the bishop, free b7.", arrows: [A('a5', 'b3')], highlights: [H('b3', ATK)] },
    { atMove: 21, say: "…c5 grabs queenside space and prepares to expand. With the knight rerouting back to c6 and the b7-bishop raking e4, you have a rich, balanced Zaitsev middlegame and the freer plan.", sayShort: "…c5 — expand, free the game.", highlights: [H('c5', KEY)] },
  ] },
  'marshall-attack::0::a4@14': { ...MAR_ANTI, beats: [
    { atMove: 14, say: "a4 — the Anti-Marshall, White striking your b5-pawn to dodge the gambit. Push past it: …b4 keeps the queenside chain intact and gains space.", sayShort: "a4 — answer …b4.", arrows: [A('b5', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 15, say: "…b4 locks the queenside and fixes White's c-pawn. With …d6 you complete the Ruy structure and meet his c3-d4 break head-on.", sayShort: "…b4 — lock the queenside.", arrows: [A('b4', 'c3')], highlights: [H('c3', KEY)] },
    { atMove: 19, say: "…Rb8 swings the rook to the half-open b-file, pressuring White's queenside. When he plays d4, you trade on c3 to blast the file open.", sayShort: "…Rb8 — load the b-file.", highlights: [H('b4', SOFT)] },
    { atMove: 21, say: "…bxc3 cracks the queenside open; the b-file is now a highway for your rook bearing down on b2 while the centre resolves in your favour — a rich, equal game with active pieces.", sayShort: "…bxc3 — open the b-file.", arrows: [A('b8', 'b2')], highlights: [H('b2', ATK)] },
  ] },
  'marshall-attack::0::Bxc6@10': { ...MAR_EXCHANGE, beats: [
    { atMove: 10, say: "Bxc6 trades into the Exchange to dent your pawns — but recapture toward the centre and your trumps appear: the bishop pair and an open d-file.", sayShort: "Bxc6 — recapture …dxc6.", highlights: [H('c6', KEY)] },
    { atMove: 11, say: "…dxc6 opens the d-file and frees the light bishop. The doubled c-pawns are no weakness; your two bishops and the file are the lasting trumps.", sayShort: "…dxc6 — bishop pair, open d-file.", arrows: [A('d8', 'd2')], highlights: [H('c6', SOFT)] },
    { atMove: 13, say: "…Qd6 centralises the queen, eyeing the kingside and clearing the back rank for …O-O-O onto the open d-file. Your pieces flow to active squares while White untangles.", sayShort: "…Qd6 — centralise, prep …O-O-O.", highlights: [H('d6', KEY)] },
    { atMove: 17, say: "…O-O-O throws the rook straight behind your queen on the open d-file — a powerful battery bearing down on d3. With the bishop pair and the initiative, yours is the more dangerous game.", sayShort: "…O-O-O — rook to the d-file.", highlights: [H('d3', ATK), H('d6', SOFT)] },
  ] },

  // ── Coverage completion (every remaining course-subline, overriding base) ──
  'ruy-lopez::0::Na5@15': COV_RUY_NA5,
  'ruy-lopez::1::Na5@15': COV_RUY_NA5,
  'ruy-lopez::2::Na5@15': COV_RUY_NA5,
  'ruy-lopez::3::Be7@9': COV_RUY_BE7,
  'ruy-lopez::7::Be7@9': COV_RUY_BE7,
  'ruy-lopez::4::a6@5': COV_RUY_A6,
  'ruy-lopez::5::d6@11': COV_RUY_D6,
  'ruy-lopez::6::d6@11': COV_RUY_D6,
  'ruy-lopez::8::bxc6@7': COV_RUY_BXC6,
  'italian-game::0::d6@7': COV_IT_D6,
  'italian-game::1::d6@7': COV_IT_D6,
  'italian-game::6::d6@7': COV_IT_D6,
  'italian-game::2::Nf6@5': COV_IT_NF6,
  'italian-game::3::Nf6@5': COV_IT_NF6,
  'two-knights-defence::1::Bb5@4': COV_TK_BB5,
  'two-knights-defence::2::Bb5@4': COV_TK_BB5,
  'two-knights-defence::3::Bb5@4': COV_TK_BB5,
  'two-knights-defence::4::Bb5@4': COV_TK_BB5,
  'two-knights-defence::5::Bb5@4': COV_TK_BB5,
  'two-knights-defence::6::Bb5@4': COV_TK_BB5,
  'two-knights-defence::7::Bb5@4': COV_TK_BB5,
  'four-knights-game::0::Nd4@7': COV_FK_ND4,
  'four-knights-game::4::Nd4@7': COV_FK_ND4,
  'four-knights-game::7::Nd4@7': COV_FK_ND4,
  'four-knights-game::8::Bg4@11': COV_FK_BG4,
  'scotch-game::0::d6@5': COV_SC_D6,
  'scotch-game::1::d6@5': COV_SC_D6,
  'scotch-game::2::d6@5': COV_SC_D6,
  'scotch-game::3::d6@5': COV_SC_D6,
  'scotch-game::4::d6@5': COV_SC_D6,
  'scotch-game::5::d6@5': COV_SC_D6,
  'scotch-game::6::d6@5': COV_SC_D6,
  'scotch-game::7::d6@5': COV_SC_D6,
  'vienna-game::0::O-O@13': COV_VN_GAMBIT_OO,
  'vienna-game::2::h6@11': COV_VN_H6,
  'petrov-defence::1::O-O@10': COV_PT_OO,
  'petrov-defence::3::Bc4+@10': COV_PT_BC4,
  'philidor-defence::1::Re1@12': COV_PH_RE1,
};
