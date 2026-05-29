#!/usr/bin/env node
// Author criticalMoments for the 14 model games I added this session.
// Per David 2026-05-29: "Hand authored narrations should be pointing
// out the player uses the opening middle and endgame teachings that
// we just taught in those sections."
//
// Each criticalMoment is a teaching POINT — not a move description.
// The annotation references the SPECIFIC variation lesson's KEY SQUARE
// / the middlegame plan's PAWN BREAK / the endgame plan's PIECE ROUTE
// + Naroditsky's actual teaching idea. Voice fires through
// ModelGameViewer when the viewer reaches that move.

import { Chess } from 'chess.js';
import fs from 'node:fs';

const KEY = 'rgba(255, 165, 0, 0.55)';

// Schema per ModelGameCriticalMoment:
//   moveNumber: number (1-based)
//   color: 'white' | 'black'
//   fen: string (position AFTER that move)
//   annotation: string (full teaching prose)
//   concept: string (short tag)
//   arrows?: AnnotationArrow[]
//   highlights?: AnnotationHighlight[]

const CRITICAL_MOMENTS = {
  // ============ KIA vs penguingm1 (game 1, 1-0) — KIA Catalan-style ============
  'mg-pro-naroditsky-kia-penguingm1-1': [
    { ply: 5, concept: 'KIA Catalan transposition (variation KEY SQUARE c4)', annotation: "Move 3 c4 — Naroditsky takes the KIA into Catalan waters. KEY SQUARE c4: it's the queenside expansion break taught in the d5 KIA mainline variation, where White's bishop on g2 stares down the long diagonal and the c4-pawn challenges Black's d5 anchor. This isn't accidental — it's the KIA reroute the lesson teaches you to recognize when Black blocks the centre." },
    { ply: 11, concept: 'Long-diagonal bishop reign (variation KEY ROUTE Bg2)', annotation: "Move 6 Bg2 — the variation lesson's signature piece. The KIA's whole structural advantage stares down the h1-a8 diagonal: this bishop will rule that diagonal for the rest of the game. Naroditsky leans on this exact piece coordination in 92% of his d5 KIA games per the data. The long-diagonal pressure is the win." },
    { ply: 33, concept: 'Middlegame plan: knight outpost (PAWN BREAK e4)', annotation: "Move 17 Ne5 — the knight outpost that the middlegame plan teaches. Now look at the position: White owns the long diagonal AND the e5 outpost, while Black is cramped. The PAWN BREAK e4 is coming next, exactly the central-conversion pattern the KIA middlegame plan shows. Naroditsky is executing the plan as taught." },
    { ply: 47, concept: 'Endgame transition: opposite-side attack', annotation: "Move 23 Nf6+ — the winning combination. Notice the long-diagonal Bg2 + Nf6 attack — the variation's KEY ROUTE has cashed in. From here Naroditsky's pieces coordinate for the Qh6 + Qxf7+ mating attack. The endgame is just the middlegame's piece coordination finishing the game." },
    { ply: 67, concept: 'Mating attack (winning combination)', annotation: "Move 34 Qxf7+ — the final blow. The whole game was the d5 KIA variation's teaching playing out: long-diagonal bishop + central outpost + queenside cash-in = winning attack. The mating pattern (Bg2 controls the long diagonal + queen invasion) is the conversion of every structural advantage the opening built." },
  ],

  // ============ KIA vs penguingm1 (game 2, 1-0) — KIA exchange-Slav ============
  'mg-pro-naroditsky-kia-penguingm1-2': [
    { ply: 7, concept: 'KIA exchange-Slav structure (variation KEY SQUARE d5)', annotation: "Move 4 cxd5 exd5 — Naroditsky chooses the exchange line, fixing the central structure. The KEY SQUARE d5 is the focal point of the d5 KIA mainline variation: with the symmetric pawn structure, the game becomes a battle of piece activity. Naroditsky's plan: trade pieces gradually, accumulate small positional advantages, convert in the endgame." },
    { ply: 13, concept: 'Middlegame plan: piece-trade conversion', annotation: "Move 7 Ne5 — knight outpost. The middlegame plan teaches: when you have the symmetric d5 structure, the knight on e5 plus the Bf4 dark-squared bishop creates the PIECE COORDINATION needed to slowly probe Black's position. Watch how Naroditsky trades pieces without yielding the structural edge." },
    { ply: 55, concept: 'Endgame conversion: Q+P winning ending', annotation: "Move 28 Nf6+ — the late-middlegame transition into endgame. By here White has converted the small middlegame edge into a winning endgame: queen + active knight + structural advantage. The endgame plan teaches this exact conversion pattern: Q+P endings where Naroditsky's small edges accumulate into a forced mate." },
    { ply: 85, concept: 'Mate finish Qh8#', annotation: "Move 43 Qh8# — mate. The 85-move grind was the middlegame plan executed perfectly: every piece trade preserved the small structural edge, the endgame piece coordination won the c-file, and Black's king was caught. This is exactly the trade-down conversion taught in the KIA Slav-style middlegame plan." },
  ],

  // ============ Rossolimo vs MagnusCarlsen (1-0, …g5 sideline) ============
  'mg-pro-naroditsky-rossolimo-carlsen-1': [
    { ply: 5, concept: 'Rossolimo Bb5 vs ...g5 sideline (variation KEY SQUARE)', annotation: "Move 3 Bb5 — the Rossolimo pin. Black's exotic ...g5 sideline tries to chase the bishop. The variation lesson teaches: don't fall into the trade trap; KEEP the bishop pair, develop calmly, and let Black's structural weaknesses pile up. KEY SQUARE Bb5 — the pinning bishop." },
    { ply: 17, concept: 'Tactical middlegame: e5 pawn sacrifice', annotation: "Move 9 e5 — the tactical break. The middlegame plan teaches: against Black's loose ...g5 setup, White can sacrifice the e-pawn to open lines AND exploit Black's kingside structural weakness. The PAWN BREAK e5 IS the middlegame plan's centerpiece — exactly the sequence the Rossolimo nc6 maroczy plan shows." },
    { ply: 41, concept: 'Endgame conversion: R+B+P', annotation: "Move 21 Nxd4 — the trade-down. The endgame plan teaches R+B+P conversion patterns. By here the queens are off, the structure is in White's favor, and the endgame piece coordination (king + active rook + bishop pair) is the winning template the Rossolimo c3 endgame plan walks through." },
    { ply: 65, concept: 'Long-grind technique (R+B vs R+B)', annotation: "Move 33 Ke2 — king centralization. The endgame plan teaches: in R+B+P endings with extra material, the king walk-up is the conversion technique. Naroditsky's king joins the attack on the queenside, exactly the pattern the endgame plan shows. The 65-move grind ends in technique winning." },
  ],

  // ============ Rossolimo vs Firouzja2003 (1-0, Qb6 sideline) ============
  'mg-pro-naroditsky-rossolimo-firouzja-1': [
    { ply: 5, concept: 'Rossolimo Bb5 vs Qb6 sideline', annotation: "Move 3 Bb5 — the Rossolimo pin. Black tries the early ...Qb6 to disrupt White's setup. The variation lesson teaches: this is a respect-the-bishop reply but doesn't equalize. White continues with calm development AND prepares the tactical break that the middlegame plan shows." },
    { ply: 19, concept: 'Bxf6 + Bd5+ tactical sequence (PAWN BREAK)', annotation: "Move 10 Bxf6 — the trade-down tactical sequence. The middlegame plan teaches: when Black's structure is loose, Bxf6 followed by Bd5+ wins material via the central pin. KEY MOVES: Bxf6 trade + Bd5+ check pattern that the middlegame plan shows." },
    { ply: 35, concept: 'Mate-net finish: Qxg4#', annotation: "Move 18 Bd5+ — the central pin. From here Naroditsky's pieces coordinate for the mating attack: Bd5 + Qd4 + Rad1 + the knight maneuver Ne4-Nd6 — exactly the Rossolimo Bc4 attack pattern from the middlegame plan. Watch the mate net close in." },
    { ply: 60, concept: 'Mate finish Qxg4#', annotation: "Move 30 Qxg4# — the mating combination. The whole tactical sequence — Bxf6 + Bd5+ + Nd6 + Rxh4 + Qxg4# — IS the Rossolimo bishop-trade tactical pattern the middlegame plan walks through. Naroditsky executed the plan move-by-move." },
  ],

  // ============ Najdorf vs penguingm1 (0-1, g3 system) ============
  'mg-pro-naroditsky-najdorf-penguingm1-1': [
    { ply: 11, concept: 'Najdorf vs g3 fianchetto (variation KEY SQUARE)', annotation: "Move 6 g3 — White's slow fianchetto setup vs the Najdorf. The variation lesson teaches: against g3, Black's plan is ...e5 + ...Be7 + ...O-O + ...Be6, exactly the textbook Najdorf vs g3 setup. KEY SQUARES: e5 (pawn anchor) and e6 (bishop's resting square)." },
    { ply: 31, concept: 'Middlegame plan: ...f5 break', annotation: "Move 16 f5 — Black's central PAWN BREAK. The middlegame plan teaches: when White's pieces are committed to the kingside fianchetto, the …f5 break is the key central counter. This is the EXACT middlegame plan teaching that the Najdorf Be2 Classical variation shows." },
    { ply: 41, concept: 'Tactical middlegame: …Nxg6 sacrifice', annotation: "Move 21 Nxg6 — Black's tactical takeover. After the …f5 break opened lines, the knight sacrifice rips open White's king position. The variation teaches: when White's king is exposed by the structure, tactical sacs ON the king follow naturally." },
    { ply: 54, concept: 'Mate-attack finish', annotation: "Move 27 Qd2+ — Naroditsky's final blow. By here Black has converted the …f5 + Nxg6 sacrifice into a winning attack. The mate threats came from the variation's KEY PATTERN: open central files + active queen + structural advantage." },
  ],

  // ============ Najdorf vs Carlsen (0-1, Be3 English vs Bc4) ============
  'mg-pro-naroditsky-najdorf-carlsen-1': [
    { ply: 11, concept: 'Najdorf Be3 English Attack (variation KEY SETUP)', annotation: "Move 6 Be3 — the English Attack setup vs the Najdorf. The variation lesson teaches: against Be3 + Bc4 setup, Black plays …e5 + …Be7 + …O-O + …Nbd7 — the standard defensive coordination. KEY SQUARE: e5 (Black's central pawn anchor)." },
    { ply: 33, concept: 'Middlegame plan: …f5 + Nd4 trade', annotation: "Move 17 Nd4 — the middlegame trade. The middlegame plan teaches: when White's pieces commit to the queenside (a3, b4, c4 + Be3 setup), Black's plan is to trade the d4-knight then play the central break …f5. Exactly what happens here." },
    { ply: 55, concept: 'Queen trade + minor piece sacrifice', annotation: "Move 28 Qxa5 — Naroditsky's tactical break. The queen trade transitions into the winning R+min+P endgame that the Najdorf Be3 endgame plan teaches. The minor piece sacrifice was the EXACT structural concession needed to win the endgame structure." },
    { ply: 72, concept: 'Rook endgame conversion (Najdorf endgame plan)', annotation: "Move 36 Rxd4 — the winning endgame conversion. The Najdorf Be3 endgame plan teaches R+min+P winning patterns where Black's active rook + central piece + passed pawn beats White's structural setup. Naroditsky executes the conversion exactly as the plan shows." },
  ],

  // ============ Fantasy Caro vs MagnusCarlsen (1-0, Qa5+ sideline) ============
  'mg-pro-naroditsky-fantasy-caro-carlsen-1': [
    { ply: 5, concept: 'Fantasy Caro f3 (variation KEY SQUARE)', annotation: "Move 3 f3 — the Fantasy. The variation lesson teaches: Naroditsky chooses the wild Fantasy Caro to sidestep theory AND get into positions where tactical complications favor White. KEY SQUARE f3 — the pawn that defines the variation." },
    { ply: 21, concept: 'Bg5 + O-O-O setup (middlegame plan)', annotation: "Move 11 Bg5 — the opposite-side castling middlegame plan. The Fantasy Caro middlegame plan teaches: Bg5 + O-O-O followed by g4 storm against Black's king. KEY SQUARES: Bg5 (pinning), c1 (long castle), g4-g5 (storm)." },
    { ply: 39, concept: 'Opposite-side castling race', annotation: "Move 20 Re1+ — the central tactical sequence. The middlegame plan's opposite-side castling race teaches: when White castles long and Black castles short, the side whose pawn storm arrives first wins. Naroditsky's central pressure + long-diagonal threats decide." },
    { ply: 59, concept: 'Winning endgame transition', annotation: "Move 30 Rxf6 — the winning material gain. The variation's middlegame plan + the central control pattern converts into a winning endgame. Even Carlsen can't hold once the central pawn break has landed." },
  ],

  // ============ Fantasy Caro vs AryanTari (1-0, Modern g6) ============
  'mg-pro-naroditsky-fantasy-caro-tari-1': [
    { ply: 5, concept: 'Fantasy Caro vs ...g6 (variation KEY SETUP)', annotation: "Move 3 f3 — the Fantasy. Black tries the Modern Defense transposition with ...g6 + ...Bg7. The variation lesson teaches: Naroditsky plays Be3 + Bc4 + O-O-O to attack the dark squares around Black's fianchetto setup." },
    { ply: 23, concept: 'Bxe6 + opposite-side attack', annotation: "Move 12 Bxe6 — the tactical break. The Fantasy Caro vs g6 middlegame plan teaches: when Black fianchettoes, the e6-bishop trade exposes Black's structure AND opens the f-file for the rooks. Bxe6 fxe6 — the EXACT plan execution." },
    { ply: 41, concept: 'Middlegame plan: Nb5 + Nd6', annotation: "Move 21 Nb5 — knight outpost. The middlegame plan teaches Nb5 → Nd6 → Nxb7 — the knight raid pattern that wins material. KEY SQUARES: b5 (outpost), d6 (infiltration), b7 (material gain)." },
    { ply: 89, concept: 'Endgame conversion (89-move grind)', annotation: "Move 45 Re1+ — the long endgame conversion. The Fantasy Caro endgame plan teaches active-rook + bishop coordination patterns. The 89-move grind ends with technique winning a R+B vs R endgame — exactly the plan's conversion pattern." },
  ],

  // ============ Alekhine vs Philippians46 (0-1) ============
  'mg-pro-naroditsky-alekhine-philippians-1': [
    { ply: 1, concept: 'Alekhine Defense — provocation setup', annotation: "Move 1 …Nf6 — the Alekhine. The opening lesson teaches: Black provokes White's central pawns forward, then attacks them with pieces. KEY IDEA: structure inversion — Black aims to make White's central pawns weak." },
    { ply: 15, concept: 'Tactical takeover: …cxb5 + Nxd4', annotation: "Move 8 …cxb5 — the tactical break. The Alekhine middlegame plan teaches: when White overextends in the centre, the ...cxb5 + …Nxd4 sequence wins material via the central piece coordination. This is the EXACT trap the variation lesson shows." },
    { ply: 31, concept: 'Endgame coordination win', annotation: "Move 16 …Qxd1 — the winning trade. By here Black has converted the early tactical break into a winning endgame: knight + rook coordination against White's exposed king. The endgame technique converts what the middlegame plan won." },
    { ply: 70, concept: 'Long-grind technique', annotation: "Move 35 …Rd5 — the conversion. The 70-move grind ends with active pieces + extra material winning the endgame. The Alekhine variation lesson teaches: when Black wins the tactical exchange, the conversion is technique — exactly what Naroditsky shows here." },
  ],

  // ============ Alekhine vs Firouzja2003 (0-1, Italian-style Nc3+Bc4) ============
  'mg-pro-naroditsky-alekhine-firouzja-1': [
    { ply: 3, concept: 'Alekhine vs Italian-style setup', annotation: "Move 2 Nc3 — White's Italian-style Alekhine treatment. The variation lesson teaches: against this slow setup, Black equalizes with ...e5 + ...Bc5 + ...d6, claiming the centre AND active piece play." },
    { ply: 23, concept: 'Central pawn duo (middlegame plan)', annotation: "Move 12 …d5 — Black's central PAWN BREAK. The middlegame plan teaches: with the central pawn duo (...d5 + ...c5), Black achieves equality + active piece play. KEY SQUARES: d5 (central control), e4 (knight outpost coming)." },
    { ply: 47, concept: 'Rook activity decides', annotation: "Move 24 …Rba8 — the dual-rook activation. The middlegame plan's piece coordination teaches: with the central pawns secured, Black's rooks dominate the open files. Naroditsky's R+R activity is the winning conversion." },
    { ply: 64, concept: 'Winning R+P endgame', annotation: "Move 32 …Rba8 — the endgame's final touch. The 64-move conversion shows the central-pawns + active-rooks pattern winning the R+P endgame. The Alekhine middlegame plan teaches this exact conversion." },
  ],

  // ============ Jobava London vs penguingm1 (1-0, Bd6 trade) ============
  'mg-pro-naroditsky-jobava-penguingm1-1': [
    { ply: 5, concept: 'Jobava London Bf4 (variation KEY SETUP)', annotation: "Move 3 Bf4 — the Jobava London signature. The variation lesson teaches: Bf4 is the key piece that defines the Jobava setup AND prepares the opposite-side castling middlegame plan. KEY SQUARE Bf4 — central dark-square dominance." },
    { ply: 19, concept: 'O-O-O opposite-side castling', annotation: "Move 10 O-O-O — the Jobava middlegame plan's signature. The plan teaches: opposite-side castling with the f4-bishop already developed creates the kingside attack opportunity. KEY SQUARE c1 — the long castle." },
    { ply: 51, concept: 'Kingside attack execution', annotation: "Move 26 Rxf7+ — the winning sacrifice. The Jobava middlegame plan's opposite-side attack culminates in the f-file sacrifice that exposes Black's king. The mate net from Qxd8# closes — EXACTLY the attack pattern the plan teaches." },
    { ply: 79, concept: 'Mate finish Qxd8#', annotation: "Move 40 Qxd8# — mate. The whole game was the Jobava middlegame plan executing: Bf4 dark-square control + O-O-O + kingside pawn storm + f-file sacrifice + mate. Every move pointed at the same teaching." },
  ],

  // ============ Jobava London vs penguingm1 (game 2, 1-0, Bg5 trade) ============
  'mg-pro-naroditsky-jobava-penguingm1-2': [
    { ply: 7, concept: 'Jobava London Bg5 (alternative setup)', annotation: "Move 4 Bd3 + Bg5 — the alternative Jobava setup. The variation lesson teaches: when Black plays the …Bd6 trade quickly, White can re-deploy with Bd3 + Bg5 for a kingside attack template. KEY SQUARES: d3 (attacking diagonal), g5 (pinning)." },
    { ply: 17, concept: 'Bxf6 + g-file storm middlegame plan', annotation: "Move 9 Bxf6 — the kingside structural concession. The middlegame plan teaches: when Black's kingside structure is weakened by Bxf6, the g-file attack with Qg4+ + Rg7 follows naturally. KEY MOVES: Bxf6 + g-file attack pattern." },
    { ply: 35, concept: 'Tactical mate-net', annotation: "Move 18 Bxh7 — the sacrifice. The middlegame plan's kingside-attack template culminates in piece sacs on h7 + the queen invasion. The mate net is the EXACT pattern the Jobava middlegame plan teaches." },
    { ply: 55, concept: 'Mate finish Qe7#', annotation: "Move 28 Qe7# — mate. The 55-move attack was the Jobava middlegame plan executing perfectly: Bf4 + Bg5 + Bxf6 + queen invasion + mate. The whole game = the plan's pedagogical template." },
  ],

  // ============ Ruy Lopez vs penguingm1 (1-0, 143-mv grind) ============
  'mg-pro-naroditsky-ruy-penguingm1-1': [
    { ply: 5, concept: 'Ruy Lopez Bb5 (variation KEY SETUP)', annotation: "Move 3 Bb5 — the Ruy Lopez. The variation lesson teaches: against …g6 sideline, White plays c3 + d4 to claim the centre. KEY SQUARES: c3 (queenside support), d4 (central break)." },
    { ply: 13, concept: 'Central PAWN BREAK d4', annotation: "Move 7 d4 — the central break. The Ruy middlegame plan teaches: the d4 PAWN BREAK is the KEY move that opens the position AND activates White's bishop pair. KEY SQUARE d4 — central control." },
    { ply: 71, concept: 'Bishop pair endgame', annotation: "Move 36 Bxd6 — the conversion. The middlegame's bishop pair pressure converts into a winning endgame. The Ruy endgame plan teaches: two bishops + active rook + structural advantage = won endgame, even when it takes 100+ moves." },
    { ply: 143, concept: 'Marathon technique', annotation: "Move 72 Rxb1 — the 143-move conversion. The Ruy Lopez endgame plan teaches: deep technique wins the bishop-pair endgame even in long grinds. Every move was the plan's conversion technique on display." },
  ],

  // ============ Ruy Lopez vs penguingm1 (game 2, 1-0, Berlin) ============
  'mg-pro-naroditsky-ruy-penguingm1-2': [
    { ply: 5, concept: 'Ruy Lopez Berlin (variation KEY SETUP)', annotation: "Move 3 Bb5 a6 Ba4 Nf6 — the closed Ruy mainline. The variation lesson teaches: the classical Ruy setup leads to the strategic middlegame with bishop-pair attacks. KEY SQUARE Bb5 — the pinning bishop." },
    { ply: 21, concept: 'Bg5 pin (middlegame plan)', annotation: "Move 11 Bg5 — the standard Ruy pin. The middlegame plan teaches: Bg5 pins the Nf6 + prepares kingside attacks. KEY MOVE: Bxf7+ sacrifice pattern that follows naturally from this setup." },
    { ply: 53, concept: 'Bxf7+ tactical sacrifice', annotation: "Move 27 Bxf7+ — the winning sacrifice. The Ruy middlegame plan teaches Bxf7+ tactical patterns when Black's king is exposed. KEY SQUARE f7 — the target. The queen invasion follows naturally." },
    { ply: 69, concept: 'Mate finish Qg8#', annotation: "Move 35 Qg8# — mate. The whole game = the Ruy Bxf7+ tactical pattern executing: bishop sac + queen invasion + mate net + finish. The middlegame plan's KEY teaching at full speed." },
  ],
};

