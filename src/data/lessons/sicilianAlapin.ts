import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_alapin-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const SICILIAN_ALAPIN_LESSON: LessonScript = {
  openingId: "sicilian-alapin",
  title: "The Alapin Sicilian — A Master Class",
  minutes: 8,
  orientation: "black",
  beats: [
    b({ id: "alapin", moves: "e4 c5 c3 Nf6", say: "The Alapin — White sidesteps the Open Sicilian with c3, planning d4 to build a big pawn centre. Black's most principled reply is Nf6, hitting the e4-pawn at once and refusing to let White set up in comfort.", sayShort: "Nf6 — hit e4, deny White comfort.", arrows: [A("f6", "e4", ATK)] }),
    b({ id: "center", moves: "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4", say: "White claims space with e5, kicking the knight to d5, then d4. Black strikes back at once with cxd4, refusing to let White keep the broad pawn duo for free. The knight on d5 is superbly placed, eyeing c3, e3 and f4.", sayShort: "cxd4 — strike the centre, knight on d5.", highlights: [H("d5", KEY), H("e5", SOFT)] }),
    b({ id: "undermine", moves: "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6", say: "Both sides develop; Nc6 leans on the d4-pawn and Black plays d6 to challenge the e5-spearhead directly. This is the heart of Black's plan against the Alapin — undermine the centre before it becomes a steamroller.", sayShort: "Nc6 and d6 — undermine White's centre.", arrows: [A("c6", "d4", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "liquidate", moves: "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7", say: "A flurry of trades follows — dxe5 removes the spearhead, and after the pieces come off on d7 Black has fully equalised. This is the Alapin's quiet truth: with accurate play Black neutralises the centre and reaches a comfortable, balanced game, often heading toward a level endgame.", sayShort: "dxe5 and trades — Black is equal.", highlights: [H("e5", KEY), H("d7", SOFT)] }),
    b({ id: "verdict", moves: "e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7", say: "That is how to meet the Alapin: hit e4 with Nf6, strike the centre with cxd4 and d6, and trade White's space away. White's c3 cost a tempo and denied the knight its natural c3-square — and Black emerges with an easy, equal game, the queen active on d7, against this popular anti-Sicilian.", sayShort: "Nf6, cxd4, d6 — equalise the Alapin.", highlights: [H("d7", KEY)] }),
  ],
};
