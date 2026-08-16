#!/usr/bin/env node
/**
 * audit-coach-polyglot-loop — the adversarial coach loop David asked for
 * (2026-07-10): "test languages, play and learn tabs, play whole games, ask
 * questions, ask for actions to be performed. Each run is different — asking
 * different questions using different languages."
 *
 * Each PASS picks a DIFFERENT language (rotates through en/es/fr/de/pt/it) and a
 * DIFFERENT shuffled subset of questions + action-commands, and drives BOTH
 * /coach/teach (Learn) and /coach/play (Play). On Play it plays a WHOLE game
 * (until game-over or the ply cap), interleaving questions + commands. It
 * asserts, per turn:
 *   • the coach ANSWERS (non-empty, not an error-fallback)
 *   • no false board-claim (piece-on-square claim untrue on the live FEN)
 *   • ACTION commands take effect (settings apply + confirm; nav routes)
 *   • LANGUAGE: a question asked in Spanish/French/… is answered in THAT
 *     language (heuristic marker-word check) — an English reply to a non-English
 *     question is a BREAK ("answered in English to a <lang> question").
 *   • verbosity behavior: silent → 0 /api/tts; brief → capped; full → spoken.
 *
 * 3 instruments (G1): Playwright drives; the narration listener sidecar captures
 * what was SPOKEN; the live LLM + Polly are reached through the PROD API RELAY
 * (this container's browser can't reach prod/DeepSeek directly and the local LLM
 * keys are expired — node relays /api/* to prod, which holds the working keys).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-coach-polyglot-loop.mjs
 *   env: AUDIT_PASSES (default 100), AUDIT_SURFACES ("learn,play"),
 *        AUDIT_PLY (whole-game ply cap on Play, def 50), AUDIT_VITE (dev origin)
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { falseBoardClaims, resolveClaimFen } from './audit-lib/board-claims.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { startProdApiRelay } from './audit-lib/prod-api-relay.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const VITE = process.env.AUDIT_VITE ?? 'http://localhost:5173';
const PASSES = Number(process.env.AUDIT_PASSES ?? 100);
const SURFACES = (process.env.AUDIT_SURFACES ?? 'learn,play').split(',').map((s) => s.trim()).filter(Boolean);
const PLY_CAP = Number(process.env.AUDIT_PLY ?? 50);
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const BOOT_TIMEOUT_MS = 60_000;
const BRIEF_WORD_CAP = 34;
const OUT_DIR = join('audit-reports', `coach-polyglot-${new Date().toISOString().replace(/[:.]/g, '-')}`);

/**
 * Per-language bank. `q` = questions (kind + text), `a` = action commands
 * (kind + text + how to verify the reply confirms), `markers` = function/word
 * tokens that only appear in that language (used to detect the reply language),
 * `confirmWords` = tokens the settings confirmation should contain in-language.
 */
