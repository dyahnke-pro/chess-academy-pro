import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples, FUNDAMENTAL_TAG } from './principleAttribution';
import { renderFundamentalVerdict, verdictAlone } from './principleVoice';
import { fundamentalLines } from './learnFundamentalNarration';
import { computeMoveFundamentals } from './moveFundamentals';


// REMOVE THE GUARD, both ways (David 2026-10-13: "All computers MUST work both
// ways"). A real game (GothamChess, Two Knights, model game
// mg-pro-gothamchess-italian-zackyy-twoknights): after 7…Qxd5 the knight on e4
// is held by the queen alone, and Nc3 chases the queen off — the knight falls.
const TO_QXD5 = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4', 'Re1', 'd5', 'Bxd5', 'Qxd5'];
const fenAt = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('missed-guard-removal — FOR the student', () => {
  it('names the chase they skipped when Nc3 was the move and they played h3', () => {
    const out = attributePrinciples({
      historySans: [...TO_QXD5, 'h3'], bestSan: 'Nc3', classification: 'mistake',
      replySan: null, pvAfterPlayed: ['Nf6'],
    });
    const a = out.find((x) => x.id === 'missed-guard-removal');
    expect(a, JSON.stringify(out.map((x) => x.id))).toBeTruthy();
    expect(a!.tag).toBe(FUNDAMENTAL_TAG['missed-guard-removal']);
    expect(a!.tag).toBe('missed-your-guard-removal');
    expect(a!.facts).toMatchObject({ better: 'Nc3', piece: 'knight', square: 'e4', guard: 'queen', guardSq: 'd5', chase: 1 });
    const v = verdictAlone(renderFundamentalVerdict([a!], { replySan: null, ply: 0, seen: new Set() }));
    expect(v).toMatch(/one guard/);
    expect(v).not.toMatch(/\b(we|our|us)\b/i);
    expect(fundamentalLines(a!, fenAt(TO_QXD5), 'h3', true)[0]?.sans).toEqual(['Nc3']);
  });

  it('silent when the student PLAYED the removal', () => {
    const out = attributePrinciples({
      historySans: [...TO_QXD5, 'Nc3'], bestSan: 'Rxe4', classification: 'inaccuracy', replySan: null,
    });
    expect(out.map((x) => x.id)).not.toContain('missed-guard-removal');
  });

  it('silent while the chance still stands after their reply (not missed yet)', () => {
    const out = attributePrinciples({
      historySans: [...TO_QXD5, 'h3'], bestSan: 'Nc3', classification: 'mistake',
      replySan: null, pvAfterPlayed: ['a6'],
    });
    expect(out.map((x) => x.id)).not.toContain('missed-guard-removal');
  });
});

describe('ignored-guard-removal — AGAINST the student', () => {
  it('names their chase when the student left the knight with one guard', () => {
    const out = attributePrinciples({
      historySans: TO_QXD5, bestSan: 'Be6', classification: 'mistake', replySan: 'Nc3',
    });
    const a = out.find((x) => x.id === 'ignored-guard-removal');
    expect(a, JSON.stringify(out.map((x) => x.id))).toBeTruthy();
    expect(a!.tag).toBe('missed-opponents-threat');
    expect(a!.facts).toMatchObject({ hit: 'Nc3', played: 1, piece: 'knight', square: 'e4', guard: 'queen', guardSq: 'd5', chase: 1 });
    const v = verdictAlone(renderFundamentalVerdict([a!], { replySan: 'Nc3', ply: 0, seen: new Set() }));
    expect(v).toMatch(/Your knight on e4 had one guard, the queen on d5/);
    expect(v).toMatch(/Nc3 chased it off/);
  });

  it('silent when the reply is not a removal', () => {
    const out = attributePrinciples({
      historySans: TO_QXD5, bestSan: 'Be6', classification: 'mistake', replySan: 'h3',
    });
    expect(out.map((x) => x.id)).not.toContain('ignored-guard-removal');
  });
});

describe('remove-guard — the green half (the student played it)', () => {
  it('Nc3 is read as removing the guard, and the softer pressure read steps aside', () => {
    const f = computeMoveFundamentals(fenAt(TO_QXD5), 'Nc3', 'white');
    const rg = f.find((x) => x.id === 'remove-guard');
    expect(rg?.led).toMatch(/chases their queen on d5, the only guard of the knight on e4/);
    expect(f.filter((x) => x.id === 'attack-defender' && x.squares[1] === 'd5')).toEqual([]);
  });
});
