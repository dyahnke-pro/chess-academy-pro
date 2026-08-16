// A PRICE MAY NOT BE WRITTEN INTO PROSE.
//
// 🚨 David decided to move to $4.99/mo on 2026-08-16. The paywall handles that
// with no code change — it renders `priceString` off the store. But two LEGAL
// pages stated the old price in words:
//
//   TermsOfServicePage — "$7.99 per month or $79.99 per year"
//   SupportPage        — "$7.99/month subscription with a 7-day free trial"
//
// Nothing connects those to the store, so a tier change leaves them stating a
// price the customer is not charged — on the page Apple review reads, for a
// product with paying members. The Terms file even carried a comment asking a
// human to "keep the subscription terms in sync with the live offering", which
// is a note standing in for a constant.
//
// This gate makes the drift impossible rather than asking someone to remember.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRICE_MONTHLY, PRICE_YEARLY, TRIAL_DAYS } from './pricing';

const LEGAL = resolve(__dirname, '../components/Legal');

describe('prices live in one file', () => {
  const pages = readdirSync(LEGAL)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .map((f) => ({ name: f, src: readFileSync(resolve(LEGAL, f), 'utf8') }));

  it('there are legal pages to check (guards the guard)', () => {
    expect(pages.length).toBeGreaterThan(1);
  });

  it.each(['TermsOfServicePage.tsx', 'SupportPage.tsx'])('%s states no literal price', (name) => {
    const page = pages.find((p) => p.name === name);
    expect(page, `${name} not found — did it move?`).toBeDefined();
    // Strip comments: a comment explaining the old defect is not the defect.
    const code = (page?.src ?? '').split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
    const literals = code.match(/\$\d+\.\d{2}/g) ?? [];
    expect(literals, `hardcoded price(s) in ${name}: ${literals.join(', ')}`).toEqual([]);
  });

  it('the trial length is not written in prose either', () => {
    // "7-day free trial" drifts exactly like a price does.
    for (const p of pages) {
      const code = p.src.split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(/\b\d+-day free trial/.test(code), `${p.name} hardcodes the trial length`).toBe(false);
    }
  });

  it('the constants are shaped like prices, so a typo cannot ship silently', () => {
    expect(PRICE_MONTHLY).toMatch(/^\$\d+\.\d{2}$/);
    expect(PRICE_YEARLY).toMatch(/^\$\d+\.\d{2}$/);
    expect(TRIAL_DAYS).toBeGreaterThan(0);
  });

  it('the yearly plan is cheaper than twelve months, or it is not a yearly plan', () => {
    // Catches the transposition that would otherwise reach the Terms page:
    // at $4.99/mo a $59.99 "saving" is not one.
    const n = (s: string): number => Number(s.replace('$', ''));
    expect(n(PRICE_YEARLY)).toBeLessThan(n(PRICE_MONTHLY) * 12);
  });
});
