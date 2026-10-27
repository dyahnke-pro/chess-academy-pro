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

export const SUBLINE_NARRATION_PRO_GOTHAM_X2: Record<string, SublineNarration> = {
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
  'pro-gothamchess-kia::0::g6@5': {
    intro: { say: "g6 — Black mirrors with a fianchetto. Castle and build the KIA: d3, Nbd2 and then e4, gaining the centre; against the double fianchetto White can also strike with c3 and d4. Complete development calmly and pick whichever central break Black allows. Flexible and comfortable.", sayShort: 'g6 — castle, d3, Nbd2, then e4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::e5@5': {
    intro: { say: "e5 — Black grabs the full centre. The fianchetto is set, so play d3 and O-O, then c3 preparing d4, or Nd2-c4 pressing e5; White treats it as a reversed Sicilian with a comfortable extra tempo. Undermine the centre and develop harmoniously — the extra move steers it your way.", sayShort: 'e5 — d3, castle, then c3-d4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::d5@5': {
    intro: { say: "d5 — Black builds a broad centre. Challenge it directly with d4, entering an open Catalan-like game; the g2-bishop rakes the long diagonal, and after ...e6 castle and pressure d5 with c4 later. White plays for the central tension and the strong fianchetto. Contest the centre head on.", sayShort: 'd5 — challenge with d4, strong fianchetto.' }, sources: KIA,
  },

  // ===== Caro-Kann Advance, Tal Variation (student WHITE) =====
  'pro-gothamchess-caro-advance-white::0::Qxd4@11': {
    intro: { say: "Qxd4 — Black snatches the centre pawn, but the queen strays into danger. Develop with tempo: Nf3 hitting it, then Nc3, Be2 and O-O-O, opening lines while the queen scrambles for safety; White's roaring lead in development is worth far more than one pawn. Attack the exposed queen and king.", sayShort: 'Qxd4 — Nf3 with tempo, then attack.' }, sources: CADV,
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
};
