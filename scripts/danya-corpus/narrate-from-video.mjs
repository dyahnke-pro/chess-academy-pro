#!/usr/bin/env node
/**
 * narrate-from-video — build an opening's WALKTHROUGH NARRATION from the
 * teacher's OWN VIDEO NARRATION, reworded into the coach's voice.
 *
 * David 2026-07-30 (twice, emphatically): "hand the entire video narration
 * phrasing to the llm and have it reword it into our voice." The generated
 * walkthrough narration sourced the model's own prose with corpus crumbs
 * spliced in — the source material must be HIS teaching for the opening.
 *
 * The plagiarism line (2026-07-02 lock) holds: the transcript is REFERENCE —
 * "translation, not invention". The model rewords his ideas into ORIGINAL
 * prose; the 7-gram overlap gate kills any line that lifts his wording; the
 * board-claim gate kills any line that lies about the position; the
 * depersonalization ban kills any leak of the teacher/medium. Raw transcripts
 * stay gitignored — only the reworded, gated narration ships.
 *
 * Output: src/data/walkthrough-narrations.json — keyed by normalized opening
 * name, shaped like the generator's NarrationOutput (intro/outro/ideas with
 * full `text` + brief `shortText`). The generator uses a hit as its narration
 * source INSTEAD of calling the LLM at runtime: deterministic, same words
 * every session, zero runtime generation for covered openings.
 *
 * Register rules (G5 applied here): `text` (full) has NO length cap — his
 * depth where he lingers; `shortText` is the ≤18-word brief register; silent
 * is the voice gate's job, not this file's.
 *
 * Usage:
 *   DEEPSEEK_KEY=... node scripts/danya-corpus/narrate-from-video.mjs \
 *     --opening "sicilian defense: alapin variation" \
 *     --videos KNwKz9Ssi8c[,<id2>...]           # theory/speedrun vids for X
 *     [--creator naroditsky|chessbrah]           # whose transcript farm
 *     [--dry]                                    # spine+transcript check only
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveCreator } from './creator.mjs';

// Whose transcripts to bake from. Defaults to naroditsky, so every existing
// invocation is unchanged; another creator's farm is reachable with --creator.
const CREATOR = resolveCreator();
const TDIR = CREATOR.transcripts;
// Per-creator attribution ban: a chessbrah bake can't leak "Aman" any more
// than a Danya bake can leak "Naroditsky".
const BANNED_EXTRA = (CREATOR.bannedExtra ?? []).length
  ? new RegExp(`\\b(${(CREATOR.bannedExtra ?? []).join('|')})\\b`, 'i')
  : null;
const OUT = 'src/data/walkthrough-narrations.json';
const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const OPENING = arg('opening', null);
const VIDEO_IDS = (arg('videos', '') || '').split(',').filter(Boolean);
if (!OPENING || VIDEO_IDS.length === 0) {
  console.error('usage: --opening "<canonical name>" --videos <id,id,...> [--dry]');
  process.exit(1);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── transcript prep (same VTT cleaner as distill-v2) ─────────────────────
function vttToText(vtt) {
  const lines = [];
  for (const raw of vtt.split('\n')) {
    const line = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!line) continue;
    if (/^WEBVTT|^Kind:|^Language:|^NOTE/.test(line)) continue;
    if (/^\d{2}:\d{2}/.test(line) && line.includes('-->')) continue;
    if (/^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }
  const out = [];
  for (const l of lines) {
    if (out[out.length - 1] === l || out[out.length - 2] === l) continue;
    out.push(l);
  }
  return out.join(' ');
}

function makeOverlapGate(transcriptText, n = 7) {
  const words = norm(transcriptText).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  // Returns the OFFENDING gram (so a repair call can name what to avoid —
  // a blind "overlap" verdict kept failing the same way), or null.
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) {
      const g = w.slice(i, i + n).join(' ');
      if (grams.has(g)) return g;
    }
    return null;
  };
}

const BANNED = /\b(naroditsky|danya|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

/** ALIGNMENT: idea[i] is spoken AS spine[i] animates, so it MUST speak about
 *  its OWN move. The first Latvian bake shipped ideas 2-10 shifted one ply
 *  ("f5 is the Latvian Gambit" narrated on Nf3's ply) — every board claim
 *  was true, so only an own-move check catches the desync: the ply's SAN
 *  (or its destination square / "castle") must appear in the text. */
