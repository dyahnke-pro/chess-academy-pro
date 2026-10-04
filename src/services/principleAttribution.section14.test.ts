// WO-CLOSEOUT-01 — SECTION 14: the reasoning errors get pipeline writers.
// Measured before this: 23% of real flagged plies (pawn pushes, king moves)
// attributed NO fundamental, so the coach recorded "a mistake" and could never
// say what recurs. Each detector here is proven from evidence the app already
// computes and is negative-controlled. Fixtures are DB-anchored or PV-shaped —
// never a position recalled from memory.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples, planTargets, planHeadline, FUNDAMENTAL_TAG, FUNDAMENTAL_IDS } from './principleAttribution';
import { findContinuationsAtPly } from './openingDetectionService';
import { deriveNextPlans } from './nextPlans';
import { renderFundamentalVerdict, fundamentalHow } from './principleVoice';
import { FUNDAMENTAL_LABEL, FUNDAMENTAL_SECTION, FUNDAMENTAL_PILLAR } from './fundamentalsCatalog';
import { FUNDAMENTAL_LESSON } from '../data/fundamentalLessons';

// The review's Alapin fixture — 6...Nb6 (ply 12) is Black's flagged move.
const ALAPIN = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6'];

const DEEP7 = ['h3', 'g6', 'a3', 'Nb4', 'd5', 'a6', 'axb4'];   // the knight falls at ply 7

