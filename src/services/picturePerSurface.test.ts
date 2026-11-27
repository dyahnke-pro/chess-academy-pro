import { createStoryStore, readStoryOf } from './gameStory';
import { LOCAL_THREAD } from './coachFact';
// THE PICTURE ON EVERY SURFACE (WO-PICTURE-01 P6): the verdict read after the
// tries and the plan that survives them reach each surface through the ONE
// fact set (`moveThoughtFacts` → `pictureReads`), never a surface's own call.
// Board: rooks-on-the-seventh-revisited#2 (Danya: "breaking through is a
// different matter … 36.Rxa5? Rxh5 … the first order of business is to make
// sure that the h5 pawn is safe": 36.Bf7), engine reads as in
// `pictureVerdict.test.ts` (local Stockfish, depth 16).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveThoughtFacts, pictureTriesOf, questionThought, type MoveThoughtInput } from './moveThoughtFacts';
import { learnThoughtTurn } from './learnSharedFacts';
import { boardReadFacts } from './boardReadFacts';
import { storedIntentReads } from './moveIntent';
import { NO_PREV_CAPTURE } from './captureRun';
import { writerFor, thoughtSettings } from './writerRegister';
import type { AnalysisLine } from '../types';

type Row = [number, string];
const FEN = '5r1k/R2R2p1/7p/p4prP/2B5/5K2/8/8 w - - 0 36';
const READS: Row[] = [
  [279, 'c4f7 f5f4 f7g6 g5g3 f3f2 f8g8 a7a5 g3c3 a5a2 c3c8 d7d2 c8b8'],
  [-377, 'd7g7 g5g7 a7a6 f5f4 c4e2 g7g5 a6h6 h8g7 h6a6 g5h5 a6a7 g7h8 f3g4'],
  [16, 'a7a5 g5h5 c4d3 h5g5 a5c5 h8g8 f3e2 f5f4 c5g5 f4f3 e2d1'],
  [249, 'c4e6 f5f4 e6f7 g5g3 f3f4 g3g2 f4e4 g2g1 f7g6 g1e1 e4d5 e1d1 d5c5'],
  [239, 'c4d5 a5a4 d5f7 f5f4 f7g6 g5g3 f3f2 a4a3 d7f7 f8b8 f7f4 g3c3 f2e1'],
  [0, 'f3f4 g5g4 f4f3 g4c4 d7g7 c4g4 g7h7 h8g8 h7h6 g4g7 h6g6 g7g6 h5g6'],
  [248, 'f3e3 f5f4 e3f2 f8b8 c4f7 g5g3 f7g6 b8b2 f2f1 g3f3 f1e1 f3e3 e1d1'],
  [236, 'd7f7 f8c8 c4e6 c8e8 e6d7 e8b8 f7f5 g5g1 d7b5 b8d8 b5e2 g1c1 f3f2'],
  [13, 'd7d5 g5h5 d5a5 h5g5 c4d3 h6h5 f3f4 g5g1 a5f5 f8f5 d3f5 h8g8 f4e5'],
  [-494, 'a7a8 f8a8 c4d5 a8f8 d5f7 f8f7 d7f7 g5h5 f3f4 h8h7 f7a7 h5h4 f4f5'],
  [239, 'a7b7 a5a4 c4f7 f5f4 f7g6 g5g3 f3f2 g3b3 b7a7 b3b2 f2f3 b2b3 f3g4'],
  [-485, 'd7d8 f8d8 c4f7 d8f8 f7g6 f5f4 a7a6 g5c5 a6a7 c5c3 f3f2 f8b8 f2f1'],
  [258, 'd7e7 f5f4 c4f7 g5g3 f3f2 f8b8 f7g6 g3h3 e7b7 b8d8 b7f7 f4f3 f7f3'],
  [271, 'f3f2 g5g4 c4f7 g4e4 f2f3 f8b8 a7a5 e4h4 a5f5 h4b4 f5a5 b4b5'],
  [256, 'f3e2 f5f4 c4f7 f4f3 e2f2 a5a4 d7d3 g5b5 d3f3 b5b2 f2g3 b2b5 f3a3'],
];
const fan: AnalysisLine[] = READS.map(([evaluation, moves], k) => ({ rank: k + 1, depth: 16, evaluation, mate: null, moves: moves.split(' ') }));
const afterBf7: AnalysisLine[] = [{ rank: 1, depth: 16, evaluation: 279, mate: null, moves: fan[0].moves.slice(1) }];
const reads = { before: fan, after: afterBf7, passBefore: [], passAfter: [] };

