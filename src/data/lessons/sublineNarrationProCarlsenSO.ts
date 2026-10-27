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
  'pro-carlsen-french::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the tension and hands you the d4-square. Recapture …Bxc5, the bishop raking toward f2, then …Nge7 and …f6 pressuring e5; with the chain dissolved Black is comfortably active and equal.", sayShort: 'dxc5 — …Bxc5, then …f6 hits e5.' }, sources: FR,
  },
  'pro-carlsen-french::2::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetric and drawish by reputation. Do not wait for the draw: mirror …Bd6 and …Ne7, castle, then contest a file with …Re8 and find the better minor piece; Black outplays, not out-waits.", sayShort: 'Bd3 — …Bd6 and …Ne7, then …Re8.' }, sources: FR,
  },
  'pro-carlsen-french::2::c4@6': {
    intro: { say: "c4 — the Monte Carlo Exchange, White giving themselves an isolated queen's pawn. Develop …Nf6, …Be7 and …O-O, then blockade d5 with …Nb6 or …Nbd7-b6 and press the isolani; classic anti-IQP technique in Black's favour.", sayShort: 'c4 — blockade d5, press the IQP.' }, sources: FR,
  },
  'pro-carlsen-french::2::Bd3@8': {
    intro: { say: "Bd3 — a quiet Exchange move-order, bishop to d3. Complete the symmetry with …Bd6 and …Ne7, castle, and grab the e-file with …Re8; the position is level, so play for the small imbalance and out-develop rather than settle for the draw.", sayShort: 'Bd3 — …Bd6 and …Ne7, contest e-file.' }, sources: FR,
  },
  'pro-carlsen-french::2::c5@10': {
    intro: { say: "c5 — White gains space and evicts your bishop. Retreat …Be7, then undermine the advanced pawn with …b6 and …O-O; c5 is loose once you strike it, and Black's freer development lets you press the overextension. Comfortable and active.", sayShort: 'c5 — …Be7, then …b6 undermines.' }, sources: FR,
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
  'pro-carlsen-scandinavian::2::Be2@6': {
    intro: { say: "Be2 — a modest developing move in the Marshall. Fianchetto …g6 and …Bg7, castle, then …Nc6 and …c5 or …e5 to challenge the centre; with the light bishop still flexible, Black develops freely to comfortable equality.", sayShort: 'Be2 — …g6 and …Bg7, then …c5.' }, sources: SCAND,
  },
  'pro-carlsen-scandinavian::2::Bc4@8': {
    intro: { say: "Bc4 — White targets your centralised knight. Complete …Bg7 first, then …Nb6 nudging the bishop and …O-O, followed by …Nc6 and …c5; Black gains tempi on the bishop and generates active play against d4.", sayShort: 'Bc4 — …Bg7, then …Nb6 and …c5.' }, sources: SCAND,
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
  'pro-carlsen-reti::1::e5@5': {
    intro: { say: "e5 — Black grabs the centre in the reversed Sicilian. Restrain it with d3 and O-O, then Nc3, a3 and Rb1 preparing b4 on the queenside; you play a reversed-Sicilian setup a tempo up, pressing where Black's centre leaves the queenside loose. Rich, strategic play.", sayShort: 'e5 — d3 and O-O, then b4.' }, sources: RETI,
  },
  'pro-carlsen-reti::1::d5@5': {
    intro: { say: "d5 — Black stakes out the centre. Challenge with d4, and after the exchanges Black is often saddled with an isolated or hanging pawn; castle O-O, play Nc3 and Bg5, and blockade the d5-square or the isolani. White's fianchetto and pressure on the centre give a lasting pull.", sayShort: 'd5 — d4, then blockade and press.' }, sources: RETI,
  },
  'pro-carlsen-reti::2::c5@5': {
    intro: { say: "c5 — an early central grab. Castle O-O, then choose your structure: d3, Nbd2 and e4 for the King's Indian Attack, or c4 for a Catalan; both give White a harmonious, flexible game where the fianchettoed bishop and the coming break set the terms.", sayShort: 'c5 — O-O, then d3 and e4.' }, sources: RETI,
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