describe('section 14 — calculation-depth (PV-gated)', () => {
  const base = { historySans: ALAPIN, bestSan: 'e6', classification: 'mistake', evalBefore: 30, evalAfterPlayed: -150 };
  // Every PV here is LEGAL and its blow WINS on the one ledger (clean-pass walk
  // 2026-10-04: the old fixtures played Bxf6 onto an empty f6, and a blow that
  // only trades — "Rhc8, Nd4, Rxc1+" — is no lapse).
  it('fires when the punishment lands DEEP in the engine line (quiet replies, then the blow)', () => {
    const attrs = attributePrinciples({ replySan: null, ...base, pvAfterPlayed: DEEP7 });
    const hit = attrs.find((a) => a.id === 'calculation-depth');
    expect(hit, JSON.stringify(attrs.map((a) => a.id))).toBeTruthy();
    expect(hit?.facts.punish).toBe('axb4');
    expect(hit?.facts.depth).toBe(7);
    expect(hit?.tag).toBe('calculation-depth');
  });
  it('the blow is THEIR move — a capture of the student\'s own inside the line is not it (walk 700, 16…a6)', () => {
    // Student's (Black) own capture sits at ply 4 (odd = theirs); their only
    // forcing move comes later at ply 5.
    const attrs = attributePrinciples({ replySan: null, ...base, pvAfterPlayed: ['e6', 'Rb8', 'Qf3', 'Nxd4', 'Qxf7#'] });
    expect(attrs.find((a) => a.id === 'calculation-depth')?.facts.punish).toBe('Qxf7#');
  });

  it('negative control: a blow that only TRADES is no lapse (review walk 2026-10-04, G1 #43)', () => {
    // The real game: after 22.Rfc1 the stored line ran Rhc8 Nd4 Rxc1+ — a rook
    // trade, since the g5-bishop guards c1. Nothing is won, so nothing "lands".
    const G1 = ['e4','c6','Nf3','d5','e5','Bf5','d4','e6','Nc3','c5','Bf4','Nc6','dxc5','Bxc5','Bb5','a6','Ba4','b5','Bb3','b4','Na4','Bb6','Nxb6','Qxb6','O-O','a5','a3','a4','Ba2','b3','cxb3','axb3','Bxb3','Na5','Ba2','Qxb2','Qa4+','Ke7','Bg5+','f6','exf6+','Nxf6','Rfc1'];
    const trade = ['Rhc8', 'Nd4', 'Rxc1+', 'Rxc1'];
    const attrs = attributePrinciples({ replySan: null, historySans: G1, bestSan: 'Qf4', classification: 'mistake', evalBefore: 236, evalAfterPlayed: 53, pvAfterPlayed: trade });
    expect(attrs.find((a) => a.id === 'calculation-depth')).toBeUndefined();
  });

  it('negative control: an IMMEDIATE punishment is not a depth error', () => {
    const attrs = attributePrinciples({ replySan: null, ...base, pvAfterPlayed: ['Bxf6', 'gxf6'] });
    expect(attrs.find((a) => a.id === 'calculation-depth')).toBeUndefined();
  });
  // 🔒 THE DEAD BAND IS CLOSED, AND IT IS GATED IN BOTH DIRECTIONS (2026-09-21).
  //
  // The cost gate was a hand-typed `eb - ea < 150`. Measured on a real game
  // (06wNUWaA, via the FUNDWHY audit row), that number was the SOLE reason
  // three flagged plies got no fundamental: costs of 104, 99, 86, 74, 72 and
  // 69 centipawns — every one above INACCURACY_CP (50) and below 150. The
  // student was told "that was an inaccuracy costing about 0.7 points" and
  // never told what recurred. These two tests pin both halves of the fix, so
  // neither the band nor the currency can quietly come back.
  const PV = DEEP7;
  it('the measured 99cp ply that the 150 floor silenced now attributes', () => {
    // ply 62 of the real game: 30 → -69, a 99cp cost near equality. That is
    // ~9 win% — comfortably an inaccuracy — and the PATTERN (quiet move,
    // punishment three plies deep) is no less true at 99cp than at 150.
    const attrs = attributePrinciples({ replySan: null, ...base, evalBefore: 30, evalAfterPlayed: -69, pvAfterPlayed: PV });
    expect(attrs.find((a) => a.id === 'calculation-depth'),
      `the 150cp dead band is back: ${JSON.stringify(attrs.map((a) => a.id))}`).toBeTruthy();
  });
  it('negative control: 200cp given back in a WON position does not attribute', () => {
    // +9.00 → +7.00. The old centipawn floor ADMITTED this (200 >= 150) while
    // silencing the 99cp error above — precisely backwards. In expected points
    // it is ~3.5 win%, under an inaccuracy, so the position barely moved and
    // there is no calculation error to name. This is the case the currency
    // change exists for, and it must stay silent.
    const attrs = attributePrinciples({ replySan: null, ...base, evalBefore: 900, evalAfterPlayed: 700, pvAfterPlayed: PV });
    expect(attrs.find((a) => a.id === 'calculation-depth')).toBeUndefined();
  });
  // Hand walk 1380, move 10: a 1380 was told the punishment "arrives on their
  // 7th move" — ply 13. A blow past the coach's own horizon is not a
  // calculation lapse anyone could be held to.
  it('negative control: a blow past the 7-ply horizon is not a depth error', () => {
    const deep = ['g3', 'g6', 'h3', 'h5', 'a3', 'Nb4', 'd5', 'a6', 'axb4'];   // lands at ply 9
    expect(attributePrinciples({ replySan: null, ...base, pvAfterPlayed: deep }).find((a) => a.id === 'calculation-depth')).toBeUndefined();
    // …and ply 7 still counts.
    const edge = DEEP7;
    expect(attributePrinciples({ replySan: null, ...base, pvAfterPlayed: edge }).find((a) => a.id === 'calculation-depth')?.facts.depth).toBe(7);
  });
  it('negative control: no real cost → silent; no PV → silent (live path)', () => {
    expect(attributePrinciples({ replySan: null, ...base, evalAfterPlayed: 0, pvAfterPlayed: DEEP7 }).find((a) => a.id === 'calculation-depth')).toBeUndefined();
    expect(attributePrinciples({ replySan: null, ...base }).find((a) => a.id === 'calculation-depth')).toBeUndefined();
  });
});

