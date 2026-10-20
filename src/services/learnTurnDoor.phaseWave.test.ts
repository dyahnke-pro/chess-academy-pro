/**
 * THE PHASE REPORT IS ONE WAVE OF ITS TURN (root causes 5 + 6, Smith-Morra
 * replay of David's game, 2026-10-19). The report on the move-8 board used to
 * reach the door one sentence at a time, each a turn of its own with nothing
 * already said, so subsumption, the verdict hold and the word average never
 * saw it: six lines dripped out over 47 s, after 8.Bxf7+'s verdict, about the
 * board before it. These tests hold the turn door to deciding the report ONCE,
 * inside the turn it was read on.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { coachTurn, decidePhaseWave, type PhaseFact } from './coachDecider';
import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { NO_PROOF } from './proof';

/** After 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 d6 5.Bc4 Nc6 6.Nf3 g6 7.O-O Bg7 —
 *  where the transition fired, White to move. */
const MOVE8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
/** …8.Bxf7+ Kxf7 — the next turn, where the report's lines were still dripping. */
const AFTER_BXF7 = ((): string => { const c = new Chess(MOVE8); c.move('Bxf7+'); c.move('Kxf7'); return c.fen(); })();

/** The report's lines on MOVE8, as the replay heard them, typed. */
const REPORT: PhaseFact[] = [
  { text: 'They want the bishop to g4, pinning your knight on f3 to your queen. The obvious stop is h3 — find another way.', claims: ['prophylaxis:g4:idea'], squares: ['g4', 'f3', 'd1'], proof: NO_PROOF.description, factKind: 'stop-flaw' },
  { text: 'Watch Bg4 — their bishop would pin your knight on f3 to your queen.', claims: ['pf:latent-pin:d1,f3,g4'], squares: ['d1', 'f3', 'g4'], proof: NO_PROOF.description, factKind: 'stop-flaw' },
  { text: 'Spot it before it lands: ask what their next move would attack.', claims: ['method:threat-scan'], proof: NO_PROOF.method, factKind: 'method' },
];

const rows: LearnTurnRow[] = [];
let off: (() => void) | null = null;
const listen = (): void => { off = onLearnTurn((r) => rows.push(r)); };
afterEach(() => { off?.(); off = null; rows.length = 0; });

const ctx = { priorKeys: new Set<string>(), priorLead: null, green: null, beginner: false };

describe('decidePhaseWave — one door call per report, inside its turn', () => {
  it('decides the whole report once, as a phase wave of the live turn', () => {
    listen();
    const d = decidePhaseWave(REPORT, MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, midExchange: null, said: '' }, ctx);
    expect(d).not.toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].turn).toEqual({ kind: 'phase', ply: 13, moveCostCp: 0, midExchange: null });
    // The pin and its stop are ONE claim about g4/f3/d1: one of them speaks.
    const pinLines = d!.pkg.kept.filter((f) => /pin/.test(f.text));
    expect(pinLines).toHaveLength(1);
  });

  it('a claim this game already spoke is not said again by the report', () => {
    const d = decidePhaseWave(REPORT, MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, midExchange: null, said: '' },
      { ...ctx, priorKeys: new Set(['claim:prophylaxis:g4:idea', 'claim:pf:latent-pin:d1,f3,g4']) });
    expect(d!.pkg.kept.some((f) => /pin/.test(f.text))).toBe(false);
  });

  it('on the Bxf7+ turn the move-8 report is over: nothing of it speaks', () => {
    const d = decidePhaseWave(REPORT, MOVE8, { fen: AFTER_BXF7, ply: 15, moveCostCp: 350, midExchange: null, said: 'Bxf7+ was a mistake.' }, ctx);
    expect(d).toBeNull();
  });

  it('a costly turn holds the report behind its verdict (the phase wave sees the cost)', () => {
    listen();
    const d = coachTurn({ posture: 'learn', turn: { kind: 'phase', ply: 13, moveCostCp: 350, midExchange: null },
      facts: REPORT.map((f) => ({ lane: 'phase' as const, text: f.text, fen: MOVE8, claims: f.claims, squares: f.squares, proof: f.proof, role: 'teach' as const })),
      priorLead: null, green: null, beginner: false });
    expect(d.pkg.spoken).toBe('');
    expect(rows.at(-1)?.heldWhy.phase).toBe('verdict-turn');
  });

  it('the turn\'s own words count toward its average', () => {
    listen();
    const said = Array.from({ length: 85 }, () => 'word').join(' ');
    const d = decidePhaseWave([REPORT[2]], MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, midExchange: null, said },
      { ...ctx, priorLead: { lane: 'threat', squares: ['e5'] } });
    expect(d!.pkg.spoken).toBe('');
    expect(rows.at(-1)?.heldWhy.phase).toBe('marginal');
  });
});
