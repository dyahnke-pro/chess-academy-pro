#!/usr/bin/env node
// Generate the Aman GEM_NARRATION block with arrays sized EXACTLY to each
// gem's playLine ply count. Narration is keyed by absolute ply index. We place
// text at: inaccuracy ply (inaccIdx), punish (inaccIdx+1), and the follow-ups
// I authored; everything else stays "". This guarantees length alignment.
import fs from 'node:fs';

const g = JSON.parse(fs.readFileSync('src/data/punish-gems.json', 'utf8'));
const arr = Array.isArray(g) ? g : (g.gems || Object.values(g).flat());
const am = arr.filter((x) => (x.openingId || '').includes('aman'));

// Per gem: { watchAt: {idx:text}, learnAt:{idx:text}, sources:[] }
// Authored narration, indexed ABSOLUTELY by ply. (idx of inaccuracy = inaccIdx)
const A = {
  'pro-aman-sicilian-kan:e4_c5_Nf3_e6_d4_cxd4_Nxd4_a6_Nc3_Qc7_Bd3_Nf6_O-O_d6_f4_Nbd7:f5': {
    sources: ['concept:pos-center','concept:pos-initiative','https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'],
    watch: { 16:'f5?! — White lunges in the centre before finishing development; the e5-square and the a7-g1 diagonal both go soft.', 17:'…Qb6! — the queen swings to b6, hitting d4 and the weakened g1-diagonal at once.', 19:'…e5! — Black strikes back; the d4-knight has no good square and White cracks.', 21:'…exd4 — the centre collapses in Black’s favour.', 23:'…Qd8 — regrouping a clean pawn to the good.' },
    learn: { 17:'…Qb6 — hit d4 and the diagonal', 19:'…e5 — strike the loose centre', 21:'…exd4 — collapse the centre' },
  },
  'pro-aman-sicilian-kan:e4_c5_c3_Nf6_e5_Nd5_d4_cxd4_Nf3_Nc6_Bc4_Nb6:Bxf7+': {
    sources: ['concept:tac-sacrifice','concept:pos-king-safety','https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation'],
    watch: { 12:'Bxf7+?! — a hopeful sacrifice, but with no pieces ready to follow up it just donates a bishop.', 13:'…Kxf7 — Black takes the gift; the king walks one square and is safe behind the e6/d-pawns.', 15:'…Kg8 — the king tucks away; White has nothing for the piece.', 17:'…e6 — the centre stays shut, the extra piece tells.', 19:'…h6 — calm, up a clean piece.' },
    learn: { 13:'…Kxf7 — take it, king is safe', 15:'…Kg8 — tuck the king away', 17:'…e6 — shut the centre' },
  },
  'pro-aman-sicilian-kan:e4_c5_Nf3_e6_d4_cxd4_Nxd4_a6_Nc3_Qc7_f4_Bb4:Bd3': {
    sources: ['concept:tac-pin','concept:tac-fork','https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'],
    watch: { 12:'Bd3?! — developing into the pin; the c3-knight is loose and d4 is undefended behind it.', 13:'…Bxc3+! — removing the defender with check; the d4-knight falls next.', 15:'…Qxc3+ — the queen forks king and the hanging d4-knight.', 17:'…Qxd4 — collecting the second piece; Black is decisively up material.', 19:'…Qb6 — consolidating, winning.' },
    learn: { 13:'…Bxc3+ — remove the defender, check', 15:'…Qxc3+ — fork king and knight', 17:'…Qxd4 — collect the loose knight' },
  },
  'pro-aman-sicilian-kan:e4_c5_Nf3_e6_d4_cxd4_Nxd4_a6_Bd3_Nf6_Nc3_Qc7_O-O_d6_f4_Be7:e5': {
    sources: ['concept:pos-center','concept:pos-initiative','https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'],
    watch: { 16:'e5?! — White rips the centre open prematurely, leaving the e5-pawn weak and the king’s cover thin.', 17:'…dxe5 — Black takes; the recapture leaves White a loose pawn and no attack.', 19:'…Qxe5 — the queen scoops the pawn, eyeing the long diagonal and h2.', 21:'…Qc7 — retreating with the extra pawn banked.', 23:'…Bd7 — finishing development, clearly better.' },
    learn: { 17:'…dxe5 — take the loose push', 19:'…Qxe5 — grab the centre pawn', 21:'…Qc7 — bank the pawn' },
  },
  'pro-aman-sicilian-kan:e4_c5_Nf3_e6_d4_cxd4_Nxd4_a6_Nc3_Qc7_g3_Nf6:Bf4': {
    sources: ['concept:tac-fork','concept:pos-center','https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'],
    watch: { 12:'Bf4?! — the bishop develops to a square Black’s centre break hits with tempo.', 13:'…e5! — fork: the pawn attacks the f4-bishop and grabs the centre at once.', 14:'Bxe5 — White takes the pawn, but the bishop is overloaded.', 15:'…Qxe5 — recapturing, hitting b2 and centralising with material gained.', 17:'…Qc5 — the queen sidesteps, holding the edge and the bishop pair.', 19:'…d6 — solidifying, clearly on top.' },
    learn: { 13:'…e5 — fork the bishop, take centre', 15:'…Qxe5 — recapture, hit b2', 17:'…Qc5 — hold the edge' },
  },
  'pro-aman-sicilian-kan:e4_c5_c3_d5_exd5_Qxd5_d4_Nf6_Na3_cxd4:Bc4': {
    sources: ['concept:tac-fork','concept:pos-initiative','https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation'],
    watch: { 10:'Bc4?! — White hits the queen but leaves g2 hanging and the king uncastled.', 11:'…Qxg2! — the queen grabs the loose pawn and attacks the h1-rook.', 12:'Qf3 — White must defend with a trade offer.', 13:'…Qxf3 — Black trades into a clean extra pawn.', 15:'…a6 — quietly taking b5 away, a pawn up.', 17:'…e5 — claiming the centre, decisively better.' },
    learn: { 11:'…Qxg2 — grab the pawn, hit the rook', 13:'…Qxf3 — trade into a pawn up', 15:'…a6 — deny b5' },
  },
  'pro-aman-nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Qc2_O-O_Nf3_d5_Bg5_h6:h4': {
    sources: ['concept:tac-sacrifice','concept:pos-king-safety','https://www.chess.com/openings/Nimzo-Indian-Defense'],
    watch: { 12:'h4?! — White refuses to part with the pinning bishop, but leaving it en prise just drops a piece.', 13:'…hxg5! — Black simply takes the bishop; an open h-file is not worth a whole piece.', 14:'hxg5 — White reopens the file in desperation.', 15:'…Ne4 — the knight leaps to the strong central outpost, blocking the file.', 17:'…g6 — calmly shutting the attack down, a clean piece up.', 19:'…Bxc3+ — trading off to kill counterplay, decisively ahead.' },
    learn: { 13:'…hxg5 — just take the bishop', 15:'…Ne4 — outpost, block the file', 17:'…g6 — shut it down' },
  },
  'pro-aman-nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_Qc2_O-O_Nf3_d5_Bg5_h6_Bh4_Nbd7:Ne5': {
    sources: ['concept:pos-center','concept:pos-initiative','https://www.chess.com/openings/Nimzo-Indian-Defense'],
    watch: { 14:'Ne5?! — the knight jumps in unsupported just as Black is ready to hit the centre.', 15:'…c5! — striking d4 at once; the centre and the loose e5-knight both come under fire.', 16:'e3 — propping up d4.', 17:'…Qa5 — pinning and pressuring c3, increasing the bind.', 18:'Bxf6 — White gives up the bishop pair.', 19:'…Nxf6 — recapturing comfortably.', 21:'…Ne4 — back to the outpost, clearly better.' },
    learn: { 15:'…c5 — hit the centre and the knight', 17:'…Qa5 — pin and pressure c3', 19:'…Nxf6 — recapture, keep the bind' },
  },
  'pro-aman-nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_e3_O-O_Bd3_d5:c5': {
    sources: ['concept:pos-center','concept:pos-initiative','https://www.chess.com/openings/Nimzo-Indian-Defense'],
    watch: { 10:'c5?! — White grabs queenside space, but the pawn is overextended and unsupported.', 11:'…b6! — undermining the c5-pawn at its base; the chain cannot hold.', 12:'cxb6 — White releases the tension.', 13:'…Bxc3+ — first removing the defender with check.', 15:'…axb6 — opening the a-file onto White’s shattered queenside.', 17:'…Ba6 — the bishop rakes the weak c4/queenside, Black clearly better.' },
    learn: { 11:'…b6 — undermine the overextended pawn', 13:'…Bxc3+ — remove the defender', 15:'…axb6 — open the a-file', 17:'…Ba6 — rake the weak pawns' },
  },
  'pro-aman-nimzo-indian:d4_Nf6_c4_e6_Nc3_Bb4_f3_d5:Bd2': {
    sources: ['concept:pos-center','concept:pos-structure','https://www.chess.com/openings/Nimzo-Indian-Defense'],
    watch: { 8:'Bd2?! — passive; it neither recaptures the centre nor supports c4, so Black just grabs the pawn.', 9:'…dxc4! — Black snatches c4; with f3 weakening the kingside, holding it is awkward for White.', 10:'e3 — trying to round up c4.', 11:'…c5! — counterstriking d4 before White regains the pawn.', 13:'…cxd4 — opening lines while a pawn up.', 15:'…dxc3 — Black wins material in the exchange and keeps the extra pawn.' },
    learn: { 9:'…dxc4 — grab the loose pawn', 11:'…c5 — counterstrike d4', 13:'…cxd4 — open lines, stay ahead' },
  },
  'pro-aman-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4:Nxd4': {
    sources: ['concept:tac-fork','concept:pos-king-safety','https://www.chess.com/openings/Caro-Kann-Defense'],
    watch: { 10:'Nxd4?! — recapturing with the knight invites the check; the king cannot castle out of it.', 11:'…Qh4+! — check on the open fourth rank, and the e4-pawn hangs at the same time.', 12:'g3 — blocking the check.', 13:'…Qxe4+ — the queen scoops e4 with check, regaining the pawn with the safer king.', 15:'…Qxe2+ — Black trades into a clean pawn-up ending.', 17:'…Nf6 — developing, comfortably better.' },
    learn: { 11:'…Qh4+ — check and win e4', 13:'…Qxe4+ — take the pawn with check', 15:'…Qxe2+ — trade into a pawn up' },
  },
  'pro-aman-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4_Bc4_Be6_Bxe6_fxe6:Nxd4': {
    sources: ['concept:tac-fork','concept:pos-initiative','https://www.chess.com/openings/Caro-Kann-Defense'],
    watch: { 14:'Nxd4?! — again the recapture walks into the check with the king stuck in the centre.', 15:'…Qh4+! — the queen leaps to the open fourth rank; White must block or run.', 16:'Kf1 — the king loses castling rights.', 17:'…e5 — the pawn rolls forward, hitting d4 and seizing the centre.', 19:'…Nf6 — developing with tempo toward the open king.', 21:'…Qh5 — keeping the queen active, Black clearly on top.' },
    learn: { 15:'…Qh4+ — check, strand the king', 17:'…e5 — roll the centre forward', 19:'…Nf6 — develop at the king' },
  },
  'pro-aman-caro-kann:e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4_Bc4_Be6_Bxe6_fxe6_O-O_Nf6:Ne5': {
    sources: ['concept:pos-center','concept:pos-initiative','https://www.chess.com/openings/Caro-Kann-Defense'],
    watch: { 16:'Ne5?! — the knight jumps in but has no support and can simply be challenged away.', 17:'…Be7! — calm development; the e5-knight has no real threat and must give ground.', 18:'Bf4 — trying to hold the outpost.', 19:'…O-O — Black tucks the king away, a pawn to the good.', 21:'…Nbd7 — challenging the e5-knight directly.', 23:'…Qe8 — repositioning, Black comfortably better.' },
    learn: { 17:'…Be7 — ignore it, stay solid', 19:'…O-O — king to safety', 21:'…Nbd7 — challenge the knight' },
  },
  'pro-aman-reti:Nf3_g6_d4_Bg7_e4_d6_c3_Nf6_Bd3_O-O_O-O_Nc6_h3_e5_Re1:exd4': {
    sources: ['concept:pos-center','concept:pos-space','https://www.chess.com/openings/Reti-Opening'],
    watch: { 15:'exd4?! — Black releases the central tension too early, handing White a strong mobile pawn centre.', 16:'cxd4 — recapturing toward the centre; White has the big e4/d4 duo.', 18:'Bf1 — calmly retreating the bishop, keeping the centre intact.', 20:'e5 — the centre rolls forward, gaining space and kicking the f6-knight.', 22:'a3 — denying b4, White clearly better with the space bind.' },
    learn: { 16:'cxd4 — build the big centre', 18:'Bf1 — keep the centre', 20:'e5 — roll forward, gain space' },
  },
  'pro-aman-reti:Nf3_Nf6_g3_d5_Bg2_c6_O-O_Bf5_d3_e6_Nbd2_h6_Re1:Bd6': {
    sources: ['concept:tac-fork','concept:pos-center','https://www.chess.com/openings/Reti-Opening'],
    watch: { 13:'Bd6?! — the bishop blocks the d-pawn and stands in the path of e4 with nothing guarding f5.', 14:'e4! — the central break forks: it hits the f5-bishop and threatens e5 onto the d6-bishop.', 15:'Bh7 — the bishop flees to the corner, out of play.', 16:'e5 — the pawn jabs forward with tempo, forking d6 and f6.', 18:'exf6 — White wins a clean piece via the fork.', 19:'Qxf6 — Black recaptures the pawn but stays a piece down.', 20:'a4 — gaining space, completely winning.' },
    learn: { 14:'e4 — break, fork bishop and centre', 16:'e5 — jab forward, fork again', 18:'exf6 — collect the piece' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_d3_Bc5_c3:Ng4': {
    sources: ['concept:tac-fork','concept:pos-king-safety','https://www.chess.com/openings/Ruy-Lopez-Opening'],
    watch: { 9:'Ng4?! — the knight lunges at f2 with no backup; White just castles and it is stranded.', 10:'O-O — castling calmly; f2 is covered and the g4-knight has overstayed.', 12:'h3 — questioning the intruder.', 13:'Nf6 — it must retreat, having lost time.', 14:'Bxc6 — picking the moment to take.', 16:'Nxe5 — White wins the e5-pawn cleanly, a pawn up with the better structure.' },
    learn: { 10:'O-O — castle, f2 is fine', 12:'h3 — kick the intruder', 14:'Bxc6 — damage the structure', 16:'Nxe5 — win the pawn' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nf6_d3_Bc5_c3_O-O_O-O:a6': {
    sources: ['concept:pos-structure','concept:pos-initiative','https://www.chess.com/openings/Ruy-Lopez-Opening'],
    watch: { 11:'a6?! — questioning the bishop a tempo too early; the e5-pawn is loose and White grabs it.', 12:'Bxc6 — taking, doubling Black’s pawns.', 13:'dxc6 — recapturing toward the centre.', 14:'Nxe5 — White wins e5; the c5-bishop’s eye on f2 is not enough.', 16:'Nf3 — the knight retreats with the extra pawn banked.', 18:'h3 — calmly questioning the pin, White a clean pawn up.' },
    learn: { 12:'Bxc6 — double the pawns', 14:'Nxe5 — win the e-pawn', 16:'Nf3 — bank the pawn', 18:'h3 — break the pin' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_f5_d3_fxe4_dxe4_Nf6_Nc3:d6': {
    sources: ['concept:pos-king-safety','concept:pos-structure','https://www.chess.com/openings/Ruy-Lopez-Opening-Schliemann-Defense'],
    watch: { 11:'d6?! — too slow against the Schliemann; White seizes the initiative against the loosened kingside.', 12:'a3 — a useful waiting move, keeping b4 covered and the bishop safe.', 13:'Be6 — Black develops.', 14:'Ng5 — jumping at the e6-bishop and the weak light squares.', 16:'f4 — opening lines toward the exposed king.', 18:'O-O — White completes development with a clear initiative.' },
    learn: { 12:'a3 — useful waiting move', 14:'Ng5 — jump at the weak squares', 16:'f4 — open lines at the king', 18:'O-O — finish, press' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_f5_d3_fxe4_dxe4_Nf6_Nc3_Bb4_O-O:d6': {
    sources: ['concept:tac-fork','concept:pos-initiative','https://www.chess.com/openings/Ruy-Lopez-Opening-Schliemann-Defense'],
    watch: { 13:'d6?! — leaving the b4-bishop loose and the centre soft; White jumps in with tempo.', 14:'Nd5! — the knight lands on the dominant outpost, hitting the b4-bishop and f6-knight.', 15:'Bc5 — the bishop sidesteps.', 16:'b4! — gaining space and harassing the bishop further.', 18:'Bg5 — piling on the pinned f6-knight.', 20:'a4 — the queenside roll continues, White clearly on top.' },
    learn: { 14:'Nd5 — seize the outpost with tempo', 16:'b4 — gain space, harass', 18:'Bg5 — pile on the pin' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_f5_d3_fxe4_dxe4_Nf6_Nc3_Bb4_O-O_Bxc3_bxc3:Nxe4': {
    sources: ['concept:tac-pin','concept:pos-initiative','https://www.chess.com/openings/Ruy-Lopez-Opening-Schliemann-Defense'],
    watch: { 15:'Nxe4?! — grabbing the pawn opens the e-file straight at the uncastled king.', 16:'Re1! — the rook slams onto the open e-file, pinning the e4-knight against the king.', 17:'Nf6 — the knight must scramble back.', 18:'Bxc6 — removing the defender of e5.', 20:'Rxe5+ — the rook wins the pawn with check; the king is stuck.', 22:'c4 — White consolidates, up material with a raging initiative.' },
    learn: { 16:'Re1 — pin on the open file', 18:'Bxc6 — remove e5’s guard', 20:'Rxe5+ — win the pawn, check' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nd4_Nxd4_exd4_O-O:Qg5': {
    sources: ['concept:tac-fork','concept:pos-king-safety','https://www.chess.com/openings/Ruy-Lopez-Opening-Bird-Variation'],
    watch: { 9:'Qg5?! — the queen sortie eyes g2 and the bishop, but it is loose and easily hit with tempo.', 10:'Bc4 — developing while covering g2 and eyeing f7.', 12:'d3 — opening the c1-bishop onto the exposed queen.', 13:'Qh5 — the queen is chased again.', 14:'Qxh5 — White trades, punishing the wasted time.', 16:'Re1 — White is up a clear initiative with the bishop pair.' },
    learn: { 10:'Bc4 — develop, cover g2, hit f7', 12:'d3 — open the bishop on the queen', 14:'Qxh5 — trade, punish lost time', 16:'Re1 — press the edge' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nd4_Nxd4_exd4_O-O_c6_Bc4:Bc5': {
    sources: ['concept:tac-sacrifice','concept:pos-king-safety','https://www.chess.com/openings/Ruy-Lopez-Opening-Bird-Variation'],
    watch: { 11:'Bc5?! — defending d4 but walking onto the f7-fork; the king has not castled.', 12:'Bxf7+! — the bishop strike rips the king off its castling square for a lasting bind.', 13:'Kf8 — the king is stuck in the centre.', 14:'Bb3 — the bishop retreats safely, keeping the spoils.', 16:'a4 — clamping the queenside shut.', 18:'d3 — White calmly develops, a pawn up with Black’s king stranded.' },
    learn: { 12:'Bxf7+ — strip the castling square', 14:'Bb3 — retreat, keep the bind', 16:'a4 — clamp the queenside', 18:'d3 — develop, king stranded' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_Nge7_O-O_a6_Ba4_b5_Bb3:Na5': {
    sources: ['concept:tac-sacrifice','concept:tac-fork','https://www.chess.com/openings/Ruy-Lopez-Opening'],
    watch: { 11:'Na5?! — chasing the bishop with a rim-knight leaves e5 fatally under-defended.', 12:'Nxe5! — the knight grabs e5; if Black takes on b3, Qh5 forks king and knight.', 13:'Nxb3 — Black grabs the bishop.', 14:'Qh5! — the double attack: mate on f7 and the loose b3-knight both hang.', 15:'Ng6 — Black must defend f7.', 16:'axb3 — White recovers the piece, a clean pawn up with the initiative.', 18:'d4 — seizing the centre, White clearly winning.' },
    learn: { 12:'Nxe5 — grab the pawn, set the fork', 14:'Qh5 — double attack f7 and b3', 16:'axb3 — recover, stay a pawn up', 18:'d4 — seize the centre' },
  },
  'pro-aman-ruy-lopez:e4_e5_Nf3_Nc6_Bb5_a6_Ba4_Nf6_O-O_Nxe4_d4_b5_Bb3_d5_dxe5:Bc5': {
    sources: ['concept:tac-pin','concept:pos-initiative','https://www.chess.com/openings/Ruy-Lopez-Opening-Open-Variation'],
    watch: { 15:'Bc5?! — in the Open Ruy this lets White strike; the d5-pawn is overloaded.', 16:'Bxd5! — the bishop takes the key pawn, exploiting the pin on the e6/f7 squares.', 17:'Bxf2+ — Black tries a desperado.', 18:'Kh1 — the king steps aside, the check spent for nothing.', 20:'Bxe4 — White wins the e4-knight, now up multiple pawns.', 22:'Rxd1 — recapturing, White completely winning.' },
    learn: { 16:'Bxd5 — take the overloaded pawn', 18:'Kh1 — sidestep the check', 20:'Bxe4 — win the knight' },
  },
  'pro-aman-reti:Nf3_d5_g3_Nf6_Bg2_e6_O-O_Be7_d3_O-O_Nbd2_c5_e4:d4': {
    sources: ['concept:pos-space','concept:pos-structure','https://www.chess.com/openings/Reti-Opening'],
    watch: { 13:'d4?! — closing the centre hands White the e4-square and a free hand on the kingside; the d4-pawn becomes a target.', 14:'a4! — gaining queenside space and fixing Black’s structure before turning to the kingside.', 16:'e5 — the centre rolls forward, gaining space and clamping the f6-knight out.', 18:'Nc4 — the knight reroutes to the strong c4-outpost, eyeing the queenside holes.', 20:'Nfd2 — doubling knights toward c4/e4, White comfortably better with the space bind.' },
    learn: { 14:'a4 — gain space, fix the structure', 16:'e5 — roll forward, clamp f6', 18:'Nc4 — reroute to the outpost' },
  },
  'pro-aman-rossolimo:e4_c5_Nf3_Nc6_Bb5_g6_Bxc6_bxc6_O-O_Bg7_Re1_Nf6_e5_Nd5_c4:Nf4': {
    sources: ['concept:pos-center','concept:pos-space','https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'],
    watch: { 15:'Nf4?! — the knight hops to the rim where it can be kicked; Black falls behind in the centre.', 16:'d4! — White builds the big pawn centre, the f4-knight offside and out of play.', 17:'Ne6 — the knight scrambles back toward the centre.', 18:'d5! — the pawn jabs forward with tempo, gaining space and cramping Black.', 20:'cxd5 — recapturing toward the centre, the pawn duo dominant.', 22:'Nc3 — developing behind the big centre, White with a clear space advantage.' },
    learn: { 16:'d4 — build the big centre', 18:'d5 — jab forward, gain space', 20:'cxd5 — keep the pawn duo' },
  },
  'pro-aman-rossolimo:e4_c5_Nf3_Nc6_d4_cxd4_Nxd4_e5_Nb5:Qa5+': {
    sources: ['concept:tac-fork','concept:pos-initiative','https://www.chess.com/openings/Sicilian-Defense'],
    watch: { 9:'Qa5+?! — the check looks active but the queen is misplaced and the d6-square is fatally weak.', 10:'N1c3 — developing with tempo toward the d5/d6 holes, ignoring the spite-check.', 11:'a6 — Black tries to chase the b5-knight.', 12:'Nd6+! — the knight leaps into the hole with check, a monster outpost forking the position.', 13:'Bxd6 — Black must give up the bishop pair.', 14:'Qxd6 — White dominates with the queen on d6 and Black’s structure in ruins.', 16:'Qc7 — keeping the bind, White clearly winning.' },
    learn: { 10:'N1c3 — develop at the holes', 12:'Nd6+ — leap into the hole, check', 14:'Qxd6 — dominate' },
  },
  'pro-aman-french-white:e4_e6_d4_d5_Nc3_Nf6_e5_Nfd7_f4_c5_Nf3_Nc6_Be3_Qb6_Na4:Qb4+': {
    sources: ['concept:tac-fork','concept:pos-initiative','https://www.chess.com/openings/French-Defense-Steinitz-Variation'],
    watch: { 15:'Qb4+?! — the check chases nothing; after c3 the queen is hit again and offside.', 16:'c3 — blocking with tempo, gaining a move on the queen.', 17:'Qa5 — the queen retreats awkwardly.', 18:'Nxc5! — the knight grabs c5, exploiting the offside black queen.', 20:'dxc5 — White is a clean pawn up with a big space bind.', 22:'b4 — clamping the queenside, White clearly better.' },
    learn: { 16:'c3 — block with tempo', 18:'Nxc5 — grab the pawn', 20:'dxc5 — a pawn up, big bind' },
  },
  'pro-aman-french-white:e4_e6_d4_d5_Nc3_Bb4_e5_c5_a3_Bxc3+_bxc3:c4': {
    sources: ['concept:pos-king-safety','concept:pos-initiative','https://www.chess.com/openings/French-Defense-Winawer-Variation'],
    watch: { 11:'c4?! — releasing the central tension hands White a free hand on the kingside; Black’s king has no shelter.', 12:'Qg4! — the queen swings to g4, eyeing g7 and the dark squares.', 13:'g6 — Black weakens the dark squares to defend.', 14:'h4! — the rook’s pawn charges in to pry open the king.', 16:'Ne2 — developing toward g3/f4 and the attack.', 18:'Qf3 — White centralises the queen with a crushing initiative.' },
    learn: { 12:'Qg4 — swing at the dark squares', 14:'h4 — storm the king', 16:'Ne2 — develop into the attack', 18:'Qf3 — press home' },
  },
  'pro-aman-french-white:e4_e6_d4_d5_e5_c5_c3:c4': {
    sources: ['concept:pos-space','concept:pos-structure','https://www.chess.com/openings/French-Defense-Advance-Variation'],
    watch: { 7:'c4?! — releasing the tension lets White clamp the queenside and play on both wings unopposed.', 8:'b3! — undermining the c4-pawn at once; Black cannot hold the over-advanced pawn.', 9:'b5 — trying to brace it.', 10:'a4! — striking the base of the chain.', 12:'b4 — the wedge clamps the queenside for good.', 14:'a5 — White’s queenside pawns roll, a lasting space bind.' },
    learn: { 8:'b3 — undermine the c4-pawn', 10:'a4 — strike the base', 12:'b4 — clamp the queenside', 14:'a5 — roll the pawns' },
  },
  'pro-aman-french-white:e4_e6_d4_d5_Nc3_Bb4_e5_Ne7_a3_Bxc3+_bxc3:Ng6': {
    sources: ['concept:pos-king-safety','concept:pos-space','https://www.chess.com/openings/French-Defense-Winawer-Variation'],
    watch: { 11:'Ng6?! — the knight heads for f4 but it takes time, and White’s h-pawn comes with tempo.', 12:'h4! — the rook’s pawn lunges, gaining space and threatening h5 to trap the knight.', 13:'h5 — Black blocks but loosens the kingside.', 14:'Bg5! — the bishop pins and presses, the g6-knight awkward.', 16:'Nh3 — heading for f4, the strong square.', 18:'Nf4 — the knight lands on f4, White with a clear kingside initiative.' },
    learn: { 12:'h4 — storm, threaten h5', 14:'Bg5 — pin and press', 16:'Nh3 — reroute to f4', 18:'Nf4 — dominant square' },
  },
  'pro-aman-french-white:e4_e6_d4_d5_Nc3_Bb4_e5_Ne7_a3_Bxc3+_bxc3_b6_Qg4:Ba6': {
    sources: ['concept:tac-sacrifice','concept:pos-king-safety','https://www.chess.com/openings/French-Defense-Winawer-Variation'],
    watch: { 13:'Ba6?! — chasing the f1-bishop ignores the threat to g7; the king is still in the centre.', 14:'Qxg7! — the queen grabs g7, smashing into the uncastled position; the h8-rook is loose.', 15:'Kd7 — the king must run, castling gone forever.', 16:'Qxf7 — White scoops a second pawn with continuing threats.', 18:'Kxf1 — recapturing; White is two pawns up with Black’s king exposed.', 20:'Ne2 — developing, White completely winning.' },
    learn: { 14:'Qxg7 — smash the uncastled king', 16:'Qxf7 — take a second pawn', 18:'Kxf1 — two pawns up' },
  },
  'pro-aman-anti-caro:e4_c6_Nc3_d5_Nf3_dxe4_Nxe4_Nf6_Nxf6+:gxf6': {
    sources: ['concept:pos-structure','concept:pos-center','https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'],
    watch: { 9:'gxf6?! — recapturing toward the centre shatters Black’s kingside pawns and exposes the king.', 10:'d4 — White builds the big centre, ready to exploit the damage.', 11:'Bf5 — Black develops the bishop.', 12:'Be2 — calm development, eyeing the long-term structural edge.', 14:'O-O — White castles into the safer position.', 16:'Re1 — White centralises with a lasting structural advantage.' },
    learn: { 10:'d4 — build the centre', 12:'Be2 — develop, keep the edge', 14:'O-O — safer king', 16:'Re1 — press the structure' },
  },
  'pro-aman-anti-caro:e4_c6_Nc3_d5_Nf3_Bg4_h3_Bxf3_Qxf3_e6_d4:c5': {
    sources: ['concept:tac-pin','concept:pos-center','https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'],
    watch: { 11:'c5?! — striking the centre while behind in development just opens lines for White’s bishops.', 12:'Bb5+! — the check develops with tempo, exploiting Black’s loose king in the centre.', 13:'Nc6 — Black blocks.', 14:'exd5 — opening the centre while ahead in development.', 16:'Nxd5! — the knight grabs the central pawn, the open lines decisive.', 18:'O-O — White castles with a crushing lead in development.' },
    learn: { 12:'Bb5+ — develop with check', 14:'exd5 — open the centre', 16:'Nxd5 — grab the pawn, dominate', 18:'O-O — finish, crush' },
  },
  'pro-aman-anti-caro:e4_c6_Nc3_d5_Nf3_dxe4_Nxe4_Nf6_Qe2:Nbd7': {
    sources: ['concept:tac-mate','concept:tac-fork','https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
    watch: { 8:'Qe2 — the quiet queen move sets a famous trap: the e4-knight eyes d6 with the queen behind it.', 9:'Nbd7?? — the natural developing move walks into mate; it blocks the king’s escape and allows the fork.', 10:'Nd6# — smothered mate! The knight lands on d6 covering c8 and f7, and the boxed-in king has no flight square.' },
    learn: { 8:'Qe2 — quiet move, hidden trap', 10:'Nd6# — smothered mate' },
  },
  'pro-aman-anti-caro:e4_c6_Nc3_d5_Nf3_Bg4_h3_Bxf3_Qxf3_Nf6_e5:Ng8': {
    sources: ['concept:pos-space','concept:pos-center','https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'],
    watch: { 10:'e5 — gaining space and kicking the f6-knight after Black gave up the bishop pair.', 11:'Ng8?! — the full retreat is passive; the knight undevelops and White seizes the centre.', 12:'d4 — building the big pawn centre with a huge space edge.', 14:'Bd3 — developing the bishop toward the kingside light squares.', 16:'dxc5 — opening lines while ahead.', 18:'Bf4 — White develops with a commanding space advantage.' },
    learn: { 12:'d4 — build the centre', 14:'Bd3 — develop at the king', 16:'dxc5 — open lines ahead', 18:'Bf4 — command the space' },
  },
};

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
const lines = [];
for (const gem of am) {
  const id = `${gem.openingId}:${gem.lineMoves.replace(/\s+/g, '_')}:${gem.inaccuracy}`;
  const p = gem.playLine.trim().split(/\s+/).length;
  const a = A[id];
  if (!a) { console.error('NO AUTHORED ENTRY:', id); process.exit(1); }
  const watch = Array.from({ length: p }, (_, i) => a.watch[i] || '');
  const learn = Array.from({ length: p }, (_, i) => a.learn[i] || '');
  lines.push(`  "${id}": {`);
  lines.push(`    sources: [${a.sources.map((s) => `"${esc(s)}"`).join(',')}],`);
  lines.push(`    watch: [${watch.map((s) => `"${esc(s)}"`).join(',')}],`);
  lines.push(`    learn: [${learn.map((s) => `"${esc(s)}"`).join(',')}],`);
  lines.push('  },');
}
fs.writeFileSync('/tmp/aman-gem-block.txt', lines.join('\n') + '\n');
console.log(`generated ${am.length} entries → /tmp/aman-gem-block.txt`);
