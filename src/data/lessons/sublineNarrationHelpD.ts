import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration as SN } from '../../services/sublineLesson';

// HELPER D (oversight session took over after the KID/Grünfeld session hit an
// API error, David 2026-06-18) — Grünfeld Defence deep sub-tries, OVERRIDE LAYER
// (spread after D4Flank → deeper teach-past versions win, zero collision).
// STUDENT = BLACK. Every line board-verified vs course-sublines.json from a
// ground-truth ply-by-ply dump (G3). The Grünfeld bargain: let White build the
// big d4/e4/c3 centre, then dismantle it — …c5 and the g7-bishop hammer d4, …Bg4
// undermines its defender, …Qa5 and …Nc6 pile onto c3. A huge centre that falls
// is worse than no centre at all.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
const GRUN_WIKI = 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence';

// Nf3 before Nc3 — the solid Schlechter setup with …c6 and …d5.
const GR_NF3_C6: SN = {
  intro: {
    say: "Nf3 first keeps things flexible, so meet it solidly: …c6 and …d5 build a rock-steady Schlechter Grünfeld. You give White nothing to attack, develop naturally, and reroute …Nh5 to challenge the bishop on f4 — comfortable, symmetrical equality.",
    sayShort: '…c6, …d5 — solid Schlechter.',
  },
  beats: [
    { atMove: 5, say: "…c6 underpins the coming …d5, building a solid pawn triangle instead of the usual Grünfeld counter-strike — a sound choice against the flexible Nf3 order.", highlights: [H('c6', KEY), H('d5', SOFT)] },
    { atMove: 11, say: "…Nc6 develops and leans on d4; with the centre fixed, you finish development and contest the open c-file.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 13, say: "…Nh5 challenges the f4-bishop, forcing it to declare itself and easing any pressure on your position.", highlights: [H('h5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', GRUN_WIKI],
};

// Exchange main, Rb1 — pressure d4 with …Bg4 and …cxd4 against weak c3.
const GR_EXCH_RB1: SN = {
  intro: {
    say: "Rb1 is the modern Exchange — White tucks the rook away before you can hit c3. No matter: castle, develop …Bg4 to undermine d4's defender, and crack the centre with …cxd4. White's c3-pawn and big centre are the long-term targets your pieces swarm.",
    sayShort: '…O-O, …Bg4, …cxd4 hit centre.',
  },
  beats: [
    { atMove: 15, say: "…O-O finishes development first; the Grünfeld counterattack works best with the king safely tucked away.", highlights: [H('g8', KEY)] },
    { atMove: 17, say: "…Bg4 pins the f3-knight — d4's key defender — so the pressure on the centre mounts.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK), H('d4', SOFT)] },
    { atMove: 21, say: "…cxd4 cracks the centre open; White's hanging c3-pawn and isolated e-pawn become the targets you'll besiege.", highlights: [H('d4', ATK), H('c3', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-pin', GRUN_WIKI],
};

// Exchange with Be3/Qd2 (and Be2) — …Qa5/…Nc6/…cxd4 then favourable trade.
const GR_EXCH_QD2: SN = {
  intro: {
    say: "White's Be3 and Qd2 brace the centre, so chip at it from the side: …Qa5 pins along the a5-e1 diagonal, …Nc6 hits d4, and …cxd4 cxd4 leaves White's centre fixed and weak. The trade on d2 then drops you into a pleasant, c3-pressuring endgame.",
    sayShort: '…Qa5, …cxd4, …Qxd2 favourable.',
  },
  beats: [
    { atMove: 21, say: "…cxd4 forces the issue; after cxd4 White's centre is fixed on dark squares your bishop and pieces can hound.", highlights: [H('d4', ATK)] },
    { atMove: 23, say: "…Qxd2+ trades into an ending where White's doubled, weak pawns and your active g7-bishop give you the easier game.", highlights: [H('d2', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-doubled', GRUN_WIKI],
};

// Bd2 (passive recapture prep) — …c5 / …e6 break the centre comfortably.
const GR_BD2: SN = {
  intro: {
    say: "Bd2 is a passive way to meet …Nxd5 — the bishop does little there. Strike normally: …Bg7 on the diagonal, …Nxc3 to clear the way, …c5 to hit d4, and …e6 to break White's pawn chain at its base for a free game.",
    sayShort: '…c5, …e6 — break the centre.',
  },
  beats: [
    { atMove: 13, say: "…c5 challenges d4, the core Grünfeld lever; the big centre starts to feel the strain.", highlights: [H('c5', KEY), H('d4', SOFT)] },
    { atMove: 17, say: "…e6 undermines the d5-pawn at its base — the pawn White pushed is now a target.", highlights: [H('e6', KEY), H('d5', SOFT)] },
    { atMove: 21, say: "…exd5 opens the centre; with White's bishop passively placed, your pieces have the freer game.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-chain', GRUN_WIKI],
};

// Bg5 (move 6) — …Ne4! hits the bishop, …dxc4 grabs, …c5 counters.
const GR_BG5_6: SN = {
  intro: {
    say: "Bg5 pins your knight, so unpin with a punch: …Ne4! attacks the bishop and grabs the centre. After the trade you snatch the c4-pawn with …dxc4, and …c5 opens the position where your bishop pair and active pieces shine.",
    sayShort: '…Ne4!, …dxc4, …c5 counter.',
  },
  beats: [
    { atMove: 7, say: "…Ne4 hits the g5-bishop and seizes the central e4-square in one stroke — the principled answer to the pin.", arrows: [A('e4', 'g5')], highlights: [H('g5', ATK)] },
    { atMove: 11, say: "…dxc4 banks a pawn and clears d5; White's centre is fractured and you're up material for now.", highlights: [H('c4', KEY)] },
    { atMove: 15, say: "…c5 strikes at d4 to blow the position open — the bishop pair and your activity are worth more than the pawn White regains.", highlights: [H('c5', ATK)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', GRUN_WIKI],
};

// The Exchange ...Qb7 main: White grabs b7 for the centre; you have huge activity.
const GR_EXCHANGE_QB7: SN = {
  intro: {
    say: "This is the heart of the Exchange: …c5, …Bg4 and …Qa5 swarm White's centre, and after …cxd4 Nxd4 White grabs the b7-pawn. Let him — your raking g7-bishop, the …Bg4 pin and pressure all over c3 and the loose White king give you full, lasting activity for a single pawn.",
    sayShort: '…Bg4, …Qa5, …cxd4 — activity for a pawn.',
  },
  beats: [
    { atMove: 15, say: "…Bg4 pins the f3-knight, removing the key defender of d4 and stepping up the assault on the centre.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 17, say: "…Qa5 piles onto the weak c3-pawn and eyes the a5-e1 diagonal — White's centre is creaking.", highlights: [H('a5', KEY), H('c3', SOFT)] },
    { atMove: 19, say: "…cxd4 opens lines; even when White nabs b7, your pieces are everywhere and his king is stuck in the centre — easily worth the pawn.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-center', GRUN_WIKI],
};

// Bg5 (move 8, after …Bg7) — …Ne4 hits both, …c5 counter, simplify via …Qxd5.
const GR_BG5_8: SN = {
  intro: {
    say: "Bg5 here pins toward your queen, but …Ne4 hits the bishop and the c3-knight at once. Trade on c3, strike d4 with …c5, and recapture the centre with …Qxd5 — simplifying queens off into a comfortable, equal middlegame.",
    sayShort: '…Ne4, …c5, …Qxd5 equalise.',
  },
  beats: [
    { atMove: 9, say: "…Ne4 forks the attention of the g5-bishop and the c3-knight — White must concede something.", arrows: [A('e4', 'g5')], highlights: [H('g5', ATK), H('c3', SOFT)] },
    { atMove: 13, say: "…c5 hammers d4, the standard counter-strike that frees Black's game.", highlights: [H('c5', KEY)] },
    { atMove: 19, say: "…Qxd5 recaptures in the centre with a strong queen; the trades that follow leave a balanced, easy position.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-fork', GRUN_WIKI],
};

// Quiet e3 (move 8) — …e6/…b6/…Ba6 trade off White's good bishop.
const GR_E3_8: SN = {
  intro: {
    say: "e3 is a quiet, solid system — White keeps a small centre and avoids the sharp Exchange. Neutralise it: …e6 and …b6 prepare …Ba6, trading off White's good light-squared bishop, after which …dxc4 and easy development give Black a completely sound game.",
    sayShort: '…e6, …b6, …Ba6 trade bishops.',
  },
  beats: [
    { atMove: 11, say: "…e6 solidifies and prepares the …b6/…Ba6 plan — a reliable recipe against the quiet systems.", highlights: [H('e6', KEY)] },
    { atMove: 13, say: "…b6 readies the fianchetto trade; the light-squared bishop will swing to a6.", highlights: [H('b6', KEY)] },
    { atMove: 17, say: "…Ba6 challenges down the diagonal, trading off White's good bishop and equalising the light squares.", arrows: [A('a6', 'c4')], highlights: [H('c4', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', GRUN_WIKI],
};

// Bf4 system (and the Nc3@4 transposition) — …c5, …dxc4, …Na6 regain.
const GR_BF4: SN = {
  intro: {
    say: "Bf4 is the solid modern try, eyeing c7. Answer in pure Grünfeld style: …c5 hits d4, and after dxc5 the queens come off. Recapture material with …Na6, develop …Bg4, and your active pieces fully equalise in the resulting endgame.",
    sayShort: '…c5, …dxc4, …Na6 regain.',
  },
  beats: [
    { atMove: 11, say: "…c5 strikes at d4 immediately — White must release the tension and the queens come off.", highlights: [H('c5', KEY), H('d4', SOFT)] },
    { atMove: 13, say: "…dxc4 grabs a pawn and keeps the structure fluid as the position simplifies toward an endgame.", highlights: [H('c4', KEY)] },
    { atMove: 17, say: "…Na6 rounds up the c5-pawn; with …Bg4 to follow, your pieces are active and the ending is balanced.", highlights: [H('a6', KEY), H('c5', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', GRUN_WIKI],
};

// Fianchetto Grünfeld, cxd5 — …Nb6/…Nc6/…Na5 pressure c4, …cxd5 hits the centre.
const GR_FIANCH_CXD5: SN = {
  intro: {
    say: "In the Fianchetto, cxd5 and Bg2 give White a slow build-up. Reroute …Nb6 to eye c4, develop …Nc6 and …Na5 to pressure the queenside, and break with …cxd5 against White's centre — classic Grünfeld counterplay against the long diagonal.",
    sayShort: '…Na5, …c6, …cxd5 counter.',
  },
  beats: [
    { atMove: 15, say: "…Nc6 develops and leans on d4, contesting the centre White is trying to clamp.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 17, say: "…Na5 targets the c4-square and White's light-squared setup, redeploying with a clear plan.", highlights: [H('a5', KEY), H('c4', SOFT)] },
    { atMove: 23, say: "…cxd5 strikes at the centre, opening lines for your g7-bishop and rooks just as the Grünfeld intends.", highlights: [H('d5', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', GRUN_WIKI],
};

// Quiet e3 (move 6) — …c5/…e6 then …Bg4 pin, …Nb4 active piece.
const GR_E3_6: SN = {
  intro: {
    say: "e3 here is a modest, solid setup that cedes you the centre. Strike with …c5, undermine with …e6, and develop …Bg4 to pin the f3-knight; the leap …Nb4 then plants a knight near White's weakened squares for an active, better-coordinated game.",
    sayShort: '…c5, …e6, …Bg4 pin.',
  },
  beats: [
    { atMove: 9, say: "…c5 challenges d4 at once; against a quiet setup, you fight for the centre on the best terms.", highlights: [H('c5', KEY)] },
    { atMove: 11, say: "…e6 strikes at the d5-pawn's base, the standard lever to crack the chain.", highlights: [H('e6', KEY), H('d5', SOFT)] },
    { atMove: 17, say: "…Bg4 pins the f3-knight, ramping up pressure on the centre and White's defence.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-pin', GRUN_WIKI],
};

// Fianchetto, …dxc4/…c3 damaging line, White e3 — …Nc6/…Bf5/…cxd4.
const GR_FIANCH_E3: SN = {
  intro: {
    say: "After …dxc4 and the …c3! shot, White's queenside pawns are damaged for good. With e3 White settles in, so develop with purpose: …Nc6 hits d4, …Bf5 grabs the active diagonal, …Qa5 eyes the weak pawns, and …cxd4 opens the position in your favour.",
    sayShort: '…Nc6, …Bf5, …cxd4 open.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 develops with pressure on d4, the focus of all your play.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…Bf5 takes the active diagonal, eyeing c2 and supporting your queenside operations.", highlights: [H('f5', KEY)] },
    { atMove: 23, say: "…cxd4 opens the centre against White's compromised pawns — your pieces are the more active.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Nc4 (var3) — …Be6/…Bd5 contest the long diagonal.
const GR_FIANCH_NC4_V3: SN = {
  intro: {
    say: "With the knight swinging to c4, fight for the long diagonal that defines the Fianchetto: …Be6 develops, …Bd5 challenges White's g2-bishop head-on, and …Nc6 piles into the centre. Trading the diagonal bishops leaves you comfortably placed.",
    sayShort: '…Be6, …Bd5 contest diagonal.',
  },
  beats: [
    { atMove: 17, say: "…Be6 develops the bishop toward d5, where it will contest White's strongest piece.", highlights: [H('e6', KEY)] },
    { atMove: 19, say: "…Bd5 challenges the g2-bishop on the long diagonal — neutralising White's main trump.", highlights: [H('d5', KEY)] },
    { atMove: 21, say: "…Nc6 completes development with pressure on the centre; the game is dynamically balanced.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Nc4 (var5) — …Nc6 then …Be6/…Bd5.
const GR_FIANCH_NC4_V5: SN = {
  intro: {
    say: "Against Nc4 here, develop first with …Nc6 to contest d4, then sort out the light squares: trades on c6 give you a healthy structure, and …Be6-d5 neutralises White's fianchettoed bishop. A sound, equal Grünfeld middlegame.",
    sayShort: '…Nc6, …Be6, …Bd5 solid.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 develops and pressures d4 — the centre is always the Grünfeld's target.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…Be6 heads for d5 to challenge White's bishop and the long diagonal.", highlights: [H('e6', KEY)] },
    { atMove: 23, say: "…Bd5 contests the diagonal directly; trading there leaves your structure sound and your game easy.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Bb2 — …Nc6/…Ne4/…cxd4/…Nd6.
const GR_FIANCH_BB2: SN = {
  intro: {
    say: "Bb2 supports the centre on the long diagonal, but your plan rolls on: …Nc6 leans on d4, …Ne4 grabs a fine central outpost, …cxd4 opens the position, and …Nd6 reroutes to a strong square. Active, harmonious counterplay.",
    sayShort: '…Nc6, …Ne4, …Nd6 active.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 develops and hits d4, contesting the centre White is bracing.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 23, say: "…Nd6 reroutes the knight to a fine square, controlling c4 and e4 and eyeing White's structure.", highlights: [H('d6', KEY)] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-center', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Re1 (var3) — …Nc6/…Bg4/…Qa5 pressure.
const GR_FIANCH_RE1_V3: SN = {
  intro: {
    say: "Re1 prepares e4, so get your pieces active first: …Nc6 hits d4, …Bg4 pins the f3-knight when it appears, and …Qa5 swings to the queenside where White's pawns are tender. Pressure on the centre and queenside is the Grünfeld's lifeblood.",
    sayShort: '…Nc6, …Bg4, …Qa5 pressure.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 develops with pressure on d4 — always the target.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…Bg4 pins the f3-knight, loosening the grip on the centre.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 23, say: "…Qa4 lands on the queenside, harassing White's pawns and pieces where they are weakest.", highlights: [H('a4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:tac-pin', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Re1 (var5) — …cxd4/…Bf5/…Be4.
const GR_FIANCH_RE1_V5: SN = {
  intro: {
    say: "Against Re1, open the game on your terms: …cxd4 cracks the centre, …Bf5 grabs the active diagonal, and …Be4 plants the bishop in the centre challenging White's g2-bishop and the e4-square. Free, active piece play for Black.",
    sayShort: '…cxd4, …Bf5, …Be4 active.',
  },
  beats: [
    { atMove: 17, say: "…cxd4 opens the centre immediately, freeing your pieces against White's pawns.", highlights: [H('d4', ATK)] },
    { atMove: 19, say: "…Bf5 seizes the active diagonal, eyeing c2 and the e4-square.", highlights: [H('f5', KEY)] },
    { atMove: 23, say: "…Bc6 settles the bishop on the long diagonal, contesting White's g2-bishop and equalising fully.", highlights: [H('c6', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', GRUN_WIKI],
};

// Fianchetto …dxc4/…c3, White Ne5 — …Nc6 trade, …Be6/…Nd5.
const GR_FIANCH_NE5: SN = {
  intro: {
    say: "Ne5 occupies the centre, so challenge it: …Nc6 offers a trade, and after the swaps you recapture toward the centre and post …Be6 and …Nd5 on commanding squares. The damaged White queenside pawns remain a long-term target.",
    sayShort: '…Nc6, …Be6, …Nd5 central.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 challenges the e5-knight head-on, inviting trades that ease your game.", highlights: [H('c6', KEY)] },
    { atMove: 21, say: "…bxc6 recaptures toward the centre, reinforcing d5 and opening the b-file for your rook.", highlights: [H('c6', KEY)] },
    { atMove: 23, say: "…Nd5 centralises on a dominant square, blockading and eyeing White's weak pawns.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', GRUN_WIKI],
};

// Classical Exchange Bc4/Ne2, Nf3 — …cxd4/…Nc6/…Bg4 pressure on d4.
const GR_BC4_NF3: SN = {
  intro: {
    say: "The Bc4 Exchange is White's most ambitious — a mobile centre backed by the bishop. Hit it before it rolls: …cxd4 cxd4 fixes an isolated d-pawn, …Nc6 attacks it, and …Bg4 pins its defender. The proud centre becomes a chronic weakness.",
    sayShort: '…cxd4, …Nc6, …Bg4 vs centre.',
  },
  beats: [
    { atMove: 17, say: "…cxd4 fixes White's centre — the recapture leaves an isolated d-pawn to besiege.", highlights: [H('d4', ATK)] },
    { atMove: 19, say: "…Nc6 attacks the d-pawn, the standard blockade-and-pressure plan against the Bc4 centre.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 21, say: "…Bg4 pins the f3-knight, removing a defender of the centre and tightening the bind.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
  ],
  sources: ['concept:pawn-isolated', 'concept:tac-pin', GRUN_WIKI],
};

// Classical Bc4/Ne2 — the Bxf7+/…Na5 main line; Black is fine with …Nc4.
const GR_BC4_QXF1: SN = {
  intro: {
    say: "This is the great theoretical battleground of the Bc4 Exchange. …Na5 hits the bishop and provokes the Bxf7+ sacrifice; after the forced sequence the dust settles with material level and your knight bound for the magnificent c4-outpost. Black is completely sound — know the path and play it confidently.",
    sayShort: '…Na5, …Nc4 — fully equal.',
  },
  beats: [
    { atMove: 21, say: "…Na5 attacks the c4-bishop, the move that triggers White's whole combination — and Black's full equality.", arrows: [A('a5', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 27, say: "…Nc4 lands on the dream outpost, blockading c3 and dominating from the centre — material is level and Black is fine.", highlights: [H('c4', KEY)] },
    { atMove: 29, say: "…Rc8 swings the rook to the open c-file, completing a harmonious, fully equal setup.", highlights: [H('c8', KEY)] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-open-file', GRUN_WIKI],
};

// Classical Bc4/Ne2, White d5 push — …Na5 hits the bishop, …e6 break.
const GR_BC4_D5: SN = {
  intro: {
    say: "When White pushes d5, hit the bishop that supports it: …Na5 forks attention onto c4, …e6 strikes at the d5-pawn, and …Nxb3 nets the bishop pair. White's advanced pawn becomes overextended and you stand comfortably.",
    sayShort: '…Na5, …e6, …Nxb3 bishop pair.',
  },
  beats: [
    { atMove: 19, say: "…Na5 attacks the c4-bishop, forcing it to a worse square and gaining the bishop pair.", arrows: [A('a5', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 21, say: "…e6 strikes at the d5-pawn's base, challenging White's overextended centre.", highlights: [H('e6', KEY), H('d5', SOFT)] },
    { atMove: 23, say: "…Nxb3 captures the bishop, banking the two bishops in an open position — a lasting plus.", highlights: [H('b3', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', GRUN_WIKI],
};

// Exchange Rb1, Be3 — …Bg4xf3 damages the kingside, …e6/…cxd4.
const GR_EXCH_BE3_16: SN = {
  intro: {
    say: "Be3 braces the centre, so undermine it from a flank: …Bg4 pins the f3-knight, and …Bxf3 forces gxf3 — shattering White's kingside pawns. With …e6 and …cxd4 you then dismantle the centre against a permanently weakened king.",
    sayShort: '…Bg4, …Bxf3, …cxd4.',
  },
  beats: [
    { atMove: 17, say: "…Bg4 pins the f3-knight, the defender of d4 and the gateway to White's kingside.", arrows: [A('g4', 'f3')], highlights: [H('f3', ATK)] },
    { atMove: 19, say: "…Bxf3 forces gxf3, shattering White's kingside pawns into permanent weaknesses.", highlights: [H('f3', ATK)] },
    { atMove: 23, say: "…cxd4 cracks the centre; with White's kingside ruined, your long-term targets are everywhere.", highlights: [H('d4', ATK)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:tac-pin', GRUN_WIKI],
};

// Exchange, Qd2 offering trade — …Qxd2 into a comfortable ending, …Bb7.
const GR_EXCH_QD2_20: SN = {
  intro: {
    say: "By offering the queen trade with Qd2, White heads for a calmer game — but the Exchange endgame favours your structure. Take with …Qxd2, fianchetto with …b6 and …Bb7 onto the long diagonal, and pressure White's centre pawns where they're most exposed.",
    sayShort: '…Qxd2, …b6, …Bb7 long diagonal.',
  },
  beats: [
    { atMove: 21, say: "…Qxd2+ trades into an ending where White's centre pawns are the targets and your bishops are long-range trumps.", highlights: [H('d2', KEY)] },
    { atMove: 23, say: "…b6 prepares to fianchetto the bishop onto the long diagonal aimed at White's centre.", highlights: [H('b6', KEY)] },
    { atMove: 25, say: "…Bb7 takes the long diagonal, bearing down on the e4-pawn and the heart of White's position.", arrows: [A('b7', 'e4')], highlights: [H('e4', ATK)] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-center', GRUN_WIKI],
};

// Exchange Rb1, Bc4 — …Nc6 pressure, …Bxc3, …Na5 hits the bishop.
const GR_EXCH_BC4_16: SN = {
  intro: {
    say: "Bc4 places the bishop actively, but you have the resources: …Nc6 pressures d4, …Bxc3 inflicts doubled pawns when it suits, and …Na5 chases the c4-bishop. White's centre and queenside pawns are the chronic weaknesses you target.",
    sayShort: '…Nc6, …Bxc3, …Na5 hit bishop.',
  },
  beats: [
    { atMove: 17, say: "…Nc6 develops with pressure on d4, the centre's keystone.", highlights: [H('c6', KEY), H('d4', SOFT)] },
    { atMove: 19, say: "…Bxc3 trades to saddle White with doubled pawns — a permanent structural target.", highlights: [H('c3', ATK)] },
    { atMove: 23, say: "…Na5 hits the c4-bishop, forcing concessions and grabbing the initiative on the queenside.", arrows: [A('a5', 'c4')], highlights: [H('c4', ATK)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', GRUN_WIKI],
};

// Classical Bc4/Ne2, White O-O — …cxd4/…Nxd4/…Qxd4 liquidate to equality.
const GR_BC4_OO: SN = {
  intro: {
    say: "When White castles in the Bc4 Exchange, the clean path is liquidation: …cxd4 opens the centre, …Nxd4 trades the blockading knight, and …Qxd4 centralises the queen, regaining the pawn and dissolving White's centre entirely. A safe, equal game.",
    sayShort: '…cxd4, …Nxd4, …Qxd4 equalise.',
  },
  beats: [
    { atMove: 17, say: "…cxd4 opens the centre at the right moment, before White's pieces are fully coordinated.", highlights: [H('d4', ATK)] },
    { atMove: 19, say: "…Nxd4 trades off the knight that held the centre together.", highlights: [H('d4', KEY)] },
    { atMove: 21, say: "…Qxd4 centralises the queen and dissolves White's pawn centre — Black is comfortably equal.", highlights: [H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', GRUN_WIKI],
};

// Classical Bc4/Ne2, White d5 (var7) — …Na5 hits the bishop, …e6 break.
const GR_BC4_D5_16: SN = {
  intro: {
    say: "White's d5 push gains space but commits the centre. Hit the bishop holding it together with …Na5, undermine the pawn with …e6, and develop …Bd7; White's advanced pawn is overextended and you neutralise the centre comfortably.",
    sayShort: '…Na5, …e6, …Bd7 neutralise.',
  },
  beats: [
    { atMove: 17, say: "…Na5 attacks the c4-bishop, forcing it back and gaining the bishop pair.", arrows: [A('a5', 'c4')], highlights: [H('c4', ATK)] },
    { atMove: 19, say: "…e6 strikes at the d5-pawn, challenging White's overextended centre.", highlights: [H('e6', KEY), H('d5', SOFT)] },
    { atMove: 21, say: "…Bd7 develops calmly, supporting the queenside and the fight against the d5-pawn.", highlights: [H('d7', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', GRUN_WIKI],
};

export const SUBLINE_NARRATION_HELP_D: Record<string, SN> = {
  // Grünfeld Defence — student BLACK, 32 dead-end lines / 45 keys
  'grunfeld-defence::0::Nf3@4': GR_NF3_C6, 'grunfeld-defence::1::Nf3@4': GR_NF3_C6, 'grunfeld-defence::2::Nf3@4': GR_NF3_C6, 'grunfeld-defence::4::Nf3@4': GR_NF3_C6, 'grunfeld-defence::5::Nf3@4': GR_NF3_C6, 'grunfeld-defence::6::Nf3@4': GR_NF3_C6, 'grunfeld-defence::7::Nf3@4': GR_NF3_C6,
  'grunfeld-defence::0::Rb1@14': GR_EXCH_RB1, 'grunfeld-defence::1::Rb1@14': GR_EXCH_RB1,
  'grunfeld-defence::0::Be2@18': GR_EXCH_QD2, 'grunfeld-defence::1::Be2@18': GR_EXCH_QD2,
  'grunfeld-defence::0::Bd2@8': GR_BD2, 'grunfeld-defence::1::Bd2@8': GR_BD2,
  'grunfeld-defence::0::Bg5@6': GR_BG5_6, 'grunfeld-defence::1::Bg5@6': GR_BG5_6, 'grunfeld-defence::2::Bg5@6': GR_BG5_6,
  'grunfeld-defence::2::cxd5@8': GR_EXCHANGE_QB7, 'grunfeld-defence::3::Nc3@6': GR_EXCHANGE_QB7, 'grunfeld-defence::6::Be3@14': GR_EXCHANGE_QB7,
  'grunfeld-defence::2::Bg5@8': GR_BG5_8,
  'grunfeld-defence::2::e3@8': GR_E3_8,
  'grunfeld-defence::2::Bf4@8': GR_BF4, 'grunfeld-defence::3::Nc3@4': GR_BF4, 'grunfeld-defence::5::Nc3@4': GR_BF4,
  'grunfeld-defence::3::cxd5@8': GR_FIANCH_CXD5, 'grunfeld-defence::5::cxd5@10': GR_FIANCH_CXD5,
  'grunfeld-defence::3::e3@6': GR_E3_6,
  'grunfeld-defence::3::e3@16': GR_FIANCH_E3, 'grunfeld-defence::5::e3@16': GR_FIANCH_E3,
  'grunfeld-defence::3::Nc4@16': GR_FIANCH_NC4_V3,
  'grunfeld-defence::5::Nc4@16': GR_FIANCH_NC4_V5,
  'grunfeld-defence::3::Bb2@16': GR_FIANCH_BB2, 'grunfeld-defence::5::Bb2@16': GR_FIANCH_BB2,
  'grunfeld-defence::3::Re1@16': GR_FIANCH_RE1_V3,
  'grunfeld-defence::5::Re1@16': GR_FIANCH_RE1_V5,
  'grunfeld-defence::5::Ne5@16': GR_FIANCH_NE5,
  'grunfeld-defence::4::Nf3@14': GR_BC4_NF3, 'grunfeld-defence::7::Nf3@14': GR_BC4_NF3,
  'grunfeld-defence::4::Qxf1@26': GR_BC4_QXF1,
  'grunfeld-defence::4::d5@18': GR_BC4_D5,
  'grunfeld-defence::6::Be3@16': GR_EXCH_BE3_16,
  'grunfeld-defence::6::Qd2@20': GR_EXCH_QD2_20,
  'grunfeld-defence::6::Bc4@16': GR_EXCH_BC4_16,
  'grunfeld-defence::7::O-O@16': GR_BC4_OO,
  'grunfeld-defence::7::d5@16': GR_BC4_D5_16,
};
