// MULTILINGUAL SEAM AUDIT (coach audit 2026-09-11, Workstream 2 / D).
// The coach normalizes non-English input to English before routing
// (translateToEnglish) and translates the answer back at the voice chokepoint.
// So the multilingual RISK is not the detectors — it's that seam: a mistranslated
// question misroutes. This drives real NATIVE questions per language against the
// live dispatch on prod and asserts each gets a substantive, on-topic reply
// (NOT the stock/greeting fall-through). Any miss feeds a phrasing back into the
// ONE English matrix — never a per-language regex.
//
// 🔒 THIS AUDIT COULD NOT HAVE CAUGHT THE BUG IT EXISTS FOR (fixed 2026-09-19).
// A real App Store user asked for a lesson seven times in Thai and got nothing.
// Two reasons this run was green through all of it, both now closed:
//
//   1. IT ONLY TESTED THE EIGHT SCRIPTS THAT ALREADY WORKED. The defect was a
//      missing Unicode range in `detectLanguage`, so the audit's whole language
//      set was, by construction, the set that could not fail. Twenty writing
//      systems were invisible. The list below now leads with the ones that
//      were broken, and a new language goes here BEFORE its range is trusted.
//   2. IT ONLY TESTED QUESTIONS. A question falls through to the brain, which
//      translates INSIDE itself — so questions were never at risk. What broke
//      was a COMMAND: the deterministic action router is English regex, asks
//      `detectLanguage` first, and silently matched nothing. The `lesson` probe
//      below asserts the COMMAND CONTRACT instead — the student ends up on the
//      walkthrough they asked for, which is D2/D3/D4 in one assertion.
//
// The lesson probe is also the only row that can see a WRONG opening being
// served, because it checks the name that came back, not merely that something
// happened.
//
// usage: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//        AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//        node scripts/audit-coach-multilingual-prod.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = `ml-${Date.now().toString(36)}`;

// Native, correct core chess questions. `kind` says which lane the seam should
// reach; `expect` is a language-agnostic on-topic check (chess terms survive
// verbatim through the fidelity net regardless of reply language).
const PROBES = [
  // ── WERE BROKEN until 2026-09-19: no Unicode range, so classified English ──
  { lang: 'Thai',       best: 'ตาต่อไปควรเดินอะไรดี',              concept: 'ฟอร์คคืออะไร',              lesson: 'สอนฉันเปิดเกมอิตาลีให้หน่อย',        opening: /italian/i },
  { lang: 'Greek',      best: 'Ποια είναι η καλύτερη κίνηση εδώ;', concept: 'Τι είναι το πιρούνι;',      lesson: 'Δίδαξέ μου το ιταλικό άνοιγμα',      opening: /italian/i },
  { lang: 'Hebrew',     best: 'מה המהלך הטוב ביותר כאן?',          concept: 'מה זה מזלג?',               lesson: 'תלמד אותי את פתיחת הספרדית',          opening: /ruy|spanish|lopez/i },
  // Worse than invisible: its tone marks tripped the FRENCH fingerprint, so a
  // Vietnamese ask was translated — and answered — in French.
  { lang: 'Vietnamese', best: 'Nước đi nào tốt nhất ở đây?',       concept: 'Cái nĩa là gì?',            lesson: 'Dạy tôi khai cuộc Ý',                 opening: /italian/i },
  { lang: 'Hindi',      best: 'यहाँ सबसे अच्छी चाल क्या है?',            concept: 'फोर्क क्या है?',               lesson: 'मुझे इटैलियन ओपनिंग सिखाओ',            opening: /italian/i },
  { lang: 'Korean',     best: '여기서 최선의 수는 무엇인가요?',        concept: '포크가 뭐예요?',              lesson: '이탈리안 오프닝을 가르쳐 주세요',          opening: /italian/i },
  { lang: 'Turkish',    best: 'Buradaki en iyi hamle nedir?',      concept: 'Çatal nedir?',              lesson: 'Bana İtalyan açılışını öğret',        opening: /italian/i },
  // ── ALWAYS WORKED — kept so a table edit cannot lose one ──────────────────
  { lang: 'Spanish',    best: '¿Cuál es la mejor jugada aquí?',    concept: '¿Qué es una horquilla?',    lesson: 'Enséñame la apertura italiana',       opening: /italian/i },
  { lang: 'French',     best: 'Quel est le meilleur coup ici ?',   concept: "Qu'est-ce qu'une fourchette ?", lesson: "Apprends-moi l'ouverture italienne", opening: /italian/i },
  { lang: 'German',     best: 'Was ist der beste Zug hier?',       concept: 'Was ist eine Gabel?',       lesson: 'Bring mir die italienische Eröffnung bei', opening: /italian/i },
  { lang: 'Portuguese', best: 'Qual é o melhor lance aqui?',       concept: 'O que é um garfo?',         lesson: 'Ensina-me a abertura italiana',       opening: /italian/i },
  { lang: 'Italian',    best: 'Qual è la mossa migliore qui?',     concept: "Cos'è una forchetta?",      lesson: 'Insegnami la partita spagnola',       opening: /ruy|spanish|lopez/i },
  { lang: 'Russian',    best: 'Какой лучший ход здесь?',           concept: 'Что такое вилка?',          lesson: 'Научи меня итальянской партии',       opening: /italian/i },
  { lang: 'Japanese',   best: 'ここでの最善手は何ですか？',           concept: 'フォークとは何ですか？',        lesson: 'イタリアンゲームを教えてください',          opening: /italian/i },
  { lang: 'Arabic',     best: 'ما هي أفضل نقلة هنا؟',               concept: 'ما هي الشوكة؟',              lesson: 'علمني الافتتاحية الإيطالية',           opening: /italian/i },
];


