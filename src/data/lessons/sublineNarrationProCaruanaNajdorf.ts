import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Caruana Sicilian Najdorf, English Attack tab (student
// BLACK). White's 7th-move alternatives to the sharp Nb3/f3/g4 main. House voice,
// board-safe, line-grounded (masters-explorer deviations off the OTB spine).

const NAJ = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'];

export const SUBLINE_NARRATION_PRO_CARUANA_NAJDORF: Record<string, SublineNarration> = {
  'pro-caruana-najdorf::0::Nf3@12': {
    intro: { say: "Nf3 — the positional English Attack, White keeping the knight active instead of retreating it to b3. Answer …Be7 and …O-O, then …Be6 or …Nc6 contesting the centre; the solid setup and Black's central space give a comfortable, balanced game with none of the storm.", sayShort: 'Nf3 — …Be7 and …O-O, contest centre.' }, sources: NAJ,
  },
  'pro-caruana-najdorf::0::Qd2@14': {
    intro: { say: "Qd2 — White develops the queen and eyes long castling in the English Attack. Continue …Be7, …Nbd7 and …O-O, then the …b5-b4 queenside race; the plan never changes — hold the d5-square, castle, and storm White's king faster than the g4-g5 push can arrive.", sayShort: 'Qd2 — …Be7 and …Nbd7, then …b5.' }, sources: NAJ,
  },
  'pro-caruana-najdorf::0::h3@14': {
    intro: { say: "h3 — the Adams Attack, White preparing g4-g5 while denying any …Ng4 leap. Meet it the same way: …Be7, …Nbd7, …O-O and the …b5-b4 storm; Black castles straight into the race and counterattacks on the queenside, exactly where White's king lands after O-O-O.", sayShort: 'h3 — …Be7 and …Nbd7, race …b5.' }, sources: NAJ,
  },
  'pro-caruana-najdorf::0::Be2@14': {
    intro: { say: "Be2 — White chooses a quiet, positional path, developing the bishop modestly instead of the sharp f3-g4 plan. Black is comfortable: …Be7, …O-O, …Nbd7 and …Rc8, contesting the d5-square and pressing the half-open c-file. A calm Najdorf where Black equalises easily.", sayShort: 'Be2 — …Be7 and …O-O, press c-file.' }, sources: NAJ,
  },
};
