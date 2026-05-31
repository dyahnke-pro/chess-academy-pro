import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Sicilian Defense (Black), 1,338 games. He plays the Najdorf
// structure (…d6/…a6/…e5). Two registers; no move-number prefixes; green arrows.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-space', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_SICILIAN_BLACK_LESSON: LessonScript = {
  openingId: 'pro-samayraina-sicilian-black', title: "Samay's Sicilian — the Najdorf", minutes: 8,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
      arrows: [], highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "The Najdorf — the most respected Sicilian and the most-analysed opening in chess. …a6 is the key: a quiet-looking move that controls b5, prepares queenside expansion with …b5, and keeps maximum flexibility. We fight for the initiative as Black.",
      sayShort: '…a6 — control b5, stay flexible.' }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Against the classical Be2, we strike with …e5, grabbing the centre and kicking the knight to b3. Yes, this concedes the d5-square — but in return we get central space, the bishop pair's scope, and active piece play. It is the principled Najdorf bargain.",
      sayShort: '…e5 — grab the centre.' }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O',
      highlights: [{ square: 'd5', color: SOFT }, { square: 'g8', color: SOFT }],
      say: "We develop …Be7 and castle into a complete Najdorf middlegame. The d5-square is White's to use, but we have our own trumps: the half-open c-file, queenside expansion with …b5, and pressure on e4. A rich, balanced fight.",
      sayShort: '…Be7, …O-O — complete the setup.' }),
    b({ id: 'plan', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O',
      arrows: [A('c8', 'e6')], highlights: [{ square: 'b5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The plan: expand with …b5 and …Bb7 to pressure e4, contest the d5-square with …Be6 and …Nbd7-b6 or …Nc6, and play on the queenside and centre. The Najdorf is the ultimate fighting defense — Black plays for the full point, never just to hold.",
      sayShort: 'Plan: …b5, …Be6, fight for d5.',
    }),
  ],
};
