// Let the /api/tts REQUEST happen. Never let it reach the server.
//
// 🚨 WHY THIS EXISTS, BESIDE `muteTtsForAudit` (David 2026-08-16: "so we don't
// burn through my tts budget").
//
// The mute is the right tool for an audit that just happens to make the app
// talk: the app skips synthesis entirely and still emits its
// `coach-narration-spoken` event, so nothing is lost. 119 audits took it with
// no downside at all — they were spending money and measuring nothing.
//
// But ~41 audits use the synthesis request itself AS their narration
// instrument: `page.on('request', r => /\/api\/tts/.test(r.url()) && …)`, then
// they read the spoken line out of the URL. Mute those and the request never
// fires, the instrument goes silent, and the audit reports the coach said
// nothing — a false green in the exact place the audit was watching.
//
// Route-level interception satisfies both. Playwright fires `request` BEFORE
// consulting the route handler, so every existing `page.on('request')`
// instrument still sees the call and still reads the text out of the URL —
// while the call is fulfilled locally and never touches the TTS provider. Same
// instrument, same assertions, zero bytes synthesised, zero bill.
//
// The body is a minimal silent MP3 frame rather than empty: some players throw
// on a zero-length audio response, and a thrown decode error in an audit is
// noise that looks like a bug.
/** ~104 ms of DECODABLE silence: four MPEG-1 Layer III frames (128 kbps,
 *  44.1 kHz, no CRC) with zeroed side-info + main data. The 57-byte "Info"
 *  stub this replaced was not a decodable stream, so on every intercepted
 *  audit the cloud tier threw "Unable to decode audio data" and fell over to
 *  Web Speech — the audit then exercised the FALLOVER path, logged one
 *  `voice-fallover` per sentence, fetched each clip twice (progressive +
 *  buffered attempt), and its tape read as "every sentence spoken twice"
 *  (2026-09-19). Verified: headless Chromium's decodeAudioData accepts this.
 *  Built at load time rather than pasted as base64 so it cannot rot unread. */
const SILENT_MP3 = (() => {
  const frame = Buffer.alloc(417, 0);
  frame[0] = 0xff; frame[1] = 0xfb; frame[2] = 0x90; frame[3] = 0x00;
  return Buffer.concat([frame, frame, frame, frame]);
})();

export async function blockTtsNetwork(page) {
  await page.route('**/api/tts**', async (route) => {
    try {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        // 32 bytes of MPEG silence — enough of a frame that a decoder does not
        // throw, small enough to be free.
        body: SILENT_MP3,
        headers: { 'x-audit-tts': 'intercepted-never-synthesised' },
      });
    } catch {
      // The page can go away mid-route (navigation, close). Aborting is fine —
      // what must never happen is the call reaching the provider.
      await route.abort().catch(() => undefined);
    }
  });
}
