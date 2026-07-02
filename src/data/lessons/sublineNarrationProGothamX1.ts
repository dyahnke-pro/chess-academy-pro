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
const ENG = ['concept:pos-center', 'https://en.wikipedia.org/wiki/English_Opening'];
const VIE = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'];

export const SUBLINE_NARRATION_PRO_GOTHAM_X1: Record<string, SublineNarration> = {
  // ===== London System / Rapport-Jobava (student WHITE) =====
  'pro-gothamchess-london::0::dxe4@25': {
    intro: { say: "dxe4 — Black opens the centre. Recapture Nxe4, planting the knight on a strong central square, and steer your play toward the kingside where the half-open h-file and the doubled g-pawns give real attacking weight. Bring the rooks to d1 and e1, and Black's slightly loose king becomes the target.", sayShort: 'dxe4 — Nxe4, then press the kingside.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Rfe8@25': {
    intro: { say: "Rfe8 — Black backs the e-file instead of resolving the centre. Push e5, seizing kingside space and fixing Black's structure, then swing the rooks to d1 and e1 and use the half-open h-file. The doubled g-pawns feed a kingside build while Black sits cramped and short of counterplay.", sayShort: 'Rfe8 — e5 grabs space, attack kingside.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Ne5@25': {
    intro: { say: "Ne5 — Black centralises the knight, hitting f3 and your d3-bishop. Trade it off with Nxe5 Qxe5, then strike exd5, opening the centre for your bishop and rooks. The half-open h-file and Black's loosened kingside hand you the initiative to press.", sayShort: 'Ne5 — Nxe5 then exd5, open up.' }, sources: LON,
  },
  'pro-gothamchess-london::0::d4@25': {
    intro: { say: "d4 — Black closes the centre and grabs space, but the pawn overreaches. Answer cxd4 cxd4, and the isolated d4-pawn becomes a fixed target: blockade with Nb3 and pile on with Rfd1 and Rac1. Your pieces flow to natural squares while Black nurses a lasting weakness.", sayShort: 'd4 — cxd4, then blockade and win it.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Rfd8@25': {
    intro: { say: "Rfd8 — Black centralises a rook behind the d-pawn. Resolve with exd5 exd5, leaving Black with hanging c- and d-pawns; train your pieces on them with Nb3, Rfd1 and Rac1. The half-open h-file adds a second front, and Black defends passively on both.", sayShort: 'Rfd8 — exd5, target the hanging pawns.' }, sources: LON,
  },
  'pro-gothamchess-london::0::c4@25': {
    intro: { say: "c4 — Black grabs queenside space and kicks the bishop. Retreat Bc2, where it eyes the h7-square, then play e5 seizing the centre and open the kingside. With Black committed on the queenside, your build down the h-file and the Bc2-Qe2 aim at the king arrives faster.", sayShort: 'c4 — Bc2, then e5 and attack.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Re8@19': {
    intro: { say: "Re8 — Black connects the rooks and waits. Continue your London build toward the central break: Rad1, then e4, striking the centre while the bishops on g3 and d3 rake toward Black's king. When e4 lands you seize space and open lines for the attack.", sayShort: 'Re8 — build Rad1, then break e4.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Rad8@27': {
    intro: { say: "Rad8 — Black doubles on the d-file after making luft with h6. That pawn is a hook: push e5 for space, then reroute a knight toward f5 or lift a rook via the half-open h-file. Black is committed to defence while you choose where to break on the kingside.", sayShort: 'Rad8 — e5, then aim at h6.' }, sources: LON,
  },
  'pro-gothamchess-london::0::Rfd8@27': {
    intro: { say: "Rfd8 — Black brings the f-rook to the centre, with h6 already loosening the kingside. Clamp with e5, then build the attack: a knight heads for g3 and f5, and the half-open h-file points straight at h6. Black has no counterplay, so improve and strike at leisure.", sayShort: 'Rfd8 — e5, then knight to f5.' }, sources: LON,
  },
  'pro-gothamchess-london::1::Re8@9': {
    intro: { say: "Re8 — Black sidesteps the bishop trade and readies e5. Take anyway with Bxg7 Kxg7, removing the fianchetto defender and loosening the king, then castle long and roll h4-h5. The dark squares around Black's king become your highway for the attack.", sayShort: 'Re8 — Bxg7, then castle long, h4.' }, sources: LON,
  },
  'pro-gothamchess-london::1::c5@5': {
    intro: { say: "c5 — Black strikes at the centre. Clamp with d5, seizing a big space advantage in a Benoni structure, then follow with e4, Nf3 and Be2. Your central pawns cramp Black, and you can expand with f4 or play the queenside while Black scrambles for the ...b5 or ...e6 break.", sayShort: 'c5 — d5 clamps, then e4 and space.' }, sources: LON,
  },
  'pro-gothamchess-london::2::Bf5@5': {
    intro: { say: "Bf5 — Black develops the bishop actively outside the pawn chain. Play e3, then challenge it: Nb5 hits c7 and gains a tempo, and Bd3 offers to trade Black's good bishop. Keep the knight lunge and your dark-squared bishop working, and you emerge with the more comfortable game.", sayShort: 'Bf5 — e3 and Nb5, then Bd3.' }, sources: LON,
  },
  'pro-gothamchess-london::2::c6@5': {
    intro: { say: "c6 — Black sets up a solid Slav wall and eyes ...Bf5. Meet the bishop with a plan: h3 and g4 to gain kingside space and harass it, or Bd3 to trade it off. With castling long, the g-pawn storm gives a dangerous attack while Black is short of counterplay.", sayShort: 'c6 — h3 and g4, harass the bishop.' }, sources: LON,
  },
  'pro-gothamchess-london::2::a6@7': {
    intro: { say: "a6 — Black plays slowly on the queenside. Seize the moment with g4, the thematic Jobava space-grab, intending g5 to boot the f6-knight and open lines toward the king. Castle long and storm the kingside; Black is a tempo behind on the wing that matters.", sayShort: 'a6 — g4, then g5 and storm.' }, sources: LON,
  },
  'pro-gothamchess-london::2::c4@17': {
    intro: { say: "c4 — Black gains space but surrenders the d4-square and the tension. Drop the knight into c5, a superb outpost hitting b7 and e6, then undermine with b3 and break in the centre with e4. Black's advanced c-pawn becomes a target once the position opens.", sayShort: 'c4 — Nc5 outpost, then b3 and e4.' }, sources: LON,
  },
  'pro-gothamchess-london::2::b5@19': {
    intro: { say: "b5 — Black kicks the knight and clamps the queenside. Jump into c5, an outpost the b-pawn cannot touch, where the knight eyes b7, d7 and e6. Your isolated d4-pawn is a dynamic asset here: post pieces actively with Ne5 and Rc1 and use the space it grants.", sayShort: 'b5 — Nc5 outpost, play the IQP actively.' }, sources: LON,
  },

  // ===== Stafford Gambit refutation (student WHITE) =====
  'pro-gothamchess-stafford-refute::0::O-O@11': {
    intro: { say: "O-O — Black castles and hopes for chances for the pawn. You are simply a pawn up with a sound structure: castle, then develop calmly with Nd2, c3 and Be3, and offer trades. Blunt the gambit by swapping active pieces; once queens or minors come off, the extra pawn wins.", sayShort: 'O-O — castle, trade pieces, convert the pawn.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::0::Be6@11': {
    intro: { say: "Be6 — Black develops with tempo, eyeing a2 and quick piece play. Castle, guard the soft spots with Nd2 and c3, and finish developing; a later b3 can shut the bishop out. With the extra pawn and no real threats, trade down and grind Black out.", sayShort: 'Be6 — O-O, consolidate, keep the pawn.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::0::Bg4@13': {
    intro: { say: "Bg4 — with h5 in tow, Black tries to whip up a cheap kingside attack. Do not panic: the pin is on a defended bishop. Develop Nd2, castle, and if ...Bxe2 recapture Qxe2. Black has spent tempi and pawns on a bluff; consolidate and the extra pawn plus the loose h5-pawn decide.", sayShort: 'Bg4 — Nd2 and O-O, ignore the bluff.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::0::Be6@13': {
    intro: { say: "Be6 — Black develops the bishop after the committal ...h5. Castle and build solidly with Nd2, and consider b3 to blunt the e6-bishop; the advanced h5-pawn is a long-term weakness, not an attacker. Trade pieces, keep the extra pawn, and convert the healthier position.", sayShort: 'Be6 — O-O and Nd2, h5 is weak.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::1::Nxf2@11': {
    intro: { say: "Nxf2 — the Stafford sacrifice, and it simply loses. Take Kxf2, and after Bc5+ block with d4; if Bxd4+ interpose Be3, trading bishops. When the smoke clears you are a full piece up for a pawn. Do not grab greedily elsewhere — return one unit to blunt the checks and consolidate.", sayShort: 'Nxf2 — Kxf2, d4 blocks, win a piece.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::1::Be6@13': {
    intro: { say: "Be6 — Black finishes developing after retreating the knight to c5. You keep an extra pawn and a space-gaining e5-pawn. Kick the knight with b4, drive it back, then d4 and Nd2 to build a broad centre. Trade where you can; the sound extra pawn tells over time.", sayShort: 'Be6 — b4 kicks the knight, then d4.' }, sources: STAF,
  },
  'pro-gothamchess-stafford-refute::1::Bf5@13': {
    intro: { say: "Bf5 — Black develops the bishop to eye d3 and c2. Cover with Nd2, then drive the knight back with b4; your e5-pawn cramps Black and you remain a pawn to the good. Complete with Be2 and O-O, keep things solid, and convert the extra material.", sayShort: 'Bf5 — Nd2, then b4, keep the pawn.' }, sources: STAF,
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
  'pro-gothamchess-milner-barry::0::Qxe5@19': {
    intro: { say: "Qxe5 — Black snatches a second pawn, but the queen is exposed and the king is stuck in the centre. Strike with Re1, hitting the queen with tempo, then Nb5 eyeing c7 and d6 while Bf4 joins in. Your lead in development is worth far more than two pawns — open lines and hunt the king.", sayShort: 'Qxe5 — Re1 hits the queen, then attack.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::0::Rc8@21': {
    intro: { say: "Rc8 — Black slots the rook onto the c-file, queen still exposed on d4. Gain tempo with Rd1, and after the queen shuffles, Be3 or Bf4 develops with threats while the e5-pawn cramps Black. Your pieces come out with gain of time; the gambit pawn has bought a lasting initiative against the uncastled king.", sayShort: 'Rc8 — Rd1 hits the queen, then Be3.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::0::Nb4@15': {
    intro: { say: "Nb4 — Black tries to trade off your attacking light-squared bishop. Sidestep with Be2, keeping the bishop for the assault, then a3 drives the b4-knight back with tempo. Your broad centre with d4 and e5 and your lead in development remain; regroup with Nc3 and Bf4 and press on the kingside.", sayShort: 'Nb4 — Be2 saves it, then a3 kicks.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::1::a6@19': {
    intro: { say: "a6 — Black keeps the knight out of b5 and declines the second pawn, queen sitting on d4. Continue Qe2 and Rd1, gaining tempo on the exposed queen, then Bf4 and Rac1 to pour pieces into the open lines. The e5-pawn cramps Black and the king lingers in the centre — the gambit pawn is well spent.", sayShort: 'a6 — Qe2 and Rd1, gain tempo, attack.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::1::Qxe5@19': {
    intro: { say: "Qxe5 — Black takes the second pawn and the queen strays into the open. Hit it with Re1, winning a tempo, then swing Nb5 and Bf4 at the vulnerable king in the centre. Two pawns mean nothing against this lead in development; rip open lines and attack.", sayShort: 'Qxe5 — Re1 with tempo, then Nb5.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::1::Nb4@15': {
    intro: { say: "Nb4 — Black jumps in to swap your key attacking bishop. Retreat Be2, preserving the bishop, and prepare a3 to boot the knight back with tempo. Your d4-e5 pawn chain and development lead stay intact; regroup with Nc3 and Bf4 and continue the kingside build.", sayShort: 'Nb4 — Be2 keeps the bishop, then a3.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::2::f6@11': {
    intro: { say: "f6 — Black strikes at the e5-chain while the knight sits offside on h6. Open the position with exf6, and after ...Qxf6 or ...Nxf6 you gain the e5-square for a knight, open lines toward the exposed king, and the better development. Follow with O-O, Re1 and Ne5; Black is uncoordinated.", sayShort: 'f6 — exf6, seize e5 and open lines.' }, sources: MB,
  },

  // ===== English Opening (student WHITE) =====
  'pro-gothamchess-english::1::Be7@7': {
    intro: { say: "Be7 — Black chooses a quiet, solid setup. Grab the centre with d4: after exd4 exd4 you gain space and easy development, a reversed Sicilian with an extra tempo. Continue Be2, O-O and press the d-file and the queenside with b4. Your slightly freer game gives a pleasant, risk-free pull.", sayShort: 'Be7 — d4 grabs the centre and space.' }, sources: ENG,
  },

  // ===== Vienna Gambit (student WHITE) =====
  'pro-gothamchess-vienna::0::exf4@5': {
    intro: { say: "exf4 — the accepted Vienna Gambit. Chase the knight with e5, then develop fast with Nf3, Bc4 and Qe2; the bishop and queen train on f7 while Black is undeveloped. After ...dxe5 regain the pawn with Nxe5, keeping the pin and the initiative. Your development lead is the real prize, not the f4-pawn.", sayShort: 'exf4 — e5 chases, then Bc4 hits f7.' }, sources: VIE,
  },
  'pro-gothamchess-vienna::0::Be6@13': {
    intro: { say: "Be6 — Black develops and eyes your queenside pawns. With the queen already pressing g7 and a big e5-pawn cramping Black, keep building the attack: Nf3, Bd3 and O-O, then Bh6 to hound g7. Your bishop pair and central space outweigh the doubled c-pawns — play on the kingside where Black is loose.", sayShort: 'Be6 — develop Nf3 and Bd3, attack g7.' }, sources: VIE,
  },
  'pro-gothamchess-vienna::0::h6@15': {
    intro: { say: "h6 — Black makes luft, but it hands you a hook on the kingside. Develop Bd3 and castle, bolster the centre with d4, and the queen on g3 keeps eyeing the king. Later g4-g5 or piece play against h6 opens the attack; your bishop pair and central pawns give the initiative while Black is still catching up.", sayShort: 'h6 — Bd3 and O-O, then hit h6.' }, sources: VIE,
  },
};
