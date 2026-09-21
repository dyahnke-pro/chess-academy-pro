// Types for the shared middlegame-depth reader.
//
// Plain ESM so the gate and the build script read ONE definition of "reaches a
// middlegame" (G9.3 Gate B). Signature and shape read off the implementation.

export interface MiddlegameDepth {
  /** True when both sides are developed/castled enough to call it a middlegame. */
  pass: boolean;
  plies: number;
  wCastle: boolean;
  bCastle: boolean;
  wDev: number;
  bDev: number;
  /** Present only when the PGN stopped being legal — the offending SAN. */
  illegalAt?: string;
}

/** Walk a PGN and report whether it reaches a middlegame, with the counts the
 *  verdict was made on. */
export declare function reachesMiddlegame(pgn: string): MiddlegameDepth;
