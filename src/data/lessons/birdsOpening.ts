import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision/intent), YELLOW
// highlights (a key square the narration names), SOFT blue (secondary).
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// Bird's Classical (kingside attack) main line — matches repertoire.json's
// birds-opening.pgn prefix; masters-backed, chess.js FENs.
// f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 Qe1 Nc6 Nc3 d4 Nd1 dxe3 Nxe3 Nd5
const M = 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 Qe1 Nc6 Nc3 d4 Nd1 dxe3 Nxe3 Nd5'.split(' ');

/**
 * Bird's Opening — A Master Class (White). 1.f4: a reversed Dutch. White grabs
 * the e5-square, builds a kingside attacking structure, and reroutes the queen
 * via e1-h4. Grounded on universal principles (the e5 outpost, kingside space,
 * the f-file) + the DB moves.
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
      say: "1.f4 — Bird's Opening, named for the English master Henry Bird. It is the Dutch Defence with an extra move: White stakes an immediate claim on the e5-square, the outpost the whole opening revolves around. White wants to plant a knight on e5, build a kingside pawn and piece presence, and attack the enemy king. It is offbeat, it is sound, and it drags Black into a structure most opponents have never studied.",
      sayShort: 'f4 — claim e5, the reversed Dutch.',
    },
    {
      id: 'setup',
      moves: ['f4', 'd5', 'Nf3', 'Nf6', 'e3', 'g6', 'Be2', 'Bg7', 'O-O', 'O-O'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Both sides build naturally. Black takes the centre with d5 and fianchettoes; White develops Nf3 to control e5, plays the modest e3, and tucks the bishop on e2 before castling. This is the classical Bird set-up — quiet, flexible, and aimed at one idea: the e5-square is White's, and everything that follows is about exploiting it.",
      sayShort: 'Nf3, e3, Be2, O-O — the Bird set-up.',
    },
    {
      id: 'queen-lift',
      moves: ['f4', 'd5', 'Nf3', 'Nf6', 'e3', 'g6', 'Be2', 'Bg7', 'O-O', 'O-O', 'd3', 'c5', 'Qe1'],
      arrows: [{ from: 'e1', to: 'h4', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }],
      say: "Here is the signature of the whole opening: Qe1. The queen steps off the d-file not to do nothing, but to begin a march — Qe1-h4, swinging to the kingside where Black has just weakened the dark squares with g6. d3 props the centre, Black expands with c5, and White quietly loads the attack. Few amateurs see the queen lift coming.",
      sayShort: 'Qe1 — the queen heads for h4.',
    },
    {
      id: 'reroute',
      moves: ['f4', 'd5', 'Nf3', 'Nf6', 'e3', 'g6', 'Be2', 'Bg7', 'O-O', 'O-O', 'd3', 'c5', 'Qe1', 'Nc6', 'Nc3', 'd4', 'Nd1', 'dxe3', 'Nxe3'],
      arrows: [{ from: 'e3', to: 'd5', color: VIS }],
      highlights: [{ square: 'e3', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black grabs space with d4, trying to jam White's queenside knight. White calmly reroutes — Nc3-d1 — lets Black release the tension with dxe3, and recaptures Nxe3. Now the knight on e3 is beautifully placed, eyeing d5, f5 and g4. White has untangled, kept the e5-square, and still has the Qh4 attack in reserve.",
      sayShort: 'Nd1-e3 — reroute; the knight eyes d5 and f5.',
    },
    {
      id: 'attack',
      moves: M,
      highlights: [{ square: 'e5', color: KEY }, { square: 'h4', color: SOFT }],
      say: "Black blockades with Nd5, but White's game plays itself from here. The plan is timeless Bird's: a knight to e5, the queen to h4, the f-file pried open with the f-pawn, and the dark-squared bishop and rook pouring toward Black's king. White took a quiet, offbeat first move and reached a position with a clear attacking blueprint while Black is still finding his way. That is the whole pitch of the Bird: skip the theory, claim e5, and go after the king.",
      sayShort: 'Ne5 and Qh4 — the kingside attack looms.',
    },
  ],
};
