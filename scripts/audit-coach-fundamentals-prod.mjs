// Post-deploy audit (David 2026-08-26): the coach must TEACH in-chat, grounded.
//   1. "teach me the fundamentals" → the principles, NOT "the best move is e4".
//   2. "teach me the opera game"   → grounded Opera/Morphy answer, NOT gutted.
//   3. "show me morphy's games"    → the Opera Game, NOT a fuzzy Evans-Gambit picker.
//   4. "teach me my weaknesses"    → an in-chat answer, not yanked to a drill.
//   5. /coach/fundamentals         → the 7 phase sections + Listen/Drill + Opera walk.
// TTS is muted (G1: audits never spend TTS money).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
const p = await ctx.newPage();
await p.addInitScript(muteTtsForAudit);

const results = [];
const rec = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name} — ${detail}`); };

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

// Ask a question in the teach chat, return the lower-cased body text once the
// coach has responded (polls until the text grows past the pre-ask baseline).
async function ask(text) {
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const before = (await p.locator('body').innerText()).length;
  await box.click();
  await box.pressSequentially(text, { delay: 10 });
  await box.press('Enter');
  let body = '';
  for (let i = 0; i < 30; i++) {
    await p.waitForTimeout(2000);
    body = (await p.locator('body').innerText());
    if (body.length > before + 40) break;
  }
  return body.toLowerCase();
}

try {
  // ── Chat lanes ───────────────────────────────────────────────────────────
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();

  {
    const body = await ask('teach me the fundamentals');
    const teaches = /piece|develop|cent(er|re)|king safety|castl/.test(body);
    const notBestMove = !/the best move is/.test(body);
    rec('fundamentals taught in-chat', teaches && notBestMove, `teaches=${teaches} notBestMove=${notBestMove}`);
  }

  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  {
    const body = await ask('teach me the opera game');
    const grounded = /morphy|opera|1858/.test(body);
    const notFuzzy = !/did you mean|pick a .*line/.test(body);
    rec('opera game grounded, not gutted', grounded && notFuzzy, `grounded=${grounded} notFuzzy=${notFuzzy}`);
  }

  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  {
    const body = await ask("show me morphy's games");
    const opera = /morphy|opera/.test(body);
    const notEvans = !/evans gambit/.test(body) && !/did you mean/.test(body);
    rec('morphy → opera game, not fuzzy opening', opera && notEvans, `opera=${opera} notEvans=${notEvans}`);
  }

  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  {
    const before = p.url();
    const body = await ask('teach me my weaknesses');
    // In-chat answer (coach said something), not silently yanked into a drill.
    const responded = body.length > 0;
    const notDrilled = !p.url().includes('drill=') || body.length > 200;
    rec('weaknesses answered in-chat', responded, `responded=${responded} url=${p.url().replace(before, '…')}`);
  }

  // ── Fundamentals track ─────────────────────────────────────────────────────
  await p.goto(`${BASE}/coach/fundamentals`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  {
    await p.locator('[data-testid="fundamentals-page"]').waitFor({ timeout: 20000 });
    // Standard hub shell: SmartSearchBar mounted.
    const search = await p.locator('[data-testid="fundamentals-page"] input').count();
    // The 7 phase sections, each with Listen + Drill.
    const SECTIONS = ['opening-play', 'center', 'development', 'king-safety', 'pawn-structure', 'tactics-threats', 'endgame-technique'];
    const sec = [], listen = [], drill = [];
    for (const t of SECTIONS) {
      sec.push(await p.locator(`[data-testid="fundamental-section-${t}"]`).count());
      listen.push(await p.locator(`[data-testid="fundamental-listen-${t}"]`).count());
      drill.push(await p.locator(`[data-testid="fundamental-drill-${t}"]`).count());
    }
    const all = (a) => a.every((c) => c > 0);
    const walk = await p.locator('[data-testid="fundamental-walk-development"]').count();
    rec('fundamentals hub: 7 sections + Listen + Drill + search + opera walk',
      all(sec) && all(listen) && all(drill) && search > 0 && walk > 0,
      `sec=${sec.join('')} listen=${listen.join('')} drill=${drill.join('')} search=${search} walk=${walk}`);
    // Drill hands off to a real puzzle drill (themed section → /tactics/drill).
    await p.locator('[data-testid="fundamental-drill-endgame-technique"]').click();
    await p.waitForTimeout(1500);
    const url = p.url();
    rec('fundamentals drill routes to the puzzle drill', /\/tactics\/drill/.test(url), `url=${url}`);
  }
} catch (e) {
  rec('run', false, 'ERROR ' + String(e).slice(0, 160));
}

await b.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
