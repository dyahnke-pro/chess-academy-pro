// THE FAMOUS-TRAP RECALL SET: the traps every club player is told about, each
// on the moves it is known by, and the slip. Read by the recall measure and the
// recall gate (`famousTrapRecall.gate.test.ts`).
export interface Famous {
  name: string; line: string; slip: string; slipBy: 'w' | 'b';
  /** The trap's own line where its point comes later than the engine's first
   *  choice shows (the Elephant's Bxd8?? Bb4+): the sacrifice filter reads the
   *  line the trap is known by, as the in-app index carries it. */
  punish?: string;
}
export const FAMOUS: Famous[] = [
  { name: "Légal's mate", line: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5', slip: 'Bxd1', slipBy: 'b' },
  { name: "Scholar's mate", line: 'e4 e5 Bc4 Nc6 Qh5', slip: 'Nf6', slipBy: 'b' },
  { name: "Fool's mate", line: 'f3 e5', slip: 'g4', slipBy: 'w' },
  { name: 'Elephant Trap', line: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5', slip: 'Nxd5', slipBy: 'w', punish: 'Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8' },
  { name: 'Englund Gambit trap', line: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2', slip: 'Bc3', slipBy: 'w' },
  { name: 'Lasker Trap (Albin)', line: 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3', slip: 'Bxb4', slipBy: 'w' },
  { name: 'Blackburne Shilling', line: 'e4 e5 Nf3 Nc6 Bc4', slip: 'Nd4', slipBy: 'b' },
  { name: "Noah's Ark", line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4', slip: 'Qxd4', slipBy: 'w' },
  { name: 'Fried Liver', line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5', slip: 'Nxd5', slipBy: 'b' },
  { name: 'Damiano Defence (…fxe5??)', line: 'e4 e5 Nf3 f6 Nxe5', slip: 'fxe5', slipBy: 'b' },
  { name: 'Kieninger Trap', line: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5', slip: 'axb4', slipBy: 'w' },
  { name: 'Stafford Gambit (Bg5??)', line: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5', slip: 'Bg5', slipBy: 'w' },
  { name: 'Petrov Nc6+ trap', line: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2', slip: 'Nf6', slipBy: 'b' },
  { name: 'Caro-Kann smothered mate', line: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2', slip: 'Ngf6', slipBy: 'b' },
  { name: "Owen's Defence trap (…Bxg2?)", line: 'e4 b6 d4 Bb7 Bd3 f5 exf5', slip: 'Bxg2', slipBy: 'b' },
  { name: 'Siberian Trap', line: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 Qc7 O-O Nf6 Qe2 Ng4', slip: 'h3', slipBy: 'w' },
  { name: 'Mortimer Trap', line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Ne7', slip: 'Nxe5', slipBy: 'w' },
  { name: 'Tarrasch Trap', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Be7 Re1 O-O Nd4', slip: 'Qd7', slipBy: 'b' },
  { name: 'Fishing Pole', line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Ng4 h3 h5', slip: 'hxg4', slipBy: 'w' },
  { name: "Queen's Gambit Accepted b5 trap (…cxb5??)", line: 'd4 d5 c4 dxc4 e3 b5 a4 c6 axb5', slip: 'cxb5', slipBy: 'b' },
  { name: 'Magnus Smith Trap', line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bc4 g6 Nxc6 bxc6 e5', slip: 'dxe5', slipBy: 'b' },
  { name: 'Halosar Trap', line: 'd4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Qxf3 Qxd4 Be3 Qb4 O-O-O', slip: 'Bg4', slipBy: 'b' },
  { name: 'Wurzburger Trap', line: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 d3 Qh4+ g3 Nxg3 Nf3 Qh5 Nxd5', slip: 'Nxh1', slipBy: 'b' },
];
// WIKIPEDIA'S "LIST OF CHESS TRAPS" (data/sources/drive, reference only) — the
// named traps it lists, plus Fool's and Scholar's mate from its See also. The
// three it lists that the 23 above do not carry, on the moves its articles give.
export const WIKI_LIST = new Set(["Légal's mate", "Scholar's mate", "Fool's mate", 'Elephant Trap', 'Englund Gambit trap', 'Lasker Trap (Albin)', 'Blackburne Shilling', "Noah's Ark", 'Kieninger Trap', 'Siberian Trap', 'Mortimer Trap', 'Tarrasch Trap', 'Fishing Pole', 'Magnus Smith Trap', 'Halosar Trap', 'Wurzburger Trap', 'Monticelli Trap', 'Marshall Trap (Petrov)', 'Rubinstein Trap']);
export const WIKI_EXTRA: Famous[] = [
  { name: 'Monticelli Trap', line: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Bxd2+ Qxd2 b6 g3 Bb7 Bg2 O-O Nc3 Ne4', slip: 'Qc2', slipBy: 'w' },
  { name: 'Marshall Trap (Petrov)', line: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Bd6 O-O O-O c4 Bg4 cxd5 f5', slip: 'Re1', slipBy: 'w' },
  { name: 'Rubinstein Trap', line: 'd4 d5 Nf3 Nf6 c4 e6 Bg5 Nbd7 e3 Be7 Nc3 O-O Rc1 Re8 Qc2 a6 cxd5 exd5 Bd3 c6 O-O Ne4 Bf4', slip: 'f5', slipBy: 'b' },
];

