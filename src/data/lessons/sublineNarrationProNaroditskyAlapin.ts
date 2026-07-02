import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky Alapin anti-Sicilian (student
// WHITE) — frequent Black replies across the variations. House voice, grounded
// in the established Alapin understanding (meet the Sicilian with c3+d4, take a
// broad centre, sidestep theory, and press the space or the active isolated
// d-pawn). Board-safe forward-looking plans. Keyed by deviation.

const A = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'];
const AC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'];

export const SUBLINE_NARRATION_PRO_NAR_ALAPIN: Record<string, SublineNarration> = {
  // [0] 2...d5 Open
  'pro-naroditsky-alapin::0::Nf6@5': {
    intro: { say: "Nf6 — instead of recapturing with the queen, Black regains the pawn with the knight. Disrupt with the Bb5-check, then build your centre with d4 and develop Be2, Nf3 and castle. You keep a small, pleasant space edge while Black spends time chasing the d5-pawn.", sayShort: 'Nf6 — Bb5+, then build the centre.' }, sources: A,
  },
  'pro-naroditsky-alapin::0::g6@7': {
    intro: { say: "g6 — Black heads for a Dragon-style fianchetto against your Alapin. Grab the centre with d4, develop Nf3, and the Na3-b5 hop eyes the c7 and d6 weaknesses. Your central space and lead in development give a comfortable, near-risk-free pull.", sayShort: 'g6 — take the centre, Na3-b5.' }, sources: A,
  },
  'pro-naroditsky-alapin::0::a6@11': {
    intro: { say: "a6 — Black stops the Nb5 ideas. Continue Nc4, eyeing d6 and e5, then finish development and press with your extra central space. The Alapin hands White a durable, low-risk edge — patience converts it.", sayShort: 'a6 — Nc4 eyes d6, keep pressing.' }, sources: AC,
  },
  'pro-naroditsky-alapin::0::cxd4@7': {
    intro: { say: "cxd4 — Black accepts an isolated-pawn structure. Recapture cxd4 and play the mobile d-pawn actively: Nc3, Nf3 and Bd3 pour out, the d5-square beckons, and kingside chances give White the more pleasant game. The isolated pawn is a spearhead.", sayShort: 'cxd4 — recapture, play the active IQP.' }, sources: A,
  },
  'pro-naroditsky-alapin::0::Bg4@9': {
    intro: { say: "Bg4 — Black pins your knight. Break it calmly with Be2, keep your broad centre, and develop; the pin is easily neutralised and your central space endures. A pleasant, principled Alapin edge.", sayShort: 'Bg4 — Be2 breaks the pin.' }, sources: AC,
  },
  'pro-naroditsky-alapin::0::Nc6@9': {
    intro: { say: "Nc6 — Black develops to pressure d4. Defend it naturally with Be3 and Nc3, complete development, and your central space plus the d5-square give a comfortable pull. Solid and low-risk.", sayShort: 'Nc6 — Be3 holds d4, keep space.' }, sources: AC,
  },
  'pro-naroditsky-alapin::0::e6@7': {
    intro: { say: "e6 — Black sets up a solid, French-like structure. Build with Nf3 and the Na3-c4 reroute toward d6 and e5; your space advantage and easy development make this a pleasant, risk-free game.", sayShort: 'e6 — Nf3 and Na3-c4, use the space.' }, sources: AC,
  },
  // [1] 2...e6 French-style
  'pro-naroditsky-alapin::1::cxd4@5': {
    intro: { say: "cxd4 — Black trades into a French-Advance structure with ...d5. Recapture cxd4 and clamp with e5; you get an Advance French with an extra tempo, developing Nf3 and the Na3-c2 route to shore up d4 while you press the kingside. A comfortable spatial edge.", sayShort: 'cxd4 — recapture, clamp with e5.' }, sources: A,
  },
  'pro-naroditsky-alapin::1::Nf6@5': {
    intro: { say: "Nf6 — Black jabs the knight, and you seize a huge centre: e5 and c4 chase it to b6, then d5 grabs still more space. This is the Alapin dream — a broad pawn front and a lasting bind. Develop behind it and squeeze.", sayShort: 'Nf6 — e5, c4, d5, seize the centre.' }, sources: A,
  },
  'pro-naroditsky-alapin::1::Qb6@9': {
    intro: { say: "Qb6 — Black eyes b2 and d4 in the Advance structure. Calmly develop Bd3 and castle, leaving b2 alone; your development lead and kingside space are worth far more, and the queen is misplaced on b6. Sound Advance play with an extra tempo.", sayShort: 'Qb6 — Bd3 and castle, ignore b2.' }, sources: AC,
  },
  'pro-naroditsky-alapin::1::Bd7@7': {
    intro: { say: "Bd7 — an unusual development in the Advance. Continue Nf3, Bd3 and castle; your e5-clamp and central space give an easy, pleasant game while Black's pieces sit passively.", sayShort: 'Bd7 — develop, keep the e5 clamp.' }, sources: AC,
  },
  'pro-naroditsky-alapin::1::Nge7@9': {
    intro: { say: "Nge7 — Black reroutes the knight toward g6 or f5. Develop Bd3 and castle behind the e5-wedge; your space advantage and the half-open lines give a comfortable Advance-French where White presses on the kingside.", sayShort: 'Nge7 — Bd3 and castle, keep the space.' }, sources: AC,
  },
  // [2] 2...d6 mainline
  'pro-naroditsky-alapin::2::g6@7': {
    intro: { say: "g6 — Black fianchettos against your ...d6 Alapin. You already own the ideal big centre with c3 and d4; develop Nc3, Nf3 and castle, then press with the space advantage. A textbook Alapin edge — broad centre, easy development.", sayShort: 'g6 — big centre, develop and press.' }, sources: A,
  },
  'pro-naroditsky-alapin::2::e6@9': {
    intro: { say: "e6 — Black sets up solidly. Roll out the model setup: Nc3, Nf3, a bishop to c4 or d3, and castle. Your commanding centre and space give a clear, comfortable advantage against the passive structure.", sayShort: 'e6 — model setup, then press.' }, sources: AC,
  },
  'pro-naroditsky-alapin::2::Nc6@9': {
    intro: { say: "Nc6 — Black develops to pressure d4. Support it with Nf3 and Be3, finish development, and the big centre plus the space edge convert into a pleasant middlegame. Principled and low-risk.", sayShort: 'Nc6 — Nf3 supports d4, keep space.' }, sources: AC,
  },
  // [3] 2...g6 Hyper-Dragon
  'pro-naroditsky-alapin::3::Bg7@7': {
    intro: { say: "Bg7 — Black tries an accelerated Dragon move-order. Seize the centre with c3 and d4, play h3 to deny ...Bg4 and ...Ng4, then develop Nc3 and Nf3 behind the big pawns. Black's fianchetto bishop bites on your d4-granite while you enjoy the space.", sayShort: 'Bg7 — take the centre, h3 and develop.' }, sources: A,
  },
  // [4] 2...Nc6 line
  'pro-naroditsky-alapin::4::d5@5': {
    intro: { say: "d5 — Black strikes in the centre. Take exd5, and after ...Qxd5 you develop with tempo: Nf3, Be3 and Nc3 all harass the queen while you build. Smooth development and central presence give a comfortable, safe pull.", sayShort: 'd5 — exd5, develop with tempo.' }, sources: A,
  },
  'pro-naroditsky-alapin::4::Bg4@11': {
    intro: { say: "Bg4 — Black pins once the isolated d-pawn arises. Develop Nc3 hitting the queen and prepare Be2 or h3 to break the pin; play the IQP actively, with the d5-outpost and piece activity fully compensating. A balanced, double-edged game.", sayShort: 'Bg4 — Nc3 hits the queen.' }, sources: A,
  },
  'pro-naroditsky-alapin::4::e5@11': {
    intro: { say: "e5 — Black grabs central space but loosens d5 and the d6-square. Develop Nc3 hitting the queen and target the weakened light squares; your lead in development and the d5-outpost give White the better game.", sayShort: 'e5 — Nc3, target the weak d5.' }, sources: A,
  },
  // [5] Spine 4...d6 Bc4 gambit
  'pro-naroditsky-alapin::5::e6@9': {
    intro: { say: "e6 — Black solidifies in the Bc4 gambit line. Grab the centre with d4 and castle, offering the pawn for a lead in development; your active bishop on c4 and the open lines give dangerous, easy-to-play compensation and more.", sayShort: 'e6 — d4 and castle, lead in development.' }, sources: A,
  },
  'pro-naroditsky-alapin::5::e6@17': {
    intro: { say: "e6 — deep in the sharp gambit, after the fireworks Black blocks the check. You have shattered Black's king safety: the king sits exposed on f7 and your queen and pieces swarm. Keep developing with tempo — the loose king is worth far more than the pawn.", sayShort: 'e6 — the king is stuck; attack.' }, sources: AC,
  },
  'pro-naroditsky-alapin::5::fxe6@11': {
    intro: { say: "fxe6 — Black recaptures the gambit pawn but wrecks the kingside. Retreat Bb3 to keep the strong bishop and target the shattered e6-f7 complex; your development lead and Black's ruined structure give a clear edge.", sayShort: 'fxe6 — Bb3, hit the wrecked kingside.' }, sources: AC,
  },
  // [6] Spine 4...e6 IQP
  'pro-naroditsky-alapin::6::b6@11': {
    intro: { say: "b6 — Black fianchettos against your isolated d-pawn. Develop Bd2 and a bishop to c4 or d3, and play the IQP actively: the d5-outpost, the open c-file and kingside chances give White the initiative. The isolated pawn is a spearhead, not a weakness.", sayShort: 'b6 — play the IQP, aim for d5.' }, sources: A,
  },
  'pro-naroditsky-alapin::6::Nc6@13': {
    intro: { say: "Nc6 — Black develops to blockade the isolated d-pawn. Keep the pieces on and press: the bishop on c4 eyes f7, Nc3 and Re1 back the centre, and the d5-break at the right moment opens lines for your active pieces.", sayShort: 'Nc6 — keep pieces on, prepare d5.' }, sources: A,
  },
  'pro-naroditsky-alapin::6::Nc6@11': {
    intro: { say: "Nc6 — Black blockades the d-pawn early. Develop Bc4 and Nc3, castle, and play the isolated pawn dynamically; the outpost on d5 and your active pieces outweigh the structural cost. Press, don't defend.", sayShort: 'Nc6 — Bc4, play the IQP dynamically.' }, sources: A,
  },
  'pro-naroditsky-alapin::6::Nb6@13': {
    intro: { say: "Nb6 — Black hits your c4-bishop and eyes the blockade. Retreat Bb3, keeping the bishop aimed at f7, and continue Nc3, Re1 and the d5-break. Your active isolated-pawn play gives the initiative.", sayShort: 'Nb6 — Bb3, keep aiming at f7.' }, sources: A,
  },
  'pro-naroditsky-alapin::6::b6@17': {
    intro: { say: "b6 — Black completes a solid setup against the IQP. You have full development and the initiative: Rd1, Ne5 and the d5-break are the tools. Play the isolated pawn dynamically — the activity outweighs the structure.", sayShort: 'b6 — Rd1 and Ne5, push for d5.' }, sources: A,
  },
};
