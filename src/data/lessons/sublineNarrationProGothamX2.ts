import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — GothamChess repertoire batch X2: Anti-Sicilian
// (Rossolimo), Trompowsky, King's Indian Attack, Caro-Kann Advance (student
// WHITE); Caro-Kann, Scandinavian, French Defence, Pirc Defence (student
// BLACK). House voice, board-safe, line-grounded. Each entry answers the
// opponent's frequent deviation with the student-side plan.

const ASIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const TROMP = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'];
const KIA = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'];
const CADV = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const SCAND = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const PIRC = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'];

export const SUBLINE_NARRATION_PRO_GOTHAM_X2: Record<string, SublineNarration> = {
  // ===== Anti-Sicilian / Rossolimo (student WHITE) =====
  'pro-gothamchess-anti-sicilian::0::Nf6@15': {
    intro: { say: "Nf6 — Black redevelops after the central trades. Follow up d4, and once ...cxd4 Nxd4 clears the centre you enjoy a free-flowing position with a lead in development; swing rooks to the d- and e-files, trade on c6 or reroute, and press. A small, lasting Rossolimo edge with the safer king.", sayShort: 'Nf6 — play d4, seize the centre.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::0::Ng6@11': {
    intro: { say: "Ng6 — Black posts the knight kingside instead of striking the centre. Seize it: play c3 and d4, building a broad pawn centre while your pieces stand ready to come out; the extra space and easy development give White a comfortable, familiar Rossolimo pull. Take the centre first, then develop with tempo.", sayShort: 'Ng6 — c3 and d4, take space.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::0::Qxd5@13': {
    intro: { say: "Qxd5 — Black recaptures with the queen, exposing it in the centre. Hit it at once with Nc3, gaining a move, then follow d4 opening lines where your pieces develop faster; the wandering queen and White's smooth build add up to a pleasant, risk-free edge. Chase the queen and finish developing.", sayShort: 'Qxd5 — Nc3 hits queen, then d4.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::0::b6@11': {
    intro: { say: "b6 — Black prepares the long-diagonal bishop. Take the centre before it bites: play c3 and d4, claiming space while Black is still arranging pieces; then develop naturally and open the position on your terms. White's lead in development and central pawns give an easy, comfortable game.", sayShort: 'b6 — c3 and d4 before Bb7.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::1::bxc6@11': {
    intro: { say: "bxc6 — Black accepts doubled c-pawns for the bishop pair and a dark-square grip. Play the Rossolimo way: d3, Nbd2 and c3, then probe the light squares and the fixed c5/c6 pawns with Nc4 and a4; the queenside weaknesses are a permanent target. Manoeuvre patiently and press the structure.", sayShort: 'bxc6 — d3 and Nbd2, target pawns.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::Ba6@11': {
    intro: { say: "Ba6 — Black activates the bishop against d3 and eyes ...c4. Prop the queenside with b3, then turn to where you are stronger: the e5-pawn grants kingside space, so develop Nbd2, Re1 and roll f4-f5 at the king. White attacks on the kingside while the queenside stays sealed. Play where the pawn chain points.", sayShort: 'Ba6 — b3, then f4-f5 kingside.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::f6@11': {
    intro: { say: "f6 — Black challenges the e5-spearhead. Castle and stay calm: after ...fxe5 recapture and the half-open lines plus your lead in development favour White; if Black delays the capture, the e5-pawn keeps its cramping grip. Either way White stands easier — castle first and let Black resolve the tension.", sayShort: 'f6 — castle, keep the e5 clamp.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::a5@11': {
    intro: { say: "a5 — Black grabs queenside space and stops b4. Just castle and build your own play: the e5-pawn hands you kingside space, so Nbd2, Re1 and the f4-f5 push storm toward the king. Black's flank push never touches where the game is decided. Ignore the wing and press on the kingside.", sayShort: 'a5 — castle, then f4-f5 storm.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::Qc7@11': {
    intro: { say: "Qc7 — Black pressures the e5-pawn from c7. Castle and support the spearhead with f4, then Nbd2 and Re1; the pawn on e5 cramps Black and gives White the kingside space to press. Hold the chain, expand with f4-f5, and attack the king. The queen sortie does not slow your plan.", sayShort: 'Qc7 — castle and f4, hold e5.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::Qb6@11': {
    intro: { say: "Qb6 — Black probes b2 and the queenside. Castle and let the queen wander: b2 is easily covered, and White turns to the kingside with Nbd2, f4 and f5 where the e5-pawn grants lasting space. Answer a flank sortie with central and kingside play, not with passive defence.", sayShort: 'Qb6 — castle, then f4-f5 kingside.' }, sources: ASIC,
  },
  'pro-gothamchess-anti-sicilian::2::g6@11': {
    intro: { say: "g6 — Black readies the fianchetto to bite on the e5-chain. Castle first, then Nbd2, Re1 and f4-f5, using your kingside space; the fianchetto takes time, and White strikes on the kingside before the bishop makes itself felt. Complete development and open lines toward the king.", sayShort: 'g6 — castle first, then kingside f4-f5.' }, sources: ASIC,
  },

  // ===== Trompowsky Attack (student WHITE) =====
  'pro-gothamchess-trompowsky::0::g5@7': {
    intro: { say: "g5 — Black gains space but loosens the kingside. Retreat Bg3 unharmed, then develop e3, Bd3 and Ne2; the holes on f5 and h5 and the airy king become long-term targets. White develops soundly and plays against the weakened squares, with h4 later to pry open lines.", sayShort: 'g5 — Bg3, then play weak squares.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::0::c5@11': {
    intro: { say: "c5 — Black strikes at the d4-centre. Support it with c3, keeping a solid pawn chain and the bishop pair; develop Ngf3 and O-O, and answer ...cxd4 with exd4 when your harmonious pieces and central space give a pleasant Trompowsky game. Hold the centre and finish developing.", sayShort: 'c5 — c3 holds d4, develop.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::1::d6@7': {
    intro: { say: "d6 — Black bolsters e5 in the Raptor. Meet the coming knight trade with hxg5, prying open the h-file toward the king, and after ...e5 hit it with dxe6; the open lines, the h-file rook and White's space give a sharp initiative. Play fast and directly at the king.", sayShort: 'd6 — hxg5, open the h-file.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::1::Nxg5@7': {
    intro: { say: "Nxg5 — Black trades the knight; recapture hxg5, prying open the h-file toward Black's king. Then build the big centre with c3 and e4 behind the d5-wedge; the space bind and the open h-file hand White a dangerous, space-gaining attack. Keep the initiative rolling on the kingside.", sayShort: 'Nxg5 — hxg5, then e4 centre.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::1::g6@11': {
    intro: { say: "g6 — Black fianchettoes after the knight trade. Tuck the rook to b1 covering b2, then complete with e4 and the big d5-space; the half-open h-file from hxg5 and your central wedge give White the more dangerous position. Finish development and press on the kingside.", sayShort: 'g6 — Rb1, then e4 and attack.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::1::d6@11': {
    intro: { say: "d6 — Black shores up the centre in the Raptor. Grab the full centre with e4 behind the d5-wedge; the h-file is already half-open from hxg5, so White combines a space bind with attacking chances on the h-file. Space and open lines favour the aggressor — keep pushing at the king.", sayShort: 'd6 — e4 centre, press the h-file.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::Nbd7@5': {
    intro: { say: "Nbd7 — Black develops quietly. Continue Nd2, then c3, Bd3 and Ngf3, building a compact setup with the bishop pair; the position is calm and pleasant, White nudging forward with e4 later to claim the centre. Develop harmoniously and expand when Black is committed.", sayShort: 'Nbd7 — Nd2, c3, Bd3, develop calmly.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::Qb6@7': {
    intro: { say: "Qb6 — Black offers a queen trade while probing b2. Answer Qb3, and after the queens come off take on f6, saddling Black with doubled f-pawns; White then plays b3 to open the queenside against the ...c4-pawn. The structural pluses hand White a pleasant endgame edge.", sayShort: 'Qb6 — Qb3, then Bxf6 doubles pawns.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::e6@7': {
    intro: { say: "e6 — Black sets up a solid, French-like wall. Retreat Bh4 when nudged, then develop Bd3, Ngf3 and O-O, keeping the bishop pair; support d4 with c3 and prepare e4 or a queenside advance. A comfortable, low-risk White game where the two bishops slowly tell.", sayShort: 'e6 — Bd3 and Ngf3, keep bishops.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::Bf5@9': {
    intro: { say: "Bf5 — Black develops the light bishop actively outside the chain. Play Ngf3 and Bd3, offering to trade off the good piece, or Qb3 hitting b7 and d5; White keeps the bishop-pair chance and a solid centre with c3. Steady development holds the pull — challenge the bishop and press.", sayShort: 'Bf5 — Ngf3 and Bd3, or Qb3.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::e5@9': {
    intro: { say: "e5 — Black strikes in the centre. Take with dxe5 and after ...Nxe5 the position opens; or play Bxf6 first, damaging the structure, then dxe5. White uses the bishop pair and quicker development in the resulting open play. Meet the break with a trade and active pieces.", sayShort: 'e5 — dxe5, then open, active pieces.' }, sources: TROMP,
  },
  'pro-gothamchess-trompowsky::2::e6@9': {
    intro: { say: "e6 — Black chooses a solid, restrained setup. Develop Bd3, Ngf3 and O-O, holding the centre with c3 and the bishop pair intact; prepare e4 or f4 to expand once Black is committed. White enjoys a comfortable, flexible position with the two bishops as the long-term asset.", sayShort: 'e6 — Bd3, Ngf3, castle, expand later.' }, sources: TROMP,
  },

  // ===== King's Indian Attack (student WHITE) =====
  'pro-gothamchess-kia::0::b6@13': {
    intro: { say: "b6 — Black develops toward the long diagonal. Push e5, gaining kingside space and clamping Black in; then the classic KIA plan runs itself — Nf1-h2, Bf4 or Qe2, and the h4-g4-f4 pawn storm at Black's king. White attacks on the kingside where the pawn chain points. Trust the race.", sayShort: 'b6 — push e5, storm the kingside.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::Qc7@13': {
    intro: { say: "Qc7 — Black connects on the queenside and eyes e5. Play e5 anyway, seizing kingside space; the standard KIA attack follows with Nf1-h2, Re1 and the g4-f4 storm. Black expands on the queenside, but the KIA race favours the side aiming at the king. Push e5 and start the storm.", sayShort: 'Qc7 — e5, then kingside pawn storm.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::g6@5': {
    intro: { say: "g6 — Black mirrors with a fianchetto. Castle and build the KIA: d3, Nbd2 and then e4, gaining the centre; against the double fianchetto White can also strike with c3 and d4. Complete development calmly and pick whichever central break Black allows. Flexible and comfortable.", sayShort: 'g6 — castle, d3, Nbd2, then e4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::g6@11': {
    intro: { say: "g6 — Black fianchettoes the bishop late. Continue e4 and, when ready, e5 clamping the kingside; then Nf1-h2 and the g4-f4 push storm the king. The KIA setup is complete, so play for the thematic kingside attack while Black is split between plans. Take space and roll the pawns.", sayShort: 'g6 — e4 and e5, then attack.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::g6@7': {
    intro: { say: "g6 — Black heads for a double fianchetto. Play d3 and Nbd2, then e4 claiming the centre; the standard KIA build gives White a smooth kingside attack later, or a c3-d4 central break if Black delays. Develop, complete the setup, and choose your moment to strike.", sayShort: 'g6 — d3 and Nbd2, then e4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::g6@9': {
    intro: { say: "g6 — Black combines ...e6 with a fianchetto. Push e4 and prepare e5, taking kingside space; the KIA attack follows with Nbd2-f1-h2 and the g4-f4 storm. White presses on the kingside while Black is stretched between two plans. Seize the centre, then aim at the king.", sayShort: 'g6 — e4, prepare e5 and storm.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::e5@5': {
    intro: { say: "e5 — Black grabs the full centre. The fianchetto is set, so play d3 and O-O, then c3 preparing d4, or Nd2-c4 pressing e5; White treats it as a reversed Sicilian with a comfortable extra tempo. Undermine the centre and develop harmoniously — the extra move steers it your way.", sayShort: 'e5 — d3, castle, then c3-d4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::d6@9': {
    intro: { say: "d6 — Black sets a solid Sicilian-style wall. Expand with e4 and Nc3, then push on the queenside with Rb1, a3 and b4; the extra tempo from White's setup steers this reversed structure in his favour. Play on the wing where your pawns point and squeeze the space.", sayShort: 'd6 — e4 and Nc3, then b4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::e5@9': {
    intro: { say: "e5 — Black claims the centre behind the fianchetto. Play e4 to fix the structure, then Nc3, Nd2-c4 and f4 pressing e5; White has a comfortable reversed King's Indian with the initiative. Chip at the centre, expand, and use the extra tempo to press first.", sayShort: 'e5 — e4, then Nc3 and f4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::d5@5': {
    intro: { say: "d5 — Black builds a broad centre. Challenge it directly with d4, entering an open Catalan-like game; the g2-bishop rakes the long diagonal, and after ...e6 castle and pressure d5 with c4 later. White plays for the central tension and the strong fianchetto. Contest the centre head on.", sayShort: 'd5 — challenge with d4, strong fianchetto.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::e6@9': {
    intro: { say: "e6 — Black holds a flexible, solid setup. Complete with e4 and Nc3 or Nbd2, then expand on the queenside with Rb1 and b4, or centrally with c3-d4; the extra tempo gives White the freer reversed structure. Develop, then break where Black is least ready.", sayShort: 'e6 — e4, Nc3, then queenside b4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::d5@9': {
    intro: { say: "d5 — Black stakes out the centre late. Answer c3 and Nbd2, preparing e4 to challenge d5, or play against the centre with the g2-bishop and Rb1-b4 on the queenside; White keeps the flexible, comfortable KIA edge. Break where Black is least prepared to meet it.", sayShort: 'd5 — c3 and Nbd2, prepare e4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::Nf6@5': {
    intro: { say: "Nf6 — Black develops classically. Castle, then play d3 and e4 for the KIA centre, or c3 and d4 for an open game; White has a free hand to choose the structure. Finish development and pick whichever plan the position invites. Flexibility and the extra tempo favour White.", sayShort: 'Nf6 — castle, d3, then e4.' }, sources: KIA,
  },

  // ===== Caro-Kann Advance, Tal Variation (student WHITE) =====
  'pro-gothamchess-caro-advance-white::0::Qxd4@11': {
    intro: { say: "Qxd4 — Black snatches the centre pawn, but the queen strays into danger. Develop with tempo: Nf3 hitting it, then Nc3, Be2 and O-O-O, opening lines while the queen scrambles for safety; White's roaring lead in development is worth far more than one pawn. Attack the exposed queen and king.", sayShort: 'Qxd4 — Nf3 with tempo, then attack.' }, sources: CADV,
  },
  'pro-gothamchess-caro-advance-white::0::Qa6@13': {
    intro: { say: "Qa6 — Black offers to trade queens after the bishop swap. Decline with Qe2 or Qg3, keeping pieces on to exploit your space; develop Nd2, Ne2 and c3, then use the h-file and the e5-wedge to press the kingside. The queenside queen sortie only costs Black time.", sayShort: 'Qa6 — Qe2, keep queens, press kingside.' }, sources: CADV,
  },
  'pro-gothamchess-caro-advance-white::0::Qa6@15': {
    intro: { say: "Qa6 — Black again offers the queen trade. Sidestep with Qe2 and play on: the e5-pawn and the h4-h5 clamp are your assets, so keep the queens and develop Ngf3, c3 and O-O; the kingside space decides the game. Do not rush the trade that would ease Black's cramp.", sayShort: 'Qa6 — avoid trade, develop, use space.' }, sources: CADV,
  },
  'pro-gothamchess-caro-advance-white::0::Nd7@15': {
    intro: { say: "Nd7 — Black develops toward the ...c5 break. Continue Ngf3 and O-O, hold the centre with c3, and keep your grip: the e5-pawn and the h4-h5 wedge cramp Black, so answer ...c5 with c3 and press on the kingside. Space and the safer structure favour White. Develop and clamp.", sayShort: 'Nd7 — Ngf3, castle, c3, hold space.' }, sources: CADV,
  },
  'pro-gothamchess-caro-advance-white::0::c5@15': {
    intro: { say: "c5 — Black hits the base of the chain. Support d4 with c3, develop Ngf3 and O-O, and keep the tension; if the centre opens, your lead in space and the h-file tell. White meets the break with calm development and a lasting kingside clamp. Hold the centre and press where you are stronger.", sayShort: 'c5 — c3 holds d4, keep clamp.' }, sources: CADV,
  },

  // ===== Caro-Kann Defence (student BLACK) =====
  'pro-gothamchess-caro-kann::0::Nf3@10': {
    intro: { say: "Nf3 — White develops toward the main Classical Caro. Complete the sound setup: …Nf6, …e6 and …Bd6, then …Nbd7, …Qc7 and long castling; your structure is rock-solid and the light bishop is already developed outside the pawn chain. Black gets a reliable, harmonious game with no weaknesses.", sayShort: 'Nf3 — …Nf6, …e6, …Bd6, then castle.' }, sources: CK,
  },
  'pro-gothamchess-caro-kann::5::Be3@8': {
    intro: { say: "Be3 — White clings to the extra c5-pawn. Regain it by pressure: …Nd7 hitting e5, and after the recaptures …Nc6 and …Bxc5 finish development with active pieces; Black stands comfortably once the centre liquidates. Chase the pawn back and equalise cleanly with the freer game.", sayShort: 'Be3 — …Nd7 and …Nxe5, regain pawn.' }, sources: CK,
  },
  'pro-gothamchess-caro-kann::5::b4@10': {
    intro: { say: "b4 — White grabs queenside space to hold the gambit pawn. Retreat …Be7, and meet Qg4 with …g6, blunting the threat; then develop …Nd7, …Ne7 and …Nf5 or …Qc7, pressing the e5-pawn and the loose a3-b4 pawns. Black regains material with the sounder structure and active pieces.", sayShort: 'b4 — …Be7 and …g6, press e5.' }, sources: CK,
  },
  'pro-gothamchess-caro-kann::7::Nf3@6': {
    intro: { say: "Nf3 — White develops before striking with c4. Answer …Nc6 and …e6, and when c4 comes take …dxc4, then …Nf6, …Be7 and …O-O; Black returns the pawn if needed for smooth development and easy play against the isolated or hanging pawns. Comfortable, sound, and active.", sayShort: 'Nf3 — …Nc6, …e6, …dxc4, develop.' }, sources: CK,
  },
  'pro-gothamchess-caro-kann::7::Qb3@10': {
    intro: { say: "Qb3 — White piles on d5 in the Panov. Continue …Bg7 and …O-O, unfazed; after cxd5 the fianchettoed bishop and quick castling give full activity, and …Nbd7-b6 blockades the passed d-pawn. Black meets the isolated-pawn pressure with piece play and the long diagonal. Castle and blockade.", sayShort: 'Qb3 — …Bg7 and …O-O, then blockade.' }, sources: CK,
  },
  'pro-gothamchess-caro-kann::8::c3@12': {
    intro: { say: "c3 — White braces the d4-point. Keep the tension or strike …exd4, then develop …Bd6, …Ne7 and …O-O; the …Bg4 pin on the f3-knight and pressure on e4 give Black an easy, active game. Complete development and target the broad but loose White centre. Play against the overextension.", sayShort: 'c3 — …exd4 or …Bd6, then castle.' }, sources: CK,
  },

  // ===== Scandinavian Defence (student BLACK) =====
  'pro-gothamchess-scandinavian::0::Bc4@6': {
    intro: { say: "Bc4 — White develops the bishop actively toward f7. Reply …Bg4, training the bishop on the d1-square and ready to pin a knight on f3, then …e6, …c6 and …Nbd7 for the solid Scandinavian wall; …Bb4 can add pressure on c3. Black develops smoothly and castles into a sound, easy game.", sayShort: 'Bc4 — …Bg4, …e6, …c6, then develop.' }, sources: SCAND,
  },
  'pro-gothamchess-scandinavian::0::Bd2@8': {
    intro: { say: "Bd2 — White prepares to gain time on the a5-queen with b4 or Nb5. Develop …Bg4 with pressure toward d1, then …Nc6, …e6 and …O-O-O, keeping the queen active; answer any tempo by dropping the queen back and pressing on. Black gets rapid development and a solid pawn structure.", sayShort: 'Bd2 — …Bg4 and …Nc6, then castle.' }, sources: SCAND,
  },
  'pro-gothamchess-scandinavian::0::d4@4': {
    intro: { say: "d4 — White grabs the centre before developing. Strike back with …e5, and after the central trades and the queen swap you reach a level, easy endgame; develop …Nf6, …Bc5 hitting the d4-knight and …Nc6, …O-O. Black equalises with fast, natural development and no weaknesses.", sayShort: 'd4 — …e5 counter, trade to equality.' }, sources: SCAND,
  },
  'pro-gothamchess-scandinavian::0::Bd2@10': {
    intro: { say: "Bd2 — White readies b4 or Nd5 against the a5-queen. Complete the classical setup: …c6, …e6 and …Nbd7, then …Bd6 or …Bb4 and long castling; the light bishop is already active outside the chain, so Black is harmonious and solid. Meet a queenside nudge by retreating the queen and developing on.", sayShort: 'Bd2 — …c6, …e6, …Nbd7, then castle.' }, sources: SCAND,
  },
  'pro-gothamchess-scandinavian::0::Bd3@10': {
    intro: { say: "Bd3 — White offers to trade your active light bishop. You may keep it with …Bg6, or trade …Bxd3 and follow …c6, …e6, …Nbd7 and …Bd6 with a rock-solid structure; either way Black is comfortable. Do not fear the swap — the resulting Caro-like wall is easy and safe to play.", sayShort: 'Bd3 — …Bg6 or …Bxd3, stay solid.' }, sources: SCAND,
  },
  'pro-gothamchess-scandinavian::1::c4@4': {
    intro: { say: "c4 — White tries to cling to the extra pawn in the Icelandic Gambit. Blast open with …e6, and after dxe6 …Bxe6, sacrificing the pawn for a roaring lead in development; …Nc6, …Bc5 or …Bb4 and …O-O-O follow while White struggles to catch up. Black gets dynamic, dangerous compensation.", sayShort: 'c4 — …e6 gambit, huge development lead.' }, sources: SCAND,
  },

  // ===== French Defence, Tarrasch (student BLACK) =====
  'pro-gothamchess-french-defense::1::g3@10': {
    intro: { say: "g3 — White fianchettoes to blunt the open g-file. Build the big centre: …Nc6 and …e5, then …Bd6, …Be6 and …Qe7 with long castling; your doubled f-pawns are a small price for a mobile centre and the open g-file aimed at the king. Black plays for a direct kingside attack.", sayShort: 'g3 — …Nc6 and …e5, big centre.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::1::Bb5@12': {
    intro: { say: "Bb5 — White pins the c6-knight and probes your structure. Answer …Qd5, centralising with a hit on the b5-bishop so White must respond; then …Bd7, …e5 and …O-O-O, using your mobile centre and the open g-file toward the king. The pin dissolves and Black takes the initiative.", sayShort: 'Bb5 — …Qd5 centralises, hits bishop.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::1::dxe5@14': {
    intro: { say: "dxe5 — White opens the centre. Recapture …fxe5, straightening your pawns and keeping a big centre with open g- and f-files; then …Bd6, …Be6 and …Qe7 with long castling and a direct kingside attack. The trade only unleashes Black's pieces onto the open lines toward the king.", sayShort: 'dxe5 — …fxe5, open files, attack king.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::1::Be3@14': {
    intro: { say: "Be3 — White develops rather than releasing the centre. Keep your big pawn centre: …Bd6, …Be6 and …Qe7, then …O-O-O and roll the kingside using the open g-file; if White allows it, …e4 gains space and kicks the f3-knight. Black is comfortably better placed for the attack.", sayShort: 'Be3 — …Bd6 and …Qe7, then castle.' }, sources: FR,
  },

  // ===== Pirc Defence, Austrian Attack (student BLACK) =====
  'pro-gothamchess-pirc-defense::0::e5@10': {
    intro: { say: "e5 — White lunges, hitting the f6-knight and grabbing space. Retreat …Nfd7 and strike back with …cxd4 and …dxe5, opening the position against White's overextension; then …Nc6 and …O-O with active piece play. The proud Austrian centre becomes a cluster of targets for Black.", sayShort: 'e5 — …Nfd7, …cxd4, hit centre.' }, sources: PIRC,
  },
  'pro-gothamchess-pirc-defense::0::d5@12': {
    intro: { say: "d5 — White gains space and hits your pinned c6-knight. Break the pin with …a6, forcing the bishop to decide; after the trade on c6 you recapture and gain the bishop pair, then …cxd4 and …Qa5 hit the loose centre. Black untangles and the overextended pawns become targets.", sayShort: 'd5 — …a6 breaks pin, then …cxd4.' }, sources: PIRC,
  },
};
