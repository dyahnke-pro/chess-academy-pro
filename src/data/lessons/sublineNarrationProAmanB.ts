import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Aman batch B: Nimzo-Indian + Caro-Kann (student BLACK);
// Réti/Zukertort/KIA, Anti-Berlin Ruy, French (Classical/Burn/Rubinstein/Fort Knox),
// and the Anti-Caro Two Knights (student WHITE). House voice, board-safe, line-grounded.

const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const RUY = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Ruy_Lopez'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const RETI = ['concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const ACK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];

export const SUBLINE_NARRATION_PRO_AMAN_B: Record<string, SublineNarration> = {
  // ===== Nimzo-Indian (student BLACK) =====
  'pro-aman-nimzo-indian::0::g3@4': {
    intro: { say: "g3 — White steers into a Catalan instead of the Nimzo. Meet it solidly: …d5, …Be7 and …O-O, then …c6 or …dxc4 and …b5 to fight for the long light diagonal; a rock-solid, well-tested equalizer against the fianchetto.", sayShort: 'g3 — …d5 and …Be7, hold solid.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::Qc2@6': {
    intro: { say: "Qc2 — the Classical Nimzo, avoiding doubled pawns to keep the bishop pair. Castle …O-O, then …d5 or …c5 striking the centre; if White grabs your bishop with a3, the broad centre becomes a target for …d5 and …Ne4. Dynamic, ambitious equality.", sayShort: 'Qc2 — …O-O, then …d5 or …c5.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::f3@6': {
    intro: { say: "f3 — the Sämisch, White accepting shattered pawns for a big centre and the bishop pair. Hit it immediately: …d5 and …c5, trade …Bxc3, and blockade the doubled c-pawns; the loose f3-e4 centre and the weak pawns are permanent targets.", sayShort: 'f3 — …d5 and …c5, blockade.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::Nf3@6': {
    intro: { say: "Nf3 — the flexible Three Knights Nimzo. Continue …O-O and …d5, or …b6 with …Bb7, keeping the pin and the pressure on e4; you develop naturally and fight for the centre before White resolves the tension. Comfortable and sound.", sayShort: 'Nf3 — …O-O and …d5, keep pin.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::Ne2@8': {
    intro: { say: "Ne2 — the Reshevsky, White rerouting the knight to recapture on c3 without doubling. Play …d5 and …c5, or …b6, striking before the knight settles; the awkward Ne2 blocks the bishop, so your quick central break gives easy play.", sayShort: 'Ne2 — …d5 and …c5, strike fast.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::a3@10': {
    intro: { say: "a3 — White forces the bishop to declare in the …d5 Nimzo. Trade …Bxc3, and bxc3 hands you a target: blockade with …c5, …Nc6 and …dxc4, then pressure the doubled pawns. The two bishops are compensation, but the structure is yours to exploit.", sayShort: 'a3 — …Bxc3, blockade the c-pawns.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::Bd2@8': {
    intro: { say: "Bd2 — a modest line, White unpinning early. Take the free tempo: trade …Bxc3 or retreat …Be7, then …d5 and …b6 with …Bb7; you equalise comfortably with easy development and no structural concerns. Nothing to fear here.", sayShort: 'Bd2 — …d5 and …b6, develop.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::cxd5@10': {
    intro: { say: "cxd5 — White opens the centre in the …d5 Nimzo. Recapture …exd5, giving a solid, symmetrical pawn structure with the bishop pin intact; play …c5, …Nc6 and …Bg4, developing actively for full equality. A reliable, sturdy game.", sayShort: 'cxd5 — …exd5, then …c5 and …Nc6.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::0::Ne2@10': {
    intro: { say: "Ne2 — White reroutes to dodge doubled pawns after …d5. Keep it simple: …dxc4 or …c5 opening the centre, then …Nc6 and …Bg4 with pressure; the passive knight lets you seize the initiative in the centre. Comfortable equality.", sayShort: 'Ne2 — …dxc4 or …c5, seize centre.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::1::Nbd2@6': {
    intro: { say: "Nbd2 — White blocks the Bogo check with the knight, keeping the pawns intact. Play …O-O and …d5, or …b6 with …Bb7, then trade …Bxd2 at the right moment; the knight on d2 is passive, and your easy development gives a smooth, equal game.", sayShort: 'Nbd2 — …O-O and …b6, then …Bxd2.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::1::Nc3@6': {
    intro: { say: "Nc3 — White invites a transposition to the Nimzo proper. Welcome it: …O-O and …d5, or …b6, keeping the …Bxc3 pin and the pressure on e4. You reach a familiar, comfortable Nimzo where the c3-knight is tied down.", sayShort: 'Nc3 — …O-O, keep the …Bxc3 pin.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::1::Nc3@8': {
    intro: { say: "Nc3 — after you tuck the bishop back to e7, White grabs the centre. Continue …d5 and …O-O, then …c6 or …dxc4; the retreat kept a solid, flexible structure, and you contest the centre with normal, healthy development. Balanced.", sayShort: 'Nc3 — …d5 and …O-O, contest centre.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::a3@8': {
    intro: { say: "a3 — the main Classical Nimzo, White spending a tempo to win the bishop pair. Trade …Bxc3, and after the recapture strike …d5 or …b6 with …Ne4 hitting the queen; the bishop pair is real, but so is your grip on e4 and the light squares.", sayShort: 'a3 — …Bxc3, then …d5 and …Ne4.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::Nf3@8': {
    intro: { say: "Nf3 — White develops in the Classical, keeping options. Play …d5 or …b6 with …Bb7, or …d6 and …e5 to strike; the pin on c3 stays, and your flexible setup fights for the centre before White clarifies. Comfortable, principled play.", sayShort: 'Nf3 — …d5 or …b6, keep pin.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::Bg5@8': {
    intro: { say: "Bg5 — White pins your knight in the Classical. Break it with …h6 and …d6 or …c5, questioning the bishop and striking the centre; the …Bxc3 trade plus …h6 gains you tempo and structure. Active and equal.", sayShort: 'Bg5 — …h6, then …d6 or …c5.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::a3@10': {
    intro: { say: "a3 — White grabs the full centre with e4 and then challenges the bishop. Trade …Bxc3, and after bxc3 undermine the big centre with …e5 or …c5 and …Nc6; the doubled pawns and the e4-d4 mass become targets. Classic Nimzo counterplay.", sayShort: 'a3 — …Bxc3, then …e5 undermines.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::Bd3@10': {
    intro: { say: "Bd3 — White supports the big e4-d4 centre. Strike back: …e5 or …c5 and …Nc6, chipping at the base while your pieces pour toward the centre; the broad pawns look imposing but overextend, and the Nimzo thrives on cracking them. Dynamic play.", sayShort: 'Bd3 — …e5 or …c5, hit centre.' }, sources: NIM,
  },
  'pro-aman-nimzo-indian::2::Nf3@10': {
    intro: { say: "Nf3 — White completes the big-centre setup. Undermine it with …e5 or …Nc6 and …c5, and if the tension opens, …Bg4 pins and piles on; the e4-d4 centre is a target, not a fortress. Counter energetically for full equality.", sayShort: 'Nf3 — …e5 and …Nc6, undermine.' }, sources: NIM,
  },

  // ===== Ruy Lopez (student WHITE) — Anti-Berlin d3 =====
  'pro-aman-ruy-lopez::1::d5@11': {
    intro: { say: "d5 — Black strikes the centre in the Anti-Berlin. Meet it calmly: exd5 or Nbd2 holding e4, then Re1 and the slow Nbd2-f1-g3 reroute; your bishop on b5 and the extra tempo keep a small, safe pull. Nothing to fear from the break.", sayShort: 'd5 — hold e4, then reroute.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::d5@9': {
    intro: { say: "d5 — an early central break in the Anti-Berlin. Play exd5 or O-O first, keeping the tension; after the dust settles you have a healthy structure and the bishop-pair option, with the slower manoeuvring game favouring White. Build patiently.", sayShort: 'd5 — exd5 or O-O, keep tension.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::Re8@11': {
    intro: { say: "Re8 — Black develops the rook in the Anti-Berlin. Continue Re1, Nbd2 and the f1-g3 reroute, preparing d4; the quiet Italian-flavoured Ruy hands White a small, durable space edge with easy, harmonious development. Press slowly.", sayShort: 'Re8 — Re1 and Nbd2, prepare d4.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::Ne7@13': {
    intro: { say: "Ne7 — Black reroutes the knight toward g6. Play d4 and Nbd2, grabbing the centre while Black manoeuvres; your space and the bishop-pair option give the more comfortable game. Break in the centre when your pieces are ready.", sayShort: 'Ne7 — d4 and Nbd2, take centre.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::d6@9': {
    intro: { say: "d6 — Black plays solidly in the Anti-Berlin. Build with O-O, Re1 and Nbd2, then the f1-g3 reroute and d4; the slow Ruy squeeze with the extra tempo gives White a pleasant, risk-free pull. Manoeuvre and press.", sayShort: 'd6 — O-O and Nbd2, then d4.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::Bb6@13': {
    intro: { say: "Bb6 — Black tucks the bishop from a coming d4. Continue Nbd2, Re1 and d4, gaining space with tempo; the bishop on b6 bites on granite while your central break and better-placed pieces give the edge. Play on the centre.", sayShort: 'Bb6 — Nbd2 and Re1, then d4.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::h6@13': {
    intro: { say: "h6 — a luft in the Anti-Berlin. Just improve: Nbd2, Re1 and the f1-g3 reroute toward d4; White keeps the small, comfortable space edge in a slow manoeuvring battle. Break in the centre at the ideal moment.", sayShort: 'h6 — Nbd2 and reroute, then d4.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::Bd7@13': {
    intro: { say: "Bd7 — Black develops the bishop passively. Take the centre: d4 and Nbd2, then Re1 and the kingside reroute; your space and freer development give a lasting pull. Squeeze patiently and open the position when ready.", sayShort: 'Bd7 — d4 and Nbd2, squeeze.' }, sources: RUY,
  },
  'pro-aman-ruy-lopez::1::Re8@17': {
    intro: { say: "Re8 — Black defends after you trade on c6. Play d4 and Nbd2, using Black's damaged queenside pawns as a long-term target; the bishop pair is gone but the structural edge and central space give White the better game. Press the c-pawns.", sayShort: 'Re8 — d4, target the c-pawns.' }, sources: RUY,
  },

  // ===== Caro-Kann (student BLACK) — Advance / exf6 main / Panov / Exchange =====
  'pro-aman-caro-kann::0::Nc3@6': {
    intro: { say: "Nc3 — the Van der Wiel Attack, White lunging g4 and h4 to trap your bishop. Stay calm: …e6, then …Bg6 tucking it safe, …h5 fixing the pawns, and …c5 striking the centre; the committed white pawns become targets. Wild but sound.", sayShort: 'Nc3 — …Bg6 and …h5, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Nd2@6': {
    intro: { say: "Nd2 — a flexible Advance setup. Continue …e6 and …Nd7, meet Nb3 by holding firm, and reroute …Ne7-g6 hitting e5 before the …c5 break; your light bishop is already outside on f5, a comfortable Caro.", sayShort: 'Nd2 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Nbd2@12': {
    intro: { say: "Nbd2 — White develops in the Short Advance after your setup. Continue …c5 and …Nc6, hitting the d4 base, and …Ng6 pressuring e5; your bishop is active on f5 and the …c5 break gives comfortable equality. Undermine the chain.", sayShort: 'Nbd2 — …c5 and …Nc6, hit d4.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White supports d4 in the Advance. Develop …e6 and …Nd7, then …Ne7-g6 pressuring e5 and the …c5 break; nothing changes the plan — undermine the chain while your bishop stays active outside it.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::c3@12': {
    intro: { say: "c3 — White props d4 in the Short Advance. Play …c5 and …Nc6, pressuring the base, then …Qb6 hitting b2 and d4; your active f5-bishop and the queenside pressure give an easy, comfortable game. Break the chain.", sayShort: 'c3 — …c5 and …Nc6, press d4.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Be3@12': {
    intro: { say: "Be3 — White reinforces d4 in the Short. Continue …c5 and …Nc6, then …Qb6 or …cxd4, ganging up on the base; the bishop on f5 is a star and your queenside play flows naturally. Comfortable equality.", sayShort: 'Be3 — …c5 and …Nc6, hit base.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::b3@12': {
    intro: { say: "b3 — White fianchettos to bolster the centre in the Short. Play …c5 and …Nc6, striking d4, and …Ng6 hitting e5; your bishop outside the chain and the standard …c5 break give an easy, active game. Undermine and equalise.", sayShort: 'b3 — …c5 and …Ng6, undermine.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Be2@14': {
    intro: { say: "Be2 — White develops in the …exf6 Caro main line. Count your trumps: the half-open e-file for …Re8, the bishop pair, and the …f5-f4 space plan; the doubled f-pawns clamp e5 and g5 and shield your king. You have the easier attacking game.", sayShort: 'Be2 — …Re8, then …f5 space.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Be3@14': {
    intro: { say: "Be3 — White develops solidly in the …exf6 structure. Continue …Re8, …Bg4 and …Nd7, using the bishop pair and the half-open e-file; the doubled pawns are a strength here, controlling key central squares. Press with the two bishops.", sayShort: 'Be3 — …Re8 and …Bg4, press.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::O-O@18': {
    intro: { say: "O-O — White castles in the …exf6 main tabiya. Your pieces are ideal: …Nd7, …Qc7 and the …f5-f4 kingside push, with the bishop pair and the open e-file. The doubled f-pawns anchor the centre and shield the king; press the attack.", sayShort: 'O-O — …Nd7, then …f5-f4 push.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::h3@18': {
    intro: { say: "h3 — White questions your bishop. Retreat …Bh5 or trade …Bxf3, keeping the bishop pair and the half-open e-file; then …Nd7 and …f5, rolling the kingside majority. Your structure and the two bishops give the pleasant game.", sayShort: 'h3 — …Bh5 or …Bxf3, then …f5.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Qe2@8': {
    intro: { say: "Qe2 — White centralises the queen early. Trade …Nxe4 and develop …Nd7 and …Nf6 hitting the queen with tempo, then …e6 and …Bd6; you gain time chasing the queen and reach a solid, comfortable Caro. Develop naturally.", sayShort: 'Qe2 — …Nxe4, then …Nf6 with tempo.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::d3@4': {
    intro: { say: "d3 — the Endgame Variation, White trading queens for a quiet game. Take …dxe4 and …Qxd1, then develop actively: …Nf6, …g6 and …Bh6, contesting the dark squares; the queenless middlegame is level, and your easy development plays for the small edge.", sayShort: 'd3 — trade queens, develop actively.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Kf1@16': {
    intro: { say: "Kf1 — White sidesteps the check, giving up castling. Exploit it: …Bg4 pinning, …Nd7 and …f5, keeping the king stuck in the centre; the half-open e-file and the bishop pair make White's loss of castling a real, lasting problem.", sayShort: 'Kf1 — …Bg4 and …f5, exploit king.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Be2@16': {
    intro: { say: "Be2 — White blocks the check with the bishop. Continue …Bg4 pinning, …Nd7 and …f5, developing with pressure; the pin and the …f5-f4 plan plus the bishop pair give Black the more comfortable, active game. Build the attack.", sayShort: 'Be2 — …Bg4 pin, then …f5.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Qd2@18': {
    intro: { say: "Qd2 — White connects and eyes the queenside. Play …Nd7, …Qc7 and …f5, rolling the kingside majority while your bishop pair rakes the board; the …exf6 structure gives you the open e-file and the easier attacking chances. Press on.", sayShort: 'Qd2 — …Nd7 and …f5, attack.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::exd5@4': {
    intro: { say: "exd5 — the Apocalypse Attack, a tricky gambit-flavoured try. Recapture …cxd5, then meet Ne5 with …Nc6 and …e6, calmly developing …Bd7 and breaking the pin; White's activity fizzles and you keep a healthy, extra-solid Caro structure. Consolidate.", sayShort: 'exd5 — …cxd5, then …Nc6 and …e6.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::c4@6': {
    intro: { say: "c4 — the Panov, an isolated-pawn battle. Develop …Nf6, …e6 and …Bb4 pinning; you blockade d5, trade pieces, and press the isolated d-pawn into the endgame. Classic anti-IQP technique, comfortable for Black.", sayShort: 'c4 — Panov; blockade and press.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::h3@10': {
    intro: { say: "h3 — a quiet Exchange Caro. Continue …Nf6, …Bf5 or …Bg4, and …e6 with …Bd6; the symmetric structure is level, but your easy development and the half-open c-file let you press for the small edge. Outplay, do not wait.", sayShort: 'h3 — …Nf6 and …Bf5, then press.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::Nf3@6': {
    intro: { say: "Nf3 — the calm Exchange Caro. Develop …Nc6, …Nf6 and …Bg4 or …Bf5, getting the light bishop active outside the chain; the equal structure gives Black a comfortable, weakness-free game to outplay from.", sayShort: 'Nf3 — …Bg4 or …Bf5, active bishop.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::Na3@10': {
    intro: { say: "Na3 — White reroutes toward c2 and the queenside in the Exchange. Continue …a6 stopping Nb5, then …Nf6, …Bd6 or …Bg4 and …O-O; your harmonious development and the half-open c-file give an easy, balanced game. Press calmly.", sayShort: 'Na3 — …a6, then …Nf6 and …Bd6.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::Nf3@10': {
    intro: { say: "Nf3 — White develops in the Exchange after …Qc7. Pin with …Bg4, then …e6, …Bd6 and …O-O, eyeing the …Bxf3 trade or a kingside build; the bishop-pair option and easy play give Black a pleasant game.", sayShort: 'Nf3 — …Bg4 pin, then …Bd6.' }, sources: CK,
  },
  'pro-aman-caro-kann::2::Bg5@10': {
    intro: { say: "Bg5 — White pins in the Exchange. Play …Nf6 and …e6, then …Bd6 and …h6 questioning the bishop; the …Qc7 and …Bd6 battery eyes h2, and your active development gives comfortable equality. Contest the dark squares.", sayShort: 'Bg5 — …Nf6 and …Bd6, then …h6.' }, sources: CK,
  },

  // ===== Réti / Zukertort / KIA (student WHITE) =====
  'pro-aman-reti::0::dxc4@5': {
    intro: { say: "dxc4 — Black grabs the pawn in the Zukertort. Recapture Bxc4 and develop naturally: O-O, then the classic isolated- or hanging-pawn play with e3, Nc3 and Re1; your lead in development and central control give an easy, pleasant game.", sayShort: 'dxc4 — Bxc4, develop and press.' }, sources: RETI,
  },
  'pro-aman-reti::0::c5@7': {
    intro: { say: "c5 — Black strikes the centre in the Zukertort. Develop Nc3 and support with dxc5 or Bd3; the play revolves around an isolated or hanging pawn, which you blockade and pressure. A comfortable, well-mapped structure.", sayShort: 'c5 — Nc3 and Bd3, blockade.' }, sources: RETI,
  },
  'pro-aman-reti::0::a6@7': {
    intro: { say: "a6 — Black prepares …dxc4 and …b5 in the Zukertort. Fianchetto with b3 and Bb2, castle, and meet …c5 with the central tension; your queenside fianchetto and flexible centre give a smooth, pressing game. Build on the long diagonal.", sayShort: 'a6 — b3 and Bb2, press centre.' }, sources: RETI,
  },
  'pro-aman-reti::0::b6@7': {
    intro: { say: "b6 — Black fianchettos in the Zukertort. Develop Nc3, Bd3 and O-O, then aim for the e4 break to challenge the b7-bishop; your harmonious setup and central space give a comfortable, pressing game. Prepare e4.", sayShort: 'b6 — Nc3 and Bd3, prepare e4.' }, sources: RETI,
  },
  'pro-aman-reti::0::c6@7': {
    intro: { say: "c6 — Black plays a Semi-Slav-ish wall. Develop Bd3, O-O and b3 with Bb2, then break with e4 or c5 at the right moment; your flexible centre and easy development give a pleasant edge against the solid setup. Manoeuvre and break.", sayShort: 'c6 — Bd3 and O-O, then e4.' }, sources: RETI,
  },
  'pro-aman-reti::0::Nbd7@7': {
    intro: { say: "Nbd7 — Black develops toward a Semi-Slav or QGD. Continue Nc3, Bd3 and O-O, keeping the tension, then push e4 or open with cxd5; your development lead and central control give a comfortable, pressing game. Play in the centre.", sayShort: 'Nbd7 — Nc3 and Bd3, keep tension.' }, sources: RETI,
  },
  'pro-aman-reti::0::dxc4@11': {
    intro: { say: "dxc4 — Black grabs the pawn after developing. Recapture Bxc4 and play e4 or O-O, seizing the centre with your lead in development; the classic Zukertort structure gives easy, active piece play. Press the centre.", sayShort: 'dxc4 — Bxc4, then e4 seizes centre.' }, sources: RETI,
  },
  'pro-aman-reti::0::dxc4@7': {
    intro: { say: "dxc4 — Black takes early in the Zukertort. Recapture Bxc4, castle, and meet …c5 with dxc5 or the tension; your development and central presence give a smooth isolated-pawn game where you hold the initiative. Develop and pressure.", sayShort: 'dxc4 — Bxc4 and O-O, press.' }, sources: RETI,
  },
  'pro-aman-reti::0::c5@11': {
    intro: { say: "c5 — Black strikes late in the Zukertort. Keep the tension with O-O, or take cxd5 and dxc5 heading for an isolated or hanging pawn; you blockade d5 and pressure the pawn with pieces. A comfortable, well-known structure.", sayShort: 'c5 — O-O, then blockade d5.' }, sources: RETI,
  },
  'pro-aman-reti::1::c6@5': {
    intro: { say: "c6 — Black prepares …d5 against your big centre. Build with Nc3 and e4, and after …d5 recapture toward the centre; your broad d4-e4 pawns and development lead give a strong, space-gaining game. Keep the centre and press.", sayShort: 'c6 — Nc3 and e4, keep centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::c5@5': {
    intro: { say: "c5 — Black strikes at your centre. Take dxc5 and after …Qa5+ block with c3, then Na3 hitting the queen with tempo; you keep the extra central space and a lead in development while Black chases the pawn back. Develop with gain of time.", sayShort: 'c5 — dxc5, then c3 and Na3.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nbd7@11': {
    intro: { say: "Nbd7 — Black sets up a King's-Indian-style block. You have the big centre: play Re1, Nbd2 and prepare e5 or d5, expanding with your space; the broad pawns and easy development give a pleasant, pressing game. Build and break.", sayShort: 'Nbd7 — Re1 and Nbd2, then e5.' }, sources: RETI,
  },
  'pro-aman-reti::1::c5@11': {
    intro: { say: "c5 — Black hits the centre in the fianchetto system. Support with d5 grabbing space, or keep the tension with Nbd2 and Re1; your broad centre and development lead give the better game. Expand where you are stronger.", sayShort: 'c5 — d5 grabs space, then expand.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nd7@7': {
    intro: { say: "Nd7 — Black develops toward …e5 in the fianchetto line. Continue Bd3, O-O and Re1, preparing e5 or holding the big centre; your space and harmonious development give a comfortable pull. Break when your pieces are ready.", sayShort: 'Nd7 — Bd3 and O-O, hold centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nc6@7': {
    intro: { say: "Nc6 — Black pressures d4 early. Pin with Bb5, keeping your broad centre intact, then O-O and prepare d5 or Re1; the pin and your central space give White the more comfortable game. Develop and press.", sayShort: 'Nc6 — Bb5, keep the big centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::c6@11': {
    intro: { say: "c6 — Black prepares …d5 or …b5 in the fianchetto system. Continue Re1 and Nbd2, holding the centre, then meet …d5 with e5 or the tension; your space and development give a pleasant, pressing game. Keep the centre.", sayShort: 'c6 — Re1 and Nbd2, keep centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nd7@13': {
    intro: { say: "Nd7 — Black reroutes toward …e5. Play Re1, Nbd2 and prepare e5 or d5, using your central space; the broad pawns and easy development give the more comfortable game. Expand at the ideal moment.", sayShort: 'Nd7 — Re1 and Nbd2, then e5.' }, sources: RETI,
  },
  'pro-aman-reti::2::c5@13': {
    intro: { say: "c5 — Black strikes on the queenside in the King's Indian Attack. Roll your kingside plan: Re1, then e5 or Nf1-h2-g4 and the f-pawn push at the king; the KIA is a one-sided attacking machine once the centre is set. Storm the kingside.", sayShort: 'c5 — Re1, then e5 and attack.' }, sources: RETI,
  },
  'pro-aman-reti::2::c6@13': {
    intro: { say: "c6 — Black plays solidly in the KIA. Continue Re1 and the classic plan: e5 gaining space, then Nf1-h2-g4 and the kingside pawn storm; your attacking setup gives dangerous, straightforward chances. Push on the kingside.", sayShort: 'c6 — Re1 and e5, then attack.' }, sources: RETI,
  },
  'pro-aman-reti::2::Re8@13': {
    intro: { say: "Re8 — Black prepares …e5 in the KIA. Play e5 yourself first, grabbing space, then Nf1-h2-g4 and the f-pawn storm; the King's Indian Attack gives White a dangerous, one-sided kingside build. Attack the king.", sayShort: 'Re8 — e5, then the kingside storm.' }, sources: RETI,
  },
  'pro-aman-reti::2::d5@9': {
    intro: { say: "d5 — Black grabs the centre in the Wahls KIA. Continue Nbd2 and e4, challenging with the classic KIA break; after the tension resolves you get the thematic kingside attack with Nf1-h2-g4 and f-pawn play. Build the attack.", sayShort: 'd5 — Nbd2 and e4, then attack.' }, sources: RETI,
  },
  'pro-aman-reti::2::d5@7': {
    intro: { say: "d5 — Black stakes the centre early. Play d3 and Nbd2, then e4 with the King's Indian Attack break; your flexible setup steers into the thematic kingside storm. Prepare e4 and attack.", sayShort: 'd5 — d3 and Nbd2, then e4.' }, sources: RETI,
  },
  'pro-aman-reti::2::c5@9': {
    intro: { say: "c5 — Black expands on the queenside in the KIA. Continue Nbd2, e4 and the kingside plan with Nf1-h2-g4 and f4; the KIA lets White ignore the queenside and storm the king. Attack where you are stronger.", sayShort: 'c5 — Nbd2 and e4, storm kingside.' }, sources: RETI,
  },
  'pro-aman-reti::2::c5@11': {
    intro: { say: "c5 — Black plays for queenside space in the KIA. Roll e4 and the kingside build: Re1, Nf1-h2-g4 and the f-pawn push at Black's king; the attacking blueprint gives dangerous chances. Storm the kingside.", sayShort: 'c5 — e4, then the kingside storm.' }, sources: RETI,
  },
  'pro-aman-reti::2::e5@11': {
    intro: { say: "e5 — Black grabs the centre in the KIA. Keep the tension with Re1 and Nf1, then h2-g4 and f4 on the kingside; the closed centre lets your King's Indian Attack roll at the king. Push the kingside pawns.", sayShort: 'e5 — Re1 and Nf1, then attack.' }, sources: RETI,
  },

  // ===== French (student WHITE) — Classical / Burn / Rubinstein / Fort Knox =====
  'pro-aman-french-white::1::Be7@7': {
    intro: { say: "Be7 — the Classical French, Black breaking the pin. Play e5 gaining space with Bxe7, or keep the pin with Bxf6; the e5 push and the kingside space give White a lasting initiative in the Classical. Grab the space and attack.", sayShort: 'Be7 — e5, grab kingside space.' }, sources: FR,
  },
  'pro-aman-french-white::1::Nbd7@9': {
    intro: { say: "Nbd7 — the Burn French, Black challenging your e4-knight. Continue Nxf6+ doubling the pawns, or Nf3 with Bd3; you keep a slight space edge and easy development against the solid setup. Trade favourably and press.", sayShort: 'Nbd7 — Nxf6+ or Nf3, keep edge.' }, sources: FR,
  },
  'pro-aman-french-white::1::Bxf6@11': {
    intro: { say: "Bxf6 — after Black recaptures on f6 you reach the Burn main line. Develop Nf3, Bd3 or Bc4 and O-O, using your extra central pawn and lead in development; Black's bishop pair is balanced by your structure and space. Press in the centre.", sayShort: 'Bxf6 — Nf3 and Bd3, press centre.' }, sources: FR,
  },
  'pro-aman-french-white::1::a6@13': {
    intro: { say: "a6 — Black prepares …b5 in the Morozevich Burn. Develop g3 and Bg2, or Bc4 and O-O, targeting the shattered kingside pawns and the light squares; your clean structure against Black's doubled f-pawns gives a comfortable edge. Play on the weaknesses.", sayShort: 'a6 — Bg2 and O-O, target pawns.' }, sources: FR,
  },
  'pro-aman-french-white::1::b6@13': {
    intro: { say: "b6 — Black fianchettos in the Morozevich Burn. Play Bc4 or g3 and Bg2, castle, and pressure the weak doubled f-pawns and the e6-point; your sound structure and development give White the more pleasant game. Press the weaknesses.", sayShort: 'b6 — Bc4 and O-O, press e6.' }, sources: FR,
  },
  'pro-aman-french-white::1::c5@21': {
    intro: { say: "c5 — Black strikes for counterplay deep in the Morozevich. Keep it solid: d5, or the tension with Re1 and Qe2, pressuring the light squares and the loose kingside; your structure and the better bishop give a lasting edge. Blockade and press.", sayShort: 'c5 — d5 or Re1, keep pressing.' }, sources: FR,
  },
  'pro-aman-french-white::1::Bf6@15': {
    intro: { say: "Bf6 — Black activates the dark bishop in the Morozevich. Continue Bd3 or g3 and O-O, keeping your grip on the light squares and the weak f5- and e6-points; your clean pawns against Black's shattered kingside give the pull. Press calmly.", sayShort: 'Bf6 — Bd3 and O-O, hold squares.' }, sources: FR,
  },
  'pro-aman-french-white::1::Bf6@21': {
    intro: { say: "Bf6 — Black posts the bishop on the long diagonal. Meet it with c3 or Qe2 and Rad1, neutralising the diagonal and pressuring the weak pawns; your structure and the light-square grip give White the better game. Blunt the bishop.", sayShort: 'Bf6 — c3 and Qe2, blunt diagonal.' }, sources: FR,
  },
  'pro-aman-french-white::1::Qd6@21': {
    intro: { say: "Qd6 — Black centralises the queen in the Morozevich. Continue Re1 and Qe2 with Nd2-f1, pressuring e6 and the light squares; your clean structure against the doubled f-pawns gives a comfortable, pressing game. Play on the weaknesses.", sayShort: 'Qd6 — Re1 and Qe2, press e6.' }, sources: FR,
  },
  'pro-aman-french-white::2::Nd7@7': {
    intro: { say: "Nd7 — the Rubinstein French, Black playing solidly a step behind in space. Develop Nf3, Bd3 or Bc4 and O-O, then press with your central pawn and lead in development; the Rubinstein is passive, and your space gives a lasting pull. Squeeze patiently.", sayShort: 'Nd7 — Nf3 and Bd3, squeeze.' }, sources: FR,
  },
  'pro-aman-french-white::2::Nf6@7': {
    intro: { say: "Nf6 — Black offers a trade in the Rubinstein. Play Nxf6+ and after …Qxf6 continue Nf3, Bd3 and O-O, using your extra space and easy development; Black's solid but passive setup gives White the comfortable edge. Develop and press.", sayShort: 'Nf6 — Nxf6+, then Nf3 and Bd3.' }, sources: FR,
  },
  'pro-aman-french-white::2::Bxe4@11': {
    intro: { say: "Bxe4 — the Fort Knox, Black trading off the good light bishop. Recapture Bxe4, then develop O-O, c3 and Re1; you have the bishop pair and more space against a solid but passive structure. Press the space edge.", sayShort: 'Bxe4 — Bxe4, keep bishop pair.' }, sources: FR,
  },
  'pro-aman-french-white::2::Be7@13': {
    intro: { say: "Be7 — Black develops in the Fort Knox. Continue Re1, c3 and Nf3-e5 or Bg5, using the bishop pair and central space; the Fort Knox is solid but passive, and your freer game gives a lasting pull. Manoeuvre and press.", sayShort: 'Be7 — Re1 and c3, press space.' }, sources: FR,
  },
  'pro-aman-french-white::2::Bxe4@13': {
    intro: { say: "Bxe4 — Black trades the light bishop in the Fort Knox. Recapture Bxe4, then c3, Re1 and Bg5, keeping the bishop pair and more space; against the passive setup you press comfortably. Improve your pieces and squeeze.", sayShort: 'Bxe4 — Bxe4, then c3 and Re1.' }, sources: FR,
  },
  'pro-aman-french-white::2::Bxf3@17': {
    intro: { say: "Bxf3 — Black trades on f3 in the Fort Knox. Recapture Qxf3 or Nxf3, keeping the bishop pair and central space; your freer development against the solid but passive structure gives a durable pull. Press on the light squares.", sayShort: 'Bxf3 — recapture, keep bishop pair.' }, sources: FR,
  },
  'pro-aman-french-white::2::Bxf3@15': {
    intro: { say: "Bxf3 — an early trade on f3 in the Fort Knox. Recapture Nxf3 or Qxf3 and develop Bd3, O-O and Re1; the bishop pair and more space give White a comfortable, pressing game against the passive setup. Squeeze patiently.", sayShort: 'Bxf3 — recapture, then Bd3 and O-O.' }, sources: FR,
  },
  'pro-aman-french-white::2::b6@17': {
    intro: { say: "b6 — Black fianchettos in the Fort Knox. Continue Bg5 or Bf4 and Rad1, pressuring the centre and the e6-point; your bishop pair and space against the passive structure give a lasting edge. Press the weaknesses.", sayShort: 'b6 — Bg5 and Rad1, press e6.' }, sources: FR,
  },
  'pro-aman-french-white::2::Nd5@21': {
    intro: { say: "Nd5 — Black centralises the knight after the trades. Continue c4 kicking it, or Bd2 and Rad1, keeping your space and the bishop pair; the e5-pawn cramps Black and your pieces press comfortably. Gain space and squeeze.", sayShort: 'Nd5 — c4 kicks it, then press.' }, sources: FR,
  },
  'pro-aman-french-white::2::Nd7@21': {
    intro: { say: "Nd7 — Black hits your e5-pawn after the trades. Support it with f4 or Bf4, keeping the cramping pawn and the bishop pair; the space edge and Black's passive setup give White a pleasant, pressing game. Hold e5 and squeeze.", sayShort: 'Nd7 — f4 supports e5, then press.' }, sources: FR,
  },

  // ===== Anti-Caro Two Knights (student WHITE) =====
  'pro-aman-anti-caro::0::Nf6@9': {
    intro: { say: "Nf6 — Black develops after trading the light bishop for your knight. You have the bishop pair: play d3, Bd2 or g3 and Bg2, then O-O and press the light squares; Black gave up the good bishop, so your two bishops give a durable edge. Press slowly.", sayShort: 'Nf6 — d3 and Bd2, use bishops.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Nf6@5': {
    intro: { say: "Nf6 — Black develops in the Two Knights. Play e5 gaining space and kicking the knight; after Ne2 and d4 you have a strong pawn centre and a space edge, with the …c5 counter met by your solid structure. Grab space and develop.", sayShort: 'Nf6 — e5 grabs space, then d4.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Bh5@7': {
    intro: { say: "Bh5 — Black keeps the pin after h3. Play exd5 and Bb5+, forcing …Nc6, then O-O and press the isolated d5-pawn; the pin is loose and your development lead with pressure on d5 gives a comfortable edge. Attack the pawn.", sayShort: 'Bh5 — exd5 and Bb5+, press d5.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Nf6@11': {
    intro: { say: "Nf6 — Black develops in the Mindeno Exchange. Play Bd3, and after …dxe4 recapture keeping the bishop pair and the big centre; your two bishops and central space against Black's solid setup give a lasting pull. Develop and press.", sayShort: 'Nf6 — Bd3, keep bishops and centre.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::g6@5': {
    intro: { say: "g6 — Black fianchettos against your centre. Play d4 and h3, then Nxe4 recapturing with a strong centre; your broad d4-e4 pawns and development lead give a pleasant, space-gaining game. Keep the centre and press.", sayShort: 'g6 — d4 and h3, keep the centre.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Be7@17': {
    intro: { say: "Be7 — Black completes development in the Mindeno Exchange. Castle O-O, then Rad1 and c4 or Bf4, using the bishop pair and central space; Black gave up the light bishop, so your two bishops press comfortably. Improve and squeeze.", sayShort: 'Be7 — O-O and Rad1, press.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Na6@15': {
    intro: { say: "Na6 — Black reroutes the knight toward c7 or b4. Continue O-O, a3 stopping …Nb4, and Rad1 with c4; your bishop pair and space against Black's passive setup give a durable edge. Develop and press the light squares.", sayShort: 'Na6 — O-O and a3, then press.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Qc7@19': {
    intro: { say: "Qc7 — Black sets up a battery on the b8-h2 diagonal. Meet it with h3 and Re1, then Bf4 offering a trade or c4 gaining space; your bishop pair and central presence give White the comfortable game. Blunt the battery and press.", sayShort: 'Qc7 — h3 and Re1, then Bf4.' }, sources: ACK,
  },
  'pro-aman-anti-caro::0::Bb4@17': {
    intro: { say: "Bb4 — Black pins toward the queenside. Play O-O and a3, questioning the bishop, then c4 or Bd2; your bishop pair and space give a lasting edge once the pin is dealt with. Break the pin and press.", sayShort: 'Bb4 — O-O and a3, break pin.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Qc7@19': {
    intro: { say: "Qc7 — Black eyes the h2-square in the Two Knights main line. Play h3 or g3 blunting the battery, then O-O and Rad1 with your space edge; your development and central control give a comfortable, pressing game. Neutralise and press.", sayShort: 'Qc7 — h3, then O-O and Rad1.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Bxe5@19': {
    intro: { say: "Bxe5 — Black trades on e5. Recapture dxe5, gaining a strong central pawn and the bishop pair; the e5-pawn cramps Black and your open lines give a pleasant, pressing game. Use the space and the bishops.", sayShort: 'Bxe5 — dxe5, cramping and bishops.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::h6@19': {
    intro: { say: "h6 — a luft in the Two Knights main line. Continue O-O, Re1 and c4 or Bd2, keeping your space and the initiative; your harmonious development against Black's solid setup gives the better game. Improve and press.", sayShort: 'h6 — O-O and Re1, keep initiative.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Qd5@11': {
    intro: { say: "Qd5 — Black offers a queen trade centrally. Sidestep with Qh4 keeping queens on, and after …Qe6+ develop Be2 or Be3 with tempo; your lead in development and the safer setup give White a pleasant pull. Keep queens and press.", sayShort: 'Qd5 — Qh4, keep queens, develop.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::b5@17': {
    intro: { say: "b5 — Black grabs queenside space in the Two Knights. Continue a4 challenging it, or Bd3 and O-O with d4; your central development and the loosening …b5 give White targets and a comfortable game. Undermine the queenside.", sayShort: 'b5 — a4 challenges, then develop.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Qa5@11': {
    intro: { say: "Qa5 — Black develops the queen actively. Play Bc4 hitting f7, and after …Bf5 continue Qe2 or d3 and O-O; your development lead and pressure on f7 give a pleasant, active game. Develop with threats.", sayShort: 'Qa5 — Bc4 hits f7, then O-O.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Na6@9': {
    intro: { say: "Na6 — an offbeat knight sortie in the Two Knights. Punish the loose development: play d4, or Bxa6 damaging the pawns, then O-O with your centre and lead; the knight on the rim gives White an easy edge. Develop and press.", sayShort: 'Na6 — d4 or Bxa6, then press.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Be6@11': {
    intro: { say: "Be6 — Black develops the bishop to blunt your queen. Continue b3 and Bb2, or d4 and Bd3, keeping your space and development lead; your harmonious setup against the solid structure gives a comfortable pull. Build and press.", sayShort: 'Be6 — b3 and Bb2, keep pressing.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Nd7@7': {
    intro: { say: "Nd7 — Black develops toward …Ngf6 in the Two Knights. Play Bc4 hitting f7, then O-O and d4 or Ng3, keeping your development lead and central space; the pressure on f7 and easy play give White the edge. Develop with threats.", sayShort: 'Nd7 — Bc4 hits f7, then d4.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Bf5@7': {
    intro: { say: "Bf5 — Black develops the bishop actively. Play Ng3 hitting it, and after …Bg4 h3 wins the bishop pair; then Qxf3 and d4 with the two bishops and a big centre give White a lasting edge. Win the bishop pair and press.", sayShort: 'Bf5 — Ng3 and h3, win bishops.' }, sources: ACK,
  },
};
