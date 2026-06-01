import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Scandinavian Defense (Black), his data line: 2…Qxd5 3.Nc3
// Qd8 — the modern retreat that keeps the queen safe and reaches a solid Caro-
// like structure. Two registers; no move-number prefixes in spoken text; green
// vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-development', 'concept:pos-bishop-pair', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_SCANDI_LESSON: LessonScript = {
  openingId: 'pro-samayraina-scandi', title: "Samay's Scandinavian — …Qd8", minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qxd5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8',
      arrows: [], highlights: [{ square: 'd8', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The Scandinavian — we hit the centre with …d5, recapture with the queen, and after Nc3 retreat all the way to d8. It looks passive, but it is the modern, super-solid choice: the queen is completely safe, and Black builds a rock-solid Caro-Kann-like structure with no weaknesses.",
      sayShort: '…Qd8 — the safe modern retreat.' }),
    b({ id: 'nf6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Nc6',
      arrows: [], highlights: [{ square: 'f6', color: KEY }, { square: 'c6', color: KEY }],
      say: "We develop naturally — …Nf6 and …Nc6 hitting d4. Black's setup is simple and sound: develop every piece to a good square, castle, and play a solid middlegame where White's extra centre pawn is balanced by Black's easy, harmonious development.",
      sayShort: '…Nf6, …Nc6 — natural and solid.' }),
    b({ id: 'bf5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Nc6 Bc4 Bf5',
      arrows: [], highlights: [{ square: 'f5', color: KEY }],
      say: "…Bf5! The key move — we develop the light-squared bishop OUTSIDE the pawn chain before …e6 ever locks it in. This solves the same problem the Caro and Scandinavian both have, and the bishop is beautifully active eyeing the b1-h7 diagonal.",
      sayShort: '…Bf5 — free the light bishop.' }),
    b({ id: 'plan', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Nc6 Bc4 Bf5 O-O e6 Re1 Be7',
      arrows: [A('c6', 'b4')], highlights: [{ square: 'd5', color: SOFT }, { square: 'e7', color: KEY }],
      say: "The plan: complete development with …e6 and …Be7, castle, and then play for the …Nb4 or …Bd6 ideas to challenge White's pieces, or the …c5 break to hit d4. Black has a sound, equal game with the bishop pair's potential — a far cry from the Scandinavian's old dubious reputation.",
      sayShort: 'Plan: …Be7, castle, break with …c5.',
    }),
  ],
};
