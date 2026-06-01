import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — King's Gambit (White). NEW 2026-06-01: his 2nd-most-played
// White answer to …e5 (824 games), absent from the original build. He favours
// the Bishop's Gambit (exf4 Bc4). A sharp GAMBIT showcase — Black is objectively
// fine, but the practical attacking chances are huge and pure Samay.
// Two registers; no move-number prefixes; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:att-kingside-storm', 'concept:pos-center', 'https://www.chess.com/openings/Kings-Gambit', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_KINGS_GAMBIT_LESSON: LessonScript = {
  openingId: 'pro-samayraina-kings-gambit', title: "Samay's King's Gambit — the Bishop's Gambit", minutes: 8,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'f4', moves: 'e4 e5 f4',
      arrows: [], highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The King's Gambit — Samay's wildest weapon, 800-plus games. f4 offers a pawn to tear open the f-file and seize the centre. This is the most romantic, attacking opening in chess, and he plays it for the king-hunt.",
      sayShort: 'f4 — offer the pawn, open lines.' }),
    b({ id: 'bc4', moves: 'e4 e5 f4 exf4 Bc4',
      arrows: [A('c4', 'f7')], highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: KEY }],
      say: "Black grabs with exf4 and Samay chooses the Bishop's Gambit — Bc4, training the bishop straight at f7 and developing fast instead of rushing to win the pawn back. Speed and the attack come first.",
      sayShort: 'Bc4 — aim at f7, develop fast.' }),
    b({ id: 'd4', moves: 'e4 e5 f4 exf4 Bc4 Nf6 Nc3 d6 d4',
      arrows: [], highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: SOFT }],
      say: "We bring out the knight to c3 and seize the big centre with d4. The gambit pawn is temporary; the lead in development and the broad pawn centre are the real compensation Samay is after.",
      sayShort: 'Nc3, d4 — grab the centre.' }),
    b({ id: 'bxf4', moves: 'e4 e5 f4 exf4 Bc4 Nf6 Nc3 d6 d4 Nc6 Bxf4 Bg4 Nf3',
      arrows: [A('f4', 'c7')], highlights: [{ square: 'f4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "We recapture with Bxf4, and now every white piece is active with the centre firmly ours. From here Samay castles long and storms the kingside — the King's Gambit dream made real.",
      sayShort: 'Bxf4 — regain it, full activity.' }),
    b({ id: 'plan', moves: 'e4 e5 f4 exf4 Bc4 Nf6 Nc3 d6 d4 Nc6 Bxf4 Bg4 Nf3',
      arrows: [A('c4', 'f7')], highlights: [{ square: 'f7', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The plan: castle queenside, roll the central pawns with d5 and e5, and hurl the kingside pawns at Black's king. Sharp, double-edged, and exactly the chaos where Samay's tactics shine.",
      sayShort: 'Plan: O-O-O, central rollers, attack.' }),
  ],
};
