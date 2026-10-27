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
const SC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];

export const SUBLINE_NARRATION_PRO_ROSEN: Record<string, SublineNarration> = {
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
  'pro-ericrosen-london::3::c6@7': {
    intro: { say: "c6 — Black plays a Pirc-style setup against your e4 London. Build the attack: Qd2, Bd3, O-O-O and the h4-h5 storm; you have a big centre and the f4-bishop, and Black's setup invites a direct kingside assault.", sayShort: 'c6 — Qd2 and Bd3, then h4 storm.' }, sources: LO,
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
  // ===== Scandinavian (Black) =====
  'pro-ericrosen-scandinavian::0::Bc4@6': {
    intro: { say: "Bc4 — White develops actively in the …Nxd5 Scandinavian. Retreat …Nb6 hitting the bishop, then …Nc6, …g6 and …Bg7; your solid setup and easy development give a comfortable game where you never landed the exposed queen.", sayShort: 'Bc4 — …Nb6, then fianchetto.' }, sources: SC,
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
  'pro-ericrosen-french::0::Bd3@10': {
    intro: { say: "Bd3 — White develops in the Advance French. Continue …cxd4 and …Nge7-f5 or …Bd7 and …a5, besieging the d4-base; the Advance French is a siege of d4, and every piece joins the attack on it.", sayShort: 'Bd3 — …cxd4, besiege d4.' }, sources: FR,
  },
};
