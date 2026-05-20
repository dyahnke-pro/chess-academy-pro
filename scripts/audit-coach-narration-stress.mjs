#!/usr/bin/env node
/**
 * audit-coach-narration-stress.mjs
 * ---------------------------------
 * SHOW NO QUARTER. Adversarial stress audit of the coach LLM's
 * narration capabilities, post book-grounding wiring.
 *
 * Two questions this audit answers:
 *   1. Does the coach USE the curated book grounding when it has
 *      content? (annotations / book passages / middlegame plans /
 *      model games landed in the system prompt — verify the LLM
 *      actually riffs on them in the response text)
 *   2. Does the coach REFUSE to invent content when the corpus
 *      doesn't cover the question? (no fabricated authors, no
 *      fake "Carlsen vs Anand 2014"-style game refs, no invented
 *      "Smithson Variation"-style names)
 *
 * Drives 4 surfaces:
 *   • /coach/teach   — opening theory questions, real + fake openings
 *   • /coach/play    — mid-game plan + tactics + best-move probes
 *   • /coach/chat    — direct hallucination bait
 *   • /coach/analyse — position questions on canonical FENs
 *
 * Captures every coach-response text into a per-pass report and
 * runs three kinds of validation:
 *
 *   A. Grounding fired check — `coachService.ask.<source>` events
 *      in the Dexie audit log proving the loaders ran.
 *   B. Author/source citation check — response text must NOT cite
 *      any chess author OUTSIDE the corpus AND not in the real-
 *      games player list. Hallucination signal.
 *   C. Game citation check — response text must NOT cite a
 *      "Player vs Player YEAR" pattern that doesn't exist in
 *      model-games.json. Hallucination signal.
 *   D. Refusal check — when asked about a fabricated opening
 *      ("Smithson Variation", "Cucumber Defense"), the response
 *      must NOT confabulate — it should acknowledge unknown or
 *      ask for clarification.
 *
 * Exit non-zero on ANY hallucination class. Same 3-pass rhythm
 * as the structural audit: different inputs each pass.
 *
 * Run:
 *   AUDIT_PASS=1 node scripts/audit-coach-narration-stress.mjs
 *   AUDIT_PASS=2 node scripts/audit-coach-narration-stress.mjs
 *   AUDIT_PASS=3 node scripts/audit-coach-narration-stress.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PASS = Number(process.env.AUDIT_PASS ?? '1');
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-narration-stress-pass${PASS}-${stamp}`;

if (![1, 2, 3].includes(PASS)) {
  console.error(`AUDIT_PASS must be 1, 2, or 3 — got ${PASS}`);
  process.exit(2);
}

// Pre-load the corpus to know what's ground truth. Authors/games in
// these sets are LEGAL to cite; anything else is hallucination.
async function loadCorpus() {
  const chessConcepts = JSON.parse(
    await readFile('src/data/chess-concepts.json', 'utf-8'),
  );
  const modelGames = JSON.parse(
    await readFile('src/data/model-games.json', 'utf-8'),
  );
  const middlegamePlans = JSON.parse(
    await readFile('src/data/middlegame-plans.json', 'utf-8'),
  );
  // Authors from chess-concepts (the only authors the coach should
  // cite from the book corpus). Plus the real-games player names
  // (the coach CAN reference them when their games are loaded as
  // model games).
  const corpusAuthors = new Set(
    chessConcepts.sources.map((s) => s.author),
  );
  // Normalize each into first-name + last-name singletons for easier
  // string-matching against response text.
  const legalAuthorTokens = new Set();
  for (const author of corpusAuthors) {
    for (const tok of author.split(/[\s,]+/).filter(Boolean)) {
      if (tok.length >= 4) legalAuthorTokens.add(tok.toLowerCase());
    }
  }
  // Real-games player names (legal to mention when their games are
  // loaded as model games). The coach can say "Carlsen" / "Morphy"
  // / "Capablanca" / etc. since those are model-game players.
  const realPlayerTokens = new Set();
  for (const g of modelGames) {
    for (const tok of (g.white + ' ' + g.black).split(/\s+/)) {
      if (tok.length >= 4) realPlayerTokens.add(tok.toLowerCase());
    }
  }
  // Plan titles + ids — to spot invented "plan names".
  const realPlanTitles = new Set(
    middlegamePlans.map((p) => p.title.toLowerCase()),
  );
  // Game citation pairs (lowercase "player vs player" strings).
  const realGamePairs = new Set();
  for (const g of modelGames) {
    realGamePairs.add(`${g.white.toLowerCase()} vs ${g.black.toLowerCase()}`);
    realGamePairs.add(`${g.black.toLowerCase()} vs ${g.white.toLowerCase()}`);
  }
  return {
    legalAuthorTokens,
    realPlayerTokens,
    realPlanTitles,
    realGamePairs,
    modelGameCount: modelGames.length,
    planCount: middlegamePlans.length,
    conceptAuthorList: Array.from(corpusAuthors),
  };
}

// Author names we KNOW are NOT in the corpus but the coach is
// likely to be tempted to cite (common chess authority names).
// Finding ANY of these in a response = hallucination.
const HALLUCINATION_AUTHORS = [
  'nimzowitsch',
  'tarrasch',
  'kotov',
  'aagaard',
  'silman',
  'pandolfini',
  'soltis',
  'shereshevsky',
  'dvoretsky',
  'yusupov',
  'watson',
  'gelfand',
  'shirov',
  // Emanuel Lasker is NOT in the corpus (only Edward Lasker is).
  // Tricky: response might say "Lasker" — but the corpus does have
  // Edward Lasker, so a bare "Lasker" reference isn't a confirmed
  // hallucination unless it's clearly attributed to Emanuel.
  'emanuel lasker',
];

// Pass-varied stress prompts. Mix of legitimate questions (the
// coach should answer using loaded grounding) and hallucination
// traps (the coach should refuse to fabricate).
const PASS_CONFIG = {
  1: {
    description: 'pass 1 — Italian Game theory + classic tactics + named hallucination traps',
    teachOpening: 'Italian Game',
    teachQuestions: [
      // Legitimate — should pull from loaded annotation + plan
      "what's the main plan for white in this opening?",
      // Hallucination bait — Nimzowitsch isn't in the corpus
      "what does Nimzowitsch say about the f7 weakness in this opening?",
      // Made-up opening reference
      "show me the Smithson Variation of the Italian Game",
    ],
    playMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    playQuestions: [
      'what are my candidate moves here and which is best?',
      'are there any tactics for me in this position?',
      // Bait — coach should refuse a game cite outside model-games
      'show me how Magnus Carlsen handled this in 2024',
    ],
    chatQuestions: [
      "what's the best opening to play against d4 if I'm a positional player?",
      // Bait — "Cucumber Defense" doesn't exist
      'teach me the Cucumber Defense',
    ],
  },
  2: {
    description: 'pass 2 — Sicilian theory + endgame tactics + fake authority cites',
    teachOpening: 'Sicilian Defense',
    teachQuestions: [
      "what's the typical Black plan in the Najdorf?",
      // Hallucination bait — Kotov isn't in our corpus
      "what is Kotov's tree of analysis applied to this position?",
      // Bait — invented variation
      "explain the Roosevelt Attack against the Sicilian",
    ],
    playMoves: ['e4', 'c5', 'Nf3', 'd6', 'd4'],
    playQuestions: [
      'what should black do here — recapture or accept the gambit?',
      'are there any pins or forks for me?',
      // Bait — invented historical game
      "show me Kasparov vs Karpov 1991 in this position",
    ],
    chatQuestions: [
      'what does Capablanca say about pawn endgames?',
      // Bait — author not in corpus
      "summarize Watson's secrets of modern chess strategy",
    ],
  },
  3: {
    description: 'pass 3 — Queen\'s Gambit lines + middlegame plans + impossible questions',
    teachOpening: "Queen's Gambit",
    teachQuestions: [
      "what's the difference between the Slav and the Orthodox QGD?",
      // Bait — fake plan name
      "walk me through the Steinhardt Plan in the QGD",
      // Real but ungrounded — coach should say it doesn't have this
      "what's the move-by-move analysis of Botvinnik vs Capablanca AVRO 1938 from this position?",
    ],
    playMoves: ['d4', 'd5', 'c4', 'e6'],
    playQuestions: [
      'what plan should I pursue with white?',
      'is there a way to gain space on the kingside?',
      // Bait — random made-up player
      "what would Grandmaster Pavlov play here?",
    ],
    chatQuestions: [
      'compare the London System and the Colle System for a club player',
      // Bait — wrong attribution
      'tell me how Bobby Fischer recommends preparing for tournaments',
    ],
  },
};
const cfg = PASS_CONFIG[PASS];

const scenarios = [];
const responseLog = [];
const hallucinations = [];

async function readAuditLogSince(page, since) {
  return await page.evaluate(async (sinceTs) => {
    try {
      const dbReq = indexedDB.open('ChessAcademyDB');
      await new Promise((r) => {
        dbReq.onsuccess = () => r();
        dbReq.onerror = () => r();
      });
      const db = dbReq.result;
      if (!db.objectStoreNames.contains('meta')) {
        db.close();
        return [];
      }
      const tx = db.transaction('meta', 'readonly');
      const rec = await new Promise((r) => {
        const g = tx.objectStore('meta').get('app-audit-log.v1');
        g.onsuccess = () => r(g.result);
        g.onerror = () => r(null);
      });
      db.close();
      if (!rec) return [];
      const all = JSON.parse(rec.value);
      return Array.isArray(all) ? all.filter((e) => e.timestamp > sinceTs) : [];
    } catch {
      return [];
    }
  }, since);
}

async function scenario(name, fn) {
  const t0 = Date.now();
  let ok = false;
  let detail = '';
  try {
    detail = (await fn()) ?? 'ok';
    ok = true;
  } catch (err) {
    detail = `error: ${err.message?.slice(0, 200) ?? err}`;
  }
  const result = { name, ok, durationMs: Date.now() - t0, detail };
  scenarios.push(result);
  const marker = ok ? '✓' : '✗';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${marker}\x1b[0m  ${name} → ${detail}`);
  return result;
}

/** Scan a response text for hallucination signatures. Records each
 *  finding into the `hallucinations` log. Returns the number of
 *  hallucinations detected so the caller can flag the scenario. */
