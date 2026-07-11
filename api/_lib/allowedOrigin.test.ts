import { describe, it, expect } from 'vitest';
import { isAllowedOrigin, originAllowed } from './allowedOrigin.js';

describe('allowedOrigin — the ONE origin gate for api/* (2026-07-11)', () => {
  it('allows the app schemes + production', () => {
    expect(isAllowedOrigin('capacitor://app.chessacademy.pro')).toBe(true);
    expect(isAllowedOrigin('https://app.chessacademy.pro')).toBe(true);
    expect(isAllowedOrigin('https://chess-academy-pro.vercel.app')).toBe(true);
  });

  it('allows local dev (vite proxies /api/* to prod with a localhost Origin)', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:4173')).toBe(true);
  });

  it('allows the EXACT deployment URL from the 2026-07-09 PostHog 403s', () => {
    // The regression this module exists for: David opened a raw Vercel
    // deployment URL on the iPhone and every LLM call 403d.
    expect(isAllowedOrigin('https://chess-academy-l8nh98ocd-dyahnke-pros-projects.vercel.app')).toBe(true);
  });

  it('allows git-branch alias URLs (the old tts-only regex shape)', () => {
    expect(isAllowedOrigin('https://chess-academy-pro-git-fix-mic-dyahnke-pros-projects.vercel.app')).toBe(true);
  });

  it('REJECTS hostile / out-of-team origins', () => {
    expect(isAllowedOrigin('https://chess-academy-pro.evil.com')).toBe(false);
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
    // Another team's project squatting the prefix — no team suffix, no entry.
    expect(isAllowedOrigin('https://chess-academy-evil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://chess-academy-pro-x.vercel.app')).toBe(false);
    // Suffix must terminate the hostname (no domain-extension tricks).
    expect(isAllowedOrigin('https://chess-academy-x-dyahnke-pros-projects.vercel.app.evil.com')).toBe(false);
  });

  it('originAllowed: missing Origin (server-to-server / curl) passes; bad Origin fails', () => {
    expect(originAllowed(null)).toBe(true);
    expect(originAllowed('https://evil.com')).toBe(false);
    expect(originAllowed('https://chess-academy-pro.vercel.app')).toBe(true);
  });
});
