/**
 * Pre-render the static narration corpus to audio, once.
 *
 * Most of what the coach says is the SAME text for every user — the hand-
 * authored Watch beats, Learn cues, plan annotations and pitfall lines. Paying
 * a TTS vendor to re-synthesize those per user per playback is what would push
 * the app off the free tier at store scale. This renders each distinct line
 * ONCE, uploads it to Vercel Blob, and publishes a manifest that `/api/tts`
 * consults before it ever calls a vendor.
 *
 * Run:
 *   npx tsx scripts/tts-prerender.mts                 # dry run — counts only
 *   npx tsx scripts/tts-prerender.mts --commit        # synthesize + upload
 *   npx tsx scripts/tts-prerender.mts --commit --limit 50
 *
 * DRY RUN IS THE DEFAULT. Synthesizing costs money and uploading mutates the
 * live blob store, so both require an explicit `--commit`.
 *
 * Env:
 *   GOOGLE_TTS_API_KEY     — required for --commit
 *   BLOB_READ_WRITE_TOKEN  — required for --commit
 *   TTS_PRERENDER_BASE_URL — the public blob base the endpoint reads; used
 *                            here to fetch the existing manifest so a re-run
 *                            is incremental instead of re-billing everything.
 *
 * The hash comes from `api/_lib/tts/prerendered.ts` — the SAME module the
 * endpoint uses, imported directly rather than reimplemented, because a
 * drifted hash would silently mean "always a miss" and we would pay for clips
 * we had already rendered.
 */
import { readFileSync } from 'node:fs';
import { prerenderKey } from '../api/_lib/tts/prerendered.js';
import { sanitizeForTTS } from '../src/services/voiceService.js';
import { getAllLessonScripts } from '../src/data/lessons/index.js';

const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

/**
 * The default listener's parameters.
 *
 * `voiceService` normalises the DEFAULT personality to NO style param (a
 * literal `style=default` used to miss the prefetch cache — David 2026-06-09),
 * so the default request carries voice=ruth, ssml=1, and no style. That is what
 * the overwhelming majority of playbacks look like, so it is what we render.
 * A non-default personality still works — it simply misses and synthesizes
 * live, exactly as today. Extend with `--voice` when a second voice earns it.
 */
const DEFAULT_VOICE_KEY = 'ruth';
const DEFAULT_SSML = true;

interface Clip {
  key: string;
  text: string;
  source: string;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Walk any JSON shape and return the values of the given narration keys.
 *
 * Synchronous by design: hashing is async, so an async callback here would
 * leave un-awaited promises and silently drop every clip it found (which is
 * exactly what the first version of this script did — the JSON sources
 * contributed zero and the dry run looked plausible anyway).
 */
function collectKeys(node: unknown, keys: Set<string>, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, keys, out);
    return out;
  }
  if (!node || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (keys.has(k)) {
      if (typeof v === 'string') out.push(v);
      else if (Array.isArray(v)) for (const s of v) if (typeof s === 'string') out.push(s);
      continue;
    }
    collectKeys(v, keys, out);
  }
  return out;
}

/**
 * Every static narration string the app can speak.
 *
 * Deliberately EXCLUDES anything generated at runtime (coach chat, per-game
 * review, LLM narration) — those are different for every user, so rendering
 * them would be waste, not savings.
 */
