// HAND-AUTHORED narration for the GAMBIT-TAB punish gems (separate lane, David
// 2026-05-27; extended to all 12 gambits 2026-05-29). Mirrors the masterclass
// GEM_NARRATION shape but keyed under gambit-tab ids and consumed only by the
// gambit rendering path — it NEVER touches the masterclass punish-gems.
//
// Keyed by gemId = `${openingId}:${lineMoves_with_underscores}:${inaccuracy}`.
//   watch[i] = full Watch line spoken as playLine move i plays ('' = silent).
//   learn[i] = truncated Learn cue spoken as the STUDENT plays move i ('' =
//              fall back to move dictation; opponent auto-replies stay '').
// Arrays are length-matched to the gem's playLine plies. Every line is verified
// against its own move + position; ideas are grounded in the book corpus
// (book:/concept:) + theory-checked online (Wikipedia / chess.com refs read in
// the 2026-05-29 verification pass), never training recall. A gem SURFACES only
// once it has an entry here; the mined candidates that were engine over-ratings
// of normal developing moves / main-line theory (and the gambits with no clean
// amateur-DB trap — Budapest, Albin, Marshall, Benko) correctly stay dark.

export interface GambitGemNarration {
  watch: string[];
  learn: string[];
  sources?: string[];
}

export const GAMBIT_GEM_NARRATION: Record<string, GambitGemNarration> = {
  // Kieseritzky: 3.Nf3 g5 4.h4 f6? — wrong way to prop g5 (book is 4...g4 5.Ne5). 5.Nxg5! and ...fxg5 6.Qh5+ rakes the open king.
  'gambit-kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4:f6': {
    sources: ['book:kings-gambit', 'concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Kieseritzky_Gambit'],
    watch: ['', '', '', '', '', '', '', '…f6? shores up g5 but walls in Black’s own kingside and leaves e6 and the king’s diagonal tender.', 'Nxg5! the knight just takes the pawn — and …fxg5 runs into Qh5+ raking the open king, so it can’t be taken back.', '', '', '', 'Qxf3 — White stands a clean pawn up with Black’s kingside wrecked and the king marooned on e8.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'Nxg5! — …fxg5? Qh5+ rips the king', '', '', '', 'Qxf3 — a pawn up, king stuck', '', '', ''],
  },
  // Falkbeer: 3...e4 4.d3 f5? over-braces e4 instead of 4...Nf6. 5.dxe4 removes the cramping pawn, development lead decides.
  'gambit-kings-gambit:e4_e5_f4_d5_exd5_e4_d3:f5': {
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Falkbeer_Countergambit'],
    watch: ['', '', '', '', '', '', '', '…f5? braces the e4-pawn but tears holes on e6 and the light squares; the main road is …Nf6.', 'dxe4 — White simply removes the cramping pawn; …fxe4 would shed material, so Black has to let it go.', '', 'e5 — the passed pawn rolls and White’s lead in development decides.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'dxe4 — remove the cramping pawn', '', 'e5 — the passer rolls', '', '', '', '', ''],
  },
  // Falkbeer deeper: 15...Bb4? parks the bishop loose with the king on e8. 16.Qb5+! forks; 18.Qxb4 wins a clean piece.
  'gambit-kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4_Nxe4_Nf3_Bc5_Qe2_Bf5_Nc3:Bb4': {
    sources: ['concept:pos-tempo', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Falkbeer_Countergambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Bb4? pins nothing and parks the bishop on a loose square — with the king still on e8 that is a tactic waiting to happen.', 'Qb5+! the check also hits the stranded b4-bishop — a fork Black cannot meet.', '', 'Qxb4 — the bishop falls; White is a clean piece up.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Qb5+! — check forks the loose bishop', '', 'Qxb4 — up a whole piece', '', '', '', '', ''],
  },
  // Kieseritzky deeper: 15...Rg8? leaves the f6-queen exposed. 16.Nd5! forks queen and c7; Qxf4 recovers the pawn.
  'gambit-kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ne5_d6_Nxg4_Nf6_Nxf6+_Qxf6_Nc3:Rg8': {
    sources: ['book:kings-gambit', 'concept:pos-center', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Kieseritzky_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Rg8? props up g4 but leaves the f6-queen out in the open.', 'Nd5! the knight forks the f6-queen and c7 — the queen must run and White grabs the centre.', '', '', '', 'Qxf4 — the gambit pawn is back, Black’s king is stuck on d8, and White dominates.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nd5! — fork the f6-queen, eye c7', '', '', '', 'Qxf4 — pawn back, king stuck on d8', '', '', ''],
  },
  // Falkbeer: after 5.dxe4 the point is to win the pawn straight back with 5...Nxe4. 5...Bc5? develops but forgets it — 6.Nc3 keeps White two pawns up.
  'gambit-kings-gambit:e4_e5_f4_d5_exd5_e4_d3_Nf6_dxe4:Bc5': {
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit,_Falkbeer_Countergambit'],
    watch: ['', '', '', '', '', '', '', '', '', '…Bc5 is natural development, but it forgets the e4-pawn — the whole point of the Falkbeer is to grab it back with …Nxe4, and Black has skipped it.', 'Nc3 calmly guards the extra pawn and eyes d5; White simply keeps a two-pawn plus.', '', 'e5 kicks the f6-knight and the centre rolls — White is two pawns up for nothing.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Nc3 — keep both extra pawns', '', 'e5 — roll the centre, two up', '', '', '', '', ''],
  },
  // Evans Declined: 5.a4 threatens a5 trapping Bb6 (best is 5...a6). 5...d6? ignores it; 6.a5 and the bishop has no square — wins a piece.
  'gambit-evans-gambit:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bb6_a4:d6': {
    sources: ['concept:pos-tempo', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    watch: ['', '', '', '', '', '', '', '', 'a4 threatens a5, hitting the b6-bishop — Black has to make a square with …a6 or …a5.', '…d6 develops but ignores the threat; now the bishop has nowhere safe to go.', 'a5! traps the bishop on b6 — it lunges to d4, but c3 will hit it there too and it runs out of squares.', '', '', '', 'cxd4 — the bishop is gone; White is up a full piece.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'a5! — the b6-bishop is trapped', '', 'c3 — chase it, no squares left', '', 'cxd4 — win the piece', '', '', ''],
  },
  // Evans Declined: 15...Nxb4? grabs the b4-pawn, but the c6-knight was the b6-bishop's only minder. 16.a5! forks the bishop and c3 then wins the b4-knight.
  'gambit-evans-gambit:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bb6_a4_a6_Nc3_Nf6_Nd5_Nxd5_exd5:Nxb4': {
    sources: ['concept:pos-tempo', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Nxb4 snatches the b4-pawn, but the c6-knight was the bishop’s only guard — greed on the queenside backfires.', 'a5! forks the b6-bishop; it scrambles to c5, and now c3 will pry the stranded b4-knight loose as well.', '', '', '', 'cxb4 — the knight falls, and bxc5 next collects the bishop too. White comes out a piece up.', '', 'bxc5 — and the bishop as well.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'a5! — trap the bishop, win the knight', '', 'c3 — pry the b4-knight loose', '', 'cxb4 — collect the knight', '', 'bxc5 — and the bishop too', ''],
  },
  // Evans Accepted main line: 17...Nxe5? grabs the e5-pawn but drops the knight onto a pinning file with the king on e8. 18.Re1 pins and wins it.
  'gambit-evans-gambit:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Ba5_d4_exd4_O-O_dxc3_Qb3_Qf6_e5:Nxe5': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Nxe5 grabs the pawn but plants the knight on the open e-file with the king still on e8.', 'Re1 pins the e5-knight against the king — it cannot be saved.', '', 'Rxe5 wins the knight; the pressure on f6 and the stuck Black king finish the job. White is winning.', '', '', '', 'Nxe5 — a clean piece up, the attack plays itself.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Re1 — pin the knight to the king', '', 'Rxe5 — win the pinned knight', '', '', '', 'Nxe5 — a piece up', ''],
  },
  // Evans Accepted: with White's big d4+e4 centre, 15...Bb4? puts the bishop on a loose square. 16.d5! forks the c6-knight, gains tempo, dominates.
  'gambit-evans-gambit:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Bc5_d4_exd4_O-O_d6_cxd4:Bb4': {
    sources: ['concept:pos-center', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Bb4 drops the bishop in front of White’s huge centre, where it has nothing to attack.', 'd5! the pawn forks the c6-knight and gains a tempo; White’s centre and bishop pair take over.', '', 'dxc6 — White wins a pawn and keeps a dominating centre with the two bishops.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'd5! — fork the knight, roll the centre', '', 'dxc6 — win the pawn, big centre', '', '', '', '', ''],
  },
  // Max Lange Attack: 9.Ng5 and the only move is 9...Qd5. 9...O-O? loses to fxg7 + Rxe6 + Nxe6+, the classic Max Lange combination.
  'scotch-gambit:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Bc5_O-O_Nf6_e5_d5_exf6_dxc4_Re1+_Be6_Ng5:O-O': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Max_Lange_Attack'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…O-O looks safe, but the f6-pawn and the e6-bishop hang by a thread — the only move was …Qd5.', 'fxg7! tears open the king; after …Kxg7 the rook crashes through.', '', 'Rxe6! removes the e6-guard — …fxe6 walks into Nxe6+ forking king and queen.', '', '', '', 'Nxe6+ then Nxd8 collects the queen — the Max Lange combination, decisive material.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'fxg7! — tear open the king', '', 'Rxe6! — remove the guard', '', 'Nxe6+ — fork king and queen', '', 'Nxd8 — win the queen', ''],
  },
  // Scotch Gambit: 14.h3 asks the g4-bishop. 15...h5? tries to glue it to the pin and just loses a piece to hxg4 + Ng5.
  'scotch-gambit:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Bc5_O-O_d6_c3_dxc3_Nxc3_Bg4_h3:h5': {
    sources: ['concept:pos-king-safety', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Scotch_Game'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…h5 tries to glue the bishop to the pin — but it just loses a piece.', 'hxg4! takes the bishop; after …hxg4 the knight leaps to g5 instead of retreating, eyeing f7.', '', 'Ng5 — White is a piece up for a pawn with the initiative crashing onto the kingside.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'hxg4 — take the pinned bishop', '', 'Ng5 — a piece up, hit f7', '', '', '', '', ''],
  },
  // Frankenstein–Dracula: 4.Qh5 double-attacks e5 and the e4-knight; only 4...Nd6 holds. 4...g6? 5.Qxe5+ forks and wins the knight.
  'vienna-gambit:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5:g6': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
    watch: ['', '', '', '', '', '', '', '…g6 hits the queen but forgets it was guarding two things at once — only …Nd6 covers e5.', 'Qxe5+! the check also wins the stranded e4-knight — Black cannot save both.', '', '', '', 'Nxe4 — White has pocketed the piece and trades into a winning endgame.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'Qxe5+ — check wins the e4-knight', '', 'Qxe7+ — trade down, a piece up', '', 'Nxe4 — pocket the piece', '', '', ''],
  },
  // Frankenstein–Dracula: 9...Qf6? develops onto a square the knight hits with tempo. 10.Nd5 forks queen and c7; the c7-fork wins the rook.
  'vienna-gambit:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3:Qf6': {
    sources: ['concept:pos-tempo', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
    watch: ['', '', '', '', '', '', '', '', '', '…Qf6 develops the queen onto a square the knight can hit with tempo.', 'Nd5! forks the f6-queen and c7 — the queen runs and the c7-fork wins the corner rook.', '', '', '', 'Nxc7+ forks king and rook; Nxa8 nets the exchange and a winning game.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'Nd5! — fork the queen and c7', '', '', '', 'Nxc7+ — fork king and rook', '', 'Nxa8 — win the rook', ''],
  },
  // Frankenstein–Dracula: with the knight already on b5, 11...Qf6? ignores the c7-fork. 12.Nxc7+ wins the rook.
  'vienna-gambit:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5:Qf6': {
    sources: ['concept:pos-tempo', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '…Qf6 ignores the knight already poised on b5 — the c7-fork was the whole point.', 'Nxc7+! the fork lands — king and rook at once.', '', 'Nxa8 grabs the rook; White is winning.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Nxc7+ — fork king and rook', '', 'Nxa8 — win the rook', '', '', '', '', ''],
  },
  // Frankenstein–Dracula: 13...Nd4? grabs at the queen with the king in the centre. 14.Nxd6+ then Nxc8+ and Qxf7+ hunt the king down.
  'vienna-gambit:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3:Nd4': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '…Nd4 lunges at the f3-queen and c2 — but the king is still in the centre, and that is the invitation.', 'Nxd6+! check first; after …Ke7 the knight grabs the c8-bishop with another check.', '', '', '', 'Qxf7+ — the king is hunted into the open. White is completely winning.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxd6+ — check, then grab c8', '', 'Nxc8+ — win the bishop', '', 'Qxf7+ — hunt the king', '', '', ''],
  },
  // Frankenstein–Dracula: 15...Qg5? leaves c7 hanging with the knight on b5. 16.Nxc7+ forks king and rook.
  'vienna-gambit:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5_Nd6_Bb3_Nc6_Nb5_g6_Qf3_f5_Qd5:Qg5': {
    sources: ['concept:pos-tempo', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Vienna_Game'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Qg5 leaves c7 hanging while the knight sits on b5.', 'Nxc7+! fork king and rook — the corner rook falls.', '', '', '', 'Nxa8 — the exchange and a winning position.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxc7+ — fork king and rook', '', '', '', 'Nxa8 — win the rook', '', '', ''],
  },
  // Danish double-gambit: the Bb2+Bd5 battery rakes the long diagonals. 11...c6? opens the a3–f8 diagonal — 12.Bxf7+! and Ba3+ wins the queen.
  'danish-gambit:e4_e5_d4_exd4_c3_dxc3_Bc4_cxb2_Bxb2_d5_Bxd5:c6': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Danish_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '…c6 kicks the d5-bishop but opens the a3–f8 diagonal — fatal with the king still at home.', 'Bxf7+! the bishop crashes in; …Ke7 walks straight into Ba3+.', '', 'Ba3+ — the check skewers the king to the queen on d8.', '', 'Qxd8 — the queen falls for a bishop. White is winning.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Bxf7+ — rip open the king', '', 'Ba3+ — skewer to the queen', '', 'Qxd8 — win the queen', '', '', ''],
  },
  // Smith-Morra: 11...Bg4? pins Nf3 with no knight on f6 to guard g4. 12.Bxf7+ Kxf7 13.Ng5+ and the discovered hit wins the bishop back; the king is wrecked. (Material even — the plus is the exposed king + regained tempo.)
  'smith-morra-gambit:e4_c5_d4_cxd4_c3_dxc3_Nxc3_Nc6_Nf3_d6_Bc4:Bg4': {
    sources: ['concept:pos-king-safety', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '…Bg4 pins the f3-knight, but with no knight on f6 to guard g4 it walks into a standard shot.', 'Bxf7+! …Kxf7 and Ng5+ uncovers an attack on the g4-bishop — it falls next move.', '', 'Ng5+ — the king is dragged out and the discovered hit on g4 is decisive.', '', 'Qxg4 — material is level, but Black’s king will never castle and White is firmly on top.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Bxf7+ — sac to drag the king out', '', 'Ng5+ — discovered hit on g4', '', 'Qxg4 — win the bishop, king stuck', '', '', ''],
  },
  // Stafford: 4.Nxf7? greedily forks queen and rook, but the knight is worth far more. 4...Kxf7 just takes it — Black is a piece up for a pawn.
  'stafford-gambit:e4_e5_Nf3_Nf6_Nxe5_Nc6:Nxf7': {
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Stafford_Gambit'],
    watch: ['', '', '', '', '', '', 'Nxf7 grabs the pawn and forks queen and rook — but the knight is worth far more than the exchange it chases.', '…Kxf7 just takes the knight; Black is a clean piece up for a single pawn.', '', '…Nxe4 snatches a centre pawn too — Black is up a piece with an easy game.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', 'Kxf7 — take the knight, piece up', '', 'Nxe4 — grab the centre pawn', '', 'd5 — blunt the check, stay up', '', '', ''],
  },
  // The famous Stafford trap: 6.Bg5? "pins" the f6-knight — but the pin is an illusion. 6...Nxe4! and taking the queen runs into ...Bxf2+ and mate.
  'stafford-gambit:e4_e5_Nf3_Nf6_Nxe5_Nc6_Nxc6_dxc6_d3_Bc5:Bg5': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Stafford_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', 'Bg5 pins the f6-knight to the queen — but the pin is an illusion.', '…Nxe4!! the knight leaps anyway — grabbing the queen runs into …Bxf2+ and mate, so White must bail out a piece down.', '', '…Bxf2+ springs the trap; the king is dragged off and the g5-bishop hangs.', '', '…Qxg5 — Black has won the bishop and stands clearly on top.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', 'Nxe4 — the pin is fake!', '', 'Bxf2+ — check, spring the trap', '', 'Qxg5 — win the bishop', '', '', ''],
  },
  // Stafford: with ...Bc5 and ...Ng4 already trained on f2, 9.c3? leaves it undefended. 9...Nxf2! forks queen and rook and cannot be taken.
  'stafford-gambit:e4_e5_Nf3_Nf6_Nxe5_Nc6_Nxc6_dxc6_d3_Bc5_Be2_Ng4:c3': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Stafford_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', 'c3 ignores the knight already lurking on g4 — f2 is left undefended.', '…Nxf2! the knight forks queen and rook; taking it drops the queen to …Bc5-check, so it romps free.', '', '…Nxh1 pockets the rook — Black is up serious material.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Nxf2 — fork, it can’t be taken', '', 'Nxh1 — win the rook', '', '', '', '', ''],
  },
  // Englund: 4...Qb4+ and 5.c3? blocks the check but leaves the f4-bishop on the same open rank as the queen. 5...Qxf4! takes it for free.
  'englund-gambit:d4_e5_dxe5_Nc6_Nf3_Qe7_Bf4_Qb4+:c3': {
    sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
    watch: ['', '', '', '', '', '', '', '', 'c3 blocks the check, but the queen on b4 and the bishop on f4 now sit on the same open rank.', '…Qxf4! the queen slides along the fourth rank and takes the bishop for nothing.', '', '', '', '…Nxe5 — Black has won a piece and scooped the gambit pawn back too.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', 'Qxf4 — take the bishop on the rank', '', '', '', 'Nxe5 — win the pawn back too', '', '', ''],
  },
  // The famous Englund trap: 6.Bc3? attacks the queen and seems to guard the a1-rook, but the bishop is overloaded. 6...Bb4! pins it; 7...Qxa1 wins the rook.
  'englund-gambit:d4_e5_dxe5_Nc6_Nf3_Qe7_Bf4_Qb4+_Bd2_Qxb2:Bc3': {
    sources: ['concept:pos-tempo', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', 'Bc3 attacks the queen and seems to defend the a1-rook — but the bishop is now overloaded.', '…Bb4! pins the c3-bishop to the rook; it can’t guard a1 and answer the pin at once.', '', '…Qxa1 — the queen swipes the corner rook. The classic Englund trap.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', 'Bb4 — pin the overloaded bishop', '', 'Qxa1 — win the corner rook', '', '', '', '', ''],
  },
  // Albin: 5.Bd3? puts the bishop on the ONE square Black's recapturing knight
  // already hits. …Nxe5 regains the gambit pawn and forks the d3-bishop and the
  // c4-pawn, so White spends the next moves untangling and drops c4 anyway.
  'albin-countergambit:d4_d5_c4_e5_dxe5_d4_e4_Nc6:Bd3': {
    sources: ['concept:tac-fork', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
    watch: ['', '', '', '', '', '', '', '',
      'Bd3? is a natural developing move that walks onto the one square Black\u2019s knight is already eyeing \u2014 e5 hits both d3 and c4.',
      '\u2026Nxe5! The gambit pawn comes back, and the knight lands attacking the bishop on d3 and the pawn on c4 at the same time. One move, two targets.',
      '', '', '', '', '', '',
      'Bc2 finally steps the bishop off the fork, but c4 was never defended \u2014 and now nothing guards it.'],
    learn: ['', '', '', '', '', '', '', '', '',
      '\u2026Nxe5 \u2014 hits the bishop and c4', '', '', '', '', '', '', ''],
  },
  // Budapest: 5.Qd5?! props up e5 with the queen. …d6! hits the pawn she is
  // guarding, and after the queens come off the g4-knight has Nxf2 winning the
  // g5-bishop back with interest.
  'gambit-budapest-gambit:d4_Nf6_c4_e5_dxe5_Ng4_Bf4_Nc6:Qd5': {
    sources: ['concept:tac-fork', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
    watch: ['', '', '', '', '', '', '', '',
      'Qd5 holds the extra pawn on e5, but it is the queen doing the guarding \u2014 and a queen tied to a pawn is a target, not a defender.',
      '\u2026d6! Strike the pawn she is protecting. White cannot keep both the pawn and the queen comfortable.',
      '', '\u2026dxe5 \u2014 the gambit pawn is back, and Black has the freer development for it.',
      '', 'The queens come off on d8. Black gives up castling, but the centre is already settled and the king sits safely behind its own pawns.',
      '', '', 'h3 finally asks the g4-knight to move \u2014 but it has something far better than a retreat.'],
    learn: ['', '', '', '', '', '', '', '', '',
      '\u2026d6 \u2014 hit the pawn she guards', '', '\u2026dxe5 \u2014 pawn back, freer game', '', '', '', '', ''],
  },
  // Smith-Morra: 5...e5?! grabs the centre but leaves d5 soft and f7 unguarded.
  // Bc4 and Qb3 both land on the a2-g8 diagonal; ...d5 only blocks it for one
  // move, and after Bxd5 the f7-square is still the target. Verified move by
  // move against the board.
  'smith-morra-gambit:e4_c5_d4_cxd4_c3_dxc3_Nxc3:e5': {
    sources: ['concept:tac-fork', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
    watch: ['', '', '', '', '', '', '',
      '\u2026e5 takes the centre, but the pawn on c5 has already left d5 behind \u2014 and with it, the diagonal running at f7.',
      'Bc4! The bishop takes the open diagonal the moment it appears. It is pointed straight at f7, the one square the king alone defends.',
      '',
      'Qb3! A second piece onto the same diagonal. Two attackers on f7, and only the king defending it.',
      '',
      'Bxd5 \u2014 the block is removed and the bishop is back on the diagonal, still staring at f7.',
      '',
      'Bxf7+! The bishop takes with check, so the knight lunging at the queen never gets its turn.',
      'The king has to step up to e7. It is a pawn and the right to castle, and the king is standing in the open with the position still to be played.'],
    learn: ['', '', '', '', '', '', '', '',
      'Bc4 \u2014 take aim at f7', '',
      'Qb3 \u2014 second attacker on f7', '',
      'Bxd5 \u2014 still hitting f7', '',
      'Bxf7+ \u2014 take with check', ''],
  },
  // Danish: after Bxf7+ Black declines with ...Ke7?, keeping the king in the
  // centre that two sacrificed pawns were paid to open. Qb3 holds the bishop on
  // f7 and joins the same diagonal; e5 then clears the long diagonal so the
  // b2-bishop stares at g7. Every claim checked against the board.
  'danish-gambit:e4_e5_d4_exd4_c3_dxc3_Bc4_cxb2_Bxb2_d5_Bxd5_Nf6_Bxf7+:Ke7': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Danish_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '',
      '\u2026Ke7? refuses the bishop, but the king stays in the centre \u2014 which is exactly what two sacrificed pawns bought.',
      'Qb3! The queen guards the bishop on f7 and steps onto the same diagonal. The king cannot take it and cannot run.',
      '',
      'e5! The pawn attacks the knight and clears the long diagonal, so the bishop on b2 looks straight through to g7.',
      '',
      'Bd5 drops back onto the diagonal with tempo \u2014 it hits the knight on e4 and keeps every white piece aimed at the king.',
      '', '',
      'Black checks from a6 to buy air, but the king on e7 is still the problem and White is simply better developed.'],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'Qb3 \u2014 guard f7, join the diagonal', '',
      'e5 \u2014 open the long diagonal', '',
      'Bd5 \u2014 back with tempo', '', '', ''],
  },
  // Evans: after 9.Nc3 the centre is huge and f7 is the pressure point. …Nge7?
  // takes the last guard off g5, so Ng5! lands with Bc4 already aimed at f7.
  'gambit-evans-gambit:e4_e5_Nf3_Nc6_Bc4_Bc5_b4_Bxb4_c3_Bc5_d4_exd4_O-O_d6_cxd4_Bb6_Nc3:Nge7': {
    sources: ['concept:pos-king-safety', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Evans_Gambit'],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '…Nge7 develops, but it hands the f7-square its worst possible defender count — the bishop on c4 is already staring at it and the knight no longer covers g5.', 'Ng5! Straight at f7. Two attackers, one defender, and Black cannot castle out of it in time.', '', 'Qh5 brings the third attacker to bear on f7. Black is now defending with pieces that have nowhere to go.', '', 'Nxh7 collects the pawn and hits the rook on f8 — the attack pays for itself.', '', 'Bg5 turns the last screw, pinning Black to the back rank while the extra pawn keeps.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Ng5 — pile onto f7', '', 'Qh5 — third attacker on f7', '', 'Nxh7 — pawn, and hits the rook', '', '', ''],
  },
  // Stafford: 6.d3? is natural and too slow — f2 is defended by the king alone,
  // and …Ng4! is the move the whole gambit is built around. Be3 Nxe3 fxe3 Bxe3
  // restores material and leaves White shattered with the king stuck in the middle.
  'stafford-gambit:e4_e5_Nf3_Nf6_Nxe5_Nc6_Nxc6_dxc6_Nc3_Bc5:d3': {
    sources: ["concept:pos-king-safety", "concept:pos-initiative", "https://en.wikipedia.org/wiki/Stafford_Gambit"],
    watch: ['', '', '', '', '', '', '', '', '', '', 'd3 is the natural developing square, but it does nothing about f2 — and in this gambit f2 is the whole point. Only the king defends it.', '…Ng4! Straight at f2. Black gave up the pawn for exactly this: pieces pointing at a king still sitting in the centre.', 'Be3 is the only real way to prop up f2 — but it puts a bishop on a square the knight can simply take.', '', "fxe3 keeps material level, at the price of doubled e-pawns and an open f-file pointing back at White's own king.", '…Bxe3 takes the pawn straight back. Material is level, but only one king is safe.', '', '…Qg5 guards the bishop and adds a second piece to the dark-square squeeze. White still cannot castle.', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '…Ng4 — hit f2 at once', '', '', '', '…Bxe3 — pawn back, king exposed', '', '…Qg5 — guard e3, pile on', ''],
  },
  // Scotch Gambit: 11.Bxf7+ and 24% of players DECLINE with …Kf8. Declining is
  // worse than taking — the king has lost castling regardless, Black is a pawn
  // down, and the bishop survives. Nxc3 rebuilds, then Qd5+ and Qxc5+ collect.
  'scotch-gambit:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Bc5_c3_dxc3_Bxf7+:Kf8': {
    sources: ["concept:pos-king-safety", "concept:pos-initiative", "https://en.wikipedia.org/wiki/Scotch_Game"],
    watch: ['', '', '', '', '', '', '', '', '', '', '', '…Kf8 declines the bishop. But the sacrifice has already done its work — the king has lost castling either way, and now Black is simply a pawn down with the bishop still sitting on f7.', 'Nxc3! No rush to save the bishop. White takes the gambit pawn back and finishes developing; the bishop on f7 is not going anywhere.', '', 'Qd5+ forces the king back, and it is the loose bishop on c5 that pays for it.', '', "Qxc5+ takes the bishop with check. White is a clear piece up with Black's king stranded in the centre of its own back rank.", '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Nxc3 — take the pawn, keep the bishop', '', 'Qd5+ — check, then win c5', '', 'Qxc5+ — the bishop, with check', '', '', ''],
  },
  // Bishop's Gambit: after Kf1, …Bc5 is the 36.9% try (124,564 games). d4! hits
  // the bishop AND takes the centre; Nf3 then chases the queen home, and Bxf4
  // recovers the gambit pawn with White far ahead in development.
  'gambit-kings-gambit:e4_e5_f4_exf4_Bc4_Qh4+_Kf1:Bc5': {
    sources: ["concept:pos-initiative", "concept:pos-king-safety", "https://en.wikipedia.org/wiki/King%27s_Gambit"],
    watch: ['', '', '', '', '', '', '', '…Bc5 eyes the soft f2-g1 corner, but the bishop is standing on a square White wants to hit with tempo.', "d4! Gain the tempo and build the centre in one move. The bishop has to move again, and White's pawns take over the middle.", '', 'Nf3 asks the queen the same question. She has been the only black piece in play, and now she is the one losing time.', '…Qd8 — all the way home. Three queen moves for nothing, and White has the centre and the development.', 'Bxf4 finally collects the gambit pawn back. Material is level, but only White has a game.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', 'd4 — tempo and the centre', '', 'Nf3 — kick the queen', '', 'Bxf4 — the pawn comes back', '', '', ''],
  },
  // Budapest: 4.f4 is the greedy hold (156,799 games) and it empties f2, opening
  // the a7-g1 diagonal at White's own king. …Bc5! forces e3, which entombs the
  // c1-bishop; …d6 then wins the grabbed pawn straight back.
  'gambit-budapest-gambit:d4_Nf6_c4_e5_dxe5_Ng4:f4': {
    sources: ["concept:pos-king-safety", "concept:pos-initiative", "https://en.wikipedia.org/wiki/Budapest_Gambit"],
    watch: ['', '', '', '', '', '', 'f4 hangs on to the extra pawn, but it empties f2 — and the whole a7-g1 diagonal now runs straight at the white king.', '…Bc5! Onto that diagonal at once. With f2 gone and nothing on e3 or d4, White has to spend a move just to block it.', 'e3 is forced to shut the diagonal, and it buries the bishop on c1 behind its own pawns.', '…d6 undermines the e5-pawn. The thing White grabbed is now the thing White has to defend.', '', '', '', '…dxe5 — the pawn comes back, and Black has the better structure and the freer pieces for it.', ''],
    learn: ['', '', '', '', '', '', '', '…Bc5 — onto the open diagonal', '', '…d6 — undermine e5', '', '', '', '…dxe5 — pawn back, better game', ''],
  },
  // Scotch Gambit: 5.O-O and …h6 (52,262 games) is a wasted tempo in a line where
  // White paid a pawn for exactly that time. c3! recovers it and cxd4 builds the
  // ideal e4+d4 centre with tempo on the c5-bishop.
  'scotch-gambit:e4_e5_Nf3_Nc6_d4_exd4_Bc4_Bc5_O-O:h6': {
    sources: ["concept:pos-initiative", "concept:pos-center", "https://en.wikipedia.org/wiki/Scotch_Game"],
    watch: ['', '', '', '', '', '', '', '', '', '…h6 is a useful-looking little move, but this is a gambit — White paid a pawn for time, and a free tempo is exactly the currency Black cannot afford to hand back.', 'c3! No tricks needed. White just asks for the pawn back, and taking on d4 will hit the bishop on c5 as well.', '', 'cxd4 — and there it is: pawns on e4 and d4, the ideal centre, obtained for free because Black spent a move on the edge.', '', '', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'c3 — claim the pawn back', '', 'cxd4 — the full centre, free', '', '', '', '', ''],
  },
  // Kieseritzky: after Nxg4, …Bxg4 (29.3%, 35,599 games) removes Black's own
  // light-square defender. Qxg4 recaptures onto a wide-open board with the black
  // king already stripped of its pawn cover.
  'gambit-kings-gambit:e4_e5_f4_exf4_Nf3_g5_h4_g4_Ne5_d6_Nxg4:Bxg4': {
    sources: ["concept:pos-king-safety", "concept:pos-initiative", "https://en.wikipedia.org/wiki/King%27s_Gambit"],
    watch: ['', '', '', '', '', '', '', '', '', '', '', "…Bxg4 wins the piece back, but it trades away the one piece guarding the light squares around Black's king.", "Qxg4 recaptures and the queen arrives on an open board. Black's kingside pawns are gone and the king has nowhere to hide.", '', 'Bb5 develops with a threat — every white piece comes out hitting something while Black is still untangling.', '', '', '', "Qf5 plants the queen in the middle of Black's position. The extra pawn on f4 is small comfort with a king this exposed.", ''],
    learn: ['', '', '', '', '', '', '', '', '', '', '', '', 'Qxg4 — recapture, queen active', '', 'Bb5 — develop with a threat', '', '', '', 'Qf5 — the queen moves in', ''],
  },
  // KGD: …Bg4 pins the f3-knight, but fxe5! shows the pin is an illusion — White
  // is happy to give the knight to open the f-file, and after Qxf3 the queen
  // stares at f7 with the bishop pair thrown in.
  'gambit-kings-gambit:e4_e5_f4_Bc5_Nf3_d6_Nc3_Nf6_Bc4:Bg4': {
    sources: ["concept:tac-pin", "concept:pos-initiative", "https://en.wikipedia.org/wiki/King%27s_Gambit"],
    watch: ['', '', '', '', '', '', '', '', '', '…Bg4 pins the knight to the queen — but a pin only bites if the pinned piece has to stay.', 'fxe5! Ignore it. The f-file rips open and the pawn hits d6; the pin was never really a pin.', '', 'Qxf3 recaptures, and look where the queen lands — straight down the open f-file at f7.', '', 'Nd5 jumps into the hole. White has the bishop pair, the open file and the better king; the pin cost Black the initiative.', '', '', ''],
    learn: ['', '', '', '', '', '', '', '', '', '', 'fxe5 — the pin was an illusion', '', 'Qxf3 — queen onto the open f-file', '', 'Nd5 — into the hole', '', '', ''],
  },
};
