import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Eric Rosen repertoire (student BLACK throughout):
// Sicilian (French/Rossolimo/Alapin-Barmen/Taimanov-via-Nc3), Queen's Gambit
// Declined (main + Catalan pawn-grab + Modern/Cambridge Springs), Modern
// Scandinavian, and French (Advance/Tarrasch/Exchange). House voice,
// board-safe, line-grounded. Every entry answers the opponent's frequent
// deviation with the Black-side plan.

const SIC = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const QGD = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const SCA = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const FR = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];

export const SUBLINE_NARRATION_PRO_ROSEN_X2: Record<string, SublineNarration> = {
  // ===== Sicilian (student BLACK) — French Variation move order (…e6) =====
  'pro-ericrosen-sicilian::0::Nc3@4': {
    intro: { say: "Nc3 — White develops toward an open Sicilian. Reply …a6 and …Qc7, take the centre with …cxd4, and develop …Nf6; you reach a flexible Kan-style setup where …b5 and …Bb7 gain queenside space and pressure e4. Comfortable, familiar Sicilian counterplay.", sayShort: 'Nc3 — …a6 and …Qc7, then …Nf6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::0::d3@4': {
    intro: { say: "d3 — a King's Indian Attack setup, quiet and flexible. Match it: …Nc6, …g6 and …Bg7, building your own fianchetto, then …Nge7 and …d5, or …d6 with …e5, staking a central claim. The extra Sicilian space on the queenside gives Black an easy, healthy game.", sayShort: 'd3 — …g6 and …Bg7, then …d5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::0::b3@4': {
    intro: { say: "b3 — the Westerinen, White aiming the bishop down the long diagonal at e5 and g7. Mirror the idea: …b6 and …Bb7 contesting the diagonal, then …Nc6 and …Nf6 with …d5 to challenge the centre; the double-fianchetto fight is balanced and Black is never worse.", sayShort: 'b3 — …b6 and …Bb7, contest diagonal.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::0::g3@4': {
    intro: { say: "g3 — White fianchettoes and eyes the light squares. Develop naturally with …Nc6 and …Nf6, then strike …d5 in the centre before the g2-bishop settles; you claim a fair share of the centre with quick development. Active, level play.", sayShort: 'g3 — …Nc6 and …Nf6, then …d5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::0::Bd3@12': {
    intro: { say: "Bd3 — the English-Attack Taimanov, the bishop aimed at your kingside. Develop …Nf6, then expand with …b5, …Bb7 and …Ne5, hitting the d3-bishop and grabbing queenside space; the Taimanov's fast counterplay meets White's build head-on. Sharp and fully balanced.", sayShort: 'Bd3 — …Nf6, then …b5 and …Ne5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::0::Qf3@12': {
    intro: { say: "Qf3 — White readies queenside castling in the Taimanov. Continue …Nf6, then …b5 and …Bb7, racing with …Rb8 and …b4 on the queenside; you strike first where the kings will differ, and the Taimanov's structure gives Black a dangerous attack. Double-edged and comfortable.", sayShort: 'Qf3 — …Nf6, then …b5 and …Bb7.' }, sources: SIC,
  },

  // ===== Sicilian (student BLACK) — Rossolimo (…Nc6 Bb5 d6) =====
  'pro-ericrosen-sicilian::1::c3@8': {
    intro: { say: "c3 — White props a future d4 in the Rossolimo. Develop …Nf6 hitting e4, and once your bishop is challenged play …a6 questioning it, then …g6 and …Bg7; you neutralise the pin and reach a sound, comfortable game where the bishop pair often comes your way.", sayShort: 'c3 — …Nf6, then …a6 and …g6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::Bxc6+@6': {
    intro: { say: "Bxc6+ — White trades to damage your pawns. Recapture …bxc6: the doubled pawns come with the bishop pair and a broad centre. Play …g6, …Bg7 and …Nf6, then …e5 building the pawn mass; the structure is famously fine for Black, whose bishops eye an open middlegame.", sayShort: 'Bxc6+ — …bxc6, then …g6 and …e5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::d4@6': {
    intro: { say: "d4 — White opens the centre early. Take with …cxd4, and after the queen recaptures play …Bd7, unpinning and preparing …Nf6 with …a6 to question the bishop; you develop with tempo against the exposed queen and equalise cleanly. Simple and reliable.", sayShort: 'd4 — …cxd4, then …Bd7 and …Nf6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::Bxc6@10': {
    intro: { say: "Bxc6 — White gives up the bishop pair to fix your structure. Recapture …Bxc6 with the bishop, keeping healthy pawns and an active light-squared bishop; follow with …Nf6, …g6 and …Bg7, then …e5 or …O-O. Black is solid and has nothing to fear.", sayShort: 'Bxc6 — …Bxc6, then …Nf6 and …g6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::c3@6': {
    intro: { say: "c3 — White prepares d4 without castling first. Hit the centre with …Nf6, attacking e4 and forcing White to defend; follow with …a6, …Bd7 and …g6, …Bg7, reaching a comfortable Rossolimo where your development flows and the bishop pin is easily neutralised.", sayShort: 'c3 — …Nf6 hits e4, then …a6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::c3@12': {
    intro: { say: "c3 — White supports d4 after the bishop tucks back to f1. With your bishop already pinning on g4, continue …Nf6, …g6 and …Bg7, then …O-O and …e5, staking the centre; the pin on f3 and your harmonious setup give Black an easy, equal middlegame.", sayShort: 'c3 — …Nf6 and …g6, then …e5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::1::d3@12': {
    intro: { say: "d3 — a quiet, small-centre Rossolimo. With …Bg4 already pinning, develop …Nf6, …g6 and …Bg7, castle, and prepare …e5 or …Ne5; the closed centre suits Black's harmonious pieces, and the pin on f3 keeps White's play modest. A pleasant manoeuvring game.", sayShort: 'd3 — …Nf6 and …g6, then …O-O.' }, sources: SIC,
  },

  // ===== Sicilian (student BLACK) — Alapin, Barmen Defence (c3 d5) =====
  'pro-ericrosen-sicilian::2::Be3@10': {
    intro: { say: "Be3 — White supports d4 in the Alapin, accepting an isolated queen's pawn. Trade …cxd4, then …Nc6 and …Be7 with …O-O, blockading d5 and pressing the isolated pawn; the classic recipe against an IQP hands Black a small, durable pull. Trade pieces and target d4.", sayShort: 'Be3 — …cxd4 and …Nc6, blockade d5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::2::Bd3@10': {
    intro: { say: "Bd3 — White develops actively toward your king in the Alapin IQP. Complete calmly with …Be7 and …O-O, then …Nc6 and …cxd4, fixing the isolated d-pawn as a target; blockade d5 with a knight and press. Sound, thematic anti-IQP play for a lasting edge.", sayShort: 'Bd3 — …Be7 and …O-O, then …Nc6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::2::Nf3@6': {
    intro: { say: "Nf3 — White develops before committing the centre. Continue …Nf6 and …e6, then …Nc6, pressuring the d4-pawn once it advances; you finish with …Be7 and …O-O, then blockade and press the isolated pawn. The Alapin gives Black an easy, structurally sound game.", sayShort: 'Nf3 — …Nf6 and …e6, then …Nc6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::2::Be3@12': {
    intro: { say: "Be3 — White bolsters d4 after routing the knight to a3. Play …cxd4 and …Be7, castle, and set the blockade on d5 with …Nb4-d5 or …Bd7-c6; the isolated d-pawn is a permanent target while your pieces find natural squares. Press the IQP with patience.", sayShort: 'Be3 — …cxd4 and …Be7, blockade d5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::2::Be2@12': {
    intro: { say: "Be2 — a modest developing move in the Alapin. Trade …cxd4, then …Be7 and …O-O, and rope the isolated d-pawn with …Nb4 or …Bd7-c6 hitting the blockade square; Black's easy development and the fixed target on d4 give the more pleasant game. Simplify and squeeze.", sayShort: 'Be2 — …cxd4 and …Be7, then …O-O.' }, sources: SIC,
  },

  // ===== Sicilian (student BLACK) — Taimanov via Nc3 (…e6 Nf3 Nc6 d4) =====
  'pro-ericrosen-sicilian::3::Be2@10': {
    intro: { say: "Be2 — a quiet Taimanov setup. Reply …a6 fixing the queenside, then …Nf6 and …b5 with …Bb7, gaining space and eyeing e4; you can also add …Bb4 pinning. The Taimanov's flexibility lets Black choose the plan and expand comfortably. Easy, active play.", sayShort: 'Be2 — …a6, then …b5 and …Bb7.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::g3@10': {
    intro: { say: "g3 — the fianchetto Taimanov, White fighting for the light squares. Answer …a6 and …Nf6, then …b5 and …Bb7, contesting the long diagonal and expanding on the queenside; you complete with …Be7 and …O-O. Black's counterplay flows naturally against the fianchetto. Balanced.", sayShort: 'g3 — …a6 and …Nf6, then …b5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::Bd3@12': {
    intro: { say: "Bd3 — the English-Attack Taimanov, the bishop pointed at your king. Develop …Nf6, then …b5, …Bb7 and …Ne5, striking the d3-bishop and seizing queenside space; your fast Sicilian counterplay races White's kingside build. Sharp, thematic, and fully sound for Black.", sayShort: 'Bd3 — …Nf6, then …b5 and …Ne5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::Qf3@12': {
    intro: { say: "Qf3 — White prepares long castling in the Taimanov. Continue …Nf6, then …b5 and …Bb7, racing with …Rb8 and …b4 on the queenside; you strike first where the kings will differ, and the Taimanov structure gives Black a dangerous initiative. Double-edged, comfortable play.", sayShort: 'Qf3 — …Nf6, then …b5 and …Rb8.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::f4@10': {
    intro: { say: "f4 — White grabs kingside space, aiming for e5. Reply …a6, and after the knights trade recapture …Qxc6, lining the queen up with a coming …Bb7 against e4; then …b5 and …Nf6 expand and target the overextended pawns. Black's queenside play arrives fast.", sayShort: 'f4 — …a6, then …Qxc6 and …b5.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::Bb5@6': {
    intro: { say: "Bb5 — White pins toward c6. Sidestep with …Nge7, defending the knight and keeping your pawns intact; follow with …a6 questioning the bishop, then …Ng6, …Be7 and …O-O with a solid, harmonious setup. Black castles into a healthy game and often gains the bishop pair.", sayShort: 'Bb5 — …Nge7, then …a6 and …Ng6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::f4@4': {
    intro: { say: "f4 — a Grand Prix thrust. Strike back in the centre at once with …d5, and after the exchange on e4 develop …Nc6 and …Bd7; you break White's attacking pawn front before it rolls, freeing your pieces. Central counterplay is the classic answer to the Grand Prix. Fully equal.", sayShort: 'f4 — …d5 strikes centre, then …Nc6.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::Be2@12': {
    intro: { say: "Be2 — a solid English-Attack Taimanov. Develop …Nf6, then …b5, …Bb7 and …Be7 with …O-O, expanding on the queenside and eyeing e4; the Taimanov's counterplay is easy to generate while White's setup stays modest. Comfortable, purposeful play for Black.", sayShort: 'Be2 — …Nf6, then …b5 and …Bb7.' }, sources: SIC,
  },
  'pro-ericrosen-sicilian::3::Nge2@4': {
    intro: { say: "Nge2 — a flexible knight development eyeing an English Attack. Take the centre with …cxd4, then …Qc7, …a6 and …Nf6, reaching the standard Taimanov; from there …b5 and …Bb7 expand while you complete with …Be7 and …O-O. Black's counterplay is thematic and sound.", sayShort: 'Nge2 — …cxd4 and …Qc7, then …Nf6.' }, sources: SIC,
  },

  // ===== Queen's Gambit Declined (student BLACK) — main + Catalan grab =====
  'pro-ericrosen-qgd::0::e3@6': {
    intro: { say: "e3 — a quiet, solid Queen's Gambit Declined. Complete development with …Be7 and …O-O, then choose your freeing break: …c5 hitting d4, or …b6 and …Bb7 fianchettoing the light bishop; White's modest setup gives Black an easy, equal game. Develop and pick your break.", sayShort: 'e3 — …Be7 and …O-O, then …c5.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::Bg5@6': {
    intro: { say: "Bg5 — the classical pin against your f6-knight. Break it calmly with …Be7 and …O-O, then …h6 questioning the bishop and …Nbd7 with …c6; you head for the reliable Orthodox setup where …dxc4 and …Ne4 free your game. A rock-solid, time-tested defence.", sayShort: 'Bg5 — …Be7 and …O-O, then …h6.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::Bxb4@12': {
    intro: { say: "Bxb4 — White trades to win back the gambit pawn, but after …cxb4 you keep the extra c4-pawn. Hold it with …b5, …Bb7 and …a5, developing behind the queenside pawns; White presses for compensation, but Black's structure is sound and the material is real. Grip it and finish developing.", sayShort: 'Bxb4 — …cxb4, then …b5 and …Bb7.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::Nbd2@10': {
    intro: { say: "Nbd2 — White blocks the check to regain the pawn later. Bank the extra pawn: play …b5 and …a5, propping c4, then …Bb7 and …O-O; your queenside pawns and the light-squared bishop hold the material while you complete development. A pleasant Catalan pawn-grab for Black.", sayShort: 'Nbd2 — …b5 and …a5, keep c4.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::Nc3@10': {
    intro: { say: "Nc3 — White interposes the knight, eyeing the c4-pawn. Castle …O-O, then defend the extra pawn with …b5 and …Bb7, or strike …c5 hitting d4; you can also trade …Bxc3+ to fix White's structure. However you play it, Black keeps a sound Catalan with the material edge in hand.", sayShort: 'Nc3 — …O-O, then …b5 or …c5.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::dxc5@12': {
    intro: { say: "dxc5 — White grabs space and tries to muddy the pawn count. Untangle with …Bxd2+ and then …Qa5, regaining the c5-pawn along the fifth rank while pieces come off; you emerge with a level, simplified position and no weaknesses. Trade the pieces and collect the pawn back. Comfortable equality.", sayShort: 'dxc5 — …Bxd2+, then …Qa5 regains it.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::Qc1@12': {
    intro: { say: "Qc1 — White sidesteps the trade to keep pieces on. Strike …cxd4, opening the centre, then …Bxd2+ and …O-O, developing smoothly while you hang onto the extra c4-pawn with …b5 and …Bb7; your lead in the pawn count and easy development make this a fine Catalan for Black.", sayShort: 'Qc1 — …cxd4, then …Bxd2+ and …O-O.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::0::a3@12': {
    intro: { say: "a3 — White questions the bishop before regaining the pawn. Answer …Bxd2+, then …cxd4, opening the centre while you keep the extra c4-pawn defended by …b5 and …Bb7; you finish with …O-O and a healthy, material-up Catalan. Trade the bishop, grip the pawn, and develop.", sayShort: 'a3 — …Bxd2+, then …cxd4 and …b5.' }, sources: QGD,
  },

  // ===== QGD (student BLACK) — Modern / Cambridge Springs (Nc3 Bg5 c6) =====
  'pro-ericrosen-qgd::1::Bxf6@12': {
    intro: { say: "Bxf6 — White releases the pin in the Cambridge Springs. Recapture …Nxf6, and with your queen already eyeing the a5-e1 line, play …Bb4 pinning the c3-knight and …dxc4, exploiting the pressure on the c-file and White's slightly loose queenside; the Cambridge Springs gives Black active, concrete counterplay.", sayShort: 'Bxf6 — …Nxf6, then …Bb4 and …dxc4.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::1::Nf3@8': {
    intro: { say: "Nf3 — White develops toward the sharp main lines. Play …h6 questioning the bishop, then …dxc4 and after e4, the thematic …g5, striking the pinning bishop and clamping while you hold the c4-pawn with …b5; the position is wild, but Black's extra pawn and queenside space give real chances. Concrete, forcing play.", sayShort: 'Nf3 — …h6 and …dxc4, then …g5.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::1::cxd5@8': {
    intro: { say: "cxd5 — the Exchange, fixing a Carlsbad structure. Recapture …exd5, then develop …Be7 and …O-O with …Bf5 getting the light bishop outside the chain; meet White's minority attack with piece play and the …Ne4 break. The Carlsbad is well-charted and comfortable for a prepared Black.", sayShort: 'cxd5 — …exd5, then …Be7 and …Bf5.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::1::a3@10': {
    intro: { say: "a3 — White spends a tempo to rule out …Bb4. Use the time: play …dxc4 and …b5, grabbing queenside space, or complete solidly with …Be7 and …O-O then the …c5 or …dxc4 break; White's slow move lets Black equalise comfortably and choose the freeing plan. No hurry, easy development.", sayShort: 'a3 — …dxc4 and …b5, or …Be7.' }, sources: QGD,
  },
  'pro-ericrosen-qgd::1::Qc2@10': {
    intro: { say: "Qc2 — White supports the centre and eyes the c-file. Free your game with …dxc4 and …b5, then …Bb7 and …a6, holding the pawn with queenside space, or play …Be7 and …O-O toward the …c5 break; the solid Semi-Slav structure gives Black an easy, reliable game. Pick your break and develop.", sayShort: 'Qc2 — …dxc4 and …b5, then …Bb7.' }, sources: QGD,
  },

  // ===== Modern Scandinavian (student BLACK) — Nc3 line (…Nf6, …Nxd5) =====
  'pro-ericrosen-scandinavian::0::h3@12': {
    intro: { say: "h3 — White prevents …Bg4 in the Modern Scandinavian. No matter: castle …O-O, develop …Nc6, and gain queenside space with …a5 and …a4, harassing the b3-bishop; then …e5 or …Bf5 claims the centre. Black's fianchetto setup is harmonious and White's edge is minimal. Play on both wings.", sayShort: 'h3 — …O-O and …Nc6, then …a5.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::h4@12': {
    intro: { say: "h4 — White lunges for a kingside pawn storm before castling. Blunt it with …h5, fixing the pawns and denying h4-h5; then develop …Nc6, …Bf5 and …Qd7, keeping your king flexible. White's committal push becomes a target, and Black's harmonious pieces give a fine game. Fix the pawns first.", sayShort: 'h4 — …h5 fixes, then …Nc6 and …Bf5.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::Bxf7+@10': {
    intro: { say: "Bxf7+ — an unsound sacrifice hoping for a king hunt. Take it: …Kxf7, and after the knight check simply …Kg8, tucking the king back to safety; White has no real follow-up and you are up a clean piece. Consolidate with …e6, …Qe7 and …Bg7, then convert the material. Accept and defend calmly.", sayShort: 'Bxf7+ — …Kxf7 then …Kg8, up piece.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::Nxd5@6': {
    intro: { say: "Nxd5 — White trades to bring your queen out early. Recapture …Qxd5, then …Nc6 hitting d4 and the …e5 break, opening the centre for your pieces; after the exchanges your queen and minor pieces are active and Black is comfortably equal. Develop with tempo and strike …e5.", sayShort: 'Nxd5 — …Qxd5 and …Nc6, then …e5.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::d4@6': {
    intro: { say: "d4 — White builds a broad centre. Trade …Nxc3, doubling White's pawns, then fianchetto with …g6 and …Bg7, castle, and pressure the centre with …c5 and …Nc6; the doubled c-pawns are a long-term target while your bishop rakes the long diagonal at d4. A comfortable, strategic game for Black.", sayShort: 'd4 — …Nxc3, then …g6 and …Bg7.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::g3@6': {
    intro: { say: "g3 — White fianchettoes quietly. Trade …Nxc3 and centralise …Qd5, and after queens come off develop …Nc6 with …Bf5 and …e5, targeting White's doubled c-pawns in the endgame; the simplified position leaves Black with the healthier structure and easy piece play. Aim at the weak c-pawns.", sayShort: 'g3 — …Nxc3 and …Qd5, target c-pawns.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::0::d4@8': {
    intro: { say: "d4 — White claims the centre after your fianchetto. Trade …Nxc3, saddling White with doubled c-pawns, then …Bg7 and …O-O, and hit the centre with …c5 and …Nc6; your bishop on the long diagonal and the target on c3 give Black a pleasant, strategically rich game. Fianchetto, castle, and press d4.", sayShort: 'd4 — …Nxc3, then …Bg7 and …c5.' }, sources: SCA,
  },

  // ===== Modern Scandinavian (student BLACK) — Nf3 line (…Bg4 pin) =====
  'pro-ericrosen-scandinavian::1::c4@8': {
    intro: { say: "c4 — White grabs space and kicks the knight. Retreat …Nb6 and after c5, …N6d7, then undermine the advanced chain with …e6 and …c6 or …b6, hitting c5; trade …Bxf3 to damage White's kingside if useful. The overextended pawns become targets for Black's pieces. Undermine and pick them off.", sayShort: 'c4 — …Nb6, then …c6 undermines c5.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::1::h3@10': {
    intro: { say: "h3 — White questions your g4-bishop. Retreat …Bh5 keeping the pin, or trade …Bxf3, damaging White's structure; then complete with …Be7, …O-O and …Nc6, striking …c5 at d4. Black's pieces develop naturally and the position is fully equal. Decide on the bishop, then finish developing.", sayShort: 'h3 — …Bh5 or …Bxf3, then …c5.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::1::c4@6': {
    intro: { say: "c4 — White stakes a big centre and kicks the knight to b6. Fianchetto with …g6 and …Bg7, castle, and pressure the centre with …Nc6, …Bg4 and the …e5 or …c5 break; White's broad pawns can become overextended targets. Black's Grünfeld-like setup gives active, sound counterplay against the centre.", sayShort: 'c4 — …Nb6 and …g6, then …Bg7.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::1::Ne5@10': {
    intro: { say: "Ne5 — White plants the knight on e5, hitting your bishop. Trade …Bxe2 and then …Nd7, challenging the centralised knight and offering to swap it off; follow with …Be7 and …O-O. Once White's active knight is exchanged, Black's solid structure and easy development equalise cleanly. Trade the bishop, then evict the knight.", sayShort: 'Ne5 — …Bxe2, then …Nd7 evicts knight.' }, sources: SCA,
  },
  'pro-ericrosen-scandinavian::1::c4@10': {
    intro: { say: "c4 — White expands in the centre. Retreat the knight …Nb6, then trade …Bxf3 to weaken White's grip, and develop …Be7 with …O-O; strike back with …c5, hitting d4 before the space tells. Black's timely central break keeps the position balanced. Nudge the knight back and counter with …c5.", sayShort: 'c4 — …Nb6 and …Bxf3, then …c5.' }, sources: SCA,
  },

  // ===== French (student BLACK) — Advance Main Line (…c4 locked queenside) =====
  'pro-ericrosen-french::0::g3@12': {
    intro: { say: "g3 — White fianchettoes to shore up the light squares in the Advance. With the queenside locked by …c4, play …Bd7 and prepare the …b5-b4 pawn storm, while …Na5 heads for b3; you can also strike the chain with …f6. Black attacks on the queenside where the space is; the plan runs itself.", sayShort: 'g3 — …Bd7, then …b5-b4 and …Na5.' }, sources: FR,
  },
  'pro-ericrosen-french::0::Be2@12': {
    intro: { say: "Be2 — a modest developing move in the locked Advance. Continue …Bd7 and roll the queenside with …b5, …a5 and …b4, prising open lines against White's base, while …Na5 eyes the b3-outpost; the …f6 break adds a second front. Black owns the queenside space and the initiative. Storm the wing.", sayShort: 'Be2 — …Bd7, then …b5 and …b4.' }, sources: FR,
  },

  // ===== French (student BLACK) — Tarrasch, Closed Variation =====
  'pro-ericrosen-french::1::Ngf3@12': {
    intro: { say: "Ngf3 — White completes the Closed Tarrasch, bolstering d4. Pile on the base of the chain: …Qb6 and …cxd4, then …f6 striking e5, with …Be7 and …O-O to follow; your pressure on d4 and the …f6 break give the thematic French counterplay. Attack the chain at both ends.", sayShort: 'Ngf3 — …Qb6 and …cxd4, then …f6.' }, sources: FR,
  },
  'pro-ericrosen-french::1::Bd3@6': {
    intro: { say: "Bd3 — White develops the bishop before locking with e5. Break at once with …c5, then after e5 retreat …Nfd7 and hit the centre with …Nc6, …Qb6 and …cxd4; the …f6 break follows, cracking White's chain. Black's counterplay against d4 and e5 is fast and sound. Strike the base early.", sayShort: 'Bd3 — …c5 and …Nc6, then …Qb6.' }, sources: FR,
  },

  // ===== French (student BLACK) — Exchange / Monte Carlo =====
  'pro-ericrosen-french::2::c4@6': {
    intro: { say: "c4 — the Monte Carlo Exchange, White accepting an isolated queen's pawn. Develop …Nf6, …Be7 and …O-O, then blockade d5 with a knight via …Nbd7-b6 and press the isolated pawn; classic anti-IQP technique gives Black the more pleasant middlegame. Blockade first, then win the pawn.", sayShort: 'c4 — …Nf6 and …Be7, blockade d5.' }, sources: FR,
  },
  'pro-ericrosen-french::2::c4@8': {
    intro: { say: "c4 — White opens into an isolated-pawn position. Keep the pin with …Bb4+ and after Nc3 castle …O-O, then …Re8 and …Bg4, piling on the pinned knight and the isolated d-pawn; blockade d5 and press. The IQP is a long-term target and Black's pieces are the more active. Pin, blockade, and squeeze.", sayShort: 'c4 — …Bb4+ and …O-O, then …Re8.' }, sources: FR,
  },
  'pro-ericrosen-french::2::Bg5@8': {
    intro: { say: "Bg5 — White pins in the symmetrical Exchange. Break it with …Be7 and …O-O, then …Re8, …c6 and …Bg4 or …Bf5, developing the light bishop actively outside the chain; the symmetry favours whoever plays for the small imbalance first, and that is Black. Do not settle for the draw — outplay actively.", sayShort: 'Bg5 — …Be7 and …O-O, then …Re8.' }, sources: FR,
  },
  'pro-ericrosen-french::2::h3@8': {
    intro: { say: "h3 — a quiet luft in the Exchange. Mirror the setup: …Bd6 and …O-O, then contest the e-file with …Re8 and find the better square for each piece with …c6 and …Bf5 or …Ne4; the symmetric structure breaks in favour of the more active side. Play for the imbalance, not the handshake.", sayShort: 'h3 — …Bd6 and …O-O, then …Re8.' }, sources: FR,
  },
};
