// W1 hand-driver: verify "how does <pro> play the <opening>" mounts the
// fork-in-the-road lesson — his real games aggregated into a spine + forks,
// a grounded WHY on every node. I steer + read the output; not an autopilot.
//   ASK="how does naroditsky play the caro-kann" node scripts/audit-pro-fork-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.ASK || 'how does naroditsky play the caro-kann';

async function dismiss(p) {
  for (const [g, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  const p = await ctx.newPage();
  const spoken = [];
  await p.exposeFunction('__auditSpoke', (t) => spoken.push(t));
  await p.addInitScript(muteTtsForAudit);
  await p.addInitScript(() => {
    window.addEventListener('coach-narration-spoken', (e) => { try { window.__auditSpoke(String(e.detail?.text || '').slice(0, 200)); } catch {} });
  });
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(p); await dismiss(p);
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });

  console.log(`\n▶ ASK: "${ASK}"`);
  const bubble = p.locator('[data-testid="chat-message-assistant"]');
  const before = await bubble.count();
  await box.click(); await box.pressSequentially(ASK, { delay: 6 }); await box.press('Enter');

  // 1) read the coach's framing bubble
  let prose = '';
  for (let i = 0; i < 20; i += 1) { await sleep(1200); if (await bubble.count() > before) { try { prose = (await bubble.last().innerText()).trim(); } catch {} if (prose.length > 20) break; } }
  console.log(`  BUBBLE: ${prose.slice(0, 320) || '[none]'}`);

  // 2) the walkthrough tree should mount + auto-advance to a FORK bar
  const forkBar = p.locator('[data-testid="walkthrough-fork-bar"]');
  let reachedFork = false;
  for (let i = 0; i < 30; i += 1) { await sleep(1000); if (await forkBar.count() > 0) { reachedFork = true; break; } }
  console.log(`  FORK BAR REACHED: ${reachedFork}`);

  if (reachedFork) {
    const opts = p.locator('[data-testid^="walkthrough-fork-option-"]');
    const n = await opts.count();
    console.log(`  FORK OPTIONS: ${n}`);
    for (let i = 0; i < n; i += 1) {
      const t = (await opts.nth(i).innerText()).replace(/\s+/g, ' ').trim();
      console.log(`    [${i}] ${t.slice(0, 120)}`);
    }
    // 3) pick the first (his majority line) and confirm the walk continues
    if (n > 0) {
      await opts.first().click();
      await sleep(2500);
      const stillMounted = await p.locator('[data-testid="walkthrough-fork-bar"],[data-testid="walkthrough-fork-option-0"],[data-testid="walkthrough-leaf-panel"],[data-testid="walkthrough-fork-panel"]').count();
      console.log(`  AFTER PICK: walkthrough-still-active=${stillMounted > 0}`);
    }
  }

  // 4) what the coach actually SPOKE (the whys) — narration listener
  await sleep(1500);
  console.log(`  SPOKEN LINES (${spoken.length}):`);
  for (const s of spoken.slice(0, 8)) console.log(`    · ${s}`);

  await ctx.close(); await browser.close();
}
main().catch((e) => { console.error(e); process.exit(2); });
