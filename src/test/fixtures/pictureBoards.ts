// Three of Danya's article boards with their engine reads stored (local
// Stockfish, depth 16, one read per candidate and the MultiPV-3 of the board):
// the-positional-rook-lift#2, endgame-attacks-part-2#3,
// rooks-on-the-seventh-revisited#2. Shared by the picture's tests
// (`pictureVerdict.test.ts`, `readDecider.speaks.test.ts`).
export type Row = [number, string];
export interface Board { fen: string; top: Row[]; reads: Row[] }

export const ROOKLIFT: Board = {
  fen: '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25',
  top: [
    [-126, 'c8b8 e1e2 d8d7 d1a1 b8c8 e2e1 c8c7 e1f1 d7f7 f3d2 g6f6 f1e2'],
    [-121, 'g6f6 d3d4 e5d4 c3d4 g5g4 d4d5 g4f3 d5e6 f6e6 h6f4 e6e4'],
    [-110, 'd8d7 d1a1 c8b8 e1e2 g6f7 a1f1 a6a5 f1a1 g5g4 f3e1 d6d5 a1a5'],
  ],
  reads: [
    [-126, 'c8b8 e1e2 d8d7 d1a1 b8c8 e2e1 c8c7 e1f1 d7f7 f3d2 g6f6 f1e2'],
    [-50, 'c5c4 b3c4 b5c4 d3c4 g6e4 e3e4 b7e4 f3d2 e4b7 d2f1 d8d7 f1e3 e6c5'],
    [-21, 'g5g4 f3h4 g6h5 h4f3 h5f7 f3g5 e6g5 h6g5 d8d7 c3c4 h7h5 e3d2 b5b4'],
    [123, 'd6d5 f3e5 g6f6 f2f4 d5e4 d3e4 f6e7 h2d2 d8d2 d1d2 g5f4 h6f4 e6f4'],
    [-79, 'b7c6 b3b4 c5c4 d3c4 g6e4 e3e4 c6e4 f3d2 e4b7 c4b5 a6b5 f2f3 g8g6'],
    [291, 'b7e4 d3e4 g6f6 b3b4 c5b4 c3b4 c8b7 h2h5 d6d5 h6g5 e6g5 f3g5 d5d4'],
    [-117, 'g6f6 h2h5 f6g6 h5h2 d8d7 f3d2 e6d8 e1e2 d8f7 d1h1 d6d5 e4d5 b7d5'],
    [569, 'g6h6 h2h6 e6f4 g3f4 g5f4 e3e2 d8d7 b3b4 c5b4 c3b4 g8g6 h6h5 c8b8'],
    [701, 'g6e4 d3e4 g5g4 f3g5 e6g5 h6g5 g8g5 e3g5 b7c6 h2h6'],
    [296, 'e6d4 c3d4 c5d4 e3g5 g6e6 g5h4 c8b8 f3d2 d8e8 f2f4 g8g6 f4f5'],
    [505, 'b7d5 e4d5 e6c7 e3g5 g6f7 g5h5 f7d5 c3c4 d5b7 h5f5 c8b8 f5e4 b7c8'],
    [161, 'e6c7 f3g5 d8e8 e1e2 c7e6 g5e6 e8e6 d1g1 g6f7 f2f4'],
    [165, 'e6g7 h6g5 d8d7 h2h6 g6f7 b3b4 c5b4 d1c1 c8b8 c3b4 g7e6'],
    [292, 'e6f4 h6g5 d8e8 g3f4 e5f4 g5f4 b7e4 f3h4 g6h5 e1d2 e4f5 h4f5 h5f5'],
    [23, 'b5b4 c3b4 c5b4 d1c1 c8b8 e3b6 g6f6 f3g5 g8g5 c1c6 d8c8 c6d6 g5g6'],
  ],
};
export const ENDGAME: Board = {
  fen: '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29',
  top: [
    [-7, 'f1e2 b7e7 e2b5 a4a3 b2a3 e7a3 d4d8 g8h7 d8d2 a3c5 b5e2 c5f5'],
    [-11, 'g1g2 b7e7 f1b5 a4a3 b2a3 e7a3 b5e2 a3b2 g2f1 b2c1 f1g2 c1e1'],
    [-34, 'd4d8 g8h7 d8d4 b7a6 d4c5 a4a3 b2a3 a6a4 f1e2 a4c2 c5b5 c2c3'],
  ],
  reads: [
    [-7, 'f1e2 b7e7 e2b5 a4a3 b2a3 e7a3 d4d8 g8h7 d8d2 a3c5 b5e2 c5f5'],
    [-33, 'd4d8 g8h7 d8d4 h6h5 f1e2 b7c6 g1f2 f6g4 f2g1 g4h6 e2f1 h6f5 d4e5'],
    [-159, 'f1h3 b7d5 h3f1 d5f5 d4a7 f5f3 f1b5 g8h7 b5c4 f3d1 c4f1 d1c2 a7a5'],
    [-71, 'f1g2 b7d5 d4d5 f6d5 g1f2 d5c3 f2e1 b5b4 e1d2 c3d5 g2e4 d5b6 e4d3'],
    [-489, 'f1b5 b7b5 c3c4 b5a5 h2h3 a5e1 g1g2 e1e2 g2g1 e2f3 c4c5 f3g3 g1f1'],
    [-587, 'd4f6 g7f6 h2h4 b7b6 h4h5 b6e3 g1h1 e3c1 h1g1 c1b2 c3c4 a4a3 c4b5'],
    [-205, 'c3c4 b5b4 c4c5 a4a3 b2a3 b4a3 f1c4 b7b1 g1g2 b1c2 g2h3 c2f2 c5c6'],
    [-39, 'd4d6 h6h5 f1e2 g8h7 d6d4 b7c6 e2f1 c6a6 h2h3 a4a3 b2a3 a6a3 f1b5'],
    [-100, 'd4c5 b7d7 c5b5 d7d2 b5e2 d2c1 g1f2 h6h5 h2h3 f6d5 f5f6 g7g6 g3g4'],
    [-163, 'd4e5 b5b4 c3b4 b7b4 e5b5 b4e1 b5e2 e1c1 g1f2 h6h5 h2h3 f6d5 f1g2'],
    [-684, 'd4e4 b7e4 f1d3 e4e3 g1g2 e3d3 g3g4 f6e4 b2b3 a4b3 g4g5 h6g5'],
    [-110, 'd4b4 b7d7 b4b5 d7d2 b5e2 d2c1 g1f2 h6h5 h2h3 f6d5 f1g2 d5e3 g2e4'],
    [-721, 'd4a4 b5a4 b2b4 a4b3 f1c4 f6g4 h2h4 b7c7 g1g2 b3b2 c4a2 g4e3 g2f2'],
    [-775, 'd4b6 b7b6 f1e2 b6e3 g1f1 e3d2 g3g4 d2b2 f1e1 b2c3 e1f1'],
    [-866, 'd4d5 b7d5 f1e2 d5d2 g1f1 d2c1 f1f2 c1b2 f2e1 a4a3 e2d3 b2c3 e1d1'],
    [-1107, 'd4d7 b7d7 h2h3 d7d2 f1b5 d2c1 b5f1 c1b2 g3g4 a4a3 f1c4 b2c3 g4g5'],
    [-1333, 'd4a7 b7a7 g1f2 f6g4 f2e1 a7e3 f1e2 e3c1 e2d1 c1b2 d1g4 a4a3 h2h4'],
    [-1529, 'd4d3 e4d3 f1e2 b7e4 e2d1 e4e3 g1g2 f6e4 g2h3 d3d2 d1c2 e3f2 c2d1'],
    [-1118, 'd4c4 b5c4 f1c4 b7b2 h2h3 b2c3 g3g4 a4a3 g4g5 c3c4 g5g6 a3a2 g6f7'],
    [-396, 'b2b3 a4b3 d4b4 b7d5 c3c4 b5c4 f1c4 d5d1 g1g2 d1f3 g2g1 f3e3 g1g2'],
  ],
};
export const SEVENTH: Board = {
  fen: '5r1k/R2R2p1/7p/p4prP/2B5/5K2/8/8 w - - 0 36',
  top: [
    [279, 'c4f7 f5f4 f7g6 g5g3 f3f2 f8g8 a7a5 g3c3 a5a2 c3c8 d7d2 c8b8'],
    [268, 'c4d5 f5f4 d5f7 a5a4 a7a4 g5g3 f3f2 g3h3 a4a7 f8b8 f7g6 b8b2'],
    [264, 'c4e6 f5f4 e6f7 a5a4 f7g6 g5g3 f3f2 f8b8 a7a4 b8b2 f2f1 g3f3'],
  ],
  reads: [
    [279, 'c4f7 f5f4 f7g6 g5g3 f3f2 f8g8 a7a5 g3c3 a5a2 c3c8 d7d2 c8b8'],
    [-377, 'd7g7 g5g7 a7a6 f5f4 c4e2 g7g5 a6h6 h8g7 h6a6 g5h5 a6a7 g7h8 f3g4'],
    [16, 'a7a5 g5h5 c4d3 h5g5 a5c5 h8g8 f3e2 f5f4 c5g5 f4f3 e2d1'],
    [249, 'c4e6 f5f4 e6f7 g5g3 f3f4 g3g2 f4e4 g2g1 f7g6 g1e1 e4d5 e1d1 d5c5'],
    [239, 'c4d5 a5a4 d5f7 f5f4 f7g6 g5g3 f3f2 a4a3 d7f7 f8b8 f7f4 g3c3 f2e1'],
    [0, 'f3f4 g5g4 f4f3 g4c4 d7g7 c4g4 g7h7 h8g8 h7h6 g4g7 h6g6 g7g6 h5g6'],
    [248, 'f3e3 f5f4 e3f2 f8b8 c4f7 g5g3 f7g6 b8b2 f2f1 g3f3 f1e1 f3e3 e1d1'],
    [236, 'd7f7 f8c8 c4e6 c8e8 e6d7 e8b8 f7f5 g5g1 d7b5 b8d8 b5e2 g1c1 f3f2'],
    [13, 'd7d5 g5h5 d5a5 h5g5 c4d3 h6h5 f3f4 g5g1 a5f5 f8f5 d3f5 h8g8 f4e5'],
    [-494, 'a7a8 f8a8 c4d5 a8f8 d5f7 f8f7 d7f7 g5h5 f3f4 h8h7 f7a7 h5h4 f4f5'],
    [239, 'a7b7 a5a4 c4f7 f5f4 f7g6 g5g3 f3f2 g3b3 b7a7 b3b2 f2f3 b2b3 f3g4'],
    [-485, 'd7d8 f8d8 c4f7 d8f8 f7g6 f5f4 a7a6 g5c5 a6a7 c5c3 f3f2 f8b8 f2f1'],
    [258, 'd7e7 f5f4 c4f7 g5g3 f3f2 f8b8 f7g6 g3h3 e7b7 b8d8 b7f7 f4f3 f7f3'],
    [271, 'f3f2 g5g4 c4f7 g4e4 f2f3 f8b8 a7a5 e4h4 a5f5 h4b4 f5a5 b4b5'],
    [256, 'f3e2 f5f4 c4f7 f4f3 e2f2 a5a4 d7d3 g5b5 d3f3 b5b2 f2g3 b2b5 f3a3'],
  ],
};
