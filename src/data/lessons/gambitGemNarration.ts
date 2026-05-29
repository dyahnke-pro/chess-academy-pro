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
};
