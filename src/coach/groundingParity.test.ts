/**
 * TWO BUILDERS, ONE QUESTION (unification step, 2026-10-08). The door labels a
 * turn with `buildQuestionGrounding`; coachService answers it from its own
 * inline flag set. Where they disagree, the label and the answer differ.
 * Over the real student questions, no flag may disagree. coachService now
 * builds on the shared read, so a flag it forgets still arrives.
 */
import { expect, it, vi } from 'vitest';

const captured: Array<Record<string, unknown> | undefined> = [];
vi.mock('../services/coachApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/coachApi')>();
  return {
    ...actual,
    getCoachChatResponse: vi.fn(async (...args: unknown[]) => { captured.push(args[7] as Record<string, unknown> | undefined); return 'ok'; }),
  };
});
vi.mock('../services/enginePlanContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/enginePlanContext')>();
  return { ...actual, buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null), buildOpponentHypotheticalEval: vi.fn(async () => ({ evalCp: null, mateIn: null, settled: null })) };
});

import { coachService } from './coachService';
import { buildQuestionGrounding } from './questionIntents';
import { REAL_QUESTIONS } from './ask/realQuestions.test.fixture';

const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';

it('measures flag disagreement between the two builders', async () => {
  const diffs = new Map<string, string[]>();
  let compared = 0;
  for (const r of REAL_QUESTIONS.filter((x) => !/[฀-๿]/.test(x.q))) {
    captured.length = 0;
    try {
      await coachService.ask({ surface: 'game-chat', ask: r.q, liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6'], currentRoute: '/coach/teach' } }, { maxToolRoundTrips: 1 });
    } catch { /* measure what reached the provider */ }
    const svc = captured[0];
    if (!svc) continue;
    compared += 1;
    const lane = buildQuestionGrounding(r.q, { fen: FEN, studentColor: 'white', moveHistory: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3', 'Nf6'] }, 'game-chat') as unknown as Record<string, unknown>;
    const keys = new Set([...Object.keys(svc), ...Object.keys(lane)].filter((k) => /Question$/.test(k)));
    for (const k of keys) {
      const a = !!svc[k]; const b = !!lane[k];
      if (a !== b) {
        const list = diffs.get(k) ?? [];
        list.push(`${a ? 'svc' : 'lane'} only: ${r.q.slice(0, 70)}`);
        diffs.set(k, list);
      }
    }
  }
  const rows = [...diffs.entries()].sort((x, y) => y[1].length - x[1].length);
  console.log(`\nPARITY over ${compared} questions — ${rows.length} flags disagree\n` + rows.map(([k, v]) => `\n${k} (${v.length})\n  ${v.slice(0, 6).join('\n  ')}`).join(''));
  expect(compared).toBeGreaterThan(200);
  // The one known difference is the INPUT, not the logic: coachService reads
  // a two-question turn by its last sentence ("Is that sound?"), and in
  // production hands the shared builder that same focused text.
  const INPUT_SHAPE_ONLY = new Set(['Can I sac on h7? Is that sound?']);
  const real = rows
    .map(([k, v]) => [k, v.filter((line) => ![...INPUT_SHAPE_ONLY].some((q) => line.endsWith(q)))] as const)
    .filter(([, v]) => v.length > 0);
  expect(real, 'the label and the answer read this question differently').toEqual([]);
}, 600_000);

it('the dead lanes are alive: misconceptions reach the answer', async () => {
  captured.length = 0;
  await coachService.ask({ surface: 'game-chat', ask: 'What thinking errors do I keep making?', liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: [], currentRoute: '/coach/teach' } }, { maxToolRoundTrips: 1 }).catch(() => undefined);
  expect(captured[0]?.misconceptionsQuestion).toBe(true);
}, 60_000);
