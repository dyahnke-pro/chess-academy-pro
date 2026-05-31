import type { LessonScript, LessonBeat } from '../../types';
// Englund trap variation (black, kind:roadmap). The famous Qc1# mating line from
// gambits.json (engine MATE), chess.js-legal (G3). Honest surprise weapon.
const KEY='rgba(255,214,0,0.88)';
const H=(square,color=KEY)=>({square,color});
function b(init){const{moves,...rest}=init;return{...rest,moves:moves.trim().split(/\s+/)};}
const SRC=['concept:tac-sacrifice','concept:pos-initiative','https://en.wikipedia.org/wiki/Englund_Gambit'];
export const ENGLUND_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'englund-gambit::The Englund Mate (Qc1#)': {
    openingId:'englund-gambit',sources:SRC,title:'Englund — the Qc1 Mate',minutes:5,orientation:'black',kind:'roadmap',
    beats:[
      b({id:'e1',moves:'d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4',say:"The main Qb4+ raid has netted b2; Bc3 defends the rook — and …Bb4! pins the bishop to the queen, the move behind the famous trap.",sayShort:'…Bb4 — pin the bishop.',highlights:[H('b4'),H('c3')]}),
      b({id:'e2',moves:'d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2',say:"7.Qd2? tries to hold everything by defending the c3-bishop a second time — but it walks straight into the mate.",sayShort:'Qd2 — the fatal defence.',highlights:[H('d2')]}),
      b({id:'e3',moves:'d4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2 Bxc3 Qxc3 Qc1#',say:"…Bxc3 Qxc3 Qc1# — checkmate. The queen, deep in White's camp since move four, delivers mate on c1. The most famous trap in all of 1.d4.",sayShort:'…Qc1# — checkmate.',highlights:[H('c1')]}),
    ],
  },
};
