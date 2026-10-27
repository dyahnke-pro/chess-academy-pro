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
  'pro-gothamchess-london::1::d5@5': {
    intro: { say: "d5 — Black sets up a Grünfeld-ish structure early. Develop e3, then choose the Bh6 attacking plan or a solid build with Nf3 and Bd3; your Jobava setup with Nc3 and Bf4 gives active, aggressive piece play.", sayShort: 'd5 — e3, then the Bh6 plan.' }, sources: L,
  },
  'pro-gothamchess-london::2::a6@5': {
    intro: { say: "a6 — a slow move in the Jobava. Grab space with g4, the aggressive Jobava idea, or develop e3 and Bd3; your knight on c3 and bishop on f4 give fast, active play against the slightly passive setup.", sayShort: 'a6 — g4 or e3, active play.' }, sources: L,
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
  'pro-gothamchess-anti-sicilian::2::Qc7@9': {
    intro: { say: "Qc7 — Black develops after your Bxc6 doubled the pawns. Castle and clamp: e5 gains space, then Qe2 and the h4-h5 push squeeze Black's cramped position, while those damaged c-pawns give a permanent structural edge.", sayShort: 'Qc7 — castle, e5, then squeeze.' }, sources: R,
  },
  'pro-gothamchess-anti-sicilian::2::d4@11': {
    intro: { say: "d4 — Black over-extends the pawn. Simply castle and play around it: the d4-pawn is weak and overextended, your pieces target it, and the e5-clamp holds. Black's advanced pawn is a liability, not a threat.", sayShort: 'd4 — castle, target the weak pawn.' }, sources: R,
  },

  // ===== KIA =====
  'pro-gothamchess-kia::0::Nf6@5': {
    intro: { say: "Nf6 — Black develops in the KIA-versus-Sicilian structure. Play the system: O-O, d3, Nbd2, e4, then the kingside build with Nh4 and f4. Against the …d5/…c5 setup the e4 break and kingside attack are the standard plan.", sayShort: 'Nf6 — system it, e4 and attack.' }, sources: KIA,
  },
};