const LANGS = [
  {
    code: 'en', name: 'English',
    markers: [' the ', ' is ', ' your ', ' best ', ' move ', ' king ', ' queen ', ' knight '],
    q: [
      { kind: 'best', text: 'what is the best move here?' },
      { kind: 'candidate', text: 'is Qf3 ok to play?' },
      { kind: 'safety', text: 'is my queen safe?' },
      { kind: 'player', text: 'how does Magnus play this?' },
      { kind: 'plan', text: "what's the plan in this position?" },
      { kind: 'why', text: 'why is that the best move?' },
    ],
    a: [
      { kind: 'hints-off', text: 'turn off hints', confirm: /hint/i },
      { kind: 'hints-on', text: 'turn hints back on', confirm: /hint/i },
      { kind: 'narr-silent', text: 'set narration to silent', confirm: /silent|narration/i },
      { kind: 'narr-brief', text: 'set narration to brief', confirm: /brief|narration/i },
      { kind: 'narr-full', text: 'set narration to full', confirm: /full|narration/i },
      { kind: 'theme-dark', text: 'switch to dark theme', confirm: /dark|theme/i },
      { kind: 'nav-tactics', text: 'take me to the tactics tab', confirm: /tactic/i },
    ],
  },
  {
    code: 'es', name: 'Spanish',
    markers: [' el ', ' la ', ' de ', ' que ', ' es ', ' tu ', ' rey ', ' dama ', ' caballo ', ' mejor ', ' jugada ', ' para ', ' está '],
    q: [
      { kind: 'best', text: '¿cuál es la mejor jugada aquí?' },
      { kind: 'candidate', text: '¿es buena la jugada Dama f3?' },
      { kind: 'safety', text: '¿está segura mi dama?' },
      { kind: 'player', text: '¿cómo juega Magnus esta posición?' },
      { kind: 'plan', text: '¿cuál es el plan en esta posición?' },
      { kind: 'why', text: '¿por qué es esa la mejor jugada?' },
    ],
    a: [
      { kind: 'hints-off', text: 'desactiva las pistas', confirm: /pista|hint|desactiv/i },
      { kind: 'hints-on', text: 'activa las pistas otra vez', confirm: /pista|hint|activ/i },
      { kind: 'narr-silent', text: 'pon la narración en silencio', confirm: /silenci|narrac|silent/i },
      { kind: 'narr-brief', text: 'pon la narración breve', confirm: /brev|narrac|brief/i },
      { kind: 'narr-full', text: 'pon la narración completa', confirm: /complet|narrac|full/i },
      { kind: 'theme-dark', text: 'cambia al tema oscuro', confirm: /oscur|tema|dark|theme/i },
      { kind: 'nav-tactics', text: 'llévame a la pestaña de táctica', confirm: /táctic|tactic/i },
    ],
  },
  {
    code: 'fr', name: 'French',
    markers: [' le ', ' la ', ' de ', ' est ', ' ton ', ' votre ', ' roi ', ' dame ', ' cavalier ', ' meilleur ', ' coup ', ' pour ', ' quel '],
    q: [
      { kind: 'best', text: 'quel est le meilleur coup ici ?' },
      { kind: 'candidate', text: 'est-ce que Dame f3 est jouable ?' },
      { kind: 'safety', text: 'ma dame est-elle en sécurité ?' },
      { kind: 'player', text: 'comment Magnus joue-t-il cette position ?' },
      { kind: 'plan', text: 'quel est le plan dans cette position ?' },
      { kind: 'why', text: 'pourquoi est-ce le meilleur coup ?' },
    ],
    a: [
      { kind: 'hints-off', text: 'désactive les indices', confirm: /indice|hint|désactiv/i },
      { kind: 'hints-on', text: 'réactive les indices', confirm: /indice|hint|activ/i },
      { kind: 'narr-silent', text: 'mets la narration en silencieux', confirm: /silenci|narrat|silent/i },
      { kind: 'narr-brief', text: 'mets la narration en bref', confirm: /bref|brève|narrat|brief/i },
      { kind: 'narr-full', text: 'mets la narration complète', confirm: /complèt|narrat|full/i },
      { kind: 'theme-dark', text: 'passe au thème sombre', confirm: /sombre|thème|dark|theme/i },
      { kind: 'nav-tactics', text: "emmène-moi à l'onglet tactique", confirm: /tactiqu|tactic/i },
    ],
  },
  {
    code: 'de', name: 'German',
    markers: [' der ', ' die ', ' das ', ' ist ', ' dein ', ' könig ', ' dame ', ' springer ', ' beste ', ' zug ', ' für ', ' welche '],
    q: [
      { kind: 'best', text: 'was ist der beste Zug hier?' },
      { kind: 'candidate', text: 'ist Dame f3 spielbar?' },
      { kind: 'safety', text: 'ist meine Dame sicher?' },
      { kind: 'player', text: 'wie spielt Magnus diese Stellung?' },
      { kind: 'plan', text: 'was ist der Plan in dieser Stellung?' },
      { kind: 'why', text: 'warum ist das der beste Zug?' },
    ],
    a: [
      { kind: 'hints-off', text: 'schalte die Hinweise aus', confirm: /hinweis|hint|aus/i },
      { kind: 'hints-on', text: 'schalte die Hinweise wieder ein', confirm: /hinweis|hint|ein/i },
      { kind: 'narr-silent', text: 'stelle die Erzählung auf stumm', confirm: /stumm|erzähl|silent/i },
      { kind: 'narr-brief', text: 'stelle die Erzählung auf kurz', confirm: /kurz|erzähl|brief/i },
      { kind: 'narr-full', text: 'stelle die Erzählung auf vollständig', confirm: /vollständ|erzähl|full/i },
      { kind: 'theme-dark', text: 'wechsle zum dunklen Design', confirm: /dunkl|design|dark|theme/i },
      { kind: 'nav-tactics', text: 'bring mich zum Taktik-Tab', confirm: /taktik|tactic/i },
    ],
  },
  {
    code: 'pt', name: 'Portuguese',
    markers: [' o ', ' a ', ' de ', ' que ', ' é ', ' seu ', ' rei ', ' dama ', ' cavalo ', ' melhor ', ' lance ', ' para ', ' qual '],
    q: [
      { kind: 'best', text: 'qual é o melhor lance aqui?' },
      { kind: 'candidate', text: 'o lance Dama f3 é bom?' },
      { kind: 'safety', text: 'minha dama está segura?' },
      { kind: 'player', text: 'como o Magnus joga esta posição?' },
      { kind: 'plan', text: 'qual é o plano nesta posição?' },
      { kind: 'why', text: 'por que esse é o melhor lance?' },
    ],
    a: [
      { kind: 'hints-off', text: 'desative as dicas', confirm: /dica|hint|desativ/i },
      { kind: 'hints-on', text: 'ative as dicas novamente', confirm: /dica|hint|ativ/i },
      { kind: 'narr-silent', text: 'coloque a narração em silêncio', confirm: /silênci|narraç|silent/i },
      { kind: 'narr-brief', text: 'coloque a narração breve', confirm: /brev|narraç|brief/i },
      { kind: 'narr-full', text: 'coloque a narração completa', confirm: /complet|narraç|full/i },
      { kind: 'theme-dark', text: 'mude para o tema escuro', confirm: /escur|tema|dark|theme/i },
      { kind: 'nav-tactics', text: 'leve-me para a aba de táticas', confirm: /tátic|tactic/i },
    ],
  },
  {
    code: 'it', name: 'Italian',
    markers: [' il ', ' la ', ' di ', ' che ', ' è ', ' tuo ', ' re ', ' donna ', ' cavallo ', ' migliore ', ' mossa ', ' per ', ' quale '],
    q: [
      { kind: 'best', text: "qual è la mossa migliore qui?" },
      { kind: 'candidate', text: 'la mossa Donna f3 è buona?' },
      { kind: 'safety', text: 'la mia donna è al sicuro?' },
      { kind: 'player', text: 'come gioca Magnus questa posizione?' },
      { kind: 'plan', text: 'qual è il piano in questa posizione?' },
      { kind: 'why', text: 'perché è la mossa migliore?' },
    ],
    a: [
      { kind: 'hints-off', text: 'disattiva i suggerimenti', confirm: /suggeriment|hint|disattiv/i },
      { kind: 'hints-on', text: 'riattiva i suggerimenti', confirm: /suggeriment|hint|attiv/i },
      { kind: 'narr-silent', text: 'metti la narrazione in silenzio', confirm: /silenzi|narrazi|silent/i },
      { kind: 'narr-brief', text: 'metti la narrazione breve', confirm: /brev|narrazi|brief/i },
      { kind: 'narr-full', text: 'metti la narrazione completa', confirm: /complet|narrazi|full/i },
      { kind: 'theme-dark', text: 'passa al tema scuro', confirm: /scur|tema|dark|theme/i },
      { kind: 'nav-tactics', text: 'portami alla scheda tattica', confirm: /tattic|tactic/i },
    ],
  },
];

