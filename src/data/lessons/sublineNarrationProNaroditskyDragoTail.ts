import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration completing the Naroditsky set: the Dragodorf sublines
// (student BLACK — the Dragon queenside race: …Bg7, …O-O, …Nc6, …Rc8, …b5-b4,
// dark-square pressure; against O-O-O it is a pure opposite-wing storm) plus the
// remaining deep tail across KID/KIA/Rossolimo/Jobava/Alapin/Alekhine. House
// voice, line-grounded, board-safe forward-looking plans.

const DR = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'];
const K = ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];
const KIA = ['concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack'];
const ROS = ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
const JOB = ['concept:pos-development', 'https://www.chess.com/openings/London-System'];
const AL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'];
const ALK = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'];

export const SUBLINE_NARRATION_PRO_NAR_DRAGO_TAIL: Record<string, SublineNarration> = {
  // ===== Dragodorf (Black) =====
  // [0] English Attack (Be3 / Yugoslav)
  'pro-naroditsky-dragodorf::0::Bc4@14': {
    intro: { say: "Bc4 — the Yugoslav Attack bishop, aimed at f7. Complete your setup: …O-O, …Nc6, …Bd7, then expand with …b5 or …Rc8, racing on the queenside while White castles long and storms your king. Trade off the dangerous bishop with …Na5 when you can.", sayShort: 'Bc4 — castle, race with b5 and Na5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::Be2@12': {
    intro: { say: "Be2 — a calmer English Attack. Continue …O-O, …Nc6 and …Bd7, then the standard Dragon queenside play: …Rc8, …b5 and pressure down the c-file. The g7-bishop bites on the long diagonal throughout.", sayShort: 'Be2 — castle, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::Qd2@12': {
    intro: { say: "Qd2 — White prepares queenside castling in the Yugoslav. Strike first on the wing: with …b5 already in, follow with …Bb7, …Nbd7 and …b4 hitting the c3-knight. Race at White's king before the kingside storm arrives.", sayShort: 'Qd2 — race with b5, Bb7 and b4.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::g4@14': {
    intro: { say: "g4 — an early kingside pawn lunge. Counter in the centre and on the queenside: …O-O, …Nc6 and …b5, racing on the flank; White's g4 weakens his own king if he castles short. Meet the storm with speed.", sayShort: 'g4 — castle, then Nc6 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::g4@18': {
    intro: { say: "g4 — the Yugoslav pawn storm begins after both sides commit. Race at once: …Rb8 and …b5-b4, or the thematic exchange sacrifice …Rxc3 to smash White's king. It is the sharpest race in chess, and the Dragon's queenside speed is your weapon.", sayShort: 'g4 — race b5-b4, sac on c3.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::Kb1@18': {
    intro: { say: "Kb1 — White tucks the king before storming. Use the tempo to accelerate your own attack: …Rb8, …b5-b4 and …a5, hurling pawns at White's king. In the Yugoslav race, every tempo on the queenside counts.", sayShort: 'Kb1 — Rb8 and b5-b4, attack.' }, sources: DR,
  },
  // [1] Classical (Be2)
  'pro-naroditsky-dragodorf::1::Be3@12': {
    intro: { say: "Be3 — White develops in the Classical. Continue …O-O, …Nc6 and …Bd7, then the Dragon queenside plan: …Rc8, …Ne5 or …a6-b5, pressuring down the c-file with the g7-bishop raking the centre. A rich, balanced Dragon.", sayShort: 'Be3 — castle, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::g4@12': {
    intro: { say: "g4 — an early space-grab. Blunt it with …h6, then continue …Bg7, …O-O and the queenside expansion; White's g4 loosens his kingside, giving you a target if he castles short. Counter with …b5 and the c-file.", sayShort: 'g4 — …h6, then castle and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::Bg5@14': {
    intro: { say: "Bg5 — White pins toward the queen. Break it with …h6, and once the bishop retreats continue the Dragon plan: …Nc6, …Rc8 and …b5. The pin costs White time you spend on queenside play.", sayShort: 'Bg5 — …h6, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::Re1@14': {
    intro: { say: "Re1 — White supports the centre. Continue …Nc6, …Bd7 and …Rc8, the Dragon's c-file plan; expand with …a6-b5 and let the g7-bishop pressure the long diagonal. A comfortable Classical Dragon.", sayShort: 'Re1 — Nc6, Rc8, then b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::a4@14': {
    intro: { say: "a4 — White stops your …b5 break. Adapt: play …Nc6, …Rc8 and …Ne5 or …a5 to fix the queenside, then pressure the c-file and centre. When the queenside is closed, the Dragon shifts to piece play and the …d5 break.", sayShort: 'a4 — Nc6 and Rc8, press the c-file.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::a4@16': {
    intro: { say: "a4 — White clamps the queenside after developing. Continue …Nc6, …Bd7 and …Rc8, and prepare the central …d5 break or …Ne5; with …b5 restrained, the c-file and the centre become your avenues.", sayShort: 'a4 — Rc8, prepare the d5 break.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::Qd2@16': {
    intro: { say: "Qd2 — White connects and eyes castling long. Read his king: if he goes queenside, race with …Nc6, …Rc8 and …b5; if he stays central, pressure the c-file and play …Ne5. Attack where the king lives.", sayShort: 'Qd2 — Nc6 and Rc8, then b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::Bg5@12': {
    intro: { say: "Bg5 — an early pin in the Classical. Continue …O-O and …h6 to question the bishop, then the Dragon plan with …Nc6 and …Rc8. The pin is easily met and costs White a tempo.", sayShort: 'Bg5 — castle, …h6, then Rc8.' }, sources: DR,
  },
  // [2] h3 Adams
  'pro-naroditsky-dragodorf::2::Be3@14': {
    intro: { say: "Be3 — White builds the h3-g4 space-grab. Continue …O-O, …Nc6 and …Rc8, then the queenside expansion; White's committed kingside pawns become targets when you strike with …b5 and pressure the c-file. Standard Dragon counterplay.", sayShort: 'Be3 — castle, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::Be3@12': {
    intro: { say: "Be3 — White develops early in the h3 line. Play …O-O, …Nc6, …Bd7 and …Rc8, the Dragon c-file plan; expand with …a6-b5 and let the g7-bishop rake the long diagonal. A comfortable, balanced game.", sayShort: 'Be3 — castle, Rc8, then b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::O-O@16': {
    intro: { say: "O-O — White castles short after the g4 space-grab, and his kingside pawns are loose. Seize the chance: …Nc6, …b5 and …b4, attacking the king that just committed. The Dragon punishes an over-extended kingside.", sayShort: 'O-O — Nc6 and b5-b4, attack.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::g3@12': {
    intro: { say: "g3 — White fianchettos in the h3 line. Continue …O-O, …Nc6 and …Rc8; against the double fianchetto the game is positional, so play on the c-file and prepare the …d5 or …b5 breaks. Comfortable and near-level.", sayShort: 'g3 — castle, Rc8, prepare d5 or b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::g5@14': {
    intro: { say: "g5 — White lunges to kick your knight. Reroute with …Nfd7 or …Nh5, then continue the queenside plan with …Nc6 and …b5; White's advanced pawns overextend and become targets. Sidestep, then counter.", sayShort: 'g5 — reroute the knight, then b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::Bc4@12': {
    intro: { say: "Bc4 — the bishop eyes f7 in the h3 line. Complete development: …O-O, …Nc6, …Bd7, and neutralise the bishop with …Na5 or …b5. Then the standard Dragon queenside pressure takes over.", sayShort: 'Bc4 — castle, then Na5 or b5.' }, sources: DR,
  },

  // ===== Deep tail =====
  'pro-naroditsky-alekhine::2::a4@8': {
    intro: { say: "a4 — White grabs queenside space in the quiet Alekhine. Meet it with …a5, fixing the pawns, then develop …g6, …Bg7 and pressure the centre; your active pieces easily handle the slight space concession.", sayShort: 'a4 — …a5, then fianchetto and press.' }, sources: ALK,
  },
  'pro-naroditsky-kid::2::Be3@18': {
    intro: { say: "Be3 — deep in the Fianchetto KID, White develops once the centre is set. Continue …Qa5 and …Rfe8, pressuring the queenside and centre; the fianchetto lines are positional — play with …c6, …Qa5 and the …exd4 or …b5 breaks.", sayShort: 'Be3 — …Qa5 and …Rfe8, press.' }, sources: K,
  },
  'pro-naroditsky-kid::3::O-O@16': {
    intro: { say: "O-O — White castles in the Makogonov after your …e5. Now storm: …Nh5 or …Nc5 and …f5, rolling the kingside pawns; with the centre locked the King's Indian attack is on.", sayShort: 'O-O — …f5 storm, attack.' }, sources: K,
  },
  'pro-naroditsky-kid::4::d5@16': {
    intro: { say: "d5 — White locks the centre in the Sämisch after your …c5. Perfect for the KID: reroute …Ne7 or …Na5 and storm the kingside with …f5, or play …e6 to break. Black has a comfortable game and the attack.", sayShort: 'd5 — …f5 or …e6, play to attack.' }, sources: K,
  },
  'pro-naroditsky-kia::1::d5@5': {
    intro: { say: "d5 — Black grabs the centre in the Modern setup. Play the system: O-O, d3, Nbd2 and the e4 break; against the early …d5 your KIA structure gives smooth development and the standard kingside build.", sayShort: 'd5 — system it, then e4.' }, sources: KIA,
  },
  'pro-naroditsky-rossolimo::4::a6@9': {
    intro: { say: "a6 — Black prevents your bishop's ideas. Continue d3, c3, Re1 and the Nbd2 reroute, preparing d4; your flexible Italian-versus-Sicilian setup keeps a small, pleasant pull.", sayShort: 'a6 — d3 and c3, prepare d4.' }, sources: ROS,
  },
  'pro-naroditsky-jobava-london::2::h6@7': {
    intro: { say: "h6 — a slow move stopping the Bg5 and Ng5 ideas. Develop briskly: Nf3, Bd3, and meet …c5 with dxc5; your active Jobava pieces and lead in development give a comfortable edge against the slightly slow setup.", sayShort: 'h6 — develop fast, meet c5 with dxc5.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::2::b5@9': {
    intro: { say: "b5 — Black expands on the queenside. Develop Bd3 and Nf3, and meet …c5 with dxc5; keep your active setup with the c3-knight and f4-bishop, and play in the centre. Black's flank pawns are no match for your development.", sayShort: 'b5 — develop, meet c5 with dxc5.' }, sources: JOB,
  },
  'pro-naroditsky-alapin::0::Qd8@11': {
    intro: { say: "Qd8 — Black retreats the queen to safety in the Open Alapin. Use the free development: Nf3, the Na3-c4 reroute, and Be3, pressing with your central space; Black's passive queen and your easy development give a pleasant pull.", sayShort: 'Qd8 — develop freely, use the space.' }, sources: AL,
  },
  'pro-naroditsky-alapin::0::Qd8@15': {
    intro: { say: "Qd8 — Black tucks the queen home after the trades. Continue developing with tempo: Nc4, Be3 and Rc1, occupying the open c-file and the d5-square. Your active pieces and space give White the more comfortable game.", sayShort: 'Qd8 — Nc4 and Rc1, seize the c-file.' }, sources: AL,
  },
  'pro-naroditsky-alapin::1::Qb6@11': {
    intro: { say: "Qb6 — Black eyes b2 in the Advance. Castle and let b2 go; your development lead and kingside space in the Advance-French structure are worth far more, and the queen is misplaced on b6.", sayShort: 'Qb6 — castle, ignore b2.' }, sources: AL,
  },
  'pro-naroditsky-alapin::5::Bxe6@11': {
    intro: { say: "Bxe6 — Black recaptures the gambit pawn with the bishop. Retreat Bb3 and develop; the position is roughly balanced, but your active pieces and Black's slightly loose structure give easy, pleasant play.", sayShort: 'Bxe6 — Bb3, develop actively.' }, sources: AL,
  },
  'pro-naroditsky-alapin::5::dxe5@9': {
    intro: { say: "dxe5 — Black trades in the gambit line. Recapture Nxe5, castle, and develop; you have easy piece play and the initiative for the returned pawn. A comfortable, active game.", sayShort: 'dxe5 — Nxe5 and castle, stay active.' }, sources: AL,
  },
  'pro-naroditsky-alapin::6::a6@17': {
    intro: { say: "a6 — Black completes a solid setup against the isolated pawn. You have full development and the initiative: Rd1, Ne5 and the d5-break are the tools. Play the isolated d-pawn dynamically.", sayShort: 'a6 — Rd1 and Ne5, push d5.' }, sources: AL,
  },
};