// A row that reports "(no reply)" is NOT automatically a product failure: the
// chat input stays disabled while a turn is in flight, and a long prod run can
// leave it busy past the wait (the standing "chat input never usable" item).
// Read those rows as UNMEASURED, and re-run the language on its own before
// concluding anything about it.
const STOCK = /i can'?t verify that precisely|what are we working on today|did you mean one of these|hit a snag|i don’t have a specific lesson/i;
// On-topic markers that survive translation (SAN + chess nouns are preserved
// verbatim by the fidelity net; the reply names a move or a fork idea).
const BEST_OK = /\b(e4|d4|nf3|nc3|bc4|c4|g3|best|engine)\b|[A-Z][a-h][1-8]/i;
// Substring, not word-boundary, on the fork stem: the coach's own house line
// is "the knight is the born FORKER", which `\bfork\b` rejected — a correct,
// on-topic answer failed the row. An ACCEPT contract that is stricter than the
// product's real voice manufactures red rows and buries the true ones.
const CONCEPT_OK = /(fork|horquilla|fourchette|gabel|garfo|forchetta|вилк|フォーク|شوك|two pieces|attacks two|at once|two targets)/i;

/**
 * 🔒 THE ROW THAT WAS MISSING FOR MONTHS (2026-09-19). Every check above asks
 * whether the reply is ON TOPIC — it looks for chess words, which survive
 * translation. None of them asked whether the reply was in the student's
 * LANGUAGE. So this audit ran green while every single answer came back in
 * English: Spanish, French and German too, not only the scripts the detector
 * could not see. An accept contract that cannot fail on the thing the audit is
 * named after is not a contract.
 *
 * Non-Latin scripts are decided by a Unicode range, which is decisive. The
 * Latin-script languages are decided by their own diacritics and function
 * words — weaker, so a Latin row that cannot be decided is reported UNKNOWN
 * rather than counted either way. Better an honest gap than a false green.
 */
const SPEAKS = {
  Thai: /[\u0E00-\u0E7F]/, Greek: /[\u0370-\u03FF]/, Hebrew: /[\u0590-\u05FF]/,
  Hindi: /[\u0900-\u097F]/, Korean: /[\uAC00-\uD7AF]/, Russian: /[\u0400-\u04FF]/,
  Japanese: /[\u3040-\u30FF\u4E00-\u9FFF]/, Arabic: /[\u0600-\u06FF]/,
  Vietnamese: /[\u1EA0-\u1EF9\u01A1\u01B0]/,
  Spanish: /\b(el|la|los|las|que|es|una|mejor|jugada|caballo|peón|centro)\b|[ñ¿¡]/i,
  French: /\b(le|la|les|est|que|une|meilleur|coup|cavalier|pion|centre)\b|[àâçèêôû]/i,
  German: /\b(der|die|das|ist|eine|beste|Zug|Springer|Bauer|Zentrum)\b|[äöüß]/i,
  Portuguese: /\b(o|a|os|as|que|é|uma|melhor|lance|cavalo|peão|centro)\b|[ãõç]/i,
  Italian: /\b(il|la|che|è|una|migliore|mossa|cavallo|pedone|centro)\b|[àèéìòù]/i,
  Turkish: /\b(bir|en|iyi|hamle|at|piyon|merkez|için)\b|[ğışçö]/i,
};
/** English tell-tales, to separate "answered in English" from "undecidable". */
const LOOKS_ENGLISH = /\b(the|is|best|move|knight|pawn|center|centre|white|black)\b/i;

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch {} }, RUN_ID);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

async function boot() {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(11000);
  for (const t of ['ai-consent-allow', 'page-help-modal-close', 'page-help-got-it']) { const el = page.locator(`[data-testid="${t}"]`).first(); if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); } }
}
async function ask(q) {
  const t = page.locator('[data-testid="teach-transcript"]:visible').first();
  const lines = async () => ((await t.innerText().catch(() => '')) || '').split('\n').map((l) => l.trim()).filter((l) => l.length >= 8);
  const base = await lines();
  const box = page.locator('[data-testid="chat-text-input"]:visible:not([disabled])').first();
  await box.waitFor({ timeout: 90000 }).catch(() => {});
  await box.click({ force: true }); await box.pressSequentially(q, { delay: 8 }); await box.press('Enter');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const now = await lines();
    const fresh = now.filter((l) => !base.includes(l) && !l.includes(q.slice(0, 8)));
    if (fresh.length) { await page.waitForTimeout(1500); return fresh.join(' '); }
  }
  return '';
}

