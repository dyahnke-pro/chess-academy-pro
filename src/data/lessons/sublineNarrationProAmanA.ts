import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Aman repertoire batch A: Sicilian Kan/Taimanov
// (student BLACK); Open Sicilian Richter-Rauzer + Dragon Yugoslav (student
// WHITE); Rossolimo + Moscow Anti-Sicilians (student WHITE). House voice,
// board-safe, line-grounded. Each entry answers the opponent's frequent
// deviation with the student-side plan.

const SKAN = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const SOPEN = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
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
  'pro-aman-sicilian-kan::1::a3@14': {
    intro: { say: "a3 — a quiet prophylactic move against …Bb4 and …Nb4. Continue your plan with …d6 and …Be7, castle, then …b5 and …Bb7 expanding on the queenside; White's a3 does nothing to stop your natural development. Complete the setup and press the c-file and queenside majority.", sayShort: 'a3 — …d6 and …Be7, then …b5.' }, sources: SKAN,
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
  'pro-aman-sicilian-kan::2::Be3@14': {
    intro: { say: "Be3 — White completes development in the Maróczy. Continue the hedgehog: …Be7, …O-O, …b6 and …Bb7, with …Nbd7 to follow; your position coils behind the sixth rank waiting to uncoil. Time the …b5 or …d5 break carefully and the bind loosens. Patience is the Kan hedgehog's virtue.", sayShort: 'Be3 — …Be7 and …b6, then …Bb7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::a3@10': {
    intro: { say: "a3 — an early prophylactic move in the Maróczy. Develop …Nf6 and …b6, then …Bb7, …Be7 and …O-O, building the hedgehog behind your pawns; White's a3 spends time you use to complete the setup. Prepare …d5 and …b5, the standard freeing breaks, and press when White overextends.", sayShort: 'a3 — …Nf6 and …b6, then …Bb7.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::Rc1@20': {
    intro: { say: "Rc1 — White stacks the c-file in a full Maróczy hedgehog. Your structure is complete, so prepare the freeing breaks: reroute …Rc8 and …Qb8 off the c-file, then strike with …d5 or …b5 at the perfect moment. The hedgehog springs when White commits; until then, improve every piece and wait. Deep, strategic play.", sayShort: 'Rc1 — …Rc8 and …Qb8, then …d5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::Bd3@10': {
    intro: { say: "Bd3 — White develops actively but the bishop finds no targets on your solid Kan wall. Play …Nf6 and …Be7, castle, then …b6 and …Bb7 or …Nc6 hitting d4; the …d5 break equalises once your pieces are out. Black has a comfortable, flexible game against the bind. Develop and break on time.", sayShort: 'Bd3 — …Nf6 and …Be7, then …b6.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::a4@20': {
    intro: { say: "a4 — White clamps down on your …b5 break in the hedgehog. Shift the plan: since the queenside is fixed, prepare …d5 instead, backed by …Rc8, …Re8 and …Qb8; the a4-push has weakened b4, a square your knight can later use. Reroute your pieces and strike the centre once White is fully committed.", sayShort: 'a4 — prepare …d5, reroute …Rc8 and …Qb8.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::2::f4@16': {
    intro: { say: "f4 — White grabs kingside space early, aiming for e5. Finish developing with …Bb7, …Be7 and …O-O, keeping …d6 firm so e5 never comes cleanly; the f4-pawn loosens White's king and gives you the …d5 break with tempo. Counter on the queenside and the light squares while White overreaches.", sayShort: 'f4 — …Bb7 and …Be7, hold …d6.' }, sources: SKAN,
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
  'pro-aman-sicilian-kan::3::Bxe6@18': {
    intro: { say: "Bxe6 — White trades the light-squared bishops on e6. Recapture …fxe6, and though the pawns double, the f-file opens for your rook and your centre grows strong; the e6-pawn controls d5 and f5. The doubled pawns are a feature, not a flaw — active rooks and central control give Black the better game.", sayShort: 'Bxe6 — …fxe6, open the f-file.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::Na3@16': {
    intro: { say: "Na3 — White develops the knight toward b5 and c4, eyeing the d-pawn and outposts. Trade the dangerous b3-bishop with …Be6, then …Be7 and …O-O completing development; once the light bishops come off, White's knight lacks a strong home and your central pawns roll. Black stands well with the freer position.", sayShort: 'Na3 — …Be6 trades, then …O-O.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::cxd4@16': {
    intro: { say: "cxd4 — White finally recaptures on d4, leaving an isolated queen-pawn. Blockade it: …Be6 to trade the b3-bishop, then …Be7, …O-O and pieces converging on d5 and d4; the lonely pawn cannot advance safely. This is textbook play against the isolani — restrain, blockade and pile up. Black holds the long-term edge.", sayShort: 'cxd4 — …Be6 and …Be7, blockade d5.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::Nxd4@18': {
    intro: { say: "Nxd4 — White grabs the d-pawn, offering a trade of knights. Recapture …Nxd4, and once the minor pieces come off you reach a balanced, open middlegame where your bishop pair and active rooks shine; …Bxb3 next removes White's best bishop. Black has nothing to fear — trade into activity and press the better structure.", sayShort: 'Nxd4 — …Nxd4, then trade on b3.' }, sources: SKAN,
  },
  'pro-aman-sicilian-kan::3::axb3@20': {
    intro: { say: "axb3 — White recaptures the traded bishop, doubling pawns on the b-file. Complete development with …Be7 and …O-O, then target the weakened queenside: …Rc8 on the half-open c-file and pressure on b3 and the c-squares. The doubled pawns are permanent targets, and Black's healthier position promises a long, pleasant pull.", sayShort: 'axb3 — …Be7 and …O-O, target b3.' }, sources: SKAN,
  },

  // ===== Open Sicilian: Richter-Rauzer (student WHITE) =====
  'pro-aman-open-sicilian::1::Be7@13': {
    intro: { say: "Be7 — the Classical Rauzer, Black developing solidly. Castle long with O-O-O, then launch the standard kingside storm: f4, then g4-g5 chasing the f6-knight, while your pieces mass on the d- and e-files. Opposite-side castling means it is a race, and White strikes first on the kingside. Sharp, thematic attacking play.", sayShort: 'Be7 — O-O-O, then f4 and g4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::h6@15': {
    intro: { say: "h6 — Black questions your g5-bishop after castling long. Retreat Be3, keeping the bishop active on the queenside dark squares, or take Bxf6 doubling Black's pawns; then roll f3, g4 and h4-g5 storming the king. With both sides castled opposite, push your pawns hard — White's attack is faster. Concrete and dangerous.", sayShort: 'h6 — Be3, then f3 and g4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Bd7@11': {
    intro: { say: "Bd7 — the Modern Rauzer, Black readying …Rc8 and …Qa5 queenside pressure. Continue Qd2 and O-O-O, then f4 and the kingside pawn advance; meet …Rc8 with Kb1 tucking your king and Nxc6 at the right moment to blunt the counterplay. It is a mutual race — keep your storm rolling and defend the queenside with prophylaxis.", sayShort: 'Bd7 — Qd2 and O-O-O, then f4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Qb6@11': {
    intro: { say: "Qb6 — Black pressures d4 and eyes b2. Sidestep with Nb3, retreating the knight while keeping the g5-pin intact and denying …Qxb2 counterplay; follow with Qd2, O-O-O and f3, then the kingside storm. The queen on b6 is soon a target for Na4 or a3-b4 tempo gains. Keep developing toward the attack.", sayShort: 'Qb6 — Nb3, then Qd2 and O-O-O.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Be7@15': {
    intro: { say: "Be7 — Black completes development with the bishop after …a6. Press ahead with f3 and g4, then h4-g5 driving the f6-knight, while Kb1 tucks your king safe; your rooks swing to g1 and h1 behind the pawns. Opposite-side castling makes it a straight race, and White's kingside attack has the head start. Storm without delay.", sayShort: 'Be7 — f3 and g4, then g5.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Qb6@13': {
    intro: { say: "Qb6 — the Ivanov, Black hitting d4 with the queen. Retreat Nb3, holding the g5-pin and shooing the queen off its aggressive post; then O-O-O, f3 and the kingside pawn storm. The …Qb6 sortie leaves the queen offside for the coming battle, so develop with tempo and get your attack rolling. White keeps the initiative on both sides.", sayShort: 'Qb6 — Nb3, then O-O-O and f3.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Nxd4@17': {
    intro: { say: "Nxd4 — Black trades the knights on d4. Recapture Qxd4, centralising the queen with pressure down the d-file and toward the kingside; then push g4, h4 and g5 storming the f6-knight while your king sits safe on b1. The trade eases Black's game a touch but hands you a dominant queen — press the attack and the open lines.", sayShort: 'Nxd4 — Qxd4 centralises, then g4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::b5@17': {
    intro: { say: "b5 — Black launches the queenside pawn storm. Do not slow down: race with g4, then h4-g5 hitting the f6-knight, and tuck the king with Kb1; if …b4 comes, Nd5 or Ne2 sidesteps and keeps the attack alive. Opposite-side castling is a pure pawn-storm race — count the tempi and strike first on the kingside.", sayShort: 'b5 — g4 and h4, race kingside.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::h6@17': {
    intro: { say: "h6 — Black prevents g5 ideas for now. Reroute the bishop to e3 or h4, keep your structure, and prepare g4 anyway — after g4 and h4 the g5-break comes with force; …h6 has merely given you a hook to pry open with g4-g5. Storm the kingside while your king shelters on b1. White's attack rolls on.", sayShort: 'h6 — Be3, then g4 and h4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::1::Rc8@17': {
    intro: { say: "Rc8 — Black stacks the c-file, eyeing a …Rxc3 exchange sacrifice. Play Kb1 first, stepping off the c-file and defusing the sac, then storm with g4, h4 and g5; Nxc6 at the right moment trades off an attacker. Prophylaxis then attack — tuck the king, blunt the counterplay, and push your kingside pawns. The race favours the better-prepared side.", sayShort: 'Rc8 — Kb1 first, then g4 storm.' }, sources: SOPEN,
  },
  // ===== Open Sicilian: Dragon, Yugoslav Attack (student WHITE) =====
  'pro-aman-open-sicilian::2::Nc6@13': {
    intro: { say: "Nc6 — the main Dragon, Black developing before castling. Set up the Yugoslav Attack: Qd2, O-O-O, then Bc4 controlling the a2-g8 diagonal and Bh6 to trade the Dragon bishop; follow with h4-h5 cracking open g6. Castle opposite and race — White's h-pawn storm against the fianchetto is one of chess's sharpest attacks. Press accurately.", sayShort: 'Nc6 — Qd2, O-O-O, then h4-h5.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::2::Nxd4@17': {
    intro: { say: "Nxd4 — Black trades knights, hoping to ease the defence. Recapture Bxd4, keeping the powerful dark-squared bishop trained on the long diagonal and the g7-bishop; then Bh6 to trade Black's key defender, h4-h5 to open the h-file, and Kb1 for safety. The Dragon bishop is Black's soul — trade it and the storm crashes through. Attack with precision.", sayShort: 'Nxd4 — Bxd4, then Bh6 and h4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::2::a6@13': {
    intro: { say: "a6 — Black rushes the queenside with …b5 ideas before castling. Answer with Qd2 and O-O-O, then go straight for the throat: h4-h5 to open the h-file and Bh6 to trade the Dragon bishop, ignoring the slow …b5. In this pure race, White's kingside break lands first against the fianchettoed king. Storm hard and fast.", sayShort: 'a6 — Qd2, O-O-O, then h4-h5.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::2::Bd7@17': {
    intro: { say: "Bd7 — Black completes the classic Dragon, preparing …Rc8 and …Ne5-c4. Keep the attack rolling: Bc4 clamping the a2-g8 diagonal, Kb1 for safety, then h4-h5 and Bh6 trading the fianchetto bishop; meet …Rc8 with Bb3 preserving the bishop. It is the main-line Yugoslav race — push the h-pawn, open g6, and strike the king. Accuracy decides.", sayShort: 'Bd7 — Bc4 and Kb1, then h4.' }, sources: SOPEN,
  },
  'pro-aman-open-sicilian::2::e6@19': {
    intro: { say: "e6 — Black bolsters the …d5 break after your Qe1 sidestep. Strike the centre open with exd5: after …exd5 or …Nxd5 the position clarifies and your dark-squared bishop and pressure down the e- and d-files come alive; Bh6 trades the Dragon bishop and the h-file beckons. Do not let Black consolidate the centre — open lines toward the king. Sharp play.", sayShort: 'e6 — exd5 opens, then Bh6.' }, sources: SOPEN,
  },

  // ===== Rossolimo / Nyezhmetdinov-Rossolimo Attack (student WHITE) =====
  'pro-aman-rossolimo::1::Ng6@9': {
    intro: { say: "Ng6 — Black reroutes the knight toward the kingside. Build the centre with c3 and d4, retreating Bf1 so the bishop keeps eyeing the a2-g8 diagonal without being traded; after d4 the tension favours White's space. The Rossolimo aims for a small, lasting central edge rather than fireworks — clamp the centre and press.", sayShort: 'Ng6 — c3 and d4, retreat Bf1.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::cxd4@17': {
    intro: { say: "cxd4 — Black releases the central tension. Recapture Nxd4, centralising the knight and keeping pressure on the c6-knight and the e6-pawn; your pieces are harmoniously placed and the bishop on f1 will find the long diagonal after a later Bd3 or Bc4. White holds a small, pleasant space and development edge — trade into an easy, better middlegame and press.", sayShort: 'cxd4 — Nxd4 centralises, keep pressure.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::b6@9': {
    intro: { say: "b6 — Black prepares to fianchetto with …Bb7, contesting e4. Take the centre first: c3 and d4, and if …cxd4 recapture and clamp with a strong pawn duo; Bf1 keeps your bishop while you gain space. Meet the coming …Bb7 by defending e4 soundly and expanding — White's central majority gives the better game. Patient, principled play.", sayShort: 'b6 — c3 and d4, seize centre.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::cxd4@15': {
    intro: { say: "cxd4 — Black trades in the centre before finishing development. Recapture Nxd4, and the knight hits c6 while your rook on e1 eyes the e-file; your lead in development tells now. Follow with Bd3 or Bc4 activating the light bishop and pressure the isolated e6-pawn. White emerges a touch better placed — open the position for your active pieces and press.", sayShort: 'cxd4 — Nxd4 hits c6, develop bishop.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::Ng6@11': {
    intro: { say: "Ng6 — Black swings the knight kingside after …a6. Strike the centre with d4, opening lines for your better-developed pieces; if …cxd4 recapture and your rook on e1 and light bishop spring to life. h4-h5 is even possible to harass the g6-knight in some lines. White's central break and space give the pull — expand and press.", sayShort: 'Ng6 — d4 break, then press centre.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::Qxd5@13': {
    intro: { say: "Qxd5 — Black recaptures with the queen, exposing it to attack. Hit it with Nc3, gaining a tempo, then d4 seizing the centre while the queen scurries away; every move you make develops with a threat. The early queen sortie hands White free time and a strong centre — chase the lady and build. Black's structure is fine but White is comfortably ahead in development.", sayShort: 'Qxd5 — Nc3 with tempo, then d4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::b6@11': {
    intro: { say: "b6 — Black readies …Bb7 to fight for e4. Answer d4 in the centre, and if …cxd4 recapture keeping the strong pawn on d4; your rook on e1 and the f1-bishop stand ready to exploit the open lines. Meet …Bb7 by holding e4 with Nc3, then expand — White's space edge and harmonious pieces promise the better game. Solid central play.", sayShort: 'b6 — d4 centre, then hold e4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::Be7@15': {
    intro: { say: "Be7 — Black develops the bishop, ignoring the central tension. Challenge the d5-knight with Nc3, and after it retreats or trades you gain time to complete development with Bd3 and Be3; keep the d4-pawn as a spearhead or resolve with dxc5 when it suits. White's lead in development and central space give a steady edge — hit the knight, mobilise, and press.", sayShort: 'Be7 — Nc3 hits d5, then develop.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::1::cxd4@19': {
    intro: { say: "cxd4 — Black releases the tension in this Maróczy-flavoured structure. Recapture Nxd4, and with your pawn on c4 you clamp the d5-square, denying Black the freeing …d5 break; the knight on d4 is a monster and your bishops eye the centre. Build with Nc3 and Rc1, pressure down the c-file, and squeeze — White's space and the bind give a lasting, pleasant edge.", sayShort: 'cxd4 — Nxd4, clamp d5 with c4.' }, sources: SROSS,
  },
  // ===== Moscow Variation (Bb5+ vs …d6) (student WHITE) =====
  'pro-aman-rossolimo::2::Bd7@5': {
    intro: { say: "Bd7 — the Moscow main line, Black blocking the check. Trade Bxd7+ and after …Qxd7 castle; you have swapped off Black's good light bishop and can now build with c3 and d4, or clamp with c4 for a Maróczy Bind. The trade eases development and leaves you a small, riskless space edge to nurse. Slow, positional Anti-Sicilian pressure.", sayShort: 'Bd7 — Bxd7+, O-O, then c3 and d4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::Nc6@5': {
    intro: { say: "Nc6 — Black blocks the check with the knight, transposing toward Rossolimo waters. Castle, then decide the bishop: Bxc6 doubling Black's pawns for a structural target, or keep it and build with c3 and d4. Either way you steer into a comfortable Anti-Sicilian where White's easy development and central space give the pull. No theory to fear — mobilise and press.", sayShort: 'Nc6 — O-O, then Bxc6 or d4.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::e5@11': {
    intro: { say: "e5 — Black claims the centre after chasing your bishop to a4. Prepare the d4 break: castle, then d4 striking at the e5-pawn, and if …b5 the bishop drops to c2 eyeing the kingside. Black's big centre can become overextended once you undermine it with d4 and the pieces converge on d5 and f5. White plays for the central break and the better structure.", sayShort: 'e5 — O-O, then d4 undermines centre.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::a6@7': {
    intro: { say: "a6 — Black harasses the bishop before completing development. Retreat Ba4, keeping the piece and the pressure on the d7-knight and c6, then build the centre with d4 and castle; the bishop on a4 can later reroute via c2 toward the kingside. White develops smoothly and prepares the d4 break for a lasting space edge. Steady, positional Anti-Sicilian play.", sayShort: 'a6 — Ba4, then d4 and O-O.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::e5@13': {
    intro: { say: "e5 — Black grabs the centre after …b5 chased your bishop to c2. The bishop on c2 now rakes toward h7, so prepare d4 to strike the e5-point while castling; a4 is a useful lever against the …b5 pawn. Black's broad centre invites undermining — hit it with d4, open lines for your active bishop, and target the loosened queenside. White plays for the break and the initiative.", sayShort: 'e5 — d4 strikes centre, bishop eyes h7.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::e6@11': {
    intro: { say: "e6 — Black chooses a solid, restrained setup. Take the space you are handed: castle, play d4 in the centre, and develop Rd1 and Nbd2 behind it; your bishop on a4 can swing to c2 toward the kingside. With Black's pieces passive, White's central majority and freer development give a comfortable, riskless pull. Build up patiently and pick the moment for d4-d5 or e4-e5.", sayShort: 'e6 — O-O and d4, then Rd1.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::e6@15': {
    intro: { say: "e6 — Black completes a solid …Bb7 and …e6 setup. Break with d4 in the centre, meeting …Bb7's pressure on e4 by defending soundly with Nbd2 and Re1; your bishop on c2 eyes the kingside. Once the centre opens, your better-coordinated pieces and space tell. White plays for the d4 break and a slow kingside build against Black's restrained structure. Patient, promising positional play.", sayShort: 'e6 — d4 break, Nbd2 and Re1.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::Qc7@11': {
    intro: { say: "Qc7 — Black develops the queen, eyeing …e5 and the c-file. Continue O-O and prepare d4, defending e4 with Rd1 and Nbd2 as needed; if …e5 comes, the d4 break undermines it. The bishop on a4 reroutes to c2 for kingside chances. White simply completes development and strikes with d4 for the central edge — no theory, just sound play and a lasting pull.", sayShort: 'Qc7 — O-O, then d4 and Rd1.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::g6@11': {
    intro: { say: "g6 — Black heads for a King's-Indian-style fianchetto with …Bg7. Seize the centre before it is challenged: d4 and O-O, building a broad pawn front, then Rd1 and Nbd2; meet …Bg7's pressure on d4 by overprotecting or advancing d4-d5 to gain space. White's central majority against the fianchetto gives the better game — clamp the centre and expand. Sound, strategic play.", sayShort: 'g6 — d4 and O-O, seize centre.' }, sources: SROSS,
  },
  'pro-aman-rossolimo::2::e5@15': {
    intro: { say: "e5 — Black stakes out the centre after …b5 and …Bb7. Undermine at once with d4, striking the e5-pawn while your c2-bishop rakes toward h7; a4 pries at the …b5 pawn and opens the queenside. Black's broad but loose pawn front becomes a cluster of targets once you break — open lines for your active bishop and rooks. White plays for the initiative and the central break. Dynamic, rewarding play.", sayShort: 'e5 — d4 undermines, then a4 hits b5.' }, sources: SROSS,
  },
};
