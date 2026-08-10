#!/usr/bin/env node
/**
 * Does the Learn board accept castling by clicking the KING's two squares?
 *
 * The look-ahead prod audit stopped at "the board did not accept O-O", and the
 * doctrine says discriminate a real break from a harness artifact BEFORE
 * changing anything: a dropped click and a broken move handler look identical
 * from the audit's side. So this drives the one move by hand, tries both
 * conventions (king to g1, and king onto its own rook), and reports which the
 * board actually takes.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/handdrive/castle-probe.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { autoDismissCalibration } from '../audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';
import { clickMove, awaitCoachReply } from '../audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';

async function dismissConsent(page) {
  for (const id of ['ai-consent-allow', 'page-help-close', 'page-help-modal-close']) {
    const el = page.locator(`[data-testid="${id}"]`).first();
    if (await el.isVisible().catch(() => false)) await el.click().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
    proxy: process.env.AUDIT_PROXY ? { server: process.env.AUDIT_PROXY } : undefined,
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  try {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await dismissConsent(page);
    await page.waitForTimeout(6000);

    const mirror = new Chess();
    for (const san of ['e4', 'Nf3', 'Bc4', 'd3']) {
      const mv = mirror.moves({ verbose: true }).find((m) => m.san === san);
      if (!mv) { console.log(`[skip] ${san} not legal — the coach steered elsewhere`); break; }
      const probe = new Chess(mirror.fen());
      probe.move(mv.san);
      const ok = await clickMove(page, mv, probe.fen());
      console.log(`${ok ? '✅' : '❌'} played ${san}`);
      if (!ok) { console.log('   stopped before reaching the castling test'); return; }
      mirror.move(mv.san);
      const reply = await awaitCoachReply(page, mirror);
      console.log(`   coach replied ${reply ?? '(nothing)'}`);
      if (!reply) return;
      mirror.move(reply);
    }

    const castle = mirror.moves({ verbose: true }).find((m) => m.san === 'O-O');
    if (!castle) { console.log('❌ O-O is not legal here — the audit fixture, not the board'); return; }
    console.log(`[castle] chess.js says O-O is ${castle.from} -> ${castle.to}`);

    const after = new Chess(mirror.fen());
    after.move('O-O');

    // Convention 1: click the king's two squares (what the audit does).
    const viaKing = await clickMove(page, castle, after.fen(), { timeout: 8000 });
    console.log(`${viaKing ? '✅' : '❌'} king-square click (e1 -> g1)`);

    if (!viaKing) {
      // Convention 2: click the king onto its own rook — the other common
      // castling idiom in board UIs. If THIS works, the audit was wrong, not
      // the app.
      const viaRook = await clickMove(page, { from: castle.from, to: 'h1' }, after.fen(), { timeout: 8000 });
      console.log(`${viaRook ? '✅' : '❌'} king-onto-rook click (e1 -> h1)`);
      // And a plain legal alternative, to prove the board accepts ANY move
      // right now — otherwise the board was simply locked and neither
      // convention was ever going to land.
      if (!viaRook) {
        const alt = mirror.moves({ verbose: true }).find((m) => m.san !== 'O-O' && m.san !== 'O-O-O');
        const probe = new Chess(mirror.fen());
        probe.move(alt.san);
        const ok = await clickMove(page, alt, probe.fen(), { timeout: 8000 });
        console.log(`${ok ? '✅' : '❌'} a plain legal move (${alt.san}) — board responsive at all?`);
      }
    }
    console.log(`page errors: ${errors.length}${errors.length ? ` — ${errors[0]}` : ''}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
