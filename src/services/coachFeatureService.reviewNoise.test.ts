// THE REVIEW NOISE WALK (lead 2026-10-20: "cut unnecessary narration in
// Review"), read on David's own games. Each cut is pinned on a real line:
// a one-move threat he has proven he sees, a reason formula said twice in a
// game, a structure claim said on three moves, a queen "paying" a pawn's
// price, a plain trade, a knight's square count.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent, type StudentNeedContext } from './needScore';
import type { HeatTile } from './heatMap';
import { reasonFormula } from '../utils/reasonFormula';
import { __setLocalDbForTests } from './masterPlayLookup';
import { setOpeningIdentity } from './openingIdentity';

// David's Vienna (chesscom 1038626480), White: 11…Bxg2 hits the rook on h1.
const VIENNA = 'e4 e5 Nc3 Nc6 Bc4 b6 d3 Nf6 f4 Bc5 fxe5 Nxe5 Bb3 Bb7 d4 Bb4 Bd2 Nc6 e5 Nxd4 exf6 Bxg2 Nge2 Qxf6'.split(' ');

function walk(sans: readonly string[], side: 'white' | 'black', student?: StudentNeedContext): string[] {
  const c = new Chess();
  return buildReviewSegmentsForTests(sans.map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: side === 'white' ? i % 2 === 1 : i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  }), side, null, true, 1400, [], student).map((s) => s.narration ?? '');
}

const withThreatSkill = (state: HeatTile['state']): StudentNeedContext => ({
  ...coldStudent(1400),
  heat: new Map([['missed-opponents-threat', { tag: 'missed-opponents-threat', state, hold: { posed: 20, held: 19, missed: 1, rate: 0.95 } } as unknown as HeatTile]]),
} as StudentNeedContext);

describe('review noise — a one-move threat speaks to a student who does not yet see those', () => {
  it('red: "Watch out — that bishop attacks your rook on h1" is said', () => {
    expect(walk(VIENNA, 'white', withThreatSkill('red'))[21]).toMatch(/Watch out — that bishop attacks your rook on h1/);
  }, 60_000);
  it('green (the threat skill proven): the simple threat is quiet — one table with Learn', () => {
    expect(walk(VIENNA, 'white', withThreatSkill('green'))[21]).not.toMatch(/Watch out/);
  }, 60_000);
});

// One walk per fixture game, shared by the checks below.
const walked = new Map<string, string[]>();
const walkFile = (f: string, side: 'white' | 'black'): string[] => {
  if (!walked.has(f)) { const c = new Chess(); c.loadPgn(readFileSync(`src/services/__fixtures__/${f}`, 'utf8')); walked.set(f, walk(c.history(), side)); }
  return walked.get(f) ?? [];
};

describe('review noise — said once a game', () => {
  const ONCE = /^\[(?:point|judgement|delta|does|opp-target|defence-idea|trade-idea|their-cost|their-read|rule|nugget|loose|bluff|plan-arc|timing)\] /;
  for (const [file, side] of [['SI5q0VJz.pgn', 'white'], ['VRUh4Qgh.pgn', 'black']] as const) {
    it(`${file}: no reason formula of the teaching lanes twice`, () => {
      const seen = new Map<string, number>();
      for (const n of walkFile(file, side)) {
        for (const f of n.split(/ (?=\[[a-z-]+\] )/)) {
          if (!ONCE.test(f)) continue;
          const k = reasonFormula(f.replace(/^\[[a-z-]+\] /, ''));
          if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
        }
      }
      expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
    }, 120_000);
  }
});

describe('review noise — what restates the board is not said', () => {
  it('no plain trade, no castling restated, no knight square count (David\'s Vienna)', () => {
    const w = walk(VIENNA, 'white').join(' ');
    expect(w).not.toMatch(/and (?:you|they) can take back|the material is level again/);
    expect(w).not.toMatch(/touches eight squares/);
  }, 60_000);
  it('a queen never "pays the price" of a pawn move', () => {
    for (const [file, side] of [['SI5q0VJz.pgn', 'white'], ['VRUh4Qgh.pgn', 'black']] as const) {
      expect(walkFile(file, side).join(' ')).not.toMatch(/pays that price: your (?:queen|rook|king)/);
    }
  }, 120_000);
});

