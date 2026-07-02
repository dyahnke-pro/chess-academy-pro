import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Carlsen repertoire batch: French, Scandinavian,
// Caro-Kann, Modern (student BLACK); Réti / Zukertort (student WHITE). House
// voice, board-safe, line-grounded. Every entry answers the opponent's frequent
// deviation with the student-side plan.

const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const SCAND = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const MOD = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Modern_Defense'];
const RETI = ['concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'];

export const SUBLINE_NARRATION_PRO_CARLSEN_SO: Record<string, SublineNarration> = {
  // ===== French Defence (student BLACK) — Tarrasch Open / Advance Euwe / Exchange / Winawer =====
  'pro-carlsen-french::0::exd5@8': {
    intro: { say: "exd5 — the Open Tarrasch, White resolving the centre. Recapture …Qxd5, and after Bc4 drop the queen to …Qd6, then develop …Nf6, …a6 and …Nc6; both sides play with hanging or isolated pawns, and Black's quick, harmonious development gives full equality with easy piece play.", sayShort: 'exd5 — …Qxd5 and …Qd6, develop.' }, sources: FR,
  },
  'pro-carlsen-french::0::Nxc6@10': {
    intro: { say: "Nxc6 — White trades to fix your queenside. Recapture …bxc6; the doubled pawns come with a broad centre and the half-open b-file, so follow with …Nf6, …Bd6 and …O-O, then aim …c5 or …e5 to roll the centre. The bishop pair and central mass outweigh the structural nick.", sayShort: 'Nxc6 — …bxc6, then …Nf6 and …Bd6.' }, sources: FR,
  },
  'pro-carlsen-french::1::a3@10': {
    intro: { say: "a3 — White prepares b4 to gain queenside space in the Advance. Strike the head of the chain with …f6, prying open lines for your pieces, while …Qb6 and …Nge7-f5 gang up on d4; the French counter against the e5-d4 chain is thematic and strong here.", sayShort: 'a3 — …f6, then …Nf5 hits d4.' }, sources: FR,
  },
  'pro-carlsen-french::1::Bd3@10': {
    intro: { say: "Bd3 — White develops the bishop in the Advance, but on d3 it bites on your solid chain. Play …Qb6 hitting b2 and d4, reroute …Nh6-f5, and time …cxd4; your pressure on the base of the chain outweighs White's kingside hopes.", sayShort: 'Bd3 — …Qb6 and …Nf5, target d4.' }, sources: FR,
  },
  'pro-carlsen-french::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the tension and hands you the d4-square. Recapture …Bxc5, the bishop raking toward f2, then …Nge7 and …f6 pressuring e5; with the chain dissolved Black is comfortably active and equal.", sayShort: 'dxc5 — …Bxc5, then …f6 hits e5.' }, sources: FR,
  },
  'pro-carlsen-french::1::O-O@14': {
    intro: { say: "O-O — White castles in the main Advance Euwe. The plan runs itself: …Nf5 planting on the fine square and pressing d4, then …Be7, …O-O and …Qb6 or …Rc8 stacking on the base; Black's pieces flow to natural squares while d4 stays chronically weak.", sayShort: 'O-O — …Nf5 and …Qb6, hit d4.' }, sources: FR,
  },
  'pro-carlsen-french::1::Nc3@14': {
    intro: { say: "Nc3 — White develops the knight but leaves d4 without a pawn defender. Continue …Nf5 hitting d4, …Be7 and …O-O, then …Qb6 or …Nb4 eyeing d3; Black's easy development and the pressure on d4 give a pleasant game.", sayShort: 'Nc3 — …Nf5 and …Be7, press d4.' }, sources: FR,
  },
  'pro-carlsen-french::2::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetric and drawish by reputation. Do not wait for the draw: mirror …Bd6 and …Ne7, castle, then contest a file with …Re8 and find the better minor piece; Black outplays, not out-waits.", sayShort: 'Bd3 — …Bd6 and …Ne7, then …Re8.' }, sources: FR,
  },
  'pro-carlsen-french::2::c4@6': {
    intro: { say: "c4 — the Monte Carlo Exchange, White giving himself an isolated queen's pawn. Develop …Nf6, …Be7 and …O-O, then blockade d5 with …Nb6 or …Nbd7-b6 and press the isolani; classic anti-IQP technique in Black's favour.", sayShort: 'c4 — blockade d5, press the IQP.' }, sources: FR,
  },
  'pro-carlsen-french::2::Bd3@8': {
    intro: { say: "Bd3 — a quiet Exchange move-order, bishop to d3. Complete the symmetry with …Bd6 and …Ne7, castle, and grab the e-file with …Re8; the position is level, so play for the small imbalance and out-develop rather than settle for the draw.", sayShort: 'Bd3 — …Bd6 and …Ne7, contest e-file.' }, sources: FR,
  },
  'pro-carlsen-french::2::c5@10': {
    intro: { say: "c5 — White gains space and evicts your bishop. Retreat …Be7, then undermine the advanced pawn with …b6 and …O-O; c5 is loose once you strike it, and Black's freer development lets you press the overextension. Comfortable and active.", sayShort: 'c5 — …Be7, then …b6 undermines.' }, sources: FR,
  },
  'pro-carlsen-french::2::Bd3@10': {
    intro: { say: "Bd3 — White develops before resolving the centre tension. Play …O-O, …Nc6 and …Bg4, finishing development with easy piece play; if White clarifies with cxd5 you recapture and blockade the square, and the symmetric Exchange stays comfortable for the more active side.", sayShort: 'Bd3 — …O-O, …Nc6 and …Bg4.' }, sources: FR,
  },
  'pro-carlsen-french::3::exd5@6': {
    intro: { say: "exd5 — the Delayed Exchange Winawer, releasing the central tension. Recapture …exd5, develop …Nc6, …Nge7 and …O-O keeping the bishop on b4, then contest the e-file; Black's harmonious pieces and the pin on c3 give an easy, equal game.", sayShort: 'exd5 — …exd5 and …Nc6, develop.' }, sources: FR,
  },
  'pro-carlsen-french::3::Ne2@6': {
    intro: { say: "Ne2 — the Alekhine-Maróczy Gambit, White offering e4 for the bishop pair. Grab it with …dxe4, and after a3 retreat …Be7 rather than trade; return the pawn with …Nf6 and reach a solid, comfortable French a tempo to the good.", sayShort: 'Ne2 — …dxe4, then …Be7 and …Nf6.' }, sources: FR,
  },
  'pro-carlsen-french::3::Bd2@8': {
    intro: { say: "Bd2 — the Bogoljubow, White unpinning to recapture on c3 with the bishop and keep the pawns intact. Play …Ne7, …b6 and …Ba6, trading off your bad light-squared bishop; you neutralise White's only edge and reach a healthy, comfortable game.", sayShort: 'Bd2 — …Ne7 and …b6, trade bishops.' }, sources: FR,
  },
  'pro-carlsen-french::3::Qg4@12': {
    intro: { say: "Qg4 — the mainline Winawer, White lunging at g7. Cover it solidly with …g6, then …Qc7 hitting e5, …Nge7 and …Bd7-a4 piling on the shattered c-pawns; Black's queenside play against the doubled pawns is the classic Winawer trump.", sayShort: 'Qg4 — …g6, then …Qc7 hits e5.' }, sources: FR,
  },
  'pro-carlsen-french::3::h4@12': {
    intro: { say: "h4 — the sharp h4 Winawer, White grabbing kingside space. Answer …Qa5 pressuring c3, then …Bd7, …c4 clamping and …Nge7-f5; the wild structure favours the side that strikes the base of the chain first, and that is Black.", sayShort: 'h4 — …Qa5, then …c4 clamps.' }, sources: FR,
  },
  'pro-carlsen-french::3::a4@12': {
    intro: { say: "a4 — White gains queenside space and eyes Ba3. Continue …Qa5 hitting c3, then …Bd7, …c4 fixing the pawns and …Nge7-f5; the doubled c-pawns stay weak and Black's plan against them runs itself.", sayShort: 'a4 — …Qa5, then …c4 and …Nf5.' }, sources: FR,
  },

  // ===== Scandinavian Defence (student BLACK) — …Qa5 main / …Nf6 exf6 / Modern-Marshall / …Qd8 Valencian =====
  'pro-carlsen-scandinavian::0::Nf3@6': {
    intro: { say: "Nf3 — the main line against the …Qa5 Scandinavian. Build the trusted setup: …Nf6, …c6, …Bf5 developing the bishop outside the pawn chain, then …e6, …Nbd7 and long castling; Black is rock-solid with a clear plan of queenside play and pressure down the d-file.", sayShort: 'Nf3 — …Nf6, …c6 and …Bf5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Bc4@8': {
    intro: { say: "Bc4 — White develops the bishop actively toward f7. Continue …Bf5 getting your own bishop out, …e6 and …Nf6, then …Nbd7 and …Bd6 or …Be7; the light bishop outside the chain is Black's pride, and the solid structure gives an easy, balanced game.", sayShort: 'Bc4 — …Bf5 and …e6, then …Nf6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::g3@6': {
    intro: { say: "g3 — White fianchettos to pressure the long diagonal and your d5-square. Answer …Nf6, …c6 and …Bg4 pinning the f3-knight, then …e6 and …Nbd7; you blunt the g2-bishop with the …c6 wall and develop harmoniously to full equality.", sayShort: 'g3 — …Nf6, …c6 and …Bg4.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Bd2@12': {
    intro: { say: "Bd2 — White unpins and readies queenside expansion. Complete development with …Nf6, …Nbd7 and …Bd6 or …Be7, then castle; your queen sits comfortably on a5 or drops to c7, and the classic solid Scandinavian holds firm with pressure on d4.", sayShort: 'Bd2 — …Nf6 and …Nbd7, develop.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Ne5@10': {
    intro: { say: "Ne5 — White posts the knight aggressively in the centre. Develop …Nf6, then …e6 and …Nbd7 challenging the intruder; if it stays, …Bd6 hits it, and trades only ease Black's game. Solid and unbothered by the sortie.", sayShort: 'Ne5 — …Nf6 and …Nbd7, challenge it.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Bd2@10': {
    intro: { say: "Bd2 — White develops the bishop and prepares to expand. Play …e6 solidifying, …Nf6 and …Nbd7, then …Bd6 or …Be7 and castle; the reliable …Qa5 Scandinavian gives Black a firm centre and easy piece play with no weaknesses.", sayShort: 'Bd2 — …e6 and …Nf6, then …Nbd7.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Bd3@10': {
    intro: { say: "Bd3 — White challenges your good light-squared bishop. Trade …Bxd3 willingly, and after Qxd3 offer queens with …Qa6; the resulting position is dead level, Black has no bad pieces, and the sturdy structure means only comfortable equality ahead.", sayShort: 'Bd3 — …Bxd3, then …Qa6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::0::Qe2@12': {
    intro: { say: "Qe2 — White connects and eyes the e-file. Continue …Nf6, …Nbd7 and …Bd6 or …Be7, then castle and meet any central push calmly; your bishop on f5 and the solid …c6 chain leave Black with an easy, weakness-free game.", sayShort: 'Qe2 — …Nf6 and …Nbd7, castle.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::Be2@12': {
    intro: { say: "Be2 — White develops modestly in the …exf6 Scandinavian. You are already castled; continue …Re8 seizing the open e-file, …Bg4 or …Bf5 for the bishop pair, and …Nd7; the healthy structure and two bishops give Black comfortable, active equality.", sayShort: 'Be2 — …Re8 and …Bg4, use e-file.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::Be3@12': {
    intro: { say: "Be3 — White supports d4 and eyes the queenside. Answer …Re8 on the open file, …Bf5 or …Bg4 activating the bishop pair, then …Nd7 and …Qe7; Black's harmonious development and the two bishops outweigh the doubled f-pawns.", sayShort: 'Be3 — …Re8 and …Bf5, activate bishops.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::c3@12': {
    intro: { say: "c3 — White props d4 solidly. Take the e-file with …Re8, develop …Bg4 and …Nd7, then prepare the …f5 break to open lines for the bishop pair; the doubled f-pawns are a small price for the two bishops and active play.", sayShort: 'c3 — …Re8, then …f5 break.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::Bd3@10': {
    intro: { say: "Bd3 — White aims the bishop at your king. Castle …O-O, then …Re8 grabbing the e-file, …Nd7 and …Nf8 covering the kingside; with the bishop pair and a rock-solid king, Black meets any attack and presses in the long game.", sayShort: 'Bd3 — …O-O and …Re8, solid king.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::Bc4@8': {
    intro: { say: "Bc4 — White forces an early queen trade with Qe2+. Meet it head-on: …Bd6, …Qe7 and after the swap …Bxe7; the queenless middlegame is level, Black keeps the bishop pair, and the sound structure offers only comfortable equality to grind.", sayShort: 'Bc4 — …Bd6 and …Qe7, trade queens.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::1::Nf3@8': {
    intro: { say: "Nf3 — White develops before the central push. Play …Bd6 eyeing the kingside, …O-O and …Re8, then …Bg4 and …Nd7; the …exf6 structure gives Black the two bishops and an open e-file for easy, active piece play.", sayShort: 'Nf3 — …Bd6 and …O-O, then …Re8.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Bb5+@4': {
    intro: { say: "Bb5+ — White checks to disrupt your recapture. Block with …Bd7, and after the bishop retreats you have gained a tempo: …Nxd5 regains the pawn, then …Bf5 or …g6 develops smoothly. Black equalises comfortably with active pieces.", sayShort: 'Bb5+ — …Bd7, then …Nxd5 and …Bf5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::c4@6': {
    intro: { say: "c4 — the Marshall, gaining space and kicking the knight. The natural retreat …Nb6 concedes White a broad c4-d4 centre; be accurate and challenge it at once — fianchetto …g6 and …Bg7, then strike with …c5 or …e5 rather than let the pawns stand. Handled actively Black is fine; drift and White's space presses.", sayShort: 'c4 — …Nb6, then …Bg7 and strike center.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Nf3@4': {
    intro: { say: "Nf3 — the Modern Scandinavian, White developing before reclaiming space. Regain the pawn with …Nxd5, then fianchetto …g6 and …Bg7 pointing at the long diagonal; even after c4 kicks with …Nb6, Black completes …O-O and …Nc6 pressuring d4. Sound and active.", sayShort: 'Nf3 — …Nxd5, then …g6 and …Bg7.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::c4@4': {
    intro: { say: "c4 — the Panov Transfer, White clinging to the extra pawn. Undermine it with …c6, and after the exchange you reach a Panov structure; develop …Nf6, …e6 and …Bb4 pinning, then blockade d5 and press the isolated pawn. Comfortable anti-IQP play.", sayShort: 'c4 — …c6 undermines, then …e6 and …Bb4.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::c4@8': {
    intro: { say: "c4 — the Richter, gaining space after your fianchetto. The knight steps back …Nb6, then complete …Bg7 and …O-O; strike the centre with …Nc6 and …e5 or …c5 before White consolidates. Active piece play keeps the broad centre in check.", sayShort: 'c4 — …Nb6 and …Bg7, then …c5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Nc3@4': {
    intro: { say: "Nc3 — White develops the knight and eyes your d5-post. Recapture …Nxd5, and after Bc4 step back …Nb6 gaining a tempo on the bishop, then …Nc6 hitting d4; Black develops with tempo and stands comfortably, ready for …g6 or …Bf5.", sayShort: 'Nc3 — …Nxd5, …Nb6 and …Nc6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Re1@12': {
    intro: { say: "Re1 — White centralises the rook after both sides castle. Develop …Nc6 hitting d4, then …Bg4 pinning or …c5 striking the centre, and reroute …Nb6 if kicked; Black's fianchettoed bishop and central pressure give a fully sound, balanced middlegame.", sayShort: 'Re1 — …Nc6 and …c5, hit the center.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Be2@6': {
    intro: { say: "Be2 — a modest developing move in the Marshall. Fianchetto …g6 and …Bg7, castle, then …Nc6 and …c5 or …e5 to challenge the centre; with the light bishop still flexible, Black develops freely to comfortable equality.", sayShort: 'Be2 — …g6 and …Bg7, then …c5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Bc4@8': {
    intro: { say: "Bc4 — White targets your centralised knight. Complete …Bg7 first, then …Nb6 nudging the bishop and …O-O, followed by …Nc6 and …c5; Black gains tempi on the bishop and generates active play against d4.", sayShort: 'Bc4 — …Bg7, then …Nb6 and …c5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::h3@12': {
    intro: { say: "h3 — a quiet luft in the Richter after both castle. Improve with …Nc6 pressuring d4, then …c5 striking the centre or …Bf5 developing; Black's harmonious fianchetto setup and central counterplay keep the game balanced and pleasant.", sayShort: 'h3 — …Nc6, then …c5 strikes center.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::h3@10': {
    intro: { say: "h3 — White questions your pinning bishop in the …Qd8 lines. Retreat …Bh5 keeping the pin, or simplify …Bxf3, then finish …e6, …c6, …Be7 and …O-O; the compact …Qd8 setup is rock-solid, and Black equalises with straightforward development.", sayShort: 'h3 — …Bh5 or …Bxf3, then develop.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::Bc4@8': {
    intro: { say: "Bc4 — White aims the bishop at f7. Expand on the queenside: …a6 and …b5 kicking the bishop back to b3, then …c5 striking the centre with tempo; Black gains space and active play while the bishop is pushed offside. Energetic and sound.", sayShort: 'Bc4 — …a6 and …b5, then …c5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::Bc4@6': {
    intro: { say: "Bc4 — an early bishop sortie against the …Qd8 lines. Develop …Nf6 and …a6 preparing …b5, and after a4 stops it, play …Nc6 and …e6 with …Be7; Black completes development smoothly and stands solidly equal.", sayShort: 'Bc4 — …Nf6 and …a6, then …Nc6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::Bg5@8': {
    intro: { say: "Bg5 — White pins the knight and eyes a kingside setup. Reinforce with …c6, develop …Bf5 outside the chain, then …e6 and …Nbd7; the solid …Qd8 structure absorbs the pin, and Black is comfortable with the good bishop already active.", sayShort: 'Bg5 — …c6 and …Bf5, then …e6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::Nf3@6': {
    intro: { say: "Nf3 — White develops the knight first. Answer …Nf6 and …Bg4, pinning to pressure d4, then …e6, …c6 and …Be7; the …Qd8 Scandinavian is a compact fortress, and Black's active bishop gives easy, balanced play.", sayShort: 'Nf3 — …Nf6 and …Bg4, pin d4.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::h3@8': {
    intro: { say: "h3 — White prevents …Bg4 before developing. Play …c6 solidifying, then …Bf5 getting the bishop out the other way, followed by …e6, …Nbd7 and …Be7; Black reaches the ideal compact setup and equalises with no trouble.", sayShort: 'h3 — …c6 and …Bf5, then …e6.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::3::h3@12': {
    intro: { say: "h3 — White finally questions the pinned bishop. Keep it with …Bh5, or simplify …Bxf3, then finish …c6, …Be7 and …O-O; Black's development is complete and harmonious, and the solid …Qd8 structure means comfortable equality.", sayShort: 'h3 — …Bh5, then …Be7 and …O-O.' }, sources: SCAND,
  },

  // ===== Caro-Kann Defence (student BLACK) — Two Knights exf6 / Panov & Exchange / Endgame =====
  'pro-carlsen-caro-kann::0::Bc4@10': {
    intro: { say: "Bc4 — White develops and forces queens off with Qe2+. Answer …Bd6 and …Qe7, trading into a level, queenless middlegame; Black keeps the bishop pair and, after …O-O and …Re8, presses the open e-file. Solid equality with the better minor pieces.", sayShort: 'Bc4 — …Bd6 and …Qe7, keep bishops.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::0::Be2@12': {
    intro: { say: "Be2 — a modest setup in the Two Knights …exf6 structure. Castle …O-O, then …Re8 seizing the e-file, …Bg4 or …Bf5 activating the pair, and …Nd7; the two bishops and the open file give Black comfortable, active play.", sayShort: 'Be2 — …O-O and …Re8, use e-file.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::0::Ng3@8': {
    intro: { say: "Ng3 — White keeps the knights on, but the g3-knight is a target. Chase it with …h5 and …h4, gaining kingside space and driving it back, then …Bf5 developing the good bishop outside the chain; Black seizes the initiative on the kingside. Sharp and strong.", sayShort: 'Ng3 — …h5 and …h4, then …Bf5.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::0::Be3@12': {
    intro: { say: "Be3 — White braces d4 and eyes the queenside. Castle …O-O, then …Re8 on the open e-file, …Bf5 or …Bg4 for the bishop pair, and …Nd7; Black's harmonious development outweighs the doubled f-pawns and holds easy equality.", sayShort: 'Be3 — …O-O and …Re8, activate bishops.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::0::h3@12': {
    intro: { say: "h3 — White makes luft before developing. Just castle …O-O, take the e-file with …Re8, and bring the bishop out with …Bf5, then …Nd7 and …Qe7; the bishop pair and open file are Black's lasting trumps in this comfortable structure.", sayShort: 'h3 — …O-O, …Re8 and …Bf5.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::0::Bc4@12': {
    intro: { say: "Bc4 — White posts the bishop toward f7. Castle …O-O, then …Re8, …Nd7 and …Nb6 gaining a tempo on the bishop; Black develops smoothly, keeps the two bishops, and presses the open e-file. Easy, active equality.", sayShort: 'Bc4 — …O-O and …Re8, then …Nb6.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::1::c4@6': {
    intro: { say: "c4 — the Panov Attack, an isolated queen's pawn battle. Develop …Nf6, …e6 and …Bb4 pinning the c3-knight, then …O-O and …Nbd7; you blockade d5, trade pieces, and press the isolani into the endgame. Classic anti-IQP technique, comfortable for Black.", sayShort: 'c4 — Panov; …Bb4 and blockade d5.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::1::h3@10': {
    intro: { say: "h3 — a quiet Exchange Caro, White stopping …Bg4. Fianchetto with …g6 and …Bg7 aiming at d4, castle, then use the half-open c-file with …Rc8; the symmetric structure is level, and Black's smooth development plays for the small edge.", sayShort: 'h3 — …g6 and …Bg7, then …Rc8.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::1::Nf3@6': {
    intro: { say: "Nf3 — the calm Exchange Caro. Develop …Nc6 and …Nf6, then bring the bishop out with …Bf5 or …Bg4 before playing …e6; the light bishop outside the chain is Black's pride, and the equal structure gives a comfortable, weakness-free game.", sayShort: 'Nf3 — …Nc6, …Nf6 and …Bf5.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::1::Nf3@10': {
    intro: { say: "Nf3 — White develops in the Exchange. Bring the bishop out with …Bg4 pinning, then …e6, …Bd6 and …O-O; you never own a bad bishop, and the symmetric structure favours the more active side. Play on for the small edge.", sayShort: 'Nf3 — …Bg4 pin, then …e6 and …Bd6.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::1::Nf3@12': {
    intro: { say: "Nf3 — the Rubinstein Exchange after your …Bg4 pin. Continue …e6, …Bd6 and …Qc7 eyeing the trade on f4, then …O-O; the option of …Bxf3 doubling White's pawns and the easy development give Black a pleasant, balanced game.", sayShort: 'Nf3 — …e6 and …Bd6, then …O-O.' }, sources: CK,
  },
  'pro-carlsen-caro-kann::2::Nfd2@10': {
    intro: { say: "Nfd2 — White reroutes the knight in this queenless Endgame Caro. With queens off and White's king stuck on d1, grab space: …g5 and …h5 clamp the kingside, then …Bd6, …Nbd7 and …Ke7 connecting; Black's freer king and space give the more pleasant ending.", sayShort: 'Nfd2 — …g5 and …h5, grab space.' }, sources: CK,
  },

  // ===== Modern Defence (student BLACK) — …d6 systems / …c6 Gurgenidze-Standard / Pseudo-Austrian =====
  'pro-carlsen-modern::0::Bc4@6': {
    intro: { say: "Bc4 — White develops the bishop toward f7. Hit the centre with …Nf6 attacking e4, then …O-O, …c6 and …b5 gaining queenside space, or …Nbd7 and …e5; the Modern lets Black castle safely and strike the centre once White has committed.", sayShort: 'Bc4 — …Nf6, then …O-O and …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::Be2@6': {
    intro: { say: "Be2 — a quiet, solid setup. Play …Nf6, …O-O and …Nc6 or …Nbd7, then break with …e5 or …c5 to challenge d4; the Modern reaches a King-Indian-flavoured middlegame where Black castles first and counters in the centre.", sayShort: 'Be2 — …Nf6 and …O-O, then …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::c3@6': {
    intro: { say: "c3 — Geller's System, a modest but solid centre. Develop …Nf6, …O-O and …Nbd7, then strike …e5 challenging d4; if White holds the centre, reroute …Re8 and …e5-e4 or …c5. Black castles safely and plays for the central break.", sayShort: 'c3 — …Nf6 and …O-O, then …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::h3@6': {
    intro: { say: "h3 — White stops …Bg4 and prepares a broad centre. Continue …Nf6, …O-O and …Nc6 or …Nbd7, then break with …e5; the Modern lets Black complete development in safety and counter d4 at the right moment.", sayShort: 'h3 — …Nf6 and …O-O, then …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::c4@6': {
    intro: { say: "c4 — White claims a big centre, transposing toward King-Indian waters. Pin with …Bg4, then …Nc6 and …e5 striking d4, or …Nd7 and …e5; trading on f3 eases the cramp, and Black counters the broad centre with the thematic …e5 break.", sayShort: 'c4 — …Bg4, then …Nc6 and …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::c3@10': {
    intro: { say: "c3 — White supports d4 after both sides castle. Develop …Nbd7 or …Nc6, then prepare …e5 hitting the centre, with …Re8 behind it; the Modern middlegame rewards the …e5 break, and Black's harmonious setup meets White's centre head-on.", sayShort: 'c3 — …Nbd7, then …e5 break.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::h3@10': {
    intro: { say: "h3 — a luft after both sides castle. Continue …Nc6 or …Nbd7 and prepare …e5, then …Re8 supporting the break; Black completes development in comfort and challenges d4 with the standard central strike. Balanced, thematic play.", sayShort: 'h3 — …Nbd7, then …e5 and …Re8.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::c3@8': {
    intro: { say: "c3 — White bolsters d4 with the pawn. Castle …O-O, develop …Nbd7 or …Nc6, then break …e5 challenging the centre; the Modern lets Black tuck the king away first and counter in the middle. Sound and flexible.", sayShort: 'c3 — …O-O and …Nbd7, then …e5.' }, sources: MOD,
  },
  'pro-carlsen-modern::0::h3@8': {
    intro: { say: "h3 — White prevents …Bg4 before castling. Play …O-O, then …Nc6 or …Nbd7 and the …e5 break, with …Re8 to follow; Black develops safely and strikes d4 at the ideal moment. A comfortable Modern middlegame.", sayShort: 'h3 — …O-O, then …e5 break.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::f4@6': {
    intro: { say: "f4 — the aggressive Gurgenidze setup, White massing pawns. Strike the centre with …d5, and after e5 play …h5 to freeze the kingside and reroute …Nh6-f5; White's broad pawns become overextended targets while Black blockades and undermines with …c5 or …f6. Double-edged and sound.", sayShort: 'f4 — …d5, then …h5 and …Nf5.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::Bc4@6': {
    intro: { say: "Bc4 — White eyes f7 in the Standard Modern. Blunt it with …d6 and …e6 building a small centre, then …Nd7, …b5 and …Qc7 expanding on the queenside; the flexible Modern setup meets White's aim on f7 and counters on the wing.", sayShort: 'Bc4 — …d6 and …e6, then …b5.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::Be3@6': {
    intro: { say: "Be3 — White braces for a queenside build. Challenge at once with …d5, and after Qd2 exchange …dxe4, then …Nd7, …Ngf6 and …O-O; Black frees the position early and reaches a comfortable, solid game with the bishop humming on g7.", sayShort: 'Be3 — …d5, then …dxe4 and …Nd7.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::h3@6': {
    intro: { say: "h3 — White prepares Be3 and a slow build. Play …d6, then …b5 grabbing queenside space, …Nd7 and …Qc7; the Modern lets Black expand on the wing where White has committed, with …a5-b4 to follow. Flexible and active.", sayShort: 'h3 — …d6 and …b5, expand queenside.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::e5@10': {
    intro: { say: "e5 — White gains space and kicks the knight. Retreat …Nfd7 or jump …Ne4, then break the chain with …c5 hitting d4 and …f6 hitting e5; White's advanced pawns are targets, and Black's counterplay against the base gives full equality.", sayShort: 'e5 — …Nfd7, then …c5 and …f6.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::Bf4@8': {
    intro: { say: "Bf4 — White develops the bishop actively. Resolve the centre with …dxe4, and after Nxe4 challenge with …Nf6 or …Nd7; you trade into a clean structure with the strong g7-bishop and easy development, reaching comfortable equality.", sayShort: 'Bf4 — …dxe4, then …Nf6.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::Be2@8': {
    intro: { say: "Be2 — a quiet setup after …d5. Develop …Bg4 pinning the f3-knight, then …e6, …Nd7 and …Ngf6, keeping the centre solid; the pin on d4 and Black's harmonious development balance the game comfortably.", sayShort: 'Be2 — …Bg4 pin, then …e6.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::e5@8': {
    intro: { say: "e5 — White advances and grabs space. Pin at once with …Bg4, tying the defender of d4, then …e6, …Nd7 and …c5 striking the base; the advanced e5-pawn is a long-term target and Black's pressure on d4 gives active counterplay.", sayShort: 'e5 — …Bg4 pin, then …c5.' }, sources: MOD,
  },
  'pro-carlsen-modern::1::exd5@8': {
    intro: { say: "exd5 — White clarifies the centre. Recapture …cxd5, and meet Bb5+ with …Nc6 blocking and developing; you get a sound, symmetrical structure with the fine g7-bishop, then …Nf6, …O-O and …Bf5 for easy, balanced play.", sayShort: 'exd5 — …cxd5 and …Nc6, develop.' }, sources: MOD,
  },
  'pro-carlsen-modern::2::Be3@10': {
    intro: { say: "Be3 — the Pseudo-Austrian, White massing pawns. You are castled; strike the centre with …c5 hitting d4, or …Nc6 and …e5, then meet f4-f5 with …Nd4 or …b5 counterplay; the broad centre overextends and Black counters on both breaks. Sharp, balanced play.", sayShort: 'Be3 — …c5 or …Nc6, hit the center.' }, sources: MOD,
  },
  'pro-carlsen-modern::2::e5@10': {
    intro: { say: "e5 — White grabs the centre in the Pseudo-Austrian. Meet it with …dxe5 and …fxe5 opening lines, or retreat …Nfd7 and strike …c5; the advanced pawns become targets, and Black's pressure on d4 and e5 with the g7-bishop gives active counterplay.", sayShort: 'e5 — …dxe5 or …Nfd7, then …c5.' }, sources: MOD,
  },
  'pro-carlsen-modern::2::Be2@10': {
    intro: { say: "Be2 — White develops quietly in the Pseudo-Austrian. Counterstrike with …c5 hitting d4, or …Nc6 and …e5, then …Bg4 pinning; the four-pawn centre is impressive but loose, and Black's timely breaks generate full counterplay. Double-edged and sound.", sayShort: 'Be2 — …c5 and …Nc6, break center.' }, sources: MOD,
  },
  'pro-carlsen-modern::2::Bd3@8': {
    intro: { say: "Bd3 — White develops the bishop before completing the centre. Castle …O-O, then …Nc6 and …e5 hitting d4, or …c5 striking the base; the bishop on d3 blocks the d-file, and Black's central breaks meet the broad pawns head-on. Active, thematic play.", sayShort: 'Bd3 — …O-O and …Nc6, then …e5.' }, sources: MOD,
  },

  // ===== Réti / Zukertort (student WHITE) — big-centre KID setup / Sicilian Invitation / QG Invitation =====
  'pro-carlsen-reti::0::Nbd7@11': {
    intro: { say: "Nbd7 — Black readies the …e5 break in this King-Indian structure. Complete development with O-O and Be3, then meet …e5 with d5 gaining space or keep the tension; your broad e4-d4 centre and easy development give White the more comfortable game with space to press.", sayShort: 'Nbd7 — O-O and Be3, then d5.' }, sources: RETI,
  },
  'pro-carlsen-reti::0::Na6@11': {
    intro: { say: "Na6 — Black routes the knight toward c5 to hit e4. Play O-O, Be3 and h3, and if …Nc5 comes, guard e4 with a timely e5 or reroute Nd2; White's central space and lead in development hold a pleasant, lasting edge.", sayShort: 'Na6 — O-O, Be3 and h3, hold center.' }, sources: RETI,
  },
  'pro-carlsen-reti::0::Bg4@11': {
    intro: { say: "Bg4 — Black pins to ease the pressure on d4. Just castle O-O, then break the pin with h3, and if …Bxf3 Bxf3 you own the bishop pair and a broad centre; play Be3 and d5 or f4, pressing your space advantage. Comfortable for White.", sayShort: 'Bg4 — O-O and h3, keep the pair.' }, sources: RETI,
  },
  'pro-carlsen-reti::0::c5@11': {
    intro: { say: "c5 — Black strikes at the centre, inviting a Benoni. Answer d5 clamping the space, then O-O, Bf4 or Bg5 and a queenside build; the closed centre and your space edge give White a familiar, pleasant middlegame where …e6 and …b5 are met calmly.", sayShort: 'c5 — d5 clamps, then O-O and space.' }, sources: RETI,
  },
  'pro-carlsen-reti::0::O-O@7': {
    intro: { say: "O-O — Black castles before committing in the centre. Seize the space with d4, building the classical e4-d4 pawn duo, then Be2 and O-O; you reach a broad-centre King-Indian type where White's space and simple development promise a lasting pull.", sayShort: 'O-O — play d4, build the center.' }, sources: RETI,
  },
  'pro-carlsen-reti::0::c5@7': {
    intro: { say: "c5 — Black challenges before castling. Play d4, and after …cxd4 Nxd4 you hold a Maróczy-style bind with pawns on c4 and e4; develop Be2, Be3 and O-O, clamping the position. White's space grip gives a comfortable, pressing game.", sayShort: 'c5 — d4 and Nxd4, Maroczy bind.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::e5@5': {
    intro: { say: "e5 — Black grabs the centre in the reversed Sicilian. Restrain it with d3 and O-O, then Nc3, a3 and Rb1 preparing b4 on the queenside; you play a reversed-Sicilian setup a tempo up, pressing where Black's centre leaves the queenside loose. Rich, strategic play.", sayShort: 'e5 — d3 and O-O, then b4.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::d6@9': {
    intro: { say: "d6 — Black sets up a solid Botvinnik structure. Continue Nc3 and d3, then the queenside plan Rb1, a3 and b4, or Ne1-c2 and e3-d4; your harmonious fianchetto setup and flexible breaks give White a pleasant, long-term initiative on the wing.", sayShort: 'd6 — Nc3 and d3, then b4.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::e5@9': {
    intro: { say: "e5 — Black claims the full Botvinnik centre. Play Nc3 and d3, then reroute Ne1-c2 and push b4, or prepare f4 to strike back; the fianchettoed bishop and the queenside expansion give White the standard, pleasant plan against this pawn wall.", sayShort: 'e5 — Nc3 and d3, then b4.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::Nf6@9': {
    intro: { say: "Nf6 — a symmetrical English setup. Break the symmetry with d4, and after …cxd4 Nxd4 you reach a Maróczy-flavoured centre; or keep it flexible with Nc3, d3 and b4. Either way White's extra tempo and space give the more pleasant game to press.", sayShort: 'Nf6 — d4 break or Nc3 and b4.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::Nh6@9': {
    intro: { say: "Nh6 — Black routes the knight toward f5 the offbeat way. Grab the centre with d4, and after …cxd4 Nxd4 you have space and a lead in development; play Nc3 and Be3 and press, since the h6-knight is a touch loose. White stands comfortably better.", sayShort: 'Nh6 — d4 and Nc3, seize center.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::d5@5': {
    intro: { say: "d5 — Black stakes out the centre. Challenge with d4, and after the exchanges Black is often saddled with an isolated or hanging pawn; castle O-O, play Nc3 and Bg5, and blockade the d5-square or the isolani. White's fianchetto and pressure on the centre give a lasting pull.", sayShort: 'd5 — d4, then blockade and press.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::Nf6@5': {
    intro: { say: "Nf6 — a flexible symmetrical setup. Castle O-O, then c4 and Nc3, keeping options between the d4 break and the queenside b4 expansion; your smooth development and the extra tempo of the reversed structure give White a small, comfortable pull to nurse.", sayShort: 'Nf6 — O-O and c4, then d4.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::c5@7': {
    intro: { say: "c5 — Black builds a broad centre. Adopt the King's Indian Attack: d3, Nbd2, e4 and Re1, then e5 clamping the kingside for a slow attack; or strike with c4 for a Catalan. White's flexible fianchetto setup steers into a comfortable plan of his choosing.", sayShort: 'c5 — d3 and Nbd2, then e4.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::c5@9': {
    intro: { say: "c5 — Black expands after …Be7. Continue the King's Indian Attack: Nbd2, e4 and Re1, then e5 gaining kingside space and Nf1-h2-g4 building an attack; White's classic KIA plan promises a dangerous, well-mapped kingside initiative. Play for the attack.", sayShort: 'c5 — Nbd2 and e4, then e5.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::c5@5': {
    intro: { say: "c5 — an early central grab. Castle O-O, then choose your structure: d3, Nbd2 and e4 for the King's Indian Attack, or c4 for a Catalan; both give White a harmonious, flexible game where the fianchettoed bishop and the coming break set the terms.", sayShort: 'c5 — O-O, then d3 and e4.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::Nc6@11': {
    intro: { say: "Nc6 — Black develops in the King's Indian Attack tabiya. Play e4 striking the centre, Re1, then e5 gaining space and Nf1-h2 heading for the kingside; with …Nc6 committed, roll the h- and f-pawns at Black's king. The KIA attack runs on rails.", sayShort: 'Nc6 — e4 and Re1, then e5 attack.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::b6@9': {
    intro: { say: "b6 — Black fianchettos to contest the long diagonal. Continue Nbd2, e4 and Qe2, then e5 clamping the kingside and Nf1-h2-g4 for the attack; the King's Indian Attack gives White a clear kingside plan while Black's queenside setup is slow to bite. Play for the initiative.", sayShort: 'b6 — Nbd2 and e4, then e5.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::a5@11': {
    intro: { say: "a5 — Black grabs queenside space and eyes …a4. Press ahead on the other wing: e4, Re1 and e5, then the King's Indian Attack build Nf1-h2-g4 at the king; the flank pawn does little against your central-to-kingside plan. Trust the attack.", sayShort: 'a5 — e4 and e5, attack the kingside.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::b6@11': {
    intro: { say: "b6 — Black fianchettos after castling. Launch the King's Indian Attack: e4, Re1 and e5, then Nf1-h2-g4 and the h-pawn storm; while Black arranges the queenside bishop, White's kingside initiative arrives first. Play directly for the attack.", sayShort: 'b6 — e4 and e5, then kingside storm.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::f5@5': {
    intro: { say: "f5 — Black heads for a Stonewall structure. Castle O-O, then undermine with d3 and Nbd2 preparing e4 to crack the centre, or play c4, b3 and Bb2 pressuring the long diagonal and the weak e5-square; White's fianchetto and central break exploit the holes the …f5 wall leaves behind.", sayShort: 'f5 — O-O, then c4 and e4 break.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::g6@5': {
    intro: { say: "g6 — Black sets up a double fianchetto. Castle O-O, then play c4 pressuring d5, d3 or d4, and b3 with Bb2, contesting both long diagonals; White's harmonious setup and the pressure on d5 give a comfortable, flexible game with the easier development.", sayShort: 'g6 — O-O and c4, pressure d5.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::Bd6@5': {
    intro: { say: "Bd6 — Black develops the bishop actively toward the kingside. Castle O-O, then play d3 and Nbd2 preparing e4, or c4 pressuring d5; the King's Indian Attack and Catalan plans are both on the table, and White's flexible fianchetto setup keeps a small, pleasant edge.", sayShort: 'Bd6 — O-O, then d3 and e4.' }, sources: RETI,
  },
};
