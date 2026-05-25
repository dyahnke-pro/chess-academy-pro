import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Schliemann Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Sharp gambit lines that resolve early → `kind: 'roadmap'` (depth opt-out).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Schliemann_Defense'];

export const SCHLIEMANN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'schliemann-defence::Schönemann Attack': {
    openingId: 'schliemann-defence', title: 'Schliemann — The Schönemann (4.d4)', minutes: 7, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'sc1', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d4', say: "The Schönemann — White answers the …f5 thrust with the central counter 4.d4, opening lines fast to exploit Black's loosened kingside. The most direct test: White meets a flank strike with a blow in the centre.", sayShort: '4.d4 — White hits back in the centre.', highlights: [H('d4')] }),
      b({ id: 'sc2', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d4 fxe4 Nxe5 Nxe5 dxe5', say: "…fxe4 captures, and after the knight trades on e5 — Nxe5 …Nxe5 dxe5 — Black has a passed pawn on e4 and White a pawn on e5. The position is wide open, exactly the sharp fight the Schliemann player wants.", sayShort: '…fxe4 — open the position wide.', highlights: [H('e4'), H('e5')] }),
      b({ id: 'sc3', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d4 fxe4 Nxe5 Nxe5 dxe5 c6', say: "…c6 questions the b5-bishop, gaining a tempo and clarifying the queenside. There is the Schönemann tabiya: a sharp, open middlegame with the bishop pair and a passed e4-pawn for Black — full compensation and a real fight after White's most aggressive try.", sayShort: '…c6 — kick the bishop, open game.', highlights: [H('c6'), H('e4', SOFT)] }),
    ],
  },

  'schliemann-defence::Jänisch Gambit Accepted': {
    openingId: 'schliemann-defence', title: 'Schliemann — The Jänisch Accepted (4.exf5)', minutes: 7, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'j1', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 exf5', say: "White simply grabs the gambit pawn with 4.exf5. But accepting the pawn costs time and opens the f-file, and Black gets exactly the open, dynamic position the gambit is played for.", sayShort: '4.exf5 — White grabs the pawn.', highlights: [H('f5')] }),
      b({ id: 'j2', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 exf5 e4', say: "…e4! the key counter — the pawn surges forward, kicking the f3-knight and gaining space and time. Black opens lines for the pieces and prepares to round up the f5-pawn with the initiative firmly in hand.", sayShort: '…e4 — surge forward, kick the knight.', highlights: [H('e4')] }),
      b({ id: 'j3', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 exf5 e4 Qe2 Qe7 Bxc6 dxc6', say: "Qe2 pressures the e4-pawn, …Qe7 defends it, and after Bxc6 …dxc6 Black recaptures toward the centre with the bishop pair and the open d-file. There is the Jänisch-Accepted tabiya: Black active and well-developed, the gambit pawn soon regained, with a comfortable, fighting game.", sayShort: '…dxc6 — bishop pair, open d-file.', highlights: [H('c6'), H('e4', SOFT)] }),
    ],
  },

  'schliemann-defence::Dyckhoff Variation': {
    openingId: 'schliemann-defence', title: 'Schliemann — The Dyckhoff (4.d3)', minutes: 7, orientation: 'black', kind: 'roadmap', sources: SRC,
    beats: [
      b({ id: 'd1', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d3', say: "The Dyckhoff — White keeps it solid with 4.d3, declining the complications and supporting e4. A safe, positional try that takes the sting out of the gambit but also lets Black equalise comfortably.", sayShort: '4.d3 — White plays it safe.', highlights: [H('e4', SOFT)] }),
      b({ id: 'd2', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4', say: "…fxe4 dxe4 opens the f-file for Black's rook and clarifies the centre. The …f5 thrust has done its job — the position is open and Black's pieces have clear, active routes out.", sayShort: '…fxe4 — open the f-file.', highlights: [H('e4')] }),
      b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4 Nf6', say: "…Nf6 develops with tempo, attacking the e4-pawn. There is the Dyckhoff tabiya: an open, sound position where Black has easy development, the half-open f-file, and full equality — the quiet line gives White nothing.", sayShort: '…Nf6 — develop, hit e4, fully equal.', arrows: [A('f6', 'e4')], highlights: [H('f6'), H('e4')] }),
    ],
  },
};