async function collectClips(voiceKey: string): Promise<Clip[]> {
  const seen = new Map<string, Clip>();

  const add = async (raw: string, source: string): Promise<void> => {
    const text = sanitizeForTTS(raw).trim();
    // The endpoint 400s on empty text and caps at 3000 chars; don't render
    // clips the client could never successfully request.
    if (!text || text.length > 3000) return;
    const key = await prerenderKey({
      text,
      voiceKey,
      style: undefined,
      prosodyMode: undefined,
      ssml: DEFAULT_SSML,
    });
    if (!seen.has(key)) seen.set(key, { key, text, source });
  };

  // 1. Curated lesson beats — the Watch prose and the Learn cues. The star of
  //    the corpus: ~19k beats across the masterclass + pro-rep sets.
  for (const { key: lessonKey, lesson } of getAllLessonScripts()) {
    for (const beat of lesson.beats ?? []) {
      if (beat.say) await add(beat.say, `lesson:${lessonKey}`);
      if (beat.sayShort) await add(beat.sayShort, `lesson-cue:${lessonKey}`);
    }
  }

  // 2. Baked walkthrough narration (Tier 1 — reviewed and gated before ship).
  const baked = collectKeys(
    readJson('src/data/walkthrough-narrations.json'),
    new Set(['narration', 'shortNarration', 'say', 'sayShort', 'intro', 'outro']),
  );
  for (const text of baked) await add(text, 'baked-walkthrough');

  // 3. Middlegame + endgame plan lines (annotations = Watch, learnCues = Learn).
  const plans = collectKeys(
    readJson('src/data/middlegame-plans.json'),
    new Set(['annotations', 'learnCues', 'intro', 'overview']),
  );
  for (const text of plans) await add(text, 'middlegame-plan');

  // 4. Pitfalls / common mistakes — both registers.
  const mistakes = collectKeys(
    readJson('src/data/common-mistakes.json'),
    new Set(['explanation', 'shortNarration']),
  );
  for (const text of mistakes) await add(text, 'common-mistake');

  return [...seen.values()];
}

/** Fetch the manifest already published, so a re-run only renders what's new. */
async function fetchExistingManifest(): Promise<Set<string>> {
  const base = (process.env.TTS_PRERENDER_BASE_URL || '').replace(/\/+$/, '');
  if (!base) return new Set();
  try {
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) return new Set();
    const parsed = (await res.json()) as { hashes?: unknown };
    if (!Array.isArray(parsed.hashes)) return new Set();
    return new Set(parsed.hashes.filter((h): h is string => typeof h === 'string'));
  } catch {
    return new Set();
  }
}