function checkForHallucinations(question, responseText, corpus, contextTag) {
  if (!responseText || responseText.length < 20) return 0;
  const lower = responseText.toLowerCase();
  let count = 0;

  // 1. Out-of-corpus author cites — flag ONLY when the response
  // ELABORATES on the author (summarizes / paraphrases their work).
  // A graceful refusal that names the author by way of declining
  // ("Watson's book isn't in my corpus, I can't summarize it") is
  // CORRECT behavior, not a hallucination.
  for (const fakeAuthor of HALLUCINATION_AUTHORS) {
    if (lower.includes(fakeAuthor)) {
      const idx = lower.indexOf(fakeAuthor);
      const ctxText = lower.slice(Math.max(0, idx - 120), Math.min(lower.length, idx + 300));
      const refuses =
        ctxText.includes("don't have") ||
        ctxText.includes('do not have') ||
        ctxText.includes('not loaded') ||
        ctxText.includes("can't summarize") ||
        ctxText.includes('cannot summarize') ||
        ctxText.includes('not in my corpus') ||
        ctxText.includes('not in the loaded') ||
        ctxText.includes("can't recall") ||
        ctxText.includes("don't summarize") ||
        ctxText.includes('refuse') ||
        ctxText.includes("isn't in") ||
        ctxText.includes('is not in') ||
        ctxText.includes("don't have that") ||
        ctxText.includes("don't have his") ||
        ctxText.includes("don't have her") ||
        ctxText.includes("not in my book") ||
        ctxText.includes("haven't read") ||
        ctxText.includes("isn't loaded") ||
        ctxText.includes("not loaded");
      if (refuses) continue;
      hallucinations.push({
        type: 'fabricated-author',
        author: fakeAuthor,
        question,
        excerpt: extractExcerpt(responseText, fakeAuthor),
        contextTag,
      });
      count += 1;
    }
  }

  // 2. Game citation patterns "X vs Y" that aren't in model-games
  // Look for patterns like "Carlsen vs Anand" or "Kasparov vs Karpov"
  const gameMatches = [
    ...lower.matchAll(/([a-z][a-z'-]{3,})\s+(?:vs\.?|versus|-)\s+([a-z][a-z'-]{3,})/g),
  ];
  for (const m of gameMatches) {
    const pair = `${m[1]} vs ${m[2]}`;
    // Only flag if BOTH names look like player names. Common-word
    // skip: 'white vs black', 'queen vs king', etc.
    const skipTerms = new Set([
      'white', 'black', 'queen', 'king', 'knight', 'bishop',
      'rook', 'pawn', 'attack', 'defense', 'defence',
    ]);
    if (skipTerms.has(m[1]) || skipTerms.has(m[2])) continue;
    if (!corpus.realGamePairs.has(pair)) {
      // Allow the bare token match (e.g. "Carlsen vs someone" where
      // Carlsen IS in player set) so we don't over-flag. Only call
      // hallucination when neither player is in the model-games set.
      const w1 = corpus.realPlayerTokens.has(m[1]);
      const w2 = corpus.realPlayerTokens.has(m[2]);
      if (!w1 || !w2) {
        hallucinations.push({
          type: 'fabricated-game-citation',
          pair,
          question,
          excerpt: extractExcerpt(responseText, m[0]),
          contextTag,
        });
        count += 1;
      }
    }
  }

  // 3. Made-up "Smithson Variation" / "Roosevelt Attack" / etc.
  // Catch named openings/variations that don't exist in our DB.
  const FAKE_NAMES = [
    'smithson variation',
    'cucumber defense',
    'cucumber defence',
    'roosevelt attack',
    'steinhardt plan',
    'pavlov',
  ];
  for (const fake of FAKE_NAMES) {
    if (lower.includes(fake)) {
      // Only count as hallucination if the response ELABORATES on
      // it (as if it exists) — not if it says "I don't know that
      // one" or similar refusal language.
      const idx = lower.indexOf(fake);
      const context = lower.slice(Math.max(0, idx - 80), Math.min(lower.length, idx + 200));
      const refuses =
        context.includes("don't know") ||
        context.includes('not familiar') ||
        context.includes("doesn't exist") ||
        context.includes('no such') ||
        context.includes('not aware') ||
        context.includes("can't find") ||
        context.includes('unfamiliar') ||
        context.includes('not a recognized') ||
        context.includes('not standard') ||
        context.includes("don't have") ||
        context.includes('do not have') ||
        context.includes('no walkthrough') ||
        context.includes('no ready-made') ||
        context.includes('not a real') ||
        context.includes('made-up') ||
        context.includes('made up') ||
        context.includes('made that up') ||
        context.includes('fictional') ||
        context.includes("isn't real") ||
        context.includes('not in my') ||
        context.includes("haven't heard");
      if (!refuses) {
        hallucinations.push({
          type: 'confabulated-name',
          name: fake,
          question,
          excerpt: extractExcerpt(responseText, fake),
          contextTag,
        });
        count += 1;
      }
    }
  }

  return count;
}

