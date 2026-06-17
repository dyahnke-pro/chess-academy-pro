import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { CourseSubline } from '../../services/openingCourse';
import type { SublineNarration } from '../../services/sublineLesson';

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
// Slav, sharp Nc3 (the …dxc4 + …b5 / Botvinnik & Geller complex). d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 ...
const SLAV_NC3: SublineNarration = {
  intro: {
    say: "Nc3 — the sharp Slav, steering toward the razor-edged Botvinnik and Anti-Moscow tangles. White develops aggressively and pins with Bg5. The principled answer is to grab the pawn with …dxc4 and hold it with …b5, daring White to prove the gambit while you cling to the extra material behind a wall of queenside pawns. Theory-heavy, but Black is doing fine everywhere.",
    sayShort: 'Nc3 — grab …dxc4, hold with …b5.',
  },
  sources: SLAV_SRC,
};
const ENG_SRC = ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'];
// English (student White) — reversed-Sicilian …d6 setups.
const ENG_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black settles into a reversed-Sicilian setup. This is the English at its finest: you're a full tempo up on a Sicilian, so play it like White with an extra move in hand. Expand on the queenside with Rb1 and b4, lean on the long diagonal with the g2-bishop, and use that spare tempo to get there first.",
    sayShort: '…d6 — expand b4, press the long diagonal.',
  },
  sources: ENG_SRC,
};
// English (student White) — Reversed Dragon …Be6 propping d5.
const ENG_BE6: SublineNarration = {
  intro: {
    say: "…Be6 — Black props up the d5-square in the Reversed Dragon. You're effectively playing a Sicilian Dragon a tempo up: chip at the centre, contest the long light diagonal with your g2-bishop, and use the extra move to seize exactly the initiative the White side only dreams of in the real Dragon.",
    sayShort: '…Be6 — a Dragon up a tempo; press.',
  },
  sources: ENG_SRC,
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
// Queen's Indian → Nc3 transposing to a Nimzo. d4 Nf6 c4 e6 Nc3 Bb4
const QID_NC3: SublineNarration = {
  intro: {
    say: "Nc3 — and this slides straight into Nimzo-Indian territory. Answer …Bb4, pinning the knight and contesting e4 just as you would in the Nimzo proper. The Queen's Indian and the Nimzo are sisters — whichever way White moves, you reach a comfortable, well-charted structure with easy equality.",
    sayShort: 'Nc3 — transpose: pin with …Bb4.',
  },
  beats: [
    { atMove: 5, say: "…Bb4 — and you've transposed into a full Nimzo-Indian. The bishop pins the c3-knight, the piece that controls the central e4-square, so right away you're fighting for the key light square White wants. The plan is pure Nimzo: trade the bishop for the knight to wreck White's c-pawns, or hold the pin and keep squeezing. Either road is comfortable.", highlights: [H('c3', KEY), H('e4', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// Scotch declined with …d6 (student White). e4 e5 Nf3 Nc6 d4 d6 Bb5 Bd7
const SCOTCH_D6: SublineNarration = {
  intro: {
    say: "…d6 — Black declines the Scotch tension passively, propping up e5 instead of taking on d4. Make him pay for the meekness: Bb5 pins the c6-knight, you keep the central pawn duo, and with a clean space edge and faster development you press a comfortable, risk-free pull.",
    sayShort: '…d6 — pin Bb5, keep the space.',
  },
  beats: [
    { atMove: 6, say: "Bb5 — clamp down on the passivity. Black's meek …d6 left the c6-knight tied to defending e5, so you pin it to the king and pile on. With your pawns already abreast on d4 and e4 you simply own more space and quicker development — squeeze the cramped position and the small edge grows.", highlights: [H('c6', KEY), H('e5', SOFT)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scotch_Game'],
};
// Grünfeld Exchange — the critical main line (student Black).
// d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5
const GRUN_EXCHANGE: SublineNarration = {
  intro: {
    say: "cxd5 — the Exchange Grünfeld, the critical main line and the whole point of the opening. White builds the broad d4-e4 pawn centre; your entire strategy is to tear it down. The g7-bishop rakes it on the long diagonal, …c5 and …Bg4 and …Nc6 pile on, and if that centre cracks White is simply worse. You invite the big centre precisely so you can demolish it.",
    sayShort: 'cxd5 — Exchange: demolish the centre.',
  },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// Grünfeld Fianchetto (quiet g3). d4 Nf6 c4 g6 g3 Bg7 Bg2 O-O
const GRUN_G3: SublineNarration = {
  intro: {
    say: "g3 — the quiet Fianchetto Grünfeld, where White declines the big centre and develops calmly. There's no pressure to react to, so equalise cleanly: castle, hit the centre with …d5, and if White grabs on c4 you regain it comfortably. A balanced, healthy game with no weaknesses.",
    sayShort: 'g3 — castle and break …d5.',
  },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
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

const RUY_SRC = ['book:ruy-lopez', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const IT_SRC = ['book:italian-game', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'];
const SIC_SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];

// Ruy (student White). The same Black replies surface across several tabs.
// …Be7 — the Closed Ruy main line (72%). e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7
const RUY_BE7: SublineNarration = {
  intro: {
    say: "Be7 — the Closed Ruy Lopez, the main road and the richest middlegame in all of chess. Black develops solidly and prepares to castle. Now you unfurl the great Spanish build-up: c3 to prepare d4, Re1 to back the e-pawn, and the famous knight tour Nbd2-f1-g3, swinging the knight toward the kingside. You're playing for a slow, suffocating central clamp.",
    sayShort: 'Be7 — Closed Ruy: build c3 and d4.',
  },
  sources: RUY_SRC,
};
// …Na5 — the Chigorin (18%). …c3 Na5
const RUY_NA5: SublineNarration = {
  intro: {
    say: "Na5 — the Chigorin, the classical Closed Ruy plan: Black chases your prized light-squared bishop off the a2-g8 diagonal. Don't allow the trade — retreat Bc2, where the bishop swings onto the b1-h7 diagonal aimed at Black's king instead. The knight on a5 is offside on the rim, and you'll claim the centre with d4 while it sulks.",
    sayShort: 'Na5 — keep the bishop: Bc2.',
  },
  sources: RUY_SRC,
};
// Italian (student White). …d6 — the quiet Pianissimo (28%). e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6
const IT_D6: SublineNarration = {
  intro: {
    say: "…d6 — the quiet Giuoco Pianissimo, where Black props the e5-pawn and keeps everything solid. No fireworks, so you build slowly: d3, the Ruy-style knight tour Nbd2-f1-g3, castle, and prepare a later d4 or kingside expansion. This is the modern main-line Italian — patient maneuvering where small, lasting space is the whole game.",
    sayShort: '…d6 — quiet Italian: build slowly.',
  },
  sources: IT_SRC,
};
// …Nf6 — the Two Knights (44%). e4 e5 Nf3 Nc6 Bc4 Nf6
const IT_NF6: SublineNarration = {
  intro: {
    say: "…Nf6 — the Two Knights, the aggressive reply, striking your e4-pawn at once and inviting a brawl. You have a real choice here: the swashbuckling Ng5 lunging straight at f7, or the principled centre break d4 (both covered in the variation lessons). Black has picked the sharpest battleground in the Italian — meet it head-on.",
    sayShort: '…Nf6 — Two Knights: d4 or Ng5.',
  },
  beats: [
    { atMove: 5, say: "…Nf6 hits e4 immediately, refusing the quiet game. This is the move that makes the Italian sharp — and both the d4 break and the f7-lunge Ng5 are yours to choose.", highlights: [H('e4', KEY)] },
  ],
  sources: IT_SRC,
};
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

// Two Knights → White switches to a Ruy with Bb5 (student Black).
const TK_BB5: SublineNarration = {
  intro: {
    say: "Bb5 — White sidesteps the Two Knights and transposes to a Ruy Lopez. Nothing to fear: put the question with …a6, and you're in familiar Spanish territory. Keep the bishop guessing, develop solidly, and the game is balanced and well-charted.",
    sayShort: "Bb5 — it's a Ruy: …a6.",
  },
  beats: [
    { atMove: 5, say: "…a6 — the Morphy move, putting the bishop on the spot at once. After Ba4 it clings to the diagonal, but now you hold …b5 in reserve to kick it away whenever you please. In one move you've turned White's anti-Italian into a main-line Ruy Lopez where you know every plan.", highlights: [H('b5', KEY)] },
  ],
  sources: ['book:italian-game', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Two_Knights_Defense'],
};
// Anti-Benoni: White recaptures on d5 with the knight (student Black).
const BENONI_NXD5: SublineNarration = {
  intro: {
    say: "Nxd5 — White recaptures with the knight, ducking the sharp Modern Benoni structure for a quiet game. That suits you fine: trade with …Nxd5 and develop freely. Without the locked d5-pawn cramping you, Black equalises easily with active, unobstructed pieces.",
    sayShort: 'Nxd5 — trade off, free game.',
  },
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

  // Caro-Kann, Two Knights with …Bg4 (var 2) — White's dominant continuation,
  // grabbing space with e5. Line:
  // e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 e5 c5
  'caro-kann::2::e5@12': {
    intro: {
      say: "e5 — White grabs the centre and shifts into an Advance-style structure, by far the most common path here, over half the games. But you've already swapped your light bishop for the f3-knight, so you carry no bad piece into this — answer in true Caro style by hitting the base of the chain with …c5.",
      sayShort: 'e5 — strike back with …c5.',
    },
    beats: [
      { atMove: 13, say: "…c5 — hammering d4, the foot of White's d4-e5 pawn chain. This is the Caro's whole method: undermine the chain at its base rather than sit and defend. With your problem bishop long gone and no weaknesses to nurse, you get a free, comfortable game against the broad centre.", highlights: [H('d4', KEY), H('c5', ATK)] },
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

  // Caro-Kann, Fantasy / Maróczy (var 4) — c3 props the centre. Line:
  // e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 c5 a3 c4
  'caro-kann::4::c3@10': {
    intro: {
      say: "c3 — White props the centre in the Fantasy after you've already struck with …e5. The Maróczy treatment. You keep the initiative on the queenside with …c5 and then …c4, clamping the position and fixing White's pawns before you turn the attack toward the king.",
      sayShort: 'c3 — clamp with …c5 and …c4.',
    },
    beats: [
      { atMove: 11, say: "…c5 — a second hammer on d4, joining the …e5-pawn that is already leaning on it. White's propped-up centre is suddenly carrying a real load, and you have all the easy, natural moves.", highlights: [H('d4', KEY), H('c5', ATK)] },
      { atMove: 13, say: "…c4 — grabbing queenside space and clamping the structure. With the centre locked in your favour and your pieces free, the game now belongs on the kingside, where you hold the easier attack.", highlights: [H('c4', ATK)] },
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

  // French Classical, Burn Variation (var 5) — Bxf6. Line:
  // e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Bxf6 gxf6 Nxe4 f5 a3 f4
  'french-defence::5::Bxf6@8': {
    intro: {
      say: "Bxf6 — the Burn Variation. White trades on f6 to win back the e4-pawn cleanly. You recapture toward the centre with …gxf6, accepting doubled f-pawns for a serious payoff: the half-open g-file pointing at White's king, the bishop pair, and a mobile pawn mass you'll roll forward with …f5-f4.",
      sayShort: 'Bxf6 — recapture …gxf6, open the g-file.',
    },
    beats: [
      { atMove: 9, say: "…gxf6 — doubling the f-pawns by choice. In exchange the g-file tears open toward White's king and you keep the bishop pair. These pawns aren't a weakness to defend; they're a battering ram to attack with.", highlights: [H('f6', KEY)] },
      { atMove: 13, say: "…f4 — the pawns roll. You seize kingside space and cramp White's pieces, the …f5-f4 wedge gaining ground while the bishop pair and the open g-file do the heavy work.", highlights: [H('f4', ATK)] },
    ],
    sources: FR_SRC,
  },

  // French Rubinstein, sharp f3 try (var 9). Line:
  // e4 e6 d4 d5 Nc3 dxe4 f3 Bb4 fxe4 Qh4+ g3 e5 a3 a6
  'french-defence::9::f3@6': {
    intro: {
      say: "f3 — White tries to build a broad centre by recapturing on e4 with the f-pawn. You strike before he can settle: …Bb4 pins, and after fxe4 the bombshell …Qh4+ rips into the loosened kingside, then …e5 blasts the half-built centre open while White's king is still stuck on e1. Sharp, forcing, and a joy to play for Black.",
      sayShort: 'f3 — hit back: …Bb4 and …Qh4+.',
    },
    beats: [
      { atMove: 7, say: "…Bb4 — the pin comes first, freezing the c3-knight before White can prop up his centre. Now the f3-f-pawn push to recapture on e4 will leave the e1-h4 diagonal fatally bare.", highlights: [H('c3', KEY)] },
      { atMove: 11, say: "…e5 — the follow-through. The check already forced g3, loosening White's kingside dark squares for good; now you smash open the centre while White's king still sits on e1, uncastled and exposed.", highlights: [H('e5', ATK), H('g3', SOFT)] },
    ],
    sources: FR_SRC,
  },

  // ── Ruy Lopez (student White) ──
  'ruy-lopez::3::Be7@9': RUY_BE7,
  'ruy-lopez::7::Be7@9': RUY_BE7,
  'ruy-lopez::0::Na5@15': RUY_NA5,
  'ruy-lopez::1::Na5@15': RUY_NA5,
  'ruy-lopez::2::Na5@15': RUY_NA5,
  // …a6 — the Morphy Defence (71%). e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6
  'ruy-lopez::4::a6@5': {
    intro: {
      say: "…a6 — the Morphy Defence, by far Black's main reply, putting the question to your bishop. The principled answer is Ba4: keep the bishop rather than trade it, holding the pressure on the c6-knight and reserving the strong retreat to b3. This is the gateway to the entire main-line Ruy.",
      sayShort: '…a6 — keep the bishop: Ba4.',
    },
    beats: [
      { atMove: 6, say: "Ba4 — retreat, but keep the bishop alive. It still eyes the c6-knight down the diagonal, with the powerful drop to b3 in reserve, aiming toward f7 and the centre. You decline the trade and keep every drop of Spanish pressure.", highlights: [H('c6', KEY)] },
    ],
    sources: RUY_SRC,
  },
  // …d6 — Closed Ruy with …d6 (7%). e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 d6
  'ruy-lopez::5::d6@11': {
    intro: {
      say: "…d6 — Black bolsters the e5-pawn in Closed-Ruy style before committing the knight. Nothing changes about your plan: c3 and d4 for the big centre, and the Nbd2-f1-g3 tour to the kingside. Solid from Black, but slightly passive — you take the space and the initiative.",
      sayShort: '…d6 — build c3 and d4 anyway.',
    },
    sources: RUY_SRC,
  },
  'ruy-lopez::6::d6@11': {
    intro: {
      say: "…d6 — Black bolsters the e5-pawn in Closed-Ruy style before committing the knight. Nothing changes about your plan: c3 and d4 for the big centre, and the Nbd2-f1-g3 tour to the kingside. Solid from Black, but slightly passive — you take the space and the initiative.",
      sayShort: '…d6 — build c3 and d4 anyway.',
    },
    sources: RUY_SRC,
  },
  // bxc6 — the Exchange Ruy (12%). e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 bxc6 O-O
  'ruy-lopez::8::bxc6@7': {
    intro: {
      say: "The Exchange Ruy — you've traded on c6 and …bxc6 recaptures. Here's your long-term trump: Black now has doubled c-pawns and a queenside majority that can never manufacture a passed pawn, while your clean kingside majority can. Castle, trade pieces, and steer for the endgame where that structural edge tells — Fischer's favourite way to play the Spanish.",
      sayShort: 'bxc6 — play the Exchange endgame.',
    },
    beats: [
      { atMove: 8, say: "O-O — and the plan is set: aim for the endgame. Your kingside majority is healthy and can roll to a passed pawn; Black's doubled c-pawns make his extra queenside pawn worthless. Trade pieces, keep the structure, grind it home.", highlights: [H('c6', KEY)] },
    ],
    sources: RUY_SRC,
  },

  // ── Italian Game (student White) ──
  'italian-game::0::d6@7': IT_D6,
  'italian-game::1::d6@7': IT_D6,
  'italian-game::6::d6@7': IT_D6,
  'italian-game::2::Nf6@5': IT_NF6,
  'italian-game::3::Nf6@5': IT_NF6,

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
  'kings-indian-defence::4::Nc3@4': {
    intro: {
      say: "Nc3 — White heads straight into the main King's Indian. Nothing fancy is needed: complete the setup with …d6, castle, and play the thematic …e5 break. Once the centre locks, the King's Indian race is on — your kingside pawn storm against White's queenside expansion.",
      sayShort: 'Nc3 — main KID: …d6, …O-O, …e5.',
    },
    sources: KID_SRC,
  },
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
  'slav-defence::0::e3@6': SLAV_E3,
  'slav-defence::2::e3@6': SLAV_E3,
  'slav-defence::4::e3@6': SLAV_E3,
  'slav-defence::5::e3@6': SLAV_E3,
  'slav-defence::6::e3@6': SLAV_E3,
  'slav-defence::3::Nc3@6': SLAV_NC3,
  'slav-defence::7::Nc3@6': SLAV_NC3,
  'slav-defence::1::Nc3@8': {
    intro: {
      say: "Nc3 in the Exchange Slav — White has already released the tension with cxd5, signalling for a quiet, symmetrical game. There's no danger: develop naturally, get the light bishop out with …Bf5, and contest the half-open c-file. The symmetry only looks drawish — with active pieces Black is the one who can press for more.",
      sayShort: 'Nc3 — …Bf5, contest the c-file.',
    },
    sources: SLAV_SRC,
  },

  // ── English Opening (student White) ──
  'english-opening::2::d6@11': ENG_D6,
  'english-opening::4::d6@9': ENG_D6,
  'english-opening::0::Be6@13': ENG_BE6,
  'english-opening::6::Be6@13': ENG_BE6,
  'english-opening::1::Bd7@17': {
    intro: {
      say: "…Bd7 — Black completes a solid Symmetrical English setup. The game is balanced and maneuvering; the winning try is to make the first imbalance yourself. Roll the queenside with Rb1, b4 and a steady space grab, and turn your move-one head start into a lasting initiative on that wing.",
      sayShort: '…Bd7 — grind the queenside with b4.',
    },
    sources: ENG_SRC,
  },
  'english-opening::7::Bd7@17': {
    intro: {
      say: "…Bd7 — Black completes a solid Symmetrical English setup. The game is balanced and maneuvering; the winning try is to make the first imbalance yourself. Roll the queenside with Rb1, b4 and a steady space grab, and turn your move-one head start into a lasting initiative on that wing.",
      sayShort: '…Bd7 — grind the queenside with b4.',
    },
    sources: ENG_SRC,
  },
  'english-opening::3::f5@5': {
    intro: {
      say: "…f5 — the Reversed Grand Prix, Black grabbing kingside space aggressively. It's double-edged and slightly loosening: meet it calmly, finish your fianchetto, strike with d4 at the right moment, and the holes Black left around his own king become your targets.",
      sayShort: '…f5 — stay calm, hit back with d4.',
    },
    sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/English_Opening'],
  },

  // ── Nimzo-Indian (student Black) ──
  'nimzo-indian::0::Nf3@4': NIMZO_NF3,
  'nimzo-indian::1::Nf3@4': NIMZO_NF3,
  'nimzo-indian::2::Nf3@4': NIMZO_NF3,
  'nimzo-indian::4::Nf3@4': NIMZO_NF3,
  'nimzo-indian::5::Nf3@4': NIMZO_NF3,
  'nimzo-indian::6::Nf3@4': NIMZO_NF3,
  'nimzo-indian::7::Nf3@4': NIMZO_NF3,
  'nimzo-indian::3::Bxf6@8': {
    intro: {
      say: "Bxf6 — White trades the pinning bishop to dent your structure. Recapture toward the centre with …Qxf6: yes, White takes the bishop pair, but you keep the Nimzo's real trump — you'll play …Bxc3 to saddle him with doubled c-pawns and then strike with …e5, a fine, fighting game where the structure is yours to exploit.",
      sayShort: 'Bxf6 — …Qxf6; play on the c-pawns.',
    },
    sources: QP_SRC,
  },

  // ── Queen's Indian (student Black) — Nc3 transposes to a Nimzo on every tab ──
  'queens-indian::0::Nc3@4': QID_NC3,
  'queens-indian::1::Nc3@4': QID_NC3,
  'queens-indian::2::Nc3@4': QID_NC3,
  'queens-indian::3::Nc3@4': QID_NC3,
  'queens-indian::4::Nc3@4': QID_NC3,
  'queens-indian::5::Nc3@4': QID_NC3,
  'queens-indian::6::Nc3@4': QID_NC3,

  // ── Semi-Slav (student Black) — quiet e3 …Bf5 on every tab (same as the Slav) ──
  'semi-slav::0::e3@6': SLAV_E3,
  'semi-slav::1::e3@6': SLAV_E3,
  'semi-slav::2::e3@6': SLAV_E3,
  'semi-slav::3::e3@6': SLAV_E3,
  'semi-slav::4::e3@6': SLAV_E3,
  'semi-slav::5::e3@6': SLAV_E3,
  'semi-slav::6::e3@6': SLAV_E3,

  // ── Scotch Game (student White) — …d6 decline on every tab ──
  'scotch-game::0::d6@5': SCOTCH_D6,
  'scotch-game::1::d6@5': SCOTCH_D6,
  'scotch-game::2::d6@5': SCOTCH_D6,
  'scotch-game::3::d6@5': SCOTCH_D6,
  'scotch-game::4::d6@5': SCOTCH_D6,
  'scotch-game::5::d6@5': SCOTCH_D6,
  'scotch-game::6::d6@5': SCOTCH_D6,
  'scotch-game::7::d6@5': SCOTCH_D6,

  // ── Grünfeld Defence (student Black) ──
  'grunfeld-defence::2::cxd5@6': GRUN_EXCHANGE,
  'grunfeld-defence::0::g3@4': GRUN_G3,
  'grunfeld-defence::1::g3@4': GRUN_G3,
  'grunfeld-defence::6::g3@4': GRUN_G3,
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
  'vienna-game::0::O-O@13': {
    intro: {
      say: "Black castles into the Vienna Gambit tabiya. You gave the f-pawn for a real lead in development and the open f-file pointing at Black's king. Now pour it on: the rook belongs on f1, the queen is already active on e2, and your central pawns roll. The Vienna Gambit punishes anyone who treats it like a quiet opening.",
      sayShort: 'O-O — press the f-file attack.',
    },
    sources: ['concept:pos-initiative', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  },
  'vienna-game::2::h6@11': {
    intro: {
      say: "…h6 — Black keeps it quiet in the slow Vienna with d3. No gambit here, so play the long game: castle, complete development, and prepare the f4 break or the Nbd2-f1-g3 regroup toward the kingside. A small, safe space edge you can nurse for a long time.",
      sayShort: '…h6 — build slowly toward f4.',
    },
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Vienna_Game'],
  },

  // ── Petrov Defence (student Black) ──
  'petrov-defence::3::Bc4+@10': {
    intro: {
      say: "The Cochrane Gambit — White has just hurled a knight onto f7 to drag your king into the open. It looks terrifying and it is completely sound for you: you're a piece up for two pawns, and the entire game now hinges on one idea — get the king safe and the extra material wins itself. Don't grab, don't panic; just tuck the king away.",
      sayShort: 'Cochrane — get the king safe.',
    },
    beats: [
      { atMove: 7, say: "…Kxf7 — you take the knight, because you must and because you should. White has spent a whole piece for two pawns and a few checks; if your king reaches safety, nothing else he has can replace that piece. The fear is the only weapon White has left.", highlights: [H('f7', KEY)] },
      { atMove: 11, say: "…d5! — the move that defuses the whole gambit. The pawn jams onto d5 and slams shut the c4-bishop's diagonal to your king, snuffing the check while giving nothing back. From here you simply walk the king to g8, untangle with …Re8, and the piece tells.", highlights: [H('d5', ATK), H('c4', KEY)] },
      { atMove: 13, say: "…a6 — a quiet luxury move that takes b5 away from White's pieces, and that says everything: the storm has blown out, your king is safe, and you're a piece up for two pawns. The Cochrane is a bluff, and you've called it.", highlights: [H('a6', SOFT), H('b5', KEY)] },
    ],
    sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
  },
  'petrov-defence::1::O-O@10': {
    intro: {
      say: "The Petrov main line — the defence you reach for when you want a fortress. Its logic is pure symmetry: you don't defend the e5-pawn, you counter-grab on e4, and from there everything White tries, you can answer in kind. By move ten you've castled into a position with no weaknesses and nothing for an attacker to bite on.",
      sayShort: 'Petrov main — symmetry, then castle.',
    },
    beats: [
      { atMove: 5, say: "…Nxe4 — the heart of the Petrov. Rather than passively guard e5, you snatch the e4-pawn and let the symmetry work for you. Whatever White does to your knight, you have the mirror — that balance is exactly why this defence is so hard to beat.", highlights: [H('e4', ATK)] },
      { atMove: 7, say: "…d5 — the key support, anchoring your e4-knight on its outpost so it can't be cheaply chased, and at the same time opening a free diagonal for your light-squared bishop. This little pawn is what makes the whole structure hold together.", highlights: [H('d5', ATK), H('e4', KEY)] },
      { atMove: 9, say: "…Nd7 — developing while challenging White's advanced e5-knight head-on, offering the trade that dissolves any pressure. Simple, solid, symmetrical: White is left with a position that simply refuses to give him a target.", highlights: [H('e5', KEY)] },
    ],
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'],
  },

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
  'two-knights-defence::1::Bb5@4': TK_BB5,
  'two-knights-defence::2::Bb5@4': TK_BB5,
  'two-knights-defence::3::Bb5@4': TK_BB5,
  'two-knights-defence::4::Bb5@4': TK_BB5,
  'two-knights-defence::5::Bb5@4': TK_BB5,
  'two-knights-defence::6::Bb5@4': TK_BB5,
  'two-knights-defence::7::Bb5@4': TK_BB5,

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
  'philidor-defence::1::Re1@12': {
    intro: {
      say: "Re1 — the main Philidor tabiya. White stacks the e-file behind his big centre, and you're solid but cramped. The cure is patience and timing: prepare …c6 and …Qc7, take on d4 at the right moment with …exd4, and aim for the freeing …d5 break. Hold the line accurately and the cramp dissolves into a sound game.",
      sayShort: 'Re1 — free up with …c6 and …d5.',
    },
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Philidor_Defence'],
  },

  // ── Queen's Gambit (student White) — answering Black's main defences ──
  'queens-gambit::3::a6@9': {
    intro: {
      say: "…a6 — the Queen's Gambit Accepted main line; Black prepares …b5 to hold the c4-pawn and free the light bishop. You've already recaptured and built a fine centre, so meet …b5 head-on with a4 to crack the queenside, or just complete development and roll your central majority. White keeps a pleasant, lasting initiative.",
      sayShort: '…a6 — meet …b5 with a4.',
    },
    sources: QP_SRC,
  },
  'queens-gambit::4::e6@7': {
    intro: {
      say: "…dxc4 and …g5 — Black plunges into the razor-edged Botvinnik Semi-Slav, grabbing the pawn and lashing out on the kingside. This is theory to the teeth: your trumps are the big e4-centre and a roaring initiative. Both kings will be hunted — know the line, and White's attack arrives with crushing force.",
      sayShort: 'Botvinnik — roll e4, attack.',
    },
    sources: QP_SRC,
  },

  // ── Budapest Gambit (student Black) — declined with d5 on every tab ──
  'budapest-gambit::0::d5@4': BUDAPEST_D5,
  'budapest-gambit::1::d5@4': BUDAPEST_D5,
  'budapest-gambit::2::d5@4': BUDAPEST_D5,
  'budapest-gambit::3::d5@4': BUDAPEST_D5,
  'budapest-gambit::4::d5@4': BUDAPEST_D5,
  'budapest-gambit::5::d5@4': BUDAPEST_D5,
  'budapest-gambit::6::d5@4': BUDAPEST_D5,
};

/** Hand-authored narration for a subline, or null to use the honest baseline. */
export function getSublineNarration(
  openingId: string,
  variationIndex: number,
  subline: CourseSubline,
): SublineNarration | null {
  return SUBLINE_NARRATION[sublineKey(openingId, variationIndex, subline)] ?? null;
}

export const _SUBLINE_NARRATION = SUBLINE_NARRATION;
