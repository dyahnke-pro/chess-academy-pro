// PERSONAL gambit-tab deep walk (David 2026-05-31). Scoped to the Gambit tab.
// Loads the SAME runtime data the app loads, then walks every gambit + every
// variation lesson from start to finish: legality, ply length, middlegame
// reach, full+short narration presence, board-claim accuracy, arrow legality,
// variation-tab→lesson coverage, and opening→middlegame→endgame continuity.
import { Chess } from 'chess.js';
import gambits from '../src/data/gambits.json' assert { type: 'json' };
import repertoire from '../src/data/repertoire.json' assert { type: 'json' };
import middlegamePlans from '../src/data/middlegame-plans.json' assert { type: 'json' };
import modelGames from '../src/data/model-games.json' assert { type: 'json' };
import commonMistakes from '../src/data/common-mistakes.json' assert { type: 'json' };
import {
  getLessonScript,
  getVariationLessonScript,
  getAllVariationLessonKeys,
} from '../src/data/lessons';
import { buildVariationTabs } from '../src/services/variationTabs';
// @ts-expect-error plain-js shared metric
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
import type { LessonScript } from '../src/types';

type AnyOpening = {
  id: string;
  eco: string;
  name: string;
  pgn: string;
  color: 'white' | 'black';
  isGambit?: boolean;
  variations?: Array<{ name: string; pgn: string; explanation?: string }>;
  trapLines?: Array<{ name: string; pgn: string }> | null;
  warningLines?: Array<{ name: string; pgn: string }> | null;
};

const repArr = repertoire as AnyOpening[];
const gambitArr = gambits as AnyOpening[];
const repGambits = repArr.filter((o) => o.isGambit === true);
// Gambit tab order = ECO sort (matches getGambitOpenings)
const ALL: AnyOpening[] = [...gambitArr, ...repGambits].sort(
  (a, b) => a.eco.localeCompare(b.eco) || a.name.localeCompare(b.name),
);

const mpArr = (Array.isArray(middlegamePlans)
  ? middlegamePlans
  : (middlegamePlans as { plans: unknown[] }).plans) as Array<{
  id: string;
  openingId: string;
  criticalPositionFen: string;
  title: string;
  playableLines?: Array<{ fen?: string; moves?: string[]; learnCues?: unknown[]; annotations?: unknown[] }>;
}>;
const mgArr = modelGames as Array<{ id: string; openingId: string; studentSide?: string; pgn: string; overview?: string }>;
const cmObj = commonMistakes as Record<string, Array<{ fen: string; explanation?: string; shortNarration?: string }>>;

const PIECE_LETTER: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const CLAIM_RE = /\b([a-h][1-8])-(pawn|knight|bishop|rook|queen|king)\b/gi;