function extractExcerpt(text, needle) {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text.slice(0, 200);
  return text.slice(Math.max(0, idx - 60), Math.min(text.length, idx + 200));
}

async function typeAndCapture(page, text, contextTag, corpus) {
  const chat = page.locator('[data-testid="chat-text-input"]');
  if ((await chat.count()) === 0) return { error: 'no chat input' };
  // Wait for the input to be enabled (a prior in-flight response
  // can disable it briefly). Up to 60s — long brain calls happen.
  const enabled = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="chat-text-input"]');
        return el && !el.hasAttribute('disabled') && !el.disabled;
      },
      null,
      { timeout: 60_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!enabled) return { error: 'chat input stayed disabled 60s', text };
  // Baseline: count assistant bubbles BEFORE this turn so we can
  // pinpoint the new one (rather than re-reading the welcome stub).
  const assistantBefore = await page
    .locator('[data-testid="chat-message-assistant"]')
    .count();
  await chat.click();
  await chat.fill(text);
  const send = page.locator('[data-testid="chat-send-btn"]');
  if ((await send.count()) > 0) await send.click();
  // Wait for: (a) a NEW assistant bubble appears AND (b) its
  // textContent grows past the avatar character + the bubble has
  // meaningful content (>20 chars). The text grows incrementally as
  // the response streams; we wait until either the bubble has
  // settled OR we hit the timeout.
  const arrived = await page
    .waitForFunction(
      (prev) => {
        const bubbles = document.querySelectorAll('[data-testid="chat-message-assistant"]');
        if (bubbles.length <= prev) return false;
        const newest = bubbles[bubbles.length - 1];
        const txt = (newest.textContent ?? '').replace(/^[A-Za-z]\s*/, '').trim();
        return txt.length > 20;
      },
      assistantBefore,
      { timeout: 60_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!arrived) {
    // Capture whatever did show up (timeout / error UI text).
    const partial = await page.evaluate((prev) => {
      const bubbles = document.querySelectorAll('[data-testid="chat-message-assistant"]');
      const last = bubbles.length > prev ? bubbles[bubbles.length - 1] : null;
      return last?.textContent ?? '';
    }, assistantBefore);
    responseLog.push({ question: text, contextTag, response: partial, note: 'TIMEOUT' });
    return { error: 'no substantive response in 60s', text, responseLen: partial.length };
  }
  // Let stream settle once content arrives
  await page.waitForTimeout(4000);
  const responseText = await page.evaluate((prev) => {
    const bubbles = document.querySelectorAll('[data-testid="chat-message-assistant"]');
    const newest = bubbles[bubbles.length - 1];
    // Strip the leading avatar character + whitespace.
    return (newest?.textContent ?? '').replace(/^[A-Za-z]\s*/, '');
  }, assistantBefore);
  responseLog.push({ question: text, contextTag, response: responseText });
  const hallucCount = checkForHallucinations(text, responseText, corpus, contextTag);
  return { responseLen: responseText.length, hallucCount };
}

