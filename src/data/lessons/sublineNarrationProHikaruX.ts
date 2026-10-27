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
  'pro-hikaru-nimzo-larsen::1::c6@5': {
    intro: { say: "c6 — Black builds a solid Slav-like wall and will pin with …Bg4. Meet it calmly: e3, Be2 to answer any pin, then c4 and O-O, chipping at the d5-point; the b2-bishop eyes the long diagonal and White manoeuvres for the central break. Slow, sound pressure.", sayShort: 'c6 — e3 and Be2, then c4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::d6@5': {
    intro: { say: "d6 — Black builds a big-pawn English setup. Break with d4, and after the centre opens Black's e4 lunge only looks scary: reroute Nfd2, then hit the overextended pawn with f3 or c4; the b2-bishop and White's better structure turn the advanced e4-pawn into a target.", sayShort: 'd6 — d4, then Nfd2 hits e4.' }, sources: NL,
  },
  'pro-hikaru-nimzo-larsen::3::e5@5': {
    intro: { say: "e5 — Black claims the centre in the English Nimzo-Larsen. Pin with Bb5 against the c6-knight that props e5, then castle and prepare Ne2 and the f4 or d4 break; chipping at the big centre while the b2-bishop waits on the long diagonal gives White a fine game.", sayShort: 'e5 — Bb5, then d4 or f4.' }, sources: NL,
  },
  'pro-hikaru-closed-sicilian::1::d6@7': {
    intro: { say: "d6 — Black sets up a compact Scheveningen-style wall. Pin with Bb5 on the c6-knight, and after …Bd7 consider Bxc6 then O-O and a d3-e5 or f5 pawn advance; the f4-pawn is your battering ram on the kingside. Build the attack behind it.", sayShort: 'd6 — Bb5, O-O, then f5 or e5.' }, sources: CS,
  },
  'pro-hikaru-closed-sicilian::1::d4@9': {
    intro: { say: "d4 — Black grabs space and kicks the knight. Reroute Ne2, eyeing g3 and f5, then castle and undermine the advanced d4-pawn with c3 at the right moment; Black's pawn looks proud but becomes a target, and White's f-pawn still promises a kingside push. Patience.", sayShort: 'd4 — Ne2, then c3 undermines it.' }, sources: CS,
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
  'pro-hikaru-reti::2::e6@7': {
    intro: { say: "e6 — Black shores up the centre. Pin with Bb5 on the c6-knight, then break with d4; after exchanges the b2-bishop rakes toward e5 and White's slight lead in development gives an easy game. Trade on c6 if it fixes a target, then press the centre.", sayShort: 'e6 — Bb5 and d4, press centre.' }, sources: RETI,
  },
  'pro-hikaru-reti::2::f6@7': {
    intro: { say: "f6 — a committal move that weakens Black's king. Break with d4, opening the centre while Black is loosened; after the exchanges meet …Bg4 with Be2 or h3, then castle and probe the weakened light squares. White's structure and the long-diagonal bishop promise the better game.", sayShort: 'f6 — d4 opens it, exploit weakness.' }, sources: RETI,
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
  'pro-hikaru-pirc-modern::1::Be2@6': {
    intro: { say: "Be2 — White develops quietly and will push e5. Meet it head-on: …d5 stakes the centre, then …Bg4 pins the knight and …e6, …Ne7 and …c5 strike at the d4-e5 chain; Black gets a comfortable French-like structure with the good bishop already outside. Break at the base.", sayShort: 'Be2 — …d5 and …Bg4, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::1::e5@8': {
    intro: { say: "e5 — White gains space and closes the centre. Play against the chain: …Bg4 pins the f3-knight, then …e6 and …Ne7 heading for f5, and …c5 hitting the d4-base; Black's light bishop is already active outside the pawns, a comfortable Advance-French shape. Undermine d4.", sayShort: 'e5 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::h3@6': {
    intro: { say: "h3 — a quiet prop before the central clash. Strike …d5 at once, then after the exchanges …Nf6 hits the e4-knight; follow with …O-O, …Nbd7 and …c5, breaking at d4. Black's solid centre and the active bishop on g7 give a full, comfortable game. Trade centrally and free the pieces.", sayShort: 'h3 — …d5 and …Nf6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bc4@6': {
    intro: { say: "Bc4 — White aims the bishop at f7, but it becomes a target. Kick it with …b5 and …a5-a4, gaining queenside space and tempo, then …d6 and …b4 to break open lines; White's bishop is chased around while Black's pawns roll. The queenside expansion runs itself. Attack there.", sayShort: 'Bc4 — …b5 and …a4, chase bishop.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::h4@6': {
    intro: { say: "h4 — White throws the h-pawn forward. Blunt it with …h5 fixing the pawns, and answer e5 with …Bg4 pinning the knight, then …e6, …Ne7 toward f5 and …c5 at the base; White's flank lunge left the centre for Black to attack. Fix the kingside, then strike d4.", sayShort: 'h4 — …h5 and …Bg4, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::e5@8': {
    intro: { say: "e5 — White closes the centre and grabs space. Undermine the chain: …Bg4 pins f3, then …e6 and …Ne7 rerouting to f5, and …c5 hitting the d4-base; the light bishop is already outside the pawns and Black gets a pleasant Advance-French structure. Attack the base of the chain.", sayShort: 'e5 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Bd3@8': {
    intro: { say: "Bd3 — White develops but leaves the central tension. Pin with …Bg4, then …e6 and …Nd7, and choose …dxe4 to trade or …c5 to strike d4; Black finishes development comfortably while White's bishop bites on the solid pawn chain. Resolve the centre on your terms.", sayShort: 'Bd3 — …Bg4 and …e6, then …c5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::exd5@8': {
    intro: { say: "exd5 — White trades into an open, symmetrical centre and checks with Bb5. Block with …Nc6, then …Nf6, …O-O and …Bf5 or …Bg4, developing every piece to a good square; the structure is level but Black's fianchettoed bishop and easy play give the more comfortable game.", sayShort: 'exd5 — …Nc6 and …Nf6, then …Bf5.' }, sources: PIRC,
  },
  'pro-hikaru-pirc-modern::2::Be3@8': {
    intro: { say: "Be3 — White develops but concedes the central tension. Take on e4 and simplify: after …dxe4 and …Nf6 hitting the knight, continue …Nxe4 or …Nbd7, then …O-O and …c5; Black's solid structure and the long-diagonal bishop equalise easily. Trade centrally and break with …c5.", sayShort: 'Be3 — …Nf6 and …Nxe4, then …c5.' }, sources: PIRC,
  },

  // ===== Caro-Kann (student BLACK) =====
  'pro-hikaru-caro-kann::0::Be3@6': {
    intro: { say: "Be3 — White braces d4 in the Advance. Nothing changes the plan: …e6 and …Nd7, then …Ne7 heading for g6 to hit e5, and the …c5 break at the base of the chain; your light bishop is already outside on f5, the whole point of the Caro. Undermine d4 and e5.", sayShort: 'Be3 — …e6 and …Nd7, then …c5.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Nf3@6': {
    intro: { say: "Nf3 — a quiet Exchange Caro. Develop naturally: …Nc6 and …Nf6, then …Bg4 or …Bf5 to get the light bishop active outside the chain, and …e6, …Bd6, …O-O; the symmetrical structure is level, but Black's easy development plays for the small edge. If Bf4 comes, …Bd6 or …Nh5 questions it.", sayShort: 'Nf3 — …Nc6, …Nf6, then …Bg4.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::h3@10': {
    intro: { say: "h3 — a quiet prop in the Exchange. Complete the fianchetto with …Bg7 and …O-O, then …Nf6 and …Rc8, using the half-open c-file and the long-diagonal bishop; the level structure gives Black an easy, active game to press for the small edge. Castle and pile on the c-file.", sayShort: 'h3 — …Bg7, …O-O, then …Rc8.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Bxf5@12': {
    intro: { say: "Bxf5 — White doubles your f-pawns, but you gain the open g-file toward their king. Recapture …gxf5, then …e6, …Bg7 and …Qd7 or …Qb6, and aim a rook down the g-file; the doubled pawns control e4 and g4, and Black's attacking chances outweigh the structural nick. Play on the g-file.", sayShort: 'Bxf5 — …gxf5, then …Bg7 and g-file.' }, sources: CK,
  },
  'pro-hikaru-caro-kann::1::Ne2@10': {
    intro: { say: "Ne2 — White reroutes the knight toward f4 or g3. Finish developing: …Bg7 and …Nf6, then …O-O and …Bf5 challenging the d3-bishop, with …Rc8 on the half-open file; the symmetric Exchange gives Black a comfortable, active game. Trade the light bishops and press the c-file.", sayShort: 'Ne2 — …Bg7, …Nf6, then …Bf5.' }, sources: CK,
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
};
