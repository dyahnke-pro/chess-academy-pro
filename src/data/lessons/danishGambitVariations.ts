import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';
// Danish Gambit variation lessons (white). Data spine da__schlechter (G3), sound
// ≥20-ply (engine −0.78, gambit compensation). The full two-pawn-accepted spine
// runs to −2.1 (an unsound Bxf7+ over-walk) — NOT taught. Keyed openingId::name.
const KEY='rgba(255,214,0,0.88)';const VIS='rgba(40,185,95,0.92)';
const A=(from,to,color=VIS)=>({from,to,color});const H=(square,color=KEY)=>({square,color});
function b(init){const{moves,...rest}=init;return{...rest,moves:moves.trim().split(/\s+/)};}
const SRC=['concept:pos-initiative','concept:pos-development','https://en.wikipedia.org/wiki/Danish_Gambit'];
export const DANISH_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'danish-gambit::Schlechter Defence (…Nc6 & …Bb4)': {
    openingId:'danish-gambit',sources:SRC,title:'Danish — Schlechter Defence',minutes:8,orientation:'white',
    beats:[
      b({id:'s1',moves:'e4 e5 d4 exd4 c3 dxc3 Nxc3 Nc6 Bc4 Bb4',say:"In the Schlechter, Black declines the second pawn and develops actively with …Nc6 and …Bb4, pinning the c3-knight. White keeps the one-pawn gambit with a clear development lead and the bishop trained on f7.",sayShort:'Bc4 — one-pawn gambit, lead in development.',highlights:[H('c4'),H('b4')]}),
      b({id:'s2',moves:'e4 e5 d4 exd4 c3 dxc3 Nxc3 Nc6 Bc4 Bb4 Nf3 d6 O-O',say:"Nf3 and O-O — White is fully mobilised and castled while Black is still sorting out the queenside. Speed, not material, is the Danish currency.",sayShort:'O-O — fully mobilised, fast.',highlights:[H('f3')]}),
      b({id:'s3',moves:'e4 e5 d4 exd4 c3 dxc3 Nxc3 Nc6 Bc4 Bb4 Nf3 d6 O-O Bxc3 bxc3 Nf6 Bg5',say:"…Bxc3 bxc3 hands White doubled c-pawns but the bishop pair and an open b-file; Bg5 pins the f6-knight, pressing Black's kingside.",sayShort:'Bg5 — pin, press the kingside.',highlights:[H('g5')]}),
      b({id:'s4',moves:'e4 e5 d4 exd4 c3 dxc3 Nxc3 Nc6 Bc4 Bb4 Nf3 d6 O-O Bxc3 bxc3 Nf6 Bg5 O-O Re1 Bg4',say:"Re1 takes the open e-file and …Bg4 develops. White is a pawn down with the two bishops, open lines and pressure — full compensation, a typical comfortable Danish position.",sayShort:'Re1 — open file, full compensation.',highlights:[H('e1')]}),
    ],
  },
};
