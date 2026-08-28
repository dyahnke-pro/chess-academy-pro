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
      say: "d6 — Black sets up a King's-Indian wall against your London. This is where the aggressive plan pays off: Bh6 offers to trade off Black's fianchettoed bishop, stripping the dark squares around the king, and with the queen already on d2 you castle long and storm the kingside. Do not drift into a slow, harmless London here — go for the throat.",
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

  // ── GothamChess Trompowsky (student WHITE) — the g5-bishop's choice: pin or
  // trade on f6 to damage the structure. ─────────────────────────────────────
  'pro-gothamchess-trompowsky::0::d5@5': {
    intro: {
      say: "d5 — Black stakes the centre in the main Trompowsky. You have the pleasant choice the whole opening is built on: keep the pin, or trade on f6 to damage Black's structure. Calm development with Nd2 and e3 holds the tension; the g5-bishop keeps pressing f6, and you steer a comfortable, low-theory game where you simply understand the position better.",
      sayShort: 'd5 — keep the pin, develop calmly.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack'],
  },
  'pro-gothamchess-trompowsky::1::d5@5': {
    intro: {
      say: "d5 — in the Vaganian, Black jabs the bishop with an early Ne4 first. Answer the aggression head-on: h4 defends the g5-bishop and gains space, then meet the coming ...c5 by developing Bd3 and recapturing on d4. You reach an open, attacking position where Black's early knight sortie has cost time.",
      sayShort: 'd5 — h4 holds the bishop, attack.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Trompowsky-Attack'],
  },
  'pro-gothamchess-trompowsky::3::d5@7': {
    intro: {
      say: "d5 — after Black's fianchetto you have already banked the concrete plus: the trade on f6 doubled Black's f-pawns. Now clamp down — e3, g3 and Bg2 develop squarely against the damaged structure, and that long-term pawn weakness is yours to press for the rest of the game.",
      sayShort: 'd5 — press the doubled f-pawns.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Trompowsky-Attack'],
  },

  // ── GothamChess English (student WHITE) ─────────────────────────────────────
  'pro-gothamchess-english::0::Bg7@5': {
    intro: {
      say: "Bg7 — Black heads into a King's-Indian setup against the English. Seize the initiative with a big centre: e4 and e5 push the knight back, then d4 and f4 build a broad, aggressive front. This is the ambitious anti-King's-Indian plan — space and a kingside push rather than a slow manoeuvring game.",
      sayShort: 'Bg7 — grab the centre, push f4.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/English-Opening'],
  },
  'pro-gothamchess-english::1::O-O@9': {
    intro: {
      say: "O-O — the reversed Sicilian, Black castling in the symmetric main line. Play the mature English plan: Qc2 unpins, then expand on the queenside with a3, Rb1 and b4 while your pieces eye the centre. You are essentially playing a Sicilian a full tempo up.",
      sayShort: 'O-O — Qc2, expand the queenside.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening'],
  },
  'pro-gothamchess-english::2::dxc4@5': {
    intro: {
      say: "dxc4 — Black grabs the pawn in the e6 setup. Recapture with the bishop and develop briskly; you reach a comfortable Queen's-Gambit-style position with easy piece play and a pull in the centre — exactly the flexible middlegame the English aims for.",
      sayShort: 'dxc4 — recapture, develop with a pull.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/English-Opening'],
  },

  // ── GothamChess Pirc (student BLACK) — invite the centre, then counterpunch ─
  'pro-gothamchess-pirc-defense::0::dxc5@10': {
    intro: {
      say: "dxc5 — in the sharp Austrian Attack, White snatches the pawn after your ...c5 counter. This is the Pirc's whole philosophy: let White overextend, then strike. Regain the pawn and hammer the big centre — your fianchettoed bishop rakes the long diagonal and White's advanced pawns become the targets.",
      sayShort: 'dxc5 — regain it, hit the centre.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  },
  'pro-gothamchess-pirc-defense::1::Bc4@8': {
    intro: {
      say: "Bc4 — the Classical, the bishop eyeing f7. Complete your setup calmly: castle, then play the thematic ...c6 and ...b5 to hit the bishop and grab queenside space, or ...Nc6 and ...e5 to strike the centre. The Pirc absorbs the pressure and counters — never passive.",
      sayShort: 'Bc4 — castle, then counter c6 and b5.',
    },
    sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  },
  'pro-gothamchess-pirc-defense::2::h3@8': {
    intro: {
      say: "h3 — the dangerous 150 Attack, White preparing Be3, Qd2 and a kingside pawn storm. Meet aggression with aggression: ...c6 and ...b5 launch your queenside counterattack before White's h-pawn arrives. It is a race on opposite wings, and the Pirc is built to win those races.",
      sayShort: 'h3 — race him with c6 and b5.',
    },
    sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
  },

  // ── GothamChess Rossolimo anti-Sicilian (student WHITE) — Bb5, trade for the
  // structural weakness, clamp. ───────────────────────────────────────────────
  'pro-gothamchess-anti-sicilian::0::g6@5': {
    intro: {
      say: "g6 — Black fianchettos against the Rossolimo. Castle, then run the standard plan: the trade on c6 at the right moment doubles Black's pawns, and you clamp the light squares with d3, Nc3 and a slow build. Giving up the bishop for the knight is no concession here — it hands Black a lasting structural weakness to nurse.",
      sayShort: 'g6 — castle, then Bxc6 doubles pawns.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },
  'pro-gothamchess-anti-sicilian::2::Ne7@9': {
    intro: {
      say: "Ne7 — after the trade on c6 doubles Black's pawns, this knight reroutes toward g6. Follow the plan: d3, Qe2, and the aggressive h4-h5 clamp, squeezing Black's cramped position while those damaged c-pawns give you a permanent structural edge. Patience converts.",
      sayShort: 'Ne7 — clamp with d3 and h4.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
  },

  // ── GothamChess Ponziani (student WHITE) — c3 to prepare a big d4 centre. ────
  'pro-gothamchess-ponziani::0::d5@5': {
    intro: {
      say: "d5 — Black hits back in the centre against the Ponziani. Keep the initiative: Qa4 pins and pressures, Bb5 piles onto the c6-knight. The whole point of c3 was to prepare d4 and a broad centre while your queen and bishop create early threats — a surprise weapon that punishes unprepared opponents.",
      sayShort: 'd5 — Qa4 and Bb5, keep pressing.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Ponziani-Opening'],
  },

  // ── GothamChess Closed Sicilian (student WHITE) — kingside f4 storm blueprint.
  'pro-gothamchess-closed-sicilian::0::a6@7': {
    intro: {
      say: "a6 — Black questions the bishop early. Retreat to d3, keeping the piece and a flexible setup, then castle and roll out the classic plan: f4 and a kingside pawn storm supported by the knight and bishop. The Closed Sicilian trades early theory for a clear attacking blueprint.",
      sayShort: 'a6 — retreat Bd3, castle, then f4.',
    },
    sources: ['concept:pos-king-safety', 'https://www.chess.com/openings/Closed-Sicilian'],
  },

  // ── GothamChess QGD (student BLACK) — solidity is the whole point. ───────────
  'pro-gothamchess-qgd::0::Nc3@4': {
    intro: {
      say: "Nc3 — the mainline Queen's Gambit Declined. Stay solid, the QGD's calling card: after the exchange, develop naturally with Nf6 and Bd6, challenging White's Bf4 and fighting for the dark squares. Rock-solid structure, no weaknesses, and a reliable path to equality against 1.d4.",
      sayShort: 'Nc3 — solid: Nf6 and Bd6.',
    },
    sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  },

  // ── GothamChess Fantasy Caro (student WHITE) — f3 for the big centre. ────────
  'pro-gothamchess-fantasy-caro::0::e6@5': {
    intro: {
      say: "e6 — the solid French-style reply to the Fantasy. You get exactly what you wanted: a broad pawn centre backed by f3. After the bishop trade on c3 you hold the two bishops and the big centre; develop, castle, and use the extra space to press. The bold third move has paid off.",
      sayShort: 'e6 — enjoy the centre and bishops.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },
  'pro-gothamchess-fantasy-caro::2::Qb6@9': {
    intro: {
      say: "Qb6 — Black eyes the b2-pawn in the sharp g6 line. Let it go: Qd2 and Rb1 chase the queen to the rim after Qxb2, and your big lead in development plus the open b-file give full compensation and more. A pawn is a poor trade for that much time.",
      sayShort: 'Qb6 — let b2 go, chase the queen.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation'],
  },

  // ── GothamChess Milner-Barry / Advance French (student WHITE) — e5 space clamp.
  'pro-gothamchess-milner-barry::0::Bd7@9': {
    intro: {
      say: "Bd7 — a quiet setup in the Milner-Barry. Develop naturally with Be2 and castle; you keep the classic Advance-French space clamp behind the e5-pawn, and your pieces flow toward the kingside where Black's cramped position offers targets. No need to force the gambit — the space edge is plenty.",
      sayShort: 'Bd7 — develop, keep the e5 clamp.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  },
  'pro-gothamchess-milner-barry::2::Nf5@11': {
    intro: {
      say: "Nf5 — Black reroutes the knight to blockade in the Advance. Meet it with Bd3, challenging the knight, and build the kingside initiative behind the e5-wedge. The cramped Black position and your space advantage are the Advance French's lasting assets.",
      sayShort: 'Nf5 — challenge with Bd3, attack.',
    },
    sources: ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
  },

  // ── GothamChess Caro-Kann Advance, WHITE side (student WHITE) — grab the space.
  'pro-gothamchess-caro-advance-white::0::c5@5': {
    intro: {
      say: "c5 — Black strikes at the base of your Advance chain. Take with dxc5 and hold the extra pawn briefly with a3; after Black regains it you keep the e5 space-clamp and the freer position, developing Nf3 and Bd3 toward a kingside initiative. The Advance's space is the whole point.",
      sayShort: 'c5 — take dxc5, keep the space.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },
  'pro-gothamchess-caro-advance-white::1::Nc6@7': {
    intro: {
      say: "Nc6 — Black develops to round up the c5-pawn. Defend it aggressively: f4 reinforces the centre and Be3 holds c5, and even after ...d4 you reroute with Bf2 and keep a space-gaining, attacking structure. Your big pawn front is a lasting asset.",
      sayShort: 'Nc6 — hold c5 with f4 and Be3.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'],
  },

  // ── GothamChess Stafford refutation (student WHITE) — d3 + calm development.
  'pro-gothamchess-stafford-refute::0::Bb6@13': {
    intro: {
      say: "Bb6 — deep in the refutation, Black keeps swinging for tricks. You have already defused the Stafford the sound way: trade on c6, play d3, and develop calmly with Be2 and c3. No greedy pawn-grabbing, no walking into the traps — just solid development, and the extra pawn wins itself. Know this and the Stafford is harmless.",
      sayShort: 'Bb6 — develop calmly, the traps fail.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit'],
  },
  'pro-gothamchess-stafford-refute::1::Ng4@9': {
    intro: {
      say: "Ng4 — Black lunges the knight hoping for kingside tricks after e5. Stay solid: d4 and c3 build a broad centre and blunt the knight, which finds no real target. Develop, castle, and your extra pawn plus the centre leave Black with nothing to show for the material.",
      sayShort: 'Ng4 — build the centre, no targets.',
    },
    sources: ['concept:pos-center', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit'],
  },

  // ── GothamChess Italian (student WHITE) ─────────────────────────────────────
  'pro-gothamchess-italian::0::Nf6@5': {
    intro: {
      say: "Nf6 — Black chooses the Two Knights instead of the quiet Giuoco. Play the sound c3 and d3 buildup, or the sharp d4 if you want a fight; either way you develop naturally toward the centre. The Italian's slow-burn pressure on f7 and the centre suits White beautifully.",
      sayShort: 'Nf6 — develop, press f7 and centre.',
    },
    sources: ['concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  },
};
