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
  // NB: coach-narration-spoken is a logAppAudit event, not a window event — the
  // spoken line is captured via the narration-listener sidecar (G1), not here.
  // This driver verifies the VISIBLE contract (fork bar, real options, the why
  // in the node text); on-device TTS audibility is the device-only check (G7).
  await p.addInitScript(muteTtsForAudit);
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(p); await dismiss(p);
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  // Let the mount greeting settle so we don't mistake it for the answer.
  await sleep(2500);
  const bubble = p.locator('[data-testid="chat-message-assistant"]');
  const before = await bubble.count();

  console.log(`\n▶ ASK: "${ASK}" (greeting bubbles before = ${before})`);
  // Wait for the input to be enabled before typing (a busy turn disables it).
  for (let i = 0; i < 20 && await box.isDisabled().catch(() => false); i += 1) await sleep(1000);
  await box.click(); await box.pressSequentially(ASK, { delay: 8 }); await box.press('Enter');

  // Confirm the message actually submitted (input clears on submit).
  let submitted = false;
  for (let i = 0; i < 8; i += 1) { await sleep(500); if (((await box.inputValue().catch(() => ASK)) || '').trim() === '') { submitted = true; break; } }
  console.log(`  SUBMITTED: ${submitted}`);
  await sleep(2500);
  console.log(`  URL AFTER ASK: ${p.url().replace(BASE, '')}`);

  // 1) read NEW assistant bubbles (after the greeting)
  let prose = '';
  for (let i = 0; i < 24; i += 1) { await sleep(1200); if (await bubble.count() > before) { try { prose = (await bubble.nth(before).innerText()).trim(); } catch {} if (prose.length > 20) break; } }
  console.log(`  NEW BUBBLE: ${prose.slice(0, 340) || '[none]'}`);

  // 1b) any walkthrough UI mounted? (fork/skip/board panels)
  const wtAny = await p.locator('[data-testid="walkthrough-fork-bar"],[data-testid="walkthrough-skip"],[data-testid="walkthrough-fork-panel"],[data-testid="walkthrough-leaf-panel"],[data-testid="walkthrough-stage-menu"]').count();
  console.log(`  WALKTHROUGH UI PRESENT: ${wtAny > 0}`);

  // 2) the walkthrough tree should mount + auto-advance to a FORK bar
  const forkBar = p.locator('[data-testid="walkthrough-fork-bar"]');
  let reachedFork = false;
  for (let i = 0; i < 40; i += 1) { await sleep(1000); if (await forkBar.count() > 0) { reachedFork = true; break; } }
  console.log(`  FORK BAR REACHED: ${reachedFork}`);

  if (reachedFork) {
    const opts = p.locator('[data-testid^="walkthrough-fork-option-"]');
    const n = await opts.count();
    console.log(`  FORK OPTIONS: ${n}`);
    for (let i = 0; i < n; i += 1) {
      const t = (await opts.nth(i).innerText()).replace(/\s+/g, ' ').trim();
      console.log(`    [${i}] ${t.slice(0, 120)}`);
    }
    // 3) pick the majority line and confirm the walk CONTINUES (deeper fork or
    //    leaf), delivering the why — not that it silently ends.
    if (n > 0) {
      const asstBefore = await p.locator('[data-testid="chat-message-assistant"]').count();
      await opts.first().click();
      // let the picked node narrate + auto-advance
      let secondFork = false, leaf = false, wtSkip = false;
      for (let i = 0; i < 12; i += 1) {
        await sleep(1500);
        if (await p.locator('[data-testid="walkthrough-fork-bar"]').count() > 0) secondFork = true;
        if (await p.locator('[data-testid="walkthrough-leaf-panel"]').count() > 0) leaf = true;
        if (await p.locator('[data-testid="walkthrough-skip"]').count() > 0) wtSkip = true;
        if (secondFork || leaf) break;
      }
      const asstAfter = await p.locator('[data-testid="chat-message-assistant"]').count();
      console.log(`  AFTER PICK: reachedSecondFork=${secondFork} reachedLeaf=${leaf} walkthroughSkillActive=${wtSkip} newBubbles=${asstAfter - asstBefore}`);
      // read the newest coach narration (should carry the picked line's why)
      if (asstAfter > asstBefore) {
        try { console.log(`  PICKED-NODE NARRATION: ${(await p.locator('[data-testid="chat-message-assistant"]').last().innerText()).replace(/\s+/g, ' ').trim().slice(0, 240)}`); } catch {}
      }
      if (secondFork) {
        const o2 = p.locator('[data-testid^="walkthrough-fork-option-"]');
        const n2 = await o2.count();
        console.log(`  SECOND FORK OPTIONS: ${n2}`);
        for (let i = 0; i < n2; i += 1) console.log(`    [${i}] ${(await o2.nth(i).innerText()).replace(/\s+/g, ' ').trim().slice(0, 120)}`);
      }
    }
  }

  await ctx.close(); await browser.close();
}
main().catch((e) => { console.error(e); process.exit(2); });
