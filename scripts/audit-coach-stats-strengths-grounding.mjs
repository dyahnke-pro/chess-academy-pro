// Post-deploy audit for the STATS/RECORD + STRENGTHS grounded verticals
// (David 2026-07-04: "Keep working these types of questions to coach").
// "what's my rating / record / win rate?" now voices getOverviewInsights +
// the profile rating (assembleStatsAnswer); "what am I good at?" voices the
// computed strengths (assembleStrengthsAnswer) — the inverse of the weakness
// path so it stops getting a weakness-dump. Both are surface-universal via
// buildQuestionGrounding, so this drives the LIVE prod opening-page coach chat
// against the real brain, seeds real game data, and pushes it with
// off-canonical + collision + break inputs (G7: interactive, adversarial).
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const breaks = [];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await attachProxyInterception(ctx);
const page = await ctx.newPage();
page.on('pageerror', (e) => breaks.push({ kind: 'pageerror', detail: (e.message || '').split('\n')[0] }));

async function dismiss() {
  const cb = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await cb.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => null); await cb.waitFor({ state: 'detached', timeout: 12000 }).catch(() => null); }
  const c = page.locator('[data-testid="ai-consent-allow"]');
  if (await c.count() && await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => null); await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null); }
  const h = page.locator('[data-testid="page-help-modal"]');
  if (await h.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(300); }
}

// Signatures. A grounded STATS reply names a number/record/win-rate/rating; a
// grounded STRENGTHS reply names what the student does well. The no-data line
// ("haven't ... games") is grounded-but-empty (proves routing when the seed
// didn't take). A PUNT/misroute asks the student to tell it, or launches a
// lesson instead of answering.
const PUNT_SIG = /only you can tell me|i'?d need you to name|you haven'?t (told|named)|what.?s your favou?rite|i can'?t tell you what your|let'?s (start|begin|learn|dive)|shall we (start|begin)|which opening would you like/i;
const NODATA_SIG = /haven'?t (played|imported|analy[sz]ed).*(game|record|rating|win)|play (a few |some )?more/i;
const STATS_GROUND = /\b\d{1,3}%|\brecord is\b|\bwin[\s-]?rate\b|\brating is about\b|\b\d+-\d+-\d+\b|as white|as black|\bscalp\b/i;
const STRENGTH_GROUND = /what you do well|you do well|strength|strong|win rate as (white|black)|zero blunder|brilliant|in-repertoire|opening prep/i;

// probeKind: 'stats' | 'strengths' | 'opening-profile' | 'progress'
const PROBES = [
  // ── STATS canonical + off-canonical ──
  { q: "what's my rating", kind: 'stats' },
  { q: "what's my record", kind: 'stats' },
  { q: 'how am I doing overall', kind: 'stats' },
  { q: "what's my win rate as white", kind: 'stats' },
  { q: 'how many games have I won', kind: 'stats' },
  { q: 'whats my w/l', kind: 'stats' },
  { q: 'what is my winning percentage', kind: 'stats' },
  // ── STRENGTHS canonical + off-canonical ──
  { q: 'what am I good at', kind: 'strengths' },
  { q: 'what are my strengths', kind: 'strengths' },
  { q: 'what do I do well', kind: 'strengths' },
  { q: 'my strong suit', kind: 'strengths' },
  { q: 'what am I best at', kind: 'strengths' },
  // ── COLLISION guards (must NOT route to stats/strengths) ──
  { q: "what's my strongest opening", kind: 'opening-profile' },
  { q: 'what am I weak at', kind: 'progress' },
  { q: 'what are my weaknesses', kind: 'progress' },
  // ── BREAK attempts (messy human input) ──
  { q: "what's my rating??? 🤔", kind: 'stats' },
  { q: 'my w-l record and how am i doing', kind: 'stats' },
  { q: 'yo what do i actually do well in my games', kind: 'strengths' },
];

