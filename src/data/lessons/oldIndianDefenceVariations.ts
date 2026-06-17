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
  'old-indian-defence::Old Indian: Tartakower Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Tartakower (…exd4)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ot1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5', say: "The Old Indian — a solid, no-frills defence: Black plays …d6 and …Nbd7 and strikes the centre with …e5, a King's-Indian structure without the kingside fianchetto. It concedes White a little space, but it is compact and famously hard to break down.", sayShort: '…e5 — the solid Old Indian strike.', highlights: [H('e5', KEY)] }),
      b({ id: 'ot2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O exd4 Nxd4 Re8', say: "Black develops modestly with …Be7 and …O-O, then the Tartakower idea: …exd4 to free the cramped position, followed by …Re8 to pressure the e4-pawn down the half-open file. No weaknesses, easy piece play.", sayShort: '…exd4, …Re8 — free up, pressure e4.', highlights: [H('e8', KEY)] }),
      b({ id: 'ot3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O exd4 Nxd4 Re8 f3 Bf8 g4 Nc5 Kh1 c6', say: "White grabs kingside space with f3 and g4; Black regroups the bishop to …Bf8 on the long diagonal and lands …Nc5, a fine outpost hitting the e4-pawn. There is the Tartakower tabiya — and this is the Old Indian line to choose: by trading …exd4 early Black frees the cramped position and sidesteps White's d5-clamp, the trap the passive …c6 lines fall into. White still has a touch more space, but Black is rock-solid, flexible, and active — and it scores best in practice (47% at masters, 48% at club, versus just 39% for the …c6 cramp).", sayShort: '…Nc5 — the outpost; the best Old Indian try.', highlights: [H('c5', KEY)] }),
    ],
  },
  'old-indian-defence::Old Indian: Ukrainian Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Ukrainian (…e5 early)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ou1', moves: 'd4 Nf6 c4 d6 Nc3 e5', say: "The Ukrainian Old Indian — Black strikes with …e5 as early as move 3, the most direct version. It immediately challenges White's centre and keeps Black's structure compact and flexible, the Old Indian's calling card.", sayShort: '…e5 — the direct early strike.', highlights: [H('e5', KEY)] }),
      b({ id: 'ou2', moves: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 Be7 Bg2 O-O O-O c6 e4 a5', say: "Against White's fianchetto, Black develops …Be7, castles, braces the centre with …c6, and then begins the thematic queenside expansion with …a5. The plan is clear: gain space and counterplay on the wing where Black is better placed.", sayShort: '…c6, …a5 — brace and expand queenside.', highlights: [H('c6', KEY), H('a5', SOFT)] }),
      b({ id: 'ou3', moves: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 Be7 Bg2 O-O O-O c6 e4 a5 h3 Re8 Be3 a4 Qc2 Qa5', say: "Black pushes …a4 to fix a queenside target and swings …Qa5 to pressure White's queenside while …Re8 eyes e4. There is the Ukrainian tabiya: a solid, flexible Old Indian with genuine queenside counterplay. The engine likes White's centre, but in practice Black holds comfortably — scoring 50% even at master level.", sayShort: '…a4, …Qa5 — queenside counterplay.', highlights: [H('a4', KEY), H('a5', SOFT)] }),
    ],
  },
  'old-indian-defence::Old Indian: Czech Variation': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Czech (…c6/…c5)', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'c1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "The Czech set-up — Black builds the standard Old Indian foothold with …d6, …Nbd7, …e5 and …Be7, then aims for the …c6/…c5 plan to fix a closed, Czech-Benoni-style centre where the knight outposts dominate.", sayShort: '…O-O — the Czech foothold.', highlights: [H('e5')] }),
      b({ id: 'c2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7', say: "…c6 prepares to challenge the centre and …Qc7 lines the queen up behind it. White's Re1 supports e4; Black calmly readies the …c5 or …d5 break that suits the position.", sayShort: '…Qc7 — line up behind the centre.', highlights: [H('c6')] }),
      b({ id: 'c3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7 Bf1 Re8', say: "Bf1 tucks the bishop back to a safe diagonal; Black mirrors with …Re8, the rook supporting the centre and the …e-file. The Old Indian is a slow-burn opening — both sides marshal pieces before the central tension resolves.", sayShort: '…Re8 — support the centre.', highlights: [H('e8')] }),
      b({ id: 'c4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7 Bf1 Re8 d5 c5', say: "White locks the centre with d5, and …c5! fixes the Czech-Benoni structure: a closed centre where Black plays for the …Ne8–g7–f5 break and dark-square play. There is the Czech tabiya — be clear-eyed about it: White's extra space gives a genuine pull and Black is clearly worse, close to a pawn's pull, with this …c6 path scoring just 39% for Black in practice. The freeing alternative is the Tartakower — trade …exd4 at the tabiya instead of playing …c6 — which scores markedly better (47%). Choose the Czech lock only as a low-risk, rock-solid fortress to hold the draw, never as a bid for equality.", sayShort: '…c5 — a solid fortress, but prefer …exd4.', highlights: [H('c5'), H('d5', SOFT)] }),
    ],
  },

  'old-indian-defence::Old Indian: Be2 Development': {
    openingId: 'old-indian-defence', title: 'Old Indian — The Be2/Qc2 System', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'e1', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O', say: "Against White's classical Be2 and Qc2 development, Black sets up the same reliable Old Indian foothold: …d6, …Nbd7, …e5, …Be7, castle. Solidity first; the plan crystallises once White shows how he handles the centre.", sayShort: '…O-O — the reliable foothold.', highlights: [H('e5')] }),
      b({ id: 'e2', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8', say: "…c6 questions the centre and …Re8 backs the e-file. White's Qc2 eyes the queenside and supports e4; Black keeps everything flexible, ready to meet d5 with …c5 or hold the tension for …exd4.", sayShort: '…Re8 — back the e-file, stay flexible.', highlights: [H('e8'), H('c6', SOFT)] }),
      b({ id: 'e3', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8 Rd1 Bf8', say: "Rd1 pressures the d-file; Black regroups …Bf8, redeploying the bishop toward the long diagonal and shoring up the kingside. This patient regrouping is the soul of the Old Indian — every piece finds its best square before the action.", sayShort: '…Bf8 — regroup toward the diagonal.', highlights: [H('f8')] }),
      b({ id: 'e4', moves: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8 Rd1 Bf8 d5 c5', say: "White closes with d5, and …c5! locks the centre into the typical Old-Indian/Benoni structure. There is the Be2 tabiya: a closed centre with a future …f5 break for Black. Be honest about the balance — White's space gives a real, lasting pull and Black is clearly worse, close to a pawn's worth, this …c6 path scoring just 39% in practice. The freeing improvement is the Tartakower — meet the centre with …exd4 at the tabiya rather than committing …c6 — which scores markedly better (47%). Take this locked fortress only as a tough, low-risk hold for the draw, never as a bid for equality.", sayShort: '…c5 — a fortress, but prefer …exd4.', highlights: [H('c5'), H('d5', SOFT)] }),
    ],
  },
};
