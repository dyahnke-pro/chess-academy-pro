// The opening's plan, counted off master games (WO-TEACH-GAPS P2 #0).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { mastersPlanRead, mastersPlanLine, MIN_ROOT_GAMES, type MovesAt } from './mastersPlanRead';

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
    expect(mastersPlanLine(r, 'b')?.text).toBe('The plan in this structure: your break is …c5 — masters from here play it in about 90% of games.');
    expect(mastersPlanLine(r, 'w')?.text).toBe('The plan in this structure: their break is …c5 (90%).');
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
