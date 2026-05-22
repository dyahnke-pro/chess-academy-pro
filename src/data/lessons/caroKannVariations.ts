import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Caro-Kann variation master classes (Black). Spines built move-by-move
// from the Lichess masters DB (most-played master move at each ply), so
// they're DB-anchored + masters-legit by construction. chess.js-legal;
// highlights land only on squares the narration names (§5b). Keyed
// `${openingId}::${variationName}` to match the repertoire variation names.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const ADVANCE: LessonScript = {
  openingId: 'caro-kann',
  title: 'Caro-Kann — The Advance Variation',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  beats: [
    b({ id: 'adv1', moves: 'e4 c6 d4 d5 e5 Bf5',
      say: "The Advance — e5 grabs space and locks the centre. Here is the Caro's revenge on the French: BEFORE playing e6, Black gets the light bishop out to f5. In the French that bishop dies behind e6; in the Caro it is already free.",
      sayShort: 'Advance: e5 locks the centre — but Black gets the bishop to f5 BEFORE e6, free at last.',
      highlights: [H('f5', KEY), H('e6', SOFT), H('e5', SOFT)] }),
    b({ id: 'adv2', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5',
      say: "Only now e6, the bishop safely outside. Then the thematic strike: c5, hitting d4 — the base of White's chain. You undermine a pawn chain at its base — Black plays for the break, never passive defence.",
      sayShort: 'Now e6, then c5 — strike the base of the chain. Undermine, don’t defend.',
      highlights: [H('c5', ATK), H('d4', KEY), H('e6', SOFT)] }),
    b({ id: 'adv3', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7',
      say: "White props the chain with Be3; Black trades on d4 and routes the knight up through e7 — bound for the strong c6 and f5 squares where it presses White's centre.",
      sayShort: 'Trade on d4, reroute the knight via e7 toward c6 and f5.',
      highlights: [H('d4', SOFT), H('e7', KEY), H('c6', SOFT), H('f5', SOFT)] }),
    b({ id: 'adv4', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 Nd2 Nbc6 N2f3 Be4',
      say: "Both knights develop, and the bishop slides to e4 — a magnificent post in the heart of the board, raking the long diagonal toward White's king.",
      sayShort: 'The bishop to e4 — a monster post on the long diagonal.',
      highlights: [H('e4', KEY)] }),
    b({ id: 'adv5', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 Nd2 Nbc6 N2f3 Be4 O-O Ng6',
      say: "Black castles into a comfortable, equal game: the bishop dominates e4, the knight on g6 leans on e5, and the open c-file invites the rooks. The Advance held no terror — Black undermined the chain and freed every piece.",
      sayShort: 'Castle: bishop rules e4, knight hits e5, rooks eye the open c-file. Fully equal.',
      highlights: [H('e4', KEY), H('e5', SOFT), H('g6', SOFT)] }),
  ],
};

export const CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'caro-kann::Advance Variation': ADVANCE,
};
