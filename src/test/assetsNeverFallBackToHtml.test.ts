/**
 * A MISSING ASSET MUST 404 — never come back as the SPA shell.
 *
 * 🔴 THE BUG THIS CLOSES, measured on prod 2026-09-21. `vercel.json`'s
 * catch-all rewrite was `/((?!api/).*)` → `/index.html`, so a hashed chunk the
 * deploy no longer serves was answered with the app shell:
 *
 *     /assets/web-BITZqWmZ.js   (previous build)  200  text/html
 *     /assets/web-7Ov3xJEz.js   (current build)   200  application/javascript
 *
 * A page that lazy-loads a chunk from the build it started on therefore gets
 * MARKUP where it expects a module, and fails as `Unexpected token '<'`.
 *
 * That is the mechanism behind the iPhone reports this repo chased for days —
 * `stockfish-error`, `lichess-error TypeError: Load failed`, no `app-boot` on
 * reopen — with NOTHING anywhere naming a 404. It is also why it took a device
 * to find: no server log records an error, because the server believes it
 * served a page successfully.
 *
 * And every deploy creates the situation. `vite.config.ts` bakes `Date.now()`
 * into `__BUILD_ID__`, so every build renames every chunk — docs-only pushes
 * included, which is a proof by construction rather than a pattern.
 *
 * WHY A 404 IS THE FIX RATHER THAN A DIFFERENT SYMPTOM. Both are failures; only
 * one is honest. A 404 is detectable by the app, by the service worker, and by
 * an audit's ordinary `status >= 400` check. HTML-pretending-to-be-JS is
 * detectable by none of them without a content-type test nobody thinks to
 * write — the two-deploy audit written specifically to hunt this class watched
 * `status >= 400` and was structurally blind to it.
 *
 * WHY A GATE AND NOT A COMMENT. `vercel.json` is edited rarely and by whoever
 * is adding a route, and the exclusion looks like a typo to anyone who does not
 * know this history — "why is `assets/` in the negative lookahead?" is exactly
 * the kind of thing a tidy-up deletes. A convention rots; a gate does not.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Rewrite { source: string; destination: string }

const cfg = JSON.parse(
  readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8'),
) as { rewrites?: Rewrite[] };

/** Does this rewrite send everything it matches to the SPA shell? */
const isSpaFallback = (r: Rewrite): boolean => r.destination === '/index.html';

describe('a missing /assets/ file 404s instead of returning the SPA shell', () => {
  it('parses vercel.json non-vacuously', () => {
    // If the config ever stops carrying rewrites, every assertion below would
    // pass for free on an empty array — which is the failure mode this whole
    // file exists to punish.
    expect(cfg.rewrites, 'vercel.json has no rewrites array').toBeTruthy();
    expect(cfg.rewrites!.length).toBeGreaterThan(1);
    expect(cfg.rewrites!.some(isSpaFallback), 'no SPA fallback rewrite found').toBe(true);
  });

  it('every SPA fallback excludes /assets/', () => {
    const offenders = cfg.rewrites!
      .filter(isSpaFallback)
      .filter((r) => !/assets\//.test(r.source))
      .map((r) => r.source);
    expect(
      offenders,
      'A rewrite sends /assets/ to index.html. A hashed chunk the deploy no longer '
      + 'serves will then return 200 text/html, and a running page gets markup where it '
      + 'expects a module — "Unexpected token \'<\'", surfacing as stockfish-error / '
      + 'lichess-error with no 404 anywhere. Put `assets/` back in the negative lookahead.',
    ).toEqual([]);
  });

  it('CAN FIRE — the old pattern is rejected, the new one accepted', () => {
    // A negative control, because a gate nobody has watched fail is
    // indistinguishable from one that cannot fail.
    const OLD = { source: '/((?!api/).*)', destination: '/index.html' };
    const NEW = { source: '/((?!api/|assets/).*)', destination: '/index.html' };
    expect(/assets\//.test(OLD.source), 'the pre-fix pattern must be caught').toBe(false);
    expect(/assets\//.test(NEW.source), 'the fixed pattern must pass').toBe(true);
  });

  it('SPA routes still fall back — the exclusion must not break deep links', () => {
    // The whole point of the fallback is that /coach/review reloads correctly.
    // Narrowing it is only safe if real routes still match.
    const fallback = cfg.rewrites!.find(isSpaFallback)!;
    const body = fallback.source.replace(/^\//, '');
    const re = new RegExp(`^${body}$`);
    for (const route of ['coach/review', 'openings/italian-game', 'tactics', 'kid/pawn-games']) {
      expect(re.test(route), `${route} no longer reaches the SPA shell`).toBe(true);
    }
    for (const asset of ['assets/index-CSaaoOGA.js', 'assets/web-7Ov3xJEz.js']) {
      expect(re.test(asset), `${asset} still falls back to HTML`).toBe(false);
    }
  });
});
