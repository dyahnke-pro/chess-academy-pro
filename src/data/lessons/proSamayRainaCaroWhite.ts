import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs Caro-Kann (White). His real, data-derived #1 (320 games)
// is 2.c4 — the Accelerated Panov, hitting d5 and steering into an open IQP-style
// game rather than the Classical. Two registers; no move-number prefixes in
// spoken text; green vision arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pawn-isolated', 'https://www.chess.com/openings/Caro-Kann-Defense-Panov-Attack', 'https://api.chess.com/pub/player/samayraina/games/archives'];

export const PRO_SAMAYRAINA_CARO_WHITE_LESSON: LessonScript = {
  openingId: 'pro-samayraina-caro-white', title: "This repertoire vs the Caro — Panov (2.c4)", minutes: 7,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c4', moves: 'e4 c6 c4 d5 exd5 cxd5 d4',
      arrows: [], highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: KEY }],
      say: "Against the Caro, this repertoire's choice is c4 — the Accelerated Panov. We immediately challenge d5 and, after the trades, build a d4 centre. Instead of the slow Classical Caro, we get an open, dynamic game where White's development lead and central pressure do the talking.",
      sayShort: 'c4 — the Panov, hit d5.' }),
    b({ id: 'nc3', moves: 'e4 c6 c4 d5 exd5 cxd5 d4 Nf6 Nc3 Nc6 Bg5',
      arrows: [A('c3', 'd5')], highlights: [{ square: 'g5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "We develop Nc3 and Bg5, piling pressure on the d5-pawn and pinning the f6-knight that defends it. This is the heart of the Panov: White presses the isolated-queen's-pawn structure while Black must defend precisely or get squeezed.",
      sayShort: 'Nc3, Bg5 — pressure d5.' }),
    b({ id: 'cxd5', moves: 'e4 c6 c4 d5 exd5 cxd5 d4 Nf6 Nc3 Nc6 Bg5 e6 Nf3 Be7 cxd5 Nxd5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }],
      say: "After both sides develop, we clarify with cxd5 — Black recaptures with the knight and we reach the classic IQP position: an isolated d-pawn for White, but in return a beautiful free game with active pieces, the d5 and e5 outposts, and attacking chances against Black's king.",
      sayShort: 'cxd5 — the IQP middlegame.' }),
    b({ id: 'plan', moves: 'e4 c6 c4 d5 exd5 cxd5 d4 Nf6 Nc3 Nc6 Bg5 e6 Nf3 Be7 cxd5 Nxd5',
      arrows: [A('f1', 'd3'), A('f3', 'e5')], highlights: [{ square: 'd5', color: KEY }, { square: 'h7', color: SOFT }],
      say: "The IQP plan: develop Bd3 and Re1, jump a knight into e5, and use the d-pawn as a springboard for a kingside attack with ideas like Bxh7 or a knight sacrifice. The isolated pawn is dynamic, not weak — as long as we attack. If Black trades everything off, only then does the endgame favour Black, so we keep the pieces on and press.",
      sayShort: 'Plan: Bd3, Ne5, attack the king.',
    }),
  ],
};
