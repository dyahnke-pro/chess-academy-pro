import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Nimzo-Indian variation lessons. Real data spines.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Nimzo-Indian-Defense',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_NIMZO_INDIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Rubinstein main tab (mirrors the keystone, its own tab) ──
  'pro-aman-nimzo-indian::Rubinstein (e3)': {
    openingId: 'pro-aman-nimzo-indian',
    title: 'Rubinstein Nimzo — the …d5/…c5 Plan',
    minutes: 9,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', arrows: [A('f8', 'b4')], highlights: [H('e4'), H('c3')],
        say: "…Bb4 pins the c3-knight — the Nimzo's defining idea, fighting for e4 with a piece and threatening to wreck White's pawns on c3.",
        sayShort: '…Bb4 — the Nimzo pin.' }),
      b({ id: 'd5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5', highlights: [H('d5')],
        say: "Against the solid e3, Black castles and plays …d5, contesting the centre directly. The pin still bites, so White can't simply expand.",
        sayShort: '…d5 — contest the centre.' }),
      b({ id: 'dxc4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4', highlights: [H('c4')],
        say: "…dxc4 captures with tempo, drawing the bishop to c4. The position opens exactly when Black's pieces are ready for it.",
        sayShort: '…dxc4 — capture with tempo.' }),
      b({ id: 'c5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4 c5', highlights: [H('c5'), H('d4')],
        say: "…c5 — the freeing break. Black hits the d4-pawn, opens lines for the rooks, and reaches a comfortable, dynamic middlegame with the pin still in place. Pin, pressure, punch the centre.",
        sayShort: '…c5 — the freeing break.' }),
    ],
  },

  // ── Bogo-Indian: 3.Nf3 Bb4+ (477 games) ──
  'pro-aman-nimzo-indian::Bogo-Indian (3.Nf3 Bb4+)': {
    openingId: 'pro-aman-nimzo-indian',
    title: 'Bogo-Indian — the …Bb4+ Solid Setup',
    minutes: 8,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'bb4', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+', arrows: [A('f8', 'b4')], highlights: [H('b4')],
        say: "When White plays the knight to f3 first, …Bb4-check is the Bogo-Indian — a check that forces White to commit. Same hypermodern idea as the Nimzo, just a slightly different route: pin, pressure, stay solid.",
        sayShort: '…Bb4+ — the Bogo check.' }),
      b({ id: 'be7', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Be7', arrows: [A('b4', 'e7')], highlights: [H('e7')],
        say: "White blocks with the bishop on d2; Black calmly retreats …Be7. The point: White's bishop is now passively placed on d2, having been provoked there, while Black keeps a flexible, sound structure with no weaknesses.",
        sayShort: '…Be7 — retreat, keep it sound.' }),
      b({ id: 'd5', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Be7 g3 d5', highlights: [H('d5')],
        say: "White fianchettoes with g3, heading into Catalan waters; Black answers …d5, staking a firm claim in the centre. Black's setup is rock-solid and ready to develop smoothly.",
        sayShort: '…d5 — firm central claim.' }),
      b({ id: 'oo', moves: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Be7 g3 d5 Bg2 O-O', highlights: [H('g8')],
        say: "Both sides castle into a balanced middlegame. Black has a sound Catalan-style structure, the bishop pair is intact, and the plan is clear: develop the queenside, contest c4, and equalise with ease.",
        sayShort: '…O-O — balanced, sound game.' }),
    ],
  },

  // ── Classical: 4.Qc2 (121 games) ──
  'pro-aman-nimzo-indian::Classical (4.Qc2)': {
    openingId: 'pro-aman-nimzo-indian',
    title: 'Classical Nimzo — Meeting 4.Qc2',
    minutes: 8,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'qc2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2', highlights: [H('c3')],
        say: "The Classical Variation: White brings the queen to c2 to recapture on c3 with the queen if Black trades, avoiding the doubled pawns the Nimzo usually inflicts. It's the most respected reply — but it costs time and leaves the centre to be fought over.",
        sayShort: 'Qc2 — avoid doubled pawns.' }),
      b({ id: 'oo', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O', highlights: [H('g8')],
        say: "Black castles, getting the king safe and inviting White to show a plan. There's no rush to resolve the b4-bishop's tension — Black keeps the pin and waits for the central break.",
        sayShort: '…O-O — safe, keep the pin.' }),
      b({ id: 'd6', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4 d6', highlights: [H('d6'), H('e5')],
        say: "White grabs the big centre with e4; Black answers …d6, preparing to undermine it with …e5. Against a broad pawn centre, you don't panic — you strike at it with a timely pawn break.",
        sayShort: '…d6 — prepare …e5.' }),
      b({ id: 'nfd7', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4 d6 e5 Nfd7', arrows: [A('f6', 'd7')], highlights: [H('c5'), H('d7')],
        say: "White lunges e5; Black retreats the knight to d7, sidestepping and keeping it ready to hit the e5-pawn and support the …c5 or …f6 breaks. White's centre looks big but it's overextended, and Black will chip away at it from a solid, flexible base.",
        sayShort: '…Nfd7 — sidestep, hit e5.' }),
    ],
  },
};
