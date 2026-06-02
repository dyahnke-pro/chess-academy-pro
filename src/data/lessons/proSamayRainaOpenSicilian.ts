import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Open Sicilian (White). His most-played opening (4,204 games):
// 1.e4 c5 2.Nf3 followed by 3.d4 — the principled Open Sicilian. The main spine
// is the Najdorf-structure he reaches most (…d6/…a6/…e5/…Be7). Two registers per
// beat (G5/G9.4): full Watch `say` + ≤8-word `sayShort`, no move-number prefixes
// in spoken text. Green vision arrows only (never from a pawn); orange move-
// squares auto-painted.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'concept:pos-space', 'https://www.chess.com/openings/Sicilian-Defense-Open', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_OPEN_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-samayraina-open-sicilian',
  title: "This repertoire's Open Sicilian — the principled d4",
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'nf3', moves: 'e4 c5 Nf3 d6 d4',
      arrows: [],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "The Open Sicilian — the most principled, most ambitious answer to the Sicilian. We play Nf3 and then strike with d4, opening the centre. We refuse the quiet anti-Sicilians; we want the full theoretical main lines where White fights for a real edge. This is this repertoire's most-played opening by a mile.",
      sayShort: 'd4 — open the Sicilian.',
    }),
    b({
      id: 'recapture', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3',
      arrows: [A('d4', 'e6'), A('c3', 'd5')],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c3', color: KEY }],
      say: "After cxd4 we recapture with the knight, reaching the classic Open Sicilian structure: a beautiful knight on d4, the e4-pawn, and rapid development. Nf6 hits e4 and we defend it naturally with Nc3. White has a lead in development and central space — the two assets the Open Sicilian is built on.",
      sayShort: 'Nxd4, Nc3 — classic structure.',
    }),
    b({
      id: 'najdorf', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2',
      highlights: [{ square: 'a6', color: SOFT }, { square: 'e2', color: KEY }],
      say: "Black plays the Najdorf with a6 — controlling b5 and preparing queenside expansion. Against it we choose the solid, classical Be2 setup rather than the razor-sharp Bg5 or Be3 lines: develop, castle, and play a long positional game where our space tells. Low theory, high reliability.",
      sayShort: 'Be2 — the classical Najdorf setup.',
    }),
    b({
      id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3',
      arrows: [],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black grabs the centre with e5, kicking the knight, which retreats to b3. This is the great Najdorf trade-off: Black gets central space but concedes the d5-square permanently. Our whole plan now revolves around that hole — a knight will land on d5 and never be dislodged.",
      sayShort: 'Nb3 — and target the d5-hole.',
    }),
    b({
      id: 'develop', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3',
      arrows: [A('e3', 'a7')],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e3', color: KEY }],
      say: "Both sides castle and we develop the bishop to e3, eyeing the queenside and controlling d4. The position is a textbook Najdorf middlegame: White will play Nd5 or maneuver a knight there, push on the queenside with a4, and use the d5-outpost as the anchor of a lasting positional edge.",
      sayShort: 'Be3 — complete the setup.',
    }),
    b({
      id: 'plan', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3',
      arrows: [A('c3', 'd5')],
      highlights: [{ square: 'd5', color: KEY }, { square: 'a4', color: SOFT }],
      say: "The plan from here: maneuver a knight to the d5-outpost (often Nc3-d5 or Nd2-f1-e3-d5), challenge Black's only good minor piece, and expand on the queenside with a4-a5 to cramp Black's b-pawn. White grinds the structural edge; the d5-square is the soul of the whole system.",
      sayShort: 'Plan: Nd5 outpost, a4 queenside.',
    }),
  ],
};
