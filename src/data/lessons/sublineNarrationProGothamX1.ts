import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — GothamChess repertoire, batch X1 (all student WHITE):
// London System / Rapport-Jobava, Stafford Gambit refutation, Ponziani,
// Fantasy Caro, French Advance Milner-Barry Gambit, English, Vienna Gambit.
// House voice, board-safe, line-grounded. Each entry answers the opponent's
// frequent deviation with the correct White plan for that structure.

const LON = ['concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'];
const STAF = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const PONZ = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Ponziani_Opening'];
const FANT = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const MB = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/French_Defence'];
const VIE = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'];

export const SUBLINE_NARRATION_PRO_GOTHAM_X1: Record<string, SublineNarration> = {
  'pro-gothamchess-london::1::c5@5': {
    intro: { say: "c5 — Black strikes at the centre. Clamp with d5, seizing a big space advantage in a Benoni structure, then follow with e4, Nf3 and Be2. Your central pawns cramp Black, and you can expand with f4 or play the queenside while Black scrambles for the ...b5 or ...e6 break.", sayShort: 'c5 — d5 clamps, then e4 and space.' }, sources: LON,
  },
  'pro-gothamchess-london::2::c6@5': {
    intro: { say: "c6 — Black sets up a solid Slav wall and eyes ...Bf5. Meet the bishop with a plan: h3 and g4 to gain kingside space and harass it, or Bd3 to trade it off. With castling long, the g-pawn storm gives a dangerous attack while Black is short of counterplay.", sayShort: 'c6 — h3 and g4, harass the bishop.' }, sources: LON,
  },
  'pro-gothamchess-london::2::a6@7': {
    intro: { say: "a6 — Black plays slowly on the queenside. Seize the moment with g4, the thematic Jobava space-grab, intending g5 to boot the f6-knight and open lines toward the king. Castle long and storm the kingside; Black is a tempo behind on the wing that matters.", sayShort: 'a6 — g4, then g5 and storm.' }, sources: LON,
  },
  'pro-gothamchess-stafford-refute::0::Be6@11': {
    intro: { say: "Be6 — Black develops with tempo, eyeing a2 and quick piece play. Castle, guard the soft spots with Nd2 and c3, and finish developing; a later b3 can shut the bishop out. With the extra pawn and no real threats, trade down and grind Black out.", sayShort: 'Be6 — O-O, consolidate, keep the pawn.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::1::Nxf2@11': {
    intro: { say: "Nxf2 — the Stafford sacrifice, and it simply loses. Take Kxf2, and after Bc5+ block with d4; if Bxd4+ interpose Be3, trading bishops. When the smoke clears you are a full piece up for a pawn. Do not grab greedily elsewhere — return one unit to blunt the checks and consolidate.", sayShort: 'Nxf2 — Kxf2, d4 blocks, win a piece.' }, sources: STAF,
  },

  // ===== Ponziani Opening (student WHITE) =====
  'pro-gothamchess-ponziani::0::Nxe4@7': {
    intro: { say: "Nxe4 — the Vukovic Gambit, and it favours you. After d5 and dxc6 you have won a piece; the king step to e2 looks scary but Black lacks a real follow-up. Hit back with Qd5, forking the e4-knight and threatening f7, or take bxc6 first. Consolidate the extra piece and the storm blows over.", sayShort: 'Nxe4 — d5 and dxc6 win a piece.' }, sources: PONZ,
  },
  'pro-gothamchess-ponziani::0::Ne4@9': {
    intro: { say: "Ne4 — Black jumps the knight in, but you hold the big centre. Play cxd4, and after Bb4+ block with Nbd2, which also challenges the e4-knight. Continue Bd3 and O-O; your e5- and d4-pawns cramp Black, and the loose knight on e4 gets chased off. Space and development are yours.", sayShort: 'Ne4 — cxd4, then Nbd2 hits the knight.' }, sources: PONZ,
  },
  'pro-gothamchess-ponziani::1::f6@7': {
    intro: { say: "f6 — Black props up e5 but weakens the kingside and the e6-square. Keep the pressure: Bb5 pins the c6-knight, and with the queen on a4 you double on the pin. Break with exd5 and then d4, opening the centre while Black is underdeveloped and the king is airy. The initiative is firmly yours.", sayShort: 'f6 — Bb5 pins, then exd5 and d4.' }, sources: PONZ,
  },
  'pro-gothamchess-ponziani::1::Bd7@7': {
    intro: { say: "Bd7 — the Caro Gambit; Black breaks the pin and offers a pawn for activity. After exd5 Nd4 Qd1 Nxf3+ Qxf3 you are a pawn up. Meet the coming ...Nxd5 by defending the pawn with Bc4 or Bb5+, finish development, and castle. Give nothing back for free and the extra pawn is a lasting plus.", sayShort: 'Bd7 — exd5, hold the pawn with Bc4.' }, sources: PONZ,
  },

  // ===== Fantasy Caro-Kann (student WHITE) =====
  'pro-gothamchess-fantasy-caro::0::g6@5': {
    intro: { say: "g6 — Black fianchettoes against your Fantasy centre. Develop naturally with Nc3 and Be3; if Black grabs the b2-pawn with ...Qxb2, do not fear it. After Rb1 the queen is chased offside to a3, and your huge lead in development, the open b-file and the coming e5 give a dangerous initiative. Attack while Black is uncastled.", sayShort: 'g6 — Nc3 and Be3, sac b2, attack.' }, sources: FANT,
  },

  // ===== French Advance, Milner-Barry Gambit (student WHITE) =====
  'pro-gothamchess-milner-barry::0::Bd7@7': {
    intro: { say: "Bd7 — Black readies ...Bb5 to trade off the bad light-squared bishop. Continue Nf3, bolstering d4 and e5; meet ...Qb6 calmly, and if ...Bb5 comes, c4 keeps your broad pawn chain and space. The e5-pawn cramps Black, so castle and build your attack on the kingside where you own the room.", sayShort: 'Bd7 — Nf3 supports d4, keep e5 space.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::0::Nh6@9': {
    intro: { say: "Nh6 — Black routes the knight toward f5 to blockade and hit d4. Develop Bd3 and castle; when the knight lands on f5, take it with Bxf5, exchanging Black's best-placed piece and keeping your d4-e5 chain rock-solid. With the blockader gone you enjoy space and a free hand on the kingside.", sayShort: 'Nh6 — Bd3, then Bxf5 removes the blockader.' }, sources: MB,
  },

  // ===== Vienna Gambit (student WHITE) =====
  'pro-gothamchess-vienna::0::exf4@5': {
    intro: { say: "exf4 — the accepted Vienna Gambit. Chase the knight with e5, then develop fast with Nf3, Bc4 and Qe2; the bishop and queen train on f7 while Black is undeveloped. After ...dxe5 regain the pawn with Nxe5, keeping the pin and the initiative. Your development lead is the real prize, not the f4-pawn.", sayShort: 'exf4 — e5 chases, then Bc4 hits f7.' }, sources: VIE,
  },
};
