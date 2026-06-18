import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { CourseSubline } from '../../services/openingCourse';
import type { SublineNarration } from '../../services/sublineLesson';
import { SUBLINE_NARRATION_E4E5 } from './sublineNarrationE4E5';
import { SUBLINE_NARRATION_E4OTHER } from './sublineNarrationE4Other';
import { SUBLINE_NARRATION_D4FLANK } from './sublineNarrationD4Flank';

// HAND-AUTHORED subline narration (David 2026-06-17: "these are hand authored").
// Each entry is written by hand, grounded in the real DB line + verified against
// the board (G3) — never generated, never templated. Keyed
// `${openingId}::${variationIndex}::${triggerMove}@${atPly}` so it binds to the
// exact deviation in course-sublines.json. Un-authored sublines fall back to the
// converter's honest baseline (a factual frequency frame + a silent, arrow-led
// walk) — empty beats the way silence beats filler. Authored incrementally, the
// most common / most instructive deviations first.

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

export const sublineKey = (openingId: string, variationIndex: number, s: CourseSubline): string =>
  `${openingId}::${variationIndex}::${s.triggerMove}@${s.atPly}`;

const FR_SRC = ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];

// ── Shared deviation narrations (one line, many tabs) ───────────────────────
// Many openings show the SAME top deviation across several variation tabs (the
// subline generator branches at a shared fork). Author once, map to every key.

const KID_SRC = ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];
// KID, Classical (White's Be2). d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2
const KID_BE2: SublineNarration = {
  intro: {
    say: "Be2 — the Classical King's Indian, White's most respected setup. He builds the broad d4-e4 centre and develops solidly. Don't fight it head-on: castle, then play the thematic …e5, striking the centre and unlocking the whole King's Indian plan — a kingside pawn storm while White expands on the other wing. This is the race the KID lives for.",
    sayShort: 'Be2 — castle, then strike …e5.',
  },
  sources: KID_SRC,
};
// KID, White's flexible Nf3. d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3
const KID_NF3: SublineNarration = {
  intro: {
    say: "Nf3 — White develops flexibly toward the main lines. Your reply never changes in spirit: finish the fianchetto setup, castle, and break the centre with …e5. Once the centre locks, the King's Indian attack writes itself — pawns and pieces storming the kingside while White plays on the queenside.",
    sayShort: 'Nf3 — castle and break …e5.',
  },
  sources: KID_SRC,
};
const SLAV_SRC = ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'];
// Slav, quiet e3 (shutting in White's own bishop). d4 d5 c4 c6 Nf3 Nf6 e3 Bf5
const SLAV_E3: SublineNarration = {
  intro: {
    say: "e3 — the quiet Slav, and it hands you a quiet gift: with this pawn White boxes his OWN light-squared bishop in behind the chain. The Slav's whole identity is the answer — …Bf5, getting your light bishop out to an active post before you ever close the centre. One side ends up with a good bishop and one with a bad one, and it's you holding the good one.",
    sayShort: 'e3 — get …Bf5 out first.',
  },
  beats: [
    { atMove: 7, say: "…Bf5 — there it is, the move that justifies the entire Slav. White's e3 just entombed his own bishop; yours steps outside the pawn chain onto f5, raking the b1-h7 diagonal and bearing down on c2. This is the difference between a good bishop and a bad one, decided on move four of the opening — and the comfort of the whole defence flows from it.", arrows: [A('f5', 'c2')], highlights: [H('f5', KEY), H('c2', SOFT)] },
  ],
  sources: SLAV_SRC,
};

