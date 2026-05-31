import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs Caro-Kann (White), 582g+. Classical main (Nc3 dxe4 …Bf5).
// Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-space', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_CARO_WHITE_LESSON: LessonScript = {
  openingId: 'pro-samayraina-caro-white', title: "Samay vs the Caro — Classical", minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3',
      arrows: [A('g3', 'f5')], highlights: [{ square: 'f5', color: KEY }, { square: 'g3', color: KEY }],
      say: "Against the Caro we play the main line: Nc3 and, after …dxe4, recapture on e4. Black develops the light bishop to f5 — the whole point of the Caro, getting it outside the chain. We harass it with Ng3, gaining time.",
      sayShort: 'Ng3 — harass the f5-bishop.' }),
    b({ id: 'h4', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3',
      arrows: [], highlights: [{ square: 'h4', color: KEY }, { square: 'g6', color: SOFT }],
      say: "The bishop retreats to g6 and we gain queenside-to-kingside space with h4-h5 ideas, harassing the bishop and grabbing kingside territory. Nf3 completes the knights. White enjoys a comfortable space advantage in a classic Caro structure.",
      sayShort: 'h4 — grab kingside space.' }),
    b({ id: 'plan', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3',
      arrows: [A('d1', 'd3')], highlights: [{ square: 'h5', color: KEY }, { square: 'd3', color: SOFT }],
      say: "The plan: h5 fixes the kingside and entombs the h7-bishop, then Bd3 offers a trade that opens the position for White's space edge. With the queen recapturing on d3, White develops Bd2/Qe2 and castles long for a kingside initiative. A textbook Caro squeeze.",
      sayShort: 'Plan: h5, Bd3, castle long.',
    }),
  ],
};
