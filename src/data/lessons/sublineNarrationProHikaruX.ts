import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Hikaru repertoire: Nimzo-Larsen, Closed Sicilian
// (Grand Prix), Réti (student WHITE); Pirc/Modern, Caro-Kann (student BLACK);
// plus a Naroditsky King's-Indian kid set (student BLACK). House voice,
// board-safe, line-grounded. Every entry answers the opponent's frequent
// deviation with the student-side plan.

const NL = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo%E2%80%93Larsen_Attack'];
const CS = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const RETI = ['concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'];
const PIRC = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Modern_Defense'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const KID = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'];

export const SUBLINE_NARRATION_PRO_HIKARU_X: Record<string, SublineNarration> = {
  // ===== Nimzo-Larsen Attack (student WHITE) =====
  'pro-hikaru-nimzo-larsen::0::d6@5': {
    intro: { say: "d6 — Black props the e5-pawn in the Modern Nimzo-Larsen. Play Bb5, adding pressure to the c6-knight that guards e5, then castle and prepare c4 and a timely d4 to challenge the centre; the b2-bishop already glares down the long diagonal at e5. A patient, harmonious build.", sayShort: 'd6 — Bb5, then c4 and d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::a6@5': {
    intro: { say: "a6 — Black rules out Bb5 but loosens nothing in the centre. Develop Nf3 and strike with d4; after the trades on d4 your queen sits proudly in the middle, and when …d5 arrives you meet it with c4, prising open lines where your central control and lead in development tell.", sayShort: 'a6 — Nf3 and d4, seize centre.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::Nge7@5': {
    intro: { say: "Nge7 — a modest square for the knight, leaving e5 a touch under-defended. Continue Nf3, then Be2 or Bb5, castle, and prepare the d4 break; the b2-bishop rakes the long diagonal and your freer development gives an easy, pleasant game. Build first, then strike the centre.", sayShort: 'Nge7 — Nf3, castle, then d4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::0::Qe7@7': {
    intro: { say: "Qe7 — Black overprotects e5 and readies queenside castling. Keep the pressure: castle, then Nf3 and the d4 break, or trade Bxc6 to fix the pawns and hammer e5 with pieces and the long-diagonal bishop. A comfortable, flexible Nimzo-Larsen edge.", sayShort: 'Qe7 — castle, then d4 or Bxc6.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::c6@5': {
    intro: { say: "c6 — Black builds a solid Slav-like wall and will pin with …Bg4. Meet it calmly: e3, Be2 to answer any pin, then c4 and O-O, chipping at the d5-point; the b2-bishop eyes the long diagonal and White manoeuvres for the central break. Slow, sound pressure.", sayShort: 'c6 — e3 and Be2, then c4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::1::c5@11': {
    intro: { say: "c5 — Black strikes at your d4-c4 centre. Keep it flexible: develop Nc3 and Be2, castle, and answer the tension with cxd5 or dxc5 at the right moment; you reach a comfortable middlegame where the fianchettoed b2-bishop and central space favour White. No hurry to resolve.", sayShort: 'c5 — Nc3 and Be2, hold tension.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::b6@11': {
    intro: { say: "b6 — Black sets up a double fianchetto against your broad centre. Complete development: O-O, c4 and Nc3, gaining central space, then prepare e4 or the d5 push to open lines for your better-placed pieces; the b2-bishop and the space edge give White the more pleasant game.", sayShort: 'b6 — O-O, c4 and Nc3, expand.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::c6@13': {
    intro: { say: "c6 — Black prepares …d5 or …e5 to hit your centre. Grab space with c4 and Nc3, then e4, building a broad pawn front; if …e5 comes, push d5 and the closed centre lets you expand where you choose. Your harmonious setup keeps a steady pull.", sayShort: 'c6 — c4, Nc3 and e4, expand.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::2::Re8@13': {
    intro: { say: "Re8 — Black backs up a coming e5 break. Take the centre first: c4, Nc3 and e4, and when e5 arrives answer d5, clamping the middle, or dxe5 opening the long diagonal for the b2-bishop; either way White keeps the space and the initiative. Expand, then react.", sayShort: 'Re8 — c4, Nc3 and e4, then d5.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::d6@5': {
    intro: { say: "d6 — Black builds a big-pawn English setup. Break with d4, and after the centre opens Black's e4 lunge only looks scary: reroute Nfd2, then hit the overextended pawn with f3 or c4; the b2-bishop and White's better structure turn the advanced e4-pawn into a target.", sayShort: 'd6 — d4, then Nfd2 hits e4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::e5@5': {
    intro: { say: "e5 — Black claims the centre in the English Nimzo-Larsen. Pin with Bb5 against the c6-knight that props e5, then castle and prepare Ne2 and the f4 or d4 break; chipping at the big centre while the b2-bishop waits on the long diagonal gives White a fine game.", sayShort: 'e5 — Bb5, then d4 or f4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::d5@7': {
    intro: { say: "d5 — Black grabs a broad c5-d5 centre. Undermine it: play Bb5 to pressure c6, then c4 striking d5, or Be2 and a timely d4; open the position for your developed pieces and the long-diagonal bishop before Black finishes coordinating. Active, principled play.", sayShort: 'd5 — Bb5 and c4, undermine centre.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::4::d5@9': {
    intro: { say: "d5 — a symmetrical double-fianchetto structure. Break the symmetry with c4, then Nc3 and Bd3, angling for the e4 push or pressure on d5; White's extra tempo as the first player tells, and the b2-bishop's diagonal is the one that opens first. Play for the small, lasting edge.", sayShort: 'd5 — c4 and Nc3, prepare e4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::5::d5@9': {
    intro: { say: "d5 — Black locks a Grünfeld-like centre against your d4. Contest it with c4 and Nc3, and prepare the e4 break or pressure down the c-file after cxd5; the fianchettoed bishop on b2 and White's space give a comfortable, flexible middlegame to press. Choose your break.", sayShort: 'd5 — c4 and Nc3, then e4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::5::b6@9': {
    intro: { say: "b6 — Black answers your centre with a second fianchetto. Seize more space: c4, Nc3 and Be2, then castle and prepare e4, building a broad front Black must contain; the b2-bishop and the space advantage keep White comfortably on top. Build up, then strike e4.", sayShort: 'b6 — c4, Nc3, then e4.' }, sources: NL,
  },

  // ===== Closed Sicilian / Grand Prix Attack (student WHITE) =====
  'pro-hikaru-closed-sicilian::0::b6@19': {
    intro: { say: "b6 — Black readies …Bb7 to contest the long diagonal. Press on: Qe1 heading for h4, Bf4 or Ng5 hitting e6, and pile down the open f-file toward f7; your c4-bishop already stares at e6 and the a4-pawn cramps the queenside. White attacks where he is stronger.", sayShort: 'b6 — Qe1-h4 and Ng5, press e6.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::Rb8@19': {
    intro: { say: "Rb8 — Black loads the b-file for …b5. Beat the clock on the other wing: Qe1-h4, Bg5 or Ng5 targeting e6, and swing a rook to f3; the open f-file and the c4-bishop bearing on e6 give White the faster attack while Black is still arranging queenside play.", sayShort: 'Rb8 — Qe1-h4 and Rf3, attack.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::h6@19': {
    intro: { say: "h6 — Black denies your knight and bishop the g5-square. No matter: Qe1-h4, Be3 and Nd5, or prise the centre with a timely d4; the open f-file and the bishop raking e6 keep the initiative firmly White's. Probe patiently until the kingside cracks.", sayShort: 'h6 — Qe1-h4 and Nd5, keep pressing.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::Ne5@19': {
    intro: { say: "Ne5 — Black centralises the knight on a fine square. Challenge it: Nxe5 Bxe5, then Bf4 or d4 hitting the bishop and opening lines, or Bb3 keeping the light-squared bishop trained on e6 and f7; White untangles the outpost and the f-file initiative rolls on.", sayShort: 'Ne5 — Nxe5, then Bf4 or d4.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::Qc7@19': {
    intro: { say: "Qc7 — Black connects and eyes the e5-square. Gain tempo with Bf4 hitting the queen, then Qe1-h4 and Ng5 against e6; the open f-file and the c4-bishop on the a2-g8 diagonal mean White's attack arrives first. Keep throwing pieces at the king.", sayShort: 'Qc7 — Bf4 with tempo, then Ng5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::Bd7@19': {
    intro: { say: "Bd7 — Black completes development and covers the light squares. Press the attack: Qe1-h4, Bg5 or Ng5 hitting e6, and double on the f-file toward f7; your c4-bishop and the open lines from the f5-break give White the initiative. Attack the king, not the queenside.", sayShort: 'Bd7 — Qe1-h4 and Ng5, hit f7.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::0::fxe6@13': {
    intro: { say: "fxe6 — Black recaptures toward the centre, opening his own f-file but conceding a backward e6-pawn. Strike with d4, opening the position for your pieces, then Ng5 and Be3 to swarm the weak e6-pawn; the c4-bishop already bears on it. Play against that target.", sayShort: 'fxe6 — d4 and Ng5, target e6.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::d6@7': {
    intro: { say: "d6 — Black sets up a compact Scheveningen-style wall. Pin with Bb5 on the c6-knight, and after …Bd7 consider Bxc6 then O-O and a d3-e5 or f5 pawn advance; the f4-pawn is your battering ram on the kingside. Build the attack behind it.", sayShort: 'd6 — Bb5, O-O, then f5 or e5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::d4@9': {
    intro: { say: "d4 — Black grabs space and kicks the knight. Reroute Ne2, eyeing g3 and f5, then castle and undermine the advanced d4-pawn with c3 at the right moment; Black's pawn looks proud but becomes a target, and White's f-pawn still promises a kingside push. Patience.", sayShort: 'd4 — Ne2, then c3 undermines it.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::Nxd5@11': {
    intro: { say: "Nxd5 — Black recaptures into the centre with the knight. Challenge it: O-O, then d4 opening the position, or Bxc6 and Ne4 hitting the centralised knight; White's lead in development and the half-open lines from the exchange give a lively edge. Develop and strike quickly.", sayShort: 'Nxd5 — O-O and d4, hit centre.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::Nf6@7': {
    intro: { say: "Nf6 — natural development, but the knight can be a target for a pawn storm. Play Bb5 pinning c6, or d3 and O-O readying the e5 and f5 advances; the f4-pawn anchors a kingside attack while your pieces pour out. Grand Prix pressure builds itself.", sayShort: 'Nf6 — Bb5 or d3, then f5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::Bg4@13': {
    intro: { say: "Bg4 — Black pins your knight to defend the isolated d5-pawn. Break the pin with h3, forcing …Bxf3 or a retreat, then Bxc6 and pile on the weak d-pawn with pieces; White's pressure on the isolani and the open lines give a clean, pleasant advantage. Round up d5.", sayShort: 'Bg4 — h3 breaks pin, target d5.' }, sources: CS,
  },

  // ===== Réti / Zukertort (student WHITE) =====
  'pro-hikaru-reti::0::d5@7': {
    intro: { say: "d5 — Black meets your centre with a Grünfeld-like wall. Complete the harmonious build: e3, Be2 and O-O, then c4 striking d5; the b2-bishop supports the long diagonal and White manoeuvres for the central break with a small, steady space edge. No hurry.", sayShort: 'd5 — e3, Be2, then c4.' }, sources: RETI,
  },
  'pro-hikaru-reti::0::c5@11': {
    intro: { say: "c5 — Black strikes at d4. Castle and keep the centre firm with c3, or answer the tension with dxc5 and recapture the initiative; the b2-bishop eyes e5 and the long diagonal, and White's flexible pawns let you choose the favourable structure. Solid and pressing.", sayShort: 'c5 — O-O and c3, hold centre.' }, sources: RETI,
  },
  'pro-hikaru-reti::0::c5@7': {
    intro: { say: "c5 — an early hit on your centre. Support d4 with e3 and c3, castle, and develop Be2 and Nbd2; keep the tension until your pieces are ready, then choose between dxc5 and holding, with the fianchettoed bishop bearing down the long diagonal. Patient central play.", sayShort: 'c5 — e3 and c3, support d4.' }, sources: RETI,
  },
  'pro-hikaru-reti::0::d6@7': {
    intro: { say: "d6 — Black adopts a King's-Indian shape against your centre. Take space: c4, Be2 and O-O, then aim for e4, building a broad front; if Black strikes with …e5, meet it with d5 or dxe5 opening the long diagonal for the b2-bishop. White keeps the pull.", sayShort: 'd6 — c4 and Be2, prepare e4.' }, sources: RETI,
  },
  'pro-hikaru-reti::0::b6@13': {
    intro: { say: "b6 — Black completes a double fianchetto behind your centre. Expand with c4 and Nc3, then prepare e4, seizing the middle of the board; your space and the b2-bishop's diagonal give an easy, pleasant game where Black must sit and react. Build patiently, then break.", sayShort: 'b6 — c4, Nc3, then e4.' }, sources: RETI,
  },
  'pro-hikaru-reti::1::c5@5': {
    intro: { say: "c5 — Black builds a broad d5-c5 centre. Challenge it with c4 and e3, then Be2 and O-O; after the tension resolves you play against hanging pawns or an isolani, and the b2-bishop rakes the long diagonal toward e5. A classic Réti squeeze on the centre.", sayShort: 'c5 — c4 and e3, pressure centre.' }, sources: RETI,
  },
  'pro-hikaru-reti::1::c6@5': {
    intro: { say: "c6 — Black sets a solid Slav wall. Add a second fianchetto: g3 and Bg2, castle, then d3 and Nbd2 preparing the e4 break; with both bishops raking the long diagonals White plays a patient Réti, chipping at d5 and expanding when the moment is right.", sayShort: 'c6 — g3, Bg2, then e4 break.' }, sources: RETI,
  },
  'pro-hikaru-reti::1::b6@7': {
    intro: { say: "b6 — Black answers with a double fianchetto. Strike the centre with c4, then Nc3 and Be2; contest d5 and open the long diagonal for your b2-bishop, where White's extra tempo tells first. Manoeuvre calmly and press the small structural edge. A textbook Réti.", sayShort: 'b6 — c4 and Nc3, contest d5.' }, sources: RETI,
  },
  'pro-hikaru-reti::1::Nbd7@7': {
    intro: { say: "Nbd7 — Black develops quietly toward a solid setup. Grab space with c4, then Be2 and O-O, pressuring d5 and preparing d4 or Ne5; the b2-bishop's diagonal and White's harmonious pieces give a comfortable, nagging pull. Build up and choose your break.", sayShort: 'Nbd7 — c4 and Be2, press d5.' }, sources: RETI,
  },
  'pro-hikaru-reti::1::c5@11': {
    intro: { say: "c5 — Black challenges your d4-centre after castling. Answer c3 to hold, or dxc5 and Nbd2 to play against the loosened pawns; the Bd3 and Bb2 both aim at Black's king, and once the pieces are poised you push in the centre or on the kingside. Keep the tension working.", sayShort: 'c5 — c3 or dxc5, aim kingside.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::Nf6@9': {
    intro: { say: "Nf6 — Black develops as you break with d4. Continue Be2 and O-O, and resolve the centre with dxc5 or by holding; White's pieces flow to natural squares and the b2-bishop bears on the long diagonal. A pleasant Réti-into-open structure with the better coordination.", sayShort: 'Nf6 — d4, Be2 and O-O, press.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::e6@7': {
    intro: { say: "e6 — Black shores up the centre. Pin with Bb5 on the c6-knight, then break with d4; after exchanges the b2-bishop rakes toward e5 and White's slight lead in development gives an easy game. Trade on c6 if it fixes a target, then press the centre.", sayShort: 'e6 — Bb5 and d4, press centre.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::Bg4@7': {
    intro: { say: "Bg4 — Black pins your knight before you break. Play h3 to question the bishop, or Be2 and d4 striking the centre; the b2-bishop and White's development answer the pin comfortably, and once you achieve d4 the position opens in your favour. No reason to fear the pin.", sayShort: 'Bg4 — h3 or Be2, then d4.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::f6@7': {
    intro: { say: "f6 — a committal move that weakens Black's king. Break with d4, opening the centre while Black is loosened; after the exchanges meet …Bg4 with Be2 or h3, then castle and probe the weakened light squares. White's structure and the long-diagonal bishop promise the better game.", sayShort: 'f6 — d4 opens it, exploit weakness.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::Bg4@9': {
    intro: { say: "Bg4 — Black pins as the centre opens. Meet it with Be2 and h3, breaking the pin, then resolve the tension with dxc5 or by castling and holding; White's smooth development and the b2-bishop's reach down the long diagonal keep a comfortable edge. Untangle and press.", sayShort: 'Bg4 — Be2 and h3, then castle.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::e6@11': {
    intro: { say: "e6 — Black reaches an open, Scheveningen-like centre. You are already comfortable: Be2 and O-O, then choose Nxc6 or c4 to fix the structure; the b2-bishop eyes e5 and the long diagonal, and White's harmonious pieces give a steady initiative. Simple, strong development.", sayShort: 'e6 — Be2 and O-O, then c4.' }, sources: RETI,
  },

  // ===== Pirc / Modern Defense (student BLACK) =====
  'pro-hikaru-pirc-modern::0::h4@8': {
    intro: { say: "h4 — White reaches for a kingside pawn storm. Stay unruffled: complete the fianchetto with …Bb7 on the long diagonal, then …d6 and …Nd7, and prepare the …c5 and …b4 breaks; White's h-pawn lunge neglects the centre, and Black strikes there while the king stays flexible.", sayShort: 'h4 — …Bb7 and …d6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::0::f3@8': {
    intro: { say: "f3 — White braces e4 and readies queenside castling. Answer …Bb7 and …d6, then …Nd7 and the …b4 break, prising open lines toward White's king; if White goes long, your …a5 and …c5 pawns storm first. Black's queenside expansion is the whole point of this Modern. Race there.", sayShort: 'f3 — …Bb7 and …d6, then …b4.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::0::Bg5@6': {
    intro: { say: "Bg5 — White develops the bishop actively and grabs space with f4. Undermine the broad centre: …Bb7 and …d6, then …Nd7 and …c5 striking d4, with …h6 questioning the bishop if it annoys you. White's wide pawns are overextended, and Black counterattacks the centre with tempo.", sayShort: 'Bg5 — …Bb7, …d6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::0::a3@8': {
    intro: { say: "a3 — White clamps down on …b4. Shift the lever: …Bb7 and …d6, then …Nd7 and …c5 hitting d4, with …a5 preparing …b4 later; a3 costs White time and Black keeps expanding on the queenside and in the centre. Flexible pressure where White has committed. Strike d4.", sayShort: 'a3 — …Bb7, …d6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::0::Nf3@8': {
    intro: { say: "Nf3 — White develops naturally. Continue …Bb7 and …d6, then …Nd7 and prepare the …c5 and …b4 breaks; your fianchettoed bishop rakes the long diagonal toward e4 and Black's queenside pawns roll while the centre stays under fire. This is Black's comfortable Modern.", sayShort: 'Nf3 — …Bb7 and …d6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::0::O-O-O@12': {
    intro: { say: "O-O-O — White castles into the teeth of your expansion. Now it is a race you are winning: …Nd7, then …b4 kicking the knight and …a5-a4 tearing open the queenside; every Black pawn points at White's king. Open lines fast and attack. The Modern was built for exactly this.", sayShort: 'O-O-O — …Nd7 and …b4, storm king.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::1::Be2@6': {
    intro: { say: "Be2 — White develops quietly and will push e5. Meet it head-on: …d5 stakes the centre, then …Bg4 pins the knight and …e6, …Ne7 and …c5 strike at the d4-e5 chain; Black gets a comfortable French-like structure with the good bishop already outside. Break at the base.", sayShort: 'Be2 — …d5 and …Bg4, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::1::Bd3@12': {
    intro: { say: "Bd3 — White develops toward your king after the central exchanges. Simplify and free your game: …Nxe4 trades a pair, then …O-O, …Nd7 and …c5 breaking at d4; Black has the solid structure and the fianchettoed bishop, and White's attacking hopes fade once the centre clarifies.", sayShort: 'Bd3 — …Nxe4, then …O-O and …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::1::e5@8': {
    intro: { say: "e5 — White gains space and closes the centre. Play against the chain: …Bg4 pins the f3-knight, then …e6 and …Ne7 heading for f5, and …c5 hitting the d4-base; Black's light bishop is already active outside the pawns, a comfortable Advance-French shape. Undermine d4.", sayShort: 'e5 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::1::Bd3@14': {
    intro: { say: "Bd3 — White develops after saddling you with doubled f-pawns, but you gained the half-open e-file and the bishop pair. Play …O-O and …Re8 seizing the file, then …Bf5 or …Bd6 and a timely …f5; the doubled pawns control central squares and Black is comfortably active.", sayShort: 'Bd3 — …O-O and …Re8, then …f5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::h3@6': {
    intro: { say: "h3 — a quiet prop before the central clash. Strike …d5 at once, then after the exchanges …Nf6 hits the e4-knight; follow with …O-O, …Nbd7 and …c5, breaking at d4. Black's solid centre and the active bishop on g7 give a full, comfortable game. Trade centrally and free the pieces.", sayShort: 'h3 — …d5 and …Nf6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bd3@12': {
    intro: { say: "Bd3 — White eyes your king after the central trades. Ease the pressure: …Nxe4 removes an attacker, then …O-O, …Nd7 and …c5 hitting d4; Black's structure is sound and the g7-bishop rakes the long diagonal. Once the centre clears, White has nothing. Simplify and break.", sayShort: 'Bd3 — …Nxe4, then …O-O and …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bc4@6': {
    intro: { say: "Bc4 — White aims the bishop at f7, but it becomes a target. Kick it with …b5 and …a5-a4, gaining queenside space and tempo, then …d6 and …b4 to break open lines; White's bishop is chased around while Black's pawns roll. The queenside expansion runs itself. Attack there.", sayShort: 'Bc4 — …b5 and …a4, chase bishop.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::h4@6': {
    intro: { say: "h4 — White throws the h-pawn forward. Blunt it with …h5 fixing the pawns, and answer e5 with …Bg4 pinning the knight, then …e6, …Ne7 toward f5 and …c5 at the base; White's flank lunge left the centre for Black to attack. Fix the kingside, then strike d4.", sayShort: 'h4 — …h5 and …Bg4, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bd3@14': {
    intro: { say: "Bd3 — White develops after the …exf6 recapture leaves you doubled but with the open e-file and two bishops. Take the file with …O-O and …Re8, post …Bf5 or …Bd6, and prepare …f5; the doubled pawns guard central squares and Black's activity fully compensates. Play on the e-file.", sayShort: 'Bd3 — …O-O and …Re8, then …f5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::e5@8': {
    intro: { say: "e5 — White closes the centre and grabs space. Undermine the chain: …Bg4 pins f3, then …e6 and …Ne7 rerouting to f5, and …c5 hitting the d4-base; the light bishop is already outside the pawns and Black gets a pleasant Advance-French structure. Attack the base of the chain.", sayShort: 'e5 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bd3@8': {
    intro: { say: "Bd3 — White develops but leaves the central tension. Pin with …Bg4, then …e6 and …Nd7, and choose …dxe4 to trade or …c5 to strike d4; Black finishes development comfortably while White's bishop bites on the solid pawn chain. Resolve the centre on your terms.", sayShort: 'Bd3 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Be2@14': {
    intro: { say: "Be2 — a modest square after the …exf6 recapture, and Black is comfortable. Grab the half-open e-file with …O-O and …Re8, develop …Bd6 and …Bf5 or …Be6, and roll …f5 in time; the doubled pawns cover e5 and d5 and Black's bishops rake the board. Activity and the file are yours.", sayShort: 'Be2 — …O-O and …Re8, then …f5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::exd5@8': {
    intro: { say: "exd5 — White trades into an open, symmetrical centre and checks with Bb5. Block with …Nc6, then …Nf6, …O-O and …Bf5 or …Bg4, developing every piece to a good square; the structure is level but Black's fianchettoed bishop and easy play give the more comfortable game.", sayShort: 'exd5 — …Nc6 and …Nf6, then …Bf5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Be3@8': {
    intro: { say: "Be3 — White develops but concedes the central tension. Take on e4 and simplify: after …dxe4 and …Nf6 hitting the knight, continue …Nxe4 or …Nbd7, then …O-O and …c5; Black's solid structure and the long-diagonal bishop equalise easily. Trade centrally and break with …c5.", sayShort: 'Be3 — …Nf6 and …Nxe4, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::3::Be2@12': {
    intro: { say: "Be2 — White unpins after your …Bg4. Continue the plan: …e6 and …Ne7 heading for f5, then …c5 striking the d4-base while the e5-f4 chain stays under fire; keep the light bishop active and break where White's pawns are overextended. Play against the centre.", sayShort: 'Be2 — …e6 and …Ne7, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::3::Bd3@16': {
    intro: { say: "Bd3 — White eyes the kingside light squares after winning the bishop pair. The natural …c5 break is tempting but premature here — develop first: the accurate move is …Ne7, heading for f5 and finishing your setup, then …Nd7 and …c5 hits d4 with everything ready. Patience turns the lever into a real threat.", sayShort: 'Bd3 — …Ne7 first, then …c5 break.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::3::g4@16': {
    intro: { say: "g4 — White grabs kingside space but bares his own king. Ignore the flank and blast the centre: …c5 hitting d4, then …Nc6 and …Ne7, opening lines while White's king has no shelter; the g4-advance is a target for …h5 later. Strike where White is weakest — the middle.", sayShort: 'g4 — …c5 and …Nc6, hit centre.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::3::O-O-O@18': {
    intro: { say: "O-O-O — White castles into your queenside pawns. Open the gates: …Nd7, then …c5 and …b5-b4, prising lines toward the king with …Qa5 to follow; your …a6 and …c6 were placed for exactly this storm. Black's attack lands first — race straight at White's king.", sayShort: 'O-O-O — …c5 and …b5, storm king.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::3::g4@18': {
    intro: { say: "g4 — White lunges to open the h-file, but it wrecks his own king. Take with …hxg4, then answer hxg4 by striking the centre with …c5 and …Nc6; the open h-file and White's tattered pawns give Black the attack. Meet the flank lunge with a central counter and target the king.", sayShort: 'g4 — …hxg4, then …c5 counter.' }, sources: PIRC,
  },

  // ===== Caro-Kann (student BLACK) =====
  'pro-hikaru-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White braces d4 in the Advance. Nothing changes the plan: …e6 and …Nd7, then …Ne7 heading for g6 to hit e5, and the …c5 break at the base of the chain; your light bishop is already outside on f5, the whole point of the Caro. Undermine d4 and e5.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::0::c3@14': {
    intro: { say: "c3 — White props d4 in the Short System. Strike the base: …c5, then …Nc6 and …Qb6, piling on d4 and b2, with …Ng6 hitting e5; your bishop on f5 is already active and Black's pressure on the chain gives full, easy equality. Break with …c5.", sayShort: 'c3 — …c5 and …Nc6, hit d4.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::0::c3@12': {
    intro: { say: "c3 — White supports d4 before you finish developing. Continue …Ne7 toward g6, hitting e5, then …c5 and …Qb6, ganging up on d4; the f5-bishop stays a star outside the pawn chain and Black's thematic pressure equalises comfortably. Reroute the knight, then break.", sayShort: 'c3 — …Ne7-g6, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::0::Be3@12': {
    intro: { say: "Be3 — White overprotects d4 in the Short System. Play the standard plan: …Ne7 rerouting to g6 to pressure e5, then …c5 and …Qb6 at the base of the chain; your active bishop on f5 and the pressure on d4 give an easy, weakness-free game. Undermine and equalise.", sayShort: 'Be3 — …Ne7-g6, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Nf3@6': {
    intro: { say: "Nf3 — a quiet Exchange Caro. Develop naturally: …Nc6 and …Nf6, then …Bg4 or …Bf5 to get the light bishop active outside the chain, and …e6, …Bd6, …O-O; the symmetrical structure is level, but Black's easy development plays for the small edge. If Bf4 comes, …Bd6 or …Nh5 questions it.", sayShort: 'Nf3 — …Nc6, …Nf6, then …Bg4.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::h3@10': {
    intro: { say: "h3 — a quiet prop in the Exchange. Complete the fianchetto with …Bg7 and …O-O, then …Nf6 and …Rc8, using the half-open c-file and the long-diagonal bishop; the level structure gives Black an easy, active game to press for the small edge. Castle and pile on the c-file.", sayShort: 'h3 — …Bg7, …O-O, then …Rc8.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Bxf5@12': {
    intro: { say: "Bxf5 — White doubles your f-pawns, but you gain the open g-file toward his king. Recapture …gxf5, then …e6, …Bg7 and …Qd7 or …Qb6, and aim a rook down the g-file; the doubled pawns control e4 and g4, and Black's attacking chances outweigh the structural nick. Play on the g-file.", sayShort: 'Bxf5 — …gxf5, then …Bg7 and g-file.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Ne2@10': {
    intro: { say: "Ne2 — White reroutes the knight toward f4 or g3. Finish developing: …Bg7 and …Nf6, then …O-O and …Bf5 challenging the d3-bishop, with …Rc8 on the half-open file; the symmetric Exchange gives Black a comfortable, active game. Trade the light bishops and press the c-file.", sayShort: 'Ne2 — …Bg7, …Nf6, then …Bf5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Be2@12': {
    intro: { say: "Be2 — White sidesteps the bishop trade, which suits you — your bishop stays active on f5. Continue …Bg7 and …Nf6, then …e6, …O-O and …Rc8, developing smoothly with the light bishop outside the chain; the level structure and Black's harmonious pieces play for the edge. Castle and use the c-file.", sayShort: 'Be2 — …Bg7 and …Nf6, then …Rc8.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::g4@14': {
    intro: { say: "g4 — White grabs space but loosens his own king. Clamp the centre with …d4, gaining a queenside space chain, then …Ne7 and …Nd7, castle, and prepare …b5 or …f5; White's g4 lunge becomes a target and Black's solid structure gives the better long-term game. Fix the centre, then attack.", sayShort: 'g4 — …d4 and …Ne7, then …b5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::Be2@6': {
    intro: { say: "Be2 — White develops modestly and grabs the centre with d4. Continue …Nf6 and …dxe4, then …Nbd7, …Bd6 and …O-O, or keep the tension with …Be7; your bishop is comfortably outside on g4 and Black reaches a solid structure with easy development. Resolve the centre and castle.", sayShort: 'Be2 — …Nf6 and …dxe4, then …O-O.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::d4@6': {
    intro: { say: "d4 — White claims the full centre. Trade the bishop for the knight and hit back: after …Bxf3 and …Nf6, strike …dxe4, opening lines; then …Nbd7, …Bd6 and …O-O, with …c5 to challenge d4. Black's structure is sound and the bishop pair is offset by easy development and central pressure.", sayShort: 'd4 — …dxe4, then …Bd6 and …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::a3@10': {
    intro: { say: "a3 — White spends a tempo stopping …Bb4. Use the time: …Bd6 and …O-O, then …dxe4 or the …d4 clamp, and prepare …c5 or …e5 to open for your pieces; Black's solid structure and White's slightly passive setup hand you a comfortable game. Complete development, then break the centre.", sayShort: 'a3 — …Bd6 and …O-O, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::g3@14': {
    intro: { say: "g3 — White prepares a kingside fianchetto. Set your own house in order: …Ne7 and …Nd7, then …O-O and the …d4 clamp or …dxe4; with the closed centre, prepare …b5 and …f5 to expand on both wings. Black's harmonious King's-Indian-like structure gives a full game. Castle and choose your break.", sayShort: 'g3 — …Ne7 and …O-O, then …f5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::Be2@14': {
    intro: { say: "Be2 — White develops the bishop to a quiet square. Continue …Ne7 and …Nd7, then …O-O, and resolve the centre with …dxe4 or the …d4 clamp; once the structure settles, …b5 or …f5 expands your game. Black's solid setup and the long-diagonal bishop give a pleasant middlegame. Develop, then break.", sayShort: 'Be2 — …Ne7, …O-O, then …f5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::2::h4@14': {
    intro: { say: "h4 — White reaches for a kingside pawn storm. Fix it with …h5, halting h4-h5, then develop …Ne7 and …Nd7 and clamp with …d4 or trade …dxe4; White's flank lunge neglects the centre, where Black strikes. Keep the king flexible and counter in the middle. The h-pawn becomes a weakness.", sayShort: 'h4 — …h5 and …Ne7, then …d4.' }, sources: CK,
  },

  // ===== King's Indian Defence — Naroditsky kid set (student BLACK) =====
  'pro-naroditsky-kid::0::Rfd1@22': {
    intro: { say: "Rfd1 — White centralises a rook against d6. Your knight on f4 is a monster: back it up with …Bd7 and …Ne5, eyeing the light squares and the …Nxe2 trade at the right moment; with the centre exchanged, Black's active pieces and the dark-squared bishop give full, comfortable play. Keep the knight strong.", sayShort: 'Rfd1 — …Bd7 and …Ne5, stay active.' }, sources: KID,
  },
  'pro-naroditsky-kid::2::Re1@16': {
    intro: { say: "Re1 — White backs the e4-pawn in the Fianchetto. Contest the centre: …Qb6 hitting d4 and b2, or …exd4 and …Re8, then …a5 gaining space and …Nh5 or …Qe7 preparing …f5; the fianchetto is solid but Black's pressure on d4 and the …f5 break give a full game. Play against d4 first.", sayShort: 'Re1 — …Qb6 or …exd4, press d4.' }, sources: KID,
  },
  'pro-naroditsky-kid::2::Be3@16': {
    intro: { say: "Be3 — White develops the bishop, but it invites …Ng4. Hit it: …Ng4 forces the bishop to declare, then …exd4 and …Re8 with active pieces, or …Qe7 and …a5 gaining space; Black contests d4 and prepares the …f5 break behind the fianchetto. The g7-bishop and central pressure give a comfortable game.", sayShort: 'Be3 — …Ng4 hits it, then …exd4.' }, sources: KID,
  },
  'pro-naroditsky-kid::3::Nf3@10': {
    intro: { say: "Nf3 — White completes the Makogonov, clamping g4 with the pawn on h3. Strike the centre with …e5, then …Nc6 or …Na6-c5, and if White locks with d5, launch …f5, …f4 and the kingside avalanche; h3 becomes a hook for …h5-h4 later. Break …e5, then storm the king.", sayShort: 'Nf3 — …e5, then …f5 storm.' }, sources: KID,
  },
  'pro-naroditsky-kid::3::g3@18': {
    intro: { say: "g3 — White stops your …Nf4 leap. No matter — the storm continues: reroute the knight with …Nf6, then …f5 and …Nc5 hitting e4, and pile pawns at the king while …cxd5 can open the c-file; the closed centre guarantees your kingside attack a free run. Roll the pawns.", sayShort: 'g3 — …f5 and …Nc5, storm king.' }, sources: KID,
  },
};
