// Persistent browser I drive BY HAND, one action at a time (David 2026-08-28:
// "you need to walk the audits by hand, personally"). Launches a Chromium
// server that stays alive across separate `do.mjs` invocations, so I can make a
// move, LOOK, ask a question, read the answer, and choose the next question
// from what I actually see — not a fixed bot script.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs } from '../audit-lib/chromium.mjs';

const WS = '/tmp/claude-0/-home-user-chess-academy-pro/4ce43189-b910-54d0-aa42-ce3f047e0b1b/scratchpad/walk-ws.txt';
const server = await chromium.launchServer({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
fs.writeFileSync(WS, server.wsEndpoint());
console.log('browser server up:', server.wsEndpoint());
// Keep alive until killed.
setInterval(() => {}, 1 << 30);
