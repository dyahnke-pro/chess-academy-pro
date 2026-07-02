import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Samay Raina repertoire batch A: Open Sicilian (student
// WHITE), the Sicilian Defence answers (student BLACK), and the 1.e4 e5 open games
// — Ruy Lopez, Scotch, Four Knights (student BLACK). House voice, board-safe,
// line-grounded. Every entry answers the opponent's frequent deviation with the
// student-side plan.

const MAROC = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const OSIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SICB = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SICB_C = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const SCOTCH = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Scotch_Game'];
const FOURK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Four_Knights_Game'];

export const SUBLINE_NARRATION_PRO_SAMAY_A: Record<string, SublineNarration> = {
  // ===== Open Sicilian (student WHITE) — Nc6 lines =====
  'pro-samayraina-open-sicilian::0::g6@7': {
    intro: { say: "g6 — the Accelerated Dragon, inviting a quick fianchetto. Clamp the centre with c4, the Maróczy Bind: the pawns on c4 and e4 take d5 and b5 away from Black, and after Nc3, Be2 and O-O you enjoy a lasting space squeeze. Deny the freeing breaks and press slowly on the queenside.", sayShort: 'g6 — c4 Maroczy Bind, squeeze.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::0::e5@7': {
    intro: { say: "e5 — the Kalashnikov, kicking the knight to grab space at the cost of a hole. Retreat Nb5 eyeing d6, and after …d6 reroute the knights with N1c3 and Na3; the d5-square becomes your permanent prize. Meet …b5 calmly and manoeuvre a knight toward d5 for a durable positional edge.", sayShort: 'e5 — Nb5, then aim knights at d5.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::e6@7': {
    intro: { say: "e6 — a flexible Scheveningen shell. Develop Nc3 and Be3, then Qd2 preparing the English Attack: O-O-O, f3 and g4 storm the kingside while Black is still catching up. Keep an eye on d5 and pour the pawns at the enemy king.", sayShort: 'e6 — Be3 and Qd2, then g4 storm.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::Qb6@7': {
    intro: { say: "Qb6 — the early queen sortie on b6 eyes d4 and b2. Simply retreat Nb3, gaining a tempo by nudging the queen, then Nc3 and Be3 with smooth development. The queen stands awkwardly out on b6, and your lead in space and time gives an easy game.", sayShort: 'Qb6 — Nb3 gains tempo, then Nc3.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::Qc7@7': {
    intro: { say: "Qc7 — Black eyes e5 and readies a quick queenside expansion. Develop Nc3 and Be3, then Qd2 for the English Attack with O-O-O, f3 and g4. You castle long and race the kingside pawns while the d5-square stays firmly under your control.", sayShort: 'Qc7 — Nc3, Be3, Qd2 English Attack.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::e6@9': {
    intro: { say: "e6 — Black steers into a Scheveningen after developing the king's knight. Continue Nc3, then choose your weapon: Be3 and Qd2 for the English Attack, or Be2 and O-O for a classical squeeze. Control d5, finish developing, and use the extra space.", sayShort: 'e6 — Nc3, then Be3 or Be2 setup.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::0::f5@17': {
    intro: { say: "f5 — the thematic Sveshnikov break, freeing Black's game at the cost of the d5-hole. Meet it with exf5 or Bd3, but never lose sight of d5: land a knight there via Nc4 or Ne2-c3-d5 and it dominates the board. The backward d6-pawn and the light squares stay lasting targets.", sayShort: 'f5 — occupy d5, target the d6 pawn.' }, sources: OSIC,
  },

  // ===== Open Sicilian (student WHITE) — e6 / Taimanov lines =====
  'pro-samayraina-open-sicilian::1::a6@7': {
    intro: { say: "a6 — the Kan, a flexible small-centre setup. Develop Bd3 aiming at the kingside, and if …Bc5 pokes at d4 step back with Nb3; then Qg4 pressures g7 and provokes weaknesses. A restrained, space-based edge where Black must play precisely to free the game.", sayShort: 'a6 — Bd3 and Nb3, then Qg4.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::Nf6@7': {
    intro: { say: "Nf6 — heading for a Scheveningen with …d6 to come. Hit it hard with the Keres Attack: Nc3 and g4, gaining space and driving the knight before Black castles. Follow with g5, h4 and a rolling pawn storm while your own king stays flexible.", sayShort: 'Nf6 — Nc3 then g4, Keres storm.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::a6@9': {
    intro: { say: "a6 — a Taimanov setup, keeping options open. Develop Nc3, Be2 and O-O, a calm classical build, then choose Be3 and f4 or a3 and Kh1 depending on Black's plan. Deny the …d5 and …b5 breaks, keep the space, and the position plays itself.", sayShort: 'a6 — Nc3, Be2, O-O, calm build.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::d6@9': {
    intro: { say: "d6 — Black transposes toward a Scheveningen structure. Continue Nc3 and Be3, then Qd2 and the choice between O-O-O with a kingside storm or a quiet Be2 and O-O. Guard d5, finish developing, and let your space advantage do the work.", sayShort: 'd6 — Nc3 and Be3, then Qd2.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::Nf6@9': {
    intro: { say: "Nf6 — the Four Knights, both sides developing symmetrically. Play Nc3, and the sharp Ndb5 eyeing …d6 and the d5-hole is a fine option, or the calm Be2 and O-O if you prefer a slow squeeze. Central control and the extra space favour White.", sayShort: 'Nf6 — Nc3, then Ndb5 or Be2.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::Be7@15': {
    intro: { say: "Be7 — Black completes a solid Bastrikov setup. You are fully developed, so pick a plan: f4 with a kingside expansion, or a4 clamping …b5 and the queenside. Keep control of d5, improve your worst piece, and press the space you own.", sayShort: 'Be7 — choose f4 or a4 expansion.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::Nf6@11': {
    intro: { say: "Nf6 — Black develops before committing the centre. Continue Be3 and O-O, completing your classical setup, then decide between f4 and a kingside build or a4 against …b5. Keep d5 covered and Black struggles to find real counterplay.", sayShort: 'Nf6 — Be3 and O-O, cover d5.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::b5@13': {
    intro: { say: "b5 — Black grabs queenside space early. Meet it soberly with a3 and Bf3, hitting the long diagonal and the b5-pawn, or expand yourself with a4 to fix the weakness. Keep the d5-square under guard; Black's loosened pawns give you targets, not counterplay.", sayShort: 'b5 — a3 and Bf3, target queenside.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::d6@15': {
    intro: { say: "d6 — Black settles into a Scheveningen shell. With Be3 in place, play Qd2 and f4, or f3 preparing g4, expanding on the kingside where you hold the space. Cover d5, keep the pieces coordinated, and turn the space edge into pressure.", sayShort: 'd6 — Qd2 and f4, kingside space.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::1::b5@15': {
    intro: { say: "b5 — Black expands before finishing development. Answer a3 and Bf3, pressuring b5 and the long diagonal, or trade Nxc6 to double the pawns and then Bf3. The queenside advance leaves holes; occupy d5 and press the weakened structure.", sayShort: 'b5 — a3 and Bf3, or Nxc6.' }, sources: OSIC,
  },

  // ===== Open Sicilian (student WHITE) — g6 / Hyperaccelerated lines =====
  'pro-samayraina-open-sicilian::2::O-O@11': {
    intro: { say: "O-O — Black castles into a Dragon-flavoured setup. With Be2 chosen, continue O-O and Be3, then Nb3 and f3, or Qd2, for a calm classical squeeze. Keep the d5 break covered, trade the right pieces, and press your extra central space.", sayShort: 'O-O — O-O and Be3, guard d5.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::Bg7@5': {
    intro: { say: "Bg7 — the Pterodactyl, delaying the cxd4 capture to fianchetto first. Exploit the move order with dxc5, and after Qa5+ block with c3; Black regains the pawn with Qxc5, but Na3 then develops with tempo toward b5 and c4. You keep a broad centre and a comfortable lead in development.", sayShort: 'Bg7 — dxc5 and c3, then Na3.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::Nc6@7': {
    intro: { say: "Nc6 — Black develops and heads for a Dragon. Clamp with c4, the Maróczy Bind: the pawns on c4 and e4 smother the …d5 and …b5 breaks. Follow with Nc3, Be2 and Be3, and squeeze slowly; Black's fianchetto looks pretty but has little to bite on.", sayShort: 'Nc6 — c4 Maroczy Bind, then Nc3.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::2::Bg7@7': {
    intro: { say: "Bg7 — the fianchetto first, still steering into a Maróczy. Grab the bind with c4, then Be3 and Nc3 for the classic clamp; if Black tries Ng4, tuck the bishop to d2 or trade on d4. Keep the c4-e4 wall intact and squeeze the space Black cannot break.", sayShort: 'Bg7 — c4 bind, then Be3 and Nc3.' }, sources: MAROC,
  },
  'pro-samayraina-open-sicilian::2::d6@11': {
    intro: { say: "d6 — Black sets up a classical Dragon shell. With Be2 chosen, castle O-O, then Be3, Nb3 and f3 for a patient positional squeeze. Guard the d5 break, improve your pieces, and let the space advantage tell over a long middlegame.", sayShort: 'd6 — O-O and Be3, patient squeeze.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::d6@9': {
    intro: { say: "d6 — a straight Dragon setup. Develop Be3, then choose your system: Be2, O-O and f3 for a calm build, or Qd2 and O-O-O for the Yugoslav Attack. Cover d5, coordinate your pieces, and steer the middlegame toward your extra space.", sayShort: 'd6 — Be3, then Be2 or Qd2.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::Nc6@9': {
    intro: { say: "Nc6 — Black adds a second knight, offering a trade on d4. Keep it simple with Be3 and Be2, or clamp with c4 if you prefer the bind; either way finish development and hold the d5-square. The Sicilian space edge is yours to convert with patience.", sayShort: 'Nc6 — Be3 and Be2, hold d5.' }, sources: OSIC,
  },
  'pro-samayraina-open-sicilian::2::d6@13': {
    intro: { say: "d6 — Black completes the Dragon structure. With Be3 in place, castle O-O, then Nb3 and f3, keeping a compact classical setup. Watch the d5 break, trade only when it helps your grip, and press the extra central space you have held from move one.", sayShort: 'd6 — O-O, Nb3 and f3, squeeze.' }, sources: OSIC,
  },

  // ===== Sicilian Defence (student BLACK) — Bowdler Attack (2.Bc4) =====
  'pro-samayraina-sicilian-black::0::Qe2+@8': {
    intro: { say: "Qe2+ — a nagging check to disrupt your development. Block with …Be7, a natural developing move, and after Bb5+ interpose …Bd7 offering a trade. The checks lead nowhere: you finish with …Nf6, …O-O and …Nc6, and the healthy centre and free pieces leave Black comfortable.", sayShort: 'Qe2+ — …Be7, then …Bd7 blocks.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Bb3@8': {
    intro: { say: "Bb3 — the bishop drops back to keep pressure on d5. Guard the pawn naturally with …Nf6, then …Be7 and …O-O, and support the centre with …Nc6 or …c6. Your pieces develop with ease; the open position suits Black once the king is safe.", sayShort: 'Bb3 — …Nf6 and …Be7, guard d5.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Qe2@14': {
    intro: { say: "Qe2 — piling up on the e-file against your king. Unpin at once with …O-O, tucking the king to safety, then develop …Bg4 or …Be6 and contest the file with …Re8. The pressure evaporates once you castle, and Black stands solidly with active pieces.", sayShort: 'Qe2 — …O-O unpins, then contest e-file.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::d4@14': {
    intro: { say: "d4 — White strikes the centre to open lines against your king. Castle …O-O immediately to get safe, then meet the tension with …cxd4, regaining piece activity. With the king tucked away, Black's sound structure and free development hold the balance easily.", sayShort: 'd4 — …O-O first, then …cxd4.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Ne5@14': {
    intro: { say: "Ne5 — the knight leaps to a central outpost, eyeing c6 and f7. Do not panic: …O-O gets the king safe, then …Bd7 or …Qb6 challenges the intruder while defending. Trade it off if it lingers, and Black's healthy centre and active pieces keep full equality.", sayShort: 'Ne5 — …O-O, then …Bd7 challenges it.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::d4@12': {
    intro: { say: "d4 — an early central break hitting your c5-pawn. Complete development with …Be7 and …O-O before resolving it, or take with …cxd4 to keep the extra centre pawn. Either way, castle quickly; a safe king turns White's activity into thin air.", sayShort: 'd4 — …Be7 and …O-O, then …cxd4.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::d4@10': {
    intro: { say: "d4 — White breaks in the centre before castling. Develop …Nf6, hitting nothing loose and preparing …Be7 and …O-O, and only then release the tension with …cxd4. Do not chase pawns early; sound development leaves Black with an easy, balanced middlegame.", sayShort: 'd4 — …Nf6, then …Be7 and …O-O.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Qe2+@10': {
    intro: { say: "Qe2+ — another disruptive check. Interpose …Be7, a developing block, then castle …O-O and unpin the position at your leisure. White's queen sortie gains nothing lasting; Black continues …Nf6 and …Bd7 with a comfortable open game.", sayShort: 'Qe2+ — …Be7 blocks, then …O-O.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::0::Bxc6+@10': {
    intro: { say: "Bxc6+ — White trades to inflict doubled pawns. Recapture …bxc6, and welcome it: you gain the bishop pair and a broad pawn centre, with the half-open b-file for your rooks. Develop …Nf6, …Bd6 and …O-O; the two bishops outweigh the small structural cost.", sayShort: 'Bxc6+ — …bxc6, bishop pair and centre.' }, sources: SICB,
  },

  // ===== Sicilian Defence (student BLACK) — Alapin (2.c3) =====
  'pro-samayraina-sicilian-black::1::h3@12': {
    intro: { say: "h3 — White questions your pinning bishop. Retreat …Bh5 keeping the pin, and if g4 follows, …Bg6 stays active; or simplify with …Bxf3 and …Be7, …O-O. Black targets the slightly loose d4-pawn with …Nc6 and …cxd4, and the free development gives full equality.", sayShort: 'h3 — …Bh5 keeps pin, then …Nc6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Nf3@6': {
    intro: { say: "Nf3 — a natural developing move in the Alapin. Continue …Nf6, then …e6 and …Nc6, hitting the d4-pawn and completing development smoothly. Follow with …Be7 and …O-O; Black's harmonious setup and pressure on d4 give an easy, equal game.", sayShort: 'Nf3 — …Nf6, then …e6 and …Nc6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the centre and grabs a pawn. Regain it immediately with …Qxc5, and the queen sits well eyeing c2 and the queenside. Follow with …Nc6, …e6 and long-castle ideas; Black develops fast and the level material leaves a comfortable game.", sayShort: 'dxc5 — …Qxc5 regains, then develop.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Nbd2@10': {
    intro: { say: "Nbd2 — White develops the knight and eyes c4 and e4. Keep building: …Nc6 and …e6, then …cxd4 opening the position while the pin on f3 nags. Add …Be7 and …O-O, and Black's active pieces and pressure on d4 hold easy equality.", sayShort: 'Nbd2 — …Nc6 and …e6, then …cxd4.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Qa4+@10': {
    intro: { say: "Qa4+ — a check that also hits your bishop. Block with …Bd7, chasing the queen and gaining time, and after Qb3 strike with …cxd4. The queen sortie costs White tempo, and Black completes development with …Nc6 and …e6 for a comfortable, balanced position.", sayShort: 'Qa4+ — …Bd7 gains time, then …cxd4.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Na3@12': {
    intro: { say: "Na3 — the knight heads for c4 or b5 the long way. Ignore the detour: …Nc6 and …cxd4 open the centre, then …Be7 and …O-O finish the job. With White's knight offside on a3, Black's smooth development and central pressure give the better-coordinated game.", sayShort: 'Na3 — …Nc6 and …cxd4, then …Be7.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Be3@12': {
    intro: { say: "Be3 — White reinforces the d4-pawn. Pressure it anyway: …Nc6 and …Be7, then …O-O and …Rd8 piling on the d-file, or trade with …cxd4. Keep the f3-knight pinned; Black's active pieces and clear plan against d4 make for an easy, equal middlegame.", sayShort: 'Be3 — …Nc6 and …Be7, pressure d4.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::1::Be3@14': {
    intro: { say: "Be3 — White shores up d4 after both sides develop. Castle …O-O, then …Nc6 and …Rd8, training your rook on the d-file and the d4-pawn. Consider …Bxf3 to damage the structure if it helps; Black's harmonious setup keeps the game comfortably level.", sayShort: 'Be3 — …O-O and …Nc6, then …Rd8.' }, sources: SICB,
  },

  // ===== Sicilian Defence (student BLACK) — Rossolimo, 3...Nd4 lines =====
  'pro-samayraina-sicilian-black::2::d3@10': {
    intro: { say: "d3 — White supports e4 and prepares a slow build with c3 and f4. The natural …Bc5 develops with gain of space, but it can over-reach; the accurate move is …d6 first, cementing the e5-pawn before the bishop comes out. Then …Ne7-g6, …Bc5 and …O-O give Black a comfortable, well-anchored centre.", sayShort: 'd3 — …d6 first, then …Ne7 and …Bc5.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::f4@10': {
    intro: { say: "f4 — White challenges your e5-pawn at once. Support it with …d6, and if fxe5 dxe5 the open f-file cuts both ways while your protected d4-pawn cramps White. Develop …Ne7-g6 and …Bc5; Black's big centre and the advanced d4-pawn give a pleasant, active game.", sayShort: 'f4 — …d6 supports e5, then …Ne7.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::Bc4@10': {
    intro: { say: "Bc4 — the bishop swings toward f7. Blunt it with …Nf6 developing, then …d6 and …Be7 to complete a solid shell around the king. Your advanced d4-pawn keeps White cramped; once you castle, the extra centre space and safe king favour Black.", sayShort: 'Bc4 — …Nf6 and …d6, then …Be7.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::Re1@10': {
    intro: { say: "Re1 — White adds a rook to the e-file, eyeing e5. Prop the pawn with …d6, then develop …Ne7-g6, …Bc5 and …O-O, keeping the chain intact. The far-advanced d4-pawn is a thorn in White's position; Black completes development and stands at least equal.", sayShort: 'Re1 — …d6 props e5, then …Ne7.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::b4@12': {
    intro: { say: "b4 — White gains queenside space and hits your bishop. Retreat …Bb6, keeping an eye on the centre, and after cxd4 recapture …exd4, leaving a protected pawn on d4 that cramps White. Follow with …Ne7, …d6 and …O-O; the advanced pawn and active bishop promise a comfortable game.", sayShort: 'b4 — …Bb6, then …exd4 keeps pawn.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::d3@12': {
    intro: { say: "d3 — White reinforces the centre and prepares to chip at d4. Hold firmly with …d6, guarding e5, then …Ne7-g6 and …O-O to finish developing. Meet cxd4 with …Bxd4 or …exd4 as suits you; the cramping d4-pawn and your smooth development keep Black at least equal.", sayShort: 'd3 — …d6 holds, then …Ne7 and …O-O.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::Qg4@12': {
    intro: { say: "Qg4 — a sortie hitting g7. Defend calmly with …Qf6, guarding the pawn and eyeing f2 and the centre, or …g6 blunting the queen. Do not weaken hastily; once you consolidate with …Ne7 and …d6, the exposed queen and your strong d4-pawn hand Black the initiative.", sayShort: 'Qg4 — …Qf6 guards g7, stay solid.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::Kh1@12': {
    intro: { say: "Kh1 — a quiet king-tuck, often preparing f4. Carry on developing: …d6 supporting e5, then …Ne7-g6 and …O-O with a compact centre. If f4 comes, …exf4 or …Ng6 holds the line; Black's advanced d4-pawn and harmonious pieces give an easy, balanced game.", sayShort: 'Kh1 — …d6 and …Ne7, keep centre.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::a4@12': {
    intro: { say: "a4 — White grabs queenside space and eyes a5 to hit your bishop. Blunt it with …a5, fixing the pawns, or simply …d6 and …Ne7 continuing your plan. Keep the d4-pawn cramping White; Black's central grip and calm development leave nothing to fear on the wing.", sayShort: 'a4 — …a5 fixes it, then …d6.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::2::d3@14': {
    intro: { say: "d3 — White braces the centre after the trade on d4. Your bishop already dominates from d4; support it and the e5-pawn with …d6, then …Ne7-g6 and …O-O. Watch for Be3 challenging the bishop — meet it by keeping the tension; Black's active setup gives comfortable equality.", sayShort: 'd3 — …d6 supports centre, then …Ne7.' }, sources: SICB_C,
  },

  // ===== Sicilian Defence (student BLACK) — Closed, Grand Prix, 2.Nc3 lines =====
  'pro-samayraina-sicilian-black::3::g3@4': {
    intro: { say: "g3 — the Closed Sicilian, White fianchettoing to press the long diagonal. Mirror the setup: …g6 and …Bg7, then …d6, …e6 and …Nge7, keeping the structure flexible. Aim for the …b5 and …d5 breaks in time; Black gets a sound middlegame with chances on both wings.", sayShort: 'g3 — …g6 and …Bg7, mirror setup.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Bb5@4': {
    intro: { say: "Bb5 — White pins and eyes a trade on c6. Sidestep with …Nd4, planting the knight in the centre and gaining a tempo on the bishop, then …e6 and …Nf6 developing naturally. The active …Nd4 gives Black an easy, comfortable game with no structural concessions.", sayShort: 'Bb5 — …Nd4 centralizes, then …e6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Bc4@12': {
    intro: { say: "Bc4 — the bishop targets f7 and e6. Strike back with …d5, hitting it and claiming the centre; the bishop retreats and you stand with a broad c6-d5-e6 pawn front. Develop …Nf6, …Bd6 and …O-O; the strong centre and active pieces give Black a comfortable, promising middlegame.", sayShort: 'Bc4 — …d5 hits it, claims centre.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::3::f4@4': {
    intro: { say: "f4 — the Grand Prix Attack, White aiming for a kingside pawn storm. Fianchetto for defence and counterplay: …g6 and …Bg7, then …d6, …e6 and …Nge7, avoiding the pin on the c6-knight. Break with …d5 or …b5; the …e6 and …Nge7 setup takes the sting out of the attack.", sayShort: 'f4 — …g6 and …Bg7, then …e6.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Be2@12': {
    intro: { say: "Be2 — a modest developing move in this open Sicilian. Continue …Ne7, heading for g6 or f5, then …d5 striking with your c6-d5-e6 pawn front. Add …Bd6 and …O-O; the mobile centre and active bishops give Black a comfortable, promising game.", sayShort: 'Be2 — …Ne7, then …d5 hits centre.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::3::Nge2@4': {
    intro: { say: "Nge2 — the Chameleon, keeping White's setup flexible. Develop naturally: …Nf6 and …d5, challenging the centre at once, or …g6 and …Bg7 for a Closed structure. With White's knight passive on e2, the immediate …d5 break gives Black a comfortable share of the centre.", sayShort: 'Nge2 — …Nf6, then …d5 break.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::O-O@14': {
    intro: { say: "O-O — White castles in this open structure. You already hold the centre with …d5; complete the job with …Nf6, …Bd6 and …O-O, then contest the e-file with …Re8. The mobile c6-d5 pawns and your active bishops let Black play for the initiative, not just equality.", sayShort: 'O-O — …Nf6 and …Bd6, then …O-O.' }, sources: SICB_C,
  },
  'pro-samayraina-sicilian-black::3::Qg4@12': {
    intro: { say: "Qg4 — an early queen raid on g7. Defend with …Qf6, guarding the pawn and offering to contest the centre, then …d5 and …Bd6 with smooth development. The queen must lose time retreating; Black's central pawns and quick development seize the initiative.", sayShort: 'Qg4 — …Qf6 guards g7, then …d5.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::Be3@12': {
    intro: { say: "Be3 — White offers to trade your active bishop. Accept with …Bxe3, and after fxe3 White is left with doubled, damaged kingside pawns. Build with …d5, …Ne7 and …O-O; Black's sound centre against White's ragged structure gives the more comfortable game.", sayShort: 'Be3 — …Bxe3 doubles White pawns.' }, sources: SICB,
  },
  'pro-samayraina-sicilian-black::3::e5@12': {
    intro: { say: "e5 — White grabs kingside space, but the pawn can become a target. Reroute with …Ne7, heading for f5 or g6 to press e5, then …d6 undermining it. Develop the bishops and castle; the pressure on the advanced e5-pawn gives Black an active, comfortable game.", sayShort: 'e5 — …Ne7, then …d6 undermines it.' }, sources: SICB,
  },

  // ===== 1.e4 e5 open games (student BLACK) — Ruy Lopez, Closed =====
  'pro-samayraina-open-e5::0::d3@8': {
    intro: { say: "d3 — the quiet Anderssen, White supporting e4 without committing. Play …b5 to nudge the bishop back, then …Bc5 or …Be7 and …d6, a comfortable classical Ruy setup. Complete with …O-O and …Na5 or …Re8; Black gets the well-mapped, solid game the Closed Ruy promises.", sayShort: 'd3 — …b5, then …Bc5 and …d6.' }, sources: RUY,
  },
  'pro-samayraina-open-e5::0::d3@10': {
    intro: { say: "d3 — the Martinez, a slow set-up keeping the tension. Continue …b5 hitting the bishop, then …d6 and …O-O, reaching a solid Closed Ruy. Manoeuvre with …Na5, …c5 and …Nc6, striking at d4 in time; Black has a sound, flexible position with clear plans.", sayShort: 'd3 — …b5 and …d6, then …O-O.' }, sources: RUY,
  },
  'pro-samayraina-open-e5::0::Bxc6@10': {
    intro: { say: "Bxc6 — the Delayed Exchange, giving up the bishop for structure. Recapture …dxc6, opening the d-file and freeing your light bishop; the doubled c-pawns are offset by the two bishops and quick development. Play …Bd6, …Nd7-f8-g6 or …f6 with …Bg4; Black is comfortable and active.", sayShort: 'Bxc6 — …dxc6, bishop pair and open file.' }, sources: RUY,
  },
  'pro-samayraina-open-e5::0::a4@14': {
    intro: { say: "a4 — White probes the queenside, hitting your b5-pawn. Hold it with …b4, gaining space and shutting the c3-square, or defend with …Rb8 and …Bd7. Then continue …O-O and …Na5 hitting the bishop; Black keeps the solid Closed-Ruy structure with easy piece play.", sayShort: 'a4 — …b4 gains space, then …O-O.' }, sources: RUY,
  },

  // ===== 1.e4 e5 open games (student BLACK) — Scotch =====
  'pro-samayraina-open-e5::1::Nxc6@8': {
    intro: { say: "Nxc6 — the Mieses main line, White trading and pushing e5. Recapture …bxc6, and when e5 hits the knight, play …Qe7 pinning the pawn, then …Nd5 centralising. Continue …Ba6 and …g6 with …Bg7; the solid pawn mass and active pieces give Black a comfortable, well-tested game.", sayShort: 'Nxc6 — …bxc6, then …Qe7 and …Nd5.' }, sources: SCOTCH,
  },
  'pro-samayraina-open-e5::1::Bc4@6': {
    intro: { say: "Bc4 — the Scotch Gambit, White sacrificing the d4-pawn for quick development against f7. Grab it and hold on soundly: …Nf6 hitting e4, then …Bc5 or …Bb4+ and …d6 to blunt the attack, or the sharp …Nxe4 line. Return the pawn if needed for development; Black equalises with careful, active play.", sayShort: 'Bc4 — …Nf6 hits e4, then …Bc5.' }, sources: SCOTCH,
  },
  'pro-samayraina-open-e5::1::c3@6': {
    intro: { say: "c3 — the Göring Gambit, offering a second pawn. Decline cleanly with …d5, hitting e4 and freeing your game; after exd5 …Qxd5 the centre opens in your favour, and cxd4 …Bg4 pins the knight with pressure on d4. Black develops fast and comfortably, sidestepping all the gambit tricks.", sayShort: 'c3 — …d5 declines, then …Qxd5 and …Bg4.' }, sources: SCOTCH,
  },

  // ===== 1.e4 e5 open games (student BLACK) — Four Knights =====
  'pro-samayraina-open-e5::2::d4@6': {
    intro: { say: "d4 — the Scotch Four Knights, striking the centre. Take with …exd4, and after Nxd4 play …Bb4 pinning the c3-knight, then …O-O and …Re8 with pressure on e4. Black develops actively and hits back at the centre; the well-known lines give full, comfortable equality.", sayShort: 'd4 — …exd4, then …Bb4 pins knight.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::g3@6': {
    intro: { say: "g3 — the Glek System, White fianchettoing against your e5-centre. Fight back in the middle with …d5, and after exd5 …Nxd5 you free your game and trade into comfortable equality; or keep tension with …Bc5 and …d6, …a6 and …O-O. Black gets an active, balanced game either way.", sayShort: 'g3 — …d5 strikes centre, then …Nxd5.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::a3@6': {
    intro: { say: "a3 — the Gunsberg, a slow waiting move that spends a tempo. Punish it with …d5 at once, striking the centre while White is a move behind; after exd5 …Nxd5 your pieces flow to active squares. Continue …Bc5 or …Bd6 and …O-O; Black seizes the more comfortable game.", sayShort: 'a3 — …d5 punishes the slow move.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::Bxc6@10': {
    intro: { say: "Bxc6 — White breaks the symmetry, trading on c6. Recapture …dxc6, opening the d-file for the queen and keeping a compact centre; the bishop pair offsets the doubled pawns. Follow with …Re8, …Bd6 and …Nd7-f8-g6, and Black enjoys an active, healthy middlegame.", sayShort: 'Bxc6 — …dxc6, bishop pair, open d-file.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::Ne2@12': {
    intro: { say: "Ne2 — White reroutes the knight toward g3 in the symmetrical Double Ruy. Mirror with …Ne7 heading to g6, then prepare …c6 and …d5, striking the centre to grab the initiative. Retreat the b4-bishop to a5 or d6 when nudged; Black is comfortable and a step ahead in the …d5 race.", sayShort: 'Ne2 — …Ne7 to g6, then …d5.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::d3@8': {
    intro: { say: "d3 — the quiet Double Spanish, White keeping a symmetrical setup. Copy it with …d6, then …O-O, and later …Bxc3 and …Ne7-g6 or …a6 nudging the bishop. Keep the balance and look for the …d5 break; Black equalises comfortably and can outplay from a sound structure.", sayShort: 'd3 — …d6, then …O-O and …d5.' }, sources: FOURK,
  },
  'pro-samayraina-open-e5::2::Bxc6@12': {
    intro: { say: "Bxc6 — White trades to unbalance the symmetrical structure. Recapture …bxc6, reinforcing d5 and opening the b-file for your rook; the bishop pair is fair compensation for the doubled pawns. Continue …Re8, …Bg4 and …Nd7-f8-g6, and Black plays for the two-bishop edge in a healthy middlegame.", sayShort: 'Bxc6 — …bxc6, bishop pair and b-file.' }, sources: FOURK,
  },
};
