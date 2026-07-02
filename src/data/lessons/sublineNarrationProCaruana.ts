import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Fabiano Caruana repertoire: Ruy Lopez + Italian
// (student WHITE); Nimzo-Indian, Taimanov Sicilian, French, Caro-Kann, King's
// Indian (student BLACK). House voice, board-safe, line-grounded. Every entry
// answers the opponent's frequent deviation with the student-side plan.

const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const ITAL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Italian_Game'];
const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const TAI = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const KID = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

// Shared Ruy deviations that recur across variation tabs.
const RUY_B5: SublineNarration = {
  intro: { say: "b5 — Black kicks the bishop early. Retreat Bb3, and after Black completes with …Be7 or …Bc5 play c3 and d4 for the broad centre; your bishop rakes the a2-g8 diagonal toward f7 and the extra tempo tells. A pleasant, familiar Ruy.", sayShort: 'b5 — Bb3, then c3 and d4.' }, sources: RUY,
};
const RUY_D6_7: SublineNarration = {
  intro: { say: "d6 — the Modern Steinitz. After O-O build with c3 and d4, and if …b5 comes retreat Bc2; you get a broad centre while Black's setup stays a touch passive. Space and the bishop pair give an easy, lasting edge.", sayShort: 'd6 — O-O, c3 and d4.' }, sources: RUY,
};

