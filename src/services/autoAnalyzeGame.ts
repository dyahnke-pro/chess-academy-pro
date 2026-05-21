// Import-time auto-analysis — the third faucet (David 2026-05-21: "tie
// game analysis in without needing a full review"). Given the blunders a
// game's Stockfish scan already found, classify each into a closed-set
// misconception and log it to the shared bucket — no interactive "why?"
// required (userReason is absent; the coach classifies from position +
// best move + eval alone). Game Review's interactive capture and this
// passive path write to the SAME bucket; this just front-runs it.

import { captureMisconception } from './discussionPractice';

export interface BlunderForAnalysis {
  /** Position BEFORE the move (FEN). */
  fen: string;
  playedSan: string;
  bestSan?: string;
  cpLoss?: number;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  moveNumber?: number;
}

export interface AutoAnalyzeOptions {
  openingId?: string;
  openingName?: string;
  sourceGameId?: string;
  /** Count-against gate: only learned lines / principles become
   *  weaknesses. Imported games of a repertoire the user claims to know
   *  count; first-exposure lines don't. */
  learned: boolean;
}

export interface AutoAnalyzeResult {
  classified: number;
  logged: number;
}

function cpToWords(cpLoss?: number): string | undefined {
  if (cpLoss === undefined) return undefined;
  const pawns = cpLoss / 100;
  if (pawns >= 3) return 'loses a lot of material or the game';
  if (pawns >= 1.5) return "drops a piece's worth of advantage";
  if (pawns >= 0.8) return 'loses about a pawn';
  return 'gives away a little something';
}

/** Classify + log a game's blunders without user interaction. Returns
 *  how many were classifiable and how many were actually logged (the
 *  count-against gate + the classifier's 'none'/off-vocab guards mean
 *  classified >= logged). Runs sequentially to stay gentle on the LLM. */
export async function autoAnalyzeBlunders(
  blunders: BlunderForAnalysis[],
  opts: AutoAnalyzeOptions,
): Promise<AutoAnalyzeResult> {
  let classified = 0;
  let logged = 0;
  for (const b of blunders) {
    const result = await captureMisconception({
      classifyInput: {
        fen: b.fen,
        playedSan: b.playedSan,
        bestSan: b.bestSan,
        evalSummary: cpToWords(b.cpLoss),
        gamePhase: b.gamePhase,
        // No userReason — this is passive analysis.
      },
      source: 'auto-analysis',
      shouldCount: opts.learned,
      context: {
        fen: b.fen,
        playedSan: b.playedSan,
        bestSan: b.bestSan,
        cpLoss: b.cpLoss,
        gamePhase: b.gamePhase,
        moveNumber: b.moveNumber,
        openingId: opts.openingId,
        openingName: opts.openingName,
        sourceGameId: opts.sourceGameId,
      },
    });
    if (result.classification && result.classification.tag !== 'none') classified += 1;
    if (result.logged) logged += 1;
  }
  return { classified, logged };
}
