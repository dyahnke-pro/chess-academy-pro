import type { SublineNarration } from '../../services/sublineLesson';

// HAND-AUTHORED subline narration for the GothamChess (Levy) repertoire.
// Grounded in his own YouTube teaching (transcripts pulled to the gitignored
// data/sources/gothamchess-voice/transcripts/ — REFERENCE ONLY, never quoted:
// the ideas taught are public-domain opening understanding; the prose is
// ORIGINAL, in the Naroditsky house teaching voice per the 2026-07-02 doctrine).
// Keyed `${openingId}::${variationIndex}::${triggerMove}@${atPly}` to bind to the
// exact deviation in course-sublines.json. Intros carry the WHEN-to-play + the
// IDEA behind the reply (the soul of the app); un-authored sublines stay on the
// honest silent baseline. Sources cite the public-domain concept corpus + a
// reputable opening reference (YouTube is not an allowlisted source; the
// transcript is a comprehension aid, not a citation).

const CARO_SRC = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense'];
const CARO_BISHOP_SRC = ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'];

// ── GothamChess Caro-Kann (student BLACK) ──────────────────────────────────
// var0 = Classical main move-order; its "sublines" are White's alternative 3rd
// moves — exactly what a Black repertoire must meet from 1.e4 c6 2.d4 d5.
export const SUBLINE_NARRATION_PRO_GOTHAM: Record<string, SublineNarration> = {
  'pro-gothamchess-caro-kann::0::e5@4': {
    intro: {
      say: "e5 — the Advance, and the single most common try you will face: White grabs space and locks the centre. Do not sit still or the space will slowly suffocate you. The move you play at once is Bf5, escorting the light-squared bishop OUTSIDE the pawn chain before e6 would ever bury it — freeing that lone problem-bishop is the whole reason the Caro exists. Then hit back with e6 and c5, chipping at the d4-base so White's broad pawns become targets, not a wall.",
      sayShort: 'e5 — get the bishop out, then c5.',
    },
    sources: CARO_BISHOP_SRC,
  },
  'pro-gothamchess-caro-kann::0::exd5@4': {
    intro: {
      say: "exd5 — the Exchange, where White trades in the centre for a simple, near-symmetrical game. Recapture with cxd5 and just develop cleanly: knight to c6, knight to f6, the light bishop out to f5 or g4 before you ever play e6, then e6 and Bd6. It looks harmless because it is — equalise with natural development and outplay from an even position.",
      sayShort: 'exd5 — recapture and develop freely.',
    },
    sources: CARO_SRC,
  },
  'pro-gothamchess-caro-kann::0::f3@4': {
    intro: {
      say: "f3 — the Fantasy, White propping up e4 to hold a giant centre. The principled answer is to strike before it settles: take on e4, and after fxe4 hit the centre with e5. The ambitious pawns White pushed become the very weaknesses you play against, and your pieces develop with tempo against them.",
      sayShort: 'f3 — take e4, then strike e5.',
    },
    sources: CARO_SRC,
  },
  'pro-gothamchess-caro-kann::0::Nd2@4': {
    intro: {
      say: "Nd2 — steering for the Classical, the same idea as Nc3. Take on e4, and once the knight recaptures, develop the light bishop to f5, the Caro's signature good bishop on its best diagonal. Follow with e6, Nd7 and a solid, resilient wall that is famously hard to break down.",
      sayShort: 'Nd2 — take e4, then Bf5.',
    },
    sources: CARO_SRC,
  },
  // var4 = Advance with 3...Bf5; White's 6th-move tries.
  'pro-gothamchess-caro-kann::4::h4@6': {
    intro: {
      say: "h4 — the sharp Tal thrust, gaining kingside space and putting the question to your bishop. Answer h5, planting a pawn that fixes White's and keeps your f5-bishop's retreat squares intact. With the kingside frozen you calmly play e6 and c5, and White's advanced h-pawn becomes a long-term weakness as often as a weapon.",
      sayShort: 'h4 — reply h5, freeze the kingside.',
    },
    sources: CARO_BISHOP_SRC,
  },
  'pro-gothamchess-caro-kann::4::Nc3@6': {
    intro: {
      say: "Nc3 — the Van der Wiel, hitting your f5-bishop and eyeing a quick kingside expansion. Keep it simple with e6, giving the bishop a home and preparing to meet any g4 lunge with calm development; you stay solid while White commits pawns that can later be undermined.",
      sayShort: 'Nc3 — play e6, stay solid.',
    },
    sources: CARO_BISHOP_SRC,
  },
  // var6 = Exchange (3.exd5); White's follow-ups.
  'pro-gothamchess-caro-kann::6::c4@6': {
    intro: {
      say: "c4 — the Panov, turning the quiet Exchange into an isolated-queen-pawn battle. Meet it head-on with Nf6 and later e6, developing squarely against that isolated d-pawn. You blockade the d5-square, trade a pair of minor pieces, and grind the static weakness in the endgame — the classic recipe against an IQP.",
      sayShort: 'c4 — Panov; blockade and grind the IQP.',
    },
    sources: CARO_SRC,
  },
  'pro-gothamchess-caro-kann::6::Nf3@6': {
    intro: {
      say: "Nf3 — quiet Exchange development, nothing to fear. Continue with Nc6 and get the light bishop out to g4 or f5 before you shut it in with e6. Symmetrical, comfortable, and easy to play from equality.",
      sayShort: 'Nf3 — develop, bishop out before e6.',
    },
    sources: CARO_SRC,
  },
  // var7 = the Bd3 Exchange setup (the one line in the Exchange with real venom).
  'pro-gothamchess-caro-kann::7::Bd3@6': {
    intro: {
      say: "Bd3 — the one Exchange setup with a sting: the bishop trains on the b1-h7 diagonal, dreaming of Bf4, Qc2 and a battery aimed at h7. Neutralise it with the right move-order — Nc6, then Qc7 or g6 to blunt that diagonal before the battery forms. Handle those first few moves accurately and the Exchange holds no danger at all.",
      sayShort: 'Bd3 — Nc6, then blunt the diagonal.',
    },
    sources: CARO_SRC,
  },
  // var5 = Advance with 3...c5 (Botvinnik-Carls); White develops.
  'pro-gothamchess-caro-kann::5::Nf3@6': {
    intro: {
      say: "Nf3 — White develops and shores up d4 after your c5 strike. Continue Nc6, keeping the pressure on the d4-base, and let the c5-square and the target on d4 give you the easy, active game the Botvinnik-Carls promises. You have already forced White to defend rather than attack.",
      sayShort: 'Nf3 — Nc6, keep pressing d4.',
    },
    sources: CARO_SRC,
  },

  // ── GothamChess Vienna (student WHITE) — the Gambit: Nc3 then f4 in nearly
  // every line, an open, attacking game aimed at f7. ──────────────────────────
  'pro-gothamchess-vienna::0::Nc6@9': {
    intro: {
      say: "Nc6 — the Paulsen, where Black develops instead of clinging to the extra pawn. Play in the gambit's spirit: after fxe5 the f-file is half-open for your rook and the queen already eyes the kingside, so Bb5 pins the knight, you castle, and pour everything toward f7. Fast, aggressive, and easy to play — the whole appeal of the Vienna.",
      sayShort: 'Nc6 — pin, castle, attack f7.',
    },
    sources: ['concept:pos-king-safety', 'https://www.chess.com/openings/Vienna-Game'],
  },
  'pro-gothamchess-vienna::0::f5@9': {
    intro: {
      say: "f5 — the Bardeleben, propping up the advanced e4-knight with a pawn front. Do not let it settle: undermine with d3, and after the knights come off the b-file opens for your rook while the queen and the half-open f-file keep the initiative. The extra structure Black grabbed is brittle; your lead in development is the real currency.",
      sayShort: 'f5 — undermine with d3, keep initiative.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Vienna-Game'],
  },

  // ── GothamChess Scandinavian (student BLACK) ────────────────────────────────
  'pro-gothamchess-scandinavian::0::Nf3@6': {
    intro: {
      say: "Nf3 — natural development in the Qa5 main line. Reply Nf6, and then the key move: get the light bishop out to f5 before you ever play e6, the same good-bishop principle that makes this defence so comfortable. Finish with e6, c6 and Be7, the queen safely tucked on a5 — a solid, resilient structure that is hard to crack.",
      sayShort: 'Nf3 — Nf6, then bishop to f5.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },
  'pro-gothamchess-scandinavian::1::Nc3@4': {
    intro: {
      say: "Nc3 — White bolsters the extra d5-pawn rather than let you round it up. Recapture with Nxd5 and meet Bc4 with c6, building a compact, flexible shell; you regain the pawn and reach an easy Modern Scandinavian where the knight, not an exposed queen, does the work. No early queen sorties, no targets.",
      sayShort: 'Nc3 — Nxd5, then c6 and regroup.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  },

  // ── GothamChess French (student BLACK) ──────────────────────────────────────
  'pro-gothamchess-french-defense::1::Bd3@8': {
    intro: {
      say: "Bd3 — the Tarrasch, the bishop swinging toward h7. The tempting Nc6 actually walks into trouble here; the sound move is Nbd7, rerouting the knight to the kingside where it shores up f6 and, crucially, leaves the c-pawn free to advance later. Develop Nbd7, then Be7 and castle — a healthy, well-known French where Black is perfectly fine.",
      sayShort: 'Bd3 — Nbd7 is sounder than Nc6.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense-Tarrasch-Variation'],
  },
  'pro-gothamchess-french-defense::2::c4@8': {
    intro: {
      say: "c4 — White injects a pawn fight into the drab Exchange. Take on c4, and after the recapture develop with Nf6; the play now revolves around White's lonely d-pawn, which you blockade on d5 and pressure. The Exchange's dull reputation evaporates, and the initiative belongs to the more active side — you.",
      sayShort: 'c4 — take it, blockade the d-pawn.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  },

  // ── GothamChess London (student WHITE) — Jobava/aggressive plans ────────────
  'pro-gothamchess-london::1::d6@9': {
    intro: {
      say: "d6 — Black sets up a King's-Indian wall against our London. This is where the aggressive plan pays off: Bh6 offers to trade off Black's fianchettoed bishop, stripping the dark squares around the king, and with the queen already on d2 you castle long and storm the kingside. Do not drift into a slow, harmless London here — go for the throat.",
      sayShort: 'd6 — trade on h6, then storm.',
    },
    sources: ['concept:pos-king-safety', 'https://www.chess.com/openings/London-System'],
  },
  'pro-gothamchess-london::2::c5@5': {
    intro: {
      say: "c5 — Black strikes at the centre at once against the Jobava. Meet it calmly: e3 rebuilds the pawn, and after the exchange you develop Nf3 and settle into the classic Jobava piece-play — the knight on c3, the bishop raking from f4, and quick pressure down the half-open lines. Structure first, then the pieces do the talking.",
      sayShort: 'c5 — rebuild with e3, then develop.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/London-System'],
  },
};