export const SUBLINE_NARRATION_PRO_CARUANA: Record<string, SublineNarration> = {
  // ===== Ruy Lopez (student WHITE) =====
  'pro-caruana-ruy-lopez::0::d6@13': {
    intro: { say: "d6 — Black locks the Closed Ruy. Play d4, then the classic manoeuvre Nbd2-f1-g3, rerouting the knight to the kingside while you squeeze on space. Your b3-bishop eyes f7; build slowly and press on both wings. This is the Ruy's long, rich middlegame.", sayShort: 'd6 — d4 and reroute Nbd2-f1-g3.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::0::b5@9': RUY_B5,
  'pro-caruana-ruy-lopez::0::Nxe4@9': {
    intro: { say: "Nxe4 — the Open Ruy. Break with d4, and after …b5 Bb3 d5 you reach the classic Open structure; pressure the centre with c3 and Nbd2 and Black's advanced e4-knight becomes a long-term target. Rich, well-mapped play with the safer king.", sayShort: 'Nxe4 — d4 and c3, hit e4.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::0::d6@7': RUY_D6_7,
  'pro-caruana-ruy-lopez::0::Bb7@15': {
    intro: { say: "Bb7 — Black meets your Anti-Marshall a4 by developing the bishop. Keep the tension with d3 and Nbd2, pressure b5 with axb5, and manoeuvre toward the d4 break; your solid setup sidesteps the Marshall entirely and holds a nagging edge.", sayShort: 'Bb7 — d3 and Nbd2, press b5.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::0::Rb8@15': {
    intro: { say: "Rb8 — Black defends b5 with the rook in the Anti-Marshall. Continue axb5 axb5, then d3, Nbd2 and c3, angling for d4; you keep the small, safe pull the Anti-Marshall is designed for, with no Marshall gambit counterplay in sight.", sayShort: 'Rb8 — axb5, then d3 and Nbd2.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::0::bxc3@19': {
    intro: { say: "bxc3 — Black opens the b-file deep in the Anti-Marshall. Recapture and use the half-open lines: your a5-pawn cramps the queenside, and the bishop pair plus central space give a durable edge. Play where you are stronger, on the queenside.", sayShort: 'bxc3 — recapture, press the queenside.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::Bc5@7': {
    intro: { say: "Bc5 — the Beverwijk Berlin, an active bishop instead of …Nxe4. Play c3 and d4, hitting the bishop and seizing the centre; once it retreats you have a comfortable, Italian-flavoured Ruy with more space and easy development.", sayShort: 'Bc5 — c3 and d4, seize centre.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::Be7@9': {
    intro: { say: "Be7 — the Rio Berlin, Black returning the pawn to develop. Recapture e4 with Qe2 or Re1, keep the bishop pair, and press with your central majority; a small, safe, lasting edge with the healthier structure.", sayShort: 'Be7 — regain e4, keep bishops.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::Ke8@17': {
    intro: { say: "Ke8 — the Berlin Wall king walk. In this queenless middlegame your trumps are the kingside pawn majority and the bishop pair; play Rd1, Bf4 or Bg5, Nc3 and roll the f- and g-pawns. Squeeze the endgame patiently — Black has no counterplay, only defence.", sayShort: 'Ke8 — press the kingside majority.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::Be7@17': {
    intro: { say: "Be7 — Black regroups in the Berlin endgame. Continue Rd1, Nc3, Bf4 and h3, developing with tempo and eyeing the d-file; the bishop pair and the healthy majority give White the pull to grind for a long time.", sayShort: 'Be7 — Rd1 and Nc3, grind.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::Be7@19': {
    intro: { say: "Be7 — Black completes the Berlin Wall regroup after …Bd7. You already have Rd1 in; add Nc3, Bf4 and Ne2-d4 or g4, expanding on the kingside where your majority lives. Nurse the two bishops and press the only imbalance that matters.", sayShort: 'Be7 — expand kingside, nurse bishops.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::h5@17': {
    intro: { say: "h5 — Black grabs kingside space to blunt your majority. Meet it with careful timing: h3 and g4, or Ne2-g3 hitting h5 and f5; your bishop pair still tells in the open endgame. Keep probing and the structural edge decides.", sayShort: 'h5 — Ne2-g3, target h5.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::1::h6@17': {
    intro: { say: "h6 — a small luft in the Berlin endgame. Just improve: Rd1, Nc3, Bf4 and the kingside majority rolls. With the two bishops and the better structure you hold the only winning chances; convert with patience.", sayShort: 'h6 — improve, roll the majority.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Be7@9': {
    intro: { say: "Be7 — the main Closed Ruy. Play Re1, c3 and d4 for the classic centre, then Nbd2-f1-g3 rerouting the knight to the kingside; the slow build and the b3-bishop's eye on f7 give White the long-term pull the Ruy is famous for.", sayShort: 'Be7 — Re1, c3, d4, then reroute.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::b5@9': RUY_B5,
  'pro-caruana-ruy-lopez::2::d6@7': RUY_D6_7,
  'pro-caruana-ruy-lopez::2::d4@19': {
    intro: { say: "d4 — Black clamps with the pawn in the Open Bernstein. Play against it: reroute with Nb3 or Ne4, dissolve with cxd4 at the right moment, and pressure the loose d-pawn; your bishop pair and Black's overextension hand White the better chances.", sayShort: 'd4 — reroute the knight, target d4.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Be7@17': {
    intro: { say: "Be7 — Black develops in the Open Bernstein. Continue Nb3, keeping the bishop pair, then Bf4 and Qe2 with pressure on the centre; the Open Ruy's slight structural pluses are yours to press, with the safer king.", sayShort: 'Be7 — Nb3 and Bf4, press.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Be7@11': {
    intro: { say: "Be7 — Black returns the pawn to develop in the Open. Recapture e4 with Re1 or Qe2, keep the bishop pair, and build with c3 and Nbd2; a comfortable, nagging edge and no weaknesses of your own.", sayShort: 'Be7 — regain e4, keep bishops.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Bg4@19': {
    intro: { say: "Bg4 — Black pins the f3-knight in the Bernstein Open. Break the pin with h3 or Be2, then press the d-pawn and the queenside majority; your bishop pair in the open position is the long-term trump. Keep it simple and strong.", sayShort: 'Bg4 — break the pin, press d4.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Bc5@17': {
    intro: { say: "Bc5 — the active bishop in the Open Bernstein. Play Nb3 hitting it, then c3 and Be3, trading or gaining tempo; you keep the bishop pair and the safer structure. Press calmly and the pluses accumulate.", sayShort: 'Bc5 — Nb3, then c3 and Be3.' }, sources: RUY,
  },
  'pro-caruana-ruy-lopez::2::Nxb3@19': {
    intro: { say: "Nxb3 — Black trades a bishop off with the knight. Recapture axb3, opening the a-file for your rook and healing toward a queenside majority; the two-bishop edge is gone, but the structure and the open file give White a pleasant, pressing game.", sayShort: 'Nxb3 — axb3, open the a-file.' }, sources: RUY,
  },

  // ===== Italian Game (student WHITE) — Giuoco Pianissimo =====
  'pro-caruana-italian::0::a6@9': {
    intro: { say: "a6 — Black prepares …Ba7 and …d6 in the Pianissimo. Build the standard way: O-O, Re1, Nbd2-f1-g3 rerouting, and prepare d4 the moment Black commits. Slow manoeuvring where White's extra tempo and central space tell.", sayShort: 'a6 — O-O, reroute Nbd2-f1-g3.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::a6@11': {
    intro: { say: "a6 — Black tucks the bishop's retreat and readies …Ba7. Continue Re1, Nbd2 and h3, then the Nf1-g3 reroute, aiming for the d4 break at the ideal moment; the quiet Italian gives White a risk-free, durable space edge.", sayShort: 'a6 — Re1 and Nbd2, then d4.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::O-O@9': {
    intro: { say: "O-O — Black castles in the Pianissimo. Mirror with O-O and Re1, then the Nbd2-f1-g3 reroute, aiming for d4 at the ideal moment; the extra central space and tempo give White a small but durable edge to press.", sayShort: 'O-O — Re1 and reroute, then d4.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::h6@7': {
    intro: { say: "h6 — Black stops Ng5 and Bg5 early in the Modern Bishop's setup. Continue c3, O-O and Nbd2, building toward d4; the quiet Italian gives White a risk-free space edge and easy, harmonious development.", sayShort: 'h6 — c3, O-O, then d4.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::a5@11': {
    intro: { say: "a5 — Black grabs queenside space and eyes …a4 to hit your b3-bishop. Meet it with a4 clamping, or Nbd2 and c3 continuing the reroute; keep the centre flexible and break with d4 when your pieces are ready.", sayShort: 'a5 — a4 clamps, then reroute.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::h6@11': {
    intro: { say: "h6 — a luft in the Pianissimo. Play Nbd2, Re1 and prepare d4; the position is a slow manoeuvring battle where White's central space and the lead in the knight reroute give the better game. Patience is rewarded.", sayShort: 'h6 — Nbd2 and Re1, then d4.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::a5@13': {
    intro: { say: "a5 — Black expands and threatens …a4. Answer a4 to fix the queenside, then Nbd2-f1-g3 and the d4 break; White keeps the initiative in a familiar, comfortable structure with the better-placed pieces.", sayShort: 'a5 — a4, then the d4 break.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::Bb6@11': {
    intro: { say: "Bb6 — Black tucks the bishop away from a coming d4. Continue Nbd2, Re1 and h3, preparing d4 with tempo; White's harmonious setup and the central break give a pleasant pull with no risk.", sayShort: 'Bb6 — Nbd2 and Re1, then d4.' }, sources: ITAL,
  },
  'pro-caruana-italian::0::h6@13': {
    intro: { say: "h6 — Black makes luft late. Complete the plan: Nbd2-f1-g3, then d4 striking the centre with everything ready; the slow Italian rewards White's extra space and better-placed pieces. Break at the perfect moment.", sayShort: 'h6 — reroute, then strike d4.' }, sources: ITAL,
  },

  // ===== Nimzo-Indian (student BLACK) — Rubinstein System =====
  'pro-caruana-nimzo-indian::0::Ne2@10': {
    intro: { say: "Ne2 — White sidesteps the doubled c-pawns, rerouting the knight toward g3. Strike the centre with …cxd4 and …d5 or …e5, opening lines for your active pieces before White consolidates; the Rubinstein gives Black a free, comfortable game.", sayShort: 'Ne2 — hit the centre, …cxd4.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::O-O@14': {
    intro: { say: "O-O — the Hübner Rubinstein, White castling behind the doubled c-pawns. Your plan is set: clamp with …e5, blockade on the dark squares, and pressure the c4- and c3-pawns; the crippled queenside is a permanent target. Slow, strategic, and pleasant for Black.", sayShort: 'O-O — clamp …e5, target c4.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::Nf3@8': {
    intro: { say: "Nf3 — White develops naturally in the Rubinstein. Continue …Bxc3+ doubling the pawns, or …O-O and …d5 keeping tension; either way you target the c-pawns and enjoy easy piece play. A reliable, well-tested equalizer.", sayShort: 'Nf3 — …Bxc3+ or …d5, easy game.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::a3@8': {
    intro: { say: "a3 — White forces the bishop to declare. Trade …Bxc3+, saddling White with doubled c-pawns, then blockade with …d6 and …e5 and pile on the weaknesses; the classic Nimzo bargain, and it falls in your favour.", sayShort: 'a3 — …Bxc3+, then blockade.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::a3@10': {
    intro: { say: "a3 — White nudges the bishop. Play …Bxc3+, and bxc3 hands you the standard target; follow with …d6, …e5 and …Na5 hitting c4. Black's play against the doubled pawns is easy and thematic.", sayShort: 'a3 — …Bxc3+, then …e5 and …Na5.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::h3@16': {
    intro: { say: "h3 — White makes luft in the locked Hübner. The structure is fixed, so manoeuvre: …Ne7-g6, …O-O and …Nh5 or …f5, working the kingside while the c-pawns stay weak. Patience and the blockade decide the game.", sayShort: 'h3 — manoeuvre …Ne7-g6, then …f5.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::Nd2@14': {
    intro: { say: "Nd2 — White reroutes toward c4-b3 and the e4 break. Meet it with …e5 first, locking the centre, then …O-O and …Ne7-g6; your dark-square blockade holds and the doubled pawns remain fixed targets.", sayShort: 'Nd2 — …e5 locks, then …Ne7-g6.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::Nd2@18': {
    intro: { say: "Nd2 — White heads for c4 and the queenside in the locked Hübner. Play …O-O, …Ng6 and prepare …f5, storming the kingside while White's doubled c-pawns and the closed centre keep him tied down. The race favours the blockading side.", sayShort: 'Nd2 — …Ng6, prepare …f5 storm.' }, sources: NIM,
  },
  'pro-caruana-nimzo-indian::0::O-O@18': {
    intro: { say: "O-O — White castles in the fully locked Hübner. Now …O-O and the thematic …f5 break: your kingside majority rolls while the c3-c4 pawns are frozen weaknesses. Blockade first, then attack the king.", sayShort: 'O-O — …f5, roll the majority.' }, sources: NIM,
  },

  // ===== Taimanov Sicilian (student BLACK) =====
  'pro-caruana-taimanov::0::g3@10': {
    intro: { say: "g3 — the fianchetto Taimanov, White eyeing the light squares. Answer …Bb4 pinning, then …Nf6 and …d5 breaking; you develop fast and fight for the centre before the bishop settles on g2. Active, balanced play.", sayShort: 'g3 — …Bb4, then …Nf6 and …d5.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::Be3@10': {
    intro: { say: "Be3 — the English-Attack Taimanov. Expand at once with …b5, …Bb7 and …Ne5 hitting the d3-bishop; your queenside space and the Sicilian counterplay give a sharp, double-edged game where Black's pawns roll first.", sayShort: 'Be3 — …b5 and …Bb7, expand.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::f4@10': {
    intro: { say: "f4 — White grabs kingside space, aiming for e5. Undermine with …b5 and …Bb7 on the long diagonal, and meet e5 with …dxe5 or a knight retreat; the overextended f- and e-pawns become targets for your fast queenside play.", sayShort: 'f4 — …b5 and …Bb7, undermine.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::f4@16': {
    intro: { say: "f4 — White launches the kingside pawns after the calm setup. You are ready: …d6, …Nbd7 and …b5, then meet e5 with the …dxe5 break; the fianchetto and queenside majority give Black the faster attack.", sayShort: 'f4 — …b5 and …d6, counter fast.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::Be3@16': {
    intro: { say: "Be3 — White completes development eyeing a kingside build. Play …d6, …O-O and …b5, with …Bb7 and …Nbd7 to follow; the Taimanov's flexible setup and queenside space give an easy, active middlegame.", sayShort: 'Be3 — …d6, …O-O, then …b5.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::Bg5@16': {
    intro: { say: "Bg5 — White pins toward your knight. Answer …O-O and …h6, questioning the bishop, then …b5 and …Bb7 with queenside play; the Taimanov absorbs the pin and counters where it is stronger.", sayShort: 'Bg5 — …h6, then …b5 and …Bb7.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::a3@12': {
    intro: { say: "a3 — White prevents …Bb4 and prepares a slow build. Just expand: …b5, …Bb7 and …d6, with the standard queenside pawn storm; White's tempo on a3 gives you the time to complete the Sicilian setup comfortably.", sayShort: 'a3 — …b5 and …Bb7, expand.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::a4@16': {
    intro: { say: "a4 — White clamps down on …b5. Adapt: …d6, …O-O and …Nbd7, then break with …b6 and …a6-b5 later, or shift to …e5 and the centre; the Taimanov is flexible, so counter wherever White has loosened. Balanced.", sayShort: 'a4 — …d6 and …O-O, reroute play.' }, sources: TAI,
  },
  'pro-caruana-taimanov::0::Be3@14': {
    intro: { say: "Be3 — White challenges your active bishop. Retreat …Be7 or trade …Bxe3, then play …d6, …O-O and …b5; you keep the sound structure and the queenside initiative the Taimanov promises. Comfortable, purposeful play.", sayShort: 'Be3 — …Be7 or trade, then …b5.' }, sources: TAI,
  },

  // ===== French (student BLACK) — Winawer / Advance / Tarrasch / Exchange =====
  'pro-caruana-french::0::Ne2@6': {
    intro: { say: "Ne2 — the Alekhine-Maróczy Gambit, White offering e4 for the bishop pair. Grab it with …dxe4, and after a3 retreat …Be7 rather than trade; you return the pawn with …Nf6 and reach a solid, comfortable French, a tempo's worth ahead.", sayShort: 'Ne2 — …dxe4, then …Be7 and …Nf6.' }, sources: FR,
  },
  'pro-caruana-french::0::Nf3@12': {
    intro: { say: "Nf3 — the Positional Winawer, White developing quietly after the pawns are fixed. Continue …Bd7, …Qa4 or …Nbc6 and …c4, clamping the queenside; your play against the doubled c-pawns and the …f6 break give the classic Winawer edge.", sayShort: 'Nf3 — …Bd7 and …c4, clamp.' }, sources: FR,
  },
  'pro-caruana-french::0::Bd2@8': {
    intro: { say: "Bd2 — the Bogoljubow, White unpinning to recapture on c3 with the bishop and keep the structure. Play …Ne7, …b6 and …Ba6, trading off your bad light bishop; you neutralise White's only edge and reach a healthy game.", sayShort: 'Bd2 — …Ne7 and …b6, trade bishops.' }, sources: FR,
  },
  'pro-caruana-french::0::h4@12': {
    intro: { say: "h4 — the sharp h4 Winawer, White grabbing kingside space. Play …Qc7 hitting e5 and …b6 with …Ba6, targeting the c-pawns and the e5-chain; the wild structure favours the side that strikes the base first, and that is you.", sayShort: 'h4 — …Qc7 and …b6, hit e5.' }, sources: FR,
  },
  'pro-caruana-french::0::a4@12': {
    intro: { say: "a4 — White gains queenside space and eyes Ba3. Continue …Nbc6, …Qa5 and …c4 or …f6, breaking at the head or the base of the chain; the doubled c-pawns stay weak and Black's plan runs itself.", sayShort: 'a4 — …Nbc6, then …c4 or …f6.' }, sources: FR,
  },
  'pro-caruana-french::0::Bd3@14': {
    intro: { say: "Bd3 — the Poisoned-Pawn Winawer declined, White developing instead of grabbing g7. Play …c4 hitting the bishop, then …Nbc6 and …f6, striking the chain; your queenside majority and White's shattered pawns give the better long-term game.", sayShort: 'Bd3 — …c4, then …Nbc6 and …f6.' }, sources: FR,
  },
  'pro-caruana-french::1::Na3@12': {
    intro: { say: "Na3 — White reroutes toward c2 to defend d4 in the Advance. Keep hitting the base: …cxd4 cxd4 and …Nf5, piling on d4 with …Qb6 and …Bd7-b5; the Advance chain cracks under the pressure. Play on the queenside.", sayShort: 'Na3 — …Nf5 and …Qb6, hit d4.' }, sources: FR,
  },
  'pro-caruana-french::1::a3@10': {
    intro: { say: "a3 — White prepares b4 and Bd3 in the Advance. Strike the head of the chain with …f6, opening lines for your pieces, while …Qb6 and …Nge7-f5 gang up on d4; the French counterattack against e5 and d4 is thematic and strong.", sayShort: 'a3 — …f6, then …Nf5 hits d4.' }, sources: FR,
  },
  'pro-caruana-french::1::Bd3@10': {
    intro: { say: "Bd3 — White develops the bishop in the Advance, but on d3 it bites on your solid chain. Play …Qb6, …Nh6-f5 and …cxd4, ganging up on d4; your pressure on the base outweighs White's kingside hopes.", sayShort: 'Bd3 — …Qb6 and …Nf5, target d4.' }, sources: FR,
  },
  'pro-caruana-french::1::dxc5@10': {
    intro: { say: "dxc5 — White releases the tension, handing you the d4-square. Recapture …Bxc5, and the bishop rakes toward f2 while …Nge7-g6 and …f6 pressure e5; with the chain gone Black is comfortably active.", sayShort: 'dxc5 — …Bxc5, then …f6 hits e5.' }, sources: FR,
  },
  'pro-caruana-french::2::Bd3@6': {
    intro: { say: "Bd3 — the Morozevich Tarrasch, White developing actively. Strike …c5 at once, and after dxc5 regain the pawn with …Nf6 and …Nbd7; you free your game and reach an open, comfortable French with no bad bishop.", sayShort: 'Bd3 — …c5, then …Nf6 regains it.' }, sources: FR,
  },
  'pro-caruana-french::2::Bd3@10': {
    intro: { say: "Bd3 — the main Morozevich tabiya, White clamping with e5 and aiming the bishop at your king. Counter the centre: …c5, …Nc6 and …Qb6, hammering d4 and e5, with the …f6 break to follow. Black's counterplay is fast and sound.", sayShort: 'Bd3 — …c5 and …Qb6, hit d4.' }, sources: FR,
  },
  'pro-caruana-french::2::Bd3@8': {
    intro: { say: "Bd3 — White develops before committing the centre. Break with …c5 immediately, then …Nc6 and …cxd4; you open the position for your pieces before White plays e5, reaching an easy, active game.", sayShort: 'Bd3 — …c5 and …Nc6, open up.' }, sources: FR,
  },
  'pro-caruana-french::2::e5@6': {
    intro: { say: "e5 — White grabs the centre early in the Tarrasch. Undermine at once with …c5 and …Nc6, then …Qb6 and …f6, striking the base and the head of the chain; the classic French plan against e5-d4 gives full counterplay.", sayShort: 'e5 — …c5 and …Nc6, undermine.' }, sources: FR,
  },
  'pro-caruana-french::2::c3@6': {
    intro: { say: "c3 — White props d4 quietly. Play …c5 and after dxc5 …Bxc5, developing the bishop actively toward f2, then …Nf6 and …O-O; you equalise cleanly with the freer game and no bad bishop.", sayShort: 'c3 — …c5, then …Bxc5 active.' }, sources: FR,
  },
  'pro-caruana-french::2::c4@10': {
    intro: { say: "c4 — White strikes at your centre in the Tarrasch. Hold with …c5 and …Nc6, keeping the d5-e6 chain and pressuring d4; the tension favours Black, whose pieces flow to natural squares while White commits pawns.", sayShort: 'c4 — …c5 and …Nc6, hold firm.' }, sources: FR,
  },
  'pro-caruana-french::2::Be2@12': {
    intro: { say: "Be2 — White develops modestly in the Tarrasch. Continue …Nc6, …Qb6 and …cxd4, ganging up on d4 while …f6 breaks e5; Black's thematic pressure on the chain gives an easy, active middlegame.", sayShort: 'Be2 — …Nc6 and …Qb6, hit d4.' }, sources: FR,
  },
  'pro-caruana-french::3::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetrical with a drawish reputation. Do not wait for the draw: mirror …Bd6 and …Ne7, then seize a file with …Re8, find the better minor piece, and manufacture the imbalance. Black outplays, not out-waits.", sayShort: 'Bd3 — mirror, then outplay actively.' }, sources: FR,
  },
  'pro-caruana-french::3::c4@6': {
    intro: { say: "c4 — the Monte Carlo Exchange, White giving himself an isolated queen's pawn. Develop …Nf6, …Be7 and …O-O, then blockade d5 with …Nb6 or …Nbd7-b6 and press the isolated pawn; classic isolated-pawn technique in Black's favour.", sayShort: 'c4 — blockade d5, press the IQP.' }, sources: FR,
  },
  'pro-caruana-french::3::Qe2+@10': {
    intro: { say: "Qe2+ — a trade offer in the symmetric Exchange. Interpose …Qe7 or …Be7 and trade queens; the endgame is level, but Black's easier development and any file you grab first give the only winning chances. Play on, do not settle.", sayShort: 'Qe2+ — …Qe7, trade, then press.' }, sources: FR,
  },
  'pro-caruana-french::3::c4@8': {
    intro: { say: "c4 — White opens the Exchange into an IQP after …Bb4+. Keep the pin with …Bb4+ and Nc3, then …O-O and blockade d5; you press the isolated pawn with pieces, the reliable route to a Black edge.", sayShort: 'c4 — …Bb4+, blockade and press.' }, sources: FR,
  },
  'pro-caruana-french::3::Bg5@8': {
    intro: { say: "Bg5 — White pins in the Exchange. Break it calmly with …Be7 and …O-O, then …Re8, …c6 and …Bf5 or …Ne4; equal, but Black's straightforward development lets you play for the small imbalance first.", sayShort: 'Bg5 — …Be7 and …O-O, then …Re8.' }, sources: FR,
  },
  'pro-caruana-french::3::h3@8': {
    intro: { say: "h3 — a quiet luft in the Exchange. Mirror with …Bd6 and …O-O, contest the e-file with …Re8, and pick the better square for each piece; the symmetry breaks in favour of whoever plays actively, and that is you.", sayShort: 'h3 — …Bd6, contest the e-file.' }, sources: FR,
  },

  // ===== Caro-Kann (student BLACK) — Advance / Panov / Exchange =====
  'pro-caruana-caro-kann::0::Nc3@6': {
    intro: { say: "Nc3 — the Van der Wiel Attack, White lunging with g4 and h4 to trap your bishop. Stay calm: …e6, then …Bg6 tucking the bishop safe, …h5 fixing the pawns, and …c5 striking the centre; White's committed pawns become targets. Wild but sound for Black.", sayShort: 'Nc3 — …Bg6 and …h5, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::Nd2@6': {
    intro: { say: "Nd2 — a flexible Advance setup. Continue …e6 and …Nd7, meet Nb3 by holding firm, and reroute …Ne7-g6 hitting e5 before the …c5 break; your bishop is already outside on f5, a comfortable Caro.", sayShort: 'Nd2 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White supports d4 in the Advance. Develop …e6 and …Nd7, then …Ne7-g6 pressuring e5 and the …c5 break; nothing changes the plan — undermine the chain while your light bishop stays active outside it.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::O-O@10': {
    intro: { say: "O-O — the Short System, White's most common Advance. After …c5 White castles; continue …Nc6 and …cxd4, hitting the base with your bishop already active on f5. You trade off the bad piece and reach comfortable equality.", sayShort: 'O-O — …Nc6 and …cxd4, hit d4.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::c3@10': {
    intro: { say: "c3 — White props d4 in the Short Advance. Develop …Nc6 and …Qb6, pressuring d4 and b2, then …Nge7-f5 or …cxd4; your active bishop on f5 and the pressure on the base give an easy game.", sayShort: 'c3 — …Nc6 and …Qb6, press d4.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::Na4@14': {
    intro: { say: "Na4 — White chases your queen and heads for the c5-outpost. Retreat …Qa5 or …Qc7, keep …c5-c4 gaining space, and trade the knight if it lands on c5; your solid Caro structure holds and the light bishop stays a star.", sayShort: 'Na4 — …Qc7, keep …c5-c4 rolling.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::c4@12': {
    intro: { say: "c4 — White plays sharply, and it drops b2. Grab it with …Qxb2, then scramble the queen home via …Qc3 or …Qa3 while you finish developing; the extra pawn is real, but keep the queen safe and do not get greedy. Concrete and well-known.", sayShort: 'c4 — …Qxb2, then retreat the queen.' }, sources: CK,
  },
  'pro-caruana-caro-kann::0::dxc5@14': {
    intro: { say: "dxc5 — White gives up the centre to unbalance. Regain the pawn with …Bxc5 or …Qxc5, developing with tempo; the chain is gone, your bishop on f5 is excellent, and Black is comfortably equal with active pieces.", sayShort: 'dxc5 — …Bxc5, active and equal.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::c4@6': {
    intro: { say: "c4 — the Panov, an isolated-pawn battle. Develop …Nf6, …e6 and …Bb4 pinning; you blockade d5, trade pieces, and press the isolated d-pawn into the endgame. Classic anti-IQP technique, comfortable for Black.", sayShort: 'c4 — Panov; blockade and press.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::h3@10': {
    intro: { say: "h3 — a quiet Exchange Caro. Fianchetto with …g6 and …Bg7, castle, and use the half-open c-file with …Rc8; the symmetric structure is level, but Black's easy development lets you press for the small edge.", sayShort: 'h3 — …g6 and …Bg7, then …Rc8.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::Nf3@6': {
    intro: { say: "Nf3 — the calm Exchange Caro. Develop …Nc6, …Nf6 and …Bg4 or …Bf5, getting the light bishop active outside the chain; the equal structure gives Black a comfortable, weakness-free game to outplay from.", sayShort: 'Nf3 — …Bg4 or …Bf5, active bishop.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::Nf3@10': {
    intro: { say: "Nf3 — White develops in the Exchange. Bring the bishop out with …Bg4 pinning, then …e6, …Bd6 and …O-O; you never own a bad bishop and the level structure favours the more active side. Play on.", sayShort: 'Nf3 — …Bg4 pin, then develop.' }, sources: CK,
  },
  'pro-caruana-caro-kann::1::Nf3@12': {
    intro: { say: "Nf3 — the Rubinstein Exchange after your …Bg4 pin. Continue …e6, …Bd6, …Qc7 and …O-O, eyeing …Bxf3 doubling or a kingside build; the bishop pair option and easy play give Black a pleasant game.", sayShort: 'Nf3 — …e6 and …Bd6, then …O-O.' }, sources: CK,
  },

  // ===== King's Indian Defence (student BLACK) =====
  'pro-caruana-kid::0::f3@8': {
    intro: { say: "f3 — the Sämisch, White's big-centre bind with f3 supporting e4. Castle and break the standard ways: …e5 or …c5, and if White locks with d5, launch …c6 and …b5 on the queenside or …f5 at the king. A rich, double-edged fight.", sayShort: 'f3 — castle, then …c5 or …e5.' }, sources: KID,
  },
  'pro-caruana-kid::0::b4@16': {
    intro: { say: "b4 — the Bayonet Attack, White storming the queenside in the Classical KID. Ignore the wing and race: …Nd7, …f5, …f4 and …g5-g4 at the king; the KID is a pure pawn-storm race, and your attack usually arrives first.", sayShort: 'b4 — …f5 and …f4, storm the king.' }, sources: KID,
  },
  'pro-caruana-kid::0::h3@10': {
    intro: { say: "h3 — White prepares Be3 without …Ng4 ideas. Play the KID plan: …e5, and after d5 reroute …Nd7, then …f5, …f4 and the kingside avalanche while White expands on the queenside. Trust the race.", sayShort: 'h3 — …e5, then …f5-f4 storm.' }, sources: KID,
  },
  'pro-caruana-kid::0::h3@8': {
    intro: { say: "h3 — the Makogonov, White clamping g4 and preparing Be3, Nge2. Castle and strike …e5 or …c5; if the centre locks, the …f5 break and the kingside storm are your game, and h3 becomes a target for …h5-h4 later.", sayShort: 'h3 — castle, then …e5 and …f5.' }, sources: KID,
  },
  'pro-caruana-kid::0::Be3@12': {
    intro: { say: "Be3 — the Gligorić System, White eyeing dxe5 tricks. Play …Ng4 hitting the bishop, or …exd4 and …Re8 with active pieces; the Gligorić is sharp and concrete, and Black's counterplay against the centre keeps full balance.", sayShort: 'Be3 — …Ng4 hits it, stay active.' }, sources: KID,
  },
  'pro-caruana-kid::0::d5@12': {
    intro: { say: "d5 — the Petrosian System, White locking the centre. This is the KID's dream: with the centre closed, reroute …Nd7 or …Na6-c5 and throw …f5, …f4, …g5 at the king; the closed centre guarantees your kingside attack a free run.", sayShort: 'd5 — …Nd7, then …f5-f4 storm.' }, sources: KID,
  },
  'pro-caruana-kid::0::Nf3@6': {
    intro: { say: "Nf3 — White develops flexibly toward the main lines. Your reply never changes: complete the fianchetto, castle, and break with …e5. Once the centre locks, the King's Indian attack writes itself — pawns and pieces storming the kingside.", sayShort: 'Nf3 — castle and break …e5.' }, sources: KID,
  },
  'pro-caruana-kid::0::f4@8': {
    intro: { say: "f4 — the Four Pawns Attack, White's most violent KID try with four pawns across the board. The overextension is the flaw: counterstrike …c5 and …e5, and if White pushes past, …Re8 and …Bg4 pile on; the proud centre becomes a row of targets.", sayShort: 'f4 — counterstrike …c5, then …e5.' }, sources: KID,
  },
  'pro-caruana-kid::0::Bd3@8': {
    intro: { say: "Bd3 — White develops the bishop actively but blocks the d-file. Play the KID plan: …e5, …Nc6 and if d5 the …f5 break; the bishop on d3 bites on your solid chain while your kingside storm builds. Comfortable, thematic play.", sayShort: 'Bd3 — …e5 and …Nc6, then …f5.' }, sources: KID,
  },
};
