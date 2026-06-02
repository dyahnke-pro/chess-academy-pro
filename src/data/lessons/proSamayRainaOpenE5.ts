import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Open Games / …e5 (Black). DATA-REBUILT 2026-06-01: after
// 1.e4 e5 he FACES the Italian (Bc4) most often, so the main line is now the
// Giuoco Pianissimo, not the Closed Ruy (which is demoted to a variation).
// Two registers; no move-number prefixes in spoken text; green vision arrows.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game-Giuoco-Pianissimo', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_OPEN_E5_LESSON: LessonScript = {
  openingId: 'pro-samayraina-open-e5', title: "This repertoire's …e5 — the Italian (Giuoco Pianissimo)", minutes: 8,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 e5 Nf3 Nc6',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "This repertoire answers e4 with the classical e5, fighting for the centre head-on, and develops Nc6 to defend it. This is the most principled reply to the king's-pawn.",
      sayShort: '…e5, …Nc6 — claim the centre.' }),
    b({ id: 'bc5', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
      arrows: [A('c5', 'f2')], highlights: [{ square: 'c5', color: KEY }, { square: 'f2', color: SOFT }],
      say: "After e5 the Italian is the opening he faces most. He mirrors with Bc5 — the most natural square — training the bishop straight at f2. A balanced, classical battle.",
      sayShort: '…Bc5 — aim at f2.' }),
    b({ id: 'pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3',
      arrows: [A('f6', 'e4')], highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "We develop Nf6, hitting e4, and after c3 and d3 the game settles into a Giuoco Pianissimo — the slow maneuvering struggle where understanding beats memorisation and Black is never worse.",
      sayShort: '…Nf6 — into the Pianissimo.' }),
    b({ id: 'ba7', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7',
      highlights: [{ square: 'a7', color: KEY }, { square: 'g8', color: SOFT }],
      say: "We castle and tuck the bishop to a7 — keeping the powerful a7-g1 diagonal while sidestepping b4 ideas. The position is symmetrical and rich; Black has every resource White does.",
      sayShort: '…Ba7 — keep the diagonal, safe.' }),
    b({ id: 'plan', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 a4 Ba7',
      arrows: [A('c6', 'e7')], highlights: [{ square: 'd5', color: KEY }, { square: 'e7', color: SOFT }],
      say: "The plan: reroute Ne7-g6 toward the kingside, prepare the d5 break to free the position, and simply match White's slow improvements until the moment to strike in the centre. Equal, double-edged, and full of play.",
      sayShort: 'Plan: …Ne7-g6, break with …d5.' }),
  ],
};
