// EVERY AUDIT MUST BE ABLE TO REACH PROD, OR IT IS NOT AN AUDIT.
//
// The full battery on 2026-08-16 died on its first script with
// `net::ERR_CONNECTION_RESET` at chess-academy-pro.vercel.app. Prod was fine —
// four other audits were talking to it in the same minute. The script simply
// launched Chromium without `sandboxLaunchArgs()`, which is where the
// `--proxy-server` and the TLS 1.2 pin live (CLAUDE.md documents both: the
// agent egress proxy re-terminates TLS with a MITM endpoint that only speaks
// TLS 1.2, and Chromium's default TLS 1.3 ClientHello makes it RST the tunnel).
//
// The sweep found 42 of 278 audit scripts in that state. That is the part worth
// gating: each one fails in a way that reads as "prod is unreachable, fall back
// to localhost" — the exact stale conclusion CLAUDE.md warns cost a previous
// session hours. A latent false signal in 15% of the audit suite is worse than
// a broken audit, because it argues for the wrong diagnosis.
//
// Three of the 42 had hand-rolled args (`['--ignore-certificate-errors',
// '--no-sandbox']`) that LOOKED deliberate and omitted both the proxy and the
// TLS pin, so the check is "uses the helper", not "passes some args".
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPTS = resolve(__dirname, '../../scripts');

describe('audit scripts can reach prod from the sandbox', () => {
  const driving = readdirSync(SCRIPTS)
    .filter((f) => f.startsWith('audit-') && f.endsWith('.mjs'))
    .map((f) => ({ name: f, src: readFileSync(resolve(SCRIPTS, f), 'utf8') }))
    .filter((f) => f.src.includes('chromium.launch'));

  it('there are browser-driving audits to check (guards the guard)', () => {
    expect(driving.length).toBeGreaterThan(100);
  });

  it('every one launches through sandboxLaunchArgs()', () => {
    const missing = driving.filter((f) => !f.src.includes('sandboxLaunchArgs')).map((f) => f.name);
    expect(missing, `these cannot reach prod: ${missing.join(', ')}`).toEqual([]);
  });

  it('none hand-rolls the launch args instead', () => {
    // The shape that fooled the sweep: real-looking flags, no proxy, no TLS pin.
    const handRolled = driving
      .filter((f) => /args:\s*(SANDBOX\s*\?\s*)?\[\s*'--ignore-certificate-errors'/.test(f.src))
      .map((f) => f.name);
    expect(handRolled, `hand-rolled args omit the proxy + TLS pin: ${handRolled.join(', ')}`).toEqual([]);
  });

  it('every clicking audit neutralises the first-run overlay', () => {
    // The SECOND thing that stops an audit reaching prod, found the moment the
    // first was fixed: `audit-coach-tactical-awareness` got through to the page
    // and then timed out clicking the chat box, because the strength-calibration
    // bubble is a full-screen role="dialog" that intercepts pointer events on
    // every fresh context. 36 clicking audits never injected the dismissal.
    //
    // `autoDismissCalibration` is CSS-based ON PURPOSE — clicking the skill band
    // fires an async Dexie write, and in a container where that write stalls the
    // bubble never detaches, so a band-click alone hangs forever. Any audit that
    // rolls its own click-to-dismiss is reintroducing that hang.
    const clicking = driving.filter((f) => /chat-text-input|clickReq|\.click\(/.test(f.src));
    expect(clicking.length).toBeGreaterThan(50);
    const missing = clicking
      .filter((f) => !/autoDismissCalibration|strength-calibration-bubble|skill-band/.test(f.src))
      .map((f) => f.name);
    expect(missing, `the first-run bubble will eat their first click: ${missing.join(', ')}`).toEqual([]);
  });

  it('every browser-driving audit is MUTED', () => {
    // 🚨 DAVID 2026-08-16: "so we don't burn through my tts budget." He asked,
    // and the answer was 161 of 278 unmuted — including the punish-gems loop,
    // which was live at the time and 2 openings into an 86-opening Watch+Learn
    // walk. That is the exact shape that ran him $100 over in a single day.
    //
    // 119 of them had no /api/tts instrument at all: pure spend, nothing
    // measured. The rest read the synthesis request to learn what was said —
    // i.e. they paid for information the app already emits. `muteTtsForAudit`
    // emits the same `coach-narration-spoken` with the same text and resolves
    // on a text-proportional delay, so voice-gated pacing survives.
    //
    // The carve-out is real but narrow: an audit whose PURPOSE is the audio
    // (the /api/tts contract, iOS decode, MediaSource streaming) must
    // synthesise, and names itself so here. Everything else is muted.
    const AUDIO_PURPOSE = new Set([
      'audit-narration-latency-prod.mjs',   // measures real synthesis latency
    ]);
    // Two acceptable answers, because there are two shapes.
    //   · `muteTtsForAudit` — the app never makes the request. Right for the
    //     119 that had no TTS instrument at all.
    //   · `blockTtsNetwork` — the request FIRES (so a `page.on('request')`
    //     narration instrument still reads the spoken text out of the URL) and
    //     is fulfilled locally, never reaching the provider. Right for the ~41
    //     that watch the wire; muting those would blind them, which is a false
    //     green exactly where the audit is looking.
    const paying = driving
      .filter((f) => !AUDIO_PURPOSE.has(f.name)
        && !f.src.includes('muteTtsForAudit') && !f.src.includes('blockTtsNetwork'))
      .map((f) => f.name);
    expect(paying, `these spend real TTS money every run: ${paying.join(', ')}`).toEqual([]);
  });

  it('every one resolves the Chromium binary rather than trusting the default', () => {
    // `resolveChromiumExecutable` prefers the FULL chrome when AUDIT_PROXY is
    // set, because headless_shell ignores --ssl-version-max and resets anyway.
    const missing = driving.filter((f) => !f.src.includes('resolveChromiumExecutable')).map((f) => f.name);
    expect(missing, `these use whatever binary Playwright picks: ${missing.join(', ')}`).toEqual([]);
  });
});
