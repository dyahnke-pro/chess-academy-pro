/**
 * Build-time narration translator (localization pilot).
 *
 * Translates a curated lesson's hand-authored narration (say / sayShort) into a
 * target language and writes a lazy-loadable per-language pack:
 *   src/data/lessons/i18n/<openingId>.<lang>.json
 *
 * DOCTRINE (why this is safe under G3): the ENGLISH narration is the
 * board-verified source of truth (narrationAccuracy gate). Translation only
 * rephrases the prose — every chess token (square coords like e4, SAN like Nf3 /
 * Bxf7 / O-O) is kept VERBATIM, so the board claims can't drift. A deterministic
 * square-token check verifies that after each translation; a mismatch is flagged
 * for review rather than silently shipped.
 *
 * Run:  npx tsx scripts/i18n/translate-lesson.ts <openingId> <lang>
 *   e.g. npx tsx scripts/i18n/translate-lesson.ts vienna-game es
 *
 * Uses the app's own first-party DeepSeek proxy (no key needed — the proxy
 * injects it server-side, and a request with no Origin header is allowed).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLessonScript } from '../../src/data/lessons/index';

const PROXY = 'https://chess-academy-pro.vercel.app/api/llm/deepseek/chat/completions';
const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian',
};

const openingId = process.argv[2];
const lang = process.argv[3];
if (!openingId || !lang || !LANG_NAMES[lang]) {
  console.error('usage: tsx translate-lesson.ts <openingId> <lang(es|fr|de|pt|it)>');
  process.exit(1);
}
const langName = LANG_NAMES[lang];

const lesson = getLessonScript(openingId);
if (!lesson) { console.error(`no lesson for ${openingId}`); process.exit(1); }

/** Every board square coordinate in the text, as a sorted multiset. These MUST
 *  survive translation identically or the board claim has drifted. */
const squares = (s: string): string[] => (s.match(/[a-h][1-8]/g) ?? []).sort();
const castles = (s: string): string[] => (s.match(/O-O(?:-O)?/g) ?? []).sort();
const tokensMatch = (en: string, tr: string): boolean => {
  const a = squares(en), b = squares(tr);
  const c = castles(en), d = castles(tr);
  return a.length === b.length && a.every((x, i) => x === b[i])
    && c.length === d.length && c.every((x, i) => x === d[i]);
};

const SYSTEM = `You are a professional chess translator. Translate chess-coaching narration from English into ${langName}.

HARD RULES:
1. Keep every chess token EXACTLY, verbatim, unchanged: square coordinates (e4, f7, d5), move notation / SAN (Nf3, Bxf7, exd5, O-O, O-O-O, Qh5+, Rxe8#), and any +, #, = symbols. Never translate, localize, reorder, or drop a single chess token.
2. Translate the piece names and concepts naturally into ${langName} prose (knight→caballo/cavalier/etc., bishop, fork, pin, outpost…), keeping the exact same chess meaning. Add nothing, remove nothing.
3. Preserve the warm teaching tone. Keep it board-accurate — do not introduce a claim about a square or piece that isn't in the English.
4. Return ONLY a JSON object: {"say": "<translation>", "sayShort": "<translation>"}. No markdown fences, no commentary.`;

async function translateBeat(say: string, sayShort: string): Promise<{ say: string; sayShort: string }> {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify({ say, sayShort: sayShort ?? '' }) },
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 900,
    }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`proxy ${res.status}: ${txt.slice(0, 200)}`);
  let content = JSON.parse(txt).choices?.[0]?.message?.content ?? '';
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(content);
  return { say: String(parsed.say ?? '').trim(), sayShort: String(parsed.sayShort ?? '').trim() };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const out: Record<string, { say: string; sayShort: string }> = {};
  const flags: string[] = [];
  console.log(`Translating ${lesson.beats.length} beats of "${lesson.title}" → ${langName}\n`);

  for (const beat of lesson.beats) {
    let attempt = 0;
    let tr = { say: '', sayShort: '' };
    // Up to 2 attempts: re-translate once if a chess token drifted.
    while (attempt < 2) {
      attempt += 1;
      try {
        tr = await translateBeat(beat.say, beat.sayShort ?? '');
      } catch (e) {
        console.log(`  ⚠️  ${beat.id}: ${String(e).slice(0, 120)} (attempt ${attempt})`);
        await sleep(1500);
        continue;
      }
      const sayOk = tokensMatch(beat.say, tr.say);
      const shortOk = !beat.sayShort || tokensMatch(beat.sayShort, tr.sayShort);
      if (sayOk && shortOk) break;
      if (attempt >= 2) flags.push(`${beat.id} (token drift: say=${sayOk} short=${shortOk})`);
    }
    out[beat.id] = tr;
    console.log(`  ✓ ${beat.id}: ${tr.say.slice(0, 70)}…`);
    await sleep(1200); // gentle on the per-IP rate limiter
  }

  const dir = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/lessons/i18n');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${openingId}.${lang}.json`);
  writeFileSync(file, JSON.stringify({ openingId, lang, beats: out }, null, 2) + '\n');
  console.log(`\nWrote ${file}`);
  if (flags.length) {
    console.log(`\n⚠️  ${flags.length} beat(s) need review (chess-token drift):`);
    flags.forEach((f) => console.log(`   - ${f}`));
  } else {
    console.log('\n✅ all beats preserved their chess tokens.');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
