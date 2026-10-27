import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Aman batch B: Nimzo-Indian + Caro-Kann (student BLACK);
// Réti/Zukertort/KIA, Anti-Berlin Ruy, French (Classical/Burn/Rubinstein/Fort Knox),
// and the Anti-Caro Two Knights (student WHITE). House voice, board-safe, line-grounded.

const NIM = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
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

  // ===== Caro-Kann (student BLACK) — Advance / exf6 main / Panov / Exchange =====
  'pro-aman-caro-kann::0::Nc3@6': {
    intro: { say: "Nc3 — the Van der Wiel Attack, White lunging g4 and h4 to trap your bishop. Stay calm: …e6, then …Bg6 tucking it safe, …h5 fixing the pawns, and …c5 striking the centre; the committed white pawns become targets. Wild but sound.", sayShort: 'Nc3 — …Bg6 and …h5, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Nd2@6': {
    intro: { say: "Nd2 — a flexible Advance setup. Continue …e6 and …Nd7, meet Nb3 by holding firm, and reroute …Ne7-g6 hitting e5 before the …c5 break; your light bishop is already outside on f5, a comfortable Caro.", sayShort: 'Nd2 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White supports d4 in the Advance. Develop …e6 and …Nd7, then …Ne7-g6 pressuring e5 and the …c5 break; nothing changes the plan — undermine the chain while your bishop stays active outside it.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::Qe2@8': {
    intro: { say: "Qe2 — White centralises the queen early. Trade …Nxe4 and develop …Nd7 and …Nf6 hitting the queen with tempo, then …e6 and …Bd6; you gain time chasing the queen and reach a solid, comfortable Caro. Develop naturally.", sayShort: 'Qe2 — …Nxe4, then …Nf6 with tempo.' }, sources: CK,
  },
  'pro-aman-caro-kann::1::d3@4': {
    intro: { say: "d3 — the Endgame Variation, White trading queens for a quiet game. Take …dxe4 and …Qxd1, then develop actively: …Nf6, …g6 and …Bh6, contesting the dark squares; the queenless middlegame is level, and your easy development plays for the small edge.", sayShort: 'd3 — trade queens, develop actively.' }, sources: CK,
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
  'pro-aman-reti::0::dxc4@7': {
    intro: { say: "dxc4 — Black takes early in the Zukertort. Recapture Bxc4, castle, and meet …c5 with dxc5 or the tension; your development and central presence give a smooth isolated-pawn game where you hold the initiative. Develop and pressure.", sayShort: 'dxc4 — Bxc4 and O-O, press.' }, sources: RETI,
  },
  'pro-aman-reti::1::c6@5': {
    intro: { say: "c6 — Black prepares …d5 against your big centre. Build with Nc3 and e4, and after …d5 recapture toward the centre; your broad d4-e4 pawns and development lead give a strong, space-gaining game. Keep the centre and press.", sayShort: 'c6 — Nc3 and e4, keep centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::c5@5': {
    intro: { say: "c5 — Black strikes at your centre. Take dxc5 and after …Qa5+ block with c3, then Na3 hitting the queen with tempo; you keep the extra central space and a lead in development while Black chases the pawn back. Develop with gain of time.", sayShort: 'c5 — dxc5, then c3 and Na3.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nd7@7': {
    intro: { say: "Nd7 — Black develops toward …e5 in the fianchetto line. Continue Bd3, O-O and Re1, preparing e5 or holding the big centre; your space and harmonious development give a comfortable pull. Break when your pieces are ready.", sayShort: 'Nd7 — Bd3 and O-O, hold centre.' }, sources: RETI,
  },
  'pro-aman-reti::1::Nc6@7': {
    intro: { say: "Nc6 — Black pressures d4 early. Pin with Bb5, keeping your broad centre intact, then O-O and prepare d5 or Re1; the pin and your central space give White the more comfortable game. Develop and press.", sayShort: 'Nc6 — Bb5, keep the big centre.' }, sources: RETI,
  },
  'pro-aman-french-white::1::Bxf6@11': {
    intro: { say: "Bxf6 — after Black recaptures on f6 you reach the Burn main line. Develop Nf3, Bd3 or Bc4 and O-O, using your extra central pawn and lead in development; Black's bishop pair is balanced by your structure and space. Press in the centre.", sayShort: 'Bxf6 — Nf3 and Bd3, press centre.' }, sources: FR,
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
  'pro-aman-anti-caro::1::Qd5@11': {
    intro: { say: "Qd5 — Black offers a queen trade centrally. Sidestep with Qh4 keeping queens on, and after …Qe6+ develop Be2 or Be3 with tempo; your lead in development and the safer setup give White a pleasant pull. Keep queens and press.", sayShort: 'Qd5 — Qh4, keep queens, develop.' }, sources: ACK,
  },
  'pro-aman-anti-caro::1::Qa5@11': {
    intro: { say: "Qa5 — Black develops the queen actively. Play Bc4 hitting f7, and after …Bf5 continue Qe2 or d3 and O-O; your development lead and pressure on f7 give a pleasant, active game. Develop with threats.", sayShort: 'Qa5 — Bc4 hits f7, then O-O.' }, sources: ACK,
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
