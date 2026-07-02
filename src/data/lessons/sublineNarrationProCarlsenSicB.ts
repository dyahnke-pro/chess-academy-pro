import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Carlsen-style Sicilian repertoire (student BLACK):
// Rossolimo (…g6) + Old Sicilian, Kan/Taimanov (…e6) with French/KIA/Westerinen
// sidelines, Sveshnikov/Lasker-Pelikan, Alapin (…d5), and anti-Smith-Morra /
// central-Qxd4 lines. House voice, board-safe, line-grounded. Every entry
// answers the opponent's frequent deviation with the student-side plan.

const SIC_INIT = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SIC_CTR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SIC_DEV = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SIC_KING = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];

export const SUBLINE_NARRATION_PRO_CARLSEN_SIC_B: Record<string, SublineNarration> = {
  // ===== Variation 0 — Rossolimo (…g6) + Old Sicilian =====
  'pro-carlsen-sicilian::0::Nc3@4': {
    intro: { say: "Nc3 — White develops before committing the centre. Answer …e5 at once, staking a broad pawn front and denying the knight the d5-outpost for now; then …Be7, …Nf6 and …O-O finish smoothly, and the …d5 or …f5 break gives a healthy, active game. Black seizes space and dictates the structure.", sayShort: 'Nc3 — …e5 grabs center, then …Be7.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::0::Bxc6@6': {
    intro: { say: "Bxc6 — White trades to saddle you with doubled c-pawns. Recapture …dxc6, keeping a pawn on the central files and gaining the bishop pair; then …Bg7, …Nf6 and …O-O, with the …e5 clamp fixing the dark squares. The two bishops and the solid centre outweigh the doubled pawns in the long run.", sayShort: 'Bxc6 — …dxc6, bishop pair, aim …e5.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::0::c3@8': {
    intro: { say: "c3 — White prepares d4 to build a big centre. Meet it head-on: …Nf6 pressuring e4, …O-O to finish developing, then contest the middle with …d5 or …e5 before the centre rolls. The fianchettoed bishop rakes the long diagonal, so opening lines favours Black's active setup.", sayShort: 'c3 — …Nf6 and …O-O, break …d5.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::0::Bxc6@8': {
    intro: { say: "Bxc6 — White concedes the bishop pair to double your c-pawns. Recapture …dxc6, keeping the centre pawn and the two bishops; continue …Nf6, …O-O and …e5, clamping the dark squares. The doubled pawns are cosmetic — the bishop pair and the …e5 grip give Black the healthier long game.", sayShort: 'Bxc6 — …dxc6, bishop pair, then …e5.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::0::c3@6': {
    intro: { say: "c3 — White supports a coming d4 before castling. Strike with …Nf6, hitting e4 and forcing White to declare — defend with d3, push e5, or block with Qe2, each conceding time or structure. Follow with …Bg7, …O-O and …d5, and Black develops smoothly while White wrestles with the centre.", sayShort: 'c3 — …Nf6 hits e4, provoke White.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::0::Nc3@8': {
    intro: { say: "Nc3 — White develops the knight rather than pushing c3. Continue …Nf6 and …O-O, completing the fianchetto setup, then choose …d6 with …e5, or …e5 and …Nge7, to stake a share of the centre. With the bishop on the long diagonal and a safe king, Black has an easy, flexible Sicilian.", sayShort: 'Nc3 — …Nf6 and …O-O, then …d6.' }, sources: SIC_KING,
  },
  'pro-carlsen-sicilian::0::c3@10': {
    intro: { say: "c3 — with your …e5 already in, White props up a d4 break. Reroute …Nge7, sidestepping any Bg5 pin and guarding the key squares, then …O-O and …d6 to anchor the pawn on e5. Hold the central clamp and answer d4 with …exd4 or …d6; the fixed centre keeps Black comfortable.", sayShort: 'c3 — …Nge7 and …O-O, hold …e5.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::0::b4@10': {
    intro: { say: "b4 — the Gurgenidze wing gambit, deflecting your c-pawn to grab the centre. Take it: …cxb4 wins the pawn cleanly, then develop quickly with …Nge7, …O-O and …d6, returning the pawn only for real activity if pressed. White must prove the compensation; until then Black is simply a healthy pawn up.", sayShort: 'b4 — …cxb4 grabs pawn, develop fast.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::0::a4@12': {
    intro: { say: "a4 — White gains queenside space and stops …b5 after the trade on c6. You already hold the bishop pair from …dxc6, so play …Nge7, …O-O and …Be6 or …f6, preparing the …f5 break. The two bishops in a semi-open position are your long-term trump; expand where White is loosest.", sayShort: 'a4 — …Nge7 and …O-O, use bishops.' }, sources: SIC_DEV,
  },

  // ===== Variation 1 — Kan / French-move-order sidelines (…e6) =====
  'pro-carlsen-sicilian::1::Bd3@8': {
    intro: { say: "Bd3 — White eyes the b1-h7 diagonal in the Kan. Hit back with …Bc5, gaining a tempo on the d4-knight and provoking Nb3, then retreat …Be7 to a safe square; if Qg4 comes, …g6 blunts it comfortably. Black finishes with …Nf6, …O-O and …b5, the flexible Kan counterplay on the queenside.", sayShort: 'Bd3 — …Bc5 gains tempo, then …Be7.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::1::c3@4': {
    intro: { say: "c3 — White switches to a Delayed Alapin, planning d4 with a broad centre. Strike immediately with …d5, and after exd5 Qxd5 your queen sits actively while d4 becomes an isolated target; develop …Nf6 and …Nc6 and complete quickly. Black gets free, natural piece play against the lone d-pawn.", sayShort: 'c3 — …d5 strikes center immediately.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::1::Nc3@4': {
    intro: { say: "Nc3 — White develops before pushing d4. Keep it flexible with …a6, controlling b5 and preparing …Qc7 and …b5; after d4 cxd4 Nxd4 you reach a comfortable Kan structure. Follow with …Nf6 and …Be7, and Black expands on the queenside with an easy, well-mapped game.", sayShort: 'Nc3 — …a6 and …Qc7, flexible Kan.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::1::d3@4': {
    intro: { say: "d3 — White steers into a King's Indian Attack rather than opening the centre. Mirror the setup with …Nc6, …g6 and …Bg7, then …Nge7 and …O-O; the key is to contest the centre with a timely …d5. With even space and no weaknesses, Black plays for the more active break.", sayShort: 'd3 — …Nc6 and …g6, contest …d5.' }, sources: SIC_KING,
  },
  'pro-carlsen-sicilian::1::b3@4': {
    intro: { say: "b3 — the Westerinen, fianchettoing to pressure the long diagonal. Answer …b6 and …Bb7 in kind, contesting e4 and the a8-h1 line, then …Nc6, …Nf6 and …Be7. The double fianchetto neutralises White's idea; Black completes development and looks to strike with …d5 once the pieces are ready.", sayShort: 'b3 — …b6 and …Bb7, contest diagonal.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::1::c4@8': {
    intro: { say: "c4 — the Maróczy Bind, clamping d5 to deny you the freeing break. Set up the hedgehog: …Nf6, …b6 and …Bb7, then …Be7, …d6 and …Nbd7, coiling behind the third rank. The bind looks imposing, but the …b5 and …d5 springs give Black dangerous, elastic counterplay.", sayShort: 'c4 — …Nf6 and …b6, hedgehog setup.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::1::g3@4': {
    intro: { say: "g3 — White prepares a kingside fianchetto to press d5. Develop naturally with …Nc6 and …Nf6, then challenge the centre with …d5 before the bishop settles on g2; if the file opens, your pieces flow to active squares. Black fights for the centre and reaches a balanced, healthy middlegame.", sayShort: 'g3 — …Nc6 and …Nf6, break …d5.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::1::Be2@10': {
    intro: { say: "Be2 — a modest developing move in the Kan. Continue …Nf6 and …Be7, then …b5 with …Bb7, building the classic queenside expansion; …d6 and …Nbd7 complete a resilient setup. White's quiet bishop gives you time to organise, and the …b5-b4 and …d5 breaks hand Black the initiative.", sayShort: 'Be2 — …Nf6, …Be7 and …b5.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::1::g3@10': {
    intro: { say: "g3 — White fianchettos to fight for the light squares. Pin with …Bb4, pressuring c3 and disrupting White's coordination, then …Nf6 and …Nc6 or …d5 to strike the centre. The early bishop sortie gains time before g2 is complete; Black develops with tempo and comfortable play.", sayShort: 'g3 — …Bb4 pins, then …Nf6.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::1::f4@12': {
    intro: { say: "f4 — White grabs kingside space and eyes e5. Restrain it with …d6, taking the sting out of the advance, then …Be7, …O-O and …b5 with …Bb7 for queenside counterplay. The f4-push loosens White's king, so complete development and the …b5-b4 break gives Black the faster attack.", sayShort: 'f4 — …d6 restrains e5, then …b5.' }, sources: SIC_INIT,
  },

  // ===== Variation 2 — Rossolimo entry + Sveshnikov / Lasker-Pelikan =====
  'pro-carlsen-sicilian::2::Bb5@4': {
    intro: { say: "Bb5 — the Rossolimo, avoiding the Open Sicilian to pressure your knight. Reply …g6 and …Bg7, the sound fianchetto system: if White takes on c6 you get the bishop pair, and the long-diagonal bishop plus a later …e5 clamp give a rich, weakness-free game. A reliable, ambitious answer.", sayShort: 'Bb5 — …g6 and …Bg7, fianchetto plan.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::2::Nc3@4': {
    intro: { say: "Nc3 — White holds back d4 and develops the knight. Take the centre with …e5, denying d5 and claiming space, then …Be7, …Nf6 and …O-O; the …d5 or …f5 break frees your game. Black dictates the pawn structure and enjoys comfortable, active development.", sayShort: 'Nc3 — …e5 clamps center, then …Be7.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::2::Bxf6@16': {
    intro: { say: "Bxf6 — White resolves the pin at the cost of the bishop pair in the Sveshnikov. Recapture …gxf6, opening the g-file and handing you two bishops and a broad e5-f6 pawn mass; the shattered structure is a feature, not a flaw. Follow with …Bg7 and …f5, and a knight reroute toward the d5-blockade swings the fight Black's way.", sayShort: 'Bxf6 — …gxf6, bishop pair, fight d5.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::2::Nd5@12': {
    intro: { say: "Nd5 — White plants the knight on the hole instead of pinning. Challenge it with …Nxd5; after exd5 the c6-knight is nudged back, so reroute …Ne7 heading for g6, blockading the d5-pawn. The dark squares and the …f5 break become your playground while White nurses a fixed, blockadable pawn.", sayShort: 'Nd5 — …Nxd5, reroute knight, blockade d5.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::2::Nxe7@18': {
    intro: { say: "Nxe7 — White trades the knight for your dark-squared bishop after …Be7 challenged the d5-outpost. Recapture …Nxe7, rerouting toward g6 and eyeing the …f5 break; your big centre and the half-open lines give dynamic play. Follow with …Bb7 or …Be6 and …O-O, and Black's activity fully answers the traded bishop.", sayShort: 'Nxe7 — …Nxe7, aim …Ng6 and …f5.' }, sources: SIC_INIT,
  },

  // ===== Variation 3 — Alapin, Barmen Defense (…d5, …Bg4) =====
  'pro-carlsen-sicilian::3::h3@12': {
    intro: { say: "h3 — White questions your g4-bishop. Keep the pin with …Bh5, holding the pressure on f3 and d4; then …Nc6, …cxd4 and …Be7 pile onto the isolated d-pawn. If White ever plays g4, the bishop drops to g6 and the loosened kingside becomes a target. Black presses the lone d-pawn with easy development.", sayShort: 'h3 — …Bh5 keeps pin, hit d4.' }, sources: SIC_CTR,
  },
  'pro-carlsen-sicilian::3::Nf3@6': {
    intro: { say: "Nf3 — White develops before pushing d4. Continue …Nf6 and later …Nc6 and …e6, developing naturally; when d4 arrives, …cxd4 leaves White an isolated queen's pawn to blockade on d5. Solid piece placement and the standard anti-isolani plan give Black a comfortable, risk-free game.", sayShort: 'Nf3 — …Nf6 and …Nc6, blockade d5.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::3::dxc5@10': {
    intro: { say: "dxc5 — White releases the central tension. Regain the pawn with …Qxc5, developing the queen with tempo to an active post; then …Nc6, …e6 and …Be7 finish the job. With the centre dissolved and your pieces flowing out first, Black reaches easy equality and can press the more harmonious side.", sayShort: 'dxc5 — …Qxc5 regains, develop with tempo.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::3::Nbd2@10': {
    intro: { say: "Nbd2 — White reinforces before capturing, keeping options open. Develop with …Nc6 and …e6, maintaining the …Bg4 pin on f3, then …cxd4 to isolate White's d-pawn and …Be7 with …O-O. The pin and the pressure on d4 give Black comfortable, active piece play.", sayShort: 'Nbd2 — …Nc6 and …e6, keep pin.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::3::Qa4+@10': {
    intro: { say: "Qa4+ — a check to disrupt your coordination. Block with …Bd7, retreating the bishop to a useful square and inviting a queen trade or Qb3; then …cxd4 opens the centre and …Nc6 develops with tempo. The check costs White time, and Black emerges with easy, harmonious development.", sayShort: 'Qa4+ — …Bd7 blocks, then …cxd4.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::3::Na3@12': {
    intro: { say: "Na3 — White reroutes the knight toward c4 or b5. Ignore the tour and finish developing: …Nc6, …Be7 and …O-O, keeping the …Bg4 pin and the pressure on d4. When the moment is right, …cxd4 leaves an isolated pawn to blockade. Black's smooth development outpaces White's knight manoeuvre.", sayShort: 'Na3 — …Nc6 and …Be7, castle.' }, sources: SIC_DEV,
  },
  'pro-carlsen-sicilian::3::Be3@12': {
    intro: { say: "Be3 — White props up d4 with the bishop. Continue …Nc6 and …cxd4, and after the recapture challenge the centre with …Bc5 or …Bb4+ and …O-O, keeping every piece active. The pin on f3 lingers, so White never fully coordinates; Black plays against the isolated d-pawn with comfortable pressure.", sayShort: 'Be3 — …Nc6 and …cxd4, stay active.' }, sources: SIC_CTR,
  },

  // ===== Variation 4 — 2.d4 Open / anti-Smith-Morra =====
  'pro-carlsen-sicilian::4::Nf3@4': {
    intro: { say: "Nf3 — White regains the pawn and heads for an Open Sicilian. Reply …d6, and after Nxd4 …Nf6 and …a6 you slide straight into a Najdorf; meet Be3 with …e5, hitting the knight, then …Be6 and …Nbd7. Black gets the rich, well-charted Najdorf where the queenside majority and dark-square play cut deep.", sayShort: 'Nf3 — …d6, transpose to Najdorf setup.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::4::Qxd4@4': {
    intro: { say: "Qxd4 — White recaptures with the queen, but the centralised lady invites tempo. Hit her with …Nc6, gaining time, then …g6 and …Bg7 to fianchetto with pressure on the long diagonal; …Nf6 and …O-O complete a quick, harmonious development. Black chases the queen and finishes developing while White loses time.", sayShort: 'Qxd4 — …Nc6 hits queen, then …g6.' }, sources: SIC_INIT,
  },
  'pro-carlsen-sicilian::4::Bc4@8': {
    intro: { say: "Bc4 — White eyes f7 for gambit pressure in the Smith-Morra. Blunt it with …e6, shutting the a2-g8 diagonal, then …a6 and …b5 to kick the bishop and claim queenside space; …Qc7 on the half-open c-file and …Be7 with …Nf6 consolidate. With the extra pawn and a solid centre, Black weathers the gambit and keeps the material.", sayShort: 'Bc4 — …e6 blunts bishop, then …a6.' }, sources: SIC_KING,
  },
  'pro-carlsen-sicilian::4::Be2@10': {
    intro: { say: "Be2 — a quieter gambit try, banking on development for the pawn. Restrain the centre with …d6, taking e5 away, then …Nf6, …Be7 and …O-O for a rock-solid setup; …a6 and …Qc7 guard the queenside. Neutralise White's lead calmly and the extra pawn tells in the long game.", sayShort: 'Be2 — …d6 restrains e5, develop solidly.' }, sources: SIC_KING,
  },
};