describe('review noise — Carlsen–Grischuk, Norway 2015 (lichess jMVMo1Ua), student White (lead\'s prod walk)', () => {
  const pgn = readFileSync('src/services/__fixtures__/jMVMo1Ua.pgn', 'utf8');
  const evals = [...pgn.matchAll(/%eval (#?-?[\d.]+)/g)].map((m) => (m[1].startsWith('#') ? (m[1].includes('-') ? -2000 : 2000) : Math.round(parseFloat(m[1]) * 100)));
  let segs: ReturnType<typeof buildReviewSegmentsForTests> | null = null;
  const run = (): ReturnType<typeof buildReviewSegmentsForTests> => {
    if (segs) return segs;
    const c = new Chess(); c.loadPgn(pgn); const sans = c.history();
    const d = new Chess(); let prev = 20;
    segs = buildReviewSegmentsForTests(sans.map((san, i) => {
      d.move(san); const ev = evals[i] ?? prev; const loss = (prev - ev) * (i % 2 === 0 ? 1 : -1);
      const cls = i < 16 ? 'book' : loss >= 300 ? 'blunder' : loss >= 100 ? 'mistake' : loss >= 50 ? 'inaccuracy' : 'good';
      const r = { ply: i + 1, san, fenAfter: d.fen(), isCoachMove: i % 2 === 1, classification: cls, preMoveEval: prev, evaluation: ev, bestMove: null } as unknown as ReviewMoveInput;
      prev = ev; return r;
    }), 'white', null, true, 1400);
    return segs;
  };
  const text = (): string[] => run().map((s) => s.narration ?? '');
  it('every move job names whose piece it is (no bare "Takes back on c4, and the material is level again")', () => {
    for (const n of text()) for (const f of n.split(/ (?=\[[a-z-]+\] )/)) if (f.startsWith('[move-job] ')) expect(f).toMatch(/\b(?:your|their|you|they)\b/);
  }, 120_000);
  it('every move job has a subject — the move that does it (prod Review 2026-10-29: "Joins your bishop on g5 against their knight on f4")', () => {
    let jobs = 0;
    for (const n of text()) for (const f of n.split(/ (?=\[[a-z-]+\] )/)) {
      if (!f.startsWith('[move-job] ')) continue;
      jobs += 1;
      const body = f.slice('[move-job] '.length);
      // A standing leads its job ("A rare book move — …: it attacks …").
      if (!body.includes(': ')) expect(body).toMatch(/^(?:Your|Their) \S+ /);
    }
    expect(jobs).toBeGreaterThan(0);
  }, 120_000);
  it('says your/their, never "the enemy" or "ever"; the opponent\'s plan never takes "their" pawn', () => {
    const w = text().join(' ');
    expect(w).not.toMatch(/\benemy\b|can ever cover/);
    expect(w).not.toMatch(/take their \w+ when it arrives/);
  }, 120_000);
  it('a plan whose target left is not credited a step on the same move (32…c4)', () => {
    for (const n of text()) if (/That plan is off/.test(n)) expect(n).not.toMatch(/was a step of the plan/);
  }, 120_000);
  it('no reason formula of the teaching lanes twice (timing, tied down, …)', () => {
    const ONCE = /^\[(?:point|judgement|delta|does|opp-target|defence-idea|trade-idea|their-cost|their-read|rule|nugget|loose|bluff|plan-arc|timing)\] /;
    const seen = new Map<string, number>();
    for (const n of text()) for (const f of n.split(/ (?=\[[a-z-]+\] )/)) {
      if (!ONCE.test(f)) continue;
      const k = reasonFormula(f.replace(/^\[[a-z-]+\] /, ''));
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
  }, 120_000);
});

describe('review noise — one claim, one producer; the need score past the opening', () => {
  it('David\'s Rossolimo 5…b5: "Your b5 kicks their bishop off a4" — never also "Attacks their bishop on a4"', () => {
    const w = walk('e4 c5 Nf3 Nc6 Bb5 e6 c3 a6 Ba4 b5'.split(' '), 'black');
    expect(w[9]).toMatch(/off a4/);
    expect(w[9]).not.toMatch(/\[move-job\] (?:Your \S+ )?[Aa]ttacks their bishop on a4/);
  }, 60_000);
  it('past the opening a move job speaks only where the need score asked for teaching (SI5q0VJz, no slip graded)', () => {
    // The real masters file: the book's end is where the old story tail began.
    __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')) as never);
    const c = new Chess(); c.loadPgn(readFileSync('src/services/__fixtures__/SI5q0VJz.pgn', 'utf8'));
    const d = new Chess();
    const segs = buildReviewSegmentsForTests(c.history().map((san, i) => { d.move(san); return { ply: i + 1, san, fenAfter: d.fen(), isCoachMove: i % 2 === 1, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; }), 'white', null, true, 1400);
    const late = segs.filter((g) => g.ply > 30 && /\[move-job\]/.test(g.narration ?? ''));
    __setLocalDbForTests(null);
    for (const g of late) expect(g.need?.speak).toBe(true);
  }, 120_000);
});

describe('review noise — the masters\' plan is one claim (David\'s Old Sicilian, chesscom 1042725180)', () => {
  it('"The plan in this structure: their break is d4" is said once, not with the name and again later', () => {
    setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
    __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')) as never);
    const sans = 'e4 c5 Nf3 Nc6 d3 d6 Be2 g6 c4 Bg7 Nc3 Nf6 h3 O-O O-O a6 Nd5 Nd7 Rb1 e6'.split(' ');
    const w = walk(sans, 'black').join(' ');
    __setLocalDbForTests(null);
    expect(w.match(/The plan in this structure/g) ?? []).toHaveLength(1);
  }, 120_000);
});

describe('review noise — a rebuild mid-walk keeps what the walk already said (game 3 re-walk, 2026-10-20)', () => {
  it('a say-once key the walk spoke before the swap is not committed again after it', () => {
    const full = walk(VIENNA, 'white');
    const c = new Chess();
    const inputs = VIENNA.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 1, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const segs = buildReviewSegmentsForTests(inputs, 'white', null, true, 1400);
    expect(full.length).toBeGreaterThan(0);
    // A key the build commits late — as if the walk had already said it early.
    const late = segs.filter((s) => s.ply > 8).flatMap((s) => (s.ledgerKeys ?? []).map((k) => ({ k, ply: s.ply })));
    expect(late.length).toBeGreaterThan(0);
    const { k } = late[0];
    const seeded = buildReviewSegmentsForTests(inputs, 'white', null, true, 1400, [], undefined, null, new Map(), new Map(), { throughPly: 8, keys: new Set([k]) });
    expect(seeded.filter((s) => s.ply > 8).flatMap((s) => s.ledgerKeys ?? [])).not.toContain(k);
  }, 60_000);
});
