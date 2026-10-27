import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky Najdorf + Alekhine (student BLACK)
// and Ruy Lopez (student WHITE). House voice, line-grounded. Najdorf: the ...e5
// centre + the queenside race (…b5, …Rc8, …a5) against White's kingside storm.
// Alekhine: provoke the big centre, then undermine it and get the light bishop
// out early. Ruy: the modern d3 slow-squeeze (Nbd2, Nf1-g3, c3). Board-safe.

const NAJ = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'];
const ALK = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'];
const RUY = ['concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];

export const SUBLINE_NARRATION_PRO_NAR_NAJ_ALEK_RUY: Record<string, SublineNarration> = {
  'pro-naroditsky-najdorf::1::Nf3@12': {
    intro: { say: "Nf3 — White reroutes the knight to f3 rather than b3. It sits passively against your central pawn; develop …Be7, …O-O and …Nbd7, then expand with …b5. You get the freer game while White's pieces lack their best squares.", sayShort: 'Nf3 — Be7 and O-O, then b5.' }, sources: NAJ,
  },
  'pro-naroditsky-najdorf::2::Nb3@12': {
    intro: { say: "Nb3 — White retreats the knight in the Adams Attack after your …e5. Continue …Be7, …O-O and …Nbd7, then expand with …b5; the h3-g4 setup is slow, giving you time to organise the queenside counterplay. A rich Najdorf battle.", sayShort: 'Nb3 — Be7 and O-O, then b5.' }, sources: NAJ,
  },
  'pro-naroditsky-najdorf::2::Nf3@12': {
    intro: { say: "Nf3 — White drops the knight back to f3. It sits passively against your central pawn; play …Be7, …O-O and …Nbd7 and the …b5 expansion, enjoying the freer game while White's setup lacks bite.", sayShort: 'Nf3 — develop, then expand with b5.' }, sources: NAJ,
  },
  'pro-naroditsky-najdorf::3::Be3@12': {
    intro: { say: "Be3 — the sharp Sozin/Fischer Attack, White eyeing a kingside assault. Meet it precisely: …Be7, …O-O, and the queenside counter with …Na5 hitting the c4-bishop, or …b5. Trade off the dangerous light-squared bishop and Black is comfortable.", sayShort: 'Be3 — Be7, then hit the c4-bishop.' }, sources: NAJ,
  },
  'pro-naroditsky-alekhine::0::f4@4': {
    intro: { say: "f4 — a Vienna-Gambit-style thrust. Strike back with …d5, and after the exchanges your knight sits actively on e4; develop …Nc6 and finish development. The open lines and your active pieces give a sound, comfortable game.", sayShort: 'f4 — hit back with d5.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::0::d4@4': {
    intro: { say: "d4 — White lunges in the centre, but the tempting recapture leads astray; the accurate move is …exd4 at once. Take the pawn and hold it: after the knight recaptures you develop with tempo and keep the extra material. Precision here punishes White's over-extension.", sayShort: 'd4 — take exd4 and hold it.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::0::Bc4@4': {
    intro: { say: "Bc4 — White develops aggressively. Solidify with …c6 and …d5, and after the queens come off you reach a comfortable, equal endgame with easy development. Nothing to fear — trade into a level game and play on.", sayShort: 'Bc4 — c6 and d5, trade to equality.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::1::Nf3@10': {
    intro: { say: "Nf3 — White develops after the exchange on d6. Get your light bishop out to f5 — the whole point of the Alekhine, it never gets buried — then …Be7, …O-O, and pressure the c4-d4 pawns with …Nc6 and …Re8. Comfortable, active piece play.", sayShort: 'Nf3 — bishop to f5, then pressure d4.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::1::h3@10': {
    intro: { say: "h3 — White stops …Bg4. No matter: develop …Be7 and …O-O, then …Nc6, …Re8 and …Be6, training your pieces on the broad c4-d4 centre. The bigger the centre, the more targets it offers.", sayShort: 'h3 — develop, pressure the centre.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::2::exd6@8': {
    intro: { say: "exd6 — White resolves the centre in the quiet line. Recapture …exd6, opening the e-file, then develop …Be7, …O-O and the light bishop out; you reach a comfortable, near-symmetrical game with easy development.", sayShort: 'exd6 — recapture, open the e-file.' }, sources: ALK,
  },
  'pro-naroditsky-alekhine::2::c4@8': {
    intro: { say: "c4 — White grabs more space. Chip at it with …dxe5, then fianchetto …g6 and …Bg7 to pressure the centre from the flank; your active bishop and the …c5 break give sound counterplay against the broad front.", sayShort: 'c4 — dxe5, then fianchetto Bg7.' }, sources: ALK,
  },
  'pro-naroditsky-ruy-lopez::2::f5@9': {
    intro: { say: "f5 — Black lashes out in the old Steinitz. Take exf5, and after …Bxf5 you have the safer structure and the better development; play d4 to seize the centre and exploit the loosened Black kingside. Aggression met with the centre.", sayShort: 'f5 — take exf5, then seize d4.' }, sources: RUY,
  },
};
