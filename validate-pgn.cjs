const { Chess } = require('chess.js');

function validatePgn(id, pgn) {
  const game = new Chess();
  const moves = pgn.split(/\s+/);
  let ok = true;
  for (let i = 0; i < moves.length; i++) {
    try {
      const result = game.move(moves[i]);
      if (!result) {
        console.log('INVALID: ' + id + ' - move ' + (i+1) + ': ' + moves[i]);
        console.log('  After: ' + moves.slice(0, i).join(' '));
        console.log('  FEN: ' + game.fen());
        console.log('  Legal: ' + game.moves().join(', '));
        ok = false;
        break;
      }
    } catch (e) {
      console.log('INVALID: ' + id + ' - move ' + (i+1) + ': ' + moves[i]);
      console.log('  After: ' + moves.slice(0, i).join(' '));
      console.log('  FEN: ' + game.fen());
      console.log('  Legal: ' + game.moves().join(', '));
      ok = false;
      break;
    }
  }
  if (ok) {
    console.log('OK: ' + id + ' (' + moves.length + ' half-moves)');
  }
  return ok;
}

const extended = {
  // 1. vienna-game (11 -> 22): Both castled. Need remaining development for both.
  // W has: Nc3,Nf3,Bc4; needs Be3, connect rooks. B has: Nf6,Bc5; needs Be6/Bg4, Nbd7, Re8
  'vienna-game': 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 O-O Nf3 d6 O-O Be6 Bb3 Nbd7 Be3 Bxe3 fxe3 Re8 Qd2 Bxb3 axb3 Qe7',

  // 2. vienna-gambit (15 -> 25): Chaotic. After Nxd5, Ng3 threatens Rh1.
  // ...Nxh1 wins exchange, Nxc7+ forks, Nxa8 wins more. Then develop.
  'vienna-gambit': 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 d3 Qh4+ g3 Nxg3 Nf3 Qh5 Nxd5 Nxh1 Nxc7+ Kd8 Nxa8 Bg4 Be2 Nc6 Bf4 Bd6 Bxd6+ Ke8 Qd2',

  // 3. scotch-gambit (18 -> 24): W castled, B not. B has Ne4, Bc5, Bd7.
  // ...O-O Be3 Bxd4 (takes d4 pawn) — wait, after Bxc6 bxc6 O-O Bc5 White has no pawn on d4 (it was captured by exd4 earlier, then Nxd4)
  // Actually: 3.d4 exd4 4.Bc4 Nf6 5.e5 d5 6.Bb5 Ne4 7.Nxd4 Bd7 8.Bxc6 bxc6 9.O-O Bc5
  // White has Nd4, rest undeveloped (Nc3 not yet, no bishop). B: Ne4 on e4, Bd7->gone (Bxc6), Bc5
  // Continue: Be3 O-O Nd2 Nxd2 Qxd2 Bxd4 Bxd4 Be6
  'scotch-gambit': 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5 Be3 O-O Nd2 Nxd2 Qxd2 Bxd4 Bxd4 Be6',

  // 4. bishops-opening (11 -> 22): Both castled at 11. Need remaining development.
  // W: Bc4,Nf3; needs Nbd2, Re1/Bg5. B: Nf6,Bc5; needs Nbd7, Bg4/Be6, Re8
  'bishops-opening': 'e4 e5 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O O-O c3 Nbd7 Bb3 a5 a4 Be6 Bxe6 fxe6 Nbd2 Qe8 Re1 Nh5',

  // 5. evans-gambit (16 -> 24): W castled, B not. B has Nc6, Bb6, Nf6 not developed.
  // W turn. d5 Na5 Bb2(or Bd3 then Nbd2) Ne7 Bd3 O-O Nbd2 Ng6 Qb1 Bd7
  'evans-gambit': 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6 d5 Na5 Bb2 Ne7 Bd3 O-O Nbd2 Ng6 Qb1 Bd7',

  // 6. danish-gambit (15 -> 22): B needs O-O and remaining development.
  // ...O-O Qe2 Bg4 Nd5 Nxd5 Bxd5 Nc6 Rfe1
  // Wait, after O-O (Black) it's White's turn. Qe2 then Bg4. Actually Bg4 pins Nf3.
  // But Nc3 blocks Qe2... no Nc3 is already on c3. Qe2 is legal (Qd1->e2).
  // After Nd5: who plays this? If W plays Nd5 (Nc3->d5), then B plays Nxd5, then Bxd5.
  'danish-gambit': 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d6 Nf3 Nf6 O-O Be7 Nc3 O-O Qe2 Bg4 Nd5 Nxd5 Bxd5 Nc6 Rfe1',

  // 7. two-knights (20 -> 26): Neither castled.
  // W: Be2, Ne5 on e5. B: Na5, Nf6, Bd6. Neither castled.
  // ...exd3? No, there's no e pawn for either side. Wait, e4 was played by Black (move 17: e4).
  // So W: Be2 (on e2), Nf3 went to e5 (move 19). B: Na5, Nf6, Bd6, pawn on e4.
  // W plays d4 exd3 Nxd3 O-O O-O Re8 - but wait, 'e4' pawn for black means exd3 in en passant? No.
  // Let me re-check: after 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6'
  // Black's e4 pawn is on e4. White's Ne5 is on e5.
  // W plays f4 or d4. If d4 then exd3(e.p.) no that's not how e.p. works. d4 is a pawn push, exd3 is B pawn takes d3.
  // Actually if W plays d4, B can play exd3 (e4 pawn captures d3 pawn? But d3 doesn't exist).
  // Actually d4 is d2->d4 (2-square push). Then e4 pawn can't take d3 en passant because the pawn went to d4 not d3.
  // So after d4: Black can't take en passant. exd3 would be e4->d3 which isn't possible (no pawn on d3).
  // Let me try: d4 Qe7 O-O O-O Nc4 (knight repositions)...
  // Actually after Ne5 Bd6, the position has the knight on e5 (powerful), bishop on d6.
  // f4? Legal. f4 exf3 Nxf3... but that weakens White.
  // Better: d4 exd3 — wait, that's e4 pawn taking on d3. d2-d4 push, and e4 can take d3? Only if there was a pawn on d3 to capture. There isn't.
  // d3 pawn push (d2->d3): then exd3 is legal (e4 captures d3). Then Nxd3 (Ne5 takes d3).
  // Let me just try: d3 exd3 Nxd3 O-O O-O Re8 b3 Nc4
  'two-knights': 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d3 exd3 Nxd3 O-O O-O Re8 b3 Nc4',

  // 8. fried-liver-attack (19 -> 26): B can't castle (Ke6). After d4.
  // B: Ke6, Nb4 (from c6), Nd5 (from f6→d5, which was Nxd5), plus Bc8, Bf8, Ra8, Rh8
  // Wait, looking at the board: Nb4 is on b4, Nd5 appears on d5. And W: Bc4, Nc3, Qf3, castled.
  // e-pawn: 1.e4 e5, then 5.exd5 cleared e4 and d5. The pawn went to d5 then was taken by Nxd5.
  // After 10.d4: Black has pawns a7,b7,c6,e5(?),g7,h7. Wait, 1.e4 e5 means e5 is Black's pawn.
  // Then exd5 (5.exd5) took the d5 pawn, but Black's e5 pawn is still there? No! exd5 is White's e4 pawn taking d5 pawn. So e4 square is empty and d5 has White's pawn. Then Nxd5 takes it back.
  // So: Black's e5 pawn is still on e5!
  // After d4: Black can play exd4. Let's check legal moves from my earlier output:
  // Legal: ... e4, exd4, Na6, Nd3, Nxc2, Nxa2
  // Yes exd4 is legal! Great.
  // ...exd4 Nxd5(? N from c3) — wait, which knight? Or just Bg5+?
  // Let me continue: ...exd4 Bg5+ (check!) Kd6 (or Ke7) ... no, Bg5 is a check from Bc1?
  // Actually Bc1 hasn't moved. Wait, W castled O-O, so bishop is still on c1.
  // After O-O c6 d4: W has Qf3, Nc3, Bc4, pawns d4,e(gone),f2,g2,h2,a2,b2,c2
  // If exd4: W could play Nxd5(Nc3→d5?), but Nd5 is occupied by Black's knight!
  // Actually looking at board again: Nd5 is Black's. Nb4 is also Black's (from c6→b4).
  // So after exd4: maybe Rd1(Rf1→d1? no, rook is on f1) or Re1?
  // Better plan: ...Na6 (Nb4→a6, out of danger) Bg5+ Kd7 Bf4
  // Or: ...Kd6 (walking toward safety) Be3 Be7 a3 Na6
  'fried-liver-attack': 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4 O-O c6 d4 exd4 a3 Na6 Nxd5 cxd5 Bxd5+ Kd7 Bf4 Qf6',

  // 9. london-system: REPLACE with proper London main line.
  // Standard: d4 Nf6 Nf3 d5 Bf4 e6 e3 Bd6 Bg3 O-O Bd3 c5 c3 Nc6 Nbd2 Qe7 O-O
  'london-system': 'd4 Nf6 Nf3 d5 Bf4 e6 e3 Bd6 Bg3 O-O Bd3 c5 c3 Nc6 Nbd2 Qe7 O-O e5 dxe5 Nxe5 Bc2 Nxf3+ Nxf3 Be6 Qd3',

  // 10. jobava-london (18 -> 24): B needs O-O. After Re1 Be7 (W turn).
  // Bd3 Bxd3 Qxd3 O-O Rab1 Rc8 a3 Nd7
  'jobava-london': 'd4 Nf6 Nc3 d5 Bf4 c5 e3 a6 Nf3 Nc6 Be2 cxd4 exd4 Bf5 O-O e6 Re1 Be7 Bd3 Bxd3 Qxd3 O-O Rab1 Rc8 a3 Nd7',

  // 11. queens-gambit (18 -> 24): W needs O-O. After Nd5 (B turn).
  // Bxe7 Qxe7 O-O Nxc3 Rxc3 e5 Bb3 exd4
  // Wait, after O-O Nxc3: that's Nd5 takes c3. Then Rxc3 e5 (pawn push).
  'queens-gambit': 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5 Bb3 exd4',

  // 12. kings-indian-attack (15 -> 22): B needs O-O. After Re1 (B turn).
  // ...O-O Nf1 Re8 Ne3 Bh5 h3 dxe4 dxe4 Bc5
  'kings-indian-attack': 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4 d3 Nbd7 Nbd2 e5 e4 Be7 Re1 O-O Nf1 Re8 Ne3 Bh5 h3 dxe4 dxe4 Bc5',

  // 13. trompowsky-attack (18 -> 24): B needs O-O. After O-O Be7 (W turn).
  // Qb3 Qb6 Qxb6 axb6 h3 Bh5 Rfe1 O-O
  'trompowsky-attack': 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 c5 Bd3 Nc6 c3 Nf6 Nf3 Bg4 Nbd2 e6 O-O Be7 Qb3 Qb6 Qxb6 axb6 h3 Bh5 Rfe1 O-O',

  // 14. birds-opening (13 -> 24): Both castled. Both need remaining development.
  // W: Be2,Nf3; needs Na3/Nbd2, Qe1, develop Bc1. B: Nf6,Bg7; needs Nc6, Bf5/Bg4, Re8/Qb6
  // ...Nc6 Na3 Re8 Nc2 Bf5 Qe1 Qc7 Bd2 Rad8 Qh4 e5
  'birds-opening': 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 c3 Nc6 Na3 Re8 Nc2 Bf5 Qe1 Qc7 Bd2 Rad8 Qh4 e5',

  // 15. goring-gambit (15 -> 24): B needs O-O. After Nd5 (B turn).
  // ...Bxc3(Bb4 takes c3... wait, Bb4 is on b4) bxc3 Nxd5 Bxd5(or exd5) O-O
  // Actually after Nd5 the position has: W Nd5, Nf3, Bc4, castled. B: Bb4, Nc6, Nf6.
  // ...Bxc3 bxc3 Nxd5 Bxd5 O-O Ba3 Be6 Bxe6 fxe6 Qb3 Qe7
  'goring-gambit': 'e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 Bb4 Bc4 d6 O-O Nf6 Nd5 Bxc3 bxc3 Nxd5 Bxd5 O-O Ba3 Be6 Bxe6 fxe6 Qb3 Qe7',

  // 16. sicilian-dragon (17 -> 22): W needs O-O-O (Yugoslav). After Bc4 (B turn).
  // ...Bd7 O-O-O Rc8 Bb3 Ne5 Kb1
  'sicilian-dragon': 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 Kb1',

  // 17. caro-kann (24 -> 26): B needs O-O. After Be7 (W turn).
  // Kb1 O-O Ne4 Nxe4 Qxe4 Nf6 Qe2
  // Actually this is 24 + more. Let's just add O-O and a couple more.
  'caro-kann': 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7 Kb1 O-O Ne4 Nxe4 Qxe4',

  // 18. french-defence (19 -> 26): W needs O-O. After Qg3 (B turn).
  // ...Qc7 O-O c4 Be2 Bd7 Ng5 Rf6 Nh3 Nd8
  'french-defence': 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O Nf3 Nbc6 Bd3 f5 Qg3 Qc7 O-O c4 Be2 Bd7 Ng5 Rf6 Nh3',

  // 19. scandinavian-defence (18 -> 24): B needs O-O. After O-O-O Nbd7 (W turn).
  // d5 Bxc3 Bxc3 Qc5 Bb3 O-O dxe6 fxe6 Rhe1
  // Wait after d5 the Bb4 is still there. Let me check: B has Bb4, Nf6, Bf5, Nbd7.
  // d5: pushes past. Then ...Bxc3 Bxc3 Qc5 (Qa5->c5?)
  // Actually Qa5 is on a5. After d5: Black can play ...O-O directly!
  // But is O-O legal? Black has Bb4 and other pieces, king is on e8... Let me check.
  // After O-O-O Nbd7: position has B king on e8, Bb4, Nf6, Bf5, Nbd7. O-O should be legal if path is clear: f8 and g8 must be empty. Bf8 is gone (it's on b4 since Bb4 earlier... wait, Bb4 was on a5 originally (Ba5→b4). Actually no: Ba5 d4 ... Bb4 means the a5 bishop went to b4. Then Bxc3 takes on c3.
  // The dark-squared bishop started on f8, went to b4 at move 9 (...Bb4). So f8 is empty. g8 is empty.
  // So O-O is legal for Black after the pieces moved away.
  // Let's try: d5 O-O dxe6 fxe6 (or Nxe6? No that's not a legal capture. Actually dxe6 is a pawn capture on e6. But d5 pawn capturing e6 pawn? e6 is Black's pawn. d5->e6 capture. Yes that's legal.)
  // Actually wait: d5 pushes the d4 pawn to d5. Then O-O (Black castles). dxe6? d5 pawn takes e6 pawn (d5xe6). But can White capture en passant? No, e6 wasn't a 2-square push. But d5xe6 is a regular capture if there's a pawn on e6 (there is - Black played ...e6 earlier). So dxe6 is illegal because the d5 pawn can't reach e6... wait, d5 to e6 is a diagonal capture, which is legal if there's an enemy piece on e6. There IS a black pawn on e6! So dxe6 is legal.
  // Hmm but then fxe6 (f7 takes e6? No, Black's f pawn... Black has Nf6 so the f-file pawn could be on f7. fxe6 would be f7->e6.)
  // Actually let me think again. After O-O-O Nbd7, W plays d5. Then...
  // d5 O-O and now White has dxe6 or other options.
  // Simpler: d5 O-O Nd4 Qd8 (retreat) dxe6 fxe6 (legal)
  // Or simpler approach:
  'scandinavian-defence': 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6 Qe2 Bb4 O-O-O Nbd7 d5 O-O dxe6 fxe6 Nd4 Bg6 Rhe1',

  // 20. nimzo-indian (19 -> 24): W needs O-O. After e3 (B turn).
  // ...Nbd7 Be2 c5 O-O Rc8 Rfd1 Qe7
  'nimzo-indian': 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Bb7 e3 Nbd7 Be2 c5 O-O Rc8 Rfd1 Qe7',

  // 21. grunfeld-defence (19 -> 26): W needs to castle. After Rc1 (B turn).
  // ...Rd8 Be2 cxd4 cxd4 Qa3 O-O Nc6 d5 Na5
  'grunfeld-defence': 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Qa5 Qd2 O-O Rc1 Rd8 Be2 cxd4 cxd4 Qa3 O-O Nc6 d5 Na5',

  // 22. dutch-defence (15 -> 24): Both castled. Both need remaining development.
  // W: Nf3,Bg2,Bb2; needs Nbd2/Nc3, Qc2/Qd3, Rfd1. B: Nf6,Be7; needs Nbd7, Qe8/Qd7, Re8/Rf7
  // ...Nbd7 Nc3 Ne4 Qc2 Ndf6 Rfd1 Bd7 Ne5 Be8 Nd3
  'dutch-defence': 'd4 f5 c4 Nf6 g3 e6 Bg2 Be7 Nf3 O-O O-O d5 b3 c6 Bb2 Nbd7 Nc3 Ne4 Qc2 Ndf6 Rfd1 Bd7 Ne5 Be8 Nd3',

  // 23. budapest-gambit (22 -> 26): W needs O-O. After d6 (W turn).
  // O-O Bf5 Rfd1 Rfe8 Rac1 Rad8
  'budapest-gambit': 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 Nxe5 Nxe5 e3 Bxd2+ Qxd2 O-O Be2 d6 O-O Bf5 Rfd1 Rfe8 Rac1 Rad8',

  // 24. benko-gambit (21 -> 26): W castled by hand. B needs Nbd7, Qa5/Qb6, Rfb8.
  // ...Nbd7 Re1 Qa5 h3 Rfb8 Be2 Nb6
  'benko-gambit': 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2 Nbd7 Re1 Qa5 h3 Rfb8 Be2 Nb6',

  // 25. old-indian-defence (15 -> 26): Both castled. Both need remaining development.
  // W: Nc3,Nf3,Be2; needs to develop Bc1, connect rooks. B: Nf6,Nbd7,Be7; needs Bc8 development.
  // ...Nc5 Nd2 a5 Rb1 Bd7 b3 Ne8 f4 Bg5 Nf3 Bxc1 Qxc1
  'old-indian-defence': 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6 d5 Nc5 Nd2 a5 Rb1 Bd7 b3 Ne8 f4 Bg5 Nf3 Bxc1 Qxc1',

  // 26. owens-defence (15 -> 24): Both castled. Both need remaining development.
  // W: Nc3,Nf3,Bd3,Bg5; needs Rad1, connect rooks. B: Bb7,Nf6,Bb4; needs Nbd7, Qe7/Qd7
  // ...Nbd7 Rad1 Bxc3 bxc3 h6 Bh4 e5 d5 Nc5 Bc4 a5
  'owens-defence': 'e4 b6 d4 Bb7 Nc3 e6 Nf3 Bb4 Bd3 Nf6 O-O O-O Bg5 d6 Qe2 Nbd7 Rad1 Bxc3 bxc3 h6 Bh4 e5 d5 Nc5 Bc4 a5',

  // VARIATIONS
  // vienna-falkbeer (9 -> 22): After Nxd4, Scotch-like. Both need to develop and castle.
  // ...Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Qf3 Be7 Rfe1 Be6
  'vienna-falkbeer': 'e4 e5 Nc3 Nf6 Nf3 Nc6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O Bg5 c6 Qf3 Be7 Rfe1 Be6',

  // danish-declined (9 -> 22): After cxd4, IQP position. Both need development.
  // ...Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3 Qc4 (or Qd7) O-O Nf6 d5 Bxc3 bxc3 Ne5 Be2 Qd4 Qxd4 Nxd4
  // Hmm complex. Let me simplify:
  // ...Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3 Qd7 O-O Nf6 d5 Ne5 Be2 O-O Re1 Rfe8
  'danish-declined': 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+ Nc3 Bxf3 Bxf3 Qd7 O-O Nf6 d5 Ne5 Be2 O-O',

  // reti-d4-advance (9 -> 20): After c5, unusual position. Both need development.
  // W: Nf3; needs to develop everything else. B: pawns on d4,e5,f6; needs to develop everything.
  // ...a5 bxa5 Bd7 Bb5 Ne7 O-O Ng6 d3 Bxb5... hmm exd4 first?
  // Actually position is very closed/unusual. Let me try:
  // ...Ne7 exd4 exd4 Bb5+ Nec6 O-O Be7 d3 O-O Nbd2 Nd7
  'reti-d4-advance': 'Nf3 d5 c4 d4 b4 f6 e3 e5 c5 Ne7 exd4 exd4 Bb5+ Nec6 O-O Be7 d3 O-O Nbd2 Nd7 Re1 a5',
};

let allOk = true;
for (const [id, pgn] of Object.entries(extended)) {
  const ok = validatePgn(id, pgn);
  if (!ok) allOk = false;
}

if (allOk) {
  console.log('\nAll ' + Object.keys(extended).length + ' lines validated successfully!');
} else {
  console.log('\nSome lines failed validation.');
}
