// HAND-AUTHORED narration for the GAMBIT-TAB punish gems (separate lane, David
// 2026-05-27). Mirrors the masterclass GEM_NARRATION shape but keyed under
// gambit-tab ids and consumed only by the gambit rendering path — it NEVER
// touches the masterclass punish-gems / GEM_NARRATION.
//
// Keyed by gemId = `${openingId}:${lineMoves_with_underscores}:${inaccuracy}`.
//   watch[i] = full Watch line spoken as playLine move i plays ('' = silent).
//   learn[i] = truncated Learn cue spoken as the STUDENT plays move i ('' =
//              fall back to move dictation; opponent auto-replies stay '').
// Arrays are length-matched to the gem's playLine plies. Every line is verified
// against its own move + position; ideas are grounded in the book corpus
// (book:/concept:) + theory-checked (the Wikipedia refs were read during the
// 2026-05-27 verification pass), never training recall. A gem SURFACES only
// once it has an entry here — the other 8 mined King's Gambit candidates were
// dropped in the per-gem theory pass (engine over-ratings of normal developing
// moves / main-line theory) and correctly stay dark.

export interface GambitGemNarration {
  watch: string[];
  learn: string[];
  sources?: string[];
}

export const GAMBIT_GEM_NARRATION: Record<string, GambitGemNarration> = {
  // Kieseritzky: 3.Nf3 g5 4.h4 f6? — the wrong way to prop up g5 (the book road
  // is 4...g4 5.Ne5, the Salvio/Cochrane lines Staunton analyses). 5.Nxg5! and
  // ...fxg5 6.Qh5+ rakes the open king, so the pawn can't be recaptured.
  'gambit-kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4:f6': {
    sources: ['book:kings-gambit', 'concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Kieseritzky_Gambit'],
    watch: [
      '', '', '', '', '', '', '',
      '…f6? shores up g5 but walls in Black’s own kingside and leaves e6 and the king’s diagonal tender.',
      'Nxg5! the knight just takes the pawn — and …fxg5 runs into Qh5+ raking the open king, so it can’t be taken back.',
      '', '', '',
      'Qxf3 — White stands a clean pawn up with Black’s kingside wrecked and the king marooned on e8.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      'Nxg5! — …fxg5? Qh5+ rips the king',
      '', '', '',
      'Qxf3 — a pawn up, king stuck',
      '', '', '',
    ],
  },
  // Falkbeer: 3...e4 4.d3 f5? over-braces the e4-pawn instead of the main
  // 4...Nf6. 5.dxe4 removes the cramping pawn (…fxe4 sheds material) and White's
  // development lead and e-file pressure take over.
  'gambit-kings-gambit:e4_e5_f4_d5_exd5_e4_d3:f5': {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Falkbeer_Countergambit'],
    watch: [
      '', '', '', '', '', '', '',
      '…f5? braces the e4-pawn but tears holes on e6 and the light squares; the main road is …Nf6.',
      'dxe4 — White simply removes the cramping pawn; …fxe4 would shed material, so Black has to let it go.',
      '',
      'e5 — the passed pawn rolls and White’s lead in development decides.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '',
      'dxe4 — remove the cramping pawn',
      '',
      'e5 — the passer rolls',
      '', '', '', '', '',
    ],
  },
  // Falkbeer deeper: …Bc5/…Bf5 developed, then 15...Bb4? parks the bishop on a
  // loose square with the king still on e8. 16.Qb5+! checks AND hits b4 — a
  // fork; …Nd7 forced, 18.Qxb4 wins a clean piece (board-verified: even → +4).
  'gambit-kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4_Nxe4_Nf3_Bc5_Qe2_Bf5_Nc3:Bb4': {
    sources: ['concept:pos-tempo', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Falkbeer_Countergambit'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '…Bb4? pins nothing and parks the bishop on a loose square — with the king still on e8 that is a tactic waiting to happen.',
      'Qb5+! the check also hits the stranded b4-bishop — a fork Black cannot meet.',
      '',
      'Qxb4 — the bishop falls; White is a clean piece up.',
      '', '', '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qb5+! — check forks the loose bishop',
      '',
      'Qxb4 — up a whole piece',
      '', '', '', '', '',
    ],
  },
  // Kieseritzky deeper: after …Nxf6+ Qxf6, 15...Rg8? leaves the f6-queen exposed.
  // 16.Nd5! forks the queen and c7; the queen runs and White seizes the centre,
  // then Qxf4 recovers the gambit pawn with the Black king stuck on d8.
  'gambit-kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ne5_d6_Nxg4_Nf6_Nxf6+_Qxf6_Nc3:Rg8': {
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Kieseritzky_Gambit'],
    watch: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '…Rg8? props up g4 but leaves the f6-queen out in the open.',
      'Nd5! the knight forks the f6-queen and c7 — the queen must run and White grabs the centre.',
      '', '', '',
      'Qxf4 — the gambit pawn is back, Black’s king is stuck on d8, and White dominates.',
      '', '', '',
    ],
    learn: [
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Nd5! — fork the f6-queen, eye c7',
      '', '', '',
      'Qxf4 — pawn back, king stuck on d8',
      '', '', '',
    ],
  },
};
