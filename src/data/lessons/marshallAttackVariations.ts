import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';
// Marshall Attack variation lessons (black). Data spine ma__d4-decline (G3),
// sound ≥20-ply (engine −0.08, equal). Keyed openingId::name.
const KEY='rgba(255,214,0,0.88)';const VIS='rgba(40,185,95,0.92)';
const A=(from,to,color=VIS)=>({from,to,color});const H=(square,color=KEY)=>({square,color});
function b(init){const{moves,...rest}=init;return{...rest,moves:moves.trim().split(/\s+/)};}
const SRC=['concept:pos-initiative','concept:tac-sacrifice','https://en.wikipedia.org/wiki/Marshall_Attack'];
export const MARSHALL_ATTACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  'marshall-attack::d4 Decline (White avoids the gambit)': {
    openingId:'marshall-attack',sources:SRC,title:'Marshall — d4 Decline',minutes:8,orientation:'black',
    beats:[
      b({id:'d1',moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 d4',say:"Wary of the Marshall, White declines with 9.d4 instead of capturing on d5 — refusing to win the pawn and avoid the famous attack. Black is already fully equal and comfortable.",sayShort:'…d5 met by d4 — White declines.',highlights:[H('d5'),H('d4')]}),
      b({id:'d2',moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 d4 exd4',say:"…exd4 — Black simply takes, opening the centre. Without the pawn-grab on d5, White has none of the Marshall's promised compensation; this is just an equal, open Ruy.",sayShort:'…exd4 — open the centre, equal.',highlights:[H('d4')]}),
      b({id:'d3',moves:'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 d4 exd4 e5 Ne4',say:"e5 grabs space and kicks the knight, but …Ne4! plants it on the strong central outpost, eyeing c3 and the kingside. Black's pieces are active and the d4-pawn is a target.",sayShort:'…Ne4 — the central outpost.',arrows:[A('e4','c3')],highlights:[H('e4'),H('e5')]}),
    ],
  },
};
