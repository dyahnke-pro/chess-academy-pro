import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Samay Raina repertoire, batch B: Ruy Lopez, Italian,
// French Exchange, Caro-Kann (Accelerated Panov + Exchange), King's Gambit
// (student WHITE); Scandinavian (student BLACK). House voice, board-safe,
// line-grounded. Every entry answers the opponent's frequent deviation with the
// student-side plan.

const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const ITAL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'];
const FR = ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'];
const CK = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const SC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const KG = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'];

export const SUBLINE_NARRATION_PRO_SAMAY_B: Record<string, SublineNarration> = {
  // ===== Ruy Lopez (student WHITE) =====
  'pro-samayraina-ruy::0::Be7@9': {
    intro: { say: "Be7 — the Rio de Janeiro, Black tucking the bishop instead of defending the e4-knight with …Nd6. Regain the pawn cleanly: Qe2 pins toward e4, then Rd1 and dxe5, and the loose knight on e4 has nowhere safe to sit. You keep the bishop pair and the healthier centre, a comfortable, well-mapped Open Ruy.", sayShort: 'Be7 — Qe2 and Rd1, regain e4.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Bg4@9': {
    intro: { say: "Bg4 — Black pins the f3-knight in the Exchange. This is a battle of majorities: your clean four-against-three on the kingside can make a passed pawn, while Black's doubled c-pawns cripple the queenside three. Play h3 to question the bishop, then d3, Nbd2 and steer toward the endgame where the healthy majority tells.", sayShort: 'Bg4 — h3, then trade into the endgame.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Qd6@9': {
    intro: { say: "Qd6 — the Bronstein, centralising the queen to hold e5 and eye long castling. Develop with tempo: Na3 heading to c4 hits the queen, or d3 and Be3, Nbd2. Your trump never changes — the sound kingside majority against Black's crippled doubled pawns. Trade pieces and press the endgame.", sayShort: 'Qd6 — Na3-c4, then press the majority.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Bg4@11': {
    intro: { say: "Bg4 — after …f6 propped e5, Black pins to defend it. Strike with dxe5 fxe5, saddling Black with a shaky centre, then h3 to break the pin; your kingside majority and Black's ragged pawns point straight at a winning endgame. Simplify and grind.", sayShort: 'Bg4 — dxe5 and h3, then grind.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Qf6@9': {
    intro: { say: "Qf6 — Black guards e5 with the queen, a slightly awkward post. Gain time with Be3 and Nbd2, or d4 opening lines against the exposed lady; keep it simple and reach the endgame where your intact kingside majority beats the doubled c-pawns. Patience converts the structural edge.", sayShort: 'Qf6 — Be3 and Nbd2, target queen.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Bd6@9': {
    intro: { say: "Bd6 — Black over-protects e5 with the bishop. Chase it and gain space: Na3-c4 hits d6, or play d4 straightaway to challenge the centre. Whatever Black does, the endgame beckons — your kingside four-on-three makes a passer while the queenside majority stays frozen by the doubled pawns.", sayShort: 'Bd6 — Na3-c4, aim for the endgame.' }, sources: RUY,
  },
  'pro-samayraina-ruy::1::Ne7@9': {
    intro: { say: "Ne7 — Black reroutes the knight toward g6 to guard and eye f4. Just build: d4 to open the centre, Nc3 and Re1, keeping the two bishops. The Exchange verdict holds — trade down and your healthy kingside majority outweighs the crippled doubled c-pawns in the ending.", sayShort: 'Ne7 — d4 and Nc3, then simplify.' }, sources: RUY,
  },
  'pro-samayraina-ruy::2::exd4@7': {
    intro: { say: "exd4 — Black releases the centre early in the Steinitz. Recapture Nxd4, and your knight sits proudly in the middle while Nc3, O-O and Re1 finish development. Black's cramped, passive setup gives you a lasting space edge; probe patiently and the extra room does the work.", sayShort: 'exd4 — Nxd4, then Nc3 and O-O.' }, sources: RUY,
  },
  'pro-samayraina-ruy::2::exd4@11': {
    intro: { say: "exd4 — Black finally clears the tension after a slow build. Take back with Nxd4, keeping the strong central knight and the freer game; add Re1 and the classic Ruy bind. The Steinitz leaves Black passive, so press the space and open the position when your pieces are ready.", sayShort: 'exd4 — Nxd4, keep the space bind.' }, sources: RUY,
  },
  'pro-samayraina-ruy::2::exd4@9': {
    intro: { say: "exd4 — Black trades in the centre in the Steinitz. Recapture Nxd4; the centralised knight, extra space and easy development are all yours, while Black's game stays cramped behind …d6. Continue O-O and Re1, then expand or open lines to make the room count.", sayShort: 'exd4 — Nxd4, O-O and Re1.' }, sources: RUY,
  },
  'pro-samayraina-ruy::2::Nxd4@15': {
    intro: { say: "Nxd4 — Black swaps knights in the centre. Recapture with the queen, Qxd4, and she dominates from the middle of the board with more space behind her. Black remains passive; centralise your rooks, keep the bishop pair option, and turn the spatial edge into pressure across the board.", sayShort: 'Nxd4 — Qxd4, dominate the centre.' }, sources: RUY,
  },
  'pro-samayraina-ruy::2::Nge7@9': {
    intro: { say: "Nge7 — Black reroutes toward g6 to blunt your centre. Grab space with d5, clamping the position, or develop calmly with Be3 and O-O; either way the cramped Steinitz hands White an easy, risk-free pull. Fix the structure, then build on the side where you are stronger.", sayShort: 'Nge7 — d5 clamps, or Be3 and O-O.' }, sources: RUY,
  },

  // ===== Italian Game (student WHITE) — Giuoco Pianissimo / Hungarian =====
  'pro-samayraina-italian::0::h6@7': {
    intro: { say: "h6 — Black stops Bg5 and Ng5 before castling. Build the quiet Italian the standard way: c3, O-O and Nbd2, then the Nf1-g3 reroute, all aimed at the d4 break when your pieces are perfectly placed. The extra central space and tempo give a risk-free, durable pull.", sayShort: 'h6 — c3, O-O, then reroute and d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::d6@9': {
    intro: { say: "d6 — Black settles into a solid Pianissimo. Continue Re1, Nbd2 and h3, then Nf1-g3, preparing d4 the moment Black commits. Slow manoeuvring is White's friend here: the space edge and the smooth knight reroute give the better game with no risk whatsoever.", sayShort: 'd6 — Re1 and Nbd2, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::h6@13': {
    intro: { say: "h6 — a late luft in the Pianissimo. Complete the plan: Nbd2-f1-g3 brings the knight to its dream square, then d4 strikes the centre with everything ready. White's patience is rewarded — the extra space and the better-placed pieces decide a slow game.", sayShort: 'h6 — reroute Nbd2-f1-g3, then strike d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::Kh8@13': {
    intro: { say: "Kh8 — Black tucks the king, often eyeing …Ng8 and …f5. Do not be rushed: Nbd2, Nf1-g3 and h3, then break with d4 before Black gets …f5 rolling. Your central space and the lead in the reroute keep the initiative firmly in White's hands.", sayShort: 'Kh8 — Nbd2 and Nf1-g3, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::Bg4@13': {
    intro: { say: "Bg4 — Black pins the f3-knight before you can play d4. Question it at once: h3, and after …Bh5 or …Bxf3 you keep the bishop pair and continue Nbd2 toward the reroute. Break with d4 when the pin is resolved; the quiet Italian still favours White's space.", sayShort: 'Bg4 — h3 breaks it, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::a6@13': {
    intro: { say: "a6 — Black prepares …b5 to hit your c4-bishop, or …Na5. Meet it flexibly: a4 to clamp the queenside, or simply Nbd2 continuing the reroute and Bb3 sidestepping. Keep the centre coiled and unleash d4 when your knight reaches g3 and everything points inward.", sayShort: 'a6 — a4 clamps, then reroute and d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::Bd7@15': {
    intro: { say: "Bd7 — after …Na5 hit your bishop and you dropped back to b5, Black defends. Keep the tension with c3 and Nbd2; the knight on a5 is offside, so break with d4 and centralise while it languishes on the rim. White's harmony and the coming d4 give a pleasant edge.", sayShort: 'Bd7 — Nbd2 and d4, exploit offside knight.' }, sources: ITAL,
  },
  'pro-samayraina-italian::0::c5@15': {
    intro: { say: "c5 — Black grabs queenside space, but the …Na5 knight is stranded on the rim. Play Nbd2 and prepare d4, opening the centre while Black's offside knight watches; a4 can also fix the queenside. The better-coordinated army and the central break hand White the initiative.", sayShort: 'c5 — Nbd2 and d4, punish offside knight.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::d6@9': {
    intro: { say: "d6 — Black plays the solid Hungarian setup with the bishop already on e7. Continue Re1, Nbd2 and c3, then the Nf1-g3 reroute, all building toward d4. It transposes to familiar Pianissimo waters where White's space and smooth development give an easy, lasting pull.", sayShort: 'd6 — Re1, Nbd2, then reroute and d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::h6@13': {
    intro: { say: "h6 — a luft in the Hungarian Italian. Bring the knight home to roost: Nbd2-f1-g3, then prepare d4 at the ideal moment. The slow structure rewards White's extra central space and better piece placement; break only when everything is aimed at the centre.", sayShort: 'h6 — Nbd2-f1-g3, then break d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::Kh8@13': {
    intro: { say: "Kh8 — Black tucks the king in the Hungarian. Continue the plan calmly: Nbd2 and Nf1-g3, h3 for safety, then d4 to strike before …f5 arrives. White's space and the well-placed pieces keep the pull; patience beats haste in the Pianissimo.", sayShort: 'Kh8 — Nbd2 and Nf1-g3, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::Bg4@13': {
    intro: { say: "Bg4 — Black pins the f3-knight to disrupt your d4 plans. Ask the question with h3; keep the bishop pair after …Bh5, then Nbd2 and the reroute continue. Once the pin is settled, d4 opens the centre in White's favour with the extra space intact.", sayShort: 'Bg4 — h3, keep bishops, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::a6@13': {
    intro: { say: "a6 — Black readies …b5 against your bishop in the Hungarian. Answer a4 to clamp, or slip the bishop to b3 and play on; Nbd2 and Nf1-g3 continue toward d4. The centre stays flexible and White breaks at the perfect moment with a comfortable game.", sayShort: 'a6 — a4 clamps, then d4 break.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::Bd7@15': {
    intro: { say: "Bd7 — with the …Na5 knight shoved to the rim and your bishop back on b5, Black tidies up. Keep the tension: c3, Nbd2 and h3, then d4, striking while the a5-knight sits offside. White's harmony and the central break give a nagging, risk-free edge.", sayShort: 'Bd7 — c3 and Nbd2, then d4.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::c5@15': {
    intro: { say: "c5 — Black seizes queenside space but leaves the …Na5 knight stranded. Play Nbd2 and prepare d4, cracking the centre while the rim knight is out of play; a4 fixes the queenside if you prefer. Better coordination and the break keep the initiative with White.", sayShort: 'c5 — Nbd2 and d4, target rim knight.' }, sources: ITAL,
  },
  'pro-samayraina-italian::1::d6@7': {
    intro: { say: "d6 — the pure Hungarian, Black staying solid and compact early. Build unhurried: c3, O-O and Nbd2, then Nf1-g3 and the d4 break. Black's passive setup gives White free rein to expand; the space edge and the coming central strike promise a comfortable, pressing game.", sayShort: 'd6 — c3, O-O, Nbd2, then d4.' }, sources: ITAL,
  },

  // ===== French Defense: Exchange Variation (student WHITE) =====
  'pro-samayraina-french-white::0::h6@15': {
    intro: { say: "h6 — deep in the symmetric Exchange, both sides castled. Symmetry is not a draw sentence: contest the e-file with Re1, and manoeuvre for the better minor piece — Bf4 or Bg5, then Ne2-g3-f5 eyeing the outpost. Outplay, do not out-wait; the side that seizes the file and the good knight presses.", sayShort: 'h6 — Re1, then Ne2-g3-f5 outpost.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nc6@7': {
    intro: { say: "Nc6 — Black develops naturally in the Exchange. Show the point of Bd3: play c3, Qf3 pressuring d5 and f7, then Ne2 heading to g3 or f4. Do not settle for symmetry — the queen sortie and the knight reroute build a real kingside initiative from a level structure.", sayShort: 'Nc6 — c3, Qf3, then Ne2-g3.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::c6@15': {
    intro: { say: "c6 — Black solidifies d5 and shores up the queenside. Keep pieces active: Nbd2, Qc2 and the e-file with Re1, angling for a knight to f5 or an eventual b4 minority push. The position is balanced, so play for the small imbalance and the better-placed pieces.", sayShort: 'c6 — Nbd2 and Qc2, press the file.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::c5@7': {
    intro: { say: "c5 — Black strikes at d4, and after Nf3 …c4 he gains space but releases the central tension. That hands you a free hand in the middle: retreat Be2, castle, then undermine with b3 and play f3-e4, or plant a knight on e5. The over-extended c4-pawn becomes a target.", sayShort: 'c5 — Be2 and b3, hit c4.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nf6@7': {
    intro: { say: "Nf6 — Black mirrors development in the Exchange. Keep it lively: O-O, Re1 and Bg5 pinning the knight, with c3 and Nbd2 to follow. The structure is symmetric but the initiative is not — grab the e-file and the better minor piece and press for the small edge.", sayShort: 'Nf6 — O-O, Re1, Bg5 pin.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nf6@9': {
    intro: { say: "Nf6 — Black completes a symmetric setup. Play O-O and Re1 to claim the open e-file, then Bg5 to trade or provoke a weakness, and reroute a knight toward f5. Symmetry favours whoever acts first; White's lead in activity is the imbalance to nurse.", sayShort: 'Nf6 — O-O and Re1, seize e-file.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nc6@9': {
    intro: { say: "Nc6 — Black develops the queenside knight. Continue c3, O-O and Re1, then Bg5 and Nbd2, keeping the pieces pointed at the kingside. The Exchange is only drawish if you allow it — press the e-file and manoeuvre for the superior minor piece to keep winning chances.", sayShort: 'Nc6 — c3, O-O, Re1, then Bg5.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Nbc6@15': {
    intro: { say: "Nbc6 — Black brings the last knight out in the deep Exchange. Activate the queen: Nbd2 and Qb3, hitting d5 and b7, then double on the e-file. Balanced but far from lifeless — the pressure on the queenside and the file keeps Black passive while White probes for the win.", sayShort: 'Nbc6 — Nbd2 and Qb3, hit d5.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Ng6@15': {
    intro: { say: "Ng6 — Black reroutes the knight toward f4 and h4. Do not let it settle: h3 and Nf1-g3 mirror the plan, contesting f5, while Re1 grips the e-file. Play for the better minor piece and the open line; the symmetry breaks for the more active side, and that is White.", sayShort: 'Ng6 — h3 and Nf1-g3, contest f5.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::h6@15': {
    intro: { say: "h6 — a small luft deep in the Exchange. Keep improving: Nbd2, Qc2 and Re1, angling a knight toward f5 and probing the queenside with b4 later. The position is level, so the plan is patience plus activity — squeeze the tiny edge from the more purposeful pieces.", sayShort: 'h6 — Nbd2 and Qc2, then Nf5.' }, sources: FR,
  },
  'pro-samayraina-french-white::1::Bg4@9': {
    intro: { say: "Bg4 — Black pins your f3-knight in the Exchange. Question it with h3; after …Bh5 or …Bxf3 you keep options and the bishop pair, then c3, O-O and Nbd2. Do not fear the symmetry — keep pieces on the board and play for the better minor piece and the file.", sayShort: 'Bg4 — h3, then c3 and O-O.' }, sources: FR,
  },

  // ===== Caro-Kann (student WHITE) — Accelerated Panov + Exchange =====
  'pro-samayraina-caro-white::0::Nd7@7': {
    intro: { say: "Nd7 — Black plays a French-style block against your Accelerated Panov. Your trump is space: after d4 and Nf3, complete with Be2 or Bd3 and O-O, and the e5-wedge cramps Black badly. Meet the freeing …c5 and …f6 breaks with calm support, and let the extra room do the work.", sayShort: 'Nd7 — d4 and Nf3, keep the space.' }, sources: CK,
  },
  'pro-samayraina-caro-white::0::dxc4@7': {
    intro: { say: "dxc4 — Black gives up the centre tension. Recapture Bxc4, and your bishop rakes the a2-g8 diagonal at f7 while d4 and e5 grip the board. Develop with Nf3 and O-O; when Black posts …Nd5, challenge it with Ne4 or Bd2. Space and the active bishop give a pleasant, pressing game.", sayShort: 'dxc4 — Bxc4, then d4 and Nf3.' }, sources: CK,
  },
  'pro-samayraina-caro-white::0::Bb4@7': {
    intro: { say: "Bb4 — Black pins and heads for …Bxc3, damaging your pawns. Accept the bargain: after a3 …Bxc3+ bxc3 you own a massive c3-d4-e5 centre and the two bishops, worth far more than the doubled pawns. Play f4, Nf3 and Bd3, then roll the centre and attack on the kingside.", sayShort: 'Bb4 — bxc3, big centre and bishops.' }, sources: CK,
  },
  'pro-samayraina-caro-white::0::f5@7': {
    intro: { say: "f5 — Black locks the centre and buries his light-squared bishop behind e6. Play on the wings where you are stronger: after d4, f4 and Nf3, prepare the c5 clamp or a kingside build with g3 and Bh3, hitting the sore e6-pawn. Black's bad bishop is a lasting weakness.", sayShort: 'f5 — d4 and Nf3, target bad bishop.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Qc7@9': {
    intro: { say: "Qc7 — Black eyes …Bg4 and central breaks in the Exchange. Sidestep the pin with Ne2, then f3 and O-O, and trade the good bishop with Bf4; add Qc2 and the slow pressure. Your extra tempo and the plan of a minority attack with b4-b5 give the classic Exchange pull.", sayShort: 'Qc7 — Ne2 and Bf4, then Qc2.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Nf6@7': {
    intro: { say: "Nf6 — Black develops in the Exchange. Grab the initiative with Qb3, pressuring b7 and d5, then Bf4 to trade the good bishop and Nd2-f3. The minority attack with b4-b5 looms on the queenside; Black stays tied to his weaknesses while White presses on both flanks.", sayShort: 'Nf6 — Qb3 and Bf4, press queenside.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::g6@9': {
    intro: { say: "g6 — Black fianchettoes to fight for the long diagonal. Complete calmly: Nf3, O-O and Re1, then Bf4 or Bg5, and prepare the b4-b5 minority attack against the c6-square. The Exchange edge is small but real — press the queenside and keep the better structure.", sayShort: 'g6 — Nf3, O-O, then minority attack.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Qc8@13': {
    intro: { say: "Qc8 — the Rubinstein, Black defending b7 passively. Develop with the initiative: Nd2, Ngf3 and O-O, keeping the queen active on b3 and the bishop on f4. Black is cramped nursing d5 and b7, so improve your pieces and probe the queenside; the passive queen is your cue to press.", sayShort: 'Qc8 — Nd2 and Ngf3, keep pressing.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::g6@11': {
    intro: { say: "g6 — Black fianchettoes late after …Nf6 and your Bf4. Continue h3, Nd2 and Ngf3, keeping Qb3 eyeing b7 and d5. Aim the minority attack b4-b5 at the queenside pawns; the Exchange gives White a risk-free structural pull to grind from both wings.", sayShort: 'g6 — h3, Nd2, Ngf3, keep Qb3.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Bxf3@17': {
    intro: { say: "Bxf3 — Black trades the light bishop for your knight. Recapture Nxf3, keeping a clean structure and the bishop pair in an open Exchange position. With Black's good bishop gone, target the light squares and d5, castle, and roll the queenside minority attack. The two bishops give a durable edge.", sayShort: 'Bxf3 — Nxf3, keep the bishop pair.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::e6@9': {
    intro: { say: "e6 — Black locks his own light-squared bishop inside the chain. Exploit it: Bf4 to trade the good bishop and meet …Bd6 with Bxd6, then Qc2, Nd2-f3 and O-O. Black is left with the bad bishop and a passive game; press d5 and the queenside minority attack.", sayShort: 'e6 — Bf4, trade, then punish bad bishop.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::Na5@13': {
    intro: { say: "Na5 — Black hits your queen and dreams of …Nc4. Do not oblige: retreat Qc2, keeping the pressure, then play b4, kicking the knight back to the rim where it is offside. Continue Nd2 covering c4 and develop; the misplaced knight leaves White pressing comfortably on the queenside.", sayShort: 'Na5 — Qc2, then b4 kicks it.' }, sources: CK,
  },
  'pro-samayraina-caro-white::1::e5@13': {
    intro: { say: "e5 — Black strikes the centre to break free, but it leaves d5 weak. Take with dxe5, and the d5-pawn is isolated and already eyed by Qb3; blockade it with Nd2-b3 or Bf4, and pile up. Black's freeing bid hands White a lasting target and the better game.", sayShort: 'e5 — dxe5, then blockade weak d5.' }, sources: CK,
  },

  // ===== Scandinavian Defense (student BLACK) =====
  'pro-samayraina-scandi::0::Bc4@6': {
    intro: { say: "Bc4 — White aims the bishop at f7 in the main line. Complete the solid Scandi setup: …Nf6, …c6 giving the queen a home, then …Bf5 or …Bg4 developing the light bishop outside the chain, and …e6 with …Nbd7. Neutralise the c4-bishop with …e6 and later …b5; a rock-solid, comfortable game.", sayShort: 'Bc4 — …Nf6 and …c6, then …Bf5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Nf3@6': {
    intro: { say: "Nf3 — White develops naturally against your …Qa5 Scandi. Follow the classic path: …Nf6, …c6, …Bf5 getting the bishop active before …e6, then …Nbd7, …e6 and …Bd6 or …Be7 with castling. Solid and harmonious — you finish development smoothly and have no weaknesses to nurse.", sayShort: 'Nf3 — …Nf6, …c6, then …Bf5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Qe2@14': {
    intro: { say: "Qe2 — the Mieses, White preparing long castling. Keep pace: …Nbd7, …Bd6 or …Be7, and castle, ready for an opposite-wings race. If White goes queenside, push …b5 and …a5 to open lines at his king; your queen on a5 already eyes that flank. Solid structure, active plan.", sayShort: 'Qe2 — …Nbd7 and …Bd6, then …b5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Bd2@8': {
    intro: { say: "Bd2 — White unpins and readies queenside castling. Carry on developing: …c6, …Bf5, …e6 and …Nbd7, then …Bd6 and castle. Watch for opposite-side castling — if White goes long, meet it with …b5 and a queenside pawn push. The bishop on f5 outside the chain keeps you comfortable.", sayShort: 'Bd2 — …c6 and …Bf5, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::g3@6': {
    intro: { say: "g3 — White fianchettoes to pressure d5 and the long diagonal. Contest the light squares: …Nf6, …c6, then …Bg4 pinning the f3-knight to trade off White's key attacker, followed by …e6 and …Nbd7. Once the light-square pressure is neutralised, your solid structure equalises with ease.", sayShort: 'g3 — …Nf6, …c6, then …Bg4 pin.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Ne5@10': {
    intro: { say: "Ne5 — White plants a knight on e5 in the Mieses. Challenge it rather than fear it: …Be6 developing, then …Nbd7 hitting the intruder, and after it moves or trades you complete with …e6 and …Bd6. Black is solid; kick the e5-knight and your comfortable structure remains.", sayShort: 'Ne5 — …Be6 and …Nbd7, challenge it.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Bd2@10': {
    intro: { say: "Bd2 — White prepares to castle long in the Mieses. Develop with purpose: …Bf5 outside the chain, …e6, …Nbd7 and …Bd6, then castle. If White heads queenside, launch …b5 and …a5 to open lines at his king; the queen on a5 is already aimed there. Solid and flexible.", sayShort: 'Bd2 — …Bf5 and …e6, prepare …b5.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::Ne5@12': {
    intro: { say: "Ne5 — White jumps into e5 after your …Bf5. Stay calm and undermine: …e6, then …Nbd7 challenging the knight, and …Bd6 to complete. Trading or dislodging the e5-knight leaves you with a sound, harmonious Scandi and the well-placed bishop on f5. No need to hurry — just develop.", sayShort: 'Ne5 — …e6 and …Nbd7, undermine it.' }, sources: SC,
  },
  'pro-samayraina-scandi::0::O-O@12': {
    intro: { say: "O-O — White castles short in the Mieses main line. Match him: …e6, …Nbd7 and …Bd6, then …O-O, and only now contest the centre with …Ne4 or a timely …Bg4. Your bishop sits actively on f5 and the structure is rock-solid; complete development and play for the balanced middlegame.", sayShort: 'O-O — …e6, …Nbd7, …Bd6, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::Bxf7+@12': {
    intro: { say: "Bxf7+ — a desperate, unsound sacrifice. Because your bishop sits on f5, not g4, there is no Ne5+ fork to follow it: simply recapture …Kxf7, tuck the king to g8, and you are a clean piece up. Punish the overreach and convert the extra material.", sayShort: 'Bxf7+ — …Kxf7, up a clean piece.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::O-O@12': {
    intro: { say: "O-O — White castles and lets the …Bg4 pin stand. Develop naturally: …e6, …Nbd7 and …Bd6, then …O-O. With the pin in place you always have …Bxf3 to damage White's kingside if the f3-knight becomes important, or …Ne4 to contest the centre. A solid, flexible Valencian.", sayShort: 'O-O — …e6, …Nbd7, …Bd6, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::Be3@12': {
    intro: { say: "Be3 — White quietly supports d4. Continue your smooth setup: …e6, …Nbd7, …Bd6 or …Be7, and castle. Keep the …Bg4 pin as a resource — …Bxf3 doubling White's pawns is available whenever it helps. Nothing changes the plan; develop, castle, and the position is comfortably level.", sayShort: 'Be3 — …e6 and …Nbd7, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::Ne5@12': {
    intro: { say: "Ne5 — White jumps to a central outpost, and it hides a sting: the natural …Nbd7 walks into Bxf7 mate. Play …e6 first to shore up f7 and the light squares, then …Bd6 to challenge the knight head-on and finish developing; trade it off and your solid Scandinavian is comfortably level.", sayShort: 'Ne5 — …e6 first, then …Bd6.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::Bg5@12': {
    intro: { say: "Bg5 — White pins your f6-knight. Break it calmly: …e6, then …Be7 and …Nbd7, and castle, and if the pin nags play …h6 to question the bishop. You keep the …Bg4 pin in reserve too; both sides are developed and the position is balanced and solid for Black.", sayShort: 'Bg5 — …e6 and …Be7, then castle.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::gxf3@14': {
    intro: { say: "gxf3 — after …h3 forced the trade and …Bxf3, White recaptures with the pawn, shattering his own kingside and opening the g-file. Make the wreckage tell: …e6, …Nbd7, …Bd6 and …Qc7, then castle long, away from the damage, and probe the doubled f-pawns. The ruined structure is a lasting target.", sayShort: 'gxf3 — …e6 and …Bd6, castle long.' }, sources: SC,
  },
  'pro-samayraina-scandi::1::h3@10': {
    intro: { say: "h3 — White prevents the …Bg4 pin before you can play it. No matter: develop the bishop actively with …Bf5, then …e6, …Nbd7 and …Bd6 or …Be7, and castle. The light bishop sits happily outside the pawn chain and your Scandi is solid and fully coordinated. Comfortable equality.", sayShort: 'h3 — …Bf5 and …e6, then castle.' }, sources: SC,
  },

  // ===== King's Gambit (student WHITE) — Declined / Falkbeer =====
  'pro-samayraina-kings-gambit::0::Nf6@7': {
    intro: { say: "Nf6 — Black develops in the Declined, eyeing e4. Consolidate the centre: O-O, then d3 and Nc3 defending e4, keeping the f4-e5 tension. If Black grabs with …exf4, recapture and the half-open f-file plus the c4-bishop aim straight at f7. Your lead in development promises a lively initiative.", sayShort: 'Nf6 — O-O, d3, Nc3, guard e4.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::Be6@7': {
    intro: { say: "Be6 — Black offers to trade off your strong c4-bishop. Keep it working with Bb3, or take with Bxe6 fxe6, damaging Black's structure and opening the f-file. Then O-O, Nc3 and d3, and consider fxe5 to blast open the file; the bishop on the a2-g8 diagonal is your attacking asset.", sayShort: 'Be6 — Bb3 keeps it, or Bxe6 damages.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::h6@7': {
    intro: { say: "h6 — a slow move that spends a tempo on nothing. Resist the urge to lash out; the accurate course is the calm O-O, banking your lead in development while Black dawdles. Follow with Nc3, d3 and the fxe5 or f5 break; the wasted …h6 hands White an easy initiative and a clear lead in development for the gambit pawn.", sayShort: 'h6 — O-O is accurate, bank the lead.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::exf4@7': {
    intro: { say: "exf4 — Black grabs the pawn and braces with …g5 to hold it. Do not rush h4; the accurate move is d4, seizing a big centre, then O-O so every piece is ready before you strike. Only then break with h4 and Ne5; the premature lunge over-reaches, but the prepared assault crashes through.", sayShort: 'exf4 — d4 and O-O before h4.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::Nd4@9': {
    intro: { say: "Nd4 — the knight jumps in with the …Bg4 pin lurking behind it. Stay composed: c3 challenges the intruder at once, and if …Nxf3+ then gxf3 breaks the pin and opens the g-file toward Black's king. Your bishop on c4 keeps aiming at f7; do not fear the pin, keep developing and pressing.", sayShort: 'Nd4 — c3 challenges, do not fear pin.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::Nd4@13': {
    intro: { say: "Nd4 — Black plants the knight after both sides have developed. Kick it with c3, or trade it off, then complete with Be3 and Qd2; the fxe5 break opens the f-file for your rook. With the centre and the bishop pair, White keeps a comfortable, initiative-rich game.", sayShort: 'Nd4 — c3 kicks it, then fxe5.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::Nd4@11': {
    intro: { say: "Nd4 — Black leaps to d4 before finishing development. Meet it head-on with c3, hitting the knight; after it retreats or trades, continue the natural plan of Be3, Qd2 and fxe5, opening the f-file. The central grip and the c4-bishop bearing on f7 keep White pressing.", sayShort: 'Nd4 — c3, then Be3 and fxe5.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::Bxf3@9': {
    intro: { say: "Bxf3 — Black trades the bishop for your knight. Recapture Qxf3, and the queen swings to an aggressive post while the c4-bishop and the coming fxe5 both target f7. Add Nc3 and the open f-file after fxe5, and White has a powerful attacking setup for the pawn — the bishop pair and initiative are ample.", sayShort: 'Bxf3 — Qxf3, then fxe5, target f7.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::0::exf4@9': {
    intro: { say: "exf4 — Black finally snatches on f4 after you castled. Play d4 for the broad centre, then recover the pawn with Bxf4 or Rxf4; the Rf1 already bears down the half-open file at f7. With Nc3 and the bishop on c4, White enjoys a big centre and a dangerous attacking initiative.", sayShort: 'exf4 — d4, then Bxf4 regains it.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Be6@11': {
    intro: { say: "Be6 — Black defends the d5-knight and offers a trade on the diagonal. Develop with the initiative: O-O and Nc3, hitting d5, then Bxf4 recovering the gambit pawn; if bishops come off with Bxe6, the open f-file and lead in development favour White. The broad d4-centre gives a pleasant edge.", sayShort: 'Be6 — O-O, Nc3, then Bxf4 regains.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Bd6@9': {
    intro: { say: "Bd6 — Black develops the bishop toward your kingside and castles. Grab space with c4, hitting d5, then Nc3 and Bxf4 to reclaim the pawn; O-O completes it. The broad d4-c4 centre and the lead in development promise White a comfortable, pressing game against the Falkbeer.", sayShort: 'Bd6 — c4, Nc3, then Bxf4 regains.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Be7@11': {
    intro: { say: "Be7 — Black develops modestly against your Bc4. Finish quickly: O-O and Bxf4, recovering the pawn, then Nc3 hitting the d5-knight and Re1 down the file. With a strong d4-centre, the bishop pair option and a clear lead in development, White holds the initiative comfortably.", sayShort: 'Be7 — O-O, Bxf4, then Nc3.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Ne3@11': {
    intro: { say: "Ne3 — Black forks with the knight, but you are happy to trade: Bxe3 fxe3, and Black's f4-pawn vanishes while the e3-pawn is left weak and isolated. Open the f-file with your rook, round up e3 with Qd3 and Nc3, and the strong centre plus the files hand White the better game.", sayShort: 'Ne3 — Bxe3 fxe3, then round up e3.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::c6@9': {
    intro: { say: "c6 — Black challenges the d5-pawn. Simplify to your advantage: dxc6 Nxc6, then Bxf4 reclaiming the gambit pawn with a clean centre and a lead in development. Add Nc3 and Bc4, and Black's …c6 has merely cost time; White stands comfortably better with the healthier position.", sayShort: 'c6 — dxc6, then Bxf4 regains it.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Qxd5@9': {
    intro: { say: "Qxd5 — Black recaptures with the queen, bringing her out too early. Punish the tempo: Bxf4 regains the pawn, then Nc3 hits the d5-queen with gain of time, and O-O follows. Every developing move comes with a threat to the exposed lady; White seizes the initiative and the better game.", sayShort: 'Qxd5 — Bxf4, then Nc3 hits queen.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Qe7+@11': {
    intro: { say: "Qe7+ — Black checks, hoping to disrupt your king. Step up boldly with Kf2, a sound king move that shelters behind your own centre; the checks quickly run dry. Meet …Ne3 with Bxe3 fxe3, keep the two bishops and the strong d4-pawn, and White emerges better despite the missing castling rights.", sayShort: 'Qe7+ — Kf2, then Bxe3 meets …Ne3.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::c6@11': {
    intro: { say: "c6 — Black supports the d5-knight and readies …b5. Keep it simple: O-O, then Bxf4 recovering the pawn and Nbd2 or Nc3 developing with pressure on d5, and Re1 down the file. The broad d4-centre and your lead in development give White a comfortable, risk-free edge.", sayShort: 'c6 — O-O, Bxf4, then press d5.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Bg4@11': {
    intro: { say: "Bg4 — Black pins your f3-knight. Question it and carry on: O-O, then h3 to challenge the bishop, Bxf4 to reclaim the pawn, and Nc3 hitting the d5-knight. With the strong centre and the bishop on c4 eyeing f7, White keeps a lively initiative and the healthier position.", sayShort: 'Bg4 — O-O, h3, then Bxf4 regains.' }, sources: KG,
  },
  'pro-samayraina-kings-gambit::1::Nc6@11': {
    intro: { say: "Nc6 — Black develops and pressures d4. Shore it up and press: O-O, c3 supporting d4, then Bxf4 recovering the pawn and Nc3 hitting the d5-knight. The broad centre holds firm, and White's lead in development plus the active c4-bishop promise a comfortable, initiative-rich game.", sayShort: 'Nc6 — O-O, c3, then Bxf4 regains.' }, sources: KG,
  },
};
