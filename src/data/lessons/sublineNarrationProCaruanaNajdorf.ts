import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Caruana Sicilian Najdorf, English Attack tab (student
// BLACK). White's 7th-move alternatives to the sharp Nb3/f3/g4 main. House voice,
// board-safe, line-grounded (masters-explorer deviations off the OTB spine).

const NAJ = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'];

export const SUBLINE_NARRATION_PRO_CARUANA_NAJDORF: Record<string, SublineNarration> = {
  'pro-caruana-najdorf::0::Nf3@12': {
    intro: { say: "Nf3 — the positional English Attack, White keeping the knight active instead of retreating it to b3. Answer …Be7 and …O-O, then …Be6 or …Nc6 contesting the centre; the solid setup and Black's central space give a comfortable, balanced game with none of the storm.", sayShort: 'Nf3 — …Be7 and …O-O, contest centre.' }, sources: NAJ,
  },
};
