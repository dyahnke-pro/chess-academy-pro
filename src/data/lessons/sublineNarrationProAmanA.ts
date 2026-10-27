import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Aman repertoire batch A: Sicilian Kan/Taimanov
// (student BLACK); Open Sicilian Richter-Rauzer + Dragon Yugoslav (student
// WHITE); Rossolimo + Moscow Anti-Sicilians (student WHITE). House voice,
// board-safe, line-grounded. Each entry answers the opponent's frequent
// deviation with the student-side plan.

const SKAN = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SROSS = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];

export const SUBLINE_NARRATION_PRO_AMAN_A: Record<string, SublineNarration> = {
  // ===== Sicilian Kan Variation (student BLACK) — anti-Kan sidelines =====
  'pro-aman-sicilian-kan::0::c3@4': {
    intro: { say: "c3 — the Delayed Alapin, White propping a big pawn centre. Strike back at once with …d5; after exd5 …Qxd5 your queen sits actively and White cannot gain tempo, then develop …Nf6 and …Nc6 to pressure d4. Black equalises with easy, natural play.", sayShort: 'c3 — …d5, then …Nf6 and …Nc6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::Nc3@4': {
    intro: { say: "Nc3 — White develops before committing the centre. Keep it flexible with …a6, and after d4 cxd4 Nxd4 slot into a Kan setup with …Qc7 and …Nf6; you eye the …b5 expansion and pressure on e4. Sound, well-charted Sicilian play with the queenside initiative in reserve.", sayShort: 'Nc3 — …a6, then …Qc7 and …Nf6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::d3@4': {
    intro: { say: "d3 — White steers into a King's Indian Attack. Match the setup: …Nc6, …g6 and …Bg7, fianchettoing your bishop onto the long diagonal. With a solid Sicilian structure you contest the centre and prepare …d5 or …e5 to free your game at the right moment. Comfortable, flexible play.", sayShort: 'd3 — …Nc6 and …g6, then …Bg7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::b3@4': {
    intro: { say: "b3 — the Westerinen Attack, White fianchettoing to fight for e4 and e5. Answer symmetrically with …b6 and …Bb7, contesting the long diagonal, then …Nc6 to control d4 and e5. Both bishops rake the centre and Black stands comfortably with flexible Sicilian development.", sayShort: 'b3 — …b6 and …Bb7, then …Nc6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::c4@8': {
    intro: { say: "c4 — the Maróczy Bind, clamping d5 and e4. Do not fear the space: build a hedgehog with …Nf6, …Qc7, …b6 and …Bb7, coiling behind the third rank. The …b5 and …d5 breaks are your levers, and White's broad centre can become overextended. Patient, resilient counterplay.", sayShort: 'c4 — hedgehog …Nf6, …b6 and …Bb7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::g3@4': {
    intro: { say: "g3 — White heads for a quiet fianchetto setup. Develop naturally with …Nc6 and …Nf6, then prepare …d5 to challenge the centre before the g2-bishop bites; …Be7 and …O-O follow. Black gets a healthy, active game with the freer central break in hand.", sayShort: 'g3 — …Nc6 and …Nf6, prepare …d5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::Be2@10': {
    intro: { say: "Be2 — a calm, solid Kan setup. Continue …Nf6 and …Be7, castle, and roll out the queenside with …b5 and …Bb7; your …Qc7 already eyes e5 and the half-open c-file. This is the Kan's flexible middlegame, where Black expands while White has no direct plan of attack.", sayShort: 'Be2 — …Nf6 and …Be7, then …b5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::g3@10': {
    intro: { say: "g3 — White fianchettoes against your Kan. Interfere with …Bb4, pinning the c3-knight before it supports e4, then …Nf6 hitting the centre; after Ne2 the pin loosens but you have gained time and clean development. Fight for e4 and d5 with active pieces.", sayShort: 'g3 — …Bb4 pin, then …Nf6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::0::f4@12': {
    intro: { say: "f4 — White grabs kingside space, angling for e5. Restrain it with …d6, taking the sting out of the push, then expand with …b5, …Bb7 and …Nbd7; the f4-pawn loosens White's king and hands you targets. Counter on the queenside while the centre stays under control.", sayShort: 'f4 — …d6 restrains, then …b5.' }, sources: SKAN,
  },
  // ===== Taimanov (…Nc6) systems (student BLACK) =====
  'pro-aman-sicilian-kan::1::Be2@10': {
    intro: { say: "Be2 — the quiet Bastrikov Taimanov. Play …a6 keeping …b5 in reserve, then …Nf6, …Be7 and …O-O; your …Qc7 sits on the open c-file eyeing e5 and c2. Expand with …b5 and …Bb7 when ready — the Taimanov gives Black harmonious development and queenside initiative.", sayShort: 'Be2 — …a6 and …Nf6, then …b5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::Qd2@12': {
    intro: { say: "Qd2 — the English Attack, White readying O-O-O and a pawn storm. Meet it with …Nf6 and …b5, …Bb7 and …Rc8, racing on the queenside where White has castled; the …b4 lever cracks the c3-knight. Sharp, mutual attacks — and the Taimanov's counterplay usually strikes first.", sayShort: 'Qd2 — …Nf6 and …b5, storm queenside.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::g3@10': {
    intro: { say: "g3 — White fianchettoes against the Taimanov. Develop …a6 and …Nf6, then …Be7 and …O-O, keeping the …d5 and …b5 breaks flexible; the g2-bishop looks strong but your solid centre denies it targets. Expand on the queenside and contest the light squares patiently.", sayShort: 'g3 — …a6 and …Nf6, keep …b5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::Nb5@8': {
    intro: { say: "Nb5 — White jumps in threatening Nd6+. Shut it out with …d6, a small concession that costs White time, and after c4 you face a Maróczy Bind. Set up the hedgehog: …Be7, …O-O, …a6 and …b6, then break with …b5 or …d5 to free your position. Solid and resilient.", sayShort: 'Nb5 — …d6 covers, then hedgehog.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::Bd3@12': {
    intro: { say: "Bd3 — White develops the bishop toward your king in the English Attack. Strike with …Nf6 and …b5, then …Bb7 and …Ne5, hitting the d3-bishop and grabbing the strong central knight; your queenside pawns roll while White's king seeks shelter. Active, double-edged Taimanov play.", sayShort: 'Bd3 — …b5 and …Bb7, then …Ne5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::Qf3@12': {
    intro: { say: "Qf3 — White eyes the kingside and readies O-O-O. Continue …Nf6 and …b5, developing …Bb7 with pressure on e4 and the long diagonal; the queen on f3 can become a target for …b4 and …Ne5 tempo. Expand on the queenside and meet White's attack with your own faster one.", sayShort: 'Qf3 — …Nf6 and …b5, hit e4.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::f4@10': {
    intro: { say: "f4 — White lunges for kingside space and trades on c6. After Nxc6 …Qxc6 your queen eyes e4 and the long diagonal; follow with …b5, …Bb7 and …Nf6, pressuring the loosened centre. The f4-push has weakened White's king, so counter fast on the light squares and the queenside.", sayShort: 'f4 — …Qxc6 recaptures, then …b5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::a3@12': {
    intro: { say: "a3 — White stops …Bb4 and prepares a slow build. Simply expand: …b5 gains queenside space, then …Bb7 and …Nf6 with …Rc8 to follow; the tempo White spent on a3 is time you use to complete the Taimanov setup. Roll the queenside pawns and press where you are stronger.", sayShort: 'a3 — …b5, then …Bb7 and …Nf6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::1::g4@12': {
    intro: { say: "g4 — White throws the kingside pawns forward in the sharpest English Attack. Race back with …b5, …Bb7 and …Nf6, meeting the wing thrust with your own queenside storm; g4 loosens White's king cover, so open lines toward it with …b4 and …d5. Concrete, double-edged — count the attacks and strike first.", sayShort: 'g4 — …b5 and …Bb7, race back.' }, sources: SKAN,
  },
  // ===== Kan Maróczy Réti (…a6 c4 Qc7) systems (student BLACK) =====
  'pro-aman-sicilian-kan::2::a3@12': {
    intro: { say: "a3 — White reinforces the Maróczy Bind, ruling out …Bb4 and …Nb4. Coil into a hedgehog: …b6, …Bb7, …Be7, …d6 and …O-O, settling behind the sixth rank. Your levers are …b5 and …d5 — prepare them patiently and White's broad centre becomes a liability. Resilient, thematic play.", sayShort: 'a3 — hedgehog …b6, …Bb7 and …Be7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::Bd3@12': {
    intro: { say: "Bd3 — White eyes the kingside, but the bishop bites on your solid structure. Challenge the centre with …Nc6, hitting d4, then …Be7, …O-O and …b6 with …Bb7; the …d5 break looms once you are developed. Black stands comfortably against the bind with active, well-coordinated pieces.", sayShort: 'Bd3 — …Nc6 hits d4, then …Be7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::Be3@12': {
    intro: { say: "Be3 — White develops toward a big centre. Pin with …Bb4, tying down the c3-knight that guards e4 and d5, then castle and prepare …d5 or …Ne4 tactics on the pinned knight. The pin fights the bind at its root; keep the pieces active and the …d5 break in reserve. Balanced, purposeful play.", sayShort: 'Be3 — …Bb4 pins, prepare …d5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::a3@10': {
    intro: { say: "a3 — an early prophylactic move in the Maróczy. Develop …Nf6 and …b6, then …Bb7, …Be7 and …O-O, building the hedgehog behind your pawns; White's a3 spends time you use to complete the setup. Prepare …d5 and …b5, the standard freeing breaks, and press when White overextends.", sayShort: 'a3 — …Nf6 and …b6, then …Bb7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::Bd3@10': {
    intro: { say: "Bd3 — White develops actively but the bishop finds no targets on your solid Kan wall. Play …Nf6 and …Be7, castle, then …b6 and …Bb7 or …Nc6 hitting d4; the …d5 break equalises once your pieces are out. Black has a comfortable, flexible game against the bind. Develop and break on time.", sayShort: 'Bd3 — …Nf6 and …Be7, then …b6.' }, sources: SKAN,
  },
  // ===== Alapin (2.c3 Nf6) systems (student BLACK) =====
  'pro-aman-sicilian-kan::3::Nf3@6': {
    intro: { say: "Nf3 — the main Alapin, White supporting the e5-pawn. Develop …Nc6 hitting e5 and d4, and after Bc4 nudge the bishop with …Nb6; then …d6 or …e6 undermines the e5-chain. Your knight on d5 is superbly placed and White's centre, though broad, needs constant defending. Active, equal play.", sayShort: 'Nf3 — …Nc6, then …Nb6 and …d6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::cxd4@10': {
    intro: { say: "cxd4 — White recaptures with the pawn, taking on an isolated d-pawn that also braces e5. Undermine with …d6, striking the e5-chain, then …Be7 and …O-O; when e5 trades off, the lonely d4-pawn is a permanent target. Blockade d5 and press the isolani — comfortable, well-mapped play for Black.", sayShort: 'cxd4 — …d6 hits e5, blockade d5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::cxd4@8': {
    intro: { say: "cxd4 — White recaptures at once, saddling itself with an isolated d-pawn while e5 stays advanced. Hit the chain with …d6, then …Nc6 and …Be7, …O-O; trading e5 leaves the d4-pawn weak and blockadable on d5. This is a favourable isolated-pawn structure for Black — restrain, blockade, and press.", sayShort: 'cxd4 — …d6, then …Nc6 and …Be7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::Bc4@6': {
    intro: { say: "Bc4 — White attacks your d5-knight before castling. Retreat …Nb6 hitting the bishop, and after Bb3 gain space with …c4, chasing it to c2 where it is passive; then …Nc6 develops with pressure on e5. Black seizes queenside space and a fine game — the bishop has been shuffled to the edge of play.", sayShort: 'Bc4 — …Nb6, then …c4 and …Nc6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::Qxd4@8': {
    intro: { say: "Qxd4 — White grabs the pawn with the queen, but the lady will be chased. Play …e6 solidifying d5, then …Nc6 hitting the queen with tempo; after Qe4 strike …f5, gaining more time and space. Every developing move comes with a threat, and White's early queen sortie leaves it exposed. Black leads comfortably in development.", sayShort: 'Qxd4 — …e6 and …Nc6, then …f5.' }, sources: SKAN,
  },
  // ===== Moscow Variation (Bb5+ vs …d6) (student WHITE) =====
  'pro-aman-rossolimo::2::Bd7@5': {
    intro: { say: "Bd7 — the Moscow main line, Black blocking the check. Trade Bxd7+ and after …Qxd7 castle; you have swapped off Black's good light bishop and can now build with c3 and d4, or clamp with c4 for a Maróczy Bind. The trade eases development and leaves you a small, riskless space edge to nurse. Slow, positional Anti-Sicilian pressure.", sayShort: 'Bd7 — Bxd7+, O-O, then c3 and d4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::Nc6@5': {
    intro: { say: "Nc6 — Black blocks the check with the knight, transposing toward Rossolimo waters. Castle, then decide the bishop: Bxc6 doubling Black's pawns for a structural target, or keep it and build with c3 and d4. Either way you steer into a comfortable Anti-Sicilian where White's easy development and central space give the pull. No theory to fear — mobilise and press.", sayShort: 'Nc6 — O-O, then Bxc6 or d4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::a6@7': {
    intro: { say: "a6 — Black harasses the bishop before completing development. Retreat Ba4, keeping the piece and the pressure on the d7-knight and c6, then build the centre with d4 and castle; the bishop on a4 can later reroute via c2 toward the kingside. White develops smoothly and prepares the d4 break for a lasting space edge. Steady, positional Anti-Sicilian play.", sayShort: 'a6 — Ba4, then d4 and O-O.' }, sources: SROSS,
  },
};