function mentionsOwnMove(text, san) {
  const bare = san.replace(/[+#]/g, '');
  if (/^O-O/.test(bare)) return /\bcastl/i.test(text) || text.includes(bare);
  if (new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) return true;
  const dest = bare.match(/([a-h][1-8])(?:=[NBRQ])?$/)?.[1];
  return dest ? new RegExp(`\\b${dest}\\b`).test(text) : false;
}

// ── spine: the exact line the app walks for this opening ─────────────────
// The RUNTIME resolves (and middlegame-extends) its spine via
// resolveTeachSpine; `bakedNarrationFor` requires a ply-for-ply prefix
// match, so the bake MUST narrate that exact line. Ask the app code first
// (tsx bridge); fall back to the local repertoire/DB guess only if the
// bridge fails.
async function resolveSpine(openingName) {
  try {
    const { execFileSync } = await import('node:child_process');
    const raw = execFileSync('npx', ['tsx', 'scripts/danya-corpus/print-spine.mts', openingName], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000,
    }).trim().split('\n').pop();
    const r = JSON.parse(raw);
    if (Array.isArray(r.spineMoves) && r.spineMoves.length > 0) {
      console.log(`[narrate] runtime spine via print-spine: ${r.spineMoves.length} plies${r.extendedToMiddlegame ? ' (middlegame-extended)' : ''}`);
      return { name: r.canonicalName, moves: r.spineMoves, studentSide: r.studentSide };
    }
  } catch (e) {
    console.error(`  (print-spine bridge failed — ${String(e).slice(0, 120)}; falling back to local resolution)`);
  }
  const q = norm(openingName);
  const rep = JSON.parse(await readFile('src/data/repertoire.json', 'utf8'));
  for (const o of rep) if (norm(o.name) === q || norm(o.id) === q.replace(/ /g, '-')) {
    return { name: o.name, moves: o.pgn.split(/\s+/).filter((t) => !/^\d+\.+$/.test(t)) };
  }
  const lich = JSON.parse(await readFile('src/data/openings-lichess.json', 'utf8'));
  const arr = Array.isArray(lich) ? lich : Object.values(lich);
  // Deepest DB entry whose name matches exactly, else longest name-prefixed line.
  const exact = arr.filter((o) => norm(o.name) === q).sort((a, b) => b.pgn.length - a.pgn.length)[0];
  const pick = exact ?? arr.filter((o) => norm(o.name).startsWith(q)).sort((a, b) => b.pgn.length - a.pgn.length)[0];
  if (!pick) return null;
  return { name: pick.name, moves: pick.pgn.split(/\s+/).filter((t) => !/^\d+\.+$/.test(t)) };
}

// ── board-claim gate (piece-on-square truth per ply) ─────────────────────
const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
/** Returns null when every piece-on-square claim is true, else a message
 *  naming the FIRST false claim — the repair call needs to know WHICH
 *  sentence lied, or it rewrites blind and fails the same gate again. */
function boardClaimProblem(text, fen) {
  const c = new Chess(fen);
  // "the e4 pawn" (space form) counts too — the Bird bake claimed a "d4
  // pawn" on a board with a d3 pawn and the hyphen-only pattern missed it.
  const claims = [
    ...text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)\s+on\s+([a-h][1-8])\b/gi),
    ...text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi),
  ];
  for (const m of claims) {
    const rev = /^[a-h][1-8]$/.test(m[1]);
    const sq = (rev ? m[1] : m[2]).toLowerCase();
    const word = (rev ? m[2] : m[1]).toLowerCase();
    const p = c.get(sq);
    if (!p) return `claims "${m[0]}" but ${sq} is EMPTY`;
    if (p.type !== PIECE_CODE[word]) return `claims "${m[0]}" but ${sq} holds a ${Object.entries(PIECE_CODE).find(([, v]) => v === p.type)?.[0]}`;
  }
  return null;
}

async function callModel(system, user, maxTokens) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat', temperature: 0.4, max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return JSON.parse((await res.json()).choices?.[0]?.message?.content ?? '{}');
}