const lessonInput = (r: MoveThoughtInput['reads']): MoveThoughtInput => ({ unpricedCredit: 'refused', soundPlies: new Set<number>(),
  ...thoughtSettings(writerFor('lesson')), plainThreatsSeen: false, tense: 'now', phrases: null,
  fenBefore: FEN, san: 'Bf7', moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: [], reads: r, costCp: 0,
});
const computers = (fs: ReadonlyArray<{ computer: string }>): string[] => fs.map((f) => f.computer);

describe('the picture reaches every surface through the one fact set', { timeout: 120_000 }, () => {
  it('the one fact set (a lesson, chat\'s move answer): the verdict and the plan, as the picture', () => {
    const facts = moveThoughtFacts(lessonInput(reads));
    const v = facts.find((f) => f.computer === 'pictureVerdict');
    const p = facts.find((f) => f.computer === 'picturePlan');
    expect(v).toMatchObject({ source: 'picture', kind: 'verdict', seat: 'student' });
    expect(p).toMatchObject({ source: 'picture', kind: 'plan-now' });
    expect(p?.text).toContain('On f7 the bishop guards your h-pawn');
    // The ledger, counterplay and target ride as the picture too (Review keeps them).
    for (const f of facts.filter((x) => x.computer.startsWith('picture'))) expect(f.source).toBe('picture');
  });

  it('NEGATIVE: one read is no try against another — no verdict, no plan', () => {
    const facts = moveThoughtFacts(lessonInput({ ...reads, before: fan.slice(0, 1) }));
    expect(computers(facts)).not.toContain('pictureVerdict');
    expect(computers(facts)).not.toContain('picturePlan');
    expect(pictureTriesOf(null)).toBeNull();
  });

  it('chat: a question about the move hears the picture in the answer\'s facts', () => {
    const t = questionThought({ ...thoughtSettings(writerFor('chat')), plainThreatsSeen: false,
      fenBefore: FEN, san: 'Bf7', moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: [], reads, costCp: 0 },
    new Set(['verdict', 'story', 'move']), null, null);
    expect(t.kept.map((f) => f.computer).some((c) => c === 'pictureVerdict' || c === 'picturePlan')).toBe(true);
  });

  it('Learn: the student\'s move hands the picture to the door on the thought lane', () => {
    const fenNow = (() => { const b = new Chess(FEN); b.move('Bf7'); b.move('f4'); return b.fen(); })();
    const out = learnThoughtTurn({ soundPlies: new Set<number>(), studentMove: { fenBefore: FEN, san: 'Bf7', history: [], prev: NO_PREV_CAPTURE, theirLast: null, reads, costCp: 0 }, reply: null, fenNow, student: 'w', story: createStoryStore('t') });
    const v = out.find((f) => f.computer === 'pictureVerdict');
    expect(v?.lane).toBe('thought');
    // The plan names the student's move: the door holds it unless asked.
    expect(out.find((f) => f.computer === 'picturePlan')?.namesStudentMove).toBe(true);
  });

  it('Review: the record\'s candidate reads carry the picture into the walk\'s fact set', () => {
    const rec = { bestMove: 'c4f7', bestMoveEval: 279, evaluation: 279, pv: { afterPlayed: fan[0].moves.slice(1), afterBest: fan[0].moves.slice(1) },
      weighed: { depth: 16, reads: READS.slice(1).map(([evaluation, moves]) => ({ evaluation, mate: null, moves: moves.split(' ') })) } };
    const r = storedIntentReads(FEN, 'Bf7', rec);
    const facts = moveThoughtFacts({ ...lessonInput(r), ...thoughtSettings(writerFor('review')), tense: 'past' });
    expect(computers(facts)).toContain('pictureVerdict');
    expect(computers(facts)).toContain('picturePlan');
  });

  it('the tapped read (Play, a puzzle once solved, every Read button): the picture from the tries it read, as the board\'s own', async () => {
    const byFen = new Map<string, AnalysisLine[]>();
    for (const l of fan) {
      const b = new Chess(FEN);
      b.move({ from: l.moves[0].slice(0, 2), to: l.moves[0].slice(2, 4) });
      byFen.set(b.fen(), [{ rank: 1, depth: 16, evaluation: l.evaluation, mate: null, moves: l.moves.slice(1) }]);
    }
    const set = await boardReadFacts({ fen: FEN, studentColor: 'w', rating: 1800, before: fan.slice(0, 3), read: async (f) => byFen.get(f) ?? null,
      withhold: false, tense: 'now', history: [], theory: false, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
    const pics = set.facts.filter((f) => f.computer === 'pictureVerdict' || f.computer === 'picturePlan');
    expect(pics.map((f) => f.computer).sort()).toEqual(['picturePlan', 'pictureVerdict']);
    for (const f of pics) expect(f.from).toBe('position');
    // Once each: the read no longer calls the conclusions beside the fact set.
    expect(set.facts.filter((f) => f.computer === 'pictureVerdict')).toHaveLength(1);
  });

  it('Learn\'s read is told against the game\'s story: a verdict and a plan the game already said are not said again', async () => {
    const byFen = new Map<string, AnalysisLine[]>();
    for (const l of fan) {
      const b = new Chess(FEN);
      b.move({ from: l.moves[0].slice(0, 2), to: l.moves[0].slice(2, 4) });
      byFen.set(b.fen(), [{ rank: 1, depth: 16, evaluation: l.evaluation, mate: null, moves: l.moves.slice(1) }]);
    }
    const input = { fen: FEN, studentColor: 'w' as const, rating: 1800, before: fan.slice(0, 3), read: async (f: string) => byFen.get(f) ?? null,
      withhold: false, tense: 'now' as const, history: [], theory: false, readTempting: true, engineFutures: false, studentNeedContext: null };
    const fresh = await boardReadFacts({ ...input, story: null });
    const pics = fresh.facts.filter((f) => f.computer === 'pictureVerdict' || f.computer === 'picturePlan');
    expect(pics.map((f) => f.computer).sort()).toEqual(['picturePlan', 'pictureVerdict']);
    // An empty story changes nothing.
    const empty = await boardReadFacts({ ...input, story: readStoryOf(createStoryStore('g').current()) });
    expect(empty.facts.filter((f) => f.computer === 'pictureVerdict' || f.computer === 'picturePlan').map((f) => f.text)).toEqual(pics.map((f) => f.text));
    // The game said them: the read says neither again.
    const story = createStoryStore('g');
    story.commitFacts(3, pics.map((f) => ({ thread: LOCAL_THREAD, conclusion: f.conclusion })));
    const told = await boardReadFacts({ ...input, story: structuredClone(readStoryOf(story.current())) });
    expect(told.facts.some((f) => f.computer === 'pictureVerdict')).toBe(false);
    expect(told.facts.filter((f) => f.computer === 'picturePlan').length).toBe(pics.some((f) => f.computer === 'picturePlan' && f.conclusion) ? 0 : 1);
  });

  it('NEGATIVE: a puzzle still being solved never hears the verdict (it names the tries)', async () => {
    const set = await boardReadFacts({ fen: FEN, studentColor: 'w', rating: 1800, before: fan.slice(0, 3), read: async () => null,
      withhold: true, tense: 'now', history: [], theory: false, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
    expect(set.facts.some((f) => f.computer === 'pictureVerdict' || f.computer === 'picturePlan')).toBe(false);
  });
});
