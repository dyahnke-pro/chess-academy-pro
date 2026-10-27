import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration completing the Naroditsky set: the Dragodorf sublines
// (student BLACK — the Dragon queenside race: …Bg7, …O-O, …Nc6, …Rc8, …b5-b4,
// dark-square pressure; against O-O-O it is a pure opposite-wing storm) plus the
// remaining deep tail across KID/KIA/Rossolimo/Jobava/Alapin/Alekhine. House
// voice, line-grounded, board-safe forward-looking plans.

const DR = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'];
const KIA = ['concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack'];
const JOB = ['concept:pos-development', 'https://www.chess.com/openings/London-System'];
const AL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'];
const ALK = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'];

export const SUBLINE_NARRATION_PRO_NAR_DRAGO_TAIL: Record<string, SublineNarration> = {
  'pro-naroditsky-dragodorf::0::Be2@12': {
    intro: { say: "Be2 — a calmer English Attack. Continue …O-O, …Nc6 and …Bd7, then the standard Dragon queenside play: …Rc8, …b5 and pressure down the c-file. The g7-bishop bites on the long diagonal throughout.", sayShort: 'Be2 — castle, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::0::Qd2@12': {
    intro: { say: "Qd2 — White prepares queenside castling in the Yugoslav. Strike first on the wing: with …b5 already in, follow with …Bb7, …Nbd7 and …b4 hitting the c3-knight. Race at White's king before the kingside storm arrives.", sayShort: 'Qd2 — race with b5, Bb7 and b4.' }, sources: DR,
  },
  // [1] Classical (Be2)
  'pro-naroditsky-dragodorf::1::Be3@12': {
    intro: { say: "Be3 — White develops in the Classical. Continue …O-O, …Nc6 and …Bd7, then the Dragon queenside plan: …Rc8, …Ne5 or …a6-b5, pressuring down the c-file with the g7-bishop raking the centre. A rich, balanced Dragon.", sayShort: 'Be3 — castle, then Rc8 and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::g4@12': {
    intro: { say: "g4 — an early space-grab. Blunt it with …h6, then continue …Bg7, …O-O and the queenside expansion; White's g4 loosens their kingside, giving you a target if they castle short. Counter with …b5 and the c-file.", sayShort: 'g4 — …h6, then castle and b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::1::Bg5@12': {
    intro: { say: "Bg5 — an early pin in the Classical. Continue …O-O and …h6 to question the bishop, then the Dragon plan with …Nc6 and …Rc8. The pin is easily met and costs White a tempo.", sayShort: 'Bg5 — castle, …h6, then Rc8.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::Be3@12': {
    intro: { say: "Be3 — White develops early in the h3 line. Play …O-O, …Nc6, …Bd7 and …Rc8, the Dragon c-file plan; expand with …a6-b5 and let the g7-bishop rake the long diagonal. A comfortable, balanced game.", sayShort: 'Be3 — castle, Rc8, then b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::g3@12': {
    intro: { say: "g3 — White fianchettos in the h3 line. Continue …O-O, …Nc6 and …Rc8; against the double fianchetto the game is positional, so play on the c-file and prepare the …d5 or …b5 breaks. Comfortable and near-level.", sayShort: 'g3 — castle, Rc8, prepare d5 or b5.' }, sources: DR,
  },
  'pro-naroditsky-dragodorf::2::Bc4@12': {
    intro: { say: "Bc4 — the bishop eyes f7 in the h3 line. Complete development: …O-O, …Nc6, …Bd7, and neutralise the bishop with …Na5 or …b5. Then the standard Dragon queenside pressure takes over.", sayShort: 'Bc4 — castle, then Na5 or b5.' }, sources: DR,
  },

  // ===== Deep tail =====
  'pro-naroditsky-alekhine::2::a4@8': {
    intro: { say: "a4 — White grabs queenside space in the quiet Alekhine. Meet it with …a5, fixing the pawns, then develop …g6, …Bg7 and pressure the centre; your active pieces easily handle the slight space concession.", sayShort: 'a4 — …a5, then fianchetto and press.' }, sources: ALK,
  },
  'pro-naroditsky-kia::1::d5@5': {
    intro: { say: "d5 — Black grabs the centre in the Modern setup. Play the system: O-O, d3, Nbd2 and the e4 break; against the early …d5 your KIA structure gives smooth development and the standard kingside build.", sayShort: 'd5 — system it, then e4.' }, sources: KIA,
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
  'pro-naroditsky-alapin::5::dxe5@9': {
    intro: { say: "dxe5 — Black trades in the gambit line. Recapture Nxe5, castle, and develop; you have easy piece play and the initiative for the returned pawn. A comfortable, active game.", sayShort: 'dxe5 — Nxe5 and castle, stay active.' }, sources: AL,
  },
};
