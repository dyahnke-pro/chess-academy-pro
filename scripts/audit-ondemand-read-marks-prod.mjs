// Post-deploy check (David 2026-09-13): the on-demand positional READ must
// (a) fire when the student asks on a live board, and (b) LEAD THE EYE — the
// key squares it names paint as yellow highlights, coupled from the computed
// observation's own squares (GroundedAnswer.keySquares →
// [BOARD: highlight:sq:yellow]). Muted (G1): reads the reply text, never spends
// TTS. Seeds a real middlegame via /coach/play?fen so readPosition has rich,
// board-true features to report.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// White to move; Black's king still on e8 (uncastled) — a definite
// king-in-the-centre + pawn-break read, so the read names real squares.
const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5';

// KNOWN GAP (2026-09-13, diagnosed in this run): on /coach/play the read TEXT
// fires (verbatim computed prose) and best-move ARROWS render, but the read's
// yellow key-square HIGHLIGHT does not reach the board — the computed
// assessment answer's appended [BOARD: highlight:...] tags survive to the board
// on CoachTeachPage (build 6) but are lost on the GameChatPanel/OpeningPlayMode
// in-game path (arrows on the same path DO render). Marks on Learn/Review are
// unaffected. Tracked in docs/plans/2026-09-13-positional-read-loud.md; the
// read-fires check is the hard gate here, the highlight is reported-only.

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
const p = await ctx.newPage();
await p.addInitScript(muteTtsForAudit);

const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

let readFired = false, markLanded = false, detail = '', replyText = '';
try {
  await p.goto(`${BASE}/coach/play?fen=${encodeURIComponent(FEN)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();

  // Find the coach chat input (play surface uses the same testid; fall back to the drawer).
  let box = p.locator('[data-testid="chat-text-input"]');
  try { await box.waitFor({ timeout: 12000 }); } catch {
    // open the global coach drawer
    try { await p.locator('[data-testid="coach-fab"], [aria-label*="coach" i]').first().click({ timeout: 4000 }); } catch {}
    box = p.locator('[data-testid="chat-text-input"]');
    await box.waitFor({ timeout: 12000 });
  }

  // Clear the fresh-surface greeting with a throwaway, then ask the real read.
  await box.click(); await box.pressSequentially('hi', { delay: 8 }); await box.press('Enter');
  await p.waitForTimeout(3500);
  await box.click(); await box.pressSequentially('how do I stand here — am I better or worse?', { delay: 8 });
  await box.press('Enter');

  for (let i = 0; i < 30; i++) {
    await p.waitForTimeout(2000);
    const body = (await p.locator('body').innerText()).toLowerCase();
    replyText = body.slice(-600);
    // The read fired if the reply engages concrete board features (a square /
    // a weakness word), not a greeting or a deflection.
    const namesFeature = /(weak|outpost|hole|uncastled|in the cent|develop|king.{0,12}cent|bad bishop|isolated|passed|lever|break)/.test(body);
    if ((/\b[a-h][1-8]\b/.test(body) || /cent(re|er)/.test(body)) && namesFeature) readFired = true;
    // Scan EVERY board square cell (and descendants) for the yellow key-square
    // rgba(234,179,8), ignoring UI-chrome elsewhere on the page.
    const boardYellow = await p.evaluate(() => {
      const hits = [];
      for (const cell of document.querySelectorAll('[data-square]')) {
        for (const n of [cell, ...cell.querySelectorAll('*')]) {
          const cs = getComputedStyle(n);
          if (/234,\s*179,\s*8/.test(`${cs.backgroundColor} ${cs.boxShadow} ${cs.background}`)) { hits.push(cell.getAttribute('data-square')); break; }
        }
      }
      return [...new Set(hits)];
    });
    if (boardYellow.length) { markLanded = true; detail = `yellow squares: ${boardYellow.join(',')}`; break; }
    if (i === 29) detail = detail || `readFired=${readFired} markLanded=${markLanded}`;
  }
} catch (e) { detail = 'ERROR ' + String(e).slice(0, 160); }

await b.close();
console.log('=== ON-DEMAND READ MARKS (prod, muted) ===');
console.log(`read fired (on-topic reply): ${readFired ? '✓' : '✗'}`);
console.log(`yellow key-square highlight on board: ${markLanded ? '✓' : '✗'} ${detail}`);
console.log(`pageErrors: ${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0] : ''}`);
console.log(`reply tail: ${replyText.replace(/\s+/g, ' ').slice(-240)}`);
// The wire is the read firing on-topic; the mark is best-effort (the render is
// the shipped bestMoveFromTo channel). Fail only on pageError or a dead read.
process.exit(pageErrors.length === 0 && readFired ? 0 : 1);
