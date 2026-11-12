// THE LESSON PHRASING PASS, MEASURED (WO-OPENINGS-REWRITE-01 C3, David
// 2026-11-12: "Turn it on?"). For each beat of the held-out courses: the
// hand-written beat, the composer's raw beat (the writer capture's `say`), and
// the raw beat phrased by the ONE chokepoint (`voiceFacts`, register `lesson`,
// every move and square required to survive). Written to a file for the blind
// grade; nothing here ships.
//
//   LESSON_PHRASE=1 PHRASE_KEY_FILE=<deepseek key file> PHRASE_WRITER_DIR=<dir> \
//     PHRASE_BEATS=<beats.json> PHRASE_OUT=<out.json> PHRASE_COURSES=a,b \
//     npx vitest run src/services/lessonPhrasing.measure.test.ts
import { describe, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { voiceFacts } from './coachApi';

const ON = process.env.LESSON_PHRASE === '1';
const SQUARE = /\b[a-h][1-8]\b/g;
const SAN = /(?:O-O-O|O-O|…?[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|…?[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?)/g;

/** Every move and square the raw beat names: the phrasing must keep them all. */
function preserveTokens(raw: string): string[] {
  return [...new Set([...(raw.match(SAN) ?? []).map((t) => t.replace(/^…/, '')), ...(raw.match(SQUARE) ?? [])])];
}

interface Beat { id: string; course: string; mover: 'his' | 'theirs'; san: string; say: string; ckey: string }

describe.skipIf(!ON)('lesson phrasing, measured', () => {
  it('phrases the held-out beats', async () => {
    const key = readFileSync(process.env.PHRASE_KEY_FILE ?? '', 'utf8').trim();
    // The app calls the model through its own server proxy (/api/llm/deepseek),
    // which does not exist in a test: send those calls straight to the provider.
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const m = /\/api\/llm\/deepseek\/(.*)$/.exec(url);
      if (!m) return realFetch(input, init);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      headers.set('Authorization', `Bearer ${key}`);
      const body = init?.body ?? (input instanceof Request ? await input.text() : undefined);
      return realFetch(`https://api.deepseek.com/${m[1]}`, { method: 'POST', headers, body });
    }) as typeof fetch;
    const dir = process.env.PHRASE_WRITER_DIR ?? '';
    const courses = new Set((process.env.PHRASE_COURSES ?? '').split(',').filter(Boolean));
    const limit = Number(process.env.PHRASE_LIMIT ?? 1e9);
    const out = process.env.PHRASE_OUT ?? '/tmp/lesson-phrasing.json';
    const done: Record<string, unknown> = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
    const beats = (JSON.parse(readFileSync(process.env.PHRASE_BEATS ?? '', 'utf8')) as Beat[]).filter((b) => courses.has(b.course)).slice(0, limit);
    const comp = new Map<string, Record<string, { say: string }>>();
    let n = 0;
    for (const b of beats) {
      if (done[b.id]) continue;
      if (!comp.has(b.course)) comp.set(b.course, JSON.parse(readFileSync(`${dir}/${b.course}.computers.json`, 'utf8')) as Record<string, { say: string }>);
      const raw = comp.get(b.course)?.[b.ckey]?.say ?? '';
      if (!raw.trim()) continue;
      const studentSide = (b.mover === 'his') === (b.ckey.split(' ')[1] === 'w') ? 'white' : 'black';
      const phrased = await voiceFacts(raw, {
        warm: true, intent: 'walkthrough-beat', mustPreserve: preserveTokens(raw),
        perspective: { mode: 'student', studentSide }, providerConfig: { provider: 'deepseek', apiKey: key },
      });
      done[b.id] = { course: b.course, mover: b.mover, san: b.san, written: b.say, raw, phrased: phrased ?? raw };
      if (++n % 10 === 0) writeFileSync(out, JSON.stringify(done, null, 1));
    }
    writeFileSync(out, JSON.stringify(done, null, 1));
    console.log(`phrased ${n}, total ${Object.keys(done).length}`);
  }, 7_200_000);
});
