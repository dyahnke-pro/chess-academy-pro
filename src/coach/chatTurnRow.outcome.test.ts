/**
 * ONE ROW PER TURN SAYS WHAT WAS ANSWERED (WO-CHAT-01 P0, 2026-10-09).
 * Answers the door computed itself (a board answer, a premise refuted)
 * returned BEFORE `coachService` logged `coach_answer`, so PostHog held the
 * reading of those turns and never the answer. The chat-turn row now carries
 * the answer, its outcome and both languages — and flags leaked markup.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chess } from 'chess.js';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { dispatchCoachTurn, setChatTurnReaderForTests } from './dispatchCoachTurn';
import { setBoardEngineForTests } from './boardTurnAnswer';
import { onChatTurn, resetChatTurnListeners, type ChatTurnRow } from './chatTurnEvents';

const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'];
const c = new Chess(); for (const m of LINE) c.move(m);
const FEN = c.fen();
let rows: ChatTurnRow[] = [];

beforeEach(() => {
  rows = [];
  resetChatTurnListeners();
  onChatTurn((r) => rows.push(r));
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  setBoardEngineForTests({
    analysis: async () => ({ topLines: [
      { rank: 1, evaluation: 30, mate: null, moves: ['f1b5', 'f8b4'] },
      { rank: 2, evaluation: 25, mate: null, moves: ['d2d4', 'e5d4'] },
    ], evaluation: 0, isMate: false, mateIn: null, depth: 14, seldepth: 14 }),
    candidate: async (_f, san) => ({ evalCp: san === 'Bb5' ? 30 : -120, mateIn: null, lineUci: ['f8b4'] }),
  });
});
afterEach(() => { setBoardEngineForTests(null); setChatTurnReaderForTests(undefined); resetChatTurnListeners(); vi.restoreAllMocks(); });

const ask = (q: string) => dispatchCoachTurn({
  surface: 'game-chat', ask: q, origin: 'typed',
  liveState: { surface: 'game-chat', fen: FEN, whoseTurn: 'white', studentColor: 'white', moveHistory: LINE, currentRoute: '/coach/teach' },
} as never, { maxToolRoundTrips: 1 });

const settled = async (): Promise<ChatTurnRow> => {
  for (let i = 0; i < 50 && rows.length === 0; i += 1) await new Promise((r) => setTimeout(r, 10));
  expect(rows).toHaveLength(1);
  return rows[0];
};

describe('the chat-turn row carries the answer', () => {
  it('a board answer the door computed is in the row, with its outcome and language', async () => {
    const a = await ask('Is Ng5 good?');
    const row = await settled();
    expect(row.servedIntent).toMatch(/^board:/);
    expect(row.outcome).toBe('answered');
    expect(row.answerPreview).toBe(a.text.slice(0, 160));
    expect(row.askLang).toBe('en');
    expect(row.answerLang).toBe('en');
    expect(row.leakedMarkup).toBe(false);
    expect(row.totalMs).not.toBeNull();
  }, 60_000);
});
