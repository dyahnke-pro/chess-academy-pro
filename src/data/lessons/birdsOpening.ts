import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision/intent), YELLOW
// highlights (a key square the narration names), SOFT blue (secondary).
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// Bird's Opening — the MODERN, sound Leningrad set-up (g3/Bg2), re-anchored
// 2026-06-16 off the passive Classical e3 line (which drifts to ~-1.8 for White
// and scores 38% at masters). This line is engine-verified +0.16 for White and
// scores 64% masters / 59% club at the e4-break terminus — White is genuinely
// better. Aggressive-by-design: the whole plan is the e4 central break.
// f4 d5 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 c5 Nc3 Nc6 e4 dxe4 dxe4
// (move order matches the canonical "Bird's Opening: Leningrad Formation" DB
// entry for G3 anchoring; transposes to the same position.)
const M = 'f4 d5 Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 c5 Nc3 Nc6 e4 dxe4 dxe4'.split(' ');

/**
 * Bird's Opening — A Master Class (White). 1.f4 in the modern Leningrad set-up:
 * White fianchettoes with g3/Bg2, clamps the e5-square, and prepares the e4
 * central break. After ...dxe4 dxe4 White owns a broad e4+f4 pawn duo, a fully
 * open d-file, and the e5 outpost — a slight but real pull. Grounded on
 * universal principles (the central break, the e5 outpost, the open file) + the
 * DB moves; engine-verified sound and winning at the buyer's level.
 */
export const BIRDS_OPENING_LESSON: LessonScript = {
  openingId: 'birds-opening',
  sources: [
    'concept:pos-outpost',
    'concept:pos-space',
    'https://en.wikipedia.org/wiki/Bird%27s_Opening',
  ],
  title: "Bird's Opening — A Master Class",
  minutes: 12,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['f4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: KEY }],
      say: "1.f4 — Bird's Opening, named for the English master Henry Bird. It is the Dutch Defence with an extra move: White stakes an immediate claim on the e5-square, the outpost the whole opening revolves around. White wants to dominate e5, build central and kingside space, and drag Black into a structure most opponents have never studied. It is offbeat, it is sound, and as White you are the one with the extra tempo.",
      sayShort: 'f4 — claim e5, the reversed Dutch.',
    },
    {
      id: 'fianchetto',
      moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O'],
      highlights: [{ square: 'e5', color: KEY }, { square: 'g2', color: SOFT }],
      say: "This is the modern, sound way to handle the Bird: g3 and Bg2, the Leningrad set-up. White fianchettoes, castles, and points the bishop down the long diagonal toward the centre. The f4-pawn and the knight on f3 together clamp the e5-square, and unlike the old, passive Be2 lines this version is fully respectable — White scores well over fifty percent from here in master play.",
      sayShort: 'g3, Bg2, O-O — the Leningrad set-up.',
    },
    {
      id: 'prep',
      moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "d3 looks modest, but it has one job: it clears the way for the e-pawn and braces the coming break on e4. Black grabs queenside space with c5 and develops naturally, but the position is quietly loading. White is not drifting — every piece is being aimed at one central lever.",
      sayShort: 'd3 — prepare the e4 break.',
    },
    {
      id: 'develop',
      moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'Nc3', 'Nc6'],
      highlights: [{ square: 'e4', color: KEY }],
      say: "Nc3 completes development and adds a second piece pointing at e4 — the break needs support before it fires. Both armies are out, both kings are safe, and the whole game now turns on a single square in the centre. White finishes the build and reaches for the lever.",
      sayShort: 'Nc3 — develop, back the e4 break.',
    },
    {
      id: 'break',
      moves: M,
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'e4', color: KEY }, { square: 'd1', color: SOFT }],
      say: "e4 — the point of the entire set-up. White strikes the centre, and after the pawns come off, White owns a broad e4 and f4 duo, a fully open d-file where the heavy pieces will fight, and the e5-square covered by the f-pawn — a natural home for a knight. The engine confirms it: White stands better here, and scores around sixty percent. From a quiet, offbeat first move, White has reached a position with central space, the open file, and the knight eyeing e5.",
      sayShort: 'e4 — take the centre, own e5.',
    },
    {
      id: 'pull',
      moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'Nc3', 'Nc6', 'e4', 'dxe4', 'dxe4', 'Qxd1', 'Rxd1', 'e5'],
      highlights: [{ square: 'd1', color: KEY }, { square: 'e5', color: SOFT }, { square: 'e4', color: SOFT }],
      say: "Black's soundest reply is to defuse the plan: trade queens on d1 and strike with ...e5, contesting the centre before a White knight can settle. But White is still the one pressing — the d-file is open and White's rook already sits on it, the centre stays tense, and White keeps a small, durable edge with the freer game. No fireworks required. That is the honest pitch of the modern Bird: an offbeat first move that hands White a sound, slightly better position, with the easier play and almost no theory to memorise.",
      sayShort: '...e5 — Black frees up; White keeps the pull.',
    },
  ],
};