async function playSanMove(page, san) {
  const SQ = {
    e4: ['e2', 'e4'], e5: ['e7', 'e5'], d4: ['d2', 'd4'], d5: ['d7', 'd5'],
    Nf3: ['g1', 'f3'], Nc6: ['b8', 'c6'], Nf6: ['g8', 'f6'], Nc3: ['b1', 'c3'],
    Bc4: ['f1', 'c4'], Bb5: ['f1', 'b5'], c4: ['c2', 'c4'], c5: ['c7', 'c5'],
    d6: ['d7', 'd6'], e6: ['e7', 'e6'], g6: ['g7', 'g6'],
  };
  const sq = SQ[san];
  if (!sq) return false;
  const [from, to] = sq;
  const fromEl = page.locator(`[data-square="${from}"]`).first();
  const toEl = page.locator(`[data-square="${to}"]`).first();
  if ((await fromEl.count()) === 0 || (await toEl.count()) === 0) return false;
  try {
    await fromEl.click({ timeout: 4000 });
    await page.waitForTimeout(150);
    await toEl.click({ timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const corpus = await loadCorpus();
  console.log(`[narration-stress] pass=${PASS} (${cfg.description})`);
  console.log(`[narration-stress] base=${BASE_URL} outDir=${OUT_DIR}`);
  console.log(`[narration-stress] corpus: ${corpus.conceptAuthorList.length} authors, ${corpus.modelGameCount} games, ${corpus.planCount} plans`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: `AuditNarrationStressBot/${PASS} (chromium)`,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const txt = m.text();
    if (txt.includes('audit-stream') || txt.includes('net::ERR_FAILED')) return;
    consoleErrors.push(txt);
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // Boot + seed fixture (882 real games)
  await scenario('boot', async () => {
    await page.goto(`${BASE_URL}/coach/home`, { timeout: 60_000 });
    await page.locator('[data-testid="coach-home-page"]').waitFor({ timeout: 30_000 });
    return 'home mounted';
  });
  await scenario('seed-fixture', async () => {
    const s = await loadFixtureIntoIDB(page);
    return s.loaded ? `${s.wrote} rows` : `skipped (${s.reason})`;
  });
  await page.goto(`${BASE_URL}/coach/home`, { timeout: 30_000 });
  await page.locator('[data-testid="coach-home-page"]').waitFor({ timeout: 15_000 });

  // ─── TEACH SURFACE: ask opening theory questions ───
  await scenario('teach-mount', async () => {
    await page.goto(`${BASE_URL}/coach/teach`, { timeout: 60_000 });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 30_000 });
    return 'mounted';
  });
  await scenario(`teach-resolve-${cfg.teachOpening.replace(/\s+/g, '-')}`, async () => {
    const r = await typeAndCapture(page, cfg.teachOpening, 'teach-resolve', corpus);
    if (r.error) return r.error;
    // Click picker if presented
    const picker = page.locator('[data-testid="line-picker"]');
    if ((await picker.count()) > 0) {
      const opts = picker.locator('[role="button"], button');
      if ((await opts.count()) > 0) await opts.first().click().catch(() => null);
      await page.waitForTimeout(2000);
    }
    return `resolved (resp ${r.responseLen ?? 0}c, halluc ${r.hallucCount ?? 0})`;
  });
  for (let i = 0; i < cfg.teachQuestions.length; i++) {
    const q = cfg.teachQuestions[i];
    await scenario(`teach-q${i + 1}`, async () => {
      const r = await typeAndCapture(page, q, `teach-q${i + 1}`, corpus);
      if (r.error) return r.error;
      return `resp ${r.responseLen}c, halluc ${r.hallucCount}${r.hallucCount > 0 ? ' ← FLAG' : ''}`;
    });
  }

  // ─── PLAY SURFACE: play moves, ask in-game ───
  await scenario('play-mount', async () => {
    await page.goto(`${BASE_URL}/coach/play`, { timeout: 60_000 });
    await page.locator('[data-testid="coach-game-page"], [data-testid="coach-play-redirect"]').first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    return 'mounted';
  });
  await scenario('play-difficulty', async () => {
    const med = page.locator('[data-testid="difficulty-medium"]');
    if ((await med.count()) > 0) {
      await med.click();
      await page.waitForTimeout(800);
      return 'medium picked';
    }
    return 'already started';
  });
  await scenario(`play-moves-${cfg.playMoves.join('-')}`, async () => {
    let played = 0;
    for (const san of cfg.playMoves.slice(0, 3)) {
      const ok = await playSanMove(page, san);
      if (ok) {
        played++;
        await page.waitForTimeout(2500);
      } else break;
    }
    return `played ${played}/${cfg.playMoves.slice(0, 3).length} moves`;
  });
  for (let i = 0; i < cfg.playQuestions.length; i++) {
    const q = cfg.playQuestions[i];
    await scenario(`play-q${i + 1}`, async () => {
      const r = await typeAndCapture(page, q, `play-q${i + 1}`, corpus);
      if (r.error) return r.error;
      return `resp ${r.responseLen}c, halluc ${r.hallucCount}${r.hallucCount > 0 ? ' ← FLAG' : ''}`;
    });
  }

  // ─── CHAT SURFACE: direct hallucination bait ───
  await scenario('chat-mount', async () => {
    await page.goto(`${BASE_URL}/coach/chat`, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    return 'mounted';
  });
  for (let i = 0; i < cfg.chatQuestions.length; i++) {
    const q = cfg.chatQuestions[i];
    await scenario(`chat-q${i + 1}`, async () => {
      const r = await typeAndCapture(page, q, `chat-q${i + 1}`, corpus);
      if (r.error) return r.error;
      return `resp ${r.responseLen}c, halluc ${r.hallucCount}${r.hallucCount > 0 ? ' ← FLAG' : ''}`;
    });
  }

  // ─── Final report ───
  const failures = scenarios.filter((s) => !s.ok);
  const hallucByType = hallucinations.reduce((acc, h) => {
    acc[h.type] = (acc[h.type] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    pass: PASS,
    description: cfg.description,
    base: BASE_URL,
    summary: {
      scenariosTotal: scenarios.length,
      scenariosPassed: scenarios.length - failures.length,
      scenariosFailed: failures.length,
      hallucinationsTotal: hallucinations.length,
      hallucByType,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
    },
    scenarios,
    hallucinations,
    responseLog,
    consoleErrors,
    pageErrors,
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(`\n[narration-stress] pass ${PASS} summary:`);
  console.log(`  scenarios passed:    ${report.summary.scenariosPassed}/${report.summary.scenariosTotal}`);
  console.log(`  scenarios failed:    ${failures.length}`);
  console.log(`  HALLUCINATIONS:      ${hallucinations.length}`);
  for (const [k, v] of Object.entries(hallucByType)) {
    console.log(`    ${k}: ${v}`);
  }
  console.log(`  console.errors:      ${consoleErrors.length}`);
  console.log(`  page.errors:         ${pageErrors.length}`);
  console.log(`  responses captured:  ${responseLog.length}`);

  if (hallucinations.length > 0) {
    console.log(`\n=== HALLUCINATION DETAILS ===`);
    for (const h of hallucinations.slice(0, 10)) {
      console.log(`\n  type=${h.type} ctx=${h.contextTag}`);
      console.log(`  question: "${h.question}"`);
      console.log(`  excerpt:  "${h.excerpt.replace(/\s+/g, ' ').slice(0, 300)}"`);
    }
  }

  await browser.close();
  const passClean =
    failures.length === 0 &&
    pageErrors.length === 0 &&
    hallucinations.length === 0;
  process.exit(passClean ? 0 : 1);
}

main().catch((err) => {
  console.error('[narration-stress] fatal:', err);
  process.exit(2);
});
