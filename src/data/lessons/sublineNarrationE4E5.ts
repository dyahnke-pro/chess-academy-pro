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
export const RUY_BERLIN: SublineNarration = {
  intro: {
    say: "Nf6 — the Berlin Defence, the granite wall Kramnik used to take Kasparov's crown. Black ignores the hit on e5 and just develops, daring you into the famous Berlin endgame. Castle: after …Nxe4, d4, …Nd6, Bxc6 dxc6, dxe5 the queens come off and you nurse a small, nagging pull — Black's doubled c-pawns against your healthy kingside majority. Want queens on? d3 keeps a quiet, lasting Italian-style squeeze.",
    sayShort: 'Nf6 — Berlin: castle and squeeze.',
  },
  beats: [
    { atMove: 5, say: "Nf6 leaves e5 to its fate and bites at e4 instead — pure Berlin nerve. Castle behind your own pressure: the f3-knight already leans on e5, and after Nxe4 d4 Nd6 the queens come off into the endgame you want.", sayShort: "Nf6 — castle, your knight eyes e5.", arrows: [A('f3', 'e5')], highlights: [H('e5', KEY), H('e4', SOFT)] },
  ],
  sources: RUY,
};
// Nf6@5 Berlin where Black follows with …Bc5 (data line): O-O Bc5 c3 O-O d4 Bb6 a4 exd4 e5 Ne4 cxd4 a6 Bxc6 bxc6 Qc2 d5 Qxc6 ...
const RUY_NF6_BC5: SublineNarration = {
  intro: {
    say: "…Nf6 enters the Berlin, but Black follows with …Bc5 rather than the endgame. Take the centre and the space: O-O, c3 and d4 build a broad pawn front, a4 pressures the queenside, and e5 clamps the kingside while you round up material. A rich, space-fuelled Ruy with the easier game.",
    sayShort: '…Nf6 — Berlin …Bc5: build d4, e5.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 enters the Berlin. Castle behind your development; when Black posts …Bc5 you'll answer with c3 and d4, building the broad centre while the b5-bishop keeps the pin on c6.", sayShort: "…Nf6 — castle, prep d4.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 10, say: "d4 strikes the centre; after …Bb6 you own a broad pawn front. a4 will pressure the queenside and e5 clamps the kingside — Black is squeezed for space.", sayShort: "d4 — broad centre, then e5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 14, say: "e5 — the pawn clamps the middle, kicking the f6-knight to e4 while you bank central space. The rolling d4-e5 duo cramps Black's whole game.", sayShort: "e5 — clamp, kick the knight.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 22, say: "Qxc6 scoops a pawn while your central pawns roll on d4 and e5 — you stand with a space bind and the easier game. Black scrambles for activity with …Bg4, but the Berlin space-grab has paid off.", sayShort: "Qxc6 — grab the pawn, space bind.", highlights: [H('c6', KEY), H('e5', SOFT)] },
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
    { atMove: 9, say: "…Nxe4 snatches the e4-pawn — now hammer the centre straight back with d4, before Black consolidates the extra pawn.", sayShort: "…Nxe4 — answer d4.", highlights: [H('e4', ATK)] },
    { atMove: 10, say: "d4 prises the centre open; after …b5 Bb3 …d5 the position unlocks, but your central majority and the Re1 boring down the e-file are the lasting trumps.", sayShort: "d4 — open it, central majority.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 14, say: "dxe5 opens lines — Black's pieces are active, but his loosened queenside from …a6 and …b5 is the chronic weakness. Develop, double on the open files, and press the structural edge.", sayShort: "dxe5 — open lines, press structure.", highlights: [H('e5', SOFT)] },
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
    { atMove: 9, say: "…b5 puts the question to your bishop — slide it to b3, where it still glares down the diagonal toward f7. You concede nothing, and the early …b5 leaves c6 and d5 a shade loose.", sayShort: "…b5 — retreat to b3, eye f7.", arrows: [A('a4', 'b3')], highlights: [H('b3', KEY), H('f7', SOFT)] },
    { atMove: 14, say: "Nc3 challenges the e4-knight and develops with tempo; after the trades you hold the bishop pair and the pressure on Black's loosened queenside.", sayShort: "Nc3 — challenge e4, develop.", arrows: [A('c3', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 20, say: "Nxe5 regains the pawn; with the bishop pair, the open central files and Black's straggling queenside, you press a pleasant, lasting edge.", sayShort: "Nxe5 — regain the pawn, press.", highlights: [H('e5', KEY)] },
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
// d6@11 quiet-d3 Closed Ruy (data: Re1 d6 c3 Bg4 d3 Nd7 Be3 h6 Nbd2 Bg5 h3 Bh5 Nf1 ...)
const RUY_D6_11_D3: SublineNarration = {
  intro: {
    say: "…d6 props the e5-pawn in the Closed Ruy. Build the solid, modern d3 setup: c3 and d3 brace the centre, Be3 develops, and the Nbd2-f1-g3 reroute swings the knight toward the kingside. You own the space and dictate the maneuvering battle.",
    sayShort: '…d6 — d3 setup, reroute the knight.',
  },
  beats: [
    { atMove: 11, say: "…d6 props the e5-pawn — settle into the patient d3 Ruy. c3 braces the centre and prepares the slow, flexible build-up.", sayShort: "…d6 — answer c3.", highlights: [H('e5', SOFT)] },
    { atMove: 14, say: "d3 — the modern, flexible setup, bracing e4 and keeping the position closed. Be3 and the knight reroute follow as you build slowly with the space edge.", sayShort: "d3 — flexible, brace e4.", highlights: [H('d3', KEY)] },
    { atMove: 16, say: "Be3 develops and contests the dark squares; with Nbd2 and the f1-g3 reroute coming, your pieces flow to their best squares while Black maneuvers in a cramped shell.", sayShort: "Be3 — develop, contest the dark squares.", highlights: [H('e3', KEY)] },
    { atMove: 22, say: "Nf1 begins the reroute toward g3 and the kingside — the classic Spanish maneuver. With the space edge and the knight heading for f5, you dictate where the game is fought.", sayShort: "Nf1 — reroute toward g3.", arrows: [A('f1', 'g3')], highlights: [H('g3', KEY)] },
  ],
  sources: RUY_DEV,
};
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
export const IT_TWO_KNIGHTS: SublineNarration = {
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
// Italian …Nf6@5 quiet Giuoco Pianissimo (data: d3 Bc5 c3 Bb6 O-O O-O Re1 d6 h3 h6 Nbd2 Ne7 Nf1 Ng6 ...) — student WHITE
const IT_NF6_PIANISSIMO: SublineNarration = {
  intro: {
    say: "…Nf6 develops and eyes e4 — meet it with the quiet, positional Giuoco Pianissimo. d3 props the centre, c3 prepares a later d4, and the Nbd2-f1-g3 reroute swings the knight toward the kingside while the Bc4 keeps an eye on f7. A rich, lasting pull, no fireworks needed.",
    sayShort: '…Nf6 — quiet Pianissimo, d3.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 develops and eyes e4 — meet it with the quiet Giuoco Pianissimo. d3 props the centre and keeps the tension.", sayShort: "…Nf6 — answer d3.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 6, say: "d3 — the slow build. c3 prepares a later d4, you castle, and the bishop on c4 keeps a permanent eye on f7 as you plan the knight reroute.", sayShort: "d3 — slow build, eye f7.", highlights: [H('d3', KEY)] },
    { atMove: 18, say: "Nf1 begins the classic knight reroute toward g3, heading for f5 and h5, while Bb3 keeps the bishop on the a2-g8 diagonal.", sayShort: "Nf1 — reroute toward g3.", arrows: [A('f1', 'g3')], highlights: [H('g3', KEY)] },
    { atMove: 22, say: "Ng3 completes the reroute, the knight eyeing f5 and h5. With Bb3, the rooks centralised and the kingside build-up underway, you press a comfortable, lasting Italian initiative.", sayShort: "Ng3 — eye f5, build kingside.", arrows: [A('g3', 'f5')], highlights: [H('f5', KEY)] },
  ],
  sources: IT,
};
const IT_GIUOCO_BB6: SublineNarration = {
  intro: {
    say: "…Bb6 — Black tucks the bishop back to safety, leaving you with the prize: a broad, mobile d4-e4 pawn centre. This is the whole point of the c3-d4 Giuoco. Roll the pawns — d5 to gain space and cramp the c6-knight, or develop with Nc3 and pile up — and use your central majority to squeeze Black off the board.",
    sayShort: '…Bb6 — own the centre, push d5.',
  },
  beats: [
    { atMove: 11, say: "Bb6 hands you the prize — a broad d4-e4 centre. Roll it forward: d5 grabs space and cramps the c6-knight, and your central majority squeezes Black off the board.", sayShort: "Bb6 — push d5, cramp c6.", highlights: [H('d5', KEY), H('c6', SOFT)] },
    { atMove: 12, say: "e5 rolls the centre forward, kicking the f6-knight to e4 and grabbing space; your big pawn duo cramps Black's whole game.", sayShort: "e5 — roll the centre, cramp.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 16, say: "exd6 opens lines and dents Black's structure; with the bishop pair and the central majority you press a clear, lasting initiative — develop and pile up.", sayShort: "exd6 — open lines, press.", highlights: [H('d6', SOFT)] }
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
    { atMove: 16, say: "d5! the Greco gambit — sacrifice a pawn to rip the centre open. The c6-knight is kicked back and your raking bishops and open lines roar at Black's king.", sayShort: "d5 — the Greco sac, open it.", arrows: [A('d5', 'c6')], highlights: [H('c6', ATK)] },
    { atMove: 18, say: "O-O completes development; a pawn down, but the open lines, the bishop pair and Black's lagging king give a roaring initiative — Re1 and Bg5 pile in.", sayShort: "O-O — down a pawn, raging attack.", highlights: [H('e4', SOFT)] }
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
    { atMove: 16, say: "Bxf6 removes the kingside defender; after …Qxf6 you castle and the centre rolls while Nd5 looms with tempo. The Greco attack crashes in.", sayShort: "Bxf6 — strip the defender.", highlights: [H('f6', ATK)] },
    { atMove: 20, say: "Nd5 forks the f6-queen and c7, gaining tempo; with the centre, the bishop pair and the initiative, you press a dangerous attack.", sayShort: "Nd5 — fork, press the attack.", arrows: [A('d5', 'f6')], highlights: [H('f6', ATK)] }
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
    { atMove: 6, say: "d3 ducks the sharp Ng5 lunge for a quiet Italian. Settle into a rich maneuvering game: …Bc5 posts the bishop actively on the a7-g1 diagonal.", sayShort: "d3 — answer …Bc5.", arrows: [A('f8', 'c5')], highlights: [H('c5', KEY)] },
    { atMove: 7, say: "…Bc5 eyes f2 and the centre. After c3 you tuck the bishop back to b6 — active but safe from White's d4 tempo-gain — then complete development.", sayShort: "…Bc5 — eye f2, then …Bb6.", arrows: [A('c5', 'f2')], highlights: [H('f2', ATK)] },
    { atMove: 9, say: "…Bb6 retreats the bishop to the long diagonal, still glaring at f2 yet immune to White's b4 and d4 pushes. Castle and begin the knight's tour.", sayShort: "…Bb6 — safe, still eyes f2.", arrows: [A('b6', 'f2')], highlights: [H('b6', KEY)] },
    { atMove: 19, say: "…Ng6 completes the classic knight tour from c6 via e7, eyeing f4 and the kingside. With …Re8 and …Be6 you have a rich, fully equal Italian middlegame and every plan in hand.", sayShort: "…Ng6 — knight tour, eye f4.", arrows: [A('g6', 'f4')], highlights: [H('f4', KEY)] },
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
// four-knights re-anchored line consts (student WHITE)
const FK_ND4_RUBIN: SublineNarration = {
  intro: { say: "…Nd4 — the Rubinstein, Black's sharpest Four Knights try, jumping in instead of defending. Trade and push: Nxd4 exd4, then e5! kicks the f6-knight, and after the dust you stand a step ahead in development with active pieces in an open, double-edged game.", sayShort: '…Nd4 — Nxd4, then e5.' },
  beats: [
    { atMove: 7, say: "…Nd4 leaps in expecting tricks — trade it off cleanly. Nxd4 exd4, and the recaptured pawn on d4 becomes a target.", sayShort: "…Nd4 — answer Nxd4.", arrows: [A('f3', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 10, say: "e5! the pawn punches forward, kicking the f6-knight and seizing the centre while you rip open lines for your pieces.", sayShort: "e5 — kick the knight, open lines.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 12, say: "exf6 — after …Qxf6 you've traded into an open position a step ahead in development, the doubled c-pawns offset by the bishop pair and active play. Castle and press.", sayShort: "exf6 — open, lead in development.", highlights: [H('f6', SOFT)] },
  ],
  sources: FK_INIT,
};
const FK_BD6: SublineNarration = {
  intro: { say: "…Bd6 — a passive bishop that blocks Black's own d-pawn. Develop smoothly and keep the bind: O-O, Ba4 and d3, then a4-a5 to grab queenside space while Black untangles. A small, pleasant, lasting pull.", sayShort: '…Bd6 — develop, a4-a5 squeeze.' },
  beats: [
    { atMove: 7, say: "…Bd6 blocks Black's own d-pawn — a passive square. Develop a step ahead: castle, and keep the bishop pinning down the a4-e8 road.", sayShort: "…Bd6 — castle, keep the pin.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 12, say: "d3 props the centre solidly; with Bb3 raking the a2-g8 diagonal and the a4-a5 push, you cramp Black and dictate the maneuvering battle.", sayShort: "d3 — solid, then a4-a5.", highlights: [H('d3', KEY)] },
    { atMove: 16, say: "a4 grabs queenside space and prepares a5 to fix Black's pawns; with the freer game and the bishop on b3, you press a small, durable pull while Black shuffles for a plan.", sayShort: "a4 — queenside space, fix pawns.", arrows: [A('a4', 'a5')], highlights: [H('a5', KEY)] },
  ],
  sources: FK_CTR,
};
const FK_BC5_PAWN: SublineNarration = {
  intro: { say: "…Bc5 develops actively — but it lets you snatch a pawn. Bxc6 and Nxe5 win the e5-pawn outright, and after the forced trades you reach an endgame a clean pawn up with the healthier structure.", sayShort: '…Bc5 — Bxc6, Nxe5 win a pawn.' },
  beats: [
    { atMove: 7, say: "…Bc5 develops actively, but it drops a pawn. Bxc6 first, smashing Black's structure.", sayShort: "…Bc5 — answer Bxc6.", arrows: [A('b5', 'c6')], highlights: [H('c6', ATK)] },
    { atMove: 8, say: "Bxc6 — and after …dxc6 the e5-pawn hangs. Nxe5 snaps it off; Black's …Bd4 trick doesn't win it back.", sayShort: "Bxc6 — then Nxe5 wins e5.", highlights: [H('e5', ATK)] },
    { atMove: 10, say: "Nxe5 takes the pawn cleanly; through the forced trades you emerge a clean pawn up with the better structure into the endgame. Convert the extra material.", sayShort: "Nxe5 — a pawn up, convert.", highlights: [H('e5', KEY)] },
  ],
  sources: FK_INIT,
};
const FK_D6_SCOTCH: SublineNarration = {
  intro: { say: "…d6 props e5 solidly — strike the centre with d4, the Scotch Four Knights. After the exchanges, Bxc6 damages Black's pawns and e5 grabs space while you develop with the initiative.", sayShort: '…d6 — strike d4, Scotch style.' },
  beats: [
    { atMove: 7, say: "…d6 props e5 — break the centre at once with d4, transposing into a favourable Scotch Four Knights.", sayShort: "…d6 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 cracks the centre; after the exchanges you'll play Bxc6 to dent Black's pawns and e5 to grab space, developing with the initiative.", sayShort: "d4 — crack it, then Bxc6/e5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 16, say: "e5 clamps the centre, kicking the f6-knight and seizing space while Black's doubled c-pawns tell. You press a clear, pleasant initiative.", sayShort: "e5 — clamp, grab space.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
  ],
  sources: FK_CTR,
};
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
    { atMove: 5, say: "…Nf6 hits e4 before recapturing — answer dxe5, grabbing the e5-wedge. After …Nxe4 the centre clears, but your extra space and faster development give the nagging edge.", sayShort: "…Nf6 — answer dxe5.", arrows: [A('d4', 'e5')], highlights: [H('e5', KEY)] },
    { atMove: 6, say: "dxe5 clamps the centre; Black regains the pawn with …Nxe4, but the e5-wedge cramps his game while you develop Bc4 and Bd3 toward his king.", sayShort: "dxe5 — clamp the e5-wedge.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 14, say: "Bc4 develops with the bishop eyeing f7 while your e5-pawn cramps Black. Build with Bd3 and castle, pressing the small space edge into a comfortable middlegame.", sayShort: "Bc4 — eye f7, press the space.", arrows: [A('c4', 'f7')], highlights: [H('f7', SOFT)] },
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
export const EV_BE7: SublineNarration = {
  intro: {
    say: "…Be7 — the meek retreat, tucking the bishop back and declining the gambit's fire. Take the gift of space: d4 builds the full centre, you castle and develop freely, and Black sits cramped with a passive bishop and no counterplay. There are no tricks here — just a clean central clamp and an easy, pleasant initiative to grind.",
    sayShort: '…Be7 — d4 centre, squeeze the passivity.',
  },
  sources: EV_CTR,
};
// Be7@5 Hungarian (e4 e5 Nf3 Nc6 Bc4 Be7 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Ne4 Qf3 d5 exd6 Nxd6 Bd3 ...)
const EV_BE7_5: SublineNarration = {
  intro: {
    say: "…Be7 — the passive Hungarian Defence, Black dodging your Italian. Punish the timidity by seizing the centre: d4 and the exchanges on d4 and c6 let you ram e5, clamping the board and cramping Black while your pieces flow toward his king.",
    sayShort: '…Be7 — seize the centre, d4.',
  },
  beats: [
    { atMove: 5, say: "…Be7 is the modest Hungarian — sidestepping the sharp Italian. Punish the passivity: d4 seizes the full centre at once.", sayShort: "…Be7 — strike d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "d4 — and after the exchanges on d4 and c6 you'll ram e5, gaining a big space advantage while Black's pieces stay cramped and passive.", sayShort: "d4 — seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 12, say: "e5 clamps the centre, kicking the f6-knight to e4 and grabbing space while you develop Qf3 and Bd3 toward the kingside. Black is squeezed for room.", sayShort: "e5 — clamp, gain space.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 18, say: "Bd3 aims the bishop at h7 and Black's king, completing a harmonious setup with the extra central space. Castle and press a pleasant, lasting initiative for the better structure.", sayShort: "Bd3 — aim h7, press the space.", arrows: [A('d3', 'h7')], highlights: [H('h7', ATK)] },
  ],
  sources: EV_CTR,
};
// Be7@9 accepted-Evans meek retreat (...c3 Be7 d4 Na5 Bd3 d6 O-O Nf6 dxe5 dxe5 Nxe5 ...)
const EV_BE7_9: SublineNarration = {
  intro: {
    say: "…Be7 — the meek retreat in the accepted Evans. Build the dream centre: d4 plants it, Bd3 swings the bishop toward Black's king, and after the trades you regain the e5-pawn with a roaring initiative and the bishop pair for your gambit pawn.",
    sayShort: '…Be7 — d4 and Bd3, attack.',
  },
  beats: [
    { atMove: 9, say: "…Be7 tucks the bishop back meekly. Build the dream Evans centre: d4 plants the broad pawns and opens lines for your raking bishops.", sayShort: "…Be7 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 10, say: "d4 — the full centre. Black shuffles the knight to a5, and you swing the bishop to d3, training it on the h7-square and the kingside.", sayShort: "d4 — full centre, then Bd3.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 12, say: "Bd3 rakes the b1-h7 diagonal at Black's king. You castle, recover the e5-pawn, and your two bishops and the lead in development are full value for the gambit pawn.", sayShort: "Bd3 — aim h7, regain e5.", arrows: [A('d3', 'h7')], highlights: [H('h7', ATK)] },
    { atMove: 18, say: "Nxe5 wins back the gambit pawn, the knight landing on a dominant central square eyeing f7. With the bishop pair, the centre and the initiative, the Evans has paid off in full.", sayShort: "Nxe5 — regain the pawn, dominate.", arrows: [A('e5', 'f7')], highlights: [H('f7', ATK)] },
  ],
  sources: EV_CTR,
};
// Nf6@5 — Bc4 Nf6, Black sidesteps into the Two Knights.
const EV_NF6: SublineNarration = {
  intro: {
    say: "…Nf6 develops before you can fire the Evans, so slide into the quiet Giuoco Pianissimo. d3 props the centre, c3 prepares a later d4, and the slow Nbd2-f1-g3 reroute builds a kingside initiative while the Bc4 eyes f7 — a rich, lasting pull, no gambit needed.",
    sayShort: '…Nf6 — quiet Pianissimo, d3.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 develops and eyes e4 before you can launch b4 — slide into the quiet Giuoco Pianissimo instead. d3 props the centre and keeps the tension.", sayShort: "…Nf6 — answer d3.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 6, say: "d3 — the slow build. c3 prepares a later d4, you castle, and the bishop on c4 keeps a permanent eye on f7 while you plan the knight reroute.", sayShort: "d3 — slow build, eye f7.", highlights: [H('d3', KEY)] },
    { atMove: 18, say: "Nf1 begins the classic knight reroute toward g3, heading for f5 and h5 to support a kingside build-up, while Bb3 keeps the bishop trained on the a2-g8 diagonal.", sayShort: "Nf1 — reroute toward g3.", arrows: [A('f1', 'g3')], highlights: [H('g3', KEY)] },
    { atMove: 22, say: "Ng3 completes the reroute, the knight eyeing f5 and h5. With Bb3, the rooks centralised and the kingside build-up underway, you press a comfortable, lasting Italian initiative.", sayShort: "Ng3 — eye f5, build kingside.", arrows: [A('g3', 'f5')], highlights: [H('f5', KEY)] },
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
    say: "d3 — the modern, positional answer, refusing the sharp lines and keeping the centre solid. Defuse it calmly: trade on e4, let White recapture with the d-pawn, and then develop with …d6 and …Be7 behind the half-open f-file. White avoids the fireworks, but you stand at least equal with the freer, more aggressive setup.",
    sayShort: 'd3 — …fxe4, then develop.',
  },
  beats: [
    { atMove: 6, say: "d3 keeps it solid and sidesteps the brawl — no problem. Open the position on your terms with …fxe4; you'll trade White's centre pawn and hand yourself a clean half-open f-file to work with.", sayShort: "d3 — answer …fxe4.", arrows: [A('f5', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 7, say: "…fxe4 — and White recaptures with dxe4, leaving a single central pawn and that lovely open f-file aimed at f2. Now you develop with purpose.", sayShort: "…fxe4 — White retakes dxe4.", arrows: [A('d3', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…a6 puts the question to the b5-bishop, winning the bishop pair or a tempo while you unfurl your slightly freer position behind the half-open f-file.", sayShort: "…a6 — question the bishop.", arrows: [A('a6', 'b5')], highlights: [H('a6', KEY), H('b5', ATK)] }, { atMove: 15, say: "…d6 braces the e5-pawn and frees the c8-bishop; your structure is rock-solid and the half-open f-file is yours to press once you castle.", sayShort: "…d6 — brace e5, free the bishop.", highlights: [H('d6', KEY), H('e5', SOFT)] }, { atMove: 21, say: "…Be7 completes development; you castle next and the rook slides to f8, lining the half-open f-file at f2. White's caution left you the freer, more comfortable game.", sayShort: "…Be7 — develop, then castle.", highlights: [H('e7', KEY), H('f8', SOFT)] },
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
export const COV_RUY_D6: SublineNarration = {
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
    { atMove: 7, say: "…d6 closes the centre for now — your job is to crack it open. The d4 break is the lever, and the c4-bishop's stare down the a2-g8 diagonal keeps f7 a permanent worry.", sayShort: "…d6 — break with d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 strikes; after …Bb6 you take on e5, and exd6 nets a clean pawn while ripping open lines toward Black's king. The central lever pays off.", sayShort: "d4 — crack it, win a pawn.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 12, say: "exd6 grabs the pawn and prises the position open — you stand a clean pawn up with the bishop raking f7 and the freer game. The Pianissimo has turned firmly in your favour.", sayShort: "exd6 — a pawn up, open lines.", highlights: [H('d6', KEY)] },
  ],
  sources: ['book:italian-game', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'],
};
export const COV_IT_NF6: SublineNarration = {
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
export const COV_FK_ND4: SublineNarration = {
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
  'ruy-lopez::0::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::1::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::2::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::3::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::5::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::6::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::7::Nf6@5': RUY_NF6_BC5,
  'ruy-lopez::8::Nf6@5': RUY_NF6_BC5,
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
  'ruy-lopez::0::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 14, say: "c3 — the Spanish spine: you prepare d4 and reserve the c2-retreat for the bishop. Slow and purposeful, building toward the central break.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 18, say: "d4 — the break lands, the centre cracks open and your pieces spring to life; the space and bishop pair are the Closed Ruy's reward.", sayShort: "d4 — crack the centre open.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Nxe5 — the knight grabs the centre with tempo and threats; you've turned the slow build into a sharp, open initiative.", sayShort: "Nxe5 — grab centre, attack.", highlights: [H('e5')] }] },
  'ruy-lopez::1::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 14, say: "c3 — the Spanish spine: you prepare d4 and reserve the c2-retreat for the bishop. Slow and purposeful, building toward the central break.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 18, say: "d4 — the break lands, the centre cracks open and your pieces spring to life; the space and bishop pair are the Closed Ruy's reward.", sayShort: "d4 — crack the centre open.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Nxe5 — the knight grabs the centre with tempo and threats; you've turned the slow build into a sharp, open initiative.", sayShort: "Nxe5 — grab centre, attack.", highlights: [H('e5')] }] },
  'ruy-lopez::2::O-O@13': { ...RUY_CLOSED_OO, beats: [{ atMove: 14, say: "c3 — the Spanish spine: you prepare d4 and reserve the c2-retreat for the bishop. Slow and purposeful, building toward the central break.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 18, say: "d4 — the break lands, the centre cracks open and your pieces spring to life; the space and bishop pair are the Closed Ruy's reward.", sayShort: "d4 — crack the centre open.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Nxe5 — the knight grabs the centre with tempo and threats; you've turned the slow build into a sharp, open initiative.", sayShort: "Nxe5 — grab centre, attack.", highlights: [H('e5')] }] },
  'ruy-lopez::0::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 12, say: "Bxc6 — you trade to snatch the e5-pawn next; Black gets the bishop pair, but you bank a clean central pawn and steady play to hold it.", sayShort: "Bxc6 — trade, win e5 next.", highlights: [H('c6')] }, { atMove: 14, say: "Nxe5 — the point: you've banked the e-pawn. Black drums up activity with Bb7 and d5, but careful play and the extra pawn are yours to convert.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you bolster the extra pawn and seize the centre; with Bg5 to follow and the structure holding, the pawn-up Spanish is a pleasant edge.", sayShort: "d4 — bolster, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4')] }] },
  'ruy-lopez::1::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 12, say: "Bxc6 — you trade to snatch the e5-pawn next; Black gets the bishop pair, but you bank a clean central pawn and steady play to hold it.", sayShort: "Bxc6 — trade, win e5 next.", highlights: [H('c6')] }, { atMove: 14, say: "Nxe5 — the point: you've banked the e-pawn. Black drums up activity with Bb7 and d5, but careful play and the extra pawn are yours to convert.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you bolster the extra pawn and seize the centre; with Bg5 to follow and the structure holding, the pawn-up Spanish is a pleasant edge.", sayShort: "d4 — bolster, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4')] }] },
  'ruy-lopez::2::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 12, say: "Bxc6 — you trade to snatch the e5-pawn next; Black gets the bishop pair, but you bank a clean central pawn and steady play to hold it.", sayShort: "Bxc6 — trade, win e5 next.", highlights: [H('c6')] }, { atMove: 14, say: "Nxe5 — the point: you've banked the e-pawn. Black drums up activity with Bb7 and d5, but careful play and the extra pawn are yours to convert.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you bolster the extra pawn and seize the centre; with Bg5 to follow and the structure holding, the pawn-up Spanish is a pleasant edge.", sayShort: "d4 — bolster, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4')] }] },
  'ruy-lopez::5::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 12, say: "Bxc6 — you trade to snatch the e5-pawn next; Black gets the bishop pair, but you bank a clean central pawn and steady play to hold it.", sayShort: "Bxc6 — trade, win e5 next.", highlights: [H('c6')] }, { atMove: 14, say: "Nxe5 — the point: you've banked the e-pawn. Black drums up activity with Bb7 and d5, but careful play and the extra pawn are yours to convert.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you bolster the extra pawn and seize the centre; with Bg5 to follow and the structure holding, the pawn-up Spanish is a pleasant edge.", sayShort: "d4 — bolster, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4')] }] },
  'ruy-lopez::6::O-O@11': { ...RUY_CLOSED_OO, beats: [{ atMove: 12, say: "Bxc6 — you trade to snatch the e5-pawn next; Black gets the bishop pair, but you bank a clean central pawn and steady play to hold it.", sayShort: "Bxc6 — trade, win e5 next.", highlights: [H('c6')] }, { atMove: 14, say: "Nxe5 — the point: you've banked the e-pawn. Black drums up activity with Bb7 and d5, but careful play and the extra pawn are yours to convert.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you bolster the extra pawn and seize the centre; with Bg5 to follow and the structure holding, the pawn-up Spanish is a pleasant edge.", sayShort: "d4 — bolster, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4')] }] },
  'ruy-lopez::5::d6@13': { ...RUY_CLOSED_D6, beats: [{ atMove: 14, say: "a4 — you lance at the queenside, putting the question to Black's b5-pawn and gaining a target before settling the centre.", sayShort: "a4 — lance the queenside.", arrows: [A('a4', 'b5')], highlights: [H('a4'), H('b5', ATK)] }, { atMove: 16, say: "c3 — the Spanish spine, preparing d4 and the c2-retreat. You keep building patiently while Black's pieces commit.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 20, say: "d3 — a solid centre; you prepare Nbd2-f1-g3, the knight tour to the kingside. Slow Spanish pressure with more space is the plan.", sayShort: "d3 — solid, then Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }] },
  'ruy-lopez::6::d6@13': { ...RUY_CLOSED_D6, beats: [{ atMove: 14, say: "a4 — you lance at the queenside, putting the question to Black's b5-pawn and gaining a target before settling the centre.", sayShort: "a4 — lance the queenside.", arrows: [A('a4', 'b5')], highlights: [H('a4'), H('b5', ATK)] }, { atMove: 16, say: "c3 — the Spanish spine, preparing d4 and the c2-retreat. You keep building patiently while Black's pieces commit.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 20, say: "d3 — a solid centre; you prepare Nbd2-f1-g3, the knight tour to the kingside. Slow Spanish pressure with more space is the plan.", sayShort: "d3 — solid, then Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }] },
  'ruy-lopez::5::d6@15': { ...RUY_CLOSED_D6, beats: [{ atMove: 16, say: "h3 — you make luft and prepare d4, keeping the bishop pair option by questioning any ...Bg4. Slow Spanish build-up.", sayShort: "h3 — luft, prepare d4.", highlights: [H('h3')] }, { atMove: 18, say: "Bxe6 — you trade off Black's good bishop, doubling his e-pawns and handing yourself the bishop pair and the better structure.", sayShort: "Bxe6 — double his pawns.", highlights: [H('e6')] }, { atMove: 20, say: "d4 — the central break lands, opening lines for your pieces against Black's compromised structure; White presses for the full point.", sayShort: "d4 — break, open lines.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'ruy-lopez::7::d6@15': { ...RUY_CLOSED_D6, beats: [{ atMove: 16, say: "a4 — you lance at b5, the standard Arkhangelsk lever, opening the queenside and gaining a target on Black's pawn chain.", sayShort: "a4 — lance b5.", arrows: [A('a4', 'b5')], highlights: [H('a4'), H('b5', ATK)] }, { atMove: 18, say: "Ba2 — the bishop tucks to the safe a2-g8 diagonal, staying aimed at f7 while sidestepping the b5-pawn's advance. Patient pressure.", sayShort: "Ba2 — tuck, stay aimed at f7.", arrows: [A('a2', 'f7')], highlights: [H('a2'), H('f7', SOFT)] }, { atMove: 22, say: "Ng3 — the knight completes the tour to g3, eyeing f5 and the kingside; White's central control and maneuvering chances carry the edge.", sayShort: "Ng3 — toward f5, press.", highlights: [H('g3'), H('f5', SOFT)] }] },
  'ruy-lopez::0::d6@11': RUY_D6_11_D3,
  'ruy-lopez::1::d6@11': RUY_D6_11_D3,
  'ruy-lopez::2::d6@11': RUY_D6_11_D3,
  'ruy-lopez::0::Bg4@15': { ...RUY_BG4, beats: [{ atMove: 16, say: "h3 — you put the question to the g4-bishop at once, winning the bishop pair or forcing it to commit. A useful tempo in the slow Spanish struggle.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 18, say: "d3 — a flexible, solid centre. You keep the tension and prepare the famous Nbd2-f1-g3 knight tour toward the kingside, where your chances lie.", sayShort: "d3 — solid, prepare Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 22, say: "Nbd2 — the knight begins the Spanish journey to f1 and g3, eyeing f5. Patient maneuvering is how White grinds down the Closed Ruy.", sayShort: "Nbd2 — start the knight tour.", highlights: [H('d2'), H('f1', SOFT)] }] },
  'ruy-lopez::1::Bg4@15': { ...RUY_BG4, beats: [{ atMove: 16, say: "h3 — you put the question to the g4-bishop at once, winning the bishop pair or forcing it to commit. A useful tempo in the slow Spanish struggle.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 18, say: "d3 — a flexible, solid centre. You keep the tension and prepare the famous Nbd2-f1-g3 knight tour toward the kingside, where your chances lie.", sayShort: "d3 — solid, prepare Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 22, say: "Nbd2 — the knight begins the Spanish journey to f1 and g3, eyeing f5. Patient maneuvering is how White grinds down the Closed Ruy.", sayShort: "Nbd2 — start the knight tour.", highlights: [H('d2'), H('f1', SOFT)] }] },
  'ruy-lopez::2::Bg4@15': { ...RUY_BG4, beats: [{ atMove: 16, say: "h3 — you put the question to the g4-bishop at once, winning the bishop pair or forcing it to commit. A useful tempo in the slow Spanish struggle.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 18, say: "d3 — a flexible, solid centre. You keep the tension and prepare the famous Nbd2-f1-g3 knight tour toward the kingside, where your chances lie.", sayShort: "d3 — solid, prepare Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 22, say: "Nbd2 — the knight begins the Spanish journey to f1 and g3, eyeing f5. Patient maneuvering is how White grinds down the Closed Ruy.", sayShort: "Nbd2 — start the knight tour.", highlights: [H('d2'), H('f1', SOFT)] }] },
  'ruy-lopez::0::Na5@17': { ...RUY_CHIGORIN, beats: [{ atMove: 18, say: "Bc2 — the bishop tucks to its long diagonal aiming at h7, the standard answer to the Chigorin knight on a5. You're ready to roll the centre.", sayShort: "Bc2 — retreat, aim at h7.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 20, say: "d4 — the central thrust. You challenge e5 and gain space; the a5-knight is offside while your forces converge on the centre and kingside.", sayShort: "d4 — central thrust, space.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 22, say: "d5 — you grab space and close the centre, shifting the battle to the wings; with the kingside maneuver and more room, White's plans flow easier.", sayShort: "d5 — grab space, close centre.", highlights: [H('d5')] }] },
  'ruy-lopez::2::Na5@17': { ...RUY_CHIGORIN, beats: [{ atMove: 18, say: "Bc2 — the bishop tucks to its long diagonal aiming at h7, the standard answer to the Chigorin knight on a5. You're ready to roll the centre.", sayShort: "Bc2 — retreat, aim at h7.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 20, say: "d4 — the central thrust. You challenge e5 and gain space; the a5-knight is offside while your forces converge on the centre and kingside.", sayShort: "d4 — central thrust, space.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 22, say: "d5 — you grab space and close the centre, shifting the battle to the wings; with the kingside maneuver and more room, White's plans flow easier.", sayShort: "d5 — grab space, close centre.", highlights: [H('d5')] }] },
  'ruy-lopez::1::Nb8@17': { ...RUY_BREYER, beats: [{ atMove: 18, say: "d4 — while Black reroutes via the Breyer's ...Nb8-d7, you grab the centre at once. The break gains space and pries open lines for your pieces.", sayShort: "d4 — grab the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Bc2 — the bishop swings to the c2-h7 diagonal, joining the eventual aim at the kingside. The space and bishop pair give White the easier game.", sayShort: "Bc2 — swing to the c2 diagonal.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 22, say: "Nbd2 — the knight heads for f1 and g3, the classic Spanish maneuver. Against the Breyer's slow setup, White's central space carries the pull.", sayShort: "Nbd2 — the Spanish maneuver.", highlights: [H('d2'), H('f1', SOFT)] }] },
  'ruy-lopez::2::Nb8@17': { ...RUY_BREYER, beats: [{ atMove: 18, say: "d4 — while Black reroutes via the Breyer's ...Nb8-d7, you grab the centre at once. The break gains space and pries open lines for your pieces.", sayShort: "d4 — grab the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Bc2 — the bishop swings to the c2-h7 diagonal, joining the eventual aim at the kingside. The space and bishop pair give White the easier game.", sayShort: "Bc2 — swing to the c2 diagonal.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 22, say: "Nbd2 — the knight heads for f1 and g3, the classic Spanish maneuver. Against the Breyer's slow setup, White's central space carries the pull.", sayShort: "Nbd2 — the Spanish maneuver.", highlights: [H('d2'), H('f1', SOFT)] }] },
  'ruy-lopez::0::Bb7@17': { ...RUY_ZAITSEV, beats: [{ atMove: 18, say: "d4 — the central break, right on schedule. You strike at e5 and open the position for your better-placed pieces; the Flohr setup is solid but passive.", sayShort: "d4 — strike e5, open up.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Nbd2 — the knight starts the Spanish rerouting toward f1 and g3, building a kingside attack. Patient pressure outplays the Closed Ruy.", sayShort: "Nbd2 — reroute to the kingside.", highlights: [H('d2'), H('f1', SOFT)] }, { atMove: 22, say: "Nf1 — the knight continues its journey, heading for g3 and the f5- and h5-squares. White's slow kingside build-up is the winning plan.", sayShort: "Nf1 — toward g3 and f5.", highlights: [H('f1'), H('g3', SOFT)] }] },
  'ruy-lopez::1::Bb7@17': { ...RUY_ZAITSEV, beats: [{ atMove: 18, say: "d4 — the central break, right on schedule. You strike at e5 and open the position for your better-placed pieces; the Flohr setup is solid but passive.", sayShort: "d4 — strike e5, open up.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Nbd2 — the knight starts the Spanish rerouting toward f1 and g3, building a kingside attack. Patient pressure outplays the Closed Ruy.", sayShort: "Nbd2 — reroute to the kingside.", highlights: [H('d2'), H('f1', SOFT)] }, { atMove: 22, say: "Nf1 — the knight continues its journey, heading for g3 and the f5- and h5-squares. White's slow kingside build-up is the winning plan.", sayShort: "Nf1 — toward g3 and f5.", highlights: [H('f1'), H('g3', SOFT)] }] },
  'ruy-lopez::6::Bb7@15': { ...RUY_BB7_A4, beats: [{ atMove: 16, say: "d3 — the Anti-Marshall: you sidestep Black's pet gambit with a solid centre, keeping the position closed and your extra tempo intact.", sayShort: "d3 — solid Anti-Marshall.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 18, say: "Nc3 — you develop the knight toward d5, eyeing the central outpost; the slow Spanish squeeze with no Marshall counterplay is pleasant for White.", sayShort: "Nc3 — develop toward d5.", highlights: [H('c3'), H('d5', SOFT)] }, { atMove: 20, say: "Bd5 — the bishop dominates the long diagonal, offering a trade that leaves White with a comfortable space edge and the better minor pieces.", sayShort: "Bd5 — dominate the diagonal.", highlights: [H('d5')] }] },
  'ruy-lopez::7::Bc5@11': { ...RUY_MOLLER, beats: [{ atMove: 12, say: "c3 — you prepare d4, the principled answer to the Morphy ...Bc5, building the centre before Black coordinates.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 14, say: "d4 — the centre rolls, challenging the c5-bishop and e5; you gain space and the initiative in the open Spanish.", sayShort: "d4 — roll the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Bg5 — the bishop pins toward the kingside while your centre stands broad; develop with threats and keep Black tied down.", sayShort: "Bg5 — pin, keep pressing.", highlights: [H('g5')] }] },
  'ruy-lopez::7::Bc5@13': { ...RUY_MOLLER, beats: [{ atMove: 14, say: "Nc3 — you develop toward the d5-outpost, the thematic Arkhangelsk plan, eyeing the hole and central control.", sayShort: "Nc3 — head for d5.", highlights: [H('c3'), H('d5', SOFT)] }, { atMove: 16, say: "Nd5 — the knight plants on the central outpost, hitting f6 and e7; trades there leave White with the better minor pieces and more space.", sayShort: "Nd5 — central outpost.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }, { atMove: 18, say: "Bg5 — the bishop pins toward Black's kingside, adding to the pressure while your knight dominates d5. White holds the pull.", sayShort: "Bg5 — pin, add pressure.", highlights: [H('g5')] }] },
  'ruy-lopez::6::Bc5@9': { ...RUY_BC5_EARLY, beats: [{ atMove: 10, say: "c3 — you prepare the big d4-centre, the principled reply to the Neo-Arkhangelsk bishop on c5; build first, strike next.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 12, say: "d4 — the centre rolls, challenging the c5-bishop and Black's e5-point at once. Space and the central break are White's edge in the open Spanish.", sayShort: "d4 — roll the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 14, say: "Bg5 — the bishop pins toward Black's kingside, adding pressure while your centre stands broad. Develop with threats and keep the initiative.", sayShort: "Bg5 — pin, add pressure.", highlights: [H('g5')] }] },
  'ruy-lopez::7::Bc5@9': { ...RUY_BC5_EARLY, beats: [{ atMove: 10, say: "c3 — you prepare the big d4-centre, the principled reply to the Neo-Arkhangelsk bishop on c5; build first, strike next.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 12, say: "d4 — the centre rolls, challenging the c5-bishop and Black's e5-point at once. Space and the central break are White's edge in the open Spanish.", sayShort: "d4 — roll the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 14, say: "Bg5 — the bishop pins toward Black's kingside, adding pressure while your centre stands broad. Develop with threats and keep the initiative.", sayShort: "Bg5 — pin, add pressure.", highlights: [H('g5')] }] },
  'ruy-lopez::4::Bc5@7': { ...RUY_BC5_EARLY, beats: [{ atMove: 8, say: "c3 — you meet the Beverwijk's ...Bc5 by preparing d4, the central break that challenges the bishop and seizes space.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 10, say: "d4 — the centre rolls, hitting the c5-bishop and e5 together; you gain space and the initiative the open Spanish offers.", sayShort: "d4 — roll, hit c5 and e5.", arrows: [A('d4', 'c5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 14, say: "e5 — the pawn lunges, kicking the f6-knight to e4 and clamping Black's centre; your space and lead in development swell.", sayShort: "e5 — lunge, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'ruy-lopez::7::Be7@11': { ...RUY_BE7_LATE, beats: [{ atMove: 12, say: "d4 — you strike the centre at once; after the trades the queens come off, but your lead in development and the bishop pair give a pull.", sayShort: "d4 — strike the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 18, say: "a4 — you lever the queenside, prising at Black's b5-pawn to open files for your rooks in the endgame; small, lasting pressure.", sayShort: "a4 — lever the queenside.", arrows: [A('a4', 'b5')], highlights: [H('a4'), H('b5', ATK)] }, { atMove: 22, say: "Nc3 — you develop with tempo toward d5, completing your harmonious setup; the better structure carries the Morphy endgame.", sayShort: "Nc3 — develop toward d5.", highlights: [H('c3'), H('d5', SOFT)] }] },
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
  'ruy-lopez::3::exd4@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 14, say: "Nxd4 — you recapture on a strong central square, hitting c6 and eyeing f5. In the Open Ruy, your lead in development answers Black's extra centre pawn.", sayShort: "Nxd4 — strong centre, hit c6.", arrows: [A('d4', 'c6')], highlights: [H('d4'), H('c6', ATK)] }, { atMove: 18, say: "Qe2 — the queen centralises behind the e-file, eyeing the loose e4-knight and preparing Re1. You target Black's advanced piece.", sayShort: "Qe2 — centralise, eye e4.", highlights: [H('e2'), H('e4', SOFT)] }, { atMove: 20, say: "Re1 — the rook piles onto the open e-file, tightening on Black's e4-knight; smooth development is the Open Ruy's antidote.", sayShort: "Re1 — pile on the e-file.", arrows: [A('e1', 'e4')], highlights: [H('e1'), H('e4', ATK)] }] },
  'ruy-lopez::3::d6@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 14, say: "Bd5 — the bishop seizes the centre, hitting the e4-knight and eyeing f7; the Open Ruy rewards activity and punishes Black's loose pieces.", sayShort: "Bd5 — seize the centre.", highlights: [H('d5'), H('e4', ATK)] }, { atMove: 16, say: "Bxe4 — you snap the centralised knight, winning the bishop pair and clarifying the centre in your favour; Black's loose pieces tell.", sayShort: "Bxe4 — snap the knight.", highlights: [H('e4')] }, { atMove: 20, say: "Ne5 — the knight leaps to a dominating central post, hitting f7 and c6; your pieces flood forward as the Open Ruy opens up.", sayShort: "Ne5 — dominate, hit f7.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }] },
  'ruy-lopez::3::Be7@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 14, say: "Nxe5 — you grab the e-pawn, exploiting Black's slow Be7; after the recapture the centre and the initiative are yours.", sayShort: "Nxe5 — grab e5.", highlights: [H('e5')] }, { atMove: 18, say: "Qg4 — the queen swings to the kingside, hitting g7 and the e4-knight while Black scrambles to castle. The attack flows from your lead.", sayShort: "Qg4 — swing at g7 and e4.", arrows: [A('g4', 'g7')], highlights: [H('g4'), H('e4', SOFT)] }, { atMove: 22, say: "Nc3 — you complete development, controlling d5 and the centre; with the bishop pair and the freer game, White stands clearly better.", sayShort: "Nc3 — develop, control d5.", highlights: [H('c3'), H('e4', SOFT)] }] },
  'ruy-lopez::3::Nxd4@13': { ...RUY_OPEN_DEEP, beats: [{ atMove: 14, say: "Nxd4 — you recapture toward the centre, the knight on d4 eyeing f5 and c6; Black's early trade only helped your development.", sayShort: "Nxd4 — recapture, eye f5.", highlights: [H('d4'), H('f5', SOFT)] }, { atMove: 18, say: "Nxe5 — the knight snaps the e-pawn, banking material while Black is still uncastled; your initiative and extra pawn carry the day.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 22, say: "Qf4 — the queen sits actively, holding the extra pawn and eyeing the kingside; with steady play White converts the Open Ruy edge.", sayShort: "Qf4 — hold the pawn, press.", highlights: [H('f4')] }] },
  'ruy-lopez::3::Bc5@15': { ...RUY_OPEN_DEEP, beats: [{ atMove: 16, say: "Bxd5 — you snap off Black's d-pawn, opening lines toward his king while the c5-bishop's ...Bxf2+ check leads nowhere with careful play.", sayShort: "Bxd5 — open lines.", highlights: [H('d5')] }, { atMove: 18, say: "Kh1 — you sidestep the check, and Black's sacrifice has burned out; your extra material and the bishops give a winning position.", sayShort: "Kh1 — sidestep, stay up.", highlights: [H('h1')] }, { atMove: 20, say: "Bxe4 — you grab the centralised knight too, emerging a clear piece or pawns ahead as the smoke clears. The Open Ruy gamble has failed for Black.", sayShort: "Bxe4 — collect, convert.", highlights: [H('e4')] }] },
  'ruy-lopez::4::Be7@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 20, say: "g4 — in the Berlin endgame you grab kingside space, kicking the f5-knight and clamping the structure; the bishop pair and pawn play favour White.", sayShort: "g4 — grab space, kick f5.", arrows: [A('g4', 'f5')], highlights: [H('g4'), H('f5', ATK)] }, { atMove: 22, say: "Nxh4 — you trade off into a comfortable endgame where your kingside majority and active king give a small, lasting pull.", sayShort: "Nxh4 — trade, press the ending.", highlights: [H('h4')] }] },
  'ruy-lopez::4::Be6@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 20, say: "g4 — you seize kingside space in the Berlin endgame, driving the f5-knight back and fixing the structure for the bishop pair.", sayShort: "g4 — seize space, drive f5.", arrows: [A('g4', 'f5')], highlights: [H('g4'), H('f5', ATK)] }, { atMove: 22, say: "Ng5 — the knight jumps in, harrying the e6-bishop and probing the kingside; White's space and the two bishops carry the edge.", sayShort: "Ng5 — harry e6.", arrows: [A('g5', 'e6')], highlights: [H('g5'), H('e6', ATK)] }] },
  'ruy-lopez::4::h6@19': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 20, say: "Bd2 — you develop the bishop toward c3 and the open files in the Berlin endgame, completing your harmonious setup.", sayShort: "Bd2 — develop, eye c3.", highlights: [H('d2')] }, { atMove: 22, say: "Rfd1 — the rook claims the d-file, the standard Berlin endgame lever; with the kingside majority and active pieces, White holds the pull.", sayShort: "Rfd1 — claim the d-file.", highlights: [H('d1')] }] },
  'ruy-lopez::4::Nc4@13': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 14, say: "Qe2 — the queen guards e5 and prepares Rd1, holding your extra central pawn while Black's knight strays to c4.", sayShort: "Qe2 — hold e5, prepare Rd1.", highlights: [H('e2'), H('e5', SOFT)] }, { atMove: 16, say: "Rd1 — the rook claims the open d-file, eyeing Black's queen and cramping his coordination. You keep the structural plus.", sayShort: "Rd1 — claim the d-file.", highlights: [H('d1')] }, { atMove: 20, say: "Bg5 — the bishop develops with pressure on the dark squares; with the better structure and active pieces, White presses the Berlin edge.", sayShort: "Bg5 — pressure, press the edge.", highlights: [H('g5')] }] },
  'ruy-lopez::4::bxc6@11': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 12, say: "dxe5 — you open the centre and drive the d6-knight, gaining space; the Berlin l'Hermet hands you a pleasant lead in development.", sayShort: "dxe5 — open centre, gain space.", highlights: [H('e5')] }, { atMove: 14, say: "Qd3 — the queen eyes the loose f5-knight and the kingside, coordinating your pieces around Black's slightly airy structure.", sayShort: "Qd3 — eye f5, coordinate.", highlights: [H('d3'), H('f5', SOFT)] }, { atMove: 18, say: "Re1+ — the rook checks down the open e-file, harrying Black's uncastled king and gaining tempo for your development.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e7')], highlights: [H('e1')] }] },
  'ruy-lopez::4::Be7@9': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 10, say: "d5 — you shove the centre pawn, kicking the c6-knight and grabbing space; the Rio de Janeiro lets White expand at once.", sayShort: "d5 — shove, kick the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 16, say: "cxb7 — the pawn crashes through to b7, winning material in the tactical melee; precise play leaves White on top.", sayShort: "cxb7 — crash through, win material.", highlights: [H('b7')] }, { atMove: 22, say: "Qxf3 — you recapture with the queen, emerging with a sound extra pawn and the safer king; the Rio adventure favours White.", sayShort: "Qxf3 — recapture, stay up.", highlights: [H('f3')] }] },
  'ruy-lopez::4::d6@7': { ...RUY_BERLIN_ENDGAME, beats: [{ atMove: 8, say: "c3 — you prepare d4 and a broad centre against the Improved Steinitz, building before Black can complete development.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 12, say: "Re1 — the rook backs e4 and the e-file, exposing Black's e4-knight to pressure; your harmonious setup squeezes.", sayShort: "Re1 — back e4, pressure.", highlights: [H('e1'), H('e4', SOFT)] }, { atMove: 20, say: "Nxe5 — you snap the e-pawn in the simplified position, banking material with the freer game; White converts the small plus.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }] },
  'ruy-lopez::8::Bc5@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 14, say: "Qh5+ — the check forks king and the loose c5-bishop; you win the bishop and bank the Exchange Ruy's structural plus, the cleaner pawns.", sayShort: "Qh5+ — fork king and bishop.", arrows: [A('h5', 'c5')], highlights: [H('h5'), H('c5', ATK)] }, { atMove: 16, say: "Qxc5 — you collect the bishop, emerging with the healthier structure and the kingside pawn majority that defines the Exchange Variation.", sayShort: "Qxc5 — collect, better structure.", highlights: [H('c5')] }, { atMove: 18, say: "Nb3 — the knight repositions, guarding and eyeing the queenside; with the sound extra structure White grinds the ending.", sayShort: "Nb3 — reposition, grind.", highlights: [H('b3')] }] },
  'ruy-lopez::8::Bd6@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 14, say: "Qh5+ — the check provokes ...g6, weakening Black's kingside dark squares before you retreat the queen with tempo gained.", sayShort: "Qh5+ — provoke ...g6.", highlights: [H('h5')] }, { atMove: 18, say: "Re1 — the rook seizes the open e-file, the natural Exchange Ruy lever; your healthier structure and active rook give the pull.", sayShort: "Re1 — seize the e-file.", highlights: [H('e1')] }, { atMove: 20, say: "Be3 — you develop the bishop, eyeing the queenside and completing your harmonious setup; the kingside majority is the long-term plus.", sayShort: "Be3 — develop, eye queenside.", highlights: [H('e3')] }] },
  'ruy-lopez::8::Bd6@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 18, say: "Na5 — the knight probes the queenside toward c4 and c6, eyeing the weak squares in Black's doubled-pawn structure.", sayShort: "Na5 — probe toward c4.", highlights: [H('a5'), H('c4', SOFT)] }, { atMove: 20, say: "Nc4 — the knight lands on the fine c4-outpost, hitting the d6-bishop and pressing the queenside; the Exchange edge is structural and lasting.", sayShort: "Nc4 — outpost, hit d6.", arrows: [A('c4', 'd6')], highlights: [H('c4'), H('d6', ATK)] }, { atMove: 22, say: "Bf4 — you develop with tempo, contesting the dark squares; trading into the ending leaves White's kingside majority the deciding factor.", sayShort: "Bf4 — contest, simplify.", highlights: [H('f4')] }] },
  'ruy-lopez::8::Bd7@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 14, say: "Bf4 — the bishop develops actively, eyeing c7 and preparing to trade dark-squared bishops, which suits your healthier structure.", sayShort: "Bf4 — develop, eye c7.", highlights: [H('f4')] }, { atMove: 18, say: "Nf5 — the knight jumps to the strong f5-outpost, forcing concessions and probing the kingside; the Exchange Ruy plus deepens.", sayShort: "Nf5 — strong outpost.", highlights: [H('f5')] }, { atMove: 22, say: "Qh5+ — the check harries Black's king before it finds shelter, gaining tempo while your kingside majority looms as the long-term trump.", sayShort: "Qh5+ — harry the king.", highlights: [H('h5')] }] },
  'ruy-lopez::8::Bd7@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 18, say: "Bf4 — the bishop develops with tempo, eyeing c7 and the open files; in the Exchange ending your healthier kingside majority tells.", sayShort: "Bf4 — develop with tempo.", highlights: [H('f4')] }, { atMove: 20, say: "Nc3 — you complete development toward d5 and e4, controlling the centre; the better structure is the Exchange Variation's enduring edge.", sayShort: "Nc3 — control the centre.", highlights: [H('c3')] }, { atMove: 22, say: "Rxd8+ — you trade rooks into a favourable ending where your kingside pawn majority can roll while Black's queenside is doubled.", sayShort: "Rxd8+ — trade into a better ending.", highlights: [H('d8')] }] },
  'ruy-lopez::8::Be6@17': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 18, say: "Bf4 — the bishop develops with tempo toward c7 and the open files; in the Exchange ending your healthier majority is the plus.", sayShort: "Bf4 — develop with tempo.", highlights: [H('f4')] }, { atMove: 20, say: "Nd4 — the knight recentralises, hitting the e6-bishop and eyeing f5 and c6; you press the structural edge.", sayShort: "Nd4 — recentralise, hit e6.", arrows: [A('d4', 'e6')], highlights: [H('d4'), H('e6', ATK)] }, { atMove: 22, say: "Nc3 — development complete, you control the centre and the d5-square; the kingside pawn majority will decide the ending.", sayShort: "Nc3 — control, then convert.", highlights: [H('c3')] }] },
  'ruy-lopez::8::Ne7@13': { ...RUY_EXCHANGE_DXC6, beats: [{ atMove: 14, say: "Be3 — the bishop develops, eyeing the queenside and supporting your centre; against ...Ne7 you keep the Exchange Ruy structural plus.", sayShort: "Be3 — develop, support centre.", highlights: [H('e3')] }, { atMove: 16, say: "Nc3 — you complete development toward d5, controlling the central light squares while Black's pieces shuffle.", sayShort: "Nc3 — toward d5.", highlights: [H('c3'), H('d5', SOFT)] }, { atMove: 22, say: "Nf5 — the knight leaps to the strong f5-outpost, harrying Black's kingside; your better structure plus the active knight give the edge.", sayShort: "Nf5 — strong outpost.", highlights: [H('f5')] }] },
  'ruy-lopez::5::e4@17': { ...RUY_MARSHALL_E4, beats: [{ atMove: 18, say: "dxc6 — you crash through on c6, grabbing material as Black's Marshall-style ...e4 burns its bridges; precise defence keeps you up.", sayShort: "dxc6 — crash through, win material.", highlights: [H('c6')] }, { atMove: 20, say: "d4 — you return a pawn to blunt the attack and free your pieces, the centre stabilising in your favour with the extra material.", sayShort: "d4 — blunt the attack, free up.", highlights: [H('d4')] }, { atMove: 22, say: "Qf3 — the queen defends the kingside and eyes the long diagonal; with careful play White consolidates the Steiner gambit pawn.", sayShort: "Qf3 — consolidate, defend.", highlights: [H('f3')] }] },

  // ── Italian Game ──
  'italian-game::4::Bc5@5': { ...IT_GP_BC5, beats: [{ atMove: 12, say: "Re1 — you back the e4-pawn and settle into the Pianissimo, the slow Italian; the plan is Nbd2-f1-g3 to reroute toward the kingside.", sayShort: "Re1 — back e4, slow build.", highlights: [H('e1'), H('e4', SOFT)] }, { atMove: 16, say: "Nbd2 — the knight begins its tour to f1 and g3, the thematic Italian maneuver; you build patiently behind the solid d3-centre.", sayShort: "Nbd2 — start the knight tour.", highlights: [H('d2'), H('f1', SOFT)] }, { atMove: 22, say: "Ng3 — the knight reaches g3, eyeing f5 and h5; with the bishop on b3 and the slow build complete, White presses the kingside.", sayShort: "Ng3 — eye f5, press.", highlights: [H('g3'), H('f5', SOFT)] }] },
  'italian-game::5::Bc5@5': { ...IT_GP_BC5, beats: [{ atMove: 12, say: "Re1 — you back the e4-pawn and settle into the Pianissimo, the slow Italian; the plan is Nbd2-f1-g3 to reroute toward the kingside.", sayShort: "Re1 — back e4, slow build.", highlights: [H('e1'), H('e4', SOFT)] }, { atMove: 16, say: "Nbd2 — the knight begins its tour to f1 and g3, the thematic Italian maneuver; you build patiently behind the solid d3-centre.", sayShort: "Nbd2 — start the knight tour.", highlights: [H('d2'), H('f1', SOFT)] }, { atMove: 22, say: "Ng3 — the knight reaches g3, eyeing f5 and h5; with the bishop on b3 and the slow build complete, White presses the kingside.", sayShort: "Ng3 — eye f5, press.", highlights: [H('g3'), H('f5', SOFT)] }] },
  'italian-game::1::Nf6@5': IT_NF6_PIANISSIMO,
  'italian-game::4::Nf6@5': IT_NF6_PIANISSIMO,
  'italian-game::2::Be7@5': { ...IT_HUNGARIAN, beats: [{ atMove: 6, say: "d4 — you punish the passive Hungarian by grabbing the centre at once; the e-pawn rolls and White's space is the lasting plus.", sayShort: "d4 — grab the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 12, say: "e5 — the pawn lunges, kicking the f6-knight and clamping Black's cramped position; White's central space dominates.", sayShort: "e5 — lunge, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'italian-game::3::Be7@5': { ...IT_HUNGARIAN, beats: [{ atMove: 6, say: "d4 — you punish the passive Hungarian by grabbing the centre at once; the e-pawn rolls and White's space is the lasting plus.", sayShort: "d4 — grab the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 12, say: "e5 — the pawn lunges, kicking the f6-knight and clamping Black's cramped position; White's central space dominates.", sayShort: "e5 — lunge, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'italian-game::2::O-O@9': { ...IT_PIANISSIMO, beats: [{ atMove: 9, say: "O-O — both sides settle into the quiet Pianissimo. Play the modern plan: a3 and c3 to prepare a clamping b4 or d4, the Nbd2-f1-g3 tour to the kingside, and Re1 behind the e-pawn. Tiny, lasting space is the whole game.", sayShort: "O-O — a3, c3, the knight tour.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 16, say: "Nbd2 begins the knight reroute toward f1 and g3; with Bb3 raking the a2-g8 diagonal and the rooks centralised, you build the slow Italian bind.", sayShort: "Nbd2 — start the reroute.", highlights: [H('d3', SOFT)] },
    { atMove: 20, say: "Nc4 lands the knight on an active square, eyeing the e5- and d6-points and the kingside; with the space edge you press a small, lasting pull.", sayShort: "Nc4 — active knight, press.", highlights: [H('e5', SOFT)] }
  ] },
  'italian-game::2::a6@13': { ...IT_PIANISSIMO, beats: [{ atMove: 13, say: "a6 — a slow move; you've already built the ideal Pianissimo. Now expand: d4 challenges the centre, or Nbd2-f1-g3 swings the knight kingside. Your small, lasting space edge is the asset — improve and break when set.", sayShort: "a6 — break d4, route the knight.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 16, say: "b4 grabs queenside space and gains tempo, with a4 to follow; you cramp Black while preparing the central d4 break.", sayShort: "b4 — queenside space, prep d4.", highlights: [H('b4', SOFT)] },
    { atMove: 20, say: "d4 strikes the centre at the right moment, your space on both wings squeezing Black. Open lines toward his king and press the bind.", sayShort: "d4 — strike, squeeze the bind.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] }
  ] },
  'italian-game::2::a6@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "a6 — Black marks time. Continue the build: O-O, Re1, Nbd2-f1-g3, and prepare the d4 break. The Pianissimo is a patient squeeze; nurse the space and strike the centre at the right moment.", sayShort: "a6 — build, then break d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 14, say: "Nbd2 reroutes the knight toward f1 and g3 while Bb3 keeps the bishop on the long diagonal; the slow Pianissimo bind builds.", sayShort: "Nbd2 — reroute the knight.", highlights: [H('d3', SOFT)] },
    { atMove: 22, say: "Nf1 heads for g3 and the f5/h5 squares, completing the classic reroute. With Bc2, the rooks centralised and the kingside build-up underway, you press a comfortable initiative.", sayShort: "Nf1 — reroute to g3.", arrows: [A('f1', 'g3')], highlights: [H('g3', KEY)] }
  ] },
  'italian-game::2::a6@9': { ...IT_PIANISSIMO, beats: [{ atMove: 9, say: "a6 — Black slips in a waiting move. Press on: c3 and a3 ready the b4 and d4 breaks, the knight tours toward the kingside, and Re1 backs the e-pawn. Out-manoeuvre from your small, durable space edge.", sayShort: "a6 — c3, a3, then d4 or b4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 14, say: "d4 strikes the centre after the slow build; with c3 supporting and your pieces developed, you crack the position open with the space edge.", sayShort: "d4 — strike the centre.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 16, say: "dxe5 opens the position; you trade into a pleasant pull with the freer development and the bishop on c4 eyeing f7. Press the small edge.", sayShort: "dxe5 — open it, press.", highlights: [H('e5', SOFT)] }
  ] },
  'italian-game::2::a5@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "a5 — Black halts your b4 break. No matter: switch to d4, or the Nbd2-f1-g3 reroute and a kingside expansion. The a5-push loosens b5 for your knight; nurse the space and break in the centre instead.", sayShort: "a5 — break d4, use the b5 hole.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('b5', SOFT)] },
    { atMove: 12, say: "Nbd2 reroutes the knight toward c4 or f1; Re1 and the slow build follow while your Bc4 and central space give the pull.", sayShort: "Nbd2 — reroute, build.", highlights: [H('d3', SOFT)] },
    { atMove: 18, say: "Nxc4 recaptures with a centralised knight, eyeing e5 and d6; with the space edge and harmonious pieces, you press a small, lasting Italian pull.", sayShort: "Nxc4 — central knight, press.", highlights: [H('e5', SOFT)] }
  ] },
  'italian-game::2::h6@11': { ...IT_PIANISSIMO, beats: [{ atMove: 11, say: "h6 — a useful luft. Keep building: O-O, Re1, the Nbd2-f1-g3 tour, and prepare d4. The Pianissimo rewards patience; improve every piece and strike the centre when the moment is right.", sayShort: "h6 — build slowly, then d4.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 12, say: "d4 cracks the centre at once; after …exd4 cxd4 you own the broad d4-e4 duo, cramping Black and pointing your pieces at his king.", sayShort: "d4 — claim the full centre.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 16, say: "d5 advances with tempo, kicking the c6-knight and seizing a big space bind; with Nc3 and the bishop pair, you press a clear, lasting initiative.", sayShort: "d5 — kick the knight, grab space.", highlights: [H('d5', KEY)] }
  ] },
  'italian-game::2::d6@7': { ...IT_PIANISSIMO, beats: [{ atMove: 7, say: "d6 — Black props e5 in the quiet line. Build the modern Italian: O-O, c3 and a3 toward the b4 and d4 breaks, the knight tour to the kingside. Patient maneuvering where your small space edge is the whole game.", sayShort: "d6 — c3, a3, the slow squeeze.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 10, say: "Nbd2 starts the knight toward f1 and g3 while c3 and Bb3 complete the Pianissimo setup; you build slowly with the space edge.", sayShort: "Nbd2 — start the reroute.", highlights: [H('d3', SOFT)] },
    { atMove: 14, say: "Nf1 heads for g3 and the kingside; with Bb3 on the long diagonal and the rooks centralised, you press a comfortable, lasting Italian initiative.", sayShort: "Nf1 — reroute to g3.", arrows: [A('f1', 'g3')], highlights: [H('g3', KEY)] }
  ] },
  'italian-game::0::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::1::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::6::Bb6@11': IT_GIUOCO_BB6,
  'italian-game::2::Bb6@11': { ...IT_PIANISSIMO_BB6, beats: [{ atMove: 12, say: "a4 — you start a queenside expansion, gaining space with a4-b4 while the Pianissimo stays solid; White plays on the wing.", sayShort: "a4 — start queenside expansion.", highlights: [H('a4')] }, { atMove: 14, say: "Nbd2 — the knight routes toward f1 and c4, the thematic Italian maneuver; White builds slowly behind the d3-centre.", sayShort: "Nbd2 — reroute the knight.", highlights: [H('d2'), H('f1', SOFT)] }, { atMove: 16, say: "b4 — the queenside pawns roll, gaining space and the initiative on that wing; White's slow Pianissimo squeeze is underway.", sayShort: "b4 — roll the queenside.", highlights: [H('b4')] }] },
  'italian-game::0::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::6::Bxc3+@13': IT_GRECO_BXC3,
  'italian-game::0::O-O@13': IT_GRECO_OO,
  'italian-game::6::O-O@13': IT_GRECO_OO,
  'italian-game::0::d6@13': { ...IT_GRECO_BREAK, beats: [
    { atMove: 13, say: "d6 challenges your big centre — don't let it be undermined cheaply. Hold the duo with d5 or Bg5 and a-pawn ideas, and keep developing. The centre is your engine; protect it, then advance it at Black's king.", sayShort: "d6 — defend the centre, then advance.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY), H('d5', SOFT)] },
    { atMove: 14, say: "d5 advances with tempo, kicking the c6-knight to the rim and grabbing a big space bind; your central majority and bishop pair squeeze Black.", sayShort: "d5 — kick the knight, grab space.", highlights: [H('d5', KEY)] },
    { atMove: 18, say: "O-O finishes development behind the broad centre; with the space edge and the two bishops, you press a comfortable, lasting initiative — roll the e-pawn at the king.", sayShort: "O-O — press the central bind.", highlights: [H('d5', SOFT)] },
  ] },
  'italian-game::6::d6@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 14, say: "d5 — you shove the pawn, kicking the c6-knight and grabbing a protected passed pawn; White's centre and bishop pair give the edge.", sayShort: "d5 — shove, kick the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 18, say: "O-O — you castle, the broad centre and bishop pair backing a kingside build-up; White presses the Greco Attack's space.", sayShort: "O-O — castle, press.", highlights: [H('g1')] }] },
  'italian-game::0::d5@13': { ...IT_GRECO_BREAK, beats: [
    { atMove: 13, say: "d5 strikes back in the centre — meet it with e5, clamping and gaining space, or exd5 to keep the lines open. Your broad centre and the bishop trained on f7 keep the initiative; advance the pawns at the king.", sayShort: "d5 — answer e5, clamp the centre.", highlights: [H('e5', KEY), H('d5', SOFT)] },
    { atMove: 14, say: "exd5 takes the pawn; after …Nxd5 the centre clears, and your isolated d4-pawn is a mobile, attacking spearhead supporting e5 and c5 advances.", sayShort: "exd5 — open it, mobile d-pawn.", highlights: [H('d4', KEY)] },
    { atMove: 16, say: "O-O castles behind the active d4-pawn; with the bishop pair and the half-open files, you press the initiative — Re1 and the pieces flood toward Black's king.", sayShort: "O-O — active d-pawn, press.", highlights: [H('d4', SOFT)] },
  ] },
  'italian-game::6::d5@13': { ...IT_GRECO_BREAK, beats: [{ atMove: 14, say: "exd5 — you open the centre, and after the trades the doubled c-pawns come with the bishop pair and the open b-file; White is comfortable.", sayShort: "exd5 — open the centre.", highlights: [H('d5')] }, { atMove: 16, say: "O-O — you castle, the bishop pair and the half-open files giving White an easy game against the loosened structure.", sayShort: "O-O — castle, easy game.", highlights: [H('g1')] }] },
  'italian-game::0::Nxc3@15': { ...IT_MOLLER, beats: [{ atMove: 16, say: "bxc3 — you recapture, the doubled pawns bringing the bishop pair and a raging centre; the Greco Gambit's compensation is the open lines.", sayShort: "bxc3 — bishop pair, open lines.", highlights: [H('c3')] }, { atMove: 20, say: "Ne5 — the knight leaps to a dominating central post, hitting f7 and d7 and harrying Black; White's initiative is full value.", sayShort: "Ne5 — dominate, hit f7.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }] },
  'italian-game::6::Bxc3@15': { ...IT_MOLLER, beats: [{ atMove: 16, say: "d5! — the Greco Gambit thunderbolt: you shove the pawn, hitting c6 and clearing the centre for a raging attack on Black's stranded king.", sayShort: "d5 — thunderbolt, hit c6.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 20, say: "Rxe4 — you regain the piece, the rook swinging into the attack; White's initiative and the d-pawn deep in Black's camp are decisive.", sayShort: "Rxe4 — regain, attack.", highlights: [H('e4')] }] },
  'italian-game::1::O-O@15': { ...IT_BD2_QUIET, beats: [{ atMove: 16, say: "d5 — you grab space with the protected passed pawn, kicking the knight to e7; White's centre and freer pieces give the pull.", sayShort: "d5 — grab space, kick the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 18, say: "O-O — you castle, the big d5-pawn cramping Black; White's space advantage is the comfortable Greco Traditional edge.", sayShort: "O-O — castle, cramp him.", highlights: [H('g1'), H('d5', SOFT)] }] },
  'italian-game::1::Nce7@19': { ...IT_BD2_FREEING, beats: [{ atMove: 20, say: "O-O — you castle, the queen on b3 eyeing b7 and f7; with active pieces around Black's king, White holds the initiative.", sayShort: "O-O — castle, press the king.", highlights: [H('g1')] }, { atMove: 22, say: "Rfe1 — the rook seizes the open e-file, completing development; White's harmonious setup and queenside pressure give the edge.", sayShort: "Rfe1 — seize the e-file.", highlights: [H('e1')] }] },
  'italian-game::1::Na5@23': { ...IT_BD2_FREEING, beats: [{ atMove: 23, say: "Na5 hits your queen again, shuffling for the draw — sidestep and keep pressing. The bishop and queen eye f7 and d5, the isolated pawn is dynamic not weak, and you hold the freer game. Avoid the repetition and play for more.", sayShort: "Na5 — keep pressing, avoid the draw.", highlights: [H('d5', KEY), H('f7', SOFT)] }] },
  'italian-game::1::d6@15': { ...IT_BD2_D6, beats: [{ atMove: 16, say: "d5 — the spearhead grabs space and kicks the c6-knight back; White's protected passed pawn and freer pieces give a pleasant pull.", sayShort: "d5 — grab space, kick the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 20, say: "Re1 — the rook claims the open e-file behind your advanced centre; White presses the space and the better-placed pieces.", sayShort: "Re1 — claim the e-file.", highlights: [H('e1')] }] },
  'italian-game::0::a6@7': { ...IT_GP_WAIT, beats: [
    { atMove: 7, say: "…a6 is a slow waiting move — pounce on the free tempo. d4 strikes the centre at once, before Black is ready for it.", sayShort: "…a6 — strike d4 now.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 cracks the centre open. Black tucks the bishop to a7, and now the tactical Nxe5 wins a pawn or tears open the e-file toward his king.", sayShort: "d4 — crack it, then Nxe5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 14, say: "Qh5 swings the queen to the kingside, hammering f7 while the e5-pawn cramps and the Bc4 glares in. Your initiative rolls — the lazy …a6 cost Black dearly.", sayShort: "Qh5 — hammer f7, attack.", arrows: [A('h5', 'f7')], highlights: [H('f7', ATK)] },
  ] },
  'italian-game::1::a6@7': { ...IT_GP_WAIT, beats: [
    { atMove: 7, say: "…a6 is a slow waiting move — pounce on the free tempo. d4 strikes the centre at once, before Black is ready for it.", sayShort: "…a6 — strike d4 now.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 cracks the centre open. Black tucks the bishop to a7, and now the tactical Nxe5 wins a pawn or tears open the e-file toward his king.", sayShort: "d4 — crack it, then Nxe5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 14, say: "Qh5 swings the queen to the kingside, hammering f7 while the e5-pawn cramps and the Bc4 glares in. Your initiative rolls — the lazy …a6 cost Black dearly.", sayShort: "Qh5 — hammer f7, attack.", arrows: [A('h5', 'f7')], highlights: [H('f7', ATK)] },
  ] },
  'italian-game::6::a6@7': { ...IT_GP_WAIT, beats: [{ atMove: 10, say: "Nxe5 — you snap the centre pawn, exploiting the slow a6; with the extra pawn and the bishop on c4, White stands better.", sayShort: "Nxe5 — snap the centre pawn.", highlights: [H('e5')] }, { atMove: 14, say: "Qh5 — the queen swings to the kingside, eyeing f7 and h7 and probing Black's king; White's initiative and material tell.", sayShort: "Qh5 — probe the kingside.", highlights: [H('h5'), H('f7', SOFT)] }] },
  'italian-game::0::h6@7': { ...IT_GP_WAIT, beats: [
    { atMove: 7, say: "…h6 is a slow luft — pounce on the tempo. d4 strikes the centre while Black dawdles.", sayShort: "…h6 — strike d4 now.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 — and after …exd4 cxd4 you own the classical centre, the broad d4-e4 duo cramping Black. Develop Nc3, castle, and point the pieces at his king.", sayShort: "d4 — claim the full centre.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 12, say: "Nc3 develops behind the broad centre; with Re1, the Bc4 on f7 and your space edge, you press a lasting Italian pull while Black defends passively.", sayShort: "Nc3 — develop behind the centre.", highlights: [H('d4', KEY), H('e4', SOFT)] },
  ] },
  'italian-game::1::h6@7': { ...IT_GP_WAIT, beats: [
    { atMove: 7, say: "…h6 is a slow luft — pounce on the tempo. d4 strikes the centre while Black dawdles.", sayShort: "…h6 — strike d4 now.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 8, say: "d4 — and after …exd4 cxd4 you own the classical centre, the broad d4-e4 duo cramping Black. Develop Nc3, castle, and point the pieces at his king.", sayShort: "d4 — claim the full centre.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 12, say: "Nc3 develops behind the broad centre; with Re1, the Bc4 on f7 and your space edge, you press a lasting Italian pull while Black defends passively.", sayShort: "Nc3 — develop behind the centre.", highlights: [H('d4', KEY), H('e4', SOFT)] },
  ] },
  'italian-game::6::h6@7': { ...IT_GP_WAIT, beats: [{ atMove: 8, say: "d4 — the central break, the heart of the Classical Italian; you build the big d4-e4 centre and seize space.", sayShort: "d4 — the central break.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 12, say: "Nc3 — you develop the knight toward d5, supporting the broad centre; White's space and active pieces give a pleasant pull.", sayShort: "Nc3 — develop toward d5.", highlights: [H('c3'), H('d5', SOFT)] }] },
  'italian-game::0::Qf6@7': { ...IT_GP_WAIT, intro: { say: "…Qf6 brings the queen out early to eye f2 — but it's a target, not a threat. Gain space and tempo: b4 nudges the c5-bishop back, a4 and b5 cramp the queenside, and d4 claims the centre while Black's queen sits awkwardly.", sayShort: "…Qf6 — gain space, b4 and d4." }, beats: [
    { atMove: 7, say: "…Qf6 develops the queen early, eyeing f2 — but it's exposed. b4 gains queenside space with tempo, nudging the c5-bishop back.", sayShort: "…Qf6 — answer b4.", arrows: [A('b2', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 8, say: "b4 hits the bishop and grabs space; a4 and b5 follow to cramp Black, and d4 claims the centre while his queen is misplaced.", sayShort: "b4 — gain space, hit the bishop.", arrows: [A('b4', 'c5')], highlights: [H('c5', ATK)] },
    { atMove: 14, say: "d4 seizes the centre — your space on both wings squeezes Black while the early …Qf6 has cost him coordination. Castle and press the bind.", sayShort: "d4 — seize the centre, squeeze.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
  ] },
  'italian-game::1::Qf6@7': { ...IT_GP_WAIT, beats: [{ atMove: 8, say: "b4 — you gain queenside space with tempo, hitting the c5-bishop and expanding while Black's early queen sortie loses time.", sayShort: "b4 — gain space, hit c5.", arrows: [A('b4', 'c5')], highlights: [H('b4'), H('c5', ATK)] }, { atMove: 14, say: "d4 — the central break, seizing the centre while Black's pieces are passive; your space on both wings gives White the easier game.", sayShort: "d4 — break, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'italian-game::6::Qf6@7': { ...IT_GP_WAIT, beats: [{ atMove: 8, say: "b4 — you gain queenside space with tempo, hitting the c5-bishop and expanding while Black's early queen sortie loses time.", sayShort: "b4 — gain space, hit c5.", arrows: [A('b4', 'c5')], highlights: [H('b4'), H('c5', ATK)] }, { atMove: 14, say: "d4 — the central break, seizing the centre while Black's pieces are passive; your space on both wings gives White the easier game.", sayShort: "d4 — break, seize the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'italian-game::3::d6@11': { ...IT_EVANS, beats: [{ atMove: 12, say: "Qb3 — the queen swings to b3, training the battery with your c4-bishop straight at f7. Black must spend a tempo defending; you develop with constant threats.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Bb5 — pinning and pressuring c6, you prepare to trade and open lines while Black's king lingers. The two open files and the bishop pair pay for the pawn.", sayShort: "Bb5 — pin c6, open lines.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', SOFT)] }] },
  'italian-game::3::Ne5@17': { ...IT_EVANS_DEEP, beats: [{ atMove: 18, say: "Nxe5 — you trade off Black's centralised knight and keep your pawn duo and the open lines; the d5-wedge cramps him badly.", sayShort: "Nxe5 — trade, keep the wedge.", highlights: [H('e5'), H('d5', SOFT)] }, { atMove: 22, say: "Ba3 — the bishop rakes to a3, hitting the e7-knight's shelter and the dark squares while Black scrambles to castle. Pressure everywhere.", sayShort: "Ba3 — rake, pressure the king.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'italian-game::3::Bg4@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 16, say: "d5! — you push the spearhead, hitting c6 and ignoring the g4-pin; the centre rolls and Black's pieces scramble to cope.", sayShort: "d5 — push, hit c6.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 18, say: "Qa4 — the queen swings out with tempo, pinning c6 and the queenside; sharp complications favour the side with the initiative — you.", sayShort: "Qa4 — pin c6, keep initiative.", arrows: [A('a4', 'c6')], highlights: [H('a4'), H('c6', ATK)] }] },
  'italian-game::3::Nf6@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 16, say: "Nbd2 — the knight routes to c4 or f1-g3, the classic Evans regrouping behind your broad d4-e4 centre. Smooth mobilisation, a pawn down and pressing.", sayShort: "Nbd2 — regroup behind the centre.", highlights: [H('d2'), H('c4', SOFT)] }, { atMove: 18, say: "d5 — you clamp the centre, shoving the c6-knight to the rim; with more space and the bishop pair, the long-term pull is yours.", sayShort: "d5 — clamp, gain the pull.", arrows: [A('d5', 'c6')], highlights: [H('d5')] }] },
  'italian-game::3::Nce7@17': { ...IT_EVANS_DEEP, beats: [{ atMove: 18, say: "e5 — the second pawn rolls, clamping the centre and opening lines while Black's knights are tangled on the back ranks.", sayShort: "e5 — roll, clamp the centre.", highlights: [H('e5'), H('d6', SOFT)] }, { atMove: 22, say: "Bb5+ — the check disrupts Black's coordination and trades to leave you the freer game with the powerful d-pawns; the gambit has paid off.", sayShort: "Bb5+ — disrupt, stay freer.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'italian-game::3::Nge7@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 16, say: "Ng5 — the knight pounces at f7, and with Qb3 coming the threats pile up against Black's stranded king before he can castle.", sayShort: "Ng5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 18, say: "Qb3 — the queen joins the assault on f7; the battery and the g5-knight overwhelm the defence. This is the Evans initiative at full tilt.", sayShort: "Qb3 — pile on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }] },
  'italian-game::3::h6@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 16, say: "Qb3 — straight to the battery: queen and bishop train on f7, and h6 has done nothing to address it. Black is already on the back foot.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "d5 — the wedge drives the c6-knight to the miserable d8-square; your space and the two raking bishops make this a model Evans bind.", sayShort: "d5 — wedge, bind him.", arrows: [A('d5', 'c6')], highlights: [H('d5')] }] },
  'italian-game::3::Bd7@15': { ...IT_EVANS_DEEP, beats: [{ atMove: 16, say: "Qb3 — the queen eyes f7 and b7; Bd7 shored up c6 but left f7 to be hounded. You develop with constant threats.", sayShort: "Qb3 — hound f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 20, say: "Nd5 — the knight leaps to the central outpost, hitting f6 and c7; trading there opens the e-file for your rook and the d5-knight cramps Black.", sayShort: "Nd5 — central outpost, open lines.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }] },
  'italian-game::4::exd4@7': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 8, say: "Nxd4 — you recapture on a strong central square, hitting c6 and eyeing f5; the Benima's early trade only helped White's development.", sayShort: "Nxd4 — strong centre, hit c6.", arrows: [A('d4', 'c6')], highlights: [H('d4'), H('c6', ATK)] }, { atMove: 12, say: "e5 — the pawn lunges, kicking the f6-knight and clamping Black's cramped position; White's central space dominates.", sayShort: "e5 — lunge, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'italian-game::4::dxe5@9': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 10, say: "Qxd8+ — you trade queens into a pleasant endgame; with the bishop pair and the more active pieces, White presses the Hungarian's passivity.", sayShort: "Qxd8+ — trade into a better ending.", highlights: [H('d8')] }, { atMove: 18, say: "Nd5 — the knight seizes the central outpost, hitting f6 and c7; in the endgame your space and active pieces give the edge.", sayShort: "Nd5 — central outpost.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }] },
  'italian-game::4::Bg4@9': { ...IT_HUNGARIAN_D4, beats: [{ atMove: 10, say: "exd6 — you open the position, the bishop forced to recapture awkwardly; with faster development White holds the initiative.", sayShort: "exd6 — open the position.", highlights: [H('d6')] }, { atMove: 16, say: "g4 — you gain space and harry the bishop on the kingside, the aggressive Hungarian treatment; White expands with the initiative.", sayShort: "g4 — harry the bishop.", arrows: [A('g4', 'h5')], highlights: [H('g4'), H('h5', ATK)] }] },
  'italian-game::4::Be6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 14, say: "Bxe6 — you snap the bishop, opening lines toward Black's king before collecting the e5-pawn; White's attack rolls.", sayShort: "Bxe6 — open lines.", highlights: [H('e6')] }, { atMove: 16, say: "Qxe5 — the queen grabs the central pawn with tempo, hitting the rook and dominating; White is up material with the initiative.", sayShort: "Qxe5 — grab, dominate.", highlights: [H('e5')] }] },
  'italian-game::4::Nf6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 14, say: "Qxf7+ — the queen crashes in, the king dragged into the open; Black's loose Hungarian collapses under the direct attack.", sayShort: "Qxf7+ — crash in.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }, { atMove: 18, say: "Rd1+ — the rook joins with check, driving the exposed king deeper; White's pieces hunt it down for a decisive attack.", sayShort: "Rd1+ — drive the king.", highlights: [H('d1')] }] },
  'italian-game::4::Nh6@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 14, say: "Bxh6 — you snap the knight, wrecking Black's kingside; with the extra pawn and the open king, White stands clearly better.", sayShort: "Bxh6 — wreck the kingside.", highlights: [H('h6')] }, { atMove: 16, say: "Be3 — the bishop retreats, consolidating the extra material; White's structure and king safety carry the advantage.", sayShort: "Be3 — consolidate.", highlights: [H('e3')] }] },
  'italian-game::4::Qd4@13': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 14, say: "Qxf7+ — you crash in, exposing Black's king; the greedy queen sortie ignored the threat and White's attack is overwhelming.", sayShort: "Qxf7+ — crash in.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }, { atMove: 20, say: "Qxg7 — the queen gobbles another pawn, mauling Black's kingside; White's material and attack are decisive.", sayShort: "Qxg7 — maul the kingside.", highlights: [H('g7')] }] },
  'italian-game::4::f6@15': { ...IT_HUNGARIAN_QH5, beats: [{ atMove: 16, say: "Qc3 — the queen retreats with the extra pawn banked, eyeing the long diagonal; White's material edge and safer position tell.", sayShort: "Qc3 — bank the pawn, eye g7.", highlights: [H('c3')] }, { atMove: 18, say: "Be3 — you develop, consolidating the extra pawn; with the bishop pair and the sounder structure, White converts the Hungarian's misadventure.", sayShort: "Be3 — consolidate the pawn.", highlights: [H('e3')] }] },
  'italian-game::5::Nxe4@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 8, say: "dxe5 — you grab the centre, the e5-pawn cramping Black while his e4-knight must retreat; White's space and lead in development tell.", sayShort: "dxe5 — grab the centre.", highlights: [H('e5')] }, { atMove: 10, say: "Qe2 — the queen eyes the e-file and the c5-knight, keeping Black's pieces awkward; White develops with pressure.", sayShort: "Qe2 — eye the e-file.", highlights: [H('e2')] }] },
  'italian-game::5::Nxd4@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 10, say: "Qxd4 — the queen recaptures in the centre, eyeing the kingside; Black's early trade handed White a lead in development.", sayShort: "Qxd4 — recapture, centralise.", highlights: [H('d4')] }, { atMove: 14, say: "Bg5 — the bishop pins, pressuring f6 and Black's kingside; with active pieces and the centre, White presses.", sayShort: "Bg5 — pin, press f6.", highlights: [H('g5'), H('f6', ATK)] }] },
  'italian-game::5::d5@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 8, say: "exd5 — you open the centre, the Two Knights' main tabiya; after the trades White keeps the e5-pawn and a slight pull.", sayShort: "exd5 — open the centre.", highlights: [H('d5')] }, { atMove: 10, say: "Nxe5 — the knight grabs the centre pawn; after dxe5 the pawn duo cramps Black and White holds the edge.", sayShort: "Nxe5 — grab the centre pawn.", highlights: [H('e5')] }] },
  'italian-game::5::d6@7': { ...IT_SCOTCH_GAMBIT, beats: [{ atMove: 8, say: "Nc3 — you develop naturally, controlling d5 and the centre; against the modest d6, White keeps a small, comfortable space edge.", sayShort: "Nc3 — develop, control d5.", highlights: [H('c3'), H('d5', SOFT)] }, { atMove: 16, say: "Qxd4 — the queen centralises after the trades, dominating the board; White's harmonious development gives the easier game.", sayShort: "Qxd4 — centralise, press.", highlights: [H('d4')] }] },
  'italian-game::5::Be7@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Be7 — deep in the Canal, your rook sits boldly on e6. Keep forcing: the rook rakes the sixth rank, the knight and bishop swarm, and Black's king is exposed on the queenside. Material is level; the initiative and the loose king decide — press.", sayShort: "Be7 — press the active rook on e6.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::Qd5@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Qd5 offers the queen trade, but keep the pieces on — your rook on e6 and the knights swarm Black's exposed king. Decline simplification, keep forcing, and the active pieces and the loose monarch are your edge in this sharp position.", sayShort: "Qd5 — keep pieces on, keep forcing.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::Qf5@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "Qf5 eyes your e6-rook and the kingside — hold it with the queen or g4, and keep attacking. The rook on the sixth and the active pieces target Black's exposed king. Sharp and roughly level; the initiative is everything.", sayShort: "Qf5 — hold e6, keep attacking.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::h6@23': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 23, say: "h6 — a luft in the sharp Canal. Press your active rook on e6 and the swarming pieces; Black's king is loose on the queenside. Material's level, so the initiative decides — keep forcing and target the exposed monarch.", sayShort: "h6 — press e6, target the king.", highlights: [H('e6', KEY)] }] },
  'italian-game::5::f5@11': { ...IT_MAXLANGE_DEEP, beats: [{ atMove: 12, say: "Bg5 — you pin and pressure, exploiting Black's loosening f5; the pin forces concessions and White regains the initiative.", sayShort: "Bg5 — pin, exploit f5.", highlights: [H('g5')] }, { atMove: 18, say: "Bd5 — the bishop dominates the centre, hitting the e4-knight and Black's king position; White's pieces converge for the attack.", sayShort: "Bd5 — dominate, hit e4.", highlights: [H('d5'), H('e4', ATK)] }] },

  // ── Two Knights Defence ──
  'two-knights-defence::1::d3@6': TK_D3_QUIET,
  'two-knights-defence::2::d3@6': TK_D3_QUIET,
  'two-knights-defence::3::d3@6': TK_D3_QUIET,
  'two-knights-defence::5::d3@6': TK_D3_QUIET,
  'two-knights-defence::6::d3@6': TK_D3_QUIET,
  'two-knights-defence::3::Ng5@6': { ...TK_NG5, beats: [{ atMove: 9, say: "…b5 — the sharp gambit thrust, gaining space and time on the c4-bishop; Black grabs the initiative in the Knight Attack.", sayShort: "…b5 — sharp thrust.", arrows: [A('b5', 'c4')], highlights: [H('b5'), H('c4', ATK)] }, { atMove: 13, say: "…Nxd5 — you recapture the pawn, the knights and bishops springing to life; Black's active pieces give full play.", sayShort: "…Nxd5 — regain, spring out.", highlights: [H('d5')] }] },
  'two-knights-defence::4::Ng5@6': { ...TK_NG5, beats: [{ atMove: 9, say: "…b5 — the sharp gambit thrust, gaining space and time on the c4-bishop; Black grabs the initiative in the Knight Attack.", sayShort: "…b5 — sharp thrust.", arrows: [A('b5', 'c4')], highlights: [H('b5'), H('c4', ATK)] }, { atMove: 13, say: "…Nxd5 — you recapture the pawn, the knights and bishops springing to life; Black's active pieces give full play.", sayShort: "…Nxd5 — regain, spring out.", highlights: [H('d5')] }] },
  'two-knights-defence::1::d4@6': { ...TK_D4_GAMBIT, beats: [{ atMove: 7, say: "…exd4 — you grab the gambit pawn; the Max Lange is coming, a wild forcing line where precise defence leaves Black materially ahead.", sayShort: "…exd4 — grab the pawn.", highlights: [H('d4')] }, { atMove: 13, say: "…dxc4 — you snatch the bishop, banking material in the chaos; White's fxg7 looks scary but Black's king weathers it and the extra piece tells.", sayShort: "…dxc4 — bank the piece.", highlights: [H('c4')] }] },
  'two-knights-defence::2::d4@6': { ...TK_D4_GAMBIT, beats: [{ atMove: 7, say: "…exd4 — you grab the gambit pawn; the Max Lange is coming, a wild forcing line where precise defence leaves Black materially ahead.", sayShort: "…exd4 — grab the pawn.", highlights: [H('d4')] }, { atMove: 13, say: "…dxc4 — you snatch the bishop, banking material in the chaos; White's fxg7 looks scary but Black's king weathers it and the extra piece tells.", sayShort: "…dxc4 — bank the piece.", highlights: [H('c4')] }] },
  'two-knights-defence::5::d4@6': { ...TK_D4_GAMBIT, beats: [{ atMove: 7, say: "…exd4 — you grab the gambit pawn; the Max Lange is coming, a wild forcing line where precise defence leaves Black materially ahead.", sayShort: "…exd4 — grab the pawn.", highlights: [H('d4')] }, { atMove: 13, say: "…dxc4 — you snatch the bishop, banking material in the chaos; White's fxg7 looks scary but Black's king weathers it and the extra piece tells.", sayShort: "…dxc4 — bank the piece.", highlights: [H('c4')] }] },
  'two-knights-defence::6::d4@6': { ...TK_D4_GAMBIT, beats: [{ atMove: 7, say: "…exd4 — you grab the gambit pawn; the Max Lange is coming, a wild forcing line where precise defence leaves Black materially ahead.", sayShort: "…exd4 — grab the pawn.", highlights: [H('d4')] }, { atMove: 13, say: "…dxc4 — you snatch the bishop, banking material in the chaos; White's fxg7 looks scary but Black's king weathers it and the extra piece tells.", sayShort: "…dxc4 — bank the piece.", highlights: [H('c4')] }] },
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
  'two-knights-defence::4::c3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you challenge the c4-bishop, the thematic equalizing plan; Black's solid Modern Bishop's setup is fully comfortable.", sayShort: "…Na5 — challenge the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 17, say: "…c5 — you gain queenside space and prepare …Be6; Black's flexible structure holds easy equality.", sayShort: "…c5 — gain space.", highlights: [H('c5')] }] },
  'two-knights-defence::4::h3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you challenge the strong c4-bishop, the thematic Two Knights idea; trading it eases your game toward comfortable equality.", sayShort: "…Na5 — challenge the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 17, say: "…c5 — you gain queenside space and a foothold; Black's solid structure and active play hold the balance comfortably.", sayShort: "…c5 — gain queenside space.", highlights: [H('c5')] }] },
  'two-knights-defence::7::h3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you challenge the strong c4-bishop, the thematic Two Knights idea; trading it eases your game toward comfortable equality.", sayShort: "…Na5 — challenge the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 17, say: "…c5 — you gain queenside space and a foothold; Black's solid structure and active play hold the balance comfortably.", sayShort: "…c5 — gain queenside space.", highlights: [H('c5')] }] },
  'two-knights-defence::4::Nbd2@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you go after the c4-bishop, the main equalizing plan; trading it leaves Black a comfortable, solid game.", sayShort: "…Na5 — go after the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 15, say: "…Nxc4 — you snap the bishop, easing your position; with the trade done, Black is fully equal in the symmetrical structure.", sayShort: "…Nxc4 — snap the bishop.", highlights: [H('c4')] }] },
  'two-knights-defence::7::Nbd2@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you go after the c4-bishop, the main equalizing plan; trading it leaves Black a comfortable, solid game.", sayShort: "…Na5 — go after the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 15, say: "…Nxc4 — you snap the bishop, easing your position; with the trade done, Black is fully equal in the symmetrical structure.", sayShort: "…Nxc4 — snap the bishop.", highlights: [H('c4')] }] },
  'two-knights-defence::4::Nc3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you challenge the c4-bishop; the trade hands White doubled c-pawns and Black a clean, equal game.", sayShort: "…Na5 — challenge the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 19, say: "…Be6 — the bishop develops actively, eyeing the queenside; Black's solid structure and the bishop pair give full equality.", sayShort: "…Be6 — develop actively.", highlights: [H('e6')] }] },
  'two-knights-defence::7::Nc3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you challenge the c4-bishop; the trade hands White doubled c-pawns and Black a clean, equal game.", sayShort: "…Na5 — challenge the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 19, say: "…Be6 — the bishop develops actively, eyeing the queenside; Black's solid structure and the bishop pair give full equality.", sayShort: "…Be6 — develop actively.", highlights: [H('e6')] }] },
  'two-knights-defence::4::a3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Be6 — you develop the bishop, offering to trade off White's strong c4-bishop; Black's solid game is fully equal.", sayShort: "…Be6 — offer the trade.", arrows: [A('e6', 'c4')], highlights: [H('e6'), H('c4', ATK)] }, { atMove: 21, say: "…Nd4 — the knight leaps to the centre, hitting f3 and pressing; Black's active pieces neutralise the position.", sayShort: "…Nd4 — leap in, hit f3.", arrows: [A('d4', 'f3')], highlights: [H('d4'), H('f3', ATK)] }] },
  'two-knights-defence::7::a3@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Be6 — you develop the bishop, offering to trade off White's strong c4-bishop; Black's solid game is fully equal.", sayShort: "…Be6 — offer the trade.", arrows: [A('e6', 'c4')], highlights: [H('e6'), H('c4', ATK)] }, { atMove: 21, say: "…Nd4 — the knight leaps to the centre, hitting f3 and pressing; Black's active pieces neutralise the position.", sayShort: "…Nd4 — leap in, hit f3.", arrows: [A('d4', 'f3')], highlights: [H('d4'), H('f3', ATK)] }] },
  'two-knights-defence::7::a4@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Be6 — you develop, offering to trade White's c4-bishop; Black's solid setup is fully equal.", sayShort: "…Be6 — offer the trade.", arrows: [A('e6', 'c4')], highlights: [H('e6'), H('c4', ATK)] }, { atMove: 21, say: "…f5 — you break in the centre, the thematic kingside expansion; Black seizes the initiative on that wing.", sayShort: "…f5 — break, seize the wing.", highlights: [H('f5')] }] },
  'two-knights-defence::4::Bg5@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you target the c4-bishop; with the trade coming and the solid centre, Black equalises comfortably.", sayShort: "…Na5 — target the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 17, say: "…Bxf6 — you recapture, the bishop eyeing the long diagonal and the centre; Black's harmonious setup holds the balance.", sayShort: "…Bxf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'two-knights-defence::7::Bg5@12': { ...TK_QUIET_MIDDLE, beats: [{ atMove: 13, say: "…Na5 — you target the c4-bishop; with the trade coming and the solid centre, Black equalises comfortably.", sayShort: "…Na5 — target the bishop.", arrows: [A('a5', 'c4')], highlights: [H('a5'), H('c4', ATK)] }, { atMove: 17, say: "…Bxf6 — you recapture, the bishop eyeing the long diagonal and the centre; Black's harmonious setup holds the balance.", sayShort: "…Bxf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'two-knights-defence::7::Bb5@14': { ...TK_QUIET_BB5, beats: [{ atMove: 15, say: "…a6 — you question the b5-bishop, gaining the bishop pair or a tempo; Black's solid setup stays comfortable.", sayShort: "…a6 — question the bishop.", arrows: [A('a6', 'b5')], highlights: [H('a6'), H('b5', ATK)] }, { atMove: 19, say: "…Be6 — the bishop develops actively; Black's harmonious pieces and solid structure hold full equality.", sayShort: "…Be6 — develop actively.", highlights: [H('e6')] }] },
  'two-knights-defence::1::Bd3@14': { ...TK_POLERIO, beats: [{ atMove: 15, say: "…Nd5 — the knight centralises on a strong post; with the bishop pair and a lead in development, Black has fine compensation for the pawn.", sayShort: "…Nd5 — central post.", highlights: [H('d5')] }, { atMove: 17, say: "…Bd6 — the bishop eyes the kingside, completing active development; Black's initiative answers the pawn.", sayShort: "…Bd6 — eye the kingside.", highlights: [H('d6')] }] },
  'two-knights-defence::1::Nd4@18': { ...TK_POLERIO, beats: [{ atMove: 19, say: "…Qxd4 — you snap the centralised knight, regaining material and centralising the queen; Black's initiative is decisive.", sayShort: "…Qxd4 — regain, centralise.", highlights: [H('d4')] }, { atMove: 21, say: "…exd3 — the passed pawn rips open White's position; Black's active pieces and material press hard.", sayShort: "…exd3 — rip it open.", highlights: [H('d3')] }] },
  'two-knights-defence::1::Ng1@18': { ...TK_POLERIO, beats: [{ atMove: 19, say: "…Bc5 — you develop with tempo against the awkward Ng1 retreat; Black's lead in development is full value for the pawn.", sayShort: "…Bc5 — develop with tempo.", highlights: [H('c5')] }, { atMove: 21, say: "…exd3 — you open lines toward White's stuck king, the passed pawn and active pieces pressing; Black's initiative is worth the pawn.", sayShort: "…exd3 — open lines.", highlights: [H('d3')] }] },
  'two-knights-defence::1::Nh4@18': { ...TK_POLERIO, beats: [{ atMove: 19, say: "…g5 — you trap the offside h4-knight, winning material back; Black's bold play in the Polerio pays off.", sayShort: "…g5 — trap the knight.", arrows: [A('g5', 'h4')], highlights: [H('g5'), H('h4', ATK)] }, { atMove: 21, say: "…gxh4 — you snap the knight, regaining the material with a strong position; Black stands well.", sayShort: "…gxh4 — win the knight.", highlights: [H('h4')] }] },
  'two-knights-defence::1::O-O@24': TK_POLERIO,
  'two-knights-defence::5::O-O@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Bb7 — the bishop fianchettoes, raking the long diagonal toward White's king; Black's active pieces give full play for the pawn.", sayShort: "…Bb7 — rake the long diagonal.", arrows: [A('b7', 'g2')], highlights: [H('b7')] }, { atMove: 21, say: "…O-O-O — you castle long, throwing the rook into the attack; Black's coordinated pieces press White's position.", sayShort: "…O-O-O — rook into the attack.", highlights: [H('c8')] }] },
  'two-knights-defence::5::Qa4+@14': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 15, say: "…Qd7 — you offer the queen trade, simplifying into a comfortable position; Black's piece activity and the c4-pawn balance the material.", sayShort: "…Qd7 — offer the trade.", highlights: [H('d7')] }, { atMove: 19, say: "…Nxd5 — you regain the central pawn, the knight dominating; Black's active pieces hold the equal Fritz endgame.", sayShort: "…Nxd5 — regain, dominate.", highlights: [H('d5')] }] },
  'two-knights-defence::5::Nf3@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Qe4+ — the check centralises the queen and disrupts White's king; Black forces simplification on good terms.", sayShort: "…Qe4+ — centralise, disrupt.", highlights: [H('e4')] }, { atMove: 21, say: "…Qxe2+ — you trade queens with check; after Kxe2 White's king is awkwardly placed and Black emerges equal with active pieces.", sayShort: "…Qxe2+ — trade, stay equal.", highlights: [H('e2')] }] },
  'two-knights-defence::5::Qe2@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Nd7 — you reroute the knight to challenge White's e-pawn; Black's active pieces fight for the initiative in the Fritz.", sayShort: "…Nd7 — challenge the e-pawn.", highlights: [H('d7')] }, { atMove: 19, say: "…Qxg5 — you snap the knight, regaining material; Black's queen and pieces are active and the position holds.", sayShort: "…Qxg5 — regain material.", highlights: [H('g5')] }] },
  'two-knights-defence::5::d4@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Qxg2 — you snatch the g-pawn, hitting the rook and grabbing material; Black's bold Fritz play reaps a pawn.", sayShort: "…Qxg2 — snatch g2.", arrows: [A('g2', 'h1')], highlights: [H('g2')] }, { atMove: 21, say: "…Nd5 — the knight centralises after the queen trade; Black's active pieces and material hold a comfortable game.", sayShort: "…Nd5 — centralise.", highlights: [H('d5')] }] },
  'two-knights-defence::6::O-O@18': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 19, say: "…Bb7 — the bishop rakes the long diagonal toward g2 and White's king; Black's active pieces drive the Ulvestad initiative.", sayShort: "…Bb7 — rake the long diagonal.", arrows: [A('b7', 'g2')], highlights: [H('b7')] }, { atMove: 21, say: "…Rb8 — the rook joins on the open b-file, pressuring White's position; Black's coordinated pieces press hard for the material.", sayShort: "…Rb8 — open b-file.", highlights: [H('b8')] }] },
  'two-knights-defence::6::Nc3@12': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 13, say: "…Nxd5 — you recapture the pawn, the knights active in the centre; Black's piece play balances the Ulvestad material.", sayShort: "…Nxd5 — recapture, active.", highlights: [H('d5')] }, { atMove: 17, say: "…Qxd5 — the queen centralises after the trades, dominating; Black's active pieces give full equality.", sayShort: "…Qxd5 — centralise.", highlights: [H('d5')] }] },
  'two-knights-defence::6::Bc6@18': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 19, say: "…Qxg2 — you snatch the g-pawn, hitting the rook and grabbing material; Black's queen rampages in the Ulvestad chaos.", sayShort: "…Qxg2 — snatch g2.", arrows: [A('g2', 'h1')], highlights: [H('g2')] }, { atMove: 21, say: "…exd4 — you open lines and push the passed pawn; Black's active pieces and material press White hard.", sayShort: "…exd4 — open, push.", highlights: [H('d4')] }] },
  'two-knights-defence::6::d3@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Bb4+ — a developing check that gains tempo, dragging White's pieces to awkward squares; Black keeps the Ulvestad initiative.", sayShort: "…Bb4+ — develop with tempo.", arrows: [A('b4', 'e1')], highlights: [H('b4')] }, { atMove: 19, say: "…Bg4 — the bishop pins and develops, piling pressure; Black's active pieces generate full counterplay.", sayShort: "…Bg4 — pin, pile on.", highlights: [H('g4')] }] },
  'two-knights-defence::6::dxe5@16': { ...TK_FRITZ_ULVESTAD, beats: [{ atMove: 17, say: "…Qxe5+ — you grab the pawn with check, centralising; Black forces simplification on comfortable terms in the Ulvestad.", sayShort: "…Qxe5+ — grab with check.", highlights: [H('e5')] }, { atMove: 21, say: "…Nb4 — the knight jumps in with threats against c2 and d3; Black's active pieces hold the equal position.", sayShort: "…Nb4 — jump in, press.", highlights: [H('b4')] }] },
  'two-knights-defence::2::Bxc6@14': { ...TK_BC5_BXF7, beats: [{ atMove: 15, say: "…bxc6 — you recapture, the bishop pair and half-open b-file compensating; Black consolidates the Traxler material.", sayShort: "…bxc6 — consolidate.", highlights: [H('c6')] }, { atMove: 19, say: "…Kg8 — the king tucks to safety by hand; with the position consolidated, Black's extra material and bishops tell.", sayShort: "…Kg8 — tuck the king.", highlights: [H('g8')] }] },
  'two-knights-defence::2::c3@12': { ...TK_BC5_BXF7, beats: [{ atMove: 13, say: "…Bxf2+! — the Traxler thunderbolt: you sacrifice the bishop to drag the king out and regain material with check; sharp and fully playable.", sayShort: "…Bxf2+ — the Traxler shot.", arrows: [A('f2', 'e1')], highlights: [H('f2')] }, { atMove: 17, say: "…Nf4 — the knight jumps to an aggressive post near White's king; Black keeps the initiative in the sharp Traxler.", sayShort: "…Nf4 — aggressive post.", highlights: [H('f4')] }] },
  'two-knights-defence::2::d3@12': { ...TK_BC5_BXF7, beats: [{ atMove: 13, say: "…Bxf2+! — the Traxler thunderbolt: you sacrifice the bishop to drag the king out and regain material with check; sharp and fully playable.", sayShort: "…Bxf2+ — the Traxler shot.", arrows: [A('f2', 'e1')], highlights: [H('f2')] }, { atMove: 15, say: "…Nxd5+ — you snap the bishop back with check, restoring material; Black's pieces are active in the chaotic position.", sayShort: "…Nxd5+ — regain with check.", highlights: [H('d5')] }] },
  'two-knights-defence::2::d3@14': { ...TK_BC5_BXF7, beats: [{ atMove: 15, say: "…Bg4 — the bishop pins the f-knight, developing actively; the Traxler's piece play keeps Black in the fight.", sayShort: "…Bg4 — pin, develop.", highlights: [H('g4')] }, { atMove: 17, say: "…Nd4 — the knight leaps to the centre with threats; Black's active pieces generate full counterplay.", sayShort: "…Nd4 — leap in, press.", highlights: [H('d4')] }] },
  'two-knights-defence::2::h3@14': { ...TK_BC5_BXF7, beats: [{ atMove: 15, say: "…Qe8 — you reroute the queen toward the kingside, regrouping after the wild Traxler; Black's active pieces hold the messy balance.", sayShort: "…Qe8 — reroute the queen.", highlights: [H('e8')] }, { atMove: 19, say: "…exd4 — you open the centre, freeing your pieces; Black's coordinated forces neutralise White's extra pawn.", sayShort: "…exd4 — open the centre.", highlights: [H('d4')] }] },
  'two-knights-defence::0::Bb3@10': { ...TK_MAXLANGE, beats: [{ atMove: 11, say: "…Ne4 — the knight plants on the strong central post, blockading White's e-pawn; Black's active pieces hold the gambit material comfortably.", sayShort: "…Ne4 — central blockade.", highlights: [H('e4')] }, { atMove: 15, say: "…Nc5 — the knight hits the a4-bishop, gaining tempo; Black coordinates around the extra pawn and stands well.", sayShort: "…Nc5 — hit a4, gain tempo.", arrows: [A('c5', 'a4')], highlights: [H('c5'), H('a4', ATK)] }] },
  'two-knights-defence::0::Bxc6+@12': { ...TK_MAXLANGE, beats: [{ atMove: 13, say: "…bxc6 — you recapture, the half-open b-file and the bishop pair compensating the structure; Black's active pieces hold the balance.", sayShort: "…bxc6 — bishop pair, open file.", highlights: [H('c6')] }, { atMove: 15, say: "…Ba6 — the bishop develops actively, eyeing f1 and the queenside; Black's coordinated pieces neutralise White.", sayShort: "…Ba6 — develop, eye f1.", highlights: [H('a6')] }] },
  'two-knights-defence::0::Nxc6@14': { ...TK_MAXLANGE, beats: [
    { atMove: 14, say: "Nxc6 trades on c6 to break your centre — recapture toward the middle and you've equalised in comfort.", sayShort: "Nxc6 — recapture …bxc6.", arrows: [A('b7', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 15, say: "…bxc6 keeps a broad pawn front and the bishop pair; next …Qe7 swings out to round up White's over-extended e5-pawn.", sayShort: "…bxc6 — bishop pair, eye e5.", highlights: [H('c6', SOFT), H('e5', SOFT)] },
    { atMove: 19, say: "…Qxe5 regains the gambit pawn, the queen proudly centralised. With the two bishops and a sound structure you've fully equalised — the Max Lange storm has blown out.", sayShort: "…Qxe5 — regain the pawn, equal.", highlights: [H('e5', KEY)] },
  ] },
  'two-knights-defence::0::O-O@12': { ...TK_MAXLANGE, beats: [
    { atMove: 12, say: "O-O — White castles in the Max Lange. Keep your nerve and develop: …Bg4 pins the f3-knight, adding pressure while you resolve the centre.", sayShort: "O-O — answer …Bg4.", arrows: [A('c8', 'g4')], highlights: [H('e4', KEY)] },
    { atMove: 13, say: "…Bg4 pins the knight to the queen and ties White down; the d4-pawn and your dominant e4-knight give you a fully sound footing.", sayShort: "…Bg4 — pin, keep the pressure.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 17, say: "…Nxc3 trades into doubled White pawns; with …Bc5 and …O-O you finish development holding the better structure in a balanced, even game.", sayShort: "…Nxc3 — better structure, equal.", highlights: [H('c3', SOFT)] },
  ] },
  'two-knights-defence::0::O-O@14': { ...TK_MAXLANGE, beats: [{ atMove: 15, say: "…Nxd4 — you trade in the centre, simplifying the Max Lange tangle; Black's pieces are active and the position holds.", sayShort: "…Nxd4 — trade, simplify.", highlights: [H('d4')] }, { atMove: 19, say: "…Bc5 — the bishop develops with tempo, eyeing the kingside; Black is comfortable and fully equal.", sayShort: "…Bc5 — develop with tempo.", highlights: [H('c5')] }] },
  'two-knights-defence::0::c3@18': { ...TK_MAXLANGE, beats: [{ atMove: 19, say: "…Bb6 — you tuck the bishop safely, keeping it active on the a7-g1 diagonal; Black's solid setup holds the Max Lange balance.", sayShort: "…Bb6 — tuck the bishop.", highlights: [H('b6')] }, { atMove: 21, say: "…Nxd2 — you trade off, simplifying the sharp position; Black emerges with a comfortable, equal game.", sayShort: "…Nxd2 — trade, simplify.", highlights: [H('d2')] }] },
  'two-knights-defence::0::f3@18': { ...TK_MAXLANGE, beats: [{ atMove: 19, say: "…Ng5 — the knight retreats actively, keeping its eye on key squares; Black's pieces stay coordinated in the Max Lange tangle and hold the balance.", sayShort: "…Ng5 — active retreat.", highlights: [H('g5')] }, { atMove: 21, say: "…Ne4 — the knight returns to its strong central post, blockading and pressing; Black is comfortable in the sharp middlegame.", sayShort: "…Ne4 — strong central post.", highlights: [H('e4')] }] },
  'two-knights-defence::0::exd6@10': { ...TK_MAXLANGE, beats: [
    { atMove: 10, say: "exd6 — White grabs the d-pawn, but recapture and you've a free game. …Bxd6 develops the bishop with an active gaze at h2.", sayShort: "exd6 — recapture …Bxd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 11, say: "…Bxd6 eyes h2 down the b8-h2 diagonal; castle, and your pieces flow to natural squares with the centre open and no weaknesses.", sayShort: "…Bxd6 — aim h2, fully equal.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 17, say: "…Bg4 pins the f3-knight and completes development. The position is symmetric and dead level — the Max Lange space edge has evaporated entirely.", sayShort: "…Bg4 — pin, symmetric and equal.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
  ] },
  'two-knights-defence::0::exf6@10': { ...TK_MAXLANGE, beats: [{ atMove: 11, say: "…d3 — you ram the passed pawn deep into White's position, jamming his development; the Dubois Réti hands Black a strong initiative.", sayShort: "…d3 — ram the passer.", highlights: [H('d3')] }, { atMove: 15, say: "…dxc4 — you grab the bishop, banking material in the complications; Black emerges with the better game.", sayShort: "…dxc4 — bank material.", highlights: [H('c4')] }] },
  'two-knights-defence::3::e5@8': { ...TK_MAXLANGE, beats: [{ atMove: 9, say: "…d5 — you strike back in the centre, gaining space and a tempo; Black's active counterplay holds the gambit material.", sayShort: "…d5 — strike back.", highlights: [H('d5')] }, { atMove: 11, say: "…Ne4 — the knight plants on a strong central post, blockading; Black's coordinated pieces stand well.", sayShort: "…Ne4 — central blockade.", highlights: [H('e4')] }] },
  'two-knights-defence::3::Nc3@10': { ...TK_MAXLANGE, beats: [{ atMove: 11, say: "…dxc3 — you grab the knight, banking material in the Nakhmanson; White's attack looks fierce but accurate defence leaves Black ahead.", sayShort: "…dxc3 — bank the knight.", highlights: [H('c3')] }, { atMove: 17, say: "…Be7 — you develop, shoring up the king and consolidating; Black's extra material decides if he stays calm.", sayShort: "…Be7 — shore up, consolidate.", highlights: [H('e7')] }] },
  'two-knights-defence::3::Nxd4@10': { ...TK_MAXLANGE, beats: [
    { atMove: 10, say: "Nxd4 recaptures and eyes your e4-knight's footing. Strike back in the centre: …d5 hits the c4-bishop and frees your game with tempo.", sayShort: "Nxd4 — answer …d5.", highlights: [H('e4', KEY)] },
    { atMove: 11, say: "…d5 jabs at the c4-bishop and stakes a central claim, gaining time to develop while your e4-knight stays strong.", sayShort: "…d5 — hit the bishop, free up.", arrows: [A('d5', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 15, say: "…Nxc3 hands White doubled c-pawns; with …Be7, …O-O and the bishop pair the Scotch-Gambit complications fizzle into a balanced, comfortable game.", sayShort: "…Nxc3 — double his pawns, equal.", highlights: [H('c3', KEY)] },
  ] },
  'two-knights-defence::3::Nb5@18': { ...TK_MAXLANGE, beats: [{ atMove: 19, say: "…O-O — you castle to safety, weathering the Anderssen Attack; Black's solid king and active pieces hold the balance.", sayShort: "…O-O — castle to safety.", highlights: [H('g8')] }, { atMove: 21, say: "…Bf6 — the bishop eyes the long diagonal and the d4-knight; Black's coordinated pieces neutralise White's initiative.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'two-knights-defence::3::Rxe7+@20': { ...TK_MAXLANGE, beats: [{ atMove: 20, say: "Rxe7+ — a desperado, but you're ready: …Nxe7 or …Kxe7 recaptures and the attack peters out. You emerge with the material and a safe king; the Canal's fireworks have spent themselves. Recapture and consolidate the win.", sayShort: "Rxe7+ — recapture, the attack ends.", arrows: [A('c6', 'e7')], highlights: [H('e7', KEY)] }] },

  // ── Four Knights Game ──
  'four-knights-game::0::Bd6@7': FK_BD6,
  'four-knights-game::0::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 12, say: "bxc3 — you recapture toward the centre; the doubled c-pawns come bundled with the bishop pair and a half-open b-file, a comfortable structural trade.", sayShort: "bxc3 — bishop pair, open b-file.", highlights: [H('c3')] }, { atMove: 14, say: "Bg5 — the bishop pins the f6-knight, pressuring Black's kingside while you reroute the light bishop and lean on the half-open b-file.", sayShort: "Bg5 — pin f6, press.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf3 — recapture, and the queen eyes the kingside and the long light diagonal; with the bishop pair and the b-file, White presses the symmetrical structure.", sayShort: "Qxf3 — bishops tell, press.", highlights: [H('f3')] }] },
  'four-knights-game::0::Bc5@7': FK_BC5_PAWN,
  'four-knights-game::0::g6@5': FK_G6,
  'four-knights-game::0::d6@7': FK_D6_SCOTCH,
  'four-knights-game::0::h6@15': { ...FK_SPANISH, beats: [{ atMove: 16, say: "Bh4 — you keep the pin on f6, maintaining the pressure; the bishop pair and the half-open b-file give White the easier game.", sayShort: "Bh4 — keep the pin.", highlights: [H('h4'), H('f6', ATK)] }, { atMove: 18, say: "Bc4 — the bishop swings to the a2-g8 diagonal, eyeing f7 and the centre; your two bishops and structure carry a pleasant pull.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 22, say: "Qxf3 — recapture; the queen joins on the light squares and the bishop pair tells in the open symmetrical middlegame.", sayShort: "Qxf3 — bishop pair tells.", highlights: [H('f3')] }] },
  'four-knights-game::0::Bd7@15': { ...FK_SPANISH, beats: [{ atMove: 16, say: "a4 — you grab space on the open queenside, the half-open b-file and the a-pawn lever giving White the initiative on that wing.", sayShort: "a4 — queenside space.", highlights: [H('a4')] }, { atMove: 20, say: "d4 — the central break, opening the position for your bishop pair; the symmetrical structure cracks in White's favour.", sayShort: "d4 — break, open for bishops.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::0::Ne7@13': { ...FK_SPANISH, beats: [{ atMove: 14, say: "Bxf6 — you snap the knight, shattering Black's kingside pawns with gxf6; the structural damage is the symmetrical Four Knights' point.", sayShort: "Bxf6 — shatter the kingside.", highlights: [H('f6')] }, { atMove: 16, say: "d4 — the central break hits the weakened camp; you open lines toward Black's airy kingside with the bishop pair.", sayShort: "d4 — break, open lines.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::0::Ne7@15': { ...FK_SPANISH, beats: [{ atMove: 16, say: "Nh4 — the knight heads for f5, probing Black's kingside; with the bishop pair and the open b-file, White builds on both wings.", sayShort: "Nh4 — head for f5.", highlights: [H('h4'), H('f5', SOFT)] }, { atMove: 20, say: "Bc4+ — the check exposes Black's king and the damaged f-pawns; your bishops rake the open position for the structural plus.", sayShort: "Bc4+ — expose the king.", highlights: [H('c4')] }] },
  'four-knights-game::1::Bxc3+@11': { ...FK_SCOTCH_FK, beats: [{ atMove: 12, say: "bxc3 — you recapture, and after the knight snaps the queen on d8 you'll emerge with the bishop pair and a healthy lead in the resulting play.", sayShort: "bxc3 — win material next.", highlights: [H('c3')] }, { atMove: 16, say: "Bg5 — the bishop pins f6, and with Black's king stuck on d8 your pieces swarm; the Scotch Four Knights hands White a clear initiative.", sayShort: "Bg5 — pin, swarm the king.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf6+ — the queen crashes in with check, harrying Black's exposed king; your activity and the bishop pair convert the edge.", sayShort: "Qxf6+ — crash in, convert.", highlights: [H('f6')] }] },
  'four-knights-game::1::dxc6@11': { ...FK_SCOTCH_FK, beats: [{ atMove: 12, say: "a3 — you put the question to the b4-bishop; after the queens come off you'll win it or the bishop pair, with the better structure.", sayShort: "a3 — question the bishop.", highlights: [H('a3'), H('b4', ATK)] }, { atMove: 18, say: "Na2 — the knight rounds up the b4-pawn, restoring material balance with the bishop pair and a pleasant endgame edge.", sayShort: "Na2 — round up b4.", arrows: [A('a2', 'b4')], highlights: [H('a2'), H('b4', ATK)] }] },
  'four-knights-game::1::Bd6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Bd6 develops toward your king. Keep the pieces aimed: Bg5 pins, Qf3 swings, Rad1 backs the centre, and the light squares around Black's king beckon. The IQP is dynamic; press the kingside before Black consolidates.", sayShort: "Bd6 — pile on the kingside, press.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::h6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 keeps the pin, or Bxf6 to damage Black's kingside. Your pieces are active, Qf3 and Bd3 eye the king, and the IQP is a dynamic asset. Keep forcing on the kingside light squares.", sayShort: "h6 — Bh4 or Bxf6, keep attacking.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'four-knights-game::1::c6@17': { ...FK_SCOTCH_FK, beats: [{ atMove: 18, say: "Re1+ — the rook checks down the open e-file, gaining tempo and exposing Black's loose centre; you develop with pressure.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }, { atMove: 22, say: "Qf3 — the queen eyes the d5-pawn and the kingside; with active pieces and pressure on the isolated centre pawn, White holds the edge.", sayShort: "Qf3 — pressure d5.", highlights: [H('f3'), H('d5', SOFT)] }] },
  'four-knights-game::1::Bxc3@17': { ...FK_SCOTCH_FK, beats: [{ atMove: 18, say: "Qe2+ — the check on the open e-file disrupts Black's coordination, forcing an awkward block before you regain the piece.", sayShort: "Qe2+ — disrupt, regain.", arrows: [A('e2', 'e8')], highlights: [H('e2')] }, { atMove: 20, say: "Bb5+ — another check, harrying Black and winning back the bishop on c3 with the better structure and the initiative.", sayShort: "Bb5+ — harry, regain.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'four-knights-game::1::Rb8@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Rb8 — Black eyes the half-open b-file, but your kingside attack is faster. Bg5 pins, Qf3 and Bd3 train on the king, and Rad1 backs the centre. The IQP is dynamic; press at the king before Black's counterplay arrives.", sayShort: "Rb8 — your attack is faster, press.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Be6@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Be6 develops, covering the light squares. Keep the heat on: Bg5 pins, Qf3 and Bd3 aim at the king, and Rad1 backs the centre. The IQP gives dynamic play; press the kingside before Black fully consolidates.", sayShort: "Be6 — press the kingside, attack.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Be6@23': { ...FK_SCOTCH_FK, beats: [{ atMove: 23, say: "Be6 develops in the deep IQP. Your pieces are fully mobilised: Bg5, Qf3 and the rooks on the central files train on Black's king. The isolated d-pawn is dynamic; keep forcing on the kingside light squares before Black neutralises.", sayShort: "Be6 — rooks centralised, keep forcing.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::1::Re8@21': { ...FK_SCOTCH_FK, beats: [{ atMove: 21, say: "Re8 backs Black's e-file. No matter: your attack rolls. Bg5 pins, Qf3 and Bd3 eye the king, Rad1 holds the centre. The IQP is a dynamic asset; press the kingside light squares and keep Black defending.", sayShort: "Re8 — press the kingside, attack.", highlights: [H('d5', KEY)] }] },
  'four-knights-game::2::Bb4@7': { ...FK_D4_PIN, beats: [{ atMove: 8, say: "Nxe5 — you snap the centre pawn, exploiting Black's premature pin; with the queens active you keep a sound extra pawn and the initiative.", sayShort: "Nxe5 — snap the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "O-O-O — you castle long, connecting rooks and aiming down the d-file; the bishop pair and central control give White a comfortable game.", sayShort: "O-O-O — connect, aim at d-file.", highlights: [H('c1')] }] },
  'four-knights-game::2::g6@5': FK_G6,
  'four-knights-game::2::Be7@9': { ...FK_NMD5, beats: [{ atMove: 10, say: "Bb5 — the Belgrade Gambit: you pin and pressure c6, developing fast for the sacrificed pawn while the d5-knight cramps Black.", sayShort: "Bb5 — pin c6, develop fast.", highlights: [H('b5'), H('c6', ATK)] }, { atMove: 20, say: "Qxd4 — you regain the pawn, the queen centralised and your pieces active; the gambit's lead in development has paid off.", sayShort: "Qxd4 — regain, stay active.", highlights: [H('d4')] }] },
  'four-knights-game::2::Nb4@9': { ...FK_NMD5, beats: [{ atMove: 10, say: "Nxf6+ — you trade off, damaging Black's coordination; with the d4-pawn to regain and faster development, White is comfortable.", sayShort: "Nxf6+ — trade, stay ahead.", highlights: [H('f6')] }, { atMove: 18, say: "Bg5 — the bishop pins and pressures, harrying the black queen; your development lead and active pieces keep the initiative.", sayShort: "Bg5 — pin, harry the queen.", highlights: [H('g5')] }] },
  'four-knights-game::2::Nxd5@9': { ...FK_NMD5, intro: { say: "…Nxd5 — Black grabs your bold Belgrade Gambit knight. Recapture with exd5: the pawn jabs at the c6-knight and seizes central space. You're a pawn down, but the cramping d5-pawn and a real lead in development buy the initiative — develop fast and make the gambit pay.", sayShort: "…Nxd5 — recapture exd5, attack." }, beats: [
    { atMove: 9, say: "…Nxd5 snaps off your bold d5-knight — recapture with the pawn. exd5 hits the c6-knight and clamps the centre with the gambit's spearhead.", sayShort: "…Nxd5 — answer exd5.", arrows: [A('e4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 10, say: "exd5 — the pawn jabs at the c6-knight and grabs space. Black checks with …Bb4+ to gain a tempo; you simply block with c3.", sayShort: "exd5 — hit c6, grab space.", arrows: [A('d5', 'c6')], highlights: [H('c6', ATK)] },
    { atMove: 12, say: "c3 blocks the check and hits the bishop while the d5-pawn cramps Black and your pieces flow out fast. A pawn for the initiative — the Belgrade in full flow.", sayShort: "c3 — block, the Belgrade rolls.", arrows: [A('c3', 'b4')], highlights: [H('b4', ATK), H('d5', KEY)] },
  ] },
  'four-knights-game::2::d6@9': { ...FK_NMD5, beats: [{ atMove: 10, say: "Nxd4 — you regain the pawn, the knight centralised and eyeing f5; the Belgrade's rapid play equalises material with the better pieces.", sayShort: "Nxd4 — regain, eye f5.", highlights: [H('d4'), H('f5', SOFT)] }, { atMove: 14, say: "Nf5 — the knight leaps to the dream outpost, hitting Black's kingside; after the trade White presses the cramping outpost.", sayShort: "Nf5 — dream outpost.", highlights: [H('f5')] }] },
  'four-knights-game::2::Bc5@9': { ...FK_NMD5, beats: [{ atMove: 10, say: "Bg5 — the bishop pins f6, and after the trades you'll regain the d4-pawn with the bishop pair; the Belgrade gives White easy development.", sayShort: "Bg5 — pin, regain the pawn.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 20, say: "Re1 — the rook seizes the open e-file; with the bishop pair and pressure on e5, White converts the lead in development.", sayShort: "Re1 — seize the e-file.", highlights: [H('e1'), H('e5', SOFT)] }] },
  'four-knights-game::3::Nb8@11': { ...FK_HALLOWEEN, beats: [{ atMove: 12, say: "a3 — a useful waiting move; you've given a knight for a sprawling d5-e4 centre that has driven Black's pieces home. Now you expand.", sayShort: "a3 — consolidate the big centre.", highlights: [H('d5'), H('e4', SOFT)] }, { atMove: 14, say: "e5 — the centre rolls forward, cramping Black and clamping his kingside; the Halloween Gambit's pawns are the compensation for the piece.", sayShort: "e5 — roll the centre.", arrows: [A('e5', 'f6')], highlights: [H('e5')] }] },
  'four-knights-game::3::Ne7@11': { ...FK_HALLOWEEN, beats: [{ atMove: 14, say: "e5 — the pawn centre surges, kicking Black's knights to the rim; you've sacrificed a piece for the rolling d5-e5 pawns and the initiative.", sayShort: "e5 — surge the centre.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('d5', SOFT)] }, { atMove: 18, say: "Bc4 — the bishop joins the attack on the a2-g8 diagonal, eyeing f7 while your pawns cramp Black. The Halloween Gambit's gamble in full flow.", sayShort: "Bc4 — join the attack on f7.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'four-knights-game::3::Qb6@19': { ...FK_HALLOWEEN, beats: [{ atMove: 20, say: "Nb5 — the knight jumps in with threats against c7 and the loose black king, exploiting the open lines your pawn centre created.", sayShort: "Nb5 — jump in, hit c7.", arrows: [A('b5', 'c7')], highlights: [H('b5'), H('c7', ATK)] }, { atMove: 22, say: "f5 — the pawns keep rolling, clamping Black's kingside and opening lines; the Halloween initiative presses the uncastled king.", sayShort: "f5 — roll on, clamp.", highlights: [H('f5')] }] },
  'four-knights-game::3::Neg4@13': { ...FK_HALLOWEEN, beats: [{ atMove: 14, say: "h3 — you put the question to the g4-knight, gaining a tempo while your broad centre stands; the Halloween pawns keep Black tied down.", sayShort: "h3 — question the knight.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 16, say: "e5 — the centre rolls, kicking the f6-knight and clamping the position; your pawn phalanx is the price Black paid by grabbing the piece.", sayShort: "e5 — roll, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'four-knights-game::3::Bc5@7': { ...FK_HALLOWEEN, beats: [{ atMove: 8, say: "Nxc6 — you trade the knight off rather than hold it, saddling Black with doubled c-pawns while you keep the e4-pawn and a free game.", sayShort: "Nxc6 — double his pawns.", highlights: [H('c6')] }, { atMove: 14, say: "d3 — you build a solid centre behind the e4-pawn; with Black's structure damaged, White enjoys the simpler, better position.", sayShort: "d3 — solid centre, better game.", highlights: [H('d3'), H('e4', SOFT)] }] },
  'four-knights-game::3::Qe7@15': { ...FK_HALLOWEEN, beats: [{ atMove: 16, say: "Qe2 — you line up on the e-file behind your e5-pawn, keeping the initiative; even as queens come off, your central pawns cramp Black.", sayShort: "Qe2 — line up the e-file.", highlights: [H('e2'), H('e5', SOFT)] }, { atMove: 18, say: "exf6 — the pawn crashes through, smashing Black's kingside structure; the rolling centre delivers concrete damage for the piece.", sayShort: "exf6 — smash the kingside.", highlights: [H('f6')] }] },
  'four-knights-game::3::Nb4@11': { ...FK_HALLOWEEN, beats: [{ atMove: 12, say: "a3 — you kick the b4-knight back, gaining time while your d5-e4 pawn centre cramps Black; the gambit's compensation is space and tempo.", sayShort: "a3 — kick the knight, gain time.", arrows: [A('a3', 'b4')], highlights: [H('a3'), H('b4', ATK)] }, { atMove: 14, say: "Bg5 — the bishop pins f6, adding pressure as your centre rolls; you've given the piece for a powerful initiative and a cramped opponent.", sayShort: "Bg5 — pin, add pressure.", highlights: [H('g5'), H('f6', ATK)] }] },
  'four-knights-game::3::Nf6@19': { ...FK_HALLOWEEN, beats: [{ atMove: 20, say: "f5 — the pawn phalanx surges, clamping Black's kingside and freezing his pieces; the Halloween centre keeps the initiative alive.", sayShort: "f5 — surge, clamp.", highlights: [H('f5')] }, { atMove: 22, say: "Nb5 — the knight leaps in, hitting c7 and harrying the king stuck in the centre; your pawns and pieces converge for the piece.", sayShort: "Nb5 — leap in, hit c7.", arrows: [A('b5', 'c7')], highlights: [H('b5'), H('c7', ATK)] }] },
  'four-knights-game::3::Qh4+@19': { ...FK_HALLOWEEN, beats: [{ atMove: 20, say: "g3 — you blunt the check, gaining a tempo on the queen while your d6- and centre pawns cramp Black; the initiative holds.", sayShort: "g3 — blunt the check.", highlights: [H('g3')] }, { atMove: 22, say: "Nb5 — the knight jumps in, threatening c7 and the loose king; the Halloween pawns have opened the lines for the assault.", sayShort: "Nb5 — jump in, hit c7.", arrows: [A('b5', 'c7')], highlights: [H('b5'), H('c7', ATK)] }] },
  'four-knights-game::3::Bxd6@19': { ...FK_HALLOWEEN, beats: [{ atMove: 20, say: "Qxd6 — you recapture, the queen dominating the centre while Black's king languishes; your active pieces are the compensation for the piece.", sayShort: "Qxd6 — dominate the centre.", highlights: [H('d6')] }, { atMove: 22, say: "Nb5 — the knight springs in with threats on c7 and the king stuck in the centre; the Halloween initiative keeps Black on the ropes.", sayShort: "Nb5 — spring in, hit c7.", arrows: [A('b5', 'c7')], highlights: [H('b5'), H('c7', ATK)] }] },
  'four-knights-game::4::Bd6@7': FK_BD6,
  'four-knights-game::4::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 12, say: "bxc3 — you recapture toward the centre; the doubled c-pawns come bundled with the bishop pair and a half-open b-file, a comfortable structural trade.", sayShort: "bxc3 — bishop pair, open b-file.", highlights: [H('c3')] }, { atMove: 14, say: "Bg5 — the bishop pins the f6-knight, pressuring Black's kingside while you reroute the light bishop and lean on the half-open b-file.", sayShort: "Bg5 — pin f6, press.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf3 — recapture, and the queen eyes the kingside and the long light diagonal; with the bishop pair and the b-file, White presses the symmetrical structure.", sayShort: "Qxf3 — bishops tell, press.", highlights: [H('f3')] }] },
  'four-knights-game::4::Bc5@7': FK_BC5_PAWN,
  'four-knights-game::4::g6@5': FK_G6,
  'four-knights-game::4::d6@7': FK_D6_SCOTCH,
  'four-knights-game::4::c6@17': { ...FK_SPANISH, beats: [{ atMove: 18, say: "Ba4 — the bishop sidesteps, keeping pressure on c6 alive while preparing Bc2 and the d4-break; classic slow Four Knights maneuvering.", sayShort: "Ba4 — keep pressure, prep d4.", highlights: [H('a4')] }, { atMove: 20, say: "d4 — the central break with both knights ideally placed; you open the centre for the bishop pair and seize the initiative.", sayShort: "d4 — break, seize initiative.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::4::Bxc3@9': { ...FK_SPANISH, beats: [{ atMove: 10, say: "bxc3 — you take toward the centre, gaining the bishop pair and the open b-file; the doubled pawns are a small price for the dynamic structure.", sayShort: "bxc3 — bishop pair, open b-file.", highlights: [H('c3')] }, { atMove: 14, say: "d4 — the full central break, your bishops springing to life as the position opens; White seizes space and the initiative.", sayShort: "d4 — full break, spring bishops.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::4::Bg4@13': { ...FK_SPANISH, beats: [{ atMove: 16, say: "Ng3 — the knight reaches its ideal post, eyeing f5 and h5 and challenging Black's pieces; the slow Four Knights maneuvering favours White.", sayShort: "Ng3 — ideal post, eye f5.", highlights: [H('g3'), H('f5', SOFT)] }, { atMove: 18, say: "Nf5 — the knight leaps to the dream outpost, hitting Black's kingside; you've out-maneuvered him and the initiative is yours.", sayShort: "Nf5 — dream outpost.", highlights: [H('f5')] }] },
  'four-knights-game::4::c6@19': { ...FK_SPANISH, beats: [{ atMove: 20, say: "Bd3 — the bishop redeploys to the b1-h7 diagonal, eyeing the kingside as you complete a harmonious setup behind the d4-centre.", sayShort: "Bd3 — eye the kingside.", arrows: [A('d3', 'h7')], highlights: [H('d3'), H('h7', SOFT)] }, { atMove: 22, say: "h3 — a useful prophylactic, taking g4 from Black's pieces; with the centre secured and the pieces ideal, White presses the maneuvering game.", sayShort: "h3 — prophylaxis, press.", highlights: [H('h3')] }] },
  'four-knights-game::5::Bc5@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 14, say: "O-O — you castle into a comfortable symmetrical structure; with the e4-bishop active and easy development, White holds a small, lasting pull.", sayShort: "O-O — comfortable, press.", highlights: [H('g1')] }, { atMove: 18, say: "Re1 — the rook claims the central e-file, the natural lever in this symmetrical middlegame; you probe Black's slightly passive setup.", sayShort: "Re1 — claim the e-file.", highlights: [H('e1')] }] },
  'four-knights-game::5::Bg4@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 14, say: "h3 — you put the question to the g4-bishop, winning the bishop pair or a tempo; the symmetrical structure favours the better-coordinated White pieces.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 18, say: "Qb3 — the queen swings to the queenside, eyeing b7 and f7 and probing Black's position; active piece play is White's edge here.", sayShort: "Qb3 — probe b7 and f7.", highlights: [H('b3'), H('f7', SOFT)] }] },
  'four-knights-game::5::f5@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 14, say: "Bxc6+ — you snap off the knight with check, damaging Black's queenside pawns before grabbing the e5-pawn next.", sayShort: "Bxc6+ — damage his pawns.", highlights: [H('c6')] }, { atMove: 16, say: "Nxe5 — the knight collects the central pawn, banking material while Black's overextended f5-push leaves his king airy. White is on top.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }] },
  'four-knights-game::5::Bd7@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 16, say: "d4 — you strike the centre, opening lines for your active bishop on e4; the symmetrical structure cracks in White's favour.", sayShort: "d4 — strike the centre.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Bxb7 — the bishop snaps the b-pawn, exploiting the opened long diagonal; you've won material with the more active pieces.", sayShort: "Bxb7 — snap b7.", highlights: [H('b7')] }] },
  'four-knights-game::5::Nd4@13': { ...FK_ITALIAN_FT, beats: [{ atMove: 14, say: "Nxd4 — you trade the centralised knight, keeping your structure intact; with the active e4-bishop, White holds the easier game.", sayShort: "Nxd4 — trade, stay easy.", highlights: [H('d4')] }, { atMove: 18, say: "Re1 — the rook takes the open e-file; with the bishop pair and a harmonious setup, White presses the symmetrical middlegame.", sayShort: "Re1 — take the e-file.", highlights: [H('e1')] }] },
  'four-knights-game::5::Bg4@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 16, say: "h3 — you question the g4-bishop, gaining the bishop pair or a tempo; White's coordinated pieces hold the pull in the open position.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 18, say: "d4 — the central break, opening the game for your bishops; you seize space and the initiative in the symmetrical structure.", sayShort: "d4 — break, seize space.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::5::Bd7@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 16, say: "d4 — you strike the centre, opening lines for your active e4-bishop; the position cracks open in White's favour.", sayShort: "d4 — strike, open lines.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 20, say: "Bxb7 — the bishop snaps b7 down the opened diagonal, winning material with the more active pieces. White presses.", sayShort: "Bxb7 — snap b7.", highlights: [H('b7')] }] },
  'four-knights-game::5::f5@15': { ...FK_ITALIAN_FT, beats: [{ atMove: 16, say: "Bxc6 — you snap the knight, doubling Black's pawns before collecting e5; his overextended f5-push has left the king exposed.", sayShort: "Bxc6 — double his pawns.", highlights: [H('c6')] }, { atMove: 18, say: "Nxe5 — the knight grabs the centre pawn, banking material with the better structure; White stands clearly on top.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }] },
  'four-knights-game::5::Bg4@17': { ...FK_ITALIAN_FT, beats: [{ atMove: 18, say: "c3 — you prepare d4 and shore up the centre; with the bishop pair and a flexible structure, White builds toward the central break.", sayShort: "c3 — prepare d4.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 22, say: "d4 — the break lands, opening lines for your bishops; the symmetrical structure resolves in White's favour with active pieces.", sayShort: "d4 — break, open for bishops.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::5::f5@17': { ...FK_ITALIAN_FT, beats: [{ atMove: 18, say: "Bxc6 — you snap the knight and damage Black's queenside; his loosening f5-push hands you the e5-pawn and the better game.", sayShort: "Bxc6 — damage, then win e5.", highlights: [H('c6')] }, { atMove: 20, say: "Nxe5 — the knight collects the central pawn, banking material against Black's airy kingside. White is firmly on top.", sayShort: "Nxe5 — bank the pawn.", highlights: [H('e5')] }] },
  'four-knights-game::6::cxd2+@13': { ...FK_RUBINSTEIN, beats: [{ atMove: 14, say: "Bxd2 — you recapture, emerging from the Rubinstein tactics with a sound structure and the bishop pair after the coming exf6 trades.", sayShort: "Bxd2 — recapture, stay sound.", highlights: [H('d2')] }, { atMove: 18, say: "Bc3 — the bishop dominates the long dark diagonal, eyeing g7 and the centre; with Black's king stuck on d8, White holds the initiative.", sayShort: "Bc3 — dominate the long diagonal.", arrows: [A('c3', 'g7')], highlights: [H('c3')] }] },
  'four-knights-game::6::Bc5@15': { ...FK_BC5BD6, beats: [{ atMove: 16, say: "O-O — you castle, completing development with the bishop pair and the half-open files; the Rubinstein has resolved in White's comfort.", sayShort: "O-O — complete, press.", highlights: [H('g1')] }, { atMove: 18, say: "Qh5 — the queen swings to the kingside, eyeing f7 and h7 and probing Black's king; active piece play is White's plus.", sayShort: "Qh5 — probe the kingside.", highlights: [H('h5'), H('f7', SOFT)] }] },
  'four-knights-game::6::c6@15': { ...FK_RUBINSTEIN, beats: [{ atMove: 16, say: "Bd3 — the bishop redeploys to the b1-h7 diagonal, aiming at the kingside as you complete a harmonious setup with the bishop pair.", sayShort: "Bd3 — aim at the kingside.", arrows: [A('d3', 'h7')], highlights: [H('d3'), H('h7', SOFT)] }, { atMove: 20, say: "Qh5 — the queen joins the kingside aim, pressing f7 and h7; with the bishop pair and active pieces, White holds the initiative.", sayShort: "Qh5 — press f7 and h7.", highlights: [H('h5'), H('f7', SOFT)] }] },
  'four-knights-game::6::Bb4@7': { ...FK_SPANISH, beats: [{ atMove: 12, say: "Ne2 — the knight reroutes toward g3 and f5, the thematic Four Knights maneuver, while you keep the centre flexible.", sayShort: "Ne2 — reroute to g3.", highlights: [H('e2'), H('g3', SOFT)] }, { atMove: 20, say: "d4 — the central break with the knight ideally placed; you open the centre for the bishop pair and take the initiative.", sayShort: "d4 — break, take initiative.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::6::Qe7@11': { ...FK_RUBINSTEIN, beats: [{ atMove: 12, say: "a3 — you secure the structure, keeping the extra central space; Black's loose play after grabbing on c3 lets you consolidate the edge.", sayShort: "a3 — consolidate the edge.", highlights: [H('a3')] }, { atMove: 18, say: "d4 — you expand in the centre, the e5-pawn cramping Black while your pieces flow out; White presses the spatial advantage.", sayShort: "d4 — expand, cramp him.", highlights: [H('d4'), H('e5', SOFT)] }] },
  'four-knights-game::6::cxb2@13': { ...FK_RUBINSTEIN, beats: [{ atMove: 14, say: "Bxb2 — you recapture, the bishop raking the long dark diagonal toward g7; after gxf6 trades, your activity answers the pawn.", sayShort: "Bxb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 18, say: "Qh5 — the queen swings to the kingside, eyeing f7 and h7 against Black's damaged structure; White's initiative presses.", sayShort: "Qh5 — press the kingside.", highlights: [H('h5'), H('f7', SOFT)] }] },
  'four-knights-game::6::Be7@15': { ...FK_RUBINSTEIN, beats: [{ atMove: 16, say: "Be3 — the bishop develops, eyeing the queenside and supporting your centre; with the bishop pair, White holds a small, lasting pull.", sayShort: "Be3 — develop, support centre.", highlights: [H('e3')] }, { atMove: 22, say: "Bd4 — the bishop centralises on the strong d4-square, dominating the long diagonal toward g7; White presses the better structure.", sayShort: "Bd4 — centralise, dominate.", arrows: [A('d4', 'g7')], highlights: [H('d4')] }] },
  'four-knights-game::6::Bd6@7': FK_BD6,
  'four-knights-game::6::Ng8@11': { ...FK_RUBINSTEIN, beats: [{ atMove: 12, say: "a3 — you keep the extra central space while Black's knight retreats to g8, badly misplaced; White consolidates a pleasant edge.", sayShort: "a3 — keep space, consolidate.", highlights: [H('a3'), H('e5', SOFT)] }, { atMove: 20, say: "Re1+ — the rook checks down the open e-file, exploiting Black's lagging development; you gain tempo and press the initiative.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }] },
  'four-knights-game::6::c6@11': { ...FK_RUBINSTEIN, beats: [{ atMove: 12, say: "a3 — you secure the structure and keep the extra central space; Black's slow play lets White consolidate the edge.", sayShort: "a3 — consolidate the edge.", highlights: [H('a3'), H('e5', SOFT)] }, { atMove: 14, say: "Bxd3 — you recapture on d3, the bishop eyeing the kingside; with the central space and the bishop pair, White stands more comfortably.", sayShort: "Bxd3 — recapture, eye kingside.", highlights: [H('d3'), H('h7', SOFT)] }] },
  'four-knights-game::7::Bd6@7': FK_BD6,
  'four-knights-game::7::Bxc3@11': { ...FK_SPANISH, beats: [{ atMove: 12, say: "bxc3 — you recapture toward the centre; the doubled c-pawns come bundled with the bishop pair and a half-open b-file, a comfortable structural trade.", sayShort: "bxc3 — bishop pair, open b-file.", highlights: [H('c3')] }, { atMove: 14, say: "Bg5 — the bishop pins the f6-knight, pressuring Black's kingside while you reroute the light bishop and lean on the half-open b-file.", sayShort: "Bg5 — pin f6, press.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf3 — recapture, and the queen eyes the kingside and the long light diagonal; with the bishop pair and the b-file, White presses the symmetrical structure.", sayShort: "Qxf3 — bishops tell, press.", highlights: [H('f3')] }] },
  'four-knights-game::7::Bc5@7': FK_BC5_PAWN,
  'four-knights-game::7::g6@5': FK_G6,
  'four-knights-game::7::d6@7': FK_D6_SCOTCH,
  'four-knights-game::7::h6@15': { ...FK_SPANISH, beats: [{ atMove: 16, say: "Bh4 — you keep the pin on f6, maintaining the pressure; the bishop pair and the half-open b-file give White the easier game.", sayShort: "Bh4 — keep the pin.", highlights: [H('h4'), H('f6', ATK)] }, { atMove: 18, say: "Bc4 — the bishop swings to the a2-g8 diagonal, eyeing f7 and the centre; your two bishops and structure carry a pleasant pull.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 22, say: "Qxf3 — recapture; the queen joins on the light squares and the bishop pair tells in the open symmetrical middlegame.", sayShort: "Qxf3 — bishop pair tells.", highlights: [H('f3')] }] },
  'four-knights-game::7::c5@21': { ...FK_SPANISH, beats: [{ atMove: 21, say: "c5 — Black challenges your big centre in the deep symmetric line. You hold the bishop pair, the half-open b-file and the broad centre; meet c5 with d5 or keep the tension, and press the queenside and the two bishops. The first-move edge endures.", sayShort: "c5 — hold the centre, press the bishops.", highlights: [H('d4', KEY)] }] },
  'four-knights-game::7::Bd7@15': { ...FK_SPANISH, beats: [{ atMove: 16, say: "a4 — you grab space on the open queenside, the half-open b-file and the a-pawn lever giving White the initiative on that wing.", sayShort: "a4 — queenside space.", highlights: [H('a4')] }, { atMove: 20, say: "d4 — the central break, opening the position for your bishop pair; the symmetrical structure cracks in White's favour.", sayShort: "d4 — break, open for bishops.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::7::Ne7@13': { ...FK_SPANISH, beats: [{ atMove: 14, say: "Bxf6 — you snap the knight, shattering Black's kingside pawns with gxf6; the structural damage is the symmetrical Four Knights' point.", sayShort: "Bxf6 — shatter the kingside.", highlights: [H('f6')] }, { atMove: 16, say: "d4 — the central break hits the weakened camp; you open lines toward Black's airy kingside with the bishop pair.", sayShort: "d4 — break, open lines.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::8::h6@11': { ...FK_GLEK, beats: [{ atMove: 12, say: "Na4 — the knight challenges the c5-bishop, the Glek idea; the trade hands Black doubled c-pawns and you a structural plus behind the fianchetto.", sayShort: "Na4 — challenge, double his pawns.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 18, say: "Nh4 — the knight heads for f5, probing Black's kingside; your g2-bishop and the better structure give White the pull.", sayShort: "Nh4 — head for f5.", highlights: [H('h4'), H('f5', SOFT)] }] },
  'four-knights-game::8::O-O@11': { ...FK_GLEK, beats: [{ atMove: 12, say: "O-O — you castle behind the fianchetto, a rock-solid Glek setup; with the g2-bishop raking the long diagonal, White maneuvers patiently.", sayShort: "O-O — solid Glek setup.", highlights: [H('g1'), H('g2', SOFT)] }, { atMove: 22, say: "f4 — you strike the centre, the thematic Glek break that opens lines for your rook and the long-diagonal bishop. White takes the initiative.", sayShort: "f4 — the Glek break.", arrows: [A('f4', 'e5')], highlights: [H('f4'), H('e5', ATK)] }] },
  'four-knights-game::8::Be6@11': { ...FK_GLEK, beats: [{ atMove: 12, say: "Na4 — the knight challenges the c5-bishop; trading hands Black doubled c-pawns and you the cleaner structure behind the fianchetto.", sayShort: "Na4 — challenge, double his pawns.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 18, say: "Nh4 — the knight heads for f5, probing Black's kingside; with the g2-bishop and the better structure, White presses.", sayShort: "Nh4 — head for f5.", highlights: [H('h4'), H('f5', SOFT)] }] },
  'four-knights-game::8::h6@13': { ...FK_GLEK, beats: [{ atMove: 14, say: "Nd5 — the knight leaps to the central outpost, hitting f6 and c7; trading there opens lines for your fianchettoed bishop.", sayShort: "Nd5 — central outpost.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }, { atMove: 20, say: "d4 — the central break, opening the long diagonal for your g2-bishop; White seizes the centre and the initiative.", sayShort: "d4 — break, open the diagonal.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'four-knights-game::8::Ng4@11': { ...FK_GLEK, beats: [{ atMove: 12, say: "O-O — you castle, unfazed by the g4-knight; behind the solid fianchetto, White prepares to challenge with Nd5 and h3.", sayShort: "O-O — solid, prepare h3.", highlights: [H('g1')] }, { atMove: 16, say: "Nd5 — the knight seizes the central outpost, hitting c7 and the position's soft spots; the Glek setup gives White the easier game.", sayShort: "Nd5 — seize the outpost.", highlights: [H('d5')] }] },
  'four-knights-game::8::Bg4@13': { ...FK_GLEK, beats: [{ atMove: 14, say: "h3 — you question the g4-bishop, winning the bishop pair or a tempo; the g2-bishop rakes the long diagonal once the tension clears.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 20, say: "Ne2 — the knight reroutes toward g3 and f5, the thematic maneuver; with the fianchetto and flexible centre, White presses patiently.", sayShort: "Ne2 — reroute toward f5.", highlights: [H('e2'), H('g3', SOFT)] }] },
  'four-knights-game::8::Nd4@11': { ...FK_GLEK, beats: [{ atMove: 12, say: "Na4 — the knight challenges the c5-bishop; even as Black centralises on d4, trading the bishop hands you doubled pawns and the structural plus.", sayShort: "Na4 — challenge the bishop.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 18, say: "b4 — you gain queenside space, gaining tempo on Black's bishop while your fianchetto secures the king; White expands comfortably.", sayShort: "b4 — gain queenside space.", highlights: [H('b4')] }] },
  'four-knights-game::8::Be6@13': { ...FK_GLEK, beats: [{ atMove: 14, say: "Bg5 — the bishop pins f6, pressuring Black's kingside before you trade and jump a knight to d5; the Glek maneuvering favours White.", sayShort: "Bg5 — pin, prepare Nd5.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 18, say: "Nd5 — the knight lands on the central outpost; trading there opens the long diagonal for your g2-bishop and the e-file for your rook.", sayShort: "Nd5 — central outpost.", highlights: [H('d5')] }] },
  'four-knights-game::8::Be6@15': { ...FK_GLEK, beats: [{ atMove: 18, say: "Nh4 — the knight heads for f5, probing Black's kingside; behind the solid fianchetto, White builds the maneuvering initiative.", sayShort: "Nh4 — head for f5.", highlights: [H('h4'), H('f5', SOFT)] }, { atMove: 20, say: "Nd5 — the knight seizes the central outpost, hitting f6 and c7; the trade opens the long diagonal for your g2-bishop. White presses.", sayShort: "Nd5 — seize the outpost.", highlights: [H('d5')] }] },

  // ── Scotch Game ──
  'scotch-game::0::Nf6@5': SC_NF6_EARLY,
  'scotch-game::0::Ne5@13': { ...SC_CLASSICAL, beats: [
    { atMove: 13, say: "Ne5 — Black's knight hops to e5, eyeing your bishop. Tuck it to e2 or hit it with f4; your d4-knight dominates, the bishop-pair option remains, and you keep the central pull. Trade the dark bishops and press the half-open d-file.", sayShort: "Ne5 — keep the d4 grip, press.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 14, say: "Be2 sidesteps the e5-knight while your d4-knight keeps its central grip. Castle, then f3 and Nd2 reinforce the centre and prepare a kingside push.", sayShort: "Be2 — keep the grip, then f3.", highlights: [H('d4', KEY)] },
    { atMove: 18, say: "f3 braces the centre and denies the e5-knight its outpost; with Nd2 rerouting and the half-open d-file, you press the small, lasting Scotch pull.", sayShort: "f3 — brace, press the d-file.", highlights: [H('d4', SOFT)] },
  ] },
  'scotch-game::0::d6@13': { ...SC_CLASSICAL, beats: [
    { atMove: 13, say: "d6 props Black's setup. Complete development: O-O, line the rooks on the central files, and use your space and the d4-knight's grip. Trade the dark bishops with Be3, and the half-open d-file plus the central control give a lasting pull.", sayShort: "d6 — O-O, press the d-file.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 14, say: "O-O tucks the king away; your d4-knight grips the centre and the rooks head for the central files. Trade the dark bishops with Be3 and press the half-open d-file.", sayShort: "O-O — central grip, press d-file.", highlights: [H('d4', KEY)] },
    { atMove: 16, say: "Bb5+ checks and provokes …c6, weakening Black's d6-pawn and the d5-square; retreat to e2 and play f3-Nd2, squeezing the structural edge.", sayShort: "Bb5+ — provoke …c6, then squeeze.", highlights: [H('d6', SOFT)] },
  ] },
  'scotch-game::0::Ne5@15': { ...SC_CLASSICAL, beats: [{ atMove: 16, say: "Be2 — you retreat the bishop, then strike with f4 to kick the e5-knight and seize the centre; White's space rolls forward.", sayShort: "Be2 — retreat, prepare f4.", highlights: [H('e2'), H('f4', SOFT)] }, { atMove: 20, say: "e5 — the centre surges, clamping Black and opening lines; with your broad pawns and active pieces, White takes the initiative.", sayShort: "e5 — surge, clamp.", highlights: [H('e5')] }] },
  'scotch-game::0::Bb6@15': { ...SC_CLASSICAL, beats: [
    { atMove: 15, say: "Bb6 tucks the bishop to safety. Now press: your d4-knight dominates, the rooks come to the central files, and Nd2-f3 or a kingside plan improves your game. Trade the dark bishops and squeeze the half-open d-file.", sayShort: "Bb6 — press d4 and the d-file.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 16, say: "a4 gains queenside space and threatens a5 to harry the b6-bishop; Re1 and the knight reroute build a slow, pleasant bind around your central grip.", sayShort: "a4 — queenside space, slow bind.", highlights: [H('a4', SOFT), H('d4', KEY)] },
    { atMove: 20, say: "Na3 reroutes toward c2 and the d5 and e4 squares; with the space edge and the d4-knight's grip, you patiently improve and press the small, lasting Scotch pull.", sayShort: "Na3 — reroute, improve, press.", highlights: [H('d4', SOFT)] },
  ] },
  'scotch-game::0::Bb6@13': { ...SC_CLASSICAL, beats: [
    { atMove: 13, say: "Bb6 retreats the bishop early. Complete development: O-O and the rooks to the central files, keep the d4-knight's grip, and prepare a kingside expansion. Your space and the better coordination give the pull.", sayShort: "Bb6 — O-O, keep the central grip.", arrows: [A('c4', 'f7')], highlights: [H('d4', KEY)] },
    { atMove: 16, say: "a4 gains queenside space and threatens a5 to harry the b6-bishop; Re1 and the knight reroute build a slow, pleasant bind around your central grip.", sayShort: "a4 — queenside space, slow bind.", highlights: [H('a4', SOFT), H('d4', KEY)] },
    { atMove: 20, say: "Na3 reroutes toward c2 and the d5 and e4 squares; with the space edge and the d4-knight's grip, you patiently improve and press the small, lasting Scotch pull.", sayShort: "Na3 — reroute, improve, press.", highlights: [H('d4', SOFT)] },
  ] },
  'scotch-game::0::Qg6@13': { ...SC_CLASSICAL, beats: [{ atMove: 14, say: "Nxc6 — you trade and damage Black's structure; the loose queen on g6 lets you swing Qh5 with threats against f7.", sayShort: "Nxc6 — damage, then Qh5.", highlights: [H('c6')] }, { atMove: 18, say: "Qxf7+ — the queen crashes in, driving the king and grabbing material; White's attack on the exposed king is decisive.", sayShort: "Qxf7+ — crash in.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'scotch-game::0::a6@15': { ...SC_CLASSICAL, beats: [{ atMove: 16, say: "Nc2 — the knight repositions, defending and eyeing d4 and e3; White keeps the broad centre and the bishop pair, pressing slowly.", sayShort: "Nc2 — reposition, hold the centre.", highlights: [H('c2')] }, { atMove: 18, say: "f4 — you grab kingside space and prepare e5, the thematic Scotch break; White's centre and initiative roll forward.", sayShort: "f4 — grab space, prepare e5.", highlights: [H('f4'), H('e5', SOFT)] }] },
  'scotch-game::0::Nxd4@13': { ...SC_CLASSICAL, beats: [
    { atMove: 13, say: "Nxd4 trades — recapture Bxd4 (or cxd4) and your bishops dominate the long diagonals while the half-open d-file feeds your rook. The Classical Scotch hands you the bishop pair and a pleasant pull; develop and press.", sayShort: "Nxd4 — recapture, bishop pair.", arrows: [A('e3', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 16, say: "exd5 opens the centre; your isolated d4-pawn is mobile and supports e5 and c5 advances while the bishop pair rakes the long diagonals.", sayShort: "exd5 — open it, mobile d-pawn.", highlights: [H('d4', KEY)] },
    { atMove: 18, say: "Nc3 develops and eyes the d5-square; with the bishop pair and the half-open files, you press the Classical Scotch pull — castle and double the rooks.", sayShort: "Nc3 — develop, press the files.", highlights: [H('d4', SOFT)] },
  ] },
  'scotch-game::1::Nf6@5': SC_NF6_EARLY,
  'scotch-game::1::dxc6@9': { ...SC_MIESES, beats: [{ atMove: 10, say: "Qxd8+ — you trade into a pleasant endgame; with Black's doubled c-pawns and his displaced king, White holds a small structural pull.", sayShort: "Qxd8+ — trade into a better ending.", highlights: [H('d8')] }, { atMove: 16, say: "Be3 — you develop, eyeing the queenside pawns; White's better structure gives an enduring endgame edge.", sayShort: "Be3 — develop, press the ending.", highlights: [H('e3')] }] },
  'scotch-game::1::Nb6@15': { ...SC_MIESES, beats: [{ atMove: 16, say: "Nc3 — you develop and reinforce the broad c4-e5 pawn front; White's space advantage in the Mieses is the lasting plus.", sayShort: "Nc3 — reinforce the centre.", highlights: [H('c3'), H('e5', SOFT)] }, { atMove: 18, say: "Bd2 — the bishop develops toward c3 and the long diagonal, supporting your centre; White presses the spatial bind.", sayShort: "Bd2 — support the centre.", highlights: [H('d2')] }] },
  'scotch-game::1::O-O-O@17': { ...SC_MIESES, beats: [{ atMove: 18, say: "Bb2 — the bishop takes the long diagonal, eyeing e5 and g7; with your space and the fianchetto, White holds the initiative against Black's king.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 22, say: "Bg2 — the second fianchetto completes a harmonious setup; White's pieces converge on the long diagonals and the centre.", sayShort: "Bg2 — harmonious setup.", highlights: [H('g2')] }] },
  'scotch-game::1::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::1::Qb4+@15': { ...SC_MIESES, beats: [{ atMove: 16, say: "Nd2 — you block the check and develop, keeping the broad pawn front; White's space and central control answer the queen sortie.", sayShort: "Nd2 — block, keep the centre.", highlights: [H('d2')] }, { atMove: 18, say: "Qe3 — the queen centralises, defending and eyeing the kingside; with the c4-e5 pawns cramping Black, White presses.", sayShort: "Qe3 — centralise, press.", highlights: [H('e3'), H('e5', SOFT)] }] },
  'scotch-game::1::Qh4@17': { ...SC_MIESES, beats: [{ atMove: 18, say: "Bb2 — the bishop rakes the long diagonal toward g7 and e5; White's space and bishop pressure hold the initiative.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 20, say: "Qc2 — the queen sidesteps to safety while keeping the centre; with the broad pawns and the fianchetto, White stays comfortably on top.", sayShort: "Qc2 — sidestep, stay on top.", highlights: [H('c2')] }] },
  'scotch-game::1::Nb6@17': { ...SC_MIESES, beats: [{ atMove: 18, say: "Bb2 — the bishop takes the long diagonal, eyeing e5 and g7; White's space and the fianchetto press Black's king.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 22, say: "exd6 — you open the position favourably, the passed d-pawn and your active bishops pressing Black's king; White holds the edge.", sayShort: "exd6 — open, press the king.", highlights: [H('d6')] }] },
  'scotch-game::1::g5@17': { ...SC_MIESES, beats: [{ atMove: 18, say: "Bb2 — the bishop rakes the long diagonal toward g7 and e5; the fianchetto and your space give White the initiative.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 20, say: "Nd2 — the knight develops toward c4 or e4, completing your setup; White's space and the long-diagonal bishop carry the pull.", sayShort: "Nd2 — develop, complete.", highlights: [H('d2')] }] },
  'scotch-game::2::Nf6@5': SC_NF6_EARLY,
  'scotch-game::2::O-O@19': { ...SC_BC4, beats: [{ atMove: 20, say: "Nd2 — you challenge the e4-knight, the key to the Advance Variation; trading it leaves White with the better structure and the e5-pawn.", sayShort: "Nd2 — challenge e4.", arrows: [A('d2', 'e4')], highlights: [H('d2'), H('e4', ATK)] }, { atMove: 22, say: "Nxe4 — you snap the knight, clarifying the centre; White's e5-pawn and bishop pair give a lasting space edge.", sayShort: "Nxe4 — clarify the centre.", highlights: [H('e4')] }] },
  'scotch-game::2::Be7@17': { ...SC_BC4, beats: [{ atMove: 18, say: "f3 — you put the question to the e4-knight, gaining space and the bishop pair; White's centre and initiative roll forward.", sayShort: "f3 — question e4, gain space.", arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4', ATK)] }, { atMove: 20, say: "f4 — the kingside pawns surge, clamping Black and opening lines; White's space advantage presses hard.", sayShort: "f4 — surge, clamp.", highlights: [H('f4')] }] },
  'scotch-game::2::Bxc6@15': { ...SC_BC4, beats: [{ atMove: 16, say: "O-O — you castle, the e5-pawn cramping Black; White's lead in development and the advanced centre give the initiative.", sayShort: "O-O — castle, cramp him.", highlights: [H('g1'), H('e5', SOFT)] }, { atMove: 20, say: "e6! — the pawn stabs forward, ripping open Black's position; White's pieces flood through the cracks for a decisive attack.", sayShort: "e6 — stab, rip it open.", highlights: [H('e6')] }] },
  'scotch-game::2::Bb6@19': { ...SC_BC4, beats: [{ atMove: 20, say: "Nd2 — you challenge the e4-knight while keeping the e5-pawn; White's better structure and space tell.", sayShort: "Nd2 — challenge e4.", arrows: [A('d2', 'e4')], highlights: [H('d2'), H('e4', ATK)] }, { atMove: 22, say: "e6 — the pawn stabs into Black's camp, opening lines for your pieces; White seizes the initiative.", sayShort: "e6 — stab, open lines.", highlights: [H('e6')] }] },
  'scotch-game::2::c5@17': { ...SC_BC4, beats: [{ atMove: 18, say: "Nb3 — the knight repositions, eyeing c5 and a5 while keeping the e5-pawn; White's space and structure give the pull.", sayShort: "Nb3 — reposition, hold e5.", highlights: [H('b3'), H('c5', SOFT)] }, { atMove: 20, say: "f3 — you put the question to the e4-knight, gaining space; White's centre and bishop pair press Black's cramped position.", sayShort: "f3 — question e4.", arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4', ATK)] }] },
  'scotch-game::2::Qe7@19': { ...SC_BC4, beats: [{ atMove: 20, say: "Re1 — the rook backs the e5-pawn and the e-file; White's advanced centre and active pieces hold the initiative.", sayShort: "Re1 — back e5.", highlights: [H('e1'), H('e5', SOFT)] }, { atMove: 22, say: "f3 — you question the e4-knight, gaining space and the bishop pair; White presses the cramped Black position.", sayShort: "f3 — question e4.", arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4', ATK)] }] },
  'scotch-game::2::Bc5@7': { ...SC_CLASSICAL, beats: [{ atMove: 8, say: "c3 — the Haxo Gambit: you offer the pawn back to build a broad centre and a lead in development; rapid attack is the compensation.", sayShort: "c3 — gambit for development.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 16, say: "exd5 — you open the centre, the bishops and rooks springing to life; White's development lead is full value for the pawn.", sayShort: "exd5 — open, spring out.", highlights: [H('d5')] }] },
  'scotch-game::2::Bc5@13': { ...SC_BC4, beats: [{ atMove: 14, say: "Be3 — you develop with a hit on the c5-bishop, reinforcing your knight; White's e5-pawn and active pieces give the edge.", sayShort: "Be3 — hit c5, reinforce.", arrows: [A('e3', 'c5')], highlights: [H('e3'), H('c5', ATK)] }, { atMove: 18, say: "O-O — you castle behind the advanced e5-pawn; White's space and lead in development press Black's cramped position.", sayShort: "O-O — castle, press.", highlights: [H('g1'), H('e5', SOFT)] }] },
  'scotch-game::3::Nf6@5': SC_NF6_EARLY,
  'scotch-game::3::Bxc3+@11': { ...SC_NC3_IQP, beats: [{ atMove: 12, say: "bxc3 — you recapture, and after the knight snaps the queen on d8 you'll emerge with the bishop pair and a healthy lead in the resulting play.", sayShort: "bxc3 — win material next.", highlights: [H('c3')] }, { atMove: 16, say: "Bg5 — the bishop pins f6, and with Black's king stuck on d8 your pieces swarm; the Scotch hands White a clear initiative.", sayShort: "Bg5 — pin, swarm the king.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf6+ — the queen crashes in with check, harrying Black's exposed king; your activity and the bishop pair convert the edge.", sayShort: "Qxf6+ — crash in, convert.", highlights: [H('f6')] }] },
  'scotch-game::3::dxc6@11': { ...SC_NC3_IQP, beats: [{ atMove: 12, say: "a3 — you put the question to the b4-bishop; after the queens come off you'll win it or the bishop pair, with the better structure.", sayShort: "a3 — question the bishop.", highlights: [H('a3'), H('b4', ATK)] }, { atMove: 18, say: "Na2 — the knight rounds up the b4-pawn, restoring material balance with the bishop pair and a pleasant endgame edge.", sayShort: "Na2 — round up b4.", arrows: [A('a2', 'b4')], highlights: [H('a2'), H('b4', ATK)] }] },
  'scotch-game::3::Bd6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Bd6 develops toward your king. Keep the pieces aimed: Bg5 pins, Qf3 swings, Rad1 backs the centre, and the light squares around Black's king beckon. The IQP is dynamic; press the kingside before Black consolidates.", sayShort: "Bd6 — pile on the kingside, press.", highlights: [H('d5', KEY)] }] },
  'scotch-game::3::h6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 keeps the pin, or Bxf6 to damage Black's kingside. Your pieces are active, Qf3 and Bd3 eye the king, and the IQP is a dynamic asset. Keep forcing on the kingside.", sayShort: "h6 — Bh4 or Bxf6, keep attacking.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'scotch-game::3::c6@17': { ...SC_NC3_IQP, beats: [{ atMove: 18, say: "Re1+ — the rook checks down the open e-file, gaining tempo and exposing Black's loose centre; you develop with pressure.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }, { atMove: 22, say: "Qf3 — the queen eyes the d5-pawn and the kingside; with active pieces and pressure on the isolated centre pawn, White holds the edge.", sayShort: "Qf3 — pressure d5.", highlights: [H('f3'), H('d5', SOFT)] }] },
  'scotch-game::3::Bxc3@17': { ...SC_NC3_IQP, beats: [{ atMove: 18, say: "Qe2+ — the check on the open e-file disrupts Black's coordination, forcing an awkward block before you regain the piece.", sayShort: "Qe2+ — disrupt, regain.", arrows: [A('e2', 'e8')], highlights: [H('e2')] }, { atMove: 20, say: "Bb5+ — another check, harrying Black and winning back the bishop on c3 with the better structure and the initiative.", sayShort: "Bb5+ — harry, regain.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'scotch-game::3::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::3::Rb8@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Rb8 — Black eyes the half-open b-file. No matter: your kingside attack is faster. Bg5 pins, Qf3 and Bd3 train on the king, and Rad1 backs the centre. The IQP is dynamic; press at the king before Black's counterplay arrives.", sayShort: "Rb8 — your attack is faster, press.", highlights: [H('d5', KEY)] }] },
  'scotch-game::4::Nf6@5': SC_NF6_EARLY,
  'scotch-game::4::Nf6@13': { ...SC_GORING, beats: [{ atMove: 14, say: "Nd5 — the knight leaps to the central outpost, hitting f6 and c7; the Göring Gambit's lead in development crashes into Black's position.", sayShort: "Nd5 — central outpost.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }, { atMove: 16, say: "Bg5 — the bishop pins f6, piling pressure on Black's kingside; White's two bishops and initiative answer the gambit pawns.", sayShort: "Bg5 — pin, pile on.", highlights: [H('g5'), H('f6', ATK)] }] },
  'scotch-game::4::Bg4@13': { ...SC_GORING, beats: [{ atMove: 14, say: "Qb3 — the queen joins the c4-bishop's aim at f7, setting up the thematic Bxf7+ blow; the Göring's pieces converge on the king.", sayShort: "Qb3 — aim at f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 16, say: "Bxf7+ — the bishop crashes in, dragging the king out; White's lead in development turns into a winning attack.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'scotch-game::4::Bg4@15': { ...SC_GORING, beats: [{ atMove: 16, say: "Qb3 — the queen joins the aim at f7, setting up Bxf7+; the Göring's pieces converge on Black's king.", sayShort: "Qb3 — aim at f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Bxf7+ — the bishop crashes in, dragging the king out; the gambit's lead in development becomes a decisive attack.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'scotch-game::4::Be6@15': { ...SC_GORING, beats: [{ atMove: 16, say: "Bxe6 — you trade and shatter Black's pawns with fxe6; White's lead in development and the open lines press the initiative.", sayShort: "Bxe6 — shatter the pawns.", highlights: [H('e6')] }, { atMove: 18, say: "Qb3 — the queen swings to attack b7 and the queenside; the Göring's activity reaps material for the gambit pawns.", sayShort: "Qb3 — attack b7.", arrows: [A('b3', 'b7')], highlights: [H('b3'), H('b7', ATK)] }] },
  'scotch-game::4::Be6@13': { ...SC_GORING, beats: [{ atMove: 14, say: "Nd5 — the knight seizes the centre, hitting Black's pieces; the Göring's rapid development swarms the position.", sayShort: "Nd5 — seize the centre.", highlights: [H('d5')] }, { atMove: 16, say: "Ng5 — the knight pounces toward f7, the eternal target; with both pieces converging, White's attack breaks through.", sayShort: "Ng5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }] },
  'scotch-game::4::h6@13': { ...SC_GORING, beats: [{ atMove: 14, say: "Nd5 — the knight leaps to the outpost, hitting c7 and Black's pieces; the Göring's initiative rolls on for the pawns.", sayShort: "Nd5 — leap to the outpost.", highlights: [H('d5')] }, { atMove: 18, say: "b4 — you gain queenside space with tempo, opening lines for your pieces; White's activity is full compensation for the gambit.", sayShort: "b4 — gain space, open lines.", highlights: [H('b4')] }] },
  'scotch-game::4::Nge7@13': { ...SC_GORING, beats: [{ atMove: 14, say: "Ng5 — the knight jumps at f7, the Göring's target; Black must react and White's pieces swarm the king.", sayShort: "Ng5 — jump at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 18, say: "Qxc4 — you recapture, the queen now eyeing f7 with decisive threats; White's attack on the stranded king is winning.", sayShort: "Qxc4 — recapture, eye f7.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'scotch-game::4::h6@15': { ...SC_GORING, beats: [{ atMove: 16, say: "e5 — the centre surges, clamping Black and opening lines for your bishops; the Göring's pawns dominate the board.", sayShort: "e5 — surge, clamp.", highlights: [H('e5')] }, { atMove: 18, say: "Ba3 — the bishop rakes the a3-f8 diagonal, hitting d6 and cramping Black's king; White's two bishops press the attack.", sayShort: "Ba3 — rake, cramp the king.", arrows: [A('a3', 'f8')], highlights: [H('a3')] }] },
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
  'scotch-game::5::Qxe4+@11': { ...SC_STEINITZ_QH4, beats: [{ atMove: 12, say: "Be3 — you block the check and develop with tempo; Black's greedy queen grab has cost time, and White's lead in development compensates the pawn.", sayShort: "Be3 — block, develop.", highlights: [H('e3')] }, { atMove: 16, say: "Nc4 — the knight jumps to a strong post, hitting the a5-bishop and eyeing d6; White's active pieces press for the pawn.", sayShort: "Nc4 — strong post, hit a5.", arrows: [A('c4', 'a5')], highlights: [H('c4')] }] },
  'scotch-game::5::Bc5@9': { ...SC_STEINITZ_QH4, beats: [
    { atMove: 9, say: "…Bc5 develops in the Steinitz raid line, but Black's early queen sortie has left him loose. Your Nb5 already eyes c7 — develop and threaten.", sayShort: "…Bc5 — Nb5 eyes c7.", arrows: [A('b5', 'c7')], highlights: [H('c7', KEY)] },
    { atMove: 10, say: "Qe2 develops with threats, supporting the Nb5 raid on c7 and the fork of a8 while Black's queen sits awkwardly on h4. You're a tempo or two ahead — keep developing and punish the early sortie.", sayShort: "Qe2 — back Nb5, press the lead.", arrows: [A('b5', 'c7')], highlights: [H('c7', KEY), H('h4', SOFT)] },
  ] },
  'scotch-game::5::Qxe4+@9': { ...SC_STEINITZ_QH4, beats: [{ atMove: 10, say: "Be2 — you block the check, developing while Black's king is stuck in the centre; White's lead in development answers the pawn grab.", sayShort: "Be2 — block, develop.", highlights: [H('e2')] }, { atMove: 16, say: "O-O — you castle, the open b-file and the displaced black king giving White full compensation; the initiative is yours.", sayShort: "O-O — castle, press.", highlights: [H('g1')] }] },
  'scotch-game::6::Nf6@5': SC_NF6_EARLY,
  'scotch-game::6::Bxc3+@11': { ...SC_NC3_IQP, beats: [{ atMove: 12, say: "bxc3 — you recapture, and after the knight snaps the queen on d8 you'll emerge with the bishop pair and a healthy lead in the resulting play.", sayShort: "bxc3 — win material next.", highlights: [H('c3')] }, { atMove: 16, say: "Bg5 — the bishop pins f6, and with Black's king stuck on d8 your pieces swarm; the Scotch hands White a clear initiative.", sayShort: "Bg5 — pin, swarm the king.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Qxf6+ — the queen crashes in with check, harrying Black's exposed king; your activity and the bishop pair convert the edge.", sayShort: "Qxf6+ — crash in, convert.", highlights: [H('f6')] }] },
  'scotch-game::6::dxc6@11': { ...SC_NC3_IQP, beats: [{ atMove: 12, say: "a3 — you put the question to the b4-bishop; after the queens come off you'll win it or the bishop pair, with the better structure.", sayShort: "a3 — question the bishop.", highlights: [H('a3'), H('b4', ATK)] }, { atMove: 18, say: "Na2 — the knight rounds up the b4-pawn, restoring material balance with the bishop pair and a pleasant endgame edge.", sayShort: "Na2 — round up b4.", arrows: [A('a2', 'b4')], highlights: [H('a2'), H('b4', ATK)] }] },
  'scotch-game::6::c6@17': { ...SC_NC3_IQP, beats: [{ atMove: 18, say: "Re1+ — the rook checks down the open e-file, gaining tempo and exposing Black's loose centre; you develop with pressure.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }, { atMove: 22, say: "Qf3 — the queen eyes the d5-pawn and the kingside; with active pieces and pressure on the isolated centre pawn, White holds the edge.", sayShort: "Qf3 — pressure d5.", highlights: [H('f3'), H('d5', SOFT)] }] },
  'scotch-game::6::Bxc3@17': { ...SC_NC3_IQP, beats: [{ atMove: 18, say: "Qe2+ — the check on the open e-file disrupts Black's coordination, forcing an awkward block before you regain the piece.", sayShort: "Qe2+ — disrupt, regain.", arrows: [A('e2', 'e8')], highlights: [H('e2')] }, { atMove: 20, say: "Bb5+ — another check, harrying Black and winning back the bishop on c3 with the better structure and the initiative.", sayShort: "Bb5+ — harry, regain.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'scotch-game::6::h6@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "h6 questions your g5-bishop — Bh4 holds the pin or Bxf6 dents the kingside. Your pieces flow toward the king with Qf3 and Bd3, the knight reroutes via Ne2-g3, and the IQP gives dynamic play. Keep forcing.", sayShort: "h6 — Bh4, reroute Ng3, attack.", highlights: [H('g5', KEY), H('d5', SOFT)] }] },
  'scotch-game::6::Bc5@7': { ...SC_CLASSICAL, beats: [
    { atMove: 7, say: "…Bc5 — the Classical Scotch, the bishop posted opposite your d4-knight. Challenge it head-on with Be3.", sayShort: "…Bc5 — answer Be3.", arrows: [A('c1', 'e3')], highlights: [H('e3', KEY)] },
    { atMove: 8, say: "Be3 braces the knight and offers the bishop trade. Follow with c3, Bc4 and castling for a small, lasting pull down the half-open d-file while Black untangles.", sayShort: "Be3 — brace, then c3 and Bc4.", highlights: [H('d4', KEY), H('c5', SOFT)] },
  ] },
  'scotch-game::6::Be7@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Be7 breaks the pin on f6. Reroute and press: Ne2-g3 heads for f5, Qf3 and Bd3 aim at the king, and the rooks claim the central files. The near-symmetrical IQP is level; make the win on the kingside.", sayShort: "Be7 — Ng3 and Qf3, press the king.", highlights: [H('d5', KEY)] }] },
  'scotch-game::6::Bg4@21': { ...SC_NC3_IQP, beats: [{ atMove: 21, say: "Bg4 hits your queen — drop it to g3 or e3, keeping the attack alive. Ne2-g3 reroutes toward f5, Bd3 eyes h7, and the central files are yours. The IQP is dynamic; keep the pieces pointed at Black's king.", sayShort: "Bg4 — retreat the queen, keep attacking.", highlights: [H('d5', KEY)] }] },
  'scotch-game::7::Nf6@5': SC_NF6_EARLY,
  'scotch-game::7::O-O@13': { ...SC_NB3_MODERN, beats: [{ atMove: 14, say: "Bg5 — the bishop pins f6, pressuring Black's kingside; White's harmonious Potter setup builds slow pressure.", sayShort: "Bg5 — pin, pressure.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 18, say: "a4 — you gain queenside space, the thematic Potter expansion; White presses on the wing with the better-placed pieces.", sayShort: "a4 — queenside expansion.", highlights: [H('a4')] }] },
  'scotch-game::7::O-O@15': { ...SC_NB3_MODERN, beats: [{ atMove: 16, say: "O-O-O — you castle long, the rooks aiming at the centre and kingside; White's opposite-side attack with f3 and h4 looms.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }, { atMove: 20, say: "h4 — the pawn storm begins, the standard plan after opposite castling; White races at Black's king.", sayShort: "h4 — storm the king.", highlights: [H('h4')] }] },
  'scotch-game::7::Nf6@7': { ...SC_NB3_MODERN, beats: [
    { atMove: 7, say: "…Nf6 develops and pokes at e4. The clean plan: trade on c6 to wreck Black's pawns, then ram e5 to seize the centre and gain time on the knight.", sayShort: "…Nf6 — Nxc6, then e5.", arrows: [A('d4', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 9, say: "…bxc6 — Black's queenside pawns are doubled and his structure dented. Now seize the centre by force.", sayShort: "…bxc6 — his pawns are doubled.", arrows: [A('e4', 'e5')], highlights: [H('c6', SOFT), H('e5', KEY)] },
    { atMove: 10, say: "e5 — the wedge rolls up, kicking the f6-knight to the rim and clamping the middle. Black scrambles with …Qe7 to bite at the pawn.", sayShort: "e5 — clamp, kick the knight.", arrows: [A('e5', 'f6')], highlights: [H('e5', KEY), H('f6', SOFT)] },
    { atMove: 12, say: "Qe2 props the e5-wedge and develops. Black blockades with …Nd5 to level the game, but you keep the spatial pull and the safer structure — castle and lean on those doubled c-pawns.", sayShort: "Qe2 — hold e5, press the pawns.", arrows: [A('e2', 'e5')], highlights: [H('e5', KEY), H('c6', SOFT)] },
  ] },
  'scotch-game::7::Be6@15': { ...SC_NB3_MODERN, beats: [{ atMove: 16, say: "O-O-O — you castle long, connecting rooks and eyeing the d-file; White's coordinated Potter setup holds the initiative.", sayShort: "O-O-O — castle long, connect.", highlights: [H('c1')] }, { atMove: 20, say: "Bg2 — the bishop fianchettoes, raking the long diagonal and the centre; White's harmonious development presses.", sayShort: "Bg2 — fianchetto, rake.", highlights: [H('g2')] }] },
  'scotch-game::7::Bg4@15': { ...SC_NB3_MODERN, beats: [{ atMove: 16, say: "Qd2 — the queen connects toward the queenside and the dark squares, preparing O-O-O; White builds the Potter middlegame patiently.", sayShort: "Qd2 — connect, prepare O-O-O.", highlights: [H('d2')] }, { atMove: 18, say: "Qxe3 — you recapture, the queen centralised and eyeing both wings; White's pieces are harmonious and the initiative holds.", sayShort: "Qxe3 — recapture, centralise.", highlights: [H('e3')] }] },
  'scotch-game::7::Qe7@13': { ...SC_NB3_MODERN, beats: [{ atMove: 14, say: "Bg5 — the bishop pins f6, pressuring Black's kingside while his queen sits passively on e7; White's Potter setup builds the initiative.", sayShort: "Bg5 — pin, pressure f6.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 22, say: "Nd5 — the knight leaps to the central outpost with tempo on the queen, dominating the position; White presses the Potter middlegame.", sayShort: "Nd5 — outpost with tempo.", highlights: [H('d5')] }] },
  'scotch-game::7::Re8@19': { ...SC_NB3_MODERN, beats: [{ atMove: 20, say: "f3 — you shore up the centre and prepare a kingside pawn storm after the opposite castling; White's attack on Black's king looms.", sayShort: "f3 — shore up, prepare the storm.", highlights: [H('f3')] }, { atMove: 22, say: "a3 — a useful luft on the queenside where your king sits; with the rooks coordinated, White presses the Potter middlegame.", sayShort: "a3 — luft, then press.", highlights: [H('a3')] }] },
  'scotch-game::7::Qe7@15': { ...SC_NB3_MODERN, beats: [{ atMove: 16, say: "O-O-O — you castle long, connecting rooks and aiming at the centre; with opposite castling, White's pawn storm against the black king is the plan.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }, { atMove: 20, say: "Bg2 — the bishop fianchettoes, raking the long diagonal and the centre; White's harmonious Potter setup holds the initiative.", sayShort: "Bg2 — fianchetto, rake.", highlights: [H('g2')] }] },

  // ── Scotch Gambit ──
  'scotch-gambit::0::d6@5': SCG_D6,
  'scotch-gambit::0::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 6, say: "dxe5 — you snap the centre pawn, the point of the gambit declined; White banks a clean pawn and a space edge.", sayShort: "dxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 14, say: "Bc4 — the bishop eyes f7 and the centre; with the extra pawn and active pieces, White presses the pull.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'scotch-gambit::0::Ng4@11': { ...SCG_MAIN, beats: [{ atMove: 12, say: "cxd4 — you recapture, building the broad centre; with the bishop on c4 and the lead in development, White's gambit pays off.", sayShort: "cxd4 — build the centre.", highlights: [H('d4')] }, { atMove: 14, say: "Nxd4 — you recentralise the knight, keeping the initiative; White's active pieces and centre dominate.", sayShort: "Nxd4 — recentralise.", highlights: [H('d4')] }] },
  'scotch-gambit::0::Ne4@11': { ...SCG_MAIN, beats: [{ atMove: 12, say: "Bd5 — the bishop dominates the centre, hitting the e4-knight and f7; White's piece activity presses Black's loose position.", sayShort: "Bd5 — dominate, hit e4.", arrows: [A('d5', 'e4')], highlights: [H('d5'), H('e4', ATK)] }, { atMove: 18, say: "Bxb2 — you recapture, the bishop raking the long diagonal; despite the chaos White's bishops and centre give full play.", sayShort: "Bxb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'scotch-gambit::0::Qe7@11': { ...SCG_MAIN, beats: [{ atMove: 12, say: "O-O — you castle, the rook eyeing the e-file where Black's queen sits exposed behind the e5-pawn; a tactical trap looms.", sayShort: "O-O — eye the e-file.", highlights: [H('g1'), H('e5', SOFT)] }, { atMove: 16, say: "Rxe7+ — the rook crashes through, winning the queen for rook and bishop; White emerges with a decisive material edge.", sayShort: "Rxe7+ — win the queen.", highlights: [H('e7')] }] },
  'scotch-gambit::0::Ng8@11': { ...SCG_MAIN, beats: [{ atMove: 12, say: "O-O — you castle, ahead in development as Black's knight slinks back to g8; White's initiative is full value for the pawn.", sayShort: "O-O — castle, lead.", highlights: [H('g1')] }, { atMove: 18, say: "Bxf7+ — the bishop crashes in, dragging the king out; White's lead in development becomes a winning attack.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'scotch-gambit::0::Nd7@13': { ...SCG_MAIN, beats: [{ atMove: 14, say: "cxd4 — you recapture, building the broad d4-e5 centre; White's space and development edge press Black's cramped position.", sayShort: "cxd4 — broad centre.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 16, say: "Nc3 — you complete development toward d5, the harmonious Scotch Gambit setup; White's centre and pieces dominate.", sayShort: "Nc3 — develop toward d5.", highlights: [H('c3'), H('d5', SOFT)] }] },
  'scotch-gambit::0::Bg4@17': { ...SCG_MAIN, beats: [{ atMove: 18, say: "h3 — you question the g4-bishop, gaining the bishop pair or a tempo; White's broad centre and active pieces hold the pull.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 22, say: "Bxc6+ — you trade, damaging Black's pawns with the recapture; White's centre and the bishop pair give a lasting edge.", sayShort: "Bxc6+ — damage his pawns.", highlights: [H('c6')] }] },
  'scotch-gambit::0::Ng4@13': { ...SCG_MAIN, beats: [{ atMove: 14, say: "cxd4 — you recapture, the d4-e5 duo cramping Black; White's space and active pieces hold the initiative.", sayShort: "cxd4 — cramp him.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 18, say: "Bxh6 — you snap the knight, shattering Black's kingside pawns with gxh6; White's structure and bishop press hard.", sayShort: "Bxh6 — shatter the kingside.", highlights: [H('h6')] }] },
  'scotch-gambit::0::Qe7@13': { ...SCG_MAIN, beats: [{ atMove: 14, say: "O-O — you castle, the broad centre and the bishop on b5 pressuring; White's development edge is full value for the pawn.", sayShort: "O-O — castle, press.", highlights: [H('g1')] }, { atMove: 16, say: "cxd4 — you recapture, the d4-e5 duo cramping Black; White's space and active pieces hold the initiative.", sayShort: "cxd4 — cramp him.", highlights: [H('d4'), H('e5', SOFT)] }] },
  'scotch-gambit::1::d6@5': SCG_D6,
  'scotch-gambit::1::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 6, say: "dxe5 — you snap the centre pawn, the point of the gambit declined; White banks a clean pawn and a space edge.", sayShort: "dxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 14, say: "Bc4 — the bishop eyes f7 and the centre; with the extra pawn and active pieces, White presses the pull.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'scotch-gambit::1::Ng4@13': { ...SCG_SHARP, beats: [{ atMove: 14, say: "Bxf7+! — the bishop crashes in, dragging the king out; the London Defense punished by White's lead in development.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }, { atMove: 18, say: "Qxg4 — you regain the piece, the queen active and Black's king exposed; White's initiative is decisive compensation.", sayShort: "Qxg4 — regain, press.", highlights: [H('g4')] }] },
  'scotch-gambit::1::Ne4@13': { ...SCG_SHARP, beats: [{ atMove: 14, say: "Qd5 — the queen centralises with a double attack on the e4-knight and f7; White regains material and keeps the initiative.", sayShort: "Qd5 — double attack.", arrows: [A('d5', 'e4')], highlights: [H('d5'), H('e4', ATK)] }, { atMove: 18, say: "Bxb2 — you recapture, the bishop raking the long diagonal toward g7; White's active pieces give full play for the pawn.", sayShort: "Bxb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'scotch-gambit::1::cxb2@13': { ...SCG_SHARP, beats: [{ atMove: 14, say: "Bxb2 — you recapture, the bishop dominating the long diagonal toward g7; White's lead in development answers the pawns.", sayShort: "Bxb2 — dominate the diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }, { atMove: 18, say: "Ne4 — the knight leaps to a strong central post, eyeing d6 and f6; White's active pieces press the initiative.", sayShort: "Ne4 — strong central post.", highlights: [H('e4')] }] },
  'scotch-gambit::1::Nf6@7': { ...SCG_NF6_EARLY, beats: [{ atMove: 8, say: "O-O — you castle and ignore the pawn, the Scotch Gambit's lead in development the whole point; White's rooks swing to the centre.", sayShort: "O-O — castle, lead.", highlights: [H('g1')] }, { atMove: 16, say: "Nxe4 — you regain the piece, emerging with active pieces and the initiative for the gambit pawn; White stands well.", sayShort: "Nxe4 — regain, press.", highlights: [H('e4')] }] },
  'scotch-gambit::1::Ng8@13': { ...SCG_SHARP, beats: [{ atMove: 14, say: "bxc3 — you recapture, the broad pawn centre and open lines compensating; White's development lead presses Black's cramped position.", sayShort: "bxc3 — broad centre.", highlights: [H('c3')] }, { atMove: 20, say: "Nd4 — the knight centralises, eyeing f5 and the kingside; White's space and active pieces hold the initiative.", sayShort: "Nd4 — centralise.", highlights: [H('d4')] }] },
  'scotch-gambit::1::Bc5@7': { ...SCG_MAIN, beats: [{ atMove: 8, say: "c3 — the Haxo Gambit: you offer the pawn back to build a broad centre and a lead in development; rapid attack is the compensation.", sayShort: "c3 — gambit for development.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 16, say: "exd5 — you open the centre, the bishops and rooks springing to life; White's development lead is full value for the pawn.", sayShort: "exd5 — open, spring out.", highlights: [H('d5')] }] },
  'scotch-gambit::1::Qxf6@15': { ...SCG_SHARP, beats: [{ atMove: 16, say: "Bxd5 — you grab the central pawn, the bishop dominating and Black's king exposed; White's activity answers the pawns.", sayShort: "Bxd5 — grab, dominate.", highlights: [H('d5')] }, { atMove: 20, say: "Qxb2 — you regain the pawn, the queen raking the long diagonal toward g7; White's pieces are coordinated and pressing.", sayShort: "Qxb2 — regain, rake.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'scotch-gambit::1::Qe7@19': { ...SCG_SHARP, beats: [{ atMove: 20, say: "Qxc4 — you regain the pawn, the queen active in the centre; White's lead in development presses Black's position.", sayShort: "Qxc4 — regain, active.", highlights: [H('c4')] }, { atMove: 22, say: "Qd3 — the queen eyes the kingside and the loose c3-pawn; White's active pieces hold the initiative.", sayShort: "Qd3 — eye the kingside.", highlights: [H('d3')] }] },
  'scotch-gambit::2::d6@5': SCG_D6,
  'scotch-gambit::2::Nf6@5': { ...SCG_NF6_EARLY, beats: [{ atMove: 6, say: "dxe5 — you snap the centre pawn, the point of the gambit declined; White banks a clean pawn and a space edge.", sayShort: "dxe5 — bank the pawn.", highlights: [H('e5')] }, { atMove: 14, say: "Bc4 — the bishop eyes f7 and the centre; with the extra pawn and active pieces, White presses the pull.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'scotch-gambit::2::Be7@17': { ...SCG_MAXLANGE, beats: [{ atMove: 18, say: "f3 — you put the question to the e4-knight, gaining space and the bishop pair; White's centre and initiative roll forward.", sayShort: "f3 — question e4, gain space.", arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4', ATK)] }, { atMove: 20, say: "f4 — the kingside pawns surge, clamping Black and opening lines; White's space advantage presses hard.", sayShort: "f4 — surge, clamp.", highlights: [H('f4')] }] },
  'scotch-gambit::2::Bxc6@15': { ...SCG_MAXLANGE, beats: [{ atMove: 16, say: "O-O — you castle, the e5-pawn cramping Black; White's lead in development and the advanced centre give the initiative.", sayShort: "O-O — castle, cramp him.", highlights: [H('g1'), H('e5', SOFT)] }, { atMove: 20, say: "e6! — the pawn stabs forward, ripping open Black's position; White's pieces flood through the cracks for a decisive attack.", sayShort: "e6 — stab, rip it open.", highlights: [H('e6')] }] },
  'scotch-gambit::2::c5@17': { ...SCG_MAXLANGE, beats: [{ atMove: 18, say: "Nb3 — the knight repositions, eyeing c5 and a5 while keeping the e5-pawn; White's space and structure give the pull.", sayShort: "Nb3 — reposition, hold e5.", highlights: [H('b3'), H('c5', SOFT)] }, { atMove: 20, say: "f3 — you put the question to the e4-knight, gaining space; White's centre and bishop pair press Black's cramped position.", sayShort: "f3 — question e4.", arrows: [A('f3', 'e4')], highlights: [H('f3'), H('e4', ATK)] }] },
  'scotch-gambit::2::Ne6@21': SCG_MAXLANGE,
  'scotch-gambit::2::Bxd4+@19': { ...SCG_MAXLANGE, beats: [{ atMove: 20, say: "Qxd4 — you recapture, the queen dominating the centre; White's e5-pawn and space give a comfortable edge.", sayShort: "Qxd4 — dominate the centre.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 22, say: "Bxg5 — you snap the knight, simplifying favourably; White's central space and bishop pair carry the pull.", sayShort: "Bxg5 — snap, simplify.", highlights: [H('g5')] }] },
  'scotch-gambit::2::Bc5@7': { ...SCG_MAIN, beats: [{ atMove: 8, say: "c3 — the Haxo Gambit: you offer the pawn back to build a broad centre and a lead in development; rapid attack is the compensation.", sayShort: "c3 — gambit for development.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 16, say: "exd5 — you open the centre, the bishops and rooks springing to life; White's development lead is full value for the pawn.", sayShort: "exd5 — open, spring out.", highlights: [H('d5')] }] },
  'scotch-gambit::2::Bc5@13': { ...SCG_MAXLANGE, beats: [{ atMove: 14, say: "Be3 — you develop with a hit on the c5-bishop, reinforcing your knight; White's e5-pawn and active pieces give the edge.", sayShort: "Be3 — hit c5, reinforce.", arrows: [A('e3', 'c5')], highlights: [H('e3'), H('c5', ATK)] }, { atMove: 18, say: "O-O — you castle behind the advanced e5-pawn; White's space and lead in development press Black's cramped position.", sayShort: "O-O — castle, press.", highlights: [H('g1'), H('e5', SOFT)] }] },
  'scotch-gambit::2::Ne4@9': { ...SCG_MAXLANGE, beats: [{ atMove: 10, say: "O-O — you castle, the e5-pawn cramping Black; White's lead in development and the advanced centre give the initiative.", sayShort: "O-O — castle, cramp him.", highlights: [H('g1'), H('e5', SOFT)] }, { atMove: 16, say: "Bd5 — the bishop dominates the centre, hitting c6 and f7; White's active pieces press Black's cramped position.", sayShort: "Bd5 — dominate, hit f7.", arrows: [A('d5', 'f7')], highlights: [H('d5'), H('f7', SOFT)] }] },

  // ── Evans Gambit ──
  'evans-gambit::0::Nf6@5': EV_NF6,
  'evans-gambit::0::Qe7@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "d5 — the spearhead stabs at c6, kicking the knight and grabbing the centre while Black's queen sits awkwardly on e7, blocking his own bishop.", sayShort: "d5 — hit c6, seize the centre.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', SOFT)] }, { atMove: 20, say: "Qa3 — the queen swings to the a3-f8 diagonal, freezing the cramped black king on f8 and eyeing d6. Your development and open lines are full value for the pawn; pile in.", sayShort: "Qa3 — freeze the king, press d6.", highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::0::Qf6@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "d5 — you slam the pawn forward, hitting c6 and gaining a protected passed pawn in the centre. Black's queen on f6 is loose, so every tempo you win tells.", sayShort: "d5 — hit c6, gain space.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', SOFT)] }, { atMove: 22, say: "Nbd2 — the last piece joins, heading for c4 and e4 outposts. You're a pawn down with a raging centre, the bishop pair and every piece working — convert the initiative.", sayShort: "Nbd2 — finish developing, press.", highlights: [H('d2'), H('c4', SOFT)] }] },
  'evans-gambit::0::Be7@5': EV_BE7_5,
  'evans-gambit::0::Nf6@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "Rd1 — the rook crashes onto the open d-file, skewering the black queen on d7. Black must trade into Rxd1, and you recapture with the queen, keeping the bind and the bishops.", sayShort: "Rd1 — pin the queen on d7.", arrows: [A('d1', 'd7')], highlights: [H('d1'), H('d7', ATK)] }, { atMove: 22, say: "Be3 — the dark bishop eyes a7 and the queenside; with both bishops raking Black's camp and the open d-file yours, the gambit pawn is a memory. Squeeze.", sayShort: "Be3 — bishops rake, squeeze.", highlights: [H('e3'), H('a7', SOFT)] }] },
  'evans-gambit::0::Be7@9': EV_BE7_9,
  'evans-gambit::0::exd4@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "O-O — you ignore the pawn and castle, throwing your rook onto the half-open files. The lead in development is the gambit's whole point; speed beats material here.", sayShort: "O-O — castle, lead in development.", highlights: [H('g1')] }, { atMove: 14, say: "Ba3 — the bishop slices to a3, stopping Black from castling and pinning his hopes to an awkward king. With the centre about to roll e5, your attack writes itself.", sayShort: "Ba3 — stop castling, then e5.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::0::Na5@19': { ...EV_ATTACK, beats: [{ atMove: 20, say: "Bxf7+! — the classic Evans blow. The king is dragged onto f7, stripped of shelter, and your pieces pour in down the open lines for the sacrificed pawn and more.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7', ATK)] }, { atMove: 22, say: "Rd8+ — the rook checks into the open d-file, harrying the exposed king. Black is a pawn up on paper but his king is naked in the centre; that's the trade you wanted.", sayShort: "Rd8+ — harry the open king.", arrows: [A('d8', 'e8')], highlights: [H('d8')] }] },
  'evans-gambit::0::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — declining the pawn lets you turn the tempo into a queenside lunge. a4 threatens a5, chasing the b6-bishop and prising open lines before Black is settled.", sayShort: "a4 — lunge, threaten a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — now the centre rolls. You've gained space on both wings; the broad pawns and freer pieces give the easier game without ever risking the pawn.", sayShort: "d4 — roll the centre, easier game.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::0::Bb6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Nbd2 — with dxe5 already played you keep building: the knight routes to c4 or e4 and the d-file opens for your rook. Black's pieces are tangled; develop with threats.", sayShort: "Nbd2 — route to c4, build.", highlights: [H('d2'), H('c4', SOFT)] }, { atMove: 18, say: "Qc2 — the queen sidesteps and keeps the battery toward h7 alive while exd6 looms to rip open the centre. A pawn down, every piece pointing at the king.", sayShort: "Qc2 — keep the battery, open exd6.", highlights: [H('c2'), H('d6', SOFT)] }] },
  'evans-gambit::1::Qf6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "e5! — the pawn lunges with tempo, kicking the f6-queen offside to g6 and clearing e4 for your knight. The compromised black centre cracks open under your lead.", sayShort: "e5 — kick the queen, open lines.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }, { atMove: 20, say: "Ba3 — the bishop nails the f8-square, stopping Black castling, while your rooks swing to the d- and e-files. Two pawns invested, a full-blown attack returned.", sayShort: "Ba3 — stop O-O, swing rooks.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::1::Nf6@5': EV_NF6,
  'evans-gambit::1::Nh6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Bxh6! — you smash the knight, wrecking Black's kingside pawns with gxh6 and laying his king bare. The compromised defence collapses on the dark squares.", sayShort: "Bxh6 — wreck the kingside.", highlights: [H('h6', ATK)] }, { atMove: 18, say: "Bxf7+ — the second bishop crashes in, dragging the king out before it can hide. With both wings torn open and your queen on b3, this is the Evans dream.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7', ATK)] }] },
  'evans-gambit::1::Be7@5': EV_BE7_5,
  'evans-gambit::1::d6@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "Qb3 — the queen swings to b3, training the battery with your c4-bishop straight at f7. Black must spend a tempo defending; you develop with constant threats.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Bb5 — pinning and pressuring c6, you prepare to trade and open lines while Black's king lingers. The two open files and the bishop pair pay for the pawn.", sayShort: "Bb5 — pin c6, open lines.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', SOFT)] }] },
  'evans-gambit::1::Be7@9': EV_BE7_9,
  'evans-gambit::1::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — the declined Evans hands you the initiative for free. a4 threatens a5 to harass the b6-bishop and grab queenside space before Black coordinates.", sayShort: "a4 — threaten a5, grab space.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — the centre rolls forward. With space on both wings and the freer pieces, you hold a pleasant, risk-free pull — the pawn never even left the board.", sayShort: "d4 — roll the centre, press.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::1::Nge7@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "cxd4 — you recapture and stand behind a broad d4-e4 duo, the bishops blazing and the rooks owning the half-open b- and c-files. A pawn down and dominating.", sayShort: "cxd4 — broad centre, bishops blaze.", highlights: [H('d4'), H('e4', SOFT)] }, { atMove: 18, say: "Ba3 — the bishop rakes the a3-f8 diagonal, hitting the f8-square and cramping Black's king in the centre. Every piece points forward; turn the lead into an attack.", sayShort: "Ba3 — cramp the king, attack.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::1::Bd6@9': { ...EV_BD6, beats: [{ atMove: 10, say: "d4 — Black's modern Bd6 overprotects e5, so you simply build the big centre and keep the bishop pair. Patient pressure on the cramped position is the way.", sayShort: "d4 — big centre, keep pressing.", highlights: [H('d4'), H('e4', SOFT)] }, { atMove: 14, say: "Re1 — the rook backs the e-file and prepares e5 or Nbd2-c4, prising at the d6-bishop. The gambit pawn buys lasting initiative; out-develop him.", sayShort: "Re1 — back e5, build pressure.", highlights: [H('e1'), H('e5', SOFT)] }] },
  'evans-gambit::1::Nf6@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "Ba3 — the bishop slices to a3, freezing Black's king in the centre, while e5 looms to kick the f6-knight. Your lead in development sets the board alight.", sayShort: "Ba3 — freeze the king, then e5.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }, { atMove: 16, say: "e5! — the pawn jumps, harrying the knight to e4 and opening the long diagonals for your bishops. A pawn or two down, a full attacking head of steam.", sayShort: "e5 — harry the knight, open lines.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }] },
  'evans-gambit::2::Nf6@5': EV_NF6,
  'evans-gambit::2::Bxb4@7': { ...EV_BXB4, beats: [{ atMove: 8, say: "c3 — the gambit's key move: you offer a tempo to drive the bishop back and clamp d4 under your control. Next d4 builds the centre the Evans lives for.", sayShort: "c3 — clamp d4, then build.", highlights: [H('c3'), H('d4', SOFT)] }, { atMove: 14, say: "O-O — castled and coiled, your rooks eye the half-open files while the centre stands broad. The pawn bought you development and the bishop pair; press it.", sayShort: "O-O — coil the rooks, press.", highlights: [H('g1')] }] },
  'evans-gambit::2::Be7@5': EV_BE7_5,
  'evans-gambit::2::h6@13': { ...EV_BB6_QUIET, beats: [{ atMove: 14, say: "Nd5! — the knight leaps into the heart of Black's camp, hitting the b6-bishop and the c7-square. h6 did nothing useful; you seize the centre with tempo.", sayShort: "Nd5 — leap in with tempo.", arrows: [A('d5', 'b6')], highlights: [H('d5'), H('b6', SOFT)] }, { atMove: 18, say: "Ba3 — the bishop rakes the a3-f8 diagonal, hitting d6 and cramping Black's king. With more space and the better minor pieces, you hold a clear, durable pull.", sayShort: "Ba3 — rake d6, durable pull.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('d6', ATK)] }] },
  'evans-gambit::2::O-O@13': { ...EV_BB6_QUIET, beats: [{ atMove: 14, say: "Rb1 — the rook lifts to the half-open b-file, lining up against b7 and the queenside while Black's pieces sit passive. You turn the screw without hurry.", sayShort: "Rb1 — pressure the b-file.", highlights: [H('b1'), H('b7', SOFT)] }, { atMove: 18, say: "a5 — the pawn lunges, kicking the b6-bishop to a7 and clamping the queenside. More space, the bishop pair in reserve, the easier game — keep squeezing.", sayShort: "a5 — clamp, gain the easier game.", arrows: [A('a5', 'b6')], highlights: [H('a5'), H('b6', ATK)] }] },
  'evans-gambit::2::Nxb4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 14, say: "a5! — you ignore the pawn-grab and lunge, hemming the b6-bishop while the strayed b4-knight has no good road home. Black's greed loses time you exploit at once.", sayShort: "a5 — hem the bishop, exploit time.", arrows: [A('a5', 'b6')], highlights: [H('a5'), H('b6', ATK)] }, { atMove: 18, say: "Ba3 — the bishop pins the b4-knight to the king's prospects and bears down the diagonal. With your lead in development and open lines, the pawn is well spent.", sayShort: "Ba3 — pin the strayed knight.", arrows: [A('a3', 'b4')], highlights: [H('a3'), H('b4', ATK)] }] },
  'evans-gambit::2::d6@11': { ...EV_BB6_QUIET, beats: [{ atMove: 12, say: "Nd5! — the knight bounds to the central outpost, eyeing b6 and c7 and forcing Black to react. The declined Evans gives you free rein in the centre.", sayShort: "Nd5 — central outpost, react him.", arrows: [A('d5', 'b6')], highlights: [H('d5'), H('b6', SOFT)] }, { atMove: 20, say: "exd5 — the centre opens on your terms; your rooks find files and the bishop pair wakes. More space and the freer game are the dividend of declining cleanly.", sayShort: "exd5 — open lines, freer game.", highlights: [H('d5'), H('e4', SOFT)] }] },
  'evans-gambit::2::Nd4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 14, say: "a5 — before answering the centralised knight you lunge on the wing, hitting the b6-bishop. Black's Nd4 will be traded off and you keep the queenside initiative.", sayShort: "a5 — lunge, hit the bishop.", arrows: [A('a5', 'b6')], highlights: [H('a5'), H('b6', ATK)] }, { atMove: 16, say: "Qxf3 — recapturing toward the centre, your queen eyes f7 and the open lines. With the bishop pair and more space, the declined Evans hums along in your favour.", sayShort: "Qxf3 — recapture, eye f7.", highlights: [H('f3'), H('f7', SOFT)] }] },
  'evans-gambit::2::a5@9': { ...EV_BB6_QUIET, beats: [{ atMove: 10, say: "b5 — you push past, gaining queenside space and the c6-knight a target. Black's a5 bit on b5 but handed you a protected wedge; the initiative stays yours.", sayShort: "b5 — push past, gain space.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', ATK)] }, { atMove: 16, say: "d4 — the centre rolls and Black's bishop has been shuffled to b6 with tempo lost. You command more space on both wings — a comfortable, risk-free pull.", sayShort: "d4 — roll the centre, comfort.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::2::Ng4@13': { ...EV_BB6_QUIET, beats: [{ atMove: 14, say: "O-O — you brush off the f2-lunge; with the king's bishop guarding and your king tucked away, the g4-knight just bites granite. Develop and let it look silly.", sayShort: "O-O — ignore the lunge, develop.", highlights: [H('g1'), H('f2', SOFT)] }, { atMove: 16, say: "Nd5 — the knight seizes the central outpost, hitting b6 and c7 while Black's pieces flail on the kingside. Your space and coordination carry the day.", sayShort: "Nd5 — seize the outpost.", arrows: [A('d5', 'b6')], highlights: [H('d5'), H('b6', SOFT)] }] },
  'evans-gambit::3::Nf6@5': EV_NF6,
  'evans-gambit::3::Nf6@13': { ...EV_BD6, beats: [{ atMove: 14, say: "Bd5 — the bishop plants itself in the centre, eyeing c6 and f7 and daring Black to break the bind. You stand a pawn down but bursting with activity.", sayShort: "Bd5 — dominate the centre.", arrows: [A('d5', 'f7')], highlights: [H('d5'), H('f7', ATK)] }, { atMove: 22, say: "e5 — the centre breaks open, your bishops and rooks pouring through Black's cramped camp; the gambit pawn was long since repaid in initiative.", sayShort: "e5 — break open, pour in.", highlights: [H('e5'), H('d6', SOFT)] }] },
  'evans-gambit::3::exd4@13': { ...EV_BD6, beats: [{ atMove: 14, say: "cxd4 — recapture and the broad d4-e4 duo stands proud, the bishops blazing across the open board and your rooks finding the half-open files.", sayShort: "cxd4 — broad duo, bishops blaze.", highlights: [H('d4'), H('e4', SOFT)] }, { atMove: 22, say: "Qa4 — the queen swings out, raking toward e8 and pressuring c6 while Black's king lingers. Pieces poised, the pawn a distant memory.", sayShort: "Qa4 — rake the diagonal, press c6.", arrows: [A('a4', 'c6')], highlights: [H('a4'), H('c6', ATK)] }] },
  'evans-gambit::3::Qf6@13': { ...EV_BD6, beats: [{ atMove: 14, say: "a4 — you grab queenside space with tempo, the lunge eyeing a5 to cramp Black while his queen sits passively on f6, blocking his own knight.", sayShort: "a4 — gain space, eye a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 18, say: "d5 — the spearhead clamps the centre, shoving Black's knight to the rim. Space everywhere, the easier game, the pawn well spent.", sayShort: "d5 — clamp, shove the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }] },
  'evans-gambit::3::Be7@5': EV_BE7_5,
  'evans-gambit::3::Ba5@9': { ...EV_BA5, beats: [{ atMove: 10, say: "d4 — the gambit's engine: you slam the centre open, the c4-bishop glaring at f7 and your development flowing while Black's bishop sits offside on a5.", sayShort: "d4 — open the centre, eye f7.", highlights: [H('d4'), H('f7', SOFT)] }, { atMove: 14, say: "Ba3 — the bishop cuts to a3, stopping Black from castling and freezing his king while e5 looms to kick the knight. Lead in development, full attack.", sayShort: "Ba3 — stop O-O, then e5.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::3::Qe7@13': { ...EV_BD6, beats: [{ atMove: 16, say: "Nbd2 — the knight heads for c4 and e4, the natural Evans regrouping, while Black's queen on e7 clogs his own development. You mobilise smoothly.", sayShort: "Nbd2 — route to c4, mobilise.", highlights: [H('d2'), H('c4', SOFT)] }, { atMove: 20, say: "Bd5 — the bishop dominates the centre, hitting b7 and f7; with both bishops raking and the open lines yours, the initiative is full value for the pawn.", sayShort: "Bd5 — dominate, rake the lines.", arrows: [A('d5', 'b7')], highlights: [H('d5'), H('f7', ATK)] }] },
  'evans-gambit::3::Be7@9': EV_BE7_9,
  'evans-gambit::3::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — declining the pawn lets you turn the tempo into a queenside lunge. a4 threatens a5, chasing the b6-bishop and prising open lines before Black is settled.", sayShort: "a4 — lunge, threaten a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — now the centre rolls. You've gained space on both wings; the broad pawns and freer pieces give the easier game without ever risking material.", sayShort: "d4 — roll the centre, easier game.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::3::Nf6@11': { ...EV_BD6, beats: [{ atMove: 12, say: "O-O — you castle and coil, the centre broad and the rooks ready to back an e5 break against Black's cramped position.", sayShort: "O-O — coil, prepare e5.", highlights: [H('g1'), H('e5', SOFT)] }, { atMove: 18, say: "Qb3 — the queen joins the c4-bishop in a battery against f7, the classic Evans pressure that keeps Black tied down. Develop with threats.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }] },
  'evans-gambit::4::Nf6@5': EV_NF6,
  'evans-gambit::4::Nxe5@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Nxe5! — you snap the knight, and after the recapture the f7-point falls bare. Black's king is about to be hauled into the open with no shelter.", sayShort: "Nxe5 — bare the f7-point.", highlights: [H('e5'), H('f7', ATK)] }, { atMove: 18, say: "Bxf7+ — the bishop crashes in with check, dragging the king to e7 where Ba3+ and your pieces hunt it. The sacrificed pawn was only bait.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7', ATK)] }] },
  'evans-gambit::4::Bg4@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Bb5 — you pin and pressure c6, sidestepping the g4-bishop's gaze and keeping the initiative rolling toward Black's stranded king.", sayShort: "Bb5 — pin c6, keep rolling.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', SOFT)] }, { atMove: 18, say: "exd6 — you open the centre, your rooks and bishops bearing down the freed files while Black is still untangling. A pawn down, fully in charge.", sayShort: "exd6 — open the files, dominate.", highlights: [H('d6')] }] },
  'evans-gambit::4::Be7@5': EV_BE7_5,
  'evans-gambit::4::Qe7@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "Nbd2 — the last piece develops toward c4, completing the Evans setup; Black's queen shuffles while you finish mobilising every man.", sayShort: "Nbd2 — complete the setup.", highlights: [H('d2'), H('c4', SOFT)] }, { atMove: 20, say: "Bd5 — the bishop seizes the centre, eyeing f7 and b7, and Qa3 will rake the dark squares. Every piece points at the king for the pawn.", sayShort: "Bd5 — seize centre, eye f7.", arrows: [A('d5', 'f7')], highlights: [H('d5'), H('f7', ATK)] }] },
  'evans-gambit::4::Nge7@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "exd6 — you swap into a structure where Black's pawns shatter; once the queens come off, the open files and the bishop pair are your dividend.", sayShort: "exd6 — shatter, simplify favourably.", highlights: [H('d6')] }, { atMove: 20, say: "Bf4 — the bishop hits the d6-pawn and the dark squares; in the endgame your better structure and active pieces give a lasting edge for the pawn.", sayShort: "Bf4 — hit d6, press the ending.", arrows: [A('f4', 'd6')], highlights: [H('f4'), H('d6', ATK)] }] },
  'evans-gambit::4::Be7@9': EV_BE7_9,
  'evans-gambit::4::exd4@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "O-O — you ignore the pawn and castle, throwing your rook onto the half-open files. The lead in development is the gambit's whole point; speed beats material.", sayShort: "O-O — castle, lead in development.", highlights: [H('g1')] }, { atMove: 14, say: "Ba3 — the bishop slices to a3, stopping Black from castling and pinning his hopes to an awkward king. With e5 about to roll, your attack writes itself.", sayShort: "Ba3 — stop castling, then e5.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::4::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — declining the pawn lets you turn the tempo into a queenside lunge. a4 threatens a5, chasing the b6-bishop and prising open lines before Black is settled.", sayShort: "a4 — lunge, threaten a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — now the centre rolls. You've gained space on both wings; the broad pawns and freer pieces give the easier game without ever risking material.", sayShort: "d4 — roll the centre, easier game.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::4::Na5@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "Qb5+! — the check forks the king and the a5-knight's defence; Black must block awkwardly and you win material back with the initiative intact.", sayShort: "Qb5+ — fork king and knight.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }, { atMove: 20, say: "Nxe5 — you snap the centre pawn back, the knight landing on a dominant square with threats; the gambit has paid itself off and then some.", sayShort: "Nxe5 — recapture, dominate.", highlights: [H('e5'), H('f7', SOFT)] }] },
  'evans-gambit::5::Nf6@5': EV_NF6,
  'evans-gambit::5::Bg4@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "d5! — you push the spearhead, hitting c6 and ignoring the g4-pin; the centre rolls and Black's pieces scramble to cope.", sayShort: "d5 — push, hit c6.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }, { atMove: 18, say: "Qa4 — the queen swings out with tempo, pinning c6 and the queenside; sharp complications favour the side with the initiative — you.", sayShort: "Qa4 — pin c6, keep initiative.", arrows: [A('a4', 'c6')], highlights: [H('a4'), H('c6', ATK)] }] },
  'evans-gambit::5::Nf6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Nbd2 — the knight routes to c4 or f1-g3, the classic Evans regrouping behind your broad d4-e4 centre. Smooth mobilisation, a pawn down and pressing.", sayShort: "Nbd2 — regroup behind the centre.", highlights: [H('d2'), H('c4', SOFT)] }, { atMove: 18, say: "d5 — you clamp the centre, shoving the c6-knight to the rim; with more space and the bishop pair, the long-term pull is yours.", sayShort: "d5 — clamp, gain the pull.", arrows: [A('d5', 'c6')], highlights: [H('d5')] }] },
  'evans-gambit::5::Nge7@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Ng5 — the knight pounces at f7, and with Qb3 coming the threats pile up against Black's stranded king before he can castle.", sayShort: "Ng5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 18, say: "Qb3 — the queen joins the assault on f7; the battery and the g5-knight overwhelm the defence. This is the Evans initiative at full tilt.", sayShort: "Qb3 — pile on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }] },
  'evans-gambit::5::Ne5@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "Nxe5 — you trade off Black's centralised knight and keep your pawn duo and the open lines; the d5-wedge cramps him badly.", sayShort: "Nxe5 — trade, keep the wedge.", highlights: [H('e5'), H('d5', SOFT)] }, { atMove: 22, say: "Ba3 — the bishop rakes to a3, hitting the e7-knight's shelter and the dark squares while Black scrambles to castle. Pressure everywhere.", sayShort: "Ba3 — rake, pressure the king.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::5::h6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Qb3 — straight to the battery: queen and bishop train on f7, and h6 has done nothing to address it. Black is already on the back foot.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "d5 — the wedge drives the c6-knight to the miserable d8-square; your space and the two raking bishops make this a model Evans bind.", sayShort: "d5 — wedge, bind him.", arrows: [A('d5', 'c6')], highlights: [H('d5')] }] },
  'evans-gambit::5::Nce7@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "e5 — the second pawn rolls, clamping the centre and opening lines while Black's knights are tangled on the back ranks.", sayShort: "e5 — roll, clamp the centre.", highlights: [H('e5'), H('d6', SOFT)] }, { atMove: 22, say: "Bb5+ — the check disrupts Black's coordination and trades to leave you the freer game with the powerful d-pawns; the gambit has paid off.", sayShort: "Bb5+ — disrupt, stay freer.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'evans-gambit::5::Bd7@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Qb3 — the queen eyes f7 and b7; Bd7 shored up c6 but left f7 to be hounded. You develop with constant threats.", sayShort: "Qb3 — hound f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 20, say: "Nd5 — the knight leaps to the central outpost, hitting f6 and c7; trading there opens the e-file for your rook and the d5-knight cramps Black.", sayShort: "Nd5 — central outpost, open lines.", arrows: [A('d5', 'f6')], highlights: [H('d5')] }] },
  'evans-gambit::5::Be7@5': EV_BE7_5,
  'evans-gambit::5::d6@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "Qb3 — the queen swings to b3, training the battery with your c4-bishop straight at f7. Black must spend a tempo defending; you develop with constant threats.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Bb5 — pinning and pressuring c6, you prepare to trade and open lines while Black's king lingers. The two open files and the bishop pair pay for the pawn.", sayShort: "Bb5 — pin c6, open lines.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', SOFT)] }] },
  'evans-gambit::6::Nf6@5': EV_NF6,
  'evans-gambit::6::Nf6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "e5! — the pawn jumps with tempo, kicking the f6-knight to the rim and clamping Black's centre; your initiative snowballs.", sayShort: "e5 — kick the knight, clamp.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }, { atMove: 20, say: "Bg5 — the bishop develops with a threat toward Black's queen and the dark squares while your centre and pieces dominate. Pawn well spent.", sayShort: "Bg5 — develop with a threat.", arrows: [A('g5', 'd8')], highlights: [H('g5')] }] },
  'evans-gambit::6::Nge7@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Ng5 — the knight jumps at f7, the eternal Evans target; Black must lash out, and every pawn break opens lines toward his king.", sayShort: "Ng5 — hit f7, open lines.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 22, say: "Qa4+ — the check regains the piece on c4 with interest, leaving you a clear initiative and the powerful d6-pawn deep in Black's camp.", sayShort: "Qa4+ — regain material, press d6.", arrows: [A('a4', 'e8')], highlights: [H('a4')] }] },
  'evans-gambit::6::h6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "Qb3 — the battery aims at f7; h6 ignored your real threat, and now Black must contort to defend. You dictate the play.", sayShort: "Qb3 — aim at f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Nc3 — the knight develops toward d5, completing your mobilisation behind the broad centre. Every piece in play, a pawn down and pressing.", sayShort: "Nc3 — develop toward d5.", highlights: [H('c3'), H('d5', SOFT)] }] },
  'evans-gambit::6::Qf6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "e5! — the pawn lunges with tempo, kicking the f6-queen to g6 and seizing the centre; Black's pieces are shoved to the edge.", sayShort: "e5 — kick the queen, seize centre.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }, { atMove: 22, say: "Re1+ — the rook crashes onto the open e-file with check, harrying Black's uncastled king; your lead in development becomes a direct attack.", sayShort: "Re1+ — check, harry the king.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }] },
  'evans-gambit::6::Be7@5': EV_BE7_5,
  'evans-gambit::6::d6@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "Qb3 — the queen swings to b3, training the battery with your c4-bishop straight at f7. Black must spend a tempo defending; you develop with constant threats.", sayShort: "Qb3 — battery on f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', ATK)] }, { atMove: 18, say: "Bb5 — pinning and pressuring c6, you prepare to trade and open lines while Black's king lingers. The two open files and the bishop pair pay for the pawn.", sayShort: "Bb5 — pin c6, open lines.", arrows: [A('b5', 'c6')], highlights: [H('b5'), H('c6', SOFT)] }] },
  'evans-gambit::6::Be7@9': EV_BE7_9,
  'evans-gambit::6::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — declining the pawn lets you turn the tempo into a queenside lunge. a4 threatens a5, chasing the b6-bishop and prising open lines before Black is settled.", sayShort: "a4 — lunge, threaten a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — now the centre rolls. You've gained space on both wings; the broad pawns and freer pieces give the easier game without ever risking material.", sayShort: "d4 — roll the centre, easier game.", highlights: [H('d4'), H('e4', SOFT)] }] },
  'evans-gambit::6::Nge7@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "cxd4 — you recapture and stand behind a broad d4-e4 duo, the bishops blazing and the rooks owning the half-open b- and c-files. A pawn down and dominating.", sayShort: "cxd4 — broad centre, bishops blaze.", highlights: [H('d4'), H('e4', SOFT)] }, { atMove: 18, say: "Ba3 — the bishop rakes the a3-f8 diagonal, hitting the f8-square and cramping Black's king in the centre. Every piece points forward; turn the lead into an attack.", sayShort: "Ba3 — cramp the king, attack.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::7::Nf6@5': EV_NF6,
  'evans-gambit::7::Qe7@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "d5 — the spearhead stabs at c6, kicking the knight and grabbing the centre while Black's queen sits awkwardly on e7, blocking his own bishop.", sayShort: "d5 — hit c6, seize the centre.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', SOFT)] }, { atMove: 20, say: "Qa3 — the queen swings to the a3-f8 diagonal, freezing the cramped black king on f8 and eyeing d6. Your development is full value for the pawn; pile in.", sayShort: "Qa3 — freeze the king, press d6.", highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::7::Qf6@13': { ...EV_ATTACK, beats: [{ atMove: 14, say: "d5 — you slam the pawn forward, hitting c6 and gaining a protected passed pawn in the centre. Black's queen on f6 is loose, so every tempo you win tells.", sayShort: "d5 — hit c6, gain space.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', SOFT)] }, { atMove: 22, say: "Nbd2 — the last piece joins, heading for c4 and e4 outposts. You're a pawn down with a raging centre, the bishop pair and every piece working — convert it.", sayShort: "Nbd2 — finish developing, press.", highlights: [H('d2'), H('c4', SOFT)] }] },
  'evans-gambit::7::Nf6@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "dxe5 — you open the centre, the e5-pawn cramping Black and the d-file beckoning your rook; the f7-battery hums in the background.", sayShort: "dxe5 — open centre, cramp him.", highlights: [H('e5'), H('f7', SOFT)] }, { atMove: 18, say: "exd6 — the pawn wedges deep into Black's camp, shattering his structure; with the bishop pair and open lines, the pawn is amply repaid.", sayShort: "exd6 — wedge deep, shatter.", highlights: [H('d6')] }] },
  'evans-gambit::7::Be7@5': EV_BE7_5,
  'evans-gambit::7::Na5@17': { ...EV_ATTACK, beats: [{ atMove: 18, say: "Qc2 — the queen slips to safety while keeping the battery toward h7 alive; Black's knight on the rim at a5 will be traded, leaving you the better pieces.", sayShort: "Qc2 — keep the battery, better pieces.", highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 22, say: "Nxb6 — you snap off Black's good bishop, doubling his pawns and handing yourself the bishop pair in an open position. Full value for the gambit.", sayShort: "Nxb6 — take the bishop pair.", highlights: [H('b6')] }] },
  'evans-gambit::7::exd4@15': { ...EV_ATTACK, beats: [{ atMove: 16, say: "cxd4 — recapture and the d4-e4 duo towers over the board, the bishops raking and the rooks ready for the open files.", sayShort: "cxd4 — towering centre.", highlights: [H('d4'), H('e4', SOFT)] }, { atMove: 18, say: "d5 — the wedge clamps Black's position and shoves his knight to e7; your space advantage and the two bishops promise a lasting squeeze.", sayShort: "d5 — wedge, squeeze.", arrows: [A('d5', 'c6')], highlights: [H('d5')] }] },
  'evans-gambit::7::Be7@9': EV_BE7_9,
  'evans-gambit::7::exd4@11': { ...EV_ATTACK, beats: [{ atMove: 12, say: "O-O — you ignore the pawn and castle, throwing your rook onto the half-open files. The lead in development is the gambit's whole point; speed beats material.", sayShort: "O-O — castle, lead in development.", highlights: [H('g1')] }, { atMove: 14, say: "Ba3 — the bishop slices to a3, stopping Black from castling and pinning his hopes to an awkward king. With e5 about to roll, your attack writes itself.", sayShort: "Ba3 — stop castling, then e5.", arrows: [A('a3', 'f8')], highlights: [H('a3'), H('f8', ATK)] }] },
  'evans-gambit::7::Bb6@7': { ...EV_BB6_QUIET, beats: [{ atMove: 8, say: "a4 — declining the pawn lets you turn the tempo into a queenside lunge. a4 threatens a5, chasing the b6-bishop and prising open lines before Black is settled.", sayShort: "a4 — lunge, threaten a5.", arrows: [A('a4', 'a5')], highlights: [H('a4'), H('b6', SOFT)] }, { atMove: 14, say: "d4 — now the centre rolls. You've gained space on both wings; the broad pawns and freer pieces give the easier game without ever risking material.", sayShort: "d4 — roll the centre, easier game.", highlights: [H('d4'), H('e4', SOFT)] }] },

  // -- Kings Gambit --
  'kings-gambit::0::g4@9': { ...KG_HANSTEIN, beats: [{ atMove: 10, say: "Ng5 — the knight leaps toward f7, the King's Gambit's eternal target; you've given a pawn for a raging attack on Black's king.", sayShort: "Ng5 — leap toward f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 18, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's pieces and centre dominate the open position.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::0::Bg4@13': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Qd3 — the queen centralises, eyeing the kingside and supporting e5; White's big centre and attacking pieces are full value for the pawn.", sayShort: "Qd3 — centralise, eye e5.", highlights: [H('d3')] }, { atMove: 20, say: "Rxh8 — you grab the exchange, the open h-file paying off; White's material and the broad centre give the advantage.", sayShort: "Rxh8 — grab the exchange.", highlights: [H('h8')] }] },
  'kings-gambit::0::Nc6@11': { ...KG_HANSTEIN, beats: [{ atMove: 12, say: "Nc3 — you develop, completing the broad pawn-and-piece centre; White's space and the c4-bishop are the compensation for the pawn.", sayShort: "Nc3 — complete the centre.", highlights: [H('c3')] }, { atMove: 14, say: "Qd3 — the queen centralises behind the big centre, eyeing the kingside; White's attacking setup presses Black's loose position.", sayShort: "Qd3 — centralise, press.", highlights: [H('d3')] }] },
  'kings-gambit::0::g4@11': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Ne5 — the knight leaps to a dominant central post, eyeing f7 and d7; White's pieces and centre roar for the gambit pawn.", sayShort: "Ne5 — dominant post.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }, { atMove: 16, say: "exd5 — you open the centre, the passed d-pawn and your active pieces pressing; White's initiative is decisive compensation.", sayShort: "exd5 — open, press.", highlights: [H('d5')] }] },
  'kings-gambit::0::g4@13': { ...KG_HANSTEIN, beats: [{ atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's broad centre and pieces hold the initiative.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 18, say: "Nge2 — the knight reroutes back into play, eyeing the centre; White consolidates the big centre and the attacking chances.", sayShort: "Nge2 — reroute, consolidate.", highlights: [H('e2')] }] },
  'kings-gambit::0::c6@13': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "hxg5 — you open the h-file, the rook crashing through; White's attack on the kingside is full value for the pawn.", sayShort: "hxg5 — open the h-file.", highlights: [H('g5')] }, { atMove: 20, say: "e5 — the centre surges, opening lines for your pieces against Black's exposed king; White's initiative rolls forward.", sayShort: "e5 — surge, open lines.", highlights: [H('e5')] }] },
  'kings-gambit::0::f6@9': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Nc3 — you develop, building the broad centre and aiming at d5; White's space and the c4-bishop compensate the pawn.", sayShort: "Nc3 — build the centre.", highlights: [H('c3')] }, { atMove: 18, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's centre and pieces dominate the open position.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::0::c6@11': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Ne5 — the knight leaps to the dominant central post, eyeing f7; White's pieces and centre roar for the pawn.", sayShort: "Ne5 — dominant post.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }, { atMove: 16, say: "exd5 — you open the centre, the passed d-pawn pressing; White's active pieces give the initiative.", sayShort: "exd5 — open, press.", highlights: [H('d5')] }] },
  'kings-gambit::0::Be6@13': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Bxe6 — you trade and shatter Black's pawns with fxe6; White's lead in development and the open lines press the king.", sayShort: "Bxe6 — shatter the pawns.", highlights: [H('e6')] }, { atMove: 18, say: "Qb5+ — the check exposes Black's king, dragging it into the open; White's attack is full value for the pawn.", sayShort: "Qb5+ — expose the king.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'kings-gambit::0::f6@11': { ...KG_HANSTEIN, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's broad centre dominates.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 18, say: "d5 — the centre surges, kicking the c6-knight and gaining space; White's pawns and pieces press the initiative.", sayShort: "d5 — surge, kick the knight.", arrows: [A('d5', 'c6')], highlights: [H('d5'), H('c6', ATK)] }] },
  'kings-gambit::1::Bg4@7': { ...KG_FISCHER, beats: [{ atMove: 14, say: "exd5 — you grab space in the centre, the passed d-pawn cramping Black; White's big centre is the King's Gambit's reward.", sayShort: "exd5 — grab central space.", highlights: [H('d5')] }, { atMove: 16, say: "c4 — you buttress the d5-pawn and gain queenside space; White's broad centre and active pieces hold a comfortable pull.", sayShort: "c4 — buttress d5.", highlights: [H('c4')] }] },
  'kings-gambit::1::Nf6@7': { ...KG_FISCHER, beats: [{ atMove: 8, say: "Nc3 — you develop, building the broad centre against the Fischer Defense; White's space and the eventual Bxf4 are the compensation.", sayShort: "Nc3 — build the centre.", highlights: [H('c3')] }, { atMove: 16, say: "Bb5+ — the check disrupts Black's coordination, gaining tempo for development; White's centre and active pieces press.", sayShort: "Bb5+ — disrupt, develop.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }] },
  'kings-gambit::1::Be7@7': { ...KG_FISCHER, beats: [{ atMove: 14, say: "exd5 — you grab central space, the passed d-pawn cramping Black; White's big centre dominates.", sayShort: "exd5 — grab central space.", highlights: [H('d5')] }, { atMove: 20, say: "dxc6 — the pawn crashes through, opening lines and damaging Black's structure; White's pieces press the initiative.", sayShort: "dxc6 — crash through.", highlights: [H('c6')] }] },
  'kings-gambit::1::Nc6@7': { ...KG_FISCHER, beats: [{ atMove: 14, say: "exd5 — you grab central space, the passed d-pawn cramping Black; White's big centre dominates.", sayShort: "exd5 — grab central space.", highlights: [H('d5')] }, { atMove: 16, say: "Bc4 — the bishop eyes f7 and hits the centralised queen, gaining tempo; White's development lead presses Black's exposed pieces.", sayShort: "Bc4 — eye f7, gain tempo.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'kings-gambit::1::h6@7': { ...KG_FISCHER, beats: [{ atMove: 14, say: "exd5 — you grab central space, the passed d-pawn cramping Black; White's big centre dominates.", sayShort: "exd5 — grab central space.", highlights: [H('d5')] }, { atMove: 18, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's broad centre and pieces dominate.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::1::f6@9': { ...KG_FISCHER, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing; White's centre and the coming O-O-O give attacking chances.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 20, say: "O-O-O — you castle long, the rooks aiming at Black's centre; White's pieces converge for the King's Gambit attack.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }] },
  'kings-gambit::1::Be7@9': { ...KG_FISCHER, beats: [{ atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop developing; White's centre and pieces give attacking chances.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 20, say: "O-O-O — you castle long, the rooks aiming at Black's centre; White's pieces converge for the attack.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }] },
  'kings-gambit::1::Bg4@9': { ...KG_FISCHER, beats: [{ atMove: 14, say: "Nc3 — you develop, controlling the centre; White's broad pawns and active pieces compensate the gambit pawn.", sayShort: "Nc3 — control the centre.", highlights: [H('c3')] }, { atMove: 18, say: "Bb2 — the bishop rakes the long diagonal toward g7 and e5; White's pieces converge while Black's kingside loosens.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'kings-gambit::1::Qf6@11': { ...KG_FISCHER, beats: [{ atMove: 14, say: "gxf3 — you open the g-file and reclaim the centre; White's pieces emerge with the bishop pair and the initiative for the pawn.", sayShort: "gxf3 — open, reclaim.", highlights: [H('f3')] }, { atMove: 16, say: "Bb5 — the bishop pins and pressures c6, developing with tempo; White's active pieces hold the King's Gambit initiative.", sayShort: "Bb5 — pin, develop.", highlights: [H('b5')] }] },
  'kings-gambit::1::Bh6@9': { ...KG_FISCHER, beats: [{ atMove: 14, say: "Ng5 — the knight pounces toward f7 and e6, exploiting Black's weakened kingside; White's attack rolls for the pawn.", sayShort: "Ng5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 20, say: "Nd5 — the knight seizes the central outpost, hitting c7 and Black's loose position; White's pieces converge on the attack.", sayShort: "Nd5 — central outpost.", highlights: [H('d5')] }] },
  'kings-gambit::2::Bh6@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Bh6 defends f4, but you're down a piece for a raging attack — keep it flowing. d4 builds the centre and rips open lines toward Black's stranded king.", sayShort: "…Bh6 — build with d4.", highlights: [H('d4', KEY), H('f7', SOFT)] },
    { atMove: 16, say: "e5 clamps the centre and shuts Black's queen out of the defence; with Nc3 and the rooks swinging in, the assault on f7 and the bare king rolls on.", sayShort: "e5 — clamp, storm the king.", highlights: [H('e5', KEY), H('f7', ATK)] },
  ] },
  'kings-gambit::2::Bc5+@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Bc5+ checks, but Kh1 simply sidesteps and your attack flows on undisturbed — a piece down for a ferocious initiative.", sayShort: "…Bc5+ — Kh1, attack flows.", highlights: [H('f7', KEY)] },
    { atMove: 14, say: "e5 hits the f6-queen and grabs the centre; Nc3 and Nb5 then pile into c7 and d6 while the bishop and queen rake f7. Black is overrun.", sayShort: "e5 — hit the queen, pile in.", highlights: [H('e5', KEY), H('f7', ATK)] },
  ] },
  'kings-gambit::2::Bd6@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Bd6 props f4, but you've sacrificed for the initiative — drive it home. d4 seizes the centre and opens the position for your raking pieces.", sayShort: "…Bd6 — build with d4.", highlights: [H('d4', KEY), H('f7', SOFT)] },
    { atMove: 14, say: "e5 clamps and kicks the d6-bishop; Nc3 and Bxf4 reclaim the pawn while every piece points at f7 and Black's uncastled king. The Muzio storm crashes on.", sayShort: "e5 — clamp, storm f7.", highlights: [H('e5', KEY), H('f7', ATK)] },
  ] },
  'kings-gambit::2::d6@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…d6 tries to free the c8-bishop, but it's too slow against the Muzio fire. Qxf4 regains a pawn and keeps the queen trained on f7.", sayShort: "…d6 — Qxf4, keep the heat.", highlights: [H('f4', KEY), H('f7', SOFT)] },
    { atMove: 14, say: "Bxf7+! the bishop crashes through with check; the king is hauled into the open, and Nc3, e5 and the rooks finish the hunt. The Muzio delivers.", sayShort: "Bxf7+ — crash through!", arrows: [A('f7', 'e8')], highlights: [H('f7', ATK)] },
  ] },
  'kings-gambit::2::d5@11': { ...KG_MUZIO, beats: [{ atMove: 12, say: "Qxf4 — you've sacrificed a whole knight for the Muzio's storm: the queen recovers the f-pawn, eyeing f7 and the open f-file against Black's king.", sayShort: "Qxf4 — the Muzio storm.", highlights: [H('f4'), H('f7', ATK)] }, { atMove: 16, say: "Re1+ — the rook joins with check, ripping open the centre; the Muzio's pieces converge on Black's stranded king — a historic attacking showcase.", sayShort: "Re1+ — converge with check.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }] },
  'kings-gambit::2::Qe7@11': { ...KG_MUZIO, beats: [{ atMove: 12, say: "Qxf4 — you've sacrificed a knight for the Muzio's attack: the queen recovers the f-pawn, eyeing f7 and the open lines against Black's king.", sayShort: "Qxf4 — the Muzio storm.", highlights: [H('f4'), H('f7', ATK)] }, { atMove: 18, say: "Qxh8 — the queen crashes into the corner, grabbing the rook; the Muzio's compensation has reaped material and a continuing attack.", sayShort: "Qxh8 — grab the rook.", highlights: [H('h8')] }] },
  'kings-gambit::2::Qg5@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Qg5 offers to trade queens and defend f4 — but you keep the initiative. d3 and Bxf4 round up the pawn and pry the position open.", sayShort: "…Qg5 — d3 and Bxf4.", highlights: [H('f4', KEY)] },
    { atMove: 16, say: "Qxf4 trades into a position where your lead in development and Black's airy king give full value for the piece; Nc3 and Nd5 keep the pressure on. Press the open lines.", sayShort: "Qxf4 — press the open lines.", highlights: [H('f4', KEY), H('f7', SOFT)] },
  ] },
  'kings-gambit::2::Nf6@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Nf6 develops and blocks the queen's gaze at f7, but it costs time you can exploit. d4 builds the centre and opens lines for the attack.", sayShort: "…Nf6 — build with d4.", highlights: [H('d4', KEY), H('f7', SOFT)] },
    { atMove: 16, say: "Qxf4 recovers the pawn and reloads on the f-file; with Nc3 and the rooks joining, you keep a roaring initiative for the piece against Black's exposed king.", sayShort: "Qxf4 — reload the f-file.", highlights: [H('f4', KEY), H('f7', ATK)] },
  ] },
  'kings-gambit::2::Nc6@11': { ...KG_MUZIO, beats: [
    { atMove: 11, say: "…Nc6 develops, but does nothing for the kingside. Qxf4 grabs the pawn back and keeps the queen blazing toward f7.", sayShort: "…Nc6 — answer Qxf4.", highlights: [H('f4', KEY), H('f7', SOFT)] },
    { atMove: 14, say: "Nc3 and Nxd5 throw more wood on the fire, the knight leaping into the centre while queen and bishop rake f7. Black's king has nowhere to hide.", sayShort: "Nc3 — pile on, hunt the king.", highlights: [H('f7', ATK)] },
  ] },
  'kings-gambit::2::Qf5@13': { ...KG_MUZIO, beats: [{ atMove: 14, say: "d4 — you build the broad centre behind the Muzio sacrifice, opening lines for your pieces; White's attack on the king rolls on.", sayShort: "d4 — build, open lines.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 16, say: "Bxd5 — the bishop dominates the centre, hitting f7 and Black's king; the Muzio's pieces converge for the historic attack.", sayShort: "Bxd5 — dominate, hit f7.", arrows: [A('d5', 'f7')], highlights: [H('d5'), H('f7', ATK)] }] },
  'kings-gambit::3::Bc5@9': { ...KG_FALKBEER, beats: [{ atMove: 14, say: "Nc3 — you develop, consolidating the extra pawn from the Falkbeer; White's solid structure and material edge tell.", sayShort: "Nc3 — consolidate the pawn.", highlights: [H('c3')] }, { atMove: 16, say: "e5 — the pawn gains space, kicking Black's pieces; with the extra material and a cramping centre, White presses the advantage.", sayShort: "e5 — gain space, cramp.", highlights: [H('e5')] }] },
  'kings-gambit::3::O-O@15': { ...KG_FALKBEER, beats: [{ atMove: 16, say: "Nxe4 — you snap the centralised knight, simplifying while a pawn up; White's material edge and active pieces hold the advantage.", sayShort: "Nxe4 — snap, simplify up.", highlights: [H('e4')] }, { atMove: 20, say: "Ne5 — the knight leaps to a dominant central post, eyeing f7 and d7; White's pieces dominate with the extra pawn.", sayShort: "Ne5 — dominant post.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }] },
  'kings-gambit::3::Nxc3@17': { ...KG_FALKBEER, beats: [{ atMove: 18, say: "Bxc5 — you snap off the bishop, simplifying into an endgame a pawn to the good; White's material edge is the lasting advantage.", sayShort: "Bxc5 — simplify a pawn up.", highlights: [H('c5')] }, { atMove: 22, say: "Kxe2 — the dust settles with White a clean pawn up; precise endgame technique converts the Falkbeer material.", sayShort: "Kxe2 — a clean pawn up.", highlights: [H('e2')] }] },
  'kings-gambit::3::Bb4@15': { ...KG_FALKBEER, beats: [{ atMove: 16, say: "Qb5+ — the check disrupts Black's coordination, forcing concessions; White keeps the extra material with active pieces.", sayShort: "Qb5+ — disrupt, stay up.", arrows: [A('b5', 'e8')], highlights: [H('b5')] }, { atMove: 18, say: "dxc6 — the passed pawn crashes through, opening lines; White's material edge and the advanced pawn decide.", sayShort: "dxc6 — crash through.", highlights: [H('c6')] }] },
  'kings-gambit::3::exf4@5': { ...KG_FALKBEER, beats: [
    { atMove: 5, say: "exf4 — Black snatches your f-pawn back, levelling material in this Falkbeer-Modern order. No matter: you're the better-developed side and the d5-pawn cramps him. Race your pieces out and round up f4 later.", sayShort: "exf4 — level; you lead development.", highlights: [H('d5', KEY), H('f4', SOFT)] },
    { atMove: 8, say: "Bc4 props the d5-pawn that …Nf6 is eyeing and lines up on the kingside. You're a clean step ahead in development; just keep finishing it.", sayShort: "Bc4 — hold d5, develop.", arrows: [A('c4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 10, say: "O-O — king safe and the rook drops onto the half-open f-file, glaring at f7. Black regains d5 and material stays level, but your faster development and that open file give you the easier, more pleasant game.", sayShort: "O-O — rook to the f-file.", highlights: [H('f7', KEY)] },
  ] },
  'kings-gambit::3::Bf2+@15': { ...KG_FALKBEER, beats: [{ atMove: 16, say: "Kd1 — you sidestep the check, the king safe enough; with the extra pawn and Black's attack fizzling, White stands better.", sayShort: "Kd1 — sidestep, stay up.", highlights: [H('d1')] }, { atMove: 18, say: "Nxe4 — you snap the centralised knight, simplifying while ahead; White's material edge holds the advantage.", sayShort: "Nxe4 — snap, simplify up.", highlights: [H('e4')] }] },
  'kings-gambit::3::c6@5': { ...KG_FALKBEER, beats: [
    { atMove: 5, say: "…c6 offers a pawn to blast the centre open after …cxd5 — don't oblige. Nc3 develops and holds everything together, keeping the game on your terms with the d5-pawn cramping Black's centre.", sayShort: "…c6 — answer Nc3, decline.", arrows: [A('b1', 'c3')], highlights: [H('c3', KEY)] },
    { atMove: 8, say: "Nf3 develops and eyes the loose f4-pawn. Material is level after …exf4, but your pieces flow out fast and the advanced d5-pawn keeps Black cramped — Bc4, O-O and Bxf4 follow for a sound, pleasant edge.", sayShort: "Nf3 — develop, level and easy.", highlights: [H('d5', KEY)] },
  ] },
  'kings-gambit::3::Bb4@17': { ...KG_FALKBEER, beats: [{ atMove: 18, say: "Bd4 — the bishop centralises, dominating the long diagonal and inviting trades; White's extra pawn carries the simplified position.", sayShort: "Bd4 — centralise, trade.", arrows: [A('d4', 'g7')], highlights: [H('d4')] }, { atMove: 22, say: "Qxe7+ — you trade queens into an endgame a pawn up; White's material edge is the deciding factor.", sayShort: "Qxe7+ — trade, stay up.", highlights: [H('e7')] }] },
  'kings-gambit::3::O-O@19': { ...KG_FALKBEER, beats: [{ atMove: 20, say: "Nd4 — the knight centralises on a dominant post, eyeing f5 and the kingside; White's extra pawn and active pieces press.", sayShort: "Nd4 — dominant post.", highlights: [H('d4')] }, { atMove: 22, say: "Bd3 — the bishop develops, offering to trade off Black's active g6-bishop; White consolidates the material edge.", sayShort: "Bd3 — develop, consolidate.", highlights: [H('d3')] }] },
  'kings-gambit::3::Nd7@17': { ...KG_FALKBEER, beats: [{ atMove: 18, say: "Bxc5 — you trade off, simplifying while a pawn up; White's material edge is the lasting advantage.", sayShort: "Bxc5 — simplify a pawn up.", highlights: [H('c5')] }, { atMove: 20, say: "O-O-O — you castle long into safety, connecting rooks; with the extra pawn, White converts from a position of strength.", sayShort: "O-O-O — castle, convert.", highlights: [H('c1')] }] },
  'kings-gambit::4::exf4@5': { ...KG_DECLINED, beats: [{ atMove: 14, say: "d4 — you build the broad centre, the classical King's Gambit structure; White's space and the open f-file give the initiative.", sayShort: "d4 — build the centre.", highlights: [H('d4')] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's centre and active pieces press.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::4::Nc6@5': { ...KG_DECLINED, beats: [{ atMove: 6, say: "fxe5 — you grab the centre pawn, the King's Gambit Declined's bonus; White's extra central pawn and the open f-file give an edge.", sayShort: "fxe5 — grab the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — the centre rolls, your space advantage growing; White's broad pawns and the f-file press Black's position.", sayShort: "d4 — roll, gain space.", highlights: [H('d4')] }] },
  'kings-gambit::4::Nf6@5': { ...KG_DECLINED, beats: [{ atMove: 16, say: "fxe5 — you grab the centre pawn, gaining space; White's extra central pawn and the open f-file give a comfortable pull.", sayShort: "fxe5 — grab, gain space.", highlights: [H('e5')] }, { atMove: 22, say: "Nd4 — the knight centralises on a strong post, eyeing f5 and the kingside; White's space and pieces hold the edge.", sayShort: "Nd4 — strong central post.", highlights: [H('d4')] }] },
  'kings-gambit::4::d5@5': { ...KG_DECLINED, beats: [{ atMove: 6, say: "Nxe5 — you snap the centre pawn, the knight dominating; White's extra material and active pieces press Black's position.", sayShort: "Nxe5 — snap the pawn.", highlights: [H('e5')] }, { atMove: 22, say: "Nxf7 — the knight crashes into f7, forking and exposing Black's king; White's attack reaps the gambit-declined reward.", sayShort: "Nxf7 — crash into f7.", highlights: [H('f7')] }] },
  'kings-gambit::4::Nc6@9': { ...KG_DECLINED, beats: [{ atMove: 12, say: "Qe2 — the queen connects toward the kingside, supporting the centre; White's harmonious setup and the f-file give the initiative.", sayShort: "Qe2 — connect, support.", highlights: [H('e2')] }, { atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing; White's pieces and centre dominate the open position.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::4::Bg4@9': { ...KG_DECLINED, beats: [{ atMove: 10, say: "fxe5 — you grab the centre pawn, opening lines; White's extra material and the bishop pair compensate fully.", sayShort: "fxe5 — grab, open lines.", highlights: [H('e5')] }, { atMove: 14, say: "Nd5 — the knight seizes the central outpost, hitting f6 and c7; White's active pieces press Black's position.", sayShort: "Nd5 — central outpost.", highlights: [H('d5')] }] },
  'kings-gambit::4::Ng4@9': { ...KG_DECLINED, beats: [{ atMove: 12, say: "f5 — you clamp the kingside, gaining space and the f4-square for your pieces; White's pawn wedge cramps Black.", sayShort: "f5 — clamp the kingside.", highlights: [H('f5')] }, { atMove: 16, say: "Qd3 — the queen redeploys, eyeing the kingside and supporting the centre; White's space advantage and the f5-wedge press.", sayShort: "Qd3 — redeploy, press.", highlights: [H('d3')] }] },
  'kings-gambit::4::Bg4@11': { ...KG_DECLINED, beats: [{ atMove: 12, say: "Na4 — the knight jumps to challenge the c5-bishop; trading it leaves Black with doubled pawns and White the better structure.", sayShort: "Na4 — challenge the bishop.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's structure and the f-file give the edge.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::4::a6@13': { ...KG_DECLINED, beats: [{ atMove: 14, say: "Bg5 — the bishop pins f6, pressuring Black's kingside; with the f5-wedge cramping, White's pieces converge for the attack.", sayShort: "Bg5 — pin, pressure.", highlights: [H('g5'), H('f6', ATK)] }, { atMove: 18, say: "a4 — you lever the queenside, opening lines while Black's king is cramped; White presses on both wings.", sayShort: "a4 — lever the queenside.", highlights: [H('a4')] }] },
  'kings-gambit::4::Nd4@13': { ...KG_DECLINED, beats: [{ atMove: 14, say: "Bb3 — you tuck the bishop safely, keeping it aimed at f7; with the f5-wedge cramping Black, White's pieces press the kingside.", sayShort: "Bb3 — tuck, aim at f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', SOFT)] }, { atMove: 20, say: "Bg5 — the bishop develops with a pin, adding pressure on Black's kingside; White's space and pieces hold the initiative.", sayShort: "Bg5 — pin, add pressure.", highlights: [H('g5')] }] },
  'kings-gambit::5::d6@5': KG_ACC_D6,
  'kings-gambit::5::Qe7@15': { ...KG_KIESERITZKY, beats: [{ atMove: 16, say: "Be2 — you develop, completing the Kieseritzky setup with the f-pawn recovered; White's broad centre and pieces hold the initiative.", sayShort: "Be2 — develop, complete.", highlights: [H('e2')] }, { atMove: 22, say: "Nxe4 — you snap the centralised knight, simplifying favourably; White's centre and active pieces give the edge.", sayShort: "Nxe4 — snap, simplify.", highlights: [H('e4')] }] },
  'kings-gambit::5::d5@5': KG_ACC_D5,
  'kings-gambit::5::Nxe4@11': { ...KG_KIESERITZKY, beats: [{ atMove: 14, say: "gxf3 — you open the g-file and reclaim the centre; White's pieces emerge with the initiative for the gambit pawn.", sayShort: "gxf3 — open, reclaim.", highlights: [H('f3')] }, { atMove: 18, say: "Nxg4 — the knight grabs the advanced pawn, eyeing f6 and h6; White's active pieces press Black's kingside.", sayShort: "Nxg4 — grab, press.", highlights: [H('g4')] }] },
  'kings-gambit::5::Nf6@5': KG_ACC_NF6,
  'kings-gambit::5::Ne7@5': KG_ACC_NE7,
  'kings-gambit::5::Be7@5': KG_ACC_BE7,
  'kings-gambit::5::Nc6@15': { ...KG_KIESERITZKY, beats: [{ atMove: 16, say: "Nc3 — you develop, completing the centre with the f-pawn recovered; White's pieces and pawns dominate.", sayShort: "Nc3 — complete the centre.", highlights: [H('c3')] }, { atMove: 18, say: "Nb5 — the knight jumps toward c7 and d6, exploiting Black's loose position; White's pieces converge on the attack.", sayShort: "Nb5 — jump toward c7.", highlights: [H('b5')] }] },
  'kings-gambit::5::d5@11': { ...KG_KIESERITZKY, beats: [{ atMove: 12, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's centre and pieces hold the Kieseritzky initiative.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 18, say: "O-O-O — you castle long, the rooks aiming at the centre; White's pieces converge for the attack with the recovered pawn.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }] },
  'kings-gambit::5::d6@9': { ...KG_KIESERITZKY, beats: [
    { atMove: 9, say: "…d6 hits your dominant e5-knight and tries to blunt the attack — but it walks into a crushing little sequence. Nxg4! the knight skips back with tempo, snapping off the g4-pawn and keeping the initiative.", sayShort: "…d6 — answer Nxg4.", arrows: [A('e5', 'g4')], highlights: [H('g4', KEY)] },
    { atMove: 10, say: "Nxg4 — a pawn regained and the knight still eyeing f6 and h6. Black challenges it with …Nf6; you welcome the trade that opens his king.", sayShort: "Nxg4 — pawn back, keep pressing.", highlights: [H('g4', SOFT)] },
    { atMove: 12, say: "Nxf6+ — rip off Black's best defender with check; after …Qxf6 the kingside is shattered, the f-file wide open, and Bxf4, d4 and Nc3 pour in. The Kieseritzky attack rolls on with the king exposed.", sayShort: "Nxf6+ — wreck the kingside.", arrows: [A('f6', 'e8')], highlights: [H('f6', KEY)] },
  ] },
  'kings-gambit::6::d6@13': { ...KG_ALLGAIER, beats: [{ atMove: 14, say: "Bc4+ — the bishop crashes in with check, the Allgaier knight-sac paying off: Black's king is dragged out and White's pieces swarm.", sayShort: "Bc4+ — drag the king out.", arrows: [A('c4', 'f7')], highlights: [H('c4')] }, { atMove: 16, say: "Bxf4 — you recover a pawn while developing, the bishop joining the attack; White's lead in development hunts the exposed king.", sayShort: "Bxf4 — develop, hunt the king.", highlights: [H('f4')] }] },
  'kings-gambit::6::h5@13': { ...KG_ALLGAIER, beats: [{ atMove: 14, say: "Bc4+ — the bishop crashes in with check, the Allgaier knight-sac paying off: Black's king is dragged out and White's pieces swarm.", sayShort: "Bc4+ — drag the king out.", arrows: [A('c4', 'f7')], highlights: [H('c4')] }, { atMove: 20, say: "Bg5 — the bishop pins and pressures, harrying Black's pieces; White's attack on the exposed king rolls on for the sacrificed knight.", sayShort: "Bg5 — pin, harry.", highlights: [H('g5')] }] },
  'kings-gambit::6::d6@5': KG_ACC_D6,
  'kings-gambit::6::d5@5': KG_ACC_D5,
  'kings-gambit::6::Qf6@13': { ...KG_ALLGAIER, beats: [{ atMove: 14, say: "e5 — the centre surges with tempo, opening lines toward Black's king; the Allgaier's attack roars on for the sacrificed knight.", sayShort: "e5 — surge, open lines.", highlights: [H('e5')] }, { atMove: 16, say: "Qxg4 — the queen joins the assault, grabbing the pawn and eyeing the king; White's pieces converge for the attack.", sayShort: "Qxg4 — join the assault.", highlights: [H('g4')] }] },
  'kings-gambit::6::Nf6@13': { ...KG_ALLGAIER, beats: [{ atMove: 14, say: "e5 — the centre surges, kicking the f6-knight and opening lines; the Allgaier's attack presses the exposed king.", sayShort: "e5 — surge, kick f6.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }, { atMove: 16, say: "exf6 — the pawn crashes through, ripping open Black's kingside; White's pieces hunt the king for the sacrificed knight.", sayShort: "exf6 — rip it open.", highlights: [H('f6')] }] },
  'kings-gambit::6::Nf6@5': KG_ACC_NF6,
  'kings-gambit::6::Ne7@5': KG_ACC_NE7,
  'kings-gambit::6::f3@13': { ...KG_ALLGAIER, beats: [{ atMove: 14, say: "Nc3 — you develop with tempo, building the attack after the Allgaier knight-sac; White's pieces swarm the exposed king.", sayShort: "Nc3 — develop, swarm.", highlights: [H('c3')] }, { atMove: 16, say: "Bc4+ — the bishop crashes in with check, dragging the king deeper; White's lead in development is the compensation for the knight.", sayShort: "Bc4+ — drag the king.", arrows: [A('c4', 'f7')], highlights: [H('c4')] }] },
  'kings-gambit::6::Be7@5': KG_ACC_BE7,
  'kings-gambit::7::Bb4@13': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "Nf3 — you develop, the Bishop's Gambit's lead in development the compensation for the f-pawn; White's pieces flow toward the centre.", sayShort: "Nf3 — develop, flow out.", highlights: [H('f3')] }, { atMove: 16, say: "Ne5 — the knight leaps to a dominant central post, eyeing f7 and d7; White's active pieces press Black's position.", sayShort: "Ne5 — dominant post.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', ATK)] }] },
  'kings-gambit::7::Nxd5@11': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "Nxf3 — you recover the gambit pawn while developing, the knight active; White's lead in development holds the initiative.", sayShort: "Nxf3 — recover, develop.", highlights: [H('f3')] }, { atMove: 18, say: "O-O — you castle, completing development; the Bishop's Gambit's active pieces and the open f-file give White comfortable play.", sayShort: "O-O — castle, complete.", highlights: [H('g1')] }] },
  'kings-gambit::7::Nc6@13': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's broad centre and active pieces dominate.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 16, say: "Ne2 — the knight reroutes toward the centre, reinforcing your position; White's development lead presses Black.", sayShort: "Ne2 — reroute, reinforce.", highlights: [H('e2')] }] },
  'kings-gambit::7::Bg4@13': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "Nge2 — you develop, sidestepping the pin and reinforcing the centre; White's pieces flow out behind the broad d4-pawn.", sayShort: "Nge2 — develop, reinforce.", highlights: [H('e2')] }, { atMove: 16, say: "Qd3 — the queen centralises, eyeing the kingside and supporting the centre; White's active pieces hold the initiative.", sayShort: "Qd3 — centralise, press.", highlights: [H('d3')] }] },
  'kings-gambit::7::Bb4@9': { ...KG_BISHOPS, beats: [{ atMove: 10, say: "e5 — the pawn surges, gaining space and kicking the f6-knight; White's centre and the Bishop's Gambit development compensate the pawn.", sayShort: "e5 — surge, kick f6.", arrows: [A('e5', 'f6')], highlights: [H('e5'), H('f6', ATK)] }, { atMove: 16, say: "Nxe5 — the knight grabs the centre with tempo, eyeing f7; White's active pieces press Black's position.", sayShort: "Nxe5 — grab centre, eye f7.", arrows: [A('e5', 'f7')], highlights: [H('e5'), H('f7', SOFT)] }] },
  'kings-gambit::7::g5@13': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "h4 — you strike at Black's g5-pawn, prising open the kingside; White's pieces converge on Black's loosened position.", sayShort: "h4 — strike g5.", arrows: [A('h4', 'g5')], highlights: [H('h4'), H('g5', ATK)] }, { atMove: 18, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's broad centre and pieces hold the initiative.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'kings-gambit::7::Be6@13': { ...KG_BISHOPS, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's broad centre and active pieces dominate.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 20, say: "O-O — you castle, completing a harmonious setup; White's broad centre and the open f-file give comfortable play.", sayShort: "O-O — castle, complete.", highlights: [H('g1')] }] },
  'kings-gambit::7::d5@5': { ...KG_BISHOPS, beats: [
    { atMove: 5, say: "…d5 strikes the centre in the Bishop's Gambit, offering the pawn back to break open the position — so take it. Bxd5! the bishop snaps the pawn and keeps blazing down the a2-g8 diagonal at f7.", sayShort: "…d5 — answer Bxd5.", arrows: [A('c4', 'd5')], highlights: [H('d5', KEY)] },
    { atMove: 6, say: "Bxd5 — the bishop grabs the centre pawn and trains on f7. Black hits it with …Nf6; you simply develop Nc3 and keep building.", sayShort: "Bxd5 — grab it, eye f7.", arrows: [A('d5', 'f7')], highlights: [H('f7', SOFT)] },
    { atMove: 8, say: "Nc3 develops and guards e4 as Black pins with …Bb4. Material is level, but you hold the bishop pair, open lines and the f4-pawn still to round up — castle and let your faster development decide.", sayShort: "Nc3 — develop, level and active.", arrows: [A('c3', 'e4')], highlights: [H('e4', KEY)] },
  ] },
  'kings-gambit::7::f3@15': { ...KG_BISHOPS, beats: [{ atMove: 16, say: "gxf3 — you reclaim the f-pawn and open the g-file; White's pieces emerge with the centre and the initiative.", sayShort: "gxf3 — reclaim, open.", highlights: [H('f3')] }, { atMove: 18, say: "Qd3 — the queen centralises, eyeing the kingside; White's broad centre and active pieces press Black.", sayShort: "Qd3 — centralise, press.", highlights: [H('d3')] }] },
  'kings-gambit::7::Bc5@9': { ...KG_BISHOPS, beats: [{ atMove: 10, say: "d4 — you build the broad centre, hitting the c5-bishop and gaining space; the Bishop's Gambit's development compensates the pawn.", sayShort: "d4 — build, hit c5.", arrows: [A('d4', 'c5')], highlights: [H('d4'), H('c5', ATK)] }, { atMove: 16, say: "d5 — the centre surges, gaining space and cramping Black; White's pawns and active pieces press the initiative.", sayShort: "d5 — surge, cramp.", highlights: [H('d5')] }] },

  // -- Vienna Game --
  'vienna-game::0::Bc5@9': { ...VN_F4D5, beats: [
    { atMove: 9, say: "Bc5 develops actively in the open f4-d5 Vienna. Develop and contest: d4 or Be2 and O-O, the half-open f-file your rook's highway. After the dust the game is balanced with a small pull for you — castle, claim the f-file, and squeeze.", sayShort: "Bc5 — develop, claim the f-file.", highlights: [H('f7', KEY)] },
    { atMove: 14, say: "d4 stakes out the centre and shuts the dark-squared bishop out of the game; Bd2 and Bd3 follow, and the half-open f-file remains your rook's highway.", sayShort: "d4 — seize the centre.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 18, say: "Bd3 trains on h7 and Black's king while you castle and double on the f-file. The bishop pair and the open lines give you the more pleasant game — press it.", sayShort: "Bd3 — aim h7, press the f-file.", highlights: [H('f7', SOFT)] },
  ] },
  'vienna-game::0::Nc6@9': { ...VN_F4D5, beats: [
    { atMove: 9, say: "Nc6 develops, eyeing e5. Recover and develop: d4 or Qe2, hold the e5-pawn or trade, and the half-open f-file points at f7. The open game is roughly level with a small pull — castle and press the f-file.", sayShort: "Nc6 — develop, press the f-file.", highlights: [H('f7', KEY)] },
    { atMove: 10, say: "Bb5 pins the c6-knight; Bxc6+ doubles Black's pawns and you castle into a structural edge with the half-open f-file at his king.", sayShort: "Bb5 — pin, double his pawns.", arrows: [A('b5', 'c6')], highlights: [H('c6', KEY)] },
    { atMove: 18, say: "d4 grabs the centre after the trades; with Black's doubled c-pawns and your rook on the f-file, you press a small, lasting pull.", sayShort: "d4 — centre, press the f-file.", highlights: [H('d4', KEY), H('f7', SOFT)] },
  ] },
  'vienna-game::0::Be6@13': { ...VN_F4D5, beats: [
    { atMove: 13, say: "Be6 develops in the open Vienna; you've recaptured with dxc3, gaining the bishop pair and the half-open d- and f-files. Develop Bf4 or Be3, castle, and press both files at Black's position. The bishop pair gives the pull.", sayShort: "Be6 — bishop pair, press the files.", highlights: [H('f7', KEY)] },
    { atMove: 16, say: "Qg3 swings the queen to the kingside, eyeing g6 and e5 while Bd3 lines up on h7. The two bishops and the half-open files aim everything at Black's king.", sayShort: "Qg3 — swing at the kingside.", highlights: [H('e5', SOFT)] },
    { atMove: 18, say: "Bd3 completes the attacking battery toward h7; castle, double the rooks, and the bishop pair plus the open f-file give the lasting pull.", sayShort: "Bd3 — aim h7, double rooks.", arrows: [A('d3', 'h7')], highlights: [H('h7', ATK)] },
  ] },
  'vienna-game::0::Nc6@13': { ...VN_F4D5, beats: [
    { atMove: 13, say: "Nc6 develops. With dxc3 you hold the bishop pair and the half-open d- and f-files; develop Bf4, castle, and double on the open files. The structure and the two bishops give a small, lasting edge — press.", sayShort: "Nc6 — bishop pair, double the files.", highlights: [H('f7', KEY)] },
    { atMove: 14, say: "Be3 develops and eyes the queenside; O-O-O follows, throwing your rook onto the open d-file for an opposite-wing attack.", sayShort: "Be3 — develop, then O-O-O.", highlights: [H('e3', KEY)] },
    { atMove: 18, say: "Bf4 and the castled rooks bear down the d- and f-files; with the bishop pair and the open lines, you press a clear, lasting edge — roll the kingside pawns.", sayShort: "Bf4 — press both open files.", highlights: [H('f7', SOFT)] },
  ] },
  'vienna-game::0::Bg4@13': { ...VN_F4D5, beats: [
    { atMove: 13, say: "Bg4 pins your f3-knight — Be2 or h3 breaks it. You hold the bishop pair from dxc3 and the half-open files; develop, castle, and double the rooks on the d- and f-files. The pin is a trifle against your structural pull.", sayShort: "Bg4 — break the pin, press the files.", highlights: [H('f3', KEY)] },
    { atMove: 14, say: "Bf4 develops with gain of tempo and clears the way for O-O-O onto the open d-file. The pin on f3 is a trifle against your raking bishops.", sayShort: "Bf4 — develop, then O-O-O.", highlights: [H('f4', KEY)] },
    { atMove: 16, say: "O-O-O throws the rook onto the half-open d-file and tucks the king to safety; now the kingside pawns roll while the two bishops and open files do the talking.", sayShort: "O-O-O — rook to the d-file.", highlights: [H('f7', SOFT)] },
  ] },
  'vienna-game::0::Bg4@9': { ...VN_F4D5, beats: [
    { atMove: 9, say: "Bg4 pins your knight early — h3 puts the question, or Be2. Develop and recover: hold or trade the e5-pawn, castle, and the half-open f-file feeds your rook. The open game is level with a small pull — press the f-file.", sayShort: "Bg4 — h3, press the f-file.", highlights: [H('f3', KEY), H('f7', SOFT)] },
    { atMove: 10, say: "Qe2 develops, unpins and prepares to recapture on c3 with the d-pawn — handing you the bishop pair and the half-open d-file.", sayShort: "Qe2 — unpin, prep dxc3.", highlights: [H('f3', KEY)] },
    { atMove: 14, say: "Bf4 develops toward the queenside and clears for O-O-O; with the two bishops and the open files you steer into an opposite-wing attack. Press the kingside.", sayShort: "Bf4 — develop, then O-O-O.", highlights: [H('f4', KEY)] },
  ] },
  'vienna-game::0::c6@13': { ...VN_F4D5, beats: [
    { atMove: 13, say: "c6 props Black's centre. You hold the bishop pair from dxc3 and the half-open d- and f-files; develop Bf4 and the rooks, castle, and press both files. The two bishops and the structure give the pull — squeeze.", sayShort: "c6 — bishop pair, press the files.", highlights: [H('f7', KEY)] },
    { atMove: 16, say: "Qg3 swings the queen to the kingside while Bd3 lines up on h7. With the bishop pair from dxc3 and the half-open f-file, your pieces all point at Black's king.", sayShort: "Qg3 — swing at the king.", highlights: [H('e5', SOFT)] },
    { atMove: 18, say: "Bd3 completes the battery toward h7; castle, double the rooks on the open files, and the two bishops give the lasting pull. Squeeze.", sayShort: "Bd3 — aim h7, double rooks.", arrows: [A('d3', 'h7')], highlights: [H('h7', ATK)] },
  ] },
  'vienna-game::0::d6@5': { ...VN_F4D5, beats: [
    { atMove: 5, say: "…d6 declines the gambit quietly, propping up e5. Take the space and develop: Nf3 eyes e5 and prepares to open the f-file with fxe5 when it suits.", sayShort: "…d6 — develop Nf3, hold f4.", arrows: [A('g1', 'f3')], highlights: [H('f4', KEY)] },
    { atMove: 6, say: "Nf3 develops, leans on e5 and braces the f4-lever. The half-open f-file points at f7, and fxe5 opens lines whenever you choose.", sayShort: "Nf3 — eye e5, ready fxe5.", arrows: [A('f3', 'e5')], highlights: [H('e5', SOFT)] },
    { atMove: 7, say: "…Nbd7 props the centre, but you hold the space and the f4-break in hand. Bc4, castle, and fxe5 to crack open the f-file at the king when the moment comes — a comfortable, pressing game.", sayShort: "…Nbd7 — keep the f-file lever.", highlights: [H('f7', KEY)] },
  ] },
  'vienna-game::0::f5@11': { ...VN_F4D5, beats: [
    { atMove: 11, say: "f5 props Black's knight but loosens the king badly. Strike: d3 hits the e4-knight, or exf6 en passant rips open the f-file. The weakened light squares around Black's king are your targets — develop with threats and attack.", sayShort: "f5 — hit e4, rip the f-file open.", highlights: [H('e4', KEY)] },
    { atMove: 12, say: "g3 calmly prepares Bg2, blunting Black's e4-knight on the long diagonal while his …f5 has loosened the king and the e6-square for good.", sayShort: "g3 — fianchetto, exploit e6.", highlights: [H('e4', SOFT)] },
    { atMove: 16, say: "d3 challenges the e4-knight; after the trade your bishop swings to g2 and rakes the long diagonal and the weakened light squares around Black's king are permanent targets.", sayShort: "d3 — hit e4, target light squares.", highlights: [H('e4', KEY)] },
  ] },
  'vienna-game::1::g6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 12, say: "d3 — you calmly bolster the centre; the …g6 push fatally weakened f7 and the Frankenstein-Dracula mate threat is now unstoppable.", sayShort: "d3 — bolster, f7 falls.", highlights: [H('d3'), H('f7', ATK)] }, { atMove: 14, say: "Qxf7# — checkmate. Black's greed on e4 and the loosening …g6 let the queen crash through — the Vienna's sharpest trap.", sayShort: "Qxf7# — checkmate.", highlights: [H('f7')] }] },
  'vienna-game::1::d5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 12, say: "f3 — you shore up e4 while Black grabs space on the queenside, blind to the danger; the queen's aim at f7 is decisive.", sayShort: "f3 — shore up, f7 falls.", highlights: [H('f3'), H('f7', ATK)] }, { atMove: 14, say: "Qxf7# — checkmate. Black ignored the queen's aim at f7 — the Frankenstein-Dracula's punishment for grabbing on e4.", sayShort: "Qxf7# — checkmate.", highlights: [H('f7')] }] },
  'vienna-game::1::Ng5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "Bxg5 — you snap the knight; after the trades White emerges with the bishop pair and a safe edge — the Frankenstein-Dracula's greed punished.", sayShort: "Bxg5 — snap, stay ahead.", highlights: [H('g5')] }, { atMove: 18, say: "Qh5+ — the check harries Black's exposed king; White's active pieces and better structure press the advantage.", sayShort: "Qh5+ — harry the king.", highlights: [H('h5')] }] },
  'vienna-game::1::Qf6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "Nxe4 — you regain the piece, the knight central and Black's position loose; White's pieces dominate after the skirmish.", sayShort: "Nxe4 — regain, dominate.", highlights: [H('e4')] }, { atMove: 16, say: "Qxe5+ — the queen grabs the centre pawn with check; White collects material and keeps the initiative against the exposed king.", sayShort: "Qxe5+ — grab with check.", highlights: [H('e5')] }] },
  'vienna-game::1::Qe7@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "dxe4 — you recover the piece, the broad centre intact; White's extra space and the c4-bishop give a comfortable edge.", sayShort: "dxe4 — recover, comfortable.", highlights: [H('e4')] }, { atMove: 16, say: "Qd1 — the queen retreats to safety with the material gained; White consolidates a solid advantage from the Frankenstein-Dracula.", sayShort: "Qd1 — retreat, consolidate.", highlights: [H('d1')] }] },
  'vienna-game::1::Nc6@5': { ...VN_BC4_DEV, beats: [{ atMove: 6, say: "d3 — you settle into the Stanley, a reversed Spanish a tempo up; solid development and the c4-bishop's pressure give White a small, lasting pull.", sayShort: "d3 — solid Stanley setup.", highlights: [H('d3')] }, { atMove: 12, say: "Nf3 — you develop, eyeing the centre; with the half-open a-file and the bishop pair offsetting the doubled b-pawns, White stands comfortably.", sayShort: "Nf3 — develop, press.", highlights: [H('f3')] }] },
  'vienna-game::1::Qf6@11': { ...VN_FRANKENSTEIN, beats: [{ atMove: 12, say: "Nxc7+ — the knight forks king and rook, the Frankenstein-Dracula's point; White wins the exchange in the wild line.", sayShort: "Nxc7+ — fork king and rook.", arrows: [A('c7', 'a8')], highlights: [H('c7')] }, { atMove: 14, say: "Nxa8 — the knight grabs the rook in the corner; White is up the exchange, with the task of extracting the knight under Black's pressure.", sayShort: "Nxa8 — grab the rook.", highlights: [H('a8')] }] },
  'vienna-game::1::Bc5@5': { ...VN_BC4_DEV, beats: [{ atMove: 12, say: "a3 — you secure the queenside and prepare slow maneuvering; the Stanley's reversed-Italian setup gives White a comfortable, flexible game.", sayShort: "a3 — secure, maneuver.", highlights: [H('a3')] }, { atMove: 18, say: "Nh2 — the knight reroutes toward g4 and the kingside, the thematic maneuver; White builds patiently behind the solid centre.", sayShort: "Nh2 — reroute to the kingside.", highlights: [H('h2')] }] },
  'vienna-game::1::Be7@9': { ...VN_FRANKENSTEIN, beats: [{ atMove: 10, say: "Qxe5 — you snap the centre pawn, the queen dominant; White banks material from the Stanley line and presses Black's loose position.", sayShort: "Qxe5 — snap the pawn.", highlights: [H('e5')] }, { atMove: 16, say: "d4 — you build the broad centre, your extra pawn and active pieces pressing; White holds a comfortable edge.", sayShort: "d4 — build, press.", highlights: [H('d4')] }] },
  'vienna-game::1::Bg7@19': { ...VN_FRANKENSTEIN, beats: [{ atMove: 20, say: "Qc5 — you offer a queen trade to defuse Black's attack while up the exchange; White steers toward converting the material.", sayShort: "Qc5 — offer the trade.", highlights: [H('c5')] }, { atMove: 22, say: "Ne2 — you develop, shoring up the king; with the extra exchange, White consolidates the Frankenstein-Dracula booty.", sayShort: "Ne2 — develop, consolidate.", highlights: [H('e2')] }] },
  'vienna-game::2::Nc6@11': { ...VN_QUIET, beats: [{ atMove: 12, say: "Na4 — the knight jumps to challenge the c5-bishop; trading it leaves Black with doubled pawns and White the better structure.", sayShort: "Na4 — challenge the bishop.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 18, say: "Bxe6 — you trade and saddle Black with doubled e-pawns; White's superior structure presses the advantage.", sayShort: "Bxe6 — double his pawns.", highlights: [H('e6')] }] },
  'vienna-game::2::c6@11': { ...VN_QUIET, beats: [{ atMove: 14, say: "Ba2 — the bishop tucks to the safe a2-g8 diagonal, staying aimed at f7; White maneuvers patiently in the solid Hybrid structure.", sayShort: "Ba2 — tuck, aim at f7.", arrows: [A('a2', 'f7')], highlights: [H('a2'), H('f7', SOFT)] }, { atMove: 20, say: "Be3 — you develop, offering to trade the dark bishops and eyeing the queenside; White's harmonious setup holds a small pull.", sayShort: "Be3 — develop, press.", highlights: [H('e3')] }] },
  'vienna-game::2::Be6@11': { ...VN_QUIET, beats: [{ atMove: 12, say: "Bb3 — you tuck the bishop, keeping it aimed at f7 and avoiding the trade; White maneuvers in the solid Hybrid.", sayShort: "Bb3 — tuck, aim at f7.", arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7', SOFT)] }, { atMove: 16, say: "Bxe6 — you trade and saddle Black with doubled e-pawns; White's better structure gives the edge.", sayShort: "Bxe6 — double his pawns.", highlights: [H('e6')] }] },
  'vienna-game::2::a6@11': { ...VN_QUIET, beats: [{ atMove: 12, say: "Ne2 — the knight reroutes toward g3 and f5, the thematic Hybrid maneuver; White builds slowly behind the solid centre.", sayShort: "Ne2 — reroute toward f5.", highlights: [H('e2')] }, { atMove: 18, say: "Ng3 — the knight reaches g3, eyeing f5 and the kingside; White's harmonious Hybrid setup presses for the initiative.", sayShort: "Ng3 — eye f5, press.", highlights: [H('g3'), H('f5', SOFT)] }] },
  'vienna-game::2::Nc6@5': { ...VN_QUIET, beats: [{ atMove: 6, say: "d3 — you settle into the Stanley, a reversed Spanish a tempo up; solid development and the c4-bishop's pressure give White a small, lasting pull.", sayShort: "d3 — solid Stanley setup.", highlights: [H('d3')] }, { atMove: 12, say: "Nf3 — you develop, eyeing the centre; with the half-open a-file and the bishop pair offsetting the doubled b-pawns, White stands comfortably.", sayShort: "Nf3 — develop, press.", highlights: [H('f3')] }] },
  'vienna-game::2::Nxe4@5': { ...VN_FRANKENSTEIN, beats: [
    { atMove: 5, say: "…Nxe4 grabs the e4-pawn — the critical Frankenstein-Dracula moment. Don't bother recapturing; strike with Qh5! hitting the loose e5-pawn and the e4-knight in one blow.", sayShort: "…Nxe4 — answer Qh5!", arrows: [A('d1', 'h5')], highlights: [H('h5', KEY)] },
    { atMove: 6, say: "Qh5 — the double attack: …Qxe5+ regaining a pawn and Qxe4 regaining the knight both loom. Black scrambles to cover with …Nd6.", sayShort: "Qh5 — double attack, e5 and e4.", arrows: [A('h5', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 7, say: "…Nd6 drops back to block, forking your queen and the c4-bishop. Save the bishop with tempo — slide it to b3 and keep raking f7.", sayShort: "…Nd6 — save the bishop, Bb3.", arrows: [A('d6', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 8, say: "Bb3 tucks the bishop onto the a2-g8 diagonal, still glaring at f7 behind the lines. Black develops …Be7; now you pour pieces at the loosened king.", sayShort: "Bb3 — safe bishop, eye f7.", arrows: [A('b3', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 9, say: "…Be7 — the main tabiya. Nb5 leaps at c7, your queen and bishop rake the kingside, and Black stays tangled. Theory calls it balanced, but over the board the initiative for the pawn is fierce — keep attacking.", sayShort: "…Be7 — Nb5 at c7, attack.", arrows: [A('c3', 'b5')], highlights: [H('c7', KEY)] },
  ] },
  'vienna-game::2::c6@7': { ...VN_QUIET, beats: [{ atMove: 8, say: "Nf3 — you develop, settling into the solid Vienna Hybrid; White's flexible setup and the c4-bishop give a comfortable game.", sayShort: "Nf3 — develop, solid.", highlights: [H('f3')] }, { atMove: 20, say: "Ng3 — the knight reaches g3, eyeing f5; White's slow maneuvering toward the kingside is the Hybrid's plan.", sayShort: "Ng3 — eye f5.", highlights: [H('g3'), H('f5', SOFT)] }] },
  'vienna-game::2::Bb4@5': { ...VN_QUIET, beats: [{ atMove: 8, say: "f4 — you strike in the centre, the Vienna's signature break; White opens lines and seizes the initiative against the pinned-bishop setup.", sayShort: "f4 — strike, open lines.", highlights: [H('f4')] }, { atMove: 16, say: "fxg7 — the pawn crashes through to g7, forking the rook and tearing open Black's kingside; White's attack reaps material in the sharp line.", sayShort: "fxg7 — crash through.", highlights: [H('g7')] }] },
  'vienna-game::2::Nc6@7': { ...VN_QUIET, beats: [{ atMove: 10, say: "Na4 — the knight challenges the c5-bishop; trading it gives Black doubled pawns and White the better structure.", sayShort: "Na4 — challenge the bishop.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 18, say: "Bxe6 — you trade, saddling Black with doubled e-pawns; White's superior structure presses.", sayShort: "Bxe6 — double his pawns.", highlights: [H('e6')] }] },
  'vienna-game::3::g6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 12, say: "d3 — you calmly bolster the centre; the …g6 push fatally weakened f7 and the Frankenstein-Dracula mate threat is now unstoppable.", sayShort: "d3 — bolster, f7 falls.", highlights: [H('d3'), H('f7', ATK)] }, { atMove: 14, say: "Qxf7# — checkmate. Black's greed on e4 and the loosening …g6 let the queen crash through — the Vienna's sharpest trap.", sayShort: "Qxf7# — checkmate.", highlights: [H('f7')] }] },
  'vienna-game::3::d5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 12, say: "f3 — you shore up e4 while Black grabs space on the queenside, blind to the danger; the queen's aim at f7 is decisive.", sayShort: "f3 — shore up, f7 falls.", highlights: [H('f3'), H('f7', ATK)] }, { atMove: 14, say: "Qxf7# — checkmate. Black ignored the queen's aim at f7 — the Frankenstein-Dracula's punishment for grabbing on e4.", sayShort: "Qxf7# — checkmate.", highlights: [H('f7')] }] },
  'vienna-game::3::Ng5@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "Bxg5 — you snap the knight; after the trades White emerges with the bishop pair and a safe edge — the Frankenstein-Dracula's greed punished.", sayShort: "Bxg5 — snap, stay ahead.", highlights: [H('g5')] }, { atMove: 18, say: "Qh5+ — the check harries Black's exposed king; White's active pieces and better structure press the advantage.", sayShort: "Qh5+ — harry the king.", highlights: [H('h5')] }] },
  'vienna-game::3::Qf6@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "Nxe4 — you regain the piece, the knight central and Black's position loose; White's pieces dominate after the skirmish.", sayShort: "Nxe4 — regain, dominate.", highlights: [H('e4')] }, { atMove: 16, say: "Qxe5+ — the queen grabs the centre pawn with check; White collects material and keeps the initiative against the exposed king.", sayShort: "Qxe5+ — grab with check.", highlights: [H('e5')] }] },
  'vienna-game::3::Qe7@7': { ...VN_FRANKENSTEIN, beats: [{ atMove: 14, say: "dxe4 — you recover the piece, the broad centre intact; White's extra space and the c4-bishop give a comfortable edge.", sayShort: "dxe4 — recover, comfortable.", highlights: [H('e4')] }, { atMove: 16, say: "Qd1 — the queen retreats to safety with the material gained; White consolidates a solid advantage from the Frankenstein-Dracula.", sayShort: "Qd1 — retreat, consolidate.", highlights: [H('d1')] }] },
  'vienna-game::3::Nc6@5': { ...VN_BC4_DEV, beats: [{ atMove: 6, say: "d3 — you settle into the Stanley, a reversed Spanish a tempo up; solid development and the c4-bishop's pressure give White a small, lasting pull.", sayShort: "d3 — solid Stanley setup.", highlights: [H('d3')] }, { atMove: 12, say: "Nf3 — you develop, eyeing the centre; with the half-open a-file and the bishop pair offsetting the doubled b-pawns, White stands comfortably.", sayShort: "Nf3 — develop, press.", highlights: [H('f3')] }] },
  'vienna-game::3::Bc5@5': { ...VN_BC4_DEV, beats: [{ atMove: 12, say: "a3 — you secure the queenside and prepare slow maneuvering; the Stanley's reversed-Italian setup gives White a comfortable, flexible game.", sayShort: "a3 — secure, maneuver.", highlights: [H('a3')] }, { atMove: 18, say: "Nh2 — the knight reroutes toward g4 and the kingside, the thematic maneuver; White builds patiently behind the solid centre.", sayShort: "Nh2 — reroute to the kingside.", highlights: [H('h2')] }] },
  'vienna-game::3::Bb4@5': { ...VN_BC4_DEV, beats: [{ atMove: 8, say: "f4 — you strike in the centre, the Vienna's signature break; White opens lines and seizes the initiative against the pinned-bishop setup.", sayShort: "f4 — strike, open lines.", highlights: [H('f4')] }, { atMove: 16, say: "fxg7 — the pawn crashes through to g7, forking the rook and tearing open Black's kingside; White's attack reaps material in the sharp line.", sayShort: "fxg7 — crash through.", highlights: [H('g7')] }] },
  'vienna-game::3::Nc6@9': { ...VN_FRANKENSTEIN, beats: [{ atMove: 10, say: "d4 — you strike in the centre, opening lines for your pieces against Black's awkward knights; White's initiative builds in the Frankenstein-Dracula.", sayShort: "d4 — strike, open lines.", highlights: [H('d4')] }, { atMove: 14, say: "Qxe5 — the queen grabs the centre pawn, dominating; White collects material and keeps the pieces active.", sayShort: "Qxe5 — grab, dominate.", highlights: [H('e5')] }] },
  'vienna-game::3::c6@5': { ...VN_BC4_DEV, beats: [
    { atMove: 5, say: "…c6 prepares the …d5 freeing break — strike first. d4 seizes the centre at once, before Black can get …d5 in on his terms.", sayShort: "…c6 — answer d4.", arrows: [A('d2', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 6, say: "d4 grabs the full centre and jabs at e5. Black pins with …Bb4, but you're better developed with more space.", sayShort: "d4 — take the centre, hit e5.", arrows: [A('d4', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 7, say: "…Bb4 pins your c3-knight — a nuisance, not a threat. Bd3, Nf3 or Qe2 and castling consolidate the broad centre and the space edge while you keep the bishop trained on f7.", sayShort: "…Bb4 — consolidate, keep the space.", highlights: [H('c3', SOFT)] },
  ] },
  'vienna-game::4::Bg4@13': { ...VN_HAMPPE, beats: [{ atMove: 13, say: "Bg4 pins your f3-knight in the Hamppe. No fear: h3 puts the question, Be3 and Qd2 develop, and you press the over-extended g5-f4 chain. Your d4-centre and the f-file feed the attack — the gambit pawn buys a roaring initiative.", sayShort: "Bg4 — h3, press the g5 chain.", arrows: [A('c4', 'f7')], highlights: [H('f4', KEY)] }] },
  'vienna-game::4::h6@11': { ...VN_HAMPPE, beats: [{ atMove: 12, say: "h4 — you strike at Black's g5-pawn, prising open the kingside; White's attack rolls in the sharp Vienna Gambit Max Lange.", sayShort: "h4 — strike g5.", arrows: [A('h4', 'g5')], highlights: [H('h4'), H('g5', ATK)] }, { atMove: 14, say: "Qd3 — the queen centralises behind the big centre, eyeing the kingside; White's pieces and pawns press Black's loose position.", sayShort: "Qd3 — centralise, press.", highlights: [H('d3')] }] },
  'vienna-game::4::g4@13': { ...VN_HAMPPE, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's centre and pieces dominate the open position.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 16, say: "Qxf3 — you recapture toward the centre, the queen active and eyeing f7; White's pieces converge for the Vienna attack.", sayShort: "Qxf3 — recapture, eye f7.", highlights: [H('f3'), H('f7', SOFT)] }] },
  'vienna-game::4::g4@11': { ...VN_HAMPPE, beats: [{ atMove: 12, say: "Bxf4 — you recover the gambit pawn, the bishop developing; White's centre and pieces hold the Max Lange initiative.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 16, say: "Bxf7+ — the bishop crashes in with check, dragging the king out; White's pieces swarm the exposed monarch in the Max Lange.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'vienna-game::4::Nge7@13': { ...VN_HAMPPE, beats: [{ atMove: 14, say: "Nxg5 — the knight pounces toward f7 and e6, exploiting Black's position; White's attack roars in the sharp Max Lange.", sayShort: "Nxg5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 18, say: "Bxf7+ — the bishop crashes in with check, dragging the king out; White's pieces converge for a decisive attack.", sayShort: "Bxf7+ — drag the king out.", arrows: [A('f7', 'e8')], highlights: [H('f7')] }] },
  'vienna-game::4::Bd7@13': { ...VN_HAMPPE, beats: [{ atMove: 16, say: "Qd3 — the queen centralises behind the big centre, eyeing the kingside; White's pieces press the Max Lange initiative.", sayShort: "Qd3 — centralise, press.", highlights: [H('d3')] }, { atMove: 20, say: "Bb5 — the bishop pins and pressures, developing with tempo; White's active pieces and broad centre hold the initiative.", sayShort: "Bb5 — pin, develop.", highlights: [H('b5')] }] },
  'vienna-game::4::Nh6@13': { ...VN_HAMPPE, beats: [{ atMove: 14, say: "Nd5 — the knight seizes the central outpost, hitting c7 and Black's position; White's pieces dominate the centre.", sayShort: "Nd5 — central outpost.", highlights: [H('d5')] }, { atMove: 18, say: "Bd3 — the bishop redeploys to the b1-h7 diagonal, eyeing the kingside; White builds a harmonious attacking setup.", sayShort: "Bd3 — eye the kingside.", arrows: [A('d3', 'h7')], highlights: [H('d3'), H('h7', SOFT)] }] },
  'vienna-game::4::Nh6@11': { ...VN_HAMPPE, beats: [{ atMove: 12, say: "h4 — you strike at the g5-pawn, prising open the kingside; White's attack rolls in the Max Lange.", sayShort: "h4 — strike g5.", arrows: [A('h4', 'g5')], highlights: [H('h4'), H('g5', ATK)] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop active; White's broad centre and pieces dominate.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'vienna-game::4::Nge7@11': { ...VN_HAMPPE, beats: [{ atMove: 12, say: "Nxg5 — the knight pounces toward f7, exploiting the loosened kingside; White's attack roars in the Max Lange.", sayShort: "Nxg5 — pounce at f7.", arrows: [A('g5', 'f7')], highlights: [H('g5'), H('f7', ATK)] }, { atMove: 14, say: "Qh5 — the queen joins the assault, eyeing f7 and h7; White's pieces converge for a crushing attack on the king.", sayShort: "Qh5 — join the assault.", highlights: [H('h5'), H('f7', ATK)] }] },
  'vienna-game::4::Bc5@5': { ...VN_HAMPPE, beats: [
    { atMove: 5, say: "…Bc5 develops actively instead of grabbing the pawn. Develop with purpose: Nf3 adds a guard to e5 and readies the f4-lever to open the file.", sayShort: "…Bc5 — develop Nf3.", arrows: [A('g1', 'f3')], highlights: [H('f4', KEY)] },
    { atMove: 6, say: "Nf3 leans on e5 and supports the f4-tension. With d3, Bc4 and castling you keep the space and the half-open f-file aimed at Black's king — a comfortable, pressing game.", sayShort: "Nf3 — guard e5, ready f4.", arrows: [A('f3', 'e5')], highlights: [H('e5', SOFT)] },
  ] },
  'vienna-game::5::Qe7@7': VN_GAMBIT_E5,
  'vienna-game::5::d6@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "Ne4 — the knight leaps to a dominant central post, eyeing d6 and f6; White's e5-wedge and active pieces give the initiative.", sayShort: "Ne4 — dominant post.", highlights: [H('e4')] }, { atMove: 16, say: "Bc4 — the bishop eyes f7, joining the development; White's space and pieces are full value for the gambit pawn.", sayShort: "Bc4 — eye f7, develop.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'vienna-game::5::Nc6@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "d4 — you build the broad centre, the e5- and d4-pawns cramping Black; White's space is the compensation for the pawn.", sayShort: "d4 — broad centre.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop developing; White's space and active pieces give the initiative.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }] },
  'vienna-game::5::Bb4@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "axb4 — you win the bishop, the pin broken; with the bishop pair and the broad e5-centre, White stands clearly better.", sayShort: "axb4 — win the bishop.", highlights: [H('b4')] }, { atMove: 18, say: "d4 — the centre rolls, your space advantage dominating; White's pawns and pieces press Black's cramped position.", sayShort: "d4 — roll, dominate.", highlights: [H('d4'), H('e5', SOFT)] }] },
  'vienna-game::5::g5@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "Qe2 — the queen centralises, supporting e5 and the coming O-O-O; White weathers Black's wild g-pawn push and keeps the initiative.", sayShort: "Qe2 — centralise, support e5.", highlights: [H('e2'), H('e5', SOFT)] }, { atMove: 18, say: "Bb2 — the bishop rakes the long diagonal toward g7 and e5; White's pieces converge while Black's kingside loosens.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'vienna-game::5::Bc5@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "d4 — you build the broad centre, hitting the c5-bishop; White's space and development compensate the pawn.", sayShort: "d4 — build, hit c5.", arrows: [A('d4', 'c5')], highlights: [H('d4'), H('c5', ATK)] }, { atMove: 18, say: "Nxd5 — the knight seizes the centre with tempo, hitting Black's loose pieces; White's active forces press the initiative.", sayShort: "Nxd5 — seize the centre.", highlights: [H('d5')] }] },
  'vienna-game::5::Be7@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "Bc4 — the bishop eyes f7, joining the attack; White's lead in development and the e5-pawn are full value for the gambit.", sayShort: "Bc4 — eye f7, attack.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 18, say: "exd6 — you open the position, the passed d-pawn and active pieces pressing; White's initiative rolls forward.", sayShort: "exd6 — open, press.", highlights: [H('d6')] }] },
  'vienna-game::5::f6@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "d4 — you build the centre while Black overextends his kingside pawns; White's development punishes the loosening.", sayShort: "d4 — build, punish him.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 18, say: "Nxf5 — the knight crashes into f5, exploiting Black's weakened kingside; White's pieces converge on the holes.", sayShort: "Nxf5 — exploit the holes.", highlights: [H('f5')] }] },
  'vienna-game::5::h6@9': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "Bc4 — the bishop eyes f7 and d5; with Black drifting on the kingside, White's development lead presses for the attack.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 16, say: "Bxd5 — you snap the central pawn, the bishop dominating; White's active pieces and the e5-wedge give a strong initiative.", sayShort: "Bxd5 — snap, dominate.", highlights: [H('d5')] }] },
  'vienna-game::5::Bg4@11': { ...VN_GAMBIT_E5, beats: [{ atMove: 14, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's centre and active pieces press.", sayShort: "Bxf4 — recover, develop.", highlights: [H('f4')] }, { atMove: 16, say: "Be2 — you break the g4-pin and develop; White's broad centre and harmonious pieces hold the initiative.", sayShort: "Be2 — break the pin.", highlights: [H('e2')] }] },
  'vienna-game::6::Be6@9': { ...VN_G3, beats: [{ atMove: 10, say: "Nf3 — you develop, eyeing e5 and the centre; the Mieses fianchetto gives White a harmonious, comfortable setup.", sayShort: "Nf3 — develop, harmonious.", highlights: [H('f3'), H('e5', SOFT)] }, { atMove: 16, say: "d4 — you strike the centre, the g2-bishop raking the long diagonal; White's harmonious pieces press for the initiative.", sayShort: "d4 — strike, rake.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }] },
  'vienna-game::6::Bc5@11': { ...VN_G3, beats: [{ atMove: 14, say: "Bxe4 — you snap the advanced pawn, the bishop dominating the long diagonal; White's structure and active pieces give the edge.", sayShort: "Bxe4 — snap, dominate.", highlights: [H('e4')] }, { atMove: 16, say: "Qe2 — the queen connects, offering a trade to simplify; White's bishop pair and solid structure hold a small, lasting pull.", sayShort: "Qe2 — connect, simplify.", highlights: [H('e2')] }] },
  'vienna-game::6::c6@9': { ...VN_G3, beats: [{ atMove: 14, say: "Qe2 — the queen centralises, attacking the overextended e3-pawn; White's pieces target Black's loose advance.", sayShort: "Qe2 — attack e3.", highlights: [H('e2'), H('e3', ATK)] }, { atMove: 16, say: "Nf3 — you develop, eyeing the e-pawns and the centre; White's harmonious setup presses Black's overextension.", sayShort: "Nf3 — develop, press.", highlights: [H('f3')] }] },
  'vienna-game::6::c6@11': { ...VN_G3, beats: [{ atMove: 14, say: "Bxe4 — you snap the advanced pawn, the bishop dominating the long diagonal; White's structure and pieces give the edge.", sayShort: "Bxe4 — snap, dominate.", highlights: [H('e4')] }, { atMove: 18, say: "Ne2 — you develop the knight, completing the fianchetto setup; White's bishop pair and the long diagonal give a comfortable game.", sayShort: "Ne2 — develop, complete.", highlights: [H('e2')] }] },
  'vienna-game::6::Bd6@11': { ...VN_G3, beats: [{ atMove: 14, say: "Bxe4 — you snap the advanced pawn, the bishop dominating the long diagonal; White's structure and pieces give the edge.", sayShort: "Bxe4 — snap, dominate.", highlights: [H('e4')] }, { atMove: 18, say: "Be3 — you develop, eyeing the queenside and supporting your structure; White's bishop pair holds a small, lasting pull.", sayShort: "Be3 — develop, press.", highlights: [H('e3')] }] },
  'vienna-game::6::Bg4@17': { ...VN_G3, beats: [{ atMove: 18, say: "h3 — you question the g4-bishop, gaining the bishop pair or a tempo; White maneuvers in the solid Mieses structure.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 22, say: "g4 — you gain kingside space, driving the bishop back; White's space and the long-diagonal bishop press the initiative.", sayShort: "g4 — gain space.", highlights: [H('g4')] }] },
  'vienna-game::6::Nb6@9': { ...VN_G3, beats: [{ atMove: 14, say: "fxe3 — you snap off the overextended pawn, opening the f-file for your rook; White's structure and active pieces hold the edge.", sayShort: "fxe3 — snap, open the f-file.", highlights: [H('e3')] }, { atMove: 16, say: "Nge2 — you develop, completing the fianchetto setup; White's bishop pair and the open f-file give a comfortable game.", sayShort: "Nge2 — develop, complete.", highlights: [H('e2')] }] },
  'vienna-game::6::Be7@11': { ...VN_G3, beats: [{ atMove: 14, say: "Bxe4 — you snap the advanced pawn, the bishop dominating the long diagonal; White's structure and pieces give the edge.", sayShort: "Bxe4 — snap, dominate.", highlights: [H('e4')] }, { atMove: 18, say: "Ne2 — you develop the knight, completing the fianchetto setup; White's bishop pair and the long diagonal give a comfortable game.", sayShort: "Ne2 — develop, complete.", highlights: [H('e2')] }] },
  'vienna-game::6::Bc5@5': { ...VN_G3, beats: [
    { atMove: 5, say: "…Bc5 develops actively against your Mieses g3 setup. Stay the course: Bg2 completes the fianchetto, putting the bishop on the long light diagonal.", sayShort: "…Bc5 — answer Bg2.", arrows: [A('f1', 'g2')], highlights: [H('g2', KEY)] },
    { atMove: 6, say: "Bg2 finishes the fianchetto. With O-O, d3 and Nf3 to follow, the bishop will rake the long diagonal once the centre clears — a calm, strategically rich game where your harmonious setup gives the lasting pull.", sayShort: "Bg2 — fianchetto, long diagonal.", highlights: [H('g2', KEY)] },
  ] },
  'vienna-game::6::Bg4@15': { ...VN_G3, beats: [{ atMove: 16, say: "d4 — you strike the centre, the g2-bishop raking the long diagonal; White opens lines for the initiative.", sayShort: "d4 — strike, rake.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 18, say: "Re1+ — the rook checks down the open e-file, gaining tempo; White's pieces press Black's position.", sayShort: "Re1+ — check, gain tempo.", arrows: [A('e1', 'e8')], highlights: [H('e1')] }] },
  'vienna-game::7::d6@11': { ...VN_QG4, beats: [{ atMove: 12, say: "Qxg7 — you grab the g-pawn and eye the h8-rook; in the wild Meitner-Mieses, White scoops up material while Black attacks.", sayShort: "Qxg7 — grab, eye the rook.", arrows: [A('g7', 'h8')], highlights: [H('g7')] }, { atMove: 18, say: "Qxh8 — the queen crashes into the corner, winning the rook; White is up serious material, with the task of weathering Black's initiative.", sayShort: "Qxh8 — win the rook.", highlights: [H('h8')] }] },
  'vienna-game::7::Nf6@11': { ...VN_QG4, beats: [{ atMove: 12, say: "Qxg7 — you grab the g-pawn and eye the rook; White scoops up material in the wild Meitner-Mieses while Black attacks.", sayShort: "Qxg7 — grab the pawn.", arrows: [A('g7', 'h8')], highlights: [H('g7')] }, { atMove: 16, say: "Qxh8 — the queen takes the rook in the corner; White banks a decisive material edge in the Meitner-Mieses melee.", sayShort: "Qxh8 — take the rook.", highlights: [H('h8')] }] },
  'vienna-game::7::g6@11': { ...VN_QG4, beats: [{ atMove: 12, say: "Nh3 — you develop, attacking the f2-queen and untangling; White consolidates the extra material in the wild gambit.", sayShort: "Nh3 — attack the queen.", arrows: [A('h3', 'f2')], highlights: [H('h3'), H('f2', ATK)] }, { atMove: 16, say: "Nxc7+ — the knight forks king and rook; White grabs more material, riding out Black's attack from a position of strength.", sayShort: "Nxc7+ — fork king and rook.", arrows: [A('c7', 'a8')], highlights: [H('c7')] }] },
  'vienna-game::7::Bb6@11': { ...VN_QG4, beats: [{ atMove: 14, say: "Nxf2 — you snap off Black's marauding queen; White emerges up a queen for a rook and bishop — a decisive material edge.", sayShort: "Nxf2 — win the queen.", highlights: [H('f2')] }, { atMove: 16, say: "Nxg4 — you recapture, the dust settling with White comfortably ahead in material; the Meitner-Mieses gambit has backfired.", sayShort: "Nxg4 — recapture, stay up.", highlights: [H('g4')] }] },
  'vienna-game::7::Qg6@9': { ...VN_QG4, beats: [{ atMove: 10, say: "Nxc7+ — the knight forks king and rook before you trade queens; White wins the exchange and material in the Meitner-Mieses.", sayShort: "Nxc7+ — fork king and rook.", arrows: [A('c7', 'a8')], highlights: [H('c7')] }, { atMove: 14, say: "Nxa8 — the knight grabs the rook in the corner; White is up serious material from the gambit's complications.", sayShort: "Nxa8 — grab the rook.", highlights: [H('a8')] }] },
  'vienna-game::7::Na5@11': { ...VN_QG4, beats: [{ atMove: 12, say: "Nh3 — you develop, attacking the f2-queen and untangling; White consolidates the extra material from the gambit.", sayShort: "Nh3 — attack the queen.", arrows: [A('h3', 'f2')], highlights: [H('h3'), H('f2', ATK)] }, { atMove: 14, say: "Qxg7 — you grab the g-pawn and eye the rook; White scoops material while Black scrambles for the attack.", sayShort: "Qxg7 — grab the pawn.", highlights: [H('g7')] }] },
  'vienna-game::7::Bxf2+@9': { ...VN_QG4, beats: [{ atMove: 12, say: "Nxc7+ — the knight forks king and rook; White grabs material in the Meitner-Mieses while Black's attack peters out.", sayShort: "Nxc7+ — fork king and rook.", arrows: [A('c7', 'a8')], highlights: [H('c7')] }, { atMove: 16, say: "Nxa8 — the knight takes the rook in the corner; White emerges up serious material from the gambit complications.", sayShort: "Nxa8 — take the rook.", highlights: [H('a8')] }] },
  'vienna-game::7::Bd6@11': { ...VN_QG4, beats: [{ atMove: 12, say: "Qxg7 — you grab the g-pawn and eye the h8-rook; White scoops up material in the wild Meitner-Mieses.", sayShort: "Qxg7 — grab, eye the rook.", arrows: [A('g7', 'h8')], highlights: [H('g7')] }, { atMove: 14, say: "Qxh8 — the queen takes the rook in the corner; White banks a decisive material edge in the wild gambit.", sayShort: "Qxh8 — take the rook.", highlights: [H('h8')] }] },
  'vienna-game::7::Nge7@11': { ...VN_QG4, beats: [{ atMove: 14, say: "Nxf2 — you snap off Black's marauding queen; White emerges up material as the gambit backfires.", sayShort: "Nxf2 — win the queen.", highlights: [H('f2')] }, { atMove: 16, say: "Nxg4 — you recapture, the smoke clearing with White comfortably ahead in material.", sayShort: "Nxg4 — recapture, stay up.", highlights: [H('g4')] }] },
  'vienna-game::7::h5@13': { ...VN_QG4, beats: [{ atMove: 14, say: "Qg5 — the queen sidesteps to safety, eyeing the kingside; White holds the extra material while keeping the queen active.", sayShort: "Qg5 — sidestep, stay active.", highlights: [H('g5')] }, { atMove: 16, say: "Nxf2 — you snap off Black's deep queen; even after the trades, White emerges with a material edge from the gambit.", sayShort: "Nxf2 — win the queen.", highlights: [H('f2')] }] },

  // -- Vienna Gambit --
  'vienna-gambit::0::Qe7@7': { ...VG_E5, beats: [{ atMove: 8, say: "a3 — a flexible waiting move; the Vienna Gambit has given a pawn for the e5-centre and open lines, and you keep developing toward the attack.", sayShort: "a3 — flexible, keep developing.", highlights: [H('a3'), H('e5', SOFT)] }, { atMove: 14, say: "Kxf2 — you mop up the advanced pawn; the king is a touch airy, but Black has spent time grabbing material and White's pieces stay active.", sayShort: "Kxf2 — mop up, stay active.", highlights: [H('f2')] }] },
  'vienna-gambit::0::Nc6@9': { ...VG_E5, beats: [{ atMove: 14, say: "d4 — you build the broad centre, the e5- and d4-pawns cramping Black while your pieces develop; the Vienna Gambit's space is the compensation.", sayShort: "d4 — broad centre, cramp him.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's space and active pieces give the initiative.", sayShort: "Bxf4 — recover the pawn.", highlights: [H('f4')] }] },
  'vienna-gambit::0::Bb4@9': { ...VG_E5, beats: [{ atMove: 14, say: "axb4 — you win the bishop, the pin broken; with the bishop pair and the broad e5-centre, White stands clearly better.", sayShort: "axb4 — win the bishop.", highlights: [H('b4')] }, { atMove: 18, say: "d4 — the centre rolls, your space advantage dominating; White's pieces and pawns press Black's cramped position.", sayShort: "d4 — roll, dominate.", highlights: [H('d4'), H('e5', SOFT)] }] },
  'vienna-gambit::0::g5@9': { ...VG_E5, beats: [{ atMove: 14, say: "Qe2 — the queen centralises, supporting the e5-pawn and the coming O-O-O; White weathers Black's wild g-pawn push and keeps the initiative.", sayShort: "Qe2 — centralise, support e5.", highlights: [H('e2'), H('e5', SOFT)] }, { atMove: 18, say: "Bb2 — the bishop rakes the long diagonal toward g7 and e5; White's pieces converge while Black's kingside is loose.", sayShort: "Bb2 — rake the long diagonal.", arrows: [A('b2', 'g7')], highlights: [H('b2')] }] },
  'vienna-gambit::0::Bc5@9': { ...VG_E5, beats: [{ atMove: 14, say: "d4 — you build the broad centre, hitting the c5-bishop; the Vienna Gambit's space and development are the compensation for the pawn.", sayShort: "d4 — broad centre, hit c5.", arrows: [A('d4', 'c5')], highlights: [H('d4'), H('c5', ATK)] }, { atMove: 16, say: "Bc4 — the bishop eyes f7 and the centre; with the e5-d4 pawns cramping Black, White's initiative presses.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }] },
  'vienna-gambit::0::d5@9': { ...VG_E5, beats: [{ atMove: 14, say: "Bxd3 — you snap the advanced pawn, the bishop developing to a strong diagonal aiming at h7; White's pieces flow out with the initiative.", sayShort: "Bxd3 — snap, aim at h7.", arrows: [A('d3', 'h7')], highlights: [H('d3'), H('h7', SOFT)] }, { atMove: 18, say: "Be4 — the bishop dominates the centre, eyeing b7 and the kingside; White's active pieces hold the edge for the pawn.", sayShort: "Be4 — dominate the centre.", highlights: [H('e4')] }] },
  'vienna-gambit::0::Be7@9': { ...VG_E5, beats: [{ atMove: 14, say: "Bc4 — the bishop eyes f7, joining the attack; White's lead in development and the e5-pawn are full value for the gambit.", sayShort: "Bc4 — eye f7, attack.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 18, say: "exd6 — you open the position, the passed d-pawn and your active pieces pressing; White's initiative rolls forward.", sayShort: "exd6 — open, press.", highlights: [H('d6')] }] },
  'vienna-gambit::0::Bg4@11': { ...VG_E5, beats: [{ atMove: 14, say: "h3 — you question the g4-bishop, gaining the bishop pair or a tempo; White's broad centre and active pieces hold the pull.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }, { atMove: 16, say: "Bxf4 — you recover the gambit pawn, the bishop developing with tempo; White's space and pieces give the initiative.", sayShort: "Bxf4 — recover the pawn.", highlights: [H('f4')] }] },
  'vienna-gambit::0::f6@9': { ...VG_E5, beats: [{ atMove: 14, say: "d4 — you build the centre while Black overextends his kingside pawns; White's development and space punish the loosening.", sayShort: "d4 — build, punish him.", highlights: [H('d4'), H('e5', SOFT)] }, { atMove: 16, say: "Nh4 — the knight jumps toward f5, exploiting Black's weakened kingside; White's pieces converge on the holes.", sayShort: "Nh4 — toward f5, exploit.", highlights: [H('h4'), H('f5', SOFT)] }] },
  'vienna-gambit::0::h6@9': { ...VG_E5, beats: [{ atMove: 14, say: "Bc4 — the bishop eyes f7 and d5; with Black drifting on the kingside, White's development lead presses for the attack.", sayShort: "Bc4 — eye f7, press.", arrows: [A('c4', 'f7')], highlights: [H('c4'), H('f7', SOFT)] }, { atMove: 16, say: "Bxd5 — you snap the central pawn, the bishop dominating; White's active pieces and the e5-wedge give a strong initiative.", sayShort: "Bxd5 — snap, dominate.", highlights: [H('d5')] }] },
  'vienna-gambit::1::Nc6@13': { ...VG_QF3, beats: [{ atMove: 14, say: "O-O-O — you castle long, the rooks aiming at the centre and Black's king; the Paulsen's bishop pair and open lines give White the initiative.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }, { atMove: 18, say: "Nf3 — you develop the knight, completing the setup behind the e5-pawn; White's pieces converge for the opposite-side attack.", sayShort: "Nf3 — develop, converge.", highlights: [H('f3')] }] },
  'vienna-gambit::1::Bc5@13': { ...VG_QF3, beats: [{ atMove: 14, say: "Qg3 — the queen swings to the kingside, eyeing g7 and supporting e5; White's bishop pair and active queen press Black's position.", sayShort: "Qg3 — swing, press g7.", highlights: [H('g3')] }, { atMove: 16, say: "Nf3 — you develop, reinforcing the e5-pawn and the kingside; White's harmonious Paulsen setup holds the initiative.", sayShort: "Nf3 — develop, reinforce.", highlights: [H('f3')] }] },
  'vienna-gambit::1::c5@13': { ...VG_QF3, beats: [{ atMove: 14, say: "O-O-O — you castle long, rooks toward the centre; the Paulsen's bishop pair and the e5-wedge give White the attacking chances.", sayShort: "O-O-O — castle long.", highlights: [H('c1')] }, { atMove: 18, say: "Ng5 — the knight pounces toward e6 and f7, exploiting the bishop pair's open lines; White's initiative crashes through.", sayShort: "Ng5 — pounce at e6.", arrows: [A('g5', 'e6')], highlights: [H('g5'), H('e6', ATK)] }] },
  'vienna-gambit::1::Nd7@13': { ...VG_QF3, beats: [{ atMove: 14, say: "O-O-O — you castle long, the rooks aiming at Black's centre and king; White's bishop pair gives the lasting initiative.", sayShort: "O-O-O — castle long.", highlights: [H('c1')] }, { atMove: 16, say: "Ne2 — the knight reroutes toward d4 or g3, the flexible Paulsen square; White builds the attack behind the e5-pawn.", sayShort: "Ne2 — reroute, build.", highlights: [H('e2')] }] },
  'vienna-gambit::1::O-O@15': { ...VG_QF3, beats: [{ atMove: 16, say: "h4 — the pawn storm begins against Black's castled king, the standard Paulsen attacking plan; White races on the kingside.", sayShort: "h4 — storm the king.", highlights: [H('h4')] }, { atMove: 18, say: "Qg3 — the queen joins the kingside assault, eyeing g7; White's bishop pair and pawn storm bear down on the king.", sayShort: "Qg3 — join the assault.", highlights: [H('g3')] }] },
  'vienna-gambit::1::c6@13': { ...VG_QF3, beats: [{ atMove: 14, say: "Ne2 — the knight reroutes toward d4, eyeing the e6-bishop and f5; White builds the Paulsen attack with the bishop pair.", sayShort: "Ne2 — reroute toward d4.", highlights: [H('e2')] }, { atMove: 16, say: "Nd4 — the knight lands on the dominant central post, hitting the e6-bishop; White's pieces converge on Black's position.", sayShort: "Nd4 — central post, hit e6.", arrows: [A('d4', 'e6')], highlights: [H('d4'), H('e6', ATK)] }] },
  'vienna-gambit::1::Nd7@15': { ...VG_QF3, beats: [{ atMove: 16, say: "Kb1 — you tuck the king, the standard prophylaxis before the attack; White's bishop pair and open lines press Black.", sayShort: "Kb1 — tuck, then attack.", highlights: [H('b1')] }, { atMove: 18, say: "Rxd5! — the rook crashes through, exploiting the pin and the open lines; White's active pieces blow open Black's centre.", sayShort: "Rxd5 — crash through.", highlights: [H('d5')] }] },
  'vienna-gambit::1::Bg5@15': { ...VG_QF3, beats: [{ atMove: 16, say: "Ne2 — the knight reroutes toward the kingside, challenging the g5-bishop's plans; White builds the Paulsen attack.", sayShort: "Ne2 — reroute, challenge.", highlights: [H('e2')] }, { atMove: 18, say: "Qh5 — the queen swings to the kingside, eyeing h7 and f7 against Black's king; White's pieces converge for the assault.", sayShort: "Qh5 — swing, eye h7.", highlights: [H('h5')] }] },
  'vienna-gambit::1::c5@15': { ...VG_QF3, beats: [{ atMove: 16, say: "Bc4 — the bishop eyes the e6-bishop and f7, joining the attack; White's bishop pair and open lines press Black's position.", sayShort: "Bc4 — join, eye e6.", arrows: [A('c4', 'e6')], highlights: [H('c4'), H('e6', ATK)] }, { atMove: 18, say: "Ne2 — the knight develops toward d4, completing the Paulsen setup; White's pieces converge for the opposite-side attack.", sayShort: "Ne2 — develop toward d4.", highlights: [H('e2')] }] },
  'vienna-gambit::1::Nc6@9': { ...VG_QF3, beats: [
    { atMove: 9, say: "…Nc6 develops and props the e4-knight — answer with Bb5, pinning the knight and piling pressure on the loose centre while you complete development.", sayShort: "…Nc6 — answer Bb5.", arrows: [A('f1', 'b5')], highlights: [H('b5', KEY)] },
    { atMove: 10, say: "Bb5 pins the c6-knight and adds a piece to the assault. Your queen rakes from f3, the e5-pawn cramps Black, and you'll regain the material with the better game — develop with threats.", sayShort: "Bb5 — pin, keep the initiative.", arrows: [A('b5', 'c6')], highlights: [H('c6', ATK)] },
  ] },

  // -- Petrov Defence --
  'petrov-defence::0::c4@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "c4 — White strikes at your d5-pawn to claim the centre. Check first: …Bb4+ develops with tempo, forcing him to block before he's ready.", sayShort: "c4 — answer …Bb4+.", arrows: [A('f8', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 11, say: "…Bb4+ drags a piece to d2 and gains you time. Castle, resolve the centre with …dxc4, and the position stays sound and harmonious.", sayShort: "…Bb4+ — gain tempo, then castle.", arrows: [A('b4', 'e1')], highlights: [H('e1', ATK)] },
    { atMove: 19, say: "…Be6 completes development, the bishop eyeing the queenside and bracing your structure. With …Nc6 to follow you have a comfortable, fully equal Petrov with no weaknesses.", sayShort: "…Be6 — finish, fully equal.", highlights: [H('e6', KEY)] },
  ] },
  'petrov-defence::0::Nc3@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "Nc3 challenges your strong e4-knight and offers a trade. Pin it back with …Bb4, happy to swap and damage White's pawns.", sayShort: "Nc3 — answer …Bb4.", arrows: [A('f8', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 11, say: "…Bb4 pins the c3-knight; after the exchanges there White is saddled with doubled pawns while you develop in comfort.", sayShort: "…Bb4 — pin, double his pawns.", arrows: [A('b4', 'c3')], highlights: [H('c3', ATK)] },
    { atMove: 17, say: "…Nxc3 forces bxc3, fixing White's doubled, isolated queenside pawns — a lasting target. With …Bg4 and …Nd7 you develop freely against the weakness.", sayShort: "…Nxc3 — fix the doubled pawns.", highlights: [H('c3', KEY)] },
  ] },
  'petrov-defence::0::Be2@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "Be2 develops modestly. Seize the initiative: …Bd6 posts the bishop on the b8-h2 diagonal, aimed at White's kingside.", sayShort: "Be2 — answer …Bd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 11, say: "…Bd6 trains on h2 and supports the centre. Play …c6 to brace d5, castle, and you have a rock-solid Petrov with the bishop pointed at his king.", sayShort: "…Bd6 — aim h2, brace …c6.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 13, say: "…c6 braces the d5-pawn and prepares to meet White's c4 break head-on. Your structure is solid and symmetric, the position dead level with easy development.", sayShort: "…c6 — brace d5, stay solid.", highlights: [H('d5', KEY)] },
  ] },
  'petrov-defence::0::c4@12': { ...PT_MAIN, beats: [
    { atMove: 12, say: "c4 — White hits your d5-pawn to prise open the centre. Insert …Bb4+ first, dragging the king to f1 and stripping White of castling.", sayShort: "c4 — answer …Bb4+.", arrows: [A('f8', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 13, say: "…Bb4+ forces Kf1 — White's king is stuck in the centre and his rooks are disconnected. Develop …Bf5 and castle; the lead in king safety is yours.", sayShort: "…Bb4+ — strip his castling.", arrows: [A('b4', 'e1')], highlights: [H('e1', ATK)] },
    { atMove: 17, say: "…O-O tucks your king to safety while White's still walks the centre. With …Bf5 done and the rooks coming to the open files, you hold the more comfortable game.", sayShort: "…O-O — safe king, press the files.", highlights: [H('f5', SOFT)] },
  ] },
  'petrov-defence::0::c3@12': { ...PT_MAIN, beats: [
    { atMove: 12, say: "c3 — a quiet move bracing d4 and making luft. Develop with purpose: …Bd6 eyes h2 and the kingside, the most active square for the bishop.", sayShort: "c3 — answer …Bd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 13, say: "…Bd6 aims at h2; castle, then …Bf5 completes development and pressures White's d3-bishop. Your pieces flow to their best squares in a symmetric, equal game.", sayShort: "…Bd6 — aim h2, then …Bf5.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 19, say: "…Qf6 centralises the queen and supports the …Nxe4 trade or a kingside build-up. Solid, harmonious, fully equal — every Petrov piece on a good square.", sayShort: "…Qf6 — centralise, fully equal.", highlights: [H('f6', SOFT)] },
  ] },
  'petrov-defence::0::h3@12': { ...PT_MAIN, beats: [
    { atMove: 12, say: "h3 — White stops …Bg4 before developing. Take the active path: …Bd6 posts the bishop toward h2 and your kingside chances.", sayShort: "h3 — answer …Bd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 13, say: "…Bd6 eyes h2; after Nc3 you trade on c3 to hand White doubled pawns, then check on e7 and complete development with the freer game.", sayShort: "…Bd6 — aim h2, then …Nxc3.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 15, say: "…Nxc3 saddles White with doubled c-pawns — a permanent target. With …Qe7+, castling and the bishop pair you press the structural weakness in a pleasant, equal middlegame.", sayShort: "…Nxc3 — double his pawns.", highlights: [H('c3', KEY)] },
  ] },
  'petrov-defence::0::Nbd2@14': { ...PT_MAIN, beats: [
    { atMove: 14, say: "Nbd2 challenges your e4-knight. Retreat with purpose: …Nd6 keeps the knight active, guarding f5 and b5 and eyeing c4.", sayShort: "Nbd2 — answer …Nd6.", arrows: [A('e4', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 15, say: "…Nd6 reroutes the knight to a fine square, and …Bf5 will trade off White's good bishop. Your structure is sound and your pieces harmonious.", sayShort: "…Nd6 — reroute, then …Bf5.", highlights: [H('d6', KEY)] },
    { atMove: 19, say: "…Nxf5 recaptures with a centralised knight, leaving you a clean, symmetric position with no weaknesses. The Petrov has done its job — solid, equal, easy to play.", sayShort: "…Nxf5 — solid and fully equal.", highlights: [H('f5', SOFT)] },
  ] },
  'petrov-defence::0::Re1@14': { ...PT_MAIN, beats: [
    { atMove: 14, say: "Re1 piles on the e-file behind your knight. Tuck the king away with …O-O, unworried — the e4-knight is well defended.", sayShort: "Re1 — answer …O-O.", highlights: [H('e4', KEY)] },
    { atMove: 15, say: "…O-O — king safe, and …Bf5 follows to challenge White's d3-bishop and complete development. The e-file pressure is harmless against your solid setup.", sayShort: "…O-O — safe, then …Bf5.", arrows: [A('c8', 'f5')], highlights: [H('f5', KEY)] },
    { atMove: 19, say: "…Nxc3 trades into doubled White pawns, then …Bxd3 swaps off his attacking bishop. You emerge with the better structure and a comfortable, fully equal game.", sayShort: "…Nxc3 — trade into a better structure.", highlights: [H('c3', SOFT)] },
  ] },
  'petrov-defence::0::Nc3@14': { ...PT_MAIN, beats: [
    { atMove: 14, say: "Nc3 offers to trade your centralised knight. Develop first with …Bf5, eyeing the d3-bishop and pinning nothing yet — just maximum activity.", sayShort: "Nc3 — answer …Bf5.", arrows: [A('c8', 'f5')], highlights: [H('f5', KEY)] },
    { atMove: 15, say: "…Bf5 challenges White's good bishop and supports the e4-knight. After the trades on c3 and d3 you hold the better pawn structure.", sayShort: "…Bf5 — challenge the bishop.", arrows: [A('f5', 'd3')], highlights: [H('d3', ATK)] },
    { atMove: 17, say: "…Nxc3 hands White doubled c-pawns; …Bxd3 removes his attacker. Castle, occupy the open files, and the structural edge gives a pleasant, equal game.", sayShort: "…Nxc3 — better structure, equal.", highlights: [H('c3', KEY)] },
  ] },
  'petrov-defence::0::cxd5@16': { ...PT_MAIN, beats: [
    { atMove: 16, say: "cxd5 — White grabs on d5, but it loosens his own pieces. Strike back: …Nxd3 first, removing his strong light-squared bishop with tempo.", sayShort: "cxd5 — answer …Nxd3.", arrows: [A('b4', 'd3')], highlights: [H('d3', ATK)] },
    { atMove: 17, say: "…Nxd3 trades off White's best minor piece; after Qxd3 you recapture the pawn with …Qxd5, fully central and active.", sayShort: "…Nxd3 — trade, then …Qxd5.", highlights: [H('d3', KEY)] },
    { atMove: 19, say: "…Qxd5 regains the pawn and centralises the queen, leaving a clean, level position with the bishop pair and no weaknesses. Easy, equal, comfortable.", sayShort: "…Qxd5 — central, fully equal.", highlights: [H('d5', KEY)] },
  ] },
  'petrov-defence::1::Nxf7@10': { ...PT_COCHRANE, beats: [{ atMove: 11, say: "…Kxf7 — you accept the piece; White has only checks, not a real attack, so the king walks calmly and Black stays a piece up, or takes the draw if White repeats.", sayShort: "…Kxf7 — take it, weather the checks.", highlights: [H('f7')] }, { atMove: 13, say: "…Ke7 — the king sidesteps; with no follow-up for White, the checks fizzle into a repetition. Black is never worse.", sayShort: "…Ke7 — sidestep, hold.", highlights: [H('e7')] }] },
  'petrov-defence::1::Nc3@10': { ...PT_D4, beats: [{ atMove: 11, say: "…Bb4 — you pin the c3-knight, developing with tempo; the Petrov's active piece play keeps Black comfortable.", sayShort: "…Bb4 — pin, develop.", arrows: [A('b4', 'c3')], highlights: [H('b4'), H('c3', ATK)] }, { atMove: 13, say: "…Nxe5 — you trade in the centre, simplifying toward equality; Black's solid structure neutralises White's initiative.", sayShort: "…Nxe5 — trade, equalise.", highlights: [H('e5')] }] },
  'petrov-defence::1::Nf3@10': { ...PT_D4, beats: [
    { atMove: 10, say: "Nf3 retreats the knight, content with a quiet game. Develop actively: …Bd6 posts the bishop toward h2, its most purposeful square.", sayShort: "Nf3 — answer …Bd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 11, say: "…Bd6 eyes h2 and braces the centre. Castle, play …c6 to support d5, and you sit behind a symmetric, weakness-free wall.", sayShort: "…Bd6 — aim h2, then castle.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 15, say: "…c6 anchors d5 against White's c4 break; the structure is symmetric and solid, the game dead level with easy piece play. The Petrov holds.", sayShort: "…c6 — anchor d5, fully equal.", highlights: [H('d5', KEY)] },
  ] },
  'petrov-defence::1::Bxe4@10': PT_D4,
  'petrov-defence::1::Re1@14': { ...PT_D4, beats: [
    { atMove: 14, say: "Re1 stacks the e-file behind your knight. No worry — it's well defended; tuck the king away with …O-O and finish developing.", sayShort: "Re1 — answer …O-O.", highlights: [H('e4', KEY)] },
    { atMove: 15, say: "…O-O — king safe. When White trades on e4 you recapture with the d-pawn, and the queen is ready to swing to h4 for active kingside play.", sayShort: "…O-O — safe, then …Qh4.", highlights: [H('e4', SOFT)] },
    { atMove: 19, say: "…Qh4 lunges to the kingside, hitting f2 and forcing White onto the defensive. Far from passive, the Petrov hands you the initiative here — press it.", sayShort: "…Qh4 — seize the initiative.", arrows: [A('h4', 'f2')], highlights: [H('f2', ATK)] },
  ] },
  'petrov-defence::1::Bf4@10': { ...PT_D4, beats: [
    { atMove: 10, say: "Bf4 develops with a gaze down the b8-h2 diagonal. Meet it actively: …Qf6 develops the queen, hitting the bishop and the b2-pawn.", sayShort: "Bf4 — answer …Qf6.", arrows: [A('d8', 'f6')], highlights: [H('f6', KEY)] },
    { atMove: 11, say: "…Qf6 attacks the f4-bishop and eyes b2 while developing. White must react, and the simplifications that follow level the game completely.", sayShort: "…Qf6 — hit f4 and b2.", arrows: [A('f6', 'f4')], highlights: [H('f4', ATK)] },
    { atMove: 17, say: "…Nxe5 starts a forcing run of trades; piece for piece comes off and you reach a dead-level position with the symmetric structure intact. The Petrov equalizes by force.", sayShort: "…Nxe5 — trade into equality.", highlights: [H('e5', SOFT)] },
  ] },
  'petrov-defence::1::Qe2@10': { ...PT_D4, beats: [
    { atMove: 10, say: "Qe2 pins your e4-knight to the e-file. Sidestep it cleanly: …Nxe5 trades off White's advanced knight first, dissolving the pin.", sayShort: "Qe2 — answer …Nxe5.", arrows: [A('d7', 'e5')], highlights: [H('e5', ATK)] },
    { atMove: 11, say: "…Nxe5 removes the cramping knight; after dxe5 your other knight reroutes to c5, a fine active square hitting White's d3-bishop.", sayShort: "…Nxe5 — trade, knight to c5.", highlights: [H('e5', SOFT)] },
    { atMove: 13, say: "…Nc5 leaps to a strong square, attacking the d3-bishop and eyeing e4 and e6. With …Be6 next you finish developing in a balanced, comfortable position.", sayShort: "…Nc5 — hit the bishop, develop.", arrows: [A('c5', 'd3')], highlights: [H('d3', ATK)] },
  ] },
  'petrov-defence::1::Nc3@14': { ...PT_D4, beats: [
    { atMove: 14, say: "Nc3 challenges your centralised knight. Trade it off: …Nxc3 saddles White with doubled c-pawns, a permanent target.", sayShort: "Nc3 — answer …Nxc3.", arrows: [A('e4', 'c3')], highlights: [H('c3', ATK)] },
    { atMove: 15, say: "…Nxc3 forces bxc3 — White's queenside pawns are doubled and weak. Castle, and you have a clean structural edge to play against.", sayShort: "…Nxc3 — double his pawns.", highlights: [H('c3', KEY)] },
    { atMove: 19, say: "…f5 calmly blunts White's Qh5 raid, grabbing space and shutting the kingside. With the doubled-pawn target and a snug king, you hold the easier, fully equal game.", sayShort: "…f5 — blunt the queen raid.", highlights: [H('f5', KEY)] },
  ] },
  'petrov-defence::1::Nd2@12': { ...PT_D4, beats: [
    { atMove: 12, say: "Nd2 offers to trade your active e4-knight. First grab the initiative: …Qh4 swings the queen to the kingside, eyeing f2 and h2.", sayShort: "Nd2 — answer …Qh4.", arrows: [A('d8', 'h4')], highlights: [H('h4', KEY)] },
    { atMove: 13, say: "…Qh4 lunges in, pressuring f2 and forcing White to mind his king before consolidating. The Petrov turns active — your queen sets the pace.", sayShort: "…Qh4 — pressure f2.", arrows: [A('h4', 'f2')], highlights: [H('f2', ATK)] },
    { atMove: 15, say: "…Nxd2 trades off, and after Bxd2 you castle queenside with a comfortable, active game — the queen on h4 and the bishop pair keep White busy. Fully equal with the initiative.", sayShort: "…Nxd2 — trade, then …O-O-O.", highlights: [H('d2', SOFT)] },
  ] },
  'petrov-defence::2::Bd2@12': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 13, say: "…O-O — you castle, and the doubled c-pawns come with the bishop pair and the half-open b-file; Black's structure is solid and active.", sayShort: "…O-O — bishop pair, open b-file.", highlights: [H('g8')] }, { atMove: 15, say: "…d5 — the freeing break stakes your centre; with the open b-file for your rook and the two bishops, Black stands fully equal.", sayShort: "…d5 — free, fully equal.", highlights: [H('d5')] }] },
  'petrov-defence::2::f3@10': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 11, say: "…d5 — you strike the centre immediately, exploiting White's clumsy f3; the Petrov's central counter gives Black easy equality.", sayShort: "…d5 — strike the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…Nxe4 — you snap the centre pawn back, the tactics flowing in your favour; Black emerges with a comfortable, active game.", sayShort: "…Nxe4 — snap it back.", highlights: [H('e4')] }] },
  'petrov-defence::2::Bg5@10': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 11, say: "…h6 — you question the pin, and after Bh4 the …g5 lunge will challenge it head-on; Black plays sharply for the initiative.", sayShort: "…h6 — question the pin.", highlights: [H('h6'), H('g5', SOFT)] }, { atMove: 19, say: "…Nxe4 — you snap the centre pawn, the bishop pair and active pieces giving Black a comfortable game.", sayShort: "…Nxe4 — snap it, equalise.", highlights: [H('e4')] }] },
  'petrov-defence::2::Bg5@12': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 13, say: "…O-O — you castle into a solid structure; the bishop pair and the open b-file balance the doubled pawns. Black is comfortable.", sayShort: "…O-O — solid, balanced.", highlights: [H('g8')] }, { atMove: 15, say: "…d5 — the freeing break; you stake the centre and even after the queens come off, Black's two bishops hold the balance.", sayShort: "…d5 — free, hold the balance.", highlights: [H('d5')] }] },
  'petrov-defence::2::e5@12': PT_NC3_TRANSPOSE,
  'petrov-defence::2::Qd3@10': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 11, say: "…O-O — you castle, completing development quickly; the Petrov's solidity and the bishop pair give Black an easy, equal game.", sayShort: "…O-O — develop, equalise.", highlights: [H('g8')] }, { atMove: 15, say: "…Re8 — the rook hits the e-file, pressuring White's centre; Black's active pieces fully neutralise the position.", sayShort: "…Re8 — pressure the e-file.", highlights: [H('e8')] }] },
  'petrov-defence::2::Qd4@12': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 13, say: "…c5 — you gain space and hit the centralised queen with tempo; Black's bishop pair and active pawns hold easy equality.", sayShort: "…c5 — hit the queen, gain space.", arrows: [A('c5', 'd4')], highlights: [H('c5'), H('d4', ATK)] }, { atMove: 17, say: "…Kxe7 — the queens are off and the king is fine in the centre; with the two bishops, Black has nothing to fear in the ending.", sayShort: "…Kxe7 — safe ending.", highlights: [H('e7')] }] },
  'petrov-defence::2::f3@12': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 13, say: "…c5 — you grab queenside space, restraining White's centre; the bishop pair and open files give Black a comfortable game.", sayShort: "…c5 — restrain, gain space.", highlights: [H('c5')] }, { atMove: 17, say: "…d5 — the freeing break stakes your centre; Black's pieces spring to life and equality is secure.", sayShort: "…d5 — free, spring out.", highlights: [H('d5')] }] },
  'petrov-defence::2::Bd3@10': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 11, say: "…Nxd4 — you trade off the centralised knight, simplifying; Black's solid Three Knights setup holds the balance.", sayShort: "…Nxd4 — trade, simplify.", highlights: [H('d4')] }, { atMove: 17, say: "…Ne5 — the knight leaps to a strong central post, hitting the d3-bishop; Black's active pieces equalise fully.", sayShort: "…Ne5 — strong post, hit d3.", arrows: [A('e5', 'd3')], highlights: [H('e5'), H('d3', ATK)] }] },
  'petrov-defence::2::Bd2@10': { ...PT_NC3_TRANSPOSE, beats: [{ atMove: 11, say: "…Nxd4 — you snap the centre knight; even as White lunges e5, Black's extra material and resources keep him safe.", sayShort: "…Nxd4 — snap the knight.", highlights: [H('d4')] }, { atMove: 17, say: "…Ne6 — the knight retreats to a solid square, blunting White's initiative; Black consolidates and equalises.", sayShort: "…Ne6 — consolidate.", highlights: [H('e6')] }] },
  'petrov-defence::3::Bd3@10': { ...PT_COCHRANE, beats: [{ atMove: 10, say: "Bd3 eyes your king down the b1-h7 road, but you're a whole piece up — just keep tidying. With …d5 already blunting the diagonal, walk the king to g8 behind …Re8 and the material simply wins. The bishop barks; it cannot bite.", sayShort: "Bd3 — tuck the king to g8.", arrows: [A('f7', 'g8')], highlights: [H('g8', KEY), H('d5', SOFT)] }] },
  'petrov-defence::3::Bd3@12': { ...PT_COCHRANE, beats: [{ atMove: 13, say: "…Kg8 — you tuck the king to safety by hand; a piece up for two pawns, your job is simply to consolidate and convert the Cochrane material.", sayShort: "…Kg8 — tuck the king, consolidate.", highlights: [H('g8')] }, { atMove: 15, say: "…Nc6 — you develop and bolster the centre; with the extra piece and the king tucked away, Black is winning if he stays solid.", sayShort: "…Nc6 — develop, stay solid.", highlights: [H('c6')] }] },
  'petrov-defence::3::d5@14': { ...PT_COCHRANE, beats: [{ atMove: 15, say: "…Bg4 — you sidestep the central push, keeping your extra piece; White's pawns roll but Black's material edge is decisive with care.", sayShort: "…Bg4 — keep the piece.", highlights: [H('g4')] }, { atMove: 19, say: "…Bf8 — you regroup the bishop defensively; a piece up, Black weathers the pawn storm and consolidates.", sayShort: "…Bf8 — regroup, hold.", highlights: [H('f8')] }] },
  'petrov-defence::3::f4@12': { ...PT_COCHRANE, beats: [{ atMove: 13, say: "…d5 — you blunt White's centre, fixing the pawns; a piece up, Black builds a fortress and the extra material tells.", sayShort: "…d5 — blunt, fix the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…Nc6 — you develop, challenging White's centre; with the extra piece, Black holds the advantage.", sayShort: "…Nc6 — develop, challenge.", highlights: [H('c6')] }] },
  'petrov-defence::3::Bg5@12': { ...PT_COCHRANE, beats: [{ atMove: 13, say: "…Kg8 — you tuck the king away; a piece up, you ride out White's attacking tries and consolidate the Cochrane material.", sayShort: "…Kg8 — tuck the king.", highlights: [H('g8')] }, { atMove: 15, say: "…Nxe4 — you snap a pawn back, simplifying toward a winning material edge; precise defence converts the extra piece.", sayShort: "…Nxe4 — snap, simplify.", highlights: [H('e4')] }] },
  'petrov-defence::3::Be2@12': { ...PT_COCHRANE, beats: [{ atMove: 13, say: "…c5 — you strike at White's broad centre, opening lines for your extra piece; the Cochrane material edge is the long-term trump.", sayShort: "…c5 — strike the centre.", highlights: [H('c5')] }, { atMove: 15, say: "…Kg8 — the king tucks to safety; a piece up, Black just needs smooth development and the extra material decides.", sayShort: "…Kg8 — tuck, develop.", highlights: [H('g8')] }] },
  'petrov-defence::3::Qe2@14': { ...PT_COCHRANE, beats: [{ atMove: 15, say: "…Bxc4 — you trade the attacker, simplifying while a piece ahead; every trade brings the Cochrane's extra material closer to deciding.", sayShort: "…Bxc4 — trade, simplify up.", highlights: [H('c4')] }, { atMove: 21, say: "…Bb4+ — a check that develops with tempo; a piece up and coordinated, Black is firmly in control.", sayShort: "…Bb4+ — develop with tempo.", arrows: [A('b4', 'e1')], highlights: [H('b4')] }] },
  'petrov-defence::3::Nc3@8': { ...PT_COCHRANE, beats: [
    { atMove: 8, say: "Nc3 develops, but without the d4-and-Bc4 pressure White has even less for the sacrificed piece. Trade his dangerous light-squared bishop with …Be6.", sayShort: "Nc3 — answer …Be6.", arrows: [A('c8', 'e6')], highlights: [H('e6', KEY)] },
    { atMove: 9, say: "…Be6 offers to swap White's most dangerous attacker and braces the …d5 wall. Trade it, build the pawn shield, walk the king home, and the extra piece is decisive.", sayShort: "…Be6 — trade, build …d5, convert.", arrows: [A('e6', 'c4')], highlights: [H('d5', SOFT)] },
  ] },
  'petrov-defence::4::Bd3@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — the freeing break stakes your own centre; the symmetrical Petrov is rock-solid and Black equalises with ease.", sayShort: "…d5 — free the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…Bf6 — the bishop eyes the long diagonal and White's centre; Black's harmonious development holds full equality.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'petrov-defence::4::Bc4@12': PT_5NC3,
  'petrov-defence::4::Bf4@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — the central break; you stake your share of the centre and the Petrov's symmetry guarantees comfortable equality.", sayShort: "…d5 — stake the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…O-O — you castle into a solid structure; with …c6 bracing d5 and the pieces harmonious, Black is fully equal.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }] },
  'petrov-defence::4::bxc3@10': { ...PT_5NC3, beats: [{ atMove: 11, say: "…Be7 — you develop solidly; White's doubled c-pawns from bxc3 are a structural target for you. The symmetrical Petrov is comfortable equality.", sayShort: "…Be7 — develop, eye the doubled pawns.", highlights: [H('e7')] }, { atMove: 13, say: "…d5 — the freeing break stakes your centre and fixes White's doubled pawns; the Petrov's solidity holds the balance with ease.", sayShort: "…d5 — free the centre.", highlights: [H('d5')] }] },
  'petrov-defence::4::Be2@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — you stake the centre; even as the queens come off, Black's rock-solid structure and easy development hold full equality.", sayShort: "…d5 — stake the centre.", highlights: [H('d5')] }, { atMove: 19, say: "…Bf6 — the bishop eyes the centre and the long diagonal in the endgame; Black is comfortable and completely equal.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'petrov-defence::4::Bd3@14': { ...PT_5NC3, beats: [{ atMove: 15, say: "…Be6 — you develop the bishop to a fine central square; the symmetrical Petrov is solid and Black equalises comfortably.", sayShort: "…Be6 — develop the bishop.", highlights: [H('e6')] }, { atMove: 17, say: "…Qd7 — you connect the rooks and prepare to castle; with the pieces harmonious, Black holds the balance easily.", sayShort: "…Qd7 — connect, prepare O-O.", highlights: [H('d7')] }] },
  'petrov-defence::4::Bd3@16': { ...PT_5NC3, beats: [{ atMove: 17, say: "…Ne5 — the knight jumps to a strong central post, offering a trade that frees your game; Black equalises with active pieces.", sayShort: "…Ne5 — strong central post.", highlights: [H('e5')] }, { atMove: 21, say: "…c6 — you brace the centre and prepare …Qa5; the solid Petrov structure leaves Black fully equal.", sayShort: "…c6 — brace, prepare …Qa5.", highlights: [H('c6')] }] },
  'petrov-defence::4::Nd4@16': { ...PT_5NC3, beats: [{ atMove: 17, say: "…Nxd4 — you trade off, simplifying; White's recapture leaves an isolated d-pawn for Black to target. Comfortable equality.", sayShort: "…Nxd4 — trade, target d4.", highlights: [H('d4')] }, { atMove: 19, say: "…O-O — you castle, completing a harmonious setup; Black plays against the d4-pawn with an easy game.", sayShort: "…O-O — finish, target d4.", highlights: [H('g8')] }] },
  'petrov-defence::4::Bb5@20': PT_5NC3,
  'petrov-defence::4::Bc4@14': { ...PT_5NC3, beats: [{ atMove: 15, say: "…O-O — you castle into a solid structure; the symmetrical Petrov gives Black easy, comfortable equality.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 17, say: "…Bg4 — the bishop pins toward the queen, developing with pressure; Black's active pieces neutralise White fully.", sayShort: "…Bg4 — pin, develop.", highlights: [H('g4')] }] },
  'petrov-defence::5::c4@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "c4 — White strikes at your d5-pawn to claim the centre. Check first: …Bb4+ develops with tempo, forcing him to block before he's ready.", sayShort: "c4 — answer …Bb4+.", arrows: [A('f8', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 11, say: "…Bb4+ drags a piece to d2 and gains you time. Castle, resolve the centre with …dxc4, and the position stays sound and harmonious.", sayShort: "…Bb4+ — gain tempo, then castle.", arrows: [A('b4', 'e1')], highlights: [H('e1', ATK)] },
    { atMove: 19, say: "…Be6 completes development, the bishop eyeing the queenside and bracing your structure. With …Nc6 to follow you have a comfortable, fully equal Petrov with no weaknesses.", sayShort: "…Be6 — finish, fully equal.", highlights: [H('e6', KEY)] },
  ] },
  'petrov-defence::5::c4@12': { ...PT_MAIN, beats: [{ atMove: 13, say: "…Bb4+ — a check that develops with tempo, disrupting White before he coordinates; the Petrov's active setup keeps Black equal.", sayShort: "…Bb4+ — disrupt, develop.", arrows: [A('b4', 'e1')], highlights: [H('b4')] }, { atMove: 17, say: "…Bf5 — the bishop develops to an active post, supporting the strong e4-knight; Black is fully equal with harmonious pieces.", sayShort: "…Bf5 — support the knight.", highlights: [H('f5')] }] },
  'petrov-defence::5::Nc3@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "Nc3 challenges your strong e4-knight and offers a trade. Pin it back with …Bb4, happy to swap and damage White's pawns.", sayShort: "Nc3 — answer …Bb4.", arrows: [A('f8', 'b4')], highlights: [H('b4', KEY)] },
    { atMove: 11, say: "…Bb4 pins the c3-knight; after the exchanges there White is saddled with doubled pawns while you develop in comfort.", sayShort: "…Bb4 — pin, double his pawns.", arrows: [A('b4', 'c3')], highlights: [H('c3', ATK)] },
    { atMove: 17, say: "…Nxc3 forces bxc3, fixing White's doubled, isolated queenside pawns — a lasting target. With …Bg4 and …Nd7 you develop freely against the weakness.", sayShort: "…Nxc3 — fix the doubled pawns.", highlights: [H('c3', KEY)] },
  ] },
  'petrov-defence::5::Be2@10': { ...PT_MAIN, beats: [
    { atMove: 10, say: "Be2 develops modestly. Seize the initiative: …Bd6 posts the bishop on the b8-h2 diagonal, aimed at White's kingside.", sayShort: "Be2 — answer …Bd6.", arrows: [A('f8', 'd6')], highlights: [H('d6', KEY)] },
    { atMove: 11, say: "…Bd6 trains on h2 and supports the centre. Play …c6 to brace d5, castle, and you have a rock-solid Petrov with the bishop pointed at his king.", sayShort: "…Bd6 — aim h2, brace …c6.", arrows: [A('d6', 'h2')], highlights: [H('h2', ATK)] },
    { atMove: 13, say: "…c6 braces the d5-pawn and prepares to meet White's c4 break head-on. Your structure is solid and symmetric, the position dead level with easy development.", sayShort: "…c6 — brace d5, stay solid.", highlights: [H('d5', KEY)] },
  ] },
  'petrov-defence::5::h3@12': { ...PT_MAIN, beats: [{ atMove: 13, say: "…O-O — you castle into the Classical Petrov, a model of solidity; the strong e4-knight and easy development give Black equality.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 15, say: "…Re8 — the rook seizes the e-file, supporting the centre; Black's pieces are perfectly placed for full equality.", sayShort: "…Re8 — seize the e-file.", highlights: [H('e8')] }] },
  'petrov-defence::5::Nbd2@12': { ...PT_MAIN, beats: [{ atMove: 13, say: "…O-O — you castle, the e4-knight anchored and your pieces flowing out; the Classical Petrov holds comfortable equality.", sayShort: "…O-O — anchor the knight.", highlights: [H('g8')] }, { atMove: 15, say: "…Bf5 — the bishop develops actively, reinforcing the e4-knight; Black is fully equal with a harmonious setup.", sayShort: "…Bf5 — reinforce the knight.", highlights: [H('f5')] }] },
  'petrov-defence::5::Qe2@12': { ...PT_MAIN, beats: [{ atMove: 13, say: "…O-O — you castle into the solid Classical structure; the e4-knight and active pieces give Black easy equality.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 17, say: "…Bg4 — the bishop pins the f3-knight, developing with pressure; Black's harmonious pieces fully neutralise White.", sayShort: "…Bg4 — pin, develop.", highlights: [H('g4')] }] },
  'petrov-defence::5::Re1@16': { ...PT_MAIN, beats: [{ atMove: 17, say: "…Re8 — you contest the e-file, trading down toward equality; the Classical Petrov's symmetry keeps Black solid.", sayShort: "…Re8 — contest the e-file.", highlights: [H('e8')] }, { atMove: 19, say: "…Na6 — the knight heads for c7 or c5, completing development; Black's pieces coordinate for full equality.", sayShort: "…Na6 — develop toward c5.", highlights: [H('a6')] }] },
  'petrov-defence::5::Nc3@16': { ...PT_MAIN, beats: [{ atMove: 17, say: "…Nxc3 — you trade off, saddling White with doubled c-pawns; Black's structure is the cleaner one and equality is assured.", sayShort: "…Nxc3 — double his pawns.", highlights: [H('c3')] }, { atMove: 21, say: "…Bf5 — the bishop develops to an active post; with the better structure and harmonious pieces, Black stands at least equal.", sayShort: "…Bf5 — active, better structure.", highlights: [H('f5')] }] },
  'petrov-defence::5::cxd5@16': { ...PT_MAIN, beats: [{ atMove: 17, say: "…cxd5 — you recapture, leaving symmetrical pawns and a rock-solid structure; the Classical Petrov holds easy equality.", sayShort: "…cxd5 — symmetrical, solid.", highlights: [H('d5')] }, { atMove: 21, say: "…Nd7 — the knight reroutes toward b6 or f6, completing development; Black coordinates for full equality.", sayShort: "…Nd7 — reroute, coordinate.", highlights: [H('d7')] }] },
  'petrov-defence::6::Be3@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — the freeing break stakes your centre; the symmetrical Petrov is rock-solid and Black equalises with ease.", sayShort: "…d5 — free the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…O-O — you castle into a solid structure; with …c6 bracing d5 and the pieces harmonious, Black is fully equal.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }] },
  'petrov-defence::6::Bd3@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — the freeing break stakes your own centre; the symmetrical Petrov is rock-solid and Black equalises with ease.", sayShort: "…d5 — free the centre.", highlights: [H('d5')] }, { atMove: 17, say: "…Bf6 — the bishop eyes the long diagonal and White's centre; Black's harmonious development holds full equality.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'petrov-defence::6::Bc4@12': PT_5NC3,
  'petrov-defence::6::bxc3@10': { ...PT_5NC3, beats: [{ atMove: 11, say: "…Be7 — you develop solidly; White's doubled c-pawns from bxc3 are a structural target for you. The symmetrical Petrov is comfortable equality.", sayShort: "…Be7 — develop, eye the doubled pawns.", highlights: [H('e7')] }, { atMove: 13, say: "…d5 — the freeing break stakes your centre and fixes White's doubled pawns; the Petrov's solidity holds the balance with ease.", sayShort: "…d5 — free the centre.", highlights: [H('d5')] }] },
  'petrov-defence::6::Be2@12': { ...PT_5NC3, beats: [{ atMove: 13, say: "…d5 — you stake the centre; even as the queens come off, Black's rock-solid structure and easy development hold full equality.", sayShort: "…d5 — stake the centre.", highlights: [H('d5')] }, { atMove: 19, say: "…Bf6 — the bishop eyes the centre and the long diagonal in the endgame; Black is comfortable and completely equal.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'petrov-defence::6::Bd3@14': { ...PT_5NC3, beats: [{ atMove: 15, say: "…O-O — you castle into a solid structure; the symmetrical Petrov gives Black comfortable equality.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 17, say: "…Re8 — the rook takes the e-file, pressuring White's centre; Black's active pieces hold the balance.", sayShort: "…Re8 — take the e-file.", highlights: [H('e8')] }] },
  'petrov-defence::6::Bd3@16': { ...PT_5NC3, beats: [{ atMove: 17, say: "…Qd7 — you connect the rooks and prepare to castle long; the Petrov's harmony gives Black full equality.", sayShort: "…Qd7 — connect, prepare O-O-O.", highlights: [H('d7')] }, { atMove: 21, say: "…Bf6 — the bishop eyes the long diagonal and White's centre; Black is comfortable and fully equal.", sayShort: "…Bf6 — eye the long diagonal.", highlights: [H('f6')] }] },
  'petrov-defence::6::Bb5@20': PT_5NC3,
  'petrov-defence::6::Bb5@18': { ...PT_5NC3, beats: [{ atMove: 19, say: "…a6 — you put the question to the b5-bishop, gaining the bishop pair or a tempo; Black's solid setup stays comfortable.", sayShort: "…a6 — question the bishop.", arrows: [A('a6', 'b5')], highlights: [H('a6'), H('b5', ATK)] }, { atMove: 21, say: "…O-O — you castle, completing a harmonious setup; the symmetrical Petrov leaves Black fully equal.", sayShort: "…O-O — finish, equal.", highlights: [H('g8')] }] },
  'petrov-defence::6::Bc4@14': { ...PT_5NC3, beats: [{ atMove: 15, say: "…O-O — you castle into a solid structure; the symmetrical Petrov gives Black easy, comfortable equality.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 17, say: "…Bg4 — the bishop pins toward the queen, developing with pressure; Black's active pieces neutralise White fully.", sayShort: "…Bg4 — pin, develop.", highlights: [H('g4')] }] },

  // -- Philidor Defence --
  'philidor-defence::0::Bg5@14': { ...PH_HANHAM, beats: [
    { atMove: 14, say: "Bg5 pins your f6-knight — ease it with …h6 and …Qc7, or reroute …Nf8-g6. Your Hanham wall is intact; prepare the …exd4 trade or the freeing …d5 break, and the cramp dissolves into a sound game.", sayShort: "Bg5 — …h6, then free with …d5.", highlights: [H('f6', KEY), H('d5', SOFT)] },
    { atMove: 15, say: "…h6 puts the question to the g5-bishop; whether it retreats or trades, your Hanham wall stands firm and …b5 grabs queenside space next.", sayShort: "…h6 — question the bishop.", highlights: [H('f6', SOFT)] },
    { atMove: 17, say: "…b5 expands on the queenside; with …Qc7 and the …exd4 release coming, your solid setup uncoils into an active, near-equal game.", sayShort: "…b5 — expand, then …exd4.", highlights: [H('b5', KEY)] },
  ] },
  'philidor-defence::0::h3@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…b5 — you expand on the queenside, the thematic Lion plan; Black gains space and a flexible, solid position.", sayShort: "…b5 — queenside expansion.", highlights: [H('b5')] }, { atMove: 17, say: "…Bb7 — the bishop fianchettoes onto the long diagonal, eyeing e4; Black's pieces harmonise behind the solid centre.", sayShort: "…Bb7 — fianchetto, eye e4.", arrows: [A('b7', 'e4')], highlights: [H('b7')] }] },
  'philidor-defence::0::dxe5@14': { ...PH_HANHAM, beats: [
    { atMove: 14, say: "dxe5 — White releases the central tension. Recapture …dxe5, and your cramp eases at once: the d-file opens for your rook and your pieces breathe. A comfortable, near-equal middlegame.", sayShort: "dxe5 — recapture, the cramp eases.", highlights: [H('e5', KEY), H('d5', SOFT)] },
    { atMove: 15, say: "…dxe5 recaptures and frees your game — the d-file opens for your rook and your cramped Hanham pieces breathe at last.", sayShort: "…dxe5 — open the d-file, breathe.", highlights: [H('e5', KEY)] },
    { atMove: 17, say: "…Bb4 develops actively, pinning or trading to ease further; with the open d-file and …Qc7 coordinating, you've equalised comfortably.", sayShort: "…Bb4 — active, fully equal.", highlights: [H('b4', SOFT)] },
  ] },
  'philidor-defence::0::h3@16': { ...PH_HANHAM, beats: [{ atMove: 17, say: "…Re8 — the rook lifts to the e-file, the standard Lion regrouping behind the solid centre; Black prepares …Bf8 and flexibility.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 21, say: "…exd4 — you release the central tension at the right moment, freeing your pieces; Black equalises with a sound structure.", sayShort: "…exd4 — release the tension.", highlights: [H('d4')] }] },
  'philidor-defence::0::a4@12': { ...PH_HANHAM, beats: [
    { atMove: 12, say: "a4 — White expands on the queenside. Meet it with …a5 to fix the pawns, or …c6 and …b5 ideas. Then turn to the centre: …exd4 or …d5 is the freeing break the Hanham lives for. Hold firm and choose your moment.", sayShort: "a4 — fix with …a5, free with …d5.", highlights: [H('d5', KEY), H('a5', SOFT)] },
    { atMove: 13, say: "…c6 braces the d5-square and the Hanham shell; …Re8 and …Bf8 complete the regroup behind your solid pawns.", sayShort: "…c6 — brace, complete the shell.", highlights: [H('d5', SOFT)] },
    { atMove: 17, say: "…exd4 releases the tension at the right moment; after the recapture your knight jumps to c5, eyeing e4 and White's bishop, and the cramp dissolves into a comfortable game.", sayShort: "…exd4 — release, knight to c5.", highlights: [H('c5', KEY)] },
  ] },
  'philidor-defence::0::Bb3@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…b5 — the queenside expansion, gaining space and harrying the bishop; Black's Lion setup is flexible and solid.", sayShort: "…b5 — expand, harry.", highlights: [H('b5')] }, { atMove: 17, say: "…a5 — you grab more queenside space, the Lion's wing play; Black presses on that side with a comfortable game.", sayShort: "…a5 — grab more space.", highlights: [H('a5')] }] },
  'philidor-defence::0::a3@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…b5 — you expand on the queenside, the thematic Lion plan; Black gains space and a flexible position.", sayShort: "…b5 — queenside expansion.", highlights: [H('b5')] }, { atMove: 19, say: "…Qc7 — the queen develops, connecting the rooks and eyeing the e-file; Black's harmonious Lion setup holds the balance.", sayShort: "…Qc7 — connect, hold.", highlights: [H('c7')] }] },
  'philidor-defence::0::d5@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…Nb6 — the knight reroutes after White closes the centre, eyeing c4 and d5; Black plays against the fixed pawn structure.", sayShort: "…Nb6 — reroute, eye c4.", highlights: [H('b6')] }, { atMove: 17, say: "…cxd5 — you open the c-file for your rook; with the central tension resolved, Black has a comfortable, active game.", sayShort: "…cxd5 — open the c-file.", highlights: [H('d5')] }] },
  'philidor-defence::0::Be3@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…b5 — you expand on the queenside, the thematic Lion plan; Black gains space and a flexible position.", sayShort: "…b5 — queenside expansion.", highlights: [H('b5')] }, { atMove: 19, say: "…Ne5 — the knight leaps to the dominant central post, hitting the d3-bishop; Black's active pieces equalise sharply.", sayShort: "…Ne5 — central post, hit d3.", arrows: [A('e5', 'd3')], highlights: [H('e5'), H('d3', ATK)] }] },
  'philidor-defence::0::b3@16': { ...PH_HANHAM, beats: [{ atMove: 17, say: "…exd4 — you release the tension, freeing your game; Black equalises with sound, active pieces.", sayShort: "…exd4 — release, free up.", highlights: [H('d4')] }, { atMove: 19, say: "…Ne5 — the knight jumps to the strong central post; Black's pieces spring to life and the position is comfortable.", sayShort: "…Ne5 — strong central post.", highlights: [H('e5')] }] },
  'philidor-defence::1::a4@12': { ...PH_HANHAM, beats: [
    { atMove: 12, say: "a4 — White expands on the queenside. Meet it with …a5 to fix the pawns, or …c6 and …b5 ideas. Then turn to the centre: …exd4 or …d5 is the freeing break the Hanham lives for. Hold firm and choose your moment.", sayShort: "a4 — fix with …a5, free with …d5.", highlights: [H('d5', KEY), H('a5', SOFT)] },
    { atMove: 13, say: "…c6 braces the d5-square and the Hanham shell; …Re8 and …Bf8 complete the regroup behind your solid pawns.", sayShort: "…c6 — brace, complete the shell.", highlights: [H('d5', SOFT)] },
    { atMove: 17, say: "…exd4 releases the tension at the right moment; after the recapture your knight jumps to c5, eyeing e4 and White's bishop, and the cramp dissolves into a comfortable game.", sayShort: "…exd4 — release, knight to c5.", highlights: [H('c5', KEY)] },
  ] },
  'philidor-defence::1::a4@10': { ...PH_HANHAM, beats: [{ atMove: 11, say: "…O-O — you castle into the solid Lion setup; Black's flexible, cramped-but-sound position is ready to unfurl.", sayShort: "…O-O — solid Lion.", highlights: [H('g8')] }, { atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard regrouping; Black prepares …Bf8 and central flexibility.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }] },
  'philidor-defence::1::g4@8': { ...PH_HANHAM, beats: [{ atMove: 9, say: "…Nxg4 — you snatch the loose g-pawn, exploiting White's wild thrust; Black banks material and stays solid.", sayShort: "…Nxg4 — snatch the pawn.", highlights: [H('g4')] }, { atMove: 11, say: "…Ngf6 — the knight retreats to safety, consolidating the extra pawn; Black's solid Lion structure holds the gain.", sayShort: "…Ngf6 — retreat, consolidate.", highlights: [H('f6')] }] },
  'philidor-defence::1::h3@12': { ...PH_HANHAM, beats: [{ atMove: 13, say: "…exd4 — you release the tension, trading toward a comfortable, solid game; Black equalises in the Lion.", sayShort: "…exd4 — release, equalise.", highlights: [H('d4')] }, { atMove: 17, say: "…Qb6 — the queen offers a trade, simplifying favourably; Black's sound structure holds the balance in the ending.", sayShort: "…Qb6 — offer the trade.", highlights: [H('b6')] }] },
  'philidor-defence::1::Rg1@8': { ...PH_HANHAM, beats: [{ atMove: 9, say: "…d5 — you strike in the centre immediately, exploiting White's slow Rg1; Black opens the position to free the pieces.", sayShort: "…d5 — strike at once.", highlights: [H('d5')] }, { atMove: 13, say: "…Bd6 — the bishop develops actively, eyeing the kingside; Black's pieces spring out and the position equalises.", sayShort: "…Bd6 — develop actively.", highlights: [H('d6')] }] },
  'philidor-defence::1::g3@8': { ...PH_HANHAM, beats: [{ atMove: 9, say: "…c6 — you brace the centre, the flexible Lion move, preparing …b5 or …d5; Black's setup is solid and ready.", sayShort: "…c6 — brace, prepare.", highlights: [H('c6')] }, { atMove: 15, say: "…Qb6 — the queen probes the queenside and the d4-pawn; Black generates active counterplay against White's broad centre.", sayShort: "…Qb6 — probe d4.", highlights: [H('b6')] }] },
  'philidor-defence::1::Be2@8': { ...PH_HANHAM, beats: [{ atMove: 9, say: "…c6 — you brace the centre, the flexible Lion move, preparing …b5 or …d5; Black's setup is solid and ready.", sayShort: "…c6 — brace, prepare.", highlights: [H('c6')] }, { atMove: 13, say: "…O-O — you castle into the solid Lion; Black's flexible position is ready to break with …d5 or expand on the wing.", sayShort: "…O-O — solid, ready to break.", highlights: [H('g8')] }] },
  'philidor-defence::1::dxe5@6': { ...PH_HANHAM, beats: [
    { atMove: 6, say: "dxe5 — White grabs in the centre, baiting the old trap. You're ready: …Nxe4! snatches the pawn straight back instead of recapturing meekly.", sayShort: "dxe5 — answer …Nxe4.", arrows: [A('f6', 'e4')], highlights: [H('e4', KEY)] },
    { atMove: 9, say: "White lunges Qd5, forking your e4-knight and threatening mate on f7 — but …Nc5! skips clear with tempo, attacking the queen. The fork evaporates and material is level.", sayShort: "…Nc5 — hit the queen, fork gone.", arrows: [A('c5', 'd5')], highlights: [H('d5', ATK)] },
    { atMove: 11, say: "Bg5 pins, but …Qd7 calmly steps out, unpinning and developing. The trap is fully defused and the game is balanced — pure accuracy rewarded.", sayShort: "…Qd7 — unpin, trap defused.", highlights: [H('d7', SOFT)] },
  ] },
  'philidor-defence::1::Rd1@14': { ...PH_HANHAM, beats: [{ atMove: 15, say: "…exd4 — you release the tension, freeing your pieces; Black equalises with a sound structure.", sayShort: "…exd4 — release, free up.", highlights: [H('d4')] }, { atMove: 19, say: "…Nb6 — the knight reroutes toward c4 and d5, pressing White's centre; Black's active pieces hold the balance.", sayShort: "…Nb6 — reroute, press.", highlights: [H('b6')] }] },
  'philidor-defence::2::Bd3@8': { ...PH_OPEN, beats: [
    { atMove: 8, say: "Bd3 aims the bishop at your kingside on the b1-h7 diagonal — sidestep its glare with a fianchetto. …g6 prepares …Bg7, blunting the bishop and guarding the dark squares.", sayShort: "Bd3 — answer …g6.", highlights: [H('g6', KEY)] },
    { atMove: 9, say: "…g6 clears the way for …Bg7 to neutralise the d3-bishop and command the long diagonal. Fianchetto, castle, and your Improved Hanham shell is rock-solid and weakness-free.", sayShort: "…g6 — then …Bg7, solid shell.", arrows: [A('f8', 'g7')], highlights: [H('g7', KEY)] },
  ] },
  'philidor-defence::2::Bg5@8': { ...PH_OPEN, beats: [{ atMove: 9, say: "…d5 — you strike in the centre, the freeing Exchange break; Black opens the position and equalises actively.", sayShort: "…d5 — the freeing break.", highlights: [H('d5')] }, { atMove: 15, say: "…Be7 — the bishop develops, breaking the Bg5 pin; Black completes a harmonious, equal setup.", sayShort: "…Be7 — break the pin.", highlights: [H('e7')] }] },
  'philidor-defence::2::Bc4@8': { ...PH_OPEN, beats: [{ atMove: 9, say: "…Nxe4 — you snap the centre pawn, exploiting the loose Bc4; Black grabs material and stays solid in the complications.", sayShort: "…Nxe4 — snap the pawn.", highlights: [H('e4')] }, { atMove: 17, say: "…Be7 — the bishop develops, consolidating; Black's structure holds the gain with active pieces.", sayShort: "…Be7 — consolidate.", highlights: [H('e7')] }] },
  'philidor-defence::2::Be3@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard Exchange regrouping; Black prepares …Bf8 and a solid, flexible setup.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 21, say: "…Ne5 — the knight leaps to the strong central post; Black's harmonious pieces hold full equality.", sayShort: "…Ne5 — strong central post.", highlights: [H('e5')] }] },
  'philidor-defence::2::Nf5@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard Exchange regrouping; Black prepares …Bf8 and a flexible setup.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 17, say: "…Qxe7 — you recapture, the queen well-placed on the e-file; with the trade, Black's solid structure equalises easily.", sayShort: "…Qxe7 — recapture, equalise.", highlights: [H('e7')] }] },
  'philidor-defence::2::h3@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard Exchange regrouping; Black prepares …Bf8 and a flexible setup.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 19, say: "…Nc5 — the knight jumps to an active post, eyeing e4 and d3; Black's pieces are well-coordinated and equal.", sayShort: "…Nc5 — active post.", highlights: [H('c5')] }] },
  'philidor-defence::2::Bg5@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Nxe4 — you snap the centre pawn through the trades; Black simplifies into a comfortable, equal position.", sayShort: "…Nxe4 — snap, simplify.", highlights: [H('e4')] }, { atMove: 21, say: "…Qd5 — the queen centralises, offering a trade; Black's solid structure holds the balance in the simplified position.", sayShort: "…Qd5 — centralise.", highlights: [H('d5')] }] },
  'philidor-defence::2::Re1@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard Exchange regrouping; Black prepares …Bf8 and a flexible setup.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 21, say: "…Ne5 — the knight leaps to the strong central post; Black's harmonious pieces hold full equality.", sayShort: "…Ne5 — strong central post.", highlights: [H('e5')] }] },
  'philidor-defence::2::g3@10': { ...PH_OPEN, beats: [{ atMove: 11, say: "…O-O — you castle into the solid Exchange structure; Black's harmonious setup is fully equal against the fianchetto.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 15, say: "…Nc6 — the knight develops, pressuring d4 and the centre; Black's active pieces hold the balance.", sayShort: "…Nc6 — pressure d4.", highlights: [H('c6')] }] },
  'philidor-defence::2::Bf4@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Re8 — the rook lifts to the e-file, the standard Exchange regrouping; Black prepares …Bf8 and a flexible setup.", sayShort: "…Re8 — lift, regroup.", highlights: [H('e8')] }, { atMove: 21, say: "…d5 — you strike in the centre, the freeing break; Black opens the position and equalises with active pieces.", sayShort: "…d5 — the freeing break.", highlights: [H('d5')] }] },
  'philidor-defence::3::Bd3@8': { ...PH_OPEN, beats: [
    { atMove: 8, say: "Bd3 aims the bishop at your kingside on the b1-h7 diagonal — sidestep its glare with a fianchetto. …g6 prepares …Bg7, blunting the bishop and guarding the dark squares.", sayShort: "Bd3 — answer …g6.", highlights: [H('g6', KEY)] },
    { atMove: 9, say: "…g6 clears the way for …Bg7 to neutralise the d3-bishop and command the long diagonal. Fianchetto, castle, and your Improved Hanham shell is rock-solid and weakness-free.", sayShort: "…g6 — then …Bg7, solid shell.", arrows: [A('f8', 'g7')], highlights: [H('g7', KEY)] },
  ] },
  'philidor-defence::3::Bg5@8': { ...PH_OPEN, beats: [{ atMove: 9, say: "…d5 — you strike in the centre, the freeing Exchange break; Black opens the position and equalises actively.", sayShort: "…d5 — the freeing break.", highlights: [H('d5')] }, { atMove: 15, say: "…Be7 — the bishop develops, breaking the Bg5 pin; Black completes a harmonious, equal setup.", sayShort: "…Be7 — break the pin.", highlights: [H('e7')] }] },
  'philidor-defence::3::Bc4@8': { ...PH_OPEN, beats: [{ atMove: 9, say: "…Nxe4 — you snap the centre pawn, exploiting the loose Bc4; Black grabs material and stays solid in the complications.", sayShort: "…Nxe4 — snap the pawn.", highlights: [H('e4')] }, { atMove: 17, say: "…Be7 — the bishop develops, consolidating; Black's structure holds the gain with active pieces.", sayShort: "…Be7 — consolidate.", highlights: [H('e7')] }] },
  'philidor-defence::3::f4@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Nbd7 — the knight develops toward c5 and e5, the flexible Exchange square; Black completes a solid, harmonious setup.", sayShort: "…Nbd7 — develop, flexible.", highlights: [H('d7')] }, { atMove: 21, say: "…Nc5 — the knight jumps to an active post, eyeing e4 and d3; Black's pieces are well-coordinated and equal.", sayShort: "…Nc5 — active post.", highlights: [H('c5')] }] },
  'philidor-defence::3::Be3@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Bf8 — the bishop reroutes to f8, the solid Exchange defensive post; Black's flexible structure holds the balance.", sayShort: "…Bf8 — reroute to f8.", highlights: [H('f8')] }, { atMove: 17, say: "…c6 — you brace the centre, the standard Exchange move; Black's pieces are harmonious and equal.", sayShort: "…c6 — brace the centre.", highlights: [H('c6')] }] },
  'philidor-defence::3::Re1@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Bf8 — the bishop reroutes to f8, the solid Exchange defensive post; Black's flexible structure holds the balance.", sayShort: "…Bf8 — reroute to f8.", highlights: [H('f8')] }, { atMove: 21, say: "…c5 — you gain queenside space and a foothold; Black's active, solid position holds full equality.", sayShort: "…c5 — gain space.", highlights: [H('c5')] }] },
  'philidor-defence::3::h3@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…c6 — you brace the centre, the standard Exchange move; Black's pieces are harmonious and equal.", sayShort: "…c6 — brace the centre.", highlights: [H('c6')] }, { atMove: 19, say: "…b5 — you expand on the queenside, gaining space; Black's solid Exchange setup presses on the wing.", sayShort: "…b5 — queenside expansion.", highlights: [H('b5')] }] },
  'philidor-defence::3::Bg5@14': { ...PH_OPEN, beats: [{ atMove: 15, say: "…Nxe4 — you snap the centre pawn through the trades; Black simplifies into a comfortable, equal position.", sayShort: "…Nxe4 — snap, simplify.", highlights: [H('e4')] }, { atMove: 21, say: "…Qf6 — the queen develops actively, eyeing the centre and kingside; Black's solid position holds the balance.", sayShort: "…Qf6 — develop actively.", highlights: [H('f6')] }] },
  'philidor-defence::3::g3@10': { ...PH_OPEN, beats: [{ atMove: 11, say: "…O-O — you castle into the solid Exchange structure; Black's harmonious setup is fully equal against the fianchetto.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }, { atMove: 15, say: "…Nc6 — the knight develops, pressuring d4 and the centre; Black's active pieces hold the balance.", sayShort: "…Nc6 — pressure d4.", highlights: [H('c6')] }] },
  'philidor-defence::3::Bf4@10': { ...PH_OPEN, beats: [{ atMove: 11, say: "…Nc6 — the knight develops, pressuring d4 and challenging White's centre; Black's pieces coordinate for equality.", sayShort: "…Nc6 — pressure d4.", highlights: [H('c6')] }, { atMove: 13, say: "…O-O — you castle, completing development; with White committed to opposite-side play, Black has comfortable counterchances.", sayShort: "…O-O — castle, counterchances.", highlights: [H('g8')] }] },
  'philidor-defence::4::Nc3@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Nxe5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Ng3@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Bg5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Nc5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Ng5@8': PH_COUNTERGAMBIT,
  'philidor-defence::4::dxe5@10': PH_COUNTERGAMBIT,
  'philidor-defence::4::Qxd4@12': PH_COUNTERGAMBIT,
  'philidor-defence::4::dxe5@6': { ...PH_COUNTERGAMBIT, beats: [{ atMove: 7, say: "…fxe4 — you grab the centre pawn, entering the sharp Philidor Countergambit; double-edged play where both kings come under fire.", sayShort: "…fxe4 — sharp countergambit.", highlights: [H('e4')] }, { atMove: 9, say: "…d5 — you build a broad pawn front, blunting White's pieces; the Countergambit is wild but holds for the bold.", sayShort: "…d5 — broad pawn front.", highlights: [H('d5')] }] },
  'philidor-defence::4::Ne5@12': PH_COUNTERGAMBIT,
  'philidor-defence::5::c3@12': { ...PH_D3_QUIET, beats: [{ atMove: 13, say: "…h6 — a useful prophylactic move in the slow setup, taking g5 from White's pieces; Black builds patiently behind the solid centre.", sayShort: "…h6 — prophylaxis.", highlights: [H('h6')] }, { atMove: 17, say: "…Be6 — the bishop develops to a fine square, eyeing the centre; Black's harmonious King's-Indian-style setup is comfortable.", sayShort: "…Be6 — develop, eye centre.", highlights: [H('e6')] }] },
  'philidor-defence::5::Nc3@12': { ...PH_D3_QUIET, beats: [{ atMove: 15, say: "…Re8 — the rook seizes the e-file, supporting the centre; Black's solid setup is ready to break with …f5 or …d5.", sayShort: "…Re8 — seize the e-file.", highlights: [H('e8')] }, { atMove: 17, say: "…Be6 — the bishop develops to a fine square, eyeing the centre; Black's harmonious setup is comfortable.", sayShort: "…Be6 — develop, eye centre.", highlights: [H('e6')] }] },
  'philidor-defence::5::d4@4': { ...PH_OPEN, beats: [
    { atMove: 4, say: "d4 — White challenges your Philidor centre at once. Take it: …exd4 trades into the elastic Improved Hanham, where you build a compact, weakness-free shell.", sayShort: "d4 — answer …exd4.", arrows: [A('e5', 'd4')], highlights: [H('d4', KEY)] },
    { atMove: 7, say: "…Nf6 develops with a poke at e4, gaining a tempo to complete your setup. …Be7 and …O-O come next behind the solid shell.", sayShort: "…Nf6 — develop, hit e4.", arrows: [A('f6', 'e4')], highlights: [H('e4', ATK)] },
    { atMove: 9, say: "…Be7 and castling finish the compact Hanham shell — no weaknesses, every piece placed. Reroute via …Nf5 or break with …d5 when White over-commits; the position is sound and fully playable.", sayShort: "…Be7 — finish the shell, eye …d5.", highlights: [H('d5', SOFT)] },
  ] },
  'philidor-defence::5::h3@12': { ...PH_D3_QUIET, beats: [{ atMove: 15, say: "…Nh7 — the knight reroutes to prepare the …f5 break, the thematic plan in this structure; Black goes for kingside play.", sayShort: "…Nh7 — prepare …f5.", highlights: [H('h7')] }, { atMove: 17, say: "…f5 — you strike on the kingside, the King's-Indian-style break; Black seizes the initiative on that wing.", sayShort: "…f5 — the kingside break.", highlights: [H('f5')] }] },
  'philidor-defence::5::Re1@12': { ...PH_D3_QUIET, beats: [{ atMove: 13, say: "…a5 — you grab queenside space, gaining a foothold; Black's flexible setup presses on that wing.", sayShort: "…a5 — grab space.", highlights: [H('a5')] }, { atMove: 17, say: "…Be6 — the bishop develops to a fine square, eyeing the centre; Black's harmonious setup is comfortable.", sayShort: "…Be6 — develop, eye centre.", highlights: [H('e6')] }] },
  'philidor-defence::5::Bg5@12': { ...PH_D3_QUIET, beats: [{ atMove: 13, say: "…h6 — you question the bishop, gaining the bishop pair or driving it back; Black plays solidly in the quiet setup.", sayShort: "…h6 — question the bishop.", arrows: [A('h6', 'g5')], highlights: [H('h6'), H('g5', ATK)] }, { atMove: 15, say: "…Be6 — the bishop develops to a fine square, eyeing the centre; Black's harmonious setup is comfortable.", sayShort: "…Be6 — develop, eye centre.", highlights: [H('e6')] }] },
  'philidor-defence::5::Be3@12': { ...PH_D3_QUIET, beats: [{ atMove: 13, say: "…d5 — you strike in the centre, the freeing break; Black opens the position and equalises actively.", sayShort: "…d5 — the freeing break.", highlights: [H('d5')] }, { atMove: 17, say: "…Nb6 — the knight reroutes to a solid square, eyeing c4 and a4; Black's pieces coordinate for full equality.", sayShort: "…Nb6 — reroute, coordinate.", highlights: [H('b6')] }] },
  'philidor-defence::5::Nc3@10': { ...PH_D3_QUIET, beats: [{ atMove: 11, say: "…c5 — you grab queenside space, staking out a foothold; Black's flexible setup presses on that wing.", sayShort: "…c5 — grab space.", highlights: [H('c5')] }, { atMove: 13, say: "…Nc6 — the knight develops, pressuring the centre; Black's harmonious pieces hold the balance.", sayShort: "…Nc6 — develop, press.", highlights: [H('c6')] }] },
  'philidor-defence::5::Nbd2@10': { ...PH_D3_QUIET, beats: [{ atMove: 11, say: "…c5 — you grab queenside space, staking out a foothold; Black's flexible setup presses on that wing.", sayShort: "…c5 — grab space.", highlights: [H('c5')] }, { atMove: 17, say: "…Be6 — the bishop develops to a fine square, eyeing the centre; Black's harmonious setup is comfortable.", sayShort: "…Be6 — develop, eye centre.", highlights: [H('e6')] }] },
  'philidor-defence::5::b3@12': { ...PH_D3_QUIET, beats: [{ atMove: 13, say: "…a5 — you grab queenside space, gaining a foothold; Black's flexible setup presses on that wing.", sayShort: "…a5 — grab space.", highlights: [H('a5')] }, { atMove: 19, say: "…Nd4 — the knight leaps to the dominant central outpost, hitting f3; Black's active pieces equalise comfortably.", sayShort: "…Nd4 — central outpost, hit f3.", arrows: [A('d4', 'f3')], highlights: [H('d4'), H('f3', ATK)] }] },

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
  'schliemann-defence::1::Ng1@10': { ...SCH_SHARP, beats: [{ atMove: 11, say: "…e3 — you ram the pawn deeper, jamming White's development and cramping his king; the Jaenisch's initiative is the compensation for the pawn.", sayShort: "…e3 — ram the wedge.", highlights: [H('e3')] }, { atMove: 19, say: "…Ne5 — the knight leaps to a dominant central post after the trades, hitting White's loose pieces; Black's activity holds the balance.", sayShort: "…Ne5 — dominant post.", highlights: [H('e5')] }] },
  'schliemann-defence::1::Nc3@6': SCH_NC3,
  'schliemann-defence::1::d3@10': { ...SCH_SHARP, beats: [{ atMove: 11, say: "…e3 — you ram the pawn deep into White's position, jamming his development; the Jaenisch Gambit's initiative answers the pawn.", sayShort: "…e3 — ram the wedge.", highlights: [H('e3')] }, { atMove: 21, say: "…Bd6 — the bishop develops actively, eyeing the kingside; with the bishop pair from the doubled c-pawns, Black's pieces hold the balance.", sayShort: "…Bd6 — develop actively.", highlights: [H('d6')] }] },
  'schliemann-defence::1::d3@6': SCH_D3,
  'schliemann-defence::1::Bxc6@6': SCH_BXC6,
  'schliemann-defence::1::d4@6': SCH_D4,
  'schliemann-defence::1::Bxc6@8': { ...SCH_SHARP, beats: [{ atMove: 9, say: "…dxc6 — you recapture, opening the d-file and gaining the bishop pair; Black's active pieces and the …e4 wedge compensate the structure.", sayShort: "…dxc6 — open the d-file.", highlights: [H('c6')] }, { atMove: 13, say: "…e2 — the passed pawn storms to the brink of promotion, jamming White's king in the centre; the Jaenisch's initiative is in full flow.", sayShort: "…e2 — storm to promotion.", highlights: [H('e2')] }] },
  'schliemann-defence::2::Bc4@4': SCH_ITALIAN,
  'schliemann-defence::2::d4@4': SCH_SCOTCH,
  'schliemann-defence::2::Nc3@4': SCH_FOUR_KNIGHTS,
  'schliemann-defence::2::Nc3@6': SCH_NC3,
  'schliemann-defence::2::Bxc6@6': SCH_BXC6,
  'schliemann-defence::2::d4@6': SCH_D4,

  // -- Danish Gambit --
  'danish-gambit::0::Nf6@9': { ...DAN_MAIN, beats: [
    { atMove: 9, say: "Nf6 develops, but for a pawn you're miles ahead in firepower — two raking bishops and a lead in development. Pour it in: Nf3 and Bg5 to pin while the c4-bishop glares at f7.", sayShort: "Nf6 — develop, Bg5 to pin.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 14, say: "e5! the pawn punches forward, kicking the f6-knight to the rim and clamping the centre while your bishops bear down on Black's king.", sayShort: "e5 — kick the knight, clamp.", arrows: [A('e5', 'f6')], highlights: [H('f6', ATK)] },
    { atMove: 16, say: "Bxe7 trades off into a pleasant pull — you've recouped material and kept the freer game, the bishop pair's pressure and faster development worth every bit of the gambit pawn.", sayShort: "Bxe7 — keep the freer game.", highlights: [H('f7', SOFT)] },
  ] },
  'danish-gambit::0::d6@9': { ...DAN_MAIN, beats: [
    { atMove: 9, say: "d6 shores up the centre and clings to the extra pawn — the Danish is a true gambit, so play for activity, not the pawn count. Aim the knight at the d5 outpost.", sayShort: "d6 — play for activity, eye d5.", highlights: [H('d5', KEY)] },
    { atMove: 14, say: "Nd5 plants the knight on a dominant central outpost, eyeing c7 and f6 and daring Black to spend tempi dislodging it. Your pieces stay forward and active for the pawn.", sayShort: "Nd5 — dominant central outpost.", arrows: [A('d5', 'c7')], highlights: [H('d5', KEY)] },
    { atMove: 16, say: "Nf3 finishes developing; you're fully mobilised with both bishops raking the board while Black still untangles. The pawn is gone, but the initiative and piece activity are real compensation — keep pressing.", sayShort: "Nf3 — fully mobilised, keep pressing.", highlights: [H('d5', SOFT)] },
  ] },
  'danish-gambit::0::Bc5@9': { ...DAN_MAIN, beats: [
    { atMove: 9, say: "Bc5 develops actively — but it walks straight into a thunderbolt. Bxf7+! the bishop crashes through the king's door.", sayShort: "Bc5 — answer Bxf7+!", arrows: [A('c4', 'f7')], highlights: [H('f7', ATK)] },
    { atMove: 10, say: "Bxf7+ — the sacrifice rips the king out. After Kxf7 the queen leaps to h5 with check, forking the exposed king and the loose c5-bishop in one stroke.", sayShort: "Bxf7+ — rip open the king.", arrows: [A('f7', 'e8')], highlights: [H('e8', ATK)] },
    { atMove: 12, say: "Qh5+ — the point. The king must shuffle to f8, and now Qxc5+ snaps off the bishop with check. You regain the material and shred Black's castling rights.", sayShort: "Qh5+ — then Qxc5+ wins it back.", arrows: [A('h5', 'c5')], highlights: [H('c5', ATK)] },
    { atMove: 14, say: "Qxc5+ scoops the bishop with check — you've recouped the material and left Black's king marooned on f8 with no shelter. The gambit has paid in full.", sayShort: "Qxc5+ — material back, king bare.", highlights: [H('c5', KEY)] },
  ] },
  'danish-gambit::0::Ne5@9': { ...DAN_MAIN, beats: [{ atMove: 14, say: "Nf3 — you challenge the centralised e5-knight while developing; the Danish's two bishops and lead in development are the compensation for the pawns.", sayShort: "Nf3 — challenge the knight.", highlights: [H('f3')] }, { atMove: 18, say: "e5 — the centre surges, gaining space and opening lines for your raking bishops; the Danish attack rolls toward Black's king.", sayShort: "e5 — surge, open lines.", highlights: [H('e5')] }, { atMove: 22, say: "Nge4 — the knight joins the attack on a dominant central post, eyeing d6 and f6; White's initiative is full value for the pawns.", sayShort: "Nge4 — join the attack.", highlights: [H('e4')] }] },
  'danish-gambit::0::Nf6@13': { ...DAN_BB4, beats: [
    { atMove: 13, say: "Nf6 develops, but you're flying — castled, both bishops raking, the c4-bishop already raking f7. Nd5 and Bg5 will begin the kingside assault.", sayShort: "Nf6 — start the assault, Nd5.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 16, say: "Bg5 pins the f6-knight and prepares Bxf6 to smash Black's kingside; with the knight on d5 and the queen swinging to h6, your attack crashes through for the pawn.", sayShort: "Bg5 — pin, then Bxf6 and Qh6.", arrows: [A('g5', 'f6')], highlights: [H('f6', ATK)] },
  ] },
  'danish-gambit::0::Bg4@13': { ...DAN_BB4, beats: [
    { atMove: 13, say: "Bg4 pins your f3-knight — no bother. Your bishops blaze, the c4-bishop raking f7, and the queen is about to join with crushing effect.", sayShort: "Bg4 — ignore it, attack.", arrows: [A('c4', 'f7')], highlights: [H('f7', KEY)] },
    { atMove: 14, say: "Qb3 — the queen storms in, raking down the b-file at b7 while adding a second attacker on f7 behind the c4-bishop. Black can't cover both; the gambit's initiative breaks through.", sayShort: "Qb3 — hit b7 and pile on f7.", arrows: [A('b3', 'b7')], highlights: [H('b7', ATK)] },
  ] },
  'danish-gambit::0::Bg4@15': { ...DAN_BB4, beats: [
    { atMove: 15, say: "Bg4 pins the knight, but bxc3 handed you a half-open b-file at b7 and a towering centre. The pin is a trifle against your roaring lines.", sayShort: "Bg4 — ignore it, hit b7.", arrows: [A('c4', 'f7')], highlights: [H('b7', KEY), H('d4', SOFT)] },
    { atMove: 16, say: "Qb3 — the queen swings to the b-file, hammering b7 and joining the bishop's pressure on f7. The open lines reach Black's king long before the pawn count ever matters.", sayShort: "Qb3 — hammer b7 and f7.", arrows: [A('b3', 'b7')], highlights: [H('b7', ATK)] },
  ] },
  'danish-gambit::0::Be6@15': { ...DAN_BB4, beats: [
    { atMove: 15, say: "Be6 challenges your prized bishop — don't trade tamely on his terms; take it on yours. Bxe6 forces …fxe6 and wrecks Black's kingside structure.", sayShort: "Be6 — answer Bxe6.", highlights: [H('e6', KEY)] },
    { atMove: 17, say: "…fxe6 leaves Black's kingside pawns shattered and the f-file half-open at his king. Pile your rook onto f-file, hit b7 with the queen, and the gambit's initiative rolls on.", sayShort: "…fxe6 — shattered king, open f-file.", highlights: [H('e6', SOFT), H('b7', SOFT)] },
  ] },
  'danish-gambit::0::h6@17': { ...DAN_BB4, beats: [
    { atMove: 17, say: "h6 questions your g5-bishop — answer with purpose. Keep the pin alive with Bh4, refusing to release the pressure on f6.", sayShort: "h6 — keep the pin, Bh4.", arrows: [A('g5', 'f6')], highlights: [H('f6', KEY)] },
    { atMove: 18, say: "Bh4 maintains the pin on the f6-knight; with the c4-bishop raking f7, the open b-file and your broad centre, Black's …h6 only made a target. Keep the pieces pouring in.", sayShort: "Bh4 — hold the pin, keep attacking.", arrows: [A('h4', 'f6')], highlights: [H('f6', ATK)] },
  ] },
  'danish-gambit::0::Be6@13': { ...DAN_BB4, beats: [
    { atMove: 13, say: "Be6 offers to swap your attacking bishop — but you've a sharper idea than trading. Nd5! leaps to the central outpost with tempo.", sayShort: "Be6 — answer Nd5!", highlights: [H('e6', KEY)] },
    { atMove: 14, say: "Nd5 lands on the dominant outpost, hitting the b4-bishop and c7. When Black deals with it, Ng5 and Qxf7 crash into the king — the attack is worth far more than the pawn.", sayShort: "Nd5 — outpost, then Ng5 and Qxf7.", arrows: [A('d5', 'b4')], highlights: [H('b4', ATK)] },
  ] },
  // -- Stafford Gambit --
  'stafford-gambit::0::Nc3@8': { ...STAF_ACCEPTED, beats: [{ atMove: 11, say: "…Qd4 — the queen leaps to the centre, hitting e4 and f2 and eyeing White's king; the Stafford's pressure mounts for the pawn.", sayShort: "…Qd4 — centralise, hit f2.", highlights: [H('d4'), H('f2', ATK)] }, { atMove: 17, say: "…Qh4 — the queen swings to the kingside, probing f2 and h2; Black keeps the initiative and the attacking chances for the pawn.", sayShort: "…Qh4 — swing, probe f2.", highlights: [H('h4'), H('f2', ATK)] }] },
  'stafford-gambit::0::Be2@10': { ...STAF_ACCEPTED, beats: [{ atMove: 17, say: "…O-O — you castle, completing development; the Stafford's pawn buys active pieces and pressure on White's position.", sayShort: "…O-O — develop, press.", highlights: [H('g8')] }, { atMove: 19, say: "…Re8 — the rook seizes the open e-file, the Stafford's compensation; Black's active pieces answer the pawn.", sayShort: "…Re8 — seize the e-file.", highlights: [H('e8')] }] },
  'stafford-gambit::0::e5@8': { ...STAF_E5, beats: [{ atMove: 9, say: "…Ne4 — the knight leaps to the strong central post, blockading White's e5-pawn; the Stafford gives Black active piece play for the pawn.", sayShort: "…Ne4 — central blockade.", highlights: [H('e4')] }, { atMove: 15, say: "…Bf5 — the bishop develops actively, reinforcing the e4-knight and eyeing White's queenside; Black's initiative answers the pawn.", sayShort: "…Bf5 — reinforce the knight.", highlights: [H('f5')] }] },
  'stafford-gambit::0::Nf3@6': { ...STAF_DECLINED, beats: [{ atMove: 7, say: "…Nxe4 — you snatch the centre pawn back, refusing to fall behind; the Stafford keeps Black active even when White declines the gambit.", sayShort: "…Nxe4 — snatch it back.", highlights: [H('e4')] }, { atMove: 15, say: "…Qf6 — the queen develops actively, eyeing f2 and the long diagonal; Black generates pressure to offset the pawn.", sayShort: "…Qf6 — develop, eye f2.", highlights: [H('f6'), H('f2', SOFT)] }] },
  'stafford-gambit::0::h3@10': { ...STAF_ACCEPTED, beats: [{ atMove: 15, say: "…Be6 — the bishop develops to a fine post, eyeing White's queenside; Black's active pieces press for the gambit pawn.", sayShort: "…Be6 — develop, press.", highlights: [H('e6')] }, { atMove: 17, say: "…Bd4 — the bishop seizes the dominant central square, cramping White; the Stafford's piece activity is full compensation.", sayShort: "…Bd4 — seize the centre.", highlights: [H('d4')] }] },
  'stafford-gambit::0::Be3@10': { ...STAF_ACCEPTED, beats: [{ atMove: 17, say: "…Ng4 — the knight jumps to attack the e3-bishop and f2, the Stafford's aggressive idea; Black keeps the initiative for the pawn.", sayShort: "…Ng4 — attack e3 and f2.", arrows: [A('g4', 'e3')], highlights: [H('g4'), H('e3', ATK)] }, { atMove: 21, say: "…Qd4 — the queen centralises, hitting f2 and dominating; Black's active pieces press White's position.", sayShort: "…Qd4 — centralise, hit f2.", highlights: [H('d4'), H('f2', ATK)] }] },
  'stafford-gambit::0::d4@6': { ...STAF_DECLINED, beats: [{ atMove: 15, say: "…Qe7 — the queen develops, connecting toward the centre and eyeing e4; Black builds pressure for the gambit pawn.", sayShort: "…Qe7 — develop, eye e4.", highlights: [H('e7')] }, { atMove: 17, say: "…Bb7 — the bishop fianchettoes, raking the long diagonal toward e4 and g2; the Stafford's pieces converge for activity.", sayShort: "…Bb7 — rake the long diagonal.", arrows: [A('b7', 'e4')], highlights: [H('b7')] }] },
  'stafford-gambit::0::Bc4@8': { ...STAF_ACCEPTED, beats: [{ atMove: 9, say: "…c5 — you grab queenside space and a foothold, fixing White's structure; Black plays actively for the pawn in the Stafford.", sayShort: "…c5 — grab space.", highlights: [H('c5')] }, { atMove: 17, say: "…Be7 — the bishop develops, preparing to castle and contest the centre; Black's active pieces answer the gambit pawn.", sayShort: "…Be7 — develop, prepare O-O.", highlights: [H('e7')] }] },
  'stafford-gambit::0::Nxf7@6': { ...STAF_CRITICAL, beats: [{ atMove: 17, say: "…Bd6 — you develop with menace toward h2, the Stafford's attacking spirit; down material, Black throws everything at White's king.", sayShort: "…Bd6 — menace h2.", arrows: [A('d6', 'h2')], highlights: [H('d6')] }, { atMove: 21, say: "…Nxf2 — a desperado shot at the king and rook; the Stafford's traps are Black's practical hope in the melee.", sayShort: "…Nxf2 — desperado shot.", highlights: [H('f2')] }] },
  'stafford-gambit::0::f3@8': { ...STAF_ACCEPTED, beats: [{ atMove: 9, say: "…Be6 — the bishop develops actively, eyeing the a2-g8 diagonal and White's queenside; Black plays for activity in the Stafford.", sayShort: "…Be6 — develop actively.", highlights: [H('e6')] }, { atMove: 21, say: "…Ne5 — the knight leaps to a dominant central post, eyeing d3 and f3; Black's active pieces compensate the pawn.", sayShort: "…Ne5 — dominant post.", highlights: [H('e5')] }] },
  'stafford-gambit::1::d3@8': { ...STAF_ACCEPTED, beats: [{ atMove: 17, say: "…O-O — you castle, completing development; the Stafford's pawn buys active pieces and pressure on White's position.", sayShort: "…O-O — develop, press.", highlights: [H('g8')] }, { atMove: 19, say: "…Re8 — the rook seizes the open e-file, the Stafford's compensation; Black's active pieces answer the pawn.", sayShort: "…Re8 — seize the e-file.", highlights: [H('e8')] }] },
  'stafford-gambit::1::e5@8': { ...STAF_E5, beats: [{ atMove: 9, say: "…Ne4 — the knight leaps to the strong central post, blockading White's e5-pawn; the Stafford gives Black active piece play for the pawn.", sayShort: "…Ne4 — central blockade.", highlights: [H('e4')] }, { atMove: 15, say: "…Bf5 — the bishop develops actively, reinforcing the e4-knight and eyeing White's queenside; Black's initiative answers the pawn.", sayShort: "…Bf5 — reinforce the knight.", highlights: [H('f5')] }] },
  'stafford-gambit::1::Bc4@10': { ...STAF_ACCEPTED, beats: [{ atMove: 11, say: "…Ng4 — the knight jumps toward f2 and e5, the Stafford's aggressive thrust; Black builds a kingside attack for the pawn.", sayShort: "…Ng4 — aggressive thrust.", highlights: [H('g4'), H('f2', SOFT)] }, { atMove: 15, say: "…Qh4 — the queen swings to the kingside, eyeing f2 and h2; Black's pieces converge on White's king in true Stafford style.", sayShort: "…Qh4 — converge on the king.", highlights: [H('h4'), H('f2', ATK)] }] },
  'stafford-gambit::1::Nf3@6': { ...STAF_DECLINED, beats: [{ atMove: 7, say: "…Nxe4 — you snatch the centre pawn back, refusing to fall behind; the Stafford keeps Black active even when White declines the gambit.", sayShort: "…Nxe4 — snatch it back.", highlights: [H('e4')] }, { atMove: 15, say: "…Qf6 — the queen develops actively, eyeing f2 and the long diagonal; Black generates pressure to offset the pawn.", sayShort: "…Qf6 — develop, eye f2.", highlights: [H('f6'), H('f2', SOFT)] }] },
  'stafford-gambit::1::h3@10': { ...STAF_ACCEPTED, beats: [{ atMove: 17, say: "…Bb6 — the bishop tucks to a safe, active diagonal, eyeing f2 and the centre; Black keeps the pressure for the gambit pawn.", sayShort: "…Bb6 — active diagonal.", highlights: [H('b6'), H('f2', SOFT)] }, { atMove: 21, say: "…Be6 — the bishop develops, completing a harmonious attacking setup; Black's active pieces answer the pawn.", sayShort: "…Be6 — complete the setup.", highlights: [H('e6')] }] },
  'stafford-gambit::1::d4@6': { ...STAF_DECLINED, beats: [{ atMove: 15, say: "…Qe7 — the queen develops, connecting toward the centre and eyeing e4; Black builds pressure for the gambit pawn.", sayShort: "…Qe7 — develop, eye e4.", highlights: [H('e7')] }, { atMove: 17, say: "…Bb7 — the bishop fianchettoes, raking the long diagonal toward e4 and g2; the Stafford's pieces converge for activity.", sayShort: "…Bb7 — rake the long diagonal.", arrows: [A('b7', 'e4')], highlights: [H('b7')] }] },
  'stafford-gambit::1::Be2@10': { ...STAF_ACCEPTED, beats: [{ atMove: 11, say: "…Qd4 — the queen leaps to the centre, hitting e4 and f2 and eyeing White's king; the Stafford's pressure mounts for the pawn.", sayShort: "…Qd4 — centralise, hit f2.", highlights: [H('d4'), H('f2', ATK)] }, { atMove: 17, say: "…Qh4 — the queen swings to the kingside, probing f2 and h2; Black keeps the initiative and the attacking chances for the pawn.", sayShort: "…Qh4 — swing, probe f2.", highlights: [H('h4'), H('f2', ATK)] }] },
  'stafford-gambit::1::Be3@12': { ...STAF_ACCEPTED, beats: [{ atMove: 13, say: "…Nxe3 — you snap the bishop, shattering White's pawns with fxe3; the Stafford's activity and White's wrecked structure compensate the pawn.", sayShort: "…Nxe3 — shatter the pawns.", highlights: [H('e3')] }, { atMove: 15, say: "…Bxe3 — you grab the dark-squared post, the bishops raking White's exposed king; Black's initiative answers the gambit.", sayShort: "…Bxe3 — rake the king.", highlights: [H('e3')] }] },
  'stafford-gambit::1::Bc4@8': { ...STAF_ACCEPTED, beats: [{ atMove: 9, say: "…c5 — you grab queenside space and a foothold, fixing White's structure; Black plays actively for the pawn in the Stafford.", sayShort: "…c5 — grab space.", highlights: [H('c5')] }, { atMove: 17, say: "…Be7 — the bishop develops, preparing to castle and contest the centre; Black's active pieces answer the gambit pawn.", sayShort: "…Be7 — develop, prepare O-O.", highlights: [H('e7')] }] },
  'stafford-gambit::1::Nxf7@6': { ...STAF_CRITICAL, beats: [{ atMove: 17, say: "…Bd6 — you develop with menace toward h2, the Stafford's attacking spirit; down material, Black throws everything at White's king.", sayShort: "…Bd6 — menace h2.", arrows: [A('d6', 'h2')], highlights: [H('d6')] }, { atMove: 21, say: "…Nxf2 — a desperado shot at the king and rook; the Stafford's traps are Black's practical hope in the melee.", sayShort: "…Nxf2 — desperado shot.", highlights: [H('f2')] }] },
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
    { atMove: 19, say: "…Na5 challenges White's b3-bishop, the thematic Ruy maneuver, clearing c6 so the b7-bishop bears fully on e4.", sayShort: "…Na5 — hit the bishop, free b7.", arrows: [A('a5', 'b3')], highlights: [H('b3', ATK)] },
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
  'ruy-lopez::0::Na5@15': { ...COV_RUY_NA5, beats: [{ atMove: 16, say: "Bc2 — the Spanish bishop tucks back to its best diagonal, eyeing h7. The knight's trip to a5 cost Black time you'll cash with the d4-break.", sayShort: "Bc2 — retreat, aim at h7.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 18, say: "d4 — the central break the whole Closed Ruy builds toward. You strike at e5, open lines, and your space plus the bishop pair give the lasting pull.", sayShort: "d4 — the central break.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 22, say: "Nxd4 — the knight recaptures on a commanding central square, eyeing f5 and b5. You hold the freer game and the bishop pair in an open position.", sayShort: "Nxd4 — commanding centre.", highlights: [H('d4'), H('f5', SOFT)] }] },
  'ruy-lopez::1::Na5@15': { ...COV_RUY_NA5, beats: [{ atMove: 16, say: "Bc2 — the Spanish bishop tucks back to its best diagonal, eyeing h7. The knight's trip to a5 cost Black time you'll cash with the d4-break.", sayShort: "Bc2 — retreat, aim at h7.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 18, say: "d4 — the central break the whole Closed Ruy builds toward. You strike at e5, open lines, and your space plus the bishop pair give the lasting pull.", sayShort: "d4 — the central break.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 22, say: "Nxd4 — the knight recaptures on a commanding central square, eyeing f5 and b5. You hold the freer game and the bishop pair in an open position.", sayShort: "Nxd4 — commanding centre.", highlights: [H('d4'), H('f5', SOFT)] }] },
  'ruy-lopez::2::Na5@15': { ...COV_RUY_NA5, beats: [{ atMove: 16, say: "Bc2 — the Spanish bishop tucks back to its best diagonal, eyeing h7. The knight's trip to a5 cost Black time you'll cash with the d4-break.", sayShort: "Bc2 — retreat, aim at h7.", arrows: [A('c2', 'h7')], highlights: [H('c2'), H('h7', SOFT)] }, { atMove: 18, say: "d4 — the central break the whole Closed Ruy builds toward. You strike at e5, open lines, and your space plus the bishop pair give the lasting pull.", sayShort: "d4 — the central break.", arrows: [A('d4', 'e5')], highlights: [H('d4'), H('e5', ATK)] }, { atMove: 22, say: "Nxd4 — the knight recaptures on a commanding central square, eyeing f5 and b5. You hold the freer game and the bishop pair in an open position.", sayShort: "Nxd4 — commanding centre.", highlights: [H('d4'), H('f5', SOFT)] }] },
  'ruy-lopez::3::Be7@9': { ...COV_RUY_BE7, beats: [{ atMove: 10, say: "Re1 — you back the e4-pawn and prepare the c3-d4 plan. The Closed Ruy is a slow squeeze; every quiet move builds toward the break.", sayShort: "Re1 — back e4, prepare d4.", highlights: [H('e1'), H('e4', SOFT)] }, { atMove: 14, say: "d3 — a flexible centre. You keep the tension and prepare Nbd2-f1, the Spanish knight tour toward the kingside where your chances lie.", sayShort: "d3 — flexible, then Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 22, say: "Nf1 — the knight rounds toward g3 and f5; with more space and the better structure, White out-maneuvers Black in the rich middlegame.", sayShort: "Nf1 — toward g3 and f5.", highlights: [H('f1'), H('g3', SOFT)] }] },
  'ruy-lopez::7::Be7@9': { ...COV_RUY_BE7, beats: [{ atMove: 10, say: "Re1 — you back the e4-pawn and prepare the c3-d4 plan. The Closed Ruy is a slow squeeze; every quiet move builds toward the break.", sayShort: "Re1 — back e4, prepare d4.", highlights: [H('e1'), H('e4', SOFT)] }, { atMove: 14, say: "d3 — a flexible centre. You keep the tension and prepare Nbd2-f1, the Spanish knight tour toward the kingside where your chances lie.", sayShort: "d3 — flexible, then Nbd2-f1.", highlights: [H('d3'), H('e4', SOFT)] }, { atMove: 22, say: "Nf1 — the knight rounds toward g3 and f5; with more space and the better structure, White out-maneuvers Black in the rich middlegame.", sayShort: "Nf1 — toward g3 and f5.", highlights: [H('f1'), H('g3', SOFT)] }] },
  'ruy-lopez::4::a6@5': COV_RUY_A6,
  'ruy-lopez::5::d6@11': RUY_D6_11_D3,
  'ruy-lopez::6::d6@11': RUY_D6_11_D3,
  'ruy-lopez::8::bxc6@7': COV_RUY_BXC6,
  'italian-game::0::d6@7': COV_IT_D6,
  'italian-game::1::d6@7': COV_IT_D6,
  'italian-game::6::d6@7': COV_IT_D6,
  'italian-game::2::Nf6@5': IT_NF6_PIANISSIMO,
  'italian-game::3::Nf6@5': IT_NF6_PIANISSIMO,
  'two-knights-defence::1::Bb5@4': COV_TK_BB5,
  'two-knights-defence::2::Bb5@4': COV_TK_BB5,
  'two-knights-defence::3::Bb5@4': COV_TK_BB5,
  'two-knights-defence::4::Bb5@4': COV_TK_BB5,
  'two-knights-defence::5::Bb5@4': COV_TK_BB5,
  'two-knights-defence::6::Bb5@4': COV_TK_BB5,
  'two-knights-defence::7::Bb5@4': COV_TK_BB5,
  'four-knights-game::0::Nd4@7': FK_ND4_RUBIN,
  'four-knights-game::4::Nd4@7': FK_ND4_RUBIN,
  'four-knights-game::7::Nd4@7': FK_ND4_RUBIN,
  'four-knights-game::8::Bg4@11': { ...COV_FK_BG4, beats: [{ atMove: 12, say: "Na4 — the knight jumps to challenge the c5-bishop, the thematic Glek plan; trading it leaves Black with doubled c-pawns and you the better structure.", sayShort: "Na4 — challenge the bishop.", arrows: [A('a4', 'c5')], highlights: [H('a4'), H('c5', ATK)] }, { atMove: 16, say: "h3 — you question the g4-bishop, winning the bishop pair or a tempo; the fianchettoed g2-bishop will rake the long diagonal.", sayShort: "h3 — question the bishop.", arrows: [A('h3', 'g4')], highlights: [H('h3'), H('g4', ATK)] }] },
  'scotch-game::0::d6@5': COV_SC_D6,
  'scotch-game::1::d6@5': COV_SC_D6,
  'scotch-game::2::d6@5': COV_SC_D6,
  'scotch-game::3::d6@5': COV_SC_D6,
  'scotch-game::4::d6@5': COV_SC_D6,
  'scotch-game::5::d6@5': COV_SC_D6,
  'scotch-game::6::d6@5': COV_SC_D6,
  'scotch-game::7::d6@5': COV_SC_D6,
  'vienna-game::0::O-O@13': { ...COV_VN_GAMBIT_OO, beats: [{ atMove: 14, say: "Be3 — you develop the bishop, eyeing the kingside and supporting the centre; White's broad pawns and the coming O-O-O give attacking chances.", sayShort: "Be3 — develop, support.", highlights: [H('e3')] }, { atMove: 16, say: "O-O-O — you castle long, the rooks aiming at Black's centre and king; White's space and pieces converge for the Vienna Gambit attack.", sayShort: "O-O-O — castle long, attack.", highlights: [H('c1')] }] },
  'vienna-game::2::h6@11': { ...COV_VN_H6, beats: [{ atMove: 12, say: "Ne2 — the knight reroutes toward g3 and f5, the thematic Vienna Hybrid maneuver; White builds slowly behind the solid centre.", sayShort: "Ne2 — reroute toward f5.", highlights: [H('e2')] }, { atMove: 14, say: "Bxe6 — you trade and damage Black's structure with fxe6; White's better pawns and the half-open f-file give a lasting pull.", sayShort: "Bxe6 — damage the structure.", highlights: [H('e6')] }] },
  'petrov-defence::1::O-O@10': { ...COV_PT_OO, beats: [{ atMove: 11, say: "…Nxe5 — you trade off the strong e5-knight; after dxe5 the position simplifies and your solid setup holds the balance comfortably.", sayShort: "…Nxe5 — trade, simplify.", highlights: [H('e5')] }, { atMove: 17, say: "…O-O — you castle into a sound, symmetrical structure; with pieces traded and a rock-solid centre, Black is fully equal.", sayShort: "…O-O — solid, equal.", highlights: [H('g8')] }] },
  'petrov-defence::3::Bc4+@10': COV_PT_BC4,
  'philidor-defence::1::Re1@12': { ...COV_PH_RE1, beats: [{ atMove: 13, say: "…c6 — you brace the centre and prepare …b5 or …d5, the flexible Lion move; Black's solid setup is ready to expand.", sayShort: "…c6 — brace, prepare …b5.", highlights: [H('c6')] }, { atMove: 17, say: "…d5 — you strike in the centre, freeing your position; with the break in, Black equalises comfortably.", sayShort: "…d5 — strike, free up.", highlights: [H('d5')] }] },
};
