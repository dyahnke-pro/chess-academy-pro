// NARRATION QUALITY (David 2026-07-31: "I also want you auditing for narration
// quality. Make sure it's speaking the notes before you pass it back to me. I
// want to see the narration outputs").
//
// Every other teach audit proves the surface RENDERS and the voice FIRES. This
// one reads what the voice actually SAID and grades it, then prints the whole
// transcript so the prose can be judged by eye — a quality claim nobody can
// check is worthless.
//
// The spoken text IS the /api/tts query string, captured in order, so this is
// the real narration, not the display text and not a re-derivation.
//
// What it grades, per opening:
//   COVERAGE   — did every ply get narrated, or did the tail go silent
//   TEMPLATE   — the `SAN — generic sentence` stamp from synthesizeIdeaFromSan.
//                A lesson made of these is the "repetitive, sounded nothing
//                like Naroditsky" failure. Some is fine (a truncated tail);
//                a majority is a FAIL.
//   REPETITION — consecutive lines opening with the same stem, and lines
//                repeated verbatim
//   CORPUS     — did any of the shipped teaching notes for this opening
//                actually reach the voice (the splice David asked about)
//   VOICE      — move-number prefixes (Polly reads "2." as "two") and
//                attribution / medium leaks, both banned house-wide
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_OPENINGS="alapin|italian game|caro-kann"] \
//   node scripts/audit-narration-quality-prod.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASKS = (process.env.AUDIT_OPENINGS || 'alapin|italian game|caro-kann').split('|').map((s) => s.trim()).filter(Boolean);
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const WALK_MS = Number(process.env.AUDIT_WALK_MS || 210000);

// EVERY narrated ply is spoken as `<announced move> — <idea>`; the prefix is
// the move announcement, NOT a template marker (v1 of this probe got that
// wrong and flagged good prose). The template is the closed set of stock TAILS
// synthesizeIdeaFromSan can emit — match those exactly, so a lesson made of
// them is caught and authored prose never is.
const TEMPLATE_TAILS = [
  'check, forcing a reply before anything else.',
  'trading off a defender.',
  'developing toward the center and eyeing key squares.',
  'adding pressure on the central squares.',
  'giving up the pair for structure or tempo.',
  'raking a long diagonal toward the center.',
  'pinning or pressuring along the diagonal.',
  'winning material on the file.',
  'claiming an open or soon-to-open file.',
  'preparing to double or contest the file.',
  "grabbing material; watch she isn't chased with tempo.",
  'joining the attack while keeping flexibility.',
  'coordinating the pieces and eyeing weak squares.',
  'walking to safety or activating in the late opening.',
  'opening lines and reshaping the center.',
  'staking a claim in the center, fighting for space and open lines.',
  'gaining space, supporting the center and freeing the pieces behind.',
  'a pawn break, challenging the structure and opening the position.',
  "'s king tucks to safety and the rooks connect.",
  "'s rook comes to bear on the central d-file.",
].map((t) => t.toLowerCase());
/** The idea half — everything after the move announcement. */
const ideaOf = (line) => {
  const i = line.indexOf('—');
  return (i >= 0 ? line.slice(i + 1) : line).trim();
};
const isTemplate = (line) => {
  const idea = ideaOf(line).toLowerCase();
  return TEMPLATE_TAILS.some((t) => idea === t || idea.endsWith(t));
};
const MOVE_NUMBER_RE = /\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;
const ATTRIBUTION_RE = /\b(naroditsky|danya|hikaru|gotham|levy|in this video|in the video|subscribe|the streamer|this stream|speedrun)\b/i;

const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
const words = (t) => norm(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

// Distinctive ≥6-word fragments from every positioned corpus note of this
// opening — a hit proves the shipped teaching reached the voice.
async function corpusMarks(ask) {
  const marks = [];
  for (const path of ['src/data/danya-teachings.json', 'src/data/chessbrah-teachings.json']) {
    let corpus;
    try { corpus = JSON.parse(await readFile(path, 'utf8')); } catch { continue; }
    const askN = norm(ask).replace(/[^a-z0-9 ]/g, '');
    for (const n of (corpus.notes ?? []).filter((n) => n.lineSan?.length > 0 && norm(n.opening ?? '').replace(/[^a-z0-9 ]/g, '').includes(askN))) {
      for (const field of [n.explains, n.teaches, n.plans]) {
        const w = words(field ?? '');
        if (w.length >= 8) marks.push(w.slice(1, 8).join(' '));
      }
    }
  }
  return marks;
}

/** Instrument 2 — what the app actually DID internally this run. */
const pullStream = async () => {
  if (!SECRET) return [];
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${Date.now() - 20 * 60 * 1000}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    return res.ok ? ((await res.json()).entries ?? []) : [];
  } catch { return []; }
};

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
const p = await ctx.newPage();
const spoken = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    try {
      const t = new URL(r.url()).searchParams.get('text') ?? '';
      // The warmup probe is a bare '.' — never narration.
      if (t.trim().length > 1) spoken.push(t);
    } catch { /* malformed */ }
  }
});

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = p.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await p.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = p.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await p.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* absent */ }
}

