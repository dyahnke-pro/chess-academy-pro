import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Eric Rosen repertoire batch X1: Accelerated London
// System + Closed Sicilian (student WHITE); Stafford Gambit + Budapest Defense
// (student BLACK). House voice, board-safe, line-grounded. Every entry answers
// the opponent's frequent deviation with the student-side plan.

const LON = ['concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'];
const LON_ATK = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'];
const CSIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const STAF_DEV = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const BUD = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const SUBLINE_NARRATION_PRO_ROSEN_X1: Record<string, SublineNarration> = {
  // ===== Accelerated London System (student WHITE) — d4 d5 Bf4 setups =====
  'pro-ericrosen-london::0::e6@7': {
    intro: { say: "e6 — Black settles into a solid, cramped Slow-Slav-style wall. Reinforce the centre with c3, develop Nbd2 and Bd3, and drop the knight into e5, the London's ideal outpost; from there f4 and a patient kingside build give you the easier, more purposeful game while Black stays boxed in behind the e6-pawn.", sayShort: 'e6 — c3 and Nbd2, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::0::Bf5@5': {
    intro: { say: "Bf5 — Black develops the light bishop outside the chain before …e6. Strike at once with c4, hitting d5, and Qb3 piles onto b7 and d5 together; Black must scramble to defend, and while the queen and c-pawn probe you gain time to bring out Nc3 with a comfortable, pressing initiative.", sayShort: 'Bf5 — c4 and Qb3, hit b7.' }, sources: LON,
  },
  'pro-ericrosen-london::0::g6@5': {
    intro: { say: "g6 — Black heads for a King's-Indian-style fianchetto. Just complete your solid setup: Nf3, Be2, h3 and O-O, with c3 and Nbd2 to follow. The f4-bishop already rakes the queenside; keep the centre firm and expand at your own pace in a risk-free, harmonious London.", sayShort: 'g6 — Nf3, Be2, h3, then O-O.' }, sources: LON,
  },
  'pro-ericrosen-london::0::Qb6@7': {
    intro: { say: "Qb6 — Black leans on b2 and the queenside. Defend calmly with Nc3, and after …c4 tuck the rook to Rb1, then a3 and b3 to undermine the over-extended c4-pawn; you pry open lines against Black's own advance, and the queenside pressure rebounds squarely in your favour.", sayShort: 'Qb6 — Nc3 and Rb1, prepare b3.' }, sources: LON,
  },
  'pro-ericrosen-london::1::Be7@5': {
    intro: { say: "Be7 — Black develops before committing …d5, leaving the centre open. Seize the moment: Nd2 and Ngf3, then Bd3 and prepare e4; because Black has not staked out the centre, you can expand into a broad pawn front and claim more space than an ordinary London allows.", sayShort: 'Be7 — Nd2 and Ngf3, aim e4.' }, sources: LON,
  },

  // ===== Accelerated London System (student WHITE) — d4 Nf6 Bf4 c5 setups =====
  'pro-ericrosen-london::2::d5@5': {
    intro: { say: "d5 — Black meets the London with the classical …c5 and …d5 centre. Shore it up with c3, then Nd2, Ngf3 and Bd3, and jump the knight into e5; the standard London manoeuvres give you a firm centre and a kingside build while Black must still solve their own light bishop.", sayShort: 'd5 — c3, Nd2, Ngf3, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::2::g6@5': {
    intro: { say: "g6 — Black fianchettoes against the London. Complete development smoothly: c3, Nf3, Be2, h3 and O-O, with Nbd2 to follow. Keep the centre solid and pick your moment for e4 or a queenside expansion; the harmonious setup yields an easy, weakness-free game.", sayShort: 'g6 — c3, Nf3, Be2, then O-O.' }, sources: LON,
  },
  'pro-ericrosen-london::2::Nd5@5': {
    intro: { say: "Nd5 — Black jumps the knight in to hit the bishop. Retreat Bg3, then challenge the intruder with Nc3; after the trade recapture bxc3, handing you a broad c3-d4 pawn centre and the half-open b-file. Develop Nf3 and Bd3 and press with your extra space.", sayShort: 'Nd5 — Bg3 and Nc3, build c3-d4 center.' }, sources: LON,
  },
  'pro-ericrosen-london::2::cxd4@5': {
    intro: { say: "cxd4 — Black opens the centre early. Recapture exd4, and after …d5 support the pawn with c3, then Nd2, Ngf3 and Bd3; you reach a healthy Carlsbad-type structure with the more active bishop and clear play down the half-open e-file.", sayShort: 'cxd4 — exd4 and c3, hold d4.' }, sources: LON,
  },
  'pro-ericrosen-london::2::e6@5': {
    intro: { say: "e6 — Black builds a solid but passive wall. Reply with the London staples: c3, Nd2, Ngf3 and Bd3, then Ne5; your dark-squared bishop is unopposed, your knight dominates e5, and a patient kingside build gives the better long-term prospects.", sayShort: 'e6 — c3, Nd2, Bd3, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::2::cxd4@11': {
    intro: { say: "cxd4 — Black trades to clarify the centre. Recapture exd4, then Be2 and O-O; the d4-pawn gives you a broad centre while the c4-knight eyes d6, and your development lead lets you claim the initiative before Black finishes their fianchetto.", sayShort: 'cxd4 — exd4, Be2, then O-O.' }, sources: LON,
  },

  // ===== Accelerated London System (student WHITE) — Jobava-style Nc3 + e4 =====
  'pro-ericrosen-london::3::c6@5': {
    intro: { say: "c6 — Black prepares …Qa5 and central counterplay against your Jobava setup. Build the big centre with e4 and Qd2, and when the centre opens meet …e5 by trading and pinning with Bg5; your lead in development and the pressure on the pinned knight give a sharp, favourable middlegame.", sayShort: 'c6 — e4 and Qd2, pressure with Bg5.' }, sources: LON_ATK,
  },
  'pro-ericrosen-london::3::a6@7': {
    intro: { say: "a6 — Black readies …b5 and a queenside expansion under your big centre. Set up the attacking machine: Qd2, f3 and O-O-O, then storm with h4-h5 against the fianchetto; in this opposite-wing race your kingside assault on Black's king is the faster one.", sayShort: 'a6 — Qd2, f3, then O-O-O and h4.' }, sources: LON_ATK,
  },

  // ===== Closed Sicilian (student WHITE) — e4 c5 Nc3 e6 f4 d5 setups =====
  'pro-ericrosen-closed-sicilian::0::Nc6@7': {
    intro: { say: "Nc6 — Black develops toward the centre. Pin and pressure with Bb5, then castle and settle with d3; the f4-pawn signals your plan — expand on the kingside with f5 or e5, prying open lines toward Black's king while your pieces aim at the same wing.", sayShort: 'Nc6 — Bb5 and O-O, play f4-f5.' }, sources: CSIC,
  },
  'pro-ericrosen-closed-sicilian::0::d4@7': {
    intro: { say: "d4 — Black grabs space and closes the centre. Reroute the knight with Ne2, prop up with d3, and after …f5 lock the position with e5; with the centre fixed the game becomes a kingside race, where g3, Ng3 and a pawn storm give you the attack Black cannot match.", sayShort: 'd4 — Ne2 and d3, then kingside play.' }, sources: CSIC,
  },
  'pro-ericrosen-closed-sicilian::0::a6@7': {
    intro: { say: "a6 — Black rules out Bb5 and prepares a slow build. Switch into the true Closed Sicilian setup: d3, g3 and Bg2, then O-O; from there the classic f4-f5 kingside expansion, backed by the fianchettoed bishop, gives you a natural attacking plan against Black's king.", sayShort: 'a6 — d3, g3, Bg2, then O-O.' }, sources: CSIC,
  },

  // ===== Stafford Gambit (student BLACK) — declined, pawn regained =====
  'pro-ericrosen-stafford::2::d3@8': {
    intro: { say: "d3 — the opponent kicks your active knight and declines the gambit. No need for fireworks now: retreat …Nf6, strike back with …d5, and develop naturally with …Bd6 and …O-O. Having already regained the pawn, you have a sound, comfortable game with easy development and no weaknesses.", sayShort: 'd3 — …Nf6 and …d5, develop easily.' }, sources: STAF_DEV,
  },

  // ===== Budapest Defense (student BLACK) =====
  'pro-ericrosen-budapest::1::Qd2@8': {
    intro: { say: "Qd2 — the opponent tucks the queen away to hold c3. Develop with tempo: …Bb4 ties the knight to its defence, then …Ne4 forks queen and knight, and …Bxc3 shatters White's queenside pawns; your active pieces and the damaged structure give the Budapest exactly the lively counterplay it seeks.", sayShort: 'Qd2 — …Bb4 and …Ne4, then …Bxc3+.' }, sources: BUD,
  },
};
