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
import { phaseVerdictLine, phaseVerdictKeys, phaseStockKey } from './reviewPositionalAssessment';
import { spokenSentenceKeys } from './voicePackage';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { findProphylaxis, prophylaxisIdea, prophylaxisKey } from './prophylaxis';
import { obviousStopFlaw } from './thinkAloud';
import { readBoard } from './boardComputers';

/** After 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 d6 5.Bc4 Nc6 6.Nf3 g6 7.O-O Bg7 —
 *  where the transition fired, White to move. */
const MOVE8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
/** …8.Bxf7+ Kxf7 — the next turn, where the report's lines were still dripping. */
const AFTER_BXF7 = ((): string => { const c = new Chess(MOVE8); c.move('Bxf7+'); c.move('Kxf7'); return c.fen(); })();

/** The report's lines on MOVE8, as the replay heard them, typed. */
const REPORT: PhaseFact[] = [
  { text: 'They want the bishop to g4, pinning your knight on f3 to your queen. The obvious stop is h3 — find another way.', claims: ['prophylaxis:g4:idea'], squares: ['g4', 'f3', 'd1'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'stop-flaw' },
  { text: 'Watch Bg4 — their bishop would pin your knight on f3 to your queen.', claims: ['pf:latent-pin:d1,f3,g4'], squares: ['d1', 'f3', 'g4'], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'stop-flaw' },
  { text: 'Spot it before it lands: ask what their next move would attack.', claims: ['method:threat-scan'], proof: NO_PROOF.method, namesStudentMove: NAMES_NO_MOVE, factKind: 'method' },
];

const rows: LearnTurnRow[] = [];
let off: (() => void) | null = null;
const listen = (): void => { off = onLearnTurn((r) => rows.push(r)); };
afterEach(() => { off?.(); off = null; rows.length = 0; });

const ctx = { priorKeys: new Set<string>(), priorLead: null, green: null, beginner: false };

describe('decidePhaseWave — one door call per report, inside its turn', () => {
  it('decides the whole report once, as a phase wave of the live turn', () => {
    listen();
    const d = decidePhaseWave(REPORT, MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said: '', holds: new Set<string>() }, ctx);
    expect(d).not.toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].turn).toEqual({ kind: 'phase', ply: 13, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null });
    // The pin and its stop are ONE claim about g4/f3/d1: one of them speaks.
    const pinLines = d!.pkg.kept.filter((f) => /pin/.test(f.text));
    expect(pinLines).toHaveLength(1);
  });

  it('a claim this game already spoke is not said again by the report', () => {
    const d = decidePhaseWave(REPORT, MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said: '', holds: new Set<string>() },
      { ...ctx, priorKeys: new Set(['claim:prophylaxis:g4:idea', 'claim:pf:latent-pin:d1,f3,g4']) });
    expect(d!.pkg.kept.some((f) => /pin/.test(f.text))).toBe(false);
  });

  it('on the Bxf7+ turn the move-8 report is over: nothing of it speaks', () => {
    const d = decidePhaseWave(REPORT, MOVE8, { fen: AFTER_BXF7, ply: 15, moveCostCp: 350, priceSettled: true, gradeSpeaks: true, midExchange: null, said: 'Bxf7+ was a mistake.', holds: new Set<string>() }, ctx);
    expect(d).toBeNull();
  });

  it('a costly turn holds the report behind its verdict (the phase wave sees the cost)', () => {
    listen();
    const d = coachTurn({ posture: 'learn', turn: { kind: 'phase', ply: 13, moveCostCp: 350, priceSettled: true, gradeSpeaks: true, midExchange: null },
      facts: REPORT.map((f) => ({ lane: 'phase' as const, text: f.text, fen: MOVE8, claims: f.claims, squares: f.squares, proof: f.proof, namesStudentMove: NAMES_NO_MOVE, role: 'teach' as const })),
      priorLead: null, green: null, beginner: false, turnHolds: new Set() });
    expect(d.pkg.spoken).toBe('');
    expect(rows.at(-1)?.heldWhy.phase).toBe('verdict-turn');
  });

  it('the turn\'s own words count toward its average', () => {
    listen();
    const said = Array.from({ length: 85 }, () => 'word').join(' ');
    const d = decidePhaseWave([REPORT[2]], MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said, holds: new Set<string>() },
      { ...ctx, priorLead: { lane: 'threat', squares: ['e5'] } });
    expect(d!.pkg.spoken).toBe('');
    expect(rows.at(-1)?.heldWhy.phase).toBe('marginal');
  });

  it('7.O-O: a claim one wave held, the phase wave may not speak — one key across producers', () => {
    // The real producers on the turn board: the board read's held idea and
    // the "obvious stop" clause are ONE claim (their bishop to g4).
    const ph = findProphylaxis(MOVE8);
    // An engine fan where the obvious stop h3 is a clear step down.
    const flaw = obviousStopFlaw(MOVE8, 'w', [
      { moves: ['e4e5', 'c6e5', 'f3e5', 'g7e5'], evaluation: 17, mate: null },
      { moves: ['h2h3', 'g8f6'], evaluation: -120, mate: null },
    ]);
    expect(ph?.intent.to).toBe('g4');
    expect(flaw?.threatTo).toBe('g4');
    const read = readBoard('prophylaxis', { fen: MOVE8, engineFirstMoves: [`${ph!.prevention.from}${ph!.prevention.to}`] });
    expect(read?.key).toBe(prophylaxisKey('g4'));
    const holds = new Set<string>();
    listen();
    // The late wave: a danger on the same squares leads, so the idea is held.
    const late = coachTurn({ posture: 'learn', turn: { kind: 'late', ply: 13, moveCostCp: 49, priceSettled: true, gradeSpeaks: true, midExchange: null }, facts: [
      { lane: 'threat', text: 'Their bishop can come to g4 and pin your knight on f3 to your queen.', fen: MOVE8, squares: ph!.squares, proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE },
      { lane: 'prophylaxis', text: prophylaxisIdea(ph!).text, fen: MOVE8, squares: ph!.squares, claims: [read!.key], proof: NO_PROOF.withheld, namesStudentMove: NAMES_NO_MOVE },
    ], priorLead: null, green: null, beginner: false, turnHolds: holds });
    expect(late.spoke).not.toContain('prophylaxis');
    expect(holds.has(prophylaxisKey('g4'))).toBe(true);
    // The phase wave of the same turn offers the stop-flaw clause: held.
    const d = decidePhaseWave([{ text: flaw!.text, claims: [prophylaxisKey(flaw!.threatTo)], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'stop-flaw' }],
      MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 49, priceSettled: true, gradeSpeaks: true, midExchange: null, said: late.pkg.spoken, holds }, ctx);
    expect(d!.pkg.spoken).toBe('');
    expect(rows.at(-1)?.heldWhy.phase).toBe('held-this-turn');
    // A new turn starts a fresh set, so the claim is free again.
    const next = decidePhaseWave([{ text: flaw!.text, claims: [prophylaxisKey(flaw!.threatTo)], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'stop-flaw' }],
      MOVE8, { fen: MOVE8, ply: 13, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said: '', holds: new Set<string>() }, ctx);
    expect(next!.pkg.spoken).not.toBe('');
  });

  it('36.Rxa1 (#16): the endgame balance sheet is said once across waves and within the report', () => {
    const game = new Chess();
    for (const m of 'e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3 axb3 Bxg3 fxg3 Nb8 Qh5 a5 Ne3 b6 Qh4 Nc6 Ra3 Qxh4 gxh4 Rfd8 h5 Nd4 Rf2 Ra7 Rxa5 Rxa5 Bd2 Ra7 h6 gxh6 Nf1 Kg7 Ng3 Rg8 Nh5+ Kf8 Nf6 Rg6 h4 Kg7 Ne8+ Kf8 Nxd6 Nxc2 h5 Rg8 Ne8 Kxe8 Bxh6 Ra1+ Rf1 Kd7 Rxa1 Kc6'.split(' ')) game.move(m);
    const fen = game.fen();
    const sheet = phaseVerdictLine(fen, 'w', -500, 'endgame', new Set());
    expect(sheet).toMatch(/endgame/);
    const claims = [...phaseVerdictKeys(fen, 'w', -500, new Set()), phaseStockKey('endgame')];
    const fact = (text: string): PhaseFact => ({ text, claims, proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE, factKind: 'stock' });
    // Within one report: the sheet offered twice (two emitters) speaks once.
    const once = decidePhaseWave([fact(sheet!), fact(sheet!.replace(/^Taking stock as the endgame begins/, 'The endgame starts here, so take stock'))], fen,
      { fen, ply: 71, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said: '', holds: new Set<string>() }, ctx);
    expect(once!.pkg.kept).toHaveLength(1);
    // Across waves: the turn's late wave already said it — the phase copy drops.
    const late = coachTurn({ posture: 'learn', turn: { kind: 'late', ply: 71, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null },
      facts: [{ lane: 'positionFacts', text: sheet!, fen, claims, proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }],
      priorLead: null, green: null, beginner: false, turnHolds: new Set() });
    expect(late.pkg.spoken).toContain('endgame');
    const prior = new Set(spokenSentenceKeys(late.pkg));
    const again = decidePhaseWave([fact(sheet!)], fen, { fen, ply: 71, moveCostCp: 0, priceSettled: true, gradeSpeaks: true, midExchange: null, said: late.pkg.spoken, holds: new Set<string>() }, { ...ctx, priorKeys: prior });
    expect(again!.pkg.spoken).toBe('');
  });
});
