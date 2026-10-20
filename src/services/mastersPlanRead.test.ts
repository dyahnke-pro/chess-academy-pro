// The opening's plan, counted off master games (WO-TEACH-GAPS P2 #0).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { mastersPlanRead, mastersPlanLine, planStillAhead, mastersBreakIdea, MIN_ROOT_GAMES, type MovesAt, type MastersPlanRead } from './mastersPlanRead';

const key = (f: string): string => f.split(' ').slice(0, 4).join(' ');
const fenOf = (line: string): string => { const c = new Chess(); line.split(' ').filter(Boolean).forEach((m) => c.move(m)); return c.fen(); };
const tree = (t: Record<string, Array<[string, number]>>): MovesAt => {
  const byKey = new Map(Object.entries(t).map(([line, ms]) => [key(fenOf(line)), ms.map(([san, games]) => ({ san, games }))]));
  return (fen) => byKey.get(key(fen)) ?? null;
};

describe('mastersPlanRead — the break master games go for', () => {
  it('names the break by its share of games, from the student seat', () => {
    const at = tree({
      'e4 e6 d4 d5 e5': [['c5', 900], ['Nc6', 100]],
      'e4 e6 d4 d5 e5 c5': [['c3', 800], ['Nf3', 200]],
      'e4 e6 d4 d5 e5 Nc6': [['Nf3', 100]],
    });
    const r = mastersPlanRead(fenOf('e4 e6 d4 d5 e5'), at);
    expect(r?.black?.san).toBe('c5');
    expect(r!.black!.share).toBeCloseTo(0.9, 2);
    expect(mastersPlanLine(r, 'b', null)?.text).toBe('The plan in this structure: your break is …c5 — masters from here almost always play it.');
    expect(mastersPlanLine(r, 'w', null)?.text).toBe('The plan in this structure: their break is …c5.');
  });

  it('taking the pawn that just arrived answers their break — it is not a break (walk 2026-09-30)', () => {
    const at = tree({
      'e4 e5 Nf3 Nc6 Nc3 Nf6': [['d3', 1000]],
      'e4 e5 Nf3 Nc6 Nc3 Nf6 d3': [['d5', 1000]],
      'e4 e5 Nf3 Nc6 Nc3 Nf6 d3 d5': [['exd5', 1000]],
    });
    const r = mastersPlanRead(fenOf('e4 e5 Nf3 Nc6 Nc3 Nf6'), at);
    expect(r?.black?.san).toBe('d5');
    expect(r?.white ?? null).toBeNull();
  });

  it('a recapture is not a break, and a capture in hand is not a plan', () => {
    const at = tree({
      'd4 d5 c4 e6': [['Nc3', 1000]],
      'd4 d5 c4 e6 Nc3': [['Nf6', 1000]],
      'd4 d5 c4 e6 Nc3 Nf6': [['cxd5', 900], ['Bg5', 100]],
      'd4 d5 c4 e6 Nc3 Nf6 cxd5': [['exd5', 900]],
    });
    const r = mastersPlanRead(fenOf('d4 d5 c4 e6'), at);
    expect(r?.white?.san).toBe('cxd5');
    expect(r?.black).toBeNull();
    // The same exchange as the very next move is taking, not a plan.
    expect(mastersPlanRead(fenOf('d4 d5 c4 e6 Nc3 Nf6'), at)?.white ?? null).toBeNull();
  });

  it('silent below the game floor and when no break reaches the share', () => {
    const thin = tree({ 'e4 e6 d4 d5 e5': [['c5', MIN_ROOT_GAMES - 10]] });
    expect(mastersPlanRead(fenOf('e4 e6 d4 d5 e5'), thin)).toBeNull();
    const split = tree({ 'e4 e5 Nf3 Nc6': [['Bb5', 400], ['Bc4', 350], ['d4', 250]] });
    expect(mastersPlanRead(fenOf('e4 e5 Nf3 Nc6'), split)?.white?.san ?? null).not.toBe('Bb5');
  });

  it.runIf(existsSync('public/data/openings-masters-db.json'))('real masters data: the French Advance break is …c5', () => {
    const raw = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8'));
    const pos = raw.positions ?? raw;
    const at: MovesAt = (f) => { const v = pos[key(f)]; return Array.isArray(v) ? v : v?.moves ?? null; };
    const r = mastersPlanRead(fenOf('e4 e6 d4 d5 e5'), at);
    expect(r?.black?.san).toBe('c5');
    expect(r!.black!.share).toBeGreaterThan(0.8);
  }, 120_000);
});

