import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Eric Rosen: London + Closed Sicilian (WHITE);
// Stafford/Taimanov Sicilian/QGD/Budapest/Scandinavian/French (BLACK).
// Transcript-grounded, house voice, board-safe. Teach-both where the natural
// move drifts (Stafford …Qe7, Scandinavian …Bxf3).

const LO = ['concept:pos-development', 'https://www.chess.com/openings/London-System'];
const CS = ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'];
const ST = ['concept:pos-development', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit'];
const SI = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const QG = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const BU = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];
const SC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];

export const SUBLINE_NARRATION_PRO_ROSEN: Record<string, SublineNarration> = {
  // ===== London (White) =====
  'pro-ericrosen-london::0::Qb6@9': {
    intro: { say: "Qb6 — Black hits b2 and d4 in the London. Defend simply with Rb1 or Qc1, keeping your solid structure; the b2-pawn is safe and your setup with the f4-bishop and the e5-outpost gives a pleasant, easy game. Don't panic — develop.", sayShort: 'Qb6 — Rb1 or Qc1, stay solid.' }, sources: LO,
  },
  'pro-ericrosen-london::0::e6@9': {
    intro: { say: "e6 — Black plays solidly. Continue the London plan: c3, Bd3, Ne5 and a kingside build; your f4-bishop and the strong e5-knight give a comfortable, low-risk game with easy plans.", sayShort: 'e6 — c3, Bd3, then Ne5.' }, sources: LO,
  },
  'pro-ericrosen-london::0::Bg4@9': {
    intro: { say: "Bg4 — Black pins your knight. Play h3 and either Be2 or accept the trade; keep your London structure and the f4-bishop, and continue Ne5 and the kingside build. The pin is a minor nuisance.", sayShort: 'Bg4 — h3, keep the London setup.' }, sources: LO,
  },
  'pro-ericrosen-london::0::Qb6@11': {
    intro: { say: "Qb6 — Black targets b2 and d4 after the trade. Defend with Rb1 or Qc1; your solid structure and the f4-bishop give a pleasant edge. Develop and press the e5-outpost.", sayShort: 'Qb6 — Rb1, keep pressing e5.' }, sources: LO,
  },
  'pro-ericrosen-london::1::c5@7': {
    intro: { say: "c5 — Black strikes the centre in the e6 London. Support with c3, develop Nbd2 and Bd3, and aim for the Ne5 outpost; your solid setup and the f4-bishop give a comfortable, pressing game.", sayShort: 'c5 — c3 and Nbd2, aim for Ne5.' }, sources: LO,
  },
  'pro-ericrosen-london::1::c5@5': {
    intro: { say: "c5 — Black hits the centre early. Support with c3, develop Nd2, Ngf3 and Bd3, and build toward Ne5; the London's solid structure and active bishop give an easy, comfortable game.", sayShort: 'c5 — c3 and Nd2, build to Ne5.' }, sources: LO,
  },
  'pro-ericrosen-london::1::b6@5': {
    intro: { say: "b6 — Black fianchettos the queen-bishop. Develop Nf3 and Bd3, then the London plan with Ne5 and h4; your active setup gives a pleasant game against the hypermodern try.", sayShort: 'b6 — develop, then Ne5 and h4.' }, sources: LO,
  },
  'pro-ericrosen-london::2::b5@11': {
    intro: { say: "b5 — Black expands on the queenside. Reroute the knight Nc4-d2, keep your solid structure, and develop toward the centre; your London setup handles the flank play and the f4-bishop stays strong.", sayShort: 'b5 — reroute Nc4-d2, stay solid.' }, sources: LO,
  },
  'pro-ericrosen-london::3::Nbd7@5': {
    intro: { say: "Nbd7 — Black develops in the aggressive e4 London hybrid. Build the big centre with e4, then Qd2, Bd3 and the kingside attack; your active setup and space give strong chances. Grab the centre and attack.", sayShort: 'Nbd7 — e4, then Qd2 and attack.' }, sources: LO,
  },
  'pro-ericrosen-london::3::c6@7': {
    intro: { say: "c6 — Black plays a Pirc-style setup against your e4 London. Build the attack: Qd2, Bd3, O-O-O and the h4-h5 storm; you have a big centre and the f4-bishop, and Black's setup invites a direct kingside assault.", sayShort: 'c6 — Qd2 and Bd3, then h4 storm.' }, sources: LO,
  },
  'pro-ericrosen-london::3::c6@9': {
    intro: { say: "c6 — Black fianchettos in the e4 London. This is the attacking hybrid: Qd2, Bh6 to trade the g7-bishop, O-O-O and the h-pawn storm. Strip the king's defender and attack.", sayShort: 'c6 — Bh6, castle long, storm.' }, sources: LO,
  },
  'pro-ericrosen-london::3::Nc6@9': {
    intro: { say: "Nc6 — Black develops in the e4 London hybrid. Continue Qd2, O-O-O and the h4-h5 storm; your big centre and the f4-bishop support a direct kingside attack. Go for the throat.", sayShort: 'Nc6 — Qd2, castle long, h4.' }, sources: LO,
  },
  // ===== Closed Sicilian (White) =====
  'pro-ericrosen-closed-sicilian::0::a6@5': {
    intro: { say: "a6 — Black prepares queenside expansion. Continue Nf3 and g3 with Bg2, or Bb5; complete your Grand-Prix setup and roll the f4-f5 kingside storm. Your attacking blueprint gives dangerous chances.", sayShort: 'a6 — g3 and Bg2, then f5.' }, sources: CS,
  },
  'pro-ericrosen-closed-sicilian::0::dxe4@7': {
    intro: { say: "dxe4 — Black opens the centre in the …e6 Closed. Recapture Nxe4, develop Bb5 pinning, and prepare Ne5 and f5; your active pieces and the kingside pressure give a pleasant, aggressive game.", sayShort: 'dxe4 — Nxe4, then Bb5 and f5.' }, sources: CS,
  },
  'pro-ericrosen-closed-sicilian::1::Bg7@5': {
    intro: { say: "Bg7 — Black fianchettos against your open d4 Closed. Play dxc5 and Bd2, disrupting Black's coordination; the Nd5 jump and your lead in development give a clear, pleasant edge. Punish the loose move-order.", sayShort: 'Bg7 — dxc5 and Nd5, seize the edge.' }, sources: CS,
  },
  'pro-ericrosen-closed-sicilian::1::Nc6@9': {
    intro: { say: "Nc6 — Black develops after the early d4. Continue Bb5 pinning and Bd2, keeping your development lead; the resulting open position with your active pieces gives a comfortable game. Press the initiative.", sayShort: 'Nc6 — Bb5 and Bd2, press.' }, sources: CS,
  },
  // ===== Stafford (Black) =====
  'pro-ericrosen-stafford::0::h3@12': {
    intro: { say: "h3 — White stops your …Ng4 tricks in the Stafford. Keep the initiative: develop with …Bg4 or …Qe7 and …O-O-O, throwing pieces at White's king. You are down a pawn for activity — keep every piece pointed at f2 and the king.", sayShort: 'h3 — keep the initiative, aim at f2.' }, sources: ST,
  },
  'pro-ericrosen-stafford::0::Qe2@16': {
    intro: { say: "Qe2 — White defends in the Stafford. The natural move drifts; the accurate move is …Qe7, keeping the pressure on e4 and the initiative alive. Play …Qe7, eyeing the kingside — in the gambit, activity is everything and Qe7 preserves it.", sayShort: 'Qe2 — keep initiative with …Qe7.' }, sources: ST,
  },
  'pro-ericrosen-stafford::2::d4@8': {
    intro: { say: "d4 — White grabs the centre in the knight-retreat line. Continue …d5 supporting your e4-knight, then …Bd6, …O-O and develop; you have regained the pawn and reach an active, comfortable game with the strong central knight.", sayShort: 'd4 — …d5 supports the knight, develop.' }, sources: ST,
  },
  // ===== Sicilian Taimanov (Black) =====
  'pro-ericrosen-sicilian::0::Be2@10': {
    intro: { say: "Be2 — a solid Taimanov main line. Continue …a6, …Nf6, …Be7 and …O-O, then the flexible …b5 or …Ne5 plans; the Taimanov's elastic structure gives Black an easy, resourceful game.", sayShort: 'Be2 — …a6 and …Nf6, stay flexible.' }, sources: SI,
  },
  'pro-ericrosen-sicilian::0::Nb5@8': {
    intro: { say: "Nb5 — White heads for the Maroczy Bind with c4. Play …d6, …Nf6, …Be7 and …O-O, and prepare …a6, …Rb8 and the …b5 break; the bind is solid, but Black has clear, resourceful plans.", sayShort: 'Nb5 — …d6 and …Nf6, prepare …b5.' }, sources: SI,
  },
  'pro-ericrosen-sicilian::0::g3@10': {
    intro: { say: "g3 — White fianchettos against your Taimanov. Continue …a6, …Nf6, …Be7 and …O-O, then …b5 and …Bb7 to contest the long diagonal; a balanced, comfortable game where Black is fully equal.", sayShort: 'g3 — …a6 and …b5, contest the diagonal.' }, sources: SI,
  },
  'pro-ericrosen-sicilian::2::Be2@10': {
    intro: { say: "Be2 — White plays the Alapin. You have already equalised: …d5 freed the game, so continue …Nc6, …Be7, …O-O and press the isolated or hanging pawns. Active, comfortable, and easy to play.", sayShort: 'Be2 — …Nc6 and …Be7, press.' }, sources: SI,
  },
  'pro-ericrosen-sicilian::3::g3@4': {
    intro: { say: "g3 — White plays a King's-Indian-Attack setup against your 2.Nc3 Sicilian. Strike with …d5, and after the exchange your central pawn and easy development give a comfortable game; play …Nf6, …Be7 and castle.", sayShort: 'g3 — …d5, then develop freely.' }, sources: SI,
  },
  // ===== QGD (Black) =====
  'pro-ericrosen-qgd::0::Qa4+@8': {
    intro: { say: "Qa4-check — White regains the gambit pawn in the Catalan. Block with …Nbd7, then …a6 and …b5 or …Be7 and …O-O; you develop smoothly and the pawn comes back with an equal, comfortable game.", sayShort: 'Qa4+ — …Nbd7, then …a6 and …b5.' }, sources: QG,
  },
  'pro-ericrosen-qgd::1::cxd5@12': {
    intro: { say: "cxd5 — White clarifies in the Cambridge Springs. Recapture …exd5 or …Nxd5, keeping your solid QGD structure; continue …Bd6, …O-O and the …c5 or …Ne4 breaks. Rock-solid and resourceful.", sayShort: 'cxd5 — recapture, stay solid.' }, sources: QG,
  },
  'pro-ericrosen-qgd::1::cxd5@10': {
    intro: { say: "cxd5 — White exchanges in the Cambridge Springs. Recapture and continue your solid setup with …Bd6 and …O-O; the QGD's structure holds firm and you aim for the freeing …c5 or …e5 breaks.", sayShort: 'cxd5 — recapture, then …c5.' }, sources: QG,
  },
  // ===== Budapest (Black) =====
  'pro-ericrosen-budapest::0::Be2@12': {
    intro: { say: "Be2 — White develops quietly in the Budapest. Your knights are active on e5 and the bishop rakes toward f2; continue …O-O, …Re8 and …d6, generating the tricky piece-play the Budapest is famous for. Stay active.", sayShort: 'Be2 — …O-O and …Re8, stay active.' }, sources: BU,
  },
  'pro-ericrosen-budapest::1::Bd2@10': {
    intro: { say: "Bd2 — White develops in the declined Budapest. Continue …Bxc3 doubling White's pawns, or …O-O and …Re8; your active pieces and the damaged White structure give real counterplay for the pawn.", sayShort: 'Bd2 — …Bxc3 doubles, stay active.' }, sources: BU,
  },
  // ===== Scandinavian (Black) =====
  'pro-ericrosen-scandinavian::0::Bc4@6': {
    intro: { say: "Bc4 — White develops actively in the …Nxd5 Scandinavian. Retreat …Nb6 hitting the bishop, then …Nc6, …g6 and …Bg7; your solid setup and easy development give a comfortable game where you never landed the exposed queen.", sayShort: 'Bc4 — …Nb6, then fianchetto.' }, sources: SC,
  },
  'pro-ericrosen-scandinavian::0::d3@12': {
    intro: { say: "d3 — White plays solidly after the fianchetto. Continue …O-O, …Nc6 and …Bg4 or …e5, pressuring the centre; your fianchetto bishop and easy development give a sound, active Scandinavian.", sayShort: 'd3 — …O-O and …Nc6, press.' }, sources: SC,
  },
  'pro-ericrosen-scandinavian::1::h3@8': {
    intro: { say: "h3 — White questions your bishop in the …Nf6 Scandinavian. The natural retreat drifts; the accurate move is …Bxf3, trading before White gains time, then …e6, …Be7 and …O-O for a comfortable game. Trade first, then develop.", sayShort: 'h3 — …Bxf3, then develop.' }, sources: SC,
  },
  // ===== French (Black) =====
  'pro-ericrosen-french::1::c3@8': {
    intro: { say: "c3 — the Tarrasch main line. Continue …Nc6 and …Qb6 pressuring d4, then …cxd4 and …f6 to break the e5-wedge; the Tarrasch French gives Black a thematic siege of d4 with active pieces.", sayShort: 'c3 — …Nc6 and …Qb6, besiege d4.' }, sources: FR,
  },
  'pro-ericrosen-french::1::f4@8': {
    intro: { say: "f4 — White reinforces the e5-wedge in the Tarrasch. Continue …Nc6, …Qb6 and …cxd4, then …Nh6-f5 and …f6, chipping at the centre; the Tarrasch's counterplay against d4 and e5 is fast and real.", sayShort: 'f4 — …Nc6 and …cxd4, hit the centre.' }, sources: FR,
  },
  'pro-ericrosen-french::2::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetrical and dry. Mirror with …Bd6 and …Ne7, castle, and play for the …c5 or …Bg4 breaks; the position is balanced, and you outplay an inaccurate opponent from equality.", sayShort: 'Bd3 — …Bd6 and …Ne7, then …c5.' }, sources: FR,
  },
  'pro-ericrosen-french::2::Qe2+@10': {
    intro: { say: "Qe2-check — a tricky Exchange try. Block with …Be7 or …Qe7, trade queens or untangle with …O-O; your symmetrical structure is perfectly sound, and you develop to equality with no trouble.", sayShort: 'Qe2+ — block, trade, develop.' }, sources: FR,
  },
  'pro-ericrosen-french::0::Bd3@10': {
    intro: { say: "Bd3 — White develops in the Advance French. Continue …cxd4 and …Nge7-f5 or …Bd7 and …a5, besieging the d4-base; the Advance French is a siege of d4, and every piece joins the attack on it.", sayShort: 'Bd3 — …cxd4, besiege d4.' }, sources: FR,
  },
};
