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
    // `chromium.launch(` with the paren, not the bare string: audit-vacuity-check
    // MENTIONS 'chromium.launch' inside a filter (it greps the other audits to
    // find the browser-driving ones) but launches nothing itself. Matching the
    // bare string classified the meta-audit as a browser audit and demanded a
    // Chromium resolver and a TTS mute it has no use for. A detector that can be
    // tripped by a quoted mention will keep finding harnesses, not audits.
    .filter((f) => f.src.includes('chromium.launch('));

  it('there are browser-driving audits to check (guards the guard)', () => {
    expect(driving.length).toBeGreaterThan(100);
  });

  it('every one launches through sandboxLaunchArgs()', () => {
    const missing = driving.filter((f) => !f.src.includes('sandboxLaunchArgs')).map((f) => f.name);
    expect(missing, `these cannot reach prod: ${missing.join(', ')}`).toEqual([]);
  });

  // 2026-09-19: Chrome 148 blocks https→loopback fetches unless Local Network
  // Access checks are off, so the sidecar received NOTHING on every audit while
  // every Playwright row still printed. The helper carries the flag on every
  // path; a launcher that drops it blinds instrument 3 silently.
  it('sandboxLaunchArgs() lets an https page reach the loopback sidecar on every path', async () => {
    const { sandboxLaunchArgs, LOOPBACK_SIDECAR_ARGS } = await import('../../scripts/audit-lib/chromium.mjs');
    const saved = { s: process.env.AUDIT_SANDBOX, p: process.env.AUDIT_PROXY };
    try {
      for (const [sandbox, proxy] of [[undefined, undefined], ['1', undefined], ['1', 'http://proxy.test:3128']] as const) {
        if (sandbox === undefined) delete process.env.AUDIT_SANDBOX; else process.env.AUDIT_SANDBOX = sandbox;
        if (proxy === undefined) delete process.env.AUDIT_PROXY; else process.env.AUDIT_PROXY = proxy;
        const args = sandboxLaunchArgs() as string[];
        for (const a of LOOPBACK_SIDECAR_ARGS as string[]) expect(args, `sandbox=${sandbox} proxy=${proxy}`).toContain(a);
        // Chromium honours only the LAST --disable-features; a second one would silently drop this.
        expect(args.filter((a) => a.startsWith('--disable-features=')).length, `sandbox=${sandbox} proxy=${proxy}`).toBe(1);
      }
    } finally {
      if (saved.s === undefined) delete process.env.AUDIT_SANDBOX; else process.env.AUDIT_SANDBOX = saved.s;
      if (saved.p === undefined) delete process.env.AUDIT_PROXY; else process.env.AUDIT_PROXY = saved.p;
    }
  });

  it('no audit spells a --disable-features literal of its own (one source: chromium.mjs)', () => {
    // A second --disable-features in a script's args overrides the helper's
    // (Chromium keeps the LAST), which is exactly how the 2026-07-13 hand-rolled
    // PNA flag went stale under Chrome 148 and blinded the sidecar.
    const offenders = driving.filter((f) => /--disable-features=/.test(f.src)).map((f) => f.name);
    expect(offenders, 'spread sandboxLaunchArgs() instead').toEqual([]);
  });

  // 2026-09-19: the intercept served a 57-byte "Info" stub that no decoder
  // accepts, so every intercepted audit threw "Unable to decode audio data",
  // fell over to Web Speech, fetched each clip twice and logged the fallover
  // under the cloud tier's name — a tape that read as "every sentence spoken
  // twice". The clip must be a real MPEG-1 Layer III stream: sync word 0xFFFB
  // and whole 417-byte frames (128 kbps / 44.1 kHz / no padding).
  it('blockTtsNetwork serves a DECODABLE clip, not a stub (sync word + whole frames)', async () => {
    const src = readFileSync(resolve(SCRIPTS, 'audit-lib', 'block-tts-network.mjs'), 'utf-8');
    expect(src).not.toMatch(/'\/\/uQZ/); // the old base64 stub
    const m = src.match(/Buffer\.alloc\((\d+), 0\)/);
    expect(m, 'frame buffer').not.toBeNull();
    expect(Number(m![1])).toBe(417);
    expect(src).toMatch(/frame\[0\] = 0xff; frame\[1\] = 0xfb;/);
  });

  // The narration record names the TIER that spoke. Web Speech used to log as
  // `speakCloud`, so a fallover was indistinguishable from a cloud speak.
  it('the Web Speech tier logs its narration record under its own source', () => {
    const src = readFileSync(resolve(SCRIPTS, '..', 'src', 'services', 'voiceService.ts'), 'utf-8');
    expect(src).toMatch(/source: voice === 'web-speech' \? 'voiceService\.speakWebSpeech' : 'voiceService\.speakCloud'/);
  });

  it('none hand-rolls the launch args instead', () => {
    // The shape that fooled the sweep: real-looking flags, no proxy, no TLS pin.
    const handRolled = driving
      .filter((f) => /args:\s*(SANDBOX\s*\?\s*)?\[\s*'--ignore-certificate-errors'/.test(f.src))
      .map((f) => f.name);
    expect(handRolled, `hand-rolled args omit the proxy + TLS pin: ${handRolled.join(', ')}`).toEqual([]);
  });

  it('every clicking audit injects autoDismissCalibration — the HELPER, not a ghost', () => {
    // The SECOND thing that stops an audit reaching prod, found the moment the
    // first was fixed: `audit-coach-tactical-awareness` got through to the page
    // and then timed out clicking the chat box, because a full-screen
    // role="dialog" intercepts pointer events on every fresh context.
    //
    // 🔴 TIGHTENED 2026-09-17, and the loosening is what made it necessary. This
    // used to accept `strength-calibration-bubble` or `skill-band` as proof an
    // audit was protected. That bubble was DELETED from the app on 2026-09-02,
    // so those two strings stopped meaning anything — and **94 clicking audits
    // were passing this gate by naming an element that no longer renders**,
    // while the overlay that DOES still render (`page-help-modal`, PageHelp.tsx)
    // went unhandled in every one of them. A gate satisfied by a ghost reports
    // protection it is not providing, which is worse than no gate: it is the
    // "green by absence" failure, and it hid here for two weeks.
    //
    // Only the helper counts now. `autoDismissCalibration` is CSS-based ON
    // PURPOSE — a hand-rolled click-to-dismiss fires an async Dexie write, and
    // where that write stalls the dialog never detaches, so the click HANGS
    // instead of timing out. It also kills page-help, which is the live one.
    const clicking = driving.filter((f) => /chat-text-input|clickReq|\.click\(/.test(f.src));
    expect(clicking.length).toBeGreaterThan(50);
    const missing = clicking
      // audit-strength-calibration asserts the bubble is ABSENT — that is its
      // whole contract, so it must not have overlays suppressed under it.
      .filter((f) => f.name !== 'audit-strength-calibration.mjs')
      .filter((f) => !f.src.includes('autoDismissCalibration'))
      .map((f) => f.name);
    expect(missing, `an overlay will eat their first click: ${missing.join(', ')}`).toEqual([]);
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

  it('no audit points a device at a NON-loopback stream URL (David 2026-09-19: audits must never fill Redis)', () => {
    // The app-side gate (appAuditor.isAuditMarkedPage) refuses the remote from
    // any audit-marked page and the server refuses anything carrying
    // x-audit-marked — so a script that sets a prod URL would only prove the
    // gate works. It is still a bug in the SCRIPT: the only legitimate targets
    // are the loopback listener (`startAuditListener`) and the own-origin
    // route-capture (`enableAuditCapture`, fulfilled locally by page.route).
    // The one audit that VERIFIES the gate sets a prod URL on purpose and is
    // named here; it asserts the POST count is ZERO.
    const GATE_VERIFIER = new Set(['audit-stream-optin-prod.mjs']);
    const literalRemote = /setItem\(\s*['"]auditStreamUrl['"]\s*,\s*['"]https?:\/\/(?!127\.0\.0\.1|localhost|\[::1\])/;
    const offenders = driving
      .filter((f) => !GATE_VERIFIER.has(f.name) && literalRemote.test(f.src))
      .map((f) => f.name);
    expect(offenders, `these point a device at a remote audit stream: ${offenders.join(', ')}`).toEqual([]);
  });

  it('every one resolves the Chromium binary rather than trusting the default', () => {
    // `resolveChromiumExecutable` prefers the FULL chrome when AUDIT_PROXY is
    // set, because headless_shell ignores --ssl-version-max and resets anyway.
    const missing = driving.filter((f) => !f.src.includes('resolveChromiumExecutable')).map((f) => f.name);
    expect(missing, `these use whatever binary Playwright picks: ${missing.join(', ')}`).toEqual([]);
  });
});
