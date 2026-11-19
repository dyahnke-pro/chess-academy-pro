/**
 * The engine-backed computers on the difference reader's futures (WO-PICTURE-01):
 * Danya's try boards, the reads a local Stockfish (depth 12, MultiPV 3) and the
 * Lichess tablebase made, stored (`__fixtures__/engineFutures.json`, recorded
 * by `engineComputers.record.measure.test.ts`) and replayed with no engine.
 */
import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/engineFutures.json';
import { recordedEngine, type EngineLog } from '../test/engineReads';
import { engineFutureFacts, whatChanged, changeReason, changeReasonWithEngine, type LineRead, type EngineFutureFacts } from './futures';
import { readEngineComputers, ENGINE_COMPUTERS } from './engineComputers';
import { BUNDLE_ADAPTERS } from './boardBundle';
import { threatPurpose } from './threatPurpose';
import { pvLineFromUci } from './pvPlayback';
import type { Color } from 'chess.js';

interface Row { id: string; try: string; args: { fen: string; student: Color; rating: number; tryLine: LineRead; bestLine: LineRead } }
const rows = (fixture as unknown as { rows: Row[] }).rows;
const log = (fixture as unknown as { log: EngineLog }).log;
const engine = recordedEngine(log);
const row = (id: string, student?: Color): Row => {
  const r = rows.find((x) => x.id === id && (!student || x.args.student === student));
  if (!r) throw new Error(id);
  return r;
};
const said = (m: EngineFutureFacts, side: 'onTry' | 'onBest', computer: string): string[] =>
  [...(m[side].reply ?? []), ...(m[side].quiet ?? [])].filter((f) => f.computer === computer).map((f) => f.text);

describe('the engine-backed computers on the futures', () => {
  it('every computer read here is one the pure bundle leaves out, and says what it needs', () => {
    for (const id of Object.keys(ENGINE_COMPUTERS) as Array<keyof typeof ENGINE_COMPUTERS>) {
      const a = BUNDLE_ADAPTERS[id];
      expect(typeof a, id).not.toBe('function');
    }
  });

  it('zugzwang: the try walks into it (in pursuit of zugzwang, Kc8 c7) — both seats, never on the best line', async () => {
    // Tablebase: 2k5/2P5/p2K4/P7 b — Black to move loses, White to move draws.
    const black = await engineFutureFacts(row('in-pursuit-of-zugzwang#0@ply6', 'b').args, engine);
    expect(said(black, 'onTry', 'readZugzwang')).toContain('Zugzwang: on your move this loses. If it were their move, you would hold the draw. In pawn endings, who has to move decides it.');
    expect(said(black, 'onBest', 'readZugzwang')).toEqual([]);
    const white = await engineFutureFacts(row('in-pursuit-of-zugzwang#0@ply6', 'w').args, engine);
    expect(said(white, 'onTry', 'readZugzwang')).toContain('You put them in zugzwang: on their move it loses for them. If they could pass, they would hold. Every move they make now gives ground.');
    // …and it is a difference the reader sees: on the try's board, not the best's.
    const wc = whatChanged(row('in-pursuit-of-zugzwang#0@ply6', 'b').args, black);
    expect(wc.appeared.some((c) => c.fact.computer === 'readZugzwang')).toBe(true);
    // The pure read never had it.
    const pure = whatChanged(row('in-pursuit-of-zugzwang#0@ply6', 'b').args);
    expect(pure.appeared.some((c) => c.fact.computer === 'readZugzwang')).toBe(false);
  });

  it('threatPurpose: the rook sacrifice on b2 is really mate (turn off the autopilot, best line)', async () => {
    const m = await engineFutureFacts(row('turn-off-the-autopilot#1').args, engine);
    expect(said(m, 'onBest', 'threatPurpose')).toContain('Your Rbxb2+ looks aimed at their pawn on b2, but its real point is mate.');
    expect(said(m, 'onTry', 'threatPurpose')).toEqual([]);
  });

  it('leansOn: both seats, a supporter that really holds the piece', async () => {
    const p = await engineFutureFacts(row('petrosians-exchange-sacrifices-explained#0').args, engine);
    expect(said(p, 'onTry', 'computeLeansOn')).toContain("Their bishop on d3 is their best piece — but it leans on the pawn on c4. Take that away and it's ordinary.");
    const m = await engineFutureFacts(row('modern-chess-technique#1').args, engine);
    expect(said(m, 'onTry', 'computeLeansOn')).toContain('Your bishop on f3 does its work because your pawn on g2 holds it there — keep that pawn in place.');
  });

  it('moveThreatDeep: the reply\'s threat two moves deep (Kc7 Kd5, with Kb6 to follow)', async () => {
    const m = await engineFutureFacts(row('in-pursuit-of-zugzwang#0').args, engine);
    expect(said(m, 'onTry', 'moveThreat')).toContain('They played Kd5 — it threatens to win a pawn: they play Kc5 and, two moves later, they play Kxa6.');
  });

  it('followUpFirst: the order the line keeps, read off the swapped board', async () => {
    const m = await engineFutureFacts(row('in-pursuit-of-zugzwang#1').args, engine);
    expect(said(m, 'onBest', 'moveOrder')).toContain('They get the order right: g4 before Rd7, because Rd7 at once would have walked into your …g5#.');
  });

  it('a reason the pure reader could not find, found with the engine', async () => {
    const r = row('in-pursuit-of-zugzwang#0');
    const args = { ...r.args, other: 'their' as const };
    expect(changeReason(args)).toBeNull();
    expect(await changeReasonWithEngine(args, engine)).toBe('They played Kd5 — it threatens to win a pawn: they play Kc5 and, two moves later, they play Kxa6.');
  });

  it('negative control: no tablebase and no eval table, no zugzwang and no leans-on', async () => {
    const bare = { analyzePosition: engine.analyzePosition };
    const z = await engineFutureFacts(row('in-pursuit-of-zugzwang#0@ply6', 'b').args, bare);
    expect(said(z, 'onTry', 'readZugzwang')).toEqual([]);
    const l = await engineFutureFacts(row('petrosians-exchange-sacrifices-explained#0').args, bare);
    expect(said(l, 'onTry', 'computeLeansOn')).toEqual([]);
  });

  it('negative control: a failed read says nothing', async () => {
    const broken = { analyzePosition: async (): Promise<never> => { throw new Error('down'); } };
    const r = row('in-pursuit-of-zugzwang#0').args;
    const facts = await readEngineComputers({ fen: r.fen, student: r.student, lines: [], rating: 1800, history: [], priorMove: null, priorMoveSeat: null, priorLines: null }, broken);
    expect(facts).toEqual([]);
  });

  it('threatPurpose names no pawn the other side walked into the line (the chess investigator, gxh3 Re8)', () => {
    // Qh5 a5 Kh1 a4 Qg4+ Rg6 Qxa4: Black pushed the pawn itself; it was never the queen's point.
    const line = pvLineFromUci('4r1k1/pp3p2/2qr3p/3pQ3/8/1B1P3P/PPP2P2/2R2RK1 w - - 1 22', ['e5h5', 'a7a5', 'g1h1', 'a5a4', 'h5g4', 'd6g6', 'g4a4']);
    expect(line).not.toBeNull();
    expect(threatPurpose(line!, 'w')).toBeNull();
  });
});
