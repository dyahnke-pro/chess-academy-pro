// Material-direction claims are checkable, so they are checked.
//
// 🔒 David heard these LIVE (2026-08-13, Benko Declined lesson): the coach
// spoke inverted material accounting and every gate stayed green, because the
// gates checked piece-on-square and eval claims — never who is up material.
// The exact spoken lines from his session's PostHog tape are the fixtures.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { stripDisprovenMaterialSentences, materialBalance } from './materialClaimValidator';

/** Play SANs from the start; return the FEN. */
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

// Benko Declined main line, Black recaptures on c4: BLACK is up one pawn.
const BENKO_BLACK_UP = fenAfter(['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5', 'Nf3', 'bxc4']);
const START = new Chess().fen();

describe('materialBalance', () => {
  it('is zero at the start and negative when Black snags a pawn', () => {
    expect(materialBalance(START)).toBe(0);
    expect(materialBalance(BENKO_BLACK_UP)).toBe(-1);
  });
});

describe('stripDisprovenMaterialSentences — the Benko tape lines', () => {
  it('drops "material is level again" while Black is up a pawn', () => {
    const r = stripDisprovenMaterialSentences(
      'There it is — the pawn lands. Material is level again.',
      BENKO_BLACK_UP,
    );
    expect(r.dropped).toHaveLength(1);
    expect(r.clean).toContain('the pawn lands');
  });

  it('drops a White-is-down claim on an even board', () => {
    // The inverted accounting shape: the capturer described as down material.
    const r = stripDisprovenMaterialSentences(
      "White grabbed the pawn and he's down material now.",
      START,
    );
    expect(r.dropped).toHaveLength(1);
  });

  it('drops "White\'s extra pawn" when the extra pawn is Black\'s', () => {
    const r = stripDisprovenMaterialSentences(
      "White keeps an extra pawn that Black has to live with.",
      BENKO_BLACK_UP,
    );
    expect(r.dropped).toHaveLength(1);
  });

  it('keeps a TRUE material claim', () => {
    const r = stripDisprovenMaterialSentences(
      'Black is up a pawn for now, and the files are opening.',
      BENKO_BLACK_UP,
    );
    expect(r.dropped).toHaveLength(0);
  });

  it('drops the hypothetical-capture inversion — the capturer described as down (hp-54v shape)', () => {
    // A capture only ever ADDS to the capturer's balance: from an even board,
    // "once White takes … he is down" is arithmetic, not judgment.
    const r = stripDisprovenMaterialSentences(
      'Once White takes the offered Benko pawn, he is down material.',
      START,
    );
    expect(r.dropped).toHaveLength(1);
  });

  it('keeps the CORRECTED hp-54v accounting — the non-capturer is down', () => {
    const r = stripDisprovenMaterialSentences(
      'After White takes the Benko pawn, Black is down a pawn but leads in development, while White keeps the extra pawn and the big center.',
      START,
    );
    expect(r.dropped).toHaveLength(0);
  });

  it('leaves multi-capture sequences alone — a recapture needs a real replay', () => {
    const r = stripDisprovenMaterialSentences(
      'After White takes the knight and Black recaptures with the pawn, White is down the exchange.',
      START,
    );
    expect(r.dropped).toHaveLength(0); // two capture verbs → not the simple shape
  });

  it('keeps other hypotheticals — prevention for those is the generator ledger', () => {
    const r = stripDisprovenMaterialSentences(
      'If Black castles next, White will aim the bishop at h7.',
      START,
    );
    expect(r.dropped).toHaveLength(0); // future marker, no capture accounting
  });

  it('keeps prose with no material claim at all', () => {
    const r = stripDisprovenMaterialSentences(
      'The fianchetto is complete — the bishop hammers the long diagonal.',
      BENKO_BLACK_UP,
    );
    expect(r.dropped).toHaveLength(0);
    expect(r.clean).toContain('fianchetto');
  });
});