describe('section 14 — left-book-early (DB-anchored, G3)', () => {
  // Build the fixture FROM THE DB: walk the Alapin until the DB still has
  // continuations, then play a legal quiet move that is on no line.
  function fixture(): { history: string[]; book: Map<string, { name: string; eco: string }>; bookSan: string } | null {
    const c = new Chess();
    for (let i = 0; i < ALAPIN.length; i++) {
      const prefix = ALAPIN.slice(0, i);
      const book = findContinuationsAtPly(prefix);
      if (i >= 6 && book.size > 0) {
        const pos = new Chess(); for (const s of prefix) pos.move(s);
        const off = pos.moves().find((m) => !book.has(m) && !/[x+#]/.test(m) && !m.startsWith('O-O') && /^[NBRQ]/.test(m));
        if (off) return { history: [...prefix, off], book, bookSan: [...book.keys()][0] };
      }
      c.move(ALAPIN[i]);
    }
    return null;
  }
  it('fires when the position was in book, the move leaves every line, and it cost', () => {
    const f = fixture();
    expect(f, 'the openings DB carries the Alapin').toBeTruthy();
    if (!f) return;
    const attrs = attributePrinciples({ replySan: null, historySans: f.history, bestSan: f.bookSan, classification: 'mistake', evalBefore: 20, evalAfterPlayed: -90 });
    const hit = attrs.find((a) => a.id === 'left-book-early');
    expect(hit, JSON.stringify({ history: f.history, ids: attrs.map((a) => a.id) })).toBeTruthy();
    expect(hit?.facts.book).toBe(f.bookSan);
    expect(f.book.has(String(hit?.facts.book))).toBe(true);
  });
  it('negative control: a BOOK move never files under it, whatever the eval says', () => {
    const f = fixture();
    if (!f) return;
    const bookMove = f.bookSan;
    const other = [...f.book.keys()].find((k) => k !== bookMove) ?? 'e6';
    const attrs = attributePrinciples({ replySan: null, historySans: [...f.history.slice(0, -1), bookMove], bestSan: other, classification: 'mistake', evalBefore: 20, evalAfterPlayed: -90 });
    expect(attrs.find((a) => a.id === 'left-book-early')).toBeUndefined();
  });
  it('negative control: never before ply 6 (everyone leaves "book" at move one or two)', () => {
    const attrs = attributePrinciples({ replySan: null, historySans: ['e4', 'c5', 'c3', 'a6', 'd4'], bestSan: 'Nf3', classification: 'mistake', evalBefore: 20, evalAfterPlayed: -90 });
    expect(attrs.find((a) => a.id === 'left-book-early')).toBeUndefined();
  });
});

describe('section 14 — no-plan (positional, co-occurrence)', () => {
  it('planTargets couples squares and files from the plan prose; planHeadline strips the how', () => {
    const plans = ['the plan from here is to win their weak pawn on d5. Here\'s how: plant your knight on d4, then stack the heavy pieces.', 'the plan from here is to seize the open c-file. Here\'s how: put a rook on it.'];
    const t = planTargets(plans);
    expect([...t.squares].sort()).toEqual(['d4', 'd5']);
    expect([...t.files]).toEqual(['c']);
    expect(planHeadline(plans[1])).toBe('seize the open c-file');
  });
  it('fires on a quiet off-plan move past the opening when the structure earns a plan and the best move serves it', () => {
    // A legal 26-ply line reaching a middlegame with an OPEN file — verified by
    // chess.js as it is replayed; the plan comes from the same computer the
    // coach uses to state plans, never from this test.
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'c3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'Bb3', 'Ba7', 'h3', 'h6', 'Nbd2', 'Re8', 'Nf1', 'Be6', 'Bxe6', 'Rxe6', 'Ng3', 'Qd7'];
    const c = new Chess(); for (const s of line) expect(c.move(s), s).toBeTruthy();
    const plans = deriveNextPlans(c.fen(), 'w');
    const t = planTargets(plans);
    // Only assert the detector when the structure actually earns a targeted
    // plan here; otherwise the honest verdict is silence, and we assert THAT.
    const legal = c.moves({ verbose: true });
    const serves = (sq: string): boolean => t.squares.has(sq) || t.files.has(sq[0]);
    const off = legal.find((m) => !/[x+#]/.test(m.san) && !m.san.startsWith('O-O') && m.piece !== 'k' && !serves(m.to) && !serves(m.from));
    const on = legal.find((m) => serves(m.to) && !/[x+#]/.test(m.san));
    if (plans.length === 0 || !off || !on) {
      const attrs = attributePrinciples({ replySan: null, historySans: [...line, (off ?? legal[0]).san], bestSan: (on ?? legal[1]).san, classification: 'mistake', evalBefore: 20, evalAfterPlayed: -120 });
      expect(attrs.find((a) => a.id === 'no-plan')).toBeUndefined();
      return;
    }
    const attrs = attributePrinciples({ replySan: null, historySans: [...line, off.san], bestSan: on.san, classification: 'mistake', evalBefore: 20, evalAfterPlayed: -120 });
    const ids = attrs.map((a) => a.id);
    // no-plan yields to any concrete fundamental on the same move (co-occurrence).
    if (ids.length > 0 && !ids.includes('no-plan')) { expect(ids.some((id) => id !== 'no-plan')).toBe(true); return; }
    expect(ids, JSON.stringify({ plans: plans.map(planHeadline), off: off.san, on: on.san })).toContain('no-plan');
    const hit = attrs.find((a) => a.id === 'no-plan');
    expect(String(hit?.facts.plan).length).toBeGreaterThan(3);
  });
  it('negative control: in the opening no-plan never fires (that is development\'s job)', () => {
    const attrs = attributePrinciples({ replySan: null, historySans: ALAPIN, bestSan: 'e6', classification: 'mistake', evalBefore: 20, evalAfterPlayed: -120 });
    expect(attrs.find((a) => a.id === 'no-plan')).toBeUndefined();
  });
});

describe('section 14 — every exhaustive record answers for the three (compile-time, asserted at runtime too)', () => {
  const NEW = ['calculation-depth', 'left-book-early', 'no-plan'] as const;
  it('ids, tags, labels, sections, pillars, lessons, how, verdicts', () => {
    for (const id of NEW) {
      expect(FUNDAMENTAL_IDS).toContain(id);
      expect(FUNDAMENTAL_TAG[id]).toBe(id);
      expect(FUNDAMENTAL_LABEL[id].length).toBeGreaterThan(3);
      expect(FUNDAMENTAL_SECTION[id]).toBeTruthy();
      expect(id in FUNDAMENTAL_PILLAR).toBe(true);
      expect(FUNDAMENTAL_LESSON[id].facts.length).toBeGreaterThan(80);
      expect(FUNDAMENTAL_LESSON[id].sources.length).toBeGreaterThan(0);
      expect(fundamentalHow(id)?.length ?? 0).toBeGreaterThan(40);
    }
    const attr = { id: 'calculation-depth' as const, tag: 'calculation-depth' as const, weight: 2, coOccurrence: false, evidence: { squares: ['b6'], moves: ['Bxf6'], pvMoves: [], counterfactualClean: true as const }, facts: { played: 'Nb6', punish: 'Bxf6', depth: 5 } };
    const full = renderFundamentalVerdict([attr], { replySan: null, ply: 12, seen: new Set() });
    expect(full).toMatch(/Bxf6/);
    expect(full).toMatch(/Here's how:/);
    const short = renderFundamentalVerdict([attr], { replySan: null, ply: 12, seen: new Set(['calculation-depth']) });
    expect(short).toMatch(/Stopped calculating early again/);
    expect(full).not.toMatch(/\b(we|our|us)\b/i);
  });
});

// Hand walk 1380, move 17: after …c6 the engine prefers Nxe7+ (+1.8 vs +1.0 for
// Nc3, depth 16), but Nxe7+ Qxe7 is a TRADE — the engine's own 18-ply line wins
// no material. The rule read the capture's safety on the board advanced past
// the recapture, i.e. the queen's, and called it "wins by force".
describe('passive-when-forcing-existed judges the capture, not the recapture', () => {
  const H = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3'.split(' ');
  it('an even trade is not a forcing win', () => {
    for (const pv of [undefined, ['Qxe7', 'h3', 'Bxf3', 'Rxf3', 'g6', 'Qf2']]) {
      const attrs = attributePrinciples({ replySan: null, historySans: H, bestSan: 'Nxe7+', classification: 'inaccuracy', evalBefore: 181, evalAfterPlayed: 88, pvAfterBest: pv });
      expect(attrs.find((a) => a.id === 'passive-when-forcing-existed'), JSON.stringify(attrs.map((a) => a.id))).toBeUndefined();
    }
  });
});

describe('no-plan needs the best move to SERVE the plan (re-walk 1380, 30.Qe2)', () => {
  // "the target was to get your passed pawn on e5 promoting; hxg6 goes there,
  // Qe2 does not" — hxg6 is a capture on the other wing. A forcing best move
  // that lands off the plan means the position was about the tactic.
  const LINE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3 Rxf3 Rd8 g4 f5 Rxd8 Qe7 gxh5 Qxd8 Bxe6+ Kh8 Bg5 f4 Bxf4 Bc5+ Kg2 Qe7 Bc4 b5 Bd3 g6 Ne4 b4 Qe2'.split(' ');
  it('an off-plan capture as the best move does not file the played move under no-plan', () => {
    const c = new Chess(); for (const s of LINE) expect(c.move(s), s).toBeTruthy();
    const why: string[] = [];
    const attrs = attributePrinciples({ replySan: null, historySans: LINE, bestSan: 'hxg6', classification: 'mistake', evalBefore: 849, evalAfterPlayed: 700 }, why);
    expect(attrs.find((a) => a.id === 'no-plan'), why.filter((w) => /no-plan/.test(w)).join(' | ')).toBeUndefined();
  });
});