const reports = [];
for (const ask of ASKS) {
  spoken.length = 0;
  const marks = await corpusMarks(ask);
  console.log(`\n════ "${ask}" ════  (${marks.length} corpus mark(s) to look for)`);
  try {
    await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.evaluate((s) => { try { if (s) localStorage.setItem('auditStreamSecret', s); } catch { /* blocked */ } }, SECRET).catch(() => undefined);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await dismiss(); await dismiss();
    const box = p.locator('[data-testid="chat-text-input"]');
    await box.waitFor({ timeout: 20000 });
    await box.click();
    await box.pressSequentially(`teach me the ${ask}`, { delay: 12 });
    await box.press('Enter');

    // Let the lesson NARRATE. Do not skip — skipping is what makes a probe
    // report "the voice fired" while never hearing the middle of the lesson.
    const t0 = Date.now();
    let lastCount = -1;
    let idleSince = Date.now();
    while (Date.now() - t0 < WALK_MS) {
      await p.waitForTimeout(5000);
      if (spoken.length !== lastCount) { lastCount = spoken.length; idleSince = Date.now(); }
      // Nudge only when the walk has gone quiet for a while (a fork panel
      // waiting on a pick, or a leaf) — never mid-narration.
      if (Date.now() - idleSince > 30000) {
        for (const s of ['[data-testid="walkthrough-fork-option-0"]', '[data-testid="walkthrough-skip"]']) {
          try {
            const el = p.locator(s).first();
            if (await el.isVisible({ timeout: 400 })) { await el.click({ force: true }); break; }
          } catch { /* next */ }
        }
        idleSince = Date.now();
      }
      if (await p.locator('[data-testid="walkthrough-leaf-panel"]').isVisible().catch(() => false)) break;
    }
  } catch (e) {
    console.log(`  ERROR ${String(e).slice(0, 160)}`);
  }

  // The notes reach the voice two different ways, and only ONE of them can be
  // proved by looking for verbatim fragments:
  //   danyaTeaching — the notes are injected as GROUNDING and the model writes
  //     ORIGINAL prose from them. Verbatim text MUST NOT appear (the corpus
  //     plagiarism guard); a mark-hunt here would be testing for the thing we
  //     forbid. The pipeline event is the proof.
  //   danyaSplice  — graded note teaching is inserted at a ply. Verbatim marks
  //     ARE expected, so they stay a real signal where this path fired.
  const events = await pullStream();
  const groundedEvt = events.filter((e) => /danyaTeaching/i.test(e.source ?? ''));
  const spliceEvt = events.filter((e) => /danyaSplice/i.test(e.source ?? ''));

  const lines = [...spoken];
  const templates = lines.filter(isTemplate);
  // Stem from the IDEA, not the line: consecutive plies of the same move
  // ("cxd4" then the recapture "cxd4") legitimately share an announcement.
  const stems = lines.map((l) => words(ideaOf(l)).slice(0, 5).join(' '));
  let consecutiveRepeats = 0;
  for (let i = 1; i < stems.length; i += 1) if (stems[i] && stems[i] === stems[i - 1]) consecutiveRepeats += 1;
  const verbatimDupes = lines.length - new Set(lines.map(norm)).size;
  const pool = norm(lines.join(' ')).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  const corpusHits = marks.filter((m) => pool.includes(m));
  const moveNumberLines = lines.filter((l) => MOVE_NUMBER_RE.test(l));
  const attributionLines = lines.filter((l) => ATTRIBUTION_RE.test(l));

  console.log(`\n──── SPOKEN TRANSCRIPT (${lines.length} lines) ────`);
  lines.forEach((l, i) => {
    const flag = isTemplate(l) ? ' [TEMPLATE]' : '';
    console.log(`  ${String(i + 1).padStart(2)}.${flag} ${l}`);
  });

  const templateRatio = lines.length ? templates.length / lines.length : 1;
  const checks = [
    ['the coach narrated at all', lines.length >= 4, `${lines.length} spoken line(s)`],
    ['not a template lesson (<40% stamped lines)', templateRatio < 0.4, `${templates.length}/${lines.length} template (${Math.round(templateRatio * 100)}%)`],
    ['no back-to-back repeated openings', consecutiveRepeats === 0, `${consecutiveRepeats} repeat(s)`],
    ['no verbatim duplicate lines', verbatimDupes === 0, `${verbatimDupes} duplicate(s)`],
    ['no move-number prefixes (G9.4)', moveNumberLines.length === 0, moveNumberLines[0]?.slice(0, 60) ?? ''],
    ['no attribution / medium leak', attributionLines.length === 0, attributionLines[0]?.slice(0, 60) ?? ''],
  ];
  // Only assertable where the shipped corpus HAS notes for this opening —
  // otherwise silence is correct, not a failure.
  if (marks.length > 0) {
    checks.push([
      'the teaching notes reached the narration',
      groundedEvt.length > 0 || spliceEvt.length > 0 || corpusHits.length > 0,
      `grounding=${groundedEvt.length} splice=${spliceEvt.length} verbatim=${corpusHits.length}`,
    ]);
    // Verbatim note text is a PLAGIARISM failure on the grounded path — the
    // narration must teach the notes' ideas in its own words.
    if (groundedEvt.length > 0 && spliceEvt.length === 0) {
      checks.push(['grounded prose is original, not lifted', corpusHits.length === 0,
        corpusHits.length ? `verbatim: "${corpusHits[0]}"` : '']);
    }
  }

  console.log(`\n──── GRADE ────`);
  for (const [name, pass, detail] of checks) console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  reports.push({ ask, lines, checks: checks.map(([name, pass, detail]) => ({ name, pass, detail })), corpusMarks: marks.length, corpusHits: corpusHits.length });
}

await b.close();
await mkdir('audit-reports/narration-quality', { recursive: true }).catch(() => undefined);
const out = `audit-reports/narration-quality/report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(out, JSON.stringify(reports, null, 2)).catch(() => undefined);

const failed = reports.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => `${r.ask}: ${c.name}`));
console.log(`\n════ narration quality: ${reports.length} opening(s), ${failed.length} failing check(s) ════`);
for (const f of failed) console.log(`  ✗ ${f}`);
console.log(`  report → ${out}`);
process.exit(failed.length === 0 ? 0 : 1);