/** Heuristic: is `reply` written in `lang`? Count marker hits for the target
 *  vs English. Non-English target with strong English lean + no target markers
 *  ⇒ "answered in English". Returns { inTarget, detail }. */
function replyLanguage(reply, lang) {
  const pad = ` ${String(reply).toLowerCase().replace(/[.,!?¿¡;:()"]/g, ' ').replace(/\s+/g, ' ')} `;
  const hits = (arr) => arr.reduce((n, w) => n + (pad.includes(w) ? 1 : 0), 0);
  const en = LANGS[0];
  const targetHits = hits(lang.markers);
  const enHits = lang.code === 'en' ? targetHits : hits(en.markers);
  if (lang.code === 'en') return { inTarget: true, detail: `en-markers=${targetHits}` };
  const inTarget = targetHits >= 2 && targetHits >= enHits;
  return { inTarget, detail: `${lang.code}-markers=${targetHits} en-markers=${enHits}` };
}

const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const rotate = (arr, by) => arr.map((_, i) => arr[(i + by) % arr.length]);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const relay = await startProdApiRelay({ vite: VITE });
  const listener = await startAuditListener();
  const BASE_URL = relay.url;
  console.log(`[polyglot] app=${VITE} via relay=${relay.url} (LLM+TTS → prod)`);
  console.log(`[polyglot] listener=${listener.url}  surfaces=${SURFACES.join('+')}  passes=${PASSES}  out=${OUT_DIR}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });

  const passReports = [];
  let pass = 0, stop = false;
  process.on('SIGINT', () => { stop = true; });

  while (pass < PASSES && !stop) {
    pass++;
    const lang = LANGS[(pass - 1) % LANGS.length];
    for (const surface of SURFACES) {
      const label = `pass${pass}:${surface}:${lang.code}`;
      const breaks = [];
      let inFlight = `${label} boot`;
      const spoken = [];
      const recordBreak = (kind, detail) => {
        breaks.push({ kind, detail, inFlight });
        console.log(`    ✗ BREAK [${kind}] during "${inFlight}": ${detail}`);
      };

      const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1180, height: 940 } });
      const page = await ctx.newPage();
  await blockTtsNetwork(page);   // instrument keeps the request; the provider never sees it
      const sameKeySeen = new Set();
      page.on('console', async (m) => {
        const t = m.text();
        // Ignore: network noise + the vite HMR websocket (dev-server only).
        if (m.type() !== 'error' || /ERR_|Failed to load resource|favicon|manifest|net::|WebSocket|ws:\/\/|HMR|\[vite\]/i.test(t)) return;
        // Duplicate-key warning (the 2026-06-12 arrow-regression class): capture
        // the KEY VALUE (args[1]) + component stack (last arg) — the warning text
        // alone is useless. Dedupe by key so 70 identical floods → 1 break.
        if (/same key|unique .?key|Each child in a list/i.test(t)) {
          let keyVal = '', stack = '';
          try { const a = m.args(); keyVal = a[1] ? String(await a[1].jsonValue().catch(() => '')) : ''; const last = a[a.length - 1]; stack = last ? String(await last.jsonValue().catch(() => '')).slice(0, 200) : ''; } catch { /* */ }
          const sig = `dupkey:${keyVal}`;
          if (!sameKeySeen.has(sig)) { sameKeySeen.add(sig); recordBreak('react-dup-key', `key="${keyVal}" stack=${stack.replace(/\s+/g, ' ')}`); }
          return;
        }
        recordBreak('console-error', t.slice(0, 160));
      });
      page.on('pageerror', (e) => recordBreak('pageerror', (e?.message ?? String(e)).slice(0, 160)));
      // capture spoken text off the relayed /api/tts request bodies
      page.on('request', (r) => {
        if (r.url().includes('/api/tts') && r.method() === 'POST') {
          try { const b = r.postData(); if (b) { const j = JSON.parse(b); if (j.text) spoken.push({ text: String(j.text), ts: Date.now() }); } } catch { /* */ }
        }
      });

      // Reconstruct a piece-placement FEN straight from the react-chessboard
      // DOM (pieces carry data-piece="wP" and encode their square in the element
      // id "…-piece-wP-e4"). Enough for falseBoardClaims' Chess(fen).get(square).
      const appFen = async () => {
        try {
          return await page.evaluate(() => {
            const map = {};
            document.querySelectorAll('[data-piece]').forEach((el) => {
              const dp = el.getAttribute('data-piece') || '';
              const m = (el.id || '').match(/([a-h][1-8])$/);
              if (dp.length === 2 && m) {
                const color = dp[0]; const type = dp[1];
                const ch = color === 'w' ? type.toUpperCase() : type.toLowerCase();
                map[m[1]] = ch;
              }
            });
            if (!Object.keys(map).length) return null;
            const rows = [];
            for (let r = 8; r >= 1; r--) {
              let row = '', empty = 0;
              for (const f of 'abcdefgh') {
                const p = map[f + r];
                if (p) { if (empty) { row += empty; empty = 0; } row += p; } else empty++;
              }
              if (empty) row += empty;
              rows.push(row);
            }
            return rows.join('/') + ' w - - 0 1';
          });
        } catch { return null; }
      };
      // Dismiss EVERY blocking overlay. The strength-calibration bubble
      // (z-110, fixed inset-0) RE-APPEARS on the coach route and intercepts the
      // send-button click — the single root cause that made every coach send
      // a silent no-op (David 2026-07-10). Force-click the band, grant AI
      // consent (Apple 5.1.1 modal, also blocking), Escape the help modal.
      const clearOverlays = async () => {
        const calib = page.locator('[data-testid="strength-calibration-bubble"]');
        if (await calib.count()) {
          await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000, force: true }).catch(() => {});
          await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
        }
        const allow = page.locator('[data-testid="ai-consent-allow"]');
        if (await allow.isVisible().catch(() => false)) { await allow.click({ force: true }).catch(() => {}); await page.waitForTimeout(400); }
        const help = page.locator('[data-testid="page-help-modal"]');
        if (await help.count()) { await page.keyboard.press('Escape'); await help.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {}); }
      };
      // Read the coach bubbles DIRECTLY off chat-message-assistant (the message
      // element ChatMessage renders on every surface). Climbing from coach-badge
      // grabbed page chrome — a broken reader that made page text pass as an
      // "answer" (the old loop's hollow Learn-CLEAN). Strip the leading "C" badge.
      const readCoachReplies = async () => {
        try {
          return await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('[data-testid="chat-message-assistant"]').forEach((el) => {
              // textContent concatenates the "C" badge div + the bubble text
              // ("CThe best move…") — strip a single leading badge "C" when a
              // message char follows, so a pre-stream bare "C" reads as empty.
              const t = (el.textContent || '').replace(/\s+/g, ' ').trim().replace(/^C(?=[A-Za-zÀ-ÿ¿¡0-9])/, '').trim();
              if (t) out.push(t);
            });
            return out;
          });
        } catch { return []; }
      };
      const openChatIfNeeded = async () => {
        const btn = page.locator('[data-testid="play-chat-button"]').first();
        if (await btn.count()) {
          await btn.click({ timeout: 4000, force: true }).catch(() => {});
          await page.locator('[data-testid="chat-text-input"], [data-testid="chat-input"] textarea').first()
            .waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
        }
      };
      const sendChat = async (text, settleMs = 35000) => {
        await openChatIfNeeded();
        await clearOverlays(); // re-appearing calib bubble / consent modal eats the send click
        const input = page.locator('[data-testid="chat-text-input"], [data-testid="chat-input"] textarea, [data-testid="chat-input"] input').first();
        if ((await input.count()) === 0) { recordBreak('no-chat-input', `chat-input absent on ${surface}`); return { reply: '', spokenDuring: [] }; }
        const before = new Set(await readCoachReplies());
        const t0 = Date.now();
        await input.click({ timeout: 4000 }).catch(() => {});
        await input.fill(text).catch(() => {});
        const send = page.locator('[data-testid="chat-send-btn"]').first();
        if (await send.count()) await send.click({ timeout: 4000, force: true }).catch(() => {}); else await input.press('Enter').catch(() => {});
        // A consent modal may still pop on the very first send even after the
        // up-front clear — accept it so the swallowed send re-fires.
        const consentAllow = page.locator('[data-testid="ai-consent-allow"]');
        if (await consentAllow.isVisible().catch(() => false)) await consentAllow.click({ force: true }).catch(() => {});
        // Wait for a new bubble with SUBSTANTIAL text (≥8 chars, not the bare "C"
        // badge nor a one-word streaming fragment) so we never read a half-streamed
        // reply as a non-answer.
        await page.waitForFunction((prev) => {
          const cur = [];
          document.querySelectorAll('[data-testid="chat-message-assistant"]').forEach((el) => {
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim().replace(/^C(?=[A-Za-zÀ-ÿ¿¡0-9])/, '').trim();
            if (t.length >= 8) cur.push(t);
          });
          return cur.some((t) => !prev.includes(t));
        }, [...before], { timeout: settleMs }).catch(() => {});
        // Let streaming finish: poll until no streaming-indicator AND the last
        // fresh reply stops growing (or a hard cap), so we read the FINAL text.
        let lastLen = -1, stableTicks = 0;
        for (let i = 0; i < 20; i++) {
          await page.waitForTimeout(700);
          const streaming = await page.locator('[data-testid="streaming-indicator"]').count().catch(() => 0);
          const cur = await readCoachReplies();
          const freshNow = cur.filter((t) => !before.has(t));
          const len = freshNow.length ? freshNow[freshNow.length - 1].length : 0;
          if (!streaming && len === lastLen && len > 0) { if (++stableTicks >= 2) break; } else stableTicks = 0;
          lastLen = len;
        }
        const after = await readCoachReplies();
        const fresh = after.filter((t) => !before.has(t));
        const reply = (fresh.length ? fresh[fresh.length - 1] : (after[after.length - 1] ?? '')).trim();
        return { reply, spokenDuring: spoken.filter((s) => s.ts >= t0) };
      };
      const isNonAnswer = (r) => !r || r.length < 4 || /hit a snag|having trouble connecting|coach is unavailable|i can'?t (help|do) that|not sure what you mean|error/i.test(r);

      try {
        inFlight = `${label} boot`;
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await clearOverlays();

        const route = surface === 'learn' ? '/coach/teach' : '/coach/play';
        inFlight = `${label} open ${route}`;
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
        await page.waitForTimeout(1500);
        await clearOverlays();

        // rotate per pass so each run differs, but ALWAYS include best + why
        // (David 2026-07-10: "make sure you ask why the move is best").
        const must = lang.q.filter((q) => q.kind === 'best' || q.kind === 'why');
        const rest = rotate(lang.q.filter((q) => q.kind !== 'best' && q.kind !== 'why'), pass).slice(0, 2);
        const questions = [...must, ...rest];
        const actions = rotate(lang.a, pass + 1).slice(0, 4);
        const setInFlight = (s) => { inFlight = `${label} ${s}`; };

        if (surface === 'play') {
          await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 40000 }).catch(() => {});
          await clearOverlays();
          const mirror = new Chess();
          const f0 = await appFen(); if (f0) { try { mirror.load(f0); } catch { /* */ } }
          const studentColor = mirror.turn();
          let qi = 0, ai = 0, ply = 0;
          // PLAY A WHOLE GAME, interleaving a question / action every few plies.
          while (ply < PLY_CAP && !mirror.isGameOver()) {
            if (mirror.turn() !== studentColor) {
              await page.waitForTimeout(2500);
              const f = await appFen(); if (f) { try { mirror.load(f); } catch { /* */ } }
              if (mirror.turn() !== studentColor) { await page.waitForTimeout(2500); continue; }
            }
            const legal = mirror.moves({ verbose: true });
            if (!legal.length) break;
            const mv = legal.find((m) => m.flags.includes('c')) ?? legal.find((m) => /[a-h][45]/.test(m.to)) ?? legal[0];
            inFlight = `${label} play ${mv.san} (ply ${ply})`;
            await page.locator(`[data-square="${mv.from}"]`).first().click({ timeout: 3000, force: true }).catch(() => {});
            await page.waitForTimeout(180);
            await page.locator(`[data-square="${mv.to}"]`).first().click({ timeout: 3000, force: true }).catch(() => {});
            try { mirror.move(mv.san); } catch { /* */ }
            ply++;
            await page.waitForTimeout(3500);
            const f = await appFen(); if (f) { try { mirror.load(f); } catch { /* */ } }
            // every ~3 plies, ask a question or issue a command
            if (ply % 3 === 0 && qi < questions.length) {
              const q = questions[qi++]; inFlight = `${label} ask[${q.kind}] "${q.text}"`;
              const fen = await appFen();
              const { reply, spokenDuring } = await sendChat(q.text);
              gradeAnswer(q, reply, spokenDuring, fen, lang, recordBreak);
            } else if (ply % 5 === 0 && ai < actions.length) {
              const act = actions[ai++]; await runAction(act, sendChat, recordBreak, label, lang);
            }
          }
          if (mirror.isGameOver()) console.log(`    · game ended at ply ${ply} (${mirror.isCheckmate() ? 'mate' : mirror.isDraw() ? 'draw' : 'over'})`);
          // finish any remaining questions/actions post-game
          while (qi < questions.length) { const q = questions[qi++]; inFlight = `${label} postgame ask[${q.kind}]`; const fen = await appFen(); const { reply, spokenDuring } = await sendChat(q.text); gradeAnswer(q, reply, spokenDuring, fen, lang, recordBreak); }
          while (ai < actions.length) { await runAction(actions[ai++], sendChat, recordBreak, label, lang); }
          await testButtons(page, 'play', spoken, readCoachReplies, openChatIfNeeded, recordBreak, setInFlight);
        } else {
          // LEARN: start a lesson for board context, then ask + command.
          await page.locator('[data-testid="coach-teach-page"], [data-testid="chat-input"]').first().waitFor({ timeout: 40000 }).catch(() => {});
          await clearOverlays();
          inFlight = `${label} start lesson`;
          await sendChat('teach me the Italian game', 45000);
          await page.waitForTimeout(2500);
          for (const q of questions) {
            inFlight = `${label} ask[${q.kind}] "${q.text}"`;
            const fen = await appFen();
            const { reply, spokenDuring } = await sendChat(q.text);
            gradeAnswer(q, reply, spokenDuring, fen, lang, recordBreak);
          }
          for (const act of actions) await runAction(act, sendChat, recordBreak, label, lang);
          await testButtons(page, 'learn', spoken, readCoachReplies, openChatIfNeeded, recordBreak, setInFlight);
        }
      } catch (err) {
        recordBreak('exception', err?.message ?? String(err));
      }

      await writeFile(join(OUT_DIR, `${label.replace(/[:]/g, '-')}.json`), JSON.stringify({ label, lang: lang.code, breaks }, null, 2)).catch(() => {});
      await ctx.close().catch(() => {});
      const clean = breaks.length === 0;
      console.log(`  ${label} → ${clean ? 'CLEAN' : `${breaks.length} BREAK(S)`}  [relay ${JSON.stringify(relay.stats())}]`);
      passReports.push({ label, lang: lang.code, clean, breakCount: breaks.length, breaks });
    }
  }

  await browser.close().catch(() => {});
  console.log(`\n[polyglot] ===== SUMMARY (${passReports.length} surface-runs) =====`);
  const totalBreaks = passReports.reduce((n, r) => n + r.breakCount, 0);
  // group breaks by kind
  const byKind = {};
  for (const r of passReports) for (const b of r.breaks) byKind[b.kind] = (byKind[b.kind] ?? 0) + 1;
  for (const r of passReports) console.log(`  ${r.label}: ${r.clean ? 'CLEAN' : `${r.breakCount} BREAK(S)`}`);
  console.log(`  breaks by kind: ${JSON.stringify(byKind)}`);
  console.log(`  total breaks: ${totalBreaks}   relay: ${JSON.stringify(relay.stats())}`);
  await writeFile(join(OUT_DIR, 'summary.json'), JSON.stringify({ totalBreaks, byKind, runs: passReports, relay: relay.stats() }, null, 2)).catch(() => {});
  listener.stop?.();
  relay.stop?.();
  process.exit(totalBreaks === 0 ? 0 : 1);
}

/** Grade a question's answer: non-answer, false board-claim, and — the headline
 *  new check — was it answered in the LANGUAGE it was asked in. */
function gradeAnswer(q, reply, spokenDuring, fen, lang, recordBreak) {
  console.log(`      Q[${lang.code}/${q.kind}] "${q.text}"\n        → "${String(reply).replace(/^C/, '').slice(0, 140)}"`);
  if (!reply || reply.length < 4 || /hit a snag|having trouble connecting|coach is unavailable|not sure what you mean/i.test(reply)) {
    recordBreak('non-answer', `[${lang.code}/${q.kind}] "${q.text}" → "${String(reply).slice(0, 100)}"`);
    return;
  }
  const bad = [...falseBoardClaims(reply, fen), ...spokenDuring.flatMap((s) => falseBoardClaims(s.text, fen))];
  if (bad.length) recordBreak('false-board-claim', `[${lang.code}/${q.kind}] ${bad.join(' | ')}`);
  const rl = replyLanguage(reply, lang);
  if (!rl.inTarget) recordBreak('wrong-language', `asked ${lang.name}, reply not in ${lang.name} (${rl.detail}) :: "${reply.slice(0, 120)}"`);
}

/** Issue an action command; assert it was honored (reply confirms in-language or
 *  at least acknowledges the setting). */
async function runAction(act, sendChat, recordBreak, label, lang) {
  const { reply } = await sendChat(act.text);
  console.log(`      ACTION[${lang.code}/${act.kind}] "${act.text}"\n        → "${String(reply).replace(/^C/, '').slice(0, 110)}"`);
  if (!reply || reply.length < 3) { recordBreak('action-non-answer', `[${lang.code}/${act.kind}] "${act.text}" → ""`); return; }
  if (!act.confirm.test(reply)) recordBreak('action-not-confirmed', `[${lang.code}/${act.kind}] "${act.text}" → "${reply.slice(0, 110)}"`);
}

/** Per-surface real UI buttons (David 2026-07-10: "test all the buttons make
 *  sure they work"). effect: 'message' = expect a new coach bubble; 'tts' =
 *  expect a spoken /api/tts fire; 'either' = message OR tts; 'clickable' = just
 *  present + no error. destructive buttons run LAST. */
const BUTTONS = {
  learn: [
    { id: 'teach-hint-btn', kind: 'hint', effect: 'either' },
    { id: 'why-button', kind: 'why', effect: 'message', optional: true },
    { id: 'teach-read-position-btn', kind: 'read-position', effect: 'tts' },
    { id: 'coach-tips-toggle', kind: 'tips', effect: 'clickable' },
    { id: 'teach-takeback', kind: 'takeback', effect: 'clickable', optional: true },
    { id: 'teach-restart', kind: 'restart', effect: 'clickable', destructive: true, optional: true },
  ],
  // optional:true on Play — an aggressive audit game can reach game-over, which
  // legitimately removes the in-game button row (no hint/takeback after mate).
  // A MISSING button then isn't a bug; but when PRESENT its effect is still checked.
  play: [
    { id: 'hint-button', kind: 'hint', effect: 'either', optional: true },
    { id: 'why-button', kind: 'why', effect: 'message', optional: true },
    { id: 'read-position-btn', kind: 'read-position', effect: 'tts', optional: true },
    { id: 'coach-tips-toggle', kind: 'tips', effect: 'clickable', optional: true },
    { id: 'takeback-btn', kind: 'takeback', effect: 'clickable', optional: true },
    { id: 'restart-btn', kind: 'restart', effect: 'clickable', destructive: true, optional: true },
    { id: 'resign-btn', kind: 'resign', effect: 'clickable', destructive: true, confirm: 'resign-yes', optional: true },
  ],
};

/** Click every real UI button on the surface and assert it works. */
async function testButtons(page, surface, spoken, readReplies, openChatIfNeeded, recordBreak, setInFlight) {
  const specs = BUTTONS[surface] ?? [];
  // non-destructive first, destructive (restart/resign) last
  for (const b of [...specs.filter((s) => !s.destructive), ...specs.filter((s) => s.destructive)]) {
    setInFlight(`button[${b.kind}]`);
    const loc = page.locator(`[data-testid="${b.id}"]`).first();
    if ((await loc.count()) === 0) { if (!b.optional) recordBreak('button-missing', `${surface}: ${b.id} not present`); continue; }
    const before = new Set(await readReplies());
    const ttsBefore = spoken.length;
    try {
      await loc.click({ timeout: 5000, force: true });
      if (b.confirm) { const c = page.locator(`[data-testid="${b.confirm}"]`).first(); if (await c.isVisible().catch(() => false)) await c.click({ force: true }).catch(() => {}); }
      await page.waitForTimeout(b.effect === 'clickable' ? 800 : 4500);
      const after = await readReplies();
      const newMsg = after.some((t) => !before.has(t));
      const newTts = spoken.length > ttsBefore;
      let ok = true;
      if (b.effect === 'message' && !newMsg) { recordBreak('button-no-effect', `${b.id}: no coach message after click`); ok = false; }
      else if (b.effect === 'tts' && !newTts && !newMsg) { recordBreak('button-no-effect', `${b.id}: no voice/message after click`); ok = false; }
      else if (b.effect === 'either' && !newMsg && !newTts) { recordBreak('button-no-effect', `${b.id}: no message and no voice after click`); ok = false; }
      // 'clickable' — success = it clicked without throwing (pageerror caught globally)
      console.log(`      BUTTON[${b.kind}] ${b.id} → ${ok ? '✓' : '✗'}${newMsg ? ' msg' : ''}${newTts ? ' voice' : ''}`);
    } catch (e) {
      recordBreak('button-error', `${b.id}: ${(e?.message ?? String(e)).slice(0, 90)}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
