import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — Scandinavian per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-scandi';
const SRC = ['concept:pos-development', 'concept:pos-initiative', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const QA5: LessonScript = {
  openingId: OID, title: 'Scandinavian — …Qa5 (Main)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5',
      arrows: [], highlights: [{ square: 'a5', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The classical …Qa5 — the queen sidesteps to a5, where it pins nothing but eyes the queenside and stays active. This is the old main line of the Scandinavian, sharper than …Qd8, leading to a rich game with the bishop pair and quick development.",
      sayShort: '…Qa5 — the active main line.' }),
    b({ id: 'bf5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
      arrows: [], highlights: [{ square: 'f5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "We build the classic …c6 / …Bf5 setup — a little fortress where the queen on a5, the bishop outside the chain on f5, and the solid c6-pawn give Black a sound, flexible position. The bishop is the star, developed before …e6 buries it.",
      sayShort: '…c6, …Bf5 — the classic setup.' }),
    b({ id: 'plan', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Nd5 Qd8',
      arrows: [], highlights: [{ square: 'd8', color: KEY }, { square: 'd5', color: SOFT }],
      say: "When White probes with Nd5, the queen calmly drops back to d8 — having provoked White's pieces forward. Black completes development with …Be7 and …Nbd7, castles, and plays a solid middlegame. The …Qa5 line gives Black active piece play with full equality.",
      sayShort: '…Qd8 — regroup, fully equal.' }),
  ],
};

const C6_GAMBIT: LessonScript = {
  openingId: OID, title: 'Scandinavian — …Bg4 pin line', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "With the queen safe on d8, …c6 prepares a flexible Caro-like structure and supports a future …d5 or …Bf5. Black keeps everything solid and waits to develop the light bishop to its best square.",
      sayShort: '…c6 — flexible and solid.' }),
    b({ id: 'bg4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 c6 Bc4 Bg4',
      arrows: [A('g4', 'f3')], highlights: [{ square: 'g4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "…Bg4 pins the f3-knight — the defender of d4. This is the other way to solve the bishop: instead of …Bf5, we trade it for White's knight and pick up the d4-pawn's defender, easing any pressure on our position.",
      sayShort: '…Bg4 — pin and trade for d4.' }),
    b({ id: 'plan', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 c6 Bc4 Bg4 h3 Bxf3 Qxf3 e6',
      arrows: [A('f8', 'd6'), A('b8', 'd7')], highlights: [{ square: 'e6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "After …Bxf3 and …e6 Black has a rock-solid structure with no weaknesses, the half-open lines for the rooks, and easy development with …Bd6/…Be7 and …Nbd7. White has the bishop pair but no way in — a comfortable, equal Scandinavian.",
      sayShort: 'Plan: …e6, develop, hold the centre.' }),
  ],
};

export const PRO_SAMAYRAINA_SCANDI_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::…Qa5 (Main)`]: QA5,
  [`${OID}::…Bg4 Pin`]: C6_GAMBIT,
};
