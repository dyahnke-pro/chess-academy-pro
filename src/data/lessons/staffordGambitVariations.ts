import type { LessonScript, LessonBeat } from '../../types';
// Stafford trap variations (black, kind:roadmap). Winning/mating trap lines from
// gambits.json (engine MATE / +4.4), chess.js-legal (G3). Honest surprise weapon.
const KEY='rgba(255,214,0,0.88)';
const H=(square,color=KEY)=>({square,color});
function b(init){const{moves,...rest}=init;return{...rest,moves:moves.trim().split(/\s+/)};}
const SRC=['concept:tac-sacrifice','concept:pos-initiative','https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
export const STAFFORD_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'stafford-gambit::Bg5 — the Stafford Mate': {
    openingId:'stafford-gambit',sources:SRC,title:'Stafford — the Bg5 Mate',minutes:5,orientation:'black',kind:'roadmap',
    beats:[
      b({id:'m1',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5',say:"6.Bg5 pins nothing of value and ignores the storm on f2 — the most spectacular way to lose to the Stafford.",sayShort:'Bg5 — the losing pin.',highlights:[H('g5')]}),
      b({id:'m2',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8',say:"…Nxe4! offers the queen — and after Bxd8, White greedily grabs it, walking into the net.",sayShort:'…Nxe4 — offer the queen!',highlights:[H('e4')]}),
      b({id:'m3',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8 Bxf2+ Ke2 Bg4#',say:"…Bxf2+ Ke2 Bg4# — checkmate. The two bishops weave a net the king cannot escape; the sacrificed queen was the whole point. The signature Stafford mate.",sayShort:'…Bg4# — checkmate.',highlights:[H('g4')]}),
    ],
  },
  'stafford-gambit::Nc3 — the Knight Raid': {
    openingId:'stafford-gambit',sources:SRC,title:'Stafford — the Nc3 Knight Raid',minutes:5,orientation:'black',kind:'roadmap',
    beats:[
      b({id:'n1',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 d3 Ng4',say:"After 5.Nc3 Bc5 6.d3, …Ng4 leaps in, the knight already eyeing f2 with the bishop behind it.",sayShort:'…Ng4 — leap toward f2.',highlights:[H('g4'),H('f2')]}),
      b({id:'n2',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 d3 Ng4 Bf4 Nxf2',say:"Bf4 ignores the threat, and …Nxf2! forks the queen and the rook — the f2-square cracking open as always.",sayShort:'…Nxf2 — fork queen and rook.',highlights:[H('f2')]}),
      b({id:'n3',moves:'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 Nc3 Bc5 d3 Ng4 Bf4 Nxf2 Qd2 Nxh1',say:"Qd2 saves the queen, but …Nxh1 collects the rook. Black has won the exchange and keeps the initiative — the Stafford venom at work.",sayShort:'…Nxh1 — win the exchange.',highlights:[H('h1')]}),
    ],
  },
};
