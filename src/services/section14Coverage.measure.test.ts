// E-10 — WHY SECTION 14 FIRES ON NOTHING REAL, measured per flagged ply rather
// than guessed (2026-09-20).
//
// The three section-14 detectors (`calculation-depth`, `left-book-early`,
// `no-plan`) shipped gated and have never fired on a real game. Two readings
// were taken before this one and both were about INPUTS: a prod tally showing
// every unnamed slip declining with "punishing PV is 0 plies", and a PostHog
// read putting the app's can't-name rate at 29.2% of real slips. This one is
// about COVERAGE — for each flagged ply of a REAL amateur game, did any
// section-14 detector fire, and if not, which gate declined and why.
//
// It is a MEASUREMENT, not a gate. The only assertions are non-vacuity: a real
// game was graded, real plies were flagged, and every decline names a gate. A
// coverage number is never asserted, because the honest answer today is zero
// and pinning zero would gate in the defect.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { attributePrinciples } from './principleAttribution';

const FIXTURE = 'src/test/fixtures/wo4-real-game-Nw3DqA2B.json';
const SECTION_14 = ['calculation-depth', 'left-book-early', 'no-plan'] as const;

interface Fixture { id: string; moves: string; [k: string]: unknown }

/** Collapse a reason to its SHAPE so reasons tally across plies: the numbers
 *  and SANs differ every time, the gate that declined does not. */
const shape = (r: string): string =>
  r.replace(/\b\d+\b/g, 'N').replace(/\b[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?\b/g, 'SAN');

describe('E-10 — section-14 coverage on a real game, with the reason per ply', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('measures whether any section-14 detector fires, and tallies the gate that declined', () => {
    const f = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const sans = f.moves.split(' ').filter(Boolean);
    expect(sans.length, 'fixture carried no moves — the measurement would be vacuous').toBeGreaterThan(20);

    // Walk the real game. Every student ply past the opening is a candidate;
    // the attributor decides. No engine here: this measures the DETECTORS, and
    // it deliberately supplies NO pv, because the path that records real games
    // (`analyzeGameOnWorker`, and the batch callers of `analyzeGamePositions`)
    // emits none — that absence IS the finding, not a gap in the fixture.
    // REAL engine numbers, not fabricated ones. The fixture carries, per ply,
    // Stockfish 18's own bestMove/bestMoveEval/evaluation at the sweep's depths
    // — so the best move fed to the attributor is the engine's, and the cost is
    // measured rather than bucketed. Deliberately NO pv: `analyzeGameOnWorker`
    // (this path, and the import batch) emits none at all, and that absence is
    // the finding rather than a gap in the fixture.
    const deep = (f.deep as { plies: { bestMove: string; bestMoveEval: number; evaluation: number }[] }).plies;
    const studentIsWhite = String(f.white) === String(f.us);
    const board = new Chess();
    const rows: { ply: number; san: string; fired: string[]; why: string[] }[] = [];
    sans.forEach((san, i) => {
      const historySans = sans.slice(0, i + 1);
      const fenBefore = board.fen();
      const d = deep[i];
      const isStudent = (i % 2 === 0) === studentIsWhite;
      board.move(san);
      if (!isStudent || !d?.bestMove) return;
      // UCI → SAN from the position BEFORE the move, the same conversion the
      // recording path does.
      let bestSan: string | undefined;
      try {
        const probe = new Chess(fenBefore);
        const m = probe.move({ from: d.bestMove.slice(0, 2), to: d.bestMove.slice(2, 4), promotion: d.bestMove.slice(4) || undefined });
        bestSan = m?.san;
      } catch { bestSan = undefined; }
      if (!bestSan) return;
      const sign = studentIsWhite ? 1 : -1;
      const evalBefore = Math.round(d.bestMoveEval * sign);
      const evalAfterPlayed = Math.round(d.evaluation * sign);
      const cost = evalBefore - evalAfterPlayed;
      if (cost < 100) return;                  // only real mistakes, by the engine's number
      const why: string[] = [];
      const got = attributePrinciples(
        { historySans, bestSan, classification: cost >= 300 ? 'blunder' : 'mistake', evalBefore, evalAfterPlayed },
        why,
      );
      const fired = got.map((g) => g.id).filter((id) => (SECTION_14 as readonly string[]).includes(id));
      rows.push({ ply: i + 1, san, fired, why });
    });

    expect(rows.length, 'no student plies were flagged by the engine — measurement vacuous').toBeGreaterThan(0);

    const firedPlies = rows.filter((r) => r.fired.length > 0);
    const tally = new Map<string, number>();
    for (const r of rows) for (const w of r.why) tally.set(shape(w), (tally.get(shape(w)) ?? 0) + 1);

    // Every decline must NAME a gate — a silent null is the thing the `why`
    // sink exists to make impossible, so this is the one real contract here.
    for (const r of rows.filter((x) => x.fired.length === 0)) {
      expect(r.why.length, `ply ${r.ply} ${r.san} declined with NO reason`).toBeGreaterThan(0);
      for (const w of r.why) expect(w).toMatch(/^(calculation-depth|left-book-early|no-plan): .{8,}/);
    }

    const report = {
      measuredAt: new Date().toISOString(),
      fixture: f.id,
      studentPliesExamined: rows.length,
      pliesWithASection14Fundamental: firedPlies.length,
      reasonsByShape: Object.fromEntries([...tally.entries()].sort((a, b) => b[1] - a[1])),
      examples: rows.slice(0, 6).map((r) => ({ ply: r.ply, san: r.san, fired: r.fired, why: r.why })),
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/section14-coverage.json', JSON.stringify(report, null, 2));

    console.log(`[section-14 coverage] ${firedPlies.length}/${rows.length} student plies got a section-14 fundamental`);
    for (const [why, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)}×  ${why}`);
  });
});