const QP_SRC = ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'];
// Nimzo, White's anti-Nimzo Nf3 (delaying Nc3). d4 Nf6 c4 e6 Nf3 d5 Nc3 Be7
const NIMZO_NF3: SublineNarration = {
  intro: {
    say: "Nf3 — White delays Nc3 to dodge the Nimzo pin. Don't force it: answer …d5, reaching a sound, classical Queen's-Gambit structure where you're fully equal. If White ever does play Nc3, the …Bb4 pin is still there waiting; until then you develop comfortably with no weaknesses.",
    sayShort: 'Nf3 — flexible …d5, stay solid.',
  },
  beats: [
    { atMove: 5, say: "…d5 — the flexible answer that commits to nothing premature. White ducked the Nimzo pin by holding back Nc3, so you stake your own claim in the centre. You reach a rock-solid Queen's-Gambit structure, and the moment White does play Nc3 the …Bb4 pin snaps back into your hands. Whichever way he turns, you're at home.", highlights: [H('d5', KEY)] },
  ],
  sources: QP_SRC,
};
// Grünfeld Exchange — the critical main line (student Black).
// d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5
const GRUN_EXCHANGE: SublineNarration = {
  intro: {
    say: "cxd5 — the Exchange Grünfeld, the critical main line and the whole point of the opening. White builds the broad d4-e4 pawn centre; your entire strategy is to tear it down. The g7-bishop rakes it on the long diagonal, …c5 and …Bg4 and …Nc6 pile on, and if that centre cracks White is simply worse. You invite the big centre precisely so you can demolish it.",
    sayShort: 'cxd5 — Exchange: demolish the centre.',
  },
  beats: [
    { atMove: 11, say: "…Bg7 — the soul of the Grünfeld. The bishop sits on the long diagonal with a clear, open run straight at d4, the keystone of White's whole centre. From here everything else flows — …c5, …Nc6, …Bg4 all pour onto that pawn until it falls, and a fallen centre means a lost game for White.", arrows: [A('g7', 'd4')], highlights: [H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};

// French — White's 3rd-move SYSTEM choices surface as the top deviation across
// several Black variation tabs (the subline generator branches at the shared
// fork). Author each unique line ONCE and map it to every tab that shows it.

// 3.Nc3 — the Winawer. Line:
// e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O
const FR_WINAWER: SublineNarration = {
  intro: {
    say: "Nc3 — the most principled French, and it invites the sharpest line in the whole opening: the Winawer. You answer …Bb4, pinning the knight that defends e4 — so the pin turns the screw on White's centre. The bargain you strike is famous: you'll trade the dark-squared bishop for that knight, shattering White's queenside pawns, and in return White gets the bishop pair and a kingside lunge with Qg4. Wildly double-edged, and Black scores heavily.",
    sayShort: 'Nc3 — the Winawer: …Bb4.',
  },
  beats: [
    { atMove: 5, say: "…Bb4 — the Winawer pin. The bishop nails the c3-knight to the king; because that knight is the defender of e4, the pin turns the screw on White's centre, forcing him to resolve it on your terms rather than his.", highlights: [H('c3', KEY), H('e4', SOFT)] },
    { atMove: 9, say: "…Bxc3+ — the structural heart of the Winawer. You hand over the dark bishop, but bxc3 saddles White with crippled, doubled c-pawns: a permanent target you'll grind against all game while White hunts for kingside play.", highlights: [H('c3', KEY)] },
    { atMove: 13, say: "…O-O — castling straight into Qg4, the critical test. You're inviting Qxg7, because after …Rg8 the half-open g-file and your queenside pressure hand you a raging attack for the pawn. This is the Winawer's gambit spirit: structure and initiative over material.", highlights: [H('g7', KEY)] },
  ],
  sources: FR_SRC,
};

// 3.Nd2 — the Tarrasch. Line:
// e4 e6 d4 d5 Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O
const FR_TARRASCH: SublineNarration = {
  intro: {
    say: "Nd2 — the Tarrasch, sidestepping the Winawer pin by blocking the c3-square with the knight. The price White pays is activity: the knight sits passively, and you strike the centre at once with …c5. You'll reach an open, comfortable game with easy piece play and — at last — no bad bishop.",
    sayShort: 'Nd2 — the Tarrasch: hit …c5.',
  },
  beats: [
    { atMove: 5, say: "…c5 — striking at d4 immediately, the whole point of meeting Nd2. The knight on d2 is clumsily placed for this central fight, and the position cracks open in your favour.", highlights: [H('d4', KEY), H('c5', ATK)] },
    { atMove: 11, say: "…Qd6 — the queen sidesteps the c4-bishop and lands on an active central post eyeing both wings. You've equalised cleanly, with the freer development and an open game to press in.", highlights: [H('d6', KEY)] },
  ],
  sources: FR_SRC,
};

const SIC_SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];

// Sicilian (student Black). Bd3 — an offbeat White 6th. Appears on every
// Najdorf/Dragon tab via the shared fork. e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Bd3 Nc6
const SIC_BD3: SublineNarration = {
  intro: {
    say: "Bd3 — an offbeat sixth move. The bishop normally belongs on e2, c4 or g5; on d3 it blocks White's own d-file and bites on nothing. Punish the lazy development with natural play: …Nc6 challenges the d4-knight at once, and you'll follow with …g6 or …e5 to seize the centre while the bishop sits misplaced.",
    sayShort: 'Bd3 — punish with …Nc6.',
  },
  beats: [
    { atMove: 9, say: "…Nc6 — striking the d4-knight straight away. With White's bishop committed passively to d3, you develop with tempo and head for a comfortable, fully equal game where every one of your pieces reaches a better square than its counterpart.", highlights: [H('d4', KEY)] },
  ],
  sources: SIC_SRC,
};

// Anti-Benoni: White recaptures on d5 with the knight (student Black).
const BENONI_NXD5: SublineNarration = {
  intro: {
    say: "Nxd5 — White recaptures with the knight, ducking the sharp Modern Benoni structure for a quiet game. That suits you fine: trade with …Nxd5 and develop freely. Without the locked d5-pawn cramping you, Black equalises easily with active, unobstructed pieces.",
    sayShort: 'Nxd5 — trade off, free game.',
  },
  beats: [
    { atMove: 9, say: "…Nxd5 — trade the knights and the whole point of White's quiet line evaporates. The cramping d5-pawn that defines the Modern Benoni never appears; instead the centre simplifies, your pieces get open lines, and you reach an easy, level game where nothing is squeezed. White dodged the sharp Benoni and got nothing for it.", highlights: [H('d5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// Sveshnikov → White offers a c3 Morra-style gambit (student Black).
// Sveshnikov → c3 Morra gambit, accepted (student Black, a pawn up). Line:
// e4 c5 Nf3 Nc6 d4 cxd4 c3 dxc3 Nxc3 e6 Bc4 a6 O-O
const SVESH_C3: SublineNarration = {
  intro: {
    say: "c3 — White swerves into a Smith-Morra-style gambit instead of the main Open Sicilian, sidestepping all your Sveshnikov theory. So take the pawn — …dxc3. White gets a lead in development for it, but that's a debt with an expiry date: trade a pair of pieces, finish with …e6 and …a6, get the king safe, and the extra pawn is simply yours.",
    sayShort: 'c3 — accept …dxc3, consolidate.',
  },
  beats: [
    { atMove: 7, say: "…dxc3 — grab it. Declining hands White the comfortable game he wants; accepting means he has to PROVE the gambit. After he recaptures you're a clean pawn up, and your only job is to weather a few energetic moves by trading pieces and developing — once the initiative burns out, the pawn decides.", highlights: [H('c3', ATK)] },
    { atMove: 11, say: "…a6 — the single most important move in any Morra defence. It denies b5 to White's bishop and knight, and prepares your own …b5 to kick the c4-bishop off its f7-aiming diagonal. This quiet move is what extinguishes the gambit: no targets, no sacrifices, just an extra pawn.", highlights: [H('a6', SOFT), H('b5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation'],
};
// Catalan check (student Black).
const CAT_BB4: SublineNarration = {
  intro: {
    say: "…Bb4+ — the Catalan check, one of Black's most reliable equalizers. The bishop checks, and after Bd2 you trade or retreat with gain of time — neutralising the g2-bishop's pull on the long diagonal before it ever bites. A clean, well-tested way to take the sting out of the Catalan.",
    sayShort: '…Bb4+ — defuse the Catalan.',
  },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const CAT_C6: SublineNarration = {
  intro: {
    say: "…c6 — the Closed Catalan, rock-solid. You bolster d5 and prepare …Nbd7 and …b6, holding the centre firm against the long-range g2-bishop. It's patient and famously hard to crack — Black sits behind a wall and waits for a break.",
    sayShort: '…c6 — Closed Catalan, hold firm.',
  },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// Modern Alekhine main line (student Black).
const ALE_MODERN: SublineNarration = {
  intro: {
    say: "The Modern Alekhine main line. You've baited White into the big pawn centre — now make him regret it. …Bg4 pins, …dxe5 and …Nc6 chip at the pawns, and the overextended front becomes a row of targets. That's the whole Alekhine bet: provoke the centre, then tear it down.",
    sayShort: 'Undermine the big centre: …Bg4.',
  },
  beats: [
    { atMove: 7, say: "…Bg4 — and the demolition begins. The bishop pins the f3-knight, one of the props holding White's broad centre together; with the defender tied down, your coming …dxe5 and …Nc6 hammer at d4. You let White build the centre for exactly this — so you could take aim and pull it apart.", highlights: [H('f3', KEY), H('d4', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

// Budapest declined with d5 (student Black) — all 7 tabs share this exact line:
// d4 Nf6 c4 e5 d5 Bc5 Nc3 d6 a3 e4 b3 e3 f3 a6
const BUDAPEST_D5: SublineNarration = {
  intro: {
    say: "d5 — White declines the Budapest, pushing the pawn past rather than grabbing on e5. This is the outcome you're happy with: you keep your central pawn and, far from going quiet, you get to play the Budapest's real idea — throw the e-pawn forward to e4 and e3, cramping White's kingside before he can untangle. You sacrificed nothing and you still get the initiative.",
    sayShort: 'd5 — declined; roll the e-pawn forward.',
  },
  beats: [
    { atMove: 5, say: "…Bc5 — straight to the bishop's dream diagonal, drilling down toward f2, the tender square right beside White's uncastled king. d4 and e3 are empty, so the sight-line is wide open: even with the gambit declined, the Budapest bishop already has White's weak point in its crosshairs.", arrows: [A('c5', 'f2')], highlights: [H('f2', KEY), H('c5', SOFT)] },
    { atMove: 9, say: "…e4 — the pawn marches and does two jobs at once: it grabs space in White's half of the board and it steals the f3-square from White's knight, which now has no natural route into the game. White is being quietly strangled.", highlights: [H('e4', ATK), H('f3', KEY)] },
    { atMove: 11, say: "…e3! — the spearhead jams deep into e3, a thorn White can't easily remove. It freezes the f2-pawn to its defence and clogs the whole kingside, so White burns move after move untangling while you finish developing in comfort. The declined Budapest bites just as hard as the accepted one.", highlights: [H('e3', ATK), H('f2', SOFT)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};


const SUBLINE_NARRATION: Record<string, SublineNarration> = {
  // Caro-Kann, Advance Variation (var 1) — the Short System, White's most
  // common try here (about a third of games). Line:
  // e4 c6 d4 d5 e5 Bf5 Nf3 e6 Bd3 Bxd3 Qxd3 c5 a3 c4
  'caro-kann::1::Bd3@8': {
    intro: {
      say: "The Short Variation — by far the most common Advance try, about a third of White's games here. White challenges your light-squared bishop with Bd3, offering to trade the very piece the Caro worked so hard to free outside the pawn chain. Don't flinch: that bishop has already done its job, so you swap it off and get straight to the real plan — breaking the centre with …c5.",
      sayShort: 'Bd3 — trade, then strike …c5.',
    },
    beats: [
      { atMove: 9, say: "…Bxd3. Trading your 'good' bishop looks wrong, but it has already earned its keep sitting outside the chain on f5 — and the recapture drags White's queen out early to d3, where it becomes a target you'll hit in two moves.", highlights: [H('d3', KEY)] },
      { atMove: 11, say: "There's the soul of the Caro Advance — …c5, smashing into d4 at the very base of White's pawn chain. First you neutralised the light bishop; now you dissolve the centre that was cramping you.", arrows: [A('c5', 'd4')], highlights: [H('d4', KEY)] },
      { atMove: 13, say: "…c4! and the point lands: the pawn jabs the queen on d3 with tempo and seizes queenside space, clamping White's position. You've reached a comfortable Short-System picture — a clear plan and the initiative on the queenside, the pawn the Caro promised paying off.", highlights: [H('c4', ATK), H('d3', KEY)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Two Knights with …Bg4 (var 2) — White grabs space with e5. Line
  // (engine-sound, +0.34 Black): …Nfd7 first, THEN the …c5 break.
  // e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 e5 Nfd7 Bf4 a6 O-O-O c5 dxc5 Nc6 h4 Bxc5
  'caro-kann::2::e5@12': {
    intro: {
      say: "e5 — White grabs the centre and shifts into an Advance-style structure, by far the most common path here. Don't strike with …c5 immediately — that walks into Nb5 and the Nc7+ fork on your rook. Retreat the knight first with …Nfd7, tuck it behind the chain, and only THEN play …c5 to hit the base on d4. You've already traded your bad light bishop, so once the break comes you're fully equal with an easy game.",
      sayShort: 'e5 — …Nfd7 first, then break …c5.',
    },
    beats: [
      { atMove: 13, say: "…Nfd7 — the careful retreat. The space-grabbing e5-pawn kicks your knight, and the right square is d7, not f5 or a premature …c5. From d7 the knight eyes the c5- and e5-breaks and sidesteps the Nb5-Nc7+ fork that would have skewered your rook. Patience first.", arrows: [A('d7', 'c5')], highlights: [H('d4', KEY)] },
      { atMove: 17, say: "…c5 — NOW the Caro break lands, hammering d4 at the foot of White's chain with your pieces already in order. Undermine the base rather than sit and defend; with no bad bishop and no weaknesses, the broad centre gives White nothing.", arrows: [A('c5', 'd4')], highlights: [H('d4', KEY), H('c5', ATK)] },
      { atMove: 21, say: "…Bxc5 — you regain the pawn cleanly, the dark bishop landing on an active diagonal aimed back at White's king. Equal material, the better minor piece, and a comfortable Caro middlegame.", highlights: [H('c5', ATK)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Exchange Variation (var 5) — White develops Nf3. Line:
  // e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 Nf3 Bg4
  'caro-kann::5::Nf3@8': {
    intro: {
      say: "Nf3 — White just develops in the Exchange, the calm main path here. Your reply is pure Caro: …Bg4, bringing the light bishop out free and active OUTSIDE the pawn chain before you ever play …e6, and pinning the knight to the queen on the way out.",
      sayShort: 'Nf3 — pin it with …Bg4.',
    },
    beats: [
      { atMove: 9, say: "…Bg4 — the Caro's signature move. The light-squared bishop, the piece that suffocates in most …e6 defences, steps out actively and pins the f3-knight against the queen. You'll develop everything else behind it and simply never own a bad bishop in this whole game.", highlights: [H('f3', KEY), H('g4', SOFT)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Two Knights / 2.Nc3 (var 0) — the Rasa-Studier Gambit. Line:
  // e4 c6 d4 d5 Nc3 dxe4 f3 exf3 Nxf3 Nf6 Bd3 Bg4
  'caro-kann::0::f3@6': {
    intro: {
      say: "f3 — the Rasa-Studier Gambit, a rare but tricky pawn offer. White wants to blow open the f-file and the centre for his pieces. Don't be shy: take it with …exf3. You'll be a clean pawn up, and the right plan is simply to develop everything to a natural square and let White try to prove a compensation that isn't really there.",
      sayShort: 'f3 — just take it, …exf3.',
    },
    beats: [
      { atMove: 11, say: "…Bg4 — out comes the good bishop, pinning the f3-knight, the very piece White's whole gambit is built around. You're a clean pawn to the good with every piece flowing to its best square. Stay solid and the extra pawn simply tells.", highlights: [H('f3', KEY), H('g4', SOFT)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Panov Attack (var 3) — White develops Nf3. Line:
  // e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nf3 g6 Nc3 Bg7
  'caro-kann::3::Nf3@8': {
    intro: {
      say: "Nf3 — White develops in the Panov, steering toward an isolated-queen-pawn middlegame. The most reliable answer is the fianchetto: …g6 and …Bg7. Instead of blockading the coming isolated d-pawn passively, you train the long diagonal on it and swarm it with pieces — the modern, Grünfeld-flavoured antidote to the Panov.",
      sayShort: 'Nf3 — fianchetto, …g6 and …Bg7.',
    },
    beats: [
      { atMove: 11, say: "…Bg7 — the bishop takes aim down the long diagonal toward d4 and the heart of White's centre. This is the whole plan against the Panov's isolated pawn: pressure it with the pieces, don't sit in front of it, and the d-pawn becomes a long-term target rather than a battering ram.", highlights: [H('d4', KEY), H('g7', SOFT)] },
    ],
    sources: ['book:caro-kann', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Fantasy / Maróczy (var 4) — c3 props the centre. Line (engine-
  // sound, equal): develop, don't push …c4 (it just drops to Bxc4 here).
  // e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Be7 O-O Ngf6 Kh1 O-O Qc2 Qc7 Nbd2 b5
  'caro-kann::4::c3@10': {
    intro: {
      say: "c3 — White props his centre in the Fantasy after you've struck with …e5. Resist the urge to ram …c5 and …c4: that c4-pawn has nothing behind it and simply drops to Bxc4. Instead just complete a clean, classical development — …Nd7, …Be7, …Ngf6 and castle. Your bishop is already outside the chain on g4, you have no weaknesses, and then …b5 gains queenside space at your leisure. Comfortable equality, no risk.",
      sayShort: 'c3 — develop soundly, then …b5.',
    },
    beats: [
      { atMove: 11, say: "…Nd7 — calm development, supporting the …e5 strongpoint and clearing the way for the other knight to f6. Against a propped centre you don't lunge; you finish developing and keep every pawn healthy.", highlights: [H('e5', ATK), H('d4', KEY)] },
      { atMove: 15, say: "…Ngf6 — the second knight joins, leaning on White's e4-pawn and completing your kingside. Everything is out, your king is about to be safe, and your light bishop already sits actively on g4 outside the chain.", arrows: [A('f6', 'e4')], highlights: [H('e4', KEY)] },
      { atMove: 21, say: "…b5 — there's the real plan in this structure: queenside expansion. You gain space with …b5 and …a6, the pawns rolling on the side where you're better, with no loose c4-pawn to defend. A risk-free, pleasant game.", highlights: [H('b5', ATK)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // Caro-Kann, Tartakower (var 6) — White castles into the main tabiya. Line:
  // e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5 O-O
  'caro-kann::6::O-O@18': {
    intro: {
      say: "O-O — White castles into the main Tartakower tabiya, and it's time to count your trumps. Your rook already owns the half-open e-file, you hold the bishop pair, and the …h5 pawn is rolling at the king. Those doubled f-pawns are not a weakness — they clamp e5 and g5 and form a sturdy shield. You have the easier, more natural attacking game.",
      sayShort: 'O-O — the Tartakower tabiya; you press.',
    },
    beats: [
      { atMove: 18, say: "There's the tabiya. The doubled f-pawns deny White's pieces the e5 and g5 outposts while you build with the bishop pair, the open e-file, and the …h5-h4 storm. The Tartakower's bargain — structure for the initiative — pays off.", highlights: [H('e5', SOFT), H('g5', SOFT)] },
    ],
    sources: ['book:caro-kann', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
  },

  // French — the Winawer (3.Nc3) surfaces as the top deviation on every tab
  // whose spine runs through the shared fork; the Tarrasch (3.Nd2) on the rest.
  'french-defence::0::Nc3@4': FR_WINAWER,
  'french-defence::3::Nc3@4': FR_WINAWER,
  'french-defence::6::Nc3@4': FR_WINAWER,
  'french-defence::7::Nc3@4': FR_WINAWER,
  'french-defence::1::Nd2@4': FR_TARRASCH,
  'french-defence::2::Nd2@4': FR_TARRASCH,
  'french-defence::8::Nd2@4': FR_TARRASCH,

  // French Exchange (var 4) — h3, the symmetric, drawish line. Line:
  // e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O h3
  'french-defence::4::h3@12': {
    intro: {
      say: "h3 — a quiet luft in the Exchange French, the symmetrical line with a drawish reputation. There's nothing to fear and nothing handed to you: mirror the setup, finish developing, and remember the win here is MADE, not given. Grab an open file first, find the better square for a piece, and manufacture the small imbalance yourself — with active play Black is the one who can press.",
      sayShort: "h3 — symmetric; outplay, don't wait.",
    },
    sources: FR_SRC,
  },

  // French Classical, Burn Variation (var 5) — Bxf6. Line (engine-sound, +0.52
  // Black): develop the dark bishop to g7 — don't push …f4 yet (it just hangs).
  // e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Bxf6 gxf6 Nxe4 f5 Nc3 Bg7 Nf3 O-O Qd2 Nc6 Rd1 Ne7 h4 b6 Rh3 Bb7
  'french-defence::5::Bxf6@8': {
    intro: {
      say: "Bxf6 — the Burn Variation. White trades on f6 to win back the e4-pawn. Recapture toward the centre with …gxf6: doubled f-pawns, yes, but in return the half-open g-file, the bishop pair, and a big pawn mass. Then …f5 kicks the knight — but don't rush …f4, it just drops a pawn. The strong move is …Bg7, planting the dark bishop on the open long diagonal where it rakes b2 and White's king. Develop, castle, and the two bishops do the work.",
      sayShort: 'Bxf6 — …gxf6, then …Bg7 (not …f4).',
    },
    beats: [
      { atMove: 9, say: "…gxf6 — doubling the f-pawns by choice. In exchange the g-file tears open toward White's king and you keep the bishop pair. These pawns aren't a weakness to defend; they're the half-open file your rook will use.", highlights: [H('f6', KEY)] },
      { atMove: 13, say: "…Bg7 — the move that makes the whole structure sing. Instead of shoving …f4 (which only hangs the pawn), you fianchetto onto the long diagonal. The bishop glares at b2 and clean through to White's king down a diagonal your own doubled pawns have opened.", arrows: [A('g7', 'b2')], highlights: [H('g7', KEY)] },
      { atMove: 23, say: "…Bb7 — the second bishop joins the first on the long light diagonal. Both bishops and the open g-file now bear down on White's position; the doubled pawns gave you the bishop pair and the files, and the trade has paid for itself many times over.", highlights: [H('b7', KEY)] },
    ],
    sources: FR_SRC,
  },

  // French Rubinstein, sharp f3 try (var 9). Line (engine-sound, +0.76 Black):
  // e4 e6 d4 d5 Nc3 dxe4 f3 Bb4 fxe4 Bxc3+ bxc3 Qh4+ Ke2 Qxe4+ Kf2 Nf6 Nf3 Qc6 Bd3 Qxc3
  'french-defence::9::f3@6': {
    intro: {
      say: "f3 — White wants to recapture your extra e4-pawn with the f-pawn and build a big centre. There's a precise refutation, and move order is everything. First …Bb4, pinning the c3-knight. Then, after fxe4, don't lash out with …Qh4+ yet — play …Bxc3+ FIRST to remove the knight that would block the check. Only then …Qh4+, and White's king is dragged to e2 into …Qxe4+, snapping off a second pawn. You end up two pawns up with White's king stranded in the centre.",
      sayShort: 'f3 — …Bb4, then …Bxc3+ before …Qh4+.',
    },
    beats: [
      { atMove: 7, say: "…Bb4 — the pin comes first, freezing the c3-knight to the king before White can prop up his centre. This knight is the one piece that could later block a check on the e1-h4 diagonal, so you tie it down right away.", arrows: [A('b4', 'c3')], highlights: [H('c3', KEY)] },
      { atMove: 9, say: "…Bxc3+ — the key, and the move most players miss. Trade the bishop for the pinned knight NOW, before the check. With that knight gone from c3 there's nothing left to interpose on the e1-h4 diagonal, and White's queenside pawns are shattered into the bargain.", arrows: [A('c3', 'e1')], highlights: [H('c3', ATK)] },
      { atMove: 13, say: "…Qxe4+ — the payoff. …Qh4+ forced the king to e2 (no knight to block anymore), and now the queen scoops the e4-pawn with check. You're two clean pawns up, White's king is marooned on f2 with no castling, and the rest is technique.", arrows: [A('e4', 'e2')], highlights: [H('e4', ATK)] },
    ],
    sources: FR_SRC,
  },

  // ── Ruy Lopez (student White) ──
  // …a6 — the Morphy Defence (71%). e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6
  // …d6 — Closed Ruy with …d6 (7%). e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 d6
  // bxc6 — the Exchange Ruy (12%). e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 bxc6 O-O

  // ── Italian Game (student White) ──

  // ── Sicilian Najdorf + Dragon (student Black): the offbeat Bd3 ──
  'sicilian-najdorf::0::Bd3@8': SIC_BD3,
  'sicilian-najdorf::1::Bd3@8': SIC_BD3,
  'sicilian-najdorf::2::Bd3@8': SIC_BD3,
  'sicilian-najdorf::3::Bd3@8': SIC_BD3,
  'sicilian-najdorf::4::Bd3@8': SIC_BD3,
  'sicilian-najdorf::5::Bd3@8': SIC_BD3,
  'sicilian-najdorf::6::Bd3@8': SIC_BD3,
  'sicilian-najdorf::7::Bd3@8': SIC_BD3,
  'sicilian-najdorf::8::Bd3@8': SIC_BD3,
  'sicilian-dragon::0::Bd3@8': SIC_BD3,
  'sicilian-dragon::1::Bd3@8': SIC_BD3,
  'sicilian-dragon::2::Bd3@8': SIC_BD3,
  'sicilian-dragon::3::Bd3@8': SIC_BD3,
  'sicilian-dragon::4::Bd3@8': SIC_BD3,
  'sicilian-dragon::6::Bd3@8': SIC_BD3,
  'sicilian-dragon::7::Bd3@8': SIC_BD3,

  // ── King's Indian Defence (student Black) ──
  'kings-indian-defence::0::Be2@8': KID_BE2,
  'kings-indian-defence::1::Be2@8': KID_BE2,
  'kings-indian-defence::2::Nf3@8': KID_NF3,
  'kings-indian-defence::6::Nf3@8': KID_NF3,
  'kings-indian-defence::3::e5@10': {
    intro: {
      say: "e5 — the Four Pawns Attack, White's most violent King's Indian try, throwing four pawns across the board. The overextension is its flaw: don't flinch, counterstrike with …dxe5 and the …c5 break, and those proud pawns become targets while White's loose centre comes crashing down.",
      sayShort: 'e5 — counterstrike …dxe5, …c5.',
    },
    sources: KID_SRC,
  },
  'kings-indian-defence::5::O-O@12': {
    intro: {
      say: "O-O — White castles into the Classical main line, and you've already landed the key …e5 break. Now the real King's Indian begins: White plays c5 and the minority push on the queenside while you throw everything at his king — …Nd7, …f5, …f4, and the kingside avalanche. Trust the race; your attack arrives first more often than not.",
      sayShort: 'O-O — launch the …f5-f4 storm.',
    },
    sources: KID_SRC,
  },
  'kings-indian-defence::7::dxe5@12': {
    intro: {
      say: "dxe5 — White releases the central tension early. Recapture with …dxe5 and the game opens into a near-symmetrical, queens-on middlegame where your fianchettoed g7-bishop and the half-open d-file give easy, comfortable play. White's space edge has simply evaporated.",
      sayShort: 'dxe5 — recapture, comfortable game.',
    },
    sources: KID_SRC,
  },

  // ── Slav Defence (student Black) ──

  // ── English Opening (student White) ──

  // ── Nimzo-Indian (student Black) ──
  'nimzo-indian::0::Nf3@4': NIMZO_NF3,
  'nimzo-indian::1::Nf3@4': NIMZO_NF3,
  'nimzo-indian::2::Nf3@4': NIMZO_NF3,
  'nimzo-indian::4::Nf3@4': NIMZO_NF3,
  'nimzo-indian::5::Nf3@4': NIMZO_NF3,
  'nimzo-indian::6::Nf3@4': NIMZO_NF3,
  'nimzo-indian::7::Nf3@4': NIMZO_NF3,

  // ── Queen's Indian (student Black) — Nc3 transposes to a Nimzo on every tab ──

  // ── Semi-Slav (student Black) — quiet e3 …Bf5 on every tab (same as the Slav) ──
  'semi-slav::0::e3@6': SLAV_E3,
  'semi-slav::1::e3@6': SLAV_E3,
  'semi-slav::2::e3@6': SLAV_E3,
  'semi-slav::3::e3@6': SLAV_E3,
  'semi-slav::4::e3@6': SLAV_E3,
  'semi-slav::5::e3@6': SLAV_E3,
  'semi-slav::6::e3@6': SLAV_E3,

  // ── Scotch Game (student White) — …d6 decline on every tab ──

  // ── Grünfeld Defence (student Black) ──
  'grunfeld-defence::2::cxd5@6': GRUN_EXCHANGE,
  'grunfeld-defence::4::Be3@14': GRUN_EXCHANGE,
  'grunfeld-defence::7::Be3@14': GRUN_EXCHANGE,
  'grunfeld-defence::3::Nc3@4': {
    intro: {
      say: "Nc3 — White heads into the main Grünfeld/King's-Indian crossroads. Stay true to the plan: fianchetto with …Bg7, castle, and if White grabs the big centre, attack it with …d5 or …c5 and piece pressure. You let White overextend so you can hit back. Comfortable, dynamic equality.",
      sayShort: 'Nc3 — fianchetto, then strike the centre.',
    },
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
  },
  'grunfeld-defence::5::Nc3@4': {
    intro: {
      say: "Nc3 — White heads into the main Grünfeld/King's-Indian crossroads. Stay true to the plan: fianchetto with …Bg7, castle, and if White grabs the big centre, attack it with …d5 or …c5 and piece pressure. You let White overextend so you can hit back. Comfortable, dynamic equality.",
      sayShort: 'Nc3 — fianchetto, then strike the centre.',
    },
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
  },

  // ── Vienna Game (student White) — the Gambit main line ──

  // ── Petrov Defence (student Black) ──

  // ── Pirc Defence (student Black) — the Austrian Attack ──
  'pirc-defence::7::Bd3@10': {
    intro: {
      say: "Bd3 — the Austrian Attack, White's most aggressive Pirc try: pawns on d4-e4-f4 and the pieces aimed at your king. The Pirc plan is to invite that big centre and then crack it. You've fianchettoed and castled; now counterpunch with …Nc6 or …Na6 and the …e5 or …c5 breaks, blowing the overextended pawns apart before the attack lands.",
      sayShort: 'Bd3 — counterpunch …e5 / …c5.',
    },
    sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  },

  // ── Scandinavian Defence (student Black) ──
  'scandinavian-defence::2::Nc3@10': {
    intro: {
      say: "Nc3 — White blocks the check and clings to the pawn in the Icelandic Gambit. Let him keep it: you have a raging lead in development and the bishop pair for one pawn. Castle long, slam both rooks onto the central files against White's stuck king, and the initiative is worth far more than the material.",
      sayShort: 'Nc3 — develop fast, rooks to the centre.',
    },
    sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'scandinavian-defence::0::O-O@14': {
    intro: {
      say: "O-O — the classical …Qa5 Scandinavian tabiya. Count your comforts: the light bishop is already out and active on f5, your structure is rock-solid Caro-like, and with castling settled you head for a sound, double-edged middlegame with no weaknesses to defend. Exactly the safe, sturdy game the Scandinavian promises.",
      sayShort: 'O-O — solid …Qa5 setup; press on.',
    },
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'scandinavian-defence::6::O-O@14': {
    intro: {
      say: "O-O — the classical …Qa5 Scandinavian tabiya. Count your comforts: the light bishop is already out and active on f5, your structure is rock-solid Caro-like, and with castling settled you head for a sound, double-edged middlegame with no weaknesses to defend. Exactly the safe, sturdy game the Scandinavian promises.",
      sayShort: 'O-O — solid …Qa5 setup; press on.',
    },
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },

  // ── Two Knights (student Black) — Bb5 Ruy transposition on every tab ──

  // ── Benoni (student Black) — anti-Benoni Nxd5 ──
  'benoni-defence::0::Nxd5@8': BENONI_NXD5,
  'benoni-defence::1::Nxd5@8': BENONI_NXD5,
  'benoni-defence::2::Nxd5@8': BENONI_NXD5,
  'benoni-defence::3::Nxd5@8': BENONI_NXD5,
  'benoni-defence::4::Nxd5@8': BENONI_NXD5,
  'benoni-defence::6::Nxd5@8': BENONI_NXD5,

  // ── Sveshnikov (student Black) — c3 Morra try ──
  'sicilian-sveshnikov::0::c3@6': SVESH_C3,
  'sicilian-sveshnikov::1::c3@6': SVESH_C3,
  'sicilian-sveshnikov::2::c3@6': SVESH_C3,
  'sicilian-sveshnikov::3::c3@6': SVESH_C3,
  'sicilian-sveshnikov::4::c3@6': SVESH_C3,
  'sicilian-sveshnikov::5::c3@6': SVESH_C3,
  'sicilian-sveshnikov::7::c3@6': SVESH_C3,

  // ── Catalan (student Black) ──
  'catalan-opening::0::Bb4+@5': CAT_BB4,
  'catalan-opening::2::Bb4+@5': CAT_BB4,
  'catalan-opening::6::Bb4+@5': CAT_BB4,
  'catalan-opening::1::c6@9': CAT_C6,
  'catalan-opening::3::c6@9': CAT_C6,
  'catalan-opening::5::c6@9': CAT_C6,

  // ── Alekhine (student Black) — the Modern main line ──
  'alekhine-defence::2::Nf3@6': ALE_MODERN,
  'alekhine-defence::6::Nf3@6': ALE_MODERN,
  'alekhine-defence::3::d4@4': ALE_MODERN,

  // ── Philidor (student Black) — the Re1 main tabiya ──

  // ── Queen's Gambit (student White) — answering Black's main defences ──

  // ── Budapest Gambit (student Black) — declined with d5 on every tab ──
  'budapest-gambit::0::d5@4': BUDAPEST_D5,
  'budapest-gambit::1::d5@4': BUDAPEST_D5,
  'budapest-gambit::2::d5@4': BUDAPEST_D5,
  'budapest-gambit::3::d5@4': BUDAPEST_D5,
  'budapest-gambit::4::d5@4': BUDAPEST_D5,
  'budapest-gambit::5::d5@4': BUDAPEST_D5,
  'budapest-gambit::6::d5@4': BUDAPEST_D5,

  // ── Four Knights (student White) ──

  // ── Dutch Defence (student Black) — the anti-Dutch Bg5/Bc4 attack ──
  'dutch-defence::3::Bc4@8': {
    intro: {
      say: "Bc4 — White goes for a quick kingside attack in the anti-Dutch, the Bg5-and-Bc4 battery aiming at f7. Don't panic: …e6 blunts the bishop, …d5 claims the centre, and once the early aggression is parried your Leningrad bishop on g7 and the …e5 break give you a full, fighting game. Weather the first wave and Black is fine.",
      sayShort: 'Bc4 — blunt it with …e6, …d5.',
    },
    sources: ['concept:pos-king-safety', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
  },

  // ── Réti (student White) ──

  // ── King's Indian Attack (student White) ──

  // ── Old Indian (student Black) ──

  // ── London System (student White) ──
};

// Merge the base map with the three parallel-session group maps. Each group
// file is owned by ONE session (see the WO), so they never edit the same file.
// Later spreads win on collision — but keys are per-deviation, so groups don't
// overlap in practice.
const MERGED_NARRATION: Record<string, SublineNarration> = {
  ...SUBLINE_NARRATION,
  ...SUBLINE_NARRATION_E4E5,
  ...SUBLINE_NARRATION_E4OTHER,
  ...SUBLINE_NARRATION_D4FLANK,
};

/** Hand-authored narration for a subline, or null to use the honest baseline. */
export function getSublineNarration(
  openingId: string,
  variationIndex: number,
  subline: CourseSubline,
): SublineNarration | null {
  return MERGED_NARRATION[sublineKey(openingId, variationIndex, subline)] ?? null;
}

export const _SUBLINE_NARRATION = MERGED_NARRATION;
