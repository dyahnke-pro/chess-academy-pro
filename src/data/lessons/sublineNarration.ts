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
