import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — GothamChess (student WHITE): London, Trompowsky,
// Rossolimo anti-Sicilian, KIA. Grounded in his own teaching (transcripts
// reference-only, prose original, house voice). London/Jobava: trade the dark
// bishops (Bh6xg7) and storm; Trompowsky: grab the big centre; Rossolimo: Bxc6
// structure + squeeze; KIA: system on rails, e4 break, f4-f5 kingside storm.

const L = ['concept:pos-king-safety', 'https://www.chess.com/openings/London-System'];
const T = ['concept:pos-center', 'https://www.chess.com/openings/Trompowsky-Attack'];
const R = ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
const KIA = ['concept:pos-center', 'https://www.chess.com/openings/Kings-Indian-Attack'];

export const SUBLINE_NARRATION_PRO_GOTHAM_W1: Record<string, SublineNarration> = {
  // ===== London (Bh6 anti-KID + Jobava hybrid) =====
  'pro-gothamchess-london::1::d5@9': {
    intro: { say: "d5 — Black grabs the centre in the anti-King's-Indian. Follow the plan: Bxg7 removes the fianchetto bishop, then Qd2 and O-O-O and hurl the h-pawn up the board. Strip the king of its defender and attack — the Jobava-London's teeth.", sayShort: 'd5 — Bxg7, castle long, storm.' }, sources: L,
  },
  'pro-gothamchess-london::1::c5@9': {
    intro: { say: "c5 — Black strikes the centre instead of defending g7. Take with Bxg7, and after …Kxg7 you have the attacking chances: Qd2, O-O-O and h4-h5, targeting the exposed king. The dark-square trade is worth a tempo of central play.", sayShort: 'c5 — Bxg7, then Qd2 and h4.' }, sources: L,
  },
  'pro-gothamchess-london::1::d5@5': {
    intro: { say: "d5 — Black sets up a Grünfeld-ish structure early. Develop e3, then choose the Bh6 attacking plan or a solid build with Nf3 and Bd3; your Jobava setup with Nc3 and Bf4 gives active, aggressive piece play.", sayShort: 'd5 — e3, then the Bh6 plan.' }, sources: L,
  },
  'pro-gothamchess-london::1::Ng4@11': {
    intro: { say: "Ng4 — Black hits your queen after the bishop trade. Retreat Qd2, keeping the initiative; the knight on g4 gets kicked by h3, losing time, while you continue O-O-O and the kingside storm. Black's king is already weak.", sayShort: 'Ng4 — retreat the queen, then h3.' }, sources: L,
  },
  'pro-gothamchess-london::1::d5@11': {
    intro: { say: "d5 — Black grabs the centre after the dark bishops came off. You have exactly what you want: the king stripped of its defender. Castle long, push h4-h5, and pour pieces toward h7. The attack plays itself.", sayShort: 'd5 — castle long, then h4-h5.' }, sources: L,
  },
  'pro-gothamchess-london::1::d6@11': {
    intro: { say: "d6 — a modest setup after the bishop trade. Your attack is free: O-O-O and h4-h5-h6, opening lines at the weakened king. With the dark-squared defender gone, the assault is decisive.", sayShort: 'd6 — O-O-O and h4-h5, attack.' }, sources: L,
  },
  'pro-gothamchess-london::1::Nc6@11': {
    intro: { say: "Nc6 — Black develops after the trade. Continue the plan: O-O-O and the h-pawn storm; the missing g7-bishop means Black cannot hold the dark squares around the king. Attack.", sayShort: 'Nc6 — castle long, storm the king.' }, sources: L,
  },
  'pro-gothamchess-london::2::a6@5': {
    intro: { say: "a6 — a slow move in the Jobava. Grab space with g4, the aggressive Jobava idea, or develop e3 and Bd3; your knight on c3 and bishop on f4 give fast, active play against the slightly passive setup.", sayShort: 'a6 — g4 or e3, active play.' }, sources: L,
  },
  'pro-gothamchess-london::2::Bb4@7': {
    intro: { say: "Bb4 — Black pins in the e6 setup. Develop naturally with Nge2 or Bd3, and if Black trades on c3 you keep the bishop pair and the strong f4-bishop. The Jobava's piece activity endures.", sayShort: 'Bb4 — develop, keep the bishop pair.' }, sources: L,
  },
  'pro-gothamchess-london::2::Bd6@7': {
    intro: { say: "Bd6 — Black offers to trade your f4-bishop. Keep it with Bg3, retaining the aggressive setup; develop Nf3 and Bd3, and the Jobava piece play gives a comfortable, active game.", sayShort: 'Bd6 — Bg3 keeps the bishop, develop.' }, sources: L,
  },
  'pro-gothamchess-london::2::g6@5': {
    intro: { say: "g6 — Black fianchettos. Develop e3, Nf3 and Bd3, and eye the Bh6 or h4-h5 ideas against the fianchetto; the Jobava's active pieces give aggressive chances.", sayShort: 'g6 — develop, eye Bh6 and h4.' }, sources: L,
  },

  // ===== Trompowsky =====
  'pro-gothamchess-trompowsky::0::c5@7': {
    intro: { say: "c5 — Black strikes the centre in the e6 Trompowsky. Grab space with e4 and e5, building a big centre and kicking the knight; your broad pawn front and the bishop on g3 give a strong, aggressive game. Provoke, then push.", sayShort: 'c5 — e4 and e5, seize the centre.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::0::c5@5': {
    intro: { say: "c5 — Black hits the centre early. Answer e4 and e5, building the big centre and grabbing space; keep the bishop on its diagonal via g3 and press. The Trompowsky becomes a space-grabbing attack.", sayShort: 'c5 — e4 and e5, grab space.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::0::Be7@5': {
    intro: { say: "Be7 — a solid, restrained setup. Continue e4 or e3, developing Ngf3 and Bd3; you keep the bishop pair option and a comfortable game with easy development. Low-theory and pleasant.", sayShort: 'Be7 — develop, keep it comfortable.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::0::c5@9': {
    intro: { say: "c5 — Black strikes after …d5 and …h6. Support with c3 and e3, keeping the solid Trompowsky structure; develop Bd3 and Ngf3, and you have a pleasant, low-risk game with the bishop pair.", sayShort: 'c5 — c3 and e3, stay solid.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::1::Nxd2@9': {
    intro: { say: "Nxd2 — Black trades the knight and grabs b2. Let the pawn go: after Bxd2 and e4 you have a huge centre and a raging lead in development, while Black's queen is offside on b2. Develop with threats — the initiative dwarfs the pawn.", sayShort: 'Nxd2 — take back, e4, hunt the queen.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::1::h6@5': {
    intro: { say: "h6 — Black questions the bishop in the Vaganian. Retreat Bf4, keeping the strong bishop, then e3 and Bd3 to develop; the h4 push gained space and your active setup gives a comfortable game.", sayShort: 'h6 — Bf4, keep the bishop, develop.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::1::Nxg5@5': {
    intro: { say: "Nxg5 — Black trades the knight for your bishop, but hxg5 opens the h-file for your rook. Push g6 to shatter Black's kingside, then develop and attack down the open file. The bishop was worth giving for this initiative.", sayShort: 'Nxg5 — hxg5, then g6 and attack.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::2::e6@5': {
    intro: { say: "e6 — Black plays a solid, French-like wall in the …d5 system. Develop e3, Nd2, Ngf3 and Bd3; you keep the bishop pair option and an easy, comfortable game. No theory, just sound development.", sayShort: 'e6 — develop solidly, keep bishops.' }, sources: T,
  },
  'pro-gothamchess-trompowsky::2::c6@5': {
    intro: { say: "c6 — a Slav-like solid setup. Develop e3, Nd2 and Bd3, and consider trading on f6 to damage the structure or keeping the bishop; either way you have a comfortable, low-risk game.", sayShort: 'c6 — develop, keep it solid.' }, sources: T,
  },

  // ===== Rossolimo anti-Sicilian =====
  'pro-gothamchess-anti-sicilian::0::d6@5': {
    intro: { say: "d6 — Black plays solidly against the Rossolimo. Castle, then the squeeze: Bxc6 to double the pawns, or Re1, c3 and d4. Trading the bishop for the knight hands Black a lasting structural weakness — a pleasant positional pull.", sayShort: 'd6 — castle, then Bxc6 doubles pawns.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::0::Nf6@5': {
    intro: { say: "Nf6 — Black develops, ignoring the bishop. Castle and choose: Bxc6 doubling the pawns, or d3, c3 and Re1 for a slow build. You steer a comfortable positional game far from Open-Sicilian theory.", sayShort: 'Nf6 — castle, then Bxc6 or d3.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::0::Nd4@9': {
    intro: { say: "Nd4 — Black jumps in to trade your Rossolimo bishop. Play Nxd4 and target the structure, or step the bishop back; either way you keep the light-square control and a comfortable positional pull.", sayShort: 'Nd4 — trade, keep the light squares.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::0::Ng6@9': {
    intro: { say: "Ng6 — Black reroutes the knight toward f4 and e5. Continue Bf1, c3 and d4, building the centre; your flexible Rossolimo setup and space give a pleasant edge.", sayShort: 'Ng6 — Bf1, then c3 and d4.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::0::b6@9': {
    intro: { say: "b6 — Black fianchettos the queen-bishop. Play Bf1, c3 and d4, grabbing the centre; your harmonious setup and space give a comfortable, low-theory game against the hypermodern try.", sayShort: 'b6 — Bf1, c3 and d4.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::1::Nf6@9': {
    intro: { say: "Nf6 — Black develops and hits e4 in the fianchetto Rossolimo. With Re1 already in, play c3 and d4 to build the centre, or Bxc6 followed by e5. Your pieces are harmoniously placed for a comfortable middlegame.", sayShort: 'Nf6 — build the centre or trade c6.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::2::Qc7@9': {
    intro: { say: "Qc7 — Black develops after your Bxc6 doubled the pawns. Castle and clamp: e5 gains space, then Qe2 and the h4-h5 push squeeze Black's cramped position, while those damaged c-pawns give a permanent structural edge.", sayShort: 'Qc7 — castle, e5, then squeeze.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::2::d4@11': {
    intro: { say: "d4 — Black over-extends the pawn. Simply castle and play around it: the d4-pawn is weak and overextended, your pieces target it, and the e5-clamp holds. Black's advanced pawn is a liability, not a threat.", sayShort: 'd4 — castle, target the weak pawn.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::2::Nf5@13': {
    intro: { say: "Nf5 — Black reroutes the knight. Continue your clamp with b3, Bb2 and the kingside squeeze; the doubled c-pawns and Black's cramped position give a lasting positional bind. Patience converts.", sayShort: 'Nf5 — b3 and Bb2, keep the bind.' }, sources: R,
  },

  // ===== KIA =====
  'pro-gothamchess-kia::0::Nf6@5': {
    intro: { say: "Nf6 — Black develops in the KIA-versus-Sicilian structure. Play the system: O-O, d3, Nbd2, e4, then the kingside build with Nh4 and f4. Against the …d5/…c5 setup the e4 break and kingside attack are the standard plan.", sayShort: 'Nf6 — system it, e4 and attack.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::e5@7': {
    intro: { say: "e5 — Black claims a big centre with …d5 and …e5. Play the system: d3, Nbd2, and prepare the e4 break or c3-d4; against the broad centre you manoeuvre patiently and strike when ready. Your KIA structure handles it.", sayShort: 'e5 — d3 and Nbd2, prepare the break.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::Nf6@7': {
    intro: { say: "Nf6 — Black develops toward a classical setup. System on: d3, Nbd2, e4, then the Nh4-f5 kingside plan. Your familiar KIA structure gives an easy, one-sided attacking game.", sayShort: 'Nf6 — system it, e4 and Nh4.' }, sources: KIA,
  },
  'pro-gothamchess-kia::0::Bd6@9': {
    intro: { say: "Bd6 — Black develops the bishop actively. Continue Nbd2 and e4, challenging the centre; when e4 lands, gaining a tempo on the bishop or the …d5-pawn is a bonus. Your system flows to its e4 break.", sayShort: 'Bd6 — Nbd2 and e4, break.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::O-O@11': {
    intro: { say: "O-O — the main KIA-versus-Sicilian tabiya. Roll out the system: e4, then Re1, Nh4 and f4-f5, storming the kingside while Black plays on the queenside. This is the KIA's bread and butter — you know every plan.", sayShort: 'O-O — e4, then the f4-f5 storm.' }, sources: KIA,
  },
  'pro-gothamchess-kia::1::d5@11': {
    intro: { say: "d5 — Black grabs central space. Continue the system with e4, or hold with c3 and prepare it; the central tension favours your preparation, and the kingside attack with Nh4 and f4 remains the plan. Patience, then strike.", sayShort: 'd5 — e4, then the kingside attack.' }, sources: KIA,
  },
};
