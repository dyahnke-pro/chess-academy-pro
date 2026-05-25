// Hand-authored Learn short cues for masterclass plan playableLines (one ≤8-word
// cue per move, echoing the verified full annotation). Applied by
// scripts/add-plan-shortcues.mjs — already-applied batches stay in the JSON.
export const patches = {
  'mp-scotchgame-main#0': ['Nxc6 — trade to damage the pawns', 'Nxc6 — recapture', 'Bxc5 — remove the bishop pair', 'dxc5 — doubled c-pawns', 'f4 — kingside space, prep f5', 'Be6 — develop, offer a trade', 'Bb5 — pin the c6-knight', 'Rad8 — centralise; better structure'],
  'mp-scotchgame-mieses#0': ['Nd5 — strong central square', 'c4 — kick the knight, clamp', 'Ba6 — pin, pressure c4', 'b3 — prop c4, prepare Ba3', 'g6 — prepare the fianchetto', 'Ba3 — spear the e7-queen', 'd6 — strike e5, free the game'],
  'mp-scotchgame-gambit#0': ['Bd7 — unpin the c6-knight', 'Bxc6 — inflict doubled pawns', 'bxc6 — recapture, compromised', 'O-O — king to safety', 'Bc5 — develop, hit d4', 'Be3 — defend, offer a trade', 'Bxd4 — trade; better structure'],
  'mp-scotchgame-fourknights#0': ['Bg5 — pin, lean on d5', 'c6 — brace the d5-pawn', 'Ne2 — reroute the knight', 'Bd6 — eye the kingside', 'Ng3 — pressure f5', 'h6 — luft; probe d5'],
  'mp-scotchgame-kasparov#0': ['Bxe3 — trade the dark bishops', 'Qxe3 — recapture, eye the kingside', 'O-O — castle into the storm', 'O-O-O — castle long, eye d6', 'Be6 — challenge the c5 outpost', 'f3 — anchor e4, prep g4-g5'],
  'mp-scotchgame-steinitz#0': ['O-O — king safe; Black stuck on d8', 'Bxd2 — trade the dark bishops', 'Nxd2 — recapture; the c7-fork looms', 'Qg6 — the overworked queen retreats', 'Nf3 — toward e5 and g5', 'Nf6 — Black finally develops'],
  'mp-siciliandragon-main#0': ['Rc8 — seize the c-file', 'Bb3 — tuck off the c-file', 'Ne5 — head for c4', 'h4 — start the kingside storm', 'Nc4 — leap in, hit the queen', 'Bxc4 — trade the strong knight', 'Rxc4 — pressure down the c-file'],
  'mp-siciliandragon-soltis#0': ['h4 — intend h5 to crack the king', 'h5 — slam the door, freeze it', 'Kb1 — tuck the king and wait', 'Nc4 — switch to the queenside', 'Bxc4 — trade the strong knight', 'Rxc4 — pour down the c-file'],
  'mp-siciliandragon-chinese#0': ['b5 — the b-pawn charges', 'h4 — White races the other wing', 'b4 — hit Nc3, open the b-file', 'Nd5 — jump in, not retreat', 'Nxd5 — trade it off', 'Bxd5 — the b-file stands open'],
  'mp-siciliandragon-classical#0': ['f4 — grab kingside space', 'Na5 — head for c4', 'f5 — push on, hit the bishop', 'Bc4 — trade White’s good bishop', 'Bxc4 — recapture', 'Nxc4 — comfortably equal'],
  'mp-siciliandragon-levenfish#0': ['Qe1 — reroute toward the kingside', 'Nc5 — active post, hits e4', 'Be2 — preserve the light bishop', 'b5 — queenside expansion', 'Qh4 — eye the kingside', 'b4 — hit Nc3; fully equal'],
  'mp-siciliandragon-accelerated#0': ['Qd2 — consolidate the bind', 'Bc6 — target e4 on the long diagonal', 'f3 — prop up e4', 'a5 — queenside space, eye a4', 'b3 — restrain the a-pawn', 'Nd7 — reroute toward c5'],
  'mp-siciliandragon-antibg5#0': ['a6 — prepare …b5', 'O-O-O — White commits queenside', 'Nge5 — return to e5', 'h4 — gesture at the kingside', 'b5 — the queenside attack rolls', 'Kb1 — tuck as Black charges'],
  'mp-carokann-main#0': ['Rhe1 — swing the rook centrally', 'c5 — the thematic break', 'dxc5 — accept', 'Nxc5 — recapture, hit the queen'],
  'mp-carokann-advance#0': ['c3 — shore the queenside', 'Bd6 — train on the e5-pawn', 'Bf4 — defend e5', 'Qe7 — besiege e5, the easier game'],
  'mp-carokann-exchange#0': ['Ne5 — jump to the centre', 'Nxe5 — trade the active knight', 'Rxe5 — recapture', 'Rfc8 — seize the open c-file'],
  'mp-carokann-two-knights#0': ['b3 — prepare the long bishop', 'c5 — the freeing break', 'Bb2 — develop', 'cxd4 — open on Black’s terms'],
  'mp-carokann-panov#0': ['h3 — make luft', 'Bd7 — eye c6, reinforce d5', 'Rfe1 — centralise', 'Rc8 — take the c-file, press'],
  'mp-carokann-fantasy#0': ['Kh1 — step off the diagonal', 'exd4 — open the centre', 'cxd4 — recapture', 'Rae8 — swing to the e-file, hit e4'],
  'mp-carokann-tartakower#0': ['Rae1 — contest the e-file', 'Ng6 — reroute, eye f4/h4', 'Ng3 — cover f5', 'Be6 — harmonious setup, initiative'],
};