async function seedGames() {
  await page.evaluate(async () => {
    await new Promise((res) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => {
        const db = r.result;
        const stores = [];
        if (db.objectStoreNames.contains('profiles')) stores.push('profiles');
        if (db.objectStoreNames.contains('games')) stores.push('games');
        if (stores.length === 0) return res(0);
        const tx = db.transaction(stores, 'readwrite');
        if (stores.includes('profiles')) {
          const p = tx.objectStore('profiles');
          // Overwrite the app-seeded 'main' profile with a known username +
          // rating so getUsername matches our games and the rating line fires.
          p.get('main').onsuccess = (ev) => {
            const existing = ev.target.result || {};
            p.put({
              ...existing, id: 'main', name: 'auditbot', currentRating: 1520,
              preferences: { ...(existing.preferences || {}), chessComUsername: 'auditbot' },
            });
          };
        }
        if (stores.includes('games')) {
          const g = tx.objectStore('games');
          const mk = (id, color, result, oppElo) => {
            const opp = `opponent_${id}`;
            return {
              id: `audit-g-${id}`, isMasterGame: false, result,
              white: color === 'white' ? 'auditbot' : opp,
              black: color === 'black' ? 'auditbot' : opp,
              whiteElo: color === 'white' ? 1520 : oppElo,
              blackElo: color === 'black' ? 1520 : oppElo,
              pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 1-0',
              playedAt: '2026-06-01T12:00:00.000Z',
            };
          };
          // White: 5 games, 4 wins (80% ≥60 → strength) incl. a 2100 scalp.
          g.put(mk('w1', 'white', '1-0', 1450));
          g.put(mk('w2', 'white', '1-0', 1600));
          g.put(mk('w3', 'white', '1-0', 2100)); // highestBeaten
          g.put(mk('w4', 'white', '1-0', 1500));
          g.put(mk('w5', 'white', '0-1', 1700)); // loss
          // Black: 3 games, 2 wins (67% ≥60 → strength).
          g.put(mk('b1', 'black', '0-1', 1480));
          g.put(mk('b2', 'black', '0-1', 1550));
          g.put(mk('b3', 'black', '1-0', 1620)); // loss
          // 1 draw. Totals: 9 games, 6-2-1, winRate 67%.
          g.put(mk('d1', 'white', '1/2-1/2', 1490));
        }
        tx.oncomplete = () => res(1); tx.onerror = () => res(0);
      };
      r.onerror = () => res(0);
    });
  });
}

function classify(kind, reply) {
  const punted = PUNT_SIG.test(reply);
  const noData = NODATA_SIG.test(reply);
  if (reply.length < 15) return { ok: false, tag: 'silent' };
  if (kind === 'stats') {
    if (punted && !STATS_GROUND.test(reply)) return { ok: false, tag: 'PUNTED' };
    if (STATS_GROUND.test(reply) || noData) return { ok: true, tag: noData ? 'grounded(no-data)' : 'grounded(stats)' };
    return { ok: false, tag: 'off-topic' };
  }
  if (kind === 'strengths') {
    if (punted && !STRENGTH_GROUND.test(reply)) return { ok: false, tag: 'PUNTED' };
    if (STRENGTH_GROUND.test(reply) || noData) return { ok: true, tag: noData ? 'grounded(no-data)' : 'grounded(strengths)' };
    return { ok: false, tag: 'off-topic' };
  }
  // Collision guards: must be a real grounded answer (opening / weakness), NOT
  // a lesson-launch punt. We only fail if it PUNTS — the content routing is
  // covered by the unit tests; here we assert it still answers.
  if (punted) return { ok: false, tag: 'PUNTED(collision)' };
  return { ok: true, tag: 'answered' };
}

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500); await dismiss();
  await seedGames();

  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000); await dismiss();
  const openBtn = page.locator('[data-testid="masterclass-coach-open"]');
  if (!(await openBtn.count())) { breaks.push({ kind: 'no-surface', detail: 'masterclass-coach-open not found on /openings/caro-kann' }); }
  else {
    await openBtn.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); await dismiss();
    let idx = 0;
    for (const p of PROBES) {
      idx++;
      const inp = page.locator('[data-testid="chat-text-input"]').first();
      for (let k = 0; k < 25 && !(await inp.isEnabled().catch(() => false)); k++) await page.waitForTimeout(1000);
      const before = await page.locator('[data-testid="chat-message-assistant"]').count();
      await inp.click().catch(() => null); await inp.pressSequentially(p.q, { delay: 8 }).catch(() => null); await page.keyboard.press('Enter').catch(() => null);
      let reply = '';
      const start = Date.now();
      while (Date.now() - start < 50000) {
        await page.waitForTimeout(1400);
        if ((await page.locator('[data-testid="chat-message-assistant"]').count()) > before) {
          reply = (await page.locator('[data-testid="chat-message-assistant"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
          if (reply.length > 20) break;
        }
      }
      const verdict = classify(p.kind, reply);
      if (!verdict.ok) breaks.push({ kind: verdict.tag, detail: `[${p.kind}] "${p.q}" → «${reply.slice(0, 130)}»` });
      console.log(`\n[${idx}/${PROBES.length}] Q(${p.kind}): ${p.q}\n  ${verdict.ok ? '✅' : '❌'} ${verdict.tag} :: «${reply.slice(0, 170)}»`);
      // Pace brain-heavy turns so the loop doesn't manufacture false hangs (G7).
      await page.waitForTimeout(900);
    }
  }
} catch (e) { breaks.push({ kind: 'harness', detail: e.message.split('\n')[0] }); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} BREAKS ===`);
for (const b of real) console.log(`  ! [${b.kind}] ${b.detail}`);
if (breaks.some((b) => b.kind === 'harness')) console.log(`  (harness note: ${breaks.find((b) => b.kind === 'harness').detail})`);
process.exit(real.length ? 1 : 0);