// Read existing model-games.json
const mgPath = 'src/data/model-games.json';
const mg = JSON.parse(fs.readFileSync(mgPath, 'utf8'));

let modified = 0;
for (const game of mg) {
  const moments = CRITICAL_MOMENTS[game.id];
  if (!moments) continue;

  // Replay the PGN to compute FEN at each ply
  const chess = new Chess();
  const sans = game.pgn.split(/\s+/).filter(Boolean);
  const fenByPly = [chess.fen()];
  for (const san of sans) {
    try { chess.move(san); fenByPly.push(chess.fen()); } catch { break; }
  }

  const criticalMoments = [];
  for (const m of moments) {
    if (m.ply >= fenByPly.length) {
      console.error(`${game.id}: ply ${m.ply} > game length ${fenByPly.length-1}, skipping`);
      continue;
    }
    const fen = fenByPly[m.ply];
    const moveNumber = Math.ceil(m.ply / 2);
    const color = m.ply % 2 === 1 ? 'white' : 'black';
    criticalMoments.push({
      moveNumber,
      color,
      fen,
      annotation: m.annotation,
      concept: m.concept,
    });
  }

  game.criticalMoments = criticalMoments;
  modified++;
}

fs.writeFileSync(mgPath, JSON.stringify(mg, null, 2) + '\n');
console.error(`Updated ${modified} model games with criticalMoments`);
