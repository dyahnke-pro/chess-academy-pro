// WHAT WOULD A RELATION CHECK COST? Measured before anything is wired.
//
// The last class David heard and called useless: "As a rule in these positions:
// The bishop pins, then trades itself for the knight, leaving the d-pawn
// exposed" — on a board with no pin. It clears every gate we have. It names no
// square (so the board-claim gate is blind), recommends no illegal move, names
// no absent piece (both a bishop and a knight were on), and contradicts no
// phase. What is false about it is the RELATION: it asserts a pin, and there
// isn't one.
//
// We compute relations already — `detectTactics` is the same detector the alert
// lane uses — so the check is cheap and code-side (G0: compute the answer,
// don't validate the prose). The open question is not "can we", it is "what
// does it cost": a note that mentions a pin as a general principle rather than
// as a claim about NOW is legitimate teaching, and silencing those trades one
// defect for a quieter coach.
//
// So this measures first and decides second. Same discipline as
// `pieceGateCost.report.test.ts`, which is what proved the piece check was free
// (10 boards offered, 10 kept). A REPORT, not a wall.
//
// 🚨 FIRST RESULT (2026-08-16): 10 offered, 0 would be refused, 0 left silent —
// it costs nothing AND catches nothing. And the example that motivated it was
// MY OWN BAD ANALYSIS: I told David no pin existed on
// `1r2r1k1/1p4pp/p1n1b3/2Pp1p2/4p2q/PQ5P/1P1B1PP1/1BR1R1K1` because I traced
// Bd2 and Bb1 by hand and neither hit the c6 knight. `detectTactics` finds FOUR
// pins there. The note was fine; the reviewer was not.
//
// So NOTHING IS WIRED. A gate with no evidence behind it is the reflex G0 names
// ("if you are adding a validator — STOP"), and one built on a misread position
// would be worse than none. This file stays as the instrument: if the class is
// ever real it will show up here with numbers, instead of someone eyeballing a
// board and being wrong about it.
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { teachingSourceForBoard, spokenBeatText } from './danyaTeachingService';
import { detectTactics } from './tacticsDetector';

/** Relation words a note can assert, and the detector type that proves them. */
const RELATIONS: Array<[RegExp, string[]]> = [
  [/\bpin(?:s|ned|ning)?\b/i, ['pin']],
  [/\bfork(?:s|ed|ing)?\b/i, ['fork']],
  [/\bskewer(?:s|ed|ing)?\b/i, ['skewer']],
  [/\bbattery\b/i, ['battery']],
  [/\bdiscovered\s+(?:attack|check)\b/i, ['discovered_attack', 'discovery']],
  [/\boverload(?:s|ed|ing)?\b/i, ['overload']],
];

const boardsFrom = (fen: string): Set<string> => {
  try { return new Set(detectTactics(fen).tactics.map((t) => t.type)); } catch { return new Set(); }
};

/** Every relation the text asserts that the board does not actually show. */
function unprovenRelations(text: string, fen: string): string[] {
  const present = boardsFrom(fen);
  const out: string[] = [];
  for (const [re, types] of RELATIONS) {
    if (!re.test(text)) continue;
    if (!types.some((t) => present.has(t))) out.push(types[0]);
  }
  return out;
}

const BOARDS = [
  '1r2r1k1/1p4pp/p1n1b3/2Pp1p2/4p2q/PQ5P/1P1B1PP1/1BR1R1K1 w - - 2 25',   // his "bishop pins" board
  '6k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/5RK1 w - - 0 27',
  '3r2k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/3R1RK1 w - - 4 26',
  'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9',
  'r2q1rk1/1b1nbppp/p2ppn2/1p6/3NPP2/1BN1B3/PPPQ2PP/2KR3R w - - 0 12',
  '8/5pk1/6p1/7p/7P/5PP1/2R2K2/3r4 w - - 0 40',
  'r4rk1/pp3ppp/2n1b3/q7/3P4/2P1BN2/P4PPP/R2Q1RK1 w - - 0 16',
  '2r3k1/5ppp/p3p3/1p1qP3/3P4/1Q5P/P4PP1/2R3K1 w - - 0 28',
  'r2qr1k1/1p4pp/p1nbbp2/3p4/N2Pp3/P4N1P/1P1B1PP1/1BRQR1K1 w - - 2 21',
  '6k1/1p4pp/p3p3/1q6/4P3/1P2QPPP/5R1K/3r4 w - - 1 30',
];

describe('a relation check, priced before it is wired', () => {
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 180_000);

  it('counts what it would refuse, and whether anything true is left to say', () => {
    let offered = 0;
    const wouldRefuse: Array<{ fen: string; claimed: string[]; text: string; replaced: boolean }> = [];

    for (const fen of BOARDS) {
      const src = teachingSourceForBoard([], fen, null);
      if (!src) continue;
      const text = spokenBeatText(src.note);
      if (!text.trim()) continue;
      offered += 1;
      const bad = unprovenRelations(text, fen);
      if (bad.length === 0) continue;
      // THE COST IS SILENCE, NOT REFUSAL. Production passes predicates INTO
      // selection, so a refused note means the tier keeps looking — measuring
      // the refusal alone would overstate the price, exactly as it would have
      // for the piece gate.
      const replacement = teachingSourceForBoard([], fen, null,
        (n) => unprovenRelations(spokenBeatText(n), fen).length === 0 && spokenBeatText(n).trim().length > 0);
      wouldRefuse.push({ fen, claimed: bad, text: text.slice(0, 120), replaced: Boolean(replacement) });
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      boards: BOARDS.length,
      offered,
      wouldRefuse: wouldRefuse.length,
      // The only real loss: refused AND nothing true to say instead.
      wouldLeaveSilent: wouldRefuse.filter((r) => !r.replaced).length,
      detail: wouldRefuse,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/relation-claim-cost.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, detail: wouldRefuse.map((r) => `${r.claimed.join('+')}: ${r.text}`) }, null, 2));

    expect(BOARDS.length).toBeGreaterThan(0);
  }, 300_000);
});
