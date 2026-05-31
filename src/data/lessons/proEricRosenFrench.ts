import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — French Defense (Black). 187 games, 66%. The main spine is
// the Classical with …Nf6 and …Be7 vs Bg5. Two registers; no move-number
// prefixes in spoken text; green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pawn-chain', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/imrosen/games/archives'];

export const PRO_ERICROSEN_FRENCH_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-french', title: "Rosen's French — Classical", minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 e6 d4 d5',
      arrows: [A('d5', 'e4')], highlights: [{ square: 'd5', color: KEY }, { square: 'e6', color: SOFT }],
      say: "The French Defense. We answer e4 with …e6 and …d5, challenging the centre at once. It is a fighting, counter-attacking defense built on a rock-solid pawn chain — Black invites White to overextend, then strikes back at the base.",
      sayShort: '…e6, …d5 — challenge the centre.' }),
    b({ id: 'nf6', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7',
      arrows: [A('g5', 'f6')], highlights: [{ square: 'f6', color: KEY }, { square: 'e7', color: SOFT }],
      say: "Against Nc3 we play the Classical with …Nf6, hitting e4, and when White pins with Bg5 we calmly unpin with …Be7. Solid and principled — we are not afraid of the pin because the coming exchanges only help free our game.",
      sayShort: '…Nf6, …Be7 — the Classical.' }),
    b({ id: 'e5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7',
      arrows: [A('e4', 'e5')], highlights: [{ square: 'e5', color: KEY }, { square: 'e7', color: KEY }],
      say: "White pushes e5, gaining space and forcing the knight back to d7, then trades the dark bishops. After …Qxe7 Black has the classic French structure — and the trade of dark-squared bishops actually eases our cramped position. Now we go to work on the centre.",
      sayShort: '…Nfd7, …Qxe7 — French structure set.' }),
    b({ id: 'c5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5',
      arrows: [A('c7', 'c5'), A('c5', 'd4')], highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: KEY }],
      say: "…c5! The thematic French break, striking at the base of White's d4-e5 pawn chain. While White builds on the kingside with f4 and Nf3, we hammer the queenside and centre. The whole French battle is this race: White attacks the king, Black attacks the chain.",
      sayShort: '…c5 — hit the chain’s base.' }),
    b({ id: 'plan', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5',
      arrows: [A('b8', 'c6'), A('d7', 'b6')], highlights: [{ square: 'c5', color: KEY }, { square: 'f7', color: SOFT }],
      say: "The plan: …Nc6 and …cxd4 to open the c-file, reroute the d7-knight to b6 or f8 to guard the king, and pressure d4 and c2. Black's counterplay on the queenside arrives just as White's kingside attack does — and Rosen is very comfortable defending the king while striking back. Counter-attack, not passive defense.",
      sayShort: 'Plan: …Nc6, …cxd4, hit d4.' }),
  ],
};
