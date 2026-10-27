import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — Carlsen repertoire batch A: Open Sicilian (student
// WHITE) + Closed Sicilian (student WHITE). House voice, board-safe,
// line-grounded. Every entry answers the opponent's frequent deviation with the
// student-side plan.

const OPEN = ['concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];
const CLOSED = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence'];

export const SUBLINE_NARRATION_PRO_CARLSEN_SIC_A: Record<string, SublineNarration> = {
  // ===== Open Sicilian (student WHITE) — Rossolimo (Bb5 vs Nc6) =====
  'pro-carlsen-open-sicilian::0::d6@5': {
    intro: { say: "d6 — Black supports the centre in the Rossolimo. Castle, then choose your weapon: Bxc6 bxc6 saddles Black with doubled pawns while you clamp with d3, Nbd2 and the e4-f4 space, or keep the bishop with Re1 and c3 heading for d4. Either way the healthier structure and lead in development give a pleasant, low-risk edge.", sayShort: 'd6 — O-O, then Bxc6 or c3.' }, sources: OPEN,
  },

  // ===== Open Sicilian (student WHITE) — Open lines (Nf3 e6 d4) =====
  'pro-carlsen-open-sicilian::1::a6@7': {
    intro: { say: "a6 — the Kan, Black keeping things flexible and eyeing …b5. Develop Bd3, aiming at the kingside, then Nb3 nudging any …Bc5 and Qg4 provoking the weakening …g6; you build a clamp on the queenside or a kingside attack while Black's setup stays passive. White dictates the play.", sayShort: 'a6 — Bd3 and Nb3, then Qg4.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::1::Nf6@7': {
    intro: { say: "Nf6 — Black heads for a Scheveningen small centre. Develop Nc3, then unleash the Keres Attack: g4, gaining space and chasing the f6-knight, followed by h4 and g5 storming the kingside before Black castles. Sharp and direct — exactly what the Open Sicilian promises White.", sayShort: 'Nf6 — Nc3, then the g4 Keres.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::1::a6@9': {
    intro: { say: "a6 — a Taimanov move order, restraining Nb5 ideas. Develop soundly: Be2 and O-O, then f4 or Be3 and the queenside restraint a4; you keep a healthy space edge and can steer toward a Maróczy-style bind. Solid, flexible, and pleasant for White.", sayShort: 'a6 — Be2 and O-O, then f4.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::1::d6@9': {
    intro: { say: "d6 — Black builds the classical small centre. Play Be3 and head for the English Attack: Qd2, f3 and O-O-O, then storm with g4 and h4; opposite-side castling hands White the faster attack against Black's compact but passive structure. Castle long, then charge.", sayShort: 'd6 — Be3, then Qd2 and O-O-O.' }, sources: OPEN,
  },

  // ===== Open Sicilian (student WHITE) — Moscow (d6 Bb5+) =====
  'pro-carlsen-open-sicilian::2::Bd7@5': {
    intro: { say: "Bd7 — the Moscow main line. Trade Bxd7+ Qxd7, then castle and set up the small centre with c3 and d4, or Re1 and c3; you emerge with a tiny but risk-free space edge and Black's queen a touch misplaced on d7. A calm, strategic Anti-Sicilian to squeeze.", sayShort: 'Bd7 — Bxd7+, O-O, then c3 and d4.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::2::Nc6@5': {
    intro: { say: "Nc6 — Black blocks the check with the knight, transposing toward Rossolimo waters. Castle, then choose Bxc6 doubling Black's pawns and clamping with d3 and f4, or Re1 and c3 heading for d4. White keeps an easy, pleasant game with the healthier structure.", sayShort: 'Nc6 — O-O, then Bxc6 or c3.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::2::a6@7': {
    intro: { say: "a6 — Black nudges the bishop before completing development. Simply retreat Be2, having already fixed the queenside with a4; follow with O-O, Re1 and c3-d4. The a4-pawn stops …b5 cold and White builds the ideal centre unhurried.", sayShort: 'a6 — Be2, then O-O and d4.' }, sources: OPEN,
  },

  // ===== Open Sicilian (student WHITE) — Bc4 lines (Modern vs d6) =====
  'pro-carlsen-open-sicilian::3::Nc6@5': {
    intro: { say: "Nc6 — Black develops in the Bc4 Anti-Sicilian. Castle, then play d3, c3 and Bb3, tucking the bishop and preparing the d4 break or a Nbd2-f1-g3 reroute; the Italian-flavoured setup gives White easy development and a small, safe space edge aimed at f7.", sayShort: 'Nc6 — O-O, then d3 and Bb3.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::3::e6@7': {
    intro: { say: "e6 — Black prepares …d5 and shelters against the c4-bishop. Retreat Bb3 preserving the strong diagonal, then O-O, c3 and Nbd2, angling for the d4 break; White's harmonious build and the bishop's eye on f7 keep a pleasant, risk-free pull.", sayShort: 'e6 — Bb3, then O-O and c3.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::3::e6@5': {
    intro: { say: "e6 — Black blunts the c4-bishop and readies …d5. Castle, then Bb3 saving the bishop, followed by c3 and d3 with a2-a4 to slow …b5; you keep a flexible Italian-style position where the d4 break and kingside space give White the better long-term chances.", sayShort: 'e6 — O-O and Bb3, then c3.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::3::g6@7': {
    intro: { say: "g6 — Black heads for a kingside fianchetto early. Castle, then Bb3 tucking the bishop safe, followed by c3, Re1 and the d4 break; the calm build gives White more space and keeps the light bishop trained on Black's soon-to-be-castled king. Comfortable and thematic.", sayShort: 'g6 — O-O and Bb3, then d4.' }, sources: OPEN,
  },

  // ===== Open Sicilian (student WHITE) — Accelerated Dragon (g6) =====
  'pro-carlsen-open-sicilian::4::Bg7@5': {
    intro: { say: "Bg7 — Black fianchettoes before recapturing. Grab the pawn: dxc5, and after …Qa5+ c3 Qxc5 develop Na3 with tempo, heading for Nc4 or Nb5; you keep the extra structure and gain time chasing the Black queen. A concrete way to punish the move order.", sayShort: 'Bg7 — dxc5, then c3 and Na3.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::4::Nc6@7': {
    intro: { say: "Nc6 — Black develops in the Accelerated Dragon. Clamp with c4, the Maróczy Bind: pawns on c4 and e4 strangle the …d5 break and deny Black their thematic counterplay. Follow with Nc3, Be2 and O-O, then squeeze on space; the bind is a lasting strategic edge.", sayShort: 'Nc6 — c4 Maróczy, then Nc3 and Be2.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::4::Nf6@7': {
    intro: { say: "Nf6 — Black transposes toward a Dragon proper. Develop Nc3, then Be3, f3, Qd2 and O-O-O — the Yugoslav Attack: castle long and storm with h4-h5 and g4 while Black fianchettoes. Opposite wings, and White's attack down the h-file is the faster of the two.", sayShort: 'Nf6 — Nc3 and Be3, then Yugoslav.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::4::Nf6@9': {
    intro: { say: "Nf6 — Black develops into the Maróczy Bind you set with c4. Play Nc3, then Be2, O-O and Be3, completing the bind; hold the clamp on d5, meet …Ng4 with a timely trade, and expand slowly with f3 and Rc1. Black is solid but passive, and the space is all yours.", sayShort: 'Nf6 — Nc3 and Be2, hold the bind.' }, sources: OPEN,
  },
  'pro-carlsen-open-sicilian::4::Qb6@9': {
    intro: { say: "Qb6 — Black pokes the d4-knight and eyes b2. Retreat Nb3, sidestepping the trade and keeping the Maróczy Bind intact; the queen on b6 soon proves misplaced as you play Nc3, Be2 and O-O, then a4-a5 gaining tempo against her. White keeps the clamp and the initiative.", sayShort: 'Qb6 — Nb3 keeps bind, then a4.' }, sources: OPEN,
  },

  // ===== Closed Sicilian (student WHITE) — Fianchetto vs …e6 (Korchnoi) =====
  'pro-carlsen-closed-sicilian::1::d4@9': {
    intro: { say: "d4 — Black gains space and kicks the c3-knight. Retreat Nb1, intending Nd2-f3 to reroute and undermine the advanced d4-pawn; the pawn is overextended, and after d3, O-O and c3 you strike at its base while the g2-bishop rakes the long diagonal. Play against the pawn.", sayShort: 'd4 — Nb1, then c3 hits d4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::1::Nc6@5': {
    intro: { say: "Nc6 — Black develops in the true Closed Sicilian. Complete your setup: Bg2, then d3, and the classic plan is Be3, Qd2, f4 and f5 with a kingside pawn storm, or Nge2 and O-O first. The fianchetto Closed Sicilian is a slow build toward an f-pawn avalanche at Black's king.", sayShort: 'Nc6 — Bg2 and d3, then f4-f5.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::1::dxe4@9': {
    intro: { say: "dxe4 — Black releases the central tension. Recapture Nxe4, and after …Nxe4 Bxe4 your bishop lands actively in the centre eyeing b7 and the long diagonal; follow with O-O, d3 and c3, keeping a small, comfortable pull with the more active pieces. Simplify into a pleasant structure.", sayShort: 'dxe4 — Nxe4, bishop dominates diagonal.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::1::d4@7': {
    intro: { say: "d4 — Black lunges the pawn early, hitting the c3-knight before it is defended. Retreat Nce2, and if …d3 push through with cxd3 Qxd3, then Nf4 hitting the queen with tempo; the overextended pawn is liquidated and White emerges with the freer game. Punish the premature push.", sayShort: 'd4 — Nce2, then cxd3 and Nf4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::1::a6@5': {
    intro: { say: "a6 — Black readies a quick …b5 queenside expansion. Continue your setup unbothered: Bg2 and d3, then f4 and Nf3, meeting the flank push with central solidity and your own kingside storm; …b5 gains space but leaves Black's centre and king underdeveloped. Build, then strike with f4-f5.", sayShort: 'a6 — Bg2 and d3, then f4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::1::dxe4@7': {
    intro: { say: "dxe4 — Black clears the centre early. Recapture Nxe4, centralising the knight, then probe with Qg4 provoking …g6 before retreating Qe2; you develop with tempo and keep the freer position, the g2-bishop and centralised knight aiming at Black's slightly loosened kingside. Active and comfortable.", sayShort: 'dxe4 — Nxe4, then Qg4 pokes g6.' }, sources: CLOSED,
  },

  // ===== Closed Sicilian (student WHITE) — Traditional with Bb5 vs Nc6 =====
  'pro-carlsen-closed-sicilian::2::g6@5': {
    intro: { say: "g6 — Black fianchettoes against your Bb5. Take Bxc6 dxc6, doubling Black's pawns and denying the …d5 break, then set up d3, Be3, Qd2 and O-O-O with a kingside pawn storm; the damaged structure and White's attacking chances make this an easy, thematic plan. Trade, then attack.", sayShort: 'g6 — Bxc6 dxc6, then Be3 and Qd2.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::e6@7': {
    intro: { say: "e6 — Black bolsters the knight planted on d4. Castle, then untangle with Nxd4 cxd4 and Ne2, hitting the d4-pawn and rerouting your knight toward f4 or g3; White's smooth development and Black's loose d4-pawn give the pleasant side of a Closed Sicilian. Resolve the centre, then press.", sayShort: 'e6 — O-O, Nxd4, then Ne2.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::Nxb5@7': {
    intro: { say: "Nxb5 — Black trades on b5. Recapture Nxb5, and the knight eyes c7 and d6 ideas while you seize the centre: d4 opening lines, and after …cxd4 Nxd4 you own a big, healthy centre and easy development against Black's passive position. Take back, then grab the centre with d4.", sayShort: 'Nxb5 — Nxb5, then d4 for centre.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::g6@9': {
    intro: { say: "g6 — Black fianchettoes after …a6 forced the bishop to d3. Castle, then play Nxd4 or c3 to challenge the centralised knight, followed by Re1 and the central push; the bishop on d3 eyes the kingside, and once the d4-knight is dislodged White's space and a coming f4 or e5 give the initiative.", sayShort: 'g6 — O-O, challenge d4, then f4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::e6@5': {
    intro: { say: "e6 — Black prepares …d5. Damage the structure first: Bxc6 bxc6, doubling the c-pawns, then d3 and f4 with Nf3, clamping and preparing a kingside build; Black's …d5 gains space but their queenside pawns are permanent weaknesses. Trade, fix the pawns, then play on both wings.", sayShort: 'e6 — Bxc6 bxc6, then d3 and f4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::g6@7': {
    intro: { say: "g6 — Black fianchettoes with the knight still on d4. Reposition the bishop actively to c4, eyeing f7, then O-O and c3 or Nxd4, challenging the intruder; the bishop on c4 combines with pressure on the centre while Black's kingside commits. Reroute, then contest d4.", sayShort: 'g6 — Bc4 eyes f7, then challenge d4.' }, sources: CLOSED,
  },
  'pro-carlsen-closed-sicilian::2::Nc6@9': {
    intro: { say: "Nc6 — Black retreats the knight, having spent time to nudge your bishop to d3. Castle and use the tempo: Re1, c3 and d4, building the ideal centre while the d3-bishop aims at the kingside; Black's knight round-trip has cost them development. Punish the wasted time with a quick break.", sayShort: 'Nc6 — O-O, then c3 and d4.' }, sources: CLOSED,
  },
};
