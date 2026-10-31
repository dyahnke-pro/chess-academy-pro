// THE DANYA BENCH (the build after the wiring map, David 2026-10-30: "I want
// different computers wired in different orders and quickly compared to how
// Danya narrates"). Every note of the voiced corpus sits on a real position
// and explains the move just played. For each one this runs the app's own
// computers and composers on that position and asks one question of each:
// did it say the idea Danya said?
//
//   BUILT — some computer produced the idea (the union of every source).
//   SAID  — a surface's composer kept it (the lesson beat, Review's move
//           inventory and the live composer's candidates are measured here).
//
// ONE TAGGER reads both sides, Danya's note and the coach's sentence, so the
// comparison is symmetric: an idea is a KIND (develop, pin, prevent, the
// alternative, the order, the line, the habit, …) anchored to the squares the
// sentence names, plus the move's own square. A kind whose point is a target
// (an attack, a pin, a break) must name the same square; a general kind
// (develop, castle, the plan) matches on the kind.
//
// Engine reads are cached once by scripts/bench/danya-reads.mjs; this file
// re-scores in minutes. Run:
//   DANYA_BENCH=1 npx vitest run src/services/danyaBench.measure.test.ts
// Optional: DANYA_BENCH_READS=<dir> (default audit-reports/.fixtures/danya-bench),
// DANYA_BENCH_LIMIT=<n> (first n notes with reads), DANYA_BENCH_SOURCES=a,b.
// Writes audit-reports/danya-bench/report.json and prints the tables.
//
// REACH (WO-STORY-MATRIX-01 P1-0): per computer and per surface, how many
// notes it BUILT a fact on, how many of those facts REACHED that surface's
// composer, and how many the composer SAID. DANYA_BENCH_REACH=0 skips it.
import { it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { analysisOf, evalOf, linesOf, moverCost, type EngineRead } from '../test/replayGame';
import { newLessonVoice, BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';
import { computePositionFacts, type PositionFactsResult } from './positionFacts';
import { studentMoveTeaching } from './learnBoardTeaching';
import { buildDeliberation, deliberationFacts, deliberationAlternativesFacts, moveWhy, bestMoveReason } from './deliberation';
import { moveJob, bookMoveWhy, MINE, THEIRS } from './bookMoveWhy';
import { mastersMovesSync, __setLocalDbForTests } from './masterPlayLookup';
import { computeMoveFundamentals } from './moveFundamentals';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { deepFact, theirTarget } from './threeFacts';
import { findProphylaxis, prophylaxisLine } from './prophylaxis';
import { notYet, depthClauses } from './thinkAloud';
import { notYetPlayed } from './notYetPlayed';
import { moveIntent } from './moveIntent';
import { afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './captureRun';
import { NO_SECOND_READ } from './inaccuracyCall';
import { composeThought, type ComposedThought, type ThoughtFact, type ThoughtSource } from './thoughtComposer';
import type { FactKind } from './reviewFacetRank';
import { placeFact } from './coachFact';
import { moveThoughtFacts, lessonThought } from './moveThoughtFacts';
import { NO_PROOF } from './proof';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { classifyCpLoss } from './gameAnalysisService';

/** The bench's own variant: the weighing as a choices-step fact. */
function choiceFact(text: string, fen: string): ThoughtFact {
  return {
    ...placeFact('deliberation', 'student'), computer: 'deliberationAlternativesFacts', source: 'alternatives', idea: 'choice', text: /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`, squares: [], weight: 50, stakes: null,
    proof: NO_PROOF.description, seat: 'student', fen, claims: [`choice:${fen}`],
  };
}
import type { IdeaKind } from './ideaKind';

// ── the corpus and the cached reads ─────────────────────────────────────────

/** A cached engine read: the one shape `src/test/replayGame.ts` reads (the
 *  decision baseline and the short game read the same files the same way). */
type Read = EngineRead;
interface Note {
  id: string; lineSan: string[]; phase: string; studentSide: 'white' | 'black';
  explains: string; teaches: string; plans: string;
}
interface Position {
  note: Note;
  own: boolean;
  mover: 'w' | 'b';
  student: 'w' | 'b';
  fenBefore: string;
  san: string;
  to: string;
  fenAfter: string;
  history: string[];
  theirLast: { fenBefore: string; san: string } | null;
  prev: PrevCaptureContext;
  before: Read[];
  after: Read[];
  /** The engine's best move before, and its best reply after (none when the read is empty). */
  best: Read | undefined;
  reply: Read | undefined;
  /** The game's own moves after this one (the same video's later notes): what
   *  a lesson's line is — the taught continuation — never an engine guess. */
  ahead: string[];
}

const READS = process.env.DANYA_BENCH_READS ?? 'audit-reports/.fixtures/danya-bench';
/** The notes to read: the voiced corpus, or (DANYA_BENCH_NOTES) any file of the
 *  same shape — one game written one note a ply reads every move of that game. */
const NOTES = process.env.DANYA_BENCH_NOTES ?? 'public/data/voiced-teachings.json';
const RUN = process.env.DANYA_BENCH === '1' && existsSync(READS) && existsSync(NOTES);

/** The video a note belongs to (its id is vc-<video>-<n>). */
function videoOf(id: string): string { return id.replace(/^vc-/, '').replace(/-\d+$/, ''); }

/** Each note's continuation: the longest later note of the same video whose
 *  line extends this one. The real lesson reads its taught line ahead
 *  (`line`: the next BRIEFING_LINE_PLIES moves) and Review reads the whole
 *  game; the bench read an engine PV instead, which made every line-reading
 *  computer (the trip, the deep fact) narrate moves nobody played. */
function continuations(notes: readonly Note[]): Map<string, string[]> {
  const byVideo = new Map<string, Note[]>();
  for (const n of notes) {
    const v = videoOf(n.id);
    const list = byVideo.get(v) ?? [];
    list.push(n);
    byVideo.set(v, list);
  }
  const out = new Map<string, string[]>();
  for (const list of byVideo.values()) {
    for (const n of list) {
      let best: string[] | null = null;
      for (const m of list) {
        if (m.lineSan.length <= n.lineSan.length || (best && m.lineSan.length <= best.length)) continue;
        if (n.lineSan.every((san, k) => m.lineSan[k] === san)) best = m.lineSan;
      }
      out.set(n.id, best ? best.slice(n.lineSan.length) : []);
    }
  }
  return out;
}

function loadPositions(): Position[] {
  const notes: Note[] = JSON.parse(readFileSync(NOTES, 'utf8')).notes;
  const byId = new Map(notes.map((n) => [n.id, n]));
  const aheadOf = continuations(notes);
  const reads = new Map<string, { before: Read[]; after: Read[] }>();
  for (const f of readdirSync(READS).filter((x) => /^reads-\d+\.jsonl$/.test(x))) {
    for (const line of readFileSync(`${READS}/${f}`, 'utf8').split('\n')) {
      if (!line) continue;
      let r: { id: string; before?: Read[]; after?: Read[]; skip?: string };
      try { r = JSON.parse(line); } catch { continue; } // a shard still writing its last line
      if (r.before) reads.set(r.id, { before: r.before, after: r.after ?? [] });
    }
  }
  const out: Position[] = [];
  for (const [id, r] of reads) {
    const note = byId.get(id);
    if (!note || note.lineSan.length === 0) continue;
    const c = new Chess();
    let prev: PrevCaptureContext = NO_PREV_CAPTURE;
    let theirLast: Position['theirLast'] = null;
    let fenBefore = c.fen();
    let ok = true;
    for (let k = 0; k < note.lineSan.length; k++) {
      fenBefore = c.fen();
      if (k === note.lineSan.length - 1) break;
      try {
        const mv = c.move(note.lineSan[k]);
        prev = afterCapture(prev, mv);
        if (k === note.lineSan.length - 2) theirLast = { fenBefore, san: mv.san };
      } catch { ok = false; break; }
    }
    if (!ok) continue;
    const san = note.lineSan[note.lineSan.length - 1];
    let mv;
    try { mv = c.move(san); } catch { continue; }
    const mover = mv.color;
    const student: 'w' | 'b' = note.studentSide === 'white' ? 'w' : 'b';
    out.push({
      note, own: mover === student, mover, student, fenBefore, san: mv.san, to: mv.to, fenAfter: c.fen(),
      history: note.lineSan.slice(0, -1), theirLast, prev, before: r.before, after: r.after, best: r.before.at(0), reply: r.after.at(0),
      ahead: aheadOf.get(id) ?? [],
    });
  }
  out.sort((a, b) => a.note.id.localeCompare(b.note.id));
  const every = Math.max(1, Number(process.env.DANYA_BENCH_EVERY ?? 1));
  const offset = Number(process.env.DANYA_BENCH_OFFSET ?? 0) % every;
  const sampled = out.filter((_, k) => k % every === offset);
  const limit = Number(process.env.DANYA_BENCH_LIMIT ?? 0);
  return limit > 0 ? sampled.slice(0, limit) : sampled;
}

// ── reads in the app's shapes ───────────────────────────────────────────────

function sansOf(fen: string, uci: readonly string[], max = BRIEFING_LINE_PLIES): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of uci.slice(0, max)) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return out;
}
/** The line a lesson reads ahead of the move: the taught continuation, the
 *  same BRIEFING_LINE_PLIES the generator passes. */
function lineAhead(p: Position): string[] { return p.ahead.slice(0, BRIEFING_LINE_PLIES); }
function uciOf(fen: string, san: string): string | null {
  try { const m = new Chess(fen).move(san); return m.from + m.to + (m.promotion ?? ''); } catch { return null; }
}
/** Mover-POV cost of the played move, from the two cached reads. */
function costCp(p: Position): number | null {
  return moverCost(p.mover, p.best, p.reply);
}

// ── the one tagger ──────────────────────────────────────────────────────────

type Kind =
  | 'develop' | 'castle' | 'center' | 'space' | 'break' | 'attack' | 'defend' | 'pin' | 'fork' | 'skewer'
  | 'discovered' | 'trade' | 'capture' | 'prevent' | 'prepare' | 'tempo' | 'king-safety' | 'weakness'
  | 'structure' | 'outpost' | 'file' | 'diagonal' | 'activity' | 'plan' | 'alternative' | 'order'
  | 'line' | 'habit' | 'theory' | 'mate' | 'material' | 'endgame' | 'trap' | 'rescue';

const LEXICON: Record<Kind, RegExp> = {
  develop: /\b(develop(s|ed|ing|ment)?|bring(s|ing)? (out|into play))\b/,
  castle: /\b(castl(e|es|ed|ing)|o-o)\b/,
  center: /\b(cent(re|er|ral|res|ers))\b/,
  space: /\b(space|clamp|gain(s|ing)? ground|cramp(s|ed)?)\b/,
  break: /\b(break|strike(s|ing)? at|undermin\w*|lever)\b/,
  attack: /\b(attack(s|ing|ed)?|hit(s|ting)?|pressure|eye(s|ing)?|target(s|ing)?|threat\w*|go(es)? after|aim(s|ed|ing)? at)\b/,
  defend: /\b(defen(d|ds|ded|ding|ce|se|der)|protect\w*|guard\w*|support\w*|shield\w*|cover(s|ed|ing)?)\b/,
  pin: /\b(pin(s|ned|ning)?)\b/,
  fork: /\bfork\w*/,
  skewer: /\bskewer\w*/,
  discovered: /\bdiscover\w*/,
  trade: /\b(trad(e|es|ed|ing)|exchang\w*|swap\w*)\b/,
  capture: /\b(captur\w*|take(s)? (back|on)|recaptur\w*|win(s|ning)? (a|the) (pawn|piece|knight|bishop|rook|queen|exchange)|grab\w*)\b/,
  prevent: /\b(prevent\w*|stop(s|ping)?|deny|denies|denying|take(s)? away|keep(s|ing)? \w+ (\w+ )?(off|out)|prophyla\w*|rule(s)? out|so that \w+ (can't|cannot)|restrain\w*|restrict\w*|blockad\w*)\b/,
  prepare: /\b(prepar\w*|make(s)? room|clear(s|ing)? the way|open(s|ing)? the way|ready to|so that|in order to|paving|set(s|ting)? up)\b/,
  tempo: /\b(tempo|tempi|kick(s|ing)?|chase(s|d)?|gain(s|ing)? (a )?time)\b/,
  'king-safety': /\b(king safety|safe king|exposed|luft|shelter|escape square|attack(ing)? the king|king('s)? (is )?(safe|exposed|stuck))\b/,
  weakness: /\b(weak(ness|nesses|en|ens|ened|ening)?|isolat\w*|doubled|backward|hole(s)?)\b/,
  structure: /\b(pawn structure|pawn chain|structure)\b/,
  outpost: /\boutpost\w*/,
  file: /\b(open file|half-open|semi-open|[a-h]-file|the file)\b/,
  diagonal: /\bdiagonal\w*/,
  activity: /\b(activ(e|ity|ate|ates|ating)|improv(e|es|ing)|rerout\w*|manoeuv\w*|maneuv\w*|redeploy\w*|worst piece|head(s|ing)? (for|to|toward)|on (its|the) way to|by way of|transit|send(s|ing)? the (knight|bishop|rook|queen|king) (on )?to|then (the )?(knight|bishop|rook|queen|king) (to|on to|goes|heads|comes))\b/,
  plan: /\b(plan(s)?|the idea|idea is|aim(s|ing)?|goal|want(s)? to|looking to|intend\w*)\b/,
  alternative: /\b(instead|rather than|would be|too (passive|slow|early|risky|committal)|the problem with|doesn't work|does not work|fails?|failed|why not|not good|wrong)\b/,
  order: /\b(first|before|not yet|move order|only then|after that|premature|too early|wait(s)?)\b/,
  line: /\bif\b[^.]{0,120}(\bthen\b|,)/,
  habit: /\b(always|whenever|never|rule of thumb|principle|remember|habit|ask yourself|get used to|in general|typical(ly)?)\b/,
  theory: /\b(main ?line|theory|theoretical|book|popular|most common|the masters|classical|standard|mainstream)\b/,
  mate: /\b(mate|checkmate|mating)\b/,
  material: /\b(material|pawn up|piece up|up a (pawn|piece)|down a (pawn|piece)|extra pawn|exchange up)\b/,
  endgame: /\b(endgame|ending|promot\w*|passed pawn|passer|opposition|queening)\b/,
  trap: /\btrap(s|ped|ping)?\b/,
  // A RESCUE (Build 5): his "retreats", "steps away", "saves the …" had no kind
  // at all (382 notes), so neither his rescues nor the coach's were seen.
  rescue: /\b(retreat\w*|step(s|ping)? (back|away|out of)|drops? back|goes back|out of (the )?(attack|danger|reach|check)|get(s|ting)? (\w+ )?(\w+ )?out of|escap\w*|sav(e|es|ed|ing) (the|your|their|its|a))\b/,
};
const ALL_KINDS = Object.keys(LEXICON) as Kind[];
/** Kinds whose point is a TARGET: the coach must name the same square. */
const TARGETED: ReadonlySet<Kind> = new Set<Kind>(['break', 'attack', 'defend', 'pin', 'fork', 'skewer', 'discovered', 'capture', 'prevent', 'outpost', 'file', 'diagonal', 'weakness']);
/** Danya's five steps, plus the kinds that support them. */
const STEP_OF: Record<Kind, 'changed' | 'choices' | 'notYet' | 'line' | 'habit' | 'plan' | 'theory'> = {
  develop: 'changed', castle: 'changed', center: 'changed', space: 'changed', break: 'changed', attack: 'changed',
  defend: 'changed', pin: 'changed', fork: 'changed', skewer: 'changed', discovered: 'changed', trade: 'changed',
  capture: 'changed', prevent: 'changed', prepare: 'changed', tempo: 'changed', 'king-safety': 'changed',
  weakness: 'changed', structure: 'changed', outpost: 'changed', file: 'changed', diagonal: 'changed',
  activity: 'changed', mate: 'changed', material: 'changed', endgame: 'changed', trap: 'changed',
  alternative: 'choices', order: 'notYet', line: 'line', habit: 'habit', plan: 'plan', theory: 'theory', rescue: 'changed',
};

interface Idea { kind: Kind; squares: ReadonlySet<string> }

/** The composer's structured idea, in the tagger's kinds — so a fact can be
 *  scored by the idea its producer SAID it states, never by reading its words. */
const IDEA_AS_KINDS: Record<IdeaKind, Kind[]> = {
  mate: ['mate'], 'win-material': ['capture', 'material'], trade: ['trade'], recapture: ['capture', 'trade'],
  rescue: ['defend', 'rescue'], guard: ['defend'], threat: ['attack'], pressure: ['attack'], tactic: ['fork', 'pin', 'skewer', 'discovered', 'attack'],
  check: ['attack'], prevent: ['prevent'], prepare: ['prepare'], unpin: ['pin'], develop: ['develop'], castle: ['castle'],
  'king-safety': ['king-safety', 'castle'], 'attack-king': ['king-safety', 'attack'], center: ['center', 'break'], space: ['space'],
  outpost: ['outpost'], file: ['file'], diagonal: ['diagonal'], 'passed-pawn': ['endgame'], promote: ['endgame'],
  weakness: ['weakness', 'structure'], tempo: ['tempo'], 'king-activity': ['endgame', 'activity'], route: ['activity', 'plan'],
  'set-up': ['prepare', 'line', 'attack'], choice: ['alternative'], order: ['order'],
};
const SQUARE = /\b[a-h][1-8]\b/g;
function sentencesOf(text: string): string[] {
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z…"“])/).map((s) => s.trim()).filter(Boolean);
}
/** Every idea in a text, per sentence: the kinds it names, anchored to the
 *  squares it names (a sentence that names none is about the move itself). */
function ideasOf(text: string, moveTo: string): Idea[] {
  const out: Idea[] = [];
  for (const s of sentencesOf(text)) {
    const low = s.toLowerCase();
    const named = new Set(low.match(SQUARE) ?? []);
    const squares = named.size > 0 ? named : new Set([moveTo]);
    const sanMoves = (s.match(/\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])/g) ?? []).length;
    for (const k of ALL_KINDS) {
      if (LEXICON[k].test(low)) out.push({ kind: k, squares });
    }
    if (sanMoves >= 2 && !out.some((i) => i.kind === 'line')) out.push({ kind: 'line', squares });
  }
  return out;
}
/** Danya's ideas, each counted once a note: a general kind once, a targeted
 *  kind once per square set. */
function distinctIdeas(ideas: readonly Idea[]): Idea[] {
  const seen = new Set<string>();
  const out: Idea[] = [];
  for (const i of ideas) {
    const key = TARGETED.has(i.kind) ? `${i.kind}:${[...i.squares].sort().join(',')}` : i.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}
function covers(coach: readonly Idea[], d: Idea): boolean {
  return coach.some((c) => c.kind === d.kind && (!TARGETED.has(d.kind) || [...d.squares].some((s) => c.squares.has(s))));
}
function words(text: string): number { return text.trim() ? text.trim().split(/\s+/).length : 0; }

// ── the sources: each returns what it would say on this position ───────────

type SourceId =
  | 'lesson' | 'reviewInventory' | 'liveCandidates' | 'studentMove' | 'deliberation' | 'moveJob'
  | 'fundamentals' | 'boardTeacher' | 'moveWhy' | 'bestMoveReason' | 'moveIntent' | 'deepFact'
  | 'theirTarget' | 'prophylaxis' | 'notYet' | 'notYetPlayed' | 'speedRun' | 'alternatives' | 'bookDeparture' | 'thought'
  | 'review';

/** Which sources are a SURFACE'S COMPOSER (what the student hears there) —
 *  every other source is a computer whose output only counts toward BUILT. */
const COMPOSER: Partial<Record<SourceId, string>> = {
  lesson: 'Lessons (the beat a lesson speaks with no note)',
  thought: 'The one composer (WO-ONE-COACH-01), lesson register',
  reviewInventory: 'Review (every facet the walk computes for the move)',
  review: 'Review (the walk\'s own line for the move, before the engine projections)',
  liveCandidates: 'Live composer (every clause before the door)',
};

/** One computation per note, read by both a source and REACH: each composer's
 *  input and output, kept with their labels (REACH reads the labels, a
 *  source the words). */
function once<T>(fn: (p: Position) => T): (p: Position) => T {
  const memo = new WeakMap<Position, T>();
  return (p) => {
    if (!memo.has(p)) memo.set(p, fn(p));
    return memo.get(p) as T;
  };
}

/** THE ONE COMPOSER on the lesson's inputs: the move's facts, plus the
 *  weighing the lesson computes for the student's own moves. */
const lessonPick = once((p: Position): { facts: ThoughtFact[]; composed: ComposedThought } => {
  const facts = moveThoughtFacts({
    fenBefore: p.fenBefore, san: p.san, moverIsStudent: p.own, prev: p.prev,
    line: lineAhead(p), theirLast: p.theirLast, phrases: null,
  });
  if (p.own) {
    const d = buildDeliberation({ analysis: { topLines: linesOf(p.before) }, fenBefore: p.fenBefore, moverColor: p.mover, excludeSan: p.san, opponentLastSan: p.theirLast?.san ?? null });
    const alt = d ? deliberationAlternativesFacts(d) : '';
    if (alt) facts.push(choiceFact(alt, p.fenBefore));
  }
  return { facts, composed: composeThought(facts, 'lesson', { keys: new Set<string>() }) };
});

/** Review's own line for the move, with its `[tag]`s: the walk's segment
 *  builder over the note's line (the one door, the habit closing the turn),
 *  graded from the two cached reads; the earlier moves carry no reads and
 *  speak by need. The whole known game is walked (Review reads the game's own
 *  moves ahead of a ply); the note's move carries the two cached reads. */
const reviewNarration = once((p: Position): string | null => {
  const noteIdx = p.note.lineSan.length - 1;
  const sans: string[] = [];
  const legal = new Chess();
  for (const san of [...p.note.lineSan, ...p.ahead]) {
    try { sans.push(legal.move(san).san); } catch { break; }
  }
  const board = new Chess();
  const cost = costCp(p);
  const inputs: ReviewMoveInput[] = sans.map((san, k) => {
    const mv = board.move(san);
    const last = k === noteIdx;
    return {
      ply: k + 1, san: mv.san, isCoachMove: false,
      classification: last && cost !== null ? classifyCpLoss(cost, p.best ? evalOf(p.best) : null, p.reply ? evalOf(p.reply) : null, p.mover === 'w', false, p.fenBefore, p.san) : null,
      evaluation: last && p.reply ? evalOf(p.reply) : null,
      preMoveEval: last && p.best ? evalOf(p.best) : null,
      bestMove: last ? p.best?.uci ?? null : null,
      fenAfter: board.fen(),
      ...(last && cost !== null ? { costCp: cost } : {}),
    };
  });
  const segs = buildReviewSegmentsForTests(inputs, p.student === 'w' ? 'white' : 'black', null, true, 1500);
  return segs.find((seg) => seg.ply === noteIdx + 1)?.narration ?? null;
});

/** Every facet Review computes for the move, `[tag]` first. */
const reviewFacets = once((p: Position): string[] => {
  const best = p.best;
  const bestSan = best ? sansOf(p.fenBefore, [best.uci], 1).at(0) ?? null : null;
  const replySan = p.reply ? sansOf(p.fenAfter, [p.reply.uci], 1).at(0) ?? null : null;
  const playedUci = uciOf(p.fenBefore, p.san);
  return computeMoveFacets({
    fenBefore: p.fenBefore, fenAfter: p.fenAfter, san: p.san, ply: p.history.length,
    moverColor: p.mover === 'w' ? 'white' : 'black', playerColor: p.student === 'w' ? 'white' : 'black',
    studentColorWB: p.student, evaluation: p.reply ? evalOf(p.reply) : null,
    preMoveEval: best ? evalOf(best) : null, costCp: costCp(p), heardVerdict: null, classification: null,
    bestMoveSan: bestSan, bestLineUci: best?.pv ?? [], playedLineUci: playedUci ? [playedUci, ...(p.reply?.pv ?? [])] : [],
    secondReads: NO_SECOND_READ, replyBestSan: replySan, replyEvaluation: p.reply ? evalOf(p.reply) : null,
    prevCap: p.prev, allSans: [...p.note.lineSan, ...p.ahead], forcedRunStartPly: null, seenFundamentals: new Set(),
    teaching: NO_TEACHING_CONTEXT,
  });
});

/** The live composer on the board after the move, asked (chat's posture):
 *  its candidates are every clause before the door, its clauses what spoke. */
const liveRead = once((p: Position): Promise<PositionFactsResult> => {
  const cost = costCp(p);
  return computePositionFacts({
    boardComputers: 'composer', posture: 'asked', fen: p.fenAfter, history: [...p.note.lineSan],
    moverColor: p.mover === 'w' ? 'b' : 'w', studentColor: p.student, analysis: analysisOf(p.after),
    cpLossCp: p.own ? cost : null,
    lastMove: p.own ? { fenBefore: p.fenBefore, san: p.san, cpLoss: cost, historySans: p.history, reads: null } : undefined,
    opponentLastMove: p.own ? undefined : { fenBefore: p.fenBefore, san: p.san },
  });
});

const TAG = /\[([a-z0-9-]+)\]/gi;
const tagsOf = (text: string | null): string[] => [...(text ?? '').matchAll(TAG)].map((m) => m[1].toLowerCase());

const SOURCES: Record<SourceId, (p: Position) => string | string[] | null | Promise<string | string[] | null>> = {
  lesson: (p) => lessonThought({
    fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: p.own,
    line: lineAhead(p), theirLast: p.theirLast,
  }, newLessonVoice()),
  thought: (p) => lessonPick(p).composed.spoken,
  review: (p) => reviewNarration(p)?.replace(/\[[a-z0-9-]+\]\s*/gi, '') || null,
  reviewInventory: (p) => reviewFacets(p).map((f) => f.replace(/^\[[^\]]+\]\s*/, '')),
  liveCandidates: async (p) => (await liveRead(p)).candidates.map((c) => c.text),
  studentMove: (p) => {
    if (!p.own) return null;
    const best = p.best;
    return studentMoveTeaching({
      fenBefore: p.fenBefore, san: p.san, history: p.history, cpLoss: costCp(p), bothCp: true,
      bestSan: best ? sansOf(p.fenBefore, [best.uci], 1).at(0) ?? null : null,
      bestLine: linesOf(p.before)[0], reply: p.reply ? sansOf(p.fenAfter, [p.reply.uci], 1).at(0) ?? null : null,
      cpAfter: p.reply ? evalOf(p.reply) : null, topLines: linesOf(p.before),
    }).map((h) => h.text);
  },
  deliberation: (p) => {
    const d = buildDeliberation({ analysis: { topLines: linesOf(p.before) }, fenBefore: p.fenBefore, moverColor: p.mover, opponentLastSan: p.theirLast?.san ?? null });
    return d ? deliberationFacts(d, new Set()) : null;
  },
  moveJob: (p) => moveJob(p.fenBefore, p.san, p.mover, p.own ? MINE : THEIRS)?.clause ?? null,
  fundamentals: (p) => computeMoveFundamentals(p.fenBefore, p.san, p.mover === 'w' ? 'white' : 'black').map((f) => f.selfContained),
  boardTeacher: (p) => buildReviewMoveTeaching(p.fenBefore, p.san, p.own),
  moveWhy: (p) => moveWhy(p.fenBefore, p.san, p.mover, p.theirLast?.san ?? null),
  bestMoveReason: (p) => {
    const best = p.best;
    if (!best || uciOf(p.fenBefore, p.san) !== best.uci) return null;
    return bestMoveReason(p.fenBefore, p.san, p.mover, { mateIn: best.mate !== null ? Math.abs(best.mate) : null, opponentLastSan: p.theirLast?.san ?? null });
  },
  // The null-move passes are not cached yet, so this reads only what the
  // two real reads can prove (prevents/prepares that need a pass stay quiet).
  moveIntent: (p) => moveIntent(p.fenBefore, p.san,
    { before: linesOf(p.before), passBefore: [], after: linesOf(p.after), passAfter: [] },
    p.own ? 'student' : 'opponent')?.text ?? null,
  deepFact: (p) => deepFact(p.fenBefore, p.san, lineAhead(p), p.own)?.text ?? null,
  theirTarget: (p) => theirTarget(p.theirLast, p.own)?.text ?? null,
  prophylaxis: (p) => {
    const ph = findProphylaxis(p.fenBefore);
    return ph && ph.prevention.san.replace(/[+#]$/, '') === p.san.replace(/[+#]$/, '') ? prophylaxisLine(ph) : null;
  },
  notYet: (p) => {
    const best = p.best;
    const bestSan = best ? sansOf(p.fenBefore, [best.uci], 1).at(0) : undefined;
    if (!best || !bestSan) return null;
    return notYet(p.fenBefore, { san: bestSan, pv: best.pv, cp: evalOf(best) * (p.mover === 'w' ? 1 : -1) })?.text ?? null;
  },
  // Every alternative the weighing would rule out, with its reason, whether or
  // not the position is a real fork (the composer gates that; BUILT should not).
  alternatives: (p) => {
    const d = buildDeliberation({ analysis: { topLines: linesOf(p.before) }, fenBefore: p.fenBefore, moverColor: p.mover, opponentLastSan: p.theirLast?.san ?? null });
    return d ? deliberationAlternativesFacts(d) : null;
  },
  // The masters' main move here and what the played move left undone, when
  // the move left the book (bookMoveWhy reads the job of the main move).
  bookDeparture: (p) => {
    const masters = mastersMovesSync(p.fenBefore);
    if (!masters || masters.length === 0) return null;
    const main = [...masters].sort((a, b) => b.games - a.games)[0];
    return bookMoveWhy(p.fenBefore, main.san, p.san, p.student)?.text ?? null;
  },
  notYetPlayed: (p) => {
    const best = p.best;
    const bestSan = best ? sansOf(p.fenBefore, [best.uci], 1).at(0) ?? null : null;
    return notYetPlayed(p.fenBefore, p.san, bestSan, costCp(p) ?? 999)?.text ?? null;
  },
  speedRun: (p) => depthClauses({
    fen: p.fenAfter, history: [...p.note.lineSan],
    topLines: linesOf(p.after).map((l) => ({ moves: l.moves, evaluation: l.evaluation, mate: l.mate })),
    studentColor: p.student, nameMove: true,
    lastStudentMove: p.own ? { fenBefore: p.fenBefore, san: p.san } : undefined,
    lastOpponentMove: p.own ? undefined : { fenBefore: p.fenBefore, san: p.san },
  }).map((c) => c.text),
};

// ── REACH: which computer's fact reached which composer ─────────────────────
//
// WO-STORY-MATRIX-01 P1-0 (David 2026-10-30: "All of this is built! Why is it
// not wired in?"). The static map (scripts/computer-reach.mjs) says which
// computer CAN reach a surface; this says which DID, note by note:
//   BUILT   — the computer produced a fact on the note;
//   REACHED — that fact is in the surface's composer input (lesson: the one
//             composer's facts; review: the facets the walk computes, and what
//             it said; chat: the live composer's candidates);
//   SAID    — the composer kept it.
// Facts do not yet say which computer made them, so THE PROVENANCE MAP below
// reads it off the label each surface tags a fact with — temporary: P1-3 puts
// a `computer` on every fact and this map is deleted. The keys are the reach
// inventory's (`file#fn`, scripts/computer-reach/computers.json) wherever the
// producer has a row there; a producer the inventory never listed is named
// by its own function, and the table marks it (†) — the inventory's gap.
// Learn's door is assembled in CoachTeachPage, out of the bench's reach: its
// reach is read off the `learn-turn-decision` rows of the Learn audit.

/** The ThoughtFact sources (lesson, and Review's move line) → computer. */
const THOUGHT_COMPUTER: Record<ThoughtSource, string> = {
  moveWhy: 'services/deliberation.ts#moveWhy',
  briefing: 'services/reviewMoveBriefing.ts#buildReviewMoveBriefing',
  boardTeacher: 'services/reviewMoveTeaching.ts#buildReviewMoveTeachingFact',
  moveJob: 'services/bookMoveWhy.ts#moveJob',
  fundamental: 'services/moveFundamentals.ts#computeMoveFundamentals',
  deepFact: 'services/threeFacts.ts#deepFact',
  binding: 'services/threeFacts.ts#binding',
  pieceRoute: 'services/pieceRoute.ts#pieceRoute',
  refuted: 'services/refutedAlternative.ts#refutedAlternative',
  alternatives: 'services/deliberation.ts#buildDeliberation',
  prophylaxis: 'services/prophylaxis.ts#findProphylaxis',
  notYet: 'services/inBetweenMove.ts#inBetweenMove',
};

/** Review's facet tags and the live composer's clause kinds (ONE vocabulary,
 *  `FactKind`) → the computer that writes them. Where one label has two
 *  producers, the one that writes it most is named. */
const FACT_COMPUTER: Record<FactKind, string> = {
  move: 'services/pvPlayback.ts#computePlyFacts',
  quality: 'services/reviewFullData.ts#correctionAgainstHeard',
  principle: 'services/principleVoice.ts#(module)',
  how: 'services/principleVoice.ts#(module)',
  eval: 'services/reviewFullData.ts#computeMoveFacets',
  delta: 'services/boardDelta.ts#(module)',
  does: 'services/reviewFullData.ts#describeMoveInfluence',
  tactic: 'services/tacticsDetector.ts#detectTactics',
  threat: 'services/groundedAnswer.ts#detectNewThreat',
  loose: 'services/threatProof.ts#provenThreatLine',
  count: 'services/reviewTeachingPoints.ts#attackerDefenderCount',
  royal: 'services/reviewTeachingPoints.ts#royalDefenderTarget',
  trapped: 'services/reviewTeachingPoints.ts#trappedOnBoard',
  sac: 'services/reviewSacrifice.ts#(module)',
  'sac-why': 'services/reviewForcedSequence.ts#(module)',
  forced: 'services/reviewForcedSequence.ts#(module)',
  king: 'services/reviewSacrifice.ts#(module)',
  rook7: 'services/reviewTeachingPoints.ts#rookOnSeventh',
  passer: 'services/reviewTeachingPoints.ts#passedPawnPush',
  badbishop: 'services/reviewTeachingPoints.ts#badEnemyBishop',
  worst: 'services/reviewTeachingPoints.ts#worstPlacedFriendlyPiece',
  minority: 'services/positionReadingService.ts#findMinorityAttack',
  complex: 'services/positionReadingService.ts#findColorComplexWeakness',
  structure: 'services/boardStructure.ts#describeStructure',
  verdict: 'services/reviewPositionalAssessment.ts#assessPositionalEdge',
  opening: 'services/mastersPlanRead.ts#mastersPlanLine',
  // The opening's story names each beat's kind (P1-4); the priority before
  // the move is one kind on every surface.
  'opening-cost': 'services/openingStory.ts#openingStoryAt',
  'opening-theirs': 'services/openingStory.ts#openingStoryAt',
  'opening-story': 'services/openingStory.ts#openingStoryAt',
  'opening-fork': 'services/openingStory.ts#openingStoryAt',
  priority: 'services/playCommentary.ts#buildPriorityFirst',
  'opp-dev': 'services/reviewOpponentCommentary.ts#(module)',
  'their-habit': 'services/thinkAloud.ts#opponentHabits',
  'your-habit': 'services/thinkAloud.ts#habitsOf',
  held: 'services/coachFeatureService.ts#generateReviewNarration',
  'last-here': 'services/lastTimeHere.ts#lastTimeHere',
  'opp-target': 'services/reviewOpponentCommentary.ts#(module)',
  endgame: 'services/reviewMoveTeaching.ts#nameEndgamePhase',
  'plan-now': 'services/nextPlans.ts#deriveNextPlans',
  'plan-race': 'services/planRace.ts#detectPlanRace',
  'plan-arc': 'services/lookaheadPlan.ts#gameArcs',
  'plan-opening': 'services/reviewStrategicOrientation.ts#buildOpeningDevelopmentPlan',
  'plan-middlegame': 'services/reviewStrategicOrientation.ts#buildMiddlegameOrientation',
  'plan-line': 'services/pvPlayback.ts#computePvLine',
  consequence: 'services/pvPlayback.ts#computePvLine',
  note: 'services/coachFeatureService.ts#generateReviewNarration',
  method: 'services/methodBeat.ts#methodBeatFor',
  refuted: 'services/refutedAlternative.ts#refutedAlternative',
  bluff: 'services/bluffDetector.ts#detectBluff',
  technique: 'services/conversionMethod.ts#readConversion',
  contrast: 'services/moveContrast.ts#(module)',
  timing: 'services/moveTiming.ts#readTiming',
  praise: 'services/coachFeatureService.ts#generateReviewNarration',
  rule: 'services/moveFundamentals.ts#principleLine',
  stopped: 'services/opponentMovePurpose.ts#threatStoppedBy',
  stock: 'services/reviewPositionalAssessment.ts#phaseVerdictLine',
  trade: 'services/tradeQuality.ts#(module)',
  point: 'services/playCommentary.ts#studentMovePoint',
  'their-cost': 'services/theirMoveCost.ts#theirMoveCost',
  'king-read': 'services/kingAttackReads.ts#kingAttackReads',
  'trade-idea': 'services/exchangeIdeas.ts#(module)',
  'defence-idea': 'services/exchangeIdeas.ts#(module)',
  nugget: 'services/exchangeIdeas.ts#(module)',
  equivalence: 'services/openingEquivalence.ts#openingEquivalence',
  'capture-choice': 'services/captureChoice.ts#(module)',
  kick: 'services/kickMap.ts#kickOn',
  'their-read': 'services/opponentMoveReads.ts#readTheirMove',
  'prevent-test': 'services/opponentMovePurpose.ts#playItAnyway',
  'game-end': 'services/gameEndReads.ts#(module)',
  murky: 'services/reviewPositionalAssessment.ts#assessPositionalEdge',
  'attack-pattern': 'services/attackLibrary.ts#knownAttack',
  judgement: 'services/structureReads.ts#studentMoveStructure',
  // Review's move line is the one composer over the move's facts: which of
  // them spoke is not on the facet (P1-3 puts it there).
  'move-job': 'services/thoughtComposer.ts#composeThought',
  status: 'services/positionFacts.ts#computePositionFacts',
  deliberation: 'services/deliberation.ts#deliberationFacts',
  'latent-danger': 'services/latentDanger.ts#detectLatentDanger',
  'latent-chance': 'services/latentDanger.ts#detectLatentDanger',
  'must-defend': 'services/threatOut.ts#computeMustDefend',
  'key-moment': 'services/criticalMoment.ts#readCriticalMoment',
  'opponent-intent': 'services/opponentIntent.ts#buildOpponentIntent',
  'student-leans': 'services/opponentIntent.ts#buildOpponentIntent',
  'opponent-leans': 'services/opponentIntent.ts#buildOpponentIntent',
  fundamental: 'services/moveFundamentals.ts#strategicReason',
  'structure-plan': 'services/boardPlanFacts.ts#boardPlanFacts',
  convert: 'services/conversionMethod.ts#readConversion',
  concept: 'services/conceptEngine.ts#conceptForBoard',
  'not-yet': 'services/thinkAloud.ts#notYet',
  line: 'services/thinkAloud.ts#lineAchieves',
  'stop-flaw': 'services/thinkAloud.ts#obviousStopFlaw',
  'hole-access': 'services/moveInsight.ts#holeAccess',
  'speedrun-read': 'services/thinkAloud.ts#depthClauses',
};

/** The bench's own computer sources → the computer each one runs (the
 *  composer sources are surfaces, not computers). */
type ComputerSourceId = Exclude<SourceId, 'lesson' | 'thought' | 'review' | 'reviewInventory' | 'liveCandidates'>;
const SOURCE_COMPUTER: Record<ComputerSourceId, string> = {
  studentMove: 'services/learnBoardTeaching.ts#studentMoveTeaching',
  deliberation: 'services/deliberation.ts#buildDeliberation',
  moveJob: 'services/bookMoveWhy.ts#moveJob',
  fundamentals: 'services/moveFundamentals.ts#computeMoveFundamentals',
  boardTeacher: 'services/reviewMoveTeaching.ts#buildReviewMoveTeachingFact',
  moveWhy: 'services/deliberation.ts#moveWhy',
  bestMoveReason: 'services/deliberation.ts#bestMoveReason',
  moveIntent: 'services/moveIntent.ts#moveIntent',
  deepFact: 'services/threeFacts.ts#deepFact',
  theirTarget: 'services/threeFacts.ts#theirTarget',
  prophylaxis: 'services/prophylaxis.ts#findProphylaxis',
  notYet: 'services/thinkAloud.ts#notYet',
  notYetPlayed: 'services/notYetPlayed.ts#notYetPlayed',
  speedRun: 'services/thinkAloud.ts#depthClauses',
  alternatives: 'services/deliberation.ts#buildDeliberation',
  bookDeparture: 'services/bookMoveWhy.ts#bookMoveWhy',
};
const isComputerSource = (id: SourceId): id is ComputerSourceId => id in SOURCE_COMPUTER;

type ReachSurface = 'lesson' | 'review' | 'chat';
const REACH_SURFACES: readonly ReachSurface[] = ['lesson', 'review', 'chat'];
interface ReachTally { built: number; reached: Record<ReachSurface, number>; said: Record<ReachSurface, number> }
/** A fact label a surface never declared — counted, so a new label is seen. */
const unmapped = (label: string): string => `(unmapped label: ${label})`;
const factComputer = (label: string): string => (label in FACT_COMPUTER ? FACT_COMPUTER[label as FactKind] : unmapped(label));

/** One note's reach: per surface, the computers whose facts reached the
 *  composer and the ones it said. */
async function reachOf(p: Position): Promise<Record<ReachSurface, { reached: Set<string>; said: Set<string> }>> {
  const lesson = lessonPick(p);
  const narration = reviewNarration(p);
  const said = new Set(tagsOf(narration).map(factComputer));
  const live = await liveRead(p);
  return {
    lesson: {
      reached: new Set(lesson.facts.map((f) => THOUGHT_COMPUTER[f.source])),
      said: new Set(lesson.composed.kept.map((f) => THOUGHT_COMPUTER[f.source])),
    },
    // A facet the walk said reached it, even where the standalone facet read
    // (which lacks the walk's game context) did not compute it.
    review: { reached: new Set([...reviewFacets(p).flatMap((f) => tagsOf(f.slice(0, f.indexOf(']') + 1))).map(factComputer), ...said]), said },
    chat: {
      reached: new Set([...live.candidates, ...live.clauses].map((c) => factComputer(c.kind))),
      said: new Set(live.clauses.map((c) => factComputer(c.kind))),
    },
  };
}

/** The reach inventory's computer keys, to mark a producer it never listed. */
function inventoryKeys(): Set<string> {
  const rows = JSON.parse(readFileSync('scripts/computer-reach/computers.json', 'utf8')) as Array<{ file: string; fn: string }>;
  return new Set(rows.map((r) => `${r.file}#${r.fn}`));
}

// ── scoring ─────────────────────────────────────────────────────────────────

// ── the composer variants ───────────────────────────────────────────────────

interface KeptSentence { source: SourceId; text: string; ideas: Idea[] }
interface KeptNote { video: string; danya: Idea[]; sentences: KeptSentence[] }
type ThoughtStep = 'changed' | 'choices' | 'notYet' | 'line' | 'habit' | 'plan' | 'theory';
/** Danya's order (THE HEART: what changed, the choices, not yet, the line,
 *  the habit), with the plan and the theory he weaves in after them. */
const THOUGHT_STEPS: ThoughtStep[] = ['changed', 'choices', 'notYet', 'line', 'habit', 'plan', 'theory'];
const stepsOf = (s: KeptSentence): Set<ThoughtStep> => new Set(s.ideas.map((i) => STEP_OF[i.kind]));
/** A deterministic half of his videos: the priorities are learned on one half
 *  and scored on the other, so a variant cannot win by memorising notes. */
function trainHalf(video: string): boolean {
  let h = 0;
  for (const ch of video) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0;
}

interface VariantResult { name: string; any: string; lead: string; words: number; steps: Partial<Record<ThoughtStep, string>> }

/** One thought from the kept sentences: for each step in `order`, the first
 *  sentence (by source priority for that step) that adds an idea not yet said,
 *  up to `perStep` sentences a step, until `budget` words. */
function compose(note: KeptNote, order: readonly ThoughtStep[], priority: Record<ThoughtStep, SourceId[]>, perStep: number, budget: number): KeptSentence[] {
  const out: KeptSentence[] = [];
  const said = new Set<string>();
  const key = (i: Idea): string => `${i.kind}:${[...i.squares].sort().join(',')}`;
  let used = 0;
  for (const st of order) {
    let taken = 0;
    for (const src of priority[st]) {
      for (const s of note.sentences) {
        if (taken >= perStep || used >= budget) break;
        if (s.source !== src || !stepsOf(s).has(st)) continue;
        if (!s.ideas.some((i) => !said.has(key(i)))) continue;
        out.push(s);
        for (const i of s.ideas) said.add(key(i));
        used += words(s.text);
        taken += 1;
      }
    }
  }
  return out;
}

function scoreVariant(name: string, notes: readonly KeptNote[], pick: (n: KeptNote) => KeptSentence[]): VariantResult {
  const any: Tally = { danya: 0, covered: 0 };
  const lead: Tally = { danya: 0, covered: 0 };
  const steps = new Map<string, Tally>();
  let w = 0;
  let n = 0;
  for (const note of notes) {
    if (note.danya.length === 0) continue;
    const chosen = pick(note);
    const ideas = chosen.flatMap((s) => s.ideas);
    any.danya += 1; if (note.danya.some((d) => covers(ideas, d))) any.covered += 1;
    lead.danya += 1; if (covers(ideas, note.danya[0])) lead.covered += 1;
    const seen = new Map<string, boolean>();
    for (const d of note.danya) seen.set(STEP_OF[d.kind], (seen.get(STEP_OF[d.kind]) ?? false) || covers(ideas, d));
    for (const [st, c] of seen) bump(steps, st, c);
    w += chosen.reduce((a, s) => a + words(s.text), 0);
    n += 1;
  }
  return { name, any: pct(any), lead: pct(lead), words: Math.round(w / Math.max(1, n)), steps: Object.fromEntries(THOUGHT_STEPS.map((st) => [st, pct(steps.get(st))])) };
}

function composerVariants(kept: readonly KeptNote[], ids: readonly SourceId[]): VariantResult[] {
  const train = kept.filter((k) => trainHalf(k.video));
  const test = kept.filter((k) => !trainHalf(k.video));
  // PRIORITY PER STEP, LEARNED: a source's sentences of that step, how often
  // they carry an idea Danya said there (precision), on the training half.
  const prec = (st: ThoughtStep): SourceId[] => {
    const hit = new Map<SourceId, number>();
    const tot = new Map<SourceId, number>();
    for (const note of train) {
      for (const s of note.sentences) {
        if (!stepsOf(s).has(st)) continue;
        tot.set(s.source, (tot.get(s.source) ?? 0) + 1);
        if (note.danya.some((d) => STEP_OF[d.kind] === st && covers(s.ideas, d))) hit.set(s.source, (hit.get(s.source) ?? 0) + 1);
      }
    }
    return [...ids].filter((id) => (tot.get(id) ?? 0) >= 5)
      .sort((a, b) => (hit.get(b) ?? 0) / (tot.get(b) ?? 1) - (hit.get(a) ?? 0) / (tot.get(a) ?? 1));
  };
  const learned = Object.fromEntries(THOUGHT_STEPS.map((st) => [st, prec(st)])) as Record<ThoughtStep, SourceId[]>;
  const fixed = Object.fromEntries(THOUGHT_STEPS.map((st) => [st, [...ids]])) as Record<ThoughtStep, SourceId[]>;
  const valueOrder: ThoughtStep[] = ['line', 'choices', 'changed', 'notYet', 'plan', 'theory', 'habit'];
  const results: VariantResult[] = [
    scoreVariant('today: lesson beat', test, (n) => n.sentences.filter((s) => s.source === 'lesson')),
    scoreVariant('today: Review pool (all of it)', test, (n) => n.sentences.filter((s) => s.source === 'reviewInventory' || s.source === 'moveJob' || s.source === 'studentMove')),
    scoreVariant('everything built (upper bound)', test, (n) => n.sentences),
  ];
  for (const [budget, label] of [[30, 'Learn length'], [80, 'Review length']] as const) {
    results.push(scoreVariant(`his order · learned sources · 1 a step · ${label}`, test, (n) => compose(n, THOUGHT_STEPS, learned, 1, budget)));
    results.push(scoreVariant(`his order · learned sources · 2 a step · ${label}`, test, (n) => compose(n, THOUGHT_STEPS, learned, 2, budget)));
    results.push(scoreVariant(`his order · sources as listed · 1 a step · ${label}`, test, (n) => compose(n, THOUGHT_STEPS, fixed, 1, budget)));
    results.push(scoreVariant(`value order · learned sources · 1 a step · ${label}`, test, (n) => compose(n, valueOrder, learned, 1, budget)));
  }
  console.log('learned source order per step: ' + THOUGHT_STEPS.map((st) => `${st}=[${learned[st].slice(0, 4).join(',')}]`).join(' '));
  return results;
}

interface Tally { danya: number; covered: number }
function bump(m: Map<string, Tally>, k: string, covered: boolean): void {
  const t = m.get(k) ?? { danya: 0, covered: 0 };
  t.danya += 1;
  if (covered) t.covered += 1;
  m.set(k, t);
}
const pct = (t: Tally | undefined): string => (t && t.danya ? `${Math.round((100 * t.covered) / t.danya)}%` : '–');

it.runIf(RUN)('Danya bench: built vs said, per idea and per source', async () => {
  // The books the app loads over the network, from disk.
  __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')));
  const positions = loadPositions();
  expect(positions.length).toBeGreaterThan(0);
  const only = (process.env.DANYA_BENCH_SOURCES ?? '').split(',').filter(Boolean) as SourceId[];
  const ids = (only.length ? only : Object.keys(SOURCES)) as SourceId[];

  const byKind = new Map<string, Map<string, Tally>>();   // source → kind → tally
  const byStep = new Map<string, Map<string, Tally>>();   // source → step → tally
  const noteHit = new Map<string, Tally>();                // source → notes with ≥1 idea covered
  const lead = new Map<string, Tally>();                   // source → note's FIRST idea covered
  const wordStats = new Map<string, { n: number; words: number; empty: number; errors: number }>();
  const examples: Array<{ id: string; danya: string; said: Record<string, string> }> = [];
  // DANYA_BENCH_MISSES=<kind,…> keeps every note where he states one of those
  // ideas and the lesson does not — the gap read note by note, never guessed.
  const missKinds = new Set((process.env.DANYA_BENCH_MISSES ?? '').split(',').filter(Boolean));
  const misses: Array<{ id: string; kind: string; own: boolean; san: string; fen: string; danya: string; lesson: string }> = [];
  const kept: KeptNote[] = [];
  const factValues = new Map<string, { n: number; hits: number; lead: number }>();
  const dump: string[] | null = process.env.DANYA_BENCH_DUMP ? [] : null;
  const reachOn = process.env.DANYA_BENCH_REACH !== '0';
  const reach = new Map<string, ReachTally>();
  const tally = (c: string): ReachTally => {
    let t = reach.get(c);
    if (!t) { t = { built: 0, reached: { lesson: 0, review: 0, chat: 0 }, said: { lesson: 0, review: 0, chat: 0 } }; reach.set(c, t); }
    return t;
  };
  let danyaWords = 0;
  const started = Date.now();

  for (const [n, p] of positions.entries()) {
    const danyaText = [p.note.explains, p.note.teaches, p.note.plans].filter(Boolean).join(' ');
    danyaWords += words(p.note.explains);
    const d = distinctIdeas(ideasOf(danyaText, p.to));
    const said: Record<string, string> = {};
    const ideasBy = new Map<string, Idea[]>();
    for (const id of ids) {
      const ws = wordStats.get(id) ?? { n: 0, words: 0, empty: 0, errors: 0 };
      let text = '';
      try {
        const r = await SOURCES[id](p);
        text = Array.isArray(r) ? r.filter(Boolean).join(' ') : (r ?? '');
      } catch { ws.errors += 1; }
      ws.n += 1;
      if (text.trim()) ws.words += words(text); else ws.empty += 1;
      wordStats.set(id, ws);
      said[id] = text;
      ideasBy.set(id, ideasOf(text, p.to));
    }
    const builtIdeas = [...ideasBy.values()].flat();
    ideasBy.set('BUILT', builtIdeas);
    // Review's per-move pool: the walk's facets plus the two lanes it adds
    // beside them (the move's job, the student-move hints).
    ideasBy.set('REVIEW_POOL', ['reviewInventory', 'moveJob', 'studentMove'].flatMap((k) => ideasBy.get(k) ?? []));
    for (const [src, ideas] of ideasBy) {
      const kinds = byKind.get(src) ?? new Map<string, Tally>();
      const steps = byStep.get(src) ?? new Map<string, Tally>();
      const seenStep = new Map<string, boolean>();
      for (const di of d) {
        const c = covers(ideas, di);
        bump(kinds, di.kind, c);
        const st = STEP_OF[di.kind];
        seenStep.set(st, (seenStep.get(st) ?? false) || c);
      }
      for (const [st, c] of seenStep) bump(steps, st, c);
      byKind.set(src, kinds);
      byStep.set(src, steps);
      if (d.length > 0) {
        bump(noteHit, src, d.some((di) => covers(ideas, di)));
        bump(lead, src, covers(ideas, d[0]));
        // The same, split by whose move the note is about (a seat-worded
        // computer only speaks for the student's move).
        bump(noteHit, `${src}@${p.own ? 'own' : 'their'}`, d.some((di) => covers(ideas, di)));
        bump(lead, `${src}@${p.own ? 'own' : 'their'}`, covers(ideas, d[0]));
      }
    }
    if (examples.length < 40 && n % 37 === 0) examples.push({ id: p.note.id, danya: danyaText, said });
    if (missKinds.size > 0) {
      const lessonIdeas = ideasBy.get('lesson') ?? [];
      for (const di of d) {
        if (missKinds.has(di.kind) && !covers(lessonIdeas, di)) misses.push({ id: p.note.id, kind: di.kind, own: p.own, san: p.san, fen: p.fenBefore, danya: danyaText, lesson: said.lesson });
      }
    }
    // DANYA_BENCH_SHOW=<n> prints the first n notes beside each composer's line.
    if (n < Number(process.env.DANYA_BENCH_SHOW ?? 0)) {
      console.log(`\n# ${p.note.id} ${p.own ? 'yours' : 'theirs'} ${p.san}\n  DANYA: ${danyaText}\n${Object.entries(COMPOSER).map(([k]) => `  ${k}: ${said[k] ?? ''}`).join('\n')}`);
    }
    // EVERY COMPOSER FACT, SCORED BY ITS OWN IDEA: how often Danya says the
    // idea a source states, when that source states it (the learned order).
    {
      const facts = moveThoughtFacts({
        fenBefore: p.fenBefore, san: p.san, moverIsStudent: p.own, prev: p.prev,
        line: lineAhead(p), theirLast: p.theirLast, phrases: null,
      });
      // DANYA_BENCH_DUMP=<file> keeps every fact the composer had on this note,
      // with the ideas its words carry, beside his ideas — the input an offline
      // replay of the composer's selection is tuned on (WO-ONE-COACH-01 Build 5).
      if (dump) {
        // The one composer's own pick on this move (the `thought` source's
        // inputs): what it kept, in spoken order, and why each other fact held.
        const pick = lessonPick(p).composed;
        dump.push(JSON.stringify({
          id: p.note.id, video: videoOf(p.note.id), own: p.own, to: p.to, san: p.san, fenBefore: p.fenBefore,
          danyaText, lesson: said.lesson, sources: said,
          composer: {
            spoken: pick.spoken,
            kept: pick.kept.map((f) => ({ source: f.source, step: f.step, idea: f.idea, weight: f.weight, text: f.text })),
            held: pick.held.map((h) => ({ source: h.fact.source, step: h.fact.step, idea: h.fact.idea, why: h.why, text: h.fact.text })),
          },
          danya: d.map((x) => ({ kind: x.kind, squares: [...x.squares] })),
          facts: facts.map((f) => ({
            source: f.source, idea: f.idea, step: f.step, weight: f.weight, squares: [...f.squares], restates: f.restates === true,
            text: f.text, alsoText: f.alsoText ?? f.text, words: words(f.text), alsoWords: words(f.alsoText ?? f.text),
            ideas: ideasOf(f.text, p.to).map((x) => ({ kind: x.kind, squares: [...x.squares] })),
            alsoIdeas: ideasOf(f.alsoText ?? f.text, p.to).map((x) => ({ kind: x.kind, squares: [...x.squares] })),
          })),
        }));
      }
      for (const f of facts) {
        const sq = new Set<string>(f.squares.length ? f.squares : [p.to]);
        const ideas = IDEA_AS_KINDS[f.idea].map((k) => ({ kind: k, squares: sq }));
        const hit = d.some((di) => covers(ideas, di));
        const key = `${f.source}|${f.idea}`;
        const t = factValues.get(key) ?? { n: 0, hits: 0, lead: 0 };
        t.n += 1;
        if (hit) t.hits += 1;
        if (d[0] && covers(ideas, d[0])) t.lead += 1;
        factValues.set(key, t);
      }
    }
    if (reachOn) {
      const r = await reachOf(p);
      // BUILT: a computer source spoke on the note, or the computer's fact
      // reached any composer (it was made to get there).
      const built = new Set<string>();
      for (const id of ids) if (isComputerSource(id) && (said[id] ?? '').trim()) built.add(SOURCE_COMPUTER[id]);
      for (const s of REACH_SURFACES) for (const c of r[s].reached) built.add(c);
      for (const c of built) tally(c).built += 1;
      for (const s of REACH_SURFACES) {
        for (const c of r[s].reached) tally(c).reached[s] += 1;
        for (const c of r[s].said) tally(c).said[s] += 1;
      }
    }
    kept.push({
      video: videoOf(p.note.id), danya: d,
      sentences: ids.flatMap((id) => sentencesOf(said[id] ?? '').map((text) => ({ source: id, text, ideas: ideasOf(text, p.to) }))),
    });
    if ((n + 1) % 500 === 0) console.log(`bench: ${n + 1}/${positions.length} notes, ${Math.round((Date.now() - started) / 1000)}s`);
  }

  // ── report ──
  const srcs = ['BUILT', 'REVIEW_POOL', ...ids];
  const kinds = ALL_KINDS.filter((k) => (byKind.get('BUILT')?.get(k)?.danya ?? 0) > 0)
    .sort((a, b) => (byKind.get('BUILT')!.get(b)!.danya) - (byKind.get('BUILT')!.get(a)!.danya));
  const steps = ['changed', 'choices', 'notYet', 'line', 'habit', 'plan', 'theory'];
  const lines: string[] = [];
  lines.push(`Danya bench — ${positions.length} notes (${positions.filter((p) => p.own).length} on the student's move), Danya ${Math.round(danyaWords / positions.length)} words a note, ${Math.round((Date.now() - started) / 1000)}s`);
  lines.push('');
  lines.push(['source', 'any idea', 'his lead idea', 'words', 'silent', 'err', ...steps].join(' | '));
  for (const s of srcs) {
    const ws = wordStats.get(s);
    lines.push([
      s + (COMPOSER[s as SourceId] ? ' *' : ''), pct(noteHit.get(s)), pct(lead.get(s)),
      ws ? String(Math.round(ws.words / Math.max(1, ws.n - ws.empty))) : '–',
      ws ? `${Math.round((100 * ws.empty) / ws.n)}%` : '–', ws ? String(ws.errors) : '–',
      ...steps.map((st) => pct(byStep.get(s)?.get(st))),
    ].join(' | '));
  }
  lines.push('');
  lines.push(['kind (Danya count)', ...srcs].join(' | '));
  for (const k of kinds) lines.push([`${k} (${byKind.get('BUILT')!.get(k)!.danya})`, ...srcs.map((s) => pct(byKind.get(s)?.get(k)))].join(' | '));
  lines.push('');
  lines.push('by seat (any idea / his lead idea): ' + srcs.map((s) => `${s} own ${pct(noteHit.get(`${s}@own`))}/${pct(lead.get(`${s}@own`))} their ${pct(noteHit.get(`${s}@their`))}/${pct(lead.get(`${s}@their`))}`).join(' · '));
  console.log(lines.join('\n'));

  // ── the composer orders (David: "different computers wired in different
  // orders") — learned on half his videos, scored on the other half ──
  const variants = composerVariants(kept, ids);
  const vLines = ['', 'composer variant (held-out half) | any idea | his lead idea | words | ' + THOUGHT_STEPS.join(' | ')];
  for (const v of variants) vLines.push([v.name, v.any, v.lead, String(v.words), ...THOUGHT_STEPS.map((st) => v.steps[st] ?? '–')].join(' | '));
  console.log(vLines.join('\n'));

  // REACH, most-built first: BUILT, then reached/said on each surface.
  if (reachOn) {
    const inInventory = inventoryKeys();
    const rLines = ['', `REACH (${positions.length} notes) | BUILT | ${REACH_SURFACES.map((s) => `${s} reached/said`).join(' | ')}   († not in the reach inventory)`];
    for (const [c, t] of [...reach.entries()].sort((a, b) => b[1].built - a[1].built || a[0].localeCompare(b[0]))) {
      rLines.push([`${c}${inInventory.has(c) ? '' : ' †'}`, String(t.built), ...REACH_SURFACES.map((s) => `${t.reached[s]}/${t.said[s]}`)].join(' | '));
    }
    console.log(rLines.join('\n'));
  }

  // The learned values, per source and idea, most-said first.
  const fv = [...factValues.entries()].sort((a, b) => b[1].n - a[1].n);
  console.log('\nfact values (source|idea: said, Danya says it too, his lead):\n' + fv.map(([k, v]) => `${k}: ${v.n}, ${Math.round((100 * v.hits) / v.n)}%, lead ${Math.round((100 * v.lead) / v.n)}%`).join('\n'));

  mkdirSync('audit-reports/danya-bench', { recursive: true });
  writeFileSync(`audit-reports/danya-bench/fact-values${process.env.DANYA_BENCH_TAG ? `-${process.env.DANYA_BENCH_TAG}` : ''}.json`, JSON.stringify(Object.fromEntries(fv), null, 1));
  const toObj = (m: Map<string, Map<string, Tally>>): Record<string, Record<string, Tally>> =>
    Object.fromEntries([...m].map(([k, v]) => [k, Object.fromEntries(v)]));
  if (dump && process.env.DANYA_BENCH_DUMP) writeFileSync(process.env.DANYA_BENCH_DUMP, dump.join('\n') + '\n');
  if (missKinds.size > 0) writeFileSync(`audit-reports/danya-bench/misses${process.env.DANYA_BENCH_TAG ? `-${process.env.DANYA_BENCH_TAG}` : ''}.json`, JSON.stringify(misses, null, 1));
  writeFileSync(`audit-reports/danya-bench/report${process.env.DANYA_BENCH_TAG ? `-${process.env.DANYA_BENCH_TAG}` : ''}.json`, JSON.stringify({
    notes: positions.length, own: positions.filter((p) => p.own).length, danyaWordsPerNote: danyaWords / positions.length,
    composers: COMPOSER, byKind: toObj(byKind), byStep: toObj(byStep),
    anyIdea: Object.fromEntries(noteHit), leadIdea: Object.fromEntries(lead), words: Object.fromEntries(wordStats), examples, variants,
    ...(reachOn ? { reach: Object.fromEntries(reach) } : {}),
  }, null, 1));
}, 6 * 3600_000);
