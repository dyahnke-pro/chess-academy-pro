import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky King's Indian Attack + Rossolimo
// (student WHITE). House voice, grounded in the established understanding: the
// KIA is a system (Nf3-g3-Bg2-O-O-d3-Nbd2-e4, then the kingside build); the
// Rossolimo trades the bishop for the c6-knight for a lasting structural pull.
// Board-safe forward-looking plans. Keyed by deviation.

const KIA = ['concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack'];
const ROS = ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];

export const SUBLINE_NARRATION_PRO_NAR_KIA_ROSS: Record<string, SublineNarration> = {
  // ===== KIA =====
  // [0] d5 mainline
  'pro-naroditsky-kia::0::e6@5': {
    intro: { say: "e6 — Black builds a solid French/Catalan-like wall. Play your system on rails: O-O, d3, Nbd2, then the e4 break. Against the ...e6 blockade the kingside build with Nh4 and f4 gives the standard KIA attack — you always know exactly where your pieces belong.", sayShort: 'e6 — system it: d3, Nbd2, e4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::0::c6@5': {
    intro: { say: "c6 — a Slav-like setup supporting ...d5. Continue the system: O-O, d3, Nbd2, e4. The c6-pawn is solid but slow, giving you a free hand to organise the e4 break and the kingside attack.", sayShort: 'c6 — system setup, then e4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::0::Bf5@5': {
    intro: { say: "Bf5 — Black develops the bishop actively before ...e6. Fine: continue O-O, d3 and Nbd2, and prepare e4; when it lands, gaining a tempo on the f5-bishop is a bonus. Your flexible system meets every setup.", sayShort: 'Bf5 — system it, e4 hits the bishop.' }, sources: KIA,
  },
  // [1] g6 Modern
  'pro-naroditsky-kia::1::d6@5': {
    intro: { say: "d6 — Black mirrors your fianchetto in a Modern setup. Play the system: O-O, d3, Nbd2, e4. Against the symmetric structure the first side to break productively takes the initiative — and with the extra tempo, that is you.", sayShort: 'd6 — system it, break first with e4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::d5@9': {
    intro: { say: "d5 — Black claims the centre in the mirror fianchetto. Continue with Nbd2 and the e4 break; the central tension favours the better-prepared side, and you know these structures cold. Patience, then strike.", sayShort: 'd5 — Nbd2 and e4, strike the centre.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::e5@5': {
    intro: { say: "e5 — Black grabs central space early. No problem: O-O, d3, Nbd2, c3, and prepare the d4 break to challenge the centre. Your system flexes to meet the big pawn, and Black's early commitment gives you targets.", sayShort: 'e5 — system it, challenge with d4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::e6@5': {
    intro: { say: "e6 — a solid, restrained setup. System on: O-O, d3, Nbd2, e4. Your space and the smooth kingside build give a pleasant edge against the passive structure.", sayShort: 'e6 — system setup, then e4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::c5@5': {
    intro: { say: "c5 — Black stakes the queenside. Continue the system and prepare e4; against ...c5 you often follow with e4-e5, gaining kingside space, then the Nh4-f5 attacking plan. Flexible and comfortable.", sayShort: 'c5 — system it, aim for e4-e5.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::c6@5': {
    intro: { say: "c6 — a Slav-like slow setup in the Modern. System on rails: d3, Nbd2, e4, then the kingside attack. The slow ...c6 gives you time to organise the e4 break on your own terms.", sayShort: 'c6 — system setup, then e4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::1::d6@7': {
    intro: { say: "d6 — Black completes a King's-Indian-in-reverse setup. Play your system with d3, Nbd2 and e4; against the mirror you have the extra tempo to break first and seize the initiative.", sayShort: 'd6 — system it, break first.' }, sources: KIA,
  },
  // [3] vs ...e5 (Reti gambit, White a pawn up)
  'pro-naroditsky-kia::3::Nf6@5': {
    intro: { say: "Nf6 — Black develops in the pawn-up line. Grab the centre with d4, and Nc3 either regains the c4-pawn or dominates the centre; your extra pawn and central control give a reliable, safe advantage.", sayShort: 'Nf6 — d4 and Nc3, keep the pawn.' }, sources: KIA,
  },
  'pro-naroditsky-kia::3::Nf6@7': {
    intro: { say: "Nf6 — deep in the pawn-up line, Black develops. Recover the c4-pawn with e3 and Be2, castle, and convert: you have a clean extra pawn and a solid structure. A reliable pawn-up grind.", sayShort: 'Nf6 — e3, Be2, convert the pawn.' }, sources: KIA,
  },
  // [4] vs ...c6 (Slav-like)
  'pro-naroditsky-kia::4::g6@7': {
    intro: { say: "g6 — Black fianchettos in the Slav-like setup. Continue the system: d3, Nbd2, e4. Against the passive c6-d5-g6 structure your e4 break and Bg2 long-diagonal pressure give a comfortable, one-sided game.", sayShort: 'g6 — system it, e4 and press.' }, sources: KIA,
  },
  'pro-naroditsky-kia::4::g6@5': {
    intro: { say: "g6 — an early fianchetto against your KIA. System on: d3, Nbd2, e4, then the kingside build. Your flexible setup handles the fianchetto easily and the e4 break claims the initiative.", sayShort: 'g6 — system setup, then e4.' }, sources: KIA,
  },
  // [5] vs ...b6 (Owen)
  'pro-naroditsky-kia::5::e6@5': {
    intro: { say: "e6 — Black completes an Owen-style hypermodern setup. Claim the centre: O-O then d4 (the b6 setup invites it), c4 and Nc3, building a broad front where all the active plans are yours. A pleasant space advantage.", sayShort: 'e6 — claim the centre, d4 and c4.' }, sources: KIA,
  },
  'pro-naroditsky-kia::5::d5@7': {
    intro: { say: "d5 — Black claims the centre in the Owen. Answer d4 to grab your share, then c4 and Nc3; the Queen's-Pawn structure favours White's space and easy development. Press on the queenside.", sayShort: 'd5 — d4 and c4, take your share.' }, sources: KIA,
  },
  'pro-naroditsky-kia::5::d5@5': {
    intro: { say: "d5 — an early central claim. Answer d4, and the Ne5 jump provokes weaknesses; you reach a comfortable space-based edge with the bishop raking the long diagonal. Solid and pleasant.", sayShort: 'd5 — d4 and Ne5, provoke weaknesses.' }, sources: KIA,
  },

  // ===== Rossolimo =====
  // [0] Nc6 proper
  'pro-naroditsky-rossolimo::0::Nf6@5': {
    intro: { say: "Nf6 — Black develops, ignoring the bishop for now. Continue the Rossolimo plan: O-O, then either Bxc6 to double Black's pawns or hold with d3, c3 and Re1. You steer a comfortable positional game far from Open-Sicilian theory.", sayShort: 'Nf6 — castle, then Bxc6 or d3.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::0::d6@5': {
    intro: { say: "d6 — Black plays solidly. Castle, then roll out the Rossolimo squeeze: Bxc6 doubling the pawns, or Re1, c3 and d4. Trading the bishop for the knight hands Black a lasting structural weakness — a pleasant positional pull.", sayShort: 'd6 — castle, then Bxc6 doubles pawns.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::0::e5@5': {
    intro: { say: "e5 — Black grabs the centre. Castle and target the weakened d5-square and the backward d-pawn: Bxc6, d3, Nc3 and Nd5 ideas give White a clean positional edge. The big centre comes at the cost of holes.", sayShort: 'e5 — castle, target d5 and d6.' }, sources: ROS,
  },
  // [1] e6 Open avoidance
  'pro-naroditsky-rossolimo::1::Nc6@7': {
    intro: { say: "Nc6 — Black transposes to an Open Sicilian Taimanov after your d4. Develop the fianchetto with g3 and Bg2, and press with your space and the long diagonal. A comfortable, low-theory version of the Open Sicilian.", sayShort: 'Nc6 — g3 and Bg2, press the centre.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::1::Nf6@7': {
    intro: { say: "Nf6 — Black develops in the Open. Continue Nc3 and a natural setup — Be2 or g3, then castle; your central knight and easy development give the pleasant Open-Sicilian pull White always seeks.", sayShort: 'Nf6 — Nc3, develop, keep the pull.' }, sources: ROS,
  },
  // [2] Bxd7+ trade
  'pro-naroditsky-rossolimo::2::Nxd7@7': {
    intro: { say: "Nxd7 — Black recaptures with the knight after the bishop trade. Castle and build: c3, d4 or d3, and Re1, pressing the slightly passive Black setup. Trading the bishop was no concession — you keep the easier game.", sayShort: 'Nxd7 — castle, build c3 and d4.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::2::Nc6@9': {
    intro: { say: "Nc6 — Black recaptures with the queen and develops. Castle and play c3 with d4, or Re1 and a slow build; your harmonious setup and the bishop-pair trade give a comfortable positional game.", sayShort: 'Nc6 — castle, c3 and d4.' }, sources: ROS,
  },
  // [3] c3 sideline
  'pro-naroditsky-rossolimo::3::g6@7': {
    intro: { say: "g6 — Black fianchettos against your c3-d4 setup. Reroute the bishop to c2 and build the big centre with d4; you get an ideal broad pawn front, developing behind it and pressing the space.", sayShort: 'g6 — Bc2, build the big d4 centre.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::3::Bg4@7': {
    intro: { say: "Bg4 — Black pins before you build. Meet it with h3, and either retreat the bishop or accept the trade; keep your c3-d4 centre and the small space edge. The pin is a minor nuisance, easily handled.", sayShort: 'Bg4 — h3, keep the centre.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::3::e5@9': {
    intro: { say: "e5 — Black stakes the centre. Reroute Bc2 and prepare d4, challenging the centre; the structure with your space and the c2-bishop's diagonal gives a pleasant, safe pull.", sayShort: 'e5 — Bc2, prepare d4.' }, sources: ROS,
  },
  // [4] Bc4 vs ...d6
  'pro-naroditsky-rossolimo::4::e6@7': {
    intro: { say: "e6 — Black solidifies against your Bc4 setup. Continue d3, c3, and prepare d4 or the Nbd2-f1-g3 reroute; the bishop on c4 eyes f7 and your flexible setup gives a comfortable, low-theory game.", sayShort: 'e6 — d3 and c3, prepare d4.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::4::e6@5': {
    intro: { say: "e6 — an early ...e6 against Bc4. Castle and build with d3, c3 and Re1; your active bishop and the small centre give a pleasant Italian-flavoured game against the Sicilian.", sayShort: 'e6 — castle, d3 and c3.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::4::Nc6@5': {
    intro: { say: "Nc6 — Black develops naturally. Play d3, c3 and Re1, keeping the Bc4 trained on f7; a slow, manoeuvring Italian-versus-Sicilian where White has the easier plans.", sayShort: 'Nc6 — d3 and c3, keep aiming f7.' }, sources: ROS,
  },
  'pro-naroditsky-rossolimo::4::g6@9': {
    intro: { say: "g6 — Black fianchettos. Continue your setup — d3, c3, Re1, Nbd2 — and prepare the d4 break; the Bc4 and your central control give a comfortable edge against the Dragon-style structure.", sayShort: 'g6 — keep the setup, prepare d4.' }, sources: ROS,
  },
  // [5] vs ...g6 (Hyper Dragon)
  'pro-naroditsky-rossolimo::5::Nf6@5': {
    intro: { say: "Nf6 — Black provokes in the c3 anti-Dragon. Push e5, gaining space and hitting the knight, then d4 and the Bc4-b3 build a strong centre and active pieces. Black's fianchetto bishop bites on your granite while you enjoy the space.", sayShort: 'Nf6 — e5 and d4, seize the centre.' }, sources: ROS,
  },
};