function groundedFacts(moves: string[]): Set<string> {
  const c = new Chess();
  const facts = new Set<string>();
  const snap = (): void => {
    for (const row of c.board()) for (const sq of row) if (sq) facts.add(`${sq.square}:${sq.type}`);
  };
  snap();
  for (const m of moves) {
    try { c.move(m); } catch { break; }
    snap();
  }
  return facts;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Learn-cue word count — matches wlppNarration gate (standalone em-dash /
// hyphen separating the move from its echo is NOT a word).
function cueWords(s: string): number {
  return s.trim().split(/\s+/).filter((w) => !/^[—–-]+$/.test(w)).length;
}

interface Issue { sev: 'ERROR' | 'WARN' | 'INFO'; where: string; msg: string; }
const issues: Issue[] = [];
const add = (sev: Issue['sev'], where: string, msg: string): void => { issues.push({ sev, where, msg }); };

function fenAfter(pgn: string): { fen: string; legal: boolean; badAt?: string; plies: number } {
  const c = new Chess();
  const moves = pgn.trim().split(/\s+/).filter(Boolean);
  let n = 0;
  for (const m of moves) {
    try { c.move(m); n++; } catch { return { fen: c.fen(), legal: false, badAt: m, plies: n }; }
  }
  return { fen: c.fen(), legal: true, plies: n };
}

// Replay a lesson's beats. Each beat.moves is the cumulative SAN array from start.
function walkLesson(lesson: LessonScript, label: string): { lastMoves: string[]; ok: boolean } {
  let lastMoves: string[] = [];
  let ok = true;
  if (!lesson.beats || lesson.beats.length === 0) {
    add('ERROR', label, 'lesson has ZERO beats');
    return { lastMoves, ok: false };
  }
  let prevLen = -1;
  lesson.beats.forEach((beat, i) => {
    const moves = beat.moves ?? [];
    // legality
    const c = new Chess();
    let bad: string | undefined;
    for (const m of moves) { try { c.move(m); } catch { bad = m; break; } }
    if (bad) { add('ERROR', `${label} beat#${i}(${beat.id})`, `ILLEGAL move "${bad}" in beat moves`); ok = false; }
    // beat moves should be monotonic prefix-extending (cumulative)
    if (moves.length <= prevLen) {
      add('WARN', `${label} beat#${i}(${beat.id})`, `beat moves length ${moves.length} not greater than prev ${prevLen} (non-monotonic cumulative)`);
    }
    prevLen = moves.length;
    // narration registers
    if (!beat.say || wordCount(beat.say) < 3) add('ERROR', `${label} beat#${i}(${beat.id})`, `missing/too-short full narration (say)`);
    if (!beat.sayShort || wordCount(beat.sayShort) < 1) add('ERROR', `${label} beat#${i}(${beat.id})`, `missing short narration (sayShort)`);
    else if (cueWords(beat.sayShort) > 8) add('WARN', `${label} beat#${i}(${beat.id})`, `sayShort is ${cueWords(beat.sayShort)} words (>8 — Learn cue should be ≤8)`);
    // board-claim accuracy
    const facts = groundedFacts(moves);
    const text = `${beat.say ?? ''} ${beat.sayShort ?? ''}`;
    const seen = new Set<string>();
    for (const mm of text.matchAll(CLAIM_RE)) {
      const key = `${mm[1].toLowerCase()}:${PIECE_LETTER[mm[2].toLowerCase()]}`;
      if (seen.has(key)) continue; seen.add(key);
      if (!facts.has(key)) { add('ERROR', `${label} beat#${i}(${beat.id})`, `narration names ${mm[2]} on ${mm[1]} but none ever stands there`); ok = false; }
    }
    // arrow legality: arrow.from must hold a piece at beat's final position; sight-line not asserted here
    const finalFacts = new Set<string>();
    {
      const cc = new Chess();
      for (const m of moves) { try { cc.move(m); } catch { break; } }
      for (const row of cc.board()) for (const sq of row) if (sq) finalFacts.add(sq.square);
    }
    for (const arr of beat.arrows ?? []) {
      if (!finalFacts.has(arr.from)) add('WARN', `${label} beat#${i}(${beat.id})`, `arrow from ${arr.from}-${arr.to} but no piece on ${arr.from} at beat end`);
    }
  });
  lastMoves = lesson.beats[lesson.beats.length - 1].moves ?? [];
  // middlegame reach on the lesson's terminal line
  const mg = reachesMiddlegame(lastMoves.join(' '));
  if (!mg.pass) add('WARN', label, `lesson terminus does NOT reach middlegame (plies=${mg.plies}, wCastle=${mg.wCastle}, bCastle=${mg.bCastle}, wDev=${mg.wDev}, bDev=${mg.bDev})`);
  return { lastMoves, ok };
}

const variationKeys = new Set(getAllVariationLessonKeys());

console.log(`\n${'='.repeat(78)}\nGAMBIT TAB WALK — ${ALL.length} openings\n${'='.repeat(78)}`);
console.log(ALL.map((o, i) => `${i + 1}. ${o.name} (${o.id}, ${o.eco}, ${o.color}, ${o.variations?.length ?? 0} vars)`).join('\n'));

for (const o of ALL) {
  console.log(`\n${'─'.repeat(78)}\n### ${o.name} [${o.id}] ${o.eco} ${o.color}\n${'─'.repeat(78)}`);
  // opening pgn legality + ply
  const op = fenAfter(o.pgn);
  if (!op.legal) add('ERROR', `${o.id} main pgn`, `ILLEGAL at "${op.badAt}" (${op.plies} plies ok)`);
  const opMG = reachesMiddlegame(o.pgn);
  console.log(`  main pgn: ${op.plies} plies, legal=${op.legal}, reachesMiddlegame=${opMG.pass} (wCastle=${opMG.wCastle} bCastle=${opMG.bCastle} wDev=${opMG.wDev} bDev=${opMG.bDev})`);
  if (!opMG.pass) add('WARN', `${o.id} main pgn`, `main line does NOT reach middlegame (${opMG.plies} plies)`);

  // Watch lesson (main)
  const main = getLessonScript(o.id);
  if (!main) {
    add('ERROR', `${o.id}`, `NO main LessonScript registered — Watch falls back to legacy WalkthroughMode (Gate A FAIL)`);
    console.log(`  Watch lesson: *** NONE (legacy fallback) ***`);
  } else {
    const r = walkLesson(main, `${o.id}/main`);
    console.log(`  Watch lesson: ${main.beats.length} beats, terminus ${r.lastMoves.length} plies`);
  }

  // Variation tabs (as the UI builds them)
  const tabs = buildVariationTabs(o.id, o.variations ?? []);
  console.log(`  variation tabs (${tabs.length}): ${tabs.map((t) => t.label).join(' | ')}`);
  for (const tab of tabs) {
    const v = o.variations?.[tab.index];
    if (!v) continue;
    const key = `${o.id}::${v.name}`;
    const vlesson = getVariationLessonScript(o.id, v.name);
    const vp = fenAfter(v.pgn);
    const vMG = reachesMiddlegame(v.pgn);
    if (!vp.legal) add('ERROR', `${o.id}::${v.name} pgn`, `ILLEGAL at "${vp.badAt}"`);
    if (!vMG.pass) add('WARN', `${o.id}::${v.name} pgn`, `variation pgn does NOT reach middlegame (${vMG.plies} plies)`);
    if (!vlesson) {
      add('ERROR', `${o.id}::${v.name}`, `tab "${tab.label}" has NO curated variation lesson (key not in VARIATION_LESSONS) → Watch falls back to legacy WalkthroughMode`);
      console.log(`    [${tab.label}] "${v.name}": pgn ${vp.plies}p mg=${vMG.pass} | LESSON: *** NONE → legacy fallback ***`);
    } else {
      const r = walkLesson(vlesson, `${o.id}::${v.name}`);
      console.log(`    [${tab.label}] "${v.name}": pgn ${vp.plies}p mg=${vMG.pass} | lesson ${vlesson.beats.length} beats, terminus ${r.lastMoves.length}p`);
    }
  }

  // Orphan variation lessons: registered but no matching tab/variation
  for (const key of variationKeys) {
    if (!key.startsWith(`${o.id}::`)) continue;
    const vname = key.slice(o.id.length + 2);
    const hasVar = (o.variations ?? []).some((v) => v.name === vname);
    if (!hasVar) add('WARN', `${o.id}`, `registered variation lesson "${key}" has NO matching variation in opening record (orphan / name drift)`);
  }

  // Middlegame + endgame plans
  const plans = mpArr.filter((p) => p.openingId === o.id);
  const mgPlans = plans.filter((p) => !p.id.endsWith('-endgame'));
  const egPlans = plans.filter((p) => p.id.endsWith('-endgame'));
  console.log(`  plans: ${mgPlans.length} middlegame, ${egPlans.length} endgame`);
  if (egPlans.length > 0 && mgPlans.length === 0) {
    add('WARN', `${o.id}`, `has endgame plan(s) but NO middlegame plan — opening→middlegame→endgame chain skips the middle`);
  }
  for (const p of plans) {
    const f = fenAfter(''); void f;
    // validate criticalPositionFen parses
    let fenOk = true;
    try { new Chess(p.criticalPositionFen); } catch { fenOk = false; }
    if (!fenOk) { add('ERROR', `${o.id} plan ${p.id}`, `criticalPositionFen does not parse`); continue; }
    // playable line legality + narration coverage
    const pl = p.playableLines?.[0];
    if (!pl) { add('WARN', `${o.id} plan ${p.id}`, `no playableLines[0]`); continue; }
    const startFen = pl.fen ?? p.criticalPositionFen;
    const c = new Chess(startFen);
    let bad: string | undefined;
    for (const m of pl.moves ?? []) { try { c.move(m); } catch { bad = m; break; } }
    if (bad) add('ERROR', `${o.id} plan ${p.id}`, `playable line ILLEGAL at "${bad}" from ${startFen}`);
    const nMoves = (pl.moves ?? []).length;
    const nCues = (pl.learnCues ?? []).length;
    const nAnn = (pl.annotations ?? []).length;
    if (nCues === 0) add('WARN', `${o.id} plan ${p.id}`, `playable line has NO learnCues (short register missing)`);
    if (nAnn === 0) add('WARN', `${o.id} plan ${p.id}`, `playable line has NO annotations (full register missing)`);
    if (nCues && nCues !== nMoves) add('INFO', `${o.id} plan ${p.id}`, `learnCues ${nCues} != moves ${nMoves}`);
  }

  // Continuity: does the main Watch terminus connect to a middlegame plan critical FEN?
  if (main && mgPlans.length > 0) {
    const term = main.beats[main.beats.length - 1].moves ?? [];
    const termFen = (() => { const c = new Chess(); for (const m of term) { try { c.move(m); } catch { break; } } return c.fen(); })();
    const termKey = termFen.split(' ').slice(0, 1).join(' ');
    const connects = mgPlans.some((p) => p.criticalPositionFen.split(' ')[0] === termKey ||
      (p.playableLines?.[0]?.fen ?? '').split(' ')[0] === termKey);
    if (!connects) add('INFO', `${o.id}`, `main Watch terminus FEN not exactly equal to any middlegame plan critical FEN (continuity check — may differ by a few plies)`);
  }

  // Model games
  const games = mgArr.filter((g) => g.openingId === o.id);
  console.log(`  model games: ${games.length}`);
  for (const g of games) {
    const gp = fenAfter(g.pgn);
    if (!gp.legal) add('ERROR', `${o.id} model ${g.id}`, `ILLEGAL pgn at "${gp.badAt}"`);
    if (!g.overview || g.overview.length < 40) add('WARN', `${o.id} model ${g.id}`, `overview <40 chars (would be filtered as un-narrated)`);
    if (g.studentSide && g.studentSide !== o.color) add('INFO', `${o.id} model ${g.id}`, `studentSide ${g.studentSide} != opening color ${o.color}`);
  }

  // Common mistakes / pitfalls
  const cms = cmObj[o.id] ?? [];
  console.log(`  pitfalls (common-mistakes): ${cms.length}`);
  for (const [j, cm] of cms.entries()) {
    let fenOk = true; try { new Chess(cm.fen); } catch { fenOk = false; }
    if (!fenOk) add('ERROR', `${o.id} pitfall#${j}`, `fen does not parse`);
    if (!cm.explanation || cm.explanation.length < 20) add('WARN', `${o.id} pitfall#${j}`, `explanation missing/short`);
    if (!cm.shortNarration || wordCount(cm.shortNarration) > 8) add('WARN', `${o.id} pitfall#${j}`, `shortNarration missing or >8 words`);
  }

  // Trap lines legality (student weapons)
  for (const t of o.trapLines ?? []) {
    const tp = fenAfter(t.pgn);
    if (!tp.legal) add('ERROR', `${o.id} trap "${t.name}"`, `ILLEGAL pgn at "${tp.badAt}"`);
  }
  for (const t of o.warningLines ?? []) {
    const tp = fenAfter(t.pgn);
    if (!tp.legal) add('ERROR', `${o.id} warning "${t.name}"`, `ILLEGAL pgn at "${tp.badAt}"`);
  }
}

console.log(`\n${'='.repeat(78)}\nISSUES (${issues.length})\n${'='.repeat(78)}`);
const order = { ERROR: 0, WARN: 1, INFO: 2 } as const;
issues.sort((a, b) => order[a.sev] - order[b.sev]);
const counts = { ERROR: 0, WARN: 0, INFO: 0 };
for (const it of issues) { counts[it.sev]++; console.log(`[${it.sev}] ${it.where}: ${it.msg}`); }
console.log(`\nSUMMARY: ${counts.ERROR} errors, ${counts.WARN} warnings, ${counts.INFO} info`);
