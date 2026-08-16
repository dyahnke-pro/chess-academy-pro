// WHAT DOES THE PIECE GATE COST? Measured, not assumed.
//
// Refusing every borrowed sentence that names an absent piece is obviously
// right for truth and obviously risky for coverage: over-block and the tier
// goes quiet, and a quiet coach teaches less than the corpus knows. So this
// asks the corpus directly, on real middlegame and endgame boards: of the
// borrowed teaching that would have been spoken, how much names a piece that
// is not there?
//
// A REPORT, not a wall — but it prints the number that decides whether the
// gate stays this strict.
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { teachingSourceForBoard, spokenBeatText } from './danyaTeachingService';
import { gradeBorrowedTeaching } from './coachAnswerGates';
import { stripDisprovenSentences } from './boardClaimValidator';

/** Boards from David's own prod game (2026-08-16) plus a spread of middlegame
 *  and endgame positions — the phases where the borrowed tiers actually
 *  answer. The opening is excluded by design: both borrow tiers stand down
 *  there. */
const BOARDS: string[] = [
  '6k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/5RK1 w - - 0 27',
  '3r2k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/3R1RK1 w - - 4 26',
  '6k1/1p4pp/p3p3/1q6/4P3/1P2QPPP/5R1K/3r4 w - - 1 30',
  '6k1/1p4pp/p3p3/4q3/4P3/1P2QP1P/5RPK/3r4 w - - 4 29',
  'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9',
  'r2q1rk1/1b1nbppp/p2ppn2/1p6/3NPP2/1BN1B3/PPPQ2PP/2KR3R w - - 0 12',
  '8/5pk1/6p1/7p/7P/5PP1/2R2K2/3r4 w - - 0 40',
  '8/8/4kp2/3p2p1/p1pP2P1/P1P2P2/1P2K3/8 w - - 0 35',
  'r4rk1/pp3ppp/2n1b3/q7/3P4/2P1BN2/P4PPP/R2Q1RK1 w - - 0 16',
  '2r3k1/5ppp/p3p3/1p1qP3/3P4/1Q5P/P4PP1/2R3K1 w - - 0 28',
];

describe('the piece gate, priced', () => {
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 180_000);

  it('counts what it refuses and what it keeps', () => {
    let offered = 0;
    let squareOnlyKept = 0;   // what the OLD gate would have spoken
    let pieceGateKept = 0;    // what ships now
    const refused: Array<{ fen: string; text: string; replaced: boolean }> = [];

    for (const fen of BOARDS) {
      const history: string[] = [];
      try {
        // A plausible move history is not needed for the borrow tiers — they
        // read the board — but `teachingSourceForBoard` wants the array.
        new Chess(fen);
      } catch { continue; }
      const src = teachingSourceForBoard(history, fen, null);
      if (!src) continue;
      const raw = spokenBeatText(src.note);
      if (!raw.trim()) continue;
      offered += 1;
      const oldWay = stripDisprovenSentences(raw, fen, { strictHypotheticals: true }).clean;
      const nowWay = gradeBorrowedTeaching(raw, fen, 'report.pieceGate');
      if (oldWay.trim()) squareOnlyKept += 1;
      if (nowWay.trim()) pieceGateKept += 1;
      if (oldWay.trim() && !nowWay.trim()) {
        // THE COST IS NOT THE REFUSAL, IT IS THE SILENCE — and those are
        // different numbers. Production passes the gate IN as the selection
        // predicate (`CoachTeachPage`), so a refused note does not end the
        // turn: the tier keeps looking. Measuring the refusal alone would
        // overstate the price of telling the truth.
        const replacement = teachingSourceForBoard(
          history, fen, null,
          (n) => gradeBorrowedTeaching(spokenBeatText(n), fen, 'report.pieceGate.replacement').length > 0,
        );
        refused.push({
          fen,
          text: oldWay,
          replaced: Boolean(replacement && gradeBorrowedTeaching(spokenBeatText(replacement.note), fen, 'report.pieceGate.replacement').trim()),
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      boards: BOARDS.length,
      borrowedOffered: offered,
      keptBySquareGateAlone: squareOnlyKept,
      keptWithPieceGate: pieceGateKept,
      refusedByPieceGate: refused.length,
      // The only number that is a real loss: refused AND nothing true to say instead.
      leftSilent: refused.filter((r) => !r.replaced).length,
      refused,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/piece-gate-cost.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, refused: refused.map((r) => r.text.slice(0, 90)) }, null, 2));

    expect(BOARDS.length).toBeGreaterThan(0);
  }, 300_000);
});
