import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Old Indian Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies. Janowski/Tartakower/Ukrainian/Seirawan/Main-d5 anchor
// <20p in the curated pgn, so they fold into the main rather than ship thin.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['book:old-indian-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'];

export const OLD_INDIAN_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'old-indian-defence::Old Indian: Czech Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Czech (…c6/…c5)', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'c1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "The Czech set-up — Black builds the standard Old Indian foothold with …d6, …Nbd7, …e5 and …Be7, then aims for the …c6/…c5 plan to fix a closed, Czech-Benoni-style centre where the knight outposts dominate.", sayShort: '…O-O — the Czech foothold.', highlights: [H('e5')] }),
      b({ id: 'c2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7', say: "…c6 prepares to challenge the centre and …Qc7 lines the queen up behind it. White's Re1 supports e4; Black calmly readies the …c5 or …d5 break that suits the position.", sayShort: '…Qc7 — line up behind the centre.', highlights: [H('c6')] }),
      b({ id: 'c3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7 Bf1 Re8', say: "Bf1 tucks the bishop back to a safe diagonal; Black mirrors with …Re8, the rook supporting the centre and the …e-file. The Old Indian is a slow-burn opening — both sides marshal pieces before the central tension resolves.", sayShort: '…Re8 — support the centre.', highlights: [H('e8')] }),
      b({ id: 'c4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7 Bf1 Re8 d5 c5', say: "White locks the centre with d5, and …c5! fixes the Czech-Benoni structure: a closed centre where Black plays for …Ne8–g7–f5 or the …f5 break and dark-square play. There is the Czech tabiya — a solid, locked position where Black's plans are clear and White has no easy breakthrough.", sayShort: '…c5 — fix the closed Czech centre.', highlights: [H('c5'), H('d5', SOFT)] }),
    ],
  },

  'old-indian-defence::Old Indian: Be2 Development': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Be2/Qc2 System', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'e1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "Against White's classical Be2 and Qc2 development, Black sets up the same reliable Old Indian foothold: …d6, …Nbd7, …e5, …Be7, castle. Solidity first; the plan crystallises once White shows how he handles the centre.", sayShort: '…O-O — the reliable foothold.', highlights: [H('e5')] }),
      b({ id: 'e2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8', say: "…c6 questions the centre and …Re8 backs the e-file. White's Qc2 eyes the queenside and supports e4; Black keeps everything flexible, ready to meet d5 with …c5 or hold the tension for …exd4.", sayShort: '…Re8 — back the e-file, stay flexible.', highlights: [H('e8'), H('c6', SOFT)] }),
      b({ id: 'e3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8 Rd1 Bf8', say: "Rd1 pressures the d-file; Black regroups …Bf8, redeploying the bishop toward the long diagonal and shoring up the kingside. This patient regrouping is the soul of the Old Indian — every piece finds its best square before the action.", sayShort: '…Bf8 — regroup toward the diagonal.', highlights: [H('f8')] }),
      b({ id: 'e4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8 Rd1 Bf8 d5 c5', say: "White closes with d5, and …c5! locks the centre into the favourable Old-Indian/Benoni structure. There is the Be2 tabiya: a closed centre, a future …Nc5 outpost and …f5 break for Black, and a sound position with clear, patient plans against White's space.", sayShort: '…c5 — lock the favourable centre.', highlights: [H('c5'), H('d5', SOFT)] }),
    ],
  },
};
