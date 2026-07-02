import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky Jobava London + Fantasy Caro
// (student WHITE). House voice, line-grounded. Jobava: Nc3 + Bf4, fast active
// piece play, keep the strong dark-squared bishop. Fantasy: f3 for a broad
// e4-d4 centre, and gambit the d-pawn for a lead in development. Board-safe.

const JOB = ['concept:pos-development', 'https://www.chess.com/openings/London-System'];
const FAN = ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'];

export const SUBLINE_NARRATION_PRO_NAR_JOB_FAN: Record<string, SublineNarration> = {
  // ===== Jobava London (White) =====
  'pro-naroditsky-jobava-london::0::Bb4@7': {
    intro: { say: "Bb4 — Black pins the c3-knight in the e6 setup. No need to worry: develop naturally with Nge2 or Bd3, and if Black trades on c3 you recapture and keep the bishop pair and the strong f4-bishop. The Jobava's piece activity endures.", sayShort: 'Bb4 — develop, keep the bishop pair.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::0::c5@5': {
    intro: { say: "c5 — Black strikes at the centre. Meet it calmly: e3, then dxc5 at the right moment and Bd3 to develop; you keep the active Jobava setup with the knight on c3 and the bishop raking from f4. Quick, harmonious development.", sayShort: 'c5 — e3 and dxc5, develop.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::0::Bb4@5': {
    intro: { say: "Bb4 — an early pin. Continue e3 and develop Nge2 or Bd3; the pin is easily handled, and if Black trades you keep the bishop pair. The Jobava thrives on fast development and active pieces.", sayShort: 'Bb4 — e3, develop, unpin later.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::1::Bf5@5': {
    intro: { say: "Bf5 — Black develops actively and offers to trade dark bishops with …Bd6. Keep yours with Bg3, or trade and press the resulting structure; develop Nf3 and Bd3, and the Jobava's active pieces give a comfortable game.", sayShort: 'Bf5 — Bg3 keeps your bishop, develop.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::1::g6@7': {
    intro: { say: "g6 — Black fianchettos. Develop naturally with Nf3 and a bishop to d3 or e2, and eye the h4-h5 or Ne5 ideas against the fianchetto; your knight on c3 and the f4-bishop give active, aggressive piece play.", sayShort: 'g6 — develop, eye h4 and Ne5.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::2::c5@7': {
    intro: { say: "c5 — Black hits the centre after …a6. Take dxc5 and develop Bd3 and Nf3; you keep the active Jobava structure and a small edge, with the f4-bishop and c3-knight ready for quick play. A comfortable, aggressive setup.", sayShort: 'c5 — dxc5, develop, keep the edge.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::2::Bf5@7': {
    intro: { say: "Bf5 — Black develops the bishop. Continue Bd3 to challenge it, or Nf3 and a natural build; trading on f5 or keeping the tension both suit you. The Jobava's piece activity gives a pleasant game.", sayShort: 'Bf5 — Bd3 challenges it, develop.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::2::b5@7': {
    intro: { say: "b5 — Black grabs queenside space. Blunt it with a3, develop Nf3 and Bd3, and play in the centre with the e4 break at the right moment; White's harmonious development outweighs Black's flank pawns.", sayShort: 'b5 — a3, develop, prepare e4.' }, sources: JOB,
  },
  'pro-naroditsky-jobava-london::2::Bd6@9': {
    intro: { say: "Bd6 — Black offers to trade your strong f4-bishop. Keep it with Bg3, retaining the aggressive setup; develop Bd3 and castle, and the Jobava piece play gives a comfortable, active game.", sayShort: 'Bd6 — Bg3 keeps the bishop, develop.' }, sources: JOB,
  },

  // ===== Fantasy Caro (White) =====
  'pro-naroditsky-fantasy-caro::0::exd4@9': {
    intro: { say: "exd4 — Black grabs the d4-pawn in the accepted line. Offer it as a gambit: Bc4 develops with tempo toward f7, and O-O opens the f-file for your rook. Your lead in development and the open lines give dangerous, easy-to-play compensation and more.", sayShort: 'exd4 — Bc4 and O-O, lead in development.' }, sources: FAN,
  },
  'pro-naroditsky-fantasy-caro::0::Be6@9': {
    intro: { say: "Be6 — Black develops the bishop to trade off your active pieces. Continue Nbd2 and a bishop to d3 or c4, keeping your broad e4-e5 centre and the open f-file; your space and development give a clear, pleasant edge.", sayShort: 'Be6 — Nbd2, keep the big centre.' }, sources: FAN,
  },
  'pro-naroditsky-fantasy-caro::2::e6@7': {
    intro: { say: "e6 — Black plays solidly after the early …Qb6. Blunt the queen with a3 and Be3, covering d4, then develop Bd3 and complete your big-centre setup; the queen is misplaced on b6 and your space tells.", sayShort: 'e6 — a3 and Be3, keep the centre.' }, sources: FAN,
  },
  'pro-naroditsky-fantasy-caro::2::e5@7': {
    intro: { say: "e5 — Black lashes out, but it over-reaches. Take dxe5, and Na4 hits the loose bishop and queen; you emerge with the extra pawn and the safer position while Black's pieces flail. Punish the premature aggression.", sayShort: 'e5 — dxe5 and Na4, punish it.' }, sources: FAN,
  },
};
