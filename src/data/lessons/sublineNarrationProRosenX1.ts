import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Eric Rosen repertoire batch X1: Accelerated London
// System + Closed Sicilian (student WHITE); Stafford Gambit + Budapest Defense
// (student BLACK). House voice, board-safe, line-grounded. Every entry answers
// the opponent's frequent deviation with the student-side plan.

const LON = ['concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'];
const LON_ATK = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'];
const CSIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const STAF = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const STAF_DEV = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Petrov%27s_Defence'];
const BUD = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const SUBLINE_NARRATION_PRO_ROSEN_X1: Record<string, SublineNarration> = {
  // ===== Accelerated London System (student WHITE) — d4 d5 Bf4 setups =====
  'pro-ericrosen-london::0::e6@7': {
    intro: { say: "e6 — Black settles into a solid, cramped Slow-Slav-style wall. Reinforce the centre with c3, develop Nbd2 and Bd3, and drop the knight into e5, the London's ideal outpost; from there f4 and a patient kingside build give you the easier, more purposeful game while Black stays boxed in behind the e6-pawn.", sayShort: 'e6 — c3 and Nbd2, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::0::Nh5@9': {
    intro: { say: "Nh5 — Black chases the London bishop off f4. Retreat Bg3, keeping the battery intact; if the knight grabs it with …Nxg3, recapture hxg3 and the half-open h-file becomes an attacking lane. Follow with Bd3, Ne5 and a kingside plan — Black has burned time on a knight that only helps you.", sayShort: 'Nh5 — retreat Bg3, keep the battery.' }, sources: LON,
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

  // ===== Accelerated London System (student WHITE) — d4 Nf6 Bf4 e6 setups =====
  'pro-ericrosen-london::1::Be7@7': {
    intro: { say: "Be7 — Black chooses the modest square instead of the active …Bd6. Build the ideal London: Nbd2, Bd3, c3 and O-O, then plant the knight on e5; with your dark-squared bishop unopposed and more central space, steer toward f4 and a slow kingside squeeze.", sayShort: 'Be7 — Nbd2, Bd3, c3, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::1::Qc7@13': {
    intro: { say: "Qc7 — Black leans on the e5-knight and the b1-h7 diagonal. Preserve the battery with Bg3, then support the outpost with f4 and open the kingside build; Qf3 or Rf3-h3 lifts a rook into the attack. The dominant e5-knight and dark-square grip point your forces straight at Black's king.", sayShort: 'Qc7 — Bg3 and f4, attack kingside.' }, sources: LON,
  },
  'pro-ericrosen-london::1::Be7@5': {
    intro: { say: "Be7 — Black develops before committing …d5, leaving the centre open. Seize the moment: Nd2 and Ngf3, then Bd3 and prepare e4; because Black has not staked out the centre, you can expand into a broad pawn front and claim more space than an ordinary London allows.", sayShort: 'Be7 — Nd2 and Ngf3, aim e4.' }, sources: LON,
  },
  'pro-ericrosen-london::1::b6@13': {
    intro: { say: "b6 — Black prepares …Bb7 and a slow queenside setup. Ignore the flank and play where you are strong: Bd3, f4 and Qf3, then swing a rook via Rf3-h3 toward the king. The e5-knight anchors the assault, and your kingside build arrives well before Black's queenside gets moving.", sayShort: 'b6 — Bd3 and f4, storm kingside.' }, sources: LON,
  },
  'pro-ericrosen-london::1::c4@13': {
    intro: { say: "c4 — Black gains space but releases the central tension. With the pawns fixed you own the centre, so strike e4, opening lines toward the king while Black is committed on the far wing; the f4 and e5 setup plus the central break give you a dangerous, one-sided attack.", sayShort: 'c4 — strike e4 in the center.' }, sources: LON,
  },
  'pro-ericrosen-london::1::Nfd7@9': {
    intro: { say: "Nfd7 — Black challenges the proud e5-knight. Keep the battery with Bg3, and if Black trades on e5 recapture to hold the bind, then regroup with Bd3 and c4 for central pressure; you retain the London's easy development and the more active pieces without conceding a thing.", sayShort: 'Nfd7 — Bg3, then Bd3 and c4.' }, sources: LON,
  },

  // ===== Accelerated London System (student WHITE) — d4 Nf6 Bf4 c5 setups =====
  'pro-ericrosen-london::2::d5@5': {
    intro: { say: "d5 — Black meets the London with the classical …c5 and …d5 centre. Shore it up with c3, then Nd2, Ngf3 and Bd3, and jump the knight into e5; the standard London manoeuvres give you a firm centre and a kingside build while Black must still solve his own light bishop.", sayShort: 'd5 — c3, Nd2, Ngf3, then Ne5.' }, sources: LON,
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
  'pro-ericrosen-london::2::Be6@11': {
    intro: { say: "Be6 — Black offers to swap off your well-placed c4-knight. Sidestep with Ne5, keeping the strong outpost, or finish developing with Be2 and O-O; either way the d4-pawn hands you a durable space edge and your pieces flow to natural squares while Black untangles.", sayShort: 'Be6 — Ne5 or Be2, keep pressing.' }, sources: LON,
  },
  'pro-ericrosen-london::2::e6@5': {
    intro: { say: "e6 — Black builds a solid but passive wall. Reply with the London staples: c3, Nd2, Ngf3 and Bd3, then Ne5; your dark-squared bishop is unopposed, your knight dominates e5, and a patient kingside build gives the better long-term prospects.", sayShort: 'e6 — c3, Nd2, Bd3, then Ne5.' }, sources: LON,
  },
  'pro-ericrosen-london::2::Nbd7@11': {
    intro: { say: "Nbd7 — Black completes development in the Na3-Nc4 line. Finish your own with Be2 and O-O, keeping the knight on c4 pressing the d6-square; with more space and smoother coordination you hold a small but genuine pull to nurse patiently.", sayShort: 'Nbd7 — Be2 and O-O, press d6.' }, sources: LON,
  },
  'pro-ericrosen-london::2::cxd4@11': {
    intro: { say: "cxd4 — Black trades to clarify the centre. Recapture exd4, then Be2 and O-O; the d4-pawn gives you a broad centre while the c4-knight eyes d6, and your development lead lets you claim the initiative before Black finishes his fianchetto.", sayShort: 'cxd4 — exd4, Be2, then O-O.' }, sources: LON,
  },
  'pro-ericrosen-london::2::Bg4@11': {
    intro: { say: "Bg4 — Black pins the f3-knight. Simply break it with Be2, offering a trade that leaves you the sounder structure and the bishop-pair option; follow with O-O and central play. The pin achieves nothing lasting while your space advantage endures.", sayShort: 'Bg4 — Be2 breaks the pin, then O-O.' }, sources: LON,
  },

  // ===== Accelerated London System (student WHITE) — Jobava-style Nc3 + e4 =====
  'pro-ericrosen-london::3::c6@5': {
    intro: { say: "c6 — Black prepares …Qa5 and central counterplay against your Jobava setup. Build the big centre with e4 and Qd2, and when the centre opens meet …e5 by trading and pinning with Bg5; your lead in development and the pressure on the pinned knight give a sharp, favourable middlegame.", sayShort: 'c6 — e4 and Qd2, pressure with Bg5.' }, sources: LON_ATK,
  },
  'pro-ericrosen-london::3::a6@7': {
    intro: { say: "a6 — Black readies …b5 and a queenside expansion under your big centre. Set up the attacking machine: Qd2, f3 and O-O-O, then storm with h4-h5 against the fianchetto; in this opposite-wing race your kingside assault on Black's king is the faster one.", sayShort: 'a6 — Qd2, f3, then O-O-O and h4.' }, sources: LON_ATK,
  },
  'pro-ericrosen-london::3::h6@9': {
    intro: { say: "h6 — Black tries to stop the trade of your strong dark-squared bishop. No matter: castle long with O-O-O, brace the centre with f3, and roll the h-pawn with h4-h5, prying open lines toward the fianchettoed king; the …h6 move only hands your pawn storm another hook.", sayShort: 'h6 — O-O-O and f3, storm with h4.' }, sources: LON_ATK,
  },
  'pro-ericrosen-london::3::Nbd7@9': {
    intro: { say: "Nbd7 — Black develops toward …e5 and queenside play. Complete your plan: O-O-O and f3, then launch h4-h5 into the fianchetto; the Jobava's big centre restrains Black while your pawn storm crashes through on the kingside first.", sayShort: 'Nbd7 — O-O-O, f3, then h4-h5 storm.' }, sources: LON_ATK,
  },
  'pro-ericrosen-london::3::Nc6@11': {
    intro: { say: "Nc6 — Black brings the knight out for …e5 and a queenside push. This is the opposite-side sprint: race with h4-h5 and trade off the defender with Bh6; your attack on the fianchettoed king outpaces Black's counterplay, so push the pawns and pry open the h-file.", sayShort: 'Nc6 — race h4-h5, trade with Bh6.' }, sources: LON_ATK,
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
  'pro-ericrosen-closed-sicilian::0::Qxd7@11': {
    intro: { say: "Qxd7 — Black recaptures after the bishop trade. Seize the initiative with Ne5, hitting the queen and grabbing a powerful central outpost; once you follow with O-O and d3, the dominant knight and the f4-pawn point your whole army at the kingside, where you press for the attack.", sayShort: 'Qxd7 — Ne5 outpost, O-O, attack kingside.' }, sources: CSIC,
  },
  'pro-ericrosen-closed-sicilian::0::Nc6@9': {
    intro: { say: "Nc6 — Black blocks the check with the knight. Castle and settle with d3, keeping the bishop's pressure on c6; you retain the easier development, and the f4-pawn lets you expand with f5 later, opening the kingside toward Black's king while your structure stays sound.", sayShort: 'Nc6 — O-O and d3, expand kingside.' }, sources: CSIC,
  },

  // ===== Closed Sicilian (student WHITE) — e4 c5 Nc3 g6 d4 open line =====
  'pro-ericrosen-closed-sicilian::1::Nc6@11': {
    intro: { say: "Nc6 — Black gains a tempo by hitting your centralised queen. Retreat cleanly to Qe3, keeping the piece active and eyeing the kingside, then castle and lean on your broad e4-centre; with a development lead and the bishop already on d3, steer toward pressure against Black's fianchettoed king.", sayShort: 'Nc6 — retreat Qe3, O-O, use center.' }, sources: CSIC,
  },

  // ===== Stafford Gambit (student BLACK) — attacking mainlines =====
  'pro-ericrosen-stafford::0::O-O@12': {
    intro: { say: "O-O — the opponent castles straight into the storm. Pounce with …Ng4, eyeing the sensitive f2- and h2-squares, and with …h5 already advanced follow up …h4 and a sacrifice to tear open the king; the Stafford's whole point is this lightning kingside attack, and here it lands with full force.", sayShort: 'O-O — …Ng4 and …h4, storm kingside.' }, sources: STAF,
  },
  'pro-ericrosen-stafford::0::Bf4@16': {
    intro: { say: "Bf4 — the opponent develops the bishop to blunt your attack. Answer …Qd6, hitting the bishop and lining the queen up toward h2; with the h-file already open your rook and queen swarm the king. Keep piling pieces onto h2 and f2 — the exposed king cannot survive the pressure the gambit generates.", sayShort: 'Bf4 — …Qd6, use the open h-file.' }, sources: STAF,
  },

  // ===== Stafford Gambit (student BLACK) — declined, pawn regained =====
  'pro-ericrosen-stafford::2::d3@8': {
    intro: { say: "d3 — the opponent kicks your active knight and declines the gambit. No need for fireworks now: retreat …Nf6, strike back with …d5, and develop naturally with …Bd6 and …O-O. Having already regained the pawn, you have a sound, comfortable game with easy development and no weaknesses.", sayShort: 'd3 — …Nf6 and …d5, develop easily.' }, sources: STAF_DEV,
  },
  'pro-ericrosen-stafford::2::d4@10': {
    intro: { say: "d4 — the opponent stakes the centre. Simplify with …Nxc3, damaging the queenside pawns, then complete development with …Bd6 and …O-O; you emerge with a healthy structure, active pieces, and a pleasant, balanced middlegame — the gambit having paid for itself in easy equality.", sayShort: 'd4 — …Nxc3, then …Bd6 and …O-O.' }, sources: STAF_DEV,
  },
  'pro-ericrosen-stafford::2::d3@10': {
    intro: { say: "d3 — the opponent challenges your e4-knight. Trade it off with …Nxc3, saddling White with doubled pawns, then develop calmly with …Bd6 and …O-O; the position is comfortable and level, your pieces coming out to their best squares while White nurses the structural weakness.", sayShort: 'd3 — …Nxc3, then …Bd6, develop.' }, sources: STAF_DEV,
  },

  // ===== Stafford / Three Knights (student BLACK) =====
  'pro-ericrosen-stafford::3::d4@6': {
    intro: { say: "d4 — the opponent strikes at your bishop and the e5-pawn at once. Resolve it with …exd4, and after the recapture develop briskly with …O-O, …d6 and …Re8, pressuring the centre; the position is sound and even, and your quick, natural development gives comfortable, active piece play.", sayShort: 'd4 — …exd4, recapture, then develop.' }, sources: STAF_DEV,
  },

  // ===== Budapest Defense (student BLACK) =====
  'pro-ericrosen-budapest::1::Qd2@8': {
    intro: { say: "Qd2 — the opponent tucks the queen away to hold c3. Develop with tempo: …Bb4 ties the knight to its defence, then …Ne4 forks queen and knight, and …Bxc3 shatters White's queenside pawns; your active pieces and the damaged structure give the Budapest exactly the lively counterplay it seeks.", sayShort: 'Qd2 — …Bb4 and …Ne4, then …Bxc3+.' }, sources: BUD,
  },
};