describe('a plan read off another board keeps only what lies ahead (Alekhine walk 2026-10-19)', () => {
  const plan: MastersPlanRead = {
    games: 100, white: { san: 'c4', square: 'c4', from: 'c2', share: 0.6 }, black: { san: 'd6', square: 'd6', from: 'd7', share: 0.7 },
    whitePiece: null, blackPiece: { piece: 'n', from: 'b8', to: 'c6', san: 'Nc6', share: 0.5 }, whiteCastle: null, blackCastle: null,
  };
  it('drops a break already played and keeps the rest', () => {
    const c = new Chess(); for (const m of ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6']) c.move(m);
    const r = planStillAhead(plan, c.fen());
    expect(r?.black).toBeNull();
    expect(r?.white?.san).toBe('c4');
    expect(r?.blackPiece?.san).toBe('Nc6');
    expect(mastersPlanLine(r, 'w', null)?.text ?? '').not.toMatch(/d6/);
  });
  it('NEGATIVE CONTROL: before the break it still speaks', () => {
    const c = new Chess(); for (const m of ['e4', 'Nf6', 'e5', 'Nd5', 'd4']) c.move(m);
    expect(planStillAhead(plan, c.fen())?.black?.san).toBe('d6');
  });
});

describe('a live board holds the student plan step that is their next move (David replay 2026-10-19, move 3)', () => {
  // 1.e4 c5 2.d4 cxd4 3.c3 dxc3 — White to move, Bc4 legal: "your bishop on f1
  // usually goes to c4 (Bc4)" named his next move.
  const fen = 'rnbqkbnr/pp1ppppp/8/8/4P3/2p5/PP3PPP/RNBQKBNR w KQkq - 0 4';
  const read = { white: null, black: null, whitePiece: { piece: 'b', from: 'f1', to: 'c4', san: 'Bc4', weight: 1 }, blackPiece: null } as unknown as MastersPlanRead;
  it('held on the live board, named in review', () => {
    expect(mastersPlanLine(read, 'w', fen)).toBeNull();
    expect(mastersPlanLine(read, 'w', null)?.text).toMatch(/c4/);
  });
});

describe('mastersBreakIdea — the key break as an idea (opening model beat 8)', () => {
  // Najdorf English Attack after …e5 / …Be6: master games go for …d5.
  const line = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7';
  const read: MastersPlanRead = { games: 5000, white: null, black: { san: 'd5', square: 'd5', from: 'd6', share: 0.6 }, whitePiece: null, blackPiece: null, whiteCastle: null, blackCastle: null };
  it('says what the break CHANGES — it takes away the hole the structure left', () => {
    const idea = mastersBreakIdea(read, 'b', fenOf(line), ['d5']);
    expect(idea?.text).toBe('The break that changes this structure is …d5: a pawn on d5 changes the structure and takes away the hole there. Masters from here usually get it in.');
    expect(idea?.move).toEqual({ from: 'd6', to: 'd5' });
    expect(idea?.aim).toBe('plan-aim:break:d5');
  });
  it('says nothing once the break is on the board, and nothing for the other seat', () => {
    expect(mastersBreakIdea(read, 'b', fenOf(`${line} Qd2 d5`), ['d5'])).toBeNull();
    expect(mastersBreakIdea(read, 'w', fenOf(line), [])).toBeNull();
  });
});
