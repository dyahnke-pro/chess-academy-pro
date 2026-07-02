import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration for the Naroditsky King's Indian Defence (student
// BLACK) — frequent opponent deviations across the variations, grounded in his
// KID teaching (transcript reference-only, prose original, house voice). The KID
// plan is structural: when the centre locks, Black storms the kingside with
// …f5-f4; against the fianchetto/quiet setups Black leans on …e5, …c6 and …Qa5.
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.

const K = ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

export const SUBLINE_NARRATION_PRO_NAR_KID: Record<string, SublineNarration> = {
  // [1] Fianchetto (g3)
  'pro-naroditsky-kid::1::h3@14': {
    intro: { say: "h3 — a quiet prophylactic move in the Fianchetto King’s Indian, stopping …Ng4. Continue the standard plan: …exd4 to open the game, or hold with …c6 and …Qa5 hitting the queenside. The fianchetto lines are positional — you play in the centre and on the queenside rather than storming the king.", sayShort: 'h3 — play …c6 and …Qa5.' }, sources: K,
  },
  'pro-naroditsky-kid::1::Be3@16': {
    intro: { say: "Be3 — White develops the bishop after locking with e4. Meet it with the thematic …Qa5 and …c6, pressuring the queenside, or …exd4 opening lines for your pieces. In the fianchetto KID Black’s counterplay is queenside and central, and the g7-bishop bites on the long diagonal.", sayShort: 'Be3 — …Qa5 and …c6, press the queenside.' }, sources: K,
  },
  'pro-naroditsky-kid::1::Re1@18': {
    intro: { say: "Re1 — White supports the centre in the fianchetto. Keep to the plan: your …Qa5 eyes the queenside, and …Rfe8 with …exd4 or …a6 and …b5 gives active play. A rich positional battle where Black’s piece pressure balances White’s space.", sayShort: 'Re1 — …Rfe8, prepare …b5.' }, sources: K,
  },
  'pro-naroditsky-kid::1::Re1@16': {
    intro: { say: "Re1 — White backs up e4 early. Continue naturally: …exd4 opens the game for your pieces, or …c6 and …Qa5 pressure the queenside. The Fianchetto KID rewards patient piece play — the g7-bishop and the queenside break carry your game.", sayShort: 'Re1 — …exd4 or …c6 and …Qa5.' }, sources: K,
  },
  // [2] Anti-KID (Nf3 first)
  'pro-naroditsky-kid::2::Nc3@6': {
    intro: { say: "Nc3 — White transposes back toward the main King’s Indian. Continue …O-O, …d6 and …e5, the heart of the KID: strike the centre, and when it locks, storm the kingside with …f5. Whatever move-order White chooses, your plan never changes.", sayShort: 'Nc3 — …O-O, …d6 and …e5.' }, sources: K,
  },
  'pro-naroditsky-kid::2::e3@6': {
    intro: { say: "e3 — a modest, solid setup that declines the big centre. Answer with …O-O and …d6, then …e5 or …c5 to claim your share of the centre. Against the quiet e3 the KID has an easy, comfortable game — no cramping, no danger.", sayShort: 'e3 — …d6 then …e5 or …c5.' }, sources: K,
  },
  'pro-naroditsky-kid::2::Nc3@10': {
    intro: { say: "Nc3 — White completes the fianchetto setup and returns to main lines. Play …e5, the KID’s central break; after the tension resolves you press with …c6 and …Qa5 or …Re8 and …exd4. Familiar structures, familiar plans.", sayShort: 'Nc3 — …e5, then …c6 and …Qa5.' }, sources: K,
  },
  // [3] Makogonov (h3)
  'pro-naroditsky-kid::3::Bg5@10': {
    intro: { say: "Bg5 — in the Makogonov, White pins toward the queen after the early h3. Break the pin’s value with …h6 and …e5, striking the centre; when it locks you get the classic kingside storm with …f5. Black’s counterplay flows the moment the centre closes.", sayShort: 'Bg5 — …h6 and …e5.' }, sources: K,
  },
  'pro-naroditsky-kid::3::Bd3@12': {
    intro: { say: "Bd3 — White develops behind the h3 setup. Play the standard …e5, and after d5 locks the centre, launch the kingside: …Nh5, …f5-f4 and the pawn storm. The Makogonov is slower for White, which gives you time to organise the attack.", sayShort: 'Bd3 — …e5, then …f5 storm.' }, sources: K,
  },
  'pro-naroditsky-kid::3::Bd3@14': {
    intro: { say: "Bd3 — a natural developing move in the Makogonov. Continue …e5, and when White plays d5 you reroute with …Nc5 or …Nh5 and prepare …f5. The h3 setup is comfortable for Black to meet — strike the centre, then the kingside.", sayShort: 'Bd3 — …e5, reroute, then …f5.' }, sources: K,
  },
  'pro-naroditsky-kid::3::g4@12': {
    intro: { say: "g4 — the aggressive Makogonov space-grab, clamping the kingside. Do not be discouraged: play in the centre and on the queenside instead, with …e5, …c6 and …a6-b5. When White commits pawns on the wing, the centre becomes the place to strike back.", sayShort: 'g4 — counter in the centre and queenside.' }, sources: K,
  },
  // [4] Sämisch (f3)
  'pro-naroditsky-kid::4::Nge2@12': {
    intro: { say: "Nge2 — a flexible Sämisch setup after your …a6. Continue the queenside plan: …c5 or …b5 to strike at White’s broad centre, opening lines while White is still developing. In the Sämisch Black attacks the pawn front with pieces and pawns on both flanks.", sayShort: 'Nge2 — strike with …c5 or …b5.' }, sources: K,
  },
  'pro-naroditsky-kid::4::h4@12': {
    intro: { say: "h4 — the sharp Sämisch, White throwing the h-pawn at your king. Counter in the centre and on the queenside: …c5 hits d4, and …b5 opens lines faster than White’s attack arrives. It is a race, and the KID is built to win races on opposite wings.", sayShort: 'h4 — race with …c5 and …b5.' }, sources: K,
  },
  'pro-naroditsky-kid::4::Bg5@10': {
    intro: { say: "Bg5 — White pins in the Sämisch. Answer …c5, striking the centre at once; if White holds with d5 you switch to the queenside with …a6, …b5 and …e6 breaks. The Sämisch is sharp, but Black’s counterplay against the big centre is real.", sayShort: 'Bg5 — …c5, hit the centre.' }, sources: K,
  },
  'pro-naroditsky-kid::4::dxc5@14': {
    intro: { say: "dxc5 — White captures your …c5 break in the Sämisch. Recapture the pawn with …dxc5, opening the position; Black’s pieces come alive with the d-file and the long diagonal, and White’s centre has been dismantled. Exactly what …c5 was played for.", sayShort: 'dxc5 — recapture, open the game.' }, sources: K,
  },
  // [5] Petrosian / Nge2
  'pro-naroditsky-kid::5::Ng3@10': {
    intro: { say: "Ng3 — White reroutes the knight in the Nge2 system, eyeing f5 and the kingside. Reply …e5, and after d5 locks the centre, roll out the KID attack: …Nh5 or …Ne8 and …f5-f4. When the centre is closed, the kingside race is on and Black strikes first.", sayShort: 'Ng3 — …e5, then …f5 storm.' }, sources: K,
  },
  'pro-naroditsky-kid::5::Qd2@14': {
    intro: { say: "Qd2 — White prepares queenside castling and a slow build in the Petrosian. Play the standard …a6 and …c6, and prepare …e5 or the …b5 break; with White’s king heading queenside you get a genuine target for your own pawn storm.", sayShort: 'Qd2 — …c6, prepare …b5.' }, sources: K,
  },
  'pro-naroditsky-kid::5::Bg5@12': {
    intro: { say: "Bg5 — White pins after the …c6 setup. Break it with …h6 and strike with …e5; when the centre locks, the KID kingside attack writes itself. The pin costs White time, and time is what Black needs to organise the storm.", sayShort: 'Bg5 — …h6 and …e5.' }, sources: K,
  },
  // [6] Four Pawns Attack (f4)
  'pro-naroditsky-kid::6::dxe5@12': {
    intro: { say: "dxe5 — White resolves the centre in the sharp Four Pawns Attack after your …e5 strike. Recapture …dxe5, hitting the queen and opening the game; with White’s broad pawn front now loosened, Black’s pieces swarm the weakened squares. Provoking the big centre pays off.", sayShort: 'dxe5 — recapture, open the game.' }, sources: K,
  },
};
