import type { SublineNarration } from '../../services/sublineLesson';

// Deep subline narration — GothamChess batch 2: Stafford refutation + Milner-
// Barry + Caro-Advance (student WHITE); Scandinavian + French + Caro-Kann
// (student BLACK). Transcript-grounded, house voice, board-safe. Includes a
// teach-both in the Stafford (avoid Be3, play Qf3) — the one line where the
// natural move walks into Black's trick.

const ST = ['concept:pos-development', 'https://www.chess.com/openings/Petrovs-Defense-Stafford-Gambit'];
const SC = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const MB = ['concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'];
const FR = ['concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'];
const CA = ['concept:pos-center', 'https://www.chess.com/openings/Caro-Kann-Defense-Advance-Variation'];

export const SUBLINE_NARRATION_PRO_GOTHAM_W2: Record<string, SublineNarration> = {
  // ===== Stafford refutation (White) =====
  'pro-gothamchess-stafford-refute::0::Ng4@11': {
    intro: { say: "Ng4 — Black lunges for tricks in the refuted Stafford. Just take it: Bxg4 wins the piece, and after …Qh4 you calmly defend with g3 or castling — Black has no attack, only a lost position. You are up a clean piece; convert.", sayShort: 'Ng4 — take it with Bxg4, you win.' }, sources: ST,
  },
  'pro-gothamchess-stafford-refute::0::Qd4@11': {
    intro: { say: "Qd4 — Black centralises the queen hunting tricks. Simply castle: the queen has no targets, and your extra pawn plus solid development win. Ignore the bluff and develop — the Stafford's tricks all fail against calm play.", sayShort: 'Qd4 — castle, the tricks all fail.' }, sources: ST,
  },
  'pro-gothamchess-stafford-refute::0::Qd6@11': {
    intro: { say: "Qd6 — another queen sortie fishing for tricks. Castle and develop: c3, Nd2, and consolidate the extra pawn. Black's compensation is imaginary against solid play — you are simply winning.", sayShort: 'Qd6 — castle, consolidate the pawn.' }, sources: ST,
  },
  'pro-gothamchess-stafford-refute::1::Nd5@9': {
    intro: { say: "Nd5 — Black jumps the knight in the 5.e5 line. Kick it with d4 and c4, gaining a huge centre and space; the knight gets shoved to the rim while you dominate. The Stafford's activity evaporates against the space grab.", sayShort: 'Nd5 — d4 and c4, seize the centre.' }, sources: ST,
  },
  // ===== Scandinavian (Black) =====
  'pro-gothamchess-scandinavian::0::Nf3@4': {
    intro: { say: "Nf3 — natural development in the Qa5 main line. Reply …Bg4 pinning, then …Nc6 and …e6 or …O-O-O; get your pieces active before …e6 shuts the light bishop in. A solid, comfortable Scandinavian.", sayShort: 'Nf3 — pin with Bg4, develop actively.' }, sources: SC,
  },
  'pro-gothamchess-scandinavian::0::Bc4@8': {
    intro: { say: "Bc4 — White develops actively. Pin with …Bg4, then …Nc6, …e6 and …Bd6 or …O-O-O; the queen sits safely on a5 and your pieces come out smoothly. Rock-solid and easy to play.", sayShort: 'Bc4 — Bg4 pin, then develop.' }, sources: SC,
  },
  'pro-gothamchess-scandinavian::0::Ne5@10': {
    intro: { say: "Ne5 — White jumps the knight to a strong central square. Challenge it with …Nbd7 or …e6 and …Bd6; trade it off if it dominates, and continue your solid setup with the queen safe on a5. Comfortable equality.", sayShort: 'Ne5 — challenge it, keep it solid.' }, sources: SC,
  },
  'pro-gothamchess-scandinavian::0::O-O@12': {
    intro: { say: "O-O — White castles in the main line. Continue …Nc6, …Bd6 and …O-O-O or …O-O; your trademark Scandinavian shell is solid and the queen on a5 is safe. Develop and equalise comfortably.", sayShort: 'O-O — develop, the queen is safe.' }, sources: SC,
  },
  'pro-gothamchess-scandinavian::1::Nf3@4': {
    intro: { say: "Nf3 — White holds the extra d5-pawn in the …Nf6 Scandinavian. Regain it: …Bg4 and …Nc6, then …Nxd5, developing actively; the pawn comes back with an easy game. The Modern Scandinavian's knight recapture is smooth.", sayShort: 'Nf3 — Bg4, then regain the pawn.' }, sources: SC,
  },
  'pro-gothamchess-scandinavian::1::Bb5+@4': {
    intro: { say: "Bb5-check — White disrupts before you recapture. Block with …Nbd7, then …Nxd5 or …a6, regaining the pawn; develop naturally and reach a comfortable Modern Scandinavian. The check is easily met.", sayShort: 'Bb5+ — Nbd7, then regain the pawn.' }, sources: SC,
  },
  // ===== Milner-Barry (White) =====
  'pro-gothamchess-milner-barry::0::Qb6@7': {
    intro: { say: "Qb6 — Black targets d4 in the Advance. Develop Nf3, and if Black plays …c4 grabbing space, reroute with a3 and Nbd2 or b3 to undermine it; your e5-clamp and kingside space give a comfortable Advance-French with the initiative.", sayShort: 'Qb6 — Nf3, then undermine …c4.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::0::Nge7@9': {
    intro: { say: "Nge7 — Black reroutes the knight toward f5 or g6. Develop Na3-c2 to defend d4, or Bd3 and castle; your space advantage behind the e5-wedge gives a pleasant, pressing game.", sayShort: 'Nge7 — Na3-c2, hold d4, press.' }, sources: MB,
  },
  'pro-gothamchess-milner-barry::0::Bd7@11': {
    intro: { say: "Bd7 — Black develops before the tension resolves. This is the Milner-Barry: castle, and if Black grabs the d4-pawn, offer the gambit for a raging attack on the light squares toward h7 and the king. Your development lead is worth the pawn.", sayShort: 'Bd7 — castle, offer the gambit pawn.' }, sources: MB,
  },
  // ===== French (Black) =====
  'pro-gothamchess-french-defense::1::c3@12': {
    intro: { say: "c3 — White plays solidly in the …gxf6 Tarrasch. Your doubled f-pawns give you the half-open g-file and the bishop pair; develop …b6 and …Bb7, …Bd6, and aim the pieces at White's king. Unbalanced, but full of resources.", sayShort: 'c3 — b6 and Bb7, use the g-file.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::1::Bg5@8': {
    intro: { say: "Bg5 — White pins in the Rubinstein Tarrasch. Break it with …Be7 and …O-O, then …Nbd7, …b6 and …Bb7; a solid, resilient French where Black is never worse and the light bishop finds a good home.", sayShort: 'Bg5 — Be7 and O-O, stay solid.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::1::Bd3@12': {
    intro: { say: "Bd3 — White develops toward the kingside in the …gxf6 line. Continue …b6 and …Bb7, …Qd6 and …O-O-O; your bishop pair and the half-open g-file give real attacking chances despite the doubled pawns. An unbalanced fight you can win.", sayShort: 'Bd3 — b6 and Bb7, play to attack.' }, sources: FR,
  },
  'pro-gothamchess-french-defense::2::Bd3@6': {
    intro: { say: "Bd3 — the Exchange French, symmetrical and dry. Mirror with …Bd6 and …Ne7, castle, and play for the …c5 or …Bg4 breaks; the position is balanced, and you outplay an inaccurate opponent from equality.", sayShort: 'Bd3 — Bd6 and Ne7, then c5.' }, sources: FR,
  },
  // ===== Caro-Advance, White side =====
  'pro-gothamchess-caro-advance-white::0::h6@7': {
    intro: { say: "h6 — Black makes luft in the Advance. Continue the space-grab: g4 gains kingside room, c4 hits the centre, and Nc3 develops; you build a big spatial bind while Black's bishop is passive on d7. Press the space.", sayShort: 'h6 — g4 and c4, grab space.' }, sources: CA,
  },
  'pro-gothamchess-caro-advance-white::0::Qb6@7': {
    intro: { say: "Qb6 — Black eyes b2 and d4. Develop Nc3, leaving b2 alone; your kingside space with g4 and h5 and the central clamp are worth far more than the pawn. Push the pawns and squeeze.", sayShort: 'Qb6 — Nc3, grab space with g4-h5.' }, sources: CA,
  },
  'pro-gothamchess-caro-advance-white::0::Qxb2@13': {
    intro: { say: "Qxb2 — Black grabs the pawn. Let the queen wander: your huge development lead and the open b-file give a crushing initiative. The greedy queen on b2 is a target, not a threat — develop and hunt it down.", sayShort: 'Qxb2 — develop, hunt the queen.' }, sources: CA,
  },
  // ===== GothamChess Caro-Kann (Black) — remaining Advance lines =====
  'pro-gothamchess-caro-kann::4::Nd2@6': {
    intro: { say: "Nd2 — a quiet Advance setup. Continue …e6, and meet Nb3 with …a5 gaining queenside space; develop …Ne7-g6 hitting e5, and …c5 to break. Your light bishop is already outside on f5 — a comfortable Caro.", sayShort: 'Nd2 — e6 and a5, then c5.' }, sources: CA,
  },
  'pro-gothamchess-caro-kann::4::O-O@10': {
    intro: { say: "O-O — White castles in the Advance. Strike with …c5, hitting the base of the chain, then …Nc6 and pressure d4; your bishop is active on f5 and Black has an easy, active game against the wedge.", sayShort: 'O-O — c5, pressure the d4 base.' }, sources: CA,
  },
  'pro-gothamchess-caro-kann::5::Nf3@8': {
    intro: { say: "Nf3 — White develops after the …c5 break. Recapture the pawn with …Bxc5, develop …Nc6, and press d4 and the centre; the Advance's space is neutralised and Black is comfortably active.", sayShort: 'Nf3 — Bxc5, then press the centre.' }, sources: CA,
  },
};