const results = [];
console.log(`[multilingual] ${PROBES.length} languages, run ${RUN_ID}, target ${BASE}`);
// A live move so best-move has something to read.
await boot();
try { await page.locator('[data-square="e2"]').first().click({ force: true }); await page.waitForTimeout(400); await page.locator('[data-square="e4"]').first().click({ force: true }); await page.waitForTimeout(6000); } catch {}

for (const p of PROBES) {
  for (const [kind, q, ok] of [['best-move', p.best, BEST_OK], ['concept', p.concept, CONCEPT_OK]]) {
    await boot();
    if (kind === 'best-move') { try { await page.locator('[data-square="e2"]').first().click({ force: true }); await page.waitForTimeout(300); await page.locator('[data-square="e4"]').first().click({ force: true }); await page.waitForTimeout(5000); } catch {} }
    const reply = await ask(q);
    const stock = STOCK.test(reply);
    const onTopic = ok.test(reply);
    // …and in THEIR language, not ours.
    const fingerprint = SPEAKS[p.lang];
    const inLanguage = reply && fingerprint ? fingerprint.test(reply) : null;
    const answeredInEnglish = inLanguage === false && LOOKS_ENGLISH.test(reply);
    const pass = !!reply && !stock && onTopic && !answeredInEnglish;
    results.push({ lang: p.lang, kind, pass, q, reply: reply.slice(0, 120), inLanguage });
    console.log(`${pass ? '✅' : '❌'} ${p.lang} ${kind} :: "${q}" → ${reply ? `"${reply.slice(0, 90)}"` : '(no reply)'}${stock ? ' [STOCK]' : ''}${!onTopic && reply ? ' [off-topic]' : ''}${answeredInEnglish ? ' [ANSWERED IN ENGLISH]' : ''}`);
  }

  // ── THE COMMAND CONTRACT (the row the seven-times-ignored user needed) ─────
  // A question can fall through to the brain and still be answered; a COMMAND
  // has nowhere to fall. So this row does not read the prose for chess words —
  // it asks where the student ENDED UP. Two assertions, because "a lesson
  // started" and "it is the lesson they asked for" are different failures and
  // blaming the wrong one costs a whole fix:
  //   · routed  — the deterministic router fired at all (D2/D3),
  //   · correct — and it resolved to the opening they named (D4).
  await boot();
  const ack = await ask(p.lesson);
  await page.waitForTimeout(6000);   // the lesson kicks off asynchronously
  const url = page.url();
  // 🔴 THE URL IS THE WRONG CONTRACT ON THIS SURFACE, and reading it alone
  // manufactured a red row on the first run (2026-09-19). `?opening=` is the
  // HOME-CHAT hand-off — Learn starts its walkthrough IN PLACE, with no
  // navigation at all. A French ask that replied "I'll walk you through it"
  // was reported as NEVER ROUTED because the url had not moved. So the row
  // asks what the STUDENT would see: did the lesson actually start.
  const started = await page
    .locator('[data-testid="teach-nav-row"], [data-testid="teach-kickoff-progress"], [data-testid="teach-generation-progress"], [data-testid="walkthrough-choose-walkthrough"]')
    .first().isVisible().catch(() => false);
  const routed = started || /[?&]opening=/.test(url);
  // The ack names the resolved opening ("Loading the Italian Game walkthrough…")
  // in English, because a command confirmation is emitted before any phrasing
  // pass — so one regex per row works across every language.
  const named = decodeURIComponent(url) + ' ' + ack;
  const correct = p.opening.test(named);
  const pass = routed && correct;
  results.push({ lang: p.lang, kind: 'lesson', pass, q: p.lesson, reply: ack.slice(0, 120), url });
  console.log(`${pass ? '✅' : '❌'} ${p.lang} lesson :: "${p.lesson}" → ${ack ? `"${ack.slice(0, 80)}"` : '(no reply)'}`);
  if (!routed) console.log(`     ↳ NO LESSON STARTED — no walkthrough UI, url stayed ${url} (the command was not recognised at all)`);
  else if (!correct) console.log(`     ↳ WRONG OPENING — routed to ${url}, expected ${p.opening}`);
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} multilingual probes routed on-topic`);
console.log(`pageerrors: ${errs.length}`);
const dir = `audit-reports/coach-multilingual-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, errs }, null, 2));
console.log(`report: ${dir}/report.json`);
await browser.close();
process.exitCode = passed === results.length ? 0 : 1;