async function main() {
  const spine = await resolveSpine(OPENING);
  if (!spine) { console.error(`no spine resolves for "${OPENING}"`); process.exit(1); }

  // Per-ply FENs, chess.js-computed (G3 — the moves are the DB's, never the model's).
  const c = new Chess();
  const plies = spine.moves.map((san) => {
    const mv = c.move(san);
    if (!mv) throw new Error(`illegal spine move ${san}`);
    return { san: mv.san, movedBy: mv.color === 'w' ? 'white' : 'black', fen: c.fen() };
  });

  let transcript = '';
  for (const id of VIDEO_IDS) {
    // Raw captions when present; a farm that already cleaned to prose (the
    // generic fetch-youtube-transcripts pipeline) writes .txt instead.
    const vtt = await readFile(`${TDIR}/${id}.en.vtt`, 'utf8').catch(() => null);
    if (vtt !== null) { transcript += `\n${vttToText(vtt)}`; continue; }
    const txt = await readFile(`${TDIR}/${id}.txt`, 'utf8').catch(() => null);
    if (txt !== null) { transcript += `\n${txt}`; continue; }
    console.error(`  (no transcript on disk for ${id} — skipping)`);
  }
  if (transcript.length < 2000) { console.error('transcript material too thin'); process.exit(1); }
  // DeepSeek context bound — keep the richest teaching bulk.
  const clipped = transcript.length > 180_000 ? transcript.slice(0, 180_000) : transcript;
  console.log(`[narrate] "${spine.name}" — ${plies.length} plies, ${VIDEO_IDS.length} video(s), ${Math.round(clipped.length / 1000)}k chars of reference`);
  if (DRY) return;

  const overlaps = makeOverlapGate(transcript);
  const system = `You are the app's chess coach — think Daniel Naroditsky sitting next to the student — rewording a master teacher's spoken video lesson into YOUR own narration of an opening walkthrough.

THE SOURCE is the teacher's raw spoken transcript (reference ONLY). THE LINE is the exact move sequence the app walks. Your job: for each move of the line, find what the teacher TEACHES about that moment in the transcript — the idea, the plan, the warning, the story — and say it in YOUR OWN WORDS.

ONE CONTINUOUS STORY (the teacher's videos are a NARRATIVE, not a move list — this is the shape):
- The INTRO states the story's through-line: the one tension this whole line is about (the square being fought over, the attack being built, the trap being set). Every entry advances THAT story.
- Each entry PICKS UP where the previous one left off — connective tissue is mandatory: "Now that the centre is braced…", "Remember the bishop we posted on g2? This is why…", "Black just called our bluff, so…". An entry that could be shuffled to any other position in the line is a FAILURE.
- Call BACK to earlier moves when a plan pays off, and plant setups the later entries will collect. The last entry and the outro land the payoff of the through-line stated in the intro.
- NEVER re-introduce the opening mid-line, never reset context, never write an entry that stands alone.

THE HOUSE VOICE (this is the bar — flat textbook prose is a FAILURE):
- Teach the IDEA, not just the move. A student should finish each beat understanding WHY, not just WHAT. "Nc3 does two jobs — it braces e4 so Black can never strike there for free, and it keeps the king-knight home, so White still gets to choose which attacking setup to build" beats "Nc3 develops and defends e4." (These are STYLE illustrations — never copy their sentences into your output.)
- Concept-first and conversational: "Here's the thing about this line…", "notice that…", "the point is…". Warmth is welcome; hollow hype is not.
- The opening turns on ONE central idea — find it in the transcript and teach toward it, so the beats build an argument instead of listing facts.
- Reach for the clarifying detail the teacher reaches for — the square that matters, the piece that's secretly the star, the plan three moves away.
- A KEYSTONE move (the line's defining decision, the pawn break, the move that gives it its character) gets taught like a masterclass beat: what it does, the plan it serves, what happens if the idea is ignored. A routine developing move gets ONE tight sentence — never a fabricated deep reason.
- BANNED FILLER: "develops the knight to a natural square", "a solid move", "we continue with our plan", "we're not worried", "keeps options open" — if a sentence would be true of any move in any opening, it teaches nothing; replace it with the teacher's actual idea or keep it to one plain factual clause.
- State only reasons TRUE of THIS exact position. One true concrete reason beats three plausible ones.

ABSOLUTE RULES:
- TRANSLATION, NOT TRANSCRIPTION: never copy or lightly rephrase his sentences. Never 7 consecutive words from the source. The ideas are chess knowledge; the wording must be original.
- TRANSLATION, NOT INVENTION: add NO chess content the transcript or the line itself doesn't support. Where the transcript is silent on a move, one tight factual sentence about the move is all you write.
- NEVER name or reference the teacher, a video, stream, chat, or opponent. Timeless coaching voice: warm, rigorous, concept-first.
- NO length cap on "text" — where he lingers and teaches deeply, teach deeply. "shortText" is the brief register: ONE sentence, max 18 words.
- NO move-number prefixes ("5.Nc3" is banned — write "Nc3"). Mention the move's SAN or spoken form in each text.
- ALIGNMENT IS ABSOLUTE: entry N is SPOKEN AS move N ANIMATES. It narrates move N — the move just played — and MUST name that move's SAN. It must NEVER present the NEXT move as its subject ("f5 is the gambit" as the entry for Nf3 is a hard failure). Forecasting what comes next is allowed only AFTER the entry has taught its own move.
- Frame ideas for the student playing the side the app teaches.

Return STRICT JSON:
{"intro": string, "shortIntro": string, "outro": string,
 "ideas": [{"text": string, "shortText": string}, ...]}  // EXACTLY one per move, in order`;

  const user = `OPENING: ${spine.name}
THE STUDENT PLAYS: ${(spine.studentSide ?? 'white').toUpperCase()} — "we/our" means ${(spine.studentSide ?? 'white')} in every entry; the other color is addressed by name.
THE LINE (${plies.length} plies, in order): ${plies.map((p, i) => `${i + 1}:${p.san}`).join(' ')}

TEACHER'S SPOKEN TRANSCRIPT (reference only — reword, never quote):
${clipped}`;

  // One-shot asks under-deliver on long lines (28 plies → 15 ideas). Chunk:
  // intro/outro from the first call, ideas in batches of 10 with the full
  // reference each time, exact-count enforced per batch.
  const BATCH = 10;
  // The model sometimes under-delivers a batch's count — retry the batch
  // (up to 3 tries) before refusing; a partial narration never ships.
  const callBatch = async (prompt, want, maxTokens) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await callModel(system, prompt, maxTokens);
      const got = Array.isArray(res.ideas) ? res.ideas : [];
      if (got.length >= want) return { ...res, ideas: got.slice(0, want) };
      console.error(`  (batch returned ${got.length}/${want} ideas — retry ${attempt}/3)`);
    }
    return null;
  };
  const firstWant = Math.min(BATCH, plies.length);
  const first = await callBatch(`${user}

FOR THIS CALL: return intro, shortIntro, outro, and ideas for ONLY the first ${firstWant} moves (${plies.slice(0, BATCH).map((p) => p.san).join(' ')}). EXACTLY ${firstWant} idea entries — one per listed move, count them.`, firstWant, 8192);
  if (!first) { console.error(`model kept under-delivering the first batch — refusing partial narration`); process.exit(1); }
  const out = { intro: first.intro, shortIntro: first.shortIntro, outro: first.outro };
  let ideas = first.ideas;
  for (let start = BATCH; start < plies.length; start += BATCH) {
    const slice = plies.slice(start, start + BATCH);
    const more = await callBatch(`${user}

FOR THIS CALL: return ONLY {"ideas":[...]} for moves ${start + 1}-${start + slice.length} of the line (${slice.map((p) => p.san).join(' ')}), continuing the same narration. EXACTLY ${slice.length} idea entries — one per listed move, count them.`, slice.length, 8192);
    if (!more) { console.error(`model kept under-delivering batch at ${start + 1} — refusing partial narration`); process.exit(1); }
    ideas = ideas.concat(more.ideas);
  }
  if (ideas.length !== plies.length) {
    console.error(`model returned ${ideas.length} ideas for ${plies.length} plies — refusing partial narration`);
    process.exit(1);
  }

  // Gates, per unit. A failed unit fails the BUILD (fix the source or re-run) —
  // a silently-dropped ply would desync narration from the board.
  const runGates = () => {
    const problems = [];
    const checkUnit = (label, text, fen) => {
      if (!text || !text.trim()) return problems.push(`${label}: empty`);
      const gram = overlaps(text);
      if (gram) return problems.push(`${label}: lifts the transcript phrase "${gram}" — reword it`);
      if (BANNED.test(text)) return problems.push(`${label}: attribution/medium leak`);
      if (BANNED_EXTRA && BANNED_EXTRA.test(text)) return problems.push(`${label}: creator attribution leak`);
      if (MOVE_NUM.test(text)) return problems.push(`${label}: move-number prefix`);
      if (fen) {
        const claim = boardClaimProblem(text, fen);
        if (claim) return problems.push(`${label}: ${claim}`);
      }
    };
    checkUnit('intro', out.intro, null);
    checkUnit('outro', out.outro, null);
    ideas.forEach((idea, i) => {
      checkUnit(`ply ${i + 1} (${plies[i].san}) text`, idea.text, plies[i].fen);
      checkUnit(`ply ${i + 1} shortText`, idea.shortText, plies[i].fen);
      const shortWords = String(idea.shortText ?? '').trim().split(/\s+/).length;
      if (shortWords > 18) problems.push(`ply ${i + 1} shortText: ${shortWords} words (max 18)`);
      if (idea.text && !mentionsOwnMove(idea.text, plies[i].san)) {
        problems.push(`ply ${i + 1} text: does not speak about its OWN move ${plies[i].san} (misaligned narration)`);
      }
    });
    return problems;
  };
  // REPAIR LOOP: a failed ply goes back to the model with the EXACT violation
  // (which claim lied, on which FEN) — up to 2 rounds; a blind repair that
  // doesn't know which sentence lied just fails the same gate again.
  let problems = runGates();
  for (let round = 1; round <= 2 && problems.length > 0; round += 1) {
    const failing = [...new Set(problems.map((x) => x.match(/^ply (\d+)/)?.[1]).filter(Boolean).map(Number))];
    const introFailing = problems.some((x) => x.startsWith('intro'));
    const outroFailing = problems.some((x) => x.startsWith('outro'));
    if (failing.length === 0 && !introFailing && !outroFailing) break;
    console.error(`… repair round ${round}: ${problems.slice(0, 6).join(' | ')}`);
    const detail = [
      ...(introFailing ? [`the INTRO — rejected because: ${problems.filter((x) => x.startsWith('intro')).join('; ')}`] : []),
      ...(outroFailing ? [`the OUTRO — rejected because: ${problems.filter((x) => x.startsWith('outro')).join('; ')}`] : []),
      ...failing.map((n) => {
        const i = n - 1;
        return `move ${n} (${plies[i].san}) — FEN after: ${plies[i].fen} — rejected because: ${problems.filter((x) => x.startsWith(`ply ${n} `)).join('; ')}`;
      }),
    ].join('\n');
    const fix = await callModel(system, `${user}\n\nREPAIR CALL: these narration units were REJECTED for the exact reasons listed. Rewrite ONLY the listed units. Never reuse 7 consecutive words from the transcript; each move entry MUST name its own move's SAN; every piece/square claim must be TRUE on the given FEN (simplest fix: drop the false claim); shortText ≤18 words.\n${detail}\nReturn JSON with ${introFailing ? '"intro" and "shortIntro", ' : ''}${outroFailing ? '"outro", ' : ''}${failing.length > 0 ? `and "ideas" with EXACTLY ${failing.length} entries in the order listed` : 'nothing else'}.`, 4096);
    if (introFailing && fix.intro) { out.intro = fix.intro; if (fix.shortIntro) out.shortIntro = fix.shortIntro; }
    if (outroFailing && fix.outro) out.outro = fix.outro;
    const fixed = Array.isArray(fix.ideas) ? fix.ideas : [];
    failing.forEach((n, k) => { if (fixed[k]) ideas[n - 1] = fixed[k]; });
    problems = runGates();
  }
  if (problems.length > 0) {
    console.error(`✗ ${problems.length} gate failure(s) after repair:`);
    for (const x of problems.slice(0, 12)) console.error('  -', x);
    process.exit(1);
  }

  // ── FLIP PASS (David 2026-07-31: board orientation dictates the coach's
  // pronouns). One more offline call rewrites the finished, gated narration
  // addressing the OTHER color as "we" — same facts, same gates. Best-effort:
  // a flipped set that can't pass the gates ships absent (the primary
  // register then speaks regardless of orientation), never half-gated.
  const side = spine.studentSide ?? 'white';
  const other = side === 'white' ? 'black' : 'white';
  let flipped = null;
  try {
    const finished = ideas.map((idea, i) => `${i + 1}. [after ${plies[i].san}] ${idea.text} || SHORT: ${idea.shortText}`).join('\n');
    const flip = await callModel(system, `${user}

FLIP CALL: below is the FINISHED narration for this line, written for the student playing ${side.toUpperCase()} ("we" = ${side}). Rewrite the intro, shortIntro, outro, and EVERY entry so the student is playing ${other.toUpperCase()} instead — "we/our" now means ${other}, and ${side} becomes "White"/"Black" by name. SAME facts, SAME move each entry speaks about, same alignment and truth rules. Return {"intro":string,"shortIntro":string,"outro":string,"ideas":[{"text","shortText"}...]} with EXACTLY ${ideas.length} idea entries.

FINISHED NARRATION:
${finished}`, 8192);
    const fIdeas = Array.isArray(flip.ideas) ? flip.ideas : [];
    if (fIdeas.length === ideas.length && flip.intro && flip.outro) {
      const fProblems = [];
      const checkFlip = (label, text, fen) => {
        if (!text || !text.trim()) return fProblems.push(`${label}: empty`);
        const fGram = overlaps(text);
        if (fGram) return fProblems.push(`${label}: lifts "${fGram}"`);
        if (BANNED.test(text) || (BANNED_EXTRA && BANNED_EXTRA.test(text))) return fProblems.push(`${label}: attribution leak`);
        if (MOVE_NUM.test(text)) return fProblems.push(`${label}: move-number prefix`);
        if (fen) { const c = boardClaimProblem(text, fen); if (c) return fProblems.push(`${label}: ${c}`); }
      };
      checkFlip('flip intro', flip.intro, null);
      checkFlip('flip outro', flip.outro, null);
      fIdeas.forEach((idea, i) => {
        checkFlip(`flip ply ${i + 1}`, idea.text, plies[i].fen);
        if (idea.text && !mentionsOwnMove(idea.text, plies[i].san)) fProblems.push(`flip ply ${i + 1}: misaligned`);
      });
      if (fProblems.length === 0) {
        flipped = flip;
        console.log(`  flip register baked (${other} perspective) — all gates green`);
      } else {
        console.error(`  (flip register FAILED ${fProblems.length} gate(s) — shipping primary only: ${fProblems.slice(0, 3).join(' | ')})`);
      }
    } else {
      console.error('  (flip register malformed — shipping primary only)');
    }
  } catch (e) {
    console.error(`  (flip call failed — shipping primary only: ${String(e).slice(0, 100)})`);
  }

  let file = { generatedAt: '', narrations: {} };
  try { file = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first entry */ }
  file.generatedAt = new Date().toISOString();
  file.narrations[norm(spine.name)] = {
    openingName: spine.name,
    spine: plies.map((p) => p.san),
    sourceVideos: VIDEO_IDS.map((id) => `yt:${id}`),
    studentSide: side,
    intro: out.intro.trim(),
    shortIntro: String(out.shortIntro ?? '').trim(),
    outro: out.outro.trim(),
    ideas: ideas.map((i) => ({ text: i.text.trim(), shortText: String(i.shortText ?? '').trim() })),
    ...(flipped ? {
      introFlipped: String(flipped.intro).trim(),
      shortIntroFlipped: String(flipped.shortIntro ?? '').trim(),
      outroFlipped: String(flipped.outro).trim(),
      ideasFlipped: flipped.ideas.map((i) => ({ text: String(i.text).trim(), shortText: String(i.shortText ?? '').trim() })),
    } : {}),
  };
  await writeFile(OUT, JSON.stringify(file, null, 1));
  console.log(`✓ "${spine.name}" narration baked from video — ${ideas.length} plies${flipped ? ' + flip register' : ''}, all gates green → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