async function synthesize(text: string, voiceName: string, languageCode: string): Promise<Uint8Array> {
  const res = await fetch(GOOGLE_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Goog-Api-Key': process.env.GOOGLE_TTS_API_KEY || '',
    },
    body: JSON.stringify({
      // Pre-rendered clips use PLAIN text: the default coach voice is a Chirp3
      // voice, which takes no SSML — matching the runtime path exactly, or the
      // hash would point at audio the endpoint would never have produced.
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!res.ok) {
    throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const body = (await res.json()) as { audioContent?: string };
  if (!body.audioContent) throw new Error('Google TTS returned no audioContent');
  return Buffer.from(body.audioContent, 'base64');
}

async function main(): Promise<void> {
  const commit = hasFlag('commit');
  const voiceKey = arg('voice') ?? DEFAULT_VOICE_KEY;
  const limit = Number(arg('limit') ?? '0') || 0;

  const { GOOGLE_VOICES } = await import('../api/_lib/tts/googleVoices.js');
  const googleVoice = GOOGLE_VOICES[voiceKey];
  if (!googleVoice) {
    console.error(`Unknown voice key '${voiceKey}'. Known: ${Object.keys(GOOGLE_VOICES).join(', ')}`);
    process.exit(1);
  }

  console.log(`[prerender] collecting static narration for voice '${voiceKey}' (${googleVoice.voiceName})…`);
  const clips = await collectClips(voiceKey);
  const existing = await fetchExistingManifest();
  const pending = clips.filter((c) => !existing.has(c.key));

  const totalChars = clips.reduce((n, c) => n + c.text.length, 0);
  const pendingChars = pending.reduce((n, c) => n + c.text.length, 0);
  const bySource = new Map<string, number>();
  for (const clip of clips) {
    const kind = clip.source.split(':')[0];
    bySource.set(kind, (bySource.get(kind) ?? 0) + 1);
  }

  console.log(`[prerender] ${clips.length.toLocaleString()} distinct clips, ${totalChars.toLocaleString()} chars total`);
  for (const [kind, count] of [...bySource].sort((a, b) => b[1] - a[1])) {
    console.log(`             ${String(count).padStart(7)}  ${kind}`);
  }
  console.log(`[prerender] already rendered: ${existing.size.toLocaleString()}`);
  console.log(`[prerender] to render now:    ${pending.length.toLocaleString()} (${pendingChars.toLocaleString()} chars)`);
  // One-time cost at the Chirp3-HD rate, net of the month's free allowance;
  // every playback after this is free forever.
  const FREE_CHARS_PER_MONTH = 1_000_000; // Chirp3-HD / Neural2 tier
  const billable = Math.max(0, pendingChars - FREE_CHARS_PER_MONTH);
  console.log(
    `[prerender] one-time cost ≈ $${((billable / 1_000_000) * 30).toFixed(2)} ` +
    `(${pendingChars.toLocaleString()} chars − ${FREE_CHARS_PER_MONTH.toLocaleString()} free/month @ $30/M Chirp3-HD)`,
  );

  if (!commit) {
    console.log('\n[prerender] DRY RUN — nothing synthesized or uploaded. Re-run with --commit.');
    return;
  }

  if (!process.env.GOOGLE_TTS_API_KEY) {
    console.error('[prerender] GOOGLE_TTS_API_KEY is not set — cannot synthesize.');
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[prerender] BLOB_READ_WRITE_TOKEN is not set — cannot upload.');
    process.exit(1);
  }

  const { put } = await import('@vercel/blob');
  const queue = limit ? pending.slice(0, limit) : pending;
  const rendered = new Set(existing);
  let done = 0;
  let failed = 0;
  let sinceCheckpoint = 0;

  const publishManifest = async (): Promise<void> => {
    // Only ever lists hashes that really uploaded — a manifest entry with no
    // object behind it makes the endpoint fetch a 404 on every playback of
    // that line.
    await put('tts/v1/manifest.json', JSON.stringify({ version: 1, hashes: [...rendered] }), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    });
  };

  /**
   * Chirp3-HD allows 200 requests/minute. Stay comfortably under it: a small
   * worker pool plus a minimum spacing between starts. Going faster would just
   * earn 429s, and going serial would take hours.
   */
  const CONCURRENCY = Number(arg('concurrency') ?? '4');
  const MIN_SPACING_MS = 60_000 / 180; // ≈180 req/min ceiling
  let nextSlot = Date.now();
  const takeSlot = async (): Promise<void> => {
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + MIN_SPACING_MS;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  };

  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const idx = cursor++;
      if (idx >= queue.length) return;
      const clip = queue[idx];
      try {
        await takeSlot();
        const audio = await synthesize(clip.text, googleVoice.voiceName, googleVoice.languageCode);
        await put(`tts/v1/${clip.key}.mp3`, audio, {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'audio/mpeg',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          allowOverwrite: true,
        });
        rendered.add(clip.key);
        done += 1;
        sinceCheckpoint += 1;
      } catch (err) {
        failed += 1;
        console.warn(`[prerender] FAILED ${clip.key} (${clip.source}): ${(err as Error).message.slice(0, 160)}`);
        // Keep going — a partial render is still a win.
      }

      // CHECKPOINT. Synthesis costs money; a crash at clip 16,000 must not
      // throw away 16,000 paid-for clips. Publishing the manifest periodically
      // means a re-run resumes from here instead of re-billing everything.
      if (sinceCheckpoint >= 250) {
        sinceCheckpoint = 0;
        try {
          await publishManifest();
          console.log(`[prerender] ${done}/${queue.length} — checkpoint published (${rendered.size} in manifest)`);
        } catch (err) {
          console.warn(`[prerender] checkpoint failed: ${(err as Error).message.slice(0, 120)}`);
        }
      } else if (done % 50 === 0) {
        console.log(`[prerender] ${done}/${queue.length}…`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()));
  await publishManifest();

  console.log(`[prerender] done: ${done} rendered, ${failed} failed, ${rendered.size} in manifest.`);
}

main().catch((err) => {
  console.error('[prerender] fatal:', err);
  process.exit(1);
});
